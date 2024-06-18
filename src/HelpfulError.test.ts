import { HelpfulError } from './HelpfulError';
import { getError } from './getError';

describe('HelpfulError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new HelpfulError('the dogs were let out', {
      who: 'your mom', // 🙄😂
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
        customerOne.phone ?? HelpfulError.throw('phone one not found!');

      // but this case should throw
      const customerTwo: { phone: string | null } = {
        phone: null,
      };
      const phoneTwo =
        customerTwo.phone ?? HelpfulError.throw('phone two not found!');
    });
    expect(error).toBeInstanceOf(HelpfulError);
    expect(error.message).toEqual('phone two not found!');
  });
  it('should be possible to extend the call stack of an error via cause', () => {
    const errorOriginal = new Error('some original error');
    const errorHelpful = new HelpfulError('some helpful error', {
      cause: errorOriginal,
    });
    expect(errorHelpful).toMatchSnapshot();
    expect(errorHelpful.cause).toBeDefined();
    expect(errorHelpful.cause).toMatchSnapshot();
  });
});
