import { BadRequestError } from './BadRequestError';
import { HelpfulError } from './HelpfulError';
import { getError } from './getError';
import { withHelpfulError } from './withHelpfulError';

describe('withHelpfulError', () => {
  it('should return the result when the wrapped function succeeds', () => {
    const logic = (a: number, b: number) => a + b;
    const wrappedLogic = withHelpfulError(logic, {
      message: 'could not add numbers',
      metadata: { operation: 'addition' },
    });

    const result = wrappedLogic(2, 3);
    expect(result).toBe(5);
  });

  it('should wrap errors with a HelpfulError and preserve original error as cause', async () => {
    const originalError = new Error('database connection failed');
    const logic = () => {
      throw originalError;
    };
    const wrappedLogic = withHelpfulError(logic, {
      message: 'could not fetch user',
      metadata: { userId: 123 },
    });

    const error = await getError(() => wrappedLogic());
    expect(error).toBeInstanceOf(HelpfulError);
    expect(error.message).toContain('could not fetch user');
    expect(error.message).toContain('userId');
    expect(error.cause).toBe(originalError);
  });

  it('should pass through non-Error throws unchanged', () => {
    const logic = () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 'string error';
    };
    const wrappedLogic = withHelpfulError(logic, {
      message: 'could not execute',
      metadata: {},
    });

    expect(() => wrappedLogic()).toThrow('string error');
  });

  it('should use custom error variant when specified', async () => {
    const logic = () => {
      throw new Error('invalid input');
    };
    const wrappedLogic = withHelpfulError(logic, {
      variant: BadRequestError,
      message: 'request validation failed',
      metadata: { field: 'email' },
    });

    const error = await getError(() => wrappedLogic());
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toContain('BadRequestError');
    expect(error.message).toContain('request validation failed');
  });

  it('should work with async functions', async () => {
    const logic = async (value: number) => {
      if (value < 0) throw new Error('negative value');
      return value * 2;
    };
    const wrappedLogic = withHelpfulError(logic, {
      message: 'could not double value',
      metadata: { operation: 'double' },
    });

    const result = await wrappedLogic(5);
    expect(result).toBe(10);

    const error = await getError(wrappedLogic(-1));
    expect(error).toBeInstanceOf(HelpfulError);
    expect(error.message).toContain('could not double value');
    expect((error.cause as Error).message).toBe('negative value');
  });
});
