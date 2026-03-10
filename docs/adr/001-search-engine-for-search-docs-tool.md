# ADR-001: Search Engine for the `search_docs` Tool

**Date:** 2026-03-10  
**Status:** Accepted  
**Deciders:** Oliver Jägle  
**Technical Story:** Replace instruction-only `search_docs` response with actual in-process file search

---

## Context and Problem Statement

The `search_docs` MCP tool currently returns a rendered instruction string telling the calling agent _where_ and _how_ to search (e.g. "Use available text search tools to search for `authentication` in `.knowledge/docsets/my-docs`…"). The agent must then perform the actual search itself using whatever tools it has available — an extra round-trip that is slow, fragile, and entirely dependent on the agent's environment.

We want `search_docs` to **perform the search itself** and return matching results (file path, line number, matched line, surrounding context). The implementation must be:

- Cross-platform (Windows, macOS, Linux — no assumptions about installed system tools)
- Distributable as an npm package without CI/network surprises
- Expressive enough that agents can use full OR/AND/regex patterns — syntax that LLM agents already know
- Fast enough for typical docset sizes (tens to hundreds of files, up to ~10 MB of text)

---

## Decision Drivers

| #   | Criterion                                     | Weight | Rationale                                                         |
| --- | --------------------------------------------- | ------ | ----------------------------------------------------------------- |
| 1   | **Cross-platform reliability**                | 5      | Must work on all OS/arch combos without postinstall network calls |
| 2   | **Search expressiveness (OR, regex, fuzzy)**  | 4      | Agents need `auth\|login`, wildcards, prefix matching             |
| 3   | **Installation footprint**                    | 4      | Published npm package; large binaries harm adoption               |
| 4   | **Result precision (line numbers + context)** | 4      | Grep-like output is what agents consume                           |
| 5   | **Maintenance burden**                        | 3      | We don't want to maintain a binary downloader                     |
| 6   | **No new dependencies**                       | 3      | `minisearch` is already in `node_modules`; adding more is a cost  |
| 7   | **Cold-start latency**                        | 2      | Per-request or per-session; acceptable up to ~100ms               |

Total weight: **25**

---

## Considered Options

### Option A — `@vscode/ripgrep` wrapper (binary download at `postinstall`)

Ship the `@vscode/ripgrep` package, which downloads the platform-specific `rg` binary from GitHub Releases at `npm install` time, and wrap it with `ripgrep-js` or a thin `child_process.spawn` shim.

### Option B — MiniSearch full-text index (hybrid: MiniSearch → line-grep)

Build a per-docset in-memory MiniSearch index on first use (cached for the server session). Use it to rank the top-N most relevant files, then do a streaming line-by-line regex grep on those files to extract exact line numbers and context.

### Option C — Pure Node.js streaming regex grep (no index, no binary)

Walk all files in the docset directory recursively using Node.js `fs/promises` + `readline`. For each file, test each line against the keyword compiled as a `RegExp`. Return matching lines with context. Fall back from `keywords` to `generalized_keywords` if no results.

---

## Decision Outcome

**Chosen option: Option C — Pure Node.js streaming regex grep**, with MiniSearch used optionally as a file pre-filter when the keyword is a plain term (not a regex).

### Rationale

The primary concern is **cross-platform reliability and zero install-time surprises**. Option C has no binary, no download, no optional dependencies, and identical behaviour on all platforms. The regex engine is the exact same syntax agents already know from ripgrep and grep — so the `keywords` parameter can advertise full regex support transparently.

OR syntax (`auth|login`), anchors (`^##`), wildcards (`use.*Hook`), and character classes are all native JavaScript regex — no ripgrep needed for this.

MiniSearch (already present in `node_modules`) serves purely as an **optional performance optimisation** for large docsets: rank the most relevant files first, then grep only those. It is not required for correctness and degrades gracefully.

### Positive Consequences

- Zero new mandatory dependencies
- No `postinstall` network call; works in air-gapped environments
- Full regex syntax support including OR, lookaheads, anchors
- Grep-style output (file:line:content) that agents understand natively
- ~23ms per query on tested docset (46 files / 200KB)

### Negative Consequences

- No built-in fuzzy matching for misspellings (agents are expected to use `generalized_keywords` for broader fallback terms)
- On very large docsets (thousands of files, hundreds of MB), pure streaming is slower than an indexed search; acceptable for the expected docset size range

---

## Pugh Matrix

**Scoring:** −1 = worse than baseline, 0 = same as baseline, +1 = better than baseline  
**Baseline:** Option A (`@vscode/ripgrep`)

> Each score is multiplied by its criterion weight; column totals are weighted sums.

| Criterion                                 | Weight | A (Baseline) | B (MiniSearch hybrid) | C (Node.js regex) |
| ----------------------------------------- | :----: | :----------: | --------------------- | ----------------- |
| Cross-platform reliability                |   5    |      0       | +1 × 5 = **+5**       | +1 × 5 = **+5**   |
| Search expressiveness (OR, regex, fuzzy)  |   4    |      0       | +1 × 4 = **+4** ¹     | 0 × 4 = **0** ²   |
| Installation footprint                    |   4    |      0       | +1 × 4 = **+4**       | +1 × 4 = **+4**   |
| Result precision (line numbers + context) |   4    |      0       | 0 × 4 = **0** ³       | +1 × 4 = **+4**   |
| Maintenance burden                        |   3    |      0       | +1 × 3 = **+3**       | +1 × 3 = **+3**   |
| No new dependencies                       |   3    |      0       | 0 × 3 = **0** ⁴       | +1 × 3 = **+3**   |
| Cold-start latency                        |   2    |      0       | −1 × 2 = **−2** ⁵     | +1 × 2 = **+2**   |
| **Weighted total**                        | **25** |    **0**     | **+14**               | **+21**           |

**Notes:**

¹ MiniSearch adds fuzzy and prefix matching on top of regex, scoring better than ripgrep's exact-match default.  
² Node regex supports OR/anchors/wildcards fully; it does not do fuzzy. Scored same as baseline because ripgrep also doesn't do fuzzy by default.  
³ MiniSearch produces document-level results only — no line numbers without a subsequent line-grep step. Parity with baseline.  
⁴ MiniSearch is already present in `node_modules` but is not a declared direct dependency of `@codemcp/knowledge-core`; it must be added explicitly, so this is not a clean win.  
⁵ Building the MiniSearch index takes ~44–64ms on the tested 46-file docset. For the first call per session this is a penalty vs ripgrep's stateless spawn.

### Benchmark data (measured on local dev machine, 2026-03-10)

Docset: `vitepress-docs` — 46 files, ~200 KB of text

| Approach                     | Cold start                    | Query                                     | Line numbers |
| ---------------------------- | ----------------------------- | ----------------------------------------- | ------------ |
| `@vscode/ripgrep` spawn      | ~0ms (binary already running) | ~5–15ms                                   | ✅           |
| MiniSearch build + query     | 44–64ms                       | 2ms (doc-level) + 10ms (line-grep top 10) | ✅ (hybrid)  |
| Node.js streaming regex grep | —                             | **23ms** (all files)                      | ✅           |

All three options are well within an acceptable latency budget for this use case.

---

## Options Detail

### Option A — `@vscode/ripgrep`

**How it works:** `npm install @vscode/ripgrep` triggers a `postinstall` script that calls `node ./lib/postinstall.js`. This script fetches the correct platform binary (e.g. `ripgrep-v15.0.0-aarch64-apple-darwin.tar.gz`) from `https://github.com/microsoft/ripgrep-prebuilt/releases`, extracts it, and places `rg` in `node_modules/@vscode/ripgrep/bin/rg`. The JS wrapper (`ripgrep-js` or custom) then calls `child_process.spawn(rgPath, [...args])`.

**Size:**

| Component                                               | Size                                  |
| ------------------------------------------------------- | ------------------------------------- |
| `@vscode/ripgrep` JS + deps (yauzl, https-proxy-agent…) | 452 KB installed                      |
| `rg` binary (macOS ARM64)                               | **4.3 MB**                            |
| `rg` binary (Linux x86-64 compressed)                   | ~1.9 MB compressed / ~5+ MB extracted |
| **Total on disk**                                       | ~4.8 MB                               |

**Critical risk:** The `postinstall` download will **silently fail or error** in:

- Air-gapped / corporate environments without access to `github.com`
- CI systems where GitHub API rate limits are hit
- Environments where `GITHUB_TOKEN` is not set and rate limiting applies

When the download fails, `rgPath` resolves to a non-existent file and every `search_docs` call throws at runtime.

---

### Option B — MiniSearch hybrid

**How it works:** On first `search_docs` call for a given docset, build a MiniSearch index by reading all files. Cache the index in the server's memory keyed by `docset_id`. On subsequent calls, use the cached index to identify the top-N ranked files, then do a streaming line-by-line regex grep on those files.

**Pros:** Fuzzy matching (`fronmattr` → `frontmatter`), prefix matching (`auth` → `authentication`), ranked results.  
**Cons:** Index must be rebuilt if docset is re-initialized; adds state to the server; MiniSearch results are document-level and require a second grep pass for line numbers; 44–64ms cold start.

---

### Option C — Pure Node.js streaming regex grep (chosen)

**How it works:**

1. Walk the docset directory with `fs.promises.readdir` (recursive, or via a `walk` generator).
2. Skip binary files by checking the first 8 KB for null bytes.
3. Skip ignored paths: `node_modules/`, `.git/`, `dist/`, `build/`, `.agentic-metadata.json`.
4. For each text file, open a `readline` stream and test each line against `new RegExp(keywords, 'i')`.
5. Collect matches with 2 lines of before/after context.
6. Cap results at 50 matches; set `truncated: true` if cap is hit.
7. If 0 matches and `generalized_keywords` is provided, repeat with that pattern.

**Syntax advertised to agents:**

```
Supports full regex syntax (e.g. "log.*Error", "function\s+\w+", "auth|login").
Filter by file pattern with include parameter (e.g. "*.md", "*.ts").
Use generalized_keywords for broader synonyms if primary pattern returns no results.
```

This syntax is identical to ripgrep's default regex mode — agents that know ripgrep will use it correctly without any learning curve.

---

## Links

- [MiniSearch documentation](https://lucaong.github.io/minisearch/)
- [microsoft/ripgrep-prebuilt releases](https://github.com/microsoft/ripgrep-prebuilt/releases)
- [@vscode/ripgrep source](https://github.com/microsoft/vscode-ripgrep)
- [Nygard ADR template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md)
