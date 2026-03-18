#!/usr/bin/env node

/**
 * cli.mjs — Entry point for Claude Inventory Manager.
 * Usage: node bin/cli.mjs [--port 3847]
 */

import { startServer } from "../src/server.mjs";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3847;

const server = startServer(port);

// Try to open browser
try {
  const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
  execSync(`${openCmd} http://localhost:${port}`, { stdio: "ignore" });
} catch {
  // Browser didn't open, user can navigate manually
}
