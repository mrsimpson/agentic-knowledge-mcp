/**
 * CLI functionality for the MCP server
 */

import { startMCPServer } from './server.js';

/**
 * Start the agentic knowledge MCP server from CLI
 */
export async function startServer(): Promise<void> {
  try {
    await startMCPServer();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to start agentic-knowledge server:', errorMessage);
    process.exit(1);
  }
}