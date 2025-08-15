import { app, BrowserWindow, shell, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { update } from "./update";
import { IpcRequest, DatabaseConfig } from "../api";
import { ipcRequestHandler } from "./ipcRequestHandler";
import { appRouter } from "../router";
import { loadDatabaseConfig, saveDatabaseConfig } from "../constants";
import { testDatabaseConnection, applyDatabaseConfig } from "../prisma";
import "dotenv/config";
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..");

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.mjs");
const indexHtml = path.join(RENDERER_DIST, "index.html");

async function createWindow() {
  win = new BrowserWindow({
    title: "NAP Management",
    icon: path.join(__dirname, "../../build/icon.ico"),
    // Start the application in full screen mode
    fullscreen: true,
    fullscreenable: true,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
    // Ensure the window is in full screen after the renderer finishes loading
    // (covers cases where devtools or other actions might have changed state)
    try {
      win?.setFullScreen(true);
    } catch (e) {
      console.warn("Failed to set full screen:", e);
    }
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Auto update
  update(win);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// Handle IPC requests from the Renderer process
ipcMain.handle("trpc", (event, req: IpcRequest) => {
  return ipcRequestHandler({
    endpoint: "/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      return {};
    },
  });
});

// Database configuration IPC handlers
ipcMain.handle("load-database-config", async () => {
  try {
    return loadDatabaseConfig();
  } catch (error) {
    console.error("Failed to load database config:", error);
    return null;
  }
});

ipcMain.handle(
  "save-database-config",
  async (event, config: DatabaseConfig) => {
    try {
      // Save the config to file
      saveDatabaseConfig(config);

      // Build connection string for the new config in sqlserver:// format
      const {
        server,
        port,
        database,
        username,
        password,
        encrypt,
        trustServerCertificate,
      } = config;

      let connectionString = `sqlserver://${server}:${port};database=${database};user=${username};password=${password}`;

      if (encrypt) {
        connectionString += ";encrypt=true";
        if (trustServerCertificate) {
          connectionString += ";trustServerCertificate=true";
        }
      } else {
        connectionString += ";encrypt=DANGER_PLAINTEXT";
      }

      // Apply the new database configuration
      await applyDatabaseConfig(connectionString);

      return { success: true };
    } catch (error) {
      console.error("Failed to save and apply database config:", error);
      throw error;
    }
  }
);

ipcMain.handle(
  "test-database-connection",
  async (event, config: DatabaseConfig) => {
    try {
      // Build connection string for testing
      const {
        server,
        port,
        database,
        username,
        password,
        encrypt,
        trustServerCertificate,
      } = config;

      let connectionString = `sqlserver://${server}:${port};database=${database};user=${username};password=${password}`;

      if (encrypt) {
        connectionString += ";encrypt=true";
        if (trustServerCertificate) {
          connectionString += ";trustServerCertificate=true";
        }
      } else {
        connectionString += ";encrypt=DANGER_PLAINTEXT";
      }

      // Use the helper function from prisma.ts instead of creating a new PrismaClient
      return await testDatabaseConnection(connectionString);
    } catch (error) {
      console.error("Database connection test failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

ipcMain.handle("restart-app", async () => {
  app.relaunch();
  app.exit();
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
