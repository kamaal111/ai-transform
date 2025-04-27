import type { ANTHROPICS_PROVIDER_NAME, AnthropicsModels } from './anthropics';
import type { GOOGLE_PROVIDER_NAME, GoogleModels } from './google';
import type { OPEN_AI_PROVIDER_NAME, OpenAIModels } from './openai';

export type GetValues<T extends object> = T[keyof T];

/**
 * Supported AI provider names.
 * Includes Google, OpenAI, and Anthropics providers.
 */
export type Providers =
  | typeof GOOGLE_PROVIDER_NAME
  | typeof OPEN_AI_PROVIDER_NAME
  | typeof ANTHROPICS_PROVIDER_NAME;

/**
 * Union type of all supported AI models across providers.
 * Includes models from Google, OpenAI, and Anthropics.
 */
export type Models = GoogleModels | OpenAIModels | AnthropicsModels;

export interface BaseConfig {
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}
