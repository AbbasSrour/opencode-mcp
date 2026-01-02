/**
 * Tools for MCP Registry integration
 */

import { fetchMCPRegistry, fetchMCPServerDetails } from "../data-loaders.js";
import type { MCPRegistryServer } from "../types/mcp-registry.js";
import { MCPServerNotFoundError } from "../errors.js";

/**
 * Search or browse MCP Registry servers
 */
export async function searchMCPRegistry(args: {
  query?: string;
  limit?: number;
}): Promise<string> {
  const limit = args.limit ?? 50;
  const response = await fetchMCPRegistry(args.query, limit);

  if (response.servers.length === 0) {
    return args.query 
      ? `No MCP servers found matching "${args.query}".`
      : "No MCP servers found in the registry.";
  }

  let result = args.query
    ? `# MCP Servers matching "${args.query}" (${response.servers.length} results)\n\n`
    : `# MCP Servers (${response.servers.length} servers)\n\n`;

  for (const item of response.servers) {
    const server = item.server;
    const meta = item._meta["io.modelcontextprotocol.registry/official"];

    result += `## ${server.name}\n`;
    result += `${server.description}\n\n`;
    
    result += `**Version:** ${server.version}\n`;
    result += `**Status:** ${meta.status}\n`;
    
    if (server.repository) {
      result += `**Repository:** ${server.repository.url}\n`;
    }

    // Show packages info
    if (server.packages && server.packages.length > 0) {
      const pkg = server.packages[0];
      result += `**Type:** ${pkg.registryType}\n`;
      
      if (pkg.environmentVariables && pkg.environmentVariables.length > 0) {
        const secretVars = pkg.environmentVariables.filter(v => v.isSecret);
        const publicVars = pkg.environmentVariables.filter(v => !v.isSecret);
        
        if (secretVars.length > 0) {
          result += `**Required Secrets:** ${secretVars.map(v => v.name).join(", ")}\n`;
        }
        if (publicVars.length > 0) {
          result += `**Required Variables:** ${publicVars.map(v => v.name).join(", ")}\n`;
        }
      }
    }

    result += `**Published:** ${meta.publishedAt}\n`;
    result += "\n---\n\n";
  }

  if (response.metadata.nextCursor) {
    result += `\n*More results available. Use cursor: ${response.metadata.nextCursor}*\n`;
  }

  return result;
}

/**
 * Get detailed information about a specific MCP server
 */
export async function getMCPServerDetails(args: {
  server_name: string;
}): Promise<string> {
  const data = await fetchMCPServerDetails(args.server_name);
  
  if (!data || !data.server) {
    throw new MCPServerNotFoundError(args.server_name);
  }

  const server = data.server;
  const meta = data._meta?.["io.modelcontextprotocol.registry/official"];

  let result = `# ${server.name}\n\n`;
  result += `${server.description}\n\n`;

  result += `## Information\n\n`;
  result += `**Version:** ${server.version}\n`;
  if (meta) {
    result += `**Status:** ${meta.status}\n`;
    result += `**Published:** ${meta.publishedAt}\n`;
    result += `**Updated:** ${meta.updatedAt}\n`;
    result += `**Latest:** ${meta.isLatest ? "Yes" : "No"}\n`;
  }

  if (server.repository) {
    result += `\n## Repository\n\n`;
    result += `**URL:** ${server.repository.url}\n`;
    result += `**Source:** ${server.repository.source}\n`;
  }

  if (server.packages && server.packages.length > 0) {
    result += `\n## Packages\n\n`;
    
    for (let i = 0; i < server.packages.length; i++) {
      const pkg = server.packages[i];
      
      if (server.packages.length > 1) {
        result += `### Package ${i + 1}\n\n`;
      }

      result += `**Registry Type:** ${pkg.registryType}\n`;
      result += `**Identifier:** ${pkg.identifier}\n`;
      result += `**Transport:** ${pkg.transport.type}\n`;

      if (pkg.environmentVariables && pkg.environmentVariables.length > 0) {
        result += `\n**Environment Variables:**\n\n`;
        
        for (const envVar of pkg.environmentVariables) {
          result += `- **${envVar.name}**`;
          if (envVar.isSecret) {
            result += ` (Secret)`;
          }
          result += `\n`;
          result += `  ${envVar.description}\n`;
          if (envVar.format) {
            result += `  Format: ${envVar.format}\n`;
          }
        }
      }

      result += "\n";
    }
  }

  return result;
}

/**
 * Generate OpenCode MCP server configuration
 */
export async function generateMCPConfig(args: {
  server_name: string;
  enabled?: boolean;
  environment?: Record<string, string>;
}): Promise<string> {
  const data = await fetchMCPServerDetails(args.server_name);
  
  if (!data || !data.server) {
    throw new MCPServerNotFoundError(args.server_name);
  }

  const server = data.server;
  const pkg = server.packages?.[0];

  if (!pkg) {
    throw new MCPServerNotFoundError(`${args.server_name} (no package information found)`);
  }

  const enabled = args.enabled ?? true;
  const config: any = {
    enabled,
  };

  // Determine type based on registry type
  if (pkg.registryType === "npm") {
    config.type = "local";
    config.command = ["npx", "-y", pkg.identifier];
  } else {
    // For other types, we'll need to handle differently
    config.type = "local";
    config.command = [pkg.identifier];
  }

  // Add environment variables
  if (pkg.environmentVariables && pkg.environmentVariables.length > 0) {
    config.environment = args.environment ?? {};
    
    // Add placeholders for missing environment variables
    for (const envVar of pkg.environmentVariables) {
      if (!config.environment[envVar.name]) {
        config.environment[envVar.name] = envVar.isSecret 
          ? `<your-${envVar.name.toLowerCase().replace(/_/g, "-")}>` 
          : "";
      }
    }
  }

  let result = "```json\n";
  result += JSON.stringify({ mcp: { [server.name]: config } }, null, 2);
  result += "\n```\n";

  // Add setup instructions
  result += "\n## Setup Instructions\n\n";

  if (pkg.registryType === "npm") {
    result += `This MCP server will be automatically installed via npx when OpenCode runs.\n\n`;
  }

  if (pkg.environmentVariables && pkg.environmentVariables.length > 0) {
    result += `### Environment Variables\n\n`;
    result += `You need to configure the following environment variables:\n\n`;
    
    for (const envVar of pkg.environmentVariables) {
      result += `- **${envVar.name}**`;
      if (envVar.isSecret) {
        result += ` (Secret)`;
      }
      result += `\n`;
      result += `  ${envVar.description}\n`;
      if (envVar.format) {
        result += `  Format: \`${envVar.format}\`\n`;
      }
      result += "\n";
    }

    result += `Update the configuration with your actual values, or set them as shell environment variables.\n\n`;
  }

  if (server.repository) {
    result += `### Documentation\n\n`;
    result += `For more details, visit: ${server.repository.url}\n`;
  }

  return result;
}
