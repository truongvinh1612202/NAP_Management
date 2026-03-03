# Database Seeding Scripts

## Overview

This directory contains scripts for populating your NAP Management database with sample data.

## Available Scripts

### `npm run seed`

Populates the database with sample Vietnamese business data without clearing existing records.

### `npm run seed:reset`

Clears all existing data and repopulates the database with fresh sample data.

## Generated Data

The seed script creates:

### 📊 Statistics

- **15 employees** - Vietnamese employees with realistic names
- **30 companies** - Various Vietnamese business types (TNHH, Cổ Phần)
- **~63 employee assignments** - Random assignments of employees to companies with different roles
- **~40 payment records** - Payment records for January-March 2026

### 👥 Employees (15 total)

Sample names include:

- Nguyễn Văn An
- Trần Thị Bình
- Lê Hoàng Cường
- Phạm Thị Dung
- And 11 more...

### 🏢 Companies (30 total)

Various business types:

- Công ty TNHH Xuất Nhập Khẩu Hồng Phát
- Công ty Cổ Phần Thương Mại An Phú
- Công ty TNHH Sản Xuất Thanh Bình
- And 27 more...

**Tax IDs:** Unique 10-digit tax codes (0123456789 - 0123456818)

**Service Fees:** Range from 2,500,000 VND to 8,000,000 VND

### 🔗 Employee Assignments

Each company is assigned 1-3 employees with different roles:

- **LAP_SO** (NV Lập Sổ) - Bookkeeping staff
- **NHAP_SO_LIEU** (NV Nhập Số Liệu) - Data entry staff
- **DICH_VU_KH** (NV Dịch Vụ KH) - Customer service staff

### 💰 Payments

- **Time Period:** January - March 2026
- **Coverage:** ~70% of companies have payment records
- **Frequency:** 1-3 months of payments per company
- **Notes:** Mix of payment notes and null values

Sample payment notes:

- "Đã thanh toán đầy đủ"
- "Thanh toán qua chuyển khoản"
- "Thanh toán tiền mặt"
- "Đã nhận hóa đơn"
- "Thanh toán trước hạn"

## Usage

### Initial Setup

```bash
# Reset database and create fresh sample data
npm run seed:reset
```

### Add More Data

```bash
# Add data without clearing (may cause duplicates)
npm run seed
```

### Clear All Data

```bash
# Reset migrations (clears all data)
npx prisma migrate reset --force
```

## Page Views

After seeding, you can view the data in:

1. **DanhMucNhanVien** (Employee Directory)
   - View all 15 employees
   - See company assignments for each employee
   - Edit employee names inline

2. **DanhMucKhachHang** (Company Directory)
   - View all 30 companies
   - See tax IDs and service fees
   - View assigned employees per company
   - Filter and search companies

3. **PaymentList** (Payment Records)
   - View ~40 payment records
   - Filter by company, month, and year
   - See payment notes
   - Edit notes inline

## Customization

To customize the seed data, edit [seedData.ts](./seedData.ts):

- **EMPLOYEE_NAMES**: Add/remove employee names
- **COMPANY_DATA**: Add/remove companies with tax IDs and fees
- **PAYMENT_NOTES**: Customize payment note options
- **Logic**: Modify assignment algorithms and payment generation

## Technical Details

- **Database:** SQLite (dev.db)
- **ORM:** Prisma Client
- **Runtime:** TSX (TypeScript execution)
- **Constraints:** Respects all foreign key relationships and unique constraints
