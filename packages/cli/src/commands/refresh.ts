/**
 * Refresh command - update web sources for docsets
 */

import { Command } from "commander";
import chalk from "chalk";
import { refreshDocsets } from "../api/refresh.js";

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
        const refreshParams: Parameters<typeof refreshDocsets>[0] = {
          force: options.force,
          cwd: process.cwd(),
        };
        if (docsetId !== undefined) refreshParams.docsetId = docsetId;
        const result = await refreshDocsets(refreshParams);

        if (result.docsets.length === 0) {
          console.log(chalk.yellow("⚠️  No docsets with web sources found."));
          return;
        }

        for (const ds of result.docsets) {
          if (ds.skipped) {
            console.log(
              chalk.yellow(`⏭️  ${ds.docsetId}: Skipped — ${ds.skipReason}`),
            );
          } else if (ds.success) {
            console.log(
              chalk.green(
                `✅ ${ds.docsetId}: Refreshed (${ds.totalFiles} files from ${ds.sourcesRefreshed} source(s))`,
              ),
            );
          } else {
            console.log(chalk.red(`❌ ${ds.docsetId}: Failed — ${ds.error}`));
          }
        }

        const failed = result.docsets.filter((d) => !d.success && !d.skipped);
        if (failed.length > 0) {
          process.exit(1);
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
