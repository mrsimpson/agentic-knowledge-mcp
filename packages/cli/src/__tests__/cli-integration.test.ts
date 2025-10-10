/**
 * CLI Commands - Integration Tests
 * Tests the actual behavior of CLI commands with real file operations
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

describe("CLI Integration Tests", () => {
  let testDir: string;
  let configPath: string;
  let cliPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(tmpdir(), "agentic-cli-test-"));

    // Set CLI path
    cliPath = path.resolve(__dirname, "../../dist/cli.js");

    // Create .knowledge directory structure
    const knowledgeDir = path.join(testDir, ".knowledge");
    await fs.mkdir(knowledgeDir, { recursive: true });

    configPath = path.join(knowledgeDir, "config.yaml");

    // Create test configuration
    const testConfig = `
version: "1.0"
docsets:
  - id: "test-docset"
    name: "Test Documentation"
    description: "Test documentation for integration testing"
    local_path: "./docs/test-docset"
    web_sources:
      - url: "https://github.com/microsoft/TypeScript.git"
        type: "git_repo"
        options:
          paths: ["README.md"]
          branch: "main"
  
  - id: "local-only-docset"
    name: "Local Only Documentation"
    description: "Test documentation without web sources"
    local_path: "./docs/local-only"
    
  - id: "unsupported-source-docset"
    name: "Unsupported Source Documentation"
    description: "Test documentation with unsupported web source"
    local_path: "./docs/unsupported"
    web_sources:
      - url: "https://example.com/docs"
        type: "documentation_site"
        options:
          max_depth: 3
`;

    await fs.writeFile(configPath, testConfig.trim());
  });

  afterEach(async () => {
    // Clean up test directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe("Status Command", () => {
    it("should show status with no initialized docsets", () => {
      // Change to test directory and run status command
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const output = execSync(`node ${cliPath} status`, {
          encoding: "utf8",
          timeout: 5000, // 5 second timeout
        });

        expect(output).toContain("Agentic Knowledge Status");
        expect(output).toContain("Found 2 docset(s) with web sources");
        expect(output).toContain("test-docset");
        expect(output).toContain("unsupported-source-docset");
        expect(output).toContain("Not initialized");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should handle missing configuration gracefully", async () => {
      const emptyDir = await fs.mkdtemp(path.join(tmpdir(), "agentic-empty-"));
      const originalCwd = process.cwd();
      process.chdir(emptyDir);

      try {
        expect(() => {
          execSync(`node ${cliPath} status`, {
            encoding: "utf8",
            timeout: 5000,
          });
        }).toThrow();
      } catch (error: any) {
        expect(error.stdout || error.message).toContain(
          "No configuration file found",
        );
      } finally {
        process.chdir(originalCwd);
        await fs.rm(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe("Init Command", () => {
    it("should fail with invalid docset ID", () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        expect(() => {
          execSync(`node ${cliPath} init invalid-docset`, {
            encoding: "utf8",
            timeout: 5000,
          });
        }).toThrow();
      } catch (error: any) {
        expect(error.stdout || error.message).toContain(
          "Docset 'invalid-docset' not found",
        );
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should fail with docset without web sources", () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        expect(() => {
          execSync(`node ${cliPath} init local-only-docset`, {
            encoding: "utf8",
            timeout: 5000,
          });
        }).toThrow();
      } catch (error: any) {
        expect(error.stdout || error.message).toContain(
          "has no web sources configured",
        );
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("Refresh Command", () => {
    it("should handle no docsets with web sources", async () => {
      // Create config with only local docsets
      const localOnlyConfig = `
version: "1.0"
docsets:
  - id: "local-only"
    name: "Local Only"
    description: "Local documentation"
    local_path: "./docs/local"
`;

      await fs.writeFile(configPath, localOnlyConfig.trim());

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const output = execSync(`node ${cliPath} refresh`, {
          encoding: "utf8",
          timeout: 5000,
        });

        expect(output).toContain("No docsets with web sources found");
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should find docsets to refresh", () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const output = execSync(`node ${cliPath} refresh`, {
          encoding: "utf8",
          timeout: 5000,
        });

        expect(output).toContain("Agentic Knowledge Refresh");
        expect(output).toContain("Found 2 docset(s) to refresh");
        expect(output).toContain("test-docset, unsupported-source-docset");
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("Command Structure and Help", () => {
    it("should display help for main CLI", () => {
      const output = execSync(`node ${cliPath} --help`, {
        encoding: "utf8",
        timeout: 5000,
      });

      expect(output).toContain("agentic knowledge system");
      expect(output).toContain("init");
      expect(output).toContain("refresh");
      expect(output).toContain("status");
    });

    it("should display help for init command", () => {
      const output = execSync(`node ${cliPath} init --help`, {
        encoding: "utf8",
        timeout: 5000,
      });

      expect(output).toContain("Initialize web sources");
      expect(output).toContain("docset-id");
      expect(output).toContain("--force");
      expect(output).toContain("--config");
    });

    it("should display help for refresh command", () => {
      const output = execSync(`node ${cliPath} refresh --help`, {
        encoding: "utf8",
        timeout: 5000,
      });

      expect(output).toContain("Refresh web sources");
      expect(output).toContain("[docset-id]");
      expect(output).toContain("--force");
      expect(output).toContain("--config");
    });

    it("should display help for status command", () => {
      const output = execSync(`node ${cliPath} status --help`, {
        encoding: "utf8",
        timeout: 5000,
      });

      expect(output).toContain("Show status");
      expect(output).toContain("--verbose");
      expect(output).toContain("--config");
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed YAML configuration", async () => {
      const malformedConfig = `
version: "1.0"
docsets:
  - id: "test"
    name: "Test"
    invalid_yaml: [unclosed array
`;

      await fs.writeFile(configPath, malformedConfig);

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        expect(() => {
          execSync(`node ${cliPath} status`, {
            encoding: "utf8",
            timeout: 5000,
          });
        }).toThrow();
      } catch (error: any) {
        // Should contain YAML parsing error
        expect(error.stdout || error.message).toMatch(/yaml|parse|invalid/i);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should handle missing docsets array in config", async () => {
      const emptyConfig = `
version: "1.0"
# No docsets array
`;

      await fs.writeFile(configPath, emptyConfig);

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        expect(() => {
          execSync(`node ${cliPath} status`, {
            encoding: "utf8",
            timeout: 5000,
          });
        }).toThrow();
      } catch (error: any) {
        expect(error.stdout || error.message).toMatch(
          /docsets|configuration|invalid/i,
        );
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
