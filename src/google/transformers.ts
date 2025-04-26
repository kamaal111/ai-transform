import { ok, type Result } from 'neverthrow';

import type { AITransformError } from '../errors';
import type { PROVIDER_NAME } from './constants';

export interface Config {
  provider: typeof PROVIDER_NAME;
  model: 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';
  apiKey: string;
}

export async function transformFromSource(
  source: string,
  prompt: string,
  config: Config,
): Promise<Result<string, AITransformError>> {
  console.log('prompt', prompt);
  console.log('config', config);
  return ok(source);
}
