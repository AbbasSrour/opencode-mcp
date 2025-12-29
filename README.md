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

**🚧 Currently in Development**

This project is in active development. The implementation plan is documented in [PLAN.md](./PLAN.md).

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

Add to your `opencode.json`:

```json
{
  "mcp": {
    "opencode-mcp": {
      "type": "local",
      "command": ["node", "/path/to/opencode-mcp/dist/index.js"],
      "enabled": true
    }
  }
}
```

## Features (Planned)

### Models.dev Integration
- Browse AI providers and models
- Search models by capabilities, pricing, and context window
- Compare models side-by-side
- Get cost estimates
- Generate provider configurations

### MCP Registry Integration
- Browse official MCP registry
- Search for MCP servers
- Get installation instructions
- Generate MCP configurations
- Project-based recommendations

### Configuration Management
- Read and validate OpenCode configs
- Generate configuration snippets
- Explain configuration options
- Troubleshoot issues
- Optimize settings

## Documentation

- [Implementation Plan](./PLAN.md) - Detailed roadmap and architecture
- [Contributing](./CONTRIBUTING.md) - How to contribute (coming soon)

## Data Sources

- **models.dev API** - Comprehensive AI model database
- **MCP Registry** - Official Model Context Protocol server registry
- **OpenCode Schema** - OpenCode configuration schema

## License

MIT

## Links

- [OpenCode](https://opencode.ai)
- [models.dev](https://models.dev)
- [MCP Registry](https://registry.modelcontextprotocol.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
