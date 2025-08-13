import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-enterprise';
import { trpc } from '../utils/trpc';
import type { QuanLyPhiDichVu } from '../../generated/client';
import { formatCurrencyVND } from '@/utils/helper';
import { DEFAULT_GRID_OPTIONS, DEFAULT_COL_DEF, AUTO_SIZE_STRATEGY_FILL } from '@/utils/gridConfig';

const QuanLyTieuNam = () => {
  const { data: quanLyPhiDichVuList, isLoading, error } = useQuery(
    trpc.quanLyPhiDichVu.queryOptions()
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
      field: 'khachHangId',
      headerName: 'ID Khách Hàng',
      sortable: true,
      filter: 'agNumberColumnFilter',
    },
    {
      field: 'phiDichVu',
      headerName: 'Phí Dịch Vụ (VNĐ)',
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => formatCurrencyVND(params.value),
      cellStyle: { textAlign: 'left' }
    },
    {
      field: 'ngayHieuLuc',
      headerName: 'Ngày Hiệu Lực',
      sortable: true,
      filter: 'agDateColumnFilter',
      cellRenderer: (params: any) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleDateString('vi-VN');
      }
    },
    {
      field: 'ghiChu',
      headerName: 'Ghi Chú',
      flex: 2,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    }
  ], []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Đang tải dữ liệu quản lý tiêu năm...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-red-600">
          Lỗi khi tải dữ liệu: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900">Quản Lý Tiêu Năm</h1>
        <p className="text-sm text-gray-600 mt-1">
          Quản lý tiêu năm ({quanLyPhiDichVuList?.length || 0} bản ghi)
        </p>
      </div>
      
      <div className="flex-1 p-6">
        <div className="w-full h-full">
          <AgGridReact
            {...DEFAULT_GRID_OPTIONS}
            rowData={quanLyPhiDichVuList || []}
            columnDefs={columnDefs}
            defaultColDef={DEFAULT_COL_DEF}
            autoSizeStrategy={AUTO_SIZE_STRATEGY_FILL}
            overlayNoRowsTemplate='<span style="padding: 10px; border: 2px solid #444;">Không có dữ liệu phí dịch vụ</span>'
          />
        </div>
      </div>
    </div>
  );
};

export default QuanLyTieuNam;
