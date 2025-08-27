import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type {
  DanhMucNhanVien,
  PhieuThu,
  DanhMucKhachHang,
} from "../../generated/client";
import { formatCurrencyVND } from "@/utils/helper";
import { createDateColumnConfig } from "@/utils/dateColumnConfig";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
} from "@/utils/gridConfig";
import LoadingState from "@/components/LoadingState";

interface ValueGetterParams {
  data?: PhieuThu;
  value?: string;
}

interface ValueSetterParams {
  data: PhieuThu;
  newValue: { value: string; text: string };
}

interface CellRendererParams {
  data: PhieuThu;
  value?: string | number | Date;
}

const PhieuThu = () => {
  const [isCurrentYearOnly, setIsCurrentYearOnly] = useState(true); // Default to current year
  const updatePhieuThu = useMutation(trpc.updatePhieuThu.mutationOptions());
  const {
    data: phieuThuList,
    isLoading,
    error,
  } = useQuery(trpc.phieuThu.queryOptions());
  const { data: nhanVienList } = useQuery(trpc.danhMucNhanVien.queryOptions());
  const { data: khachHangList } = useQuery(
    trpc.danhMucKhachHang.queryOptions()
  );

  // Filter data based on current year state
  const filteredPhieuThuList = useMemo(() => {
    if (!phieuThuList) return [];

    if (isCurrentYearOnly) {
      const currentYear = new Date().getFullYear();
      return phieuThuList.filter((item) => {
        if (!item.ngayThu) return false;
        const itemYear = new Date(item.ngayThu).getFullYear();
        return itemYear === currentYear;
      });
    }

    return phieuThuList;
  }, [phieuThuList, isCurrentYearOnly]);

  // Function to toggle between current year and all years
  const handleToggleYearFilter = () => {
    setIsCurrentYearOnly(!isCurrentYearOnly);
  };

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<PhieuThu>
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
      const fieldName = colDef.field as keyof PhieuThu;
      await updatePhieuThu.mutateAsync({
        id: data.id,
        data: {
          [fieldName]: data[fieldName],
        },
      });
    }
  };

  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef<PhieuThu>[] = useMemo(
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
      createDateColumnConfig<PhieuThu>("ngayThu", "Ngày Thu"),
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
        field: "khachHangId",
        headerName: "Khách Hàng",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        minWidth: 400,
        valueGetter: (params: ValueGetterParams): string => {
          const id = params.data?.khachHangId ?? params.value;
          const kh = khachHangList?.find(
            (kh: DanhMucKhachHang) => kh.id === Number(id)
          );
          return kh?.tenKhachHang ?? "-";
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          const selectedID = parseInt(params.newValue.value);
          params.data.khachHangId = isNaN(selectedID) ? 0 : selectedID;
          return true;
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          // Use objects with value (ID) and text (name) pairs
          values:
            khachHangList?.map((kh) => ({
              value: kh.id.toString(),
              text: `${kh.tenKhachHang} (ID: ${kh.id})`,
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
        field: "nhanVienId",
        headerName: "Nhân Viên",
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
        field: "nhomDoanhThu",
        headerName: "Nhóm Doanh Thu",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) =>
          params.data.nhomDoanhThu || "-",
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
    [nhanVienList, khachHangList]
  );

  if (isLoading) {
    return (
      <LoadingState
        title="Phiếu Thu"
        subtitle="Quản lý phiếu thu tiền"
        message="Đang tải danh sách phiếu thu..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Phiếu Thu</h1>
          <p className="text-gray-600 mt-2">Quản lý phiếu thu tiền</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Phiếu Thu</h1>
        <p className="text-gray-600 mt-2">Quản lý phiếu thu tiền</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              Danh sách phiếu thu ({filteredPhieuThuList?.length || 0})
            </h2>

            {/* Year Filter Toggle Button */}
            <div className="flex gap-3">
              <button
                onClick={handleToggleYearFilter}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isCurrentYearOnly
                    ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500"
                }`}
                tabIndex={0}
                aria-label={
                  isCurrentYearOnly
                    ? "Hiển thị tất cả năm"
                    : "Lọc theo năm hiện tại"
                }
              >
                {isCurrentYearOnly ? (
                  <>🗓️ Năm {new Date().getFullYear()}</>
                ) : (
                  <>📅 Tất cả năm</>
                )}
              </button>
            </div>
          </div>
        </div>

        {filteredPhieuThuList && filteredPhieuThuList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                {...DEFAULT_GRID_OPTIONS}
                rowData={filteredPhieuThuList}
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
              Không có dữ liệu phiếu thu
            </div>
            <p className="text-gray-400 mt-2">
              Chưa có phiếu thu nào được ghi nhận
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhieuThu;
