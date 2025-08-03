import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';

const DanhMucNhanVien = () => {
  const { data: nhanVienList, isLoading, error } = useQuery(
    trpc.danhMucNhanVien.queryOptions()
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Đang tải danh sách nhân viên...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500 text-lg">
          Lỗi khi tải dữ liệu: {error.message}
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(nhanVienList[0]).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {nhanVienList.map((nhanVien: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(nhanVien).map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {value !== null && value !== undefined 
                          ? String(value) 
                          : '-'
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
