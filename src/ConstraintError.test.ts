import { BadRequestError } from './BadRequestError';
import { ConstraintError } from './ConstraintError';
import { getError } from './getError';
import { HelpfulError } from './HelpfulError';

describe('ConstraintError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new ConstraintError('email must be valid', {
      email: 'invalid',
    });
    expect(error).toMatchSnapshot();
  });

  it('should be throwable in a ternary conveniently and precisely', () => {
    const error = getError(() => {
      const customer: { phone: string | null } = {
        phone: null,
      };
      const phone =
        customer.phone ?? ConstraintError.throw('phone is required');
    });
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error.message).toContain('phone is required');
  });

  describe('instanceof', () => {
    it('should be instanceof ConstraintError', () => {
      const error = new ConstraintError('test');
      expect(error).toBeInstanceOf(ConstraintError);
    });

    it('should be instanceof BadRequestError', () => {
      const error = new ConstraintError('test');
      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should be instanceof HelpfulError', () => {
      const error = new ConstraintError('test');
      expect(error).toBeInstanceOf(HelpfulError);
    });

    it('should be instanceof Error', () => {
      const error = new ConstraintError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('code', () => {
    it('should have static code = { http: 400, exit: 2 }', () => {
      expect(ConstraintError.code).toEqual({ http: 400, exit: 2 });
    });

    it('should have instance.code.http as 400', () => {
      const error = new ConstraintError('test error');
      expect(error.code?.http).toEqual(400);
    });

    it('should have instance.code.exit as 2', () => {
      const error = new ConstraintError('test error');
      expect(error.code?.exit).toEqual(2);
    });

    it('should allow instance to override with slug', () => {
      const error = new ConstraintError('test error', {
        code: { slug: 'INVALID_EMAIL' },
      });
      expect(error.code).toEqual({ http: 400, exit: 2, slug: 'INVALID_EMAIL' });
    });
  });

  describe('emoji', () => {
    it('should have static emoji = "✋"', () => {
      expect(ConstraintError.emoji).toEqual('✋');
    });
  });

  describe('subclass prefix', () => {
    it('should use subclass name in error prefix', () => {
      class ValidationError extends ConstraintError {}
      const error = new ValidationError('field is invalid');
      expect(error.message).toContain('ValidationError:');
      expect(error.message).not.toContain('ConstraintError:');
    });

    it('should maintain instanceof chain for subclass', () => {
      class ValidationError extends ConstraintError {}
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(ConstraintError);
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error).toBeInstanceOf(HelpfulError);
    });
  });

  describe('typed metadata generic', () => {
    it('should support typed metadata via generic', () => {
      class TypedConstraint extends ConstraintError<{ field: string }> {}
      const error = new TypedConstraint('invalid input', { field: 'email' });

      expect(error.metadata?.field).toEqual('email');
      expect(error).toBeInstanceOf(ConstraintError);
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('serialization', () => {
    it('should serialize to json expressively', () => {
      const error = new ConstraintError('validation failed', {
        field: 'email',
        value: 'not-an-email',
      });
      expect(JSON.stringify(error, null, 2)).toMatchSnapshot();
    });

    it('should include code in serialization when slug is present', () => {
      const error = new ConstraintError('rate limit exceeded', {
        code: { slug: 'RATE_LIMITED' },
      });
      expect(JSON.stringify(error, null, 2)).toMatchSnapshot();
    });
  });
});
