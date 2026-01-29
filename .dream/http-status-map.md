# http status map

## .what

built-in `statusCode` property on error classes for http api integration

## .why

- cleaner integration with api frameworks (express, lambda, etc)
- no need to map error types to status codes manually
- consistent status codes across services
- `BadRequestError` naturally maps to 400, etc

## .how

```ts
// built-in maps
class BadRequestError extends HelpfulError {
  public readonly statusCode = 400;
}

class UnexpectedCodePathError extends HelpfulError {
  public readonly statusCode = 500;
}

// custom errors
class NotFoundError extends HelpfulError {
  public readonly statusCode = 404;
}

// framework integration
app.use((error, req, res, next) => {
  const status = error.statusCode ?? 500;
  res.status(status).json({ error: error.message });
});
```

## .considerations

- should statusCode be overridable per instance?
- include status text? e.g., `statusText: 'Bad Request'`
- what about non-http contexts?
