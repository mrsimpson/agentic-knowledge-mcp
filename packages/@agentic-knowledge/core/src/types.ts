/**
 * Core types and interfaces for the agentic knowledge guidance system
 */

/**
 * Configuration for a single docset
 */
export interface DocsetConfig {
  /** Unique identifier for the docset */
  id: string;
  /** Human-readable name of the docset */
  name: string;
  /** Description of what this docset contains */
  description?: string;
  /** Path to the documentation (relative to .knowledge folder or absolute) - optional for web sources */
  local_path?: string;
  /** Optional custom instruction template for this docset */
  template?: string;
  /** Optional web sources to load content from */
  web_sources?: WebSourceConfig[];
}

/**
 * Basic web source configuration (for core package validation)
 */
export interface WebSourceConfig {
  /** URL of the web source */
  url: string;
  /** Type of web source */
  type: string;
  /** Type-specific options */
  options?: Record<string, unknown>;
}

/**
 * Main configuration structure for the knowledge system
 */
export interface KnowledgeConfig {
  /** Version of the configuration format */
  version: string;
  /** List of docsets available for search */
  docsets: DocsetConfig[];
  /** Global instruction template (optional) */
  template?: string;
}

/**
 * Parameters for the search_docs tool
 */
export interface SearchDocsParams {
  /** ID of the docset to search */
  docset: string;
  /** Specific keywords to search for */
  keywords: string;
  /** Generalized keywords for broader search context */
  generalized_keywords: string;
}

/**
 * Response from the search_docs tool
 */
export interface SearchDocsResponse {
  /** Instructions for the agent on how to search */
  instructions: string;
  /** The docset that was searched */
  docset: string;
  /** The calculated local path for searching */
  local_path: string;
  /** Keywords that were processed */
  keywords: string;
  /** Generalized keywords that were processed */
  generalized_keywords: string;
}

/**
 * Response from the list_docsets tool
 */
export interface ListDocsetsResponse {
  /** List of available docsets */
  docsets: DocsetConfig[];
  /** Total number of docsets */
  count: number;
}

/**
 * Template context for instruction generation
 */
export interface TemplateContext {
  /** Path to search in */
  local_path: string;
  /** Keywords to search for */
  keywords: string;
  /** Generalized keywords */
  generalized_keywords: string;
  /** Docset information */
  docset: DocsetConfig;
}

/**
 * Error types that can occur in the core system
 */
export enum ErrorType {
  CONFIG_NOT_FOUND = "CONFIG_NOT_FOUND",
  CONFIG_INVALID = "CONFIG_INVALID",
  DOCSET_NOT_FOUND = "DOCSET_NOT_FOUND",
  PATH_INVALID = "PATH_INVALID",
  TEMPLATE_ERROR = "TEMPLATE_ERROR",
  YAML_PARSE_ERROR = "YAML_PARSE_ERROR",
}

/**
 * Custom error class for knowledge system errors
 */
export class KnowledgeError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "KnowledgeError";
  }
}

/**
 * Default instruction template
 */
export const DEFAULT_TEMPLATE = `Search for '{{keywords}}' in folder {{local_path}}. Use your normal text search tools (grep, rg, or similar) to find relevant files. Consider these broader search terms as well: {{generalized_keywords}}. Start with searching for the most specific keywords first, then expand to the generalized terms if needed.`;

/**
 * Allowed template variables that can be used in instruction templates
 */
export const ALLOWED_TEMPLATE_VARIABLES = [
  "local_path",
  "keywords",
  "generalized_keywords",
  "docset_id",
  "docset_name",
  "docset_description",
] as const;

/**
 * Required template variables that must be present in every template
 */
export const REQUIRED_TEMPLATE_VARIABLES = ["local_path", "keywords"] as const;

/**
 * Configuration file name pattern
 */
export const CONFIG_FILENAME = "config.yaml";

/**
 * Configuration directory name
 */
export const CONFIG_DIR = ".knowledge";
