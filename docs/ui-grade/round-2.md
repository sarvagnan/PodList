# PodList UI grade, round 2

Full audit against `~/Documents/UI_Guidelines` (`CRITIQUE.md` § Full audit), graded independently: no earlier round or work list was read. Build: commit `6db9bb9`, `pnpm --filter @podlist/web build`, served by `packages/web/ui-flows/demo.mjs` (fixture feeds, seeded Playlists and Views, silent audio). Browser: Playwright Chromium 158.0.8127.18, device scale 2, 100% zoom; all sizes are CSS px. Graded 2026-11-07.

## Frame

- **Task:** find Episodes through Views and line them up in Playlists (Play Now / Next / Last), then listen from a Playlist and steer playback from the player bar and Now Playing drawer.
- **Target:** **web app**. Android-first installable PWA; the macOS app is the same build in an Electron window, so platform fit is judged for Android Chrome (installed, standalone) and for a Mac desktop window, through the web checklist. (The guide's `platform-fit.md` would judge an Electron app as a Mac app; per the owner's brief it is graded here as the web build in a window, and Mac-only signals are noted, not scored.)
- **Posture:** sovereign on the desktop (all-day sidebar + list + player); a frequently summoned, short-session tool on the phone.
- **Audience:** perpetual intermediate (a personal client with its own vocabulary: View, Playlist, Entry, Cursor).
- **Nearest exemplar:** Things, for calm list craft and actions that surface on hover or selection. A reference for decisions, not a look.
- **Character:** (1) warm off-white canvas `#f6f5f2` with one blue primary `#2b50c8` *(owner)*; (2) Space Grotesk headings over Inter body *(owner)*; (3) the dark navy player bar and drawer `#1b2a33` *(owner)*; (4) Views and Playlists as equal halves, navigated as lists, never capsules *(owner, variant A)*; (5) the Cursor spoken in words (NOW / RESUME) with a thin per-Entry progress line, and initials tiles for artwork.
- **Owner decisions:** light appearance only; variant A; Inter + Space Grotesk; blue primary; dark player bar. Not built and out of scope: View editor, Search, Playlist settings, Rewind, Library management, Subscription settings, OPML, first run.

## Flows

- **Tasks run** (`packages/web/ui-flows/flows.mjs`): browse, listen, now playing, fresh device (catalogue held 2 s), second tab. Widths: phone 412×915, zoomed desktop 720×450, desktop 1440×900. Light only (dark isn't designed). Service workers blocked.
- **Measurements:** `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flows-r2/measurements.json` (72 rows); strips and contact sheets beside it.
- **Timed runs:** desktop, 5 runs after warm-up, no throttling, darwin arm64. p75: open a Playlist 134 ms; Play from here 111 ms. Only these two steps are timed, so RESP-01 rests on a partial sample.
- **This audit's own probes** (scripts in `…/scratchpad/grade-r2/`): screen tour at all three widths (`tour.mjs`), contrast / text-size / target-size sweep of every screen (`measure.mjs`, `measure.json`), keyboard, focus, history and link behaviour (`keys.mjs`, `a11y.mjs`, `trap.mjs`), forced colors, 150% and 200% root font size and WCAG text spacing (`adapt.mjs`, `perf.mjs`), focus-obscured sweep (`obscure.mjs`), lab LCP/CLS on phone at 4× CPU throttle (`perf.mjs`).
- **Failures:** FLOW-06 only (minor): second tab, desktop, step 2 "use here" — the sidebar shows the **VIEWS** and **PLAYLISTS** headings with nothing under them while the main area shows skeleton rows (`strips/second tab/desktop/02-use-here.png`). No FLOW-01, -02, -04, -05 or -07 movement beyond tolerance in any row.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (phone) | Toast above mini-player, dark `#17181c`, "Added last in Default" | none seen | Add sheet: Playlist radio list, Play Next (primary) / Play Last | Toast "Undo", 6 s, one at a time | Dashed box, centred: "No Episodes match this View" + next step | none | Solid blue Play, trailing each row | none |
| View (desktop) | Same toast, bottom-leading above player bar; bulk: "2 Episodes starred" | Row download: alert icon, tooltip "Download failed. Try again" | Add dialog centred (no close button); Remove download in a menu, destructive red | Same toast | Same | none | Solid blue Play, last in each row | none |
| Episode (screen / panel / drawer) | Same toast | Download: label "Retry" | Remove download menu | Same toast | "None." for show notes | none | Blue Play, centre of action row | none |
| Playlist | none (header button changes word: Play → Pause) | none | none | none | Dashed box "Nothing here yet" + next step | none | Blue pill top-trailing: Play / Pause / Play this | none |
| Player bar / drawer | none | Inline on dark: "Couldn’t play this Episode. Try again" (role alert) | Speed / Sleep menus (light popover over dark) | none | none | none | White Play/Pause, centre | none |
| Missing View / Playlist | — | "This View no longer exists. It was deleted on another device." vs "This Playlist no longer exists. It may have been deleted on another Device. See your Playlists" | — | — | dashed box | — | — | — |
| Second tab | — | — | "Use here" | — | — | Full-page centred notice | Blue "Use here" | — |

**Mismatches**
1. Deleted-object wording: View says "was deleted on another device" and offers no way out; Playlist says "may have been deleted on another Device" and links to the Playlists list (View vs Playlist).
2. "Device" is a domain term (CONTEXT.md) but is lower-case in the View message and the second-tab notice ("on this device"), capitalised elsewhere.
3. Download failure is "Download failed. Try again" in a row tooltip and "Retry" in Episode detail.
4. Two different dark surfaces stacked at the bottom on every screen: the toast `#17181c` sits directly above the player `#1b2a33`.
5. Sidebar shows counts for Playlists but not for Views; the Views list page shows counts for both.

## Checklist

Coverage: **97.5%** (pass 59 · fail 19 · N/O 2 · N/A 25). Mac IDs: N/A → target (not counted).

### Failures by severity

No blockers.

**Major**

- **[BROWSER-01] Back closes an open sheet or drawer and also leaves the screen beneath it.** Phone: View → Add sheet open → Back lands on `/views` with the sheet gone (`a11y.mjs`). Desktop/phone: Playlist Default with Now Playing drawer open → Back goes to the previous Playlist and closes the drawer (`keys.mjs`). On Android the system Back gesture is how people dismiss a sheet. *Fix:* push a history entry (or use `history.state`) when the drawer, its stacked pages, and the Add sheet open; on `popstate`, pop the top layer instead of routing. Android predictive back then closes one layer at a time.
- **[BROWSER-04] ⌘/Ctrl-click on an Episode title is swallowed.** `EpisodeRow.tsx` calls `event.preventDefault()` and opens the side panel for any click at ≥64 rem, without checking modifiers. Measured: Ctrl/⌘-click opened the panel in place; pages 1 → 1, no new tab. *Fix:* return early when `event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0`, so only plain clicks open the panel.
- **[BROWSER-06] Mac window: right-click does nothing.** `packages/desktop/src/main.ts` installs no `context-menu` handler, so links, selected text and the show notes have no Copy, Copy Link, Look Up or Services. *Fix:* on `webContents` `context-menu`, build a native menu from `params` (link: Copy Link; selection: Copy, Look Up; editable: the edit roles); `electron-context-menu` does this.
- **[LIST-07] The desktop Episode list is a selectable list without list keyboarding.** Rows can be ticked for bulk actions and selected into the panel, but each row is 9 Tab stops (checkbox, title, 6 icon buttons, Play): 55 Tab presses to cross a 6-Episode View, so hundreds for a real View. ArrowDown does nothing; no type-select, Shift-click range, or ⌘/Ctrl-A. *Fix:* make the table an APG grid (one Tab stop, arrows between rows and cells, Space toggles the tick, Enter opens the panel, Shift+arrows extend), or a listbox of rows with the actions reachable by arrow keys inside the active row.
- **[DATA-04] Undo is one step deep, 6 s long, and the only reversal for an add.** Toasts use `timeout: 6000` and `Toast.Provider limit={1}`, so a second action hides the first Undo. Ctrl/⌘-Z does nothing (measured: Star stayed pressed). There is no Remove-from-Playlist control anywhere (`RemoveEntry` is only issued by undo), so a mistaken Play Next or Play Last is permanent once the toast goes. *Fix:* add Remove (and later reorder) on Playlist Entries and in Up next; keep an undo stack that ⌘/Ctrl-Z walks outside text fields.
- **[DATA-06] Relaunch forgets where you were.** `routes/index.tsx` redirects `/` to `/views`; the manifest `start_url` is `/` and Electron loads `/`. The installed app and the Mac window both reopen on Views, not the last Playlist or View. The "Next / Last go to" choice is an in-memory atom and resets on reload. *Fix:* store the last route (and the target Playlist) in local storage or the local DB; redirect `/` to it on launch.
- **[APPEAR-05] No reduced-motion handling.** There is no `prefers-reduced-motion` rule anywhere in `src/`. With `reducedMotion: 'reduce'` the drawer still slides a full screen height (`transition: 0.3s transform`), and so does the Add sheet. *Fix:* `@media (prefers-reduced-motion: reduce)` → cross-fade (opacity, ≤150 ms) instead of translate for the drawer, the sheet and the desktop dialog.
- **[AX-02] The Episode open in the desktop panel is marked by blue title text only.** There is no row tint or bar, no `aria-current`, and in forced colors the cue vanishes, because every title becomes LinkText (`shots/fc-desktop-selected.png`). The tick state, by contrast, tints the row. *Fix:* give the selected row a persistent background (`bg-accent`) plus a 3 px leading bar, set `aria-current="true"`, and add a forced-colors outline as for the sidebar.
- **[WKEY-03] Focus escapes and gets lost.** (a) The Now Playing drawer doesn't hold focus: after its last control, Tab moves into the page behind, which is `aria-hidden`. First escape at Tab 10 on phone and Tab 15 on desktop; 17 of 45 presses landed outside on phone (`trap.mjs`). (b) Closing the desktop Episode panel with its × leaves focus on `body`. *Fix:* make the drawer modal with a working trap (Base UI `modal` plus `inert` on the shell while open). On panel close, return focus to the row title that opened it.
- **[WDATA-04] Toast-and-vanish.** The Undo, which is the only recovery action (see DATA-04), disappears after 6 s. Base UI pauses on hover and F6 reaches the region, but a phone user has no hover and no F6. *Fix:* once Entries can be removed, the toast may stay brief. Until then, keep it until dismissed or until the next action, or extend it to ≥20 s with a way to extend it again.
- **[WTYPE-02] At 200% text size, content is lost.** Browser font size 32 px (Android Chrome text scaling, or the desktop font setting): View rows shrink titles to "Whc / s…" and "The q…"; Playlist rows set titles one letter per line ("T / q"). The phone page overflows to 443 px, so it scrolls sideways. The mini-player and the desktop player bar drop the Episode title entirely, leaving only artwork and buttons (`shots/text200-phone-*.png`, `text200-desktop-*.png`). At 150% titles are clipped to two short lines and the metadata line is lost. Browser zoom at 720×450 passes, because the layout reflows to phone. *Fix:* keep chrome widths in px and text in rem. The Playlist number column is `w-14`, which becomes 112 px at 32 px root: make it `w-8` px or hide it at large text. At large text, stack the trailing buttons under the title (container query on the row), and let the player title wrap to two lines above the controls.

**Minor**

- **[FLOW-06] Empty sidebar headings while loading.** **VIEWS** and **PLAYLISTS** show with nothing under them during load (second tab, desktop, step 2). *Fix:* render 2–3 skeleton rows under each heading, as the main area does.
- **[KEY-08] Space plays and pauses but is documented nowhere.** There's no shortcut reference. *Fix:* a "Keyboard shortcuts" dialog (on `?`, and in Help in the Mac menu) listing Space, Esc and the list keys.
- **[PTR-04] Desktop row icons explain themselves only through a hover `title`.** Nothing appears on keyboard focus, and the six glyphs aren't self-explanatory. *Fix:* a Base UI Tooltip that opens on focus and hover, with the action and its target ("Play Next in Default").
- **[APPEAR-09] Play Next, Play Last and Add to… use three near-identical list glyphs.** `ListStart`, `ListEnd` and `ListPlus` differ by a few px of arrow. The skip icons carry 9 px numerals. *Fix:* reveal row actions on hover/selection with text labels in the selected row, or keep Play Next and Play Last as text buttons in the toolbar for the selection, and drop to one overflow menu per row.
- **[TYPE-07] Underline styles buttons.** "Try again" (player error) is a button styled with an underline, and "Switch Playlist" underlines on hover. *Fix:* style them as text buttons (weight or pill), and keep underline for links.
- **[COPY-04] Domain terms change case and wording.** "device" vs "Device"; "Play now" (tooltip) vs the domain term "Play Now"; "Retry" vs "Download failed. Try again". *Fix:* one capitalisation per CONTEXT.md term, and one wording per state.
- **[BROWSER-09] The Mac window has no Back or Forward.** No ⌘[ / ⌘] or Go menu, no swipe, no mouse-button back. Panel selections push history entries that can't be walked back, and the View menu offers Reload. *Fix:* add a Go menu with Back ⌘[ and Forward ⌘] wired to `webContents.navigationHistory`, plus `app-command` and swipe handlers.
- **[WTYPE-01] The skip buttons' "15" and "30" are 9 px** (`SkipIcon.tsx`, `text-[0.5625rem]`), the only text below 12 px. They are the glyph's meaning. *Fix:* use a 32 px icon box with 11–12 px numerals, or a "15"/"30" caption under the icon on the desktop bar.

### Passes worth noting (evidence)

- **Contrast (APPEAR-04).** Every visible text node on 14 screen states at three widths passed WCAG 1.4.3: 0 failures (`measure.json`). The muted text `#5c6070` is 5.9:1 on the canvas; white on `#2b50c8` passes.
- **Targets (WTYPE-04).** All targets are ≥24 px. The desktop checkboxes (16 px) pass by the spacing exception, and phone controls are 40–44 px.
- **Reflow (WTYPE-05).** No horizontal scroll at 320 px.
- **Text spacing (WTYPE-03).** The WCAG text-spacing overrides cause no clipping.
- **Forced colors (APPEAR-03).** Boundaries, progress and the current tab all keep their cues in forced colors.
- **Focus not obscured (WKEY-04).** Over 19 focus stops at phone and zoomed widths, none hid under the player.
- **Focus on navigation.** Focus moves to the h1 on every route change.
- **Dialogs and menus.** The Add dialog focuses its radio group, Esc returns focus to the opener, and the menus follow APG (arrows, Esc back to the trigger).
- **Scrubber.** It's a native range with `aria-valuetext`.
- **Space.** It toggles play only when no control is focused.
- **URLs (BROWSER-02/03).** Every View, Playlist and Episode has a URL, the panel selection is kept in `?episode=` across reload, and the tab title names the view.
- **Load (BROWSER-10).** Lab LCP 412–456 ms (phone, 4× CPU, cold), CLS 0.024 (lab).

### N/O

DATA-05, FOOT-02.

### N/A

- **No text entry in the app:** FLOW-03, CTRL-04, WDATA-01, WDATA-03.
- **No alerts in the web build:** DLG-02, DLG-03.
- **Feature not present:** CTRL-02; CTRL-07 (Search is out of scope); LIST-03 (no column sorting); LIST-05 (no disclosure); TOOL-06 and SIDE-03 (nothing can be hidden); WCOPY-01 (no shortcut hints shown); EDIT-02 (no custom editors).
- **Drag and drop (reorder isn't built, no file intake):** DRAG-01; DRAG-03, DRAG-05 and DRAG-06 → DRAG-01.
- **First run, help, permissions and accounts (out of scope or absent):** START-02 to START-07.
- **Settings view not built (out of scope):** SET-01.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (cap; 7.6 uncapped) | Two deliberate faces with clear roles: Space Grotesk 28–30 px titles, Inter 15 px row titles, 13 px subtitles, 12 px metadata, tabular figures for times, curly punctuation and a real minus (−16:34). It loses ground on the same role at three sizes (Episode title 15 px in a View row, 14 px in a Playlist row and in Up next), ten distinct sizes in use (9–30 px), and the 9 px skip numerals. WTYPE-02 (content lost at 200% text) caps it at 6.9. | `hierarchy`, `accessibility` |
| Hierarchy | **7.2** | The title leads, then the rows, then the player; the dark player anchors the bottom. Against that, every row carries a filled blue Play: six tinted circles on one phone screen, and on the desktop each row adds six always-visible grey icons (42 controls for 6 rows). The squint test lands on the column of blue dots, not the titles. On desktop launch the main area repeats the sidebar's View list instead of showing a View. The drawer is well ordered: artwork, title, scrubber, transport, secondary. | `content-first`, `simplicity-not-minimalism` |
| Spacing & density | **7.6** | One 4 px rhythm: 76 px Episode rows, 64 px list rows, 20/32 px gutters, aligned leading edges between the header and the rows. The phone is calm and well tuned. On a 1440 px desktop without the panel, the title sits at x≈330 and its actions at x≈1080–1350, a long eye trip with no column structure in between. At large text the row layout collapses (recorded under WTYPE-02). | `craft`, `hierarchy` |
| Color & contrast | **6.9** (cap; 8.0 uncapped) | Restrained: one blue for action, selection, focus and link; green only for Played, Downloaded and the Active Playlist; amber only for Star. Contrast is 0 failures measured, and forced colors keep their cues. Two blues (`#2b50c8` primary, `#3aa0e8` player progress) and two near-blacks (toast vs player) blur the palette slightly. APPEAR-05 (no reduced motion) caps it under the Appearance group. | `color-restraint`, `accessibility` |
| Iconography | **6.6** | One Lucide family at a consistent stroke, with a funnel for Views, a list-music glyph for Playlists, and an audio-lines mark for the Active Playlist. But the row's Play Next, Play Last and Add to… glyphs are near-twins with no labels, the 9 px numerals sit inside the skip arrows, and on desktop the icons are always on, so they decorate every row rather than speed recognition. Competent: meanings are a stretch. | `conventions`, `plain-language` |
| Consistency & polish | **7.6** (stability 8.0) | The states are designed: skeletons, dashed empty states with a next step, a missing View or Playlist, 404, offline note, download ring with %, pressed and hover states, and forced-colors support. Against that: five inventory mismatches; the selected panel row lacks a designed selected state; empty sidebar headings while loading; the light speed menu over the dark drawer. **Stability 8.0:** no core element moved in 72 measured steps across five flows and three widths, focus stays put through Play/Pause, and the late catalogue fills reserved skeleton rows. FLOW-06 and the message mismatches keep it out of Exemplary. | `craft`, `stability` |
| Clarity | **7.4** | The domain vocabulary is plain and consistent (View, Playlist, Entry, NOW/RESUME, "Playing"/"Paused" badge, "16:34 left" vs "45 min"), empty states say what to do, and the header button says Play / Pause / Play this. But desktop row actions are icon-only, the selection label "Next / Last go to" is cryptic, Playlist Entries can't be opened to their Episode, and "Add to another Playlist…" opens with the Active Playlist preselected. | `plain-language`, `feedback` |
| Platform fit | **6.7** (cap 6.9) | **Looks 8.0:** it fills the viewport, has bottom tabs on the phone and a sidebar on the desktop, uses native selects, checkboxes, radios and range, reflows to 320 px, and has a dark player that suits a media app. **Behaves 6.0:** URLs, titles, reload and real links are good. Back with an overlay open throws away the screen (Android), ⌘-click is hijacked, the desktop list is a Tab treadmill, and in the Mac window there's no context menu and no Back. (8.0 + 2×6.0) ÷ 3 = 6.7; BROWSER-01, -04, -06 and LIST-07 cap it at 6.9. | `conventions`, `stability` |
| Interaction & feedback | **6.5** (cap 6.9) | Fast: p75 111–134 ms, LCP ≈0.4 s at 4× CPU. Fully operable by keyboard, with Space for play/pause, focus to the h1 on navigation, APG menus, F6 to the toast, and Undo on every row action. Against that: the drawer leaks focus, focus is lost when the panel closes, undo is one step and 6 s with no Entry removal, relaunch forgets the view, there's no reduced motion, and selection is colour-only. | `forgiveness`, `keyboard-efficiency`, `feedback` |
| **Overall** | **7.0** | It serves the primary task well and looks at home on an Android phone; the character is distinct and consistent. What holds it at Strong's floor is the browser and assistive-tech contract: four categories are capped at Competent by eleven major failures. Limit: lowest category 6.5 + 2.0 = 8.5. | — |

### What stands between this and 9.0

1. **Clear every major (11).** Nothing scores above 6.9 in Typography, Color & contrast, Platform fit or Interaction & feedback until then. Most are small and local: the modifier check, reduced-motion CSS, the drawer trap, panel focus return, `aria-current` plus a row tint, a history entry per overlay, and last-route restore. The larger three are an Entry Remove control with a real undo stack, an APG grid for the desktop list, and a large-text row layout.
2. **Then the craft gap to Exemplary.**
   - Hierarchy and iconography: surface row actions on hover or selection, so the list reads as titles rather than as a column of blue dots and twin glyphs.
   - Typography: one size per text role.
   - Consistency: the inventory mismatches.
   - Mac window: a context menu and a Go menu.
   - Timing: time more flow steps (Add, Play Next, Star, open the drawer) so RESP-01 rests on the whole task.

## Next step

- **Target:** a major failure in the lowest-scoring category (Interaction & feedback, 6.5), the one closest to the primary task: DATA-04 / WDATA-04.
- **Anti-pattern:** *Toast-and-vanish*.
- **Root cause:** Playlist membership can be changed but never un-changed. No Remove exists on Entries, so the 6-second, one-deep toast Undo is the only way back from a mistaken Play Next or Play Last.
- **Change:**
  - Add Remove to each Playlist Entry (a trailing overflow or swipe-to-remove on the phone with a visible button equivalent; a row action on desktop) and to Up next, through the existing `RemoveEntry` operation.
  - Keep a session undo stack that ⌘/Ctrl-Z walks outside text fields.
  - Then the toast can stay a brief confirmation.
- **Principle:** `forgiveness`.
- **Expected effect:** clears DATA-04 and WDATA-04, so Interaction & feedback ≈ +0.4 (still capped by WKEY-03, DATA-06 and AX-02). No regression expected. The Playlist row gains one control, which must not move the Play-from-here button (FLOW-01).
