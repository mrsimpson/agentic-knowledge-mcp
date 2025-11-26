# Agentic Knowledge User Guide

Complete guide to using Agentic Knowledge for managing and searching documentation.

## Table of Contents

- [Installation](#installation)
- [Docset Lifecycle](#docset-lifecycle)
- [CLI Commands](#cli-commands)
- [Configuration Guide](#configuration-guide)
- [Complete Workflows](#complete-workflows)
- [MCP Integration](#mcp-integration)
- [Troubleshooting](#troubleshooting)

## Installation

### From NPM (Recommended)

```bash
# Install in your project
npm install agentic-knowledge

# Or use directly with npx (no installation needed)
npx agentic-knowledge --help
```

### From Source

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

## Docset Lifecycle

A docset goes through the following phases:

```
1. CREATE     → Configure docset (manually edit config.yaml or use CLI presets)
2. INITIALIZE → Download and prepare documentation files
3. USE        → Search and navigate via MCP server
4. REFRESH    → Update documentation as needed
```

### Phase 1: CREATE

Define a docset in `.knowledge/config.yaml` either manually or using the CLI `create` command.

### Phase 2: INITIALIZE

Download and prepare documentation files to make them searchable. For git repos, this clones and filters the content. For local folders, this creates symlinks.

### Phase 3: USE

The MCP server exposes the docsets to AI assistants via the `search_docs` and `list_docsets` tools.

### Phase 4: REFRESH

Update already-initialized docsets with the latest content from their sources.

## CLI Commands

The `agentic-knowledge` CLI provides commands to manage your documentation lifecycle. When you run `agentic-knowledge` without arguments, it starts the MCP server. With arguments, it executes CLI commands.

### `create` - Create New Docset Configuration

Create docset configurations quickly using presets. Alternatively, you can manually edit `.knowledge/config.yaml` - this command is just a convenience tool that does it for you.

**Git Repository Preset:**
```bash
npx agentic-knowledge create \
  --preset git-repo \
  --id mcp-sdk \
  --name "MCP TypeScript SDK" \
  --url https://github.com/modelcontextprotocol/typescript-sdk.git \
  --branch main
```

**Local Folder Preset:**
```bash
npx agentic-knowledge create \
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

### `init` - Initialize Docset Sources

Initialize a configured docset by downloading and preparing documentation. Use this for **first-time setup**.

```bash
# Initialize a specific docset
npx agentic-knowledge init mcp-sdk

# Force re-initialization (start completely fresh)
npx agentic-knowledge init mcp-sdk --force

# Use custom config path
npx agentic-knowledge init mcp-sdk --config /path/to/config.yaml
```

**When to use:**
- Setting up a docset for the first time
- With `--force`: Completely reset a docset (deletes everything and re-downloads)

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

### `status` - Check Docset Status

View the status of all docsets and their sources:

```bash
# Basic status
npx agentic-knowledge status

# Detailed status with source information
npx agentic-knowledge status --verbose

# Use custom config
npx agentic-knowledge status --config /path/to/config.yaml
```

**Example output:**
```
📊 Docset Status

mcp-sdk (MCP TypeScript SDK)
   Initialized | 45 files | 2 source(s) loaded
   Initialized: 2024-11-20

react-docs (React Documentation)
   Initialized | 120 files | 1 source(s) loaded
   Initialized: 2024-11-15

api-docs (API Documentation)
   Not initialized | 1 source(s) configured

   💡 Run: agentic-knowledge init api-docs
```

### `refresh` - Update Documentation

Update already-initialized docsets with latest content. This is a **smart, incremental update**.

```bash
# Refresh all docsets
npx agentic-knowledge refresh

# Refresh specific docset
npx agentic-knowledge refresh mcp-sdk

# Force refresh (ignore throttle)
npx agentic-knowledge refresh mcp-sdk --force

# Use custom config
npx agentic-knowledge refresh --config /path/to/config.yaml
```

**Smart refresh logic:**
- Checks Git commit hash to detect changes
- Skips refresh if no changes detected
- Skips refresh if updated within 1 hour (unless `--force`)
- Updates in place (preserves metadata)

**When to use:**
- Getting latest updates from git repositories
- Routine maintenance/updates
- Checking for new content

**Key difference from `init --force`:**
- `init --force`: Deletes everything and starts fresh (destructive)
- `refresh`: Checks for changes and updates incrementally (smart)

## Configuration Guide

### Configuration File Location

Place your configuration file at `.knowledge/config.yaml` in your project root.

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

### Advanced: Custom Search Templates

You can customize the search instructions provided to AI assistants:

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

**Template variables:**
- `{{keywords}}` - Primary search terms
- `{{generalized_keywords}}` - Broader context terms
- `{{local_path}}` - Path to the docset

## Complete Workflows

### Workflow 1: Local Project Documentation

```bash
# 1. Create config for local docs
npx agentic-knowledge create \
  --preset local-folder \
  --id my-project \
  --name "My Project Docs" \
  --path ./docs

# 2. Check status
npx agentic-knowledge status

# 3. Configure Claude Desktop (see MCP Integration section)
# The server runs automatically when Claude launches
```

No initialization needed - local folders use symlinks!

### Workflow 2: External Git Repository

```bash
# 1. Create docset for a Git repository
npx agentic-knowledge create \
  --preset git-repo \
  --id react-docs \
  --name "React Documentation" \
  --url https://github.com/facebook/react.git \
  --branch main

# 2. Initialize the docset (downloads docs)
npx agentic-knowledge init react-docs

# 3. Check status
npx agentic-knowledge status

# 4. Configure Claude Desktop (see MCP Integration section)
# The server runs automatically when Claude launches

# Later: Update documentation
npx agentic-knowledge refresh react-docs
```

### Workflow 3: Multi-Repository Setup

```bash
# Set up multiple docsets
npx agentic-knowledge create --preset git-repo --id frontend-docs --name "Frontend Docs" --url https://github.com/company/frontend.git
npx agentic-knowledge create --preset git-repo --id backend-docs --name "Backend Docs" --url https://github.com/company/backend.git
npx agentic-knowledge create --preset local-folder --id internal-docs --name "Internal Docs" --path ./docs

# Initialize git repos
npx agentic-knowledge init frontend-docs
npx agentic-knowledge init backend-docs

# Check all statuses
npx agentic-knowledge status --verbose

# Configure Claude Desktop (see MCP Integration section)
# The server runs automatically when Claude launches
```

## MCP Integration

### MCP Server

When you run `agentic-knowledge` without arguments, it starts an MCP server that exposes two tools:

#### `search_docs` Tool

Get navigation guidance for specific queries:

```typescript
search_docs({
  docset_id: "react-docs",
  keywords: "useEffect cleanup",
  generalized_keywords: "hooks lifecycle memory",
});
```

**Returns:**
```json
{
  "instructions": "Search for 'useEffect cleanup' in .knowledge/docsets/react-docs/hooks/...",
  "search_terms": "useEffect cleanup",
  "generalized_search_terms": "hooks lifecycle memory",
  "path": ".knowledge/docsets/react-docs"
}
```

#### `list_docsets` Tool

Discover available documentation sets:

```typescript
list_docsets();
```

**Returns:**
```
Found 2 available docset(s):

**react-docs** (React Documentation)
  Description: Official React documentation
  Path: .knowledge/docsets/react-docs

**my-docs** (My Project Documentation)
  Description: Internal project documentation
  Path: docs
```

### Configuring MCP Clients

#### Claude Desktop

**Configuration file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Option 1: Using npx (recommended)**

```json
{
  "mcpServers": {
    "agentic-knowledge": {
      "command": "npx",
      "args": ["-y", "agentic-knowledge"]
    }
  }
}
```

The `-y` flag automatically confirms the installation prompt from npx.

**Option 2: Project-specific installation**

If you have agentic-knowledge installed in a specific project:

```json
{
  "mcpServers": {
    "agentic-knowledge": {
      "command": "npx",
      "args": ["-y", "agentic-knowledge"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

This runs the server in your project directory, making it use your project's `.knowledge/config.yaml`.

**Option 3: Global npm installation**

If you installed globally with `npm install -g agentic-knowledge`:

```json
{
  "mcpServers": {
    "agentic-knowledge": {
      "command": "agentic-knowledge"
    }
  }
}
```

**After configuration:**
1. Restart Claude Desktop
2. The server starts automatically in the background
3. Look for the 🔌 icon in Claude Desktop to verify the connection

#### Other MCP Clients

For other MCP clients, use:
- **Command**: `npx`
- **Args**: `["-y", "agentic-knowledge"]`
- **Transport**: stdio

The server will start automatically when the MCP client launches.

### Using in AI Conversations

Once configured, simply ask questions:

```
"How do I implement authentication in our API?"
"Show me examples of React hooks cleanup"
"Find the rate limiting configuration"
```

The AI assistant will:
1. Call `search_docs` with appropriate keywords
2. Receive navigation instructions
3. Use grep/ripgrep to search the documentation
4. Read relevant files with full context
5. Provide accurate answers

## Troubleshooting

### MCP Server Won't Start

**Error**: "No configuration file found"

**Solution**: Create `.knowledge/config.yaml` or the server will start with no docsets (shows setup instructions in tool descriptions).

### Docset Not Initialized

**Error**: "Docset 'X' is not initialized"

**Solution**: Run `agentic-knowledge init X`

### Git Clone Failures

**Error**: "Failed to clone repository"

**Solutions:**
- Check internet connection
- Verify repository URL is correct
- Ensure you have access to private repositories
- Try with `--branch` flag if default branch isn't `main`

### Status Shows Old Data

**Solution**: Run `agentic-knowledge refresh <docset-id>` to update

### Symlinks Not Working

**Issue**: Local folder changes not reflected

**Solutions:**
- Verify the source paths exist
- Check file permissions
- Re-run `agentic-knowledge create` with the local folder preset

### Search Not Finding Results

**Tips:**
- Try broader keywords with `generalized_keywords`
- Check the docset is initialized: `agentic-knowledge status`
- Verify the documentation actually contains the terms
- Use verbose status to see which files are included

---

For more information, see the [README](./README.md) or check the [examples](./examples/) directory.
