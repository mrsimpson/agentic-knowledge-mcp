/**
 * Abstract base class for content loaders
 */

import type { WebSourceConfig, WebSourceMetadata } from "../types.js";

/**
 * Result of a content loading operation
 */
export interface LoadResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Files that were created or updated */
  files: string[];
  /** Hash of the loaded content for change detection */
  contentHash: string;
  /** Error message if success is false */
  error?: string;
}

/**
 * Abstract base class for loading content from different web sources
 */
export abstract class ContentLoader {
  /**
   * Load content from a web source to the specified target directory
   * @param webSource - Configuration for the web source
   * @param targetPath - Local directory to store the content
   * @returns Promise with load result
   */
  abstract load(
    webSource: WebSourceConfig,
    targetPath: string,
  ): Promise<LoadResult>;

  /**
   * Check if this loader can handle the given web source type
   * @param webSource - Web source configuration
   * @returns True if this loader can handle the source type
   */
  abstract canHandle(webSource: WebSourceConfig): boolean;

  /**
   * Validate the web source configuration for this loader
   * @param webSource - Web source configuration
   * @returns True if configuration is valid, error message if not
   */
  abstract validateConfig(webSource: WebSourceConfig): true | string;

  /**
   * Get a unique identifier for the content (used for change detection)
   * @param webSource - Web source configuration
   * @returns Promise with content identifier
   */
  abstract getContentId(webSource: WebSourceConfig): Promise<string>;
}
