import { HelpfulError, type HelpfulErrorMetadata } from './HelpfulError';

/**
 * UnexpectedCodePathError errors are used to explicitly declare that we've reached a code path that should never have been reached
 */
export class UnexpectedCodePathError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends HelpfulError<TMetadata> {
  /**
   * .what = default http code for unexpected code path errors
   * .why = aligns with http 500 semantics
   */
  public static code = { http: 500 } as const;

  constructor(
    message: string,
    ...[metadata]: HelpfulErrorMetadata extends TMetadata
      ? [metadata?: TMetadata]
      : [metadata: TMetadata]
  ) {
    super(
      ['UnexpectedCodePathError: ', message].join(''),
      metadata as TMetadata,
    );
  }
}
