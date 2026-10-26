# F6 — `name` equals the class: overturned

- fork: set `error.name` to the constructed class (the wish's original outcome, built and shipped as #46) vs leave `name` as the native `'Error'` and forbid any override
- taken at first: set it. the wish asked for it, and the aws runtime writes `errorType: error.name`, so a ConstraintError thrown in a lambda read as `'Error'` on the wire
- overturned: leave `name` alone, add the rule and its clamp (#47)
- why, as the human stated it:
  - the class already leads the message (`✋ ConstraintError: …`); a set `name` repeats it on every render: `ConstraintError: ✋ ConstraintError: …`
  - no use case needs `name` pinned; a switch on `error.name` is the code smell
- why, as the evidence showed: `ehmpathy/sdk-aws-lambda@beav/fix-local-locus-reads-error-name`, `genConstraintErrorMiddleware.ts:55-68`. the producer detects the class (`getIsConstraintError`) and writes a deliberate `errorType`; the invocation succeeds, so no retry. the requirement that consumed `name` was itself the defect
- rework: clean — the prior implementation lived on one closed pr (#46); #47 never touched runtime code
- confidence: settled
- where: `0.wish.md` amendment; `.agent/repo=.this/role=any/briefs/rule.forbid.error-name-override.md`; `src/HelpfulError.name.test.ts`
- verdict: overturned, by the human in this route's session, 2026-10-22; confirmed by the director's why-check the same day
