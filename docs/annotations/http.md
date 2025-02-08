# `http` (draft)

## Supported languages

- [x] JS/TS through `@inklang/http` package
- [ ] Kotlin

## Types

### `headers`

```ink
var headers: @http:headers;
```

## Functions

### `create_headers`

```ink
var headers: @http::headers = @http::create_headers();
```

### `append_header`

Appends an header to a `@http::headers` object.

```ink
var headers: @http::headers = @http::create_headers();
@http::append_header(headers, "Content-Type", "application/json");
```
