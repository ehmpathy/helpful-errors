/**
 * .what = check whether a semver version is greater-than-or-equal to a minimum
 * .why =
 *   - powers the `isHelpfulError(err, { version: { min } })` gate
 *   - a naive string compare is wrong: '1.10.0' < '1.7.3' lexicographically, so we must
 *     compare numeric major.minor.patch tuples
 * .note =
 *   - zero dependency, to honor the no-barrel / cycle-safe import discipline
 *   - malformed input (non-numeric parts) fails the gate (returns false) rather than throw
 *   - prerelease ('1.8.0-beta') and build-metadata ('1.8.0+sha') suffixes are dropped; only
 *     the numeric major.minor.patch core is compared
 */
export const isVersionAtLeast = (input: {
  version: string;
  min: string;
}): boolean => {
  // parse a semver string into a numeric [major, minor, patch] tuple, or null if malformed
  const parse = (raw: string): [number, number, number] | null => {
    // drop any prerelease/build suffix, keep the numeric core
    const core = raw.split('-')[0]?.split('+')[0] ?? '';
    const [majorRaw, minorRaw, patchRaw, ...rest] = core.split('.');

    // require exactly three parts
    if (rest.length) return null;
    if (
      majorRaw === undefined ||
      minorRaw === undefined ||
      patchRaw === undefined
    )
      return null;

    // require all three to be numeric
    const major = Number.parseInt(majorRaw, 10);
    const minor = Number.parseInt(minorRaw, 10);
    const patch = Number.parseInt(patchRaw, 10);
    if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch))
      return null;

    return [major, minor, patch];
  };

  // parse both sides; malformed either side fails the gate
  const version = parse(input.version);
  const min = parse(input.min);
  if (!version || !min) return false;

  // compare major, then minor, then patch (tuple index is typed, no cast needed)
  if (version[0] !== min[0]) return version[0] > min[0];
  if (version[1] !== min[1]) return version[1] > min[1];
  return version[2] >= min[2];
};
