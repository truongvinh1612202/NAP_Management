import log from "electron-log";
import { PrismaClient } from "../generated/client/index.js";
import { dbUrl, mePath, qePath, schemaPath, isDev } from "./constants";
import path from "path";
import { fileURLToPath } from "node:url";
import { fork } from "child_process";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

log.info("DB URL", dbUrl);
log.info("QE Path", qePath);
log.info("ME Path", mePath);
log.info("Is Development", isDev);

// Verify query engine exists at startup
if (fs.existsSync(qePath)) {
  log.info("Query engine found at:", qePath);
} else {
  log.error("Query engine NOT found at:", qePath);
}

export let prisma = new PrismaClient({
  log: [
    "info",
    "warn",
    "error",
    //     {
    //     emit: "event",
    //     level: "query",
    // },
  ],
  datasources: {
    db: {
      url: dbUrl,
    },
  },
  // see https://github.com/prisma/prisma/discussions/5200
  // @ts-expect-error internal prop
  __internal: {
    engine: {
      binaryPath: qePath,
    },
  },
});

// Function to apply new database configuration
export async function applyDatabaseConfig(
  connectionString: string,
): Promise<void> {
  try {
    // Disconnect the current client
    await prisma.$disconnect();

    // Create new client with the new connection string
    prisma = new PrismaClient({
      log: ["info", "warn", "error"],
      datasources: {
        db: {
          url: connectionString,
        },
      },
      // @ts-expect-error internal prop
      __internal: {
        engine: {
          binaryPath: qePath,
        },
      },
    });

    // Connect to the new database
    await prisma.$connect();
    log.info("Successfully applied new database configuration");
  } catch (error) {
    log.error("Failed to apply new database configuration:", error);
    throw error;
  }
}

// Function to test database connection with custom connection string
export async function testDatabaseConnection(
  connectionString: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info("Testing database connection with URL:", connectionString);

    // Create a temporary Prisma client with the test connection string
    const testPrisma = new PrismaClient({
      log: ["error"],
      datasources: {
        db: {
          url: connectionString,
        },
      },
      // @ts-expect-error internal prop
      __internal: {
        engine: {
          binaryPath: qePath,
        },
      },
    });

    // Try to connect and run a simple query
    await testPrisma.$connect();
    log.info("Test Prisma client connected successfully");

    await testPrisma.$queryRaw`SELECT 1 as test`;
    log.info("Test query executed successfully");

    await testPrisma.$disconnect();
    log.info("Test Prisma client disconnected successfully");

    return { success: true };
  } catch (error) {
    log.error("Database connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Runs `prisma migrate deploy` against the current database on startup.
// Creates the DB file (SQLite) and applies all pending migrations automatically.
export async function ensureMigrationsApplied(): Promise<void> {
  try {
    log.info("Applying database migrations...");
    await runPrismaCommand({
      command: ["migrate", "deploy", "--schema", schemaPath],
      dbUrl,
    });
    log.info("Database migrations applied successfully");
  } catch (error) {
    log.error("Failed to apply database migrations:", error);
    throw error;
  }
}

export async function runPrismaCommand({
  command,
  dbUrl,
}: {
  command: string[];
  dbUrl: string;
}): Promise<number> {
  log.info("Migration engine path", mePath);
  log.info("Query engine path", qePath);

  // Currently we don't have any direct method to invoke prisma migration programatically.
  // As a workaround, we spawn migration script as a child process and wait for its completion.
  // Please also refer to the following GitHub issue: https://github.com/prisma/prisma/issues/4703
  try {
    const exitCode = await new Promise((resolve, _) => {
      const prismaPath = path.resolve(
        __dirname,
        "..",
        "..",
        "node_modules/prisma/build/index.js",
      );
      log.info("Prisma path", prismaPath);

      const child = fork(prismaPath, command, {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          PRISMA_SCHEMA_ENGINE_BINARY: mePath,
          PRISMA_QUERY_ENGINE_LIBRARY: qePath,

          // Prisma apparently needs a valid path for the format and introspection binaries, even though
          // we don't use them. So we just point them to the query engine binary. Otherwise, we get
          // prisma:  Error: ENOTDIR: not a directory, unlink '/some/path/electron-prisma-trpc-example/packed/mac-arm64/ElectronPrismaTrpcExample.app/Contents/Resources/app.asar/node_modules/@prisma/engines/prisma-fmt-darwin-arm64'
          PRISMA_FMT_BINARY: qePath,
          PRISMA_INTROSPECTION_ENGINE_BINARY: qePath,
        },
        stdio: "pipe",
      });

      child.on("message", (msg) => {
        log.info(msg);
      });

      child.on("error", (err) => {
        log.error("Child process got error:", err);
      });

      child.on("close", (code, signal) => {
        resolve(code);
      });

      child.stdout?.on("data", function (data) {
        log.info("prisma: ", data.toString());
      });

      child.stderr?.on("data", function (data) {
        log.error("prisma: ", data.toString());
      });
    });

    if (exitCode !== 0)
      throw Error(`command ${command} failed with exit code ${exitCode}`);

    return exitCode;
  } catch (e) {
    log.error(e);
    throw e;
  }
}
