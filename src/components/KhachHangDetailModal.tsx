import React, { useRef, useEffect } from 'react';
import { formatCurrencyVND } from '@/utils/helper';

interface DetailModalProps {
  data: Record<string, any> | null;
  title?: string;
  onClose: () => void;
}

// Map field keys to Vietnamese labels
const FIELD_LABELS: Record<string, string> = {
  tenKhachHang: 'Tên Khách Hàng',
  maSoThue: 'Mã Số Thuế',
  diaChi: 'Địa chỉ',
  phiDichVu: 'Phí Dịch Vụ',
  kyKhaiThue: 'Kỳ Khai Thuế',
  kyNhanCT: 'Kỳ Nhận CT',
  dienThoai: 'Điện thoại',
  email: 'Email',
  nganhKD: 'Ngành Kinh Doanh',
  cqtQuanLy: 'CQT Quản Lý',
  trangThai: 'Trạng Thái',
  giamDoc: 'Giám Đốc',
  nhanVienDVKH: 'Nhân Viên DVKH',
  nhanVienLapSo: 'Nhân Viên Lập Sổ',
  trangThaiHoatDong: 'Trạng Thái Hoạt Động',
  nhanVienDVKHId: 'ID Nhân Viên DVKH',
  nhanVienLapSoId: 'ID Nhân Viên Lập Sổ',
  nhanVienNSLId: 'ID Nhân Viên NSL',
  nhanVienNSL: 'Nhân Viên NSL',
  id: 'ID',
  // Add more fields as needed
};

const currencyFields = ['phiDichVu'];

const DetailModal: React.FC<DetailModalProps> = ({ data, title = "Chi tiết", onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the first button when modal opens
    firstFocusableRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!data) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      ref={modalRef}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value], idx, arr) => (
            <div key={key}>
              <span className="font-semibold">
                {FIELD_LABELS[key] || key}:
              </span> {currencyFields.includes(key) ? formatCurrencyVND(value) : String(value)}
            </div>
          ))}
        </div>
        <button
          className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
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