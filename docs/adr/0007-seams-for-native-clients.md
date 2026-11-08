# Keep three seams so native clients stay possible

> Updated by ADR 0011: native Kotlin and Swift clients replace the planned Capacitor step; the conformance vectors stay their definition of correct behaviour.

v1 ships as a PWA and an Electron app, but a native client is likely later — for Android Auto/CarPlay and dependable background playback, which a PWA can never provide. To keep every route open (a Capacitor shell around the web UI, native UI over the shared TypeScript domain running in an embedded JS engine, or a fully native rewrite), we hold three seams from day one:

1. **The `domain` package is platform-free**: pure functions and Effect Schemas only — no DOM, browser storage, `fetch` or Node APIs — so it can run in JavaScriptCore/Hermes/QuickJS or serve as the reference for a rewrite.
2. **The sync protocol is language-neutral**: operation Schemas are exported as versioned JSON Schema, and a shared set of JSON test vectors (state + operations → expected state) is the conformance suite every client implementation, in any language, must pass. The vectors, not any one implementation, define correct merge behaviour (ADR 0003).
3. **Platform capabilities sit behind interfaces in the client**: audio playback (`Player`), offline audio storage (`DownloadStore`) and the local database. The web build provides browser implementations; a native shell swaps in Media3/AVPlayer, system download managers and native SQLite without touching the UI.

The planned first native step is Capacitor on Android, taken when Android Auto is wanted or PWA background playback proves unreliable.
