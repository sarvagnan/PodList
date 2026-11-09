# PodList for Android — milestone 4

An ordinary Gradle project, outside the pnpm workspace. `:domain` is pure Kotlin/JVM
and owns wire models, Played/Position/listening accounting, sleep and advancement
policy, and download planning. `:data` owns bundled SQLite, the shared schema and
View compiler, atomic edits, HTTP transport, sync, publisher feed parsing/refresh,
iTunes directory search, OPML, audio metadata and atomic private-file commits. `:app` connects these to Compose, Media3 and WorkManager.
Android 14 (API 34) is the minimum.

The owner-approved compact phone layout D uses Material 3, system fonts, edge to
edge, PodList blue (`#2b50c8`) and system dark mode. Views, Playlists and Library keep
independent navigation stacks through `NavigationSuiteScaffold` and the predictive
`NavigableListDetailPaneScaffold` wrapper around `ListDetailPaneScaffold`.

The 72dp mini player shows Artwork, back 15, Play/Pause, forward 30 and Active
Playlist, with 48dp controls and a progress line. Names are accessible descriptions
and system metadata; they are absent from the mini player and main Now Playing
presentation. The persistent player sheet lives inside the navigation content
bounds, keeping the bottom destinations reachable. It has Chapter navigation,
Chapter ticks, 80dp skip / 112×88dp Play controls, transient Episode speed, sleep,
and nested Episode, Chapters and Entries pages. Back closes Add, then a player
page, then the player, then the destination stack, without controlling audio.

Episode rows support Play Now and the half-height Add sheet (Active preselected,
New Playlist, Play Next / Play Last). New Playlist + Add commits atomically to the
outbox. Entries support Play from here, drag/discrete moves and Switch Playlist;
Add and move offer Undo. Playlists include Entries, History and Listening Timeline.
Episode detail includes Artwork, metadata, show notes, Chapters, Played/Star,
Manual Download, In your Playlists and each Entry's Resume action. Library's + opens
Add podcasts for directory search or a pasted feed address. Results keep the input
and remain open after Subscribe. Pencils open the View editor, Playlist settings and
Subscription settings; gears always open app Settings.

The agreed round-2 View editor has all seven condition rows, Sort and Show, each
opening a Material bottom sheet. Published ranges use the native Material date
picker. Valid edits apply immediately; reversed ranges retain the input and explain
the error without recording invalid Operations. The matching count and Undo stay
above the player. Search uses the same SQLite View compiler and can become a named
View. Playlist creation validates blank and duplicate names; Delete, Trash Restore,
Clear on Played and selection actions offer Undo. The Default Playlist exposes only
Clear on Played.

Subscription settings contains this Device's Download Rule, its optional positive
cap, Played threshold and individual Playback Settings overrides. Default values
show what they inherit; overrides use the primary role. Pending server overrides
also affect local playback before sync. Mark all Played offers Undo. Unsubscribe
explains Orphaned Episodes and stored downloads, then offers Undo, Redo and retry.

Listening Timeline groups stretches, finishes and deliberate edits, newest first.
Rewind previews the target Entry/Position, Unplayed Episodes, restored Entries and
kept edits in the agreed summary sheet. Rewind and Undo serialize behind the player's
final sample and reload the target paused; they leave the permanent Listening log
alone. Existing shared Rewind vectors still exercise the reducer.

Settings contains Playback, Your listening, Your podcasts, Playlists, This Device and
Help. Listening stats shows all three periods, the current Listening streak, 30 daily
bars, a table and top podcasts. Bars scroll horizontally so each day remains a 48dp
touch target. OPML uses Android OpenDocument/CreateDocument and LibrarySource's server
or Standalone Device implementation; partial imports list failures and retry just
those addresses. Imports, exports and their results survive Activity rotation. The launcher exposes Views, Playlists and Library shortcuts.

Long press selects Episode rows in a View, Search, Subscription or Playlist. Checkboxes
replace Artwork, trailing actions disappear, and the contextual app bar exposes Add,
Mark Played, Star and Download. Bulk Next/Last preserves displayed order. Library also
provides Select Subscriptions for changing this Device's Download Rules together.

## Playback and downloads

`PlaybackService` is a Media3 foreground `MediaLibraryService`. ExoPlayer handles
background audio, audio focus, becoming noisy and wake locks. MediaSession supplies
lock-screen/media notifications with Episode and podcast names, back 15 / forward
30 commands, and an Android Auto tree of Playlists → Entries. Library subscriptions
are invalidated after local State/Library changes. Media buttons can resume the
saved Active Playlist. No new emulator or Android Auto checks have been performed for Standalone Device support.

`ListeningSession` emits durable batches with the final Position before Played,
15-second reports, explicit seek/rate/pause/failure/lifecycle flushing, and
`RecordListening` for the Played tail. Another Device's Position is adopted while
paused without echoing an Operation. A newly observed Played fact also switches
the loaded Episode to listening-only reporting. `PlaybackPolicy` owns target
selection, intro position, actual-end/outro advancement, monotonic duration sleep,
Chapter/Episode sleep, effective Subscription overrides and Artwork resolution.
Player speed changes do not save Playback Settings. Native Volume boost uses the
platform LoudnessEnhancer with 6dB gain when supported.

Sources prefer a stored file; otherwise they try the publisher and, when connected,
the server proxy, each once per load. A Standalone Device has no proxy fallback. Fallback keeps Position and speed, including a ten-second
loading timeout. An exhausted load exposes an error and explicit retry. Late
Library metadata fills in names, Chapters, attribution and the publisher source.
Chapter resolution runs on Episode detail and playback, and is cached in the local
Episode row. A Standalone Device fetches podcast:chapters JSON directly, then probes
at most 512 KiB of publisher audio for ID3v2.3/v2.4 CHAP frames if needed. Podcast publishers may use
HTTP audio, so media cleartext is allowed; `ServerAddress` continues to enforce
HTTPS for PodList origins except the debug emulator address. All HTTP adapters use
a generic User-Agent and send no personal Device name.

Downloads use foreground WorkManager jobs and app-private, origin-isolated files.
A process-wide semaphore permits at most two transfers, with an additional lock
preventing replacement attempts for the same Episode from racing. The Media3 HTTP
source follows publisher redirects, then falls back to the server on failure when
one is connected.
Only complete files are atomically renamed and recorded as Stored. WorkManager
persists requests and failed status; failed attempts require explicit retry/cancel.

Rule planning receives State, Library and download invalidations with a one-second
debounce. It executes only this Device's rules, respects synced All New `since`
and legacy dates, keeps Entries outside its cap, and protects Starred and Manual
Downloads from automatic cleanup. A Star does not itself request a download.

## Toolchain

Pinned stable versions (checked 8 November 2026):

| Component | Version |
| --- | --- |
| Android Gradle Plugin | 9.5.1 |
| Gradle wrapper | 9.6.0 (distribution SHA-256 pinned) |
| Kotlin / serialization plugin / Compose compiler | 2.4.21 |
| kotlinx.serialization JSON | 1.12.0 |
| AndroidX SQLite bundled driver | 2.7.1 |
| Compose BOM | 2026.09.00 |
| Activity Compose | 1.13.0 |
| JUnit BOM | 6.1.3 |
| Build/test JDK | 25 (Android Studio's installed runtime is 25.0.4) |

[AGP 9.5 requires Gradle 9.6 and JDK 17 or later](https://developer.android.com/build/releases/agp-9-5-0-release-notes).
[Gradle supports running on JDK 25 from 9.1](https://docs.gradle.org/current/userguide/compatibility.html).
The daemon criteria and both JVM modules' toolchains pin JDK 25; Java/Kotlin bytecode
targets 17. The machine default JDK 27 is not the chosen build runtime. Install JDK
25 elsewhere or point to Android Studio's bundled JDK, without committing paths:

```sh
export PODLIST_JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export JAVA_HOME="$PODLIST_JAVA_HOME"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

The daemon discovers `PODLIST_JAVA_HOME` via `org.gradle.java.installations.fromEnv`.
Set Android Studio's Gradle JDK to the same runtime. `local.properties` may instead
supply `sdk.dir` locally; it is ignored. No signing credentials are needed for debug.

The application id is `app.podlist`, minSdk 34, targetSdk/compileSdk 37. The compile SDK selects minor API level 2 explicitly to use the installed
`android-37.2` platform, while the target API remains 37.

## Build and test

From the repository root:

```sh
pnpm check:android
pnpm check
```

From `apps/android`:

```sh
./gradlew :domain:test :data:test
./gradlew assembleDebug
```

The APK is `app/build/outputs/apk/debug/app-debug.apk`. These commands use no device.
Tests discover the committed JSON files directly under `../../packages/domain/protocol`;
there are no copied fixtures and no TypeScript execution in the Kotlin tests. A new
sync file runs automatically, an unknown protocol document fails the inventory guard,
and schema Change tags must equal the Kotlin sealed decoder variants. Every supplied
checkpoint and duplicate delivery is checked. Server cases replay cumulative concrete
logs only; clients never expand Library-dependent intentions.

The contract currently contains 21 sync vectors (144 operations, 74 checkpoints),
43 View cases, 25 Listening samples, 11 thresholds, 2 sessions, and 4 server replay
vectors (9 batches). SQLite round-trips every initial/expected/checkpoint State.
View cases run the real compiler on an in-memory bundled SQLite connection. The same
multiplatform driver dependency resolves its Android native variant in the APK and
its JVM native variant in tests; framework SQLite and JDBC are not used.

`SharedSchema.kt` mirrors `packages/domain/src/Sql.ts` plus the web client's
`LocalDb.ts` migrations, including their indexes and Chapter-source columns. Tests
compare both SQL sources for drift. `android_migration` is only local migration
bookkeeping. `outbox` and `sync_meta` retain the web client's table shapes: the latter
holds `deviceId`, `sequence`, `confirmedState`, `userCursor`, `catalogueCursor`, and
future registration metadata. Confirmed State stays separate from optimistic State.
Local edits atomically persist the Operation, next sequence, State and indexes.

Device kinds include `android`; Apple kinds wait for the Apple apps. The contract's
documented text folding, equal-time arrival ties, future Published dates and
end-of-sample timezone behavior are preserved.

## Connection and sync

First run presents the agreed welcome: Start on this phone or Connect to a server. Starting on this phone persists a Standalone Device
session, creates its Default Playlist and creates the three FirstRun.tsx starter
Views once. Their creation and once-only marker commit atomically; deleting them
does not recreate them on restart. A fresh server Library also creates the starter
Views once, only after both State and Library have loaded. Getting started sits above
the Views, remembers its three completed steps, stays until Hide, and reopens on Views
from Settings → Help. A previously used Library becoming empty does not restart it.
Connecting a Standalone Device now offers to bring its Library over, with real
counts and saved, resumable progress (see below).

`Session.source: LibrarySource` is the boundary for Library refresh, discovery,
Subscribe/Unsubscribe, Chapters, Artwork and audio fallback. `ServerLibrary` retains
the existing HTTP/sync behavior; `DeviceLibrary` does that work locally. The
Standalone Library uses a separate hashed database/file namespace (`standalone`)
from every normalized server origin. Existing server database filenames, download
paths/tags, preferences, cursors and pending outbox operations are preserved.
Settings → This Device → Server says “None. This phone keeps everything itself.”
and opens the server connection screen with Back. Connecting offers **Bring it over**
or **Not now**. Declining connects without uploading Standalone edits, keeps the two
Libraries separate, and leaves the offer in Settings → This Device.

Standalone edits apply to State and its indexes atomically without a sync outbox.
A local operation table retains the edit record, including concrete Mark all Played
expansion; Subscription overrides update metadata in the same transaction. The
Listening log, History, Listening Timeline, Played/Starred facts, Entries, Positions
and Download Rules use the existing reducers and retention rules. Unsubscribe hides
Episodes except Orphaned Episodes that are Entries or Starred; it preserves every
id, setting, mark, rule and stored download. Re-subscribe reveals retained records.

The Device's feed engine is JVM-testable and uses no new dependencies. It retains
feed addresses and guids in the existing shared columns, conditionally refreshes
with ETag/Last-Modified, retains Episodes absent from later feeds, merges unambiguous
guid changes and detects audio replacement at the server's >30-second threshold.
Device migration scope `device/1` adds feed refresh bookkeeping and the local
operation table; shared and web/client migrations remain unchanged. Feed XML and
OPML reject DTDs/external entities. Feeds have a 32 MiB UTF-8 limit and use the streamed
SAX parser; only OPML has an 8 MiB limit. Publisher HTTP
bounds response size and redirects, uses only HTTP(S), rejects URL credentials,
and always identifies as generic `PodList Android`.

Standalone refresh runs at startup, foreground entry and connectivity return, plus
an in-process 30-minute timeout and a unique periodic WorkManager job at 30 minutes
(subject to Android scheduling). Individual failures back off 30 minutes, 1 hour,
2 hours, up to a day. The WorkManager network request accepts unvalidated internet
networks and VPNs, as downloads do. Library commits invalidate the existing Download
Rule planner, so new Episodes can trigger All New without another edit. Feed failures
never become an Offline or sync failure banner on a Standalone Device.

`PodcastDirectory` searches Apple's public iTunes API and previews pasted feed
addresses directly. `Opml.parse/generate` and `DeviceLibrary.importOpml/exportOpml`
are data-only APIs: recursive deduplicated outlines, XML escaping, inactive
Subscription exclusion, and added/already-subscribed/per-address failure reporting.
Malformed imports produce an empty summary, matching the server. Settings supplies the
OPML file-picker UI for either source.
Directory result Artwork loads directly even with a server, since the Library-only
Artwork proxy cannot serve an unsubscribed search result.

Connecting to a server checks `/api/health` before saving an origin. There is no login or secret.
Use HTTPS over the tailnet. Debug builds additionally allow **only**
`http://10.0.2.2[:port]` for the Android emulator reaching this host. Release builds
enforce HTTPS for the PodList server address. Publisher audio can use HTTP; the
debug Network Security Config permits media cleartext too.
User-Agent and registered Device name are generic `PodList Android`.

The installation's opaque Device id and registration time survive process restarts.
Settings → Server checks and changes the origin. Each normalized origin gets a
separate SQLite database, cursors and outbox; returning to an address restores its
local Library. Changing addresses never sends pending operations to a different
server. Moving the same server to a new address performs a fresh pull at that
address. Old local data is retained. Standalone bring-over does not migrate one server origin to another.

`SyncClient` runs without Android and accepts a fake HTTP transport. It registers
once, pushes an exact ordered outbox snapshot, pulls from the independent State
cursor, then atomically acknowledges only that snapshot, commits confirmed State
and durable operation-id deduplication, and rebuilds optimistic State with remaining
edits. Push response loss and failed pulls retain pending operations. Library pages
upsert Subscriptions before Episodes and commit each returned cursor atomically.
Library sync is attempted independently of State sync; partial progress survives a
restart. State and Library commits invalidate readers, so Views re-evaluate.

Startup sync is immediate. Edits, foreground entry and connectivity return trigger
sync; subsequent passes coalesce triggers for two seconds, or run after a one-minute
timeout measured from the preceding pass. Failures expose Offline or Sync error,
retain local data, and retry on those triggers or the next periodic pass. Retry sync
also triggers the same scheduler. The periodic feed worker is specific to Standalone Devices; server sync retains
this existing in-process scheduler.

The milestone 2 offline banner existed but could wait behind 10-second connect /
20-second read timeouts and the independent Library attempt. API transport now
uses two-second connect/read deadlines, and State failure is published before
Library sync starts. This keeps the local UI usable and exposes the first failure
without waiting for the rest of the pass. Check the five-second relaunch case on
the emulator, including a server that silently drops connections.

Connected Library Artwork uses `/api/artwork?url=…&size=128`; Standalone and
directory-result Artwork comes straight from publishers, with Episode → Subscription fallback,
an 8 MiB memory cache and 64 MiB disk cache. Cached Artwork remains usable offline.
No image-loading or HTTP-stack dependency was added.

## Bringing a Standalone Library to a server

After a successful connection from a Standalone Device, the agreed round-2 offer
lists active Subscriptions, Playlists (including Trash), Entries, Played and Starred
marks separately, and Listening log hours from the stored State. An untouched fresh
Standalone Library does not trigger the offer. **Not now** connects to the server
without moving anything; Settings → This Device → Bring your Library over keeps the
offer available, including after relaunch. Closing progress leaves the transfer
running through the existing session scheduler. A completed transfer keeps using
the server session. The original Standalone database and audio files are retained.

`BringOver` in `:data` uses Subscribe, a metadata fallback and ordinary sync:

1. Subscribe each active Subscription using `POST /api/subscriptions`. The server
   reuses the same feed address, including after a lost Subscribe response. Persist
   each success separately. Do not re-subscribe removed Subscriptions.
2. Run normal Device registration, State sync and paged `/api/library/changes`.
   Match Subscription ids by exact feed address and Episode ids by guid within the
   matching Subscription. Check untouched Back Catalogue too. For remaining missing
   identities, send `POST /api/subscriptions/bring-over` with Subscription metadata
   keyed by feed address, including removed status, and Episode metadata keyed by
   feed address plus guid. Pull Library changes again to obtain server ids.
3. Once mapping is complete, rewrite every reference in the `local_operation` log:
   Episode ids, neighbouring Entries, Cursors, Playback-source Playlist ids, View
   podcast conditions, Listening amounts, Download Rules and Subscription overrides.
   Queue the entire ordered replay, its fixed map and its checkpoint atomically in
   the normal outbox. Retain original operation ids, Device id and timestamps;
   reserve increasing destination sequence numbers in that transaction. Send only
   the recorded concrete MarkPlayed operations for Mark all Played, because replaying
   the original bulk intention would also mark server-only Episodes Played.
4. Normal sync commits acknowledgement and confirmed State. Stable ids make lost
   push responses harmless, including additive Listening log amounts. Operations
   reconstruct Playlists, Positions, Played/Starred facts, History, Listening
   Timelines, Trash, Rewind, the Listening log, Views and settings using ADR 0003's
   ordinary merge and retention rules. No whole-State replacement is uploaded.
5. Copy stored audio atomically to the server origin's normal file namespace under
   mapped Episode ids, then persist each download row and copy checkpoint together.
   Preserve a valid existing destination file and its timestamp. Imported downloads
   become Manual Downloads on the destination so that differing server Played facts
   or Entries cannot immediately discard them; source ownership stays unchanged.
   Rule cleanup waits until the transfer is complete. Audio is never uploaded.

The immutable snapshot is stored once in destination `sync_meta`; small checkpoints
store completed feeds, fixed mappings, outbox status and copied Episodes. A separate
pending marker lets the download planner avoid decoding the operation log. No schema
migration or dependency is needed. Startup, foreground, connectivity and the existing
one-minute scheduler resume a pending job. A completed job is a no-op on repeated runs;
it does not resnapshot the old Standalone Library or resend listening.

The Default Playlist maps to the existing `default` id. Equivalent starter Views
reuse server View ids, including a View edited back to its initial conditions.
Implicit untouched starter Views are seeded only when absent. Source deletions of
starter Views do not delete the server's own starters; differing/colliding user
Playlists and Views get stable destination ids, keeping the server's objects.

**Metadata fallback and older servers:** Subscribe only fetches the publisher's
current feed, and an existing Subscription is not refreshed by Subscribe. The
idempotent `/api/subscriptions/bring-over` request recovers Episodes retained by the
phone but absent from the publisher and Subscriptions removed on the phone that
the permanent Listening log still references. It inserts only missing identities
in one transaction, never updates existing server rows, and returns 204. Server ids
arrive through normal paged Catalogue changes. The request fetches no feeds; removed
Subscriptions stay removed and are not polled. Their Episodes are visible only as
Entries or Stars under the usual Orphaned rules. State still uses the normal outbox
and sync push after all references can be mapped. Complete Episode metadata is
retained in the immutable snapshot; older pending snapshots can recover it from the
retained Standalone database. No database migration is needed.

If that endpoint returns 404, the existing partial screen and explanation remain:
missing feeds, removed Subscriptions absent from the server, and unmatched Episodes
are listed explicitly. Successful Subscriptions remain, while ordered State replay
and download copies wait for all mappings. Retry subscribes failed feeds and uses
the existing per-Subscription refresh for unmatched Episodes, then pulls again.
It never skips an operation or revives a removed Subscription. Other metadata
request failures remain retryable failures and do not queue dependent State.

## Bring-over emulator checklist for the main session

Run `:app:lintDebug` in the main environment; it was intentionally not run here.
No emulator checks were performed for bring-over in this worktree.
The requested offline command passed: **299 JVM tests**, 99 in `:domain` and 200
in `:data`, with zero failures, errors or skips; `:app:assembleDebug` passed.
This includes 26 bring-over tests and a cross-owner file/row commit locking test.
Server API compatibility was checked against the implementation and fake wire
transports; a live-server/emulator end-to-end run remains for the main session.

1. On a fresh Standalone Device subscribe to two controlled feeds. Make a custom
   Playlist, add Entries, listen partially and finish an Episode, Star another,
   edit a View, change Playback Settings and set a Download Rule. Store one Manual
   Download and one rule download. Record the counts shown in Listening stats.
2. Connect to a server that already has a Subscription from the same feed, a Default
   Playlist with an Entry, the three starter Views and some listening. Check the
   offer counts, scope/explanation and hours. Choose Not now: inspect server State
   for no Standalone edits, relaunch and reopen the offer from Settings → This Device.
3. Choose Bring it over. Check one Default Playlist, one set of equivalent starter
   Views, preserved existing server Entries/Views/listening, mapped Entries and
   Positions, History, Listening Timeline, Playback/Download settings and additive
   Listening log totals. Confirm the original Standalone database and files remain.
4. Disable networking during Subscribe, Library paging, push and copying in separate
   runs. Force-stop the app and relaunch, then reconnect. Check progress resumes,
   only failed feeds are retried, no duplicate Subscriptions/Entries/Views appear,
   and listening totals increase exactly once. Close progress and reopen in Settings.
5. Include an unreachable feed, a phone-retained Episode omitted from the current
   feed, and a removed Subscription with Listening log amounts unknown to the server.
   Check explicit feed/Episode rows, honest waiting copy and Retry. Restore the feed
   or Episode on the server and retry; verify successful feeds are not subscribed
   again and the completed transfer disappears from Settings.
6. With the server and publishers unreachable, play both transferred downloads by
   their new Episode ids. Confirm destination rows/files, Manual ownership, retained
   original files and no immediate cleanup even if the server marked the Episode
   Played before the move. Check an already-downloaded destination Episode stays
   playable. Explicitly remove a migrated download and verify normal removal.
7. Test light/dark, large text, rotation, compact height, TalkBack and predictive Back
   on offer, moving, partial and success. Verify scrolling and 48dp actions. Repeat
   ordinary Standalone use and an existing server session with pending edits and
   downloads to check that the new flow does not intervene.

## Dependencies and offline validation

Media3 `media3-exoplayer` and `media3-session` are pinned to **1.11.1**;
`work-runtime-ktx` is **2.12.0**. These and their transitive dependencies resolved
from the existing cache. The Compose BOM supplies the adaptive navigation/layout
artifacts already used in milestone 2. No jars were vendored.

From the repository root, using this machine's existing cache:

```sh
export PODLIST_JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export JAVA_HOME="$PODLIST_JAVA_HOME" ANDROID_HOME="$HOME/Library/Android/sdk"
export GRADLE_RO_DEP_CACHE="$HOME/.gradle/caches" GRADLE_USER_HOME="$PWD/.gradle-worktree"
mkdir -p "$GRADLE_USER_HOME"
cp -rf "$HOME/.gradle/wrapper" "$GRADLE_USER_HOME/"
cd apps/android
./gradlew :domain:test :data:test :app:assembleDebug --offline --console=plain
```

The full debug APK compiles offline. Before bring-over, milestone 4 verification had **272 passing
JVM tests**: 99 in `:domain`, 173 in `:data`, with zero failures or skips. The affected
TypeScript feed, Subscription, directory and Chapter suites have **51 passing tests**;
server/domain TypeScript checks and formatting checks pass. No dependencies were added.
This includes all existing protocol vectors,
Played thresholds and listening samples/sessions read directly from the committed
`packages/domain/protocol/listening.json`, plus playback-policy, reporting,
download-planning, fake-transfer and atomic-outbox regressions. The shared feed vectors
are generated from `packages/server/src/FeedParser.ts` by
`packages/domain/scripts/feed-vectors.ts` and committed as `protocol/feeds.json`.
Both TypeScript and Kotlin execute them, including duration formats, dates, missing
enclosures, guid fallback, namespace fields, escaping, malformed XML and unsafe DTDs.
Regenerate with `pnpm --filter @podlist/domain protocol`.

Before this change, `:app:lintDebug` passed in the main environment. It was not run
for milestone 4: the sandbox cannot resolve `com.android.tools.lint:lint-gradle:32.5.1` offline.

Before Standalone Device support, checked on an Android 16 emulator on 9 Nov 2026:
player layout, transport, Chapters,
speed, Sleep at end of Chapter, Played and advancing, Add with Undo, dark mode, the
media notification, screen off, Manual and rule downloads, stored playback and the
Offline banner with the server stopped. The list below still needs Android Auto,
Bluetooth and headphones, drag reordering, the two-transfer limit and outbox replay.
The emulator's own networking layer crashes it every few minutes on this Mac (its
main loop blocks in `close()` from `udp_detach`); quit and reopen it to continue.

## Milestone 4 emulator checklist for the main session

Run `:app:lintDebug` in the main environment. Repeat these checks on a Standalone
Device and with a connected server; also repeat durable State edits with that server
stopped and check their replay after reconnecting. No milestone 4 emulator checks
were performed in this worktree.

1. Start fresh with no network: Start on this phone, three starter Views, Default
   Playlist, and Getting started above Views. Subscribe, open a View, add Entries,
   then remove Entries and relaunch: completed steps stay ticked. Hide, reopen from
   Settings → Help, delete a starter View and relaunch. On a server, delay the initial
   Library response and confirm it never creates starter Views or a fresh checklist
   while loading; an existing Library must keep its Views.
2. Open a View's pencil. Exercise all seven conditions, Sort and Show, Published
   date selection, both podcast modes, Any, text, reversed dates/lengths and their
   correction. Check live count, primary values, Undo above the mini player, name,
   Delete/Undo, Done and + creation. Search titles, podcast names and show notes;
   save with a blank/valid name and compare the saved View's results.
3. Create a Playlist from +, try blank and duplicate names, rename, toggle Clear on
   Played and Undo. Confirm enabling it keeps already Played Entries. The Default
   Playlist must expose only Clear on Played. Delete an Active Playlist, confirm
   Default becomes Active and playback pauses, Undo, then Delete → Trash → Restore
   → Undo. Check the configured retention value and expired Trash behavior.
4. Play across several Episodes with Clear on Played. In History check only playback
   finishes; in Listening Timeline check stretches, finishes, adds/moves/removes and
   manual Played rows. Preview Rewind: verify every summary group and Artwork, then
   confirm the Cursor, Position, restored order and Unplayed facts. Later deliberate
   adds/reorders/manual marks must stay. Undo while paused and after resuming, then
   relaunch. Time listened must never decrease.
5. Open a Subscription pencil: all three Download Rules, positive Keep at most and
   blank/unlimited; Default and custom threshold, speed, skips and boost, including
   resetting each to Default. Change global defaults and verify inherited labels.
   Mark all Played/Undo; Unsubscribe confirmation, Undo, Redo and failed-call Retry.
   Verify Orphaned Entries/Stars, downloads and retained overrides. With a stopped
   server, pending overrides must still be used by local playback.
6. Open Listening stats with no listening, then after partial listening and playback
   finishes. Check this week/month/all time, Monday/date boundaries, streak, bar
   selection and horizontal scroll, table, top podcasts and removed Subscription
   names. Manual Played must not increase finished; Rewind/Unplayed can reduce it
   while time listened remains.
7. In Settings check section order, global Playback Settings, Trash retention and
   Help. Import a nested OPML containing a duplicate, valid feed and failing feed;
   check added/already-subscribed/failure counts and Retry failed Subscriptions.
   Export with the system picker, inspect/round-trip the XML and exclude inactive
   Subscriptions. Cancel both pickers, try malformed/over-8-MiB documents and failed
   reads/writes, and retry a server import after losing connectivity.
8. Long press Episodes in a View, Search, Subscription and Playlist. Check contextual
   count, checkbox/title taps, hidden trailing actions, Back cancellation and all
   four actions with Undo. Choose another Playlist and create one in Add; several
   Next/Last must keep displayed order, moving existing Entries without duplicates.
   Select several Subscriptions and change their Download Rules, then Undo.
9. Long press the launcher icon and open each destination shortcut from both a cold
   launch and an already nested screen. Navigation should reach that destination's
   root without starting audio.
10. Check all new screens and sheets in light/dark, large text, compact height,
    rotation, keyboard open/closed, TalkBack and predictive Back. Check 48dp actions,
    scrolling, player/navigation reachability and Undo positioning. Back must never
    pause playback; explicit Rewind/Delete of the playing Playlist pauses it.

## Standalone Device verification for the main session

Run `:app:lintDebug` in the main environment; it was intentionally not run here.
No emulator checks were performed for this implementation. Check these on a Device:

1. Clear app data and launch with no server or network. Verify the welcome copy,
   Start on this phone, Connect to a server, and both button/system Back routes.
   Start, relaunch and confirm three starter Views plus Default Playlist, no sync
   banner, and Settings' exact Server text. Delete a starter View and relaunch.
2. Open Library +. Search a name and paste a valid feed address. Check Artwork,
   title, author, preview, Subscribe → Subscribed, several subscriptions without
   dismissal/input loss, duplicate results, invalid-feed copy and network retry.
3. Stream publisher audio and open Episode detail/Chapters without a server. Check
   JSON Chapters, ID3 fallback, Chapter Artwork, system notification and background
   playback; failure should offer playback Retry and never try a server URL.
4. Exercise Playlists, per-Entry Positions, Played/Star, Listening log, History and
   Listening Timeline; kill/relaunch and verify retention. Unsubscribe with an Entry,
   a Starred Episode and a Manual Download, then Undo/Redo and re-subscribe. Verify
   retained ids/settings/rules and that only Orphaned Episodes remain visible.
5. Enable All New, publish a new Episode in a controlled feed, and verify refresh
   on foreground entry and the periodic worker while the Activity is absent. Check
   download triggering without an edit, stored playback, cancellation and retry.
   Repeat on a VPN and a network without validated internet; test ETag/304 and a
   failing Subscription alongside a working one.
6. Upgrade an existing server-connected installation with pending edits/downloads.
   Confirm the same Library and media remain, `/api/directory/search` and Subscribe
   work, and sync/retry still behaves normally. From a Standalone Device connect
   to a server and choose Not now: verify separate Libraries and no upload of Standalone edits. Reopen
   saved server origins to confirm isolation and retained downloads.
7. Review the agreed welcome and Add podcasts on compact screens, large text,
   rotation, dark mode, keyboard open/closed and predictive Back. Confirm the player
   keeps running while navigating and all new targets are at least 48dp.

## Existing playback verification for the main session

1. Check compact layout, long titles, dark mode and large text. Confirm mini controls
   are 48dp / 72dp high, no visible names in the player, resolved Chapter Artwork,
   dominant transport controls, and a reachable bottom navigation bar.
2. Exercise Add → nested Episode/Chapters/Entries → player → destination predictive
   Back, including cancelled gestures. Every Back/navigation action must leave
   audio running. Check Active Playlist routing and independent tab positions.
3. Play, background, lock, rotate and dismiss the Activity; test notification,
   Bluetooth/media buttons, focus loss/return and unplugging headphones. Browse
   Playlists/Entries and start/resume playback from Android Auto.
4. Verify per-Entry Resume, Play Now/Next/Last, New Playlist validation, Undo,
   switching empty/nonempty Playlists, and both drag and discrete Entry moves.
5. Check default/zero/custom Played thresholds, continued audio after Played,
   Clear on Played, History, actual-end/outro advancement and every sleep mode.
   Check independent Subscription overrides and transient Episode speed.
6. Play stored audio offline, publisher audio with the server stopped, host failure
   with server fallback, loading timeout, exhausted error and explicit retry.
   Check that fallback preserves Position/rate and Chapters can arrive late.
7. Start three downloads and confirm only two transfer, then cancel/retry, kill and
   relaunch. Check app-private files, failed status, Starred/Manual retention,
   Played/Entry cleanup, All New activation/caps, Library-only arrivals and changing
   the Download Rule on this Device. Check a downloaded Episode's Played tail.
8. Relaunch with the server stopped or blackholed: local Views remain usable and
   Offline appears within five seconds. Restart the server and check outbox replay
   and return to Ready. Check live listening reports while the Activity is hidden.

## Demo server

From the repository root, run:

```sh
node packages/web/ui-flows/demo.mjs
```

The script prints `PodList demo at http://127.0.0.1:<port>` and keeps the fixture
server running until Ctrl-C. In the **debug** emulator app, enter
`http://10.0.2.2:<port>` on first run (or Settings → Server). The fixture podcast
hosts stay on the Mac: Android requests Artwork through the PodList proxy, so the
fixture's loopback Artwork URLs need no rewriting. The demo Device's Download Rules
belong to that Device; this new Android Device therefore starts with Stream groups.
Stop the demo server to check offline browsing, then restart/reconnect to exercise
retry. A fresh demo invocation uses a new origin and a fresh local Library.
