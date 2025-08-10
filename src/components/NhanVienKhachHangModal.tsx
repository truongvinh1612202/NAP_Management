import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { trpc } from '../utils/trpc';
import type { DanhMucNhanVien, DanhMucKhachHang } from '../../generated/client';
import { AG_GRID_LOCALE_VN } from '@ag-grid-community/locale';

interface NhanVienKhachHangModalProps {
  nhanVien: DanhMucNhanVien | null;
  isOpen: boolean;
  onClose: () => void;
}

type ResponsibilityType = 'DVKH' | 'LAPSO' | 'NSL';

const RESPONSIBILITY_LABELS: Record<ResponsibilityType, string> = {
  DVKH: 'Dịch Vụ Khách Hàng',
  LAPSO: 'Lập Sổ',
  NSL: 'Nghiệp Sự Luật'
};

const NhanVienKhachHangModal: React.FC<NhanVienKhachHangModalProps> = ({ nhanVien, isOpen, onClose }) => {
  const [selectedResponsibility, setSelectedResponsibility] = useState<ResponsibilityType>('DVKH');

  // Fetch customers for each responsibility type
  const { data: khachHangDVKH, isLoading: isLoadingDVKH } = useQuery({
    ...trpc.khachHangByNhanVien.queryOptions({ 
      nhanVienId: nhanVien?.id || 0,
      nhanVienType: 'DVKH'
    }),
    enabled: !!nhanVien?.id && isOpen
  });

  const { data: khachHangLAPSO, isLoading: isLoadingLAPSO } = useQuery({
    ...trpc.khachHangByNhanVien.queryOptions({ 
      nhanVienId: nhanVien?.id || 0,
      nhanVienType: 'LAPSO'
    }),
    enabled: !!nhanVien?.id && isOpen
  });

  const { data: khachHangNSL, isLoading: isLoadingNSL } = useQuery({
    ...trpc.khachHangByNhanVien.queryOptions({ 
      nhanVienId: nhanVien?.id || 0,
      nhanVienType: 'NSL'
    }),
    enabled: !!nhanVien?.id && isOpen
  });

  // Get current data based on selected responsibility
  const currentData = useMemo(() => {
    switch (selectedResponsibility) {
      case 'DVKH': return khachHangDVKH || [];
      case 'LAPSO': return khachHangLAPSO || [];
      case 'NSL': return khachHangNSL || [];
      default: return [];
    }
  }, [selectedResponsibility, khachHangDVKH, khachHangLAPSO, khachHangNSL]);

  // Get current loading state
  const isLoading = useMemo(() => {
    switch (selectedResponsibility) {
      case 'DVKH': return isLoadingDVKH;
      case 'LAPSO': return isLoadingLAPSO;
      case 'NSL': return isLoadingNSL;
      default: return false;
    }
  }, [selectedResponsibility, isLoadingDVKH, isLoadingLAPSO, isLoadingNSL]);

  // Get counts for each responsibility type
  const counts = useMemo(() => ({
    DVKH: khachHangDVKH?.length || 0,
    LAPSO: khachHangLAPSO?.length || 0,
    NSL: khachHangNSL?.length || 0
  }), [khachHangDVKH, khachHangLAPSO, khachHangNSL]);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      sortable: true,
      filter: 'agNumberColumnFilter',
      maxWidth: 80,
    },
    {
      field: 'tenKhachHang',
      headerName: 'Tên Khách Hàng',
      sortable: true,
      filter: 'agTextColumnFilter',
      flex: 2,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'maSoThue',
      headerName: 'Mã Số Thuế',
      sortable: true,
      filter: 'agTextColumnFilter',
      flex: 1,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'dienThoai',
      headerName: 'Điện Thoại',
      sortable: true,
      filter: 'agTextColumnFilter',
      maxWidth: 130,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'nganhKD',
      headerName: 'Ngành KD',
      sortable: true,
      filter: 'agTextColumnFilter',
      flex: 1,
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'trangThai',
      headerName: 'Trạng Thái',
      sortable: true,
      filter: 'agTextColumnFilter',
      maxWidth: 120,
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        let className = '';
        switch (params.value) {
          case 'Đang hoạt động':
          case 'Đang cung cấp dịch vụ':
            className = 'bg-green-100 text-green-800';
            break;
          case 'Ngưng cung cấp dịch vụ':
          case 'Pending':
            className = 'bg-yellow-100 text-yellow-800';
            break;
          case 'Không hoạt động':
          case 'Inactive':
            className = 'bg-red-100 text-red-800';
            break;
          default:
            className = 'bg-gray-100 text-gray-800';
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
            {params.value}
          </span>
        );
      }
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Khách Hàng Phụ Trách - {nhanVien?.tenNhanVien}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Mã NV: {nhanVien?.maSoNhanVien}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Đóng modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Responsibility Type Selector */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Loại trách nhiệm:</span>
            
            {(Object.keys(RESPONSIBILITY_LABELS) as ResponsibilityType[]).map(type => {
              const isSelected = type === selectedResponsibility;
              const count = counts[type];
              return (
                <button
                  key={type}
                  onClick={() => setSelectedResponsibility(type)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    isSelected 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {RESPONSIBILITY_LABELS[type]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <div className="text-lg">Đang tải danh sách khách hàng...</div>
              </div>
            </div>
          ) : currentData.length > 0 ? (
            <div className="w-full h-full">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  {RESPONSIBILITY_LABELS[selectedResponsibility]} - {currentData.length} khách hàng
                </h3>
              </div>
              <div className="ag-theme-alpine w-full h-[calc(100%-3rem)]">
                <AgGridReact
                  rowData={currentData}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  pagination={true}
                  paginationPageSize={20}
                  animateRows={true}
                  suppressMenuHide={true}
                  localeText={AG_GRID_LOCALE_VN}
                  rowHeight={40}
                  headerHeight={45}
                  allowContextMenuWithControlKey={true}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">
                  Không có khách hàng trong {RESPONSIBILITY_LABELS[selectedResponsibility]}
                </div>
                <p className="text-gray-400">
                  Nhân viên này chưa được phân công khách hàng nào cho loại trách nhiệm này
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NhanVienKhachHangModal;
