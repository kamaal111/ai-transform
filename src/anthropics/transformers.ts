import { err, ok, type Result } from 'neverthrow';
import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages';

import type { AITransformError } from '../errors';
import {
  MODELS_VALUES_SET,
  type AnthropicsModels,
  type PROVIDER_NAME,
} from './constants';
import { buildTransformUserPrompt, SYSTEM_TRANSFORM_PROMPT } from '../prompts';
import { AnthropicsAITransformError } from './errors';
import { BaseAITransformer } from '../base-transformer';
import { tryCatchAsync } from '../utils/result';
import type { BaseConfig } from '../types';

export interface AnthropicsTransformerConfig extends BaseConfig {
  provider: typeof PROVIDER_NAME;
  model: AnthropicsModels;
  maxTokens: number;
}

class AnthropicsTransformer extends BaseAITransformer<
  Anthropic,
  AnthropicsTransformerConfig,
  AnthropicsAITransformError
> {
  protected async createClient(
    config: AnthropicsTransformerConfig,
  ): Promise<Result<Anthropic, AnthropicsAITransformError>> {
    const anthropic = new Anthropic({ apiKey: config.apiKey });

    return ok(anthropic);
  }

  protected async requestTransformation(
    source: string,
    prompt: string,
    client: Anthropic,
    config: AnthropicsTransformerConfig,
  ): Promise<Result<string, AnthropicsAITransformError>> {
    const contentResponseResult = await tryCatchAsync(() => {
      return client.messages.create({
        model: config.model,
        system: SYSTEM_TRANSFORM_PROMPT,
        messages: [
          { content: buildTransformUserPrompt(source, prompt), role: 'user' },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      });
    }).mapErr(e => {
      return new AnthropicsAITransformError('Failed to get completion', {
        cause: e,
      });
    });
    if (contentResponseResult.isErr()) return err(contentResponseResult.error);

    const textBlock = contentResponseResult.value.content[0] as
      | TextBlock
      | undefined;

    return this.parseAndValidateResponse(
      textBlock?.text,
      source,
      (message, options) =>
        new AnthropicsAITransformError(message, { cause: options?.cause }),
    );
  }
}

const anthropicsTransformer = new AnthropicsTransformer(MODELS_VALUES_SET);

export async function transformFromSource(
  source: string,
  prompt: string,
  config: AnthropicsTransformerConfig,
): Promise<Result<string, AITransformError>> {
  return anthropicsTransformer.transformFromSource(source, prompt, config);
}
