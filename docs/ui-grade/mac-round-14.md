# PodList Mac — UI grade, round 14 (Opus grader)

Build: `apps/apple` at `6bd275a`. Evidence: `~/Documents/podlist-grading/mac-round-14/` (35 states × Light/Dark, AX snapshots, `menus.txt`) and the code. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. This round was graded only on its own evidence. No earlier report was read.

Measurement notes: captures are 2360 × 1520 px at 2×, so the window is 1180 × 760 pt. Points = px ÷ 2. AX frames are already in points. Contrast was measured by decoding the PNGs and comparing the dominant background against the extreme foreground pixel in each region.

## Frame

- **Task:** keep up with podcasts. Find Episodes through Views and Subscriptions, put them in ordered Playlists, and listen from the Active Playlist without losing position.
- **Target:** Mac app (SwiftUI, macOS 26+, captured on macOS 27.2).
- **Posture:** sovereign, but calm and personal. It stays open all day and gets brief visits.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things. It has the same calm personal posture and an opinionated domain model (Views, Playlists, Entries, Cursor), and it explains its concepts in plain words.
- **Character (signature elements):**
  1. A three-column library: a source-list sidebar (Views / Playlists / Library), sortable Episode tables with a two-line title and podcast cell, and an Inspector.
  2. A persistent bottom Liquid Glass player bar with a centred title, podcast and scrubber, and Speed and Sleep pop-downs. *Owner-fixed.*
  3. Monogram artwork tiles ("MH", "DF") in brand blue on a pale brand tint.
  4. Plain-spoken explanatory copy that names consequences ("Deleted Playlists can be restored from Trash for 30 days").
  5. A capitalised domain vocabulary: Episode, Entry, Playlist, View, Position, Current Entry.
- **Owner decisions:** These are graded but are not targets:
  - The brand blue is AccentColor, used only under the Multicolor accent. The deep Dark accent `#3652D0` is deliberate.
  - Transport sits in the bottom player bar.
  - Appearance offers System, Light and Dark.
  - There is no customizable toolbar.
  - Unsubscribe takes two clicks.
  - Liquid Glass is used on the player bar, Inspector actions, Now Playing and the sheet and View editor footers.
  - Spotlight is deferred.
  - The MCP server is off by default, and App Intents are on.

## Flows

- **Tasks run as measured flows:** none. The evidence is a scripted XCUITest tour of 35 separate states.
  - It covers one window size (1180 × 760 pt), in Light and Dark.
  - It records no per-step element boxes, no timing and no injected delays.
  - There is no measurements file and no screenshot strip of transitions.
- **Effect on the grade:**
  - FLOW-01, FLOW-02, FLOW-03, RESP-01, RESP-02 and FOOT-02 are **N/O**.
  - The **stability sub-score is N/O**, so Consistency & polish is "partial: no flow run".
- **Static observations from the AX frames:** These are not FLOW evidence.
  - The Episode toolbar group keeps its frames when the selection changes, because disabled controls are retained (02 → 03 → 33).
  - The 32 pt "Edit status" row is reserved even when empty (`EpisodeEditingViews.swift` 221–223), so an Undo or Redo arriving there cannot push the table down.
- **Failures:** none recordable without a flow run.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View / Episode table (02, 03, 33) | Text in the reserved feedback row, top-leading, caption, primary colour, fades after 5 s (`EditingNotice`) | Same row, red `podListError` text plus "Retry" | none | "Undo/Redo ‹edit›" bordered button in the feedback row, top-trailing; Edit menu | Inspector placeholder: icon + "Select an Episode" + one sentence, centred | none | Toolbar Play / Add / More group; Return = Play Now | View summary line ("Published in the last 7 days · …") |
| Playlist Entries (06, 07, 10) | as above | as above | none | as above | "Find Episodes" button when empty (code) | none | Toolbar Play This Playlist | "Current Entry" accent caption on the cursor row |
| History (08) | — | — | none | as above | Centred icon + "No History" + explanation | none | — | Explanation text |
| Listening Timeline (09, 34a) | — | — | Rewind preview **sheet** (34) | as above, plus "Rewind can be undone" | — | none | Bordered **"Rewind to Here"** on every row (no ellipsis) | — |
| Trash (14) | as above | as above | "Delete … Permanently?" confirmation dialog (code) | as above ("Redo Playlist Settings" shown) | Centred icon + "Trash Is Empty" + retention sentence | none | Row Restore / Delete Permanently… | Retention sentence |
| Search (15) | as above | as above | none | as above ("Redo Playlist Settings") | — | none | "Create View…" trailing | "1 result" |
| Podcast page (18–21) | as above | as above | Armed "Unsubscribe" in place, red, self-disarms | as above ("Redo Edit View") | — | none | Subscribed / Share / Copy Feed Address / gear row | — |
| Playlist Settings / New Playlist sheets (11–13) | sheet closes | `status()` row above footer, red | none | **"Redo Playlist Settings" above the New Playlist footer** (13) | — | — | Trailing prominent button in a glass footer | Consequence captions |
| View editor sheets (16, 17) | sheet closes | as above | none | **"Redo Playlist Settings" (16) / "Redo Edit View" (17)** above footer | — | — | Trailing Save / Create View | "6 matching Episodes" live count |
| Subscription Settings (22) | sheet closes | as above | none | **"Redo Edit View"** above footer | — | — | Trailing Save | "Mark All Played takes effect immediately and can be undone." |
| Add to Playlist (23) | sheet closes | as above | none | **"Redo Edit View"** above footer | — | — | Trailing "Play Next"; secondary Play Now / Play Last leading | — |
| Download Rules (25) | sheet closes | as above | none | none | — | — | Trailing "Apply" | One-line purpose |
| Add Podcasts window (24) | — | — | none | **"Redo Edit View"** above footer in a separate window | Centred icon + "Find Your Next Podcast" + example URL | — | Default "Close" in a glass footer | Import route caption ("File › Import OPML…") |
| Now Playing window (26) | — | Glass `FailureFeedback` with "Retry Playback" (code) | none | none | — | — | Default **"Close"** in a glass footer of a modeless window | — |
| Settings (27–30) | applies live | "Retry Saving Settings" (code) | none | none | — | — | none (live apply) | Captions under settings |
| Listening Stats (31) | — | — | none | none | Centred icon + "No Listening Time Yet" + explanation | — | — | — |
| Getting Started (32) | — | — | none | none | — | — | Default "Hide Getting Started" | "Use File **▸** Add Podcasts… (⇧⌘A)" |

**Mismatches**

1. **Undo column.**
   - One app-global edit history is drawn by every surface's feedback row. The last Redo therefore shows wherever a feedback row exists, whatever that surface is about:
     - "Redo Playlist Settings" in **New Playlist** (13), **Edit View** (16), Trash (14) and Search (15);
     - "Redo Edit View" in **New View** (17), **Subscription Settings** (22), **Add to Playlist** (23), the **Add Podcasts window** (24), the podcast page (18–21) and the Subscriptions list (25).
   - In a sheet, that button changes content hidden behind the sheet. In Add Podcasts, it changes content in another window.
2. **Main action in modeless windows.**
   - Now Playing (26) and Add Podcasts (24) close with a blue default "Close" in a glass footer, as if they were sheets.
   - Listening Stats (31) and Help, the other modeless windows, have no such button.
   - Now Playing also repeats its title: "Now Playing" appears in the title bar and as a Title 2 heading.
3. **Row actions.**
   - Episode and Entry tables use quiet, borderless glyph actions (02, 06).
   - The Timeline (09) puts a bordered "Rewind to Here" push button on every row. That label has no ellipsis, while the same command in the Playlist menu is "Rewind to Here…" and opens a confirmation sheet.
4. **Menu-path notation.** "File › Import OPML…" (24, 27) and "View › Bigger" (28) differ from "File ▸ Add Podcasts…" (32).
5. **Inspector placeholder on History (08).** "Select an Episode" sits beside a tab that has nothing to select.

## Checklist

**Coverage: 87.8%** (pass 120 · fail 10 · N/O 18 · N/A 20). That is 168 IDs in total and 148 applicable: 80 core and 88 Mac.

### Failures by severity

**Blocker:** none.

**Major**

- **[APPEAR-04] The selected Settings pane label is 1.7:1 in Dark.** *Owner-accepted.*
  - Evidence: in `dark/27-settings-general-top.png` (px 520–610 × 120–150), the "General" label is `#435fdd` on the selected-tab fill `#484747`. That is a control label, against the 4.5:1 target. The same label in Light passes.
  - Cause: macOS draws the selected Settings toolbar item in the accent colour. Under Multicolor, that is the deep Dark asset `#3652D0`.
  - Fix, if the owner revisits it: lighten only the Dark AccentColor variant until the selected-pane label reaches ≥ 4.5:1 on `#484747`. About `#7F95FF` gets there. Keep `#3652D0` as the row-selection fill by drawing selection with `.tint` on the List rather than with the asset.
- **[WIN-05] Critical actions sit in a bottom bar.** *Owner decision.*
  - Evidence: Play/Pause, the scrubber, ±15/30 s, Speed and Sleep live only in the bottom glass `PlayerBar` (`MacWindow.swift` 199–206, `PlayerViews.swift`; every main-window capture). If the window is dragged low, the bar is hidden.
  - Mitigation: the Controls menu, Space, ⌘←/⌘→, media keys, Control Center and the Now Playing window all reach transport.
  - Fix if revisited: move the transport cluster and title into the toolbar's principal area, as Music and Podcasts do. Keep the bottom bar for the scrubber and status only.
- **[SYS-05] No Spotlight indexing.** *Owner-deferred.*
  - Evidence: no `CoreSpotlight` in `Sources/`.
  - Fix: index Episodes and Subscriptions with `CSSearchableItem`, keyed by Episode id, and open them through the existing window-target routing.

**Minor**

- **[DATA-05] Undo/Redo from a sheet or auxiliary window acts on content the person cannot see.**
  - Evidence: `EditingFeedback.feedbackRow` (`EpisodeEditingViews.swift` 213–219) shows `editing.history.redo` in every host. See captures 13, 16, 17, 22, 23 and 24.
  - Fix: pass a surface scope. In sheets and auxiliary windows show only status and errors, not history buttons. Keep ⌘Z/⇧⌘Z in the Edit menu as the global route.
- **[APPEAR-09] Two near-identical glyphs mean different things.**
  - Evidence: `text.badge.plus` (Add to a Playlist; table rows, toolbar, Inspector) and `text.badge.checkmark` (sidebar "Clear on Played on"; captures 02 and 06, `MacWindow.swift` 89–93) read the same at sidebar size.
  - Fix: drop the sidebar Clear-on-Played glyph, since the AX value and Playlist menu checkmark already carry it. Or use a distinct symbol such as `checkmark.circle.badge.xmark`, or a trailing caption in Playlist Settings only.
- **[TYPE-07] Underline marks a non-link.**
  - Evidence: "Show Description" / "Show Less" toggle in place but are drawn underlined (`MacReadableLinkStyle`; 18–21).
  - Fix: drop the underline and keep accent colour, or use a disclosure-style "More…" button.
- **[COPY-01] Labels are inconsistent.**
  - "Rewind to Here" on the Timeline rows (09) opens a confirmation sheet but has no ellipsis, unlike the menu's "Rewind to Here…".
  - The menu-path separator is "›" in some places and "▸" in Getting Started (32).
  - Fix: add "…" to the row button and use one separator everywhere.
- **[SYS-02] No vended Services.**
  - Evidence: no `NSServices`.
  - Fix: add a "Subscribe in PodList" Service for a selected feed URL or text, routed into Add Podcasts.
- **[SYS-03] No URL scheme or universal links for Episodes, Views or Playlists.**
  - Evidence: only `.opml` file URLs are handled (`PodListMac.swift` 40–44).
  - Fix: add a `podlist://` scheme that maps to `LibraryWindowTarget` destinations, and offer "Copy PodList Link".
- **[SYS-06] No Share extension for receiving a podcast or feed URL from Safari or other apps.**
  - Dropping a URL on the window works (`LibraryDrops.swift` 28), but there is no Share-menu route.
  - Fix: add a Share extension that stages the URL in Add Podcasts.

### N/O

FLOW-01, FLOW-02, FLOW-03, LIST-07, DRAG-05, DRAG-06, PTR-03, APPEAR-11, WIN-03, RESP-01, RESP-02, FOOT-02, WMENU-02, WIN-10, TOOL-02, DRAG-02, DRAG-07, FOOT-01.

### N/A

DLG-09 (no popovers), CTRL-02, LIST-05, AX-05, START-04, START-05, START-07, MENU-06, FILE-02, FILE-05, FMT-01, FMT-02, DATA-02, DATA-03, DATA-08 (not a document app), SYS-07, EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04.

### Passes (with the deciding evidence)

**Flow stability (S-observable)**
- FLOW-04: the Undo row and errors sit at the top of content or just above sheet footers, in view.
- FLOW-05: the content and Inspector tops align at 88 px (03).
- FLOW-06: no empty headings; the reserved row has no heading.
- FLOW-07: every sheet's primary action is trailing in its footer.

**Keyboard**
- KEY-01: native List, Table, Form and Buttons throughout, and every action has a menu equivalent. Live Full Keyboard Access was not exercised.
- KEY-04: new sheets focus Name or the first pop-up (11, 13, 17, 22, 23, 25).
- KEY-06: letter, arrow and comma keys only; ⌘+ follows the HIG notation.
- KEY-07: native scroll views.
- KEY-08: the PodList Help window carries a full shortcut table, and Space and Return are guarded out of text entry (`PlaybackCommands.swift` 145–162).

**Alerts and sheets**
- DLG-01: the only alert is the irreversible Delete Permanently. Rewind is a consequence preview, not routine confirmation.
- DLG-02, DLG-03: "Delete “X” Permanently?" with Delete Permanently / Cancel.
- DLG-04: `.cancelAction`, and ⌘. is rerouted to Esc in sheets.
- DLG-05: deliberate, Trash-recoverable deletes.
- DLG-07: Cancel pairs with the primary only.

**Controls**
- CTRL-03: stacked labels; "Mentions (Optional)".
- CTRL-04: inline seconds validation.
- CTRL-05: native button styles.
- CTRL-06: "More Episode actions" holds related commands, and the primaries stay visible.
- CTRL-07: the scope shows in the prompt ("Search this list", "Search Episodes", "Search Library") plus "1 result".
- CTRL-08: OPML and download progress with Cancel.

**Lists**
- LIST-01 to LIST-04: native sortable Tables with noun, title-case headers ("Episode, Published, Length, State") and a sort indicator (18).
- LIST-06: the sidebar selection persists, accent when key and gray when the table has focus (03, 07).

**Data**
- DATA-01: drafts survive in the editing models, and sheets restore unfinished names.
- DATA-04: a multi-step named history.
- DATA-06: `@SceneStorage` window context covers destination, search, selection, sort, tab, columns, pane widths and scroll anchor.
- DATA-07: a standard `NSSavePanel` with "PodList.opml".

**Drag & drop**
- DRAG-01: Episodes drag into Playlists and the sidebar, and URLs, files and text drop on the window. Add to a Playlist… and Move Up/Down are the menu routes.
- DRAG-03: drops go through the undoable history.
- DRAG-04: multi-item payloads.

**Pointer & context menus**
- PTR-01, PTR-02, PTR-05: `contextMenu(forSelectionType:)` on every table, plus sidebar menus that mirror the menu bar.
- PTR-04: every icon button has a tooltip and an AX label.

**Appearance**
- APPEAR-01: Light and Dark are coherent, and System is the default.
- APPEAR-02: controls use `Color.accentColor`. The brand colour is limited to artwork.
- APPEAR-03: glass falls back to an opaque window background plus a border under Reduce Transparency or Increase Contrast (`MacGlass.swift`), and there are high-contrast palette variants.
- APPEAR-05: no custom motion.
- APPEAR-06, APPEAR-07: glass is only on the control layer, with no nesting.
- APPEAR-08: rows scroll under the player bar.
- APPEAR-10: controls stay distinct from content.

**Typography**
- TYPE-01: semantic text styles. AX widths are consistent with 13 pt body: "Speed" is 39 pt and "Who sets the price of rice?" is 162.5 pt.
- TYPE-02, TYPE-03: system font, Regular to Bold.
- TYPE-04: Mac control sizes, with 28 pt row-action targets.
- TYPE-05: Text Size runs 100–200%, and `MacReadingRow` reflows metadata.
- TYPE-06: the expanded description runs about 75–80 characters per line with roughly 1.35 leading (19).
- TYPE-08: curly quotes and apostrophes and real ellipses.

**Copy**
- COPY-02: "Retry Saving Settings" and a field-specific seconds error.
- COPY-03: every empty state explains what will appear and why.
- COPY-04: tooltips are sentence-case fragments.

**Accessibility**
- AX-01: icon buttons are labelled ("Play Now: ‹title›"), and the sidebar rows combine name, count, Active and Clear on Played. Live VoiceOver was not exercised.
- AX-02: state is in text ("In progress", "Current Entry", "Unsubscribe").
- AX-04: menu equivalents for every action.

**Launch & onboarding**
- START-01: the local Library is read before sync, behind "Opening Library…".
- START-02: Getting Started is hideable and stays reachable from Help.
- START-03: help is in context.
- START-06: the server is optional; standalone mode exists.

**Edit**
- EDIT-02: standard commands. Delete removes from the Playlist.
- EDIT-05: the copied item carries plain text plus a URL (`EpisodeCopyContent`).

**Toolbar, sidebar, Settings**
- TOOL-06: there is no hideable toolbar, and every toolbar action has a menu item.
- SIDE-03: Hide Sidebar ⌃⌘S plus the toolbar toggle.
- SIDE-04: persistent highlight.
- SET-01: app-wide options are in Settings, and Playlist and Subscription options sit with their objects.

**Menu bar**
- MENU-01: App, File, Edit, View, Podcast, Views, Episode, Playlist, Controls, Window, Help.
- MENU-02: every toolbar, row, Inspector and sheet command found has a menu-bar item.
- MENU-03: dimmed items stay visible; Play/Pause, Hide/Show and checkmark toggles.
- MENU-04, MENU-05: verb phrases with ellipses where input follows; one submenu level.

**App, File, Edit, View, Window, Help menus**
- APP-01 to APP-04: About, Settings… ⌘,, the Connection and Automation configuration submenus, and Hide / Hide Others / Show All / Quit.
- FILE-01, FILE-03, FILE-04: New Window, New View… ⌘N, New Playlist… ⇧⌘N, Import and Export OPML…, Close / Close All.
- EDIT-01: "Redo Edit View" (`menus.txt`).
- EDIT-03, EDIT-04: Find, Spelling, Substitutions, Transformations, Speech, Dictation, Emoji.
- VIEW-01, VIEW-02: Enter Full Screen and Hide Sidebar / Hide Inspector.
- WMENU-01: Minimize, Zoom, Bring All to Front.
- WMENU-03: open windows are listed ("New this week (6 Episodes · 6 selected)").
- HELP-01, HELP-02: "PodList Help" opens real task documentation plus the shortcut table, with Getting Started as the supplementary item.

**Keyboard and text (Mac)**
- KEY-02: ⌘. Stop is suppressed in sheets.
- KEY-03: Edit View ⌥⌘E, Star ⇧⌘L, Played ⇧⌘E, Play Next ⇧⌘J, Play Last ⌥⌘J, chapters ⌥⌘←/→, Now Playing ⌘L, Back ⌘[.
- KEY-05: modifier order ⌥⇧⌘.
- TEXT-01, TEXT-02: native NSTextView fields.

**Windows**
- WIN-01: standard traffic lights; Settings dims minimize and zoom.
- WIN-02: secondary selection when unfocused; sheets dim the parent.
- WIN-04: titles name the view.
- WIN-06: native full screen.
- WIN-07, WIN-08: Open in New Window and New Window.
- WIN-09: a system unified toolbar.

**Toolbars**
- TOOL-01, TOOL-03, TOOL-04, TOOL-05: title leading, Episode actions in one group, the Inspector toggle, and trailing Search. The playlist section segments are a toolbar view switcher. All are borderless glass items.

**Sidebars**
- SIDE-01, SIDE-02: a leading source list two levels deep.
- SIDE-05: a 0.5 pt splitter.
- SIDE-06: the sidebar follows the macOS size setting.

**Settings (Mac)**
- SET-02: System / Light / Dark, with System as the default.
- SET-03: noncustomizable panes; sizes to the measured pane.
- SET-04: the title matches the pane. Restoring the last pane on reopen was not verified.
- SET-05: changes apply live.
- SET-06: the Settings scene is not restored.

**Sheets, panels, controls**
- DLG-06: one sheet at a time.
- DLG-08: Add Podcasts is a `UtilityWindow`.
- CTRL-01: pop-ups, checkboxes, small switches in grouped forms, and a 3-segment control.

**Mac drag & drop and appearance**
- DRAG-04: listed under Drag & drop above.
- APPEAR-06 to APPEAR-08: listed under Appearance above.
- TYPE-04: listed under Typography above.
- AX-03: listed under Typography above (TYPE-05).

**System integration**
- SYS-01: 9+ App Intents with entities, plus undoable intents and donations.
- SYS-04: `ShareLink` for Episodes and Podcasts.
- Beyond the checklist: MPNowPlayingInfoCenter and remote commands for media keys and Control Center.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.6** | One system family on semantic styles. Hierarchy comes from weight and secondary ink: Title 2 bold sheet titles, Headline row titles in the Timeline, Caption podcast names in `#606060` (6.3:1). Tabular figures in the player time. Kept out of Exemplary by the underlined non-link (TYPE-07) and Now Playing's inverted pairing: a large *regular* episode title over a smaller *bold* podcast name (26). | `hierarchy`, `craft` |
| Hierarchy | **7.2** | The library reads sidebar → table → Inspector. Row actions stay quiet until hover or selection. The toolbar has two or three groups plus Search. Held back by a stale bordered "Redo …" button that is often the most prominent control above the list (14, 15, 18, 33); five identical bordered "Rewind to Here" buttons on the Timeline (09); and every sheet's buttons boxed inside a separate rounded glass footer within the sheet (11, 13, 22, 23). | `content-first`, `hierarchy` |
| Spacing & density | **7.0** | Consistent 24 pt sheet padding, 32 pt sidebar rows, ≈54 pt two-line table rows and 12 pt control gaps. Density suits a calm personal tool. Every content view carries about 60 pt of mostly empty band: the "Up to date" line plus the reserved 32 pt feedback row (01, 02, 05, 06). The expanded description makes a nested scroller that leaves about 2 table rows above the player (19). | `craft`, `hierarchy` |
| Color & contrast | **6.8** (cap 6.9, APPEAR-04 major) | Restrained. Accent appears only on selection, sidebar symbols, "Current Entry" and chevrons; red only for Unsubscribe and errors. Measured: secondary `#606060` on white 6.29:1, Dark `#A0A0A0` on `#242222` 6.05:1, accent caption `#2B50C8` on white 6.81:1. Under pale accents, foregrounds fall back to primary (`MacAccentContrast`). The Dark selected Settings pane label is 1.73:1 (owner-accepted). | `color-restraint`, `accessibility` |
| Iconography | **7.2** | Consistent SF Symbols at text weight, each with a tooltip and AX label. Standard meanings: `square.and.arrow.up` = Share, `sidebar.right` = Inspector. Held back by the `text.badge.plus` / `text.badge.checkmark` near-twins (APPEAR-09). The same `slider.horizontal.3` means "Edit View" on Views and "Playlist settings" on Playlists. | `conventions`, `plain-language` |
| Consistency & polish | **7.0** (partial: no flow run; stability **N/O**) | One sheet template. Native selected and inactive states (03 vs 07). Coherent Light and Dark. Reserved feedback space. Five inventory mismatches: the global Redo leaking into unrelated sheets and windows, sheet-style "Close" footers on modeless windows, bordered vs quiet row actions, "›" vs "▸", and the Inspector placeholder on History. Also a duplicated "Now Playing" heading and Play / Resume Playback / Pause Playback triplicated in Controls. | `craft`, `stability` |
| Clarity | **7.1** | Specific verbs. Consequence copy names effects ("Positions gained since this moment are reset … Rewind can be undone"). State stays visible: "Up to date", "Current Entry", Active speaker, the "6 Episodes · 6 selected" subtitle. Pulled down by unrelated "Redo Edit View" or "Redo Playlist Settings" offered inside New Playlist, Add to Playlist and Add Podcasts. Also by the cryptic sidebar Clear-on-Played glyph, by Subscription Settings mixing an immediate "Mark All Played" with Save/Cancel, and by Settings always saying "Closing this window does not stop the import" when no import is running. | `plain-language`, `feedback` |
| Platform fit | **6.9** (cap; uncapped 7.7 = (Looks 7.6 + 2 × Behaves 7.8) ÷ 3) | **Looks:** native window, toolbar, source list and Settings panes; glass in the current idiom. The bottom transport bar and glass-boxed sheet footers are the foreign tells. **Behaves:** a complete menu bar in standard order, labelled Undo, real Help, context menus everywhere, restoration, drag and drop, App Intents, Share, media keys. Missing Spotlight (owner-deferred), a URL scheme, vended Services and a Share extension. Capped by WIN-05 and SYS-05 (both majors). | `conventions`, `discoverable-commands` |
| Interaction & feedback | **7.6** (partial: no timed runs) | Keyboard-fluent: Return plays, Space toggles in lists only, ⌥⌘↑/↓ moves, ⇧⌘J/⌥⌘J queue, ⌘Z with named steps. Forgiving: Trash with 30 days, undoable Rewind with preview, two-click Unsubscribe with undo, preserved drafts. 100–200% text size. Glass honours Reduce Transparency and Increase Contrast. Unverified: responsiveness, Full Keyboard Access, type-select. Minor DATA-05. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **7.3** | Serves the task well and is clearly at home on the Mac. Every reachable command is in a menu, undo is real, and the copy is unusually honest. The owner-decided caps hold two categories at the top of Competent (Overall's ceiling is 6.8 + 2.0 = 8.8). The largest non-owner weakness is the app-global edit-status row, which puts unrelated Redo buttons into sheets and windows and adds a dead band above every list. | — |

## What stands between this build and 9.0

1. **Owner-decided caps.** WIN-05 (bottom transport), SYS-05 (Spotlight) and APPEAR-04 (the Dark accent's Settings label) keep Platform fit and Color & contrast at or below 6.9. While those stand, no Overall near 9 is reachable. These are the owner's to weigh, not targets.
2. **Scope of feedback and undo.** History controls should belong to the surface where the edit happened. The persistent route should be the Edit menu, not a bordered button in every sheet, window and list.
3. **The top-of-content band.** The sync line and an always-reserved empty row cost about 60 pt on every screen. A Things-level finish would give feedback its own reserved space that reads as intentional (for example, a window subtitle or toolbar status) rather than blank.
4. **Finishing details.**
   - Glyph twins (APPEAR-09).
   - Underlined disclosure (TYPE-07).
   - The bordered Timeline buttons and their missing ellipsis.
   - Sheet-style "Close" footers in modeless windows.
   - The Controls menu triplet.
   - Nested scrolling on the expanded podcast page.
5. **Evidence the run couldn't give.** A measured flow run (FLOW, stability), timed runs (RESP-01, RESP-02, FOOT-02), live Full Keyboard Access and VoiceOver, and resize at 760 × 500 (WIN-03, TOOL-02). Strong-band claims for Consistency and Interaction stay partial until these exist.
6. **System reach beyond the owner's deferral.** A `podlist://` scheme, a "Subscribe in PodList" Service and a Share extension.

## Next step

- **Target:** Consistency & polish, via the Undo column of the inventory.
  - There are no blockers.
  - Every major is an owner decision, so it is skipped.
  - The lowest categories are also driven by owner decisions: Color & contrast and Platform fit.
  - Spacing and Consistency tie at 7.0. Consistency is chosen because the same root cause also lowers Clarity, Hierarchy and DATA-05, and it touches the primary task's editing loop.
- **Anti-pattern:** none fits exactly. The nearest is *Box-and-border hierarchy*, for the boxed glass footers that the leaked button sits on.
- **Root cause:** one **app-global** edit history is rendered by a feedback row that **every surface instantiates**: main content, each sheet's `status()` and the Add Podcasts window. The last Redo is offered wherever such a row exists, regardless of the surface's subject. In sheets it acts on hidden content (`EditingFeedback.feedbackRow`, `EpisodeEditingViews.swift` 213–219; captures 13, 16, 17, 22, 23, 24).
- **Change.** Smallest first:
  1. Give `EditingFeedback` a `showsHistory` flag that defaults to `false` for sheet `status()` hosts and auxiliary windows. Those surfaces keep status text and errors with Retry only. The main window keeps its Undo/Redo, Edit ▸ Undo/Redo stays the global route, and the reserved 32 pt height is unchanged.
  2. Optionally, in the main window, show the history buttons only while that window's last edit notice is live (≈5 s, matching `EditingNotice`). Rely on the menu afterwards, so the band is blank by design rather than holding a stale "Redo Edit View".
- **Principle:** `feedback` (Undo makes its result visible), `plain-language`, `craft`.
- **Expected effect:**
  - Consistency & polish: up about 0.3–0.5, as the Undo column becomes one place, one subject.
  - Clarity: up about 0.3.
  - Hierarchy: up about 0.2.
  - DATA-05 moves to pass.
  - No category should regress. The signature elements are untouched (the sheet template, footer and reserved space stay).
