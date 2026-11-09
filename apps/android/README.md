# PodList for Android — milestone 3

An ordinary Gradle project, outside the pnpm workspace. `:domain` is pure Kotlin/JVM
and owns wire models, Played/Position/listening accounting, sleep and advancement
policy, and download planning. `:data` owns bundled SQLite, the shared schema and
View compiler, atomic outbox batches, HTTP transport, sync, audio metadata and
atomic private-file commits. `:app` connects these to Compose, Media3 and WorkManager.
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
Manual Download, In your Playlists and each Entry's Resume action. Settings exposes
Playback defaults and Server; Subscription pages expose this Device's Download Rule.
Later milestone controls, including top-bar creation, selection, pencils, Rewind,
Listening stats and Add podcasts, remain omitted.

## Playback and downloads

`PlaybackService` is a Media3 foreground `MediaLibraryService`. ExoPlayer handles
background audio, audio focus, becoming noisy and wake locks. MediaSession supplies
lock-screen/media notifications with Episode and podcast names, back 15 / forward
30 commands, and an Android Auto tree of Playlists → Entries. Library subscriptions
are invalidated after local State/Library changes. Media buttons can resume the
saved Active Playlist. No emulator or Android Auto checks have been performed here.

`ListeningSession` emits durable batches with the final Position before Played,
15-second reports, explicit seek/rate/pause/failure/lifecycle flushing, and
`RecordListening` for the Played tail. Another Device's Position is adopted while
paused without echoing an Operation. A newly observed Played fact also switches
the loaded Episode to listening-only reporting. `PlaybackPolicy` owns target
selection, intro position, actual-end/outro advancement, monotonic duration sleep,
Chapter/Episode sleep, effective Subscription overrides and Artwork resolution.
Player speed changes do not save Playback Settings. Native Volume boost uses the
platform LoudnessEnhancer with 6dB gain when supported.

Sources prefer a stored file; otherwise they try the publisher and then the server
proxy, each once per load. Fallback keeps Position and speed, including a ten-second
loading timeout. An exhausted load exposes an error and explicit retry. Late
Library metadata fills in names, Chapters, attribution and the publisher source.
Chapter resolution is cached in the local Episode row. Podcast publishers may use
HTTP audio, so media cleartext is allowed; `ServerAddress` continues to enforce
HTTPS for PodList origins except the debug emulator address. All HTTP adapters use
a generic User-Agent and send no personal Device name.

Downloads use foreground WorkManager jobs and app-private, origin-isolated files.
A process-wide semaphore permits at most two transfers, with an additional lock
preventing replacement attempts for the same Episode from racing. The Media3 HTTP
source follows publisher redirects, then falls back to the server on failure.
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

First run checks `/api/health` before saving an origin. There is no login or secret.
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
address. Old local data is retained. There is no server-data migration UI.

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
also triggers the same scheduler. Android background services are not part of this
implementation.

The milestone 2 offline banner existed but could wait behind 10-second connect /
20-second read timeouts and the independent Library attempt. API transport now
uses two-second connect/read deadlines, and State failure is published before
Library sync starts. This keeps the local UI usable and exposes the first failure
without waiting for the rest of the pass. Check the five-second relaunch case on
the emulator, including a server that silently drops connections.

Artwork uses `/api/artwork?url=…&size=128`, with Episode → Subscription fallback,
an 8 MiB memory cache and 64 MiB disk cache. Cached Artwork remains usable offline.
No image-loading or HTTP-stack dependency was added.

## Dependencies and offline validation

Media3 `media3-exoplayer` and `media3-session` are pinned to **1.11.1**;
`work-runtime-ktx` is **2.12.0**. These and their transitive dependencies resolved
from the existing cache. The Compose BOM supplies the adaptive navigation/layout
artifacts already used in milestone 2. No jars were vendored.

From the repository root, using this machine's existing cache:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PODLIST_JAVA_HOME="$JAVA_HOME"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export GRADLE_RO_DEP_CACHE="$HOME/.gradle/caches"
export GRADLE_USER_HOME="$PWD/apps/android/.gradle/task-home"
mkdir -p "$GRADLE_USER_HOME"
cp -rf "$HOME/.gradle/wrapper" "$GRADLE_USER_HOME/"
./apps/android/gradlew -p apps/android --offline :domain:test :data:test :app:assembleDebug
```

The full debug APK compiles offline. JVM verification has **190 passing tests**:
82 in `:domain`, 108 in `:data`. This includes all existing protocol vectors,
Played thresholds and listening samples/sessions read directly from the committed
`packages/domain/protocol/listening.json`, plus playback-policy, reporting,
download-planning, fake-transfer and atomic-outbox regressions. Tests were added
and run red before implementing each new behavior seam.

`:app:lintDebug` passes when run from the main environment; Codex's sandbox cannot
resolve `com.android.tools.lint:lint-gradle:32.5.1` offline.

Checked on an Android 16 emulator on 9 Nov 2026: player layout, transport, Chapters,
speed, Sleep at end of Chapter, Played and advancing, Add with Undo, dark mode, the
media notification, screen off, Manual and rule downloads, stored playback and the
Offline banner with the server stopped. The list below still needs Android Auto,
Bluetooth and headphones, drag reordering, the two-transfer limit and outbox replay.
The emulator's own networking layer crashes it every few minutes on this Mac (its
main loop blocks in `close()` from `udp_detach`); quit and reopen it to continue.

## Device verification for the main session

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
