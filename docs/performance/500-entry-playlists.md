# 500-Entry Playlists

Measured 8 November 2026 against the original UI at `2cf1123` and the implementation on `codex/offline-and-playlists`. The opt-in demo fixture is `startDemo({ large: true })`: 500 distinct Episodes in “Long listening”, with local silent audio. Ordinary demo tests retain their small fixture.

## Browser measurements

Chromium, 4× CPU throttling, 900 px high, at 1440 px and 412 px widths. Each table value is one isolated run in a fresh browser context after the local Library has loaded. Baseline and implementation use the same harness, with tracing off. These are representative timings, not statistical latency percentiles.

All interaction values are milliseconds, before → after.

| Interaction | Desktop, 1440 px | Phone, 412 px |
| --- | ---: | ---: |
| Open Playlist | 1397 → 172 | 1097 → 124 |
| Scroll jump | 709 → 64 | 541 → 69 |
| Keyboard reorder drop | 2277 → 138 | 1839 → 129 |
| Pointer reorder drop | 3362 → 107 | 1679 → 104 |
| Play from here | 4225 → 235 | 3445 → 208 |
| Drawer’s Up next | 3560 → 174 | 1798 → 57 |
| Continuous-scroll frame gap, p95 | 17 → 50 | 17 → 50 |

The harness records input-to-render time within the page, excluding Playwright’s actionability waits. Opening waits for an Entry title; reorder waits for the new order; playback waits for Pause; each then allows paint frames. Drag activation and its deliberate animation wait are excluded. The scroll jump moves 18,000 px and waits two frames; continuous scrolling samples 30 frames while moving 120 px each time. Desktop drawer time includes opening the drawer with Up next beside the player; phone time measures the Up next page after opening the drawer.

The multi-second stalls are removed, but the approximate 100 ms interaction budget is **not consistently met**. Mounting virtual rows also costs more during continuous scrolling than moving the original fully mounted DOM. Remaining interaction and frame costs are tracked in **pod-1qz**; this report does not claim a steady 60 fps at 4× CPU.

[Published measurement chart](https://generatedpages.burmese-mountain.ts.net/podlist-playlist-measurements/).

## Implementation and behavior

Both lists render a bounded viewport with two overscan rows. Dragged and focused Entries stay mounted, including while a portaled menu has focus. ResizeObserver supplies wrapped row heights without synchronous measurement for every new row. Measured heights survive navigation and reload so pixel scroll restoration stays consistent. Row contents are memoized against their Episode, Position, Played/Star state, Cursor, and reorder neighbors. Entry title reads depend on membership and Library updates rather than every Position report.

Regression tests cover fewer than 30 mounted grid rows at 500 Entries, grid navigation to Entry 500, menu moves to the bottom with focus retained, Undo, Back scroll restoration, adjacent pointer and keyboard reorder, Play from here, Up next, and keyboard dragging across the virtual viewport to position 19. Existing Playlist and drawer tests remain passing.

## Domain and persistence

No storage-model change is needed for ADR 0008. The repeatable native SQLite benchmark applies 100 moves and Position reports to 500 Entries: MoveEntry p95 **0.14 ms**, StateStore document/index write p95 **1.45 ms**, final Playlist document **48,322 bytes**. These native timings are unthrottled and exclude a durable disk’s fsync cost. Browser SQLite separately verifies that all 500 Entries and their Positions survive the same persistence path.

Run `node packages/server/scripts/benchmark-playlists.ts` for native numbers, and `pnpm --filter @podlist/web exec playwright test e2e/large-playlist.spec.ts --workers=1` for browser measurements. `PODLIST_TEST_WEB_ROOT` can point the fixture server to an archived original production build for the comparison.
