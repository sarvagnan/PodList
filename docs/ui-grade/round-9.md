# UI grade, round 9

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), at commit `f89dff8`, as a **web app** (Android-first installable PWA; the macOS app is the same build in an Electron window, `packages/desktop/src/main.ts`). Graded on its own evidence, without reading earlier rounds.

Evidence: the round-9 flow run (`scratchpad/flows-r9`), plus my own probes of the built app on the seeded demo server (`ui-flows/demo.mjs`) and the empty first-run server, using Playwright Chromium (bundled with `playwright` in `packages/web`, macOS arm64). Probe scripts and screenshots are in `scratchpad/grade-r9/` (`shots/` holds the captures named below). Electron was launched with Playwright `_electron` to read the menu bar and window.

## Frame

- **Task:** find Episodes through Views and Search, put them in Playlists, and listen.
- **Target:** web app (Android Chrome PWA, desktop browser, and the Mac app as a browser-in-a-window). Mac IDs: N/A → target.
- **Posture:** sovereign on desktop (an all-day listening tool), quick-glance on the phone.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, for its calm lists, quiet chrome and finished states.
- **Character:** (1) Space Grotesk headings over Inter rows *(owner)*; (2) blue `#2b50c8` for every interactive emphasis *(owner)*; (3) the dark player bar and dark Now Playing drawer *(owner)*; (4) Views and Playlists as equal list halves, never capsules *(owner, variant A)*; (5) plain, domain-exact copy ("Entries", "Clear on Played", "Rewind to here").
- **Owner decisions:** light only until a dark theme exists; layout A; Inter and Space Grotesk; blue primary; dark player; View editor R, Playlist settings and Rewind C, Library C. All are graded but not proposed for change.

## Flows

Tasks run: browse, listen, now playing, fresh device, second tab (flow run); plus my probes of remove/undo, reorder, delete/restore, Rewind, Add podcasts, first run, Back with overlays, context menus, keyboard paths. Widths: phone 412×915, zoomed desktop 720×450, desktop 1440×900, plus 320×640. Appearance: light (the only one), plus forced colours and reduced motion. Timed runs: 5 runs after warm-up, darwin arm64, no throttling: open a Playlist p75 140 ms, Play from here p75 109 ms. Script: `packages/web/ui-flows/flows.mjs`; measurements `flows-r9/measurements.json`; strips `flows-r9/strips/`.

Failures: none. No core element moved unprompted, no focus or scroll jump, late catalogue arrivals land without touching input.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop/phone) | toast, bottom-leading above player: "Marked Played" | none | none | Undo in toast; ⌘Z | none seen | none | Edit View, header trailing | facts line under title |
| Search | none | none | none | toast | hint line under field ("Every word must appear…") | none | Save as View, header trailing | hint under field |
| Playlist | toast "Removed from Workshop" / "Moved “X”" | none | none | toast + ⌘Z | dashed card, title + sentence ("Nothing finished yet") | none | Play / Play this, header trailing | none |
| Playlist settings | "Saved as you type." under the field | none | none | Delete → toast with Undo | n/a | none | none (live) | hint under each control |
| Trash | toast "Restored “Workshop”" | none | none | none needed | dashed card ("The Trash is empty") | none | Restore per row | header line "kept for 30 days" |
| Rewind | toast | none | modal: "Rewind Commute to 14:30?" Cancel / Rewind | Rewind can be undone | timeline intro paragraph | none | Rewind to here per event | intro paragraph |
| Library / Subscription | toast | none | none | toast | n/a | none | Add podcasts, header trailing | sub-line per row ("All defaults") |
| Add podcasts sheet | result row with Subscribe | **format error: red line directly under the field, red field edge; fetch error: red paragraph under the hint, field edge unchanged** | none | n/a | blank sheet under the field | none | Subscribe per result | hint under field |
| New Playlist dialog | closes | red line under field ("A Playlist needs a name.") | none | n/a | n/a | none | Create, footer trailing | hint under checkbox |
| First run | ticks in checklist | none | none | n/a | checklist card above Views | none | Add podcasts | the checklist |

Mismatches:
1. **Two error placements in one sheet** (Add podcasts): the address-format error sits under the field with a red field edge; the "didn't give a podcast feed" error sits a line lower, under the hint, with no field edge (`shots/first-bad-phone.png` vs `first-404-phone.png`).
2. **Back on desktop** exists on Episode detail but not on Playlist settings, Subscription or Trash, which are drill-ins of the same kind (each has Back on the phone) (`desk-episodes_…png` vs `desk-playlists_default_settings.png`).
3. **Episode row actions differ at one width:** at 1440 px the View list shows actions on hover/focus, while the Subscription screen's Episode list shows a permanent "…" (`desk-views_new-this-week.png` vs `desk-library_sub_…png`).

## Checklist

Coverage: **93%** (pass 86 · fail 7 · N/O 7 · N/A 5), of 105 IDs (79 core + 26 web). Mac IDs: N/A → target, outside the count.

### Failures by severity

**Major**

- **[LIST-03] Library: sorting by Podcast never reverses.** Clicking the Podcast header sets `aria-sort="descending"` and flips the arrow, but the rows stay A–Z (`sort.mjs`: Deep Field, Market Hours, Slow Build before and after). Cause: `LibraryTable.tsx:112-122` returns `order = 0` for the `title` key and always breaks ties A–Z, so the direction is never applied to the name. **Fix:** for `title`, set `order = a.title.localeCompare(b.title, …)` and keep the A–Z tie-break only for the other keys.
- **[DATA-06] Library sort order is lost on reload or on leaving the screen.** After sorting by Unplayed and reloading, the table is back to Podcast ascending (`sort.mjs`); the state is a plain `useState` (`LibraryTable.tsx:107`). **Fix:** keep `{key, ascending}` in the URL (`/library?sort=unplayed-desc`) or in `lib/remembered.ts`, as the Next/Last target already is.
- **[WKEY-03] A right-click row menu returns focus to the header select, not the row.** On a View at 1440 px, focus on the row title, right-click the row's facts, then press Esc or choose any item (Star, Mark Played): focus lands on "Play Next and Play Last go to" in the header, with a visible ring, and the next arrow key changes nothing in the list (`ctx2.mjs`, `ctx3.mjs`, `shots/ctx-after-choose.png`). When the menu is opened from a focused button (the keyboard path), focus correctly comes back to that button. **Fix:** remember `document.activeElement` (or the row's first gridcell) on `contextmenu`, and restore it in the menu's `onOpenChange(false)`; if that row is gone (Mark Played in an Unplayed View), move to the next row's title, as Remove already does in Playlists.
- **[WTYPE-02] The View editor breaks at 200% text.** With the browser's text size at 200% (Android Chrome text scaling, or the desktop font-size setting; `html{font-size:32px}`), the editor's labels run under their fields ("Publishe|d", "Podcast|s", "Mention|s"), select values clip ("All podcas", "An|y", "All that matc"), and text overflows the fixed-height selects, at both 412 px and 1440 px (`shots/text200-phone-views_new-this-week_edit_true.png`, `text200-desk-views_new-this-week_edit_true.png`). The same fixed-height selects overflow in the View header ("Default (Active)"). Browser zoom at 200% (720×450) is fine. **Fix:** let the label column size to content (`grid-template-columns: max-content 1fr`, or stack label above field when the row is narrower than ~22rem via a container query), and give selects and inputs `min-height` with `py` in rem instead of a fixed `h-10`.
- **[BROWSER-07] The Mac app takes ⌘← and ⌘→ (and ⌥⌘← / ⌥⌘→) away from text fields.** `main.ts:480-495` registers them as Controls menu accelerators with no editing guard, and the page's handler (`AppShell.tsx` `useMenuControls`) skips audio regardless of focus. In the Search field, a View name or Mentions, ⌘← / ⌘→ should move to the start or end of the line; in the Mac app they skip 15 s back or 30 s forward instead. Evidence is code (C): Playwright's keyboard bypasses the native menu, but the shell's own comments confirm the menu swallows key equivalents (`main.ts:175`, the reason ⌘Z is routed by hand) and Space is exempted for this reason (`registerAccelerator: false`, line 476). **Fix:** give the four items `registerAccelerator: false` and handle them in the page's keydown with the same `typing()` guard Space uses, or route them through an `executeJavaScript` check like `undo()` that falls back to the native text action while editing.

**Minor**

- **[CTRL-02] Clear on Played is a checkbox that announces as a switch.** Playlist settings renders `<input type="checkbox" role="switch">` (`$playlistId_.settings.tsx:100-101`), drawn as a checkbox; the same setting in New Playlist is a plain checkbox. **Fix:** drop `role="switch"` and `aria-checked`.
- **[COPY-01] "RESUME" marks a Cursor with nothing to resume.** In a Playlist that isn't Active, the Cursor Entry is labelled RESUME (`$playlistId.tsx:368, 383`) and the Playlists list says "Resume at:" even when the Entry has no Position (Workshop, `shots/remove-desk.png`); the design's word for the paused Cursor is HERE. **Fix:** show HERE (or "Next up") when the Entry's Position is 0, RESUME only when it has one.

N/O: KEY-06 (⌘/ on non-US layouts not testable here), CTRL-08 (no real download measured), LIST-05 (phone "Settings for this podcast" disclosure across reloads not tested), START-04, START-05 (any storage-persistence prompt not exercised in Firefox), FOOT-02 (no long list in the demo data), DRAG-06 (Playlists too short to autoscroll).

N/A: AX-05 (no critical audio-only information), START-06 and START-07 (no accounts), TOOL-06 and SIDE-03 (nothing can be hidden).

Passes worth naming: every Flow-stability check; Back closes the drawer, its stacked pages, sheets and dialogs one layer at a time; Esc closes the drawer, focus returns to its opener; focus moves to the next row after Remove, and to the restored row after Undo; Undo toasts stay up (over 9 s observed) and ⌘Z / ⌘⇧Z work; delete goes to Trash with Undo instead of a confirmation; the View list is one APG grid Tab stop with arrows, Home/End and type-ahead; right-click on links, text and fields keeps the browser menu; keyboard reorder announces "moved to position 1 of 3" and is undoable; real `href`s everywhere, with tabs and the side-panel Episode in the URL; no text contrast failure on any screen, including the dark drawer (muted `#a9b6be` on `#1b2a33`, about 8:1); forced colours keep boundaries, selection and progress; 320 px reflows with no horizontal scroll; RESP-01 p75 109–140 ms.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by WTYPE-02; 8.6 without it) | A small scale with one role per step: Space Grotesk 28 px titles, 15 px rows, 13 px facts, 12 px letterspaced section labels; rem steps follow the browser's text size. Held down by the View editor at 200% text (labels under fields, clipped values) and the fixed-height selects. | `hierarchy`, `accessibility` |
| Hierarchy | **8.5** | One focal point per screen (the list) with quiet sidebar and the dark player as the one heavy shape (owner); primary action is the only tinted button in each header. Gaps: the desktop drawer's empty centre between the player column and the Chapters/Up next column at 1440 px (`chap-drawer-desk.png`). | `content-first` |
| Spacing & density | **8.2** | Consistent 4 px rhythm, 76 px Episode rows, calm density for the posture; reflow at 320 and 720 px. Below Exemplary: the content measure changes per screen at 1440 px (View list and panel to 1408 px, Playlist and Search to ~1160, Settings to 768), leaving a 280 px empty band on Playlists and Library; single orphan wraps (Star alone on its own line in Episode detail at 320 px, "Up next · 3" alone in the phone drawer). | `craft` |
| Color & contrast | **8.8** | Restrained: blue only for interactive emphasis and progress, green Played with a tick, amber star, red destructive; every text pair measured passes; dark drawer passes; forced colours handled. Light-only is the owner's choice; Exemplary needs nothing broken, and nothing is, but the search-result artwork placeholder and pale disabled field (Default's name) read washed-out. | `color-restraint` |
| Iconography | **8.6** | One Lucide set at text weight; icon-only controls have tooltips and names; desktop rows use words for Next/Last instead of two lookalike glyphs. Below 9: Episode detail still pairs two near-identical list glyphs for Next and Last; the 11 px numerals inside the skip glyphs are at the legibility edge. | `conventions`, `craft` |
| Consistency & polish | **8.2** (stability 8.6) | States are designed everywhere (empty cards, skeletons, pressed, focus, error), flows hold still. Held down by the three inventory mismatches, the CTRL-02 checkbox-as-switch, the Library sort arrow that flips without effect, and selects whose text overflows at large sizes. | `craft`, `stability` |
| Clarity | **8.5** | Plain, domain-exact labels ("Clear on Played", "Rewind to here", "Every row must match"), state always shown (Active Playlist glyph, NOW, Played tick, Offline). Below 9: RESUME on unstarted Entries (COPY-01); Search on desktop shows a text field only, while the design says Search is the View form with Mentions filled in, so its other conditions aren't discoverable until it's saved. | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped by BROWSER-07 and LIST-03; Looks 9.0, Behaves 8.6 → 8.7 without them) | Built for the browser: URLs for tabs, panels and sheets, Back peels overlays, real links with Open in New Tab / Copy Link, browser menus kept on links and text, native selects and inputs with correct types, OS-correct shortcut glyphs. The Mac shell's menu bar is complete (File, Edit with labelled Undo, Controls, Go, Help). Capped by the Mac shell stealing ⌘←/⌘→ from fields and the non-reversing sort. | `conventions` |
| Interaction & feedback | **6.9** (capped by WKEY-03 and DATA-06; 8.8 without them) | Keyboard-fluent grid, Undo instead of confirmations, toasts that wait, focus managed after removal and restore, 109–140 ms responses, accessible reorder. Capped by focus jumping to the header after a right-click menu and by the Library sort being forgotten. | `keyboard-efficiency`, `forgiveness` |
| **Overall** | **7.7** (cap 8.9) | It serves the task well and is at home in the browser; the main path is polished and stable. What holds it below 9 is five checklist majors, each a narrow, fixable defect, that cap three categories at 6.9 (Typography, Platform fit, Interaction & feedback), plus a set of measure and wrap craft gaps that keep Spacing and Consistency in Strong. | |

## Next step

- **Target:** no blockers; three categories tie lowest at 6.9 (Typography, Platform fit, Interaction & feedback), each capped by a major. Of their majors, the one closest to the primary task is **WKEY-03** (on the View list), so it is the target (CRITIQUE step 4).
- **Anti-pattern:** focus lost after a transient layer closes.
- **Root cause:** the row context menu's trigger is the non-focusable row element, so Base UI's focus return falls through to the first focusable ancestor sibling it finds (the header select).
- **Change:** record the focused element (or the row's title cell) when the context menu opens and restore it on close; when the chosen command removes the row, focus the next row's title.
- **Principle:** `stability`, `keyboard-efficiency`.
- **Expected effect:** Interaction & feedback stays capped by DATA-06 until that is fixed too; fixing both lifts it to about 8.8. The five majors (WKEY-03, DATA-06, LIST-03, WTYPE-02, BROWSER-07) are each a small change; together they would lift Typography, Platform fit and Interaction to 8.6–8.8 and Overall to about 8.6.

### What stands between the app and 9.0 once the majors are fixed

1. **One content measure at desktop widths.** Pick one max width for list screens (or let Playlist, Search and Library fill to the same right edge as a View with its panel) so 1440 px doesn't show a 280 px empty band on some screens and none on others.
2. **The desktop drawer's empty centre.** At 1440 px the player column sits at the left third and Chapters / Up next at the right third; centre the pair or widen the list column so the drawer reads as one composition.
3. **No orphans in wrapped control rows.** Episode detail's five actions at 320 px and the phone drawer's three pills each leave one item alone on a second line; use a 3+2 / 2+1 balanced grid or shrink gaps at narrow widths.
4. **Back on every desktop drill-in.** Playlist settings, Subscription and Trash should carry the same "‹ Playlist name / Library / Playlists" link as Episode detail.
5. **One error place in the Add sheet.** Put the fetch error where the format error goes (under the field, red edge, `aria-invalid`), replacing the hint while it shows.
6. **One Episode-row pattern at one width.** Use the hover/focus action row on the Subscription screen too, or the "…" everywhere below a stated width.
7. **Search shows its conditions.** Show the View form under the search field (collapsed to a "Filters" disclosure if needed), as the design says, so Search and View editing feel like one thing.
8. **A Search shortcut off the Mac.** Windows and Android-with-keyboard have no shortcut to Search (⌘K is Mac-only by design); `/` outside fields is the web convention and doesn't clash with the browser.
9. **A visible drop target for OPML.** The native file input accepts a drop, but nothing says so; a dashed drop zone on the OPML tab would make the desktop drag path discoverable.
10. **Next / Last glyphs** on Episode detail: two list icons that differ by a tiny arrow; the desktop rows already use words, which reads better.
