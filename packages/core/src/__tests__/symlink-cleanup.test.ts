/**
 * Symlink Cleanup Tests - Force re-init should remove orphaned symlinks
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { createSymlinks, removeSymlinks } from "../paths/symlinks.js";

describe("Symlink Cleanup on Force Re-init", () => {
  let testDir: string;
  let sourceDir: string;
  let targetDir: string;

  beforeEach(async () => {
    // Create test directories
    testDir = path.join(tmpdir(), `agentic-symlink-test-${Date.now()}`);
    sourceDir = path.join(testDir, "source");
    targetDir = path.join(testDir, "target");

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(targetDir, { recursive: true });

    // Create source directories
    await fs.mkdir(path.join(sourceDir, "src"), { recursive: true });
    await fs.mkdir(path.join(sourceDir, "lib"), { recursive: true });
    await fs.mkdir(path.join(sourceDir, "docs"), { recursive: true });

    // Add some files to make them real directories
    await fs.writeFile(path.join(sourceDir, "src", "index.js"), "content");
    await fs.writeFile(path.join(sourceDir, "lib", "utils.js"), "content");
    await fs.writeFile(path.join(sourceDir, "docs", "README.md"), "content");
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("removeSymlinks function", () => {
    it("should remove all symlinks from target directory", async () => {
      // Create symlinks
      await createSymlinks(["src", "lib"], targetDir, sourceDir);

      // Verify symlinks exist
      const linksStat1 = await fs.lstat(path.join(targetDir, "src"));
      const linksStat2 = await fs.lstat(path.join(targetDir, "lib"));
      expect(linksStat1.isSymbolicLink()).toBe(true);
      expect(linksStat2.isSymbolicLink()).toBe(true);

      // Remove all symlinks
      await removeSymlinks(targetDir);

      // Verify symlinks are gone
      const files = await fs.readdir(targetDir);
      expect(files).toHaveLength(0);
    });

    it("should not remove regular files or directories", async () => {
      // Create a mix of symlinks and regular files
      await createSymlinks(["src"], targetDir, sourceDir);
      await fs.writeFile(path.join(targetDir, "regular-file.txt"), "content");
      await fs.mkdir(path.join(targetDir, "regular-dir"), { recursive: true });

      // Remove symlinks
      await removeSymlinks(targetDir);

      // Regular files should still exist
      const files = await fs.readdir(targetDir);
      expect(files).toContain("regular-file.txt");
      expect(files).toContain("regular-dir");
      expect(files).not.toContain("src");
    });
  });

  describe("createSymlinks with cleanup", () => {
    it("should remove orphaned symlinks when paths change", async () => {
      // Initial: create symlinks for src, lib, docs
      await createSymlinks(["src", "lib", "docs"], targetDir, sourceDir);

      let files = await fs.readdir(targetDir);
      expect(files).toHaveLength(3);
      expect(files).toContain("src");
      expect(files).toContain("lib");
      expect(files).toContain("docs");

      // Simulate force re-init with different paths (only src)
      // This should:
      // 1. Remove ALL existing symlinks
      // 2. Create new symlinks only for specified paths

      await removeSymlinks(targetDir); // Should be called before createSymlinks
      await createSymlinks(["src"], targetDir, sourceDir);

      // Only src should exist now
      files = await fs.readdir(targetDir);
      expect(files).toHaveLength(1);
      expect(files).toContain("src");
      expect(files).not.toContain("lib");
      expect(files).not.toContain("docs");
    });

    it("should handle empty target directory gracefully", async () => {
      // Calling removeSymlinks on empty directory should not error
      await expect(removeSymlinks(targetDir)).resolves.not.toThrow();

      // Should be able to create symlinks after
      await createSymlinks(["src"], targetDir, sourceDir);

      const files = await fs.readdir(targetDir);
      expect(files).toHaveLength(1);
      expect(files).toContain("src");
    });

    it("should update symlinks when source paths change", async () => {
      // Create initial symlinks
      await createSymlinks(["src", "lib"], targetDir, sourceDir);

      // Verify initial state
      let files = await fs.readdir(targetDir);
      expect(files).toContain("src");
      expect(files).toContain("lib");

      // Change configuration (remove lib, add docs)
      await removeSymlinks(targetDir);
      await createSymlinks(["src", "docs"], targetDir, sourceDir);

      // Verify updated state
      files = await fs.readdir(targetDir);
      expect(files).toHaveLength(2);
      expect(files).toContain("src");
      expect(files).toContain("docs");
      expect(files).not.toContain("lib"); // Orphaned symlink removed
    });
  });

  describe("Integration with force re-init", () => {
    it("should demonstrate the complete workflow", async () => {
      // Step 1: Initial initialization with paths: ["src", "lib"]
      await createSymlinks(["src", "lib"], targetDir, sourceDir);

      let files = await fs.readdir(targetDir);
      expect(files).toEqual(expect.arrayContaining(["src", "lib"]));

      // Step 2: User changes config to paths: ["src", "docs"]
      // Step 3: User runs init --force

      // The force re-init should:
      // a) Remove all existing symlinks
      await removeSymlinks(targetDir);

      // b) Create new symlinks based on current config
      await createSymlinks(["src", "docs"], targetDir, sourceDir);

      // Step 4: Verify final state
      files = await fs.readdir(targetDir);
      expect(files).toHaveLength(2);
      expect(files).toContain("src");
      expect(files).toContain("docs");
      expect(files).not.toContain("lib"); // Properly cleaned up
    });
  });
});
