# blocker — 5.1 execution: l3 re-run needs a depth-0 pass

## the obstacle

the guard's l3 lanes `enroll-impl-behavior-intent` (r10) and `enroll-impl-arch-defects` (r11) enroll a fresh clone to review. the driver is a clone at depth 1, so a re-arrival from here refuses with `clone enroll depth budget spent` (depthRequested 2, depthMax 1). only the director's depth-0 pass can re-run them.

## i003 state — every concern answered

- r10, 2 blockers + 3 nitpicks: all repaired; taken at `.reviews/peer/…i003…r010._.taken.by_self.enroll-impl-behavior-intent.md`
- r11, 3 blockers + 2 nitpicks: all repaired; taken at `.reviews/peer/…i003…r011._.taken.by_self.enroll-impl-arch-defects.md`
- conceded: r10 blocker.1 and r11 blocker.1 `urgent`, the rest `better`; both lanes `--as absorbed`

## why two concessions are urgent

behavioral harm: under the prior design, a consumer subclass that named itself on its prototype, or via a getter, silently lost that name. its lambda wire `errorType` would shift on upgrade with no failed test. the repair moves `name` to one accessor on `HelpfulError.prototype`, so every override route wins. four clamps prove it.

## what changed in code

- commit `f86fe35` `fix(name): name each HelpfulError by its class`, on `origin/beav/fix-error-name-from-class`; fix files only, no Claude trailer
- `name` via prototype accessor; `toJSON` lists `name`; `new.target.name` hoisted
- new clamps: prototype override, getter override, minified class name, literal name under minification, `isHelpfulError` beside the name shift
- checks: unit 118/118 for `HelpfulError*`; types, biome, cycles ✓; bite: accessor disabled → 55 red / 7 green by design; restored → green
- vision contract, F1 (revised at l3), case 9 row, and readme updated to the accessor design

## what i need

1. the director's depth-0 pass re-runs r10 and r11 against `f86fe35`
2. the pr: the push succeeded, but the pr open fails on `HTTP 401: Bad credentials (https://api.github.com/graphql)`. that persisted after a fresh `rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN`; status `ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN — expires in: 540m`. so the stored token value is likely the stale one. fallback compare link: https://github.com/ehmpathy/helpful-errors/compare/main...beav/fix-error-name-from-class
