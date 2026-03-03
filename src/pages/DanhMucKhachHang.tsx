import { useMemo, useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import {
  CellEditingStoppedEvent,
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
} from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type {
  Company,
  CompanyEmployee,
  Employee,
} from "../../generated/client";
import { Search, Plus, ChevronDown } from "lucide-react";
import CompanyDetailModal from "../components/CompanyDetailModal";
import EmployeeMultiSelectEditor from "../components/EmployeeMultiSelectEditor";
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

interface AddCompanyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type EmployeeRole = "DICH_VU_KH" | "LAP_SO" | "NHAP_SO_LIEU";

interface MultiSelectProps {
  options: { id: number; label: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
}

const MultiSelect = ({
  options,
  selected,
  onChange,
  placeholder,
}: MultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (id: number) =>
    onChange(
      selected.includes(id)
        ? selected.filter((i) => i !== id)
        : [...selected, id],
    );

  const selectedLabels = options
    .filter((o) => selected.includes(o.id))
    .map((o) => o.label);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full box-border px-3 py-2 border border-gray-300 rounded-lg text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between gap-2"
      >
        <span
          className={`truncate ${selectedLabels.length ? "text-gray-900" : "text-gray-400"}`}
        >
          {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 italic">
              Chưa có nhân viên
            </p>
          ) : (
            options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.id)}
                  onChange={() => toggle(opt.id)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const ROLE_LABELS: Record<EmployeeRole, string> = {
  DICH_VU_KH: "NV Dịch Vụ KH",
  LAP_SO: "NV Lập Sổ",
  NHAP_SO_LIEU: "NV Nhập Số Liệu",
};

const ROLES: EmployeeRole[] = ["DICH_VU_KH", "LAP_SO", "NHAP_SO_LIEU"];

const AddCompanyModal = ({ onClose, onSuccess }: AddCompanyModalProps) => {
  const createCompany = useMutation(trpc.createCompany.mutationOptions());
  const assignEmployee = useMutation(
    trpc.assignEmployeeToCompany.mutationOptions(),
  );
  const { data: employeeList } = useQuery(trpc.employees.queryOptions());

  const [form, setForm] = useState({
    companyName: "",
    taxId: "",
    serviceFee: "",
  });
  const [assignments, setAssignments] = useState<
    Record<EmployeeRole, number[]>
  >({
    DICH_VU_KH: [],
    LAP_SO: [],
    NHAP_SO_LIEU: [],
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setErrorMsg("Tên công ty không được để trống");
      return;
    }
    if (!form.taxId.trim()) {
      setErrorMsg("Mã số thuế không được để trống");
      return;
    }
    setIsSubmitting(true);
    try {
      const company = await createCompany.mutateAsync({
        companyName: form.companyName.trim(),
        taxId: form.taxId.trim(),
        serviceFee: form.serviceFee ? parseFloat(form.serviceFee) : null,
      });

      const allAssignments = ROLES.flatMap((role) =>
        assignments[role].map((employeeId) => ({
          companyId: company.id,
          employeeId,
          role,
        })),
      );
      await Promise.all(
        allAssignments.map((a) => assignEmployee.mutateAsync(a)),
      );

      onSuccess();
      onClose();
    } catch {
      setErrorMsg("Có lỗi xảy ra khi thêm công ty");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          Thêm công ty mới
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên Công Ty <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) =>
                setForm((f) => ({ ...f, companyName: e.target.value }))
              }
              className="border-solid w-full box-border px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
              placeholder="Nhập tên công ty"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã Số Thuế <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.taxId}
              onChange={(e) =>
                setForm((f) => ({ ...f, taxId: e.target.value }))
              }
              className="border-solid w-full box-border px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
              placeholder="Nhập mã số thuế"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phí Dịch Vụ
            </label>
            <input
              type="number"
              value={form.serviceFee}
              onChange={(e) =>
                setForm((f) => ({ ...f, serviceFee: e.target.value }))
              }
              className="border-solid w-full box-border px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 text-gray-900"
              placeholder="Nhập phí dịch vụ (tùy chọn)"
              min="0"
            />
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              Phân công nhân viên
            </p>
            {ROLES.map((role) => (
              <div key={role}>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {ROLE_LABELS[role]}
                </label>
                <MultiSelect
                  options={(employeeList ?? []).map((e) => ({
                    id: e.id,
                    label: e.fullName,
                  }))}
                  selected={assignments[role]}
                  onChange={(ids) =>
                    setAssignments((prev) => ({ ...prev, [role]: ids }))
                  }
                  placeholder="Chọn nhân viên..."
                />
              </div>
            ))}
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none disabled:opacity-50"
            >
              {isSubmitting ? "Đang thêm..." : "Thêm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EMPLOYEE_ROLE_HEADERS = new Set([
  "NV Dịch Vụ KH",
  "NV Lập Sổ",
  "NV Nhập Số Liệu",
]);

const DanhMucKhachHang = () => {
  const updateCompany = useMutation(trpc.updateCompany.mutationOptions());
  const assignEmployee = useMutation(
    trpc.assignEmployeeToCompany.mutationOptions(),
  );
  const removeEmployee = useMutation(
    trpc.removeEmployeeFromCompany.mutationOptions(),
  );
  const {
    data: companyList,
    isLoading,
    error,
    refetch,
  } = useQuery(trpc.companies.queryOptions());

  const [selectedRow, setSelectedRow] = useState<CompanyWithAssignments | null>(
    null,
  );
  const [searchText, setSearchText] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const pendingEmployeeSelection = useRef<{ role: EmployeeRole; ids: number[] } | null>(null);

  const getRowId = (params: GetRowIdParams<CompanyWithAssignments>) =>
    String(params.data.id);

  const handleCellValueChanged = async (
    event: CellValueChangedEvent<CompanyWithAssignments>,
  ) => {
    const { data, colDef, newValue, oldValue } = event;
    if (newValue === oldValue) return;

    // Skip employee columns — handled by onCellEditingStopped
    if (EMPLOYEE_ROLE_HEADERS.has(colDef.headerName ?? "")) return;

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

  const handleCellEditingStopped = async (
    event: CellEditingStoppedEvent<CompanyWithAssignments>,
  ) => {
    const { data, colDef } = event;
    if (!data) return;

    const role = (
      colDef.cellEditorParams as { role?: EmployeeRole } | undefined
    )?.role;
    if (!role) return;
    const pending = pendingEmployeeSelection.current;
    pendingEmployeeSelection.current = null;
    if (!pending || pending.role !== role) return;
    const newIds = pending.ids;
    const currentAssignments = data.employeeAssignments.filter(
      (a) => a.role === role,
    );
    const currentIds = currentAssignments.map((a) => a.employeeId);

    const toAdd = newIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentAssignments.filter(
      (a) => !newIds.includes(a.employeeId),
    );
    try {
      await Promise.all([
        ...toAdd.map((employeeId) =>
          assignEmployee.mutateAsync({
            companyId: data.id,
            employeeId,
            role,
          }),
        ),
        ...toRemove.map((a) => removeEmployee.mutateAsync({ id: a.id })),
      ]);
      await refetch();
    } catch (err) {
      console.error("Employee assignment error:", err);
      await refetch();
    }
  };

  const columnDefs: ColDef<CompanyWithAssignments>[] = useMemo(
    () => [
      {
        headerName: "Chi tiết",
        cellRenderer: (params: CellRendererParams) => (
          <div className="flex items-center justify-center h-full w-full">
            <button
              className="w-full h-5 px-0 bg-gray-500 text-white rounded focus:outline-none flex items-center justify-center"
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
          const names = params.data?.employeeAssignments
            ?.filter((e) => e.role === "DICH_VU_KH")
            .map((e) => e.employee.fullName);
          return names?.length ? names.join(", ") : "-";
        },
        editable: true,
        cellEditorPopup: true,
        cellEditor: EmployeeMultiSelectEditor,
        cellEditorParams: {
          role: "DICH_VU_KH" as EmployeeRole,
          onSelectionChange: (ids: number[]) => {
            pendingEmployeeSelection.current = { role: "DICH_VU_KH", ids };
          },
        },
      },
      {
        headerName: "NV Lập Sổ",
        sortable: false,
        filter: "agTextColumnFilter",
        valueGetter: (params) => {
          const names = params.data?.employeeAssignments
            ?.filter((e) => e.role === "LAP_SO")
            .map((e) => e.employee.fullName);
          return names?.length ? names.join(", ") : "-";
        },
        editable: true,
        cellEditorPopup: true,
        cellEditor: EmployeeMultiSelectEditor,
        cellEditorParams: {
          role: "LAP_SO" as EmployeeRole,
          onSelectionChange: (ids: number[]) => {
            pendingEmployeeSelection.current = { role: "LAP_SO", ids };
          },
        },
      },
      {
        headerName: "NV Nhập Số Liệu",
        sortable: false,
        filter: "agTextColumnFilter",
        valueGetter: (params) => {
          const names = params.data?.employeeAssignments
            ?.filter((e) => e.role === "NHAP_SO_LIEU")
            .map((e) => e.employee.fullName);
          return names?.length ? names.join(", ") : "-";
        },
        editable: true,
        cellEditorPopup: true,
        cellEditor: EmployeeMultiSelectEditor,
        cellEditorParams: {
          role: "NHAP_SO_LIEU" as EmployeeRole,
          onSelectionChange: (ids: number[]) => {
            pendingEmployeeSelection.current = { role: "NHAP_SO_LIEU", ids };
          },
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
            className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
            tabIndex={0}
            aria-label="Thêm công ty mới"
            onClick={() => setShowAddModal(true)}
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
          getRowId={getRowId}
          onCellValueChanged={handleCellValueChanged}
          onCellEditingStopped={handleCellEditingStopped}
          quickFilterText={searchText}
          {...DEFAULT_GRID_OPTIONS}
        />
      </div>

      {selectedRow && (
        <CompanyDetailModal
          companyId={selectedRow.id}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {showAddModal && (
        <AddCompanyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default DanhMucKhachHang;
