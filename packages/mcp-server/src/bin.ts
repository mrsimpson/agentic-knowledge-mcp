/**
 * Binary entry point for the agentic-knowledge MCP server
 */

import { startServer } from "./cli.js";

// Start the server
startServer().catch((error: Error) => {
  console.error("Failed to start agentic-knowledge server:", error);
  process.exit(1);
});
