import OpenAI from 'openai';
import { err, ok, type Result } from 'neverthrow';

import { OpenAITransformError } from './errors';
import { MODELS_VALUES, type PROVIDER_NAME, type Models } from './constants';
import type { AITransformError } from '../errors';
import { tryCatch, tryCatchAsync } from '../utils';
import { buildTransformUserPrompt, SYSTEM_TRANSFORM_PROMPT } from '../prompts';
import { TransformResponseSchema } from '../schemas';

export interface Config {
  provider: typeof PROVIDER_NAME;
  model: Models;
  apiKey?: string;
}

export async function transformFromSource(
  source: string,
  prompt: string,
  config: Config,
): Promise<Result<string, AITransformError>> {
  const preChecksResult = preChecks(config);
  if (preChecksResult.isErr()) {
    return err(preChecksResult.error);
  }

  const clientResult = createClient(config);
  if (clientResult.isErr()) {
    return err(clientResult.error);
  }

  return requestTransformation(source, prompt, clientResult.value, config);
}

async function requestTransformation(
  source: string,
  prompt: string,
  client: OpenAI,
  config: Config,
): Promise<Result<string, AITransformError>> {
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
    return TransformResponseSchema.parseAsync(contentObjectResult.value);
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

function createClient(config: Config): Result<OpenAI, AITransformError> {
  const clientResult = tryCatch(
    () => new OpenAI({ apiKey: config.apiKey }),
  ).mapErr(
    e => new OpenAITransformError('Failed to load client', { cause: e }),
  );

  return clientResult;
}

function preChecks(config: Config): Result<void, AITransformError> {
  if (!MODELS_VALUES.includes(config.model)) {
    return err(new OpenAITransformError('Invalid model provided'));
  }

  return ok();
}
