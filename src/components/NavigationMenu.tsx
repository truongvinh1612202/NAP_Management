import { useState } from 'react';

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
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      active: true
    },
    {
      id: 'khachhang',
      label: 'Khách Hàng',
      icon: '👥',
      active: false
    },
    {
      id: 'nhanvien',
      label: 'Nhân Viên',
      icon: '👨‍💼',
      active: false
    },
    {
      id: 'congviec',
      label: 'Công Việc',
      icon: '📋',
      active: false
    },
    {
      id: 'chiphi',
      label: 'Chi Phí',
      icon: '💰',
      active: false
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📈',
      active: false
    }
  ]);

  const handleMenuItemClick = (id: string) => {
    setMenuItems(prevItems =>
      prevItems.map(item => ({
        ...item,
        active: item.id === id
      }))
    );
    // Call the parent's callback if provided
    if (onItemClick) {
      onItemClick(id);
    }
  };

  return (
    <nav className="h-full bg-gray-800 text-white w-64 min-w-64 flex-shrink-0">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-xl font-bold">Quản Lý Dữ Liệu NAP</h1>
      </div>
      <div className="py-4">
        <ul>
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => handleMenuItemClick(item.id)}
                className={`flex items-center w-full px-5 py-3 transition-colors hover:bg-gray-700 ${item.active ? 'bg-gray-700' : ''}`}
                tabIndex={0}
                aria-label={item.label}
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute bottom-0 w-64 p-5 border-t border-gray-700">
        <button
          className="flex items-center w-full text-left px-4 py-2 
          transition-colors hover:bg-gray-700 rounded-md
          max-w-[236px]"
          tabIndex={0}
          aria-label="Logout"
          onClick={() => {
            sessionStorage.removeItem('isAuthenticated');
            window.location.href = '/';
          }}
        >
          <span className="mr-3">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default NavigationMenu;
