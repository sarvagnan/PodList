# UI grade, round 22

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) at commit 9498706, read independently of earlier rounds. Target: **web app** (Android-first installable PWA). The Mac app is the same build in an Electron window (`packages/desktop/src/main.ts`). Its menus, context menu and window were judged from that file and from a launch with Playwright's `_electron`, and they count toward Platform fit's Behaves half. Mac checklist IDs: N/A → target.

Evidence: the flow run at `scratchpad/flows-r22` (browse, listen, now playing, fresh device, second tab; 412×915, 720×450, 1440×900; no stability failures; timed p75 116 ms and 102 ms). I also ran my own Playwright probes at `scratchpad/grade-r22/` (Chromium 1.65 headless, darwin arm64, no throttling): screenshots of every screen at three widths plus 320 px, 200 % text, forced colors with reduced motion, text-spacing overrides, a computed-contrast scan, a target-size scan, keyboard and focus probes, Back with overlays open, undo, reorder, first run, and an Electron menu dump.

## Frame

- **Task:** find Episodes through Views and listen to them through Playlists, picking up where you left off on any Device.
- **Target:** web app (Android Chrome PWA; also a Mac desktop window in Electron).
- **Posture:** sovereign on desktop, transient-to-sovereign on the phone (people return to it all day).
- **Audience:** perpetual intermediate (a heavy podcast listener).
- **Nearest exemplar:** Things, for its calm lists with actions surfaced on hover and its finished states. BBEdit, for its keyboard and menu completeness in the Mac window.
- **Character:**
  1. Views and Playlists as equal halves, navigated by lists (owner decision);
  2. the dark player bar and Now Playing drawer against a warm off-white page (owner decision);
  3. Space Grotesk headings over Inter (owner decision);
  4. one blue, #2b50c8, for interaction, progress and the NOW mark (owner decision);
  5. initialled square artwork tiles and plain-spoken, domain-exact copy ("Clear on Played", "Rewind to here").
- **Owner decisions:** light only, layout variant A, the fonts, the blue, the dark player, and the View editor R / Playlist settings and Rewind C / Library C designs.

## Flows

- **Tasks run:** browse, listen, now playing, fresh device and second tab (the provided run). My probes added: remove and Undo, reorder by keyboard and pointer, delete Playlist to the Trash and Restore, Rewind, New Playlist, Save as View, the View editor, Add podcasts (directory, feed address, errors), Mark all Played, Unsubscribe, bulk actions, and first run with skip.
- **Widths:** 412×915, 720×450, 1440×900; plus 320×640, 200 % root text, and text spacing.
- **Appearance:** light, the only theme. Forced colors with reduced motion was checked separately.
- **Timed runs:** 5 runs on desktop, Chromium on an Apple-silicon Mac, no throttling. Open a Playlist p75 116 ms; Play from here p75 102 ms. Lab LCP 188–304 ms and CLS ≤ 0.007 over 5 loads each of `/playlists/default`, desktop and phone.
- **Script:** `packages/web/ui-flows/flows.mjs`, with measurements in `flows-r22/measurements.json` and strips in `flows-r22/strips/`. My probes are in `scratchpad/grade-r22/*.mjs`, with shots in `scratchpad/grade-r22/shots/`.
- **Failures:** none among FLOW-01 to FLOW-07 (summary.md: "None").

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Dark toast, bottom-leading above the player: "2 Episodes marked Played" | none seen | none | Undo in the toast; ⌘Z | First-run card replaces the list; target panel: plain muted line "Nothing up next…" | none | Play (row, trailing, blue on hover) | Facts line under the title |
| View (phone) | Same toast, above the player | none | Add sheet (bottom) | Toast Undo | Card or list | none | Play (row, trailing) | none |
| Search | n/a | none | Save as View dialog | ⌘Z | Dashed box "Search your Library" | none | Save as View (header, trailing) | Scope line under the field, kept while typing |
| Playlist | Toast "Removed from Commute" / "Moved “…”" | none | none | Toast Undo; ⌘Z | Dashed box "Nothing here yet" | none | Play / Play this (header, trailing, blue) | none |
| Timeline / Rewind | Toast | none | Alert dialog, trailing compact Cancel · **Rewind** | "You can undo the Rewind" | Dashed box | none | Rewind to here (row, trailing) | Intro paragraph |
| Playlist settings / Trash | Toast "Moved “Evening walk” to the Trash" + Undo | none | none | Toast Undo; Restore | Dashed box "The Trash is empty" | none | Delete Playlist / Restore (row, trailing) | Field help |
| New Playlist / Save as View | navigates to the new item, focus on h1 | Inline red text under the field ("A Playlist needs a name.") | Form dialog, equal-width Cancel · **Create** + ✕ | n/a | n/a | none | Create (trailing half) | Help line under the field |
| Add podcasts | Toast "Subscribed to …"; row says "Subscribed" | Inline red text under the field | none | n/a | none | none | Segmented Search / Feed address / OPML | Help line under the field |
| Subscription | Toast "Marked Slow Build Played" + Undo | none | Alert "Unsubscribe from Slow Build?" | Toast Undo | n/a | none | Play (rows) | "Settings for this podcast" disclosure |
| Library | Toast | none | none | ⌘Z | Dashed box "No Subscriptions yet" | none | Add podcasts (header, trailing, blue) | First-run card |
| Settings | Live apply, no message | none | none | n/a | n/a | none | n/a | Help under each label |
| Now Playing drawer | Toast inside the drawer's foot strip | none | none | Toast Undo | n/a | none | Play/Pause (centre) | none |

**Mismatches:**
1. **Episode row commands vary with container width** (View at 1440 vs Subscription page, and every View in the Mac window at its default 1280×820). One shows quiet inline Next · Last · + · ☆ · ✓ · ↓ on hover. The other shows an always-visible "…" button on every row. The same object gets two different command surfaces, and the "…" column contradicts the row's own "quiet until in hand" rule.
2. **Empty states:** the target panel's empty state is a bare muted sentence; every other empty state is the dashed titled box.
3. **Cursor label during drag:** at rest the Commute Cursor Entry reads "RESUME" with a progress bar. The drag overlay of the same Entry reads "HERE" with its duration (APPEAR-11).
4. **Dialog footers:** form dialogs use equal-width Cancel/primary plus ✕, and alerts use compact trailing buttons with no ✕. This looks deliberate (form vs alert) and the primary stays trailing in both, so it's noted but not counted.

## Checklist

**Coverage: 97.9 %** (pass 92 · fail 3 · N/O 2 · N/A 8; 97 applicable, 95 with a verdict).

Mac IDs: N/A → target (they are out of the coverage count).

### Failures by severity

**Major**

- **[WKEY-03] Focus is left on removed or disabled controls after a person's own bulk action.** Interaction & feedback is capped at 6.9.
  - *Where:* View › bulk bar › Mark Played (desktop), and Subscription › Mark all Played (every width).
  - *Evidence:* on `/views/new-this-week`, tick two rows, focus "Mark Played" in the bulk bar and press Enter. The rows leave the Unplayed View, the bulk bar unmounts, and `document.activeElement` is `<body>`. After ⌘Z it's still `<body>` (`bulk.mjs`). On `/library/sub_c105…` (Slow Build), focus "Mark all Played" and press Enter. The button becomes `disabled` and focus drops to `<body>` (`markall.mjs`). A screen-reader user hears nothing after the action and loses their place. The app already solves this for a single row (`focusAfterRemoval.ts`, `useRowGrid`), just not here.
  - *Fix:* when the bulk bar closes after an action, send focus to the row grid's active cell, using the row that now holds the first removed row's index, or the list's heading if the list is empty. Restore focus the same way after Undo, through `useConfirm`'s `focus` callback. Don't disable "Mark all Played" while it has focus. Keep it enabled and let it confirm "Nothing left to mark" in a toast, or move focus to the Episodes heading before disabling it.
- **[DRAG-01] Files dropped anywhere but the bare file input open in place of the app.**
  - *Where:* Add podcasts › OPML file (browser and Mac window).
  - *Evidence (C):* there is no `dragover`/`drop` handler anywhere in `packages/web/src` (`grep onDrop|dataTransfer` returns nothing). The browser's default for a file dropped outside a file input is to open it in the tab. In the Mac window, `main.ts`'s `inApp()` allows `file:` URLs in `will-navigate`, so a dropped `.opml` replaces PodList with raw XML. Dropping exactly on the native `<input type=file>` does work, but nothing invites it.
  - *Fix:* make the OPML tab, or the whole Add sheet, a drop zone: `dragover` with `preventDefault` and a highlighted "Drop an OPML file" state, and `drop` that reads the first file into `importOpml`. Add a document-level `dragover`/`drop` guard that calls `preventDefault` so a stray drop never navigates. In `main.ts`, refuse `file:` navigation after the setup page.

**Minor**

- **[APPEAR-11] The drag preview contradicts the row it lifts.**
  - *Where:* Playlist Entries, pointer drag of the Cursor Entry in a non-Active Playlist.
  - *Evidence:* `shots/desktop/dragging.png`. At rest the Entry reads "RESUME" with a 3:34-left progress bar. While dragged it reads "HERE" and "26 min", because the overlay renders with no Position (`$playlistId.tsx` lines 380–401: `position > 0 ? "RESUME" : "HERE"`).
  - *Fix:* pass the Entry's real `position` (and progress) into the overlay render, so the lifted row is a copy of the row.

### N/O

DRAG-06 and FOOT-02. Demo lists are too short to show autoscroll during a drag or long-list scrolling. The list is virtualised, but it wasn't measured.

### N/A

LIST-05 (no outlines); AX-05 (no app-generated audio cues or autoplay); START-04, START-05 (no permission prompts); START-06, START-07 (no accounts); TOOL-06 and SIDE-03 (nothing can be hidden).

### Passes worth noting

- **Keyboard:** the APG grid in Views is one Tab stop, with arrows, Home/End, type-ahead, Space to tick, ⌘A and ⌘C (copies the Episode URL).
- **Focus and overlays:** focus goes to the h1 on view changes. Dialogs trap focus, close on Esc, and return focus to their opener. Back closes the drawer layer by layer, and closes sheets too.
- **Undo:** Undo toasts never time out (`timeout: 0`), and ⌘Z works with labelled Edit › Undo “Removed from Commute” in the Mac menu.
- **Search state:** refine conditions survive reload in the URL.
- **Adaptation:** the shortcut glyphs follow the OS, and the single-key shortcuts can be turned off. Forced colors keeps boundaries, progress and selection. Reduced motion turns the drawer's slide into a 150 ms fade.
- **Measured:** all text is ≥ 4.5:1, including the dark drawer and toasts. The only text under 12 px is the 15/30 numerals inside the skip icons. Every target is ≥ 24 px or meets the spacing exception (checkboxes sit in 40 px labels). Nothing is obscured by the player at 720×450 or on the phone. 320 px reflows, and 200 % text keeps every function.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | Four roles carry the structure: Space Grotesk titles (28 px) and section heads; Inter rows at 15 px/22 px; 13 px facts in #5c6070; letterspaced caps labels ("VIEWS", "IN YOUR PLAYLISTS", "NOW"). Typographic quotes and ellipses throughout, and truncation is designed (3-line clamp, "·" kept at line ends). Below Exemplary: the 11 px numerals in the skip glyphs, a player-bar title clipped to "The long life of a shipping…" even with free space at 1280, and icons that don't scale with 200 % text (a 14 px gear next to a 56 px title). | hierarchy, craft |
| Hierarchy | **8.6** | Each screen leads with its title and list. Row actions stay quiet until hover or focus, and one blue primary per header (Play, Add podcasts). Below Exemplary: on a first-run Library the blue "Add podcasts" appears three times (header, checklist, empty state); the welcome card repeats on all three tabs; at 1440 the Playlist and Library columns stop at 1160 px and leave ~280 px of dead page while the View page fills the width. | content-first, hierarchy |
| Spacing & density | **8.4** | 4 px grid, rows of 76 px (View) and 68 px (Playlist), a shared 32 px gutter, list and panel tops aligned (FLOW-05 pass), and density right for the posture. Below Exemplary: on pages with a back link the "‹ Library / ‹ Playlists" link sits 15 px from the window's top edge while titles stay at y = 54, so the link is crowded into the margin. On a 1440×900 desktop with Chapters, the drawer starts at y = 164 yet its own column overflows (Episode button at y = 896–940, `drawer2.mjs`), so a 164 px dimmed strip coexists with a scroll. Content widths differ by page (View full width; Playlist, Library, Trash capped at 960). | craft, hierarchy |
| Color & contrast | **8.8** | Restrained and meaningful: one blue for interaction, progress and NOW; green only for Played; amber star; red only for destructive actions. Every measured text passes, including the dark drawer and toasts. Forced colors is handled deliberately. Below Exemplary: a single theme (owner decision, and fine under WCOLOR-01), and the selected segment (white on #ecebe6) relies on weight and text colour more than its fill. | color-restraint, accessibility |
| Iconography | **8.6** | One Lucide family at matched stroke, custom 15/30 skip glyphs in the same weight, every icon-only control with a label and a tooltip on focus. Below Exemplary: the gear means three scopes (app Settings in the phone Library header, Playlist settings, Subscription settings in Library rows); Views as a funnel is a stretch on first sight. | conventions, craft |
| Consistency & polish | **8.4** (stability 8.9) | Every state is designed: loading placeholders the size of real rows, dashed empty states, forced colors, reduced motion, 320 px, 200 % text. The flows hold still at all three widths. Below Exemplary: the inventory mismatches above (two command surfaces for one Episode row; the bare target-panel empty state; the drag overlay's HERE vs RESUME). | craft, stability |
| Clarity | **8.7** | Specific verbs throughout ("Play Next in Default", "Rewind to here", "Move to Bottom"), a confirmation that lists exactly what a Rewind keeps, state always visible (NOW / RESUME / HERE, Active dot, Paused / Playing badge, "kept until 8 Dec"). Below Exemplary: an empty Default Playlist on first run is badged "Paused" with 0 Entries; the Episode page's "Played" button doesn't say whether it's a state or an action (`aria-pressed` false, label "Played"). | plain-language, feedback |
| Platform fit | **8.7** (Looks 9.0 · Behaves 8.6) | **Web:** every view and state has a URL (`?episode=`, `?tab=`, `?edit=true`, `?sort=`, search conditions). Back closes overlays layer by layer. Real links throughout, with the browser menu kept on links and text. The custom row menu is desktop-only and its commands are reachable elsewhere. Native selects and fields, standalone-mode back links, and good lab Vitals. **Mac window:** a full menu bar with Go, Controls and a labelled Undo, a native row context menu with Copy Link, and swipe/back buttons that walk history. Pulling Behaves down: dropped files navigate away (DRAG-01). Search URLs carry a JSON blob (`?f=%7B%22filter%22…`), which works but isn't readable or shareable. In the Mac window, ⌘, opens Settings inside the main window and row commands (Mark Played, Star) have no menu-bar home. | conventions, stability |
| Interaction & feedback | **6.9** (capped; ~8.8 uncapped) | Keyboard-fluent grid; Undo instead of confirmation almost everywhere; persistent Undo toasts; 102–116 ms p75 responses; keyboard reorder with live announcements; drafts apply live. Capped at 6.9 by the major WKEY-03 failure (focus to `<body>` after bulk Mark Played and Mark all Played), and DRAG-01 would cap it too. | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **8.4** | A carefully finished podcast client that serves its task and is at home in the browser and close to home on the Mac. Overall can't exceed 8.9 here (6.9 + 2.0). The weakness holding it down most is focus management after bulk and whole-podcast actions; after that, the inconsistent row command surface and the desktop drawer's fit. | |

## What stands between this build and 9.0

1. **Clear the two major failures** (the cap on Interaction & feedback): manage focus after bulk Mark Played, Mark all Played and their Undo, and make OPML import a real drop target with a page-wide guard against stray drops, also in `main.ts`. With those fixed, Interaction & feedback would score about 8.8 and the cap on Overall would go.
2. **One command surface per Episode row.** Show the "…" only on hover or focus, like the inline actions, or keep the inline set at narrower containers by dropping the "Next"/"Last" words for icons, so the View in the Mac window's default 1280 px matches the design and the 1440 browser.
3. **Desktop drawer fit:** size the sheet to its content (top = max(16 px, 100vh − content height)) so the Episode button never sits below the fold while a dim strip shows above.
4. **Craft nits:**
   - give back links their own 16–24 px row above the title, so they don't crowd the top edge;
   - use one content width rule for list pages;
   - give the target panel's empty state the dashed-box form;
   - render the drag overlay with the Entry's real Position;
   - show no "Paused" badge on an empty Playlist;
   - show the first-run card only on Views (or once), and drop the duplicate Add podcasts on Library;
   - write readable search URLs (`?q=the&played=unplayed&sort=newest`).

## Next step

- **Target:** WKEY-03 (major) in Interaction & feedback, the lowest category.
- **Anti-pattern:** *Focus lost after removal*.
- **Root cause:** the bulk bar and "Mark all Played" are outside `useRowGrid`'s focus-repair path, so when their action removes or disables the focused control nothing hands focus on.
- **Change:** route BulkBar actions and Mark all Played through the same focus handoff as row removal (next row's same cell, else the list heading), and pass a `focus` callback to `useConfirm` for Undo.
- **Principle:** user-control, stability.
- **Expected effect:** lifts the 6.9 cap on Interaction & feedback (to about 8.8) and the 8.9 limit on Overall. Nothing should regress.
