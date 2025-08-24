import React, { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { ChiPhiCongViec } from "../../generated/client";
import { formatCurrencyVND } from "@/utils/helper";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
} from "@/utils/gridConfig";
import LoadingState from "@/components/LoadingState";

const ChiPhiCongViec = () => {
  const updateChiPhi = useMutation(trpc.updateChiPhi.mutationOptions());
  const {
    data: chiPhiList,
    isLoading,
    error,
  } = useQuery(trpc.chiPhiCongViec.queryOptions());
  const { data: khachHangList } = useQuery(
    trpc.danhMucKhachHang.queryOptions()
  );

  const handleCellValueChanged = async (event: any) => {
    const { data, colDef, newValue, oldValue } = event;

    // Only update if value actually changed
    if (newValue !== oldValue) {
      const fieldName = colDef.field;
      await updateChiPhi.mutateAsync({
        id: data.id,
        data: {
          [fieldName]: data[fieldName],
        },
      });
    }
  };
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
        field: "khId",
        headerName: "Tên Khách Hàng",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        minWidth: 400,
        valueGetter: (params: any) => {
          const id = params.data?.khId ?? params.value;
          const kh = khachHangList?.find((kh: any) => kh.id === Number(id));
          return kh?.tenKhachHang ?? "-";
        },
        valueSetter: (params: any) => {
          const selectedName = params.newValue;
          const kh = khachHangList?.find(
            (kh: any) => kh.tenKhachHang === selectedName
          );
          params.data.khId = kh ? String(kh.id) : null;
          return true;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          values: khachHangList?.map((kh) => kh.tenKhachHang) || [],
          allowTyping: true,
          filterList: true,
          searchType: "matchAny",
        },
      },
      {
        field: "congViecId",
        headerName: "Mã Công Việc",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "tenCongViec",
        headerName: "Tên Công Việc",
        sortable: true,
        filter: "agTextColumnFilter",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        field: "chiPhi",
        headerName: "Chi Phí (VNĐ)",
        sortable: true,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: any) => {
          if (params.value === null || params.value === undefined) return "-";
          return formatCurrencyVND(params.value);
        },
      },
    ],
    []
  );

  // Early return for loading state
  if (isLoading) {
    return (
      <LoadingState
        title="Chi Phí Công Việc"
        subtitle="Theo dõi chi phí cho các công việc"
        message="Đang tải danh sách chi phí..."
      />
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Chi Phí Công Việc
          </h1>
          <p className="text-gray-600 mt-2">
            Theo dõi chi phí cho các công việc
          </p>
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
        <h1 className="text-2xl font-bold text-gray-900">Chi Phí Công Việc</h1>
        <p className="text-gray-600 mt-2">Theo dõi chi phí cho các công việc</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách chi phí ({chiPhiList?.length || 0})
          </h2>
        </div>

        {chiPhiList && chiPhiList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                rowData={chiPhiList}
                columnDefs={columnDefs}
                defaultColDef={DEFAULT_COL_DEF}
                {...DEFAULT_GRID_OPTIONS}
                autoSizeStrategy={AUTO_SIZE_STRATEGY}
                onCellValueChanged={handleCellValueChanged}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu chi phí
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có chi phí nào được ghi nhận
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChiPhiCongViec;
