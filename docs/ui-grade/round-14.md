# UI grade, round 14

Full audit against `~/Documents/UI_Guidelines` (CRITIQUE.md § Full audit), graded independently: earlier round reports and the UI-GRADE.md work lists were not read. Build: worktree at 922e506, `pnpm --filter @podlist/web build`, seeded demo (`ui-flows/demo.mjs`) and an empty demo for first run. Browser: Playwright Chromium (headless), service workers blocked, macOS arm64. Scratch scripts and screenshots: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r14/` (`shots/`, `*.mjs`).

## Frame

- **Task:** find Episodes through Views and Search, put them in Playlists, and listen (player bar, Now Playing drawer).
- **Target:** web app, an Android-first installable PWA; the macOS app is the same build in an Electron window, so Platform fit also reads the Mac shell (`packages/desktop/src/main.ts`) for menus, context menus and window behaviour.
- **Posture:** sovereign on desktop (a listening companion left open all day); transient on the phone (open, pick, play, pocket).
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things (a calm personal tool: one list, quiet chrome, actions on hover or selection).
- **Character:** (1) Space Grotesk headings over Inter text *(owner-fixed)*; (2) blue primary #2b50c8 used for play and selection *(owner-fixed)*; (3) the dark player bar and dark Now Playing drawer *(owner-fixed)*; (4) Views and Playlists as equal halves, navigation always as lists *(owner-fixed)*; (5) warm off-white page (#f6f5f2) with lettered square Artwork tiles and small letterspaced section labels.
- **Owner decisions:** light appearance only; layout variant A; Inter + Space Grotesk; blue primary; dark player; View editor R, Playlist settings and Rewind C, Library C. Graded, not targeted.

## Flows

Tasks run: browse, listen, now playing, fresh device, second tab (flow run `flows-r14`, `packages/web/ui-flows/flows.mjs`). Widths: phone 412×915, zoomed desktop 720×450, desktop 1440×900. Appearance: light only. Timed runs: desktop, 5 runs after warm-up, no throttling, darwin arm64. Measurements: `flows-r14/measurements.json`; strips: `flows-r14/strips/*`.

Failures: none. Timed p75: open a Playlist 129 ms, Play from here 97 ms (RESP-01 pass).

Extra probes this round (own scripts): keyboard paths and Tab order (`kb.mjs`), remove/undo/reorder/drawer focus and Back (`pl.mjs`), toast occlusion and drawer focus containment (`occl*.mjs`), 320 px / 200 % text / WCAG text spacing / forced colours (`adapt.mjs`), target size, small text and computed contrast over 13 routes at phone and desktop (`audit.mjs`), phone sheets, Back with a sheet open, Edit View, scroll restoration, Add podcasts (`phone2.mjs`), first run on an empty Library (`first.mjs`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (phone / desktop) | Dark toast above player, bottom-left of main on desktop: "Playing next in Default" | — | — | Undo in toast, persists until dismissed; ⌘/Ctrl-Z | Dashed card, centred: "Add podcasts to fill your Views" + link | — | Play per row (tinted circle); Edit / Edit View top-trailing | Facts line under heading |
| Search | same toast | — | — | same | "No Episodes match" (not forced) | — | Save as View, top-trailing | Line under field: "Every word must appear…" |
| Episode detail | same toast ("Starred") | — | — | same | — | — | Play, centred in action row (blue circle) | — |
| Playlist | same toast ("Removed from Workshop", "Moved “…”") | — | — | same | n/o | — | Play / Play this, top-trailing (blue pill) | Timeline: intro paragraph |
| Rewind | same toast | — | Confirm dialog listing what becomes unplayed | Undo | — | Dialog | Rewind to here (gray pill) | — |
| Playlist settings | "Saved as you type" under field | — | Delete → Trash | Trash + Restore | — | — | — | Helper sentences |
| Library / Subscription | "Subscribed to …", "Unsubscribed from …" (4 s toast, no Undo) | Inline in dialog: "Couldn’t unsubscribe. Check that you’re online." | Unsubscribe confirm dialog | — (resubscribe) | n/o | Dialog | Add podcasts, top-trailing (blue pill) | — |
| Trash | "Restored “…”" (4 s toast) | — | — | — | Dashed card, centred: "The Trash is empty" | — | Restore per row | Subtitle "kept for 30 days" |
| Now Playing drawer | same toast, **drawn over the drawer** | Player: "Couldn’t play this Episode." + Try again | — | same | — | — | Play (white circle) | — |
| Settings | live apply | — | — | — | — | — | — | Row sub-labels |

Mismatches:
1. **Play has three looks for one action**: tinted pale-blue circle (View, Search, Subscription rows), bare blue triangle with no container (Playlist rows), gray text pill "Play" (Episode › In your Playlists). Screens: View, Playlist, Episode detail.
2. **Undo toast placement on the drawer**: everywhere else the toast sits over page chrome it was designed around; over the drawer it lands on the drawer's own controls in the drawer's own colour (see WKEY-04, APPEAR-10). Screens: drawer vs every other screen.
3. **Persistent Undo toasts outlive their screen**: "Playing next in Default" made on a View still shows on Edit View and on any later screen until dismissed, while subscribe/unsubscribe/restore toasts fade in 4 s. Same column, two lifetimes, and the long-lived one drifts away from its context.

## Checklist

Coverage: **91.9 %** (pass 88 · fail 3 · N/O 8 · N/A 7). Mac IDs: N/A → target.

Failures by severity:

**Major**
- **[WKEY-03] Focus escapes the Now Playing drawer while an Undo toast is showing.** Evidence: `occl2.mjs after-move` — reorder an Entry (leaves "Moved “…” · Undo"), open the drawer; the dialog takes focus, but the first six Tabs go to *Move The quiet edge… (OUTSIDE) → Open Now Playing (OUTSIDE) → Back 15 (OUTSIDE) → Play (OUTSIDE)…*, i.e. to the page under the backdrop, on phone and desktop. With no toast (`click-fresh`) Tab stays inside (Close → Position → Back 15…). Background is not `inert` (`main.inert=false`). Likely cause: the toast viewport is a focusable region outside the popup, which breaks Base UI's focus guards, and `wrapTab` only wraps at the last/first control. Fix: make everything outside the drawer `inert` while it is open (set `inert` on the app root sibling, or render the drawer's own toast slot inside the popup), and render toasts inside the topmost modal while one is open so they stay reachable without opening a hole in the trap.
- **[WKEY-04] A lingering Undo toast fully hides drawer controls on the phone.** Evidence: `occl3.mjs` — Star an Episode, open Now Playing at 412×915: *Episode* and *Up next · 2* (y 708, 44 px) are hidden at 5/5 sample points when focused; screenshot `shots/phone-occl3.png`. Desktop: Speed and Sleep are 2/5 covered and the toast sits across the bottom of Play (`shots/desktop-drawer.png`). The toast's bottom offset comes from `--bottom-stack`, the page's mini-player + tabs, which the drawer covers. Fix: while the drawer is open, dock toasts to the drawer — above its last row of buttons, or in a reserved strip at the drawer's bottom — and add the toast's height to the drawer's scroll padding.

**Minor**
- **[APPEAR-10] The toast has no edge on the dark drawer.** Toast `bg-player` (#1b2a33) over drawer `bg-player`: the only separation is a shadow, so "Starred · Undo" reads as part of the drawer's controls (`shots/phone-occl3.png`). Fix: on dark surfaces give the toast a lighter fill (`--player-track` #2c3d47) and a 1 px `white/15` border.

N/O: CTRL-02, CTRL-08, LIST-05, DRAG-05, DRAG-06, FOOT-02, BROWSER-10, WDATA-03.

N/A: AX-05 (no critical audio-only information), START-04, START-05 (no permission prompts seen), START-06, START-07 (no accounts), TOOL-06, SIDE-03 (nothing can be hidden).

Selected passes, with evidence:
- KEY-01 / KEY-04 / WKEY-01: desktop Tab order is Skip link → Search → New View → Views → New Playlist → Playlists → Library → Settings → Keyboard shortcuts → Next/Last select → Edit View → one stop for the Episode grid → target panel → player (white focus ring on dark). Inside the grid, arrows move row and cell, Home/End, type-ahead; the ContextMenu key opens the row menu; Esc returns focus to the cell (`kb.mjs`).
- BROWSER-06: right-click on a row's empty space opens the row menu (Play Now, Next, Last, Add to…, Star, Mark Played, Open Episode, Copy Link); the title link, sidebar links and heading keep the browser menu (`defaultPrevented` false). Selected text keeps the browser menu.
- EDIT-05: ⌘C on a focused row copies its URL (`…/episodes/ep_a028…`) with a "Link copied" toast.
- BROWSER-01: Back with the Add sheet or the drawer open closes the overlay and keeps the URL; focus returns to the opener.
- FLOW-02 / DATA-05: removing an Entry by keyboard moves focus to the next row's Remove; Undo restores the row and focuses its title. Keyboard reorder announces "moved to position 2 of 4" and offers Undo (DRAG-03).
- WDATA-04: Undo toasts persist (`timeout: 0`); informational toasts fade after 4 s.
- APPEAR-04 / WTYPE-01 / WTYPE-04: no text below 4.5:1, nothing below 12 px, and no undersized target without the spacing exception across 13 routes at phone and desktop (checkboxes sit in 40 px labels; 21 px-high title links have clear 24 px circles).
- WTYPE-05 / WTYPE-02 / WTYPE-03: no horizontal scroll at 320 px or 200 % text (Library's table scrolls within its own region at 200 % desktop, a data-table exception); WCAG text spacing causes no clipping.
- APPEAR-03: forced colours keep button borders, selected tab and sidebar outlines, and progress fills.
- START-02: first run is a skippable checklist card with Close and "Skip for now", re-openable from Settings › Help and the Mac Help menu.
- Mac shell (code): App menu with Settings… ⌘, Services, Hide; File (New Playlist ⌘N, New View ⇧⌘N, Add Podcasts ⇧⌘A); Edit with named Undo/Redo; View (zoom, full screen; Reload and DevTools only unpackaged); Controls; Go (⌘1–3, ⌘K, ⌘[ ⌘]); Window; Help (Getting Started, Keyboard Shortcuts ⌘/). Native context menus for rows, links and text (Look Up, Copy Link, Open in Browser), 720×450 minimum, bounds saved.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | Space Grotesk titles (28 px) over Inter rows (15 px) and facts (13 px), with letterspaced 12 px caps for section labels: four roles, each with one style. Titles line-clamp at 3 and facts wrap, never clip. Kept below 9: on the phone at 200 % text the facts clamp drops the duration ("Market Hours · Yesterday ·…", `shots/text200-phone-view.png`); Subscription rows repeat the podcast name the page title already gives ("Deep Field · 5 Nov · 45 min" under *Deep Field*). | hierarchy, craft |
| Hierarchy | **8.6** | One heading, one facts line and one list per screen. The single blue control is the primary action (Play / Add podcasts); row actions stay hidden until hover, focus or selection. Kept below 9: the desktop Episode page centres its action row under a left-aligned header, so the eye zigzags (`shots/desktop-episode.png`). On the phone at 200 % text the fixed mini-player and tabs take ~35 % of the height. | content-first |
| Spacing & density | **8.2** | 4 px base, 76 px rows, 40–44 px targets, calm Things-like density. Kept down by left edges: on the phone the heading and rows sit at 20 px, but the search field, its help line, the segmented tabs, the Timeline intro, the Subscription artwork and Mark all Played sit at 16 px, and Delete Playlist at 28 px (`shots/phone-search-q.png`, `phone-subscription.png`, `phone-playlist-settings.png`). Content widths vary by screen (View list to 1016 px plus panel, Playlist/Library 960 px + padding, Settings 512 px, Episode 664 px) with no shared column. | craft |
| Color & contrast | **8.6** | Near-monochrome warm neutrals with one blue for play, selection and focus. A fixed meaning for green (Played) and amber (Star), shape plus colour. Contrast passes everywhere measured, including the dark drawer (muted #a9b6be on #1b2a33 ≈ 7.6:1). Kept below 9: the toast vanishes into the drawer (APPEAR-10). In forced colours the NOW Entry loses its tint, leaving only the "NOW" word, and the gear button loses its border while its neighbours keep theirs (`shots/forced-desk-playlist.png`). | color-restraint, accessibility |
| Iconography | **8.5** | One Lucide set at matching stroke. Next/Last are words, not two near-identical glyphs. Skip-15/30 glyphs carry numerals. Kept below 9: the Play glyph comes in three containers for one action (inventory mismatch 1). First-run checklist items use empty circles that read as radio buttons but aren't controls (`shots/phone-firstrun.png`). | conventions, craft |
| Consistency & polish | **8.0** (stability 9.0) | Every state designed: hover, focus-visible, pressed, empty, loading skeletons, error with Try again, forced colours. Kept down by three inventory mismatches (Play treatments, toast over the drawer, persistent toasts following you across screens). The focus ring is square on title links but rounded everywhere else (`shots/hover-row.png`). Download is in the row's hover actions but missing from its right-click and More menus. Stability: no FLOW failures at three widths. The toast mismatches keep it at the floor of Exemplary. | craft, stability |
| Clarity | **8.8** | Domain words used exactly (Entry, Played, Clear on Played, Rewind to here). Helper text says what each setting does ("An Entry leaves once its Episode is Played, wherever you heard it"). Search states its scope. The Next/Last target is named in the toolbar ("Play Next and Play Last go to Default (Active)"). Kept below 9: the desktop View's right panel header "Next and last go to" duplicates the toolbar label, and on the phone a stale Undo toast ("Playing next in Default") sits over an unrelated screen. | plain-language, feedback |
| Platform fit | **8.7** | Looks 9.0: the page fills the viewport, native selects and checkboxes are styled but native, ⌘ is shown only on Macs (Ctrl+/ elsewhere), links read as links, it reflows to 320 px. Behaves 8.6: real `<a href>` everywhere, a URL for every state (`?tab=timeline`, `?edit=true`), Back closes overlays, tab titles name the view, the browser menu stays on links and text, the row menu is keyboard-openable. The Mac shell has a complete native menu bar and native context menus. Held back by WKEY-03 (B6 keyboard containment in the drawer) and Settings opening as a page in the main window in the Mac app (Adapted, not Native). (9.0 + 2 × 8.6) ÷ 3 = 8.7. | conventions, stability |
| Interaction & feedback | **6.9** (cap: WKEY-03, WKEY-04 major) | Uncapped it would sit near 8.8: APG grid with type-ahead, ⌘/Ctrl-Z with a 30-step stack and named Edit-menu items, Undo on every reversible step, persistent Undo toasts, keyboard reorder with live announcements, focus returned after removals and on Back, responses under 130 ms p75. The two drawer and toast majors cap it at the top of Competent. | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **8.3** | Serves the task well and feels at home in Chrome and in a Mac window. The weakness holding it down most is the toast layer: it sits above the modal drawer, hides drawer controls and opens a hole in its focus trap. That one root cause produces both majors and caps Interaction at 6.9, so Overall can't pass 8.9 (cap = 6.9 + 2.0). Below that, spacing alignment and the Play treatments keep Spacing and Consistency in the low 8s. | — |

## What stands between this build and 9.0

1. **Fix the toast/drawer layer (both majors and the APPEAR-10 minor).** Lifts the Interaction cap. Expected Interaction ≈ 8.8, Overall cap 10.0.
2. **One left edge per screen on the phone** (move the 16 px elements to the 20 px content line, or move the heading and rows to 16 px) and one content column on desktop. Spacing → ~8.8.
3. **One Play treatment for one action** (pick the tinted circle for list rows, the blue circle for the hero action), a rounded focus ring on title links to match the rest, Download in the row menus, and an end to persistent Undo toasts once their screen is left (fade on navigation, keep ⌘Z). Consistency → ~8.8, Iconography → ~8.8.
4. Smaller: drop the podcast name from rows on a Subscription page. Keep the duration at 200 % text (clamp the podcast name first). Keep the NOW tint in forced colours (`outline: 2px solid Highlight`). Give first-run checklist marks a non-control look (a filled check or a dash, not an empty radio).

## Next step

- **Target:** WKEY-03 / WKEY-04 (majors in the lowest category, Interaction & feedback, on the primary listen task).
- **Anti-pattern:** overlay stacking without a modal owner (a global layer drawn over a modal's content).
- **Root cause:** toasts render in one global viewport at `z-[60]`, positioned against the page's bottom stack, so a modal drawer neither contains them nor reserves space for them.
- **Change:** while the drawer is open, render the toast viewport inside the drawer popup (a reserved strip above its bottom button row, with matching scroll padding), make the rest of the app `inert`, and give toasts on dark surfaces a `--player-track` fill with a `white/15` border.
- **Principle:** `stability`, `user-control`, `accessibility`.
- **Expected effect:** Interaction & feedback uncapped (~8.8). Consistency +0.2 (one mismatch gone). Color +0.1. No character element touched (the drawer stays dark).
