# UI grade, round 18

Graded at commit 8a7318b ("UI grade round 17"), against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit). This was an independent read: earlier round reports and the UI-GRADE.md work lists were not consulted.

## Frame

- **Task:** find Episodes through Views and Search, and listen to them through Playlists: queue, play, reorder, rewind.
- **Target:** web app, an Android-first installable PWA. The Mac app is the same build in an Electron window (packages/desktop/src/main.ts). Its menu bar and context menus are judged as part of Platform fit.
- **Posture:** sovereign on the desktop (left open all day next to the player), transient-to-sovereign on the phone.
- **Audience:** perpetual intermediate, one owner.
- **Nearest exemplar:** Things, a calm personal tool with list → detail and actions that show on hover or selection.
- **Character:** (1) Space Grotesk headings over Inter body text *(owner)*; (2) a single blue primary, #2b50c8, on a warm off-white ground *(owner)*; (3) a dark navy player bar and Now Playing drawer *(owner)*; (4) Views and Playlists as equal halves, with navigation always shown as lists *(owner, variant A)*; (5) plain-spoken copy in the domain's own words: Entries, Played, Clear on Played, Rewind to here.
- **Owner decisions:** light appearance only; layout A; the fonts; the blue primary; the dark player; View editor R, Playlist settings and Rewind C, Library C. These were scored but are not proposed for change.

## Flows

- **Tasks run:** browse, listen, now playing, fresh device and second tab, at phone 412×915, zoomed 720×450 and desktop 1440×900, in the light appearance only. Late arrivals were held 2 s and service workers were blocked. Script: packages/web/ui-flows/flows.mjs. Run: …/scratchpad/flows-r18 (measurements.json, strips/, contact-*.png).
- **Timed runs:** desktop, 5 runs each after a warm-up, darwin arm64, no throttling. Open a Playlist p75 116 ms; Play from here p75 101 ms.
- **Own probes:** Playwright Chromium 1.65 against the demo server at desktop, phone, 720×450 and 320×700. They covered keyboard order and traps, Back with overlays open, focus after rows are removed, right-click, forced colours, reduced motion, 200 % root text, WCAG text spacing, target sizes, contrast and lab LCP/CLS. The Mac shell was also launched through `_electron` (menus read from `Menu.getApplicationMenu()`). Scripts and screenshots: …/scratchpad/grade-r18/.
- **Failures:** none. No FLOW-01 or FLOW-02 row in measurements.json moves a core element or focus without the person causing it. Lab LCP was 84–340 ms and CLS ≤ 0.011.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | toast, bottom-left of the content column, dark: "Added last in Default" | none | none | Undo in the toast, ⌘Z | dashed card, centred: "Add podcasts to fill your Views" + link | none | Edit View, top-trailing | none |
| Playlist | toast: "Removed from Workshop", "Moved “X”" | none | Rewind: modal with Cancel/Rewind | toast Undo, ⌘Z | dashed card: "Nothing finished yet" | none | Play / Play this, top-trailing | Timeline intro paragraph |
| Playlist settings | toast: "Moved “Workshop” to the Trash" | inline: empty name | none | toast Undo | — | none | (live) | "Saved as you type." under Name |
| View editor | none (live) | none | none | ⌘Z | — | none | Done, top-trailing of the panel | "Every row must match…" under the card |
| Settings | none (live) | none | none | none | — | none | (live) | sub-lines per row |
| Subscription settings (desktop) | none (live) | none | none | none | — | none | (live) | sub-lines per row |
| Search | none | none | none | — | muted line under the field: "Nothing matches · Try fewer or different words" | none | Save as View, top-trailing | hint under the field |
| Add podcasts (sheet) | button turns to "Subscribed" | inline, red, under the field | none | none | hint line | none | Subscribe on each result | hint under the field |
| Trash | toast: "Restored “Workshop”" | — | none | toast Undo | dashed card | — | Restore per row | "kept for 30 days" |
| Now Playing drawer | toast, centred at the drawer's foot | none | none | toast Undo | — | — | Play | — |
| Second tab | — | — | — | — | — | centred: "PodList is open in another tab" + Use here | Use here | — |

**Mismatches**

1. **Settings form layout.** The same kind of row is laid out three ways. Settings and the View editor put the label on the leading side and the control on the trailing side. Subscription settings on the desktop stack the label above a half-width select. Playlist settings stack the label above a full-width field.
2. **Autosave statement.** Only Playlist settings says "Saved as you type." Settings, the View editor and Subscription settings save the same way and say nothing.
3. **Row actions.** In a View, Episode rows show Next · Last · + · Star · Played · Download on hover or focus, then a tinted round Play. On a Subscription page, the same Episode rows show a "⋯" button and a tinted Play, with no hover actions. In a Playlist, rows show a bare blue triangle and ×.
4. **Target-Playlist wording.** One idea gets three labels: "Play Next and Play Last go to" (toolbar), "Next/Last to" (720 px), and "NEXT AND LAST GO TO" (panel heading).
5. **Segmented controls.** The Playlist's Entries/History/Timeline control has content-width segments (links with aria-current). The Add sheet's Search/Feed address/OPML control has equal-width segments (aria-pressed buttons). They look alike but are sized differently.

## Checklist

Coverage: **93.9 %** (pass 90 · fail 2 · N/O 6 · N/A 7; 98 applicable). Mac IDs: N/A → target.

**Failures by severity**

*Blocker:* none. *Major:* none.

*Minor*

- **[COPY-03] The phone back link names the wrong destination.**
  - *Where:* Episode detail, phone.
  - *Evidence:* opened from the "New this week" View, the back link reads "Views" and its `href` is `/views`. Clicking it goes back in history to `/views/new-this-week` (probe1). The label and the link target both name the Views list, but the person lands in a View. "Open in new tab" or "Copy link" gives a different place from the one a click reaches.
  - *Fix:* label the back link with the screen it returns to ("New this week"), and set its `href` to that URL, using the same `cameFrom` that drives the click.
- **[WTYPE-01] The queue badge is 10 px.**
  - *Where:* phone mini-player.
  - *Evidence:* the up-next count renders at 10 px (probe10). The skip icons' "15"/"30" are 11 px.
  - *Fix:* make the badge 12 px with a 16 px minimum circle. The skip numerals are part of the glyphs and can stay.

**N/O:** CTRL-02, CTRL-08, LIST-05, DRAG-05, DRAG-06, FOOT-02. The demo has no mixed-state checkbox tree to check, no download long enough to show progress, and lists too short to test scrolling smoothness.

**N/A:** AX-05 (the audio is the content); START-04, START-05, START-06, START-07 (no permission prompts, no accounts); TOOL-06 and SIDE-03 (no hideable toolbar or sidebar).

**Notable passes**
- **Episode list (KEY-01, WKEY-01, LIST-07).** The View list is an APG grid: one Tab stop, ↑↓ moves between rows, ←→ moves between a row's actions, and it supports type-ahead, Space to select and ⌘A.
- **Focus and overlays (WKEY-03, BROWSER-01).** Back with the drawer open closes the drawer and returns focus to "Open Now Playing". Back with the Add sheet open closes the sheet and returns focus to "Add podcasts". After a row is removed, focus goes to the next row's Remove button.
- **Undo (DATA-04).** Every list edit gives an Undo toast with no timeout, and ⌘Z also works.
- **Toasts (WDATA-04, WKEY-04).** Toasts move inside the drawer's focus trap while the drawer is open, and they reserve space so the controls are not covered.
- **Context menus (BROWSER-06).** Links keep the browser's own menu. Rows get a nine-item menu (native in the Mac app).
- **Forced colours (APPEAR-03).** Every control gets a CanvasText border.
- **Reduced motion (APPEAR-05).** The drawer fades instead of sliding.
- **Contrast (APPEAR-04).**
  - Muted text measures 5.73:1 on the background and 5.34:1 on the accent tint.
  - The player's muted text measures 7.1:1, and its progress bar 5.6:1.
  - Field borders measure 3.57:1.
- **Narrow widths and large text (WTYPE-05, WTYPE-02).** At 320 px there is no horizontal scroll. At 200 % root text no content is lost.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | A deliberate small scale: 28 px Space Grotesk h1, 15 px rows, 13 px metadata, 12 px tracked caps for section labels. Weight and muted colour carry the hierarchy, and the punctuation is typographic throughout. Below 9: the 10 px badge; the phone mini-player wraps the title to two lines and then truncates ("The long life of / a shipping…"), giving three lines of text in a compact bar; at 320 px, Playlist titles clamp to three lines in a column about 150 px wide ("The long / life of a / shipping…"). | `hierarchy`, `craft` |
| Hierarchy | **8.6** | Each screen has one blue primary at the top-trailing corner (Play / Play this / Add podcasts / Done). Row actions appear only on hover or focus, and the side panels recede behind a hairline. Below 9: on desktop Search before any query, the main column is empty except for one hint while the Refine form fills the right panel, so the screen's strongest shape is the filter form, not the results. The Subscription page's right column starts with a 72 px artwork and a one-line blurb before the settings it exists for. | `content-first` |
| Spacing & density | **8.3** | A 4 px rhythm, 44 px phone targets, 40 px desktop actions, and desktop row height suited to a calm list. Craft gaps: (1) the phone gutters disagree. The h1 and Settings cards sit at 20 px, the View editor's cards and labels at 16 px, and Subscription rows have their artwork at 24 px with separators at 16 px. (2) Page measure varies on the desktop: Playlists, Playlist, Library, Settings and Trash stop at about 1150 px and leave about 290 px empty at 1440, while Views and Search use the full width. (3) At 200 % text, the mini-player and the tab bar take about half the phone's height. | `craft`, `hierarchy` |
| Color & contrast | **8.8** | Nearly monochrome. Blue means interactive or current (primary, links, NOW, focus), green means Played, amber means Star. Every measured pair passes, including inside the dark drawer, and forced colours are handled. Below 9: the selected state in the sidebar and tab bar is a 1.07:1 tint that relies on a semibold weight change. A 3:1 edge or bar would make it stand up on its own. Light only, as decided by the owner. | `color-restraint`, `accessibility` |
| Iconography | **8.5** | One Lucide family at matching stroke weight, custom 15/30 skip glyphs, a tooltip on every icon button, and tooltips on focus. Below 9: Play is drawn three ways for related actions (tinted disc in Views, bare triangle in Playlists, solid disc on hover). The "Active Playlist" waveform reads as "playing now" and also shows on an idle, empty Default Playlist at first run. "⋯" appears on Subscription rows and nowhere else. | `conventions`, `craft` |
| Consistency & polish | **8.3** (stability 8.8) | Stability: no FLOW failures at any width, follow-ups arrive above the player, and focus stays put. Every state is designed: hover, focus, pressed, empty, loading skeletons, error, forced colours. Kept below 9 by the five inventory mismatches above (settings row layouts, the autosave note, row action sets, target-Playlist wording, segmented controls). The drawer's Up next also lacks the reorder handles the Playlist page has (the design specifies reordering there). | `craft`, `stability` |
| Clarity | **8.5** | The domain vocabulary is used exactly ("Entries", "Clear on Played", "Rewind to here"). The Rewind confirmation states its consequences, and empty states name a next step. Gaps: COPY-03's back link. Cursor labels differ by state and place: NOW / HERE / RESUME in lists, "Now" in the drawer, and "Resume" offered for the episode already playing in the drawer's Episode page. The "Active Playlist" glyph is unexplained. | `plain-language`, `feedback` |
| Platform fit | **8.8** (Looks 8.9, Behaves 8.8) | **Web.** Every view, tab, editor and selected Episode has a URL (`?tab=`, `?edit=`, `?episode=`, `?q=`). Back closes overlays before it leaves a view. Navigation uses real links, browser menus are kept on links, text and fields, ⌘K applies on a Mac only, zoom and selection are untouched, and the manifest is standalone with in-app Back. **Mac shell.** The menu bar is complete in standard order: Settings… ⌘, Undo with its step named, Controls, Go ⌘1–3 and ⌘[ ⌘], native row context menus with Copy Link and Open in Browser, swipe back, and window bounds restored. Gaps: the back-link `href` mismatch. In the Mac app there is no Episode menu (Star, Mark Played and Download for the selection exist only in the UI and context menu). Settings opens inside the main window. There is no menu command to show or hide the sidebar. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **8.7** | Keyboard-fluent grid. Undo is available everywhere, with ⌘Z labelled in the Mac Edit menu. Reordering works with the keyboard and is announced. Inputs answer within 116 ms (p75), and saving is live with no Save button. Gaps: (1) the drawer queue can't be reordered; (2) the Feed address tab doesn't focus its field when chosen, and the field has no visible submit button until the address resolves; (3) closing the Add sheet discards what was typed (`"deep fie"` was gone on reopen); (4) "Single-key shortcuts" appears in phone Settings, where it does nothing. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **8.6** | It serves the task, and it is at home in Android Chrome and as a Mac window. There are no blockers and no majors; what remains is craft. The weakest categories are Spacing & density and Consistency & polish (8.3), both held down by small cross-screen inconsistencies rather than by anything broken. The 2.0-above-lowest cap (10.3) doesn't bind. | |

## What stands between this build and 9.0

The checklist barely moves the score now: two minor failures. The categories need their craft gaps closed, in this order of payoff:

1. **One settings-row pattern** (Consistency, Spacing). Use the Settings/View-editor layout, label on the leading side and control on the trailing side in a card, for Subscription settings on the desktop too. Say "Changes save as you make them" once per settings surface, in the same place.
2. **One phone gutter** (Spacing). Put every card, row and section label on the h1's 20 px line: the View editor (now 16 px) and Subscription rows (artwork at 24, separators at 16).
3. **One desktop measure** (Spacing, Hierarchy). Either let Playlist, Library, Settings and Trash use the width the way Views do, or cap them all at the same width. Don't mix full-bleed and 1150 px pages.
4. **One Episode-row action set** (Consistency, Iconography). Subscription rows should behave like View rows (hover actions, no "⋯"). Use one Play glyph treatment for "Play now" and "Play from here", or a clearly different one for each.
5. **One name for the target Playlist** (Clarity): "Next and Last go to" everywhere, including the 720 px label.
6. **The drawer Queue gets reorder handles** (Interaction), as the design specifies.
7. **Back link names its destination** (COPY-03), and the queue badge goes to 12 px (WTYPE-01).
8. **Smaller items.** Show the Active-Playlist glyph only while something is loaded, with a tooltip "Active Playlist". Focus the Feed address field when its tab is chosen. Keep the Add sheet's text until it's submitted. Hide "Single-key shortcuts" on touch-only devices. Use one cursor vocabulary (NOW/HERE/RESUME) in the drawer too, and don't offer Resume for the episode that is playing.

## Next step

- **Target:** Spacing & density, one of the two lowest categories, closest to the primary task.
- **Anti-pattern:** inconsistent gutters and measure, which reads as several templates.
- **Root cause:** each screen sets its own inset and max-width instead of sharing page tokens.
- **Change:** use one page-inset token (20 px phone, 32 px desktop) and one content max-width, and apply them to the View editor, the Subscription list and the fixed-width desktop pages.
- **Principle:** `craft`.
- **Expected effect:** Spacing to about 8.7 and Consistency to about 8.5, with no category worse and every signature element kept.
