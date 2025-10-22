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

  if (args.length === 0) {
    // No arguments, start MCP server
    const isLocal = existsSync(
      join(__dirname, "../../mcp-server/dist/index.js"),
    );
    if (isLocal) {
      await import("../../mcp-server/dist/index.js");
    } else {
      // Use string literal to avoid TypeScript resolution issues
      const mcpServerModule = "@codemcp/knowledge-mcp-server";
      await import(mcpServerModule);
    }
  } else {
    // Any arguments, run CLI
    const { runCli } = await import("./cli.js");
    runCli();
  }
}

main().catch(console.error);
