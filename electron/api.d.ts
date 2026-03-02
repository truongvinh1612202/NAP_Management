export type IpcRequest = {
  body: any;
  headers: any;
  method: string;
  url: string;
};

export type IpcResponse = {
  body: any;
  headers: any;
  status: number;
};

export interface DatabaseConfig {
  filePath: string;
}

export interface DatabaseTestResult {
  success: boolean;
  error?: string;
}

export interface IElectronAPI {
  node: () => string;
  chrome: () => string;
  electron: () => string;
  trpc: (req: IpcRequest) => Promise<IpcResponse>;

  // Database configuration methods
  loadDatabaseConfig: () => Promise<DatabaseConfig | null>;
  saveDatabaseConfig: (config: DatabaseConfig) => Promise<void>;
  testDatabaseConnection: (
    config: DatabaseConfig,
  ) => Promise<DatabaseTestResult>;
  selectDbFile: () => Promise<string | null>;
  restartApp: () => Promise<void>;
}

declare global {
  interface Window {
    appApi: IElectronAPI;
  }
}
