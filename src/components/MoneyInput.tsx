import { useRef, useEffect } from "react";
import type { FocusEvent, FormEvent, InputHTMLAttributes } from "react";
import { groupDigits, onlyDigits } from "@/utils/helper";

// Ô nhập TIỀN: hiển thị có dấu chấm ngăn cách ("4.000.000") cho dễ đọc/nhập, còn giá
// trị trả về (onChange) là CHUỖI CHỮ SỐ THUẦN ("4000000") để parse thẳng.
//
// Cực kỳ quan trọng: ô để UNCONTROLLED (KHÔNG bind prop `value`). React sẽ KHÔNG ghi
// đè thuộc tính .value của ô → không đua với con trỏ và KHÔNG phá bộ gõ tiếng Việt
// (Unikey/EVKey). Việc chèn dấu chấm + đặt lại con trỏ làm ĐỒNG BỘ ngay trong trình
// xử lý sự kiện gõ (không dùng layout-effect) nên số không bao giờ bị chèn sai vị trí.
type MoneyInputProps = {
  value: string; // chuỗi chữ số thuần (có thể rỗng)
  onChange: (rawDigits: string) => void;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode" | "defaultValue"
>;

const MoneyInput = ({ value, onChange, onBlur, ...rest }: MoneyInputProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  // Đồng bộ hiển thị khi `value` từ ngoài đổi (vd: sau khi lưu/refetch) — nhưng chỉ khi
  // ô KHÔNG đang được gõ, để không cướp con trỏ giữa chừng.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    el.value = groupDigits(value);
  }, [value]);

  // Chèn dấu chấm + đặt lại con trỏ (đếm chữ số đứng trước con trỏ để nhảy qua dấu ".").
  const reformat = (el: HTMLInputElement): string => {
    const caret = el.selectionStart ?? el.value.length;
    const digitsBeforeCaret = onlyDigits(el.value.slice(0, caret)).length;
    const digits = onlyDigits(el.value);
    const formatted = groupDigits(digits);
    el.value = formatted;
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBeforeCaret) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* một số trình duyệt chặn setSelectionRange khi mất focus — bỏ qua */
    }
    return digits;
  };

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    // Đang ghép chữ tiếng Việt → KHÔNG đụng .value (không format, không dời con trỏ);
    // chỉ cập nhật state để lọc/parse. Sẽ format lại ở compositionEnd/blur.
    if (composingRef.current) {
      onChange(onlyDigits(el.value));
      return;
    }
    onChange(reformat(el));
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      defaultValue={groupDigits(value)}
      onInput={handleInput}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        onChange(reformat(e.currentTarget));
      }}
      onBlur={(e: FocusEvent<HTMLInputElement>) => {
        e.currentTarget.value = groupDigits(e.currentTarget.value);
        onBlur?.(e);
      }}
      {...rest}
    />
  );
};

export default MoneyInput;
