import { err, ok, type Result, ResultAsync } from 'neverthrow';

export function tryCatch<T>(callback: () => T): Result<T, unknown> {
  let result: ReturnType<typeof callback>;
  try {
    result = callback();
  } catch (error) {
    return err(error);
  }

  return ok(result);
}

export function tryCatchAsync<T>(
  callback: () => Promise<T>,
): ResultAsync<T, unknown> {
  return ResultAsync.fromPromise(callback(), e => e);
}
