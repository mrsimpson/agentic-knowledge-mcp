/**
 * Tests for configuration discovery functionality
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { findConfigPath, findConfigPathSync } from "../config/discovery.js";
import { CONFIG_DIR, CONFIG_FILENAME } from "../types.js";

describe("Configuration Discovery", () => {
  let tempDir: string;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(join(tmpdir(), "agentic-knowledge-test-"));
    testDir = join(tempDir, "project");
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("findConfigPath", () => {
    test("should find config in current directory", async () => {
      // Create .knowledge/config.yaml in test directory
      const knowledgeDir = join(testDir, CONFIG_DIR);
      await fs.mkdir(knowledgeDir, { recursive: true });
      const configPath = join(knowledgeDir, CONFIG_FILENAME);
      await fs.writeFile(configPath, 'version: "1.0"\ndocsets: []');

      const result = await findConfigPath(testDir);
      expect(result).toBe(configPath);
    });

    test("should find config in parent directory", async () => {
      // Create nested directory structure
      const nestedDir = join(testDir, "nested", "deep", "directory");
      await fs.mkdir(nestedDir, { recursive: true });

      // Create config in parent directory
      const knowledgeDir = join(testDir, CONFIG_DIR);
      await fs.mkdir(knowledgeDir, { recursive: true });
      const configPath = join(knowledgeDir, CONFIG_FILENAME);
      await fs.writeFile(configPath, 'version: "1.0"\ndocsets: []');

      const result = await findConfigPath(nestedDir);
      expect(result).toBe(configPath);
    });

    test("should return null when no config found", async () => {
      const result = await findConfigPath(testDir);
      expect(result).toBeNull();
    });

    test("should use current working directory when no path provided", async () => {
      // This test is harder to control since it uses process.cwd()
      // We'll just verify it doesn't throw an error and returns null or string
      const result = await findConfigPath();
      expect(result === null || typeof result === "string").toBe(true);
    });

    test("should stop at filesystem root", async () => {
      // Test with a path that definitely won't have a config
      const result = await findConfigPath("/");
      expect(result).toBeNull();
    });
  });

  describe("findConfigPathSync", () => {
    test("should find config in current directory (sync)", async () => {
      // Create .knowledge/config.yaml in test directory
      const knowledgeDir = join(testDir, CONFIG_DIR);
      await fs.mkdir(knowledgeDir, { recursive: true });
      const configPath = join(knowledgeDir, CONFIG_FILENAME);
      await fs.writeFile(configPath, 'version: "1.0"\ndocsets: []');

      const result = findConfigPathSync(testDir);
      expect(result).toBe(configPath);
    });

    test("should find config in parent directory (sync)", async () => {
      // Create nested directory structure
      const nestedDir = join(testDir, "nested", "deep", "directory");
      await fs.mkdir(nestedDir, { recursive: true });

      // Create config in parent directory
      const knowledgeDir = join(testDir, CONFIG_DIR);
      await fs.mkdir(knowledgeDir, { recursive: true });
      const configPath = join(knowledgeDir, CONFIG_FILENAME);
      await fs.writeFile(configPath, 'version: "1.0"\ndocsets: []');

      const result = findConfigPathSync(nestedDir);
      expect(result).toBe(configPath);
    });

    test("should return null when no config found (sync)", async () => {
      const result = findConfigPathSync(testDir);
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("should handle directory with .knowledge but no config.yaml", async () => {
      // Create .knowledge directory but no config file
      const knowledgeDir = join(testDir, CONFIG_DIR);
      await fs.mkdir(knowledgeDir, { recursive: true });

      const result = await findConfigPath(testDir);
      expect(result).toBeNull();
    });

    test("should handle .knowledge/config.yaml as directory instead of file", async () => {
      // Create .knowledge/config.yaml as a directory (invalid)
      const knowledgeDir = join(testDir, CONFIG_DIR);
      await fs.mkdir(knowledgeDir, { recursive: true });
      const configDir = join(knowledgeDir, CONFIG_FILENAME);
      await fs.mkdir(configDir, { recursive: true });

      const result = await findConfigPath(testDir);
      expect(result).toBeNull();
    });

    test("should handle permission errors gracefully", async () => {
      // This test is platform-specific and hard to simulate reliably
      // We'll just ensure the function doesn't throw for non-existent paths
      const result = await findConfigPath("/non/existent/path");
      expect(result).toBeNull();
    });
  });
});
