/// <reference types="vite/client" />

interface Window {
  // expose in the `electron/preload/index.ts`
  electron: {
    ipcRenderer: import('electron').IpcRenderer
  };
  ipcRenderer: import('electron').IpcRenderer;
  appApi: {
    trpc: (req: import('../electron/api').IpcRequest) => Promise<import('../electron/api').IpcResponse>;
  };
}
