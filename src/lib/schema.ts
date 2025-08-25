/**
 * TypeScript types generated from Prisma schema for NAP Management
 * Vietnamese business management application types
 */

// Base types for common fields
export type ID = number;
export type DateOnly = Date;
export type Currency = number;

// Chi Phí Công Việc (Job Costs)
export interface ChiPhiCongViec {
  id: ID;
  tenKhachHang?: string;
  congViecId?: ID;
  tenCongViec?: string;
  chiPhi?: Currency;
  moTa?: string;
  khId?: string;
}

// Danh Mục Công Việc (Job Directory)
export interface DanhMucCongViec {
  id: ID;
  ten: string;
  moTa?: string;
}

// Danh Mục Khách Hàng (Customer Directory) - Main business entity
export interface DanhMucKhachHang {
  id: ID;
  tenKhachHang: string;
  maSoThue: string;
  diaChi?: string;
  phiDichVu?: Currency;
  kyKhaiThue?: string;
  kyNhanCT?: string;
  dienThoai?: string;
  email?: string;
  nganhKD?: string;
  cqtQuanLy?: string;
  trangThai?: string;
  giamDoc?: string;
  nhanVienDVKH?: string;
  nhanVienLapSo?: string;
  trangThaiHoatDong?: string;
  nhanVienDVKHId?: ID;
  nhanVienLapSoId?: ID;
  nhanVienNSLId?: ID;
  nhanVienNSL?: string;
  // Relations
  phieuThu?: PhieuThu[];
}

// Danh Mục Nhân Viên (Employee Directory)
export interface DanhMucNhanVien {
  id: ID;
  maSoNhanVien: string;
  tenNhanVien?: string;
  namSinh?: DateOnly;
  dienThoai?: string;
  thuongTru?: string;
  userDangNhap?: string;
  // Relations
  phieuThu?: PhieuThu[];
}

// Dịch Vụ Khách Hàng (Customer Services)
export interface DichVuKhachHang {
  id: ID;
  nhanVienId: ID;
  khachHangId: ID;
  ngayBanGiao?: DateOnly;
}

// Danh Sách Quản Lý Chi Năm (Annual Expense Management)
export interface DsQlcNam {
  id: ID;
  nam: number;
  stt: number;
  nhanVienId: ID;
  tenNhanVien?: string;
}

// Danh Sách Quản Lý Thu Năm (Annual Revenue Management)
export interface DsQltNam {
  id: ID;
  nam: number;
  stt: number;
  khachHangId: ID;
  tenKhachHang: string;
  phiDV?: Currency;
  ghiChu?: string;
  dauKy?: Currency;
  khaiThue?: string;
  nhanHS?: string;
  nhanVienDVKHId?: ID;
  nhanVienNSLId?: ID;
  nhanVienLSId?: ID;
  phiQLKH?: Currency;
  phiNSL?: Currency;
  phiLSo?: Currency;
  ngungDV?: number;
}

// Kỳ Dữ Liệu (Data Period)
export interface KyDuLieu {
  id: ID;
  noiDung: string;
  tuNgay?: DateOnly;
  denNgay?: DateOnly;
  tonQuy?: Currency;
  lockdata?: number;
  // Relations
  phieuThu?: PhieuThu[];
}

// Nghiệm Thu Công Việc (Job Acceptance)
export interface NghiemThuCongViec {
  id: ID;
  noiDung?: string;
  khachHangId?: ID;
  nhanVienId?: ID;
  congViecId?: ID;
  khachHang?: string;
  nhanVien?: string;
  congViec?: string;
  ngay?: DateOnly;
  soTien?: Currency;
  kyDuLieu?: string;
}

// Nội Dung Chi (Expense Categories)
export interface NoiDungChi {
  id: ID;
  noiDung: string;
}

// Nội Dung Thu (Revenue Categories)
export interface NoiDungThu {
  id: ID;
  noiDung: string;
}

// Phải Thu (Receivables)
export interface PhaiThu {
  id: ID;
  kyKeToanId: ID;
  khachHangId: ID;
  nhanVienId: ID;
  soTien: Currency;
  noiDung?: string;
  tenNhanVien?: string;
  tenKhachHang?: string;
  ngayCT?: DateOnly;
  ghiChu?: string;
  nguoiLap?: string;
  maSoThue?: string;
}

// Phiếu Chi (Payment Voucher)
export interface PhieuChi {
  id: ID;
  kyDuLieuId?: ID;
  userId?: ID;
  nhanVienId: ID;
  noiDung?: string;
  nhomChi?: string;
  ngayChi?: DateOnly;
  soCT?: string;
  soTien?: Currency;
  thuQuy?: string;
  tenKhachHang?: string;
  tenNhanVien?: string;
  quyenSo?: number;
  thuQuyId?: ID;
}

// Phiếu Chi 1 (Alternative Payment Voucher)
export interface PhieuChi1 {
  id: ID;
  kyDuLieuId?: ID;
  userId?: ID;
  nhanVienId: ID;
  noiDung?: string;
  nhomChi?: string;
  ngayChi?: DateOnly;
  soCT?: string;
  soTien?: Currency;
  thuQuy?: string;
  tenKhachHang?: string;
  tenNhanVien?: string;
  quyenSo?: number;
  thuQuyId?: ID;
}

// Phiếu Thu (Receipt Voucher) - Key financial document
export interface PhieuThu {
  id: ID;
  kyDuLieuId: ID;
  khachHangId: ID;
  nhanVienId: ID;
  noiDung?: string;
  nhomDoanhThu?: string;
  ngayThu?: DateOnly;
  soCT?: string;
  soTien?: Currency;
  thuQuy?: string;
  tenKhachHang?: string;
  tenNhanVien?: string;
  quyenSo?: number;
  thuQuyId?: ID;
  // Relations
  danhMucKhachHang: DanhMucKhachHang;
  danhMucNhanVien: DanhMucNhanVien;
  kyDuLieu: KyDuLieu;
}

// Quản Lý Phí Dịch Vụ (Service Fee Management)
export interface QuanLyPhiDichVu {
  id: ID;
  khachHangId: ID;
  phiDichVu?: Currency;
  ngayHieuLuc?: DateOnly;
  ghiChu?: string;
}

// System Diagrams (Internal SQL Server table)
export interface SysDiagrams {
  name: string;
  principalId: number;
  diagramId: ID;
  version?: number;
  definition?: Buffer;
}

// Utility types for form inputs and API responses
export type CreateDanhMucKhachHang = Omit<DanhMucKhachHang, "id" | "phieuThu">;
export type UpdateDanhMucKhachHang = Partial<CreateDanhMucKhachHang>;

export type CreateDanhMucNhanVien = Omit<DanhMucNhanVien, "id" | "phieuThu">;
export type UpdateDanhMucNhanVien = Partial<CreateDanhMucNhanVien>;

export type CreatePhieuThu = Omit<
  PhieuThu,
  "id" | "danhMucKhachHang" | "danhMucNhanVien" | "kyDuLieu"
>;
export type UpdatePhieuThu = Partial<CreatePhieuThu>;

// Enum-like types for common status fields
export type TrangThaiKhachHang = "HOAT_DONG" | "TAM_DUNG" | "NGUNG_HOAT_DONG";
export type TrangThaiHoatDong = "BINH_THUONG" | "CANH_BAO" | "KHONG_HOAT_DONG";

// Filter and search types for AG Grid
export interface KhachHangFilter {
  tenKhachHang?: string;
  maSoThue?: string;
  trangThai?: TrangThaiKhachHang;
  nhanVienDVKHId?: ID;
  nhanVienLapSoId?: ID;
  nhanVienNSLId?: ID;
}

export interface PhieuThuFilter {
  tuNgay?: DateOnly;
  denNgay?: DateOnly;
  khachHangId?: ID;
  nhanVienId?: ID;
  kyDuLieuId?: ID;
  soTienMin?: Currency;
  soTienMax?: Currency;
}

// Response types for API endpoints
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Dashboard statistics types
export interface ThongKeKhachHang {
  tongSoKhachHang: number;
  khachHangHoatDong: number;
  khachHangTamDung: number;
  tongPhiDichVu: Currency;
}

export interface ThongKePhieuThu {
  tongSoPhieu: number;
  tongTienThu: Currency;
  phieuTrongThang: number;
  tienThuThangNay: Currency;
}
