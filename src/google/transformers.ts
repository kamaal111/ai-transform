import { err, ok, type Result } from 'neverthrow';
import { GoogleGenAI } from '@google/genai';
import z from 'zod';

import type { AITransformError } from '../errors';
import {
  MODELS_VALUES,
  type GoogleModels,
  type PROVIDER_NAME,
} from './constants';
import { buildTransformUserPrompt, SYSTEM_TRANSFORM_PROMPT } from '../prompts';
import { GoogleAITransformError } from './errors';
import { BaseAITransformer } from '../base-transformer';
import { tryCatchAsync } from '../utils/result';

export interface GoogleTransformerConfig {
  provider: typeof PROVIDER_NAME;
  model: GoogleModels;
  apiKey?: string;
}

const EnvSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().optional().nullable(),
});

class GoogleTransformer extends BaseAITransformer<
  GoogleGenAI,
  GoogleTransformerConfig,
  GoogleAITransformError
> {
  protected processResponseText(text: string): string | null {
    const match = text.match(/^```json\s*([\s\S]*?)\s*```$/);
    return match ? match[1] : null;
  }

  protected preChecks(
    config: GoogleTransformerConfig,
  ): Result<void, GoogleAITransformError> {
    if (!MODELS_VALUES.includes(config.model)) {
      return err(new GoogleAITransformError('Invalid model provided'));
    }

    return ok();
  }

  protected async createClient(
    config: GoogleTransformerConfig,
  ): Promise<Result<GoogleGenAI, GoogleAITransformError>> {
    const env = await tryCatchAsync(() => {
      return EnvSchema.parseAsync(process.env);
    }).unwrapOr({ GOOGLE_AI_API_KEY: null });
    const ai = new GoogleGenAI({
      apiKey: config.apiKey ?? env.GOOGLE_AI_API_KEY ?? undefined,
    });

    return ok(ai);
  }

  protected async requestTransformation(
    source: string,
    prompt: string,
    client: GoogleGenAI,
    config: GoogleTransformerConfig,
  ): Promise<Result<string, GoogleAITransformError>> {
    const contentResponseResult = await tryCatchAsync(() => {
      return client.models.generateContent({
        model: config.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: buildTransformUserPrompt(source, prompt) }],
          },
        ],
        config: { systemInstruction: SYSTEM_TRANSFORM_PROMPT, temperature: 0 },
      });
    }).mapErr(
      e => new GoogleAITransformError('Failed to get completion', { cause: e }),
    );
    if (contentResponseResult.isErr()) return err(contentResponseResult.error);

    const { text } = contentResponseResult.value;

    return this.parseAndValidateResponse(
      text,
      source,
      (message, options) =>
        new GoogleAITransformError(message, { cause: options?.cause }),
    );
  }
}

const googleTransformer = new GoogleTransformer();

export async function transformFromSource(
  source: string,
  prompt: string,
  config: GoogleTransformerConfig,
): Promise<Result<string, AITransformError>> {
  return googleTransformer.transformFromSource(source, prompt, config);
}
