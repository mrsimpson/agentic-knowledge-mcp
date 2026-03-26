/**
 * File-content search for docsets.
 *
 * Strategy (ADR-001 Option C + optional MiniSearch pre-filter):
 *   1. Walk the docset directory, skip binary files and ignored paths.
 *   2. If MiniSearch is available AND the pattern looks like a plain term (no regex
 *      metacharacters), build/retrieve a lightweight in-memory index and use it to
 *      rank the most relevant files first — this keeps the hot path fast on large
 *      docsets without requiring any extra dependency.
 *   3. Stream each candidate file line by line; test against the compiled RegExp.
 *   4. Collect up to `maxMatches` results with surrounding context lines.
 *   5. If 0 matches and a fallbackPattern is provided, repeat with that pattern.
 *   6. If still 0, re-run without pre-filtering (safety net for exotic regex).
 */

import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { createInterface } from "node:readline";
import type { SearchDocsResult, SearchMatch, SearchOptions } from "../types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONTEXT_LINES = 2;
const DEFAULT_MAX_MATCHES = 50;

/** Directories / files that are never useful to search inside a docset. */
const IGNORED_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".turbo",
  ".cache",
]);

/** Files that are always skipped regardless of directory. */
const IGNORED_FILES = new Set([".agentic-metadata.json", ".gitignore"]);

/**
 * Regex metacharacters that indicate the user supplied a real regex pattern.
 * When present we skip the MiniSearch pre-filter (it would tokenise the raw
 * pattern incorrectly) and go straight to streaming grep.
 */
const REGEX_META = /[.+*?^${}()|[\]\\]/;

// ---------------------------------------------------------------------------
// MiniSearch integration (optional, best-effort)
// ---------------------------------------------------------------------------

/**
 * Lazily attempt to load MiniSearch. Returns null when the package is absent
 * so callers can degrade gracefully without throwing.
 */
async function tryLoadMiniSearch(): Promise<
  typeof import("minisearch").default | null
> {
  try {
    const mod = await import("minisearch");
    return (
      mod.default ??
      (mod as unknown as { default: typeof import("minisearch").default })
        .default
    );
  } catch {
    return null;
  }
}

/** Opaque handle returned by {@link buildFileIndex}. */
export interface DocsetIndex {
  /** MiniSearch instance (null when MiniSearch could not be loaded) */
  _ms: {
    search(
      _query: string,
      _opts?: Record<string, unknown>,
    ): Array<{ id: unknown; score: number }>;
  } | null;
  /** Absolute path to the docset root used to build this index */
  rootPath: string;
  /** Map from numeric doc id → absolute file path */
  _idToPath: Map<number, string>;
}

/**
 * Build an in-memory full-text index over all text files in `rootPath`.
 * Returns a {@link DocsetIndex} regardless of whether MiniSearch is available;
 * when it is not, the index is a no-op stub that causes the caller to fall
 * back to a full streaming search.
 */
export async function buildFileIndex(rootPath: string): Promise<DocsetIndex> {
  const MiniSearch = await tryLoadMiniSearch();

  if (!MiniSearch) {
    return { _ms: null, rootPath, _idToPath: new Map() };
  }

  type MiniSearchInstance = DocsetIndex["_ms"] & {
    addAllAsync(_docs: Array<{ id: number; content: string }>): Promise<void>;
  };
  type MiniSearchCtor = new (
    _opts: Record<string, unknown>,
  ) => MiniSearchInstance;
  const ms = new (MiniSearch as unknown as MiniSearchCtor)({
    fields: ["content"],
    storeFields: [],
  });

  const idToPath = new Map<number, string>();
  let id = 0;
  const batch: Array<{ id: number; content: string }> = [];

  for await (const absPath of walkFiles(rootPath)) {
    const content = await readTextFile(absPath);
    if (content === null) continue; // binary or unreadable
    batch.push({ id, content });
    idToPath.set(id, absPath);
    id++;
  }

  await ms.addAllAsync(batch);

  return { _ms: ms, rootPath, _idToPath: idToPath };
}

// ---------------------------------------------------------------------------
// Main search entry point
// ---------------------------------------------------------------------------

/**
 * Search `rootPath` for lines matching `pattern` (a regex string).
 *
 * @param rootPath  Absolute path to the docset directory.
 * @param pattern   Search pattern. Supports full JS regex syntax
 *                  (e.g. `"auth|login"`, `"function\\s+\\w+"`, `"TODO.*fix"`).
 *                  The match is always case-insensitive.
 * @param options   Optional tuning parameters.
 * @param index     Pre-built index for the docset. Pass one to avoid re-walking
 *                  on repeated calls. Omit to build ad-hoc (no caching).
 */
export async function searchDocset(
  rootPath: string,
  pattern: string,
  options: SearchOptions = {},
  index?: DocsetIndex,
): Promise<SearchDocsResult> {
  const contextLines = options.contextLines ?? DEFAULT_CONTEXT_LINES;
  const maxMatches = options.maxMatches ?? DEFAULT_MAX_MATCHES;

  return runSearch(
    rootPath,
    pattern,
    { contextLines, maxMatches, include: options.include },
    index,
  );
}

// ---------------------------------------------------------------------------
// Internal search implementation
// ---------------------------------------------------------------------------

interface RunSearchOptions {
  contextLines: number;
  maxMatches: number;
  include: string | undefined;
}

async function runSearch(
  rootPath: string,
  pattern: string,
  opts: RunSearchOptions,
  index?: DocsetIndex,
): Promise<SearchDocsResult> {
  let regex: RegExp;
  let patternWasEscaped = false;
  try {
    regex = new RegExp(pattern, "i");
  } catch {
    // Invalid regex: treat as literal string and flag it
    regex = new RegExp(escapeRegex(pattern), "i");
    patternWasEscaped = true;
  }

  // Decide which files to scan
  const useMiniSearch =
    index?._ms !== null && index !== undefined && !REGEX_META.test(pattern);

  let candidateFiles: string[];

  if (useMiniSearch && index) {
    // Use MiniSearch to rank and limit candidate files
    const results = index._ms!.search(pattern, {
      prefix: true,
      fuzzy: 0.2,
      combineWith: "OR",
    });
    // Take top 20 ranked files; fall back to all files if no results
    if (results.length > 0) {
      candidateFiles = results
        .slice(0, 20)
        .map((r) => index._idToPath.get(r.id as number))
        .filter((p): p is string => p !== undefined);
    } else {
      // MiniSearch found nothing — walk all files
      candidateFiles = await collectFiles(rootPath, opts.include);
    }
  } else {
    candidateFiles = await collectFiles(rootPath, opts.include);
  }

  // Stream-grep the candidate files
  const matches: SearchMatch[] = [];
  let totalMatches = 0;
  let searchedFiles = 0;
  let truncated = false;

  for (const absPath of candidateFiles) {
    if (truncated) break;

    const relPath = relative(rootPath, absPath).replace(/\\/g, "/");
    searchedFiles++;

    const fileMatches = await grepFile(
      absPath,
      relPath,
      regex,
      opts.contextLines,
      opts.maxMatches - totalMatches,
    );

    totalMatches += fileMatches.length;
    matches.push(...fileMatches);

    if (totalMatches >= opts.maxMatches) {
      truncated = true;
    }
  }

  const result: SearchDocsResult = {
    matches,
    total_matches: totalMatches,
    searched_files: searchedFiles,
    used_pattern: pattern,
    truncated,
  };
  if (patternWasEscaped) {
    result.pattern_was_escaped = true;
  }
  return result;
}

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

/** Recursively yield absolute paths of all non-ignored files under `dir`. */
async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absPath = join(dir, entry.name);

    // For symlinks, stat() follows the link to get the real type.
    // entry.isDirectory() / entry.isFile() return false for symlinks.
    let isDir = entry.isDirectory();
    let isFile = entry.isFile();
    if (entry.isSymbolicLink()) {
      try {
        const s = await stat(absPath);
        isDir = s.isDirectory();
        isFile = s.isFile();
      } catch {
        continue; // broken symlink — skip
      }
    }

    if (isDir) {
      if (!IGNORED_NAMES.has(entry.name)) {
        yield* walkFiles(absPath);
      }
    } else if (isFile) {
      if (!IGNORED_FILES.has(entry.name)) {
        yield absPath;
      }
    }
  }
}

/** Collect all walkable file paths into an array (respects optional glob include). */
async function collectFiles(
  rootPath: string,
  include?: string,
): Promise<string[]> {
  const files: string[] = [];

  for await (const absPath of walkFiles(rootPath)) {
    if (include && !matchGlob(absPath, include)) continue;
    files.push(absPath);
  }

  return files;
}

// ---------------------------------------------------------------------------
// Per-file grep
// ---------------------------------------------------------------------------

/**
 * Read `absPath` line by line; return up to `limit` matches with context.
 * Returns an empty array for binary files.
 */
async function grepFile(
  absPath: string,
  relPath: string,
  regex: RegExp,
  contextLines: number,
  limit: number,
): Promise<SearchMatch[]> {
  if (limit <= 0) return [];

  // Binary detection: read first 8 KB and check for null bytes
  if (await isBinaryFile(absPath)) return [];

  const lines: string[] = [];
  const matchIndices: number[] = []; // 0-based indices into `lines`

  try {
    const rl = createInterface({
      input: createReadStream(absPath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      lines.push(line);
      if (regex.test(line)) {
        matchIndices.push(lines.length - 1);
      }
    }
  } catch {
    // Unreadable file (permissions, encoding errors) — skip silently
    return [];
  }

  const results: SearchMatch[] = [];

  for (const idx of matchIndices) {
    if (results.length >= limit) break;

    const before = lines
      .slice(Math.max(0, idx - contextLines), idx)
      .map((l) => l.trimEnd());
    const after = lines
      .slice(idx + 1, idx + 1 + contextLines)
      .map((l) => l.trimEnd());

    results.push({
      file: relPath,
      line: idx + 1, // convert to 1-based
      content: lines[idx]!.trimEnd(),
      context_before: before,
      context_after: after,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a file as UTF-8 text; returns null for binary or unreadable files. */
async function readTextFile(absPath: string): Promise<string | null> {
  if (await isBinaryFile(absPath)) return null;
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(absPath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Detect binary files by reading the first 8 KB and looking for a null byte.
 * This is the same heuristic used by git and ripgrep.
 */
async function isBinaryFile(absPath: string): Promise<boolean> {
  try {
    const fileStat = await stat(absPath);
    if (fileStat.size === 0) return false;

    const { open } = await import("node:fs/promises");
    const fh = await open(absPath, "r");
    try {
      const buf = Buffer.alloc(Math.min(8192, fileStat.size));
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      for (let i = 0; i < bytesRead; i++) {
        if (buf[i] === 0) return true;
      }
      return false;
    } finally {
      await fh.close();
    }
  } catch {
    return true; // treat unreadable as binary → skip
  }
}

/** Escape all regex metacharacters in a literal string. */
function escapeRegex(s: string): string {
  return s.replace(/[.+*?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Very lightweight glob matching supporting `*`, `**`, and `?`.
 * Only used for the `include` file-filter option; not a full glob engine.
 */
function matchGlob(filePath: string, pattern: string): boolean {
  // Convert simple glob to regex.
  // Use a rare Unicode placeholder (U+FFFE) to temporarily represent **
  // so that the single-* replacement doesn't clobber it.
  const DOUBLE_STAR = "\uFFFE";
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex chars (not * and ?)
    .replace(/\*\*/g, DOUBLE_STAR) // placeholder for **
    .replace(/\*/g, "[^/]*") // * → any chars except /
    .replace(/\?/g, "[^/]") // ? → single char except /
    .replace(new RegExp(DOUBLE_STAR, "g"), ".*"); // ** → any chars including /

  return new RegExp(regexStr + "$", "i").test(filePath);
}

// ---------------------------------------------------------------------------
// Formatting helpers (used by the MCP server layer)
// ---------------------------------------------------------------------------

/**
 * Format a {@link SearchDocsResult} as a human-readable, grep-style text block
 * suitable for returning as MCP tool content.
 */
export function formatSearchResult(result: SearchDocsResult): string {
  // Warning header for escaped patterns
  const warnings: string[] = [];
  if (result.pattern_was_escaped) {
    warnings.push(
      `⚠️ Pattern "${result.used_pattern}" contained invalid regex syntax and was treated as a literal string.`,
      `   If you intended to use regex, check for unescaped special characters like ( ) [ ] { } etc.`,
      ``,
    );
  }

  if (result.matches.length === 0) {
    const hints = [
      `No matches found for pattern: "${result.used_pattern}"`,
      `(searched ${result.searched_files} file${result.searched_files === 1 ? "" : "s"})`,
      ``,
      `💡 Tips to improve your search:`,
      `• Use | for alternatives: "auth|login|session" matches any of these`,
      `• Use .* for flexible matching: "config.*timeout" matches "configTimeout", "config_timeout", etc.`,
      `• Use \\b for word boundaries: "\\bapi\\b" avoids matching "capital"`,
      `• Simplify: try a single distinctive term instead of a phrase`,
    ];
    if (!result.used_pattern.includes("|")) {
      hints.push(
        `• If you used spaces, note they are literal — use | to search for multiple terms`,
      );
    }
    return [...warnings, ...hints].join("\n");
  }

  const lines: string[] = [...warnings];

  let currentFile = "";
  for (const match of result.matches) {
    if (match.file !== currentFile) {
      if (currentFile !== "") lines.push(""); // blank separator between files
      lines.push(`==> ${match.file} <==`);
      currentFile = match.file;
    }

    for (const ctx of match.context_before) {
      lines.push(`  ${ctx}`);
    }
    lines.push(`${match.line}: ${match.content}`);
    for (const ctx of match.context_after) {
      lines.push(`  ${ctx}`);
    }
  }

  const truncatedHint = result.truncated
    ? ` [truncated at ${DEFAULT_MAX_MATCHES} — use a more specific pattern to narrow results]`
    : "";

  const summary = [
    ``,
    `--- ${result.total_matches} match${result.total_matches === 1 ? "" : "es"} in ${result.searched_files} file${result.searched_files === 1 ? "" : "s"} (pattern: "${result.used_pattern}")${truncatedHint}`,
  ];

  return [...lines, ...summary].join("\n");
}
