import { isPresent, omit } from 'type-fns';

import { getEnvOptions } from './utils/env';

export type HelpfulErrorMetadata = Record<string, any> & { cause?: Error };

/**
 * HelpfulError errors are used to add information that helps the future observer of the error understand whats going on
 */
export class HelpfulError extends Error {
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

  /**
   * an override to ensure that errors are serialized to json expressively
   *
   * ref
   * - https://stackoverflow.com/a/18391400/3068233
   * - https://github.com/nodejs/node/issues/29090
   */
  toJSON<T extends typeof HelpfulError>(
    this: T, // https://stackoverflow.com/a/51749145/3068233
    message: string,
    metadata?: HelpfulErrorMetadata,
  ): Record<string, any> {
    const obj: Record<string, any> = {};
    Object.getOwnPropertyNames(this).forEach((key) => {
      obj[key] = (this as any)[key as any];
    }, this);
    return obj;
  }
}
