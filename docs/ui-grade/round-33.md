# UI grade, round 33

Build: `b0dd3a7` (worktree `agent-a22c3476b7b2a68e8`). Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) as a **web app**: an Android-first installable PWA, also shipped as the same build in an Electron window on the Mac (`packages/desktop/src/main.ts`). Graded independently: earlier round reports and the UI-GRADE.md work lists weren't read.

Evidence: the flow run in `scratchpad/flows-r33` (summary, measurements.json, strips), plus my own Playwright probes (Chromium 1.65 headless, macOS arm64, no throttling, service workers blocked) against `ui-flows/demo.mjs`, seeded and empty. Probe scripts and screenshots are in `scratchpad/grade-r33/` (`shots/*.png`). The Mac shell was launched with Playwright `_electron` (`grade-r33/electron.mjs`).

## Frame

- **Task:** find Episodes through Views, queue them into Playlists, and listen, with the player always at hand.
- **Target:** web app (PWA on Android Chrome, standalone display; the same build in a Mac Electron window).
- **Posture:** sovereign on desktop, and a frequently revisited transient on the phone (pick up, play, put down).
- **Audience:** perpetual intermediate, a podcast listener who builds their own Views.
- **Nearest exemplar:** Things, for its calm lists, one accent and keyboard fluency. It's a reference for craft, not a look to copy.
- **Character:** (1) warm off-white ground `#f6f5f2` with a single blue primary `#2b50c8`*; (2) Space Grotesk headings over Inter UI text*; (3) a dark player bar and dark Now Playing drawer*; (4) Views and Playlists as equal halves, with navigation always a list and never capsules*; (5) square initial-tile artwork and plain-spoken domain words: View, Playlist, Entry, NOW/HERE/RESUME. *Fixed by the owner.
- **Owner decisions** (scored, not targeted): light theme only; layout variant A; Inter and Space Grotesk; blue `#2b50c8`; dark player bar; View editor R; Playlist settings and Rewind C; Library C.

## Flows

- **Tasks run:** browse, listen, now playing, fresh device, second tab (flow run), at phone 412×915, zoomed 720×450 and desktop 1440×900, in the Light appearance (the only one). There were 5 timed runs at desktop. The script is `packages/web/ui-flows/flows.mjs`, the measurements are `flows-r33/measurements.json`, and the strips are `flows-r33/strips/*`.
- **Timed (p75):** open a Playlist 117 ms; Play from here 101 ms. Lab Core Web Vitals (my probe, `cwv.mjs`): LCP 36–284 ms, CLS 0.000–0.004.
- **Extra probes:**
  - keyboard and focus: Tab order, the APG grid, remove → focus → ⌘Z, keyboard reorder;
  - Back with the drawer, sheets and menus open (phone);
  - scroll restoration on Back and reload; right-click and Shift+F10/ContextMenu menus; ⌘C row copy;
  - forced colors with reduced motion; 200% root font; 320 px; WCAG 1.4.12 spacing;
  - a contrast and target-size sweep (`audit.mjs`, `probe.mjs`) including both dark drawers;
  - first run with an empty Library; Add podcasts (search, bad and good feed address);
  - View editor edits, Undo, delete; Playlist delete → Trash → Restore; Rewind confirmation; Unsubscribe;
  - persistence across a closed and reopened browser profile (`persist.mjs`); Electron menus and window.
- **Flow failures:** none. FLOW-01 to FLOW-04 hold at all three widths: no core move without a cause, and late catalogue arrival fills skeleton rows in place (`contact-fresh-device.png`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop and phone) | dark toast above player, left-aligned to content: "Edited “X”", "Deleted “X”" | — | — | toast Undo, ⌘Z | dashed card, centred | — | Play per row (blue disc); Edit View top-right (grey) | — |
| Views list (phone) | — | — | — | — | first-run card | — | "New View" top-right, **grey** | first-run checklist |
| Playlist | toast "Removed “X” from Default", Undo | — | — | toast Undo, ⌘Z | dashed card "Nothing here yet" with link | — | "Play"/"Play this" top-right, **blue** | intro line on Timeline |
| Playlists list (phone) | — | — | — | — | — | — | "New Playlist" top-right, **grey** | — |
| Listening Timeline | toast after Rewind | — | alertdialog "Rewind Default to 14:30?" Cancel/Rewind, plus ✕ | toast Undo | dashed card | — | Rewind to here on every row | paragraph above the list |
| Playlist settings | (saved as you type: inline hint) | — | — | toast Undo after Delete | — | — | Delete Playlist (red text) | inline hints |
| Trash | toast "Restored “X”", Undo | — | — | toast Undo | dashed card | — | Restore per row (grey) | "kept for 30 days" line |
| Library | toast | — | — | toast Undo | — | — | "Add podcasts" top-right, **blue** | — |
| Subscription | toast "Marked Slow Build Played", Undo | — | alertdialog "Unsubscribe from Slow Build?" | toast Undo | — | — | Mark all Played (grey), Unsubscribe (red text) | per-setting hints |
| Add podcasts sheet | "Subscribed" in the row | inline red under field, with a recovery | — | — | — | — | Subscribe (blue) per result | hint under the field |
| Search | — | — | — | — | dashed card "Nothing matches" | — | Save as View top-right (grey) | hint under field |
| Settings | — (live apply) | — | — | — | — | — | — | per-row hints |
| Drawer | toast in a strip at the drawer's foot | — | — | toast Undo | — | — | Play/Pause | — |
| Any (second tab) | — | — | — | — | — | full-page "PodList is open in another tab" + "Use here" | — | — |

**Mismatches**
1. **Create-action emphasis:** "Add podcasts" (Library) is filled blue, while "New View" (Views) and "New Playlist" (Playlists) are grey secondary. These are the same kind of action in the same top-right slot, at two weights.
2. **Defaults in podcast settings** (Subscription, desktop and phone): "Played: Default (30 seconds)" names the inherited value, but "Speed", "Skip intro", "Skip outro" and "Volume boost" say only "Default".
3. **Back as a dismiss gesture:** sheets, dialogs and the drawer stack close on Back (`useBackLayers`), but popup menus (the row "…" menu, Speed, Sleep) don't. This is the BROWSER-01 failure below.

Everything else lines up: one toast place and voice ("Verb-ed “Name”" + Undo), one empty-state form, inline errors under fields, and red only for destruction.

## Checklist

Mac IDs: **N/A → target** (the web checklist governs the shared build; the Mac shell is noted under Platform fit).

**Coverage: 94.9%** (pass 93 · fail 1 · N/O 5 · N/A 6; 99 applicable).

### Failures by severity

**Major**

- **[BROWSER-01] Back with a popup menu open leaves the screen instead of closing the menu.**
  - **Where:** phone. The Entry row "…" menu on a Playlist; Speed and Sleep menus in the Now Playing drawer. The same applies to any Base UI `Menu` not registered with `lib/backLayers.ts`.
  - **Evidence:** `grade-r33/ph3.mjs`.
    - /playlists → Commute → open "More actions" on an Entry → `page.goBack()` gives **URL /playlists**, with the menu gone and the person thrown off the Playlist.
    - Drawer open → Speed menu open → Back closes **both** the menu and the drawer (one Back, two layers).
    - In `ph2.mjs`, with no earlier history, Back with the "…" menu open went to `about:blank`, leaving the app.
    - By contrast, the Add sheet, the drawer stack (Up next, Episode) and dialogs each close on Back with the URL unchanged (`ph1.mjs`). On Android the system Back gesture is how people dismiss a popup, so this is inconsistent with the app's own sheets.
  - **Fix:**
    - Register every popup menu as a Back layer: `useBackLayers(open ? 1 : 0, () => setOpen(false))` in `components/lists/MoreMenu.tsx` and `components/player/PlayerMenus.tsx`, making both menus controlled. Do the same for the narrow-width `RowMenu` path and any `Popover`.
    - In the drawer, count an open menu as one more layer above `1 + drawer.stack.length`.
    - Test: open each menu at 412 px, call `goBack()`, then assert the URL is unchanged, the menu is closed, and focus is on its trigger.

**Blocker / minor:** none.

### N/O

CTRL-08 (no download was run to completion), LIST-05 (disclosure state across reload not tested), DRAG-05, DRAG-06 (pointer drag not exercised; the keyboard reorder was), FOOT-02 (the fixtures have no long list; rows are virtualised by code).

### N/A

- AX-05 (no critical audio-only information beyond the content itself).
- START-05 (no permission prompts; `storage.persist()` is silent in Chrome).
- START-06, START-07 (no accounts).
- TOOL-06, SIDE-03 (nothing can be hidden).

### Notable passes (evidence)

- **Keyboard and focus:**
  - KEY-01, KEY-04: complete Tab order with a 2 px blue `:focus-visible` ring, white on the dark bar.
  - WKEY-01: the View list is one Tab stop, an APG grid with arrows, Home/End, PgUp/PgDn, type-ahead, Space ticks and ⌘A.
  - WKEY-03: an in-app view change focuses the H1; dialogs trap focus, close on Esc and return focus.
  - DATA-04, DATA-05: removing an Entry moves focus to the next row; ⌘Z restores it and focuses it.
  - BROWSER-06: the row context menu opens on right-click, Shift+F10 and the ContextMenu key; links and fields keep the browser's menu.
  - EDIT-05: ⌘C on a row copies its URL ("Link copied").
- **URLs and history (BROWSER-02):** `?tab=`, `?q=`, `?edit=true` and `?sort=` all survive a reload, and Search typing doesn't stack history entries.
- **Persistence:**
  - DATA-06: scroll is restored on Back and on reload (434 px kept; `scroll.mjs`).
  - DATA-01, WDATA-01: a change made 150 ms before closing the browser survived on reopen (`persist.mjs`).
- **Appearance and sizing:**
  - APPEAR-03: forced colors keep every control boundary, the selection box, the focus ring and the Active dot.
  - APPEAR-05: reduced motion turns the drawer and sheets into a 150 ms opacity fade.
  - APPEAR-04: no contrast failure on any route, including both dark drawers.
  - WTYPE-02, WTYPE-05: no horizontal scroll at 320 px or with a 200% root font; WTYPE-03: the 1.4.12 overrides clip nothing.
  - WTYPE-04: 16 px checkboxes meet the spacing exception, with no other target within 12 px.
- **Copy (TYPE-08):** typographic punctuation throughout the app's own strings.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | Space Grotesk 30 px H1s over Inter, with a small consistent scale: 15 px medium titles, 13 px muted metadata, 11–12 px letterspaced caps section labels (TODAY, UP NEXT IN, SHOW NOTES). Type alone carries row structure, and tabular times line up. Below 9: the phone mini-player gives its title about 14 characters ("The long life o…", `phone-view.png`), and at 320 px Entry titles clamp mid-word to three lines ("shippin…", `narrow-playlist.png`), so the most important label in the app is the most truncated. The 11 px digits inside the skip icons are the only sub-12 px text (iconic, labelled). | hierarchy, craft |
| Hierarchy | **8.4** | Content leads: one blue action per screen (Play / Play this / Add podcasts) and quiet grey chrome. The squint test lands on the list, then the player. NOW/HERE/RESUME rows are tinted. Below 9: at 1440 px single-column pages stretch to about 1170 px, so the Entry progress bar runs 870 px and "Rewind to here" sits about 1,000 px from its event, repeated on all 9 Timeline rows (`tl-desktop-timeline.png`). The desktop drawer covers nearly the whole window. The dark bar is a strong second focal point (owner decision). | content-first, hierarchy |
| Spacing & density | **8.2** | Consistent 8 px rhythm, 76 px list rows, aligned leading edges across header, rows and side panel, and calm Things-like density. Below 9: wide-screen pages have no measure cap (Trash "Restore" about 1,050 px from the name; Library columns spread across 1,170 px; `trash-desktop-trash.png`, `desktop-library.png`). The phone drawer leaves its bottom ~15% empty (`phone-drawer.png`). At 200% text the player bar drops Back 15 and the queue (still reachable in the drawer). | craft, hierarchy |
| Color & contrast | **8.8** | Restrained and meaningful: one blue for action, selection, NOW and focus; red only for destruction; green ✓ for Played, alongside text. Every measured text pair passes, including both dark drawers. Forced colors are designed rather than left alone. Light only, which the owner decided. Below 9: blue does slightly too many jobs on one screen, carrying selection fill, the NOW label, the Active dot, primary buttons and link text together. | color-restraint, accessibility |
| Iconography | **8.7** | One Lucide family at text weight; standard glyphs (trash, star, check, download, gear). Icons appear only where they speed recognition, and each icon-only control has a tooltip, shown on focus too, and a label. Below 9: the custom skip-15/30 glyphs with 11 px numerals read slightly heavier than the set, and the Library tab icon (`|||\`) is the weakest-reading glyph in the bar. | conventions, craft |
| Consistency & polish | **8.5** (stability 9.1) | Every state is designed: skeleton rows on a fresh device, dashed empty cards, "View not found", inline feed error, the offline indicator, forced colors, hover, pressed and focus states. There is one toast place and voice. Below 9: the three inventory mismatches (create-action weight, unnamed "Default" values, Back closing sheets but not menus). Add-podcasts results show pale-blue initials instead of the feed's artwork, which the Library then shows (`fr-phone-add-results.png`). | craft, stability |
| Clarity | **8.6** | The domain vocabulary is used exactly and consistently; state is always legible (NOW/HERE/RESUME, the "Paused" badge, "Next and Last go to Default (Active)", the "Matches 6 Episodes now" live count). Errors give a recovery. Below 9: Episode detail has two "Play" buttons with different meanings, the action row's Play (now, in the Active Playlist) and "In your Playlists › Default › Play" (`phone-episode.png`). "Marked Slow Build Played" leaves the scope unsaid. Subscription "Speed: Default" doesn't say what the default is. | plain-language, feedback |
| Platform fit | **6.9** (capped; uncapped 8.5 = (Looks 8.7 + 2 × Behaves 8.4) ÷ 3) | **Web/Android:** real links, URLs for every state, Back restores scroll and focus, the browser's menus are kept on links and fields, a standalone PWA with Media Session, a manifest and its own Back links. **Mac shell:** a full menu bar (File, Edit with labelled Undo, Controls, Go, Window, Help), ⌘, opens Settings, native row context menus, window title = view, and bounds remembered. **Capped by BROWSER-01 (major).** Also below 9: one tab at a time, so ⌘-click or middle-click on any link opens a tab that only says "PodList is open in another tab", and "Use here" locks out the first (`contact-second-tab.png`). On the Mac, Settings opens inside the main window, selection is a fixed brand blue, and Go › Back/Forward are always enabled. | conventions, stability |
| Interaction & feedback | **8.7** | Keyboard-fluent APG grid, Undo with ⌘Z on every own action (toasts persist until dismissed, WDATA-04), live-apply settings, inline editing of View conditions with a live preview, p75 101–117 ms. Keyboard reorder is announced ("…is at position 2 of 4."), and every drag has menu equivalents. Below 9: Shift+↓ from an unticked row ticks only the row below, not the anchor, and Shift+↑ never unticks (`shift.mjs`: 01000 → 01100 → 01100 → 11100), against APG toggle semantics. Enter on the tick-box cell doesn't open the Episode, though the shortcut sheet lists "Enter: Open the Episode" for the list. | keyboard-efficiency, forgiveness |
| **Overall** | **8.3** | Serves the primary task very well: finding, queueing and listening are fast, forgiving and keyboard-complete, at home in a browser and as an installed app. The weakness holding Overall down most is Platform fit's Back contract on Android (menus), then the one-tab lock and the unmeasured wide-screen layouts. Cap: the lowest category (6.9) + 2.0 = 8.9, which isn't binding. | — |

## Next step

- **Target:** BROWSER-01 (major), in Platform fit, the lowest category.
- **Anti-pattern:** a half-adopted "Back closes the top layer": sheets honour it, popup menus don't.
- **Root cause:** `useBackLayers` is called by the dialogs, sheets and drawer, but not by the Base UI `Menu`s (`MoreMenu`, `PlayerMenus`), so a menu adds no history entry for Back to consume.
- **Change:** make those menus controlled and register `useBackLayers(open ? 1 : 0, close)`. In the drawer, add the menu as a layer above the drawer stack. Add a flow step: open the menu at 412 px, go Back, then assert the URL is unchanged, the menu is closed, and focus is on the trigger.
- **Principle:** stability, conventions.
- **Expected effect:** lifts the Platform fit cap (to about 8.5) and Overall to about 8.6. Nothing visual changes.

## Craft gaps between this build and 9.0 (after BROWSER-01)

1. **Second tab:** lift the one-tab lock, or soften it. A secondary tab could be a client of the owning tab (BroadcastChannel / SharedWorker over the OPFS DB), or at minimum show the requested destination's title and open it in the owning tab. This is the biggest remaining web-contract gap.
2. **Wide-screen measure:**
   - Cap single-column pages (Playlist Entries, History, Timeline, Trash, Library) at about 960 px, or give them a side panel as Views have.
   - Reveal "Rewind to here" on hover or focus, as View rows do, so nine identical links don't stripe the Timeline.
3. **Phone mini-player title:** win back width so about 25 or more characters show. For example, use 40 px artwork and drop Back 15 from the bar below 420 px (it lives in the drawer), or let the title take two lines.
4. **Copy and clarity:**
   - Episode detail's second Play → "Play in Default" (or "Resume" when there's a Position).
   - "Marked Slow Build Played" → "Marked 4 Episodes of Slow Build Played".
   - Subscription defaults should name their value: "Default (1×)", "Default (Off)".
5. **One weight for create actions:** make New View, New Playlist and Add podcasts the same emphasis (all grey or all blue).
6. **Grid selection:** Shift+arrows should follow APG (include the anchor; moving back un-ticks). Either make Enter on any cell open the Episode, or narrow the shortcut sheet's claim.
7. **Add-podcasts results:** show the feed's artwork, not initials, so the result looks the same in the sheet and in the Library.
8. **Mac shell polish (Mac IDs N/A, but felt):** a separate Settings window for ⌘,; Go › Back/Forward dimmed when unavailable; a Controls › Play/Pause label that follows state ("Play" or "Pause").
