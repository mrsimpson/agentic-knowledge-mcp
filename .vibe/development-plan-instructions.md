# Development Plan: agentic-knowledge (instructions branch)

_Generated on 2025-10-10 by Vibe Feature MCP_
_Workflow: [epcc](https://mrsimpson.github.io/responsible-vibe-mcp/workflows/epcc)_

## Goal

Improve how instructions returned to the LLM are communicated and how they can be maintained by users. This involves enhancing the template system for better clarity, maintainability, and user experience.

## Explore

### Tasks

- [x] Analyze current instruction/template system architecture
- [x] Identify pain points in current instruction communication
- [x] Research best practices for instruction templates
- [x] Understand user maintenance workflows
- [x] Document current template variables and constraints

### Completed

- [x] Created development plan file

## Plan

### Phase Entrance Criteria:

- [x] Current system architecture is fully understood
- [x] Pain points and improvement opportunities are documented
- [x] User requirements for instruction maintenance are clear
- [x] Technical constraints and capabilities are identified

### Tasks

- [x] Analyze current system architecture and identify improvement opportunities
- [x] Define enhancement strategy for instruction communication
- [x] Plan MCP metadata enhancement approach
- [x] Design template system improvements
- [x] Plan user experience enhancements

### Completed

- [x] Created comprehensive implementation strategy

## Code

### Phase Entrance Criteria:

- [x] Implementation strategy is clearly defined
- [x] Technical approach has been decided and documented
- [x] Breaking changes (if any) are identified and planned
- [x] User impact and migration path are understood

### Tasks

**Enhanced Default Experience Implementation**

- [x] Create new comprehensive DEFAULT_TEMPLATE with structured format
- [x] Enhance MCP tool descriptions with rich docset metadata from configuration
- [x] Add search strategy guidance and best practices to tool descriptions
- [x] Update server.ts to dynamically build tool descriptions from config
- [x] Add docset content summaries and file type info to tool schema
- [x] Include "what to avoid" guidance in tool descriptions (`.knowledge/`, `node_modules/`)
- [x] Test new default template with various docset scenarios
- [x] Update existing tests to validate enhanced tool descriptions
- [x] Ensure backward compatibility with existing configurations

### Completed

**Enhanced Default Experience Implementation:**

- ✅ Created comprehensive DEFAULT_TEMPLATE with structured markdown format
- ✅ Enhanced MCP tool descriptions with rich docset metadata
- ✅ Added search strategy guidance and best practices
- ✅ Updated server.ts to dynamically build tool descriptions from configuration
- ✅ Added docset content summaries, file type info, and "what to avoid" guidance
- ✅ Tested with multiple docset scenarios (custom templates, global templates, default template)
- ✅ Updated E2E tests to validate enhanced functionality
- ✅ Ensured full backward compatibility with existing configurations
- ✅ All tests passing (158/158 - 100% success rate)

## Commit

### Phase Entrance Criteria:

- [x] Core functionality is implemented and working
- [x] Code quality meets standards
- [x] Tests pass and functionality is verified
- [x] Documentation reflects new capabilities

### Tasks

- [ ] _To be added when this phase becomes active_

### Completed

_None yet_

## Key Decisions

### Scope Simplification Decision

**Decision**: Focus exclusively on making the default experience exceptional rather than building complex customization features.
**Rationale**: Better defaults reduce the need for customization. Complexity in template systems can harm usability. 90% of users should get great results with zero configuration.
**Impact**:

- Faster development and delivery
- Simpler codebase and fewer edge cases
- Better long-term maintainability
- Users get immediate value without configuration overhead

### Discovery and Context Improvement

**Decision**: Leverage MCP tool schema metadata to convey docset information instead of requiring separate discovery calls.
**Rationale**: More elegant than forcing `list_docsets` → `search_docs` workflow. Tool descriptions can act as rich context for LLMs.
**Approaches to evaluate**:

- Enhanced parameter descriptions with embedded docset info
- Dynamic tool registration (one tool per docset)
- Rich tool description with all docsets and search guidance
- Configurable metadata strategy

### Implementation Strategy

### Simplified Implementation Strategy

**Core Philosophy**: Make the default experience so good that customization is rarely needed.

**Single Phase: Enhanced Default Experience**

1. **Rich MCP Tool Descriptions**: Embed comprehensive docset information in tool schema
2. **Excellent Default Template**: Create a structured, actionable instruction format
3. **Built-in Best Practices**: Include search strategy guidance and tool recommendations
4. **Smart Context Communication**: Eliminate discovery workflow overhead

**What We're NOT Building** (Scope Reduction):

- ❌ Complex conditional templating system
- ❌ Advanced template customization features
- ❌ CLI template tools and testing framework
- ❌ Template libraries and examples
- ❌ Multiple metadata strategies

**Focus Areas**:

- ✅ One exceptional default template that works for 90% of use cases
- ✅ Rich tool descriptions that provide complete context upfront
- ✅ Clear, actionable instructions that leverage modern LLM capabilities
- ✅ Maintain existing template override capability (but don't enhance it)

**Technical Approach**:

- Improve the `DEFAULT_TEMPLATE` to be comprehensive and structured
- Enhance MCP tool descriptions with docset metadata
- Keep existing template system simple (just variable substitution)
- Focus on quality over customization features

### Implementation Results

**New DEFAULT_TEMPLATE Features:**

- 📚 Structured markdown format with clear sections
- 🎯 Search target definition with terms and location
- 🔍 Step-by-step search strategy with specific tool commands
- 💡 Smart file targeting and directory guidance
- 🚫 Clear "what to avoid" instructions
- 💡 Actionable search tips and fallback strategies

**Enhanced MCP Tool Descriptions:**

- 📚 Rich docset metadata embedded directly in tool schema
- 🔍 Comprehensive search strategy overview
- 💡 Built-in best practices and tool recommendations
- 🎯 Enum constraints for docset_id parameter
- 📋 Eliminates need for discovery calls

**Backward Compatibility:**

- ✅ All existing configurations work unchanged
- ✅ Custom templates still override defaults
- ✅ Global templates still override defaults
- ✅ No breaking changes to API or configuration format

## Notes

### Current System Architecture Analysis

**Template Processing Flow:**

1. User calls `search_docs` tool with docset_id, keywords, and generalized_keywords
2. Server loads configuration and finds matching docset
3. Template resolution: docset.template > config.template > DEFAULT_TEMPLATE
4. Template variables are replaced with actual values in processTemplate()
5. Processed instruction string is returned to LLM as tool response

**Template System Components:**

- **Template processor** (`packages/core/src/templates/processor.ts`): Handles variable substitution using {{variable}} syntax
- **Template validation**: Ensures templates contain allowed variables and required variables
- **Template hierarchy**: Docset-specific > Global > Default fallback
- **Variables available**: local_path, keywords, generalized_keywords, docset_id, docset_name, docset_description

**Current Default Template:**

```
Search for '{{keywords}}' in folder {{local_path}}. Use your normal text search tools (grep, rg, or similar) to find relevant files. Consider these broader search terms as well: {{generalized_keywords}}. Start with searching for the most specific keywords first, then expand to the generalized terms if needed.
```

**Configuration System:**

- YAML-based configuration in `.knowledge/config.yaml`
- Supports both global and docset-specific templates
- Example configurations show different approaches (basic vs advanced)

### Pain Points Identified

**1. Template Discoverability & Maintenance:**

- Limited documentation on template best practices
- No CLI tool to validate templates in isolation
- Template variables are documented in code but not discoverable to users
- No template preview/testing capability

**2. Instruction Quality & LLM Communication:**

- Default template is very basic and doesn't leverage modern LLM capabilities
- No structured instruction format (just plain text)
- Instructions lack actionable task breakdown for complex searches
- No guidance on search strategy or priority

**3. User Experience Issues:**

- Manual YAML editing with potential for syntax errors
- No template validation feedback during editing
- Examples are limited and don't show advanced patterns
- No guidance on when to use global vs docset-specific templates

**4. Template System Limitations:**

- Static string substitution only - no conditional logic
- No support for rich formatting (markdown, structured data)
- No way to include docset-specific search strategies
- No support for multi-step search workflows

**5. LLM Instruction Clarity:**

- Instructions are unstructured text strings
- No clear task separation or priority indication
- Missing context about search tools and capabilities
- No feedback mechanism to improve instruction effectiveness

**6. Discovery and Context Problems:**

- LLM has no knowledge of available docsets without calling `list_docsets`
- No guidance on what to avoid searching (`.knowledge/`, `node_modules/`, etc.)
- Minimal context about docset contents and structure
- Forces unnecessary discovery workflow: `list_docsets` → `search_docs`
- Tool schema doesn't leverage MCP metadata capabilities for rich context

### Best Practices Research

**Modern LLM Instruction Design:**

1. **Structured format**: Use markdown, numbered steps, clear sections
2. **Task decomposition**: Break complex searches into specific steps
3. **Context setting**: Provide background on tools and capabilities
4. **Priority guidance**: Indicate which approaches to try first
5. **Conditional logic**: "If X doesn't work, try Y"

**Effective Template Patterns:**

- **Step-by-step approach**: Numbered action items
- **Context-aware instructions**: Reference docset type and structure
- **Tool-specific guidance**: Mention grep/rg/glob patterns
- **Fallback strategies**: What to do when initial search fails
- **Result validation**: How to verify findings

**Industry Examples:**

- Claude Project Instructions: Clear, structured, action-oriented
- GitHub Copilot prompts: Context-rich, tool-aware
- Langchain templates: Modular, conditional logic
- Function calling patterns: Structured parameters, clear outcomes

### User Maintenance Workflows

**Current Workflow:**

1. **Initial Setup**: Create `.knowledge/config.yaml` manually
2. **Template Development**: Edit YAML directly in text editor
3. **Validation**: Templates validated only at runtime (when MCP server starts)
4. **Testing**: No preview capability - must test via actual MCP calls
5. **Debugging**: Error messages in MCP tool responses, not during editing

**CLI Support (Limited):**

- `agentic-knowledge init <docset>`: Initialize web sources
- `agentic-knowledge refresh <docset>`: Refresh web content
- `agentic-knowledge status`: Check docset status
- Missing: Template validation, preview, testing commands

**User Pain Points:**

- No immediate feedback during template editing
- YAML syntax errors not caught until runtime
- No way to test templates in isolation
- No template library or examples for specific use cases
- No documentation generation for custom templates

### Template Variables & Constraints

**Available Variables:**

- `{{local_path}}`: Calculated path to docset content (required)
- `{{keywords}}`: Primary search terms (required)
- `{{generalized_keywords}}`: Broader search context
- `{{docset_id}}`: Unique docset identifier
- `{{docset_name}}`: Human-readable docset name
- `{{docset_description}}`: Optional docset description

**Validation Constraints:**

- Required variables: `local_path`, `keywords` must be present
- Only allowed variables can be used (validated at config load)
- Invalid variables cause template validation errors
- Empty templates are rejected
- Malformed `{{variable}}` syntax causes errors

**Template Resolution Hierarchy:**

1. Docset-specific template (`docset.template`)
2. Global config template (`config.template`)
3. System default template (`DEFAULT_TEMPLATE`)

**Current Limitations:**

- No conditional logic or loops
- No nested variables or computed values
- No support for arrays or complex data structures
- String substitution only - no advanced templating features

---

_This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on._
