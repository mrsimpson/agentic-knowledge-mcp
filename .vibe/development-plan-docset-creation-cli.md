# Development Plan: agentic-knowledge (docset-creation-cli branch)

*Generated on 2025-10-20 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal
Improve docset definition creation by analyzing current implementation and developing easier methods for users to create docset configurations.

## Explore
### Tasks
- [x] Analyzed current docset configuration structure in .knowledge/config.yaml
- [x] Examined existing examples (basic-config.yaml, advanced-config.yaml)
- [x] Reviewed core types and interfaces in packages/core/src/types.ts
- [x] Investigated existing CLI commands (init, refresh, status)
- [x] Identified specific pain points in current docset creation process
- [x] Researched user workflows from test setup and examples
- [x] Analyzed current limitations and improvement opportunities
- [x] Documented findings and potential solutions

### Completed
- [x] Created development plan file

## Plan

### Phase Entrance Criteria:
- [x] Current docset definition implementation has been thoroughly analyzed
- [x] User pain points and improvement opportunities have been identified
- [x] Alternative approaches have been evaluated and documented
- [x] It's clear what's in scope and out of scope for the improvement

### Tasks
- [x] Design CLI command interface for `agentic-knowledge create`
- [x] Define docset preset types and their configurations (UPDATED: git-repo and local-folder only)
- [x] Design non-interactive command interface (UPDATED: no interactive prompts needed)
- [x] Plan integration with existing CLI structure
- [x] Define validation and error handling strategy
- [x] Document API changes and new interfaces

### Completed
- [x] Designed command interface with preset-based approach
- [x] Defined 2 preset types: git-repo and local-folder
- [x] Planned integration with existing ConfigManager
- [x] Documented minimal technical approach

### Implementation Strategy

### Implementation Strategy

#### Simplified Command Interface:
```bash
# Git repository preset
agentic-knowledge create --preset git-repo --id my-docs --name "My Docs" --url https://github.com/user/repo.git

# Local folder preset  
agentic-knowledge create --preset local-folder --id my-docs --name "My Docs" --path ./docs
```

#### Two Preset Types Only:

**1. `git-repo` preset:**
- Requires: `--url` (git repository URL)
- Optional: `--branch`, `--paths` (specific files/folders)
- Generates web_sources configuration

**2. `local-folder` preset:**
- Requires: `--path` (local directory path)
- Validates path exists
- Generates local_path configuration

#### Minimal Technical Implementation:
- Single command file: `packages/cli/src/commands/create.ts`
- Two preset functions: `createGitRepoDocset()`, `createLocalFolderDocset()`
- Use existing ConfigManager for file operations
- Basic validation only

## Code

### Phase Entrance Criteria:
- [ ] The implementation plan has been thoroughly defined
- [ ] Technical approach and architecture decisions are documented
- [ ] User interface and API design are specified
- [ ] Dependencies and integration points are identified

### Tasks
- [x] Create main `create` command with git-repo and local-folder presets
- [x] Implement git-repo preset function
- [x] Implement local-folder preset function  
- [x] Add basic path validation for local-folder
- [x] Integrate with existing ConfigManager
- [x] Add command to existing CLI structure
- [x] Test both presets work correctly
- [x] Write unit tests for create command functionality

### Completed
- [x] Created packages/cli/src/commands/create.ts with both presets
- [x] Added validation for required options and path existence
- [x] Integrated with existing ConfigManager for config file operations
- [x] Added create command to CLI structure
- [x] Tested successful creation and error cases
- [x] Verified existing tests still pass
- [x] Added comprehensive unit tests covering success and error cases
- [x] All 20 CLI tests passing (4 new + 16 existing)

## Commit

### Phase Entrance Criteria:
- [x] Core implementation is complete and functional
- [x] Code follows project standards and best practices
- [x] Tests are passing and coverage is adequate
- [x] Documentation reflects the implemented changes

### Tasks
- [x] Code cleanup - remove debug output and temporary code
- [x] Review TODO/FIXME comments (none found)
- [x] Remove debugging code blocks (none found)
- [x] Documentation review (no updates needed - feature is self-contained)
- [x] Final test validation - all 20 tests passing
- [x] Build verification - successful compilation
- [x] Code ready for production delivery

### Completed
- [x] Systematic code cleanup completed - no debug code found
- [x] All tests passing (20/20) including new create command tests
- [x] Build successful with no errors or warnings
- [x] Implementation ready for production use

## Key Decisions
- Current docset configuration uses YAML format with complex structure
- Existing CLI has init/refresh/status commands but no interactive creation tools
- Configuration supports both local_path and web_sources for different content types
- Template system allows custom search instructions per docset
- **DECISION**: Implement only 2 presets: git-repo and local-folder (minimal scope)
- **DECISION**: Non-interactive command-line interface only (no prompts needed)
- **DECISION**: Add `create` command to existing CLI structure, maintain consistency
- **DECISION**: Use existing ConfigManager for file operations to ensure compatibility
- **DECISION**: Basic validation only - check local paths exist, git URLs are valid format

## Notes
### Current Docset Configuration Structure:
- **Manual YAML editing**: Users must manually create/edit .knowledge/config.yaml
- **Complex schema**: Requires understanding of DocsetConfig interface with multiple optional fields
- **Template customization**: Each docset can have custom search instruction templates
- **Web sources support**: Can load content from Git repos with specific path filtering

### Current Pain Points Identified:
1. **Manual YAML editing** - Error-prone, requires YAML knowledge
2. **Complex configuration** - Many optional fields, unclear which are needed
3. **No guided setup** - No interactive prompts or wizards
4. **Template complexity** - Custom templates require understanding of variable system
5. **Path specification** - Confusion between local_path vs web_sources
6. **No validation feedback** - Errors only discovered at runtime

### Improvement Opportunities Identified:

#### 1. **Interactive Docset Creation Command**
- **Problem**: Users must manually edit YAML files
- **Solution**: `agentic-knowledge create` command with interactive prompts
- **Benefits**: Guided setup, validation, reduced errors

#### 2. **Docset Type Templates/Presets**
- **Problem**: Users don't know what configuration works for different scenarios
- **Solution**: Predefined templates (local-docs, git-repo, npm-package, etc.)
- **Benefits**: Quick setup, best practices built-in

#### 3. **Path Discovery and Validation**
- **Problem**: Users guess at correct paths and only find errors at runtime
- **Solution**: Auto-detect common documentation paths, validate during creation
- **Benefits**: Fewer configuration errors, better user experience

#### 4. **Configuration Validation and Feedback**
- **Problem**: YAML syntax errors and invalid configurations only discovered at runtime
- **Solution**: Real-time validation during creation, `validate` command
- **Benefits**: Immediate feedback, prevent broken configurations

#### 5. **Template Customization Wizard**
- **Problem**: Template system is powerful but complex for new users
- **Solution**: Interactive template builder with common patterns
- **Benefits**: Easier customization, better search instructions

#### 6. **Import/Export and Sharing**
- **Problem**: No easy way to share docset configurations between projects
- **Solution**: Export docset configs, import from URLs/files
- **Benefits**: Reusability, community sharing

### Recommended Implementation Priority:
1. **Interactive creation command** (highest impact)
2. **Docset type presets** (quick wins)
3. **Path validation** (error prevention)
4. **Configuration validation** (developer experience)
5. **Template wizard** (advanced users)
6. **Import/export** (community features)

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
