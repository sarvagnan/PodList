# PodList for Mac — UI grade, round 2 (Opus)

Grader: Claude Opus 5.5, independent; no earlier grading report was opened.
Build: `apps/apple` at commit `548ae31`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`.
Evidence: `~/Documents/podlist-grading/mac-round-2/` (35 states × Light/Dark, PNG at 2× plus XCUITest `.txt` trees, `menus.txt`), and the source in `apps/apple/Sources`. Capture references below are `light/NN` or `dark/NN`; display coordinates are converted to points (pixels ÷ 2).

## Frame

- **Task:** find new Episodes through saved Views and the Library, queue them into Playlists (Play Now / Next / Last), and listen from the bottom player, with History and a Listening Timeline as the record and safety net.
- **Target:** Mac app (SwiftUI, macOS 26+), graded against Mac conventions.
- **Posture:** sovereign personal tool, used daily alongside other work.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things — a calm personal tool with a fixed vocabulary of concepts (Views, Playlists, Entries) — with BBEdit's forgiveness model as the second reference (Rewind preview, History, Trash).
- **Character (signature elements):**
  1. Brand blue `#2B50C8` / `#9DB1FF` accent on icons, links and tinted buttons *(owner-fixed)*.
  2. Capitalised domain vocabulary used as proper nouns: Episode, Entry, Playlist, View, Device, Position.
  3. Monogram artwork tiles ("MH", "DF") in pale accent wells.
  4. Bottom player bar in Liquid Glass with transport, Speed, Sleep and Active Playlist *(owner-fixed)*.
  5. Plain-spoken explanatory captions under consequential controls ("Deleted Playlists can be restored from Trash for 30 days.").
- **Owner decisions recorded:** brand accent instead of the system accent; transport in a bottom player bar; Settings › Appearance offers Light / Dark / follow macOS; no customizable toolbar; two-click arm-then-confirm Unsubscribe with undo; Liquid Glass on player bar, Inspector actions, Now Playing and View editor footer; Spotlight deliberately deferred; MCP off by default, App Intents on. These are graded and their caps stand, but none is chosen as the next target.

## Flows

- **Tasks run:** the repo's XCUITest tour (`apps/apple/UITour/PodListUITour.swift`), one scripted pass through 35 states: browse Views → select / multi-select Episodes → Inspector → Playlist Entries / History / Listening Timeline → Rewind preview → Playlist Settings / Rename / New Playlist → Trash → Search → View editor (edit and new) → Podcast page → Unsubscribe arm/disarm → Subscription Settings → Add to a Playlist → Add Podcasts → bulk Download Rules → Now Playing → Settings panes → Listening Stats → Getting Started.
- **Widths:** one size only, the default 1180 × 760 pt window. The minimum (760 × 500) and half-display widths were not run.
- **Appearances:** Light and Dark (app setting), each from a fresh identity.
- **Timed runs:** none. RESP-01 and FOOT-01/02 are N/O.
- **Measurements file:** none as such; the per-state `.txt` trees give every element's frame and were used as the measurement rows. No focus, causation-timing or scroll data, so this is a **partial flow run**: FLOW checks are scored where the frames or the code settle them.
- **Failures:**
  - **[FLOW-01]** Playlist page, "Play This Playlist" and the section control: `light/12` → `light/13` frame y 315.0 → 445.5 (**+130.5 pt**) when the person only opened New Playlist… (unprompted). The table's "Entry" header moves with it, y 351.0 → 611.5 (**+260.5 pt**, `light/10` → `light/13`). The same 130.5 pt drop happens on switching to History (`light/06` → `light/08`, `dark/08`), where the segmented control also moves 91 pt left (x 706 → 615) out from under the pointer. In every jumped state the "Playlist section" label's frame is **0.0 × 284.5 pt** (`light/08.txt`, `light/13.txt`): the label has been squeezed to zero width and its text stacked vertically, which makes the header row 284 pt tall. `dark/13` did not jump, so the layout is unstable rather than deterministic.
  - **[FLOW-02]** No status or error is announced to VoiceOver: `EditingFeedback` (`EpisodeEditingViews.swift:98`) changes its text silently; there is no `AccessibilityNotification` anywhere in `PodListUI`.
  - **[FLOW-06]** Listening Stats draws an empty chart frame with axis labels and a "Minutes" caption over no data (`light/31`).
  - **[FLOW-07]** "Play This Playlist" sits beside the segmented control on Entries and History (`light/06`, `light/08`) but flush trailing on Listening Timeline (`light/09`): frame x 1083.5 → 1393.5 (+310 pt).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View list (`02`) | Global strip under "Up to date", caption, secondary gray, past tense ("View edits cancelled.") | Same strip, red caption | none | "Undo ‹name›" button in the strip, plus Edit › Undo ‹name› | none shown | none | Row play glyph + toolbar Play Now (appears on selection) | View description line, secondary |
| Playlist Entries (`06`, `10`) | Global strip | Same strip | none | Strip + Edit menu | "This Playlist has no Entries." + Find Episodes (code) | none | "Play This Playlist", tinted, right of the section control | none |
| Playlist History (`08`) | Global strip | Same strip | none | Strip | Centred ContentUnavailableView, **pushed below the fold and clipped by the player bar** | none | "Play This Playlist", right of the control, which has dropped 130 pt | Empty-state body |
| Listening Timeline (`09`) | Global strip | Same strip | Rewind preview sheet (`34`) | Strip; "Rewind can be undone." | none observed | none | "Play This Playlist", **flush trailing** | none |
| Trash (`14`) | Global strip | — | none | Strip | Centred, "Trash Is Empty" / "Deleted Playlists can be restored here." | none | Restore per row (code) | Header caption on retention |
| Search (`15`) | Global strip | — | none | Strip | "No Matching Episodes" + Clear Search (code) | none | "Create View…", tinted, trailing above the table | "1 result" |
| Podcast page (`18`–`21`) | Global strip shows stale "View edits cancelled." | — | Armed red "Unsubscribe" in place | Strip | none | none | Subscribed / Unsubscribe toggle, tinted green → red | none |
| Subscriptions (`01`, `25`) | Global strip | — | none | Strip | "No Subscriptions" + Add Podcasts (code) | none | "Edit Download Rules…", trailing | "Grouped by Download Rule" |
| New Playlist sheet (`13`) | Strip inside the sheet | Red caption under the field, **shown before any typing** | none | Strip | — | Sheet | "Create Playlist", default, trailing; Cancel leading | none |
| Playlist Settings sheet (`11`, `12`) | Strip inside the sheet | Red caption under field | none | Strip | — | Sheet | "Done", **plain** (not default style), trailing; Rename has its own Cancel Rename / Save pair | Captions under Clear on Played and Delete |
| View editor sheet (`16`, `17`) | Strip in the glass footer, **stale "View edits cancelled." in New View** | Red caption under Name, shown before typing | none | Strip | — | Sheet | "Done", default, in a glass footer with Delete View leading | "6 matching Episodes" live count |
| Subscription Settings sheet (`22`) | Strip shows unrelated "View edits cancelled." | — | none | Strip | — | Sheet | "Done", **filled prominent**, trailing | "Default inherits the global Playback Settings." |
| Add to a Playlist sheet (`23`) | Strip shows unrelated "View edits cancelled." | Red caption (code) | none | Strip | — | Sheet | "Play Next", default, among Play Now / Play Last; Cancel leading | none |
| Add Podcasts sheet (`24`) | Strip shows unrelated "View edits cancelled." | Strip | none | Strip | "Find Your Next Podcast", **centred about 105 pt left of the sheet's centre** | Sheet | "Search" beside the field; "Done", plain, trailing | Example URL rendered as a live link |
| Download Rules sheet (`25`) | Strip shows unrelated "View edits cancelled." | — | none | — | — | Sheet | "Apply", default, trailing; Cancel leading | One-line explanation |

**Mismatches**
1. **One success message everywhere, forever.** `PlaylistEditingModel.status` is app-wide and never cleared; every sheet embeds the same strip, so "View edits cancelled." appears on the Podcast page and inside four unrelated sheets, twice on screen at once (`light/22`–`26`, `light/33`, `dark/18`). Screens: View editor, Podcast page, Subscription Settings, Add to a Playlist, Add Podcasts, Download Rules, New View.
2. **Sheet primary action styling varies:** Done is plain in Playlist Settings (`11`) and Add Podcasts (`24`), filled in Subscription Settings (`22`), gray-filled in the View editor footer (`16`).
3. **Error timing varies:** New Playlist and New View show red errors before the person has typed (`13`, `17`); Settings number fields show theirs only after invalid input (code, `LibrarySettingsScreens.swift:222`).
4. **Rename has three patterns:** inline field with Cancel Rename / Save (`12`), a Rename… button that swaps in a field (`16`), and a plain Name field (`17`).
5. **Empty-state placement varies:** centred in Trash and the Inspector (`14`, `02`), pushed below the fold and clipped in History (`08`), off-centre in Add Podcasts (`24`), absent in Listening Stats (`31`).
6. **Main action place on one page:** Play This Playlist moves between sections (FLOW-07 above).
7. **Same setting, two spellings:** "Skip intro" (Settings, `27`) vs "Skip Intro (seconds)" (Subscription Settings, `22`).
8. **Two blues:** selection uses the system accent (`#0064E1` light, `#0059D1` dark, measured) beside brand-blue `#2B50C8` sidebar symbols and buttons; Settings' pane selection and "Show Description" are system blue, other links and buttons brand blue (`light/02`, `dark/18`, `dark/27`).

## Checklist

Coverage: **95.9%** (142 of 148 applicable items have a verdict: **pass 122 · fail 20 · N/O 6 · N/A 19**; 167 IDs in total).

### Failures by severity

No blocker failures.

**Major**
- **[FLOW-01] Core elements jump on the Playlist page.** Evidence: Play This Playlist frame y 315.0 → 445.5 pt and the table header 351.0 → 611.5 pt between `light/12` and `light/13` with no Playlist interaction (unprompted), and the same jump on switching to History (`light/06` → `light/08`, `dark/08`), where the control also shifts 91 pt left. Root: in `PlaylistContentView.swift:18–25` the segmented `Picker` shows its own label ("Playlist section") inside an `HStack` with a `Spacer` and the trailing button; under some proposals the label is compressed to 0 pt wide and wraps to 284.5 pt tall (frame `(607, 315, 0.0, 284.5)` in `light/08.txt` and `light/13.txt`), so the whole header row grows and its controls centre in it. **Fix:** give the label a fixed size (`Text("Playlist section").fixedSize()` beside a `.labelsHidden()` picker), or hide it and keep the accessibility label; then add a 2 pt FLOW-01 assertion for this header across all three sections and sheet presentations to the tour.
- **[FLOW-02] Status and errors are never announced.** Evidence: `EditingFeedback` (`EpisodeEditingViews.swift:98–121`) and `LibraryFeedback` only change text; no `AccessibilityNotification.Announcement` in `PodListUI`. A VoiceOver user doesn't hear "Unsubscribed from Market Hours" or an edit failure. **Fix:** post an announcement when `status` or `error` changes (polite priority for status, high for errors).
- **[KEY-03] Every custom shortcut uses Control.** Evidence: `KeyboardShortcuts.swift:47` — Star ⌃⌘S, Mark Played ⌃⌘U, Play Next ⌃⌘J, Play Last ⌃⌘K, Add to a Playlist ⌃⌘P, Now Playing ⌃⌘↩, Playlist Settings ⌃⌘,, Edit View ⌃⌘E, chapters ⌃⌘←/→, Download ⌃⇧⌘D. The checklist asks for Command first with Shift variants and Control avoided for custom bindings. **Fix:** rebind the frequent Episode commands (Star, Mark Played, Play Next, Play Last, Add to a Playlist) to ⌘ or ⇧⌘ letters the standard-shortcut table leaves free in a non-text app, keep ⌥ for rarer ones, and use ⌃ only where nothing else is free; update the Help table to match.
- **[KEY-04] Rename… doesn't focus its field.** Evidence: `light/12`, `dark/12` show the focus ring on the Clear on Played checkbox after Rename…; `PlaylistSettingsViews.swift:121` sets `focused = true` in the same action that creates the `TextField`, before it exists. **Fix:** set focus in `.onChange(of: renaming)` or a `.task(id: renaming)` once the field is in the hierarchy, and select its text.
- **[CTRL-04] Number fields collapse and errors fire early.** Evidence: Minimum / Maximum length fields render about 10–20 pt wide with a clipped "N…" placeholder and their label duplicated beside the form label (`light/16`, `light/17`, `dark/16`); Skip intro / Skip outro in Settings render about 12 pt wide, empty, with "Skip intro Skip intro" (`light/27`, `dark/27`). New Playlist and New View show red "Enter a … name." before any input (`light/13`, `light/17`). Cause: `TextField(label, …)` inside `LabeledContent` in a `.columns` form (`LibrarySettingsScreens.swift:212–219`, `ViewEditorScreen.swift:97–98`). **Fix:** use `TextField("", …)` with `.labelsHidden()` (keeping the accessibility label) and a `.frame(minWidth: 72)` that the column layout respects; show the empty-name error only after the first submit or blur.
- **[APPEAR-04] Control labels fail contrast.** Measured from the captures (max-contrast glyph pixel vs dominant background): Dark selected segment "Entries" white on `#9FB3FF` **2.03:1** (`dark/06`); "Subscribed" green on its tint **2.13:1** (`light/18`); armed "Unsubscribe" red **3.34:1** (`light/20`); red error captions **3.57:1** (`light/13`, `light/17`). System-supplied secondary text also measures 3.95:1 in Light (`#808080` on white: row podcast names, view description, Timeline dates, "Up to date", `light/02`, `light/09`) and sidebar section headers about 2.2:1 in both appearances; these are system colors and recorded, not the target. **Fix:** give the selected segment the `podListOnAccent` dark glyph (or a darker Dark fill) so it reaches 4.5:1; put the Subscribed state in labelColor text with a green symbol; use a darker red (`#C4161C`-range in Light) for error and armed text.
- **[APPEAR-02] Controls and sidebar symbols ignore the user's accent** *(owner decision)*. Evidence: brand `#2B50C8` on sidebar symbols, segmented selection, tinted buttons and row glyphs (`light/02`, `light/06`); selection itself does follow the system accent. Not the target.
- **[WIN-03] Content clipped at the default window size.** Evidence: History's empty-state body runs under the player bar and is cut off at "History." (`light/08`, `dark/08`); Now Playing's "Episode Details" is cut by its glass footer (`light/26`). **Fix:** the FLOW-01 label fix (the 284 pt header is what pushes the empty state down), plus bottom content insets equal to the player bar height in the History empty state, and a scroll inset under the Now Playing footer.
- **[WIN-05] Transport controls sit at the window's bottom edge** *(owner decision)*. Evidence: player bar at the bottom of every capture. Controls menu duplicates them with shortcuts, which softens it. Not the target.
- **[DLG-08] Now Playing is a sheet.** Evidence: `light/26` — the library window is blocked while Now Playing (artwork, chapters, Speed, Sleep) is open; `MacWindow.swift:217`. Watching chapters while browsing is an input-and-observe task. **Fix:** present Now Playing as a separate `Window` scene or a utility panel (or an inspector mode) that leaves the library usable.
- **[SYS-05] No Spotlight indexing** *(owner decision: deferred)*. Not the target.

**Minor**
- **[FLOW-06]** Empty chart with axes and "Minutes" over no data (`light/31`). Fix: show "No listening yet" in the chart's place until there is data.
- **[FLOW-07]** Play This Playlist changes place between sections (`light/06` vs `light/09`). Fix: keep it beside the segmented control in all three sections.
- **[APPEAR-11]** Contradictory and stale status: "Edit Download Rules for 4 Subscriptions…" while the sheet says "Download Rules for 3 Subscriptions" — ⌘A selected the "Stream" section header row (`light/25.txt` line 70, header `selected=true`); stale "View edits cancelled." across screens and sheets (mismatch 1). Fix: make section headers unselectable and count only Subscription IDs; clear `status` on navigation and when a sheet opens, and keep sheet strips for that sheet's own edits.
- **[COPY-03]** The Add Podcasts example `https://example.com/podcast.xml` is a live link to a placeholder site (`light/24`). Fix: render it as code-styled text that fills the field on click.
- **[COPY-04]** Capitalization mixed within forms: "Minimum length" beside "In a Playlist", "All Conditions Must Match", "Newest First" (`light/16`); "Skip intro", "Server address" beside "Text Size", "Volume Boost", "Keep Playlists in Trash" (`light/27`); "Skip intro" vs "Skip Intro (seconds)" (`light/22`). Fix: title-style for all form labels, matching the menus.
- **[MENU-04]** Noun-only commands: Playlist › "Trash", Views › "All Views", Controls › "Now Playing"; Playlist menu starts with a separator and a disabled "Section" label (`menus.txt`). Fix: "Show Trash", "Show All Views", "Show Now Playing"; drop the leading separator and label the picker group by its items alone.
- **[VIEW-02]** View › "Show Sidebar" while the sidebar is visible (`menus.txt`, captured at state 33 where the sidebar is shown; the toolbar button correctly reads "Hide Sidebar"). Possibly a `SidebarCommands` validation gap; verify live. Fix: ensure the split view's `toggleSidebar:` validation reaches the key window.
- **[SYS-03]** No URL scheme or universal links for Views, Playlists or Episodes; share links point to publisher pages only (`ShareLinks.swift`). Fix: a `podlist://` scheme for Views, Playlists and Episodes.
- **[SYS-06]** No Share or Safari extension to subscribe from a podcast's web page; dropping a feed URL onto the window (`MacWindow.swift:181`) is the only handoff. Fix: a Share extension accepting a URL that opens Add Podcasts.

### N/O
RESP-01, FOOT-01, FOOT-02, WIN-10, TOOL-02, SIDE-06.

### N/A
FILE-02, FILE-05, FMT-02, DATA-02, DATA-03, DATA-08 (no documents or formatted text); DLG-09 (no popovers); CTRL-02 (no checkbox hierarchy); LIST-05 (no disclosure outlines); MENU-06 (no app modifier alternates); START-04, START-05 (no permission prompts); START-07 (no account creation); SYS-02 (no selection Services worth vending); SYS-07 (Dock state not meaningful for this task); EXTRA-01–04 (no menu bar extra).

<details>
<summary>Pass ledger: every remaining ID, with evidence</summary>

| IDs | Evidence |
|---|---|
| FLOW-03 | Number fields keep the typed string while focused (`LibrarySettingsScreens.swift:209–226`); the View editor only replaces its draft when there is no unapplied draft and no field problem (`ViewEditorScreen.swift` `.onChange(of: library.state.views)`). |
| FLOW-04 | Undo and errors appear in the strip at the top of content or inline in the sheet, never under the player bar or toolbar (`light/02`, `light/13`). |
| FLOW-05 | Sidebar, content and Inspector all start at the toolbar's bottom edge (y=242 in every `.txt`). |
| KEY-01 | Every command is in the menu bar with standard controls; sidebar, tables and sheets are native (code); not verified live with Full Keyboard Access. |
| KEY-02 | Standard shortcuts keep their meanings; ⌘. stops playback outside sheets and cancels inside them (`PlaybackCommands.swift:63–66`, guard). |
| KEY-05, KEY-06 | ⌃⇧⌘ order in Help and menus (`KeyboardShortcuts.swift:56`); letter and arrow keys only. |
| KEY-07 | Space is the documented play key (Help window); text editing keeps Space and ⌘←/→ (`PlaybackKeyboardGuard`). |
| KEY-08 | PodList Help window lists every shortcut (`ConnectionViews.swift:80–100`). |
| MENU-01–03, MENU-05 | Order PodList · File · Edit · View · Podcast · Views · Controls · Episode · Playlist · Window · Help; every toolbar, context-menu and keyboard command has a menu item; unavailable items dim; Play/Pause, Star/Unstar, Mark Played/Unplayed, Subscribe/Unsubscribe titles track state; one submenu level (`menus.txt`). |
| APP-01–04 | About, Settings… ⌘, opening a pane-toolbar Settings window, Services (system), Hide / Hide Others / Show All / Quit (`menus.txt`, `light/27`). |
| FILE-01, FILE-03, FILE-04 | New View… ⌘N, New Window, Close ⌘W, Close All, Export OPML… with a save panel defaulting to "PodList.opml" (`LibraryCommands.swift`, `LibrarySettingsScreens.swift:303`). |
| EDIT-01–05 | Named Undo/Redo heading Edit, backed by one app-wide history covering Playlist and Library edits (`EpisodeEditingViews.swift:173–180`, `LibraryEditingModel.swift:195–221`); standard Cut/Copy/Paste/Delete/Select All; Find, Spelling, Substitutions, Transformations, Speech, Dictation, Emoji; Copy writes title text plus URL (`SelectionCommands.swift:50–70`). |
| FMT-01 | No formatted-text editing; Format omitted. |
| VIEW-01 | View has Tab Bar, Sidebar, Bigger/Smaller/Actual Size, Inspector, Enter Full Screen. |
| WMENU-01–03 | Minimize, Zoom, Bring All to Front, window list (`menus.txt`). |
| HELP-01, HELP-02 | Help search field plus "PodList Help" opening real task help (`ConnectionViews.swift:69`). |
| TEXT-01, TEXT-02 | Native fields; the key guard hands events to `interpretKeyEvents`, keeping user bindings. |
| WIN-01, WIN-02, WIN-04, WIN-06–09 | System title bar and traffic lights; focused table blue, unfocused sidebar gray (`light/03`, `light/07`); titles "Subscriptions", "New this week"; native full screen; New Window and Open in New Window; standard title-bar dragging. |
| TOOL-01, TOOL-03–06 | Sidebar toggle leading, title/subtitle, trailing actions and search; two glass groups plus search; borderless symbols, no prominent item; every toolbar action has a menu item (owner: no customization). |
| SIDE-01–05 | Leading sidebar visible by default, two levels, toolbar + View menu toggle, persistent highlight, thin divider. |
| SET-01–05 | One Settings window with General / Automation panes, title matches the pane, minimise/zoom dimmed (`light/27`, `light/30`); changes apply live; Appearance includes follow macOS and defaults to System (`MacAppearance.swift:69`); pane kept while the app runs. |
| SET-06 | SwiftUI `Settings` scene is not restored on relaunch. |
| DLG-01–07 | Only the Rewind preview confirms, and it previews a multi-part change (`light/34`); specific sheet titles; Cancel leading, default trailing, Esc and ⌘. cancel; sheets one at a time (Rename is inline). |
| CTRL-01, CTRL-03, CTRL-05–08 | Pop-ups, checkboxes, segmented control with Mac semantics (brand-tinted but recognisable); labels persist; native buttons; "Episode Actions" pull-down groups related items while Play Now and Add stay outside; search prompt names its scope ("Search this list", "Search Episodes", "Search Library"); OPML import shows "Importing n of m". |
| LIST-01–04, LIST-06, LIST-07 | Tables for Episodes and Entries with noun headings; click-to-sort and resizable columns in Views (`MacWindow.swift:452`); separators instead of stripes; persistent selection; `contextMenu(forSelectionType:primaryAction:)` opens on Return/double-click. |
| DATA-01, DATA-04–07 | Drafts persist for every sheet (`PlaylistDrafts`); multi-step named undo, with "Undone: name" in the strip; window context in `@SceneStorage` and Inspector visibility in `@AppStorage`; system open/save panels. |
| DRAG-01–07 | Rows drag as private type, URL and title text; drops on sidebar Playlists add (Play Last) and are undoable; same-Playlist drops reorder; feed URLs and OPML files drop onto the window; native List/Table drag cues (`EpisodeTransfer.swift`, `PlaylistContentView.swift:63–77`). |
| PTR-01–05 | Context menus on Episode rows, Entries, sidebar items and Subscriptions, targeting the clicked row without moving selection; no shortcuts shown; tooltips on icon buttons. |
| APPEAR-01, APPEAR-03, APPEAR-05–10 | Light / Dark / System live; Increase Contrast accent variants and opaque fallbacks for custom glass (`MacAppearance.swift`, `MacGlass.swift`); no custom motion; glass only on control surfaces; SF Symbols; controls distinct from content. |
| TYPE-01–03, TYPE-05–08 | Semantic text styles through `macContentFont`; Regular–Bold; system font; legible leading; short measures; no all caps; curly quotes, ellipsis character, true minus "−16:34". |
| TYPE-04 | Native control sizes; the collapsed number fields are charged once under CTRL-04. |
| COPY-01, COPY-02 | Specific verbs ("Play This Playlist", "Rewind", "Create Playlist"); errors sit under their field and say what to do. |
| AX-01–05 | Icon buttons carry labels and help (`PlayerViews.swift`, `EpisodeEditingViews.swift:83–93`); state is text ("In progress", "Clear on Played on"); 100–200% text size with list layouts at larger sizes (`MacTextSize.swift`); every command has a menu route; playback has explicit controls and never autoplays. |
| START-01–03, START-06 | "Opening Library…" placeholder; Getting Started is dismissible and reopenable from Settings (`light/32`); standalone Library without an account. |
| SYS-01, SYS-04 | App Intents and App Shortcuts for play, pause, add, mark, search (`AppIntents.swift`); system `ShareLink`. |

</details>

## Scores

Appearances match except where noted; the lowest value sets each limit.

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.4** | Semantic styles applied consistently, title/subtitle and row title + secondary podcast caption read well (`light/02`), tabular digits in time columns. Held in Competent by hierarchy that type doesn't carry outside the main list: Settings section titles ("Playback Settings", "Trash", "Library") are body text in the value column, indistinguishable from labels (`light/27`); the Inspector empty state puts a gray semibold title over larger black body text (`light/02`); Listening Stats repeats its window title as a Large Title (`light/31`); duplicated field labels (`light/16`). | `hierarchy`, `craft` |
| Hierarchy | **5.5** | Content leads in the list–detail layout, but chrome competes: two tinted glyphs on every Episode row plus a toolbar that grows by three items on selection (`light/02` → `light/03`); a tinted "Rewind to Here" on every Timeline row (`light/09`); four tinted buttons and a tinted pop-up on the Podcast page (`light/18`); a ~60 pt band of sync line and empty status strip above every list. Settings is a flat stack of six tinted buttons among the options (`light/27`). Matches the Competent anchor ("secondary chrome competes"). | `content-first`, `hierarchy` |
| Spacing & density | **5.3** | One gutter and consistent row rhythm in tables (46 pt two-line, 37 pt single-line). Lower-Competent because of the empty reserved strip on every screen, "Keep Playlists in Trash" running to 6 pt from the Settings window edge (`light/27`), collapsed number fields, the History control floating 130 pt down (`light/08`), the Add Podcasts empty state about 105 pt off-centre (`light/24`), and list densities that differ by screen (All Views ~20 pt rows vs 46 pt tables, `light/05`). | `craft`, `hierarchy` |
| Color & contrast | **5.0** | Dark mode, Increase Contrast accent variants and opaque glass fallbacks are designed. APPEAR-04 (major) and APPEAR-02 (owner, major) cap at 6.9; the measured 2.03:1 selected segment in Dark and 2.13:1 "Subscribed" are control labels, and the window shows two competing blues (system selection `#0064E1` beside brand `#2B50C8`). Bottom of Competent: contrast doesn't pass everywhere a person acts. | `color-restraint`, `accessibility` |
| Iconography | **6.7** | SF Symbols throughout with tooltips and labels; standard glyphs for share, star, download, trash. Some meanings are a stretch: filled vs outline eraser as Clear on Played on/off in the sidebar (`light/01`), `text.badge.plus` repeated on every row, one identical filter glyph for every View. Upper Competent. | `conventions`, `plain-language` |
| Consistency & polish | **4.4** (stability **4.6**, partial: untimed XCUITest tour) | CTRL-04 (major) caps at 6.9, and the stability sub-score (Weak) limits the category to 4.9. Stability: the Playlist header and main action jump 130.5 pt unprompted (`light/12` → `light/13`), statuses are never announced, and mismatch 1 puts one stale message in every sheet. Polish: collapsed fields, the "4 Subscriptions" vs "3" contradiction (`light/25`), content clipped under the player and Now Playing footer, the Inspector showing one Episode while "6 selected" (`light/33`), Done styled three ways. | `craft`, `stability` |
| Clarity | **5.6** | Vocabulary is precise and state is visible (Current Entry, Active Playlist speaker, counts, "Position 22:00", Rewind preview that lists exactly what changes, `light/34`). Pulled down by stale and contradictory messages (mismatch 1, `light/25`), multi-selection with a single-Episode Inspector (`light/33`), "OPML import is in Settings" when File › Import OPML… exists (`light/24`), and Settings mixing commands (Listening Stats, Getting Started, Choose a File…) with options. COPY-03/04 are minor and cap nothing. | `plain-language`, `feedback` |
| Platform fit | **6.9** | Looks 6.8: native window, sidebar, toolbar, pane-toolbar Settings, SF Symbols; foreign-leaning: brand-tinted pop-ups, bottom transport bar, Now Playing as a sheet. Behaves 7.3: complete menu bar with app menus, named Undo, context menus, rich drag and drop, Open in New Window, state restoration, App Intents, real Help. Formula (6.8 + 2 × 7.3) ÷ 3 = 7.1, capped at **6.9** by WIN-03, DLG-08, and the owner-decided WIN-05 and SYS-05. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **6.3** (partial: no timed runs) | One app-wide, named, multi-step undo covering Playlist and Library edits; Undo in the status strip; drag and drop with menu equivalents; Rewind preview; Space plays. KEY-03 and KEY-04 (major) cap at 6.9; the Control-chord shortcut set and the Rename focus miss keep it mid-Competent, and nothing tells VoiceOver users an action finished (FLOW-02). | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **5.4** | It serves the primary task: Views find Episodes, queuing has three clear placements, and every edit can be undone. It doesn't yet feel finished next to Things: the Playlist page moves under the person, one stale message follows them into every sheet, fields collapse in the two most-edited forms, and custom shortcuts use Control chords. Lowest category 4.4, so the cap is 6.4; 5.4 holistically. The weakness holding Overall down most is Consistency & polish. | `stability`, `craft` |

## What stands between this build and 9.0

Every category needs to reach the Exemplary band, so in order of weight:

1. **Stability (caps Consistency at 4.9 today).** Fix the Playlist header's collapsing label (FLOW-01); scope status messages to the screen or sheet that produced them and clear them on navigation (APPEAR-11, mismatch 1); announce status and errors (FLOW-02); keep Play This Playlist in one place (FLOW-07). Add FLOW-01 assertions for the header, toolbar and main actions to the tour, and run it at 760 × 500 and half-display widths as well.
2. **Forms.** Fix the collapsed number fields and duplicated labels in Settings and the View editor, defer empty-name errors until submit, and give Settings real section headers (CTRL-04, COPY-04, Typography).
3. **Contrast.** Fix the Dark selected-segment glyph, the Subscribed and armed-Unsubscribe labels and error red (APPEAR-04); reconcile the two blues so selection and brand don't sit side by side as near-matches.
4. **Keyboard.** Move frequent custom shortcuts off ⌃⌘ (KEY-03) and focus fields that a command opens (KEY-04).
5. **Windows.** Make Now Playing modeless (DLG-08), and keep empty states and sheet content clear of the player bar and glass footers (WIN-03).
6. **Hierarchy.** Fewer tinted controls per row and per page: show row glyphs on hover or selection, make "Rewind to Here" a row context-menu and selection command, and move Listening Stats and Getting Started out of Settings into Window and Help.
7. **Owner-decided caps** (APPEAR-02, WIN-05, SYS-05) still hold Color & contrast and Platform fit at 6.9 whatever else changes. With them kept, Overall can't reach 9.0, because those two categories can't exceed 6.9 and Overall is capped at 2.0 above the lowest. Shipping Spotlight (already approved, deferred) removes one of the three.

## Next step

- **Target:** FLOW-01, a major failure feeding the lowest-scoring category (Consistency & polish, 4.4), on the Playlist page in the primary task. (No blocker exists; CTRL-04 is the other major failure in this category but sits in less frequent forms.)
- **Anti-pattern:** none in `anti-patterns.md` fits exactly; the nearest is the stability failure the rubric's Broken stability anchor describes, "the screen moves under the person during the main task".
- **Root cause:** the segmented `Picker` renders its own "Playlist section" label inside a flexible `HStack` (`PlaylistContentView.swift:18–25`). When the proposal tightens — on the History section, or when a sheet re-lays out the window — the label is compressed to 0 pt wide and wraps to 284.5 pt tall (`light/08.txt`, `light/13.txt`), so the header row grows and its controls drop 130.5 pt. The controls aren't the problem; the unprotected label sizes the row.
- **Change:** render the label as `Text("Playlist section").fixedSize()` and the picker with `.labelsHidden()` (accessibility label kept), so the header row is always one control high: Play This Playlist stays at y 315 pt and the section control at x 706 pt in every section and through every sheet. Keep Play This Playlist in that row on Listening Timeline too (closes FLOW-07).
- **Principle:** `stability`.
- **Expected effect:** FLOW-01 passes on re-run; the History clipping (WIN-03) clears with it; the stability sub-score rises toward Competent (still limited by FLOW-02 and mismatch 1 until those are fixed), lifting Consistency & polish; Spacing & density improves; no signature element is touched.
