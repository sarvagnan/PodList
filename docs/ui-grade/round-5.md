# PodList UI grade, round 5

Full audit against `~/Documents/UI_Guidelines` (CRITIQUE.md § Full audit), graded independently: earlier rounds and the UI-GRADE.md work lists weren't read. Build: commit 651e1d4 (`worktree-agent-a297b8333df900528`), `pnpm --filter @podlist/web build`, served by `ui-flows/demo.mjs`. Browser: Playwright Chromium 1.65 (headless); Mac shell: Electron 44.9.3 through Playwright `_electron`, run from source.

## Frame

- **Task:** pick an Episode from a View (or a Playlist) and listen to it, controlling playback from the player bar and the Now Playing drawer.
- **Target:** web app, an Android-first installable PWA (`display: standalone`). The macOS app is the same build in an Electron window (`packages/desktop/src/main.ts`); the owner grades it as the web app, so its menus and context menu are judged under Platform fit, and Mac checklist IDs are N/A → target.
- **Posture:** sovereign on the desktop (a window left open while listening), transient on the phone (open, choose, pocket).
- **Audience:** perpetual intermediate; one owner-user who listens daily.
- **Nearest exemplar:** Things (a calm personal list tool) for craft; the Android podcast players for the phone's grammar.
- **Character:** (1) warm off-white page (#f6f5f2) with one blue primary #2b50c8 *(owner-fixed)*; (2) a dark slate player bar and Now Playing drawer *(owner-fixed)*; (3) Space Grotesk headings over Inter text *(owner-fixed)*; (4) Views and Playlists as equal halves, navigated by lists, never capsules *(owner-fixed, layout A)*; (5) domain words capitalised as proper nouns: Episode, Entry, View, Playlist.
- **Owner decisions:** light only until a dark theme is designed; layout A; Inter and Space Grotesk; blue primary; dark player bar. Out of scope (designed, not built): View editor, Search, Playlist settings, reordering and Trash, Rewind, Library management, Subscription settings, Settings screen, OPML, first run. Their absence isn't marked down.

Baseline captures: `scratchpad/flows-r5/strips/*` and `scratchpad/grade-r5/shots/*`.

## Flows

- **Tasks run:** browse (open, Commute Playlist, Default Playlist, Library), listen (open Default, play an Entry, playing, pause, forward 30, open Commute, Play this, Commute playing), now playing (open Default, play an Entry, open the drawer, Up next, play from Up next, Episode page, close), fresh device (open Default, catalogue arrives unprompted after 2 s), second tab (open in a second tab, Use here, first tab after takeover).
- **Widths:** phone 412×915 (2×, touch), zoomed desktop 720×450 (2×), desktop 1440×900. **Appearance:** light only (dark isn't designed).
- **Timed runs:** desktop, 5 runs after a warm-up, no CPU or network throttling, darwin arm64. p75: open a Playlist 131 ms, Play from here 100 ms.
- **Script:** `packages/web/ui-flows/flows.mjs`. **Measurements:** `scratchpad/flows-r5/measurements.json`. **Strips:** `scratchpad/flows-r5/strips/<flow>/<width>/`, contact sheets `scratchpad/flows-r5/contact-*.png`.
- **Extra probes this round** (Playwright scripts `scratchpad/grade-r5/p1–p9.mjs`, `e1.mjs`; captures in `scratchpad/grade-r5/shots/`): Tab order, grid keys, right-click and the context-menu key, text selection, Esc with overlays, Back with the sheet and drawer, focus after removing rows, scroll restoration across Back and reload, 320 px, 200% text (root font size 32 px, phone and desktop), forced colors, reduced motion, widths 1024–1600, contrast by calculation, the Electron menu bar and window.

**Failures:** none. No FLOW check failed at any width; the core elements held within 2 px through every step (summary.md, measurements.json).

Not a FLOW failure, noted for craft: ticking a row on the desktop swaps the header picker for the taller bulk bar and moves the heading 50→54 px and the list down 8 px (`shots/d-hover-row.png` vs `shots/d-bulk.png`). The person caused it, so it stays inside the rule, but it is a visible wobble.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Dark toast, bottom-left above the player bar: "Added last in Default", "Playing next in Default", "Marked Played"; never names the Episode | none on screen (player errors in the bar) | none | Undo in the toast (no timeout) + ⌘/Ctrl-Z, labelled in the Mac Edit menu | Dashed box: "No Episodes match this View" + one line | none | Play, trailing tinted circle on each row; Next/Last appear on hover | "Keyboard shortcuts ⌘/" in the sidebar |
| View (phone) | Same toast, above the mini player | same | none | same | same | none | Play circle + "+" (opens the Add sheet) | none |
| Playlist | Same toast: "Removed from Workshop" (no Episode named) | none | none | same | Dashed box: "Nothing here yet" + "In a View, use Play Next or Play Last…" | none | Header pill, top-trailing: Play / Play this / Pause; rows: bare blue Play glyph + × | none |
| Episode (screen, panel, drawer page) | Same toast | "This Episode isn't in your Library." | none | same | n/a | none | Solid blue Play circle, centred in a labelled action row | none |
| Add sheet | Toast after Play Next / Play Last | none | none | toast | n/a | none | Play Next (blue, leading) · Play Last (grey) | none |
| Now Playing drawer | Toast above the drawer (z 60) | "Couldn't play this Episode." + Try again, inline under the scrubber, pink on slate | none | toast | "Up next" lists every Entry | none | White Play/Pause circle | none |
| Player bar | n/a | "Couldn't play this Episode." + Try again, in place of the subtitle | none | n/a | Skeleton title while syncing | Offline status in the sidebar / above the tabs | Play/Pause | tooltips |
| Second tab | n/a | n/a | n/a | n/a | n/a | Full screen: "PodList is open in another tab" + Use here | Use here | one line of explanation |

**Mismatches**
1. **The Active Playlist has four names.** Desktop picker "Default (active)"; Add sheet "Playing · 4" (shown even while paused, `shots/p-add-sheet.png` with the mini player showing Play); phone Playlists badge "Playing"/"Paused"; sidebar an animated-looking equaliser glyph (AudioLines) whether or not anything plays; rows NOW/RESUME. (View, Add sheet, Playlists, sidebar.)
2. **Back link wording.** "‹ Views" and "‹ Playlists" on drill-downs; "‹ Back" on the Episode screen and on drawer pages. (View, Playlist vs Episode, drawer.)
3. **One action, four Play styles.** Tinted 44 px circle (View rows), bare blue glyph (Playlist rows), solid blue circle with a label (Episode), white circle (player). (View, Playlist, Episode.)
4. **Play Next / Play Last notation.** Words "Next"/"Last" in rows, list glyphs plus words in the bulk bar, "Play Next in Default" in menus. (View rows vs bulk bar.)
5. **Confirmations don't say what they acted on.** "Removed from Workshop" twice in a row is indistinguishable; Undo targets are invisible. (Playlist, View.)
6. **Main action on an empty Playlist.** "Play this" stays and only makes the Playlist Active (`shots/d-empty-playlist.png`). (Playlist.)

## Checklist

**Coverage: 96.3%** (pass 68 · fail 10 · N/O 3 · N/A 24; 78 of 81 applicable items verified).

Mac IDs: N/A → target (one line, per web-checklist.md § Shared checks). The Electron shell's menus and context menu are judged in Platform fit below.

### Failures by severity

**Major**

- **[WTYPE-05] The View list collapses between 1024 and ~1200 px: Episode titles disappear and Play overflows into the side panel.** Where: desktop View (`routes/views/$viewId.tsx`, `EpisodeRow.tsx`), browser and Mac app. Evidence: at 1024, 1060 and 1100 px the title link measures 0 px wide, rows grow to 121 px with only artwork and Play visible, and the last button's right edge sits at 692 px against a grid edge of 600–676 px, i.e. up to 92 px over the panel divider (`shots/d1100.png`; p9 measurements: 1024 → title 0, 1150 → 26, 1200 → 76, 1280 → 156, 1440 → 316). At the Mac app's default 1280×820 window, titles get 156 px and wrap to three lines while a ~450 px blank gap separates them from Play (`shots/mac-window.png`). Root cause: the hover actions (Next, Last, Add, Star, Played, Download) are hidden with `opacity-0` but stay in the flex row, so they reserve ~330 px at every width ≥1024 px and the title is what gives way. Fix: take the hidden actions out of layout (render them absolutely over the trailing end of the row, on a fade of the row background, when hovered, focused or ticked), give the title column a floor (`min-w-[14rem]`), and below a content width of ~760 px fall back to the phone row (Add + Play) or fold the actions into one "More" menu button. **WIN-03** fails on the same defect (the web clause defers to WTYPE-05's thresholds); recorded once here.
- **[BROWSER-06] Right-clicking an Episode title gets PodList's menu, never the browser's link menu.** Where: every View row in the browser, desktop and Android (long-press). Evidence: the title `<a href="/episodes/…">` is stretched over the whole row (`after:absolute after:inset-0`), and the row is a Base UI `ContextMenu.Trigger`, so a right-click anywhere on the row, the link text included, opens the custom menu (Play Now … Open in New Tab, Copy Link; `shots/d-ctx-title.png`, p3 log). The browser's own Open in New Window, Incognito, Save Link As, Copy Link Text and extension items are gone. Shift-F10 didn't open the menu in the probe; the ContextMenu key did. Fix: keep the custom menu on the row but let `contextmenu` events whose target is the title link fall through to the browser (check `event.target.closest("a")` in the trigger), or stop stretching the link and open the row by a row click handler so only the row background carries the app menu.
- **[WKEY-03] Focus is lost when the last Entry is removed, and Esc stops working while an Undo toast is up.** Where: Playlist and View. Evidence: removing the last Entry of Workshop with the keyboard leaves `document.activeElement` on `<body>` (p7 log: "focus after removing last: BODY"). Separately, every Undo toast has `timeout: 0` and Base UI renders it with `role="dialog"`; the View and Playlist Esc handlers return early whenever `[role="dialog"]` exists, so after any row action the documented Esc ("Close a sheet or panel; clear ticked Episodes") does nothing until the toast is dismissed (p4 log: panel URL unchanged after Esc with the toast showing). Fix: when the removed row was the last, move focus to the empty state's heading (give it `tabIndex=-1`) or the header Play button; exclude toasts from the Esc guard (`[role="dialog"]:not([data-base-ui-toast-root])`, or check `aria-modal="true"`).
- **[WTYPE-02] At 200% text, row facts and the drawer title are cut off and the desktop player bar overlaps.** Where: phone View rows, Now Playing drawer, desktop player bar and sidebar. Evidence (root font size 32 px): the phone facts line clamps at two lines and drops the duration ("Market Hours · Yesterday ·…", `shots/p200-views-new-this-week.png`) — the fact that the "Under 30 minutes" View exists to show; the drawer title clamps to "The long life of a shipping…" (`shots/p200-drawer.png`); on the desktop the remaining time "−16:34" runs into the speed button's gauge icon and "Keyboard shortcuts" sits under the player bar (`shots/d200-view.png`). Fix: drop `line-clamp-2` on the facts (let them wrap; they're short) and `line-clamp-2` on the drawer title; give the bar's centre column `min-width: 0` and let the trailing group wrap or drop the "up next" word before it overlaps; raise the sidebar's bottom padding to the bar's measured height (a CSS variable set from the bar), not a fixed `pb-24`.
- **[APPEAR-04] "Turn off" in the sleep menu is 2.24:1.** Where: Sleep menu on the dark player (`PlayerMenus.tsx`, `text-destructive` #b42318 on #1b2a33). Evidence: `shots/d-sleep-menu.png`; calculated 2.24:1 against 4.5:1. It's the only way to cancel a timer, so it's a control label people need. Fix: use `--player-danger` (#ffb4a8, 8.7:1), which already exists for errors on the dark player, or plain player text: turning a timer off isn't destructive.
- **[LIST-06] The phone tab bar loses its selection on the Episode screen.** Where: `/episodes/$id` on the phone (and on the desktop below 1024 px, where the sidebar shows nothing selected). Evidence: `shots/p-episode.png` — none of Views / Playlists / Library is highlighted after drilling in from a View. Fix: carry the originating section in the history state (or a `from` search param) and mark that tab and sidebar section current; default to Views.

**Minor**

- **[COPY-01] The Active Playlist is named four ways, one of them wrong.** See inventory mismatch 1; the Add sheet's "Playing · 4" shows while playback is paused. Fix: one word everywhere — "Active" in the picker, the sheet and the sidebar (with the equaliser glyph only while audio plays, a static icon otherwise), and keep Playing/Paused as the separate playback state.
- **[APPEAR-11] Half-rendered player label on a fresh Device.** Phone mini player shows " · Default" and the desktop bar "Cold open · Default" with an empty title for 2 s (`flows-r5/strips/fresh device/phone/01-open-default.png`). Fix: render the subtitle as a placeholder bar too while the title is, or omit the separator when the podcast name is empty.
- **[BROWSER-08] Text in a View row can't be selected.** The stretched title link covers the row, so dragging across a title starts a link drag and double-clicking the facts hits the link (p4: selection empty; Playwright reports the `<a>` intercepting). ⌘C on a row copies only the link. Fix: as for BROWSER-06, don't stretch the link; or allow Alt-drag selection; and make ⌘C put "Title — Podcast\nURL" on the clipboard (plus `text/html` with an anchor).

### N/O
FOOT-02 (only 6–11 Episodes in the fixtures; long-list scrolling not measurable), BROWSER-10 (no Core Web Vitals lab run), WTYPE-03 (text-spacing overrides not run).

### N/A
FLOW-03 (no text entry); DLG-02, DLG-03, DLG-05 (no alerts or destructive choices; Remove is undoable); CTRL-02, CTRL-03, CTRL-04 (no checkbox hierarchies or text fields); CTRL-07 (Search out of scope); LIST-02, LIST-03, LIST-05 (no multi-column headings, sorting or outlines); DRAG-01, DRAG-03, DRAG-05, DRAG-06 (no drag and drop; reordering out of scope); START-02 (first run out of scope), START-04, START-05 (no permission prompts), START-07 (no accounts); TOOL-06, SIDE-03 (nothing can be hidden); SET-01 (Settings screen out of scope by owner decision); WDATA-01, WDATA-03 (no drafts or validation); all Mac IDs → target.

### Passes worth naming
BROWSER-01 (Back pops the Add sheet, each drawer page, then the drawer; scroll restored across Back and reload, p7), BROWSER-02 (View, Playlist and the open Episode, `?episode=`, all reload), BROWSER-03 (title follows the view; the Mac window title too), WKEY-01 / LIST-07 (APG grid: one Tab stop, arrows, Home/End, type-ahead, Space ticks, Shift-arrows, ⌘A), DATA-04 (30-step undo and redo, toasts and ⌘Z, labelled "Undo “…”" in the Mac Edit menu), RESP-01 (p75 131 ms / 100 ms), APPEAR-03 (forced colors keeps boundaries, progress and selection, `shots/d-forced.png`), APPEAR-05 (reduced motion: drawer fades, transition-property opacity), WTYPE-05 at 320 px (no horizontal scroll), WDATA-04 (Undo toasts don't time out), CTRL-08 (download shows % and Stop).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by WTYPE-02; ~8.0 uncapped) | A small, deliberate scale in rem: Space Grotesk 28–30 px titles, Inter 15 px rows, 13 px facts, 12 px letterspaced caps labels (8%), tabular figures for times; typographic quotes and ellipses throughout. Held back by WTYPE-02 (facts and drawer title clamp at 200%), the facts' "·" wrapping to the start of a line ("· 26 min" at 1280, `shots/mac-window.png`), and three-line titles when the column is squeezed. | hierarchy, accessibility |
| Hierarchy | **7.4** | Title → facts → list reads cleanly, chrome is quiet on the light page and the dark player anchors the bottom. But six accent-tinted Play circles form a competing column on every View (`shots/d-hover-row.png`); "Play Next and Play Last go to [Default (active)]" in the header repeats "NEXT AND LAST GO TO Default" in the panel beside it; a ticked row lights up all seven of its controls plus a solid Play, so three ticked rows show 24 controls under a 7-button bulk bar (`shots/d-bulk.png`). | content-first, hierarchy |
| Spacing & density | **6.5** (capped by WTYPE-05) | A clear 4 px rhythm, 76 px rows, consistent 24–32 px gutters and good phone density. Below the cap because the invisible hover actions reserve ~330 px at every desktop width: titles vanish at 1024–1149 px, Play overflows the list by up to 92 px, and at 1280–1600 a 300–450 px dead gap splits titles from Play. The Playlist list stops at 960 px while its empty state spans the full width. | craft, adaptability |
| Color & contrast | **6.9** (capped by APPEAR-04; ~7.8 uncapped) | Restrained and meaningful: one blue for action, selection, focus and progress; green Played, amber Star; muted text 5.7:1, focus ring 6.25:1, dark-player muted 7.1:1, progress 5.6:1. Below Exemplary: "Turn off" 2.24:1; selection rests on a 1.07:1 tint (sidebar item, tab pill, row Play circle all #e8edfb on #f6f5f2) plus weight; empty-state dashed border 1.19:1. | color-restraint, accessibility |
| Iconography | **7.6** | One Lucide set at matched weights, custom 15/30 skip glyphs with numerals, Play Next/Last as words in rows (avoiding two near-identical list glyphs). Below Exemplary: the equaliser (AudioLines) marks the Active Playlist even while paused, implying sound; the bulk bar brings back the list glyphs the rows dropped; a bare check for Played is ambiguous on its own (tooltip only). | conventions, plain-language |
| Consistency & polish | **6.8** (stability 7.8) | Designed states nearly everywhere: loading skeletons, offline, second tab, playback error, empty Views and Playlists, forced colors, reduced motion. Held in Competent by an undesigned mid-width state (1024–1200), 200% text overlaps, the six inventory mismatches, toasts that persist and stack without naming their Episode, and the half-rendered fresh-device label. Stability 7.8: every flow held still at three widths (summary.md, no failures); mismatches 1–6 and the 8 px shift on ticking keep it below 9. | craft, stability |
| Clarity | **7.2** | Plain domain words, specific verbs ("Play Next in Default", "Mark Played", "Rewind" reserved), designed empty-state copy. Below Strong-high: four names for the Active Playlist; "Up next · 3" opens a list that also holds earlier Entries (`shots/p-upnext.png`); "Play this" on an empty Playlist; the narrow player bar shows a lone "2" for up next; Next or Last on the Episode that's playing says "Playing next in Default" and silently leaves the other Entries behind the Cursor ("0 up next", p5). | plain-language, feedback |
| Platform fit | **6.9** (capped by BROWSER-06, LIST-06; Looks 7.6, Behaves 7.3 → 7.4 uncapped) | Web: real links, URLs for View, Playlist and open Episode, Back pops overlays layer by layer, native select/range/checkbox, APG grid and menus, shortcut notation by OS, standalone PWA with in-app Back on the phone. Mac window: real menu bar with Controls and Go menus, dynamic "Undo “Removed from Workshop”", native row context menu, window title follows the view, bounds restored. Foreign or missing: right-click on links replaced (BROWSER-06); tab bar loses its section (LIST-06); in the Mac shell, Go has no destinations (no ⌘1–3 for Views, Playlists, Library), Help has no documentation item, Controls stays enabled with nothing loaded and keeps the static title "Play/Pause". | conventions, stability |
| Interaction & feedback | **6.9** (capped by WKEY-03; ~8.0 uncapped) | Keyboard-fluent grid with type-ahead and bulk ticking, Space plays from anywhere, 30-step Undo/Redo, Undo that doesn't time out, sub-150 ms responses, a documented shortcut sheet. Held at the cap by focus dropping to `<body>` after the last removal and the dead Esc while a toast shows; also Next/Last on the playing Episode reshuffles the queue without saying so. | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **6.9** | Serves its task well on a phone and in a wide desktop window, and it is at home in the browser in most respects. One layout defect (the row's reserved, invisible action column) breaks the primary task at common laptop and Mac-window widths, and five majors cap five categories at 6.9. Cap check: lowest category 6.5 → Overall ≤ 8.5; not binding. The weakness holding Overall down most is the View row's layout. | — |

## Next step

- **Target:** WTYPE-05 (major) in Spacing & density, the lowest-scoring category, on the primary task.
- **Anti-pattern:** reserved-but-invisible chrome: controls hidden with opacity still take layout space, so content gives way to nothing.
- **Root cause:** `EpisodeRow`'s desktop action group (`[@media(hover:hover)]:opacity-0`) stays in the flex flow, ~330 px wide, from 1024 px up; the title (`flex-1 min-w-0`) is the only shrinkable item.
- **Change:** position the action group absolutely at the row's trailing edge (`absolute right-14 inset-y-0`, background `bg-gradient-to-l from-[row bg]`), shown on hover, focus-within or ticked, so it overlays the facts' tail instead of reserving space; give the title column `min-w-[14rem]`; below a list width of ~760 px (container query on the grid) show the phone row (Add + Play) instead.
- **Principle:** content-first; adaptability.
- **Expected effect:** Spacing & density and Typography up (titles get the width at 1024–1600; no three-line wraps at 1280), WTYPE-05 and WIN-03 pass, Hierarchy unchanged or better. Watch: keyboard order within the row must stay Next → Last → … → Play; the overlay must not cover the facts while a row is ticked (shift facts or keep ticked rows' actions in flow).

### What else stands between this build and 9.0

1. Fix the five other majors (BROWSER-06, WKEY-03, WTYPE-02, APPEAR-04, LIST-06) to lift the caps on Typography, Color, Platform fit and Interaction.
2. Quiet the Play column: plain blue glyph at rest (as in Playlist rows), tinted circle only on hover, focus or the open row; drop the header picker label when the panel already shows the target, or move the picker into the panel heading.
3. One name and one glyph for the Active Playlist (COPY-01), with the equaliser only while audio plays.
4. Toasts that name the Episode ("Removed “Joinery without screws” from Workshop"), replace rather than stack, and don't block Esc.
5. Next/Last on the playing Episode: disable it, or say what happens ("Already playing").
6. "Up next" shows only what's after the Cursor (or splits "Earlier" from "Up next").
7. Give selection a stronger cue than a 1.07:1 tint: a 3 px primary bar on the selected sidebar item, as rows already have.
8. Mac shell: Go › Views, Playlists, Library with ⌘1–⌘3; Help › PodList Help; Controls › Play or Pause titled by state and disabled with nothing loaded.
9. Forced colors: give the drawer a 1 px `CanvasText` top edge (`shots/d-forced-drawer.png`: the sheet has no boundary).
10. Hold the header height when the bulk bar replaces the picker (fixed `min-h` on the actions slot) so ticking doesn't shift the list.
