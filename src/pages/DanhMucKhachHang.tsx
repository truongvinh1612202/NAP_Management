import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { DanhMucKhachHang } from "../../generated/client";
import { useState } from "react";
import DetailModal from "../components/DetailModal";
import PhieuThuModal from "../components/PhieuThuModal";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

interface ValueGetterParams {
  data?: DanhMucKhachHang;
  value?: string;
}

interface ValueSetterParams {
  data: DanhMucKhachHang;
  newValue: { value: string; text: string };
}

interface CellRendererParams {
  data: DanhMucKhachHang;
  value?: string | number | Date;
}

const DanhMucKhachHang = () => {
  const updateKhachhHang = useMutation(trpc.updateKhachHang.mutationOptions());
  const {
    data: khachHangList,
    isLoading,
    error,
  } = useQuery(trpc.danhMucKhachHang.queryOptions());
  const { data: nhanVienList } = useQuery(trpc.danhMucNhanVien.queryOptions());
  const [selectedRow, setSelectedRow] = useState<DanhMucKhachHang | null>(null);
  const [selectedKhachHangIdForPhieuThu, setSelectedKhachHangIdForPhieuThu] =
    useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );

  // Query PhieuThu data for the selected customer to find latest
  const { data: phieuThuForLatest } = useQuery({
    ...trpc.phieuThuByKhachHang.queryOptions({
      khachHangId: selectedKhachHangIdForPhieuThu as number,
    }),
    enabled: !!selectedKhachHangIdForPhieuThu,
  });

  // Calculate latest PhieuThu year/month when customer changes
  const latestPhieuThuData = useMemo(() => {
    if (!phieuThuForLatest || phieuThuForLatest.length === 0) {
      return {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      };
    }

    // Find the most recent PhieuThu
    const latestPhieu = phieuThuForLatest
      .filter((p) => p.ngayThu) // Only PhieuThu with valid dates
      .sort((a, b) => {
        const dateA = new Date(a.ngayThu!);
        const dateB = new Date(b.ngayThu!);
        return dateB.getTime() - dateA.getTime(); // Descending order
      })[0];

    if (latestPhieu && latestPhieu.ngayThu) {
      const latestDate = new Date(latestPhieu.ngayThu);
      return {
        year: latestDate.getFullYear(),
        month: latestDate.getMonth() + 1,
      };
    }

    // Fallback to current date
    return {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    };
  }, [phieuThuForLatest]);

  // Update year/month when latest data changes (only if modal is open)
  useEffect(() => {
    if (selectedKhachHangIdForPhieuThu && phieuThuForLatest) {
      setSelectedYear(latestPhieuThuData.year);
      setSelectedMonth(latestPhieuThuData.month);
    }
  }, [selectedKhachHangIdForPhieuThu, latestPhieuThuData]);

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<DanhMucKhachHang>
  ) => {
    const { data, colDef, newValue, oldValue } = event;

    // Only update if value actually changed
    if (newValue !== oldValue) {
      const fieldName = colDef.field as keyof DanhMucKhachHang;

      try {
        await updateKhachhHang.mutateAsync({
          id: data.id,
          data: {
            [fieldName]: data[fieldName],
          },
        });
      } catch (err) {
        console.error("updateKhachhHang error:", err);
      }
    }
  };
  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef<DanhMucKhachHang>[] = useMemo(
    () => [
      {
        headerName: "Chi tiết",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label={`${params.data.tenKhachHang}`}
              onClick={() => setSelectedRow(params.data)}
            >
              Chi tiết
            </button>
          </div>
        ),
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        maxWidth: 120,
        pinned: "right",
      },
      {
        headerName: "Phí dịch vụ",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label={`Xem phiếu thu của ${params.data.tenKhachHang}`}
              onClick={() => setSelectedKhachHangIdForPhieuThu(params.data.id)}
            >
              Phiếu Thu
            </button>
          </div>
        ),
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        maxWidth: 120,
        pinned: "right",
      },
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        width: 100,
        filter: "agNumberColumnFilter",
      },
      {
        field: "tenKhachHang",
        headerName: "Tên Khách Hàng",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "maSoThue",
        headerName: "Mã Số Thuế",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "diaChi",
        headerName: "Địa Chỉ",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "dienThoai",
        headerName: "Điện Thoại",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "nganhKD",
        headerName: "Ngành Kinh Doanh",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "cqtQuanLy",
        headerName: "CQT Quản Lý",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "nhanVienDVKHId",
        headerName: "Nhân Viên DVKH",
        minWidth: 250,
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        valueGetter: (params: ValueGetterParams): string => {
          const id = params.data?.nhanVienDVKHId ?? params.value;
          const nv = nhanVienList?.find((nv: any) => nv.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          const selectedID = parseInt(params.newValue.value);
          params.data.nhanVienDVKHId = isNaN(selectedID) ? null : selectedID;
          return true;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          // Use objects with value (ID) and text (name) pairs
          values:
            nhanVienList?.map((nv) => ({
              value: nv.id.toString(),
              text: `${nv.tenNhanVien} (ID: ${nv.id})`,
            })) || [],
          allowTyping: true,
          filterList: true,
          searchType: "matchAny",
          formatValue: (value: { value: string; text: string }) => {
            // Display the text part when selected
            if (typeof value === "object" && value.text) {
              return value.text;
            }
            return value?.toString() || "-";
          },
        },
      },
      {
        field: "nhanVienLapSoId",
        headerName: "Nhân Viên Lập Sổ",
        minWidth: 250,
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        valueGetter: (params: ValueGetterParams): string => {
          const id = params.data?.nhanVienLapSoId ?? params.value;
          const nv = nhanVienList?.find((nv: any) => nv.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          const selectedID = parseInt(params.newValue.value);
          params.data.nhanVienLapSoId = isNaN(selectedID) ? null : selectedID;
          return true;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          // Use objects with value (ID) and text (name) pairs
          values:
            nhanVienList?.map((nv) => ({
              value: nv.id.toString(),
              text: `${nv.tenNhanVien} (ID: ${nv.id})`,
            })) || [],
          allowTyping: true,
          filterList: true,
          searchType: "matchAny",
          formatValue: (value: { value: string; text: string }) => {
            // Display the text part when selected
            if (typeof value === "object" && value.text) {
              return value.text;
            }
            return value?.toString() || "-";
          },
        },
      },
      {
        field: "nhanVienNSLId",
        headerName: "Nhân Viên NSL",
        minWidth: 250,
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        valueGetter: (params: ValueGetterParams): string => {
          const id = params.data?.nhanVienNSLId ?? params.value;
          const nv = nhanVienList?.find((nv: any) => nv.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          const selectedID = parseInt(params.newValue.value);
          params.data.nhanVienNSLId = isNaN(selectedID) ? null : selectedID;
          return true;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          // Use objects with value (ID) and text (name) pairs
          values:
            nhanVienList?.map((nv) => ({
              value: nv.id.toString(),
              text: `${nv.tenNhanVien} (ID: ${nv.id})`,
            })) || [],
          allowTyping: true,
          filterList: true,
          searchType: "matchAny",
          formatValue: (value: { value: string; text: string }) => {
            // Display the text part when selected
            if (typeof value === "object" && value.text) {
              return value.text;
            }
            return value?.toString() || "-";
          },
        },
      },
      {
        field: "trangThai",
        headerName: "Trạng Thái",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => {
          if (!params.value) return "-";
          const value = params.value.toString();
          let className = "";
          switch (value) {
            case "Đang cung cấp dịch vụ":
              className = "bg-green-100 text-green-800";
              break;
            case "Ngưng cung cấp dịch vụ":
              className = "bg-yellow-100 text-yellow-800";
              break;
            case "Không hoạt động":
              className = "bg-red-100 text-red-800";
              break;
            default:
              className = "bg-gray-100 text-gray-800";
          }
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}
            >
              {value}
            </span>
          );
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: [
            "Đang cung cấp dịch vụ",
            "Ngưng cung cấp dịch vụ",
            "Không hoạt động",
          ],
          allowTyping: false,
          filterList: true,
        },
      },
    ],
    [nhanVienList]
  );

  // Use shared grid config
  const defaultColDef = DEFAULT_COL_DEF;
  const autoSizeStrategy = AUTO_SIZE_STRATEGY;

  // Early return for loading state
  if (isLoading) {
    return (
      <LoadingState
        title="Danh Mục Khách Hàng"
        subtitle="Quản lý thông tin khách hàng"
        message="Đang tải danh sách khách hàng..."
      />
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Danh Mục Khách Hàng
          </h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin khách hàng</p>
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Danh Mục Khách Hàng
        </h1>
        <p className="text-gray-600 mt-2">Quản lý thông tin khách hàng</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách khách hàng ({khachHangList?.length || 0})
          </h2>
        </div>

        {khachHangList && khachHangList.length > 0 ? (
          <div className="p-4">
            <div
              className="w-auto h-[60vh]"
              tabIndex={0}
              aria-label="Bảng khách hàng"
            >
              <AgGridReact
                rowData={khachHangList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                autoSizeStrategy={autoSizeStrategy}
                onCellValueChanged={handleCellValueChanged}
                {...DEFAULT_GRID_OPTIONS}
              />
            </div>
            {selectedRow && (
              <DetailModal
                data={selectedRow}
                title="Thông tin khách hàng"
                onClose={() => setSelectedRow(null)}
              />
            )}
            <PhieuThuModal
              khachHangId={selectedKhachHangIdForPhieuThu}
              isOpen={!!selectedKhachHangIdForPhieuThu}
              onClose={() => setSelectedKhachHangIdForPhieuThu(null)}
              year={selectedYear}
              month={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
            />
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu khách hàng
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có khách hàng nào được thêm vào hệ thống
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DanhMucKhachHang;
