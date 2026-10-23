# F10 — defer the depcheck config fix upstream

- fork: edit `.depcheckrc.yml` in this pr (add `.agent/**` to `ignorePatterns`, add `rhachet-brains-openrouter` to `ignores`) vs a reseed to the declapract template vs leave it
- taken: reseed (dream `v2026_10_22.reseed.depcheckrc-ignore-agent-dir`). local lint exits 2 only from local-only state: an untracked `.agent/.actors/` dir and a devDep bump that #47 excludes. ci's `test-lint` passes on the shipped tree. the config is declapract-managed, so a local edit drifts from its template and gets reverted on the next upgrade
- rework: clean — two yaml lines, if the council wants them here
- confidence: 85%. weak point: a reviewer may read "zero tolerance for local failures" as a mandate to make local lint green in this pr regardless of scope
- where: `.depcheckrc.yml`; `.dream/v2026_10_22.reseed.depcheckrc-ignore-agent-dir.md`
- verdict: overruled by the director, 2026-10-22 — "a red you meet is yours". fix it in this pr and dispatch upstream beside it:
  - in #47: `.depcheckrc.yml` `ignorePatterns` gains `'.agent/**'`. the `rhachet-brains-openrouter` line came from the local devDep bump, now restored to the committed `package.json`, so it needs no `ignores` entry here
  - upstream: `ehmpathy/declapract-typescript-ehmpathy#745` (depcheck + jest templates ignore `.agent/**`; list `rhachet-brains-openrouter` in `ignores`)
