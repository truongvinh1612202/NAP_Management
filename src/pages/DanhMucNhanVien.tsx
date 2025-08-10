import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowSelectionOptions } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { trpc } from '../utils/trpc';
import type { DanhMucNhanVien } from '../../generated/client';
import NhanVienKhachHangModal from '../components/NhanVienKhachHangModal';

const DanhMucNhanVien = () => {
  const { data: nhanVienList, isLoading, error } = useQuery(
    trpc.danhMucNhanVien.queryOptions()
  );

  const [selectedNhanVienForKhachHang, setSelectedNhanVienForKhachHang] = useState<DanhMucNhanVien | null>(null);

  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Chi tiết NV',
      field: 'actions',
      cellRenderer: (params: any) => (
        <div className="flex items-center justify-center h-full w-full">
          <button
            className="w-full h-5 px-0 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none flex items-center justify-center"
            tabIndex={0}
            aria-label={`Xem khách hàng phụ trách của ${params.data.tenNhanVien}`}
            onClick={() => setSelectedNhanVienForKhachHang(params.data)}
          >
            Khách Hàng
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
      width: 80,
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'maSoNhanVien',
      headerName: 'Mã Số NV',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'tenNhanVien',
      headerName: 'Tên Nhân Viên',
      flex: 2,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'namSinh',
      headerName: 'Năm Sinh',
      width: 120,
      sortable: true,
      filter: 'agDateColumnFilter',
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleDateString('vi-VN');
      }
    },
    {
      field: 'dienThoai',
      headerName: 'Điện Thoại',
      width: 140,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'thuongTru',
      headerName: 'Thường Trú',
      flex: 2,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'userDangNhap',
      headerName: 'User Đăng Nhập',
      width: 150,
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
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Nhân Viên</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin nhân viên</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Đang tải danh sách nhân viên...</div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Nhân Viên</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin nhân viên</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Danh Mục Nhân Viên</h1>
        <p className="text-gray-600 mt-2">Quản lý thông tin nhân viên</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách nhân viên ({nhanVienList?.length || 0})
          </h2>
        </div>

        {nhanVienList && nhanVienList.length > 0 ? (
          <div className="p-4">
            <div className="ag-theme-alpine w-full h-[60vh]">
              <AgGridReact
                rowData={nhanVienList}
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
              />
            </div>
            <NhanVienKhachHangModal
              nhanVien={selectedNhanVienForKhachHang}
              isOpen={!!selectedNhanVienForKhachHang}
              onClose={() => setSelectedNhanVienForKhachHang(null)}
            />
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">Không có dữ liệu nhân viên</div>
            <p className="text-gray-400 mt-2">Chưa có nhân viên nào được thêm vào hệ thống</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DanhMucNhanVien;
