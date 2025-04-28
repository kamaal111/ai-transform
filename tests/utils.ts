import type { Result } from 'neverthrow';
import { expect } from 'vitest';

export function withMarkdownJSONTags(str: string): string {
  return '```json\n' + str + '```';
}

export function verifyError(
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
