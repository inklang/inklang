# `expose`

This keyword allows a function to be exposed when transpiling to another language
that supports the concept of a module or namespace.

Consider the following *ink* code snippet:

```ink
function add (a: u32, b: u32) -> u32 {
  return a + b;
}
```

If you transpile it to JavaScript, you will get:

```javascript
const add = (a, b) => {
  return a + b;
};
```

However, if you want to expose the function `add` as a member of a module, you can use the `expose` keyword:

```ink
expose function add (a: u32, b: u32) -> u32 {
  return a + b;
}
```

This will generate the following JavaScript (CJS mode) code:

```javascript
const add (a, b) => {
  return a + b;
};
exports.add = add;
```

or the following in JavaScript EJS mode:

```javascript
export const add (a, b) => {
  return a + b;
};
```
