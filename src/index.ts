import {
  transformFromSourceWithOpenAI,
  type OpenAIConfig,
  OPEN_AI_PROVIDER_NAME,
} from './openai';

export interface TransformFromSourceConfig {
  model: OpenAIConfig;
}

const TRANSFORMERS = {
  [OPEN_AI_PROVIDER_NAME]: transformFromSourceWithOpenAI,
} as const;

export async function transformFromSource(
  source: string,
  prompt: string,
  config: TransformFromSourceConfig,
): Promise<string> {
  const transformer = TRANSFORMERS[config.model.provider];
  if (transformer == null) return source;

  const result = await transformer(source, prompt, config.model);
  if (result.isErr()) throw result.error;

  return result.value;
}

export default { transformFromSource };
