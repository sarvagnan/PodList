# PodList for Android — milestone 1

An ordinary Gradle project, outside the pnpm workspace. `:domain` is pure Kotlin/JVM
and owns the wire models, operation replay, Playlist/Played/Timeline rules, Rewind,
and Listening accounting. `:data` owns native bundled SQLite, the shared migrations,
State documents/indexes, View compilation, and durable local edits/outbox/metadata.
`:app` is only an edge-to-edge Compose placeholder, with system fonts and light/dark
Material 3 colors derived from PodList blue (`#2b50c8`). Window constraints live at
the shell boundary for future window size classes. No registration, networking,
playback, downloads, or product screens are implemented.

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

The contract currently contains 20 sync vectors (135 operations, 65 checkpoints),
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

Device kinds remain `pwa` and `desktop`; native registration needs an owner decision
in milestone 2. The contract's documented text folding, equal-time arrival ties,
future Published dates, and end-of-sample timezone behavior are preserved. No new
contract interpretations are intended. Network failures during dependency resolution
must be reported as build blockers; do not vendor dependency jars to bypass them.
