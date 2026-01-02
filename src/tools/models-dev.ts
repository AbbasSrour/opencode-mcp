/**
 * Tools for models.dev integration
 */

import { loadModelsDevData } from "../data-loaders.js";
import type { ModelsDevProvider, ModelsDevModel } from "../types/models-dev.js";
import { ProviderNotFoundError, ModelNotFoundError } from "../errors.js";

/**
 * List all AI providers from models.dev
 */
export async function listProviders(args: { 
  include_model_count?: boolean 
}): Promise<string> {
  const data = await loadModelsDevData();
  const providers = Object.entries(data);

  const result = providers.map(([id, provider]) => {
    let line = `- **${provider.name}** (${id})`;
    
    if (args.include_model_count) {
      const modelCount = Object.keys(provider.models).length;
      line += ` - ${modelCount} models`;
    }

    if (provider.doc) {
      line += `\n  Docs: ${provider.doc}`;
    }

    return line;
  });

  return `# AI Providers (${providers.length} total)\n\n${result.join("\n\n")}`;
}

/**
 * Search for AI models by capabilities, pricing, and context
 */
export async function searchModels(args: {
  query?: string;
  provider_id?: string;
  min_context?: number;
  max_context?: number;
  max_input_cost?: number;
  max_output_cost?: number;
  reasoning?: boolean;
  tool_call?: boolean;
  attachment?: boolean;
  modalities?: string[];
  limit?: number;
}): Promise<string> {
  const data = await loadModelsDevData();
  const limit = args.limit ?? 50;
  const results: Array<{ provider: string; model: ModelsDevModel }> = [];

  for (const [providerId, provider] of Object.entries(data)) {
    // Filter by provider if specified
    if (args.provider_id && providerId !== args.provider_id) {
      continue;
    }

    for (const model of Object.values(provider.models)) {
      // Filter by query (search in id and name)
      if (args.query) {
        const q = args.query.toLowerCase();
        if (!model.id.toLowerCase().includes(q) && !model.name.toLowerCase().includes(q)) {
          continue;
        }
      }

      // Filter by context window
      if (args.min_context && (!model.limit?.context || model.limit.context < args.min_context)) {
        continue;
      }
      if (args.max_context && model.limit?.context && model.limit.context > args.max_context) {
        continue;
      }

      // Filter by cost
      if (args.max_input_cost && model.cost?.input && model.cost.input > args.max_input_cost) {
        continue;
      }
      if (args.max_output_cost && model.cost?.output && model.cost.output > args.max_output_cost) {
        continue;
      }

      // Filter by capabilities
      if (args.reasoning !== undefined && model.reasoning !== args.reasoning) {
        continue;
      }
      if (args.tool_call !== undefined && model.tool_call !== args.tool_call) {
        continue;
      }
      if (args.attachment !== undefined && model.attachment !== args.attachment) {
        continue;
      }

      // Filter by modalities
      if (args.modalities && args.modalities.length > 0) {
        const inputModalities = model.modalities?.input ?? [];
        const outputModalities = model.modalities?.output ?? [];
        const allModalities = [...inputModalities, ...outputModalities];
        
        const hasAllModalities = args.modalities.every(m => allModalities.includes(m));
        if (!hasAllModalities) {
          continue;
        }
      }

      results.push({ provider: provider.name, model });

      if (results.length >= limit) {
        break;
      }
    }

    if (results.length >= limit) {
      break;
    }
  }

  if (results.length === 0) {
    return "No models found matching the criteria.";
  }

  const formatted = results.map(({ provider, model }) => {
    let text = `## ${model.name} (${model.id})\n`;
    text += `**Provider:** ${provider}\n`;
    
    if (model.family) {
      text += `**Family:** ${model.family}\n`;
    }

    // Capabilities
    const capabilities: string[] = [];
    if (model.reasoning) capabilities.push("Reasoning");
    if (model.tool_call) capabilities.push("Tool Calling");
    if (model.attachment) capabilities.push("Attachments");
    if (capabilities.length > 0) {
      text += `**Capabilities:** ${capabilities.join(", ")}\n`;
    }

    // Modalities
    if (model.modalities) {
      if (model.modalities.input?.length) {
        text += `**Input:** ${model.modalities.input.join(", ")}\n`;
      }
      if (model.modalities.output?.length) {
        text += `**Output:** ${model.modalities.output.join(", ")}\n`;
      }
    }

    // Context and output limits
    if (model.limit) {
      if (model.limit.context) {
        text += `**Context:** ${model.limit.context.toLocaleString()} tokens\n`;
      }
      if (model.limit.output) {
        text += `**Max Output:** ${model.limit.output.toLocaleString()} tokens\n`;
      }
    }

    // Cost
    if (model.cost) {
      const costs: string[] = [];
      if (model.cost.input !== undefined) {
        costs.push(`Input: $${model.cost.input}/1M tokens`);
      }
      if (model.cost.output !== undefined) {
        costs.push(`Output: $${model.cost.output}/1M tokens`);
      }
      if (costs.length > 0) {
        text += `**Cost:** ${costs.join(", ")}\n`;
      }
    }

    // Dates
    if (model.release_date) {
      text += `**Released:** ${model.release_date}\n`;
    }

    return text;
  });

  return `# Search Results (${results.length} models)\n\n${formatted.join("\n---\n\n")}`;
}

/**
 * Get comprehensive details for a specific model
 */
export async function getModelDetails(args: {
  provider_id: string;
  model_id: string;
}): Promise<string> {
  const data = await loadModelsDevData();
  const provider = data[args.provider_id];

  if (!provider) {
    throw new ProviderNotFoundError(args.provider_id);
  }

  const model = provider.models[args.model_id];
  if (!model) {
    throw new ModelNotFoundError(args.model_id, args.provider_id);
  }

  let text = `# ${model.name}\n\n`;
  text += `**ID:** ${model.id}\n`;
  text += `**Provider:** ${provider.name} (${args.provider_id})\n`;

  if (model.family) {
    text += `**Family:** ${model.family}\n`;
  }

  text += `\n## Capabilities\n\n`;
  text += `- **Reasoning:** ${model.reasoning ? "✓" : "✗"}\n`;
  text += `- **Tool Calling:** ${model.tool_call ? "✓" : "✗"}\n`;
  text += `- **Attachments:** ${model.attachment ? "✓" : "✗"}\n`;
  text += `- **Temperature Control:** ${model.temperature ? "✓" : "✗"}\n`;

  if (model.modalities) {
    text += `\n## Modalities\n\n`;
    if (model.modalities.input?.length) {
      text += `**Input:** ${model.modalities.input.join(", ")}\n`;
    }
    if (model.modalities.output?.length) {
      text += `**Output:** ${model.modalities.output.join(", ")}\n`;
    }
  }

  if (model.limit) {
    text += `\n## Limits\n\n`;
    if (model.limit.context) {
      text += `- **Context Window:** ${model.limit.context.toLocaleString()} tokens\n`;
    }
    if (model.limit.output) {
      text += `- **Max Output:** ${model.limit.output.toLocaleString()} tokens\n`;
    }
  }

  if (model.cost) {
    text += `\n## Pricing\n\n`;
    if (model.cost.input !== undefined) {
      text += `- **Input:** $${model.cost.input} per 1M tokens\n`;
    }
    if (model.cost.output !== undefined) {
      text += `- **Output:** $${model.cost.output} per 1M tokens\n`;
    }
    if (model.cost.cache_read !== undefined) {
      text += `- **Cache Read:** $${model.cost.cache_read} per 1M tokens\n`;
    }
    if (model.cost.cache_write !== undefined) {
      text += `- **Cache Write:** $${model.cost.cache_write} per 1M tokens\n`;
    }
  }

  if (model.knowledge) {
    text += `\n## Knowledge Cutoff\n\n${model.knowledge}\n`;
  }

  if (model.release_date || model.last_updated) {
    text += `\n## Timeline\n\n`;
    if (model.release_date) {
      text += `- **Released:** ${model.release_date}\n`;
    }
    if (model.last_updated) {
      text += `- **Last Updated:** ${model.last_updated}\n`;
    }
  }

  if (model.open_weights) {
    text += `\n**Open Weights:** Available\n`;
  }

  // Provider info
  text += `\n## Provider Information\n\n`;
  if (provider.doc) {
    text += `**Documentation:** ${provider.doc}\n`;
  }
  if (provider.npm) {
    text += `**NPM Package:** ${provider.npm}\n`;
  }
  if (provider.env && provider.env.length > 0) {
    text += `**Required Environment Variables:** ${provider.env.join(", ")}\n`;
  }

  return text;
}

/**
 * Get provider data for config generation
 * Returns raw provider data and schema so AI can construct config correctly
 */
export async function getProviderData(args: {
  provider_id: string;
}): Promise<string> {
  const data = await loadModelsDevData();
  const provider = data[args.provider_id];

  if (!provider) {
    throw new ProviderNotFoundError(args.provider_id);
  }

  // Load the schema (from cache/file or fetch if needed)
  const { loadConfigSchema } = await import("../data-loaders.js");
  const schema = await loadConfigSchema();
  const providerSchema = schema.properties?.provider?.additionalProperties;

  let result = `# Provider Data: ${provider.name}\n\n`;
  
  result += `## Available Fields (from OpenCode schema)\n\n`;
  result += `The provider configuration accepts these fields:\n`;
  result += `\`\`\`json\n${JSON.stringify(providerSchema, null, 2)}\n\`\`\`\n\n`;

  result += `## Provider Information (from models.dev)\n\n`;
  result += `\`\`\`json\n${JSON.stringify({
    id: args.provider_id,
    name: provider.name,
    npm: provider.npm,
    env: provider.env,
    doc: provider.doc,
  }, null, 2)}\n\`\`\`\n\n`;

  result += `## Available Models (${Object.keys(provider.models).length} total)\n\n`;
  const modelList = Object.entries(provider.models).map(([id, model]) => {
    return `- **${id}**: ${model.name}${model.family ? ` (${model.family})` : ""}`;
  }).join("\n");
  result += modelList + "\n\n";

  result += `## Key Schema Notes\n\n`;
  result += `- **whitelist**: Array of model IDs to ENABLE (all others disabled)\n`;
  result += `- **blacklist**: Array of model IDs to DISABLE (all others enabled)\n`;
  result += `- **models**: Object for model-specific overrides (cost, limits, etc.)\n`;
  result += `- Models inherit properties from models.dev unless overridden\n\n`;

  result += `## Setup Instructions\n\n`;
  if (provider.npm) {
    result += `1. Install: \`npm install ${provider.npm}\`\n`;
  }
  if (provider.env && provider.env.length > 0) {
    result += `2. Set environment variables: ${provider.env.join(", ")}\n`;
  }
  if (provider.doc) {
    result += `3. Documentation: ${provider.doc}\n`;
  }

  result += `\n**Use this information to construct a valid provider configuration according to the schema.**\n`;

  return result;
}
