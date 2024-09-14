import { HelpfulError } from './HelpfulError';
import { getError } from './getError';
import { getEnvOptions } from './utils/env';

jest.mock('./utils/env');
const getEnvOptionsMock = getEnvOptions as jest.Mock;
getEnvOptionsMock.mockReturnValue({ expand: false });

describe('HelpfulError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new HelpfulError('could not get joke about paper', {
      why: 'it was tearable', // 😂
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
  it('should be able to prettify the error metadata when ERROR_EXPAND env var is true', () => {
    getEnvOptionsMock.mockReturnValueOnce({ expand: true });
    const error = new HelpfulError('could not get joke about pizza', {
      why: 'it was too cheesy', // 😂
    });
    expect(error).toMatchSnapshot();
  });
  it('should serialize to json expressively', () => {
    const error = new HelpfulError('could not get joke about pizza', {
      why: 'it was too cheesy', // 😂
    });
    const json = JSON.stringify(error);
    expect(json).toContain('joke about pizza');
    expect(json).toContain('it was too cheesy');
  });
});
