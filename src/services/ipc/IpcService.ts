import { IpcChannels, IpcInvoke, IpcRequestMap } from '../../types/ipc';

/**
 * Service for type-safe IPC communication between renderer and main process
 */
class IpcService {
  private static instance: IpcService;
  
  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of the IPC service
   */
  public static getInstance(): IpcService {
    if (!IpcService.instance) {
      IpcService.instance = new IpcService();
    }
    return IpcService.instance;
  }

  /**
   * Invoke an IPC method with type safety
   * @param channel The IPC channel to invoke
   * @param args Arguments to pass to the handler
   * @returns A promise that resolves with the response
   */
  public async invoke<T extends keyof IpcRequestMap>(
    channel: T,
    args: IpcRequestMap[T]['request']
  ): Promise<IpcRequestMap[T]['response']> {
    if (!window.electron || !window.electron.ipcRenderer) {
      throw new Error('IPC Renderer not available');
    }

    try {
      const response = await window.electron.ipcRenderer.invoke(channel, args);
      return response;
    } catch (error) {
      console.error(`IPC Invoke Error [${channel}]:`, error);
      throw error;
    }
  }

  /**
   * Send a message to the main process without waiting for a response
   * @param channel The IPC channel to send to
   * @param args Arguments to pass to the handler
   */
  public send<T extends keyof IpcRequestMap>(
    channel: T,
    args: IpcRequestMap[T]['request']
  ): void {
    if (!window.electron || !window.electron.ipcRenderer) {
      console.warn('IPC Renderer not available, message not sent:', channel);
      return;
    }
    
    window.electron.ipcRenderer.send(channel, args);
  }

  /**
   * Set up a listener for an IPC channel
   * @param channel The IPC channel to listen to
   * @param handler Function to handle the event
   * @returns A function to remove the listener
   */
  public on<T extends keyof IpcRequestMap>(
    channel: T,
    handler: (args: IpcRequestMap[T]['request']) => void
  ): () => void {
    if (!window.electron || !window.electron.ipcRenderer) {
      console.warn('IPC Renderer not available, listener not registered:', channel);
      return () => {};
    }

    const listener = (_event: any, args: IpcRequestMap[T]['request']) => {
      handler(args);
    };

    window.electron.ipcRenderer.on(channel, listener);

    // Return cleanup function
    return () => {
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.removeListener(channel, listener);
      }
    };
  }

  // Specific API methods for common operations
  
  /**
   * Get rows for the data grid
   */
  public async getGridRows(
    request: IpcRequestMap[typeof IpcChannels.DATA_GRID_GET_ROWS]['request']
  ): Promise<IpcRequestMap[typeof IpcChannels.DATA_GRID_GET_ROWS]['response']> {
    return this.invoke(IpcChannels.DATA_GRID_GET_ROWS, request);
  }

  /**
   * Get row count for a table with optional filters
   */
  public async getRowCount(
    request: IpcRequestMap[typeof IpcChannels.DATA_GRID_GET_ROW_COUNT]['request']
  ): Promise<IpcRequestMap[typeof IpcChannels.DATA_GRID_GET_ROW_COUNT]['response']> {
    return this.invoke(IpcChannels.DATA_GRID_GET_ROW_COUNT, request);
  }

  /**
   * Get column definitions for a table
   */
  public async getTableColumns(
    request: IpcRequestMap[typeof IpcChannels.DATA_GRID_GET_COLUMNS]['request']
  ): Promise<IpcRequestMap[typeof IpcChannels.DATA_GRID_GET_COLUMNS]['response']> {
    return this.invoke(IpcChannels.DATA_GRID_GET_COLUMNS, request);
  }

  /**
   * Connect to a database
   */
  public async connectToDatabase(
    request: IpcRequestMap[typeof IpcChannels.DATABASE_CONNECT]['request']
  ): Promise<IpcRequestMap[typeof IpcChannels.DATABASE_CONNECT]['response']> {
    return this.invoke(IpcChannels.DATABASE_CONNECT, request);
  }

  /**
   * Execute a database query
   */
  public async executeQuery(
    request: IpcRequestMap[typeof IpcChannels.DATABASE_QUERY]['request']
  ): Promise<IpcRequestMap[typeof IpcChannels.DATABASE_QUERY]['response']> {
    return this.invoke(IpcChannels.DATABASE_QUERY, request);
  }
}

export const ipcService = IpcService.getInstance();
