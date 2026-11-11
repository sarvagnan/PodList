# PodList Apple

Phase 2, milestones 1–4: shared domain/data, the Mac Library, playback, downloads, Playlist editing, Library, Views, Settings and automation. Swift 6 language mode,
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
manual validation on the Mac. A local development bundle is available below; distribution signing remains later work.

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
- **PodListAutomation** contains Sendable JSON values, the MCP message handler and the local
  Unix socket transport. It has no UI or database dependency.
- **PodListMac** is the SwiftPM executable: `@main App`, WindowGroup, Settings and Help
  scenes, native commands, App Intents and the app-scoped MCP listener.
- **podlist-mcp** is a small stdio bridge. It connects to the running Mac app. No third-party packages.
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

## Library, Views and Settings (milestone 4b)

Welcome offers **Start on this Mac**, which uses a persistent Standalone Device database and
publisher feeds without a server. A restarted Standalone Device reuses its Device identity,
State and cached metadata. Feed refresh runs at startup, foreground/network recovery and
periodically while the app runs. Streaming and downloads use publisher audio; there is no
server fallback on a Standalone Device. New Libraries get three starter Views once and a
skippable Getting started checklist on Views; Settings can reopen the completed checklist.

Use the Library sidebar + or File ▸ Add Podcasts… (⌘⇧A) for one name/feed-address field.
Standalone directory search uses Apple's public directory; server connections use the existing
server endpoints. Open a result for its Podcast page in the content column, with Artwork,
author, description, Search Episodes and Add/Play actions before subscribing. Reading a feed
alone does not add metadata to the Library; adding/playing one Episode retains only that
Episode, using the same feed/guid identity when subscribing later. Cached Podcast pages remain
usable without networking. Subscribe leaves Add podcasts open and preserves the field.
The green Subscribed control arms Unsubscribe for four seconds on its first click and
unsubscribes on its second, with Undo/Redo and no dialog, staying on the page. Settings opens
Played threshold, inherited Playback Settings overrides and this Device's Download Rule.

Views have New View (⌘N), Edit View, every condition in one form, Sort, Show, a live count,
explicit Rename/Cancel/Save and Delete with Undo. Condition edits are recorded as made;
invalid numeric drafts remain visible across reopening and restart. Names are checked in the
database actor, ignoring case and surrounding whitespace, including races between windows.
Search Library (⌘F) reports its count and offers inline Create View with a name. Add-podcast,
Search, New View, Rename and numeric-setting drafts are scoped to their Library and persisted.
View and subscription changes register with the key window's native Undo manager; inline
Undo/Redo also expose retry after a failed network action. Part 4a's editing integration can
use `LibraryEditingModel` alongside its Episode/Playlist undo history.

Settings (⌘,) edits saved Playback Settings, Trash retention, Appearance and the server
connection. OPML import/export is in Settings and File, using native panels. Imports report
progress, already subscribed feeds and per-feed failures; Retry failed imports preserves
successful work. Window ▸ Listening stats shows Monday-based weekly, monthly and all-time
totals, playback-source Episodes finished from retained metadata, streak, top podcasts and a
30-day chart with a table alternative.

`LibraryEditingTests`, `PodcastLibraryTests` and `ListeningStatsTests` cover these flows using
in-memory databases and fake publisher/server transports. Native window layout, keyboard
routing, panels, VoiceOver and live publisher requests still need a manual Mac run; the
new Standalone flows also need a live Mac presentation check. Connecting offers a counted
bring-over preview. Not now keeps the Libraries separate and leaves the offer in Settings.
Accepted transfers retain their source, checkpoint per feed and download, and enqueue mapped
Operations atomically with stable ids, so interrupted transfers resume without double counting.
The existing `/api/subscriptions/bring-over` imports vanished feed metadata by feed address and
guid. Disconnect and choose Start on this Mac to return to the retained source Library.

Standalone polling persists ETag/Last-Modified, check times and failure state in `feed_state`.
Automatic checks use 30-minute intervals and the server's exponential failure backoff capped
at one day, across restarts. Settings > Publisher feeds > Refresh now bypasses the wait.
`BringOverTests`, `FeedPollingTests` and `ApplicationModelTests` cover lost responses,
restart/resume, source retention, declining/reopening the offer, conditional 304 handling,
validator replacement, backoff persistence and failed-feed isolation.

## Playlist editing (milestone 4a)

Episode rows, the Inspector, the selection toolbar and the Episode menu share Play Now,
Play Next/Last, Add to a Playlist, Star and Played actions. Add targets the Active Playlist
by default; the submenu or Add sheet chooses another, or creates a Playlist and adds the
selection atomically. Multi-selections keep their displayed order. Return opens the Inspector
from an Episode table. The Playlist menu exposes Play this, settings, Delete and Trash.

Create a Playlist with File > New Playlist (⌘⇧N). Playlist settings keeps the full name on
its own line, with explicit Rename, Cancel and Save below it, plus Clear on Played and Delete.
Names ignore case and surrounding spaces; restore chooses the next available name. Closing
New Playlist, Add or Rename keeps the draft in server-scoped UserDefaults, including an open
Rename with empty text. Delete immediately moves the Playlist to Trash; status names it and
Edit > Undo Move to Trash restores it. Trash shows retention and offers Restore.

Playlists have Entries, History and Listening Timeline sections. Drag rows to insertion
boundaries to move one or the selected block; Episode > Move Up/Down (⌘⌥↑/↓) and Remove from
Playlist (⌘⌫) are keyboard alternatives. Play from here changes the Cursor and Active Playlist.
An empty Playlist can become Active without playing. Timeline stretches, finishes and edits
offer Rewind with a summary sheet listing the target, Unplayed Episodes, restored Entries and
what stays. Rewind keeps the permanent Listening log.

Edit > Undo/Redo (⌘Z/⇧⌘Z) has named actions. Native text fields keep their own text Undo.
The session-wide domain edit history uses new protocol Operations; a failed reversal stays
available to retry. Sync and playback reports do not create Undo steps. Edits flush playback
reporting before capturing inverses, and leave unrelated playing audio and transient speed
alone. Quitting keeps form drafts; the Undo stack lasts for the current connection session.

## Agents and automation (milestone 4c)

App Intents and MCP use the same app actions. Edits go through PlaylistEditingModel and
appear in Edit > Undo with the same names as UI edits. Playback goes through
PlaybackController. Both work with a Standalone Device or the current server Library.
There are no connection changes, Empty Trash, Delete Playlist or Unsubscribe tools.

### Connect an MCP client

Build the bridge from this directory, using the module-cache environment above:

```sh
swift build --scratch-path .build --disable-sandbox --product podlist-mcp
swift build --scratch-path .build --disable-sandbox --show-bin-path
```

Open PodList first, open a Library, then turn on **Enable MCP server** in
**Settings > Automation**. MCP is off by default. This preference applies only to this Mac
and is not synced; App Intents and Shortcuts remain available independently. The Automation
pane shows the bridge path and a copyable client configuration. For a bare SwiftPM build,
copy the printed binary directory into your client's MCP configuration. Use an absolute path;
clients do not expand `~` consistently.
For example, replace `/path/to/checkout` with your checkout path:

```json
{
  "mcpServers": {
    "podlist": {
      "command": "/path/to/checkout/apps/apple/.build/debug/podlist-mcp",
      "args": []
    }
  }
}
```

On this toolchain `.build/debug` points to the printed build directory. The bridge reports
a clear error on stderr if PodList is not running or MCP is turned off in PodList Settings.
stdout contains only MCP messages.
The app listens at `~/Library/Application Support/PodList/Automation/mcp.sock`, with mode
0600 in a 0700 directory. Both ends check the peer's user id. There is no TCP port.
When enabled, any local app running as your user can read the Library and control playback.
Turning MCP off stops the listener, closes open connections and removes the socket immediately.
Quit stops it while remembering the preference; closing every window keeps an enabled listener
available. Only one PodList instance can own the socket. Startup errors appear in the Automation pane.

The server supports only MCP **2026-07-28**, with `server/discover`, `tools/list` and
`tools/call` over newline-delimited JSON-RPC 2.0. Every request must carry
`params._meta["io.modelcontextprotocol/protocolVersion"]: "2026-07-28"` and
`params._meta["io.modelcontextprotocol/clientCapabilities"]: {}` (or the client’s capabilities).
Client identity in `_meta["io.modelcontextprotocol/clientInfo"]` is optional. There is no
initialization handshake: `initialize` is rejected with an error naming the supported revision,
and `ping` is not supported. Every result has `resultType: "complete"` and server identity in
`_meta`. Discovery and the name-sorted tool catalog include `ttlMs: 300000` and
`cacheScope: "private"`. Tools return text plus `structuredContent`; action failures return
`isError: true`. Malformed parameters and unknown tools/methods use JSON-RPC errors.
The bridge relays messages unchanged.

Tools: `play`, `pause`, `toggle`, `skip_back` (15 seconds), `skip_forward` (30 seconds),
`now_playing`, `play_episode`, `add_episodes`, `add_current`, `list_views`, `list_playlists`,
`list_episodes`, `search_episodes`, `set_starred` and `set_played`.
Inspect `tools/list` for their input schemas. Ids come from the current Library.
Add defaults to the Active Playlist and Play Last; choose `placement: "next"` for Play Next.
`list_episodes` accepts exactly one `view_id` or `playlist_id`. Lists accept `offset` and
`limit` (default 100, maximum 200), and return `total` and `has_more`.

### Make App Intents visible

The executable declares nine App Intents, Episode and Playlist App Entities with queries,
and three App Shortcuts: Play, Pause and Add Current Episode. The other intents cover
transport controls and Now Playing, Play Episode Now, Add Episodes with Next/Last,
Search, list Views/Playlists/Episodes, Star and Played marks. Intents open PodList and
use its live session. Add defaults to the Active Playlist when none is supplied.
Search returns up to 100 Episode entities. List Library returns JSON with counts and ids;
use its View id or a Playlist entity to list Episodes. Offset reads later pages.

`swift build` emits App Intents compiler constant values with the installed Xcode
SwiftPM build engine. It does not package the extracted action metadata into an app.
The bare `swift run PodListMac` executable is therefore insufficient for Shortcuts discovery.
Build a development bundle:

```sh
./scripts/build-mac-app.sh
open .build/PodList.app
```

The script builds only under `.build/`. It writes an Info.plist, runs Xcode's
`appintentsmetadataprocessor`, verifies `Metadata.appintents/extract.actionsdata`, and
ad-hoc signs `.build/PodList.app`. It never installs into `/Applications` or registers
the app itself. It needs the selected Xcode toolchain and its SwiftPM compiler constant
outputs (tested with Xcode 27.2 / Swift 6.4). A toolchain without these outputs stops
with a diagnostic; an Xcode app target with Extract App Intents Metadata is the alternative.
Apple describes bundle metadata in
[Configuring runtime behavior](https://developer.apple.com/documentation/appintents/configuring-the-runtime-behavior-of-your-app-intents).

After opening the bundle, look for PodList in Shortcuts > Add Action > Apps. Launch
Services and Shortcuts may need time or a Shortcuts restart to refresh their caches.
Bundle metadata extraction is checked by the script. Actual Shortcuts, Siri and Spotlight
visibility still needs a manual run. Distribution signing and notarization are not included.

`AutomationTests` covers Active Playlist defaults, shared Undo names and reversal, Search,
paging, Now Playing, id/argument validation, MCP lifecycle/schema/success/error handling,
malformed JSON, required per-request metadata, discovery, unsupported versions, legacy
initialization rejection, default-off Settings, preference persistence, socket permissions,
exclusive ownership, round trips and disabling/stop/restart (including closing open connections).
The socket test needs permission to bind a local Unix socket in the enclosing sandbox.

## Next

Distribution signing and installation remain later work. Conditional Standalone polling and
resumable Library bring-over are implemented (`pod-apx.5.7`, `pod-apx.5.6`; issues remain open
for handoff). Live platform validation, including bring-over presentation, sleep/wake polling,
Shortcuts discovery and an MCP client session, is pending the owner's Mac run.
