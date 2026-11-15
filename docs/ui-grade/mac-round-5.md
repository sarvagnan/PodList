# PodList for Mac — UI grade, round 5 (Opus)

Grader: Claude Opus 5.5, independent; no earlier round or grade report was opened.
Build: `apps/apple` at `6ffd0da`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `platform-fit.md` and `rubric.md`.
Evidence: `~/Documents/podlist-grading/mac-round-5/` (35 states, Light and Dark PNGs at 2×, XCUITest `.txt` trees, `menus.txt`) and the source code. Sizes below are in points (pixels ÷ 2). Contrast ratios are WCAG relative-luminance ratios computed from pixels sampled in the PNGs.

## Frame

- **Task:** keep up with podcasts. Find Episodes through Subscriptions and saved Views, queue them into Playlists, and listen, with History and a Listening Timeline as the record and the undo.
- **Target:** Mac app (SwiftUI, macOS 26+, captured on macOS 27.2).
- **Posture:** sovereign. It's an all-day library and player window, with transient helpers: Add Podcasts, Now Playing, Listening Stats and Getting Started.
- **Audience:** perpetual intermediates. The Help window and Getting Started reach newcomers, and a full shortcut set serves experts.
- **Nearest exemplar:** Things, a calm personal tool whose domain model is carried by plain words (View, Playlist, Entry, Active Playlist, Clear on Played). BBEdit is the reference for the command surface.
- **Character:**
  1. A three-pane source list, Episode table and Inspector, with a persistent bottom player bar in Liquid Glass. The player bar is owner-fixed.
  2. Domain nouns written as capitalised glossary terms everywhere ("Episode", "Playlist", "Entry", "Device").
  3. A brand blue that appears only through AccentColor under Multicolor, and in the monogram artwork placeholders (owner-fixed).
  4. Plain-spoken consequence copy, such as the Rewind preview ("Goes back to / Unplayed again / Back in the Playlist / Kept").
  5. Glass control surfaces at the foot of every sheet and helper window.
- **Owner decisions:** brand accent only as AccentColor (graded normally under APPEAR-02); transport in a bottom player bar; Appearance offers Light, Dark and System (default System, `LibrarySettingsScreens.swift:48`); no customizable toolbar; two-click Unsubscribe with auto-disarm and undo; Liquid Glass on the player bar, Inspector actions, Now Playing and sheet footers; Spotlight indexing deferred; MCP off by default, App Intents on. These are graded, and any cap they cause stands, but none is proposed as a target.

## Flows

- **Tasks run:** none by a flow script. The evidence is an XCUITest tour that captures 35 separate states (`apps/apple/UITour/PodListUITour.swift`) at one window size (1180 × 760 pt), in Light and Dark. It has no per-step measurements file, no injected delays, no timed passes and no minimum or half-screen widths.
- **Consequences:**
  - FLOW-01, FLOW-02, RESP-01, RESP-02 and FOOT-02 are N/O.
  - FLOW-03 is settled from code, and FLOW-04 to FLOW-07 from the captures.
  - The stability sub-score is **N/O**, and Consistency & polish is marked "(partial: no flow run)".
- **Failures:** none can be measured.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library lists (Subscriptions, Views, Playlist, Trash, Search; 01–15, 18) | Inline "Edit status" row, a reserved 32 pt band under the sync line, caption, primary colour, clears after 5 s (`EditingNotice.swift`) | Same row in error red with Retry (`EpisodeEditingViews.swift:152-168`) | None | Labelled "Undo …" button in the same row, plus Edit › Undo | Centred `ContentUnavailableView`: symbol, bold title, secondary sentence ("No History", "Trash Is Empty") | None | Toolbar trailing group (+, settings, Inspector), plus per-row Play/Add icons | Filter summary line above the table ("Published in the last 7 days · Unplayed · …") |
| Inspector (03, 07, 33) | Same edit-status row | Same row | None | Same row | "Select an Episode / Its details and Playlists appear here." centred in a grey column | None | Large circular Play, then a glass icon row | None |
| Task sheets (11–13, 16, 17, 22, 23, 25, 34) | Sheet closes | Field caption in error red under the field, plus an edit-status row above the footer | Rewind preview sheet (34) | Edit › Undo after close | n/a | Sheet | Default button trailing in a glass footer; secondary actions leading | Caption paragraphs inside the form, including "Save applies these settings. Cancel discards changes." (11, 22) |
| Add Podcasts window (24) | Row shows "Subscribed" | `FailureFeedback` inline with Retry | None | None | `ContentUnavailableView` "Find Your Next Podcast", **off-centre** | None | Default **Search** beside the field; **Close** in a glass footer | Caption "OPML import is in Settings…" |
| Now Playing window (26) | n/a | Player error inline | None | None | n/a | None | Glass transport capsule; **Done** in a glass footer | None |
| Settings (27–30) | Applies live | Error red text in the form | None | None | n/a | None | n/a | Caption under Text Size; prose under Import OPML |
| Listening Stats (31) | n/a | n/a | n/a | n/a | Centred "No Listening Yet / Play an Episode to start your Listening log." | n/a | n/a | n/a |
| Getting Started sheet (32) | n/a | n/a | n/a | n/a | n/a | Sheet | **Dismiss** (default) in a glass footer | Numbered steps with menu paths |

**Mismatches**

1. **Form-text column and padding.** New Playlist (13), Add to Playlist (23), Download Rules (25) and Rewind (34) keep 24 pt side padding. Playlist Settings (11, 12) and Subscription Settings (22) start their title 5–8 pt from the sheet edge and clip text at the trailing edge.
2. **Closing a modeless window.** Add Podcasts says **Close**, Now Playing says **Done**, and Getting Started says **Dismiss**. All three are default-styled buttons in the same glass footer.
3. **The same setting has three names.**
   - Settings › General: "Skip intro … sec" (sentence case, unit after the field).
   - Subscription Settings: "Skip Intro (seconds)" (title case, unit in the label).
   - View editor: "Minimum length (Optional) … min".
4. **Section header case.**
   - Title case: "Playback Settings" and "Trash" (`LibrarySettingsScreens.swift:170,187`), "On This Device" (`PodcastScreens.swift:329`), "All Conditions Must Match".
   - Sentence case: "Server connection" and "Publisher feeds" (`LibrarySettingsScreens.swift:73,83`).
   - "On This Device" appears in the same sheet as the picker label "Download Rule on this Device" (22).
5. **List row density for the same kind of list.**
   - All Views rows are 24 pt with no affordance (05).
   - Episode tables are about 54 pt; Subscriptions rows are 62 pt with a chevron (01).
   - Timeline rows are three lines, with a bold title (09).
   - Entries rows use regular-weight titles (06).
6. **Menu-path notation in help copy.** Getting Started uses "File ▸ Add Podcasts…" (32), while Settings uses "View › Bigger" (28).

## Checklist

**Coverage: 89.8% (pass 119 · fail 13 · N/O 15 · N/A 21)**. 147 of the 168 IDs apply, and 132 of those have a pass or fail verdict.

### Failures by severity

**Blocker:** none.

**Major**

- **[APPEAR-04] Selected text in Dark fails contrast in the primary navigation.**
  - With the Multicolor accent (the macOS default), the Dark AccentColor `#9DB1FF` becomes the selection fill, and macOS draws white labels on it:
    - sidebar selection (dark/06 "Default", sampled `#9DB1FF`, white glyphs 255,255,255): **2.06:1**;
    - selected segment "Entries" (dark/06, `#9FB3FF`): **≈2.0:1**;
    - selected table rows (dark/03, dark/33, `#798AD1`), including the 11 pt podcast caption: **3.3:1**.
  - The Increase Contrast Dark variant `#B2C1FF` (`MacAppearance.swift`, `build-mac-app.sh`) works out to **≈1.8:1** from code.
  - Light is fine: `#2B50C8` gives 6.8:1.
  - `MacDefaultButtonStyle` already compensates for default buttons (the dark "Save" in dark/22 has a black label). System-drawn selections can't be compensated that way.
  - **Fix:** make the Dark and Increase Contrast-Dark AccentColor variants dark enough for white text, about L ≤ 0.18 (for example around `#4A68E8`, 4.7:1 with white). Keep `#9DB1FF` only as a foreground tint through the existing `MacRowAccentStyle` / `MacAccentContrast` path. Add the selection pair to `AppearanceTests`.
- **[CTRL-04] The View editor's result limit is an unlabelled-purpose, full-width text field.**
  - "Show (Optional)", with placeholder "All" (16, 17; `ViewEditorScreen.swift:109-113`), is a count limit.
  - It's a 364–381 pt free-text field whose label doesn't say what it limits.
  - Its siblings "Minimum length / Maximum length" use 90 pt numeric fields with a unit.
  - **Fix:** label it "Episodes to Show (Optional)", use the same 90 pt `FormNumbers` field with an "Episodes" unit, and add field-specific validation.
- **[WIN-03] Two sheets clip their content at the default window size.**
  - Playlist Settings (light/11, dark/11, light/12): the form's scroll view is 517 pt wide in a 500 pt sheet (frames in `11-playlist-settings.txt`).
    - The title sits 8 pt from the leading edge.
    - "…when their Episode next becomes Playe[d]" is cut at the trailing edge.
    - The rename text field also overruns the right margin.
  - Subscription Settings (22): the scroll view is 637.5 pt wide in a 600 pt sheet. The title sits 5.5 pt from the edge, and the "Save applies…" line touches the trailing edge.
  - **Cause:** `.formStyle(.columns)` with long `Text` rows proposes an ideal width wider than `ContentSizedPanel(width:)`. The Settings code already notes this ("A columns Form can grow wider than its proposed width", `LibrarySettingsScreens.swift:54-55`), but `PlaylistSettingsViews.swift:184` and `PodcastScreens.swift:349` still use it.
  - **Fix:** constrain sheet content to `width − 48` inside `PodListSheet`, and give caption `Text` rows `.fixedSize(horizontal: false, vertical: true)` with `frame(maxWidth: .infinity)`. Alternatively, move explanatory prose out of the columns form into a section footer.
- **[WIN-05] Transport controls live in a bottom bar (owner decision; graded, not targeted).**
  - Play, skip, seek, Speed and Sleep sit at the window's bottom edge (every library capture).
  - It's mitigated by the Controls menu, Space, ⌘←/⌘→ and the Now Playing window, so nothing is reachable only there.
  - **Fix, if ever reconsidered:** move transport into the toolbar's leading-centre zone, as Music does, and keep the bottom bar for status only.
- **[SYS-05] No Spotlight indexing of Episodes or Podcasts (owner decision: deferred; graded, not targeted).**
  - No `CSSearchableItem` exists anywhere in `Sources`.
  - **Fix:** index Episodes and Podcasts with `CSSearchableIndex`, using `EpisodeEntity` as an `IndexedEntity` so Spotlight and App Intents share identifiers.

**Minor**

- **[VIEW-02]** With the sidebar visible, View shows "**Show** Sidebar" (`menus.txt`, captured with the menu open at state 33, while the toolbar button is labelled "Hide Sidebar" in `33-multi-selection.txt`). **Fix:** confirm in the running app; if it's stale, drive the item from the `NavigationSplitView` column visibility instead of relying on `SidebarCommands` validation.
- **[MENU-04]** Title-case slips:
  - "Bring Library from **this** Mac…" sits beside "Start on **This** Mac" in the same submenu (`LibrarySettingsScreens.swift:86`, menus).
  - The View › Sort by list has "Default **order**".
  - "Speed 1×" and "Sleep Off" are state readouts used as submenu titles, not verb phrases.

  **Fix:** "Bring Library from This Mac…", "Default Order", and "Playback Speed ▸" / "Sleep Timer ▸" with the state shown by checkmarks.
- **[PTR-02]** The Episode context menu isn't concise. It has seven placement items (Play Now, Play Next in Default, Play Last in Default, Play Now in ▸, Play Next in ▸, Play Last in ▸, Add to a Playlist…), plus Resume and Chapter submenus, before the download, share and mark groups (`EpisodeEditingViews.swift:28-77`). **Fix:** keep the three active-Playlist items and Add to a Playlist… in the context menu, and leave the per-Playlist submenus in the Episode menu bar menu.
- **[COPY-01]** Terminology and instructions drift:
  - "Skip intro/sec" (27), "Skip Intro (seconds)" (22) and "Minimum length … min" (16) name the same kind of setting three ways.
  - Getting Started says "Use Add or Play Now", but no control is called "Add" (32).
  - Add Podcasts says "OPML import is in Settings", but it's also File › Import OPML… (24).
  - Settings › Library has both "Import OPML…" and "Choose a File…" for the same action (27; `LibrarySettingsScreens.swift:63`, `OPMLImportContent.swift:24`).

  **Fix:** one label and unit pattern per setting, accurate pointers, and one import button.
- **[COPY-04]** Section headers mix title case and sentence case in the same Settings pane: "Playback Settings" / "Server connection" / "Publisher feeds". The Subscription sheet has "On This Device" beside "Download Rule on this Device". **Fix:** use title case for all section headers and labels.
- **[SYS-02]** No vended Service, for example "Subscribe in PodList" on a selected feed URL, even though the window already accepts dropped feed URLs (`LibraryDrops.swift`). **Fix:** add an `NSServices` entry that routes to the existing `LibraryDrop.feed` path.
- **[SYS-03]** No URL scheme or universal link opens an Episode, Playlist or View in the app. The Info.plist in `scripts/build-mac-app.sh` has no `CFBundleURLTypes`, and there's no `onOpenURL`. **Fix:** a `podlist://` scheme that maps onto the existing `Destination` and `LibraryWindowTarget`.
- **[SYS-06]** No Share extension to subscribe from Safari or other apps. This is relevant for a podcast client, where feeds are found on the web. **Fix:** a Share extension that accepts URLs and calls the same subscribe path.

### N/O

FLOW-01, FLOW-02, RESP-01, RESP-02, FOOT-02, FOOT-01, DATA-05, DATA-07, DRAG-05, DRAG-06, DRAG-07, APPEAR-11, START-01, WIN-10, SET-04

### N/A

- DLG-09 (no popovers); CTRL-02 (no checkbox hierarchies); LIST-05 (no outlines).
- START-04, START-05 (no permission prompts); START-07 (no account creation).
- TOOL-06 (the toolbar can't be hidden or customised; owner decision).
- MENU-06 (no custom modifier alternates).
- FILE-02, FILE-04, FILE-05, DATA-02, DATA-03, DATA-08 (not a document app; OPML is import/export only).
- FMT-01, FMT-02 (no formatted text).
- SYS-07 (no meaningful Dock state).
- EXTRA-01 to EXTRA-04 (no menu bar extra).

### Passes

**Menus and app**

- MENU-01: App, File, Edit, View, Podcast, Views, Episode, Playlist, Controls, Window, Help, in that order.
- MENU-02: toolbar, row, Inspector, context-menu and timeline commands all have menu items (Rewind to Here…, Open in New Window, Show Description, Go to Time…).
- MENU-03: Play/Pause titles, Star/Unstar, the Clear on Played checkmark, dimmed items kept visible.
- MENU-05: one submenu level.
- APP-01 to APP-04: standard App menu.
- FILE-01: New View… ⌘N, New Playlist… ⇧⌘N, Import/Export OPML….
- FILE-03.
- EDIT-01: labelled Undo/Redo from `EditHistory` (`EpisodeEditingViews.swift:234-245`).
- EDIT-02: Copy via `onCopyCommand`, Delete via `onDeleteCommand`, ⌘A.
- EDIT-03: ⌘F is Search Library; Find commands kept.
- EDIT-04: spelling, substitutions, transformations, speech, Dictation, Emoji.
- EDIT-05: Episode transfer offers a rich type, a URL and title text (`EpisodeTransfer.swift:41-47`).
- VIEW-01, WMENU-01 to WMENU-03.
- HELP-01: PodList Help is real task documentation with a shortcut table (`ConnectionViews.swift:76-116`).
- HELP-02.

**Keyboard and text**

- KEY-01, KEY-04, KEY-06: native List/Table/Form controls; sheets focus their first field.
- KEY-07: Space is a documented task key.
- KEY-08: in-app shortcut reference.
- KEY-02, KEY-03, KEY-05: ⌘[ Back, ⌥⌘I Inspector, ⌘L Now Playing; ⇧⌘J and ⌥⌘J are Play Next and Play Last; notation in ⌃⌥⇧⌘ order. `PlaybackKeyboardGuard` keeps Space, Return and ⌘←/→ with text fields.
- TEXT-01, TEXT-02: native fields.

**Windows, toolbar, sidebar**

- WIN-01, WIN-02 (inactive and sheet-parent windows grey their controls and selection in 11–25), WIN-04, WIN-06, WIN-07, WIN-08, WIN-09.
- TOOL-01 to TOOL-05.
- SIDE-01 to SIDE-06: the sidebar uses the system size, with `macTextScale` 1.

**Settings and dialogs**

- SET-01, SET-02 (System is the default), SET-03 (pane toolbar; minimize and zoom dimmed; the Automation pane is shorter), SET-05, SET-06.
- DLG-01 to DLG-08: the only alert is Delete Permanently, which is destructive and states that it can't be undone. Esc and ⌘. cancel sheets.

**Controls and lists**

- CTRL-01, CTRL-03, CTRL-05 to CTRL-08.
- LIST-01 to LIST-04, LIST-06, LIST-07: sortable, resizable `Table`; Return plays; double-click opens the Inspector.

**Data, drag and pointer**

- DATA-01: drafts persisted.
- DATA-04.
- DATA-06: `WindowContext` restores destination, search, selection, sort, tab, columns, scroll anchor and pane widths.
- DRAG-01 to DRAG-04: Episodes drag to sidebar Playlists; feeds and OPML drop into the window; Option-copy; undoable moves.
- PTR-01, PTR-03, PTR-04, PTR-05: a context menu on an unselected row targets only that row.

**Appearance and type**

- APPEAR-01, APPEAR-02, APPEAR-03 (the glass falls back to an opaque, bordered surface under Reduce Transparency and Increase Contrast, `MacGlass.swift`), APPEAR-05 (no custom animation), APPEAR-06 to APPEAR-10.
- TYPE-01 to TYPE-08: curly apostrophes, "…", "–16:34" with a minus sign, "7:24 PM".

**Accessibility and launch**

- AX-01: 51 explicit labels, plus combined sidebar rows with state ("Default, 4, Active Playlist, Clear on Played on").
- AX-02, AX-03 (Text Size 100–200%, View › Bigger/Smaller), AX-04, AX-05.
- START-02, START-03, START-06: standalone mode, no account.

**Flow (from captures and code)**

- FLOW-03: discovery results are dropped unless the query is unchanged, `AddPodcastsWindow.swift:126,130`.
- FLOW-04 to FLOW-07.

**System integration**

- SYS-01: App Intents for play, pause, transport, add, mark, search and list, with Episode and Playlist entities.
- SYS-04: `ShareLink`.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.3** | SF at Mac sizes: 13 pt body; table titles ≈13 pt with 11 pt secondary podcast lines; Title 2 sheet titles. Hierarchy comes mainly from weight and the `#606060` / `#A0A0A0` readable secondary colour (6.3:1 and ≈7:1). Below Strong-high because roles drift: Now Playing sets the Episode title large and Regular over a smaller Bold podcast name, which inverts emphasis (26). Timeline dates are set larger than their event captions (09). The "Download Rule on this Device" label is smaller than its sibling form labels (22, 25). Getting Started's menu-path instruction is smaller than the sentence it explains (32). Clipped glyphs in 11 and 22 also count here. | hierarchy, craft |
| Hierarchy | **7.1** | The squint test passes: source list → table → Inspector reads left to right, and selection drives the Inspector (03, 33). Toolbar emphasis is quiet: borderless symbols, no tinted control. Held back by chrome that eats the content's top: every list starts about 110 pt below the toolbar, after a one-line "Up to date" and an empty 32 pt reserved edit-status band (01–15). On the right, a 92 pt glass player bar and a full-height grey Inspector column frame the list. Per-row accent-blue Add and Play icons repeat on every row (02, 18). | content-first, hierarchy |
| Spacing & density | **6.7** | Mac control sizes throughout (24 pt push buttons, 29 pt fields), and edges align along a 24 pt sheet inset where it holds (13, 23, 25, 34). Competent rather than Strong: the same kind of list has 24 / 54 / 62 pt rows on different screens (05 vs 02 vs 01). Two sheets lose their padding (5–8 pt, 11 and 22). The Add Podcasts empty state is about 100 pt off-centre (24: text centre x = 859 vs window centre 960). The glass footer's 16 pt radius sits 12 pt inside the sheet's own corner, so the corners aren't concentric (11–34). | craft, hierarchy |
| Color & contrast | **6.3** (cap 6.9, APPEAR-04) | Restrained and semantic: system accent for interaction; brand blue only under Multicolor and in monograms; a custom error red with per-appearance variants; red reserved for the armed Unsubscribe (20); Light selection `#2B50C8` at 6.8:1. Sits low in Competent because the default Dark experience fails on the primary navigation: white on `#9DB1FF` sidebar and segment selections at 2.06:1, and table selections at 3.3:1 (dark/03, 06, 33). Increase Contrast Dark is worse (≈1.8:1). Color is not the only signal anywhere (AX-02 passes). | color-restraint, accessibility |
| Iconography | **7.5** | One SF Symbols family at text weight. Standard glyphs for standard acts: `trash`, `square.and.arrow.up` share, `gobackward.15` and `goforward.30`, `sidebar.right` Inspector. Every icon-only control has a tooltip and an accessibility label. Held back by stretched meanings: `eraser` vs `eraser.fill` for Clear on Played on/off, told apart by fill alone (01). The Inspector's five-icon glass row is icon-only for star, played, download and share (03). The repeated per-row icons are borderline decorative density (02). | conventions, craft |
| Consistency & polish | **6.5** (stability N/O; partial: no flow run) (cap 6.9, CTRL-04) | Edge states are designed: an empty state on every list, inline error with Retry, inactive windows greying correctly, Reduce Transparency and Increase Contrast fallbacks, consistent glass footers. Competent rather than Strong because of the inventory mismatches above (sheet padding, Close/Done/Dismiss, three names for Skip Intro, header case, row density), the clipped sheets, the off-centre Add Podcasts empty state, and Rename nested inside Playlist Settings. That nesting gives four commit buttons (Cancel Rename / Save Name inside, Cancel / Save outside) with Save disabled until the inner pair is resolved (12). | craft, stability |
| Clarity | **7.2** | State is legible: "Current Entry", Active Playlist speaker, "6 Episodes · 6 selected", sync "Up to date", the live "6 matching Episodes" count in the View editor (16). The domain glossary is consistent, and the consequence copy is excellent (Rewind preview, 34; Trash retention, 14). Held back by: the vague "Show (Optional)" limit field; sheets that explain their own buttons ("Save applies these settings. Cancel discards changes.", 11, 22); "Show Description" on a description that is already fully shown, which only flips to "Show Less" (18 → 19); the duplicate Import buttons; inaccurate pointers in help copy (COPY-01). | plain-language, feedback |
| Platform fit | **6.9** (cap; uncapped 8.2) | **Looks 7.8:** native unified title bar, source list, `Table`, Settings with toolbar panes, system sheets and the Liquid Glass era. The bottom transport bar is the one foreign-leaning element (WIN-05). **Behaves 8.4:** complete menu bar in standard order with labelled Undo; ⌘, Settings; window restoration; drag in and out; context menus; App Intents; Help with a shortcut reference. Missing: Spotlight, a URL scheme, Services and a Share extension. (7.8 + 2 × 8.4) ÷ 3 = 8.2, capped at 6.9 by WIN-03 and by the owner-decided WIN-05 and SYS-05. | conventions, discoverable-commands |
| Interaction & feedback | **8.0** (partial: code, no running app or timed runs) | Keyboard-fluent: Return plays; Space plays and pauses, guarded in text; ⌥⌘↑/↓ reorder; ⌘⌫ remove; ⌘[ back. Forgiving: Playlist Trash with Restore; undoable Remove, Rewind and Unsubscribe; labelled Undo in menu and inline; drafts survive closing. Modeless where it matters (Now Playing, Add Podcasts windows). Below Exemplary: object settings commit through Save sheets with a nested rename commit (11, 12, 22), not live edits. The Rewind preview is a modal step before an undoable action. The armed Unsubscribe state disarms on a timer. Responsiveness can't be timed. | keyboard-efficiency, forgiveness |
| **Overall** | **6.9** | It serves its task well and is plainly a Mac app: the menus, keyboard model, undo, restoration and drag and drop are better than most SwiftUI Mac apps. Two visible defects still sit on main paths and keep it out of Strong: unreadable Dark selections on the default accent, and settings sheets whose text is clipped. Three categories are held at Competent by caps. The lowest scored category is 6.3, so the cap is 8.3, and 6.9 is below it. The weakness holding Overall down most is Color & contrast. | — |

## What stands between this build and 9.0

1. **The owner-decided caps make 9.0 unreachable as things stand.** WIN-05 (bottom transport bar) and SYS-05 (no Spotlight) are major failures that cap Platform fit at 6.9, and Overall can't be more than 2.0 above the lowest category. While both decisions stand, Overall is limited to **8.9**. Shipping Spotlight removes one cap. The bottom bar keeps Platform fit at or below 6.9 unless transport moves into the toolbar.
2. **Dark selection contrast (APPEAR-04).** A darker Dark and Increase Contrast-Dark AccentColor.
3. **Sheet layout (WIN-03, CTRL-04, and mismatch 1).** Constrain the columns form width inside `PodListSheet`; size and label the View limit field; flatten Rename into an inline field that is saved by the sheet's own Save.
4. **Copy consistency (COPY-01, COPY-04, MENU-04, and mismatches 2–6).** One closing verb for helper windows; one label and unit pattern per setting; title case for headers; accurate help pointers.
5. **Density and hierarchy.**
   - One row rhythm per list kind.
   - Collapse "Up to date" into the window subtitle or the toolbar, and show the edit-status band only when it has content, which removes about 60 pt of empty space.
   - Recentre the Add Podcasts empty state.
6. **Integrations.** URL scheme, Service, Share extension, Spotlight.
7. **Evidence.** A real flow run with measurements and timed passes, at minimum, half-screen and typical widths, to score stability, FLOW-01/02 and RESP-01/02.

## Next step

- **Target:** APPEAR-04, the major failure in the lowest-scoring category, Color & contrast (6.3). It is on the primary task, since every selection in the sidebar, the Playlist section control and the Episode table is affected.
- **Anti-pattern:** none named exactly. It's closest to "brand-colored chrome" under the Color rubric's Broken anchor, but it comes through the system accent mechanism, not a hard-coded fill.
- **Root cause:** one AccentColor value is asked to serve two incompatible roles. The Dark variant `#9DB1FF` was chosen to read as a light foreground tint on dark surfaces. macOS also uses AccentColor as the fill behind white selected text, where a light colour can't reach contrast.
- **Change:**
  - Set the AccentColor Dark variant to a mid-dark brand blue, about `#4A68E8` (white 4.7:1), and the Increase Contrast-Dark variant to about `#3A56D4` (white ≈ 6:1).
  - Keep `#9DB1FF` and `#B2C1FF` only in `MacBrandPalette` for monogram glyphs and foreground tints.
  - Leave the `MacAccentContrast` fallback in place so accent-coloured text and symbols on dark surfaces fall back to `.primary` if the darker accent drops below 4.5:1 there.
  - Extend `AppearanceTests` with selection-fill × white pairs for all four appearances.
- **Principle:** accessibility, color-restraint.
- **Expected effect:**
  - Color & contrast rises into Strong, about +0.8 to +1.2, once the cap lifts.
  - Consistency is unchanged.
  - Accent symbols on dark backgrounds (row Play/Add icons, the "Current Entry" caption) become slightly darker; verify they still reach 3:1 as non-text and 4.5:1 as text, or use the existing primary fallback.
  - The brand-blue signature survives: identical in Light, and still the brand hue in Dark, at a deeper value.
- **Queued after it:** WIN-03 and CTRL-04, the sheet-width constraint and the View limit field, which are one change to `PodListSheet` and `ViewEditorScreen`.
