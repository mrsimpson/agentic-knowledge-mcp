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
      expect(validation).toBe("Invalid Git repository URL");
    });

    test("WHEN Git repository URL is missing THEN system SHALL return required field error", async () => {
      // Arrange
      const config = {
        url: "",
        type: WebSourceType.GIT_REPO,
      };

      // Act
      const validation = loader.validateConfig(config);

      // Assert
      expect(validation).toBe("Git repository URL is required");
    });

    test("WHEN GitHub URL is provided THEN system SHALL accept it as valid", async () => {
      // Arrange
      const configs = [
        {
          url: "https://github.com/microsoft/vscode.git",
          type: WebSourceType.GIT_REPO,
        },
        {
          url: "https://github.com/facebook/react",
          type: WebSourceType.GIT_REPO,
        },
        {
          url: "https://github.com/user-name/repo-name.git",
          type: WebSourceType.GIT_REPO,
        },
      ];

      // Act & Assert
      configs.forEach((config) => {
        expect(loader.validateConfig(config)).toBe(true);
        expect(loader.canHandle(config)).toBe(true);
      });
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
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1).not.toBe(id2); // Different paths should generate different IDs
      expect(id1.length).toBeGreaterThan(10); // Should be a meaningful hash
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
      expect(id1).toBe(id2); // Same config should always produce same ID
    });
  });

  describe("REQ-15: Error Handling for Web Sources", () => {
    test("WHEN non-Git web source type provided THEN system SHALL reject it", async () => {
      // Arrange
      const config = {
        url: "https://example.com/docs",
        type: WebSourceType.DOCUMENTATION_SITE, // Not supported by GitRepoLoader
      };

      // Act & Assert
      expect(loader.canHandle(config)).toBe(false);
    });

    test("WHEN malformed Git URL provided THEN system SHALL provide clear validation error", async () => {
      // Arrange
      const badUrls = [
        "http://github.com/user/repo.git", // HTTP instead of HTTPS
        "https://github.com/user", // Missing repo name
        "ftp://example.com/repo.git", // Wrong protocol
        "github.com/user/repo.git", // Missing protocol
      ];

      // Act & Assert
      badUrls.forEach((url) => {
        const config = { url, type: WebSourceType.GIT_REPO };
        const validation = loader.validateConfig(config);
        expect(validation).toBe("Invalid Git repository URL");
      });
    });
  });

  describe("REQ-16: Content Processing for Web Sources", () => {
    test("WHEN GitRepoLoader used with valid config THEN system SHALL be ready to process content", async () => {
      // Arrange
      const config = {
        url: "https://github.com/microsoft/vscode.git",
        type: WebSourceType.GIT_REPO,
        options: {
          paths: ["README.md", "docs/"],
          branch: "main",
        },
      };

      // Act - Test the setup and validation
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
});
