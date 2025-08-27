import React, { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { DanhMucNhanVien, PhieuChi } from "../../generated/client";
import { formatCurrencyVND } from "@/utils/helper";
import { createDateColumnConfig } from "@/utils/dateColumnConfig";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
} from "@/utils/gridConfig";
import LoadingState from "@/components/LoadingState";

interface ValueGetterParams {
  data?: PhieuChi;
  value?: string;
}

interface ValueSetterParams {
  data: PhieuChi;
  newValue: { value: string; text: string };
}

interface CellRendererParams {
  data: PhieuChi;
  value?: string | number | Date;
}

const PhieuChi = () => {
  const updatePhieuChi = useMutation(trpc.updatePhieuChi.mutationOptions());
  const {
    data: phieuChiList,
    isLoading,
    error,
  } = useQuery(trpc.phieuChi.queryOptions());
  const { data: nhanVienList } = useQuery(trpc.danhMucNhanVien.queryOptions());

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<PhieuChi>
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
      const fieldName = colDef.field as keyof PhieuChi;
      await updatePhieuChi.mutateAsync({
        id: data.id,
        data: {
          [fieldName]: data[fieldName],
        },
      });
    }
  };
  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef<PhieuChi>[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        filter: "agNumberColumnFilter",
      },
      {
        field: "soCT",
        headerName: "Số CT",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      createDateColumnConfig<PhieuChi>("ngayChi", "Ngày Chi"),
      {
        field: "noiDung",
        headerName: "Nội Dung",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) =>
          params.data.noiDung || "-",
      },
      {
        field: "tenKhachHang",
        headerName: "Khách Hàng",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) =>
          params.data.tenKhachHang || "-",
      },
      {
        field: "nhanVienId",
        headerName: "Nhân Viên",
        minWidth: 250,
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        valueGetter: (params: ValueGetterParams): string => {
          const id = params.data?.nhanVienId ?? params.value;
          const nv = nhanVienList?.find((nv: DanhMucNhanVien) => nv.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          const selectedID = parseInt(params.newValue.value);
          params.data.nhanVienId = isNaN(selectedID) ? 0 : selectedID;
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
        field: "nhomChi",
        headerName: "Nhóm Chi",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) =>
          params.data.nhomChi || "-",
      },
      {
        field: "soTien",
        headerName: "Số Tiền (VNĐ)",
        sortable: true,
        filter: "agNumberColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) =>
          formatCurrencyVND(params.data.soTien),
      },
      {
        field: "thuQuy",
        headerName: "Thu Quỹ",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.data.thuQuy || "-",
      },
    ],
    [nhanVienList]
  );

  // Early return for loading state
  if (isLoading) {
    return (
      <LoadingState
        title="Phiếu Chi"
        subtitle="Quản lý phiếu chi tiền"
        message="Đang tải danh sách phiếu chi..."
      />
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Phiếu Chi</h1>
          <p className="text-gray-600 mt-2">Quản lý phiếu chi tiền</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Phiếu Chi</h1>
        <p className="text-gray-600 mt-2">Quản lý phiếu chi tiền</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách phiếu chi ({phieuChiList?.length || 0})
          </h2>
        </div>

        {phieuChiList && phieuChiList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                {...DEFAULT_GRID_OPTIONS}
                rowData={phieuChiList}
                columnDefs={columnDefs}
                defaultColDef={DEFAULT_COL_DEF}
                autoSizeStrategy={AUTO_SIZE_STRATEGY}
                onCellValueChanged={handleCellValueChanged}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">
              Không có dữ liệu phiếu chi
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có phiếu chi nào được ghi nhận
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhieuChi;
