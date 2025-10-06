/**
 * End-to-End MCP Protocol Compliance Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  createTestProject, 
  createMCPClient, 
  BASIC_TEST_CONFIG, 
  CUSTOM_TEMPLATE_CONFIG,
  type TestProject 
} from '../utils/e2e-test-setup.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('MCP Protocol Compliance E2E Tests', () => {
  let testProject: TestProject;
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Create a fresh test project for each test
    testProject = await createTestProject(BASIC_TEST_CONFIG);
  });

  afterEach(async () => {
    // Clean up client connection
    if (cleanup) {
      await cleanup();
    }
    
    // Clean up test project
    if (testProject) {
      await testProject.cleanup();
    }
  });

  describe('Server Initialization and Capabilities', () => {
    it('should establish MCP connection and negotiate capabilities', async () => {
      const clientSetup = await createMCPClient(testProject.projectPath);
      client = clientSetup.client;
      cleanup = clientSetup.cleanup;

      // Server should be connected and have negotiated capabilities
      expect(client).toBeDefined();
      
      // Test that we can call server info
      const info = await client.getServerVersion();
      expect(info).toBeDefined();
    });

    it('should expose required tools', async () => {
      const clientSetup = await createMCPClient(testProject.projectPath);
      client = clientSetup.client;
      cleanup = clientSetup.cleanup;

      const tools = await client.listTools();
      
      expect(tools.tools).toBeDefined();
      expect(tools.tools).toHaveLength(2);
      
      const toolNames = tools.tools.map(tool => tool.name);
      expect(toolNames).toContain('search_docs');
      expect(toolNames).toContain('list_docsets');
    });
  });

  describe('Tool Schema Validation', () => {
    beforeEach(async () => {
      const clientSetup = await createMCPClient(testProject.projectPath);
      client = clientSetup.client;
      cleanup = clientSetup.cleanup;
    });

    it('should have correct search_docs tool schema', async () => {
      const tools = await client.listTools();
      const searchDocsTool = tools.tools.find(tool => tool.name === 'search_docs');
      
      expect(searchDocsTool).toBeDefined();
      expect(searchDocsTool!.description).toContain('Search for documentation guidance');
      
      const schema = searchDocsTool!.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      
      // Validate parameter descriptions (special attention per user request)
      const properties = schema.properties as any;
      
      // docset_id parameter
      expect(properties.docset_id).toBeDefined();
      expect(properties.docset_id.type).toBe('string');
      expect(properties.docset_id.description).toContain('identifier of the docset');
      
      // keywords parameter (primary search terms)
      expect(properties.keywords).toBeDefined();
      expect(properties.keywords.type).toBe('string');
      expect(properties.keywords.description).toContain('Primary search terms');
      expect(properties.keywords.description).toContain('specific about what you want to find');
      
      // generalized_keywords parameter (related terms)
      expect(properties.generalized_keywords).toBeDefined();
      expect(properties.generalized_keywords.type).toBe('string');
      expect(properties.generalized_keywords.description).toContain('Related terms, synonyms');
      expect(properties.generalized_keywords.description).toContain('not your main target');
      expect(properties.generalized_keywords.description).toContain('broaden the search context');
      
      // Required parameters
      expect(schema.required).toContain('docset_id');
      expect(schema.required).toContain('keywords');
      expect(schema.required).not.toContain('generalized_keywords'); // Optional
    });

    it('should have correct list_docsets tool schema', async () => {
      const tools = await client.listTools();
      const listDocsetsTool = tools.tools.find(tool => tool.name === 'list_docsets');
      
      expect(listDocsetsTool).toBeDefined();
      expect(listDocsetsTool!.description).toContain('List all available documentation sets');
      
      const schema = listDocsetsTool!.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    beforeEach(async () => {
      const clientSetup = await createMCPClient(testProject.projectPath);
      client = clientSetup.client;
      cleanup = clientSetup.cleanup;
    });

    it('should execute list_docsets successfully', async () => {
      const result = await client.callTool({
        name: 'list_docsets',
        arguments: {}
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content).toHaveLength(1);
      expect(content[0]?.type).toBe('text');
      
      const responseText = content[0]?.text;
      expect(responseText).toContain('Found 2 available docset(s)');
      expect(responseText).toContain('test-docs');
      expect(responseText).toContain('api-docs');
      expect(responseText).toContain('Test Documentation');
      expect(responseText).toContain('API Documentation');
    });

    it('should execute search_docs successfully with all parameters', async () => {
      const result = await client.callTool({
        name: 'search_docs',
        arguments: {
          docset_id: 'test-docs',
          keywords: 'authentication middleware',
          generalized_keywords: 'login signin oauth credentials'
        }
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content).toHaveLength(1);
      expect(content[0]?.type).toBe('text');
      
      const responseText = content[0]?.text;
      expect(responseText).toContain('authentication middleware');
      expect(responseText).toContain('login signin oauth credentials');
      expect(responseText).toContain('Test Documentation');
      expect(responseText).toContain('/docs'); // Should contain the docs path
    });

    it('should execute search_docs with minimal parameters', async () => {
      const result = await client.callTool({
        name: 'search_docs',
        arguments: {
          docset_id: 'api-docs',
          keywords: 'rate limiting'
        }
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.type).toBe('text');
      
      const responseText = content[0]?.text;
      expect(responseText).toContain('rate limiting');
      expect(responseText).toContain('API Documentation');
      expect(responseText).toContain('/api'); // Should contain the api path
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const clientSetup = await createMCPClient(testProject.projectPath);
      client = clientSetup.client;
      cleanup = clientSetup.cleanup;
    });

    it('should handle invalid docset_id gracefully', async () => {
      const result = await client.callTool({
        name: 'search_docs',
        arguments: {
          docset_id: 'nonexistent-docset',
          keywords: 'test'
        }
      });

      expect(result).toBeDefined();
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toContain('Error:');
      expect(content[0]?.text).toContain('not found');
    });

    it('should handle missing required parameters', async () => {
      // Our server handles this gracefully by returning an error response
      const result = await client.callTool({
        name: 'search_docs',
        arguments: {
          docset_id: 'test-docs'
          // Missing required 'keywords' parameter
        }
      });

      expect(result).toBeDefined();
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toContain('Error:');
      expect(content[0]?.text).toContain('keywords is required');
    });

    it('should handle invalid tool name', async () => {
      // Our server handles this gracefully by returning an error response
      const result = await client.callTool({
        name: 'nonexistent_tool',
        arguments: {}
      });

      expect(result).toBeDefined();
      const content = result.content as Array<{ type: string; text: string }>;
      expect(content[0]?.text).toContain('Error:');
      expect(content[0]?.text).toContain('Unknown tool');
    });
  });

  describe('Custom Template Testing', () => {
    let customTestProject: TestProject;

    beforeEach(async () => {
      customTestProject = await createTestProject(CUSTOM_TEMPLATE_CONFIG);
      const clientSetup = await createMCPClient(customTestProject.projectPath);
      client = clientSetup.client;
      cleanup = async () => {
        await clientSetup.cleanup();
        await customTestProject.cleanup();
      };
    });

    it('should use custom template for specific docset', async () => {
      const result = await client.callTool({
        name: 'search_docs',
        arguments: {
          docset_id: 'react-docs',
          keywords: 'useState hook',
          generalized_keywords: 'state management react hooks'
        }
      });

      const content = result.content as Array<{ type: string; text: string }>;
      const responseText = content[0]?.text;
      expect(responseText).toContain('Looking for React information');
      expect(responseText).toContain('useState hook');
      expect(responseText).toContain('state management react hooks');
      expect(responseText).toContain('component names, props, hooks');
    });
  });

  describe('Performance Requirements', () => {
    beforeEach(async () => {
      const clientSetup = await createMCPClient(testProject.projectPath);
      client = clientSetup.client;
      cleanup = clientSetup.cleanup;
    });

    it('should respond quickly after initial connection', async () => {
      // Warmup call
      await client.callTool({
        name: 'list_docsets',
        arguments: {}
      });

      // Measure subsequent call
      const start = performance.now();
      const result = await client.callTool({
        name: 'list_docsets',
        arguments: {}
      });
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      // Should be well under 100ms for e2e (includes network overhead)
      expect(duration).toBeLessThan(100);
      
      console.log(`E2E response time: ${duration.toFixed(2)}ms`);
    });
  });
});