/**
 * Status command - show status of web sources
 */

import { Command } from "commander";
import chalk from "chalk";
import { getStatus } from "../api/status.js";
import type { DocsetStatusInfo } from "../api/types.js";

export const statusCommand = new Command("status")
  .description("Show status of web sources for docsets")
  .option("-c, --config <path>", "Path to configuration file")
  .option("-v, --verbose", "Show detailed status information", false)
  .action(async (options: { config?: string; verbose: boolean }) => {
    try {
      console.log(chalk.blue("📊 Agentic Knowledge Status\n"));

      const result = await getStatus({ cwd: process.cwd() });

      console.log(chalk.gray(`📄 Config: ${result.configPath}`));

      if (result.docsets.length === 0) {
        console.log(chalk.yellow("\n⚠️  No docsets configured."));
        return;
      }

      console.log(
        chalk.green(`\n✅ Found ${result.docsets.length} docset(s)\n`),
      );

      displaySummary(result.docsets);

      if (options.verbose) {
        console.log(chalk.blue("\n📋 Detailed Status\n"));
        for (const ds of result.docsets) {
          displayDetailed(ds);
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

function displaySummary(docsets: DocsetStatusInfo[]) {
  console.log(chalk.blue("📈 Summary"));
  console.log("─".repeat(50));

  for (const ds of docsets) {
    if (ds.error) {
      console.log(
        `${chalk.red("❌")} ${chalk.bold(ds.id)} - ${chalk.red("Error: " + ds.error)}`,
      );
      continue;
    }

    if (!ds.initialized) {
      console.log(`${chalk.bold(ds.id)} (${ds.name})`);
      console.log(
        chalk.gray(
          `   Not initialized | ${ds.sources.length} source(s) loaded`,
        ),
      );
      console.log();
      console.log(
        chalk.blue(`   💡 Run: npx @codemcp/knowledge init ${ds.id}`),
      );
      continue;
    }

    const dateDisplay = ds.metadata
      ? new Date(ds.metadata.initializedAt).toISOString().split("T")[0]
      : "unknown";

    console.log(`${chalk.bold(ds.id)} (${ds.name})`);
    console.log(
      chalk.gray(
        `   Initialized | ${ds.metadata?.totalFiles ?? 0} files | ${ds.sources.length}/${ds.metadata?.sourcesCount ?? 0} source(s) loaded`,
      ),
    );
    console.log(chalk.gray(`   Initialized: ${dateDisplay}`));
  }
}

function displayDetailed(ds: DocsetStatusInfo) {
  console.log(chalk.bold(`🔸 ${ds.id} (${ds.name})`));
  console.log("─".repeat(40));

  if (ds.error) {
    console.log(chalk.red(`❌ Error: ${ds.error}`));
    console.log();
    return;
  }

  if (!ds.initialized) {
    console.log(chalk.yellow("⚠️  Status: Not initialized"));
    console.log(
      chalk.gray(`📝 Description: ${ds.description ?? "No description"}`),
    );
    if (ds.sources.length === 0) {
      console.log(
        chalk.blue(
          `\n   💡 Run 'npx @codemcp/knowledge init ${ds.id}' to initialize`,
        ),
      );
    }
    console.log();
    return;
  }

  console.log(chalk.green("✅ Status: Initialized"));
  console.log(
    chalk.gray(`📝 Description: ${ds.description ?? "No description"}`),
  );
  console.log(chalk.gray(`📄 Total files: ${ds.metadata?.totalFiles ?? 0}`));
  console.log(chalk.gray(`🔗 Sources: ${ds.metadata?.sourcesCount ?? 0}`));

  if (ds.metadata) {
    console.log(
      chalk.gray(
        `📅 Initialized: ${new Date(ds.metadata.initializedAt).toLocaleString()}`,
      ),
    );
    if (ds.metadata.lastRefreshed) {
      console.log(
        chalk.gray(
          `🔄 Last refreshed: ${new Date(ds.metadata.lastRefreshed).toLocaleString()}`,
        ),
      );
    }
  }

  if (ds.sources.length > 0) {
    console.log(chalk.gray("\n🔗 Sources:"));
    for (const [i, src] of ds.sources.entries()) {
      console.log(
        chalk.gray(
          `   ${i + 1}. ${src.sourceUrl} (${src.filesCount} files, ${new Date(src.downloadedAt).toLocaleString()})`,
        ),
      );
      if (src.lastCommit) {
        console.log(
          chalk.gray(`      Last commit: ${src.lastCommit.substring(0, 8)}`),
        );
      }
    }
  }

  console.log();
}
