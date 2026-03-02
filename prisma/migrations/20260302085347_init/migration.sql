-- CreateTable
CREATE TABLE "chiphicongviec" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "TenKhachHang" TEXT,
    "CongViec_Id" INTEGER,
    "Tencongviec" TEXT,
    "chiphi" REAL,
    "Mota" TEXT,
    "kh_Id" TEXT
);

-- CreateTable
CREATE TABLE "danhmuccongviec" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Ten" TEXT NOT NULL,
    "MoTa" TEXT
);

-- CreateTable
CREATE TABLE "danhmuckhachhang" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "TenKhachHang" TEXT NOT NULL,
    "MaSoThue" TEXT NOT NULL,
    "DiaChi" TEXT,
    "PhiDichVu" REAL,
    "KyKhaiThue" TEXT,
    "KyNhanCT" TEXT,
    "DienThoai" TEXT,
    "Email" TEXT,
    "NganhKD" TEXT,
    "CQTquanLy" TEXT,
    "TrangThai" TEXT,
    "GiamDoc" TEXT,
    "NhanVienDVKH" TEXT,
    "NhanVienLapSo" TEXT,
    "TrangThaiHoatDong" TEXT,
    "NhanVienDVKH_Id" INTEGER,
    "NhanVienLapSo_Id" INTEGER,
    "NhanVienNSL_Id" INTEGER,
    "NhanVienNSL" TEXT
);

-- CreateTable
CREATE TABLE "danhmucnhanvien" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "MaSoNhanVien" TEXT NOT NULL,
    "TenNhanVien" TEXT,
    "NamSinh" DATETIME,
    "DienThoai" TEXT,
    "ThuongTru" TEXT,
    "UserDangNhap" TEXT
);

-- CreateTable
CREATE TABLE "dichvukhachhang" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "NhanVienId" INTEGER NOT NULL,
    "KhachHangId" INTEGER NOT NULL,
    "NgayBanGiao" DATETIME
);

-- CreateTable
CREATE TABLE "ds_qlcnam" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nam" INTEGER NOT NULL,
    "stt" INTEGER NOT NULL,
    "NhanvienId" INTEGER NOT NULL,
    "TenNhanvien" TEXT
);

-- CreateTable
CREATE TABLE "ds_qltnam" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Nam" INTEGER NOT NULL,
    "Stt" INTEGER NOT NULL,
    "KhachHangId" INTEGER NOT NULL,
    "TenKhachHang" TEXT NOT NULL,
    "PhiDV" REAL,
    "GhiChu" TEXT,
    "DauKy" REAL,
    "KhaiThue" TEXT,
    "NhanHS" TEXT,
    "NhanVienDVKH_Id" INTEGER,
    "NhanVienNSL_Id" INTEGER,
    "NhanVienLS_Id" INTEGER,
    "PhiQLKH" REAL,
    "PhiNSL" REAL,
    "PhiLSo" REAL,
    "NgungDV" INTEGER DEFAULT 0
);

-- CreateTable
CREATE TABLE "kydulieu" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "NoiDung" TEXT NOT NULL,
    "TuNgay" DATETIME,
    "DenNgay" DATETIME,
    "TonQuy" REAL,
    "lockdata" INTEGER
);

-- CreateTable
CREATE TABLE "nghiemthucongviec" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Noidung" TEXT,
    "KhachhangId" INTEGER,
    "NhanvienId" INTEGER,
    "CongviecId" INTEGER,
    "Khachhang" TEXT,
    "Nhanvien" TEXT,
    "Congviec" TEXT,
    "Ngay" DATETIME,
    "Sotien" REAL,
    "Kydulieu" TEXT
);

-- CreateTable
CREATE TABLE "noidungchi" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "NoiDung" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "noidungthu" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "NoiDung" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "phaithu" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "KyKeToanId" INTEGER NOT NULL,
    "KhachHangId" INTEGER NOT NULL,
    "NhanVienId" INTEGER NOT NULL,
    "SoTien" REAL NOT NULL,
    "NoiDung" TEXT,
    "TenNhanVien" TEXT,
    "TenKhachHang" TEXT,
    "NgayCT" DATETIME,
    "Ghichu" TEXT,
    "NguoiLap" TEXT,
    "MaSoThue" TEXT
);

-- CreateTable
CREATE TABLE "phieuchi" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "KyDuLieuId" INTEGER,
    "UserId" INTEGER,
    "NhanVienId" INTEGER NOT NULL,
    "NoiDung" TEXT,
    "NhomChi" TEXT,
    "NgayChi" DATETIME,
    "SoCT" TEXT,
    "SoTien" REAL DEFAULT 0,
    "ThuQuy" TEXT,
    "TenKhachHang" TEXT,
    "TenNhanVien" TEXT,
    "QuyenSo" INTEGER,
    "ThuQuyid" INTEGER
);

-- CreateTable
CREATE TABLE "phieuchi1" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "KyDuLieuId" INTEGER,
    "UserId" INTEGER,
    "NhanVienId" INTEGER NOT NULL,
    "NoiDung" TEXT,
    "NhomChi" TEXT,
    "NgayChi" DATETIME,
    "SoCT" TEXT,
    "SoTien" REAL DEFAULT 0,
    "ThuQuy" TEXT,
    "TenKhachHang" TEXT,
    "TenNhanVien" TEXT,
    "QuyenSo" INTEGER,
    "ThuQuyid" INTEGER
);

-- CreateTable
CREATE TABLE "phieuthu" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "KyDuLieuId" INTEGER NOT NULL,
    "KhachHangId" INTEGER NOT NULL,
    "NhanVienId" INTEGER NOT NULL,
    "NoiDung" TEXT,
    "NhomDoanhThu" TEXT,
    "NgayThu" DATETIME,
    "SoCT" TEXT,
    "SoTien" REAL DEFAULT 0,
    "ThuQuy" TEXT,
    "TenKhachHang" TEXT,
    "TenNhanVien" TEXT,
    "QuyenSo" INTEGER,
    "ThuQuyId" INTEGER,
    CONSTRAINT "phieuthu_KhachHangId_fkey" FOREIGN KEY ("KhachHangId") REFERENCES "danhmuckhachhang" ("Id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "phieuthu_NhanVienId_fkey" FOREIGN KEY ("NhanVienId") REFERENCES "danhmucnhanvien" ("Id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "phieuthu_KyDuLieuId_fkey" FOREIGN KEY ("KyDuLieuId") REFERENCES "kydulieu" ("Id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "quanlyphidichvu" (
    "Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "KhachHangId" INTEGER NOT NULL,
    "PhiDichVu" REAL,
    "NgayHieuLuc" DATETIME,
    "GhiChu" TEXT
);

-- CreateTable
CREATE TABLE "sysdiagrams" (
    "name" TEXT NOT NULL,
    "principal_id" INTEGER NOT NULL,
    "diagram_id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" INTEGER,
    "definition" BLOB
);

-- CreateIndex
CREATE UNIQUE INDEX "sysdiagrams_principal_id_name_key" ON "sysdiagrams"("principal_id", "name");
