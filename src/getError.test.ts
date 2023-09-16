import { HelpfulError } from './HelpfulError';
import { getError } from './getError';

describe('getError', () => {
  it('can get error from synchronous logic', () => {
    const doSomething: () => void = () => {
      throw new HelpfulError('found me');
    };
    const error = getError(() => doSomething());
    expect(error).toBeInstanceOf(HelpfulError);
    expect(error.message).toContain('found me');
  });
  it('can get error from asynchronous logic', async () => {
    const doSomething = async () => {
      throw new HelpfulError('found me');
    };
    const error = await getError(() => doSomething());
    expect(error).toBeInstanceOf(HelpfulError);
    expect(error.message).toContain('found me');
  });
  it('can get error from promise', async () => {
    const doSomething = async () => {
      throw new HelpfulError('found me');
    };
    const error = await getError(doSomething());
    expect(error).toBeInstanceOf(HelpfulError);
    expect(error.message).toContain('found me');
  });
});
