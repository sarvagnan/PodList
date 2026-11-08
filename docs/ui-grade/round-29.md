# UI grade, round 29

Graded build: `d1791ec` (worktree of `main`). Grader: independent full audit per `~/Documents/UI_Guidelines/CRITIQUE.md`; earlier round reports and the UI-GRADE.md work lists were not read.

**Overall 8.4** · Coverage 91.8% · 2 failures (1 major, 1 minor) · Stability 8.6

## Frame

- **Task:** find Episodes with Views and Search, then line them up and listen to them through Playlists and the player. Episode detail, Library upkeep and Settings support that work.
- **Target:** web app. It is an Android-first installable PWA (manifest `display: standalone`), and the macOS app is the same build in an Electron window (`packages/desktop/src/main.ts`). Platform fit is judged for Android Chrome and for a Mac desktop window.
- **Posture:** sovereign on the phone (it's the listening app). On the desktop it's a calm personal tool that is open for long stretches.
- **Audience:** perpetual intermediate. One owner, a daily listener.
- **Nearest exemplar:** Things, for its calm lists, quiet actions that appear on hover or selection, and type-led hierarchy. BBEdit is the model for the Mac shell's menus.
- **Character:**
  1. Inter body with Space Grotesk headings (owner-fixed).
  2. Blue primary #2b50c8 (owner-fixed).
  3. A dark player bar and a dark Now Playing drawer (owner-fixed).
  4. Views and Playlists as equal halves, with navigation as lists and never capsules (owner-fixed, layout A).
  5. Plain-spoken domain words: Entry, NOW/RESUME/HERE, "Rewind to here".
- **Owner decisions:**
  - Light appearance only.
  - Layout A.
  - Inter and Space Grotesk.
  - #2b50c8 as the primary blue.
  - The dark player.
  - View editor R, Playlist settings and Rewind C, and Library C.

  These are graded but not targeted.

## Flows

- **Flow run:** `flows-r29` covers browse, listen, now playing, fresh device (catalogue held 2 s) and second tab. It ran at phone 412×915, zoomed 720×450 and desktop 1440×900, in light (the only theme), with service workers blocked.
  - Measurements: `flows-r29/measurements.json`.
  - Strips: `flows-r29/strips/<flow>/<width>/`.
  - Script: `packages/web/ui-flows/flows.mjs`.
- **Timed runs** (desktop, 5 runs after a warm-up, no throttling, darwin arm64), p75: open a Playlist 123 ms, Play from here 105 ms.
- **My own probes** (Playwright 1.65 Chromium, demo server from `ui-flows/demo.mjs`; scripts in `scratchpad/grade-r29/`):
  - typing during a 2 s held catalogue, and typing into live-applied View fields (`flow03.mjs`);
  - focus after removal, Undo and Cmd-Z (`flow2.mjs`, `removal.mjs`);
  - Back with a sheet, the drawer and side panels open (`flow2.mjs`, `panel*.mjs`);
  - scroll restoration;
  - keyboard Tab order, the grid keys, the row menu from the keyboard, and right-click (`kb.mjs`);
  - forced colors, reduced motion, 200% text, the text-spacing overrides and 320 px (`modes.mjs`, `scan.mjs narrow`);
  - computed contrast on every visible text node, including the drawer (`scan.mjs`, `drawerc.mjs`);
  - target sizes;
  - the Electron shell's menus and row menus via `_electron`.
- **Stability failures:** none in FLOW-01 to FLOW-04.
  - Every core-element move in `measurements.json` was caused by the person. Example: browse/phone step 2, heading dy 48 on navigating to `/playlists/commute`.
  - Late arrivals (fresh device step 2) moved nothing.
  - Typed text survived the late catalogue: "the quiet edge" kept verbatim, with focus still in the field.
- **FLOW-07 (minor):** on the phone, the Add to a Playlist sheet has its filled primary (Play Next) on the leading side. The New Playlist, Save as View, Rewind and Unsubscribe dialogs all put Cancel on the leading side and the filled primary on the trailing side. Screenshots: `shots/phone-addsheet.png` and `shots/phone-newplaylist-empty.png`.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (list + Up next panel) | Toast above the player, dark, sentence: "Removed "X" from Y" | — | — | Undo in the toast (stays until dismissed) + Cmd-Z, focus to the restored row | Dashed box, centred title + one line | — | Play (blue circle, trailing on each row); Edit View trailing in the header | Summary line under the h1 ("Last 7 days · Unplayed · Newest first") |
| View editor | Live preview list | — | — | Cmd-Z (Edit menu label on the Mac) | — | — | Done, filled blue, trailing in the panel header | Footnote "Every row must match…" |
| Search | Live result count line | — | — | — | Dashed box "Search your Library" | — | Save as View, tonal, trailing in the header | Persistent help line under the field |
| Playlist detail | Same toast | — | — | Same toast; reorder: "Moved "X"" + Undo | Dashed box ("Nothing finished yet") | — | Play / Play this, filled blue, trailing in the header | Intro paragraph on the Timeline |
| Timeline / Rewind | Toast + Undo | — | Modal: title question, Cancel leading, filled Rewind trailing | Toast Undo | — | — | Rewind to here (text button on every row) | Intro paragraph |
| Playlist settings / Trash | "Moved "Workshop" to the Trash" toast + Undo | — | — | Toast Undo; Trash with Restore | One-line description | — | — | Field descriptions |
| Episode detail | Toast | — | — | Toast | — | — | Play, filled blue circle, centred in the action row | — |
| Library / Subscription | Toast | — | Unsubscribe modal: Cancel leading, red Unsubscribe trailing | — | — | — | Add podcasts, filled blue, trailing in the header | Row descriptions in the settings card |
| Add podcasts sheet | Row turns "Subscribed" | Inline red text under the field, value kept | — | — | — (empty space) | — | Enter to submit | Persistent hint under the field |
| New Playlist / Save as View | Toast | Inline red under the field ("A Playlist needs a name.") | — | — | — | — | Create / Save View, filled, trailing | Description under the title |
| Add to a Playlist sheet (phone) | Toast | — | — | Toast | — | — | **Play Next, filled, leading**; Play Last, tonal, trailing | — |
| Now Playing drawer | Toast inside the drawer's own strip | Playback problem line | — | Toast | "Nothing after this…" line | — | Play/Pause, centred | — |

**Mismatches:**

1. **Primary placement.** The Add to a Playlist sheet's filled primary is leading; every other sheet and dialog puts it trailing. This is FLOW-07.
2. **Back affordance on desktop detail pages.**
   - The Episode page has a small blue "‹ Views" link above the title.
   - The Subscription page has a breadcrumb heading "Library › Deep Field" at h1 size.
   - Playlist settings has "‹ Default".
3. **Selection idiom in the sidebar.** List rows show selection as a left bar plus a tint. At `/playlists` the selected section header ("PLAYLISTS") gets a tinted pill hugging its uppercase label (`shots/desktop-_playlists.png`).
4. **Focus after removal.** On a page it moves to the neighbouring row's same control (`flow2.mjs`: "Remove When a currency disappears…"). In the drawer's Up next it falls to the sheet container (`removal.mjs`: `div[role=dialog]`).
5. **Action quietness on rows.** View rows keep their seven actions hidden until hover or focus. Desktop Playlist rows show × on every row at all times. Timeline rows show "Rewind to here" on every row.

## Checklist

**Coverage: 91.8%** (pass 88 · fail 2 · N/O 8 · N/A 7; 105 IDs in core + web).

Mac IDs: N/A → target. The Mac shell is described under Platform fit.

### Failures by severity

**Major**

- **[WKEY-03] Back or Forward that opens or closes a desktop side panel leaves focus on `<body>`.**
  - Evidence (`panel2.mjs`, `panel3.mjs`, 1440×900):
    - Open an Episode from a View (URL gains `?episode=…`), focus Star inside the panel, then press Back. The panel closes and focus is `body`.
    - Edit View (`?edit=true`) with focus in Mentions, then Back. The form closes and focus is `body`. Forward reopens the form, and focus stays on `body`.
  - The same panels handle Escape and Close correctly: focus returns to the row's title link. Clicking Edit View also focuses the h2 "Edit View".
  - Full-page Back is correct too: the Episode page returns to the row title, and Playlist settings returns to "Playlist settings". So does Back on overlays: the sheet returns to its opener, the drawer to "Open Now Playing".
  - The gap is only the search-param panels: `?episode`, `?edit`, and probably `?add` when it's opened from the button.
  - **Fix:** treat a history change that only toggles a panel's search param as a view change.
    - When the panel closes, put focus where Escape puts it (the row title, or the Edit View button).
    - When it opens, put focus on the panel's heading, as a click does.
    - The cleanest place is the `returnFocus` record/restore in AppShell. Key it on the full location (pathname + search), and let `selectorFor` accept controls inside the `aside` panel, not only `main`.

**Minor**

- **[FLOW-07] The phone Add to a Playlist sheet puts its filled primary on the leading side, the opposite of every other sheet and dialog.**
  - Evidence: `shots/phone-addsheet.png` (Play Next, blue, left) against `phone-newplaylist-empty.png`, `rewind-dialog.png` and `unsub-dialog.png` (primary on the right).
  - **Fix:** keep Next before Last but give both the same tonal weight, since they are peers and the choice is the task. Or swap so the filled one trails. Either way, one rule holds across sheets.

### N/O

KEY-06, CTRL-02, DRAG-05, DRAG-06, PTR-03, EDIT-02, FOOT-02, WDATA-02

### N/A

LIST-05 (no outlines), AX-05 (no autoplay; the audio is the content), START-05 (no permission prompts; `storage.persist` is silent in Chrome), START-06 and START-07 (no accounts), TOOL-06 and SIDE-03 (nothing hideable)

### Notable passes (evidence)

- **Contrast:** every visible text node, page and drawer, is at least 5.23:1. The lowest are the sidebar Search (5.23) and the "Now" line in the drawer queue (5.43).
- **Forced colors:** designed throughout. Buttons get outlines, the player and drawer stay legible, and `forced-color-adjust: none` is used only on progress fills and dots.
- **Reduced motion:** the drawer switches from a 0.3 s transform to a 0.15 s opacity fade.
- **Reflow:** no horizontal scroll on 13 routes at 320 px. At 200% root font size the layout holds (h1 56 px, rows 30 px). The text-spacing overrides clip nothing.
- **Targets:** every target is at least 24 px, or uses the spacing exception (16 px row tick boxes in 76 px rows).
- **Keyboard:**
  - Skip link first, a visible 2 px blue ring (white on the dark bar) with `:focus-visible` only.
  - The Episode list is one APG grid stop: arrows, Home/End, PgUp/PgDn, type-ahead, Space ticks a row, Cmd-A, Cmd-C.
  - The row menu opens from the keyboard (ContextMenu key).
  - Keyboard reordering announces "moved to position 2 of 4" and offers Undo.
- **Browser contract:**
  - Real links everywhere; titles are links, so right-click on a title gets the browser's menu (`defaultPrevented: false`).
  - Custom menus appear only on row space.
  - Shortcut hints are platform-aware: ⌘ only on a Mac, and ⌘K is not shown elsewhere.
  - URLs exist for `?tab`, `?q`, `?edit`, `?episode` and `?add`. Back closes the sheet and the drawer's stacked pages one at a time without leaving the View. Scroll and focus are restored on Back.
- **Forgiveness:**
  - Remove, Move, Delete Playlist (to Trash), Mark Played, bulk actions, View edits and Rewind are all undoable.
  - Undo toasts never time out.
  - Confirmations are kept for Rewind and Unsubscribe, with Cancel focused and the destructive button red.
- **Lab vitals:** LCP 216 ms, CLS 0.012 on `/playlists/default` (phone, no throttle).
- **Mac shell:**
  - Full menu bar: App menu with Settings… at ⌘,; File (New Playlist ⌘N, New View ⇧⌘N, Add Podcasts… ⇧⌘A); Edit with stateful Undo/Redo labels and dimming; View (Reload and DevTools only in dev); Controls; Go (⌘1–3, ⌘K, ⌘[ ⌘]); Window; Help.
  - Native row context menus from `data-row-menu`, with Copy Link to the server URL. Links, text and fields get Mac context menus (Look Up, Cut/Copy/Paste).
  - Window title = view without "· PodList", bounds restored, minimum 720×450, swipe and mouse Back.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | **Strong.** Space Grotesk h1 at 32 px (56 at 200%), Inter rows at 15/500, meta at 13 muted, 12 px uppercase tracked section labels. Each style has one role, and type alone shows structure (Things-like). Punctuation is typographic throughout ("…", “ ”, ×, −16:34). Truncation is designed (3-line clamp, then ellipsis). **Below Exemplary:** the player bar starves its title. On the phone it reads "The long life o…" / "Market Hours ·…" in a ~105 px column. At 720 px it reads "The long lif…" with ~190 px empty to its right (`flows-r29/strips/browse/zoomed/02-commute-playlist.png`). The one line that says what's playing is the most truncated text in the app. | hierarchy, craft |
| Hierarchy | **8.6** | **Strong.** One filled blue action per screen (Play, Play this, Add podcasts, Done). Chrome is quiet, and View-row actions appear only on hover or focus. The dark player anchors listening without competing. **Below Exemplary:** (a) the Listening Timeline repeats "Rewind to here" on every event; on the phone that takes its own line, so each event is ~100 px and five events fill the screen (`shots/phone-_playlists_default_tab_timeline.png`). (b) Desktop Playlist rows show × on every row at rest while View rows stay quiet. (c) The desktop Subscription page buries Mark all Played and Unsubscribe under a seven-select settings card, below the fold at 900 px. | content-first, hierarchy |
| Spacing & density | **8.6** | **Strong.** A consistent 4/8 rhythm, 76 px rows, a shared 256 px content edge across desktop screens, and density that suits a calm listening tool. Reflows to 320 px. **Below Exemplary:** the desktop Episode page uses the left ~55% and leaves the rest empty, with no side column for chapters or show notes. At 200% text the player + tab stack is ~47% of the phone viewport. The desktop drawer's two columns sit left of centre, with ~260 px blank on the right (`shots/desktop-drawer.png`). | craft, hierarchy |
| Color & contrast | **8.9** | **Strong, near Exemplary.** Restrained: neutral warm paper, one blue for interaction and selection, and fixed meanings (green ✓ Played, amber ★, red for destructive and error). Measured minimum 5.23:1 everywhere, including the dark drawer. Forced colors are deliberately designed. A single light theme passes WCOLOR-01 and is an owner decision. **Below 9.0:** the tinted pill on a selected section header reuses the selection colour in a second shape (mismatch 3). | color-restraint, accessibility |
| Iconography | **8.7** | **Strong.** One Lucide set at matching stroke, plus custom 15/30 skip glyphs with numerals. Every icon-only control has a tooltip on hover and keyboard focus and an accessible name. Menus have no stray icons. **Below Exemplary:** Trash is the only sidebar row with an icon. The Views tab's funnel stands for "saved filter", which is accurate but not instantly readable for a listening app. | conventions, craft |
| Consistency & polish | **8.4** (stability 8.6) | **Strong.** States are designed everywhere: hover, focus, pressed, disabled, empty (dashed boxes), errors inline, the playback-problem line, the offline status, forced colors. Toasts have one place, one voice and one Undo. **Held back by the inventory mismatches:** FLOW-07 primary placement, three Back idioms on desktop detail pages, the pill vs bar selection idiom, focus after removal in the drawer vs on a page, and always-visible vs quiet row actions. The stability sub-score is 8.6: no FLOW-01–04 failures at any width, but one FLOW-07 and four message/idiom mismatches. | craft, stability |
| Clarity | **8.8** | **Strong.** Domain words are used exactly (Entry, Played, Active, Clear on Played). Labels name targets ("Play Next in Default", "Remove X from Default"). State is visible: NOW/RESUME/HERE, the Active dot, the Paused badge, ✓ Played, the "Matches 5 Episodes now" count. Search states its scope. **Below 9.0:** when rows are ticked, the bulk bar's "Play Next / Play Last" replaces the "Next and Last go to" picker, so the destination isn't named in the bar. Type-ahead fails on multi-word prefixes: typing "the w" on the tick-box cell ticks a row with the space and lands on "The quiet edge…" (`kb.mjs`). | plain-language, feedback |
| Platform fit | **8.7** | **Web: Looks 9.0, Behaves 8.6, so (9.0 + 2 × 8.6) ÷ 3 = 8.7.** Native selects and fields; real links; the browser's menus on links and text; shortcut notation per OS; reflow, zoom and forced colors. Android idioms are right: bottom tabs with a pill indicator, bottom sheets, and the system Back closing sheets and drawer pages one at a time. **Behaves loses** for focus dropped on panel Back/Forward (WKEY-03) and for the drawer state having no URL (acceptable as transient). **Mac window:** Strong too (menus as above, native row menus, titles, restore). The foreign tells are Settings inside the main window, a Controls ▸ Play/Pause item that doesn't toggle its title, Undo titles that read as whole sentences ("Undo “Removed ‘Joinery without screws’ from Default”" rather than "Undo Remove"), and no Dock menu for playback. | conventions, stability |
| Interaction & feedback | **6.9** (capped by WKEY-03; uncapped it would be ~8.8) | Keyboard-fluent grid, menus from the keyboard, and keyboard reorder with announcements. Undo instead of confirmation almost everywhere. Instant (p75 105–123 ms). Live-applied edits with Cmd-Z and Edit menu labels. Focus moves to the neighbour row after a removal and back to the restored row after Undo. **Capped** because Back/Forward on desktop side panels leaves focus on `body` (major). | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **8.4** | It serves the task very well. Finding and listening are true peers, every destructive step is forgiving, and the app is at home in Chrome on Android and in a Mac window. The cap allows up to 8.9 (6.9 + 2.0). **Holding it down most:** the WKEY-03 focus loss caps Interaction & feedback. After that, the craft gaps keep four categories in the 8.4–8.7 band: player-title truncation, the per-row Timeline actions, and the inventory mismatches. Removing the cap and closing about four of those gaps puts 9.0 within reach. | — |

## Next step

- **Target:** WKEY-03 (the only major failure). It caps Interaction & feedback at 6.9.
- **Anti-pattern:** "focus lost after a view change" (anti-patterns: web, B6).
- **Root cause:** focus restoration is wired to pathname changes and to the panels' own Close and Escape handlers. A history entry that differs only in a search param (`?episode`, `?edit`) removes or creates the panel without either path running. `returnFocus.selectorFor` also only records controls inside `main`, so a control in the `aside` panel is never remembered.
- **Change:**
  - Run the panel's close-focus logic on any location change that drops its param: the row title, or Edit View.
  - Run its open-focus logic when Forward re-adds the param: the panel h2.
  - Let `selectorFor` record `aside` controls, keyed by pathname + search.
- **Principle:** stability, user-control.
- **Expected effect:** WKEY-03 passes. Interaction & feedback rises from 6.9 to ~8.8. Overall rises to ~8.7.
- **Then, in order:**
  1. Widen the player-bar title column: let it take the free space at 720 px, and at 412 px drop the subtitle's "· Playlist" before the title truncates.
  2. Show "Rewind to here" on Timeline rows only on hover or focus on desktop, and put it inline (icon + tooltip) on the phone so each event is one row.
  3. Unify the desktop Back idiom on detail pages, and give the Add sheet's Next/Last equal weight (FLOW-07).
  4. Name the destination in the bulk bar ("Play Next in Default").
  5. Treat a space during type-ahead as part of the search when typing has started within 700 ms.
