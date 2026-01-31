// import from subdirs directly to avoid cyclic-dependency from withAssure, which leverages HelpfulError
import { isPresentAssess as isPresent } from 'type-fns/dist/checks/isPresent.assess';
import { omit } from 'type-fns/dist/companions/omit';

import { getEnvOptions } from './utils/env';
import { withHelpfulError } from './withHelpfulError';

/**
 * .what = error code with optional http status and machine-readable slug
 * .why = enables declarative error classification
 */
export type HelpfulErrorCode = {
  http?: number;
  slug?: string;
};

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
 * .what = constructor type for HelpfulError and subclasses
 * .why = enables relaxed type constraints for polymorphic static methods
 */
export type HelpfulErrorConstructor = new (
  message: string,
  metadata?: any,
) => HelpfulError<any>;

/**
 * HelpfulError errors are used to add information that helps the future observer of the error understand whats going on
 */
export class HelpfulError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends Error {
  /**
   * .what = default error code for this error class
   * .why = enables subclasses to declare baked-in codes
   */
  public static code: HelpfulErrorCode | undefined = undefined;

  /**
   * .what = the procedure executed on new HelpfulError() calls to instantiate errors
   * .why =
   *   - specifies how we extend the Error class
   * .how =
   *   - adds metadata to the message, serialized to be maximally helpful
   *   - extracts the cuase from the metadata input, guarantees it is passed through correctly
   */
  constructor(
    message: string,
    ...[metadata]: HelpfulErrorMetadata extends TMetadata
      ? [metadata?: TMetadata] // default type - optional
      : [metadata: TMetadata] // specific type - required
  ) {
    // extract code and cause from metadata, omit both from message serialization
    const metadataForMessage = metadata
      ? omit(metadata, ['cause', 'code'])
      : metadata;
    const fullMessage = [
      message,
      metadataForMessage && Object.keys(metadataForMessage).length
        ? getEnvOptions().expand
          ? JSON.stringify(metadataForMessage, null, 2)
          : JSON.stringify(metadataForMessage)
        : null,
    ]
      .filter(isPresent)
      .join('\n\n');
    super(fullMessage, metadata?.cause ? { cause: metadata.cause } : undefined);

    // store the original message, metadata, cause, and code for later access (non-enumerable)
    Object.defineProperty(this, 'original', {
      value: {
        message,
        metadata,
        cause: metadata?.cause,
        code: metadata?.code,
      },
      enumerable: false, // non enumerable, so it wont pollute toJSON, Object.keys(), nor for...in loops; its only intended for internal use
      writable: false,
      configurable: false,
    });
  }

  /**
   * the original message and metadata, before being formatted into the error message
   */
  private readonly original!: {
    message: string;
    metadata?: TMetadata;
    cause?: Error;
    code?: HelpfulErrorCode | null;
  };

  /**
   * .what = accessor for merged error code (class + instance)
   * .why = enables programmatic access to error classification
   */
  public get code(): HelpfulErrorCode | undefined {
    // get class static code via prototype chain
    const classCode = (this.constructor as typeof HelpfulError).code;

    // get instance code from original
    const instanceCode = this.original.code;

    // handle explicit null (opt-out)
    if (instanceCode === null) return undefined;

    // if no code anywhere, return undefined
    if (!classCode && !instanceCode) return undefined;

    // merge: instance fields override class fields
    return {
      ...classCode,
      ...instanceCode,
    };
  }

  /**
   * .what = public accessor for the metadata passed to the error
   * .why = enables programmatic access to metadata without parse of the message
   * .note = getter is non-enumerable by default, so it won't pollute toJSON or Object.keys()
   * .note = excludes 'code' field since code is accessed via error.code
   */
  public get metadata(): HelpfulErrorMetadata extends TMetadata
    ? TMetadata | undefined // default type - metadata was optional
    : TMetadata {
    // specific type - metadata was required
    const raw = this.original.metadata;
    if (!raw) return raw as any;

    // omit code from metadata to avoid duplication (code is accessed via error.code)
    return omit(raw, ['code']) as HelpfulErrorMetadata extends TMetadata
      ? TMetadata | undefined
      : TMetadata;
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
    metadata?: InstanceType<T> extends HelpfulError<infer M>
      ? M
      : HelpfulErrorMetadata,
  ): never {
    throw new this(message, metadata) as InstanceType<T>;
  }

  /**
   * a utility to wrap a function with helpful error handling
   *
   * e.g.,
   * ```ts
   * const getUser = HelpfulError.wrap(
   *   async (id: string) => await db.query('SELECT * FROM users WHERE id = ?', [id]),
   *   { message: 'could not get user', metadata: { table: 'users' } }
   * );
   * ```
   */
  public static wrap<
    T extends HelpfulErrorConstructor,
    TLogic extends (...args: any[]) => Promise<any>,
  >(
    this: T,
    logic: TLogic,
    options: {
      message: string;
      metadata: Record<string, any>;
    },
  ): (...args: Parameters<TLogic>) => Promise<Awaited<ReturnType<TLogic>>>;
  public static wrap<
    T extends HelpfulErrorConstructor,
    TLogic extends (...args: any[]) => any,
  >(
    this: T,
    logic: TLogic,
    options: {
      message: string;
      metadata: Record<string, any>;
    },
  ): (...args: Parameters<TLogic>) => ReturnType<TLogic>;
  public static wrap<
    T extends HelpfulErrorConstructor,
    TLogic extends (...args: any[]) => any,
  >(
    this: T,
    logic: TLogic,
    options: {
      message: string;
      metadata: Record<string, any>;
    },
  ): TLogic {
    return withHelpfulError(logic, {
      variant: this,
      ...options,
    });
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

    // enumerate own properties
    Object.getOwnPropertyNames(this)
      .filter((key) => key !== 'original')
      .sort()
      .forEach((key) => {
        obj[key] = (this as any)[key as any];
      }, this);

    // conditionally include code only when slug is present (prevents log spam with default http codes)
    const code = (this as unknown as HelpfulError).code;
    if (code?.slug) {
      obj.code = code;
    }

    return obj;
  }
}
