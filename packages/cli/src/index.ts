#!/usr/bin/env node

/**
 * Main Entry Point
 *
 * Routes to MCP server (no args) or CLI (with args)
 */

import { startServer } from "@codemcp/knowledge-server";
import { runCli } from "./cli.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments, start MCP server
    await startServer();
  } else {
    // Any arguments, run CLI
    runCli();
  }
}

main().catch(console.error);
