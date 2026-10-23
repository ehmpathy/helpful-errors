# F4 — `new.target.name` over per-class hardcoded names

- fork: derive from `new.target.name` vs hardcode a name per built-in class (minification-proof)
- taken: `new.target.name`, as the wish names. covers user subclasses; the extant message prefix shares the same minification exposure
- rework: clean — a static override per built-in could layer on later
- confidence: 88%. low part: a lambda bundled with esbuild `--minify` and no `--keep-names` would emit a mangled `errorType`
- where: `src/HelpfulError.ts` constructor
- verdict: moot — the scope it served (`name` equals the class) was overturned 2026-10-22; see F6
