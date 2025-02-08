# `@` (or annotations)

Annotations are like macros that translates the code differently depending on the language.
They can only be used as type or function calls.

> If you're looking for available annotations, check the [annotations directory](./annotations).

## Why ?

There' so many different ways to do the same thing in different languages.
Annotations allow to have a common way to do things in *ink* and then transpile it to the target language.

## Syntax

```ink
// You can call a function annotation.
@namespace::function_name();

// You can type a variable with a type annotation.
var something: @namespace::type_property;
```

## Example

Let's use the [`http` annotation](./annotations/http.md) to create a new headers object.

```ink
var headers: @http::headers = @http::create_headers();
```

## Transpilation

When transpiling to another language, the annotation will be replaced by the code that the annotation represents.
It will also import the necessary modules if needed.

Let's take the previous example and transpile it to JavaScript (MJS) :

```javascript
import { createHeaders as _inklang__http_createHeaders } from "@inklang/http";

let headers = _inklang__http_createHeaders();
```

The `@http::create_headers()` (= `_inklang__http_createHeaders` here) annotation function is as simple as :

```javascript
export function createHeaders (): Headers {
  return new Headers();
}
```

and the `@http::headers` type is as simple as :

```typescript
export type { Headers }; // simple re-export since provided by JS directly
```
