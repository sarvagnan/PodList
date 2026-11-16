# PodList Mac — UI grade, round 15 (Opus grader)

Build: `apps/apple` at `db60021`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`. Evidence: `~/Documents/podlist-grading/mac-round-15/` (35 states × Light/Dark, 2× PNG plus XCUITest snapshot `.txt`, `menus.txt`) and the source code. Earlier rounds' reports weren't read. The app wasn't launched, and no screen-control tools were used.

Capture references below are written `L02` (light/02-new-this-week.png), `D27` (dark/27-settings-general-top.png), and so on. Points = pixels ÷ 2. Contrast was measured on the PNGs (WCAG relative luminance, background = modal colour of the crop, foreground = the colour at the 99.5th contrast percentile).

## Frame

- **Task:** find Episodes through Views and Subscriptions, put them into Playlists, and listen. The Library window (sidebar → list → Inspector, with a bottom player) is the hub.
- **Target:** Mac app (SwiftUI, macOS 26+), captured on macOS 27.2.
- **Posture:** sovereign. It stays open all day while you listen, with short bursts of curation.
- **Audience:** perpetual intermediate, with a deep keyboard layer for experts.
- **Nearest exemplar:** Things. A calm personal tool with a firm domain model ("Views find Episodes; Playlists hold Entries") and forgiveness through undo and Trash.
- **Character:**
  1. A capitalized domain glossary in the copy (Episode, Entry, Playlist, View, Device, Position).
  2. Monogram artwork tiles (MH / DF / SB) in pale brand blue.
  3. A glass player bar along the bottom of the Library window *(owner-fixed)*.
  4. Plain consequence-explaining copy in sheets and empty states ("Deleted Playlists are kept for 30 days…", "Rewind can be undone").
  5. The brand blue as AccentColor, used only under Multicolor *(owner-fixed)*.
- **Owner decisions** (graded, but not targets):
  - Brand blue is the AccentColor, and the deep Dark value (#3652D0) colours the selected Settings tab label.
  - Transport controls live in a bottom player bar.
  - Appearance offers Light, Dark and following macOS.
  - The toolbar isn't customizable.
  - Unsubscribe takes two clicks on the same control, with automatic disarm and undo.
  - Liquid Glass is used on the player bar, the Inspector actions, Now Playing and sheet footers.
  - Spotlight indexing is deferred.
  - MCP is off by default, and App Intents are on.

## Flows

**No flow run was available.** The evidence is a scripted XCUITest tour that captures 35 separate settled states. It records no per-step element boxes, focus, timing or measurements file. Per CRITIQUE § Flow run:

- The F-only checks are N/O: FLOW-01, FLOW-02, RESP-01 and RESP-02.
- The stability sub-score is **N/O**.
- Consistency & polish is marked "(partial: no flow run)".

FLOW-03 to FLOW-07 were judged from the captures and code, because their channels include S or C.

- **Captured:** one width (the default 1180 × 760 pt Library window), in Light and Dark, on a Retina 1920 × 1200 VM desktop.
- **Not captured:** the minimum or half-display window sizes, and no timed runs.
- **Failures:** none can be cited, because there are no measurement rows.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library lists (Views, Playlist Entries/History/Timeline, Subscriptions, Search, Trash) — L01–L15, L33 | Transient notice in the feedback row at top-leading of the content column, next to the "Up to date" sync status. It expires after 5 s (`EditingNotice.swift`). Neutral colour. | Inline in the same feedback row: red text plus a "Retry" button. Indexed as Edit › Retry Failed Operation (`FailureFeedback.swift`). | none | "Undo/Redo ‹Operation›" button at top-trailing of the content column (L13–L15 "Redo Playlist Settings", L18–L25 "Redo Edit View"). Also Edit › Undo ‹Operation›. | Centred SF Symbol, title-case title, secondary-ink sentence: "No History" (L08), "Trash Is Empty" (L14), "Select an Episode" (Inspector, L02). | none | Toolbar play / add / more cluster, trailing. Row Play/Add buttons stay quiet until hover. | View summary line under the status ("Published in the last 7 days · Unplayed · …", L02) |
| Podcast page — L18–L21 | Same feedback row | Same row; FailureFeedback under the header | Unsubscribe arms in place: red "Unsubscribe" with a minus icon, then disarms (L20→L21) | Same top-trailing button | "No Episodes Yet / No Matching Episodes" with a button (code) | none | Leading "Subscribed" button in the header action row | "Show Description" link |
| Episode Inspector — L03, L07, L33 | Inherits the window row | — | none | — | "Select an Episode / Its details and Playlists appear here." | none | Large circular Play, then a glass action group | Tooltips on the icon-only actions |
| Editing sheets (Playlist Settings L11, New Playlist L13, Edit/New View L16–17, Subscription Settings L22, Add to Playlist L23, Download Rules L25, Rewind L34) | Sheet closes; the result shows in the list | `status:` slot above the footer (code: `PodListSheet`) | Rewind preview sheet with explicit consequences (L34) | Window row after the sheet closes | — | none | Default button trailing in a glass footer; Cancel just before it; destructive or secondary actions leading (Delete Playlist, Delete View, Play Now / Play Last) | Caption-size secondary help under the controls (L11, L22) |
| Add Podcasts window — L24 | Results list | Inline | none | — | "Find Your Next Podcast" with an example URL | none | "Search" trailing beside the field | Caption help naming File › Import OPML… |
| Settings — L27–L30 | Live apply, no confirmation | Inline red under the field (Skip Intro validation, code) | none | — | — | none | n/a (live apply) | **Two styles:** body-size primary ink ("Closing this window does not stop the import…", L27) *and* caption secondary ("Enlarges content text…", L28; "This setting applies only to this Mac…", L30) |
| Now Playing — L26 / Listening Stats — L31 | — | Player FailureFeedback with "Retry Playback" | none | — | "No Listening Time Yet" (code) | none | Glass transport capsule (Now Playing) | Footnote under the totals (L31) |

**Mismatches**

1. **Explanatory notes use two styles inside one Settings pane.** In L27 the Library note is body-size primary text. In L28 the Text Size note, and in L30 the second Automation note, are caption-size secondary text. Screens: Settings General and Automation.
2. **Section headings in sibling sheets differ.** Subscription Settings uses bold section headings ("On This Device", "Played", "Playback Settings Overrides", L22). Edit View and New View put a regular-weight title-case line, "All Conditions Must Match", where a heading belongs (L16, L17). Screens: the editing sheets.
3. **Some windows repeat their own title.** Now Playing (L26) and Listening Stats (L31) repeat the title-bar text as a large in-content heading. The Library, Add Podcasts and Settings windows don't. Screens: the auxiliary windows.
4. **The same control and content look different on the two player surfaces.**
   - The progress slider fills neutral grey in the player bar (L01) but accent blue in Now Playing (L26).
   - The bar sets the Episode title bold over a regular podcast name. Now Playing sets a large regular-weight title over a **bold** podcast name, so the hierarchy is inverted.
5. **"Current Entry" uses different ink in each appearance.** It's accent blue in Light (L06) and primary white in Dark (D06). This is deliberate, from the accent-contrast logic in `MacAccentForegroundStyle`. It's listed for completeness and not counted against the app.

No main action moves between screens of the same kind: sheet defaults are always trailing in the footer (FLOW-07 passes).

## Checklist

**Coverage: 92.4 %** (pass 126 · fail 7 · N/O 11 · N/A 24). Applicable = 144, verdicts = 133.

### Failures by severity

**Blocker:** none.

**Major**

- **[WIN-03] Expanding the podcast description clips the Download Rule control into a nested scroller** *(Windows → caps Platform fit)*.
  - **Evidence:**
    - In L19 and D19, after "Show Description", the label "Download Rule on This Device" sits directly over the table header with no pop-up under it.
    - The snapshot (`light/19-description-expanded.txt`) shows why. The header is its own scroll view at frame y 292–676 with a scroller (`scrollBar` x = 1244). The `popUpButton` "Stream" is at y 684.5 and the "6 Episodes" count at y 720.5, both below the inner viewport. A second scroll view, for the table, starts at y 688.
  - **Cause:** in `PodcastScreens.swift:29–51`, `PodcastPageLayout` puts the whole header (description, action row, `DownloadRuleEditor`, count) in a `ScrollView` capped at `0.6 × (viewport − 36)`. At the default 760 pt window, a long description pushes essential controls into a small inner scroll region above another scroll region.
  - **Fix:** cap only the description text. Keep the action row, Download Rule and count outside the capped region, in fixed order below the description viewport (for example `PodcastDescription(...).frame(maxHeight: …)` inside its own `ScrollView`). Alternatively, scroll the whole page as one surface with the table's rows inside it. One scroll surface per column is enough.
- **[WIN-05] Critical playback controls sit in a bottom bar** *(Windows → caps Platform fit; owner decision, not a target)*.
  - **Evidence:**
    - The glass PlayerBar (`PlayerViews.swift:12–30`, attached with `.safeAreaInset(edge: .bottom)` in `MacWindow.swift:189`) holds Play/Pause, ±15/30, the scrubber, Speed, Sleep and the Active Playlist link. It's about 93 pt tall at the window's bottom edge (L01–L33).
    - The HIG reserves bottom bars for limited status.
    - Mitigations exist: every transport command is in Controls with shortcuts (⌘←/⌘→, ⌘.), Space plays from Library focus, and the Now Playing window exists.
  - **Fix (if ever revisited):** move transport and the title into a toolbar "now playing" item, as Music and Podcasts do on macOS, and keep the bottom bar for status only.
- **[SYS-05] No Spotlight indexing** *(System integration → caps Platform fit; owner-deferred, not a target)*.
  - **Evidence:** there's no `CoreSpotlight`/`CSSearchableItem` in `apps/apple/Sources`.
  - **Fix:** index Episodes, Subscriptions and Playlists with `CSSearchableIndex`, reusing the `EpisodeEntity`/`PlaylistEntity` App Entities (`IndexedEntity`), so Spotlight results open the item.
- **[APPEAR-04] In Dark, the selected Settings tab label is 1.73:1** *(Appearance → caps Color & contrast; owner-accepted, not a target)*.
  - **Evidence:** in D27, "General" is drawn in (67, 95, 221) on the selected-tab capsule (72, 71, 71): **1.73:1**. The icon is the same colour.
  - It's a control label, so per the APPEAR-04 scope rule it's major, not isolated-minor. In Light the same label is 7.69:1 (L27).
  - **Cause:** macOS draws the selected toolbar-pane label in the AccentColor's Dark value, #3652D0, which is chosen so white text on selected rows reads (9.96:1, D03).
  - **Fix:** a separate, lighter Dark value isn't available for the toolbar-pane tint alone. The options are a lighter Dark AccentColor (around #9DB1FF, the brand Dark value already in `MacBrandPalette`) with dark selected-row text, or accepting the cap.

**Minor**

- **[COPY-04] Capitalization differs inside one list of steps.**
  - **Evidence:** Getting Started (L32; `LibrarySettingsScreens.swift:278–284`) mixes "Add podcasts to your Library" (sentence case) with "Understand Views" and "Add Episodes to Playlists" (title case), in three labels of the same kind.
  - **Fix:** "Add Podcasts to Your Library", or make all three sentence case with glossary capitals.
- **[MENU-04] Some menu items are bare nouns that read like commands.**
  - **Evidence:** Playlist › **Trash**, Podcast › **Subscriptions** and Views › **All Views** are navigation items with no verb (`menus.txt`; `EpisodeEditingViews.swift:396`, `LibraryCommands.swift:63,87`). "Trash" sits beside "Delete Playlist" in the same menu, so it reads as "move this Playlist to the Trash".
  - **Fix:** "Show Trash", "Show Subscriptions" and "Show All Views", or a Go group in View.
- **[SYS-03] No stable in-app links.**
  - **Evidence:** there's no URL scheme or universal link in the bundle's Info.plist (`scripts/build-mac-app.sh:20–60`), and `onOpenURL` handles only `.opml` files (`PodListMac.swift:42`). Share URLs point to publisher web pages, not into PodList.
  - **Fix:** register `podlist://episode/<id>`, `podlist://playlist/<id>` and `podlist://view/<id>`, route them through `WindowContext`, and offer "Copy PodList Link".

### N/O

FLOW-01, FLOW-02, RESP-01, RESP-02, FOOT-02, FOOT-01, APPEAR-11, START-01, WIN-10, SET-04, DRAG-07

### N/A

- FMT-01, FMT-02 — no formatted text.
- FILE-01, FILE-02, FILE-04, FILE-05 — not a document app; OPML is imported and exported, not opened as a document.
- DATA-02, DATA-03, DATA-08 — no documents or autosave model.
- DLG-09 — no popovers.
- CTRL-02 — no checkbox hierarchies.
- LIST-05 — no outlines.
- MENU-06 — no app-defined Option alternates.
- TOOL-06 — the toolbar can't be hidden or customized (owner decision).
- START-04, START-05 — no permission requests in Info.plist.
- START-07 — no account creation.
- SYS-02 — no selection Services worth vending.
- SYS-06 — no credential or Finder workflows; feed intake is covered by window drop and the OPML document type.
- SYS-07 — no meaningful Dock state.
- EXTRA-01 to EXTRA-04 — no menu bar extra.

### Passes (with the deciding evidence where it's not obvious)

- **Flow (S/C):**
  - FLOW-03: Skip Intro/Outro drafts clear only when the field isn't focused (`LibrarySettingsScreens.swift:252–253`). Add Podcasts results never write the query.
  - FLOW-04: Undo/Redo and armed Unsubscribe appear in place, in a reserved row (`reservesSpace: true`).
  - FLOW-05: content and Inspector share top y = 88 pt.
  - FLOW-06.
  - FLOW-07.
- **Keyboard:**
  - KEY-01, KEY-04: sheets focus Name (L11, L13, L16); Add Podcasts focuses its field (L24).
  - KEY-06, KEY-07: Space is documented as play/pause.
  - KEY-08: PodList Help has a full shortcut grid built from `PodListShortcut` (`ConnectionViews.swift:76–118`).
  - KEY-02: ⌘. stops playback but cancels in sheets (`PlaybackKeyboardGuard`).
  - KEY-03: every Episode, Playlist and Controls command has a ⌘-family shortcut. Play's tooltip says "Space in Library".
  - KEY-05: ⌥⇧⌘ order in `notation`.
- **Dialogs:**
  - DLG-01: Rewind gets a preview sheet; Unsubscribe uses two-click arming instead of an alert.
  - DLG-02, DLG-03, DLG-04: Cancel `.cancelAction`, and ⌘. is routed to Escape in sheets.
  - DLG-05: Delete Permanently… uses the destructive role; Delete Playlist and Delete View are recoverable.
  - DLG-06, DLG-07, DLG-08.
- **Controls:**
  - CTRL-01: pop-ups, checkbox, small switches in grouped Settings, and a toolbar segmented control for the Entries/History/Timeline sections.
  - CTRL-03: "Mentions (Optional)" is marked.
  - CTRL-04: `FormNumbers` is locale-aware, with inline "must be a nonnegative number".
  - CTRL-05, CTRL-06.
  - CTRL-07: prompts "Search this list", "Search Library" and "Search Episodes".
  - CTRL-08: import progress, episode-drop progress, and download cancel.
- **Lists:**
  - LIST-01, LIST-02.
  - LIST-03: `Table(sortOrder:)` with resizable `TableColumn` widths. The Published sort chevron shows in L18.
  - LIST-04, LIST-06.
  - LIST-07: `typeSelectingRows`, `contextMenu(primaryAction:)`, Return = Play Now.
- **Data:**
  - DATA-01: drafts go through `editor.setDraft`.
  - DATA-04: server-backed multi-step history named in the menu ("Redo Edit View", `menus.txt`).
  - DATA-05: `revealRestoredEntries`.
  - DATA-06: `WindowContext` restores destination, search, selection, sort, tab, pane widths and scroll anchor.
  - DATA-07: standard `NSSavePanel`.
- **Drag:**
  - DRAG-01: Episodes drag to sidebar Playlists and out as URL/text; feeds and OPML drop on the window.
  - DRAG-02: same-Playlist move, other copy, ⌥ forces copy at drop time.
  - DRAG-03.
  - DRAG-04: private type, then URL, then text.
  - DRAG-05.
  - DRAG-06: placeholder rows are reserved synchronously, and dropped rows are selected.
- **Pointer:**
  - PTR-01, PTR-02: context menus omit shortcuts (`shortcut()` returns nil outside the menu bar).
  - PTR-03, PTR-04: `.help` on every icon-only control; tooltips on truncated titles.
  - PTR-05: `contextMenu(forSelectionType:)`.
- **Appearance:**
  - APPEAR-01, APPEAR-02: the system accent; brand colour only under Multicolor.
  - APPEAR-03: `MacGlassSurface` goes opaque with a 0.6-opacity stroke under Increase Contrast or Reduce Transparency; there are IC palettes for brand, error and secondary.
  - APPEAR-05: no custom animation exists.
  - APPEAR-06, APPEAR-07: regular glass, primary tint, no glass-on-glass.
  - APPEAR-08, APPEAR-09, APPEAR-10.
- **Type:**
  - TYPE-01: 13 pt body, 10–11 pt captions, Title 2 bold Inspector title.
  - TYPE-02, TYPE-03, TYPE-04 (28 × 28 pt row buttons).
  - TYPE-05: content Text Size 100–200 % with ⌘+/⌘−/⌘0.
  - TYPE-06: description lines 79–82 characters.
  - TYPE-07.
  - TYPE-08: …, –, ’ and the − minus sign throughout; no straight quotes found in UI strings.
- **Copy:**
  - COPY-01: "Click twice within four seconds".
  - COPY-02, COPY-03.
- **Accessibility:**
  - AX-01: row buttons are labelled with the Episode title; sidebar rows have a combined value.
  - AX-02: state appears as text ("In progress", "Current Entry") plus an icon.
  - AX-03, AX-04, AX-05.
- **Launch and help:**
  - START-02: Getting Started can be hidden and is reachable in Help.
  - START-03, START-06: "Start on This Mac" needs no account.
- **Edit and menus:**
  - EDIT-01, EDIT-02.
  - EDIT-03: Edit › Find is intact; ⌘F = Search Library for list search.
  - EDIT-04, EDIT-05: plain text plus URL on one item.
  - MENU-01: App · File · Edit · View · Podcast · Views · Episode · Playlist · Controls · Window · Help.
  - MENU-02: toolbar, row, Inspector, sidebar and podcast-header commands are all indexed, including retry and recovery.
  - MENU-03: Play/Pause, Star/Unstar, Mark Played/Unplayed and Show/Hide titles; Clear on Played has a checkmark.
  - MENU-05.
  - APP-01 to APP-04, FILE-03.
  - VIEW-01, VIEW-02, WMENU-01 to WMENU-03, HELP-01, HELP-02, TEXT-01, TEXT-02.
- **Windows, toolbar, sidebar, Settings:**
  - WIN-01, WIN-02 (grey sidebar selection when the list has focus, L03), WIN-04, WIN-06 to WIN-09.
  - TOOL-01 to TOOL-05.
  - SIDE-01 to SIDE-06: ⌃⌘S, a toolbar button and the View menu; the sidebar keeps system metrics (`macTextScale = 1`).
  - SET-01, SET-02: default "System".
  - SET-03: toolbar panes; General sized to 680 pt and scrolls; minimize and zoom dimmed (L27, L30).
  - SET-05, SET-06.
- **Integration:**
  - SYS-01: 10 AppIntents and 4 AppShortcuts, with Episode and Playlist entities.
  - SYS-04: `ShareLink` for Episode and Podcast.
  - APP-03.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.6** | **Strengths:** system font at Mac sizes throughout. List titles are 13 pt Regular with 10–11 pt secondary podcast names (`02-new-this-week.txt`: title frame 18.5 pt, subtitle 15 pt). The Inspector title is Title 2 bold (52.5 pt two-line frame). Weight and readable-secondary ink do the hierarchy work. Typographic punctuation is everywhere. **Holding it below 8:** the heading scale drifts between sibling surfaces — the regular-weight "All Conditions Must Match" in L16 versus bold section heads in L22. Listening Stats mixes a Large Title bold heading, a regular Title 2 "Top Podcasts" and a Headline streak on one page (L31). Now Playing inverts the bar's title/podcast weights (L26). On the podcast page, Episode titles wrap to two lines in the narrower column (L18). | `hierarchy`, `craft` |
| Hierarchy | **7.5** | **Strengths:** a clear source list → list → Inspector read. Row actions stay grey (#606060) until hover or selection. Toolbar emphasis is untinted. Empty states are calm. **Holding it back:** the roughly 93 pt glass player bar is the strongest shape at the bottom of every screen (owner decision). The 150 pt monogram placeholder plus the large solid Play disc dominate the Inspector over the Episode's facts (L03). "Rewind to Here…" repeats on every Timeline row (L09). | `content-first`, `hierarchy` |
| Spacing & density | **7.1** | **Strengths:** one 18 pt content inset; two-line rows about 46 pt apart; the system sidebar; Mac-sized controls. **Holding it back:** single-field sheets balloon — New Playlist leaves about 60 pt of empty band above its footer (L13), and so do Add to Playlist (L23) and Playlist Settings (L11). The Edit View form stacks every label above its control, so each condition costs about 110 pt and the sheet scrolls (L16, L17). Now Playing leaves the bottom quarter of its window empty (L26). The podcast-page table is inset about 14 pt from the header's leading edge (L18, x 440 vs 412 display px). | `craft`, `conventions` |
| Color & contrast | **6.9** (capped by APPEAR-04) | **Uncapped, about 8.3:** custom readable secondary ink — #606060 at 6.29:1 on white and 5.38:1 on the sidebar (L02); #A0A0A0 at 6.05:1 Dark (D02). Selected rows: white on accent at 9.17:1 (L03) and 9.96:1 (D03). Dark sidebar symbols 3.20:1 (non-text, passes). There are IC and Reduce Transparency variants, and colour is restrained, with red only for the armed Unsubscribe and errors. **Cap:** the Dark selected Settings tab label at 1.73:1 (D27), owner-accepted. | `color-restraint`, `accessibility` |
| Iconography | **8.0** | SF Symbols throughout at matched weights. Every icon-only control has a `.help` and a label. Symbols are standard (`trash`, `square.and.arrow.up`, `sidebar.right`, `chevron.left` Back). Sidebar glyphs follow the accent. There are no menu icons. **Holding it back:** five icon-only Inspector actions in one glass capsule rely on tooltips (L03). `text.badge.plus` for "Add to a Playlist" sits next to Play on every row and is the least self-evident glyph. | `conventions`, `plain-language` |
| Consistency & polish | **7.2** (stability N/O; partial: no flow run) | **Strengths:** empty, disabled, hover (L34a) and armed (L20) states are all designed. Inactive selection turns grey (L03, L11). Light and Dark both hold up. Sheet footers are consistent. **Holding it back:** the nested-scroller clip on the podcast page (L19). Settings notes use two styles (L27 vs L28/L30). Slider tint and title weight differ between the player bar and Now Playing. Now Playing and Listening Stats repeat their title-bar title. Listening Stats reads "0:00 listened" beside a non-zero bar on a 0.010-minute axis and a "1 day" streak (L31) — contradictory-looking rounding. | `craft`, `stability` |
| Clarity | **7.5** | **Strengths:** window titles name the view, with subtitle counts ("New this week – 6 Episodes · 1 selected"). Consequence copy is specific ("Delete Playlist takes effect immediately… restored from Trash for 30 days", L11). The armed state is visible. **Holding it back:** the glossary is dense for a newcomer ("Manual Played marks do not create History", L08; "Positions gained since this moment are reset", L34). The menu nouns "Trash" and "Subscriptions" read as commands (MENU-04). The "Add 1 Episode to a Playlist" sheet's default button is "Play Next" (L23). | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped by WIN-03, WIN-05, SYS-05) | **Looks 8.0:** native split view, sidebar, toolbar search, a toolbar-pane Settings window with dimmed zoom, Mac pop-ups and checkboxes. Foreign tells: the bottom player bar, iOS-style stacked-label sheet forms (L16, L22), and boxed glass footers inside sheets. **Behaves 8.5:** a complete menu bar in standard order with every command (B1); ⌘, opens Settings (B2); standard shortcuts intact with a ⌘-family layer and a Help shortcut grid (B3); `PlaybackKeyboardGuard` hands text keys to `interpretKeyEvents` (B4); type-select, Return and double-click (B5); context menus targeting the clicked row (B6); New Window, Open in New Window, full screen and restoration (B7); rich drag and drop with ⌥-copy (B8); App Intents and Share, but no Spotlight and no URL scheme (B9); labelled multi-step Undo and a real Help window (B10). **Formula:** (8.0 + 2 × 8.5) ÷ 3 = 8.3, capped at 6.9. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **8.4** (partial: no timed runs) | **Strengths:** a keyboard path for every Episode, Playlist and transport command. Space and Return are contextual and documented. Undo is named, multi-step and reveals restored rows. Drag and drop has menu equivalents. Destructive actions are recoverable through Trash or Undo, with two-click Unsubscribe instead of an alert. Validation is inline. Drafts survive. VoiceOver labels are thorough in code. **Holding it below 9:** the Rewind confirmation sheet asks before an action it also says is undoable (L34). No responsiveness evidence exists. There's no Things-grade capture-from-anywhere (for example a Quick Add). | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **7.5** | It serves the primary task well and is at home on the Mac in almost every behaviour. Four majors cap two categories at 6.9; three of them are owner decisions. Cap = lowest (6.9) + 2.0 = 8.9, which isn't binding. The weakness holding Overall down most is WIN-03's nested-scroll clip on the podcast page, the one major that isn't an owner decision. After it come the owner-fixed bottom player and Spotlight. | — |

## What stands between this build and 9.0

1. **The caps.**
   - Platform fit and Color & contrast both sit at 6.9.
   - Overall can't credibly reach 9 while two categories are capped, even though the arithmetic cap is 8.9.
   - Clearing the caps needs:
     - WIN-03 fixed (the next step below);
     - SYS-05 (Spotlight) delivered;
     - WIN-05 reconsidered (transport in the toolbar);
     - the Dark AccentColor or the Settings-tab contrast resolved.
   - Three of these are owner decisions. As long as they stand, Overall tops out in the low 8s.
2. **Sheet craft.**
   - Use Mac form layout (`Form` with `.columns` style, trailing-aligned labels) for Edit View, New View and Subscription Settings, instead of stacked labels.
   - Trim the empty bands above sheet footers.
   - Make the footer glass panel's corner concentric with the sheet, or drop the inner box.
3. **One voice per message kind.** Use one style for explanatory notes in Settings. Use bold section headings in every sheet. Give both player surfaces the same title/podcast hierarchy and slider tint.
4. **Menu verbs and links.** Use "Show Trash", "Show Subscriptions" and "Show All Views". Add a `podlist://` scheme for Episodes, Playlists and Views.
5. **Evidence the app can't yet supply.** A real flow run with a measurements file, at the minimum and half-display sizes plus timed passes. Until then, the stability sub-score and RESP checks stay N/O, and Consistency and Interaction stay partial.

## Next step

- **Target:** [WIN-03], major, in Platform fit. Platform fit is tied lowest with Color & contrast. APPEAR-04, WIN-05 and SYS-05 are owner decisions, so they're skipped as targets.
- **Anti-pattern:** a scroll-in-scroll cousin of *Box-and-border hierarchy*: a bounded scroll box used to contain variable content.
- **Root cause:** `PodcastPageLayout` caps the *entire* header, not just the variable-length description, so controls that belong to the page fall inside the description's scroll budget.
- **Change:** in `PodcastScreens.swift`:
  - wrap only `PodcastDescription` in a height-capped `ScrollView` (for example `maxHeight: 0.35 × viewport`);
  - lay out the action row, `DownloadRuleEditor` and the Episode count as fixed siblings beneath it;
  - drop the outer header `ScrollView`.
- **Principle:** `stability`, plus `content-first`: page controls stay where people learned them, whatever the description length.
- **Expected effect:**
  - WIN-03 passes.
  - Consistency & polish gains about 0.2.
  - Platform fit stays capped at 6.9 by the owner-decided WIN-05 and SYS-05.
  - The signature elements (monogram artwork, glossary copy, glass player) are untouched.
  - Re-capture L19 and D19, and a minimum-height window, to confirm.
