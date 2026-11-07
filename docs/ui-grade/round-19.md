# UI grade, round 19

Commit `bf2bd0c`, graded 8 Nov 2026 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), as a **web app**. This read is independent: earlier rounds and the work lists in UI-GRADE.md were not consulted.

Evidence: the flow run at `scratchpad/flows-r19` (summary, measurements.json, strips), plus my own probes of the built app on the demo server (Playwright Chromium 158.0.8127.18, darwin arm64, no throttling, service workers blocked, light appearance), and the Mac shell launched with Playwright's `_electron`. Scripts and screenshots: `scratchpad/grade-r19/` (`shots/`, `probe*.mjs`, `audit.mjs`, `electron.mjs`). Sizes are CSS px at 100% zoom.

## Frame

- **Task:** choose what to hear (Views find Episodes; Playlists hold them) and listen, picking up where you left off on any Device.
- **Target:** web app, an Android-first installable PWA; the macOS app is the same build in an Electron window, so its menus and context menus are judged as part of Platform fit.
- **Posture:** sovereign on the desktop (a sidebar app left open all day), transient-to-sovereign on the phone (open, pick, play, pocket).
- **Audience:** perpetual intermediates who listen daily.
- **Nearest exemplar:** Things (a calm personal tool: one list, its title and items, actions on hover), with BBEdit's keyboard-and-menu thoroughness as the bar for the Mac shell.
- **Character:** (1) warm off-white canvas `#f6f5f2` with one blue primary `#2b50c8` *(owner)*; (2) Space Grotesk headings over Inter text *(owner)*; (3) the dark player bar and dark Now Playing drawer *(owner)*; (4) letter-tile Artwork and the NOW/HERE Cursor marker on Entry rows; (5) plain-spoken copy with the domain nouns capitalised (View, Playlist, Entry, Episode).
- **Owner decisions:** light appearance only; layout variant A (Views and Playlists as equal halves, list navigation); Inter and Space Grotesk; blue primary; dark player bar; View editor R, Playlist settings and Rewind C, Library C. All are graded; none is proposed for change.

## Flows

Tasks run (flow run r19): browse, listen, now playing, fresh device (catalogue held 2 s), second tab · widths phone 412×915, zoomed desktop 720×450, desktop 1440×900 · light only (dark isn't designed) · timed runs: 5 after a warm-up at desktop, darwin arm64, no throttling · script `packages/web/ui-flows/flows.mjs` · `flows-r19/measurements.json` · `flows-r19/strips/<flow>/<width>/`.

Timed (p75): open a Playlist 130 ms; Play from here 113 ms. My lab Core Web Vitals, 5 loads each: desktop `/views/new-this-week` LCP 188–316 ms, CLS 0.004; phone `/playlists/default` LCP 184–360 ms, CLS 0.

Failures: **none** for FLOW-01 to FLOW-07. Every core element (heading, navigation, player, main action) holds within 2 px through every step at every width, including the unprompted catalogue arrival (`fresh device` rows: all `dy 0`).

One non-core shift, recorded under APPEAR-11: on the fresh device, the Entry skeletons are one line tall but the loaded rows are two, so the NOW row moves down 44 px when the catalogue arrives (strip pair `fresh device/phone/01-open-default.png` → `02-catalogue-arrives.png`: NOW row top 406 → 450).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (Episodes + target panel) | Toast above the player, bottom-leading on desktop, above the mini-player on phone; dark; "Verb … " | none observed | none | Undo in the toast; ⌘Z/Ctrl+Z with "Undone: …" toast | Dashed card in the list: "Add podcasts to fill your Views" + link; panel: plain muted sentence "Nothing up next…" | none | Edit View (header, trailing); Play per row (trailing) | Filter summary under the title |
| View editor | Live: "Matches 5 Episodes now" under the title | none | none | ⌘Z (edits apply live) | n/a | none | Done (header, trailing, blue) | "Every row must match…" under the conditions |
| Search | Count + rule line under the field | none | none | — | (before typing) rule line only | none | Save as View (header, trailing) | Rule line under the field |
| Playlist (Entries/History/Timeline) | Toast "Removed from Commute · Undo" | none | Rewind: modal, "Rewind Default to 14:30?", Cancel/Rewind | Toast Undo; ⌘Z | (not seen) | none | Play / Play this (header, trailing, blue) | Timeline intro paragraph |
| Playlist settings / Trash | Delete: toast "Moved “Workshop” to the Trash · Undo"; Restore: toast "Restored “Workshop” · Undo" | inline under Name ("A Playlist needs a name.") | none | Toast Undo | Trash: sentence | none | none (live apply) | Row help under each label |
| Library / Add podcasts | "Subscribed to …" toast (4 s); sheet row turns to Subscribed | inline under the field, sentence with a way on ("Check it, or find the podcast by name with Search.") | none | — | Dashed card "No Subscriptions yet" | none | Add podcasts (header, trailing, blue) | Help line under each field |
| Subscription | Live apply | none | none | — | n/a | none | none | Help under each setting |
| Player / drawer | — | Inline in the bar: "Couldn’t play this Episode." + Try again | none | Toasts move inside the drawer's foot | Up next: plain sentence | none | Play/Pause (centre) | — |
| Second tab | — | — | — | — | — | Full page "PodList is open in another tab" + Use here | Use here | one sentence |

Mismatches:
1. **Empty states take two forms**: a dashed card in main lists (View, Library) but a bare muted sentence in the target panel and the drawer's Up next. Screens: View, Library vs target panel, drawer. Minor.
2. **Episode rows surface their actions two ways**: in a View, Next · Last · Add · Star · Played · Download appear on hover/focus with no More button; in a Subscription the same rows show an always-visible "…" More button and no hover row. Same component, same kind of list. Screens: View, Search vs Subscription (`shots/desktop-view.png`, `probe-bulk.png` vs `desktop-subscription.png`). Minor.

No mismatch in wording or colour of confirmations, errors or Undo: every confirmation is the same dark toast in the same place, with Undo where the action can be undone and no timer on it.

## Checklist

Coverage: **97.0%** (pass 94 · fail 2 · N/O 3 · N/A 6). Mac IDs: N/A → target (not counted).

### Failures by severity

**Major**

- **[APPEAR-03] The Active Playlist mark disappears in forced colours.** Where: desktop sidebar, Playlists list. Evidence: the waiting-state mark is a `span.size-2.rounded-full.bg-primary` (`AppShell.tsx:437–441`); forced colours repaint backgrounds, so with `forced-colors: active` the dot is gone and "Default" looks like every other Playlist (`shots/fc-desktop-view.png`, `fc-desktop-playlist.png` vs `desktop-view.png`). The screen-reader name survives; the visible state doesn't. Every other state mark checked survives (progress bars, scrubber, queue badge, NOW, selected rows). Fix: draw the dot so forced colours keep it, e.g. an inline SVG `<circle fill="currentColor">` with `text-primary`, or add `forced-colors:bg-[CanvasText]` (or `forced-color-adjust:none` on that one element only); then grep for other `rounded-full bg-*` marks with no text.

**Minor**

- **[APPEAR-11] Fresh-device skeleton rows are shorter than the rows that replace them.** Where: Playlist Entries on the phone while the catalogue arrives. Evidence: skeleton rows are one text line; loaded titles wrap to two at 412 px, so the rows below grow and the NOW row moves down 44 px (strip pair above). Core elements hold, so it isn't FLOW-01. Fix: give the skeleton title two bars on narrow widths (the player bar's `TrackTitle` already does this with a `@max-[9rem]` second line), or reserve `min-h` equal to a two-line row.

### N/O
DRAG-05, DRAG-06, FOOT-02 (pointer drag visuals and autoscroll weren't exercised; the demo lists are too short to judge long-list scrolling).

### N/A
LIST-05 (no outlines), START-05 (no permission prompts), START-06 and START-07 (no accounts), TOOL-06 (no hideable toolbar), SIDE-03 (the sidebar can't be hidden).

### Passes worth recording (evidence)
- KEY-01, KEY-04, WKEY-03: 2 px `#2b50c8` rings (white on the dark bar); the drawer traps Tab, Esc closes it and returns focus to the bar; Back closes drawer pages one at a time without changing the URL; dialogs focus their field and return focus on Esc; after every in-app navigation focus lands on the new `h1`.
- WKEY-03 after removal: removing an Entry with the keyboard moves focus to the next row's Remove; removing the last moves it to the previous; ⌘Z restores the row with "Undone: …".
- LIST-07, WKEY-01: the View Episode list is one Tab stop with arrows, Home/End, PgUp/PgDn, type-ahead, Space to select, Shift-arrows, ⌘A; Entries reorder by keyboard (Space, arrows, Space) with announcements, and ⌘Z reverses it.
- BROWSER-01/02/03: search words, refinement, sort, edit mode, the open Episode and the Playlist tab are all in the URL and survive reload; titles name the view ("Default Listening Timeline · PodList"); scroll position survives reload and Back.
- BROWSER-06: links and text keep the browser's menu; rows get a task menu (Play Now, Play Next in Default, … Copy Link) whose commands are also behind the row's actions and More button. In the Mac app the same menus are native.
- APPEAR-04: an automated sweep of every text node on 14 screens at three widths found no ratio under 4.5:1 (3:1 large); the dark drawer's lowest is 5.43:1.
- APPEAR-05: with `prefers-reduced-motion`, no element keeps a transform transition.
- WTYPE-05/WTYPE-02: no horizontal scroll at 320 px on any screen; at 720×450 (200% zoom) and with a 200% root font size every screen keeps its content (the bar's Speed and Sleep move into the drawer).
- WDATA-01/04: View edits apply live and survive reload; Undo toasts have no timer; status toasts that fade repeat what is visible elsewhere.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | A small, role-mapped scale: 28 px Space Grotesk titles, 15 px Inter rows, 13 px metadata in secondary grey, 12 px letterspaced caps for section labels (TYPE-07), curly quotes and real ellipses throughout (TYPE-08). Below Exemplary: the phone mini-player gives the title about 100 px, so it clamps to two lines with an ellipsis and the second line reads "Market Hours ·…" with a dangling separator (`shots/phone-view.png`); at 320 px metadata separators start lines ("· 45 min", `n320-view.png`). | `hierarchy`, `craft` |
| Hierarchy | **8.6** | Squint test passes everywhere: title, then the list, with one blue primary per screen (Play, Done, Add podcasts) and the dark player as the one heavy shape. Below Exemplary: on a first-run desktop the welcome card sits above the page `h1` and pushes it 330 px down, and "Add podcasts" appears twice on each first-run screen (card and empty state on a View; card and page header on Library) (`firstrun-desktop.png`, `library-empty-desktop.png`); "Next and Last go to" is said twice on a View, in the toolbar picker and again as the panel's eyebrow (`desktop-view.png`). | `content-first`, `hierarchy` |
| Spacing & density | **8.4** | One 4/8 rhythm, 20 px phone gutter, rows 76 px on desktop, grouped settings cards with hairline dividers; density suits a calm personal tool. Held back by inconsistent content widths on desktop: the View reaches the right gutter (1408), Playlist and Library stop at about 1160, the Subscription settings column at 1290, Settings at 895, so the right edge wanders screen to screen (`desktop-*.png`); the phone Add podcasts sheet is 85% of the screen tall with two-thirds of it empty (`add-sheet-phone.png`). | `craft`, `hierarchy` |
| Color & contrast | **6.9** (capped; 8.8 uncapped) | Restrained and meaningful: one blue for interaction, selection and the Cursor; green for Played, amber for Star; every text pair passes (sweep above), the dark drawer at ≥5.4:1, and forced colours mostly hold. Capped at 6.9 by APPEAR-03 (the Active Playlist dot vanishes in forced colours). In forced colours the phone row's Play and Remove outlines touch and the selected bottom tab draws two outlines (`fc-phone-playlist.png`). | `color-restraint`, `accessibility` |
| Iconography | **8.7** | One Lucide family at the text's stroke weight, custom skip icons with legible 15/30 numerals, every icon-only control has a tooltip on hover and focus and an accessible name. Below Exemplary: the funnel for Views is a stretch for "saved lists", and the row's plain "+" (Add to a Playlist) sits beside a "Next/Last" pair, so two of three add actions are words and one is a glyph. | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability 8.8) | Every state is designed (hover, pressed, focus, selected, disabled, skeleton, empty, error, offline, second tab), the same toast and Undo everywhere, no FLOW failures at any width. Below Exemplary: the two inventory mismatches (empty-state forms; View rows vs Subscription rows), APPEAR-11's skeleton height, and duplicate Playlist names accepted silently (a second "Commute" appears beside the first, `newplaylist-dup.png`). Stability 8.8: flows clean, one non-core 44 px shift, two minor mismatches. | `craft`, `stability` |
| Clarity | **8.6** | Plain, specific labels ("Play Next in Default", "Rewind Default to 14:30?", "Every row must match. Rows left at “Any” don’t narrow anything."), state always visible (NOW/HERE, Paused chip, "(narrowed)"). Below Exemplary: Default's settings say "Default" three times (back link, subtitle, disabled field) (`desktop-playlist-settings.png`); duplicate Playlist names make the sidebar and the "Next and Last go to" picker ambiguous; the Add sheet's Search field says "Podcast name, or a feed address" beside a separate Feed address tab. | `plain-language`, `feedback` |
| Platform fit | **8.8** (Looks 8.7, Behaves 8.9) | Web: real links, URLs for every meaningful state, Back closes overlays before leaving a view, browser menus on links and text, native fields with the right `type`/`inputMode`, OS-correct shortcut hints, installed-mode navigation. Mac shell: full menu bar (App, File, Edit with named Undo, View, Controls, Go, Window, Help), ⌘, Settings, native row context menus, window titled by the view and its bounds remembered. Below Exemplary: the Search refinement URL is double-encoded JSON (`?f=%22%7B%5C%22filter%5C%22…`), unreadable to share; the Mac Go › Back/Forward items are never dimmed when there's nowhere to go; no drop target for an OPML file beyond the small native file input. | `conventions`, `stability` |
| Interaction & feedback | **8.8** | Keyboard-fluent (list grid, type-ahead, keyboard reorder, ⌘/ reference, single-key shortcuts with an off switch), forgiving (Undo on every destructive step, Trash, Rewind undoable), instant (p75 113–130 ms, LCP < 0.4 s). Below Exemplary: the drawer's Up next can't be reordered though the design calls for it (`NowPlayingDrawer.tsx` has no sortable list); the phone's Refine disclosure forgets that it was open on reload; the feed-address error isn't tied to its field (`aria-invalid` false, `aria-describedby` points only at the help line). | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **8.5** | It serves the task well and is at home in the browser and in a Mac window; nearly every check passes with evidence. The cap from one forced-colours dot keeps Color & contrast at 6.9 (Overall may not exceed 8.9); holistically the app sits in the upper Strong band, held below 9.0 by a layer of small craft gaps listed below, none severe, spread across the phone player, desktop widths and secondary flows. | — |

## Next step

- **Target:** APPEAR-03 (major), in the lowest-scoring category, Color & contrast.
- **Anti-pattern:** state drawn with a background colour alone, which forced colours erase.
- **Root cause:** the Active Playlist's waiting mark is a background-coloured span with no forced-colours variant.
- **Change:** render the mark as `<svg viewBox="0 0 8 8" class="size-2 text-primary"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>` (or add `forced-colors:bg-[CanvasText]`), keeping `role="img"` and its label; then sweep for other background-only marks.
- **Principle:** `accessibility`.
- **Expected effect:** lifts the cap; Color & contrast to about 8.8, Overall's cap to 10.

### What else stands between this build and 9.0 (craft, in order of reach)

1. **Phone mini-player text** (primary task, every phone screen): the title gets ~100 px and the second line ends "Market Hours ·…". Truncate the Playlist name, not the separator (separate spans, `·` inside the trailing span), or show only the podcast in the bar since the drawer names the Playlist; let the title use one line plus a full second line rather than clamping both.
2. **One content width on desktop**: pick one max width (or full width) for list screens and apply it to View, Search, Playlist, Library and Subscription, so the header actions and the right edge line up from screen to screen.
3. **Skeletons that match**: two-line skeleton titles on narrow rows (APPEAR-11).
4. **One row-action pattern**: give View rows the same "…" More button as Subscription rows (keeping hover actions), or drop it from Subscription rows.
5. **Up next reorder in the drawer**, as `docs/design/ui-layout.md` specifies, reusing `SortableList`.
6. **Readable refinement URLs**: encode the Search refinement as plain params (`played=unplayed&sort=newest`) instead of JSON-in-JSON; remember the Refine disclosure's open state.
7. **Names that identify**: refuse or flag a duplicate Playlist name ("You already have a Playlist called Commute") in the New Playlist dialog and Settings.
8. **First run on desktop**: put the welcome checklist below the page heading (or in the empty list's place) and drop the duplicate "Add podcasts" in the empty state while the checklist shows.
9. **Small text joins**: keep metadata separators with the following item (`white-space: nowrap` on "· 45 min"), associate the feed-address error with its field (`aria-invalid`, `aria-describedby`), remove the repeated "Default" subtitle on Playlist settings, and dim Go › Back/Forward in the Mac menu when history can't move.
10. **Forced-colours finish**: a gap between adjacent outlined icon buttons (Play and Remove) and a single outline on the selected bottom tab.
