# rule.forbid.error-name-override

## .what

HelpfulError and its subclasses never touch `error.name`. it stays the native `'Error'`.

forbidden, in any form:
- `this.name = …` in a constructor
- `Object.defineProperty(this, 'name', …)` or on any `.prototype`
- a `name` getter, class field, or static that shadows it
- `name` added to `toJSON` output

## .why

- the class already leads the message: `✋ ConstraintError: quote lacks provider`. a set `name` only repeats it — `ConstraintError: ✋ ConstraintError: …` in every `String(error)`, stack header, and snapshot
- in process, the class is told via `instanceof` or `isHelpfulError(error)`. neither reads `name`
- across a wire, a consumer reads the class from the message prefix, which every subclass carries

## .settled

this was argued and decided. do not reopen it.

- the case for a set `name`: the aws lambda runtime emits `errorType: error.name`, so a thrown ConstraintError reaches a lambda client as `errorType: 'Error'` (ehmpathy/helpful-errors#45)
- the decision: no use case justifies a pinned `name`. the doubled class in every rendered error costs more than it buys. wire consumers classify from the message prefix instead
- a proposal to set `name` — by any route above — is this rule's subject, not a new question

## .enforcement

- any code that sets or shadows `name` on HelpfulError or a subclass = blocker
- `src/HelpfulError.name.test.ts` clamps it: `name === 'Error'`, no own `name`, no `name` on any class prototype, none in json. a change that turns it red is a violation, not a stale test
