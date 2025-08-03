BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[chiphicongviec] (
    [Id] INT NOT NULL,
    [TenKhachHang] NVARCHAR(150),
    [CongViec_Id] INT,
    [Tencongviec] NVARCHAR(50),
    [chiphi] FLOAT(53),
    [Mota] NVARCHAR(50),
    [kh_Id] NVARCHAR(50),
    CONSTRAINT [PK__chiphico__3214EC07DCBA1C02] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[danhmuccongviec] (
    [Id] INT NOT NULL,
    [Ten] NVARCHAR(50) NOT NULL,
    [MoTa] NVARCHAR(150),
    CONSTRAINT [PK__danhmucc__3214EC073F469048] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[danhmuckhachhang] (
    [Id] INT NOT NULL,
    [TenKhachHang] NVARCHAR(150) NOT NULL,
    [MaSoThue] NVARCHAR(150) NOT NULL,
    [DiaChi] NVARCHAR(300),
    [PhiDichVu] FLOAT(53),
    [KyKhaiThue] NVARCHAR(15),
    [KyNhanCT] NVARCHAR(45),
    [DienThoai] NVARCHAR(45),
    [Email] NVARCHAR(100),
    [NganhKD] NVARCHAR(150),
    [CQTquanLy] NVARCHAR(45),
    [TrangThai] NVARCHAR(40),
    [GiamDoc] NVARCHAR(45),
    [NhanVienDVKH] NVARCHAR(45),
    [NhanVienLapSo] NVARCHAR(45),
    [TrangThaiHoatDong] NVARCHAR(45),
    [NhanVienDVKH_Id] INT,
    [NhanVienLapSo_Id] INT,
    [NhanVienNSL_Id] INT,
    [NhanVienNSL] VARCHAR(45),
    CONSTRAINT [PK__danhmuck__3214EC074E770AD8] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[danhmucnhanvien] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [MaSoNhanVien] NVARCHAR(50) NOT NULL,
    [TenNhanVien] NVARCHAR(150),
    [NamSinh] DATE,
    [DienThoai] NVARCHAR(45),
    [ThuongTru] NVARCHAR(200),
    [UserDangNhap] NVARCHAR(45),
    CONSTRAINT [PK__danhmucn__3214EC0797722030] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[dichvukhachhang] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [NhanVienId] INT NOT NULL,
    [KhachHangId] INT NOT NULL,
    [NgayBanGiao] DATE,
    CONSTRAINT [PK__dichvukh__3214EC0706D0E3EB] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ds_qlcnam] (
    [Id] INT NOT NULL,
    [nam] INT NOT NULL,
    [stt] INT NOT NULL,
    [NhanvienId] INT NOT NULL,
    [TenNhanvien] NVARCHAR(150),
    CONSTRAINT [PK__ds_qlcna__3214EC07DAB3DECB] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ds_qltnam] (
    [Id] INT NOT NULL,
    [Nam] INT NOT NULL,
    [Stt] INT NOT NULL,
    [KhachHangId] INT NOT NULL,
    [TenKhachHang] NVARCHAR(200) NOT NULL,
    [PhiDV] FLOAT(53),
    [GhiChu] NVARCHAR(145),
    [DauKy] FLOAT(53),
    [KhaiThue] NVARCHAR(45),
    [NhanHS] NVARCHAR(45),
    [NhanVienDVKH_Id] INT,
    [NhanVienNSL_Id] INT,
    [NhanVienLS_Id] INT,
    [PhiQLKH] FLOAT(53),
    [PhiNSL] FLOAT(53),
    [PhiLSo] FLOAT(53),
    [NgungDV] INT CONSTRAINT [DF_ds_qltnam_NgungDV] DEFAULT 0,
    CONSTRAINT [PK__ds_qltna__3214EC0736D1433B] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[kydulieu] (
    [Id] INT NOT NULL,
    [NoiDung] NVARCHAR(200) NOT NULL,
    [TuNgay] DATE,
    [DenNgay] DATE,
    [TonQuy] FLOAT(53),
    [lockdata] INT,
    CONSTRAINT [PK__kydulieu__3214EC07E62DF730] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[nghiemthucongviec] (
    [Id] INT NOT NULL,
    [Noidung] NVARCHAR(145),
    [KhachhangId] INT,
    [NhanvienId] INT,
    [CongviecId] INT,
    [Khachhang] NVARCHAR(145),
    [Nhanvien] NVARCHAR(45),
    [Congviec] NVARCHAR(45),
    [Ngay] DATE,
    [Sotien] FLOAT(53),
    [Kydulieu] NVARCHAR(45),
    CONSTRAINT [PK__nghiemth__3214EC07DBC6DDB9] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[noidungchi] (
    [Id] INT NOT NULL,
    [NoiDung] NVARCHAR(200) NOT NULL,
    CONSTRAINT [PK__noidungc__3214EC07AB6E2050] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[noidungthu] (
    [Id] INT NOT NULL,
    [NoiDung] NVARCHAR(200) NOT NULL,
    CONSTRAINT [PK__noidungt__3214EC0770FAC5FD] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[phaithu] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [KyKeToanId] INT NOT NULL,
    [KhachHangId] INT NOT NULL,
    [NhanVienId] INT NOT NULL,
    [SoTien] FLOAT(53) NOT NULL,
    [NoiDung] NVARCHAR(145),
    [TenNhanVien] NVARCHAR(65),
    [TenKhachHang] NVARCHAR(145),
    [NgayCT] DATE,
    [Ghichu] VARCHAR(150),
    [NguoiLap] NVARCHAR(45),
    [MaSoThue] NVARCHAR(150),
    CONSTRAINT [PK__phaithu__3214EC07ED386CD4] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[phieuchi] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [KyDuLieuId] INT,
    [UserId] INT,
    [NhanVienId] INT NOT NULL,
    [NoiDung] NVARCHAR(245),
    [NhomChi] NVARCHAR(45),
    [NgayChi] DATE,
    [SoCT] NVARCHAR(45),
    [SoTien] FLOAT(53) CONSTRAINT [DF_phieuchi_SoTien] DEFAULT 0,
    [ThuQuy] NVARCHAR(150),
    [TenKhachHang] NVARCHAR(200),
    [TenNhanVien] NVARCHAR(200),
    [QuyenSo] INT,
    [ThuQuyid] INT,
    CONSTRAINT [PK_phieuchi] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[phieuchi1] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [KyDuLieuId] INT,
    [UserId] INT,
    [NhanVienId] INT NOT NULL,
    [NoiDung] NVARCHAR(245),
    [NhomChi] NVARCHAR(45),
    [NgayChi] DATE,
    [SoCT] NVARCHAR(45),
    [SoTien] FLOAT(53) CONSTRAINT [DF__phieuchi__SoTien__05D8E0BE] DEFAULT 0,
    [ThuQuy] NVARCHAR(150),
    [TenKhachHang] NVARCHAR(200),
    [TenNhanVien] NVARCHAR(200),
    [QuyenSo] INT,
    [ThuQuyid] INT,
    CONSTRAINT [PK__phieuchi__3214EC0722E463CF] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[phieuthu] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [KyDuLieuId] INT NOT NULL,
    [KhachHangId] INT NOT NULL,
    [NhanVienId] INT NOT NULL,
    [NoiDung] NVARCHAR(45),
    [NhomDoanhThu] NVARCHAR(45),
    [NgayThu] DATE,
    [SoCT] NVARCHAR(45),
    [SoTien] FLOAT(53) CONSTRAINT [DF__phieuthu__SoTien__114A936A] DEFAULT 0,
    [ThuQuy] NVARCHAR(150),
    [TenKhachHang] NVARCHAR(200),
    [TenNhanVien] NVARCHAR(200),
    [QuyenSo] INT,
    [ThuQuyId] INT,
    CONSTRAINT [PK__phieuthu__3214EC0752FBC86A] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[quanlyphidichvu] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [KhachHangId] INT NOT NULL,
    [PhiDichVu] FLOAT(53),
    [NgayHieuLuc] DATE,
    [GhiChu] NVARCHAR(245),
    CONSTRAINT [PK__quanlyph__3214EC07B09AC963] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[sysdiagrams] (
    [name] NVARCHAR(128) NOT NULL,
    [principal_id] INT NOT NULL,
    [diagram_id] INT NOT NULL IDENTITY(1,1),
    [version] INT,
    [definition] VARBINARY(max),
    CONSTRAINT [PK__sysdiagr__C2B05B61EEBC26F5] PRIMARY KEY CLUSTERED ([diagram_id]),
    CONSTRAINT [UK_principal_name] UNIQUE NONCLUSTERED ([principal_id],[name])
);

-- AddForeignKey
ALTER TABLE [dbo].[phieuthu] ADD CONSTRAINT [FK_phieuthu_danhmuckhachhang] FOREIGN KEY ([KhachHangId]) REFERENCES [dbo].[danhmuckhachhang]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[phieuthu] ADD CONSTRAINT [FK_phieuthu_danhmucnhanvien] FOREIGN KEY ([NhanVienId]) REFERENCES [dbo].[danhmucnhanvien]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[phieuthu] ADD CONSTRAINT [FK_phieuthu_kydulieu] FOREIGN KEY ([KyDuLieuId]) REFERENCES [dbo].[kydulieu]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

