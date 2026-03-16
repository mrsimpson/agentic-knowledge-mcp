/**
 * Typed API parameter and result types for programmatic use of CLI features.
 */

import type { DocsetConfig } from "@codemcp/knowledge-core";
import type {
  SourceResult,
  InitDocsetResult,
} from "@codemcp/knowledge-content-loader";

export type { DocsetConfig, SourceResult, InitDocsetResult };

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

export type DocsetPreset = "git-repo" | "local-folder" | "archive";

export interface CreateDocsetParams {
  /** Preset type controlling which source type is created */
  preset: DocsetPreset;
  /** Unique identifier for the new docset */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Git repository URL (git-repo) or remote archive URL (archive) */
  url?: string;
  /** Local folder path (local-folder) or local archive file path (archive) */
  path?: string;
  /** Git branch to clone (git-repo, defaults to "main") */
  branch?: string;
  /** Specific sub-paths to extract/include from the source */
  paths?: string[];
}

export interface CreateDocsetOptions {
  /** Working directory used to locate or create .knowledge/config.yaml (defaults to process.cwd()) */
  cwd?: string;
}

export interface CreateDocsetResult {
  /** The newly created docset configuration that was written to the config file */
  docset: DocsetConfig;
  /** Absolute path of the config file that was written */
  configPath: string;
  /** True when the .knowledge/config.yaml file was newly created by this call */
  configCreated: boolean;
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

export interface InitDocsetParams {
  /** ID of the docset to initialize (must exist in config) */
  docsetId: string;
  /** Force re-initialization even if the docset is already present */
  force?: boolean;
  /**
   * After initialization, discover directory patterns from extracted files
   * and update the config with them.
   */
  discoverPaths?: boolean;
  /** Working directory used to locate .knowledge/config.yaml (defaults to process.cwd()) */
  cwd?: string;
  /** Called after each source is processed so callers can display progress */
  onSourceProgress?: (result: SourceResult) => void;
}

export interface InitDocsetApiResult extends InitDocsetResult {
  /** Patterns discovered from extracted files (only set when discoverPaths was true) */
  discoveredPaths?: string[];
}

// ---------------------------------------------------------------------------
// refresh
// ---------------------------------------------------------------------------

export interface RefreshParams {
  /** ID of a specific docset to refresh; omit to refresh all docsets */
  docsetId?: string;
  /** Force refresh even if content appears unchanged */
  force?: boolean;
  /** Working directory used to locate .knowledge/config.yaml (defaults to process.cwd()) */
  cwd?: string;
}

export interface DocsetRefreshResult {
  docsetId: string;
  success: boolean;
  /** True when the docset was intentionally skipped (e.g. recently refreshed, not initialized) */
  skipped: boolean;
  skipReason?: string;
  totalFiles?: number;
  sourcesRefreshed?: number;
  error?: string;
}

export interface RefreshResult {
  docsets: DocsetRefreshResult[];
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

export interface StatusParams {
  /** Working directory used to locate .knowledge/config.yaml (defaults to process.cwd()) */
  cwd?: string;
}

export interface DocsetSourceStatus {
  sourceUrl: string;
  sourceType: string;
  downloadedAt: string;
  filesCount: number;
  lastCommit?: string;
  contentHash?: string;
}

export interface DocsetStatusInfo {
  id: string;
  name: string;
  description?: string;
  initialized: boolean;
  metadata?: {
    initializedAt: string;
    lastRefreshed?: string;
    totalFiles: number;
    sourcesCount: number;
  };
  sources: DocsetSourceStatus[];
  error?: string;
}

export interface StatusResult {
  configPath: string;
  docsets: DocsetStatusInfo[];
}
