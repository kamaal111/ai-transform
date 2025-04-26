import OpenAI from 'openai';
import { err, ok, type Result } from 'neverthrow';
import z from 'zod';

import { OpenAITransformError } from './errors';
import {
  OPEN_AI_MODELS_VALUES,
  type OPEN_AI_PROVIDER_NAME,
  type OpenAIModels,
} from './constants';
import { AITransformError } from '../errors';
import { tryCatch, tryCatchAsync } from '../utils';
import { buildTransformUserPrompt, SYSTEM_TRANSFORM_PROMPT } from '../prompts';

export interface Config {
  provider: typeof OPEN_AI_PROVIDER_NAME;
  model: OpenAIModels;
  apiKey?: string;
}

const TransformResponse = z.object({ code: z.string() });

export async function transformFromSource(
  source: string,
  prompt: string,
  config: Config,
): Promise<Result<string, AITransformError>> {
  if (!OPEN_AI_MODELS_VALUES.includes(config.model)) {
    return err(new OpenAITransformError('Invalid model provided'));
  }

  const clientResult = tryCatch(
    () => new OpenAI({ apiKey: config.apiKey }),
  ).mapErr(
    e => new OpenAITransformError('Failed to load client', { cause: e }),
  );
  if (clientResult.isErr()) {
    return err(clientResult.error);
  }

  const completionResult = await tryCatchAsync(() => {
    return clientResult.value.chat.completions.create({
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
  if (completionResult.isErr()) {
    return err(completionResult.error);
  }

  const content = completionResult.value.choices[0]?.message.content;
  if (content == null) {
    return ok(source);
  }

  const contentObjectResult = tryCatch(() => JSON.parse(content)).mapErr(e => {
    return new OpenAITransformError('Failed to parse AI transformation', {
      cause: e,
    });
  });
  if (contentObjectResult.isErr()) {
    return err(contentObjectResult.error);
  }

  const parsedContentObjectResult = await tryCatchAsync(() => {
    return TransformResponse.parseAsync(contentObjectResult.value);
  }).mapErr(e => {
    return new OpenAITransformError('Failed to parse AI transformation', {
      cause: e,
    });
  });
  if (parsedContentObjectResult.isErr()) {
    return err(parsedContentObjectResult.error);
  }

  return ok(parsedContentObjectResult.value.code);
}
