# PodList for Mac — UI grade, round 17 (Opus)

Graded at commit `1e61eea` against `~/Documents/UI_Guidelines/CRITIQUE.md` (full audit), `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. Evidence: the round-17 XCUITest tour in `~/Documents/podlist-grading/mac-round-17/` (37 states × Light/Dark, 2× PNG plus accessibility snapshots, `menus.txt`) and the code in `apps/apple`. The app was not launched. Capture references below read `L/NN` (light) and `D/NN` (dark). Sizes are points (pixels ÷ 2).

## Frame

- **Task:** keep up with podcasts: find Episodes through saved Views and Subscriptions, queue them into ordered Playlists, and play them.
- **Target:** Mac app (SwiftUI, macOS 26+).
- **Era:** captured on macOS 27.2 (VM, Retina, 1920×1200 pt). Built with the macOS 26.0 SDK (minos 26.0, sdk 26.0), no `UIDesignRequiresCompatibility` key, so a **current build**. Light and Dark set through the app's own Appearance setting. Reduce Transparency and Increase Contrast off in every capture; their handling is read from code (`MacGlass.swift`, `MacAppearance.swift`). The VM's accent is Multicolor, so the app's AccentColor (brand blue) shows.
- **Posture:** sovereign personal tool, used for long sessions beside other work, with a transient Now Playing window.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things (calm, personal, opinionated domain model with plain copy), with BBEdit's "every command in a menu" as the command bar.
- **Character:** (1) pale brand-blue monogram artwork tiles (`Color.podListBrand`, identity only); (2) brand blue as the Multicolor accent (owner-fixed); (3) a floating Liquid Glass player bar along the bottom (owner-fixed); (4) a capitalized domain vocabulary — Episodes, Entries, Views, Playlists, Clear on Played, Listening Timeline — explained by short plain sentences under controls; (5) the View description line ("Published in the last 7 days · Unplayed · Newest Published first") and the Timeline's "Rewind to Here…".
- **Owner decisions recorded:** brand accent only under Multicolor (dark variant `#3652D0`, accepted for the Settings tab label); transport in a bottom player bar; Appearance offers Light, Dark and follow macOS; no customizable toolbar; two-click Unsubscribe with undo; Liquid Glass on the player bar, Inspector actions, Now Playing and scrolling sheet footers; Spotlight, `podlist://` and the Add to PodList Service present but uncaptured; MCP off by default, App Intents on. These are graded, not targeted.

## Flows

- **Tasks run:** none as a flow run. The tour is a scripted strip of 37 settled states with accessibility frames; it does not insert known delays, type during pending completions, record unprompted moves or time steps.
- **Widths:** typical (1180×760) for most states; minimum (760×552) for states 35–36. Half-display not captured. **Appearances:** Light, Dark.
- **Timed runs:** none. **Script:** `apps/apple/UITour/PodListUITour.swift`. **Measurements file:** none.
- **Result:** FLOW-01, FLOW-02, FLOW-03, RESP-01 and RESP-02 are N/O; the stability sub-score is N/O and Consistency & polish is marked "(partial: no flow run)". FLOW-04 to FLOW-07 are judged from the stills.
- Code that bears on stability, recorded for the next flow run: the Library status row reserves its 32 pt height whether or not a notice is showing (`EpisodeEditingViews.swift:225-260`, `reservesSpace`), so a late "Undone…" or error doesn't push the list; toolbar groups keep disabled selection controls in place so Inspector and Search don't move as selection changes (`MacWindow.swift:181-186`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library list (View, Search, Subscriptions; L/02, L/15, L/01) | status row, top-leading, caption, primary ink, 5 s ("Undone: …") | same row, `podListError` red, persistent with Retry | none | trailing buttons in the status row, "Undo ⟨name⟩"/"Redo ⟨name⟩", plus Edit menu | centered symbol + title + one line + button ("No Subscriptions" / Add Podcasts…) | none | toolbar group (Play, Add to a Playlist, More, Edit View) | View description line under status |
| Playlist (Entries/History/Timeline; L/06, L/08, L/09) | status row as above | status row | Rewind sheet (L/34) | status row + Edit menu | "No History" centered, explains what creates History | Rewind sheet | toolbar; "Rewind to Here…" trailing in each Timeline row | none |
| Podcast page (L/18, L/20) | status row | status row | Unsubscribe armed in place, red label + minus symbol (L/20) | status row; Unsubscribe undoable | — | none | header button row (Subscribed, Share, Copy Feed Address, gear) | Show Description link |
| Trash (L/14) | status row | status row | "Delete “X” Permanently?" confirmation dialog | status row | trash symbol + "Trash Is Empty" + retention sentence | dialog | row context menu / Playlist menu | none |
| Object sheets: Playlist Settings, New Playlist, Edit/New View, Subscription Settings, Download Rules, Add to Playlist (L/11–13, 16–17, 22, 23, 25) | sheet closes | inline, field-specific (code: `FormValidationVisibility.swift`) | none | after close, status row | — | the sheet | default button trailing at the bottom; Cancel left of it; secondary destructive/extra actions leading | 11 pt caption sentences under the controls; Rewind and Download Rules use body-size sentences |
| Settings (L/27–30) | applies live, no message | inline | none | none (live settings) | — | none | — | 11–13 pt explanatory rows inside each group |
| Add Podcasts window (L/24) | — | inline under field | none | — | magnifier + "Find Your Next Podcast" + example | none | Search beside the field | path hint "Import with File › Import OPML…" |

**Mismatches**

1. **Form grammar differs between Settings and sheets.** Settings (L/27) uses a grouped Form with controls trailing-aligned; the sheets (L/16, L/17, L/22, L/25) and the Podcast page (L/18) use a right-aligned 160 pt label column whose pop-up buttons are centred in the control column, so their leading edges wander (see Spacing). Same kind of control, two layouts, and one of them misaligned.
2. **Explanatory text size varies within sheets.** Playlist Settings, Add to Playlist and Subscription Settings explain in 11 pt caption (L/11, L/22, L/23); Rewind and Download Rules explain in 13 pt body (L/34, L/25).
3. **Stale Redo chip travels with the window, not the screen.** After an undo, "Redo Settings for Commute" or "Redo Edit View" stays in the status row on unrelated screens — Trash, Search, a Podcast page, the multi-selection state (L/13–15, L/18, L/20, L/33, L/35). Placement and wording are consistent, which is good; the chip simply outlives its context and is the second-strongest shape in the top band.

## Checklist

**Coverage: 93.3%** (pass 134 · fail 5 · N/O 10 · N/A 20; 149 applicable of 169 IDs)

### Failures by severity

**Blocker**

- **[MENU-02] A command exists only in the Inspector: Show Notes › "Show in Window".** The only route to the Show Notes reading window is the Inspector button (`EpisodeInspector.swift:151`, `openWindow(id: "episode-notes", …)`); `grep episode-notes` finds no menu, context-menu or command route, and `menus.txt` has no such item (Episode menu: "Show Episode Details" only). Capture: L/03 and D/03, "Show in Window" beside Show Notes. Fix: add **Episode › Show Notes in Window** directly after Show Episode Details, enabled for a single selected Episode (and for Now Playing's Episode), calling the same `openWindow(id: "episode-notes", value:)`; add it to the Episode row context menu too. Give it no shortcut or a free ⌥⌘ letter (the test in `MenuCommandTests.swift` lists reserved keys). Caps Platform fit at 4.9.

**Major**

- **[WIN-03] At the minimum window size the Episode table collapses and controls overlap content.** At 760×552 with the Inspector open, the Episode column is 10 pt wide and the title text 0 pt (`L/35.txt`: cell `frame=(611, 360, 10, 73.5)`, title `frame=(611, 369, 0, 37.5)`); the row's Add and Play buttons (x 631–695) are drawn over the Published date (x 638–717), so every row reads "Ŋov 17▶2026"; State is clipped to "In pro"/"Unpla"; a horizontal scroller sits under the player bar. L/35, L/36, D/36. Root cause: `MacWindow.swift:526` gives the Episode column no minimum while Published/Length/State keep 95/60/140 pt minima, the Inspector keeps its 260 pt minimum, and the window allows 760 pt (`MacWindow.swift:44`). Fix: give the Episode column `.width(min: 180, ideal: 320)`, cut State's minimum to 90, and when the detail column would fall below ≈ 520 pt collapse the Inspector (or raise the window minimum to sidebar 180 + content 520 + Inspector 260 ≈ 960 pt). Caps Platform fit at 6.9.
- **[WIN-05] Transport controls live in a bar along the window's bottom edge (owner decision).** Play, Back 15, Forward 30, the scrubber, Speed and Sleep sit in the bottom player bar (L/01–36, `MacWindow.swift:211`). The checklist keeps bottom bars to limited status. Menu equivalents (Controls menu, media keys bound in `SystemPlayback.swift:49`) and the Now Playing window soften it. Not a target; recorded and capping as the checklist requires.
- **[APPEAR-04] Dark Settings: the selected pane label is 1.4:1 (owner-accepted).** "General"/"Automation" in the accent `#3652D0` on the selected-tab fill `#484749` (D/27, D/30; sampled glyph ink `#435ED8`). A control label below 4.5:1, so major under the scope rule. Every other measured pair passes: secondary text `#666666` on white 5.7:1 (L/02), `#9A9A9A` on `#252323` 6.3:1 (D/02), dark accent text `#9AADF9` on `#242323` ≈ 8:1 (D/07 "Current Entry", D/18 "Show Description"), armed Unsubscribe `#B91E1E` on `#ECEBEB` ≈ 5.6:1 (L/20) and `#F99C9E` on `#343232` ≈ 6.5:1 (D/20), "Rewind to Here…" `#656565` on white 5.9:1 (L/09). The player bar's labels stay legible over the scrolled list in both appearances (L/36, D/36), but nothing bounds the worst case beneath glass, so that part alone would be N/O. Not a target. Caps Color & contrast at 6.9.

**Minor**

- **[COPY-04] Capitalization breaks title case in a few headings.** "Sort by" (View menu, `MenuCommandActions.swift:174`; also the reading-layout picker, `MacTextSize.swift:109`) beside "Show Description", "Enter Full Screen"; "In your Playlists" (Inspector, L/03, `EpisodeInspector.swift:110`) beside "Show Notes", "Time Listened", "Playback Settings Overrides". Fix: "Sort By", "In Your Playlists".

### N/O

FLOW-01, FLOW-02, FLOW-03, RESP-01, RESP-02, FOOT-01, FOOT-02, WIN-10, APPEAR-11, SET-04

(SET-04: titles match the pane, but the pane is `@State` in `PodListSettings` (`ConnectionViews.swift:56`), so whether it survives closing Settings needs the running app.)

### N/A

LIST-05 (no disclosure outlines), CTRL-02 (no checkbox hierarchy), DATA-02, DATA-03, DATA-08 (not a document app), FILE-02, FILE-04, FILE-05 (no recent documents, Duplicate/Export As or printing), FMT-01, FMT-02 (no formatted text), EXTRA-01–04 (no menu bar extra), START-04, START-05 (no permission requests), START-07 (no account creation), COPY-05 (no generated content), SYS-07 (no meaningful Dock state), DLG-09 (no popovers)

### Passes (134), with the evidence they rest on

- **Menu bar:** MENU-01 (PodList · File · Edit · View · Podcast · Views · Episode · Playlist · Controls · Window · Help, `menus.txt`), MENU-03 (dimmed items kept; "Hide Sidebar"/"Hide Inspector", Play/Pause and Star/Unstar titles track state), MENU-04 (ellipses on "Rewind to Here…", "Go to Time…", "Delete Permanently…"), MENU-05, MENU-06 (system alternates only), APP-01–04 (Settings… ⌘,; Connection and Automation submenus in the settings group; Services consumed by native fields), FILE-01, FILE-03, EDIT-01 ("Redo Edit View" in `menus.txt`; named steps from `PlaylistEditingModel.swift:85`), EDIT-02, EDIT-03 (⌘F → Search Library; object search), EDIT-04, EDIT-05 (episode copy gives title + share URL, `MacWindow.swift:552`; Copy Feed Address, Copy PodList Link), VIEW-01, VIEW-02, WMENU-01–03, HELP-01 (PodList Help window with task docs and a shortcut table, `ConnectionViews.swift:69-115`), HELP-02.
- **Keyboard:** KEY-01, KEY-02 (⌘. stops playback only outside sheets and cancels inside them, `PlaybackCommands.swift:120-160`), KEY-03 (⌘/⇧⌘/⌥⌘ families in `KeyboardShortcuts.swift`; Space in Library and media keys for Play/Pause), KEY-04 (sheets open with the first field focused, L/12, L/13, L/16, L/17), KEY-05 (⇧⌘A, ⌥⌘I in standard order), KEY-06, KEY-07, KEY-08 (bare Return/Space documented in Help and routed back to text editing and sheet defaults by `PlaybackKeyboardGuard`), TEXT-01, TEXT-02.
- **Windows, toolbar, sidebar:** WIN-01, WIN-02, WIN-04 ("New this week – 6 Episodes"), WIN-06, WIN-07, WIN-08 (New Window ⌥⇧⌘N, Open in New Window), WIN-09, TOOL-01–06 (search collapses to a button at minimum width, L/35), SIDE-01–06 (sidebar edge to edge as on macOS 27; ⌃⌘S; selection turns gray when focus moves, L/03; player bar is a `safeAreaInset`, so sidebar rows scroll clear of it).
- **Settings:** SET-01, SET-02 (System is the default, `MacAppearance.swift:271`), SET-03 (toolbar panes; minimize and zoom dimmed, L/27), SET-05 (live), SET-06.
- **Dialogs and controls:** DLG-01–08 (two alerts only: invalid link and permanent delete; Delete Permanently is `.destructive` and not default; Cancel + verb default in every sheet; Add Podcasts is a utility window), CTRL-01, CTRL-03 ("Mentions (Optional)", labelled fields), CTRL-04, CTRL-05, CTRL-06, CTRL-07 (prompt names the scope: "Search this list", "Search Episodes", "Search Library"), CTRL-08 (determinate download progress, Cancel Download/Import).
- **Lists:** LIST-01–04, LIST-06, LIST-07 (`typeSelectingRows`, double-click opens the Inspector, Return plays).
- **Data, drag, pointer:** DATA-01, DATA-04, DATA-05 (restored Entries revealed, `MacWindow.swift:140`), DATA-06 (`@SceneStorage` window context: destination, selection, sort, scroll anchor, columns), DATA-07, DRAG-01–07 (private Episode type, then URL, then title; same-Playlist move, ⌥ forces copy, `EpisodeTransfer.swift:50-80`; drops go through the undo history), PTR-01–05.
- **Appearance:** APPEAR-01, APPEAR-02 (brand blue only when `AppleAccentColor` is unset), APPEAR-03 (opaque fill and stronger stroke under Reduce Transparency or Increase Contrast, `MacGlass.swift:24-35`; Increase Contrast palettes for brand, error and secondary ink), APPEAR-05 (no custom animation), APPEAR-06, APPEAR-07, APPEAR-08 (standard bars and sidebar in the 27 look; nothing painted over them), APPEAR-09, APPEAR-10.
- **Type:** TYPE-01 (body measured ≈ 13 pt, captions ≈ 11 pt), TYPE-02, TYPE-03, TYPE-04, TYPE-05 (100–200% Text Size with a reading-row layout above 100%), TYPE-06, TYPE-07, TYPE-08 (… and curly quotes throughout; the only straight apostrophe is fixture content).
- **Copy, accessibility, start, system:** COPY-01, COPY-02, COPY-03, AX-01 (every icon button labelled, e.g. "Add ⟨title⟩ to a Playlist", "Star, Not starred"), AX-02, AX-03, AX-04, AX-05, START-01, START-02 (Getting Started hideable and in Help), START-03, START-06 ("Start on This Mac" needs no server), SYS-01 (13 App Intents, App Shortcuts), SYS-02 (Add to PodList Service), SYS-03 (`podlist://`), SYS-04 (ShareLink), SYS-05 (Spotlight in release builds), SYS-06.
- **Flow (from stills):** FLOW-04 (Redo/Undo and errors in the status row at the top of the content; armed Unsubscribe in place), FLOW-05 (list and Inspector share their top edge, L/03), FLOW-06, FLOW-07 (default button trailing at the bottom of every sheet).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.2** | System font with semantic styles: 13 pt body, 11 pt caption metadata in `#666666`, bold Timeline titles over regular dates (L/09), monospaced durations, a large bold Inspector title (L/03). Strong band. Held below 7.5 by the minimum-size table, where titles vanish and glyphs overlap ("Ŋov 17▶2026", L/35), and by form labels that wrap for no reason ("Download Rule on / This Device", L/18, L/22, L/25). | hierarchy, craft |
| Hierarchy | **7.0** | Content leads: list first, quiet toolbar group, one tinted default per sheet. The Inspector reads monogram → title → facts → actions. Competing shapes: the full-width glass player bar is the heaviest element on every screen; the black filled Play circle in the Inspector (L/03) out-weighs the selected row; a stale "Redo …" chip holds the top-trailing corner on unrelated screens (L/14, L/15, L/18). Bottom of Strong. | content-first, hierarchy |
| Spacing & density | **6.3** | One rhythm in lists: 16 pt margins, ≈ 46 pt two-line rows, 32 pt system sidebar rows; Settings groups breathe. But the sheet form centres every pop-up inside its control column, so leading edges sit 112–133 pt right of the text fields and vary by 20 pt row to row (`L/16.txt`: fields at x 846.5, pop-ups at 959.0–979.5; `PodListSheetFieldLayout` in `PodListSheet.swift:126-150`); Playlist Settings' checkbox sits at the sheet margin, not the control column (L/11). The layout doesn't survive the minimum size (WIN-03). Competent. | craft, hierarchy |
| Color & contrast | **6.9** (cap) | Restrained and semantic: accent only for selection, links and "Current Entry"; red only for armed Unsubscribe and errors; custom palettes for Light, Dark and both Increase Contrast variants; every measured text pair passes except the dark Settings pane label at 1.4:1. Uncapped this would be ≈ 8.0; the APPEAR-04 major caps it. | color-restraint, accessibility |
| Iconography | **7.6** | One SF Symbols family at matched weight; the queue glyph used consistently in rows, toolbar, Inspector and sidebar; every icon-only control labelled and tooltipped. Below 8: the sliders glyph for Edit View is a stretch, and the black Play disc in the Inspector belongs to no other icon's treatment. | conventions, craft |
| Consistency & polish | **6.6** (partial: no flow run; stability N/O) | Designed states throughout: empty (History, Trash, Inspector, Add Podcasts), focused vs unfocused selection, disabled, armed, Dark. Against it: the minimum-size collapse, two form grammars (Settings vs sheets) with misaligned pop-ups, mixed caption/body explanatory text in sheets, and the Redo chip outliving its screen. | craft, stability |
| Clarity | **7.6** | Specific verbs ("Rewind", "Create Playlist", "Apply"); consequences stated in place ("Delete Playlist takes effect immediately… restored from Trash for 30 days", L/11; the Rewind summary, L/34); the window title names the view; state is visible ("In progress", "Current Entry", "Active Playlist" speaker). Held below 8: two capitalization slips (COPY-04), and the density of domain terms in one sentence ("Entries leave this Playlist when their Episode next becomes Played"). | plain-language, feedback |
| Platform fit | **4.9** (cap; uncapped 8.1) | Looks 7.4: native sidebar, unified toolbar, Settings window with panes, Mac-sized controls, the 27 look; foreign tells are the bottom player bar (an iPad idiom on the Mac) and centred-form pop-ups. Behaves 8.4: a full, ordered menu bar with state titles, named Undo, ⌘ shortcut families, restoration, drag with ⌥-copy, Services, URL scheme, Spotlight, App Intents and real Help. (7.4 + 2 × 8.4) ÷ 3 = 8.1, capped to 4.9 by MENU-02 (blocker) and also capped by WIN-03 and WIN-05 (major). | conventions, discoverable-commands |
| Interaction & feedback | **8.3** (partial: no timed runs) | Keyboard-fluent: Return plays, Space toggles in Library, type-select, guarded bare keys; forgiving: named multi-step Undo/Redo, undoable Unsubscribe, Rewind and drops, a 30-day Trash, confirmation only for permanent delete; native drag with insertion and copy semantics; complete VoiceOver labels; Text Size 100–200%. No checklist failures in its groups. Below 9 because responsiveness is unmeasured and Play/Pause has no menu-shown shortcut outside the Library (Now Playing keeps Space for its controls). | keyboard-efficiency, forgiveness |
| **Overall** | **6.9** | Holistically a Strong app (≈ 7.4) that serves its task well, but capped at 4.9 + 2.0 by Platform fit. The weakness holding it down most: one command reachable only from the Inspector (MENU-02), followed by the table's collapse at the window's minimum size. | — |

Stability sub-score: N/O (no flow run), Light and Dark alike.

## What stands between this build and 9.0

1. **MENU-02 (blocker):** add Episode › Show Notes in Window. One menu item lifts the 4.9 cap on Platform fit and the 6.9 cap on Overall.
2. **WIN-03 (major):** make the Episode table survive 760 pt: a minimum Episode column, a smaller State minimum, and an Inspector that collapses (or a larger window minimum). Until then Platform fit stays capped at 6.9.
3. **Owner decisions that still cap:** WIN-05 (bottom transport) keeps Platform fit at 6.9; APPEAR-04 (dark selected Settings tab at 1.4:1) keeps Color & contrast at 6.9. They are the owner's calls; 9.0 Overall is reachable only if both are revisited or Overall rests on categories above 7.0 with those two at 6.9 (Overall ≤ 8.9).
4. **Form alignment:** leading-align sheet pop-ups with the text-field column (`.frame(maxWidth: .infinity, alignment: .leading)` on the control in `PodListSheetLabelStyle`), widen the label column so "Download Rule on This Device" doesn't wrap, and put the Playlist Settings checkbox in the control column. Raises Spacing and Consistency.
5. **Hierarchy polish:** give the Inspector's Play the same glass or accent treatment as other primary actions instead of a black disc; let the Redo chip clear on navigation (Edit menu still carries Redo).
6. **Evidence:** a real flow run (delayed completions, typing during them, the 2 pt measurements file) and five timed runs, so the stability sub-score and RESP checks can be scored.

## Next step

- **Target:** MENU-02, the only blocker.
- **Anti-pattern:** a mild case of *Default-menu drift* — the menu tree is deliberately built from focused command contexts (`MenuCommandActions.swift`), but one Inspector button was never published into it.
- **Root cause:** the Show Notes window is opened from a view-local `openWindow` call in `EpisodeInspector.swift:151`, with no focused-value command context, so the Episode menu can't offer it.
- **Change:** in `PlaylistEditingCommands` (Episode menu, `EpisodeEditingViews.swift:343`), after "Show Episode Details", add `Button("Show Notes in Window") { openWindow(id: "episode-notes", value: id) }` enabled when `actionIDs.count == 1`; add the same item to the Episode row context menus (`EpisodeActionItems`, non-menu-bar branch) and list it in PodList Help.
- **Principle:** `discoverable-commands` — every command present in the menu bar; only frequent ones prominent on the canvas.
- **Expected effect:** MENU-02 passes; Platform fit rises from 4.9 to its next cap, 6.9 (WIN-03, WIN-05), and Overall's ceiling rises from 6.9 to 8.9. No signature element is touched. Then take WIN-03, the remaining major in the lowest category.
