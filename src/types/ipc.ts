import { ServerSideGetRowsRequest, ServerSideGetRowsResponse } from './data-grid';

/**
 * IPC Channels for main-renderer communication
 */
export enum IpcChannels {
  // Data Grid Channels
  DATA_GRID_GET_ROWS = 'data-grid:get-rows',
  DATA_GRID_GET_ROW_COUNT = 'data-grid:get-row-count',
  DATA_GRID_GET_COLUMNS = 'data-grid:get-columns',
  
  // Database Channels
  DATABASE_CONNECT = 'database:connect',
  DATABASE_QUERY = 'database:query',
  
  // Application Channels
  APP_GET_VERSION = 'app:get-version',
  APP_GET_CONFIG = 'app:get-config',
}

/**
 * IPC Request/Response types for each channel
 */
export interface IpcRequestMap {
  [IpcChannels.DATA_GRID_GET_ROWS]: {
    request: ServerSideGetRowsRequest;
    response: ServerSideGetRowsResponse;
  };
  [IpcChannels.DATA_GRID_GET_ROW_COUNT]: {
    request: { tableName: string; filterModel?: any };
    response: { count: number };
  };
  [IpcChannels.DATA_GRID_GET_COLUMNS]: {
    request: { tableName: string };
    response: { columns: Array<{ field: string; headerName: string; type?: string }> };
  };
  [IpcChannels.DATABASE_CONNECT]: {
    request: { connectionString: string };
    response: { success: boolean; error?: string };
  };
  [IpcChannels.DATABASE_QUERY]: {
    request: { query: string; params?: any[] };
    response: { data: any[]; error?: string };
  };
  [IpcChannels.APP_GET_VERSION]: {
    request: void;
    response: { version: string };
  };
  [IpcChannels.APP_GET_CONFIG]: {
    request: void;
    response: Record<string, any>;
  };
}

/**
 * Type-safe wrapper for IPC communication
 */
export type IpcHandler<T extends keyof IpcRequestMap> = (
  event: Electron.IpcMainInvokeEvent,
  args: IpcRequestMap[T]['request']
) => Promise<IpcRequestMap[T]['response']>;

export type IpcInvoke<T extends keyof IpcRequestMap> = (
  channel: T,
  args: IpcRequestMap[T]['request']
) => Promise<IpcRequestMap[T]['response']>;
