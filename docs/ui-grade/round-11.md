# UI grade, round 11

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) at commit `a64216b`, without reading earlier rounds. Target: **web app** (Android-first installable PWA). The Mac app is the same build in an Electron window (`packages/desktop/src/main.ts`); its menus and context menus were judged from code and by launching it with Playwright `_electron`.

Evidence: the flow run at `scratchpad/flows-r11` (summary, measurements.json, strips), plus my own probes and screenshots in `scratchpad/grade-r11/` (`shots/`, `probe*.mjs`). Browser: Playwright Chromium (bundled with playwright 1.65.0), headless, darwin arm64, no throttling. Widths: phone 412×915 (DPR 2, touch), zoomed desktop 720×450, desktop 1440×900, plus 320×640, text size 150 % and 200 % (root `font-size` override, the route the browser's font-size setting takes), WCAG text-spacing overrides, `forced-colors: active` and `prefers-reduced-motion: reduce`.

## Frame

- **Task:** find Episodes through Views and queue or play them in Playlists, with the player always at hand.
- **Target:** web app (Android Chrome PWA; Mac desktop window through Electron).
- **Posture:** sovereign on the desktop (an all-day listening companion); a quick-glance, transient posture on the phone.
- **Audience:** perpetual intermediates: podcast listeners who learn the Views and Playlists model once.
- **Nearest exemplar:** Things. A calm personal tool with lists, quiet chrome, one accent, and a strong type hierarchy.
- **Character:** (1) Views and Playlists as equal halves, navigated as lists *(owner-fixed)*; (2) Space Grotesk headings over Inter text *(owner-fixed)*; (3) blue primary #2b50c8 on a warm off-white page *(owner-fixed)*; (4) a dark player bar and dark Now Playing drawer *(owner-fixed)*; (5) plain domain words with capitalised nouns: Entry, Played, Device.
- **Owner decisions:** light appearance only; layout variant A; View editor R; Playlist settings and Rewind C; Library C. Graded, not proposed for change.

## Flows

- **Tasks run** (flow script `packages/web/ui-flows/flows.mjs`): browse, listen, now playing, fresh device (catalogue held 2 s), second tab. Widths: phone, zoomed, desktop. Light appearance only. Measurements in `flows-r11/measurements.json` (72 rows); strips in `flows-r11/strips/`.
- **Timed runs** (desktop, 5 runs after a warm-up, no throttling): open a Playlist p75 133 ms; Play from here p75 115 ms. Both under the 200 ms limit.
- **My probes:** grid keyboarding in a View; remove an Entry and Undo; bulk Mark Played and Undo; the View editor with ⌘Z and reload; Search and Save as View; Add podcasts with a bad and a 404 feed address; delete a Playlist, Trash, Restore; Rewind; the drawer's focus cycle, Esc and Back; the phone Add sheet with Back; scroll restoration; first run on an empty server; 5 lab cold loads (LCP 216–224 ms; CLS 0.004–0.005, with one load at 0.362, see APPEAR-11).
- **Failures:** none of FLOW-01 to FLOW-07. The fresh-device load moves the View heading by 320 px for about 20 ms in some loads. It falls within 500 ms of the navigation, so I count it as a flash (APPEAR-11), not FLOW-01.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Toast, bottom-leading of the main column, dark: “3 Episodes marked Played” | — | — | Toast Undo; ⌘Z toast “Undone: …” | Dashed box, centred title and line: “Add podcasts to fill your Views” + link | — | Edit View, header trailing; Play per row | Subtitle summarises the conditions |
| View (phone) | Toast above the player: “Playing next in Default” | — | Add sheet (bottom sheet) | Toast Undo | Same dashed box | — | Edit, header trailing | — |
| View editor | Live; ⌘Z toast “Undone: Edited ‘…’” | — | — | ⌘Z | — | — | Done, panel header trailing | Footnote: “Every row must match…” |
| Search | — | — | Save as View dialog | — | Dashed box “Nothing matches / Try fewer or different words.” | — | Save as View, header trailing | Scope line under the field |
| Episode detail | Toast | — | Add sheet | Toast Undo | — | — | Play, centred in the action row (wraps in the 400 px panel) | — |
| Playlist | Toast “Removed from Commute” | — | Rewind dialog (centred modal) | Toast Undo; ⌘Z | Dashed box “Nothing here yet”; History “Nothing finished yet” | — | Play / Play this, header trailing | Timeline intro paragraph |
| Playlist settings | Delete → toast “Moved ‘Workshop’ to the Trash” + Undo | Inline under Name | — | Toast Undo | — | — | — (live apply) | Help text under each row |
| Trash | Toast “Restored ‘Workshop’”, no Undo | — | — | — | Dashed box “The Trash is empty” | — | Restore per row | Subtitle “kept for 30 days” |
| Library | Toast | — | Add podcasts dialog | Toast Undo | (not seen) | — | Add podcasts, header trailing | Subtitle |
| Add podcasts | Toast | Inline red text under the field: “This address didn’t give a podcast feed. Check it, or find the podcast by name with Search.” | — | — | “No podcasts found. Try other words.” | — | Enter in the field | Field label explains both inputs |
| Subscription | Toast | — | Unsubscribe | Toast Undo | — | — | Play per row; Mark all Played | Settings rows with help text |
| Settings | Live | — | — | — | — | — | — (live apply) | Help text under each row |
| Missing View / Episode | — | View: dashed box “This View no longer exists / It was deleted on another Device.” Episode: plain line “This Episode isn’t in your Library.” | — | — | — | — | — | — |

**Mismatches**
1. **Settings rows have two layouts.** On Settings (desktop) the label is leading and the select trailing in one row. On the Subscription settings card and the Playlist settings page, the label sits above a full-width control. These are three settings surfaces of the same kind.
2. **Toast wording.** Most confirmations are past tense and name the object: “Moved ‘Workshop’ to the Trash”, “Restored ‘Workshop’”. Two break the pattern: “Playing next in Default” is present tense, and “Removed from Commute” omits the Episode.
3. **Undo is confirmed only one way.** ⌘Z shows “Undone: …”, but the toast's Undo button closes the toast without saying anything (View: bulk Mark Played → Undo).
4. **“Not found” has two forms.** A missing View gets the dashed empty-state box; a missing Episode gets a bare line under Back.
5. **The target panel's empty state** (“Nothing up next. Use Next or Last…”) is plain text, while every other empty state is the dashed box. This one is defensible, because it sits in a side panel.

## Checklist

**Coverage: 93.8 %** (pass 84 · fail 7 · N/O 6 · N/A 8; 97 applicable of 105).
Mac IDs: N/A → target (one line, outside the count). The Electron shell was still checked as part of web platform fit for the desktop window: it has a full menu bar (App, File, Edit with labelled Undo, View, Controls, Go, Window, Help), Settings… at ⌘, and native row context menus fed from `data-row-menu`.

### Failures, by severity

**Major**

- **[BROWSER-04] major. Playlist sections navigate with buttons, not links.** `routes/playlists/$playlistId.tsx:185–212` renders Entries · History · Listening Timeline as `<button aria-pressed>` inside a `<nav>`. Each one navigates to a real URL (`?tab=history`, `?tab=timeline`, which survive reload), but ⌘/Ctrl-click, middle-click, Copy Link and bookmarking don't work, and a screen reader hears “toggle button, pressed” for a destination. *Evidence:* probe8 (`getByRole("tab")` and `link` both fail; `button[aria-pressed]` found; URL changes to `?tab=timeline`). *Fix:* render each as a TanStack `<Link to="." search={{ tab }}>` with `aria-current="page"` on the current one, and keep the pill styling. Leave the Add podcasts sheet's mode switch (`AddPodcastSheet.tsx:376`) as buttons, because it is local state, not a destination.
- **[WTYPE-02] major. Library table column headings collide at larger text.** At 150 % text (Chrome's “Very large” font size) the UNPLAYED heading runs to x = 723 while DOWNLOADS starts at 708. At 200 %, “UNPLAYED” and “DOWNLOADS” overprint (`shots/d-library-text200.png`, `zoom200-_library.png`). The columns have fixed px widths while their text scales in rem. *Fix:* size the columns with `minmax(min-content, …)`, or in rem rather than px. Let the headings wrap (`whitespace-normal`, as “KEEP AT MOST” already does) or abbreviate them. Add a 150 %/200 % font-size case to the flow run.
- **[COPY-02] major (low exposure). The missing-View error guesses its cause and offers no way out.** `/views/nope` shows “This View no longer exists / It was deleted on another Device.” That is false for a mistyped or stale link, and for a View deleted on this Device. The heading reads just “View”, and nothing in the box is a next step (`shots/p-404-view.png`). *Fix:* use “This View isn’t here” / “It may have been deleted, or the link is out of date.” and add an **Open Views** button inside the box. Make the missing Episode use the same box, with **Back** (see mismatch 4).
- **[DATA-06] major. A collapsed section doesn't survive reload.** On the phone Subscription screen, “Settings for this podcast” (`button[aria-expanded]`) collapses again after a reload (probe17/18: open → reload → `aria-expanded=false`). Sort order does persist, in `?sort=unplayed-desc`. *Fix:* keep the expanded state per Device in `lib/remembered.ts`, the same store other per-Device choices use. One key is enough: “subscription settings open”.

**Minor**

- **[APPEAR-11] minor. Every cold load flashes contradictory states for about 20–40 ms before the local database answers.** On a fresh Device (16 of 16 loads) the page shows “Welcome to PodList”, “Add podcasts to fill your Views”, “No Episodes match this View” and the player's “Episode unavailable”, then the real data. When that frame is painted, the heading and list are pushed down 320 px and back (layout-shift entry 0.18 + 0.178, CLS 0.362 on 1 of 5 lab loads; probe12/13). On a returning Device, every reload (6 of 6) still flashes “Episode unavailable” in the player (probe14). *Fix:* add a `loaded` state to the local database atom, separate from “empty”. Until it is true, render the shell with no first-run card, no empty states and no player text: keep the player bar's height with an empty title, not an error.
- **[CTRL-02] minor. “Select every podcast” never shows a mixed state.** With 1 of 3 rows ticked it reads `checked=false indeterminate=false` (probe17). *Fix:* set `input.indeterminate = some && !all` in `LibraryTable.tsx`, and `aria-checked="mixed"` if it is a custom control.
- **[BROWSER-03] minor. Missing pages don't name themselves in the tab.** `/episodes/nope` is titled just “PodList”, and `/views/nope` is “View · PodList”. *Fix:* use “Episode not found · PodList” and “View not found · PodList”.

### N/O
KEY-06, CTRL-08, DRAG-05, DRAG-06, PTR-03, FOOT-02

### N/A
AX-05, START-04, START-05, START-06, START-07, TOOL-06, SIDE-03, LIST-05 (no outline; the one disclosure is recorded under DATA-06)

### Passes worth naming (evidence)

- **Lists and keyboard.** A View is an APG grid with one Tab stop: arrows move between rows and cells, Home and End work, type-ahead (“j” → Joinery), Space ticks, Esc clears, ⌘A, and ⌘C copies the row's link (LIST-07, WKEY-01, EDIT-05). Removing an Entry moves focus to the next row's Remove button (WKEY-03, FLOW-02).
- **Undo.** ⌘Z walks back several steps, including View edits (“Undone: Edited ‘Under 30 minutes’”). Deletes go to the Trash with Undo instead of a confirmation (DATA-04, DLG-01). Rewind is the one confirmation, listing exactly what it changes, with focus on Cancel (DLG-02 to DLG-05).
- **The drawer.** Opening it moves focus in, and Tab cycles 14 controls without escaping. Esc and browser Back close it and return focus to the player bar. Its Queue and Episode pages stack under Back, and Back unwinds them one at a time (WKEY-03, BROWSER-01).
- **Right-click.** Titles keep the browser's link menu; rows get a custom menu with Open in New Tab and Copy Link (BROWSER-06). The Mac app gets native menus.
- **Accessibility settings.** Forced colours is designed: buttons get outlines, links get LinkText (`shots/*-forced-*.png`). Reduced motion removes the drawer's slide (y = 40 at once, against 915 → 109 over 200 ms). Contrast in the dark drawer runs from 5.43:1 to 14.7:1, and no light-page text measured under 4.5:1 (APPEAR-03 to APPEAR-05).
- **Narrow widths.** At 320 px nothing scrolls sideways: the tab label shortens to “Timeline” and the player drops Back 15 (WTYPE-05). Text-spacing overrides clip nothing (WTYPE-03).
- **Shortcuts.** ⌘K is shown only on a Mac and Ctrl+K is left to the browser. Single-key shortcuts can be turned off in Settings. ⌘N does nothing in the browser and stays the browser's (BROWSER-05, WKEY-02, WCOPY-01).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by WTYPE-02; 8.4 uncapped) | Space Grotesk h1 at 28–32 px over Inter at 15 px rows, 13 px meta, and 12 px letterspaced uppercase section labels. Each style has one role, punctuation is typographic (’ “ ” … − →), and tabular times line up. The cap comes from the Library heading collision at 150 %/200 % text. | `hierarchy`, `accessibility` |
| Hierarchy | **8.3** | Squint test passes: title, then rows, then the dark player. Row actions stay hidden until hover or focus, so a View reads as titles. Two things hold it below 9. In the 400 px Episode panel the action row wraps 4 + 3 with Play at the end of the first line, so the centred-Play design is lost (`d-view-episode-panel.png`). In the desktop drawer, the Episode page is a 664 px column hugging the left edge under a centred “Episode” title, with about 750 px of empty dark sheet (`flows-r11/strips/now playing/desktop/06-episode-page.png`). | `content-first`, `hierarchy` |
| Spacing & density | **8.0** | A consistent 76 px row rhythm, shared left edges, and generous spacing that suits the posture. Gaps: about 280 px of dead right gutter on Playlist, Library and Search at 1440 (content capped near 912 px) while the Library headings crowd; 12 px from the Timeline intro to “YESTERDAY” against 24–32 px between sections elsewhere; about 250 px of empty space at the bottom of the phone drawer; and in the desktop drawer, a 340 px gap between the player column and Up next. | `craft`, `hierarchy` |
| Color & contrast | **8.6** | One blue for selection, focus, primary and links, with green for Played, amber for Star and red only for Unsubscribe. Contrast is clean in light, in the dark drawer and in forced colours. APPEAR-11 is minor and doesn't cap. Below 9: on the phone the row's Play goes solid blue whenever focus is in the row (after the Add sheet closes), which reads as “playing”; and the empty-state dashes are barely visible. | `color-restraint`, `accessibility` |
| Iconography | **8.5** | One Lucide set at matching weight, custom 15 and 30 skip glyphs, and labelled icon buttons with focus tooltips. Below 9: the Episode action button labelled “Playing” still shows a play triangle, while the same Episode's Playlist row offers “Pause”, so the icon and the state disagree; and the generic sliders glyph stands for per-podcast settings in the Library table. | `conventions`, `craft` |
| Consistency & polish | **7.8** (stability 8.4) | Every state is designed (hover, focus-visible, pressed, empty, error, forced colours) and the flows hold still. Below 8.5: the five inventory mismatches; the APPEAR-11 load flash; the CTRL-02 checkbox; and after bulk Mark Played the rows leave the View but the bar still says “3 selected”, offering Play Next on invisible items (`d-bulk-played.png`). Stability is 8.4: no FLOW failures at three widths, follow-ups land in space kept above the player, but the load flash and the message mismatches keep it out of Exemplary. | `craft`, `stability` |
| Clarity | **6.9** (capped by COPY-02; 8.5 uncapped) | Plain domain words (“Clear on Played”, “Rewind to here”, “Next and Last go to”). State shows as NOW/HERE, the Active wave icon, and Played with a tick and text. The cap comes from the missing-View message. Also below 9: the “Playing”/“Pause” contradiction, and the phantom “3 selected”. | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped by BROWSER-04; Looks 8.8, Behaves 8.4, formula 8.5) | Real links in the sidebar and rows; URLs for the selected Episode, edit mode, search, sort and tab; Back unwinds overlays; titles track the view; the browser's menus and shortcuts are respected; installed-mode Back is supplied. The Electron shell has a complete Mac menu bar and native context menus. The cap comes from the Playlist section buttons. | `conventions`, `stability` |
| Interaction & feedback | **6.9** (capped by DATA-06; 8.8 uncapped) | Keyboard-fluent grid, a shortcut reference, multi-step ⌘Z, Undo in place of confirmations, live-applied edits that survive reload, keyboard reorder with live announcements (“moved to position 2 of 3”), and p75 responses of 115–133 ms. The cap comes from the phone disclosure that doesn't survive reload. | `keyboard-efficiency`, `forgiveness` |
| **Overall** | **7.6** | It serves the task well and is at home in the browser and on the Mac. Four categories are each capped at 6.9 by one specific defect (BROWSER-04, WTYPE-02, COPY-02, DATA-06); uncapped, the app sits around 8.4–8.5. The biggest drag is those four caps; after them, the desktop drawer and Episode-panel layouts. The ceiling is 8.9 (6.9 + 2.0). | — |

### What stands between this build and 9.0

1. **Clear the four caps.** These are small, local changes: links for the Playlist sections, fluid Library columns, honest not-found copy, and one remembered disclosure. Typography, Clarity, Platform fit and Interaction would then score on their merits, about 8.4–8.8.
2. **Craft gaps that keep categories below Exemplary.**
   - **Episode panel action row.** Seven 48 px circles don't fit the 400 px panel, so they wrap 4 + 3. Use 7 × 44 px columns at a 12 px label size (about 360 px), or two deliberate rows with Play centred alone on the first.
   - **Desktop drawer, Episode page.** Centre the column (`max-w-[720px] mx-auto`) under the centred title, or reuse the main page's two-column split: detail on the left, Chapters on the right.
   - **Desktop drawer, main page.** Close the 340 px gap: centre the player in the space left of the 360 px Up next column. On the phone drawer, centre the controls block vertically or anchor it to the bottom.
   - **One settings-row layout.** Settings, Subscription settings and Playlist settings should share one layout at each width.
   - **Toasts.** Past tense with the object named (“Added ‘Who sets the price of rice?’ to play next in Default”, “Removed ‘Inflation…’ from Commute”), and the toast's Undo button answers “Undone: …” as ⌘Z does.
   - **Bulk selection.** Prune it to rows still in the View after an action that removes rows, or say “3 selected (2 hidden)”.
   - **Playing and Pause agree.** On the Episode action row, show a pause glyph (or the equalizer) with “Pause”.
   - **Subscription screen.** Drop the podcast name and artwork from every row meta on the podcast's own page. On the phone, put the artwork beside the title, not as a separate band.
   - **Timeline.** Put 24 px above the first date heading. Hide or merge zero-length listen events (“12:34 → 12:34”).
   - **First run (desktop).** Shrink the empty-state box to its content, and drop its duplicate “Add podcasts” link while the welcome card shows one.
   - **Phone rows.** Don't fill the row's Play button on `focus-within` (or only on `:focus-visible`), so it doesn't read as “playing”.

## Next step

- **Target:** BROWSER-04, the major failure in a category capped at 6.9 and the one closest to the primary task (Playlists).
- **Anti-pattern:** navigation by script-only clicks (anti-patterns: web B3).
- **Root cause:** the section switch was built as a segmented toggle (state), though each segment is a URL destination.
- **Change:** `<Link to="." search={value ? { tab: value } : {}} aria-current={tab === value ? "page" : undefined}>` in place of `<button aria-pressed>`, keeping the classes, keyed on `aria-[current=page]:` instead of `aria-pressed:`. Keep focus on the link after a plain click.
- **Principle:** `conventions`.
- **Expected effect:** Platform fit can reach about 8.5 (formula). No other category should regress. Then fix WTYPE-02, COPY-02 and DATA-06, in that order.
