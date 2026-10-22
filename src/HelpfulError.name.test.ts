import { BadRequestError } from './BadRequestError';
import { ConstraintError } from './ConstraintError';
import { HelpfulError, type HelpfulErrorMetadata } from './HelpfulError';
import { isHelpfulError } from './isHelpfulError';
import { MalfunctionError } from './MalfunctionError';
import { UnexpectedCodePathError } from './UnexpectedCodePathError';

/**
 * .what = clamps the invariant that HelpfulError never touches error.name
 * .why =
 *   - the class already leads the message (`✋ ConstraintError: …`), so a set name only repeats it
 *   - callers tell the class via instanceof or isHelpfulError, never via name
 *   - the rule and its reasons: .agent/repo=.this/role=any/briefs/rule.forbid.error-name-override.md
 */

/**
 * .what = a consumer-declared subclass
 * .why = proves the invariant holds for subclasses no one in this repo wrote
 */
class QuoteExpiredError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends ConstraintError<TMetadata> {}

const TEST_CASES: { description: string; Variant: typeof HelpfulError }[] = [
  { description: 'HelpfulError', Variant: HelpfulError },
  { description: 'ConstraintError', Variant: ConstraintError },
  { description: 'MalfunctionError', Variant: MalfunctionError },
  { description: 'BadRequestError', Variant: BadRequestError },
  { description: 'UnexpectedCodePathError', Variant: UnexpectedCodePathError },
  { description: 'a consumer subclass', Variant: QuoteExpiredError },
];

describe('HelpfulError.name', () => {
  describe('is never touched', () => {
    TEST_CASES.map((thisCase) =>
      describe(thisCase.description, () => {
        it('should leave name as the native Error', () => {
          const error = new thisCase.Variant('quote lacks provider');
          expect(error.name).toEqual('Error');
        });

        it('should define no own name on the instance', () => {
          const error = new thisCase.Variant('quote lacks provider');
          expect(Object.getOwnPropertyNames(error)).not.toContain('name');
        });

        it('should define no name on the class prototype', () => {
          expect(
            Object.getOwnPropertyNames(thisCase.Variant.prototype),
          ).not.toContain('name');
        });

        it('should keep name out of json output', () => {
          const error = new thisCase.Variant('quote lacks provider');
          expect(JSON.parse(JSON.stringify(error))).not.toHaveProperty('name');
        });
      }),
    );
  });

  describe('the class is told another way', () => {
    it('should carry the class in the message prefix', () => {
      const error = new ConstraintError('quote lacks provider');
      expect(error.message).toEqual('✋ ConstraintError: quote lacks provider');
    });

    it('should be detectable via instanceof and isHelpfulError', () => {
      const error = new QuoteExpiredError('quote expired');
      expect(error).toBeInstanceOf(QuoteExpiredError);
      expect(error).toBeInstanceOf(ConstraintError);
      expect(isHelpfulError(error)).toBe(true);
    });
  });
});
