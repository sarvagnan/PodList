# PodList Mac — UI grade, round 11 (Opus)

Build: `apps/apple` at commit `131bdf3`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. Evidence: `~/Documents/podlist-grading/mac-round-11/` (35 states × Light/Dark at 2×, XCUITest accessibility snapshots, `menus.txt`) plus the source code. The app was not launched and no screen-control tools were used. Earlier grading rounds were not read.

Units: points. Window captures are 2360 × 1520 px = 1180 × 760 pt (window origin in the snapshots is 370, 190). Contrast was measured by sampling the capture pixels (darkest/lightest text core against the dominant background in the text's rectangle), WCAG relative-luminance formula.

## Frame

- **Task:** keep up with podcasts: find Episodes through saved Views, queue them into ordered Playlists, and play them, with the bottom player always in reach.
- **Target:** Mac app (SwiftUI, macOS 26+), graded against Mac conventions.
- **Posture:** sovereign (an all-day library-and-player window), with transient helpers (Add Podcasts, Now Playing, Listening Stats).
- **Audience:** perpetual intermediate; it also invites experts with a dense menu bar and many shortcuts.
- **Nearest exemplar:** Things for calm, opinionated structure and plain copy. On commands it aims at BBEdit: every action is in a menu.
- **Character (signature elements):**
  1. Brand-blue initials artwork tiles (DF, MH, SB) on a pale tint, used in rows, the inspector, the player and Now Playing.
  2. A capitalized domain vocabulary (Episode, Entry, Playlist, View, Position, Device, Played) in plain, explanatory copy that names consequences ("Rewind can be undone.", "Deleted Playlists can be restored from Trash for 30 days.").
  3. A Liquid Glass control layer: the bottom player bar, the inspector's action capsule, Now Playing's transport and the sheet footers. Owner-fixed.
  4. Dense Mac tables with two-line title/podcast cells and per-row blue Add and Play glyphs.
  5. A Listening Timeline with a previewed, undoable Rewind.
- **Owner decisions:** the brand blue is the AccentColor asset (used only under Multicolor; deep `#3652D0` in Dark, accepted on the Settings tab label). Transport lives in a bottom player bar. Settings › Appearance offers Light, Dark and follow macOS. There is no customizable toolbar. Unsubscribe is two clicks with auto-disarm and Undo. Glass is used on the player bar, inspector actions, Now Playing and the View editor footer. Spotlight is deferred. MCP is off by default and App Intents are on. These are graded, but they are not proposed as targets.

## Flows

- **Tasks run:** none as measured flows. The evidence is a 35-state XCUITest *state tour* (`apps/apple/UITour/PodListUITour.swift`), not a flow-measurement script.
- **Widths:** one typical size (1180 × 760). The minimum size (760 × 500 per `MacWindow.swift:41`) and half-display tiling were not captured.
- **Appearances:** Light and Dark (the app's own setting).
- **Timed runs:** none. **Measurements file:** none. **Screenshot strips:** none (separate states only).
- **Result:** the F-only checks (FLOW-01 to FLOW-04, RESP-01, RESP-02) are **N/O**, and so is the stability sub-score. FLOW-05 to FLOW-07 were judged from the screenshots.
- **Failures:** none observable.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / Episode tables (02, 03, 15, 33) | Edit-status row under the sync line, top of the detail column; transient text in primary color (`EditingFeedback`) | Same row, red `podListError`, with Retry | none | "Undo ‹action›" button in the same row, plus Edit › Undo ‹action› | Centered SF Symbol + bold title + secondary sentence, often with a button ("No Matching Episodes" → Edit View… / Clear Search) | none | Row ▶ and toolbar ▶ "Play Now" | View summary line ("Published in the last 7 days · Unplayed · …") |
| Playlist Entries / History / Timeline (06–09, 34a) | Same edit-status row | Same row, red | none | Same row and Edit menu | History: centered clock + "No History" + rule sentence, no action | Rewind preview sheet (34) | Toolbar ▶ "Play This Playlist" and row ▶ "Play from here" | Rewind sheet's "Kept" paragraph |
| Subscriptions / Podcast page (01, 18–21) | Same row | Same row, red | Unsubscribe armed in place: red label + minus icon, auto-disarms (20) | Same row | "No Subscriptions" + Add Podcasts button | none | Row chevron "Open"; on the page, Subscribed/Unsubscribe | "Grouped by Download Rule" caption |
| Trash (14) | Same row | Same row | Permanent delete → `confirmationDialog` "Delete “X” Permanently?" | Same row | Centered trash + "Trash Is Empty" + "Deleted Playlists can be restored here." | Delete Permanently alert | Restore (menu/context) | Top caption "Deleted Playlists are kept for 30 days…" |
| Task sheets (11–13, 16, 17, 22, 23, 25, 34) | Sheet closes | `status` slot above the glass footer, red, with Retry | none | n/a | n/a | n/a | Trailing blue default button in the glass footer (Save, Create Playlist, Create View, Apply, Rewind, Play Next) | Gray explanatory paragraphs that also explain Save and Cancel (11, 22) |
| Add Podcasts window (24) | Row shows "Subscribed" | `FailureFeedback` under the field, with Retry | none | Edit-status row above the footer | "Find Your Next Podcast", **101 pt left of the window's center** | none | "Search" beside the field (Return); blue footer button is **Close** (Esc) | Gray menu-path note, separator "›" |
| Now Playing window (26) | n/a | `FailureFeedback` under the controls | none | n/a | "No Current Entry" | none | Glass transport capsule; blue footer button **Done** (Esc) | none |
| Getting Started (32) | n/a | n/a | n/a | n/a | n/a | n/a | Blue **Dismiss** | Menu path with separator "▸" and "(⇧⌘A)" |
| Listening Stats (31) | n/a | n/a | n/a | n/a | Centered chart icon + "No Listening Time Yet" + sentence; straight apostrophes | n/a | n/a | n/a |
| Settings (27–30) | Applies live | Inline `playbackFailure` per field | none | n/a | n/a | n/a | n/a | Gray notes under controls; separator "›" |

**Mismatches**
1. **Close-the-helper verb.** Now Playing says "Done", Add Podcasts says "Close" and Getting Started says "Dismiss". All three are blue, default-styled buttons in the same glass footer, and the first two are bound to Esc, not Return (`PodListSheet.swift:157–160`). Screens: 24, 26, 32.
2. **Menu-path notation.** Getting Started writes "File ▸ Add Podcasts…" (32). Add Podcasts writes "Choose File › Import OPML…" (24), and the Settings Text Size note writes "View › Bigger" (28).
3. **Empty-state alignment.** Every empty state is centered in its pane (08, 14, 31) except Add Podcasts, whose block spans x 679–1039 against a window center of 960 (`24-add-podcasts.txt`).
4. **Save/Cancel explanations.** Playlist Settings says "Save applies these settings. Cancel discards changes." (11). Subscription Settings says "…Cancel discards settings changes." (22). Edit View, with the same footer, has no such sentence (16).
5. **Inspector empty state on Entries.** Playlist screens, whose rows are Entries, show "Select an Episode" (06, 08, 09).

## Checklist

**Coverage: 89.9%** (pass 121 · fail 13 · N/O 15 · N/A 19; 134 of 149 applicable items verified)

### Failures by severity

**Blocker:** none.

**Major** (all three are owner decisions: they are graded, and their caps stand, but they are not targets)

- **[APPEAR-04] Dark Settings: the selected tab label is 1.75:1.** "General", the selected pane in the Settings toolbar, is drawn in the Dark accent `#435FDD` on the selected-tab fill `#484646`. Measured on `dark/27-settings-general-top.png`, label rectangle (263, 66, 30 × 8 pt). The same label is 7.69:1 in Light. A control label falls well below 4.5:1, which makes this major. Cause: the Dark AccentColor `#3652D0` that the owner chose (`scripts/build-mac-app.sh`, accent check). **Fix (if the owner revisits it):** lighten only the Dark AccentColor variant until the selected-tab label reaches 4.5:1 on `#484646`, about `#7F95F0`. Selected-row text would then need `MacOnAccentStyle`'s black/white decision, which already exists. Cap: Color & contrast ≤ 6.9.
- **[WIN-05] Transport and playback status sit in a bottom bar.** The glass `PlayerBar` (`PlayerViews.swift:5`, `MacWindow.swift:203`) holds Play, ±15/30, the scrubber, Speed, Sleep and Open Active Playlist at the window's bottom edge (all captures). On a Mac, bottom bars are for limited status, and Music and Podcasts put transport at the top. All of these are also in the Controls menu and its shortcuts, which softens it. **Fix (if revisited):** move the transport cluster into the toolbar's leading-center group and keep only the position/status line at the bottom. Cap: Platform fit ≤ 6.9.
- **[SYS-05] No Spotlight indexing.** The code has no `CSSearchableItem` or `NSUserActivity` (`grep` over `Sources`), so Episodes and Podcasts can't be found from Spotlight. Deferred by the owner. **Fix:** index Episodes and Subscriptions with `CSSearchableIndex` and route the opens through `LibraryWindowTarget`. Cap: Platform fit ≤ 6.9.

**Minor**

- **[VIEW-02] "Show Sidebar" while the sidebar is visible.** `menus.txt` lists View › Show Sidebar while the sidebar is shown. The same state's toolbar button is labelled "Hide Sidebar" (`33-multi-selection.txt`, toolbar). Library context is confirmed: Window lists only the library window, and the Episode items are enabled. **Fix:** drive `SidebarCommands`' title from the split view's `columnVisibility`, or replace it with a `CommandGroup(replacing: .sidebar)` toggle whose title reads `columns == .detailOnly`.
- **[MENU-04] Two menu titles that aren't concise verb phrases.** Controls › "Play (Space in Library)" carries a keyboard hint in its title (`PlaybackCommands.swift:39`). Edit › "Retry" (`MenuCommandActions.swift:18`) doesn't say what it retries. **Fix:** title the first "Play"/"Pause" and leave the Space hint to Help and tooltips. Rename the second to its object, such as "Retry Search" or "Retry Sync".
- **[KEY-08] Now Playing advertises a key it ignores.** The transport tooltip "Play (Space)" / "Pause (Space)" is shared with the Now Playing window (`PlayerViews.swift:67, 209`). Space is handled only in the library window (`LibraryPlaybackSpaceHost.handlesSpace`), and Help says Space keeps its normal meaning in Now Playing (`ConnectionViews.swift:91`). **Fix:** handle Space in Now Playing when no text field or control has keyboard focus, as Music's player does, or drop "(Space)" from that window's tooltip.
- **[APPEAR-09] Symbols that don't mean what they look like.**
  - Clear on Played is shown as a filled versus outlined eraser in the sidebar (`MacWindow.swift:80–84`; 01, 06). On a Mac, fill versus outline reads as selected versus unselected, not on versus off, and the eraser is a strained metaphor.
  - One glyph, `play.fill`, names two different commands side by side in one toolbar group: "Play This Playlist" at x 1079 and "Play Now" for the selection at x 1226 (`07-entry-inspector.txt`, toolbar).
  - **Fix:** show Clear on Played as a small text badge or a checkmark-style symbol only when it's on, with no glyph when off. Give Play This Playlist its own symbol (`play.square.stack` or a text label) or remove it from the toolbar while a selection exists.
- **[TOOL-03] One toolbar group mixes three kinds of action.**
  - On a Playlist with a selection, a single glass group holds Play This Playlist, New Playlist…, Playlist Settings…, the Inspector toggle, Play Now and Add to a Playlist…, followed by More (07).
  - The Inspector toggle moves from the group's trailing end (02, 06) to the middle when a selection appears (03, 07), and the search field shrinks from 327 to 192 pt.
  - **Fix:** use three groups: view/playlist commands; selection commands; and the Inspector toggle alone at the trailing edge before search, as in Mail and Finder.
- **[TYPE-06] Reading lines over 90 characters.**
  - The Add Podcasts note runs about 125 characters per line in a 599 pt text frame (`24-add-podcasts.txt`: "Choose File › Import OPML… … does not stop").
  - The Settings › Library note runs 94 characters (27).
  - **Fix:** limit helper captions to about 480 pt (`.frame(maxWidth: 480, alignment: .leading)`).
- **[TYPE-08] Straight apostrophes.** The Listening Stats empty state reads "Episode's … doesn't" (`LibrarySettingsScreens.swift:317`; 31). The History empty state uses ’ correctly (08). **Fix:** use ’.
- **[SYS-02] No Services.** PodList vends no Services, though "Subscribe in PodList" for a selected feed URL is a natural cross-app operation (no `NSServices`; `scripts/build-mac-app.sh` Info.plist). **Fix:** add an `NSServices` entry that hands the selected URL to `LibraryEditingModel.subscribe`.
- **[SYS-03] No URL scheme or universal link into the app.** Share/Copy Link give web URLs only, and the Info.plist has no `CFBundleURLTypes` and the code no `onOpenURL`. **Fix:** register a `podlist://` scheme for views, playlists and episodes, resolved through `LibraryWindowTarget`.
- **[SYS-06] No Share extension.** People can't receive a podcast page or feed from Safari's Share menu, which is the main way new shows are found. **Fix:** add a Share extension that opens Add Podcasts prefilled with the shared URL.

### N/O

FLOW-01, FLOW-02, FLOW-03, FLOW-04, RESP-01, RESP-02, FOOT-02, FOOT-01, DATA-05, DRAG-05, DRAG-07, APPEAR-11, WIN-03, WIN-10, SET-04

### N/A

- DLG-09: there are no popovers.
- CTRL-02: there are no checkbox hierarchies.
- LIST-05: there are no outlines.
- START-04, START-05: no permissions are requested.
- START-07: there's no account creation.
- FILE-01, FILE-02, FILE-05: no document model or printing.
- FMT-01, FMT-02: no formatted text.
- DATA-02, DATA-03, DATA-08: not a document app.
- SYS-07: Dock state isn't meaningful here.
- EXTRA-01 to EXTRA-04: no menu bar extra.

### Passes (with the evidence that settled them)

- **Menus and commands**
  - MENU-01: menus run PodList, File, Edit, View, Podcast, Views, Episode, Playlist, Controls, Window, Help (`menus.txt`).
  - MENU-02: every toolbar, row and context action has a menu item (`LibraryCommands`, `PlaylistEditingCommands`, `PlaybackCommands`, `MenuCommandActions`).
  - MENU-03: unavailable items are dimmed, and titles toggle: Star/Unstar, Mark Played/Unplayed, Play/Pause, Show/Hide Inspector, Clear on Played ✓.
  - MENU-05, MENU-06.
  - APP-01 to APP-04.
  - FILE-03, FILE-04: Export OPML… uses `NSSavePanel`.
  - EDIT-01: "Undo ‹name›" and "Redo ‹name›" (`PlaylistEditingModel.swift:71`, `EpisodeEditingViews.swift:270`).
  - EDIT-02: Copy and Delete are wired with `onCopyCommand` and `onDeleteCommand`.
  - EDIT-03, EDIT-04, EDIT-05: Copy gives the title plus a URL item (`SelectionCommands.swift:156`).
  - VIEW-01, WMENU-01 to WMENU-03.
  - HELP-01: PodList Help has real task text and a shortcut table (`ConnectionViews.swift:76`). HELP-02.
- **Keyboard**
  - KEY-01: native `List` and `Table`, type-select, and menu equivalents for row buttons.
  - KEY-02: ⌘. Stop matches Music. Cancel in sheets is routed to Esc (`PlaybackKeyboardGuard`).
  - KEY-03: ↩ Play Now, ⇧⌘J/⌥⌘J, ⇧⌘L, ⇧⌘E, ⌘L, ⌥⌘A and more.
  - KEY-04: new-item sheets focus their name fields (13, 17). KEY-05, KEY-06, KEY-07.
- **Text, windows and sidebar**
  - TEXT-01, TEXT-02: standard `TextField`s.
  - WIN-01, WIN-02: the list's inactive selection turns gray in 03. WIN-04, WIN-06.
  - WIN-07: Open in New Window. WIN-08: New Window ⌥⇧⌘N. WIN-09.
  - TOOL-01, TOOL-02, TOOL-04, TOOL-05, TOOL-06.
  - SIDE-01 to SIDE-06: sidebar size follows macOS (`.environment(\.macTextScale, 1)`).
- **Settings and dialogs**
  - SET-01, SET-02: Appearance defaults to System (`MacAppearanceController`). SET-03: tab pane heights are measured. SET-05, SET-06.
  - DLG-01: the only alert is permanent delete. DLG-02 to DLG-08.
- **Controls and lists**
  - CTRL-01, CTRL-03 to CTRL-08: import progress is determinate and can be cancelled.
  - LIST-01 to LIST-04, LIST-06, LIST-07: `contextMenu(forSelectionType:primaryAction:)` and `typeSelectingRows`.
- **Data, drag and pointer**
  - DATA-01: drafts survive quit (`SheetSettingsDrafts`). DATA-04. DATA-06: `@SceneStorage` window context with destination, selection, scroll anchor and columns. DATA-07.
  - DRAG-01 to DRAG-04, DRAG-06: Episode transfer offers private, URL and plain-text representations. Option forces a copy and moves stay within one Playlist (`EpisodeTransfer.swift`). Drops go through the undoable edit history and show "Adding Episodes… n of m" progress.
  - PTR-01 to PTR-05.
- **Appearance**
  - APPEAR-01, APPEAR-02: the AccentColor asset, with `MacAccentForegroundStyle` falling back to primary for pale accents.
  - APPEAR-03: Reduce Transparency and Increase Contrast make glass opaque with a border, and the custom palettes have Increase Contrast variants (`MacGlass.swift`, `MacAppearance.swift`).
  - APPEAR-05: no custom animations. APPEAR-06 to APPEAR-08, APPEAR-10.
- **Type, copy and accessibility**
  - TYPE-01 to TYPE-05, TYPE-07.
  - COPY-01 to COPY-04.
  - AX-01: every icon button has a label and tooltip, and sidebar rows read "Default, 4, Active Playlist, Clear on Played on". AX-02. AX-03: 100–200% text through View › Bigger and Settings. AX-04, AX-05.
- **Launch and help:** START-01, START-02, START-03, START-06: a local Library works without a server.
- **System integration:** SYS-01: 11 App Intents and four App Shortcuts (`AppIntents.swift`, `NowPlayingSnippet.swift`). SYS-04: `ShareLink`.
- **Flow stability (from the screenshots):** FLOW-05, FLOW-06, FLOW-07: the sheet main action is always trailing in the footer.

### Contrast measurements (selected)

| Element | Light | Dark |
|---|---|---|
| Secondary row text "Market Hours" (02) | `#606060` on `#FFFFFF` **6.29** | `#A0A0A0` on `#242222` **6.05** |
| Inspector labels / empty-state text (03, 02) | `#606060` on `#EEEDEC` **5.38** | `#A0A0A0` on `#2B2626` **5.70** |
| Selected row text (03) | white on `#193CAD` **9.17** | white on `#1C35A6` **9.96** |
| Selected sidebar row (06) | white on `#2B50C8` **6.81** | white on `#3652D0` **6.41** |
| Accent text "Current Entry" / "Show Description" (06, 18) | `#2B50C8` on white **6.81** | primary (accent falls back) **11.68** |
| Sidebar symbols (non-text, 06) | `#395ED5` on `#EEEDEC` **4.81** | `#4F69E7` on `#2B2626` **3.20** |
| Unsubscribe armed label (20) | `#B91C1C` on `#ECECEC` **5.48** | `#FF9FA1` on `#343232` **6.51** |
| Settings selected tab label (27) | `#2146BE` on `#FDFDFD` **7.69** | `#435FDD` on `#484646` **1.75 ✗** |
| Toolbar subtitle "6 Episodes" (02; system-drawn `navigationSubtitle`) | `#808080` on white 3.95 | `#959494` on `#2B2A2A` 4.73 |

The toolbar subtitle is the system's own secondary title color. It's recorded here, but not scored against the app.

## Scores

Behavioral scores rest on code and the captured menus, with no running app and no timed flows.

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.8** | System font at Mac sizes: body 13 pt (a 27-character title is 162 pt wide), caption for podcast and metadata lines, headline for subscription names, title2 bold for sheet titles. Time columns use monospaced digits. Hierarchy comes from weight and the readable secondary gray `#606060`/`#A0A0A0`, not size. Held below 8.5 by straight quotes on Listening Stats (TYPE-08), 94–125-character helper lines (TYPE-06), and Timeline rows where the date line (body, 13 pt) outweighs its event caption. | `hierarchy`, `craft` |
| Hierarchy | **7.0** | The squint test passes: the table leads, the sidebar and inspector recede, and glass is confined to controls. Just above Competent because play affordances compete. A Playlist with a selection shows five ▶ targets at once: toolbar Play This Playlist, toolbar Play Now, row ▶, the inspector's large ▶ and the player ▶ (07). Every Timeline row repeats a bordered "Rewind to Here" (09). Auxiliary windows tint Close/Done blue while the real action ("Search") is elsewhere (24, 26). Each sheet footer is a bordered glass box (11, 13, 16), a mild *Box-and-border* tell. | `content-first`, `hierarchy` |
| Spacing & density | **7.2** | Consistent 16–18 pt gutters, Mac-sized controls (24 pt buttons, 28 pt row glyph targets), and one 52 pt toolbar rhythm. Deductions: the title column jumps 23 pt on the Current Entry row (x 650.5 vs 627.5, `10-commute.txt`). The Add Podcasts empty state is 101 pt off-center (24). New Playlist has an empty 60 pt band above its footer (13). All Views uses 24 pt rows beside 54–74 pt rows elsewhere (05 vs 02). | `craft` |
| Color & contrast | **6.9** (capped) | Restrained palette: accent only on interactive glyphs and selection, one error red with Light, Dark and Increase Contrast variants, secondary text 5.4–6.3:1, and pale-accent fallbacks in code. It would sit around 8.2, but APPEAR-04 (Dark Settings tab label 1.75:1, owner-accepted) caps it at 6.9. | `color-restraint`, `accessibility` |
| Iconography | **7.3** | One SF Symbols family at matched weight. Every icon-only control has a tooltip and an accessibility label. Standard glyphs (`square.and.arrow.up` for Share, `trash`, `sidebar.right`). Deductions: fill-versus-outline eraser for an on/off setting, and `play.fill` naming two commands in one toolbar group (APPEAR-09, *Icon confetti*, "one glyph names unrelated commands"). | `conventions`, `plain-language` |
| Consistency & polish | **7.2** (partial: no flow run; stability N/O) | States are designed: empty, loading ("Opening Library…", "Loading Episodes…"), error with Retry, inactive selection, an opaque Reduce Transparency/Increase Contrast mode and a 200% text layout (`MacReadingRow`). Deductions: VIEW-02's contradictory Show/Hide Sidebar title; three verbs for closing a helper; ›/▸ path notation; File menu's double separator (`menus.txt`, after Cancel Import); "Show Description"/"Show Less" toggling with no visible change when the text already fits (18 vs 19, `PodcastScreens.swift:133`); a second Cancel/Save pair inside Playlist Settings while renaming (12). | `craft`, `conventions` |
| Clarity | **7.2** | Purpose is obvious. The window title names the view, and the subtitle gives counts and selection ("6 Episodes · 1 selected"). State is visible: the Active Playlist speaker, Current Entry, In progress/Unplayed, Up to date. Copy names consequences. Deductions: the eraser glyph needs a tooltip to read. Sheets explain their own buttons ("Save applies these settings. Cancel discards changes."). Renaming is a two-level commit. "Retry" and "Play (Space in Library)" in menus. "Select an Episode" on Entry screens. | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped; partial: no running app) | **Looks 7.4.** Native: source-list sidebar, `Table` with sortable resizable columns, toolbar search, Settings with toolbar panes, standard sheets and alert. Foreign: the bottom transport bar; Done/Close buttons in modeless windows (24, 26); iOS-style chevron "Open" buttons on Subscription rows (01). **Behaves 8.0.** Complete menu bar with labelled Undo, context menus everywhere, drag with Option-copy, App Intents and Shortcuts, window restoration, Help with a shortcut table, native text fields. Missing: Spotlight, URL scheme, Services, Share extension. Formula (7.4 + 2 × 8.0) ÷ 3 = 7.8, capped at 6.9 by WIN-05 and SYS-05 (both owner decisions). | `conventions`, `discoverable-commands` |
| Interaction & feedback | **7.8** (partial: code and menus; no timed runs) | Keyboard-fluent: shortcuts for queueing, starring, marking, chapters and inspector, plus type-select. Every edit goes through one app-wide, named Undo/Redo history, with an inline Undo button. A Rewind preview, drafts that survive quit, a confirm only for permanent delete, determinate import progress with Cancel, and an undoable drag-and-drop. No checklist caps. Held below 8.5 by Play/Pause having no menu key equivalent (Space works only in the library window, KEY-08), and by responsiveness and flow stability being unmeasured. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **7.3** | It serves the primary task well and would feel at home among Mac library apps on command coverage, undo and keyboard. Overall can't exceed 6.9 + 2.0 = 8.9, and it isn't near that. What holds it down most: two owner-fixed Platform fit caps (bottom player bar, no Spotlight) and the Dark accent's tab-label contrast. Among owner-free items, hierarchy is the weakest: play affordances compete and the toolbar groups mix purposes. | — |

## What stands between this build and 9.0

1. **Owner-held caps.** They are owner decisions and not proposed here, but they keep Color & contrast and Platform fit at 6.9, and so Overall well below 9:
   - Color & contrast stays at 6.9 until the Dark accent reads at 4.5:1 on the selected Settings tab (APPEAR-04).
   - Platform fit stays at 6.9 until transport leaves the bottom bar (WIN-05) and Spotlight indexing ships (SYS-05).
2. **Hierarchy (7.0).** Give the play action one home per scope, and split the toolbar into readable groups (TOOL-03, APPEAR-09).
3. **Evidence gaps.** A real flow run with measurements, at minimum size, half-tile and typical size, in Light and Dark, plus five timed passes, would settle FLOW-01 to FLOW-04, RESP-01, RESP-02 and FOOT-02, and give the stability sub-score. Without it, Consistency & polish and Interaction & feedback stay partial.
4. **Minor polish:**
   - VIEW-02's sidebar title.
   - Menu titles (MENU-04).
   - Space in Now Playing (KEY-08).
   - Helper line length (TYPE-06) and apostrophes (TYPE-08).
   - One verb for closing helpers, and one path separator.
   - The off-center Add Podcasts empty state and the 23 pt Current Entry indent.
   - Services, URL scheme and Share extension (SYS-02, SYS-03, SYS-06).

## Next step

- **Target:** Hierarchy (7.0). There's no blocker. Every major failure is an owner decision, and the two lowest categories (6.9) are capped only by owner decisions, so Hierarchy is the lowest owner-free category and sits on the primary task (queue and play).
- **Anti-pattern:** *Icon confetti*, in its "one glyph names unrelated commands" form. Nearest contrast pairs: HIER-05 (a toolbar has a readable order) and HIER-07 (separate actions don't share one silhouette).
- **Root cause:** selection actions are appended into the same glass group as the view and playlist commands (`MacWindow.swift:151–186` plus `EpisodeActionButtons`). The toolbar then shows two `play.fill` buttons with different scopes, and the Inspector toggle drifts to the middle as soon as a row is selected.
- **Change:**
  - Split the primary toolbar items into three `ToolbarItemGroup`s:
    1. view/playlist commands: New…, Settings/Edit…, and Play This Playlist with a distinct symbol such as `play.square.stack`;
    2. selection commands: Play Now, Add to a Playlist…, More;
    3. the Inspector toggle alone, trailing, just before search.
  - Hide Play This Playlist's toolbar button while a selection exists; the Playlist menu keeps it.
- **Principle:** `hierarchy` (position and grouping express scope before styling does).
- **Expected effect:**
  - Hierarchy +0.4 to +0.6, which clears TOOL-03 and part of APPEAR-09.
  - Iconography +0.3 and Clarity +0.2.
  - No category should regress: commands stay discoverable in the menus.
  - Character survives: the glass control layer and the blue row glyphs are unchanged.
