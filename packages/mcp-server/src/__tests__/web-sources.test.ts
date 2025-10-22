/**
 * E2E tests for agentic-knowledge MCP server with web sources
 *
 * Tests that the MCP server tools correctly handle web source configurations
 * and return proper document paths for search instructions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createAgenticKnowledgeServer } from "../server.js";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Agentic Knowledge MCP Server - Web Sources E2E", () => {
  let tempDir: string;
  let server: any;

  beforeEach(async () => {
    // Create temporary project directory
    tempDir = await fs.mkdtemp(join(tmpdir(), "agentic-knowledge-e2e-"));

    // Create .knowledge directory and config
    const knowledgeDir = join(tempDir, ".knowledge");
    await fs.mkdir(knowledgeDir, { recursive: true });

    // Create test configuration with both web sources and local docsets
    const testConfig = `
version: "1.0"
docsets:
  - id: "web-source-docs"
    name: "Web Source Documentation"
    description: "Documentation loaded from web sources"
    sources:
      - type: "git_repo"
        url: "https://github.com/test/repo.git"
        branch: "main"
        paths: ["README.md", "docs/"]
  
  - id: "local-docs"
    name: "Local Documentation"
    description: "Traditional local documentation"
    sources:
      - type: "local_folder"
        paths: ["./docs/local"]

template: "Search for '{{keywords}}' in {{local_path}}. Also consider: {{generalized_keywords}}"
`;
    await fs.writeFile(join(knowledgeDir, "config.yaml"), testConfig);

    // Create mock downloaded content for web source
    const webSourceDir = join(knowledgeDir, "docsets", "web-source-docs");
    await fs.mkdir(webSourceDir, { recursive: true });
    await fs.writeFile(
      join(webSourceDir, "README.md"),
      "# Test Documentation\n\nThis simulates downloaded web content.",
    );

    // Mock process.cwd to return our temp directory
    vi.spyOn(process, "cwd").mockReturnValue(tempDir);

    // Create server instance
    server = createAgenticKnowledgeServer();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("REQ-11: Web Source Configuration Support", () => {
    it("WHEN MCP server searches web source docset THEN should return standardized docsets path", async () => {
      // Simulate MCP CallToolRequest directly
      const request = {
        method: "tools/call",
        params: {
          name: "search_docs",
          arguments: {
            docset_id: "web-source-docs",
            keywords: "API documentation",
            generalized_keywords: "endpoints methods",
          },
        },
      };

      // Get the internal call handler
      const handlers = (server as any)._requestHandlers;
      expect(handlers).toBeDefined();

      const callHandler = handlers.get("tools/call");
      expect(callHandler).toBeDefined();

      const result = await callHandler(request);

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]?.type).toBe("text");

      const instructions = result.content[0]!.text;
      expect(instructions).toContain("API documentation");
      expect(instructions).toContain("endpoints methods");

      // Most importantly: should use standardized path for web sources
      expect(instructions).toContain("docsets/web-source-docs");
      expect(instructions).not.toContain("./docs/"); // Should not use local path pattern
    });

    it("WHEN MCP server searches local docset THEN should return configured local_path", async () => {
      const request = {
        method: "tools/call",
        params: {
          name: "search_docs",
          arguments: {
            docset_id: "local-docs",
            keywords: "configuration setup",
            generalized_keywords: "install guide",
          },
        },
      };

      const handlers = (server as any)._requestHandlers;
      const callHandler = handlers.get("tools/call");
      const result = await callHandler(request);

      expect(result.content).toBeDefined();
      const instructions = result.content[0]!.text;
      expect(instructions).toContain("configuration setup");
      expect(instructions).toContain("install guide");

      // Should use the configured local_path for traditional docsets
      expect(instructions).toContain("docs/local");
      expect(instructions).not.toContain("docsets/local-docs"); // Should not use docsets pattern
    });

    it("WHEN MCP server lists docsets THEN should include both web and local docsets with correct paths", async () => {
      const request = {
        method: "tools/call",
        params: {
          name: "list_docsets",
          arguments: {},
        },
      };

      const handlers = (server as any)._requestHandlers;
      const callHandler = handlers.get("tools/call");
      const result = await callHandler(request);

      expect(result.content).toBeDefined();
      const docsetsList = result.content[0]!.text;

      // Should list both docsets
      expect(docsetsList).toContain("web-source-docs");
      expect(docsetsList).toContain("Web Source Documentation");
      expect(docsetsList).toContain("local-docs");
      expect(docsetsList).toContain("Local Documentation");
    });
  });

  describe("Error Handling", () => {
    it("WHEN searching unknown docset THEN should return error with available docsets", async () => {
      const request = {
        method: "tools/call",
        params: {
          name: "search_docs",
          arguments: {
            docset_id: "unknown-docset",
            keywords: "test search",
          },
        },
      };

      const handlers = (server as any)._requestHandlers;
      const callHandler = handlers.get("tools/call");
      const result = await callHandler(request);

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(true);

      const errorMessage = result.content[0]!.text;
      expect(errorMessage).toContain("unknown-docset");
      expect(errorMessage).toContain("Available docsets:");
      expect(errorMessage).toContain("web-source-docs");
      expect(errorMessage).toContain("local-docs");
    });

    it("WHEN calling search_docs without required parameters THEN should return validation error", async () => {
      const request = {
        method: "tools/call",
        params: {
          name: "search_docs",
          arguments: {
            docset_id: "web-source-docs",
            // Missing required 'keywords' parameter
          },
        },
      };

      const handlers = (server as any)._requestHandlers;
      const callHandler = handlers.get("tools/call");
      const result = await callHandler(request);

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(true);

      const errorMessage = result.content[0]!.text;
      expect(errorMessage).toContain("keywords");
      expect(errorMessage).toContain("required");
    });
  });

  describe("Template Processing with Web Sources", () => {
    it("WHEN searching docset THEN should properly substitute template variables", async () => {
      const request = {
        method: "tools/call",
        params: {
          name: "search_docs",
          arguments: {
            docset_id: "web-source-docs",
            keywords: "authentication middleware",
            generalized_keywords: "auth login security",
          },
        },
      };

      const handlers = (server as any)._requestHandlers;
      const callHandler = handlers.get("tools/call");
      const result = await callHandler(request);

      const instructions = result.content[0]!.text;

      // Should substitute all template variables correctly
      expect(instructions).toContain("authentication middleware"); // {{keywords}}
      expect(instructions).toContain("auth login security"); // {{generalized_keywords}}
      expect(instructions).toContain("docsets/web-source-docs"); // {{local_path}} for web sources

      // Should not contain any unsubstituted template variables
      expect(instructions).not.toContain("{{");
      expect(instructions).not.toContain("}}");
    });
  });
});
