import { getError } from './getError';
import { HelpfulError } from './HelpfulError';
import { MalfunctionError } from './MalfunctionError';
import { UnexpectedCodePathError } from './UnexpectedCodePathError';

describe('MalfunctionError', () => {
  it('should produce a helpful, observable error message', () => {
    const error = new MalfunctionError('database connection lost', {
      stage: 'prod',
    });
    expect(error).toMatchSnapshot();
  });

  it('should be throwable in a ternary conveniently and precisely', () => {
    const error = getError(() => {
      const config: { apiKey: string | null } = {
        apiKey: null,
      };
      const apiKey =
        config.apiKey ?? MalfunctionError.throw('config not loaded');
    });
    expect(error).toBeInstanceOf(MalfunctionError);
    expect(error.message).toContain('config not loaded');
  });

  describe('instanceof', () => {
    it('should be instanceof MalfunctionError', () => {
      const error = new MalfunctionError('test');
      expect(error).toBeInstanceOf(MalfunctionError);
    });

    it('should be instanceof UnexpectedCodePathError', () => {
      const error = new MalfunctionError('test');
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
    });

    it('should be instanceof HelpfulError', () => {
      const error = new MalfunctionError('test');
      expect(error).toBeInstanceOf(HelpfulError);
    });

    it('should be instanceof Error', () => {
      const error = new MalfunctionError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('code', () => {
    it('should have static code = { http: 500, exit: 1 }', () => {
      expect(MalfunctionError.code).toEqual({ http: 500, exit: 1 });
    });

    it('should have instance.code.http as 500', () => {
      const error = new MalfunctionError('test error');
      expect(error.code?.http).toEqual(500);
    });

    it('should have instance.code.exit as 1', () => {
      const error = new MalfunctionError('test error');
      expect(error.code?.exit).toEqual(1);
    });

    it('should allow instance to override with slug', () => {
      const error = new MalfunctionError('test error', {
        code: { slug: 'DB_CONN_LOST' },
      });
      expect(error.code).toEqual({ http: 500, exit: 1, slug: 'DB_CONN_LOST' });
    });
  });

  describe('emoji', () => {
    it('should have static emoji = "💥"', () => {
      expect(MalfunctionError.emoji).toEqual('💥');
    });
  });

  describe('subclass prefix', () => {
    it('should use subclass name in error prefix', () => {
      class DatabaseError extends MalfunctionError {}
      const error = new DatabaseError('connection lost');
      expect(error.message).toContain('DatabaseError:');
      expect(error.message).not.toContain('MalfunctionError:');
    });

    it('should maintain instanceof chain for subclass', () => {
      class DatabaseError extends MalfunctionError {}
      const error = new DatabaseError('test');
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(MalfunctionError);
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
      expect(error).toBeInstanceOf(HelpfulError);
    });
  });

  describe('typed metadata generic', () => {
    it('should support typed metadata via generic', () => {
      class TypedMalfunction extends MalfunctionError<{ service: string }> {}
      const error = new TypedMalfunction('service down', { service: 'api' });

      expect(error.metadata?.service).toEqual('api');
      expect(error).toBeInstanceOf(MalfunctionError);
      expect(error).toBeInstanceOf(UnexpectedCodePathError);
    });
  });

  describe('serialization', () => {
    it('should serialize to json expressively', () => {
      const error = new MalfunctionError('unexpected state', {
        component: 'database',
        state: 'disconnected',
      });
      expect(JSON.stringify(error, null, 2)).toMatchSnapshot();
    });

    it('should include code in serialization when slug is present', () => {
      const error = new MalfunctionError('database connection lost', {
        code: { slug: 'DB_CONN_LOST' },
      });
      expect(JSON.stringify(error, null, 2)).toMatchSnapshot();
    });
  });
});
