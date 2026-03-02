import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type { Employee, CompanyEmployee, Company } from "../../generated/client";
import NhanVienKhachHangModal from "../components/NhanVienKhachHangModal";
import { DEFAULT_GRID_OPTIONS, DEFAULT_COL_DEF } from "../utils/gridConfig";
import LoadingState from "@/components/LoadingState";

// Employee with nested company assignments from the `employees` query
type EmployeeWithAssignments = Employee & {
  companyAssignments: (CompanyEmployee & {
    company: Company;
  })[];
};

interface CellRendererParams {
  data: EmployeeWithAssignments;
  value?: string | number;
}

const DanhMucNhanVien = () => {
  const {
    data: employeeList,
    isLoading,
    error,
  } = useQuery(trpc.employees.queryOptions());

  const updateEmployee = useMutation(trpc.updateEmployee.mutationOptions());

  const [selectedEmployeeForModal, setSelectedEmployeeForModal] =
    useState<EmployeeWithAssignments | null>(null);

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<EmployeeWithAssignments>,
  ) => {
    const { data, colDef, newValue, oldValue } = event;
    if (newValue === oldValue) return;

    const field = colDef.field as keyof Employee;
    await updateEmployee.mutateAsync({
      id: data.id,
      data: { [field]: data[field] },
    });
  };

  const columnDefs: ColDef<EmployeeWithAssignments>[] = useMemo(
    () => [
      {
        headerName: "Công Ty Phụ Trách",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label={`Xem công ty phụ trách của ${params.data.fullName}`}
              onClick={() => setSelectedEmployeeForModal(params.data)}
            >
              Công Ty
            </button>
          </div>
        ),
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        maxWidth: 130,
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
        field: "fullName",
        headerName: "Họ Tên",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
      },
      {
        headerName: "Số Công Ty",
        sortable: false,
        filter: "agNumberColumnFilter",
        valueGetter: (params) =>
          params.data?.companyAssignments?.length ?? 0,
        cellRenderer: (params: { value: number }) =>
          params.value > 0 ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {params.value}
            </span>
          ) : (
            <span className="text-gray-400">0</span>
          ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <LoadingState
        title="Danh Mục Nhân Viên"
        subtitle="Quản lý thông tin nhân viên"
        message="Đang tải danh sách nhân viên..."
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Nhân Viên</h1>
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
            Danh sách nhân viên ({employeeList?.length ?? 0})
          </h2>
        </div>

        {employeeList && employeeList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                rowData={employeeList}
                columnDefs={columnDefs}
                defaultColDef={DEFAULT_COL_DEF}
                onCellValueChanged={handleCellValueChanged}
                {...DEFAULT_GRID_OPTIONS}
              />
            </div>
            <NhanVienKhachHangModal
              employee={selectedEmployeeForModal}
              isOpen={!!selectedEmployeeForModal}
              onClose={() => setSelectedEmployeeForModal(null)}
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
