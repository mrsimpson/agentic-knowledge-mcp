/**
 * Initialize command - set up web sources for a docset using GitRepoLoader
 */

import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  ConfigManager,
  calculateLocalPath,
  ensureKnowledgeGitignoreSync,
} from "@codemcp/knowledge-core";
import {
  GitRepoLoader,
  WebSourceType,
} from "@codemcp/knowledge-content-loader";

export const initCommand = new Command("init")
  .description("Initialize web sources for a docset from configuration")
  .argument("<docset-id>", "ID of the docset to initialize")
  .option("-c, --config <path>", "Path to configuration file")
  .option("--force", "Force re-initialization even if already exists", false)
  .action(
    async (docsetId: string, options: { config?: string; force: boolean }) => {
      console.log(chalk.blue("🚀 Agentic Knowledge Integration Test"));

      try {
        // Use ConfigManager for all config operations
        const configManager = new ConfigManager();
        const { config, configPath } = await configManager.loadConfig(
          process.cwd(),
        );

        // Ensure .knowledge/.gitignore exists and contains docsets/ ignore rule
        ensureKnowledgeGitignoreSync(configPath);

        const docset = config.docsets.find((d) => d.id === docsetId);

        if (!docset) {
          throw new Error(
            `Docset '${docsetId}' not found in configuration. Available: ${config.docsets.map((d) => d.id).join(", ")}`,
          );
        }

        if (!docset.web_sources || docset.web_sources.length === 0) {
          throw new Error(`Docset '${docsetId}' has no web sources configured`);
        }

        console.log(chalk.green(`✅ Found docset: ${docset.name}`));
        console.log(chalk.gray(`📝 Description: ${docset.description}`));
        console.log(chalk.gray(`🔗 Web sources: ${docset.web_sources.length}`));

        // Calculate the local path for this docset
        const localPath = calculateLocalPath(docset, configPath);

        console.log(chalk.yellow(`\n📁 Target directory: ${localPath}`));

        // Check if already exists
        let existsAlready = false;
        try {
          const stat = await fs.stat(localPath);
          if (stat.isDirectory()) {
            existsAlready = true;
          }
        } catch {
          // Directory doesn't exist, which is fine
        }

        if (existsAlready && !options.force) {
          console.log(
            chalk.yellow(
              "⚠️  Directory already exists. Use --force to overwrite.",
            ),
          );
          const files = await fs.readdir(localPath);
          console.log(
            chalk.gray(
              `Existing files: ${files.slice(0, 5).join(", ")}${files.length > 5 ? "..." : ""}`,
            ),
          );
          return;
        }

        // Create target directory
        await fs.mkdir(localPath, { recursive: true });

        let totalFiles = 0;
        const allDiscoveredPaths: string[] = [];

        // Process each web source
        for (const [index, webSource] of docset.web_sources.entries()) {
          console.log(
            chalk.yellow(
              `\n🔄 Loading source ${index + 1}/${docset.web_sources.length}: ${webSource.url}`,
            ),
          );

          if (webSource.type === "git_repo") {
            // Use GitRepoLoader for all Git operations (REQ-19)
            const loader = new GitRepoLoader();

            console.log(
              chalk.gray(`  Using GitRepoLoader for smart content filtering`),
            );

            const webSourceConfig = {
              url: webSource.url,
              type: WebSourceType.GIT_REPO,
              options: webSource.options || {},
            };

            // Validate configuration
            const validation = loader.validateConfig(webSourceConfig);
            if (validation !== true) {
              throw new Error(
                `Invalid Git repository configuration: ${validation}`,
              );
            }

            // Load content using GitRepoLoader
            const result = await loader.load(webSourceConfig, localPath);

            if (!result.success) {
              throw new Error(`Git repository loading failed: ${result.error}`);
            }

            // Collect discovered paths for config update
            allDiscoveredPaths.push(...result.files);

            totalFiles += result.files.length;
            console.log(
              chalk.green(
                `    ✅ Copied ${result.files.length} files using smart filtering`,
              ),
            );

            // Create source metadata
            const metadata = {
              source_url: webSource.url,
              source_type: webSource.type,
              downloaded_at: new Date().toISOString(),
              files_count: result.files.length,
              files: result.files,
              docset_id: docsetId,
              content_hash: result.contentHash,
            };

            await fs.writeFile(
              path.join(localPath, `.agentic-source-${index}.json`),
              JSON.stringify(metadata, null, 2),
            );
          } else {
            console.log(
              chalk.red(
                `    ❌ Web source type '${webSource.type}' not yet supported`,
              ),
            );
          }
        }

        // Create overall metadata
        const overallMetadata = {
          docset_id: docsetId,
          docset_name: docset.name,
          initialized_at: new Date().toISOString(),
          total_files: totalFiles,
          web_sources_count: docset.web_sources.length,
        };

        await fs.writeFile(
          path.join(localPath, ".agentic-metadata.json"),
          JSON.stringify(overallMetadata, null, 2),
        );

        // Update configuration with discovered paths (only if paths were discovered and force flag used)
        if (allDiscoveredPaths.length > 0 && options.force) {
          console.log(
            chalk.yellow(
              `\n📝 Updating configuration with discovered paths...`,
            ),
          );
          try {
            await configManager.updateDocsetPaths(docsetId, allDiscoveredPaths);
            console.log(
              chalk.green(
                `    ✅ Updated config with ${allDiscoveredPaths.length} discovered paths`,
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
        console.log(chalk.gray(`📁 Location: ${localPath}`));
        console.log(chalk.gray(`📄 Total files: ${totalFiles}`));
        console.log(
          chalk.gray(`🔗 Sources processed: ${docset.web_sources.length}`),
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
