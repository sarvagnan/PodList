# PodList Apple

Phase 2, milestones 1–3: shared domain/data, the Mac Library, playback and downloads. Swift 6 language mode,
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
are grouped by this Device's Download Rule and open an Episode table with its rule controls. The Inspector
(toolbar or ⌘⌥I) shows Artwork, facts, plain-text show notes and Playlist Positions. The player
bar restores the Active Playlist's current Entry paused at its Position. Its three centred
lines are Episode name, podcast name and a scrubbable seek bar with Chapter ticks. Click the
Artwork for the Now Playing sheet, with larger controls and Chapter navigation. The queue
control opens the Active Playlist. App/File/Edit/View/Controls/Window/Help menus include
play/pause (Space outside text editing), skip forward/back (⌘→/⌘←), stop (⌘.), Speed, Sleep,
Chapters and Now Playing. There is no Xcode project or app bundle yet.

## Playback and downloads

AVPlayer plays downloaded audio first, otherwise the publisher directly, then the server's
existing Episode audio endpoint on failure or a ten-second loading timeout. Each source is
tried once per load, preserving Position and Speed. Failed playback offers Retry. Streaming
from a reachable publisher works while the server is offline. Speed preserves pitch using
AVFoundation's spectral algorithm; player Speed changes apply only to the loaded Episode.
Saved global settings and Subscription overrides supply Speed, Skip intro/outro and Volume
boost (+6 dB with peak limiting via a native audio processing tap).

The Played threshold updates State, History, Clear on Played and Cursor immediately while
the loaded Episode finishes its remaining audio. Actual end/outro advances to the reduced
Cursor. Sleep offers 5/10/15/30/45/60/90/120 minutes, end of Episode, and end of Chapter when
Chapters exist; Sleep wins over advancing. Publisher Chapters resolve through the existing
server endpoint and are cached locally; downloaded ID3 Chapters can be read offline.

ListeningSession produces durable Operations every 15 seconds and at pause, seek, Speed,
finish, background and quit boundaries. Explicit seeks never count as listening. After Played,
the tail emits only RecordListening. Failed local writes retain the report and stable ids for
retry. Sync uses the existing durable outbox and operation-id deduplication.

Media keys, Control Centre and AirPods use MPRemoteCommandCenter and MPNowPlayingInfoCenter
(metadata, resolved Artwork, Chapter index/count, duration, elapsed Position and rate). Closing
a window or dismissing Now Playing keeps audio running. Quit (⌘Q) waits for the local listening
flush; network upload remains best effort. The app stays in the Dock with no windows open.

Select an Episode for **Download**, **Cancel**, **Retry download** or **Remove download** in the
Inspector; a down-arrow marks stored Episodes in lists. Open a Subscription to change its
Download Rule on this Device: **Stream**, **When Episodes become an Entry**, or **As Episodes
are published**, with an optional newest-Episodes cap. Entry downloads are outside the cap;
Manual Downloads and Starred stored Episodes survive automatic cleanup. Rules run after State,
Library and download changes, debounced one second, with at most two transfers. Failed requests
wait for explicit retry/cancellation. An All New rule starts at activation, so it does not fetch
the demo's existing Back Catalogue; use the Entry rule or a Manual Download to try it.

Audio lives in `~/Library/Application Support/PodList/Audio/<server-database-id>/`. A separate
atomic manifest persists ownership, progress at completion, failed status, legacy activation
dates and queued requests. Filenames are SHA-256 Episode ids. Only complete, length-validated
files are atomically renamed into playable downloads; partials never appear as stored. URLSession
download delegates use a background session in an app bundle. SwiftPM's bare executable uses
a normal session (no bundle identity), so transfers continue with windows closed and interrupted
requests restart on the next launch. Bundled background requests are also reconciled and safely
retried after process restart rather than attaching stale callbacks to new requests.

### Try the demo's silent audio

1. Start `node packages/web/ui-flows/demo.mjs` from the repository root, then run the Mac app
   and connect to the printed server port as above.
2. Press Space or click Play. The demo serves valid silent MP3s matching each Episode's stated
   duration: elapsed Position should move even though nothing is audible. Back/forward, seeking
   and Speed work on this silence. Click Artwork to open Now Playing and Chapters.
3. Seek near the final 30 seconds: Played/History/Cursor update, but this Episode keeps playing
   until its actual end. Set Sleep to end of Episode to stop before the next Entry plays.
4. Download the selected Episode in the Inspector and wait for its downloaded indicator. Quit
   and reopen with the demo server stopped; its local Entry and downloaded audio remain usable.
5. Open a Subscription and choose **When Episodes become an Entry** to download its Unplayed
   Entries. Switch to Stream to exercise automatic cleanup; a Manual Download remains.
6. Close the window while playing and try media keys/Control Centre, then reopen from the Dock.

The agent sandbox can compile and run unit tests but cannot launch the app or play audio.
Live audio, media-key routing, Artwork display, VoiceOver and native window behavior require
manual validation on the Mac. App-bundle packaging/signing remains a later task.

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
- **PlaybackPolicy / DownloadPlanner** are platform-free decisions, mirrored from Android.
  DownloadStore owns durable local requests, ownership and atomic audio files; URLSession's
  delegate adapter reports transfer progress without exposing partials.
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
connection validation, health errors, persistence, cached startup and offline retry. New tests
use a fake player/clock and fake audio transport for threshold tails, end/outro/Sleep, seek and
Speed boundaries, failed-report retries, quit flushing, Now Playing mapping, Device-specific
download planning, two-transfer concurrency, cancellation races, incomplete files, host fallback,
restart ownership, Library invalidations and offline ID3 Chapters.
No shared vector needed changing. Tests use offline transports; live server networking and
visual/VoiceOver behavior need a manual run on the Mac (the agent sandbox cannot launch it).

## Next

Milestone 3 is implemented; live platform validation is pending the owner's Mac run.
Editing, full History/Listening Timeline/Rewind, Listening stats,
the remaining native commands, App Intents and the Mac MCP server remain later milestones.
Standalone feed polling, directory search, Subscribe/Unsubscribe, OPML, bringing a Library to a
server remain later work. RSS parsing and the persistent schema are ready for that work.
Saved Playback Settings are consumed here; their global/Subscription editing UI remains with
the remaining settings screens in milestone 4.
