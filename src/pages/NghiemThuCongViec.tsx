import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef, RowSelectionOptions } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { NghiemThuCongViec } from "../../generated/client";
import { formatCurrencyVND } from "@/utils/helper";
import DetailModal from "../components/DetailModal";
import { AG_GRID_LOCALE_VN } from "@ag-grid-community/locale";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

const NghiemThuCongViec = () => {
  const {
    data: nghiemThuList,
    isLoading,
    error,
  } = useQuery(trpc.nghiemThuCongViec.queryOptions());

  // State for modals
  const [selectedKhachHang, setSelectedKhachHang] = useState<any>(null);
  const [selectedNhanVien, setSelectedNhanVien] = useState<any>(null);
  const [selectedCongViec, setSelectedCongViec] = useState<any>(null);

  // Queries for entity details
  const { data: khachHangDetail, isLoading: isLoadingKhachHang } = useQuery({
    ...trpc.khachHangById.queryOptions({ id: selectedKhachHang?.id || 0 }),
    enabled: !!selectedKhachHang?.id,
  });

  const { data: nhanVienDetail, isLoading: isLoadingNhanVien } = useQuery({
    ...trpc.nhanVienById.queryOptions({ id: selectedNhanVien?.id || 0 }),
    enabled: !!selectedNhanVien?.id,
  });

  const { data: congViecDetail, isLoading: isLoadingCongViec } = useQuery({
    ...trpc.congViecById.queryOptions({ id: selectedCongViec?.id || 0 }),
    enabled: !!selectedCongViec?.id,
  });

  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        filter: "agNumberColumnFilter",
      },
      {
        field: "noiDung",
        headerName: "Nội Dung",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "khachHang",
        headerName: "Khách Hàng",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "nhanVien",
        headerName: "Nhân Viên",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "congViec",
        headerName: "Công Việc",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "ngay",
        headerName: "Ngày",
        sortable: true,
        filter: "agDateColumnFilter",
        cellRenderer: (params: any) => {
          if (!params.value) return "-";
          return new Date(params.value).toLocaleDateString("vi-VN");
        },
      },
      {
        field: "soTien",
        headerName: "Số Tiền (VNĐ)",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => {
          if (params.value === null || params.value === undefined) return "-";
          return formatCurrencyVND(params.value);
        },
      },
      {
        field: "kyDuLieu",
        headerName: "Kỳ Dữ Liệu",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "khachHangId",
        headerName: "ID Khách Hàng",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => {
          if (!params.value) return "-";
          return (
            <button
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0"
              onClick={() => setSelectedKhachHang({ id: params.value })}
              tabIndex={0}
              aria-label={`Xem chi tiết khách hàng ID ${params.value}`}
            >
              {params.value}
            </button>
          );
        },
      },
      {
        field: "nhanVienId",
        headerName: "ID Nhân Viên",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => {
          if (!params.value) return "-";
          return (
            <button
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0"
              onClick={() => setSelectedNhanVien({ id: params.value })}
              tabIndex={0}
              aria-label={`Xem chi tiết nhân viên ID ${params.value}`}
            >
              {params.value}
            </button>
          );
        },
      },
      {
        field: "congViecId",
        headerName: "ID Công Việc",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => {
          if (!params.value) return "-";
          return (
            <button
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0"
              onClick={() => setSelectedCongViec({ id: params.value })}
              tabIndex={0}
              aria-label={`Xem chi tiết công việc ID ${params.value}`}
            >
              {params.value}
            </button>
          );
        },
      },
    ],
    []
  );

  const rowSelection: RowSelectionOptions = useMemo(
    () => ({
      mode: "multiRow",
      checkboxes: false,
      headerCheckbox: false,
      enableClickSelection: true,
    }),
    []
  );

  // Use shared grid config
  const defaultColDef = DEFAULT_COL_DEF;
  const autoSizeStrategy = AUTO_SIZE_STRATEGY;

  if (isLoading) {
    return (
      <LoadingState
        title="Nghiệm Thu Công Việc"
        subtitle="Danh sách nghiệm thu công việc"
        message="Đang tải dữ liệu nghiệm thu công việc..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Nghiệm Thu Công Việc
          </h1>
          <p className="text-gray-600 mt-2">Quản lý nghiệm thu công việc</p>
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
          Nghiệm Thu Công Việc
        </h1>
        <p className="text-gray-600 mt-2">Quản lý nghiệm thu công việc</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách nghiệm thu ({nghiemThuList?.length || 0})
          </h2>
        </div>

        {nghiemThuList && nghiemThuList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                {...DEFAULT_GRID_OPTIONS}
                rowData={nghiemThuList}
                columnDefs={columnDefs}
                defaultColDef={DEFAULT_COL_DEF}
                autoSizeStrategy={AUTO_SIZE_STRATEGY}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu nghiệm thu
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có nghiệm thu nào được ghi nhận
            </p>
          </div>
        )}
      </div>

      {/* Detail Modals */}
      {selectedKhachHang && (
        <DetailModal
          data={khachHangDetail}
          title="Chi tiết Khách Hàng"
          onClose={() => setSelectedKhachHang(null)}
          isLoading={isLoadingKhachHang}
        />
      )}
      {selectedNhanVien && (
        <DetailModal
          data={nhanVienDetail}
          title="Chi tiết Nhân Viên"
          onClose={() => setSelectedNhanVien(null)}
          isLoading={isLoadingNhanVien}
        />
      )}

      {selectedCongViec && (
        <DetailModal
          data={congViecDetail}
          title="Chi tiết Công Việc"
          onClose={() => setSelectedCongViec(null)}
          isLoading={isLoadingCongViec}
        />
      )}
    </div>
  );
};

export default NghiemThuCongViec;
