# Development Plan: agentic-knowledge (actually-search branch)

_Generated on 2026-03-10 by Vibe Feature MCP_
_Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)_

## Goal

Replace the current `search_docs` tool behavior — which only returns instructions/hints on _where_ to search — with an implementation that **actually performs the search** and returns matching results directly. The interface should be grep/ripgrep-like (pattern + path + options), cross-platform-compatible, and built on an established file-search library.

---

## Explore

<!-- beads-phase-id: agentic-knowledge-1.1 -->

### Findings

**Current behavior:**

- `search_docs` resolves the local path of the requested docset, renders an instruction template (e.g. "Use available text search tools to search for `{{keywords}}` in `{{local_path}}`…"), and returns a `SearchDocsResponse` containing those instructions plus the path.
- The agent then has to perform the grep itself using whatever tool it has.

**Target behavior:**

- `search_docs` should actually grep/search through the docset files and return matching results (file, line number, line content, surrounding context) directly.
- The parameters (`keywords`, `generalized_keywords`) map naturally to primary pattern + fallback/broader patterns.
- Result format should be grep-like: `file:line:content` plus optionally context lines.

**Code locations to change:**

- `packages/mcp-server/src/server.ts` — the `search_docs` case in `CallToolRequestSchema` handler: currently calls `processTemplate` + `createStructuredResponse`; needs to call a new search function instead.
- `packages/core/src/` — a new `search/` module (or `searcher.ts`) should encapsulate the actual search logic, keeping the MCP server thin.
- `packages/core/src/types.ts` — `SearchDocsResponse` needs new fields (results array) or a new type.

**Library evaluation:**

| Library                              | Cross-platform       | Approach                    | Notes                                                                                               |
| ------------------------------------ | -------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| `fast-glob`                          | ✅                   | Glob-based file listing     | Already a transitive dep; good for listing files but not searching content                          |
| `minisearch`                         | ✅                   | Full-text index (in-memory) | **Already in node_modules!** Fuzzy + prefix matching; document-level results only (no line numbers) |
| `micromatch`                         | ✅                   | Pattern matching only       | Not a content searcher                                                                              |
| `ripgrep-js`                         | ✅ (ships rg binary) | Wraps ripgrep binary        | Requires a binary; not purely cross-platform JS                                                     |
| `@vscode/ripgrep`                    | ✅                   | Downloads rg binary         | Same issue; large download                                                                          |
| Node.js built-ins (`fs`, `readline`) | ✅                   | Pure Node streams           | No extra dep; sufficient for line-by-line regex search                                              |

**Benchmarks on real docset (46 files / 200KB):**

| Approach                                     | Cold start    | Query    | Line numbers   | Fuzzy/prefix |
| -------------------------------------------- | ------------- | -------- | -------------- | ------------ |
| Streaming regex grep (Node built-ins only)   | —             | 23ms     | ✅             | ❌           |
| MiniSearch full-text index                   | 44–64ms build | 2ms      | ❌ (doc-level) | ✅           |
| **Hybrid: MiniSearch → line-grep top files** | 44–64ms build | **10ms** | ✅             | ✅           |

**Decision: Hybrid approach — MiniSearch (already present) + streaming line-grep.**

- MiniSearch ranks the top-N most relevant files using TF-IDF + fuzzy + prefix matching
- A line-by-line regex grep on those top files extracts exact line numbers and context
- Falls back to full streaming grep if MiniSearch returns 0 results (safety net for regex special chars, etc.)
- No new dependencies needed — `minisearch` is already in `node_modules`
- Index is built per-request and cached per docset in the server (mirrors existing `configCache` pattern)

**Does it need indexing?** Yes, but cheaply. At 44–64ms for a small docset, the index build is acceptable and only happens once per session (cached). For large docsets (thousands of files), MiniSearch pre-filtering saves significant line-grep work.

**API / interface design:**

- Input: `keywords` (primary term/phrase), `generalized_keywords` (optional fallback), `docset_id`
- Search strategy:
  1. MiniSearch search with `{ prefix: true, fuzzy: 0.2, combineWith: 'AND' }` → ranked file list
  2. Line-grep top-10 files for exact line numbers + context
  3. If 0 results → retry with `generalized_keywords`
  4. If still 0 → fall back to streaming grep across all files
- Output (new `SearchDocsResult`):
  ```ts
  interface SearchMatch {
    file: string; // relative path within docset
    line: number; // 1-based line number
    content: string; // matched line content
    context_before: string[]; // N lines before match (default: 2)
    context_after: string[]; // N lines after match (default: 2)
  }
  interface SearchDocsResult {
    matches: SearchMatch[];
    total_matches: number;
    searched_files: number;
    used_keywords: string; // which keywords were actually used
    truncated: boolean; // true if results were capped at max
  }
  ```
- Max results cap: 50 matches to avoid overwhelming context windows
- File types: skip binary files (null-byte detection on first 8KB)

**What syntax to advertise in the tool description (keywords parameter):**

```
Primary search terms. Supports:
- Single words: "authentication"
- Phrases (all terms matched): "sidebar navigation"
- Prefix matching is automatic: "auth" finds "authentication"
- Typo-tolerant: minor misspellings are handled
- Use generalized_keywords for synonyms/broader terms as fallback
```

### Tasks

- [x] Explore codebase structure and understand current search_docs flow
- [x] Evaluate cross-platform file search libraries
- [x] Design the new search interface and result types

---

## Plan

<!-- beads-phase-id: agentic-knowledge-1.2 -->

### Phase Entrance Criteria:

- [x] The current `search_docs` behavior has been thoroughly understood (template → instructions, no actual search)
- [x] A cross-platform search library/approach has been chosen (hybrid: MiniSearch + streaming line-grep)
- [x] Benchmarks run on real docset; hybrid confirmed as best tradeoff
- [x] The new result types and search strategy are designed
- [x] Tool description syntax decided
- [x] Scope is clear: only `search_docs` changes; `list_docsets` and `init_docset` are untouched; template system remains but becomes optional/legacy

### Implementation Plan

1. **`packages/core/src/search/searcher.ts`** (new file)
   - `buildSearchIndex(rootPath: string): Promise<IndexedDocset>` — walks files, builds MiniSearch index
   - `searchDocset(index: IndexedDocset, keywords: string, options?: SearchOptions): Promise<SearchDocsResult>`
   - Falls back to full streaming grep when MiniSearch returns 0 results
   - Binary file detection (skip files with null bytes in first 8KB)
   - Ignore patterns: `node_modules/**`, `.git/**`, `dist/**`, `build/**`, `.agentic-metadata.json`

2. **`packages/core/src/types.ts`** (extend)
   - Add `SearchMatch`, `SearchDocsResult`, `SearchOptions`, `IndexedDocset` interfaces
   - Keep `SearchDocsResponse` for backward compatibility

3. **`packages/core/src/index.ts`** (export new search function + types)
   - Add `minisearch` as a direct dependency to `@codemcp/knowledge-core`'s `package.json`

4. **`packages/mcp-server/src/server.ts`** (update `search_docs` case)
   - Add per-docset index cache (Map keyed by `docset_id`, cleared when `init_docset` runs)
   - Remove template processing in `search_docs` handler
   - Call `buildSearchIndex` (or use cache), then `searchDocset(...)`
   - Format results as grep-like text: `file:line: content` with context
   - Update `keywords` parameter description to advertise fuzzy/prefix behavior

5. **`packages/core/src/__tests__/searcher.test.ts`** (new test file)
   - Unit tests with a temp directory of fixture files

6. **`packages/mcp-server/src/__tests__/server.test.ts`** (update existing tests)
   - Update assertions from instruction strings to search result content

### Tasks

- [ ] Add `minisearch` as direct dep to `@codemcp/knowledge-core`
- [ ] Implement `packages/core/src/search/searcher.ts`
- [ ] Extend `packages/core/src/types.ts` with new result types
- [ ] Export new search from `packages/core/src/index.ts`
- [ ] Update `packages/mcp-server/src/server.ts` search_docs handler + tool description
- [ ] Write tests for the searcher module
- [ ] Update existing server tests
- [ ] Build and verify TypeScript compiles

---

## Code

<!-- beads-phase-id: agentic-knowledge-1.3 -->

### Phase Entrance Criteria:

- [x] All plan items are defined with clear file targets
- [x] New types are designed (`SearchMatch`, `SearchDocsResult`, `SearchOptions`)
- [x] The fallback strategy (keywords → generalized_keywords) is agreed upon
- [x] Test approach is clear (unit tests with temp dir fixtures)

### Tasks

_Tasks managed via `bd` CLI_

---

## Commit

<!-- beads-phase-id: agentic-knowledge-1.4 -->

### Phase Entrance Criteria:

- [ ] All search functionality is implemented and building without errors
- [ ] Tests pass for the new searcher module
- [ ] The `search_docs` MCP tool returns actual file matches (not instruction strings)
- [ ] Existing tests are updated to reflect new behavior
- [ ] No regressions in `list_docsets` and `init_docset`

### Tasks

- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then, Create a conventional commit. In the message, first summarize the intentions and key decisions from the development plan. Then, add a brief summary of the key changes and their side effects and dependencies

_Tasks managed via `bd` CLI_

---

## Key Decisions

- **Hybrid search: MiniSearch + streaming line-grep**: MiniSearch (already in node_modules, no new dep) ranks the most relevant files; line-grep on those top files extracts exact line numbers and context. Falls back to full streaming grep if MiniSearch returns 0 results.
- **No new binary dependencies**: all pure Node.js / JS — works identically on Windows/macOS/Linux without installing ripgrep or any native binary
- **Index caching**: index built once per docset per server session (mirrors existing `configCache` pattern), cleared on `init_docset` call
- **Fallback strategy**: `keywords` → if 0 results and `generalized_keywords` provided, retry with those → if still 0, full streaming grep fallback
- **Result cap**: max 50 matches to keep MCP responses manageable; `truncated: true` flag signals when cap was hit
- **Binary file detection**: skip files with null bytes in the first 8KB chunk
- **Tool description syntax**: advertise fuzzy/prefix matching on `keywords`; `generalized_keywords` is a broader fallback, not a regex syntax feature
- **Keep template system**: existing templates remain in core but are no longer used by the MCP server's `search_docs` handler (could be removed later or repurposed)

## Notes

- `minisearch` is already present in the root `node_modules` (it's a dependency of `responsible-vibe-mcp` or similar). It needs to be added as an explicit direct dependency to `@codemcp/knowledge-core/package.json`.
- The MCP `structuredContent` response used today returns a `SearchDocsResponse` object. The new handler should return `content: [{ type: "text", text: formattedResults }]` for maximum compatibility with MCP clients.
- The `packages/content-loader/` package is not affected.
- MiniSearch tokenizes on whitespace and punctuation; camelCase (`useData`), dotted paths (`sidebar.items`), and `$prefixed` terms all work reasonably well with the default tokenizer.

---

_This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management._
