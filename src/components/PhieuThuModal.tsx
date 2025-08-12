import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import { trpc } from '../utils/trpc';
import type { PhieuThu, DanhMucKhachHang } from '../../generated/client';
import { formatCurrencyVND } from '@/utils/helper';
import { AG_GRID_LOCALE_VN } from '@ag-grid-community/locale';


interface PhieuThuModalProps {
  khachHang: DanhMucKhachHang | null;
  isOpen: boolean;
  onClose: () => void;
}

const PhieuThuModal: React.FC<PhieuThuModalProps> = ({ khachHang, isOpen, onClose }) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const { data: phieuThuList, isLoading, error } = useQuery({
    ...trpc.phieuThuByKhachHang.queryOptions({ 
      khachHangId: khachHang?.id || 0 
    }),
    enabled: !!khachHang?.id && isOpen
  });

  // Filter PhieuThu by selected month across all years, sorted by year descending
  const filteredPhieuThu = useMemo(() => {
    if (!phieuThuList) return [];
    
    return phieuThuList
      .filter(phieu => {
        if (!phieu.ngayThu) return false;
        const phieuDate = new Date(phieu.ngayThu);
        return phieuDate.getMonth() + 1 === selectedMonth;
      })
      .sort((a, b) => {
        if (!a.ngayThu || !b.ngayThu) return 0;
        const dateA = new Date(a.ngayThu);
        const dateB = new Date(b.ngayThu);
        // Sort by year descending, then by date descending within the same year
        if (dateA.getFullYear() !== dateB.getFullYear()) {
          return dateB.getFullYear() - dateA.getFullYear();
        }
        return dateB.getTime() - dateA.getTime();
      });
  }, [phieuThuList, selectedMonth]);

  // Get available months from data
  const availableMonths = useMemo(() => {
    if (!phieuThuList) return [];
    
    const months = new Set<number>();
    phieuThuList.forEach(phieu => {
      if (phieu.ngayThu) {
        const date = new Date(phieu.ngayThu);
        months.add(date.getMonth() + 1);
      }
    });
    
    return Array.from(months).sort((a, b) => a - b);
  }, [phieuThuList]);

  // Calculate total amount for selected month across all years
  const totalAmount = useMemo(() => {
    return filteredPhieuThu.reduce((sum, phieu) => sum + (phieu.soTien || 0), 0);
  }, [filteredPhieuThu]);

  // Get years that have data for the selected month
  const yearsWithData = useMemo(() => {
    const years = new Set<number>();
    filteredPhieuThu.forEach(phieu => {
      if (phieu.ngayThu) {
        years.add(new Date(phieu.ngayThu).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [filteredPhieuThu]);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'ngayThu',
      headerName: 'Năm',
      filter: 'agNumberColumnFilter',
      suppressFilter: true,
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        return new Date(params.value).getFullYear();
      },
      // maxWidth: 100,
    },
    {
      field: 'ngayThu',
      headerName: 'Ngày Thu',
      sortable: true,
      filter: 'agDateColumnFilter',
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleDateString('vi-VN');
      },
      // maxWidth: 120,
    },
    {
      field: 'noiDung',
      headerName: 'Nội Dung',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-',
      flex: 1,
    },
    {
      field: 'soTien',
      headerName: 'Số Tiền',
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => formatCurrencyVND(params.value || 0),
      cellStyle: { textAlign: 'right' },
    },
    {
      field: 'soCT',
      headerName: 'Số CT',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-',
    },
    {
      field: 'tenNhanVien',
      headerName: 'Nhân Viên',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-',
    },
    {
      field: 'thuQuy',
      headerName: 'Thu Quỹ',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-',
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  const autoSizeStrategy = useMemo(() => ({
    type: "fitCellContents" as const,
    defaultMaxWidth: 500,
    defaultMinWidth: 30,
  }), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Phiếu Thu - {khachHang?.tenKhachHang}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              MST: {khachHang?.maSoThue}
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

        {/* Month Selector */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="month-select" className="text-sm font-medium text-gray-700">
                Tháng:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    Tháng {month}
                  </option>
                ))}
              </select>
            </div>tsc

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Năm có dữ liệu: {yearsWithData.join(', ') || 'Không có'}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">
                Tổng tiền: <span className="text-blue-600 font-semibold">{formatCurrencyVND(totalAmount)}</span>
              </span>
            </div>
          </div>

          {/* Quick month navigation */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {availableMonths.map(month => {
              const isSelected = month === selectedMonth;
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    isSelected 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tháng {month}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-lg">Đang tải dữ liệu phiếu thu...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-red-500 text-lg">
                Lỗi khi tải dữ liệu: {error.message}
              </div>
            </div>
          ) : filteredPhieuThu.length > 0 ? (
            <div className="w-full h-full">
              <AgGridReact
                rowData={filteredPhieuThu}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={20}
                animateRows={true}
                cellSelection={true}
                rowHeight={40}
                localeText={AG_GRID_LOCALE_VN}
                headerHeight={45}
                allowContextMenuWithControlKey={true}
                autoSizeStrategy={autoSizeStrategy}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">
                  Không có phiếu thu trong tháng {selectedMonth}
                </div>
                <p className="text-gray-400">
                  Chọn tháng khác để xem dữ liệu
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhieuThuModal;
