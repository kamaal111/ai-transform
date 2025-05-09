import type { GetValues } from '../types';

export const PROVIDER_NAME = 'google';

export type GoogleModels = GetValues<typeof MODELS>;

export const MODELS = {
  GEMINI_2_0_FLASH: 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_LITE: 'gemini-2.0-flash-lite',
} as const;

export const MODELS_VALUES = Object.values(MODELS);

export const MODELS_VALUES_SET = new Set(MODELS_VALUES);
