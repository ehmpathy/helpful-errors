import { UnexpectedCodePathError } from './UnexpectedCodePathError';

describe('UnexpectedCodePathError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new UnexpectedCodePathError('no tires on the vehicle', {
      tires: [],
    });
    expect(error).toMatchSnapshot();
  });
});
