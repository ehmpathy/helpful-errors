# F1 — name as an inherited prototype accessor

- fork, three options:
  - (a) `this.name = new.target.name`, an enumerable own property
  - (b) `Object.defineProperty(this, 'name', { value, enumerable: false, … })`, a non-enumerable own property stamped per instance
  - (c) one accessor on `HelpfulError.prototype`: the getter returns `this.constructor.name`; the setter writes an own non-enumerable data property
- taken: (c)
  - the class name yields to each override a subclass may declare: an assignment after `super()`, a class field, a prototype assignment, or a getter
  - (b) shadowed the last two, which silently changed the wire `errorType` of legacy subclasses that name themselves on the prototype (l3 review r10/r11, i003)
  - the stack header reads the class name on every engine, since `super()` already sees `new.target.prototype`
- cost: `toJSON` adds `name` explicitly, so F3 holds and the json key order stays `message, name, stack`
- rework: clean — one accessor block plus one `toJSON` line
- confidence: 92%. weak point: a consumer that reads `Object.getOwnPropertyNames(error)` no longer sees `name`; native errors behave the same way, since their `name` lives on the prototype too
- where: `src/HelpfulError.ts`, the accessor below the class and `toJSON`
- revision: the vision first took (b); the l3 review showed (b) shadows prototype and getter overrides, so (c) replaced it
- verdict: moot — the scope it served (`name` equals the class) was overturned 2026-10-22; see F6
