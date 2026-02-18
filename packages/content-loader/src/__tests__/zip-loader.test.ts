/**
 * Tests for Zip file content loader
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import AdmZip from "adm-zip";
import { ZipLoader } from "../content/zip-loader.js";
import { WebSourceType } from "../types.js";

describe("Zip Loader", () => {
  let loader: ZipLoader;
  let tempDir: string;

  beforeEach(async () => {
    loader = new ZipLoader();
    tempDir = path.join(
      process.cwd(),
      ".tmp",
      `zip-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a zip file with given entries
   */
  async function createTestZip(
    entries: Record<string, string>,
    zipName = "test.zip",
  ): Promise<string> {
    const zip = new AdmZip();
    for (const [entryPath, content] of Object.entries(entries)) {
      zip.addFile(entryPath, Buffer.from(content));
    }
    const zipPath = path.join(tempDir, zipName);
    zip.writeZip(zipPath);
    return zipPath;
  }

  describe("canHandle", () => {
    test("should handle ZIP type", () => {
      expect(
        loader.canHandle({ url: "test.zip", type: WebSourceType.ZIP }),
      ).toBe(true);
    });

    test("should not handle GIT_REPO type", () => {
      expect(
        loader.canHandle({
          url: "https://github.com/test/repo.git",
          type: WebSourceType.GIT_REPO,
        }),
      ).toBe(false);
    });
  });

  describe("validateConfig", () => {
    test("should accept valid config with url", () => {
      expect(
        loader.validateConfig({
          url: "https://example.com/docs.zip",
          type: WebSourceType.ZIP,
        }),
      ).toBe(true);
    });

    test("should accept valid config with local path", () => {
      expect(
        loader.validateConfig({
          url: "/path/to/local.zip",
          type: WebSourceType.ZIP,
        }),
      ).toBe(true);
    });

    test("should reject config without url", () => {
      expect(
        loader.validateConfig({
          url: "",
          type: WebSourceType.ZIP,
        }),
      ).not.toBe(true);
    });
  });

  describe("load - local zip files", () => {
    test("should extract documentation files from zip", async () => {
      const zipPath = await createTestZip({
        "README.md": "# Hello",
        "docs/guide.md": "# Guide",
        "src/index.ts": "export {}",
        "package.json": "{}",
      });

      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        { url: zipPath, type: WebSourceType.ZIP },
        targetDir,
      );

      expect(result.success).toBe(true);
      expect(result.files).toContain("README.md");
      expect(result.files).toContain("docs/guide.md");
      expect(result.files).not.toContain("src/index.ts");
      expect(result.files).not.toContain("package.json");
    });

    test("should flatten single root directory", async () => {
      const zipPath = await createTestZip({
        "my-project/README.md": "# Hello",
        "my-project/docs/guide.md": "# Guide",
      });

      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        { url: zipPath, type: WebSourceType.ZIP },
        targetDir,
      );

      expect(result.success).toBe(true);
      // Files should be at root level, not under my-project/
      expect(result.files).toContain("README.md");
      expect(result.files).toContain("docs/guide.md");
      expect(result.files).not.toContain("my-project/README.md");
    });

    test("should NOT flatten when multiple root entries exist", async () => {
      const zipPath = await createTestZip({
        "dir-a/README.md": "# A",
        "dir-b/README.md": "# B",
      });

      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        { url: zipPath, type: WebSourceType.ZIP },
        targetDir,
      );

      expect(result.success).toBe(true);
      expect(result.files).toContain("dir-a/README.md");
      expect(result.files).toContain("dir-b/README.md");
    });

    test("should extract only specified paths when provided", async () => {
      const zipPath = await createTestZip({
        "docs/api.md": "# API",
        "docs/guide.md": "# Guide",
        "other/notes.md": "# Notes",
      });

      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        {
          url: zipPath,
          type: WebSourceType.ZIP,
          options: { paths: ["docs/"] },
        },
        targetDir,
      );

      expect(result.success).toBe(true);
      expect(result.files.some((f) => f.includes("api.md"))).toBe(true);
      expect(result.files.some((f) => f.includes("guide.md"))).toBe(true);
    });

    test("should return error for non-existent local file", async () => {
      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        { url: "/nonexistent/file.zip", type: WebSourceType.ZIP },
        targetDir,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should generate content hash", async () => {
      const zipPath = await createTestZip({
        "README.md": "# Hello",
      });

      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        { url: zipPath, type: WebSourceType.ZIP },
        targetDir,
      );

      expect(result.success).toBe(true);
      expect(result.contentHash).toBeTruthy();
      expect(result.contentHash.length).toBe(64); // SHA-256 hex
    });
  });

  describe("getContentId", () => {
    test("should generate hash from local file content", async () => {
      const zipPath = await createTestZip({
        "README.md": "# Hello",
      });

      const contentId = await loader.getContentId({
        url: zipPath,
        type: WebSourceType.ZIP,
      });

      expect(contentId).toBeTruthy();
      expect(contentId.length).toBe(64);
    });

    test("should generate different hashes for different files", async () => {
      const zip1 = await createTestZip({ "a.md": "content-1" }, "test1.zip");
      const zip2 = await createTestZip({ "b.md": "content-2" }, "test2.zip");

      const id1 = await loader.getContentId({
        url: zip1,
        type: WebSourceType.ZIP,
      });
      const id2 = await loader.getContentId({
        url: zip2,
        type: WebSourceType.ZIP,
      });

      expect(id1).not.toBe(id2);
    });

    test("should fallback gracefully for non-existent file", async () => {
      const contentId = await loader.getContentId({
        url: "/nonexistent.zip",
        type: WebSourceType.ZIP,
      });

      // Should fallback to URL-based hash
      expect(contentId).toBeTruthy();
      expect(contentId.length).toBe(64);
    });
  });

  describe("smart filtering", () => {
    test("should include examples directory files", async () => {
      const zipPath = await createTestZip({
        "examples/demo.js": "console.log('hello')",
        "examples/config.json": "{}",
        "src/index.ts": "export {}",
      });

      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        { url: zipPath, type: WebSourceType.ZIP },
        targetDir,
      );

      expect(result.success).toBe(true);
      expect(result.files).toContain("examples/demo.js");
      expect(result.files).toContain("examples/config.json");
      expect(result.files).not.toContain("src/index.ts");
    });

    test("should exclude build artifacts and metadata", async () => {
      const zipPath = await createTestZip({
        "README.md": "# Docs",
        "CHANGELOG.md": "# Changes",
        "LICENSE.md": "MIT",
        "dist/bundle.js": "var x;",
        "node_modules/lib/index.js": "module.exports = {};",
      });

      const targetDir = path.join(tempDir, "output");
      const result = await loader.load(
        { url: zipPath, type: WebSourceType.ZIP },
        targetDir,
      );

      expect(result.success).toBe(true);
      expect(result.files).toContain("README.md");
      expect(result.files).not.toContain("CHANGELOG.md");
      expect(result.files).not.toContain("LICENSE.md");
      expect(result.files).not.toContain("dist/bundle.js");
      expect(result.files).not.toContain("node_modules/lib/index.js");
    });
  });
});
