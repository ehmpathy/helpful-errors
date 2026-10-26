# rule.forbid.error-name-override

## .what

HelpfulError and its subclasses never touch `error.name`. it stays the native `'Error'`.

forbidden, in any form:
- `this.name = …` in a constructor
- `Object.defineProperty(this, 'name', …)` or on any `.prototype`
- a `name` getter or class field on an instance or prototype that shadows it
- `name` added to `toJSON` output

## .why

`name` would be a second copy of the class. the error already carries the class where it counts.

- **identity lives in the prototype chain, not a string.** `instanceof` is exact, follows inheritance (a `ConstraintError` is a `BadRequestError`; a `QuoteExpiredError` is a `ConstraintError`), and survives renames and minification. a `name` string is one flat label, with no hierarchy, that anyone can overwrite
- **across a wire, the producer classifies.** serialization strips the prototype, so the producer's boundary middleware detects the class before the error leaves and writes a deliberate field for the consumer. the label it writes is its contract's choice, never a copy of `name`
- **two sources of one fact drift.** a class in both `name` and the message prefix can disagree: an override, a rename that misses one. one source cannot disagree with itself. (a minifier can still mangle that one source, `new.target.name`; that hazard exists with or without `name`, and `instanceof` is immune to it)
- **the cost lands on the reads that use `name`.** `String(error)`, the stack header, jest and snapshot output, and an aws lambda's `errorType` render `${name}: ${message}` or `name` alone. with the class in both, those read `ConstraintError: ✋ ConstraintError: …`. (node's `util.inspect` / `console.log` already prints the class beside the message today, from the constructor; a set `name` adds naught there)

## .the code smell

🔴 **to classify a live HelpfulError by `error.name` is a code smell. so is a request to set it.**

a request to set `name` means some consumer branches on `error.name` of a live error. the defect lives in that consumer's requirement, never in this library.

```ts
// 👎 the smell — the native name reads 'Error' for every HelpfulError
if (error.name === 'BadRequestError') return { errorType: 'BadRequestError' }; // never true

// 👍 the class itself — matches BadRequestError, ConstraintError, and their subclasses
if (error instanceof BadRequestError) return { errorType: 'BadRequestError' };
```

a flat `name` match is fragile even where it works: an exact match on `'ConstraintError'` misses `QuoteExpiredError extends ConstraintError`. class detection follows inheritance; a string label does not.

the bound: a **rehydrated** wire error — a plain object or `Error` rebuilt from a response — has no prototype to check, so a consumer may read whatever label the wire carries. that label came from the producer's deliberate field; it is not this library's `name`.

the consumer's fix, by where it classifies:
- **in process**: `instanceof BadRequestError` for any caller fault (it matches `ConstraintError` and every subclass of either). `instanceof ConstraintError` only where a plain `BadRequestError` must not match
- **across duplicate package copies**: `instanceof` can miss. guard with `isHelpfulError(error)`, then read `error.code.http` by range: `4xx` caller fault, `5xx` server fault
- **across a wire**: the producer's boundary middleware checks the class and writes a deliberate field, under the label its contract chose
- **third-party tools keyed on `name`**: an adapter at that boundary maps the class to their label; the error stays untouched

when asked to set `name`:
1. find the consumer that switches on it
2. question that consumer's requirement; point it at the fix above
3. cite this rule

## .settled

this was argued and decided. do not reopen it.

- the case once made for a set `name`: the aws lambda runtime emits `errorType: error.name`, so a thrown ConstraintError reaches a lambda client as `errorType: 'Error'` (ehmpathy/helpful-errors#45)
- the decision: the requirement behind that case was itself the defect, and was overthrown. no use case justifies a pinned `name`
- where: the maintainer overturned it in review, 2026-10-22. the `name = class` change (#46) was closed unmerged; this rule and its clamp shipped instead (#47). the lambda producer, `ehmpathy/sdk-aws-lambda`'s `genConstraintErrorMiddleware`, detects a caller fault by `instanceof` first and then writes a fixed label of its own; its detector's `name` fallback serves rehydrated errors, which a live HelpfulError never is
- a proposal to set `name` — by any route above — is this rule's subject, not a new question

## .enforcement

- in this repo: any code that sets or shadows `name` on a class this package ships = blocker
- in a consumer repo: this rule cannot gate code it does not own. it names the smell instead, and the consumer's fix above. a consumer's own subclass that sets its own `name` is likewise beyond this package's reach, and still the smell above
- a request, in an issue or pr, to set `name` here = the smell; answer it with this rule, never with a change
- `src/HelpfulError.name.test.ts` clamps the invariant for every exported class, `NoErrorThrownError`, and a consumer subclass: `name === 'Error'`, no own `name`, no `name` on any prototype in the chain, none in json; on `.throw`, `.wrap`, `withHelpfulError`, and `.redact` too. (a `static name` on a class renames the constructor, not `error.name`; it is out of this rule's scope.) a change that turns it red is a violation, not a stale test
