import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

// Hộp XÁC NHẬN IN-APP (React) — thay cho window.confirm() native của Electron.
// Lý do: hộp thoại native của Electron sau khi đóng hay làm renderer MẤT FOCUS bàn
// phím → gõ vào các ô (ngày, tên công ty, lọc…) không được nữa cho tới khi thoát app.
// Hộp này render bằng React nên không đụng tới focus native, gõ liền mạch.

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean; // mặc định true (thao tác xóa) → nút đỏ
}

interface ConfirmState extends ConfirmOptions {
  id: number;
  message: string;
  resolve: (ok: boolean) => void;
}

let current: ConfirmState | null = null;
let listeners: Array<(c: ConfirmState | null) => void> = [];
let counter = 0;

const emit = () => listeners.forEach((l) => l(current));

// Gọi được ở bất kỳ đâu: const ok = await confirmDialog("Xóa?", { title: "..." })
export const confirmDialog = (
  message: string,
  opts: ConfirmOptions = {},
): Promise<boolean> =>
  new Promise((resolve) => {
    current = { id: ++counter, message, resolve, ...opts };
    emit();
  });

const close = (ok: boolean) => {
  if (!current) return;
  current.resolve(ok);
  current = null;
  emit();
};

// Mount 1 lần ở App (cạnh <Toaster />).
export const ConfirmHost = () => {
  const [state, setState] = useState<ConfirmState | null>(current);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  if (!state) return null;

  const isDanger = state.danger !== false;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
      onClick={() => close(false)}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDanger ? "bg-red-100" : "bg-blue-100"
            }`}
          >
            <AlertTriangle
              size={20}
              className={isDanger ? "text-red-600" : "text-blue-600"}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900">
              {state.title ?? "Xác nhận"}
            </h3>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
              {state.message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {/* autoFocus vào nút HỦY (an toàn): Enter sẽ hủy, không lỡ tay xóa */}
          <button
            type="button"
            autoFocus
            onClick={() => close(false)}
            className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            {state.cancelText ?? "Hủy"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg focus:outline-none ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {state.confirmText ?? "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
};
