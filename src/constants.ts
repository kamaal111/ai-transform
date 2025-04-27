import type { BaseConfig } from './types';

export const DEFAULT_MAX_TOKENS = 1024;

export const DEFAULT_TEMPERATURE = 0;

export const DEFAULT_CONFIG: BaseConfig = {
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
};
