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
 * Export bảng kê năm THEO NHÂN VIÊN THU (người nhập phiếu).
 * Giống hệt "Bảng kê năm" (ma trận 12 tháng) nhưng CHỈ tính các phiếu do nhân viên
 * được chọn nhập (Payment.batch.enteredById === employeeId), và chỉ liệt kê những
 * công ty mà nhân viên đó đã thu trong năm. Mục đích: biết 1 nhân viên đã nhập liệu
 * (thu tiền) cho bao nhiêu / những công ty nào.
 * Trả về SỐ CÔNG TY xuất được (0 = không có → caller cảnh báo, không tải file rỗng).
 */
export function exportTienThuByEmployee(
  companies: any[],
  employeeId: number,
  employeeName: string,
  year: number,
  searchText?: string
): number {
  let filteredCompanies = companies;
  if (searchText && searchText.trim()) {
    const q = searchText.toLowerCase();
    filteredCompanies = companies.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.taxId.toLowerCase().includes(q)
    );
  }

  // 1 payment "thuộc" nhân viên nếu phiếu (batch) của nó có enteredById === employeeId.
  const enteredBy = (p: any) =>
    (p.batch?.enteredById ?? p.batch?.enteredBy?.id) === employeeId;

  const aoaData: any[][] = [
    ["Đơn vị: Cty TNHH ĐLT Nam An Phát"],
    ["Địa chỉ: Ninh Kiều, Cần Thơ"],
    [`Nhân viên thu: ${employeeName}`],
    [`Năm: ${year}`],
    [],
    [
      "STT",
      "Tên khách hàng",
      "Phí DV",
      "1", "2", "3", "4", "5", "6",
      "7", "8", "9", "10", "11", "12",
    ],
  ];

  const monthTotals = Array(12).fill(0);
  let totalServiceFee = 0;
  let stt = 0;

  filteredCompanies.forEach((company) => {
    // Tính trước 12 tháng; chỉ giữ công ty NÀO có ít nhất 1 phiếu do NV này nhập.
    const monthCells: (number | "")[] = [];
    let hasAny = false;
    for (let m = 1; m <= 12; m++) {
      const payment = company.payments.find(
        (p: any) => p.month === m && p.year === year && enteredBy(p)
      );
      if (payment && payment.amount != null) {
        monthCells.push(payment.amount);
        monthTotals[m - 1] += payment.amount;
        hasAny = true;
      } else if (payment) {
        // Có phiếu do NV này nhập nhưng chưa nhập số tiền → vẫn tính là "đã thu".
        monthCells.push("");
        hasAny = true;
      } else {
        monthCells.push("");
      }
    }
    if (!hasAny) return; // NV này không thu công ty này trong năm → bỏ

    stt += 1;
    totalServiceFee += company.serviceFee ?? 0;
    aoaData.push([
      stt,
      company.companyName,
      company.serviceFee || 0,
      ...monthCells,
    ]);
  });

  if (stt === 0) return 0; // không có công ty nào → báo caller, không xuất file

  aoaData.push(["", "TỔNG CỘNG", totalServiceFee, ...monthTotals]);

  const ws = XLSX.utils.aoa_to_sheet(aoaData);
  ws["!cols"] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, ...Array(12).fill({ wch: 12 })];

  // Cột Phí DV (2) + 12 cột tháng (3..14) hiển thị số có dấu chấm.
  // Dữ liệu bắt đầu từ dòng index 6 (4 dòng tiêu đề + 1 dòng trống + 1 dòng header cột).
  applyMoneyFormat(ws, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 6);

  // Tên sheet an toàn (Excel cấm : \ / ? * [ ] và ≤ 31 ký tự)
  const safeName = employeeName.replace(/[:\\/?*[\]]/g, "").slice(0, 20) || "NV";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${safeName}_${year}`.slice(0, 31));

  const now = new Date();
  const dateString = now.toISOString().split("T")[0];
  const safeFile = employeeName.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  XLSX.writeFile(wb, `Bang_ke_NV_${safeFile}_${year}_${dateString}.xlsx`);
  return stt;
}

/**
 * QUẢN LÝ PHÍ DỊCH VỤ — BẢNG KÊ NĂM (pivot 12 tháng), tính cả năm tới thời điểm xuất.
 * Sheet "Bảng kê năm": mọi công ty với 12 cột tháng (số tiền thu mỗi tháng, TRỐNG nếu
 * tháng đó chưa thu) + Phí DV + Tổng năm + NV Dịch Vụ KH, và dòng TỔNG CỘNG.
 * Mỗi NV Dịch Vụ KH 1 sheet: các công ty NV đó phụ trách, cùng bố cục 12 tháng + Tổng.
 */
export function exportPhiDichVu(companies: any[], year: number) {
  const dvkhNamesOf = (c: any): string[] =>
    (c.employeeAssignments ?? [])
      .filter((a: any) => a.role === "DICH_VU_KH")
      .map((a: any) => a.employee?.fullName)
      .filter(Boolean);

  // 12 tháng của năm: có phiếu → amount ?? 0; không → "" (ô trống). Trả [cells, total].
  const monthsOf = (c: any): [(number | "")[], number] => {
    const cells: (number | "")[] = [];
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const pay = (c.payments ?? []).find(
        (p: any) => p.month === m && p.year === year,
      );
      if (pay) {
        const v = pay.amount ?? 0;
        cells.push(v);
        total += v;
      } else {
        cells.push("");
      }
    }
    return [cells, total];
  };

  const MONTH_HEADERS = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
  const wb = XLSX.utils.book_new();

  // Dựng 1 sheet bảng kê năm cho 1 danh sách công ty
  const buildSheet = (
    title: string,
    subtitle: string,
    list: any[],
    withDvkh: boolean,
  ) => {
    const header = withDvkh
      ? ["STT", "MST", "Tên công ty", "Phí DV", ...MONTH_HEADERS, "Tổng", "NV Dịch Vụ KH"]
      : ["STT", "MST", "Tên công ty", "Phí DV", ...MONTH_HEADERS, "Tổng"];
    const aoa: any[][] = [[title], [subtitle], [], header];

    let feeSum = 0;
    let grandTotal = 0;
    const monthSums = Array(12).fill(0);
    list.forEach((c, i) => {
      const [cells, total] = monthsOf(c);
      const fee = c.serviceFee ?? 0;
      feeSum += fee;
      grandTotal += total;
      cells.forEach((v, mi) => (monthSums[mi] += typeof v === "number" ? v : 0));
      const row = [i + 1, c.taxId, c.companyName, fee, ...cells, total];
      if (withDvkh) row.push(dvkhNamesOf(c).join(", ") || "— Chưa phân công —");
      aoa.push(row);
    });
    const totalRow = ["", "", "TỔNG CỘNG", feeSum, ...monthSums, grandTotal];
    if (withDvkh) totalRow.push("");
    aoa.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 6 }, { wch: 15 }, { wch: 38 }, { wch: 12 },
      ...Array(12).fill({ wch: 11 }), { wch: 14 },
      ...(withDvkh ? [{ wch: 22 }] : []),
    ];
    // Cột số: Phí DV (3) + 12 tháng (4..15) + Tổng (16). Dữ liệu từ dòng index 4.
    applyMoneyFormat(ws, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 4);
    return ws;
  };

  // ── Sheet tổng "Bảng kê năm" ─────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet("BẢNG KÊ NĂM — PHÍ DỊCH VỤ", `Năm ${year}`, companies, true),
    "Bảng kê năm",
  );

  // ── Mỗi NV DVKH 1 sheet ─────────────────────────────────────────────────────
  const byEmp = new Map<string, any[]>();
  const noDvkh: any[] = [];
  for (const c of companies) {
    const names = dvkhNamesOf(c);
    if (names.length === 0) noDvkh.push(c);
    else for (const n of names) {
      if (!byEmp.has(n)) byEmp.set(n, []);
      byEmp.get(n)!.push(c);
    }
  }

  const usedNames = new Set<string>();
  const safeSheetName = (name: string): string => {
    const base = name.replace(/[:\\/?*[\]]/g, "").slice(0, 28) || "NV";
    let candidate = base;
    let k = 2;
    while (usedNames.has(candidate)) candidate = `${base.slice(0, 25)}_${k++}`;
    usedNames.add(candidate);
    return candidate;
  };

  Array.from(byEmp.keys())
    .sort((a, b) => a.localeCompare(b, "vi"))
    .forEach((name) => {
      const ws = buildSheet(`NV Dịch Vụ KH: ${name}`, `Năm ${year}`, byEmp.get(name)!, false);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(name));
    });
  if (noDvkh.length) {
    const ws = buildSheet("Chưa phân công DVKH", `Năm ${year}`, noDvkh, false);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName("Chưa phân công"));
  }

  const now = new Date();
  const dateString = now.toISOString().split("T")[0];
  XLSX.writeFile(wb, `Bang_ke_nam_PhiDV_${year}_${dateString}.xlsx`);
}

/**
 * CHI TIẾT NHÂN VIÊN — mỗi nhân viên 1 sheet: danh sách công ty NV phụ trách, phí DV,
 * đã thu (theo 1 tháng) HOẶC 12 tháng (cả năm), trạng thái, và 3 cột vai trò (DVKH / Lập
 * Sổ / Nhập Số Liệu → dấu ✓). Có dòng TỔNG CỘNG. Truyền `employees=[1 NV]` để xuất riêng.
 * "Đã thu" = công ty CÓ phiếu thu trong kỳ (bất kỳ ai) — tính cho mọi NV phụ trách công ty.
 */
export function exportNhanVienChiTiet(
  companies: any[],
  employees: any[],
  month: number | "all",
  year: number,
) {
  const yearMode = month === "all";
  const MONTH_HEADERS = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
  const tick = (b: boolean) => (b ? "✓" : "");

  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  const safeSheetName = (name: string): string => {
    const base = name.replace(/[:\\/?*[\]]/g, "").slice(0, 28) || "NV";
    let candidate = base;
    let k = 2;
    while (usedNames.has(candidate)) candidate = `${base.slice(0, 25)}_${k++}`;
    usedNames.add(candidate);
    return candidate;
  };

  let sheetCount = 0;
  for (const emp of employees) {
    const list = companies.filter((c: any) =>
      (c.employeeAssignments ?? []).some((a: any) => a.employeeId === emp.id),
    );
    if (list.length === 0) continue; // bỏ qua NV không phụ trách công ty nào
    list.sort((a: any, b: any) => a.companyName.localeCompare(b.companyName, "vi"));

    const rolesOf = (c: any) => {
      const set = new Set(
        (c.employeeAssignments ?? [])
          .filter((a: any) => a.employeeId === emp.id)
          .map((a: any) => a.role),
      );
      return {
        dvkh: set.has("DICH_VU_KH"),
        lapSo: set.has("LAP_SO"),
        nsl: set.has("NHAP_SO_LIEU"),
      };
    };

    const header = yearMode
      ? ["STT", "MST", "Tên công ty", "Phí DV", "DVKH", "Lập Sổ", "Nhập Số Liệu", ...MONTH_HEADERS, "Tổng"]
      : ["STT", "MST", "Tên công ty", "Phí DV", "Đã Thu", "Trạng thái", "DVKH", "Lập Sổ", "Nhập Số Liệu"];
    const aoa: any[][] = [
      [`NHÂN VIÊN: ${emp.fullName}`],
      [yearMode ? `Cả năm ${year}` : `Tháng ${String(month).padStart(2, "0")}/${year}`],
      [],
      header,
    ];

    let feeSum = 0;
    let collectedSum = 0;
    const monthSums = Array(12).fill(0);
    list.forEach((c: any, i: number) => {
      const r = rolesOf(c);
      const fee = c.serviceFee ?? 0;
      feeSum += fee;
      if (yearMode) {
        const cells: (number | "")[] = [];
        let total = 0;
        for (let m = 1; m <= 12; m++) {
          const pay = (c.payments ?? []).find((p: any) => p.month === m && p.year === year);
          if (pay) {
            const v = pay.amount ?? 0;
            cells.push(v);
            total += v;
            monthSums[m - 1] += v;
          } else cells.push("");
        }
        collectedSum += total;
        aoa.push([i + 1, c.taxId, c.companyName, fee, tick(r.dvkh), tick(r.lapSo), tick(r.nsl), ...cells, total]);
      } else {
        const pay = (c.payments ?? []).find((p: any) => p.month === month && p.year === year);
        const collected = pay ? pay.amount ?? 0 : 0;
        collectedSum += collected;
        aoa.push([
          i + 1, c.taxId, c.companyName, fee, collected,
          pay ? "Đã thu" : "Chưa thu", tick(r.dvkh), tick(r.lapSo), tick(r.nsl),
        ]);
      }
    });

    // Dòng TỔNG CỘNG
    if (yearMode) {
      aoa.push(["", "", "TỔNG CỘNG", feeSum, "", "", "", ...monthSums, collectedSum]);
    } else {
      aoa.push(["", "", "TỔNG CỘNG", feeSum, collectedSum, "", "", "", ""]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = yearMode
      ? [{ wch: 6 }, { wch: 15 }, { wch: 36 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, ...Array(12).fill({ wch: 11 }), { wch: 14 }]
      : [{ wch: 6 }, { wch: 15 }, { wch: 38 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
    // Cột số: Phí DV (3) + (cả năm: 12 tháng 7..18 + Tổng 19) / (tháng: Đã Thu 4). Dữ liệu từ dòng index 4.
    if (yearMode) applyMoneyFormat(ws, [3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 4);
    else applyMoneyFormat(ws, [3, 4], 4);

    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(emp.fullName));
    sheetCount++;
  }

  if (sheetCount === 0) {
    // Không NV nào có công ty → tạo 1 sheet thông báo để file không rỗng
    const ws = XLSX.utils.aoa_to_sheet([["Không có nhân viên nào phụ trách công ty trong kỳ này."]]);
    XLSX.utils.book_append_sheet(wb, ws, "Trống");
  }

  const now = new Date();
  const dateString = now.toISOString().split("T")[0];
  const kyStr = yearMode ? `Ca_nam_${year}` : `T${String(month).padStart(2, "0")}_${year}`;
  const who =
    employees.length === 1
      ? `_${(employees[0].fullName || "NV").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "")}`
      : "";
  XLSX.writeFile(wb, `Chi_tiet_NV${who}_${kyStr}_${dateString}.xlsx`);
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

// ═══════════════════════════════════════════════════════════════════════════════
// NHẬP PHIẾU THU TỪ EXCEL — 1 file = 1 phiếu (nhiều công ty)
// Bố cục file (bám theo maunhap.xlsx của khách):
//   Hàng "Ngày"      | <ngày thu>        (cấp phiếu)
//   Hàng "Nhân viên" | <người nhập>      (cấp phiếu)
//   Hàng tiêu đề: STT | Tên công ty | MST | Kỳ (T/Q) | Số tiền | Ghi chú
//   Các dòng công ty, kết thúc ở dòng "TỔNG CỘNG" hoặc hết MST.
// ═══════════════════════════════════════════════════════════════════════════════

const pad2 = (n: number) => String(n).padStart(2, "0");

// Số tiền 1 ô: số → giữ; chuỗi "2.000.000"/"2,000,000" → 2000000; rỗng → null.
export function parseMoneyCell(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d]/g, "");
  return s === "" ? null : parseInt(s, 10);
}

// Kỳ: "MM/YYYY" (vd 02/2026), "T{m}/YYYY", "Q{q}/YYYY" (Q1→tháng 3, Q2→6, Q3→9, Q4→12),
// hoặc ô ngày Excel (Date/serial). Trả {month, year} hoặc null nếu không hợp lệ.
export function parseKy(v: unknown): { month: number; year: number } | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date)
    return { month: v.getMonth() + 1, year: v.getFullYear() };
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d && d.y) return { month: d.m, year: d.y };
    return null;
  }
  const s = String(v).trim().toUpperCase();
  const m = s.match(/^([TQ])?\s*(\d{1,2})\s*[/\-.]\s*(\d{4})$/);
  if (!m) return null;
  const kind = m[1];
  let month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (kind === "Q") {
    if (month < 1 || month > 4) return null;
    month = month * 3; // quý → tháng cuối quý
  }
  if (month < 1 || month > 12 || year < 2000) return null;
  return { month, year };
}

// Ngày: "dd/mm/yyyy" | "yyyy-mm-dd" | Date | serial Excel → khoá "yyyy-mm-dd" hoặc null.
export function parseVNDateKey(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date)
    return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d && d.y) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`;
    return null;
  }
  const s = String(v).trim();
  // dd/mm/yyyy hoặc dd/mm/yy — LUÔN hiểu số ĐẦU là NGÀY (chuẩn VN). Excel hiển thị
  // đúng thứ tự người dùng gõ, nên đọc theo dd/mm khôi phục đúng ý (kể cả file bị
  // Excel diễn giải sang tháng/ngày kiểu Mỹ).
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000; // "26" → 2026
    return `${String(y).padStart(4, "0")}-${pad2(+m[2])}-${pad2(+m[1])}`;
  }
  m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/); // yyyy-mm-dd
  if (m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  return null;
}

export interface BulkPaymentImportRow {
  excelRow: number; // số dòng thật trong Excel (1-based) để báo lỗi
  stt: string | number;
  tenCty: string;
  mst: string;
  kyRaw: unknown; // giá trị ô Kỳ (chưa parse)
  soTienRaw: unknown; // giá trị ô Số tiền (chưa parse)
  ghiChu: string;
}

export interface BulkPaymentParsed {
  ngayRaw: unknown; // ô "Ngày" (chưa parse)
  nguoiNhap: string; // ô "Nhân viên"
  rows: BulkPaymentImportRow[];
}

/** Đọc file phiếu thu (1 file = 1 phiếu). Trả metadata phiếu + các dòng công ty (thô). */
export async function parseBulkPaymentFile(file: File): Promise<BulkPaymentParsed> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          blankrows: false,
          defval: "",
        });

        const low = (v: unknown) => String(v ?? "").trim().toLowerCase();

        // Đọc CHUỖI HIỂN THỊ (.w) của 1 ô — giữ đúng thứ tự ngày/tháng người dùng gõ,
        // tránh lấy serial (Excel có thể đã diễn giải sang tháng/ngày kiểu Mỹ).
        const cellText = (r: number, c: number): string => {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell) return "";
          return cell.w != null ? String(cell.w) : String(cell.v ?? "");
        };

        let ngayRaw: unknown = "";
        let nguoiNhap = "";
        let headerRowIdx = -1;

        for (let i = 0; i < aoa.length; i++) {
          const row = aoa[i] ?? [];
          const label = low(row[0]);
          // Ô Ngày: ưu tiên chuỗi hiển thị (.w) rồi parse theo dd/mm.
          if (label === "ngày" || label === "ngay") ngayRaw = cellText(i, 1) || (row[1] ?? "");
          else if (
            label === "nhân viên" || label === "nhan vien" ||
            label === "người nhập" || label === "nguoi nhap"
          )
            nguoiNhap = String(row[1] ?? "").trim();
          if (headerRowIdx === -1) {
            const cells = row.map(low);
            if (cells.includes("mst") || cells.includes("mã số thuế"))
              headerRowIdx = i;
          }
        }

        if (headerRowIdx === -1)
          throw new Error(
            "Không tìm thấy hàng tiêu đề (cần có cột MST / Mã số thuế).",
          );

        const header = (aoa[headerRowIdx] ?? []).map(low);
        const findCol = (aliases: string[]) =>
          header.findIndex((h) => aliases.includes(h));
        const cStt = findCol(["stt"]);
        const cTen = findCol(["tên công ty", "ten cong ty", "tên cty", "tên dn"]);
        const cMst = findCol(["mst", "mã số thuế", "ma so thue"]);
        const cKy = header.findIndex((h) => h.startsWith("kỳ") || h.startsWith("ky"));
        const cTien = findCol([
          "số tiền", "so tien", "tiền thu", "số tiền thu", "so tien thu",
        ]);
        const cGhiChu = findCol(["ghi chú", "ghi chu"]);

        const rows: BulkPaymentImportRow[] = [];
        for (let i = headerRowIdx + 1; i < aoa.length; i++) {
          const row = aoa[i] ?? [];
          const isTotal = row.some((c) => low(c).includes("tổng cộng") || low(c).includes("tong cong"));
          if (isTotal) break;
          const mst = String(cMst >= 0 ? row[cMst] ?? "" : "").trim();
          if (!mst) continue; // bỏ dòng trống
          rows.push({
            excelRow: i + 1,
            stt: cStt >= 0 ? (row[cStt] as string | number) : "",
            tenCty: String(cTen >= 0 ? row[cTen] ?? "" : "").trim(),
            mst,
            kyRaw: cKy >= 0 ? row[cKy] : "",
            soTienRaw: cTien >= 0 ? row[cTien] : "",
            ghiChu: String(cGhiChu >= 0 ? row[cGhiChu] ?? "" : "").trim(),
          });
        }

        resolve({ ngayRaw, nguoiNhap, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** Tải file Excel MẪU để khách điền (đúng bố cục maunhap.xlsx) rồi import lại. */
export function exportBulkPaymentTemplate() {
  const aoa: unknown[][] = [
    ["Ngày", "20/03/2026"],
    ["Nhân viên", "Nguyễn Văn A"],
    ["STT", "Tên công ty", "MST", "Kỳ (T/Q)", "Số tiền", "Ghi chú"],
    [1, "(ví dụ) Công ty A", "0312345678", "02/2026", 2000000, ""],
    [2, "(ví dụ) Công ty B", "0312345679", "02/2026", 2000000, ""],
    ["", "", "", "TỔNG CỘNG", { t: "n", f: "SUM(E4:E1000)" }, ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 6 }, { wch: 32 }, { wch: 16 }, { wch: 12 }, { wch: 15 }, { wch: 28 },
  ];
  // Cột "Số tiền" (index 4) hiển thị số có dấu chấm ngăn cách.
  applyMoneyFormat(ws, [4], 3);

  // Sheet hướng dẫn tách riêng để không lẫn vào dữ liệu khi import.
  const huongDan = XLSX.utils.aoa_to_sheet([
    ["HƯỚNG DẪN NHẬP PHIẾU THU"],
    [""],
    ["1 file = 1 phiếu thu (gồm nhiều công ty)."],
    ["• Ngày (hàng 1): ngày thu của phiếu, ghi dd/mm/yyyy (vd 20/03/2026)."],
    ["• Nhân viên (hàng 2): tên người nhập — phải KHỚP tên nhân viên đã có trong phần mềm."],
    ["• Mỗi dòng là 1 công ty. Khớp công ty theo MST (Mã số thuế) — MST phải có sẵn."],
    ["• Kỳ (T/Q): ghi MM/YYYY cho THÁNG (vd 02/2026 = tháng 2 năm 2026)."],
    ["    Quý: ghi Q1/2026 .. Q4/2026 (Q1→tháng 3, Q2→6, Q3→9, Q4→12)."],
    ["• Số tiền: để TRỐNG thì tự lấy Phí dịch vụ của công ty; điền số thì dùng số đó."],
    ["• Dòng TỔNG CỘNG chỉ để tham khảo, hệ thống sẽ bỏ qua khi import."],
  ]);
  huongDan["!cols"] = [{ wch: 90 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Phiếu thu");
  XLSX.utils.book_append_sheet(wb, huongDan, "Hướng dẫn");
  XLSX.writeFile(wb, "Mau_nhap_phieu_thu.xlsx");
}

