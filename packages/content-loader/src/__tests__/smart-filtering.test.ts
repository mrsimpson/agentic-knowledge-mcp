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
    expect((loader as any).isDocumentationFile("package.json")).toBe(false);
    expect((loader as any).isDocumentationFile(".postcssrc.json")).toBe(false);
    expect((loader as any).isDocumentationFile("config.ts")).toBe(false);
    expect((loader as any).isDocumentationFile("styles.css")).toBe(false);
    expect((loader as any).isDocumentationFile("index.ts")).toBe(false);
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
});
