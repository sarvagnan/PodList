# UI grade log

PodList graded against `~/Documents/UI_Guidelines` (`CRITIQUE.md`), as a **web app**: an Android-first PWA, with the Mac app being the same build in an Electron window.

**Goal:** 9.0 overall (set by the owner, 7 Nov). Work through the checklist failures in the guide's order: blockers, then majors in the lowest-scoring category, then the lowest category, re-grading with a fresh agent after each batch.

**Owner decisions (graded, not targeted):** Light appearance only until a dark theme is designed. Layout variant A (Views and Playlists as equal halves; lists, never capsules). Inter and Space Grotesk; blue primary #2b50c8; dark player bar.

## Method

- Flow runs: `pnpm --filter @podlist/web ui:flows [outDir]` runs the main tasks on fixed demo data at phone 412×915, zoomed-desktop 720×450 and desktop 1440×900, and writes measurements, screenshot strips, contact sheets and timed runs (`packages/web/ui-flows/README.md`).
- Graders: a fresh agent that hasn't seen earlier rounds, briefed with the app, the owner decisions and the flow run, does the full audit and writes the report. Reports are kept in `docs/ui-grade/`.
- Findings become beads (label `ui-grade`); fixes land as ordinary commits, with flows re-run when a main task changes.

## Rounds

| Category | Round 1 (7 Nov, Opus) | Round 2 (7 Nov, Opus) | Round 3 (7 Nov, Opus) | Round 4 (7 Nov, Opus) | Round 5 (7 Nov, Opus) | Round 6 (7 Nov, Opus) | Round 7 (7 Nov, Opus) | Round 8 (7 Nov, Opus) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Typography | 5.8 | 6.9 | 6.9 | 7.5 | 6.9 | 6.9 | 8.2 | 8.5 |
| Hierarchy | 6.4 | 7.2 | 7.8 | 7.6 | 7.4 | 8.2 | 7.8 | 8.5 |
| Spacing & density | 5.9 | 7.6 | 6.9 | 6.9 | 6.5 | 7.4 | 7.6 | 8.0 |
| Color & contrast | 6.2 | 6.9 | 8.2 | 6.9 | 6.9 | 6.9 | 8.3 | 8.8 |
| Iconography | 5.4 | 6.6 | 8.0 | 7.2 | 7.6 | 8.0 | 8.4 | 8.5 |
| Consistency & polish | 5.3 (stability 6.0) | 7.6 (stability 8.0) | 7.6 (stability 8.6) | 6.8 (stability 6.4) | 6.8 (stability 7.8) | 7.6 (stability 8.0) | 7.6 (stability 8.4) | 7.7 (stability 8.4) |
| Clarity | 4.9 | 7.4 | 7.8 | 7.5 | 7.2 | 6.9 | 7.9 | 8.3 |
| Platform fit | 6.8 | 6.7 | 6.9 | 6.9 | 6.9 | 6.9 | 6.9 | 8.7 |
| Interaction & feedback | 5.6 | 6.5 | 6.9 | 6.9 | 6.9 | 4.9 | 6.9 | 6.9 |
| **Overall** | **5.4** | **7.0** | **7.2** | **7.1** | **6.9** | **6.9** | **7.6** | **8.2** |

Round 1: coverage 95.4%; 19 failures (10 major, 9 minor, no blockers). Report: [docs/ui-grade/round-1-baseline.md](docs/ui-grade/round-1-baseline.md); flow summary: [round-1-flow-summary.md](docs/ui-grade/round-1-flow-summary.md). No core element moved unprompted in 51 measured steps; open a Playlist p75 132 ms, Play from here 107 ms.

Graded build: before View detail, Episode row actions and proxied artwork landed (commits c717897, 7f04e17, 05d04d4), so COPY-03's View placeholder is already gone.

Round 2: coverage 97.5%; 19 failures (11 major, 8 minor, no blockers); four categories capped at 6.9 by majors. Report: [docs/ui-grade/round-2.md](docs/ui-grade/round-2.md). Graded build 6db9bb9 (after the round 1 fixes). No core element moved in 72 measured steps; open a Playlist p75 134 ms, Play from here 111 ms.

Round 3: coverage 97.6%; 11 failures (8 major, 3 minor, no blockers); four categories capped at 6.9. Report: [docs/ui-grade/round-3.md](docs/ui-grade/round-3.md). Graded build fd860c3. Core elements within 2 px at all widths; p75 100–118 ms.

Round 4: coverage 98.8%; 10 failures (8 major, 2 minor); five categories held at 6.9 or below. Report: [docs/ui-grade/round-4.md](docs/ui-grade/round-4.md). Graded build 6be414f. The grader probed side paths the flows don't cover (removing rows by keyboard, the drawer's Episode page, right-click), which is where most new failures came from.

Round 5: coverage 96.3%; 10 failures (6 major, 4 minor; one counted once across two IDs). Report: [docs/ui-grade/round-5.md](docs/ui-grade/round-5.md). Graded build 651e1d4, before the View editor, Search and Library screens. Every round's grader is fresh and probes new side paths, so each round finds a new set of majors, and any major caps its categories at 6.9: rounds 2–5 sit at 6.9–7.2. The owner chose (7 Nov): build the designed screens first, then keep grading with fresh graders exactly as before.

Round 6: coverage 94.7%; 14 failures (1 blocker, 9 major, 4 minor). Report: [docs/ui-grade/round-6.md](docs/ui-grade/round-6.md). Graded build 9aa0f2b, the first with every designed screen. The blocker (a rename typed just before leaving the screen was lost) caps Interaction at 4.9; uncapped, most categories are 8.0–8.6.

Round 7: coverage 92.7%; 6 failures (4 major, 2 minor, no blockers). Report: [docs/ui-grade/round-7.md](docs/ui-grade/round-7.md). Graded build c44b5e5 (before the row menus). Platform fit and Interaction are capped at 6.9 by majors; uncapped they are 8.5 and about 8.6, and the grader puts all four majors fixed near 8.3 overall.

Round 8: coverage 87.9%; 4 failures (1 major, 3 minor, no blockers). Report: [docs/ui-grade/round-8.md](docs/ui-grade/round-8.md). Graded build 383fff5. Interaction is capped at 6.9 by one major (focus after a failed Subscribe); uncapped it is about 8.6, and Overall near 8.6.

## Work list (round 8)

Fixed on 7 Nov:
- [x] WKEY-03 busy buttons (Subscribe, the confirm dialogs, OPML) stay focusable, so a failure leaves focus in the sheet.
- [x] Minors: COPY-01 one bulk bar ("N selected", ×, the same pill) and "Select" throughout · LIST-04 Search results end at 960 px · APPEAR-11 no Chapter line before the title; loading Entries are inert, with a neutral tile.
- [x] Craft: selects drawn to match fields (system arrow in forced colours); a feed address shows its podcast (title, artwork) before Subscribe, or says inline that it isn't a feed, and Enter subscribes; Back returns focus to the row you opened; Up next lists only now and next; the Episode screen's back link names where it came from and its title is the h1; Settings has a back link on the phone; side panels end at the header's edge; section labels align with their cards; at 200% text Entry actions stack beside the title; the Mac app dims Undo and Redo with nothing to take back (outside text fields); the Library table sorts by Podcast, Unplayed and Downloads.
- [x] Found while testing: a slow database open could leave its worker holding the database while every retry failed (each attempt now has its own scope); the window list no longer scrolls to the top when it mounts after Back.

## Work list (round 7)

Fixed on 7 Nov:
- [x] BROWSER-06 links, fields and selected text in a row keep the browser's menu; on desktop only an Entry's or Subscription's title is a link, and the rest of the row opens it and has the row's menu · WKEY-03 after a toast's Undo focus goes to what it brought back; after Subscribe to "Subscribed"; the Add sheet returns focus to its opener · WDATA-04 Unsubscribe errors stay in their dialog with Try again; a failed copy stays with Try again · START-02 Settings › Help › Show getting started, and the Mac app's Help › Getting Started.
- [x] Minors: FLOW-06 Search keeps its scope line, with the count beside it · APPEAR-10 fields and selects have a 3.6:1 edge.
- [x] Craft: the desktop player title uses its column; Subscription settings fold away below 1024 px; the phone's five Episode actions share one row; one settings row for Settings and Subscriptions; "Subscribed to" names the podcast; a "Next/Last to" label at every width; Switch Playlist is a filled button; the Trash's empty text; History and Timeline as plain rows; Episode detail capped at 44 rem; short windows tighten the header and player.
- [x] The Library as a desktop table (Library C): each podcast's Download Rule in its row, ticked rows changed together from the header with Undo; Keep at most and Speed from 1280 px; the phone keeps the grouped list.

## Work list (round 6)

Fixed on 7 Nov:
- [x] DATA-01 (blocker): a pending rename (Playlist or View name) is saved when the screen closes.
- [x] DATA-04 moving an Entry can be undone · KEY-04 dialogs open on their field · WKEY-03 focus after Edit View, Restore and Back · WDATA-03 / COPY-02 feed address errors inline, with a way forward · WDATA-04 the Undo offer stays until dismissed · BROWSER-05 Ctrl+K left to the browser (⌘K on a Mac) · APPEAR-03 selected segments in forced colors · WTYPE-02 200% text on a phone (no sideways scroll on any measured screen).
- [x] Minors: APPEAR-11 toast closes after Undo · CTRL-05 dialog button states · TYPE-06 line length · TYPE-08 apostrophes.
- [x] Craft: header label at 720 px; desktop Episode detail with Play Next and Play Last; Undo for every reversible edit; the Mac File menu (New Playlist ⌘N, New View ⇧⌘N, Add Podcasts ⇧⌘A); one Settings glyph.
- [x] Found while testing: Back could return a list to the top on a slow machine (the router's scroll reset, and a late focus move); a reload could show "open in another tab" while the old page let go of the database.
- [x] After round 6 (graded in round 7 only if they land before it): one right-click menu for every row (Episodes, Entries with Move to Top and Bottom, Subscriptions with their Download Rule), native in the Mac app; 320 px segments and progress bars; headers and empty states end with the 960 px content; the Add podcasts sheet holds still as results arrive; toasts sit above the Offline strip; the demo searches its fixture feeds instead of iTunes.

## Work list (round 5)

Fixed on 7 Nov, after the designed screens were built (View editor and Search, Library and Subscriptions, Download Rules, Playlist settings, Trash and reordering, History, Listening Timeline and Rewind, Settings, first run):
- [x] WTYPE-05 / WIN-03: rows too narrow for every action get one More actions menu (a container query); titles keep their width.
- [x] BROWSER-06 / BROWSER-08: on desktop the title is a plain link (the browser's link menu, selectable text) and the row's empty space opens the Episode; the app's own menu is desktop-only, so the phone keeps its long-press link menu.
- [x] WKEY-03: when the last row goes, focus goes to the heading; toasts no longer block Esc.
- [x] WTYPE-02: speed and sleep in the desktop bar only when there is room at the text size.
- [x] APPEAR-04: "Turn off" in the sleep menu is readable on the dark player.
- [x] LIST-06: Episode, Search and Settings screens keep their tab selected.
- [x] COPY-01 one word, "Active"; APPEAR-11 no half-filled player on a new Device.
- [x] Craft: ticked rows stay quiet; the header keeps its height when the bulk bar appears; the Mac Go menu has Views, Playlists, Library and Search (⌘1–3, ⌘K) and the app menu Settings (⌘,); the drawer has an edge in forced colors. Undo toasts last 20 s, paused while hovered or focused.

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
