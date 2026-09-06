import { useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import { Search, Download } from "lucide-react";
import { exportPhiDichVu } from "../utils/excelUtils";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
  CELL_RENDERERS,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

// 1 dòng = 1 công ty, cho tháng/năm đang chọn
interface FeeRow {
  companyId: number;
  taxId: string;
  companyName: string;
  serviceFee: number | null;
  daThu: boolean; // (chế độ tháng) đã thu tháng đó chưa
  soTienThu: number; // (chế độ tháng) tiền thu tháng đó
  months: (number | null)[]; // 12 tháng của năm: null = chưa thu (ô trống)
  yearTotal: number; // tổng 12 tháng
  dvkh: string; // NV Dịch Vụ KH phụ trách (join nếu nhiều)
}

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

interface CellParams {
  data?: FeeRow;
  value?: unknown;
  node?: {
    group?: boolean;
    footer?: boolean;
    rowIndex?: number | null;
    rowPinned?: string | null;
  };
}

// Kết quả gộp cột Trạng Thái theo nhóm: đã thu / tổng
interface PaidAgg {
  paid: number;
  total: number;
}

type ViewMode = "all" | "byEmployee";

const moneyVND = (v: number) =>
  v.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const moneyPlain = (v: number) => v.toLocaleString("vi-VN");

// Ô 1 tháng (bảng kê năm): số → hiện; null/0 → để TRỐNG (giống Excel)
const renderMonthCell = (p: CellParams) => {
  const n = typeof p.value === "number" ? p.value : 0;
  return n > 0 ? <span className="tabular-nums">{moneyPlain(n)}</span> : "";
};
// Cột Tổng năm
const renderYearTotal = (p: CellParams) => {
  const n = typeof p.value === "number" ? p.value : 0;
  return (
    <span className="font-bold text-green-700 tabular-nums">
      {n > 0 ? moneyPlain(n) : ""}
    </span>
  );
};

// Cột "Đã Thu": dòng nhóm/tổng → TỔNG; dòng công ty → số tiền (chưa thu = 0)
const renderCollected = (p: CellParams) => {
  if (p.node?.group || p.node?.footer) {
    return (
      <span className="font-bold text-green-700">{moneyVND((p.value as number) ?? 0)}</span>
    );
  }
  if (!p.data?.daThu) return <span className="text-gray-400">0</span>;
  return (
    <span className="font-semibold text-green-700">{moneyVND(p.data.soTienThu ?? 0)}</span>
  );
};

// Cột "Trạng Thái": dòng nhóm/tổng → "x/y đã thu"; dòng công ty → badge
const renderStatus = (p: CellParams) => {
  if (p.node?.group || p.node?.footer) {
    const agg = p.value as PaidAgg | undefined;
    if (!agg || typeof agg !== "object") return null;
    const full = agg.paid === agg.total && agg.total > 0;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-bold ${
          full ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
        }`}
      >
        {agg.paid}/{agg.total} đã thu
      </span>
    );
  }
  const paid = p.data?.daThu;
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${
        paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {paid ? "Đã thu" : "Chưa thu"}
    </span>
  );
};

// Gộp cột Trạng Thái theo nhóm: đếm đã thu / tổng (xử lý cả lá boolean lẫn nhóm con)
const paidAggFunc = (params: { values: unknown[] }): PaidAgg => {
  let paid = 0;
  let total = 0;
  for (const v of params.values) {
    if (v && typeof v === "object") {
      paid += (v as PaidAgg).paid;
      total += (v as PaidAgg).total;
    } else {
      total += 1;
      if (v) paid += 1;
    }
  }
  return { paid, total };
};

const QuanLyPhiDichVu = () => {
  const { data: companyList, isLoading, error } = useQuery(
    trpc.companiesWithPayments.queryOptions(),
  );

  const gridRef = useRef<AgGridReact<FeeRow>>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const isYear = filterMonth === "all";
  // "all" = danh sách tổng (giống sheet Tổng); "byEmployee" = gom theo từng NV
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  // Chế độ "Theo nhân viên": "" = hiện hết; hoặc chọn 1 NV để chỉ xem NV đó
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  // Dựng danh sách TẤT CẢ công ty cho (tháng, năm) đang chọn
  const rows = useMemo<FeeRow[]>(() => {
    if (!companyList) return [];
    return companyList.map((company) => {
      // 12 tháng của năm: có phiếu → amount ?? 0; không → null (ô trống)
      const months: (number | null)[] = [];
      let yearTotal = 0;
      for (let m = 1; m <= 12; m++) {
        const pay = company.payments.find(
          (p) => p.month === m && p.year === filterYear,
        );
        if (pay) {
          const v = pay.amount ?? 0;
          months.push(v);
          yearTotal += v;
        } else {
          months.push(null);
        }
      }
      const monthIdx = typeof filterMonth === "number" ? filterMonth - 1 : -1;
      const monthPaid = monthIdx >= 0 && months[monthIdx] !== null;
      const dvkh = (company.employeeAssignments ?? [])
        .filter((a) => a.role === "DICH_VU_KH")
        .map((a) => a.employee?.fullName)
        .filter(Boolean)
        .join(", ");
      return {
        companyId: company.id,
        taxId: company.taxId,
        companyName: company.companyName,
        serviceFee: company.serviceFee,
        daThu: monthPaid,
        soTienThu: monthPaid ? (months[monthIdx] as number) : 0,
        months,
        yearTotal,
        dvkh: dvkh || "— Chưa phân công —",
      };
    });
  }, [companyList, filterMonth, filterYear]);

  // Danh sách NV Dịch Vụ KH (tách từng tên) để chọn xem ở chế độ "Theo nhân viên"
  const employeeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows)
      for (const n of r.dvkh.split(",").map((s) => s.trim())) if (n) set.add(n);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [rows]);

  // Rows đưa vào lưới: chế độ "Theo nhân viên" + đã chọn 1 NV → chỉ giữ NV đó
  const scopedRows = useMemo(() => {
    if (viewMode !== "byEmployee" || !selectedEmployee) return rows;
    return rows.filter((r) =>
      r.dvkh.split(",").map((s) => s.trim()).includes(selectedEmployee),
    );
  }, [rows, viewMode, selectedEmployee]);

  // Thống kê nhanh (theo phạm vi đang xem + tìm kiếm)
  const stats = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const filtered = q
      ? scopedRows.filter(
          (r) =>
            r.companyName.toLowerCase().includes(q) ||
            r.taxId.toLowerCase().includes(q) ||
            r.dvkh.toLowerCase().includes(q),
        )
      : scopedRows;
    // Cả năm: "đã thu" = có thu ít nhất 1 tháng; tổng = tổng 12 tháng
    const daThu = filtered.filter((r) => (isYear ? r.yearTotal > 0 : r.daThu)).length;
    const totalFee = filtered.reduce((s, r) => s + (r.serviceFee ?? 0), 0);
    const totalCollected = filtered.reduce(
      (s, r) => s + (isYear ? r.yearTotal : r.soTienThu),
      0,
    );
    return {
      total: filtered.length,
      daThu,
      chuaThu: filtered.length - daThu,
      totalFee,
      totalCollected,
    };
  }, [scopedRows, searchText, isYear]);

  const columnDefs: ColDef<FeeRow>[] = useMemo(() => {
    const grouped = viewMode === "byEmployee";

    const mst: ColDef<FeeRow> = {
      field: "taxId",
      headerName: "Mã Số Thuế",
      sortable: true,
      filter: "agTextColumnFilter",
      width: 150,
      cellRenderer: (p: CellParams) =>
        p.node?.rowPinned ? "" : (p.value as string) || "-",
    };
    const name: ColDef<FeeRow> = {
      field: "companyName",
      headerName: "Tên Công Ty",
      sortable: true,
      filter: "agTextColumnFilter",
      pinned: "left",
      minWidth: 240,
      cellRenderer: (p: CellParams) => (p.value as string) || "-",
    };
    const fee: ColDef<FeeRow> = {
      field: "serviceFee",
      headerName: "Phí Dịch Vụ",
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: CELL_RENDERERS.currency,
      width: 150,
      ...(grouped ? { aggFunc: "sum" } : {}),
    };
    const stt: ColDef<FeeRow> = {
      headerName: "STT",
      valueGetter: (p) =>
        (p.node as { rowPinned?: string })?.rowPinned ? "" : (p.node?.rowIndex ?? 0) + 1,
      sortable: false,
      filter: false,
      width: 70,
      pinned: "left",
      cellClass: "text-center font-semibold",
    };
    const dvkh: ColDef<FeeRow> = {
      field: "dvkh",
      headerName: "NV Dịch Vụ KH",
      sortable: true,
      filter: "agTextColumnFilter",
      minWidth: 200,
      cellRenderer: (p: CellParams) =>
        p.node?.rowPinned ? "" : (p.value as string) || "-",
    };

    // ── CHẾ ĐỘ CẢ NĂM: 12 cột T1…T12 + Tổng (giống bảng kê năm) ──
    if (isYear) {
      const monthCols: ColDef<FeeRow>[] = Array.from({ length: 12 }, (_, mi) => ({
        colId: `m${mi}`,
        headerName: `T${mi + 1}`,
        valueGetter: (p) => p.data?.months?.[mi] ?? null,
        cellRenderer: renderMonthCell,
        cellStyle: { justifyContent: "flex-end" },
        width: 96,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        ...(grouped ? { aggFunc: "sum" } : {}),
      }));
      const totalCol: ColDef<FeeRow> = {
        field: "yearTotal",
        headerName: "Tổng",
        cellRenderer: renderYearTotal,
        cellStyle: { justifyContent: "flex-end" },
        width: 130,
        sortable: true,
        filter: false,
        suppressHeaderMenuButton: true,
        ...(grouped ? { aggFunc: "sum" } : {}),
      };
      if (grouped) {
        return [
          name,
          mst,
          fee,
          ...monthCols,
          totalCol,
          { field: "dvkh", headerName: "NV Dịch Vụ KH", rowGroup: true, hide: true },
        ];
      }
      return [stt, name, mst, fee, dvkh, ...monthCols, totalCol];
    }

    // ── CHẾ ĐỘ THÁNG (giữ nguyên) ──
    const collected: ColDef<FeeRow> = {
      field: "soTienThu",
      headerName: "Đã Thu",
      sortable: true,
      filter: "agNumberColumnFilter",
      cellRenderer: renderCollected,
      width: 160,
      ...(grouped ? { aggFunc: "sum" } : {}),
    };
    const status: ColDef<FeeRow> = {
      field: "daThu",
      headerName: "Trạng Thái",
      sortable: true,
      filter: true,
      width: 150,
      cellRenderer: renderStatus,
      ...(grouped ? { aggFunc: paidAggFunc as unknown as string } : {}),
    };
    if (grouped) {
      return [
        name,
        mst,
        fee,
        collected,
        status,
        { field: "dvkh", headerName: "NV Dịch Vụ KH", rowGroup: true, hide: true },
      ];
    }
    return [stt, mst, name, fee, collected, status, dvkh];
  }, [viewMode, isYear]);

  // Dòng TỔNG CỘNG (ghim đáy) cho "Danh sách tổng" + Cả năm
  const pinnedTotal = useMemo<FeeRow[] | undefined>(() => {
    if (!(viewMode === "all" && isYear)) return undefined;
    const monthSums = Array(12).fill(0);
    let feeSum = 0;
    let grand = 0;
    for (const r of scopedRows) {
      feeSum += r.serviceFee ?? 0;
      grand += r.yearTotal;
      r.months.forEach((v, i) => {
        if (typeof v === "number") monthSums[i] += v;
      });
    }
    return [
      {
        companyId: -1,
        taxId: "",
        companyName: "TỔNG CỘNG",
        serviceFee: feeSum,
        daThu: false,
        soTienThu: 0,
        months: monthSums,
        yearTotal: grand,
        dvkh: "",
      },
    ];
  }, [viewMode, isYear, scopedRows]);

  if (isLoading) {
    return (
      <LoadingState
        title="Quản Lý Phí Dịch Vụ"
        subtitle="Rà soát thu phí theo tháng"
        message="Đang tải dữ liệu..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý Phí Dịch Vụ</h1>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500 text-lg">
            Lỗi khi tải dữ liệu: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Quản Lý Phí Dịch Vụ</h1>
            </div>

            {/* Chuyển chế độ xem: Danh sách tổng ↔ Theo từng nhân viên */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {([
                { key: "all", label: "Danh sách tổng" },
                { key: "byEmployee", label: "Theo nhân viên" },
              ] as { key: ViewMode; label: string }[]).map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setViewMode(m.key);
                    setSelectedEmployee(""); // đổi chế độ → xem lại từ đầu (hiện hết)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === m.key
                      ? "bg-blue-600 text-white shadow"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters + Export */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative w-96">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Tìm công ty, MST, nhân viên..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 bg-white text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                aria-label="Tìm kiếm"
              />
            </div>

            <div className="flex-1 min-w-[40px]" />

            {/* Chọn nhân viên (chỉ ở chế độ "Theo nhân viên") — nằm ở cụm bộ lọc bên phải */}
            {viewMode === "byEmployee" && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] whitespace-nowrap">
                  Nhân viên
                </span>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="max-w-[220px] px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-800 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 cursor-pointer shadow-sm hover:border-gray-400"
                  title="Chọn nhân viên để xem"
                  aria-label="Chọn nhân viên"
                >
                  <option value="">Tất cả nhân viên ({employeeOptions.length})</option>
                  {employeeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Month/Year filter */}
            <div className="flex items-center gap-5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                Kỳ rà soát
              </span>
              <div className="flex items-center bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:border-gray-300 transition-all">
                <select
                  value={filterMonth === "all" ? "all" : String(filterMonth)}
                  onChange={(e) =>
                    setFilterMonth(e.target.value === "all" ? "all" : parseInt(e.target.value))
                  }
                  className="pl-5 pr-3 py-2 text-sm font-black text-gray-700 bg-transparent focus:outline-none cursor-pointer border-r border-gray-100 hover:text-blue-600 transition-colors appearance-none"
                >
                  <option value="all">Cả năm</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  className="pl-4 pr-6 py-2 text-sm font-black text-gray-700 bg-transparent focus:outline-none cursor-pointer hover:text-blue-600 transition-colors appearance-none"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(
                    (year) => (
                      <option key={year} value={year}>
                        Năm {year}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="flex-1" />

            {/* Export */}
            <button
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 text-sm font-bold text-white transition-all shadow-md shadow-blue-100"
              onClick={() => {
                if (companyList) exportPhiDichVu(companyList, filterYear);
              }}
              title="Xuất Excel bảng kê năm (12 tháng): sheet tổng + mỗi nhân viên 1 sheet"
            >
              <Download size={18} />
              <span>Xuất Excel</span>
            </button>
          </div>

          {/* Stats — gọn để nhường chỗ cho bảng bên dưới */}
          <div className="flex items-stretch gap-3 flex-wrap">
            <div className="bg-white rounded-xl px-4 py-2 border border-gray-200 shadow-sm flex items-baseline gap-2">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tổng Công Ty</span>
              <span className="text-xl font-black text-gray-800">{stats.total}</span>
            </div>
            <div className="bg-white rounded-xl px-4 py-2 border border-gray-200 shadow-sm flex items-baseline gap-2">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Đã / Chưa Thu</span>
              <span className="text-xl font-black">
                <span className="text-green-600">{stats.daThu}</span>
                <span className="text-gray-300"> / </span>
                <span className="text-red-500">{stats.chuaThu}</span>
              </span>
            </div>
            <div className="bg-white rounded-xl px-4 py-2 border border-gray-200 shadow-sm flex items-baseline gap-2">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tổng Phí DV</span>
              <span className="text-lg font-black text-gray-800">
                {stats.totalFee.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
            </div>
            <div className="bg-white rounded-xl px-4 py-2 border border-gray-200 shadow-sm flex items-baseline gap-2">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tổng Đã Thu</span>
              <span className="text-lg font-black text-green-600">
                {stats.totalCollected.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid — "Danh sách tổng" (phẳng) hoặc "Theo nhân viên" (nhóm gập được) */}
      <div className="flex-1 min-h-0 w-auto" aria-label="Bảng phí dịch vụ">
        <AgGridReact
          key={`${viewMode}-${isYear}`} // đổi chế độ/kỳ → remount lưới (tránh lưu trạng thái cũ)
          ref={gridRef}
          rowData={scopedRows}
          pinnedBottomRowData={pinnedTotal}
          columnDefs={columnDefs}
          defaultColDef={DEFAULT_COL_DEF}
          autoSizeStrategy={AUTO_SIZE_STRATEGY}
          quickFilterText={searchText}
          autoGroupColumnDef={{
            headerName: "NV Dịch Vụ KH",
            minWidth: 280,
            pinned: "left",
            sort: "asc",
            cellRendererParams: { suppressCount: false }, // hiện số công ty mỗi NV
          }}
          groupDefaultExpanded={-1}
          grandTotalRow={viewMode === "byEmployee" ? "bottom" : undefined}
          suppressAggFuncInHeader // bỏ tiền tố "Tổng(...)"/"func(...)" ở tiêu đề cột
          {...DEFAULT_GRID_OPTIONS}
          pagination={false}
        />
      </div>
    </div>
  );
};

export default QuanLyPhiDichVu;
