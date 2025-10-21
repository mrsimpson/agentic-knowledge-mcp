/**
 * Tests for create command
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";

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
    const cliPath = join(process.cwd(), "dist/cli.js");
    const cmd = `node ${cliPath} create --preset local-folder --id test-docs --name "Test Docs" --path ./docs`;

    execSync(cmd, { cwd: testDir });

    const config = await fs.readFile(configPath, "utf-8");
    expect(config).toContain("id: test-docs");
    expect(config).toContain("name: Test Docs");
    expect(config).toContain("local_path: ./docs");
  });

  it("creates git-repo docset", async () => {
    const cliPath = join(process.cwd(), "dist/cli.js");
    const cmd = `node ${cliPath} create --preset git-repo --id react-docs --name "React Docs" --url https://github.com/facebook/react.git`;

    execSync(cmd, { cwd: testDir });

    const config = await fs.readFile(configPath, "utf-8");
    expect(config).toContain("id: react-docs");
    expect(config).toContain("name: React Docs");
    expect(config).toContain("url: https://github.com/facebook/react.git");
    expect(config).toContain("type: git_repo");
  });

  it("fails with invalid path", async () => {
    const cliPath = join(process.cwd(), "dist/cli.js");
    const cmd = `node ${cliPath} create --preset local-folder --id test --name "Test" --path ./nonexistent`;

    expect(() => execSync(cmd, { cwd: testDir })).toThrow();
  });

  it("fails with duplicate ID", async () => {
    const cliPath = join(process.cwd(), "dist/cli.js");
    // Create first docset
    const cmd1 = `node ${cliPath} create --preset local-folder --id test-docs --name "Test Docs" --path ./docs`;
    execSync(cmd1, { cwd: testDir });

    // Try to create duplicate
    const cmd2 = `node ${cliPath} create --preset local-folder --id test-docs --name "Test Docs 2" --path ./docs`;
    expect(() => execSync(cmd2, { cwd: testDir })).toThrow();
  });
});
