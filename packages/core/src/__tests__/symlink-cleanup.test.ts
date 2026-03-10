/**
 * Symlink cleanup tests — force re-init should remove orphaned symlinks
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
    testDir = path.join(tmpdir(), `agentic-symlink-test-${Date.now()}`);
    sourceDir = path.join(testDir, "source");
    targetDir = path.join(testDir, "target");

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(targetDir, { recursive: true });

    // Each source subdirectory has one distinct file so assertions are unambiguous.
    await fs.mkdir(path.join(sourceDir, "src"), { recursive: true });
    await fs.mkdir(path.join(sourceDir, "lib"), { recursive: true });
    await fs.mkdir(path.join(sourceDir, "docs"), { recursive: true });

    await fs.writeFile(path.join(sourceDir, "src", "index.js"), "content");
    await fs.writeFile(path.join(sourceDir, "lib", "utils.js"), "content");
    await fs.writeFile(path.join(sourceDir, "docs", "README.md"), "content");
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("removeSymlinks function", () => {
    it("should remove all symlinks from target directory", async () => {
      await createSymlinks(["src", "lib"], targetDir, sourceDir);

      expect(
        (await fs.lstat(path.join(targetDir, "index.js"))).isSymbolicLink(),
      ).toBe(true);
      expect(
        (await fs.lstat(path.join(targetDir, "utils.js"))).isSymbolicLink(),
      ).toBe(true);

      await removeSymlinks(targetDir);

      const files = await fs.readdir(targetDir);
      expect(files).toHaveLength(0);
    });

    it("should not remove regular files or directories", async () => {
      await createSymlinks(["src"], targetDir, sourceDir);
      await fs.writeFile(path.join(targetDir, "regular-file.txt"), "content");
      await fs.mkdir(path.join(targetDir, "regular-dir"), { recursive: true });

      await removeSymlinks(targetDir);

      const files = await fs.readdir(targetDir);
      expect(files).toContain("regular-file.txt");
      expect(files).toContain("regular-dir");
      expect(files).not.toContain("index.js");
    });
  });

  describe("createSymlinks with cleanup", () => {
    it("should remove orphaned symlinks when paths change", async () => {
      await createSymlinks(["src", "lib", "docs"], targetDir, sourceDir);

      let files = await fs.readdir(targetDir);
      expect(files).toHaveLength(3);
      expect(files).toContain("index.js");
      expect(files).toContain("utils.js");
      expect(files).toContain("README.md");

      await removeSymlinks(targetDir);
      await createSymlinks(["src"], targetDir, sourceDir);

      files = await fs.readdir(targetDir);
      expect(files).toHaveLength(1);
      expect(files).toContain("index.js");
      expect(files).not.toContain("utils.js");
      expect(files).not.toContain("README.md");
    });

    it("should handle empty target directory gracefully", async () => {
      await expect(removeSymlinks(targetDir)).resolves.not.toThrow();

      await createSymlinks(["src"], targetDir, sourceDir);

      const files = await fs.readdir(targetDir);
      expect(files).toHaveLength(1);
      expect(files).toContain("index.js");
    });

    it("should update symlinks when source paths change", async () => {
      await createSymlinks(["src", "lib"], targetDir, sourceDir);

      let files = await fs.readdir(targetDir);
      expect(files).toContain("index.js");
      expect(files).toContain("utils.js");

      await removeSymlinks(targetDir);
      await createSymlinks(["src", "docs"], targetDir, sourceDir);

      files = await fs.readdir(targetDir);
      expect(files).toHaveLength(2);
      expect(files).toContain("index.js");
      expect(files).toContain("README.md");
      expect(files).not.toContain("utils.js");
    });
  });

  describe("Integration with force re-init", () => {
    it("should demonstrate the complete workflow", async () => {
      await createSymlinks(["src", "lib"], targetDir, sourceDir);

      let files = await fs.readdir(targetDir);
      expect(files).toEqual(expect.arrayContaining(["index.js", "utils.js"]));

      await removeSymlinks(targetDir);
      await createSymlinks(["src", "docs"], targetDir, sourceDir);

      files = await fs.readdir(targetDir);
      expect(files).toHaveLength(2);
      expect(files).toContain("index.js");
      expect(files).toContain("README.md");
      expect(files).not.toContain("utils.js");
    });
  });
});
