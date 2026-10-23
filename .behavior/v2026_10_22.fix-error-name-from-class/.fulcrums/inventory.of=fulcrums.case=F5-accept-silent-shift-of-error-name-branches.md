# F5 — accept a silent shift for prod branches on `name === 'Error'`

- fork: ship the fix with no runtime signal for consumers whose prod code branched on `error.name === 'Error'` vs add a loud signal (a deprecation warn, a getter that logs on read of `name`, or a major version bump)
- taken: ship silent, mitigated by teach-the-fix (PR body) and findable (grep `name === 'Error'`). a string comparison that stops to match cannot raise by nature; a getter that warns on every `name` read would spam every logger and the aws runtime, which read `name` on every error. a major bump contradicts the wish (`a fix, never a feat`)
- rework: clean — a release note or version choice, no code shape depends on it
- confidence: 85%. low part: a consumer may exist who relied on `'Error'`; none is known in this repo
- where: `1.vision.experience.case=11.runtime-branch-on-error-stops.md`
- verdict: moot — the scope it served (`name` equals the class) was overturned 2026-10-22; see F6. with `name` unchanged, no consumer branch shifts
