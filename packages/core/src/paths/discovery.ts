/**
 * Path discovery utilities for converting file lists to directory patterns
 */

import * as path from "node:path";

/**
 * Convert a list of file paths to directory patterns
 *
 * This function analyzes a list of files and identifies directory patterns
 * to avoid storing hundreds of individual file paths in the configuration.
 *
 * Examples:
 * - ["docs/guide/intro.md", "docs/guide/advanced.md"] → ["docs/"]
 * - ["README.md", "LICENSE"] → ["README.md", "LICENSE"]
 * - ["examples/basic.js", "examples/advanced.js"] → ["examples/"]
 *
 * @param files - Array of file paths (relative paths)
 * @returns Array of directory patterns and standalone files
 */
export function discoverDirectoryPatterns(files: string[]): string[] {
  if (files.length === 0) {
    return [];
  }

  // Build a tree structure to identify directories with multiple files
  const tree: Record<string, number> = {};

  for (const file of files) {
    const dir = path.dirname(file);

    // Count files in each directory and parent directories
    if (dir === ".") {
      // File in root - count separately
      tree[file] = (tree[file] || 0) + 1;
    } else {
      // Count files in this directory
      const parts = dir.split(path.sep);

      // Track the top-level directory
      const topLevel = parts[0];
      tree[topLevel + path.sep] = (tree[topLevel + path.sep] || 0) + 1;
    }
  }

  // Identify patterns:
  // - If a directory has 2+ files, use the directory pattern
  // - If a file is alone in root, keep it as individual file

  const patterns = new Set<string>();
  const processedFiles = new Set<string>();

  // First pass: identify directories with multiple files
  for (const [key, count] of Object.entries(tree)) {
    if (key.endsWith(path.sep) && count >= 2) {
      // This is a directory with 2+ files - use directory pattern
      patterns.add(key);

      // Mark all files in this directory as processed
      for (const file of files) {
        if (file.startsWith(key.replace(/\/$/, ""))) {
          processedFiles.add(file);
        }
      }
    }
  }

  // Second pass: add individual files that weren't part of a directory pattern
  for (const file of files) {
    if (!processedFiles.has(file)) {
      const dir = path.dirname(file);

      if (dir === ".") {
        // File in root directory
        patterns.add(file);
      } else {
        // Check if this file's parent directory should be added
        const parts = dir.split(path.sep);
        const topLevel = parts[0];
        if (topLevel) {
          const dirPattern = topLevel + path.sep;

          if (!patterns.has(dirPattern)) {
            // Single file in this directory - add it individually
            patterns.add(file);
          }
        }
      }
    }
  }

  // Convert to array and sort for consistent output
  return Array.from(patterns).sort();
}

/**
 * Alternative strategy: Use minimum number of patterns to cover all files
 *
 * This is a more aggressive approach that minimizes the number of patterns
 * by finding the shortest common directory prefix for groups of files.
 *
 * @param files - Array of file paths
 * @returns Array of minimal directory patterns
 */
export function discoverMinimalPatterns(files: string[]): string[] {
  if (files.length === 0) {
    return [];
  }

  // Group files by top-level directory
  const dirGroups = new Map<string, string[]>();
  const rootFiles: string[] = [];

  for (const file of files) {
    const dir = path.dirname(file);

    if (dir === ".") {
      rootFiles.push(file);
    } else {
      const parts = dir.split(path.sep);
      const topLevel = parts[0];
      if (topLevel) {
        const group = dirGroups.get(topLevel) || [];
        group.push(file);
        dirGroups.set(topLevel, group);
      }
    }
  }

  const patterns: string[] = [];

  // Add root files
  patterns.push(...rootFiles);

  // Add directory patterns for groups
  for (const [topLevel, groupFiles] of dirGroups.entries()) {
    if (groupFiles.length === 1) {
      // Only one file in this directory - add individually
      const firstFile = groupFiles[0];
      if (firstFile) {
        patterns.push(firstFile);
      }
    } else {
      // Multiple files - use directory pattern
      patterns.push(topLevel + path.sep);
    }
  }

  return patterns.sort();
}
