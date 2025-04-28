import { expect, test, vi, afterEach } from 'vitest';

import {
  buildTransformUserPrompt,
  SYSTEM_TRANSFORM_PROMPT,
} from '../src/prompts';
import { tryCatchAsync } from '../src/utils/result';
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '../src/constants';
import { TEST_FAKE_API_KEY, TEST_PROMPT, TEST_SOURCE } from './samples';
import { verifyError } from './utils';

const TEST_LLM_CONFIG = {
  provider: 'anthropics',
  model: 'claude-3-7-sonnet-latest',
  apiKey: TEST_FAKE_API_KEY,
  maxTokens: DEFAULT_MAX_TOKENS,
} as const;
const TEST_CREATE_RESPONSE = {
  content: [
    {
      text: '{"code": "// Calculate the sum of all even numbers in an array\\nfunction sumEvens(arr) {\\n  return arr\\n    .filter(num => num % 2 === 0)\\n    .reduce((total, num) => total + num, 0);\\n}"}',
    },
  ],
};

async function setupAnthropicsMock(config: {
  createResponse?: object;
  createError?: Error;
  clientError?: Error;
}) {
  if (config.createResponse != null && config.createError != null) {
    throw new Error(
      "Anthropics mock can't return both a success and a failure, choose 1",
    );
  }

  if (
    config.clientError != null &&
    (config.createResponse != null || config.createError != null)
  ) {
    throw new Error(
      'Anthropics mock will error on instantiation, so no need for a create response',
    );
  }

  const mockMessagesCreate = config.createError
    ? vi.fn().mockRejectedValue(config.createError)
    : vi.fn().mockResolvedValue(config.createResponse);
  const mockAnthropicInstance = {
    messages: { create: mockMessagesCreate },
  };
  const mockAnthropic = config.clientError
    ? vi.fn().mockImplementation(() => {
        throw config.clientError;
      })
    : vi.fn().mockImplementation(() => mockAnthropicInstance);
  vi.doMock('@anthropic-ai/sdk', () => ({ default: mockAnthropic }));

  const { transformFromSource } = await import('../src');

  return { transformFromSource, mockAnthropic, mockMessagesCreate };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

test('transforms code successfully', async () => {
  const { transformFromSource } = await setupAnthropicsMock({
    createResponse: TEST_CREATE_RESPONSE,
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toContain('filter');
  expect(result).toContain('reduce');
  expect(result).not.toContain('for (let i = 0');
});

test('verifies Anthropics client was called with correct parameters', async () => {
  const { transformFromSource, mockAnthropic, mockMessagesCreate } =
    await setupAnthropicsMock({ createResponse: TEST_CREATE_RESPONSE });
  const config = TEST_LLM_CONFIG;

  await transformFromSource(TEST_SOURCE, TEST_PROMPT, { llm: config });

  expect(mockAnthropic).toHaveBeenCalledWith({ apiKey: TEST_FAKE_API_KEY });
  expect(mockMessagesCreate).toHaveBeenCalledWith({
    model: config.model,
    system: SYSTEM_TRANSFORM_PROMPT,
    messages: [
      {
        content: buildTransformUserPrompt(TEST_SOURCE, TEST_PROMPT),
        role: 'user',
      },
    ],
    temperature: DEFAULT_TEMPERATURE,
    max_tokens: config.maxTokens,
  });
});

test('throws error if messages create fails', async () => {
  const createError = new Error('API call failed');
  const { transformFromSource } = await setupAnthropicsMock({
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

test('returns original source if messages response has no text content', async () => {
  const { transformFromSource } = await setupAnthropicsMock({
    createResponse: { content: [] },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});

test('returns original source if messages response content is not a text block', async () => {
  const { transformFromSource } = await setupAnthropicsMock({
    createResponse: { content: [{ type: 'not-text' }] },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});

test('throws error if messages response content is invalid markdown JSON', async () => {
  const { transformFromSource } = await setupAnthropicsMock({
    createResponse: { content: [{ type: 'text', text: 'not markdown json' }] },
  });

  const result = await tryCatchAsync(() => {
    return transformFromSource(TEST_SOURCE, TEST_PROMPT, {
      llm: TEST_LLM_CONFIG,
    });
  });

  verifyError(
    result,
    expect.anything(),
    "Failed to parse AI transformation; cause='SyntaxError: Unexpected token 'o', \"not markdown json\" is not valid JSON'",
  );
});

test('that if messages response JSON lacks "code" property, then return original source', async () => {
  const { transformFromSource } = await setupAnthropicsMock({
    createResponse: {
      content: [
        {
          type: 'text',
          text: '{"notCode": "abc"}',
        },
      ],
    },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});
