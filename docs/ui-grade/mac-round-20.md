# PodList Mac: UI grade, round 20 (Opus)

The build is at commit `faa47e0` (`apps/apple`). The evidence is the round-20 XCUITest tour in `podlist-grading/mac-round-20/`: `light/`, `dark/`, `borders-light/`, `borders-dark/`, `timings.txt`, `menus.txt` and the `.txt` accessibility snapshots. The standard is `~/Documents/UI_Guidelines/CRITIQUE.md`, run as a full audit, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`.

The app wasn't launched. Capture references are given as `L/NN` (Light) and `D/NN` (Dark), `BL/NN` and `BD/NN` (Show Borders), and code paths are under `apps/apple/Sources/`. Contrast ratios were measured on the 2× PNGs: the most common pixel in a text box is taken as the background and the pixel furthest from it in luminance as the text, using WCAG 2 luminance.

## Frame

- **Task:** find podcast Episodes, through saved Views, Search and Subscriptions, and play them in order through Playlists, with a History and a Listening Timeline that can be rewound.
- **Target:** Mac app (SwiftUI, macOS 26+).
- **Era:**
  - **Running release:** macOS 27.2 (26B123), in a VM at Retina 1920×1200 pt.
  - **Build:** macOS 26.0 SDK, minos 26.0, with no `UIDesignRequiresCompatibility`, so this is a **current build**.
  - **Appearance:** Light and Dark, each set through the app's own setting.
  - **Accessibility settings:** Reduce Transparency and Increase Contrast were off in every capture, and their handling was read from the code. A separate pass ran with Show Borders on. The system accent was Multicolor, so the app's AccentColor shows.
- **Posture:** sovereign. The Library window is meant to stay open all day as the person's player.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things. It's a calm personal tool, with a few concepts given exact names.
- **Character:**
  1. A deep brand-blue accent: `#2B50C8` in Light, `#3652D0` in Dark (**owner-fixed**).
  2. Artwork tiles that show two-letter initials (MH, DF, SB) on a tint of that blue.
  3. A floating glass player bar with Speed and Sleep text menus, plus an Active-Playlist readout ("Default · 2 after current") (**owner-fixed**).
  4. Domain nouns written as proper terms (Episode, Entry, Playlist, View, Position), and plain copy about consequences: the Rewind summary in L/34, the Trash note in L/11a, and the Settings import note in L/27.
  5. Two-line Episode rows in a sortable table, each with its own Add and Play icons.
- **Owner decisions** (graded, but not proposed as targets):
  - the AccentColor values, including the Dark Settings tab label they produce;
  - Light/Dark/System Appearance;
  - glass on the player bar, the Inspector actions, Now Playing and the scrolling-sheet footer;
  - the two-pane rule below about 950 pt;
  - the Inspector following the selection in wide windows;
  - one toolbar group for Playlists;
  - the "Saved Views" menu name;
  - two-click Unsubscribe on the Podcast page;
  - Undo that doesn't move the window;
  - the Undo/Redo status button appearing only for edits on the current screen;
  - the deleted-Playlist sheet state;
  - "Rewind to Here…" shown only on the selected Timeline row;
  - the RESP-01 misses on sidebar navigation and the New Playlist sheet;
  - Spotlight and Shortcuts donations only in release and tour builds.

## Flows

- **Tasks run** (XCUITest tour, `apps/apple/UITour/PodListUITour.swift`):
  - open a View, select an Episode and show the Inspector (L/02, L/03);
  - open the Playlist Entries, History and Listening Timeline, then select a Timeline row and Rewind (L/06 to L/09, L/34a, L/34);
  - Playlist Settings, Rename, New Playlist, Delete with Restore, and the Trash (L/10 to L/14, L/11a);
  - Search, Edit View and New View (L/15 to L/17);
  - the Podcast page, the description, Unsubscribe armed then disarmed, and Subscription Settings (L/18 to L/22);
  - Add to Playlist, Add Podcasts and Download Rules (L/23 to L/25);
  - Now Playing, Settings, Stats, Getting Started and multi-selection (L/26 to L/33);
  - a delayed Entry-removal Undo that completes while the person types in toolbar Search (L/44).
- **Widths:**
  - minimum, 760×552 pt (L/35, L/36, L/43);
  - half display, 960×1080 pt (L/37 to L/39);
  - default, 1180×760 pt;
  - plus a 30-View, 30-Playlist sidebar (L/40 to L/42).
- **Appearances:** Light and Dark throughout. Show Borders in Light and Dark for 02, 03, 13, 27 and 30.
- **Timed runs:** 5 samples per step, p75 by nearest rank, measured in-app from the input event to the first display frame that can show the result.
  - Device: VirtualMac2,1 with 4 vCPU and 8 GB, on a shared 8-core host at a load average of about 19.
  - Results are in `light/timings.txt` and `dark/timings.txt`.
- **Measurements:** element frames per state come from the `.txt` accessibility snapshots. There is no per-step CSV, so FLOW findings cite snapshot frame pairs.
- **Strips:** the `light/` and `dark/` PNG sequences.

**Late completion (L/44 against L/10, Light and Dark identical):**

| Element | Before (L/10) | After (L/44) |
|---|---|---|
| Entry column header | (605, 274) | (605, 274) |
| Toolbar Play | (1185.5, 208) | (1185.5, 208) |
| Search field origin | (1386.5, 207) | (1386.5, 207) |
| Search value | — | "Inflation" |

- The width of the search field narrows only because its own Clear button appears.
- The status row grows from 15 to 24 pt inside space it already had, so it pushes nothing.
- The insertion point stays in the field, the retained row stays selected (shown gray, because the field holds focus), and Show Restored Entries is offered in the same row.

**FLOW failures:** none.

**RESP-01 p75 (Light / Dark):**

| Step | Light | Dark | Verdict |
|---|---|---|---|
| Sidebar → New this week list | 645.7 ms | 1093.8 ms | miss, owner-accepted |
| Select Episode → Inspector (pane opens) | 408.1 ms | 554.5 ms | **miss** |
| Select Episode → Inspector (pane already open) | 327.0 ms | 679.1 ms | **miss** |
| ⇧⌘N → New Playlist sheet | 724.9 ms | 1547.0 ms | miss, owner-accepted |
| ⌘, → Settings window | 398.8 ms | 972.3 ms | **miss** |
| Final "e" in "rice" → filtered list | 151.4 ms | 175.4 ms | pass |

RESP-02, the time for a keystroke to appear and drag hitches, wasn't measured.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View list (L/02) | Status row, top-leading under the toolbar: cloud glyph and "Up to date", secondary gray | Status row, red text with a Retry button (FailureFeedback.swift) | none | Status row, trailing: "Undo/Redo ‹name›" bordered buttons. Also Edit menu | Centered glyph, title and line, with [Edit View…] [Clear Search] | none | Toolbar group: Play, Add, ⋯, Edit View | View rule line under the status row ("Published in the last 7 days · Unplayed · …") |
| Playlist Entries (L/06, L/44) | Same row: "Undone: Remove from Playlist" | Same row; failed drop slots inline as "Could not add …" | none | Same row: Show Restored Entries plus Redo (L/44) | "No Entries" with [Find Episodes] | none | Toolbar group: Play This Playlist, Add, ⋯, Playlist Settings | — |
| History / Timeline (L/08, L/34a) | Same row | Same row | Rewind sheet with Cancel / Rewind (L/34) | Same row | Title and line. History has **no next step**; Timeline says "Play an Entry to begin." | none | Toolbar group; "Rewind to Here…" trailing on the selected row | Rewind summary of what goes back and what is kept |
| Podcast page (L/18, L/20) | Same row ("Up to date") | Same row; feed errors | Armed red "Unsubscribe" in place (L/20) | Same row | "No Episodes Yet… Try again later." | none | Header button row: Subscribed, Share, Copy Feed Address, gear, refresh | Show Description link |
| Subscriptions (L/01) | Same row | Same row | none | Same row | "Add podcasts to see them here." with [Add Podcasts…] | none | "Edit Download Rules…", top-trailing of the content | "Grouped by Download Rule" |
| Search (L/36) | Same row | Same row | none | Same row | "No Matching Episodes" with [Edit View…] [Clear Search] | none | "Create View…", top-trailing of the content | "15 results" |
| Trash (L/14) | Same row | Same row | Delete Permanently confirmation dialog | Same row | Glyph, "Trash Is Empty" and a retention line (nothing to do, so no button is needed) | none | Context menu Restore / Delete Permanently… | — |
| Sheets (L/11, 13, 16, 22, 23, 25) | Sheet closes; the status row names the step ("Settings for Commute", L/13) | Inline under the field, red caption | — | Edit menu, plus the status row after close | — | Deleted-Playlist note at the top of the sheet (L/11a) | Footer trailing: [Cancel] [Primary], default blue | Gray caption under the control ("Add places the Episodes at the end of the Playlist.") |
| Settings (L/27 to L/30) | Live; no confirmation | Inline under the setting, with Retry | Bring Over sheet | Edit menu ("Keep Playlists in Trash") | — | — | None; changes apply live | Gray captions under groups |
| Add Podcasts (L/24) | Results list | Inline under the field | — | Edit menu (Subscribe) | Glyph, "Find Your Next Podcast" and an example URL | — | [Search] trailing the field | OPML pointer under the field |
| Listening Stats (L/31) | — | — | — | — | Glyph, "No Listening Time Yet" and an explanation, with **no next step** | — | — | — |

**Mismatches:**
1. **Empty-state next step.**
   - The empty states for Entries, Views, Subscriptions and Search each have a button.
   - History (`PlaylistContentView`) and Listening Stats (L/31) state a fact and offer no next step.
   - The Views empty state's button is "New View", without the ellipsis the sidebar and the menu use ("New View…").
   - Screens: L/08 (History, empty case in code), L/31, and the Views empty state.
2. **Capitalization of the same command.**
   - Controls menu: "Back 15 Seconds" and "Forward 30 Seconds".
   - Player-bar names: "Back 15 seconds" and "Forward 30 seconds".
   - "Play from Here" (menu) against "Play from here: …" (row name).
   - "Server address" (Welcome) against "Server Address" (Settings › Server Connection).
   - Screens: menus.txt, L/03.txt, L/11.txt, L/29.

Placement, wording pattern and status color are otherwise consistent:
- every Library screen uses the one status row for success, error, Undo and Show Restored Entries;
- red appears only for errors and the armed Unsubscribe;
- every sheet keeps its primary action trailing at the bottom.

## Checklist

**Coverage: 95.3%** (pass 133 · fail 9 · N/O 7 · N/A 20). That is 169 IDs, of which 149 apply and 142 of those have a verdict.

### Blockers

None.

### Major

- **[RESP-01] Selecting an Episode and opening Settings miss the 200 ms limit.**
  - The Inspector p75 is 408 / 327 ms in Light and 554 / 679 ms in Dark. The Settings p75 is 399 ms in Light and 972 ms in Dark (`light/timings.txt`, `dark/timings.txt`).
  - These are outside the owner's accepted pair (sidebar navigation and the New Playlist sheet, recorded above).
  - The selection highlight may draw sooner, but the tour times the first frame that shows the result, and the brief says to grade other timings as measured.
  - **Fix:** take an Instruments SwiftUI trace of Select Episode → Inspector with the pane already open. That step needs no new pane, so its 327–679 ms is the app's own update work. Then cut the invalidation, for example by keeping the Inspector's data dependency to the selected Episode's own observable, not the window model. Keep the Settings scene's first view cheap, because it pays for the whole General form at once.
- **[KEY-04] ⌘F opens Library Search but leaves focus where it was, and no key focuses the toolbar search field.**
  - `LibraryModel.openLibrarySearch()` (LibraryModel.swift:512) only changes the destination.
  - The field's `@FocusState` is private to `LibraryToolbarSearch` (MacWindow.swift:1019-1045), so no command can reach it.
  - Help tells people to "Click the search field in the toolbar to type" (ConnectionViews.swift). The tour clicks the field after ⌘F (`focusListSearch`, PodListUITour.swift:1275).
  - There's no ⌥⌘F, so filtering the list in view needs the pointer or a Full Keyboard Access tab through the toolbar.
  - **Fix:**
    - Move the search focus into `WindowModel` as a request token, so ⌘F navigates to Search and puts the insertion point in the field.
    - Add Edit › "Search This List" at ⌥⌘F, which focuses the field without navigating.
    - Update the Help line.
- **[KEY-03] The most frequent command, Play/Pause, shows no shortcut in its menu.**
  - Controls › Play has no key equivalent (PlaybackCommands.swift:36-61; menus.txt). The Space accelerator is a local keyDown monitor (PlaybackCommands.swift:67-107) and is documented only in the Help window.
  - Music and Podcasts on macOS 27 show "Space" beside Play in their Controls menu.
  - Option is also used broadly: ⌥⌘J, ⌥⌘A, ⌥⌘E, ⌥⌘I, ⌥⌘, , ⌥⌘↑/↓, ⌥⌘←/→ and ⌥⇧⌘N.
  - **Fix:** give Controls › Play/Pause a displayed Space key equivalent. `PlaybackKeyboardGuard` already routes Space to an editable text view first (PlaybackCommands.swift:127-128). Keep the monitor only as a fallback.
- **[TOOL-02] At half the display, the Playlist toolbar pushes Search into the overflow chevron** (L/39 and D/39, where `library.search` is absent from L/39.txt).
  - The search field is a custom `TextField` fixed at 168 pt (MacWindow.swift:1042), not a system search item, so it can't collapse to a magnifier button the way Mail's and Music's do.
  - The text segments "Entries | History | Listening Timeline" take the width.
  - **Fix:**
    - Make the toolbar search collapsible: use `.searchable` with the system's minimized toolbar behavior, or swap to a magnifier button below a width threshold.
    - Or move the section picker into the content header at narrow widths.
    - Either way, Search stays a trailing essential.
- **[APPEAR-03] Under Show Borders, the app's own interactive controls gain no edge.**
  - In BL/03 and BD/03, the toolbar capsules and glass surfaces gain system outlines. The row Add and Play buttons, the Inspector's five icon buttons, the player-bar transport and the sidebar "New View…" / "New Playlist…" / "Add Podcasts…" command rows stay edgeless. Compare L/03 with BL/03.
  - No code reads `accessibilityShowBorders` (searched across Sources).
  - Reduce Transparency and Increase Contrast are handled: MacGlass.swift:27-33 swaps glass for an opaque window background with a 0.2 or 0.6 stroke, and every custom color has an HC variant (MacAppearance.swift).
  - **Fix:** read `@Environment(\.accessibilityShowBorders)` in `MacIconLabel` and `SidebarCommandButton`, and stroke a 1 pt `.separator` capsule around the hit area while it's on.
- **[APPEAR-04] The Dark Settings toolbar draws the selected pane label "General" at 1.73:1.** The rendered #435FDD sits on a #484746 pill (D/27). The floor for system-drawn accent text in Dark is 2.5:1, so this is **major**.
  - This is the owner's accepted AccentColor trade-off. It is recorded, and its cap stands, but it isn't proposed as a target.
  - The arithmetic shows no single Dark accent can pass both uses:
    - The darkest value on this hue that reaches 2.5:1 on the pill is #587CFD.
    - White on #587CFD is 3.67:1, below the 4.5:1 that the white selected-row text needs.
    - The limit is recorded, not re-tuned.
  - Every other text measured passes:

    | Text | Light | Dark |
    |---|---|---|
    | Secondary text (#606060 / #A0A0A0) | 6.29:1 | 6.05:1 |
    | Sidebar section headers | 5.38:1 | 5.70:1 |
    | Selected rows | 6.81:1 | 6.41:1 |
    | "Current Entry" and Show Description links | 6.81:1 | 7.66:1 |
    | Armed Unsubscribe | 5.48:1 | 6.51:1 |
    | Player-bar labels over scrolled rows (L/36, D/36) | ≥19.5:1 | ≥9.9:1 |
    | Settings captions | 5.87:1 | 5.55:1 |

  - The toolbar subtitle ("6 Episodes · 1 selected", 3.95:1 in Light) is the system's `navigationSubtitle` style. Mail's subtitle in the reference capture 07 measures the same 3.99:1, so it isn't counted against the app.

### Minor

- **[TYPE-06] The Podcast description runs about 125 characters a line at the default window size** (L/18, L/20: "Market Hours follows the everyday choices behind the economy. Dev Raman visits markets, workshops, ports and kitchens to ask"). The comfortable range is 45–90. **Fix:** cap the description's frame at about 560 pt (around 80 characters at 13 pt).
- **[COPY-03] Empty History and Listening Stats give no next step**, and the Views empty-state button drops its ellipsis. The evidence is mismatch 1 above, L/31 and the empty-state strings in PodListEmptyState and PlaylistContentView. **Fix:**
  - History: "Play an Entry to begin." with [Play This Playlist].
  - Stats: [Open Active Playlist].
  - Rename the Views button "New View…".
- **[COPY-04] The same command is capitalized two ways**, as in mismatch 2 above: "Back 15 Seconds" against "Back 15 seconds", "Play from Here" against "Play from here", and "Server address" against "Server Address". **Fix:** use title case for every control and menu title, and let accessibility names match the visible title.

### N/O

APPEAR-11, RESP-02, FOOT-02, WIN-10, SET-06, DRAG-07, FOOT-01.
- No transition frames, keystroke or hitch timing, live resize, relaunch or footprint measurement was captured.
- For SET-06, no `restorationBehavior` is set on the Settings scene, and SwiftUI's default couldn't be observed.

### N/A

| IDs | Reason |
|---|---|
| FILE-02, FILE-04, FILE-05, DATA-02, DATA-03, DATA-08 | No document model; OPML is import and export only |
| FMT-01, FMT-02 | No formatted-text editing |
| CTRL-02 | No checkbox hierarchies |
| DLG-09 | No popovers; Speed and Sleep are menus |
| COPY-05 | Generates no content |
| AX-05 | Audio is the content the person chose; nothing autoplays |
| START-04, START-05 | No permission prompts; no `*UsageDescription` keys |
| START-07 | No accounts |
| SYS-07 | No Dock state that carries meaning beyond playback |
| EXTRA-01 to EXTRA-04 | No menu bar extra |

### Pass

**Flow stability:** FLOW-01 to FLOW-07.
- FLOW-01 rests on the frame pairs above.
- FLOW-02 and FLOW-03 rest on L/44 and D/44, plus the `searchRevision` guard in LibraryModel.swift:407-416.
- For FLOW-04, Show Restored Entries sits in the status row above the list.
- For FLOW-05, the list and Inspector tops match (L/03).
- For FLOW-07, every sheet's primary is trailing at the bottom.

**Keyboard:**
- KEY-01: every command has a menu item; lists take focus.
- KEY-06: ⌘-letter bindings; ⌘[ is the standard Back binding.
- KEY-07: native Table; non-character keys pass through MacRowScroll.swift:160.
- KEY-08: Help › PodList Help has a shortcut grid. Space, Return and type-select are suppressed in text (PlaybackCommands.swift:72-76, MacRowScroll.swift:144-147).
- KEY-02: reuses are task-equivalent: ⌘N for New View, ⌘O for Import OPML…, and ⌘F for Search. ⌘. for Stop is borderline, and it maps to Esc inside sheets.
- KEY-05.

**Menu bar:**
- MENU-01: App, File, Edit, View, Podcast, Saved Views, Episode, Playlist, Controls, Window, Help.
- MENU-02: every row, toolbar, Inspector and player command has a menu item. A nit: Show Restored Entries is status-row only.
- MENU-03 to MENU-06: correct ellipses, no menu icons, depth 1.
- APP-01 to APP-04.
- FILE-01 and FILE-03.
- EDIT-01: "Undo Restore Playlist" and "Redo Edit View" head the Edit menu.
- EDIT-02 and EDIT-03.
- EDIT-04: Spelling, Substitutions, Transformations, Speech, Dictation and Emoji are all present.
- EDIT-05: Copy, Copy Link, Copy PodList Link, Copy Feed Address.
- VIEW-01 and VIEW-02: Hide Sidebar and Hide Inspector titles, Bigger/Smaller/Actual Size, Sort By, Enter Full Screen.
- WMENU-01 to WMENU-03.
- HELP-01 and HELP-02: real in-app documentation and the system Help search.

**Text, windows, toolbars and sidebar:**
- TEXT-01 and TEXT-02: native `TextField`s.
- WIN-01 to WIN-09 except WIN-10.
- WIN-05 meets the playback-bar clause: transport, Speed, Sleep, Now Playing and Open Active Playlist are all in Controls, Retry Playback is a menu item, and lists clear the bar through `playbackBarScrollClearance`.
- WIN-07: Open in New Window. WIN-08: New Window at ⌥⇧⌘N.
- TOOL-01, TOOL-03 to TOOL-06. SIDE-01 to SIDE-06.

**Settings:**
- SET-01 to SET-05: a two-pane Settings scene that applies changes live. Its minimize and zoom are disabled (L/27.txt). The last pane is restored from `@AppStorage`. Appearance defaults to System.

**Dialogs and controls:**
- DLG-01 to DLG-08. Only two alerts exist: an invalid link, and Delete Permanently with a destructive role. `.cancelAction` and `.defaultAction` are on every sheet.
- CTRL-01, CTRL-03 to CTRL-08. Downloads and import show determinate progress and can be cancelled, and the search prompts name their scope.

**Lists:** LIST-01 to LIST-07: click-to-focus, arrows, type-select, and Return or double-click to open.

**Data safety:**
- DATA-01: durable sheet drafts in UserDefaults on every keystroke.
- DATA-04: multi-step, named, app-wide history.
- DATA-05: Show Restored Entries, and restored Entries are revealed.
- DATA-06: `@SceneStorage` window context with panes, selection, scroll anchor and pane widths.
- DATA-07: standard NSOpenPanel and NSSavePanel.

**Drag and drop:**
- DRAG-01 to DRAG-06. Drag payload order: custom, then URL, then text.
- Option-copy; drops are undoable; a spinner placeholder and "Could not add" slots; Retry Failed Episode Drop.

**Pointer:**
- PTR-01 to PTR-05. Context menus act on the clicked row without changing the selection (MacWindow.swift:853-861) and show no shortcuts. Icon buttons have `.help`, with two small gaps: Clear Search and the Downloaded mark.

**Appearance:**
- APPEAR-01 and APPEAR-02: the sidebar symbols use the contrast-checked accent.
- APPEAR-05: no custom animation.
- APPEAR-06 to APPEAR-08: glass only on the functional layer, regular material, opaque under Reduce Transparency and Increase Contrast, and the system sidebar and toolbar aren't painted over (L/41, L/36).
- APPEAR-09 and APPEAR-10.

**Type:**
- TYPE-01 to TYPE-05, TYPE-07 and TYPE-08.
- Curly quotes, "…" and an em dash. Text Size runs 100–200% (MacTextSize.swift). Above 100%, the Table becomes a reading List, so hierarchy survives.

**Copy and accessibility:**
- COPY-01 and COPY-02: errors sit near their cause with Retry and recovery text.
- AX-01: every control in the snapshots has a name, including:
  - context-rich row labels ("Play Now: Who sets the price of rice?");
  - stateful Inspector labels ("Star, Not starred");
  - the Settings switches "Volume Boost" and "Enable MCP Server";
  - the position slider with `.accessibilityValue(Presentation.time…)` (PlayerViews.swift:133).
- AX-02: armed Unsubscribe changes its text and symbol, not only its color.
- AX-03 and AX-04.

**Launch and onboarding:**
- START-01 to START-03 and START-06. Getting Started can be skipped, stays hidden, and reopens from Help. No account is required ("Start on This Mac").

**System integration:**
- SYS-01: App Intents and App Shortcuts.
- SYS-02: the "Add to PodList" Service.
- SYS-03: `podlist://` routes.
- SYS-04: ShareLink.
- SYS-05: Spotlight records for Episodes, Subscriptions and Playlists.
- SYS-06: a Share extension.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.8** | One system face throughout. Hierarchy comes from weight and `podListReadableSecondary`: bold 13 pt titles, 11 pt secondary podcast names, a bold Title-2 Inspector heading. Timeline rows use three clear styles (L/34a). Truncation is designed: tail ellipsis, a full-title tooltip, and the State column becomes symbols at the minimum width (L/35). Typographic punctuation throughout. The description's 125-character measure (TYPE-06) and some heavy bold stacks in the Rewind sheet (L/34) keep it out of the top of Strong. | `hierarchy`, `craft` |
| Hierarchy | **7.4** | Content leads, and the toolbar is three quiet capsules with no prominent tint. But four Play affordances show at once in L/03: the row icon, the toolbar, the big dark Inspector circle (the strongest shape on screen) and the player bar. The status row and the View rule line spend about 60 pt above every list. The bar sits on the bottom edge, which is allowed under WIN-05. | `content-first`, `hierarchy` |
| Spacing & density | **7.3** | A consistent 20 pt gutter and two-line rows of about 40 pt suit a calm sovereign player. Sheet forms align labels to one column (L/16, L/22). But L/11a puts the "Clear on Played" checkbox on the leading edge while Name uses a label column. The New Playlist sheet (L/13) has about 60 pt of dead space above its buttons. Subscriptions rows (L/01) are sparse with iOS-style chevrons. The General Settings pane is a long scroll with generous gaps (L/27, L/28). | `craft`, `conventions` |
| Color & contrast | **6.9** (capped by APPEAR-03 and APPEAR-04; about 8.0 uncapped) | Restrained: one accent for selection, sidebar symbols and two links, and red only for errors and armed Unsubscribe, always with words. All measured app text passes, with the ratios listed under APPEAR-04. Reduce Transparency and Increase Contrast have code paths, and the Increase Contrast AccentColor and palette variants exist. The caps come from Show Borders, which the app's own controls ignore, and the owner-accepted 1.73:1 Dark Settings tab label. | `color-restraint`, `accessibility` |
| Iconography | **7.8** | SF Symbols in one weight. A familiar set in the Inspector row (add, star, checkmark, download, share), each with `.help` and a stateful name. Accent sidebar symbols with a speaker on the Active Playlist. Using `text.line.last.and.arrowtriangle.forward` for "Add to a Playlist" in rows, toolbar and Inspector is consistent but a stretch, because it's the "Play Last" glyph. The initials tiles are a deliberate placeholder identity. | `conventions`, `craft` |
| Consistency & polish | **7.6** (stability **8.0** in Light and Dark) | Edge states are designed: deleted Playlist (L/11a), armed and disarmed Unsubscribe (L/20, L/21), empty Trash and Stats, minimum width with symbol states (L/35), the 30-item sidebar (L/40 to L/42), and inactive gray selection while Search holds focus (L/44). Small finish defects: the Now Playing window shows smeared gray corners at its bottom edge (L/26). At the minimum width, Inspector content shows in the strip under the player bar ("Commute 22:00", L/35, L/36, L/43). D/36 has an unfilled block at the trailing end of the column header. Stability: every core element holds in the delayed-completion flow, nothing typed is lost, and one status row carries every message; only the two inventory mismatches remain. | `craft`, `stability` |
| Clarity | **8.0** | Specific verbs ("Restore Playlist", "Rewind to Here…", "Edit Download Rules for 3 Subscriptions…"). State is always legible: "Up to date", "Current Entry", "In the Trash · 3 Entries", "Undone: Remove from Playlist". The Rewind summary names what goes back and what is kept. The minor COPY-03 and COPY-04 gaps keep it from the top of the band. | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped by TOOL-02; Looks 7.8, Behaves 8.0, so (7.8 + 2 × 8.0) ÷ 3 = 7.9 uncapped) | **Looks:** L1 to L8 and L11 are Native: the system sidebar, toolbar, sheets, toolbar-pane Settings and SF Symbols. L10 is Native for system chrome and Adapted for the player bar (it adapts to Reduce Transparency and Increase Contrast). Foreign-leaning: iOS chevrons on Subscriptions rows (L/01); a fixed-width custom search field instead of the system search item; and no app icon in the bundle (none in `build-mac-app.sh`), so the Dock, About and App Switcher show a generic icon. **Behaves:** B1 and B2 Native (complete, ordered menus; ⌘, Settings). B3 Adapted (Play/Pause shortcut missing from its menu). B4 Native. B5 Adapted (⌘F doesn't focus). B6 Native (clicked-row targeting). B7 Native (New Window, Open in New Window, scene restoration). B8 Native. B9 Native: Intents, Shortcuts, Services, URL scheme, Share extension and Spotlight; no Dock menu. B10 Native (named Undo, real Help). | `conventions`, `discoverable-commands` |
| Interaction & feedback | **6.9** (capped by RESP-01, KEY-04 and KEY-03; about 7.6 uncapped) | Very forgiving: named multi-level Undo for every edit, drops and settings change; durable drafts; late completions that never touch typed text (L/44); a two-step Unsubscribe that can still be undone; determinate progress for downloads and import that can be cancelled; announcements that don't take focus. Kept from Strong by measured latency: Inspector 327–679 ms and Settings 399–972 ms, with no busy indicator past 1 s on the accepted steps. Also by keyboard gaps: ⌘F not focusing, and Play/Pause with no displayed shortcut. | `forgiveness`, `keyboard-efficiency`, `feedback` |
| **Overall** | **7.4** | It serves the task well and is at home next to Music and Podcasts on macOS 27: complete menus, real undo, careful copy, and system integration beyond most apps. The cap would allow 8.9, since the lowest category is 6.9. It is held down most by responsiveness on the primary task (selecting an Episode), then by three conventions a regular Mac user feels: ⌘F, Space and Search at half width. | — |

## What stands between this build and 9.0

Three categories are pinned at 6.9 by majors, and Overall can't reach 9.0 while they stay there.

1. **Interaction & feedback (RESP-01, KEY-04, KEY-03):**
   - get Select Episode → Inspector and ⌘, under 200 ms p75 on the loaded VM;
   - make ⌘F focus the search field and add ⌥⌘F;
   - give Controls › Play/Pause a displayed Space shortcut.
2. **Platform fit (TOOL-02):** keep Search reachable in the toolbar at half the display width. Two smaller points pull Looks down: add an app icon, and drop the iOS chevrons on Subscriptions rows.
3. **Color & contrast:**
   - **APPEAR-03:** honor Show Borders on the app's own icon buttons and sidebar command rows.
   - **APPEAR-04:** the Dark tab label is an owner trade-off the arithmetic can't satisfy with one accent. The cap stays unless the owner changes the Dark AccentColor.
4. **Hierarchy and Spacing** (7.4 and 7.3) are the next limits after the caps:
   - the competing Play affordances;
   - the stacked status and rule rows;
   - the 11a checkbox alignment;
   - the New Playlist sheet's empty band.

## Next step

- **Target:** KEY-04 (major, in Interaction & feedback, which ties as a lowest category).
  - It's on the primary task's "find Episodes" path.
  - RESP-01 is closer to the task's center, but its remaining cause isn't settled from the code. It needs an Instruments trace before a change can be specified, which is listed as the step after this one.
  - APPEAR-04 is owner-decided, so it is skipped.
- **Anti-pattern:** *Keyboard afterthought.*
- **Root cause:** the toolbar field's focus is private view state (`LibraryToolbarSearch.@FocusState`, MacWindow.swift:1022). So `openLibrarySearch()`, the only ⌘F handler, can change the destination but can't put the insertion point anywhere.
- **Change:**
  1. Add a `searchFocusRequest` counter to `WindowModel`.
  2. Have `LibraryToolbarSearch` set `focused = true` when it changes.
  3. Have `openLibrarySearch()` navigate and bump the counter.
  4. Add Edit › "Search This List" (⌥⌘F), which only bumps it.
  5. Update the Help line ("Press ⌘F to search your Library, or ⌥⌘F to filter this list").
- **Principle:** `keyboard-efficiency` (Things: "shortcuts require context"; ⌘F means *ready to type*).
- **Expected effect:**
  - KEY-04 passes, and Interaction & feedback stays capped only by RESP-01 and KEY-03.
  - Platform-fit B5 moves from Adapted to Native.
  - No visual change, and no signature element is touched.
- **Regression check:** confirm Esc still clears the field and returns focus to the list. Confirm ⌘F inside a sheet's text field doesn't steal focus from the sheet; the window-level button is already disabled when the window isn't active (MacWindow.swift:180).

Co-graded inputs: code facts were gathered by three read-only helper passes and spot-checked against the source cited above.
