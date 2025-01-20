# inklang

## Warnings

Hold on ! This is a huge work in progress where features and supported target languages depends on expectations from LiterateInk librairies.

This language is not really meant to be used outside of LiterateInk.
For now, we’re only interested in translating to JavaScript, Kotlin and Swift.

## Motivation

At LiterateInk, we want to support multiple languages to provide support for all platforms.

We notably need a JS version for [Papillon](https://github.com/PapillonApp/Papillon), a Kotlin version for our Literate app on Android and a Swift version for our Literate app on iOS !

Before, we had a Rust structure with `uniffi-rs` for Kotlin and Swift, and `wasm-bindgen` for the WASM (so basically JS)

We ran into an issue where React Native was **NOT supporting WASM**, and even plugins to support it were doing nothing. To prevent this, we decided to move on and rewrite the library to JS for Papillon users. Was not really fun to do since we had to manage multiple codebases at once now, literally the issue we tried to prevent by doing this all architecture…

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
