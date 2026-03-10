/**
 * Tests for safe directory cleanup utilities
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import {
  safelyClearDirectory,
  containsSymlinks,
  getDirectoryInfo,
} from "../paths/cleanup.js";
import { createSymlinks } from "../paths/symlinks.js";

describe("Safe Directory Cleanup", () => {
  let testDir: string;
  let targetDir: string;
  let sourceDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `cleanup-test-${Date.now()}`);
    targetDir = path.join(testDir, "target");
    sourceDir = path.join(testDir, "source");

    await fs.mkdir(targetDir, { recursive: true });
    await fs.mkdir(sourceDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("safelyClearDirectory", () => {
    it("should clear directory with regular files", async () => {
      await fs.writeFile(path.join(targetDir, "file1.txt"), "content1");
      await fs.writeFile(path.join(targetDir, "file2.txt"), "content2");
      await fs.mkdir(path.join(targetDir, "subdir"), { recursive: true });
      await fs.writeFile(
        path.join(targetDir, "subdir", "file3.txt"),
        "content3",
      );

      await safelyClearDirectory(targetDir);

      const exists = await fs
        .access(targetDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it("should handle non-existent directory gracefully", async () => {
      await expect(
        safelyClearDirectory(path.join(testDir, "does-not-exist")),
      ).resolves.not.toThrow();
    });

    it("should clear directory with symlinks without deleting source files", async () => {
      const srcFolder = path.join(sourceDir, "src");
      await fs.mkdir(srcFolder, { recursive: true });
      const sourceFile = path.join(srcFolder, "important.js");
      await fs.writeFile(sourceFile, "IMPORTANT DATA");

      await createSymlinks(["src"], targetDir, sourceDir);

      const symlinkPath = path.join(targetDir, "important.js");
      expect((await fs.lstat(symlinkPath)).isSymbolicLink()).toBe(true);

      await safelyClearDirectory(targetDir);

      // Source must survive removal of the docset directory
      expect(await fs.readFile(sourceFile, "utf-8")).toBe("IMPORTANT DATA");
      expect(
        await fs
          .access(targetDir)
          .then(() => true)
          .catch(() => false),
      ).toBe(false);
    });
  });

  describe("containsSymlinks", () => {
    it("should detect symlinks", async () => {
      const srcFolder = path.join(sourceDir, "src");
      await fs.mkdir(srcFolder, { recursive: true });
      await fs.writeFile(path.join(srcFolder, "file.js"), "content");

      await createSymlinks(["src"], targetDir, sourceDir);

      expect(await containsSymlinks(targetDir)).toBe(true);
    });

    it("should return false for directory with no symlinks", async () => {
      await fs.writeFile(path.join(targetDir, "regular.txt"), "content");

      expect(await containsSymlinks(targetDir)).toBe(false);
    });

    it("should return false for non-existent directory", async () => {
      expect(await containsSymlinks(path.join(testDir, "nope"))).toBe(false);
    });
  });

  describe("getDirectoryInfo", () => {
    it("should count different entry types", async () => {
      await fs.writeFile(path.join(targetDir, "file1.txt"), "content");
      await fs.writeFile(path.join(targetDir, "file2.txt"), "content");
      await fs.mkdir(path.join(targetDir, "subdir"), { recursive: true });

      const srcFolder = path.join(sourceDir, "src");
      await fs.mkdir(srcFolder, { recursive: true });
      await fs.writeFile(path.join(srcFolder, "file.js"), "content");
      await createSymlinks(["src"], targetDir, sourceDir);

      const info = await getDirectoryInfo(targetDir);

      expect(info.files).toBe(2);
      expect(info.directories).toBe(1);
      expect(info.symlinks).toBe(1);
      expect(info.total).toBe(4);
    });

    it("should return zeros for empty directory", async () => {
      const info = await getDirectoryInfo(targetDir);

      expect(info.files).toBe(0);
      expect(info.directories).toBe(0);
      expect(info.symlinks).toBe(0);
      expect(info.total).toBe(0);
    });

    it("should return zeros for non-existent directory", async () => {
      const info = await getDirectoryInfo(path.join(testDir, "nope"));

      expect(info.files).toBe(0);
      expect(info.directories).toBe(0);
      expect(info.symlinks).toBe(0);
      expect(info.total).toBe(0);
    });
  });
});
