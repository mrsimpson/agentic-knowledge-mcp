<!--
DESIGN DOCUMENT TEMPLATE - TIERED BY PROJECT COMPLEXITY

PURPOSE: Document design principles, patterns, and standards that guide implementation.
NOTE: Technology stack decisions belong in the Architecture Document, not here.

PROJECT COMPLEXITY GUIDE:
🚀 ESSENTIAL (Startup/MVP, 1-3 developers, <6 months): Sections 1-2 only
🏢 CORE (Small team, 2-5 developers, 6-18 months): Sections 1-4
🏗️ ADVANCED (Enterprise, 5+ developers, 18+ months): Sections 1-5
⚡ SPECIALIZED (Mission-critical, high reliability): All sections + custom

WHAT TO INCLUDE:
✅ Design principles and patterns
✅ Naming conventions and standards
✅ Component design approaches
✅ Data modeling principles
✅ Quality attribute design strategies
❌ Technology stack choices (goes in Architecture doc)
❌ Concrete class names or implementations
❌ Code snippets or method signatures

START SMALL: Begin with Essential sections, add more as project matures.

IMPORTANT: DO NOT REMOVE THIS COMMENT HOW TO USE THE TEMPLATE!
-->

# Design Document

<!-- # 🚀 ESSENTIAL - Required for all projects -->

## 1. Naming Conventions

### Classes and Types

**Interfaces:**
- Core configuration: `KnowledgeConfig`, `DocsetConfig`
- Tool parameters: `SearchDocsParams`, `ListDocsetsParams`  
- Tool responses: `SearchDocsResponse`, `ListDocsetsResponse`
- Template processing: `TemplateParams`, `TemplateEngine`

**Enums:**
- Error types: `ConfigurationError`, `ValidationError`
- Response status: `ResponseStatus`

### Methods and Functions

**Core Package:**
- Configuration: `loadConfiguration()`, `findConfigPath()`, `validateConfig()`
- Path calculation: `calculateLocalPath()`, `resolveDocsRoot()`
- Template processing: `generateInstructions()`, `substituteVariables()`

**MCP Server Package:**
- Tool handlers: `handleSearchDocs()`, `handleListDocsets()`
- Server lifecycle: `startServer()`, `stopServer()`
- Validation: `validateSearchParams()`, `validateDocsetExists()`

### Variables and Constants

**Configuration:**
- File names: `CONFIG_FILENAME = 'config.yaml'`
- Folder names: `KNOWLEDGE_FOLDER = '.knowledge'`
- Default paths: `DEFAULT_DOCS_ROOT = 'docs'`

**Template Variables:**
- Variable markers: `KEYWORDS_VAR = '{keywords}'`
- Template keys: `LOCAL_PATH_KEY = 'local_path'`

### Packages and Modules

**Package Naming:**
- Core functionality: `@agentic-knowledge/core`
- MCP implementation: `@agentic-knowledge/mcp-server`
- CLI with MCP server routing: `@agentic-knowledge/cli`

**Module Organization:**
- Configuration: `config/` (loading, validation, types)
- Templates: `templates/` (engine, substitution)
- Path utilities: `paths/` (calculation, resolution)
- MCP handlers: `handlers/` (tool implementations)

## 2. Error Handling Design

### Exception Design Principles

**Error Categories:**
- `ConfigurationError`: Missing or invalid configuration files
- `ValidationError`: Invalid parameters or malformed data
- `PathError`: Issues with file system path resolution
- `TemplateError`: Problems with instruction template processing

**Error Response Strategy:**
- Always provide actionable error messages
- Include context about what was expected vs. what was found
- Suggest specific remediation steps
- Never expose internal implementation details

### Error Propagation Strategy

**MCP Layer:**
- Catch all errors from core packages
- Transform technical errors into user-friendly MCP error responses
- Log technical details for debugging
- Return structured error responses with error codes

**Core Layer:**
- Validate inputs at package boundaries
- Throw specific, typed errors with detailed context
- Never swallow errors - always propagate or handle explicitly
- Include relevant data in error messages (file paths, docset names)

### Error Recovery Patterns

**Configuration Errors:**
- Missing `.knowledge` folder → Clear setup instructions
- Invalid YAML → Parse error with line/column information
- Missing docset → List available docsets in error message

**Runtime Errors:**
- Invalid docset name → Suggest closest match from available docsets
- Missing documentation folder → Warning with instructions to populate
- Template processing errors → Fall back to default template

<!-- # 🏢 CORE - Recommended for professional projects -->

## 3. Architecture Patterns & Principles

### Core Design Principles

**Single Responsibility:**
- Core package: Only configuration and path logic
- MCP Server package: Only protocol implementation
- Each module has one clear purpose

**Dependency Inversion:**
- MCP server depends on core abstractions, not implementations
- Template engine depends on interfaces, not concrete config classes
- All dependencies flow inward toward core business logic

**Open/Closed Principle:**
- Template system open for extension (custom templates)
- Configuration schema open for additional properties
- MCP tools closed for modification, open for extension

### Preferred Architectural Patterns

**Strategy Pattern:**
- Template processing: Different templates for different docsets
- Path calculation: Pluggable path calculation strategies
- Error formatting: Different error message formats

**Factory Pattern:**
- Configuration creation from YAML files
- Error response creation with appropriate context
- Template engine instantiation with configuration

**Template Method Pattern:**
- Standard instruction generation workflow
- Consistent error handling flow
- Common validation patterns

### Pattern Selection Guidelines

**Use Strategy Pattern When:**
- Multiple ways to perform the same operation (templates, path calculation)
- Behavior needs to be configurable or extensible
- Algorithm variations need to be interchangeable

**Use Factory Pattern When:**
- Complex object creation with validation
- Need to abstract creation logic
- Multiple creation paths for same object type

## 4. Component Design Strategy

### Component Boundary Principles

**Core Package Boundaries:**
- Configuration: Owns all YAML loading and validation logic
- Path Calculation: Owns docset → local path mapping logic
- Template Engine: Owns instruction generation and variable substitution

**MCP Server Boundaries:**
- Protocol Handling: Owns MCP SDK integration and tool registration
- Request Validation: Owns parameter validation and sanitization
- Response Formatting: Owns response structure and error formatting

### Responsibility Assignment

**Configuration Component:**
- Discovering `.knowledge` folder location
- Loading and validating YAML configuration
- Providing typed access to configuration data
- Caching configuration for performance

**Path Component:**
- Calculating local paths from docset names and versions
- Resolving relative paths to absolute paths
- Validating that documentation folders exist
- Handling path-related errors gracefully

**Template Component:**
- Loading default and custom instruction templates
- Performing variable substitution in templates
- Validating template syntax and required variables
- Generating final instruction strings

### Interface Design Standards

**Command-Query Separation:**
- Query methods return data without side effects
- Command methods modify state but return minimal data
- Clear distinction between read and write operations

**Immutable Responses:**
- All response objects are immutable after creation
- Configuration objects are read-only after loading
- Template results are immutable strings

**Fail-Fast Validation:**
- Validate all inputs at component boundaries
- Throw specific errors immediately on invalid data
- Never propagate invalid state through the system

### Dependency Management

**Dependency Flow:**
```
MCP Server → Core Packages
     ↓
Configuration ← Template Engine
     ↓
Path Calculator
```

**Injection Strategy:**
- Constructor injection for required dependencies
- Configuration passed as dependency, not global state
- No circular dependencies between packages

## 5. Data Design Approach

### Domain Modeling Principles

**Value Objects:**
- `DocsetInfo`: Immutable container for docset metadata
- `LocalPath`: Typed wrapper around file system paths
- `InstructionTemplate`: Immutable template with variable placeholders

**Entity Design:**
- Configuration as aggregate root
- Docsets as child entities under configuration
- Clear ownership and lifecycle management

### Data Transfer Patterns

**Input Validation:**
- All MCP parameters validated at entry point
- Transform raw inputs into typed value objects
- Validate business rules after type conversion

**Response Construction:**
- Build responses using builder pattern
- Include all required context in responses
- No leaky abstractions in response data

### Data Consistency Strategy

**Configuration Consistency:**
- Load configuration atomically
- Validate entire configuration before use
- Cache valid configuration until file changes

**Path Consistency:**
- Always use absolute paths internally
- Validate path calculations against file system
- Maintain consistent path separator handling

## 6. Quality Attribute Implementation

### Performance Design Strategy

**Sub-10ms Response Time:**
- Cache configuration after initial load
- Pre-calculate common path patterns
- Use string templates instead of complex processing
- Avoid file system access during request handling

**Memory Efficiency:**
- Share configuration instances across requests
- Use string interning for repeated values
- Minimize object allocation in hot paths

### Security Design Principles

**Path Security:**
- Validate all paths to prevent directory traversal
- Sanitize user-provided docset names
- Never expose internal file system structure

**Input Validation:**
- Whitelist docset name characters
- Limit keyword array sizes
- Validate template variable names

### Maintainability Design Approach

**Clear Interfaces:**
- Well-defined contracts between packages
- Comprehensive error messages
- Self-documenting code with meaningful names

**Testing Support:**
- Dependency injection for all external dependencies
- Pure functions where possible
- Clear separation of I/O from business logic

**Documentation:**
- JSDoc comments for all public interfaces
- README files for each package
- Examples for complex configuration scenarios

---

# Implementation Notes

## Project-Specific Design Decisions

**Template Processing Philosophy:**
- Keep templates simple and human-readable
- Prefer explicit variable substitution over complex logic
- Make it easy to debug template issues

**Configuration Design Philosophy:**
- Convention over configuration where sensible
- Explicit over implicit configuration
- Fail fast with clear error messages

**Error Message Design:**
- Always include what was expected vs. what was found
- Provide specific next steps for resolution
- Include relevant context (file paths, docset names)
- Use consistent error message format across all components

## Team Agreements

**Code Style:**
- Prefer explicit type annotations over inference
- Use meaningful variable names even if longer
- Include JSDoc for all public methods
- Consistent error handling patterns

**Testing Strategy:**
- Unit tests for all core business logic
- Integration tests for MCP protocol
- Configuration validation tests
- Error scenario testing