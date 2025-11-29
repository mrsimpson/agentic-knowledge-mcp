/**
 * @codemcp/knowledge-core
 *
 * Core functionality for the agentic knowledge guidance system.
 * Provides configuration discovery, path calculation, and template processing.
 */

// Export all types and interfaces
export * from "./types.js";

// Export configuration functionality
export { findConfigPath, findConfigPathSync } from "./config/discovery.js";
export { loadConfig, loadConfigSync, validateConfig } from "./config/loader.js";
export { ConfigManager } from "./config/manager.js";

// Export path calculation utilities
export {
  calculateLocalPath,
  calculateLocalPathWithSymlinks,
  formatPath,
  validatePath,
  validatePathSync,
  getRelativePath,
  ensureKnowledgeGitignore,
  ensureKnowledgeGitignoreSync,
} from "./paths/calculator.js";

// Export symlink utilities
export { createSymlinks, removeSymlinks } from "./paths/symlinks.js";

// Export path discovery utilities
export {
  discoverDirectoryPatterns,
  discoverMinimalPatterns,
} from "./paths/discovery.js";

// Export template processing
export {
  processTemplate,
  getEffectiveTemplate,
  validateTemplate,
  extractVariables,
  createTemplateContext,
  createStructuredResponse,
} from "./templates/processor.js";
