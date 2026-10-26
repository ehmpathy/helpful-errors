# F9 — pin the ci actions in this pr

- fork: pin every workflow action to a full commit sha here vs a separate pr vs a fix upstream in the template the workflows come from
- taken: here. repo settings now refuse any action not pinned to a full sha, so every check failed at job setup; no pr on this repo can go green without the pins
- rework: clean — 46 refs across 6 files, each `<action>@<sha> # <tag>`
- confidence: 85%. weak point: if the workflows come from a shared template, the next template upgrade may overwrite the pins; the same pin is owed upstream
- where: `.github/workflows/*.yml`
- verdict: awaited
