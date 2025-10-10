#!/usr/bin/env node

/**
 * Test Summary Script for Agentic Knowledge
 * Runs tests and provides an overview of results from all packages
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";

function stripAnsiCodes(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

console.log("🧪 Running tests across all packages...\n");

// Dynamically detect all packages
function getWorkspacePackages() {
  const packages = [];
  if (existsSync("packages")) {
    const dirs = readdirSync("packages", { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const pkgJsonPath = `packages/${dir.name}/package.json`;
        if (existsSync(pkgJsonPath)) {
          try {
            const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
            packages.push({ name: dir.name, fullName: pkgJson.name });
          } catch (_e) {
            // Skip invalid package.json files
          }
        }
      }
    }
  }
  return packages;
}

try {
  // Get all workspace packages dynamically
  const workspacePackages = getWorkspacePackages();

  const packageResults = [];
  let totalPassed = 0;
  let totalTests = 0;

  // Run tests for each workspace package
  for (const pkg of workspacePackages) {
    console.log(`Running ${pkg.fullName} tests...`);
    try {
      const pkgOutput = execSync(`cd packages/${pkg.name} && pnpm test`, {
        encoding: "utf8",
        stdio: "pipe",
      });
      // Match "Tests" specifically, not "Test Files"
      const cleanPkgOutput = stripAnsiCodes(pkgOutput);
      const pkgMatch = cleanPkgOutput.match(
        /Tests\s+(\d+)\s+passed\s+\((\d+)\)/,
      );
      if (pkgMatch) {
        const passed = parseInt(pkgMatch[1]);
        const total = parseInt(pkgMatch[2]);
        packageResults.push({ package: pkg.name, passed, total });
        totalPassed += passed;
        totalTests += total;
      } else {
        console.log(
          `DEBUG: ${pkg.name} output:`,
          cleanPkgOutput.split("\n").slice(-5).join("\n"),
        );
      }
    } catch (err) {
      // Parse error output
      const errorObj = err;
      const pkgOutput = errorObj.stdout || "";
      const cleanOutput = stripAnsiCodes(pkgOutput);
      const testMatch = cleanOutput.match(
        /Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed\s+\((\d+)\)/,
      );
      const passedOnlyMatch = cleanOutput.match(
        /Tests\s+(\d+)\s+passed\s+\((\d+)\)/,
      );

      if (testMatch) {
        // Some tests failed: "Tests  18 failed | 134 passed (152)"
        const failed = parseInt(testMatch[1]);
        const passed = parseInt(testMatch[2]);
        const total = parseInt(testMatch[3]);
        packageResults.push({ package: pkg.name, passed, total, failed });
        totalPassed += passed;
        totalTests += total;
      } else if (passedOnlyMatch) {
        // All tests passed
        const passed = parseInt(passedOnlyMatch[1]);
        const total = parseInt(passedOnlyMatch[2]);
        packageResults.push({ package: pkg.name, passed, total });
        totalPassed += passed;
        totalTests += total;
      } else {
        // Truly no tests found or other error
        console.log(`No tests found for ${pkg.fullName}`);
      }
    }
  }

  // Run E2E tests
  console.log("Running E2E tests...");
  try {
    const e2eOutput = execSync("pnpm vitest run test/e2e/", {
      encoding: "utf8",
      stdio: "pipe",
    });
    const cleanE2EOutput = stripAnsiCodes(e2eOutput);
    const e2eMatch = cleanE2EOutput.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
    if (e2eMatch) {
      const passed = parseInt(e2eMatch[1]);
      const total = parseInt(e2eMatch[2]);
      packageResults.push({ package: "e2e", passed, total });
      totalPassed += passed;
      totalTests += total;
    } else {
      console.log(
        "DEBUG: E2E output:",
        cleanE2EOutput.split("\n").slice(-5).join("\n"),
      );
    }
  } catch (err) {
    const errorObj = err;
    const e2eOutput = errorObj.stdout || "";
    const cleanOutput = stripAnsiCodes(e2eOutput);
    const testMatch = cleanOutput.match(
      /Tests\s+(\d+)\s+failed\s+\|\s+(\d+)\s+passed\s+\((\d+)\)/,
    );
    const passedOnlyMatch = cleanOutput.match(
      /Tests\s+(\d+)\s+passed\s+\((\d+)\)/,
    );

    if (testMatch) {
      const failed = parseInt(testMatch[1]);
      const passed = parseInt(testMatch[2]);
      const total = parseInt(testMatch[3]);
      packageResults.push({ package: "e2e", passed, total, failed });
      totalPassed += passed;
      totalTests += total;
    } else if (passedOnlyMatch) {
      const passed = parseInt(passedOnlyMatch[1]);
      const total = parseInt(passedOnlyMatch[2]);
      packageResults.push({ package: "e2e", passed, total });
      totalPassed += passed;
      totalTests += total;
    } else {
      console.log("No E2E tests found or failed to parse output");
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  // Display results
  for (const result of packageResults) {
    if (result.package === "e2e") {
      const status = result.passed === result.total ? "✅" : "❌";
      console.log(
        `${status} E2E Tests: ${result.passed}/${result.total} passed`,
      );
    } else {
      const status = result.passed === result.total ? "✅" : "❌";
      const packageDisplayName = result.package.replace("knowledge-", "");
      console.log(
        `${status} @codemcp/knowledge-${packageDisplayName}: ${result.passed}/${result.total} passed`,
      );
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log(`📈 TOTAL RESULTS:`);
  console.log(`   • Tests passed: ${totalPassed}`);
  console.log(`   • Total tests: ${totalTests}`);
  console.log(
    `   • Success rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`,
  );
  console.log(`   • Packages tested: ${packageResults.length}`);

  // Check if any tests failed or if no tests were found at all
  if (totalTests === 0) {
    console.log("\n❌ NO TESTS FOUND!");
    console.log("=".repeat(60));
    process.exit(1);
  } else if (totalPassed < totalTests) {
    console.log("\n❌ SOME TESTS FAILED!");
    console.log("=".repeat(60));
    process.exit(1);
  } else {
    console.log("\n🎉 All tests completed successfully!");
    console.log("=".repeat(60));
  }
} catch (error) {
  console.error("\n" + "=".repeat(60));
  console.error("❌ TESTS FAILED");
  console.error("=".repeat(60));
  console.error(
    "Error:",
    error instanceof Error ? error.message : String(error),
  );
  console.error("=".repeat(60));
  process.exit(1);
}
