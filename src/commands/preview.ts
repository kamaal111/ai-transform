import { Args, Command } from '@oclif/core';

import { transformFromSource } from '../transforms';
import { GOOGLE_MODELS } from '../google';
import { tryCatchAsync } from '../utils/result';
import { isSupportedModel } from '../utils/llm';

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

class Preview extends Command {
  static override args = {
    model: Args.string({
      description: 'Model to use to preview',
      default: GOOGLE_MODELS.GEMINI_2_0_FLASH,
    }),
  };
  static override description = 'Preview transformation result of LLM';
  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> gemini-2.0-flash-lite',
    '<%= config.bin %> <%= command.id %> gpt-4.1-nano',
  ];
  static override flags = {};

  public async run(): Promise<void> {
    const { args } = await this.parse(Preview);
    const { model } = args;
    if (!isSupportedModel(model)) {
      console.error(`Unsupported model provided of '${model}'`);
      return;
    }

    console.log(`Original source:\n${EXAMPLE_SOURCE}`);
    const transformedResult = await tryCatchAsync(() => {
      return transformFromSource(EXAMPLE_SOURCE, EXAMPLE_PROMPT, {
        llm: { model },
      });
    });
    if (transformedResult.isErr()) {
      console.error('Error during transformation:', transformedResult.error);
      return;
    }

    console.log(`Transformed source:\n${transformedResult.value}`);
  }
}

export default Preview;
