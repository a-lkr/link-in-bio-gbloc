import { spawn, spawnSync } from "node:child_process";

const env = { ...process.env, NODE_ENV: "development" };
const build = spawnSync(process.execPath, ["./build.mjs"], {
  cwd: import.meta.dirname,
  env,
  stdio: "inherit",
});

if (build.error) {
  console.error(`Could not build the API server: ${build.error.message}`);
  process.exit(1);
}
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: import.meta.dirname,
  env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.once("error", (error) => {
  console.error(`Could not start the API server: ${error.message}`);
  process.exitCode = 1;
});
server.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
