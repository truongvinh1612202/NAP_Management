import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { CellValueChangedEvent, ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type {
  Employee,
  CompanyEmployee,
  Company,
} from "../../generated/client";
import { Search, Plus, Download } from "lucide-react";
import NhanVienKhachHangModal from "../components/NhanVienKhachHangModal";
import { exportNhanVienChiTiet } from "../utils/excelUtils";
import { toast } from "@/components/Toast";
import {
  DEFAULT_GRID_OPTIONS,
  DEFAULT_COL_DEF,
  AUTO_SIZE_STRATEGY_FILL,
} from "../utils/gridConfig";
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

interface AddEmployeeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddEmployeeModal = ({ onClose, onSuccess }: AddEmployeeModalProps) => {
  const createEmployee = useMutation(trpc.createEmployee.mutationOptions());
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Họ tên không được để trống");
      return;
    }
    try {
      await createEmployee.mutateAsync({ fullName: fullName.trim() });
      onSuccess();
      onClose();
    } catch {
      setErrorMsg("Có lỗi xảy ra khi thêm nhân viên");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-[380px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          Thêm nhân viên mới
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border-solid box-border px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập họ tên nhân viên"
              autoFocus
            />
          </div>
          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createEmployee.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none disabled:opacity-50"
            >
              {createEmployee.isPending ? "Đang thêm..." : "Thêm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DanhMucNhanVien = () => {
  const {
    data: employeeList,
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.employees.queryOptions());

  const updateEmployee = useMutation(trpc.updateEmployee.mutationOptions());
  // Dữ liệu công ty + phiếu thu (để xuất Excel chi tiết theo nhân viên)
  const { data: companyList } = useQuery(trpc.companiesWithPayments.queryOptions());

  const now = new Date();
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] =
    useState<EmployeeWithAssignments | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [exportMonth, setExportMonth] = useState<number | "all">(now.getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(now.getFullYear());

  const handleExportAll = () => {
    if (!companyList || !employeeList || employeeList.length === 0) {
      toast.error("Chưa có dữ liệu để xuất");
      return;
    }
    exportNhanVienChiTiet(companyList, employeeList, exportMonth, exportYear);
    toast.success(
      `Đã xuất Excel ${employeeList.length} nhân viên (${
        exportMonth === "all" ? `cả năm ${exportYear}` : `T${exportMonth}/${exportYear}`
      })`,
    );
  };

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
        headerName: "Phụ Trách",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none flex items-center justify-center"
              tabIndex={0}
              aria-label={`Xem công ty phụ trách của ${params.data.fullName}`}
              onClick={() => setSelectedEmployeeForModal(params.data)}
            >
              Chi tiết
            </button>
          </div>
        ),
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        maxWidth: 180,
        pinned: "right",
      },
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        width: 80,
        filter: "agNumberColumnFilter",
        hide: true,
      },
      {
        field: "fullName",
        headerName: "Họ Tên",
        sortable: true,
        filter: "agTextColumnFilter",
        editable: true,
        cellRenderer: (params: CellRendererParams) => params.value || "-",
        pinned: "left",
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="py-4 px-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative w-96 max-w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-700" />
            </div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm kiếm nhân viên..."
              className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-600"
              tabIndex={0}
              aria-label="Tìm kiếm nhân viên"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Chọn kỳ xuất Excel */}
            <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <select
                value={exportMonth === "all" ? "all" : String(exportMonth)}
                onChange={(e) =>
                  setExportMonth(e.target.value === "all" ? "all" : parseInt(e.target.value))
                }
                className="px-3 py-2 text-sm font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer border-r border-gray-200 hover:text-blue-600"
                aria-label="Kỳ xuất Excel — tháng"
                title="Kỳ xuất Excel"
              >
                <option value="all">Cả năm</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={exportYear}
                onChange={(e) => setExportYear(parseInt(e.target.value))}
                className="px-3 py-2 text-sm font-bold text-gray-700 bg-transparent focus:outline-none cursor-pointer hover:text-blue-600"
                aria-label="Kỳ xuất Excel — năm"
              >
                {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút xuất Excel tất cả nhân viên */}
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              title="Xuất Excel: mỗi nhân viên 1 sheet"
            >
              <Download size={18} />
              <span>Xuất Excel</span>
            </button>

            <button
              className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
              tabIndex={0}
              aria-label="Thêm nhân viên mới"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 w-auto"
        tabIndex={0}
        aria-label="Bảng nhân viên"
      >
        <AgGridReact
          rowData={employeeList}
          columnDefs={columnDefs}
          defaultColDef={DEFAULT_COL_DEF}
          onCellValueChanged={handleCellValueChanged}
          quickFilterText={searchText}
          {...DEFAULT_GRID_OPTIONS}
          autoSizeStrategy={AUTO_SIZE_STRATEGY_FILL}
        />
      </div>

      <NhanVienKhachHangModal
        employee={selectedEmployeeForModal}
        isOpen={!!selectedEmployeeForModal}
        onClose={() => setSelectedEmployeeForModal(null)}
        onDelete={() => refetch()}
      />

      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default DanhMucNhanVien;
