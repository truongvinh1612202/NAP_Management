import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowSelectionOptions } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { trpc } from '../utils/trpc';
import type { PhieuThu } from '../../generated/client';

const PhieuThu = () => {
  const { data: phieuThuList, isLoading, error } = useQuery(
    trpc.phieuThu.queryOptions()
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
      field: 'ngayThu',
      headerName: 'Ngày Thu',
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
      field: 'nhomThu',
      headerName: 'Nhóm Thu',
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
      cellRenderer: (params: any) => formatCurrencyVND(params.value)
    },
    {
      field: 'tienMat',
      headerName: 'Tiền Mặt (VNĐ)',
      width: 150,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => {
        if (params.value === null || params.value === undefined) return '-';
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(params.value);
      }
    },
    {
      field: 'chuyenKhoan',
      headerName: 'Chuyển Khoản (VNĐ)',
      width: 150,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => {
        if (params.value === null || params.value === undefined) return '-';
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(params.value);
      }
    },
    {
      field: 'taiKhoan',
      headerName: 'Tài Khoản',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'ghiChu',
      headerName: 'Ghi Chú',
      flex: 1,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    }
  ], []);

  const rowSelection: RowSelectionOptions = useMemo(() => ({
    mode: 'multiRow',
    checkboxes: false,
    headerCheckbox: false,
    enableClickSelection: true,
  }), []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Đang tải dữ liệu phiếu thu...</div>
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
        <h1 className="text-2xl font-semibold text-gray-900">Phiếu Thu</h1>
        <p className="text-sm text-gray-600 mt-1">
          Quản lý phiếu thu tiền ({phieuThuList?.length || 0} phiếu)
        </p>
      </div>
      
      <div className="flex-1 p-6">
        <div className="ag-theme-alpine w-full h-full">
          <AgGridReact
            rowData={phieuThuList || []}
            columnDefs={columnDefs}
            pagination={true}
            paginationPageSize={20}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
              minWidth: 100,
            }}
            rowSelection={rowSelection}
            enableRangeSelection={true}
            enableFillHandle={true}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            animateRows={true}
            rowHeight={40}
            headerHeight={45}
            overlayNoRowsTemplate='<span style="padding: 10px; border: 2px solid #444;">Không có dữ liệu phiếu thu</span>'
          />
        </div>
      </div>
    </div>
  );
};

export default PhieuThu;
