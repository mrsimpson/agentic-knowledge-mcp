#!/usr/bin/env node

/**
 * CLI entry point for agentic-knowledge web content management
 */

import { Command } from "commander";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("agentic-knowledge")
  .description("Manage web content sources for agentic knowledge system")
  .version("0.1.0");

// Add commands
program.addCommand(initCommand);

// Parse command line arguments
program.parse();
