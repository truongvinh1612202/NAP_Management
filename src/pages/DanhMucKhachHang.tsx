import React, { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { queryClient, trpc } from "../utils/trpc";
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

const DanhMucKhachHang = () => {
  const updateKhachhHang = useMutation(trpc.updateKhachHang.mutationOptions());
  const {
    data: khachHangList,
    isLoading,
    error,
  } = useQuery(trpc.danhMucKhachHang.queryOptions());
  const { data: nhanVienList } = useQuery(trpc.danhMucNhanVien.queryOptions());
  const [selectedRow, setSelectedRow] = useState<DanhMucKhachHang | null>(null);
  const [selectedKhachHangForPhieuThu, setSelectedKhachHangForPhieuThu] =
    useState<DanhMucKhachHang | null>(null);

  const handleCellValueChanged = (event: any) => {
    const { data, colDef, newValue, oldValue } = event;
    console.log("params.data:", JSON.stringify(event.data, null, 2));

    // Only update if value actually changed
    if (newValue !== oldValue) {
      const fieldName = colDef.field;

      updateKhachhHang.mutate({
        id: data.id,
        data: {
          [fieldName]: newValue,
        },
      });
    }
  };
  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "Chi tiết",
        field: "details",
        cellRenderer: (params: any) => (
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
        field: "actions",
        cellRenderer: (params: any) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label={`Xem phiếu thu của ${params.data.tenKhachHang}`}
              onClick={() => setSelectedKhachHangForPhieuThu(params.data)}
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
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "maSoThue",
        headerName: "Mã Số Thuế",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "diaChi",
        headerName: "Địa Chỉ",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "dienThoai",
        headerName: "Điện Thoại",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "nganhKD",
        headerName: "Ngành Kinh Doanh",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "cqtQuanLy",
        headerName: "CQT Quản Lý",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "nhanVienDVKHId",
        headerName: "Nhân Viên DVKH",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        valueGetter: (params: any) => {
          const id = params.data?.nhanVienDVKHId ?? params.value;
          const nv = nhanVienList?.find((nv: any) => nv.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        valueSetter: (params: any) => {
          const selectedName = params.newValue;
          const nv = nhanVienList?.find(
            (nv: any) => nv.tenNhanVien === selectedName
          );
          params.data.nhanVienDVKHId = nv?.id ?? null;
          return true;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: nhanVienList?.map((nv) => nv.tenNhanVien) || [],
          allowTyping: true,
          filterList: true,
          searchType: "matchAny",
        },
      },
      {
        field: "nhanVienLapSo",
        headerName: "Nhân Viên Lập Sổ",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: any) => {
          const id = params.data?.nhanVienLapSoId ?? params.value;
          const nv = nhanVienList?.find((n: any) => n.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: nhanVienList?.map((nv) => nv.tenNhanVien) || [],
          allowTyping: true,
          filterList: true,
          searchType: "matchAny",
        },
      },
      {
        field: "nhanVienNSL",
        headerName: "Nhân Viên NSL",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: any) => {
          const id = params.data?.nhanVienNSLId ?? params.value;
          const nv = nhanVienList?.find((n: any) => n.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: nhanVienList?.map((nv) => nv.tenNhanVien) || [],
          allowTyping: true,
          filterList: true,
          searchType: "matchAny",
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
                onCellEditingStopped={handleCellValueChanged}
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
              khachHang={selectedKhachHangForPhieuThu}
              isOpen={!!selectedKhachHangForPhieuThu}
              onClose={() => setSelectedKhachHangForPhieuThu(null)}
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
