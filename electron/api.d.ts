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
  server: string;
  port: number;
  database: string;
  username: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate?: boolean;
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
    config: DatabaseConfig
  ) => Promise<DatabaseTestResult>;
  restartApp: () => Promise<void>;
}

declare global {
  interface Window {
    appApi: IElectronAPI;
  }
}
