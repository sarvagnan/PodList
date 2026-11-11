# PodList Apple

Phase 2, milestones 1 and 2: the shared domain/data foundation and read-only Mac app. Swift 6 language mode,
macOS 26 and iOS 26 minimums, no third-party packages. The installed Swift 6.4 toolchain
builds this package. The Mac window follows variant B in `docs/design/mac.md`.

## Build and test

From this directory, keep the compiler module caches inside the worktree:

```sh
export CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$PWD/.build/module-cache"
swift build --scratch-path .build
swift test --scratch-path .build
swift build --product PodListMac
```

In an agent sandbox that cannot launch SwiftPM's nested sandbox, use:

```sh
swift build --scratch-path .build --disable-sandbox \
  --cache-path .build/cache --config-path .build/config --security-path .build/security
swift test --scratch-path .build --disable-sandbox \
  --cache-path .build/cache --config-path .build/config --security-path .build/security
```

The second form also keeps SwiftPM's configuration, security directory and manifest cache
inside `.build/`. It disables SwiftPM's nested sandbox; the enclosing agent sandbox still
applies. `.build/` and `.swiftpm/` are ignored by git.

## Run the Mac app

Start the repository's demo server from the repository root:

```sh
node packages/web/ui-flows/demo.mjs
```

It prints the server port. In a second terminal, from `apps/apple`, set the module-cache
environment above and run:

```sh
swift run PodListMac
```

On Welcome, enter `http://127.0.0.1:PORT` with the printed port, then **Check and connect**.
Other servers require an HTTPS origin; paths, credentials, queries and fragments are rejected.
There is no application login. The app uses the existing URLSession transport and protocol
Device kind `desktop`. The demo port must stay the same to reuse its connection after restart.

Connection preferences and the remembered Inspector setting use UserDefaults. Local SQLite
databases live under `~/Library/Application Support/PodList/`, separately for each server
origin. Disconnect in Settings (⌘,) returns every window to Welcome, keeps that server's
local data and Device identity, and never mixes it with another server. Reconnecting to the
same origin reuses its database. Launch reads the local Library before background sync;
startup, foreground, network recovery and periodic passes request sync. Failures preserve
cached data and offer **Try again**. Multiple windows share the session and keep independent
navigation, Search, sorting and Episode selections.

The sidebar holds Views, Playlists (Active marked, then Trash), and Library. Views and Search
show sortable Episode tables; Playlist Entries preserve order and mark the Cursor. Subscriptions
are grouped by this Device's Download Rule and open a read-only Episode table. The Inspector
(toolbar or ⌘⌥I) shows Artwork, facts, plain-text show notes and Playlist Positions. The player
bar is visible only for the Active Playlist's current Entry, paused at its Position, with
podcast and Episode names **above** the seek bar. Playback controls are disabled. App/File/
Edit/View/Window/Help menus use standard SwiftUI commands, including Sidebar and Inspector
visibility. There is no Xcode project or app bundle yet.

## Modules

- **PodListDomain** uses Foundation only. Codable, Equatable, Sendable protocol types;
  Operations and every Change; State replay with explicit deduplication; Playlists,
  Entries, Cursor, History, Trash, Clear on Played, Positions, Listening Timeline,
  Rewind, Views, Download Rules and Playback Settings. `Listening` measures local-day
  listening amounts; `ListeningSession` produces Changes at playback boundaries.
  `ViewRules` evaluates a Library in memory using the pinned Unicode 17 Mentions fold.
- **PodListData** imports the SDK's system `SQLite3` module. `LocalDatabase` is an actor
  owning its SQLite connection, scoped migrations, Library upserts, State documents and
  indexes, stable Device identity, sequence, outbox and separate confirmed State/cursors.
  Related edits and pull commits are transactional. `ViewQuery` binds filter values and
  orders ties using SQLite's binary collation. Shared and client migrations are checked
  against TypeScript and Kotlin sources, including the Mentions backfill.
- **SyncClient** is an actor with coalesced runs and a `SyncTransport` protocol. Registration
  retries preserve the Device; push retries preserve Operations; successful pulls acknowledge
  only the sent outbox snapshot and replay intervening local edits. Library paging continues
  independently of State failures. Episodes arriving before their Subscription wait, with the
  durable Library cursor held back until they can be written. No HTTP runs in a transaction.
  `HttpTransport` uses URLSession without credentials, cookies or redirects. Server addresses
  require an HTTPS origin, with an explicit localhost HTTP option for development.
- **FeedParser** uses Foundation's streaming XML parser for RSS, enclosure and chapter-source
  metadata, publisher dates and durations. It rejects DTD/entity declarations and feeds over
  32 MiB measured as UTF-8 bytes.
- **PodListUI** holds main-actor observable application/window models, immutable Sendable
  Library projections, connection validation, and the SwiftUI screens. Domain and data stay
  independent of SwiftUI. The Mac presentation is conditionally compiled; models can be reused
  by the later iPhone/iPad targets. `LocalDatabase.readLibrary()` adds a consistent typed read
  of State and Library without changing sync or domain behavior.
- **PodListMac** is the minimal SwiftPM executable: `@main App`, WindowGroup, Settings and
  Help scenes, and native commands. No third-party packages.
- **ProtocolTestSupport** is an internal test helper target. Fixtures are found by walking
  upward from `#filePath` to `packages/domain/protocol`; no vectors are copied or bundled.

The current contract has only `pwa`, `desktop` and `android` Device kinds. This package
registers as `desktop` with the name “PodList Apple”; it introduces no Apple-specific wire
value. `MarkSubscriptionPlayed` and `SetSubscriptionOverrides` remain server intentions in
shared replay. A Standalone Device database expands them locally and stores local Operations
without putting them in the server outbox.

## Verification

`swift test` exercises all 21 operation-vector files, every checkpoint, Operation/State JSON
round-trips and duplicate delivery; all 4 cumulative server logs; all 68 View cases both in
memory and against SQLite; 25 listening samples, 11 Played thresholds and 2 listening sessions;
and all 12 RSS and 16 duration cases. Every vector State also round-trips through SQLite and
its Entry index. Coverage checks detect a new contract document or Change tag without a runner.

Offline transport tests cover registration retry, lost push responses, edits recorded during
pull, separate State/Library failures and cursors, Library paging across restart, waiting
Episodes, malformed cursor progression, unresolved Subscriptions, failed-pull acknowledgement,
and Listening log deduplication across restart. Database tests cover durable sequences, atomic
rollback, nested savepoints, schema drift and migration backfill over multiple batches.

UI-model tests use in-memory SQLite and fake transports to cover sidebar counts, per-Device
Download Rule groups, View rows/filtering/sorting, ordered Playlist Entries and Cursor,
per-Entry Positions, player names/times/Artwork, pending metadata, plain-text show notes,
connection validation, health errors, persistence, cached startup and offline retry.
No shared vector needed changing. Tests use offline transports; live server networking and
visual/VoiceOver behavior need a manual run on the Mac (the agent sandbox cannot launch it).

## Next

Milestone 3 adds audio playback, background audio, media keys, system Now Playing, downloads
and Download Rule execution. Editing, full History/Listening Timeline/Rewind, Listening stats,
the remaining native commands, App Intents and the Mac MCP server remain later milestones.
Standalone feed polling, directory search, Subscribe/Unsubscribe, OPML, bringing a Library to a
server, and publisher Chapter fetching are not ported in this foundation package; RSS parsing
and the persistent schema are ready for that work. Android's UI/action helpers are not ported.
