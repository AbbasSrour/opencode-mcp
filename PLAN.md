# OpenCode MCP Server - Implementation Plan

## Project Overview

**Name**: OpenCode MCP Server  
**Repository**: opencode-mcp  
**Purpose**: MCP server for discovering, configuring, and managing OpenCode setup

### Core Value Proposition

Help users discover, configure, and manage their OpenCode setup through:
1. ✅ **models.dev integration** - Find and configure AI models
2. ✅ **MCP registry integration** - Discover and add MCP servers from official registry
3. ✅ **Configuration management** - Generate, validate, and manage opencode.json

---

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.7+
- **MCP SDK**: @modelcontextprotocol/sdk ^1.0.4
- **Build Tool**: TypeScript compiler
- **Dev Tool**: tsx for development

### Project Structure

```
opencode-mcp/
├── src/
│   ├── index.ts                     # MCP server entry point
│   ├── types/
│   │   ├── index.ts                 # Type exports
│   │   ├── models-dev.ts            # models.dev API types
│   │   ├── mcp-registry.ts          # MCP registry types
│   │   └── opencode-config.ts       # OpenCode config types
│   ├── data/
│   │   ├── models-dev-loader.ts     # Load models.dev data
│   │   ├── mcp-registry-client.ts   # Fetch from official registry
│   │   └── schema-loader.ts         # OpenCode schema
│   ├── tools/
│   │   ├── models/                  # models.dev tools (8 tools)
│   │   │   ├── list-providers.ts
│   │   │   ├── search-models.ts
│   │   │   ├── get-model-details.ts
│   │   │   ├── compare-models.ts
│   │   │   ├── recommend-models.ts
│   │   │   ├── calculate-cost.ts
│   │   │   ├── generate-provider-config.ts
│   │   │   └── get-provider-setup-guide.ts
│   │   ├── mcp-registry/            # MCP registry tools (7 tools)
│   │   │   ├── browse-mcp-registry.ts
│   │   │   ├── search-mcp-registry.ts
│   │   │   ├── get-mcp-server-details.ts
│   │   │   ├── generate-mcp-config.ts
│   │   │   ├── recommend-mcps-for-project.ts
│   │   │   ├── compare-mcp-servers.ts
│   │   │   └── get-popular-mcps.ts
│   │   ├── config/                  # Config management (6 tools)
│   │   │   ├── read-config.ts
│   │   │   ├── validate-config.ts
│   │   │   ├── get-config-section.ts
│   │   │   ├── generate-config-snippet.ts
│   │   │   ├── explain-config-option.ts
│   │   │   └── get-config-examples.ts
│   │   └── utilities/               # Helper tools (5 tools)
│   │       ├── update-models-dev-data.ts
│   │       ├── get-env-var-template.ts
│   │       ├── check-requirements.ts
│   │       ├── troubleshoot-config.ts
│   │       └── optimize-config.ts
│   └── utils/
│       ├── config-parser.ts         # JSON/JSONC parsing
│       ├── validation.ts            # Schema validation
│       └── formatting.ts            # Output formatting
├── data/
│   ├── models-dev-api.json          # Bundled models.dev data (794KB)
│   └── config-schema.json           # Bundled OpenCode schema
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
└── PLAN.md                          # This file
```

---

## Data Sources & Management

### 1. models.dev API (Bundled)

**Source**: https://models.dev/api.json  
**Size**: ~794KB  
**Update Strategy**:
- Bundle `models-dev-api.json` in repository
- Load from local file on startup (fast, no network dependency)
- **IMPORTANT**: Never fetch directly via webfetch (5MB response will blow context window)
- MCP server checks file modification time on startup
- If data is older than 24 hours, automatically updates via `curl` subprocess
- Manual update available via `update-models-dev-data` tool

**Data Structure**:
```typescript
{
  "provider-id": {
    id: string;
    name: string;
    env: string[];      // Environment variables needed
    doc: string;        // Documentation URL
    npm: string;        // NPM package for AI SDK
    models: {
      "model-id": {
        id: string;
        name: string;
        cost: { input, output, cache_read, cache_write };
        limit: { context, output };
        modalities: { input[], output[] };
        capabilities: { tool_call, reasoning, attachment, etc. };
      }
    }
  }
}
```

### 2. MCP Registry (Live API)

**Source**: https://registry.modelcontextprotocol.io/v0.1/servers  
**Update Strategy**:
- Fetch live data on-demand (no bundling needed)
- Pagination: 30 servers per page with cursor-based pagination

**Data Structure**:
```typescript
{
  metadata: {
    nextCursor?: string;
    count: number;
  };
  servers: [{
    server: {
      name: string;
      description: string;
      version: string;
      repository: { url, source };
      packages: [{
        registryType: string;
        identifier: string;
        transport: { type };
        environmentVariables: [];
      }];
    };
    _meta: {
      "io.modelcontextprotocol.registry/official": {
        status: string;
        publishedAt: string;
        isLatest: boolean;
      };
    };
  }];
}
```

### 3. OpenCode Schema

**Source**: https://opencode.ai/config.json (if available)  
**Update Strategy**:
- Bundle fallback schema in repository
- Fetch from URL on startup with fallback to bundled version
- Use for validation and documentation

---

## Tool Specifications

### Category 1: Models & Providers (models.dev)

**Total**: 8 tools

#### 1.1 `list-providers`
**Purpose**: List all available AI providers from models.dev

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "filter": {
      "type": "string",
      "enum": ["has_npm_package", "open_weights", "all"],
      "description": "Filter providers by criteria"
    }
  }
}
```

**Output**: Array of providers with id, name, model count, doc URL

#### 1.2 `search-models`
**Purpose**: Search models by capabilities, pricing, context window

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "providers": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Filter by specific providers"
    },
    "min_context": {
      "type": "number",
      "description": "Minimum context window"
    },
    "max_input_cost": {
      "type": "number",
      "description": "Maximum input cost per million tokens"
    },
    "max_output_cost": {
      "type": "number",
      "description": "Maximum output cost per million tokens"
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["tool_call", "reasoning", "attachment", "vision", "pdf", "temperature"]
      },
      "description": "Required capabilities"
    },
    "modalities_input": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Required input modalities (text, image, pdf)"
    },
    "modalities_output": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Required output modalities"
    },
    "open_weights": {
      "type": "boolean",
      "description": "Filter by open weights models"
    },
    "sort_by": {
      "type": "string",
      "enum": ["cost_input", "cost_output", "context", "release_date"],
      "description": "Sort results by"
    }
  }
}
```

**Output**: Array of matching models with key details

#### 1.3 `get-model-details`
**Purpose**: Get comprehensive details about a specific model

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "model_id": {
      "type": "string",
      "description": "Model identifier (provider/model or just model-id)"
    }
  },
  "required": ["model_id"]
}
```

**Output**: Full model specification with all metadata

#### 1.4 `compare-models`
**Purpose**: Side-by-side comparison of multiple models

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "model_ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Array of model identifiers to compare",
      "minItems": 2
    }
  },
  "required": ["model_ids"]
}
```

**Output**: Comparison table with pricing, capabilities, limits

#### 1.5 `recommend-models`
**Purpose**: Get model recommendations based on use case

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "use_case": {
      "type": "string",
      "enum": ["general-coding", "cost-effective", "long-context", "vision", "reasoning", "fastest"],
      "description": "Primary use case"
    },
    "budget": {
      "type": "number",
      "description": "Maximum cost per million output tokens"
    },
    "min_context": {
      "type": "number",
      "description": "Minimum context window needed"
    }
  },
  "required": ["use_case"]
}
```

**Output**: Top 3-5 recommended models with rationale

#### 1.6 `calculate-cost`
**Purpose**: Estimate costs for token usage

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "model_id": {
      "type": "string",
      "description": "Model to calculate for"
    },
    "input_tokens": {
      "type": "number",
      "description": "Number of input tokens"
    },
    "output_tokens": {
      "type": "number",
      "description": "Number of output tokens"
    },
    "cached_tokens": {
      "type": "number",
      "description": "Number of cached tokens (optional)"
    }
  },
  "required": ["model_id", "input_tokens", "output_tokens"]
}
```

**Output**: Cost breakdown and total in USD

#### 1.7 `generate-provider-config`
**Purpose**: Generate OpenCode provider configuration

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "provider_id": {
      "type": "string",
      "description": "Provider to configure (e.g., 'anthropic', 'openai')"
    },
    "include_models": {
      "type": "string",
      "description": "Models to include: 'all' or specific model IDs",
      "default": "all"
    },
    "model_filter": {
      "type": "object",
      "description": "Filter criteria for models to include"
    }
  },
  "required": ["provider_id"]
}
```

**Output**: JSON configuration snippet for opencode.json

#### 1.8 `get-provider-setup-guide`
**Purpose**: Get setup instructions for a provider

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "provider_id": {
      "type": "string",
      "description": "Provider identifier"
    }
  },
  "required": ["provider_id"]
}
```

**Output**: Step-by-step setup guide with env vars, npm package, docs, example config

---

### Category 2: MCP Registry Integration

**Total**: 7 tools

#### 2.1 `browse-mcp-registry`
**Purpose**: Browse available MCP servers from official registry

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "limit": {
      "type": "number",
      "description": "Number of servers to return",
      "default": 30
    },
    "cursor": {
      "type": "string",
      "description": "Pagination cursor for next page"
    }
  }
}
```

**Output**: List of MCP servers with name, description, version

#### 2.2 `search-mcp-registry`
**Purpose**: Search MCP registry by keywords

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search term (searches name, description)"
    },
    "limit": {
      "type": "number",
      "description": "Max results",
      "default": 10
    }
  },
  "required": ["query"]
}
```

**Output**: Matching MCP servers

#### 2.3 `get-mcp-server-details`
**Purpose**: Get full details about a specific MCP server

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "server_name": {
      "type": "string",
      "description": "MCP server identifier (e.g., 'com.github.modelcontextprotocol/server-everything')"
    },
    "version": {
      "type": "string",
      "description": "Specific version, or latest"
    }
  },
  "required": ["server_name"]
}
```

**Output**: Complete server spec with installation commands, env vars, etc.

#### 2.4 `generate-mcp-config`
**Purpose**: Generate OpenCode configuration for an MCP server

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "server_name": {
      "type": "string",
      "description": "MCP server from registry"
    },
    "version": {
      "type": "string",
      "description": "Specific version"
    },
    "enabled": {
      "type": "boolean",
      "description": "Enable or disable by default",
      "default": true
    },
    "custom_name": {
      "type": "string",
      "description": "Override the MCP server key in config"
    }
  },
  "required": ["server_name"]
}
```

**Output**: JSON configuration snippet for opencode.json

#### 2.5 `recommend-mcps-for-project`
**Purpose**: Analyze current project and recommend relevant MCPs

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output**: Recommended MCPs based on detected frameworks, dependencies, file patterns

#### 2.6 `compare-mcp-servers`
**Purpose**: Compare similar MCP servers

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "server_names": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Array of server identifiers",
      "minItems": 2
    }
  },
  "required": ["server_names"]
}
```

**Output**: Side-by-side comparison

#### 2.7 `get-popular-mcps`
**Purpose**: Get most commonly used MCP servers

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "description": "Filter by use case (frontend, backend, devtools, etc.)"
    },
    "limit": {
      "type": "number",
      "description": "Number of results",
      "default": 10
    }
  }
}
```

**Output**: Popular MCPs (curated list based on metadata)

---

### Category 3: Configuration Management

**Total**: 6 tools

#### 3.1 `read-config`
**Purpose**: Read current opencode.json/opencode.jsonc

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "enum": ["project", "global", "all"],
      "description": "Which config to read",
      "default": "all"
    }
  }
}
```

**Output**: Current configuration

#### 3.2 `validate-config`
**Purpose**: Validate configuration against schema

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "config": {
      "type": "object",
      "description": "Config to validate, or validates current file"
    }
  }
}
```

**Output**: Validation errors/warnings or success message

#### 3.3 `get-config-section`
**Purpose**: Get specific section of config

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "section": {
      "type": "string",
      "enum": ["providers", "mcp", "agents", "permissions", "tools", "keybinds", "theme"],
      "description": "Section to retrieve"
    },
    "scope": {
      "type": "string",
      "enum": ["project", "global"],
      "description": "Which config to read from"
    }
  },
  "required": ["section"]
}
```

**Output**: Specific configuration section

#### 3.4 `generate-config-snippet`
**Purpose**: Generate configuration for any section

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "section": {
      "type": "string",
      "description": "Type of config to generate (provider, mcp, agent, permission, etc.)"
    },
    "options": {
      "type": "object",
      "description": "Section-specific parameters"
    }
  },
  "required": ["section", "options"]
}
```

**Output**: JSON snippet to add to config

#### 3.5 `explain-config-option`
**Purpose**: Explain what a config option does

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "option_path": {
      "type": "string",
      "description": "Config key path (e.g., 'agent.build.temperature')"
    }
  },
  "required": ["option_path"]
}
```

**Output**: Description, type, example values, documentation link

#### 3.6 `get-config-examples`
**Purpose**: Get example configurations for common scenarios

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "scenario": {
      "type": "string",
      "enum": ["frontend-project", "backend-api", "fullstack-app", "team-project", "data-science", "devops"],
      "description": "Scenario to get example for"
    }
  },
  "required": ["scenario"]
}
```

**Output**: Example configurations with explanations

---

### Category 4: Utilities

**Total**: 5 tools

#### 4.1 `update-models-dev-data`
**Purpose**: Update the bundled models.dev data file

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "force": {
      "type": "boolean",
      "description": "Force update even if data is recent",
      "default": false
    }
  }
}
```

**Output**: Success/failure message with stats (number of providers, file size, last update time)

**Implementation**: 
- Uses `curl` subprocess to download (never webfetch)
- Checks file modification time before updating
- Creates backup before overwriting
- Validates JSON after download

#### 4.2 `get-env-var-template`
**Purpose**: Generate .env template from current config

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output**: Template with all required env vars from providers/MCPs

#### 4.2 `check-requirements`
**Purpose**: Check if system has required dependencies

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output**: Status of required npm packages, env vars, etc.

#### 4.3 `troubleshoot-config`
**Purpose**: Debug configuration issues

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "error": {
      "type": "string",
      "description": "Error message to help diagnose"
    }
  }
}
```

**Output**: Diagnostic info and suggestions

#### 4.4 `optimize-config`
**Purpose**: Suggest config improvements

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output**: Recommendations for performance, cost, security

---

## Implementation Phases

### Phase 1: MVP (Core Functionality)

**Goal**: Basic working MCP server with essential tools

**Tasks**:
1. ✅ Project setup (TypeScript + MCP SDK)
2. ✅ Type definitions
3. ✅ Basic MCP server structure
4. Data loaders:
   - models.dev loader
   - MCP registry client
   - Config file reader
5. Implement tools:
   - **Models.dev**: 8 tools (all from Category 1)
   - **MCP Registry**: 7 tools (all from Category 2)
   - **Config**: 3 tools (read-config, validate-config, generate-config-snippet)
   - **Utilities**: 3 tools (update-models-dev-data, get-env-var-template, troubleshoot-config)

**Deliverables**:
- Working MCP server with 21 tools
- Can be added to OpenCode
- Basic documentation

**Timeline**: TBD

---

### Phase 2: Enhancement

**Goal**: Complete feature set and polish

**Tasks**:
1. Complete config management (3 remaining tools)
2. Complete utilities (2 remaining tools)
3. Improve error handling
4. Add comprehensive tests
5. Polish documentation

**Deliverables**:
- 26 total tools
- Production-ready quality
- Full documentation
- Test coverage

**Timeline**: TBD

---

### Phase 3: Advanced Features (Future)

**Potential additions**:
- Write operations (with dry-run mode)
- Config merging and backups
- Interactive setup wizards
- Analytics and usage tracking
- Custom provider templates
- Community contributions

---

## OpenCode Configuration Integration

### How Users Will Use This MCP

#### Installation

Add to `opencode.json`:
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

Or via OpenCode CLI (when published to npm):
```bash
opencode mcp add opencode-mcp
```

#### Usage Examples

**Example 1: Finding a cost-effective model**
```
User: "Find me a cheap model with 100K+ context for code analysis"

Assistant uses: search-models {
  min_context: 100000,
  max_output_cost: 5,
  capabilities: ["tool_call"],
  sort_by: "cost_output"
}

Assistant uses: compare-models {
  model_ids: ["top-3-from-search"]
}

Assistant uses: generate-provider-config {
  provider_id: "anthropic",
  include_models: ["claude-3-5-haiku-20241022"]
}

User gets ready-to-use config snippet ✅
```

**Example 2: Setting up a Next.js project**
```
User: "I'm starting a Next.js project with shadcn/ui"

Assistant uses: recommend-mcps-for-project
→ Detects Next.js, suggests shadcn MCP

Assistant uses: search-mcp-registry { query: "shadcn" }

Assistant uses: generate-mcp-config {
  server_name: "found-shadcn-server"
}

User gets MCP config to add to opencode.json ✅
```

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] All 21 Phase 1 tools implemented
- [ ] Successfully loads models.dev data
- [ ] Successfully fetches from MCP registry
- [ ] Can read OpenCode config files
- [ ] Works when added to OpenCode
- [ ] Basic error handling in place

### Phase 2 Success Criteria
- [ ] All 26 tools implemented
- [ ] Comprehensive error handling
- [ ] Full documentation
- [ ] Published to npm (optional)

---

## Technical Considerations

### Error Handling
- Graceful degradation if data sources unavailable
- Clear error messages for users
- Fallback to bundled data when network fails

### Performance
- Lazy load models.dev data
- Optimize search algorithms
- Efficient pagination for MCP registry queries

### Security
- No sensitive data in logs
- Validate all user inputs
- Safe config file parsing (handle JSONC)

### Compatibility
- Support both JSON and JSONC config files
- Handle missing or partial configs gracefully
- Work with both project and global configs

---

## Questions & Decisions Needed

### Before Implementation

1. **Phase 1 Scope**: Does the 20-tool Phase 1 feel right, or adjust?

2. **Read vs Write**: Should Phase 1 be read-only (user copies snippets), or include write operations with dry-run?

3. **Project Detection**: For `recommend-mcps-for-project`, how sophisticated should detection be?
   - Only package.json/obvious files?
   - Also analyze file structure?

4. **Popular MCPs**: How to determine "popular" MCPs?
   - Curated list maintained in code?
   - Parse registry metadata if available?
   - Community voting (future)?

5. **Naming**: Final confirmation on "opencode-mcp" as the package name?

---

## Next Steps

1. Review this plan
2. Address any questions/concerns
3. Begin Phase 1 implementation:
   - Start with data loaders
   - Implement models.dev tools first (most straightforward)
   - Then MCP registry tools
   - Finally config management and utilities
4. Test with real OpenCode instance
5. Iterate based on feedback

---

## References

- [OpenCode Documentation](https://opencode.ai/docs)
- [models.dev](https://models.dev)
- [MCP Registry](https://registry.modelcontextprotocol.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
