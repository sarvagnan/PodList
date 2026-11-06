# UI grade log

PodList graded against `~/Documents/UI_Guidelines` (`CRITIQUE.md`), as a **web app**: an Android-first PWA, with the Mac app being the same build in an Electron window.

**Goal:** not set yet; the owner decides. Until then, work through the checklist failures in the guide's order: blockers, then majors in the lowest-scoring category, then the lowest category.

**Owner decisions (graded, not targeted):** Light appearance only until a dark theme is designed. Layout variant A (Views and Playlists as equal halves; lists, never capsules). Inter and Space Grotesk; blue primary #2b50c8; dark player bar.

## Method

- Flow runs: `pnpm --filter @podlist/web ui:flows [outDir]` runs the main tasks on fixed demo data at phone 412×915, zoomed-desktop 720×450 and desktop 1440×900, and writes measurements, screenshot strips, contact sheets and timed runs (`packages/web/ui-flows/README.md`).
- Graders: a fresh agent that hasn't seen earlier rounds, briefed with the app, the owner decisions and the flow run, does the full audit and writes the report. Reports are kept in `docs/ui-grade/`.
- Findings become beads (label `ui-grade`); fixes land as ordinary commits, with flows re-run when a main task changes.

## Rounds

| Category | Round 1 (7 Nov, Opus) |
|---|---:|
| Typography | 5.8 |
| Hierarchy | 6.4 |
| Spacing & density | 5.9 |
| Color & contrast | 6.2 |
| Iconography | 5.4 |
| Consistency & polish | 5.3 (stability 6.0) |
| Clarity | 4.9 |
| Platform fit | 6.8 |
| Interaction & feedback | 5.6 |
| **Overall** | **5.4** |

Round 1: coverage 95.4%; 19 failures (10 major, 9 minor, no blockers). Report: [docs/ui-grade/round-1-baseline.md](docs/ui-grade/round-1-baseline.md); flow summary: [round-1-flow-summary.md](docs/ui-grade/round-1-flow-summary.md). No core element moved unprompted in 51 measured steps; open a Playlist p75 132 ms, Play from here 107 ms.

Graded build: before View detail, Episode row actions and proxied artwork landed (commits c717897, 7f04e17, 05d04d4), so COPY-03's View placeholder is already gone.

## Work list

### Majors
- [ ] COPY-02 (Clarity, lowest): playback errors in plain words with Try again; "Playlist no longer exists"; a styled not-found page.
- [ ] START-01: loading vs empty: no false "No Views yet" / "No Subscriptions yet"; skeleton titles instead of "Episode unavailable" while the catalogue loads.
- [ ] FLOW-02: focus dropped after "Play this".
- [ ] WKEY-03: focus the new screen's heading on navigation.
- [ ] WKEY-04: `scroll-padding-bottom` for the fixed player and tabs.
- [ ] WCOLOR-02: focus ring at full strength (6.25:1).
- [ ] APPEAR-03: forced-colors boundaries for buttons, progress, selection.
- [ ] AX-02: selected tab and Active Playlist shown by more than colour.
- [ ] TYPE-05: rem sizes so text follows the browser font size.
- [ ] WTYPE-01: no text under 12 px.

### Minors
- [ ] CTRL-05 pressed states · PTR-04 tooltips · APPEAR-09 skip glyphs with 15/30 · APPEAR-11 "Playing" while paused · TYPE-07 caps tracking · TYPE-08 curly apostrophes · COPY-01 one vocabulary (Library, Now/Paused, Active) · COPY-03 empty states with a next step · BROWSER-03 page titles.

### Outside the checklist
- [ ] Playlist order drifts between devices (no stored order).
- [ ] Phone back link announces itself as the current page.
- [ ] Entry time means elapsed on one row and length on the next.
- [ ] Phone mini-player lacks back 15.
- [ ] Skip link past the desktop sidebar; Space to play or pause.
- [ ] Flush the Position on `pagehide` (up to 15 s can be lost).
