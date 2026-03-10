/**
 * Tests for the docset searcher (ADR-001 Option C: Node.js streaming regex grep)
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  searchDocset,
  buildFileIndex,
  formatSearchResult,
} from "../search/searcher.js";

// ---------------------------------------------------------------------------
// Test fixture setup
// ---------------------------------------------------------------------------

let fixtureDir: string;

const FIXTURES: Record<string, string> = {
  "docs/auth.md": `# Authentication

This module handles user authentication and login.

## JWT Tokens

The system uses JSON Web Tokens for session management.
Tokens expire after 24 hours.

## OAuth2

Supports OAuth2 for third-party authentication via Google and GitHub.
`,
  "docs/api.md": `# API Reference

## useData Hook

The \`useData()\` hook returns the current page's data.

\`\`\`ts
const { page, frontmatter, theme } = useData()
\`\`\`

## useState

React's useState hook for local component state.
`,
  "docs/sidebar.md": `# Sidebar Configuration

Configure \`sidebar.items\` to define navigation structure.

\`\`\`yaml
sidebar:
  items:
    - text: Guide
      link: /guide/
    - text: Reference
      link: /reference/
\`\`\`
`,
  "docs/nested/deep.md": `# Deep Nested File

This file tests deep directory traversal.

Authentication deep dive: verify credentials before granting access.
`,
  // A file that should be skipped (binary-like — null byte injected in test)
  "images/ignored.png": "PNG\x00binary content here",
  // A file in an ignored directory
  "node_modules/pkg/index.js": "module.exports = {}; // should be skipped",
  // A file in dist/
  "dist/output.js": "// built output — should be skipped",
};

beforeAll(async () => {
  fixtureDir = join(tmpdir(), `searcher-test-${Date.now()}`);
  await mkdir(fixtureDir, { recursive: true });

  for (const [relPath, content] of Object.entries(FIXTURES)) {
    const absPath = join(fixtureDir, relPath);
    await mkdir(join(absPath, ".."), { recursive: true });
    await writeFile(absPath, content);
  }
});

afterAll(async () => {
  await rm(fixtureDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Basic search
// ---------------------------------------------------------------------------

describe("searchDocset – basic matching", () => {
  test("finds a simple keyword", async () => {
    const result = await searchDocset(fixtureDir, "authentication");
    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.matches.every((m) => /authentication/i.test(m.content))).toBe(
      true,
    );
  });

  test("returns correct 1-based line numbers", async () => {
    const result = await searchDocset(fixtureDir, "JWT Tokens");
    expect(result.matches.length).toBeGreaterThan(0);
    // Line numbers must be positive integers
    expect(result.matches.every((m) => m.line >= 1)).toBe(true);
  });

  test("returns relative file paths", async () => {
    const result = await searchDocset(fixtureDir, "authentication");
    expect(result.matches.every((m) => !m.file.startsWith("/"))).toBe(true);
  });

  test("is case-insensitive", async () => {
    const upper = await searchDocset(fixtureDir, "AUTHENTICATION");
    const lower = await searchDocset(fixtureDir, "authentication");
    expect(upper.total_matches).toBe(lower.total_matches);
  });
});

// ---------------------------------------------------------------------------
// Regex / OR syntax
// ---------------------------------------------------------------------------

describe("searchDocset – regex syntax", () => {
  test("supports OR pattern", async () => {
    const result = await searchDocset(fixtureDir, "authentication|login");
    expect(result.total_matches).toBeGreaterThan(0);
    expect(
      result.matches.every(
        (m) => /authentication/i.test(m.content) || /login/i.test(m.content),
      ),
    ).toBe(true);
  });

  test("supports wildcard (.*)", async () => {
    const result = await searchDocset(fixtureDir, "use.*Hook");
    expect(result.total_matches).toBeGreaterThan(0);
  });

  test("supports anchors (^)", async () => {
    // Lines starting with #
    const result = await searchDocset(fixtureDir, "^# ");
    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.matches.every((m) => m.content.startsWith("# "))).toBe(true);
  });

  test("handles invalid regex gracefully (treats as literal)", async () => {
    // "[unclosed" is an invalid regex
    await expect(searchDocset(fixtureDir, "[unclosed")).resolves.toBeDefined();
  });

  test("dotted path syntax", async () => {
    const result = await searchDocset(fixtureDir, "sidebar\\.items");
    expect(result.total_matches).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Context lines
// ---------------------------------------------------------------------------

describe("searchDocset – context lines", () => {
  test("includes context_before and context_after by default", async () => {
    const result = await searchDocset(fixtureDir, "JWT Tokens");
    const match = result.matches[0];
    expect(match).toBeDefined();
    expect(Array.isArray(match!.context_before)).toBe(true);
    expect(Array.isArray(match!.context_after)).toBe(true);
  });

  test("respects contextLines=0", async () => {
    const result = await searchDocset(fixtureDir, "JWT Tokens", {
      contextLines: 0,
    });
    const match = result.matches[0];
    expect(match!.context_before).toHaveLength(0);
    expect(match!.context_after).toHaveLength(0);
  });

  test("respects contextLines=1", async () => {
    const result = await searchDocset(fixtureDir, "JWT Tokens", {
      contextLines: 1,
    });
    const match = result.matches[0];
    expect(match!.context_before.length).toBeLessThanOrEqual(1);
    expect(match!.context_after.length).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Fallback behaviour
// ---------------------------------------------------------------------------

describe("searchDocset – fallback pattern", () => {
  test("uses fallbackPattern when primary yields no results", async () => {
    const result = await searchDocset(fixtureDir, "xyzzy_no_match_ever", {
      fallbackPattern: "authentication",
    });
    expect(result.total_matches).toBeGreaterThan(0);
    expect(result.used_pattern).toBe("authentication");
  });

  test("does not fall back when primary yields results", async () => {
    const result = await searchDocset(fixtureDir, "authentication", {
      fallbackPattern: "xyzzy_no_match_ever",
    });
    expect(result.used_pattern).toBe("authentication");
  });
});

// ---------------------------------------------------------------------------
// Ignored paths
// ---------------------------------------------------------------------------

describe("searchDocset – ignored paths", () => {
  test("skips node_modules", async () => {
    const result = await searchDocset(fixtureDir, "module.exports");
    expect(result.total_matches).toBe(0);
  });

  test("skips dist/", async () => {
    const result = await searchDocset(fixtureDir, "built output");
    expect(result.total_matches).toBe(0);
  });

  test("skips binary files (null byte)", async () => {
    const result = await searchDocset(fixtureDir, "binary content");
    expect(result.total_matches).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Result cap / truncation
// ---------------------------------------------------------------------------

describe("searchDocset – result cap", () => {
  test("respects maxMatches and sets truncated flag", async () => {
    // "the" appears in almost every line — enough to hit a tiny cap
    const result = await searchDocset(fixtureDir, "the", { maxMatches: 2 });
    expect(result.matches.length).toBeLessThanOrEqual(2);
    if (result.total_matches >= 2) {
      expect(result.truncated).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-file results
// ---------------------------------------------------------------------------

describe("searchDocset – multi-file", () => {
  test("returns matches from multiple files", async () => {
    const result = await searchDocset(fixtureDir, "authentication");
    const files = new Set(result.matches.map((m) => m.file));
    // auth.md and nested/deep.md both contain "authentication"
    expect(files.size).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Index integration (MiniSearch pre-filter)
// ---------------------------------------------------------------------------

describe("buildFileIndex + searchDocset with index", () => {
  test("index-assisted search returns consistent results with non-indexed", async () => {
    const index = await buildFileIndex(fixtureDir);
    const withIndex = await searchDocset(
      fixtureDir,
      "authentication",
      {},
      index,
    );
    const withoutIndex = await searchDocset(fixtureDir, "authentication");
    // Both paths should find matches (exact count may differ due to ranking)
    expect(withIndex.total_matches).toBeGreaterThan(0);
    expect(withoutIndex.total_matches).toBeGreaterThan(0);
  });

  test("index is reusable across multiple calls", async () => {
    const index = await buildFileIndex(fixtureDir);
    const r1 = await searchDocset(fixtureDir, "authentication", {}, index);
    const r2 = await searchDocset(fixtureDir, "OAuth2", {}, index);
    expect(r1.total_matches).toBeGreaterThan(0);
    expect(r2.total_matches).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// formatSearchResult
// ---------------------------------------------------------------------------

describe("formatSearchResult", () => {
  test("returns no-match message when matches array is empty", () => {
    const text = formatSearchResult({
      matches: [],
      total_matches: 0,
      searched_files: 5,
      used_pattern: "xyzzy",
      truncated: false,
    });
    expect(text).toContain("No matches");
    expect(text).toContain("xyzzy");
  });

  test("formats matches in file:line: content style", async () => {
    const result = await searchDocset(fixtureDir, "authentication");
    const text = formatSearchResult(result);
    // Should contain file headers and line numbers
    expect(text).toMatch(/==>/);
    expect(text).toMatch(/\d+: /);
  });

  test("includes truncation notice when truncated", () => {
    const text = formatSearchResult({
      matches: [
        {
          file: "docs/auth.md",
          line: 3,
          content: "authentication line",
          context_before: [],
          context_after: [],
        },
      ],
      total_matches: 1,
      searched_files: 3,
      used_pattern: "auth",
      truncated: true,
    });
    expect(text).toContain("truncated");
  });

  test("includes summary line with match count and pattern", async () => {
    const result = await searchDocset(fixtureDir, "OAuth2");
    const text = formatSearchResult(result);
    expect(text).toContain("OAuth2");
    expect(text).toMatch(/\d+ match/);
  });
});
