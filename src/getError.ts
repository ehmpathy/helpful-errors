import { isAFunction, isAPromise } from 'type-fns';

import { HelpfulError } from './HelpfulError';

export class NoErrorThrownError extends HelpfulError {
  constructor() {
    super('no error was thrown');
  }
}

/**
 * a method which returns the error thrown from executing the logic passed into it
 *
 * usecases
 * - testing that a some logic throws an error
 *
 * note
 * - uses type overloading, so if you pass in a promise or async function, you'll be given a promise; otherwise, sync
 */
export function getError<T = Error>(
  from: () => Promise<unknown>,
): Promise<T | NoErrorThrownError>;
export function getError<T = Error>(
  from: Promise<unknown>,
): Promise<T | NoErrorThrownError>;
export function getError<T = Error>(
  from: () => unknown,
): T | NoErrorThrownError;
export function getError<T = Error>(
  from: Promise<unknown> | (() => Promise<unknown>) | (() => unknown),
) {
  // run everything in a try catch, to handle the case where the function throws an error immediately (does not return a promise)
  try {
    // execute the function to get the result, if its a function
    const result = isAFunction(from) ? from() : from;

    // handle the result = promise case
    if (isAPromise(result))
      return result
        .then(() => {
          throw new NoErrorThrownError();
        })
        .catch((error) => error as T | NoErrorThrownError);

    // handle the result = nonpromise case
    throw new NoErrorThrownError(); // should have never reached here, as it should have thrown when we first called it
  } catch (error: unknown) {
    return error as T;
  }
}
