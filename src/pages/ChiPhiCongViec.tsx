import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, RowSelectionOptions } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { trpc } from '../utils/trpc';

type ChiPhiData = {
  id: number;
  tenKhachHang: string;
  congViecId: number;
  tenCongViec: string;
  chiPhi: number;
  khId: string;
}

const ChiPhiCongViec = () => {
  const { data: chiPhiList, isLoading, error } = useQuery(
    trpc.chiPhiCongViec.queryOptions()
  );

  const data = formatRawData(chiPhiList as ChiPhiData[]);

  // Generate column definitions dynamically based on data
  const columnDefs: ColDef[] = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    const firstRow = data[0];
    return Object.keys(firstRow).map((key) => ({
      field: key,
      headerName: key,
      sortable: true,
      filter: true,
      resizable: true,
      cellRenderer: (params: any) => {
        const value = params.value;
        if (value === null || value === undefined) {
          return '-';
        }
        return String(value);
      }
    }));
  }, [chiPhiList]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    resizable: true,
  }), []);

  const rowSelection: RowSelectionOptions = useMemo(() => ({
    mode: 'multiRow' as const,
  }), []);

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
            Danh sách chi phí ({data?.length || 0})
          </h2>
        </div>

        {data && data.length > 0 ? (
          <div className="p-4">
            <div className="ag-theme-alpine w-full h-[60vh]">
              <AgGridReact
                rowData={data}
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
            <div className="text-gray-500 text-lg">Không có dữ liệu chi phí</div>
            <p className="text-gray-400 mt-2">Chưa có chi phí nào được ghi nhận</p>
          </div>
        )}
      </div>
    </div>
  );
};

function formatRawData(rawData: ChiPhiData[]) {
  return rawData.map(item => ({
    'ID': item.id,
    'Khách Hàng': item.tenKhachHang,
    'Công Việc ID': item.congViecId,
    'Tên Công Việc': item.tenCongViec,
    'Chi Phí': item.chiPhi,
    'Khách Hàng ID': item.khId,
  }));
}

export default ChiPhiCongViec;
