/**
 * Custom error types for OpenCode MCP Server
 * 
 * Provides specific error classes for different failure scenarios
 * to enable better error handling and user feedback.
 */

/**
 * Base error class for OpenCode MCP errors
 */
export class OpenCodeMCPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenCodeMCPError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a tool is not found in the registry
 */
export class ToolNotFoundError extends OpenCodeMCPError {
  constructor(toolName: string) {
    super(`Unknown tool: ${toolName}`);
    this.name = "ToolNotFoundError";
  }
}

/**
 * Error thrown when fetching external data fails
 */
export class DataFetchError extends OpenCodeMCPError {
  constructor(source: string, statusText?: string) {
    const message = statusText 
      ? `Failed to fetch ${source}: ${statusText}`
      : `Failed to fetch ${source}`;
    super(message);
    this.name = "DataFetchError";
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigValidationError extends OpenCodeMCPError {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Configuration validation failed:\n${errors.map(e => `- ${e}`).join("\n")}`);
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
}

/**
 * Error thrown when a configuration file is not found
 */
export class ConfigNotFoundError extends OpenCodeMCPError {
  public readonly searchedPaths: string[];

  constructor(searchedPaths: string[]) {
    super(`No OpenCode configuration file found.\n\nSearched paths:\n${searchedPaths.map(p => `- ${p}`).join("\n")}`);
    this.name = "ConfigNotFoundError";
    this.searchedPaths = searchedPaths;
  }
}

/**
 * Error thrown when a provider is not found in models.dev data
 */
export class ProviderNotFoundError extends OpenCodeMCPError {
  constructor(providerId: string) {
    super(`Provider not found: ${providerId}`);
    this.name = "ProviderNotFoundError";
  }
}

/**
 * Error thrown when a model is not found for a provider
 */
export class ModelNotFoundError extends OpenCodeMCPError {
  constructor(modelId: string, providerId: string) {
    super(`Model not found: ${modelId} in provider ${providerId}`);
    this.name = "ModelNotFoundError";
  }
}

/**
 * Error thrown when an MCP server is not found in the registry
 */
export class MCPServerNotFoundError extends OpenCodeMCPError {
  constructor(serverName: string) {
    super(`MCP server not found: ${serverName}`);
    this.name = "MCPServerNotFoundError";
  }
}

/**
 * Error thrown when a schema path is invalid
 */
export class SchemaPathError extends OpenCodeMCPError {
  constructor(pathPart: string, currentPath: string, available: string) {
    super(`Path '${pathPart}' not found at '${currentPath}'. Available: ${available}`);
    this.name = "SchemaPathError";
  }
}
