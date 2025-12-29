/**
 * Type definitions for OpenCode configuration
 */

export interface OpenCodeConfig {
  $schema?: string;
  theme?: string;
  model?: string;
  share?: "manual" | "auto" | "disabled";
  autoupdate?: boolean;
  permission?: {
    edit?: string | Record<string, string>;
    bash?: string | Record<string, string>;
    skill?: string;
    webfetch?: string;
    doom_loop?: string;
    external_directory?: string;
  };
  tools?: {
    webfetch?: boolean;
    bash?: boolean;
    edit?: boolean;
    [key: string]: boolean | undefined;
  };
  agent?: Record<string, AgentConfig>;
  provider?: Record<string, ProviderConfig>;
  mcp?: Record<string, MCPServerConfig>;
  keybinds?: Record<string, string>;
}

export interface AgentConfig {
  mode?: "primary" | "subagent";
  model?: string;
  prompt?: string;
  temperature?: number;
  tools?: {
    write?: boolean;
    edit?: boolean;
    bash?: boolean;
    webfetch?: boolean;
    [key: string]: boolean | undefined;
  };
  permission?: {
    edit?: string | Record<string, string>;
    bash?: string | Record<string, string>;
  };
}

export interface ProviderConfig {
  npm?: string;
  name?: string;
  options?: {
    baseURL?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    [key: string]: any;
  };
  models?: Record<string, ModelConfig>;
}

export interface ModelConfig {
  id?: string;
  name?: string;
  limit?: {
    context?: number;
    output?: number;
  };
  options?: Record<string, any>;
}

export interface MCPServerConfig {
  type: "local" | "remote";
  command?: string[];
  url?: string;
  enabled?: boolean;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
}
