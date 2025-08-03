import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowSelectionOptions } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { trpc } from '../utils/trpc';
import type { PhieuChi } from '../../generated/client';
import { formatCurrencyVND } from '@/utils/helper';

const PhieuChi = () => {
  const { data: phieuChiList, isLoading, error } = useQuery(
    trpc.phieuChi.queryOptions()
  );

  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'soCT',
      headerName: 'Số CT',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'ngayChi',
      headerName: 'Ngày Chi',
      width: 120,
      sortable: true,
      filter: 'agDateColumnFilter',
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleDateString('vi-VN');
      }
    },
    {
      field: 'noiDung',
      headerName: 'Nội Dung',
      flex: 2,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'tenKhachHang',
      headerName: 'Khách Hàng',
      flex: 1,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'tenNhanVien',
      headerName: 'Nhân Viên',
      flex: 1,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'nhomChi',
      headerName: 'Nhóm Chi',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'soTien',
      headerName: 'Số Tiền (VNĐ)',
      width: 150,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => formatCurrencyVND(params.value),
    },
    {
      field: 'thuQuy',
      headerName: 'Thu Quỹ',
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
  }), []);

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Phiếu Chi</h1>
          <p className="text-gray-600 mt-2">Quản lý phiếu chi tiền</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Đang tải danh sách phiếu chi...</div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Phiếu Chi</h1>
          <p className="text-gray-600 mt-2">Quản lý phiếu chi tiền</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Phiếu Chi</h1>
        <p className="text-gray-600 mt-2">Quản lý phiếu chi tiền</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách phiếu chi ({phieuChiList?.length || 0})
          </h2>
        </div>

        {phieuChiList && phieuChiList.length > 0 ? (
          <div className="p-4">
            <div className="ag-theme-alpine w-full h-[60vh]">
              <AgGridReact
                rowData={phieuChiList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={50}
                rowSelection={rowSelection}
                cellSelection={true}
                animateRows={true}
                suppressMenuHide={true}
                allowContextMenuWithControlKey={true}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">Không có dữ liệu phiếu chi</div>
            <p className="text-gray-400 mt-2">Chưa có phiếu chi nào được ghi nhận</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhieuChi;
