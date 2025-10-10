/**
 * Content processor for converting and preparing content
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

/**
 * Options for content processing
 */
export interface ProcessingOptions {
  /** Add frontmatter with source metadata */
  addFrontmatter?: boolean;
  /** Source URL to include in frontmatter */
  sourceUrl?: string;
  /** Additional metadata to include */
  metadata?: Record<string, unknown>;
}

/**
 * Content processor for converting and preparing documentation content
 */
export class ContentProcessor {
  /**
   * Process a file, optionally adding frontmatter metadata
   * @param filePath - Path to the file to process
   * @param options - Processing options
   */
  async processFile(
    filePath: string,
    options: ProcessingOptions = {},
  ): Promise<void> {
    const content = await fs.readFile(filePath, "utf-8");
    const extension = path.extname(filePath).toLowerCase();

    // For markdown files, optionally add frontmatter
    if (extension === ".md" || extension === ".mdx") {
      if (options.addFrontmatter) {
        const processedContent = this.addFrontmatter(content, options);
        await fs.writeFile(filePath, processedContent, "utf-8");
      }
    }

    // For other file types, we keep them as-is for now
    // Future: HTML to Markdown conversion would go here
  }

  /**
   * Add frontmatter to markdown content
   * @param content - Original markdown content
   * @param options - Processing options with metadata
   * @returns Content with frontmatter added
   */
  private addFrontmatter(content: string, options: ProcessingOptions): string {
    // Check if frontmatter already exists
    if (content.startsWith("---\n")) {
      return content; // Don't modify existing frontmatter
    }

    const frontmatter: Record<string, unknown> = {};

    if (options.sourceUrl) {
      frontmatter["source_url"] = options.sourceUrl;
    }

    if (options.metadata) {
      Object.assign(frontmatter, options.metadata);
    }

    // Add processed timestamp
    frontmatter["processed_at"] = new Date().toISOString();

    // Convert to YAML frontmatter
    const yamlFrontmatter = this.objectToYaml(frontmatter);

    return `---\n${yamlFrontmatter}---\n\n${content}`;
  }

  /**
   * Simple object to YAML conversion for frontmatter
   * @param obj - Object to convert
   * @returns YAML string
   */
  private objectToYaml(obj: Record<string, unknown>): string {
    return (
      Object.entries(obj)
        .map(([key, value]) => {
          if (typeof value === "string") {
            // Quote strings that contain special characters
            const needsQuotes = /[:\n\r\t"']/.test(value);
            return `${key}: ${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}`;
          }
          return `${key}: ${value}`;
        })
        .join("\n") + "\n"
    );
  }

  /**
   * Check if a file should be processed based on its extension
   * @param filePath - Path to check
   * @returns True if file should be processed
   */
  shouldProcess(filePath: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    const processableExtensions = [
      ".md",
      ".mdx",
      ".txt",
      ".rst",
      ".adoc",
      ".asciidoc",
    ];
    return processableExtensions.includes(extension);
  }
}
