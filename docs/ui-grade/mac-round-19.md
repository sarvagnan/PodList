# PodList for Mac: UI grade, round 19 (Opus)

Graded build: `apps/apple` at `f166ec9`. The standard is `~/Documents/UI_Guidelines/CRITIQUE.md` (full audit), with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. Evidence comes from the XCUITest tour in `podlist-grading/mac-round-19/` (captures, AX snapshots, `timings.txt` and `menus.txt`) and from the code. The app wasn't launched on this Mac. Capture references such as `L03` and `D27` mean `light/03-…` and `dark/27-…`; `BL` and `BD` are the Show Borders passes. Points are pixels ÷ 2.

## Frame

- **Task:** Find Episodes across Subscriptions with saved Views, queue them in ordered Playlists and listen, without losing your place.
- **Target:** Mac app (SwiftUI, macOS 26+).
- **Era:** Captured on macOS 27.2 (26B123) in a VirtualMac2,1 VM with a 1920 × 1200 pt display at 2×. Built with the macOS 26.0 SDK (minos 26.0) without `UIDesignRequiresCompatibility`, so it's a **current build**. The app's own Appearance setting forces Light or Dark. Reduce Transparency and Increase Contrast are off in every capture; how the code handles them is graded below.
- **Posture:** Sovereign. People keep it open all day while they listen.
- **Audience:** Perpetual intermediate, with expert routes (menus, shortcuts, App Intents, MCP).
- **Nearest exemplar:** Things, a calm personal tool. Music and Podcasts on macOS 27 are the platform references for the playback bar.
- **Character:** These signature elements were kept in mind throughout:
  1. Initials tiles in the brand blue stand in for artwork.
  2. Episode rows have two lines: the title, with the podcast in secondary gray beneath.
  3. A floating glass playback bar spans the window. *(Owner-fixed.)*
  4. A plain-spoken status row ("Up to date", "Undo Delete Playlist") sits at the top of each list.
  5. The sidebar has three sections: Views, Playlists and Library, each with its own "New…" row.
  6. The brand accent appears only under Multicolor. *(Owner-fixed.)*
- **Owner decisions:** These are graded here but not targeted:
  - The AccentColor is #2B50C8 in Light and #3652D0 in Dark, with Increase Contrast variants. The selected Settings tab label is drawn in it.
  - Appearance offers System, Light and Dark.
  - Glass is used on the player bar, the Inspector actions, Now Playing and scrolling sheet footers.
  - The toolbar isn't customizable.
  - Narrow windows show two panes at a time, and the Inspector opens at its default width.
  - On a Playlist, the toolbar is one group.
  - The menu is named Saved Views.
  - Unsubscribe takes two clicks on the Podcast page and acts at once from menus; both routes can be undone.
  - The rules for Undo reveal and the status-row Undo.
  - Mark All Played isn't in Subscription Settings.
  - Delete Playlist keeps the sheet open, with Restore.
  - "Rewind to Here…" shows only on the selected Timeline row.
  - The RESP-01 misses for sidebar navigation and the New Playlist sheet are accepted.
  - MCP is off by default.

## Flows

The tour (`apps/apple/UITour/PodListUITour.swift`) is a scripted XCUITest run. It ran these main tasks:
- Browse a View.
- Select an Episode and open the Inspector.
- Multi-select.
- Use the Playlist tabs: Entries, History and Listening Timeline, including Rewind.
- In Playlist Settings: rename, Delete, Restore, then Undo and Redo.
- Create a New Playlist and a New View.
- Edit a View.
- Search.
- On the Podcast page: arm and disarm Unsubscribe, and open Subscription Settings.
- Add to a Playlist, Add Podcasts and Download Rules.
- Open Now Playing, Settings, Listening Stats and Getting Started.

Run conditions:
- **Widths:** the minimum size (760 × 552 pt window, captures 35, 36 and 43), half the display (960 pt wide, captures 37 to 39) and the default size (1180 × 760).
- **Appearances:** Light and Dark.
- **Timed runs:** 5 samples per step, measured in the app from the input event to the first presented frame, on the VM (4 CPUs, 8 GB).
- **Evidence:** There's no per-step measurements file. Stability evidence is the per-capture AX frames (`*.txt`) and the screenshot strips. Async completions weren't delayed on purpose, so FLOW-03 rests on code and the stability sub-score is partial.

**Timings (p75, Light / Dark):**

| Step | Light | Dark | Verdict |
|---|---|---|---|
| Sidebar to the New this week list | 500.5 ms | 554.3 ms | Miss; accepted by the owner |
| Select Episode to the Inspector | 150.1 ms | **217.6 ms** | Miss in Dark |
| ⇧⌘N to the New Playlist sheet | 481.3 ms | 523.2 ms | Miss; accepted by the owner |
| ⌘, to the Settings window | **259.3 ms** | **329.8 ms** | Miss |
| Typing the last letter of "rice" to the filtered list | 90.9 ms | 122.9 ms | Pass |

**Flow failures:** None are recorded against FLOW-01 to FLOW-07.
- The status row reserves space for Undo and Redo. In L33 and L35, "Redo Edit View" appears beside "Up to date" without moving the list.
- Opening the Inspector doesn't move the list: the first row's title stays at y 352 in both L02 and L03.
- The Playlist Settings sheet grows when the Playlist is deleted (L11 → L11a: its top moves up 31 pt and Done sits 29 pt lower than Save). That move happens within the person's own click.

**One landing defect is recorded under APPEAR-11.** After `navigate("New this week")`, the Episode list sits scrolled by 33 pt:
- Before: in L02 and L03, the title of "Who sets the price of rice?" is at y 352.
- After: in L16, L17, L23 and L33 it's at y 319, under the 36 pt column header (305–341), although all six rows fit.
- The script doesn't scroll between capture 15 and capture 16 (`PodListUITour.swift:288-294`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library list (View, Search) | Status row, top-leading: cloud glyph + "Up to date"; window subtitle counts | Status row: red text + inline Retry, also Edit › Retry Failed Operation | none | Status row, top-trailing bordered button "Undo/Redo <action>"; Edit menu names it | `ContentUnavailableView`, centred ("No Matching Episodes" + Edit View…/Clear Search) | none | Toolbar trailing group: Play, Add, ⋯, settings | Filter summary line under status ("Published in the last 7 days · Unplayed · …") |
| Playlist (Entries/History/Timeline) | Same status row; subtitle "4 Entries · Active Playlist" | Same status row | none | Same status-row button (L11a "Undo Delete Playlist", L13 "Redo Settings for Commute") | **Plain line "This Playlist has no Entries." + Find Episodes** (`PlaylistContentView.swift:117`); "No History", "No Listening Timeline" use `ContentUnavailableView` | Trashed: subtitle "In the Trash · 3 Entries" | Same toolbar group, plus the segmented tab control | Timeline row action "Rewind to Here…" on the selection |
| Podcast page | Status row | Status row | Unsubscribe armed in place (red "Unsubscribe", L20) | Status row + Edit menu | "No Episodes Yet / … Try again later." | none | "Subscribed" button in the header row | "Show Description" |
| Subscriptions, Views, Trash | Status row | Status row | none | Status row | `ContentUnavailableView` ("Trash Is Empty / Deleted Playlists are kept for 30 days…") | none | "Edit Download Rules…" trailing in the group header | none |
| Inspector | "Not downloaded on this Mac" status line | Inline download status, red | none | Edit menu | "Select an Episode / Its details and Playlists appear here." | none | Glass Play button + glass action cluster | none |
| Sheets (New Playlist, New/Edit View, Playlist Settings, Add to Playlist, Subscription Settings, Download Rules) | Sheet closes; the result appears in place | Field-level: commit button disabled | Delete Permanently confirmation (dialog) | Edit menu + status row after the sheet closes | n/a | Trashed-Playlist note at the top of Playlist Settings (L11a) | Default button trailing at the bottom: **Save / Create Playlist / Create View / Add / Apply / Done** | Grey caption under the control ("Add places the Episodes at the end…") |
| Add Podcasts window | Results list | Inline, under the field | none | Edit menu | "Find Your Next Podcast / Search for a podcast by name, or paste its RSS feed address…" | none | "Search", trailing beside the field | Caption: "Import OPML from the File menu…" |
| Settings | Applies live | Inline in the pane | none | Edit menu (playback fields) | n/a | n/a | n/a | Grey captions under each group |
| Player bar / Now Playing | Title and position | Window subtitle "Playback stopped" + Controls › Retry Playback | none | n/a | Now Playing: "No Current Entry / Choose an Episode in Library to begin." | none | Play | none |

**Mismatches:**
1. **Empty Playlist** uses a plain line and button. Every other empty list (Views, Trash, History, Timeline, Inspector) uses the centred `ContentUnavailableView`. Screens: Playlist Entries vs History and Trash.
2. **Commit-verb drift for the same kind of sheet.** Subscription Settings commits with "Save" (L22), while Download Rules for several Subscriptions commits with "Apply" (L25), and both set the same Download Rule.
3. **The undo name doesn't match the command.** Podcast › Mark All Played is recorded as "Mark Subscription Played" (`LibraryEditingModel.swift:155`), so Edit and the status row say "Undo Mark Subscription Played".
4. **Unsubscribe uses two confirmation models** (armed control on the page, immediate from menus). This is the owner's decision and is listed, not targeted.
5. **Getting Started has two homes.** Window › Getting Started opens a window, but Settings › Getting Started presents it as a sheet on the Settings window (L32).

## Checklist

Coverage: **94.0%** (pass 133 · fail 7 · N/O 9 · N/A 20, of 169 IDs).

### Failures by severity

**Blocker**
- **[AX-01] The Add Podcasts query field has no accessible name.**
  - In both appearances, `light/24-add-podcasts.txt` and `dark/24-add-podcasts.txt` show `role=textField label="" title="" identifier="addPodcasts.query"`. The visible "Podcast Name or Feed Address" is a separate `Text`, and the field's title is only its placeholder (`AddPodcastsWindow.swift:56-59`). Once anything is typed, VoiceOver has nothing to call the field.
  - This is the main input of the Subscribe task.
  - Secondary finding: every form pop-up in the View, Subscription and Download Rule sheets reads its name twice, for example `label="Played, Played"` and `"Download Rule on This Mac, Download Rule on This Mac"` (`light/16-edit-view.txt`, `light/22-subscription-settings.txt`).
  - For the record, the system `.searchable` toolbar field also snapshots with an empty label. It's system-drawn, has the search role and a prompt, and isn't counted.
  - **Fix:** add `.accessibilityLabel("Podcast Name or Feed Address")`, or wrap the field in `LabeledContent` so the visible label becomes its name. Drop the duplicated placeholder. Remove the redundant label source on the Form pop-ups, keeping either the Picker title or the `LabeledContent` label, not both.

**Major**
- **[RESP-01] Some main-task steps answer late.**
  - The Episode Inspector takes 217.6 ms p75 in Dark (`dark/timings.txt`).
  - ⌘, takes 259.3 ms p75 in Light and 329.8 ms in Dark to the Settings window.
  - Sidebar navigation (500–554 ms) and the New Playlist sheet (481–523 ms) also miss. The owner has accepted those two, so they're recorded but not targeted.
  - **Fix:** profile selection → Inspector in Dark, which is about 70 ms slower than Light. Look for appearance-dependent work in the Inspector, such as resolving `MacAccentForegroundStyle` per row or building the glass container. Pre-build the Settings scene's General form so ⌘, shows a frame within 200 ms.
- **[APPEAR-04] In Dark, the selected Settings pane label is 1.73:1, below the 2.5:1 floor for system-drawn accent text.**
  - Measured: #435FDD on #484746 (D27, crop at 530,125 px).
  - Light is 7.69:1 (#2146BE on #FDFDFD) and passes.
  - Every other measured text passes:
    - Secondary text: 6.29:1 Light (#606060 on white) and 6.05:1 Dark (#A0A0A0 on #242222).
    - Sidebar and Inspector secondary text: 5.33–5.70:1.
    - "Current Entry" and "Show Description": 6.81:1 Light and 7.66:1 Dark.
    - Armed "Unsubscribe": 5.48:1 Light and 6.51:1 Dark.
    - Sheet captions: 5.82–6.29:1.
    - Selected-row text: 9.17–9.96:1.
  - Text over the glass player bar measured 20.8:1 Light and 10.6:1 Dark over the rows in L36/D36. Nothing bounds the worst case beneath the bar, though (a selected blue row), so that part is N/O.
  - The window subtitle, which macOS draws, measures 3.95:1 in Light. It's system chrome and isn't counted.
  - This is the owner's deliberate deep Dark accent, so it isn't the target. The cap stands.
  - **Fix, if the owner reopens it:** a Dark AccentColor of at least about #5A74E6 clears 2.5:1 on the #484746 pill. That would trade against white-on-selection contrast, which is the split-role case in `color.md`.
- **[EDIT-05] Edit › Copy has nothing to copy on most selections.**
  - `onCopyCommand` exists only on the View/Search Episode table (`MacWindow.swift:739`) and Playlist Entries (`PlaylistContentView.swift:149`).
  - Selecting Episodes on the Podcast page, in History, or in the Subscriptions or Views lists gives Edit › Copy nothing to copy. The same Episode copies as text + URL in a View but not on its Podcast page.
  - Copy Link, Copy PodList Link and Copy Feed Address write only `.string`, not a URL type (`ShareLinks.swift:15-17`).
  - **Fix:**
    - Add `onCopyCommand` to the Podcast-page Episode table and to History, reusing `SelectionCommands` (title + URL).
    - For Subscriptions, copy the name + feed URL.
    - For Views, copy the `podlist://` link.
    - In `ShareLinks.copy`, write both `.string` and `.URL`.

**Minor**
- **[APPEAR-11] Navigating back to a View can leave its first row hidden under the column header.**
  - The list lands 33 pt scrolled, with row 1's title under the column header, although every row fits (L02/L03 → L16/L17/L23/L33, with the AX frames above).
  - This matches a restored scroll anchor aligned to the clip view's top instead of below the floating header.
  - **Fix:** in the scroll restoration in `MacRowScroll.swift`/`WindowRestoration.swift`, scroll the anchor with the header height as a top inset. When the content fits, don't scroll at all.
- **[TYPE-06] Show notes in the Inspector run about 34 characters per line at the default 270 pt width.**
  - L03: "Who sets the price of rice?. An" / "episode of Market Hours".
  - That's below the 45–90 measure for reading text. The width is the owner's choice and the person can widen the pane, but the default size is what's graded.
  - **Fix:** when the Inspector is narrower than about 330 pt, use Callout (12 pt) for the show-notes body only.
- **[COPY-01] Some labels are inconsistent or vague.**
  - The undo name "Mark Subscription Played" doesn't match the command "Mark All Played".
  - Inline-picker headers show the literal words "Section" (Playlist menu, `EpisodeEditingViews.swift:396`) and "Column" (View › Sort By, `MenuCommandActions.swift:186`) as dimmed menu headers (`menus.txt`).
  - **Fix:**
    - Name the history entry "Mark All Played".
    - Title the pickers "Show" and "Sort Column", or hide their labels (`.labelsHidden()`) so no header is drawn.

### N/O
Full Keyboard Access wasn't captured, but code settles KEY-01, so it's graded as a pass. The N/O items are:
- RESP-02
- FOOT-01, FOOT-02
- WIN-10
- SET-06
- DRAG-04, DRAG-05, DRAG-06, DRAG-07

### N/A
- **DLG-08:** no floating panels.
- **DLG-09:** no popovers.
- **CTRL-02:** no checkbox hierarchies.
- **COPY-05:** generates no content.
- **START-04, START-05:** requests no permissions.
- **START-07:** no accounts.
- **FILE-02, FILE-04, FILE-05:** not a document app; no Open Recent, Duplicate or Print.
- **FMT-01, FMT-02:** no formatted-text editing.
- **DATA-02, DATA-03, DATA-08:** not a document app.
- **SYS-07:** no meaningful Dock state.
- **EXTRA-01 to EXTRA-04:** no menu bar extra.

### Passes (evidence in brief)

**Flow stability**
- FLOW-01 to FLOW-07: see Flows.
- FLOW-03, from code: a typed query is cleared only by the person's own navigation or Undo, or when sync deletes the current destination (`LibraryModel.swift:462`, `WindowRestoration.swift:99`). Search results never write back to the query.

**Keyboard**
- **KEY-01, from code:** every command is in the menu bar; lists, sheets and Settings use native controls.
- **KEY-02:**
  - ⌘N is New View: New Item fits a non-document app, as in Mail.
  - ⌘. is Stop, as in Music, and Escape in sheets.
  - ⌘L, ⌘R and ⌘[ keep their meanings.
- **KEY-03:**
  - Frequent commands have ⌘ shortcuts: ⇧⌘N, ⇧⌘A, ⇧⌘J/⌥⌘J, ⇧⌘L, ⇧⌘E, ⌘←/⌘→, ⌘L.
  - Play/Pause uses Space. It's shown in the tooltip and the Help grid but not on Controls › Play. This is noted, not failed.
- **KEY-04:** first-field focus is visible in L13, L17, L16, L23 and L24.
- **KEY-05, KEY-06:** SwiftUI localizes the shortcuts.
- **KEY-07:**
  - Page Up/Down are native.
  - Space plays and pauses, and Help documents it as a task key.
- **KEY-08:** Help › PodList Help has a shortcut grid (`ConnectionViews.swift:93-123`).

**Dialogs**
- DLG-01 to DLG-07: no alerts for routine actions; Cancel `.cancelAction` and confirm `.defaultAction` (`PodListSheet.swift:213-216`); Delete Permanently is `.destructive` with Cancel; Done stands alone in L11a.

**Controls**
- CTRL-01, CTRL-03 to CTRL-08:
  - Pop-ups for choices; small switches in grouped Settings.
  - "(Optional)" marks optional fields, and every field keeps a visible label.
  - OPML import shows determinate "Importing N of M" with Cancel.

**Lists**
- **LIST-01 to LIST-07:**
  - The Episode list is a sortable `Table`. Its title-case noun headers are Episode, Published, Length and State, and the sort chevron shows in L18.
  - Selection stays highlighted, and moves to the unfocused gray when focus leaves the list (L03 sidebar).
  - Type-select works.
  - Return and double-click play.
  - Folded sidebar sections are saved in `SceneStorage`.

**Data**
- **DATA-01:** saves happen live, and drafts are kept.
- **DATA-04:** an app-wide history, named per action in Edit and the status row ("Undo Restore Playlist", "Redo Edit View" in `menus.txt`).
- **DATA-05:** restored Entries are selected and scrolled to. Undo of View and Subscription deletions doesn't navigate; this is the owner's decision.
- **DATA-06:** destination, selection, sort, tab, pane widths, Inspector, sidebar visibility and folded sections are kept in `@SceneStorage` (`WindowRestoration.swift:52-72`).
- **DATA-07:** OPML export uses `NSSavePanel` with a default "PodList.opml".

**Drag and drop**
- **DRAG-01 to DRAG-03:**
  - Episodes drag into Playlists and reorder there.
  - Option forces a copy.
  - Feed URLs and OPML files drop onto the window.
  - A drop is one Undo step (`EpisodeTransfer.swift:136`).
  - Every drag has a menu equivalent.

**Pointer**
- **PTR-01 to PTR-05:**
  - `contextMenu(forSelectionType:)` on lists.
  - Context menus show no shortcuts and have no more than 3 groups.
  - A right-click on an unselected row applies to that row only.
  - Icon-only buttons have `.help`.

**Appearance**
- **APPEAR-01:** works in both appearances; Appearance defaults to System.
- **APPEAR-02:** `MacAccentForegroundStyle` follows the person's accent and uses the brand blue only under Multicolor (`MacAppearance.swift:152`).
- **APPEAR-03:**
  - Glass turns opaque, with a stroke at 0.6 opacity under Increase Contrast (`MacGlass.swift:27-31`).
  - Every custom color has four variants.
  - With Show Borders on, the toolbar and the Inspector cluster draw edges (BL03, BD03).
- **APPEAR-05:** the app adds no custom motion.
- **APPEAR-06, APPEAR-07:** glass is used only on controls, and none is stacked.
- **APPEAR-08:** the system toolbar and sidebar are untouched, and the scroll edge stays legible (L36, L43).
- **APPEAR-09, APPEAR-10:** SF Symbols throughout; controls stay distinct from content.

**Typography**
- **TYPE-01 to TYPE-05, TYPE-07, TYPE-08:**
  - Body is about 13 pt; the row title "Who sets the price of rice?" is 162.5 pt wide for 27 characters.
  - Captions are 10 pt with 15 pt lines.
  - View › Bigger goes up to 200% and switches the tables to a reading list.
  - The app uses ellipsis characters ("New View…") and "1×".

**Writing**
- COPY-02 to COPY-04: errors appear inline with Retry and say "Could not … Check your connection and retry."; empty states give a next step.

**Accessibility**
- **AX-02:** state is carried by text and glyphs, not color alone.
- **AX-03:** text size goes to 200%.
- **AX-04:** every action has a menu command.
- **AX-05:** nothing autoplays.

**Launch and help**
- START-01 to START-03, START-06: works locally with no account; Getting Started can be hidden and found again in the Window menu.

**Edit**
- EDIT-01 to EDIT-04: Undo heads Edit with a name; Find stays standard and ⌘F goes to Search Library as an object search; Spelling, Substitutions, Transformations, Speech, Dictation and Emoji are all present.

**Windows**
- **WIN-01 to WIN-09:**
  - Standard frames; Add Podcasts is an auxiliary window with only Close.
  - The playback bar meets WIN-05's playback-bar clause: playback only, every action is in Controls, errors also go to the subtitle and menu, and the last row scrolls clear (L36).
  - New Window is ⌥⇧⌘N, and File has Open in New Window.

**Menus**
- **MENU-01 to MENU-06:** the order is App, File, Edit, View, Podcast, Saved Views, Episode, Playlist, Controls, Window, Help. Dimmed items stay visible, and toggles change their titles (Star/Unstar).
- **APP-01 to APP-04, FILE-01, FILE-03:** Import/Export OPML are in File.
- **VIEW-01, VIEW-02:** Hide Sidebar, Hide Inspector, text size and Enter Full Screen.
- **WMENU-01 to WMENU-03:** standard Window commands.
- **HELP-01, HELP-02:** an in-app Help window with tasks and a shortcut grid; the system Help search field is kept.

**Toolbars, sidebars and Settings**
- **TOOL-01 to TOOL-06:**
  - Toolbar zones: title leading, actions trailing.
  - The search field collapses to a button at half the display (L39).
  - Icons are borderless.
  - The toolbar can't be hidden, so it needs no way back.
- **SIDE-01 to SIDE-06:**
  - Sidebar and Inspector each have a button, a menu command and a shortcut (⌃⌘S, ⌥⌘I).
  - The sidebar uses `List(.sidebar)` and follows the system sidebar size.
  - Its last row scrolls above the player bar (L41).
- **SET-01 to SET-05:** a `Settings` scene with two toolbar panes; it applies changes live and reopens on the last pane.

**System integration**
- **SYS-01 to SYS-06:**
  - 14 App Intents, including Now Playing, and 4 App Shortcuts.
  - Spotlight indexes Episodes, Subscriptions and Playlists.
  - `podlist://` links.
  - An "Add to PodList" Service.
  - A Share extension.
  - `ShareLink` for sharing.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.8** | SF throughout with a small role scale: 13 pt row titles, 11 pt secondary podcast names (#606060), a bold 17 pt Inspector title, semibold section heads and 10 pt captions with 15 pt lines. Hierarchy comes from weight and secondary color (L03). Numbers in the player are monospaced. TYPE-06 (about 34 characters per line in the Inspector's show notes) and the two-line "Download Rule on / This Mac" label wrap (L18, L22) keep it out of the top of Strong. | `hierarchy`, `craft` |
| Hierarchy | **7.6** | The list leads, and the toolbar is one quiet borderless group plus search. The status row is low-contrast metadata, and the playback bar floats as Music's does. Against that: the three accent "+" rows in the sidebar (New View…, New Playlist…, Add Podcasts…) compete with destinations, and the empty Inspector claims a third of the default width ("Select an Episode", L02). | `content-first`, `hierarchy` |
| Spacing & density | **7.5** | One rhythm: 54 pt two-line rows, 32 pt sidebar rows and aligned gutters. Sheets use two-column forms with right-aligned labels (L16, L22). The layout holds at the minimum size with two panes and columns dropped (L35). It's roomy for a sovereign tool: only six Episodes fit at the default size (L02), and the Settings form has wide, loose groups (L27). | `craft`, `conventions` |
| Color & contrast | **6.9** (capped) | Nearly monochrome. Brand blue appears only in initials tiles, accent text and selection. Secondary text measures 5.3–6.3:1, and every custom color has Increase Contrast variants. Without the cap it would be about 8.2. The cap comes from APPEAR-04: the Dark Settings pane label at 1.73:1, below the 2.5:1 floor, the owner's accepted trade. | `color-restraint`, `accessibility` |
| Iconography | **8.0** | One SF Symbols family at matched weights. The same glyph means the same action in the row, the toolbar and the Inspector cluster (L03). Every icon-only button has a tooltip and a name. The "text.line.last.and.arrowtriangle.forward" glyph for Add to a Playlist is a slight stretch, and initials tiles stand in for artwork. | `conventions`, `craft` |
| Consistency & polish | **7.4** (stability 7.4, partial) | Every state is designed: empty, unfocused, selected (gray when unfocused), disabled, trashed Playlist and armed Unsubscribe, in both appearances. Against that are five inventory mismatches: the Playlist empty state, Save vs Apply, the undo name, two Unsubscribe models and two homes for Getting Started. There's also the 33 pt scroll landing (APPEAR-11), and Now Playing shows scrollers for a few points of overflow at its content size (L26). Stability: core elements hold and Undo has its own space, but there were no delayed-completion runs. | `craft`, `stability` |
| Clarity | **7.6** | Labels are specific ("Rewind to Here…", "Clear on Played", "Add places the Episodes at the end of the Playlist."). State is visible in the window subtitle, status row and Inspector. COPY-01 ("Section"/"Column" menu headers, "Mark Subscription Played") and the State column disappearing below about 640 pt with no substitute mark (L35) hold it back. | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped) | Looks 8.4: L1–L9 and L11 are Native; L10 is Native, with a glass bar like Music's. Behaves 7.6: B1, B2, B4, B5, B6, B7 and B9 are Native; B3 is Native but Option-heavy; B8 is Adapted (no drag for Subscriptions); B10 is Adapted (Help is an in-app window, not a Help Book); B11 is N/O. (8.4 + 2 × 7.6) / 3 = 7.9, capped at 6.9 by EDIT-05. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **4.9** (capped) | Uncapped it would be about 7.6: a named multi-step Undo across almost every edit, keyboard routes for every command, live Settings, Undo in place of confirmation, and determinate import progress. It's capped at 4.9 by AX-01 (blocker: the Add Podcasts field has no name), with RESP-01 (major) behind it. | `forgiveness`, `accessibility`, `feedback` |
| **Overall** | **6.9** | It serves the task, and it would look at home next to Music and Things. The cap rule (lowest category 4.9 + 2.0) holds it at 6.9. The weakness holding it down is the one unnamed field on the Subscribe path; after that, Copy coverage and late responses. | — |

## What stands between this build and 9.0

1. **AX-01 (blocker):** name the Add Podcasts field and remove the doubled pop-up names. This alone lifts the Interaction cap.
2. **EDIT-05 (major):** Edit › Copy on every list selection, with URL types on link copies. This lifts the Platform fit cap.
3. **RESP-01 (major):** the Inspector in Dark and ⌘, to Settings, plus the owner-accepted sidebar and New Playlist latency. While any step misses 200 ms, Interaction stays at 6.9 or below.
4. **APPEAR-04 (owner-accepted):** while the Dark accent stays deep, Color & contrast is held at 6.9. That alone keeps Overall at 8.9 or below, so the 9.0 band needs the owner to revisit it.
5. **Polish:**
   - the scroll restoration under the header;
   - the Playlist empty state;
   - Save vs Apply;
   - menu-picker headers;
   - show-notes measure;
   - the Now Playing overflow;
   - a played mark when the State column is hidden;
   - a delayed-completion flow run to firm up the stability sub-score.

## Next step

| Field | Value |
|---|---|
| **Target** | AX-01, the blocker, in the lowest-scoring category, Interaction & feedback. |
| **Anti-pattern** | A narrow case of *Ghost-text elegance*: the placeholder does a label's job for assistive technology. |
| **Root cause** | The query field sits outside a `Form`. Its SwiftUI title becomes only the placeholder, and the visible heading above it is a separate `Text` that isn't linked to it. |
| **Change** | In `AddPodcastsWindow.swift:56-59`, replace the free-standing `Text` + `TextField` pair with `LabeledContent("Podcast Name or Feed Address") { TextField("", text: $state.query, prompt: Text("Name or https://…/feed.xml")) }`, or add `.accessibilityLabel("Podcast Name or Feed Address")`. At the same time, make each sheet `Picker` give its label once, so VoiceOver reads "Played, pop-up button, Any". |
| **Principle** | `accessibility` |
| **Expected effect** | The Interaction cap goes from 4.9 to 6.9, with RESP-01 still capping it, so Overall can rise to about 7.5. Nothing visible changes, so character is unaffected. |

Re-verify with the next tour's `24-add-podcasts.txt`: the field should show `label="Podcast Name or Feed Address"`.
