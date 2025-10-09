# Development Plan: agentic-knowledge (default branch)

*Generated on 2025-10-06 by Vibe Feature MCP*
*Workflow: [greenfield](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/greenfield)*

## Goal
Build a standalone agentic knowledge guidance system with a search_docs() interface that returns intelligent navigation instructions based on docset, keywords, and generalized_keywords - delegating language processing to the agent while providing structured guidance.

## Ideation
### Tasks
- [x] Understand gaps and limitations in current implementation
- [x] Explore what "agentic" means in the context of knowledge systems
- [x] Define user personas and use cases for post-RAG era
- [x] Research competitive landscape and existing solutions
- [x] Identify novel capabilities that enhance LLM-documentation interaction
- [x] Define success metrics and acceptance criteria
- [x] Establish scope boundaries (what's in/out)
- [x] Document key insights from "RAG Obituary" article
- [x] Analyze responsible-vibe guidance pattern for knowledge systems
- [x] Define standalone system approach with search interface
- [x] Refine interface to search_docs() with keyword-based guidance

### Completed
- [x] Created development plan file
- [x] Examined existing MCP server implementation
- [x] Read and analyzed "The RAG Obituary" article by Nicolas Bustamante
- [x] Connected responsible-vibe guidance pattern to agentic knowledge concept
- [x] Clarified standalone system with search interface approach
- [x] Refined to search_docs() interface with keyword delegation strategy

## Architecture

### Phase Entrance Criteria:
- [x] Requirements are thoroughly documented and understood
- [x] Problem space is clearly defined with scope boundaries  
- [x] Stakeholder needs and user personas are identified
- [x] Success metrics and acceptance criteria are established
- [x] Existing solutions have been evaluated for gaps

### Tasks
- [x] Define technology stack (TypeScript monorepo + MCP SDK + YAML config)
- [x] Design package structure (core, mcp-server, cli)
- [x] Create interface specifications (search_docs, list_docsets)
- [x] Design configuration strategy (.knowledge folder pattern)
- [x] Define path calculation logic (local_path terminology)
- [x] Create architecture decision records (ADRs)
- [x] Document quality goals and constraints

### Completed
- [x] Comprehensive architecture documentation created
- [x] All key architectural decisions documented as ADRs
- [x] Package responsibilities clearly defined
- [x] Interface designs finalized
- [x] Configuration discovery pattern established

## Plan

### Phase Entrance Criteria:
- [x] Technical architecture is complete and documented
- [x] Technology stack and frameworks have been chosen
- [x] System components and their interactions are defined
- [x] Non-functional requirements are addressed
- [x] Infrastructure and deployment strategy is outlined

### Tasks

**Phase Planning:**
- [x] Create detailed implementation milestones (_Requirements: REQ-1 through REQ-10_)
- [x] Define development dependencies and package setup
- [x] Plan testing strategy for each package
- [x] Design configuration schema and validation (_Requirements: REQ-4, REQ-7_)
- [x] Plan error handling and edge cases (_Requirements: REQ-7_)
- [x] Define build and deployment pipeline (_Requirements: REQ-10_)
- [x] Create development environment setup guide
- [x] Plan integration testing with MCP protocol (_Requirements: REQ-8_)

**Implementation Strategy:**
- [x] Document detailed design patterns and conventions
- [x] Define naming conventions and code standards
- [x] Plan component boundaries and responsibilities
- [x] Design template engine architecture (_Requirements: REQ-6_)
- [x] Plan performance optimization strategy (_Requirements: REQ-9_)

**Risk Assessment:**
- [x] Identify potential configuration edge cases
- [x] Plan for MCP protocol compliance validation
- [x] Design error recovery strategies
- [x] Plan performance testing approach

### Completed
- [x] Comprehensive requirements documentation (REQ-1 through REQ-10)
- [x] Detailed design document with patterns and conventions
- [x] Implementation milestones and dependencies identified
- [x] Testing strategy defined for all components
- [x] Error handling strategy documented
- [x] Performance requirements specified

## Code

### Phase Entrance Criteria:
- [x] Detailed implementation plan is complete
- [x] Development milestones and dependencies are identified
- [x] Design patterns and coding standards are established
- [x] Development environment and tooling are defined
- [x] Risk assessment and mitigation strategies are documented

### Tasks

**Milestone 1: Foundation Setup** (_Duration: 1-2 days_)
- [x] Initialize TypeScript monorepo from ~/projects/templates/typescript-monorepo
- [x] Setup package structure: @codemcp/knowledge-core, @codemcp/knowledge-mcp-server
- [x] Configure build system (Turbo) and development tools
- [x] Add @modelcontextprotocol/sdk dependency
- [x] Add YAML parsing dependencies (js-yaml)
- [x] Create shared TypeScript types and interfaces
- [x] Setup testing framework (Vitest) for each package

**Milestone 2: Core Package Implementation** (_Duration: 3-4 days_) 
- [x] Implement configuration discovery logic (_Requirements: REQ-3_)
  - [x] Create findConfigPath() function with directory tree walking
  - [x] Add YAML loading and parsing (_Requirements: REQ-4_)
  - [x] Create configuration validation
- [x] Create docset path calculation logic (_Requirements: REQ-5_)
  - [x] Implement calculateLocalPath() function
  - [x] Handle relative and absolute path resolution
  - [x] Create path formatting utilities
- [x] Build template engine for instruction generation (_Requirements: REQ-6_)
  - [x] Create template variable substitution
  - [x] Support default and custom templates
  - [x] Add template validation
- [x] Add comprehensive error handling (_Requirements: REQ-7_)
  - [x] Create typed error classes
  - [x] Add detailed error messages with context
  - [x] Implement error recovery strategies
- [x] Write unit tests for all core functionality
  - [x] Configuration loading tests
  - [x] Path calculation tests
  - [x] Template processing tests
  - [x] Error scenario tests

**Milestone 3: MCP Server Package Implementation** (_Duration: 2-3 days_)
- [ ] Setup MCP SDK integration (_Requirements: REQ-8_)
  - [ ] Create MCP server instance
  - [ ] Register tool definitions
  - [ ] Setup JSON-RPC protocol handling
- [ ] Implement search_docs tool handler (_Requirements: REQ-1_)
  - [ ] Add parameter validation
  - [ ] Integrate with core path calculation
  - [ ] Add template processing
  - [ ] Create structured response format
- [ ] Implement list_docsets tool handler (_Requirements: REQ-2_)
  - [ ] Load and return available docsets
  - [ ] Include docset metadata
  - [ ] Handle empty configuration cases
- [ ] Add server lifecycle management
  - [ ] Graceful startup and shutdown
  - [ ] Error handling and recovery
  - [ ] Configuration reload on file changes
- [ ] Performance optimization (_Requirements: REQ-9_)
  - [ ] Configuration caching
  - [ ] Response time optimization
  - [ ] Memory usage optimization
- [ ] Write integration tests
  - [ ] MCP protocol compliance tests
  - [ ] End-to-end tool testing
  - [ ] Error response validation

**Milestone 4: Package Integration & Distribution** (_Duration: 1-2 days_)
- [ ] Create main package entry point (index.js)
- [ ] Setup NPM package configuration (_Requirements: REQ-10_)
  - [ ] Configure package.json for distribution
  - [ ] Add executable binary setup
  - [ ] Include TypeScript type definitions
- [ ] Create example configuration files
- [ ] Write comprehensive documentation
  - [ ] Setup guide
  - [ ] Configuration reference
  - [ ] Troubleshooting guide
- [ ] Performance validation
  - [ ] Response time testing (<10ms requirement)
  - [ ] Memory usage profiling
  - [ ] Load testing with multiple requests

**Milestone 5: Validation & Testing** (_Duration: 1-2 days_)
- [ ] End-to-end testing with real AI assistants
  - [ ] Test with Claude desktop
  - [ ] Test with Cursor if possible
  - [ ] Validate instruction effectiveness
- [ ] Edge case testing
  - [ ] Missing configuration scenarios
  - [ ] Invalid YAML handling
  - [ ] File permission issues
  - [ ] Large configuration files
- [ ] Documentation validation
  - [ ] Setup guide accuracy
  - [ ] Example configuration testing
  - [ ] Error message clarity
- [ ] Release preparation
  - [ ] Version tagging
  - [ ] CHANGELOG.md creation
  - [ ] NPM publish preparation

### Completed
- [x] **Milestone 1: Foundation Setup** - TypeScript monorepo initialized with proper package structure, dependencies, testing framework configured, and build system verified working
- [x] **Milestone 2: Core Package Implementation** - Complete core business logic with comprehensive unit tests (86 tests passing)

### Key Implementation Notes
- **Build system** (Turbo + TypeScript) working correctly
- **Package imports** and dependencies properly linked  
- **Binary execution** tested and functional
- **Core functionality** fully implemented and tested:
  - Configuration discovery with directory tree walking
  - YAML loading and validation with detailed error handling
  - Path calculation with proper project root resolution
  - Template processing with variable substitution
  - Comprehensive error handling with typed error classes
- **Test coverage**: 84 unit tests covering all core functionality
- **Path resolution fix**: Correctly resolves relative paths from project root, not .knowledge directory
- **No dynamic imports**: All imports properly static
- **Strict template validation**: Invalid templates fail server startup with clear error messages
- **Focused tests**: Tests cover relevant business logic, not generic wrappers

## Finalize

### Phase Entrance Criteria:
- [ ] Core implementation is complete and functional
- [ ] All planned features are implemented
- [ ] Basic testing has been conducted
- [ ] Code follows established patterns and standards
- [ ] Implementation meets the documented requirements

### Tasks
- [ ] Code cleanup and optimization
- [ ] Remove any debug output or temporary code
- [ ] Comprehensive testing and bug fixes
- [ ] Documentation finalization
- [ ] NPM package preparation and testing
- [ ] Release preparation

### Completed
*None yet*

## Key Decisions
- **Paradigm Shift**: Moving from traditional RAG (chunking + embeddings + reranking) to agentic search patterns
- **Context Revolution**: Leveraging 200K+ token context windows instead of working around context limitations
- **Direct Navigation**: Using filesystem-like tools (grep, glob, direct file access) instead of similarity search
- **Investigation over Retrieval**: Agents that follow references and build understanding incrementally
- **Guidance over Tools**: Following responsible-vibe pattern - provide dynamic instructions rather than fixed tools
- **Tool Evolution Compatibility**: Instructions remain stable as agent capabilities evolve (grep → AST parsing → future tools)
- **Interface Design**: search_docs() + list_docsets() as core tools
- **No LLM Integration**: System remains AI-free for reliability and speed
- **Single Docset Constraint**: One docset per query for simplicity
- **Agent-Driven Processing**: All language understanding delegated to calling agent
- **Configuration Strategy**: .knowledge folder pattern, no global fallbacks
- **Package Structure**: Clean monorepo with core logic separated from protocol
- **local_path Terminology**: Consistent naming throughout system
- **Template-Based Instructions**: Simple variable substitution for flexible guidance
- **TypeScript Monorepo**: Using proven template for consistency and maintainability

## Notes

### Implementation Milestones Summary:
1. **Foundation** (1-2 days): Monorepo setup, dependencies, project structure
2. **Core Package** (3-4 days): Configuration, path calculation, templates, testing
3. **MCP Server** (2-3 days): Protocol integration, tool handlers, performance
4. **Integration** (1-2 days): Distribution setup, documentation, examples
5. **Validation** (1-2 days): End-to-end testing, edge cases, release prep

**Total Estimated Time: 8-13 days**

### Key Implementation Principles:
- **Fail Fast**: Clear error messages for configuration issues
- **Zero Latency**: All operations must be sub-10ms after config load
- **Deterministic**: Same inputs always produce same outputs
- **Tool Agnostic**: No assumptions about agent's text search capabilities

### Testing Strategy:
- **Unit Tests**: All core business logic (configuration, paths, templates)
- **Integration Tests**: MCP protocol compliance and tool functionality
- **Performance Tests**: Response time and memory usage validation
- **End-to-End Tests**: Real AI assistant integration testing

### Risk Mitigation:
- **Configuration Validation**: Comprehensive YAML schema validation
- **Error Handling**: Graceful degradation with helpful error messages
- **Performance Monitoring**: Built-in timing and memory usage tracking
- **Documentation Quality**: Clear setup guide and troubleshooting section

---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*