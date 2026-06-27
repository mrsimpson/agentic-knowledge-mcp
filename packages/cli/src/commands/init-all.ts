import { Command } from "commander";
import { ConfigManager } from "@codemcp/knowledge-core";
import { initDocset } from "../api/init.js";

export const initAllCommand = new Command("init-all")
  .description("Initialize all docsets from configuration (Docker entrypoint)")
  .action(async () => {
    const configManager = new ConfigManager();
    let config;
    try {
      ({ config } = await configManager.loadConfig(process.cwd()));
    } catch (error) {
      process.stderr.write(
        `ERROR: Failed to load config: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(1);
    }

    if (config.docsets.length === 0) {
      process.stderr.write("No docsets configured.\n");
      return;
    }

    for (const docset of config.docsets) {
      process.stderr.write(`Initializing docset: ${docset.id}\n`);
      try {
        const result = await initDocset({
          docsetId: docset.id,
          cwd: process.cwd(),
        });
        if (result.alreadyInitialized) {
          process.stderr.write(`  -> already initialized, skipping.\n`);
        } else {
          process.stderr.write(`  -> done (${result.totalFiles} files).\n`);
        }
      } catch (error) {
        process.stderr.write(
          `ERROR: Failed to initialize docset '${docset.id}': ${error instanceof Error ? error.message : String(error)}\n`,
        );
        process.exit(1);
      }
    }
  });
