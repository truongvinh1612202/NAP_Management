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
  const [config, setConfig] = useState<DatabaseConfig>({
    server: "192.168.0.179",
    port: 49172,
    database: "napQuanly",
    username: "tqthy",
    password: "thydeptrai",
    encrypt: false,
    trustServerCertificate: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load existing configuration when modal opens
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      // You'll need to expose this via IPC in your preload script
      const existingConfig = await window.appApi.loadDatabaseConfig();
      if (existingConfig) {
        setConfig(existingConfig);
      }
    } catch (error) {
      console.warn("Could not load existing config:", error);
    }
  };

  const handleInputChange = (
    field: keyof DatabaseConfig,
    value: string | number | boolean
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setTestResult(null);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      console.log("Testing connection with config:", config);
      const result = await window.appApi.testDatabaseConnection(config);
      console.log("Connection test result:", result);

      if (result && result.success) {
        setTestResult("✅ Kết nối thành công!");
      } else if (result && result.success === false) {
        setError(
          `❌ Kết nối thất bại: ${result.error || "Lỗi không xác định"}`
        );
      } else {
        setError(
          "❌ Kiểm tra kết nối thất bại: Phản hồi không hợp lệ từ máy chủ"
        );
      }
    } catch (error) {
      console.error("Connection test error:", error);
      setError(
        `❌ Kiểm tra kết nối thất bại: ${
          error instanceof Error ? error.message : "Lỗi không xác định"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.password) {
      setError("Vui lòng kiểm tra mật khẩu");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      await window.appApi.saveDatabaseConfig(config);
      setTestResult("✅ Cấu hình đã được lưu và áp dụng thành công!");
      setTimeout(() => {
        onSave(config);
        onClose();
      }, 1500); // Close modal after showing success message
    } catch (error) {
      setError(
        `Failed to save configuration: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          Cấu hình Database
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Máy chủ
            </label>
            <input
              type="text"
              value={config.server}
              onChange={(e) => handleInputChange("server", e.target.value)}
              className="w-full box-border px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-700"
              placeholder="localhost or server IP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cổng
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) =>
                handleInputChange("port", parseInt(e.target.value) || 1433)
              }
              className="w-full box-border px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-700"
              placeholder="1433"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên Cơ Sở Dữ Liệu
            </label>
            <input
              type="text"
              value={config.database}
              onChange={(e) => handleInputChange("database", e.target.value)}
              className="w-full box-border px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-700"
              placeholder="NAP_Management"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên Đăng Nhập
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              className="w-full box-border px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-700"
              placeholder="SA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật Khẩu
            </label>
            <input
              type="password"
              value={config.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="w-full box-border px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-white text-gray-700"
              placeholder="Enter password"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.encrypt}
                onChange={(e) => handleInputChange("encrypt", e.target.checked)}
                className="mr-2 appearance-none border-2 border-solid border-gray-400 rounded-sm w-4 h-4 bg-white shadow-none outline-none focus:ring-0"
              />
              <span className="text-sm text-gray-700">Mã hóa kết nối</span>
            </label>

            {config.encrypt && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.trustServerCertificate || false}
                  onChange={(e) =>
                    handleInputChange(
                      "trustServerCertificate",
                      e.target.checked
                    )
                  }
                  className="mr-2 appearance-none border-2 border-solid border-gray-400 rounded-sm w-4 h-4 bg-white shadow-none outline-none focus:ring-0"
                />
                <span className="text-sm text-gray-700">Kiểm tra kết nối</span>
              </label>
            )}
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

          <div className="flex space-x-2">
            <button
              onClick={testConnection}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Testing..." : "Kiểm tra Kết Nối"}
            </button>
          </div>

          <div className="flex space-x-2 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "..." : "Lưu cấu hình"}
            </button>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            <strong>Lưu ý:</strong> Cấu hình cơ sở dữ liệu mới sẽ được áp dụng
            mà không cần khởi động lại ứng dụng
          </p>
        </div>
      </div>
    </div>
  );
}
