import type { GetValues } from '../types';

export type OpenAIModels = GetValues<typeof OPEN_AI_MODELS>;

export const OPEN_AI_PROVIDER_NAME = 'openai';

export const OPEN_AI_MODELS = {
  GPT_4_1: 'gpt-4.1',
  GPT_4_1_MINI: 'gpt-4.1-mini',
  GPT_4_1_NANO: 'gpt-4.1-nano',
  GPT_4_O: 'gpt-4o',
  GPT_4_O_MINI: 'gpt-4o-mini',
} as const;

export const OPEN_AI_MODELS_VALUES = Object.values(OPEN_AI_MODELS);
