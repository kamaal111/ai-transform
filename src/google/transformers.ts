import { err, ok, type Result } from 'neverthrow';
import { GoogleGenAI } from '@google/genai';
import z from 'zod';

import type { AITransformError } from '../errors';
import { MODELS_VALUES, type Models, type PROVIDER_NAME } from './constants';
import { buildTransformUserPrompt, SYSTEM_TRANSFORM_PROMPT } from '../prompts';
import { TransformResponseSchema } from '../schemas';
import { tryCatch, tryCatchAsync } from '../utils';
import { GoogleAITransformError } from './errors';

export interface Config {
  provider: typeof PROVIDER_NAME;
  model: Models;
  apiKey: string;
}

const EnvSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().optional().nullable(),
});

export async function transformFromSource(
  source: string,
  prompt: string,
  config: Config,
): Promise<Result<string, AITransformError>> {
  const preChecksResult = preChecks(config);
  if (preChecksResult.isErr()) return err(preChecksResult.error);

  const ai = await createClient(config);

  return requestTransformation(source, prompt, ai, config);
}

async function requestTransformation(
  source: string,
  prompt: string,
  client: GoogleGenAI,
  config: Config,
): Promise<Result<string, AITransformError>> {
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
  if (!text) return ok(source);

  const markdownlessText = stripMarkdownJSONScriptTags(text);
  if (!markdownlessText) return ok(source);

  const parsedContentResult = tryCatch(() =>
    JSON.parse(markdownlessText),
  ).mapErr(e => {
    return new GoogleAITransformError('Failed to parse AI transformation', {
      cause: e,
    });
  });
  if (parsedContentResult.isErr()) return err(parsedContentResult.error);

  const validatedResponseResult = await tryCatchAsync(() =>
    TransformResponseSchema.parseAsync(parsedContentResult.value),
  ).mapErr(e => {
    return new GoogleAITransformError('Failed to parse AI transformation', {
      cause: e,
    });
  });
  if (validatedResponseResult.isErr()) {
    return err(validatedResponseResult.error);
  }

  return ok(validatedResponseResult.value.code ?? source);
}

async function createClient(config: Config): Promise<GoogleGenAI> {
  const env = await tryCatchAsync(() => {
    return EnvSchema.parseAsync(process.env);
  }).unwrapOr({ GOOGLE_AI_API_KEY: null });
  const ai = new GoogleGenAI({
    apiKey: config.apiKey ?? env.GOOGLE_AI_API_KEY,
  });

  return ai;
}

function preChecks(config: Config): Result<void, AITransformError> {
  if (!MODELS_VALUES.includes(config.model)) {
    return err(new GoogleAITransformError('Invalid model provided'));
  }

  return ok();
}

function stripMarkdownJSONScriptTags(str: string): string | null {
  const match = str.match(/^```json\s*([\s\S]*?)\s*```$/);
  if (match == null) return null;

  return match[1];
}
