# F3 — `name` enters `toJSON` output

- fork: let `toJSON` include `name` (it enumerates own property names) vs filter it out to keep json output unchanged
- taken: include. json logs and wire payloads gain the class name, which is the point of the fix
- rework: clean — add `'name'` to the toJSON filter
- confidence: 85%. low part: consumer snapshots of `JSON.stringify(error)` gain a key
- where: `src/HelpfulError.ts` toJSON
- verdict: moot — the scope it served (`name` equals the class) was overturned 2026-10-22; see F6. `toJSON` output keeps no `name` key, and the clamp asserts it
