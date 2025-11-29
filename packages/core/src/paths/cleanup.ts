/**
 * Safe directory cleanup utilities
 *
 * These functions ensure that when clearing docset directories containing
 * symlinks (for local_folder sources), we never delete the actual source files.
 */

import { promises as fs } from "node:fs";

/**
 * Safely clear a directory that may contain symlinks
 *
 * SAFETY GUARANTEE:
 * - Removes symlinks without following them (source files are preserved)
 * - Removes regular files and directories
 * - Node.js fs.rm does NOT follow symlinks by default
 *
 * This function is used when force re-initializing docsets that may contain
 * symlinks to local_folder sources. It's critical that we never delete the
 * actual source files, only the symlinks pointing to them.
 *
 * @param dirPath - Path to directory to clear
 * @throws If directory doesn't exist or cannot be removed
 */
export async function safelyClearDirectory(dirPath: string): Promise<void> {
  try {
    // Verify directory exists
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }

    // Remove directory and all contents
    // SAFETY: fs.rm does NOT follow symlinks - it only removes the symlink itself
    // This is guaranteed by Node.js fs module behavior
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Directory doesn't exist - that's fine
      return;
    }
    throw error;
  }
}

/**
 * Check if a directory contains symlinks
 *
 * Useful for verification and logging purposes.
 *
 * @param dirPath - Directory to check
 * @returns True if directory contains at least one symlink
 */
export async function containsSymlinks(dirPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        return true;
      }
    }

    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * Get information about directory contents
 *
 * Returns counts of files, directories, and symlinks for logging/verification.
 *
 * @param dirPath - Directory to analyze
 * @returns Object with counts of different entry types
 */
export async function getDirectoryInfo(dirPath: string): Promise<{
  files: number;
  directories: number;
  symlinks: number;
  total: number;
}> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const info = {
      files: 0,
      directories: 0,
      symlinks: 0,
      total: entries.length,
    };

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        info.symlinks++;
      } else if (entry.isDirectory()) {
        info.directories++;
      } else if (entry.isFile()) {
        info.files++;
      }
    }

    return info;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { files: 0, directories: 0, symlinks: 0, total: 0 };
    }
    throw error;
  }
}
