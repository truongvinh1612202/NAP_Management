import { GridOptions } from 'ag-grid-community';
import { AG_GRID_LOCALE_VN } from '@ag-grid-community/locale';

/**
 * Auto-sizing strategy for grids
 */
export const AUTO_SIZE_STRATEGY = {
  type: "fitCellContents" as const,
  defaultMaxWidth: 500,
  defaultMinWidth: 30,
};


/**
 * Default AG Grid configuration for consistent behavior across the application
 */
export const DEFAULT_GRID_OPTIONS: Partial<GridOptions> = {
  // Pagination
  pagination: true,
  paginationPageSize: 50,
  paginationPageSizeSelector: [20, 50, 100],
  
  // Selection
  cellSelection: true,
  
  // UI/UX
  animateRows: true,
  suppressMenuHide: true,
  rowHeight: 40,
  headerHeight: 45,
  allowContextMenuWithControlKey: true,
  
  // Localization
  localeText: AG_GRID_LOCALE_VN,

  // Size
  autoSizeStrategy: AUTO_SIZE_STRATEGY,
  
  // No rows template
  overlayNoRowsTemplate: '<span style="padding: 10px; border: 2px solid #444;">Không có dữ liệu</span>',
};

/**
 * Default column definitions for consistent behavior
 */
export const DEFAULT_COL_DEF = {
  resizable: true,
  sortable: true,
  filter: true,
  minWidth: 100,
};

/**
 * Specific grid options for different page types
 */
export const PAGE_GRID_OPTIONS = {
  // For master data pages (like DanhMuc pages)
  masterData: {
    ...DEFAULT_GRID_OPTIONS,
    paginationPageSize: 50,
  },
  
  
  // For detail/report pages
  detail: {
    ...DEFAULT_GRID_OPTIONS,
    paginationPageSize: 20,
    suppressPaginationPanel: false,
  },
  
  // For modal grids (smaller, more focused)
  modal: {
    ...DEFAULT_GRID_OPTIONS,
    paginationPageSize: 20,
    // suppressPaginationPanel: false,
    rowHeight: 35,
    headerHeight: 40,
  }
};

/**
 * Common cell renderers
 */
export const CELL_RENDERERS = {
  // Default text renderer with fallback
  text: (params: any) => params.value || '-',
  
  // Currency renderer
  currency: (params: any) => {
    if (params.value === null || params.value === undefined) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(params.value);
  },
  
  // Date renderer
  date: (params: any) => {
    if (!params.value) return '-';
    console.log("Date: ", new Date(params.value).toLocaleDateString('vi-VN'));
    return new Date(params.value).toLocaleDateString('vi-VN');
  },
  
  // Year renderer
  year: (params: any) => {
    if (!params.value) return '-';
    return new Date(params.value).getFullYear();
  },
  
  // Status badge renderer
  statusBadge: (params: any) => {
    if (!params.value) return '-';
    let className = '';
    switch (params.value) {
      case 'Đang hoạt động':
      case 'Đang cung cấp dịch vụ':
        className = 'bg-green-100 text-green-800';
        break;
      case 'Ngưng cung cấp dịch vụ':
      case 'Pending':
        className = 'bg-yellow-100 text-yellow-800';
        break;
      case 'Không hoạt động':
      case 'Inactive':
        className = 'bg-red-100 text-red-800';
        break;
      default:
        className = 'bg-gray-100 text-gray-800';
    }
    return `<span class="px-2 py-1 rounded-full text-xs font-medium ${className}">${params.value}</span>`;
  }
};

/**
 * Common column configurations
 */
export const COMMON_COLUMNS = {
  id: {
    field: 'id',
    headerName: 'ID',
    width: 80,
    sortable: true,
    filter: 'agNumberColumnFilter',
  },
  
  actions: (buttonText: string, onClick: (data: any) => void, bgColor: string = 'bg-blue-500', hoverColor: string = 'hover:bg-blue-600') => ({
    headerName: buttonText,
    field: 'actions',
    cellRenderer: (params: any) => `
      <div class="flex items-center justify-center h-full w-full">
        <button
          class="w-full h-5 px-0 ${bgColor} text-white rounded ${hoverColor} focus:outline-none flex items-center justify-center"
          onclick="window.agGridActionHandler && window.agGridActionHandler('${params.node.id}', ${JSON.stringify(params.data)})"
        >
          ${buttonText}
        </button>
      </div>
    `,
    suppressMenu: true,
    sortable: false,
    filter: false,
    maxWidth: 120,
    pinned: 'right',
    onCellClicked: (params: any) => onClick(params.data)
  })
};

