# `async` and `await`

## How is it implemented by language ?

Let's take the following `ink` code as an example :

```ink
expose async function fn () -> void {
  await thing();
}
```

### JavaScript

It uses promises and the `async` and `await` keywords.

```javascript
const fn = async () => {
  await thing();
}
```

### Kotlin

It uses coroutines and the `suspend` keyword.

```kotlin
suspend fun fn() {
  thing()
}
```