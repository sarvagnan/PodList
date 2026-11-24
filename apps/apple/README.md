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
control opens the Active Playlist. The Controls menu shows Space beside Play or Pause and
offers Back 15 Seconds (⌘←), Forward 30 Seconds (⌘→), Stop (⌘.), Playback Speed, Sleep Timer,
Chapters and Now Playing. Space remains available for text entry.

## Playback and downloads

AVPlayer plays downloaded audio first, otherwise the publisher directly, then the server's
existing Episode audio endpoint on failure or a ten-second loading timeout. Each source is
tried once per load, preserving Position and Speed. Failed playback offers Retry. Streaming
from a reachable publisher works while the server is offline. Speed preserves pitch using
AVFoundation's spectral algorithm; player Speed changes apply only to the loaded Episode.
Saved global settings and Subscription overrides supply Speed, Skip Intro, Skip Outro and Volume
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

The current contract accepts `pwa`, `desktop`, `android` and `web` Device kinds. This package
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
skippable Getting started introduction on the first View. It hides after the first Subscription once
any Add flow closes; Settings can reopen it until dismissed.

Use the Library sidebar + or File ▸ Add Podcasts… (⌘⇧A) for one name/feed-address field.
Standalone directory search uses Apple's public directory; server connections use the existing
server endpoints. Open a result for its Podcast page in the content column, with Artwork,
author, description, Search Episodes and Add/Play actions before subscribing. Reading a feed
alone does not add metadata to the Library; adding/playing one Episode retains only that
Episode, using the same feed/guid identity when subscribing later. Cached Podcast pages remain
usable without networking. Subscribe leaves Add podcasts open and preserves the field.
Podcast › Refresh All Feeds and Settings › General › Refresh Now show which feed
is being checked out of the current Library's total. Cancel Feed Refresh is
available in the status row and Podcast menu. A connected server may still finish
the feed it already received. Settings shows progress while checking a connection.

The green Subscribed control arms Unsubscribe for four seconds on its first click and
unsubscribes on its second, with Undo/Redo and no dialog, staying on the page. Settings opens
Played threshold, inherited Playback Settings overrides and this Device's Download Rule.

Views have New View… (⌘N), Edit View, every condition in one form, Sort, Show, a live count,
explicit Rename/Cancel/Save and Delete with Undo. Each window keeps its own draft,
including numeric text as entered. The live count reflects that draft. Synced changes
update untouched fields, Save merges only the fields edited in that window, and Cancel
discards the draft without writing to the Library. Drafts survive reopening the sheet
and restoring its window. Names are checked in the database actor, ignoring case and
surrounding whitespace, including races between windows.

Search Library (⌘F) opens Library-wide Search. Click the named toolbar field to
type. Search reports its count and offers inline Create View, which focuses its Name
field. If the name, query or destination changes during a save, the Library preserves
current input and offers Open Created View in the status row and
Saved Views menu. The toolbar search field shows its scope while you type.
In All Views, This list matches View names. History and Listening Timeline omit
This list and still offer Search Library through ⌘F. At narrow widths, Playlist
sections move below the toolbar to leave room for Search.
Add Podcasts, Search and numeric-setting drafts are saved per Library.
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
boundaries to move one or the selected block. The Entry context menu and the Episode
and Playlist menus dim Move Up and Move Down when the selection cannot move in that
direction. Episode > Move Up/Down (⌘⌥↑/↓) and Remove from
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

The editing intents conform to `UndoableIntent`: Play Episode Now, Play Episode in
Playlist, Add Episodes, Add Current Episode and Mark Episodes (Star/Unstar and
Played/Unplayed). Their system Undo registrations reference the same named history
steps used by Edit > Undo/Redo; no separate inverse history is kept. A stale system
Undo cannot reverse an unrelated newer menu edit.

Successful user actions donate matching App Intents from the shared editing and
transport paths, including menus, toolbar, context menus, drag/drop and automation.
Playback started internally by a Play Now edit does not donate a second Play action;
Undo/Redo, refreshes and automatic playback do not donate. Donations are best effort
and enabled only in release builds. They are also disabled when the bundle id starts with `app.podlist.uitour.` **or** the environment
contains `PODLIST_UI_DATA_DIRECTORY` (including an empty value).

**Show Now Playing** returns an interactive Siri/Shortcuts snippet with the current
Episode title, podcast and Position, plus Play/Pause, Back 15 Seconds and Forward
30 Seconds buttons. Each render reads live playback state; intent-backed controls
refresh the snippet after the action. An empty Playlist shows a no-current-Episode
message. Control Playback also returns this snippet alongside its JSON result.
No entities are indexed in Spotlight.

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

The executable declares App Intents, Episode and Playlist App Entities with queries,
and four App Shortcuts: Play, Pause, Now Playing and Add Current Episode. The other intents cover
transport controls and Now Playing, Play Episode Now and in a Playlist, Add Episodes with Next/Last,
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

The script builds only under `.build/`. It packages the PodList Mac icon in both
development and tour bundles. The icon uses the launcher and favicon mark on the Mac icon
grid. Its source is `Resources/PodListIcon.svg`. The script writes an Info.plist, runs Xcode's
`appintentsmetadataprocessor`, verifies `Metadata.appintents/extract.actionsdata`, and
ad-hoc signs `.build/PodList.app`. It never installs into `/Applications` or registers
the app itself. It needs the selected Xcode toolchain and its SwiftPM compiler constant
outputs (tested with Xcode 27.2 / Swift 6.4). A toolchain without these outputs stops
with a diagnostic; an Xcode app target with Extract App Intents Metadata is the alternative.
Apple describes bundle metadata in
[Configuring runtime behavior](https://developer.apple.com/documentation/appintents/configuring-the-runtime-behavior-of-your-app-intents).

After opening the bundle, look for PodList in Shortcuts > Add Action > Apps. Launch
Services and Shortcuts may need time or a Shortcuts restart to refresh their caches.
Bundle metadata extraction is checked by the script. The VM system checks below can
validate Shortcuts discovery. Siri and Spotlight visibility still need a manual run. Distribution signing and notarization are not included.

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

## Mac grading with XCUITest

The host builds the SwiftPM app and XCUITest bundle with Xcode 27.2. Every UI test
runs inside a fresh throwaway Tart clone. Both script modes require `PODLIST_UI_VM`;
the visual test also checks a guest-only marker before launching. There is no host
execution path. The project contains a macOS UI Testing Bundle using
`XCUIApplication(url:)`, ordinary clicks, keyboard commands, scrolling and `hover()`.

### In a macOS VM (required)

To keep this Mac free while the tour runs, run it in a throwaway macOS VM with
[Tart](https://tart.run) (`brew install openai/tools/tart`). Once:

```sh
tart clone ghcr.io/cirruslabs/macos-golden-gate-base:latest podlist-base   # ~32 GB download
apps/apple/scripts/ui-tour-vm-prepare.sh podlist-base podlist-ui
```

The prepare script points the VM at this Mac's Xcode (shared read-only on every run), accepts its licence and lets UI
tests enable Automation Mode without a password (acceptable in a throwaway test VM only).
Then each run:

```sh
PODLIST_UI_VM=podlist-ui apps/apple/scripts/ui-tour.sh /private/tmp/podlist-mac-tour
```

This Mac builds the app and the test bundle. The tour runs in a fresh clone of `podlist-ui`
with no window; the clone also runs the demo server from the repository, shared read-only,
with the image's Node. Nothing connects from this Mac into the VM's network. The clone is deleted afterwards.

### App Intents, app links, Spotlight, live MCP and window checks (VM only)

Use the same prepared VM to validate platform integration without touching this Mac's
screen or registering the throwaway app with this Mac's LaunchServices:

```sh
PODLIST_UI_VM=podlist-ui apps/apple/scripts/ui-tour.sh --system-checks /private/tmp/podlist-system-checks
```

Choose a fresh, empty output directory. The host builds; a new headless Tart clone runs
all system checks, copies back partial or complete results, and is deleted on exit. This mode
refuses to run unless `PODLIST_UI_VM` is set. Inside the guest only, it installs
`/Applications/PodList UI Check.app` with the fixed identity `app.podlist.uitour.system`,
registers it with `lsregister -f`, and launches it for a 30-second indexing warmup.
It uses isolated temporary data and a guest-local demo server. The host staging bundle
keeps its disposable UUID identity; no host app is installed or registered.
`ui-tour-guest.sh` shares the existing tour's guest startup, diagnostics and result copying.
No sign-in, Shortcuts action execution, or owner Library is involved.

`PodListSystemChecks` is a separate class in the existing `PodListUITour` test target:

- `testShortcutsDiscovery` launches the installed test bundle through XCUITest,
  opens `com.apple.shortcuts`, creates an empty shortcut
  and searches the action library for **PodList**. It compares the action names against
  a catalog generated from `AppIntents.swift` and `NowPlayingSnippet.swift`, excluding
  intents with `isDiscoverable = false`. Currently that is eleven discoverable intents.
  It polls for up to three minutes, refreshing the search while indexing catches up,
  and attaches the action-library and application trees if no actions appear.
  It records the four App Shortcuts' short titles when shown; if this search exposes any,
  it requires all four. No action is added or run. It closes the blank editor, chooses
  Discard/Don't Save if prompted, and quits Shortcuts without issuing Save.
- `testLibraryLinksAndSpotlight` queries Core Spotlight for the known fixture Episode
  “Who sets the price of rice?”, retaining its indexed identifier and title. It closes
  Library, opens the resulting `podlist://episode/<id>` using `NSWorkspace`, asserts
  a reopened Library selects that Episode in the Inspector without starting playback,
  and checks a removed Episode link presents a clear message. Indexing gets its own
  bounded three-minute wait, outside `testLight`/`testDark`.
- `testMCPWindowLifecycle` launches PodList with `-PodList.mcpEnabled YES` and publishes
  a fresh exchange directory in the runner's own temporary directory through flushed
  stdout (also retained as an attachment). The guest script launches
  `Contents/MacOS/podlist-mcp` from that exact installed test bundle outside the runner's
  sandbox. XCTest writes only its sandbox's checkpoint files; the guest client writes
  transcripts and logs in the guest run directory. The client sends
  newline-delimited JSON-RPC through the bridge's stdin/stdout with revision
  `2026-07-28` and the required per-request metadata. It asserts that `initialize` is
  rejected with `-32022` (this revision has **no initialization handshake**), then uses
  `server/discover`, `tools/list`, and `tools/call`. It checks server identity, cache
  policy, sorted unique tool names and schemas, fixture Views/Playlists, paused Now
  Playing, and nonempty `search_episodes` results. It flips one fixture Episode's Star
  mark, checks the persisted mark and named Undo, then uses the native **Edit > Undo
  Star/Unstar** command and reads the original mark back through MCP.
- The same MCP client stays connected while XCUITest closes the last window. The test
  checks that the app is still running with zero windows, the socket remains, the
  existing bridge still responds, and a second bundled bridge can connect. Opening
  the exact app bundle through LaunchServices from the guest client must restore the
  Library window with the same process ID and restored Star mark. Native Quit must terminate the app,
  remove its socket and close the original bridge connection. Socket ownership and
  0600/0700 permissions are checked too.

`Shortcuts.xcresult`, `Integration.xcresult` and `MCP.xcresult` retain `.keepAlways` screenshots, UI trees,
found action names, and the runner exchange path. Exported attachments are in
`Shortcuts-attachments/`, `Integration-attachments/` and `MCP-attachments/`. `system-results/` contains the
source-derived catalog, `mcp-transcript.jsonl`, `mcp-summary.json`, client log, bridge
stderr, MCP test log and app registration/warmup logs. Guest diagnostics include
`appintentsd` and LaunchServices (`lsd`). `README.md` reports passed/incomplete;
build, demo, test and guest logs survive failures. All independent system tests run even if
an earlier test fails. The ordinary tour selects
only `PodListUITour`, so it never opens Shortcuts or enables MCP.

For a focused run **inside an already staged disposable guest**, while its demo server
is running, the MCP entry point launches just its XCUITest (which launches PodList):

```sh
tart exec <clone-name> /bin/bash /private/tmp/podlist-uitour-run/checks/mcp-live-check.sh /private/tmp/podlist-uitour-run
```

That command requires the guest-only `system-vm` marker, staged `products/` and the
patched demo origin in the `.xctestrun`; use a fresh run before repeating it because
`MCP.xcresult` must not already exist. The normal host command handles all staging.
The two tests are independently selectable with
`-only-testing:PodListUITour/PodListSystemChecks/testShortcutsDiscovery` and
`-only-testing:PodListUITour/PodListSystemChecks/testMCPWindowLifecycle` on the staged
`.xctestrun`. Neither should be run on the owner's desktop.

These tests can be built in a screenless sandbox using the headless command below.
Their Shortcuts locators, App Intents indexing delay and window reopen behavior still
need the first live VM run. Siri invocation, Spotlight discovery and distribution
signing/notarization are outside this check; no account credentials are requested.

### Tour coverage and isolation

The 46 main-tour states (01–44, 11a and 34a) cover Subscriptions grouped by Download Rule,
Views and Inspector, Default Entries/History/Timeline and the Rewind preview,
Commute/Settings/Rename, New Playlist, Trash, Search, View editors, Market Hours
and its subscription controls, Add to a Playlist, Add podcasts, Download Rules,
Now Playing, General/Automation Settings, Listening stats, Getting started and
View multi-selection. Screens 35–36 cover the minimum window size and scrolling
under the bars. Screens 37–39 use Window → Move & Resize → Left to capture New
this week with a selected Episode and its Inspector open, the Market Hours Podcast
page, and the Commute playlist at half-display width. The tour checks table layout
and visible, scoped Playlist Search at that width. Screens 40–42 show 30 Views and
30 Playlists using a separate demo Library. Screen 11a shows deleted Playlist Settings
with Restore Playlist and Close. The tour verifies that clicking Close, pressing Return,
and pressing Escape all preserve the draft after Trash Restore. Editable Cancel discards it.
Screen 32 shows the Getting Started window, reached from Settings › General or
Help › Getting Started. Screen 34a shows Rewind on a selected Timeline row, and
43 shows the Inspector explicitly opened at minimum width. The tour asserts that
the Length column and rows fit the new viewport.
Screens 06–09 check the Playlist toolbar and which panes are visible. The test
log records the toolbar shifts and selected Entry width on the first selection.
It checks that the original click still lies in the selected row and that a
second selection leaves the open Inspector's toolbar positions fixed and scrolls
the Inspector back to its new title. The Light pass checks both menus at the
first and last Entry. History and Listening Timeline have no local search field.
Screen 44 captures a delayed Undo of Remove from Playlist. The named result,
the retained Search and selected Entry, and Show Restored Entries are visible.
The tour uses Edit › Show Restored Entries to reveal and select the restored Entry.
It also checks that Space inserts a space in toolbar Search, the focused inline
View Name, Playlist Settings and Add Podcasts. Edit View checks the raw numeric
draft, the draft match count and that Cancel discards both edits. Empty History
and Stats expose the next action. Screen 05 checks that Saved Views › Show All
Views selects the sidebar row and that This list filters View names and shows a
no-match state. The dark scope caption uses #C4C4C4. The contrast test covers
the two glass colors sampled in round 23. Screens 18–19 compare the Podcast Episode column widths and
positions before and after description expansion, and screen 18 requires six
Episodes to fit. The native table tests check that all visible columns are
user-resizable and that the Podcast table scrolls without a vertical scrollbar.
This keeps the column positions fixed when the available height changes,
including with macOS set to use legacy scrollbars. The menu inventory checks
that both Episode drop retry commands are visible and disabled with no
failures. Unit tests cover the selected and
batch retry scopes and the ordered per-Episode drag representations. The
cross-app drag itself is a manual check from the multi-selection state in
screen 33. Each dragged Episode offers its own title and, when available, URL.
The Light follow-ups exercise clock input in Go to Time while paused, observe
the refresh count in the Library and Podcast menu, then cancel from that menu.
They check the disconnected Settings address label while typing and observe the
connection indicator while reconnecting to the fixture. Only the tour build
delays manual Refresh All Feeds and Check and Connect for these assertions. Form labels use consistent title case per
[Apple’s Human Interface Guidelines for writing](https://developer.apple.com/design/human-interface-guidelines/writing).
Every state has a window screenshot (including native
sheets) and a text tree, attached with `.keepAlways`. `xcresulttool export
attachments` produces `light/NN-name.png` and `.txt`, `dark/NN-name.png` and
`.txt`, and `menus.txt`. After the main tours, a macOS 27 Show Borders pass captures
New this week with the player bar, the Episode Inspector, the New Playlist sheet,
and General and Automation Settings in `borders-light/` and `borders-dark/`.
The Library captures show the borders on row, Inspector, player and sidebar actions.
The full tour exports 207 required attachments, including menu and timing text.
Each main pass attempts five runs per task and attaches `light--timings.txt` or
`dark--timings.txt` (exported as `light/timings.txt` and `dark/timings.txt`). The
app measures from the mouse-down or key-down event timestamp to the first display
refresh after the Episode list, Inspector, New Playlist sheet, Settings window
or one-row filter result appears. The Inspector marker is the selected Episode's title,
both when selection opens the pane and when a different selection updates the open pane.
The filter sample starts on the final `e` in `rice`. A display link on the result
window supplies the target time of that refresh.
This measures input to first presented frame at the VM display cadence, with
SwiftUI appearance and AppKit visibility as the result markers.

For each Inspector path, `timings.txt` also reports input to selection handling,
selection handling to shell body evaluation, and shell body evaluation to the
first frame. Each phase has its own sample count, p75 and maximum. The final
phase includes layout and the display-link interval. Actions, artwork loading,
playlist memberships, chapters and Show Notes follow the title. Changing Episode
keeps the scroll view and its layout mounted. The artwork slot retains its size as details arrive.
The expected improvement is in shell-body-to-first-frame time on reselection. Input-to-selection handling and
initial pane opening still include native window layout.

The report includes the VM hardware and macOS version, nearest-rank p75 and max
in milliseconds, and sample counts. Steps with fewer than five samples are marked
unobserved. RESP-01 targets p75 ≤ 200 ms over at least five runs. The tour records
the results without enforcing that target. RESP-02 keystroke and drag frame timing
is outside this tour.

Inspector phase timing is compiled into tour builds only. Run the Debug or Release
tour build with a disposable `app.podlist.uitour.*`
bundle ID and the tour's `PODLIST_UI_TIMINGS_FILE` launch environment value,
an absolute file path inside temporary storage.

Before either the full tour or the timings-only pass, the guest waits for its
one-minute load average to fall below 0.8. The runner logs the load every ten
seconds and proceeds after at most 12 minutes. A freshly booted clone can
roughly triple the measured times.

For quick performance checks, `PODLIST_UI_VM=podlist-ui scripts/ui-tour.sh --timings <empty-outdir>`
runs only the Light timing runs and prints `timings.txt` (about 15–20 minutes).
This pass does three unrecorded warm-up rounds. Use
`PODLIST_BUILD_CONFIGURATION=release` to measure the optimized build. Add
`PODLIST_UI_PROFILE=1` to record a trace in `guest-diagnostics/timings-profile-N.trace`
and its table of contents in `timings-profile-N-toc.xml`. The default
`PODLIST_UI_PROFILE_TEMPLATE=SwiftUI` uses SwiftUI and Time Profiler. The
`os_signpost` instrument records `app.podlist` / `ResponseTiming` intervals,
with `response_ms` on measured results. The profiler perturbs that run's timings.

The generated README lists every screen and reports any missing required
attachments out of 207.
`Tour.xcresult`, `ShowBorders.xcresult`, raw attachments and build/demo/test logs
are retained. The tour never opens Apple, Services, Import/Export OPML, Open or Save panels.

Isolation uses a **temporary copy of the bundle with a fresh bundle ID for each
appearance**, `app.podlist.uitour.<UUID>.<appearance>`. This gives AppKit,
SwiftUI, drafts and `UserDefaults.standard` separate preference domains, including
window state. `-PodList.serverOrigin`, `-PodList.appearance`,
`-PodList.inspectorVisible` and `-PodList.mcpEnabled` are passed through the
standard `NSArgumentDomain`. The `PODLIST_UI_DATA_DIRECTORY` variable redirects
all PodList databases (including the Standalone bring-over check), audio downloads
and the automation socket into that run's temporary directory. It requires both
a disposable bundle ID and a path beneath a temporary directory, and fails closed
on malformed configuration. Each appearance starts with fresh preferences, temporary app data and its own
seeded demo server. MCP remains off and the demo's
current Episode stays paused, as after a relaunch. Teardown quits the test app;
the script removes the temporary bundles, data, defaults, caches and window state
and stops only its own test/demo processes by PID. The demo API reaps its own
server child and database. The tour build also accepts `PODLIST_UI_DELAY_ENTRY_UNDO=1` for a disposable
bundle identity. This delays the first Undo of Remove from Playlist by two
seconds during the full Light and Dark runs. The hook gives slow VM input up
to six seconds total to change toolbar Search before letting Undo finish. The
guest exports Edit-menu dispatch and reversal outcomes to
`guest-diagnostics/edit-history.log`. Failed menu checks keep a guest screen
capture, Library debug description and menu item states in the result bundle.
In the disposable tour app, a background heartbeat samples PodList by PID
after five seconds without a main-run-loop response. The sample and its
command log go directly into `guest-diagnostics/main-thread-stall-*`, so
they can be recovered even if Xcode stalls during result export.

XCUITest's public snapshot API supplies `XCUIElementType`, label, title, value,
identifier, enabled, selected and screen-coordinate frame. It does **not** expose
raw AXRole/AXSubrole or menu key equivalents in Xcode 27.2. Text dumps label the
role as the XCUI type (plus its numeric value), and explicitly mark subrole and
keyboard shortcuts unavailable. The standard alternative for exact shortcuts is
to inspect `NSMenuItem.keyEquivalent` and `keyEquivalentModifierMask` in Xcode's
LLDB debugger, or inspect the rendered menus manually. No custom AX utility is
provided. Menu enabled states in `menus.txt` reflect the final multi-selection in the
Light tour. The tour separately invokes Podcast → Open Podcast Page from a selected
Add Podcasts result and Controls → Open Active Playlist from Listening Stats with
Library open and closed. After the Light captures, the tour follows a named Chapter
jump and invokes Open Active Playlist from populated Listening Stats. It opens Now
Playing from Controls while an Entry is current, empties the Active Playlist in
Library, and uses the existing Now Playing window's empty-state button to return
to that Playlist.

The Unsubscribe sequence clicks Subscribed once, captures the armed control, and
then clicks the Episode count to disarm it. The tour verifies that Subscribed and
Share Podcast keep their positions as the control arms and disarms. Expanding and
collapsing the Podcast description must preserve every Episode column's width and
horizontal position. Screen 36 uses the full Library results to verify that rows
scroll beneath the column headers and clear the player at minimum window size.
Pane checks require one sidebar toolbar button with the label for its current action.
They also exercise the toolbar click and Control-Command-S in the narrow layout.
Search checks exercise the 28 pt Clear Search control, scope and query at 760 and
960 pt. The delayed Undo test briefly removes an
Entry from the demo Library and verifies that it comes back. The Timeline Rewind action is also available
to keyboard/VoiceOver users as a named accessibility action and context command.
With no Subscriptions selected, Edit Download Rules opens the all-Subscriptions
editor; Cancel closes it without applying anything.

Headless verification (does **not** launch the UI tests):

```sh
xcodebuild build-for-testing \
  -project apps/apple/PodListUITour.xcodeproj -scheme PodListUITour \
  -destination "platform=macOS,arch=$(uname -m)" \
  -derivedDataPath apps/apple/.build/ui-tour-derived
cd apps/apple
export CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$PWD/.build/module-cache"
swift test --scratch-path .build --disable-sandbox
```

The VM foreground run validates UI locators, menu hierarchy, window and sheet
captures, and the export manifest. Do not run the UI tests in a screenless agent
sandbox.

### Library app links, Spotlight and Services

Copy PodList Link is available in Episode, Playlist and Views menus and item context
menus. Publisher Share/Copy Link commands keep their public web URLs. App routes are
`podlist://episode/<id>`, `podlist://playlist/<id>`, `podlist://view/<id>` and
`podlist://podcast/<feed-url-encoded>` (encode the entire feed URL as one path component).
Opening one navigates the most recently used Library window, reopening Library if needed,
without starting playback. Removed items and links for another Library show a message.
Finder `.opml` documents still stage the existing import preview.

The Add to PodList Service accepts one selected HTTP(S) feed address without credentials,
opens Add Podcasts and stages its input. It never subscribes automatically. Invalid
selections return a Service error. The same validation is used for staged feed addresses.

Core Spotlight indexes Library Episodes (including retained Orphaned Episodes), active
Subscriptions and Playlists, with stable app links, titles, podcast names, Published dates
where applicable and keywords. Snapshot updates replace changed metadata and remove stale
items; disconnect and Library replacement clear the app’s Library index. Episode and
Playlist entries associate the existing App Intents entities; Subscriptions have a matching
entity and all three have browsing-only Open intents.

`ActionDonations.spotlightIsEnabled` allows writes in release builds and identities under
`app.podlist.uitour.`. Ordinary DEBUG `app.podlist.mac` builds never obtain a writable index.
Intent donations remain release-only and disabled for tour identities/data-directory signals.
Run runtime checks only with `PODLIST_UI_VM=podlist-ui scripts/ui-tour.sh --system-checks <empty-outdir>`
from `apps/apple`; the VM clone is discarded. Building does not launch or register the host app.
