/**
 * Type definitions for models.dev API
 */

export interface ModelsDevProvider {
  id: string;
  name: string;
  env?: string[];
  doc?: string;
  npm?: string;
  models: Record<string, ModelsDevModel>;
}

export interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  open_weights?: boolean;
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    output?: number;
  };
}

export interface ModelsDevAPI {
  [providerId: string]: ModelsDevProvider;
}
