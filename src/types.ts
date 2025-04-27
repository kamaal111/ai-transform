import type { GOOGLE_MODELS_VALUES, GOOGLE_PROVIDER_NAME } from './google';
import type { OPEN_AI_MODELS_VALUES, OPEN_AI_PROVIDER_NAME } from './openai';

export type GetValues<T extends object> = T[keyof T];

export type Providers =
  | typeof GOOGLE_PROVIDER_NAME
  | typeof OPEN_AI_PROVIDER_NAME;

export type Models =
  | (typeof GOOGLE_MODELS_VALUES)[number]
  | (typeof OPEN_AI_MODELS_VALUES)[number];
