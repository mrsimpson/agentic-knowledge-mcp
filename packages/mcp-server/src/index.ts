/**
 * @codemcp/knowledge-mcp-server
 * 
 * MCP server implementation for the agentic knowledge guidance system.
 * Provides search_docs and list_docsets tools via the Model Context Protocol.
 */

// Export the main server functionality
export { createAgenticKnowledgeServer, startMCPServer } from './server.js';
export { startServer } from './cli.js';