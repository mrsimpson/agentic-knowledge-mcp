/**
 * Refresh command - update web sources for docsets
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  findConfigPathSync,
  loadConfigSync,
  calculateLocalPath,
  ensureKnowledgeGitignoreSync,
} from "@codemcp/knowledge-core";
import {
  ArchiveLoader,
  WebSourceType,
} from "@codemcp/knowledge-content-loader";

interface DocsetMetadata {
  docset_id: string;
  docset_name: string;
  initialized_at: string;
  last_refreshed?: string;
  total_files: number;
  sources_count: number;
}

interface SourceMetadata {
  source_url: string;
  source_type: string;
  downloaded_at: string;
  files_count: number;
  files: string[];
  docset_id: string;
}

export const refreshCommand = new Command("refresh")
  .description("Refresh sources for docsets")
  .argument(
    "[docset-id]",
    "ID of specific docset to refresh (refresh all if not specified)",
  )
  .option("-c, --config <path>", "Path to configuration file")
  .option("-f, --force", "Force refresh even if content unchanged", false)
  .action(
    async (
      docsetId: string | undefined,
      options: { config?: string; force: boolean },
    ) => {
      console.log(chalk.blue("🔄 Agentic Knowledge Refresh"));

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

        // Ensure .knowledge/.gitignore exists
        ensureKnowledgeGitignoreSync(configPath);

        // Determine which docsets to refresh
        const docsetsToRefresh = docsetId
          ? config.docsets.filter((d) => d.id === docsetId)
          : config.docsets.filter((d) => d.sources && d.sources.length > 0);

        if (docsetsToRefresh.length === 0) {
          if (docsetId) {
            throw new Error(
              `Docset '${docsetId}' not found or has no sources. Available docsets with sources: ${
                config.docsets
                  .filter((d) => d.sources && d.sources.length > 0)
                  .map((d) => d.id)
                  .join(", ") || "none"
              }`,
            );
          } else {
            console.log(chalk.yellow("⚠️  No docsets with web sources found."));
            return;
          }
        }

        console.log(
          chalk.green(
            `✅ Found ${docsetsToRefresh.length} docset(s) to refresh: ${docsetsToRefresh.map((d) => d.id).join(", ")}`,
          ),
        );

        // Refresh each docset
        for (const docset of docsetsToRefresh) {
          await refreshDocset(docset, configPath, options.force);
        }

        console.log(chalk.green("\n🎉 All docsets refreshed successfully!"));
      } catch (error) {
        console.error(chalk.red("\n❌ Error:"));
        console.error(
          chalk.red(error instanceof Error ? error.message : String(error)),
        );
        process.exit(1);
      }
    },
  );

async function refreshDocset(
  docset: any,
  configPath: string,
  force: boolean,
): Promise<void> {
  const spinner = ora(`Refreshing ${docset.id}...`).start();

  try {
    const localPath = calculateLocalPath(docset, configPath);

    spinner.text = `Checking ${docset.id} metadata...`;

    // Check if docset has been initialized
    const metadataPath = path.join(localPath, ".agentic-metadata.json");
    let metadata: DocsetMetadata | null = null;

    try {
      const metadataContent = await fs.readFile(metadataPath, "utf8");
      metadata = JSON.parse(metadataContent);
    } catch {
      spinner.warn(`${docset.id}: Not initialized, use 'init' command first`);
      return;
    }

    // Check if forced or if we should check for updates
    if (!force && metadata) {
      const lastRefresh = metadata.last_refreshed || metadata.initialized_at;
      const lastRefreshTime = new Date(lastRefresh);
      const timeSinceRefresh = Date.now() - lastRefreshTime.getTime();
      const hoursSince = timeSinceRefresh / (1000 * 60 * 60);

      if (hoursSince < 1) {
        spinner.succeed(
          `${docset.id}: Recently refreshed (${Math.round(hoursSince * 60)} minutes ago), skipping`,
        );
        return;
      }
    }

    spinner.text = `Refreshing ${docset.id} web sources...`;

    // Create backup of current metadata
    const backupPath = path.join(localPath, `.agentic-metadata.backup.json`);
    await fs.copyFile(metadataPath, backupPath);

    let totalFiles = 0;
    const refreshedSources: SourceMetadata[] = [];

    // Process each source
    for (const [index, source] of (docset.sources || []).entries()) {
      spinner.text = `${docset.id}: Refreshing source ${index + 1}/${docset.sources.length}...`;

      if (source.type === "git_repo") {
        const sourceFiles = await refreshGitSource(
          source,
          localPath,
          index,
          docset.id,
          force,
        );
        totalFiles += sourceFiles.files_count;
        refreshedSources.push(sourceFiles);
      } else if (source.type === "archive") {
        const sourceFiles = await refreshArchiveSource(
          source,
          localPath,
          index,
          docset.id,
          force,
        );
        totalFiles += sourceFiles.files_count;
        refreshedSources.push(sourceFiles);
      } else {
        console.log(
          chalk.yellow(
            `    ⚠️  Source type '${source.type}' not yet supported, skipping`,
          ),
        );
      }
    }

    // Update metadata
    if (!metadata) {
      throw new Error("Metadata is null - this should not happen");
    }

    const updatedMetadata: DocsetMetadata = {
      docset_id: metadata.docset_id,
      docset_name: metadata.docset_name,
      initialized_at: metadata.initialized_at,
      last_refreshed: new Date().toISOString(),
      total_files: totalFiles,
      sources_count: docset.sources?.length || 0,
    };

    await fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));

    // Remove backup if successful
    await fs.unlink(backupPath);

    spinner.succeed(
      `${docset.id}: Refreshed successfully (${totalFiles} files from ${refreshedSources.length} sources)`,
    );
  } catch (error) {
    spinner.fail(
      `${docset.id}: Failed to refresh - ${error instanceof Error ? error.message : String(error)}`,
    );

    // Try to restore from backup
    const backupPath = path.join(
      calculateLocalPath(docset, configPath),
      `.agentic-metadata.backup.json`,
    );
    try {
      const metadataPath = path.join(
        calculateLocalPath(docset, configPath),
        ".agentic-metadata.json",
      );
      await fs.copyFile(backupPath, metadataPath);
      await fs.unlink(backupPath);
      console.log(chalk.gray(`    Restored metadata from backup`));
    } catch {
      // Backup restore failed, but don't throw
    }

    throw error;
  }
}

async function refreshGitSource(
  webSource: any,
  localPath: string,
  index: number,
  docsetId: string,
  force: boolean,
): Promise<SourceMetadata> {
  // Check existing source metadata
  const sourceMetadataPath = path.join(
    localPath,
    `.agentic-source-${index}.json`,
  );
  let existingSourceMetadata: SourceMetadata | null = null;

  try {
    const content = await fs.readFile(sourceMetadataPath, "utf8");
    existingSourceMetadata = JSON.parse(content);
  } catch {
    // No existing metadata, will do full refresh
  }

  // Create temp directory for cloning
  const tempDir = path.join(localPath, ".tmp", `git-refresh-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Clone repository
    const options = webSource.options || {};
    const branch = (options as any).branch || "main";
    const paths = (options as any).paths || [];

    execSync(
      `git clone --depth 1 --branch ${branch} ${webSource.url} ${tempDir}`,
      {
        stdio: "pipe",
        timeout: 60000,
      },
    );

    // Get latest commit hash for change detection
    const latestCommit = execSync("git rev-parse HEAD", {
      cwd: tempDir,
      encoding: "utf8",
    }).trim();

    // Check if we need to update (compare with last known commit if available)
    if (!force && existingSourceMetadata) {
      const lastCommit = (existingSourceMetadata as any).last_commit;
      if (lastCommit === latestCommit) {
        // No changes, update timestamp only
        const updatedMetadata: SourceMetadata = {
          ...existingSourceMetadata,
          downloaded_at: new Date().toISOString(),
        };

        await fs.writeFile(
          sourceMetadataPath,
          JSON.stringify(updatedMetadata, null, 2),
        );

        return updatedMetadata;
      }
    }

    // Remove old files from this source (if we have metadata)
    if (existingSourceMetadata) {
      for (const file of existingSourceMetadata.files) {
        const filePath = path.join(localPath, file);
        try {
          await fs.unlink(filePath);
        } catch {
          // File might already be deleted, ignore
        }
      }
    }

    // Copy new files
    const filesToCopy: string[] = [];

    if (paths.length > 0) {
      // Copy specified paths
      for (const relPath of paths) {
        const sourcePath = path.join(tempDir, relPath);
        const targetPath = path.join(localPath, relPath);

        try {
          const stat = await fs.stat(sourcePath);
          if (stat.isDirectory()) {
            const dirFiles = await copyDirectory(sourcePath, targetPath);
            filesToCopy.push(...dirFiles);
          } else {
            await fs.mkdir(path.dirname(targetPath), { recursive: true });
            await fs.copyFile(sourcePath, targetPath);
            filesToCopy.push(relPath);
          }
        } catch (error) {
          console.log(
            chalk.yellow(
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

    // Create updated source metadata
    const metadata: SourceMetadata & { last_commit: string } = {
      source_url: webSource.url,
      source_type: webSource.type,
      downloaded_at: new Date().toISOString(),
      files_count: filesToCopy.length,
      files: filesToCopy,
      docset_id: docsetId,
      last_commit: latestCommit,
    };

    await fs.writeFile(sourceMetadataPath, JSON.stringify(metadata, null, 2));

    return metadata;
  } finally {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function refreshArchiveSource(
  source: any,
  localPath: string,
  index: number,
  docsetId: string,
  force: boolean,
): Promise<SourceMetadata> {
  const sourceMetadataPath = path.join(
    localPath,
    `.agentic-source-${index}.json`,
  );
  let existingSourceMetadata: SourceMetadata | null = null;

  try {
    const content = await fs.readFile(sourceMetadataPath, "utf8");
    existingSourceMetadata = JSON.parse(content);
  } catch {
    // No existing metadata, will do full refresh
  }

  const sourceUrl = source.url || source.path || "";
  const loader = new ArchiveLoader();
  const webSourceConfig = {
    url: sourceUrl,
    type: WebSourceType.ARCHIVE,
    options: {
      paths: source.paths || [],
    },
  };

  // Check if content has changed
  if (!force && existingSourceMetadata) {
    try {
      const currentId = await loader.getContentId(webSourceConfig);
      const lastHash = (existingSourceMetadata as any).content_hash;
      if (lastHash === currentId) {
        const updatedMetadata: SourceMetadata = {
          ...existingSourceMetadata,
          downloaded_at: new Date().toISOString(),
        };
        await fs.writeFile(
          sourceMetadataPath,
          JSON.stringify(updatedMetadata, null, 2),
        );
        return updatedMetadata;
      }
    } catch {
      // Could not check, proceed with full refresh
    }
  }

  // Remove old files from this source (if we have metadata)
  if (existingSourceMetadata) {
    for (const file of existingSourceMetadata.files) {
      const filePath = path.join(localPath, file);
      try {
        await fs.unlink(filePath);
      } catch {
        // File might already be deleted, ignore
      }
    }
  }

  // Load content
  const result = await loader.load(webSourceConfig, localPath);

  if (!result.success) {
    throw new Error(`Archive refresh failed: ${result.error}`);
  }

  const metadata: SourceMetadata = {
    source_url: sourceUrl,
    source_type: "archive",
    downloaded_at: new Date().toISOString(),
    files_count: result.files.length,
    files: result.files,
    docset_id: docsetId,
  };

  // Store content hash for future change detection
  const metadataWithHash = {
    ...metadata,
    content_hash: result.contentHash,
  };

  await fs.writeFile(
    sourceMetadataPath,
    JSON.stringify(metadataWithHash, null, 2),
  );

  return metadata;
}

// Reuse utility functions from init.ts
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
