/**
 * Configuration loading and validation
 */

import { promises as fs } from 'node:fs';
import * as fsSync from 'node:fs';
import { load } from 'js-yaml';
import type { KnowledgeConfig, DocsetConfig } from '../types.js';
import { KnowledgeError, ErrorType } from '../types.js';
import { validateTemplate } from '../templates/processor.js';

/**
 * Load configuration from a YAML file with strict template validation
 * @param configPath - Path to the configuration file
 * @returns Parsed configuration object
 */
export async function loadConfig(configPath: string): Promise<KnowledgeConfig> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = load(content) as unknown;
    
    if (!validateConfig(parsed)) {
      throw new KnowledgeError(
        ErrorType.CONFIG_INVALID,
        'Configuration file contains invalid structure',
        { configPath, parsed }
      );
    }
    
    // Validate templates strictly at load time
    validateAllTemplates(parsed, configPath);
    
    return parsed;
  } catch (error) {
    if (error instanceof KnowledgeError) {
      throw error;
    }
    
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new KnowledgeError(
        ErrorType.CONFIG_NOT_FOUND,
        `Configuration file not found: ${configPath}`,
        { configPath }
      );
    }
    
    throw new KnowledgeError(
      ErrorType.YAML_PARSE_ERROR,
      `Failed to parse YAML configuration: ${(error as Error).message}`,
      { configPath, error }
    );
  }
}

/**
 * Synchronous version of loadConfig with strict template validation
 * @param configPath - Path to the configuration file
 * @returns Parsed configuration object
 */
export function loadConfigSync(configPath: string): KnowledgeConfig {
  try {
    const content = fsSync.readFileSync(configPath, 'utf-8');
    const parsed = load(content) as unknown;
    
    if (!validateConfig(parsed)) {
      throw new KnowledgeError(
        ErrorType.CONFIG_INVALID,
        'Configuration file contains invalid structure',
        { configPath, parsed }
      );
    }
    
    // Validate templates strictly at load time
    validateAllTemplates(parsed, configPath);
    
    return parsed;
  } catch (error) {
    if (error instanceof KnowledgeError) {
      throw error;
    }
    
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new KnowledgeError(
        ErrorType.CONFIG_NOT_FOUND,
        `Configuration file not found: ${configPath}`,
        { configPath }
      );
    }
    
    throw new KnowledgeError(
      ErrorType.YAML_PARSE_ERROR,
      `Failed to parse YAML configuration: ${(error as Error).message}`,
      { configPath, error }
    );
  }
}

/**
 * Validate all templates in configuration at load time
 * @param config - Configuration object to validate
 * @param configPath - Path to config file for error context
 */
function validateAllTemplates(config: KnowledgeConfig, configPath: string): void {
  // Validate global template if present
  if (config.template) {
    try {
      validateTemplate(config.template);
    } catch (error) {
      throw new KnowledgeError(
        ErrorType.TEMPLATE_ERROR,
        `Invalid global template in configuration: ${(error as Error).message}`,
        { configPath, template: config.template, originalError: error }
      );
    }
  }
  
  // Validate each docset template if present
  for (const docset of config.docsets) {
    if (docset.template) {
      try {
        validateTemplate(docset.template);
      } catch (error) {
        throw new KnowledgeError(
          ErrorType.TEMPLATE_ERROR,
          `Invalid template for docset '${docset.id}': ${(error as Error).message}`,
          { configPath, docsetId: docset.id, template: docset.template, originalError: error }
        );
      }
    }
  }
}

/**
 * Validate a configuration object
 * @param config - Configuration to validate
 * @returns True if valid, false if invalid
 */
export function validateConfig(config: unknown): config is KnowledgeConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  const obj = config as Record<string, unknown>;
  
  // Check required fields
  if (typeof obj['version'] !== 'string') {
    return false;
  }
  
  if (!Array.isArray(obj['docsets'])) {
    return false;
  }
  
  // Validate each docset
  for (const docset of obj['docsets']) {
    if (!validateDocset(docset)) {
      return false;
    }
  }
  
  // Optional template field
  if (obj['template'] !== undefined && typeof obj['template'] !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Validate a docset configuration object
 * @param docset - Docset to validate
 * @returns True if valid, false if invalid
 */
function validateDocset(docset: unknown): docset is DocsetConfig {
  if (!docset || typeof docset !== 'object') {
    return false;
  }
  
  const obj = docset as Record<string, unknown>;
  
  // Check required fields
  if (typeof obj['id'] !== 'string' || obj['id'].toString().trim() === '') {
    return false;
  }
  
  if (typeof obj['name'] !== 'string' || obj['name'].toString().trim() === '') {
    return false;
  }
  
  if (typeof obj['local_path'] !== 'string' || obj['local_path'].toString().trim() === '') {
    return false;
  }
  
  // Check optional fields
  if (obj['description'] !== undefined && typeof obj['description'] !== 'string') {
    return false;
  }
  
  if (obj['template'] !== undefined && typeof obj['template'] !== 'string') {
    return false;
  }
  
  return true;
}