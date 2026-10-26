## .what

a bhuild skill run against an older installed `rhachet-roles-bhuild` crashes with a raw node stack, not a version hint.

## .evidence

- ehmpathy/helpful-errors, branch `beav/fix-error-name-from-class`: the tree installed `rhachet-roles-bhuild@0.21.25`, while the linked role skills came from a newer bhuild (latest 0.23.3)
- `rhx radio.task.push …` and `rhx catch.dream …` each died with:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './cli' is not defined by "exports" in …/node_modules/rhachet-roles-bhuild/package.json imported from …/[eval]
```

- the cure was `rhx set.package.upgrade --package rhachet-roles-bhuild --to 0.23.3`; the push then ran. no message pointed there

## .ask

- the skill shim checks the installed bhuild for the `./cli` export (or a minimum version) before the import
- when absent, fail with `✋ ConstraintError` and exit 2, with the installed version, the needed version, and the fix: `rhx set.package.upgrade --package rhachet-roles-bhuild --to <version>`
- clamp it: a test that runs a skill against a package without `./cli` and asserts the hint, never `ERR_PACKAGE_PATH_NOT_EXPORTED`

## .side note, same dispatcher

`radio.task.push` printed `rhx keyrack unlock --owner ehmpath --key EHMPATH_BEAVER_GITHUB_TOKEN --env prep` as its fix, but that key is not declared for `prep` in this repo's keyrack.yml, so the printed fix itself refuses (`key not found in manifest`). the hint should name a command that works in the caller's repo.
