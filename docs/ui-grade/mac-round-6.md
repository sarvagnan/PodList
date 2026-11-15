# PodList Mac — UI grade, round 6 (Opus)

Build: `apps/apple` at `2d7c741`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` (full audit), with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. Evidence: `~/Documents/podlist-grading/mac-round-6/` (35 states × Light/Dark, XCUITest accessibility snapshots, `menus.txt`) plus the source. No computer-use tools were used and the app was not launched. Earlier grading reports were not opened.

Conventions in this report: capture references are `light/NN` / `dark/NN` (the `.png` and its `.txt`). Points are pixels ÷ 2 (captures are 2×; the 1180 × 760 pt window is 2360 × 1520 px). Contrast ratios are WCAG relative-luminance ratios measured on glyph cores in the captures, so they're accurate to roughly ±0.2.

## Frame

- **Task:** find Episodes worth hearing (through Views, Subscriptions and Search) and listen to them in order from Playlists, picking up where you left off.
- **Target:** Mac app (SwiftUI, macOS 26+, captured on macOS 27.2).
- **Posture:** sovereign. It's a library and player people keep open all day, with transient side windows (Add Podcasts, Now Playing, Listening Stats).
- **Audience:** perpetual intermediate. It also gives experts a lot: a View rule editor, a Listening Timeline with Rewind, App Intents and an optional MCP server.
- **Nearest exemplar:** Things. PodList is a calm personal tool with a fixed domain vocabulary and opinionated concepts (Views, Playlists, Clear on Played, Rewind). Its keyboard and menu ambitions are BBEdit-like.
- **Character (the signature elements):**
  1. A capitalised domain glossary used everywhere as proper nouns: Episode, Playlist, Entry, View, Active Playlist, Listening Timeline.
  2. Plain-spoken explanatory copy that states consequences ("Deleted Playlists are kept for 30 days…", the Rewind summary).
  3. A three-pane library (sidebar, sortable table, inspector) over a persistent bottom glass player bar. The bar is fixed by the owner.
  4. Monogram artwork tiles (DF / MH / SB) in an accent tint.
  5. A brand blue that appears only as the Multicolor accent. This is fixed by the owner.
- **Owner decisions recorded:**
  - The brand accent is used only under Multicolor; otherwise the app follows the system accent.
  - Transport controls live in the bottom bar.
  - Appearance offers Light, Dark and macOS (System).
  - There's no customizable toolbar.
  - Unsubscribe takes two clicks: the first arms it, it disarms by itself after a few seconds, and it can be undone.
  - Liquid Glass is used for the player bar, Inspector actions, Now Playing and the sheet footers.
  - Spotlight indexing is deferred.
  - The MCP server is off by default; App Intents are on.

  These decisions are scored below and any caps they cause still stand, but none of them is chosen as the next target.

## Flows

- **Tasks covered by the captures:** browse a View → select an Episode → open the inspector (02→03→33); open a Playlist → History → Listening Timeline → Rewind (06→09→34a→34); manage Playlists (10–13); search → Create View (15); edit and create a View (16, 17); open a Podcast page → unsubscribe arm/disarm → settings (18–22); add to a Playlist (23); Add Podcasts (24); download rules (25); Now Playing (26); Settings (27–30); Stats (31); Getting Started (32).
- **Widths:** only the typical 1180 × 760 pt window. Neither the minimum size (760 × 500 per `MacWindow.swift`) nor half-display tiling was captured.
- **Appearances:** Light and Dark, set with the app's own Appearance setting.
- **Timed runs:** none. **Flow script and measurements file:** none. The XCUITest tour is a sequence of separate states, not a flow run with a measurement at each step.
- **Result:** the F-only checks (FLOW-01, FLOW-02, RESP-01, RESP-02) are N/O, and the stability sub-score is N/O. Consistency & polish is therefore marked "(partial: no flow run)".
- **Recorded anyway** because the snapshot frames measure it directly (it is filed once, under WIN-03): opening a Podcast page displaces the whole window content.
  - The `SidebarNavigationSplitView` frame moves from `(370, 190, 1180, 760)` to `(370, 159.5, 1180, 765.5)`, 30.5 pt upward.
  - The sidebar "Views" header moves from y 243.5 to 213.0 and sits under the traffic lights.
  - The Player group moves to y 995, below the window's bottom edge at y 950.
  - It happens in states 18–22 in both appearances (`light/18…22.txt` line 3, line 10 and the `label="Player"` line; same in `dark/`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Episode lists: View, Search (02–04, 15, 33) | A reserved 32 pt feedback row at the top of the content, under "Up to date". Caption size, primary colour, expires after 5 s (`EditingNotice`) | The same row, red `podListError` text with Retry | none | "Undo ‹name›" button in the same row, plus Edit › Undo ‹name› | `ContentUnavailableView`, centred: symbol, bold title, readable-secondary body (#606060), an action button where one applies | "Opening Library…" progress | Toolbar Play Now / Add to a Playlist (with a selection); row ▶ / ≡+ buttons | Rule summary caption above the table (02) |
| Playlist: Entries, History, Timeline (06–10) | Same feedback row | Same | Rewind opens a summary sheet (34) | Same row and Edit menu | "No History" with a clock, centred (08) | — | Segmented Entries / History / Listening Timeline, with ▶ Play This Playlist beside it | History empty-state body explains the rule |
| Subscriptions (01, 25) | Same row | Same | — | Same | "No Subscriptions" + Add Podcasts (code) | — | "Edit Download Rules…" trailing; disabled until a selection | "Grouped by Download Rule" caption |
| Podcast page (18–21) | Same row | Same | Unsubscribe arms inline (red "Unsubscribe", 20) | Same | — | "Reading Episodes…" | Subscribed / Share Podcast / Copy Feed Address / ⚙ row under the title | "Show Description" link |
| Trash (14) | Same row | Same | Delete Permanently confirmation dialog (code) | Same | "Trash Is Empty" + body, centred | — | — | A caption line at top-left, x = 607 pt (other screens' captions start at 611) |
| Task sheets (11–13, 16, 17, 22, 23, 25, 34) | Status line above the footer (`PodListSheet` `status`) | Same position, red | The sheet itself | Undo/Redo in the sheet's status row (View editor) | — | — | Trailing default button inside a glass footer slab; Cancel to its left; a destructive secondary (Delete …) leading | Paragraphs in 10 pt caption; Playlist and Subscription sheets add "Save applies these settings. Cancel discards changes." The View sheets (16, 17) don't, though they use the same Save/Cancel |
| Add Podcasts window (24) | — | (code) inline | — | — | "Find Your Next Podcast": symbol + title + body, **centred ~101 pt left of the window centre** | "Finding Podcasts…" | "Search" beside the field; **"Close"** in the glass footer | Help text uses "File › Import OPML…" |
| Now Playing window (26) | — | — | — | — | — | — | **"Done"** in the glass footer | — |
| Settings (27–30) | (code) inline notices | (code) | — | — | — | — | Live apply, no commit button | Captions below controls (10 pt) |
| Listening Stats (31) | — | — | — | — | "No Listening Yet": body in system secondary #808080 (3.95:1) | — | — | — |
| Getting Started sheet (32) | — | — | — | — | — | — | **"Dismiss"** in the glass footer | Uses "File ▸ Add Podcasts… (⇧⌘A)" |

**Mismatches:**
1. **Same action, three names.** Closing an auxiliary surface is "Close" in Add Podcasts (24), "Done" in Now Playing (26) and "Dismiss" in Getting Started (32).
2. **Two empty-state body colours.** History, Trash and Add Podcasts use the app's readable secondary (#606060, 6.3:1). Listening Stats uses system secondary (#808080, 3.95:1), and the inspector placeholder title is 3.07:1 (02, 31).
3. **Two menu-path separators.** "›" is used in Add Podcasts (24) and Settings › Text Size (28); "▸" is used in Getting Started (32).
4. **Explanation of the commit buttons appears in some sheets only.** Playlist Settings (11) and Subscription Settings (22) explain Save and Cancel; Edit View and New View (16, 17) have the same buttons and no explanation.
5. **"Device" in the main window, "this Mac" in Settings.** The Podcast page, sheets and inspector say "Device" ("Download Rule on This Device", "Not downloaded on this Device", 03/18/22), while Settings › Automation says "this Mac" (30).
6. **Notice wording varies.** It is "View ‹name› deleted" and "Playlist ‹name› moved to Trash" (unquoted names) but "Restored Playlist “‹name›”" (curly quotes) (`LibraryEditingModel.swift:218`, `PlaylistEditingModel.swift:209/213`).
7. **Checkbox layout varies.** Settings › Automation has a native trailing-label checkbox (30); the sheets put the label above a detached box (11, 22). This is CTRL-01.

## Checklist

**Coverage: 89.9%** (pass 122 · fail 12 · N/O 15 · N/A 19; 168 IDs; 149 applicable, 134 of them decided)

### Failures by severity

**Blocker:** none.

**Major**

- **[WIN-03] Windows and content adapt to the sizes people choose — the Podcast page overflows the default window.**
  - Evidence: at 1180 × 760 pt the Podcast page's content doesn't fit, so SwiftUI grows the root and shifts the whole window content up by 30.5 pt.
    - The split view frame is `(370, 159.5, 1180, 765.5)` against the window's `(370, 190, 1180, 760)`.
    - The sidebar "Views" header overlaps the close button (`light/18.png`, top-left; `.txt` line 10, y 213 vs. 243.5 elsewhere).
    - The player bar is pushed below the bottom edge: Player group y 995 against window bottom 950 (`.txt` line 182). The transport, scrubber, Speed and Sleep can't be reached on that page.
    - It reproduces in states 18–22, Light and Dark.
    - Cause: a fixed header (artwork, buttons and Download Rule picker, about 300 pt) above a `Table` with its own scroller (385 pt), plus the 80 pt player inset, totals more than 760 pt (`PodcastScreens.swift` `PodcastPageScreen`, `MacWindow.swift:136–139`).
  - Fix: let the header and the table share one scroll view, or give the table a flexible minimum height (`.frame(minHeight: 120, maxHeight: .infinity)`, with no `fixedSize` on the header stack), so that the detail column never proposes more than the window's height. Add a UI test that asserts the split view's frame equals the window's content rect on the Podcast page.
- **[CTRL-01] Choice controls keep their recognisable Mac form — the sheets' form controls don't.**
  - Evidence:
    - In task sheets every `Toggle` and `Stepper` inherits `PodListSheetLabelStyle`'s stacked layout.
    - The checkboxes draw their label *above* a detached box: "Clear on Played" (11, 12) and "Mark All Played" (22). A Mac checkbox carries its label to its right, as Settings › Automation's "Enable MCP Server" does (30).
    - "Last 7 days" (16) is a bare up/down stepper under a static label, with no value field, for a 1–3650 day range (`ViewEditorScreen.swift:74`).
    - "Mark All Played" is a one-off command shown as a persistent checkbox and applied on Save (22; contrasts.md PLAT-06: control shape should say toggle vs. command).
  - Fix:
    - In `PodListSheetFormStyle`, render `Toggle` as `.toggleStyle(.checkbox)` with its trailing label and without `PodListSheetLabelStyle`.
    - Pair the stepper with a narrow number field: "Last [ 7 ] days ⌃⌄".
    - Make "Mark All Played" a button ("Mark All Played…"), which already exists in the Podcast menu, rather than a staged checkbox.
- **[LIST-07] Interactive lists select on click and open on Return or double-click — All Views doesn't.**
  - Evidence: the All Views list (05) is a `List` of `.plain` `Button`s with no selection binding (`MacWindow.swift:284–290`). A single click navigates away, and arrows, type-select and Return don't work there. The other lists (episode tables, Subscriptions, Entries) pass: they keep a selection and use `primaryAction` for double-click.
  - Fix: give the list `selection:` and `.contextMenu(forSelectionType:primaryAction:)`, so that click selects and Return or double-click opens.
- **[WIN-05] Critical actions stay above the bottom edge — the transport sits in a bottom bar. Owner decision; scored, not a target.**
  - Evidence: Play/Pause, ±15/30, the scrubber, Speed and Sleep live only in a bottom bar (01–33). Every one of them has a Controls-menu equivalent and shortcut (Space, ⌘←/⌘→, ⌘.), which mitigates it.
  - The cap stands; see contrasts.md HIER-08.
- **[SYS-05] Searchable content is indexed in Spotlight — Episodes and Podcasts aren't. Owner decision (deferred); scored, not a target.**
  - Evidence: no `CoreSpotlight` anywhere in `apps/apple/Sources`.

**Minor**

- **[APPEAR-04] Text meets the contrast targets — two isolated Light-mode failures.** These are app-owned text on reading surfaces, against the 4.5:1 target for text under 18 pt:
  - "Play an Episode to start your Listening Log." is 3.95:1 (`light/31`; system `.secondary` instead of `podListReadableSecondary`).
  - The Settings server address "http://127.0.0.1:49153" is 3.90:1 (`light/28`).
  - Dark passes (5.5–6.1:1).
  - Recorded but not counted against the app, because the system draws them: the window subtitle "6 Episodes · 1 selected" at 3.95:1 and the sidebar section headers ("Views", "Playlists") at 2.2:1.
  - The app's own secondary (#606060 / #A0A0A0) measures 6.3:1 / 6.0:1 everywhere else.
  - Fix: use `MacReadableSecondaryStyle()` for `ContentUnavailableView` descriptions and the server value.
- **[APPEAR-09] Symbols use familiar meanings — the Clear on Played mark doesn't.**
  - Evidence: Clear on Played is shown with `eraser` / `eraser.fill` in `.primary` (`MacWindow.swift:85`). At sidebar size it reads as a black or white diamond (01–14), it's the only fixed-colour, non-accent glyph in rows otherwise drawn in the accent, and "eraser" for "remove on played" is a stretch.
  - Fix: use `checkmark.circle.badge.xmark` or `text.badge.minus` in secondary colour, or drop the glyph and keep the state in the tooltip and the context-menu checkmark.
- **[TYPE-06] Reading text keeps a comfortable measure — several help paragraphs run long.** Help paragraphs run 95–120 characters per line:
  - "Choose File › Import OPML… in the Library window, or import in Settings › General › Library. Closing Add Podcasts does not" (24, about 120);
  - Settings › Text Size help (28, about 112);
  - Playlist Settings help (11, about 90).
  - Fix: cap help text at about 60 ch (`.frame(maxWidth: 440)`).
- **[COPY-01] Specific verbs and consistent terminology — three mismatches.**
  - "Close" / "Done" / "Dismiss" for the same act (24, 26, 32).
  - "Device" vs. "this Mac" (03, 18, 22 vs. 30).
  - The "Add 1 Episode to a Playlist" sheet whose actions are "Play Now / Play Last / Play Next" (23): the title promises Add, the buttons say Play.
  - Fix: one closing verb (Done); "this Mac"; title the sheet "Add 1 Episode to a Playlist" with buttons "Add Next" (default) / "Add Last" / "Play Now".
- **[VIEW-02] Show/Hide titles reflect visibility — View › Show Sidebar doesn't.** `menus.txt` shows "Show Sidebar" while the sidebar is visible. The capture was taken in state 33; the Window menu lists "New this week (6 Episodes · 6 selected)". "Hide Inspector" is correct in the same dump.
  - Confidence is moderate, because XCUITest reads the validated title.
  - Fix: validate `toggleSidebar:` against `columns`, or supply a "Hide Sidebar" / "Show Sidebar" `Button` bound to `columnVisibility` in place of `SidebarCommands()`.
- **[SYS-03] Addressable content has stable links — no URL scheme or deep links.** Episodes, Playlists and Views have stable IDs but no `podlist://` URL; there's no `onOpenURL` or `CFBundleURLSchemes`.
- **[SYS-06] Relevant cross-app workflows are supported — no Share extension.** There's no Share extension to receive a feed URL from Safari. Dragging or pasting a URL into the window works (`LibraryDrops.swift`), so this is minor.

### N/O

FLOW-01, FLOW-02, LIST-05, DATA-05, DRAG-05, PTR-03, APPEAR-11, RESP-01, RESP-02, FOOT-02, WIN-10, TOOL-02, SET-06, DRAG-07, FOOT-01

### N/A

- DLG-09: no popovers.
- CTRL-02: no checkbox hierarchies.
- START-04, START-05: no permission requests.
- START-07: no account creation.
- FILE-01, FILE-02, FILE-05: not a document app; OPML is an import/export only.
- FMT-01, FMT-02: no formatted text.
- DATA-02, DATA-03, DATA-08: not a document app.
- SYS-02: no selection-based service worth vending.
- SYS-07: no meaningful Dock state.
- EXTRA-01 to EXTRA-04: no menu bar extra.

### Passes (with the evidence that settles them)

- **Menus.**
  - MENU-01: order is App · File · Edit · View · Podcast · Views · Episode · Playlist · Controls · Window · Help. The Connection and Automation configuration submenus sit in the Settings group, just ahead of Settings…
  - MENU-02: every toolbar, context, row and inspector action has a menu item, including Rewind to Here…, Create View from Search…, Open in New Window, Back to Library ⌘[ and Go to Chapter.
  - MENU-03: dimmed items stay visible; titles toggle (Play/Pause, Star/Unstar, Subscribe/Unsubscribe, Mark Played/Unplayed).
  - MENU-04, MENU-05 (one submenu level), MENU-06.
  - APP-01, APP-02 (Settings… ⌘, opens the Settings scene), APP-03, APP-04.
  - FILE-03 (Close ⌘W), FILE-04 (Export OPML… keeps the window).
  - EDIT-01: "Undo ‹name›" from `PlaylistEditingModel.undoTitle`, which falls back to the text view's own undo title while editing.
  - EDIT-03: the Find submenu is kept; ⌘F is "Search Library".
  - EDIT-04: Spelling, Substitutions, Transformations, Speech, Dictation and Emoji are present.
  - VIEW-01, WMENU-01 to WMENU-03, HELP-01 (a PodList Help window), HELP-02 (the system Help search field).
- **Keyboard and text.**
  - KEY-01 (C): standard controls throughout; the only gesture is a `simultaneousGesture` with a keyboard and menu equivalent.
  - KEY-02.
  - KEY-03: Space, ⌘←/⌘→, ⇧⌘L/E/J, ⌥⌘J/A/E/, and ⌥⌘↑↓. This leans on Option (eight bindings), but each has Command and appears in a menu.
  - KEY-04: initial focus lands on the expected field (12, 13, 17, 25).
  - KEY-05: the `PodListShortcut.notation` order is ⌥⇧⌘.
  - KEY-06, KEY-07.
  - KEY-08: the shortcut reference is in Help (`ConnectionViews.swift:103`), and the bare Space/Return keys are kept out of text fields by `PlaybackKeyboardGuard`.
  - TEXT-01: `interpretKeyEvents` honours the user's key bindings. TEXT-02.
- **Windows.**
  - WIN-01, WIN-02: the sidebar selection turns grey when the table has focus (03).
  - WIN-04: titles name the view, e.g. "Subscriptions – 3 Subscriptions".
  - WIN-06 to WIN-09.
- **Toolbar and sidebar.**
  - TOOL-01, TOOL-03 to TOOL-06.
  - SIDE-01 to SIDE-06. The sidebar keeps system metrics, and Text Size applies only to content (`MacWindow.swift:112`).
- **Settings.**
  - SET-01 to SET-05: toolbar panes General/Automation; the window sizes to the pane (30) and dims minimize and zoom; the title follows the pane; changes apply live through `savePlayback`; Appearance defaults to System.
- **Dialogs.**
  - DLG-01 to DLG-05, DLG-07: "Delete “X” Permanently?" with the destructive role, Cancel, and informative text; ⌘. in a sheet is routed to Esc.
  - DLG-06, DLG-08: Add Podcasts and Now Playing are modeless windows.
- **Controls.**
  - CTRL-03: fields keep labels, and optional fields are marked "(Optional)".
  - CTRL-04: locale-aware `FormNumbers` and field-level `validation(...)`.
  - CTRL-05, CTRL-06.
  - CTRL-07: the search prompt names its scope ("Search this list", "Search Library", "Search Episodes").
  - CTRL-08: determinate import and download progress; Cancel Import.
- **Lists.**
  - LIST-01 to LIST-04, LIST-06: sortable, resizable `Table`s with noun headings.
- **Data safety.**
  - DATA-01: sheet and settings drafts survive quitting (`SheetSettingsDrafts`).
  - DATA-04: multi-step labelled Undo/Redo.
  - DATA-06: `@SceneStorage` `WindowContext` restores destination, search, selection, sort, tab, scroll anchor and pane widths.
  - DATA-07: `NSSavePanel` with a default name.
- **Drag and drop.**
  - DRAG-01 to DRAG-04, DRAG-06: `EpisodeTransfer` exports a private type, then URL, then text. Option-copy is evaluated during the drop. Multi-row drags keep their order. Drops show "Adding Episodes… n of m" progress and select what was dropped. OPML and URL drops onto the window open the import flow.
- **Pointer.**
  - PTR-01, PTR-02.
  - PTR-04: icon buttons have specific tooltips, some with the shortcut.
  - PTR-05: `contextMenu(forSelectionType:)`.
- **Appearance.**
  - APPEAR-01, APPEAR-02: the system accent; `MacAccentForegroundStyle` falls back to primary when a pale accent can't reach 4.5:1.
  - APPEAR-03: glass becomes opaque with a border under Reduce Transparency or Increase Contrast; the palettes have High Contrast variants.
  - APPEAR-05: no custom positional animation.
  - APPEAR-06 to APPEAR-08, APPEAR-10.
- **Typography.**
  - TYPE-01: 13 pt body (9.5 pt cap height measured), 10 pt captions, Title 2 bold sheet titles.
  - TYPE-02 to TYPE-05, TYPE-07, TYPE-08: real ellipses and curly apostrophes.
- **Copy.**
  - COPY-02: `FailureMessages` gives recovery steps, shown in the feedback row.
  - COPY-03, COPY-04.
- **Accessibility.**
  - AX-01: icon buttons are labelled ("Play Now: ‹title›", "Add ‹title› to a Playlist"); the slider has a value; sidebar rows combine name, count, Active and Clear-on-Played state.
  - AX-02 to AX-05.
  - AX-03: Text Size 100–200%, plus View › Bigger/Smaller/Actual Size.
- **Launch.**
  - START-01: "Opening Library…".
  - START-02, START-03: Getting Started can be dismissed and stays findable in Help and Settings.
  - START-06: "Start on This Mac" needs no account.
- **Remaining passes.**
  - EDIT-02: Copy and Delete commands on selections.
  - EDIT-05: copying puts both text and a URL on the pasteboard.
  - SYS-01: App Intents for play, pause, playback control, play an Episode, add to a Playlist, mark, search and list, App Shortcuts and donations.
  - SYS-04: `ShareLink`.
  - FLOW-03 (C): settings fields reconcile only when not focused (`LibrarySettingsScreens.swift:248–249`).
  - FLOW-04 to FLOW-07 (S).
  - SIDE-03, SIDE-04, SET-01, TOOL-06.

## Scores

**Caps applied:**
- **Platform fit ≤ 6.9:** majors WIN-03, WIN-05 (owner decision), LIST-07 and SYS-05 (owner decision).
- **Consistency & polish ≤ 6.9:** major CTRL-01.
- **No other category is capped:** the remaining failures are minor.
- **Overall ≤ lowest category + 2.0** = 6.2 + 2.0 = 8.2.

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.3** | Strong, low. **Holds it up:** system font at Mac sizes (13 pt body, 10 pt captions, Title 2 bold sheet titles); hierarchy carried by weight and a tuned secondary colour (#606060 / #A0A0A0); Timeline rows read as bold title, regular date, caption event (09). **Keeps it out of the upper band:** help paragraphs run 95–120 ch (TYPE-06); in the View sheets the section header "All Conditions Must Match" uses the same regular body style as the field labels, so it does no grouping work (16, 17); Now Playing sets the episode title in regular Title weight over a bold 13 pt podcast name, which inverts the emphasis (26). | `hierarchy`, `craft` |
| Hierarchy | **6.8** | Competent, top. **Holds it up:** sidebar → table → inspector reads left to right, and the table is the strongest shape on list screens. **Pulls it down:** a status band about 45–60 pt tall ("Up to date" plus an empty, reserved feedback row) sits above every list (01–14). Action rows ("New View…", "New Playlist…", "Add Podcasts…") are interleaved with destinations in the sidebar. The inspector's solid black play circle out-weighs the list selection (03, 07). Five identical bordered "Rewind to Here" buttons repeat down the Timeline (09). Sheet footers are glass slabs 60–65 pt tall, often heavier than the sheet's content (13, 23, 25). | `content-first`, `hierarchy` |
| Spacing & density | **6.4** | Competent. **Holds it up:** one 16 pt content margin, 54 pt two-line rows, 28 pt row buttons, Mac-sized controls (TYPE-04 passes). **Pulls it down:** the layout doesn't survive the default size on the Podcast page (WIN-03: content shifted 30.5 pt, player off-window); the reserved status band leaves 42–49 pt of dead space above every list; the Add Podcasts empty state is centred about 101 pt left of the window centre (24); the Trash caption starts at x 607 pt against 611 pt elsewhere (14); New Playlist and Download Rules sheets leave 60–80 pt of empty band above the footer (13, 25). | `craft`, `hierarchy` |
| Color & contrast | **7.3** | Strong. **Holds it up:** system accent with the brand blue only under Multicolor; no brand-coloured chrome; secondary text tuned to 6.3:1 in Light and 6.0:1 in Dark; error red, secondary and brand each have High Contrast variants; selection text 9.2:1 on the selection fill; Dark is coherent (03d, 09d, 11d). **Pulls it down:** isolated Light-mode failures at 3.95:1 and 3.90:1 (APPEAR-04); a fixed black/white eraser glyph among accent icons (APPEAR-09); row ▶ and ≡+ glyphs are accent in Light but primary white in Dark (02 vs. `dark/02`), a deliberate contrast fallback that still changes their colour meaning between appearances. | `color-restraint`, `accessibility` |
| Iconography | **7.0** | Strong, bottom. SF Symbols throughout, every icon-only button has a tooltip and label, and the transport glyphs are standard. **Pulls it down:** the eraser stands for Clear on Played; the same `line.3.horizontal.decrease` icon marks All Views and every View, so it carries no information; every episode row carries two accent icon buttons (≡+ and ▶), 12 small blue glyphs per screen (02); the "6 Episodes selected" header has an unclear stack glyph (33). | `conventions`, `craft` |
| Consistency & polish | **6.2** (stability N/O; partial: no flow run) | Competent. Capped at 6.9 by CTRL-01. **Holds it up:** the main path is polished in both appearances: native tables, sidebar and inspector, focus rings on the expected fields, inactive-selection grey, and designed empty, loading and error states. **Pulls it down:** sheets draw checkboxes and steppers in a non-Mac stacked form (11, 16, 22); the Podcast page is visibly broken at the default size (18–22); the inventory shows seven mismatches (Close/Done/Dismiss; two empty-state colours; ›/▸; Device/Mac; quoted/unquoted names; Save/Cancel explanation in some sheets only; checkbox layouts); "Show Description" toggles to "Show Less" without revealing any more text (19). | `craft`, `conventions` |
| Clarity | **6.6** | Competent, high. **Holds it up:** the domain glossary is consistent and every concept is explained where it's used: History's empty state, Rewind's "Goes back to / Unplayed again / Kept", "Deleted Playlists are kept for 30 days". State is visible: Active Playlist, Current Entry, Clear on Played, "Up to date", "1 selected". **Pulls it down:** Playlist Settings mixes three commit models in one sheet — an inline Rename with its own "Cancel Rename / Save Name", an immediate "Delete Playlist", and Save/Cancel for the rest — and has to explain them in text (11, 12; *Modal matryoshka*); the "Add … to a Playlist" sheet's buttons say Play (23); Listening Stats says "No Listening Yet" while the Timeline shows "Listened at 12:34" and two Episodes are In progress (31 vs. 09); the "In the Last Days" pop-up item has no number (16); the subtitle "Podcast page" names the page type instead of giving information (18). | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped) | Looks 7.2 · Behaves 7.9 → (7.2 + 2 × 7.9) ÷ 3 = **7.7**, capped at 6.9 by WIN-03, WIN-05, LIST-07 and SYS-05. **Native:** a complete, validated menu bar; labelled Undo; Settings window with panes that applies live; system accent; standard windows, tabs and full screen; Help with search; context menus on every object; rich drag and drop; App Intents. **Adapted:** the glass player bar and glass sheet footers. **Foreign:** iOS-style stacked sheet forms with label-above checkboxes and a bare stepper (L3); All Views rows that navigate on a single click (B5); a Podcast page that breaks the window frame at the default size. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **7.6** (partial: no timed runs) | Strong. **Holds it up:** shortcuts for every frequent command; multi-step, labelled Undo/Redo, with Undo also offered in place; drafts survive quitting; drops are undoable with progress and selection; Option-copy; the playback keyboard guard keeps Space and Return out of text fields; Reduce Transparency and Increase Contrast handled; full VoiceOver labels. No failure in its checklist groups. **Keeps it below 8:** the nested Rename mode inside a settings sheet; Rewind confirms through a sheet even though it can be undone (a preview is defensible, but it adds a step); Option is used in eight of the custom bindings; RESP-01/02 and FOOT-02 are unmeasured. | `forgiveness`, `keyboard-efficiency`, `feedback` |
| **Overall** | **6.9** | Allowed up to 8.2 by the lowest-category rule; scored 6.9 on judgement. It serves the primary task well and behaves like a Mac app almost everywhere — the menus, Undo, keyboard and drag-and-drop are better than most SwiftUI Mac apps. **Biggest drag:** the visible finish of the secondary surfaces: a Podcast page that breaks the window at its default size, and task sheets laid out like an iOS form (stacked labels, detached checkboxes, a bare stepper, nested Rename/Save pairs, glass slab footers). Owner-decided majors (WIN-05, SYS-05) independently cap Platform fit at 6.9. | — |

## What stands between this build and 9.0

1. **Owner-decided caps make 9.0 unreachable as things stand.** SYS-05 (Spotlight deferred) and WIN-05 (transport only in the bottom bar) are major Platform-fit failures. On their own they cap Platform fit at 6.9, and so Overall at 8.9.
   - Indexing Episodes and Podcasts with `CSSearchableItem` lifts SYS-05.
   - WIN-05 stays as long as the transport lives only at the bottom edge; mirroring Play/Pause and the skips into the toolbar would satisfy it without removing the bar.
2. **WIN-03: fix the Podcast page overflow.** It's the most visible defect in the build and it hides the player.
3. **CTRL-01: make the sheet forms Mac-native.** Use trailing-label checkboxes, a value field next to the stepper, and a button instead of the "Mark All Played" checkbox.
4. **LIST-07: give All Views a selection model.**
5. **Simplify sheets.**
   - Replace the inline Rename sub-mode with a plain Name field committed by Save.
   - Drop the explanations of the buttons and the Delete-takes-effect-immediately paragraph.
   - Shrink the glass footer to the controls, or use the standard sheet button row.
   - Cap help text at about 60 ch.
6. **Reclaim the status band.** Show "Up to date" and feedback in a single 24–28 pt row, or move sync status to the window subtitle, so lists start about 45 pt higher.
7. **Close the inventory mismatches.** One closing verb; "this Mac"; one menu-path separator; `MacReadableSecondaryStyle` in every `ContentUnavailableView`.
8. **Evidence:** run the main tasks as a measured flow run at minimum size, half-display and typical size, with timed passes. FLOW-01/02, RESP-01/02 and the stability sub-score are unverified, and Consistency & polish can't be scored above "partial" without them.

## Next step

- **Target:** CTRL-01 (major), in the lowest-scoring category, Consistency & polish (6.2). There are no blockers. WIN-03 is the most visible defect but sits in Platform fit (6.9), which ranks second under step 4's rule. Fix it immediately after.
- **Anti-pattern:** *Centered phone form*: an iOS-style stacked form inside a Mac sheet. The nearest contrast pair is PLAT-06 *Controls keep their choice grammar*. Things would keep its own look but give every checkbox its label on the right and make "mark all" a command, not a staged option.
- **Root cause:** `PodListSheetFormStyle` and `PodListSheetLabelStyle` (`PodListSheet.swift`) stack every label above its control so long values fit at 200% text. `Toggle` and `Stepper` inherit that stacking, which detaches a checkbox's label from its box and leaves the stepper with no value. "Mark All Played" uses checkbox grammar for a one-off command.
- **Change:**
  - In `PodListSheetFormStyle`, exempt `Toggle` from the stacked label style and render it `.toggleStyle(.checkbox)` with its label trailing, as Settings › Automation already does (30).
  - In `ViewEditorScreen`, replace `Stepper("Last 7 days")` with `HStack { Text("Last"); TextField(value:format:).frame(width: 56); Stepper("", value:).labelsHidden(); Text("days") }`.
  - In `SubscriptionSettingsScreen`, replace the "Mark All Played" toggle with a "Mark All Played…" button that applies at once and is undoable through the existing edit history.
  - Keep the stacked labels for text fields and pop-ups, which is what the 200% text case needs.
- **Principle:** `conventions` (control shape tells people whether they're toggling or commanding), with `character` kept: the glossary, the explanatory copy and the glass footer are untouched.
- **Expected effect:** CTRL-01 passes, so the 6.9 cap on Consistency & polish lifts and that category rises by about 0.5–0.8. Platform fit Looks improves (L3), but the score stays at the 6.9 cap until WIN-03 is also fixed. Clarity improves slightly because the checkbox labels read as part of their controls. No category should regress. Re-capture 11, 16 and 22 in both appearances and at 200% Text Size to confirm long labels still wrap.
