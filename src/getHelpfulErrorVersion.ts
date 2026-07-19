import { MARK_AS_HELPFUL_ERROR } from './markers';

/**
 * .what = read the helpful-errors version stamped on a branded error
 * .why =
 *   - lets consumers inspect which version of helpful-errors minted an error at runtime
 *   - works across duplicate package copies via the realm-global registered symbol
 * .how =
 *   - the brand is a static property on the HelpfulError class, so it is read off the
 *     value's class: directly if given a class (function), else via its constructor
 *   - primitives map to their wrapper constructor (Number, String, ...) which carries
 *     no brand → undefined; null / undefined have no constructor → undefined
 *   - returns the stamped version string, or undefined if the value is not branded
 */
export const getHelpfulErrorVersion = (error: unknown): string | undefined => {
  // pick the class that would carry the static brand
  const brandHost =
    typeof error === 'function'
      ? error // a class was passed directly
      : error == null
        ? undefined // null / undefined carry no constructor
        : (error as object).constructor; // an instance → read off its class

  // no host → not branded
  if (!brandHost) return undefined;

  // read the registered brand symbol off the class (Reflect.get walks the prototype
  // chain, so subclasses inherit the base HelpfulError static brand)
  const stamped: unknown = Reflect.get(brandHost, MARK_AS_HELPFUL_ERROR);
  return typeof stamped === 'string' ? stamped : undefined;
};
