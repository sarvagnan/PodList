# PodList Mac — UI grade, round 21 (Opus)

Graded build: `apps/apple` at `7997de0`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. Evidence: `podlist-grading/mac-round-21/` (XCUITest tour, Light and Dark, Show Borders pass, `timings.txt`, `menus.txt`) and the code. The app was not launched, and no screen-control tools were used.

Measurements: points are pixels ÷ 2 on the 2× captures. Contrast was measured by sampling the rendered pixels (the background mode against the farthest-luminance glyph pixel), using WCAG relative luminance.

## Frame

- **Task.** Find Episodes through saved Views, Subscriptions and Search, line them up in Playlists, and play them from a persistent bottom player.
- **Target.** Mac app (SwiftUI, macOS 26+).
- **Era.**
  - Captured on macOS 27.2 (26B123) in a VirtualMac2,1 VM, Retina.
  - Built with the macOS 26.0 SDK (minos 26.0) and no `UIDesignRequiresCompatibility` key, so it's a **current build**.
  - Light and Dark set through the app's own Appearance setting. Reduce Transparency and Increase Contrast off; their handling was read from the code. Show Borders on in `borders-*`.
- **Posture.** Sovereign: an all-day library and player.
- **Audience.** Perpetual intermediate.
- **Nearest exemplar.** Things for the calm, list-first library, and Apple Podcasts/Music on macOS 27 for the floating playback capsule.
- **Character.**
  - Monogram artwork tiles (MH, DF, SB) in pale brand-blue squares.
  - Two-line Episode rows: title, then the Podcast in secondary text, with quiet row actions (Add, Play) that come forward on selection.
  - A one-line status row at the top of every list ("Up to date", "Undone: …") that also carries Undo and Redo.
  - Plain-spoken domain nouns, always capitalized: Episode, Playlist, View, Entry, Position.
  - A deep brand blue accent under Multicolor (owner-fixed).
- **Owner decisions recorded.** These are graded but aren't targets:
  - **Appearance and accent:** brand AccentColor; Light, Dark and System options; selected Settings tab label drawn in the accent.
  - **Liquid Glass placement:** player bar, Inspector actions, Now Playing, and the footers of scrolling sheets.
  - **Panes:** two-pane rule below about 950 pt; the Inspector follows selection only in wide windows; the Inspector opens at the default width.
  - **Toolbar:** one Playlist toolbar group; the toolbar isn't customizable.
  - **Naming:** the menu is called Saved Views.
  - **Unsubscribe:** two clicks on the Podcast page.
  - **Undo:** scope rules for the status-row Undo button.
  - **Sheets:** Mark All Played lives outside Subscription Settings; deleted-Playlist sheet behaviour.
  - **Timeline:** "Rewind to Here…" shown only on the selected row.
  - **Responsiveness:** accepted RESP-01 misses for sidebar navigation and the New Playlist sheet.
  - **Integrations:** MCP is off by default.

## Flows

- **Tasks run.** The XCUITest tour (`apps/apple/UITour/PodListUITour.swift`) runs these as one flow:
  - browse Views, Subscriptions and Search;
  - select an Episode and open the Inspector;
  - multi-select;
  - add to a Playlist, remove an Entry, then Undo and Redo;
  - Playlist Settings, rename, delete and restore;
  - New Playlist and New View, then edit a View;
  - Podcast page: arm and disarm Unsubscribe, open Subscription Settings;
  - Timeline Rewind;
  - Settings, Now Playing, Listening Stats and Getting Started;
  - a delayed-completion probe (44): Undo of an Entry removal lands while the person is typing in toolbar Search.
- **Widths.**
  - Default: 1180 × 760 pt.
  - Minimum: 760 × 552 pt (35, 36, 43).
  - Half display: 960 × 1080 pt (37–39).
  - Large sidebar with 30 Views and 30 Playlists (40–42).
- **Appearances.** Light and Dark, with a Show Borders pass in each.
- **Timed runs.**
  - 5 samples per step in each appearance, measured in-app from the input event to the first presented frame.
  - The VM was a VirtualMac2,1 (4 CPU, 8 GiB) on a shared, heavily loaded host.
  - RESP-02 keystroke and drag timing wasn't measured.
- **Measurements.** There's no separate measurements file. The per-step accessibility snapshots (`light|dark/NN-*.txt`) carry the frame of every element, and they were used as the measurement rows. The screenshot strips are `light/` and `dark/`.
- **Core elements tracked.**
  - Toolbar Play (`toolbar.play`): x = 1185.5 on every View and Playlist screen.
  - Search (`library.search`): x = 1435.5 on every screen, at the default width.
  - Status row (`library.status`): y = 250.5, growing in place to a 24 pt high row when Undo appears.
  - List header: y = 274 on Playlists and y = 310 on Views, unchanged across 06 → 10 → 11a → 12 → 13 → 44 and 02 → 16 → 17 → 23 → 33.

**Flow failures:** none.
- **FLOW-03 probe (44).** The typed "Inflation" and the selection survive the late Undo. "Show Restored Entries" and "Redo Remove from Playlist" appear in the status row without moving the list header.
- **Non-core change (recorded under APPEAR-11).** On the Podcast page the Episode table's column split differs after the description is expanded and collapsed. The Published header is at x = 1184.5 in 18, 1180 in 19, and 1197 in 20 and 21 (+12.5 pt), and the Episode column grows from 579.5 to 592.

**Timings (p75 / max, ms).**

| Step | Light | Dark | RESP-01 (200 ms) |
|---|---|---|---|
| Sidebar → New this week list | 486.9 / 498.7 | 406.7 / 425.9 | miss (owner-accepted) |
| Select Episode → Inspector (pane opens) | 324.9 / 491.5 | 302.3 / 334.2 | **miss** |
| Select Episode → Inspector (pane already open) | 291.2 / 333.1 | 214.6 / 266.9 | **miss** |
| ⇧⌘N → New Playlist sheet | 672.3 / 674.8 | 601.1 / 670.1 | miss (owner-accepted) |
| ⌘, → Settings window | 305.1 / 325.2 | 425.4 / 527.6 | **miss** (not a main task; recorded) |
| Final "e" of "rice" → filtered list | 116.6 / 126.8 | 89.0 / 90.2 | pass |

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View / Search list (02, 15, 33) | Status row, top-leading caption, e.g. "Undone: …"; neutral | Status row `FailureFeedback` + Retry (code: `LibrarySyncStatus`); neutral | Sheets (23 Add to Playlist) | Status row trailing bordered button "Undo/Redo ‹operation›" (23, 33 "Redo Edit View") | Centred icon + bold title + body (code `PodListEmptyState`) | none | Toolbar Play, trailing group | Filter summary line under status ("Published in the last 7 days · …") |
| Playlist Entries / History / Timeline (06, 09, 44) | Status row "Undone: Remove from Playlist" | Status row with Retry | Rewind sheet (34) | Status row "Redo Remove from Playlist" + "Show Restored Entries" (44) | Same pattern | none | Toolbar Play (same x) | "Current Entry" inline badge |
| Podcast page (18–21) | Button state change (Subscribed ↔ red Unsubscribe) | Status row | none | Status row (code) | — | none | Toolbar Play (x = 1219: no 4th button) | "Show Description" link |
| Subscriptions (01, 25) | Status row | Status row | Download Rules sheet | Status row | Group header only | none | "Edit Download Rules…" button, trailing in content | "Grouped by Download Rule" caption |
| Trash (14) | — | — | Permanent-delete alert (code) | Status row | Trash icon + "Trash Is Empty" + 30-day explanation | none | — | Empty-state body |
| Sheets (11, 11a, 13, 16, 22, 23, 25, 34) | Sheet closes; Undo in status row | Inline field validation (code `FormValidationVisibility`) | The sheet itself | — | — | 11a: top-of-sheet note "“Commute” is in the Trash. To change its settings, restore it first…" | Default button trailing (Save / Add / Create Playlist / Rewind / Close) | Caption-size grey note under the control |
| Settings (27–30) | Live apply, no confirmation | `FailureFeedback` inline (Automation) | — | — | — | — | — | Caption-size grey notes in the group |
| Add Podcasts / Listening Stats / Getting Started (24, 31, 32) | — | Inline under field (code) | — | — | Icon + bold title + body, plus a button in 31 | — | Search (24), Open Active Playlist (31), Hide Getting Started (32) | Inline hint under the field (24) |

**Mismatches.**
1. **Undo labels don't follow one pattern.** "Undo Delete Playlist", "Redo Edit View" and "Redo Remove from Playlist" name the operation, but "Redo Settings for Commute" (13) names the object. Screens: 11a, 13, 23, 44.
2. **The leading slot in sheet footers carries two different meanings.**
   - It holds a destructive action in 11 ("Delete Playlist") and 16 ("Delete View").
   - It holds alternative primary actions in 23 ("Play Now", "Play Next"), in the same neutral bordered style.
3. **Help is reachable from two menus.** "PodList Help" and "Getting Started" appear in both the Window menu and the Help menu (`menus.txt`), so help has two homes.

Nothing else differs: errors, empty states and notes use one place and one voice throughout.

## Checklist

**Coverage: 95.9%** (pass 138 · fail 4 · N/O 6 · N/A 21). 169 IDs: 81 core and 88 Mac. 148 are applicable, and 142 of those have a pass or fail verdict.

### Failures by severity

**Blocker:** none.

**Major**

- **[RESP-01] Selecting an Episode misses the 200 ms limit in both appearances.** Evidence (`light/timings.txt`, `dark/timings.txt`):

  | Step | Light p75 | Dark p75 |
  |---|---|---|
  | Select Episode → Inspector, pane opens | 324.9 ms | 302.3 ms |
  | Select Episode → Inspector, pane already open | 291.2 ms | 214.6 ms |
  | ⌘, → Settings (not a main task) | 305.1 ms | 425.4 ms (max 527.6) |

  - The sidebar-navigation (407–487 ms) and New Playlist (601–672 ms) misses are owner-accepted and recorded only.
  - Selection is the most repeated step in the primary task, so this check fails on its own.
  - *Fix:* make the row's selected state paint in the input frame, and build the Inspector after that frame:
    - give the Inspector a stable identity keyed on the selected row, so its subtree isn't rebuilt;
    - defer show-notes and chapter work with `.task(id:)`;
    - keep `EpisodeInspector` from reading the whole `LibraryModel` (observation fan-out);
    - profile with the SwiftUI instrument, aiming for a p75 under 150 ms in the VM.

- **[APPEAR-04] Recurring control and status text is below 4.5:1, and the selected Settings tab is below the system-accent floor.**
  - **Sidebar command rows** ("New View…", "New Playlist…", "Add Podcasts…") measure **3.07:1** in Light (#888786 on #eeedec) and **3.20:1** in Dark (#787373 on #2b2626). Captures: `light|dark/02-new-this-week.png`.
    - These are 13 pt enabled button labels on every Library screen, so the failure is major.
    - The cause is `SidebarCommandButton` in `MacWindow.swift:1018` (`.foregroundStyle(.secondary)` on a borderless button in the vibrant sidebar).
    - The section headers drawn beside them reach 5.38:1 and 5.70:1, so the secondary colour isn't the limit.
  - **Toolbar Search scope caption** ("This list" / "Library" / "Episodes") measures **3.99:1** Light (#7e7e7e on #fdfdfd glass) and **4.13:1** Dark. The caption is the only visible statement of the search scope (CTRL-07) and appears on every screen. Code: `LibraryToolbarSearch`, `MacWindow.swift:1047` (`.font(.caption).foregroundStyle(.secondary)`).
  - **Selected Settings pane label** "General" in Dark measures **1.73:1** (#435fdd on #484747 pill, `dark/27-settings-general-top.png`).
    - The floor for system-drawn accent text is 2.5:1 in Dark, so this falls in the major band.
    - Light measures 7.69:1.
    - The owner accepts this label. It's recorded and keeps its severity, but it isn't the target; the two rows above fail on their own.
  - *Fix:*
    - draw the sidebar command titles with `MacReadableSecondaryStyle()` (the style the counts already use) or `.primary`, keeping the accent `plus` glyph;
    - draw the scope caption with `MacReadableSecondaryStyle()`;
    - re-measure the caption over the glass with content beneath it, aiming for ≥ 4.5:1.

**Minor**

- **[APPEAR-11] Layout shifts in non-core content and toolbar chrome that the person didn't cause.**
  - **Podcast-page columns.** The column split changes after an unrelated interaction: the Published header goes from x = 1184.5 (18) to 1180 (19) to 1197 (20, 21), and the Episode column from 579.5 to 575 to 592 pt.
  - **Toolbar capsules.** The `ControlGroup` in `EpisodeActionButtons` (`EpisodeEditingViews.swift:155`) renders as one glass capsule in some states and three in others. Crops of 02 and 03 show this; it's also one capsule at the minimum width (35) and three on the Playlist at half display (39).
    - The icons shift by up to 4 pt as a result.
    - The owner-stated "one group" is not what renders.
  - **Episode header patch.** In 36 (both appearances) the first column header cell paints a lighter rectangle behind "Episode" while rows scroll beneath it.
  - *Fix:*
    - pin the Podcast-page column widths with explicit `.width(min:ideal:)` and keep them across a description toggle;
    - force a single toolbar background (`.sharedBackgroundVisibility` / one `ToolbarItemGroup`), or accept the split and stop describing the group as one;
    - remove the header-cell background.

- **[TYPE-06] Show Notes in the Inspector run at a ~42-character measure in caption-size type.** At the default width (03, 07) a line holds ~42 characters ("Who sets the price of rice?. An episode of"), set at ~11 pt. Show notes are reading text.
  - *Fix:* set Show Notes in body size (13 pt) with ≥ 1.3 line spacing. A 270 pt Inspector then gives ~38–45 characters, so also offer "Show Notes" in its own resizable section, or let the remembered wider Inspector width carry the notes.

### N/O

RESP-02, FOOT-02, FOOT-01, WIN-10, DRAG-06, START-01.

FOOT-02: the only evidence is the Settings open at 305–425 ms p75 (max 527.6). That suggests a micro-hang, but the watchdog samples only stalls of 5 s or more, so a hang of 250 ms or more can't be proven.

### N/A

- **No document model:** FILE-02, FILE-04, FILE-05, FMT-01, FMT-02, DATA-02, DATA-03, DATA-08.
- **No checkbox hierarchy:** CTRL-02.
- **No permission prompts or account creation:** START-04, START-05, START-07.
- **No menu bar extra:** EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04.
- **No panels or popovers:** DLG-08, DLG-09.
- **No generated content:** COPY-05.
- **No meaningful Dock state, and no Dock menu in the code:** SYS-07.
- **No autoplaying or critical alert audio; playback is always requested:** AX-05.

### Passes, with evidence

**Flow stability**
- FLOW-01: core frames are identical across all default-width steps (see Flows).
- FLOW-02: in 44 the focus and caret stay in Search.
- FLOW-03: probe 44.
- FLOW-04: Undo and Redo sit in the top status row, never under the bars (39, 44).
- FLOW-05: list and Inspector tops are aligned (03, 07).
- FLOW-06: no empty section shells; the Stream group has rows.
- FLOW-07: Play stays in the trailing toolbar group.

**Keyboard**
- KEY-01: every row, toolbar and Inspector action has a menu command (`menus.txt`). Lists are native `Table`/`List`.
- KEY-04: sheets focus Name (11, 13, 16, 22).
- KEY-06: ⌘-letter, ⌥⌘ and ⌘-arrow bindings in `KeyboardShortcuts.swift`.
- KEY-07: native scroll views.
- KEY-08: in-app shortcut list (`ConnectionViews.swift` `shortcutRow`); `PlaybackKeyboardGuard` routes bare Space and Return away from text.
- KEY-02 is a pass with a nit: ⌘F is bound to both "Search Library" and Find… (`LibraryCommands.swift:130`).
- KEY-03: frequent commands have ⌘ shortcuts (⌘R, ⌘L, ⇧⌘E, ⇧⌘L, ⇧⌘J).
- KEY-05: ⌥⇧⌘ order in `notation`.

**Alerts, sheets, panels & popovers**
- DLG-01: the only alerts are a bad link and Delete Permanently.
- DLG-02: "Delete “X” Permanently?"
- DLG-03 and DLG-05: verbs on buttons; destructive role.
- DLG-04: `.cancelAction` on Cancel and Close.
- DLG-06: one sheet at a time.
- DLG-07: 11a shows Restore Playlist and Close only.

**Controls**
- CTRL-01: pop-ups, checkboxes and a grouped-form switch (16, 22, 27).
- CTRL-03: labelled fields.
- CTRL-04: validation in `FormValidationVisibility`; "No limit" placeholders.
- CTRL-05: system and `MacButtonShape` styles.
- CTRL-06: the ⋯ menu holds related actions, and Play and Add stay visible.
- CTRL-07: scope caption shown; no search history.
- CTRL-08: OPML import progress with Cancel; download Cancel.

**Lists, tables & outlines**
- LIST-01 and LIST-02: flat tables with noun headings.
- LIST-03: sortable headers (Published ⌄ in 18).
- LIST-04: tail-truncated titles with full-title tooltips.
- LIST-05: sidebar sections fold (42) and are persisted in `WindowContext.collapsedSidebarSections`.
- LIST-06: accent selection.
- LIST-07: `typeSelectingRows`, `primaryAction` double-click, Return plays.

**Documents & data safety**
- DATA-01: sheet drafts survive Trash and Restore (README, 11a).
- DATA-04 and EDIT-01: "Undo Restore Playlist" / "Redo Edit View" in Edit.
- DATA-05: "Show Restored Entries".
- DATA-06: `@SceneStorage` `WindowContext` holds destination, selection, sort, scroll anchor, pane widths, Inspector and sections.
- DATA-07: `NSOpenPanel`, and `NSSavePanel` with "PodList.opml".

**Drag & drop**
- DRAG-01: Episodes drag out as a rich type, URL and text, and drop on sidebar Playlists. OPML and feed URLs drop on the window. Menu equivalents exist.
- DRAG-02: reorder moves, and a drop on another Playlist adds.
- DRAG-03: drops go through edit history.
- DRAG-04: multi-row payload.
- DRAG-05: system drag image; failed drops get "Retry Failed Episode Drop".
- DRAG-07: native tables.

**Pointer & context menus**
- PTR-01, PTR-02 and PTR-05: `contextMenu(forSelectionType:)` on every table, plus sidebar row menus. They have two or three groups and show no shortcuts.
- PTR-03: native.
- PTR-04: `.help` on every icon button; the truncated title appears as a tooltip (03).

**Appearance**
- APPEAR-01: Light, Dark and System, with System the default (`LibrarySettingsScreens.swift:51`).
- APPEAR-02: `MacAccentForegroundStyle` uses the brand only under Multicolor.
- APPEAR-03: `MacGlassSurface` turns opaque with a border under Reduce Transparency and Increase Contrast. The Show Borders captures draw edges on the custom controls (borders-light/03, borders-dark/13).
- APPEAR-05: no custom animation.
- APPEAR-06 and APPEAR-07: regular glass only on controls.
- APPEAR-08: toolbar and header stay legible over scrolled rows (36); the sidebar fades under the traffic lights (41).
- APPEAR-09 and APPEAR-10: consistent SF Symbols and distinct controls.

**Typography & sizing**
- TYPE-01: 13 pt body. The row title is 162.5 pt wide for 27 characters.
- TYPE-02, TYPE-03 and TYPE-07: system font, Regular to Bold weights.
- TYPE-04: 28 pt row buttons and 32 pt sidebar rows.
- TYPE-05: `MacReadingRow` reflows at larger text sizes.
- TYPE-08: curly quotes and … everywhere; only fixture text has straight quotes.

**Writing & copy**
- COPY-01: specific verbs.
- COPY-02: drop and sync errors carry a next step.
- COPY-03: designed empty states (14, 24, 31).
- COPY-04: tooltips are short fragments.

**Accessibility**
- AX-01: every control in every snapshot is named, including Settings and sheets. The only unnamed buttons are scroll-bar parts and traffic lights.
- AX-02: state is shown by symbol and text ("Playback State" image with value).
- AX-03: Text Size runs 100–200% in Settings and View › Bigger/Smaller.
- AX-04: names and menu routes exist.

**Launch, onboarding & accounts**
- START-02: Getting Started can be hidden and reopened from Help.
- START-03: help is contextual.
- START-06: "Start on This Mac" without a server.

**Edit commands**
- EDIT-02: standard items present.
- EDIT-03: Find submenu kept.
- EDIT-04: Spelling, Substitutions, Transformations, Speech, Dictation and Emoji present.
- EDIT-05: `SelectionCopyContent` copies text and URL.

**Windows**
- WIN-01, WIN-09: standard frame.
- WIN-02: gray selection behind sheets (11, 34).
- WIN-03: State column becomes an icon at narrow widths; sections drop below the toolbar at ≤ 1100 pt (35, 37, 39).
- WIN-04: titles name the view.
- WIN-05 (playback bar): playback controls only; every action is in the Controls menu; errors also appear in the subtitle and as Retry Playback; scroll content gets `contentMargins` and `safeAreaPadding` (41).
- WIN-06, WIN-07 and WIN-08: full screen, Open in New Window, New Window.

**Toolbars**
- TOOL-01 to TOOL-05: navigation leading, three groups, no tinted button, segmented sections.
- TOOL-06: sidebar and Inspector both come back.

**Sidebars & split views**
- SIDE-01, SIDE-02: leading sidebar, one level deep.
- SIDE-03: toolbar button plus Hide/Show Sidebar ⌃⌘S and Hide Inspector ⌥⌘I.
- SIDE-04: persistent highlight.
- SIDE-05: 0.5 pt splitter.
- SIDE-06: the sidebar keeps the system metric (`macTextScale` 1).

**Settings**
- SET-01: a single Settings window.
- SET-02: System is the default.
- SET-03: noncustomizable panes; min and zoom dimmed.
- SET-04: pane persisted in `PodList.settingsPane`.
- SET-05: changes apply live.
- SET-06: no restore of the Settings window.

**Menu bar and App menu**
- MENU-01: standard order with app menus between View and Window.
- MENU-02: every toolbar, context and status-row command appears in a menu.
- MENU-03: dimmed items stay; toggles use Pause/Play and Star/Unstar.
- MENU-04: ellipses used correctly.
- MENU-05: one submenu level.
- MENU-06: system alternates.
- APP-01 to APP-04: standard App menu; Services provider registered.
- FILE-01, FILE-03: standard File items.
- VIEW-01 and VIEW-02: View menu with state titles.
- WMENU-01 to WMENU-03: standard Window menu.
- HELP-01 and HELP-02: PodList Help window; system Help search kept.

**Text system**
- TEXT-01, TEXT-02: native text fields.

**System integration**
- SYS-01: App Intents.
- SYS-02: Add to PodList Service.
- SYS-03: `podlist://` links.
- SYS-04: ShareLink.
- SYS-05: Spotlight.
- SYS-06: Share extension.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.8** | System font throughout with a small role-based scale: 13 pt body titles, ~11 pt Podcast and caption lines, bold 22 pt Inspector title, semibold section heads. Type alone tells row structure (02, 07). Two things hold it below 8: Timeline rows put the date at title size in secondary colour above an 11 pt event line (09), and Show Notes are caption-size at a ~42-character measure (TYPE-06, minor). "Maximum length (optional)" wraps while its sibling doesn't (16). | hierarchy, craft |
| Hierarchy | **7.9** | List-first, and chrome recedes. Toolbar emphasis stays within three groups with no tinted button. Selection brings the row actions forward. The Inspector's 70 pt black Play disc is the strongest shape on screen (03), heavier than the list it serves. The Podcast page lines up five equal-weight buttons (18). | content-first, hierarchy |
| Spacing & density | **7.7** | One rhythm: 32 pt sidebar rows, 47.5 pt two-line Episode rows, a shared 14 pt leading edge from the status row to the table. Mac-sized. Sheets have ragged pop-up widths (16, 22). The Settings General pane scrolls inside a 768 pt window. Now Playing, a fixed-size window, shows a scroll bar for a few points of overflow (26). | craft, conventions |
| Color & contrast | **6.6** (cap 6.9: APPEAR-04 major) | Restrained, with meaningful colour. Accent text is measured: selected row 9.2:1 and 10.0:1; "Current Entry" 6.8:1 and 7.7:1. The secondary style the app built passes at 5.3–6.3:1. Three things pull it down: the sidebar command rows (3.07:1 and 3.20:1), the search scope caption (3.99:1 and 4.13:1), and the Dark Settings tab (1.73:1). | color-restraint, accessibility |
| Iconography | **8.0** | One SF Symbols family matched to text weight. Standard glyphs: trash, share, star, checkmark, download. Every icon button has a tooltip and a name. "text.line.last.and.arrowtriangle.forward" for Add to a Playlist takes learning. | conventions, craft |
| Consistency & polish | **7.5** (stability 8.2, both appearances) | States are designed throughout: empty (14, 24, 31), inactive window, disabled, Trash, narrow width and Show Borders. Drags back it off: the toolbar capsule splits by state, the Podcast-page column split shifts, the header-cell patch, and three inventory mismatches. Stability 8.2: core elements hold to 0 pt at the default width through Undo, sheets and the delayed-completion probe; a few non-core shifts and wording mismatches remain. | craft, stability |
| Clarity | **8.0** | Plain domain words. The scope is shown in Search, and state is visible ("Up to date", "Current Entry", "In the Trash · 3 Entries", "Undone: …"). Settings mixes navigation buttons into an options pane (Listening Stats, Getting Started, Refresh Now; 27). "Edit Download Rules…" sits disabled without saying it needs a selection (01). | plain-language, feedback |
| Platform fit | **8.5** (Looks 8.4, Behaves 8.6) | **Looks:** native frame, sidebar, toolbar glass, Settings toolbar panes, Mac controls and density. The custom toolbar search field and the grey "+ New …" sidebar rows are Adapted. **Behaves:** a complete menu bar with state titles, rich context menus, drag in and out, scene restoration, Services, Spotlight, App Intents, `podlist://` links, a Help window and text scaling. Deductions: duplicate ⌘F, ⌥⇧⌘N for New Window, and Help items duplicated in the Window menu. (8.4 + 2 × 8.6) ÷ 3 = 8.5. | conventions, discoverable-commands |
| Interaction & feedback | **6.9** (cap 6.9: RESP-01 major) | Underlying behaviour is Strong: undo instead of confirmation, labelled Undo, late completions that never touch input, keyboard routes for every action, type-select and drag. Selecting an Episode takes 214–325 ms p75 to show its result. Opening Settings takes 305–425 ms. | feedback, forgiveness, keyboard-efficiency |
| **Overall** | **7.6** | It serves the task well and is at home on macOS 27. The lowest category is 6.6, so Overall can't go above 8.6. What holds it down most is selection latency in the primary task, then contrast on recurring secondary controls. | — |

## What stands between this build and 9.0

1. **RESP-01.** Episode selection to the Inspector must answer within 200 ms at p75 (now 291–325 ms Light and 215–302 ms Dark). Settings should open in under 200 ms too. Until then Interaction & feedback stays capped at 6.9. The owner-accepted sidebar and New Playlist misses (407–672 ms) also keep the app out of "every action answers at once".
2. **APPEAR-04.** Fix the sidebar command rows and the search scope caption so they reach 4.5:1. The Dark Settings tab label at 1.73:1 will keep this check failing while the brand accent is used there. That's an owner decision, so Color & contrast can't pass 6.9 unless the accent's Dark value, or its use in the Settings tab, changes.
3. **Polish (APPEAR-11, TYPE-06).**
   - One stable toolbar capsule.
   - Stable Podcast-page column widths.
   - The header-cell patch removed.
   - Body-size Show Notes.
   - Equal-width pop-ups in sheets.
   - Now Playing sized to its content.
4. **Consistency.** One Undo/Redo wording pattern (operation, not object). Keep destructive actions alone in the leading sheet slot. Move Listening Stats, Getting Started and Refresh Now out of the Settings options.

## Next step

- **Target.** APPEAR-04, the major failure in the lowest-scoring category (Color & contrast 6.6). It's narrowed to the parts that aren't owner decisions: the sidebar command rows and the toolbar search scope caption.
- **Anti-pattern.** Low-contrast "quiet" controls: secondary styling applied to actionable labels.
- **Root cause.** Plain `.secondary` is applied to a borderless button label in the vibrant sidebar (`MacWindow.swift:1018`) and to the scope caption on toolbar glass (`MacWindow.swift:1047`). Vibrancy blends it down to ~#888 on #eeedec. The app's own `MacReadableSecondaryStyle`, used for the counts beside it, already measures 5.38:1.
- **Change.**
  - Use `MacReadableSecondaryStyle()` for the `SidebarCommandButton` title, and keep the `plus` glyph in `MacAccentForegroundStyle`. This sets the readable value apart from the selectable rows by the glyph and the ellipsis, not by fading.
  - Use the same style for the `LibraryToolbarSearch` caption.
  - Re-measure both in Light and Dark, and with Increase Contrast, aiming for ≥ 4.5:1. Measure the caption over the glass with content scrolled beneath it.
- **Principle.** accessibility, color-restraint.
- **Expected effect.**
  - The two app-owned APPEAR-04 instances clear.
  - Color & contrast rises toward the Strong band, but stays capped at 6.9 while the owner-accepted Dark Settings tab label fails its floor.
  - No signature element changes. The grey "quiet" command rows keep their place and their plus glyph.
