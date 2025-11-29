/**
 * Path Discovery Tests - Convert file lists to directory patterns
 */

import { describe, it, expect } from "vitest";
import {
  discoverDirectoryPatterns,
  discoverMinimalPatterns,
} from "../paths/discovery.js";

describe("discoverDirectoryPatterns", () => {
  it("should convert file list to directory patterns", () => {
    const files = [
      "README.md",
      "docs/guide/intro.md",
      "docs/guide/advanced.md",
      "docs/api/reference.md",
      "docs/api/endpoints.md",
      "examples/basic.js",
      "examples/advanced.js",
      "src/index.ts",
    ];

    const result = discoverDirectoryPatterns(files);

    // Should identify directories with multiple files
    expect(result).toContain("docs/");
    expect(result).toContain("examples/");
    expect(result).toContain("README.md");
  });

  it("should handle nested directories efficiently", () => {
    const files = [
      "docs/en/guide/intro.md",
      "docs/en/guide/advanced.md",
      "docs/en/api/reference.md",
      "docs/fr/guide/intro.md",
    ];

    const result = discoverDirectoryPatterns(files);

    // All files are under docs/ - should return that pattern
    expect(result).toEqual(["docs/"]);
  });

  it("should keep single files in root as-is", () => {
    const files = [
      "README.md",
      "LICENSE",
      "docs/guide/intro.md",
      "docs/guide/advanced.md",
    ];

    const result = discoverDirectoryPatterns(files);

    // Root files individually, docs as directory
    expect(result).toContain("README.md");
    expect(result).toContain("LICENSE");
    expect(result).toContain("docs/");
  });

  it("should handle all files in root directory", () => {
    const files = ["README.md", "CONTRIBUTING.md", "LICENSE"];

    const result = discoverDirectoryPatterns(files);

    // All single files in root
    expect(result).toEqual(
      expect.arrayContaining(["README.md", "CONTRIBUTING.md", "LICENSE"]),
    );
    expect(result).toHaveLength(3);
  });

  it("should handle empty file list", () => {
    const result = discoverDirectoryPatterns([]);
    expect(result).toEqual([]);
  });

  it("should handle single file", () => {
    const result = discoverDirectoryPatterns(["README.md"]);
    expect(result).toEqual(["README.md"]);
  });

  it("should handle files in same directory", () => {
    const files = ["docs/intro.md", "docs/guide.md", "docs/reference.md"];

    const result = discoverDirectoryPatterns(files);
    expect(result).toEqual(["docs/"]);
  });
});

describe("discoverMinimalPatterns", () => {
  it("should use minimal patterns", () => {
    const files = ["README.md", "docs/guide.md", "docs/api.md"];

    const result = discoverMinimalPatterns(files);

    expect(result).toContain("README.md");
    expect(result).toContain("docs/");
  });

  it("should handle single file in directory", () => {
    const files = [
      "README.md",
      "docs/guide.md", // Only one file in docs
    ];

    const result = discoverMinimalPatterns(files);

    expect(result).toContain("README.md");
    expect(result).toContain("docs/guide.md"); // Single file, not directory pattern
  });
});
