import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { QuanLyPhiDichVu } from "../../generated/client";
import { formatCurrencyVND } from "@/utils/helper";
import { createDateColumnConfig } from "@/utils/dateColumnConfig";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY_FILL,
} from "@/utils/gridConfig";
import LoadingState from "@/components/LoadingState";

const QuanLyTieuNam = () => {
  const {
    data: quanLyPhiDichVuList,
    isLoading,
    error,
  } = useQuery(trpc.quanLyPhiDichVu.queryOptions());

  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        width: 100,
        sortable: true,
        filter: "agNumberColumnFilter",
      },
      {
        field: "khachHangId",
        headerName: "ID Khách Hàng",
        sortable: true,
        filter: "agNumberColumnFilter",
      },
      {
        field: "phiDichVu",
        headerName: "Phí Dịch Vụ (VNĐ)",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => formatCurrencyVND(params.value),
        cellStyle: { textAlign: "left" },
      },
      createDateColumnConfig<QuanLyPhiDichVu>("ngayHieuLuc", "Ngày Hiệu Lực"),
      {
        field: "ghiChu",
        headerName: "Ghi Chú",
        flex: 2,
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <LoadingState
        title="Quản Lý Tiêu Năm"
        subtitle="Quản lý tiêu năm"
        message="Đang tải danh sách tiêu năm..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Tiêu Năm</h1>
          <p className="text-gray-600 mt-2">Quản lý tiêu năm</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Quản Lý Tiêu Năm</h1>
        <p className="text-gray-600 mt-2">Quản lý tiêu năm</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách tiêu năm ({quanLyPhiDichVuList?.length || 0})
          </h2>
        </div>

        {quanLyPhiDichVuList && quanLyPhiDichVuList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                {...DEFAULT_GRID_OPTIONS}
                rowData={quanLyPhiDichVuList}
                columnDefs={columnDefs}
                defaultColDef={DEFAULT_COL_DEF}
                autoSizeStrategy={AUTO_SIZE_STRATEGY_FILL}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu tiêu năm
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có dữ liệu tiêu năm nào được ghi nhận
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuanLyTieuNam;
