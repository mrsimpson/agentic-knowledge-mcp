# 🧠 Agentic Knowledge

A way to handle knowledge cut-off: Provide all sources you and your development team need to your agents.

<div align="center">
  <h3>The End of RAG. The Dawn of Agentic Search. Maybe.</h3>
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
version: "1.0"
docsets:
  - id: react-docs
    name: React Documentation
    description: "React framework documentation"
    sources:
      - type: local_folder
        paths: ["./docs/react-18.2"]
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
version: "1.0"
docsets:
  - id: my-docs
    name: My Project Documentation
    description: "Local project documentation"
    sources:
      - type: local_folder
        paths: ["./docs"]

  - id: react-docs
    name: React Documentation
    description: "Official React documentation from GitHub"
    sources:
      - type: git_repo
        url: "https://github.com/facebook/react.git"
        branch: "main"
        paths: ["docs/"]
```

3. **Start the MCP server**:

```bash
agentic-knowledge
```

4. **Connect your AI assistant** using MCP protocol

## 📋 Configuration Guide

### Local Folder Sources

For documentation stored locally in your project:

```yaml
docsets:
  - id: my-project
    name: My Project Docs
    sources:
      - type: local_folder
        paths:
          - "./docs" # Single directory
          - "./guides" # Multiple directories
          - "./api/README.md" # Specific files
```

**Benefits:**

- ✅ **No file duplication** - creates symlinks to original locations
- ✅ **Real-time updates** - changes immediately visible
- ✅ **Relative paths** - returns clean relative paths for LLM navigation

### Git Repository Sources

For documentation from remote repositories:

```yaml
docsets:
  - id: external-docs
    name: External Documentation
    sources:
      - type: git_repo
        url: "https://github.com/owner/repo.git"
        branch: "main" # Optional, defaults to main
        paths: ["docs/", "README.md"] # Optional, extracts specific paths
```

**Benefits:**

- ✅ **Automatic downloads** - fetches latest documentation
- ✅ **Selective extraction** - only downloads specified paths
- ✅ **Branch selection** - target specific branches or tags

### Mixed Configuration

Combine local and remote sources in one configuration:

```yaml
version: "1.0"
docsets:
  - id: local-guides
    name: Local User Guides
    sources:
      - type: local_folder
        paths: ["./docs/guides"]

  - id: api-reference
    name: API Reference
    sources:
      - type: git_repo
        url: "https://github.com/company/api-docs.git"
        paths: ["reference/"]

  - id: mixed-sources
    name: Combined Documentation
    sources:
      - type: local_folder
        paths: ["./internal-docs"]
      - type: git_repo
        url: "https://github.com/external/docs.git"
```

## 🛠️ CLI Commands & Docset Lifecycle

The `agentic-knowledge` CLI provides commands to manage your documentation lifecycle. When you run `agentic-knowledge` without arguments, it starts the MCP server. With arguments, it executes CLI commands.

### Understanding the Docset Lifecycle

A docset goes through the following phases:

```
1. CREATE     → Configure docset (manually edit config.yaml or use CLI presets)
2. INITIALIZE → Download and prepare documentation files
3. USE        → Search and navigate via MCP server
4. REFRESH    → Update documentation as needed
```

### CLI Commands

#### `create` - Create New Docset Configuration

Create docset configurations quickly using presets. Alternatively, you can manually edit `.knowledge/config.yaml` - this command is just a convenience tool that does it for you.

**Git Repository Preset:**
```bash
agentic-knowledge create \
  --preset git-repo \
  --id mcp-sdk \
  --name "MCP TypeScript SDK" \
  --url https://github.com/modelcontextprotocol/typescript-sdk.git \
  --branch main
```

**Local Folder Preset:**
```bash
agentic-knowledge create \
  --preset local-folder \
  --id my-docs \
  --name "My Documentation" \
  --path ./docs
```

**Options:**
- `--preset <type>`: Choose preset (`git-repo` or `local-folder`)
- `--id <id>`: Unique identifier for the docset
- `--name <name>`: Human-readable name
- `--url <url>`: Git repository URL (for git-repo preset)
- `--branch <branch>`: Git branch (optional, defaults to main)
- `--path <path>`: Local directory path (for local-folder preset)

The `create` command:
- ✅ Creates or updates `.knowledge/config.yaml`
- ✅ Validates docset ID uniqueness
- ✅ For local folders, creates symlinks immediately
- ✅ For git repos, prepares configuration for initialization

#### `init` - Initialize Docset Sources

Initialize a configured docset by downloading and preparing documentation:

```bash
# Initialize a specific docset
agentic-knowledge init mcp-sdk

# Force re-initialization
agentic-knowledge init mcp-sdk --force

# Use custom config path
agentic-knowledge init mcp-sdk --config /path/to/config.yaml
```

**What happens during initialization:**

1. **For Git Repositories:**
   - Clones repository to temporary directory
   - Extracts specified paths (if configured)
   - Applies smart filtering (excludes `node_modules/`, build artifacts, etc.)
   - Copies documentation to `.knowledge/docsets/{id}/`
   - Creates metadata files for change tracking

2. **For Local Folders:**
   - Creates symlinks in `.knowledge/docsets/{id}/`
   - No file duplication
   - Changes are immediately visible

3. **Creates Metadata:**
   - `.agentic-metadata.json` - Overall docset information
   - `.agentic-source-{index}.json` - Per-source tracking with content hashes

**Directory structure after init:**
```
.knowledge/
├── config.yaml
├── .gitignore (auto-created)
└── docsets/
    └── mcp-sdk/
        ├── .agentic-metadata.json
        ├── .agentic-source-0.json
        └── [documentation files...]
```

#### `status` - Check Docset Status

View the status of all docsets and their sources:

```bash
# Basic status
agentic-knowledge status

# Detailed status with source information
agentic-knowledge status --verbose

# Use custom config
agentic-knowledge status --config /path/to/config.yaml
```

**Status indicators:**
- ✅ Green: Updated within 24 hours
- ⚠️ Yellow: Updated 1-7 days ago
- 🔄 Red: Updated >7 days ago or not initialized

**Example output:**
```
📊 Docset Status

✅ mcp-sdk (MCP TypeScript SDK)
   Initialized | 45 files | 2 source(s) loaded
   Last refreshed: 2 hours ago

⚠️ react-docs (React Documentation)
   Initialized | 120 files | 1 source(s) loaded
   Last refreshed: 3 days ago

   💡 Consider running: agentic-knowledge refresh react-docs

🔄 api-docs (API Documentation)
   Not initialized | 1 source(s) configured

   💡 Run: agentic-knowledge init api-docs
```

#### `refresh` - Update Documentation

Refresh docset sources to get the latest content:

```bash
# Refresh all docsets
agentic-knowledge refresh

# Refresh specific docset
agentic-knowledge refresh mcp-sdk

# Force refresh (ignore cache)
agentic-knowledge refresh mcp-sdk --force

# Use custom config
agentic-knowledge refresh --config /path/to/config.yaml
```

**Smart refresh logic:**
- Checks Git commit hash to detect changes
- Skips refresh if updated within 1 hour (unless `--force`)
- Skips refresh if no changes detected
- Creates backup before refresh
- Updates metadata with new timestamp

**When to refresh:**
- Git repository has new commits
- It's been several days since last update
- You want to ensure latest content

### Complete Workflow Example

Here's a complete workflow from scratch:

```bash
# 1. Create docset for a Git repository
agentic-knowledge create \
  --preset git-repo \
  --id react-docs \
  --name "React Documentation" \
  --url https://github.com/facebook/react.git \
  --branch main

# 2. Initialize the docset (downloads docs)
agentic-knowledge init react-docs

# 3. Check status
agentic-knowledge status

# 4. Start MCP server (for AI assistant)
agentic-knowledge

# Later: Update documentation
agentic-knowledge refresh react-docs
```

## 🎯 How to Use

### Step 1: Set Up Your Documentation

Create a `.knowledge/config.yaml` file in your project root:

```yaml
version: "1.0"
docsets:
  - id: my-project
    name: My Project Documentation
    description: "Main project documentation"
    sources:
      - type: local_folder
        paths: ["./docs", "./README.md"]
```

### Step 2: Start the MCP Server

```bash
# Install globally
npm install -g agentic-knowledge

# Start the server
agentic-knowledge
```

The server will:

- ✅ Create symlinks for local folders in `.knowledge/docsets/`
- ✅ Validate your configuration
- ✅ Start listening for MCP requests

### Step 3: Connect Your AI Assistant

Configure your AI assistant (Claude Desktop, etc.) to use the MCP server:

```json
{
  "mcpServers": {
    "agentic-knowledge": {
      "command": "agentic-knowledge"
    }
  }
}
```

### Step 4: Search Your Documentation

Use the `search_docs` tool in your AI assistant:

```
search_docs({
  docset_id: "my-project",
  keywords: "authentication setup",
  generalized_keywords: "login, auth, security"
})
```

**Response:**

```
# 📚 Search My Project Documentation

**Primary terms:** authentication setup
**Related terms:** login, auth, security
**Location:** docs

## 🔍 Search Strategy

1. **Start with Specific Terms**
   Use your text search tools (grep, rg, ripgrep) to search for: `authentication setup`

2. **Expand to Related Terms**
   If initial search doesn't yield results, try: `login, auth, security`

3. **What to Avoid**
   Skip these directories: `node_modules/`, `.git/`, `.knowledge/`
```

### Step 5: Follow the Guidance

Your AI assistant will use the provided search strategy to:

1. 🔍 Search your documentation with the suggested terms
2. 📂 Navigate to the right files and directories
3. 🎯 Find exactly what you're looking for
4. 🔗 Follow cross-references and related content

## 💡 Pro Tips

### Local Development Workflow

```yaml
# Perfect for active development
docsets:
  - id: current-project
    name: Current Project
    sources:
      - type: local_folder
        paths: ["./docs", "./README.md", "./CHANGELOG.md"]
```

**Benefits:**

- Changes in your docs are immediately available
- No copying or syncing needed
- Works with any file type

### Multi-Repository Setup

```yaml
# Combine multiple sources
docsets:
  - id: frontend-docs
    name: Frontend Documentation
    sources:
      - type: local_folder
        paths: ["./frontend/docs"]
      - type: git_repo
        url: "https://github.com/company/design-system.git"
        paths: ["docs/"]

  - id: backend-docs
    name: Backend Documentation
    sources:
      - type: git_repo
        url: "https://github.com/company/api-docs.git"
        branch: "main"
```

### Advanced Search Strategies

Use specific and generalized keywords for better results:

```javascript
// ✅ Good: Specific + General
search_docs({
  docset_id: "react-docs",
  keywords: "useEffect cleanup function",
  generalized_keywords: "hooks, lifecycle, memory management",
});

// ❌ Too vague
search_docs({
  docset_id: "react-docs",
  keywords: "react",
  generalized_keywords: "javascript",
});
```

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
