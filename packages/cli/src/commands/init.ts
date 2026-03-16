/**
 * Initialize command - set up web sources for a docset using GitRepoLoader
 */

import { Command } from "commander";
import chalk from "chalk";
import { initDocset } from "../api/init.js";
import type { SourceResult } from "@codemcp/knowledge-content-loader";

export const initCommand = new Command("init")
  .description("Initialize sources for a docset from configuration")
  .argument("<docset-id>", "ID of the docset to initialize")
  .option("-c, --config <path>", "Path to configuration file")
  .option("--force", "Force re-initialization even if already exists", false)
  .option(
    "--discover-paths",
    "Discover and update config with directory patterns from extracted files",
    false,
  )
  .action(
    async (
      docsetId: string,
      options: { config?: string; force: boolean; discoverPaths: boolean },
    ) => {
      console.log(chalk.blue("🚀 Agentic Knowledge Integration Test"));

      try {
        const result = await initDocset({
          docsetId,
          force: options.force,
          discoverPaths: options.discoverPaths,
          cwd: process.cwd(),
          onSourceProgress: (sourceResult: SourceResult) => {
            const icon =
              sourceResult.type === "git_repo"
                ? "Copied"
                : sourceResult.type === "local_folder"
                  ? "Created symlinks:"
                  : "Extracted";
            console.log(
              chalk.green(`    ✅ ${icon} — ${sourceResult.message}`),
            );
          },
        });

        if (result.alreadyInitialized) {
          console.log(
            chalk.yellow(
              "⚠️  Directory already exists and is initialized. Use --force to overwrite.",
            ),
          );
          return;
        }

        if (result.discoveredPaths && result.discoveredPaths.length > 0) {
          const shown = result.discoveredPaths.slice(0, 5);
          const extra = result.discoveredPaths.length > 5 ? "..." : "";
          console.log(
            chalk.green(
              `    ✅ Updated config with discovered patterns: ${shown.join(", ")}${extra}`,
            ),
          );
        }

        console.log(
          chalk.green(`\n🎉 Successfully initialized docset '${docsetId}'`),
        );
        console.log(chalk.gray(`📁 Location: ${result.localPath}`));
        console.log(chalk.gray(`📄 Total files: ${result.totalFiles}`));
      } catch (error) {
        console.error(chalk.red("\n❌ Error:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    },
  );
