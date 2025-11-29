/**
 * E2E Test Setup for Agentic Knowledge MCP Server
 */

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface TestProject {
  projectPath: string;
  knowledgeDir: string;
  configPath: string;
  cleanup: () => Promise<void>;
}

export interface E2ETestConfig {
  testName: string;
  configContent: string;
  docsets?: Array<{
    id: string;
    name: string;
    description: string;
    localPath: string;
    content?: string;
  }>;
}

/**
 * Create a temporary test project with agentic knowledge configuration
 */
export async function createTestProject(
  config: E2ETestConfig,
): Promise<TestProject> {
  const projectPath = await fs.mkdtemp(
    join(tmpdir(), `agentic-knowledge-e2e-${config.testName}-`),
  );
  const knowledgeDir = join(projectPath, ".knowledge");
  const configPath = join(knowledgeDir, "config.yaml");

  // Create .knowledge directory
  await fs.mkdir(knowledgeDir, { recursive: true });

  // Write configuration file
  await fs.writeFile(configPath, config.configContent);

  // Create docset directories and files if specified
  if (config.docsets) {
    for (const docset of config.docsets) {
      const docsetPath = join(projectPath, docset.localPath);
      await fs.mkdir(docsetPath, { recursive: true });

      if (docset.content) {
        const docFile = join(docsetPath, "README.md");
        await fs.writeFile(docFile, docset.content);
      }

      // Initialize the docset (create symlinks and metadata for local folders)
      // This simulates running 'agentic-knowledge init {docset-id}'
      const symlinkDir = join(knowledgeDir, "docsets", docset.id);
      await fs.mkdir(symlinkDir, { recursive: true });

      // Create symlink to the actual source directory
      const sourceName = docset.localPath.split("/").pop() || docset.id;
      const symlinkPath = join(symlinkDir, sourceName);
      await fs.symlink(docsetPath, symlinkPath, "dir");

      // Create metadata file
      const metadata = {
        docset_id: docset.id,
        docset_name: docset.name,
        initialized_at: new Date().toISOString(),
        total_files: 1,
        sources_count: 1,
      };
      await fs.writeFile(
        join(symlinkDir, ".agentic-metadata.json"),
        JSON.stringify(metadata, null, 2),
      );
    }
  }

  const cleanup = async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  };

  return {
    projectPath,
    knowledgeDir,
    configPath,
    cleanup,
  };
}

/**
 * Create MCP client connected to agentic knowledge server
 */
export async function createMCPClient(projectPath: string): Promise<{
  client: Client;
  cleanup: () => Promise<void>;
}> {
  // Get path to our server binary
  const serverBinaryPath = join(
    process.cwd(),
    "packages/mcp-server/dist/bin.js",
  );

  // Create client with proper capabilities
  const client = new Client(
    {
      name: "agentic-knowledge-e2e-test",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Create transport that runs the server in the test project directory
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverBinaryPath],
    cwd: projectPath, // This sets the working directory for the server process
  });

  // Connect to server
  await client.connect(transport);

  const cleanup = async () => {
    try {
      await client.close();
    } catch (error) {
      console.warn("Error closing MCP client:", error);
    }
  };

  return { client, cleanup };
}

/**
 * Test configuration for basic setup
 */
export const BASIC_TEST_CONFIG: E2ETestConfig = {
  testName: "basic",
  configContent: `
version: "1.0"
docsets:
  - id: "test-docs"
    name: "Test Documentation"
    description: "Test documentation for e2e testing"
    sources:
      - type: "local_folder"
        paths: ["./docs"]
  - id: "api-docs"
    name: "API Documentation"
    description: "API reference documentation"
    sources:
      - type: "local_folder"
        paths: ["./api"]
template: |
  Search for '{{keywords}}' in {{docset_name}} ({{docset_description}}).
  
  **Location**: {{local_path}}
  **Primary Terms**: {{keywords}}
  **Related Terms**: {{generalized_keywords}}
  
  Use tools like grep, rg, or find to search for these terms.
`,
  docsets: [
    {
      id: "test-docs",
      name: "Test Documentation",
      description: "Test documentation for e2e testing",
      localPath: "./docs",
      content: `# Test Documentation

This is a test documentation file for authentication and user management.

## Authentication
Information about login, signin, oauth, and credentials.

## User Management
Details about user validation and middleware.
`,
    },
    {
      id: "api-docs",
      name: "API Documentation",
      description: "API reference documentation",
      localPath: "./api",
      content: `# API Reference

## Rate Limiting
Information about API rate limiting and throttling.

## Middleware
Authentication middleware and request validation.
`,
    },
  ],
};

/**
 * Test configuration with custom templates
 */
export const CUSTOM_TEMPLATE_CONFIG: E2ETestConfig = {
  testName: "custom-template",
  configContent: `
version: "1.0"
docsets:
  - id: "react-docs"
    name: "React Documentation"
    description: "React framework documentation"
    sources:
      - type: "local_folder"
        paths: ["./react-docs"]
    template: |
      Looking for React information about '{{keywords}}' in {{local_path}}.
      Search for component names, props, hooks, and patterns.
      Related concepts: {{generalized_keywords}}
      
      Focus on:
      1. Component documentation
      2. Hook usage examples  
      3. API reference
`,
  docsets: [
    {
      id: "react-docs",
      name: "React Documentation",
      description: "React framework documentation",
      localPath: "./react-docs",
      content: `# React Documentation

## Hooks
Information about useState, useEffect, and custom hooks.

## Components
Details about functional components and props.
`,
    },
  ],
};

/**
 * Utility to wait for a condition with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}
