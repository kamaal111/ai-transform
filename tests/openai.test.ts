import { expect, test, vi } from 'vitest';

import { transformFromSource } from '../src';

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

vi.mock('openai', () => {
  const createResponse = `
// Calculate the sum of all even numbers in an array
function sumEvens(arr) {
  return arr
    .filter(num => num % 2 === 0)
    .reduce((total, num) => total + num, 0);
}
`;
  const mockCompletionsCreate = vi.fn().mockResolvedValue({
    choices: [
      { message: { content: JSON.stringify({ code: createResponse }) } },
    ],
  });
  const OpenAI = vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCompletionsCreate } },
  }));

  return { default: OpenAI };
});

test('transforms code', async () => {
  const result = await transformFromSource(TEST_SOURCE, TEST_PROMPT, {
    llm: TEST_LLM_CONFIG,
  });

  expect(result).toContain('filter');
  expect(result).toContain('reduce');
  expect(result).not.toContain('for (let i = 0');
});

test('verifies OpenAI client was called with correct parameters', async () => {
  const OpenAI = (await import('openai')).default;

  await transformFromSource(TEST_SOURCE, TEST_PROMPT, { llm: TEST_LLM_CONFIG });

  expect(OpenAI).toHaveBeenCalledWith({ apiKey: TEST_FAKE_API_KEY });

  const mockInstance = vi.mocked(OpenAI).mock.results[0].value;
  const createMethod = mockInstance.chat.completions.create;

  expect(createMethod).toHaveBeenCalledWith({
    model: TEST_LLM_CONFIG.model,
    messages: [
      {
        role: 'system',
        content: expect.stringContaining('code-transformation'),
      },
      {
        role: 'user',
        content: expect.stringContaining('<<<SOURCE>>>'),
      },
    ],
    temperature: 0,
  });
});
