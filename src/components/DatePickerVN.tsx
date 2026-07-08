import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

// "yyyy-mm-dd" -> "dd/mm/yyyy"
const keyToText = (key: string): string => {
  if (!key) return "";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
};

const partsToKey = (d: number, m: number, y: number): string =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const dateToKey = (date: Date): string =>
  partsToKey(date.getDate(), date.getMonth() + 1, date.getFullYear());

interface DatePickerVNProps {
  value: string; // "yyyy-mm-dd" | ""
  onChange: (value: string) => void; // "yyyy-mm-dd" | ""
  fallbackYear?: number;
  className?: string; // container
  inputClassName?: string; // ô nhập text
  placeholder?: string;
}

const DatePickerVN = ({
  value,
  onChange,
  fallbackYear,
  className,
  inputClassName,
  placeholder,
}: DatePickerVNProps) => {
  const year = fallbackYear ?? new Date().getFullYear();

  const [text, setText] = useState(keyToText(value));
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const prevDigits = useRef("");
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false); // đang gõ qua bộ gõ tiếng Việt (Unikey/EVKey)?
  const caretRef = useRef<number | null>(null); // vị trí con trỏ cần khôi phục sau khi định dạng

  const initial = value ? value.split("-").map((s) => parseInt(s, 10)) : null;
  const [viewYear, setViewYear] = useState<number>(initial ? initial[0] : year);
  const [viewMonth, setViewMonth] = useState<number>(
    initial ? initial[1] - 1 : new Date().getMonth(),
  );

  // Đồng bộ khi value bên ngoài đổi
  useEffect(() => {
    setText(keyToText(value));
    if (value) {
      const [y, m] = value.split("-").map((s) => parseInt(s, 10));
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Khôi phục vị trí con trỏ sau khi định dạng (chỉ khi vừa gõ trực tiếp — caretRef
  // được set trong formatFromInput; đồng bộ value/pick lịch không set nên không nhảy).
  useLayoutEffect(() => {
    if (caretRef.current != null && inputRef.current) {
      const pos = caretRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      caretRef.current = null;
    }
  }, [text]);

  // Tính vị trí popover (portal, tránh bị cắt bởi khung cuộn)
  useLayoutEffect(() => {
    if (!open || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const POP_HEIGHT = 340;
    const below = window.innerHeight - rect.bottom;
    const top =
      below < POP_HEIGHT && rect.top > POP_HEIGHT
        ? rect.top - POP_HEIGHT - 4
        : rect.bottom + 4;
    setCoords({ top, left: rect.left });
  }, [open]);

  // Đóng khi click ra ngoài / cuộn / nhấn Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Định dạng chuỗi nhập: tự chèn "/" giữa ngày/tháng/năm, GIỮ vị trí con trỏ.
  // `caret` = vị trí con trỏ hiện tại trong `raw` (để tính lại vị trí sau khi chèn "/").
  const formatFromInput = (raw: string, caret: number) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const deleting = digits.length < prevDigits.current.length;
    prevDigits.current = digits;

    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yy = digits.slice(4, 8);

    let out = dd;
    if (dd.length === 2 && (mm.length > 0 || !deleting)) out += "/";
    out += mm;
    if (mm.length === 2 && (yy.length > 0 || !deleting)) out += "/";
    out += yy;

    // Con trỏ mới = ngay sau `digitsBeforeCaret` chữ số trong chuỗi đã định dạng.
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
    let newCaret = out.length;
    let seen = 0;
    for (let i = 0; i < out.length; i++) {
      if (seen === digitsBeforeCaret) {
        newCaret = i;
        break;
      }
      if (out[i] >= "0" && out[i] <= "9") seen++;
    }
    // Nếu con trỏ rơi ngay trước dấu "/" (vừa gõ đủ ngày/tháng) → nhảy qua dấu "/"
    if (out[newCaret] === "/") newCaret += 1;
    caretRef.current = newCaret;

    setText(out);

    if (digits.length === 0) {
      onChange("");
    } else if (digits.length === 8) {
      const d = parseInt(dd, 10);
      const m = parseInt(mm, 10);
      const y = parseInt(yy, 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000) {
        onChange(partsToKey(d, m, y));
      }
    }
  };

  // onChange của ô input. Khi ĐANG gõ qua bộ gõ tiếng Việt (composition), KHÔNG
  // định dạng lại (không chèn "/", không đụng con trỏ) — nếu ghi đè value giữa lúc
  // composition sẽ làm lệch bộ đệm Unikey/EVKey → gõ nhảy loạn. Chỉ định dạng khi
  // gõ trực tiếp, hoặc khi composition kết thúc (onCompositionEnd).
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (composingRef.current || (e.nativeEvent as InputEvent).isComposing) {
      setText(e.target.value); // để nguyên chuỗi thô, không phá bộ gõ
      return;
    }
    formatFromInput(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  const commitOnBlur = () => {
    const digits = text.replace(/\D/g, "").slice(0, 8);
    if (digits.length === 0) {
      onChange("");
      return;
    }
    // Cho phép dd/mm (dùng năm mặc định) hoặc dd/mm/yyyy
    if (digits.length === 4 || digits.length === 8) {
      const d = parseInt(digits.slice(0, 2), 10);
      const m = parseInt(digits.slice(2, 4), 10);
      const y = digits.length === 8 ? parseInt(digits.slice(4, 8), 10) : year;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000) {
        onChange(partsToKey(d, m, y));
        return;
      }
    }
    setText(keyToText(value)); // không hợp lệ → khôi phục
  };

  const pickDay = (d: number) => {
    onChange(partsToKey(d, viewMonth + 1, viewYear));
    setOpen(false);
  };

  const prevMonth = () =>
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });

  const nextMonth = () =>
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leading = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Thứ 2 đầu tuần
  const cells: (number | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayKey = dateToKey(new Date());

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <div
        className={`flex items-center border rounded-xl bg-white shadow-sm transition-all focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-400 ${
          value ? "border-blue-300" : "border-gray-300"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="pl-3 pr-2 py-2.5 text-gray-400 hover:text-blue-600 transition-colors"
          aria-label="Mở lịch chọn ngày"
          title="Mở lịch"
        >
          <Calendar size={18} />
        </button>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={handleInputChange}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            // Bộ gõ đã hoàn tất → giờ định dạng lại an toàn (không phá bộ đệm nữa)
            composingRef.current = false;
            const el = e.currentTarget;
            formatFromInput(el.value, el.selectionStart ?? el.value.length);
          }}
          onBlur={commitOnBlur}
          // Bấm vào ô đang có ngày cũ → bôi chọn hết để gõ mới thay thế sạch
          onFocus={(e) => e.currentTarget.select()}
          // KHÔNG mở lịch khi focus: tránh popover (portal, position:fixed) đè lên ô
          // nhập trên máy có tỷ lệ hiển thị/độ phân giải khác → bấm vào ô lại trúng
          // lịch, không gõ được. Muốn chọn lịch thì bấm nút biểu tượng lịch bên trái.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
              setOpen(false);
            }
          }}
          placeholder={placeholder ?? "dd/mm/yyyy"}
          className={
            inputClassName ??
            "w-36 pr-3 py-2.5 focus:outline-none text-gray-900 font-semibold bg-transparent placeholder-gray-400"
          }
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 9999 }}
            className="w-72 bg-white border border-gray-200 rounded-2xl shadow-xl p-3"
          >
            {/* Điều hướng tháng */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Tháng trước"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-gray-800 select-none">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                aria-label="Tháng sau"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Thứ trong tuần */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-center text-xs font-bold text-gray-400 py-1 select-none"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Lưới ngày */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={`e${i}`} />;
                const key = partsToKey(d, viewMonth + 1, viewYear);
                const isSelected = key === value;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickDay(d)}
                    className={`h-9 rounded-lg text-sm font-semibold transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isToday
                          ? "bg-blue-50 text-blue-600"
                          : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Chân: Hôm nay / Xóa */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  onChange(dateToKey(new Date()));
                  setOpen(false);
                }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-sm font-semibold text-gray-500 hover:text-red-600"
              >
                Xóa
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default DatePickerVN;
