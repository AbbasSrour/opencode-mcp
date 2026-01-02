/**
 * Constants and configuration values used throughout the application
 */

// External API URLs
export const MODELS_DEV_URL = "https://models.dev/api";
export const CONFIG_SCHEMA_URL = "https://opencode.ai/config.json";
export const MCP_REGISTRY_URL = "https://registry.modelcontextprotocol.io/api/v1/servers";

// Cache and timing constants
export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Server metadata
export const SERVER_NAME = "opencode-mcp";
export const SERVER_VERSION = "0.1.0";

// Config file names (prefer JSONC for new files)
export const PROJECT_CONFIG_FILENAMES = ["opencode.jsonc", "opencode.json"] as const;
export const GLOBAL_CONFIG_FILENAMES = ["opencode.jsonc", "opencode.json"] as const;

// Default limits
export const DEFAULT_SEARCH_LIMIT = 50;
export const DEFAULT_BACKUP_COUNT = 5;
