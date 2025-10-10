/**
 * CLI Commands - Basic validation tests
 */

import { describe, it, expect } from "vitest";
import { initCommand } from "../commands/init.js";
import { refreshCommand } from "../commands/refresh.js";
import { statusCommand } from "../commands/status.js";

describe("CLI Commands Validation", () => {
  it("should export init command with correct name", () => {
    expect(initCommand.name()).toBe("init");
    expect(initCommand.description()).toContain("Initialize web sources");
  });

  it("should export refresh command with correct name", () => {
    expect(refreshCommand.name()).toBe("refresh");
    expect(refreshCommand.description()).toContain("Refresh web sources");
  });

  it("should export status command with correct name", () => {
    expect(statusCommand.name()).toBe("status");
    expect(statusCommand.description()).toContain("Show status");
  });

  it("should have proper command structure", () => {
    // Check that commands are properly structured Commander objects
    expect(typeof initCommand.parse).toBe("function");
    expect(typeof refreshCommand.parse).toBe("function");
    expect(typeof statusCommand.parse).toBe("function");
  });
});
