import { HelpfulError } from './HelpfulError';

/**
 * .what = wrap a procedure withHelpfulError
 * .why = get a more observable error around any given chunk of logic, upon failure
 */
export function withHelpfulError<
  TLogic extends (...args: any[]) => Promise<any>,
>(
  logic: TLogic,
  options: {
    variant?: typeof HelpfulError;
    message: string;
    metadata: Record<string, any>;
  },
): TLogic;
export function withHelpfulError<TLogic extends (...args: any[]) => any>(
  logic: TLogic,
  options: {
    variant?: typeof HelpfulError;
    message: string;
    metadata: Record<string, any>;
  },
): TLogic;
export function withHelpfulError<TLogic extends (...args: any[]) => any>(
  logic: TLogic,
  options: {
    variant?: typeof HelpfulError;
    message: string;
    metadata: Record<string, any>;
  },
): TLogic {
  const Constructor = options.variant ?? HelpfulError;
  const wrapped = (...args: Parameters<TLogic>): ReturnType<TLogic> => {
    try {
      const result = logic(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          if (!(error instanceof Error)) throw error;
          throw new Constructor(options.message, {
            ...options.metadata,
            cause: error,
          });
        }) as ReturnType<TLogic>;
      }
      return result;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new Constructor(options.message, {
        ...options.metadata,
        cause: error,
      });
    }
  };
  return wrapped as TLogic;
}
