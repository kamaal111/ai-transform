import { AITransformError } from './errors';
import {
  transformFromSourceWithOpenAI,
  type OpenAIConfig,
  OPEN_AI_PROVIDER_NAME,
} from './openai';

export interface TransformFromSourceConfig {
  llm: OpenAIConfig;
}

const TRANSFORMERS = {
  [OPEN_AI_PROVIDER_NAME]: transformFromSourceWithOpenAI,
} as const;

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
  const transformer = TRANSFORMERS[config.llm.provider];
  if (transformer == null) return source;

  const result = await transformer(source, prompt, config.llm);
  if (result.isErr()) throw result.error;

  return result.value;
}

export { AITransformError };

export default { transformFromSource, AITransformError };
