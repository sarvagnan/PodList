# UI grade, round 8

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) at commit `383fff5` ("Library on desktop: a table with Download Rules and bulk changes"). This was an independent read: no earlier round reports or UI-GRADE.md work lists were consulted.

Evidence:
- Flow run `flows-r8` (summary.md, measurements.json, strips).
- My own Playwright probes against the demo server, Chromium (Playwright 1.65), with service workers blocked. Scripts and captures are in `scratchpad/grade-r8/` (`probe1.mjs` to `probe9.mjs`, `scan.js`, `shots/`).
- The Mac app, launched with Playwright `_electron` (Electron 44.9.3).
- Code under `packages/web/src` and `packages/desktop/src/main.ts`.

All sizes are in CSS px at 100% zoom unless stated.

## Frame

- **Task:** find Episodes through Views and listen to them through Playlists, from a phone first and from a desktop window as well.
- **Target:** web app. It is an Android-first installable PWA. The macOS app is the same build in an Electron window, and its native shell (menus, context menu, window) is judged as part of Platform fit.
- **Posture:** sovereign on the desktop, all-day and calm; transient on the phone, in and out with a player always present.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, for the calm list-and-detail craft. BBEdit is the model for the Mac shell's menu completeness.
- **Character:**
  - Space Grotesk headings over Inter text (owner);
  - warm off-white page `#f6f5f2` with one blue `#2b50c8` (owner);
  - the dark slate player bar and Now Playing drawer (owner);
  - two equal halves, Views and Playlists, navigated as lists, never capsules (owner, variant A);
  - quiet rows whose actions appear on hover or focus, with one tinted Play;
  - podcast-initial artwork tiles.
- **Owner decisions:** light only; layout A; Inter and Space Grotesk; blue primary; dark player; View editor R; Playlist settings and Rewind C; Library C. These are graded but not targeted.

## Flows

- **Tasks run (flows-r8):** browse, listen, now playing, fresh device (catalogue held 2 s), and second tab.
- **Widths:** phone 412×915, zoomed desktop 720×450, desktop 1440×900. Light appearance only.
- **Timed runs:** desktop, 5 runs after a warm-up, darwin arm64, no throttling.
  - open a Playlist: p75 134 ms;
  - Play from here: p75 120 ms.
- **Locations:** script at `packages/web/ui-flows/flows.mjs`; measurements in `flows-r8/measurements.json`; strips in `flows-r8/strips/<flow>/<width>/`.
- **My additional probes:**
  - keyboard tour of the desktop View grid, its context menu and Cmd-C;
  - Back and Esc with the drawer and with sheets open (phone);
  - removing and undoing an Entry, and focus afterwards;
  - Rewind;
  - the Add podcasts sheet: search, a feed address, a bad address, and a 404;
  - Search and Save as View;
  - Playlist delete, then Trash;
  - forced colors, reduced motion, browser font size at 32 px (200%), and 320 px;
  - a contrast, target-size and overflow scan on 11 routes at 4 widths;
  - first run on an empty server;
  - the Electron window and menus.

**Failures:** none among FLOW-01 to FLOW-07. Every core element held within 2 px at every step and width (flows-r8 summary). Focus stayed in place after rows were removed:
- after "Mark Played" removed a row from the Unplayed View, focus went to the next row's Played button (probe2);
- after Remove on the phone, focus went to the next row's Remove button (probe3).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Dark toast above the player at the content's left edge: "Marked Played" | none seen | none | In the toast, plus ⌘Z | "Nothing matches…" in the list | none | Edit View, header trailing | Summary line under the title |
| View (phone) | The same toast, above the mini-player | none | Add sheet (Playlist radio, then Play Next / Play Last) | In the toast | as desktop | none | Edit, header trailing | — |
| Playlist | Toast: "Removed from Default", "Moved “…”", "Moved “Workshop” to the Trash" | none | Rewind dialog: "Rewind Default to 14:30?" | In the toast, plus ⌘Z | "Nothing finished yet" (History) | none | Play / Play this, header trailing | Timeline intro paragraph |
| Search | — | — | Save as View dialog | — | "Nothing matches · Try fewer or different words." | none | Save as View, header trailing | Hint under the field |
| Library (desktop) | Toast: "Subscribed to …" | — | Unsubscribe confirm; Mark all Played confirm | none (confirm instead) | — | — | Add podcasts, header trailing | — |
| Add podcasts sheet | Row turns to "✓ Subscribed", plus a toast | Red line under the result row: "That address didn’t give a podcast feed…" | — | — | "No podcasts found. Try other words." | — | Subscribe, on each row | Help line under the field |
| Bulk bars | — | — | — | — | — | — | View bar: "**2 selected**", with **×** to clear. Library bar: "**3 ticked**", with **Clear** | — |
| Episode (phone) | — | — | — | — | — | — | Play, centred in the action row | — |

**Mismatches:**
1. **Bulk selection wording and form.** The View bulk bar is a bordered pill that says "2 selected" and closes with ×. The Library bulk bar is bare inline controls that say "3 ticked" and close with a "Clear" text button. The Shortcuts sheet says "Tick".
2. **Back-link labels on the phone.** Most drill-ins say where they go ("‹ Playlists", "‹ Views", "‹ Library", "‹ Default"). The Episode screen says only "‹ Back". Settings, reached from Library's gear, has no back link at all, although Trash and Playlist settings do.
3. **The drawer's "Up next" list.** It lists the whole Playlist, including Entries before NOW. The player-bar badge says "1 up next" while the panel headed "Up next" shows 4 rows.

## Checklist

**Coverage:** 87.9% (pass 83 · fail 4 · N/O 12 · N/A 6). That is 105 IDs: 79 core and 26 web. Mac IDs are N/A → target (web app) and are outside the count. The Mac shell is discussed under Platform fit.

### Failures

**Major**

**WKEY-03, Add podcasts sheet.** A failed Subscribe drops focus out of the modal dialog.
- **Evidence:**
  - I subscribed to `…/feeds/nonexistent.xml` from the Feed address tab.
  - After the error, `document.activeElement` was `<body>` (probe5: "focus body").
  - Cause: `AddPodcastSheet.tsx` sets `disabled={busy}` on the focused Subscribe button while the request runs. A disabled button loses focus, and nothing puts it back when the request fails.
  - A keyboard user is left outside the dialog's focus trap, and the error (a `<p>` under the row) is not focused.
- **Fix:** while busy, use `aria-disabled="true"` and ignore clicks, rather than `disabled`, so focus stays on the button. On failure, move focus to the Feed address field and point its `aria-describedby` at the error, or keep focus on the button and announce the error through the existing live region. Apply the same pattern to every busy button (Save as View, Rewind, Unsubscribe).

**Minor**

**COPY-01, bulk bars.** Terminology for the same state isn't consistent.
- **Evidence:** the View bar says "2 selected" and clears with ×. The Library bar says "3 ticked" and clears with "Clear" (p2-bulkbar.png, p9-library-bulk.png). Shortcuts says "Tick the Episode".
- **Fix:** pick one word, "selected" (the platform word), and one dismissal, "Clear" or ×. Make the Library bar the same bordered pill as the View bar.

**LIST-04, Search results (desktop).** Rows aren't trackable at full width.
- **Evidence:** at 1440, a Search row spans x 248–1416. The Play button sits at x≈1385, about 1,040 px from the title at x 344 (p5-searchpage.png).
- **Comparison:** Views stop at 1016 because of the side panel, and Playlists and Library stop at 1160.
- **Fix:** cap the Search list at the Playlist and Library content width (about 912 px), or show the target-Playlist panel beside the results as Views do.

**APPEAR-11, fresh device, player bar (desktop and zoomed).** The player shows a half-filled state while the catalogue arrives.
- **Evidence:** in `flows-r8/strips/fresh device/desktop/01-open-default.png`, the title is a placeholder bar but the subtitle reads "Cold open ·", a Chapter name with a dangling separator.
- **Cause:** `AppShell.tsx` builds `${chapter.title} · ${label}` even when `label` is the no-break-space placeholder.
- **Same frame:** the placeholder Entry rows carry live Play and Remove buttons, and the NOW row has no artwork tile while the others do.
- **Fix:**
  - render the subtitle only when `current.title` is set;
  - make placeholder rows inert (`aria-hidden`, no buttons, or disabled until data arrives);
  - give the NOW skeleton row the same tile.

### N/O

KEY-06, CTRL-02, CTRL-08, LIST-05, DRAG-01, DRAG-05, DRAG-06, START-04, START-05, TYPE-06, BROWSER-10, FOOT-02

### N/A

- LIST-03: no sorting offered;
- SIDE-03 and TOOL-06: nothing can be hidden;
- START-06 and START-07: no accounts;
- AX-05: no autoplay, and the content is the audio.

### Passes worth recording

- **KEY-01, KEY-04, WKEY-01, LIST-07:** the View list is an APG grid. It is one Tab stop, with arrows, Home/End, Page keys, type-ahead, Space to tick, ⌘A, and ⌘C to copy the row's link (probe1 and probe2).
- **BROWSER-06:** right-clicking a row gives a 9-item APG menu (focus moves into it, arrows work, Esc returns focus). Links and selected text keep the browser's menu. A keyboard `contextmenu` on a focused cell opens the menu (probe9). On the phone the browser's long-press menu is kept.
- **BROWSER-01 and BROWSER-02:** these states all have URLs, and Back closes overlays without leaving the page:
  - the View editor (`?edit=true`);
  - the Episode panel (`?episode=`);
  - the Playlist tabs (`?tab=history`, `?tab=timeline`);
  - Search (`?q=`).

  On the phone, Back closes the drawer, then steps back through its pages; it also closes the Add sheet (probe3).
- **WKEY-03 elsewhere:** focus goes to the heading after navigation. Esc from the drawer returns focus to the player bar. The Undo button returns focus to the restored row.
- **DATA-04 and DATA-05:** Undo is in a toast that stays until dismissed and through ⌘Z, 30 steps deep. Keyboard reorder announces "moved to position 2 of 4" and offers Undo.
- **APPEAR-04:** the text-contrast scan found no visible text below 4.5:1 on 11 routes × 4 widths, including the dark drawer. The focus ring is 6.25:1.
- **WTYPE-02 and WTYPE-05:** no horizontal overflow at 320 px, or at a 32 px browser font size on 3 routes.
- **APPEAR-03 and APPEAR-05:** forced colors keeps borders, progress and the selected state. Under reduced motion the drawer fades (opacity 150 ms) and no animations run.
- **RESP-01:** both timed steps are under 200 ms at p75.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.5** | Two families with one role each: Space Grotesk for titles, Inter for everything else. The rem steps are small (13), row (15) and title (28), so type follows the browser font size; at 32 px nothing clips. Section labels are uppercase and letterspaced 0.08em. Punctuation is typographic (’ “ ” … −16:34). Kept from Exemplary by three things: (1) the Episode title on its own page is an `h2` at text-xl, set below a hidden `h1` "Episode", so the most important line on that page is mid-scale; (2) the 11 px numerals inside the skip icons; (3) at 200% on the phone, Entry rows push Play and × onto a line of their own between titles, which loosens what belongs to what. | `hierarchy`, `craft` |
| Hierarchy | **8.5** | Each screen has one tinted primary (Play, Add podcasts) in the header's trailing slot. View rows read as titles, with actions revealed on hover or focus. Sidebar section labels recede. The dark player bar is always the heaviest shape on a squint; that is an owner decision, so it is graded but not targeted. Kept from 9 by Search, where full-width rows leave Play stranded at the far edge, and by the subscription page's settings card, which competes with the episode list at equal weight. | `content-first` |
| Spacing & density | **8.0** | Consistent 4 px rhythm, 76 px View rows, and 40–44 px targets throughout (no target under 24 px outside the WCAG spacing exception). Misalignments: (1) the Edit View panel's right edge is at 1424 while the header's controls end at 1408; (2) Settings section labels are inset 4 px from their cards (x 260 against 256); (3) Search rows stretch about 1170 px; (4) the 200% phone Entry row wraps (see Typography). LIST-04 minor. | `craft` |
| Color & contrast | **8.8** | Nearly monochrome warm neutrals, one blue for primary action, selection, progress and focus, and the dark player as a fixed zone. Status colors have one meaning each: green for Played, amber for the Star, red for errors and Unsubscribe. All measured text passes; the field edge is 3.6:1; forced colors is handled. The only hard-coded off-token color is the toast's Undo `#9db4ff`. Short of 9+ because the native selects' default Chrome rendering puts an OS-gray chevron and border treatment into an otherwise tokenized palette. | `color-restraint` |
| Iconography | **8.5** | One Lucide set at 18–20 px with matching stroke. Words replace ambiguous glyphs ("Next", "Last"). Every icon-only button has a tooltip and an `aria-label`. The Active Playlist has a shape as well as a color. Kept from 9 by (1) the 11 px numerals in the skip icons; (2) the "H" tile that a feed-address result derives from "http"; (3) the drawer's "Episode" button, which uses an open-book glyph for "episode details", a stretch. | `conventions` |
| Consistency & polish | **7.7** (stability 8.4) | Stability: no FLOW failures at any width, and late data lands in placeholders. It is held to 8.4 by the three inventory mismatches (bulk-bar wording and form, back-link labels, the "Up next" scope) and the APPEAR-11 half-fill. Polish gaps: (1) native `<select>`s keep Chrome's default arrow, flush to the edge, beside custom pill buttons (View toolbar, editor, Library table, Settings); (2) the feed-address preview shows the raw URL and an "H" tile instead of the resolved podcast; (3) skeleton rows carry live buttons; (4) Undo and Redo in the Mac app's Edit menu are always enabled, even with nothing to undo. | `craft`, `stability` |
| Clarity | **8.3** | Plain, specific copy throughout. "Rewind Default to 14:30?" lists what is kept. Errors name a recovery ("Check the address, or find the podcast by name with Search"). Empty states give a next step. Clarity is lowered by: (1) "Up next" labelling a list that includes already-passed Entries; (2) the feed-address result, which offers Subscribe for an address that was never checked and fails only after the click, although the design says it is "resolved directly"; (3) "selected" against "ticked"; (4) "‹ Back" against named back links. | `plain-language` |
| Platform fit | **8.7** | **Web looks 8.8:** real links everywhere, native fields with `type=url` / `type=search`, ⌘ shown only on a Mac and Ctrl elsewhere, the page fills the viewport, and the phone gets bottom tabs. **Web behaves 8.7:** URLs for the editor, panel, tab and query; Back closes overlays first; the browser's menus are kept on links and text; Copy Link; the APG grid; the PWA keeps its own back links. **Mac shell:** a complete menu bar (App with Settings… ⌘,, File, Edit with named Undo, View, Controls, Go, Window, Help), a standard title bar, a 720×450 minimum, native row context menus, the window title following the view, and relaunch to the last screen. Deductions: no sidebar toggle in View, and Undo/Redo never dimmed. (8.8 + 2×8.7)/3 = 8.7. | `conventions` |
| Interaction & feedback | **6.9** (capped by WKEY-03; uncapped 8.6) | Keyboard-fluent grid, global ⌘K, ⌘Z/⇧⌘Z, Space for play/pause outside controls, persistent Undo toasts, keyboard reorder with a live announcement, Back as the way out of sheets on Android, and p75 responses of 120–134 ms. Capped by the one focus loss in the Add podcasts sheet (WKEY-03, major). Without it, two gaps would still hold it below 9: (1) after Back, focus lands on the heading rather than on the row you opened, so keyboard users lose their place; (2) the custom row menu has no dedicated key on rows whose default cell is the title link (Shift+F10 there gives the browser's link menu, by design), so it is discoverable from the keyboard only on button cells. | `keyboard-efficiency`, `feedback` |
| **Overall** | **8.2** | It serves its task very well on both a phone and a Mac. Every designed screen exists, holds still, reads plainly, and keeps the browser's contract. Allowed range: up to 2.0 above the lowest category, so at most 8.9. The weakness holding it down most is the Interaction cap from one focus-management bug. Behind that, a layer of unfinished seams keeps it from 9: half-filled loading frames, default-rendered selects, wording mismatches between sibling bars, and the unresolved feed preview. | — |

## Next step

- **Target:** WKEY-03 (major, Interaction & feedback 6.9, the lowest category).
- **Anti-pattern:** "focus dropped to the document" (web-ism).
- **Root cause:** busy states use the `disabled` attribute on the button that holds focus, so focus leaves the dialog whenever a request is in flight. On failure nothing restores it.
- **Change:** in `AddPodcastSheet.tsx` `Result`, replace `disabled={busy}` with `aria-disabled={busy}` and an early return in `onClick`. On a problem, focus the Feed address or Search field, which should be `aria-describedby` the error. Audit other `disabled={busy}` buttons for the same pattern.
- **Principle:** `stability`, `keyboard-efficiency`.
- **Expected effect:** lifts the cap. Interaction & feedback goes to about 8.6 and Overall to about 8.6. No visual change.

**What then stands between the app and 9.0**, in order of impact:
1. **Make loading frames coherent** (APPEAR-11). Drop the "Cold open ·" subtitle until the title arrives, make skeleton rows inert, and give the NOW skeleton its tile.
2. **One bulk-bar component.** Use the same wording ("selected"), the same dismissal, and the same bordered pill for Views, Search, Subscriptions and Library.
3. **Resolve feed addresses before offering Subscribe.** Fetch the feed on a debounce, show its title and artwork, and put the "didn’t give a podcast feed" error under the field before any click. This also removes the "H" tile.
4. **Style the native selects.** Keep `<select>`, but set `appearance: none` with a token chevron and 12 px of end padding, or `appearance: base-select` where supported, so they match the pill buttons. This lifts Color and Consistency.
5. **On Back, restore focus to the row that was opened**, falling back to the heading. Things keeps your place.
6. **Name the drawer list honestly.** Call it "Default" (the Queue) with NOW marked, or show only the Entries after NOW under "Up next".
7. **Fix the spacing seams.** Align the editor panel's right edge with the header at 1408, align the Settings labels with their cards, and cap the Search list's width.
8. **Phone back links.** Name the Episode screen's back link after where it came from, and give Settings a "‹ Library" link.
9. **Episode screen heading.** Make the visible Episode title the `h1`.
10. **Mac shell.** Dim Undo and Redo when there is nothing to undo or redo, through the existing undo-label IPC.

## Log

Round 8: a score-only audit; no changes were applied. The baseline captures are in `scratchpad/grade-r8/shots/`.
