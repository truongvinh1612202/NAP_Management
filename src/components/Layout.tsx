import React, { useState } from 'react';
import NavigationMenu from './NavigationMenu';
import DanhMucKhachHang from '../pages/DanhMucKhachHang';
import DanhMucNhanVien from '../pages/DanhMucNhanVien';
import DanhMucCongViec from '../pages/DanhMucCongViec';
import ChiPhiCongViec from '../pages/ChiPhiCongViec';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [activeView, setActiveView] = useState('dashboard');

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
        return children || (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div 
                className="bg-blue-600 text-white p-4 rounded-lg cursor-pointer hover:bg-blue-700"
                onClick={() => setActiveView('khachhang')}
              >
                <h3 className="text-lg font-semibold mb-2">👥 Khách Hàng</h3>
                <p className="text-sm">Quản lý thông tin khách hàng</p>
              </div>
              <div 
                className="bg-green-600 text-white p-4 rounded-lg cursor-pointer hover:bg-green-700"
                onClick={() => setActiveView('nhanvien')}
              >
                <h3 className="text-lg font-semibold mb-2">👨‍💼 Nhân Viên</h3>
                <p className="text-sm">Quản lý thông tin nhân viên</p>
              </div>
              <div 
                className="bg-purple-600 text-white p-4 rounded-lg cursor-pointer hover:bg-purple-700"
                onClick={() => setActiveView('congviec')}
              >
                <h3 className="text-lg font-semibold mb-2">📋 Công Việc</h3>
                <p className="text-sm">Quản lý công việc và dự án</p>
              </div>
              <div 
                className="bg-red-600 text-white p-4 rounded-lg cursor-pointer hover:bg-red-700"
                onClick={() => setActiveView('chiphi')}
              >
                <h3 className="text-lg font-semibold mb-2">💰 Chi Phí</h3>
                <p className="text-sm">Theo dõi chi phí công việc</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-white shadow-md">
        <NavigationMenu onItemClick={setActiveView} />
      </div>
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Layout;
