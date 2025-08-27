import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  RowSelectionOptions,
  CellValueChangedEvent,
} from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type {
  NghiemThuCongViec,
  DanhMucNhanVien,
  DanhMucKhachHang,
  DanhMucCongViec,
} from "../../generated/client";
import { formatCurrencyVND } from "@/utils/helper";
import { createDateColumnConfig } from "@/utils/dateColumnConfig";
import DetailModal from "../components/DetailModal";
import { AG_GRID_LOCALE_VN } from "@ag-grid-community/locale";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

interface ValueGetterParams {
  data?: NghiemThuCongViec;
  value?: string;
}

interface ValueSetterParams {
  data: NghiemThuCongViec;
  newValue: { value: string; text: string };
}

interface CellRendererParams {
  data: NghiemThuCongViec;
  value?: string | number | Date;
}

const NghiemThuCongViec = () => {
  const updateNghiemThuCongViec = useMutation(
    trpc.updateNghiemThuCongViec.mutationOptions()
  );
  const {
    data: nghiemThuList,
    isLoading,
    error,
  } = useQuery(trpc.nghiemThuCongViec.queryOptions());
  const { data: nhanVienList } = useQuery(trpc.danhMucNhanVien.queryOptions());
  const { data: khachHangList } = useQuery(
    trpc.danhMucKhachHang.queryOptions()
  );
  const { data: congViecList } = useQuery(trpc.danhMucCongViec.queryOptions());

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<NghiemThuCongViec>
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
      const fieldName = colDef.field as keyof NghiemThuCongViec;
      await updateNghiemThuCongViec.mutateAsync({
        id: data.id,
        data: {
          [fieldName]: data[fieldName],
        },
      });
    }
  };

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
  const columnDefs: ColDef<NghiemThuCongViec>[] = useMemo(
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
        editable: true,
        cellRenderer: (params: CellRendererParams) =>
          params.data.noiDung || "-",
      },
      createDateColumnConfig<NghiemThuCongViec>("ngay", "Ngày"),
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
        field: "kyDuLieu",
        headerName: "Kỳ Dữ Liệu",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) =>
          params.data.kyDuLieu || "-",
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
          params.data.khachHangId = isNaN(selectedID) ? null : selectedID;
          return true;
        },
        cellRenderer: (params: CellRendererParams) => {
          if (!params.data.khachHangId) return "-";
          const kh = khachHangList?.find(
            (kh: DanhMucKhachHang) => kh.id === params.data.khachHangId
          );
          const displayName =
            kh?.tenKhachHang || `ID: ${params.data.khachHangId}`;
          return (
            <button
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0"
              onClick={() =>
                setSelectedKhachHang({ id: params.data.khachHangId })
              }
              tabIndex={0}
              aria-label={`Xem chi tiết khách hàng ${displayName}`}
            >
              {displayName}
            </button>
          );
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
        minWidth: 250,
        editable: true,
        valueGetter: (params: ValueGetterParams): string => {
          const id = params.data?.nhanVienId ?? params.value;
          const nv = nhanVienList?.find((nv: DanhMucNhanVien) => nv.id === id);
          return nv?.tenNhanVien ?? "-";
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          const selectedID = parseInt(params.newValue.value);
          params.data.nhanVienId = isNaN(selectedID) ? null : selectedID;
          return true;
        },
        cellRenderer: (params: CellRendererParams) => {
          if (!params.data.nhanVienId) return "-";
          const nv = nhanVienList?.find(
            (nv: DanhMucNhanVien) => nv.id === params.data.nhanVienId
          );
          const displayName =
            nv?.tenNhanVien || `ID: ${params.data.nhanVienId}`;
          return (
            <button
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0"
              onClick={() =>
                setSelectedNhanVien({ id: params.data.nhanVienId })
              }
              tabIndex={0}
              aria-label={`Xem chi tiết nhân viên ${displayName}`}
            >
              {displayName}
            </button>
          );
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
        field: "congViecId",
        headerName: "Công Việc",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        valueGetter: (params: ValueGetterParams): string => {
          const id = params.data?.congViecId ?? params.value;
          const cv = congViecList?.find((cv: DanhMucCongViec) => cv.id === id);
          return cv?.ten ?? "-";
        },
        valueSetter: (params: ValueSetterParams): boolean => {
          const selectedID = parseInt(params.newValue.value);
          params.data.congViecId = isNaN(selectedID) ? null : selectedID;
          return true;
        },
        cellRenderer: (params: CellRendererParams) => {
          if (!params.data.congViecId) return "-";
          const cv = congViecList?.find(
            (cv: DanhMucCongViec) => cv.id === params.data.congViecId
          );
          const displayName = cv?.ten || `ID: ${params.data.congViecId}`;
          return (
            <button
              className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0"
              onClick={() =>
                setSelectedCongViec({ id: params.data.congViecId })
              }
              tabIndex={0}
              aria-label={`Xem chi tiết công việc ${displayName}`}
            >
              {displayName}
            </button>
          );
        },
        cellEditor: "agRichSelectCellEditor",
        cellEditorParams: {
          // Use objects with value (ID) and text (name) pairs
          values:
            congViecList?.map((cv) => ({
              value: cv.id.toString(),
              text: `${cv.ten} (ID: ${cv.id})`,
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
    ],
    [nhanVienList, khachHangList, congViecList]
  );

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
                onCellValueChanged={handleCellValueChanged}
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
