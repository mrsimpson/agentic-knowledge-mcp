/**
 * @agentic-knowledge/core
 *
 * Core functionality for the agentic knowledge guidance system.
 * Provides configuration discovery, path calculation, and template processing.
 */

// Export all types and interfaces
export * from "./types.js";

// Export configuration functionality
export { findConfigPath, findConfigPathSync } from "./config/discovery.js";
export { loadConfig, loadConfigSync, validateConfig } from "./config/loader.js";

// Export path calculation utilities
export {
  calculateLocalPath,
  formatPath,
  validatePath,
  validatePathSync,
  getRelativePath,
  ensureKnowledgeGitignore,
  ensureKnowledgeGitignoreSync,
} from "./paths/calculator.js";

// Export template processing
export {
  processTemplate,
  getEffectiveTemplate,
  validateTemplate,
  extractVariables,
  createTemplateContext,
} from "./templates/processor.js";
