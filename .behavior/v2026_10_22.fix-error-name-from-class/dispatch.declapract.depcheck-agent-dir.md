## .what

the `.depcheckrc.yml` and jest config templates scan `.agent/**`. any repo with a local rhachet actor dir (`.agent/.actors/…`) or rmsafe trash (`.agent/.cache/…`) fails lint, and on `--thorough` runs foreign tests, on that machine only. ci stays green, so the gap hides.

## .evidence

- ehmpathy/helpful-errors#47, local `rhx git.repo.test --what lint`:

```
Missing dependencies
* claude-code: ./.agent/.actors/actor.via.repo=ambient/brain/.claude/plugins/marketplaces/claude-plugins-official/plugins/code-modernization/tests/hostile.test.ts
```

- jest collected `.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/blackbox/zzprobe.acceptance.test.ts` → `Cannot find module '../dist/index'`; `--thorough` also ran `.agent/.actors/…/code-modernization/tests/*`
- repaired downstream in helpful-errors#47: `.depcheckrc.yml` `ignorePatterns` gained `'.agent/**'`; lint green after

## .ask

- `.depcheckrc.yml` template: add `'.agent/**'` to `ignorePatterns`
- jest config templates (`jest.unit.config.ts`, `jest.integration.config.ts`, `jest.acceptance.config.ts`): add `'<rootDir>/.agent/'` to `testPathIgnorePatterns`
- `ignores`: list `rhachet-brains-openrouter` beside the other brains (or a `rhachet-brains-*` glob, if depcheck 1.4.3 honors one); a rhachet upgrade adds it as a devDep and depcheck then flags it unused
