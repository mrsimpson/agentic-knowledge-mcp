/**
 * Agentic Knowledge System
 * 
 * A standalone agentic knowledge guidance system with search_docs() interface
 * that returns intelligent navigation instructions based on docset, keywords,
 * and generalized_keywords - delegating language processing to the agent
 * while providing structured guidance.
 */

// Export main MCP server functionality
export { 
  createAgenticKnowledgeServer, 
  startMCPServer, 
  startServer 
} from './packages/@agentic-knowledge/mcp-server/dist/index.js';

// Export core functionality for advanced usage
export {
  loadConfig,
  findConfigPath,
  calculateLocalPath,
  processTemplate,
  createTemplateContext,
  getEffectiveTemplate,
  validateTemplate,
  extractVariables
} from './packages/@agentic-knowledge/core/dist/index.js';

// Export types
export type {
  DocsetConfig,
  KnowledgeConfig,
  SearchDocsParams,
  SearchDocsResponse,
  ListDocsetsResponse,
  TemplateContext,
  ErrorType
} from './packages/@agentic-knowledge/core/dist/index.js';

export { KnowledgeError } from './packages/@agentic-knowledge/core/dist/index.js';