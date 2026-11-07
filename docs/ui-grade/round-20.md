# UI grade, round 20

Graded at commit 3aa7f41 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit). An independent read: earlier round reports and the UI-GRADE.md work lists weren't consulted.

Evidence: the flow run at `scratchpad/flows-r20` (summary.md, measurements.json, strips, contact sheets), plus my own probes of the built app (`pnpm --filter @podlist/web build`, `ui-flows/demo.mjs`, seeded and empty) with Playwright Chromium 1.65 on macOS arm64, at 412×915 (mobile, touch), 720×450, 1440×900 and 320×640, and the Electron shell (`packages/desktop`, Electron 44.9.3) launched with `_electron`. Scripts and screenshots are in `scratchpad/grade-r20/` (`shots/`). Measurements are in CSS px at 100% zoom.

## Frame

- **Task:** find Episodes through Views and Search, and listen to them through Playlists, each with its own Cursor and Positions.
- **Target:** a web app (Android-first installable PWA). The Mac app is the same build in an Electron window, so its menus and context menus are judged as part of Platform fit. Mac checklist IDs are N/A → target.
- **Posture:** sovereign on the desktop, all day beside other work. Phone use is short and frequent.
- **Audience:** a perpetual intermediate who listens daily. Expert keyboard paths are offered.
- **Nearest exemplar:** Things, a calm personal tool: one list at a time, actions shown on hover or focus, and a small fixed palette.
- **Character:** (1) Views and Playlists as equal halves, with navigation always as lists (owner-fixed); (2) Space Grotesk headings over Inter text (owner-fixed); (3) one blue, #2b50c8, for interaction and the Cursor (owner-fixed); (4) a dark player bar and Now Playing drawer against a warm off-white page (owner-fixed); (5) dashed-card empty states and plain, domain-exact copy ("Keeps Entries", "Clear on Played", "Rewind to here").
- **Owner decisions:** light appearance only; layout A; the designs chosen in docs/design/ui-layout.md (View editor R, Playlist settings and Rewind C, Library C).

## Flows

- **Tasks run (flow run r20):** browse, listen, now playing, fresh device (catalogue held 2 s), second tab (takeover). Each ran at phone 412×915, zoomed 720×450 and desktop 1440×900, in Light (the only appearance). Service workers were blocked.
- **Timed runs:** 5 runs after a warm-up at desktop width on darwin arm64, unthrottled. "Open a Playlist" p75 was 116 ms and "Play from here" p75 was 103 ms.
- **Script and data:** `packages/web/ui-flows/flows.mjs`; `flows-r20/measurements.json` (72 rows); `flows-r20/strips/<flow>/<width>/`.
- **Lab Web Vitals (my probe, desktop, warm):** LCP was 284 ms on /views/new-this-week, 124 ms on /playlists/default and 92 ms on /library. CLS was 0.008, 0.002 and 0.000.
- **Failures:** none. No core element moved more than 2 px unprompted, and the catalogue that arrived late on the fresh Device (fresh device step 2) filled skeleton rows of the same height with no shift. My extra probes held as well:
  - Search typing during debounced results kept its value.
  - Focus followed the person after removing an Entry on the Playlist page: it went to the next row's Remove.
  - Scroll (500 px) and focus came back after opening an Episode and pressing Back at 720×450.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (list + panel) | Toast above the player, "Marked Played" / "Starred" | none seen | none | Undo in toast; ⌘/Ctrl-Z | Dashed card, "Add podcasts to fill your Views" + link | none | Header trailing: "Next and Last go to" picker, Edit View; row Play | "Every row must match…" under the editor |
| View editor | Live apply, silent | none | none | ⌘Z ("Edits apply as they are made") | n/a | none | Done, panel top trailing (phone: header trailing) | Inline hints under Mentions and rows |
| Search | n/a | none | none | n/a | Dashed card, "Nothing matches / Try fewer or different words"; **empty query: blank results area** | none | Save as View, header trailing | Hint under the field |
| Episode detail | Toast, "Marked Played" + Undo; pressed state on the control | none seen | none | Undo in toast | n/a | none | Play, centre of the action row | none |
| Playlist (Entries) | Toast, "Removed from Workshop" / "Moved “…”" | none seen | none | Undo in toast; ⌘Z | Dashed card, "Nothing here yet" | none | Play / Play this, header trailing | none |
| Listening Timeline | Toast after Rewind | none | **Modal dialog** "Rewind Default to 14:30?" | "You can undo the Rewind afterwards" | Dashed card | none | Rewind to here, row trailing | Intro paragraph |
| Playlist settings | Toast "Moved “Commute” to the Trash" + Undo | none | none | Undo in toast | n/a | none | Delete (bottom) | Field hints |
| Trash | Toast "Restored “Commute”" + Undo | none | none | Undo in toast | Dashed card, "The Trash is empty" | none | Restore, row trailing | Subtitle "kept for 30 days" |
| Library / Subscription | Bulk bar in header; toasts | none seen | **Modal dialog** "Unsubscribe from Market Hours?" (destructive red) | none for Unsubscribe | Dashed card | none | Add podcasts, header trailing | Subtitle |
| Add podcasts / New Playlist | Result row with Subscribe | Inline red text under the field ("Enter the whole address…", "There's already a Playlist called “Commute”.") | none | n/a | n/a | none | Primary button / row Subscribe | Hint under the field |
| Now Playing drawer | Toast above the drawer's bottom edge | none seen | none | Undo in toast | Dashed card, "Nothing after this…" | none | Play, centred | none |
| Second tab | n/a | n/a | n/a | n/a | n/a | Full-page notice + "Use here" | Use here | n/a |

Mismatches:
1. **Where focus goes after an item leaves.** Each screen does something different:
   - Playlist page: the next row's Remove (good).
   - Drawer Up next: the dialog container.
   - Trash Restore: the page h1.
   - First-run Skip: `body` (a failure; see WKEY-03).
2. **Header action edge.** The View and Search headers run to the window edge (Edit View ends at x=1408 at 1440). Playlist, Library, Trash and Episode headers stop at the 960 px content edge (Play ends at x=1152). The same kind of header action sits in two places.
3. Success wording is consistent ("Removed from …", "Moved “…”", "Restored “…”", "Undone: …"), as are error placement (inline under the field, red, with a fix) and empty states (one dashed card). No mismatch.

## Checklist

**Coverage: 96.0%** (pass 96 · fail 1 · N/O 4 · N/A 4; 97 of 101 applicable items have a verdict).
Mac IDs: N/A → target. They are left out of the count.

### Failures by severity

**Major**
- **[WKEY-03] Focus is left on removed content after "Skip for now".**
  - Where: the first-run checklist at the top of Views (desktop and phone; `components/shell/FirstRun.tsx`, `hide()`).
  - Evidence: on an empty Library at 1440×900, activating "Skip for now" unmounts the card and `document.activeElement` becomes `body` (`empty.mjs`, "after skip focus body"). The next Tab starts again at "Skip to content".
  - Fix: in `hide()`, move focus before unmounting, to the screen's `h1` (`tabIndex=-1`, as view changes already do) or to the View list's first row. Do the same for the "Done" variant opened from Settings or Help.

**Minor:** none.

### Notable passes (evidence)

- **BROWSER-01:** Back closes one layer at a time (Add sheet, drawer, drawer pages) and keeps the URL.
- **BROWSER-02:** every meaningful state has a URL: `?tab=history|timeline`, `?episode=` (the side panel), `?edit=true`, `/search?q=`.
- **BROWSER-03:** titles name the view ("Default settings · PodList"; the Mac window drops "· PodList").
- **BROWSER-06:** links, text and fields keep the browser's menu. Row menus copy their commands to visible cells and the More menu.
- **WKEY-01:** the list is an APG grid: one Tab stop, arrows, Home/End, type-ahead, Space ticks, Cmd/Ctrl-A, Cmd/Ctrl-C copies the row's link.
- **WKEY-04:** the focused row never went under the player at 412 or 720 (the closest gap was 40 px above it).
- **WDATA-04:** Undo toasts were still there after 9.5 s and live in a polite region.
- **APPEAR-03:** forced colors keeps every boundary, the Cursor row, progress and selection.
- **APPEAR-04:** no text under 4.5:1 anywhere scanned, the dark drawer included (lowest 7.1:1).
- **APPEAR-05:** under reduced motion the drawer fades (opacity 150 ms) instead of sliding.
- **WTYPE-02:** at 200% root text, nothing overflows horizontally and nothing is clipped.
- **WTYPE-05:** no horizontal scroll at 320 px on any of 12 routes.
- **WTYPE-04:** every undersized target (16 px row checkboxes inside a 40 px label, 21 px title links) meets the spacing exception.
- **WCOPY-01:** ⌘ glyphs appear only on a Mac. Elsewhere it's "Ctrl+", and Ctrl+K is left to the browser.
- **LIST-03, LIST-05, DATA-06:** Library sort toggles and survives a reload, and the "Settings for this podcast" disclosure survives a reload.
- **CTRL-02:** the header checkbox goes indeterminate.
- **DRAG-01:** the OPML input is a visible native file input (472×40), so desktop drops work.
- **DATA-04:** undo toasts come with ⌘/Ctrl-Z, and the Mac Edit menu names the step.
- **RESP-01:** p75 was 103–116 ms.

### N/O
DRAG-05, DRAG-06, FOOT-02 (the demo lists are too short to judge autoscroll or long-list scrolling), START-05 (the `navigator.storage.persist()` prompt is browser-dependent; Chromium grants it silently).

### N/A
TOOL-06 and SIDE-03 (nothing can be hidden), START-06 and START-07 (no accounts).

### All other IDs pass
BROWSER-01–10, WKEY-01/02/04, WDATA-01–04, WCOLOR-01/02, WTYPE-01–05, WCOPY-01, FLOW-01–07, KEY-01/04/06/07/08, DLG-01–05/07/09, CTRL-02–08, LIST-01–07, DATA-01/04/05/06, DRAG-01/03, PTR-03/04, APPEAR-03/04/05/09/10/11, TYPE-02/03/05–08, COPY-01–04, AX-01/02/04/05, START-01–04, EDIT-02/05, WIN-03, SIDE-04, SET-01, RESP-01.

Judgement calls:
- **DLG-01 (pass):** Rewind confirms an undoable action, but it is rare, touches many items and is the owner's chosen design (it previews the effect). Unsubscribe confirms a loss that isn't undoable.
- **KEY-07 (pass):** bare Space plays or pauses instead of scrolling. It is documented and can be turned off in Settings › Keyboard.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | Two faces with fixed roles: Space Grotesk for titles (28 px h1, 20 px drawer title) and Inter for everything else (15 px row text, 13 px meta, 12 px letterspaced caps labels). Nothing under 12 px. Rem-based, so 200% text reflows. Curly quotes and ellipses throughout. Below 9: the Episode title steps through three sizes between phone, panel and page; at 320 px Playlist titles clamp to three lines with ellipses ("The quiet edge of the sola…"); and "Keyboard shortcuts" in the sidebar is set lighter than its siblings with no role to explain it. | hierarchy, craft |
| Hierarchy | **8.6** | One blue primary per screen (Play / Play this / Add podcasts / Done), and the dark player anchors the bottom. Row actions on the desktop appear on hover or focus, as in Things. Below 9: at 1440 the Playlist, Library, Settings, Trash and Episode screens stop at 960 px and leave a 280 px empty strip. The desktop first-run card spans both columns and pushes the "Next and Last go to" panel down to y=425 over an empty list column. Search with no query is 750 px of blank space beside a dense Refine form, which pulls the eye away from the field. | content-first, hierarchy |
| Spacing & density | **8.5** | One 4 px rhythm. Rows are 76 px in Views and 68 px in Playlists, with 44 px targets on the phone and 40 px on the desktop, and edges align under the h1. It reflows from 320 to 1440 with no overlap. Below 9: the two content widths (full width vs a 960 px cap) break the shared trailing edge between screens. The Listening Timeline intro sits only 20 px above its first date heading, against 24–32 px between sections elsewhere. The Library bulk bar makes the header 2 px taller (within tolerance, but against the code's own intent). | craft |
| Color & contrast | **8.9** | Restrained, meaningful palette: the blue means interaction or Cursor, green means Played, amber means Star, red means destructive, and the dark surface means playback. Every measured text pair passes (muted 5.9:1, the drawer's lowest 7.1:1, focus ring 6.25:1). It holds up in forced colors, and `color-scheme: light` is declared. Light only is an owner decision; WCOLOR-01 passes for a single theme. Just short of 9: on the Cursor row the Play button's tint matches the row's accent tint, so the button loses its shape exactly where it matters. | color-restraint, accessibility |
| Iconography | **8.6** | One Lucide set at matching stroke. Every icon-only control has a label and a tooltip that also shows on focus (PTR-04). The 15/30 skip glyphs, speed gauge and moon read at once. Below 9: Next and Last are words in View rows but list-arrow glyphs in Episode detail, where the two are hard to tell apart without labels. The blue dot for the Active Playlist in the sidebar has no visible explanation (it's labelled for screen readers only). | conventions, plain-language |
| Consistency & polish | **8.4** (stability 8.8) | Every state is designed: loading skeletons at row height, dashed empty cards on every list, inline errors, a takeover screen, pressed/hover/focus states, and forced colors. The stability flows have no failures. The sub-score loses points for the focus-after-removal mismatch (Playlist page, drawer, Trash, first run) and the two header edges. Below 9 on polish: the drawer's Up next has no reorder (the design specifies "play-from-here, reorder, Switch Playlist"); the phone player bar has no back 15 (the design lists it); Trash Restore puts the Playlist at the end of the list, not where it was; and in the Electron Controls menu "Play/Pause" never changes its label or dims when nothing is loaded. | craft, stability |
| Clarity | **8.8** | Domain words used exactly and consistently: Entries, Clear on Played, Keeps Entries, Rewind to here, "Next and Last go to". Verbs on buttons, and state is always shown (NOW / RESUME, "Paused" chip, "16:34 left", "Matches 5 Episodes now"). Below 9: the Rewind confirmation promises "what will become unplayed again" in the design, but when nothing will, it doesn't say so. The sidebar dot is unexplained. The empty Search screen offers no starting point. | plain-language, feedback |
| Platform fit | **8.8** (Looks 8.6, Behaves 8.9) | **Web:** real links, URLs for tabs, panels and edit mode, Back that closes overlays one at a time, the browser's own menus on links and text, native selects (Android pickers), OS-aware shortcut hints, Ctrl+K left to the browser, zoom, reflow and forced colors. **Mac shell:** a full menu bar (Settings… ⌘,, File, Edit with named Undo, View, Controls, Go, Window, Help), native row context menus with Look Up, a window titled by the view, bounds restored, and a 720×450 minimum. Below 9: in Electron, ⌘F opens Library Search instead of finding in the current list; "Toggle Full Screen" keeps Electron's label rather than macOS's "Enter Full Screen"; and the Controls menu isn't stateful. The desktop web layout is a narrow 960 px column at large widths. | conventions, stability |
| Interaction & feedback | **6.9** (capped by WKEY-03; ~8.8 uncapped) | A keyboard-fluent grid with type-ahead, bulk ticks and Cmd/Ctrl-A or C. Undo for every edit, with a toast that stays and ⌘/Ctrl-Z. Keyboard reorder announced ("moved to position 2 of 2"). Inline validation keeps input. p75 103–116 ms. Capped: Skip for now drops focus to `body`. Also below 9 uncapped: after removing an Entry in the drawer, focus falls back to the drawer container rather than the next Entry, as the Playlist page does. The row context menu can't be opened from the default (title) cell by keyboard. | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **8.4** | Serves the task very well and is at home in Chrome on Android and in a Mac window. Cap: lowest category 6.9 + 2.0 = 8.9, which is not binding. The weakness holding Overall down most is the one major focus failure, which caps Interaction at 6.9. After it come the unfinished edges between screens: the two content widths, the inconsistent focus rule after removal, and drawer Up next missing reorder. | — |

## Next step

- **Target:** WKEY-03, the only checklist failure (major, in the lowest category).
- **Anti-pattern:** focus lost on removal (the stability failures in anti-patterns.md).
- **Root cause:** removing UI has no shared rule for where focus goes. Each surface decides alone: the Playlist grid does it right, while the first-run card, the drawer queue and the Trash do it differently or not at all.
- **Change:** add one helper, "focus the item that takes its place, else the list or heading of the surface". Use it in `FirstRun.hide()` (focus the screen's h1, or the View list when it has rows), in the drawer's Up next Remove (the next Entry's Remove, else the Now row), and in Trash Restore (the next row's Restore, else the empty card's heading).
- **Principle:** stability, user-control.
- **Expected effect:** Interaction & feedback is uncapped (to about 8.8), and the stability sub-score clears its one mismatch.
- **Afterwards, in order, toward 9.0:**
  1. One content width rule for desktop: either every screen uses the full width with its own side panel, or header actions all stop at the content edge.
  2. Reorder (keyboard and drag) in the drawer's Up next, as designed.
  3. Back 15 on the phone player bar, as designed.
  4. A starting point for an empty Search (for example the latest Episodes, or a few recent queries with Clear).
  5. Keep the Cursor row's Play button visible against the row tint (white or primary fill).
  6. Make the Mac Controls menu stateful (Play or Pause, dimmed when nothing is loaded), and point ⌘F at finding in the current list.
