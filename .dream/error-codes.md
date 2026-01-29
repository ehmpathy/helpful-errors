# error codes

## .what

add support for error codes on all HelpfulError subclasses

## .why

- enables programmatic error handler logic by callers
- supports i18n (translate error messages by code)
- consistent api responses across services
- easier error track and dedupe in monitor tools

## .how

```ts
// usage
throw new BadRequestError('user not found', {
  code: 'USER_NOT_FOUND',
  userId: '123',
});

// programmatic handler
if (error.code === 'USER_NOT_FOUND') {
  // handle specifically
}

// api response
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "user not found"
  }
}
```

## .considerations

- should `code` be required or optional?
- namespace codes? e.g., `AUTH.USER_NOT_FOUND`
- export a registry of known codes for type safety?
