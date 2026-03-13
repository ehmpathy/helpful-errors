import { BadRequestError } from './BadRequestError';
import type { HelpfulErrorMetadata } from './HelpfulError';

/**
 * .what = error for caller constraint violations
 * .why = clearer name than BadRequestError, with exit code and emoji for tools
 *
 * extends BadRequestError for backwards compatibility
 * - instanceof BadRequestError === true
 * - http code 400
 * - exit code 2 (unix usage error convention)
 * - emoji prefix for visual distinction
 */
export class ConstraintError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends BadRequestError<TMetadata> {
  /**
   * .what = default error code for constraint errors
   * .why = aligns with http 400 and unix exit code 2 (usage error)
   */
  public static code = { http: 400, exit: 2 } as const;

  /**
   * .what = emoji for constraint errors
   * .why = enables log utilities to visually distinguish error types
   */
  public static emoji = '✋';
}
