/**
 * Tool schema definitions for MCP server
 * 
 * Each tool schema defines the interface for a specific operation.
 * Organized by category: Models.dev, MCP Registry, Config Management, and Utilities.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// ============================================================================
// Models.dev Tools
// ============================================================================

export const listProvidersSchema: Tool = {
  name: "list-providers",
  description: "List all AI providers from models.dev with their names and optional model counts",
  inputSchema: {
    type: "object",
    properties: {
      include_model_count: {
        type: "boolean",
        description: "Include the number of models for each provider",
      },
    },
  },
};

export const searchModelsSchema: Tool = {
  name: "search-models",
  description: "Search for AI models by capabilities, pricing, context window, and more. Use this to find models matching specific criteria.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to match against model ID and name",
      },
      provider_id: {
        type: "string",
        description: "Filter by specific provider ID (e.g., 'anthropic', 'openai')",
      },
      min_context: {
        type: "number",
        description: "Minimum context window size in tokens",
      },
      max_context: {
        type: "number",
        description: "Maximum context window size in tokens",
      },
      max_input_cost: {
        type: "number",
        description: "Maximum input cost per 1M tokens",
      },
      max_output_cost: {
        type: "number",
        description: "Maximum output cost per 1M tokens",
      },
      reasoning: {
        type: "boolean",
        description: "Filter by reasoning capability",
      },
      tool_call: {
        type: "boolean",
        description: "Filter by tool calling capability",
      },
      attachment: {
        type: "boolean",
        description: "Filter by attachment/file upload capability",
      },
      modalities: {
        type: "array",
        items: { type: "string" },
        description: "Filter by input/output modalities (e.g., ['text', 'image'])",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 50)",
      },
    },
  },
};

export const getModelDetailsSchema: Tool = {
  name: "get-model-details",
  description: "Get comprehensive details for a specific AI model including capabilities, pricing, limits, and provider information",
  inputSchema: {
    type: "object",
    properties: {
      provider_id: {
        type: "string",
        description: "Provider ID (e.g., 'anthropic', 'openai')",
      },
      model_id: {
        type: "string",
        description: "Model ID (e.g., 'claude-opus-4-20250514')",
      },
    },
    required: ["provider_id", "model_id"],
  },
};

export const getProviderDataSchema: Tool = {
  name: "get-provider-data",
  description: "Get provider data and schema for constructing OpenCode configuration. Returns the provider's models.dev data AND the OpenCode schema for providers, so you can build a valid config. Always use this instead of trying to guess the config structure.",
  inputSchema: {
    type: "object",
    properties: {
      provider_id: {
        type: "string",
        description: "Provider ID to get data for (e.g., 'anthropic', 'openai')",
      },
    },
    required: ["provider_id"],
  },
};

// ============================================================================
// MCP Registry Tools
// ============================================================================

export const searchMCPRegistrySchema: Tool = {
  name: "search-mcp-registry",
  description: "Browse or search the MCP Registry for available MCP servers. Omit query to browse all servers.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to match against server names and descriptions",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 50)",
      },
    },
  },
};

export const getMCPServerDetailsSchema: Tool = {
  name: "get-mcp-server-details",
  description: "Get detailed information about a specific MCP server including packages, environment variables, and repository info",
  inputSchema: {
    type: "object",
    properties: {
      server_name: {
        type: "string",
        description: "Name of the MCP server",
      },
    },
    required: ["server_name"],
  },
};

export const generateMCPConfigSchema: Tool = {
  name: "generate-mcp-config",
  description: "Generate OpenCode configuration for an MCP server from the registry. Includes setup instructions and environment variable placeholders.",
  inputSchema: {
    type: "object",
    properties: {
      server_name: {
        type: "string",
        description: "Name of the MCP server",
      },
      enabled: {
        type: "boolean",
        description: "Whether the server should be enabled (default: true)",
      },
      environment: {
        type: "object",
        description: "Environment variables for the server",
        additionalProperties: { type: "string" },
      },
    },
    required: ["server_name"],
  },
};

// ============================================================================
// Config Management Tools
// ============================================================================

export const readConfigSchema: Tool = {
  name: "read-config",
  description: "Read OpenCode configuration file (project or global). Optionally read a specific section.",
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["project", "global", "auto"],
        description: "Which config to read: project (./opencode.json), global (~/.config/opencode/), or auto (search both, default)",
      },
      section: {
        type: "string",
        description: "Specific section to read (e.g., 'provider', 'mcp', 'agent')",
      },
    },
  },
};

export const writeConfigSchema: Tool = {
  name: "write-config",
  description: "Write or update OpenCode configuration with automatic backups. Can merge with existing config or replace entirely.",
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["project", "global"],
        description: "Where to write: project (./opencode.json) or global (~/.config/opencode/)",
      },
      config: {
        type: "object",
        description: "Configuration object to write",
      },
      mode: {
        type: "string",
        enum: ["merge", "replace"],
        description: "merge: combine with existing config, replace: overwrite entirely (default: merge)",
      },
      create_backup: {
        type: "boolean",
        description: "Create backup before writing (default: true)",
      },
    },
    required: ["scope", "config"],
  },
};

export const validateConfigSchema: Tool = {
  name: "validate-config",
  description: "Validate OpenCode configuration against the schema. Can validate a file or provided config data.",
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["project", "global", "auto"],
        description: "Which config file to validate (if not providing config_data)",
      },
      config_data: {
        type: "object",
        description: "Configuration data to validate (instead of reading from file)",
      },
    },
  },
};

export const generateConfigSnippetSchema: Tool = {
  name: "generate-config-snippet",
  description: "Get schema definition for any configuration path. Supports nested paths using dot notation (e.g., 'provider.models', 'mcp.filesystem.command', 'agent.general.tools'). Returns the schema so you can construct valid configs.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to configuration section using dot notation (e.g., 'provider', 'provider.whitelist', 'mcp', 'agent.general', 'permission.bash')",
      },
    },
    required: ["path"],
  },
};

// ============================================================================
// Utility Tools
// ============================================================================

export const getSystemInfoSchema: Tool = {
  name: "get-system-info",
  description: "Get system information including models.dev data age, schema status, and config file locations. Use this to determine if data needs updating.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const getSchemaSchema: Tool = {
  name: "get-schema",
  description: "Get the OpenCode configuration schema. Supports nested paths using dot notation (e.g., 'provider.models', 'mcp', 'agent.tools'). Schema is loaded from bundled file (use update-config-schema to refresh). Use this before generating any configs.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to schema section using dot notation (e.g., 'provider', 'provider.whitelist', 'mcp', 'full' for entire schema). Default: 'full'",
      },
    },
  },
};

export const updateModelsDevDataSchema: Tool = {
  name: "update-models-dev-data",
  description: "Manually update the bundled models.dev data file. This is done automatically on startup if data is older than 24 hours.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const updateConfigSchemaSchema: Tool = {
  name: "update-config-schema",
  description: "Manually update the bundled OpenCode configuration schema file",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

// ============================================================================
// All Tools Collection
// ============================================================================

/**
 * Complete list of all available tools
 */
export const ALL_TOOLS: Tool[] = [
  // Models.dev tools
  listProvidersSchema,
  searchModelsSchema,
  getModelDetailsSchema,
  getProviderDataSchema,
  
  // MCP Registry tools
  searchMCPRegistrySchema,
  getMCPServerDetailsSchema,
  generateMCPConfigSchema,
  
  // Config Management tools
  readConfigSchema,
  writeConfigSchema,
  validateConfigSchema,
  generateConfigSnippetSchema,
  
  // Utility tools
  getSystemInfoSchema,
  getSchemaSchema,
  updateModelsDevDataSchema,
  updateConfigSchemaSchema,
];
