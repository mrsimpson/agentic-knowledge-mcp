# Manual Testing Guide

This guide shows you how to manually test the agentic knowledge MCP server to verify it's working correctly.

## Quick Test with curl/manual MCP calls

1. **Start the server in a project with configuration**:
```bash
cd your-project-with-knowledge-config
npx agentic-knowledge
```

2. **Test tools/list request**:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx agentic-knowledge
```

Expected response: JSON with `search_docs` and `list_docsets` tools.

3. **Test list_docsets**:
```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_docsets","arguments":{}}}' | npx agentic-knowledge
```

Expected response: List of available docsets from your configuration.

4. **Test search_docs**:
```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_docs","arguments":{"docset_id":"your-docset-id","keywords":"search terms","generalized_keywords":"related terms"}}}' | npx agentic-knowledge
```

Expected response: Intelligent search instructions based on your template.

## Full E2E Test

Run the comprehensive test suite:

```bash
cd agentic-knowledge
pnpm test      # All unit and integration tests
pnpm test:e2e  # End-to-end MCP protocol compliance tests
```

## Parameter Description Validation

The e2e tests specifically validate that parameter descriptions clearly distinguish between:

- **`keywords`**: Primary search terms (specific targets)
- **`generalized_keywords`**: Related/contextual terms (broader context)

This ensures LLMs understand how to properly use the search functionality.

## Performance Validation

The tests validate:
- ✅ Server creation: <1ms
- ✅ E2E response time: <1ms (well under 10ms requirement)  
- ✅ Memory usage: <1MB

## What the Tests Cover

### Unit Tests (84 + 11 = 95)
- Configuration discovery and loading
- YAML parsing and validation
- Path calculation and resolution
- Template processing and variable substitution
- Error handling and edge cases
- Server lifecycle and caching

### E2E Tests (12)
- MCP protocol compliance
- Real client-server communication
- Tool schema validation
- Parameter description verification
- Error handling with graceful responses
- Custom template processing
- Performance requirements

## Expected Test Output

All tests should pass:
```
Test Files  1 passed (1)
     Tests  12 passed (12)
  Duration  ~1.5s
```

If any tests fail, check:
1. All dependencies installed (`pnpm install`)
2. Project built successfully (`pnpm build`)
3. No configuration conflicts in test environment