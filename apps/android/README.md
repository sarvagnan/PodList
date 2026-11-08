# PodList for Android — milestone 2

An ordinary Gradle project, outside the pnpm workspace. `:domain` is pure Kotlin/JVM
and owns wire models and domain rules. `:data` owns native bundled SQLite, the
shared schema and View compiler, durable edits/outbox, HTTP transport and sync.
`:app` connects the Android lifecycle to sync and presents the read-only compact
phone layout D in Compose Material 3. System fonts, edge to edge, PodList blue
(`#2b50c8`) and system dark mode are used throughout.

Views, Playlists and Library retain independent navigation stacks and scroll
positions using the adaptive navigation suite and the predictive-back-enabled
`NavigableListDetailPaneScaffold` wrapper around `ListDetailPaneScaffold`.
Views execute the shared compiler; Playlists show ordered Entries and their own
Positions and Cursor; Library groups Subscriptions by this Device's Download Rule.
Read-only Episode detail and Trash are reachable too. Settings contains Server only.
Playback, downloads, adding/editing and selection wait for later milestones; their
controls are omitted. No emulator/device checks have been performed for this milestone.

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
forbid cleartext; debug Network Security Config permits it for that address alone.
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
read-only milestone.

Artwork uses `/api/artwork?url=…&size=128`, with Episode → Subscription fallback,
an 8 MiB memory cache and 64 MiB disk cache. Cached Artwork remains usable offline.
No image-loading or HTTP-stack dependency was added.

## Added dependencies and offline validation

The Compose BOM supplies `material3-adaptive-navigation-suite` (1.4.0),
`adaptive-layout` and `adaptive-navigation` (1.3.0). These implement the approved
adaptive structures and predictive back. `lifecycle-viewmodel-ktx:2.9.4` keeps work
across Activity recreation; `kotlinx-coroutines-android:1.9.0` provides lifecycle
jobs, IO dispatch and trigger coalescing. The serialization plugin is also enabled
for `:data` using the already pinned Kotlin version.

For an offline build using this machine's existing dependency cache:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PODLIST_JAVA_HOME="$JAVA_HOME"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export GRADLE_RO_DEP_CACHE="$HOME/.gradle/caches"
export GRADLE_USER_HOME="$PWD/.gradle/task-home"
mkdir -p "$GRADLE_USER_HOME"
cp -rf "$HOME/.gradle/wrapper" "$GRADLE_USER_HOME/"
./gradlew --offline :domain:test :data:test :app:assembleDebug
```

At implementation time all JVM tests compile and pass offline. The APK build is
blocked before Kotlin compilation by the three adaptive artifacts listed above,
which are absent from this machine's cache. No dependency jars were vendored.
The main session must resolve these dependencies, compile the full app and check
compact phone navigation, dark mode, predictive back and lifecycle behavior.

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
