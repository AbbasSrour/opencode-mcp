/**
 * Type definitions for MCP Registry API
 */

export interface MCPRegistryResponse {
  metadata: {
    nextCursor?: string;
    count: number;
  };
  servers: MCPRegistryServer[];
}

export interface MCPRegistryServer {
  server: {
    $schema: string;
    name: string;
    description: string;
    repository?: {
      url: string;
      source: string;
    };
    version: string;
    packages: MCPPackage[];
  };
  _meta: {
    "io.modelcontextprotocol.registry/official": {
      status: string;
      publishedAt: string;
      updatedAt: string;
      isLatest: boolean;
    };
  };
}

export interface MCPPackage {
  registryType: string;
  identifier: string;
  transport: {
    type: string;
  };
  environmentVariables?: Array<{
    description: string;
    format: string;
    isSecret: boolean;
    name: string;
  }>;
}
