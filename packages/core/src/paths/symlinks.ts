/**
 * Symlink management utilities for local_folder sources
 */

import { promises as fs } from "node:fs";
import { resolve, join, isAbsolute } from "node:path";
import { KnowledgeError, ErrorType } from "../types.js";

/**
 * Create symlinks for local_folder source paths
 * @param sourcePaths - Array of local paths to link
 * @param targetDir - Directory where symlinks should be created (.knowledge/docsets/{id})
 * @param projectRoot - Project root directory for resolving relative paths
 */
export async function createSymlinks(
  sourcePaths: string[],
  targetDir: string,
  projectRoot: string,
): Promise<void> {
  try {
    await fs.mkdir(targetDir, { recursive: true });

    for (const sourcePath of sourcePaths) {
      const absoluteSourcePath = isAbsolute(sourcePath)
        ? sourcePath
        : resolve(projectRoot, sourcePath);

      try {
        await fs.access(absoluteSourcePath);
      } catch {
        throw new Error(`Source path does not exist: ${absoluteSourcePath}`);
      }

      // Link each entry inside the source directory directly into targetDir
      // so that the docset root is flat — consistent with git_repo / archive.
      const entries = await fs.readdir(absoluteSourcePath);
      for (const entry of entries) {
        const symlinkPath = join(targetDir, entry);
        const entryAbsPath = join(absoluteSourcePath, entry);

        try {
          await fs.unlink(symlinkPath);
        } catch {
          // ignore — entry doesn't exist yet
        }

        await fs.symlink(entryAbsPath, symlinkPath);
      }
    }
  } catch (error) {
    throw new KnowledgeError(
      ErrorType.PATH_INVALID,
      `Failed to create symlinks: ${(error as Error).message}`,
      { sourcePaths, targetDir, projectRoot, error },
    );
  }
}

/**
 * Validate that symlinks exist and point to valid targets
 * @param targetDir - Directory containing symlinks
 * @returns True if all symlinks are valid
 */
export async function validateSymlinks(targetDir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        const symlinkPath = join(targetDir, entry.name);

        try {
          await fs.access(symlinkPath);
        } catch {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Remove all symlinks in a directory
 * @param targetDir - Directory containing symlinks to remove
 */
export async function removeSymlinks(targetDir: string): Promise<void> {
  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        const symlinkPath = join(targetDir, entry.name);
        await fs.unlink(symlinkPath);
      }
    }
  } catch (error) {
    // Ignore if directory doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
