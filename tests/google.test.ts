import { expect, test, vi, afterEach } from 'vitest';
import type { Result } from 'neverthrow';

import {
  buildTransformUserPrompt,
  SYSTEM_TRANSFORM_PROMPT,
} from '../src/prompts';
import { tryCatchAsync } from '../src/utils/result';

const TEST_SOURCE = `
// Calculate the sum of all even numbers in an array
function sumEvens(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
      total += arr[i];
    }
  }
  return total;
}
`;
const TEST_PROMPT = 'Refactor this to use array methods (filter + reduce)';
const TEST_FAKE_API_KEY = 'fake-api-key';
const TEST_LLM_CONFIG = {
  provider: 'google',
  model: 'gemini-2.0-flash',
  apiKey: TEST_FAKE_API_KEY,
} as const;
const TEST_CREATE_RESPONSE = {
  text: '```json\n{"code": "// Calculate the sum of all even numbers in an array\\nfunction sumEvens(arr) {\\n  return arr\\n    .filter(num => num % 2 === 0)\\n    .reduce((total, num) => total + num, 0);\\n}"}\n```',
};

async function setupGoogleMock(config: {
  createResponse?: object;
  createError?: Error;
}) {
  if (config.createResponse != null && config.createError != null) {
    throw new Error(
      "Google mock can't return both a success and a failure, choose 1",
    );
  }

  const mockGenerateContent = config.createError
    ? vi.fn().mockRejectedValue(config.createError)
    : vi.fn().mockResolvedValue(config.createResponse);
  const mockModels = { generateContent: mockGenerateContent };
  const mockGoogleGenAI = vi
    .fn()
    .mockImplementation(() => ({ models: mockModels }));

  vi.doMock('@google/genai', () => ({ GoogleGenAI: mockGoogleGenAI }));

  const { transformFromSource } = await import('../src');

  return { transformFromSource, mockGoogleGenAI, mockGenerateContent };
}

function verifyError(
  result: Result<unknown, unknown>,
  cause: Error | undefined,
  message: string,
) {
  expect(result.isErr()).toBe(true);
  if (!result.isErr()) throw Error('Already checked if is error');

  expect(result.error).toBeInstanceOf(Error);

  const error = result.error as Error;
  expect(error.message).toEqual(message);
  expect(error.cause).toEqual(cause);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

test('transforms code successfully', async () => {
  const { transformFromSource } = await setupGoogleMock({
    createResponse: TEST_CREATE_RESPONSE,
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toContain('filter');
  expect(result).toContain('reduce');
  expect(result).not.toContain('for (let i = 0');
});

test('verifies Google client was called with correct parameters', async () => {
  const { transformFromSource, mockGoogleGenAI, mockGenerateContent } =
    await setupGoogleMock({ createResponse: TEST_CREATE_RESPONSE });
  const config = TEST_LLM_CONFIG;

  await transformFromSource(TEST_SOURCE, TEST_PROMPT, { llm: config });

  expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: TEST_FAKE_API_KEY });
  expect(mockGenerateContent).toHaveBeenCalledWith({
    model: config.model,
    contents: [
      {
        role: 'user',
        parts: [{ text: buildTransformUserPrompt(TEST_SOURCE, TEST_PROMPT) }],
      },
    ],
    config: { systemInstruction: SYSTEM_TRANSFORM_PROMPT, temperature: 0 },
  });
});

test('throws error if generateContent fails', async () => {
  const createError = new Error('API call failed');
  const { transformFromSource } = await setupGoogleMock({
    createError: createError,
  });

  const result = await tryCatchAsync(() => {
    return transformFromSource(TEST_SOURCE, TEST_PROMPT, {
      llm: TEST_LLM_CONFIG,
    });
  });

  verifyError(
    result,
    createError,
    "Failed to get completion; cause='Error: API call failed'",
  );
});

test('returns original source if generateContent response has no text', async () => {
  const { transformFromSource } = await setupGoogleMock({
    createResponse: { text: '' },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});

test('returns original source if generateContent response is not valid markdown JSON', async () => {
  const { transformFromSource } = await setupGoogleMock({
    createResponse: { text: 'not markdown json' },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});

test('throws error if generateContent response content is invalid JSON', async () => {
  const { transformFromSource } = await setupGoogleMock({
    createResponse: { text: '```json\ninvalid json\n```' },
  });

  const result = await tryCatchAsync(() => {
    return transformFromSource(TEST_SOURCE, TEST_PROMPT, {
      llm: TEST_LLM_CONFIG,
    });
  });

  verifyError(
    result,
    expect.anything(),
    "Failed to parse AI transformation; cause='SyntaxError: Unexpected token 'i', \"invalid json\" is not valid JSON'",
  );
});

test('that if generateContent response JSON lacks "code" property, then return original source', async () => {
  const { transformFromSource } = await setupGoogleMock({
    createResponse: { text: '```json\n{"notCode": "abc"}\n```' },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});
