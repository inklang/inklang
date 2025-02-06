# inklang

## Warnings

**Hold on !** This is a huge work in progress where features and supported languages
depending on expectations from Literate. This may change after the first major release.
For now, we’re only interested in translating to JavaScript and Kotlin but Swift support should come soon.

## Motivation

At [LiterateInk](https://literate.ink), we're writing librairies targetting multiple languages to provide support for most platforms.

For example, we absolutely need a JavaScript version for [Papillon](https://papillon.bzh), a Kotlin version for [Literate Android](https://github.com/LiterateInk/LiterateAndroid) and a Swift version for [Literate iOS](https://github.com/LiterateInk/LiterateIOS).

Before, we had a Rust structure with [`uniffi-rs`](https://github.com/mozilla/uniffi-rs) for Kotlin and Swift paired with `wasm-bindgen` to provide JavaScript bindings through WASM.

We ran into an issue where [React Native](https://github.com/facebook/react-native) was **NOT supporting WASM**, and even plugins to support it were doing nothing. To prevent this, we decided to move on and rewrite the library to JavaScript for Papillon. It was not a really fun process since we had to manage multiple codebases at once.

## What is inklang ?

Inklang is a language that compiles to whatever language you want that is supported.
It is designed to be simple and easy to use.

## Learn

You can start by heading to the [`./docs`](./docs/) directory.
If you prefer learning with examples, you can take a quick look to the [`./examples`](./examples/) directory.

## Resources & Credits

- <https://ruslanspivak.com/lsbasi-part1/>
- <https://www.craftinginterpreters.com/>

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
