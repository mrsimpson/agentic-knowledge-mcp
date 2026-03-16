/**
 * Create command - add new docsets using presets
 */

import { Command } from "commander";
import chalk from "chalk";
import { createDocset } from "../api/create.js";

export const createCommand = new Command("create")
  .description("Create a new docset using presets")
  .requiredOption(
    "--preset <type>",
    "Preset type: git-repo, local-folder, or archive",
  )
  .requiredOption("--id <id>", "Unique docset ID")
  .requiredOption("--name <name>", "Human-readable docset name")
  .option("--description <desc>", "Docset description")
  .option(
    "--url <url>",
    "Git repository URL (git-repo) or archive file URL (archive preset)",
  )
  .option(
    "--path <path>",
    "Local folder path (local-folder) or local archive file path (archive preset)",
  )
  .option("--branch <branch>", "Git branch (default: main)", "main")
  .action(async (options) => {
    try {
      console.log(chalk.blue("🚀 Creating new docset..."));

      const { docset, configPath, configCreated } = await createDocset(
        {
          preset: options.preset,
          id: options.id,
          name: options.name,
          description: options.description,
          url: options.url,
          path: options.path,
          branch: options.branch,
        },
        { cwd: process.cwd() },
      );

      if (configCreated) {
        console.log(chalk.gray("📁 Created .knowledge directory"));
      }

      console.log(chalk.green(`✅ Created docset '${docset.id}' successfully`));
      console.log(chalk.gray(`   Config saved to: ${configPath}`));
      console.log(
        chalk.yellow(
          `\n💡 Next step: Initialize the docset with 'npx @codemcp/knowledge init ${options.id}'`,
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
