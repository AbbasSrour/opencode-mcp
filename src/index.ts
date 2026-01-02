#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool definitions and registry
import { ALL_TOOLS } from "./tool-schemas.js";
import { executeTool } from "./tool-registry.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";

/**
 * OpenCode MCP Server
 * 
 * Provides tools for discovering, configuring, and managing OpenCode setup
 * including models.dev integration and MCP registry integration.
 */

const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: ALL_TOOLS,
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    console.error(`[${SERVER_NAME}] Executing tool: ${name}`);
    const result = await executeTool(name, args);

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[${SERVER_NAME}] Error executing tool ${name}:`, errorMessage);
    if (errorStack) {
      console.error(`[${SERVER_NAME}] Stack trace:`, errorStack);
    }
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

/**
 * Start the server
 */
async function main() {
  try {
    console.error(`[${SERVER_NAME}] Starting server...`);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[${SERVER_NAME}] Server running on stdio`);
    console.error(`[${SERVER_NAME}] Ready to accept requests`);
  } catch (error) {
    console.error(`[${SERVER_NAME}] Failed to start server:`, error);
    throw error;
  }
}

main().catch((error) => {
  console.error(`[${SERVER_NAME}] Fatal error in main():`, error);
  console.error(`[${SERVER_NAME}] Stack trace:`, error instanceof Error ? error.stack : "No stack trace");
  process.exit(1);
});
