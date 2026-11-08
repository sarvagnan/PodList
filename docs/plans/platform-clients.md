# Platform clients plan

Status: draft for the owner's review. Decision record: [ADR 0011](../adr/0011-a-client-per-platform-and-an-online-only-web-client.md). Work is tracked under bead `pod-apx`.

## What we're building

| Client | Stack | Local data, offline | Automation |
|---|---|---|---|
| Android | Kotlin, Compose, Media3 | Yes | Media3 and app shortcuts, then exported intents, then AppFunctions |
| macOS, iOS, iPadOS | One SwiftUI codebase | Yes | App Intents on all three; MCP server on macOS |
| Windows, Linux, other desktops | Electron (existing React screens) | Yes, as today | MCP server |
| Web | Existing React screens over server APIs | No, online only | None |

The server stays the hub. It already applies the same domain rules as the clients and keeps the same SQLite schema (`packages/domain`, `SyncStore.ts`).

## What already exists

- **The sync contract:** clients push operations and pull everyone else's (`/sync/push`, `/sync/pull`), and pull catalogue changes (`/library/changes`).
- **The rules a native client must reimplement:** about 840 lines of TypeScript (`State`, `PlaylistRules`, `PlayedRules`, `TimelineRules`, `ViewQuery`, `Listening`).
- **11 conformance vectors** define correct merge behaviour in any language (ADR 0007). They don't yet cover every change or View filtering.
- **The screens to reproduce:** about 10,000 lines of React, specified by `docs/design/ui-layout.md`.
- **Toolchains on this Mac:** Xcode 27.2, Swift, Java and the Android SDK with an emulator.

## Phases

### 0. Make the contract complete (first, and everything depends on it)

Native clients are only as correct as this contract.

- Audit the vectors against every `Operation.Change`; add what's missing.
- Add vectors for View filtering and sorting, which are SQL in TypeScript today, and for how listening time is measured.
- Publish the HTTP API as a generated OpenAPI file next to the JSON Schema.
- Write down the client's duties: Device registration, sync triggers, Position reporting, the Played threshold, and direct streaming with server fallback (ADR 0009).

### 1. Android

Each milestone is usable on its own.

1. Project, native SQLite with the shared schema, the rules passing every vector.
2. Sync and read-only Library, Views and Playlists.
3. Playback (Media3: background, lock screen, Android Auto), downloads and Download Rules.
4. Every remaining screen, including Rewind and Listening stats; app shortcuts.
5. Parity check and regrade as an Android target, then retire the PWA. Exported intents follow; AppFunctions once out of preview.

### 2. Apple apps

The same milestones in SwiftUI, with iPhone first and the iPad and Mac layouts adapted from it. App Intents arrive with milestone 4. The Mac's native menus, media keys and MCP server come with its layout.

### 3. Web client goes online-only

- A data-layer seam in `packages/web`: today's local SQLite for Electron, server-backed for web. Everything in `app/data.ts` and `SyncEngine` moves behind it.
- New server read APIs. The server can run the same View compiler, so these are small: Views, filters, counts, Episode detail, stats, State.
- Live updates from the server so open tabs stay current.
- Many tabs, with Play in one stopping the others (`BroadcastChannel`).
- Remove the service worker, install manifest and tab lock from the web build.

The seam and APIs can be built alongside phase 1. **Only the switch waits**, because switching removes offline listening from the phone until the Android app replaces the PWA.

### 4. Electron for other desktops

Windows and Linux packaging, and the MCP server. The local data layer stays.

## Risks

- **Three UI codebases.** Every future feature is built up to three times. `ui-layout.md` becomes the shared spec and has to be kept current.
- **Rule drift between languages.** Vector coverage is the defence, which is why phase 0 comes first.
- **Scale.** Two full native apps are far more work than anything done so far on this project.
- **The tailnet.** Native apps reach the server over Tailscale as the PWA does (ADR 0004), so Tailscale is needed on each device for sync.

## Questions for the owner

1. **Order:** Android first, then Apple? Android retires the PWA. If you use an iPhone day to day, Apple may be the better first target, though the PWA couldn't retire until Android is done.
2. **Minimum versions:** recommended Android 10 and later; iOS, iPadOS and macOS current and one back.
3. **Distribution:** sideloaded Android builds or Play Store? iOS needs the Apple Developer account in any case: TestFlight or direct installs?
4. **The Mac app during phase 2:** Electron stays usable on the Mac until the Swift app reaches parity, then Electron stops being offered for macOS. Agreed?
5. **Moving phones over:** the server holds everything except Downloads and any edits not yet synced. Plan: sync, install the app, re-download. Acceptable?
