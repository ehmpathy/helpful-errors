import type { HelpfulErrorMetadata } from './HelpfulError';
import { UnexpectedCodePathError } from './UnexpectedCodePathError';

/**
 * .what = error for system malfunctions and defects
 * .why = clearer name than UnexpectedCodePathError, with exit code and emoji for tools
 *
 * extends UnexpectedCodePathError for backwards compatibility
 * - instanceof UnexpectedCodePathError === true
 * - http code 500
 * - exit code 1 (unix general error convention)
 * - emoji for log utilities
 */
export class MalfunctionError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends UnexpectedCodePathError<TMetadata> {
  /**
   * .what = default error code for malfunction errors
   * .why = aligns with http 500 and unix exit code 1 (general error)
   */
  public static code = { http: 500, exit: 1 } as const;

  /**
   * .what = emoji for malfunction errors
   * .why = enables log utilities to visually distinguish error types
   */
  public static emoji = '💥';
}
