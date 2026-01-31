import { BadRequestError } from './BadRequestError';
import { getError } from './getError';
import { HelpfulError } from './HelpfulError';

describe('BadRequestError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new BadRequestError('no tires on the vehicle', {
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
        customerOne.phone ?? BadRequestError.throw('phone one not found!');

      // but this case should throw
      const customerTwo: { phone: string | null } = {
        phone: null,
      };
      const phoneTwo =
        customerTwo.phone ?? BadRequestError.throw('phone two not found!');
    });
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toContain('phone two not found!');
  });
  describe('typed metadata generic', () => {
    it('should support typed metadata via generic', () => {
      class TypedBadRequest extends BadRequestError<{ field: string }> {}
      const error = new TypedBadRequest('invalid input', { field: 'email' });

      expect(error.metadata?.field).toEqual('email');
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error).toBeInstanceOf(HelpfulError);
    });

    it('should constrain metadata input', () => {
      class TypedBadRequest extends BadRequestError<{ field: string }> {}

      // @ts-expect-error - wrong key
      new TypedBadRequest('error', { wrong: 'key' });
    });
  });
  describe('code', () => {
    it('should have static code = { http: 400 }', () => {
      expect(BadRequestError.code).toEqual({ http: 400 });
    });

    it('should have instance.code.http as 400', () => {
      const error = new BadRequestError('test error');
      expect(error.code?.http).toEqual(400);
    });

    it('should have instance.code.slug as undefined by default', () => {
      const error = new BadRequestError('test error');
      expect(error.code?.slug).toBeUndefined();
    });

    it('should allow instance to override with slug', () => {
      const error = new BadRequestError('test error', {
        code: { slug: 'VALIDATION' },
      });
      expect(error.code).toEqual({ http: 400, slug: 'VALIDATION' });
    });

    it('should allow instance to override http', () => {
      const error = new BadRequestError('test error', {
        code: { http: 422, slug: 'UNPROCESSABLE' },
      });
      expect(error.code).toEqual({ http: 422, slug: 'UNPROCESSABLE' });
    });

    it('should omit code from toJSON (no slug by default)', () => {
      const error = new BadRequestError('test error');
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);
      expect(parsed.code).toBeUndefined();
    });

    it('should include code in toJSON when slug supplied', () => {
      const error = new BadRequestError('test error', {
        code: { slug: 'DUPLICATE_EMAIL' },
      });
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);
      expect(parsed.code).toEqual({ http: 400, slug: 'DUPLICATE_EMAIL' });
    });
  });
});
