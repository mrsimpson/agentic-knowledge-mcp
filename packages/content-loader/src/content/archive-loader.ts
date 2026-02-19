/**
 * Archive file content loader (supports zip, tar.gz, etc.)
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import https from "node:https";
import http from "node:http";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import AdmZip from "adm-zip";
import * as tar from "tar";
import { ContentLoader, type LoadResult } from "./loader.js";
import {
  WebSourceType,
  WebSourceConfig,
  ArchiveOptions,
  WebSourceError,
  WebSourceErrorType,
} from "../types.js";
import { filterDocumentationFiles } from "./file-filter.js";

/**
 * Content loader for archive files - zip, tar.gz, etc. (local or remote)
 */
export class ArchiveLoader extends ContentLoader {
  /**
   * Check if this loader can handle the given web source type
   */
  canHandle(webSource: WebSourceConfig): boolean {
    return webSource.type === WebSourceType.ARCHIVE;
  }

  /**
   * Validate the web source configuration
   */
  validateConfig(webSource: WebSourceConfig): true | string {
    if (!webSource.url) {
      return "Archive source must have a URL (remote) or local path";
    }

    return true;
  }

  /**
   * Load content from an archive file
   */
  async load(
    webSource: WebSourceConfig,
    targetPath: string,
  ): Promise<LoadResult> {
    try {
      const options = webSource.options as ArchiveOptions | undefined;
      const tempDir = await this.createTempDirectory();

      try {
        // Get the archive file (download if remote, or use local path)
        const archiveFilePath = await this.resolveArchiveFile(
          webSource.url,
          tempDir,
        );

        // Detect archive type
        const archiveType = this.detectArchiveType(archiveFilePath);

        // Extract to temp directory
        const extractDir = path.join(tempDir, "extracted");
        await fs.mkdir(extractDir, { recursive: true });

        if (archiveType === "zip") {
          this.extractZip(archiveFilePath, extractDir);
        } else if (archiveType === "tar.gz") {
          await this.extractTarGz(archiveFilePath, extractDir);
        } else {
          throw new WebSourceError(
            WebSourceErrorType.ARCHIVE_ERROR,
            `Unsupported archive format. Supported formats: .zip, .tar.gz`,
            { archiveType },
          );
        }

        // Flatten single root directory
        await this.flattenSingleRoot(extractDir);

        // Extract specified paths or all documentation content
        const extractedFiles = await this.extractContent(
          extractDir,
          targetPath,
          options?.paths,
        );

        // Generate content hash
        const contentHash = await this.generateContentHash(
          targetPath,
          extractedFiles,
        );

        return {
          success: true,
          files: extractedFiles,
          contentHash,
        };
      } finally {
        await this.cleanupTempDirectory(tempDir);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        files: [],
        contentHash: "",
        error: `Archive loading failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get content identifier for change detection
   */
  async getContentId(webSource: WebSourceConfig): Promise<string> {
    try {
      if (this.isRemoteUrl(webSource.url)) {
        // For remote URLs, try HEAD request for ETag/Last-Modified
        const headers = await this.getRemoteHeaders(webSource.url);
        const etag = headers["etag"] || "";
        const lastModified = headers["last-modified"] || "";
        const identifier = etag || lastModified || webSource.url;

        return crypto
          .createHash("sha256")
          .update(`${webSource.url}:${identifier}`)
          .digest("hex");
      } else {
        // For local files, hash the file content
        const content = await fs.readFile(webSource.url);
        return crypto.createHash("sha256").update(content).digest("hex");
      }
    } catch {
      // Fallback to URL-based hash
      return crypto.createHash("sha256").update(webSource.url).digest("hex");
    }
  }

  /**
   * Get headers from remote URL using HEAD request
   */
  private getRemoteHeaders(url: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https : http;
      const request = protocol.request(url, { method: "HEAD" }, (response) => {
        const headers: Record<string, string> = {};
        if (response.headers) {
          for (const [key, value] of Object.entries(response.headers)) {
            if (typeof value === "string") {
              headers[key] = value;
            } else if (Array.isArray(value) && value.length > 0 && value[0]) {
              headers[key] = value[0];
            }
          }
        }
        resolve(headers);
      });

      request.on("error", reject);
      request.end();
    });
  }

  /**
   * Determine if the source is a remote URL or local path
   */
  private isRemoteUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }

  /**
   * Detect archive type based on file extension
   */
  private detectArchiveType(filePath: string): "zip" | "tar.gz" | "unknown" {
    const lowerPath = filePath.toLowerCase();
    if (lowerPath.endsWith(".tar.gz") || lowerPath.endsWith(".tgz")) {
      return "tar.gz";
    }
    if (lowerPath.endsWith(".zip")) {
      return "zip";
    }
    return "unknown";
  }

  /**
   * Resolve the archive file path - download if remote, return as-is if local
   */
  private async resolveArchiveFile(
    url: string,
    tempDir: string,
  ): Promise<string> {
    if (this.isRemoteUrl(url)) {
      return this.downloadArchive(url, tempDir);
    }

    // Local file - verify it exists
    try {
      await fs.access(url);
      return url;
    } catch {
      throw new WebSourceError(
        WebSourceErrorType.ARCHIVE_ERROR,
        `Local archive file not found: ${url}`,
        { url },
      );
    }
  }

  /**
   * Download an archive file from a remote URL
   */
  private async downloadArchive(url: string, tempDir: string): Promise<string> {
    // Determine filename from URL
    const urlPath = new URL(url).pathname;
    const filename = path.basename(urlPath) || "download.archive";
    const archivePath = path.join(tempDir, filename);

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith("https") ? https : http;
      const request = protocol.get(url, async (response) => {
        if (response.statusCode === undefined || response.statusCode >= 400) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`),
          );
          return;
        }

        try {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          response.on("end", async () => {
            try {
              const buffer = Buffer.concat(chunks);
              await fs.writeFile(archivePath, buffer);
              resolve(archivePath);
            } catch (error) {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      });

      request.on("error", (error) => {
        reject(
          new WebSourceError(
            WebSourceErrorType.ARCHIVE_ERROR,
            `Failed to download archive from ${url}: ${error instanceof Error ? error.message : String(error)}`,
            { url },
          ),
        );
      });
    });
  }

  /**
   * Extract a zip file to a directory using adm-zip
   */
  private extractZip(zipPath: string, targetDir: string): void {
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(targetDir, true);
    } catch (error) {
      throw new WebSourceError(
        WebSourceErrorType.ARCHIVE_ERROR,
        `Failed to extract zip: ${error instanceof Error ? error.message : String(error)}`,
        { zipPath },
      );
    }
  }

  /**
   * Extract a tar.gz file to a directory
   */
  private async extractTarGz(
    tarGzPath: string,
    targetDir: string,
  ): Promise<void> {
    try {
      await tar.extract({
        file: tarGzPath,
        cwd: targetDir,
        strip: 0,
      });
    } catch (error) {
      throw new WebSourceError(
        WebSourceErrorType.ARCHIVE_ERROR,
        `Failed to extract tar.gz: ${error instanceof Error ? error.message : String(error)}`,
        { tarGzPath },
      );
    }
  }

  /**
   * If the extracted contents have a single root directory and no files at root,
   * move that directory's contents one level up.
   */
  private async flattenSingleRoot(extractDir: string): Promise<void> {
    const entries = await fs.readdir(extractDir, { withFileTypes: true });

    const directories = entries.filter((e) => e.isDirectory());
    const files = entries.filter((e) => e.isFile());

    if (directories.length === 1 && files.length === 0) {
      const singleDir = path.join(extractDir, directories[0]!.name);
      const innerEntries = await fs.readdir(singleDir);

      // Move all contents up one level
      for (const entry of innerEntries) {
        const src = path.join(singleDir, entry);
        const dest = path.join(extractDir, entry);
        await fs.rename(src, dest);
      }

      // Remove the now-empty directory
      await fs.rmdir(singleDir);
    }
  }

  /**
   * Extract content from extracted archive to target directory
   */
  private async extractContent(
    sourceDir: string,
    targetDir: string,
    paths?: string[],
  ): Promise<string[]> {
    await fs.mkdir(targetDir, { recursive: true });
    const extractedFiles: string[] = [];

    if (paths && paths.length > 0) {
      // Extract only specified paths
      for (const relPath of paths) {
        const sourcePath = path.join(sourceDir, relPath);
        const targetPath = path.join(targetDir, relPath);

        try {
          const stats = await fs.stat(sourcePath);
          if (stats.isDirectory()) {
            await this.copyDirectory(sourcePath, targetPath, extractedFiles);
          } else if (stats.isFile()) {
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.copyFile(sourcePath, targetPath);
            extractedFiles.push(relPath);
          }
        } catch (error) {
          console.warn(
            `Warning: Could not extract ${relPath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } else {
      // Use smart filtering to extract only documentation files
      await this.extractDocumentationFiles(
        sourceDir,
        targetDir,
        extractedFiles,
      );
    }

    return extractedFiles;
  }

  /**
   * Extract only documentation files from source directory
   */
  private async extractDocumentationFiles(
    sourceDir: string,
    targetDir: string,
    extractedFiles: string[],
  ): Promise<void> {
    const allFiles = await this.scanAllFiles(sourceDir);
    const docFiles = filterDocumentationFiles(allFiles);

    for (const filePath of docFiles) {
      const relativePath = path.relative(sourceDir, filePath);
      const targetPath = path.join(targetDir, relativePath);

      try {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(filePath, targetPath);
        extractedFiles.push(relativePath);
      } catch (error) {
        console.warn(
          `Warning: Could not copy ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(
    source: string,
    target: string,
    fileList: string[],
  ): Promise<void> {
    await fs.mkdir(target, { recursive: true });
    const items = await fs.readdir(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      const stats = await fs.stat(sourcePath);

      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath, fileList);
      } else {
        await fs.copyFile(sourcePath, targetPath);
        const relativePath = path.relative(target, targetPath);
        fileList.push(relativePath);
      }
    }
  }

  /**
   * Recursively scan all files in a directory
   */
  private async scanAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);

      for (const item of items) {
        if (item === ".git") continue;

        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
          await scan(fullPath);
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    }

    await scan(dir);
    return files;
  }

  /**
   * Generate content hash for change detection
   */
  private async generateContentHash(
    targetDir: string,
    files: string[],
  ): Promise<string> {
    const hash = crypto.createHash("sha256");
    const sortedFiles = files.slice().sort();

    for (const file of sortedFiles) {
      const filePath = path.join(targetDir, file);
      try {
        const content = await fs.readFile(filePath);
        hash.update(file);
        hash.update(content);
      } catch (error) {
        console.warn(
          `Warning: Could not hash ${file}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return hash.digest("hex");
  }

  /**
   * Create a temporary directory
   */
  private async createTempDirectory(): Promise<string> {
    const tempDir = path.join(
      process.cwd(),
      ".tmp",
      `archive-extract-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up temporary directory
   */
  private async cleanupTempDirectory(tempDir: string): Promise<void> {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `Warning: Could not clean up temp directory ${tempDir}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
