# F11 — fix the stale slow-test jq in this pr

- fork: patch `.github/workflows/.test.yml` in #47 vs upgrade the declapract template vs leave ci red for the template owner
- taken: patch in #47, then dispatch upstream. #47 adds the repo's first acceptance suite, so the `report slow tests` step ran for the first time: `.perfStats.runtime` read `null` (jest `--json` emits `startTime` / `endTime` per suite), and `$((null / 1000))` under `set -eu` failed the shard while the tests passed (30/30, snaps 20/20)
- rework: clean — two jq lines; a later `declapract.upgrade` replaces them with the template's `report-slow-tests.sh`
- confidence: settled — the director chose option (a)
- where: `.github/workflows/.test.yml` lines 242, 311; commit 9e28ae3
- verdict: ruled by the director, 2026-10-22. upstream: `ehmpathy/declapract-typescript-ehmpathy#744` (the template already holds the fix since #602; the ask flags stale downstream copies at upgrade time)
