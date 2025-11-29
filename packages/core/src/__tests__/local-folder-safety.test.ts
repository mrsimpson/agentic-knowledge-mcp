/**
 * Safety tests for local folder cleanup - ensure source files are never deleted
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { createSymlinks, removeSymlinks } from "../paths/symlinks.js";

describe("Local Folder Cleanup Safety", () => {
  let testDir: string;
  let sourceDir: string;
  let targetDir: string;
  let sourceFile: string;

  beforeEach(async () => {
    // Create test directories
    testDir = path.join(tmpdir(), `agentic-safety-test-${Date.now()}`);
    sourceDir = path.join(testDir, "source");
    targetDir = path.join(testDir, "target");

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(targetDir, { recursive: true });

    // Create a source directory with actual files
    const actualSourceFolder = path.join(sourceDir, "src");
    await fs.mkdir(actualSourceFolder, { recursive: true });
    sourceFile = path.join(actualSourceFolder, "important-file.js");
    await fs.writeFile(sourceFile, "CRITICAL DATA - DO NOT DELETE");
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("CRITICAL: should NOT delete source files when removing symlinks", async () => {
    // Create symlink to source directory
    await createSymlinks(["src"], targetDir, sourceDir);

    // Verify symlink was created
    const symlinkPath = path.join(targetDir, "src");
    const linkStat = await fs.lstat(symlinkPath);
    expect(linkStat.isSymbolicLink()).toBe(true);

    // Verify we can access the source file through the symlink
    const fileViaSymlink = path.join(symlinkPath, "important-file.js");
    const content = await fs.readFile(fileViaSymlink, "utf-8");
    expect(content).toBe("CRITICAL DATA - DO NOT DELETE");

    // Remove symlinks
    await removeSymlinks(targetDir);

    // CRITICAL: Source file must still exist!
    const stillExists = await fs
      .access(sourceFile)
      .then(() => true)
      .catch(() => false);
    expect(stillExists).toBe(true);

    // Verify content is unchanged
    const originalContent = await fs.readFile(sourceFile, "utf-8");
    expect(originalContent).toBe("CRITICAL DATA - DO NOT DELETE");

    // Symlink should be gone
    const symlinkGone = await fs
      .lstat(symlinkPath)
      .then(() => false)
      .catch(() => true);
    expect(symlinkGone).toBe(true);
  });

  it("CRITICAL: should NOT delete source files when clearing target directory", async () => {
    // Create symlink
    await createSymlinks(["src"], targetDir, sourceDir);

    // Verify source file exists
    expect(await fs.readFile(sourceFile, "utf-8")).toBe(
      "CRITICAL DATA - DO NOT DELETE",
    );

    // Simulate clearing target directory (what --force does)
    // This is the DANGEROUS operation we need to test
    await fs.rm(targetDir, { recursive: true, force: true });

    // CRITICAL: Source file must STILL exist after removing target!
    const stillExists = await fs
      .access(sourceFile)
      .then(() => true)
      .catch(() => false);

    expect(stillExists).toBe(
      true,
      "CRITICAL FAILURE: Source file was deleted!",
    );

    if (stillExists) {
      const content = await fs.readFile(sourceFile, "utf-8");
      expect(content).toBe("CRITICAL DATA - DO NOT DELETE");
    }
  });

  it("CRITICAL: should handle nested symlinks safely", async () => {
    // Create nested structure in source
    const nestedDir = path.join(sourceDir, "src", "nested");
    await fs.mkdir(nestedDir, { recursive: true });
    const nestedFile = path.join(nestedDir, "nested-file.js");
    await fs.writeFile(nestedFile, "NESTED CRITICAL DATA");

    // Create symlink
    await createSymlinks(["src"], targetDir, sourceDir);

    // Clear target directory
    await fs.rm(targetDir, { recursive: true, force: true });

    // CRITICAL: All source files must still exist
    const sourceExists = await fs
      .access(sourceFile)
      .then(() => true)
      .catch(() => false);
    const nestedExists = await fs
      .access(nestedFile)
      .then(() => true)
      .catch(() => false);

    expect(sourceExists).toBe(true, "Source file was deleted!");
    expect(nestedExists).toBe(true, "Nested source file was deleted!");
  });

  it("should safely handle mixed content (symlinks and regular files)", async () => {
    // Create symlink
    await createSymlinks(["src"], targetDir, sourceDir);

    // Add a regular file to target directory
    const regularFile = path.join(targetDir, "regular-file.txt");
    await fs.writeFile(regularFile, "This can be deleted");

    // Clear target directory
    await fs.rm(targetDir, { recursive: true, force: true });

    // Source file must still exist
    const sourceExists = await fs
      .access(sourceFile)
      .then(() => true)
      .catch(() => false);
    expect(sourceExists).toBe(true);

    // Target directory should be gone
    const targetExists = await fs
      .access(targetDir)
      .then(() => true)
      .catch(() => false);
    expect(targetExists).toBe(false);
  });

  it("should document Node.js symlink behavior", async () => {
    // This test documents how Node.js handles symlinks with fs.rm
    // According to Node.js docs, fs.rm should NOT follow symlinks

    await createSymlinks(["src"], targetDir, sourceDir);
    const symlinkPath = path.join(targetDir, "src");

    // Verify it's a symlink
    const stats = await fs.lstat(symlinkPath);
    expect(stats.isSymbolicLink()).toBe(true);

    // Remove just the symlink using fs.unlink
    await fs.unlink(symlinkPath);

    // Source should still exist
    const sourceExists = await fs
      .access(sourceFile)
      .then(() => true)
      .catch(() => false);
    expect(sourceExists).toBe(true);
  });
});
