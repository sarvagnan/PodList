# PodList Mac UI grade — round 8 (Codex)

Build: `9b842c7e6a75884b0ee695d49f111e5fea0df020`. Independent audit of the supplied round-8 captures and this build’s source. No earlier grading reports were opened. No app was launched, no computer-use/screen-control tool was used, and no code was changed.

Evidence root **E**: `/Users/sarvagnan/Documents/podlist-grading/mac-round-8/`. **L/D NN** means both `E/light/NN-name.png` and `E/dark/NN-name.png`, with their matching `.txt` snapshots; exact stems follow E/README.md. Source paths below are relative to `apps/apple/Sources/PodListUI/` unless another path is stated; `PodListMac.swift`, `AppIntents.swift`, `IntentDonations.swift` and `NowPlayingSnippet.swift` are in `apps/apple/Sources/PodListMac/`. `Scripts/` and `Resources/` are relative to `apps/apple/`. **S** = supplied screenshot/AX snapshot, **C** = source; no new runtime evidence. Standard: `/Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md`, core/Mac checklists, rubric, principles and Mac platform signals.

## Frame

Task · Find an Episode through Subscriptions or a saved View, put it into an ordered Playlist, listen, and manage its progress safely.

Target · Native **Mac app**, macOS 26+, captured on macOS 27.2 in a Retina VM.

Posture · **Sovereign personal library tool**, with background playback and transient editing tasks.

Audience · **Perpetual intermediate**, with newcomers served by contextual help and experts by selection, menus and automation.

Nearest exemplar · **Things**, for calm personal-library work and reversible edits; BBEdit supplies the command-index and preservation standard. Opened the supplied guideline gallery’s `examples/screenshots/things/02-project-headings.png` for the craft comparison. No current Apple comparison screenshot was supplied; the Apple side-by-side portion cannot be reproduced without prohibited app launch/capture. Mac signals below use the supplied standard instead of claiming a fresh Apple comparison.

Character · Shallow **Views / Playlists / Library** source list; dense Episode/Entry tables with a contextual Inspector; blue initials artwork when feed art is missing; explicit **Active Playlist / Current Entry / Position** vocabulary; persistent bottom glass transport (**owner-fixed**). Baseline: L/D 01–03,06,18,26.

Owner decisions · Brand blue is the Multicolor AccentColor, and ordinary controls follow a chosen system accent; Light/Dark/System setting stays; no customizable toolbar; two-click timed unsubscribe with Undo; regular Liquid Glass on the named control surfaces; Spotlight deliberately last; MCP off and App Intents on. These choices are graded. F2/F3 remain scored but are excluded as next-step targets. SET-02 explicitly allows the appearance choice in the current standard; no invented failure is assigned for it.

## Flows

Tasks inspected (supplied tour, **not newly run**):

| Task | Evidence sequence | Stable handles / what is shown |
|---|---|---|
| Find and inspect | 01 → 02 → 03 → 04 → 05; 15 | `sidebar.Subscriptions`, `sidebar.New this week`, native Episodes table, Episode Inspector, toolbar search; rows and multiple selection in 33 |
| Queue and manage | 06 → 07 → 08 → 09 → 34a → 34; 10 → 11 → 12 → 13 → 14; 23 | `playlist.section`, Current Entry, named sheet actions, Trash, Rewind summary |
| Edit saved filter | 16 → 17 | Name, Published, Last Days, Mentions, matching count, pinned Save/Create View |
| Manage podcast | 18 → 19 → 20 → 21 → 22; 24 → 25 | Subscribed/Unsubscribe, description, subscription settings, `addPodcasts.query`, bulk download rules |
| Playback and preferences | 26 → 27 → 28 → 29 → 30 → 31 → 32 | Player Position/Play, Now Playing, General/Automation, text size, onboarding and listening empty state |

Widths · Supplied Library images are **2360×1520 px = 1180×760 pt at 2×**; auxiliary windows use their captured sizes. Desktop is 1920×1200 pt. No minimum-size (source minimum 760×500 pt), half-display or 200%-text tour is provided.

Appearances · All **35 states × Light and Dark = 70 images**, plus matching public XCUITest snapshots and menus, inspected. Tour script: `apps/apple/UITour/PodListUITour.swift`; export wrapper: `apps/apple/Scripts/ui-tour.sh`. Timing · No five-pass timings, refresh-rate trace or audience-hardware comparison. Measurements file · **none** with timestamped core-element deltas, focus, scroll and in-progress input. Screenshot strips · state captures in E, not a measured delayed-completion strip.

Failures: **No scored transition failure demonstrated.** FLOW-01/02/04 are N/O; so are response/hitch checks. Source can settle the late-query guard (FLOW-03); static captures and shared layout settle FLOW-06/07. A UI tour completing is not proof that transitions meet the 2 pt or 200 ms limits. Stability sub-score: **N/O in both appearances**.

## Cross-screen inventory

“None captured” means absent from the shown state; code-backed states are identified explicitly. Neutral = primary/readable-secondary foreground; error = adaptive error red, except primary foreground on glass.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library / Views / Episodes (01–05,15,33) | Top inline edit-status row, verb/result, neutral (C); sync “Up to date” above content (S) | Same top row + Retry, error red (C) | None | Named Undo/Redo in top row and Edit menu (C) | Centered symbol + title + next-step description (S/C) | None captured | Toolbar trailing actions; row Play/Add | Filter summary above table; Inspector empty-state guidance |
| Playlist Entries / History / Timeline (06–10,34a) | Same top edit row (C); Current Entry is inline state (S) | Same top edit row (C) | Rewind opens preview sheet | Same named Edit/top-row commands (C) | Centered No History + explanation (08); timeline/Entries help (C) | None captured | Leading section switcher/Play; row Rewind/Play | History explains how entries are recorded |
| Create / settings sheets (11–13,16–17,22–23,25) | Successful submit closes sheet; changed object remains in Library (C) | Inline field validation, or status immediately above pinned footer + Retry; error red (C) | Object, selected Playlist or settings visible in sheet | Edit/menu and status component where relevant (C) | No unnecessary placeholder shell | Parent dimmed, one task sheet | Trailing footer Save/Create/Apply/Play Next, Cancel before it; secondary action leading | Consequence/default/optional-field text in reading area |
| Podcast page (18–21) | Subscribed checkmark label, neutral (S); edits use Library status (C) | Library top edit status or local field state (C) | Red minus + Unsubscribe on same armed control (20); disarms to Subscribed (21) | Named Edit command (C) | No matches / no Episodes variant (C) | None | Subscribe control near podcast metadata; row Play/Add | Show Description/Show Less; device Download Rule |
| Add Podcasts window (24) | Below scroller LibraryFeedback; row “Subscribed” checkmark (C) | Search error near query + Retry; library-edit error below scroller (C) | None captured | Named Edit / lower LibraryFeedback (C) | Centered Find Your Next Podcast with feed-address example | None | Search beside query; Close bottom trailing | Persistent import explanation and example RSS address |
| Now Playing / bottom player (26 and all Library captures) | Current episode/play state replaces need for confirmation | Player-local persistent Retry, primary on glass (C) | None | Library edits through Edit (C) | No Current Entry next-step description (C) | None | Transport by artwork / position; Done footer in window | Speed and sleep current values, Episode Details |
| General / Automation (27–30) | Setting value changes live (C) | By affected setting with Retry (C) | Explicit MCP checkbox; opt-in consequences underneath | Edit for Library changes (C) | No empty settings sections | None captured | Native pane controls; no global Save | Import lifetime, text size and MCP scope/access explained |
| Listening Stats / Getting Started (31–32) | None | None captured | None | None | Centered No Listening Yet + play next step (31) | Getting Started sheet dims parent in 32 | Dismiss bottom trailing (32) | Three numbered steps, command reference |
| Rewind summary (34) | Closes to Entries on success (C) | Footer-adjacent error + Retry (C) | Explicit before/after lists and retained-data explanation (S) | Named Undo after commit (C) | “None” under empty result categories, not blank headings | Parent dimmed | Cancel then Rewind, trailing footer | Positions reset; permanent log and manual edits retained |

Mismatch **I1** · The same `LibraryFeedback` edit/undo component is above Library content but below the scroller in Add Podcasts; related sheet edit feedback is footer-adjacent. Local query/field errors correctly stay near their cause, but library-wide confirmations/recovery require relearning a location. Small consistency deduction; normalize the Library-status placement in discovery, keeping field validation local. This is not a FLOW-07 failure (different screen kinds), and no measured transition penalty is invented. No conflicting status colors/verbs were found in the common feedback components.

## Checklist

Coverage: **82.0%** (pass **116** · fail **7** · N/O **27** · N/A **18**; **168 total**, 150 applicable). Each ID below receives one verdict. A pass based on C confirms the implemented path, not an unperformed runtime certification.

### Failures by severity

**Blockers: none demonstrated.**

| Finding / ID | Severity | Evidence and principle | Concrete fix |
|---|---|---|---|
| F1 · APPEAR-04 | **major** | Recurring **Views / Playlists / Library** headings are too faint. In `E/light/01-subscriptions.png`, the Views heading crop `(20,105,90,35)` in source pixels has dominant solid text **#A1A09F** on **#EEEDEC**, **2.23:1**. Dark equivalent: **#5E5959** on **#2B2626**, **2.17:1**. Both fail 4.5:1 for small text and even the HIG’s permissive 3:1 bold allowance. These enabled navigation-group labels recur across Library captures; they are not disabled controls or decoration. `MacWindow.swift:65–110` leaves the section headers on the faint native header foreground while content secondary text uses the app’s readable style. `accessibility`, `hierarchy`. | Keep the native sidebar/metrics; explicitly resolve section-heading foreground to a readable semantic/custom secondary style, including inactive and high-contrast variants. Require ≥4.5:1 on actual composited sidebar backgrounds in both appearances. Preserve the accent asset. |
| F2 · WIN-05 | **major — owner decision** | L/D 01–23,25,33–34a put Play/Pause, seek, current title and active Playlist in the bottom bar. `MacWindow.swift:201–210`, `PlayerViews.swift:13–32`. These are critical controls/information, not limited window status. This conflicts with the supplied rule even though the placement is deliberate and visually coherent. `content-first`. | Conventional compliance would place essential transport/current information above the bottom edge. Record that remedy for completeness; **do not target or move the owner-fixed player**. |
| F3 · SYS-05 | **major — owner deferred** | Episode/Playlist/View search exists in the app, but `PodListMac.swift`, `AppIntents.swift` and `Scripts/build-mac-app.sh:20–40` contain no Spotlight index/metadata donation implementation. AppEntity queries and Shortcuts metadata do not constitute Spotlight indexing. OPML needs no proprietary Quick Look extension. `discoverable-commands`. | When the owner’s final integration stage arrives, index addressable library content with stable identifiers, titles, podcast metadata and deletion reconciliation, then test opening a result. **Keep this deferred until last.** |
| F4 · DATA-05 | minor | `PlaylistEditingModel.swift:107–145` reverses changes and posts “Undone…”; restored Playlists add a name in the notice. It emits no reveal target. `MacWindow.swift:617–646` reconciles the existing selection/context, and `MacRowScroll.swift:64–72` scrolls only to the existing anchor. An Entry restored beyond the viewport, or a restored Playlist while viewing Trash, is not brought into view. No captured undo state proves otherwise. `feedback`, `forgiveness`. | Return restored object IDs from Undo and reveal/select the relevant Playlist/Entry for the explicit Undo action; preserve unrelated window state and provide a named reveal command if navigation would disrupt another context. |
| F5 · SYS-02 | minor | Selected RSS feed addresses are useful outside the app, but the bundle builder’s complete plist (`Scripts/build-mac-app.sh:20–40`) declares no `NSServices`, and no Service provider is registered by `PodListMac.swift`. Drag/paste supports receiving URLs manually but does not vend a contextual Service. `conventions`. | Add a “Find Podcast in PodList” Service accepting selected URL/text, validating it and opening a podcast preview before subscription. |
| F6 · SYS-03 | minor | `ShareLinks.swift` exposes publisher web/feed URLs; `LibraryWindowTarget.swift` addresses in-process windows only. `PodListMac.swift:29–61` has no URL-open handler, and the bundle plist has no URL scheme/universal-link registration. A local View/Playlist/Entry cannot be bookmarked and reopened from another app. `user-control`. | Add stable, validated app links for View, Playlist and Episode destinations; handle missing/deleted targets with useful recovery. Keep publisher Share distinct from “Copy PodList Link”. |
| F7 · APP-01 | minor | `menus.txt` shows the standard `orderFrontStandardAboutPanel:` action. `Scripts/build-mac-app.sh:20–40` supplies version fields but no `NSHumanReadableCopyright`, and `PodListMac.swift` supplies no custom About options. The panel therefore lacks the required copyright information. `conventions`. | Add the appropriate copyright string to bundle metadata and verify About still shows the version and copyright in its own standard group. |

Contrast method · Sampled **original PNGs**, not resized contact sheets, using ImageMagick to enumerate 8-bit sRGB crop pixels. Dominant fully covered glyph and adjacent opaque background colors; WCAG sRGB relative luminance `(Lmax+0.05)/(Lmin+0.05)`. Antialiased edge pixels were excluded. Source origin is top-left; measurements are in source pixels, geometry converts by ÷2. Control secondary metadata in the same capture is readable: Light **#606060 on #FFFFFF = 6.29:1**, Dark **#A0A0A0 on #242222 = 6.05:1**. The defect is the sidebar header treatment, not the whole secondary-text system. Dynamic glass backdrops and unprovided high-contrast captures cannot be exhaustively pixel-certified.

### N/O

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, KEY-06, KEY-07, DRAG-05, DRAG-06, PTR-03, APPEAR-11, AX-04, WIN-03, RESP-01, RESP-02, FOOT-02, APP-03, WMENU-03, TEXT-02, WIN-10, SET-04, SET-06, DRAG-07, PTR-05, SYS-01, SYS-07, FOOT-01.

Limit of evidence · The captures omit live Full Keyboard Access, VoiceOver/assistive input, international layouts, text-assistance preferences, pointer/context-outline behavior, drag sessions, resizing, multiwindow sorting, Settings reopen/relaunch and system Shortcuts discovery. Source supports substantial portions of these checks; it cannot settle their remaining runtime clauses. For SYS-01, semantic entities, undoable intents, donations, snippets and metadata extraction are present; **actual usable action listing in Shortcuts remains unobserved**, so the whole check is N/O rather than a claimed integration failure. No app was run to fill these gaps.

### N/A

- **FLOW-05** — No peer comparison/form-preview panels; navigation, list and inspector have deliberately different roles.
- **DLG-09** — No app-owned editing popover; system menus and Share UI keep their own lifecycle.
- **CTRL-02** — No parent/child checkbox hierarchy.
- **LIST-05** — No app-owned expandable outline descendants.
- **START-05** — No protected-device permission prompt in the implemented feature set; MCP is an explicit local setting.
- **START-07** — No account-creation service.
- **FILE-01** — OPML is an import/export interchange, not an editable document model; New View/Playlist and Import/Export exist.
- **FILE-02** — No recent-document model.
- **FILE-05** — No printing feature.
- **FMT-02** — No formatted-text editor (FMT-01 permits omitting Format).
- **DATA-02** — No unsaved file/document model.
- **DATA-03** — No autosaved file/document model.
- **DATA-08** — No proprietary editable document model.
- **SYS-06** — No credential workflow, custom Finder document workflow, or declared extension workflow; feed input already supports paste/drop. This check does not demand every extension technology.
- **EXTRA-01** — No menu bar extra.
- **EXTRA-02** — No menu bar extra.
- **EXTRA-03** — No menu bar extra.
- **EXTRA-04** — Sovereign library app; no dual-mode quick-access utility.

### Passes

Every ID in this table is **pass**. Grouped evidence is scoped to the IDs in its row; failures and unverified checks above are excluded. Standard framework ownership is credited where source settles the convention, while timing/assistive and other unresolved runtime clauses remain N/O.

| IDs | Evidence |
|---|---|
| FLOW-03, FLOW-06, FLOW-07 | FLOW-03: `AddPodcastsWindow.swift:123–138` guards the submitted query/cancellation; `ViewEditorScreen.swift:145–175,248–302` serializes updates and disables submission fields during saves. FLOW-06/07: L/D 11–17,22–25,34; shared `PodListSheet.swift` pins a consistent trailing action and supplies content/empty states. No transition stability inferred. |
| KEY-08, KEY-02, KEY-03, KEY-05 | `LibraryCommands.swift`, `PlaybackCommands.swift`, `KeyboardShortcuts.swift`, `EpisodeEditingViews.swift:243–361`, `ConnectionViews.swift:82–114`: menu shortcuts and in-app reference; Space/Return/Command-arrows are routed back to text editors. Primary repeated playback/queue/mark/navigation actions have shortcuts; Download is explicitly unassigned and documented. |
| DLG-01, DLG-02, DLG-03, DLG-04, DLG-05, DLG-07, DLG-06, DLG-08 | L/D 11–13,16–17,22–25,34; `PodListSheet.swift`, `ContentSizedPanel.swift`, `PlaylistSettingsViews.swift:251–285`, `PlaybackCommands.swift:70–114`. Native sheets are window scoped, pinned Cancel/action controls, safe Escape/Command-period handling; purge confirms irreversible loss. Discovery and Now Playing have independent modeless windows. |
| CTRL-03, CTRL-04, CTRL-05, CTRL-06, CTRL-07, CTRL-08, CTRL-01 | L/D 11–13,16–17,22–25,27–30; `ViewEditorScreen.swift`, `FormNumbers.swift`, `FormValidationVisibility.swift`, `DownloadViews.swift`, `OPMLImportContent.swift`. Native controls, persistent stacked labels, optional Mentions, field-local validation, current search scope, measurable download/import progress and cancellation. |
| LIST-01, LIST-02, LIST-03, LIST-04, LIST-06, LIST-07 | L/D 02–10,15,18,33; `MacWindow.swift:287–317,478–547`, `PlaylistContentView.swift:54–153`, `PodcastScreens.swift:123–240`. Native selectable/sortable/resizable tables and Lists, title-case headings, persistent selections, row primary actions. All Views supplies explicit type selection; ordinary Table/List navigation is framework-owned. |
| DATA-01, DATA-04, DATA-06, DATA-07 | `PlaylistEditingModel.swift:75–166,280–301`, `SheetSettingsDrafts.swift`, `LibraryEditingModel.swift:130–247`, `WindowRestoration.swift:48–213`, `MacWindow.swift:625–646`, `MacRowScroll.swift`. Durable scoped drafts, database-backed inverse edits and named multi-step history; SceneStorage restores browsing context, pane widths, selection and row anchor; native WindowGroup owns window restoration. Source-supported, not a relaunch certification. |
| DRAG-01, DRAG-03, DRAG-02, DRAG-04 | `EpisodeTransfer.swift:29–169`, `PlaylistContentView.swift:65–112,157–178`, `LibraryDrops.swift`. Rich Episode payload then URL/text fallback, ordered multi-selection, same-playlist move/Option-copy (unique Episode membership makes a duplicate a safe no-op), cross-playlist copy, grouped reversible edits; OPML drops stage a preview before import. |
| PTR-04, PTR-01, PTR-02 | `MacWindow.swift:389–475`, `EpisodeEditingViews.swift:20–114`, `PlaylistContentView.swift:109–155`, `EpisodeInspector.swift:164–197`. Context commands use the supplied target/selection, share the menu actions and omit shortcut display; action-specific help on icon controls. Native pointer tracking retained. |
| APPEAR-03, APPEAR-05, APPEAR-09, APPEAR-10, APPEAR-01, APPEAR-02, APPEAR-06, APPEAR-07, APPEAR-08 | L/D 01–34a; `MacAppearance.swift`, `MacGlass.swift`, `EpisodeInspector.swift`, `PlayerViews.swift`; `Resources/MacAssets.xcassets/AccentColor.colorset/Contents.json` and `Scripts/build-mac-app.sh:33–67`. Match System default, four accent variants, semantic selected foregrounds, regular glass only on controls, opaque/bordered fallback under Reduce Transparency or Increase Contrast. No custom positional/depth animations found; native motion is system-owned. F1 is the measured exception. |
| TYPE-02, TYPE-03, TYPE-05, TYPE-06, TYPE-07, TYPE-08, TYPE-01, TYPE-04 | L/D 02–03,11–13,17,22,27–30; `MacTextSize.swift`, `MacIconLabel.swift`, `EpisodeInspector.swift:190–195`, `PlayerViews.swift:63–107`. SF semantic body 13 pt/captions 10–11 pt, deliberate title/metadata roles, tabular time, multiline wrapping, standard native controls; explicit 28×28 pt icon-label frames. AX glyph-only bounds in inspector snapshots are not treated as pointer hit regions. Reading layout reflows above 100%; resize/text-growth visual proof remains limited. |
| COPY-01, COPY-02, COPY-03, COPY-04 | L/D 08,11–14,17,22–25,30–34; `FailureMessages.swift`, `FailureFeedback.swift`, `LibraryEditingModel.swift:13–40`, `ConnectionViews.swift:76–114`. Specific task verbs, consequences, recovery, empty-state next steps, typographic punctuation and consistent domain terminology. Error visuals are code-evidenced rather than present in these happy-path captures. |
| AX-01, AX-02, AX-05, AX-03 | L/D .txt trees, especially 03,07,20,23,26,30,33,34; `MacIconLabel.swift`, `EpisodeInspector.swift:160–197`, `DownloadViews.swift:86–109`, `PlayerViews.swift:83–107`, `FeedbackAnnouncements.swift`, `MacTextSize.swift`. Names, roles, values and states are present in public AX snapshots/code; played/starred/current/armed state has text or symbols; playback has visible start/stop/position. This is not a live VoiceOver or podcast-transcript certification. |
| START-01, START-02, START-03, START-04, START-06 | `MacWindow.swift:33–45`, `ConnectionViews.swift:5–51,76–114`, `LibrarySettingsScreens.swift:260–305`, `AutomationSettings.swift`. Usable loading state, dismissible/reopenable onboarding, local standalone route without account, no launch permission wall; MCP opt-in explains access. Actual launch latency remains unmeasured. |
| EDIT-02, EDIT-05 | `PodListMac.swift:34–39`, `EpisodeEditingViews.swift:258–278`, `SelectionCommands.swift:143–173`, `MacWindow.swift:539–542`, `PlaylistContentView.swift:115–122`; `menus.txt` Edit. Native text edit selectors/shortcuts, app row Copy providers with title+URL, native text editing menus and app undo dispatch. |
| TOOL-06, TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-05 | L/D 02–03,06–07,18; `MacWindow.swift:152–191`, `EpisodeEditingViews.swift:128–150`, `PlaylistContentView.swift:265–286`. Native toolbar items/overflow, standard symbols, grouped navigation and trailing actions; native SidebarCommands plus explicit Inspector shortcut give recovery routes. No toolbar customization is an owner decision; no checklist here mandates offering customization for every toolbar. |
| SIDE-03, SIDE-04, SIDE-01, SIDE-02, SIDE-05, SIDE-06 | L/D 01–10,18,33; `MacWindow.swift:58–120,179–198`, `MacSidebarWidth.swift`, `PodListMac.swift:35`. Leading native sidebar, shallow hierarchy, native sidebar preference metrics, 1 pt pane division, persistent context selection; SidebarCommands and inspector menu/button/shortcut restore hidden panes. |
| SET-01, SET-02, SET-03, SET-05 | L/D 27–30; `ConnectionViews.swift:54–73`, `LibrarySettingsScreens.swift:46–130,165–211`, `ContentSizedPanel.swift`, `GeneralSettingsEdits.swift`. Native Settings scene, General/Automation pane toolbar, dim minimize/zoom, measured pane heights, live preferences and local failure recovery; task-specific subscription/playlist settings stay with their objects. |
| MENU-01, MENU-02, MENU-03, MENU-04, MENU-05, MENU-06, APP-02, APP-04, FILE-03, FILE-04, EDIT-01, EDIT-03, EDIT-04, FMT-01, VIEW-01, VIEW-02, WMENU-01, WMENU-02, HELP-01, HELP-02 | `menus.txt`; `PodListMac.swift:29–61`, `LibraryCommands.swift`, `MenuCommandActions.swift`, `EpisodeEditingViews.swift:243–361`, `PlaybackCommands.swift`, `Scripts/build-mac-app.sh:24–30`. Standard menu order, real Settings/App commands and native Window menu; object/task/recovery commands are indexed, with disabled commands retained. Local dialog submit/cancel buttons are treated as dialog controls, not missing app commands. No custom modifier alternates. |
| TEXT-01 | `PodListMac.swift:37`, `PlaybackCommands.swift:70–114`, `ViewEditorScreen.swift`, `AddPodcastsWindow.swift`: native TextField/TextEditor machinery and interpreted editing keys. Native edit menu presence alone does not certify user text-assistance settings. |
| WIN-01, WIN-02, WIN-04, WIN-06, WIN-07, WIN-08, WIN-09 | L/D 01–03,11,24,26–32; `PodListMac.swift:29–61`, `MacWindow.swift:33–45,150–212`, `LibraryCommands.swift:31–36`. Native frame/traffic lights, titled views, native full screen, separate Library windows and Open in New Window; native chrome retains drag/double-click semantics. Bottom transport F2. |
| SYS-04 | `AppIntents.swift`, `IntentDonations.swift`, `NowPlayingSnippet.swift`, `ShareLinks.swift`, `EpisodeEditingViews.swift:90–94`, `Scripts/build-mac-app.sh:20–40,70–101`. Native Share and semantic intents/entities with metadata extraction; no registered app URL scheme, Service provider or Spotlight index. |

## Scores

Scores cover both appearances; the same caps apply. Strong means deliberate craft between the Competent and Exemplary anchors, not resemblance to Things. No timings or live assistive behavior are claimed.

| Category | Score | Evidence / anchor and limit | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong, close to Exemplary: semantic SF scale, title/metadata hierarchy, tabular duration/position and wrapping in 02–03,07,18,34. Native 13 pt body and 10–11 pt metadata; 100–200% content adaptation in `MacTextSize.swift`. Long show notes and enlarged/minimum-window layouts are not captured, preventing an exemplary whole-app claim. | `hierarchy`, `craft`, `accessibility` |
| Hierarchy | **8.5** | Strong: source → episode/entry → inspector is immediately legible in 03/07; content is the largest plane, with clear primary sheet actions. Inspector artwork consumes 180 pt and blank Inspector space remains prominent when no item is selected; accepted bottom player adds a second focal band. | `content-first`, `hierarchy` |
| Spacing & density | **8.6** | Strong: native table rhythm, aligned time/state columns, 20/24 pt detail/form insets and explicit 28 pt icon targets. Dense listening management and roomier form reading have different, useful densities. Default-width title wrapping in 18 and the wide empty detail region in 01/05 keep it below Exemplary; resize behavior unobserved. | `craft`, `conventions` |
| Color & contrast | **6.9** | **Major cap, F1.** Most content is near Exemplary restraint: neutral surfaces, readable metadata (6.29:1 Light / 6.05:1 Dark), selected-state foregrounds, current-system accent asset and opaque glass fallback. Recurrent section headings at **2.23:1 / 2.17:1** fail the text bar. Same score in Light and Dark. | `accessibility`, `color-restraint` |
| Iconography | **8.9** | High Strong: one SF family, standard Play/skip/share/trash/inspector meanings, text/state-aware names and tooltips; active speaker and Current Entry have explicit accessible descriptions. Clear-on-Played eraser markers and the repeated row/toolbar/Inspector action set still require some learning; not quite effortless Exemplary recognition. | `conventions`, `plain-language`, `craft` |
| Consistency & polish | **8.5 (stability N/O — Light and Dark)** | **Partial: no flow run.** Shared sheet reading/footer geometry, native inactive selections, coherent dark surfaces, finished empty/multi-selection/armed states across 70 captures. I1 moves library edit feedback between top and bottom regions; hover, minimum-width and transition finishing are not demonstrated. No stability band limit applies when the sub-score is N/O. | `craft`, `stability`, `conventions` |
| Clarity | **8.7** | Strong: filter descriptions, Active Playlist/Current Entry, named queue placement, scoped settings and explicit Rewind consequences. Empty states teach the next move. “Entries”, “History” and “Listening Timeline” preserve useful distinctions but still need onboarding; “No History” versus global listening is explained rather than immediately obvious. | `plain-language`, `feedback` |
| Platform fit | **6.9** | **Major cap, F2/F3.** Looks **8.8**, Behaves **8.5** on verified source/menu evidence → `(8.8 + 2×8.5)/3 = 8.6` uncapped. Complete native command/menu structure, Cocoa text fields, real windows/Settings, Share and reversible edits put observed implementation in Strong. Bottom-edge critical transport and missing Spotlight force 6.9; absent Services/app links add off-path gaps. Runtime-only signals remain unverified. | `conventions`, `discoverable-commands`, `stability` |
| Interaction & feedback | **8.6** | **Partial: runtime timing/FKA unverified.** Strong: persistent multi-selection, queue/mark shortcuts, named multi-step Undo, durable scoped drafts, reversible drag changes, recoverable failures and context-preserving panels. F4 leaves restored offscreen content unrevealed. No evidence supports “instant” or universal assistive operation. | `keyboard-efficiency`, `forgiveness`, `feedback`, `direct-manipulation` |
| **Overall** | **8.5 / 10** | Strong personal podcast workflow, coherent in both appearances, with useful depth rather than generic chrome. **Color legibility is the most actionable weakness**; accepted transport placement and deferred indexing also constrain platform compliance. Lowest category **6.9** → Overall ceiling **8.9**; 8.5 respects it. Holistic judgment, not an arithmetic average. | `content-first`, `accessibility`, `character` |

### Mac platform signals

Side-by-side limitation is recorded in Frame. Against the supplied Mac signals, no web form, iPhone picker, foreign shortcut notation, hamburger navigation or fake frame appears. The bottom transport is the placement deviation; it is an owner-fixed domain choice, not proof of a foreign toolkit.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Frame | Native | Real traffic lights/unified toolbar, WindowGroup; 01–03 |
| L2 Type | Native | Semantic SF and Mac metrics; `MacTextSize.swift` |
| L3 Controls | Native | Native popups, checkboxes, segmented toolbar switcher; 11–13,22,27–30 |
| L4 Menus/popovers | Native | Native menu snapshot and SwiftUI menus; no HTML surfaces |
| L5 Shortcut notation | Native | System menu equivalents and glyph order in Help/shortcuts source |
| L6 Sidebar/selection | Native | Leading native List, selected versus secondary selection; 02/03/33; F1 separately covers heading legibility |
| L7 Symbols | Native | SF Symbols throughout |
| L8 Settings | Native | Independent pane-toolbar window, live changes, dim zoom/minimize; 27–30 |
| L9 Density | Adapted | Dense native tables plus art/metadata Inspector and wider podcast rows |
| L10 Materials/era | Native | Regular glass on functional surfaces, plain reading content, opaque accessibility fallback |
| L11 Appearance | Native | App-wide System default/Light/Dark, four asset variants |
| B1 Menu index | Native | Standard order, app objects/actions/recovery, disabled items retained; menus and command source |
| B2 Settings entry | Native | Settings scene creates App menu / Command-comma route |
| B3 Shortcuts | Adapted | Source-defined primary commands; app-specific Return/Space documented and protected during typing; Download intentionally unassigned |
| B4 Text | Native, source-supported | Native text fields, TextEditingCommands, interpreted text navigation; Services/text-assistance runtime portions N/O |
| B5 Keyboard/lists | Adapted, partial | Selection-based List/Table, type-select in All Views; complete FKA traversal N/O |
| B6 Context menus | Native, partial | Target-based `contextMenu(forSelectionType:)` and shared command items; actual context outline N/O |
| B7 Windows/state | Native, source-supported | New Window/Open in New Window, SceneStorage, native full screen, independent tasks; live restoration untested |
| B8 Drag/drop | Adapted, partial | Rich Episode/URL/text, reversible reorder/copy, import preview; visual drag/autoscroll N/O |
| B9 System integration | Adapted with gaps | Share, semantic App Intents, donations/snippets; listing unverified; Services/app links/Spotlight missing |
| B10 Undo/help | Native | Operation-named Undo and substantive in-app Help/reference; reveal weakness F4 |
| B11 Footprint | N/O | No comparable workload measurements |

### What stands between this build and 9.0

1. Fix **F1**: the recurring navigation-group labels must remain readable in both appearances and accessibility modes.
2. Close the smaller **F4–F7** gaps: reveal Undo results, provide a feed-selection Service and stable app links, and complete About metadata; normalize shared library-feedback placement (I1).
3. Supply the missing evidence: minimum/half/typical windows in Light/Dark, delayed-completion measurements, five timed runs, enlarged text, live keyboard/assistive paths, drag sessions and Shortcuts listing. N/O is neither a defect nor proof of exemplary behavior.
4. **Under this exact standard, 9.0 is currently unreachable while WIN-05 remains an accepted major.** Its Platform-fit cap is 6.9 and therefore the Overall cap is 8.9. Spotlight is also major and deliberately last; finishing it alone cannot remove the WIN-05 cap. This is a scoring constraint, not a request to reverse the owner’s placement decision.

## Next step

Target · **APPEAR-04 / F1**, the non-owner major in the tied lowest category (Color & contrast). WIN-05/SYS-05 are owner-fixed/deferred and skipped for targeting.

Anti-pattern · **Ghost-text elegance**, narrowly in sidebar group headers. Root cause · Native Section header de-emphasis is accepted without the readable foreground treatment already used for ordinary secondary content.

Change · First candidate: apply an appearance-adaptive readable foreground to the **Views / Playlists / Library section header text**, retaining native Sidebar metrics. Target **≥4.5:1** on the composited sidebar, at the existing font size/weight. Second candidate only if material variation defeats that: use semantic primary foreground with the existing small heading weight and spacing to retain hierarchy. No new borders, branding or surface layers.

Principle · `accessibility` and `hierarchy`; resolve aesthetics versus legibility using principles tension 10. The nearest contrast pair is **COLOR-04 · Small text keeps reading contrast**. Things would distinguish navigation levels through type/spacing while keeping labels readable, rather than sacrificing navigation legibility to quietness.

Expected effect · Remove the Color & contrast major cap; improve scan hierarchy and finish in both appearances. Risk: making headings compete with selectable rows; limit the change to foreground contrast and preserve the smaller heading role. Sidebar taxonomy, accent convention, dense tables, initials artwork, domain vocabulary and owner-fixed glass player all survive.

Validation for implementation · Recapture 01/03/06 in both appearances, inactive states and Increase Contrast/Reduce Transparency separately and together; measure solid glyph/background pairs in original PNGs. Recheck APPEAR-04/03 and SIDE-06. Then add the missing measured flows in the disposable VM, without involving the owner’s foreground desktop.

No candidate was applied: this assignment authorizes an audit/report only. Character check: all five signature elements **kept**; baseline unchanged. No iterative acceptance/rejection log is applicable.
