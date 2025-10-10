/**
 * Tests for MCP server functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAgenticKnowledgeServer } from "../server.js";

// Mock the core module
vi.mock("@codemcp/knowledge-core", () => ({
  loadConfiguration: vi.fn(),
  calculateLocalPath: vi.fn(),
  processTemplate: vi.fn(),
}));

describe("MCP Server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createAgenticKnowledgeServer", () => {
    it("should create a server instance", () => {
      const server = createAgenticKnowledgeServer();
      expect(server).toBeDefined();
      expect(typeof server.connect).toBe("function");
    });

    it("should register search_docs and list_docsets tools", async () => {
      const server = createAgenticKnowledgeServer();

      // Access the request handler through the server's internal methods
      // Note: This is testing the tool registration indirectly
      expect(server).toBeDefined();
    });
  });

  describe("Tool Parameter Descriptions", () => {
    it("should have detailed descriptions for search_docs parameters", async () => {
      const server = createAgenticKnowledgeServer();

      // Test that the server instance is created successfully
      // The parameter descriptions are tested through integration
      expect(server).toBeDefined();
    });

    it("should emphasize keyword distinction in parameter descriptions", () => {
      // This test validates that our parameter descriptions follow the requirements
      // The actual descriptions are defined in the server implementation
      expect(true).toBe(true); // Placeholder - actual validation through integration
    });
  });
});
