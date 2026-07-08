import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, AlertCircle } from "lucide-react";
import { trpc } from "../utils/trpc";
import {
  parseExcelFile,
  validateImportData,
  type ExcelImportRow,
} from "../utils/excelUtils";

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal = ({ onClose, onSuccess }: ImportModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ExcelImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: employeeList } = useQuery(trpc.employees.queryOptions());
  const { data: companyList } = useQuery(trpc.companies.queryOptions());

  const createCompany = useMutation(trpc.createCompany.mutationOptions());
  const createEmployee = useMutation(trpc.createEmployee.mutationOptions());
  const assignEmployee = useMutation(
    trpc.assignEmployeeToCompany.mutationOptions()
  );

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationErrors([]);
    setImportData([]);

    try {
      setIsLoading(true);
      const data = await parseExcelFile(file);
      setImportData(data);

      const validation = validateImportData(data);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
      }
    } catch (error) {
      setValidationErrors([
        `Lỗi đọc file: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      setValidationErrors(["Không có dữ liệu để nhập"]);
      return;
    }

    setIsLoading(true);
    setImportStatus("");

    try {
      let successCount = 0;
      let errorCount = 0;

      // Build a map of existing employees and companies for this session
      const employeeMap = new Map(
        (employeeList ?? []).map((e) => [e.fullName, e.id])
      );
      const companyMap = new Map(
        (companyList ?? []).map((c) => [c.taxId, c.id])
      );

      for (const row of importData) {
        try {
          let companyId: number;

          // Check if company exists, if not create it
          if (companyMap.has(row.mst)) {
            companyId = companyMap.get(row.mst)!;
          } else {
            const newCompany = await createCompany.mutateAsync({
              companyName: row.tenCty,
              taxId: row.mst,
              serviceFee: row.phiDv || null,
            });
            companyId = newCompany.id;
            companyMap.set(row.mst, companyId);
          }

          // Process employee assignments
          const rolesToAssign = [
            { role: "DICH_VU_KH" as const, nameStr: row.dvkh },
            { role: "NHAP_SO_LIEU" as const, nameStr: row.nsl },
            { role: "LAP_SO" as const, nameStr: row.ls },
          ];

          for (const roleAssignment of rolesToAssign) {
            if (!roleAssignment.nameStr) continue;

            // Split by comma if multiple employees
            const employeeNames = roleAssignment.nameStr
              .split(",")
              .map((n) => n.trim())
              .filter((n) => n);

            for (const employeeName of employeeNames) {
              let employeeId: number;

              // Check if employee exists, if not create it
              if (employeeMap.has(employeeName)) {
                employeeId = employeeMap.get(employeeName)!;
              } else {
                const newEmployee = await createEmployee.mutateAsync({
                  fullName: employeeName,
                });
                employeeId = newEmployee.id;
                employeeMap.set(employeeName, employeeId);
              }

              // Assign employee to company (assignment existence check will be done by DB unique constraint)
              try {
                await assignEmployee.mutateAsync({
                  companyId,
                  employeeId,
                  role: roleAssignment.role,
                });
              } catch (error) {
                // Ignore duplicate assignment errors
                if (
                  !String(error).includes("Unique constraint failed")
                ) {
                  throw error;
                }
              }
            }
          }

          successCount++;
        } catch (error) {
          console.error(`Error importing ${row.tenCty}:`, error);
          errorCount++;
        }
      }

      setImportStatus(
        `Nhập thành công ${successCount}/${importData.length} công ty${errorCount > 0 ? ` (${errorCount} lỗi)` : ""}`
      );

      // Refresh data and close after a short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      setValidationErrors([
        `Lỗi nhập dữ liệu: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
    } finally {
      setIsLoading(false);
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
        className="bg-white rounded-lg shadow-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4 text-gray-900">
          Nhập Dữ Liệu Từ Excel
        </h3>

        {/* File Upload Section */}
        <div className="mb-6">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {selectedFile
                ? selectedFile.name
                : "Kéo thả file Excel hoặc nhấp để chọn"}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 mb-2">
                  Lỗi xác thực dữ liệu:
                </p>
                <ul className="text-sm text-red-600 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Data Preview */}
        {importData.length > 0 && validationErrors.length === 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">
              Dữ Liệu Sẽ Nhập ({importData.length} công ty):
            </h4>
            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      MST
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      Tên Công Ty
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      Phí DV
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      Nhân Viên
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {row.mst}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {row.tenCty}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {row.phiDv?.toLocaleString("vi-VN") || "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {[row.dvkh, row.nsl, row.ls]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Status */}
        {importStatus && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ {importStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleImport}
            disabled={
              isLoading || importData.length === 0 || validationErrors.length > 0
            }
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none disabled:opacity-50"
          >
            {isLoading ? "Đang nhập..." : "Nhập Dữ Liệu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
