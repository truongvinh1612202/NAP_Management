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

// Database configuration with multiple fallback options
export interface DatabaseConfig {
  server: string;
  port: number;
  database: string;
  username: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate?: boolean;
}

function getConfigFilePath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "database-config.json");
}

function loadDatabaseConfig(): DatabaseConfig | null {
  try {
    const configPath = getConfigFilePath();
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

function buildConnectionString(config: DatabaseConfig): string {
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

  return connectionString;
}

function getDefaultDatabaseConfig(): DatabaseConfig {
  // Platform-specific defaults
  const isWindows = process.platform === "win32";

  return {
    server: "localhost",
    port: 1433,
    database: isWindows ? "NAP_Management" : "MyDatabase",
    username: "SA",
    password: "MyStrongPass123",
    encrypt: false, // Set to true for production
    trustServerCertificate: true,
  };
}

function getDatabaseUrl(): string {
  // Priority order:
  // 1. Environment variable (highest priority)
  // 2. Config file in user data directory
  // 3. Default configuration (lowest priority)

  // Check environment variable first
  if (process.env.DATABASE_URL) {
    console.log("Using DATABASE_URL from environment variable");
    return process.env.DATABASE_URL;
  }

  // Check config file
  const savedConfig = loadDatabaseConfig();
  if (savedConfig) {
    console.log("Using DATABASE_URL from config file");
    return buildConnectionString(savedConfig);
  }

  // Use default configuration
  const defaultConfig = getDefaultDatabaseConfig();
  console.log("Using default DATABASE_URL configuration");

  // Save default config for user to modify if needed
  if (!isDev) {
    try {
      saveDatabaseConfig(defaultConfig);
      console.log(
        `Default database configuration saved to: ${getConfigFilePath()}`
      );
    } catch (error) {
      console.warn("Could not save default database configuration:", error);
    }
  }

  return buildConnectionString(defaultConfig);
}

export const dbUrl = getDatabaseUrl();

// Set environment variable for Prisma client
process.env.DATABASE_URL = dbUrl;

// Export utility functions for UI configuration
export { loadDatabaseConfig, getConfigFilePath };

// This needs to be updated every time you create a migration!
export const latestMigration = "01_init";
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
  platformToExecutables[platformName].migrationEngine
);
export const qePath = path.join(
  extraResourcesPath,
  platformToExecutables[platformName].queryEngine
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
