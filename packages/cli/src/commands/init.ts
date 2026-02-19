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
  discoverDirectoryPatterns,
  safelyClearDirectory,
  getDirectoryInfo,
} from "@codemcp/knowledge-core";
import {
  GitRepoLoader,
  ArchiveLoader,
  WebSourceType,
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

        if (!docset.sources || docset.sources.length === 0) {
          throw new Error(`Docset '${docsetId}' has no sources configured`);
        }

        console.log(chalk.green(`✅ Found docset: ${docset.name}`));
        console.log(chalk.gray(`📝 Description: ${docset.description}`));
        console.log(chalk.gray(`🔗 Sources: ${docset.sources.length}`));

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

        // Clear directory for force re-initialization
        if (existsAlready && options.force) {
          // Get info about what we're clearing (for logging)
          const dirInfo = await getDirectoryInfo(localPath);

          console.log(chalk.yellow("🗑️  Clearing existing directory..."));
          console.log(
            chalk.gray(
              `    Removing: ${dirInfo.files} files, ${dirInfo.directories} dirs, ${dirInfo.symlinks} symlinks`,
            ),
          );

          if (dirInfo.symlinks > 0) {
            console.log(
              chalk.gray(
                "    ⚠️  Note: Symlinks will be removed, but source files are preserved",
              ),
            );
          }

          // Safely clear directory (preserves source files for symlinked folders)
          await safelyClearDirectory(localPath);
        }

        // Create target directory
        await fs.mkdir(localPath, { recursive: true });

        let totalFiles = 0;
        const allDiscoveredPaths: string[] = [];

        // Process each source
        for (const [index, source] of docset.sources.entries()) {
          console.log(
            chalk.yellow(
              `\n🔄 Loading source ${index + 1}/${docset.sources.length}: ${source.type === "git_repo" ? source.url : source.paths?.join(", ")}`,
            ),
          );

          if (source.type === "git_repo") {
            // Use GitRepoLoader for all Git operations (REQ-19)
            const loader = new GitRepoLoader();

            console.log(
              chalk.gray(`  Using GitRepoLoader for smart content filtering`),
            );

            const webSourceConfig = {
              url: source.url,
              type: WebSourceType.GIT_REPO,
              options: {
                branch: source.branch || "main",
                paths: source.paths || [],
              },
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
              source_url: source.url,
              source_type: source.type,
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
          } else if (source.type === "local_folder") {
            // Handle local folder initialization
            console.log(chalk.gray(`  Creating symlinks for local folder`));

            if (!source.paths || source.paths.length === 0) {
              throw new Error(`Local folder source has no paths configured`);
            }

            // Import symlink utilities
            const { createSymlinks } = await import("@codemcp/knowledge-core");

            // Note: directory is already cleared above if --force is used,
            // so no need to call removeSymlinks here

            const configDir = path.dirname(configPath);
            const projectRoot = path.dirname(configDir);

            // Verify source paths exist
            const validatedPaths: string[] = [];
            for (const sourcePath of source.paths) {
              const absolutePath = path.isAbsolute(sourcePath)
                ? sourcePath
                : path.resolve(projectRoot, sourcePath);

              try {
                const stat = await fs.stat(absolutePath);
                if (!stat.isDirectory()) {
                  throw new Error(`Path is not a directory: ${sourcePath}`);
                }
                validatedPaths.push(sourcePath);
              } catch {
                throw new Error(
                  `Local folder path does not exist: ${sourcePath}`,
                );
              }
            }

            // Create symlinks
            await createSymlinks(validatedPaths, localPath, projectRoot);

            console.log(
              chalk.green(`    ✅ Created ${validatedPaths.length} symlink(s)`),
            );

            // Count files in symlinked directories for metadata
            let fileCount = 0;
            const files: string[] = [];

            async function countFilesRecursive(dir: string): Promise<void> {
              const entries = await fs.readdir(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                  await countFilesRecursive(fullPath);
                } else if (entry.isFile()) {
                  fileCount++;
                  files.push(path.relative(localPath, fullPath));
                }
              }
            }

            await countFilesRecursive(localPath);
            totalFiles += fileCount;

            // Create source metadata
            const metadata = {
              source_paths: validatedPaths,
              source_type: source.type,
              initialized_at: new Date().toISOString(),
              files_count: fileCount,
              files: files,
              docset_id: docsetId,
            };

            await fs.writeFile(
              path.join(localPath, `.agentic-source-${index}.json`),
              JSON.stringify(metadata, null, 2),
            );
          } else if (source.type === "archive") {
            // Handle archive file initialization (zip, tar.gz, etc.)
            const loader = new ArchiveLoader();
            const sourceUrl = source.url || source.path || "";

            console.log(
              chalk.gray(`  Using ArchiveLoader for archive extraction`),
            );

            const webSourceConfig = {
              url: sourceUrl,
              type: WebSourceType.ARCHIVE,
              options: {
                paths: source.paths || [],
              },
            };

            // Validate configuration
            const validation = loader.validateConfig(webSourceConfig);
            if (validation !== true) {
              throw new Error(
                `Invalid archive source configuration: ${validation}`,
              );
            }

            // Load content using ArchiveLoader
            const result = await loader.load(webSourceConfig, localPath);

            if (!result.success) {
              throw new Error(`Archive loading failed: ${result.error}`);
            }

            // Collect discovered paths for config update
            allDiscoveredPaths.push(...result.files);

            totalFiles += result.files.length;
            console.log(
              chalk.green(
                `    ✅ Extracted ${result.files.length} files from archive`,
              ),
            );

            // Create source metadata
            const metadata = {
              source_url: sourceUrl,
              source_type: source.type,
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
                `    ❌ Source type '${(source as any).type}' not yet supported`,
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
          sources_count: docset.sources.length,
        };

        await fs.writeFile(
          path.join(localPath, ".agentic-metadata.json"),
          JSON.stringify(overallMetadata, null, 2),
        );

        // Update configuration with discovered paths (only if --discover-paths flag used)
        if (allDiscoveredPaths.length > 0 && options.discoverPaths) {
          console.log(
            chalk.yellow(
              `\n📝 Discovering directory patterns from extracted files...`,
            ),
          );

          // Convert file list to directory patterns
          const directoryPatterns =
            discoverDirectoryPatterns(allDiscoveredPaths);

          console.log(
            chalk.gray(
              `    Found ${allDiscoveredPaths.length} files → ${directoryPatterns.length} patterns`,
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
        console.log(chalk.gray(`📁 Location: ${localPath}`));
        console.log(chalk.gray(`📄 Total files: ${totalFiles}`));
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
