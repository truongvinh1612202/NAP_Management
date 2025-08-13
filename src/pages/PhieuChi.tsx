import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-enterprise';
import { trpc } from '../utils/trpc';
import type { PhieuChi } from '../../generated/client';
import { formatCurrencyVND } from '@/utils/helper';
import { DEFAULT_GRID_OPTIONS, DEFAULT_COL_DEF, AUTO_SIZE_STRATEGY } from '@/utils/gridConfig';

const PhieuChi = () => {
  const { data: phieuChiList, isLoading, error } = useQuery(
    trpc.phieuChi.queryOptions()
  );

  // Column definitions map directly to Prisma fields
  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'id',
      headerName: 'ID',
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'soCT',
      headerName: 'Số CT',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'ngayChi',
      headerName: 'Ngày Chi',
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
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'tenKhachHang',
      headerName: 'Khách Hàng',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'tenNhanVien',
      headerName: 'Nhân Viên',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'nhomChi',
      headerName: 'Nhóm Chi',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'soTien',
      headerName: 'Số Tiền (VNĐ)',
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => formatCurrencyVND(params.value),
    },
    {
      field: 'thuQuy',
      headerName: 'Thu Quỹ',
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    }
  ], []);

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
            <div className="w-full h-[60vh]">
              <AgGridReact
                {...DEFAULT_GRID_OPTIONS}
                rowData={phieuChiList}
                columnDefs={columnDefs}
                defaultColDef={DEFAULT_COL_DEF}
                autoSizeStrategy={AUTO_SIZE_STRATEGY}
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
