# F7 — the rule lives in this repo's briefs

- fork: `.agent/repo=.this/role=any/briefs/rule.forbid.error-name-override.md` vs a readme section alone vs a code comment in `HelpfulError.ts`
- taken: the brief, plus a 4-line readme note for consumers. the repo already keeps its one other rule there (`rule.forbid.barrel-imports-from-typefns.md`), and a brief boots for every role that works in this repo, so a contributor meets it before they edit
- rework: clean — a file move
- confidence: 90%. weak point: a contributor without the roles booted sees only the readme note and the test header, which both point to the brief
- where: `.agent/repo=.this/role=any/briefs/`
- verdict: awaited
