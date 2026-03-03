import { useState } from "react";
import {
  Users,
  UserCheck,
  Database,
  Menu,
  PanelLeftClose,
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
    {
      id: "companies",
      label: "Công Ty",
      icon: <Users size={18} />,
      active: true,
    },
    {
      id: "employees",
      label: "Nhân Viên",
      icon: <UserCheck size={18} />,
      active: false,
    },
  ]);

  const handleMenuItemClick = (id: string) => {
    setMenuItems((prevItems) =>
      prevItems.map((item) => ({
        ...item,
        active: item.id === id,
      })),
    );
    if (onItemClick) {
      onItemClick(id);
    }
  };

  return (
    <nav
      className={`h-full bg-white text-gray-800 flex-shrink-0 relative border-r border-gray-200 flex flex-col ${
        isCollapsed ? "w-12 min-w-12" : "w-64 min-w-64"
      }`}
    >
      <div className="border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex items-center w-full transition-colors text-base font-medium hover:bg-gray-100 hover:text-gray-900 text-gray-700 border-none rounded-none ${
            isCollapsed ? "justify-center py-3 px-0" : "px-5 py-3"
          }`}
          tabIndex={0}
          aria-label={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          style={{ outline: "none", border: "none" }}
        >
          <span
            className={`flex-shrink-0 flex items-center ${!isCollapsed && "mr-3"}`}
          >
            {isCollapsed ? <Menu size={18} /> : <PanelLeftClose size={18} />}
          </span>
        </button>
      </div>

      <div className="py-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuItemClick(item.id)}
            className={`flex items-center w-full transition-colors mb-2 text-base font-medium ${
              item.active
                ? "bg-gray-200 text-gray-900"
                : "hover:bg-gray-100 hover:text-gray-900 text-gray-700"
            } ${
              isCollapsed ? "justify-center py-3 px-0" : "px-5 py-3"
            } border-none rounded-none`}
            tabIndex={0}
            aria-label={item.label}
            style={{ outline: "none", border: "none" }}
          >
            <span
              className={`flex-shrink-0 flex items-center ${!isCollapsed && "mr-3"}`}
            >
              {item.icon}
            </span>
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      <div className="py-4 border-t border-gray-200 mt-auto">
        <button
          className={`flex items-center w-full transition-colors mb-2 text-base font-medium hover:bg-gray-100 hover:text-gray-900 text-gray-700 border-none rounded-none ${
            isCollapsed ? "justify-center py-3 px-0" : "px-5 py-3"
          }`}
          tabIndex={0}
          aria-label="Database Settings"
          onClick={() => onItemClick?.("database-config")}
          style={{ outline: "none", border: "none" }}
        >
          <span
            className={`flex-shrink-0 flex items-center ${!isCollapsed && "mr-3"}`}
          >
            <Database size={18} />
          </span>
          {!isCollapsed && <span>Cài Đặt Database</span>}
        </button>
      </div>
    </nav>
  );
};

export default NavigationMenu;
