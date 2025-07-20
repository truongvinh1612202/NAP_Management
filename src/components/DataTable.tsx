import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Define sample data interface
interface RowData {
  id: number;
  name: string;
  status: string;
  date: string;
  progress: number;
}

interface StatusCellRendererParams {
  value: string;
}

interface ProgressCellRendererParams {
  value: number;
}

const DataTable = () => {
  const [rowData, setRowData] = useState<RowData[]>([]);
  
  // Define column definitions with proper typing
  const [columnDefs] = useState<ColDef<RowData>[]>([
    { 
      field: 'id' as keyof RowData, 
      headerName: 'ID', 
      sortable: true, 
      filter: true, 
      width: 70 
    },
    { 
      field: 'name' as keyof RowData, 
      headerName: 'Name', 
      sortable: true, 
      filter: true 
    },
    { 
      field: 'status' as keyof RowData, 
      headerName: 'Status', 
      sortable: true, 
      filter: true,
      cellRenderer: (params: StatusCellRendererParams) => {
        const status = params.value;
        let className = '';
        
        switch(status) {
          case 'Active':
            className = 'bg-green-100 text-green-800';
            break;
          case 'Pending':
            className = 'bg-yellow-100 text-yellow-800';
            break;
          case 'Inactive':
            className = 'bg-red-100 text-red-800';
            break;
          default:
            className = '';
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
            {status}
          </span>
        );
      }
    },
    { 
      field: 'date' as keyof RowData, 
      headerName: 'Date', 
      sortable: true, 
      filter: true 
    },
    { 
      field: 'progress' as keyof RowData, 
      headerName: 'Progress', 
      sortable: true, 
      filter: true,
      cellRenderer: (params: ProgressCellRendererParams) => {
        const value = params.value;
        return (
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${value}%` }}
              ></div>
            </div>
            <span className="ml-2 text-xs">{value}%</span>
          </div>
        );
      }
    },
  ]);

  const defaultColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
  };

  useEffect(() => {
    // Simulate loading data from API
    const fakeData: RowData[] = [
      { id: 1, name: 'Project Alpha', status: 'Active', date: '2025-07-15', progress: 75 },
      { id: 2, name: 'Project Beta', status: 'Pending', date: '2025-07-16', progress: 30 },
      { id: 3, name: 'Project Gamma', status: 'Inactive', date: '2025-07-17', progress: 10 },
      { id: 4, name: 'Project Delta', status: 'Active', date: '2025-07-18', progress: 50 },
      { id: 5, name: 'Project Epsilon', status: 'Active', date: '2025-07-19', progress: 90 },
      { id: 6, name: 'Project Zeta', status: 'Pending', date: '2025-07-20', progress: 25 },
      { id: 7, name: 'Project Eta', status: 'Inactive', date: '2025-07-21', progress: 0 },
      { id: 8, name: 'Project Theta', status: 'Active', date: '2025-07-22', progress: 60 },
      { id: 9, name: 'Project Iota', status: 'Active', date: '2025-07-23', progress: 45 },
      { id: 10, name: 'Project Kappa', status: 'Pending', date: '2025-07-24', progress: 15 },
    ];
    
    setRowData(fakeData);
  }, []);

  return (
    <div className="ag-theme-alpine w-full h-full">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={5}
        rowSelection="multiple"
        enableRangeSelection={true}
        suppressRowClickSelection={true}
        groupSelectsChildren={true}
        animateRows={true}
      />
    </div>
  );
};

export default DataTable;
