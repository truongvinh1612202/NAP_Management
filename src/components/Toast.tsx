import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let counter = 0;
let toasts: ToastItem[] = [];
let listeners: Array<(items: ToastItem[]) => void> = [];

const emit = () => {
  listeners.forEach((l) => l(toasts));
};

const remove = (id: number) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

const push = (type: ToastType, message: string) => {
  const id = ++counter;
  toasts = [...toasts, { id, type, message }];
  emit();
  // Lỗi giữ lâu hơn để người dùng kịp đọc
  window.setTimeout(() => remove(id), type === "error" ? 5000 : 2800);
};

// Gọi được ở bất kỳ đâu: toast.success(...) / toast.error(...)
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

// ─── Một dòng toast (có hiệu ứng trượt vào) ─────────────────────────────────────
const ToastRow = ({ item }: { item: ToastItem }) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isSuccess = item.type === "success";

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md px-4 py-3 rounded-xl shadow-lg border bg-white transition-all duration-200 ${
        isSuccess ? "border-green-200" : "border-red-200"
      } ${shown ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}
      role="status"
    >
      {isSuccess ? (
        <CheckCircle2 className="text-green-500 shrink-0" size={20} />
      ) : (
        <XCircle className="text-red-500 shrink-0" size={20} />
      )}
      <span
        className={`text-sm font-semibold flex-1 ${
          isSuccess ? "text-green-800" : "text-red-800"
        }`}
      >
        {item.message}
      </span>
      <button
        onClick={() => remove(item.id)}
        className="text-gray-400 hover:text-gray-600 shrink-0 focus:outline-none"
        aria-label="Đóng thông báo"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// ─── Mount 1 lần ở App ──────────────────────────────────────────────────────────
export const Toaster = () => {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {items.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
    </div>
  );
};
