# F2 — keep the class-name prefix in the message

- fork: keep `✋ ConstraintError: msg` as the message (so `String(error)` doubles the name) vs drop the prefix now that `name` carries it
- taken: keep. the wish bounds this to a `fix` with no input change; a message change breaks every consumer assertion on messages
- rework: clean — the prefix logic is one block, removable in a later `feat`
- confidence: 85%. low part: the doubled header reads slightly odd in logs
- where: `src/HelpfulError.ts:90-97`
- verdict: held, by the human, 2026-10-22 — the prefix stays and the message is never changed. under the new scope it is the ground for F6: the class already leads the message, so `name` stays `'Error'`
