import { omit } from 'type-fns';

export type HelpfulErrorMetadata = Record<string, any> & { cause?: Error };

/**
 * HelpfulError errors are used to add information that helps the future observer of the error understand whats going on
 */
export class HelpfulError extends Error {
  constructor(message: string, metadata?: HelpfulErrorMetadata) {
    const metadataWithoutCause = metadata
      ? omit(metadata, ['cause'])
      : metadata;
    const fullMessage = `${message}${
      metadataWithoutCause && Object.keys(metadataWithoutCause).length
        ? `\n\n${JSON.stringify(metadataWithoutCause)}`
        : ''
    }`;
    super(fullMessage, metadata?.cause ? { cause: metadata.cause } : undefined);
  }

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
}
