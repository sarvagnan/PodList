# UI grade, round 31

Build `a608153`. Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), as a **web app**, by a grader who did not read earlier rounds or the work lists in UI-GRADE.md. Browser: Playwright Chromium 1.65 (headless, macOS arm64), service workers blocked, 100% zoom unless stated; Mac shell: Electron 44.9.3 through Playwright `_electron`. Probe scripts and captures: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r31/` (p1–p22, PNGs named below).

## Frame

- **Task:** find Episodes through Views and Search, and listen to them through Playlists, with the player always at hand.
- **Target:** web app, an Android-first installable PWA (`display: standalone`); the Mac app is the same build in an Electron window (720×450 minimum), so platform fit is judged for Android Chrome and a Mac desktop window.
- **Posture:** sovereign on desktop, a daily companion on the phone.
- **Audience:** a perpetual intermediate who listens every day.
- **Nearest exemplar:** Things, for its calm lists, quiet chrome and finished states. BBEdit, for the menu and keyboard completeness of the Mac shell.
- **Character:** (1) Space Grotesk headings over Inter text (owner); (2) blue primary #2b50c8 on a warm off-white page (owner); (3) a dark player bar and Now Playing drawer (owner); (4) Views and Playlists as equal halves, navigated by lists rather than capsules (owner, variant A); (5) artwork tiles at the head of every row, with plain-spoken domain words (Entry, Cursor, NOW/HERE, Clear on Played).
- **Owner decisions:** light appearance only; layout variant A; Inter and Space Grotesk; blue #2b50c8; dark player; View editor R, Playlist settings and Rewind C, Library C. These are scored but not targeted.

## Flows

The owner's flow run is at `…/scratchpad/flows-r31`: browse, listen, now playing, fresh device and second tab, each at phone 412×915, zoomed 720×450 and desktop 1440×900, in Light only (dark isn't designed). Late arrivals were held 2000 ms. `measurements.json` has 72 rows, and strips are under `strips/<flow>/<width>/`.

- **Unprompted steps:** listen/3 and /8 ("playing"), fresh device/2 ("catalogue arrives") and second tab/1. In every one, the heading, navigation and player moved dx 0 and dy 0 at all three widths.
- **Timed runs:** desktop, 5 runs each, no throttling, darwin arm64. Open a Playlist had a p75 of 119 ms, and Play from here had a p75 of 98 ms.
- **My own additional flows:**
  - **FLOW-03 under slow sync** (p18, p19). Every `/api/**` request was delayed 900 ms. I typed into the View name, Mentions, the Playlist name and the Add podcasts search, pausing 700 ms (past the 500 ms debounce) in the middle of words. No typed character was replaced or reordered, for example "Starred x1y2z3" held through settle. The one odd result came from the test itself: on macOS, Home and End scroll rather than move the caret, so it isn't an app fault.
  - **Remove, Undo and focus** (p4).
  - **Delete to Trash and Restore** (p7).
  - **Rewind** (p7).
  - **Add podcasts:** a bad address, a 404 and success (p8).
  - **Scroll and focus restoration** after Back and reload (p6).

Failures: none against FLOW-01 to FLOW-07.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop, phone) | Dark toast above the player, bottom-leading. Wording varies: "Playing next in Default", "Added last in Default", "Marked Played", "Unstarred" | Download failure as a row icon plus "Download failed. Try again" | none | Undo in the toast, and ⌘/Ctrl+Z | Dashed card, title plus one line | none | Play, always last in the row; Edit View at the header's trailing edge | Summary line under the title |
| Search | none | none | none | n/a | Dashed card: "Search your Library" / "Nothing matches · Try fewer or different words." | none | Save as View, header trailing | Hint under the field |
| Playlist (Entries) | Toast: "Removed “X” from Workshop", "Moved “X”" | none | none | Toast Undo returns focus to the restored row | Dashed card: "Nothing here yet · In a View, use Play Next or Play Last…" (no link) | none | Play / Play this, header trailing | none |
| Listening Timeline | Toast after a Rewind | none | Centred modal: "Rewind Default to 14:30?", with Cancel (default) and Rewind | Undo in the toast | n/a | none | Rewind to here on each row | An intro paragraph |
| Playlist settings | "Saved as you type." (static) | n/a | none | Delete leads to the toast "Moved “X” to the Trash" with Undo | n/a | none | Delete Playlist (red text button) | Note under Delete |
| Trash | Toast: "Restored “X”" with Undo | none | none | yes | Dashed card: "The Trash is empty · A deleted Playlist waits here…" | none | Restore on each row | Retention line |
| New Playlist dialog | Opens the new Playlist | Inline, red, under the field: "There’s already a Playlist called “Commute”." | none | n/a | n/a | none | Create, trailing | Hint under the checkbox |
| Add podcasts sheet | The row button becomes "Subscribed" | Inline, red, under the field, with a recovery: "This address didn’t give a podcast feed. Check it, or find the podcast by name with Search." | none | n/a | n/a | none | Subscribe on each result | A line under each field |
| Not found | n/a | Playlist: "There’s no Playlist at this address…" plus the link **See your Playlists**. Episode: "This Episode isn’t in your Library…" with **no link** | none | n/a | n/a | none | n/a | n/a |
| Drawer queue | Same toast, inside the drawer | none | none | yes | n/a | none | Play from here | n/a |

**Mismatches**

1. **Play Next and Play Last confirmations use different grammar.** Play Next says "Playing next in Default", in the present progressive, and reads as if it were already playing. Play Last says "Added last in Default", in the past tense (View rows; p16).
2. **Only one not-found page offers a way on.** "Playlist not found" links to the Playlists list; "Episode not found" has nothing (p15).
3. **The current Entry looks different in the queue.** On the Playlist page, the NOW/HERE Entry keeps its move handle and lines up with the other rows. In the Now Playing drawer's queue it has no handle, and its artwork sits 44 px left of the rows below it: x 24 against 68 on the phone, and 768 against 812 on the desktop (`ph-drawer-queue.png`, `desktop-drawer.png`).
4. **Episode rows reveal different actions on hover.** At 1440 px, View and Search rows show an inline strip: Next, Last, Add, Star, Played, Download. Subscription rows show only a "…" button (`desktop-episode.png` against `desktop-subscription.png`).
5. **Undo puts focus back in one path but not the other.** The toast's Undo returns focus to the restored row: after Remove, focus lands on the restored title. ⌘Z after Unstar in the Starred View brings the row back but leaves focus on the H1 (p4, p16).

## Checklist

Coverage: **92.8%** (pass 87 · fail 3 · N/O 7 · N/A 8; applicable 97). Mac IDs: N/A → target.

**Failures by severity**

- **[WTYPE-05] major: the View header overflows at the zoomed-desktop width and at the Mac app's minimum window.**
  - **Where:** every View, desktop layout, at main widths from 704 px to about 760 px, whenever a Playlist name runs past about 17 characters.
  - **Evidence:** p11, p13, p14. The native `select` in `NextLastTarget` (`components/episodes/EpisodeRow.tsx:398`) is as wide as its longest option, which is a Playlist name, and the header row doesn't wrap.
    - With a Playlist called "Saturday long-run listening", the document is 755 px wide in a 720 px viewport, so the page scrolls sideways and **Edit View** is cut to "Edit Vi" (`long-view-720.png`).
    - With a 20-character name it is 732 px.
    - The same happens on `/views/short`, `/views/starred` and with the Episode panel open. Search, Library, Playlists and Settings are clean at 720, 412, 320 and 1024 px.
    - 720×450 is both the WCAG 200% width tested here and the Electron window's `getMinimumSize()`.
  - **Fix:**
    - Give the select `max-w-[min(14rem,40vw)]` with `text-overflow: ellipsis`, or `field-sizing: content` with the same max-width.
    - Let the header's action group wrap (`flex-wrap`), so Edit View drops under the picker instead of past the edge.
    - Below 64rem, consider "Next/Last to" as the visible label, keeping the full name as the accessible name.
- **[COPY-04] minor: capitalization isn't consistent by element type.**
  - **Evidence:** the row menu (p4, p6) is in Title Case: "Play from Here", "Move to Top", "Move to Bottom", "Mark Played", "Open Episode", "Copy Link". The Sleep timer menu (p10) is in sentence case: "In 5 minutes", "At the end of this Episode". Buttons are in sentence case as well: "Rewind to here", "Show getting started", "Skip for now", "Add podcasts".
  - **Fix:** use sentence case for the web menus, keeping domain nouns capitalized: "Play from here", "Move to bottom". Keep Title Case only in the native Mac context menu. `main.ts` builds that menu from the same labels, so either map the labels per surface or accept sentence case there.
- **[COPY-03] minor: one not-found page and one empty state leave the reader without a way on.**
  - **Evidence:** "Episode not found" gives no next step or link, unlike "Playlist not found" (p15). The empty Playlist's step, "In a View, use Play Next or Play Last…", names a place without linking to it.
  - **Fix:** add "Go to your Views" (or the View the person came from) to the Episode not-found state. Make "a View" a link to `/views`.

**N/O:** KEY-06 (international layouts for ⌘/ and /), LIST-05 (disclosure state across reloads), DRAG-05, DRAG-06 (pointer-drag visuals and autoscroll), FOOT-02 (no long list in the demo), BROWSER-10 (LCP not measured; lab INP-like step times 98–119 ms), WDATA-02 (offline and quota save status not exercised).

**N/A:** AX-05 (no autoplay), START-04 to START-07 (no permissions prompted, no accounts), TOOL-06 and SIDE-03 (no hideable bars or panes), WIN-03 (→ WTYPE-05 under the web reading; the 720 px overflow is recorded once, there).

**Passes worth naming, with evidence**

- **Keyboard (KEY-01, KEY-04, WKEY-01 to WKEY-04, LIST-07; p3).**
  - A skip link comes first.
  - The episode grid is one Tab stop, with arrows, Home and End, and type-ahead ("the w" jumps to "The workshop…").
  - Enter opens the detail beside the list, and Esc closes it with focus kept.
  - The ⌘/ (Ctrl+/) reference opens and closes with focus restored.
  - Esc on the Rewind modal returns focus to the row's "Rewind to here".
- **Back and history (BROWSER-01, BROWSER-02; p4, p6).**
  - Back closes the Add sheet, then the drawer's Queue page, then the drawer, each with focus returned.
  - `?episode=`, `?edit=true` and `?tab=` are addressable.
  - Back and reload restore both scroll (scrollY 491) and the focused row.
- **Right-click and copy (BROWSER-06, EDIT-05; p6).**
  - Rows get a task menu; links keep the browser's menu.
  - The row menu opens from a focused non-link cell.
  - Copy Link and ⌘C on a row both put the Episode URL on the clipboard.
  - The Mac shell shows rows' commands as a native menu, with Open in Browser and Copy Link.
- **Contrast (APPEAR-04, WCOLOR-02; p2).** A scan of 14 states at phone and desktop width, including the dark drawer and sheets, found no text under 4.5:1, apart from the decorative 11 px "15" and "30" numerals inside the skip icons. The focus ring is 2 px #2b50c8, or white on dark surfaces.
- **Forced colors (APPEAR-03; `fc-*.png`).** Boundaries, progress, the NOW row and selected tabs all keep visible edges.
- **Resizing and spacing (WTYPE-02, WTYPE-03, WTYPE-04; p5, p17).**
  - At 200% text, nothing is lost. Speed and Sleep leave the bar for the drawer.
  - At 320 px there is no horizontal scroll.
  - The text-spacing overrides clip nothing but the designed one-line player title.
  - Every small target meets the spacing exception.
- **Undo (DATA-04, DATA-05; p4, p7, p16).** Remove, Move, Mark Played, Unstar, Delete View, Delete Playlist, Restore and Rewind all have Undo. Undo toasts don't time out, and plain notices last 3–4 s.
- **Mac shell (p9).**
  - A full menu bar: App, File, Edit, View, Controls, Go, Window and Help, with Settings… on ⌘,.
  - The Undo item is labelled with what it undoes.
  - The window title follows the view.
  - Space and ⌘← are shown in the menus without being taken from text fields.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | A small, role-mapped scale: Space Grotesk 28 px titles, Inter 15 px rows, 13 px metadata, 12 px tracked caps (0.08em) for section labels. Real typographic punctuation throughout ("−16:34", “ ”, …). Steps are in rem, so the 32 px root holds hierarchy. Below 9: heavy truncation of the most-read text. The phone mini-player title shows about 14 characters at 412 px ("The long life o…"), and at 320 px Playlist rows clamp titles to three lines of about 10 characters ("The quiet edge of the sola…"). | `hierarchy`, `craft` |
| Hierarchy | **8.7** | One list and its title lead every screen. The Up next panel and sidebar recede, and row actions appear on hover or focus only where `(hover:hover)` applies. A single tinted primary per header (Play, Play this, Add podcasts, Done). Below 9: on the Listening Timeline, "Rewind to here" repeats in full on every row and competes with the events. The 1440 px drawer leaves about 260 px of dead space to the right of Up next. | `content-first`, `hierarchy` |
| Spacing & density | **6.9** (capped; about 8.6 uncapped) | Capped by **WTYPE-05 major**: the View header overflows at 720 px with a long Playlist name. Otherwise there's a clear rhythm: 76 px Episode rows, 36 px sidebar rows, aligned 256 px content edges, and calm density that suits the posture. Craft misses: the Search field ends at x 1024 while the results card ends at 1007 and the panel divider sits at 1041. The Subscription settings column stops at 1291 while header controls align to 1408 on every other screen. The drawer's NOW row is outdented by 44 px. | `craft`, `adaptability` |
| Color & contrast | **8.8** | Restrained, meaningful palette: blue for interaction and selection, green for Played (with ✓ and the word), amber for Star (with the glyph), red only for destructive actions and errors. Everything measured passes, including the dark drawer. Forced colors keep every boundary. Light-only is the owner's decision (WCOLOR-01 passes). Below 9: placeholder artwork varies between surfaces (a tinted "DF" tile in Add podcasts against the solid tile in the Library). | `color-restraint`, `accessibility` |
| Iconography | **8.7** | One Lucide family at the text's stroke weight, plus custom 15/30 skip glyphs. Every icon-only control has a tooltip on hover and focus (`Tip`) and an accessible name. Below 9: "+" carries three meanings (Add to a Playlist on rows, New View and New Playlist in the sidebar, and the "You added" marker on the Timeline). | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability 8.7) | No FLOW failures across 72 measured steps. Hover, pressed, focus, disabled, loading skeletons, empty, error and forced-colors states are all designed. The stability sub-score sits below 9 because of five inventory mismatches: Play Next and Play Last wording, not-found pages, the drawer's NOW row, hover actions on Subscription rows against View rows, and ⌘Z focus against toast-Undo focus. The category is held lower by the misalignments listed under Spacing. | `craft`, `stability` |
| Clarity | **8.5** | Specific verbs and consistent domain words, and state is always visible (NOW/HERE, Paused, the Active dot, "Saved as you type."). Errors name the cause and the recovery. Below 9: COPY-04 and COPY-03 (minor). "Playing next in Default" reads as if it were playing. The bulk bar's Play Next and Play Last don't name the target Playlist; rows say "Play Next in Default", but the picker hides while rows are ticked. | `plain-language`, `feedback` |
| Platform fit | **9.0** (Looks 8.8 · Behaves 9.1) | Behaves: every state worth sharing has a URL, and Back peels overlays before views. Links are real `<a href>`. Browser menus stay on links and text. ⌘K is bound only on a Mac, so Ctrl+K stays the browser's. Native selects and inputs. Standalone PWA with in-app Back. Mac shell: a complete menu bar, native row menus, a per-view window title, swipe for Back. Looks is held down because the layout overflows at the Mac app's own minimum window (L8). Other gaps: the Edit menu's Undo is labelled with a past-tense sentence ("Undo “Removed ‘Who sets…’ from Commute”") rather than a verb phrase ("Undo Remove from Commute"), and the row context menu has no accessible name. | `conventions`, `stability` |
| Interaction & feedback | **8.9** | Keyboard-fluent (APG grid, type-ahead, Space, /, ⌘/, ⌘Z and ⇧⌘Z, keyboard reorder with live announcements, "position 2 of 2"). Forgiving: Undo instead of confirmation, and Trash. Fast (p75 98–119 ms). Focus lands on the next row after a removal. Below 9: ⌘Z restores content without bringing focus to it, while the toast's Undo does. Undoing Delete View brings it back in the sidebar but leaves you on another View. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **8.5** | Cap: 6.9 + 2.0 = 8.9, not binding. It serves its task well and is at home in the browser and in the Mac window. The one real defect, the 720 px header overflow, sits on the primary screen at the Mac app's minimum size. Behind it is a layer of unfinished consistency: confirmation wording, alignment of the current Entry, and focus after ⌘Z. That layer keeps the visual categories in the high 8s rather than at 9. | |

## What stands between this and 9.0

1. **Fix WTYPE-05 (removes the 6.9 cap).** Spacing & density should return to about 8.6, and Platform fit's Looks half to about 9.0.
2. **Close the five inventory mismatches.**
   - Word both confirmations the same way, for example "Added next in Default" and "Added last in Default", or "Play Next: Default" and "Play Last: Default".
   - Add a link to Episode not found.
   - Give the drawer's NOW row the same handle column, or the same indent, as the Playlist page.
   - Use one hover pattern for Episode rows at a given width.
   - Have ⌘Z move focus to what it restores, as the toast already does.
3. **Craft alignments.**
   - Align the Search field with the results column.
   - Let the Subscription layout reach the same 1408 px trailing edge as its header.
   - Name the target in the bulk bar ("Play Next in Default").
   - Sentence-case the web menus (COPY-04).
   - Give the row context menu an accessible name ("Actions for <title>").
   - Phrase the Mac Undo label as a verb ("Undo Remove from Commute").
4. **Make the playing title visible on the phone.** Let the 412 px mini-player title use a second line, or drop the ±15/30 buttons at that width, as already happens at 320 px. It is the most-read string in the app and shows about 14 characters.

## Next step

- **Target:** WTYPE-05, the major failure in the lowest-scoring category, Spacing & density.
- **Anti-pattern:** a fixed-content toolbar that doesn't reflow, so the layout breaks between breakpoints rather than at the extremes.
- **Root cause:** an unbounded native `select`, sized to its longest option (user-named Playlists), sits in a non-wrapping header row beside a fixed-width button. The row's width depends on user data rather than on the window.
- **Change:**
  - Add `max-w-[min(14rem,40vw)] truncate` to the `NextLastTarget` select.
  - Add `flex-wrap justify-end` to the header's action group.
  - Re-run the 704, 720 and 760 px sweep with a 30-character Playlist name.
- **Principle:** `adaptability`, `craft`.
- **Expected effect:**
  - Spacing & density rises from 6.9 to about 8.6.
  - Platform fit's Looks rises from 8.8 to about 9.0, and Platform fit to about 9.1.
  - Overall rises from 8.5 to about 8.7.
  - Nothing else regresses, since the picker keeps its native keyboard and phone behavior.
