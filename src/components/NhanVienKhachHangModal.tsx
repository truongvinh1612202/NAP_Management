import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-enterprise";
import { trpc } from "../utils/trpc";
import type {
  Employee,
  CompanyEmployee,
  Company,
} from "../../generated/client";
import { AG_GRID_LOCALE_VN } from "@ag-grid-community/locale";
import { CELL_RENDERERS } from "../utils/gridConfig";

type EmployeeWithAssignments = Employee & {
  companyAssignments: (CompanyEmployee & { company: Company })[];
};

interface NhanVienKhachHangModalProps {
  employee: EmployeeWithAssignments | null;
  isOpen: boolean;
  onClose: () => void;
}

type RoleType = "DICH_VU_KH" | "LAP_SO" | "NHAP_SO_LIEU";

const ROLE_LABELS: Record<RoleType, string> = {
  DICH_VU_KH: "Dịch Vụ Khách Hàng",
  LAP_SO: "Lập Sổ",
  NHAP_SO_LIEU: "Nhập Số Liệu",
};

const NhanVienKhachHangModal: React.FC<NhanVienKhachHangModalProps> = ({
  employee,
  isOpen,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleType>("DICH_VU_KH");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Single query for all assignments of this employee
  const { data: allAssignments, isLoading } = useQuery({
    ...trpc.companyEmployees.queryOptions({
      employeeId: employee?.id ?? 0,
    }),
    enabled: !!employee?.id && isOpen,
  });

  // Split by role client-side
  const byRole = useMemo<
    Record<
      RoleType,
      (CompanyEmployee & { company: Company; employee: Employee })[]
    >
  >(
    () => ({
      DICH_VU_KH: allAssignments?.filter((a) => a.role === "DICH_VU_KH") ?? [],
      LAP_SO: allAssignments?.filter((a) => a.role === "LAP_SO") ?? [],
      NHAP_SO_LIEU:
        allAssignments?.filter((a) => a.role === "NHAP_SO_LIEU") ?? [],
    }),
    [allAssignments],
  );

  const currentData = byRole[selectedRole];

  const counts = useMemo(
    () => ({
      DICH_VU_KH: byRole.DICH_VU_KH.length,
      LAP_SO: byRole.LAP_SO.length,
      NHAP_SO_LIEU: byRole.NHAP_SO_LIEU.length,
    }),
    [byRole],
  );

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        sortable: true,
        filter: "agNumberColumnFilter",
        width: 80,
      },
      {
        headerName: "Tên Công Ty",
        sortable: true,
        filter: "agTextColumnFilter",
        flex: 2,
        valueGetter: (params: any) => params.data?.company?.companyName ?? "-",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        headerName: "Mã Số Thuế",
        sortable: true,
        filter: "agTextColumnFilter",
        flex: 1,
        valueGetter: (params: any) => params.data?.company?.taxId ?? "-",
        cellRenderer: (params: any) => params.value || "-",
      },
      {
        headerName: "Phí Dịch Vụ",
        sortable: true,
        filter: "agNumberColumnFilter",
        valueGetter: (params: any) => params.data?.company?.serviceFee ?? null,
        cellRenderer: CELL_RENDERERS.currency,
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({ resizable: true, sortable: true, filter: true }),
    [],
  );

  const autoSizeStrategy = useMemo(
    () => ({
      type: "fitCellContents" as const,
      defaultMaxWidth: 500,
      defaultMinWidth: 30,
    }),
    [],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Công Ty Phụ Trách — {employee?.fullName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Đóng modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Role Selector */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Vai trò:</span>
            {(Object.keys(ROLE_LABELS) as RoleType[]).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  selectedRole === role
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {ROLE_LABELS[role]} ({counts[role]})
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                <div className="text-lg text-gray-600">Đang tải dữ liệu...</div>
              </div>
            </div>
          ) : currentData.length > 0 ? (
            <div className="w-full h-full">
              <div className="mb-3">
                <h3 className="text-base font-medium text-gray-800">
                  {ROLE_LABELS[selectedRole]} — {currentData.length} công ty
                </h3>
              </div>
              <div className="w-full h-[calc(100%-2.5rem)]">
                <AgGridReact
                  rowData={currentData}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  pagination={true}
                  paginationPageSize={20}
                  animateRows={true}
                  suppressMenuHide={true}
                  localeText={AG_GRID_LOCALE_VN}
                  rowHeight={40}
                  headerHeight={45}
                  allowContextMenuWithControlKey={true}
                  autoSizeStrategy={autoSizeStrategy}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">
                  Không có công ty trong {ROLE_LABELS[selectedRole]}
                </div>
                <p className="text-gray-400">
                  Nhân viên này chưa được phân công công ty nào cho vai trò này
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NhanVienKhachHangModal;
