import { AgGridReact } from 'ag-grid-react';
import { AgGridReactProps } from 'ag-grid-react';
import { useMemo, useRef } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { useDataGrid } from './hooks/useDataGrid';

export interface DataGridProps<T> extends AgGridReactProps<T> {
  columnDefs: ColDef<T>[];
  defaultColDef?: ColDef<T>;
  onGridReady?: (params: GridReadyEvent) => void;
  onGridSizeChanged?: () => void;
  className?: string;
}

export const DataGrid = <T,>({
  columnDefs,
  defaultColDef: defaultColDefProp,
  onGridReady: onGridReadyProp,
  onGridSizeChanged: onGridSizeChangedProp,
  className = '',
  ...props
}: DataGridProps<T>) => {
  const gridRef = useRef<AgGridReact<T>>(null);
  
  const { handleGridReady, handleGridSizeChanged } = useDataGrid<T>({
    gridRef,
    onGridReady: onGridReadyProp,
    onGridSizeChanged: onGridSizeChangedProp,
  });

  const defaultColDef = useMemo<ColDef<T>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      ...defaultColDefProp,
    }),
    [defaultColDefProp]
  );

  return (
    <div 
      className={`ag-theme-alpine h-full w-full ${className}`}
      role="grid"
      aria-label="Data Grid"
    >
      <AgGridReact<T>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={handleGridReady}
        onGridSizeChanged={handleGridSizeChanged}
        rowModelType="serverSide"
        suppressCellFocus={false}
        suppressRowClickSelection={true}
        rowSelection={'multiple'}
        {...props}
      />
    </div>
  );
};
