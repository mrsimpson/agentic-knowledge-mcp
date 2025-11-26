/**
 * Tests for create command
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("create command", () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(
      join(tmpdir(), "agentic-knowledge-create-test-"),
    );
    const knowledgeDir = join(testDir, ".knowledge");
    configPath = join(knowledgeDir, "config.yaml");

    await fs.mkdir(knowledgeDir, { recursive: true });
    await fs.writeFile(configPath, `version: "1.0"\ndocsets: []\n`);

    // Create test docs directory
    await fs.mkdir(join(testDir, "docs"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("creates local-folder docset", async () => {
    // Import and run CLI function directly
    const { runCli } = await import("../cli.js");

    // Mock process.argv
    const originalArgv = process.argv;
    process.argv = [
      "node",
      "cli.js",
      "create",
      "--preset",
      "local-folder",
      "--id",
      "test-docs",
      "--name",
      "Test Docs",
      "--path",
      "./docs",
    ];

    // Mock process.cwd to return testDir
    const originalCwd = process.cwd;
    process.cwd = () => testDir;

    try {
      runCli();

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const config = await fs.readFile(configPath, "utf-8");
      expect(config).toContain("id: test-docs");
      expect(config).toContain("name: Test Docs");
      expect(config).toContain("sources:");
      expect(config).toContain("type: local_folder");
      expect(config).toContain("./docs");
    } finally {
      process.argv = originalArgv;
      process.cwd = originalCwd;
    }
  });

  it("creates git-repo docset", async () => {
    const { createCommand } = await import("../commands/create.js");

    const originalCwd = process.cwd;
    const originalLog = console.log;
    process.cwd = () => testDir;
    console.log = () => {};

    try {
      await createCommand.parseAsync([
        "node",
        "create",
        "--preset",
        "git-repo",
        "--id",
        "react-docs",
        "--name",
        "React Docs",
        "--url",
        "https://github.com/facebook/react.git",
      ]);

      const config = await fs.readFile(configPath, "utf-8");
      expect(config).toContain("id: react-docs");
      expect(config).toContain("name: React Docs");
      expect(config).toContain("url: https://github.com/facebook/react.git");
      expect(config).toContain("type: git_repo");
    } finally {
      process.cwd = originalCwd;
      console.log = originalLog;
    }
  });

  it("fails with invalid path", async () => {
    const { createCommand } = await import("../commands/create.js");

    const originalCwd = process.cwd;
    const originalLog = console.log;
    const originalError = console.error;
    process.cwd = () => testDir;
    console.log = () => {};
    console.error = () => {};

    try {
      await expect(
        createCommand.parseAsync([
          "node",
          "create",
          "--preset",
          "local-folder",
          "--id",
          "test",
          "--name",
          "Test",
          "--path",
          "./nonexistent",
        ]),
      ).rejects.toThrow();
    } finally {
      process.cwd = originalCwd;
      console.log = originalLog;
      console.error = originalError;
    }
  });

  it("creates config file when missing and creates symlinks for local folder", async () => {
    // Remove the config file to test creation from scratch
    await fs.rm(join(testDir, ".knowledge"), { recursive: true, force: true });

    // Import and run create command directly
    const { createCommand } = await import("../commands/create.js");

    // Mock process.cwd and console.log
    const originalCwd = process.cwd;
    const originalLog = console.log;
    process.cwd = () => testDir;
    console.log = () => {}; // Suppress output

    try {
      await createCommand.parseAsync([
        "node",
        "create",
        "--preset",
        "local-folder",
        "--id",
        "test-docs",
        "--name",
        "Test Docs",
        "--path",
        "./docs",
      ]);

      // Check config was created
      const configExists = await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);

      const config = await fs.readFile(configPath, "utf-8");
      expect(config).toContain("version: '1.0'");
      expect(config).toContain("id: test-docs");
      expect(config).toContain("name: Test Docs");
      expect(config).toContain("type: local_folder");

      // Check symlinks were created
      const symlinkDir = join(testDir, ".knowledge", "docsets", "test-docs");
      const symlinkExists = await fs
        .access(symlinkDir)
        .then(() => true)
        .catch(() => false);
      expect(symlinkExists).toBe(true);
    } finally {
      process.cwd = originalCwd;
      console.log = originalLog;
    }
  });

  it("fails with duplicate ID", async () => {
    const { createCommand } = await import("../commands/create.js");

    const originalCwd = process.cwd;
    const originalLog = console.log;
    process.cwd = () => testDir;
    console.log = () => {};

    try {
      // Create first docset
      await createCommand.parseAsync([
        "node",
        "create",
        "--preset",
        "local-folder",
        "--id",
        "test-docs",
        "--name",
        "Test Docs",
        "--path",
        "./docs",
      ]);

      // Try to create duplicate - should throw
      await expect(
        createCommand.parseAsync([
          "node",
          "create",
          "--preset",
          "local-folder",
          "--id",
          "test-docs",
          "--name",
          "Test Docs 2",
          "--path",
          "./docs",
        ]),
      ).rejects.toThrow();
    } finally {
      process.cwd = originalCwd;
      console.log = originalLog;
    }
  });
});
