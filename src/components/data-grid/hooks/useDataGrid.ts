import { useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { GridApi, GridReadyEvent } from 'ag-grid-community';

interface UseDataGridProps<T> {
  gridRef: React.RefObject<AgGridReact<T>>;
  onGridReady?: (params: GridReadyEvent) => void;
  onGridSizeChanged?: () => void;
}

export const useDataGrid = <T,>({
  gridRef,
  onGridReady: onGridReadyProp,
  onGridSizeChanged: onGridSizeChangedProp,
}: UseDataGridProps<T>) => {
  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      onGridReadyProp?.(params);
    },
    [onGridReadyProp]
  );

  const handleGridSizeChanged = useCallback(() => {
    const { current: gridInstance } = gridRef;
    if (gridInstance) {
      gridInstance.api.sizeColumnsToFit();
      onGridSizeChangedProp?.();
    }
  }, [gridRef, onGridSizeChangedProp]);

  const getGridApi = useCallback((): GridApi | null => {
    return gridRef.current?.api ?? null;
  }, [gridRef]);

  // In AG Grid v28+, ColumnApi methods are now available directly on GridApi
  const getColumnApi = useCallback((): GridApi | null => {
    return gridRef.current?.api ?? null;
  }, [gridRef]);

  return {
    handleGridReady,
    handleGridSizeChanged,
    getGridApi,
    getColumnApi,
  };
};
