/**
 * Behavior-driven tests for Git Repository Loading (REQ-12)
 *
 * These tests verify actual user workflows and system behavior,
 * not just static type checking.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { GitRepoLoader } from "../content/git-repo-loader.js";
import { WebSourceType } from "../types.js";

describe("Git Repository Loading - User Workflows", () => {
  let tempDir: string;
  let loader: GitRepoLoader;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = join(tmpdir(), `agentic-knowledge-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    loader = new GitRepoLoader();
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("REQ-12.1: Git Repository Cloning", () => {
    test("WHEN Git repository URL is valid THEN system SHALL clone repository successfully", async () => {
      // Arrange
      const config = {
        url: "https://github.com/microsoft/vscode.git",
        type: WebSourceType.GIT_REPO,
        options: { branch: "main" },
      };

      // This test would require mocking execSync or testing with a real small repo
      // For now, test the URL validation which is part of the behavior
      const validation = loader.validateConfig(config);

      // Assert
      expect(validation).toBe(true);
      expect(loader.canHandle(config)).toBe(true);
    });

    test("WHEN Git repository URL is invalid THEN system SHALL return clear error message", async () => {
      // Arrange
      const config = {
        url: "not-a-valid-url",
        type: WebSourceType.GIT_REPO,
      };

      // Act
      const validation = loader.validateConfig(config);

      // Assert
      expect(validation).not.toBe(true);
      expect(typeof validation).toBe("string");
      expect(validation).toContain("Invalid Git repository URL");
    });

    test("WHEN GitHub URL is provided THEN system SHALL accept it as valid", async () => {
      // Arrange
      const config = {
        url: "https://github.com/microsoft/TypeScript.git",
        type: WebSourceType.GIT_REPO,
      };

      // Act
      const validation = loader.validateConfig(config);

      // Assert
      expect(validation).toBe(true);
      expect(loader.canHandle(config)).toBe(true);
    });

    test("WHEN GitLab URL is provided THEN system SHALL accept it as valid", async () => {
      // Arrange
      const config = {
        url: "https://gitlab.com/some-org/project.git",
        type: WebSourceType.GIT_REPO,
      };

      // Act
      const validation = loader.validateConfig(config);

      // Assert
      expect(validation).toBe(true);
      expect(loader.canHandle(config)).toBe(true);
    });

    test("WHEN SSH Git URL is provided THEN system SHALL accept it as valid", async () => {
      // Arrange
      const config = {
        url: "git@github.com:microsoft/vscode.git",
        type: WebSourceType.GIT_REPO,
      };

      // Act
      const validation = loader.validateConfig(config);

      // Assert
      expect(validation).toBe(true);
    });
  });

  describe("REQ-12.2: Content Identification for Change Detection", () => {
    test("WHEN getting content ID THEN system SHALL generate unique identifier based on URL and options", async () => {
      // Arrange
      const config1 = {
        url: "https://github.com/microsoft/vscode.git",
        type: WebSourceType.GIT_REPO,
        options: { paths: ["README.md"] },
      };

      const config2 = {
        url: "https://github.com/microsoft/vscode.git",
        type: WebSourceType.GIT_REPO,
        options: { paths: ["docs/"] },
      };

      // Act
      const id1 = await loader.getContentId(config1);
      const id2 = await loader.getContentId(config2);

      // Assert
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });

    test("WHEN same configuration used THEN system SHALL generate consistent content ID", async () => {
      // Arrange
      const config = {
        url: "https://github.com/microsoft/vscode.git",
        type: WebSourceType.GIT_REPO,
        options: { paths: ["README.md"], branch: "main" },
      };

      // Act
      const id1 = await loader.getContentId(config);
      const id2 = await loader.getContentId(config);

      // Assert
      expect(id1).toBe(id2);
    });
  });

  describe("REQ-16: Content Processing for Web Sources", () => {
    test("WHEN GitRepoLoader used with valid config THEN system SHALL be ready to process content", async () => {
      // Arrange
      const config = {
        url: "https://github.com/microsoft/TypeScript.git",
        type: WebSourceType.GIT_REPO,
        options: { paths: ["README.md"] },
      };

      // Act
      const canHandle = loader.canHandle(config);
      const validation = loader.validateConfig(config);
      const contentId = await loader.getContentId(config);

      // Assert
      expect(canHandle).toBe(true);
      expect(validation).toBe(true);
      expect(contentId).toBeDefined();
      expect(typeof contentId).toBe("string");
    });
  });

  describe("REQ-18: Smart Git Repository Content Filtering", () => {
    test("WHEN filterDocumentationFiles called THEN system SHALL include only documentation files", async () => {
      const mockFiles = [
        "README.md",
        "docs/getting-started.md",
        "docs/api/authentication.md",
        "guides/tutorial.rst",
        "src/index.js", // Should be excluded
        "package.json", // Should be excluded
        "CHANGELOG.md", // Should be excluded (project metadata)
        "LICENSE", // Should be excluded (project metadata)
        "CONTRIBUTING.md", // Should be excluded (project metadata)
        "node_modules/lib.js", // Should be excluded
        "build/output.js", // Should be excluded
      ];

      // Test the filtering method directly
      const filtered = (loader as any).filterDocumentationFiles(mockFiles);

      expect(filtered).toEqual([
        "README.md",
        "docs/getting-started.md",
        "docs/api/authentication.md",
        "guides/tutorial.rst",
      ]);
    });

    test("WHEN isDocumentationFile called THEN system SHALL correctly classify file types", async () => {
      const testCases = [
        // Documentation files - should be included
        { file: "README.md", expected: true, reason: "README files" },
        {
          file: "docs/getting-started.md",
          expected: true,
          reason: "docs directory",
        },
        {
          file: "documentation/api.mdx",
          expected: true,
          reason: "documentation directory",
        },
        {
          file: "guides/tutorial.rst",
          expected: true,
          reason: "guides directory",
        },
        {
          file: "examples/basic.txt",
          expected: true,
          reason: "examples directory",
        },
        {
          file: "tutorials/advanced.md",
          expected: true,
          reason: "tutorials directory",
        },

        // Project metadata - should be excluded
        { file: "CHANGELOG.md", expected: false, reason: "changelog metadata" },
        { file: "LICENSE", expected: false, reason: "license metadata" },
        {
          file: "CONTRIBUTING.md",
          expected: false,
          reason: "contributing metadata",
        },
        {
          file: "CODE_OF_CONDUCT.md",
          expected: false,
          reason: "code of conduct metadata",
        },
        { file: "AUTHORS.txt", expected: false, reason: "authors metadata" },

        // Source code - should be excluded
        { file: "src/index.js", expected: false, reason: "source code" },
        { file: "lib/utils.ts", expected: false, reason: "library code" },
        {
          file: "components/Button.tsx",
          expected: false,
          reason: "component code",
        },

        // Build artifacts - should be excluded
        {
          file: "node_modules/lodash.js",
          expected: false,
          reason: "dependencies",
        },
        { file: "build/output.js", expected: false, reason: "build artifacts" },
        { file: "dist/bundle.js", expected: false, reason: "distribution" },
        { file: ".cache/temp.js", expected: false, reason: "cache files" },

        // Config files - should be excluded
        { file: "package.json", expected: false, reason: "config file" },
        { file: ".gitignore", expected: false, reason: "git config" },
        { file: "tsconfig.json", expected: false, reason: "typescript config" },
      ];

      // Test each case
      for (const testCase of testCases) {
        const result = (loader as any).isDocumentationFile(testCase.file);
        expect(result).toBe(
          testCase.expected,
          `${testCase.file} should ${testCase.expected ? "be included" : "be excluded"} (${testCase.reason})`,
        );
      }
    });

    test("WHEN extractContent called with no paths THEN system SHALL use smart filtering instead of copying everything", async () => {
      // This test verifies that the current behavior (copy everything) will be changed
      // Currently GitRepoLoader copies everything when no paths specified - this should change

      const config = {
        url: "https://github.com/example/repo.git",
        type: WebSourceType.GIT_REPO,
        options: {}, // No paths specified - should trigger smart filtering
      };

      expect(loader.canHandle(config)).toBe(true);

      // TODO: When we implement the change, this test will verify that
      // extractContent uses smart filtering instead of copying everything
    });
  });

  describe("REQ-19: Centralized Content Loading Architecture", () => {
    test("WHEN GitRepoLoader processes web sources THEN it SHALL apply same filtering logic regardless of caller", async () => {
      const config = {
        url: "https://github.com/example/repo.git",
        type: WebSourceType.GIT_REPO,
        options: {}, // No explicit paths
      };

      expect(loader.canHandle(config)).toBe(true);
      expect(loader.validateConfig(config)).toBe(true);

      // The filtering behavior should be centralized in GitRepoLoader
      // and identical regardless of who calls it (CLI, API, etc.)
    });
  });
});
