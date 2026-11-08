# UI grade, round 26

Graded build: `26d42f9` (worktree `agent-a5461ef4ec647018b`). Guide: `~/Documents/UI_Guidelines` (CRITIQUE.md full audit). This was an independent read: no earlier round reports or UI-GRADE.md work lists were consulted.

Evidence:
- the flow run at `scratchpad/flows-r26` (summary.md, measurements.json, strips, contact sheets);
- my own probes against the seeded and empty demo servers, using Playwright 1.65 Chromium (headless; service workers blocked), at 412×915 (phone, touch, DPR 2), 720×450 (zoomed desktop, DPR 2), 1440×900 (desktop), 320×640, and 200% text (root font size 32 px);
- forced colors, a contrast and target-size scanner run over 11 routes plus the dark drawer, keyboard, focus, Back, menu, copy, and WCAG 1.4.12 text-spacing probes;
- the Mac shell, launched with Playwright `_electron` (menus read through `Menu.getApplicationMenu()`).

Scripts and captures are in `scratchpad/grade-r26/`.

## Frame

- **Task:** find Episodes through Views and Search, queue them into Playlists, and listen. The player and Now Playing drawer are the second primary task.
- **Target:** web app. It's an Android-first installable PWA. The Mac app is the same build in an Electron window, so the Mac shell's menus and context menu were checked too. Mac IDs: N/A → target.
- **Posture:** sovereign on desktop (a sidebar app you live in), and a daily-driver phone app.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things. It's a calm personal tool built on lists, with actions revealed on hover or selection.
- **Character:** the owner fixed most of these.
  - Inter for UI and Space Grotesk for headings (owner).
  - Blue primary #2b50c8 on a warm off-white page (owner).
  - A dark player bar and drawer (owner).
  - Views and Playlists as equal halves, with navigation always as lists (owner).
  - Initial-letter artwork tiles in podcast colors, and NOW/HERE/RESUME cursor labels.
- **Owner decisions:** light only until a dark theme is designed; layout variant A; View editor R; Playlist settings and Rewind C; Library C.

## Flows

**Tasks run** (flow run r26): browse, listen, now playing, fresh device (catalogue held 2 s), and second tab.
- Widths: phone 412×915, zoomed 720×450, desktop 1440×900. Light appearance only.
- Timed runs: desktop, 5 runs after a warm-up, darwin arm64, no throttling. "Open a Playlist" p75 was 133 ms and "Play from here" p75 was 114 ms.
- Script: `packages/web/ui-flows/flows.mjs`. Measurements: `flows-r26/measurements.json` (72 rows). Strips: `flows-r26/strips/<flow>/<width>/`.

**Failures:** none recorded by the run. Across every row, core elements (heading, navigation, player, main action) hold within 2 px. The skeleton rows on a fresh device are replaced in place (fresh device, step 1 → 2, at all widths).

Probes outside the flow run:
- **Back closes layers in order.** With the Now Playing drawer on its Up next page, Back went to the drawer's main page and then closed the drawer. The URL never left `/playlists/default`.
- **Removing a row keeps focus.** Removing an Entry put focus on the next row's control (`More actions for Repairing a chair, twice`).
- **Back restores scroll and focus.** After Search → Episode → Back, scroll and focus returned to the opened result.

**FLOW-06 (minor).** The first-run checklist disappears the moment the first Subscription lands, while the Add podcasts sheet is still open.
- Compare `shots/phone-first-0.png` (the card has 3 steps, step 1 open) with `shots/phone-subscribed.png` (the card is gone behind the sheet).
- Step 3 ("Playlists hold what you'll listen to") is never ticked or acknowledged.

**Coverage gap (not scored as a failure):** the flow run has no typing step. Search, the View editor's Name and Mentions fields, and Add podcasts aren't in it, so FLOW-03 rests on probes rather than a held late arrival.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop and phone) | Toast at the bottom-leading edge above the player bar: "Marked Played", "Link copied" | none | none | Undo button in the toast, plus ⌘/Ctrl-Z | Dashed panel with the next step | none | Header trailing: Edit View (phone: Edit) | none |
| View editor | **none**: the live preview and "Matches N Episodes now" only | none | none | **⌘/Ctrl-Z only; no toast, no visible control** | n/a | none | Done, at the header trailing edge | "Every row must match…" under the form |
| Search | Results appear inline | none | none | n/a (unsaved) | Dashed panel: "Search your Library" + next step | none | none (Save as View) | Scope line under the field |
| Episode detail | Toast: "Marked Played · Undo" | none | none | Toast Undo | Not-found: heading + explanation | none | Play, centred in the action row | none |
| Playlist (Entries / History / Timeline) | Toast: "Removed “…” from Workshop · Undo", "Moved “…” · Undo" | none | Rewind: modal dialog listing what changes and what is kept | Toast Undo; a Rewind is undoable | Not-found: dashed panel + link | Second tab: TabGate | Header trailing: Play / Play this | Timeline intro paragraph |
| Playlist settings | Delete → toast "Moved “Workshop” to the Trash · Undo" | none | none | Toast Undo for Delete; settings apply live | Not-found: dashed panel + "See your Playlists" | none | none | Row descriptions |
| Trash | Toast: "Restored “Workshop” · Undo" | none | none | Toast Undo | (not seen empty) | none | Restore, trailing in each row | "Deleted Playlists are kept for 30 days." |
| Library and Add podcasts | Inline "✓ Subscribed" replaces the button | Inline under the field: "Enter the whole address, starting with https://" | none | n/a | First-run card | none | Header trailing: Add podcasts | Help line under each field |
| Settings | Applies live, no message | none | none | n/a | n/a | none | n/a | Row descriptions |
| Now Playing drawer | Inline (state changes) | n/a | none | Toast Undo for remove and move | "Nothing after this…" line | none | Play, centred | none |

Mismatches:
1. **Undo:** every Episode, Entry and Playlist edit offers Undo in a toast, but View edits offer Undo only through the keyboard. This affects the View editor on both widths. On a touch phone it leaves no Undo at all. Recorded as DATA-04 below.
2. **Help that vanishes:** the first-run checklist is removed rather than completed (FLOW-06).

## Checklist

Coverage: **93.8%** (pass 89 · fail 2 · N/O 6 · N/A 8). Applicable = 97; 91 of them have a verdict.

### Failures by severity

**[DATA-04] major: View edits have no visible Undo, and none at all on a touch phone.** Interaction & feedback is capped at 6.9.
- **Where:** the View editor (desktop panel and phone full screen), via `components/views/ViewForm.tsx` lines 71–84.
- **Why:** `save` calls `useUndoable()`, which pushes onto the undo stack without the toast that `useConfirm` gives every other edit.
- **Evidence:**
  - Changing Played on `/views/starred?edit=true` showed no status or toast: `[]` 300 ms after the change and `[]` after Done, at 412 and at 1440 (`undo.mjs`).
  - ⌘/Ctrl-Z does reverse the change; Played went back to "any" in `editor.mjs`.
  - On Android, with no keyboard, the person has no way to take back a View edit.
  - docs/design/ui-layout.md promises "Edits apply as they are made (no Save; Undo takes one back)".
  - core-checklist § Reading the shared checks says a web command surface needs "a visible control plus a keyboard route".
- **Fix:** show each View edit as an Undo toast, through the same `useConfirm` path as Mark Played ("Edited “Under 30 minutes” · Undo").
  - Coalesce successive edits to one field within about 2 s into one step, so typing in Name or Mentions doesn't stack toasts.
  - Alternatively, put an **Undo** text button beside **Done** in the editor header. It is enabled while this View has steps on the stack, and labelled with its tooltip "Undo “Played: Unplayed”". It works at both widths.

**[FLOW-06] minor: the first-run checklist vanishes mid-task.**
- **Where:** `components/shell/FirstRun.tsx`. The comment says it "goes when the person has podcasts".
- **Evidence:** as described under Flows (`shots/phone-first-0.png` → `phone-subscribed.png` → `phone-after-subscribe.png`). The card is removed behind the open sheet as soon as the first Subscribe succeeds, and step 3 is never ticked.
- **Fix:** keep the card after the first Subscription with step 1 ticked. Change its button to **Done** (and keep "Hide"). Let the person dismiss it, or remove it after their first Play Next/Last, which ticks step 3. Remove it only when the sheet is closed, so nothing changes behind a modal.

### Passes

Passes worth noting as evidence for the scores:
- **KEY-01 / WKEY-01:** the Tab order is a skip link, then the sidebar, the header controls, one stop per row list (an APG grid with arrows, type-ahead, Space to tick, ⌘/Ctrl-C copies the row link), then the panel and the player.
- **WKEY-03:**
  - Esc returns focus to the opener for Add podcasts, New Playlist and Rewind.
  - A view change focuses the h1.
  - Back from a view refocuses its h1.
- **BROWSER-01/02:** these destinations have URLs: `?tab=history`, `?tab=timeline`, `?edit=true`, `?q=`. Back unwinds sheets and drawer pages before leaving the view.
- **BROWSER-06:** the row context menu appears only on rows. A right-click on the title link gets the browser's menu. The commands are also visible on the row (hover or focus reveals Next, Last, Add, Star, Played, Download).
- **APPEAR-03:** forced colors keep the button edges, the NOW row outline, the progress bar and the selected tab (`shots/forced-1.png`).
- **APPEAR-04:** the scanner found no text below 4.5:1 on any route at any width, including the dark drawer and player bar (`drawerscan.mjs`).
- **WTYPE-02/05:** there is no horizontal overflow at 320 px or at 200% text on any of the 11 routes (`scan.mjs`). Text spacing (1.4.12) clipped nothing.
- **WTYPE-04:** the only targets under 24 px are 16 px checkboxes and row title links, which pass under the spacing exception (rows are 76 px apart).
- **WCOPY-01:** ⌘K and ⌘/ appear only when `navigator.platform` is Mac; elsewhere it shows "Ctrl+/".
- **The Mac shell:**
  - The menus are full and ordered: App, File, Edit with "Undo “…”" labels, View, Controls, Go, Window, Help.
  - Space and ⌘← are shown but not registered, so text fields keep them.
  - Reload and Developer Tools appear only when the app runs unpackaged.
  - The context menu offers Copy Link, Look Up, Back and Forward.

### N/O
DRAG-05, DRAG-06, PTR-03, CTRL-08 (downloads of the fixture complete instantly), FOOT-02 (lists of at most 6 rows), BROWSER-10 (no LCP or INP field or lab run).

### N/A
LIST-05 (no outlines), AX-05, START-04, START-05 (no permission prompts), START-06, START-07 (no accounts), TOOL-06, SIDE-03 (nothing can be hidden).

Mac IDs: N/A → target.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.8** | A small, role-mapped scale: Space Grotesk titles at 28 px; Inter rows at 15 px, meta at 13 px, letterspaced caps labels at 12–13 px; secondary text in #5c6070. Typographic punctuation is right throughout (“Under 30 minutes”, "Add to a Playlist…"), and type follows the browser's font size. Below 9: the phone player title truncates to about 13 characters ("The long life o…"); at 200% text, icons stay 16 px beside 32 px text (the Search glyph, the + buttons); "Keyboard shortcuts" wraps with a hanging indent under text spacing. | hierarchy, craft |
| Hierarchy | **8.6** | One tinted primary per screen (Play / Play this / Add podcasts / Done), quiet sidebar, NOW row tinted; the eye goes title → list → panel. Below 9: on desktop the Episode page puts a 7-button action row at the top left and leaves about 60% of the canvas empty; the always-dark player bar outweighs the content on light screens (owner decision, noted only). | content-first |
| Spacing & density | **8.4** | A visible rhythm: 4 px base, 76 px rows, consistent 16 px gutters. Phone and desktop densities are tuned separately, and the 720×450 layout gives the list its room. Below 9: content widths are inconsistent. Settings, Playlist settings and the Episode page stop at about 896 px. The Trash fills to 1408 px, so Restore sits about 1000 px from its Playlist name. The Subscription page's settings card ends at 1292 px while its header runs to 1408 px. Also, the phone drawer leaves its bottom third empty. | craft, hierarchy |
| Color & contrast | **9.0** | Restrained and meaningful: blue only for interactive emphasis and the cursor (NOW, HERE); green with ✓ for Played; amber ★ for Star; red only for Unsubscribe. Every measured text pair passes, including the dark drawer (muted #a9b6be on #1b2a33), and the focus ring is 6.25:1. Forced colors were designed, not left to defaults. The single light theme is fine under WCOLOR-01. | color-restraint, accessibility |
| Iconography | **8.5** | One Lucide family at the text's weight, with custom 15/30 skip glyphs. Icon-only buttons have names and tooltips. Below 9: icons don't scale with text (16 px at 200% text). The phone row's bare "+" is the only unlabelled verb on the row and reads as "new" as easily as "Add to a Playlist". | conventions, craft |
| Consistency & polish | **8.6** (stability 8.6) | Every state is designed: skeletons, not-found pages, forced colors, hover-revealed actions that also appear on focus, and the pressed and selected states. Toasts sit in one place with one wording pattern. Below 9: the View-edit Undo mismatch; the vanishing first-run card (FLOW-06); the Rewind dialog's × is also named "Cancel", so two controls share a name and initial focus lands on the ×; the Speed menu opens on 0.8× rather than the checked 1×. Stability: no FLOW-01 to 05 failures at 3 widths; one inventory mismatch, and FLOW-06 minor. | craft, stability |
| Clarity | **8.8** | Plain domain language used consistently: "Clear on Played", "Keeps Entries", "Rewind to here", and "Kept: Entries you added or moved since…". The Search scope is stated, and the row summaries under View names describe each filter. Below 9: on desktop, "Rewind to here" is hidden until hover, so the Timeline's main action is invisible at rest. The phone "+" (see Iconography). The editor never says that edits can be undone. | plain-language, feedback |
| Platform fit | **8.8** (Looks 9.0, Behaves 8.7) | Built for the browser. Real links; every tab, edit state and query has a URL; Back unwinds overlays; the browser's menus stay on links, text and fields; OS-aware shortcut hints; native selects, inputs and checkboxes; installed mode supplies its own Back. Below 9: the row menu can't be opened from the keyboard on the default (title) cell, because Shift-F10 there gets the link's menu; BROWSER-10 is unmeasured. | conventions, stability |
| Interaction & feedback | **6.9** (capped by DATA-04; about 8.9 uncapped) | Keyboard-fluent (APG grid, type-ahead, ⌘K, /, Space, a shortcuts sheet, an opt-out for single keys), forgiving (Undo toasts that don't time out, Trash, an undoable Rewind), and instant (p75 114–133 ms). The cap comes from one gap: View edits have no visible or touch Undo. | forgiveness, keyboard-efficiency |
| **Overall** | **8.5** | It serves the task very well and is at home in the browser and in a Mac window; the cap allows up to 8.9. The weakness holding it down is the View editor's missing Undo surface. Next comes a cluster of layout-width and craft inconsistencies that keep Spacing, Iconography and Hierarchy out of Exemplary. | |

## Next step

- **Target:** DATA-04 (major) in Interaction & feedback, the lowest category.
- **Anti-pattern:** a keyboard-only command, where a command exists only as a shortcut.
- **Root cause:** `ViewForm` records each change with `useUndoable()` (stack only) instead of the toast-bearing `useConfirm` path that every other edit uses.
- **Change:** route View edits through the Undo toast, coalescing per field within about 2 s, or add a header **Undo** button beside Done at both widths.
- **Principle:** forgiveness, and discoverable commands.
- **Expected effect:** lifts the 6.9 cap, so Interaction goes to about 8.9 and Overall about +0.3. It also clears inventory mismatch 1. No category should regress.

### What else stands between this build and 9.0

These are craft gaps, roughly in order of payoff:
1. **One content width system** (Spacing):
   - Give the Trash rows the same max width as Settings (about 640 px), or move Restore next to the name.
   - Align the Subscription settings card's right edge with the header (1408 px), or cap the whole page.
   - Give the desktop Episode page a reading column with the actions centred under the title block.
2. **Icons sized in em or rem** (Iconography, Typography): let `size-4` icons scale with text so 200% text keeps the icon-to-text ratio.
3. **First-run completes rather than vanishes** (FLOW-06 fix above).
4. **Rewind dialog:**
   - Name the × "Close", or drop it, since Cancel is already there.
   - Put initial focus on the Cancel button.
5. **Timeline discoverability** (Clarity): show "Rewind to here" at rest on desktop, as phone does, or at least on the newest event.
6. **Speed menu** (Polish): open on the checked rate.
7. **Phone row "+":** label it "Add" under the glyph or use the list-plus icon, matching the Episode page's "Add" button.
8. **Phone drawer** (Spacing): centre the controls vertically, or use the empty bottom third for the Chapter or Up next preview.
9. **Flow coverage:** add a typing flow (Search with a held result, and View editor Name and Mentions) so FLOW-03 is measured rather than probed.
