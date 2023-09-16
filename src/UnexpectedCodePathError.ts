import { HelpfulError } from './HelpfulError';

/**
 * UnexpectedCodePathError errors are used to explicitly declare that we've reached a code path that should never have been reached
 */
export class UnexpectedCodePathError extends HelpfulError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(['UnexpectedCodePathError: ', message].join(''), metadata);
  }
}
