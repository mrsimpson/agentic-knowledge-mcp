/**
 * Initialize command - set up web sources for a docset (integration test)
 */

import { Command } from "commander";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  findConfigPathSync,
  loadConfigSync,
  calculateLocalPath,
  ensureKnowledgeGitignoreSync,
} from "@codemcp/knowledge-core";

export const initCommand = new Command("init")
  .description("Initialize web sources for a docset from configuration")
  .argument("<docset-id>", "ID of the docset to initialize")
  .option("-c, --config <path>", "Path to configuration file")
  .option("--force", "Force re-initialization even if already exists", false)
  .action(
    async (docsetId: string, options: { config?: string; force: boolean }) => {
      console.log(chalk.blue("🚀 Agentic Knowledge Integration Test"));

      try {
        // Find and load configuration
        const configPath = options.config || findConfigPathSync(process.cwd());
        if (!configPath) {
          throw new Error(
            "No configuration file found. Run this command from a directory with .knowledge/config.yaml",
          );
        }

        console.log(chalk.gray(`📄 Loading config: ${configPath}`));
        const config = loadConfigSync(configPath);

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

        // Process each web source
        for (const [index, webSource] of docset.web_sources.entries()) {
          console.log(
            chalk.yellow(
              `\n🔄 Loading source ${index + 1}/${docset.web_sources.length}: ${webSource.url}`,
            ),
          );

          if (webSource.type === "git_repo") {
            // Create temp directory for cloning
            const tempDir = path.join(localPath, ".tmp", `git-${Date.now()}`);
            await fs.mkdir(tempDir, { recursive: true });

            try {
              // Clone repository
              const options = webSource.options || {};
              const branch = (options as any).branch || "main";
              const paths = (options as any).paths || [];

              console.log(
                chalk.gray(`  Git clone --depth 1 --branch ${branch}`),
              );
              execSync(
                `git clone --depth 1 --branch ${branch} ${webSource.url} ${tempDir}`,
                {
                  stdio: "pipe",
                  timeout: 60000,
                },
              );

              // Copy specified paths or all markdown files
              const filesToCopy: string[] = [];

              if (paths.length > 0) {
                // Copy specified paths
                for (const relPath of paths) {
                  const sourcePath = path.join(tempDir, relPath);
                  const targetPath = path.join(localPath, relPath);

                  try {
                    const stat = await fs.stat(sourcePath);
                    if (stat.isDirectory()) {
                      const dirFiles = await copyDirectory(
                        sourcePath,
                        targetPath,
                      );
                      filesToCopy.push(...dirFiles);
                    } else {
                      await fs.mkdir(path.dirname(targetPath), {
                        recursive: true,
                      });
                      await fs.copyFile(sourcePath, targetPath);
                      filesToCopy.push(relPath);
                    }
                  } catch (error) {
                    console.log(
                      chalk.red(
                        `    ⚠️  Skipping ${relPath}: ${error instanceof Error ? error.message : String(error)}`,
                      ),
                    );
                  }
                }
              } else {
                // Copy all markdown files
                const allFiles = await findMarkdownFiles(tempDir);
                for (const file of allFiles) {
                  const relativePath = path.relative(tempDir, file);
                  const targetPath = path.join(localPath, relativePath);

                  await fs.mkdir(path.dirname(targetPath), { recursive: true });
                  await fs.copyFile(file, targetPath);
                  filesToCopy.push(relativePath);
                }
              }

              totalFiles += filesToCopy.length;
              console.log(
                chalk.green(`    ✅ Copied ${filesToCopy.length} files`),
              );

              // Create source metadata
              const metadata = {
                source_url: webSource.url,
                source_type: webSource.type,
                downloaded_at: new Date().toISOString(),
                files_count: filesToCopy.length,
                files: filesToCopy,
                docset_id: docsetId,
              };

              await fs.writeFile(
                path.join(localPath, `.agentic-source-${index}.json`),
                JSON.stringify(metadata, null, 2),
              );
            } finally {
              // Cleanup temp directory
              await fs.rm(tempDir, { recursive: true, force: true });
            }
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

async function copyDirectory(
  source: string,
  target: string,
): Promise<string[]> {
  const files: string[] = [];
  await fs.mkdir(target, { recursive: true });
  const items = await fs.readdir(source);

  for (const item of items) {
    const sourcePath = path.join(source, item);
    const targetPath = path.join(target, item);
    const stat = await fs.stat(sourcePath);

    if (stat.isDirectory()) {
      const subFiles = await copyDirectory(sourcePath, targetPath);
      files.push(...subFiles.map((f) => path.join(item, f)));
    } else {
      await fs.copyFile(sourcePath, targetPath);
      files.push(item);
    }
  }

  return files;
}
