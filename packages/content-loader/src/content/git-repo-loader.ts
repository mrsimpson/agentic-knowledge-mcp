/**
 * Git repository content loader
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { ContentLoader, type LoadResult } from "./loader.js";
import {
  WebSourceType,
  WebSourceConfig,
  GitRepoOptions,
  WebSourceError,
  WebSourceErrorType,
} from "../types.js";
import * as crypto from "node:crypto";

/**
 * Content loader for Git repositories (GitHub, GitLab, any Git repo)
 */
export class GitRepoLoader extends ContentLoader {
  /**
   * Check if this loader can handle the given web source type
   */
  canHandle(webSource: WebSourceConfig): boolean {
    return webSource.type === WebSourceType.GIT_REPO;
  }

  /**
   * Validate the web source configuration
   */
  validateConfig(webSource: WebSourceConfig): true | string {
    if (!webSource.url) {
      return "Git repository URL is required";
    }

    // Basic URL validation for Git repos
    if (!this.isValidGitUrl(webSource.url)) {
      return "Invalid Git repository URL";
    }

    return true;
  }

  /**
   * Load content from a Git repository
   */
  async load(
    webSource: WebSourceConfig,
    targetPath: string,
  ): Promise<LoadResult> {
    try {
      const options = webSource.options as GitRepoOptions | undefined;
      const tempDir = await this.createTempDirectory();

      try {
        // Clone the repository
        await this.cloneRepository(webSource.url, tempDir, options);

        // Extract specified paths or all content
        const extractedFiles = await this.extractContent(
          tempDir,
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
        // Clean up temp directory
        await this.cleanupTempDirectory(tempDir);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        files: [],
        contentHash: "",
        error: `Git repository loading failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get content identifier for change detection
   */
  async getContentId(webSource: WebSourceConfig): Promise<string> {
    try {
      const options = webSource.options as GitRepoOptions | undefined;
      const branch = options?.branch || "HEAD";

      // Get the latest commit hash from the remote repository
      const command = `git ls-remote ${webSource.url} ${branch}`;
      const output = execSync(command, { encoding: "utf8", timeout: 30000 });
      const commitHash = output.trim().split("\t")[0];

      // Combine with URL and paths for a unique identifier
      const paths = options?.paths ? options.paths.sort().join(",") : "all";
      return crypto
        .createHash("sha256")
        .update(`${webSource.url}:${commitHash}:${paths}`)
        .digest("hex");
    } catch {
      // Fallback to URL-based hash if remote access fails
      const options = webSource.options as GitRepoOptions | undefined;
      const paths = options?.paths ? options.paths.sort().join(",") : "all";
      return crypto
        .createHash("sha256")
        .update(`${webSource.url}:${paths}`)
        .digest("hex");
    }
  }

  /**
   * Validate if URL is a valid Git repository URL
   */
  private isValidGitUrl(url: string): boolean {
    const gitUrlPatterns = [
      /^https:\/\/github\.com\/[\w\-._]+\/[\w\-._]+(?:\.git)?$/,
      /^https:\/\/gitlab\.com\/[\w\-._/]+(?:\.git)?$/,
      /^https:\/\/[\w\-._]+\/[\w\-._/]+\.git$/,
      /^git@[\w\-._]+:[\w\-._/]+\.git$/,
    ];

    return gitUrlPatterns.some((pattern) => pattern.test(url));
  }

  /**
   * Create a temporary directory for cloning
   */
  private async createTempDirectory(): Promise<string> {
    const tempDir = path.join(
      process.cwd(),
      ".tmp",
      `git-clone-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clone the Git repository
   */
  private async cloneRepository(
    url: string,
    targetDir: string,
    options?: GitRepoOptions,
  ): Promise<void> {
    const branch = options?.branch || "main";
    const depth = "--depth 1"; // Shallow clone for efficiency

    let gitCommand = `git clone ${depth} --branch ${branch} ${url} ${targetDir}`;

    // Add authentication if token is provided
    if (options?.token) {
      // For HTTPS URLs, inject token
      if (url.startsWith("https://")) {
        const urlWithToken = url.replace(
          "https://",
          `https://${options.token}@`,
        );
        gitCommand = `git clone ${depth} --branch ${branch} ${urlWithToken} ${targetDir}`;
      }
    }

    try {
      execSync(gitCommand, {
        stdio: "pipe",
        timeout: 120000, // 2 minutes timeout
        cwd: process.cwd(),
      });
    } catch (error) {
      // Try with master branch if main fails
      if (branch === "main") {
        const masterCommand = gitCommand.replace(
          "--branch main",
          "--branch master",
        );
        try {
          execSync(masterCommand, {
            stdio: "pipe",
            timeout: 120000,
            cwd: process.cwd(),
          });
          return;
        } catch {
          // If both fail, throw the original error
        }
      }

      throw new WebSourceError(
        WebSourceErrorType.GIT_REPO_ERROR,
        `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`,
        { url, branch, command: gitCommand },
      );
    }
  }

  /**
   * Extract content from cloned repository to target directory
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
          // Skip files that don't exist or can't be accessed
          console.warn(
            `Warning: Could not extract ${relPath}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } else {
      // Use smart filtering to extract only documentation files (REQ-18)
      await this.extractDocumentationFiles(
        sourceDir,
        targetDir,
        extractedFiles,
      );
    }

    return extractedFiles;
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(
    source: string,
    target: string,
    fileList: string[],
    excludeDirs: string[] = [],
  ): Promise<void> {
    await fs.mkdir(target, { recursive: true });
    const items = await fs.readdir(source);

    for (const item of items) {
      if (excludeDirs.includes(item)) {
        continue;
      }

      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      const stats = await fs.stat(sourcePath);

      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath, fileList, excludeDirs);
      } else {
        await fs.copyFile(sourcePath, targetPath);
        // Calculate relative path from the initial target directory
        const relativePath = path.relative(target, targetPath);
        fileList.push(relativePath);
      }
    }
  }

  /**
   * Generate content hash for change detection
   */
  private async generateContentHash(
    targetDir: string,
    files: string[],
  ): Promise<string> {
    const hash = crypto.createHash("sha256");

    // Sort files for consistent hashing
    const sortedFiles = files.slice().sort();

    for (const file of sortedFiles) {
      const filePath = path.join(targetDir, file);
      try {
        const content = await fs.readFile(filePath);
        hash.update(file); // Include filename
        hash.update(content); // Include content
      } catch (error) {
        // Skip files that can't be read
        console.warn(
          `Warning: Could not hash ${file}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return hash.digest("hex");
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

  /**
   * Filter list of files to only include documentation-relevant files (REQ-18)
   * @param files - Array of file paths to filter
   * @returns Array of file paths that are considered documentation
   */
  private filterDocumentationFiles(files: string[]): string[] {
    return files.filter((file) => this.isDocumentationFile(file));
  }

  /**
   * Determine if a file is considered documentation content (REQ-18)
   * @param filePath - Path to the file to check
   * @returns True if file should be included as documentation
   */
  private isDocumentationFile(filePath: string): boolean {
    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const directory = path.dirname(filePath);

    // Exclude project metadata files (REQ-18)
    const metadataFiles =
      /^(CHANGELOG|LICENSE|CONTRIBUTING|AUTHORS|CODE_OF_CONDUCT)/i;
    if (metadataFiles.test(filename)) {
      return false;
    }

    // Normalize directory path for consistent matching (use forward slashes)
    const normalizedDir = directory.split(path.sep).join("/");
    const pathParts = normalizedDir.split("/");

    // Exclude build, dependency, and development directories (REQ-18)
    // Use exact directory name matching, not substring matching
    const excludedDirs = [
      "node_modules",
      "vendor",
      ".git",
      "build",
      "dist",
      "target",
      ".cache",
      "__tests__",
      "test",
      "tests",
      ".github",
      ".vscode",
      ".idea",
    ];

    // Check if any path segment matches excluded directories
    for (const excludedDir of excludedDirs) {
      if (pathParts.includes(excludedDir)) {
        return false;
      }
    }

    // Include README files anywhere (REQ-18)
    if (/^README/i.test(filename)) {
      return true;
    }

    // Include documentation file extensions anywhere, regardless of directory (REQ-18)
    const docExtensions = [".md", ".mdx", ".rst", ".txt", ".adoc", ".asciidoc"];
    if (docExtensions.includes(extension)) {
      return true;
    }

    // Special case: examples/samples directory - include ALL file types (Issue #12)
    // These directories contain code that demonstrates usage patterns
    const isInExamples = /\b(examples?|samples?)\b/i.test(directory);
    if (isInExamples) {
      // In examples/samples, exclude only binary files
      const excludedInExamples = [
        ".exe",
        ".bin",
        ".so",
        ".dll",
        ".dylib",
        ".a",
        ".o",
        ".obj",
      ];
      return !excludedInExamples.includes(extension);
    }

    return false;
  }

  /**
   * Extract only documentation files from source directory (REQ-18)
   * @param sourceDir - Source directory to scan
   * @param targetDir - Target directory to copy files to
   * @param extractedFiles - Array to track extracted file paths
   */
  private async extractDocumentationFiles(
    sourceDir: string,
    targetDir: string,
    extractedFiles: string[],
  ): Promise<void> {
    // First, scan all files in the repository
    const allFiles = await this.scanAllFiles(sourceDir);

    // Filter to only documentation files
    const docFiles = this.filterDocumentationFiles(allFiles);

    // Copy the filtered files
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
   * Recursively scan all files in a directory
   * @param dir - Directory to scan
   * @returns Array of absolute file paths
   */
  private async scanAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string) {
      const items = await fs.readdir(currentDir);

      for (const item of items) {
        if (item === ".git") continue; // Always skip .git

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
}
