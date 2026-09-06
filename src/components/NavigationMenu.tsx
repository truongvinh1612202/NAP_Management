import { useState } from "react";
import {
  Users,
  UserCheck,
  Database,
  Menu,
  PanelLeftClose,
  DollarSign,
  BarChart3,
  ClipboardList,
  ChevronRight,
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState<NavigationItem[]>([
    { id: "companies", label: "Công Ty", icon: <Users size={18} />, active: true },
    { id: "employees", label: "Nhân Viên", icon: <UserCheck size={18} />, active: false },
    { id: "tien-thu", label: "Quản Lý Tiền Thu", icon: <DollarSign size={18} />, active: false },
    { id: "phi-dich-vu", label: "Quản Lý Phí DV", icon: <ClipboardList size={18} />, active: false },
    { id: "thong-ke-phieu", label: "Thống Kê Phiếu", icon: <BarChart3 size={18} />, active: false },
  ]);

  const handleMenuItemClick = (id: string) => {
    setMenuItems((prevItems) =>
      prevItems.map((item) => ({ ...item, active: item.id === id })),
    );
    onItemClick?.(id);
  };

  // Ô icon (chip) — nền đổi theo trạng thái để mỗi mục nhìn rõ là 1 nút bấm.
  const chip = (active: boolean) =>
    `flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors ${
      active
        ? "bg-white/20 text-white"
        : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-blue-600"
    } ${!isCollapsed ? "mr-2.5" : ""}`;

  return (
    <nav
      className={`h-full bg-white text-gray-800 flex-shrink-0 relative border-r border-gray-200 flex flex-col ${
        isCollapsed ? "w-14 min-w-14" : "w-56 min-w-56"
      }`}
    >
      {/* Thương hiệu + nút thu gọn */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              NAP
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 leading-tight truncate">
                NAP Management
              </p>
              <p className="text-[10px] text-gray-400 font-semibold leading-tight">
                Quản lý dịch vụ
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors ${
            isCollapsed ? "mx-auto" : ""
          }`}
          tabIndex={0}
          aria-label={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          {isCollapsed ? <Menu size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nhãn nhóm */}
      {!isCollapsed && (
        <p className="px-4 pt-4 pb-1.5 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
          Điều hướng
        </p>
      )}

      {/* Danh sách nút chuyển trang */}
      <div className={`flex flex-col gap-1.5 ${isCollapsed ? "px-2 pt-3" : "px-2"}`}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuItemClick(item.id)}
            className={`group relative flex items-center w-full rounded-xl transition-all ${
              isCollapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2.5"
            } ${
              item.active
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
            tabIndex={0}
            aria-label={item.label}
            title={item.label}
          >
            {/* Vạch nhấn bên trái khi đang ở trang này */}
            {item.active && !isCollapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white/90" />
            )}
            <span className={chip(item.active)}>{item.icon}</span>
            {!isCollapsed && (
              <span className="text-sm font-bold truncate">{item.label}</span>
            )}
            {/* Mũi tên gợi ý "bấm để qua trang" (mục chưa chọn) */}
            {!isCollapsed && !item.active && (
              <ChevronRight
                size={16}
                className="ml-auto text-gray-300 group-hover:text-blue-400 transition-colors"
              />
            )}
          </button>
        ))}
      </div>

      {/* Cài đặt (dưới cùng) */}
      <div className="mt-auto p-2 border-t border-gray-200">
        <button
          onClick={() => onItemClick?.("database-config")}
          className={`group flex items-center w-full rounded-xl transition-all text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${
            isCollapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2.5"
          }`}
          tabIndex={0}
          aria-label="Database Settings"
          title="Cài Đặt"
        >
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-gray-700 shrink-0 transition-colors ${
              !isCollapsed ? "mr-2.5" : ""
            }`}
          >
            <Database size={18} />
          </span>
          {!isCollapsed && <span className="text-sm font-bold">Cài Đặt</span>}
        </button>
      </div>
    </nav>
  );
};

export default NavigationMenu;
