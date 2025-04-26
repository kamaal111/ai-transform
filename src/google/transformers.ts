import { ok, type Result } from 'neverthrow';
import { GoogleGenAI } from '@google/genai';

import type { AITransformError } from '../errors';
import type { Models, PROVIDER_NAME } from './constants';
import { buildTransformUserPrompt, SYSTEM_TRANSFORM_PROMPT } from '../prompts';
import { TransformResponseSchema } from '../schemas';

export interface Config {
  provider: typeof PROVIDER_NAME;
  model: Models;
  apiKey: string;
}

export async function transformFromSource(
  source: string,
  prompt: string,
  config: Config,
): Promise<Result<string, AITransformError>> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const chat = ai.chats.create({ history: [], model: config.model });
  const message = await chat.sendMessage({
    message: [{ text: buildTransformUserPrompt(source, prompt) }],
    config: { systemInstruction: SYSTEM_TRANSFORM_PROMPT, temperature: 0 },
  });
  const { text } = message;
  if (text == null) return ok(source);

  const markdownlessText = stripMarkdownScriptTags(text);
  const response = await TransformResponseSchema.parseAsync(
    JSON.parse(markdownlessText),
  );

  return ok(response.code);
}

function stripMarkdownScriptTags(str: string) {
  return str.split('\n').slice(1, -1).join('\n');
}
