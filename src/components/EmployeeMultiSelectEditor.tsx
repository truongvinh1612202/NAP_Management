import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { ICellEditorParams } from "ag-grid-community";
import { trpc } from "../utils/trpc";
import type {
  Company,
  CompanyEmployee,
  Employee,
} from "../../generated/client";

type CompanyWithAssignments = Company & {
  employeeAssignments: (CompanyEmployee & { employee: Employee })[];
};

interface EmployeeMultiSelectEditorParams extends ICellEditorParams<CompanyWithAssignments> {
  role: string;
  onSelectionChange?: (ids: number[]) => void;
}

const EmployeeMultiSelectEditor = forwardRef(
  (props: EmployeeMultiSelectEditorParams, ref) => {
    const { data: employeeList } = useQuery(trpc.employees.queryOptions());
    const containerRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState("");

    const currentAssignments =
      props.data?.employeeAssignments?.filter((a) => a.role === props.role) ??
      [];
    const initialIds = currentAssignments.map((a) => a.employeeId);
    const [selectedIds, setSelectedIds] = useState<number[]>(initialIds);

    useEffect(() => {
      containerRef.current?.focus();
    }, []);

    useImperativeHandle(ref, () => ({
      getValue() {
        return selectedIds;
      },
      isPopup() {
        return true;
      },
      isCancelAfterEnd() {
        return false;
      },
    }));

    const toggle = (id: number) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      setSelectedIds(next);
      props.onSelectionChange?.(next);
    };

    const filtered = (employeeList ?? []).filter((e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <div
        ref={containerRef}
        className="bg-white border border-gray-200 rounded-lg shadow-lg w-64 max-h-72 overflow-hidden flex flex-col"
        tabIndex={0}
      >
        <div className="p-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="border-solid box-border w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
            autoFocus
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 italic">
              Không tìm thấy nhân viên
            </p>
          ) : (
            filtered.map((emp) => (
              <label
                key={emp.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(emp.id)}
                  onChange={() => toggle(emp.id)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{emp.fullName}</span>
              </label>
            ))
          )}
        </div>
      </div>
    );
  },
);

EmployeeMultiSelectEditor.displayName = "EmployeeMultiSelectEditor";

export default EmployeeMultiSelectEditor;
