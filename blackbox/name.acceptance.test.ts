import { given, then, when } from 'test-fns';

/**
 * .what = proves, through the built package entry, that HelpfulError never touches error.name
 * .why = the unit clamp imports source; this proves what a consumer installs
 *   - the rule: .agent/repo=.this/role=any/briefs/rule.forbid.error-name-override.md
 * .note = `require` of the built entry, since dist does not exist when types are checked
 */
const pkg: typeof import('../src/index') = require('../dist/index');

/**
 * .what = every HelpfulError class the built entry exports
 * .why = a class exported later is covered with no edit here
 */
const isHelpfulErrorClass = (
  value: unknown,
): value is typeof pkg.HelpfulError =>
  typeof value === 'function' &&
  (value === pkg.HelpfulError || value.prototype instanceof pkg.HelpfulError);
const classesExported = Object.values(pkg).filter(isHelpfulErrorClass);

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
 * .why = the frames are volatile; cause serialization is not this suite's subject
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
 * .what = a fresh load of the built entry under an explicit ERROR_EXPAND
 * .why = the package reads ERROR_EXPAND once, at module load; this pins the metadata render the way a
 *   consumer process does, with no mock and no reliance on the ambient env
 */
const getPackageUnderExpand = (input: {
  expand: 'true' | 'false';
}): typeof import('../src/index') => {
  const envBefore = process.env.ERROR_EXPAND;
  const copy: { pkg: typeof import('../src/index') | null } = { pkg: null };
  process.env.ERROR_EXPAND = input.expand; // .note = deliberate mutation; restored below
  jest.isolateModules(() => {
    // .note = deliberate mutation; jest.isolateModules returns no value
    copy.pkg = require('../dist/index');
  });
  if (envBefore === undefined) delete process.env.ERROR_EXPAND;
  if (envBefore !== undefined) process.env.ERROR_EXPAND = envBefore;
  if (!copy.pkg)
    throw new pkg.UnexpectedCodePathError('the built entry did not load', input);
  return copy.pkg;
};

describe('helpful-errors, as installed: error.name', () => {
  given('[case1] the built package entry', () => {
    then('it exports the five HelpfulError classes', () => {
      expect(classesExported.map((Variant) => Variant.name).sort()).toEqual([
        'BadRequestError',
        'ConstraintError',
        'HelpfulError',
        'MalfunctionError',
        'UnexpectedCodePathError',
      ]);
    });
  });

  classesExported.forEach((Variant) =>
    given(`[case2] an installed ${Variant.name}`, () => {
      when('[t0] a consumer constructs one and reads it', () => {
        const genError = () => new Variant('quote lacks provider');

        then('name stays the native Error', () => {
          expect(genError().name).toEqual('Error');
        });

        then('String(error) leads with the native Error header', () => {
          const rendered = String(genError());
          expect(rendered).toMatch(/^Error: /);
          expect(rendered).toMatchSnapshot();
        });

        then('the json carries no name, and its stack leads with the native Error header', () => {
          const json = asJsonForSnapshot(genError());
          expect(json).not.toHaveProperty('name');
          expect(json.stack).toMatch(/^Error: /);
          expect(json).toMatchSnapshot();
        });
      });
    }),
  );

  given('[case3] a consumer who tells a caller fault from a server fault', () => {
    class QuoteExpiredError extends pkg.ConstraintError {}

    when('[t0] a consumer subclass of the installed ConstraintError is constructed', () => {
      const genError = () => new QuoteExpiredError('quote expired');

      then('it is a BadRequestError by class', () => {
        expect(genError()).toBeInstanceOf(pkg.BadRequestError);
      });

      then('name stays the native Error', () => {
        expect(genError().name).toEqual('Error');
      });

      then('the message carries its own class once', () => {
        const error = genError();
        expect(error.message).toEqual('✋ QuoteExpiredError: quote expired');
        expect(String(error)).toMatchSnapshot();
      });

      then('the json carries no name, and its stack leads with the native Error header', () => {
        const json = asJsonForSnapshot(genError());
        expect(json).not.toHaveProperty('name');
        expect(json.stack).toMatch(/^Error: /);
        expect(json).toMatchSnapshot();
      });
    });

    when('[t1] an installed MalfunctionError is constructed', () => {
      then('it is not a BadRequestError by class', () => {
        expect(new pkg.MalfunctionError('db down')).not.toBeInstanceOf(
          pkg.BadRequestError,
        );
      });
    });

    when('[t2] each comes from a second load of the package', () => {
      then('isHelpfulError and code.http tell the class, and name stays Error', () => {
        const copy = getPackageUnderExpand({ expand: 'false' });
        const callerFault = new copy.ConstraintError('quote lacks provider');
        const serverFault = new copy.MalfunctionError('db down');
        expect(callerFault).not.toBeInstanceOf(pkg.ConstraintError);
        expect(pkg.isHelpfulError(callerFault)).toBe(true);
        expect(callerFault.code?.http).toEqual(400);
        expect(callerFault.name).toEqual('Error');
        expect(serverFault).not.toBeInstanceOf(pkg.MalfunctionError);
        expect(pkg.isHelpfulError(serverFault)).toBe(true);
        expect(serverFault.code?.http).toEqual(500);
        expect(serverFault.name).toEqual('Error');
      });
    });
  });

  (['true', 'false'] as const).forEach((expand) =>
    given(`[case4] a consumer path with metadata, as installed, under ERROR_EXPAND=${expand}`, () => {
      const installed = getPackageUnderExpand({ expand });
      class QuoteVoidError extends installed.HelpfulError {
        public static code = { http: 409, slug: 'QUOTE_VOID' };
      }
      const cause = new Error('upstream timeout');
      const metadata = { quoteUuid: 'q-1', cause };

      when('[t0] one is thrown via .throw', () => {
        then('String(error) shows the class once and the metadata', () => {
          const error = installed.getError((): void => {
            installed.ConstraintError.throw('quote expired', metadata);
          });
          expect(error).toBeInstanceOf(installed.ConstraintError);
          expect(error.name).toEqual('Error');
          expect(String(error)).toMatch(/^Error: ✋ ConstraintError: quote expired/);
          expect(String(error)).toMatchSnapshot();
        });
      });

      when('[t1] one is thrown via .wrap', () => {
        then('String(error) shows the class once and the metadata', async () => {
          const wrapped = installed.ConstraintError.wrap(
            async () => {
              throw cause;
            },
            { message: 'could not get quote', metadata: { quoteUuid: 'q-1' } },
          );
          const error = await installed.getError(wrapped());
          expect(error).toBeInstanceOf(installed.ConstraintError);
          expect(error.name).toEqual('Error');
          expect(String(error)).toMatch(
            /^Error: ✋ ConstraintError: could not get quote/,
          );
          expect(String(error)).toMatchSnapshot();
        });
      });

      when('[t2] one is redacted via .redact', () => {
        then('String(error) shows the class once, the metadata gone', () => {
          const error = new installed.ConstraintError(
            'quote expired',
            metadata,
          ).redact(['metadata']);
          expect(error.name).toEqual('Error');
          expect(error.message).toEqual('✋ ConstraintError: quote expired');
          expect(String(error)).toMatchSnapshot();
        });
      });

      when('[t3] a class with its own code is constructed with metadata', () => {
        then('the json carries the code and the metadata, and no name', () => {
          const error = new QuoteVoidError('quote void', metadata);
          expect(error.name).toEqual('Error');
          const json = asJsonForSnapshot(error);
          expect(json).not.toHaveProperty('name');
          expect(json).toMatchSnapshot();
        });
      });
    }),
  );
});
