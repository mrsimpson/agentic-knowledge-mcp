/**
 * Types and interfaces for web content loading and management
 */

/**
 * Basic docset configuration (subset needed for web loading)
 */
export interface DocsetConfig {
  /** Unique identifier for the docset */
  id: string;
  /** Human-readable name of the docset */
  name: string;
  /** Description of what this docset contains */
  description?: string;
  /** Path to the documentation (relative to .knowledge folder or absolute) */
  local_path: string;
  /** Optional custom instruction template for this docset */
  template?: string;
}

/**
 * Types of web sources supported
 */
export enum WebSourceType {
  // eslint-disable-next-line no-unused-vars
  GIT_REPO = "git_repo",
  // eslint-disable-next-line no-unused-vars
  DOCUMENTATION_SITE = "documentation_site",
  // eslint-disable-next-line no-unused-vars
  API_DOCUMENTATION = "api_documentation",
}

/**
 * Configuration for Git repository web sources
 */
export interface GitRepoOptions {
  /** Specific paths to extract from the repository */
  paths?: string[];
  /** Branch or tag to checkout (defaults to main/master) */
  branch?: string;
  /** Optional authentication token for private repos */
  token?: string;
}

/**
 * Configuration for documentation site web sources (STUB - not implemented yet)
 */
export interface DocumentationSiteOptions {
  /** Maximum depth to crawl */
  max_depth?: number;
  /** File patterns to include */
  include_patterns?: string[];
  /** File patterns to exclude */
  exclude_patterns?: string[];
}

/**
 * Configuration for API documentation web sources (STUB - not implemented yet)
 */
export interface ApiDocumentationOptions {
  /** Format of the API documentation */
  doc_format?: string;
  /** Packages or modules to include */
  include_packages?: string[];
}

/**
 * Configuration for a single web source
 */
export interface WebSourceConfig {
  /** URL of the web source */
  url: string;
  /** Type of web source */
  type: WebSourceType;
  /** Type-specific options */
  options?: GitRepoOptions | DocumentationSiteOptions | ApiDocumentationOptions;
}

/**
 * Metadata for a single web source download
 */
export interface WebSourceMetadata {
  /** URL of the web source */
  url: string;
  /** Type of web source */
  type: WebSourceType;
  /** Timestamp of last successful fetch */
  last_fetched?: string;
  /** Hash of content for change detection */
  content_hash?: string;
  /** Files created during this fetch */
  files_created?: string[];
  /** Status of last fetch attempt */
  status: "success" | "error" | "pending";
  /** Error message if status is error */
  error_message?: string;
}

/**
 * Metadata file stored in each docset's local_path
 */
export interface DocsetMetadata {
  /** Version of metadata format */
  version: string;
  /** Docset identifier */
  docset_id: string;
  /** Metadata for each web source */
  sources: WebSourceMetadata[];
  /** Timestamp of last refresh attempt */
  last_refresh: string;
}

/**
 * Metadata file name pattern
 */
export const METADATA_FILENAME = ".agentic-metadata.json";

/**
 * Web source specific error types
 */
export enum WebSourceErrorType {
  // eslint-disable-next-line no-unused-vars
  WEB_SOURCE_ERROR = "WEB_SOURCE_ERROR",
  // eslint-disable-next-line no-unused-vars
  GIT_REPO_ERROR = "GIT_REPO_ERROR",
  // eslint-disable-next-line no-unused-vars
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
}

/**
 * Custom error class for web source errors
 */
export class WebSourceError extends Error {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public type: WebSourceErrorType,
    message: string,
    // eslint-disable-next-line no-unused-vars
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "WebSourceError";
  }
}

/**
 * Extended docset config that includes web sources
 */
export interface DocsetConfigWithWebSources extends DocsetConfig {
  /** Optional web sources to load content from */
  web_sources?: WebSourceConfig[];
}
