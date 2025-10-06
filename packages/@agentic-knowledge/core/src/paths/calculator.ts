/**
 * Path calculation utilities
 */

import { resolve, dirname, isAbsolute, join, normalize } from 'node:path';
import { promises as fs } from 'node:fs';
import * as fsSync from 'node:fs';
import * as pathModule from 'node:path';
import type { DocsetConfig } from '../types.js';
import { KnowledgeError, ErrorType } from '../types.js';

/**
 * Calculate the local path for a docset
 * @param docset - Docset configuration
 * @param configPath - Path to the configuration file
 * @returns Calculated local path
 */
export function calculateLocalPath(docset: DocsetConfig, configPath: string): string {
  try {
    // Get the directory that contains .knowledge folder (project root)
    const configDir = dirname(configPath); // This is the .knowledge directory
    const projectRoot = dirname(configDir); // This is the project root
    
    // If the path is absolute, use it as-is
    if (isAbsolute(docset.local_path)) {
      return normalize(docset.local_path);
    }
    
    // If relative, resolve relative to project root directory
    const resolvedPath = resolve(projectRoot, docset.local_path);
    return normalize(resolvedPath);
  } catch (error) {
    throw new KnowledgeError(
      ErrorType.PATH_INVALID,
      `Failed to calculate local path for docset '${docset.id}': ${(error as Error).message}`,
      { docset, configPath, error }
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