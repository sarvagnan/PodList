# UI grade, round 13

Commit `e619d23`. Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) as a **web app**, the Android-first installable PWA, with the Mac app (the same build in an Electron window, `packages/desktop/src/main.ts`) judged as a desktop browser window plus its shell. Graded independently, without reading earlier rounds.

Evidence lives in `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/`:
- `flows-r13/`: the flow run for this build (`summary.md`, `measurements.json`, strips, contact sheets);
- `grade-r13/`: my probe scripts (`*.mjs`) and screenshots (`shots/`). Below, screenshots are named by their file in `grade-r13/shots/`.

Browser: Playwright Chromium (packages/web, Playwright 1.65), service workers blocked. Electron 44.9.3 through Playwright `_electron`. Device: darwin arm64, no throttling. Phone 412×915 at 2×, zoomed desktop 720×450 at 2×, desktop 1440×900 at 1×, plus 320×640, 1440×720 and 1440×800. Light appearance only (owner decision).

## Frame

- **Task:** find Episodes through Views and Search, and listen through Playlists: queue (Play Now / Next / Last), play, resume, reorder, and recover (Undo, Trash, Rewind).
- **Target:** web app (installable PWA, Android Chrome first). The Mac app is the same page in an Electron window; its menus and context menus are judged as the shell around a web app.
- **Posture:** sovereign on desktop (an all-day listening tool), transient-to-sovereign on the phone (pick up, play, put down).
- **Audience:** perpetual intermediate; a podcast listener who learns the View/Playlist split once.
- **Nearest exemplar:** Things (a calm personal tool with lists, quiet chrome, actions on hover or selection, Undo over confirmation).
- **Character:** (1) blue primary #2b50c8 used only for interactive emphasis* ; (2) Space Grotesk headings over Inter text*; (3) the dark player bar and Now Playing drawer*; (4) Views and Playlists as equal halves, navigated as plain lists, never capsules*; (5) plain-spoken domain vocabulary with capitalised domain nouns (Episode, Entry, Playlist, Played). (* = owner-fixed.)
- **Owner decisions:** light only until a dark theme is designed; layout variant A; Inter and Space Grotesk; blue primary; dark player bar; designs in `docs/design/ui-layout.md` (View editor R, Playlist settings and Rewind C, Library C). These are graded but not proposed for change.

## Flows

- **Tasks run (flow run `flows-r13`):** browse (Views → Commute → Default → Library), listen (play an Entry, pause, forward 30, switch Playlist), Now Playing (drawer, Up next, play from Up next, Episode page, close), fresh device (catalogue arrives 2 s late), second tab (take over playback).
- **Widths:** phone 412×915, zoomed 720×450, desktop 1440×900. **Appearance:** light.
- **Timed runs:** desktop, 5 runs after warm-up, no throttling, darwin arm64. p75: open a Playlist **132 ms**, Play from here **105 ms** (both within RESP-01's 200 ms).
- **Extra probes (mine):** FLOW-03 typing into Search while the catalogue is held 2.5 s (`grade-r13/flow03.mjs`): "market" typed before the arrival and " rice" after it give `market rice`; field top 120 → 120 (phone) and 88 → 88 (desktop); focus kept; URL `?q=market+rice`. Lab vitals (`vitals.mjs`): LCP 44–300 ms, CLS 0–0.008.
- **Script:** `packages/web/ui-flows/flows.mjs`. **Measurements:** `flows-r13/measurements.json`. **Strips:** `flows-r13/strips/<flow>/<width>/`.
- **Failures:** none. Every core element (heading, navigation, player, main action) holds within 2 px through every step not caused by the person; focus lands on the new view's `h1` after navigation and stays on the control the person used (e.g. `listen` step 2: focus `button "Pause The long life…"`).

The flows don't type during a late arrival; my FLOW-03 probe above covers that.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop list + right panel) | Toast, bottom-leading above the player: "Added to Default", "Link copied"; neutral dark | none seen | none | Toast "Undo" button and ⌘Z / Ctrl+Z | "Nothing matches" + hint, in the list area | none | Play per row (trailing); Edit View top-trailing | Subtitle summarises the View ("Last 7 days · Unplayed · Newest first") |
| View editor (panel / phone page) | Live preview, no message | Inline under Name (`aria-invalid`, red text) | none | ⌘Z; "Deleted “Short ones” · Undo" toast on Delete View | n/a | none | Done, top-trailing of the panel | Footnote "Every row must match. Rows left at “Any” don't narrow anything." |
| Search | Count line "1 Episode · …" (live region) | none seen | none | n/a | "Nothing matches · Try fewer or different words." | none | Save as View, top-trailing | Scope line under the field |
| Episode detail | Toast (same place) | none seen | none | Toast Undo | n/a | none | Play, centred in the action row (page); 4th of 7 in the panel | none |
| Playlist (Entries / History / Timeline) | Toast "Removed from Workshop · Undo"; "Moved … · Undo"; live "moved to position 2 of 3" | none seen | Rewind confirm dialog (Cancel / Rewind) | Toast Undo, ⌘Z, and "You can undo the Rewind afterwards" | Dashed box: "Nothing played yet / What this Playlist plays is kept here for 30 days…" | none | Play / Play this, top-trailing | Timeline intro paragraph |
| Playlist settings | Live apply | Inline under Name | none | Toast "Moved “Workshop” to the Trash · Undo" | n/a | none | none (Delete Playlist at the bottom) | Help text under each field |
| Trash | Toast "Restored “Workshop”" | none seen | none | n/a (Restore is the recovery) | Dashed box: "The Trash is empty / A deleted Playlist waits here…" | none | Restore per row | Retention line under the title |
| Library / Subscription | Toast | none seen | Unsubscribe confirm | Toast Undo (Mark all Played) | n/a in demo | none | Add podcasts, top-trailing (blue) | "3 Subscriptions · downloads and settings for this Device" |
| Add podcasts sheet | Result row with Subscribe; OPML summary "Added 3; …" | Inline red text under the field, `role=alert`: "This address didn't give a podcast feed. Check it, or find the podcast by name with Search." | none | n/a | n/a | none | Subscribe per result | Help line under the field |
| Settings | Live apply | none seen | none | n/a | n/a | none | n/a | Help text per row |
| Now Playing drawer | Inline state (Play ↔ Pause) | Player error colour `--player-danger` (code) | none | Toast Undo for removals from Up next | n/a | none | Play, centred | none |
| First run | Checklist ticks | n/a | none | n/a | Starter Views with 0 counts | none | Add podcasts (blue), Skip for now | Checklist copy |

**Mismatches**
1. **Back label:** Episode detail says "Back"; every other drill-down names its parent ("Views", "Playlists", "Library", "Default"). Episode detail, all other detail screens. (Defensible, because Episode detail has many parents, but the text could name the actual origin.)
2. **Row affordance by width:** at 1440 px a View's rows show only Play until hover/focus (`desktop-01-home.png`); at 1280 px the same rows show a "…" menu button (`electron-1.png`); the Subscription page shows "…" at 1440 (`desktop-10-subscription.png`). One kind of row, three affordances.
3. **Queue badge:** the desktop player bar shows "2 up next"; the phone player bar has no queue badge (design calls for one on both); the count reappears only inside the drawer ("Up next · 1"). Player bar phone vs desktop.
4. **Toast vs. focus:** the toast sits over the bottom rows of a list, and keyboard focus can land under it (see Craft gaps §5). All list screens.

The success, error, Undo, empty-state and confirmation columns are otherwise consistent: one toast place, one wording pattern ("Removed from X · Undo", "Moved “X” to the Trash · Undo"), one red for errors, one dashed-box empty state.

## Checklist

Coverage: **94%** (pass 93 · fail 1 · N/O 6 · N/A 5; 105 IDs: 79 core + 26 web). Mac IDs: N/A → target.

### Failures by severity

**Major**

- **[WTYPE-02] Text enlargement collides the Episode action labels.** With the browser's font size at 150% (Chrome "Very large", 24 px) or 200% (32 px), the labels under the Episode detail action buttons run into each other: "PlayedDownload" at 150% on the phone (`ad-text150phone-0.png`), "Playe|Download|Play" overlapping at 200% on the phone (`ad-text200phone-3.png`), and "PlayedDownload" in the desktop page and side panel (`ad-text150-0.png`, `ad-text200-3.png`). The buttons are px-sized columns (by design, so chrome doesn't grow) but the labels are rem-sized and have no room to grow or wrap. Browser zoom (720×450) is fine (`sheet-zoomed.png`); the text-size path is what fails. At default size and 320 px the labels already touch ("Played Download", `sheet-320.png`).
  **Fix:** lay the action row out as a grid whose columns grow with the text: `grid-template-columns: repeat(auto-fit, minmax(max-content, 1fr))` with a `0.5rem` column gap and labels `white-space: nowrap`, or let it wrap to two rows of `minmax(4.5rem, 1fr)` columns with Play kept in the centre of the first row. Verify at 24 px and 32 px root on the phone, and at 320 px.

No blocker or minor failures.

### N/O
CTRL-08, DRAG-05, DRAG-06, START-05, FOOT-02, WDATA-02.

(No probe ran a long download (CTRL-08); FOOT-02 needs a list longer than the demo's 15 Episodes; DRAG-05/06 need pointer drags across a scrolling list; START-05 applies only in browsers that prompt for persistent storage (Firefox); WDATA-02's "storage full" and "denied" states weren't reproduced. AX-04 counts as pass on its non-gesture half; Voice Control itself wasn't run.)

### N/A
AX-05 (no critical audio-only information beyond the content itself; nothing autoplays), START-06 and START-07 (no accounts), TOOL-06 (no hideable toolbar or panel), SIDE-03 (the sidebar can't be hidden). Mac checklist: N/A → target.

### Passes worth recording (evidence)

- **BROWSER-01/02/03:** every view has a URL: `/views/new-this-week?episode=…` (the Episode open beside a View survives reload, `misc.mjs`), `/views/short?edit=true`, `/playlists/workshop?tab=timeline`, `/search?q=market+rice`; titles name the view ("Default settings · PodList"). Back closes the Add sheet, the Rewind confirm and the drawer without leaving the page (`phone.mjs`, `rewind.mjs`, `drawer.mjs`).
- **BROWSER-04/06:** real `<a href>` links everywhere (sidebar, rows, tabs); right-click on a row or link is the browser's own menu on the web (`rows.mjs`: `defaultPrevented=false`); the Mac app adds native row menus from `data-row-menu` plus Copy Link / Open in Browser, and native Cut/Copy/Paste/Look Up elsewhere (`main.ts` 192–278).
- **BROWSER-05 / WCOPY-01:** ⌘K only on a Mac, `/` elsewhere; hints are OS-aware ("Ctrl+/" off-Mac; ⌘K hidden off-Mac, `AppShell.tsx` 343, 421).
- **KEY-01/04, WKEY-01/03:** skip link first; sidebar → toolbar → one Tab stop for the Episode grid → target panel → player; arrows, Home/End, type-ahead, Space ticks, ⌘A, ⌘C copies the row's URL (`rows.mjs`). Dialog focus trap and return (`drawer.mjs`: 40 Tabs stay inside; Esc returns focus to "Open Now Playing"). Removing an Entry moves focus to the next row's same control (`playlist.mjs`); deleting a Playlist or restoring from Trash moves focus to the `h1`.
- **DATA-04/05, DRAG-01/03:** Undo toast plus ⌘Z for remove, reorder, delete View, delete Playlist, Mark all Played; reorder by keyboard (Space, ↓, Space) with a live "moved to position 2 of 3" and an Undo toast; the OPML file input is a visible native input that accepts a dropped file.
- **WDATA-03/04:** feed-address error is field-specific, keeps the typed URL, `role=alert`; Undo toasts still present after 8 s.
- **APPEAR-03/04/05:** forced colours keep boundaries, progress and selection (`sheet-forced.png`); no text below 4.5:1 on any scanned screen at phone or desktop (`scan.mjs`; secondary text #5c6070 is 5.7:1 on the page; drawer secondary #a9b6be is 7.5:1 on #1b2a33); reduced motion fades sheets in place.
- **WTYPE-03:** the WCAG text-spacing overrides clip nothing (`sheet-sp.png`).
- **WTYPE-04:** the only sub-24 px targets are 16 px checkboxes in the Library table and 21–22 px tall title links in rows, all with ≥24 px clear spacing (the spacing exception); View-row checkboxes have 40×40 labels.
- **WTYPE-05:** no horizontal scroll at 320 px on any scanned screen (`sheet-320.png`).
- **RESP-01, BROWSER-10:** p75 132 / 105 ms; lab LCP ≤ 300 ms, CLS ≤ 0.008.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by WTYPE-02) | Uncapped this would be about 8.6: a small deliberate scale (Space Grotesk 28 px titles; Inter 15 px rows; 13 px secondary in #5c6070; 12–13 px letterspaced caps for section labels "NEXT AND LAST GO TO", "IN YOUR PLAYLISTS"), tabular figures in times, a real minus in "−16:34", curly quotes throughout. The cap comes from the Episode action labels colliding under the browser's text size (150% and 200%). Also keeping it below Exemplary: in the Library list at 200% the podcast names truncate to "Deep F…", "Market …" while "4 unplayed" keeps its full width (`ad-text200phone-2.png`). | `hierarchy`, `accessibility` |
| Hierarchy | **8.5** | One focal point per screen: the title, the list, one blue primary at top-trailing (Play this / Add podcasts / Done). Hover-revealed row actions keep lists reading as titles. Held back by: the Episode action row in the 360 px side panel wraps 4 + 3 with Play at the end of the first row, not centred as designed (`misc-1-panel.png`); the desktop drawer puts a centred player in the left 1000 px and a short Up next column at the far right, leaving a large dead field between (`m2-drawer-desktop.png`). | `content-first`, `hierarchy` |
| Spacing & density | **8.3** | Visible 4 px rhythm: 76 px Episode rows, 68 px Entry rows, 38 px sidebar items, shared left edge at 256 px for title, subtitle and list; density suits a calm listening tool. Held back by: 1440 px desktop main column stops at ~1160 px on Playlists, Library, Search and Settings, leaving ~280 px unused while the View screen uses it for a panel; Episode detail page on desktop uses ~660 px; action labels touch at 320 px ("Played Download"). | `craft`, `hierarchy` |
| Color & contrast | **8.7** | Restrained and meaningful: one blue for interaction and selection, green only for Played, amber only for Star, red only for destructive/error; the dark player is a deliberate surface with its own focus colour (white rings). Every scanned text passes 4.5:1; focus ring 6.25:1; field edges 3.3–3.6:1; forced colours handled. Below Exemplary because it is one appearance only (owner decision, not a failure), and the light-blue NOW row (#e8edfb) is the same tint as sidebar selection and ticked rows, so "current Entry" and "selected" share a colour. | `color-restraint`, `accessibility` |
| Iconography | **8.4** | One Lucide family at matching stroke weight; custom 15/30 skip glyphs read instantly; every icon-only control has a tooltip that also shows on focus ("Remove from Workshop", `pl-desktop-1-removed.png`) and an accessible name. The View rows use words "Next"/"Last" because the two glyphs are near-identical, but the Episode detail action row still uses those near-identical glyphs (labelled) for Next and Last; the Library table's per-row settings uses a sliders glyph that is also "Edit View". | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability 9.0) | Stability: no FLOW failures at any width; late catalogue arrival doesn't touch typed Search text; one toast place and wording; one empty-state form. Every state is designed: hover, pressed, focus, selected, ticked, NOW/HERE, Paused, empty, error, forced colours. Held back by the inventory mismatches (row affordance changes by width; phone bar has no queue badge; Back label) and by the toast covering the focused row (Craft gap 5). | `craft`, `stability` |
| Clarity | **8.4** | Domain words used exactly and consistently (Entry, Played, Clear on Played, Rewind, Trash); state always visible (NOW/HERE, "Paused", "Default (Active)", "Resume at: …"); specific verbs (Play this, Rewind to here, Move to the Trash). Held back by: first run shows two explanations as checklist items, one pre-ticked ("Views find Episodes for you ✓"), so the checklist mixes tasks with facts (`fr-phone-1.png`); the Listening Timeline lists only "Listened to …" events, not "your own edits" as the design specifies, so a removal just made isn't on the timeline it might be rewound past (`rewind.mjs`); Search is a bare field, not the View form with Mentions filled in (design R), so a Search can't be narrowed by Played or Podcast before saving. | `plain-language`, `feedback` |
| Platform fit | **8.8** (Looks 8.6, Behaves 9.0) | Looks: page fills the viewport, native selects/inputs styled but intact, links look like links, OS-aware shortcut notation, focus ring distinct from selection, `color-scheme: light`, reflows to 320 px; minus the text-size collision. Behaves: URLs and titles for every view, panel and tab; Back never surprises and closes overlays first; scroll and focus restored on Back (`phone.mjs`: scrollY 119 → 119, focus back on the clicked link); browser right-click and shortcuts intact; installed mode has its own Back links. Mac window: complete App/File/Edit/View/Controls/Go/Window/Help menus with Settings… ⌘,, labelled Undo, native row context menus; Reload/DevTools only when unpackaged. Gaps: Help has no real help item (only Getting Started and Keyboard Shortcuts); Controls items aren't dimmed when nothing is loaded or the Episode has no Chapters; the Shortcuts reference writes "⌘⇧Z" where the Mac order (and its own Mac-app section) is "⇧⌘". | `conventions`, `discoverable-commands` |
| Interaction & feedback | **8.8** | Keyboard-fluent APG grid with type-ahead and bulk ticks; Undo instead of confirmation almost everywhere, with ⌘Z labelled in the Mac Edit menu; keyboard reorder with live announcement; edits apply live and survive reload; p75 105–132 ms; reduced motion respected. Held back by: Rewind both confirms and offers Undo (a confirm on an undoable action); Esc on a drawer sub-page (Episode, Up next) closes the whole drawer instead of returning to its main page, while Back returns one page; undo history doesn't survive a reload. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **8.3** | It serves the task very well and is at home in the browser and in a Mac window; the flows hold still and every recoverable action is recoverable. The cap is 8.9 (lowest category 6.9 + 2.0); the score sits lower because one major text-enlargement failure and a set of small craft gaps (side-panel action row, desktop drawer composition, toast over focus, timeline without edits, first-run checklist) keep four categories in the 8.3–8.5 range. **Weakness holding Overall down most:** the Episode action row, which fails text enlargement and also breaks the "Play centred" layout in the side panel. | |

## Next step

- **Target:** WTYPE-02 (the only checklist failure; major; lowest-scoring category, Typography).
- **Anti-pattern:** fixed-width chrome around growing text (a px column holding a rem label).
- **Root cause:** the Episode detail action row (`components/episodes/EpisodeDetail.tsx`) gives each action a fixed-width column sized for 15 px labels; labels grow with the browser's text size, the columns don't, and the row has no wrap rule that keeps Play central.
- **Change:** make the row a grid whose columns are `minmax(max-content, 1fr)` with a `0.5rem` gap, wrapping to two rows when it must; when it wraps, keep Play in the centre of the first row (one row: Played · Download · **Play** · Add · Star on phone; two rows in the 360 px panel: Next · **Play** · Last / Played · Download · Add · Star). Same rule fixes the 320 px "Played Download" touch and the side panel's 4 + 3 split.
- **Principle:** `accessibility` (text resize without loss), `hierarchy` (Play as the centre of the row).
- **Expected effect:** Typography 6.9 → about 8.6 (cap lifted), Hierarchy +0.1–0.2, Spacing +0.1; Overall to about 8.6. No category should regress; re-check the panel at 1440 and 1280 px, the phone at 412 and 320 px, and 24/32 px root size.

## Craft gaps between this build and 9.0

Not checklist failures; each keeps a category below Exemplary.

1. **Side-panel Episode actions** (Hierarchy, Spacing): seven 84 px columns in a 360 px panel wrap 4 + 3; Play ends the first row instead of centring (`misc-1-panel.png`). Covered by the Next step.
2. **Desktop Now Playing drawer composition** (Hierarchy, Spacing): player block centred in the left 1000 px, Up next pinned to the far right, a ~300 px empty field between; Up next has no reorder handles though the design gives the drawer's Queue reorder (`m2-drawer-desktop.png`). Fix: a two-column grid (`minmax(22rem, 1fr) minmax(22rem, 28rem)`) centred as a whole, max width ~64rem, with the same SortableRow handles as the Playlist page.
3. **Phone player bar has no queue badge** (Consistency, Clarity): the design gives both bars "queue badge + list icon"; the phone bar shows artwork, title, −15, Play, +30 only. Fix: add the badge as a 44 px button that opens the drawer on Up next, dropping −15 below 360 px as today.
4. **Row affordance changes with width** (Consistency): Play-only with hover actions at ≥1440 px, a "…" menu at 1280, "…" again on the Subscription page at 1440. Pick one: show "…" whenever the hover actions are hidden, on every Episode list.
5. **Toast covers the focused row** (Consistency, Interaction): `scroll-padding-bottom: 7.5rem` clears the 88 px player but not the toast above it. At 1440×720 on `/search?q=episode`, arrowing down puts the focused title "Counting galaxies by hand" (y 572) under the "Link copied" toast (y 556–608) with only the right end of its focus ring visible (`obscure-720-4.png`). That passes WCAG 2.4.11 by the letter, but it's one wider toast away from failing WKEY-04. Fix: while a toast is shown, set `scroll-padding-bottom` to player + toast + 16 px from the toast's measured height, or place desktop toasts top-trailing.
6. **Listening Timeline omits edits** (Clarity): the design lists "started, finished, and your own edits"; only "Listened to …" rows appear, so a just-removed Entry isn't on the timeline. Fix: add "Removed X", "Added X", "Moved X" rows (no Rewind button on them) so the Rewind confirmation's "Kept: Entries you added or moved since" refers to visible events.
7. **First-run checklist mixes tasks and facts** (Clarity): "Views find Episodes for you" is pre-ticked and "Playlists hold what you'll listen to" is an unticked explanation; only "Add your podcasts" is a task. Fix: tick items only for things the person does (Add podcasts, Play something, Look at a View), and keep the explanations as plain lines under them.
8. **Search isn't the View form** (Clarity, design R): a single field plus Save as View; Played, Podcasts, Length can't be applied to a Search. Fix: show the form's other rows collapsed under the field ("Refine"), as an unsaved View.
9. **200% text truncates the identifying text first** (Typography): Library rows truncate podcast names ("Deep F…") while "4 unplayed" keeps full width. Fix: let the count wrap under the name or shrink to "4" at large text sizes.
10. **Drawer Esc vs Back** (Interaction): Esc on a drawer sub-page closes the drawer; Back returns one page. Make Esc on a sub-page go back to the drawer's main page (as Back does), and Esc on the main page close it.
11. **Rewind confirm + Undo** (Interaction): the Rewind is undoable, yet it also confirms. The confirm is useful because it lists what becomes unplayed; consider showing that list inline under the selected timeline row with a single "Rewind" button, and relying on Undo.
12. **Mac shell details** (Platform fit): Help menu has no "PodList Help"; Controls items aren't dimmed when nothing is loaded or the Episode has no Chapters; the shortcut sheet shows "⌘⇧Z" where its own Mac section and the Mac convention use "⇧⌘Z".
13. **Episode detail "Back"** (Consistency): name the origin ("New this week", "Default") like every other drill-down.
14. **Colour of "current" vs "selected"** (Color): the NOW row tint (#e8edfb) equals the sidebar selection and ticked-row tint; a left accent bar or a slightly different tint for the Cursor row would separate "playing here" from "selected".

## Log

Single audit, no iteration in this round. Drift check: n/a. Character: all five signature elements present and intact (blue for interaction only; Space Grotesk/Inter; dark player and drawer; list navigation for Views and Playlists; plain domain vocabulary).
