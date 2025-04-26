import { ok, type Result } from 'neverthrow';

import {
  GOOGLE_PROVIDER_NAME,
  type GoogleConfig,
  transformFromSourceWithGoogle,
} from './google';
import {
  transformFromSourceWithOpenAI,
  type OpenAIConfig,
  OPEN_AI_PROVIDER_NAME,
} from './openai';
import type { AITransformError } from './errors';

/**
 * Configuration interface for the transformFromSource function.
 * Defines the language model provider and related settings.
 */
export interface TransformFromSourceConfig {
  llm: OpenAIConfig | GoogleConfig;
}

/**
 * Transforms source code or text based on the provided prompt using the configured LLM.
 *
 * @param source - The original source code or text to transform
 * @param prompt - Instructions for how to transform the source
 * @param config - Configuration object containing LLM provider settings
 * @returns A Promise that resolves to the transformed source code or text
 * @throws {AITransformError} When the transformation fails due to API errors or issues with the LLM response
 */
export async function transformFromSource(
  source: string,
  prompt: string,
  config: TransformFromSourceConfig,
): Promise<string> {
  const result = await getTransformResult(source, prompt, config);
  if (result.isErr()) throw result.error;

  return result.value;
}

function getTransformResult(
  source: string,
  prompt: string,
  config: TransformFromSourceConfig,
): Promise<Result<string, AITransformError>> {
  switch (config.llm.provider) {
    case OPEN_AI_PROVIDER_NAME:
      return transformFromSourceWithOpenAI(source, prompt, config.llm);
    case GOOGLE_PROVIDER_NAME:
      return transformFromSourceWithGoogle(source, prompt, config.llm);
    default:
      return Promise.resolve(ok(source));
  }
}

export default { transformFromSource };
