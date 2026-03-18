# rule.forbid.barrel-imports-from-typefns

## .what

never import from `'type-fns'` barrel in this repo; always use scoped imports.

## .why

circular dependency hazard:

```
helpful-errors → type-fns (barrel)
     ↑               ↓
     │          re-exports withAssure
     │               ↓
     └───── withAssure imports HelpfulError
```

the type-fns barrel re-exports `withAssure`, which imports `HelpfulError` from this package. barrel import creates a circular dependency at runtime.

## .pattern

```ts
// forbidden - barrel import triggers cycle
import { isAFunction, isAPromise } from 'type-fns';

// required - scoped imports avoid cycle
import { isAFunction } from 'type-fns/dist/checks/isAFunction';
import { isAPromise } from 'type-fns/dist/checks/isAPromise';
import { omit } from 'type-fns/dist/companions/omit';
```

## .enforcement

barrel import from type-fns = blocker
