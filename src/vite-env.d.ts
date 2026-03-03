/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload/index.ts`
  electron: {
    ipcRenderer: import("electron").IpcRenderer;
  };
  ipcRenderer: import("electron").IpcRenderer;
  appApi: {
    trpc: (
      req: import("../electron/api").IpcRequest,
    ) => Promise<import("../electron/api").IpcResponse>;
    loadDatabaseConfig: () => Promise<
      import("../electron/api").DatabaseConfig | null
    >;
    saveDatabaseConfig: (
      config: import("../electron/api").DatabaseConfig,
    ) => Promise<void>;
    testDatabaseConnection: (
      config: import("../electron/api").DatabaseConfig,
    ) => Promise<import("../electron/api").DatabaseTestResult>;
    selectDbFile: () => Promise<string | null>;
    restartApp: () => Promise<void>;
  };
}
