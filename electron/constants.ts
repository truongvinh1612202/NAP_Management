import path from "path";
import { app } from "electron";
import fs from "fs";

export const isDev = process.env.NODE_ENV === "development";

// In development, try to load .env file
if (isDev) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      // Read and parse .env file manually to avoid require() issues
      const envContent = fs.readFileSync(envPath, "utf8");
      const envLines = envContent.split("\n");

      for (const line of envLines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const [key, ...valueParts] = trimmedLine.split("=");
          if (key && valueParts.length > 0) {
            const value = valueParts.join("=").trim();
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn("Could not load .env file:", error);
  }
}

// Database configuration
export interface DatabaseConfig {
  filePath: string;
}

function getConfigFilePath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "database-config.json");
}

function loadDatabaseConfig(): DatabaseConfig | null {
  try {
    const configPath = getConfigFilePath();
    console.log("Database config path:", configPath); // Log the config path
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configContent);
    }
  } catch (error) {
    console.warn("Could not load database config file:", error);
  }
  return null;
}

export function saveDatabaseConfig(config: DatabaseConfig): void {
  try {
    const configPath = getConfigFilePath();
    const userDataPath = path.dirname(configPath);

    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Database configuration saved successfully");
  } catch (error) {
    console.error("Failed to save database configuration:", error);
    throw error;
  }
}

function buildDatabaseUrl(config: DatabaseConfig): string {
  return `file:${config.filePath}`;
}

function getDefaultDatabaseConfig(): DatabaseConfig {
  return {
    filePath: path.join(app.getPath("userData"), "nap-management.db"),
  };
}

function getDatabaseUrl(): string {
  // Check saved config first
  const savedConfig = loadDatabaseConfig();
  if (savedConfig) {
    console.log("Using database from config file:", savedConfig.filePath);
    return buildDatabaseUrl(savedConfig);
  }

  // Fall back to default (SQLite file in Electron userData)
  const defaultConfig = getDefaultDatabaseConfig();
  console.log("Using default database path:", defaultConfig.filePath);

  // Persist default so user can see/change it later
  if (!isDev) {
    try {
      saveDatabaseConfig(defaultConfig);
    } catch (error) {
      console.warn("Could not save default database configuration:", error);
    }
  }

  return buildDatabaseUrl(defaultConfig);
}

export const dbUrl = getDatabaseUrl();

// Set environment variable for Prisma client
process.env.DATABASE_URL = dbUrl;

// Export utility functions for UI configuration
export { loadDatabaseConfig };

// This needs to be updated every time you create a migration!
export const latestMigration = "20260302085347_init";
export const platformToExecutables: any = {
  win32: {
    migrationEngine: "node_modules/@prisma/engines/schema-engine-windows.exe",
    queryEngine: "node_modules/@prisma/engines/query_engine-windows.dll.node",
  },
  linux: {
    migrationEngine:
      "node_modules/@prisma/engines/schema-engine-debian-openssl-1.1.x",
    queryEngine:
      "node_modules/@prisma/engines/libquery_engine-debian-openssl-1.1.x.so.node",
  },
  darwin: {
    migrationEngine: "node_modules/@prisma/engines/schema-engine-darwin",
    queryEngine:
      "node_modules/@prisma/engines/libquery_engine-darwin.dylib.node",
  },
  darwinArm64: {
    migrationEngine: "node_modules/@prisma/engines/schema-engine-darwin-arm64",
    queryEngine:
      "node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node",
  },
};
const extraResourcesPath = isDev
  ? process.cwd()
  : app.getAppPath().replace("app.asar", ""); // impacted by extraResources setting in electron-builder.yml

function getPlatformName(): string {
  const isDarwin = process.platform === "darwin";
  if (isDarwin && process.arch === "arm64") {
    return process.platform + "Arm64";
  }

  return process.platform;
}

const platformName = getPlatformName();

export const mePath = path.join(
  extraResourcesPath,
  platformToExecutables[platformName].migrationEngine,
);
export const qePath = path.join(
  extraResourcesPath,
  platformToExecutables[platformName].queryEngine,
);

export interface Migration {
  id: string;
  checksum: string;
  finished_at: string;
  migration_name: string;
  logs: string;
  rolled_back_at: string;
  started_at: string;
  applied_steps_count: string;
}
