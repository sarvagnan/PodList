# UI grade, round 15

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), as a **web app**. The Mac shell (packages/desktop) is graded separately for Platform fit only. This was an independent read: no earlier round reports or work lists were consulted.

Evidence: the flow run in `scratchpad/flows-r15` (summary, measurements.json, strips), and my own probes in `scratchpad/grade-r15/` (Playwright Chromium 1.65, headless, device scale 2, service workers blocked, no throttling, darwin arm64; Electron 44.9.3 via `_electron`). Scripts there: `screens.mjs`, `kbd.mjs`, `grid.mjs`, `remove.mjs`, `overlays.mjs`, `scan.mjs` (contrast, text size, targets), `adapt.mjs` (320 px, 200% text, 200% zoom, forced colors, reduced motion), `lib200.mjs`, `misc.mjs`, `editor.mjs`, `firstrun.mjs`, `more.mjs`, `final.mjs`, `names.mjs`, `electron.mjs`.

## Frame

- **Task:** pick Episodes from Views into Playlists, and listen from a Playlist (play, skip, resume, reorder, clear).
- **Target:** web app, an Android-first installable PWA; the same build in an Electron window on the Mac (graded for Platform fit as its own target).
- **Posture:** sovereign on the desktop (a window kept open while listening); transient-to-sovereign on the phone.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things (calm personal tool, list-first, quiet chrome).
- **Character:** (1) Views and Playlists as equal halves, navigated by lists, never capsules (owner); (2) Space Grotesk titles over Inter text (owner); (3) blue primary #2b50c8 on a warm off-white page (owner); (4) a dark player bar and dark Now Playing drawer (owner); (5) solid coloured initial tiles as placeholder Artwork, and plain-spoken domain copy ("Clear on Played", "Rewind to here").
- **Owner decisions:** light appearance only; layout variant A; Inter and Space Grotesk; blue primary; dark player bar; View editor R, Playlist settings and Rewind C, Library C. Graded, not targeted.

## Flows

Tasks run (flows-r15): browse, listen, now playing, fresh device (late catalogue held 2 s), second tab · widths 412×915, 720×450, 1440×900 · Light only · timed runs: 5 after warm-up, desktop, no throttling, darwin arm64 · script `packages/web/ui-flows/flows.mjs` · measurements `flows-r15/measurements.json` · strips `flows-r15/strips/*`.

Failures: none. Every core element held within 2 px; no unprompted focus or scroll moves; nothing typed was lost.

Timed p75: open a Playlist 130 ms; Play from here 97 ms (both under 200 ms).

My own probes add: focus after a row leaves (Mark Played in an Unplayed View) lands on the same action in the next row; Undo (button or ⌘Z) brings the row back and focuses it; Back with the drawer open closes the drawer without leaving the page; Back restores the list's scroll and focuses the row that was opened; reload restores scroll (search at y=500 stays at 500).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop grid / phone list) | Dark toast, bottom-leading of main (desktop) or above the player (phone): "Marked Played" | none seen | none | "Undo" in the toast; ⌘Z/Ctrl+Z | View with 0 Episodes: count "0" in the list | none | Header trailing: Edit View (desktop), Edit (phone) | Filter summary line under the title |
| Playlist (Entries / History / Timeline) | Same toast: "Removed from Commute", "Moved “The quiet edge…”" | none seen | Rewind: centered dialog, "Rewind Commute to 14:30?" Cancel / Rewind | Toast Undo; Rewind undoable afterwards | Dashed card, centered: "Nothing finished yet" + one line | none | Header trailing: Play / Play this (filled blue) | Timeline intro paragraph |
| Episode detail | Toggle states (Played, Star) | none seen | none | ⌘Z | n/a | none | Centered action row, Play filled | none |
| Library / Add podcasts | Subscribed row state | Inline under field, red text + red border: "Enter the whole address, starting with https://" | none | n/a | First run checklist | none | Header trailing: Add podcasts (filled) | Field hint: "Any podcast’s RSS address; no directory needed." |
| Playlist settings / Trash | Toast: "Moved “Workshop” to the Trash", "Restored “Workshop”" | none seen | none (delete goes to Trash) | Toast Undo; Restore in Trash | "The Trash is empty" + one line | none | n/a | "Deleted Playlists are kept for 30 days." |
| Settings | Live apply | none seen | none | n/a | n/a | none | n/a | Row subtitles |
| Now Playing drawer | Toasts pad above the drawer | Player errors use --player-danger | none | Toast Undo | n/a | none | Play, centered | none |

Mismatches: none found. Success messages are one form (dark toast, past-tense verb phrase), Undo is always "Undo" in the toast plus the shortcut, errors are inline under the cause, the main action is always header-trailing.

## Checklist

Coverage: **91.8%** (pass 88 · fail 2 · N/O 8 · N/A 7). Mac IDs: N/A → target.

Failures by severity:

- **[AX-01] blocker — dialogs without an accessible name.** The Now Playing drawer is named only on its main page (`aria-labelledby` → the Episode title). When it shows its stacked pages, the `role=dialog` element has no `aria-label` and no `aria-labelledby`: the **Up next** page (opened from the "2 up next" badge or the "Up next · 2" button) and the **Episode** page, at both 1440 and 412 widths. Every toast is also an unnamed `role=dialog` (`aria-modal=false`) inside the "Notifications" region: "Removed from Commute / Undo", "Marked Played / Undo", "Moved “Workshop” to the Trash". Evidence: `names.mjs` output; `final.mjs` ariaSnapshot shows `dialog:` with no name above `heading "Up next"`. Fix: point the drawer Popup's `aria-labelledby` at the visible heading of whichever page is on top ("Up next", "Episode", or the title), and give each toast a `Toast.Title` (the message), or render toasts without the dialog role (`role=status` inside the existing live region) since they're non-modal.
- **[WTYPE-02] major — Library table loses the podcast names when text is enlarged.** With the browser's font size at 150% or 200% (html 24 px or 32 px) at 1440×900, the table's fixed rem columns plus `min-w-[40rem]` squeeze the Podcast column to 12–16 px: every podcast name link measures **0 px wide**, the artwork tile is crushed to a pill, and the "PODCAST" heading overlaps "UNPLAYED" ("PODCASUNPLAYED"). Evidence: `lib200.mjs` (`Deep Field 0x44`, `Podcast@344w16`); `t200-desktop_library.png`, `lib-24px.png`. Browser zoom to 200% (720×450) passes, because that width gets the list layout. Fix: give the Podcast column a minimum (`min-width: 12rem` on its `col`, or `table-layout: auto` with `minmax`), and switch to the list layout (already built for narrow widths) with a container query when the table's minimum width exceeds its container, not only by viewport width.

N/O: CTRL-02, CTRL-08, LIST-05, DRAG-05, DRAG-06, PTR-03, FOOT-02, BROWSER-10.

N/A: AX-05 (no autoplay; audio is the content), START-04, START-05 (no permission prompts), START-06, START-07 (no accounts), TOOL-06 (no hideable toolbars), SIDE-03 (the sidebar can't be hidden).

Pass (evidence in brief):

- **Flow stability** FLOW-01 to FLOW-07: flows-r15 summary "None"; toasts and follow-ups sit above the player bar at every width; main action is header-trailing on every screen kind.
- **Keyboard** KEY-01, KEY-04 (skip link; 2 px ring, white on dark surfaces; every stop in `kbd.mjs` shows a ring), KEY-06, KEY-07 (PageDown/End/Home scroll natively; Space is documented play/pause and can be turned off), KEY-08 (⌘/ or Ctrl+/ reference, sidebar entry).
- **Dialogs** DLG-01 (delete goes to Trash with Undo; the one confirm is Rewind), DLG-02 to DLG-05, DLG-07, DLG-09 (sleep timer is an APG menu; Esc returns to its button).
- **Controls** CTRL-03 to CTRL-07.
- **Lists** LIST-01 to LIST-04, LIST-06, LIST-07 (the View list is one Tab stop; ↑↓, ←→ across actions, Home/End, type-ahead, Space selects, Shift-↓ extends, Enter opens the Episode beside the list).
- **Data** DATA-01, DATA-04, DATA-05 (Undo refocuses the restored row), DATA-06 (scroll and view survive reload; the Mac app reopens on the last screen).
- **Drag** DRAG-01 (keyboard reorder: Space, ↓, Space, announced "moved to position 2 of 4"), DRAG-03 (Undo).
- **Pointer** PTR-04 (tooltips on focus, "Remove from Commute").
- **Appearance** APPEAR-03 (forced colors keep boundaries, progress and selection; `forced-color-adjust: none` only on progress), APPEAR-04 (no text under 4.5:1 on any scanned screen, including the drawer), APPEAR-05 (reduced motion: drawer fades 0→1 at a fixed y; without it, slides 915→40), APPEAR-09 to APPEAR-11.
- **Type** TYPE-02, TYPE-03, TYPE-05 to TYPE-08 (curly quotes and apostrophes, true minus in "−16:34", letterspaced caps labels).
- **Copy** COPY-01 to COPY-04.
- **Accessibility** AX-02, AX-04.
- **Start** START-01 to START-03 (first run is a skippable checklist; "Show getting started" in Settings).
- **Edit** EDIT-02, EDIT-05 (Copy Link in the row menu; Share on Episode).
- **Windows, sidebars, settings** WIN-03, SIDE-04, SET-01.
- **Responsiveness** RESP-01 (p75 130 ms and 97 ms).
- **Browser frame** BROWSER-01 to BROWSER-09 (tabs, the open Episode and the editor are in the URL: `?tab=timeline`, `?episode=…`, `?edit=true`; titles change per view; right-click on links and text keeps the browser menu; row menus are added only on rows, their commands are also on hover/focus buttons; Ctrl+K left to the browser off the Mac).
- **Keyboard & focus** WKEY-01 to WKEY-04 (dialogs trap Tab and return focus to their opener on Esc; after a row is removed focus moves to the next row; `scroll-padding-bottom` keeps focus clear of the player).
- **Forms & data** WDATA-01 to WDATA-04 (toasts stay until dismissed: still present after 9 s).
- **Appearance (web)** WCOLOR-01 (`color-scheme: light`), WCOLOR-02.
- **Type & sizing (web)** WTYPE-01, WTYPE-03 (WCAG text-spacing overrides clip nothing on View, Playlist, Library, Settings), WTYPE-04 (sub-24 px checkboxes meet the spacing exception), WTYPE-05 (no horizontal scroll at 320 px on seven screens).
- **Writing** WCOPY-01 (⌘K and ⌘/ only on a Mac; Ctrl+ elsewhere).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by WTYPE-02; 8.6 uncapped) | A small scale with roles: Space Grotesk titles (28 px), Inter rows (15 px), metadata 13 px muted, letterspaced caps section labels; curly punctuation and a true minus. Below Exemplary even uncapped: at enlarged text sizes icons and the 224 px sidebar stay fixed (the search glass is ~8 px beside 32 px text; "New this week" wraps), and the Library table loses its names. | hierarchy, accessibility |
| Hierarchy | **8.6** | The list leads; one filled blue action per header (Play / Add podcasts / Done); row actions surface on hover or focus; the dark player recedes into a band. Short of 9: the desktop Episode detail centers its action row in a 672 px column while its header, sections and Resume button are left/right aligned, so the eye has no column to follow. | content-first, hierarchy |
| Spacing & density | **8.2** | Consistent 4 px rhythm, row heights and gutters; density fits each width (table on desktop Library, list on phone). Measured breaks: the Listening Timeline intro starts at x=224 while the title and list start at 256/248 (desktop) and 16 vs 20 px on the phone; the Episode detail action row starts at x=348, aligned to neither the artwork (256) nor the title (368); the phone drawer leaves ~150 CSS px of empty dark space below "Episode / Up next" at 412×915. | craft |
| Color & contrast | **8.6** | Restrained: one blue for action and selection, green only for Played, amber only for Star; every scanned text passes 4.5:1, including the dark drawer and player; forced colors handled. Held below 9: the selected segment (Entries / History / Listening Timeline, Add podcasts modes) is a white fill on #ecebe6 (1.15:1) with selected and unselected labels at the same weight 500 and only 2.7:1 apart, so the state is faint. | color-restraint, accessibility |
| Iconography | **8.4** | One Lucide family at matching weight; standard glyphs (check = Played, star, download, gear, trash). Gaps: the desktop row's hover cluster mixes text buttons ("Next", "Last") with icon-only buttons (+, star, check, download); the Add podcasts preview tile uses a pale tile with a different initials face from the solid tiles everywhere else. | conventions, craft |
| Consistency & polish | **8.5** (stability **9.2**) | Toasts, Undo, inline errors, empty cards and header actions are the same everywhere (no inventory mismatches); every state seen (hover, focus, pressed, selected, empty, error, offline, forced colors, reduced motion) is designed; flows hold still. Held back by the craft gaps above and two unfinished edges: the Trash rows' buttons are all just "Restore", and the phone player bar has no queue badge although the design gives both bars one. | craft, stability |
| Clarity | **8.8** | Plain domain words carry the model ("Clear on Played", "Keeps Entries", "Rewind to here", "Next and Last go to"); state is always visible (NOW / RESUME / HERE, Paused chip, Active marker); the Rewind confirmation says what moves and what's kept. | plain-language, feedback |
| Platform fit | **8.9** web (Looks 8.8, Behaves 9.0) · **7.8** Mac shell (Looks 7.0, Behaves 8.2) | Web: every state worth sharing has a URL, Back closes overlays before leaving a page and restores scroll and focus, real links everywhere, browser menus left on links and text, APG grid and menus, adapts to 320 px, zoom and forced colors. Mac shell: a full native menu bar (Settings… ⌘,, labelled Undo, Controls, Go, Help with the shortcut list), native row context menus, swipe-back, restored window. Foreign or missing on the Mac: Search on ⌘K rather than Edit › Find (⌘F); Electron's "Toggle Full Screen" label; no View › Show/Hide Sidebar; no PodList Help document; window title "Default · PodList" rather than the view name alone; brand-blue rather than accent-colour selection. | conventions, stability |
| Interaction & feedback | **4.9** (capped by AX-01; 9.0 uncapped) | Uncapped it is Exemplary: keyboard-fluent grid with type-ahead, Undo for every edit (toast and ⌘Z), keyboard reorder with live announcements, focus that follows removals, p75 under 130 ms. The cap is the unnamed dialogs. | keyboard-efficiency, forgiveness, feedback |
| Overall | **6.9** (cap: lowest 4.9 + 2.0; 8.6 uncapped) | Serves the primary task very well and is at home in the browser. The one serious flaw is AX-01: a screen reader opening Up next or getting a toast hears an unnamed dialog. With AX-01 and WTYPE-02 fixed the caps lift and the app sits at about 8.6; what remains between it and 9.0 is craft (alignment, the selected-segment state, mixed icon/text actions, enlarged-text icon scaling, Mac shell idioms). | |

## Next step

- **Target:** AX-01 (the only blocker).
- **Anti-pattern:** none named; an accessible-name gap in a custom drawer stack and toast.
- **Root cause:** the drawer's stacked pages swap content inside one Base UI `Drawer.Popup` whose `aria-labelledby` is only wired for the main page's title, and toasts are rendered with Base UI's toast root (role=dialog) without a `Toast.Title`.
- **Change:** set the Popup's `aria-labelledby` to the id of the top page's `h2` ("Up next", "Episode") on every page; render each toast's message as `Toast.Title`.
- **Principle:** accessibility.
- **Expected effect:** Interaction & feedback 4.9 → about 9.0; Overall cap lifts to 8.6. Then WTYPE-02 (Typography 6.9 → about 8.6).

### What stands between the app and 9.0 once the caps are gone

1. Library table: minimum Podcast column and a container-query switch to the list layout (WTYPE-02).
2. Episode detail (desktop): align the action row to the title column (x=368) or the page edge, and keep Resume in the same column measure.
3. Listening Timeline: put the intro paragraph on the page's text edge (it is 32 px left on desktop, 4 px on the phone).
4. Selected segment: weight 600 for the selected label and a 1 px border at 3:1 (#8c877e) or a darker fill, so the state reads at a glance.
5. Desktop row actions: make the hover cluster one kind (icons with the existing tooltips, or all text).
6. Enlarged text: size icons and the sidebar in rem so they grow with the text.
7. Placeholder artwork: use the solid tile in the Add podcasts preview.
8. Phone player bar: add the queue badge the design specifies.
9. Trash: name each Restore button ("Restore Workshop").
10. Mac shell: Edit › Find (⌘F) for Search, "Enter Full Screen" wording, View › Show Sidebar, a Help page, window title without "· PodList".
