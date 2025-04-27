import OpenAI from 'openai';
import { err, ok, type Result } from 'neverthrow';

import { OpenAITransformError } from './errors';
import {
  MODELS_VALUES,
  type PROVIDER_NAME,
  type OpenAIModels,
} from './constants';
import type { AITransformError } from '../errors';
import { buildTransformUserPrompt, SYSTEM_TRANSFORM_PROMPT } from '../prompts';
import { BaseAITransformer } from '../base-transformer';
import { tryCatch, tryCatchAsync } from '../utils/result';

export interface OpenAITransformerConfig {
  provider: typeof PROVIDER_NAME;
  model: OpenAIModels;
  apiKey?: string;
}

class OpenAITransformer extends BaseAITransformer<
  OpenAI,
  OpenAITransformerConfig,
  OpenAITransformError
> {
  protected preChecks(
    config: OpenAITransformerConfig,
  ): Result<void, OpenAITransformError> {
    if (!MODELS_VALUES.includes(config.model)) {
      return err(new OpenAITransformError('Invalid model provided'));
    }

    return ok();
  }

  protected async createClient(
    config: OpenAITransformerConfig,
  ): Promise<Result<OpenAI, OpenAITransformError>> {
    const clientResult = tryCatch(
      () => new OpenAI({ apiKey: config.apiKey }),
    ).mapErr(
      e => new OpenAITransformError('Failed to load client', { cause: e }),
    );

    return clientResult;
  }

  protected async requestTransformation(
    source: string,
    prompt: string,
    client: OpenAI,
    config: OpenAITransformerConfig,
  ): Promise<Result<string, OpenAITransformError>> {
    const completionResult = await tryCatchAsync(() => {
      return client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_TRANSFORM_PROMPT },
          {
            role: 'user',
            content: buildTransformUserPrompt(source, prompt),
          },
        ],
        temperature: 0,
      });
    }).mapErr(
      e => new OpenAITransformError('Failed to get completion', { cause: e }),
    );
    if (completionResult.isErr()) return err(completionResult.error);

    const content = completionResult.value.choices[0]?.message.content;

    return this.parseAndValidateResponse(
      content,
      source,
      (message, options) => {
        return new OpenAITransformError(message, { cause: options?.cause });
      },
    );
  }
}

const openaiTransformer = new OpenAITransformer();

export async function transformFromSource(
  source: string,
  prompt: string,
  config: OpenAITransformerConfig,
): Promise<Result<string, AITransformError>> {
  return openaiTransformer.transformFromSource(source, prompt, config);
}
