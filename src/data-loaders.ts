/**
 * Data loaders for models.dev, OpenCode schema, and MCP Registry
 * 
 * This module handles loading and caching of external data sources:
 * - models.dev API: AI model and provider information
 * - OpenCode schema: Configuration schema
 * - MCP Registry: MCP server directory
 */

import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import type { ModelsDevAPI } from "./types/models-dev.js";
import type { MCPRegistryResponse } from "./types/mcp-registry.js";
import {
  MODELS_DEV_URL,
  CONFIG_SCHEMA_URL,
  MCP_REGISTRY_URL,
  CACHE_MAX_AGE,
  PROJECT_CONFIG_FILENAMES,
  GLOBAL_CONFIG_FILENAMES,
  DEFAULT_SEARCH_LIMIT,
} from "./constants.js";
import { DataFetchError } from "./errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data file paths
const DATA_DIR = path.join(__dirname, "..", "data");
const MODELS_DEV_FILE = path.join(DATA_DIR, "models-dev-api.json");
const CONFIG_SCHEMA_FILE = path.join(DATA_DIR, "config-schema.json");

// Cache for loaded data
let modelsDevCache: ModelsDevAPI | null = null;
let modelsDevCacheTime: number = 0;
let configSchemaCache: any = null;

/**
 * Ensure data directory exists, creating it if necessary
 * 
 * @internal
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
}

/**
 * Load models.dev data from file or fetch if missing/stale
 * 
 * @param forceUpdate - If true, bypass cache and fetch fresh data
 * @returns Promise resolving to models.dev API data
 * @throws Error if fetch fails
 */
export async function loadModelsDevData(forceUpdate = false): Promise<ModelsDevAPI> {
  // Return cache if valid
  if (!forceUpdate && modelsDevCache && Date.now() - modelsDevCacheTime < CACHE_MAX_AGE) {
    return modelsDevCache;
  }

  await ensureDataDir();

  // Try to load from file
  try {
    const stats = await fs.stat(MODELS_DEV_FILE);
    const fileAge = Date.now() - stats.mtimeMs;

    // If file exists and is fresh enough, load it
    if (!forceUpdate && fileAge < CACHE_MAX_AGE) {
      const data = await fs.readFile(MODELS_DEV_FILE, "utf-8");
      modelsDevCache = JSON.parse(data);
      modelsDevCacheTime = Date.now();
      return modelsDevCache!;
    }
  } catch (error) {
    // File doesn't exist or is unreadable, will fetch below
  }

  // Fetch fresh data
  console.error("Fetching fresh models.dev data...");
  const response = await fetch(MODELS_DEV_URL);
  if (!response.ok) {
    throw new DataFetchError("models.dev data", response.statusText);
  }

  const data = await response.json() as ModelsDevAPI;

  // Save to file
  await fs.writeFile(MODELS_DEV_FILE, JSON.stringify(data, null, 2), "utf-8");

  // Update cache
  modelsDevCache = data;
  modelsDevCacheTime = Date.now();

  return data;
}

/**
 * Manually update models.dev data file
 */
export async function updateModelsDevData(): Promise<void> {
  await loadModelsDevData(true);
}

/**
 * Load OpenCode config schema from file or fetch if missing
 * 
 * @param forceUpdate - If true, bypass cache and fetch fresh schema
 * @returns Promise resolving to OpenCode configuration schema
 * @throws Error if fetch fails
 */
export async function loadConfigSchema(forceUpdate = false): Promise<any> {
  // Return cache if valid
  if (!forceUpdate && configSchemaCache) {
    return configSchemaCache;
  }

  await ensureDataDir();

  // Try to load from file
  if (!forceUpdate) {
    try {
      const data = await fs.readFile(CONFIG_SCHEMA_FILE, "utf-8");
      configSchemaCache = JSON.parse(data);
      return configSchemaCache;
    } catch (error) {
      // File doesn't exist or is unreadable, will fetch below
    }
  }

  // Fetch fresh schema
  console.error("Fetching fresh OpenCode schema...");
  const response = await fetch(CONFIG_SCHEMA_URL);
  if (!response.ok) {
    throw new DataFetchError("OpenCode schema", response.statusText);
  }

  const schema = await response.json();

  // Save to file
  await fs.writeFile(CONFIG_SCHEMA_FILE, JSON.stringify(schema, null, 2), "utf-8");

  // Update cache
  configSchemaCache = schema;

  return schema;
}

/**
 * Manually update OpenCode config schema file
 */
export async function updateConfigSchema(): Promise<void> {
  await loadConfigSchema(true);
}

/**
 * Fetch MCP Registry data (always live, no caching)
 * 
 * @param query - Optional search query to filter servers
 * @param limit - Maximum number of results (default: 50)
 * @param cursor - Pagination cursor for fetching next page
 * @returns Promise resolving to MCP registry response
 * @throws Error if fetch fails
 */
export async function fetchMCPRegistry(query?: string, limit = DEFAULT_SEARCH_LIMIT, cursor?: string): Promise<MCPRegistryResponse> {
  const url = new URL(MCP_REGISTRY_URL);
  
  if (query) {
    url.searchParams.set("query", query);
  }
  if (limit) {
    url.searchParams.set("limit", limit.toString());
  }
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new DataFetchError("MCP registry", response.statusText);
  }

  return await response.json() as MCPRegistryResponse;
}

/**
 * Fetch single MCP server details by name
 * 
 * @param serverName - Name of the MCP server to fetch
 * @returns Promise resolving to server details
 * @throws Error if server not found or fetch fails
 */
export async function fetchMCPServerDetails(serverName: string): Promise<any> {
  const url = `${MCP_REGISTRY_URL}/${encodeURIComponent(serverName)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new DataFetchError(`MCP server details for ${serverName}`, response.statusText);
  }

  return await response.json();
}

/**
 * Get system information about data files and configuration
 */
export async function getSystemInfo(): Promise<{
  modelsDevLastUpdated: string | null;
  modelsDevAge: string | null;
  modelsDevNeedsUpdate: boolean;
  schemaLastUpdated: string | null;
  schemaExists: boolean;
  projectConfigExists: boolean;
  projectConfigPath: string | null;
  globalConfigExists: boolean;
  globalConfigPath: string | null;
}> {
  const info: any = {
    modelsDevLastUpdated: null,
    modelsDevAge: null,
    modelsDevNeedsUpdate: false,
    schemaLastUpdated: null,
    schemaExists: false,
    projectConfigExists: false,
    projectConfigPath: null,
    globalConfigExists: false,
    globalConfigPath: null,
  };

  // Check models.dev file
  try {
    const stats = await fs.stat(MODELS_DEV_FILE);
    const mtime = stats.mtime;
    const age = Date.now() - mtime.getTime();
    
    info.modelsDevLastUpdated = mtime.toISOString();
    info.modelsDevAge = formatAge(age);
    info.modelsDevNeedsUpdate = age > CACHE_MAX_AGE;
  } catch (error) {
    // File doesn't exist
  }

  // Check schema file
  try {
    const stats = await fs.stat(CONFIG_SCHEMA_FILE);
    info.schemaLastUpdated = stats.mtime.toISOString();
    info.schemaExists = true;
  } catch (error) {
    // File doesn't exist
  }

  // Check project config
  const projectPaths = PROJECT_CONFIG_FILENAMES.map(name => `./${name}`);
  for (const p of projectPaths) {
    try {
      await fs.access(p);
      info.projectConfigExists = true;
      info.projectConfigPath = p;
      break;
    } catch {
      continue;
    }
  }

  // Check global config
  const globalDir = path.join(process.env.HOME || "~", ".config", "opencode");
  const globalPaths = GLOBAL_CONFIG_FILENAMES.map(name => path.join(globalDir, name));
  for (const p of globalPaths) {
    try {
      await fs.access(p);
      info.globalConfigExists = true;
      info.globalConfigPath = p;
      break;
    } catch {
      continue;
    }
  }

  return info;
}

/**
 * Format age in human-readable format
 * 
 * @param ms - Age in milliseconds
 * @returns Human-readable age string (e.g., "2 days ago", "3 hours ago")
 * @internal
 */
function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else {
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }
}
