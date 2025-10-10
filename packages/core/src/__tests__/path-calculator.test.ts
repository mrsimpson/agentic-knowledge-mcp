/**
 * Tests for path calculation utilities
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import {
  calculateLocalPath,
  formatPath,
  validatePath,
  validatePathSync,
  getRelativePath,
} from "../paths/calculator.js";
import type { DocsetConfig } from "../types.js";

describe("Path Calculation", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "agentic-knowledge-path-test-"));
    configPath = join(tempDir, ".knowledge", "config.yaml");

    // Create config directory and file
    await fs.mkdir(join(tempDir, ".knowledge"), { recursive: true });
    await fs.writeFile(configPath, 'version: "1.0"\ndocsets: []');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("calculateLocalPath", () => {
    test("should handle absolute paths", () => {
      const docset: DocsetConfig = {
        id: "test",
        name: "Test",
        local_path: "/absolute/path/to/docs",
      };

      const result = calculateLocalPath(docset, configPath);
      expect(result).toBe("/absolute/path/to/docs");
      expect(isAbsolute(result)).toBe(true);
    });

    test("should resolve relative paths from project root", () => {
      const docset: DocsetConfig = {
        id: "test",
        name: "Test",
        local_path: "./docs",
      };

      const result = calculateLocalPath(docset, configPath);
      const expected = resolve(tempDir, "./docs"); // Project root, not .knowledge directory
      expect(result).toBe(expected);
    });

    test("should resolve parent directory paths", () => {
      const docset: DocsetConfig = {
        id: "test",
        name: "Test",
        local_path: "../shared-docs",
      };

      const result = calculateLocalPath(docset, configPath);
      const expected = resolve(tempDir, "../shared-docs"); // Project root, not .knowledge directory
      expect(result).toBe(expected);
    });

    test("should normalize complex relative paths", () => {
      const docset: DocsetConfig = {
        id: "test",
        name: "Test",
        local_path: "./docs/../api/../guides",
      };

      const result = calculateLocalPath(docset, configPath);
      const expected = resolve(tempDir, "./guides"); // Project root, not .knowledge directory
      expect(result).toBe(expected);
    });

    test("should handle invalid config path gracefully", () => {
      const docset: DocsetConfig = {
        id: "test",
        name: "Test",
        local_path: "./docs",
      };

      // Empty string is actually valid input for dirname(), so this won't throw
      // Let's test that it still returns a reasonable result
      const result = calculateLocalPath(docset, "");
      expect(result).toBeTruthy();
    });
  });

  describe("formatPath", () => {
    test("should normalize path separators", () => {
      // Test with mixed separators (this test is more relevant on Windows)
      const path = "docs/api/../guides";
      const result = formatPath(path);
      expect(result).toContain("guides");
      expect(result).not.toContain("/..");
    });

    test("should remove redundant separators", () => {
      const path = "docs///api///guides";
      const result = formatPath(path);
      expect(result).not.toContain("///");
    });

    test("should handle empty path", () => {
      const result = formatPath("");
      expect(result).toBe(".");
    });

    test("should handle current directory reference", () => {
      const result = formatPath("./docs");
      expect(result).toBe("docs");
    });
  });

  describe("validatePath", () => {
    test("should validate existing directory", async () => {
      const testDir = join(tempDir, "test-dir");
      await fs.mkdir(testDir);

      const result = await validatePath(testDir);
      expect(result).toBe(true);
    });

    test("should validate existing file", async () => {
      const testFile = join(tempDir, "test-file.txt");
      await fs.writeFile(testFile, "test content");

      const result = await validatePath(testFile);
      expect(result).toBe(true);
    });

    test("should return false for non-existent path", async () => {
      const nonExistentPath = join(tempDir, "does-not-exist");

      const result = await validatePath(nonExistentPath);
      expect(result).toBe(false);
    });

    test("should handle permission errors gracefully", async () => {
      // Test with a path that's likely to have permission issues
      const result = await validatePath("/root/private-file");
      expect(result).toBe(false);
    });
  });

  describe("validatePathSync", () => {
    test("should validate existing directory synchronously", async () => {
      const testDir = join(tempDir, "test-dir");
      await fs.mkdir(testDir);

      const result = validatePathSync(testDir);
      expect(result).toBe(true);
    });

    test("should return false for non-existent path synchronously", async () => {
      const nonExistentPath = join(tempDir, "does-not-exist");

      const result = validatePathSync(nonExistentPath);
      expect(result).toBe(false);
    });
  });

  describe("getRelativePath", () => {
    test("should calculate relative path between directories", () => {
      const from = "/home/user/project";
      const to = "/home/user/project/docs/api";

      const result = getRelativePath(from, to);
      expect(result).toBe(join("docs", "api"));
    });

    test("should calculate relative path to parent directory", () => {
      const from = "/home/user/project/nested/deep";
      const to = "/home/user/project";

      const result = getRelativePath(from, to);
      expect(result).toBe(join("..", ".."));
    });

    test("should handle same directory", () => {
      const path = "/home/user/project";

      const result = getRelativePath(path, path);
      expect(result).toBe("");
    });

    test("should handle relative paths", () => {
      const from = "project/src";
      const to = "project/docs";

      const result = getRelativePath(from, to);
      expect(result).toBe(join("..", "docs"));
    });
  });

  describe("integration tests", () => {
    test("should work end-to-end with real file system paths", async () => {
      // Create a docs directory in the project root (tempDir)
      const docsDir = join(tempDir, "docs");
      await fs.mkdir(docsDir);

      const docset: DocsetConfig = {
        id: "test",
        name: "Test",
        local_path: "./docs", // Relative to project root
      };

      // Calculate path
      const calculatedPath = calculateLocalPath(docset, configPath);

      // Format path
      const formattedPath = formatPath(calculatedPath);

      // Validate path exists
      const pathExists = await validatePath(formattedPath);

      expect(pathExists).toBe(true);
      expect(formattedPath).toBe(docsDir);
    });

    test("should handle complex nested directory structure", async () => {
      // Create nested structure
      const nestedPath = join(tempDir, "project", "src", "components");
      await fs.mkdir(nestedPath, { recursive: true });

      // Create config in project root
      const projectConfig = join(
        tempDir,
        "project",
        ".knowledge",
        "config.yaml",
      );
      await fs.mkdir(join(tempDir, "project", ".knowledge"), {
        recursive: true,
      });
      await fs.writeFile(projectConfig, 'version: "1.0"\ndocsets: []');

      const docset: DocsetConfig = {
        id: "components",
        name: "Components",
        local_path: "./src/components",
      };

      const result = calculateLocalPath(docset, projectConfig);
      const validated = await validatePath(result);

      expect(validated).toBe(true);
      expect(result).toBe(nestedPath);
    });
  });
});
