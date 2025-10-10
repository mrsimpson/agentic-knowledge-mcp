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
  type KnowledgeConfig,
} from "@codemcp/knowledge-core";

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
   * Load configuration with caching
   */
  async function getConfiguration(): Promise<{
    config: KnowledgeConfig;
    configPath: string;
  }> {
    const now = Date.now();
    if (configCache && now - configLoadTime < CONFIG_CACHE_TTL) {
      return configCache;
    }

    try {
      // Find configuration file path
      const configPath = await findConfigPath();
      if (!configPath) {
        throw new Error(
          "No configuration file found. Please create a .knowledge/config.yaml file in your project.",
        );
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
      throw error;
    }
  }

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "search_docs",
          description:
            "Search for documentation guidance based on keywords and context. Returns intelligent navigation instructions to help you find relevant information in a specific docset.",
          inputSchema: {
            type: "object",
            properties: {
              docset_id: {
                type: "string",
                description:
                  "The identifier of the docset to search in. Use list_docsets to see available options.",
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
            "List all available documentation sets (docsets) that can be searched. Each docset represents a specific project, library, or knowledge base.",
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
          const { config, configPath } = await getConfiguration();

          // Find the requested docset
          const docset = config.docsets.find((d) => d.id === docset_id);
          if (!docset) {
            const availableIds = config.docsets.map((d) => d.id).join(", ");
            throw new Error(
              `Docset '${docset_id}' not found. Available docsets: ${availableIds}`,
            );
          }

          // Calculate local path
          const localPath = calculateLocalPath(docset, configPath);

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

          return {
            content: [
              {
                type: "text",
                text: instructions,
              },
            ],
          };
        }

        case "list_docsets": {
          // Load configuration
          const { config } = await getConfiguration();

          // Return list of available docsets
          const docsets = config.docsets.map((docset) => ({
            docset_id: docset.id,
            docset_name: docset.name,
            docset_description: docset.description || "No description provided",
            local_path: docset.local_path,
          }));

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
