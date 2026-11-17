import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(workspaceRoot, ".env");

if (!existsSync(envFile)) {
  console.error("Create .env from .env.example before starting GBLOC.");
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

const sessionSecret = process.env.SESSION_SECRET?.trim() || "";
if (!sessionSecret || /^(replace|change|your[-_])/i.test(sessionSecret)) {
  console.error("Set SESSION_SECRET to a private random value before starting GBLOC.");
  process.exit(1);
}

const apiPort = Number(process.env.API_PORT || 8080);
const webPort = Number(process.env.WEB_PORT || 5173);
for (const [name, value] of [["API_PORT", apiPort], ["WEB_PORT", webPort]]) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 65535) {
    console.error(`${name} must be a valid TCP port.`);
    process.exit(1);
  }
}

process.env.STORAGE_PROVIDER ||= "local";
process.env.LOCAL_STORAGE_DIR = path.resolve(
  workspaceRoot,
  process.env.LOCAL_STORAGE_DIR || "./var/gbloc-storage",
);

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const pnpmOptions = { cwd: workspaceRoot, env: process.env, stdio: "inherit", shell: process.platform === "win32" };

function runPnpm(args) {
  const result = spawnSync(pnpmCommand, args, pnpmOptions);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runPnpm(["run", "typecheck:libs"]);

const childEnv = { ...process.env, NODE_ENV: "development" };
const api = spawn(
  pnpmCommand,
  ["--filter", "@workspace/api-server", "run", "dev"],
  { ...pnpmOptions, env: { ...childEnv, PORT: String(apiPort) } },
);
const web = spawn(
  pnpmCommand,
  ["--filter", "@workspace/gbloc", "run", "dev"],
  {
    ...pnpmOptions,
    env: {
      ...childEnv,
      PORT: String(webPort),
      BASE_PATH: "/",
      GBLOC_API_PORT: String(apiPort),
    },
  },
);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
  for (const child of [api, web]) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

for (const child of [api, web]) {
  child.once("error", (error) => {
    console.error(`Could not start a GBLOC service: ${error.message}`);
    shutdown(1);
  });
  child.once("exit", (code) => {
    if (!shuttingDown) shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`GBLOC web: http://localhost:${webPort}`);
console.log(`GBLOC API: http://localhost:${apiPort}/api/healthz`);
