import { useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  GetRowIdParams,
  CellValueChangedEvent,
} from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { Company, CompanyEmployee, Employee } from "../../generated/client";
import { Search, Download } from "lucide-react";
import { exportTienThuPivot, exportTienThuList } from "../utils/excelUtils";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
  CELL_RENDERERS,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";
import { toast } from "@/components/Toast";
import { localDateToNoonIso, formatDateVN } from "@/utils/helper";

// Flattened payment data with company info
interface PaymentRecord {
  id: number;
  companyId: number;
  companyName: string;
  taxId: string;
  serviceFee: number | null;
  month: number;
  year: number;
  amount: number | null;
  collectionDate: Date | null;
  note: string | null;
}

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

interface CellRendererParams {
  data: PaymentRecord;
  value?: string | number | null;
}

const QuanLyTienThu = () => {
  const queryClient = useQueryClient();
  const { data: companyList, isLoading, error } = useQuery(
    trpc.companiesWithPayments.queryOptions()
  );

  const updatePayment = useMutation(trpc.updatePayment.mutationOptions());

  const gridRef = useRef<AgGridReact<PaymentRecord>>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());


  // Flatten payment data with company info
  const paymentRecords = useMemo(() => {
    if (!companyList) return [];

    const records: PaymentRecord[] = [];
    companyList.forEach((company) => {
      company.payments.forEach((payment) => {
        records.push({
          id: payment.id,
          companyId: company.id,
          companyName: company.companyName,
          taxId: company.taxId,
          serviceFee: company.serviceFee,
          month: payment.month,
          year: payment.year,
          amount: payment.amount,
          collectionDate: payment.collectionDate,
          note: payment.note,
        });
      });
    });
    return records.sort(
      (a, b) => b.year - a.year || b.month - a.month || a.companyName.localeCompare(b.companyName)
    );
  }, [companyList]);

  // Calculate statistics
  const stats = useMemo(() => {
    const filtered = paymentRecords.filter((record) => {
      if (filterMonth !== "" && record.month !== filterMonth) return false;
      if (record.year !== filterYear) return false;
      
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (
          record.companyName.toLowerCase().includes(q) ||
          record.taxId.toLowerCase().includes(q) ||
          (record.note && record.note.toLowerCase().includes(q))
        );
      }
      
      return true;
    });

    const totalAmount = filtered.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const uniqueCompanies = new Set(filtered.map((r) => r.companyId)).size;
    const totalRecords = filtered.length;

    return {
      totalAmount,
      uniqueCompanies,
      totalRecords,
      filteredRecords: filtered,
    };
  }, [paymentRecords, filterMonth, filterYear, searchText]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [["companiesWithPayments"]] });

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<PaymentRecord>,
  ) => {
    const { data, colDef, newValue, oldValue } = event;
    const field = colDef.field;

    let label = "";
    try {
      if (field === "amount") {
        const amount =
          newValue === null || newValue === undefined || newValue === ""
            ? null
            : Number(newValue);
        if (Number.isNaN(amount as number)) return;
        if (amount === oldValue) return;
        label = "số tiền thu";
        await updatePayment.mutateAsync({ id: data.id, data: { amount } });
      } else if (field === "collectionDate") {
        // Chuẩn hoá về mốc 12:00 UTC để tránh lệch ngày do múi giờ trên máy khác
        let iso: string | null = null;
        if (newValue) {
          iso = localDateToNoonIso(new Date(newValue));
        }
        const oldIso = oldValue ? new Date(oldValue).toISOString() : null;
        if (iso === oldIso) return;
        label = "ngày thu";
        await updatePayment.mutateAsync({
          id: data.id,
          data: { collectionDate: iso },
        });
      } else {
        return;
      }
      await invalidate();
      toast.success(`Đã cập nhật ${label} của ${data.companyName}`);
    } catch (err) {
      console.error("updatePayment error:", err);
      toast.error(`Cập nhật ${label || "phiếu"} thất bại. Vui lòng thử lại.`);
      // Khôi phục dữ liệu hiển thị nếu lưu thất bại
      await invalidate();
    }
  };

  const columnDefs: ColDef<PaymentRecord>[] = useMemo(
    () => [
      {
        headerName: "STT",
        valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
        sortable: false,
        filter: false,
        width: 60,
        pinned: "left",
        cellClass: "text-center font-semibold",
      },
      {
        field: "companyName",
        headerName: "Tên Công Ty",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: CellRendererParams) => params.value || "-",
        pinned: "left",
      },
      {
        field: "taxId",
        headerName: "Mã Số Thuế",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: CellRendererParams) => params.value || "-",
        width: 140,
      },
      {
        headerName: "Tháng",
        valueGetter: (params) => {
          if (!params.data) return "-";
          return MONTH_NAMES[params.data.month - 1];
        },
        sortable: true,
        filter: "agTextColumnFilter",
        width: 100,
      },
      {
        field: "year",
        headerName: "Năm",
        sortable: true,
        filter: "agNumberColumnFilter",
        width: 100,
      },
      {
        field: "serviceFee",
        headerName: "Phí Dịch Vụ",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: CELL_RENDERERS.currency,
        width: 140,
      },
      {
        field: "amount",
        headerName: "Số Tiền Thu",
        sortable: true,
        filter: "agNumberColumnFilter",
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0 },
        cellRenderer: (params: CellRendererParams) => {
          if (params.data === undefined) return "-";
          const value = params.data.amount as number | null;
          if (value === null) return "-";
          return (value ?? 0).toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          });
        },
        width: 140,
      },
      {
        field: "collectionDate",
        headerName: "Thời Gian Thu",
        sortable: true,
        filter: "agDateColumnFilter",
        editable: true,
        cellEditor: "agDateCellEditor",
        valueGetter: (params) =>
          params.data?.collectionDate
            ? new Date(params.data.collectionDate)
            : null,
        cellRenderer: (params: CellRendererParams) => {
          if (!params.value) return "-";
          return formatDateVN(params.value as string | Date);
        },
        width: 140,
      },
      {
        field: "note",
        headerName: "Ghi Chú",
        sortable: false,
        filter: "agTextColumnFilter",
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
    ],
    []
  );

  const getRowId = (params: GetRowIdParams<PaymentRecord>) =>
    String(params.data.id);

  if (isLoading) {
    return (
      <LoadingState
        title="Quản Lý Tiền Thu"
        subtitle="Thống kê tiền thu từ các công ty"
        message="Đang tải dữ liệu..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Tiền Thu</h1>
          <p className="text-gray-600 mt-2">Thống kê tiền thu từ các công ty</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500 text-lg">
            Lỗi khi tải dữ liệu: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0">
      {/* Header Section */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản Lý Tiền Thu</h1>
            <p className="text-gray-600 mt-1">Thống kê tiền thu từ các công ty</p>
          </div>

          {/* Filters + Action Buttons */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search Group */}
            <div className="relative w-96">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search size={20} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Tìm nhanh tên công ty, mã số thuế..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 bg-white text-gray-900 placeholder-gray-400 transition-all shadow-sm"
                tabIndex={0}
                aria-label="Tìm kiếm công ty"
              />
            </div>

            {/* Spacer to push filters far away */}
            <div className="flex-1 min-w-[40px]" />

            {/* Filter Group */}
            <div className="flex items-center gap-5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Bộ lọc thời gian</span>
              
              <div className="flex items-center bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:border-gray-300 transition-all">
                {/* Month Filter */}
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="pl-5 pr-3 py-2 text-sm font-black text-gray-700 bg-transparent focus:outline-none cursor-pointer border-r border-gray-100 hover:text-blue-600 transition-colors appearance-none"
                >
                  <option value="">Tất cả các tháng</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Year Filter */}
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
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="flex-1" />

            {/* Export Buttons Group */}
            <div className="flex items-center gap-3">
              {/* Export Pivot (Yearly Summary) */}
              <button
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 text-sm font-bold text-white transition-all shadow-md shadow-blue-100"
                onClick={() => {
                  if (companyList) {
                    exportTienThuPivot(companyList, filterYear, searchText);
                  }
                }}
                title="Xuất bảng kê tổng hợp năm (Pivot)"
              >
                <Download size={18} />
                <span>Bảng kê năm</span>
              </button>

              {/* Export List (Current detail) */}
              <button
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm font-bold transition-all shadow-sm"
                onClick={() => {
                  if (stats.filteredRecords.length > 0) {
                    exportTienThuList(stats.filteredRecords, filterMonth as number | "", filterYear);
                  }
                }}
                title="Xuất danh sách chi tiết các công ty đã thu"
              >
                <Download size={18} />
                <span>Danh sách thu</span>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            <div className="bg-gradient-to-br from-white to-green-50/30 rounded-3xl p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-green-100 group">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 group-hover:text-green-600 transition-colors">Tổng Tiền Thu</p>
              <p className="text-4xl font-black text-green-600 tracking-tight">
                {(stats.totalAmount ?? 0).toLocaleString("vi-VN", {
                  style: "currency",
                  currency: "VND",
                })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-blue-100 group">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-3 group-hover:text-blue-600 transition-colors">Số Công Ty</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-blue-600 tracking-tight">{stats.totalRecords}</p>
                <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Đơn vị</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div
        className="w-auto h-[calc(100vh-380px)]"
        tabIndex={0}
        aria-label="Bảng tiền thu"
      >
        <AgGridReact
          ref={gridRef}
          getRowId={getRowId}
          rowData={stats.filteredRecords}
          columnDefs={columnDefs}
          defaultColDef={DEFAULT_COL_DEF}
          autoSizeStrategy={AUTO_SIZE_STRATEGY}
          quickFilterText={searchText}
          onCellValueChanged={handleCellValueChanged}
          {...DEFAULT_GRID_OPTIONS}
        />
      </div>

    </div>
  );
};

export default QuanLyTienThu;
