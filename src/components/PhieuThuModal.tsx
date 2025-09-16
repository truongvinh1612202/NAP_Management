import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import { formatCurrencyVND } from "@/utils/helper";
import { AG_GRID_LOCALE_VN } from "@ag-grid-community/locale";

interface PhieuThuModalProps {
  khachHangId: number | null;
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

const PhieuThuModal: React.FC<PhieuThuModalProps> = ({
  khachHangId,
  isOpen,
  onClose,
  year,
  month,
  onYearChange,
  onMonthChange,
}) => {
  // Fetch customer data using the ID
  const { data: khachHang } = useQuery({
    ...trpc.khachHangById.queryOptions({
      id: khachHangId || 0,
    }),
    enabled: !!khachHangId && isOpen,
  });

  const {
    data: phieuThuList,
    isLoading,
    error,
  } = useQuery({
    ...trpc.phieuThuByKhachHang.queryOptions({
      khachHangId: khachHangId || 0,
    }),
    enabled: !!khachHangId && isOpen,
  });

  // Filter PhieuThu by selected year and month, sorted by date descending
  const filteredPhieuThu = useMemo(() => {
    if (!phieuThuList) return [];

    return phieuThuList.filter((phieu) => {
      if (!phieu.ngayThu) return false;
      const phieuDate = new Date(phieu.ngayThu);
      return (
        phieuDate.getFullYear() === year && phieuDate.getMonth() + 1 === month
      );
    });
  }, [phieuThuList, year, month]);

  // Get available years from data
  const availableYears = useMemo(() => {
    if (!phieuThuList) return [];

    const years = new Set<number>();
    phieuThuList.forEach((phieu) => {
      if (phieu.ngayThu) {
        const date = new Date(phieu.ngayThu);
        years.add(date.getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [phieuThuList]);

  // Get available months for the selected year
  const availableMonths = useMemo(() => {
    if (!phieuThuList) return [];

    const months = new Set<number>();
    phieuThuList.forEach((phieu) => {
      if (phieu.ngayThu) {
        const date = new Date(phieu.ngayThu);
        if (date.getFullYear() === year) {
          months.add(date.getMonth() + 1);
        }
      }
    });

    return Array.from(months).sort((a, b) => a - b);
  }, [phieuThuList, year]);

  // Calculate total amount for selected year and month
  const totalAmount = useMemo(() => {
    return filteredPhieuThu.reduce(
      (sum, phieu) => sum + (phieu.soTien || 0),
      0
    );
  }, [filteredPhieuThu]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        filter: "agNumberColumnFilter",
        minWidth: 80,
      },
      {
        field: "ngayThu",
        headerName: "Ngày Thu",
        sortable: true,
        filter: "agDateColumnFilter",
        cellRenderer: (params: any) => {
          if (!params.value) return "-";
          return new Date(params.value).toLocaleDateString("vi-VN");
        },
        minWidth: 120,
      },
      {
        field: "noiDung",
        headerName: "Nội Dung",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
        minWidth: 200,
      },
      {
        field: "soTien",
        headerName: "Số Tiền",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => formatCurrencyVND(params.value || 0),
        minWidth: 150,
      },
      {
        field: "soCT",
        headerName: "Số CT",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
        minWidth: 120,
      },
      {
        field: "tenNhanVien",
        headerName: "Nhân Viên",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
        minWidth: 200,
      },
      {
        field: "thuQuy",
        headerName: "Thu Quỹ",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
        minWidth: 200,
      },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  const autoSizeStrategy = useMemo(
    () => ({
      type: "fitCellContents" as const,
      defaultMaxWidth: 500,
      defaultMinWidth: 30,
    }),
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Phiếu Thu - {khachHang?.tenKhachHang}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              MST: {khachHang?.maSoThue} | Tháng {month}/{year}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Đóng modal"
            tabIndex={0}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Year and Month Selectors */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="year-select"
                className="text-sm font-medium text-gray-700"
              >
                Năm:
              </label>
              <select
                id="year-select"
                value={availableYears.length === 0 ? "" : year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                disabled={availableYears.length === 0}
                className={`border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 ${
                  availableYears.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {availableYears.length === 0 ? (
                  <option value="" disabled>
                    Không có dữ liệu
                  </option>
                ) : (
                  availableYears.map((availableYear) => (
                    <option key={availableYear} value={availableYear}>
                      {availableYear}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Total Amount */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">
                Tổng tiền:{" "}
                <span className="text-blue-600 font-semibold">
                  {formatCurrencyVND(totalAmount)}
                </span>
              </span>
            </div>
          </div>

          {/* Quick month navigation for selected year */}
          {availableMonths.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-600 mb-2">
                Tháng có dữ liệu trong năm {year}:
              </div>
              <div className="flex gap-2 flex-wrap">
                {availableMonths.map((availableMonth) => {
                  const isSelected = availableMonth === month;
                  return (
                    <button
                      key={availableMonth}
                      onClick={() => onMonthChange(availableMonth)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        isSelected
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                      tabIndex={0}
                    >
                      Tháng {availableMonth}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-lg text-gray-600">
                Đang tải dữ liệu phiếu thu...
              </div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-red-500 text-lg">
                Lỗi khi tải dữ liệu: {error.message}
              </div>
            </div>
          ) : filteredPhieuThu.length > 0 ? (
            <div className="w-full h-full">
              <AgGridReact
                rowData={filteredPhieuThu}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                animateRows={true}
                cellSelection={true}
                rowHeight={40}
                localeText={AG_GRID_LOCALE_VN}
                headerHeight={45}
                allowContextMenuWithControlKey={true}
                autoSizeStrategy={autoSizeStrategy}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">
                  Không có phiếu thu trong tháng {month}/{year}
                </div>
                <p className="text-gray-400">
                  Chọn tháng/năm khác để xem dữ liệu
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhieuThuModal;
