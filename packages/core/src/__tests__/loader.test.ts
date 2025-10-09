/**
 * Tests for configuration loading and validation
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, loadConfigSync, validateConfig } from '../config/loader.js';
import { KnowledgeError, ErrorType } from '../types.js';
import type { KnowledgeConfig, DocsetConfig } from '../types.js';

describe('Configuration Loading and Validation', () => {
  let tempDir: string;
  let validConfigPath: string;
  let invalidConfigPath: string;
  let malformedConfigPath: string;
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), 'agentic-knowledge-loader-test-'));
    
    // Create valid config file
    validConfigPath = join(tempDir, 'valid.yaml');
    const validConfig = `version: "1.0"
docsets:
  - id: "test-docs"
    name: "Test Documentation"
    description: "Test description"
    local_path: "./docs"
    template: "Custom template for {{keywords}} in {{local_path}}"
  - id: "api-docs"
    name: "API Documentation"
    local_path: "/absolute/path"
template: "Global template for {{keywords}} in {{local_path}}"`;
    await fs.writeFile(validConfigPath, validConfig);
    
    // Create invalid config file (missing required fields)
    invalidConfigPath = join(tempDir, 'invalid.yaml');
    const invalidConfig = `version: "1.0"
# Missing docsets field
template: "Global only"`;
    await fs.writeFile(invalidConfigPath, invalidConfig);
    
    // Create malformed YAML file
    malformedConfigPath = join(tempDir, 'malformed.yaml');
    const malformedConfig = `invalid: yaml: content:
  - this is not: valid yaml
    missing quotes: and "proper structure`;
    await fs.writeFile(malformedConfigPath, malformedConfig);
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    test('should load valid configuration file', async () => {
      const config = await loadConfig(validConfigPath);
      
      expect(config.version).toBe('1.0');
      expect(config.docsets).toHaveLength(2);
      expect(config.template).toContain('Global template');
      
      const firstDocset = config.docsets[0];
      expect(firstDocset.id).toBe('test-docs');
      expect(firstDocset.name).toBe('Test Documentation');
      expect(firstDocset.description).toBe('Test description');
      expect(firstDocset.local_path).toBe('./docs');
      expect(firstDocset.template).toContain('Custom template for');
    });

    test('should throw CONFIG_NOT_FOUND for non-existent file', async () => {
      const nonExistentPath = join(tempDir, 'does-not-exist.yaml');
      
      await expect(loadConfig(nonExistentPath)).rejects.toThrow(KnowledgeError);
      
      try {
        await loadConfig(nonExistentPath);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.CONFIG_NOT_FOUND);
        expect((error as KnowledgeError).context?.configPath).toBe(nonExistentPath);
      }
    });

    test('should throw CONFIG_INVALID for invalid configuration', async () => {
      await expect(loadConfig(invalidConfigPath)).rejects.toThrow(KnowledgeError);
      
      try {
        await loadConfig(invalidConfigPath);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.CONFIG_INVALID);
      }
    });

    test('should throw YAML_PARSE_ERROR for malformed YAML', async () => {
      await expect(loadConfig(malformedConfigPath)).rejects.toThrow(KnowledgeError);
      
      try {
        await loadConfig(malformedConfigPath);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.YAML_PARSE_ERROR);
      }
    });

    test('should throw TEMPLATE_ERROR for invalid global template', async () => {
      // Create config with invalid global template
      const invalidTemplateConfigPath = join(tempDir, 'invalid-template.yaml');
      const invalidTemplateConfig = `version: "1.0"
docsets:
  - id: "test-docs"
    name: "Test Documentation"
    local_path: "./docs"
template: "Global template with {{keywords}} and {{invalid_variable}}"`;
      await fs.writeFile(invalidTemplateConfigPath, invalidTemplateConfig);
      
      await expect(loadConfig(invalidTemplateConfigPath)).rejects.toThrow(KnowledgeError);
      
      try {
        await loadConfig(invalidTemplateConfigPath);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.TEMPLATE_ERROR);
        expect((error as KnowledgeError).message).toContain('Invalid global template');
        expect((error as KnowledgeError).message).toContain('invalid_variable');
      }
    });

    test('should throw TEMPLATE_ERROR for invalid docset template', async () => {
      // Create config with invalid docset template
      const invalidDocsetTemplateConfigPath = join(tempDir, 'invalid-docset-template.yaml');
      const invalidDocsetTemplateConfig = `version: "1.0"
docsets:
  - id: "test-docs"
    name: "Test Documentation"
    local_path: "./docs"
    template: "Docset template missing {{keywords}} but has {{bad_var}}"`;
      await fs.writeFile(invalidDocsetTemplateConfigPath, invalidDocsetTemplateConfig);
      
      await expect(loadConfig(invalidDocsetTemplateConfigPath)).rejects.toThrow(KnowledgeError);
      
      try {
        await loadConfig(invalidDocsetTemplateConfigPath);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.TEMPLATE_ERROR);
        expect((error as KnowledgeError).message).toContain("Invalid template for docset 'test-docs'");
        expect((error as KnowledgeError).message).toContain('bad_var');
      }
    });

    test('should accept configuration with valid templates', async () => {
      // Create config with valid templates
      const validTemplateConfigPath = join(tempDir, 'valid-template.yaml');
      const validTemplateConfig = `version: "1.0"
docsets:
  - id: "test-docs"
    name: "Test Documentation"
    local_path: "./docs"
    template: "Search {{keywords}} in {{local_path}}"
template: "Global: {{keywords}} in {{local_path}}"`;
      await fs.writeFile(validTemplateConfigPath, validTemplateConfig);
      
      const config = await loadConfig(validTemplateConfigPath);
      
      expect(config.version).toBe('1.0');
      expect(config.template).toContain('Global:');
      expect(config.docsets[0].template).toContain('Search');
    });
  });

  describe('loadConfigSync', () => {
    test('should load valid configuration file synchronously', async () => {
      const config = loadConfigSync(validConfigPath);
      
      expect(config.version).toBe('1.0');
      expect(config.docsets).toHaveLength(2);
      expect(config.template).toContain('Global template');
    });

    test('should throw CONFIG_NOT_FOUND for non-existent file (sync)', async () => {
      const nonExistentPath = join(tempDir, 'does-not-exist.yaml');
      
      expect(() => loadConfigSync(nonExistentPath)).toThrow(KnowledgeError);
      
      try {
        loadConfigSync(nonExistentPath);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.CONFIG_NOT_FOUND);
      }
    });
  });

  describe('validateConfig', () => {
    test('should validate complete valid configuration', () => {
      const validConfig: KnowledgeConfig = {
        version: '1.0',
        docsets: [
          {
            id: 'test',
            name: 'Test Docs',
            local_path: './docs',
            description: 'Test description',
            template: 'Custom template'
          }
        ],
        template: 'Global template'
      };
      
      expect(validateConfig(validConfig)).toBe(true);
    });

    test('should validate minimal valid configuration', () => {
      const minimalConfig = {
        version: '1.0',
        docsets: [
          {
            id: 'test',
            name: 'Test Docs',
            local_path: './docs'
          }
        ]
      };
      
      expect(validateConfig(minimalConfig)).toBe(true);
    });

    test('should reject configuration without version', () => {
      const invalidConfig = {
        docsets: []
      };
      
      expect(validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject configuration without docsets', () => {
      const invalidConfig = {
        version: '1.0'
      };
      
      expect(validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject configuration with invalid docsets array', () => {
      const invalidConfig = {
        version: '1.0',
        docsets: 'not an array'
      };
      
      expect(validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject docset without required fields', () => {
      const invalidConfig = {
        version: '1.0',
        docsets: [
          {
            id: 'test'
            // missing name and local_path
          }
        ]
      };
      
      expect(validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject docset with empty required fields', () => {
      const invalidConfig = {
        version: '1.0',
        docsets: [
          {
            id: '',
            name: '   ',
            local_path: './docs'
          }
        ]
      };
      
      expect(validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject non-object input', () => {
      expect(validateConfig(null)).toBe(false);
      expect(validateConfig(undefined)).toBe(false);
      expect(validateConfig('string')).toBe(false);
      expect(validateConfig(123)).toBe(false);
      expect(validateConfig([])).toBe(false);
    });

    test('should reject docset with invalid optional field types', () => {
      const invalidConfig = {
        version: '1.0',
        docsets: [
          {
            id: 'test',
            name: 'Test',
            local_path: './docs',
            description: 123, // should be string
            template: [] // should be string
          }
        ]
      };
      
      expect(validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject invalid global template type', () => {
      const invalidConfig = {
        version: '1.0',
        docsets: [
          {
            id: 'test',
            name: 'Test',
            local_path: './docs'
          }
        ],
        template: 123 // should be string
      };
      
      expect(validateConfig(invalidConfig)).toBe(false);
    });
  });
});