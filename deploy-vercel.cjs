#!/usr/bin/env node
// Wrapper for Vercel CLI deployment on Chinese Windows (hostname encoding workaround)
const originalHostname = require("os").hostname;
const os = require("os");

// Patch hostname to avoid Vercel CLI User-Agent validation crash with non-ASCII chars
Object.defineProperty(os, "hostname", {
  get: () => "windows-host",
});

async function main() {
  const { execSync } = require("child_process");
  const args = process.argv.slice(2);
  const isProd = args.includes("--prod");
  const rest = args.filter((a) => a !== "--prod");

  const cmd = `npx vercel deploy ${rest.join(" ")}${isProd ? " --prod --yes" : ""}`;
  console.log(`Running: vercel deploy ${isProd ? "--prod" : ""} ...`);
  execSync(cmd, { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
