export class AITransformError extends Error {
  readonly cause: unknown;

  constructor(message: string, options?: { cause: unknown }) {
    let formattedMessage = message;
    if (options?.cause) {
      formattedMessage = `${formattedMessage}; cause='${options.cause}'`;
    }
    super(formattedMessage);

    this.cause = options?.cause;
  }
}
