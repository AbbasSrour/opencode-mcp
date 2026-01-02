# OpenCode MCP Server

> MCP server for discovering, configuring, and managing OpenCode setup with models.dev and MCP registry integration.

## Overview

OpenCode MCP is a Model Context Protocol server that helps you:

- 🤖 **Discover AI Models** - Browse and search models from models.dev
- 🔧 **Configure Providers** - Generate OpenCode configurations for AI providers
- 📦 **Find MCP Servers** - Discover MCP servers from the official registry
- ⚙️ **Manage Configuration** - Validate and optimize your OpenCode setup
- 💰 **Estimate Costs** - Calculate pricing for model usage

## Status

**✅ Ready to Use!**

All 15 tools are implemented and ready to use.

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Running the Server

```bash
npm run dev
```

### Adding to OpenCode

Add to your `opencode.json` (use absolute path):

```json
{
  "mcp": {
    "opencode-mcp": {
      "type": "local",
      "command": ["node", "/absolute/path/to/opencode-mcp/dist/index.js"],
      "enabled": true
    }
  }
}
```

Then restart OpenCode. The server will automatically:
- Load models.dev data (74 providers, 1000+ models)
- Load OpenCode schema (bundled, auto-updates if >24hrs old)
- Connect to MCP Registry
- Enable all 15 tools

## Available Tools

### Models.dev Integration (4 tools)
- ✅ **list-providers** - List all AI providers with model counts
- ✅ **search-models** - Search models by capabilities, pricing, context window
- ✅ **get-model-details** - Get comprehensive model information
- ✅ **get-provider-data** - Get provider data + schema for building configs (schema-driven approach)

### MCP Registry Integration (3 tools)
- ✅ **search-mcp-registry** - Browse and search the MCP registry
- ✅ **get-mcp-server-details** - Get detailed MCP server information
- ✅ **generate-mcp-config** - Generate OpenCode MCP server configurations

### Configuration Management (4 tools)
- ✅ **read-config** - Read project or global OpenCode configs
- ✅ **write-config** - Write/update configs with automatic backups
- ✅ **validate-config** - Validate configuration against schema
- ✅ **generate-config-snippet** - Get schema for ANY config section (30+ sections supported)

### Utilities (4 tools)
- ✅ **get-system-info** - Get system status (data age, schema, config locations)
- ✅ **get-schema** - Get OpenCode schema with path support (loaded from bundled file)
- ✅ **update-models-dev-data** - Manually refresh models.dev data
- ✅ **update-config-schema** - Manually refresh OpenCode schema

## Documentation

- [Implementation Plan](./PLAN.md) - Detailed roadmap and architecture
- [Contributing](./CONTRIBUTING.md) - How to contribute (coming soon)

## Data Sources

- **models.dev API** - Comprehensive AI model database
  - Automatically checks for updates on startup (if data > 24 hours old)
  - Manual update via `update-models-dev-data` tool
- **MCP Registry** - Official Model Context Protocol server registry (live API)
- **OpenCode Schema** - OpenCode configuration schema

## License

MIT

## Links

- [OpenCode](https://opencode.ai)
- [models.dev](https://models.dev)
- [MCP Registry](https://registry.modelcontextprotocol.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
