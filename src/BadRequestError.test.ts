import { BadRequestError } from './BadRequestError';
import { getError } from './getError';

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
});
