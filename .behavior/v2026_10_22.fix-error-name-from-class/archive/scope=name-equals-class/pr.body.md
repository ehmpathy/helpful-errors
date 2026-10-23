fixes #45

## what

every HelpfulError carries its class name as `.name`:

```ts
new ConstraintError('quote lacks provider').name; // before 'Error', after 'ConstraintError'
```

- `HelpfulError.prototype` carries one `name` accessor; its getter returns the constructed class name, so every subclass — built-in and consumer-defined — names itself
- `String(error)`, the stack header, `JSON.stringify(error)`, and the aws lambda wire `errorType` all read the class name
- constructor inputs and message format unchanged

## why

the aws lambda node runtime serializes a thrown error as `errorType: error.name?.replaceAll('\x7F', '%7F')` ([aws/aws-lambda-nodejs-runtime-interface-client `src/Errors.js`](https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/blob/main/src/Errors.js)). a ConstraintError reached the wire as `errorType: 'Error'`, so sdk-aws-lambda read a caller fault as a server fault and sqs retried a request that can never succeed (svc-quotes prep acceptance, run 38852404042). sdk-aws-lambda#73 consumes this.

## decisions

- **F1, an inherited prototype accessor, not an own property per instance:** each override a subclass declares still wins — `this.name = 'X'` after `super()`, a class field, `X.prototype.name = 'X'`, or a `name` getter. `name` stays non-enumerable, so `Object.keys` and spreads are unchanged
- **F2, the message prefix stays:** `String(error)` reads `ConstraintError: ✋ ConstraintError: …`, the class name twice. removal of the prefix would change every message a consumer asserts on
- **F3, `toJSON` includes `name`:** json logs gain `"name":"ConstraintError"` between `message` and `stack`
- **F5, a visible shift:** consumers that branch on `error.name === 'Error'` or snapshot `[Error: …]` will see the class name instead. detect via `isHelpfulError(error)` or `instanceof`, which never read `name`
- minified bundles: `--keep-names` / `keep_classnames` keeps class names; without it the name is mangled, as the message prefix already was

## snapshot changes

15 entries in 5 files, each from `[Error: …]` to `[<Class>: …]` (jest renders an error via `Error.prototype.toString`, which reads `name`), plus `name` in two json snapshots per class:

- `BadRequestError.test.ts.snap` (1): `should produce a helpful, observable error message` → `[BadRequestError: BadRequestError: no tires on the vehicle`
- `ConstraintError.test.ts.snap` (3)
  - `should produce a helpful, observable error message` → `[ConstraintError: ✋ ConstraintError: email must be valid`
  - `serialization should serialize to json expressively` → `+ "name": "ConstraintError"`
  - `serialization should include code in serialization when…` → `+ "name": "ConstraintError"`
- `MalfunctionError.test.ts.snap` (3)
  - `should produce a helpful, observable error message` → `[MalfunctionError: 💥 MalfunctionError: database connection lost`
  - `serialization should serialize to json expressively` → `+ "name": "MalfunctionError"`
  - `serialization should include code in serialization when…` → `+ "name": "MalfunctionError"`
- `UnexpectedCodePathError.test.ts.snap` (1): `should produce a helpful, observable error message` → `[UnexpectedCodePathError: UnexpectedCodePathError: no tires on the vehicle`
- `HelpfulError.test.ts.snap` (7), each `[Error: …]` → `[HelpfulError: …]`
  - `redact input=["cause"] should redact only cause…`
  - `redact input=["metadata", "cause"] should redact both metadata and cause…`
  - `redact input=["metadata"] should redact only metadata…`
  - `redact input=["metadata"] should work with expanded metadata format`
  - `should be able to prettify the error metadata when ERROR_EXPAND…`
  - `should be possible to extend the call stack of an error via cause`
  - `should produce a helpful, observable error message`

new: `HelpfulError.name.test.ts.snap` (9 entries) — the name surfaces per class and the wire payloads.

## tests

`src/HelpfulError.name.test.ts`:
- per class (base, 4 built-ins, 2 consumer subclasses): `.name`, `String`, stack header, json, wire `errorType`, and `.throw` / `.redact` / `.wrap`
- the wire payload `{ errorType: 'ConstraintError' }` for a thrown ConstraintError
- all four override routes, minified class names, and `isHelpfulError` beside the name shift
- with the accessor disabled, 55 of 62 go red; the 7 that stay green are override and `Object.keys` cases, green either way by design

## cicd

`cont(cicd)` pins every workflow action to a full commit sha (`<action>@<sha> # <tag>`). repo settings now refuse tag refs, and every check failed at job setup without it.
