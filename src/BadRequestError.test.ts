import { BadRequestError } from './BadRequestError';

describe('BadRequestError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new BadRequestError('no tires on the vehicle', {
      tires: [],
    });
    expect(error).toMatchSnapshot();
  });
});
