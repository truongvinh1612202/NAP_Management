import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { DanhMucCongViec } from "../../generated/client";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY_FILL,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

interface CellRendererParams {
  data: DanhMucCongViec;
  value?: string | number | Date;
}

const DanhMucCongViec = () => {
  const updateCongViec = useMutation(trpc.updateCongViec.mutationOptions());
  const {
    data: congViecList,
    isLoading,
    error,
  } = useQuery(trpc.danhMucCongViec.queryOptions());
  const handleCellValueChanged = (
    event: CellValueChangedEvent<DanhMucCongViec>
  ) => {
    const { data, colDef, newValue, oldValue } = event;

    // Only update if value actually changed
    if (newValue !== oldValue) {
      const fieldName = colDef.field as keyof DanhMucCongViec;

      try {
        updateCongViec.mutate({
          id: data.id,
          data: {
            [fieldName]: data[fieldName],
          },
        });
      } catch (err) {
        console.error("updateCongViec error:", err);
      }
    }
  };
  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        minWidth: 100,
        filter: "agNumberColumnFilter",
      },
      {
        field: "ten",
        headerName: "Tên Công Việc",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "moTa",
        headerName: "Mô Tả",
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
        title="Danh Mục Công Việc"
        subtitle="Quản lý danh mục công việc"
        message="Đang tải danh sách công việc..."
      />
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Danh Mục Công Việc
          </h1>
          <p className="text-gray-600 mt-2">Quản lý danh mục công việc</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Danh Mục Công Việc</h1>
        <p className="text-gray-600 mt-2">Quản lý danh mục công việc</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách công việc ({congViecList?.length || 0})
          </h2>
        </div>

        {congViecList && congViecList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                {...DEFAULT_GRID_OPTIONS}
                rowData={congViecList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                autoSizeStrategy={AUTO_SIZE_STRATEGY_FILL}
                onCellValueChanged={handleCellValueChanged}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu công việc
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có công việc nào được thêm vào hệ thống
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DanhMucCongViec;
