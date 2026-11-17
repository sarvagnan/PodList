# PodList Mac — UI grade, round 16 (Opus)

Build: `apps/apple` at `03531ff`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `platform-fit.md` and `rubric.md`. Evidence: `~/Documents/podlist-grading/mac-round-16/` (35 states × Light/Dark, with XCUITest accessibility snapshots, and `menus.txt`) plus the code. I did not launch the app and did not read earlier rounds' reports. Captures are 2× (window 1180 × 760 pt), so points = pixels ÷ 2. Contrast ratios were measured from the PNGs (the darkest glyph pixel against the most common background pixel in each text box).

**Overall 7.3 (Strong).** There are no blockers. Three majors fail, and all three come from owner decisions: WIN-05 (the bottom player bar), SYS-05 (Spotlight, deferred) and APPEAR-04 (the selected Settings tab label in Dark under the deep brand accent, 1.73:1). These cap Platform fit and Color & contrast at 6.9.

## Frame

- **Task:** find Episodes in your podcasts (through Subscriptions, Views and Search), put them in Playlists, and listen to them.
- **Target:** Mac app (SwiftUI, macOS 26+, captured on macOS 27.2).
- **Posture:** sovereign. It's a personal media library window kept open for long periods.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, for the calm personal tool, the opinionated domain model and the forgiveness. Its command surface aims at BBEdit-like completeness.
- **Character:**
  1. A plain-spoken domain vocabulary with capitalised domain nouns (Episode, Entry, Position, Playlist, Device, Rewind), and explanatory notes that state consequences before you act ("Delete Playlist takes effect immediately… restored from Trash for 30 days").
  2. Monogram artwork tiles (MH, DF, SB) in a pale brand-blue tint.
  3. Dense two-line Episode rows: title over a secondary podcast name, with a quiet row-level Add/Play glyph pair and sortable metadata columns.
  4. Liquid Glass reserved for the control layer: the player bar, the Inspector action capsule, Now Playing transport and sheet footers.
  5. A three-pane source list → list → Inspector layout with a persistent status row ("Up to date", plus Undo/Redo).
- **Owner decisions (graded, not targets):**
  - The brand accent is the AccentColor asset, so it appears only under Multicolor. In Dark it is a deep #3652D0, and macOS also draws the selected Settings tab label in it.
  - The transport lives in a bottom player bar.
  - Appearance offers Light, Dark and follow macOS.
  - There is no customizable toolbar.
  - Unsubscribe takes two clicks (it arms, then disarms by itself) and can be undone.
  - Liquid Glass is on the player bar, Inspector actions, Now Playing and the View editor footer.
  - Spotlight is deferred.
  - MCP is off by default; App Intents are on.

## Flows

- **Tasks run:** none by me. The evidence is the owner's XCUITest tour (`apps/apple/UITour/PodListUITour.swift`), which drives 35 states in Light and Dark at one window size (1180 × 760). Along the way it asserts some stability: the leading title x holds across the View and Playlist screens, the Playlist Play control and section picker hold before and after selection, the Inspector toggle stays put, the History text stays above the player, and sheets don't widen at 200% text.
- **Widths:** one (the default size). The minimum and half-display sizes were not captured.
- **Timed runs:** none. **Measurements file:** none. **Screenshot strip:** the capture set only.
- So, under CRITIQUE § Flow run, the F-only checks are N/O, the **stability sub-score is N/O**, and Consistency & polish is marked "(partial: no flow run)". The S-observable flow checks (FLOW-04 to FLOW-07) were judged from the captures.
- **Failures:** none scored. One visual observation, between two caused states, is recorded under APPEAR-11, not FLOW-01: after Show Description → Show Less on the Podcast page, the Episode table never returns to its first layout. The Published column starts about 10 pt further left, and two titles wrap to two lines (`light/18` vs `light/21`, and the same in `dark/20`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library lists (Views, Subscriptions, Search: 01, 02, 04, 05, 15) | Status row at the top of the content, leading; caption text in primary ink; disappears after 5 s (`EditingNotice`) | Same row; `podListError` red text plus a trailing **Retry** button | none | Status row, trailing: bordered "Undo ‹Name›" / "Redo ‹Name›"; persistent; also Edit › Undo ‹Name› | Centred SF Symbol, bold title, secondary body, optional action ("No Matching Episodes" / "Clear Search") | none | Toolbar trailing control group (Play Now, Add to a Playlist…, More, Edit View…) | Description line under the status row ("Published in the last 7 days · Unplayed · …") |
| Playlist Entries, History, Timeline (06–10, 34a) | as above | as above | Rewind to Here… → sheet preview (34) | as above | History: clock, "No History", explanation, no action (08) | none | Toolbar trailing group; centre segmented Entries/History/Listening Timeline | Empty-state text explains how History fills |
| Trash (14) | as above | as above | Delete Permanently… → alert "Delete “X” Permanently?" (code) | as above | Trash glyph, "Trash Is Empty", 30-day explanation | none | none visible | Empty-state explanation |
| Podcast page (18–21) | as above | Inline `FailureFeedback` under the header, with Retry (code) | Unsubscribe armed in place: red label and icon, disarms after ~4 s (20) | Status row trailing | "No Episodes Yet" plus Refresh Episodes (code) | none | Subscribed/Unsubscribe button in the header | Show Description link |
| Sheets (11–13, 16, 17, 22, 23, 25, 34) | Sheet closes; confirmation lands in the library status row | Status slot above the footer, red, with a Retry title (`FailureFeedback`) | none | Through the library row after the sheet closes | n/a | Sheet is window-modal | **Trailing default button inside a glass footer card**; Cancel to its left; secondary actions leading (Delete Playlist/View, Play Now/Next) | Caption notes above the footer (11, 23) or under the control (22) |
| Add Podcasts window (24) | Import progress "in Library" | Inline (code) | none | n/a | Magnifier, "Find Your Next Podcast", example URL | none | **Search**, trailing of the field (disabled until there's text) | Caption help under the field |
| Settings (27–30, 32) | Live apply, no confirmation | Inline per setting, with recovery (`GeneralSettingsEdits` failures) | Getting Started opens as a sheet over Settings (32) | n/a | n/a | none | n/a | Caption notes inside each group |
| Now Playing (26), Listening Stats (31) | n/a | Player row error with Retry Playback (code) | none | n/a | n/a | none | Transport in a glass capsule | Stats footnote |

**Mismatches**

1. **Accent text changes meaning-colour between appearances.** "Current Entry" and its play-circle mark, and the "Show Description" link, are accent blue in Light (`light/07`, `light/18`) but neutral label colour in Dark (`dark/07`, `dark/20`). This is a deliberate contrast fallback (`MacAccentForegroundStyle`). The cost is that the link loses its link signifier in Dark. Screens: 06, 07, 10, 18–21.
2. **Label typography in sheet forms.** "Download Rule on This Device" is caption-sized while every other form label is body-sized, even in the same sheet as "Played Threshold" and "Speed" (22). The same label appears on 18 and 25.
3. **Form-label capitalisation.** "Last Days", "In a Playlist" and "Download Rule on This Device" use title case, but "Minimum length (Optional)" and "Maximum length (Optional)" use sentence case (16, 17). "Not downloaded on this Device" (03, 07) has a lowercase "this" against "on This Device" (18, 22, 25).
4. **Delete explanations.** Playlist Settings explains that Delete Playlist is immediate and restorable (11). The Edit View sheet's Delete View has no such note in the visible area (16).
5. **The Undo/Redo button follows the person across screens.** The status row shows a global history: "Redo Playlist Settings" appears on Trash and Search (14, 15), and "Redo Edit View" on the Podcast page and Subscriptions (18–21, 25). It sits in the same place every time, but it reads as belonging to the current screen when it doesn't.

## Checklist

**Coverage: 89.4%.** 126 pass · 9 fail · 16 N/O · 19 N/A, out of 170 IDs (80 core + 90 Mac), with 151 applicable.

### Failures by severity

**Blockers:** none.

**Majors** (all three are owner decisions, so they are scored but not targeted)

- **[WIN-05] Critical actions and information sit at the bottom edge.** The bottom glass player bar holds Play/Pause, Back 15/Forward 30, the seek slider, Speed, Sleep, the now-playing title and the Active Playlist link (every library capture, for example `light/02`, `dark/03`; `PlayerViews.swift` `PlayerBar`). The bar is far more than limited status about the window. If the window's bottom edge is dragged off-screen, the transport goes with it.
  - Mitigation: Controls menu equivalents with ⌘←/⌘→/⌘., Space in Library, media keys through `MPRemoteCommandCenter`, and the Now Playing window.
  - Fix, should the owner revisit: put the transport and title in a toolbar-centre now-playing item (the Music/Podcasts layout), and leave the bar for status only.
- **[SYS-05] No Spotlight indexing.** No `CoreSpotlight` anywhere in `Sources/`. Owner-deferred.
  - Fix: index Episodes and Subscriptions with `CSSearchableItem` (title, podcast, published date), so a result opens the Episode Inspector.
- **[APPEAR-04] Control-label contrast in Dark.**
  - The selected Settings toolbar tab label "General" or "Automation" measures **1.73:1** (`#435FDD` on the `#484747` selected-tab fill, `dark/27`, `dark/28`, `dark/30`). macOS draws it in the app's Dark accent `#3652D0`, so it is owner-accepted. It is a control label, so the severity is major.
  - Also measured: the Light window subtitle ("6 Episodes · 1 selected", "Podcast page") is system `secondaryLabelColor` at **3.95:1** at about 11 pt (`light/02`, `light/03`, `light/18`). It is system-drawn, non-essential metadata.
  - Also measured: the keyboard focus rings derived from the accent measure about 2:1 against adjacent surfaces in both appearances (`light/27`, `dark/27` Speed pop-up, `light/11` Name field). This is non-text and system-drawn.
  - Fix for the tab: make the Dark AccentColor variant light enough to reach 4.5:1 on both the selected-tab fill and the window background (about `#9DB1FF`, which the app already uses for `podListBrand` in Dark). Or accept the cap.

**Minors**

- **[TYPE-06] The Inspector show-notes measure is about 31–35 characters per line** at the default width ("Who sets the price of rice?. An", `light/03`, `dark/03`), below the 45-character floor. Fix: give the Inspector an ideal width of about 300 pt, or let show notes open in a reading pane or the Episode Details window at 60–75 characters.
- **[COPY-04] Inconsistent capitalisation by element type in sheet forms and Inspector labels** (mismatch 3: `light/16`, `light/17`, `light/03`, `light/22`). Fix: title-case every form label ("Minimum Length (Optional)", "Maximum Length (Optional)"). In running text, use "on this Device" everywhere, or "on This Device" everywhere.
- **[APPEAR-11] The Podcast page Episode table does not restore its layout after Show Less.** Comparing `light/18`, `light/21` and `dark/20`, the Published column x drops from 948 to 927 display px, and "The long life of a shipping container" and "Inflation, explained with sandwiches" wrap to two lines, which makes those rows about 40% taller.
  - Likely cause: the columns shrank while the expanded description added a vertical scroller and never regrew (`PodcastScreens.swift` Table, title column `.width(min: 240, ideal: 420)`).
  - Fix: re-apply the ideal widths when `descriptionExpanded` toggles. Or keep Episode titles to one line with tail truncation and a tooltip, as the View lists do.
- **[SYS-02] No vended Services.** There is no `NSServices`. "Subscribe in PodList" on a selected feed URL in another app would be a natural one. Fix: add one service that takes a URL or string and opens Add Podcasts prefilled.
- **[SYS-03] No app URL scheme or universal links for Episodes, Playlists or Views.** Copy Link and Share give the publisher's web or enclosure URL (`ShareLinks.swift`). Fix: register `podlist://episode/<id>`, `podlist://playlist/<id>` and `podlist://view/<id>`, routed through `LibraryWindowTarget`, and add a Copy PodList Link item.
- **[SYS-06] No Share extension or Safari route to receive a podcast URL from another app.** Window drops of feed URLs are supported (`LibraryDrops.swift`). Fix: add a Share extension that accepts a URL and hands it to Add Podcasts.

### N/O

FLOW-01, FLOW-02, FLOW-03, DATA-05, DRAG-05, DRAG-07, PTR-03, RESP-01, RESP-02, FOOT-01, FOOT-02, WMENU-02, WIN-10, TOOL-02, SET-04, SET-06.

### N/A

DLG-09 (no popovers), CTRL-02 (no checkbox hierarchies), LIST-05 (no disclosure outlines), START-04, START-05 (no permission prompts), START-07 (no account creation), MENU-06 (no custom Option alternates), FILE-02, FILE-05 (no document model or printing), FMT-01, FMT-02 (no formatted text), DATA-02, DATA-03, DATA-08 (not a document app), SYS-07 (no meaningful Dock state beyond Now Playing), EXTRA-01 to EXTRA-04 (no menu bar extra).

### Passes, with the evidence that settles them

- **Menus**
  - MENU-01: order is PodList, File, Edit, View, Podcast, Views, Episode, Playlist, Controls, Window, Help (`menus.txt`).
  - MENU-02: every toolbar, context, Inspector and player command has a menu item. That includes Rewind to Here…, Resume in Playlist, Play Chapter, Copy Feed Address, Go to Time…, and the per-Playlist Play Now/Next/Last in ▸.
  - MENU-03: unavailable items stay dimmed; Play/Pause retitles; Hide Sidebar and Hide Inspector are state titles.
  - MENU-04: ellipses on input items. MENU-05: one submenu level.
- **App menu:** APP-01, APP-02 (Settings… opens the `Settings` scene), APP-03, APP-04.
- **File menu:** FILE-01, FILE-03, FILE-04.
  - FILE-01 note: the app opens `.opml` from Finder (Viewer role) through File › Import OPML…. Binding ⌘O to it, as Music binds Import…, would close the gap fully.
  - FILE-03: Close / Close All. FILE-04: Export OPML… leaves the window open.
- **Edit menu**
  - EDIT-01: Undo/Redo name the operation ("Redo Edit View", `PlaylistEditingModel.undoTitle`).
  - EDIT-02, EDIT-03: Search Library ⌘F is an object search; the text Find submenu is intact.
  - EDIT-04: Spelling, Substitutions, Transformations, Speech, Dictation and Emoji are all present.
  - EDIT-05: `EpisodeCopyContent` puts text plus a URL on the pasteboard.
- **View, Window and Help**
  - VIEW-01, VIEW-02.
  - WMENU-01, WMENU-03.
  - HELP-01: PodList Help opens a real help window with a full shortcut table (`ConnectionViews.swift` `PodListHelp`). HELP-02.
- **Keyboard**
  - KEY-01: the tour runs with `AppleKeyboardUIMode 3` and Tabs to the sheet checkbox. KEY-04: sheets focus Name.
  - KEY-06: SwiftUI shortcut localisation. KEY-07: native List and Table. KEY-08: the in-app reference documents Space and Return.
  - KEY-02: ⌘. is Stop, as in Music; ⌘L is Now Playing. KEY-03. KEY-05: notation in ⌥⇧⌘ order.
  - TEXT-01: `PlaybackKeyboardGuard` routes keys to `interpretKeyEvents`. TEXT-02.
- **Windows:** WIN-01, WIN-02 (sheet parents grey out, e.g. `light/11`), WIN-03, WIN-04, WIN-06, WIN-07 (Open in New Window), WIN-08 (New Window ⌥⇧⌘N), WIN-09.
- **Toolbars:** TOOL-01, TOOL-03, TOOL-04, TOOL-05, TOOL-06.
- **Sidebars:** SIDE-01 to SIDE-06. SIDE-06: the sidebar follows the system icon-size setting.
- **Settings**
  - SET-01. SET-02: Appearance defaults to "System" (`LibrarySettingsScreens.swift:51`, `MacAppearance` applies `nil`).
  - SET-03: toolbar panes; minimise and zoom dimmed; the window sizes to the pane (27 vs 30). SET-04 title matches the pane. SET-05: live apply.
- **Dialogs**
  - DLG-01: no alerts for undoable actions. DLG-02, DLG-03, DLG-04 (⌘. maps to Esc in sheets). DLG-05 (`role: .destructive`, Cancel safe). DLG-06. DLG-07. DLG-08: Add Podcasts is a modeless utility window.
- **Controls:** CTRL-01, CTRL-03 to CTRL-08.
- **Lists:** LIST-01 to LIST-04, LIST-06, LIST-07 (type-select is asserted in the tour; native Table).
- **Data safety**
  - DATA-01: drafts survive (`PlaylistDrafts`, rename drafts). DATA-04: named multi-step history. DATA-06: `@SceneStorage` window context with selection, sort, scroll anchor and pane widths. DATA-07: Save panel defaults to "PodList.opml".
- **Drag and drop**
  - DRAG-01: Episodes drag to sidebar Playlists and reorder in Entries; OPML and feed-URL drops on the window; menu equivalents for all of it.
  - DRAG-02: Option forces copy. DRAG-03: drops are named, undoable edits. DRAG-04: multi-item, private type plus URL plus text. DRAG-06: dropped rows are revealed.
- **Pointer and context menus**
  - PTR-01: context menus on sidebar rows, lists, tables and Timeline rows. PTR-02: no shortcuts shown in them. PTR-04: tooltips on icon-only controls, and full titles on truncation. PTR-05: `contextMenu(forSelectionType:)`.
- **Appearance**
  - APPEAR-01, APPEAR-02 (selection follows the system accent; the brand appears only under Multicolor).
  - APPEAR-03: Increase Contrast and Reduce Transparency variants (`MacGlassSurface` turns opaque with a stroke, plus high-contrast palettes).
  - APPEAR-05: there are no custom animations, so nothing needs reducing.
  - APPEAR-06 to APPEAR-10.
- **Type, accessibility and launch**
  - TYPE-01: body measured at about 13 pt (W cap height 9.5 pt). TYPE-02 to TYPE-05, TYPE-07. TYPE-08: …, ’ and “” throughout.
  - AX-01: icon buttons carry specific names such as "Play Now: Who sets the price of rice?". AX-02. AX-03: Text Size 100–200% and View › Bigger/Smaller. AX-04. AX-05.
  - START-01 to START-03 (Getting Started can be hidden and reopened from Help, Window and Settings), START-06.
- **Remaining:** COPY-01 to COPY-03, EDIT-02, FLOW-04 to FLOW-07, SYS-01 (App Intents, UndoableIntent, AppShortcuts), SYS-04 (`ShareLink` for Episode and Podcast).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.4** | Strong band.<br>• What lifts it: SF at Mac sizes (body about 13 pt), and hierarchy carried by weight and secondary ink. In Episode rows, a 13 pt title sits over a caption podcast name in readable `#606060` (6.29:1 Light, 6.05:1 Dark). Timeline rows use a bold title, then a body date, then a caption event. Real ellipses and curly quotes appear throughout.<br>• What keeps it below 8: the caption-size "Download Rule on This Device" label beside body-size labels (22); sheet labels sitting about 3 pt above their pop-up text instead of on its baseline (16, 17, 11); the 31-character Inspector show-notes measure (TYPE-06); and wrapped titles on the Podcast page (21). | hierarchy, craft |
| Hierarchy | **7.2** | Strong, low.<br>• What lifts it: source list → list → Inspector reads left to right, the toolbar is quiet (one small control group plus search), and the selection is the strongest shape.<br>• What competes: the 92 pt glass player bar with a bold centred title is the second-strongest block on every screen (owner decision). The black (Light) / white (Dark) circular Play in the Inspector is a heavy focal point (03, 07). "Rewind to Here…" repeats on every Timeline row (09). The persistent global "Redo …" button sits in unrelated screens (14, 15, 18). | content-first, hierarchy |
| Spacing & density | **7.1** | Strong, low.<br>• What lifts it: Mac density for the posture (32 pt sidebar rows, 54 pt two-line rows, 28 pt row buttons), and a shared leading title edge across View and Playlist screens (asserted in the tour).<br>• What keeps it low: the Current Entry row is taller, and its title is indented about 23 pt from the other rows (06, 07, 10). Sheet forms aren't baseline-aligned and their pop-up widths are ragged (Published, Podcasts, Played, Starred and In a Playlist are all different widths, 16, 17). The Podcast page table inset is x 425 against 409 elsewhere (18). | craft, hierarchy |
| Color & contrast | **6.9** (capped by APPEAR-04 major; uncapped about 7.7) | • What earns it: color restraint. Accent is used only for selection, sidebar symbols and the Current Entry mark; red only for Unsubscribe and errors (`#B91C1C` / `#FF9FA1`, 5.48:1 and 6.51:1 on the button fill); custom readable secondary ink passes everywhere I measured; and there are Increase Contrast palettes in code.<br>• What caps it: the Dark selected Settings tab label at 1.73:1 (owner-accepted). Also the Light window subtitle at 3.95:1 (system), and the accent-to-neutral fallback that drops the link colour in Dark (mismatch 1). | color-restraint, accessibility |
| Iconography | **7.6** | One SF Symbols family at text weight, used for standard meanings: trash = Trash, `square.and.arrow.up` = Share, `slider.horizontal.3` = Edit View / Playlist Settings, `gobackward.15` / `goforward.30`. Every icon-only control has a tooltip and an AX name. Sidebar glyphs follow the accent.<br>What keeps it below 8: `text.badge.plus` for "Add to a Playlist" reads as "add text", and it repeats on every row next to Play. | conventions, craft |
| Consistency & polish | **7.2** (stability N/O, partial: no flow run) | • What lifts it: every state is designed — empty, disabled toolbar, inactive-window grey selection (03 sidebar), armed/disarmed, hover on Rewind to Here… (34a), focus rings, and identical Light/Dark structure. One sheet anatomy is used everywhere.<br>• What holds it down: the Podcast table doesn't restore its layout (APPEAR-11), the mismatches above (label size and case, accent fallback), and a glass footer *card* on every sheet, including two-button sheets with nothing scrolling under it (13, 23, 25). | craft, stability |
| Clarity | **7.4** | Window titles name the view, with counts as subtitle. Verbs are specific: "Add 1 Episode to a Playlist", "Rewind to Here…", "Hide Getting Started". The copy explains consequences before you act, and the Rewind sheet is a preview of exactly what changes (34).<br>• What lowers it: "Redo Playlist Settings" on the Search screen doesn't say which Playlist; the Listening Stats footnote ("Episodes finished counts playback, and changes after Rewind or marking Unplayed") is hard to parse; the sidebar "Search 15" count is unexplained; "Podcast page" as a subtitle is redundant; and COPY-04. | plain-language, feedback |
| Platform fit | **6.9** (capped by WIN-05, SYS-05 majors; uncapped 7.8) | **Looks 7.6.**<br>• Native: L1–L9, L11 — traffic lights, unified toolbar, a toolbar-pane Settings window, real pop-ups, checkboxes and segmented controls, Mac row sizes, accent selection that greys out when inactive.<br>• Adapted: L10 — the bottom glass player bar (an iOS mini-player idiom) and the glass footer card in sheets.<br>**Behaves 7.9.**<br>• B1–B7 and B10 are Native: complete menus, state titles, standard shortcuts, Cocoa text, type-select, context menus, multi-window, `SceneStorage` restoration, labelled Undo, real Help.<br>• B8 Native: drag with Option-copy.<br>• B9 Adapted: App Intents, Share and media keys, but no Spotlight, URL scheme or Services.<br>(7.6 + 2 × 7.9) ÷ 3 = 7.8, capped to 6.9. | conventions, discoverable-commands |
| Interaction & feedback | **7.9** (partial: no timed runs) | Keyboard-fluent: shortcuts for every frequent action, Space and Return in lists, type-select, a documented reference. Undo replaces confirmation: Unsubscribe arms in place and can be undone, Delete Playlist goes to Trash, and the only alert is Delete Permanently. History is named. Drafts survive. Drag has menu equivalents. VoiceOver names are specific. Reduce Transparency and Increase Contrast are honoured. Feedback reserves its own 32 pt row, so it can't push content.<br>• What keeps it below 8.5: RESP and FOOT are unmeasured; Play/Pause shows no key equivalent in the menu (Space is contextual only); and the unsubscribe arm expires after about 4 s, which is short for someone reading slowly. | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **7.3** | It serves the primary task well and is at home on a Mac in almost every corner. The menus, keyboard, undo and help are at the level of good indie Mac apps. The cap would allow up to 8.9 (lowest 6.9 + 2.0). The weakness holding Overall down most is the owner-decided platform cluster (bottom player bar, no Spotlight, deep Dark accent). Below that sit small craft inconsistencies in sheets and on the Podcast page. | — |

## What stands between this build and 9.0

1. **The owner-decided caps.** WIN-05 (bottom transport), SYS-05 (Spotlight) and the Dark accent's 1.73:1 tab label each hold their category at 6.9. While they stand, Platform fit and Color & contrast can't reach Strong-high or Exemplary.
2. **Evidence.** There's no flow run with a measurements file at the minimum and half-display widths, and no timed passes. Without them, the stability sub-score, RESP-01/02 and FOOT-02 stay N/O, and Consistency and Interaction stay "partial".
3. **Sheet craft.**
   - Labels should sit on their controls' first baseline.
   - Pop-up widths should be uniform within a form.
   - Label size should be one size (body), and label case one style (title).
   - The glass footer card should be kept for the scrolling View editor only.
4. **Podcast page polish.** Table columns should restore after Show Less. Titles should stay on one line (as on the View lists), or wrap consistently.
5. **Integration breadth.** A `podlist://` URL scheme for Episodes, Playlists and Views, a "Subscribe in PodList" Service, and a Share extension.
6. **Smaller clarity items.** Scope the status-row Undo/Redo to the current screen, or name its target ("Redo Settings for Commute"). Rewrite the Listening Stats footnote. Restore a link signifier for "Show Description" in Dark.

## Next step

- **Target.** There are no blockers, and the majors are owner decisions, so step 4 falls to the lowest-scoring category. Platform fit and Color & contrast tie at 6.9. Platform fit is closer to the primary task (Add to a Playlist is a sheet). Its one gap that isn't owner-decided and is visible on every sheet is the Looks signal L10, the sheet footer.
- **Anti-pattern.** *Floating-tool pileup* / *Glass button impostor* (anti-patterns § 4). A glass card is used as decoration where nothing scrolls beneath it.
- **Root cause.** `PodListSheetFooter` (`PodListSheet.swift:195`) always wraps the button row in `.padding(20).macGlassSurface().padding([.horizontal, .bottom], 12)`. Every sheet — New Playlist, Add to a Playlist, Download Rules, Rewind, Playlist Settings and Subscription Settings (11–13, 22, 23, 25, 34) — therefore shows an inset rounded card around its buttons. Mac sheets place bare push buttons trailing at the bottom margin. The owner's glass decision covers the View editor footer, where the form does scroll under it.
- **Change.** Add a `floating: Bool` parameter, true only for scrolling sheets (View editor / New View). When it is false, render the same `HStack` with `.padding(20)` and no glass surface or extra inset. This keeps the 12 pt control gap, the trailing default button, Cancel on its left and secondary actions leading.
- **Principle.** `conventions`, `content-first` (glass belongs to controls *above content*).
- **Expected effect.**
  - Platform fit Looks L10 goes from Adapted to Native (the score stays capped).
  - Consistency & polish about +0.2.
  - Hierarchy about +0.1: there's one less box-in-box on every sheet.
  - Nothing regresses. The View editor keeps its footer, which preserves the owner's glass adoption and signature element 4.
