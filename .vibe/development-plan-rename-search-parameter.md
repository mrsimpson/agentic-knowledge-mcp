# Development Plan: agentic-knowledge (rename-search-parameter branch)

_Generated on 2026-03-26 by Vibe Feature MCP_
_Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)_

## Goal

Improve agent UX for the `search_docs` MCP tool. Agents currently misuse the tool by sending space-delimited keyword lists (e.g., "user authentication login") instead of regex patterns (e.g., "user|auth|login"). This causes failed searches and wasted round-trips.

**Final Scope (simplified):**

1. ✅ Rename `keywords` → `pattern` (strongest signal for regex)
2. ✅ Remove `fallback_pattern` entirely — agents can refine patterns based on no-match hints
3. ✅ Change `context_lines` default from 0 → 2 (reduce round-trips)
4. ✅ Add recovery guidance to no-match responses (actionable feedback)
5. ✅ Surface invalid regex as warning (transparency)
6. ✅ Make truncated message actionable (guide narrowing)
7. ✅ Update internal types to stay in sync

**Out of scope:** Exposing `include` filter to agents (intentionally internal for now)

## Explore

<!-- beads-phase-id: TBD -->

### Tasks

_Tasks managed via `bd` CLI_

## Plan

<!-- beads-phase-id: TBD -->

### Tasks

_Tasks managed via `bd` CLI_

## Code

<!-- beads-phase-id: TBD -->

### Tasks

_Tasks managed via `bd` CLI_

## Commit

<!-- beads-phase-id: TBD -->

### Tasks

_Tasks managed via `bd` CLI_

## Key Decisions

- **Parameter naming:** Use `pattern` (not `regex` or `query`) — familiar from grep/ripgrep, signals single expression without being intimidating
- **Removed fallback_pattern:** The no-match recovery guidance makes a separate fallback parameter redundant — agents can simply refine their pattern using the suggested techniques (|, .\*, etc.)
- **Default context_lines:** 2 lines before/after — enough for understanding, not overwhelming
- **Recovery guidance style:** Concise, actionable hints inline with the no-match message
- **Backward compatibility:** This is a breaking change to the MCP tool schema, but acceptable since tool is new

## Notes

**Implementation complete** — All 265 tests passing. Changes:

1. Renamed `keywords` → `pattern` in MCP schema, handler, types, and all tests
2. Completely removed `fallback_pattern` / `fallbackPattern` from the API
3. Changed `DEFAULT_CONTEXT_LINES` from 0 to 2
4. Added comprehensive no-match hints with regex tips (`|`, `.*`, `\b`, etc.)
5. Added warning when invalid regex is auto-escaped to literal
6. Made truncated message actionable (suggests narrowing pattern)

---

_This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management._
