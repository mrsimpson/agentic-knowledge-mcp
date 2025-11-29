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

  test("should exclude config files but include entry points", () => {
    // Config files should be excluded
    expect((loader as any).isDocumentationFile("package.json")).toBe(false);
    expect((loader as any).isDocumentationFile(".postcssrc.json")).toBe(false);
    expect((loader as any).isDocumentationFile("config.ts")).toBe(false);
    expect((loader as any).isDocumentationFile("styles.css")).toBe(false);

    // Entry point files should be included (Issue #12)
    expect((loader as any).isDocumentationFile("index.ts")).toBe(true);
    expect((loader as any).isDocumentationFile("src/index.ts")).toBe(true);
    expect((loader as any).isDocumentationFile("index.js")).toBe(true);

    // Regular source files should still be excluded
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

  test("should include comprehensive documentation for component libraries - Issue #12", () => {
    // Simulate a component library structure like vue3-openlayers
    // These libraries have documentation spread across source files, not just in docs/
    const componentLibraryFiles = [
      // Basic docs (currently included)
      "README.md",
      "docs/getting-started.md",
      "docs/api.md",
      "examples/basic-map.html",
      "examples/markers.js",

      // TypeScript definitions with valuable type information (currently excluded)
      "src/index.d.ts",
      "src/types.d.ts",
      "src/components/Map.d.ts",

      // Source files with JSDoc documentation (currently excluded)
      "src/index.ts",
      "src/components/OlMap.vue",
      "src/components/OlMarker.vue",
      "src/utils/helpers.ts",

      // Component files that demonstrate API usage (currently excluded)
      "src/components/layers/OlVectorLayer.vue",
      "src/components/layers/OlTileLayer.vue",

      // Example files in src (currently excluded due to src/ exclusion)
      "src/examples/basic.ts",
      "src/examples/advanced.ts",

      // These should still be excluded
      "node_modules/some-lib/index.js",
      "dist/bundle.js",
      "CHANGELOG.md",
      "LICENSE",
      ".github/workflows/ci.yml",
      "package.json",
      "tsconfig.json",
    ];

    const filtered = (loader as any).filterDocumentationFiles(
      componentLibraryFiles,
    );

    // Expected: More than just the 5 basic doc files
    // Should include TypeScript definitions, source files with documentation value,
    // and example files to provide comprehensive knowledge about the library
    const expectedIncludes = [
      "README.md",
      "docs/getting-started.md",
      "docs/api.md",
      "examples/basic-map.html",
      "examples/markers.js",
      // These TypeScript definition files should be included for type information
      "src/index.d.ts",
      "src/types.d.ts",
      "src/components/Map.d.ts",
      // Main entry points and component files should be included
      "src/index.ts",
      "src/components/OlMap.vue",
      "src/components/OlMarker.vue",
      // Example files provide valuable usage documentation
      "src/examples/basic.ts",
      "src/examples/advanced.ts",
    ];

    // The filtered result should include all expected files
    for (const expectedFile of expectedIncludes) {
      expect(filtered).toContain(expectedFile);
    }

    // Should still exclude build artifacts and config files
    expect(filtered).not.toContain("node_modules/some-lib/index.js");
    expect(filtered).not.toContain("dist/bundle.js");
    expect(filtered).not.toContain("CHANGELOG.md");
    expect(filtered).not.toContain("package.json");
    expect(filtered).not.toContain("tsconfig.json");
    expect(filtered).not.toContain(".github/workflows/ci.yml");

    // Verify we get comprehensive coverage (more than just 9 files)
    expect(filtered.length).toBeGreaterThanOrEqual(expectedIncludes.length);
  });
});
