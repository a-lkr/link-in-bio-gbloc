import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const testDirectory = path.join(import.meta.dirname, "tests");
const testFiles = readdirSync(testDirectory)
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => path.join("tests", name));

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  pnpmCommand,
  ["exec", "tsx", "--test", ...testFiles],
  {
    cwd: import.meta.dirname,
    env: {
      ...process.env,
      DATABASE_URL: "postgres://test:test@127.0.0.1:5432/test",
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  console.error(`Could not run API tests: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
