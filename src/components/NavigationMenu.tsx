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
      id: 'phieuchi',
      label: 'Phiếu Chi',
      icon: '🧾',
      active: false
    },
    {
      id: 'phieuthu',
      label: 'Phiếu Thu',
      icon: '💵',
      active: false
    },
    {
      id: 'nghiemthucongviec',
      label: 'Nghiệm Thu',
      icon: '✅',
      active: false
    },
    {
      id: 'ds_qltnam',
      label: 'QL Tiêu Năm',
      icon: '📅',
      active: false
    },
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
    <nav className="h-full bg-[#3A2E7D] text-[#9FA4B4] w-64 min-w-64 flex-shrink-0 relative">
      <div className="p-5 border-b border-[#6C63FF] bg-[#6C63FF] bg-opacity-10">
        <h1 className="text-xl font-bold text-[#6C63FF]">Quản Lý Dữ Liệu NAP</h1>
      </div>
      <div className="py-4">
        <div>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item.id)}
              className={`flex items-center w-full px-5 py-3 transition-colors rounded-lg mb-2 ${item.active ? 'bg-[#6C63FF] text-white' : 'hover:bg-[#E6E1FA] hover:text-[#3A2E7D]'} `}
              tabIndex={0}
              aria-label={item.label}
              style={{ outline: 'none', border: 'none' }}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 w-64 p-5 border-t border-[#6C63FF] bg-[#6C63FF] bg-opacity-10">
        <button
          className="flex items-center w-full text-left px-4 py-2 transition-colors hover:bg-[#E6E1FA] hover:text-[#3A2E7D] rounded-md max-w-[236px]"
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
