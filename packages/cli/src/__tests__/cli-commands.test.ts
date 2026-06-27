/**
 * CLI Commands - Basic validation tests
 */

import { describe, it, expect } from "vitest";
import { initCommand } from "../commands/init.js";
import { initAllCommand } from "../commands/init-all.js";
import { refreshCommand } from "../commands/refresh.js";
import { statusCommand } from "../commands/status.js";

describe("CLI Commands Validation", () => {
  it("should export init command with correct name", () => {
    expect(initCommand.name()).toBe("init");
    expect(initCommand.description()).toContain("Initialize sources");
  });

  it("should export init-all command with correct name", () => {
    expect(initAllCommand.name()).toBe("init-all");
    expect(initAllCommand.description()).toContain("Initialize all docsets");
  });

  it("should export refresh command with correct name", () => {
    expect(refreshCommand.name()).toBe("refresh");
    expect(refreshCommand.description()).toContain("Refresh sources");
  });

  it("should export status command with correct name", () => {
    expect(statusCommand.name()).toBe("status");
    expect(statusCommand.description()).toContain("Show status");
  });

  it("should have proper command structure", () => {
    expect(typeof initCommand.parse).toBe("function");
    expect(typeof initAllCommand.parse).toBe("function");
    expect(typeof refreshCommand.parse).toBe("function");
    expect(typeof statusCommand.parse).toBe("function");
  });
});
