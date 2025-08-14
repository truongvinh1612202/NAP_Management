import { useState } from "react";

interface NavigationItem {
  id: string;
  label: string;
  icon: string; // Using string for simplicity, could be a component in a real app
  active: boolean;
}

interface NavigationMenuProps {
  onItemClick?: (itemId: string) => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ onItemClick }) => {
  const [menuItems, setMenuItems] = useState<NavigationItem[]>([
    {
      id: "khachhang",
      label: "Khách Hàng",
      icon: "👥",
      active: true,
    },
    {
      id: "nhanvien",
      label: "Nhân Viên",
      icon: "👨‍💼",
      active: false,
    },
    {
      id: "congviec",
      label: "Công Việc",
      icon: "📋",
      active: false,
    },
    {
      id: "chiphi",
      label: "Chi Phí",
      icon: "💰",
      active: false,
    },
    {
      id: "phieuchi",
      label: "Phiếu Chi",
      icon: "🧾",
      active: false,
    },
    {
      id: "phieuthu",
      label: "Phiếu Thu",
      icon: "💵",
      active: false,
    },
    {
      id: "nghiemthucongviec",
      label: "Nghiệm Thu",
      icon: "✅",
      active: false,
    },
    {
      id: "ds_qltnam",
      label: "QL Tiêu Năm",
      icon: "📅",
      active: false,
    },
  ]);

  const handleMenuItemClick = (id: string) => {
    setMenuItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        active: item.id === id,
      }))
    );
    // Call the parent's callback if provided
    if (onItemClick) {
      onItemClick(id);
    }
  };

  return (
    <nav className="h-full bg-white text-gray-800 w-64 min-w-64 flex-shrink-0 relative border-r border-gray-200">
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <h1 className="text-xl font-bold text-gray-700">Quản Lý Dữ Liệu NAP</h1>
      </div>
      <div className="py-4">
        <div>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item.id)}
              className={`flex items-center w-full px-5 py-3 transition-colors mb-2 text-base font-medium ${
                item.active
                  ? "bg-gray-200 text-gray-900"
                  : "hover:bg-gray-100 hover:text-gray-900 text-gray-700"
              } border-none rounded-none`}
              tabIndex={0}
              aria-label={item.label}
              style={{ outline: "none", border: "none" }}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 w-64 p-5 border-t border-gray-700">
        <button
          className="flex items-center w-full text-left px-4 py-2 
          transition-colors hover:bg-gray-700 rounded-md mb-2
          max-w-[236px]"
          tabIndex={0}
          aria-label="Database Settings"
          onClick={() => {
            if (onItemClick) {
              onItemClick("database-config");
            }
          }}
        >
          <span className="mr-3">⚙️</span>
          <span>Cài Đặt DB</span>
        </button>
        <button
          className="flex items-center w-full text-left px-4 py-2 transition-colors hover:bg-gray-100 hover:text-gray-900 text-gray-700 border-none rounded-none"
          tabIndex={0}
          aria-label="Logout"
          onClick={() => {
            sessionStorage.removeItem("isAuthenticated");
            window.location.href = "/";
          }}
        >
          <span className="mr-3">🚪</span>
          <span>Đăng Xuất</span>
        </button>
      </div>
    </nav>
  );
};

export default NavigationMenu;
