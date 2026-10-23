# F8 — the clamp tests four facets per class

- fork: assert only `error.name === 'Error'` vs assert every route a contributor could take: the value, no own `name`, no `name` on any class prototype, no `name` in json
- taken: all four, the prototype facet across the whole chain. the value check alone passes two forbidden changes: a `toJSON` entry that adds `name` to json while `name` itself stays `'Error'`, and an own or prototype `name` defined with the value `'Error'`
- rework: clean — tests only
- confidence: 90%. weak point: a getter on a consumer subclass's own prototype is outside this library and outside the clamp, by design (`case=_` row 6)
- bite: a constructor stamp, a prototype accessor, and a `toJSON` entry each turn the clamp red (counts per revision in the 5.1 yield); the suite's `the clamp bites` test proves the prototype facet flags a bad class
- where: `src/HelpfulError.name.test.ts`
- verdict: awaited
