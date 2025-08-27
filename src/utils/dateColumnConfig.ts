import type {
  ColDef,
  ValueGetterParams,
  ValueFormatterParams,
} from "ag-grid-community";

/**
 * Creates a standardized date column configuration for AG Grid
 * Handles proper date filtering, formatting, and editing with timezone normalization
 */
export const createDateColumnConfig = <T = any>(
  field: keyof T | string,
  headerName: string,
  editable = true
): ColDef<T> => ({
  field: field as any, // Required: AG Grid's ColDef.field type is complex, this cast is necessary
  headerName,
  sortable: true,
  filter: "agDateColumnFilter",
  editable,
  valueGetter: (params: ValueGetterParams<T>) => {
    if (!params.data?.[field as keyof T]) return null;
    const date = new Date(params.data[field as keyof T] as string | Date);
    return isNaN(date.getTime()) ? null : date;
  },
  valueFormatter: (params: ValueFormatterParams<T>) => {
    if (!params.value) return "-";
    const date = new Date(params.value);
    return isNaN(date.getTime()) ? "-" : date.toLocaleDateString("vi-VN");
  },
  cellEditor: "agDateStringCellEditor",
  filterParams: {
    comparator: (filterLocalDateAtMidnight: Date, cellValue: string | Date) => {
      if (!cellValue) return -1;

      const cellDate = new Date(cellValue);
      if (isNaN(cellDate.getTime())) return -1;

      // Normalize both dates to midnight for accurate comparison
      const filterDate = new Date(
        filterLocalDateAtMidnight.getFullYear(),
        filterLocalDateAtMidnight.getMonth(),
        filterLocalDateAtMidnight.getDate()
      );
      const normalizedCellDate = new Date(
        cellDate.getFullYear(),
        cellDate.getMonth(),
        cellDate.getDate()
      );

      if (normalizedCellDate < filterDate) return -1;
      if (normalizedCellDate > filterDate) return 1;
      return 0;
    },
  },
});
