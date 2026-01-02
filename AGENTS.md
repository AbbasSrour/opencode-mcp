# AGENTS.md - OpenCode MCP Server

Guidelines for AI coding agents working in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides tools for discovering, configuring, and managing OpenCode setup. It integrates with models.dev (AI model database) and the MCP Registry.

**Tech Stack:** TypeScript, Node.js 18+, ES Modules, MCP SDK

## Build/Run Commands

```bash
npm install       # Install dependencies
npm run build     # Build (TypeScript compilation)
npm run dev       # Development mode (tsx)
npm run watch     # Watch mode for development
```

## Testing

No test framework is currently configured. If tests are added, use an ES Modules-compatible runner (vitest, node:test) and place tests in `tests/` or `__tests__/`.

## Code Style Guidelines

### Imports

- **Always use `.js` extension** for local imports (required for ES Modules):
  ```typescript
  import { foo } from "./utils.js";
  import type { Bar } from "../types/index.js";
  ```
- Order: external packages first, then local imports
- Use `type` keyword for type-only imports

### Naming Conventions

- **Files:** kebab-case (`tool-registry.ts`, `models-dev.ts`)
- **Interfaces/Types:** PascalCase (`ModelsDevProvider`, `OpenCodeConfig`)
- **Functions:** camelCase (`loadModelsDevData`, `validateConfig`)
- **Constants:** SCREAMING_SNAKE_CASE (`CACHE_MAX_AGE`, `SERVER_NAME`)
- **Tool names:** kebab-case in schemas (`list-providers`, `get-model-details`)

### Functions and Types

- All exported functions must have explicit return types
- Prefer async/await over raw Promises
- Document public functions with JSDoc:
  ```typescript
  /**
   * Load models.dev data from file or fetch if missing/stale
   * @param forceUpdate - If true, bypass cache and fetch fresh data
   * @returns Promise resolving to models.dev API data
   */
  export async function loadModelsDevData(forceUpdate = false): Promise<ModelsDevAPI> {
  ```

### Tool Implementation Pattern

Tools are implemented in `src/tools/` and registered in `src/tool-registry.ts`:

```typescript
// In src/tools/my-tool.ts
export async function myTool(args: {
  required_param: string;
  optional_param?: number;
}): Promise<string> {
  return `Result as markdown`;
}

// In src/tool-schemas.ts
export const myToolSchema: Tool = {
  name: "my-tool",
  description: "Description for AI",
  inputSchema: {
    type: "object",
    properties: {
      required_param: { type: "string", description: "..." },
    },
    required: ["required_param"],
  },
};

// In src/tool-registry.ts - add to TOOL_HANDLERS
"my-tool": myTools.myTool,
```

### Output Formatting

- Tool results return markdown-formatted strings
- Use headers (`#`, `##`) for sections
- Use bold (`**text**`) for labels
- Use code blocks for JSON/config output

### Type Definitions

- Place type definitions in `src/types/`
- Export from `src/types/index.ts`
- Use interfaces for object shapes, types for unions/primitives
- Optional properties use `?`, not `| undefined`

## File Structure

```
src/
  index.ts           # Server entry point
  constants.ts       # Configuration constants
  errors.ts          # Custom error classes
  data-loaders.ts    # Data loading and caching
  tool-registry.ts   # Tool handler registry
  tool-schemas.ts    # MCP tool schema definitions
  types/             # Type definitions
  tools/             # Tool implementations
data/                # Bundled data files (JSON)
```

## Design Principles

This codebase follows a **schema-driven** approach. See `DESIGN_PRINCIPLES.md` for details:
1. Don't hardcode config structures - fetch and use the actual OpenCode schema
2. Tools return schema + data - let AI construct configs
3. Data freshness awareness - track and report data age

## Common Patterns

```typescript
// Caching data with age check
let cache: DataType | null = null;
let cacheTime: number = 0;
if (!forceUpdate && cache && Date.now() - cacheTime < CACHE_MAX_AGE) {
  return cache;
}

// Null coalescing for defaults
const limit = args.limit ?? 50;
```

## Adding New Tools

1. Add types to `src/types/` if needed
2. Implement handler in `src/tools/`
3. Add schema to `src/tool-schemas.ts`
4. Register in `src/tool-registry.ts` (add to `TOOL_HANDLERS`)
5. Add to `ALL_TOOLS` array in `tool-schemas.ts`

## Git Conventions

- Present tense, imperative mood ("Add feature" not "Added feature")
- Keep commits focused on single changes
