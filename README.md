# 🧠 Agentic Knowledge

> **⚠️ WORK IN PROGRESS ⚠️**  
> This project is under active development and not yet ready for production use. APIs may change without notice.

<div align="center">
  <h3>The End of RAG. The Dawn of Agentic Search.</h3>
  <p><em>Intelligent navigation instructions that guide AI assistants through documentation using filesystem-like exploration instead of traditional retrieval</em></p>

  <a href="https://github.com/yourusername/agentic-knowledge/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/yourusername/agentic-knowledge.svg?style=for-the-badge" alt="License" />
  </a>
  <a href="https://linkedin.com/in/yourusername">
    <img src="https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555" alt="LinkedIn" />
  </a>
</div>

---

## 🎯 What Is This?

**Agentic Knowledge** represents a fundamental paradigm shift away from traditional Retrieval-Augmented Generation (RAG) toward **agentic search patterns**. Instead of chunking documents, computing embeddings, and retrieving fragments, this system provides **intelligent navigation instructions** that leverage the AI agent's existing tools (grep, ripgrep, file reading) and the explosion of context windows.

### The Core Insight

Modern AI assistants are **context-rich** (200K+ tokens) and equipped with powerful filesystem tools. Rather than building complex search infrastructure, we can guide them to navigate documentation intelligently—just like Claude Code revolutionized code analysis by ditching RAG for direct filesystem exploration.

## 🪦 Why RAG is Dead

_Inspired by [The RAG Obituary](https://www.nicolasbustamante.com/p/the-rag-obituary-killed-by-agents) by Nicolas Bustamante_

Traditional RAG was a brilliant workaround for the **context-poor era** (GPT-4's 8K tokens). But it came with fundamental limitations:

### The RAG Problem Stack

```
❌ Chunking destroys document relationships
❌ Embeddings fail on precise terminology
❌ Similarity search misses exact matches
❌ Reranking adds latency and complexity
❌ Context fragmentation loses coherence
❌ Infrastructure burden is massive
```

### The Agentic Solution

```
✅ Direct filesystem navigation
✅ Intelligent reference following
✅ Complete document context
✅ Zero infrastructure overhead
✅ Sub-10ms response times
✅ Deterministic, precise results
```

## 🔄 From Retrieval to Navigation

Traditional RAG says: _"Here are 50 fragments that mention your keywords"_

Agentic Knowledge says: _"Search for 'useState' in `./docs/react-18.2/hooks/`. If that doesn't help, try 'state management' in `./docs/patterns/`. Follow any 'See also' references you find."_

The difference? **Guidance over fragments. Investigation over retrieval.**

## 🏗 How It Works

### MCP Server Integration

Implements the [Model Context Protocol](https://modelcontextprotocol.io/) with two core tools:

```typescript
// Get navigation guidance for specific queries
search_docs({
  docset: "react-docs",
  keywords: ["useEffect", "cleanup"],
  generalized_keywords: ["lifecycle", "memory"],
});

// Discover available documentation sets
list_docsets();
```

### Configuration-Driven Intelligence

Simple `.knowledge/config.yaml` pattern:

```yaml
docsets:
  react-docs:
    local_path: "./docs/react-18.2"
    description: "React framework documentation"
    template: |
      Search for '{{keywords}}' in {{local_path}}/hooks/. 
      If not found, try '{{generalized_keywords}}' in {{local_path}}/patterns/.
      Follow any cross-references you discover.
```

### The Navigation Response

Instead of document fragments, you get **actionable instructions**:

```
Based on your React useEffect cleanup query:

1. Start with `./docs/react-18.2/hooks/effect.md` - contains useEffect fundamentals
2. Search for "cleanup function" patterns in `./docs/react-18.2/patterns/`
3. Check `./examples/lifecycle/` for practical cleanup implementations
4. Review `./docs/react-18.2/performance/memory.md` for memory leak prevention

Focus on the cleanup function return pattern and dependency array management.
```

## 🚀 Why This Matters

### The Context Revolution

- **2022**: GPT-4 had 8K tokens (~12 pages)
- **2025**: Claude Sonnet has 200K tokens (~700 pages)
- **Future**: Heading toward 2M+ tokens (~6,000 pages)

### The Tool Evolution

AI assistants now have sophisticated filesystem tools:

- **Grep/Ripgrep**: Lightning-fast regex search through files
- **Glob**: Direct file discovery by patterns
- **Direct File Access**: Read complete documents in context
- **Reference Following**: Navigate cross-references naturally

### The Infrastructure Shift

- **RAG**: Elasticsearch clusters, embedding models, rerankers, vector databases
- **Agentic**: Simple YAML config, zero infrastructure, filesystem tools

## 🎯 Core Principles

### 1. **Guidance Over Search**

Provide intelligent navigation instructions instead of search results

### 2. **Context Abundance**

Leverage massive context windows instead of working around limitations

### 3. **Tool Evolution Compatibility**

Instructions remain stable as agent capabilities evolve (grep → AST parsing → future tools)

### 4. **Zero AI Dependency**

Pure logic-based guidance for reliability and speed

### 5. **Investigation Over Retrieval**

Agents follow references and build understanding incrementally

## 🚀 Quick Start

### Installation

```bash
npm install -g agentic-knowledge
# or
npx agentic-knowledge
```

### Basic Setup

1. **Create configuration directory**:

```bash
mkdir .knowledge
```

2. **Add configuration** (`.knowledge/config.yaml`):

```yaml
docsets:
  my-docs:
    local_path: "./docs"
    description: "My project documentation"
```

3. **Start the MCP server**:

```bash
agentic-knowledge
```

4. **Connect your AI assistant** using MCP protocol

## 📊 Performance vs RAG

| Metric             | Traditional RAG           | Agentic Knowledge |
| ------------------ | ------------------------- | ----------------- |
| **Setup Time**     | Hours (indexing)          | Seconds (config)  |
| **Response Time**  | 300-2000ms                | <10ms             |
| **Infrastructure** | Elasticsearch + Vector DB | Zero              |
| **Maintenance**    | High (reindexing)         | None              |
| **Accuracy**       | Fragment-based            | Complete context  |
| **Cost**           | High (compute)            | Minimal           |

## 🔬 The Future of Knowledge Systems

We're entering the **post-retrieval age**. The winners won't be those with the biggest vector databases, but those who design the smartest navigation systems for abundant context.

**RAG was training wheels**—useful, necessary, but temporary. The future belongs to systems that read, navigate, and reason end-to-end.

## 🚀 Local Development & Installation

### Installing from Source (Before NPM Publication)

Since the packages aren't published to npm yet, you can install them locally:

1. **Build all packages:**

   ```bash
   pnpm install
   pnpm build
   ```

2. **Create local installation packages:**

   ```bash
   pnpm run pack:local
   ```

   This creates `dist-local/` directory with packages that have workspace dependencies converted to relative file paths.

3. **Install the MCP server locally:**

   ```bash
   # Option 1: Install from tarball
   cd dist-local/mcp-server && npm pack
   npm install -g codemcp-knowledge-mcp-server-0.1.0.tgz

   # Option 2: Install directly from directory
   npm install -g ./dist-local/mcp-server/
   ```

4. **Verify installation:**
   ```bash
   agentic-knowledge --help
   ```

### Development

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build

# Format and lint
pnpm format
pnpm lint
```

## 🧪 Development Status

**Current Phase**: Finalization ✅

- ✅ Core implementation complete (107 tests passing)
- ✅ MCP protocol compliance verified
- ✅ Performance validated (0.47ms response time)
- ✅ Full documentation and examples
- ⚠️ Ready for community feedback and real-world testing

## 📚 Examples & Documentation

- [`examples/`](./examples/) - Configuration examples and integration guides
- [`TESTING.md`](./TESTING.md) - Comprehensive testing documentation
- [Architecture docs](./.vibe/docs/) - Detailed technical specifications

## 🤝 Contributing

This project follows a structured development workflow. See our development documentation for contribution guidelines.

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) file for details.

---

<div align="center">
  <p><strong>🎯 Moving beyond RAG into the agentic era of knowledge systems</strong></p>
  <p><em>Inspired by <a href="https://www.nicolasbustamante.com/p/the-rag-obituary-killed-by-agents">The RAG Obituary</a> by Nicolas Bustamante</em></p>
</div>
