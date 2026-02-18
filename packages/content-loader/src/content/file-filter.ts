/**
 * Shared file filtering utilities for documentation content extraction (REQ-18)
 */

import * as path from "node:path";

/**
 * Determine if a file is considered documentation content (REQ-18)
 * @param filePath - Path to the file to check
 * @returns True if file should be included as documentation
 */
export function isDocumentationFile(filePath: string): boolean {
  const filename = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const directory = path.dirname(filePath);

  // Exclude project metadata files (REQ-18)
  const metadataFiles =
    /^(CHANGELOG|LICENSE|CONTRIBUTING|AUTHORS|CODE_OF_CONDUCT)/i;
  if (metadataFiles.test(filename)) {
    return false;
  }

  // Normalize directory path for consistent matching (use forward slashes)
  const normalizedDir = directory.split(path.sep).join("/");
  const pathParts = normalizedDir.split("/");

  // Exclude build, dependency, and development directories (REQ-18)
  // Use exact directory name matching, not substring matching
  const excludedDirs = [
    "node_modules",
    "vendor",
    ".git",
    "build",
    "dist",
    "target",
    ".cache",
    "__tests__",
    "test",
    "tests",
    ".github",
    ".vscode",
    ".idea",
  ];

  // Check if any path segment matches excluded directories
  for (const excludedDir of excludedDirs) {
    if (pathParts.includes(excludedDir)) {
      return false;
    }
  }

  // Include README files anywhere (REQ-18)
  if (/^README/i.test(filename)) {
    return true;
  }

  // Include documentation file extensions anywhere, regardless of directory (REQ-18)
  const docExtensions = [".md", ".mdx", ".rst", ".txt", ".adoc", ".asciidoc"];
  if (docExtensions.includes(extension)) {
    return true;
  }

  // Special case: examples/samples directory - include ALL file types (Issue #12)
  // These directories contain code that demonstrates usage patterns
  const isInExamples = /\b(examples?|samples?)\b/i.test(directory);
  if (isInExamples) {
    // In examples/samples, exclude only binary files
    const excludedInExamples = [
      ".exe",
      ".bin",
      ".so",
      ".dll",
      ".dylib",
      ".a",
      ".o",
      ".obj",
    ];
    return !excludedInExamples.includes(extension);
  }

  return false;
}

/**
 * Filter list of files to only include documentation-relevant files (REQ-18)
 * @param files - Array of file paths to filter
 * @returns Array of file paths that are considered documentation
 */
export function filterDocumentationFiles(files: string[]): string[] {
  return files.filter((file) => isDocumentationFile(file));
}
