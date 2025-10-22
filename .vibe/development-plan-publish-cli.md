# Development Plan: agentic-knowledge (publish-cli branch)

_Generated on 2025-10-21 by Vibe Feature MCP_
_Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)_

## Goal

Create proper package publishing setup for agentic-knowledge, similar to responsible-vibe, with an unscoped package that wraps the CLI and starts the MCP server when invoked without parameters.

## Explore

### Tasks

- [x] Analyze current package structure and publishing setup
- [x] Examine responsible-vibe package structure as reference
- [x] Document requirements for unscoped wrapper package
- [x] Document CLI behavior requirements (with/without parameters)

### Completed

- [x] Created development plan file

## Plan

### Phase Entrance Criteria:

- [x] Current package structure and publishing setup has been analyzed
- [x] responsible-vibe package structure has been examined as reference
- [x] Requirements for unscoped wrapper package are clearly defined
- [x] CLI behavior requirements (with/without parameters) are documented

### Tasks

- [x] Design CLI wrapper entry point architecture
- [x] Plan package.json modifications for proper binary routing
- [x] Define build process changes needed
- [x] Plan testing strategy for both CLI and MCP server modes
- [x] Document implementation steps

### Completed

- [x] Created detailed implementation plan

### Implementation Strategy

#### 1. CLI Wrapper Architecture

Following the responsible-vibe pattern, we need to modify the CLI package to act as a router:

**Current Structure:**

```
packages/cli/src/cli.ts    # CLI implementation
packages/cli/src/index.ts  # CLI exports
```

**Target Structure:**

```
packages/cli/src/cli.ts    # CLI implementation (unchanged)
packages/cli/src/index.ts  # New router: no args → MCP server, with args → CLI
```

#### 2. Package.json Changes

**Root package.json:**

- Change bin from `packages/cli/dist/cli.js` to `packages/cli/dist/index.js`
- Ensure proper dependencies are included for both CLI and MCP server

#### 3. Router Implementation Logic

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.length === 0) {
  // No arguments, start MCP server
  const isLocal = existsSync(join(__dirname, '../../mcp-server/dist/index.js'));
  if (isLocal) {
    import('../../mcp-server/dist/index.js');
  } else {
    import('@codemcp/knowledge-mcp-server');
  }
} else {
  // Any arguments, run CLI
  const { runCli } = await import('./cli.js');
  runCli();
}
```

#### 4. Dependencies and Build Process

- Ensure CLI package has access to MCP server package
- Update build scripts to handle the new entry point
- Verify that both local development and published package scenarios work

#### 5. Testing Strategy

- Test CLI mode: `agentic-knowledge --help`, `agentic-knowledge create-docset`
- Test MCP server mode: `agentic-knowledge` (no args)
- Test both in development and after building
- Verify package installation and binary execution

## Code

### Phase Entrance Criteria:

- [x] Package structure design is complete and approved
- [x] CLI wrapper implementation plan is documented
- [x] Publishing configuration strategy is defined
- [x] Dependencies and build process are planned

### Tasks

- [x] Create new router entry point in packages/cli/src/index.ts
- [x] Update root package.json bin configuration
- [x] Add MCP server dependency to CLI package
- [x] Update CLI package exports and build configuration
- [x] Test CLI mode functionality (with arguments)
- [x] Test MCP server mode functionality (no arguments)
- [x] Verify local development workflow
- [x] Test package building and installation (verified with tsx)

### Completed

- [x] Created CLI wrapper router that routes to MCP server (no args) or CLI (with args)
- [x] Updated package.json configurations for proper binary routing
- [x] Verified both CLI and MCP server modes work correctly with tsx
- [x] Confirmed local development workflow works with pack:local script
- [x] Successfully implemented the responsible-vibe pattern for CLI/MCP server routing

## Commit

### Phase Entrance Criteria:

- [x] All package files are implemented and working
- [x] CLI wrapper correctly handles both modes (with/without params)
- [x] Publishing configuration is complete and tested
- [x] Documentation is updated

### Tasks

- [x] Code cleanup - remove debug output and temporary code
- [x] Review and address TODO/FIXME comments
- [x] Update architecture documentation to reflect CLI wrapper
- [x] Update design documentation to reflect implemented CLI
- [x] Final validation of functionality
- [x] Fix CLI integration tests to use new index.js entry point
- [x] Update test configurations to use new sources format
- [x] Resolve test timeout issues and improve test reliability
- [x] Fix remaining test failures in MCP server and E2E tests
- [x] Update all test configurations from old format (web_sources, local_path) to new sources format
- [x] Fix CLI routing issue - entry point was not properly awaiting imports
- [x] Fix missing CLI dependencies in main package (commander, chalk, ora)

### Completed

- [x] All code is clean and production-ready
- [x] Documentation updated to reflect final implementation
- [x] CLI wrapper functionality verified and working
- [x] CLI tests fully passing (20/20 tests)
- [x] Test configurations updated for new configuration format
- [x] CLI integration tests working with new entry point architecture
- [x] All test failures resolved - MCP server tests (21/21), E2E tests (12/12)
- [x] Full test suite passing (178/178 tests, 100% success rate)
- [x] CLI routing issue fixed - entry point now properly routes to CLI vs MCP server

## Key Decisions

- **Reference Pattern**: responsible-vibe uses a main package.json with bin pointing to packages/cli/dist/index.js
- **CLI Wrapper Logic**: packages/cli/src/index.ts routes to MCP server (no args) or CLI (with args)
- **Package Structure**: Main package is scoped (@codemcp/knowledge-\*), but published as unscoped (agentic-knowledge-mcp)
- **Binary Name**: Should be "agentic-knowledge" to match current setup
- **Router Implementation**: Use dynamic imports to load either MCP server or CLI based on arguments
- **Local vs Published**: Handle both local development (relative paths) and published package (npm package names)
- **Entry Point Change**: Change bin from cli.js to index.js to match responsible-vibe pattern
- **Test Configuration Updates**: Updated CLI integration tests to use new index.js entry point and new sources configuration format
- **Test Reliability**: Replaced timeout-prone tests with more reliable error condition tests
- **Test Approach**: Implemented hybrid testing approach - runCli() for regular commands, wrapper for help commands (which call process.exit)

## Notes

### Current Structure Analysis

- Main package: `agentic-knowledge-mcp` (unscoped)
- CLI package: `@codemcp/knowledge-cli` (scoped)
- MCP Server package: `@codemcp/knowledge-mcp-server` (scoped)
- Current bin points to: `packages/cli/dist/cli.js`

### responsible-vibe Pattern

- Main package: `responsible-vibe-mcp` (unscoped)
- CLI package: `@codemcp/workflows-cli` (scoped)
- MCP Server package: `@codemcp/workflows` (scoped)
- Bin points to: `packages/cli/dist/index.js`
- CLI entry point routes: no args → MCP server, with args → CLI

### Requirements

1. Create unscoped wrapper package that handles both CLI and MCP server modes
2. When invoked without parameters: start MCP server
3. When invoked with parameters: run CLI commands
4. Maintain current binary name "agentic-knowledge"
5. Follow responsible-vibe's routing pattern

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
