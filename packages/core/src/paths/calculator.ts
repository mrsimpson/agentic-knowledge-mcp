/**
 * Path calculation utilities
 */

import {
  resolve,
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
} from "node:path";
import { promises as fs } from "node:fs";
import * as fsSync from "node:fs";
import * as pathModule from "node:path";
import type { DocsetConfig } from "../types.js";
import { KnowledgeError, ErrorType } from "../types.js";
import { createSymlinks } from "./symlinks.js";

/**
 * Calculate the local path for a docset
 * @param docset - Docset configuration
 * @param configPath - Path to the configuration file
 * @returns Calculated local path
 */
export function calculateLocalPath(
  docset: DocsetConfig,
  configPath: string,
): string {
  try {
    const configDir = dirname(configPath); // This is the .knowledge directory
    const projectRoot = dirname(configDir); // This is the project root

    if (!docset.sources || docset.sources.length === 0) {
      throw new Error(`Docset '${docset.id}' must have sources configured`);
    }

    // For now, use the first source to determine the path
    const primarySource = docset.sources[0];

    if (primarySource.type === "local_folder") {
      // For local folders, return relative path from project root
      const firstPath = primarySource.paths[0];

      if (isAbsolute(firstPath)) {
        // If absolute path, return as-is
        return normalize(firstPath);
      }

      // If relative path, resolve from project root and return relative
      const resolvedPath = resolve(projectRoot, firstPath);
      return relative(projectRoot, resolvedPath) || ".";
    }

    if (primarySource.type === "git_repo") {
      // For git repos, use standardized path: .knowledge/docsets/{id}
      return join(configDir, "docsets", docset.id);
    }

    throw new Error(`Unsupported source type: ${primarySource.type}`);
  } catch (error) {
    throw new KnowledgeError(
      ErrorType.PATH_INVALID,
      `Failed to calculate local path for docset '${docset.id}': ${(error as Error).message}`,
      { docset, configPath, error },
    );
  }
}

/**
 * Calculate the local path for a docset and create symlinks if needed
 * @param docset - Docset configuration
 * @param configPath - Path to the configuration file
 * @returns Calculated local path
 */
export async function calculateLocalPathWithSymlinks(
  docset: DocsetConfig,
  configPath: string,
): Promise<string> {
  const configDir = dirname(configPath);
  const projectRoot = dirname(configDir);

  if (!docset.sources || docset.sources.length === 0) {
    throw new Error(`Docset '${docset.id}' must have sources configured`);
  }

  const primarySource = docset.sources[0];

  if (primarySource.type === "local_folder") {
    // Create symlinks in .knowledge/docsets/{id}/
    const symlinkDir = join(configDir, "docsets", docset.id);

    try {
      await createSymlinks(primarySource.paths, symlinkDir, projectRoot);

      // Return relative path to symlink directory
      return relative(projectRoot, symlinkDir) || ".";
    } catch (error) {
      throw new KnowledgeError(
        ErrorType.PATH_INVALID,
        `Failed to create symlinks for docset '${docset.id}': ${(error as Error).message}`,
        { docset, configPath, error },
      );
    }
  }

  if (primarySource.type === "git_repo") {
    // For git repos, use standardized path: .knowledge/docsets/{id}
    return join(configDir, "docsets", docset.id);
  }

  throw new Error(`Unsupported source type: ${primarySource.type}`);
}

/**
 * Ensure .knowledge/.gitignore exists with docsets/ ignored
 * @param configPath - Path to the configuration file
 */
export async function ensureKnowledgeGitignore(
  configPath: string,
): Promise<void> {
  try {
    const configDir = dirname(configPath);
    const gitignorePath = join(configDir, ".gitignore");

    // Check if .gitignore already exists
    try {
      const content = await fs.readFile(gitignorePath, "utf-8");
      // Check if it already contains docsets/ ignore rule
      if (content.includes("docsets/")) {
        return; // Already configured
      }
      // Append to existing file
      await fs.appendFile(
        gitignorePath,
        "\n# Agentic Knowledge - Downloaded docsets\ndocsets/\n",
      );
    } catch (error) {
      // File doesn't exist, create it
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await fs.writeFile(
          gitignorePath,
          "# Agentic Knowledge - Downloaded docsets\ndocsets/\n",
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    // Don't fail the entire operation if gitignore creation fails
    console.warn(
      `Warning: Could not create .knowledge/.gitignore: ${(error as Error).message}`,
    );
  }
}

/**
 * Synchronous version of ensureKnowledgeGitignore
 * @param configPath - Path to the configuration file
 */
export function ensureKnowledgeGitignoreSync(configPath: string): void {
  try {
    const configDir = dirname(configPath);
    const gitignorePath = join(configDir, ".gitignore");

    // Check if .gitignore already exists
    try {
      const content = fsSync.readFileSync(gitignorePath, "utf-8");
      // Check if it already contains docsets/ ignore rule
      if (content.includes("docsets/")) {
        return; // Already configured
      }
      // Append to existing file
      fsSync.appendFileSync(
        gitignorePath,
        "\n# Agentic Knowledge - Downloaded docsets\ndocsets/\n",
      );
    } catch (error) {
      // File doesn't exist, create it
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        fsSync.writeFileSync(
          gitignorePath,
          "# Agentic Knowledge - Downloaded docsets\ndocsets/\n",
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    // Don't fail the entire operation if gitignore creation fails
    console.warn(
      `Warning: Could not create .knowledge/.gitignore: ${(error as Error).message}`,
    );
  }
}

/**
 * Format a path for use in instructions (normalize separators, etc.)
 * @param path - Path to format
 * @returns Formatted path
 */
export function formatPath(path: string): string {
  // Normalize path separators and remove redundant separators
  const normalized = normalize(path);

  // Ensure path ends with separator for directory paths (if it looks like a directory)
  // This helps with search instructions that need to specify directories
  return normalized;
}

/**
 * Validate that a path is accessible and exists
 * @param path - Path to validate
 * @returns True if path exists and is accessible
 */
export async function validatePath(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous version of validatePath
 * @param path - Path to validate
 * @returns True if path exists and is accessible
 */
export function validatePathSync(path: string): boolean {
  try {
    fsSync.accessSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get relative path from one location to another (useful for instructions)
 * @param from - Starting path
 * @param to - Target path
 * @returns Relative path from 'from' to 'to'
 */
export function getRelativePath(from: string, to: string): string {
  return pathModule.relative(from, to);
}
