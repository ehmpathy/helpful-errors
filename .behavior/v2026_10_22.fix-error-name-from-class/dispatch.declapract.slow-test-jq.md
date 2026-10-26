## .what

repos pinned before the `report-slow-tests.sh` fix (radio #602) still carry the inline jq on `.perfStats.runtime` in `.github/workflows/.test.yml`. it breaks CI the moment a repo gains its first acceptance (or integration) suite.

## .evidence

- ehmpathy/helpful-errors#47 — pins `declapract-typescript-ehmpathy` 0.47.49; latest is 0.49.14
- run https://github.com/ehmpathy/helpful-errors/actions/runs/39884809318 — tests 30/30, snapshots 20/20, then the `report slow tests` step died: `line 3: null: unbound variable` (`$((null / 1000))` under `set -eu`), so `test-shards-acceptance` and `test-acceptance-locally` went red
- latent until then: with `--passWithNoTests` and 0 suites, `.testResults[]` was empty and the loop never ran
- repaired downstream in helpful-errors@9e28ae3 — `(.endTime - .startTime)` per suite, a null reads 0, at both `.test.yml` call sites; CI green after

## .ask

- the fix itself is already on main (`report-slow-tests.sh`, `.test.yml:259` / `:343`); no new fix is needed
- make the stale form fail loud at upgrade time: have the cicd-common practice flag a `.test.yml` that still reads `perfStats.runtime`, so `declapract plan` names it before a first acceptance suite reds CI
- consider a sweep of ehmpathy repos still below the #602 release for this exact line
