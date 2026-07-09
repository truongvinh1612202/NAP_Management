import * as XLSX from "xlsx";
import { Company, Employee, CompanyEmployee } from "../../generated/client";
import { formatDateVN } from "./helper";

// Định dạng số tiền chuẩn Việt: có dấu ngăn cách hàng nghìn (vd 4.000.000).
// "#,##0" là mã định dạng số của Excel; dấu ngăn cách hiển thị theo Regional Settings
// của máy (máy tiếng Việt → dấu "."). Giữ ô ở dạng SỐ (không phải text) để vẫn cộng
// /tính được trong Excel.
const MONEY_FMT = "#,##0";

/**
 * Gán định dạng số tiền (#,##0) cho các cột chỉ định trong worksheet.
 * @param ws Worksheet đã tạo
 * @param colIndexes Chỉ số cột (0-based) chứa số tiền
 * @param firstDataRow Dòng dữ liệu đầu tiên (0-based, ngay sau dòng tiêu đề)
 */
function applyMoneyFormat(
  ws: XLSX.WorkSheet,
  colIndexes: number[],
  firstDataRow: number
) {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let r = firstDataRow; r <= range.e.r; r++) {
    for (const c of colIndexes) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = MONEY_FMT;
    }
  }
}

export interface ExcelImportRow {
  stt?: number | string;
  mst: string; // Mã Số Thuế
  tenCty: string; // Tên Công Ty
  phiDv?: number; // Phí Dịch Vụ
  dvkh?: string; // Nhân viên Dịch Vụ KH
  nsl?: string; // Nhân viên Nhập Số Liệu
  ls?: string; // Lập Sổ
}

/**
 * Parse Excel file and extract company data
 */
export async function parseExcelFile(file: File): Promise<ExcelImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Parse header row to find column indices
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        // Header trong file có thể dư khoảng trắng (vd " Phí DV ") → chuẩn hoá key
        // bằng cách trim để tra cứu chắc chắn, không bị phụ thuộc dấu cách.
        const norm = (row: Record<string, any>): Record<string, any> => {
          const out: Record<string, any> = {};
          for (const k of Object.keys(row)) out[k.trim()] = row[k];
          return out;
        };
        const pick = (row: Record<string, any>, keys: string[]): any => {
          for (const k of keys) {
            const v = row[k];
            if (v !== undefined && v !== null && String(v).trim() !== "") return v;
          }
          return undefined;
        };
        // Phí DV có thể là số (2500000) hoặc chuỗi có ngăn cách ("2.500.000" / "2,500,000").
        const parseMoney = (v: any): number => {
          if (typeof v === "number") return v;
          const s = String(v ?? "").replace(/[^\d]/g, ""); // giữ lại chữ số
          return s ? parseInt(s, 10) : 0;
        };

        const importRows: ExcelImportRow[] = rawRows
          .map(norm)
          .filter((row) => pick(row, ["Mã số thuế", "MST"])) // bỏ dòng trống
          .map((row) => ({
            stt: pick(row, ["STT", "stt"]) ?? "",
            mst: String(pick(row, ["Mã số thuế", "MST"]) ?? "").trim(),
            tenCty: String(pick(row, ["Tên công ty", "Tên CTY", "Tên DN"]) ?? "").trim(),
            phiDv: parseMoney(pick(row, ["Phí DV", "Phí dịch vụ", "Phi DV"])),
            dvkh: String(pick(row, ["DVKH", "DV KH"]) ?? "").trim() || undefined,
            nsl: String(pick(row, ["NSL", "Nhập số liệu"]) ?? "").trim() || undefined,
            ls: String(pick(row, ["LS", "Lập sổ"]) ?? "").trim() || undefined,
          }));

        resolve(importRows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export companies to Excel file
 */
export function exportToExcel(
  companies: (Company & {
    employeeAssignments: (CompanyEmployee & { employee: Employee })[];
  })[]
) {
  const data = companies.map((company, index) => {
    const dvckhEmployees = company.employeeAssignments
      .filter((a) => a.role === "DICH_VU_KH")
      .map((a) => a.employee.fullName)
      .join(", ");

    const nslEmployees = company.employeeAssignments
      .filter((a) => a.role === "NHAP_SO_LIEU")
      .map((a) => a.employee.fullName)
      .join(", ");

    const lsEmployees = company.employeeAssignments
      .filter((a) => a.role === "LAP_SO")
      .map((a) => a.employee.fullName)
      .join(", ");

    return {
      STT: index + 1,
      "Mã số thuế": company.taxId,
      "Tên công ty": company.companyName,
      "Phí DV": company.serviceFee || 0,
      DVKH: dvckhEmployees,
      NSL: nslEmployees,
      LS: lsEmployees,
    };
  });

  // Create a new workbook
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 8 }, // STT
    { wch: 15 }, // Mã số thuế
    { wch: 30 }, // Tên công ty
    { wch: 15 }, // Phí DV
    { wch: 20 }, // DVKH
    { wch: 20 }, // NSL
    { wch: 20 }, // LS
  ];

  // Cột "Phí DV" (index 3) hiển thị số có dấu chấm ngăn cách; dữ liệu bắt đầu từ dòng 1
  applyMoneyFormat(ws, [3], 1);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Companies");

  // Generate filename with current date
  const now = new Date();
  const dateString = now.toISOString().split("T")[0];
  const filename = `Danh_sach_cong_ty_${dateString}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Validate import data
 */
export function validateImportData(rows: ExcelImportRow[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    if (!row.mst) {
      errors.push(`Dòng ${index + 2}: Mã số thuế không được để trống`);
    }
    if (!row.tenCty) {
      errors.push(`Dòng ${index + 2}: Tên công ty không được để trống`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export tiền thu data in PIVOT format (Summary by year)
 */
export function exportTienThuPivot(
  companies: any[],
  year: number,
  searchText?: string
) {
  let filteredCompanies = companies;
  if (searchText && searchText.trim()) {
    const q = searchText.toLowerCase();
    filteredCompanies = companies.filter(c => 
      c.companyName.toLowerCase().includes(q) || 
      c.taxId.toLowerCase().includes(q)
    );
  }

  const aoaData: any[][] = [
    ["Đơn vị: Cty TNHH ĐLT Nam An Phát"],
    ["Địa chỉ: Ninh Kiều, Cần Thơ"],
    [],
    ["STT", "Tên khách hàng", "Phí DV", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  ];

  // Cộng dồn để làm hàng TỔNG CỘNG cuối bảng
  const monthTotals = Array(12).fill(0); // tổng tiền thu theo từng tháng 1..12
  let totalServiceFee = 0; // tổng phí dịch vụ

  filteredCompanies.forEach((company, index) => {
    const row: any[] = [
      index + 1,
      company.companyName,
      company.serviceFee || 0,
    ];
    totalServiceFee += company.serviceFee ?? 0;
    for (let m = 1; m <= 12; m++) {
      // Mỗi (công ty, tháng, năm) chỉ có tối đa 1 phiếu → dùng find
      const payment = company.payments.find(
        (p: any) => p.month === m && p.year === year
      );
      // Hiện SỐ TIỀN thực thu; nếu chưa có phiếu hoặc chưa nhập số tiền → để trống
      if (payment && payment.amount != null) {
        row.push(payment.amount);
        monthTotals[m - 1] += payment.amount;
      } else {
        row.push("");
      }
    }
    aoaData.push(row);
  });

  // Hàng tổng cuối bảng: cộng tiền từng tháng + tổng phí DV
  aoaData.push(["", "TỔNG CỘNG", totalServiceFee, ...monthTotals]);

  const ws = XLSX.utils.aoa_to_sheet(aoaData);
  ws["!cols"] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, ...Array(12).fill({ wch: 12 })];

  // Cột Phí DV (index 2) + 12 cột tháng (index 3..14) hiển thị số có dấu chấm.
  // Dữ liệu bắt đầu từ dòng index 4 (sau 3 dòng tiêu đề + 1 dòng header cột);
  // gồm cả dòng TỔNG CỘNG ở cuối.
  applyMoneyFormat(
    ws,
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    4
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Pivot_${year}`);

  const now = new Date();
  const dateString = now.toISOString().split("T")[0];
  XLSX.writeFile(wb, `Bang_ke_pivot_nam_${year}_${dateString}.xlsx`);
}

/**
 * Export tiền thu data in LIST format (Detail records)
 */
export function exportTienThuList(
  paymentRecords: any[],
  filterMonth: number | "",
  filterYear: number
) {
  const MONTH_NAMES = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const data = paymentRecords.map((record, index) => ({
    STT: index + 1,
    "Công Ty": record.companyName,
    MST: record.taxId,
    "Phí Dịch Vụ": record.serviceFee || 0,
    Tháng: MONTH_NAMES[record.month - 1],
    Năm: record.year,
    "Số Tiền Thu": record.amount || 0,
    "Thời Gian Thu": formatDateVN(record.collectionDate),
    "Ghi Chú": record.note || "",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 6 }, { wch: 35 }, { wch: 18 }, { wch: 15 },
    { wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 30 }
  ];

  // Cột "Phí Dịch Vụ" (index 3) và "Số Tiền Thu" (index 6) hiển thị số có dấu chấm
  applyMoneyFormat(ws, [3, 6], 1);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_thu");

  const now = new Date();
  const dateString = now.toISOString().split("T")[0];
  const monthStr = filterMonth !== "" ? `_T${filterMonth}` : "";
  XLSX.writeFile(wb, `Danh_sach_thu_tien${monthStr}_${filterYear}_${dateString}.xlsx`);
}

