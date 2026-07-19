import { BadRequestError } from './BadRequestError';
import { getHelpfulErrorVersion } from './getHelpfulErrorVersion';
import { HelpfulError } from './HelpfulError';
import { MARK_AS_HELPFUL_ERROR } from './markers';
import { version } from './version';

describe('getHelpfulErrorVersion', () => {
  describe('given a HelpfulError', () => {
    it('should return the stamped package version', () => {
      const error = new HelpfulError('boom');
      expect(getHelpfulErrorVersion(error)).toEqual(version);
    });

    it('should return the version for a subclass instance', () => {
      class CustomError extends HelpfulError {}
      const error = new CustomError('boom');
      expect(getHelpfulErrorVersion(error)).toEqual(version);
    });

    it('should read the stamped version off a foreign-copy brand', () => {
      // a value branded by a different copy: that copy stamps the brand statically on
      // ITS class, so the version is read off the constructor across the copy boundary
      class ForeignBrandError extends Error {
        public static [MARK_AS_HELPFUL_ERROR] = '1.0.0';
      }
      const foreignCopy = new ForeignBrandError('boom');
      expect(getHelpfulErrorVersion(foreignCopy)).toEqual('1.0.0');
    });

    it('should read the stamped version off a class passed directly', () => {
      // the reader also accepts a class (function) directly and reads the static
      // brand off it — symmetric with how it reads off an instance's constructor
      expect(getHelpfulErrorVersion(HelpfulError)).toEqual(version);
    });
  });

  describe('contract output matrix (snapshot)', () => {
    it('should match the snapshot across every documented variant', () => {
      // cast to a release-stable shape: capture the output type + presence, never the
      // literal version string. the value for this copy is pkg.version, which bumps on
      // EVERY release — a snapshot that pinned it would fail in the `preversion` step on
      // each bump and block the release (a snapshot-visual-blemish). the exact literal is
      // not lost from coverage: it is verified by the explicit assertions above
      // (`expect(getHelpfulErrorVersion(error)).toEqual(version)` and the '1.0.0'
      // foreign-copy case), per rule.require.snapshots — snapshot guards the stable shape
      // (present + type), assertions verify the exact value.
      const asOutputShape = (value: unknown) => ({
        type: typeof value,
        present: value !== undefined,
      });
      class CustomError extends HelpfulError {}
      // a foreign copy: a value branded by a DIFFERENT copy of helpful-errors.
      // the companion reader must read the stamped version across the copy
      // boundary too; the matrix makes that cross-copy read visible in the snap.
      class ForeignBrandError extends Error {
        public static [MARK_AS_HELPFUL_ERROR] = '1.0.0';
      }
      const foreignCopy = new ForeignBrandError('boom');
      // an ordered array of {case,result} tuples, NOT a plain object: jest's
      // pretty-format alphabetizes object keys, which would scramble the intended
      // narrative row order (detection → primitives) in the snapshot. an array
      // preserves declaration order, so the vibecheck artifact reads as designed
      // (symmetric with the isHelpfulError matrix).
      const matrix = [
        {
          case: 'base HelpfulError',
          result: asOutputShape(
            getHelpfulErrorVersion(new HelpfulError('boom')),
          ),
        },
        {
          case: 'builtin subclass',
          result: asOutputShape(
            getHelpfulErrorVersion(new BadRequestError('boom')),
          ),
        },
        {
          case: 'custom subclass',
          result: asOutputShape(
            getHelpfulErrorVersion(new CustomError('boom')),
          ),
        },
        {
          case: 'foreign copy (branded, no class link)',
          result: asOutputShape(getHelpfulErrorVersion(foreignCopy)),
        },
        {
          case: 'plain Error',
          result: asOutputShape(getHelpfulErrorVersion(new Error('plain'))),
        },
        { case: 'null', result: asOutputShape(getHelpfulErrorVersion(null)) },
        {
          case: 'string',
          result: asOutputShape(getHelpfulErrorVersion('nope')),
        },
        { case: 'number', result: asOutputShape(getHelpfulErrorVersion(42)) },
        {
          case: 'plain object',
          result: asOutputShape(getHelpfulErrorVersion({ message: 'faux' })),
        },
      ];
      expect(matrix).toMatchSnapshot();
    });
  });

  describe('given a non-branded value', () => {
    it('should return undefined for a plain Error', () => {
      expect(getHelpfulErrorVersion(new Error('plain'))).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(getHelpfulErrorVersion(null)).toBeUndefined();
    });

    it('should return undefined for a string', () => {
      expect(getHelpfulErrorVersion('nope')).toBeUndefined();
    });

    it('should return undefined for a number', () => {
      expect(getHelpfulErrorVersion(42)).toBeUndefined();
    });

    it('should return undefined for a plain object', () => {
      expect(getHelpfulErrorVersion({ message: 'faux' })).toBeUndefined();
    });
  });
});
