# helpful-errors

![test](https://github.com/ehmpathy/helpful-errors/workflows/test/badge.svg)
![publish](https://github.com/ehmpathy/helpful-errors/workflows/publish/badge.svg)

Standardized helpful errors and methods for simpler, safer, and easier to read code.

# Purpose

Standardize on helpful errors for simpler, safer, easier to read code
- extend the `HelpfulError` for observable and actionable error messages
- leverage the `UnexpectedCodePath` to eliminate complexity with narrowed codepaths
- leverage the `BadRequestError` to make it clear when your logic successfully rejected a request
- test that logic throws errors ergonomically with `getError`

# install

```sh
npm install --save helpful-errors
```

# use

### UnexpectedCodePathError

The `UnexpectedCodePath` error is probably the most common type of error you'll throw.

It's common in business logic that you'll face a scenario that is technically possible but logically shouldn't occur.

For example, lets say you're writing on-vehicle code to check the tire pressures of a vehicle.

```ts
// given the tires to check
const tires = Tire[];

// first get the tire pressures for each
const tirePressures: number[] = tires.map(tire => getTirePressure(tire));

// now get the lowest tire pressure
const lowestTirePressure: number | undefined = tires.sort()[0];
```

In this case, its technically possible that `lowestTirePressure` could be undefined: there could not be any tires.

However, this is definitely an unexpected code path for our application. We can just halt our logic if we reach here, since we dont need to solve for it.

```ts
// sanity check that we do have a tire pressure
if (lowestTirePressure === undefined)
  throw new UnexpectedCodePath('no tire pressures found. can not compute lowest tire pressure', { tires });
```

With this, the type of `lowestTirePressure` has been narrowed from `number | undefined` to just `number`, so you wont have any type errors anymore.

Further, if this case does occur in real life, then it will be really easy to debug what happened and why. Your error message will include the `tires` input that caused the problem making this a breeze to debug. No more `could not read property 'x' of undefined`!

### BadRequestError

The `BadRequestError` is probably the next most common type of error you'll throw.

It's common in business logic that callers will try to execute your logic with inputs that are simply logically not valid. The user may not understand that their input is not valid or there may just be a bug upstream that is resulting in invalid requests.

For example, imagine you have an api that returns the liked songs of a user
```ts
const getLikedSongsByUser = ({ userUuid }: { userUuid: string }) => {
  // lookup the user
  const user = await userDao.findByUuid({ uuid: userUuid });

  // if the user does not exist, this is an invalid request. we shouldn't be asked to lookup songs for fake users
  if (!user)
    throw new BadRequestError('user does not exist for uuid', { userUuid });

  // use a property of the user to lookup their favorite songs
  const songs = await spotifyApi.getLikesForUser({ spotifyUserId: user.spotifyUserId });
}
```

Whatever the reason for a caller making a logically invalid request, it's important to distinguish when *your code* is at fault versus when *the request* is at fault.

This is particularly useful when monitoring error rates. Its important to distinguish whether your software `failed to execute` or whether it `successfully rejected` the request for observability in monitoring for issues. The `BadRequestError` enables us to do this easily

For example, libraries such as the [simple-lambda-handlers](https://github.com/ehmpathy/simple-lambda-handlers) leverage `BadRequestErrors` to ensure that a bad request both successfully returns an error to the caller but is not marked as an lambda invocation error.

### HelpfulError

The `HelpfulError` is the backbone of this pattern and is what you'll `extend` whenever you want to create a custom error.

The purpose of this error is to be as helpful as possible to whoever has to read it when its thrown.

To fulfill this goal, the error makes it very easy to specify what the issue was as well as any other information that may be helpful to understanding why it occurred at the time. It then pretty prints this information to make it easy to read when observing.

```ts
throw new HelpfulError(
  'the message of the error goes here',
  {
    context,
    relevantInfo,
    potentiallyHelpfulVariables,
    goHere,
  }
)
```

#### .metadata generic

You can define typed metadata for your custom error classes via the generic type parameter:

```ts
class UserError extends HelpfulError<{ userId: string; action: string }> {}

const error = new UserError('operation failed', {
  userId: '123',
  action: 'delete'
});

// typed access to metadata
error.metadata.userId;  // string
error.metadata.action;  // string
error.metadata.wrong;   // typescript error
```

#### .metadata getter

Access the original metadata object via the `.metadata` getter:

```ts
const error = new HelpfulError('failed', {
  userId: '123',
  context: { action: 'delete' }
});

// access original metadata (not the formatted message)
console.log(error.metadata);
// { userId: '123', context: { action: 'delete' } }

// useful for programmatic access
if (error.metadata.userId) {
  trackErrorByUser(error.metadata.userId);
}
```

Note: the `.metadata` property is non-enumerable, so it won't appear in `Object.keys()` or `JSON.stringify()` output — the metadata is already serialized in the message.

#### environment variables

Control error message format via `ERROR_EXPAND`:

```sh
# default: pretty-printed json (multi-line)
ERROR_EXPAND=true

# compact single-line json
ERROR_EXPAND=false
```

### getError

The `getError` method is the cherry-on-top of this library.

When you write tests for logic that throws an error in certain situations, you may want to verify that the code indeed throws this error in a test.

The `getError` utility makes it really easy to assert that the expected error is thrown.

Under the hood, it executes or awaits the logic or promise you give it as input, catches the error that is thrown, or returns a `NoErrorThrownError` if no error occurred. It does the legwork of all three cases you may need to use it in and defines the return type correctly.

usecase 1: synchronous logic
```ts
const doSomething = () => { throw new HelpfulError('found me'); }

const error = getError(() => doSomething())
expect(error).toBeInstanceOf(HelpfulError);
expect(error.message).toContain('found me')
```

usecase 2: asynchronous logic
```ts
const doSomething = async () => { throw new HelpfulError('found me'); }

const error = await getError(() => doSomething())
expect(error).toBeInstanceOf(HelpfulError);
expect(error.message).toContain('found me')
```

usecase 3: a promise
```ts
const doSomething = async () => { throw new HelpfulError('found me'); }

const error = await getError(doSomething())
expect(error).toBeInstanceOf(HelpfulError);
expect(error.message).toContain('found me')
```

### .throw

The errors extended from the `HelpfulError` include a `.throw` static method for convenient usage with ternaries or condition chains

For example, instead of
```ts
const phone = customer.phoneNumber ?? (() => {
  throw new UnexpectedCodePathError(
    'customer has relationship without phone number. how is that possible?',
    { customer },
  );
})();
```

You can simply write
```ts
const phone = customer.phoneNumber ?? UnexpectedCodePathError.throw(
  'customer does not have a phone. how is that possible?',
  { customer },
);
```

### .wrap

The errors extended from `HelpfulError` include a `.wrap` static method for wrapping functions with helpful error handling. This provides a cleaner alternative to try-catch blocks while automatically preserving error context.

For example, instead of:
```ts
const getUser = async (id: string) => {
  try {
    return await database.query('SELECT * FROM users WHERE id = ?', [id]);
  } catch (error) {
    throw new HelpfulError('could not get user', {
      userId: id,
      cause: error,
    });
  }
};
```

You can simply write:
```ts
const getUser = HelpfulError.wrap(
  async (id: string) => {
    return await database.query('SELECT * FROM users WHERE id = ?', [id]);
  },
  {
    message: 'could not get user',
    metadata: { table: 'users' },
  }
);
```

The `.wrap` method works with both synchronous and asynchronous functions, and automatically uses the correct error variant:

```ts
// Works with custom error variants
const validateEmail = BadRequestError.wrap(
  (email: string) => {
    if (!email.includes('@')) throw new Error('invalid format');
    return email;
  },
  {
    message: 'email validation failed',
    metadata: { field: 'email' },
  }
);

// Works with async functions
const processPayment = HelpfulError.wrap(
  async (amount: number) => {
    return await paymentGateway.charge(amount);
  },
  {
    message: 'could not process payment',
    metadata: { service: 'stripe' },
  }
);
```

### .redact

The errors extended from `HelpfulError` include a `.redact` method for creating redacted clones of errors. This is useful when you need to prevent internal implementation details from leaking to frontends or external systems.

The `.redact` method accepts an array specifying which parts to redact: `['metadata']`, `['cause']`, or both `['metadata', 'cause']`.

```ts
// imagine you have an error with some internal details you'd like to keep private
const error = new HelpfulError('failed to fetch user profile', {
  query: 'SELECT * FROM users WHERE id = ?',
  params: {
    userId: 'usr_123',
  },
  cause: new Error('ECONNREFUSED: connection timeout'),
});

// you can redact both metadata and cause, to make it safe to expose
const redactedForFrontend = error.redact(['metadata', 'cause']);
console.log(redactedForFrontend.message); // "failed to fetch user profile"
console.log(redactedForFrontend.cause); // undefined
```

### HelpfulError parameter options.cause

The .cause parameter is a helpful feature of native errors. It allows you to chain errors together in a way that retains the full stack trace across errors.

For example, sometimes, the original error that your code experiences can be reworded to make it easier to debug. By using the .cause option, you're able to retain the stack trace and reference of the original error while throwing a new, more helpful, error.

```ts
// imagine you're using some api which throws an unhelpful error
const apiGetS3Object = async (input: { key: string }) => { throw new Error("no access") }

// you can catch and extend the error to add more context
const helpfulGetS3Object = async (input: { key: string }) => {
  try {
    await getS3Object();
  } catch (error) {
    if (error.message === "no access") throw HelpfulError("getS3Object.error: could not get object", {
      cause: error, // !: by adding the "cause" here, we'll retain the stack trace of the original error
      input,
    })
  }
}
```

### .toJSON

HelpfulError includes a custom `.toJSON()` method for helpful serialization.

By default, errors omit `message` and `stack` from serialization. Helpful errors, instead, explicitly includes them to save dev's hours via clear errors that surface full context:

```ts
const error = new HelpfulError('failed', { userId: '123' });

JSON.stringify(error);
// {
//   "name": "HelpfulError",
//   "message": "failed, { \"userId\": \"123\" }",
//   "stack": "..."
// }

// useful for api responses
res.status(500).json({ error: error.toJSON() });
```
