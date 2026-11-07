# UI grade log

PodList graded against `~/Documents/UI_Guidelines` (`CRITIQUE.md`), as a **web app**: an Android-first PWA, with the Mac app being the same build in an Electron window.

**Goal:** 9.0 overall (set by the owner, 7 Nov). Work through the checklist failures in the guide's order: blockers, then majors in the lowest-scoring category, then the lowest category, re-grading with a fresh agent after each batch.

**Owner decisions (graded, not targeted):** Light appearance only until a dark theme is designed. Layout variant A (Views and Playlists as equal halves; lists, never capsules). Inter and Space Grotesk; blue primary #2b50c8; dark player bar.

## Method

- Flow runs: `pnpm --filter @podlist/web ui:flows [outDir]` runs the main tasks on fixed demo data at phone 412×915, zoomed-desktop 720×450 and desktop 1440×900, and writes measurements, screenshot strips, contact sheets and timed runs (`packages/web/ui-flows/README.md`).
- Graders: a fresh agent that hasn't seen earlier rounds, briefed with the app, the owner decisions and the flow run, does the full audit and writes the report. Reports are kept in `docs/ui-grade/`.
- Findings become beads (label `ui-grade`); fixes land as ordinary commits, with flows re-run when a main task changes.

## Rounds

| Category | Round 1 (7 Nov, Opus) | Round 2 (7 Nov, Opus) | Round 3 (7 Nov, Opus) | Round 4 (7 Nov, Opus) |
|---|---:|---:|---:|---:|
| Typography | 5.8 | 6.9 | 6.9 | 7.5 |
| Hierarchy | 6.4 | 7.2 | 7.8 | 7.6 |
| Spacing & density | 5.9 | 7.6 | 6.9 | 6.9 |
| Color & contrast | 6.2 | 6.9 | 8.2 | 6.9 |
| Iconography | 5.4 | 6.6 | 8.0 | 7.2 |
| Consistency & polish | 5.3 (stability 6.0) | 7.6 (stability 8.0) | 7.6 (stability 8.6) | 6.8 (stability 6.4) |
| Clarity | 4.9 | 7.4 | 7.8 | 7.5 |
| Platform fit | 6.8 | 6.7 | 6.9 | 6.9 |
| Interaction & feedback | 5.6 | 6.5 | 6.9 | 6.9 |
| **Overall** | **5.4** | **7.0** | **7.2** | **7.1** |

Round 1: coverage 95.4%; 19 failures (10 major, 9 minor, no blockers). Report: [docs/ui-grade/round-1-baseline.md](docs/ui-grade/round-1-baseline.md); flow summary: [round-1-flow-summary.md](docs/ui-grade/round-1-flow-summary.md). No core element moved unprompted in 51 measured steps; open a Playlist p75 132 ms, Play from here 107 ms.

Graded build: before View detail, Episode row actions and proxied artwork landed (commits c717897, 7f04e17, 05d04d4), so COPY-03's View placeholder is already gone.

Round 2: coverage 97.5%; 19 failures (11 major, 8 minor, no blockers); four categories capped at 6.9 by majors. Report: [docs/ui-grade/round-2.md](docs/ui-grade/round-2.md). Graded build 6db9bb9 (after the round 1 fixes). No core element moved in 72 measured steps; open a Playlist p75 134 ms, Play from here 111 ms.

Round 3: coverage 97.6%; 11 failures (8 major, 3 minor, no blockers); four categories capped at 6.9. Report: [docs/ui-grade/round-3.md](docs/ui-grade/round-3.md). Graded build fd860c3. Core elements within 2 px at all widths; p75 100–118 ms.

Round 4: coverage 98.8%; 10 failures (8 major, 2 minor); five categories held at 6.9 or below. Report: [docs/ui-grade/round-4.md](docs/ui-grade/round-4.md). Graded build 6be414f. The grader probed side paths the flows don't cover (removing rows by keyboard, the drawer's Episode page, right-click), which is where most new failures came from.

## Work list (round 4)

### Majors
- [x] FLOW-04: Undo shows above the Now Playing drawer.
- [x] FLOW-02: removing a row by keyboard keeps focus in the list.
- [x] APPEAR-04: the drawer's Episode page labels pass contrast; Starred label text passes on light.
- [x] KEY-07: Shift-Space doesn't play or pause.
- [x] WTYPE-04: the desktop row checkbox has a real target, clear of the row link.
- [x] BROWSER-06 / EDIT-05: right-click and ⌘C offer Open in New Tab and Copy Link; native menu in the Mac app; Share on the Episode page.
- [x] BROWSER-04: the "Next and Last go to" panel opens Episodes with links.

### Minors
- [x] APPEAR-11 the drawer's Episode page stays on its Episode after Played · APPEAR-09 Downloaded doesn't use a check.

### Craft gaps
- [x] Two body text steps; dark menus in the drawer; capped Playlist width; phone Playlist rows without the number column or empty tracks; no repeated tiles; one Add icon; desktop layout from 704 px; Mac: no Reload in the shipped app, Redo, Undo names its step; speed and sleep in the desktop bar.

Fixed on 7 Nov (bead pod-6jf.22). Notes: Base UI's modal drawer doesn't block clicks on a toast above it, so raising the toast layer was enough. Focus recovery happens only when the focused control itself has left the page, so clicking empty space never pulls focus back into a list. In the Mac app, Episode rows get a native menu: the shell asks the page what is under the pointer (`data-episode-menu`) and sends commands back as events. Body text is now 15 px and 13 px, with 12 px only for small capitals, keys and badges. The desktop layout starts at 704 px. Flow run 5: no stability failures.

## Work list (round 3)

### Majors
- [x] WKEY-03: Tab stays inside the Add and Keyboard shortcuts dialogs.
- [x] BROWSER-01 / DATA-06: Back and reload keep a View's scroll position.
- [x] WTYPE-02 / WTYPE-05: Playlist rows, the mini-player title and the drawer's times survive 200% text and 320 px.
- [x] WKEY-02: no single-character shortcut that can't be turned off (`?`).
- [x] WDATA-04: the phone's Undo doesn't vanish after 8 s.
- [x] DLG-07: the Add dialog has a way to cancel.

### Minors
- [x] WCOPY-01 Esc closes the panel · PTR-04 player tooltips on focus · TYPE-08 Mac setup apostrophes.

### Craft gaps
- [x] Desktop View: the designed right panel (target Playlist's Up next) and a row hover fill.
- [x] Whole row opens the Episode (phone target).
- [x] Mac shell: File menu (⌘W), Controls menu, View menu order, Episode commands on right-click.
- [x] One meaning per colour; one progress blue.
- [x] Details: no focus ring on launch, "1 Entry", no breaks inside "26 min", px radii, "Up next · 0", live Position in "In your Playlists".
- [x] Playlists: Episode in a side panel on wide screens; the same list keys as Views.

Fixed on 7 Nov (beads pod-6jf.20, .21). Notes: Base UI's dialogs let Tab fall out past their last control, as the drawer did, so all three use `wrapTab`. The router's scroll restoration runs before lists fill in from the local database, so lists restore their own position per history entry (`lib/scrollMemory.ts`). The shortcuts reference moved from `?` to ⌘/ or Ctrl+/. Undo toasts stay until dismissed or replaced. Flow run 4: no stability failures.

## Work list (round 2)

### Majors
- [x] DATA-04 / WDATA-04 (Interaction, lowest): Remove on Playlist Entries and Up next; an undo stack that ⌘/Ctrl-Z walks; the toast stops being the only way back.
- [x] WKEY-03: the drawer holds focus; closing the panel returns focus to the row.
- [x] APPEAR-05: reduced motion cross-fades instead of sliding.
- [x] DATA-06: relaunch reopens the last screen and the "Next / Last go to" target.
- [x] AX-02: the Episode open in the panel has a row tint, a leading bar and `aria-current`.
- [x] BROWSER-01: Back closes one overlay at a time.
- [x] BROWSER-04: modified clicks on titles behave like links.
- [x] BROWSER-06: Mac context menu.
- [x] LIST-07: desktop Episode list keyboarding (one Tab stop, arrows, Space, Enter).
- [x] WTYPE-02: rows and player bars survive 200% text.

### Minors
- [x] FLOW-06 sidebar skeletons · KEY-08 shortcuts reference · PTR-04 tooltips on focus · APPEAR-09 distinct row icons · TYPE-07 no underlined buttons · COPY-04 one wording per term · BROWSER-09 Mac Back/Forward · WTYPE-01 skip numerals ≥ 11 px.

Fixed on 7 Nov (beads pod-6jf.12–.19), with e2e tests for the list keys, focus, Back, undo and relaunch (`e2e/keyboard`, `navigation`, `undo`). Also from the round 2 notes: row actions show on hover, focus or selection and row Play stays quiet, so a View reads as titles; one size for Episode titles; one near-black for the toast and player; the desktop opens on a View rather than repeating the sidebar; "Play Next and Play Last go to". Flow run 3: no stability failures; open a Playlist p75 118 ms, Play from here 100 ms.

## Work list (round 1)

### Majors
- [x] COPY-02 (Clarity, lowest): playback errors in plain words with Try again; "Playlist no longer exists"; a styled not-found page.
- [x] START-01: loading vs empty: no false "No Views yet" / "No Subscriptions yet"; skeleton titles instead of "Episode unavailable" while the catalogue loads.
- [x] FLOW-02: focus dropped after "Play this".
- [x] WKEY-03: focus the new screen's heading on navigation.
- [x] WKEY-04: `scroll-padding-bottom` for the fixed player and tabs.
- [x] WCOLOR-02: focus ring at full strength (6.25:1).
- [x] APPEAR-03: forced-colors boundaries for buttons, progress, selection.
- [x] AX-02: selected tab and Active Playlist shown by more than colour.
- [x] TYPE-05: rem sizes so text follows the browser font size.
- [x] WTYPE-01: no text under 12 px.

### Minors
- [x] CTRL-05 pressed states · PTR-04 tooltips · APPEAR-09 skip glyphs with 15/30 · APPEAR-11 "Playing" while paused · TYPE-07 caps tracking · TYPE-08 curly apostrophes · COPY-01 one vocabulary (Library, Now/Paused, Active) · COPY-03 empty states with a next step · BROWSER-03 page titles.

Fixed on 7 Nov in one batch (beads pod-6jf.4–.11); flow run 2: no stability failures, focus lands on the new screen's heading and stays on the header button. Forced colors and larger font sizes need the round 2 grader to confirm.

### Outside the checklist
- [x] Playlist order drifts between devices (no stored order).
- [x] Phone back link announces itself as the current page.
- [x] Entry time means elapsed on one row and length on the next.
- [x] Phone mini-player lacks back 15.
- [x] Skip link past the desktop sidebar; Space to play or pause.
- [x] Flush the Position on `pagehide` (up to 15 s can be lost).
