fix(name): forbid error.name override; clamp the invariant

helpful-errors never touches `error.name`. it stays the native `'Error'`. this pr records that as a rule and clamps it with tests, so the question is not reopened.

## why

- the class already leads the message (`✋ ConstraintError: …`); a set `name` would only repeat it on every render
- identity lives in the prototype chain: `instanceof` is exact and follows inheritance; a `name` string does neither
- across a wire, the producer classifies: its boundary middleware detects the class and writes a deliberate field. `name` is never that field
- a switch on `error.name`, or a request to set it, is a code smell in the consumer

## the decision

#45 asked for `name` to equal the class, so a lambda client would read `errorType: 'ConstraintError'`. the requirement behind it was the defect: sdk-aws-lambda's middleware already classifies by class detection. #46 (the `name = class` change) was closed unmerged. this pr ships the rule instead.

refs #45 — the maintainer closes it with this settled answer.

## what changes

- `.agent/repo=.this/role=any/briefs/rule.forbid.error-name-override.md` — the rule: forbidden routes, reasons, the code smell and its fix table, where it was settled, enforcement
- `src/HelpfulError.name.test.ts` + snapshot — the clamp, 60 tests in `given` / `when` / `then`: every exported class (derived from the exports), `NoErrorThrownError`, and a consumer subclass; no `name` on the instance, any prototype in the chain, or json; on `.throw`, `.wrap`, `withHelpfulError`, `.redact`. `String(error)` and the json (stack masked) snapped per class; each metadata path snapped under `ERROR_EXPAND=true` and `=false`, via a fresh module load, no mock. also: `instanceof BadRequestError` matches every caller fault; a real second module copy is told by `isHelpfulError` + `code.http`. proven to go red on a constructor stamp, a prototype accessor, and a `toJSON` entry
- `blackbox/name.acceptance.test.ts` + snapshot — the same invariant through the built `dist` entry a consumer installs, 20 tests; the render and json snapped per exported class and for a consumer subclass
- `readme.md` — `#### .name` (how to tell the class in process, across duplicate copies, across a wire, for third-party tools); the `.toJSON` example no longer shows a `name` key it never emitted
- `src/HelpfulError.ts` — a `.what` / `.why` / `.note` header on the class; the `.note` states the invariant and cites the rule. no runtime change
- `.github/workflows/*` — all action refs pinned to a full commit sha, which repo settings now require

no runtime change. no extant snapshot changes.
