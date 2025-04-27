import { ok, type Result } from 'neverthrow';

import {
  GOOGLE_PROVIDER_NAME,
  type GoogleTransformerConfig,
  transformFromSourceWithGoogle,
} from './google';
import {
  transformFromSourceWithOpenAI,
  type OpenAITransformerConfig,
  OPEN_AI_PROVIDER_NAME,
} from './openai';
import type { AITransformError } from './errors';
import type { Models, Providers } from './types';
import { isSupportedModel, modelToProvider } from './utils/llm';
import { DEFAULT_CONFIG } from './constants';
import {
  ANTHROPICS_PROVIDER_NAME,
  type AnthropicsTransformerConfig,
  transformFromSourceWithAnthropics,
} from './anthropics';

type ConfigMap = {
  google: GoogleTransformerConfig;
  openai: OpenAITransformerConfig;
  anthropics: AnthropicsTransformerConfig;
};

/**
 * Configuration interface for the transformFromSource function.
 * Defines the language model provider and related settings.
 */
export interface TransformFromSourceConfig<
  Provider extends Providers | undefined,
> {
  llm: Omit<
    OpenAITransformerConfig | GoogleTransformerConfig,
    'provider' | 'model'
  > & {
    provider?: Provider;
    model: Provider extends Providers ? ConfigMap[Provider]['model'] : Models;
  };
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
export async function transformFromSource<Provider extends Providers>(
  source: string,
  prompt: string,
  config: TransformFromSourceConfig<Provider>,
): Promise<string> {
  const result = await getTransformResult(source, prompt, config);
  if (result.isErr()) throw result.error;

  return result.value;
}

function getTransformResult<Provider extends Providers>(
  source: string,
  prompt: string,
  config: TransformFromSourceConfig<Provider>,
): Promise<Result<string, AITransformError>> {
  const { model } = config.llm;
  if (!isSupportedModel(model)) return Promise.resolve(ok(source));

  const provider = config.llm.provider ?? modelToProvider(model);
  switch (provider) {
    case GOOGLE_PROVIDER_NAME:
      return transformFromSourceWithGoogle(source, prompt, {
        ...DEFAULT_CONFIG,
        ...config.llm,
        provider,
      } as GoogleTransformerConfig);
    case OPEN_AI_PROVIDER_NAME:
      return transformFromSourceWithOpenAI(source, prompt, {
        ...DEFAULT_CONFIG,
        ...config.llm,
        provider,
      } as OpenAITransformerConfig);
    case ANTHROPICS_PROVIDER_NAME:
      return transformFromSourceWithAnthropics(source, prompt, {
        ...DEFAULT_CONFIG,
        ...config.llm,
        provider,
      } as AnthropicsTransformerConfig);
    default:
      return Promise.resolve(ok(source));
  }
}

export default { transformFromSource };
