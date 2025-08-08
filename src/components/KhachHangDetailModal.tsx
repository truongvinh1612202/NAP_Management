import React from 'react';
import type { DanhMucKhachHang } from '../../generated/client';

interface KhachHangDetailModalProps {
  khachHang: DanhMucKhachHang | null;
  onClose: () => void;
}

const KhachHangDetailModal: React.FC<KhachHangDetailModalProps> = ({ khachHang, onClose }) => {
  if (!khachHang) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px] max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Thông tin khách hàng</h3>
        <div className="space-y-2">
          <div><span className="font-semibold">ID:</span> {khachHang.id}</div>
          <div><span className="font-semibold">Tên khách hàng:</span> {khachHang.tenKhachHang}</div>
          <div><span className="font-semibold">Mã số thuế:</span> {khachHang.maSoThue}</div>
          <div><span className="font-semibold">Địa chỉ:</span> {khachHang.diaChi}</div>
          <div><span className="font-semibold">Phí dịch vụ:</span> {khachHang.phiDichVu}</div>
          <div><span className="font-semibold">Kỳ khai thuế:</span> {khachHang.kyKhaiThue}</div>
          <div><span className="font-semibold">Kỳ nhận CT:</span> {khachHang.kyNhanCT}</div>
          <div><span className="font-semibold">Điện thoại:</span> {khachHang.dienThoai}</div>
          <div><span className="font-semibold">Email:</span> {khachHang.email}</div>
          <div><span className="font-semibold">Ngành kinh doanh:</span> {khachHang.nganhKD}</div>
          <div><span className="font-semibold">CQT quản lý:</span> {khachHang.cqtQuanLy}</div>
          <div><span className="font-semibold">Trạng thái:</span> {khachHang.trangThai}</div>
          <div><span className="font-semibold">Giám đốc:</span> {khachHang.giamDoc}</div>
          <div><span className="font-semibold">Nhân viên DVKH:</span> {khachHang.nhanVienDVKH}</div>
          <div><span className="font-semibold">Nhân viên lập sổ:</span> {khachHang.nhanVienLapSo}</div>
          <div><span className="font-semibold">Trạng thái hoạt động:</span> {khachHang.trangThaiHoatDong}</div>
          <div><span className="font-semibold">Nhân viên DVKH ID:</span> {khachHang.nhanVienDVKHId}</div>
          <div><span className="font-semibold">Nhân viên lập sổ ID:</span> {khachHang.nhanVienLapSoId}</div>
          <div><span className="font-semibold">Nhân viên NSL ID:</span> {khachHang.nhanVienNSLId}</div>
          <div><span className="font-semibold">Nhân viên NSL:</span> {khachHang.nhanVienNSL}</div>
          {/* You can add more related data here if needed, e.g. phieuThu count */}
        </div>
        <button
          className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={onClose}
          tabIndex={0}
          aria-label="Đóng chi tiết khách hàng"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default KhachHangDetailModal;