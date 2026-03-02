import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { Company, CompanyEmployee, Employee } from "../../generated/client";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import DetailModal from "../components/DetailModal";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY,
  CELL_RENDERERS,
} from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

// Company with nested employee assignments from the `companies` query
type CompanyWithAssignments = Company & {
  employeeAssignments: (CompanyEmployee & {
    employee: Employee;
  })[];
};

interface CellRendererParams {
  data: CompanyWithAssignments;
  value?: string | number | null;
}

const DanhMucKhachHang = () => {
  const updateCompany = useMutation(trpc.updateCompany.mutationOptions());
  const {
    data: companyList,
    isLoading,
    error,
  } = useQuery(trpc.companies.queryOptions());

  const [selectedRow, setSelectedRow] = useState<CompanyWithAssignments | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<CompanyWithAssignments>,
  ) => {
    const { data, colDef, newValue, oldValue } = event;
    if (newValue === oldValue) return;

    const field = colDef.field as keyof Company;
    try {
      await updateCompany.mutateAsync({
        id: data.id,
        data: { [field]: data[field] },
      });
    } catch (err) {
      console.error("updateCompany error:", err);
    }
  };

  const columnDefs: ColDef<CompanyWithAssignments>[] = useMemo(
    () => [
      {
        headerName: "Chi tiết",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label={`Chi tiết ${params.data.companyName}`}
              onClick={() => setSelectedRow(params.data)}
            >
              Chi tiết
            </button>
          </div>
        ),
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        maxWidth: 110,
        pinned: "right",
      },
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        width: 80,
        filter: "agNumberColumnFilter",
      },
      {
        field: "companyName",
        headerName: "Tên Công Ty",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "taxId",
        headerName: "Mã Số Thuế",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        field: "serviceFee",
        headerName: "Phí Dịch Vụ",
        sortable: true,
        filter: "agNumberColumnFilter",
        editable: true,
        cellRenderer: CELL_RENDERERS.currency,
      },
      {
        headerName: "NV Dịch Vụ KH",
        sortable: false,
        filter: "agTextColumnFilter",
        valueGetter: (params) => {
          const a = params.data?.employeeAssignments?.find(
            (e) => e.role === "DICH_VU_KH",
          );
          return a?.employee?.fullName ?? "-";
        },
      },
      {
        headerName: "NV Lập Sổ",
        sortable: false,
        filter: "agTextColumnFilter",
        valueGetter: (params) => {
          const a = params.data?.employeeAssignments?.find(
            (e) => e.role === "LAP_SO",
          );
          return a?.employee?.fullName ?? "-";
        },
      },
      {
        headerName: "NV Nhập Số Liệu",
        sortable: false,
        filter: "agTextColumnFilter",
        valueGetter: (params) => {
          const a = params.data?.employeeAssignments?.find(
            (e) => e.role === "NHAP_SO_LIEU",
          );
          return a?.employee?.fullName ?? "-";
        },
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <LoadingState
        title="Danh Mục Công Ty"
        subtitle="Quản lý thông tin công ty"
        message="Đang tải danh sách công ty..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Công Ty</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin công ty</p>
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
    <div className="p-0">
      {companyList && companyList.length > 0 ? (
        <>
          <div className="py-4 px-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="relative w-96">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={18} className="text-gray-700" />
                </div>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Tìm kiếm công ty..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-600"
                  tabIndex={0}
                  aria-label="Tìm kiếm công ty"
                />
              </div>
              <button
                className="flex items-center justify-center flex-shrink-0 w-10 h-10 border border-gray-700 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                tabIndex={0}
                aria-label="Thêm công ty mới"
                onClick={() => console.log("Add company clicked")}
              >
                <Plus size={20} className="text-gray-700" />
              </button>
            </div>
          </div>

          <div
            className="w-auto h-[calc(100vh-73px)]"
            tabIndex={0}
            aria-label="Bảng công ty"
          >
            <AgGridReact
              rowData={companyList}
              columnDefs={columnDefs}
              defaultColDef={DEFAULT_COL_DEF}
              autoSizeStrategy={AUTO_SIZE_STRATEGY}
              onCellValueChanged={handleCellValueChanged}
              quickFilterText={searchText}
              {...DEFAULT_GRID_OPTIONS}
            />
          </div>

          {selectedRow && (
            <DetailModal
              data={{
                id: selectedRow.id,
                companyName: selectedRow.companyName,
                taxId: selectedRow.taxId,
                serviceFee: selectedRow.serviceFee,
              }}
              title="Thông tin công ty"
              onClose={() => setSelectedRow(null)}
            />
          )}
        </>
      ) : (
        <div className="px-6 py-8 text-center">
          <div className="text-gray-500 text-lg">Không có dữ liệu công ty</div>
          <p className="text-gray-400 mt-2">
            Chưa có công ty nào được thêm vào hệ thống
          </p>
        </div>
      )}
    </div>
  );
};

export default DanhMucKhachHang;
