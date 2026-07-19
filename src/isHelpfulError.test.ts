import { BadRequestError } from './BadRequestError';
import { ConstraintError } from './ConstraintError';
import { getHelpfulErrorVersion } from './getHelpfulErrorVersion';
import { HelpfulError } from './HelpfulError';
import { isHelpfulError } from './isHelpfulError';
import { MalfunctionError } from './MalfunctionError';
import { MARK_AS_HELPFUL_ERROR } from './markers';
import { UnexpectedCodePathError } from './UnexpectedCodePathError';
import { version } from './version';

describe('isHelpfulError', () => {
  describe('given a HelpfulError or subclass', () => {
    it('should detect a base HelpfulError', () => {
      expect(isHelpfulError(new HelpfulError('boom'))).toEqual(true);
    });

    it('should detect every builtin subclass', () => {
      expect(isHelpfulError(new BadRequestError('boom'))).toEqual(true);
      expect(isHelpfulError(new ConstraintError('boom'))).toEqual(true);
      expect(isHelpfulError(new UnexpectedCodePathError('boom'))).toEqual(true);
      expect(isHelpfulError(new MalfunctionError('boom'))).toEqual(true);
    });

    it('should detect a custom subclass', () => {
      class CustomError extends HelpfulError {}
      expect(isHelpfulError(new CustomError('boom'))).toEqual(true);
    });

    it('should narrow the type to HelpfulError', () => {
      const error: unknown = new HelpfulError('boom', { code: { slug: 'X' } });
      if (isHelpfulError(error)) {
        // type narrowed → .code is accessible without a cast
        expect(error.code).toEqual({ slug: 'X' });
      } else {
        throw new Error('expected isHelpfulError to be true');
      }
    });
  });

  describe('given a foreign copy (the brand without the local class)', () => {
    // the core cross-copy usecase: an error minted by a DIFFERENT copy of helpful-errors
    // is a value that holds the registered brand but has no prototype link to this copy's
    // class — so instanceof fails, yet the realm-global brand must still detect it. this is
    // the one behavior the whole feature exists to provide; without it a future swap of
    // Symbol.for(...) back to Symbol() would pass every same-class test yet break this.
    const asForeignCopy = (stamped: unknown) => {
      // a separate copy of helpful-errors stamps the brand statically on ITS class,
      // so an error it mints carries the brand via its constructor, not the instance.
      // this local class has no prototype link to this copy's HelpfulError, so
      // instanceof fails — exactly the cross-copy condition the brand must survive.
      class ForeignBrandError extends Error {
        public static [MARK_AS_HELPFUL_ERROR] = stamped;
      }
      return new ForeignBrandError('boom');
    };

    it('should detect a branded value that is not an instanceof the local class', () => {
      const foreignCopy = asForeignCopy('1.0.0');
      // instanceof fails across the copy boundary...
      expect(foreignCopy instanceof HelpfulError).toEqual(false);
      // ...but the registered brand still detects it
      expect(isHelpfulError(foreignCopy)).toEqual(true);
      expect(getHelpfulErrorVersion(foreignCopy)).toEqual('1.0.0');
    });

    it('should honor the version gate on a foreign-copy brand', () => {
      const foreignCopy = asForeignCopy('1.5.0');
      expect(
        isHelpfulError(foreignCopy, { version: { min: '1.0.0' } }),
      ).toEqual(true);
      expect(
        isHelpfulError(foreignCopy, { version: { min: '2.0.0' } }),
      ).toEqual(false);
    });

    it('should reject a foreign copy whose brand value is not a string', () => {
      // a corrupt/foreign stamp that is not a version string fails detection
      const foreignCopy = asForeignCopy(42);
      expect(isHelpfulError(foreignCopy)).toEqual(false);
    });
  });

  describe('given a non-HelpfulError value', () => {
    it('should reject a plain Error', () => {
      expect(isHelpfulError(new Error('plain'))).toEqual(false);
    });

    it('should reject null', () => {
      expect(isHelpfulError(null)).toEqual(false);
    });

    it('should reject a string', () => {
      expect(isHelpfulError('nope')).toEqual(false);
    });

    it('should reject a number', () => {
      expect(isHelpfulError(42)).toEqual(false);
    });

    it('should reject a plain object that mimics an error', () => {
      expect(isHelpfulError({ message: 'faux', name: 'Error' })).toEqual(false);
    });
  });

  describe('given a version constraint', () => {
    it('should pass when the stamped version equals min', () => {
      const error = new HelpfulError('boom');
      expect(isHelpfulError(error, { version: { min: version } })).toEqual(
        true,
      );
    });

    it('should pass when the stamped version exceeds min', () => {
      const error = new HelpfulError('boom');
      expect(isHelpfulError(error, { version: { min: '0.0.1' } })).toEqual(
        true,
      );
    });

    it('should fail when the stamped version is below min', () => {
      const error = new HelpfulError('boom');
      expect(isHelpfulError(error, { version: { min: '999.0.0' } })).toEqual(
        false,
      );
    });

    it('should fail for a non-branded value regardless of min', () => {
      expect(
        isHelpfulError(new Error('plain'), { version: { min: '0.0.1' } }),
      ).toEqual(false);
    });

    it('should fail the gate (not throw) when an untyped caller omits min', () => {
      const error = new HelpfulError('boom');
      // simulate an untyped js caller who passes options without a valid min;
      // the cast reproduces a boundary a typescript caller cannot reach
      const badOptions = { version: {} } as { version: { min: string } };
      expect(isHelpfulError(error, badOptions)).toEqual(false);
    });

    it('should fail the gate (not throw) when an untyped caller passes a non-string min', () => {
      const error = new HelpfulError('boom');
      // simulate an untyped js caller who passes a numeric min at the boundary
      const badOptions = { version: { min: 123 } } as unknown as {
        version: { min: string };
      };
      expect(isHelpfulError(error, badOptions)).toEqual(false);
    });
  });

  describe('given a JSON serialize/revive round-trip', () => {
    it('should not detect a revived error (the live brand does not survive)', () => {
      // the vision declares "global" as in-process realm-global: a serialized then
      // revived error is a plain object with no live brand symbol, so detection is false
      const error = new HelpfulError('boom', { data: 'value' });
      const revived = JSON.parse(JSON.stringify(error));
      expect(isHelpfulError(revived)).toEqual(false);
      expect(getHelpfulErrorVersion(revived)).toBeUndefined();
    });
  });

  describe('given a redacted clone', () => {
    it('should stay branded after redact (constructor re-applies the brand)', () => {
      const error = new HelpfulError('boom', { secret: 'value' });
      const redacted = error.redact(['metadata']);
      expect(isHelpfulError(redacted)).toEqual(true);
    });
  });

  describe('contract output matrix (snapshot)', () => {
    it('should match the snapshot across every documented variant', () => {
      // a release-stable matrix: booleans only, no literal version pinned
      // a foreign copy: the star behavior — a value branded by a DIFFERENT copy
      // of helpful-errors (registered brand present, no prototype link to this
      // copy's class). the matrix makes cross-copy detection visible in the
      // vibecheck snapshot, not only in the explicit foreign-copy assertions.
      class ForeignBrandError extends Error {
        public static [MARK_AS_HELPFUL_ERROR] = '1.0.0';
      }
      const foreignCopy = new ForeignBrandError('boom');
      // a custom subclass: a consumer-defined class that extends HelpfulError —
      // labeled distinctly from the builtin subclass so the snapshot self-documents
      // which kind of subclass each row tests (symmetric with getHelpfulErrorVersion)
      class CustomError extends HelpfulError {}
      // an ordered array of {case,result} tuples, NOT a plain object: jest's
      // pretty-format alphabetizes object keys, which would scramble the intended
      // narrative row order (detection → primitives → version gate) in the snapshot.
      // an array preserves declaration order, so the vibecheck artifact reads top-to-
      // bottom as designed.
      const matrix = [
        {
          case: 'base HelpfulError',
          result: isHelpfulError(new HelpfulError('boom')),
        },
        {
          case: 'builtin subclass',
          result: isHelpfulError(new BadRequestError('boom')),
        },
        {
          case: 'custom subclass',
          result: isHelpfulError(new CustomError('boom')),
        },
        {
          case: 'foreign copy (branded, no class link)',
          result: isHelpfulError(foreignCopy),
        },
        { case: 'plain Error', result: isHelpfulError(new Error('plain')) },
        { case: 'null', result: isHelpfulError(null) },
        { case: 'string', result: isHelpfulError('nope') },
        { case: 'number', result: isHelpfulError(42) },
        { case: 'plain object', result: isHelpfulError({ message: 'faux' }) },
        {
          case: 'base HelpfulError, min below stamp',
          result: isHelpfulError(new HelpfulError('boom'), {
            version: { min: '0.0.1' },
          }),
        },
        {
          case: 'base HelpfulError, min above stamp',
          result: isHelpfulError(new HelpfulError('boom'), {
            version: { min: '999.0.0' },
          }),
        },
        // the star behavior crossed with the version gate: a foreign-copy brand
        // (stamped '1.0.0') passes a min at/below its stamp and fails one above
        {
          case: 'foreign copy (branded, no class link), min below stamp',
          result: isHelpfulError(foreignCopy, { version: { min: '0.0.1' } }),
        },
        {
          case: 'foreign copy (branded, no class link), min above stamp',
          result: isHelpfulError(foreignCopy, { version: { min: '999.0.0' } }),
        },
      ];
      expect(matrix).toMatchSnapshot();
    });
  });

  describe('registered symbol semantics (Symbol.for, not Symbol)', () => {
    // this is the wish's hardest-flagged pitfall: the brand MUST live in the realm-global
    // registry (Symbol.for), never a module-local Symbol(). the other tests import
    // MARK_AS_HELPFUL_ERROR from ./markers, so they would agree with prod even under a
    // Symbol() regression. these tests instead recompute the key independently — the way a
    // SEPARATE copy of helpful-errors would — so a switch to Symbol() would fail them.
    it('should stamp the brand under the global registry key, retrievable by an independent Symbol.for', () => {
      // a second copy computes the same registered key itself; must be the identical symbol
      const keyFromRegistry = Symbol.for('helpful-errors');
      expect(keyFromRegistry).toBe(MARK_AS_HELPFUL_ERROR);
      // the brand is static on the class, so it is readable off the class via that
      // independently-obtained key (an instance inherits detection through its constructor)
      expect(Reflect.get(HelpfulError, keyFromRegistry)).toEqual(version);
    });

    it('should NOT be readable via an unregistered local Symbol of the same description', () => {
      // a module-local Symbol() (what a regression would mint) shares the description but is
      // a different symbol — it must NOT retrieve the brand; this is why registered-ness matters
      const localSymbol = Symbol('helpful-errors');
      expect(localSymbol).not.toBe(MARK_AS_HELPFUL_ERROR);
      expect(Reflect.get(HelpfulError, localSymbol)).toBeUndefined();
    });
  });

  describe('brand descriptor', () => {
    it('should carry the brand statically on the class, immutable and hidden', () => {
      // the brand is a static property on the class, so it is read off the class...
      const classDescriptor = Object.getOwnPropertyDescriptor(
        HelpfulError,
        MARK_AS_HELPFUL_ERROR,
      );
      expect(classDescriptor?.value).toEqual(version);
      // ...and it is locked down: non-enumerable so it never leaks into enumeration,
      // non-writable + non-configurable so no caller can overwrite or delete the brand
      // and silently defeat cross-copy detection (the same discipline as `original`)
      expect(classDescriptor?.enumerable).toEqual(false);
      expect(classDescriptor?.writable).toEqual(false);
      expect(classDescriptor?.configurable).toEqual(false);

      // and the brand is never stamped onto the instance itself, so it cannot pollute
      // instance enumeration or serialization (it reaches instances via the constructor)
      const error = new HelpfulError('boom');
      const instanceDescriptor = Object.getOwnPropertyDescriptor(
        error,
        MARK_AS_HELPFUL_ERROR,
      );
      expect(instanceDescriptor).toBeUndefined();
    });

    it('should not leak the brand into JSON serialization', () => {
      const error = new HelpfulError('boom', { data: 'value' });
      const parsed = JSON.parse(JSON.stringify(error));
      // the brand is a symbol key → never serialized as a string key
      expect(Object.getOwnPropertySymbols(parsed)).toEqual([]);
      expect(Object.keys(parsed)).not.toContain('helpful-errors');
      // the stamped version value must not appear as a serialized key/value
      expect(Object.values(parsed)).not.toContain(version);
    });

    it('should not add enumerable own keys for the brand', () => {
      const error = new HelpfulError('boom');
      expect(Object.keys(error)).toEqual([]);
    });
  });
});
