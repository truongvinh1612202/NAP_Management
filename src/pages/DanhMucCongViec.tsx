import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowSelectionOptions } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import { trpc } from '../utils/trpc';
import type { DanhMucCongViec } from '../../generated/client';
import { AG_GRID_LOCALE_VN } from '@ag-grid-community/locale';

const DanhMucCongViec = () => {
  const { data: congViecList, isLoading, error } = useQuery(
    trpc.danhMucCongViec.queryOptions()
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
      field: 'ten',
      headerName: 'Tên Công Việc',
      flex: 2,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
    {
      field: 'moTa',
      headerName: 'Mô Tả',
      flex: 3,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => params.value || '-'
    },
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
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Công Việc</h1>
          <p className="text-gray-600 mt-2">Quản lý danh mục công việc</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Đang tải danh sách công việc...</div>
        </div>
      </div>
    );
  }

  // Early return for error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Công Việc</h1>
          <p className="text-gray-600 mt-2">Quản lý danh mục công việc</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Danh Mục Công Việc</h1>
        <p className="text-gray-600 mt-2">Quản lý danh mục công việc</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Danh sách công việc ({congViecList?.length || 0})
          </h2>
        </div>

        {congViecList && congViecList.length > 0 ? (
          <div className="p-4">
            <div className="w-full h-[60vh]">
              <AgGridReact
                rowData={congViecList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={50}
                // rowSelection={rowSelection}
                localeText={AG_GRID_LOCALE_VN}
                cellSelection={true}
                animateRows={true}
                suppressMenuHide={true}
                rowHeight={40}
                headerHeight={45}
                allowContextMenuWithControlKey={true}
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="text-gray-500 text-lg">Không có dữ liệu công việc</div>
            <p className="text-gray-400 mt-2">Chưa có công việc nào được thêm vào hệ thống</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DanhMucCongViec;
