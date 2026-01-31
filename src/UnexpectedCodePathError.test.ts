import { getError } from './getError';
import { HelpfulError } from './HelpfulError';
import { UnexpectedCodePathError } from './UnexpectedCodePathError';

describe('UnexpectedCodePathError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new UnexpectedCodePathError('no tires on the vehicle', {
      tires: [],
    });
    expect(error).toMatchSnapshot();
  });
  it('should be throwable in a ternary conveniently and precisely', () => {
    const error = getError(() => {
      // this case should not throw
      const customerOne: { phone: string | null } = {
        phone: 'yes',
      };
      const phoneOne =
        customerOne.phone ??
        UnexpectedCodePathError.throw('phone one not found!');

      // but this case should throw
      const customerTwo: { phone: string | null } = {
        phone: null,
      };
      const phoneTwo =
        customerTwo.phone ??
        UnexpectedCodePathError.throw('phone two not found!');
    });
    expect(error).toBeInstanceOf(UnexpectedCodePathError);
    expect(error.message).toContain('phone two not found!');
  });
  describe('typed metadata generic', () => {
    it('should support typed metadata via generic', () => {
      class TypedUnexpected extends UnexpectedCodePathError<{
        field: string;
      }> {}
      const error = new TypedUnexpected('unexpected state', {
        field: 'status',
      });

      expect(error.metadata?.field).toEqual('status');
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
      expect(error).toBeInstanceOf(HelpfulError);
    });

    it('should constrain metadata input', () => {
      class TypedUnexpected extends UnexpectedCodePathError<{
        field: string;
      }> {}

      // @ts-expect-error - wrong key
      new TypedUnexpected('error', { wrong: 'key' });
    });
  });
  describe('code', () => {
    it('should have static code = { http: 500 }', () => {
      expect(UnexpectedCodePathError.code).toEqual({ http: 500 });
    });

    it('should have instance.code.http as 500', () => {
      const error = new UnexpectedCodePathError('test error');
      expect(error.code?.http).toEqual(500);
    });

    it('should have instance.code.slug as undefined by default', () => {
      const error = new UnexpectedCodePathError('test error');
      expect(error.code?.slug).toBeUndefined();
    });

    it('should allow instance to override with slug', () => {
      const error = new UnexpectedCodePathError('test error', {
        code: { slug: 'IMPOSSIBLE:STATE' },
      });
      expect(error.code).toEqual({ http: 500, slug: 'IMPOSSIBLE:STATE' });
    });

    it('should omit code from toJSON (no slug by default)', () => {
      const error = new UnexpectedCodePathError('test error');
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);
      expect(parsed.code).toBeUndefined();
    });
  });
});
