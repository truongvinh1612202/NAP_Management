import { SortModelItem, IFilterDef, IFilter, IRowNode } from 'ag-grid-community';

export interface ServerSideGetRowsRequest {
  // First row index for the current data request
  startRow: number;
  // Last row index (exclusive) for the current data request
  endRow: number;
  // Array of sort models
  sortModel: SortModelItem[];
  // Filter model object containing column filters
  filterModel: {
    [key: string]: any;
  };
  // Context object
  context: any;
  // Array of column IDs being grouped by
  rowGroupCols: any[];
  // Array of column IDs being aggregated
  valueCols: any[];
  // Array of column IDs being pivoted
  pivotCols: any[];
  // Whether pivot mode is active
  pivotMode: boolean;
  // Groups the data is being requested for
  groupKeys: string[];
  // Whether to use the server-side row model
  rowModelType: 'serverSide';
}

export interface ServerSideGetRowsResponse<T = any> {
  // Data for the current block of rows
  rowsThisBlock: T[];
  // Total number of rows (if known)
  lastRow?: number;
  // Any secondary column definitions
  secondaryColumnDefs?: any[];
}

export interface ColumnDefinition<T = any> {
  field: string;
  headerName?: string;
  sortable?: boolean;
  filter?: boolean | string | { new (): IFilter } | IFilterDef;
  filterParams?: any;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  hide?: boolean;
  resizable?: boolean;
  pinned?: 'left' | 'right';
  sort?: 'asc' | 'desc' | null;
  sortIndex?: number | null;
  rowGroup?: boolean;
  rowGroupIndex?: number | null;
  pivot?: boolean;
  pivotIndex?: number | null;
  aggFunc?: string | null;
  cellRenderer?: any;
  cellRendererParams?: any;
  valueGetter?: (params: any) => any;
  valueFormatter?: (params: any) => string;
  valueParser?: (params: any) => any;
  comparator?: (valueA: any, valueB: any, nodeA: IRowNode, nodeB: IRowNode, isInverted: boolean) => number;
  // Add any other ag-Grid column properties as needed
  [key: string]: any;
}

export interface GridApiResponse<T> {
  data: T[];
  total: number;
  success: boolean;
  error?: string;
}

export interface GridState {
  sortModel: SortModelItem[];
  filterModel: any;
  columnState: any[];
  columnGroupState: any[];
}
