const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("This workspace uses pnpm. Install pnpm 10+ and run `pnpm install`.");
  process.exit(1);
}
