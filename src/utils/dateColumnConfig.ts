import type { ColDef } from "ag-grid-community";

/**
 * Creates a standardized date column configuration for AG Grid
 * Handles proper date filtering, formatting, and editing with timezone normalization
 */
export const createDateColumnConfig = <T = any>(
  field: keyof T | string,
  headerName: string,
  editable = true
): ColDef<T> => ({
  field: field as any,
  headerName,
  sortable: true,
  filter: "agDateColumnFilter",
  editable,
  valueGetter: (params: any) => {
    if (!params.data?.[field]) return null;
    const date = new Date(params.data[field]);
    return isNaN(date.getTime()) ? null : date;
  },
  valueFormatter: (params: any) => {
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
