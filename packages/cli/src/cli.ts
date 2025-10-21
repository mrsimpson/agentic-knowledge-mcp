/**
 * CLI implementation for agentic-knowledge web content management
 */

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { refreshCommand } from "./commands/refresh.js";
import { statusCommand } from "./commands/status.js";
import { createCommand } from "./commands/create.js";

export function runCli() {
  const program = new Command();

  program
    .name("agentic-knowledge")
    .description("Manage web content sources for agentic knowledge system")
    .version("0.1.0");

  // Add commands
  program.addCommand(createCommand);
  program.addCommand(initCommand);
  program.addCommand(refreshCommand);
  program.addCommand(statusCommand);

  // Parse command line arguments
  program.parse();
}
