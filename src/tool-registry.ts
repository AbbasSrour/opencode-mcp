/**
 * Tool registry for mapping tool names to handler functions
 * 
 * This module provides a clean registry pattern to avoid large switch statements
 * and make it easy to add new tools.
 */

import * as modelsDevTools from "./tools/models-dev.js";
import * as mcpRegistryTools from "./tools/mcp-registry.js";
import * as configTools from "./tools/config-management.js";
import { updateModelsDevData, updateConfigSchema, getSystemInfo, loadConfigSchema } from "./data-loaders.js";
import { ToolNotFoundError, SchemaPathError } from "./errors.js";

/**
 * Type for tool handler functions
 */
export type ToolHandler = (args: any) => Promise<string>;

/**
 * Registry mapping tool names to their handler functions
 */
export const TOOL_HANDLERS: Record<string, ToolHandler> = {
  // Models.dev tools
  "list-providers": modelsDevTools.listProviders,
  "search-models": modelsDevTools.searchModels,
  "get-model-details": modelsDevTools.getModelDetails,
  "get-provider-data": modelsDevTools.getProviderData,

  // MCP Registry tools
  "search-mcp-registry": mcpRegistryTools.searchMCPRegistry,
  "get-mcp-server-details": mcpRegistryTools.getMCPServerDetails,
  "generate-mcp-config": mcpRegistryTools.generateMCPConfig,

  // Config Management tools
  "read-config": configTools.readConfig,
  "write-config": configTools.writeConfig,
  "validate-config": configTools.validateConfig,
  "generate-config-snippet": configTools.generateConfigSnippet,

  // Utility tools - wrapped in async functions
  "get-system-info": async () => {
    const info = await getSystemInfo();
    let result = `# System Information\n\n`;
    result += `## Models.dev Data\n`;
    result += `- **Last Updated:** ${info.modelsDevLastUpdated || "Never (file not found)"}\n`;
    result += `- **Age:** ${info.modelsDevAge || "N/A"}\n`;
    result += `- **Needs Update:** ${info.modelsDevNeedsUpdate ? "Yes (older than 24 hours)" : "No"}\n`;
    result += `\n## OpenCode Schema\n`;
    result += `- **Exists:** ${info.schemaExists ? "Yes" : "No"}\n`;
    result += `- **Last Updated:** ${info.schemaLastUpdated || "N/A"}\n`;
    result += `\n## Configuration Files\n`;
    result += `- **Project Config:** ${info.projectConfigExists ? `Yes (${info.projectConfigPath})` : "No"}\n`;
    result += `- **Global Config:** ${info.globalConfigExists ? `Yes (${info.globalConfigPath})` : "No"}\n`;
    return result;
  },

  "get-schema": async (args: any) => {
    const pathStr = args?.path || "full";
    const schema = await loadConfigSchema();
    
    if (pathStr === "full") {
      return `# OpenCode Configuration Schema\n\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``;
    }
    
    // Navigate the path
    const pathParts = pathStr.split('.');
    let current = schema;
    
    for (const part of pathParts) {
      if (current.properties?.[part]) {
        current = current.properties[part];
      } else if (current.additionalProperties) {
        current = current.additionalProperties;
      } else if (current.items) {
        current = current.items;
      } else {
        const available = current.properties ? Object.keys(current.properties).join(", ") : "none";
        throw new SchemaPathError(part, pathStr, available);
      }
    }
    
    return `# OpenCode Schema - ${pathStr}\n\n\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\``;
  },

  "update-models-dev-data": async () => {
    await updateModelsDevData();
    return "models.dev data updated successfully.";
  },

  "update-config-schema": async () => {
    await updateConfigSchema();
    return "OpenCode configuration schema updated successfully.";
  },
};

/**
 * Execute a tool by name with the given arguments
 * 
 * @param toolName - Name of the tool to execute
 * @param args - Arguments to pass to the tool
 * @returns Promise resolving to the tool's result string
 * @throws Error if tool is not found or execution fails
 */
export async function executeTool(toolName: string, args: any): Promise<string> {
  const handler = TOOL_HANDLERS[toolName];
  
  if (!handler) {
    throw new ToolNotFoundError(toolName);
  }
  
  return await handler(args);
}
