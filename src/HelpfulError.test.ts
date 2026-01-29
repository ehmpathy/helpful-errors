import { getError } from './getError';
import { HelpfulError, type HelpfulErrorMetadata } from './HelpfulError';
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
  describe('original', () => {
    it('should not include the original property in JSON serialization', () => {
      const error = new HelpfulError('test error', {
        data: 'metadata',
      });
      const json = JSON.stringify(error);
      expect(json).not.toContain('original');
    });
    it('should not enumerate the original property', () => {
      const error = new HelpfulError('test error', {
        data: 'metadata',
      });
      const keys = Object.keys(error);
      expect(keys).not.toContain('original');
    });
    it('should still allow internal access to the original property', () => {
      const originalError = new Error('cause');
      const error = new HelpfulError('test error', {
        data: 'metadata',
        cause: originalError,
      });
      // The redact method uses the original property internally
      const redacted = error.redact(['metadata']);
      expect(redacted.message).toBe('test error');
      expect(redacted.cause).toBe(originalError);
    });
  });
  describe('wrap', () => {
    describe('sync logic', () => {
      it('should wrap a synchronous procedure withHelpfulError', async () => {
        const logic = () => {
          throw new Error('original error');
        };
        const wrapped = HelpfulError.wrap(logic, {
          message: 'could not execute',
          metadata: { context: 'test' },
        });

        const error = await getError(() => wrapped());
        expect(error).toBeInstanceOf(HelpfulError);
        expect(error.message).toContain('could not execute');
        expect(error.message).toContain('context');
        expect((error.cause as Error).message).toBe('original error');
      });

      it('should return the result when sync function succeeds', () => {
        const logic = (x: number) => x * 2;
        const wrapped = HelpfulError.wrap(logic, {
          message: 'could not multiply',
          metadata: { operation: 'multiply' },
        });

        const result = wrapped(5);
        expect(result).toBe(10);
      });
    });

    describe('async logic', () => {
      it('should wrap an async procedure withHelpfulError', async () => {
        const logic = async () => {
          throw new Error('async error');
        };
        const wrapped = HelpfulError.wrap(logic, {
          message: 'could not process async',
          metadata: { context: 'async-test' },
        });

        const error = await getError(wrapped());
        expect(error).toBeInstanceOf(HelpfulError);
        expect(error.message).toContain('could not process async');
        expect(error.message).toContain('async-test');
        expect((error.cause as Error).message).toBe('async error');
      });

      it('should return the result when async function succeeds', async () => {
        const logic = async (value: number) => {
          return value * 2;
        };
        const wrapped = HelpfulError.wrap(logic, {
          message: 'could not process',
          metadata: { operation: 'double' },
        });

        const result = await wrapped(5);
        expect(result).toBe(10);
      });
    });

    it('should use the correct error variant when called on a subclass', async () => {
      class CustomError extends HelpfulError {
        constructor(message: string, metadata?: HelpfulErrorMetadata) {
          super(['CustomError: ', message].join(''), metadata);
        }
      }

      const logic = () => {
        throw new Error('bad input');
      };
      const wrapped = CustomError.wrap(logic, {
        message: 'validation failed',
        metadata: { field: 'email' },
      });

      const error = await getError(() => wrapped());
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toContain('CustomError');
      expect(error.message).toContain('validation failed');
    });
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
  describe('metadata', () => {
    it('should return the metadata passed to the error', () => {
      const error = new HelpfulError('test error', {
        userId: 123,
        action: 'test',
      });
      expect(error.metadata).toEqual({
        userId: 123,
        action: 'test',
      });
    });

    it('should return undefined when no metadata is passed', () => {
      const error = new HelpfulError('test error');
      expect(error.metadata).toBeUndefined();
    });

    it('should not include metadata in Object.keys enumeration', () => {
      const error = new HelpfulError('test error', { data: 'value' });
      const keys = Object.keys(error);
      expect(keys).not.toContain('metadata');
    });

    it('should not cause redundant serialization in JSON.stringify', () => {
      const error = new HelpfulError('test error', { data: 'value' });
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);
      expect(parsed.metadata).toBeUndefined();
      expect(json).toContain('data');
      expect(json).toContain('value');
    });
  });
  describe('typed metadata generic', () => {
    it('should constrain metadata input to match TMetadata', () => {
      class TypedError extends HelpfulError<{ foo: string; bar: number }> {}

      // valid metadata compiles and works
      const error = new TypedError('test', { foo: 'hello', bar: 42 });
      expect(error.metadata?.foo).toEqual('hello');
      expect(error.metadata?.bar).toEqual(42);

      // @ts-expect-error - wrong key should fail
      new TypedError('test', { wrong: 'key' });

      // @ts-expect-error - wrong type should fail
      new TypedError('test', { foo: 123, bar: 42 });
    });

    it('should provide typed access to metadata properties', () => {
      class TypedError extends HelpfulError<{ items: string[] }> {}
      const error = new TypedError('test', { items: ['a', 'b'] });

      // typescript should infer items as string[]
      const items = error.metadata?.items;
      expect(items).toEqual(['a', 'b']);

      // @ts-expect-error - nonexistent property should fail
      error.metadata?.nonexistent;
    });

    it('should work with nested typed metadata', () => {
      class TypedError extends HelpfulError<{
        options: { repl: string[]; atom: string[] };
      }> {}
      const error = new TypedError('test', {
        options: { repl: ['a', 'b'], atom: [] },
      });

      expect(error.metadata?.options.repl).toEqual(['a', 'b']);
      expect(error.metadata?.options.atom).toEqual([]);
    });

    it('should constrain metadata on static throw method', () => {
      class TypedError extends HelpfulError<{ reason: string }> {}

      // use getError to catch the thrown error; @ts-expect-error proves type constraint
      const error = getError(() => {
        // @ts-expect-error - wrong key should fail on throw
        TypedError.throw('error', { wrong: 'key' });
      });
      expect(error).toBeInstanceOf(TypedError);
    });
  });
  describe('backwards compatibility', () => {
    it('should work without generic type parameter', () => {
      const error = new HelpfulError('test', { any: 'metadata' });
      expect(error.metadata).toEqual({ any: 'metadata' });
      expect(error.message).toContain('any');
    });

    it('should allow cause in metadata without generic', () => {
      const cause = new Error('root');
      const error = new HelpfulError('test', { cause, extra: 'data' });
      expect(error.cause).toBe(cause);
      expect(error.metadata?.extra).toEqual('data');
    });

    it('should allow metadata to be omitted for default type', () => {
      // backwards compat - metadata optional with default type
      const error = new HelpfulError('test');
      expect(error.metadata).toBeUndefined();
    });
  });
  describe('conditional metadata requirement', () => {
    it('should require metadata when TMetadata is specific', () => {
      class TypedError extends HelpfulError<{ items: string[] }> {}

      // @ts-expect-error - metadata should be required for specific types
      new TypedError('test');

      // this should work - metadata provided
      const error = new TypedError('test', { items: ['a'] });
      expect(error.metadata.items).toEqual(['a']);
    });

    it('should not need optional chain on metadata when type is specific', () => {
      class TypedError extends HelpfulError<{ items: string[] }> {}
      const error = new TypedError('test', { items: ['a', 'b'] });

      // metadata should be defined when specific type is provided
      const items: string[] = error.metadata.items;
      expect(items).toEqual(['a', 'b']);
    });

    it('should require metadata on static throw for specific types', () => {
      class TypedError extends HelpfulError<{ reason: string }> {}

      // @ts-expect-error - metadata should be required on throw for specific types
      const error = getError(() => TypedError.throw('error'));
      expect(error).toBeInstanceOf(TypedError);
    });
  });
});
