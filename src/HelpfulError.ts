// import from subdirs directly to avoid cyclic-dependency from withAssure, which leverages HelpfulError
import { isPresentAssess as isPresent } from 'type-fns/dist/checks/isPresent.assess';
import { omit } from 'type-fns/dist/companions/omit';

import { getEnvOptions } from './utils/env';

export type HelpfulErrorMetadata = Record<string, any> & {
  /**
   * .what = declares the error that triggered this error
   * .why = enables stacktrace of both errors to be visible
   *   - exposes the full stacktrace trail of each error
   *   - includes links to each file:line where each error was thrown
   */
  cause?: Error;
};

/**
 * HelpfulError errors are used to add information that helps the future observer of the error understand whats going on
 */
export class HelpfulError extends Error {
  /**
   * .what = the procedure executed on new HelpfulError() calls to instantiate errors
   * .why =
   *   - specifies how we extend the Error class
   * .how =
   *   - adds metadata to the message, serialized to be maximally helpful
   *   - extracts the cuase from the metadata input, guarantees it is passed through correctly
   */
  constructor(message: string, metadata?: HelpfulErrorMetadata) {
    const metadataWithoutCause = metadata
      ? omit(metadata, ['cause'])
      : metadata;
    const fullMessage = [
      message,
      metadataWithoutCause && Object.keys(metadataWithoutCause).length
        ? getEnvOptions().expand
          ? JSON.stringify(metadataWithoutCause, null, 2)
          : JSON.stringify(metadataWithoutCause)
        : null,
    ]
      .filter(isPresent)
      .join('\n\n');
    super(fullMessage, metadata?.cause ? { cause: metadata.cause } : undefined);

    // store the original message, metadata, and cause for later access
    this.original = {
      message,
      metadata,
      cause: metadata?.cause,
    };
  }

  /**
   * the original message and metadata, before being formatted into the error message
   */
  private readonly original: {
    message: string;
    metadata?: HelpfulErrorMetadata;
    cause?: Error;
  };

  /**
   * a utility to throw an error of this class, for convenience
   *
   * e.g.,
   * ```ts
   * const phone = customer.phone ?? HelpfulError.throw('expected a phone');
   * ```
   */
  public static throw<T extends typeof HelpfulError>(
    this: T, // https://stackoverflow.com/a/51749145/3068233
    message: string,
    metadata?: HelpfulErrorMetadata,
  ): never {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw new this(message, metadata) as InstanceType<T>;
  }

  /**
   * creates a redacted clone of the error, stripping specified parts from the message
   *
   * useful when you want to preserve only the core message without exposing sensitive metadata
   *
   * e.g.,
   * ```ts
   * const original = new HelpfulError('payment failed', { cardNumber: '1234-5678' });
   * const redacted = original.redact(['metadata']); // only contains 'payment failed' and cause
   * const fullyRedacted = original.redact(['metadata', 'cause']); // only contains 'payment failed'
   * ```
   */
  public redact(parts: Array<'metadata' | 'cause'>): this {
    // determine what to include based on what's being redacted
    const shouldIncludeMetadata = !parts.includes('metadata');
    const shouldIncludeCause = !parts.includes('cause');

    // build the metadata object for the new instance
    const newMetadata: HelpfulErrorMetadata | undefined = (() => {
      if (!shouldIncludeMetadata && !shouldIncludeCause) {
        return undefined;
      }
      if (shouldIncludeMetadata && shouldIncludeCause) {
        return this.original.metadata;
      }
      if (shouldIncludeCause && this.original.cause) {
        return { cause: this.original.cause };
      }
      if (shouldIncludeMetadata) {
        return this.original.metadata
          ? omit(this.original.metadata, ['cause'])
          : undefined;
      }
      return undefined;
    })();

    // create a new instance with the original message and filtered metadata
    return new (this.constructor as any)(this.original.message, newMetadata);
  }

  /**
   * an override to ensure that errors are serialized to json expressively
   *
   * ref
   * - https://stackoverflow.com/a/18391400/3068233
   * - https://github.com/nodejs/node/issues/29090
   */
  toJSON<T extends typeof HelpfulError>(
    this: T, // https://stackoverflow.com/a/51749145/3068233
  ): Record<string, any> {
    const obj: Record<string, any> = {};
    Object.getOwnPropertyNames(this)
      .sort()
      .forEach((key) => {
        obj[key] = (this as any)[key as any];
      }, this);
    return obj;
  }
}
