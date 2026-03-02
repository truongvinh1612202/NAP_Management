import { useRef, useEffect } from "react";
import { formatCurrencyVND } from "@/utils/helper";

interface DetailModalProps {
  data: Record<string, any> | null | undefined;
  title?: string;
  onClose: () => void;
  isLoading?: boolean;
}

// Map field keys to Vietnamese labels
const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  // Company
  companyName: "Tên Công Ty",
  taxId: "Mã Số Thuế",
  serviceFee: "Phí Dịch Vụ",
  // Employee
  fullName: "Họ Tên",
  // CompanyEmployee
  role: "Vai Trò",
  companyId: "ID Công Ty",
  employeeId: "ID Nhân Viên",
  // Payment
  month: "Tháng",
  year: "Năm",
  note: "Ghi Chú",
};

const ROLE_LABELS: Record<string, string> = {
  LAP_SO: "Lập Sổ",
  NHAP_SO_LIEU: "Nhập Số Liệu",
  DICH_VU_KH: "Dịch Vụ Khách Hàng",
};

const currencyFields = ["serviceFee"];

const DetailModal: React.FC<DetailModalProps> = ({
  data,
  title = "Chi tiết",
  onClose,
  isLoading = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstFocusableRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const renderValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined) return "-";
    if (currencyFields.includes(key)) return formatCurrencyVND(value);
    if (key === "role") return ROLE_LABELS[value] ?? value;
    return String(value);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 dark:bg-black dark:bg-opacity-60 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      ref={modalRef}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 min-w-[350px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900">{title}</h3>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
            <div className="text-gray-600 text-lg mb-2">Đang tải dữ liệu...</div>
            <p className="text-gray-500">Vui lòng chờ trong giây lát</p>
          </div>
        ) : data === undefined || data === null ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-lg mb-2">⚠️ Không tìm thấy dữ liệu</div>
            <p className="text-gray-600 mb-4">
              ID tham chiếu không hợp lệ hoặc bản ghi không tồn tại trong hệ thống.
            </p>
          </div>
        ) : Object.keys(data).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="text-gray-800">
                <span className="font-semibold">{FIELD_LABELS[key] ?? key}:</span>{" "}
                {renderValue(key, value)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-red-500 text-lg mb-2">⚠️ Không tìm thấy dữ liệu</div>
            <p className="text-gray-600">Bản ghi tồn tại nhưng không có thông tin chi tiết.</p>
          </div>
        )}

        <button
          className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
          onClick={onClose}
          tabIndex={0}
          aria-label="Đóng chi tiết"
          ref={firstFocusableRef}
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default DetailModal;
