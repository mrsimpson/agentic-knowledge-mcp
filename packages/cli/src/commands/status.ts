/**
 * Status command - show status of web sources
 */

import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  findConfigPathSync,
  loadConfigSync,
  calculateLocalPath,
} from "@codemcp/knowledge-core";

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
  last_commit?: string;
}

interface DocsetStatus {
  docset: any;
  initialized: boolean;
  metadata: DocsetMetadata | null;
  sources: SourceMetadata[];
  error?: string;
}

export const statusCommand = new Command("status")
  .description("Show status of web sources for docsets")
  .option("-c, --config <path>", "Path to configuration file")
  .option("-v, --verbose", "Show detailed status information", false)
  .action(async (options: { config?: string; verbose: boolean }) => {
    try {
      console.log(chalk.blue("📊 Agentic Knowledge Status\n"));

      // Find and load configuration
      const configPath = options.config || findConfigPathSync(process.cwd());
      if (!configPath) {
        throw new Error(
          "No configuration file found. Run this command from a directory with .knowledge/config.yaml",
        );
      }

      console.log(chalk.gray(`📄 Config: ${configPath}`));
      const config = loadConfigSync(configPath);

      // Find docsets with web sources
      const webDocsets = config.docsets.filter(
        (d) => d.sources && d.sources.length > 0,
      );

      if (webDocsets.length === 0) {
        console.log(chalk.yellow("\n⚠️  No docsets with web sources found."));

        // Show all docsets for reference
        if (config.docsets.length > 0) {
          console.log(chalk.gray("\nAvailable docsets (local only):"));
          for (const docset of config.docsets) {
            console.log(chalk.gray(`  • ${docset.id} - ${docset.name}`));
          }
        }
        return;
      }

      console.log(
        chalk.green(
          `\n✅ Found ${webDocsets.length} docset(s) with web sources\n`,
        ),
      );

      // Get status for each docset
      const statuses: DocsetStatus[] = [];
      for (const docset of webDocsets) {
        const status = await getDocsetStatus(docset, configPath);
        statuses.push(status);
      }

      // Display summary
      displaySummary(statuses);

      // Display detailed status if verbose
      if (options.verbose) {
        console.log(chalk.blue("\n📋 Detailed Status\n"));
        for (const status of statuses) {
          displayDetailedStatus(status);
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Failed to get status"));
      console.error(
        chalk.red(error instanceof Error ? error.message : String(error)),
      );
      process.exit(1);
    }
  });

async function getDocsetStatus(
  docset: any,
  configPath: string,
): Promise<DocsetStatus> {
  try {
    const localPath = calculateLocalPath(docset, configPath);
    const metadataPath = path.join(localPath, ".agentic-metadata.json");

    // Check if docset is initialized
    let metadata: DocsetMetadata | null = null;
    try {
      const metadataContent = await fs.readFile(metadataPath, "utf8");
      metadata = JSON.parse(metadataContent);
    } catch {
      return {
        docset,
        initialized: false,
        metadata: null,
        sources: [],
      };
    }

    // Load source metadata
    const sources: SourceMetadata[] = [];
    for (let i = 0; i < (docset.sources?.length || 0); i++) {
      try {
        const sourceMetadataPath = path.join(
          localPath,
          `.agentic-source-${i}.json`,
        );
        const sourceContent = await fs.readFile(sourceMetadataPath, "utf8");
        const sourceMetadata = JSON.parse(sourceContent);
        sources.push(sourceMetadata);
      } catch {
        // Source metadata missing - this might indicate an issue
      }
    }

    return {
      docset,
      initialized: true,
      metadata,
      sources,
    };
  } catch (error) {
    return {
      docset,
      initialized: false,
      metadata: null,
      sources: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function displaySummary(statuses: DocsetStatus[]) {
  console.log(chalk.blue("📈 Summary"));
  console.log("─".repeat(50));

  for (const status of statuses) {
    const { docset, initialized, metadata, sources, error } = status;

    if (error) {
      console.log(
        `${chalk.red("❌")} ${chalk.bold(docset.id)} - ${chalk.red("Error: " + error)}`,
      );
      continue;
    }

    if (!initialized) {
      console.log(
        `${chalk.yellow("⚠️")} ${chalk.bold(docset.id)} - ${chalk.yellow("Not initialized")}`,
      );
      console.log(
        chalk.gray(`   ${docset.sources?.length || 0} source(s) configured`),
      );
      continue;
    }

    if (!metadata) {
      console.log(
        `${chalk.red("❌")} ${chalk.bold(docset.id)} - ${chalk.red("Metadata corrupted")}`,
      );
      continue;
    }

    // Calculate status
    const lastActivity = metadata.last_refreshed || metadata.initialized_at;
    const lastActivityTime = new Date(lastActivity);
    const timeSince = Date.now() - lastActivityTime.getTime();
    const hoursSince = timeSince / (1000 * 60 * 60);
    const daysSince = timeSince / (1000 * 60 * 60 * 24);

    let timeDisplay;
    let statusIcon;

    if (hoursSince < 1) {
      timeDisplay = `${Math.round(hoursSince * 60)} minutes ago`;
      statusIcon = chalk.green("✅");
    } else if (hoursSince < 24) {
      timeDisplay = `${Math.round(hoursSince)} hours ago`;
      statusIcon = chalk.green("✅");
    } else if (daysSince < 7) {
      timeDisplay = `${Math.round(daysSince)} days ago`;
      statusIcon = chalk.yellow("⚠️");
    } else {
      timeDisplay = `${Math.round(daysSince)} days ago`;
      statusIcon = chalk.red("🔄");
    }

    console.log(
      `${statusIcon} ${chalk.bold(docset.id)} - ${chalk.gray(metadata.total_files)} files`,
    );
    console.log(
      chalk.gray(
        `   Last updated: ${timeDisplay} | ${sources.length}/${metadata.sources_count} sources loaded`,
      ),
    );
  }
}

function displayDetailedStatus(status: DocsetStatus) {
  const { docset, initialized, metadata, sources, error } = status;

  console.log(chalk.bold(`🔸 ${docset.id} (${docset.name})`));
  console.log("─".repeat(40));

  if (error) {
    console.log(chalk.red(`❌ Error: ${error}`));
    console.log();
    return;
  }

  if (!initialized) {
    console.log(chalk.yellow("⚠️  Status: Not initialized"));
    console.log(
      chalk.gray(`📝 Description: ${docset.description || "No description"}`),
    );
    console.log(
      chalk.gray(`🔗 Sources configured: ${docset.sources?.length || 0}`),
    );

    if (docset.sources && docset.sources.length > 0) {
      console.log(chalk.gray("   Sources:"));
      for (const [i, source] of docset.sources.entries()) {
        console.log(
          chalk.gray(
            `     ${i + 1}. ${source.type === "git_repo" ? source.url : source.paths?.join(", ")} (${source.type})`,
          ),
        );
      }
      console.log(
        chalk.blue(
          "\n   💡 Run 'agentic-knowledge init " +
            docset.id +
            "' to initialize",
        ),
      );
    }
    console.log();
    return;
  }

  if (!metadata) {
    console.log(chalk.red("❌ Status: Metadata corrupted"));
    console.log();
    return;
  }

  // Display basic info
  console.log(chalk.green("✅ Status: Initialized"));
  console.log(
    chalk.gray(`📝 Description: ${docset.description || "No description"}`),
  );
  console.log(chalk.gray(`📄 Total files: ${metadata.total_files}`));
  console.log(chalk.gray(`🔗 Sources: ${metadata.sources_count}`));

  // Display timing info
  const initTime = new Date(metadata.initialized_at);
  const lastRefresh = metadata.last_refreshed
    ? new Date(metadata.last_refreshed)
    : null;

  console.log(chalk.gray(`📅 Initialized: ${initTime.toLocaleString()}`));
  if (lastRefresh) {
    console.log(
      chalk.gray(`🔄 Last refreshed: ${lastRefresh.toLocaleString()}`),
    );
  }

  // Display source details
  if (sources.length > 0) {
    console.log(chalk.gray("\n🔗 Sources:"));
    for (const [i, source] of sources.entries()) {
      const downloadTime = new Date(source.downloaded_at);
      console.log(
        chalk.gray(
          `   ${i + 1}. ${source.source_url} (${source.files_count} files, ${downloadTime.toLocaleString()})`,
        ),
      );
      if (source.last_commit) {
        console.log(
          chalk.gray(
            `      Last commit: ${source.last_commit.substring(0, 8)}`,
          ),
        );
      }
    }
  }

  // Display missing sources
  const missingSources = (docset.sources?.length || 0) - sources.length;
  if (missingSources > 0) {
    console.log(
      chalk.yellow(
        `⚠️  ${missingSources} source(s) missing metadata - run refresh`,
      ),
    );
  }

  console.log();
}
