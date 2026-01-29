import { HelpfulError, type HelpfulErrorMetadata } from './HelpfulError';

/**
 * UnexpectedCodePathError errors are used to explicitly declare that we've reached a code path that should never have been reached
 */
export class UnexpectedCodePathError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends HelpfulError<TMetadata> {
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
