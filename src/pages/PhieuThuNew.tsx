import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  CellClickedEvent,
  CellValueChangedEvent,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import { formatCurrencyVND } from "@/utils/helper";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
} from "@/utils/gridConfig";
import LoadingState from "@/components/LoadingState";
import PhieuThuModal from "@/components/PhieuThuModal";

interface MonthlyPaymentData {
  khachHangId: number;
  tenKhachHang: string;
  phiDichVu: number;
  monthlyData: Record<number, number>; // Dynamic months data
  tongThu: number;
}

const PhieuThuNew = () => {
  const now = new Date();
  const [selectedKhachHangId, setSelectedKhachHangId] = useState<number | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [displayYear, setDisplayYear] = useState(now.getFullYear()); // Year for the main display
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1

  // Generate month range array - show all 12 months for non-current years, only up to current month for current year
  const monthRange = useMemo(() => {
    const maxMonth = displayYear === currentYear ? currentMonth : 12;
    return Array.from({ length: maxMonth }, (_, i) => i + 1);
  }, [displayYear, currentYear, currentMonth]);

  // Generate year options (e.g., last 5 years and next 2 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 2; year++) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  // Add mutation for updating customer data
  const updateKhachHang = useMutation(trpc.updateKhachHang.mutationOptions());

  const {
    data: phieuThuList,
    isLoading: phieuThuLoading,
    error: phieuThuError,
  } = useQuery(trpc.phieuThu.queryOptions());

  const { data: khachHangList } = useQuery(
    trpc.danhMucKhachHang.queryOptions()
  );

  // Process data to create monthly payment summary
  const monthlyPaymentData = useMemo((): MonthlyPaymentData[] => {
    if (!phieuThuList || !khachHangList) return [];

    // Get unique customer IDs from PhieuThu
    const customerIdsWithData = new Set(
      phieuThuList.map((pt) => pt.khachHangId)
    );

    // Filter customers to only include those with PhieuThu data
    const filteredKhachHang = khachHangList.filter((kh) =>
      customerIdsWithData.has(kh.id)
    );

    return filteredKhachHang.map((khachHang) => {
      const khachHangPhieuThu = phieuThuList.filter(
        (pt) =>
          pt.khachHangId === khachHang.id &&
          pt.ngayThu &&
          new Date(pt.ngayThu).getFullYear() === displayYear
      );

      // Initialize monthly totals using reduce
      const monthlyData = monthRange.reduce((acc, month) => {
        acc[month] = 0;
        return acc;
      }, {} as Record<number, number>);

      // Calculate monthly totals
      khachHangPhieuThu.forEach((pt) => {
        if (pt.ngayThu && pt.soTien) {
          const month = new Date(pt.ngayThu).getMonth() + 1;
          const maxMonth = displayYear === currentYear ? currentMonth : 12;
          if (month <= maxMonth) {
            monthlyData[month] += pt.soTien;
          }
        }
      });

      const tongThu = Object.values(monthlyData).reduce(
        (sum, amount) => sum + amount,
        0
      );

      return {
        khachHangId: khachHang.id,
        tenKhachHang: khachHang.tenKhachHang,
        phiDichVu: khachHang.phiDichVu || 0,
        monthlyData,
        tongThu,
      };
    });
  }, [
    phieuThuList,
    khachHangList,
    displayYear,
    monthRange,
    currentYear,
    currentMonth,
  ]);

  const handleMonthCellClick = useCallback(
    (event: CellClickedEvent<MonthlyPaymentData>) => {
      const { data, colDef, node } = event;

      if (data && colDef.headerName) {
        // Don't handle clicks on grand total row
        if (node?.rowPinned === "bottom") {
          return;
        }

        const monthMatch = colDef.headerName.match(/Tháng (\d+)/);
        if (monthMatch) {
          const clickedMonth = parseInt(monthMatch[1]);
          const value = data.monthlyData[clickedMonth];

          // Only handle click if there's a value > 0
          if (value > 0) {
            setSelectedMonth(clickedMonth);
            setSelectedYear(displayYear);
            setSelectedKhachHangId(data.khachHangId);
            setIsModalOpen(true);
          }
        }
      }
    },
    [displayYear]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedKhachHangId(null);
  }, []);

  const handleCellValueChanged = useCallback(
    async (event: CellValueChangedEvent<MonthlyPaymentData>) => {
      const { data, colDef, newValue, oldValue, node } = event;

      // Don't allow editing grand total row
      if (node?.rowPinned === "bottom") {
        return;
      }

      if (newValue !== oldValue) {
        const fieldName = colDef.field as keyof MonthlyPaymentData;

        if (fieldName === "phiDichVu") {
          await updateKhachHang.mutateAsync({
            id: data.khachHangId,
            data: {
              phiDichVu: newValue,
            },
          });
          // Could add success notification here
        }
      }
    },
    [updateKhachHang]
  );

  // Create month cell renderer
  const createMonthCellRenderer = useCallback((month: number) => {
    return (params: ICellRendererParams) => {
      const isGrandTotal = params.node?.rowPinned === "bottom";
      const value = params.value || 0;

      if (isGrandTotal) {
        return (
          <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {formatCurrencyVND(value)}
          </span>
        );
      }

      return (
        <span
          className={`px-2 py-1 rounded ${
            value > 0
              ? "cursor-pointer hover:bg-blue-100 text-gray-600"
              : "text-gray-400"
          }`}
          title={
            value > 0
              ? "Click để xem chi tiết phiếu thu"
              : "Không có thu trong tháng này"
          }
        >
          {value > 0 ? formatCurrencyVND(value) : "Không có"}
        </span>
      );
    };
  }, []);

  // Compute totalTongThu once per data change
  const totalTongThu = useMemo(() => {
    return monthlyPaymentData.reduce(
      (sum, item) => sum + (item.tongThu || 0),
      0
    );
  }, [monthlyPaymentData]);

  // Column definitions
  const columnDefs: ColDef<MonthlyPaymentData>[] = useMemo(() => {
    const baseColumns: ColDef<MonthlyPaymentData>[] = [
      {
        field: "tenKhachHang",
        headerName: "Khách Hàng",
        sortable: true,
        filter: "agTextColumnFilter",
        minWidth: 250,
        pinned: "left",
        cellRenderer: (params: ICellRendererParams) => {
          const isGrandTotal = params.node?.rowPinned === "bottom";
          if (isGrandTotal) {
            return <span className="font-bold text-blue-600">TỔNG CỘNG</span>;
          }
          return params.value;
        },
      },
      {
        field: "phiDichVu",
        headerName: "Phí Dịch Vụ",
        sortable: true,
        filter: "agNumberColumnFilter",
        editable: (params) => params.node?.rowPinned !== "bottom",
        cellRenderer: (params: ICellRendererParams) => {
          const isGrandTotal = params.node?.rowPinned === "bottom";
          const value = params.value || 0;

          if (isGrandTotal) {
            return (
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {formatCurrencyVND(value)}
              </span>
            );
          }
          return formatCurrencyVND(params.value as number);
        },
        minWidth: 150,
        aggFunc: "sum",
      },
    ];

    // Generate month columns dynamically
    const monthColumns: ColDef<MonthlyPaymentData>[] = monthRange.map(
      (month) => ({
        headerName: `Tháng ${month}`,
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: createMonthCellRenderer(month),
        onCellClicked: handleMonthCellClick,
        minWidth: 100,
        valueGetter: (params: ValueGetterParams<MonthlyPaymentData>) =>
          params.data?.monthlyData[month] || 0,
        aggFunc: "sum",
      })
    );

    const endColumns: ColDef<MonthlyPaymentData>[] = [
      {
        field: "tongThu",
        headerName: "Tổng Thu",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: ICellRendererParams) => {
          const isGrandTotal = params.node?.rowPinned === "bottom";
          if (isGrandTotal) {
            return (
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {formatCurrencyVND(totalTongThu)}
              </span>
            );
          }
          return (
            <span className="font-medium text-gray-600">
              {formatCurrencyVND(params.value as number)}
            </span>
          );
        },
        minWidth: 130,
        aggFunc: "sum",
      },
    ];

    return [...baseColumns, ...monthColumns, ...endColumns];
  }, [
    handleMonthCellClick,
    monthRange,
    monthlyPaymentData,
    totalTongThu,
    createMonthCellRenderer,
  ]);

  if (phieuThuLoading) {
    return (
      <LoadingState
        title="Thu Phí Dịch Vụ"
        subtitle="Báo cáo thu theo tháng và khách hàng"
        message="Đang tải dữ liệu phiếu thu..."
      />
    );
  }

  if (phieuThuError) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Thu Phí Dịch Vụ</h1>
          <p className="text-gray-600 mt-2">
            Báo cáo thu theo tháng và khách hàng
          </p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500 text-lg">
            Lỗi khi tải dữ liệu: {phieuThuError.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Thu Phí Dịch Vụ
            </h1>
            <p className="text-gray-600 mt-2">
              Báo cáo thu theo tháng và khách hàng
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="year-select"
                className="text-sm font-medium text-gray-700"
              >
                Năm:
              </label>
              <select
                id="year-select"
                value={displayYear}
                onChange={(e) => setDisplayYear(parseInt(e.target.value))}
                className="bg-white text-gray-900 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Báo cáo thu theo tháng ({monthlyPaymentData.length} khách hàng)
          </h2>
        </div>

        {monthlyPaymentData.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                {...DEFAULT_GRID_OPTIONS}
                rowData={monthlyPaymentData}
                columnDefs={columnDefs}
                defaultColDef={DEFAULT_COL_DEF}
                autoSizeStrategy={AUTO_SIZE_STRATEGY}
                onCellValueChanged={handleCellValueChanged}
                grandTotalRow="pinnedBottom"
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu phiếu thu
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có phiếu thu nào được ghi nhận
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <PhieuThuModal
        khachHangId={selectedKhachHangId}
        isOpen={isModalOpen}
        onClose={closeModal}
        year={selectedYear}
        month={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />
    </div>
  );
};

export default PhieuThuNew;
