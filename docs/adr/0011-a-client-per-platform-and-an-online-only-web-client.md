# A client per platform, and an online-only web client

PodList was one React build shipped as an installable PWA and an Electron app, with SQLite in the browser on both (ADR 0005). That local database allows one tab at a time, so a web client built on it could never behave like a web page: a second tab met an "open in another tab" wall. It exists for offline use, and offline use belongs to apps. So each platform gets its own client (decided 8 Nov 2026):

- **Web:** an online-only client that talks to the server. No local database, no offline, no install as a PWA. Any number of tabs work; pressing Play in one stops the others, as on Spotify's web player. Coordination is between tabs only; other Devices stay independent and sync Positions as they do now.
- **Android:** a fully native Kotlin app. **macOS:** a fully native Swift app. Both keep a local database, listen offline and keep working when the server can't be reached.
- **Electron:** stays, as the client for Windows, Linux and any desktop without its own native app, keeping its local database and offline use.

The PWA is retired once the Android app replaces it. Until then it keeps working: moving the web build online-only before then would take offline listening away from the phone.

This reverses ADR 0005's "one code path": the web client and Electron share the React screens over two data layers (server-backed and local), and the native clients are separate codebases, so ADR 0007's Capacitor step is dropped. The native clients reimplement the domain rules and pass the language-neutral conformance vectors (ADR 0007), which become their definition of correct behaviour. The cost, accepted for platform-correct apps, is three UI codebases to maintain, and new server read APIs for what the web client used to query locally.
