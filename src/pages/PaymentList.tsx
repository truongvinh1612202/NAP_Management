import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { Payment, Company } from "../../generated/client";
import { Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  CELL_RENDERERS,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";
import { toast } from "@/components/Toast";
import { formatDateVN } from "@/utils/helper";

type PaymentWithCompany = Payment & { company: Company };

interface CellRendererParams {
  data: PaymentWithCompany;
  value?: string | number | null;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

const PaymentList = () => {
  const queryClient = useQueryClient();

  // Filters
  const [filterCompanyId, setFilterCompanyId] = useState<number | undefined>();
  const [filterYear, setFilterYear] = useState<number | undefined>();
  const [filterMonth, setFilterMonth] = useState<number | undefined>();
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);

  // Load filter from localStorage on mount
  useEffect(() => {
    const savedFilter = localStorage.getItem("paymentListFilter");
    if (savedFilter) {
      try {
        const { year, months, primaryMonth } = JSON.parse(savedFilter);
        setFilterYear(year);
        setAvailableMonths(months);
        
        // ƯU TIÊN THÁNG VỪA THAO TÁC:
        // Nếu có primaryMonth (tháng vừa chạm vào ở Modal), chọn ngay tháng đó
        if (primaryMonth !== undefined) {
          setFilterMonth(primaryMonth);
        } else if (months && months.length > 0) {
          setFilterMonth(months[0]);
        }
      } catch (e) {
        console.error("Failed to parse saved filter:", e);
      }
    }
  }, []);
  
  // Keep filterMonth in sync with availableMonths if it's not set
  useEffect(() => {
    if (availableMonths.length > 0 && filterMonth === undefined) {
      setFilterMonth(availableMonths[0]);
    }
  }, [availableMonths, filterMonth]);

  // "Add payment" form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState<number>(0);
  const [newMonth, setNewMonth] = useState<number>(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState<number>(CURRENT_YEAR);
  const [newNote, setNewNote] = useState<string>("");

  const { data: paymentList, isLoading, error } = useQuery(
    trpc.payments.queryOptions({
      companyId: filterCompanyId,
      year: filterYear,
      month: filterMonth,
    }),
  );

  // FRONTEND SAFETY FILTER: 
  // Đảm bảo dữ liệu hiển thị luôn đúng với tháng được chọn, 
  // tránh việc backend trả về nhầm theo ngày thu tiền.
  const displayData = useMemo(() => {
    if (!paymentList) return [];
    if (filterMonth === undefined) return paymentList;
    return paymentList.filter(p => p.month === filterMonth);
  }, [paymentList, filterMonth]);

  const { data: companyList } = useQuery(trpc.companies.queryOptions());

  const updatePayment = useMutation(trpc.updatePayment.mutationOptions());
  const createPayment = useMutation(trpc.createPayment.mutationOptions());
  const deletePayment = useMutation(trpc.deletePayment.mutationOptions());

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [["payments"]] });

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<PaymentWithCompany>,
  ) => {
    const { data, colDef, newValue, oldValue } = event;
    if (newValue === oldValue) return;
    try {
      await updatePayment.mutateAsync({
        id: data.id,
        data: { [colDef.field as keyof Payment]: data[colDef.field as keyof Payment] },
      });
      await invalidate();
      toast.success("Đã cập nhật ghi chú");
    } catch (err) {
      console.error("updatePayment error:", err);
      toast.error("Cập nhật thất bại. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePayment.mutateAsync({ id });
      await invalidate();
      toast.success("Đã xoá thanh toán");
    } catch (err) {
      console.error("deletePayment error:", err);
      toast.error("Xoá thất bại. Vui lòng thử lại.");
    }
  };

  const handleAddPayment = async () => {
    if (!newCompanyId) return;
    try {
      await createPayment.mutateAsync({
        companyId: newCompanyId,
        month: newMonth,
        year: newYear,
        note: newNote || null,
      });
      await invalidate();
      setShowAddForm(false);
      setNewNote("");
      toast.success("Đã thêm thanh toán mới");
    } catch (err) {
      console.error("createPayment error:", err);
      toast.error("Thêm thanh toán thất bại. Vui lòng thử lại.");
    }
  };

  const columnDefs: ColDef<PaymentWithCompany>[] = useMemo(
    () => [
      {
        headerName: "Xóa",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label="Xóa thanh toán"
              onClick={() => handleDelete(params.data.id)}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ),
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        maxWidth: 70,
        pinned: "right",
      },
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        width: 80,
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Công Ty",
        sortable: true,
        filter: "agTextColumnFilter",
        flex: 2,
        valueGetter: (params) => params.data?.company?.companyName ?? "-",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        headerName: "Mã Số Thuế",
        sortable: true,
        filter: "agTextColumnFilter",
        valueGetter: (params) => params.data?.company?.taxId ?? "-",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        headerName: "Phí Dịch Vụ",
        sortable: true,
        filter: "agNumberColumnFilter",
        valueGetter: (params) => params.data?.company?.serviceFee ?? null,
        cellRenderer: CELL_RENDERERS.currency,
      },
      {
        field: "month",
        headerName: "Tháng",
        sortable: true,
        filter: "agNumberColumnFilter",
        width: 100,
        cellRenderer: (params: CellRendererParams) =>
          params.value != null ? `Tháng ${params.value}` : "-",
      },
      {
        field: "year",
        headerName: "Năm",
        sortable: true,
        filter: "agNumberColumnFilter",
        width: 100,
      },
      {
        field: "collectionDate",
        headerName: "Thời Gian Thu Tiền",
        sortable: true,
        filter: false,
        flex: 1,
        cellRenderer: (params: CellRendererParams) => {
          if (!params.value) return "-";
          return formatDateVN(params.value);
        },
      },
      {
        field: "note",
        headerName: "Ghi Chú",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        flex: 1,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <LoadingState
        title="Thanh Toán"
        subtitle="Quản lý thanh toán phí dịch vụ"
        message="Đang tải danh sách thanh toán..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Thanh Toán</h1>
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
      {/* Toolbar */}
      <div className="py-3 px-4 border-b border-gray-200 flex items-center gap-3 flex-wrap shrink-0">
        {/* Company filter */}
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterCompanyId ?? ""}
          onChange={(e) =>
            setFilterCompanyId(e.target.value ? Number(e.target.value) : undefined)
          }
          aria-label="Lọc theo công ty"
        >
          <option value="">Tất cả công ty</option>
          {companyList?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>

        {/* Year filter */}
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterYear ?? ""}
          onChange={(e) =>
            setFilterYear(e.target.value ? Number(e.target.value) : undefined)
          }
          aria-label="Lọc theo năm"
        >
          <option value="">Tất cả năm</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Month filter */}
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterMonth ?? ""}
          onChange={(e) =>
            setFilterMonth(e.target.value ? Number(e.target.value) : undefined)
          }
          aria-label="Lọc theo tháng"
        >
          <option value="">Tất cả tháng</option>
          {(availableMonths.length > 0 ? availableMonths : MONTHS).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500 ml-auto">
          {paymentList?.length ?? 0} bản ghi
        </span>

        {/* Add button */}
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
          onClick={() => setShowAddForm(true)}
          aria-label="Thêm thanh toán mới"
        >
          <Plus size={16} />
          Thêm mới
        </button>
      </div>




      {/* Grid */}
      <div className="flex-1 min-h-0 w-auto">
        <AgGridReact
          rowData={displayData}
          columnDefs={columnDefs}
          defaultColDef={DEFAULT_COL_DEF}
          onCellValueChanged={handleCellValueChanged}
          {...DEFAULT_GRID_OPTIONS}
        />
      </div>

      {/* Add Payment Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thêm Thanh Toán Mới
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Công Ty <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newCompanyId}
                  onChange={(e) => setNewCompanyId(Number(e.target.value))}
                >
                  <option value={0}>-- Chọn công ty --</option>
                  {companyList?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.taxId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tháng
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newMonth}
                    onChange={(e) => setNewMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Năm
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi Chú
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nhập ghi chú (tuỳ chọn)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNote("");
                  setNewCompanyId(0);
                }}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none disabled:opacity-50"
                onClick={handleAddPayment}
                disabled={!newCompanyId || createPayment.isPending}
              >
                {createPayment.isPending ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentList;
