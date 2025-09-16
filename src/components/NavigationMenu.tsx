import { useState } from "react";
import {
  Users,
  UserCheck,
  Briefcase,
  DollarSign,
  FileText,
  Receipt,
  CheckSquare,
  Calendar,
  CreditCard,
  Database,
  LogOut,
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
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
      icon: <Users size={18} />,
      active: true,
    },
    {
      id: "nhanvien",
      label: "Nhân Viên",
      icon: <UserCheck size={18} />,
      active: false,
    },
    {
      id: "congviec",
      label: "Công Việc",
      icon: <Briefcase size={18} />,
      active: false,
    },
    {
      id: "chiphi",
      label: "Chi Phí",
      icon: <DollarSign size={18} />,
      active: false,
    },
    {
      id: "phieuchi",
      label: "Phiếu Chi",
      icon: <FileText size={18} />,
      active: false,
    },
    {
      id: "phieuthu",
      label: "Phiếu Thu",
      icon: <Receipt size={18} />,
      active: false,
    },
    {
      id: "nghiemthucongviec",
      label: "Nghiệm Thu",
      icon: <CheckSquare size={18} />,
      active: false,
    },
    {
      id: "ds_qltnam",
      label: "Quản Lý Tiêu Năm",
      icon: <Calendar size={18} />,
      active: false,
    },
    {
      id: "phieuthunew",
      label: "Thu Phí Dịch Vụ",
      icon: <CreditCard size={18} />,
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
              <span className="mr-3 flex-shrink-0 flex items-center">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="py-4 border-t border-gray-200">
        <button
          className="flex items-center w-full px-5 py-3 transition-colors mb-2 text-base font-medium
            hover:bg-gray-100 hover:text-gray-900 text-gray-700
            border-none rounded-none"
          tabIndex={0}
          aria-label="Database Settings"
          onClick={() => {
            if (onItemClick) {
              onItemClick("database-config");
            }
          }}
        >
          <span className="mr-3 flex-shrink-0 flex items-center">
            <Database size={18} />
          </span>
          <span>Cài Đặt Database</span>
        </button>
        <button
          className="flex items-center w-full px-5 py-3 transition-colors mb-2 text-base font-medium
            hover:bg-gray-100 hover:text-gray-900 text-gray-700
            border-none rounded-none"
          tabIndex={0}
          aria-label="Logout"
          onClick={() => {
            sessionStorage.removeItem("isAuthenticated");
            window.location.href = "/";
          }}
        >
          <span className="mr-3 flex-shrink-0 flex items-center">
            <LogOut size={18} />
          </span>
          <span>Đăng Xuất</span>
        </button>
      </div>
    </nav>
  );
};

export default NavigationMenu;
