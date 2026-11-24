# PodList for Mac: UI grade, round 23 (Opus)

Full audit per `~/Documents/UI_Guidelines/CRITIQUE.md`, against `core-checklist.md` and `mac-checklist.md`, scored with `rubric.md`.

- **Build:** commit `a0ec64b`, `apps/apple`.
- **Evidence:** `podlist-grading/mac-round-23/`. That's 46 states × Light/Dark with XCUITest accessibility snapshots, a Show Borders pass, `menus.txt`, `light|dark/timings.txt` and `guest-diagnostics/`, plus the code.
- **Not done:** the app wasn't launched, and no screen-control tools were used.
- **Capture paths:** cited below as `L/NN` (light), `D/NN` (dark) and `BL/NN`, `BD/NN` (Show Borders).
- **Point sizes:** points = pixels ÷ 2.
- **Contrast method:** contrast was measured on the PNGs' raw device values. The captures carry the VM's "Apple Virtual" profile, and converting from it to sRGB skews values. Raw values match the app's code-defined sRGB colors exactly: `#606060` secondary, `#2B50C8` brand, `#A0A0A0` dark secondary.

## Frame

- **Task:** Keep up with subscribed podcasts. Find Episodes through saved Views, queue them into ordered Playlists, and play them from the bottom player.
- **Target:** Mac app (SwiftUI on macOS 26+).
- **Era:**
  - Running release: macOS 27.2 (26B123) in a VM.
  - Build: macOS 26.0 SDK (minos 26.0), with no `UIDesignRequiresCompatibility`, so it's a **current build**.
  - Appearance: Light and Dark, set by the app's own setting.
  - Accent: Multicolor, so the brand AccentColor is in effect. The Show Borders pass appears to use the system blue accent.
  - Reduce Transparency and Increase Contrast: off in every capture. Their handling is read from code.
  - Scroll bars: legacy, always visible in the VM (19 pt scrollers).
- **Posture:** sovereign library window, with background playback and a transient Now Playing window.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things. It's a calm personal tool with a three-pane list → detail structure and a strong domain vocabulary. BBEdit is the bar for command and keyboard completeness.
- **Character** (signature elements):
  1. Initials artwork tiles in pale brand blue (`MH`, `DF`, `SB`).
  2. The brand blue `#2B50C8`/`#3652D0` as the Multicolor accent *(owner-fixed)*.
  3. A floating glass player capsule carrying Speed, Sleep and the Active Playlist *(owner-fixed)*.
  4. Capitalized domain nouns used as a vocabulary: Views, Playlists, Entries, Position, Listening Timeline.
  5. A status row above every list: sync state leading, a screen-scoped Undo/Redo button trailing *(owner-fixed)*.
- **Owner decisions:** recorded as given in the brief. They're graded but not targeted:
  - Brand AccentColor only under Multicolor, and the deep Dark accent drawing the selected Settings tab label.
  - Light/Dark/System Appearance setting.
  - Liquid Glass on the player bar, Inspector actions, Now Playing and scrolling-sheet footers.
  - Bottom player bar.
  - Non-customizable toolbar.
  - Two-pane rule below about 950 pt.
  - The Inspector follows selection when wide.
  - The Inspector's default width is about 270 pt.
  - Playlist toolbar group.
  - Saved Views menu name.
  - Two-click Unsubscribe.
  - Undo that doesn't navigate.
  - A status-row Undo only for current-screen edits.
  - Mark All Played kept out of Subscription Settings.
  - Delete Playlist in place, with Restore and Close.
  - "Rewind to Here…" only on the selected row.
  - Accepted RESP-01 misses for sidebar navigation and the New Playlist sheet.
  - Spotlight and donations only in release builds.
  - MCP off by default.

## Flows

**Tasks run:** the XCUITest tour drove these:

- Open a View → select an Episode → Inspector.
- Multi-select.
- Add to a Playlist.
- Playlist Entries → History → Listening Timeline → Rewind preview.
- Playlist Settings edit → Undo/Redo → Delete Playlist in place → Undo.
- New Playlist.
- Library Search.
- Edit View.
- Podcast page → arm/disarm Unsubscribe → Subscription Settings.
- Download Rules.
- Add Podcasts.
- Settings panes.
- Getting Started and Listening Stats.
- A delayed-completion probe (44): Undo of an Entry removal finishes about 8 s later (`guest-diagnostics/edit-history.log`, 00:46:30 → 00:46:38) while "Inflation" is typed into toolbar Search.

**Coverage of the run:**

- **Widths:** minimum 760 × 552 (35, 36, 43), half display 960 × 1080 (37–39) and default 1180 × 760.
- **Appearances:** Light and Dark.
- **Timed runs:** 5 per step, per appearance, on a VirtualMac2,1 (4 vCPU, 8 GB) on a loaded 8-core host. Values are p75 by nearest rank, input event to first presented frame (`timings.txt`).
- **Script:** the repo's `apps/apple/UITour`.
- **Measurements file:** none with per-step core-element boxes. The accessibility snapshots give frames per captured state only.
- **Screenshot strips:** the state captures in `light/` and `dark/`.

**Failures:**

- **[RESP-01] Select Episode → Episode Inspector:**
  - Pane opens: p75 **567 ms** Light, **471 ms** Dark.
  - Pane already open: p75 **514 ms** Light, **466 ms** Dark.
  - Phases: "Input → selection handled" alone is 177–197 ms, then 259–365 ms from the Inspector body evaluation to the first frame.
  - Evidence: `light|dark/timings.txt`.
- **[RESP-01] ⌘, → Settings window:** p75 **606 ms** Light, **521 ms** Dark.
- **Accepted known issue (recorded, not a target):**
  - Sidebar → New this week: p75 716 / 547 ms.
  - ⇧⌘N → New Playlist sheet: p75 1147 / 703 ms. The 1147 ms Light value is also past the 1 s busy-indicator line.
- **Passes:** typing the final "e" of "rice" → filtered list, p75 144 / 141 ms.
- **Not measured:**
  - RESP-02: keystroke and drag frame timing.
  - FLOW-01: no per-step box measurements.
  - FOOT-02: hitch time.

**Delayed-completion probe (44, L and D):**

- The typed "Inflation" stays in Search, with the caret still in the field.
- The Entry selection is retained.
- The restored Entries that the search filters out are announced in the status row: "Undone: Remove from Playlist" plus **Show Restored Entries**, also in Edit.
- This supports FLOW-02, FLOW-03 and DATA-05.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View Episode list (02, 03, 33) | Status row leading, caption, secondary gray "Up to date" with cloud glyph | Status-row `FailureFeedback`, red `#B91C1C` / `#FF9FA1` with Retry (code) | none | Status row trailing, bordered button "Redo Edit View" (23, 33) | Shared empty state component (code) | none | Toolbar Play, plus row Play and ↩ | Filter summary line "Published in the last 7 days · Unplayed · …" |
| Playlist Entries (06, 10, 44) | Same status row; 44 replaces it with "Undone: Remove from Playlist" | Same component; drop failures listed per row with Retry (code) | none | Status row trailing, "Undo/Redo <action>" (13, 39, 44), plus "Show Restored Entries" (44) | Shared component (code) | none | Toolbar Play | "Current Entry" accent tag on the row |
| Playlist History (08) | Status row | — | none | — | Centered clock icon, title "No History", two-sentence body, button **Play This Playlist** | none | Play This Playlist | none |
| Listening Timeline (09, 34a, 34) | Status row | — | Rewind preview sheet, Cancel/**Rewind** (34) | Rewind is undoable (sheet copy) | Shared component, "No Listening Timeline" (code) | none | Selected-row **Rewind to Here…** | none |
| Subscriptions (01, 25) | Status row | — | none | — | — | none | Disabled **Edit Download Rules…** trailing | "Grouped by Download Rule" |
| Podcast page (18–22) | Status row | — | Armed **Unsubscribe**, red, in place (20) | Undoable (code) | — | none | Subscribed/Unsubscribe button | Show Description link |
| Search (15, 36) | Status row; "1 result" / "15 results" heading | — | none | — | Shared component (code) | none | **Create View…** trailing | Scope caption in field |
| Trash (14) | Status row | — | Delete Permanently confirmation dialog (code) | — | Centered trash icon, "Trash Is Empty", retention sentence, no button | none | — | none |
| Sheets (11, 11a, 13, 16, 22, 23, 25) | Sheet closes | Inline field validation (code) | — | Status-row Undo after Save | — | 11a: top note "'Commute' is in the Trash…" | Trailing blue default (Save / Create Playlist / Add / Close); destructive or secondary leading (Delete Playlist, Delete View, Play Now / Play Next) | Footnote paragraphs under controls (11, 22, 23, 25) |
| Settings (27–30) | Live apply, no message | Per-setting recovery text (code: `GeneralSettingsEdits.failures`) | — | — | — | Import note "Closing this window does not stop the import…" | — | Caption notes under rows |
| Listening Stats (31) / Add Podcasts (24) | — | — | — | — | Icon, title, body; Stats has the button **Open Active Playlist**, Add Podcasts has none (the field is above) | none | Search | Example feed address |

**Mismatches:**

1. **Two typefaces for the same Show Notes.**
   - The Library Inspector sets Show Notes in `Font.body.width(.condensed)` (`EpisodeInspector.swift:48`, `:264`; `L/37`).
   - The Now Playing and podcast-preview Inspectors set the same content in regular `.body` (`EpisodeInspector.swift:102`).
   - Screens: 37 vs 26 and the podcast preview.
2. **Two title patterns for settings sheets.**
   - The Playlist sheet is "Playlist Settings" (11).
   - The Subscription sheet is "Market Hours Settings" (22), reached from the menu item "Subscription Settings…".
   - Screens: 11 vs 22.
3. **Undo confirmation shown on one screen only.**
   - After a delayed Undo the status row says "Undone: Remove from Playlist" (44).
   - After the immediate Undo of Playlist Settings it says nothing, keeping "Up to date" with only "Redo Settings for Commute" (13).
   - Edit View behaves the same way ("Redo Edit View", 23, 33).
   - So the same message kind has text on one screen and none on another.
   - Screens: 44 vs 13, 23, 33.

Every main action sits trailing in its sheet footer at every width. The status row is the single place for sync state and Undo/Redo on every list screen. There's no FLOW-07 failure.

## Checklist

Coverage: **96.7%** (pass 142 · fail 3 · N/O 5 · N/A 19; 145 of 150 applicable items carry a pass or fail verdict).

### Failures by severity

**Blocker:** none.

**Major:**

- **[RESP-01] Selecting an Episode, and ⌘, for Settings, miss the 200 ms limit at p75.**
  - The owner-accepted misses aren't counted here; the values are in Flows.
  - **Episode → Inspector:** 466–567 ms across appearances and pane states (`light|dark/timings.txt`).
    - "Input → selection handled" alone takes 177–197 ms, and no frame acknowledges the click in that time.
    - Then 259–365 ms pass between the Inspector body evaluation and the first frame.
    - This is the primary task's most repeated step.
  - **⌘, → Settings:** 521–606 ms.
  - **Code lead:** the Inspector's `ScrollView` is rebuilt on every selection by `.id(row.id)` (`EpisodeInspector.swift:77`).
    - That throws away the scroll view and its `LazyVStack` layout each time, even when the pane is already open (466–514 ms).
    - The General Settings pane builds every section eagerly in one scrolling form.
  - **Fix, Inspector:** keep the Inspector's view identity stable across selections.
    - Drop `.id(row.id)` and reset the scroll offset with a `ScrollPosition` binding instead.
    - Let the row highlight commit before the Inspector's state propagates, for example by publishing the Inspector row on the next run-loop turn.
    - Then the first frame after the click shows the selection within 200 ms.
  - **Fix, Settings:** build the panes lazily, and pre-warm the Settings scene off the critical path.
- **[APPEAR-04] Dark: the toolbar search-scope caption fails contrast on every list screen.**
  - "This list" / "Library" / "Episodes" is drawn in `MacReadableSecondaryStyle` (`#A0A0A0` Dark) on the toolbar's glass capsule, which renders `#474646`. That's **3.60:1** at the `.caption` size (`D/02`, `D/15`, `D/36`; `MacWindow.swift:1074–1075`).
  - Light passes: `#606060` on `#FDFDFD` is 6.18:1.
  - It recurs on every screen and names the search scope that CTRL-07 relies on, so it's major.
  - **Fix:** give the caption a toolbar-specific ink of at least `#B8B8B8` in Dark (4.74:1 on `#474646`), or use `.primary` at caption weight. `#C4C4C4` gives 5.39:1 and matches the existing Increase Contrast Dark value of `#C0C0C0`.
- **[APPEAR-04, owner-accepted] Dark: the selected Settings toolbar pane label is below the system-drawn floor.**
  - The label is `#435FDD` on a `#484747` pill: **1.78:1** (General, `D/27`) and **1.73:1** (Automation, `D/30`). The Dark floor is 2.5:1, so this is major.
  - Light is 7.71:1.
  - This is the owner's accepted cost of the deep Dark accent. It's recorded and capping, not a target.
- **[WIN-03] Light, minimum window with the Inspector explicitly opened: the Episode table doesn't refit and scrolls sideways (`L/43`).**
  - Rows are 654 pt wide inside a 490 pt scroll view (`light/43-…txt`, `outlineRow` frame vs `scrollView` frame).
  - So the Length column is pushed off-screen.
  - A 19 pt horizontal scroller sits over the last visible row's "Deep Field" text.
  - The same step in Dark (`D/43`) and in 36 fits: Episode, Published and Length, with truncated titles.
  - So `EpisodeTableLayout` (`EpisodeTableLayout.swift:12–14`) sometimes keeps the pre-Inspector width.
  - **Fix:** recompute the layout from the table's own measured width whenever the Inspector or sidebar visibility changes, not only on window resize, and don't size the title column from a stale width.

**Minor:** none failed. Observations that didn't reach a failure are folded into the scores.

### Recorded, not failed

- **Window subtitle contrast.** The system-drawn window subtitle ("6 Episodes · 1 selected") is 3.95:1 in Light. Mail's subtitle on the same release is 3.99:1 (`apple-reference/07-mail.png`), and it's `navigationSubtitle` chrome.
- **Player bar over scrolled content.**
  - The player bar is unscrimmed `.glassEffect(.regular)`, so the worst case of what can pass beneath it isn't bounded. That part of APPEAR-04 is N/O.
  - In 36 the blurred rows beneath it stay well behind the bar's labels in both appearances.

### N/O

FLOW-01, RESP-02, FOOT-02, WIN-10, FOOT-01.

### N/A

- DLG-09: no popovers.
- CTRL-02: no checkbox hierarchies.
- COPY-05: no generated content.
- AX-05: no autoplaying media or audio-only alerts.
- START-04, START-05: no permission requests.
- START-07: no account creation.
- FILE-02, FILE-05: no documents and no printing.
- FMT-01, FMT-02: no formatted text.
- DATA-02, DATA-03, DATA-08: not a document app.
- SYS-07: no meaningful Dock state.
- EXTRA-01 to EXTRA-04: no menu bar extra.

### Passes

The evidence is listed by group, and every other ID passes.

**Flow stability:**
- **FLOW-02:** the caret stays in Search through the delayed completion (`L/D 44`).
- **FLOW-03:** typed text is kept (44); the `PlaybackKeyboardGuard` and restoration-origin checks are in `MacWindow.swift:479–487`.
- **FLOW-04:** the status-row Undo and Show Restored Entries are at the top of the content, visible at minimum width.
- **FLOW-05:** the list and Inspector share a top edge (03, 37).
- **FLOW-06:** empty sections say "No Playlists" and similar instead of showing a bare heading.
- **FLOW-07:** see the inventory.

**Keyboard:**
- **KEY-01, KEY-04:**
  - The first field is focused in every sheet (11, 13, 16, 24).
  - Lists and sidebar are native `Table`/`List`.
  - Every command is in a menu.
  - Bare Space and Return are scoped by `LibraryPlaybackSpaceHost` and `PlaybackKeyboardGuard` (`PlaybackCommands.swift`).
- **KEY-02, KEY-03, KEY-05, KEY-06:** ⌘F Search Library, ⌘L Now Playing, ⇧⌘L Star, ⇧⌘E Played, ⇧⌘J / ⌥⌘J queue, ⌥⌘I Inspector, ⌃⌘S sidebar, ⌘+ / ⌘− / ⌘0 text size, ⌘. Stop outside sheets (`KeyboardShortcuts.swift`).
- **KEY-07:** native scroll views.
- **KEY-08:** PodList Help includes a shortcut grid (`ConnectionViews.swift:105–128`).

**Menus:**
- **MENU-01 to MENU-06** (`menus.txt`):
  - Order is App · File · Edit · View · Podcast · Saved Views · Episode · Playlist · Controls · Window · Help.
  - Unavailable items stay visible and dimmed.
  - Toggle items show state: Hide Sidebar, Hide Inspector, Play/Pause.
  - Every row, toolbar, Inspector and context command is mirrored in the menu bar, for example Episode › Resume in Playlist, Play Chapter and Copy PodList Link.
- **APP-01 to APP-04.**
- **FILE-01:** New View… ⌘N, Import OPML… ⌘O.
- **FILE-03, FILE-04:** Export OPML… leaves the window open.
- **EDIT-01:** "Undo Restore Playlist", "Redo Edit View".
- **EDIT-02, EDIT-05:** Copy puts the title and share URL on the pasteboard (`SelectionCommands.swift:201`).
- **EDIT-03, EDIT-04:** the full Find, Spelling, Substitutions, Transformations and Speech menus, plus Dictation and Emoji.
- **VIEW-01, VIEW-02.**
- **WMENU-01 to WMENU-03.**
- **HELP-01, HELP-02:** PodList Help is an in-app guide; the Help search field is kept.

**Text:**
- **TEXT-01, TEXT-02:** native `TextField`s throughout.

**Windows:**
- **WIN-01, WIN-02:** sheet-parent windows go gray and selections become secondary (11, 12, 34).
- **WIN-04.**
- **WIN-05:** playback bar.
  - It holds only transport, Speed, Sleep and the Active Playlist, and each has a Controls menu item.
  - Errors also surface as Controls › Retry Playback.
  - `playbackBarScrollClearance` lets the last row clear the bar.
- **WIN-06 to WIN-09:**
  - New Window ⌥⇧⌘N and Open in New Window.
  - Native full screen.
  - `@SceneStorage` window context.

**Toolbars:**
- **TOOL-01 to TOOL-06.** The toolbar isn't hideable or customizable, by owner decision.

**Sidebars & split views:**
- **SIDE-01 to SIDE-06:**
  - `.listStyle(.sidebar)`.
  - Sections collapse and persist.
  - Two levels deep (40–42).
  - A toolbar toggle, a View menu command and ⌃⌘S.

**Settings:**
- **SET-01 to SET-06:**
  - Its own window with toolbar panes.
  - Minimize and zoom dimmed.
  - Live apply (`GeneralSettingsEdits`).
  - The pane is remembered (`@AppStorage("PodList.settingsPane")`).
  - Appearance defaults to "System" (`LibrarySettingsScreens.swift:51`).

**Alerts, sheets, panels & popovers:**
- **DLG-01 to DLG-08:**
  - An alert is used only for Delete Permanently and for an invalid link.
  - Destructive buttons are never the default.
  - Esc and ⌘. cancel sheets.
  - The window shows one sheet at a time.

**Controls:**
- **CTRL-01, CTRL-03 to CTRL-08:**
  - Labelled fields.
  - Scope shown in Search.
  - Determinate drop and import progress with cancel (`EpisodeTransfer.swift`).

**Lists:**
- **LIST-01 to LIST-07:**
  - Native sortable, resizable `Table`.
  - Persisted collapse.
  - Type-select on every list (`ViewListSelection.swift`).
  - Return and double-click play.

**Data:**
- **DATA-01:** drafts are kept across Trash and Restore (11a).
- **DATA-04, DATA-05:** Show Restored Entries.
- **DATA-06:** `WindowContext` restores destination, selection, sort, scroll anchor, pane widths and collapsed sections.
- **DATA-07:** `NSSavePanel` with "PodList.opml".

**Drag & drop:**
- **DRAG-01 to DRAG-07:**
  - The transfer type carries a private type, a URL and a text proxy.
  - The same playlist moves; anywhere else copies; Option forces a copy.
  - Pending drop rows show per-slot failure and Retry.
  - Window drops accept feeds and OPML.

**Pointer & context menus:**
- **PTR-01 to PTR-05:** `contextMenu(forSelectionType:)` on every list, sidebar and timeline row, with tooltips on icon buttons ("Play now", "Add to a playlist").

**Appearance:**
- **APPEAR-01, APPEAR-02:**
  - Selection and controls use the system accent.
  - The brand color only shows as the Multicolor asset.
  - Show Borders captures show system blue taking over.
- **APPEAR-03:**
  - `MacGlassSurface` turns opaque with a 1 pt stroke under Reduce Transparency and Increase Contrast.
  - The palettes carry high-contrast variants.
  - Show Borders outlines every custom button (`BL/03`, `BD/03`).
- **APPEAR-05:** almost no custom motion.
- **APPEAR-06 to APPEAR-08:** glass only on controls; no glass-on-glass; system toolbar and edge-to-edge sidebar untouched.
- **APPEAR-09 to APPEAR-11.**

**Typography & sizing:**
- **TYPE-01 to TYPE-08:**
  - SF at 13 pt body and 11 pt secondary.
  - Monospaced digits in time columns.
  - Text size 100–200% from View › Bigger and Settings (`MacTextSize.swift`).
  - Curly quotes and the "…" character throughout.

**Writing & copy:**
- **COPY-01 to COPY-04.**

**Accessibility:**
- **AX-01:** every snapshot control has a name.
  - Pop-ups carry their labels ("Downloads on This Mac", "Played Threshold").
  - Row buttons are named "Play Now: <title>".
  - The state glyph is "Playback State, In progress".
  - The one blemish is a duplicated stepper label, "Last Days, Last Days" (16).
- **AX-02 to AX-04.**

**Launch & onboarding:**
- **START-01 to START-03, START-06:** Getting Started can be hidden and stays findable in Help.

**System integration:**
- **SYS-01 to SYS-06:**
  - App Intents with App Shortcuts.
  - An "Add to PodList" Service.
  - `podlist://` links.
  - ShareLink.
  - Spotlight in release builds.
  - A Share extension.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.6** | SF at Mac sizes: 13 pt rows, 11 pt secondary, Title 2 bold Inspector title, headline section heads, monospaced digits for times; type alone carries row structure (02, 18). Kept out of the top of Strong by two choices. First, a condensed Show Notes face in the Library Inspector that the other Inspectors don't use (37 vs 26). Second, the Timeline row sets the 13 pt date above the 11 pt event, so "Added to Playlist" / "Listened at 12:34", the meaningful part, is the smallest text (09). | `hierarchy`, `craft` |
| Hierarchy | **7.5** | Strong: the list is the visual center, the toolbar groups are quiet, and the status row is subordinate (02, 06). Held back by the placeholder initials tile in the Inspector: a roughly 150 pt pale-blue block with 70 pt brand letters (03, 07, 35). It's the loudest shape in the window and outweighs the title and the Play action it sits above. | `content-first`, `hierarchy` |
| Spacing & density | **7.4** | Mac control and row sizes (two-line rows about 40 pt, sidebar rows about 27 pt), one inset rhythm, and columns that drop to state glyphs at minimum width (35, 36). Minuses: the WIN-03 overflow (`L/43`); 52 pt iPhone-like Subscription rows with trailing chevrons (01); three pop-up widths in one Subscription Settings form (22); and Now Playing scrolls inside a content-sized window (26). | `craft`, `conventions` |
| Color & contrast | **6.9** (cap: APPEAR-04 major) | The underlying work is strong. It's nearly monochrome, with blue reserved for selection and "Current Entry" (6.81:1 Light, 7.66:1 Dark) and red only for armed Unsubscribe and errors, and every reading ink passes in both appearances (secondary 6.29:1 Light, 6.05:1 Dark). The Dark search-scope caption at 3.60:1 and the owner-accepted 1.78:1 Settings tab label cap it at 6.9. | `color-restraint`, `accessibility` |
| Iconography | **7.8** | One SF Symbols family at text weight. Sidebar glyphs follow the accent. Every icon-only control has a tooltip and a name, and Show Borders gives each custom control an edge (`BL/03`). Minor stretches: `text.line.last.and.arrowtriangle.forward` (Apple's Play Last glyph) stands for "Add to a Playlist" in rows and the Inspector, and a terminal glyph stands for Automation. | `conventions`, `craft` |
| Consistency & polish | **7.3** (stability 7.5, partial: no per-step measurements) | Edge states are designed: an in-Trash Playlist Settings sheet with Restore and Close (11a), a multi-selection summary (33), empty states with next steps (08, 31), gray inactive selection under sheets (11, 34). Against it: the three inventory mismatches; the Light-only table overflow (43); the Inspector Play button half under the player bar at rest at minimum size (35, 36); and a darker header block beside the scroller in Dark (`D/36`). Stability: the delayed-completion probe (44) holds typed text, caret and selection, and each message kind has one place, the status row. The 7.5 sub-score isn't higher because FLOW-01 wasn't measured. | `craft`, `stability` |
| Clarity | **7.6** | Window titles name the view with counts ("New this week · 6 Episodes · 1 selected"). State is always shown: Active Playlist, Current Entry, In the Trash, Up to date, "Not downloaded on this Mac". The Rewind preview spells out the consequences (34). Held back by dense rule-explaining copy: "Manual Played marks do not create History" (08); "Positions gained since this moment are reset. The permanent Listening Log is kept." (34). Search also says "1 result" under a "1 Episode" subtitle (15). | `plain-language`, `feedback` |
| Platform fit | **6.9** (cap: WIN-03 major; underlying (8.3 + 2 × 8.4) ÷ 3 = 8.4) | **Looks, 8.3:** Native frame, type, controls, sidebar, Settings panes and appearance (L1–L9, L11). L10 is Adapted: the glass player capsule is plainly the app's own. The search field is a custom `TextField` in a glass capsule, not `NSSearchField`. **Behaves, 8.4:** complete menus and shortcuts, context menus everywhere with menu equivalents, rich drag and drop, restoration, App Intents, Services, URL scheme, Spotlight, Share extension. Missing: a Dock menu for transport, and Help as a window rather than a Help Book. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **6.9** (cap: RESP-01 major; underlying about 8.3) | Keyboard-fluent: Space and Return guarded against text and sheets, type-select, ⌥⌘↑/↓ reorder. Forgiving: named Undo for every edit, delete-in-place with Restore, Undo of Unsubscribe. Restoration is thorough. Capped by 466–567 ms to show a selected Episode and 521–606 ms to open Settings, measured on the VM. | `feedback`, `forgiveness`, `keyboard-efficiency` |
| **Overall** | **7.3** | It serves the primary task well and is at home on macOS 27. The structure, command set and data safety are at the level of a well-made native app. Three major failures (responsiveness, one Dark caption, one narrow-window layout race) pin three categories at 6.9. The weakness holding Overall down most is the selection → Inspector latency, because it is felt on every Episode click. Overall isn't limited by the cap (lowest category 6.9 + 2.0 = 8.9). | — |

## Next step

- **Target:** the RESP-01 major on Select Episode → Episode Inspector. Three categories tie at 6.9; this is the major closest to the primary task. The owner-accepted sidebar and New Playlist misses aren't the target.
- **Anti-pattern:** none in the catalog fits. The nearest principle is `feedback` ("respond at once").
- **Root cause:** a click in the Episode table produces no frame for 177–197 ms while the selection propagates. The Inspector's `ScrollView` is then destroyed and rebuilt for every row by `.id(row.id)` (`EpisodeInspector.swift:77`), costing another 259–365 ms of layout before the first frame. The highlight and the detail share one expensive commit.
- **Change:**
  1. Remove `.id(row.id)` from the Inspector's `ScrollView`. Keep the pane's identity stable and reset its offset with a `ScrollPosition` binding keyed to the row.
  2. Publish the Inspector row one run-loop turn after the table's selection changes, so the native row highlight renders in the first frame (within 200 ms) as the acknowledgment.
  3. Keep the existing deferred-details tick for the heavy sections.
- **Expected effect:** RESP-01 for this step moves under 200 ms at p75. Interaction & feedback can then rise off its cap if ⌘, → Settings is fixed the same way (build the panes lazily). No signature element changes.

**What stands between this build and 9.0:**

1. **Clear the three capping majors.**
   - **RESP-01:** above.
   - **Dark search-scope caption:** set it to at least `#B8B8B8`. A one-line change, and the fastest one.
   - **WIN-03:** refit `EpisodeTableLayout` when the Inspector or sidebar visibility changes.
   - The Dark Settings tab label still caps Color & contrast at 6.9 while the owner keeps the deep Dark accent. Reaching 9.0 there means reopening that decision, for example a lighter Dark accent for the Settings pane only, which isn't possible with a single AccentColor.
2. **Polish to Exemplary.**
   - One Show Notes face.
   - Promote the Timeline event above its timestamp.
   - Scale down the placeholder initials tile in the Inspector.
   - Give the three settings sheets one title pattern.
   - Say "Undone: …" for every status-row Undo, not only delayed ones.
   - Add a Dock menu with Play/Pause and skip.
   - Size Now Playing so it doesn't scroll at its content size.
3. **Make stability measurable.** Add a per-step measurements file (core-element boxes, focus, field value) to the tour, so FLOW-01 and the stability sub-score can be scored rather than inferred.
