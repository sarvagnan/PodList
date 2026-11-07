# UI grade, round 17

Commit 69e72de. Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), as a **web app**, by a grader who did not read earlier rounds. Evidence: the flow run in `scratchpad/flows-r17` (summary, measurements, strips), plus my own Playwright probes of the demo build in Chromium (headless, Playwright 1.x, darwin arm64), and the Mac shell launched with `_electron`. Scratch scripts and captures: `scratchpad/grade-r17/`.

## Frame

- **Task:** find Episodes through Views (and Search), put them in Playlists, and listen from the player and the Now Playing drawer.
- **Target:** web app, an Android-first installable PWA (`display: standalone`). The Mac app is the same build in an Electron window, so its menu bar and context menus are judged as part of Platform fit.
- **Posture:** sovereign on the desktop (a sidebar app left open all day), but used in short visits on the phone.
- **Audience:** perpetual intermediate, keen podcast listeners.
- **Nearest exemplar:** Things, for the calm list, the restraint and finishing every state. BBEdit only for the keyboard and menu depth of the Mac shell.
- **Character:** warm off-white page (#f6f5f2) with one blue (#2b50c8, owner); Space Grotesk headings over Inter (owner); a dark slate player bar and drawer (owner); podcast-coloured initial tiles as artwork; plain-spoken domain words with capitals (Views, Playlists, Entries, Episodes).
- **Owner decisions (graded, not targeted):** light appearance only; layout A (Views and Playlists as equal halves, list navigation); the round-2 designs (View editor R, Playlist settings and Rewind C, Library C); a modal confirmation for Rewind.

## Flows

Tasks run (flow run r17): browse, listen, now playing, fresh device (late catalogue held 2 s), second tab. Widths 412×915 (phone, touch), 720×450 (desktop at 200%), 1440×900. Light only. Timed runs: 5 at desktop after a warm-up, no throttling, darwin arm64. Script `packages/web/ui-flows/flows.mjs`; measurements `flows-r17/measurements.json`; strips `flows-r17/strips/<flow>/<width>/`.

- Stability failures: **none** (summary.md).
- RESP-01 p75: open a Playlist 125 ms; Play from here 101 ms.
- My additional probes: ticking a row on a View (desktop) brings in the bulk bar and moves the H1 by 1 px (35.25 → 36.25) and the first row by 2 px (114 → 116). That is within the 2 px tolerance, so it passes, but it is visible as a nudge (`grade-r17/bits.mjs`).
- Lab vitals (5 loads of /playlists/default): LCP 88–332 ms on the desktop, 84–224 ms on the phone; CLS ≤ 0.008.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Toast, bottom-left over the content, above the player; dark; "Added to …" pattern | none seen | Add to a Playlist sheet | Toast Undo, ⌘Z | Dashed card, centred, heading plus line with a link ("Add podcasts to fill your Views"); on first run the card is 240 px tall with its text at the top | — | Edit View, trailing in the header | — |
| Playlist | Toast "Removed from Workshop" + Undo; "Undone: Removed from Workshop" | — | — | Toast Undo, ⌘Z | Dashed card "Nothing finished yet" (History) | — | Play / Play this, trailing in the header (blue) | Timeline intro paragraph |
| Playlists, Trash | Toast "Moved “Workshop” to the Trash" / "Restored “Workshop”" + Undo | — | — | Toast | Dashed card "The Trash is empty" | — | New Playlist, trailing | — |
| Listening Timeline | — | — | **Modal** "Rewind Default to 14:30?" (Cancel focused) | Toast after Rewind | — | — | Rewind to here, per row | intro paragraph |
| Search | — | — | Save as View dialog | — | Dashed card "Nothing matches / Try fewer or different words" | — | Save as View, trailing | hint under the field |
| Add podcasts sheet | Inline summary ("Added 3") | Inline red under the field, field-specific ("Enter the whole address, starting with https://"; "This address didn't give a podcast feed. Check it, or find the podcast by name with Search.") | — | — | Search tab: a blank 96 px area, no hint | — | Subscribe in the preview | Feed tab: hint under the field; **Search tab: none** |
| Up next panel (desktop View) | — | — | — | — | **Plain muted paragraph, no card** ("Nothing up next. Use Next or Last…") | — | — | — |
| Player / drawer | — | Player: danger text + "Try again" | Switch Playlist | Toast inside the drawer | — | — | Play/Pause centre | — |
| Second tab | — | — | — | — | — | Full-screen centred "PodList is open in another tab" + Use here | Use here | — |

**Mismatches**
1. **Empty states:** dashed card (View, Search, History, Trash), a plain paragraph (Up next panel), and on first run a 240 px dashed card with its text pinned to the top and ~150 px of empty card below it.
2. **Help under a field:** in the Add podcasts sheet the Feed address and OPML tabs explain the field, but the Search tab shows a bare field above an empty area.
3. **Undo wording:** the toast says "Undone: Removed from Workshop"; the Mac Edit menu says `Undo “Removed from Commute”`, a quoted past participle rather than an action ("Undo Remove from Commute").

## Checklist

Mac IDs: N/A → target.

**Coverage: 93.3%** (pass 97 · fail 1 · N/O 7 · N/A 7), out of 112 core and web IDs.

**Failures by severity**
- Blocker: none.
- Major: none.
- Minor:
  - **[BROWSER-03] The page title doesn't follow the Playlist tabs.**
    - *Where:* /playlists/default, /playlists/default?tab=history and ?tab=timeline.
    - *Evidence:* all three are titled "Default · PodList", although each has its own URL and Back entry. Elsewhere the app does change the title for a sub-state: the phone editor (?edit=true) is "Edit View · PodList".
    - *Fix:* title them "Default · History · PodList" and "Default · Listening Timeline · PodList", the same way the editor gets its own title.

**Notable passes (evidence)**
- **KEY-01 and WKEY-01 to WKEY-03:**
  - Episode lists are an APG grid: one Tab stop; ←/→ between a row's actions; ↑/↓, Home/End and type-ahead ("join" → Joinery without screws); Space ticks a row.
  - The drawer takes focus, traps Tab (14 stops, then it wraps) and returns focus to "Open Now Playing" on Esc. Dialogs do the same.
  - After removing an Entry, focus goes to the next row's Remove button.
  - After navigation, focus moves to the H1, and Back restores focus to the link you came from ("Deep Field").
- **BROWSER-01 and BROWSER-02:**
  - On the phone, Back closes Up next, then the drawer, then the Add sheet, without leaving the page.
  - Tabs (?tab=), the editor (?edit=true), Search (?q=) and Episode detail all have URLs.
  - Scroll is restored on Back (448 → 448).
- **WDATA-04:** the Undo toast is still there after 12 s, and ⌘Z undoes ("Undone: …").
- **APPEAR-04 and WTYPE-01:** a scripted contrast scan of 10 screens and the drawer, at both widths, found no text below 4.5:1 and no text below 12 px.
- **WTYPE-02 and WTYPE-05:** no horizontal scroll at 320 px or with 200% text (32 px root) on the phone or the desktop. In the player bar, back 15 drops out on the phone; it stays in Now Playing.
- **APPEAR-03:** forced colours keep the boundaries, the selection, the NOW row and the progress.
- **WTYPE-04:** the 16 px tick boxes and 16 px-tall sort headers pass under the 2.5.8 spacing exception (the nearest other target is ≥ 40 px away).
- **DRAG-01:** the OPML file input is a native, visible `input[type=file]`, so dropping a file on it works, and it doubles as the file picker.
- **WCOPY-01:** ⌘K and ⌘/ are shown only on a Mac (Ctrl+/ elsewhere); Ctrl+K is left to the browser.

**N/O:** KEY-06, CTRL-08, DRAG-05, DRAG-06, PTR-03, WDATA-02, WTYPE-03

**N/A:** LIST-05 (no outlines), AX-05 (no autoplay), START-04, START-05 (no permission prompts), START-07 (no accounts), TOOL-06, SIDE-03 (nothing can be hidden)

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | **Strengths:** a small scale with one role per step: 28 px Space Grotesk H1, 15 px Inter rows, 13 px muted metadata, and letterspaced caps for section labels (VIEWS, IN YOUR PLAYLISTS, NOW). Curly quotes, ellipses and the × sign are used throughout, and truncation is designed (tail ellipsis in the player). **Held below 9:** H1 size isn't constant. The Episode detail title is the page's H1 but sits at about 20 px beside 28 px H1s everywhere else (Playlist settings, Trash, Library), so the type stops telling you which page level you're on. The Library table header mixes a black active column (PODCAST ↑) with grey caps. | hierarchy, craft |
| Hierarchy | **8.5** | **Strengths:** one tinted primary per screen (Play / Play this / Add podcasts / Done). The dark player anchors the bottom, and the chrome is quiet: the sidebar has no fills except the selection. **Held below 9:** the desktop Episode detail page leaves about 60% of the window empty, and its action row is centred in a 664 px column under a left-aligned header, so there are two axes. In the drawer at 720×450 (desktop at 200%), the artwork and title fill the sheet and Play/Pause sits at y = 455, below the fold, while the player bar is covered. | content-first, hierarchy |
| Spacing & density | **8.4** | **Strengths:** a 4 px rhythm, even 76 px rows on a View, a Library table that aligns, and settings cards with consistent insets. **Held below 9:** there's no shared content width. Settings is 512 px, Episode detail 664 px, Playlist and Library 912 px, and a View runs edge to edge with its panel, so right edges never line up between screens at 1440. The first-run empty card is 240 px tall with its text at the top. On the Timeline, the 3-line intro sits close above the first date heading (FRI 6 NOV), closer than section gaps elsewhere. | craft, hierarchy |
| Color & contrast | **8.6** | **Strengths:** a restrained palette. Blue means interactive, selected or now; green means Played; amber means star; the player is dark slate with a lightened blue for progress (5.8:1). No measured contrast failures; the focus ring is 6.25:1 on the page and white on dark. **Held below 9:** it's a single theme (owner). In forced colours the scrubber's thumb disappears (fill and track remain) and the fixed player bar loses its edge against the page. | color-restraint, accessibility |
| Iconography | **8.4** | **Strengths:** one Lucide family at a consistent stroke, with custom 15/30 skip glyphs that match it. Every icon-only control has a name and a tooltip, shown on focus too. **Held below 9:** two glyphs mean "settings": a gear for Playlist settings, and sliders for both Edit View and the Library row's podcast settings. The Played toggle shows a check while it is *off* (aria-pressed = false), which reads as "already played". The Views tab icon is a funnel: apt for filters, but a stretch as the name of a home tab. | conventions, plain-language |
| Consistency & polish | **8.4** (stability 8.7) | **Strengths:** loading skeletons, empty states, errors, offline, second-tab, pressed and focus states are all designed. No flow failure at any width. **Held below 9:** the three inventory mismatches above. The phone player bar has no queue badge, although docs/design/ui-layout.md specifies one on both. Opening the drawer from the keyboard draws a 2 px white ring round the whole sheet (`grade-r17/drawer-kbd.png`). The row whose right-click menu is open isn't marked. The bulk bar nudges the list by 2 px. | craft, stability |
| Clarity | **8.6** | **Strengths:** domain words are used precisely and state is always shown: NOW/HERE on the Cursor, a Paused badge, "Default (Active)", "Play Next and Play Last go to", "Matches 5 Episodes now", and the Rewind dialog lists exactly what is kept. **Held below 9:** Search is words only, not the designed form R ("the same form with Mentions filled in"), so it can't be narrowed by Podcast or Played without saving it as a View first. "Played" is used both as a toggle's label and as a state. The Playlist tabs don't change the title (BROWSER-03). | plain-language, feedback |
| Platform fit | **8.7** (Looks 9.0, Behaves 8.6) | **Looks:** every L signal is native or adapted: native selects and file input, real links, ⌘ shown only on a Mac, focus distinct from selection, and reflow to 320 px. **Behaves:** history-backed overlays, URLs for sub-states, browser menus on links and fields, custom row menus only on rows (each with a More button and a native menu in the Mac app), and PWA standalone with its own Back and tabs. **Mac shell:** a full menu bar (App with Settings… ⌘, · File · Edit with labelled Undo · View · Controls · Go · Window · Help); dev-only Reload and DevTools; a 720×450 minimum; reopens where it was left. **Held below 9:** a ⌘-clicked link opens a tab that can only offer to take over (single-tab lock, justified but foreign to the web). The Mac Undo labels quote toast text, and window titles carry "· PodList". BROWSER-03. | conventions, stability |
| Interaction & feedback | **8.8** | **Strengths:** keyboard-fluent lists (APG grid, type-ahead, ⌘A, ⌘C copies a row link). Undo instead of confirmation for remove and delete, with ⌘Z and a toast that waits. Live-apply editors with no Save. Focus is kept through removals. p75 100–125 ms. An in-app shortcut sheet; single-key shortcuts that can be turned off. **Held below 9:** Space plays by default and so takes Space-to-scroll away from pages (documented and toggleable). Rewind keeps a modal even though it can be undone (owner design). Drag feedback and keyboard opening of the row menu (Shift+F10) weren't verified. | keyboard-efficiency, forgiveness |
| **Overall** | **8.6** | It serves the task well and is at home in Chrome and in a Mac window. The weakness holding it down most is cross-screen finish: content widths, empty-state forms, and the player bar differing between phone and design. Cap: lowest 8.4 + 2.0 = 10.4, so it doesn't bind. | |

## What stands between this build and 9.0

There are no blocker or major failures, so the remaining work is craft. In order of payoff:

1. **One content measure across screens** (Spacing, Hierarchy).
   - Pick two widths: about 912 px for lists and tables, and about 640 px for forms and detail.
   - Align Episode detail's action row to its own left edge (256), not centred in its column.
   - Give the desktop Episode page a second column (Chapters / In your Playlists) instead of a 776 px void.
2. **Empty states in one form** (Consistency).
   - Use the dashed card everywhere, including the Up next panel, at its natural height with the text centred, never a 240 px shell.
   - Give the Add podcasts Search tab a hint line like the Feed tab's ("Search by name, or paste a feed address").
3. **Player bar to spec on the phone** (Consistency, Clarity): add the queue badge (count + list icon) after forward 30, opening the drawer on Up next. When large text leaves no room, drop it before the title, as back 15 already drops.
4. **Drawer at short heights** (Hierarchy). Under `short` (max-height 30rem), shrink the artwork (about 160 px) or move it beside the title, so Play/Pause stays above the fold at 720×450.
5. **Search as designed (R)** (Clarity): a "More conditions" disclosure that shows the View form's rows under the words, so Search can be narrowed before it's saved.
6. **Small finish items:**
   - Episode detail H1 at the 28 px title step, or demote the page-level H1 consistently.
   - One settings glyph: sliders for "settings", or the gear everywhere.
   - Played toggle: an outline check when off and a filled check when on, or label it "Mark Played" when off.
   - No focus ring on the drawer sheet itself (focus its heading, as pages do).
   - Mark the row while its context menu is open.
   - Reserve the bulk bar's height so ticking moves nothing.
   - In forced colours, give the scrubber thumb `forced-color-adjust: none` with a CanvasText border, and give the player bar a 1 px top border.
   - On the Mac, phrase Undo as an action ("Undo Remove from Commute"), and use the view name alone as the window title.
   - BROWSER-03 tab titles.

## Next step

- **Target:** Spacing & density (tied lowest, 8.4, and closest to the primary task, browsing and listening).
- **Anti-pattern:** none named; the nearest is inconsistent layout grids across sibling screens.
- **Root cause:** each screen sets its own max width (512 / 664 / 912 / full), so no edges are shared across the app, and wide windows show uneven voids.
- **Change:** two width tokens (list 912 px, form 640 px), left-aligned at the content gutter, applied to Settings, Playlist settings, Episode detail, Trash, Library and Playlist. Episode detail's action row aligns left.
- **Principle:** craft, hierarchy.
- **Expected effect:**
  - Spacing +0.3 and Hierarchy +0.2, with no regression.
  - The character survives: the off-white page, the blue and the type are untouched.
