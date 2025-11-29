/**
 * Smart Filtering Tests - Test the key filtering behaviors for REQ-18
 */

import { describe, test, expect, beforeEach } from "vitest";
import { GitRepoLoader } from "../content/git-repo-loader.js";

describe("Smart Content Filtering - REQ-18", () => {
  let loader: GitRepoLoader;

  beforeEach(() => {
    loader = new GitRepoLoader();
  });

  test("should include markdown files anywhere in repository", () => {
    expect((loader as any).isDocumentationFile("README.md")).toBe(true);
    expect((loader as any).isDocumentationFile("docs/guide.md")).toBe(true);
    expect((loader as any).isDocumentationFile("deep/nested/api.mdx")).toBe(
      true,
    );
    expect((loader as any).isDocumentationFile("tutorial.rst")).toBe(true);
    expect((loader as any).isDocumentationFile("notes.txt")).toBe(true);
  });

  test("should exclude .github directory files even if they are markdown", () => {
    expect(
      (loader as any).isDocumentationFile(".github/issue_template.md"),
    ).toBe(false);
    expect(
      (loader as any).isDocumentationFile(".github/pull_request_template.md"),
    ).toBe(false);
    expect(
      (loader as any).isDocumentationFile(".github/workflows/ci.yml"),
    ).toBe(false);
  });

  test("should exclude project metadata files", () => {
    expect((loader as any).isDocumentationFile("CHANGELOG.md")).toBe(false);
    expect((loader as any).isDocumentationFile("LICENSE.md")).toBe(false);
    expect((loader as any).isDocumentationFile("CONTRIBUTING.md")).toBe(false);
    expect((loader as any).isDocumentationFile("CODE_OF_CONDUCT.md")).toBe(
      false,
    );
  });

  test("should exclude config and source files", () => {
    // Config files should be excluded
    expect((loader as any).isDocumentationFile("package.json")).toBe(false);
    expect((loader as any).isDocumentationFile(".postcssrc.json")).toBe(false);
    expect((loader as any).isDocumentationFile("config.ts")).toBe(false);
    expect((loader as any).isDocumentationFile("styles.css")).toBe(false);

    // Source files should be excluded
    expect((loader as any).isDocumentationFile("index.ts")).toBe(false);
    expect((loader as any).isDocumentationFile("src/index.ts")).toBe(false);
    expect((loader as any).isDocumentationFile("src/utils.ts")).toBe(false);
    expect((loader as any).isDocumentationFile("src/helpers.ts")).toBe(false);
  });

  test("should include files in examples directory", () => {
    expect((loader as any).isDocumentationFile("examples/config.json")).toBe(
      true,
    );
    expect((loader as any).isDocumentationFile("examples/demo.js")).toBe(true);
    expect((loader as any).isDocumentationFile("examples/style.css")).toBe(
      true,
    );
  });

  test("should exclude binary files even in examples", () => {
    expect((loader as any).isDocumentationFile("examples/app.exe")).toBe(false);
    expect((loader as any).isDocumentationFile("examples/lib.so")).toBe(false);
  });

  test("should filter mixed file list correctly", () => {
    const mixedFiles = [
      "README.md", // Include
      "docs/api.md", // Include
      ".github/template.md", // Exclude
      "CONTRIBUTING.md", // Exclude
      "src/main.ts", // Exclude
      "examples/demo.js", // Include
    ];

    const filtered = (loader as any).filterDocumentationFiles(mixedFiles);

    expect(filtered).toEqual(["README.md", "docs/api.md", "examples/demo.js"]);
  });

  test("should include comprehensive documentation using generic approach - Issue #12", () => {
    // Generic approach: Include markdown/text/asciidoc files + ALL files from examples/samples
    const repositoryFiles = [
      // Documentation files (markdown, text, asciidoc) - always included
      "README.md",
      "docs/getting-started.md",
      "docs/api.md",
      "guides/tutorial.rst",
      "notes.txt",
      "architecture.adoc",

      // Files in examples/samples directories - all included (Issue #12)
      "examples/basic-map.html",
      "examples/markers.js",
      "examples/demo.py",
      "examples/config.json",
      "samples/advanced-usage.ts",
      "samples/quickstart.java",

      // Source files - should be excluded
      "src/index.ts",
      "src/utils/helpers.ts",
      "lib/core.js",

      // Build artifacts and dependencies - should be excluded
      "node_modules/some-lib/index.js",
      "dist/bundle.js",
      "build/output.js",

      // Project metadata - should be excluded
      "CHANGELOG.md",
      "LICENSE",
      "CONTRIBUTING.md",

      // Config files - should be excluded
      "package.json",
      "tsconfig.json",
      ".github/workflows/ci.yml",
    ];

    const filtered = (loader as any).filterDocumentationFiles(repositoryFiles);

    // Expected: Documentation files + all files from examples/samples
    const expectedIncludes = [
      "README.md",
      "docs/getting-started.md",
      "docs/api.md",
      "guides/tutorial.rst",
      "notes.txt",
      "architecture.adoc",
      "examples/basic-map.html",
      "examples/markers.js",
      "examples/demo.py",
      "examples/config.json",
      "samples/advanced-usage.ts",
      "samples/quickstart.java",
    ];

    // The filtered result should include all expected files
    for (const expectedFile of expectedIncludes) {
      expect(filtered).toContain(expectedFile);
    }

    // Should exclude source files
    expect(filtered).not.toContain("src/index.ts");
    expect(filtered).not.toContain("src/utils/helpers.ts");
    expect(filtered).not.toContain("lib/core.js");

    // Should exclude build artifacts and config files
    expect(filtered).not.toContain("node_modules/some-lib/index.js");
    expect(filtered).not.toContain("dist/bundle.js");
    expect(filtered).not.toContain("CHANGELOG.md");
    expect(filtered).not.toContain("package.json");
    expect(filtered).not.toContain("tsconfig.json");
    expect(filtered).not.toContain(".github/workflows/ci.yml");

    // Verify we get comprehensive coverage
    expect(filtered.length).toBeGreaterThanOrEqual(expectedIncludes.length);
  });
});
