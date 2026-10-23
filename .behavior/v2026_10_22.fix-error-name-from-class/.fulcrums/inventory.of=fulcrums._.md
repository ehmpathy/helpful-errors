# inventory.of=fulcrums

axis: `case` (occurrences, declared as they arise)

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1-name-as-nonenumerable-own-prop | inherited prototype accessor for `name` | clean | moot (F6) | — |
| F2-keep-message-prefix | keep the class prefix in the message | clean | held | — |
| F3-name-enters-tojson | let `name` enter `toJSON` output | clean | moot (F6) | — |
| F4-new-target-name-over-hardcode | `new.target.name` over per-class hardcoded names | clean | moot (F6) | — |
| F5-accept-silent-shift-of-error-name-branches | ship with no signal for branches on `name === 'Error'` | clean | moot (F6) | — |
| F6-name-equals-class-overturned | `name` equals the class — overturned; `name` stays `'Error'` | clean | overturned | settled |
| F7-rule-lives-in-repo-briefs | the rule lives in `.agent/repo=.this/role=any/briefs/` | clean | best-guessed | 90% |
| F8-clamp-tests-four-facets | the clamp tests four facets per class | clean | best-guessed | 90% |
| F9-pin-ci-actions-in-this-pr | pin the ci actions in this pr | clean | best-guessed | 85% |
| F10-defer-depcheckrc-fix-upstream | defer the depcheck config fix to the declapract template | clean | overruled — fixed in #47, upstream #745 | settled |
| F11-fix-slow-test-jq-in-this-pr | fix the stale slow-test jq in this repo's `.test.yml`, not only upstream | clean | ruled — fixed in #47 (9e28ae3), upstream #744 | settled |

gaps: none
