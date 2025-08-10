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
            <h1 className="text-2xl font-bold mb-6 text-[#3A2E7D]">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div 
                className="bg-[#6C63FF] text-white p-4 rounded-lg cursor-pointer hover:bg-[#3A2E7D] transition-colors"
                onClick={() => setActiveView('khachhang')}
              >
                <h3 className="text-lg font-semibold mb-2">👥 Khách Hàng</h3>
                <p className="text-sm text-[#E6E1FA]">Quản lý thông tin khách hàng</p>
              </div>
              <div 
                className="bg-[#3A2E7D] text-white p-4 rounded-lg cursor-pointer hover:bg-[#6C63FF] transition-colors"
                onClick={() => setActiveView('nhanvien')}
              >
                <h3 className="text-lg font-semibold mb-2">👨‍💼 Nhân Viên</h3>
                <p className="text-sm text-[#E6E1FA]">Quản lý thông tin nhân viên</p>
              </div>
              <div 
                className="bg-[#E6E1FA] text-[#3A2E7D] p-4 rounded-lg cursor-pointer border border-[#6C63FF] hover:bg-[#6C63FF] hover:text-white transition-colors"
                onClick={() => setActiveView('congviec')}
              >
                <h3 className="text-lg font-semibold mb-2">📋 Công Việc</h3>
                <p className="text-sm text-[#3A2E7D]">Quản lý công việc và dự án</p>
              </div>
              <div 
                className="bg-[#6EFACC] text-[#3A2E7D] p-4 rounded-lg cursor-pointer hover:bg-[#6C63FF] hover:text-white transition-colors"
                onClick={() => setActiveView('chiphi')}
              >
                <h3 className="text-lg font-semibold mb-2">💰 Chi Phí</h3>
                <p className="text-sm text-[#3A2E7D]">Theo dõi chi phí công việc</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#E6E1FA]">
      <div className="w-64 bg-[#3A2E7D] shadow-md">
        <NavigationMenu onItemClick={setActiveView} />
      </div>
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Layout;
