# UI grade, round 16

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), at commit `86f674e`, without reading earlier rounds. Evidence: the round-16 flow run (`scratchpad/flows-r16`: summary.md, measurements.json, strips) plus my own probes of the built app on the seeded and empty demo servers (Playwright Chromium 1.65, darwin arm64, no throttling, service workers blocked) and the Mac shell launched with `_electron`. Scratch scripts and captures are in `scratchpad/grade-r16/`.

## Frame

- **Task:** keep a listening queue full and play it: find Episodes through Views and Search, put them in Playlists, and listen with the player and Now Playing drawer.
- **Target:** web app, an Android-first installable PWA. The Mac app is the same build in an Electron window (`packages/desktop/src/main.ts`), so platform fit is also judged for a Mac desktop window. Mac checklist IDs: **N/A → target**.
- **Posture:** sovereign on the desktop (sidebar, list, side panel, player bar); transient on the phone (a few taps, then the pocket).
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, for a calm list app with a few actions per row, details revealed on hover or selection, and a small, meaningful palette.
- **Character:** (1) the dark player bar and dark Now Playing drawer against a warm off-white page *(owner)*; (2) Space Grotesk titles over Inter body text *(owner)*; (3) one blue, #2b50c8, for every interactive emphasis *(owner)*; (4) Views and Playlists as equal halves, navigated by lists *(owner, variant A)*; (5) initials-on-colour podcast artwork and plain-spoken status lines ("4 Entries · Clear on Played", "16:34 left").
- **Owner decisions:** light theme only; variant A; Inter and Space Grotesk; blue primary; dark player; View editor R, Playlist settings and Rewind C, Library C. All are scored but not targeted.

## Flows

Five tasks (browse, listen, Now Playing, fresh Device, second tab) at phone 412×915, zoomed desktop 720×450 and desktop 1440×900, in light (the only theme). Late arrivals were held for 2 s. Five timed runs at the desktop width: open a Playlist p75 114 ms, Play from here p75 98 ms. Script: `packages/web/ui-flows/flows.mjs`; measurements in `flows-r16/measurements.json`; strips in `flows-r16/strips/`.

**Failures:** none. All 72 rows hold every core element within 2 px at unprompted steps. The fresh-Device catalogue that arrives late moves nothing (rows `fresh device/*/2`). All caused moves are navigation, such as the phone heading moving 48 px when a back link appears (`browse/phone/2`).

Probes outside the flows:
- **Back and overlays.** On the phone, with the drawer's Up next page open, Back pops Up next, then the drawer, and stays on `/playlists/default` (probe1 A). With the Add sheet open, Back closes the sheet (probe1 J).
- **Focus after rows go.** Removing an Entry moves focus to the next row's Remove button. Mark Played in an Unplayed View moves focus to the next row's Played button. Deleting a Playlist focuses the Playlists heading. Restoring focuses the Trash heading (probe2).
- **Back from an Episode to its list.** On the phone, Views and Subscriptions restore the scroll position and focus the opened title. Search restores the scroll but not the focus (see KEY-04 below).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop and phone) | Dark toast above the player, leading: "Marked Played" | none seen | none | Toast **Undo**, plus ⌘Z/Ctrl+Z | Dashed box: bold line plus sentence and link ("Add podcasts to fill your Views") | none | Top trailing: Edit View (secondary pill); Play per row | Editor footnote "Every row must match…" |
| Search | same toast | none | none | same | "Every word must appear in…" scope line | none | Top trailing: Save as View | Scope sentence under the field |
| Playlist (Entries, History, Timeline) | Toast: "Removed from Default", "Moved “…”" | none | Rewind: modal alertdialog, Cancel / Rewind, focus on Cancel | Toast Undo, ⌘Z; Rewind "can undo afterwards" | Dashed box: "Nothing finished yet" plus sentence | none | Top trailing: Play / Play this (primary blue) | Timeline intro paragraph |
| Playlists, Trash | Toast: "Moved “Workshop” to the Trash" with Undo; "Restored “Workshop”" **without** Undo | none | none (delete is undoable, no confirmation) | Toast Undo | Trash: heading plus sentence | none | Top trailing: New Playlist | "Deleted Playlists are kept for 30 days." |
| Library, Add sheet, Subscription | (subscribe shows "Subscribed" inline) | **Inline under the field**, aria-invalid: "Enter the whole address, starting with https://"; "This address didn't give a podcast feed. Check it, or find the podcast by name with Search." | none | — | — | none | Top trailing: Add podcasts (primary blue) | Help line under each field |
| Player and drawer | — | Inline in the player, `role=alert`: "Couldn't play this Episode." plus Try again | none | Toast inside the drawer's foot | Up next: "Nothing up next. Use Next or Last…" | none | Play/Pause centred | — |
| Second tab | — | — | — | — | — | Full page: "PodList is open in another tab" plus Use here | Use here | — |
| First run | — | — | — | — | Welcome checklist card | none | Add podcasts (primary) | Three numbered steps |

**Mismatches**
1. **Undo by keyboard leaves a stale Undo toast** (Playlist, View, Playlists; every screen with toasts). After ⌘Z the app adds "Undone: Removed from Commute" (4 s) but doesn't close the original "Removed from Commute · Undo" toast. Base UI's one-toast limit only hides it, so it **comes back** about 4 s later, offering to undo something already undone (probe3: t+4 s through t+10 s). Pressing that Undo changes nothing yet says "Undone: Removed from Default" again (probe3b: the list is identical before and after). The same message ends up with two contradictory wordings.
2. **Restore has no Undo** ("Restored “Workshop”"), while every other reversible change offers one. Minor, but it's the only confirmation of its kind without Undo.
3. **First-run card has two dismiss controls** with different names: "×" (*Hide getting started*) and *Skip for now* (P9-*-first.png).

## Checklist

**Coverage: 90.8%** (pass 87 · fail 2 · N/O 9 · N/A 7 of 105 core and web IDs; 98 applicable)

**Failures, most severe first**

- **[KEY-04] major (caps Interaction & feedback at 6.9): Back to Search drops focus 280–533 px above the viewport.**
  - *Where:* `routes/search.tsx:47-49`. It calls `input.current?.focus()` on every mount, including a Back or Forward return.
  - *Evidence:* on the phone, open `/search?q=a`, scroll to 400, open the fifth result, then press Back. The scroll is restored to 400, but focus is on `input "" @20,-280` (probe4). The first probe gave `@20,-533`. The next Tab goes to the Clear button and then the first result, not the Episode the person opened. A screen reader is thrown to the top while the page shows the middle of the list (WCAG 2.4.3). This happens at every width under 64 rem: phone, and the zoomed desktop and the Mac window from 720 to 1023 px. Every other list (View, Subscription) returns focus to the opened title (probe4), so Search is the odd one out.
  - *Fix:* focus the field only when the Search entry is new (no remembered scroll for this history key, or the navigation wasn't a pop). On a pop, restore focus to the title link of the Episode opened from this entry, as the View list already does, falling back to the `h1`.
- **[APPEAR-11] minor: contradictory status after keyboard Undo.**
  - *Where:* `components/feedback/UndoShortcut.tsx:67-77` and `components/feedback/Toasts.tsx`.
  - *Evidence:* probe3 and probe3b, as in mismatch 1. A toast offers Undo for a step that is no longer on the stack, and its Undo reports success while doing nothing.
  - *Fix:* keep the toast id with each undo step. When ⌘Z takes that step, call `toasts.update(id, { description: "Undone: …", actionProps: undefined, timeout: 4000 })` instead of `toasts.add(...)`, or close it. Also make the toast's action a no-op that closes itself when its step has already left the stack.

**N/O:** KEY-06, CTRL-02, CTRL-08, LIST-05, DRAG-05, DRAG-06, PTR-03, DLG-05, WDATA-02

**N/A:** START-04 (no permission prompts), START-05 → START-04, START-06 (no accounts), START-07 → START-06, EDIT-02 (only native fields edit text), TOOL-06 (nothing hideable), SIDE-03 (the sidebar isn't hideable). All Mac IDs: N/A → target.

**Passes worth recording** (evidence for the scores):
- **FLOW-01 to FLOW-07:** flow run, no failures.
- **KEY-01, LIST-07, WKEY-01:** from the skip link through the sidebar, toolbar, rows, panel and player, then back to the skip link with no trap. The rows are a grid: ↓ moves to the next row, → moves between cells, Home goes to the checkbox, End to Play (probe1b F).
- **WKEY-03:** dialogs trap focus and Esc returns it to the opener: the Add sheet returns to "Add … to a Playlist", Rewind returns to "Rewind to here" (probe1b J, probe8).
- **DRAG-01, DRAG-03, AX-04:** Entry reorder works by keyboard (Space, ↓, Space) with the live announcement "moved to position 2 of 4." It also works by mouse drag, and ⌘Z restores the order (probe13).
- **LIST-03:** sorting by Podcast and by Unplayed reverses on a second click (probe13).
- **APPEAR-04, WCOLOR-02:** a computed-contrast sweep of 14 screens at phone and desktop widths, plus the drawer, found **0 text failures** (audit.mjs). The muted text is 5.9:1 on the page, the focus ring is 6.25:1, and the player's muted text is about 7:1.
- **APPEAR-03:** in forced colors, controls, selection, progress and drawer rows keep their boundaries (P5-forced-*.png).
- **APPEAR-05:** with reduced motion, the drawer appears in place with a 0.15 s fade. Otherwise it slides for 0.3 s (probe5 RM).
- **WTYPE-02, WTYPE-05:** at 200% text and at 320 px there is no horizontal overflow and no clipped text, except visually hidden labels (probe5).
- **WTYPE-03:** with WCAG 1.4.12 spacing nothing clips (probe13).
- **WTYPE-04:** every control under 24 px is either inside a 40 px label (`EpisodeRow.tsx:210`) or meets the spacing exception (audit.mjs).
- **BROWSER-01 to BROWSER-04:** Playlist tabs, `?edit=true`, `?episode=` and `?q=` all survive a reload, every page title names its view, and navigation uses real links.
- **BROWSER-06:** right-clicking a link, the h1 or the sidebar keeps the browser's menu. A row's own menu opens only from its empty space, and every command in it is also a visible control (probe1b E).
- **BROWSER-07, WDATA-03:** the feed field is `type=url` with `inputmode=url`. Errors keep the input and set aria-invalid with a described-by message (probe8b).
- **DLG-01:** deleting a Playlist moves it to the Trash with Undo and no confirmation (probe2).
- **RESP-01:** p75 is at most 114 ms.
- **START-02:** first run is a skippable card, and it can be found again in Settings › Help and in the Mac Help menu (P9).
- **Mac shell:** App, File, Edit, View, Controls, Go, Window and Help menus. Edit › Undo names the step ("Undo “Removed from Commute”") and works. There is a native row context menu with Copy Link, Back and Forward from swipes and mouse buttons, a 720×450 minimum window, and saved bounds (electron.mjs).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | One deliberate scale in rem: titles 28 px (30 px from `md`) in Space Grotesk; rows 15 px; meta 13 px; 12 px letterspaced caps labels ("STREAMS · 3", "IN YOUR PLAYLISTS"). Hierarchy comes from weight and #5c6070 secondary text, and type alone tells the structure, as in the Things anchor. Typographic quotes are used throughout ("Moved “Workshop” to the Trash"). Below 9: the Episode detail `h1` drops to about 20 px on desktop, while every other page title is 30 px. The 11 px numerals inside the skip icons are decorative, so they don't fail, but they are the smallest glyphs in the app. | `hierarchy`, `craft` |
| Hierarchy | **8.5** | Each screen has one blue primary at top trailing (Play, Play this, Add podcasts). Chrome is quiet: the sidebar is plain text, and row actions appear only on hover or focus at ≥ 46 rem. The dark player is the strongest shape by owner decision and doesn't compete with list content. Below 9: the desktop View names its target Playlist twice, once in the toolbar ("Play Next and Play Last go to Default (Active)") and again as the side panel's heading ("NEXT AND LAST GO TO Default"). The first-run card's two dismiss controls are equally prominent. | `content-first`, `hierarchy` |
| Spacing & density | **8.3** | A 4 px rhythm. Episode rows are 76 px with a 20 px phone gutter that holds across Views, Search and Playlists, and the desktop rows, panel and toolbar share the 256 px left line. The density suits a calm list app. Below 9: (a) on the phone, Library rows are `rounded-lg border-b` (`routes/library/index.tsx:264`), so each separator curls up at both ends, unlike the straight hairlines of every other list; (b) on desktop Episode detail, the action row is centred in a narrow column and starts 92 px inside the header's left edge, while "In your Playlists" and "Show notes" sit on the edge; (c) content widths differ by screen type at 1440: Playlist, Library and Settings stop at about 900 px or 510 px, leaving the right third empty, while a View uses the full width. | `craft`, `hierarchy` |
| Color & contrast | **8.8** | Restrained and meaningful: blue for everything interactive, including selection, NOW/HERE, progress (lightened to #7f9cf5 on the dark player) and focus; green with a tick for Played; amber for Star; red only for Unsubscribe. No text contrast failures anywhere, the drawer included. Forced colors are handled deliberately. A single theme is the owner's choice and passes WCOLOR-01. Below 9: the selected segment in the Entries/History/Timeline control is white on #ecebe6 (about 1.2:1), so the state relies on text weight and colour. That passes, but it's the weakest state signal in the app. | `color-restraint`, `accessibility` |
| Iconography | **8.7** | One Lucide family at matched stroke weight. Skip icons carry their seconds (15, 30), and the Active Playlist is marked by a waveform with an accessible name. Icon-only buttons have tooltips on hover and on keyboard focus ("Remove from Workshop"). Below 9: the same gear means two different scopes on neighbouring phone screens. On Library it opens the app's Settings; on a Playlist it opens that Playlist's settings. Settings for one podcast are a third pattern, a disclosure row. | `conventions`, `plain-language` |
| Consistency & polish | **8.3** (stability **8.6**) | Every state is designed: hover, focus, pressed, skeletons, empty states, inline errors, offline, the second-tab blocker, forced colors and reduced motion. The flows show no movement. Stability is held below Exemplary by inventory mismatch 1 (a stale Undo toast after ⌘Z) and mismatches 2 and 3. The category also loses for the curled Library separators. At 720×450, Play from Up next leaves the drawer scrolled, so the new Episode's artwork and title are cut off under its top edge (`flows-r16/strips/now playing/zoomed/05`), although the design says starting playback "returns to the drawer's main page". The Episode detail is also misaligned. | `craft`, `stability` |
| Clarity | **8.7** | Specific labels: "Rewind to here", "Play Next and Play Last go to", "Keep deleted Playlists", "Settings for this podcast · Streams". State is always visible: NOW/HERE, "16:34 left", Active, "Paused", the counts. Search states its scope ("Every word must appear in the title, the show notes or the podcast's name"). The Rewind confirmation says what is kept. Below 9: the Listening Timeline's intro is a dense 45-word rule; the editor's "In a Playlist" offers only "Any / Not in any Playlist"; first run has "Hide" next to "Skip"; and the stale "Undo" toast says something untrue. | `plain-language`, `feedback` |
| Platform fit | **8.8** (Looks 9.0, Behaves 8.7) | *Web:* Back unwinds the drawer's pages, sheets and drawer before it leaves a page. Every meaningful state has a URL and survives a reload. Links are real links, the browser menus are left alone, controls are native (selects, `type=url`), shortcut glyphs are per OS (⌘K only on a Mac, `/` everywhere, Ctrl elsewhere), and zoom and text size reflow. The phone has bottom tabs and back links in installed mode. *Mac window:* a full menu bar with live Undo/Redo names, native row menus, swipe navigation, and Settings… on ⌘,. Below 9: Back to Search loses the person's place (the KEY-04 failure). The Episode screen's back control is a `button` (history back), where every other back control is an `a href`. In the Mac shell, ⌘F does nothing (Search is ⌘K only), there's no View › Show/Hide Sidebar, and Episode commands (Play Next, Mark Played, Star) exist only in row menus, not the menu bar. | `conventions`, `stability` |
| Interaction & feedback | **6.9** (capped by KEY-04; about 8.7 uncapped) | Keyboard-fluent: a grid with arrows and Home/End, `/`, Space and ⌘Z/⇧⌘Z with a shortcut sheet (⌘/), and keyboard reorder with live announcements. It's forgiving: delete goes to the Trash, every row change has Undo, and View edits apply live with Undo. It's fast (p75 ≤ 114 ms). Status is announced without moving focus. The cap comes from the Search Back focus defect. The stale Undo toast is the other gap from Exemplary. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **8.4** | It serves the task well and is at home both in Chrome on Android and as a Mac window. The cap is 6.9 + 2.0 = 8.9. The weakness holding Overall down most is the capped Interaction & feedback score (one focus-management defect). Next come the craft gaps that keep Spacing, Hierarchy and Consistency in the mid-8s. | |

## Next step

- **Target:** KEY-04 (major), the only cap, in the lowest category.
- **Anti-pattern:** focus thrown on return ("focus lost after a view change", platform-fit B6).
- **Root cause:** Search focuses its field on every mount, unconditionally. A Back return is a mount, so it overrides the scroll memory and the focus return that the other lists get.
- **Change:** in `routes/search.tsx`, focus the field only when this history entry is new. On a return, focus the opened Episode's title link, using the same mechanism as the View list, or the `h1` if that row is gone.
- **Principle:** `stability`, `user-control`.
- **Expected effect:** lifts the 6.9 cap on Interaction & feedback (to about 8.7) and Platform fit's Behaves half. Overall can then rise to about 8.7.

**What else stands between this build and 9.0**, in order of payoff:
1. **Stale Undo toast after ⌘Z** (APPEAR-11): update or close the original toast, so each message has one wording and an Undo never lies. This raises stability and Clarity.
2. **Drawer at short heights:** after Play from Up next, scroll the drawer to the top (or bring the player column into view), as the design's "returns to the main page" asks. This raises Consistency.
3. **Library phone separators:** drop `rounded-lg` from the row (keep the radius on the hover fill only, as an inset pseudo-element) so separators are straight hairlines like every other list. This raises Spacing.
4. **Episode detail alignment and title size:** left-align the action row with the header block (or centre the whole header over it), and set the `h1` to the 30 px page-title step. This raises Typography and Spacing.
5. **Say the target Playlist once** on the desktop View: keep the toolbar picker and give the panel a plain heading ("Up next in Default"), or drop the picker's prefix. This raises Hierarchy.
6. **One dismiss control on first run** ("Skip for now" or "×", not both), and **Undo on Restore**. This raises Clarity and stability.
7. **Mac shell:** add ⌘F as a second binding for Search, View › Show/Hide Sidebar if the sidebar becomes collapsible, and an Episode menu (Play Next, Play Last, Mark Played, Star) for the focused row. This raises Platform fit for the Mac window.
8. **Content width at 1440:** let Playlist, Library and Settings use the main area as a View does, or centre their column, so wide windows don't show an empty right third. This raises Spacing.

Signature elements: all five kept. No change above touches the owner's palette, fonts, dark player or variant A.
