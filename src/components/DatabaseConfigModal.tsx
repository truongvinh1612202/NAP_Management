import { useState, useEffect } from "react";
import type { DatabaseConfig } from "../../electron/api";

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DatabaseConfig) => void;
}

export function DatabaseConfigModal({
  isOpen,
  onClose,
  onSave,
}: DatabaseConfigModalProps) {
  const [filePath, setFilePath] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const existingConfig = await window.appApi.loadDatabaseConfig();
      if (existingConfig) {
        setFilePath(existingConfig.filePath);
      }
    } catch (err) {
      console.warn("Could not load existing config:", err);
    }
  };

  const handleBrowse = async () => {
    const selected = await window.appApi.selectDbFile();
    if (selected) {
      setFilePath(selected);
      setError(null);
      setTestResult(null);
      await testConnection();
    }
  };

  const testConnection = async () => {
    if (!filePath.trim()) {
      setError("Vui lòng nhập đường dẫn tệp cơ sở dữ liệu");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const result = await window.appApi.testDatabaseConnection({
        filePath: filePath.trim(),
      });
      if (result && result.success) {
        setTestResult("Kết nối thành công!");
      } else {
        setError(`Kết nối thất bại: ${result?.error || "Lỗi không xác định"}`);
      }
    } catch (err) {
      setError(
        `Kiểm tra kết nối thất bại: ${err instanceof Error ? err.message : "Lỗi không xác định"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!filePath.trim()) {
      setError("Vui lòng nhập đường dẫn tệp cơ sở dữ liệu");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const config: DatabaseConfig = { filePath: filePath.trim() };
      await window.appApi.saveDatabaseConfig(config);
      setTestResult("Cấu hình đã được lưu và áp dụng thành công!");
      onSave(config);
      onClose();
    } catch (err) {
      setError(
        `Không thể lưu cấu hình: ${err instanceof Error ? err.message : "Lỗi không xác định"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          Cấu hình cơ sở dữ liệu
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đường dẫn tệp
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filePath}
                onChange={(e) => {
                  setFilePath(e.target.value);
                  setError(null);
                  setTestResult(null);
                }}
                className="flex-1 box-border px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-700 text-sm"
                placeholder="/path/to/nap-management.db"
              />
              <button
                onClick={handleBrowse}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-400 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm whitespace-nowrap"
              >
                Chọn tệp
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          {testResult && (
            <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
              {testResult}
            </div>
          )}

          <div className="flex space-x-2 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !filePath.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "..." : "Lưu cấu hình"}
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            <strong>Lưu ý:</strong> Để sao lưu dữ liệu, hãy đặt tệp .db trong
            thư mục được đồng bộ (Google Drive, OneDrive...) hoặc sao chép thủ
            công.
          </p>
        </div>
      </div>
    </div>
  );
}
