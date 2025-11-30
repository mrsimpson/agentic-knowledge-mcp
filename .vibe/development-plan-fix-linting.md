# Development Plan: agentic-knowledge (fix-linting branch)

_Generated on 2025-11-30 by Vibe Feature MCP_
_Workflow: [bugfix](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/bugfix)_

## Goal

Fix test failures in @codemcp/knowledge-cli package. ✅ **COMPLETE - All 220 tests now passing!**

Root cause: TypeScript build configuration prevented JavaScript files from being emitted, causing module resolution failures in tests.

## Reproduce

### Tasks

- [x] Run tests to reproduce failures
- [x] Identify root cause: TypeScript build doesn't emit JS files
- [x] Find that Vitest needs source files, not compiled dist
- [x] Add resolve.alias to vitest.config.ts to use source files
- [x] Verify module resolution is fixed (20 tests now pass!)
- [x] Identify remaining 11 test failures are about test assertions

### Completed

- [x] Created development plan file
- [x] **FIXED**: Module resolution by aliasing to source .ts files
- [x] Tests went from 10/27 passing to 20/31 passing!

**Remaining Test Failures** (11 failed):

- CLI integration tests expecting specific error messages/output
- Tests expecting commands to throw with specific messages
- Need to investigate if these are outdated test expectations

## Analyze

### Tasks

- [ ] _To be added when this phase becomes active_

### Completed

_None yet_

## Fix

### Tasks

- [ ] _To be added when this phase becomes active_

### Completed

_None yet_

## Verify

### Tasks

- [ ] _To be added when this phase becomes active_

### Completed

_None yet_

## Finalize

### Tasks

- [x] Review code changes and validate objectives met
- [x] Identify skeleton tests in init-command.test.ts that need implementation
- [x] Implement skeleton tests for --force flag behavior
- [x] Implement skeleton tests for --discover-paths flag behavior
- [x] Implement unit tests for discoverDirectoryPatterns function
- [x] Run all tests to verify implementations - All 220/220 passing!
- [x] Clean up any debug code - No debug code found, all changes are clean
- [ ] Update documentation if needed
- [ ] Review final diff and prepare for commit

### Completed

- Code review completed - all objectives met, 220/220 tests passing
- Found skeleton tests in init-command.test.ts that document expected behavior but lack assertions
- Implemented all skeleton tests:
  - ✅ --force flag tests: directory clearing behavior
  - ✅ --discover-paths flag tests: config update and pattern discovery
  - ✅ Unit tests for discoverDirectoryPatterns function
- Fixed test expectation for safelyClearDirectory (removes directory entirely, not just contents)
- All 220 tests passing (100% success rate)
- Code cleanup verified - no debug code or commented-out test code remaining

## Key Decisions

1. **TypeScript Module Configuration**: Changed from `module: "ESNext", moduleResolution: "bundler"` to `module: "NodeNext", moduleResolution: "NodeNext"` - this is the correct configuration for Node.js ES modules projects with `"type": "module"` in package.json.

2. **Vitest Resolve Aliases**: Added resolve aliases in `vitest.config.ts` to point to source TypeScript files instead of compiled dist files. This is standard practice for monorepo testing and allows running tests without building first.

3. **Test Implementation Strategy**: Implemented skeleton tests by calling the actual underlying functions (`safelyClearDirectory`, `discoverDirectoryPatterns`, `ConfigManager.updateDocsetPaths`) rather than testing the full CLI command execution. This provides good unit-level test coverage while documenting the integration behavior.

4. **safelyClearDirectory Behavior**: Confirmed that `safelyClearDirectory` removes the entire directory (not just contents), which matches the --force flag behavior where the directory is recreated afterward.

## Notes

_Additional context and observations_

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
