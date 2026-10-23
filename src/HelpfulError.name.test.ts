import { given, then, when } from 'test-fns';

import { BadRequestError } from './BadRequestError';
import { ConstraintError } from './ConstraintError';
import { NoErrorThrownError } from './getError';
import { HelpfulError, type HelpfulErrorMetadata } from './HelpfulError';
import * as exported from './index';
import { isHelpfulError } from './isHelpfulError';
import { MalfunctionError } from './MalfunctionError';
import { UnexpectedCodePathError } from './UnexpectedCodePathError';

/**
 * .what = clamps the invariant that HelpfulError never touches error.name
 * .why =
 *   - the class already leads the message (`✋ ConstraintError: …`), so a set name only repeats it
 *   - callers tell the class via instanceof, never via name
 *   - the rule and its reasons: .agent/repo=.this/role=any/briefs/rule.forbid.error-name-override.md
 */

/**
 * .what = a consumer-declared subclass
 * .why = proves the invariant holds for subclasses no one in this repo wrote
 */
class QuoteExpiredError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends ConstraintError<TMetadata> {}

/**
 * .what = every HelpfulError class the package exports, plus the internal and consumer ones
 * .why = the exported ones derive from ./index, so a class exported later is clamped with no edit here;
 *   an unexported subclass (NoErrorThrownError) is listed by hand
 */
const isHelpfulErrorClass = (value: unknown): value is typeof HelpfulError =>
  typeof value === 'function' &&
  (value === HelpfulError || value.prototype instanceof HelpfulError);
const TEST_CASES: {
  description: string;
  Variant: (new (message: string) => HelpfulError) & { prototype: object };
}[] = [
  ...Object.values(exported)
    .filter(isHelpfulErrorClass)
    .map((Variant) => ({ description: Variant.name, Variant })),
  {
    description: 'NoErrorThrownError, which keeps its own message',
    Variant: NoErrorThrownError,
  },
  {
    description: 'QuoteExpiredError, a consumer subclass',
    Variant: QuoteExpiredError,
  },
];

/**
 * .what = every prototype from the class up to Error.prototype, which is left out
 * .why = an override on any ancestor prototype would shadow the native name too
 */
const getPrototypeChain = (Variant: { prototype: object }): object[] => {
  const chain: object[] = [];
  let proto: object | null = Variant.prototype; // .note = deliberate mutation; a loop cursor
  while (proto && proto !== Error.prototype) {
    chain.push(proto);
    proto = Object.getPrototypeOf(proto);
  }
  return chain;
};

/**
 * .what = the classes in a prototype chain that own a `name`
 * .why = a red run names the class that owns the override
 */
const getPrototypeOwnersWithName = (Variant: { prototype: object }): string[] =>
  getPrototypeChain(Variant)
    .filter((proto) => Object.getOwnPropertyNames(proto).includes('name'))
    .map((proto) => proto.constructor.name);

/**
 * .what = the stack with its frames masked, its header kept
 * .why = the frames hold file paths and line numbers; the header is the `Error: …` line a reader checks
 */
const asStackWithFramesMasked = (stack: string): string => {
  const [header] = stack.split('\n    at ');
  return `${header}\n    at <frames>`;
};

/**
 * .what = the json a consumer serializes, as snapped here: stack frames masked, cause left out
 * .why =
 *   - the frames are volatile; the header stays, so a snapshot shows `Error: ✋ ConstraintError: …`
 *   - cause serialization is not this clamp's subject; `[case3] [t2]` asserts its json form once
 */
const asJsonForSnapshot = (error: Error): Record<string, unknown> => {
  const json: Record<string, unknown> = JSON.parse(JSON.stringify(error));
  const jsonWithoutCause = Object.fromEntries(
    Object.entries(json).filter(([key]) => key !== 'cause'),
  );
  if (typeof jsonWithoutCause.stack !== 'string') return jsonWithoutCause;
  return {
    ...jsonWithoutCause,
    stack: asStackWithFramesMasked(jsonWithoutCause.stack),
  };
};

/**
 * .what = a fresh copy of the package, loaded under an explicit ERROR_EXPAND
 * .why = the package reads ERROR_EXPAND once, at module load; a fresh load under a set env pins the
 *   metadata render the way a consumer process does, with no mock and no reliance on the ambient env
 */
const getPackageUnderExpand = (input: {
  expand: 'true' | 'false';
}): typeof import('./index') => {
  const envBefore = process.env.ERROR_EXPAND;
  const copy: { pkg: typeof import('./index') | null } = { pkg: null };
  process.env.ERROR_EXPAND = input.expand; // .note = deliberate mutation; restored below
  jest.isolateModules(() => {
    // .note = deliberate mutation; jest.isolateModules returns no value
    copy.pkg = require('./index') as typeof import('./index');
  });
  if (envBefore === undefined) delete process.env.ERROR_EXPAND;
  if (envBefore !== undefined) process.env.ERROR_EXPAND = envBefore;
  if (!copy.pkg)
    throw new UnexpectedCodePathError('the package copy did not load', input);
  return copy.pkg;
};

describe('HelpfulError.name (rule.forbid.error-name-override)', () => {
  given('[case1] the classes the package exports', () => {
    then('every one is in the clamp', () => {
      const descriptions = TEST_CASES.map((thisCase) => thisCase.description);
      [
        'HelpfulError',
        'ConstraintError',
        'MalfunctionError',
        'BadRequestError',
        'UnexpectedCodePathError',
      ].forEach((className) => expect(descriptions).toContain(className));
    });
  });

  TEST_CASES.forEach((thisCase) =>
    given(`[case2] the class ${thisCase.description}`, () => {
      when('[t0] one is constructed', () => {
        // no metadata, so the render does not depend on the ambient ERROR_EXPAND
        const genError = () => new thisCase.Variant('quote lacks provider');

        then('name stays the native Error', () => {
          expect(genError().name).toEqual('Error');
        });

        then('the instance defines no own name', () => {
          expect(Object.getOwnPropertyNames(genError())).not.toContain('name');
        });

        then('no prototype in its chain defines a name', () => {
          expect(getPrototypeOwnersWithName(thisCase.Variant)).toEqual([]);
        });

        then('String(error) shows the native header and the class once', () => {
          const rendered = String(genError());
          expect(rendered).toMatch(/^Error: /);
          expect(rendered).toMatchSnapshot();
        });

        then(
          'the json carries no name, and its stack leads with the native header',
          () => {
            const json = asJsonForSnapshot(genError());
            expect(json).not.toHaveProperty('name');
            expect(json.stack).toMatch(/^Error: /);
            expect(json).toMatchSnapshot();
          },
        );
      });
    }),
  );

  given('[case3] a construction path with no ERROR_EXPAND dependence', () => {
    const cause = new Error('upstream timeout');
    const metadata = { quoteUuid: 'q-1', cause };
    class SlugError extends HelpfulError {
      public static code = { http: 409, slug: 'QUOTE_EXPIRED' };
    }

    when(
      '[t0] a class with its own code is constructed with metadata and a cause',
      () => {
        then(
          'name stays the native Error, and the json carries no name',
          () => {
            const error = new SlugError('quote expired', metadata);
            expect(error.name).toEqual('Error');
            expect(JSON.parse(JSON.stringify(error))).not.toHaveProperty(
              'name',
            );
          },
        );
      },
    );

    when('[t1] a class with its own code is constructed bare', () => {
      then('the json carries the code and no name', () => {
        const json = asJsonForSnapshot(new SlugError('quote expired'));
        expect(json).not.toHaveProperty('name');
        expect(json).toMatchSnapshot();
      });
    });

    when('[t2] one is redacted via .redact', () => {
      const genError = () =>
        new QuoteExpiredError('quote expired', metadata).redact(['metadata']);

      then('name stays the native Error, and the metadata is gone', () => {
        const error = genError();
        expect(error.name).toEqual('Error');
        expect(Object.getOwnPropertyNames(error)).not.toContain('name');
        expect(error.message).toEqual('✋ QuoteExpiredError: quote expired');
      });

      then('String(error) shows the class once', () => {
        expect(String(genError())).toMatchSnapshot();
      });

      then('the json shows the class once and no name', () => {
        const json = asJsonForSnapshot(genError());
        expect(json).not.toHaveProperty('name');
        expect(json).toMatchSnapshot();
      });

      then(
        'the cause survives .redact, and serializes to an empty object',
        () => {
          // an Error's own props are non-enumerable, so a consumer who serializes the error gets `{}` for its cause
          const error = genError();
          expect(error.cause).toBeInstanceOf(Error);
          expect(JSON.parse(JSON.stringify(error)).cause).toEqual({});
        },
      );
    });
  });

  given('[case4] a caller who must tell the class', () => {
    when('[t0] the class is read from the message', () => {
      then('the message prefix carries the class', () => {
        const error = new ConstraintError('quote lacks provider');
        expect(error.message).toEqual(
          '✋ ConstraintError: quote lacks provider',
        );
      });

      then('String(error) shows the native header, then the class once', () => {
        expect(String(new ConstraintError('quote lacks provider'))).toEqual(
          'Error: ✋ ConstraintError: quote lacks provider',
        );
        expect(String(new HelpfulError('quote lacks provider'))).toEqual(
          'Error: quote lacks provider',
        );
        expect(String(new QuoteExpiredError('quote expired'))).toEqual(
          'Error: ✋ QuoteExpiredError: quote expired',
        );
      });
    });

    when('[t1] the class is checked via instanceof', () => {
      then(
        'a consumer subclass matches itself, its parent, and isHelpfulError',
        () => {
          const error = new QuoteExpiredError('quote expired');
          expect(error).toBeInstanceOf(QuoteExpiredError);
          expect(error).toBeInstanceOf(ConstraintError);
          expect(isHelpfulError(error)).toBe(true);
        },
      );

      then(
        'instanceof BadRequestError matches every caller fault and no server fault',
        () => {
          expect(new BadRequestError('bad input')).toBeInstanceOf(
            BadRequestError,
          );
          expect(new ConstraintError('bad input')).toBeInstanceOf(
            BadRequestError,
          );
          expect(new QuoteExpiredError('bad input')).toBeInstanceOf(
            BadRequestError,
          );
          expect(new MalfunctionError('db down')).not.toBeInstanceOf(
            BadRequestError,
          );
        },
      );
    });

    when('[t2] the error comes from a duplicate copy of the package', () => {
      then(
        'isHelpfulError and code.http tell the class, and name stays Error',
        () => {
          // a second module instance stands in for a duplicate copy of the package
          const copy: {
            ConstraintError: typeof ConstraintError | null;
            MalfunctionError: typeof MalfunctionError | null;
          } = { ConstraintError: null, MalfunctionError: null };
          jest.isolateModules(() => {
            // .note = deliberate mutation; jest.isolateModules returns no value
            copy.ConstraintError = (
              require('./ConstraintError') as typeof import('./ConstraintError')
            ).ConstraintError;
            copy.MalfunctionError = (
              require('./MalfunctionError') as typeof import('./MalfunctionError')
            ).MalfunctionError;
          });
          if (!copy.ConstraintError || !copy.MalfunctionError)
            throw new UnexpectedCodePathError('the package copy did not load');

          // a caller fault from the copy: 4xx
          const callerFault = new copy.ConstraintError('quote lacks provider');
          expect(callerFault).not.toBeInstanceOf(ConstraintError);
          expect(isHelpfulError(callerFault)).toBe(true);
          expect(callerFault.code?.http).toEqual(400);
          expect(callerFault.name).toEqual('Error');

          // a server fault from the copy: 5xx
          const serverFault = new copy.MalfunctionError('db down');
          expect(serverFault).not.toBeInstanceOf(MalfunctionError);
          expect(isHelpfulError(serverFault)).toBe(true);
          expect(serverFault.code?.http).toEqual(500);
          expect(serverFault.name).toEqual('Error');
        },
      );
    });
  });

  // each bad class extends the native Error, so a real library fault reds only the clamp above
  given(
    '[case5] a class that breaks the rule, to prove the clamp bites',
    () => {
      when('[t0] its prototype sets name', () => {
        class NamedError extends Error {
          public get name(): string {
            return 'NamedError';
          }
        }

        then('the prototype check flags the owner class', () => {
          expect(getPrototypeOwnersWithName(NamedError)).toEqual([
            'NamedError',
          ]);
          expect(new NamedError('x').name).not.toEqual('Error');
        });
      });

      when('[t1] its constructor stamps name', () => {
        class StampedError extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'StampedError';
          }
        }

        then('the instance checks flag it', () => {
          const error = new StampedError('x');
          expect(error.name).not.toEqual('Error');
          expect(Object.getOwnPropertyNames(error)).toContain('name');
        });
      });

      when('[t2] its json carries name', () => {
        class JsonNamedError extends Error {
          public toJSON(): Record<string, unknown> {
            return { message: this.message, name: 'JsonNamedError' };
          }
        }

        then('only the json check flags it', () => {
          const error = new JsonNamedError('x');
          expect(error.name).toEqual('Error');
          expect(JSON.parse(JSON.stringify(error))).toHaveProperty('name');
        });
      });
    },
  );

  (['true', 'false'] as const).forEach((expand) =>
    given(
      `[case6] a construction path with metadata, under ERROR_EXPAND=${expand}`,
      () => {
        const pkg = getPackageUnderExpand({ expand });
        class QuoteStaleError extends pkg.ConstraintError {}
        class QuoteVoidError extends pkg.HelpfulError {
          public static code = { http: 409, slug: 'QUOTE_VOID' };
        }
        const cause = new Error('upstream timeout');
        const metadata = { quoteUuid: 'q-1', cause };

        when(
          '[t0] a class with its own code is constructed with metadata and a cause',
          () => {
            const genError = () => new QuoteVoidError('quote void', metadata);

            then('String(error) shows the class once and the metadata', () => {
              const error = genError();
              expect(error.name).toEqual('Error');
              expect(String(error)).toMatch(
                /^Error: QuoteVoidError: quote void/,
              );
              expect(String(error)).toMatchSnapshot();
            });

            then(
              'the json carries the code and the metadata, and no name',
              () => {
                const json = asJsonForSnapshot(genError());
                expect(json).not.toHaveProperty('name');
                expect(json).toMatchSnapshot();
              },
            );
          },
        );

        when('[t1] one is thrown via .throw', () => {
          then('String(error) shows the class once and the metadata', () => {
            const error = pkg.getError((): void => {
              pkg.ConstraintError.throw('quote expired', metadata);
            });
            expect(error).toBeInstanceOf(pkg.ConstraintError);
            expect(error.name).toEqual('Error');
            expect(String(error)).toMatch(
              /^Error: ✋ ConstraintError: quote expired/,
            );
            expect(String(error)).toMatchSnapshot();
          });
        });

        when('[t2] one is thrown via .wrap', () => {
          then(
            'String(error) shows the class once and the metadata',
            async () => {
              const wrapped = pkg.ConstraintError.wrap(
                async () => {
                  throw cause;
                },
                {
                  message: 'could not get quote',
                  metadata: { quoteUuid: 'q-1' },
                },
              );
              const error = await pkg.getError(wrapped());
              expect(error).toBeInstanceOf(pkg.ConstraintError);
              expect(error.name).toEqual('Error');
              expect(String(error)).toMatch(
                /^Error: ✋ ConstraintError: could not get quote/,
              );
              expect(String(error)).toMatchSnapshot();
            },
          );
        });

        when('[t3] one is thrown via withHelpfulError', () => {
          then('String(error) shows the class once and the metadata', () => {
            const wrapped = pkg.withHelpfulError(
              () => {
                throw cause;
              },
              {
                variant: QuoteStaleError,
                message: 'could not get quote',
                metadata: { quoteUuid: 'q-1' },
              },
            );
            const error = pkg.getError(() => {
              wrapped();
            });
            expect(error).toBeInstanceOf(QuoteStaleError);
            expect(error.name).toEqual('Error');
            expect(String(error)).toMatch(
              /^Error: ✋ QuoteStaleError: could not get quote/,
            );
            expect(String(error)).toMatchSnapshot();
          });
        });
      },
    ),
  );
});
