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
  describe('redact', () => {
    describe('generally', () => {
      it('should return a new instance (clone), not the same instance', () => {
        const original = new HelpfulError('something went wrong', {
          sensitive: 'data',
        });
        const redacted = original.redact(['metadata']);

        expect(redacted).not.toBe(original);
        expect(redacted).toBeInstanceOf(HelpfulError);
      });
    });
    describe('input=["metadata"]', () => {
      it('should redact only metadata when ["metadata"] is specified', () => {
        const original = new HelpfulError('payment failed', {
          cardNumber: '1234-5678',
          amount: 100,
        });
        const redacted = original.redact(['metadata']);

        // the redacted error should only have the original message
        expect(redacted.message).toEqual('payment failed');
        expect(redacted.message).not.toContain('cardNumber');
        expect(redacted.message).not.toContain('1234-5678');
        expect(redacted.message).not.toContain('amount');
        expect(redacted).toMatchSnapshot();
      });
      it('should retain the cause when only redacting metadata', () => {
        const rootCause = new Error('root cause error');
        const original = new HelpfulError('wrapped error', {
          cause: rootCause,
          sensitiveData: 'secret',
        });
        const redacted = original.redact(['metadata']);

        // should have the message without metadata
        expect(redacted.message).toEqual('wrapped error');
        expect(redacted.message).not.toContain('sensitiveData');
        expect(redacted.message).not.toContain('secret');

        // but should retain the cause
        expect(redacted.cause).toBe(rootCause);
        expect(redacted.cause).toBeInstanceOf(Error);
      });
      it('should work with errors that have no metadata', () => {
        const original = new HelpfulError('simple error');
        const redacted = original.redact(['metadata']);

        expect(redacted.message).toEqual('simple error');
        expect(redacted).not.toBe(original);
      });
      it('should work with expanded metadata format', () => {
        getEnvOptionsMock.mockReturnValueOnce({ expand: true });
        const original = new HelpfulError('error with expanded metadata', {
          userId: 123,
          action: 'delete',
        });
        const redacted = original.redact(['metadata']);

        expect(redacted.message).toEqual('error with expanded metadata');
        expect(redacted.message).not.toContain('userId');
        expect(redacted.message).not.toContain('123');
        expect(redacted).toMatchSnapshot();
      });
    });
    describe('input=["cause"]', () => {
      it('should redact only cause when ["cause"] is specified', () => {
        const rootCause = new Error('root cause error');
        const original = new HelpfulError('wrapped error', {
          cause: rootCause,
          userId: 123,
        });
        const redacted = original.redact(['cause']);

        // should have the message with metadata
        expect(redacted.message).toContain('wrapped error');
        expect(redacted.message).toContain('userId');
        expect(redacted.message).toContain('123');

        // but should NOT have the cause
        expect(redacted.cause).toBeUndefined();
        expect(redacted).toMatchSnapshot();
      });
    });
    describe('input=["metadata", "cause"]', () => {
      it('should redact both metadata and cause when both, ["metadata", "cause"], are specified', () => {
        const rootCause = new Error('root cause error');
        const original = new HelpfulError('wrapped error', {
          cause: rootCause,
          sensitiveData: 'secret',
        });
        const redacted = original.redact(['metadata', 'cause']);

        // should have only the message
        expect(redacted.message).toEqual('wrapped error');
        expect(redacted.message).not.toContain('sensitiveData');
        expect(redacted.message).not.toContain('secret');

        // and should NOT have the cause
        expect(redacted.cause).toBeUndefined();
        expect(redacted).toMatchSnapshot();
      });
    });
  });
});
