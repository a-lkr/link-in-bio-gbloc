import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(workspaceRoot, ".env");

if (!existsSync(envFile)) {
  console.error("Create .env from .env.example before applying the database schema.");
  process.exit(1);
}

try {
  process.loadEnvFile(envFile);
} catch (error) {
  console.error(`Could not read .env: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL is required in .env.");
  process.exit(1);
}

let databaseHost;
try {
  databaseHost = new URL(process.env.DATABASE_URL).hostname;
} catch {
  console.error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  process.exit(1);
}

if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(databaseHost) &&
    process.env.ALLOW_REMOTE_DB_PUSH !== "true") {
  console.error(
    "Refusing to change a remote database. Set ALLOW_REMOTE_DB_PUSH=true only when you intend to apply the schema there.",
  );
  process.exit(1);
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  pnpmCommand,
  ["--filter", "@workspace/db", "run", "push"],
  {
    cwd: workspaceRoot,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  console.error(`Could not run the database setup command: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
