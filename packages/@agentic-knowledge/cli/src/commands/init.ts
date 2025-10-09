/**
 * Simple working demo of Git repository loading
 */

import { Command } from "commander";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";

export const initCommand = new Command("init")
  .description("Initialize web sources for a docset (demo)")
  .argument("<git-url>", "Git repository URL to clone")
  .argument("[target-dir]", "Target directory", "./demo-docs")
  .action(async (gitUrl: string, targetDir: string) => {
    console.log(chalk.blue("🚀 Agentic Knowledge Git Loader Demo"));
    console.log(chalk.gray(`Git URL: ${gitUrl}`));
    console.log(chalk.gray(`Target: ${targetDir}`));

    try {
      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // Clone repository
      console.log(chalk.yellow("\n📥 Cloning repository..."));
      const tempDir = `${targetDir}/.tmp-${Date.now()}`;

      execSync(`git clone --depth 1 ${gitUrl} ${tempDir}`, {
        stdio: "pipe",
        timeout: 60000,
      });

      // Copy markdown files
      console.log(chalk.yellow("📄 Copying markdown files..."));
      const files = await findMarkdownFiles(tempDir);
      let copiedCount = 0;

      for (const file of files) {
        const relativePath = path.relative(tempDir, file);
        const targetPath = path.join(targetDir, relativePath);

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(file, targetPath);
        copiedCount++;
      }

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });

      // Create metadata
      const metadata = {
        source_url: gitUrl,
        downloaded_at: new Date().toISOString(),
        files_count: copiedCount,
        files: files.map((f) => path.relative(tempDir, f)),
      };

      await fs.writeFile(
        path.join(targetDir, ".agentic-metadata.json"),
        JSON.stringify(metadata, null, 2),
      );

      console.log(chalk.green(`\n✅ Success!`));
      console.log(
        chalk.gray(`Downloaded ${copiedCount} markdown files to ${targetDir}`),
      );
      console.log(
        chalk.gray(`Metadata saved to ${targetDir}/.agentic-metadata.json`),
      );
    } catch (error) {
      console.error(chalk.red("\n❌ Failed to load content"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  });

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentDir: string) {
    const items = await fs.readdir(currentDir);

    for (const item of items) {
      if (item.startsWith(".git")) continue;

      const fullPath = path.join(currentDir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        await scan(fullPath);
      } else if (item.endsWith(".md") || item.endsWith(".mdx")) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}
