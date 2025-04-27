import {
  ANTHROPICS_MODELS_VALUES_SET,
  ANTHROPICS_PROVIDER_NAME,
} from '../anthropics';
import { GOOGLE_MODELS_VALUES_SET, GOOGLE_PROVIDER_NAME } from '../google';
import { OPEN_AI_MODELS_VALUES_SET, OPEN_AI_PROVIDER_NAME } from '../openai';
import type { Models, Providers } from '../types';

export function isSupportedModel(model: string): model is Models {
  if ((GOOGLE_MODELS_VALUES_SET as Set<string>).has(model)) {
    return true;
  }

  if ((OPEN_AI_MODELS_VALUES_SET as Set<string>).has(model)) {
    return true;
  }

  if ((ANTHROPICS_MODELS_VALUES_SET as Set<string>).has(model)) {
    return true;
  }

  return false;
}

export function modelToProvider(model: string): Providers | null {
  if ((GOOGLE_MODELS_VALUES_SET as Set<string>).has(model)) {
    return GOOGLE_PROVIDER_NAME;
  }

  if ((OPEN_AI_MODELS_VALUES_SET as Set<string>).has(model)) {
    return OPEN_AI_PROVIDER_NAME;
  }

  if ((ANTHROPICS_MODELS_VALUES_SET as Set<string>).has(model)) {
    return ANTHROPICS_PROVIDER_NAME;
  }

  return null;
}
