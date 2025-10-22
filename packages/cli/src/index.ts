#!/usr/bin/env node

/**
 * Main Entry Point
 *
 * Routes to MCP server (no args) or CLI (with args)
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const args = process.argv.slice(2);

  // Debug output to stderr so it doesn't interfere with CLI output
  console.error(`[DEBUG] process.argv: ${JSON.stringify(process.argv)}`);
  console.error(`[DEBUG] args: ${JSON.stringify(args)}`);
  console.error(`[DEBUG] args.length: ${args.length}`);

  if (args.length === 0) {
    console.error("[DEBUG] No args - starting MCP server");
    // No arguments, start MCP server
    const isLocal = existsSync(
      join(__dirname, "../../mcp-server/dist/index.js"),
    );
    if (isLocal) {
      const { startServer } = await import("../../mcp-server/dist/cli.js");
      await startServer();
    } else {
      // Use string literal to avoid TypeScript resolution issues
      const mcpServerModule = "@codemcp/knowledge-mcp-server";
      const { startServer } = await import(mcpServerModule);
      await startServer();
    }
  } else {
    console.error("[DEBUG] Has args - starting CLI");
    // Any arguments, run CLI
    const { runCli } = await import("./cli.js");
    runCli();
  }
}

main().catch(console.error);
