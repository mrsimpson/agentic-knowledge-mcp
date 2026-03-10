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
    testDir = path.join(tmpdir(), `agentic-safety-test-${Date.now()}`);
    sourceDir = path.join(testDir, "source");
    targetDir = path.join(testDir, "target");

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(targetDir, { recursive: true });

    const actualSourceFolder = path.join(sourceDir, "src");
    await fs.mkdir(actualSourceFolder, { recursive: true });
    sourceFile = path.join(actualSourceFolder, "important-file.js");
    await fs.writeFile(sourceFile, "CRITICAL DATA - DO NOT DELETE");
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("CRITICAL: should NOT delete source files when removing symlinks", async () => {
    await createSymlinks(["src"], targetDir, sourceDir);

    const symlinkPath = path.join(targetDir, "important-file.js");
    expect((await fs.lstat(symlinkPath)).isSymbolicLink()).toBe(true);
    expect(await fs.readFile(symlinkPath, "utf-8")).toBe(
      "CRITICAL DATA - DO NOT DELETE",
    );

    await removeSymlinks(targetDir);

    // CRITICAL: removing the symlink must never touch the source
    const stillExists = await fs
      .access(sourceFile)
      .then(() => true)
      .catch(() => false);
    expect(stillExists).toBe(true);
    expect(await fs.readFile(sourceFile, "utf-8")).toBe(
      "CRITICAL DATA - DO NOT DELETE",
    );

    const symlinkGone = await fs
      .lstat(symlinkPath)
      .then(() => false)
      .catch(() => true);
    expect(symlinkGone).toBe(true);
  });

  it("CRITICAL: should NOT delete source files when clearing target directory", async () => {
    await createSymlinks(["src"], targetDir, sourceDir);

    // Simulate --force: delete the whole docset directory
    await fs.rm(targetDir, { recursive: true, force: true });

    // CRITICAL: fs.rm must not follow symlinks into the source
    const stillExists = await fs
      .access(sourceFile)
      .then(() => true)
      .catch(() => false);
    expect(stillExists).toBe(
      true,
      "CRITICAL FAILURE: Source file was deleted!",
    );

    if (stillExists) {
      expect(await fs.readFile(sourceFile, "utf-8")).toBe(
        "CRITICAL DATA - DO NOT DELETE",
      );
    }
  });

  it("CRITICAL: should handle nested symlinks safely", async () => {
    const nestedDir = path.join(sourceDir, "src", "nested");
    await fs.mkdir(nestedDir, { recursive: true });
    const nestedFile = path.join(nestedDir, "nested-file.js");
    await fs.writeFile(nestedFile, "NESTED CRITICAL DATA");

    await createSymlinks(["src"], targetDir, sourceDir);
    await fs.rm(targetDir, { recursive: true, force: true });

    // CRITICAL: All source files must survive target removal
    expect(
      await fs
        .access(sourceFile)
        .then(() => true)
        .catch(() => false),
    ).toBe(true, "Source file was deleted!");
    expect(
      await fs
        .access(nestedFile)
        .then(() => true)
        .catch(() => false),
    ).toBe(true, "Nested source file was deleted!");
  });

  it("should safely handle mixed content (symlinks and regular files)", async () => {
    await createSymlinks(["src"], targetDir, sourceDir);

    const regularFile = path.join(targetDir, "regular-file.txt");
    await fs.writeFile(regularFile, "This can be deleted");

    await fs.rm(targetDir, { recursive: true, force: true });

    expect(
      await fs
        .access(sourceFile)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
    expect(
      await fs
        .access(targetDir)
        .then(() => true)
        .catch(() => false),
    ).toBe(false);
  });

  it("should document Node.js symlink behavior", async () => {
    // fs.rm with recursive:true must NOT follow symlinks — this test pins that contract.
    await createSymlinks(["src"], targetDir, sourceDir);
    const symlinkPath = path.join(targetDir, "important-file.js");

    expect((await fs.lstat(symlinkPath)).isSymbolicLink()).toBe(true);

    await fs.unlink(symlinkPath);

    expect(
      await fs
        .access(sourceFile)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);
  });
});
