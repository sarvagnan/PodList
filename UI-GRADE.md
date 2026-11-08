# UI grade log

PodList graded against `~/Documents/UI_Guidelines` (`CRITIQUE.md`), as a **web app**: an Android-first PWA, with the Mac app being the same build in an Electron window.

**Goal:** 9.0 overall (set by the owner, 7 Nov). Work through the checklist failures in the guide's order: blockers, then majors in the lowest-scoring category, then the lowest category, re-grading with a fresh agent after each batch.

**Owner decisions (graded, not targeted):** Light appearance only until a dark theme is designed. Layout variant A (Views and Playlists as equal halves; lists, never capsules). Inter and Space Grotesk; blue primary #2b50c8; dark player bar.

## Method

- Flow runs: `pnpm --filter @podlist/web ui:flows [outDir]` runs the main tasks on fixed demo data at phone 412×915, zoomed-desktop 720×450 and desktop 1440×900, and writes measurements, screenshot strips, contact sheets and timed runs (`packages/web/ui-flows/README.md`).
- Graders: a fresh agent that hasn't seen earlier rounds, briefed with the app, the owner decisions and the flow run, does the full audit and writes the report. Reports are kept in `docs/ui-grade/`.
- Findings become beads (label `ui-grade`); fixes land as ordinary commits, with flows re-run when a main task changes.

## Rounds

| Category | Round 1 (7 Nov, Opus) | Round 2 (7 Nov, Opus) | Round 3 (7 Nov, Opus) | Round 4 (7 Nov, Opus) | Round 5 (7 Nov, Opus) | Round 6 (7 Nov, Opus) | Round 7 (7 Nov, Opus) | Round 8 (7 Nov, Opus) | Round 9 (7 Nov, Opus) | Round 10 (7 Nov, Opus) | Round 11 (7 Nov, Opus) | Round 12 (7 Nov, Opus) | Round 13 (7 Nov, Opus) | Round 14 (7 Nov, Opus) | Round 15 (7 Nov, Opus) | Round 16 (8 Nov, Opus) | Round 17 (8 Nov, Opus) | Round 18 (8 Nov, Opus) | Round 19 (8 Nov, Opus) | Round 20 (8 Nov, Opus) | Round 21 (8 Nov, Opus) | Round 22 (8 Nov, Opus) | Round 23 (8 Nov, Opus) | Round 24 (8 Nov, Opus) | Round 25 (8 Nov, Opus) | Round 26 (8 Nov, Opus) | Round 27 (8 Nov, Opus) | Round 28 (8 Nov, Opus) | Round 29 (8 Nov, Opus) | Round 30 (8 Nov, Opus) | Round 31 (8 Nov, Opus) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Typography | 5.8 | 6.9 | 6.9 | 7.5 | 6.9 | 6.9 | 8.2 | 8.5 | 6.9 | 8.5 | 6.9 | 8.4 | 6.9 | 8.7 | 6.9 | 8.6 | 8.6 | 8.6 | 8.6 | 8.7 | 8.6 | 8.7 | 8.6 | 8.7 | 8.7 | 8.8 | 8.6 | 8.7 | 8.7 | 8.7 | 8.7 |
| Hierarchy | 6.4 | 7.2 | 7.8 | 7.6 | 7.4 | 8.2 | 7.8 | 8.5 | 8.5 | 8.4 | 8.3 | 8.2 | 8.5 | 8.6 | 8.6 | 8.5 | 8.5 | 8.6 | 8.6 | 8.6 | 8.5 | 8.6 | 8.5 | 8.5 | 8.6 | 8.6 | 8.5 | 8.5 | 8.6 | 8.6 | 8.7 |
| Spacing & density | 5.9 | 7.6 | 6.9 | 6.9 | 6.5 | 7.4 | 7.6 | 8.0 | 8.2 | 8.1 | 8.0 | 8.0 | 8.3 | 8.2 | 8.2 | 8.3 | 8.4 | 8.3 | 8.4 | 8.5 | 8.3 | 8.4 | 8.4 | 8.3 | 8.1 | 8.4 | 8.3 | 8.4 | 8.6 | 8.5 | 6.9 |
| Color & contrast | 6.2 | 6.9 | 8.2 | 6.9 | 6.9 | 6.9 | 8.3 | 8.8 | 8.8 | 8.7 | 8.6 | 8.5 | 8.7 | 8.6 | 8.6 | 8.8 | 8.6 | 8.8 | 6.9 | 8.9 | 8.7 | 8.8 | 8.8 | 8.8 | 8.8 | 9.0 | 8.8 | 8.8 | 8.9 | 9.0 | 8.8 |
| Iconography | 5.4 | 6.6 | 8.0 | 7.2 | 7.6 | 8.0 | 8.4 | 8.5 | 8.6 | 8.4 | 8.5 | 8.3 | 8.4 | 8.5 | 8.4 | 8.7 | 8.4 | 8.5 | 8.7 | 8.6 | 8.6 | 8.6 | 8.6 | 8.6 | 8.8 | 8.5 | 8.7 | 8.6 | 8.7 | 8.8 | 8.7 |
| Consistency & polish | 5.3 (stability 6.0) | 7.6 (stability 8.0) | 7.6 (stability 8.6) | 6.8 (stability 6.4) | 6.8 (stability 7.8) | 7.6 (stability 8.0) | 7.6 (stability 8.4) | 7.7 (stability 8.4) | 8.2 (stability 8.6) | 7.9 (stability 8.2) | 7.8 (stability 8.4) | 6.9 (stability 8.3) | 8.4 (stability 9.0) | 8.0 (stability 9.0) | 8.5 (stability 9.2) | 8.3 (stability 8.6) | 8.4 (stability 8.7) | 8.3 (stability 8.8) | 8.4 (stability 8.8) | 8.4 (stability 8.8) | 8.3 (stability 8.4) | 8.4 (stability 8.9) | 8.4 (stability 9.2) | 8.5 (stability 8.8) | 8.3 (stability 8.6) | 8.6 (stability 8.6) | 8.4 (stability 8.8) | 8.4 (stability 9.0) | 8.4 (stability 8.6) | 8.3 (stability 8.6) | 8.4 (stability 8.7) |
| Clarity | 4.9 | 7.4 | 7.8 | 7.5 | 7.2 | 6.9 | 7.9 | 8.3 | 8.5 | 8.3 | 6.9 | 8.6 | 8.4 | 8.8 | 8.8 | 8.7 | 8.6 | 8.5 | 8.6 | 8.8 | 8.5 | 8.7 | 8.4 | 8.8 | 8.9 | 8.8 | 6.9 | 8.6 | 8.8 | 8.7 | 8.5 |
| Platform fit | 6.8 | 6.7 | 6.9 | 6.9 | 6.9 | 6.9 | 6.9 | 8.7 | 6.9 | 6.9 | 6.9 | 6.9 | 8.8 | 8.7 | 8.9 | 8.8 | 8.7 | 8.8 | 8.8 | 8.8 | 6.9 | 8.7 | 8.7 | 8.8 | 8.7 | 8.8 | 9.0 | 9.0 | 8.7 | 8.7 | 9.0 |
| Interaction & feedback | 5.6 | 6.5 | 6.9 | 6.9 | 6.9 | 4.9 | 6.9 | 6.9 | 6.9 | 6.9 | 6.9 | 8.4 | 8.8 | 6.9 | 4.9 | 6.9 | 8.8 | 8.7 | 8.8 | 6.9 | 8.8 | 6.9 | 8.7 | 6.9 | 6.9 | 6.9 | 8.8 | 6.9 | 6.9 | 6.9 | 8.9 |
| **Overall** | **5.4** | **7.0** | **7.2** | **7.1** | **6.9** | **6.9** | **7.6** | **8.2** | **7.7** | **7.7** | **7.6** | **7.9** | **8.3** | **8.3** | **6.9** | **8.4** | **8.6** | **8.6** | **8.5** | **8.4** | **8.3** | **8.4** | **8.5** | **8.5** | **8.4** | **8.5** | **8.4** | **8.4** | **8.4** | **8.3** | **8.5** |

Round 1: coverage 95.4%; 19 failures (10 major, 9 minor, no blockers). Report: [docs/ui-grade/round-1-baseline.md](docs/ui-grade/round-1-baseline.md); flow summary: [round-1-flow-summary.md](docs/ui-grade/round-1-flow-summary.md). No core element moved unprompted in 51 measured steps; open a Playlist p75 132 ms, Play from here 107 ms.

Graded build: before View detail, Episode row actions and proxied artwork landed (commits c717897, 7f04e17, 05d04d4), so COPY-03's View placeholder is already gone.

Round 2: coverage 97.5%; 19 failures (11 major, 8 minor, no blockers); four categories capped at 6.9 by majors. Report: [docs/ui-grade/round-2.md](docs/ui-grade/round-2.md). Graded build 6db9bb9 (after the round 1 fixes). No core element moved in 72 measured steps; open a Playlist p75 134 ms, Play from here 111 ms.

Round 3: coverage 97.6%; 11 failures (8 major, 3 minor, no blockers); four categories capped at 6.9. Report: [docs/ui-grade/round-3.md](docs/ui-grade/round-3.md). Graded build fd860c3. Core elements within 2 px at all widths; p75 100–118 ms.

Round 4: coverage 98.8%; 10 failures (8 major, 2 minor); five categories held at 6.9 or below. Report: [docs/ui-grade/round-4.md](docs/ui-grade/round-4.md). Graded build 6be414f. The grader probed side paths the flows don't cover (removing rows by keyboard, the drawer's Episode page, right-click), which is where most new failures came from.

Round 5: coverage 96.3%; 10 failures (6 major, 4 minor; one counted once across two IDs). Report: [docs/ui-grade/round-5.md](docs/ui-grade/round-5.md). Graded build 651e1d4, before the View editor, Search and Library screens. Every round's grader is fresh and probes new side paths, so each round finds a new set of majors, and any major caps its categories at 6.9: rounds 2–5 sit at 6.9–7.2. The owner chose (7 Nov): build the designed screens first, then keep grading with fresh graders exactly as before.

Round 6: coverage 94.7%; 14 failures (1 blocker, 9 major, 4 minor). Report: [docs/ui-grade/round-6.md](docs/ui-grade/round-6.md). Graded build 9aa0f2b, the first with every designed screen. The blocker (a rename typed just before leaving the screen was lost) caps Interaction at 4.9; uncapped, most categories are 8.0–8.6.

Round 7: coverage 92.7%; 6 failures (4 major, 2 minor, no blockers). Report: [docs/ui-grade/round-7.md](docs/ui-grade/round-7.md). Graded build c44b5e5 (before the row menus). Platform fit and Interaction are capped at 6.9 by majors; uncapped they are 8.5 and about 8.6, and the grader puts all four majors fixed near 8.3 overall.

Round 8: coverage 87.9%; 4 failures (1 major, 3 minor, no blockers). Report: [docs/ui-grade/round-8.md](docs/ui-grade/round-8.md). Graded build 383fff5. Interaction is capped at 6.9 by one major (focus after a failed Subscribe); uncapped it is about 8.6, and Overall near 8.6.

Round 9: coverage 93%; 7 failures (5 major, 2 minor, no blockers). Report: [docs/ui-grade/round-9.md](docs/ui-grade/round-9.md). Graded build f89dff8. Three categories capped at 6.9 by narrow majors, two of them in the new Library sort; uncapped they are 8.6–8.8, and the grader puts Overall near 8.6 with them fixed.

Round 10: coverage 92.9%; 5 failures (3 major, 2 minor, no blockers). Report: [docs/ui-grade/round-10.md](docs/ui-grade/round-10.md). Graded build c4cadf6. Platform fit and Interaction capped at 6.9; uncapped 8.3 and 8.4, Overall about 8.4. Since round 7 every category without a cap scores 7.9–8.8: each fresh grader finds a few new narrow majors, and each one caps a category.

Round 11: coverage 93.8%; 7 failures (4 major, 3 minor, no blockers). Report: [docs/ui-grade/round-11.md](docs/ui-grade/round-11.md). Graded build a64216b. Four categories capped at 6.9, each by one local defect; uncapped 8.4–8.8.

Round 12: coverage 94.9%; 4 failures (2 major, 2 minor, no blockers). Report: [docs/ui-grade/round-12.md](docs/ui-grade/round-12.md). Graded build e26d615. Consistency and Platform fit capped at 6.9; uncapped about 8.3 and 8.7, Overall about 8.5. Interaction & feedback is uncapped for the first time (8.4).

Round 13: coverage 94%; 1 failure (1 major). Report: [docs/ui-grade/round-13.md](docs/ui-grade/round-13.md). Graded build e619d23. The best round so far: only Typography is capped (WTYPE-02, the Episode action labels at large text); stability 9.0, Platform fit 8.8, Interaction 8.8. About 8.6 with the cap lifted.

Round 14: coverage 91.9%; 3 failures (2 major, 1 minor), one cause: toasts on a layer above the Now Playing drawer. Report: [docs/ui-grade/round-14.md](docs/ui-grade/round-14.md). Graded build 922e506. Only Interaction is capped (about 8.8 uncapped).

Round 15: coverage 91.8%; 2 failures (1 blocker, 1 major). Report: [docs/ui-grade/round-15.md](docs/ui-grade/round-15.md). Graded build 912afee (before b32f87a). The blocker (AX-01: the drawer's pages and every toast are dialogs without a name) caps Interaction at 4.9 and so Overall at 6.9; uncapped about 8.6, with stability 9.2 and Interaction 9.0.

Round 16: coverage 90.8%; 2 failures (1 major, 1 minor). Report: [docs/ui-grade/round-16.md](docs/ui-grade/round-16.md). Graded build 86f674e. The highest so far: only Interaction is capped (KEY-04, focus after Back to Search); about 8.7 uncapped. Every other category is 8.3–8.8.

Round 17: coverage 93.3%; 1 failure (1 minor), no blocker or major for the first time. Report: [docs/ui-grade/round-17.md](docs/ui-grade/round-17.md). Graded build 69e72de. Nothing caps the score: every category is 8.4–8.8, and what stands between it and 9.0 is craft.

Round 18: coverage 93.9%; 2 failures (both minor). Report: [docs/ui-grade/round-18.md](docs/ui-grade/round-18.md). Graded build 8a7318b. No caps again: categories 8.3–8.8. The gap to 9.0 is consistency between screens (insets, widths, settings rows, row actions).

Round 19: coverage 97.0%; 2 failures (1 major, 1 minor). Report: [docs/ui-grade/round-19.md](docs/ui-grade/round-19.md). Graded build bf2bd0c. The major is round 18's own Active Playlist dot, which vanishes in forced colours (Color capped at 6.9; 8.8 uncapped). Every other category is 8.4–8.8.

Round 20: coverage 96.0%; 1 failure (1 major: focus to body after first run's Skip). Report: [docs/ui-grade/round-20.md](docs/ui-grade/round-20.md). Graded build 3aa7f41. Interaction capped at 6.9 (about 8.8 uncapped); Color reaches 8.9. Rounds 19 and 20 were each capped by a regression from the round before: each fix batch now gets its own focus and forced-colour checks.

Round 21: coverage 95.9%; 2 failures (1 major, 1 minor). Report: [docs/ui-grade/round-21.md](docs/ui-grade/round-21.md). Graded build 7bd406d. Platform fit capped at 6.9 by LIST-06 (the tab and sidebar lose their place when an Episode opens from the Library or a Playlist); 8.7 uncapped.

Round 22: coverage 97.9%; 3 failures (2 major, 1 minor). Report: [docs/ui-grade/round-22.md](docs/ui-grade/round-22.md). Graded build 9498706. Interaction capped at 6.9 by WKEY-03 (focus to the page after bulk Mark Played and Mark all Played); about 8.8 uncapped. LIST-06 and FLOW-05 pass; Platform fit back to 8.7.

Round 23: coverage 94.9%; no failures. Report: [docs/ui-grade/round-23.md](docs/ui-grade/round-23.md). Graded build a35c0c1. No cap; Consistency and Clarity lowest at 8.4. What remains is craft.

Round 24: coverage 97.0%; 1 failure (major DATA-06: the Library's sort is forgotten on leaving it). Report: [docs/ui-grade/round-24.md](docs/ui-grade/round-24.md). Graded build 78db0f3. Interaction capped at 6.9 (about 8.9 uncapped); Clarity 8.8, Platform fit 8.8.

Round 25: coverage 90%; 2 failures (major AX-04: on the phone, Entries reorder only by drag; minor CTRL-05: the second tab's "Use here" has no states). Report: [docs/ui-grade/round-25.md](docs/ui-grade/round-25.md). Graded build 93dc44f. Interaction capped at 6.9 (about 8.8 uncapped); Clarity 8.9.

Round 26: coverage 93.8%; 2 failures (major DATA-04: View edits have no visible Undo; minor FLOW-06: the first-run card goes mid-task). Report: [docs/ui-grade/round-26.md](docs/ui-grade/round-26.md). Graded build 26d42f9. Interaction capped at 6.9 (about 8.9 uncapped); Color reaches 9.0.

Round 27: coverage 96.9%; 2 failures (major COPY-02: offline, an Episode that isn't downloaded says only "Couldn't play"; minor TYPE-08: nested quotes in the Mac Undo item). Report: [docs/ui-grade/round-27.md](docs/ui-grade/round-27.md). Graded build d68aaff. Clarity capped at 6.9 (8.6 uncapped); Platform fit 9.0, Interaction 8.8.

Graders now pull in opposite directions on two points: list width (rounds 21–24: fill the window; round 27: cap near 800 px) and Rewind to here (round 24: hide until hover; round 26: show at rest; round 27: hide again). Both stay as they are.

Round 28: coverage 93.9%; 2 failures (major WKEY-04: on the phone an Undo toast covers the focused choice in a sheet; minor COPY-01: three names for each Download Rule). Report: [docs/ui-grade/round-28.md](docs/ui-grade/round-28.md). Graded build 528aab5. Interaction capped at 6.9 (about 8.9 uncapped); Platform fit 9.0, stability 9.0.

Round 29: coverage 91.8%; 2 failures (major WKEY-03: Back or Forward that opens or closes a desktop side panel leaves focus on the page; minor FLOW-07: Add to a Playlist's primary on the left). Report: [docs/ui-grade/round-29.md](docs/ui-grade/round-29.md). Graded build d1791ec. Interaction capped at 6.9 (about 8.8 uncapped); Spacing 8.6.

Round 30: coverage 93.9%; 1 failure (major WDATA-03: clearing a Playlist's name refills the old one, so a rename saves "CommuteBus"). Report: [docs/ui-grade/round-30.md](docs/ui-grade/round-30.md). Graded build a3ff975. Interaction capped at 6.9 (about 8.8 uncapped).

Round 31: coverage 92.8%; 3 failures (major WTYPE-05: a long Playlist name widens the View header past 720 px; minor COPY-04 menu case; minor COPY-03 not-found and empty states without a way on). Report: [docs/ui-grade/round-31.md](docs/ui-grade/round-31.md). Graded build a608153. Spacing capped at 6.9 (about 8.6 uncapped); Interaction 8.9, Platform fit 9.0.

## Work list (round 31)

Fixed on 8 Nov:

- [x] WTYPE-05: the "Next and Last go to" picker is capped (min(14rem, 30vw)) and cuts a long name; the View header's actions wrap · COPY-04: commands in sentence case on the web ("Move to bottom", "Play from here", "Copy link"), title case in the Mac's native menus as the platform has them · COPY-03: "Episode not found" links to the Views, and the empty Playlist's "View" is a link.
- [x] Craft: Play Next and Play Last confirm alike ("Plays next in Default", "Plays last in Default") · ⌘Z puts focus on what comes back, as the toast's Undo does · the bulk bar says which Playlist ("Play Next in Default").

## Work list (round 30)

Fixed on 8 Nov:

- [x] WDATA-03: Playlist settings' Name starts from the saved name once per Playlist, then keeps what's typed, an empty field (with its error) included; the old name is never put back under the cursor.
- [x] The Entries grid: each row's number and artwork are cells · View summaries use the form's words ("At most 30 min") · the shortcut sheet says "Ctrl+Home, Ctrl+End: first or last Episode".

## Work list (round 29)

Fixed on 8 Nov:

- [x] WKEY-03: when Back or Forward only opens or closes a panel (?episode=, ?edit=) and focus falls to the page, it goes to the panel's heading, or back to the row the panel showed · FLOW-07: Add to a Playlist puts its filled Play Next on the right.
- [x] Type-ahead: a space mid-search is part of what's typed ("who s"), not a tick.
- A leftover demo server from a stopped probe was found running and stopped.

## Work list (round 28)

Fixed on 8 Nov:

- [x] WKEY-04: while a sheet or dialog is open, toasts wait behind it (hidden, and not counted in the scroll padding) and come back when it closes; the drawer keeps its own strip · COPY-01: the Download Rule's choices are "Stream", "Download Entries" and "Download every new Episode" everywhere (selects, row menu, phone group headings, a podcast's settings).

## Work list (round 27)

Fixed on 8 Nov:

- [x] COPY-02: offline with the Episode not on this Device, the player says so ("Not downloaded" in the phone bar; in full: "You’re offline, and this Episode isn’t downloaded on this Device. It plays when you’re back online; a downloaded Episode plays now.") with no Try again that can't work, and plays by itself when the connection is back; other failures keep Try again · TYPE-08: the Mac Undo and Redo items put a step's own quotes in single quotes.

## Work list (round 26)

Fixed on 8 Nov:

- [x] DATA-04: a View edit shows the Undo toast every other edit has; changes to one View within 2 s are one step, whose Undo goes back to before the first · FLOW-06: the first-run card stays, ticking its steps, until it's dismissed (Done once a podcast is added).
- [x] Craft: every dialog's × is "Close" (not a second "Cancel"), and confirmations open on Cancel · Rewind to here shows at rest, quiet (no fill) until its row is in hand · the speed menu opens on the speed that's set.
- Not changed: the Trash and the Podcast settings panel widths.

## Work list (round 25)

Fixed on 8 Nov:

- [x] AX-04: below desktop, Entry rows and the drawer's Up next have a ⋯ More menu with Move to Top, Up, Down and Bottom (and, for Entries, Play from Here, Star, Mark Played, Open Episode, Remove, Copy Link), so nothing needs a drag; Move Up and Down are in the desktop right-click menu too · CTRL-05: "Use here" has hover and pressed states and says "Opening here…" while the other tab lets go.
- [x] Craft: empty-state cards and the Search field line up with the content beside them · confirmations have the same × head as other dialogs · Subscribing says so once, where it happened · the Add sheet's last-resort error names what to check · no browser clear × in search fields · list rows drop the far-off chevron on desktop.
- Not changed: forms and the Episode page keep a reading width; the Episode page's desktop back link.

## Work list (round 24)

Fixed on 8 Nov:

- [x] DATA-06: the Library's sort is remembered on this Device and put back (in the address too) when you come back without one.
- [x] Craft: list screens (Views, Playlists, a Playlist, Library, Trash, History and Timeline) fill the main column as a View does; forms and the Episode page keep their reading width · the desktop drawer's two columns are even (28rem each) · Rewind to here is quiet until its row is in hand, and names its moment · the View's panel reads "Up next in Default" (the header's picker says where Next and Last go) · forced colours: the Episode actions are round, with the pressed outline on the circle; one outline on the selected tab · Subscribe at the main-button height · the VIEWS and PLAYLISTS headings lead to their overviews and show as selected there.

## Work list (round 23)

Fixed on 8 Nov:

- [x] New View: "New View", "New View 2"…; a new View left with its default name and every condition at Any goes when it's left, with "Discarded empty View" and Undo.
- [x] Listening Timeline as designed: your own edits (added, moved, removed, marked Played by hand) are recorded on the Playlist (protocol 3, vectors regenerated) and listed with the listening, each with Rewind to here · Positions read "At 22:00 in the Episode", not as a second clock · History and Timeline titles cover Episodes that have left the Playlist.
- [x] One form: removal toasts name the Episode · the confirmation dialog's footer is the same full-width pair as every other dialog's.
- [x] Drawer pages focus their heading, and going back returns focus to the button that opened the page · the last Restore in the Trash focuses the restored Playlist in the sidebar · the phone drawer's three buttons fit one row · the zoomed player title stays on one line.
- Not changed: Unsubscribe keeps its confirmation (it takes the podcast's Episodes out of the Library; making it undoable means re-subscribing, an owner call) · one tab owns the Library (ADR 0005) · wide-desktop content widths.

## Work list (round 22)

Fixed on 8 Nov:

- [x] WKEY-03: after a bulk action takes its rows (and the bar), focus goes to the row now in their place; ⌘Z and the toast's Undo put it on the first row back; Mark all Played stays focusable (aria-disabled) and says when nothing is left · DRAG-01: the OPML tab is a drop area; a file dropped anywhere else is refused, and the Mac window navigates to no file but its setup page.
- [x] APPEAR-11 checked, not reproduced: the lifted row is the row itself (RESUME and progress on a fresh demo); the grader's demo had lost that Position to earlier probes.
- [x] Craft: the row's More button is quiet until the row is in hand, like the actions it stands for · the desktop drawer grows to fit its content · desktop screens opened from another name it on the title line ("Commute › Playlist settings") instead of a back link at the top edge · the target panel's empty state is the dashed card · an empty Active Playlist is badged "Active", not "Paused" · the welcome card only on Views · Search conditions as plain words in the address (`?q=market&played=unplayed&max=30&sort=shortest`; old `f=` links still read).

## Work list (round 21)

Fixed on 8 Nov:

- [x] LIST-06: an Episode keeps the tab and sidebar highlight of the list it was opened from, kept per history entry so a reload keeps it too · FLOW-05: first run's card at the top of the View's list column, level with the panel.
- [x] Craft: the desktop back link sits in the header's top margin, so headings share one height · Add podcasts says every error under its field, in place of the hint, and its Search tab is just "Podcast name" · the Episode panel's five actions in one row (the Episode page keeps seven) · the row menu opens over a row's select and checkbox (Library's Download Rule) · New View lands in its Name field · no Keyboard settings on a touch phone · "‹ Deep Field", not "‹ Podcast", back from an Episode.

## Work list (round 20)

Fixed on 8 Nov:
- [x] WKEY-03 one rule for focus when a control's row goes (lib/focusAfterRemoval.ts): the same control in the next row, else the previous, else the heading; used by first run's Skip, the drawer's Up next Remove and Trash's Restore.
- [x] Craft: Up next in the drawer reorders (drag by pointer or touch; ↑ ↓ on its handle from the keyboard), each move with Undo; back 15 back on the phone bar; the current Entry's Play keeps its shape; the Active dot says so on hover; the welcome card at the content width; an empty Search starts with a card; Timeline intro spacing.
- [x] Checked before grading this time: focus after each new removal path, and forced colours on the new handles and the dot.

## Work list (round 19)

Fixed on 8 Nov:
- [x] APPEAR-03 the Active Playlist dot keeps the text colour in forced colours · APPEAR-11 Entry skeletons take two title lines where titles do.
- [x] Craft: the phone mini-player's title keeps the room (back 15 is in Now Playing on phone widths); the Search refinement is an object in the address (one encoding) and Refine opens when narrowed; duplicate Playlist names are refused, new or renamed; the welcome card sits under the screen's title, with one Add podcasts; detail separators end lines rather than start them; a feed address that isn't a feed marks its field invalid and describes it; Playlist settings without the repeated name; Play and Remove spaced apart.
- [ ] Not done: Mac Go › Back/Forward dimming; the bottom tab's double outline in forced colours; Up next reorder in the drawer.

## Work list (round 18)

Fixed on 8 Nov:
- [x] COPY-03 the Episode screen records where it came from before it renders, so its back link names that View and points to it · WTYPE-01 the queue badge in 12 px.
- [x] Craft: one settings row everywhere (beside its label where the card has room, else full width under it; Playlist settings' Name too); 20 px phone gutters in the View editor and Subscription rows; one tinted Play in Playlist rows; one name, "Next and Last go to"; the Active Playlist shows a dot, a waveform only while it plays; the selected sidebar row has an edge bar; the Feed address tab focuses its field.
- [ ] Not done: one desktop width (Views and Search are wider for their side panel, by design); Up next reorder in the drawer; Add podcasts keeping its text after closing; the phone's player and tabs at 200% text.

## Work list (round 17)

Fixed on 8 Nov:
- [x] BROWSER-03 each Playlist section names itself in the tab.
- [x] Craft: Search is the View form (design R): an unsaved View whose words fill Mentions, narrowed by the form beside the results (Refine under the field on the phone), its conditions in the address, saved whole as a View · forms and Episode detail share a 640 px column, the desktop Episode actions start at the header's edge, and its title matches other screens' · one empty-state form (Up next too), a hint on Add podcasts' Search tab · the phone player's queue badge · Play in view in the drawer on short windows · one settings glyph (the gear) · no ring round the drawer sheet · the row whose menu is open is marked · forced colours keep the scrubber thumb and the player's edge · Mac window titles without "· PodList".
- [x] Found by the flows: the phone player's loading title now reserves the lines the title takes, so the bar holds its height when the catalogue arrives.

## Work list (round 16)

Fixed on 8 Nov:
- [x] KEY-04 Search focuses its field only on a fresh visit; Back returns focus to the Episode opened (the return-focus record now lives in lib/returnFocus.ts) · APPEAR-11 ⌘Z closes the step's own Undo toast.
- [x] Craft: after Play from Up next the drawer is back at its top; phone Library separators run straight; first run has one dismiss; Restore has Undo; the Mac app's Edit › Find (⌘F) opens Search; the Episode screen's back control is a link.
- [ ] Not done: desktop Episode detail alignment and title size; the target Playlist named twice on a desktop View; content widths at 1440; Mac Show/Hide Sidebar and Episode commands in the menu bar.

## Work list (round 15)

Fixed on 7 Nov:
- [x] AX-01 (blocker) the drawer's pages name the dialog by their heading; every toast is named by what it says · WTYPE-02 the Library shows its table only when the columns and a readable name fit at the text's size (measured in rem), else its list; Keep at most and Speed likewise.
- [x] Craft: Trash's buttons say "Restore <Playlist>"; the selected segment is semibold with an edge.
- [x] Already in b32f87a (after the graded build): one phone gutter, link focus rings, forced-colour marks, podcast pages without the repeated name, numbered first-run steps.
- [ ] Not done: desktop Episode action row alignment; Timeline intro edge; row hover actions all icons or all text; phone drawer empty space; Mac idioms (⌘F, Show/Hide Sidebar, window title); icons and sidebar at large text.

## Work list (round 14)

Fixed on 7 Nov:
- [x] WKEY-03 / WKEY-04 / APPEAR-10 with the drawer open, toasts show inside it, in a strip at its foot it keeps free: inside its focus trap, over none of its controls, and in a lighter fill with a border.
- [x] Craft: the desktop drawer's player and Up next share one centred column, and its pages are centred; Download (or Stop, Remove) is in a row's right-click and More menus.
- [ ] Not done: one left edge on the phone; one Play look; toasts across screens; focus ring shape; desktop Episode page alignment; Subscription rows repeat the name; 200% phone facts line; forced colours for NOW and the gear; first-run marks.

## Work list (round 13)

Fixed on 7 Nov:
- [x] WTYPE-02 the Episode actions are 4.25rem columns: one row when all fit at the text's size, else Play centred on its own row with the rest evenly under it (2 + 2, 4, or 3 + 3). This also ends the side panel's 4 + 3.
- [x] Craft: toasts add room under focused rows while shown; Esc on a drawer page steps back a page (a drawer opened straight on Up next closes); the Episode screen's back link says Views when opened directly; ⇧⌘Z in the shortcut sheet; Trash set apart in the sidebar; on the phone the Library's unplayed count shares the name's second line.
- [ ] Not done: desktop drawer layout and Up next reorder; the Timeline's own edits; Search as the View form; first-run checklist as tasks only; phone queue badge; one row affordance across widths; Rewind confirm vs Undo; Mac Help and dimmed Controls; NOW tint. pod-xzj: a rare stuck database open after a reload under heavy load.

## Work list (round 12)

Fixed on 7 Nov:
- [x] LIST-07 a click on a View row puts keyboard focus in it, and with an Episode open the arrows carry it along · CTRL-04 the feed address is judged when you leave the field or press Enter, never mid-address.
- [x] Minors: APPEAR-04 placeholders at the muted text colour (6.6:1) · APPEAR-11 loading Entries have a real row's title and facts lines.
- [x] Owner decision (7 Nov): PodList runs in one tab at a time, so its own row menus drop "Open in New Tab" and keep Copy Link (ADR 0005); screens stay real links.
- [ ] Not done: toast naming; settings layouts; Episode panel actions; shortcut sheet keys; wrapped metadata starting with "·"; drawer focus ring and Up next reorder; Search's form; Trash in the sidebar; first-run marks; icons at 200% text.

## Work list (round 11)

Fixed on 7 Nov:
- [x] BROWSER-04 Playlist sections are links, the current one aria-current="page" · WTYPE-02 the Library table's columns are in rem and it scrolls in its own box at very large text · COPY-02 missing Views, Playlists, Episodes and podcasts say what's likely and lead back · DATA-06 the Subscription settings disclosure is remembered on the Device.
- [x] Minors: APPEAR-11 no welcome card, empty state or "Episode unavailable" while local data is still arriving · CTRL-02 a mixed "select every" box · BROWSER-03 "… not found" tab titles.
- [x] Craft: a toast's Undo says "Undone: …" as ⌘Z does; a View's selection counts only rows still in it; Episode detail's Play becomes Pause while it plays; a listen that didn't move shows one time.
- [ ] Not done: Episode panel actions at 400 px; the desktop drawer's layout; one settings layout; toast tense and naming; Timeline heading spacing; first run on desktop; phone row Play focus.

## Work list (round 10)

Fixed on 7 Nov:
- [x] BROWSER-01 each overlay layer is its own history entry (the router batched two pushes into one), so closing the drawer opened on Up next stays on the screen · WKEY-04 the sidebar keeps focused links clear of the player · WKEY-02 Settings › Keyboard › Single-key shortcuts turns off "/" and Space.
- [x] Minors: FLOW-07 every list screen but a View (which has its panel) ends at 960 px, header actions included · COPY-03 with no podcasts, a View's empty state leads to Add podcasts.
- [x] Craft: Mark all Played is one step with Undo (Entries that Clear on Played let go come back too); toasts wrap; the Played tick reads "✓ Played · …" in one run of text; the Timeline's day headings align; the Add-to-Playlist sheet opens on the chosen Playlist; Playlist settings' tab names the Playlist.
- [x] Found while testing: Back could save the router's scroll-to-top over the list's position before restoring it; a database worker that opened but stayed stuck behind the old page was never retried (the first query is now part of each attempt).
- [ ] Not done: one row action set across Views, Subscriptions and Search; Search's target picker; the phone queue count; the desktop drawer's empty band.

## Work list (round 9)

Fixed on 7 Nov:
- [x] WKEY-03 closing a row's right-click menu returns focus to the row · DATA-06 the Library sort is in the URL · LIST-03 sorting by name reverses · WTYPE-02 the View editor's labels size in rem and fields drop under them; fields and selects have minimum, not fixed, heights · BROWSER-07 the Mac app's ⌘← ⌘→ (and with ⌥) are the page's, outside text fields.
- [x] Minors: CTRL-02 Clear on Played is a plain checkbox · COPY-01 a paused Cursor without a Position reads HERE / "Next:", RESUME only with one.
- [x] Craft: "/" opens Search on every OS; Playlist settings, a Subscription and Trash keep their back link on desktop; the Episode actions fit one row at 320 px.
- [ ] Not done: content widths across screens; the desktop drawer's empty centre; the phone drawer's lone pill; one error place in Add podcasts; Search's View form; OPML drop target; Next/Last icons.

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
