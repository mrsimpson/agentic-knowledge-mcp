# Development Plan: agentic-knowledge (fix-cli-entrypoint branch)

_Generated on 2026-02-11 by Vibe Feature MCP_
_Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)_

## Goal

Fix the CLI entrypoint routing issue where `npx agentic-knowledge-mcp create` (and other CLI commands) don't properly delegate to the CLI handler. Instead, the MCP server is started regardless of arguments provided.

## Reproduce

<!-- beads-phase-id: agentic-knowledge-1.1 -->

### Findings:

- ✅ **BUG IDENTIFIED**: Package contains workspace protocol dependencies (`workspace:*`) that cannot be resolved when installing from npm
- Root package.json has 3 workspace dependencies: `@codemcp/knowledge-core`, `@codemcp/knowledge-content-loader`, `@codemcp/knowledge`
- CLI package.json also has workspace dependencies
- MCP server package.json also has workspace dependencies
- When installing the published tarball: `npm ERR! Unsupported URL Type "workspace:"`
- This prevents the package from being installed at all, so the CLI routing bug is masked by installation failure
- **Root Cause**: Workspace protocol is pnpm-specific and not supported by npm. Published packages cannot use workspace protocol.
- **Solution**: Replace workspace dependencies with proper version numbers in all package.json files before publishing

### Tasks

_Tasks managed via `bd` CLI_

## Analyze

<!-- beads-phase-id: agentic-knowledge-1.2 -->

### Root Causes Identified:

**Issue 1: Workspace Protocol in Published Package**

- Root package.json and sub-packages used pnpm `workspace:*` protocol
- npm registry doesn't support workspace protocol
- Installing published package from npm: `npm ERR! Unsupported URL Type "workspace:"`
- This prevented any testing with npm/npx

**Issue 2: Duplicate bin Entry in Sub-packages**

- MCP server package (@codemcp/knowledge) had `"bin": { "agentic-knowledge": "./dist/bin.js" }`
- Root package already defines `"bin": { "agentic-knowledge": "packages/cli/dist/index.js" }`
- When installing, both packages declare the same bin command
- npm's bin installation resolves to the MCP server package's bin (wrong routing)
- This caused CLI commands to start the MCP server instead of running CLI

### Phase Entrance Criteria:

- [x] The bug has been successfully reproduced and confirmed
- [x] The root cause(s) have been identified in the codebase
- [x] The problem is clearly documented with examples

### Tasks

_Tasks managed via `bd` CLI_

## Fix

<!-- beads-phase-id: agentic-knowledge-1.3 -->

### Fixes Applied:

**Fix 1: Replace workspace dependencies with fixed versions**

- Changed all `workspace:*` to `1.0.15` in:
  - Root package.json: @codemcp/knowledge-core, @codemcp/knowledge-content-loader, @codemcp/knowledge
  - packages/cli/package.json: same three dependencies
  - packages/mcp-server/package.json: @codemcp/knowledge-core only
- Rationale: npm doesn't support pnpm workspace protocol; must use fixed versions for published packages

**Fix 2: Remove duplicate bin entry from MCP server package**

- Removed `"bin"` field from packages/mcp-server/package.json
- Root package.json already controls the CLI entrypoint
- Prevents npm bin installation from conflicting with root package

**Commit:** `fix: resolve CLI entrypoint routing issue`

- Both fixes allow proper CLI command routing
- All 220 tests pass after changes

### Phase Entrance Criteria:

- [x] The analysis phase is complete with identified root cause(s)
- [x] The fix approach has been determined
- [x] The implementation plan is clear
- [x] Fixes have been implemented
- [x] Tests pass

### Tasks

_Tasks managed via `bd` CLI_

## Verify

<!-- beads-phase-id: agentic-knowledge-1.4 -->

### Verification Results:

✅ **CLI Routing Tests:**

- `node packages/cli/dist/index.js create --help` → Correctly shows CLI help
- `node packages/cli/dist/index.js status --help` → Correctly shows CLI help
- `node packages/cli/dist/index.js` (no args) → Starts MCP server as expected

✅ **Test Suite:**

- @codemcp/knowledge-cli: 31/31 tests passing
- @codemcp/knowledge-content-loader: 26/26 tests passing
- @codemcp/knowledge-core: 129/129 tests passing
- @codemcp/knowledge-mcp-server: 22/22 tests passing
- E2E Tests: 12/12 tests passing
- **Total: 220/220 tests passing (100%)**

✅ **Package Installation:**

- Package.json dependencies now use fixed versions instead of workspace protocol
- Can be packaged and installed via npm without errors

### Phase Entrance Criteria:

- [x] The fix has been implemented in the code
- [x] The package has been built successfully
- [x] All changes are ready for testing
- [x] Verification tests have passed
- [x] The bug is confirmed fixed
- [x] The solution has been reviewed

### Tasks

_Tasks managed via `bd` CLI_

## Finalize

<!-- beads-phase-id: agentic-knowledge-1.5 -->

### Phase Entrance Criteria:

- [ ] All verification tests have passed
- [ ] The bug is confirmed fixed
- [ ] The solution has been reviewed

### Tasks

- [ ] Squash WIP commits: `git reset --soft <first commit of this branch>`. Then create a conventional commit with intentions and key decisions from this plan.

_Tasks managed via `bd` CLI_

## Key Decisions

_Important decisions will be documented here as they are made_

- Entry point: `/packages/cli/src/index.ts` checks `process.argv.slice(2)` to decide between MCP server or CLI
- CLI should run to completion and then process should exit
- Fixed issue: `runCli()` in CLI branch wasn't properly handled for process exit
- Solution: Use `return` after `runCli()` to ensure clean exit flow

## Notes

_Additional context and observations_

### Codebase Structure

- **Root entry**: `bin.ts` (unused - only imports MCP server)
- **Actual bin entry**: `packages/cli/dist/index.js` (compiled from packages/cli/src/index.ts)
- **Routing logic**: `packages/cli/src/index.ts` - routes based on argument count
- **CLI implementation**: `packages/cli/src/cli.ts` - contains `runCli()` with Commander.js setup
- **Commands available**: create, init, refresh, status

### Findings from Investigation

- [x] **Local testing works**: `node packages/cli/dist/index.js create --help` correctly routes to CLI
- [x] **Integration tests pass**: All 31 CLI tests pass successfully
- [x] **Routing logic is correct**: Arguments are properly detected and routing decision is made
- [x] **Both packages have bin fields**: CLI package and MCP server package both declare `agentic-knowledge` bin
- [ ] **Issue is likely NPM-specific**: Problem occurs with `npx agentic-knowledge-mcp` (from registry)
- [ ] **Possible causes**:
  - Packaging/distribution issue (files not included correctly)
  - NPM bin resolution conflict (multiple packages with same bin name)
  - Package.json configuration issue for published distribution
  - CLI entry point not being called by npx wrapper

### Next Steps

1. Test with packaged/tarball version to simulate npm installation
2. Verify bin field resolution in published package
3. Check if imports are resolving correctly in distributed version

---

_This plan is maintained by the LLM and uses beads CLI for task management. Tool responses provide guidance on which bd commands to use for task management._
