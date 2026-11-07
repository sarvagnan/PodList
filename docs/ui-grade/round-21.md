# UI grade, round 21

Full audit per `~/Documents/UI_Guidelines/CRITIQUE.md`, graded independently (no earlier round or work list read). Build: worktree at 7bd406d. Browser: Playwright Chromium (bundled with @playwright/test 1.65.0), service workers blocked, 100% zoom unless noted, device scale 1 (2 for the touch-phone run). Mac shell: Electron 44.9.3 launched with Playwright `_electron`.

## Frame

- **Task:** find Episodes through Views and Search, line them up in Playlists, and listen (player bar, Now Playing drawer), with the Library and Subscriptions kept in shape.
- **Target:** web app (Android-first installable PWA); the Mac app is the same build in an Electron window, so Platform fit also weighs the Mac shell's menus and context menus. Mac IDs: N/A → target.
- **Posture:** sovereign on desktop (an all-day listening tool), transient on the phone (open, play, pocket).
- **Audience:** perpetual intermediate, with an expert keyboard path.
- **Nearest exemplar:** Things 3: a calm personal tool, few concepts, one list per screen, actions surfaced on hover and selection.
- **Character:** (1) the dark player bar and dark Now Playing drawer under a warm off-white page (#f6f5f2) *(owner-fixed)*; (2) Space Grotesk titles over Inter body *(owner-fixed)*; (3) one blue, #2b50c8, for primary actions, selection, progress and the Active Playlist *(owner-fixed)*; (4) the domain words as capital-letter nouns (View, Playlist, Entry, NOW / HERE / RESUME); (5) Views and Playlists as equal halves, navigated as lists *(owner-fixed, variant A)*.
- **Owner decisions:** light appearance only for now; layout A; Inter and Space Grotesk; blue primary; dark player; designs R (View editor), C (Playlist settings, Rewind, Library). Graded, not targeted.

## Flows

- **Tasks run (provided flow run, flows-r21):** browse, listen, now playing, fresh device, second tab, at phone 412×915, zoomed desktop 720×450 and desktop 1440×900; light only; late arrivals held 2000 ms. Script: `packages/web/ui-flows/flows.mjs`. Measurements: `flows-r21/measurements.json`; strips: `flows-r21/strips/*`.
- **Timed runs:** desktop, 5 runs after warm-up, no throttling, darwin arm64. p75: open a Playlist 122 ms; Play from here 103 ms.
- **My own probes** (scripts and captures under `scratchpad/grade-r21/`): keyboard Tab order, grid arrows, focus after removing rows, Undo, Back with the drawer and sheets open, Esc and focus return, right-click and the keyboard context menu, scroll restoration, forced colors, reduced motion, 200% text, the WCAG 1.4.12 spacing override, 320 px reflow, a contrast and target-size scan of 11 screens at two widths plus the drawer, lab Core Web Vitals, first run on an empty Library, and the Electron shell at its default and minimum size.
- **Lab Core Web Vitals:** CLS 0.000–0.015, LCP 32–360 ms (desktop and phone, three screens each).
- **Failures:** none of FLOW-01 to FLOW-04 (flow summary: "Stability failures: None"). FLOW-05 fails on first run (below; `fd-first.png`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (list + target panel) | Dark toast, bottom-leading above the player: "Marked Played · Undo" | none seen | none | Toast Undo; ⌘Z/Ctrl+Z ("Undone: Marked Played") | Target panel: plain muted sentence "Nothing up next. Use Next or Last…" | none | Header trailing: Edit View (gray pill), Play per row (blue) | Subtitle summarises the conditions |
| View editor | Live apply; no message on change | none | none | ⌘Z, toast "Undone: Edited “New this week”" | n/a | none | Done (blue pill), panel top-trailing | "Every row must match…" under the form |
| Playlist | Toast "Removed from Commute · Undo", "Moved “…” · Undo" | none | Rewind: centred modal, Cancel / Rewind | Toast Undo; ⌘Z | History: dashed card, "Nothing finished yet" + hint | none | Header trailing: Play / Play this (blue pill) | Timeline explains Rewind in one paragraph |
| Playlist settings | Name "Saved as you type." (hint) | none | none | Delete → toast "Moved “Workshop” to the Trash · Undo" | n/a | none | none (live) | Inline hints |
| Library / Subscription | none needed (selects apply live) | none seen | none | n/a | (not reachable with data) | none | Header trailing: Add podcasts (blue pill) | Hints under each setting |
| Add podcasts sheet | Result row with Subscribe | **Format error:** 13 px red line replacing the hint under the field. **Fetch error:** 15 px red paragraph below the restored hint | none | n/a | Hint under the field | none | Subscribe per result (blue) | "Type a podcast’s name…" |
| Search | n/a | none | none | n/a | Dashed card "Search your Library" + hint | none | Save as View (gray pill, header trailing) | Hint under the field |
| Episode (page / panel / drawer) | Toasts as above | none | none | Toast Undo | n/a | none | Play, centred in the action row | n/a |
| First run | Step ticks | none | none | n/a | Solid white card "Welcome to PodList" | none | Add podcasts (blue) | Three steps |
| Sync (sidebar) | n/a | "Offline · 1 change will sync when you’re back online", sidebar bottom | n/a | n/a | n/a | Second-tab gate (flow "second tab") | n/a | n/a |

**Mismatches**
1. **Add podcasts errors** take two forms in one field: a 13 px red line that replaces the hint, and a 15 px red paragraph below the hint (`fd-add-error.png` vs `fd-add-error2.png`).
2. **Empty states:** a dashed card on History and Search, a bare sentence in the target panel and the drawer's Up next. The welcome card is a different kind of message, so it isn't counted.
3. **Where an Episode opens on desktop:** in the side panel from a View or a Playlist (`?episode=`), as a full page from a Subscription (`td-ep-from-lib.png`).
4. **Heading position:** on desktop, a "‹ Playlists / ‹ Library / ‹ Podcast" back link sits above the H1 on Trash, Subscription and Episode, so their headings are at y = 101 while every other screen's is at y = 53, even though the sidebar already shows where you are (`f2-trash.png` vs `d_playlists_default.png`).
5. **Row menus:** View, Playlist, Subscription and drawer rows have a right-click menu; Library rows don't (`ctx.mjs`: "library row menu []").

## Checklist

**Coverage: 95.9%** (pass 92 · fail 2 · N/O 4 · N/A 7). Applicable = 98 core + web IDs; Mac IDs: N/A → target (out of the count).

**Failures by severity**

- **[LIST-06] major: navigation shows the wrong section when an Episode opens from the Library or a Playlist.** On the phone, open Library › Market Hours › any Episode, or Playlists › Commute › an Entry's title: the bottom tab bar switches to **Views** (`tabs.mjs`: "episode from library … current: Views"; `ph-episode-from-sub.png`), while the back link says "‹ Podcast" or "‹ Commute". On desktop the same Episode from a Subscription leaves *nothing* selected in the sidebar (Library loses its highlight; `td-ep-from-lib.png`). The cause is in `AppShell.tsx` `BottomTabs.section()`: every `/episodes/*` path is mapped to Views. **Fix:** derive the section from where the Episode was opened (the `cameFrom` the back link already uses, or a `from=` search param so it survives reload): keep the originating tab selected on the phone and the originating sidebar item (Library, or the Playlist) highlighted on desktop. Also name the podcast in the back link ("‹ Market Hours", not "‹ Podcast"). This failure also covers SIDE-04's desktop symptom; it is counted once.
- **[FLOW-05] minor: on first run, the target panel doesn't share the list's top edge.** With an empty Library on desktop, the "Next and Last go to · Default" panel starts at y = 446, below the welcome card, instead of at the list column's top (y = 114 to 130) (`fd-first.png`). **Fix:** put the welcome card inside the list column (the grid's first cell), not above the two-column grid, so both columns start at the same y.

**N/O:** LIST-05, DRAG-06, EDIT-02, FOOT-02.

**N/A:** AX-05 (no autoplay; the audio is the content), START-04 and START-05 (no permission prompts), START-06 and START-07 (no accounts), TOOL-06 and SIDE-03 (nothing can be hidden). Mac IDs: N/A → target.

**Passes worth recording (evidence):**
- KEY-01 / WKEY-01: View list is one Tab stop with APG grid arrows, Home/End and type-to-select. Tab order: skip link → sidebar → header → grid → panel → player.
- WKEY-03: focus goes to the H1 after navigation. Focus moves into the drawer and stays trapped (30 Tabs inside); Esc returns focus to "Open Now Playing". Browser Back closes the drawer, the Add sheet, Edit View and drawer sub-pages without leaving the screen.
- Focus after removing a row: "Remove … from Commute" → the next row's Remove button; Mark Played in an Unplayed View → the next row's Played button.
- DATA-04: Undo works everywhere: toast Undo plus ⌘Z/Ctrl+Z, a labelled Undo in the Mac Edit menu, a reversible drag reorder, Delete Playlist to Trash, Delete View.
- BROWSER-01 to -04: every state has a URL (`?tab=history`, `?episode=`, `?edit=true`, `/search?q=`), tab titles name the view ("Default History · PodList"), and navigation uses real links.
- BROWSER-06: the row menu opens on right-click and from a keyboard `contextmenu` on a focused cell, with arrow keys; links, fields and selected text keep the browser's menu (`defaultPrevented: false`). Mac shell: the native row menu (`main.ts` `rowMenu`).
- WCOPY-01: ⌘K and ⌘/ appear only when `navigator.platform` is Mac; elsewhere "Ctrl+/" and "/".
- APPEAR-04: no text below 4.5:1 on any of 11 screens at 1440 and 412, or in the dark drawer (main page and Queue).
- APPEAR-03: forced colors keep boundaries, NOW rows, progress and the selected tab (`forced-d_*.png`).
- WTYPE-01: no text under 12 px.
- WTYPE-02: at 200% text, nothing scrolls horizontally on any screen. The desktop player bar drops Speed and Sleep, and the phone bar drops Back 15 and Queue; all four remain in the drawer.
- WTYPE-03: the 1.4.12 spacing override clips nothing beyond the deliberate line-clamped player title.
- WTYPE-04: checkboxes have 40 px labels; undersized title links pass the spacing exception.
- WTYPE-05: no horizontal overflow at 320 px.
- WDATA-04: Undo toasts stay until dismissed (still present after 7 s). Status messages are polite live regions.
- RESP-01: p75 122 ms and 103 ms.
- DRAG-05: grab cursor, lifted card, and "moved to position 3 of 4" announced.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | A small scale with one role each: 28 px Space Grotesk titles, 18 px panel headings, 15 px Inter rows, 13 px muted metadata, 12 px caps labels at 0.08em. Typographic punctuation throughout (TYPE-08: no straight quotes or "..." in UI strings). Below Exemplary because: (a) the phone mini player gives the title about 104 px, so "The long life of / a shipping…" and "Market Hours ·…" truncate on every screen (`p_views_new-this-week.png`); (b) icons and control padding are in px, so at 200% text the 16 px search, plus and settings glyphs sit tiny beside 32 px labels (`t200d_playlists_default.png`). | hierarchy, craft |
| Hierarchy | **8.5** | The squint test passes: title, then the blue primary pill (Play / Add podcasts), then rows; chrome is quiet; secondary row actions appear only on hover or focus (Things-like). Held back by: (a) on 1440 px screens, Playlist, Library, Trash and Settings stop at 1152 or 896 px, leaving a 290–540 px empty band beside full-width Views and Search, so pages feel left-heavy and inconsistent in width; (b) Episode detail's "Share" floats alone under the metadata, apart from the seven-button action row; (c) the Episode side panel changes the designed action row (Play alone above a 3×2 grid) from the full page's single row (`kb-enter-title.png` vs `d_episode.png`). | content-first, hierarchy |
| Spacing & density | **8.3** | A consistent 4 px grid and calm row rhythm (View rows 76 px, Entries 68 px); posture-appropriate density at all three widths. Held back by: FLOW-05 (first-run panel top 446 vs 130); the Search field ends at x = 832 while results end at 1016 and Save as View at 1408 (three right edges on one screen, `f2-search-results.png`); the header grows 2 px when the bulk bar replaces the picker (heading y 53 → 55, within tolerance but visible, `f2-bulk.png`); Trash rows have no artwork, separators or chevron, unlike every other list. | craft, hierarchy |
| Color & contrast | **8.7** | Restrained: one blue for action, selection, progress and the Active Playlist; green for Played; amber for Star; the dark player is a deliberate second surface with its own lighter progress blue (#7f9cf5, 5.8:1). Every text sample passes, including the drawer and placeholders. Forced colors are handled; light-only is the owner's decision (WCOLOR-01 passes with `color-scheme: light`). Below Exemplary because the tinted blue Play circle repeats on every row (5–15 accent shapes per list), which dilutes the single primary per screen. | color-restraint, accessibility |
| Iconography | **8.6** | One Lucide family at matched stroke, custom 15/30 skip glyphs that read instantly, tooltips on hover *and* focus, accessible names on every icon button. Held back by: Trash is the only sidebar item with an icon; Next / Last use list-insert glyphs whose meaning depends on their labels; the Active Playlist marker is a bare dot (a waveform while playing) with no visible legend. | conventions, craft |
| Consistency & polish | **8.3** (stability 8.4) | All states are designed: hover, pressed, focus-visible (white on dark), empty, loading ("Checking the address…"), error, offline with pending count, drag. Flows hold every core element at three widths. Stability 8.4: no FLOW-01–04 failures, but FLOW-05 and inventory mismatches 1–5 (two error forms in Add podcasts, two empty-state forms, Episode as panel vs page, heading y 53 vs 101, Library rows without a row menu). | craft, stability |
| Clarity | **8.5** | Plain domain vocabulary carries the model ("Next and Last go to", NOW / HERE / RESUME, "Clear on Played", "Rewind to here" with an exact list of what is kept). State is visible: Active Playlist, offline with pending changes, Played ticks. Held back by: the wrong tab in LIST-06 (counted there); the generic "‹ Podcast" back label; Add podcasts' Search tab says "Podcast name, or a feed address", duplicating the Feed address tab next to it; the phone Settings screen offers a "Single-key shortcuts" option that means nothing on a touch phone. | plain-language, feedback |
| Platform fit | **6.9** (capped by LIST-06; uncapped 8.7: Looks 9.0, Behaves 8.6) | **Web:** real links, a URL for every state, Back closes overlays first, browser menus kept on links, text and fields, native selects and inputs, zoom and reflow intact, OS-correct shortcut notation, PWA back links on every drilled screen. **Mac shell:** a full menu bar (App with Settings… ⌘, · File · Edit with a labelled Undo · View · Controls · Go · Window · Help), native row and text context menus, the window titled by the view, minimum 720×450, restores the last screen and works offline. **Foreign:** the tab bar and sidebar losing or misreporting the section (LIST-06); in the Mac window, Settings is a page in the main window (L8) at 15 px web body type, which is acceptable for a shared build but keeps the shell from Native. | conventions, stability |
| Interaction & feedback | **8.8** | Keyboard-fluent: grid navigation, type-to-select, PgUp/PgDn, ⌘A, Space to select, a shortcut reference (⌘/). Single-key shortcuts can be turned off. Undo everywhere instead of confirmations; the only modal is Rewind. Instant (p75 ≤ 122 ms). Focus is managed through removals, overlays and view changes. Below Exemplary because: New View lands on its heading, with the Name field four Tabs away on desktop, while New Playlist focuses its name field; in the drawer, Esc first closes a focused control's tooltip, so closing takes two presses. | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **8.3** | It serves the task very well and is at home in the browser and as a Mac window. The weakness holding it down most is navigation state: an Episode opened from the Library or a Playlist reports the wrong section (LIST-06), which caps Platform fit. After that come layout-width and heading-position inconsistencies across desktop screens. Cap: lowest 6.9 + 2.0 = 8.9 (not binding). | |

## What stands between this and 9.0

1. **Fix LIST-06** (major). It lifts Platform fit from its 6.9 cap to about 8.7 and Overall by about 0.3.
2. **One desktop page frame:** the same content width and heading y on every screen. Either let Playlist, Library, Trash and Settings use the full main column, as Views do, or give the empty band a role. Put back links in one place, or drop them on desktop where the sidebar shows the location.
3. **One form per message kind:** a single Add podcasts error style (under the field, replacing the hint), and one empty-state component everywhere, including the target panel and Up next.
4. **Episode detail parity:** the same action-row arrangement in the panel, the page and the drawer, with Share in that row; open from a Subscription in the same way as from a View.
5. **Craft:** a wider phone mini-player title (drop Back 15 below about 380 px instead of squeezing the title); icons that scale with text; New View focuses Name; the Library's row menu; first-run grid alignment (FLOW-05).

## Next step

- **Target:** LIST-06 (major, Platform fit, closest to the primary task: opening an Episode).
- **Anti-pattern:** lost place. Navigation chrome disagrees with the content, so the person can't tell which section they are in.
- **Root cause:** `BottomTabs.section()` in `AppShell.tsx` maps every `/episodes/*` path to Views, and the desktop sidebar has no rule for Episodes at all, although `cameFrom` already knows the origin.
- **Change:** carry the origin section with the Episode route, for example as `?from=library|playlists|views` set from `cameFrom` and kept on reload. Select that tab on the phone and that sidebar item (Library, or the Playlist) on desktop. Name the podcast in the back link.
- **Principle:** feedback, conventions (LIST-06, SIDE-04).
- **Expected effect:** Platform fit 6.9 → about 8.7 (cap removed); Clarity +0.1; Overall about 8.6. No signature element is touched.
