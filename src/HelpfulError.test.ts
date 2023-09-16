import { HelpfulError } from './HelpfulError';

describe('HelpfulError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new HelpfulError('the dogs were let out', {
      who: 'your mom',
    });
    expect(error).toMatchSnapshot();
  });
});
