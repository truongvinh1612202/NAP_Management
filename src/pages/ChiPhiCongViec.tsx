import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowSelectionOptions } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { trpc } from '../utils/trpc';
import type { ChiPhiCongViec } from '../../generated/client';
import { formatCurrencyVND } from '@/utils/helper';
import { AG_GRID_LOCALE_VN } from '@ag-grid-community/locale';

const ChiPhiCongViec = () => {
  const { data: chiPhiList, isLoading, error } = useQuery(
    trpc.chiPhiCongViec.queryOptions()
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
      field: 'tenKhachHang',
      headerName: 'Khách Hàng',
      flex: 1,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'congViecId',
      headerName: 'Mã Công Việc',
      width: 120,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'tenCongViec',
      headerName: 'Tên Công Việc',
      flex: 2,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'chiPhi',
      headerName: 'Chi Phí (VNĐ)',
      width: 150,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => {
        if (params.value === null || params.value === undefined) return '-';
        return formatCurrencyVND(params.value);
      }
    },
    {
      field: 'khId',
      headerName: 'Mã KH',
      width: 100,
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
          <h1 className="text-2xl font-bold text-gray-900">Chi Phí Công Việc</h1>
          <p className="text-gray-600 mt-2">Theo dõi chi phí cho các công việc</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Đang tải danh sách chi phí...</div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Chi Phí Công Việc</h1>
          <p className="text-gray-600 mt-2">Theo dõi chi phí cho các công việc</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Chi Phí Công Việc</h1>
        <p className="text-gray-600 mt-2">Theo dõi chi phí cho các công việc</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách chi phí ({chiPhiList?.length || 0})
          </h2>
        </div>

        {chiPhiList && chiPhiList.length > 0 ? (
          <div className="p-4">
            <div className="ag-theme-alpine w-full h-[60vh]">
              <AgGridReact
                rowData={chiPhiList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={50}
                // rowSelection={rowSelection}
                localeText={AG_GRID_LOCALE_VN}
                cellSelection={true}
                rowHeight={40}
                headerHeight={45}
                animateRows={true}
                suppressMenuHide={true}
                allowContextMenuWithControlKey={true}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">Không có dữ liệu chi phí</div>
            <p className="text-gray-400 mt-2">Chưa có chi phí nào được ghi nhận</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChiPhiCongViec;