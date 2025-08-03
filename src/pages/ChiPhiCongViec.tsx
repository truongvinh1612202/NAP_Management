import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '../utils/trpc';

const ChiPhiCongViec = () => {
  const trpc = useTRPC();
  const { data: chiPhiList, isLoading, error } = useQuery(
    trpc.chiPhiCongViec.queryOptions()
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Đang tải danh sách chi phí...</div>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(chiPhiList[0]).map((key) => (
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
                {chiPhiList.map((chiPhi: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(chiPhi).map((value, cellIndex) => (
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
            <div className="text-gray-500 text-lg">Không có dữ liệu chi phí</div>
            <p className="text-gray-400 mt-2">Chưa có chi phí nào được ghi nhận</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChiPhiCongViec;
