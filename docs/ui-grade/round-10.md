# UI grade, round 10

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), at commit `c4cadf6`. Independent read: earlier rounds and the UI-GRADE.md work lists weren't consulted.

**Overall 7.7.** Two categories are capped at 6.9 by three major failures. Each one is a contained bug or omission, not a design problem:
- closing the Queue page navigates away;
- the sidebar hides focus under the player bar at 200% zoom;
- the `/` key fires everywhere and can't be turned off.

Without those caps, Platform fit would score about 8.3 and Interaction & feedback about 8.4, and Overall would land near 8.4. What remains between that and 9.0 is craft, listed under [§ Craft gaps](#craft-gaps-holding-categories-below-exemplary).

## Frame

- **Task:** find Episodes through Views, put them in Playlists (Play Now, Next or Last), and listen from the player and the Now Playing drawer.
- **Target:** web app. It is an Android-first installable PWA, and the Mac app is the same build in an Electron window.
  - The owner's stated target wins ([platform-fit.md § Choose the target first](~/Documents/UI_Guidelines/guidelines/platform-fit.md)), so Mac IDs are N/A → target.
  - The Mac shell (`packages/desktop/src/main.ts`) is still judged as part of Platform fit for the desktop window.
- **Posture:** sovereign on desktop (an all-day listening tool), and a transient check-in on the phone.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, a calm personal list tool: one list, its title, actions on hover or selection.
- **Character:**
  1. Space Grotesk headings over Inter (owner).
  2. Warm off-white canvas (#f6f5f2) with one blue primary, #2b50c8 (owner).
  3. Dark navy player bar and drawer (owner).
  4. Two-letter monogram tiles coloured per podcast.
  5. Plain copy that capitalizes the domain nouns ("3 Entries · Clear on Played", "Rewind to here").
- **Owner decisions:**
  - light appearance only;
  - layout variant A, with Views and Playlists as equal halves and navigation as lists;
  - View editor R, Playlist settings and Rewind C, Library C.

## Flows

**Flow run.** Tasks run: browse, listen, now playing, fresh device, second tab (`packages/web/ui-flows/flows.mjs`).
- Widths: phone 412×915, zoomed desktop 720×450 and desktop 1440×900, light appearance only.
- Late arrivals were held for 2 s.
- Evidence is in `flows-r10/`: `measurements.json` (72 rows), the `strips/` folder and the contact sheets.
- Timed runs: 5 passes after a warm-up on darwin arm64 (lab, no throttling). The p75 was 125 ms to open a Playlist and 101 ms for Play from here.

**Probes added this round** (scratch scripts in `scratchpad/grade-r10/`):
- keyboard order and traps;
- Esc, Close and Back with the drawer, sheets, menus and Rewind open;
- focus after removing an Entry;
- toast persistence;
- right-click and the keyboard context menu;
- accessible names;
- text contrast on every screen and in the dark drawer;
- target sizes;
- 320 px and 200% text;
- WCAG text-spacing overrides;
- forced colours and reduced motion;
- lab Web Vitals;
- first run with an empty Library;
- launching the Electron app and reading its menu bar.

**Results:**
- No unprompted move of a core element over 2 px at any step or width (every `moves` entry in `measurements.json` with `caused: false` is 0/0).
- Focus stays where the person put it, and the catalogue arriving on a fresh Device doesn't move the heading or navigation.

**Failures:** none under FLOW-01 to FLOW-06. FLOW-07 is a static placement failure, listed below.

The flows don't cover opening the drawer straight onto Queue from the player's "up next" badge. That's where the worst defect this round sits ([BROWSER-01](#failures-by-severity)).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Dark toast above the player, bottom-leading; "Starred", "Marked Played"; stays until dismissed | none seen | none | Undo in the toast, plus ⌘Z | Dashed box, centred title and line: "No Episodes match this View" | none | Edit View, neutral, header trailing (right edge 1408) | Picker label "Play Next and Play Last go to" |
| Playlist | Same toast; "Removed from Commute", "Moved “Joinery…”" | none seen | Rewind confirmation (alert dialog, Cancel / Rewind) | Toast Undo, plus ⌘Z | Dashed box: "Nothing finished yet" | none | Play / Play this, blue, header trailing (right edge 1152) | Timeline intro paragraph |
| Playlists index | — | — | — | — | — | — | New Playlist, neutral, right edge 1408 | — |
| Library | Toast "Downloads on this Device set to “Stream” for 3 podcasts", with Undo | — | — | Toast Undo | "No Subscriptions yet" plus how-to | — | Add podcasts, blue, right edge 1152 | — |
| Subscription | **4 s toast, no Undo:** "Marked Deep Field Played", "Unsubscribed from Deep Field" | Error returned inside the confirmation dialog | Confirmations for Mark all Played and Unsubscribe | **none** | — | — | Mark all Played, neutral, inline | Field hints in the settings card |
| Add podcasts sheet | **4 s toast, no Undo:** "Subscribed to …" | Inline red text under the field, which keeps its value | — | — | — | — | Subscribe on the result | Hint under the field |
| Search | — | — | — | — | Plain: "Nothing matches / Try fewer or different words." | — | Save as View, neutral, right edge 1408 | Scope line under the field |
| Trash | Toast "Moved “X” to the Trash", with Undo | — | — | Toast Undo, Restore | Dashed box: "The Trash is empty" | — | — | Retention line |
| Playlist settings | Inline "Saved as you type." | — | — | — | — | — | Delete Playlist, red text, bottom | Hint lines |

**Mismatches:**

1. **Undo and timeout differ by screen.**
   - Playlist, View, Library bulk and Trash confirmations carry Undo and stay until dismissed.
   - Subscribe, Unsubscribe and Mark all Played vanish after 4 s with no Undo, and Mark all Played is guarded by a confirmation instead. Screens involved: Subscription, Add sheet.
2. **Object naming in confirmations.** There are three patterns:
   - the object in curly quotes ("Moved “Joinery without screws”", "Deleted “Starred”");
   - the object bare ("Subscribed to Deep Field", "Rewound Default to 14:30");
   - no object at all ("Removed from Commute", "Starred", "Marked Played").
3. **Row actions for the same Episode row differ at the same width.**
   - In a View at 1440, the row shows a hover strip: Next, Last, +, ☆, ✓, ⤓, then Play.
   - In a Subscription, the row has a "…" menu and Play.
   - In Search, the row has only Play.
4. **Search behaves differently from a View.** Search is "an unsaved View", but it has no "Play Next and Play Last go to" picker and no target panel beside the results. A View has both.

## Checklist

**Coverage: 92.9%** (pass 87 · fail 5 · N/O 7 · N/A 6; 99 applicable).

Mac IDs: N/A → target (owner's stated target is web).

### Failures by severity

**Major**

- **[BROWSER-01] Closing the Queue opened from the player badge goes Back past the current view.**
  - **Where:** desktop player bar, "2 up next" button → Now Playing drawer opens straight onto Queue.
  - **Evidence:** `s6-queue.mjs`, from /views/new-this-week → /playlists/commute (history length 3 → 4 on open). The four ways to close behaved like this:

    | Close with | Result |
    |---|---|
    | Esc | Lands on **/views/new-this-week**, focus on its h1 |
    | The drawer's Close button | Lands on **/views/new-this-week**, focus on its h1 |
    | Browser Back | Correct: stays on /playlists/commute, focus back on "2 up next" |
    | Esc, when the Playlist was the first page of the session (`s5-dbg.mjs`) | Leaves the app for **about:blank** |

  - The phone path (drawer → "Up next · 2" → Close) is correct, because it pushes two layers.
  - **Fix:** when the drawer opens directly on Queue, push the same layers as drawer → Queue, or record how many entries this drawer pushed and close with `history.go(-pushed)`. Add the badge → Esc case to the now-playing flow.
- **[WKEY-04] Focused sidebar links sit fully under the player bar at 720×450 (200% zoom).**
  - **Evidence:** `s15-zoomed.mjs` / `s16.mjs`; screenshot `shots/zoomed-focus-workshop.png`.
    - The sidebar `<nav>` is `sticky h-dvh overflow-y-auto pb-24`.
    - The fixed player covers y 370–450.
    - Tabbing to "Workshop" puts it at y 376–412 and "Library" at 414–450, both hidden.
    - Scrolling the nav by hand reaches them, but focus doesn't.
  - **Fix:** add `scroll-padding-bottom` equal to the player's height (plus 8 px) to the nav, or end the nav above the player with `height: calc(100dvh - var(--player-h))`.
- **[WKEY-02] "/" opens Search from anywhere and can't be turned off.**
  - **Where:** `AppShell.tsx` › `useSearchKey`; "/" is listed under "Anywhere" in the shortcut reference. "/" is a punctuation character key (WCAG 2.1.4). It correctly skips fields, but it isn't scoped to a focused component and there's no setting to turn it off or remap it.
  - Space for play/pause is a documented media key and not a character key, so it isn't counted here.
  - **Fix:** add Settings › Keyboard › "Single-key shortcuts" (on by default) that turns off "/" (and optionally Space). Keep ⌘K and ⌘/ as they are.

**Minor**

- **[FLOW-07] The header's main action changes alignment between list screens at the same width.**
  - **Evidence:** at 1440, the trailing header action's right edge is at **1408** on View (Edit View), Playlists (New Playlist) and Search (Save as View), but at **1152** on a Playlist (Play), Library (Add podcasts) and Trash.
  - The content max-width also differs by screen:
    - 1016 px, a View's list;
    - 1160 px, Search, Library and Playlist;
    - 1416 px, the Playlists index.
  - **Fix:** one content max-width per screen kind, and the header actions aligned to that column's trailing edge on every list screen.
- **[COPY-03] An empty View with no podcasts gives no next step.**
  - **Evidence:** `s18-skip.mjs`, empty Library → Skip for now → /views/starter-new-this-week. It shows "No Episodes match this View · New Episodes appear here as your podcasts publish them."
  - Nothing there leads to Add podcasts. The Library's own empty state does.
  - **Fix:** when the Library has no Subscriptions, every View's empty state says "Add podcasts to fill your Views" with an Add podcasts button, instead of describing a filter.

### N/O

DLG-09, CTRL-02, LIST-05, DRAG-05, DRAG-06, PTR-03, FOOT-02 (15 fixture Episodes can't show long-list scrolling).

### N/A

- AX-05: audio is the person's own media.
- START-05: no permission prompt; `storage.persist()` is silent in Chrome.
- START-06 and START-07: no accounts.
- TOOL-06: no hideable toolbars.
- SIDE-03: the sidebar can't be hidden.

### Notable passes (evidence)

**Navigation, URLs and titles**
- **BROWSER-02 and DATA-06:** `?edit=true` and `?tab=timeline` survive a reload, and phone scroll is restored on Back (290 → 290).
- **BROWSER-03:** every tab title names its view.
- **BROWSER-04:** titles are real `<a href>`, and the router intercepts only plain clicks.
- **BROWSER-06:** right-click on a row gives an app menu ending in Open in New Tab and Copy Link. Links and selected text keep the browser's menu. A keyboard `contextmenu` event on a row button opens it.
- **BROWSER-10:** lab LCP was 112–340 ms and CLS ≤ 0.004.

**Keyboard and focus**
- **WKEY-01 and LIST-07:** a View's Episode list is one Tab stop, with arrows, type-ahead, Space to tick and ⌘A.
- **WKEY-03 and DLG-04:**
  - The drawer traps Tab, and Esc or Back returns focus to "Open Now Playing".
  - Rewind's alert focuses Cancel, and Esc returns focus to "Rewind to here".
  - Removing an Entry moves focus to the next row's Remove.

**Undo and saving**
- **DATA-04:** ⌘Z restores a removed Entry.
- **WDATA-04:** the toast was still there after 16 s.

**Appearance and type**
- **APPEAR-04:** every measured text on nine screens and in the dark drawer meets 4.5:1. The only flags were opacity-0 hover actions.
- **APPEAR-03 and APPEAR-05:** forced colours outline buttons, the selection and the player controls. Reduced motion turns sheets into a 150 ms fade.
- **WTYPE-02, WTYPE-03 and WTYPE-05:**
  - At 320 px, nothing scrolls horizontally: titles clamp to 3 lines, "Listening Timeline" shortens to "Timeline", and back-15 drops from the player.
  - With a 32 px root size, nothing clips.
  - With the text-spacing overrides, nothing clips.
- **WTYPE-04:** only the 16 px native checkboxes and the 16 px-high sort headers are under 24 px, and both meet the spacing exception.

**Other**
- **RESP-01:** p75 ≤ 125 ms.
- **START-02:** Skip stays skipped after a reload, and Settings › Show getting started brings it back.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.5** | A small, role-mapped scale: Space Grotesk page titles (32 px desktop, 28 px phone); 15–16 px Inter row titles; 13 px secondary metadata; 12 px letterspaced caps section labels ("VIEWS", "IN YOUR PLAYLISTS"); tabular chapter times. Hierarchy comes from weight and colour more than size. Below 9: the Subscription row's "✓ Played·" lacks the space before the separator, and on the phone its metadata wraps with a hanging indent under "Deep Field" ("52 min" on its own line). The Timeline's zero-length event reads "12:34 → 12:34". Toast text truncates instead of wrapping. | hierarchy, craft |
| Hierarchy | **8.4** | One blue primary per screen (Play, Play this, Add podcasts, Done). Row actions on desktop surface on hover, as in Things. The sidebar recedes. Below 9: every View row repeats a tinted light-blue Play disc, so the list reads as a column of blue dots competing with the titles. Desktop Episode detail gives Played, Download, Next, Play, Last, Add and Star equal grey discs, with Play only slightly favoured. The 1440 drawer leaves a ~330 px dead band between the player column and Up next. | content-first, hierarchy |
| Spacing & density | **8.1** | A clear rhythm: 76 px Episode rows, 36 px sidebar rows, 16/20 px gutters. Phone and 720×450 layouts reflow cleanly. Below 9: content widths of 1016, 1160 and 1416 px on sibling screens (FLOW-07). The Timeline's "YESTERDAY" heading sits at x 248 while its intro and rows sit at 256. Empty-state boxes keep a fixed ~240 px height with the text pinned to the top (first-run View). At 320 px, the Playlist row spends ~120 px on the handle, position and tile, leaving 150 px for the title. | craft, hierarchy |
| Color & contrast | **8.7** | Restrained, with fixed meanings: blue means interactive or primary, green ✓ Played, amber star, red only for destructive actions. All text meets 4.5:1, including the dark drawer's secondary text. A single light theme (owner) declares `color-scheme: light`. Forced colours are handled deliberately. Below 9: the per-row tinted Play discs and the blue "NOW/RESUME" labels plus blue progress put a lot of the accent on one screen. | color-restraint, accessibility |
| Iconography | **8.4** | One Lucide set at text weight, custom 15/30 skip glyphs that read instantly, and tooltips on icon-only buttons. Below 9: the View row's hover strip mixes text buttons ("Next", "Last") with icon buttons (+, ☆, ✓, ⤓). The same commands are icon-over-label discs on Episode detail and menu items in the "…" menu, so one command has three looks. The "Default" Playlist's animated bars glyph is the only state shown that way. | conventions, craft |
| Consistency & polish | **7.9** (stability 8.2) | Every core flow holds still at every width. Empty, loading, error and Undo states are designed throughout, and the drawer, sheets and alerts share one motion and backdrop. Stability is Strong, not Exemplary: inventory mismatches 1 and 2 (two confirmation lifetimes, three naming patterns). The category is held further by FLOW-07, mismatch 3 (three row-action sets for one Episode row) and the BROWSER-01 queue close. | craft, stability |
| Clarity | **8.3** | Domain words are used exactly, and settings explain consequences ("It goes to the Trash with its History and Listening Timeline…"). The Rewind confirmation states what is kept, and Search states its scope. Below 9: "Removed from Commute" doesn't say which Episode. Episode detail's back link is a generic "Back", while every other back link names its destination. An empty View with no podcasts gives no next step (COPY-03). The phone player bar has no queue count, unlike the desktop bar and the design. The "Playlist settings" tab title doesn't name the Playlist. | plain-language, feedback |
| Platform fit | **6.9** (capped; uncapped 8.3) | **Looks 9.0:** a full-viewport frame with its own sidebar or bottom tabs; native selects and fields; links that read as links; ⌘ shown only on a Mac; reflow at 320. **Behaves 8.0:** real links, URLs for every view, sub-tab and editor state, browser menus kept on links and text, and an app menu only on rows. **Capped by BROWSER-01** (the queue close navigates away). The Mac window is strong context: a standard title bar, a full menu bar (File New Playlist ⌘N, Edit with "Undo “…”" labels, Controls, Go ⌘1–3, Help › Keyboard Shortcuts ⌘/), Settings… ⌘, and native row menus. It lacks only a View › Show Now Playing item. (9.0 + 2 × 8.0) ÷ 3 = 8.3 before the cap. | conventions, stability |
| Interaction & feedback | **6.9** (capped; uncapped 8.4) | Keyboard-fluent and forgiving: ⌘K and "/" go to Search; a grid with type-ahead; keyboard reordering (Space on the handle, plus Move to Top/Bottom); Undo toasts and ⌘Z everywhere for the app's own edits; confirmations only for Rewind, Unsubscribe and Mark all Played; p75 ≤ 125 ms. **Capped by WKEY-04 and WKEY-02.** Further gaps: Mark all Played is confirmed instead of undoable. The Add sheet opens with focus on Close rather than the preselected Playlist. Subscribe and Unsubscribe confirmations vanish after 4 s with no Undo. | keyboard-efficiency, forgiveness |
| **Overall** | **7.7** | Serves the primary task well, and the browser frame and the Mac window are both respected almost everywhere. The two caps come from three small, specific defects. The weakness holding Overall down most is the history handling of the queue badge, which sits on the most-used surface (the player bar) and can throw people out of the view they were in. Cap check: lowest category 6.9 + 2.0 = 8.9 ≥ 7.7. | — |

## Next step

- **Target:** BROWSER-01, a major failure in the lowest category (Platform fit, tied with Interaction & feedback) and the closest to the primary task.
- **Anti-pattern:** "Back leaves the app or throws away the current state" (web B1).
- **Root cause:** the drawer's back-layer count isn't tied to how it was opened. The badge pushes one history entry, but close pops the depth of drawer + Queue (two).
- **Change:** make the drawer push one history entry per page it shows, whichever page it opens on, and close with `history.go(-pushedHere)`. Add "badge → Esc", "badge → Close" and "badge as the first page → Esc" steps to `ui-flows/flows.mjs`.
- **Principle:** stability, user control.
- **Expected effect:** Platform fit uncaps to about 8.3, and Consistency & polish gains about 0.2.
- **Then:**
  - WKEY-04: `scroll-padding-bottom` on the sidebar nav.
  - WKEY-02: a setting to turn off single-key shortcuts.
  - These uncap Interaction & feedback to about 8.4.

## Craft gaps holding categories below Exemplary

Ordered by how many categories each one lifts.

1. **One confirmation pattern** (Consistency, Clarity, Interaction).
   - Every confirmation names its object in curly quotes ("Removed “Joinery without screws” from Commute").
   - Every one that changes data has Undo and stays until dismissed: Subscribe, Unsubscribe and Mark all Played included.
   - Mark all Played becomes undoable with no confirmation.
   - Toast text wraps to two lines instead of truncating.
2. **One content column and header alignment** (Spacing, Consistency; fixes FLOW-07).
   - A single max-width per screen kind.
   - Header actions aligned to the column's trailing edge.
   - The Timeline's date headings on the same 256 px line as everything else.
3. **One row-action model per width** (Consistency, Iconography).
   - The View row's hover strip uses one form: all icons with tooltips, or all text.
   - The Subscription and Search rows use the same strip at the same width as a View.
   - The "…" menu is kept for narrower widths.
4. **Quieter per-row Play** (Hierarchy, Color).
   - An untinted Play glyph that tints on row hover or focus. The code already does this on hover, so the work is to stop tinting at rest.
   - That keeps the list's strongest shapes the titles.
5. **Empty states fitted to content** (Spacing, Clarity).
   - No fixed-height dashed boxes.
   - A "no podcasts yet" variant with Add podcasts (COPY-03).
6. **Small copy and title fixes** (Clarity, Typography).
   - The back link on Episode detail names where it goes.
   - The tab title is "Commute settings", and History and Timeline add their name to the title.
   - "✓ Played · Deep Field" gets its spacing, and the metadata wraps flush.
   - The Add sheet focuses the preselected Playlist.
7. **Phone player queue count** (Clarity): add the design's queue badge to the phone player bar, opening the drawer on Queue (after the BROWSER-01 fix).
8. **Desktop drawer** (Hierarchy, Spacing): close the dead band at 1440 by centring the player column and Up next as one composition, or by giving the middle column Chapters as the design says.
