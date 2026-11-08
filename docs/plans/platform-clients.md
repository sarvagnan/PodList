# Platform clients plan

Status: agreed with the owner on 8 Nov 2026. Decision record: [ADR 0011](../adr/0011-a-client-per-platform-and-an-online-only-web-client.md). Work is tracked under bead `pod-apx`.

## What we're building

This is the full set of clients. **The Android phone app comes first, then the Mac app, and only then the other screen sizes** (see Phases).

| Client | Stack | Screens | Local data, offline | Automation |
|---|---|---|---|---|
| Android | Kotlin, Compose, Material 3, Media3 | Phones, foldables, tablets, desktop windows, Android Auto | Yes | Media3 and app shortcuts, then exported intents, then AppFunctions |
| macOS, iOS, iPadOS | One SwiftUI codebase | iPhones including the foldable Duo, iPads, Mac windows, CarPlay | Yes | App Intents on all three; MCP server on macOS |
| Windows, Linux, other desktops | Electron (existing React screens) | Desktop windows | Yes, as today | MCP server |
| Web | Existing React screens over server APIs | Any browser window | No, online only | None |

Electron also keeps running on the Mac. There we recommend the native app, but nothing stops anyone using Electron.

**Minimum versions** (current release plus the number back that the owner chose; reviewed when a new major version ships):

| Platform | Current | Minimum |
|---|---|---|
| Android | 17 (API 37) | 14 (API 34) |
| iOS, iPadOS, macOS | 27 | 26 |

The server stays the hub. It already applies the same domain rules as the clients and keeps the same SQLite schema (`packages/domain`, `SyncStore.ts`).

**Not a concern yet:** how the apps are installed. The owner will probably get developer accounts for both stores; emulators and simulators need neither until then. CarPlay needs an entitlement from Apple, so it waits for the Apple account. There is no switchover either: PodList has no users yet, so no phone needs moving from the PWA to the app.

## Repository layout

Everything stays in this repository, with the native apps in `apps/android` and `apps/apple`. They are ordinary Gradle and Xcode projects outside the pnpm workspace.

Comparable projects are split on this:

| Separate repository per platform | One repository |
|---|---|
| Signal, Element X, Pocket Casts, Bitwarden (mobile apps apart; web, desktop and CLI together), Home Assistant, Nextcloud, Audiobookshelf | Immich (server, web, mobile and generated OpenAPI), Firefox (desktop, Android and iOS) |

Separate repositories mostly suit separate teams with their own contributors and release schedules. PodList has one owner, and what ties its clients together is the contract: the vectors, schema and domain rules. In one repository, a protocol change and the matching change in every client land in one commit and are checked together. Across repositories, the vectors would need versioning and publishing, and each client would drift until someone updated it.

The usual costs of one repository are handled by each client having its own build and release tags, and by CI running only what a change touches. **The exception is `packages/domain`: any change there runs every client's vector tests.** Splitting a client out later is cheap, because `git filter-repo` keeps its history.

## What already exists

- **The sync contract:** clients push operations and pull everyone else's (`/sync/push`, `/sync/pull`), and pull catalogue changes (`/library/changes`).
- **The rules a native client must reimplement:** about 840 lines of TypeScript (`State`, `PlaylistRules`, `PlayedRules`, `TimelineRules`, `ViewQuery`, `Listening`).
- **11 conformance vectors** define correct merge behaviour in any language (ADR 0007). They don't yet cover every change or View filtering.
- **The product design:** about 10,000 lines of React and `docs/design/product-behaviour.md`. These describe what the product does. They are not a layout for the native apps to copy.
- **Toolchains on this Mac:** Xcode 27.2 with an iPhone Duo simulator, and the Android SDK with API 37 and emulator profiles for phones, foldables, tablets and resizable desktop windows.

## Platform conventions

Native apps are only worth their cost if they feel native, so each one follows its own platform. What the clients share is **what the product does**. What differs is **how it's presented**.

**Shared across every client:** the domain language (`CONTEXT.md`), the rules and sync, the features, and behaviour decisions such as Unsubscribe asking first and still offering Undo afterwards.

**Each platform decides for itself:** navigation, components, gestures, type, and where each action lives.

| | Android | iPhone | iPad | Mac |
|---|---|---|---|---|
| Follows | Material 3 | Human Interface Guidelines | Human Interface Guidelines | Human Interface Guidelines |
| Navigation | Bar on compact windows, rail on wider ones; predictive back | Tab bar and navigation stacks | Sidebar, split view | Sidebar and window toolbar |
| Row actions | Long press to select, contextual bar, swipe | Swipe actions, long-press context menu | Those, plus pointer hover and right-click | Right-click, full menu bar, keyboard shortcuts |
| Undo | Snackbar with Undo | Inline confirmation, shake to undo | Inline confirmation, ⌘Z | Edit menu, ⌘Z |
| Sheets and panels | Bottom sheets, side sheets | Sheets with detents | Popovers and sheets | Popovers, separate Settings window |
| System integration | Edge to edge, media notification, Android Auto | Dynamic Type, lock screen, CarPlay | Stage Manager, external keyboard | Media keys, multiple windows |

Shared behaviour lives in `docs/design/product-behaviour.md`, and each platform has its own layout document, starting with `web-layout.md`. Each platform's first screens are mocked and chosen the same way the web layout was.

**Look (owner, 8 Nov 2026):** native apps use platform components and system fonts (Roboto, San Francisco), keep PodList's blue as the accent, and have dark mode from the start. Inter, Space Grotesk and light-only remain web decisions.

Each client gets its own UI grading, as its own target. The brief names that platform's guidelines, so Platform fit means fit with Material or the HIG, and the flow runs cover every screen size below.

## Screen sizes

This is where each native app ends up. The Android phone and Mac layouts come first. They are built on the adaptive structures below from the first screen, so later sizes extend them without a rewrite, but only the current target is designed and checked until the others' turn. Layouts respond to the window and not to the device type.

**Android** is one adaptive app:

- **Phones:** compact windows, single pane.
- **Foldables:** the outer and inner screens, keeping your place when folding or unfolding. Tabletop posture puts the artwork above the fold and the controls below it on Now Playing.
- **Tablets:** portrait and landscape, with list and detail side by side at expanded width, built on `NavigationSuiteScaffold` and `ListDetailPaneScaffold`.
- **Split screen and desktop windows:** any size, with keyboard, mouse and right-click.
- **Android Auto:** through Media3.

Android 17 ignores orientation and resizing locks on large screens, so this is required anyway when targeting API 37. Phase 1 is checked on phone profiles; phase 3 adds the foldable, tablet and resizable ones.

**Apple** is one SwiftUI codebase:

- **iPhone:** from the smallest supported size to the Pro Max.
- **iPhone Duo:** a 5.4-inch outer and a 7.6-inch inner screen, keeping your place on folding. The inner screen uses the wider layout.
- **iPad:** every size, in freely resizable windows.
- **Mac:** resizable windows.
- **CarPlay:** added once the entitlement is granted.

Layouts collapse through `NavigationSplitView` and size classes. Phase 2 is checked on Mac windows; phase 3 adds the small iPhone, Duo and iPad targets.

## Phases

### 0. Make the contract complete (first, and everything depends on it)

Native clients are only as correct as this contract.

- Audit the vectors against every `Operation.Change`; add what's missing.
- Add vectors for View filtering and sorting, which are SQL in TypeScript today, and for how listening time is measured.
- Publish the HTTP API as a generated OpenAPI file next to the JSON Schema.
- Write down the client's duties: Device registration, sync triggers, Position reporting, the Played threshold, and direct streaming with server fallback (ADR 0009).

### 1. Android phone

Each milestone is usable on its own.

1. Project in `apps/android`, native SQLite with the shared schema, the rules passing every vector.
2. Android layout document and chosen mock-ups; sync and read-only Library, Views and Playlists.
3. Playback (Media3: background, lock screen, Android Auto), downloads and Download Rules.
4. Every remaining screen, including Rewind and Listening stats; app shortcuts.
5. Parity check and regrade as an Android phone target. Exported intents follow; AppFunctions once out of preview.

### 2. Mac desktop

The same milestones in SwiftUI, in `apps/apple`. The project is set up as one multiplatform codebase, but only macOS is built out here.

1. Project, native SQLite, the rules passing every vector.
2. Mac layout document and chosen mock-ups; sync and read-only Library, Views and Playlists in resizable windows.
3. Playback (background, media keys, Now Playing), downloads and Download Rules.
4. Every remaining screen; native menus and keyboard shortcuts; App Intents; the MCP server.
5. Parity check and regrade as a Mac target.

### 3. The other screen sizes

Extends the two apps above. The order is chosen when phase 2 finishes.

- **Android:** foldables, tablets, split screen and desktop windows.
- **Apple:** iPhone, iPhone Duo and iPad, then CarPlay once the entitlement is granted.

Each new size gets its layout document, mock-ups and regrade.

### 4. Web client goes online-only

- A data-layer seam in `packages/web`: today's local SQLite for Electron, server-backed for web. Everything in `app/data.ts` and `SyncEngine` moves behind it.
- New server read APIs. The server can run the same View compiler, so these are small: Views, filters, counts, Episode detail, stats, State.
- Live updates from the server so open tabs stay current.
- Many tabs, with Play in one stopping the others (`BroadcastChannel`).
- Remove the service worker, install manifest and tab lock from the web build.

This doesn't wait for the native apps. It can be built alongside phase 1 and ships when it's ready, and the PWA retires with it (owner, 8 Nov 2026).

### 5. Electron for other desktops

Windows and Linux packaging, and the MCP server. The local data layer stays, and the macOS build carries on.

## Risks

- **Three UI codebases.** Every future feature is built up to three times, and each platform's layout document has to be kept current.
- **Rule drift between languages.** Vector coverage is the defence, which is why phase 0 comes first.
- **Scale.** Two full native apps, each across many screen sizes, are far more work than anything done so far on this project.
- **The tailnet.** Native apps reach the server over Tailscale as the PWA does (ADR 0004), so Tailscale is needed on each device for sync.

## Not on the roadmap

Watches, TVs and Vision Pro (owner, 8 Nov 2026: not at the moment).
