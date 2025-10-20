/**
 * Tests for symlink management utilities
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSymlinks, validateSymlinks, removeSymlinks } from "../paths/symlinks.js";
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

    // Create directory structure
    await fs.mkdir(join(tempDir, ".knowledge"), { recursive: true });
    await fs.mkdir(sourceDir, { recursive: true });
    
    // Create some test files
    await fs.writeFile(join(sourceDir, "README.md"), "# Test Documentation");
    await fs.writeFile(join(sourceDir, "guide.md"), "# User Guide");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("createSymlinks", () => {
    test("should create symlinks for local paths", async () => {
      const sourcePaths = ["./docs"];
      
      await createSymlinks(sourcePaths, targetDir, projectRoot);
      
      // Check that symlink was created
      const symlinkPath = join(targetDir, "docs");
      const stats = await fs.lstat(symlinkPath);
      expect(stats.isSymbolicLink()).toBe(true);
      
      // Check that symlink points to correct target
      const target = await fs.readlink(symlinkPath);
      expect(target).toBe(sourceDir);
    });

    test("should create symlinks for multiple paths", async () => {
      // Create additional source directory
      const sourceDir2 = join(tempDir, "guides");
      await fs.mkdir(sourceDir2);
      await fs.writeFile(join(sourceDir2, "tutorial.md"), "# Tutorial");
      
      const sourcePaths = ["./docs", "./guides"];
      
      await createSymlinks(sourcePaths, targetDir, projectRoot);
      
      // Check both symlinks exist
      const symlink1 = join(targetDir, "docs");
      const symlink2 = join(targetDir, "guides");
      
      expect((await fs.lstat(symlink1)).isSymbolicLink()).toBe(true);
      expect((await fs.lstat(symlink2)).isSymbolicLink()).toBe(true);
    });

    test("should handle absolute paths", async () => {
      const sourcePaths = [sourceDir];
      
      await createSymlinks(sourcePaths, targetDir, projectRoot);
      
      const symlinkPath = join(targetDir, "docs");
      expect((await fs.lstat(symlinkPath)).isSymbolicLink()).toBe(true);
    });

    test("should throw error for non-existent source", async () => {
      const sourcePaths = ["./non-existent"];
      
      await expect(createSymlinks(sourcePaths, targetDir, projectRoot))
        .rejects.toThrow("Source path does not exist");
    });

    test("should replace existing symlinks", async () => {
      const sourcePaths = ["./docs"];
      
      // Create initial symlink
      await createSymlinks(sourcePaths, targetDir, projectRoot);
      
      // Create again (should replace)
      await createSymlinks(sourcePaths, targetDir, projectRoot);
      
      const symlinkPath = join(targetDir, "docs");
      expect((await fs.lstat(symlinkPath)).isSymbolicLink()).toBe(true);
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
      
      // Remove source directory to break symlink
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
      
      // Verify symlink exists
      const symlinkPath = join(targetDir, "docs");
      expect((await fs.lstat(symlinkPath)).isSymbolicLink()).toBe(true);
      
      // Remove symlinks
      await removeSymlinks(targetDir);
      
      // Verify symlink is gone
      await expect(fs.access(symlinkPath)).rejects.toThrow();
    });

    test("should handle non-existent directory gracefully", async () => {
      await expect(removeSymlinks(join(tempDir, "non-existent")))
        .resolves.not.toThrow();
    });
  });

  describe("calculateLocalPathWithSymlinks", () => {
    test("should create symlinks and return relative path", async () => {
      const docset: DocsetConfig = {
        id: "test-docs",
        name: "Test Documentation",
        sources: [{
          type: "local_folder",
          paths: ["./docs"]
        }]
      };

      const result = await calculateLocalPathWithSymlinks(docset, configPath);
      
      // Should return relative path to symlink directory
      expect(result).toBe(".knowledge/docsets/test-docs");
      
      // Verify symlink was created
      const symlinkPath = join(targetDir, "docs");
      expect((await fs.lstat(symlinkPath)).isSymbolicLink()).toBe(true);
    });

    test("should handle git_repo sources without symlinks", async () => {
      const docset: DocsetConfig = {
        id: "git-docs",
        name: "Git Documentation",
        sources: [{
          type: "git_repo",
          url: "https://github.com/example/repo.git"
        }]
      };

      const result = await calculateLocalPathWithSymlinks(docset, configPath);
      
      // Should return absolute path for git repos
      const expected = join(tempDir, ".knowledge", "docsets", "git-docs");
      expect(result).toBe(expected);
    });
  });
});
