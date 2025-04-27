import { err, ok, type Result } from 'neverthrow';

import { AITransformError } from './errors';
import { TransformResponseSchema } from './schemas';
import { tryCatch, tryCatchAsync } from './utils/result';

interface BaseAITransformerConfigConstraint {
  model: string;
}

/**
 * Abstract base for AI transformation implementations.
 * Provides common functionality and defines the interface that specific providers must implement.
 */
export abstract class BaseAITransformer<
  ClientType,
  ConfigType extends BaseAITransformerConfigConstraint,
  ErrorType extends AITransformError,
> {
  /**
   * Set of model identifiers supported by this transformer implementation.
   * Used for validation in the preChecks method.
   */
  protected readonly supportedModels: Set<string>;

  /**
   * Creates a new transformer instance.
   *
   * @param supportedModels - A set of model identifiers that this transformer supports
   */
  constructor(supportedModels: Set<string>) {
    this.supportedModels = supportedModels;
  }

  /**
   * Transform source code using the configured AI provider.
   */
  async transformFromSource(
    source: string,
    prompt: string,
    config: ConfigType,
  ): Promise<Result<string, AITransformError>> {
    const preChecksResult = this.preChecks(config);
    if (preChecksResult.isErr()) return err(preChecksResult.error);

    const clientResult = await this.createClient(config);
    if (clientResult.isErr()) return err(clientResult.error);

    return this.requestTransformation(
      source,
      prompt,
      clientResult.value,
      config,
    );
  }

  /**
   * Parse and validate the AI response.
   */
  protected async parseAndValidateResponse(
    response: string | null | undefined,
    source: string,
    createError: (message: string, options?: { cause?: unknown }) => ErrorType,
  ): Promise<Result<string, ErrorType>> {
    if (!response) return ok(source);

    const processedText = this.processResponseText(response);
    if (!processedText) return ok(source);

    const parsedContentResult = tryCatch(() => {
      return JSON.parse(processedText);
    }).mapErr(e => {
      return createError('Failed to parse AI transformation', { cause: e });
    });
    if (parsedContentResult.isErr()) return err(parsedContentResult.error);

    const validatedResponseResult = await tryCatchAsync(() => {
      return TransformResponseSchema.parseAsync(parsedContentResult.value);
    }).mapErr(e => {
      return createError('Failed to parse AI transformation', { cause: e });
    });
    if (validatedResponseResult.isErr()) {
      return err(validatedResponseResult.error);
    }

    return ok(validatedResponseResult.value.code || source);
  }

  /**
   * Pre-processes the response text if needed (e.g., strip markdown).
   * Default implementation returns the text as-is.
   */
  protected processResponseText(text: string): string | null {
    return text;
  }

  /**
   * Run pre-checks on config before attempting transformation.
   */
  protected preChecks(config: ConfigType): Result<void, AITransformError> {
    if (!this.supportedModels.has(config.model)) {
      return err(new AITransformError('Invalid model provided'));
    }

    return ok();
  }

  /**
   * Create a client for the specific AI provider.
   */
  protected abstract createClient(
    config: ConfigType,
  ): Promise<Result<ClientType, ErrorType>>;

  /**
   * Request transformation from the AI provider.
   */
  protected abstract requestTransformation(
    source: string,
    prompt: string,
    client: ClientType,
    config: ConfigType,
  ): Promise<Result<string, AITransformError>>;
}
