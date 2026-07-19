import { isVersionAtLeast } from './isVersionAtLeast';

const TEST_CASES: Array<{
  description: string;
  given: { version: string; min: string };
  expect: boolean;
}> = [
  {
    description: 'equal versions satisfy >=',
    given: { version: '1.7.3', min: '1.7.3' },
    expect: true,
  },
  {
    description: 'higher patch satisfies >=',
    given: { version: '1.7.4', min: '1.7.3' },
    expect: true,
  },
  {
    description: 'lower patch fails >=',
    given: { version: '1.7.2', min: '1.7.3' },
    expect: false,
  },
  {
    description: 'semver (not lexicographic): 1.10.0 >= 1.7.3',
    given: { version: '1.10.0', min: '1.7.3' },
    expect: true,
  },
  {
    description: 'semver (not lexicographic): 1.7.3 < 1.10.0',
    given: { version: '1.7.3', min: '1.10.0' },
    expect: false,
  },
  {
    description: 'higher major satisfies >= despite lower minor/patch',
    given: { version: '2.0.0', min: '1.9.9' },
    expect: true,
  },
  {
    description: 'lower major fails >= despite higher minor/patch',
    given: { version: '1.9.9', min: '2.0.0' },
    expect: false,
  },
  {
    description: 'prerelease suffix is ignored (numeric core compared)',
    given: { version: '1.8.0-beta', min: '1.8.0' },
    expect: true,
  },
  {
    description: 'malformed version fails the gate',
    given: { version: 'not-a-version', min: '1.0.0' },
    expect: false,
  },
  {
    description: 'malformed min fails the gate',
    given: { version: '1.0.0', min: 'nope' },
    expect: false,
  },
  {
    description: 'partial version (absent patch) fails the gate',
    given: { version: '1.8', min: '1.0.0' },
    expect: false,
  },
];

describe('isVersionAtLeast', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = isVersionAtLeast(thisCase.given);
      expect(result).toEqual(thisCase.expect);
    }),
  );
});
