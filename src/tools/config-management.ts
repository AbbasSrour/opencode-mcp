/**
 * Tools for OpenCode configuration management
 * 
 * Provides functionality for reading, writing, validating, and generating
 * OpenCode configuration files with automatic backups and schema validation.
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { parse as parseJSONC } from "jsonc-parser";
import { loadConfigSchema } from "../data-loaders.js";
import type { OpenCodeConfig } from "../types/opencode-config.js";
import {
  PROJECT_CONFIG_FILENAMES,
  GLOBAL_CONFIG_FILENAMES,
  DEFAULT_BACKUP_COUNT,
} from "../constants.js";
import { ConfigValidationError, ConfigNotFoundError, SchemaPathError } from "../errors.js";

// Config file paths (prefer JSONC for new files)
const PROJECT_CONFIG_PATHS = PROJECT_CONFIG_FILENAMES.map(name => `./${name}`);
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".config", "opencode");
const GLOBAL_CONFIG_PATHS = GLOBAL_CONFIG_FILENAMES.map(name => 
  path.join(GLOBAL_CONFIG_DIR, name)
);

/**
 * Find config file (project or global)
 */
async function findConfigFile(scope: "project" | "global" | "auto"): Promise<string | null> {
  const paths = scope === "global" 
    ? GLOBAL_CONFIG_PATHS 
    : scope === "project"
    ? PROJECT_CONFIG_PATHS
    : [...PROJECT_CONFIG_PATHS, ...GLOBAL_CONFIG_PATHS];

  for (const configPath of paths) {
    try {
      await fs.access(configPath);
      return configPath;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Read OpenCode configuration file
 */
export async function readConfig(args: {
  scope?: "project" | "global" | "auto";
  section?: string;
}): Promise<string> {
  const scope = args.scope ?? "auto";
  const configPath = await findConfigFile(scope);

  if (!configPath) {
    const searchedPaths = scope === "global" 
      ? GLOBAL_CONFIG_PATHS 
      : scope === "project"
      ? PROJECT_CONFIG_PATHS
      : [...PROJECT_CONFIG_PATHS, ...GLOBAL_CONFIG_PATHS];
    
    return `No OpenCode configuration file found.\n\nSearched paths:\n${searchedPaths.map(p => `- ${p}`).join("\n")}`;
  }

  const content = await fs.readFile(configPath, "utf-8");
  const config = parseJSONC(content);

  // Return specific section if requested
  if (args.section) {
    const value = config[args.section];
    if (value === undefined) {
      return `Section "${args.section}" not found in configuration.\n\nAvailable sections: ${Object.keys(config).join(", ")}`;
    }

    return `# Config Section: ${args.section}\n\n**File:** ${configPath}\n\n\`\`\`json\n${JSON.stringify({ [args.section]: value }, null, 2)}\n\`\`\``;
  }

  // Return full config
  return `# OpenCode Configuration\n\n**File:** ${configPath}\n\n\`\`\`json\n${JSON.stringify(config, null, 2)}\n\`\`\``;
}

/**
 * Write/update OpenCode configuration with automatic backups
 */
export async function writeConfig(args: {
  scope: "project" | "global";
  config: Partial<OpenCodeConfig>;
  mode?: "merge" | "replace";
  create_backup?: boolean;
}): Promise<string> {
  const mode = args.mode ?? "merge";
  const createBackup = args.create_backup ?? true;

  // Determine target path
  let configPath: string | null = null;
  
  if (args.scope === "project") {
    configPath = await findConfigFile("project");
    if (!configPath) {
      // Create new project config
      configPath = PROJECT_CONFIG_PATHS[0];
    }
  } else {
    configPath = await findConfigFile("global");
    if (!configPath) {
      // Create new global config
      await fs.mkdir(GLOBAL_CONFIG_DIR, { recursive: true });
      configPath = GLOBAL_CONFIG_PATHS[0];
    }
  }

  const configDir = path.dirname(configPath);
  const isNewFile = !(await fs.access(configPath).then(() => true).catch(() => false));

  let finalConfig: any = args.config;

  // If merging and file exists, read and merge
  if (mode === "merge" && !isNewFile) {
    const existingContent = await fs.readFile(configPath, "utf-8");
    const existingConfig = parseJSONC(existingContent);
    finalConfig = deepMerge(existingConfig, args.config);
  }

  // Validate before writing
  const validation = await validateConfigData(finalConfig);
  if (!validation.valid) {
    throw new ConfigValidationError(validation.errors);
  }

  // Create backup if requested and file exists
  if (createBackup && !isNewFile) {
    const backupDir = path.join(configDir, ".opencode-backup");
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `${path.basename(configPath)}.backup.${timestamp}`);
    
    await fs.copyFile(configPath, backupPath);
    
    // Keep only last 5 backups
    await cleanupOldBackups(backupDir, 5);
  }

  // Write config
  const format = configPath.endsWith(".jsonc") ? "jsonc" : "json";
  const content = format === "jsonc"
    ? `// OpenCode Configuration\n${JSON.stringify(finalConfig, null, 2)}\n`
    : `${JSON.stringify(finalConfig, null, 2)}\n`;

  await fs.writeFile(configPath, content, "utf-8");

  return `Configuration ${isNewFile ? "created" : "updated"} successfully.\n\n**File:** ${configPath}\n**Mode:** ${mode}\n**Backup created:** ${createBackup && !isNewFile ? "Yes" : "No"}`;
}

/**
 * Validate OpenCode configuration against schema
 */
export async function validateConfig(args: {
  scope?: "project" | "global" | "auto";
  config_data?: Partial<OpenCodeConfig>;
}): Promise<string> {
  let config: any;
  let configPath: string | null = null;

  if (args.config_data) {
    config = args.config_data;
  } else {
    const scope = args.scope ?? "auto";
    configPath = await findConfigFile(scope);

    if (!configPath) {
      return "No configuration file found to validate.";
    }

    const content = await fs.readFile(configPath, "utf-8");
    config = parseJSONC(content);
  }

  const validation = await validateConfigData(config);

  if (validation.valid) {
    return configPath
      ? `✓ Configuration is valid.\n\n**File:** ${configPath}`
      : "✓ Configuration data is valid.";
  }

  return `✗ Configuration validation failed:\n\n${validation.errors.map(e => `- ${e}`).join("\n")}`;
}

/**
 * Generate configuration snippet for any section (schema-driven with path support)
 */
export async function generateConfigSnippet(args: {
  path: string;
}): Promise<string> {
  const pathStr = args.path;

  // Load the schema (from cache/file or fetch if needed)
  const schema = await loadConfigSchema();

  // Navigate the path
  const pathParts = pathStr.split('.');
  let current = schema;
  let currentPath = "";

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    currentPath = currentPath ? `${currentPath}.${part}` : part;
    
    // Try properties first
    if (current.properties?.[part]) {
      current = current.properties[part];
      continue;
    } 
    
    // If we're at the last part and it's in the current additionalProperties, navigate there
    if (i === pathParts.length - 1 && current.additionalProperties?.properties?.[part]) {
      current = current.additionalProperties.properties[part];
      continue;
    }
    
    // Try additionalProperties (for dynamic keys like provider names)
    if (current.additionalProperties && i < pathParts.length - 1) {
      current = current.additionalProperties;
      currentPath = currentPath.replace(`.${part}`, `.[${part}]`);
      continue;
    }
    
    // Try items (for arrays)
    if (current.items) {
      current = current.items;
      currentPath = currentPath.replace(`.${part}`, `[${part}]`);
      continue;
    }
    
    // Path not found, show available options
    const availableInProps = current.properties ? Object.keys(current.properties) : [];
    const availableInAdditionalProps = current.additionalProperties?.properties ? Object.keys(current.additionalProperties.properties) : [];
    const available = [...availableInProps, ...availableInAdditionalProps].join(", ") || "none";
    throw new SchemaPathError(part, currentPath, available);
  }

  let result = `# Schema: ${pathStr}\n\n`;
  
  result += `## Schema Definition\n\n`;
  result += `\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\`\n\n`;

  // Add helpful notes for specific paths
  const firstPart = pathParts[0];
  if (firstPart === "provider" && pathParts.length === 1) {
    result += `## Notes\n\n`;
    result += `- Use **get-provider-data** tool to get provider information and build configs\n`;
    result += `- **whitelist**: Array of model IDs to enable (all others disabled)\n`;
    result += `- **blacklist**: Array of model IDs to disable (all others enabled)\n`;
    result += `- **models**: Object for model-specific overrides\n\n`;
  } else if (firstPart === "mcp" && pathParts.length === 1) {
    result += `## Notes\n\n`;
    result += `- Use **get-mcp-server-details** and **generate-mcp-config** to configure MCP servers\n`;
    result += `- **type**: Either "local" or "remote"\n`;
    result += `- **command**: Array for local servers (e.g., ["npx", "-y", "package-name"])\n`;
    result += `- **url**: String for remote servers\n\n`;
  }

  result += `**Construct your configuration according to the schema above.**\n`;

  return result;
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }
  
  return output;
}

/**
 * Validate configuration data against schema
 * 
 * @param config - Configuration object to validate
 * @returns Promise with validation result and errors
 * @internal
 */
async function validateConfigData(config: any): Promise<{ valid: boolean; errors: string[] }> {
  // Basic validation - use the actual schema instead of hardcoded keys
  const errors: string[] = [];

  // Load the schema to get valid keys
  const schema = await loadConfigSchema();
  const validKeys = schema.properties ? Object.keys(schema.properties) : [];

  // Check for unknown top-level keys
  for (const key of Object.keys(config)) {
    if (!validKeys.includes(key)) {
      errors.push(`Unknown configuration key: ${key}`);
    }
  }

  // Validate provider structure
  if (config.provider) {
    for (const [providerId, provider] of Object.entries(config.provider as any)) {
      if (typeof provider !== "object") {
        errors.push(`provider.${providerId} must be an object`);
      }
    }
  }

  // Validate MCP structure
  if (config.mcp) {
    for (const [serverName, server] of Object.entries(config.mcp as any)) {
      if (typeof server !== "object" || server === null) {
        errors.push(`mcp.${serverName} must be an object`);
      } else if (!(server as any).type) {
        errors.push(`mcp.${serverName}.type is required`);
      } else if (!["local", "remote"].includes((server as any).type)) {
        errors.push(`mcp.${serverName}.type must be "local" or "remote"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Cleanup old backup files, keeping only the most recent N backups
 * 
 * @param backupDir - Directory containing backup files
 * @param keep - Number of recent backups to keep
 * @internal
 */
async function cleanupOldBackups(backupDir: string, keep: number = DEFAULT_BACKUP_COUNT): Promise<void> {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.includes(".backup."))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
      }));

    if (backupFiles.length <= keep) {
      return;
    }

    // Get file stats and sort by modification time
    const filesWithStats = await Promise.all(
      backupFiles.map(async (f) => ({
        ...f,
        mtime: (await fs.stat(f.path)).mtime,
      }))
    );

    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Delete old backups
    const toDelete = filesWithStats.slice(keep);
    for (const file of toDelete) {
      await fs.unlink(file.path);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}
