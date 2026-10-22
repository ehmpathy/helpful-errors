import { BadRequestError } from './BadRequestError';
import { ConstraintError } from './ConstraintError';
import { getError } from './getError';
import { HelpfulError, type HelpfulErrorMetadata } from './HelpfulError';
import { isHelpfulError } from './isHelpfulError';
import { MalfunctionError } from './MalfunctionError';
import { UnexpectedCodePathError } from './UnexpectedCodePathError';

/**
 * .what = a consumer-declared subclass of a caller-fault class
 * .why = proves the name tracks any subclass, not only the built-ins
 */
class QuoteExpiredError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends ConstraintError<TMetadata> {}

/**
 * .what = a consumer-declared subclass of the base class
 * .why = proves the server-fault lineage names itself too
 */
class QuoteLookupError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends HelpfulError<TMetadata> {}

/**
 * .what = a consumer subclass that assigns its own name after super()
 * .why = proves the name descriptor stays writable for overrides
 */
class AssignedNameError extends ConstraintError {
  constructor(message: string) {
    super(message);
    this.name = 'CustomAssignedName';
  }
}

/**
 * .what = a consumer subclass that redefines its name the way a class field does under define semantics
 * .why = proves the name descriptor stays configurable (`useDefineForClassFields` emits defineProperty, not assignment)
 */
class DefinedNameError extends ConstraintError {
  constructor(message: string) {
    super(message);
    Object.defineProperty(this, 'name', {
      value: 'CustomDefinedName',
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * .what = a consumer subclass that names itself on its prototype, a common legacy pattern
 * .why = proves a prototype-level name wins over the inherited class-name accessor
 */
class PrototypeNameError extends ConstraintError {}
PrototypeNameError.prototype.name = 'E_QUOTE_EXPIRED';

/**
 * .what = a consumer subclass that names itself via a getter on its prototype
 * .why = proves a subclass accessor wins over the inherited class-name accessor
 * .note = defined via defineProperty, since a `get name()` member conflicts with Error's `name` property type (TS2611)
 */
class GetterNameError extends ConstraintError {}
Object.defineProperty(GetterNameError.prototype, 'name', {
  get: () => 'E_GETTER',
  enumerable: false,
  configurable: true,
});

/**
 * .what = a consumer subclass whose class name a minifier mangled to `t`
 * .why = proves the message prefix, `.name`, and stack header agree under a mangled name
 */
class MinifiedError extends ConstraintError {}
Object.defineProperty(MinifiedError, 'name', { value: 't' });

/**
 * .what = a mangled consumer subclass that assigns a literal name after super()
 * .why = proves a string literal survives minification where the class name does not
 */
class MinifiedLiteralNameError extends ConstraintError {
  constructor(message: string) {
    super(message);
    this.name = 'QuoteExpiredError';
  }
}
Object.defineProperty(MinifiedLiteralNameError, 'name', { value: 'u' });

/**
 * .what = mimics the aws lambda node runtime's serialization of a thrown error
 * .why = the runtime emits `errorType: error.name`; this is the wire shape a lambda client reads
 * .ref = aws/aws-lambda-nodejs-runtime-interface-client src/Errors.js
 * .note = keeps only the two fields a client classifies on; omits the runtime's `stackTrace` and its `\x7F` escape, which no class name here contains
 */
const asLambdaWireError = (error: Error) => ({
  errorType: error.name,
  errorMessage: error.message,
});

/**
 * .what = every surface that reads an error's name, with the stack masked
 * .why = one snapshot per class shows a reviewer the full rendered contract, not a prefix match
 */
const asNameSurfaces = (error: Error) => ({
  name: error.name,
  string: String(error),
  stackHeader: error.stack?.split('\n')[0],
  json: { ...JSON.parse(JSON.stringify(error)), stack: '[STACK]' },
  wire: asLambdaWireError(error),
});

const TEST_CASES: {
  description: string;
  Variant: typeof HelpfulError;
  name: string;
}[] = [
  {
    description: 'HelpfulError (base)',
    Variant: HelpfulError,
    name: 'HelpfulError',
  },
  {
    description: 'BadRequestError',
    Variant: BadRequestError,
    name: 'BadRequestError',
  },
  {
    description: 'ConstraintError',
    Variant: ConstraintError,
    name: 'ConstraintError',
  },
  {
    description: 'MalfunctionError',
    Variant: MalfunctionError,
    name: 'MalfunctionError',
  },
  {
    description: 'UnexpectedCodePathError',
    Variant: UnexpectedCodePathError,
    name: 'UnexpectedCodePathError',
  },
  {
    description: 'consumer subclass of ConstraintError',
    Variant: QuoteExpiredError,
    name: 'QuoteExpiredError',
  },
  {
    description: 'consumer subclass of HelpfulError',
    Variant: QuoteLookupError,
    name: 'QuoteLookupError',
  },
];

describe('HelpfulError.name', () => {
  describe('carries its own class name', () => {
    TEST_CASES.map((thisCase) =>
      describe(thisCase.description, () => {
        it('should set .name to the class name', () => {
          const error = new thisCase.Variant('quote lacks provider');
          expect(error.name).toEqual(thisCase.name);
        });

        it('should open String(error) with the class name', () => {
          const error = new thisCase.Variant('quote lacks provider');
          expect(String(error).startsWith(`${thisCase.name}: `)).toEqual(true);
        });

        it('should open the stack header with the class name', () => {
          const error = new thisCase.Variant('quote lacks provider');
          expect(error.stack?.startsWith(`${thisCase.name}: `)).toEqual(true);
        });

        it('should render the class name on every surface', () => {
          const error = new thisCase.Variant('quote lacks provider');
          const surfaces = asNameSurfaces(error);
          expect(surfaces.wire.errorType).toEqual(thisCase.name);
          expect(surfaces.json.name).toEqual(thisCase.name);
          expect(surfaces).toMatchSnapshot();
        });

        it('should carry the class name when thrown via .throw()', () => {
          const error = getError((): void => {
            thisCase.Variant.throw('quote lacks provider');
          });
          expect(error.name).toEqual(thisCase.name);
        });

        it('should carry the class name after .redact()', () => {
          const error = new thisCase.Variant('quote lacks provider', {
            quoteUuid: 'q_1',
          });
          expect(error.redact(['metadata']).name).toEqual(thisCase.name);
        });

        it('should carry the class name when produced via .wrap()', async () => {
          const wrapped = thisCase.Variant.wrap(
            async () => {
              throw new Error('db conn lost');
            },
            { message: 'could not get quote', metadata: { quoteUuid: 'q_1' } },
          );
          const error = await getError(wrapped());
          expect(error.name).toEqual(thisCase.name);
        });
      }),
    );
  });

  describe('serialization', () => {
    it('should emit errorType = ConstraintError on the lambda wire shape, for a thrown ConstraintError', () => {
      const handler = (): void => {
        ConstraintError.throw('quote lacks provider');
      };
      const error = getError(handler);
      const wire = JSON.parse(JSON.stringify(asLambdaWireError(error)));
      expect(wire.errorType).toEqual('ConstraintError');
      expect(wire.errorMessage).toContain(
        '✋ ConstraintError: quote lacks provider',
      );
      expect(wire).toMatchSnapshot();
    });

    it('should emit errorType = BadRequestError on the lambda wire shape, for a thrown BadRequestError', () => {
      const error = getError((): void => {
        BadRequestError.throw('bad input');
      });
      expect(asLambdaWireError(error).errorType).toEqual('BadRequestError');
    });

    it('should emit errorType = its own class on the lambda wire shape, for a thrown consumer subclass of ConstraintError', () => {
      const error = getError((): void => {
        QuoteExpiredError.throw('quote expired');
      });
      const wire = JSON.parse(JSON.stringify(asLambdaWireError(error)));
      expect(wire.errorType).toEqual('QuoteExpiredError');
      expect(wire.errorMessage).toContain(
        '✋ QuoteExpiredError: quote expired',
      ); // the inherited caller-fault glyph survives on the wire
      expect(wire).toMatchSnapshot();
    });

    it('should include name in JSON.stringify output', () => {
      const error = new ConstraintError('validation failed');
      expect(JSON.parse(JSON.stringify(error)).name).toEqual('ConstraintError');
    });

    it('should keep name out of Object.keys, like native message and stack', () => {
      const error = new ConstraintError('validation failed', {
        field: 'email',
      });
      expect(Object.keys(error)).not.toContain('name');
    });
  });

  describe('overrides', () => {
    it('should let a subclass assign its own name after super()', () => {
      const error = new AssignedNameError('quote expired');
      expect(error.name).toEqual('CustomAssignedName');
    });

    it('should let a subclass redefine its name, as a define-semantics class field does', () => {
      const error = new DefinedNameError('quote expired');
      expect(error.name).toEqual('CustomDefinedName');
    });

    it('should let a caller assign a name on an instance', () => {
      const error = new ConstraintError('quote expired');
      error.name = 'Renamed'; // .note = deliberate mutation; the reassignment is the subject under test
      expect(error.name).toEqual('Renamed');
    });

    it('should let a subclass name itself on its prototype', () => {
      const error = new PrototypeNameError('quote expired');
      expect(error.name).toEqual('E_QUOTE_EXPIRED');
      expect(asLambdaWireError(error).errorType).toEqual('E_QUOTE_EXPIRED');
      expect(String(error).startsWith('E_QUOTE_EXPIRED: ')).toBe(true);
    });

    it('should let a subclass name itself via a getter', () => {
      const error = new GetterNameError('quote expired');
      expect(error.name).toEqual('E_GETTER');
      expect(asLambdaWireError(error).errorType).toEqual('E_GETTER');
    });
  });

  describe('minified class names', () => {
    it('should agree on the mangled name across name, message prefix, and stack header', () => {
      const error = new MinifiedError('quote expired');
      expect(error.name).toEqual('t');
      expect(error.message).toEqual('✋ t: quote expired');
      expect(asLambdaWireError(error).errorType).toEqual('t');
      expect(error.stack?.startsWith('t: ✋ t: quote expired')).toBe(true);
    });

    it('should keep a literal name assigned after super(), which a minifier leaves intact', () => {
      const error = new MinifiedLiteralNameError('quote expired');
      expect(error.name).toEqual('QuoteExpiredError');
      expect(asLambdaWireError(error).errorType).toEqual('QuoteExpiredError');
    });
  });

  describe('migration from the Error name', () => {
    it('should no longer read Error, while isHelpfulError still detects it', () => {
      const error = new ConstraintError('quote expired');
      expect(error.name).not.toEqual('Error');
      expect(isHelpfulError(error)).toBe(true);
    });
  });
});
