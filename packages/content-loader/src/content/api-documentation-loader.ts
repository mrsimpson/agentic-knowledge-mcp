/**
 * API documentation content loader (STUB - not implemented yet)
 */

import { ContentLoader, type LoadResult } from "./loader.js";
import {
  WebSourceType,
  WebSourceConfig,
  WebSourceError,
  WebSourceErrorType,
} from "../types.js";

/**
 * Content loader for API documentation (STUB IMPLEMENTATION)
 */
export class ApiDocumentationLoader extends ContentLoader {
  /**
   * Check if this loader can handle the given web source type
   */
  canHandle(webSource: WebSourceConfig): boolean {
    return webSource.type === WebSourceType.API_DOCUMENTATION;
  }

  /**
   * Validate the web source configuration
   */
  validateConfig(webSource: WebSourceConfig): true | string {
    if (!webSource.url) {
      return "API documentation URL is required";
    }
    return true;
  }

  /**
   * Load content from API documentation (NOT IMPLEMENTED)
   */
  async load(
    webSource: WebSourceConfig,
    targetPath: string,
  ): Promise<LoadResult> {
    throw new WebSourceError(
      WebSourceErrorType.NOT_IMPLEMENTED,
      "API documentation loading is not yet implemented. Use git_repo type for repositories with API documentation.",
      { webSource: webSource.url, targetPath },
    );
  }

  /**
   * Get content identifier (NOT IMPLEMENTED)
   */
  async getContentId(webSource: WebSourceConfig): Promise<string> {
    throw new WebSourceError(
      WebSourceErrorType.NOT_IMPLEMENTED,
      "API documentation content ID generation is not yet implemented.",
      { webSource: webSource.url },
    );
  }
}
