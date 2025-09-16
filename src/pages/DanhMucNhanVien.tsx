import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { DanhMucNhanVien } from "../../generated/client";
import { createDateColumnConfig } from "@/utils/dateColumnConfig";
import NhanVienKhachHangModal from "../components/NhanVienKhachHangModal";
import { DEFAULT_GRID_OPTIONS, DEFAULT_COL_DEF } from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

interface CellRendererParams {
  data: DanhMucNhanVien;
  value?: string | number | Date;
}

const DanhMucNhanVien = () => {
  const {
    data: nhanVienList,
    isLoading,
    error,
  } = useQuery(trpc.danhMucNhanVien.queryOptions());

  // Define mutation for updating nhân viên
  const updateNhanVien = useMutation(trpc.updateNhanVien.mutationOptions());

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<DanhMucNhanVien>
  ) => {
    const { data, colDef, newValue, oldValue } = event;

    let valuesAreDifferent = false;

    // Handle date field comparison properly
    if (newValue instanceof Date && oldValue instanceof Date) {
      // Safely convert to Date objects
      const newDate = newValue ? new Date(newValue) : null;
      const oldDate = oldValue ? new Date(oldValue) : null;

      // Compare using getTime() for accurate date comparison
      const newTime = newDate?.getTime();
      const oldTime = oldDate?.getTime();

      // Handle NaN cases (invalid dates)
      valuesAreDifferent =
        newTime !== oldTime && !isNaN(newTime || 0) && !isNaN(oldTime || 0);
    } else {
      // For non-date fields, use regular comparison
      valuesAreDifferent = newValue !== oldValue;
    }

    // Only update if value actually changed
    if (valuesAreDifferent) {
      const fieldName = colDef.field as keyof DanhMucNhanVien;
      await updateNhanVien.mutateAsync({
        id: data.id,
        data: {
          [fieldName]: data[fieldName],
        },
      });
    }
  };

  const [selectedNhanVienForKhachHang, setSelectedNhanVienForKhachHang] =
    useState<DanhMucNhanVien | null>(null);

  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef<DanhMucNhanVien>[] = useMemo(
    () => [
      {
        headerName: "Chi tiết NV",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label={`Xem khách hàng phụ trách của ${params.data.tenNhanVien}`}
              onClick={() => setSelectedNhanVienForKhachHang(params.data)}
            >
              Khách Hàng
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
        filter: "agNumberColumnFilter",
      },
      {
        field: "maSoNhanVien",
        headerName: "Mã Số NV",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "tenNhanVien",
        headerName: "Tên Nhân Viên",
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      createDateColumnConfig<DanhMucNhanVien>("namSinh", "Năm Sinh"),
      {
        field: "dienThoai",
        headerName: "Điện Thoại",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "thuongTru",
        headerName: "Thường Trú",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "userDangNhap",
        headerName: "User Đăng Nhập",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
    ],
    []
  );

  // Use shared grid config
  const defaultColDef = DEFAULT_COL_DEF;

  // Early return for loading state
  if (isLoading) {
    return (
      <LoadingState
        title="Danh Mục Nhân Viên"
        subtitle="Quản lý thông tin nhân viên"
        message="Đang tải danh sách nhân viên..."
      />
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Danh Mục Nhân Viên
          </h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin nhân viên</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Danh Mục Nhân Viên</h1>
        <p className="text-gray-600 mt-2">Quản lý thông tin nhân viên</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách nhân viên ({nhanVienList?.length || 0})
          </h2>
        </div>

        {nhanVienList && nhanVienList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                rowData={nhanVienList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onCellValueChanged={handleCellValueChanged}
                {...DEFAULT_GRID_OPTIONS}
              />
            </div>
            <NhanVienKhachHangModal
              nhanVien={selectedNhanVienForKhachHang}
              isOpen={!!selectedNhanVienForKhachHang}
              onClose={() => setSelectedNhanVienForKhachHang(null)}
            />
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu nhân viên
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có nhân viên nào được thêm vào hệ thống
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DanhMucNhanVien;
