/**
 * Abstract base class for content loaders
 */

import type { WebSourceConfig } from "../types.js";

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
   * @param _webSource - Configuration for the web source
   * @param _targetPath - Local directory to store the content
   * @returns Promise with load result
   */
  abstract load(
    _webSource: WebSourceConfig,
    _targetPath: string,
  ): Promise<LoadResult>;

  /**
   * Check if this loader can handle the given web source type
   * @param _webSource - Web source configuration
   * @returns True if this loader can handle the source type
   */
  abstract canHandle(_webSource: WebSourceConfig): boolean;

  /**
   * Validate the web source configuration for this loader
   * @param _webSource - Web source configuration
   * @returns True if configuration is valid, error message if not
   */
  abstract validateConfig(_webSource: WebSourceConfig): true | string;

  /**
   * Get a unique identifier for the content (used for change detection)
   * @param _webSource - Web source configuration
   * @returns Promise with content identifier
   */
  abstract getContentId(_webSource: WebSourceConfig): Promise<string>;
}
