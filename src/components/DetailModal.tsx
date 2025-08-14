import React, { useRef, useEffect } from 'react';

import { formatCurrencyVND } from '@/utils/helper';

interface DetailModalProps {
  data: Record<string, any> | null | undefined;
  title?: string;
  onClose: () => void;
  isLoading?: boolean;
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
  // nhanvien
  maSoNhanVien: 'Mã Số Nhân Viên',
  tenNhanVien: 'Tên Nhân Viên',
  namSinh: 'Năm Sinh',
  thuongTru: 'Thường Trú',
  userDangNhap: 'User Đăng Nhập',
  // congviec
  ten: 'Tên',
  moTa: 'Mô Tả',
};

const StatusBadge: React.FC<{ value: string }> = ({ value }) => {
  if (!value) return <>-</>;
  let className = '';
  switch (value) {
    case 'Đang hoạt động':
    case 'Đang cung cấp dịch vụ':
      className = 'bg-green-100 text-green-800';
      break;
    case 'Ngưng cung cấp dịch vụ':
    case 'Pending':
      className = 'bg-yellow-100 text-yellow-800';
      break;
    case 'Không hoạt động':
    case 'Inactive':
      className = 'bg-red-100 text-red-800';
      break;
    default:
      className = 'bg-gray-100 text-gray-800';
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>{value}</span>
  );
};

const currencyFields = ['phiDichVu'];
const statusFields = ['trangThai', 'trangThaiHoatDong'];

const DetailModal: React.FC<DetailModalProps> = ({ data, title = "Chi tiết", onClose, isLoading = false }) => {
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


  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // The modal should show when there's a selection (indicated by the parent component rendering it)
  // We don't need to check data here since the parent controls when to render this component
  console.log("DetailModal rendered - data:", data, "isLoading:", isLoading);

  // Don't render anything if explicitly told not to (this shouldn't happen with current setup)
  // if (data === null && !isLoading) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 dark:bg-black dark:bg-opacity-60 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      ref={modalRef}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4 text-gray-900">{title}</h3>
        
        {isLoading ? (
          // Show loading state
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <div className="text-gray-600 text-lg mb-2">
              Đang tải dữ liệu...
            </div>
            <p className="text-gray-500">
              Vui lòng chờ trong giây lát
            </p>
          </div>
        ) : data === undefined || data === null ? (
          // Show error message when data is undefined (query failed) or null (no record found)
          <div className="text-center py-8">
            <div className="text-red-500 text-lg mb-2">
              ⚠️ Không tìm thấy dữ liệu
            </div>
            <p className="text-gray-600 mb-4">
              ID tham chiếu không hợp lệ hoặc bản ghi không tồn tại trong hệ thống.
            </p>
          </div>
        ) : data && Object.keys(data).length > 0 ? (
          // Show data when available and not empty
          <div className="space-y-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="text-gray-800">
                <span className="font-semibold">{FIELD_LABELS[key] || key}:</span>{' '}
                {statusFields.includes(key)
                  ? <StatusBadge value={value} />
                  : currencyFields.includes(key)
                    ? formatCurrencyVND(value)
                    : String(value)
                }
              </div>
            ))}
          </div>
        ) : (
          // Fallback for empty data object
          <div className="text-center py-8">
            <div className="text-red-500 text-lg mb-2">
              ⚠️ Không tìm thấy dữ liệu
            </div>
            <p className="text-gray-600">
              Bản ghi tồn tại nhưng không có thông tin chi tiết.
            </p>
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