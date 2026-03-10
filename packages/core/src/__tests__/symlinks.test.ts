/**
 * Tests for symlink management utilities
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createSymlinks,
  validateSymlinks,
  removeSymlinks,
} from "../paths/symlinks.js";
import { calculateLocalPathWithSymlinks } from "../paths/calculator.js";
import type { DocsetConfig } from "../types.js";

describe("Symlink Management", () => {
  let tempDir: string;
  let projectRoot: string;
  let configPath: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(tmpdir(), "symlinks-test-"));
    projectRoot = tempDir;
    configPath = join(tempDir, ".knowledge", "config.yaml");
    sourceDir = join(tempDir, "docs");
    targetDir = join(tempDir, ".knowledge", "docsets", "test-docs");

    await fs.mkdir(join(tempDir, ".knowledge"), { recursive: true });
    await fs.mkdir(sourceDir, { recursive: true });

    await fs.writeFile(join(sourceDir, "README.md"), "# Test Documentation");
    await fs.writeFile(join(sourceDir, "guide.md"), "# User Guide");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("createSymlinks", () => {
    test("should link source contents directly into targetDir (no extra subfolder)", async () => {
      await createSymlinks(["./docs"], targetDir, projectRoot);

      const readme = join(targetDir, "README.md");
      const guide = join(targetDir, "guide.md");

      expect((await fs.lstat(readme)).isSymbolicLink()).toBe(true);
      expect((await fs.lstat(guide)).isSymbolicLink()).toBe(true);

      expect(await fs.readlink(readme)).toBe(join(sourceDir, "README.md"));
      expect(await fs.readlink(guide)).toBe(join(sourceDir, "guide.md"));
    });

    test("should handle trailing slash in source path", async () => {
      await createSymlinks([sourceDir + "/"], targetDir, projectRoot);

      expect(
        (await fs.lstat(join(targetDir, "README.md"))).isSymbolicLink(),
      ).toBe(true);
      await expect(fs.access(join(targetDir, "unknown"))).rejects.toThrow();
    });

    test("should merge contents of multiple source paths into targetDir", async () => {
      const sourceDir2 = join(tempDir, "guides");
      await fs.mkdir(sourceDir2);
      await fs.writeFile(join(sourceDir2, "tutorial.md"), "# Tutorial");

      await createSymlinks(["./docs", "./guides"], targetDir, projectRoot);

      expect(
        (await fs.lstat(join(targetDir, "README.md"))).isSymbolicLink(),
      ).toBe(true);
      expect(
        (await fs.lstat(join(targetDir, "guide.md"))).isSymbolicLink(),
      ).toBe(true);
      expect(
        (await fs.lstat(join(targetDir, "tutorial.md"))).isSymbolicLink(),
      ).toBe(true);
    });

    test("should handle absolute source paths", async () => {
      await createSymlinks([sourceDir], targetDir, projectRoot);

      expect(
        (await fs.lstat(join(targetDir, "README.md"))).isSymbolicLink(),
      ).toBe(true);
    });

    test("should throw error for non-existent source", async () => {
      await expect(
        createSymlinks(["./non-existent"], targetDir, projectRoot),
      ).rejects.toThrow("Source path does not exist");
    });

    test("should replace existing symlinks on re-run", async () => {
      await createSymlinks(["./docs"], targetDir, projectRoot);
      await createSymlinks(["./docs"], targetDir, projectRoot);

      expect(
        (await fs.lstat(join(targetDir, "README.md"))).isSymbolicLink(),
      ).toBe(true);
    });
  });

  describe("validateSymlinks", () => {
    test("should return true for valid symlinks", async () => {
      await createSymlinks(["./docs"], targetDir, projectRoot);

      const isValid = await validateSymlinks(targetDir);
      expect(isValid).toBe(true);
    });

    test("should return false for broken symlinks", async () => {
      await createSymlinks(["./docs"], targetDir, projectRoot);

      await fs.rm(sourceDir, { recursive: true });

      const isValid = await validateSymlinks(targetDir);
      expect(isValid).toBe(false);
    });

    test("should return false for non-existent directory", async () => {
      const isValid = await validateSymlinks(join(tempDir, "non-existent"));
      expect(isValid).toBe(false);
    });
  });

  describe("removeSymlinks", () => {
    test("should remove all symlinks in directory", async () => {
      await createSymlinks(["./docs"], targetDir, projectRoot);

      await removeSymlinks(targetDir);

      await expect(fs.access(join(targetDir, "README.md"))).rejects.toThrow();
      await expect(fs.access(join(targetDir, "guide.md"))).rejects.toThrow();
    });

    test("should handle non-existent directory gracefully", async () => {
      await expect(
        removeSymlinks(join(tempDir, "non-existent")),
      ).resolves.not.toThrow();
    });
  });

  describe("calculateLocalPathWithSymlinks", () => {
    test("should create symlinks and return relative path", async () => {
      const docset: DocsetConfig = {
        id: "test-docs",
        name: "Test Documentation",
        sources: [
          {
            type: "local_folder",
            paths: ["./docs"],
          },
        ],
      };

      const result = await calculateLocalPathWithSymlinks(docset, configPath);

      expect(result).toBe(".knowledge/docsets/test-docs");
      expect(
        (await fs.lstat(join(targetDir, "README.md"))).isSymbolicLink(),
      ).toBe(true);
    });

    test("should handle git_repo sources without symlinks", async () => {
      const docset: DocsetConfig = {
        id: "git-docs",
        name: "Git Documentation",
        sources: [
          {
            type: "git_repo",
            url: "https://github.com/example/repo.git",
          },
        ],
      };

      const result = await calculateLocalPathWithSymlinks(docset, configPath);

      const expected = join(tempDir, ".knowledge", "docsets", "git-docs");
      expect(result).toBe(expected);
    });
  });
});
