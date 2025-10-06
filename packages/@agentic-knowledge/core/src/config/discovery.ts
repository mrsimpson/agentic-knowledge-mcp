/**
 * Configuration discovery functionality
 */

import { promises as fs } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { CONFIG_DIR, CONFIG_FILENAME } from '../types.js';

/**
 * Find the configuration path by walking up the directory tree
 * @param startPath - Starting directory path (defaults to current working directory)
 * @returns Path to config file or null if not found
 */
export async function findConfigPath(startPath: string = process.cwd()): Promise<string | null> {
  let currentDir = resolve(startPath);
  const rootDir = dirname(currentDir);

  while (currentDir !== rootDir) {
    const configDir = join(currentDir, CONFIG_DIR);
    const configPath = join(configDir, CONFIG_FILENAME);
    
    try {
      const stats = await fs.stat(configPath);
      if (stats.isFile()) {
        return configPath;
      }
    } catch {
      // File doesn't exist, continue searching
    }
    
    // Move up one directory
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }
  
  return null;
}

/**
 * Synchronous version of findConfigPath for cases where async is not suitable
 * @param startPath - Starting directory path (defaults to current working directory)
 * @returns Path to config file or null if not found
 */
export function findConfigPathSync(startPath: string = process.cwd()): string | null {
  let currentDir = resolve(startPath);
  const rootDir = dirname(currentDir);

  while (currentDir !== rootDir) {
    const configDir = join(currentDir, CONFIG_DIR);
    const configPath = join(configDir, CONFIG_FILENAME);
    
    try {
      const fs = require('node:fs');
      const stats = fs.statSync(configPath);
      if (stats.isFile()) {
        return configPath;
      }
    } catch {
      // File doesn't exist, continue searching
    }
    
    // Move up one directory
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }
  
  return null;
}