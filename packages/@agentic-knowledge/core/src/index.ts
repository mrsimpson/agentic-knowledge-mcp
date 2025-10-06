/**
 * @agentic-knowledge/core
 * 
 * Core functionality for the agentic knowledge guidance system.
 * Provides configuration discovery, path calculation, and template processing.
 */

// Export all types and interfaces
export * from './types.js';

// Export core functionality (will be implemented in next steps)
export { findConfigPath } from './config/discovery.js';
export { loadConfig, validateConfig } from './config/loader.js';
export { calculateLocalPath } from './paths/calculator.js';
export { processTemplate } from './templates/processor.js';