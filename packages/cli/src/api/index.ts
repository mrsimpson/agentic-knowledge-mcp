/**
 * Typed programmatic API for agentic-knowledge CLI features.
 *
 * Use these functions to interact with docsets from code without going through
 * the CLI binary. All functions throw typed errors instead of calling
 * `process.exit()`, return structured results instead of printing to stdout,
 * and accept an optional `cwd` option so callers can control which
 * `.knowledge/config.yaml` is used.
 *
 * @example
 * ```ts
 * import { createDocset, initDocset, getStatus } from "@codemcp/knowledge-cli";
 *
 * // Add a new git-repo docset to the config
 * const { docset, configPath } = await createDocset({
 *   preset: "git-repo",
 *   id: "my-docs",
 *   name: "My Docs",
 *   url: "https://github.com/example/docs.git",
 * });
 *
 * // Download the sources
 * const result = await initDocset({ docsetId: "my-docs" });
 * console.log(`Initialized ${result.totalFiles} files at ${result.localPath}`);
 *
 * // Query status
 * const status = await getStatus();
 * console.log(status.docsets);
 * ```
 */

export { createDocset } from "./create.js";
export { initDocset } from "./init.js";
export { refreshDocsets } from "./refresh.js";
export { getStatus } from "./status.js";
export type {
  // create
  DocsetPreset,
  CreateDocsetParams,
  CreateDocsetOptions,
  CreateDocsetResult,
  // init
  InitDocsetParams,
  InitDocsetApiResult,
  // refresh
  RefreshParams,
  RefreshResult,
  DocsetRefreshResult,
  // status
  StatusParams,
  StatusResult,
  DocsetStatusInfo,
  DocsetSourceStatus,
  // re-exported from dependencies
  DocsetConfig,
  SourceResult,
  InitDocsetResult,
} from "./types.js";
