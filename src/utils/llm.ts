import { GOOGLE_MODELS_VALUES, GOOGLE_PROVIDER_NAME } from '../google';
import { OPEN_AI_MODELS_VALUES, OPEN_AI_PROVIDER_NAME } from '../openai';
import type { Models, Providers } from '../types';

const GOOGLE_MODELS_VALUES_SET = new Set(GOOGLE_MODELS_VALUES);
const OPEN_AI_MODELS_VALUES_SET = new Set(OPEN_AI_MODELS_VALUES);

export function isSupportedModel(model: string): model is Models {
  if ((GOOGLE_MODELS_VALUES_SET as Set<string>).has(model)) {
    return true;
  }

  if ((OPEN_AI_MODELS_VALUES_SET as Set<string>).has(model)) {
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

  return null;
}
