/**
 * MCP Server implementation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  loadConfig,
  findConfigPath,
  calculateLocalPath,
  processTemplate,
  createTemplateContext,
  getEffectiveTemplate,
  createStructuredResponse,
  type KnowledgeConfig,
} from "@codemcp/knowledge-core";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

/**
 * Create an agentic knowledge MCP server
 * @returns MCP server instance
 */
export function createAgenticKnowledgeServer() {
  const server = new Server(
    {
      name: "agentic-knowledge",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Cache for configuration to avoid repeated loading
  let configCache: { config: KnowledgeConfig; configPath: string } | null =
    null;
  let configLoadTime: number = 0;
  const CONFIG_CACHE_TTL = 60000; // 1 minute cache

  /**
   * Load configuration with caching (returns null if no config found)
   */
  async function getConfiguration(): Promise<{
    config: KnowledgeConfig;
    configPath: string;
  } | null> {
    const now = Date.now();
    if (configCache && now - configLoadTime < CONFIG_CACHE_TTL) {
      return configCache;
    }

    try {
      // Find configuration file path
      const configPath = await findConfigPath();
      if (!configPath) {
        return null; // No config file found - server can still start
      }

      // Load configuration
      const config = await loadConfig(configPath);

      // Cache result
      configCache = { config, configPath };
      configLoadTime = now;
      return configCache;
    } catch (error) {
      // Clear cache on error to force retry next time
      configCache = null;
      configLoadTime = 0;
      // Return null instead of throwing - allow server to start
      console.error("Error loading configuration:", error);
      return null;
    }
  }

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Load configuration to get available docsets
    const configData = await getConfiguration();

    // If no configuration, return tools with setup instructions
    if (!configData) {
      return {
        tools: [
          {
            name: "search_docs",
            description: `Search for documentation in configured docsets. Returns structured response with search instructions and parameters.

⚠️ **NO DOCSETS CONFIGURED**

To configure docsets and use this tool:

**Option 1: Use CLI (recommended)**
\`\`\`bash
# Create a docset for a Git repository
agentic-knowledge create \\
  --preset git-repo \\
  --id my-docs \\
  --name "My Documentation" \\
  --url https://github.com/user/repo.git

# Initialize it (downloads the docs)
agentic-knowledge init my-docs

# Restart the MCP server
agentic-knowledge
\`\`\`

**Option 2: Manual configuration**
Create \`.knowledge/config.yaml\`:
\`\`\`yaml
version: "1.0"
docsets:
  - id: my-docs
    name: My Documentation
    sources:
      - type: local_folder
        paths: ["./docs"]
\`\`\`

After configuring, the tool will show available docsets here.`,
            inputSchema: {
              type: "object",
              properties: {
                docset_id: {
                  type: "string",
                  description:
                    "The identifier of the docset to search in. (No docsets configured - see tool description for setup instructions)",
                },
                keywords: {
                  type: "string",
                  description:
                    'Primary search terms or concepts you\'re looking for. Be specific about what you want to find (e.g., "authentication middleware", "user validation", "API rate limiting").',
                },
                generalized_keywords: {
                  type: "string",
                  description:
                    'Related terms, synonyms, or contextual keywords that may appear alongside your primary keywords but are not your main target.',
                },
              },
              required: ["docset_id", "keywords"],
              additionalProperties: false,
            },
          },
          {
            name: "list_docsets",
            description:
              "List all available documentation sets (docsets) with detailed information. (Currently no docsets configured - see search_docs description for setup instructions)",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      };
    }

    // Configuration exists - build rich description with available docsets
    const { config } = configData;
    const docsetInfo = config.docsets
      .map((docset) => {
        const description = docset.description ? ` - ${docset.description}` : "";
        return `• **${docset.id}** (${docset.name})${description}`;
      })
      .join("\n");

    const searchDocsDescription = `Search for documentation in available docsets. Returns structured response with search instructions and parameters.

📚 **AVAILABLE DOCSETS:**
${docsetInfo}

🔍 **STRUCTURED RESPONSE:**
Returns JSON object with:
- instructions: Search guidance text
- search_terms: Primary keywords to search for
- generalized_search_terms: Broader terms for context
- path: Local directory path to search in

Use the path and search terms with your text search tools (grep, rg, ripgrep, find).`;

    return {
      tools: [
        {
          name: "search_docs",
          description: searchDocsDescription,
          inputSchema: {
            type: "object",
            properties: {
              docset_id: {
                type: "string",
                description: "Choose the docset to search in.",
                enum: config.docsets.map((d) => d.id),
              },
              keywords: {
                type: "string",
                description:
                  'Primary search terms or concepts you\'re looking for. Be specific about what you want to find (e.g., "authentication middleware", "user validation", "API rate limiting"). Include the exact terms you expect to appear in the documentation.',
              },
              generalized_keywords: {
                type: "string",
                description:
                  'Related terms, synonyms, or contextual keywords that may appear alongside your primary keywords but are not your main target. These help broaden the search context and catch relevant content that might use different terminology (e.g., for "authentication" you might include "login, signin, oauth, credentials, tokens"). Think of terms that would appear in the same sections or discussions as your main keywords.',
              },
            },
            required: ["docset_id", "keywords"],
            additionalProperties: false,
          },
        },
        {
          name: "list_docsets",
          description:
            "List all available documentation sets (docsets) with detailed information. Note: The search_docs tool already shows available docsets in its description, so this tool is mainly for getting additional metadata.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "search_docs": {
          const { docset_id, keywords, generalized_keywords } = args as {
            docset_id: string;
            keywords: string;
            generalized_keywords?: string;
          };

          // Validate required parameters
          if (!docset_id || typeof docset_id !== "string") {
            throw new Error("docset_id is required and must be a string");
          }
          if (!keywords || typeof keywords !== "string") {
            throw new Error("keywords is required and must be a string");
          }

          // Load configuration
          const configData = await getConfiguration();
          if (!configData) {
            throw new Error(
              "No configuration file found.\n\n" +
                "To configure docsets:\n\n" +
                "**Option 1: Use CLI (recommended)**\n" +
                "agentic-knowledge create --preset git-repo --id my-docs --name \"My Docs\" --url <repo-url>\n" +
                "agentic-knowledge init my-docs\n\n" +
                "**Option 2: Manual configuration**\n" +
                "Create .knowledge/config.yaml in your project root.\n" +
                "See the search_docs tool description for example configuration.",
            );
          }

          const { config, configPath } = configData;

          // Find the requested docset
          const docset = config.docsets.find((d) => d.id === docset_id);
          if (!docset) {
            const availableIds = config.docsets.map((d) => d.id).join(", ");
            throw new Error(
              `Docset '${docset_id}' not found.\n\n` +
                `Available docsets: ${availableIds}\n\n` +
                `To create a new docset:\n` +
                `agentic-knowledge create --preset git-repo --id ${docset_id} --name "My Docs" --url <repo-url>\n` +
                `agentic-knowledge init ${docset_id}`,
            );
          }

          // Calculate local path
          const localPath = calculateLocalPath(docset, configPath);

          // Check if docset is initialized (for git_repo sources)
          const primarySource = docset.sources?.[0];
          if (primarySource?.type === "git_repo") {
            // For git repos, the path should be absolute or relative to project root
            const configDir = dirname(configPath);
            const projectRoot = dirname(configDir);
            const absolutePath = resolve(projectRoot, localPath);

            if (!existsSync(absolutePath)) {
              throw new Error(
                `Docset '${docset_id}' is not initialized.\n\n` +
                  `The docset is configured but hasn't been initialized yet.\n\n` +
                  `To initialize this docset:\n` +
                  `agentic-knowledge init ${docset_id}\n\n` +
                  `To check status of all docsets:\n` +
                  `agentic-knowledge status`,
              );
            }
          }

          // Create template context with proper function signature
          const templateContext = createTemplateContext(
            localPath,
            keywords.trim(),
            (generalized_keywords || "").trim(),
            docset,
          );

          // Get effective template and process it
          const effectiveTemplate = getEffectiveTemplate(
            docset,
            config.template,
          );
          const instructions = processTemplate(
            effectiveTemplate,
            templateContext,
          );

          // Create structured response
          const structuredResponse = createStructuredResponse(
            instructions,
            keywords.trim(),
            (generalized_keywords || "").trim(),
            localPath,
          );

          return {
            structuredContent: structuredResponse,
          };
        }

        case "list_docsets": {
          // Load configuration
          const configData = await getConfiguration();
          if (!configData) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    "No docsets configured.\n\n" +
                    "To configure docsets:\n\n" +
                    "**Option 1: Use CLI (recommended)**\n" +
                    "```bash\n" +
                    "agentic-knowledge create --preset git-repo --id my-docs --name \"My Docs\" --url <repo-url>\n" +
                    "agentic-knowledge init my-docs\n" +
                    "```\n\n" +
                    "**Option 2: Manual configuration**\n" +
                    "Create `.knowledge/config.yaml`:\n" +
                    "```yaml\n" +
                    "version: \"1.0\"\n" +
                    "docsets:\n" +
                    "  - id: my-docs\n" +
                    "    name: My Documentation\n" +
                    "    sources:\n" +
                    "      - type: local_folder\n" +
                    "        paths: [\"./docs\"]\n" +
                    "```",
                },
              ],
            };
          }

          const { config, configPath } = configData;

          // Return list of available docsets with calculated paths
          const docsets = await Promise.all(
            config.docsets.map(async (docset) => ({
              docset_id: docset.id,
              docset_name: docset.name,
              docset_description:
                docset.description || "No description provided",
              local_path: await calculateLocalPath(docset, configPath),
            })),
          );

          const summary =
            `Found ${docsets.length} available docset(s):\n\n` +
            docsets
              .map(
                (d) =>
                  `**${d.docset_id}** (${d.docset_name})\n` +
                  `  Description: ${d.docset_description}\n` +
                  `  Path: ${d.local_path}`,
              )
              .join("\n\n");

          return {
            content: [
              {
                type: "text",
                text: summary,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      // Return structured error information
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMCPServer(): Promise<void> {
  const server = createAgenticKnowledgeServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log startup to stderr so it doesn't interfere with MCP protocol
  console.error("Agentic Knowledge MCP Server started");
}
