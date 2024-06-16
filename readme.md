# error-fns

![ci_on_commit](https://github.com/ehmpathy/error-fns/workflows/ci_on_commit/badge.svg)
![deploy_on_tag](https://github.com/ehmpathy/error-fns/workflows/deploy_on_tag/badge.svg)

Standardized helpful errors and methods for simpler, safer, and easier to read code.

# Purpose

Standardize on helpful errors for simpler, safer, easier to read code
- extend the `HelpfulError` for observable and actionable error messages
- leverage the `UnexpectedCodePath` to eliminate complexity with narrowed codepaths
- leverage the `BadRequestError` to make it clear when your logic successfully rejected a request
- test that logic throws errors ergonomically with `getError`

# install

```sh
npm install --save @ehmpathy/error-fns
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

### getError

The `getError` method is the cherry-on-top of this library.

When writing tests for logic that throws an error in certain situations, you may want to verify that the code indeed throws this error in a test.

The `getError` utility makes it really easy to assert that the expected error is thrown.

Under the hood, it executes or awaits the logic or promise you give it as input, catches the error that is throw, or throws a NoErrorThrownError of its own. It does the legwork of handling all three cases you may need to use it in and defining the return type correctly.

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
