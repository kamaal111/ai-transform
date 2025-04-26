import { transformFromSource } from '../src';
import { tryCatchAsync } from '../src/utils';

const LLM_CONFIG = { provider: 'openai', model: 'gpt-4.1-nano' } as const;

const EXAMPLE_SOURCE = `
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

const EXAMPLE_PROMPT = 'Refactor this to use array methods (filter + reduce)';

async function main() {
  console.log(`Original source:\n${EXAMPLE_SOURCE}`);
  const transformedResult = await tryCatchAsync(() => {
    return transformFromSource(EXAMPLE_SOURCE, EXAMPLE_PROMPT, {
      llm: LLM_CONFIG,
    });
  });
  if (transformedResult.isErr()) {
    console.error('Error during transformation:', transformedResult.error);
    return;
  }

  console.log(`Transformed source:\n${transformedResult.value}`);
}

main();
