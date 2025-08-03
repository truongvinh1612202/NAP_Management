import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationMenu from '../components/NavigationMenu';
import DataTable from '../components/DataTable';
import ChiPhiCongViec from './ChiPhiCongViec';
import DanhMucCongViec from './DanhMucCongViec';
import DanhMucKhachHang from './DanhMucKhachHang';
import DanhMucNhanVien from './DanhMucNhanVien';

const Main = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');

  // Check if user is authenticated
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [navigate]);

  // Handle navigation menu item clicks
  const handleMenuItemClick = (itemId: string) => {
    setActiveView(itemId);
  };

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'khachhang':
        return <DanhMucKhachHang />;
      case 'nhanvien':
        return <DanhMucNhanVien />;
      case 'congviec':
        return <DanhMucCongViec />;
      case 'chiphi':
        return <ChiPhiCongViec />;
      case 'dashboard':
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-[70vh]">
              <DataTable />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 w-[100vw]">
      {/* Left Navigation Menu */}
      <NavigationMenu onItemClick={handleMenuItemClick} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default Main;
