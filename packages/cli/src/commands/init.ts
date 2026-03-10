/**
 * Initialize command - set up web sources for a docset using GitRepoLoader
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  ConfigManager,
  ensureKnowledgeGitignoreSync,
  discoverDirectoryPatterns,
} from "@codemcp/knowledge-core";
import {
  initDocset,
  type SourceResult,
} from "@codemcp/knowledge-content-loader";

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
        const configManager = new ConfigManager();
        const { config, configPath } = await configManager.loadConfig(
          process.cwd(),
        );

        ensureKnowledgeGitignoreSync(configPath);

        const docset = config.docsets.find((d) => d.id === docsetId);

        if (!docset) {
          throw new Error(
            `Docset '${docsetId}' not found in configuration. Available: ${config.docsets.map((d) => d.id).join(", ")}`,
          );
        }

        console.log(chalk.green(`✅ Found docset: ${docset.name}`));
        console.log(chalk.gray(`📝 Description: ${docset.description}`));
        console.log(chalk.gray(`🔗 Sources: ${docset.sources.length}`));

        const result = await initDocset(docsetId, docset, configPath, {
          force: options.force,
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

        // Update configuration with discovered paths (only if --discover-paths flag used)
        const allFiles = result.sourceResults.flatMap((r) => r.files);
        if (allFiles.length > 0 && options.discoverPaths) {
          console.log(
            chalk.yellow(
              `\n📝 Discovering directory patterns from extracted files...`,
            ),
          );

          const directoryPatterns = discoverDirectoryPatterns(allFiles);

          console.log(
            chalk.gray(
              `    Found ${allFiles.length} files → ${directoryPatterns.length} patterns`,
            ),
          );

          try {
            await configManager.updateDocsetPaths(docsetId, directoryPatterns);
            console.log(
              chalk.green(
                `    ✅ Updated config with discovered patterns: ${directoryPatterns.slice(0, 5).join(", ")}${directoryPatterns.length > 5 ? "..." : ""}`,
              ),
            );
          } catch (configError) {
            console.log(
              chalk.yellow(
                `    ⚠️  Could not update config: ${configError instanceof Error ? configError.message : String(configError)}`,
              ),
            );
          }
        }

        console.log(
          chalk.green(`\n🎉 Successfully initialized docset '${docsetId}'`),
        );
        console.log(chalk.gray(`📁 Location: ${result.localPath}`));
        console.log(chalk.gray(`📄 Total files: ${result.totalFiles}`));
        console.log(
          chalk.gray(`🔗 Sources processed: ${docset.sources.length}`),
        );
      } catch (error) {
        console.error(chalk.red("\n❌ Error:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    },
  );
