import { expect, test, vi, afterEach } from 'vitest';
import type { Result } from 'neverthrow';

import { tryCatchAsync } from '../src/utils';
import {
  buildTransformUserPrompt,
  SYSTEM_TRANSFORM_PROMPT,
} from '../src/prompts';

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
  provider: 'openai',
  model: 'gpt-4.1-nano',
  apiKey: TEST_FAKE_API_KEY,
} as const;
const TEST_CREATE_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          code: `
  // Calculate the sum of all even numbers in an array
  function sumEvens(arr) {
    return arr
      .filter(num => num % 2 === 0)
      .reduce((total, num) => total + num, 0);
  }
  `,
        }),
      },
    },
  ],
};

async function setupOpenAIMock(config: {
  createResponse?: object;
  createError?: Error;
  clientError?: Error;
}) {
  if (config.createResponse != null && config.createError != null) {
    throw new Error(
      "OpenAI mock can't return both a success and a failure, choose 1",
    );
  }

  if (
    config.clientError != null &&
    (config.createResponse != null || config.createError != null)
  ) {
    throw new Error(
      'OpenAI mock will error on instantiation, so no need for a create response',
    );
  }

  const mockCompletionsCreate = config.createError
    ? vi.fn().mockRejectedValue(config.createError)
    : vi.fn().mockResolvedValue(config.createResponse);
  const mockOpenAIInstance = {
    chat: { completions: { create: mockCompletionsCreate } },
  };
  const mockOpenAI = config.clientError
    ? vi.fn().mockImplementation(() => {
        throw config.clientError;
      })
    : vi.fn().mockImplementation(() => mockOpenAIInstance);
  vi.doMock('openai', () => ({ default: mockOpenAI }));

  const { transformFromSource } = await import('../src');

  return { transformFromSource, mockOpenAI, mockCompletionsCreate };
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
  const { transformFromSource } = await setupOpenAIMock({
    createResponse: TEST_CREATE_RESPONSE,
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toContain('filter');
  expect(result).toContain('reduce');
  expect(result).not.toContain('for (let i = 0');
});

test('verifies OpenAI client was called with correct parameters', async () => {
  const { transformFromSource, mockOpenAI, mockCompletionsCreate } =
    await setupOpenAIMock({ createResponse: TEST_CREATE_RESPONSE });
  const config = TEST_LLM_CONFIG;

  await transformFromSource(TEST_SOURCE, TEST_PROMPT, { llm: config });

  expect(mockOpenAI).toHaveBeenCalledWith({ apiKey: TEST_FAKE_API_KEY });
  expect(mockCompletionsCreate).toHaveBeenCalledWith({
    model: config.model,
    messages: [
      {
        role: 'system',
        content: SYSTEM_TRANSFORM_PROMPT,
      },
      {
        role: 'user',
        content: buildTransformUserPrompt(TEST_SOURCE, TEST_PROMPT),
      },
    ],
    temperature: 0,
  });
});

test('throws error if OpenAI client instantiation fails', async () => {
  const clientError = new Error('Client init failed');
  const { transformFromSource } = await setupOpenAIMock({
    clientError: clientError,
  });

  const result = await tryCatchAsync(() => {
    return transformFromSource(TEST_SOURCE, TEST_PROMPT, {
      llm: TEST_LLM_CONFIG,
    });
  });

  verifyError(
    result,
    clientError,
    "Failed to load client; cause='Error: Client init failed'",
  );
});

test('throws error if chat completions create fails', async () => {
  const createError = new Error('API call failed');
  const { transformFromSource } = await setupOpenAIMock({
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

test('returns original source if chat completions response has no content', async () => {
  const { transformFromSource } = await setupOpenAIMock({
    createResponse: { choices: [{ message: { content: null } }] },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});

test('throws error if chat completions response content is invalid JSON', async () => {
  const { transformFromSource } = await setupOpenAIMock({
    createResponse: { choices: [{ message: { content: 'invalid json' } }] },
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

test('that if chat completions response JSON lacks "code" property, then return original source', async () => {
  const { transformFromSource } = await setupOpenAIMock({
    createResponse: {
      choices: [{ message: { content: JSON.stringify({ notCode: 'abc' }) } }],
    },
  });

  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toBe(TEST_SOURCE);
});
