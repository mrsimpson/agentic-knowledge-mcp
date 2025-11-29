/**
 * Create command - add new docsets using presets
 */

import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ConfigManager } from "@codemcp/knowledge-core";
import type { DocsetConfig } from "@codemcp/knowledge-core";

export const createCommand = new Command("create")
  .description("Create a new docset using presets")
  .requiredOption("--preset <type>", "Preset type: git-repo or local-folder")
  .requiredOption("--id <id>", "Unique docset ID")
  .requiredOption("--name <name>", "Human-readable docset name")
  .option("--description <desc>", "Docset description")
  .option("--url <url>", "Git repository URL (required for git-repo preset)")
  .option(
    "--path <path>",
    "Local folder path (required for local-folder preset)",
  )
  .option("--branch <branch>", "Git branch (default: main)", "main")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🚀 Creating new docset..."));

      const configManager = new ConfigManager();

      // Check if config exists, create if not
      let config, configPath;
      const configExists = await configManager.configExists(process.cwd());

      if (!configExists) {
        // Create initial config structure
        configPath = path.join(process.cwd(), ".knowledge", "config.yaml");
        config = {
          version: "1.0",
          docsets: [],
        };

        // Ensure .knowledge directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        console.log(chalk.gray("📁 Created .knowledge directory"));
      } else {
        ({ config, configPath } = await configManager.loadConfig(
          process.cwd(),
        ));
      }

      // Check if docset ID already exists
      if (config.docsets.find((d) => d.id === options.id)) {
        throw new Error(`Docset with ID '${options.id}' already exists`);
      }

      let newDocset: DocsetConfig;

      if (options.preset === "git-repo") {
        newDocset = await createGitRepoDocset(options);
      } else if (options.preset === "local-folder") {
        newDocset = await createLocalFolderDocset(options);
      } else {
        throw new Error(
          `Unknown preset: ${options.preset}. Use 'git-repo' or 'local-folder'`,
        );
      }

      // Add to config
      config.docsets.push(newDocset);
      await configManager.saveConfig(config, configPath);

      console.log(
        chalk.green(`✅ Created docset '${options.id}' successfully`),
      );
      console.log(chalk.gray(`   Config saved to: ${configPath}`));
      console.log(
        chalk.yellow(
          `\n💡 Next step: Initialize the docset with 'agentic-knowledge init ${options.id}'`,
        ),
      );
    } catch (error) {
      console.error(
        chalk.red("❌ Error creating docset:"),
        (error as Error).message,
      );
      process.exit(1);
    }
  });

async function createGitRepoDocset(options: any): Promise<DocsetConfig> {
  if (!options.url) {
    throw new Error("--url is required for git-repo preset");
  }

  // Basic URL validation
  if (!options.url.match(/^https?:\/\/.*\.git$|^git@.*\.git$/)) {
    throw new Error("Invalid git URL format. Expected .git URL");
  }

  return {
    id: options.id,
    name: options.name,
    description: options.description || `Git repository: ${options.url}`,
    sources: [
      {
        url: options.url,
        type: "git_repo",
        branch: options.branch,
        paths: options.paths ? options.paths.split(",") : undefined,
      },
    ],
  };
}

async function createLocalFolderDocset(options: any): Promise<DocsetConfig> {
  if (!options.path) {
    throw new Error("--path is required for local-folder preset");
  }

  // Validate path exists
  const fullPath = path.resolve(options.path);
  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${options.path}`);
    }
  } catch {
    throw new Error(`Path does not exist: ${options.path}`);
  }

  return {
    id: options.id,
    name: options.name,
    description: options.description || `Local documentation: ${options.path}`,
    sources: [
      {
        type: "local_folder",
        paths: [options.path],
      },
    ],
  };
}
