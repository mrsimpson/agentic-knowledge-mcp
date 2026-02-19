/**
 * Core types and interfaces for the agentic knowledge guidance system
 */

/**
 * Base source configuration
 */
export interface BaseSourceConfig {
  /** Type of source */
  type: string;
  /** Optional paths to include */
  paths?: string[];
}

/**
 * Local folder source configuration
 */
export interface LocalFolderSourceConfig extends BaseSourceConfig {
  type: "local_folder";
  /** Paths to local files/directories */
  paths: string[];
}

/**
 * Git repository source configuration
 */
export interface GitRepoSourceConfig extends BaseSourceConfig {
  type: "git_repo";
  /** Git repository URL */
  url: string;
  /** Branch to clone (optional, defaults to main) */
  branch?: string;
  /** Specific paths to extract (optional) */
  paths?: string[];
}

/**
 * Archive file source configuration (supports zip, tar.gz, etc.)
 */
export interface ArchiveSourceConfig extends BaseSourceConfig {
  type: "archive";
  /** Local path to archive file (mutually exclusive with url) */
  path?: string;
  /** Remote URL to download archive from (mutually exclusive with path) */
  url?: string;
  /** Specific paths to extract (optional) */
  paths?: string[];
}

/**
 * Union type for all source configurations
 */
export type SourceConfig =
  | LocalFolderSourceConfig
  | GitRepoSourceConfig
  | ArchiveSourceConfig;

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
  /** Unified sources configuration */
  sources: SourceConfig[];
  /** Optional custom instruction template for this docset */
  template?: string;
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
  /** The processed keywords for searching */
  search_terms: string;
  /** The processed generalized keywords for broader context */
  generalized_search_terms: string;
  /** The calculated local path for searching */
  path: string;
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
 * Note: Linter may warn about "unused" enum values, but these are used throughout
 * the codebase as ErrorType.CONFIG_NOT_FOUND, etc. The warnings are false positives.
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
export const DEFAULT_TEMPLATE = `Use text search tools (grep, rg, ripgrep) to search for {{keywords}} in {{local_path}}. Try broader terms if needed. Skip: node_modules/, .git/, build/, dist/.`;

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
