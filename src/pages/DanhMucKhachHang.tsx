import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowSelectionOptions } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { trpc } from '../utils/trpc';
import type { DanhMucKhachHang } from '../../generated/client';
import { formatCurrencyVND } from '@/utils/helper';
import { useState } from 'react';
import DetailModal from '../components/DetailModal';

const DanhMucKhachHang = () => {
  const { data: khachHangList, isLoading, error } = useQuery(
    trpc.danhMucKhachHang.queryOptions()
  );
  const [selectedRow, setSelectedRow] = useState<DanhMucKhachHang | null>(null);
  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Chi tiết',
      field: 'details',
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full w-full">
          <button
            className="w-full h-5 px-0 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none flex items-center justify-center"
            tabIndex={0}
            aria-label={`${params.data.tenKhachHang}`}
            onClick={() => setSelectedRow(params.data)}
          >
            Chi tiết
          </button>
        </div>
      ),
      suppressMenu: true,
      sortable: false,
      filter: false,
      maxWidth: 120,
      pinned: 'right',
    },
    {
      headerName: 'Phí dịch vụ',
      field: 'actions',
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full w-full">
          <button
            className="w-full h-5 px-0 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none flex items-center justify-center"
            tabIndex={0}
            aria-label={`${params.data.tenKhachHang}`}
            onClick={() => setSelectedRow(params.data)}
          >
            Phí dịch vụ
          </button>
        </div>
      ),
      suppressMenu: true,
      sortable: false,
      filter: false,
      maxWidth: 120,
      pinned: 'right',
    },
    {
      field: 'id',
      headerName: 'ID',
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'tenKhachHang',
      headerName: 'Tên Khách Hàng',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'maSoThue',
      headerName: 'Mã Số Thuế',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'diaChi',
      headerName: 'Địa Chỉ',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'dienThoai',
      headerName: 'Điện Thoại',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'nganhKD',
      headerName: 'Ngành Kinh Doanh',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'cqtQuanLy',
      headerName: 'CQT Quản Lý',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'nhanVienDVKH',
      headerName: 'Nhân Viên DVKH',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'nhanVienLapSo',
      headerName: 'Nhân Viên Lập Sổ',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'nhanVienNSL',
      headerName: 'Nhân Viên NSL',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  const autoSizeStrategy = useMemo(() => ({
    type: "fitCellContents" as const ,
    defaultMaxWidth: 500,
    defaultMinWidth: 30,
  }), []);

  const rowSelection: RowSelectionOptions = useMemo(() => ({
    mode: 'multiRow' as const,
    checkboxes: false,
    headerCheckbox: false,
    enableClickSelection: true,
  }), []);

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Khách Hàng</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin khách hàng</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Đang tải danh sách khách hàng...</div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Khách Hàng</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin khách hàng</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500 text-lg">
            Lỗi khi tải dữ liệu: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Danh Mục Khách Hàng</h1>
        <p className="text-gray-600 mt-2">Quản lý thông tin khách hàng</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách khách hàng ({khachHangList?.length || 0})
          </h2>
        </div>

        {khachHangList && khachHangList.length > 0 ? (
          <div className="p-4">
            <div className="ag-theme-alpine w-auto h-[60vh]" tabIndex={0} aria-label="Bảng khách hàng">
              <AgGridReact
                rowData={khachHangList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={50}
                // rowSelection={rowSelection}
                cellSelection={true}
                animateRows={true}
                suppressMenuHide={true}
                rowHeight={40}
                headerHeight={45}
                allowContextMenuWithControlKey={true}
                autoSizeStrategy={autoSizeStrategy}
              />
            </div>
            <DetailModal
              data={selectedRow}
              title="Thông tin khách hàng"
              onClose={() => setSelectedRow(null)}
            />
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">Không có dữ liệu khách hàng</div>
            <p className="text-gray-400 mt-2">Chưa có khách hàng nào được thêm vào hệ thống</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DanhMucKhachHang;
