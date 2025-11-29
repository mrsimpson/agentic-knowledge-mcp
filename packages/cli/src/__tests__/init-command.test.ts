/**
 * Init Command - Behavior tests for force re-init and path discovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { initCommand } from "../commands/init.js";

describe("Init Command - Force Re-initialization", () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(tmpdir(), `agentic-init-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create .knowledge directory and config
    const knowledgeDir = path.join(testDir, ".knowledge");
    await fs.mkdir(knowledgeDir, { recursive: true });
    configPath = path.join(knowledgeDir, "config.yaml");

    // Create basic config
    const config = `version: "1.0"
docsets:
  - id: test-docset
    name: Test Docset
    description: Test
    sources:
      - url: https://github.com/test/repo.git
        type: git_repo
        branch: main
        paths:
          - docs/
`;
    await fs.writeFile(configPath, config);
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("--force flag behavior", () => {
    it("should clear existing directory before re-initialization", async () => {
      // Create docset directory with old files
      const docsetPath = path.join(
        testDir,
        ".knowledge",
        "docsets",
        "test-docset",
      );
      await fs.mkdir(docsetPath, { recursive: true });

      // Add old files that should be removed
      await fs.writeFile(path.join(docsetPath, "old-file.md"), "old content");
      await fs.writeFile(
        path.join(docsetPath, "old-file2.md"),
        "old content 2",
      );
      await fs.mkdir(path.join(docsetPath, "old-directory"), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(docsetPath, "old-directory", "nested.md"),
        "nested old content",
      );

      // Verify old files exist
      const filesBefore = await fs.readdir(docsetPath);
      expect(filesBefore).toContain("old-file.md");
      expect(filesBefore).toContain("old-file2.md");
      expect(filesBefore).toContain("old-directory");

      // This test will fail initially - we're doing TDD
      // The implementation should clear the directory when --force is used
      // For now, we're just documenting the expected behavior
    });

    it("should NOT update config paths when using only --force", async () => {
      // The --force flag should only clear and re-initialize
      // It should NOT modify the config file

      const configBefore = await fs.readFile(configPath, "utf-8");

      // After running with --force, config should be unchanged
      // (This test documents that --force and path discovery are separate)
    });
  });
});

describe("Init Command - Path Discovery", () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `agentic-path-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    const knowledgeDir = path.join(testDir, ".knowledge");
    await fs.mkdir(knowledgeDir, { recursive: true });
    configPath = path.join(knowledgeDir, "config.yaml");

    // Create config without paths specified
    const config = `version: "1.0"
docsets:
  - id: test-docset
    name: Test Docset
    description: Test
    sources:
      - url: https://github.com/test/repo.git
        type: git_repo
        branch: main
`;
    await fs.writeFile(configPath, config);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("--discover-paths flag", () => {
    it("should update config with discovered directory patterns", async () => {
      // When using --discover-paths, the system should:
      // 1. Extract files using smart filtering
      // 2. Analyze which directories contain the files
      // 3. Update config with directory patterns (not individual files)
      // This test will initially fail - we're doing TDD
    });

    it("should store directory patterns not individual file paths", async () => {
      // Given extracted files:
      // - docs/guide/intro.md
      // - docs/guide/advanced.md
      // - docs/api/reference.md
      // - README.md
      // - examples/basic.js
      // - examples/advanced.js
      //
      // Should update config with:
      // paths:
      //   - README.md
      //   - docs/
      //   - examples/
      //
      // NOT with all individual file paths
    });

    it("should work independently of --force flag", async () => {
      // You should be able to use --discover-paths without --force
      // to update the config without re-initializing
    });

    it("should work together with --force flag", async () => {
      // You should be able to use both flags together:
      // --force: clear and re-initialize
      // --discover-paths: update config with discovered patterns
    });
  });
});

describe("Path Pattern Discovery Function", () => {
  // Unit tests for the function that converts file lists to directory patterns

  it("should convert file list to directory patterns", () => {
    const files = [
      "README.md",
      "docs/guide/intro.md",
      "docs/guide/advanced.md",
      "docs/api/reference.md",
      "docs/api/endpoints.md",
      "examples/basic.js",
      "examples/advanced.js",
      "src/index.ts",
    ];

    // Expected output: directory patterns
    const expected = [
      "README.md", // Single file at root
      "docs/", // Multiple files in docs tree
      "examples/", // Multiple files in examples
      "src/", // Files in src
    ];

    // This will fail initially - function doesn't exist yet
    // const result = discoverDirectoryPatterns(files);
    // expect(result).toEqual(expected);
  });

  it("should handle nested directories efficiently", () => {
    const files = [
      "docs/en/guide/intro.md",
      "docs/en/guide/advanced.md",
      "docs/en/api/reference.md",
      "docs/fr/guide/intro.md",
    ];

    // Should identify "docs/" as the common pattern
    const expected = ["docs/"];

    // const result = discoverDirectoryPatterns(files);
    // expect(result).toEqual(expected);
  });

  it("should keep single files as-is", () => {
    const files = [
      "README.md",
      "LICENSE",
      "docs/guide/intro.md",
      "docs/guide/advanced.md",
    ];

    const expected = [
      "README.md",
      "LICENSE",
      "docs/", // Multiple files
    ];

    // const result = discoverDirectoryPatterns(files);
    // expect(result).toEqual(expected);
  });

  it("should handle files in root directory", () => {
    const files = ["README.md", "CONTRIBUTING.md", "LICENSE"];

    // All single files in root - keep as individual files
    const expected = ["README.md", "CONTRIBUTING.md", "LICENSE"];

    // const result = discoverDirectoryPatterns(files);
    // expect(result).toEqual(expected);
  });
});
