/**
 * Metadata manager for tracking web source downloads
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  DocsetMetadata,
  WebSourceMetadata,
  METADATA_FILENAME,
} from "../types.js";

/**
 * Manager for docset metadata files
 */
export class MetadataManager {
  /**
   * Load metadata from a docset directory
   * @param docsetPath - Path to the docset directory
   * @returns Metadata object or null if not found
   */
  async loadMetadata(docsetPath: string): Promise<DocsetMetadata | null> {
    const metadataPath = path.join(docsetPath, METADATA_FILENAME);

    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      return JSON.parse(content) as DocsetMetadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null; // File doesn't exist
      }
      throw error; // Other errors should be propagated
    }
  }

  /**
   * Save metadata to a docset directory
   * @param docsetPath - Path to the docset directory
   * @param metadata - Metadata to save
   */
  async saveMetadata(
    docsetPath: string,
    metadata: DocsetMetadata,
  ): Promise<void> {
    await fs.mkdir(docsetPath, { recursive: true });
    const metadataPath = path.join(docsetPath, METADATA_FILENAME);
    const content = JSON.stringify(metadata, null, 2);
    await fs.writeFile(metadataPath, content, "utf-8");
  }

  /**
   * Create initial metadata for a docset
   * @param docsetId - ID of the docset
   * @returns Initial metadata structure
   */
  createInitialMetadata(docsetId: string): DocsetMetadata {
    return {
      version: "1.0",
      docset_id: docsetId,
      sources: [],
      last_refresh: new Date().toISOString(),
    };
  }

  /**
   * Update metadata for a specific web source
   * @param metadata - Current metadata
   * @param sourceUrl - URL of the web source
   * @param sourceMetadata - New metadata for the source
   * @returns Updated metadata
   */
  updateSourceMetadata(
    metadata: DocsetMetadata,
    sourceUrl: string,
    sourceMetadata: Partial<WebSourceMetadata>,
  ): DocsetMetadata {
    const updatedMetadata = { ...metadata };
    updatedMetadata.last_refresh = new Date().toISOString();

    // Find existing source or create new one
    const existingIndex = updatedMetadata.sources.findIndex(
      (s) => s.url === sourceUrl,
    );

    if (existingIndex >= 0) {
      // Update existing source - TypeScript knows it exists here
      const existing = updatedMetadata.sources[existingIndex]!;
      updatedMetadata.sources[existingIndex] = {
        url: existing.url,
        type: existing.type,
        status: sourceMetadata.status ?? existing.status,
      };

      // Update optional fields if provided, preserve existing if not
      const updated = updatedMetadata.sources[existingIndex]!;
      if (sourceMetadata.last_fetched !== undefined) {
        updated.last_fetched = sourceMetadata.last_fetched;
      } else if (existing.last_fetched !== undefined) {
        updated.last_fetched = existing.last_fetched;
      }

      if (sourceMetadata.content_hash !== undefined) {
        updated.content_hash = sourceMetadata.content_hash;
      } else if (existing.content_hash !== undefined) {
        updated.content_hash = existing.content_hash;
      }

      if (sourceMetadata.files_created !== undefined) {
        updated.files_created = sourceMetadata.files_created;
      } else if (existing.files_created !== undefined) {
        updated.files_created = existing.files_created;
      }

      if (sourceMetadata.error_message !== undefined) {
        updated.error_message = sourceMetadata.error_message;
      } else if (existing.error_message !== undefined) {
        updated.error_message = existing.error_message;
      }
    } else {
      // Add new source - ensure required fields are present
      if (!sourceMetadata.type) {
        throw new Error("Source type is required for new metadata entries");
      }

      const newSource: WebSourceMetadata = {
        url: sourceUrl,
        type: sourceMetadata.type,
        status: sourceMetadata.status || "pending",
      };

      // Add optional fields if provided
      if (sourceMetadata.last_fetched !== undefined) {
        newSource.last_fetched = sourceMetadata.last_fetched;
      }
      if (sourceMetadata.content_hash !== undefined) {
        newSource.content_hash = sourceMetadata.content_hash;
      }
      if (sourceMetadata.files_created !== undefined) {
        newSource.files_created = sourceMetadata.files_created;
      }
      if (sourceMetadata.error_message !== undefined) {
        newSource.error_message = sourceMetadata.error_message;
      }
      updatedMetadata.sources.push(newSource);
    }

    return updatedMetadata;
  }

  /**
   * Get metadata for a specific web source
   * @param metadata - Metadata to search
   * @param sourceUrl - URL of the web source
   * @returns Source metadata or null if not found
   */
  getSourceMetadata(
    metadata: DocsetMetadata,
    sourceUrl: string,
  ): WebSourceMetadata | null {
    return metadata.sources.find((s) => s.url === sourceUrl) || null;
  }

  /**
   * Check if metadata file exists
   * @param docsetPath - Path to the docset directory
   * @returns True if metadata file exists
   */
  async metadataExists(docsetPath: string): Promise<boolean> {
    const metadataPath = path.join(docsetPath, METADATA_FILENAME);
    try {
      await fs.access(metadataPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove metadata for a specific web source
   * @param metadata - Current metadata
   * @param sourceUrl - URL of the web source to remove
   * @returns Updated metadata
   */
  removeSourceMetadata(
    metadata: DocsetMetadata,
    sourceUrl: string,
  ): DocsetMetadata {
    const updatedMetadata = { ...metadata };
    updatedMetadata.last_refresh = new Date().toISOString();
    updatedMetadata.sources = updatedMetadata.sources.filter(
      (s) => s.url !== sourceUrl,
    );
    return updatedMetadata;
  }
}
