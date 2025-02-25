# `string`

## Functions

### `strip_ctl`

Strips the [controls characters](https://en.wikipedia.org/wiki/Control_character) from a `string`.

```ink
var not_stripped: string = "\0\0";
var stripped: string = @string::strip_ctl(not_stripped);
@debug::print(stripped); // ""
```
