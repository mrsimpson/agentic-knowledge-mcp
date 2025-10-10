# Development Plan: agentic-knowledge (load-docs branch)

_Generated on 2025-10-09 by Vibe Feature MCP_
_Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)_

## Goal

Add a feature to create docsets by loading documentation from the web. This will extend the current local filesystem-based agentic knowledge system to support web-based documentation sources, allowing users to configure docsets that can fetch and cache documentation from URLs.

## Explore

### Tasks

- [x] Analyze existing codebase structure and patterns
- [x] Understand current configuration system (`DocsetConfig`, `KnowledgeConfig`)
- [x] Review MCP server implementation and tool interface
- [x] Examine template processing and instruction generation
- [x] Define web loading requirements and use cases
- [x] Identify integration points for web loading functionality
- [x] Analyze security considerations for web content loading
- [x] Document technical constraints and limitations

### Completed

- [x] Created development plan file

## Plan

### Phase Entrance Criteria:

- [x] Existing codebase structure is understood
- [x] Current documentation loading mechanisms are analyzed
- [x] Web loading requirements are clearly defined
- [x] Technical constraints and limitations are identified
- [x] Integration points with existing system are documented

### Tasks

- [x] Review existing architecture and design documents
- [x] Design configuration schema extension for web sources
- [x] Design content loading and processing architecture
- [x] Plan CLI interface for initialize/refresh operations
- [x] Design metadata management system
- [x] Plan integration with existing MCP server
- [x] Design error handling for web loading scenarios
- [x] Plan testing strategy for web loading features

### Completed

- [x] Comprehensive implementation plan created with 5 development phases
- [x] Configuration schema extension designed with backward compatibility
- [x] New core components architecture planned (ContentLoader, MetadataManager, etc.)
- [x] CLI interface design following existing patterns
- [x] Security and error handling strategies defined

## Code

### Phase Entrance Criteria:

- [x] Implementation strategy is clearly defined
- [x] Architecture and design decisions are documented
- [x] Technical approach for web loading is planned
- [x] Dependencies and integration points are identified
- [x] Test strategy is defined

### Tasks

#### Phase 1: Core Type Extensions

- [x] Extend `DocsetConfig` interface with optional `web_sources` field
- [x] Create `WebSourceConfig` interface with URL, type, and options
- [x] Add `WebSourceType` enum (git_repo, documentation_site, api_documentation)
- [x] Add metadata types (`WebSourceMetadata`, `DocsetMetadata`)
- [x] Add new error types (WEB_SOURCE_ERROR, GIT_REPO_ERROR, NOT_IMPLEMENTED)
- [x] Update configuration validation to handle web sources
- [x] Update existing tests for backward compatibility

#### Phase 2: Content Loading Infrastructure

- [x] Create abstract `ContentLoader` base class
- [x] **PRIORITY: Implement `GitRepoLoader` for Git repositories (GitHub, GitLab, any Git repo)**
- [x] Create stub `DocumentationSiteLoader` (throws NotImplementedError for now)
- [x] Create stub `ApiDocumentationLoader` (throws NotImplementedError for now)
- [x] Create `ContentProcessor` for content → Markdown conversion (focus on .md files initially)
- [x] Add URL validation and security checks

#### Phase 3: Metadata Management

- [x] Create `MetadataManager` class for `.agentic-metadata.json` handling
- [x] Implement metadata schema with versioning support
- [x] Add methods for reading/writing metadata files
- [x] Implement content change detection (hashing)
- [x] Add metadata validation and error recovery

#### Phase 4: Package Refactoring & CLI Interface

- [x] **ARCHITECTURE DECISION**: Create two new packages: `@codemcp/knowledge-content-loader` and `@codemcp/knowledge-cli`
- [x] Create `@codemcp/knowledge-content-loader` package structure
- [x] Move `content/` directory from core to content-loader package
- [x] Move web source types from core/types.ts to content-loader package
- [x] Update core package to remove web source dependencies and restore clean interfaces
- [x] Create `@codemcp/knowledge-cli` package structure
- [x] Implement CLI commands: `init`, `refresh`, `status`
- [x] Add progress indicators and error reporting to CLI
- [x] Update package.json workspace configuration
- [x] Update imports across all packages
- [x] Ensure all tests pass after refactoring
- [x] **CLI IMPLEMENTATION COMPLETE**: All three commands fully functional with real-world testing verified

#### Phase 6: Packaging & Publishing Setup

- [x] **PRIORITY: Setup monorepo packaging and publishing following responsible-vibe patterns**
- [x] Update root package.json with @codemcp/knowledge-\* naming and publishing config
- [x] Configure workspace package.json files with consistent versioning
- [x] Set up GitHub Actions release workflow with automated version bumping
- [x] Configure npm publishing with proper package structure
- [x] Add build and distribution scripts
- [x] Set up proper package exports and dependencies
- [x] Test packaging workflow with dry-run publish
- [x] Fixed TypeScript build issues by properly setting `noEmit: false` in build configs
- [x] **LOCAL INSTALLATION SOLUTION**: Created `scripts/prepare-local.cjs` to convert workspace dependencies to relative file paths
- [x] Added `pack:local` npm script for creating locally installable packages before npm publication
- [x] Document installation and usage instructions
- [x] **COMPLETED: Improved test output with clear summary**
  - [x] **CREATED**: `scripts/test-summary.js` - Provides clear summary of all 128 tests (116 package + 12 E2E)
  - [x] **UPDATED**: Root `package.json` to use new test summary script
  - [x] **VERIFIED**: All tests running with improved output showing success rate and individual package results
  - [x] **CONFIRMED**: E2E tests now properly detected and included in summary (12/12 tests)

#### Phase 5: Integration & Testing

- [x] **Update MCP server to handle docsets with web sources**
  - [x] **VERIFIED**: MCP server already supports web source configurations
  - [x] **CONFIRMED**: Path calculation correctly handles both web sources and local docsets
  - [x] **VALIDATED**: Web sources use standardized `.knowledge/docsets/{id}` paths
  - [x] **TESTED**: Local docsets continue using configured `local_path`
- [x] Add error handling for web loading failures
- [x] Implement graceful degradation when sources are unavailable
- [x] **PRIORITY: Replace terrible unit tests with behavior-driven tests**
  - [x] **DELETED**: Removed awful `types.test.ts` that only tested constants and static properties
  - [x] **CREATED**: `git-repo-loader.test.ts` - 11 behavior-driven tests for REQ-12 (Git Repository Loading)
  - [x] **CREATED**: Updated requirements documentation with REQ-11 through REQ-17 for web loading
  - [x] **VALIDATED**: All behavior-driven tests are now passing and test actual functionality
  - [x] **DOCUMENTED**: Added "Shameful Testing vs. Behavior-Driven Testing" decision to capture the lesson learned
- [x] **Write comprehensive E2E tests for MCP server web sources integration**
  - [x] **CREATED**: `web-sources.test.ts` - 6 E2E tests validating MCP server handles web sources correctly
  - [x] **VERIFIED**: MCP server returns proper standardized paths for web source docsets
  - [x] **VERIFIED**: MCP server continues using configured local_path for traditional docsets
  - [x] **TESTED**: Error handling and template processing work correctly with web sources
- [x] Write integration tests for CLI commands
- [ ] Add end-to-end tests with mock web sources

### Completed

**Phase 4: Package Refactoring & CLI Interface (✅ Complete)**

- Complete three-package architecture with `@codemcp/knowledge-core`, `@codemcp/knowledge-content-loader`, and `@codemcp/knowledge-cli`
- Full CLI implementation with all three commands working in production
- Real-world testing confirmed with existing docsets (295 total files processed)
- Comprehensive error handling, progress indicators, and user experience
- All 116 package tests passing across the codebase

**CLI Commands Implemented**:

- `init <docset-id>` - Initialize web sources from configuration (fully functional Git repository cloning)
- `refresh [docset-id]` - Incremental updates with metadata tracking and commit-based change detection
- `status [-v]` - Comprehensive status display with timing info, file counts, and source details

**Test Infrastructure Improvements**:

- **E2E Test Fix**: Fixed binary path in `test/utils/e2e-test-setup.ts` (all 12 E2E tests now passing)
- **Test Summary Script**: Created `scripts/test-summary.js` providing clear overview of all 128 tests
- **Improved Output**: Root `pnpm test` now shows clean summary instead of confusing turbo/vitest output
- **Complete Coverage**: All 116 package tests + 12 E2E tests properly detected and reported

- Complete monorepo packaging and publishing system implemented
- GitHub Actions workflow for automated version bumping and npm publishing
- All packages properly configured with @codemcp scope and correct exports
- TypeScript build issues resolved for proper dist generation
- Dry-run testing confirmed all packages can be published successfully

**Package Structure**:

- `@codemcp/knowledge` - Main package (aggregates all functionality)
- `@codemcp/knowledge-core` - Core configuration and path utilities
- `@codemcp/knowledge-content-loader` - Web content loading and Git operations
- `@codemcp/knowledge-mcp-server` - MCP protocol server implementation
- `@codemcp/knowledge-cli` - Command-line interface (in development)

- Extended `DocsetConfig` interface with optional `web_sources` field
- Created comprehensive type system for web sources (`WebSourceType`, `WebSourceConfig`, etc.)
- Added metadata types for tracking downloads (`WebSourceMetadata`, `DocsetMetadata`)
- Updated configuration validation with web source support
- Maintained backward compatibility (all 107 tests passing)

**Phase 2: Content Loading Infrastructure (✅ Complete)**

- Implemented abstract `ContentLoader` base class with clean interface
- **GitRepoLoader**: Full implementation supporting any Git repository (GitHub, GitLab, etc.)
- Stub implementations for future scrapers (DocumentationSiteLoader, ApiDocumentationLoader)
- ContentProcessor for Markdown frontmatter and metadata handling
- Comprehensive URL validation and security checks

**Phase 3: Metadata Management (✅ Complete)**

- MetadataManager for `.agentic-metadata.json` handling
- Versioned metadata schema with change detection
- Content hashing for incremental updates
- Full CRUD operations for source metadata

## Commit

### Phase Entrance Criteria:

- [ ] Core web loading functionality is implemented
- [ ] Integration with existing system is complete
- [ ] Tests are passing
- [ ] Code quality standards are met
- [ ] Feature is ready for delivery

### Tasks

- [ ] _To be added when this phase becomes active_

### Completed

_None yet_

## Key Decisions

### Shameful Testing vs. Behavior-Driven Testing

**Problem**: Initially created terrible unit tests that only tested constants, enums, and static properties instead of actual user behavior and system functionality.

**User Feedback**: "what the heck of unit tests should this be? we need to test behaviour, not static code like constants! Shame on you."

**Solution**: Complete rewrite of test strategy:

**What We DELETED (Bad Tests)**:

- `types.test.ts` - Only tested enum string values and interface property assignments
- Tests like `expect(WebSourceType.GIT_REPO).toBe("git_repo")` - completely useless
- Tests that only validated TypeScript interfaces worked - not behavior

**What We CREATED (Good Tests)**:

- **Requirements Documentation**: REQ-11 through REQ-17 with specific behavioral acceptance criteria using EARS format
- **Git Repository Loading Tests**: Test actual URL validation, content ID generation, error handling scenarios
- **Metadata Management Tests**: Test actual file operations, data persistence, error recovery
- **Tests match real user workflows**: "WHEN Git repository URL is invalid THEN system SHALL return clear error message"

**Behavior-Driven Testing Principles Applied**:

1. Test user workflows and system behavior, not static code
2. Use descriptive test names that explain business value
3. Focus on "WHEN...THEN" scenarios from requirements
4. Test error conditions and edge cases that users will encounter
5. Verify actual functionality, not just interface compliance

This approach ensures tests provide value by catching real bugs and verifying the system works as users expect, rather than just confirming TypeScript compilation.

### Test Infrastructure and Output Improvements

**Problem**: Root `pnpm test` command ran all tests correctly but produced confusing output that made it hard to understand test results and overall system health.

**Issues Identified**:

- E2E tests failing due to incorrect binary path after package restructuring
- Root test command using `turbo run test && vitest run test/` produced mixed output formats
- No clear summary of total test counts across packages
- Hard to quickly assess overall system test health

**Solution**: Complete test infrastructure overhaul:

**What We Fixed**:

1. **E2E Test Path**: Updated `test/utils/e2e-test-setup.ts` to use correct binary path `packages/mcp-server/dist/bin.js`
2. **Test Summary Script**: Created `scripts/test-summary.js` that:
   - Dynamically discovers all workspace packages
   - Runs tests for each package individually
   - Parses both package and E2E test outputs
   - Provides clean, professional summary with success rates
3. **Package.json Update**: Changed root test command to use new summary script

**Results**:

- **All 128 tests passing**: 116 package tests + 12 E2E tests
- **Clear Output**: Professional summary showing package-by-package results and totals
- **Better UX**: Immediate understanding of test health with ✅/❌ indicators
- **Proper Detection**: E2E tests now correctly included in total count
- **Consistent Format**: All test results presented in unified format

**Example Output**:

```
📊 TEST SUMMARY
✅ @codemcp/knowledge-cli: 4/4 passed
✅ @codemcp/knowledge-content-loader: 11/11 passed
✅ @codemcp/knowledge-core: 84/84 passed
✅ @codemcp/knowledge-mcp-server: 17/17 passed
✅ E2E Tests: 12/12 passed

📈 TOTAL RESULTS:
   • Tests passed: 128 • Total tests: 128 • Success rate: 100.0%
```

This infrastructure improvement makes the development workflow more professional and provides clear confidence in system stability.

### Architecture Decision: Three Package Structure

**Decision**: Create two new packages: `@codemcp/knowledge-content-loader` and `@codemcp/knowledge-cli` instead of extending core.

**Rationale**:

- **Single Responsibility Violation**: Core package should only handle "configuration and path logic" per design doc
- **Component Boundary Violation**: Web content loading is a different concern from configuration/templates
- **CLI Separation**: CLI should be its own package with its own dependencies and concerns
- **Future Extensibility**: Content loading will grow significantly (scrapers, API docs, etc.)

**Final Package Structure**:

```
@codemcp/knowledge-core/           # Configuration, templates, path calculation (unchanged)
@codemcp/knowledge-content-loader/ # Web content loading, metadata management
├── src/
│   ├── loaders/                   # GitRepoLoader, DocumentationSiteLoader, etc.
│   ├── metadata/                  # MetadataManager
│   ├── processors/                # ContentProcessor
│   └── types.ts                   # Web source types

@codemcp/knowledge-cli/            # Command-line interface
├── src/
│   ├── commands/                  # init, refresh, status commands
│   ├── utils/                     # Progress indicators, error reporting
│   └── index.ts                   # CLI entry point

@codemcp/knowledge-mcp-server/     # MCP protocol (minimal integration changes)
```

**Dependencies Flow**:

- CLI → Content Loader → Core
- MCP Server → Content Loader → Core
- No circular dependencies

**Refactoring Required**:

1. Move `content/` directory and web source types from core to content-loader package
2. Create new CLI package with commands
3. Update all imports and dependencies

### Current System Analysis

- **Architecture**: MCP server with configuration-driven docsets pointing to local filesystem paths
- **Core Types**: `DocsetConfig` has `local_path` field for filesystem locations
- **Template System**: Supports variable substitution for generating search instructions
- **Tools**: `search_docs` and `list_docsets` tools for MCP protocol integration

### Web Loading Implementation Plan

#### 1. Configuration Schema Extension

```yaml
# Extended DocsetConfig to support web sources
docsets:
  - id: "react-docs"
    name: "React Documentation"
    description: "Official React documentation"
    local_path: "./docs/react"
    web_sources:
      # Git repositories (GitHub, GitLab, any Git repo)
      - url: "https://github.com/facebook/react.git"
        type: "git_repo"
        options:
          paths: ["docs/", "README.md", "CONTRIBUTING.md"]
          branch: "main"

      - url: "https://gitlab.com/some-org/project.git"
        type: "git_repo"
        options:
          paths: ["documentation/"]
          branch: "develop"

      # Documentation sites (STUB - will throw NotImplementedError)
      - url: "https://react.dev/learn"
        type: "documentation_site"
        options:
          max_depth: 3
          include_patterns: ["*.html", "*.md", "*.mdx"]

      # API documentation (STUB - will throw NotImplementedError)
      - url: "https://docs.oracle.com/en/java/javase/17/docs/api/"
        type: "api_documentation"
        options:
          doc_format: "javadoc"
```

**Implementation Priority:**

1. **`git_repo`**: Full implementation (supports GitHub, GitLab, any Git repo)
2. **`documentation_site`**: Stub implementation (throws NotImplementedError)
3. **`api_documentation`**: Stub implementation (throws NotImplementedError)

#### 2. New Core Components

**Phase 1 - Git Repository Support:**

- **WebSourceConfig**: Type definitions for web source configuration with `WebSourceType` enum
- **ContentLoader**: Abstract base class for different loading strategies
- **GitRepoLoader**: Full implementation for Git repositories (GitHub, GitLab, any Git repo)
- **MetadataManager**: Handles `.agentic-metadata.json` files in each docset
- **ContentProcessor**: Converts content to Markdown with frontmatter metadata

**Phase 2 - Scraping Support (Future):**

- **DocumentationSiteLoader**: Stub implementation (throws NotImplementedError)
- **ApiDocumentationLoader**: Stub implementation (throws NotImplementedError)

#### 3. CLI Interface Design

Following existing patterns, add new CLI commands:

- `agentic-knowledge init <docset-id>` - Initialize new web sources
- `agentic-knowledge refresh [docset-id]` - Refresh existing web sources
- `agentic-knowledge status` - Show web source status and last update times

#### 4. Integration Strategy

- **Backward Compatibility**: Existing `local_path` docsets continue working unchanged
- **Seamless Search**: Downloaded web content appears in `local_path`, searchable by existing tools
- **Optional Feature**: Web sources are optional, system works without them
- **Error Isolation**: Web loading failures don't break existing local docsets

#### 5. Metadata Management

Store in `{local_path}/.agentic-metadata.json`:

```json
{
  "version": "1.0",
  "docset_id": "react-docs",
  "sources": [
    {
      "url": "https://react.dev/learn",
      "type": "site_scraper",
      "last_fetched": "2024-01-15T10:30:00Z",
      "content_hash": "abc123...",
      "files_created": ["components.md", "hooks.md"],
      "status": "success"
    }
  ],
  "last_refresh": "2024-01-15T10:30:00Z"
}
```

#### 6. Error Handling Strategy

- **Network Failures**: Graceful degradation, use cached content
- **Invalid URLs**: Clear error messages with validation
- **Rate Limiting**: Implement exponential backoff
- **Parsing Errors**: Log errors, continue with other sources
- **Disk Space**: Check available space before downloading

#### 8. Step-wise Implementation Strategy

**Phase 1 Implementation (Current Focus):**

- **`git_repo`**: Full implementation with Git operations
  - Supports any Git repository (GitHub, GitLab, Bitbucket, self-hosted)
  - Clone/download repo content, extract specified paths
  - Handle authentication via Git credentials
  - Support different branches and tags

**Phase 2 Implementation (Future):**

- **`documentation_site`**: Web scraping implementation
  - HTML parsing and crawling
  - Content extraction and conversion
  - Rate limiting and politeness
- **`api_documentation`**: Structured doc parsing
  - Format-specific parsers (JavaDoc, OpenAPI, etc.)
  - Specialized content extraction

**Rationale:** Git operations are well-defined and have established tooling, while web scraping involves much more complexity (parsing, rate limiting, site-specific handling).

- **URL Validation**: Whitelist protocols (https only)
- **Path Traversal**: Sanitize all downloaded file paths
- **Content Sanitization**: Strip dangerous HTML before Markdown conversion
- **Rate Limiting**: Respect robots.txt and implement delays

## Notes

### Existing Codebase Understanding

- System uses YAML configuration with `docsets` array containing local file paths
- Template processor supports multiple variables: `local_path`, `keywords`, `generalized_keywords`, `docset_*`
- MCP server caches configuration for 1 minute to avoid repeated file reads
- Error handling includes specific error types: `CONFIG_NOT_FOUND`, `CONFIG_INVALID`, etc.
- Path calculation resolves relative paths against config file location

### Potential Integration Points

1. **Config Schema Extension**: Add web source configuration alongside `local_path`
2. **Path Calculator**: Extend to handle web URLs and local cache paths
3. **Content Loader**: New component to fetch and cache web content
4. **Template Context**: May need web-specific variables (URL, last-fetched, etc.)

### Security Considerations

- **URL Validation**: Prevent SSRF attacks by validating/restricting URLs
- **Content Sanitization**: Clean HTML content to prevent XSS when converting to Markdown
- **Rate Limiting**: Implement delays between requests to be respectful to source sites
- **User Agent**: Use appropriate User-Agent headers for ethical scraping
- **Robots.txt**: Respect robots.txt when scraping public sites

### Technical Constraints & Limitations

**Operational Requirements:**

- **Two Operation Modes**: Must support both initialize/recreate (setup new sources) and refresh (update existing)
- **State Management**: Need to track configured sources vs. available content
- **Incremental Updates**: Refresh should be efficient and not re-download unchanged content

**Network & Performance:**

- **Network Dependency**: Web loading requires internet connectivity
- **Site Structure Changes**: Scraped content may break if source sites change structure
- **Authentication**: Initial version won't support authenticated sources
- **Large Sites**: May need pagination/incremental loading for very large doc sites
- **Rate Limits**: Must respect source site rate limits and implement backoff strategies

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
