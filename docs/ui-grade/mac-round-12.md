# PodList Mac — UI grade, round 12 (Opus)

Build: `apps/apple` at commit `0652f0b`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. Evidence: `~/Documents/podlist-grading/mac-round-12/` (35 states × Light and Dark, accessibility snapshots, `menus.txt`) and the source code. The app was not launched. No computer-use tools were used. Earlier grading reports were not opened.

Capture references below use `L03` for `light/03-episode-inspector.png` and its `.txt`, `D20` for `dark/20-unsubscribe-armed.png`, and so on. Points are pixels ÷ 2. Code paths are relative to `apps/apple/Sources/`.

## Frame

- **Task:** keep up with podcasts: find Episodes through saved Views, put them into ordered Playlists and play them, with the Library and Playlists safe to change and undo.
- **Target:** Mac app (SwiftUI, macOS 26+), captured on macOS 27.2.
- **Posture:** sovereign. It is a long-running library and player window, with transient auxiliary windows: Add Podcasts, Now Playing and Listening Stats.
- **Audience:** perpetual intermediate. There is a newcomer path through Getting Started, and shortcut depth for experts.
- **Nearest exemplar:** Things. It is a calm personal list tool with a source list, a list and a detail pane, and the same plain-spoken copy. PodList is denser, because it is a table of media.
- **Character:**
  1. Initials artwork tiles in the brand blue: `MH`, `DF`, `SB` (L01, L03).
  2. Capitalised domain nouns (Episode, Playlist, Entry, Position, Device) in plain explanatory copy (L08, L11).
  3. The quiet "Up to date" sync line at the top of every list (L01–L18).
  4. A per-row Add/Play glyph pair, and a "Current Entry" marker in Playlists (L02, L06).
  5. Liquid Glass on the bottom player bar and the Inspector action strip. This is owner-fixed.
- **Owner decisions recorded:**
  - The AccentColor is the brand blue, so it shows only under Multicolor (owner-fixed).
  - Transport lives in a bottom player bar (owner-fixed).
  - Appearance offers Light, Dark and System (owner-fixed).
  - There is no customizable toolbar (owner-fixed).
  - Unsubscribe takes two clicks (owner-fixed).
  - Liquid Glass is used on the player bar, Inspector actions, Now Playing and the View editor footer (owner-fixed).
  - Spotlight is deferred (owner-fixed).
  - MCP is off by default and App Intents are on (owner-fixed).
  - These are graded below, and any caps they cause stand. They are not proposed as targets.

## Flows

- **Tasks:** a scripted XCUITest tour (`apps/apple/UITour/PodListUITour.swift`) visits 35 states in Light and Dark at one window size, 1180 × 760 pt.
  - It records a screenshot and an accessibility tree per state.
  - It does not record per-step element boxes, focus, scroll, or timings. It has no delayed completions and no timed passes.
  - Only one window size was captured: not the minimum size, and not half the display.
- **Result:** this is a screenshot set, not a flow run as CRITIQUE § Flow run defines it. FLOW-01, FLOW-02, FLOW-03, RESP-01, RESP-02 and FOOT-02 are N/O. The stability sub-score is N/O, and Consistency & polish is marked "(partial: no flow run)".
- **Failures:** none can be recorded without a measurements file.
- **Observed between captures, for context only:**
  - Core elements hold their frames across L02 → L03 → L33. The Episode table header stays at y 307 pt and the toolbar does not move.
  - Playlist screens reserve a band above the table for feedback (`LibraryFeedback(reservesSpace: isPlaylist)`, `PodListUI/MacWindow.swift`), so notices should not push the list.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / Search (L02, L15) | Feedback row under the sync line, sentence (for example "Added 1 Episode…"), no color. Expires after 5 s. | Inline `FailureFeedback`: red text plus Retry in the same row. Sync errors replace "Up to date". | none | Undo button in the feedback row; Edit › Undo ⟨name⟩ | `ContentUnavailableView`, centered: title, grey line, action button (Edit View…, Clear Search) | none | Row Play glyph; toolbar Play / Add group, trailing | Filter description line above the table ("Published in the last 7 days · Unplayed…") |
| Playlist Entries (L06) | Same feedback row, with space reserved | Same; failed drops show a row placeholder with Retry and Remove | none | Same | Centered, with action | none | Toolbar Play This Playlist; row Play glyph | none |
| History / Timeline (L08, L09) | Same | Same | Rewind sheet (L34) | Same; Rewind is undoable | Centered, text only ("No History…") | none | "Rewind to Here" bordered button on every row | none |
| Subscriptions (L01, L25) | Same | Same | none | Same | Centered, "No Subscriptions" plus "Add Podcasts" button. Description mentions Search even when none is active | none | "Edit Download Rules…", top trailing | "Grouped by Download Rule" line |
| Podcast page (L18–L21) | Same | Same | Armed Unsubscribe in place, red, disarms after 4 s | Same | "Reading Episodes…" / empty with Refresh | none | Subscribed / Unsubscribe button in the header row | "Show Description" link |
| Trash (L14) | Same | Same | Delete Permanently confirmation dialog | Same | Centered, text only | none | (row context menu: Restore) | One-line description at the top, inset 4 pt off the column |
| Object sheets (L11, L16, L22, L23, L25) | Sheet closes; feedback row in the window | Field-level validation | none | Edit › Undo ⟨Playlist Settings / View edit⟩ | n/a | sheet | Trailing default button in a glass footer | Paragraphs above the footer explaining Save, Cancel and Delete |
| Add Podcasts window (L24) | Result row state | Inline under the field | none | Edit › Undo Subscribe | Centered, but centred about 100 pt left of the window's centre | none | "Search" beside the field; "Close" is the tinted default | Caption under the field about OPML import |
| Settings (L27–L30) | Live apply, no message | Inline | none | Edit › Undo ⟨setting⟩ | n/a | none | n/a | Caption rows inside groups |
| Now Playing (L26) | n/a | Retry Playback | none | n/a | n/a | none | Transport capsule, centre | none |

**Mismatches:**

1. **Empty-state wording.** "No Subscriptions" tells people to "clear Search" when no search is active (`PodListUI/MacWindow.swift:358-359`). Other empty states are specific to their state. Screens: Subscriptions vs Views and Search.
2. **Add Podcasts naming.** It is "Add Podcasts…" in the sidebar, the File menu and Getting Started, but "Add Podcasts" with no ellipsis on the Subscriptions empty-state button (`MacWindow.swift:360`). It opens the same window.
3. **Where help text sits.**
   - A top description line in Trash (L14).
   - Paragraphs mid-sheet in Playlist Settings and Subscription Settings (L11, L22).
   - A caption under the field in Add Podcasts (L24).
   - A row inside a group in Settings (L27).
   - The same kind of guidance appears in four places.
4. **Selection count in the subtitle.** Episode and Entry lists show "· 1 selected" (L03, L33). Subscriptions with 3 selected still shows "3 Subscriptions" (L25).
5. **Commit models inside one sheet.**
   - Subscription Settings mixes an immediate "Mark All Played" with Save/Cancel settings (L22).
   - Playlist Settings mixes an immediate "Delete Playlist" with Save/Cancel, plus a nested Save Name / Cancel Rename step (L11, L12).
   - Edit View repeats the nested Rename step (L16).
   - New View and New Playlist use a plain field (L13, L17).
6. **Row action glyph color differs by appearance.** It is the accent blue in Light (L02) and primary white in Dark (D03). This is a deliberate contrast fallback (`MacRowAccentStyle`), but the same control changes meaning cue between appearances.
7. **Window title vs sidebar label.** The window is titled "Views – 3 Views" (L05) while the sidebar item is "All Views".

## Checklist

**Coverage: 89.7%** (pass 120 · fail 11 · N/O 15 · N/A 22). Applicable = 146 (pass + fail + N/O), and 131 of them have a pass or fail verdict. That is 168 IDs: 80 core and 88 Mac.

### Failures by severity

**Blocker**

- **[MENU-02] A content command has no menu-bar equivalent.**
  - A failed Episode drop shows a per-row **Remove** button (`PodListUI/PlaylistContentView.swift:150`, "Remove this failed Episode drop").
  - The menu bar offers only **Episode › Retry Failed Episode Drop** (`PodListUI/MenuCommandActions.swift:21, 27, 112-117`).
  - Nothing in the menu bar, and no Delete key route, removes a failed placeholder. `onDeleteCommand` acts only on Entries (`PlaylistContentView.swift:132-135`).
  - The menu index deliberately treats the tutorial Dismiss and sheet buttons as dialog submissions (`MenuCommandActions.swift:33-37`). That is fine. This one is a row command on Library content, not a dialog button.
  - Everything else checks out: every other context-menu, toolbar, Inspector, Now Playing and podcast-page command has a menu item (menus.txt; Episode, Playlist, Podcast and Controls menus).
  - **Fix:** add `MenuAction.removeEpisodeDrop = "Remove Failed Episode Drops"` with `menu: .episode`, published from `episodeDrops(_:)` next to Retry. Where a placeholder row is selected, also let ⌫ / ⌘⌫ remove it.

**Major**

- **[TYPE-04] The Inspector action strip has glyph-sized hit regions.**
  - Accessibility frames in L03 and L07:

    | Button | Frame (pt) |
    |---|---|
    | "Add to a Playlist" | 11 × 10.5 |
    | "Star" | 12.5 × 11.5 |
    | "Mark Played" | 11 × 11 |
    | "Download" | 11 × 11 |
    | "Share Episode" | 10 × 13 |
    | "Resume in Commute at 22:00" | 13 × 13 |

  - Those are far below the 20 × 20 pt minimum. The visible slots are about 30 pt apart.
  - The code wraps `Image(...).frame(width: 28, height: 28)` in `.buttonStyle(.borderless)` with no `contentShape` (`PodListUI/EpisodeInspector.swift:184, 196-198, 104-106, 124-126`).
  - The row buttons use `MacIconLabel`, whose comment says `.contentShape(Rectangle())` is what expands the hit region (`PodListUI/MacIconLabel.swift:4-13`). They report 28 × 28 frames (L03 `.txt`).
  - Clicking between glyphs in the strip most likely misses. This could not be click-tested; the inference rests on the AX frames and the code.
  - **Fix:** build `icon(...)`, the Share label, the Resume buttons and the Chapter buttons on `MacIconLabel` (or add `.contentShape(Rectangle())` after the 28 pt frame). Keep the glass strip as it is.
- **[WIN-05] Transport controls sit in a bottom bar (owner decision; graded, not a target).**
  - The player bar spans the window's bottom edge at y ≈ 872–924 pt. It holds Play, ±15/30 s, seek, Speed, Sleep and Active Playlist (L01 `.txt`, "Player" group).
  - WIN-05 limits bottom bars to limited status.
  - Menu (Controls) and Space equivalents exist, which softens the effect, but the cap on Platform fit stands.
- **[SYS-05] Library content is not indexed in Spotlight (owner decision: deferred; graded, not a target).**
  - No CoreSpotlight code exists (searched `Sources/`).
  - Episodes and Podcasts are searchable app content.

**Minor**

- **[TYPE-06] Show notes read at about 33 characters per line.**
  - The Inspector's reading text sits at its ideal width: the notes frame is 191.5 pt wide (L03 `.txt`, "Show notes" text). That gives about 30–35 characters per line, below the 45-character floor, at the default window size.
  - **Fix:** raise the ideal Inspector width to about 340 pt, or give show notes a "Show in Window" reading view at a 60–70 character measure.
- **[PTR-04] Some icon-only buttons have no tooltip.**
  - The Podcast page gear "Subscription Settings…" is `.labelStyle(.iconOnly)` with no `.help` (`PodListUI/PodcastScreens.swift:150`; L18).
  - **Fix:** add `.help("Subscription Settings")`.
- **[COPY-03] One empty state gives a wrong next step.**
  - "No Subscriptions" says "Search by name or feed address, or clear Search." even when no search is active (`MacWindow.swift:358-359`).
  - **Fix:** show the Search clause only for "No Matching Subscriptions", and say "Add podcasts to see them here." otherwise.
- **[COPY-04] Some tooltips and undo names break length and capitalization rules.**
  - The tooltip "Retry adding this Episode; use Episode › Retry Failed Episode Drop to retry all" is 81 characters (`PlaylistContentView.swift:149`). Dynamic "Add ⟨title⟩ to a Playlist" and "Play Now: ⟨title⟩" tooltips also exceed 75 with long titles (`MacWindow.swift:583, 588`).
  - Undo names mix case: "View edit" and "Library edit" (`PodListUI/LibraryEditingModel.swift:169, 184`; `ApplicationModel.swift:432`) next to "Move Entries" and "Playlist Settings".
  - **Fix:** use "Retry adding this Episode". Make row tooltips the bare action ("Add to a Playlist"), since the title is in the AX label. Rename the undo steps to "Edit View" and "Library Change".
- **[START-03] Closing Getting Started does not dismiss it.**
  - Opening Help › Getting Started sets `showGettingStarted = true` permanently (`PodListUI/LibrarySettingsScreens.swift:299`).
  - Closing that window with its close button never clears the flag. The inline Getting Started panel then reappears at the top of the first View in the Library window (`MacWindow.swift:128`; `LibraryEditingModel.swift:104-113`) until Dismiss is clicked there.
  - **Fix:** in `GettingStartedWindow`, set `showGettingStarted = false` in `.onDisappear`. Or don't tie the window to the inline flag at all.
- **[SYS-03] Library content has no app links.**
  - There is no URL scheme or `onOpenURL` for Episodes, Playlists or Views. Only `.opml` files open (`PodListMac/PodListMac.swift:42-46`; the Info.plist heredoc in `apps/apple/scripts/build-mac-app.sh` has no `CFBundleURLTypes`).
  - Shared links are web URLs, not links back into the app.
  - **Fix:** add a `podlist://` scheme that resolves the existing `WindowDestination` values, and an Episode/Playlist "Copy PodList Link".
- **[SYS-06] Podcasts can't be sent to PodList from other apps.**
  - There is no way to send a feed or podcast page from Safari or another app, apart from dragging the URL onto the window: no Share extension and no Services provider.
  - **Fix:** a Share extension, or an NSServices "Subscribe in PodList" for selected URLs. Either can reuse the existing `LibraryDrops` staging.

### N/O

FLOW-01, FLOW-02, FLOW-03, RESP-01, RESP-02, FOOT-02, FOOT-01, DATA-05, DATA-07, DRAG-05, DRAG-07, APPEAR-11, WIN-03, WIN-10, TOOL-02.

### N/A

| IDs | Reason |
|---|---|
| FILE-01, FILE-02, FILE-04, FILE-05 | No documents: OPML is import and export only, and there is no printing |
| FMT-01, FMT-02 | No formatted-text editing |
| DATA-02, DATA-03, DATA-08 | Not a document app |
| DLG-09 | No popovers; Speed and Sleep are menus |
| CTRL-02 | No checkbox hierarchies |
| LIST-05 | No disclosure outlines in content |
| AX-05 | No autoplay and no critical non-speech audio |
| START-04, START-05 | No permission requests |
| START-07 | No account creation |
| SYS-02 | No selection operation beyond feed URLs, which SYS-06 covers |
| SYS-07 | Dock state not meaningful |
| EXTRA-01 to EXTRA-04 | No menu bar extra |

### Passes (with evidence)

**Menu bar** (`menus.txt`; agent-verified shortcuts in `LibraryCommands.swift`, `EpisodeEditingViews.swift`, `PlaybackCommands.swift`, `KeyboardShortcuts.swift`)

- **MENU-01:** the order is PodList · File · Edit · View · Podcast · Views · Episode · Playlist · Controls · Window · Help. The app menus follow the object hierarchy.
- **MENU-03:** unavailable items stay visible and dimmed. Titles follow state (Show/Hide Sidebar and Inspector, Star/Unstar, Mark Played/Unplayed, Play/Pause), and checkmarks appear on Speed, Sleep, Sort and Section.
- **MENU-04:** ellipses are used correctly (Rename…, Go to Time…, Rewind to Here…, Delete Permanently…).
- **MENU-05:** one submenu level and no menu icons.
- **MENU-06:** only the system alternates are used.
- **APP-01 to APP-04:** About is in its own group. Settings… opens with ⌘,. Connection and Automation sit in the settings group. Services is present (excluded from the dump). Hide, Hide Others, Show All and Quit are there.
- **FILE-03:** Close ⌘W and Close All.
- **EDIT-01:** "Undo ⟨name⟩" comes from the app's EditHistory (`EpisodeEditingViews.swift:272-283`).
- **EDIT-02:** ⌘C, ⌘A and ⌫ work on lists; Cut and Paste are dimmed where they don't apply.
- **EDIT-03:** Find ▸ keeps its standard items, and ⌘F Search Library is an object search.
- **EDIT-04:** Spelling, Substitutions, Transformations, Speech, Dictation and Emoji are all present.
- **EDIT-05:** ⌘C writes the title plus `public.url` (`SelectionCommands.swift:152-172`).
- **VIEW-01 and VIEW-02:** View has Enter Full Screen, the sidebar and Inspector toggles, Bigger, Smaller and Sort by.
- **WMENU-01 to WMENU-03:** Minimize, Zoom, Bring All to Front and a window list.
- **HELP-01:** PodList Help is a real task guide with a shortcut grid (`ConnectionViews.swift:76-114`).
- **HELP-02:** the system search field is kept, and there are two supplementary items.

**Keyboard and text**

- **KEY-01:** native `List` and `Table` throughout, and every action has a menu equivalent. Focus rings show on sheet controls (L11 Rename…, L22 pop-up, L34 Cancel).
- **KEY-02:** standard shortcuts keep their meanings. ⌘N is New View…, as New Item. ⌘. stops playback but is rerouted to Cancel in sheets (`PlaybackCommands.swift:124, 150-156`).
- **KEY-03:** ⇧⌘J and ⌥⌘J queue an Episode, ⇧⌘L stars, ⇧⌘E marks played, ⌘L opens Now Playing, ⌘← and ⌘→ seek.
- **KEY-04:** a new sheet focuses its first field (L13, L17 name fields; L24 query).
- **KEY-05:** ⌥⌘I and ⇧⌘A use the standard modifier order.
- **KEY-06:** SwiftUI's automatic shortcut localization.
- **KEY-07:** native scroll keys are not overridden.
- **KEY-08:** an in-app shortcut grid. Bare Space and Return are guarded in text fields and sheets (`PlaybackCommands.swift:72-79, 122-133`).
- **TEXT-01 and TEXT-02:** every field is a standard `TextField`, with no binding overrides.

**Windows, toolbar, sidebar and Settings**

- **WIN-01:** standard traffic lights.
- **WIN-02:** a list without focus turns its selection grey. The sidebar is grey in L03 and L33, and the window behind a sheet dims (L11).
- **WIN-04:** titles name the view, for example "New this week – 6 Episodes".
- **WIN-06:** Enter Full Screen.
- **WIN-07 and WIN-08:** New Window ⌥⇧⌘N, Open in New Window, and a multi-window `WindowGroup`.
- **WIN-09:** a native title bar.
- **TOOL-01, TOOL-03, TOOL-04, TOOL-05, TOOL-06:** the title is leading. The Entries / History / Listening Timeline segmented control is central. Three functional groups plus the Inspector toggle and search sit trailing (L06), with borderless SF Symbols. Hidden panes come back through toolbar buttons, the View menu and ⌃⌘S / ⌥⌘I.
- **SIDE-01 to SIDE-06:**
  - a leading source list, two levels deep, visible by default;
  - selection persistent (L03);
  - a 0.5 pt splitter;
  - row size follows the system Sidebar icon size (`MacWindow.swift:116-118`).
- **SET-01 to SET-06** (L27–L30):
  - a Settings window with General and Automation toolbar panes;
  - titles match the pane, the window sizes to each pane, and minimize and zoom are dimmed;
  - changes apply live;
  - Appearance defaults to System (`MacAppearance.swift:170-199`).

**Dialogs, controls and lists**

- **DLG-01 to DLG-07:**
  - No alerts. The one confirmation, Delete Permanently, is destructive-styled and comes with Cancel (`PlaylistSettingsViews.swift:260-266`).
  - Sheets pair Cancel with a verb in the trailing position (L11, L13, L23, L25, L34), and close with Esc or ⌘..
  - Delete Playlist in a sheet can be recovered from Trash.
- **DLG-06:** one sheet at a time.
- **DLG-08:** the View editor shows its match count live (L16, L17), which follows Mail's and Music's smart-list editor sheets.
- **CTRL-01:** pop-ups, checkbox, a small switch in a grouped form, and a 3-segment control.
- **CTRL-03:** fields are labelled, and optional ones say "(Optional)".
- **CTRL-04:** numeric fields with units ("seconds", "days").
- **CTRL-05 and CTRL-06:** the More pull-down holds related commands.
- **CTRL-07:** the search prompt states its scope: "Search this list", "Search Episodes", "Search Library".
- **CTRL-08:** the OPML import shows determinate progress with Cancel, and downloads show determinate progress with Cancel.
- **LIST-01 to LIST-04, LIST-06:** tables with noun headings in title case; the podcast-page header sorts (L18); rows easy to track.
- **LIST-07:** clicking focuses the list; arrows and custom type-select work (`MacRowScroll.swift:96-117`). Return plays and double-click opens details. Help documents both, but see Interaction below.

**Data, drag and pointer**

- **DATA-01:** live apply, and drafts are kept for rename and search fields.
- **DATA-04:** many named undo steps.
- **DATA-06:** `@SceneStorage` holds the destination, selection, sort, tab, scroll anchor and pane widths (`WindowRestoration.swift:51-69`).
- **DRAG-01 to DRAG-04, DRAG-06:**
  - drag Episodes out as a private type, a URL or text;
  - drop onto sidebar Playlists and into Entries;
  - drop OPML files and feed URLs onto the window;
  - a move within a Playlist, a copy elsewhere, Option to force a copy;
  - each drop batch is one undo step;
  - placeholders show while a drop is slow, and dropped items end up selected (`EpisodeTransfer.swift`, `LibraryModel.swift:259-268`).
- **PTR-01, PTR-02, PTR-03, PTR-05:**
  - context menus on rows, Entries, sidebar Views and Playlists, Subscriptions, Trash and the Timeline;
  - up to three groups, with no shortcut glyphs;
  - clicked-row targeting through `contextMenu(forSelectionType:)` and explicit clicked-or-selection logic (`MacWindow.swift:594`);
  - native pointers.

**Appearance, type and accessibility**

- **APPEAR-01 and APPEAR-02:** see Color & contrast below.
- **APPEAR-03:**
  - The AccentColor has four variants.
  - Brand, error and secondary palettes have high-contrast variants (`MacAppearance.swift:10-36, 93-113`).
  - Glass falls back to opaque with a border under Reduce Transparency or Increase Contrast (`MacGlass.swift:8-40`).
- **APPEAR-04:** contrast measured from the captures:

  | Element | Colors | Ratio |
  |---|---|---|
  | Secondary text, Light | `#606060` on white | 6.29:1 |
  | Secondary text, Light | `#606060` on `#eeedec` | 5.38:1 |
  | Secondary text, Dark | `#a0a0a0` on `#242222` | 6.05:1 |
  | "Current Entry" and "Show Description", Light | `#2b50c8` on white | 6.81:1 |
  | Selected-row text, Light | white on `#193cad` | 9.17:1 |
  | Sidebar glyphs, Dark (non-text) | `#4f69e7` on `#2b2626` | 3.20:1 |

- **APPEAR-05:** the app has no custom animation.
- **APPEAR-06 to APPEAR-08:** glass only on controls (`MacGlass.swift`: "Glass belongs to the control layer"), regular glass, and no glass surface inside another.
- **APPEAR-09 and APPEAR-10:** one SF Symbol family; controls are distinct.
- **TYPE-01, TYPE-02, TYPE-03, TYPE-05, TYPE-07, TYPE-08:**
  - Body is 13 pt and row subtitles are 11 pt (L03 `.txt` frames 18.5 / 15 pt). Inspector titles use Title 2.
  - Text Size runs from 100 to 200% and switches tables to a reading layout above 100% (`MacTextSize.swift`; `MacWindow.swift:512`).
  - The punctuation is typographic: "Playlist’s", "…", "−16:34".
- **AX-01:** names on icon buttons: "Back 15 seconds", "Play Now: ⟨title⟩", "Default, 4, Active Playlist, Clear on Played on" (L01 `.txt`).
- **AX-02:** state shows as text as well as color ("In progress", "Current Entry", the Unsubscribe word plus its icon).
- **AX-03:** Text Size reaches 200%.
- **AX-04:** every drag has a command equivalent.

**System integration, launch and copy**

- **SYS-01:** App Intents and App Shortcuts (13 intents, 2 entities and 4 shortcuts extracted in `xcodebuild.log`; `PodListMac/AppIntents.swift:79-209`).
- **SYS-04:** `ShareLink` on Episodes and Podcasts in menus, context menus and the Inspector.
- **START-01:** a local Library is shown at once.
- **START-02:** Getting Started is an inline, non-modal panel that can be dismissed, stays dismissed per Library, and can be reopened from Help and Settings.
- **START-06:** "Start on This Mac" means no account is needed.
- **COPY-01 and COPY-02:** errors are inline with Retry and blame-free ("Could not … Check your connection and retry.", `FailureMessages.swift`).

**Flow checks judged from screenshots** (L03 `.txt`, L11–L25)

- **FLOW-04:** follow-ups appear in the feedback row under the sync line, in view.
- **FLOW-05:** the content and the Inspector share a top edge at y 241.
- **FLOW-06:** playlists reserve feedback space instead of showing an empty shell.
- **FLOW-07:** every sheet's main action is trailing in the footer.

## Scores

Measurements are in points from 2× captures.

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.3** | Strong. **Lifts it:** SF at Mac sizes everywhere. 13 pt body, 11 pt grey subtitles, Title 2 bold Inspector titles and Headline section labels (L03 `.txt`). Tabular time columns, and typographic punctuation. **Keeps it out of Exemplary:** <ul><li>Getting Started inverts its own hierarchy: a 13 pt grey description sits over a caption-size (about 10 pt) *black* instruction line (L32 `.txt` frames 18.5 vs 15 pt).</li><li>Subscription Settings sets "Download Rule on This Device" at 11 pt beside 13 pt "Played Threshold" and "Speed" labels (L22).</li><li>Timeline rows set the date (about 13 pt, grey) larger than the event kind ("Added to Playlist", about 11 pt), so the timestamp outranks what happened (L09 `.txt`).</li><li>Show notes read at about 33 characters per line (TYPE-06).</li></ul> | `hierarchy`, `craft` |
| Hierarchy | **7.2** | Strong. **Lifts it:** source list → table → Inspector reads left to right. The sync line and toolbar recede, and selection drives the Inspector (L03). **Keeps it down:** <ul><li>Every Episode row carries two accent-tinted glyphs, 12 blue marks in L02, competing with titles.</li><li>The Timeline repeats a bordered "Rewind to Here" on every row (L09).</li><li>The Inspector's black 52 pt Play disc is its strongest shape, above the title.</li><li>The bottom player bar is the heaviest band in the window, with critical controls at the bottom edge (WIN-05, owner decision).</li><li>Sheets lead with three paragraphs of explanation (L11, L22).</li></ul> | `content-first`, `hierarchy` |
| Spacing & density | **6.9** (capped by TYPE-04, major; uncapped ≈ 7.0) | **Lifts it:** a consistent 20 pt content gutter and 46–54 pt two-line rows that suit a calm library. The sidebar is system-sized. **Pulls it down:** <ul><li>Inspector action hit regions are 10–13 pt (TYPE-04).</li><li>The gap from the top of the list to its first content differs by view: the Views description at y 84, a reserved blank band in Playlists, and a 70 pt gap before the first Timeline row (L02, L06, L09).</li><li>The Trash description is inset 4 pt from the column (L14).</li><li>The Add Podcasts empty state is centred about 100 pt left of the window's centre (L24, `AddPodcastsWindow.swift:61-65`).</li><li>Label-above-control forms make Edit View a near-full-height scrolling sheet (L16), and the sheets carry 40–60 pt dead bands above the footer (L11, L13).</li></ul> | `craft`, `conventions` |
| Color & contrast | **8.0** | Strong. **Lifts it:** the system accent for selection, with the brand blue only under Multicolor (owner). Every measured text pair passes (APPEAR-04 table above). Dark is coherent (D03, D20). Increase Contrast and Reduce Transparency variants exist in code. Red is reserved for the armed Unsubscribe and errors. **Keeps it out of Exemplary:** row glyphs and "Current Entry" change from blue in Light to white in Dark (inventory mismatch 6). The brand-blue initials tiles tint every artwork placeholder the same color, so color here identifies nothing. | `color-restraint`, `accessibility` |
| Iconography | **7.4** | Strong. **Lifts it:** one SF Symbols family at text weight, and standard glyphs (`square.and.arrow.up` Share, `trash`, `slider.horizontal.3` for settings). **Keeps it down:** <ul><li>`text.badge.plus` for "Add to a Playlist" is a stretch next to the music-list Playlist icon.</li><li>All Views and every View share one filter glyph, so they can't be told apart by icon (L01).</li><li>The toolbar's `play.square.stack` "Play This Playlist" is ambiguous beside the row Play triangles (L06).</li><li>The Podcast page gear has no tooltip (PTR-04).</li></ul> | `conventions`, `plain-language` |
| Consistency & polish | **7.0** (stability N/O; partial: no flow run) | **Lifts it:** every sheet uses one footer (glass, Cancel plus a trailing default). Empty, disabled, pending-drop, inactive-selection and armed states are all designed (L08, L14, L20, L33). **Keeps it down:** <ul><li>The seven inventory mismatches.</li><li>"Show Description" toggles to "Show Less" without revealing anything when the description fits (L18 vs L19).</li><li>The off-centre Add Podcasts empty state.</li><li>Subtitle selection counts in some lists but not others.</li><li>The Window menu lists a window as "New this week (6 Episodes · 6 selected)", which changes on every click.</li></ul> | `craft`, `stability` |
| Clarity | **7.0** | Strong, just. **Lifts it:** a plain, consistent domain vocabulary (View, Playlist, Entry, Position). Visible state: "Up to date", "Current Entry", "Active Playlist", "In progress", and Clear on Played explained where it is set (L11). **Holds it at the bottom of the band:** <ul><li>Sheets explain their own buttons ("Save applies these settings. Cancel discards changes.", L11 and L22).</li><li>The two-tier Rename (Rename… → Save Name / Cancel Rename, while the sheet's Save dims) puts two commit pairs on screen (L12).</li><li>The Add-to-Playlist sheet is titled "Add" but its buttons say Play Now, Play Last and Play Next (L23).</li><li>The Add Podcasts caption about import progress appears when nothing is importing (L24).</li><li>The "In the Last Days" pop-up is followed by "Last Days 7 days" (L16).</li></ul> | `plain-language`, `feedback` |
| Platform fit | **4.9** (capped by MENU-02, blocker; also WIN-05 and SYS-05, majors). Uncapped: Looks 7.8, Behaves 8.0 → (7.8 + 2 × 8.0) ÷ 3 = **7.9** | **Looks:** <ul><li>Native: frame, SF, pop-ups, checkbox, small switch, toolbar-pane Settings, system accent, glass on controls.</li><li>Adapted: the glass player bar and Inspector strip.</li><li>Foreign-leaning: "+ New View… / New Playlist… / Add Podcasts…" action rows inside the source list (L01), an underlined web-style "Show Description" link, label-above-control sheet forms, and the bottom transport bar.</li></ul> **Behaves:** <ul><li>Native: a full menu bar with state titles; ⌘, Settings; rich shortcuts; context menus that target the clicked row; multiple windows and restoration; drag in and out with undo; App Intents; Share; a real Help window.</li><li>Gaps: one command without a menu item (MENU-02); no Spotlight, no app links, no Services or Share extension; no Dock menu.</li></ul> | `conventions`, `discoverable-commands` |
| Interaction & feedback | **8.0** (partial: no flow or timed runs) | Strong. **Lifts it:** <ul><li>Keyboard-fluent: Return plays, ⇧⌘J and ⌥⌘J queue, Space plays and pauses (guarded), type-select, ⌥⌘↑/↓ reorder.</li><li>Undo labelled by name covers almost every Library edit.</li><li>Trash for Playlists, and Delete Permanently is the only confirmation.</li><li>Inline errors carry Retry, and slow drops show placeholders.</li><li>State restoration, Text Size up to 200%.</li></ul> **Keeps it out of Exemplary:** <ul><li>Return plays but double-click opens details, so the two "open" gestures disagree.</li><li>⌘F leaves the current list for Library Search, and "Search this list" has no keyboard route (there is no ⌥⌘F).</li><li>The Undo button in the feedback row disappears after 5 s.</li><li>Closing Getting Started re-enables the inline panel (START-03).</li><li>The armed Unsubscribe posts no VoiceOver announcement.</li></ul> | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **6.9** (cap: lowest scored category 4.9 + 2.0) | PodList serves its task well. It reads as a deliberate Mac library app with unusually complete menus, undo and keyboard support. Without caps it would sit at about 7.5. It is held at 6.9 by one blocker: a single content command, Remove on a failed drop placeholder, has no menu-bar equivalent. That caps Platform fit at 4.9. The weakness holding Overall down most is therefore Platform fit. After that come the owner-decided majors (bottom transport, no Spotlight) and the Inspector hit regions. | — |

## What stands between this build and 9.0

1. **MENU-02 (blocker).** Add the missing "Remove Failed Episode Drops" menu command. This alone lifts the Platform fit cap from 4.9 to 6.9 and the Overall cap from 6.9 to 8.9.
2. **Owner-decided majors cap Platform fit at 6.9.** These are WIN-05 (bottom transport bar) and SYS-05 (Spotlight deferred). While either remains, Overall can't exceed 8.9, so **9.0 isn't reachable without Spotlight indexing and without revisiting the bottom bar.** This is stated for the owner's planning, not proposed as a target.
3. **TYPE-04 (major).** Give the Inspector strip, Resume and Chapter buttons real 28 pt hit regions. This lifts the Spacing & density cap.
4. **Craft and clarity to reach 9 in the visual categories:**
   - unify the list-top rhythm and help-text placement;
   - fix the off-centre Add Podcasts empty state and the no-op "Show Description";
   - drop the button-explaining sheet copy and the nested Rename step;
   - make one row glyph tinted at most;
   - fix the Getting Started typography;
   - widen the reading measure for show notes.
5. **Unverified:** flow stability and response times. A measured flow run is needed before Consistency & polish or Interaction can be scored in full.

## Next step

- **Target:** MENU-02, the only blocker.
- **Anti-pattern:** none fits exactly. The nearest is *Default-menu drift*, but the menu tree here is deliberate.
- **Root cause:**
  - The menu index (`MenuAction.menu` in `PodListUI/MenuCommandActions.swift:23-38`) treats only the batch Retry as a recovery command. Row-level commands on failure placeholders are left on their surface, as if they were dialog buttons.
  - `PlaylistContentView.placeholder(_:)` therefore offers a Remove that the menu bar never publishes.
- **Change:**
  - Add `case removeEpisodeDrop = "Remove Failed Episode Drops"` with `menu: .episode`.
  - Publish it from `MenuCommandActions.episodeDrops(_:)` alongside `.retryEpisodeDrop` when `failedEpisodeDrop != nil`, calling `EpisodeDrop.remove` for each failed slot.
  - Optionally route ⌫ / ⌘⌫ to remove a selected failed placeholder.
- **Principle:** `discoverable-commands`.
- **Expected effect:**
  - MENU-02 passes, and the Platform fit cap rises from 4.9 to 6.9 (still held there by the owner-decided WIN-05 and SYS-05).
  - The Overall cap rises from 6.9 to 8.9. Overall would then be scored on its merits, at about 7.4–7.6 with this build's other findings.
  - It touches no signature element, so the character is unchanged.
