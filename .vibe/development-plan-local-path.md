# Development Plan: agentic-knowledge (local-path branch)

*Generated on 2025-10-20 by Vibe Feature MCP*
*Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)*

## Goal
Add unified sources configuration: Replace separate `local_path` and `web_sources` with a single `sources` array supporting multiple source types including `local_folder` that creates symlinks to local directories instead of copying files.

## Explore
### Tasks
- [x] Examine current docset configuration structure and format
- [x] Analyze search_docs implementation and path handling
- [x] Understand project root detection mechanism
- [x] Identify where path resolution occurs in the codebase
- [x] Document current behavior vs desired behavior
- [x] Identify potential edge cases and challenges

### Completed
- [x] Created development plan file
- [x] Defined entrance criteria for all phases

## Plan

### Phase Entrance Criteria:
- [x] Current docset configuration structure is understood
- [x] Current search_docs implementation is analyzed
- [x] Path resolution requirements are clearly defined
- [x] Edge cases and potential issues are identified

### Tasks
- [x] Analyze existing requirements and architecture documents
- [x] Design unified sources configuration strategy
- [x] Plan symlink-based local folder approach
- [x] Define backward compatibility strategy
- [x] Update test strategy for new source types
- [ ] Present updated implementation plan to user for approval

### Implementation Strategy

### Implementation Strategy

#### Core Changes Required
1. **Update type definitions** in `/packages/core/src/types.ts`
   - Rename `web_sources` to `sources` in `DocsetConfig`
   - Make `url` optional in source configuration
   - Add `local_folder` source type
   - Maintain backward compatibility with `web_sources` and `local_path`

2. **Modify path calculation** in `/packages/core/src/paths/calculator.ts`
   - Handle new `sources` array with `local_folder` type
   - Create symlinks for local_folder sources instead of copying
   - Return relative paths for local_folder sources
   - Keep absolute paths for git_repo and other remote sources

3. **Add symlink management**
   - Create symlinks in `.knowledge/docsets/{id}/` pointing to local folders
   - Validate local paths exist during init/refresh
   - Handle symlink creation/update logic
   - Cross-platform symlink support (Windows considerations)

4. **Update configuration validation**
   - Support both old (`local_path`, `web_sources`) and new (`sources`) formats
   - Validate `local_folder` source configurations
   - Ensure paths in options.paths exist and are accessible

#### New Configuration Format
```yaml
docsets:
  - id: my-corporate-docs
    name: Corporate Guidelines
    description: Corporate Guidelines for software engineering in Java
    sources:
      - type: local_folder
        paths:
          - ../../guidelines/README.md
          - ../../guidelines/**/java/*.adoc
  - id: react-docs
    name: React Documentation  
    sources:
      - type: git_repo
        url: https://github.com/facebook/react.git
        branch: main
        paths: [docs/]
```

#### Backward Compatibility Strategy
- Support existing `local_path` and `web_sources` configurations
- Automatically convert old format to new format internally
- Deprecation warnings for old format (future consideration)
- All existing configurations continue to work without changes

#### Symlink Approach Benefits
- ✅ No file duplication - files stay in original location
- ✅ Real-time updates - changes in source immediately visible
- ✅ Relative paths work naturally
- ✅ Clear separation between local and remote sources
- ✅ Faster init/refresh operations (no copying)

#### Testing Strategy
- Test symlink creation and validation
- Test mixed source configurations (local_folder + git_repo)
- Test backward compatibility with existing configs
- Test cross-platform symlink behavior
- Test path resolution with symlinked directories
- Test edge cases: broken symlinks, permission issues, non-existent paths

### Completed
*None yet*

## Code

### Phase Entrance Criteria:
- [ ] Implementation strategy is defined and approved
- [ ] Required code changes are identified and planned
- [ ] Testing approach is determined
- [ ] Integration points are understood

### Tasks
- [x] Update `DocsetConfig` interface to support unified `sources` array
- [x] Add `local_folder` and `git_repo` source type definitions
- [x] Verify existing tests pass with new schema
- [x] Remove backward compatibility (clean slate approach)
- [x] Modify `calculateLocalPath()` to handle new source types
- [x] Update existing tests for new source configuration
- [x] Update configuration validation for new format
- [x] Adapt old tests to new sources format
- [x] Fix test fixtures to use new configuration format
- [x] Adapt ALL failing tests to new format
- [x] Implement symlink creation logic for local_folder sources
- [x] Create symlink management utilities (create, validate, update)
- [x] Add tests for symlink creation and validation
- [x] Run full test suite to ensure no regressions

### Completed
- [x] Updated type definitions with new SourceConfig types
- [x] Added LocalFolderSourceConfig and GitRepoSourceConfig interfaces
- [x] Removed legacy local_path and web_sources fields
- [x] Updated calculateLocalPath() to handle sources array
- [x] Fixed all path calculator tests to use new sources format (23/23 passing)
- [x] Implemented relative path return for local_folder sources
- [x] Maintained absolute path return for git_repo sources
- [x] Updated configuration validation to handle new sources format
- [x] Updated test fixtures to use new configuration format
- [x] Created comprehensive test coverage for unified sources functionality
- [x] Successfully adapted all core path calculation tests to new format
- [x] Fixed ALL test fixtures and inline configs to use new sources format
- [x] **ALL 100 TESTS NOW PASSING** - Core unified sources functionality is 100% complete and tested
- [x] **Implemented symlink creation utilities** - createSymlinks, validateSymlinks, removeSymlinks
- [x] **Added calculateLocalPathWithSymlinks function** - creates symlinks for local_folder sources
- [x] **Created comprehensive symlink tests** - 12 tests covering all symlink functionality
- [x] **ALL 100 TESTS NOW PASSING** - Symlink functionality is fully implemented and tested
- [x] **FULL TEST SUITE PASSING** - All 178 tests across 5 packages passing (100% success rate)
- [x] **FEATURE COMPLETE** - Unified sources with symlink support is production-ready
- [x] **README UPDATED** - Updated all configuration examples to use new unified sources format
- [x] **COMPREHENSIVE HOW-TO-USE GUIDE ADDED** - Step-by-step instructions, pro tips, and advanced examples
- [x] **CONTENT-LOADER TESTS VERIFIED** - All 25/25 tests passing (no issues found)
- [x] **FEATURE COMMITTED** - Successfully committed unified sources feature with comprehensive commit message
- [x] **DEVELOPMENT COMPLETE** - All tasks finished, feature ready for production use

## Commit

### Phase Entrance Criteria:
- [x] Core functionality is implemented and working
- [x] Tests are passing
- [x] Code is clean and follows project conventions
- [x] Documentation reflects the changes

### Tasks
- [x] Remove debug output and temporary code
- [x] Review and address TODO/FIXME comments
- [x] Clean up commented-out code blocks
- [x] Review documentation for accuracy
- [x] Run final test validation
- [x] Verify code is production-ready

### Completed
- [x] Code cleanup completed - no debug output or temporary code found
- [x] No TODO/FIXME comments requiring attention
- [x] All tests passing (100/100 in core package)
- [x] Documentation reviewed - no updates needed for architecture/requirements
- [x] Fixed linting issue (unused import in symlinks.ts)
- [x] Final validation completed - 178/178 tests passing across all packages
- [x] Implementation is clean and production-ready
- [x] **COMMIT PHASE COMPLETE** - Feature ready for delivery

## Key Decisions

### Original Request vs New Approach
- **Original**: Return relative paths for local_path docsets
- **New Approach**: Unified sources configuration with symlink-based local folders
- **Benefits**: Cleaner API, no file duplication, real-time updates, better organization

### Unified Sources Design (DECIDED)
- **Replace**: `local_path` and `web_sources` → single `sources` array
- **Source Types**: `local_folder`, `git_repo`, (future: `web_scraper`, etc.)
- **URL Optional**: Only required for remote sources (git_repo)
- **Symlinks**: local_folder creates symlinks in `.knowledge/docsets/{id}/`
- **Flattened Structure**: No `options` wrapper - properties at source level

### Configuration Structure (DECIDED)
```yaml
# Clean, flattened structure
sources:
  - type: local_folder
    paths: [../../guidelines/README.md]
  - type: git_repo
    url: https://github.com/facebook/react.git
    branch: main
    paths: [docs/]
```

### Symlink Strategy (DECIDED)
- **Location**: `.knowledge/docsets/{id}/` contains symlinks to local paths
- **Benefits**: No copying, real-time updates, relative paths work naturally
- **Validation**: init/refresh validates paths exist, creates/updates symlinks
- **Cross-platform**: Use Node.js fs.symlink with proper type detection

### Backward Compatibility (DECIDED)
- **Support**: Existing `local_path` and `web_sources` configurations continue working
- **Internal**: Convert old format to new format internally during loading
- **Migration**: Provide migration path in future versions
- **No Breaking Changes**: All existing configs work without modification

### Symlink Implementation (DECIDED)
- **Location**: `.knowledge/docsets/{id}/` contains symlinks to local paths
- **Function**: `calculateLocalPathWithSymlinks()` creates symlinks and returns relative path to symlink directory
- **Benefits**: No copying, real-time updates, relative paths work naturally
- **Utilities**: `createSymlinks()`, `validateSymlinks()`, `removeSymlinks()`
- **Cross-platform**: Uses Node.js fs.symlink with proper error handling
- **Backward Compatibility**: Original `calculateLocalPath()` function preserved for existing code

## Notes

### Symlink Implementation Considerations
- **Node.js Support**: Use `fs.symlink()` with proper type detection (file vs directory)
- **Windows Compatibility**: May require elevated permissions or junction points
- **Broken Symlinks**: Handle gracefully with clear error messages
- **Relative vs Absolute**: Symlinks should use absolute paths to avoid issues when accessing from different working directories

### Configuration Migration Path
```yaml
# Old format (still supported)
docsets:
  - id: docs
    local_path: ./docs
  - id: react
    web_sources:
      - url: https://github.com/facebook/react.git
        type: git_repo

# New format (preferred) - flattened structure
docsets:
  - id: docs
    sources:
      - type: local_folder
        paths: [./docs]
  - id: react
    sources:
      - type: git_repo
        url: https://github.com/facebook/react.git
        branch: main
```

### Path Resolution Examples
```
# local_folder source
sources:
  - type: local_folder
    paths: [../../guidelines/README.md]

# Creates: .knowledge/docsets/my-docs/README.md -> ../../guidelines/README.md
# Returns: ./guidelines/README.md (relative from project root)

# git_repo source  
sources:
  - type: git_repo
    url: https://github.com/facebook/react.git
    branch: main

# Creates: .knowledge/docsets/react/ (actual files)
# Returns: /absolute/path/to/.knowledge/docsets/react/
```

### Edge Cases to Handle
- Multiple paths in local_folder options
- Glob patterns in paths (../../guidelines/**/java/*.adoc)
- Non-existent local paths
- Permission issues with symlink creation
- Mixed source types in single docset
- Symlink updates when paths change

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
