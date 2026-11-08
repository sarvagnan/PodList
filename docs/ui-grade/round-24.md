# UI grade, round 24

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), at commit `78db0f3`, by an independent grader. Earlier rounds and the UI-GRADE.md work lists weren't read.

## Frame

- **Task:** find Episodes through Views, and listen through Playlists: queue with Next/Last, play, resume, reorder and undo.
- **Target:** web app. It's an Android-first installable PWA (`display: standalone`), and the macOS app is the same build in an Electron window (`packages/desktop/src/main.ts`). Platform fit was judged for Android Chrome and for a Mac desktop window.
- **Posture:** sovereign on the desktop (sidebar, table, docked player). On the phone it's a short, repeated-visit companion.
- **Audience:** perpetual intermediates. Podcast listeners who learn two ideas, Views and Playlists.
- **Nearest exemplar:** Things, for the calm list hierarchy, the actions that appear on hover, and the undo-first forgiveness.
- **Character:**
  1. Inter body with Space Grotesk headings (owner).
  2. A blue `#2b50c8` accent for interaction and "now" (owner).
  3. A dark player bar and a dark Now Playing drawer on a warm off-white page (owner).
  4. Views and Playlists as equal halves, navigated as lists, never capsules (owner, layout A).
  5. Plain-spoken domain copy ("Next and Last go to", "Rewind to here", "Kept: …").
- **Owner decisions:**
  - A light appearance only, until a dark theme is designed.
  - Layout A.
  - The chosen designs: View editor R, Playlist settings and Rewind C, Library C.

  These were graded but are not proposed for change.

## Flows

**Flow run.** The provided run at `scratchpad/flows-r24` covered five flows: browse, listen, now playing, fresh device, and second tab.
- Widths: phone 412×915, zoomed desktop 720×450, and desktop 1440×900.
- Light appearance only. Late arrivals were held for 2 s.
- Script: `packages/web/ui-flows/`.
- Measurements file: `flows-r24/measurements.json`.
- Strips and contact sheets: `flows-r24/strips/*`, `contact-*.png`.

**Timed runs.** Desktop, 5 runs after a warm-up, no throttling, darwin arm64.

| Step | p75 |
|---|---:|
| Open a Playlist | 122 ms |
| Play from here | 103 ms |

**My own probes.** I drove the demo build with Playwright Chromium 1.65; the scripts are in `scratchpad/grade-r24/`. They covered:
- Tab order and the focus ring.
- The APG grid in the Episode list.
- Row context menus, the browser menu on links, and Copy Link.
- Mark Played followed by ⌘Z.
- Removing an Entry, keyboard reorder, and the Rewind confirmation.
- Delete Playlist, which goes to the Trash with Undo.
- Back with the Add sheet, the Add-to-Playlist sheet and the stacked drawer pages open.
- Scroll restoration on Back.
- The focus trap and Esc order in the drawer.
- Forced colors, 200% root font size, the WCAG 1.4.12 spacing overrides, and 320×640.
- A contrast and target sweep over about 20 states, including the dark drawer and the toast.
- First run on an empty Library, with Add-by-feed-address errors.
- New Playlist validation.
- Library table sorting and its persistence.
- Lab LCP and CLS.
- The Electron shell launched with `_electron`, to read its menus and window.

**Failures.** None. Every core element held within 2 px at every step and width. Focus followed the person: Back returned focus to the opener, and focus went to the heading after a view change. The late catalogue arrived into skeleton rows sized like the real ones (fresh device, steps 1→2).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Dark toast above the player, bottom-leading: "Marked Played · Undo" | none | none | Toast Undo, ⌘Z, Edit › Undo | Count "0" in the list; first-run card on Views | none | Play per row (trailing); Edit View at top-right | Edit View form footnote |
| Playlist | Same toast: "Removed “…” from Commute · Undo", "Moved “…”" | none | none | Same | Dashed card, centred: "Nothing finished yet" | Rewind alertdialog, centred, Cancel focused | Play / Play this at top-right of the column | Timeline intro paragraph |
| Playlist settings | "Saved as you type." inline | Inline under the field (New Playlist dialog: "A Playlist needs a name.") | none | Delete → toast "Moved “Workshop” to the Trash · Undo" | n/a | none | none (live apply) | Inline hints under each row |
| Library / Add podcasts | Feed preview with Subscribe | Inline red under the field, with the recovery stated | none | Toast | First-run card | none | Add podcasts at top-right | Help line under each field |
| Search | n/a | none | none | n/a | Dashed card, centred: "Search your Library" | none | Save as View at top-right | "Every word must appear…" under the field |
| Trash | n/a | none | none | Restore | Dashed card, centred: "The Trash is empty" | none | Restore per row | Retention line |
| Now Playing drawer | Toast inside the drawer's foot | none | none | Same | n/a | none | Play/Pause, centred | n/a |

**Mismatches**
1. **Drill-in heading on the desktop.**
   - The Episode page uses a "‹ Views" back link above its title.
   - Playlist settings ("Workshop › Playlist settings") and the Subscription page ("Library › Deep Field") use a breadcrumb inside the h1.

   Both patterns express the same parent → child relationship.
2. **Next and Last.** View rows label them as text ("Next", "Last"). The Episode page and the bulk bar use list-start/list-end glyphs with labels.

Toasts, errors, empty states and the Undo route are otherwise consistent: one place, one voice, one color.

## Checklist

Coverage: **97.0%** (pass 95 · fail 1 · N/O 3 · N/A 6, of 105 IDs; 99 applicable).

### Failures by severity

**Major**

**[DATA-06] The Library's sort order doesn't survive leaving the Library.**
- **Where:** the desktop Library table (also the Mac app).
- **Evidence (`grade-r24/sort.mjs`, `grade-r24/sort2.mjs`):**
  1. Sort by Unplayed gives `/library?sort=unplayed-desc`.
  2. Leaving through a View in the sidebar, then choosing the sidebar's Library link (`href="/library"`), gives `aria-sort` back at "Podcast=ascending".
  3. Only Back (or a reload while still on the URL) brings the sort back.
  4. Go › Library (⌘3) and a relaunch that lands elsewhere lose it the same way.
- **Contrast:** the View's "Next and Last go to" choice is remembered across leaving, returning and reloading (`picker.mjs`: "commute" kept), so the inconsistency is visible.
- **Fix:**
  - Remember the last Library sort with `lib/remembered.ts`, as `lastScreen` and the target Playlist are remembered.
  - Apply it in `routes/library/index.tsx` whenever `?sort` is absent, and write it on every header click.
  - Or have the sidebar link, the phone tab and Go › Library carry the remembered `?sort=`.

**Blocker and minor:** none.

### N/O
DRAG-05, DRAG-06, FOOT-02. The fixture lists are too short to show drag autoscroll or long-list scroll smoothness. The drag image wasn't captured.

### N/A
- START-04, START-05: no permission prompts.
- START-06, START-07: no accounts.
- TOOL-06: no hideable toolbars.
- SIDE-03: the sidebar can't be hidden.
- Every Mac-checklist ID: N/A → target. They're not counted.

### Notable passes, with evidence
- **KEY-01, KEY-04, WKEY-01:**
  - A skip link comes first.
  - Every stop shows a 2 px `#2b50c8` ring, or a white ring in the dark bar.
  - The Episode list is one Tab stop: an APG grid with ←→ across the actions and ↑↓, Home/End and PgDn between Episodes.
  - The drawer traps focus, cycling Close → … → Remove and back.
- **WKEY-03, BROWSER-01:**
  - Esc in the drawer steps back one page, then closes it, and focus returns to "Open Now Playing".
  - Browser Back with a sheet open closes the sheet without leaving the URL, and focus returns to the opener.
  - Back from an Episode restores the Search scroll (85 px) and focuses the row's link.
- **BROWSER-06:**
  - A row right-click opens a 9-command menu ending in "Copy Link".
  - Right-clicking a title link gets the browser's menu.
  - Esc returns focus into the row.
  - The Mac app builds native menus for rows, links, text and fields.
- **DATA-04, WDATA-04:**
  - Mark Played removes the row and shows an Undo toast with `timeout: 0`.
  - ⌘Z restores the row.
  - Edit › Undo names the step in the Mac app.
- **DLG-01:** Delete Playlist has no confirmation. It goes to the Trash with Undo. The only alertdialog is Rewind, which opens with Cancel focused and explains what is kept.
- **CTRL-04, WDATA-03:**
  - "Enter the whole address, starting with https://"
  - "This address didn’t give a podcast feed. Check it, or find the podcast by name with Search."
  - Both errors keep the typed value.
- **APPEAR-04:** no failing text pair in any state, including the dark drawer, toasts and the bars. The lowest is 5.23:1 for 13 px muted text.
- **WTYPE-04:** the only sub-24 px targets are 16 px checkboxes inside 40 px labels, and inline title links, both within the spacing exception.
- **WTYPE-02, WTYPE-03, WTYPE-05:** no horizontal scroll at 320, at 720×450 or at 200% root size, and no clipping under the spacing overrides.
- **APPEAR-03:** forced colors stay usable, with control boundaries drawn.
- **BROWSER-10 (lab):**
  - LCP is 32–288 ms and CLS is 0 across four screens (412×915, no throttling).
  - RESP-01's p75 is ≤ 122 ms.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | Inter for UI and Space Grotesk for page titles, panel titles and the drawer title. A small scale (13 / 15 / 28 px) carries the hierarchy with weight and muted color. Tabular figures appear on times and counts, and the punctuation is typographic throughout ("Rewind “…”", "…", −16:34). Below 9: the mini-player title truncates to 14 characters at 412 ("The long life o…") and wraps to two lines before truncating at 320. In the desktop drawer, Up next titles wrap in a 330 px column with space to spare. | hierarchy, craft |
| Hierarchy | **8.5** | The squint test passes: the title, the list, the one blue Play per row and the dark player bar, in that order. Row actions appear on hover or focus, as in Things. Below 9: the Listening Timeline gives every event an equal-weight "Rewind to here" pill (9 on Default), and that column outweighs the events. The View page says "Next and Last go to" twice, in the toolbar label and the panel overline. | content-first, hierarchy |
| Spacing & density | **8.3** | An even 8 px rhythm, 76 px rows, and shared left edges across the header, the tabs and the rows. Below 9: content widths change by screen. Views fill to x=1408, Playlist and Library columns stop at 1160, and Settings and Playlist settings at 896, which leaves 280–540 px dead at 1440 and moves the header action between screens. The desktop drawer bunches the player and Up next into the middle 60%. At 320×640 the player bar and tabs take 180 px (28%). | craft, hierarchy |
| Color & contrast | **8.8** | Restrained: blue means interactive or now, red means destructive (Unsubscribe, Delete Playlist), green with a check means Played, and amber with a star means Starred. Every measured pair passes, including the dark drawer and the toast's `#9db4ff` Undo. Single theme (owner decision, WCOLOR-01 passes). Below 9: forced colors work but look unfinished. The Episode action row becomes abutting square boxes while Play stays round, and the selected phone tab gets a square outline around its oval. | color-restraint, accessibility |
| Iconography | **8.6** | One lucide set at matching stroke weight, with custom 15/30 skip glyphs. Every icon-only control has a tooltip, which also appears on keyboard focus, and a name. Below 9: Next and Last appear as text on View rows but as list-start/list-end glyphs on the Episode page and the bulk bar. The gear means app Settings (phone Library header), Playlist settings, and podcast settings (Library rows). | conventions, craft |
| Consistency & polish | **8.5** (stability 8.8) | Every state is designed: skeleton rows, empty cards, inline errors, pressed and active states, disabled Default name, and hover/focus row reveal. Toasts, errors and Undo follow one pattern. Stability: zero FLOW failures at three widths, with two inventory mismatches (drill-in headings; Next/Last vocabulary). Further gaps: the Subscribe pill is about 36 px tall against 40–44 px elsewhere, and the forced-colors oddities above. | craft, stability |
| Clarity | **8.8** | Domain words used precisely ("Clear on Played", "Rewind to here", "Kept: Entries you added or moved since…"). The Played choices are spelled out, and the search scope is stated under the field. First run is a three-step checklist with "Skip for now". Below 9: the Add-podcasts mode switch is a set of `aria-pressed` toggle buttons (each a Tab stop, announced as "toggle button") for what is a tab set. The Playlists overview shows no selection in the sidebar. | plain-language, feedback |
| Platform fit | **8.8** (Looks 8.7 · Behaves 8.9) | Web: every view, tab (`?tab=`), side Episode (`?episode=`), editor (`?edit=`) and search (`?q=`) has a URL and a tab title. Real links, Back that closes overlays first, browser menus on links and text, native fields with `type=search` and labelled inputs, zoom intact, installable with in-app Back, and media-session controls. Mac shell: a full menu bar (File, Edit with named Undo, View, Controls, Go, Window, Help), a window titled by the view, native context menus, and Space shown in the menu without being taken from text fields. Below 9: the desktop column widths read as a centred page in a wide window. | conventions, stability |
| Interaction & feedback | **6.9** (capped by DATA-06; about 8.9 uncapped) | Keyboard-fluent: APG grid, type-ahead, Space to select, ⌘A, and ⌘Z/⇧⌘Z everywhere outside fields. Undo instead of confirmation, live announcements for reorder ("moved to position 2 of 3"), sub-125 ms responses, focus after removal placed on the next row, and a Trash. The Library sort that isn't remembered is the one major gap. | forgiveness, keyboard-efficiency |
| **Overall** | **8.5** | It serves the task very well and is at home in a browser tab, on Android, and in a Mac window. Within its cap (lowest 6.9 + 2.0 = 8.9). What holds it down most: the DATA-06 cap on Interaction. After that, the spacing and composition craft at desktop widths. | |

### What stands between this build and 9.0

1. **DATA-06, the only failure.** Remember the Library sort, and Interaction goes back to about 8.9.
2. **Desktop composition (Spacing 8.3, Hierarchy 8.5).**
   - Choose one content width policy. Either let the Playlist, Library and Episode columns grow as the View does, or keep one shared max-width so header actions sit on one right edge on every screen.
   - Lay the desktop drawer's Up next out to the drawer's right edge, so titles stop wrapping.
3. **Listening Timeline weight.**
   - Make "Rewind to here" a quiet text button revealed on row hover or focus on the desktop (keep it visible on the phone).
   - Or keep one for the focused row.
4. **One vocabulary for one meaning.**
   - Next and Last as icon plus label everywhere, or text everywhere.
   - One drill-in heading pattern on the desktop (breadcrumb or back link, not both).
   - A different glyph or a text label for app Settings in the phone Library header.
5. **Forced-colors finish.**
   - `forced-colors:` gaps or round borders on the Episode action cells.
   - Drop the tab's outer outline when its pill already outlines it.
6. **Small screens.**
   - Let the mini-player title use the space that back-15 frees at 320.
   - Consider shrinking the bar's height at short viewports. The bottom stack is 28% of 320×640.
7. **Smaller fixes.**
   - Say "Next and Last go to" once on the View page.
   - Use the standard pill height for Subscribe.
   - Highlight a sidebar state on `/playlists`.
   - Use APG tabs (or a radiogroup) for Search / Feed address / OPML file.

## Next step

- **Target:** DATA-06, the only major failure. It's in Interaction & feedback, the lowest-scoring category.
- **Anti-pattern:** state kept only in the URL, so a navigation link resets it ("forgetful window").
- **Root cause:** the Library sort exists only as `?sort`. The sidebar, tab and Go-menu links point at bare `/library`, so arriving any way except Back throws the arrangement away. The View's target Playlist doesn't have this problem, because it's remembered on the Device.
- **Change:** persist the sort with `remembered.ts`. In `validateSearch`/`LibraryScreen`, fall back to the remembered sort when `?sort` is absent, and keep the URL in sync with `replace`.
- **Principle:** `stability`.
- **Expected effect:**
  - Interaction & feedback goes from 6.9 to about 8.9.
  - Overall rises toward 8.7.
  - No category gets worse.
