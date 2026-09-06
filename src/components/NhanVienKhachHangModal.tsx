import { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { Employee, CompanyEmployee, Company } from "../../generated/client";
import { AG_GRID_LOCALE_VN } from "@ag-grid-community/locale";
import { CELL_RENDERERS } from "../utils/gridConfig";
import { confirmDialog } from "./ConfirmDialog";
import { exportNhanVienChiTiet } from "../utils/excelUtils";
import { toast } from "./Toast";
import { Download } from "lucide-react";

type EmployeeWithAssignments = Employee & {
  companyAssignments: (CompanyEmployee & { company: Company })[];
};

interface NhanVienKhachHangModalProps {
  employee: EmployeeWithAssignments | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

// 1 dòng = 1 công ty NV phụ trách (cho kỳ đang chọn)
interface FeeRow {
  companyId: number;
  taxId: string;
  companyName: string;
  serviceFee: number | null;
  daThu: number; // phí đã thu của công ty trong kỳ
  daThuStatus: boolean; // công ty ĐÃ được thu trong kỳ (bởi bất kỳ ai) → tính cho mọi NV phụ trách
  months: (number | null)[]; // 12 tháng của năm: null = chưa thu (ô trống)
  yearTotal: number; // tổng 12 tháng
  dvkh: boolean;
  lapSo: boolean;
  nsl: boolean;
}

const money = (v: number) =>
  v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const moneyPlain = (v: number) => v.toLocaleString("vi-VN");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tickRenderer = (p: any) => {
  if (p.node?.rowPinned) return "";
  return p.value ? <span className="text-green-600 font-bold text-base">✓</span> : "";
};

// Ô 1 tháng (bảng kê năm): số > 0 → hiện; null/0 → để TRỐNG
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const monthCellRenderer = (p: any) => {
  const n = typeof p.value === "number" ? p.value : 0;
  return n > 0 ? <span className="tabular-nums">{moneyPlain(n)}</span> : "";
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yearTotalRenderer = (p: any) => {
  const n = typeof p.value === "number" ? p.value : 0;
  return (
    <span className="font-bold text-green-700 tabular-nums">
      {n > 0 ? moneyPlain(n) : ""}
    </span>
  );
};

const NhanVienKhachHangModal: React.FC<NhanVienKhachHangModalProps> = ({
  employee,
  isOpen,
  onClose,
  onDelete,
}) => {
  const now = new Date();
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | "all">(now.getMonth() + 1);
  const deleteEmployee = useMutation(trpc.deleteEmployee.mutationOptions());

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 1 nguồn dữ liệu: toàn bộ công ty kèm phân công + phiếu thu
  const { data: companyList, isLoading } = useQuery({
    ...trpc.companiesWithPayments.queryOptions(),
    enabled: isOpen,
  });

  const empId = employee?.id ?? -1;

  // Các công ty mà NV này phụ trách (bất kỳ vai trò nào), kèm phí đã thu theo kỳ
  const rows = useMemo<FeeRow[]>(() => {
    if (!companyList) return [];
    const out: FeeRow[] = [];
    for (const c of companyList) {
      const mine = (c.employeeAssignments ?? []).filter(
        (a) => a.employeeId === empId,
      );
      if (mine.length === 0) continue;
      const roles = new Set(mine.map((a) => a.role));
      // 12 tháng của năm: có phiếu → amount ?? 0; không → null (ô trống)
      const months: (number | null)[] = [];
      let yearTotal = 0;
      for (let m = 1; m <= 12; m++) {
        const pay = c.payments.find((p) => p.month === m && p.year === filterYear);
        if (pay) {
          const v = pay.amount ?? 0;
          months.push(v);
          yearTotal += v;
        } else {
          months.push(null);
        }
      }
      // Đã thu = công ty CÓ phiếu thu trong kỳ (bất kỳ ai thu) → vẫn tính cho NV chỉ
      // làm Lập Sổ / Nhập Số Liệu. Số tiền = tiền trên phiếu (null → 0).
      const periodPayments =
        filterMonth === "all"
          ? c.payments.filter((p) => p.year === filterYear)
          : c.payments.filter(
              (p) => p.month === filterMonth && p.year === filterYear,
            );
      const daThu = periodPayments.reduce((s, p) => s + (p.amount ?? 0), 0);
      out.push({
        companyId: c.id,
        taxId: c.taxId,
        companyName: c.companyName,
        serviceFee: c.serviceFee,
        daThu,
        daThuStatus: periodPayments.length > 0,
        months,
        yearTotal,
        dvkh: roles.has("DICH_VU_KH"),
        lapSo: roles.has("LAP_SO"),
        nsl: roles.has("NHAP_SO_LIEU"),
      });
    }
    out.sort((a, b) => a.companyName.localeCompare(b.companyName, "vi"));
    return out;
  }, [companyList, empId, filterMonth, filterYear]);

  const summary = useMemo(
    () => ({
      companies: rows.length,
      dvkh: rows.filter((r) => r.dvkh).length,
      lapSo: rows.filter((r) => r.lapSo).length,
      nsl: rows.filter((r) => r.nsl).length,
      daThuCount: rows.filter((r) => r.daThuStatus).length,
      totalFee: rows.reduce((s, r) => s + (r.serviceFee ?? 0), 0),
      totalDaThu: rows.reduce((s, r) => s + r.daThu, 0),
    }),
    [rows],
  );

  // Dòng TỔNG CỘNG ghim đáy bảng (kèm tổng 12 tháng cho chế độ cả năm)
  const pinnedBottomRowData = useMemo<FeeRow[]>(() => {
    const monthSums = Array(12).fill(0);
    let yearTotal = 0;
    for (const r of rows) {
      r.months.forEach((v, i) => {
        if (typeof v === "number") monthSums[i] += v;
      });
      yearTotal += r.yearTotal;
    }
    return [
      {
        companyId: -1,
        taxId: "",
        companyName: "TỔNG CỘNG",
        serviceFee: summary.totalFee,
        daThu: summary.totalDaThu,
        daThuStatus: false,
        months: monthSums,
        yearTotal,
        dvkh: false,
        lapSo: false,
        nsl: false,
      },
    ];
  }, [rows, summary]);

  const columnDefs: ColDef<FeeRow>[] = useMemo(() => {
    const yearMode = filterMonth === "all";

    const name: ColDef<FeeRow> = {
      field: "companyName",
      headerName: "Tên Công Ty",
      sortable: true,
      filter: "agTextColumnFilter",
      minWidth: 220,
      ...(yearMode ? { pinned: "left" as const, width: 240 } : { flex: 1 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cellRenderer: (p: any) =>
        p.node?.rowPinned ? (
          <span className="font-extrabold">{p.value}</span>
        ) : (
          p.value || "-"
        ),
    };
    const mst: ColDef<FeeRow> = {
      field: "taxId",
      headerName: "Mã Số Thuế",
      sortable: true,
      filter: "agTextColumnFilter",
      width: 140,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cellRenderer: (p: any) => p.value || (p.node?.rowPinned ? "" : "-"),
    };
    const fee: ColDef<FeeRow> = {
      field: "serviceFee",
      headerName: "Phí DV",
      sortable: true,
      filter: "agNumberColumnFilter",
      width: 130,
      cellRenderer: CELL_RENDERERS.currency,
    };
    // 3 cột công việc — chỉ tick ✓
    const tickCol = (
      field: "dvkh" | "lapSo" | "nsl",
      header: string,
      width: number,
    ): ColDef<FeeRow> => ({
      field,
      headerName: header,
      width,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      headerClass: "ag-center-header",
      cellStyle: { justifyContent: "center" },
      cellRenderer: tickRenderer,
    });
    const dvkh = tickCol("dvkh", "DVKH", 90);
    const lapSo = tickCol("lapSo", "Lập Sổ", 90);
    const nsl = tickCol("nsl", "Nhập Số Liệu", 120);

    // ── CẢ NĂM: 12 cột T1…T12 + Tổng (giống bảng kê năm) ──
    if (yearMode) {
      const monthCols: ColDef<FeeRow>[] = Array.from({ length: 12 }, (_, mi) => ({
        colId: `m${mi}`,
        headerName: `T${mi + 1}`,
        valueGetter: (p) => p.data?.months?.[mi] ?? null,
        cellRenderer: monthCellRenderer,
        cellStyle: { justifyContent: "flex-end" },
        width: 92,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
      }));
      const totalCol: ColDef<FeeRow> = {
        field: "yearTotal",
        headerName: "Tổng",
        cellRenderer: yearTotalRenderer,
        cellStyle: { justifyContent: "flex-end" },
        width: 130,
        sortable: true,
        filter: false,
        suppressHeaderMenuButton: true,
      };
      return [name, mst, fee, dvkh, lapSo, nsl, ...monthCols, totalCol];
    }

    // ── THÁNG (giữ nguyên) ──
    const daThuCol: ColDef<FeeRow> = {
      field: "daThu",
      headerName: "Đã Thu",
      sortable: true,
      filter: "agNumberColumnFilter",
      width: 140,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cellRenderer: (p: any) => {
        const v = (p.value as number) ?? 0;
        return v > 0 ? (
          <span className="font-semibold text-green-700">{money(v)}</span>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    };
    const status: ColDef<FeeRow> = {
      field: "daThuStatus",
      headerName: "Trạng Thái",
      width: 120,
      sortable: true,
      filter: false,
      suppressHeaderMenuButton: true,
      cellStyle: { justifyContent: "center" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cellRenderer: (p: any) => {
        if (p.node?.rowPinned) return "";
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              p.value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {p.value ? "Đã thu" : "Chưa thu"}
          </span>
        );
      },
    };
    return [name, mst, fee, daThuCol, status, dvkh, lapSo, nsl];
  }, [filterMonth]);

  const defaultColDef = useMemo(
    () => ({ resizable: true, sortable: true, filter: true }),
    [],
  );

  const handleDelete = useCallback(async () => {
    if (!employee) return;
    if (!(await confirmDialog("Bạn có chắc chắn muốn xoá nhân viên này?", { title: "Xóa nhân viên" }))) return;
    await deleteEmployee.mutateAsync({ id: employee.id });
    onDelete?.();
    onClose();
  }, [employee, deleteEmployee, onDelete, onClose]);

  if (!isOpen) return null;

  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Công Ty Phụ Trách — {employee?.fullName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Đóng modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Bộ lọc kỳ + tóm tắt */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 space-y-3">
          {/* Hàng 1: chọn kỳ */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-base font-bold text-gray-700">Kỳ xem:</span>
            <select
              value={filterMonth === "all" ? "all" : String(filterMonth)}
              onChange={(e) =>
                setFilterMonth(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              aria-label="Chọn tháng"
              className="px-3 py-2 border border-gray-300 rounded-lg text-base font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Cả năm</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              aria-label="Chọn năm"
              className="px-3 py-2 border border-gray-300 rounded-lg text-base font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          {/* Hàng 2: tóm tắt — số liệu cỡ LỚN, dạng thẻ cho dễ nhìn */}
          <div className="flex items-stretch gap-3 flex-wrap">
            <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{summary.companies}</span>
              <span className="text-sm font-semibold text-gray-500">công ty</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center gap-4">
              <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-500">DVKH</span>
                <span className="text-2xl font-black text-blue-700">{summary.dvkh}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-500">Lập Sổ</span>
                <span className="text-2xl font-black text-blue-700">{summary.lapSo}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-500">Nhập SL</span>
                <span className="text-2xl font-black text-blue-700">{summary.nsl}</span>
              </span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-green-50 border border-green-200 shadow-sm flex items-center gap-3">
              <span className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-600">Đã thu</span>
                <span className="text-2xl font-black text-green-700">{summary.daThuCount}</span>
                <span className="text-base font-bold text-gray-400">/{summary.companies}</span>
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-2xl font-black text-green-700">{money(summary.totalDaThu)}</span>
            </div>
          </div>
        </div>

        {/* Bảng */}
        <div className="flex-1 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                <div className="text-lg text-gray-600">Đang tải dữ liệu...</div>
              </div>
            </div>
          ) : rows.length > 0 ? (
            <div className="w-full h-full">
              <AgGridReact
                key={filterMonth === "all" ? "year" : "month"}
                rowData={rows}
                pinnedBottomRowData={pinnedBottomRowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={false}
                animateRows={true}
                suppressMenuHide={true}
                localeText={AG_GRID_LOCALE_VN}
                rowHeight={40}
                headerHeight={45}
                allowContextMenuWithControlKey={true}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">
                  Nhân viên này chưa phụ trách công ty nào
                </div>
                <p className="text-gray-400">
                  Hãy phân công công ty cho nhân viên ở trang Công Ty
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={() => {
              if (!companyList || rows.length === 0) {
                toast.error("Nhân viên này chưa phụ trách công ty nào");
                return;
              }
              exportNhanVienChiTiet(companyList, [employee], filterMonth, filterYear);
              toast.success(
                `Đã xuất Excel: ${employee?.fullName} (${
                  filterMonth === "all" ? `cả năm ${filterYear}` : `T${filterMonth}/${filterYear}`
                })`,
              );
            }}
            className="mr-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold focus:outline-none"
            title="Xuất Excel riêng nhân viên này (theo kỳ đang xem)"
          >
            <Download size={16} />
            Xuất NV này
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteEmployee.isPending}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm focus:outline-none disabled:opacity-50"
          >
            {deleteEmployee.isPending ? "Đang xoá..." : "Xoá"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm focus:outline-none"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default NhanVienKhachHangModal;
