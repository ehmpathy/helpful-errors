import { getError } from './getError';
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
});
