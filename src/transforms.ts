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
import type { Models, Providers } from './types';
import { isSupportedModel, modelToProvider } from './utils/llm';

type ConfigMap = {
  google: GoogleConfig;
  openai: OpenAIConfig;
};

/**
 * Configuration interface for the transformFromSource function.
 * Defines the language model provider and related settings.
 */
export interface TransformFromSourceConfig<
  Provider extends Providers | undefined,
> {
  llm: Omit<OpenAIConfig | GoogleConfig, 'provider' | 'model'> & {
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
        ...config.llm,
        provider,
      } as GoogleConfig);
    case OPEN_AI_PROVIDER_NAME:
      return transformFromSourceWithOpenAI(source, prompt, {
        ...config.llm,
        provider,
      } as OpenAIConfig);
    default:
      return Promise.resolve(ok(source));
  }
}

export default { transformFromSource };
