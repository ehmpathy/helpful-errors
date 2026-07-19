import { getHelpfulErrorVersion } from './getHelpfulErrorVersion';
import type { HelpfulError } from './HelpfulError';
import { isVersionAtLeast } from './isVersionAtLeast';

/**
 * .what = detect whether a value is a HelpfulError, globally and cross-version
 * .why =
 *   - instanceof fails across duplicate copies of helpful-errors (each copy defines a
 *     distinct class); the registered brand symbol is shared realm-wide, so this guard
 *     returns true regardless of which copy minted the error
 *   - minification-proof: keys off a registered symbol, not a class name
 * .how =
 *   - reads the stamped brand via getHelpfulErrorVersion (the single source of truth for
 *     how the brand is read off an unknown value)
 *   - when options.version.min is given, also requires the stamped version to be >= min
 * .note =
 *   - accepts unknown so callers who `catch (e: unknown)` need no pre-cast; narrows to
 *     HelpfulError on success
 *   - "global" means in-process realm-global; a JSON-serialized/revived error is a plain
 *     object with no live brand, so it returns false
 */
export const isHelpfulError = (
  error: unknown,
  options?: { version: { min: string } },
): error is HelpfulError => {
  // read the brand via the single source of truth; undefined → not branded
  const stamped = getHelpfulErrorVersion(error);
  if (stamped === undefined) return false;

  // no version constraint → branded is enough
  if (!options) return true;

  // guard the min: an untyped (js) caller may pass a non-string min; a non-string
  // fails the gate (returns false) rather than crash — matches the "never throw" contract
  const min: unknown = options.version?.min;
  if (typeof min !== 'string') return false;

  // version constraint → require stamped version >= min
  return isVersionAtLeast({ version: stamped, min });
};
