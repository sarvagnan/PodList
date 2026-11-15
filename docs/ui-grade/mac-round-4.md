# PodList for Mac: UI grade, round 4 (Opus)

Build: `c4e05eb` (`apps/apple`). Evidence: `~/Documents/podlist-grading/mac-round-4/` (35 XCUITest states × Light/Dark, PNG at 2× plus accessibility trees, `menus.txt`), plus the code. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. I graded this build on its own and did not read any earlier report.

Measurement notes. The captures are 2× and the main window is 1180 × 760 pt, so points = pixels ÷ 2. I read frames from the `.txt` trees and sampled colors from the PNGs with ImageMagick. Contrast uses the WCAG formula.

## Frame

- **Task:** find Episodes worth hearing (Views, a Podcast page, Search), line them up in Playlists, then listen and steer playback.
- **Target:** Mac app (SwiftUI, macOS 26+, captured on macOS 27.2).
- **Posture:** sovereign library window, with playback that keeps running in the background (bottom player bar, separate Now Playing window).
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, a calm personal list tool. BBEdit is a secondary reference for command completeness and forgiveness.
- **Character (signature elements):**
  1. A brand blue accent: `#2B50C8` Light, `#9DB1FF` Dark (owner-fixed).
  2. Initials tiles ("MH", "DF", "SB") as artwork placeholders, in a pale accent tint.
  3. A capitalized domain glossary: Episode, Playlist, Entry, View, Position, Listening Timeline.
  4. A Liquid Glass bottom player bar (owner-fixed).
  5. Plain copy that explains consequences: the Rewind summary, the Clear on Played note, "kept for 30 days".
- **Owner decisions (scored, never the target):**
  - The brand accent replaces the user's accent on controls.
  - Transport lives in a bottom player bar.
  - Settings › Appearance offers Light, Dark and System.
  - There is no customizable toolbar.
  - Unsubscribe takes two clicks and disarms by itself.
  - Liquid Glass is used on the player bar, Inspector actions, Now Playing and the View editor footer.
  - Spotlight is deferred.
  - The MCP server is off by default and App Intents are on.

## Flows

- **Tasks captured:** the XCUITest tour (`apps/apple/UITour/PodListUITour.swift`) drives the real app through 35 states in Light and Dark, at one window size (1180 × 760 pt): browse a View, select, open the inspector, Playlists and their sections, Rewind, Playlist settings and rename, new Playlist/View, Trash, search, a Podcast page with Unsubscribe armed and disarmed, Add to a Playlist, Add Podcasts, Download Rules, Now Playing, Settings, Listening Stats, Getting Started, and multi-select.
- **What the tour isn't:** a flow run in CRITIQUE's sense. It records no per-step measurements file and no focus or scroll values. It has no injected delays, no timed passes, and no minimum or half-screen widths.
- **Consequences:** FLOW-01/02/03, RESP-01/02 and FOOT-02 are **N/O**, the stability sub-score is **N/O**, and Consistency & polish is marked "(partial: no flow run)".
- **Before/after pairs from the tour, reported as findings under other checks:**
  - **Playlist section header (06/08 → 09, `.txt`):** choosing Listening Timeline hides the inspector and switches the header to its labeled form. The segmented control moves 99 pt to the right (Entries x 607 → 706). The clicked segment slides out from under the pointer, and a second click at the same spot lands on History. The person caused this, so FLOW-01 doesn't fail, but it is a layout jump (APPEAR-11).
  - **Unsubscribe (18 → 20 → 21):** arming widens the button by 7.5 pt and pushes Share Podcast, Copy Feed Address and the gear right by 7.5 pt (849 → 856.5). The automatic disarm moves them back with no input, an unprompted shift of non-core controls (APPEAR-11).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View / Search / Playlist lists (02, 06, 15) | "Edit status" band, 32 pt, top of content under the sync line; caption, primary color, gone after 5 s (`EditingNotice`) | Same band, `podListError` red, plus Retry | none | Same band: "Undo ‹name›" button, plus Edit › Undo ‹name› | Inspector: centered `ContentUnavailableView`, "Select an Episode" | none | Toolbar trailing (Play, Add, More); inline row buttons | View description line above the table |
| Playlist History (08) | as above | as above | none | as above | Centered: "No History" + one-sentence explanation | none | Segmented section control; icon-only Play | none |
| Listening Timeline (09, 34) | as above | as above | Rewind sheet with a consequence summary | as above | n/a | none | Bordered "Rewind to Here" on every row; labeled "Play This Playlist" | none |
| Podcast page (18–21) | as above | Inline `FailureFeedback` above the count | Unsubscribe armed in place (red, 4 s) | Band + Edit menu | "No Episodes Yet" + Refresh (code) | "Reading Episodes…" | Subscribed/Unsubscribe, leading in the action row | none |
| Subscriptions (01) | band | band | none | band | n/a | none | "Edit Download Rules…" trailing, **disabled without explanation** | "Grouped by Download Rule" |
| Trash (14) | band | band | Delete Permanently alert (code) | band | Centered: "Trash Is Empty" | none | none | Description line repeats the empty-state text |
| New Playlist sheet (13) | closes | "Edit status" row above buttons | none | n/a | n/a | none | **"Create Playlist"**, bottom trailing, disabled until named, label **1.09:1** while disabled | none |
| New/Edit View sheet (16, 17) | closes | status row above footer | none | n/a | n/a | none | **"Done"**, enabled with an empty name, in a **glass footer**; Name label **right-aligned in a column** | "15 matching Episodes", top right |
| Playlist Settings sheet (11, 12) | live | status row | none | n/a | n/a | none | "Done" bottom trailing; rename edits **inline** with its own Cancel Rename / Save; Name label **above** | Clear on Played note |
| Add to a Playlist sheet (23) | closes | status row | none | n/a | n/a | none | **"Play Next" default, second from the trailing edge** (Play Now · Play Next · Play Last) | none |
| Download Rules sheet (25) | closes | status row | none | n/a | n/a | none | "Apply", bottom trailing | one-line explanation |
| Add Podcasts sheet (24) | n/a | inline | none | n/a | Centered: "Find Your Next Podcast" | none | "Search" beside the field; **"Done" not prominent** | Example feed URL; OPML note |
| Settings (27–30) | live | inline | none | n/a | n/a | none | n/a | Help text **clipped at the right edge** |
| Listening Stats window (31) | n/a | n/a | none | n/a | **An empty chart with axes and an empty "Top Podcasts" heading**, plus one top-line sentence | none | n/a | Footnote |
| Now Playing window (26) | n/a | n/a | none | n/a | n/a | none | "Done" in a glass footer | none |
| Getting Started (32) | n/a | n/a | none | n/a | n/a | none | **"Dismiss"** | Three numbered steps |

**Mismatches**

1. **Create-action wording and state.** New Playlist uses "Create Playlist", disabled until there is a name. New View uses "Done", enabled with an empty name (13 vs 17; `ViewEditorScreen.swift:127`).
2. **Name-field layout.** The label is inline-leading in New Playlist (13), above the field in Playlist Settings (12), and in a right-aligned label column in New/Edit View (16, 17). Rename happens inline in Playlist Settings but behind a "Rename…" button in Edit View.
3. **Sheet footers.** Only the View editor (16, 17) and Now Playing (26) put their buttons in a glass capsule. Every other sheet uses a plain footer.
4. **Default-button position.** It sits at the trailing edge in most sheets, second from the trailing edge in Add to a Playlist (23), and Add Podcasts has no prominent closing action (24).
5. **Empty states.** History, Trash and Add Podcasts use a centered icon, title and sentence. Listening Stats shows an empty chart frame and an empty "Top Podcasts" heading (31).
6. **Section headings.** Settings and Subscription Settings (`.formStyle(.columns)`) render headings in regular weight in the value column, so they read like labels (22, 27). Rewind (34) uses bold headings. Listening Stats mixes a bold "Listening Streak" with a larger regular-weight "Top Podcasts" (31).
7. **Playlist header form.** Entries and History use an unlabeled segmented control with an icon-only Play. Listening Timeline adds a "Playlist section" label and a text "Play This Playlist" button, and the control moves 99 pt (06/08 vs 09).

## Checklist

**Coverage: 91.2%** (pass 117 · fail 17 · N/O 13 · N/A 21; 168 IDs).

### Failures by severity

**Blocker:** none.

**Major**

- **[WIN-03] Settings clips its own text at the default size.**
  - **Evidence:** In 27/28/29 (Light and Dark), the Text Size help text runs to x 1273 in a window that ends at x 1260 (`27-settings-general-top.txt`: frame 808.75 + 464.5), so "…You can al" is cut off. The label "Keep Playlists in Trash" starts 5.75 pt from the window's left edge. In 04 the State cell truncates "Unplayed · Starred" to "Unplayed ·…" at the default window size, which hides the Starred state. Now Playing (26) opens at its default 560 × 700 with a scrollbar, and "Episode Details" sits half under the footer.
  - **Fix:** give the General pane a real width budget. Drop the fixed `.frame(width: 600)` in favor of `minWidth`, or constrain the help text with `.frame(maxWidth: 420)` and `fixedSize(horizontal: false, vertical: true)`. Shorten "Keep Playlists in Trash" to "Keep in Trash" so the label column narrows. Open Now Playing at its ideal content height.
- **[MENU-01] Menus don't reflect the app's hierarchy (`menus.txt`).**
  - **Evidence:**
    - File holds a "Current Dialog" submenu that mirrors sheet buttons (Done, Cancel, Save, Cancel Rename, Create Playlist, … Delete Permanently), plus "Connection" (Check and Connect, Disconnect, Bring Library from this Mac…) and "OPML Import" submenus.
    - View holds "Retry", "Copy Configuration", "Retry MCP Server", "Dismiss Getting Started" and "Show Daily Table".
    - Source: `MenuCommandActions.swift:93–117`.
    - A Mac user hunting for Disconnect, or meeting "File › Current Dialog › Done", finds commands filed by where the code publishes them, not by what they act on.
  - **Fix:**
    - Remove "Current Dialog": sheet buttons already answer Return, Esc and ⌘., and VoiceOver reaches them.
    - Move Connection items and Copy Configuration / Retry MCP Server into the Settings panes they belong to, with a single "PodList › Connection…" item if a menu route is wanted.
    - Move Show Daily Table to a Listening Stats view-options group, and Dismiss Getting Started to Help.
- **[WIN-05] Critical transport controls sit in a bottom bar (owner decision).**
  - **Evidence:** the player bar at y 872–924 pt holds Play/Pause, ±15/30, scrubber, Speed, Sleep and the active Playlist (01–33).
  - **Fix:** kept per the owner. The cap stands; not proposed as a target.
- **[SET-02] Settings duplicates the system appearance preference (owner decision).**
  - **Evidence:** Settings › Appearance offers Light/Dark/System (27; `MacAppearance.swift:111–139`). It includes System, so APPEAR-01 passes, but SET-02 and the HIG Dark Mode guidance ask apps not to duplicate it.
  - **Fix:** kept per the owner.
- **[APPEAR-02] Controls use the brand blue instead of the user's accent (owner decision).**
  - **Evidence:**
    - Selection follows the system accent: table selection `#0064E1`, sidebar selection `#0070F5`, segmented control `#0077F9`.
    - Default buttons, pop-up labels, link buttons, toggles and inline row icons are `#2B50C8` (sampled from 02/03/06/07/11).
    - The result is two different blues on one screen (03, 33). `MacWindow.swift:44` applies `.tint(.podListAccent)` window-wide.
  - **Fix:** kept per the owner. If it is ever revisited, limit the brand blue to content (initials tiles, Current Entry) and let `.tint` fall back to the system accent.
- **[SYS-05] No Spotlight indexing (owner deferral, known).**
  - **Evidence:** no CoreSpotlight in `Sources/`.
  - **Fix:** deferred by the owner.

**Minor**

- **[FLOW-06] Empty shells in Listening Stats.**
  - **Evidence:** with no listening (31), the window shows a 200-pt chart frame with gridlines and no data, no empty message in it, and a last axis label truncated to "No…". The "Top Podcasts" heading has nothing under it (`LibrarySettingsScreens.swift:332`).
  - **Fix:** when `stats.days` is all zero, replace the chart and Top Podcasts with one `ContentUnavailableView` ("No Listening Yet · Play an Episode to start your Listening log") and hide the heading.
- **[FLOW-07] The default action doesn't have one place across sheets.**
  - **Evidence:** in Add to a Playlist (23) the default "Play Next" sits between Play Now and Play Last instead of at the trailing edge. Add Podcasts (24) has no prominent closing action.
  - **Fix:** order Add to a Playlist as Cancel … Play Now · Play Last · **Play Next** (default last), or make Add the default and put the placements in a pop-up.
- **[APPEAR-09] The eraser symbol for "Clear on Played" gives a familiar glyph a new meaning.**
  - **Evidence:** sidebar playlist rows (01) use `eraser.fill` / `eraser`, with fill vs. outline as the only on/off cue. It sits beside the accent speaker that marks the Active Playlist.
  - **Fix:** show Clear on Played only where it is on, as a small `checkmark.circle` with the tooltip, or drop it from the sidebar. It is already a checked toggle in Playlist Settings and the Playlist menu.
- **[APPEAR-11] Layout jumps between states.** These are the two tour pairs under *Flows*: the 99-pt jump of the Playlist section control and the unprompted 7.5-pt shift when Unsubscribe disarms.
  - **Fix:**
    - Give the Playlist header one form on every tab: always show the "Playlist section" label and the labeled Play button, or never.
    - Size the Subscribed/Unsubscribe button to its wider label, for example with a hidden "Unsubscribe" in a `ZStack`.
- **[COPY-01] "Done" creates a View, while "Create Playlist" creates a Playlist.**
  - **Evidence:** 17 vs 13. "Dismiss" closes Getting Started (32), where other windows say Done.
  - **Fix:** label the New View default "Create View". The menu registry already has `.createView`.
- **[COPY-04] Tooltip case is mixed.**
  - **Evidence:** "Show or Hide Inspector (⌥⌘I)" and "Back to Library (⌘[)" are title case. "Play selected Episodes now (↩)" and "Add selected Episodes to a Playlist" are sentence case (`MacWindow.swift:148–176`, `EpisodeEditingViews.swift:316–323`).
  - **Fix:** use sentence case throughout and keep the glossary nouns capitalized.
- **[VIEW-02] View › "Show Sidebar" is shown while the sidebar is visible.**
  - **Evidence:** `menus.txt`, captured right after state 33 with the sidebar open.
  - **Fix:** confirm that `SidebarCommands()` validates against the `NavigationSplitView` column visibility. If it doesn't, replace it with a command bound to `columns` that titles itself Show/Hide.
- **[PTR-02] The Episode context menu isn't concise.**
  - **Evidence:** `EpisodeActionItems` puts 14 items and 4 submenus in each row's context menu. "Play Next in Default" and "Play Next in ▸" both appear, and likewise for Last (`EpisodeEditingViews.swift:28–76`).
  - **Fix:** in the context menu, keep Play Now, Play Next, Play Last, Add to a Playlist…, Star, Mark Played, and Download / Share. Leave the per-Playlist submenus to the Episode menu.
- **[SYS-02] No vended Service.**
  - **Evidence:** none in the code.
  - **Fix:** add an "Add Podcast to PodList" Service for selected URLs or text, routed to the existing `LibraryDrop.feed` path.
- **[SYS-03] No URL scheme for addressable content.**
  - **Evidence:** Views, Playlists and Episodes have no `podlist://` links. Share links are publisher web URLs.
  - **Fix:** register `podlist://view/<id>`, `podlist://playlist/<id>` and `podlist://episode/<id>`, mapped to `Destination`.
- **[SYS-06] No Share extension for receiving a podcast URL.**
  - **Evidence:** the only cross-app intake is dropping a URL on the window (`LibraryDrops.swift`).
  - **Fix:** add a Share extension that hands the URL to Add Podcasts.

### N/O

DATA-05, DRAG-05, DRAG-06, DRAG-07, FLOW-01, FLOW-02, FLOW-03, FOOT-01, FOOT-02, KEY-06, RESP-01, RESP-02, WIN-10

### N/A

AX-05, CTRL-02, DATA-02, DATA-03, DATA-08, DLG-08, DLG-09, EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04, FILE-02, FILE-04, FILE-05, FMT-01, FMT-02, LIST-05, START-04, START-05, START-07, SYS-07

### Passes (evidence in brief)

- **Menus and commands**
  - **MENU-02:** every toolbar, context-menu and row command has a menu-bar route: Episode, Playlist, Views, Podcast and Controls menus; Open in New Window.
  - **MENU-03:** unavailable items are dimmed; toggles carry their state (Play/Pause, Show/Hide Description, Hide Inspector, the Clear on Played checkmark, Speed 1×, Sleep Off).
  - **MENU-04, MENU-05, MENU-06:** labels and submenus follow the rules.
  - **APP-01–04:** standard App menu.
  - **FILE-01, FILE-03:** New View… ⌘N, New Window, Close, Close All.
  - **EDIT-01:** labeled multi-step Undo ("Undo ‹name›", `PlaylistEditingModel.swift:69`).
  - **EDIT-02, EDIT-03, EDIT-04, EDIT-05:** Copy puts the title as text plus the URL on the pasteboard (`SelectionCommands.swift:150`).
  - **VIEW-01;** **WMENU-01–03;** **HELP-01, HELP-02:** the PodList Help window documents the tasks and lists shortcuts.
  - **KEY-02, KEY-03, KEY-05, KEY-08:** frequent commands have ⌘-family shortcuts listed in Help (`KeyboardShortcuts.swift`); notation uses ⌥⇧⌘ order.
- **Keyboard and text**
  - **KEY-01, KEY-04, KEY-07:** focus rings are visible in 11, 12 and 34. A guard keeps Space, Return and ⌘←/→ for text and sheets.
  - **TEXT-01, TEXT-02:** standard fields; the key guard calls `interpretKeyEvents`.
- **Windows**
  - **WIN-01, WIN-02:** inactive parents gray out under sheets (11–17).
  - **WIN-04, WIN-06, WIN-07, WIN-08, WIN-09.**
- **Toolbars and sidebar**
  - **TOOL-01–06:** no customizable toolbar (owner decision), but every action has a menu item, shortcut and tooltip.
  - **SIDE-01–06:** a 2-level source list follows the system sidebar size; the selection stays highlighted on the Podcast page (18).
- **Settings**
  - **SET-01, SET-03, SET-04, SET-05, SET-06:** a toolbar-pane Settings window titled after the pane, sized per pane, with minimize and zoom dimmed (27, 30).
- **Dialogs and controls**
  - **DLG-01–07:** the Rewind sheet previews consequences; destructive actions are recoverable through Trash or Undo; Esc and ⌘. cancel.
  - **CTRL-01, CTRL-03–08.**
- **Lists**
  - **LIST-01–04, LIST-06, LIST-07:** native `Table` with sortable, resizable columns; Return plays; double-click opens details.
- **Data, drag and pointer**
  - **DATA-01, DATA-04, DATA-06, DATA-07:**
    - Rename and server drafts survive.
    - Window context restores destination, search, selection, sort, Playlist section, scroll anchor and pane widths (`WindowRestoration.swift`).
  - **DRAG-01–04:** multi-item episode drags carry a private type, then URL, then title. Option copies; same-Playlist drags reorder. Drops are undoable. URL and OPML drops work on the window.
  - **PTR-01, PTR-03, PTR-04, PTR-05:** `contextMenu(forSelectionType:)` acts on the clicked row; tooltips are action-specific.
- **Appearance and type**
  - **APPEAR-01, APPEAR-03:** high-contrast palette variants exist, and glass turns opaque with a border under Reduce Transparency or Increase Contrast (`MacGlass.swift`).
  - **APPEAR-04:** measured contrast:

    | Text | Contrast |
    |---|---|
    | Secondary `#606060` on `#FFFFFF` | 6.29:1 |
    | Secondary `#606060` on `#EEEDEC` | 5.38:1 |
    | Dark secondary `#A0A0A0` on `#242222` | 6.05:1 |
    | Brand `#2B50C8` on white | 6.81:1 |
    | Brand `#9DB1FF` on `#242222` | 7.66:1 |
    | Error `#B91C1C` on white | 6.47:1 |

  - **APPEAR-05:** no custom positional motion.
  - **APPEAR-06, APPEAR-07, APPEAR-08:** glass stays on controls.
  - **APPEAR-10.**
  - **TYPE-01–08:** 13-pt body, caption metadata, semantic styles, typographic quotes and ellipses in UI copy; App Text Size runs 100–200% (**AX-03**).
- **Accessibility, copy and launch**
  - **AX-01, AX-02, AX-04:** icon buttons carry names such as "Play Now: ‹title›" and "Add ‹title› to a Playlist"; sidebar rows announce Active and Clear on Played.
  - **COPY-02, COPY-03:** authored recovery copy (`FailureMessages.swift`).
  - **START-01, START-02, START-03, START-06:** Getting Started can be dismissed and reopened from Help; there is a "Start on This Mac" path with no account.
  - **SYS-01:** App Intents, App Shortcuts and a Now Playing snippet. **SYS-04:** Share Podcast and Share Episode.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.8** | System font with semantic styles: list titles in body over caption podcast names in readable secondary gray (02, 18); bold inspector titles; tabular `monospacedDigit` counts. Below Strong because type stops doing hierarchy work in the forms: Settings and Subscription Settings headings are regular weight and look like labels (22, 27). Now Playing inverts the pair, with a large regular episode title over a bold podcast name (26). Timeline dates are larger than the event line they belong to (09). Settings help text is clipped (27). Above the bottom of Competent because the list screens carry structure with one face, two weights and secondary color. | `hierarchy`, `craft` |
| Hierarchy | **6.5** | Content leads, and the inspector (03) is a clean secondary column. But every list opens with about 63 pt of chrome before content: the sync line, a reserved 32-pt Edit status band (01: content starts at y 305 under a 52-pt toolbar), and in Views a description line. Each row repeats two brand-blue icon buttons, 12 tinted glyphs per screen (02), which compete with the titles. Timeline rows each carry a tinted "Rewind to Here" (09). Competent anchor: "secondary chrome competes". | `content-first`, `simplicity-not-minimalism` |
| Spacing & density | **6.4** | Mac-sized controls (24-pt pop-ups, 28-pt icon buttons) and calm 46–54-pt two-line rows suit a Things-like posture. Rhythm breaks between sibling lists: All Views rows are 24 pt with a count about 900 pt away (05), episode rows are about 54 pt (02), and subscription rows are 62 pt (01). The Settings label column runs to 5.75 pt from the window edge (27). The "Current Entry" row indents its title 22 pt off the column (06). Reserved empty bands sit in New Playlist and Add to a Playlist (13, 23). | `craft`, `conventions` |
| Color & contrast | **6.6** (cap 6.9, APPEAR-02) | Every measured text pair passes (5.38–8.59:1); Dark is coherent (03, 09, 16 dark); color carries meaning (red armed Unsubscribe in 20, error red, accent Current Entry). Capped and held down by two blues: system-accent selection `#0064E1` beside brand `#2B50C8` controls on the same screen (03, 33), plus brand tint on chrome (pop-ups, link buttons). A disabled "Create Playlist" label at 1.09:1 is exempt from the contrast check but reads as missing (13). | `color-restraint`, `accessibility` |
| Iconography | **7.2** | One SF Symbols family at text weight; every icon-only button has a name and tooltip (`.txt` trees). Kept out of the upper Strong band by the eraser for Clear on Played (APPEAR-09), `slider.horizontal.3` meaning both Edit View and Playlist Settings, "+" meaning New View or New Playlist by screen, and decorative repetition of the row icons. | `conventions`, `plain-language` |
| Consistency & polish | **6.0** (stability N/O; partial: no flow run) | Designed empty, inactive, Dark and multi-selection states (08, 14, 33), and native controls throughout. Edge states and siblings still disagree, per the seven inventory mismatches: Create vs Done, three name-field layouts, glass footers on only two surfaces, the empty-chart shell, the 99-pt header jump, and the invisible disabled label. Also the clipped Settings text, and Now Playing opening too short for its content (26). | `craft`, `stability` |
| Clarity | **7.0** | The domain glossary is specific and consistent. State stays visible ("6 Episodes · 1 selected", Current Entry, Active Playlist speaker, "Up to date"). Rewind spells out consequences (34). Held at the bottom of Strong by: "View" and "Views" as neighbouring menus; a "Show (Optional)" field (16); "Last 7 days" as a label with a bare stepper (16); "Edit Download Rules…" disabled with no reason (01); and "File › Current Dialog". | `plain-language`, `discoverable-commands` |
| Platform fit | **6.9** (cap; uncapped 7.4) | **Looks 7.0:** native window, unified toolbar, source list, `Table`, sheets, and a toolbar-pane Settings window. Foreign-leaning: brand-tinted controls, Settings mixing commands (Listening Stats, Getting Started, Disconnect) with options and clipping, the bottom transport bar (owner). **Behaves 7.6:** an exceptionally complete menu bar with shortcuts; labeled Undo; restoration of selection, sort and scroll; drag and drop with Option-copy; App Intents; a real Help window. Against that: misfiled menus (MENU-01), the appearance override (SET-02), and no Spotlight, URL scheme or Services. (7.0 + 2 × 7.6) ÷ 3 = 7.4, capped at 6.9 by majors in Windows, Menu bar, Settings and System integration. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **7.8** (responsiveness N/O) | Keyboard-fluent: ⌘N, ⇧⌘N, ⇧⌘A, ⌘F, Space, Return, ⇧⌘J / ⌥⌘J, ⌥⌘↑/↓, ⌘⌫, ⌥⌘I. Named multi-step Undo for every Library edit, including Unsubscribe, Rewind and Trash. The Rewind preview. Drafts survive. Drag has command equivalents. VoiceOver names; Reduce Transparency and Increase Contrast fallbacks. Below Exemplary because small edits still go through modal sheets (rename nested inside Playlist Settings, a 4-button Add to a Playlist sheet) and nothing is timed. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **6.7** | Allowed up to 8.0 (lowest 6.0 + 2.0). Serves its primary task well, and behaves more like a Mac app than its looks suggest: menus, Undo, restoration and drag are BBEdit-grade in completeness. What holds it in Competent is unfinished surface craft: sibling sheets and panes built differently, chrome bands above every list, a clipped Settings pane, empty-state shells, and the owner-fixed two-blue accent and bottom transport, which cap Color and Platform fit. | `craft`, `conventions` |

## What stands between this build and 9.0

1. **Finish the sibling surfaces as one family** (Consistency 6.0 → ≥ 8). One sheet scaffold: title, columns form, a status row, and a footer with Cancel plus a verb-labeled trailing default. One name-field pattern, one empty-state pattern (no chart or heading shells), and one Playlist header form on every tab.
2. **Fix the Settings General pane:** width, label column, clipped help. Move its commands (Listening Stats, Getting Started, Disconnect, Import/Export) to menus or their own surfaces. This clears WIN-03.
3. **Re-file the menus by object** and drop "Current Dialog". This clears MENU-01.
4. **Remove the chrome above lists:** fold the sync line and the reserved Edit status band into one line, or reserve status space only while a message or Undo is pending, kept out of the content's way (Hierarchy).
5. **Calm the rows:** show the per-row Add and Play buttons on hover or selection, keeping their menu and keyboard equivalents, and use one row rhythm across lists (Hierarchy, Spacing).
6. **Owner-held caps:** brand accent on controls (APPEAR-02), bottom transport (WIN-05), the appearance override (SET-02), deferred Spotlight (SYS-05). These alone keep Color & contrast and Platform fit at or below 6.9, so Overall can't reach 9.0 while they stand. That is the owner's call, not a target.
7. **Run a real flow:** measurements file, minimum and half-screen widths, timed passes. This makes the stability sub-score and the Responsiveness checks scoreable.

## Next step

- **Target:** Consistency & polish, the lowest-scoring category. No blocker exists, and the lowest category carries no major, so step 4.3 applies.
- **Anti-pattern:** none named exactly. Closest are *Modal matryoshka* (rename nested in the Playlist Settings sheet) and the inventory mismatches the stability rules describe.
- **Root cause:** each sheet and pane assembles its own form pieces (name field, default-button label and placement, footer material, section headings, empty state) instead of sharing one component. Siblings therefore drift: Create vs Done, three name-field layouts, two footer styles, chart-shell vs `ContentUnavailableView` empty states.
- **Change:** introduce one `PodListSheet` scaffold and apply it to New Playlist, New/Edit View, Add to a Playlist, Download Rules and Playlist Settings.
  - **Title:** `.title2` bold.
  - **Form:** `.formStyle(.columns)` with leading labels.
  - **Status:** a status row directly above the footer.
  - **Footer:** a plain, non-glass footer with Cancel followed by a verb default at the trailing edge: "Create Playlist", "Create View", "Add", "Apply", "Done".
  - **Disabled default:** keeps `.borderedProminent`'s system disabled look instead of the custom white-on-tint label, so it stays legible.
  - **Listening Stats:** route its empty state through the same `ContentUnavailableView`.
- **Principle:** `craft` and `conventions`: the same thing looks and behaves the same everywhere.
- **Expected effect:**
  - Consistency & polish about +1.0.
  - Clarity +0.2 (verb labels).
  - Spacing +0.2 (no reserved dead bands in small sheets).
  - Clears FLOW-06, FLOW-07 and COPY-01, and inventory mismatches 1–5.
  - No regressions expected.
  - The View editor's glass footer (an owner decision) would need the owner's agreement to become plain. Otherwise keep it and apply the same glass footer to every sheet, so the two match.
  - Character is kept: brand-tinted default buttons, initials tiles and the glossary are untouched.
