import type { GetValues } from '../types';

export const PROVIDER_NAME = 'anthropics';

export type AnthropicsModels = GetValues<typeof MODELS>;

export const MODELS = {
  CLAUDE_3_7_SONNET: 'claude-3-7-sonnet-latest',
  CLAUDE_3_5_HAIKU: 'claude-3-5-haiku-latest',
} as const;

export const MODELS_VALUES = Object.values(MODELS);

export const MODELS_VALUES_SET = new Set(MODELS_VALUES);
