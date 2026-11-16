# PodList Mac UI grade — round 11 (Codex)

## Frame

- **Task:** Find podcast Episodes through Subscriptions, Views or Search, place them in an ordered Playlist, listen, and recover earlier listening/edit decisions.
- **Target:** Native Mac app, macOS 26+; graded code **131bdf3**, with supplied captures from macOS 27.2.
- **Posture:** Sovereign personal collection/listening tool, with modeless playback and discovery windows.
- **Audience:** Perpetual intermediate, with newcomer guidance and keyboard/automation paths for frequent use.
- **Nearest exemplar:** Things for calm personal collection work and reversible actions; BBEdit for command coverage and durable work. The [Things project reference][r237] was inspected as a craft comparator, not a layout to copy. An Apple Mail/Finder side-by-side capture was not supplied and none was newly captured; the platform signal comparison below is against the written Mac standard, not a claimed live Apple-app comparison.
- **Character:** Shallow Views/Playlists/Library source list; Episode-versus-Entry/Position model; compact ruled tables with an adjacent Inspector; restrained blue under Multicolor; persistent glass bottom player **(owner-fixed)**.

**Owner decisions:** Keep bottom transport, System/Light/Dark preference, no customizable toolbar, timed two-click Unsubscribe with Undo, and functional-layer Liquid Glass. Accent follows the system except Multicolor; grade that normally. The deep Dark accent and resulting selected Settings-tab contrast are accepted and scored, not proposed as targets. Spotlight is approved but explicitly last. MCP is off by default; App Intents are on. These decisions are taken from the round-11 brief, not earlier grade reports.

**Evidence boundary:** Read [round-11 brief][r238], [CRITIQUE.md][r239], the core/Mac checklists, rubric, platform signals, principles, exemplars and relevant contrasts. Inspected all 35 Light and 35 Dark window captures, their pertinent XCUI trees, the menu export and current app code. No earlier PodList report was opened. No app launch, build, computer-use, screen-control or new UI test execution. This is a report-only full audit; CRITIQUE’s implementation/iteration steps are intentionally not performed under the instruction to change no code.

## Flows

The supplied [README][r240] describes 35 settled states per appearance, and [tour log][r241] records two passing tests, zero failures. This is an existing XCUITest state tour, not the full delayed/timed flow experiment required by the standard. The grading review did not execute it.

| Task inspected through evidence | Captured sequence / source | What it establishes |
|---|---|---|
| Find an Episode, inspect, multiselect | 01 → 02 → 03 → 04/05 → 15 → 33 | Typical-size navigation, selection, row/table/Inspector content; tour also asserts Episode type-select. |
| Organize and recover Playlist work | 06 → 07 → 08 → 09 → 34a → 34; 10 → 11 → 12 → 13 → 14 | Entries/History/Timeline states, fixed toolbar placement assertions, rename typing focus, cancellation and rewind preview. No actual rewind/undo flow is demonstrated. |
| Inspect/follow a Podcast and set rules | 18 → 19 → 20 → 21 → 22; 25 | Description and Unsubscribe arm/disarm states, task sheets, bulk-rule editor. No actual unsubscribe/recovery claim. |
| Add/listen/configure | 23 → 24 → 26 → 27 → 28 → 29 → 30 → 31 → 32 | Playlist chooser, independent discovery/playback windows, Settings panes and empty stats/tutorial. |
| Slow Episode drop / import / failed save | Source inspection only | Static implementation and missing drop placeholders; no live drag or induced failure measurements. |

**Widths:** Library 1180×760 pt, e.g. [light/03-episode-inspector.txt][r242]; 2× PNGs are 2360×1520 px. Settings is 640 pt wide and changes height by pane; Add Podcasts 650×600 pt. Desktop is 1920×1200 pt Retina. Minimum Library 760×500 pt and half-display tiling were **not captured**. **Appearances:** app-forced Light/Dark, not a live automatic-appearance/accent/accessibility-mode matrix. **Timed runs/device:** no five-run input-to-first-frame, keystroke, hitch, CPU or idle-memory measurements; macOS 27.2 VM host hardware/refresh is unspecified. **Script:** [PodListUITour.swift][r243]. **Measurements file:** none meeting CRITIQUE’s flow schema. **Screenshot strips:** ordered state PNGs in the supplied Light/Dark folders, not delayed-completion strips.

**FLOW failures:** None demonstrated by a measured transition. FLOW-01/02/04 remain N/O; no stability score is inferred from the tour’s passing tests. FLOW-03 has a limited code-backed pass because search/import version guards and protected save drafts are inspectable. The source-only DRAG-06 finding is an interaction finding, not an invented FLOW-01 layout-shift failure.

## Cross-screen inventory

The region, form, wording and status color are recorded below. “Code” means implementation was inspected but that state is not pictured. Different local errors belong beside different causes; they are not automatically consistency defects.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library tables / Subscriptions (01–07, 10, 14–15, 33) | Top detail status, neutral “Up to date”; new edit notice in same top feedback region, neutral operation name (code) | Same top feedback row, readable red message + Retry (code) | none | Top feedback row + named Edit menu Undo/Redo (code), persistent history | Centered symbol/title/body; Trash, no matches or no subscriptions; neutral | none | Title-bar Play/Add/Edit symbols, trailing; row Play/Add repeats selection actions | Filter summary above table; empty-state next action; Help menu |
| Episode/Entry Inspector (03, 07, 33) | Row state/membership updates; no separate success banner | Download failure beside download state + Retry (code), red | none | App Edit menu/top library feedback (code) | Center “Select an Episode”; local “No Playlists”/“No show notes” (code), neutral | none | Central Play; secondary actions grouped below; multiselect uses labeled Add/Star/Played | Metadata labels; Playlist names/positions |
| Playlist History/Timeline (08–09, 34a) | History/Timeline rows, no extra banner | Library feedback (code), red + Retry | Rewind preview sheet when explicitly opened | Named Edit menu/feedback (code) | Center “No History” with explanation of playback versus manual Played, neutral | none | Rewind to Here aligned trailing in each Timeline row | Explicit event descriptions and time stamps |
| New/Settings Playlist, add-to-Playlist (11–13, 23) | Save/Create closes sheet; Library notice (code), neutral | Field validation near Name; edit failure above footer, red + Retry (code) | Destination Picker; consequence prose; Cancel available | Edit status above footer / Edit menu (code) | Empty Name keeps Create disabled without premature error | Parent-window sheet only | Trailing Save/Create/Play Next in shared footer; Play Now/Last secondary leading | Clear on Played and retention consequences |
| New/Edit View (16–17) | Matching-Episode count near top; Save closes (code) | Field-specific red validation; status above pinned footer (code) | Name/conditions; Cancel | Status above footer and Edit menu (code) | New form defaults; optional fields labeled | Parent-window sheet only | Shared trailing Save/Create View; Delete leading | “All Conditions Must Match”; optional labels |
| Podcast page/settings/rules (18–22, 25) | Subscribed text/checkmark; neutral Library feedback (code) | Fetch error near Podcast header, rule error near settings/footer + Retry (code), red | Armed red Unsubscribe on same button; setting fields in sheet | App Edit menu/feedback; Unsubscribe reversible (code) | “No Episodes Yet/No Matching Episodes” + recovery (code) | Settings/rules block parent only | Subscribe adjacent to title; settings/rules trailing Save/Apply footer | Description disclosure, download-rule labels and action consequences |
| Add Podcasts (24) | Subscribed label on result; edit feedback below result region (code), neutral | Beside query/results + Retry, red (code) | none | App Edit menu and feedback above Close footer (code) | “Find Your Next Podcast,” RSS example, neutral | none; independent window | Search beside input; result Subscribe; Close footer | RSS example and OPML entry-point prose |
| Player/Now Playing (26; bottom in Library) | Current Episode/Playlist/Position and action state, neutral | Inside relevant player surface + Retry (code); primary ink on glass, red on reading surface | Go to Time sheet (code) | Queue edits in app Edit menu (code); seek is transport state | “No Current Entry” + Library next step (code) | none | Consistent Back/Play/Forward grouping; extras adjacent; Done closes separate window | Named tooltips, chapter list and keyboard Help |
| General/Automation Settings (27–30) | Applied control value, no redundant success banner (code) | Near failed setting, red + Retry (code) | none | App Edit menu for Library setting edits (code) | none | none | Native pane toolbar; ordinary settings live; no Save | Local text sizing, import-resume and MCP access explanation |
| Stats/Getting Started (31–32) | none | none captured | none | none | “No Listening Time Yet,” neutral explanatory body | Tutorial sheet only when explicitly opened from Settings | Dismiss trailing in tutorial footer | Three concrete starter steps and shortcut/menu route |

**Inventory findings:** No demonstrated same-kind main-action placement mismatch. Success/error text has consistent meaning and the shared Retry verb; player-on-glass primary ink is an intentional legibility adaptation. Sheet errors live above pinned actions; fetch errors live beside the initiating query/header. One incomplete state exists in the transfer flow: global preparation progress has no pending destination rows (DRAG-06). The top Library feedback row uses conditional space (`reservesSpace: false`); that is a reason to measure late-result geometry, **not evidence of a scored FLOW-01 shift**. Likewise, transient neutral success messages do not constitute toast-and-vanish recovery: errors and named Undo remain available.

## Checklist

**Coverage: 84.5%** (pass 113 · fail 12 · N/O 23 · N/A 20); (113 + 12) ÷ (168 − 20). Every current ID from the 80-item core and 88-item Mac checklists appears exactly once in the verdict tables below. N/O is not a pass, failure or cap.

### Failures by severity

**Blockers:** None demonstrated. AX-01 remains N/O; blank XCUI labels are not enough to declare a VoiceOver blocker without the missing native label relationships.

**Majors**

- **[DRAG-06] Slow Episode drops lack destination placeholders.** [EpisodeTransfer.swift:87][r244] resolves all publisher references into local IDs before calling `editor.edits.add`; [PodcastScreens.swift:6][r245] renders a global “Adding Episodes…” progress bar, while [PlaylistContentView.swift:46][r246] renders only committed `rows`. A slow drop therefore has progress but no pending row showing its intended destination/slot. Destination baseline: [light/06-default-playlist][r247] / [dark/06-default-playlist][r248]; no drag-in-progress capture exists, so native autoscroll is not judged. **Fix:** keep a presentation-only pending batch keyed by drag transaction and insertion anchor, show a title-bearing placeholder immediately in the destination, then replace/remove it on commit/failure and reveal/select committed rows. Preserve named Undo and copy/move semantics. **Principle:** `direct-manipulation`, `feedback`. **Cap:** Interaction & feedback ≤6.9.
- **[WIN-05] Core transport remains at the bottom edge.** [light/06-default-playlist][r249] / [dark/06-default-playlist][r250] and [light/26-now-playing][r251] / [dark/26-now-playing][r252] show task-essential transport/Position in the bottom bar; [MacWindow.swift:204][r253] uses a bottom safe-area inset for PlayerBar. The checklist permits limited status there, not task-critical controls. **Concrete compliance fix:** provide a persistent above-bottom transport placement. **Owner decision:** bottom player is fixed; record the deviation and cap, but do not propose relocation as this round’s target. **Principle:** `content-first`. **Cap:** Platform fit ≤6.9.
- **[APPEAR-04] Selected Settings-tab label fails Dark contrast.** In [dark/30-settings-automation][r254], fully rendered Automation text pixels are approximately **#435FDD** on **#4B4846**, **1.69:1** (sampled from the original PNG, not the scaled contact sheet). This is an enabled navigation control label; use the standard’s **4.5:1 minimum** for custom Dark text. Native rendering differs from the asset’s source value. White selected-row text on source accent #3652D0 is **6.41:1**, so this is not a table-selection contrast failure. [ConnectionViews.swift:61][r255] uses the native Settings TabView; [AccentColor asset][r256] supplies the deep Dark accent. **Concrete compliance fix:** a contrast-safe selected-pane label/selection rendering at ≥4.5:1 while retaining the system accent contract. **Owner decision:** this native label result is accepted; do not retarget the chosen Dark accent. **Principle:** `accessibility`. **Cap:** Color & contrast ≤6.9.
- **[SYS-05] Library content is not indexed in Spotlight.** [PodListMac.swift][r257] registers App Shortcuts, but app sources/bundle setup contain no Core Spotlight indexing path. State 15 demonstrates an internal searchable Episode Library, not system indexing. **Fix:** index release-only Episode/Podcast metadata and supported open targets, with removal on unsubscribe/deletion and scope/privacy boundaries. **Owner decision:** approved but deliberately deferred until last; keep this failure/cap without advancing it ahead of the agreed order. Quick Look/thumbnail clauses are inapplicable without a proprietary file document. **Principle:** `discoverable-commands`. **Cap:** Platform fit ≤6.9.

**Minors**

- **[APP-01] About lacks copyright information.** [menus.txt][r258] includes About PodList; [build-mac-app.sh:20][r259] supplies version/build metadata but no `NSHumanReadableCopyright`, copyright resource or custom About-panel copyright. **Fix:** add the correct owner/year copyright to bundle metadata and verify the standard About panel displays it. This is a source-backed metadata finding; About was not captured. **Principle:** `conventions`.
- **[HELP-02] Help is useful but lacks Help Book topic integration.** [menus.txt][r260] includes the native search field; [ConnectionViews.swift:76][r261] opens a custom task-help window, and [build-mac-app.sh:20][r262] has no Help Book registration. **Fix:** package/register a small indexed Help Book and route PodList Help to it, retaining shortcut reference and the native menu-command search. **Principle:** `discoverable-commands`, `hierarchy`.
- **[VIEW-02] Sidebar menu title disagrees with the captured visible state.** [light/33-multi-selection][r263] and [light/33-multi-selection.txt][r264] show the sidebar and a “Hide Sidebar” toolbar control; the immediately following [menus.txt][r265] exports View > “Show Sidebar.” [captureMenus sequence][r266] opens menus without toggling the sidebar; [PodListMac.swift:36][r267] uses SidebarCommands. **Fix:** validate the menu title against actual column visibility, supplying a bound Show/Hide command if needed while preserving the native toolbar control and shortcut. **Principle:** `feedback`.
- **[SET-04] Last Settings pane is not retained across relaunch.** [light/30-settings-automation][r268] / [dark/30-settings-automation][r269] shows Automation; [ConnectionViews.swift:57][r270] initializes pane selection with volatile `@State = "general"`. No retained pane preference is read. Titles are correct, but after restarting, reopening cannot restore Automation. **Fix:** persist the selected pane with a validated AppStorage preference, while preserving SET-06’s closed-on-relaunch behavior. Same-process native window retention is not claimed broken. **Principle:** `stability`.
- **[DATA-05] Undo does not reveal restored offscreen content.** [PlaylistEditingModel.swift:110][r271] reverses data, reloads and writes “Undone…”/restored Playlist names; [MacWindow.swift:616][r272] only reconciles the existing selection/context, and [MacRowScroll.swift][r273] restores an existing row anchor. There is no inverse-result ID/anchor request to bring a restored Entry/Playlist into view. A notice confirms the operation, but does not satisfy this check’s offscreen reveal clause. **Fix:** return affected restored IDs from reverse, publish a one-shot reveal request to the invoking window, navigate only when needed and scroll/select the restored item. No runtime undo failure is alleged. **Principle:** `feedback`.
- **[SYS-02] No purpose-specific selection Service.** [build-mac-app.sh:20][r274] declares no NSServices entry; the app has no Services provider handler for useful selected feed addresses. Podcast following is relevant to text/URL selected in other apps; consuming their Services is a separate APP-03 question. **Fix:** provide a narrowly typed “Add Podcast to PodList” Service that stages a selected HTTP(S) feed in discovery without silently subscribing. **Principle:** `conventions`.
- **[SYS-03] Views/Playlists have no stable app-opening links.** [ShareLinks.swift][r275] validates publisher HTTP(S) URLs; [PodListMac.swift][r276] has no open-URL handler and [build-mac-app.sh:20][r277] no URL-scheme registration. [light/06-default-playlist][r278] / [dark/06-default-playlist][r279] is addressable inside the app, but cannot be reopened from a copied app-content link. **Fix:** add registered, validated stable links for Episode/Playlist/View IDs, with menu-bar Copy Link/Share routes and explicit unavailable-library feedback. Keep publisher Share URLs available. **Principle:** `user-control`.
- **[TYPE-08] Authored prose uses straight apostrophes.** [light/31-listening-stats][r280] / [dark/31-listening-stats][r281] and [LibrarySettingsScreens.swift:317][r282] contain “Episode's” and “doesn't” in app-authored explanatory text. **Fix:** use “Episode’s” and “doesn’t” in authored prose; leave user/feed data and literal code/URLs unchanged. **Principle:** `craft`.

**N/O:** FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, KEY-07, DRAG-05, APPEAR-11, TYPE-06, AX-01, AX-04, WIN-03, RESP-01, RESP-02, FOOT-02, APP-03, WIN-10, TOOL-02, DRAG-07, PTR-05, TYPE-04, SYS-01, FOOT-01.

**N/A:** FLOW-05, DLG-09, LIST-05, START-05, START-07, FILE-01, FILE-02, FILE-04, FILE-05, FMT-01, FMT-02, DATA-02, DATA-03, DATA-08, SYS-06, SYS-07, EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04. No failed-parent dependents are counted as extra failures; the Settings, document and menu-bar parent features are present or intentionally outside this library app’s document model.

### Core verdicts

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No measured delayed-completion flow at minimum, tiled and typical widths; still-state geometry cannot prove stability or follow-up visibility at the minimum. |
| FLOW-02 | N/O | No measured delayed-completion flow at minimum, tiled and typical widths; still-state geometry cannot prove stability or follow-up visibility at the minimum. |
| FLOW-03 | pass | [AddPodcastsWindow.swift:137][r1] rejects cancelled/stale search results; [ViewEditorScreen.swift][r2] serializes writes and protects unapplied drafts; save-only sheets disable editing during submission; [LibraryEditingModel.swift:258][r3] versions OPML selections. Code verdict, not an executed late-arrival test. |
| FLOW-04 | N/O | No measured delayed-completion flow at minimum, tiled and typical widths; still-state geometry cannot prove stability or follow-up visibility at the minimum. |
| FLOW-05 | N/A | Sidebar, collection and Inspector are hierarchical panes, not peer comparison panels. |
| FLOW-06 | pass | [EpisodeInspector.swift][r4] supplies No Playlists/No show notes; [MacWindow.swift][r5] supplies empty section/list states; [light/08-history][r6] / [dark/08-history][r7] and [light/14-trash][r8] / [dark/14-trash][r9] show populated empty-state regions, not orphan headings. |
| FLOW-07 | pass | [PodListSheet.swift][r10] pins the primary action trailing in the shared footer across [light/13-new-playlist][r11] / [dark/13-new-playlist][r12], [light/16-edit-view][r13] / [dark/16-edit-view][r14], [light/23-add-to-playlist][r15] / [dark/23-add-to-playlist][r16] and [light/25-download-rules][r17] / [dark/25-download-rules][r18]. Playlist section controls retain their toolbar region in states 06–10; no claim about asynchronous motion. |
| KEY-01 | N/O | Native controls, declared focus and scoped key routing are present; the supplied tour does not traverse every control with Full Keyboard Access or exercise the complete scrolling-key matrix. |
| KEY-04 | N/O | Native controls, declared focus and scoped key routing are present; the supplied tour does not traverse every control with Full Keyboard Access or exercise the complete scrolling-key matrix. |
| KEY-06 | pass | [KeyboardShortcuts.swift][r19] uses letters/arrows/Return, native key equivalents, and no extra-modifier punctuation family; [MacTextSize.swift][r20] uses native +/− equivalents. International physical-key testing remains unrun. |
| KEY-07 | N/O | Native controls, declared focus and scoped key routing are present; the supplied tour does not traverse every control with Full Keyboard Access or exercise the complete scrolling-key matrix. |
| KEY-08 | pass | [ConnectionViews.swift:76][r21] provides an in-app shortcut reference and documents Space/Return scope; [PlaybackCommands.swift][r22] protects text entry, controls, sheets and other windows. |
| DLG-01 | pass | [PlaylistSettingsViews.swift][r23] uses an explicit permanent-deletion sheet, safe Cancel and a named irreversible action; routine removal goes to Trash/Undo; [PodListSheet.swift][r24] gives trailing default and Escape cancellation; [PlaybackCommands.swift][r25] maps ⌘. to sheet cancellation. [light/34-rewind-summary][r26] / [dark/34-rewind-summary][r27] previews a reversible, consequential rewind with Cancel/Rewind, rather than vague Yes/No. |
| DLG-02 | pass | [PlaylistSettingsViews.swift][r23] uses an explicit permanent-deletion sheet, safe Cancel and a named irreversible action; routine removal goes to Trash/Undo; [PodListSheet.swift][r24] gives trailing default and Escape cancellation; [PlaybackCommands.swift][r25] maps ⌘. to sheet cancellation. [light/34-rewind-summary][r26] / [dark/34-rewind-summary][r27] previews a reversible, consequential rewind with Cancel/Rewind, rather than vague Yes/No. |
| DLG-03 | pass | [PlaylistSettingsViews.swift][r23] uses an explicit permanent-deletion sheet, safe Cancel and a named irreversible action; routine removal goes to Trash/Undo; [PodListSheet.swift][r24] gives trailing default and Escape cancellation; [PlaybackCommands.swift][r25] maps ⌘. to sheet cancellation. [light/34-rewind-summary][r26] / [dark/34-rewind-summary][r27] previews a reversible, consequential rewind with Cancel/Rewind, rather than vague Yes/No. |
| DLG-04 | pass | [PlaylistSettingsViews.swift][r23] uses an explicit permanent-deletion sheet, safe Cancel and a named irreversible action; routine removal goes to Trash/Undo; [PodListSheet.swift][r24] gives trailing default and Escape cancellation; [PlaybackCommands.swift][r25] maps ⌘. to sheet cancellation. [light/34-rewind-summary][r26] / [dark/34-rewind-summary][r27] previews a reversible, consequential rewind with Cancel/Rewind, rather than vague Yes/No. |
| DLG-05 | pass | [PlaylistSettingsViews.swift][r23] uses an explicit permanent-deletion sheet, safe Cancel and a named irreversible action; routine removal goes to Trash/Undo; [PodListSheet.swift][r24] gives trailing default and Escape cancellation; [PlaybackCommands.swift][r25] maps ⌘. to sheet cancellation. [light/34-rewind-summary][r26] / [dark/34-rewind-summary][r27] previews a reversible, consequential rewind with Cancel/Rewind, rather than vague Yes/No. |
| DLG-07 | pass | [light/11-playlist-settings][r28] / [dark/11-playlist-settings][r29], [light/16-edit-view][r30] / [dark/16-edit-view][r31] and [light/23-add-to-playlist][r32] / [dark/23-add-to-playlist][r33] pair one submission route with Cancel; no Cancel/Done/Back trio. |
| DLG-09 | N/A | No app-authored editing popover; native menus are not a draft-editing popover feature. |
| CTRL-02 | pass | [light/11-playlist-settings][r34] / [dark/11-playlist-settings][r35] and [light/30-settings-automation][r36] / [dark/30-settings-automation][r37] retain independent checkbox semantics; no mixed-state parent hierarchy is offered. |
| CTRL-03 | pass | [light/13-new-playlist][r38] / [dark/13-new-playlist][r39], [light/17-new-view][r40] / [dark/17-new-view][r41] and [light/24-add-podcasts][r42] / [dark/24-add-podcasts][r43] retain visible identifying labels; optional conditions are explicitly marked. [PodListSheet.swift][r44] preserves stacked visual labels. Screen-reader label association is separately N/O under AX-01. |
| CTRL-04 | pass | [FormNumbers.swift][r45], [ViewEditorScreen.swift][r46] and [LibrarySettingsScreens.swift][r47] retain raw drafts, parse full locale-aware numbers and provide field-specific bounds/errors; short numeric fields and wide name/feed fields suit their input. |
| CTRL-05 | pass | [MacAppearance.swift][r48] and [MacGlass.swift][r49] wrap native Buttons rather than mouse-down gesture buttons; primary actions use native prominence, with native press tracking. |
| CTRL-06 | pass | [EpisodeEditingViews.swift][r50] keeps common Play/Add outside its related action menu, with remaining Episode operations in the menu bar; [PlayerViews.swift][r51] separates related Speed and Sleep options. |
| CTRL-07 | pass | [light/15-search-rice][r52] / [dark/15-search-rice][r53] has a Search destination and result count; Podcast pages use Search Episodes and other lists Search this list. [MacWindow.swift][r54] distinguishes scope; no search-history feature needs clearing. |
| CTRL-08 | pass | [OPMLImportContent.swift][r55] supplies measured import count and cooperative cancellation; [DownloadViews.swift][r56] supplies determinate/indeterminate download progress and Cancel; [EpisodeTransfer.swift][r57] supplies preparation progress. Missing drop placeholders are counted once under DRAG-06. |
| LIST-01 | pass | [light/03-episode-inspector][r58] / [dark/03-episode-inspector][r59], [light/06-default-playlist][r60] / [dark/06-default-playlist][r61] and [light/18-podcast-market-hours][r62] / [dark/18-podcast-market-hours][r63] show native columnar tables with noun headings and trackable hairline-separated rows; [MacWindow.swift][r64] and [PodcastScreens.swift][r65] bind sortable native columns. Playlists deliberately retain ordered Entries, with Move commands instead of sorting. No file/path-name column requires middle ellipsis. |
| LIST-02 | pass | [light/03-episode-inspector][r58] / [dark/03-episode-inspector][r59], [light/06-default-playlist][r60] / [dark/06-default-playlist][r61] and [light/18-podcast-market-hours][r62] / [dark/18-podcast-market-hours][r63] show native columnar tables with noun headings and trackable hairline-separated rows; [MacWindow.swift][r64] and [PodcastScreens.swift][r65] bind sortable native columns. Playlists deliberately retain ordered Entries, with Move commands instead of sorting. No file/path-name column requires middle ellipsis. |
| LIST-03 | pass | [light/03-episode-inspector][r58] / [dark/03-episode-inspector][r59], [light/06-default-playlist][r60] / [dark/06-default-playlist][r61] and [light/18-podcast-market-hours][r62] / [dark/18-podcast-market-hours][r63] show native columnar tables with noun headings and trackable hairline-separated rows; [MacWindow.swift][r64] and [PodcastScreens.swift][r65] bind sortable native columns. Playlists deliberately retain ordered Entries, with Move commands instead of sorting. No file/path-name column requires middle ellipsis. |
| LIST-04 | pass | [light/03-episode-inspector][r58] / [dark/03-episode-inspector][r59], [light/06-default-playlist][r60] / [dark/06-default-playlist][r61] and [light/18-podcast-market-hours][r62] / [dark/18-podcast-market-hours][r63] show native columnar tables with noun headings and trackable hairline-separated rows; [MacWindow.swift][r64] and [PodcastScreens.swift][r65] bind sortable native columns. Playlists deliberately retain ordered Entries, with Move commands instead of sorting. No file/path-name column requires middle ellipsis. |
| LIST-05 | N/A | No expandable descendant outline. Sidebar section grouping and Show Description are not an object-tree disclosure hierarchy. |
| LIST-06 | pass | [light/03-episode-inspector][r66] / [dark/03-episode-inspector][r67], [light/06-default-playlist][r68] / [dark/06-default-playlist][r69] and [light/33-multi-selection][r70] / [dark/33-multi-selection][r71] retain selection; native Pickers reflect their current value. |
| LIST-07 | pass | [MacRowScroll.swift][r72] supplies scoped type selection and reveal; native Lists/Tables supply selection/arrows, and collection context-menu primaryAction opens rows. The supplied [tour source][r73] and [successful tour log][r74] corroborate Episode type-select. Full Keyboard Access remains N/O separately. |
| DATA-01 | pass | [PlaylistEditingModel.swift][r75] keeps durable scoped drafts and multistep named inverses; [LibraryEditingModel.swift][r76] persists editor drafts and imports; [GeneralSettingsEdits.swift][r77] journals queued live writes. [EpisodeEditingViews.swift][r78] routes ⌘Z/⇧⌘Z to text undo or app undo as appropriate. Explicit Cancel is intentional discard, not unexplained loss. |
| DATA-04 | pass | [PlaylistEditingModel.swift][r75] keeps durable scoped drafts and multistep named inverses; [LibraryEditingModel.swift][r76] persists editor drafts and imports; [GeneralSettingsEdits.swift][r77] journals queued live writes. [EpisodeEditingViews.swift][r78] routes ⌘Z/⇧⌘Z to text undo or app undo as appropriate. Explicit Cancel is intentional discard, not unexplained loss. |
| DATA-05 | fail minor | See failure detail above: reverse updates data/notices without a destination reveal request. |
| DATA-06 | pass | [WindowRestoration.swift][r79], [MacWindow.swift][r80] and [MacRowScroll.swift][r81] archive/reconcile per-scene destination, query, selection, sorting, section, pane widths and row anchor; native WindowGroup owns frame restoration. Code-backed contract; relaunch behavior was not re-exercised by this review. |
| DRAG-01 | pass | [EpisodeTransfer.swift][r82], [LibraryDrops.swift][r83] and [PlaylistContentView.swift][r84] provide Episode transfers, URL/text export, feed/OPML input, queue/reorder command equivalents, reversible edits and staged import confirmation. File > Import/Export supplies the non-drag file route. |
| DRAG-03 | pass | [EpisodeTransfer.swift][r82], [LibraryDrops.swift][r83] and [PlaylistContentView.swift][r84] provide Episode transfers, URL/text export, feed/OPML input, queue/reorder command equivalents, reversible edits and staged import confirmation. File > Import/Export supplies the non-drag file route. |
| DRAG-05 | N/O | Native drag APIs are used, but neither the captures nor application code settles threshold/image/reset cues, inactive-window pickup and one-motion selection behavior. |
| DRAG-06 | fail major | See failure detail above: slow publisher Episode preparation has progress but no destination placeholders. Autoscroll is independently unverified; no additional failure inferred. |
| PTR-03 | pass | [PlaylistContentView.swift][r85] and [MacWindow.swift][r86] retain native table, divider, scrollbar and pointer tracking; no custom cursor or pointer-gesture override. Live resize quality is N/O under WIN-10. |
| PTR-04 | pass | [MacIconLabel.swift][r87], [EpisodeInspector.swift][r88] and [PlayerViews.swift][r89] supply action names/help for icon controls and full title help on truncated player content; primary row actions are visible without hover. Standard system help behavior is retained. |
| APPEAR-03 | pass | [MacGlass.swift][r90] replaces glass with opaque system surfaces plus borders for Reduce Transparency or Increase Contrast, including together; [MacAppearance.swift][r91] supplies Light/Dark/high-contrast semantic secondary/error/brand variants and contrast-safe custom accent foregrounds. [four AccentColor variants][r92] cover selection. Code-backed, not a captured accessibility-mode matrix. |
| APPEAR-04 | fail major | See measured Dark Settings-tab contrast failure above; disabled controls and decorative marks are excluded. |
| APPEAR-05 | pass | No app-authored positional/depth animations or withAnimation transitions exist in the reviewed UI sources. Native SwiftUI/AppKit effects retain the system Reduce Motion behavior; no custom animation bypass was found. |
| APPEAR-09 | pass | [light/03-episode-inspector][r93] / [dark/03-episode-inspector][r94], [light/18-podcast-market-hours][r95] / [dark/18-podcast-market-hours][r96] and [light/26-now-playing][r97] / [dark/26-now-playing][r98] use a coherent SF Symbol family with standard play, star, trash, share and sidebar meanings; [MacGlass.swift][r99] separates controls from plain reading/table surfaces. |
| APPEAR-10 | pass | [light/03-episode-inspector][r93] / [dark/03-episode-inspector][r94], [light/18-podcast-market-hours][r95] / [dark/18-podcast-market-hours][r96] and [light/26-now-playing][r97] / [dark/26-now-playing][r98] use a coherent SF Symbol family with standard play, star, trash, share and sidebar meanings; [MacGlass.swift][r99] separates controls from plain reading/table surfaces. |
| APPEAR-11 | N/O | Settled captures do not sample intermediate loading/transition frames. No flash, jump or contradictory status is scored from conjecture. |
| TYPE-02 | pass | [MacTextSize.swift][r100] and the captured screens use system text styles and regular/medium/semibold/bold roles; no custom body/caption typeface or thin reading weight. |
| TYPE-03 | pass | [MacTextSize.swift][r100] and the captured screens use system text styles and regular/medium/semibold/bold roles; no custom body/caption typeface or thin reading weight. |
| TYPE-05 | pass | [MacTextSize.swift][r101] reflows enlarged metadata into reading rows; [PodListSheet.swift][r102] stacks labels, wraps prose and scrolls content above the footer; [EpisodeInspector.swift][r103] wraps titles/show notes. No forced tight-leading modifier. Minimum-window execution remains N/O under WIN-03. |
| TYPE-06 | N/O | The supplied states do not expose three representative full show-note/help paragraph lines at the default reading width. Source specifies system leading, but cannot establish average rendered characters per line for representative feed prose. |
| TYPE-07 | pass | No authored long all-caps text, bold-italic emphasis, or non-link underlining found. [MacAppearance.swift][r104] underlines the actual Show Description link-style control; artwork initials are short identity content. |
| TYPE-08 | fail minor | See authored straight apostrophes in Listening Stats above. |
| COPY-01 | pass | [light/08-history][r105] / [dark/08-history][r106], [light/14-trash][r107] / [dark/14-trash][r108], [light/24-add-podcasts][r109] / [dark/24-add-podcasts][r110], [light/31-listening-stats][r111] / [dark/31-listening-stats][r112] explain object/state and the next useful action; [FailureMessages.swift][r113] separates technical diagnostics from practical, blame-free recovery copy. Actions use specific verbs, consistent domain terms and Mac input vocabulary. Help-fragment casing varies slightly but is not an actionable comprehension defect. |
| COPY-02 | pass | [light/08-history][r105] / [dark/08-history][r106], [light/14-trash][r107] / [dark/14-trash][r108], [light/24-add-podcasts][r109] / [dark/24-add-podcasts][r110], [light/31-listening-stats][r111] / [dark/31-listening-stats][r112] explain object/state and the next useful action; [FailureMessages.swift][r113] separates technical diagnostics from practical, blame-free recovery copy. Actions use specific verbs, consistent domain terms and Mac input vocabulary. Help-fragment casing varies slightly but is not an actionable comprehension defect. |
| COPY-03 | pass | [light/08-history][r105] / [dark/08-history][r106], [light/14-trash][r107] / [dark/14-trash][r108], [light/24-add-podcasts][r109] / [dark/24-add-podcasts][r110], [light/31-listening-stats][r111] / [dark/31-listening-stats][r112] explain object/state and the next useful action; [FailureMessages.swift][r113] separates technical diagnostics from practical, blame-free recovery copy. Actions use specific verbs, consistent domain terms and Mac input vocabulary. Help-fragment casing varies slightly but is not an actionable comprehension defect. |
| COPY-04 | pass | [light/08-history][r105] / [dark/08-history][r106], [light/14-trash][r107] / [dark/14-trash][r108], [light/24-add-podcasts][r109] / [dark/24-add-podcasts][r110], [light/31-listening-stats][r111] / [dark/31-listening-stats][r112] explain object/state and the next useful action; [FailureMessages.swift][r113] separates technical diagnostics from practical, blame-free recovery copy. Actions use specific verbs, consistent domain terms and Mac input vocabulary. Help-fragment casing varies slightly but is not an actionable comprehension defect. |
| AX-01 | N/O | Named icon controls and stateful labels are visible in snapshots and code, but several text fields/Pop-up controls expose blank XCUI label/title. XCUI does not serialize all Cocoa label relationships or AX subroles; source initializer labels alone cannot establish the custom sheet-style result. Live VoiceOver/Voice Control/Switch Control was prohibited. Do not infer either a blocker or full compliance. |
| AX-02 | pass | [light/06-default-playlist][r114] / [dark/06-default-playlist][r115] combines Current Entry text/symbol, [light/20-unsubscribe-armed][r116] / [dark/20-unsubscribe-armed][r117] changes wording and symbol as well as red; [FailureFeedback.swift][r118] uses explicit recovery text; native selection/state semantics accompany color. |
| AX-04 | N/O | Named icon controls and stateful labels are visible in snapshots and code, but several text fields/Pop-up controls expose blank XCUI label/title. XCUI does not serialize all Cocoa label relationships or AX subroles; source initializer labels alone cannot establish the custom sheet-style result. Live VoiceOver/Voice Control/Switch Control was prohibited. Do not infer either a blocker or full compliance. |
| AX-05 | pass | [PlayerViews.swift][r119], [SystemPlayback.swift][r120] and [DownloadViews.swift][r121] expose visible play/pause, position, queue and failure/status information; no critical app alert exists only as sound, and playback is controllable. Publisher-provided podcast transcripts/captions are not an authored-app-audio requirement. |
| START-01 | pass | [MacWindow.swift][r122] presents Opening Library/Welcome before async startup; [LibrarySettingsScreens.swift][r123] and [LibraryEditingModel.swift][r124] keep Getting Started dismissible, persistent and findable; [light/32-getting-started][r125] / [dark/32-getting-started][r126] teaches actual Views/Playlists operations without mandatory setup. Launch speed is not claimed. |
| START-02 | pass | [MacWindow.swift][r122] presents Opening Library/Welcome before async startup; [LibrarySettingsScreens.swift][r123] and [LibraryEditingModel.swift][r124] keep Getting Started dismissible, persistent and findable; [light/32-getting-started][r125] / [dark/32-getting-started][r126] teaches actual Views/Playlists operations without mandatory setup. Launch speed is not claimed. |
| START-03 | pass | [MacWindow.swift][r122] presents Opening Library/Welcome before async startup; [LibrarySettingsScreens.swift][r123] and [LibraryEditingModel.swift][r124] keep Getting Started dismissible, persistent and findable; [light/32-getting-started][r125] / [dark/32-getting-started][r126] teaches actual Views/Playlists operations without mandatory setup. Launch speed is not claimed. |
| START-04 | pass | [ConnectionViews.swift][r127] permits local Start on This Mac; file access uses a user-invoked system picker; MCP is opt-in and its reach is explained in [light/30-settings-automation][r128] / [dark/30-settings-automation][r129]. No unsolicited protected-resource permission request was found. |
| START-05 | N/A | No protected-resource permission request/purpose string applies to the current feature set; user-selected file panels are not a permission pre-alert. |
| START-06 | pass | [ConnectionViews.swift][r130] supports a local Library without account/sign-in. A server address is optional; no invented identity requirement. |
| START-07 | N/A | The app does not create accounts or sell account subscriptions; podcast subscriptions are feed follows. |
| EDIT-02 | pass | [EpisodeEditingViews.swift][r131] preserves native field Cut/Copy/Paste/Select All and text undo, scopes Entry removal, and leaves the clipboard intact on deletion. [SelectionCommands.swift][r132] supplies Episode title plus URL representations; [ShareLinks.swift][r133] copies displayed feed/share URLs. |
| EDIT-05 | pass | [EpisodeEditingViews.swift][r131] preserves native field Cut/Copy/Paste/Select All and text undo, scopes Entry removal, and leaves the clipboard intact on deletion. [SelectionCommands.swift][r132] supplies Episode title plus URL representations; [ShareLinks.swift][r133] copies displayed feed/share URLs. |
| WIN-03 | N/O | Minimum 760×500 pt, typical 1180×760 pt and adaptive reading layouts are declared, but only typical-width window captures are supplied. Source cannot prove that every native toolbar/table minimum fits without clipping at minimum and half-display tiling. |
| TOOL-06 | pass | [MacWindow.swift][r134] and [PodListMac.swift][r135] retain native sidebar/Inspector restoration commands and controls. The owner has chosen a noncustomizable toolbar; this conditional check does not require a customization feature for a toolbar that is not customizable. |
| SIDE-03 | pass | [MacWindow.swift][r136] and [PodListMac.swift][r137] provide native SidebarCommands plus visible sidebar control, and Inspector button plus ⌥⌘I menu equivalent; [light/03-episode-inspector][r138] / [dark/03-episode-inspector][r139] and [light/33-multi-selection][r140] / [dark/33-multi-selection][r141] preserve selected source and content. |
| SIDE-04 | pass | [MacWindow.swift][r136] and [PodListMac.swift][r137] provide native SidebarCommands plus visible sidebar control, and Inspector button plus ⌥⌘I menu equivalent; [light/03-episode-inspector][r138] / [dark/03-episode-inspector][r139] and [light/33-multi-selection][r140] / [dark/33-multi-selection][r141] preserve selected source and content. |
| SET-01 | pass | [light/27-settings-general-top][r142] / [dark/27-settings-general-top][r143], [light/30-settings-automation][r144] / [dark/30-settings-automation][r145], [light/11-playlist-settings][r146] / [dark/11-playlist-settings][r147] and [light/22-subscription-settings][r148] / [dark/22-subscription-settings][r149] separate app/local preferences, Playlist options and per-Subscription options. |
| RESP-01 | N/O | No five-run input-to-frame percentiles, high-frame-rate keystroke data, hitch metrics or hang trace; XCUITest wait durations are not these measurements. |
| RESP-02 | N/O | No five-run input-to-frame percentiles, high-frame-rate keystroke data, hitch metrics or hang trace; XCUITest wait durations are not these measurements. |
| FOOT-02 | N/O | No five-run input-to-frame percentiles, high-frame-rate keystroke data, hitch metrics or hang trace; XCUITest wait durations are not these measurements. |

### Mac verdicts

| ID | Verdict | Evidence / scope |
|---|---|---|
| MENU-01 | pass | [menus.txt][r150] preserves standard order and disabled commands; [LibraryCommands.swift][r151], [EpisodeEditingViews.swift][r152], [PlaybackCommands.swift][r153] and [MenuCommandActions.swift][r154] index navigation, selection, queue, recovery, import, connection and player operations. App-authored submenus are one level and sparsely illustrated. Native dialog submission/cancellation is local dialog grammar, not a missing standalone app command; OS-added window-management submenus are not app-authored nesting defects. |
| MENU-02 | pass | [menus.txt][r150] preserves standard order and disabled commands; [LibraryCommands.swift][r151], [EpisodeEditingViews.swift][r152], [PlaybackCommands.swift][r153] and [MenuCommandActions.swift][r154] index navigation, selection, queue, recovery, import, connection and player operations. App-authored submenus are one level and sparsely illustrated. Native dialog submission/cancellation is local dialog grammar, not a missing standalone app command; OS-added window-management submenus are not app-authored nesting defects. |
| MENU-03 | pass | [menus.txt][r150] preserves standard order and disabled commands; [LibraryCommands.swift][r151], [EpisodeEditingViews.swift][r152], [PlaybackCommands.swift][r153] and [MenuCommandActions.swift][r154] index navigation, selection, queue, recovery, import, connection and player operations. App-authored submenus are one level and sparsely illustrated. Native dialog submission/cancellation is local dialog grammar, not a missing standalone app command; OS-added window-management submenus are not app-authored nesting defects. |
| MENU-04 | pass | [menus.txt][r150] preserves standard order and disabled commands; [LibraryCommands.swift][r151], [EpisodeEditingViews.swift][r152], [PlaybackCommands.swift][r153] and [MenuCommandActions.swift][r154] index navigation, selection, queue, recovery, import, connection and player operations. App-authored submenus are one level and sparsely illustrated. Native dialog submission/cancellation is local dialog grammar, not a missing standalone app command; OS-added window-management submenus are not app-authored nesting defects. |
| MENU-05 | pass | [menus.txt][r150] preserves standard order and disabled commands; [LibraryCommands.swift][r151], [EpisodeEditingViews.swift][r152], [PlaybackCommands.swift][r153] and [MenuCommandActions.swift][r154] index navigation, selection, queue, recovery, import, connection and player operations. App-authored submenus are one level and sparsely illustrated. Native dialog submission/cancellation is local dialog grammar, not a missing standalone app command; OS-added window-management submenus are not app-authored nesting defects. |
| MENU-06 | pass | [menus.txt][r155] shows native Option alternates for Close/Minimize/Zoom/arrange; no app-authored multi-modifier alternates. Main routes remain visible. |
| APP-01 | fail minor | See missing copyright metadata above; About name/version route otherwise exists. |
| APP-02 | pass | [menus.txt][r156] and [PodListMac.swift][r157] use native App/Settings scenes and standard Hide/Hide Others/Show All/Quit behavior; [light/27-settings-general-top][r158] / [dark/27-settings-general-top][r159] is a separate titled Settings window. Native Settings supplies ⌘,. |
| APP-03 | N/O | Services was explicitly excluded from the supplied menu capture. Native text fields preserve the consumer path, but the evidence cannot establish working current-selection Services in both menu and applicable context menu. |
| APP-04 | pass | [menus.txt][r156] and [PodListMac.swift][r157] use native App/Settings scenes and standard Hide/Hide Others/Show All/Quit behavior; [light/27-settings-general-top][r158] / [dark/27-settings-general-top][r159] is a separate titled Settings window. Native Settings supplies ⌘,. |
| FILE-01 | N/A | Library app, not a file-document editor: no New/Open owned document, recent-document list, Duplicate document or printing feature. OPML is import/export interchange; its native dialogs are assessed under DATA-07. |
| FILE-02 | N/A | Library app, not a file-document editor: no New/Open owned document, recent-document list, Duplicate document or printing feature. OPML is import/export interchange; its native dialogs are assessed under DATA-07. |
| FILE-03 | pass | [menus.txt][r160] exposes native Close/Close All; [PodListMac.swift][r161] uses genuine Window/WindowGroup scenes. |
| FILE-04 | N/A | Library app, not a file-document editor: no New/Open owned document, recent-document list, Duplicate document or printing feature. OPML is import/export interchange; its native dialogs are assessed under DATA-07. |
| FILE-05 | N/A | Library app, not a file-document editor: no New/Open owned document, recent-document list, Duplicate document or printing feature. OPML is import/export interchange; its native dialogs are assessed under DATA-07. |
| EDIT-01 | pass | [menus.txt][r162] retains native Find, spelling, substitutions, transformations, speech, Dictation and Emoji; [EpisodeEditingViews.swift][r163] names Undo/Redo and follows focused text editing. [LibraryCommands.swift][r164] uses ⌘F for Library search where text Find is inapplicable, while native text Find items stay present. |
| EDIT-03 | pass | [menus.txt][r162] retains native Find, spelling, substitutions, transformations, speech, Dictation and Emoji; [EpisodeEditingViews.swift][r163] names Undo/Redo and follows focused text editing. [LibraryCommands.swift][r164] uses ⌘F for Library search where text Find is inapplicable, while native text Find items stay present. |
| EDIT-04 | pass | [menus.txt][r162] retains native Find, spelling, substitutions, transformations, speech, Dictation and Emoji; [EpisodeEditingViews.swift][r163] names Undo/Redo and follows focused text editing. [LibraryCommands.swift][r164] uses ⌘F for Library search where text Find is inapplicable, while native text Find items stay present. |
| FMT-01 | N/A | No formatted-text editing; plain name/search/number fields and read-only show notes do not need a Format menu. |
| FMT-02 | N/A | No formatted-text editing; plain name/search/number fields and read-only show notes do not need a Format menu. |
| VIEW-01 | pass | [menus.txt][r165] shows native Full Screen, Minimize, distinct Zoom, Bring All to Front and window navigation; view commands use Show/Hide. Auxiliary Window scene commands precede the native open-content list; no floating inspector is added to that list. Native Zoom behavior is retained, not replaced with full screen. |
| VIEW-02 | fail minor | See failure detail above: View > Show Sidebar conflicts with the visibly open sidebar captured immediately before the menu export. |
| WMENU-01 | pass | [menus.txt][r165] shows native Full Screen, Minimize, distinct Zoom, Bring All to Front and window navigation; view commands use Show/Hide. Auxiliary Window scene commands precede the native open-content list; no floating inspector is added to that list. Native Zoom behavior is retained, not replaced with full screen. |
| WMENU-02 | pass | [menus.txt][r165] shows native Full Screen, Minimize, distinct Zoom, Bring All to Front and window navigation; view commands use Show/Hide. Auxiliary Window scene commands precede the native open-content list; no floating inspector is added to that list. Native Zoom behavior is retained, not replaced with full screen. |
| WMENU-03 | pass | [menus.txt][r165] shows native Full Screen, Minimize, distinct Zoom, Bring All to Front and window navigation; view commands use Show/Hide. Auxiliary Window scene commands precede the native open-content list; no floating inspector is added to that list. Native Zoom behavior is retained, not replaced with full screen. |
| HELP-01 | pass | [menus.txt][r166] has trailing Help, system search, PodList Help and Getting Started; [ConnectionViews.swift:76][r167] provides task documentation and an accessible shortcut reference. Native Help menu supplies ⌘?. |
| HELP-02 | fail minor | See useful custom Help window without Help Book topic integration above. Native menu-command search is present. |
| KEY-02 | pass | [KeyboardShortcuts.swift][r168], [PlaybackCommands.swift][r169] and [ConnectionViews.swift:76][r170] preserve standard commands, document scoped Return/Space and provide ⌘/⇧⌘ families for frequent selection/queue operations. Option is used for secondary families, Control is not invented for custom commands. Native menu glyphs and the reference use Mac modifier order. Download has a documented menu route and no arbitrary shortcut. |
| KEY-03 | pass | [KeyboardShortcuts.swift][r168], [PlaybackCommands.swift][r169] and [ConnectionViews.swift:76][r170] preserve standard commands, document scoped Return/Space and provide ⌘/⇧⌘ families for frequent selection/queue operations. Option is used for secondary families, Control is not invented for custom commands. Native menu glyphs and the reference use Mac modifier order. Download has a documented menu route and no arbitrary shortcut. |
| KEY-05 | pass | [KeyboardShortcuts.swift][r168], [PlaybackCommands.swift][r169] and [ConnectionViews.swift:76][r170] preserve standard commands, document scoped Return/Space and provide ⌘/⇧⌘ families for frequent selection/queue operations. Option is used for secondary families, Control is not invented for custom commands. Native menu glyphs and the reference use Mac modifier order. Download has a documented menu route and no arbitrary shortcut. |
| TEXT-01 | pass | [PlaybackCommands.swift][r171] routes native text navigation through NSTextView.interpretKeyEvents and protects Space/Return/⌘-arrows; standard SwiftUI TextFields and TextEditingCommands retain Cocoa bindings, substitutions and spelling rather than implementing a private editor. Custom user binding files and actual installed Services were not exercised. |
| TEXT-02 | pass | [PlaybackCommands.swift][r171] routes native text navigation through NSTextView.interpretKeyEvents and protects Space/Return/⌘-arrows; standard SwiftUI TextFields and TextEditingCommands retain Cocoa bindings, substitutions and spelling rather than implementing a private editor. Custom user binding files and actual installed Services were not exercised. |
| WIN-01 | pass | [PodListMac.swift][r172] uses native frame/full-screen/window scenes; [LibraryCommands.swift][r173] offers New Window/Open in New Window; [light/03-episode-inspector][r174] / [dark/03-episode-inspector][r175], [light/11-playlist-settings][r176] / [dark/11-playlist-settings][r177] and [light/24-add-podcasts][r178] / [dark/24-add-podcasts][r179] show real frames, context titles and native dimming. Native title-bar dragging/double-click remain unmodified; there is no custom fullscreen or always-key selection painting. Runtime fullscreen/Dock reveal and cross-app inactive appearance were not re-exercised. |
| WIN-02 | pass | [PodListMac.swift][r172] uses native frame/full-screen/window scenes; [LibraryCommands.swift][r173] offers New Window/Open in New Window; [light/03-episode-inspector][r174] / [dark/03-episode-inspector][r175], [light/11-playlist-settings][r176] / [dark/11-playlist-settings][r177] and [light/24-add-podcasts][r178] / [dark/24-add-podcasts][r179] show real frames, context titles and native dimming. Native title-bar dragging/double-click remain unmodified; there is no custom fullscreen or always-key selection painting. Runtime fullscreen/Dock reveal and cross-app inactive appearance were not re-exercised. |
| WIN-04 | pass | [PodListMac.swift][r172] uses native frame/full-screen/window scenes; [LibraryCommands.swift][r173] offers New Window/Open in New Window; [light/03-episode-inspector][r174] / [dark/03-episode-inspector][r175], [light/11-playlist-settings][r176] / [dark/11-playlist-settings][r177] and [light/24-add-podcasts][r178] / [dark/24-add-podcasts][r179] show real frames, context titles and native dimming. Native title-bar dragging/double-click remain unmodified; there is no custom fullscreen or always-key selection painting. Runtime fullscreen/Dock reveal and cross-app inactive appearance were not re-exercised. |
| WIN-05 | fail major | Owner-accepted bottom transport placement; see failure detail above. |
| WIN-06 | pass | [PodListMac.swift][r172] uses native frame/full-screen/window scenes; [LibraryCommands.swift][r173] offers New Window/Open in New Window; [light/03-episode-inspector][r174] / [dark/03-episode-inspector][r175], [light/11-playlist-settings][r176] / [dark/11-playlist-settings][r177] and [light/24-add-podcasts][r178] / [dark/24-add-podcasts][r179] show real frames, context titles and native dimming. Native title-bar dragging/double-click remain unmodified; there is no custom fullscreen or always-key selection painting. Runtime fullscreen/Dock reveal and cross-app inactive appearance were not re-exercised. |
| WIN-07 | pass | [PodListMac.swift][r172] uses native frame/full-screen/window scenes; [LibraryCommands.swift][r173] offers New Window/Open in New Window; [light/03-episode-inspector][r174] / [dark/03-episode-inspector][r175], [light/11-playlist-settings][r176] / [dark/11-playlist-settings][r177] and [light/24-add-podcasts][r178] / [dark/24-add-podcasts][r179] show real frames, context titles and native dimming. Native title-bar dragging/double-click remain unmodified; there is no custom fullscreen or always-key selection painting. Runtime fullscreen/Dock reveal and cross-app inactive appearance were not re-exercised. |
| WIN-08 | pass | [PodListMac.swift][r172] uses native frame/full-screen/window scenes; [LibraryCommands.swift][r173] offers New Window/Open in New Window; [light/03-episode-inspector][r174] / [dark/03-episode-inspector][r175], [light/11-playlist-settings][r176] / [dark/11-playlist-settings][r177] and [light/24-add-podcasts][r178] / [dark/24-add-podcasts][r179] show real frames, context titles and native dimming. Native title-bar dragging/double-click remain unmodified; there is no custom fullscreen or always-key selection painting. Runtime fullscreen/Dock reveal and cross-app inactive appearance were not re-exercised. |
| WIN-09 | pass | [PodListMac.swift][r172] uses native frame/full-screen/window scenes; [LibraryCommands.swift][r173] offers New Window/Open in New Window; [light/03-episode-inspector][r174] / [dark/03-episode-inspector][r175], [light/11-playlist-settings][r176] / [dark/11-playlist-settings][r177] and [light/24-add-podcasts][r178] / [dark/24-add-podcasts][r179] show real frames, context titles and native dimming. Native title-bar dragging/double-click remain unmodified; there is no custom fullscreen or always-key selection painting. Runtime fullscreen/Dock reveal and cross-app inactive appearance were not re-exercised. |
| WIN-10 | N/O | No live resizing recording, animation metrics or edge-grab exercise; still captures and minimum constraints cannot prove absence of blank frames or resize lag. |
| TOOL-01 | pass | [light/06-default-playlist][r180] / [dark/06-default-playlist][r181], [light/07-entry-inspector][r182] / [dark/07-entry-inspector][r183] and [light/18-podcast-market-hours][r184] / [dark/18-podcast-market-hours][r185] put title/navigation leading, section switching centrally, and related symbol actions/Search trailing; [MacWindow.swift][r186] uses native ToolbarItems and borderless symbols. State/task settings remain in the body; no competing colored primary-toolbar buttons. |
| TOOL-02 | N/O | Native overflow is available, but the fixed-size captured window never exercises overflow or proves essential trailing actions at minimum/tiled widths. |
| TOOL-03 | pass | [light/06-default-playlist][r180] / [dark/06-default-playlist][r181], [light/07-entry-inspector][r182] / [dark/07-entry-inspector][r183] and [light/18-podcast-market-hours][r184] / [dark/18-podcast-market-hours][r185] put title/navigation leading, section switching centrally, and related symbol actions/Search trailing; [MacWindow.swift][r186] uses native ToolbarItems and borderless symbols. State/task settings remain in the body; no competing colored primary-toolbar buttons. |
| TOOL-04 | pass | [light/06-default-playlist][r180] / [dark/06-default-playlist][r181], [light/07-entry-inspector][r182] / [dark/07-entry-inspector][r183] and [light/18-podcast-market-hours][r184] / [dark/18-podcast-market-hours][r185] put title/navigation leading, section switching centrally, and related symbol actions/Search trailing; [MacWindow.swift][r186] uses native ToolbarItems and borderless symbols. State/task settings remain in the body; no competing colored primary-toolbar buttons. |
| TOOL-05 | pass | [light/06-default-playlist][r180] / [dark/06-default-playlist][r181], [light/07-entry-inspector][r182] / [dark/07-entry-inspector][r183] and [light/18-podcast-market-hours][r184] / [dark/18-podcast-market-hours][r185] put title/navigation leading, section switching centrally, and related symbol actions/Search trailing; [MacWindow.swift][r186] uses native ToolbarItems and borderless symbols. State/task settings remain in the body; no competing colored primary-toolbar buttons. |
| SIDE-01 | pass | [light/01-subscriptions][r187] / [dark/01-subscriptions][r188] and [light/06-default-playlist][r189] / [dark/06-default-playlist][r190] show a leading shallow sidebar and thin native dividers; [MacWindow.swift][r191] uses native sidebar List metrics, explicitly excludes app text scaling from sidebar metrics, and keeps add/navigation routes reachable. No deep object hierarchy. |
| SIDE-02 | pass | [light/01-subscriptions][r187] / [dark/01-subscriptions][r188] and [light/06-default-playlist][r189] / [dark/06-default-playlist][r190] show a leading shallow sidebar and thin native dividers; [MacWindow.swift][r191] uses native sidebar List metrics, explicitly excludes app text scaling from sidebar metrics, and keeps add/navigation routes reachable. No deep object hierarchy. |
| SIDE-05 | pass | [light/01-subscriptions][r187] / [dark/01-subscriptions][r188] and [light/06-default-playlist][r189] / [dark/06-default-playlist][r190] show a leading shallow sidebar and thin native dividers; [MacWindow.swift][r191] uses native sidebar List metrics, explicitly excludes app text scaling from sidebar metrics, and keeps add/navigation routes reachable. No deep object hierarchy. |
| SIDE-06 | pass | [light/01-subscriptions][r187] / [dark/01-subscriptions][r188] and [light/06-default-playlist][r189] / [dark/06-default-playlist][r190] show a leading shallow sidebar and thin native dividers; [MacWindow.swift][r191] uses native sidebar List metrics, explicitly excludes app text scaling from sidebar metrics, and keeps add/navigation routes reachable. No deep object hierarchy. |
| SET-02 | pass | [light/27-settings-general-top][r192] / [dark/27-settings-general-top][r193] / [light/30-settings-automation][r194] / [dark/30-settings-automation][r195] show visible selected pane toolbar, pane-dependent 768/224 pt window heights and disabled zoom/minimize. [LibrarySettingsScreens.swift][r196] applies ordinary changes live; [ConnectionViews.swift][r197] uses the transient native Settings scene. System/Light/Dark defaults to System; no duplicate accessibility switches or startup reopen request. |
| SET-03 | pass | [light/27-settings-general-top][r192] / [dark/27-settings-general-top][r193] / [light/30-settings-automation][r194] / [dark/30-settings-automation][r195] show visible selected pane toolbar, pane-dependent 768/224 pt window heights and disabled zoom/minimize. [LibrarySettingsScreens.swift][r196] applies ordinary changes live; [ConnectionViews.swift][r197] uses the transient native Settings scene. System/Light/Dark defaults to System; no duplicate accessibility switches or startup reopen request. |
| SET-04 | fail minor | Pane titles are correct, but the last pane is volatile @State rather than retained across a relaunch; see failure detail above. |
| SET-05 | pass | [light/27-settings-general-top][r192] / [dark/27-settings-general-top][r193] / [light/30-settings-automation][r194] / [dark/30-settings-automation][r195] show visible selected pane toolbar, pane-dependent 768/224 pt window heights and disabled zoom/minimize. [LibrarySettingsScreens.swift][r196] applies ordinary changes live; [ConnectionViews.swift][r197] uses the transient native Settings scene. System/Light/Dark defaults to System; no duplicate accessibility switches or startup reopen request. |
| SET-06 | pass | [light/27-settings-general-top][r192] / [dark/27-settings-general-top][r193] / [light/30-settings-automation][r194] / [dark/30-settings-automation][r195] show visible selected pane toolbar, pane-dependent 768/224 pt window heights and disabled zoom/minimize. [LibrarySettingsScreens.swift][r196] applies ordinary changes live; [ConnectionViews.swift][r197] uses the transient native Settings scene. System/Light/Dark defaults to System; no duplicate accessibility switches or startup reopen request. |
| DLG-06 | pass | [PodListSheet.swift][r198] and [PlaylistSettingsViews.swift][r199] scope task sheets to a parent; [PodListMac.swift][r200] makes Add Podcasts and Now Playing independent modeless task windows, preserving Library work. [light/24-add-podcasts][r201] / [dark/24-add-podcasts][r202] / [light/26-now-playing][r203] / [dark/26-now-playing][r204] have noun/task titles and standard draggable frames. No floating inspector/palette needs floating-panel focus, inactivity or Mission Control semantics. |
| DLG-08 | pass | [PodListSheet.swift][r198] and [PlaylistSettingsViews.swift][r199] scope task sheets to a parent; [PodListMac.swift][r200] makes Add Podcasts and Now Playing independent modeless task windows, preserving Library work. [light/24-add-podcasts][r201] / [dark/24-add-podcasts][r202] / [light/26-now-playing][r203] / [dark/26-now-playing][r204] have noun/task titles and standard draggable frames. No floating inspector/palette needs floating-panel focus, inactivity or Mission Control semantics. |
| CTRL-01 | pass | [light/11-playlist-settings][r205] / [dark/11-playlist-settings][r206], [light/25-download-rules][r207] / [dark/25-download-rules][r208] and [light/30-settings-automation][r209] / [dark/30-settings-automation][r210] retain native checkbox/pop-up semantics; [PlaylistContentView.swift][r211] uses a single-selection three-part NSSegmentedControl for the Playlist inspector/toolbar section; two-pane Settings uses native tabs. |
| DATA-02 | N/A | No user-owned editable file documents or explicit-save document lifecycle. Library transactions and durable drafts are checked under DATA-01/04; exchange OPML does not create a document-window model. |
| DATA-03 | N/A | No user-owned editable file documents or explicit-save document lifecycle. Library transactions and durable drafts are checked under DATA-01/04; exchange OPML does not create a document-window model. |
| DATA-07 | pass | [LibrarySettingsScreens.swift:365][r212] uses NSOpenPanel/NSSavePanel with OPML purpose and PodList.opml default export name, native browsing/format/location/extension handling, and atomic export. Untitled naming applies to new documents, not this named export. |
| DATA-08 | N/A | No user-owned editable file documents or explicit-save document lifecycle. Library transactions and durable drafts are checked under DATA-01/04; exchange OPML does not create a document-window model. |
| DRAG-02 | pass | [EpisodeTransfer.swift][r213] declares private Episode data before URL/text fallbacks, preserves ordered multiselection, copies between Playlists, and samples Option during the native session. [PlaylistContentView.swift][r214] reorders within a Playlist; Option-copying an already-present Episode safely retains/selects the unique Entry. [LibraryDrops.swift][r215] accepts richest supported provider types and every provider. |
| DRAG-04 | pass | [EpisodeTransfer.swift][r213] declares private Episode data before URL/text fallbacks, preserves ordered multiselection, copies between Playlists, and samples Option during the native session. [PlaylistContentView.swift][r214] reorders within a Playlist; Option-copying an already-present Episode safely retains/selects the unique Entry. [LibraryDrops.swift][r215] accepts richest supported provider types and every provider. |
| DRAG-07 | N/O | Native drag APIs are used, but neither the captures nor application code settles threshold/image/reset cues, inactive-window pickup and one-motion selection behavior. |
| PTR-01 | pass | [MacWindow.swift][r216], [EpisodeEditingViews.swift][r217] and [PlaylistContentView.swift][r218] provide relevant source/row/Timeline context commands, roughly three functional groups, one submenu level and no displayed shortcuts in context mode. Menu-bar equivalents are preserved. |
| PTR-02 | pass | [MacWindow.swift][r216], [EpisodeEditingViews.swift][r217] and [PlaylistContentView.swift][r218] provide relevant source/row/Timeline context commands, roughly three functional groups, one submenu level and no displayed shortcuts in context mode. Menu-bar equivalents are preserved. |
| PTR-05 | N/O | Code targets context IDs rather than blindly replacing selection; the native context-target outline and preserved background selection are not visible in the supplied open-menu states (none were captured). |
| APPEAR-01 | pass | [light/03-episode-inspector][r219] / [dark/03-episode-inspector][r220] and [light/26-now-playing][r221] / [dark/26-now-playing][r222] show coherent Light/Dark functional materials; [MacAppearance.swift][r223] follows System by default, [AccentColor asset][r224] and [build-mac-app.sh:33][r225] honor Multicolor versus the user’s chosen accent. [MacGlass.swift][r226] uses regular glass only for controls/navigation, keeps content opaque, and avoids glass nesting. System toolbar/sidebar materials and scroll edges are not painted over. |
| APPEAR-02 | pass | [light/03-episode-inspector][r219] / [dark/03-episode-inspector][r220] and [light/26-now-playing][r221] / [dark/26-now-playing][r222] show coherent Light/Dark functional materials; [MacAppearance.swift][r223] follows System by default, [AccentColor asset][r224] and [build-mac-app.sh:33][r225] honor Multicolor versus the user’s chosen accent. [MacGlass.swift][r226] uses regular glass only for controls/navigation, keeps content opaque, and avoids glass nesting. System toolbar/sidebar materials and scroll edges are not painted over. |
| APPEAR-06 | pass | [light/03-episode-inspector][r219] / [dark/03-episode-inspector][r220] and [light/26-now-playing][r221] / [dark/26-now-playing][r222] show coherent Light/Dark functional materials; [MacAppearance.swift][r223] follows System by default, [AccentColor asset][r224] and [build-mac-app.sh:33][r225] honor Multicolor versus the user’s chosen accent. [MacGlass.swift][r226] uses regular glass only for controls/navigation, keeps content opaque, and avoids glass nesting. System toolbar/sidebar materials and scroll edges are not painted over. |
| APPEAR-07 | pass | [light/03-episode-inspector][r219] / [dark/03-episode-inspector][r220] and [light/26-now-playing][r221] / [dark/26-now-playing][r222] show coherent Light/Dark functional materials; [MacAppearance.swift][r223] follows System by default, [AccentColor asset][r224] and [build-mac-app.sh:33][r225] honor Multicolor versus the user’s chosen accent. [MacGlass.swift][r226] uses regular glass only for controls/navigation, keeps content opaque, and avoids glass nesting. System toolbar/sidebar materials and scroll edges are not painted over. |
| APPEAR-08 | pass | [light/03-episode-inspector][r219] / [dark/03-episode-inspector][r220] and [light/26-now-playing][r221] / [dark/26-now-playing][r222] show coherent Light/Dark functional materials; [MacAppearance.swift][r223] follows System by default, [AccentColor asset][r224] and [build-mac-app.sh:33][r225] honor Multicolor versus the user’s chosen accent. [MacGlass.swift][r226] uses regular glass only for controls/navigation, keeps content opaque, and avoids glass nesting. System toolbar/sidebar materials and scroll edges are not painted over. |
| TYPE-01 | pass | [MacTextSize.swift][r227] uses semantic SF roles; captured main row text is the Mac 13 pt body, secondary captions use 10–12 pt, and sheet titles use 17 pt title2. Large artwork initials are content, not oversized interface body text. |
| TYPE-04 | N/O | Native bezel/AX glyph frames are not reliable hit-region measurements. Some custom labels declare 28 pt regions, but no complete actual hit-test map exists for glass/native controls. Do not fail the 11 pt glyph frames in the Inspector as 11 pt targets. |
| AX-03 | pass | [MacTextSize.swift][r228] supplies 100–200% in 10% steps, View > Bigger/Smaller/Actual Size and Settings text sizing; tables become metadata-under-title reading rows; [PodListSheet.swift][r229] wraps/scrolls content. Code settles availability/adaptation; live large-text and narrow-window verification is outstanding. |
| SYS-01 | N/O | Semantic Episode/Playlist AppEntity queries, repeatable UndoableIntents, AppShortcuts, snippets and release-only donation policy are implemented in [AppIntents.swift][r230] and [IntentDonations.swift][r231]. [build-mac-app.sh][r232] packages metadata, but supplied evidence does not show discovery and execution in the installed Shortcuts/Siri UI. No AppleScript interface is claimed or required in addition. |
| SYS-02 | fail minor | See missing purpose-specific Service and stable in-app content link findings above. |
| SYS-03 | fail minor | See missing purpose-specific Service and stable in-app content link findings above. |
| SYS-04 | pass | [ShareLinks.swift][r233], [EpisodeInspector.swift][r234] and [LibraryCommands.swift][r235] use native ShareLink for validated HTTP(S) Episode/Podcast URLs; no false share target or custom replacement sharing menu. |
| SYS-05 | fail major | Spotlight indexing is absent; known owner-approved deferral to last. No Quick Look/thumbnail requirement for a proprietary document format exists here. |
| SYS-06 | N/A | No app-specific file-document, credential-filling or browser-extension workflow requires those extension technologies. Feed/OPML receiving is assessed under DRAG-01; the relevant selection-based Services gap is recorded once under SYS-02. |
| SYS-07 | N/A | No document-progress badge/tile preview is required by the current playback-only Dock role; no arbitrary decorative playing badge is imposed. System Now Playing integration is present in [SystemPlayback.swift][r236]. |
| EXTRA-01 | N/A | No menu bar extra or Dock/menu-bar dual-mode utility feature. |
| EXTRA-02 | N/A | No menu bar extra or Dock/menu-bar dual-mode utility feature. |
| EXTRA-03 | N/A | No menu bar extra or Dock/menu-bar dual-mode utility feature. |
| EXTRA-04 | N/A | No menu bar extra or Dock/menu-bar dual-mode utility feature. |
| FOOT-01 | N/O | No representative bundle/launch/idle resource comparison on stated comparable hardware; framework choice and VM tour duration do not establish stewardship. |

## Scores

The Strong-band scores reflect inspected craft above stock competent defaults, not a claim of exemplary behavior in unobserved states. Light and Dark share a score unless noted. Behavioral evidence combines source and supplied run artifacts; live assistive technology, timing, resizing and drag behavior remain partial.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.7** | Small deliberate semantic SF scale distinguishes Episode, Podcast and metadata throughout 03/07/16/18; tabular duration figures and wrapping titles serve scanning. Strong near Exemplary, held below 9 by authored punctuation gaps and unverified long-form reading measure. | hierarchy, craft, accessibility |
| Hierarchy | **8.6** | Source → table → Inspector order is immediate in 03/07/33; neutral reading surfaces and grouped glass controls make content primary. Compact Playlist section controls fit the title bar. Persistent player and large Inspector artwork remain noticeable competing shapes, so this is Strong rather than fully effortless Exemplary hierarchy. | content-first, hierarchy |
| Spacing & density | **8.5** | Shared table columns, 28 pt row-action regions, thin rules and approximately 54.5 pt two-line rows produce calm personal-tool density. Native sheets share 24 pt reading margins and a pinned footer; Settings/Automation size by content. At typical size it is deliberate, but generous player/empty-inspector space and absent minimum/tiled evidence keep it below 9. | craft, conventions |
| Color & contrast | **6.9** (Light visual **8.7**, Dark **6.9**) | Restrained semantic surfaces; opaque #606060 on white is 6.29:1, #A0A0A0 on a representative dark #262424 is 5.90:1; selected-row white/source Dark accent is 6.41:1. Native Dark Settings-tab text is 1.69:1. APPEAR-04 major caps the app category at Competent despite otherwise Strong visual color craft. | accessibility, color-restraint |
| Iconography | **8.8** | Coherent SF transport, star, share, rule, Trash and source-list vocabulary in 03/06/18/26; icon actions have specific source labels/help. Recognition is strong; repeated tiny row actions and the eraser for Clear on Played take some learning, preventing exemplary immediacy. | conventions, plain-language, craft |
| Consistency & polish | **8.5** (**stability N/O** Light/Dark; **partial: no measured flow run**) | Shared sheet/feedback components, consistent action regions, well-designed empty states and appearance pairs are Strong. The inventory has no demonstrated placement mismatch; large-text/minimum-window, intermediate frames and context target cues remain unverified. No stability-band limit is applied because the required sub-score is N/O. | craft, stability, conventions |
| Clarity | **8.8** | Filter summaries, explicit Current Entry/Position, destination picker, actionable empty states and Rewind’s “Kept” explanation make state and consequences legible. Domain capitalization/model complexity and icon-only secondary tools still need first-use learning; clear Strong, short of universal self-evidence. | plain-language, feedback, discoverable-commands |
| Platform fit | **6.9** (**partial behavioral verification**) | **Looks 8.8; Behaves 8.1; raw (8.8 + 2×8.1)/3 = 8.3.** Native frames/tables/Settings, full menu index, modeless windows and scoped native text behavior exceed generic Competent craft. WIN-05 and SYS-05 majors cap final score at 6.9; incomplete Help Book, links and Services also keep behavior from Exemplary. Detailed signals below. | conventions, discoverable-commands, stability |
| Interaction & feedback | **6.9** (**partial: code + supplied tour; no latency measurements**) | Named multi-step Undo, durable drafts, serialized edits, import/download cancellation, scoped shortcuts/type selection, context actions and native sharing support a Strong raw assessment of **8.3**. Slow drop preparation omits destination placeholders (DRAG-06), so the major cap forces 6.9. FKA, VoiceOver and timing are explicitly N/O. | keyboard-efficiency, forgiveness, feedback, direct-manipulation |
| **Overall** | **8.5 / 10** | A coherent, useful personal Mac podcast client with deliberate visual hierarchy and substantial native behavior. Most holds up at typical size; accepted contrast/transport departures, unfinished system entry points and incomplete slow-drop feedback prevent 9.0. Holistic Strong judgment, not an average. Lowest category 6.9 → Overall ceiling **8.9**; 8.5 respects it. | content-first, conventions, craft |

### Platform signals

These are implementation/evidence verdicts, not an invented live comparison. A Native/Adapted signal does not imply every runtime clause passed; the checklist above carries the N/O limits.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Frame | Native | Real WindowGroup/Window frames and traffic lights; 01, 24, 26. |
| L2 Type | Native | SF semantic Mac sizes; 03/16/27. |
| L3 Controls | Native | Native checkbox/pop-up/default buttons and NSSegmentedControl; 11/25/30. |
| L4 Menus/popovers | Native | System menu export; native context menu declarations, not painted web menus. |
| L5 Shortcut notation | Native | Native key equivalents and ordered glyph notation in KeyboardShortcuts/Help. |
| L6 Sidebar/selection | Native | Native leading sidebar and inherited system selection; Multicolor asset honors system accent. |
| L7 Symbols | Native | SF Symbols with task-specific labels. |
| L8 Settings | Native, contrast defect | Separate live Settings panes, with accepted low-contrast selected label in Dark. |
| L9 Density | Adapted | Deliberate two-line podcast rows and rich Inspector, suited to personal collection scanning. |
| L10 Materials | Adapted | Functional regular glass and opaque accessibility fallback; content remains a reading/table surface. |
| L11 Appearance | Native | System default plus app Light/Dark override. |
| B1 Menus | Native | Complete app-domain commands and disabled items retained; local dialog buttons keep dialog grammar. |
| B2 Settings | Native | App Settings scene and ⌘,. |
| B3 Shortcuts | Adapted | Command families, documented scoped Space/Return, text/sheet guards. |
| B4 Text | Native implementation; Services N/O | Native text fields/interpreted text events and native text-editing commands; no live Services claim. |
| B5 Keyboard/lists | Adapted, partial | Type-select implementation and supplied Episode assertion pass; full traversal/scroll matrix N/O. |
| B6 Context menus | Native implementation, target outline N/O | Per-selection menu handlers and command equivalents; no open-context captures. |
| B7 Windows/state | Adapted; one Foreign placement | Multiple Library windows, native full screen and serialized context; WIN-05 bottom transport is Foreign under this standard, owner-accepted. |
| B8 Drag/drop | Adapted, incomplete | Rich transfers and Undo exist; DRAG-06 placeholder gap; live cues/one-motion pickup unverified. |
| B9 System integration | Adapted, incomplete | Native sharing/system playback and implemented App Intents; Shortcuts runtime N/O; missing Spotlight (major), Services/links (minor). |
| B10 Undo/help | Adapted | Named multistep Undo and task Help, but no Help Book topics and no offscreen inverse reveal. |
| B11 Footprint | N/O | No workload-comparable resource or smoothness data. |

### What stands between this build and 9.0

The rubric’s arithmetic prevents a 9.0 Overall while any category remains 6.9: **6.9 + 2.0 = 8.9**. The owner-accepted WIN-05 and Dark APPEAR-04 caps remain even after actionable defects are fixed. Removing the slow-drop omission and eventually adding Spotlight improves the build, but does not remove those accepted caps. This report does not recommend changing the fixed bottom-player or Dark-accent decisions to chase a number.

Beyond that ceiling, the remaining craft work is concrete: a visible pending drop at its destination; purposeful external entry points (stable app links and an Add Podcast Service); actual Help Book topics; persistent last Settings pane and truthful sidebar menu state; visible undo recovery; finished punctuation/About metadata. A reference-level behavioral claim also needs the permitted future evidence: minimum/tiled/enlarged-text and accessibility appearances, live FKA/VoiceOver including blank-XCUI-label associations, native drag/context behavior, relaunch, and the standard’s reproducible delayed/timed flow metrics. N/O items are verification work, not fabricated failures.

## Next step

**Target:** DRAG-06, the actionable major on the primary Episode → Playlist workflow. WIN-05/APPEAR-04 are accepted; SYS-05 remains last per the owner’s explicit sequence.

**Anti-pattern:** No exact named catalog entry fully fits. The relevant contrast is **INTER-08, “A drag predicts its result”**: preparation feedback should show the destination as well as the work being performed. Things would preserve the item’s identity through the move; BBEdit would retain explicit recoverability rather than rely on a generic busy indicator.

**Root cause:** The transfer path has a global preparation counter but no presentation model for a pending destination Entry. The only list model is committed Library state, so a network-dependent drop has nothing to render in the destination until all preparation ends.

**Candidate 1 (recommended):** Add a transient pending-drop batch with stable IDs, titles, destination Playlist and insertion anchor. Insert its visible pending row(s) immediately at the destination; reuse the progress counter there; resolve each into committed Entries or a persistent failed-row Retry state. Keep pending rows out of persisted Playlist/history data. On success, select/reveal the actual committed IDs. Preserve native autoscroll and verify it separately. **Expected effect:** Interaction & feedback can leave its 6.9 cap once DRAG-06 is verified; clarity and perceived stability improve. **Risk:** pending/committed duplication or jumping rows, mitigated by replacing one stable presentation identity after commit. **Character:** compact ruled Playlist rows and Episode/Entry semantics survive.

**Candidate 2:** If per-Episode placeholders are disproportionate, show one title-bearing batch placeholder at the drop insertion anchor immediately, with the count and progress, then replace it with the ordered committed Entries. Same principle and expected cap removal; less per-Episode detail, fewer transient rows. Do not substitute another global spinner, because that does not fix the missing destination placeholder.

**Validation when authorized on the capture VM:** Delay publisher-Episode preparation by 2 seconds; drop multiple Episodes into a scrolled Playlist in both appearances, at minimum/tiled/typical widths. Record insertion/placeholder geometry, progress, autoscroll, destination selection, partial failure/Retry and named Undo/Redo. Run the required five timing passes without injected delay. Follow with the explicitly listed accessibility/flow evidence gaps; keep Spotlight last. No app was run and no implementation candidate was applied in this review.

## Log

Single independent audit; no UI iteration or before/after change. Baseline is the supplied round-11 build at 131bdf3. Signature elements remain **kept**: shallow source list, Episode/Entry semantics, ruled tables/Inspector, Multicolor blue, glass bottom player. No character drift or code changes. Report completeness and checklist arithmetic are checked mechanically; app quality gates are not rerun for this documentation-only task.

<!-- Evidence links: absolute workspace/evidence locations for review. -->
[r1]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift:137>
[r2]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ViewEditorScreen.swift>
[r3]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryEditingModel.swift:258>
[r4]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeInspector.swift>
[r5]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r6]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/08-history.png>
[r7]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/08-history.png>
[r8]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/14-trash.png>
[r9]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/14-trash.png>
[r10]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodListSheet.swift>
[r11]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/13-new-playlist.png>
[r12]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/13-new-playlist.png>
[r13]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/16-edit-view.png>
[r14]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/16-edit-view.png>
[r15]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/23-add-to-playlist.png>
[r16]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/23-add-to-playlist.png>
[r17]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/25-download-rules.png>
[r18]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/25-download-rules.png>
[r19]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift>
[r20]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacTextSize.swift>
[r21]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift:76>
[r22]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaybackCommands.swift>
[r23]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift>
[r24]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodListSheet.swift>
[r25]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaybackCommands.swift>
[r26]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/34-rewind-summary.png>
[r27]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/34-rewind-summary.png>
[r28]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/11-playlist-settings.png>
[r29]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/11-playlist-settings.png>
[r30]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/16-edit-view.png>
[r31]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/16-edit-view.png>
[r32]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/23-add-to-playlist.png>
[r33]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/23-add-to-playlist.png>
[r34]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/11-playlist-settings.png>
[r35]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/11-playlist-settings.png>
[r36]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/30-settings-automation.png>
[r37]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/30-settings-automation.png>
[r38]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/13-new-playlist.png>
[r39]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/13-new-playlist.png>
[r40]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/17-new-view.png>
[r41]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/17-new-view.png>
[r42]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/24-add-podcasts.png>
[r43]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/24-add-podcasts.png>
[r44]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodListSheet.swift>
[r45]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/FormNumbers.swift>
[r46]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ViewEditorScreen.swift>
[r47]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift>
[r48]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacAppearance.swift>
[r49]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacGlass.swift>
[r50]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[r51]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlayerViews.swift>
[r52]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/15-search-rice.png>
[r53]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/15-search-rice.png>
[r54]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r55]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/OPMLImportContent.swift>
[r56]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/DownloadViews.swift>
[r57]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeTransfer.swift>
[r58]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/03-episode-inspector.png>
[r59]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/03-episode-inspector.png>
[r60]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r61]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r62]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/18-podcast-market-hours.png>
[r63]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/18-podcast-market-hours.png>
[r64]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r65]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodcastScreens.swift>
[r66]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/03-episode-inspector.png>
[r67]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/03-episode-inspector.png>
[r68]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r69]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r70]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/33-multi-selection.png>
[r71]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/33-multi-selection.png>
[r72]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacRowScroll.swift>
[r73]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/UITour/PodListUITour.swift>
[r74]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/xcodebuild.log:3821>
[r75]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift>
[r76]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryEditingModel.swift>
[r77]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift>
[r78]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[r79]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/WindowRestoration.swift>
[r80]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r81]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacRowScroll.swift>
[r82]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeTransfer.swift>
[r83]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryDrops.swift>
[r84]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistContentView.swift>
[r85]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistContentView.swift>
[r86]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r87]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacIconLabel.swift>
[r88]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeInspector.swift>
[r89]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlayerViews.swift>
[r90]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacGlass.swift>
[r91]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacAppearance.swift>
[r92]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Resources/MacAssets.xcassets/AccentColor.colorset/Contents.json>
[r93]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/03-episode-inspector.png>
[r94]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/03-episode-inspector.png>
[r95]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/18-podcast-market-hours.png>
[r96]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/18-podcast-market-hours.png>
[r97]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/26-now-playing.png>
[r98]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/26-now-playing.png>
[r99]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacGlass.swift>
[r100]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacTextSize.swift>
[r101]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacTextSize.swift>
[r102]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodListSheet.swift>
[r103]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeInspector.swift>
[r104]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacAppearance.swift>
[r105]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/08-history.png>
[r106]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/08-history.png>
[r107]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/14-trash.png>
[r108]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/14-trash.png>
[r109]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/24-add-podcasts.png>
[r110]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/24-add-podcasts.png>
[r111]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/31-listening-stats.png>
[r112]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/31-listening-stats.png>
[r113]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/FailureMessages.swift>
[r114]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r115]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r116]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/20-unsubscribe-armed.png>
[r117]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/20-unsubscribe-armed.png>
[r118]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/FailureFeedback.swift>
[r119]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlayerViews.swift>
[r120]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/SystemPlayback.swift>
[r121]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/DownloadViews.swift>
[r122]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r123]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift>
[r124]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryEditingModel.swift>
[r125]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/32-getting-started.png>
[r126]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/32-getting-started.png>
[r127]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift>
[r128]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/30-settings-automation.png>
[r129]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/30-settings-automation.png>
[r130]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift>
[r131]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[r132]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/SelectionCommands.swift>
[r133]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ShareLinks.swift>
[r134]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r135]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r136]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r137]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r138]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/03-episode-inspector.png>
[r139]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/03-episode-inspector.png>
[r140]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/33-multi-selection.png>
[r141]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/33-multi-selection.png>
[r142]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/27-settings-general-top.png>
[r143]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/27-settings-general-top.png>
[r144]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/30-settings-automation.png>
[r145]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/30-settings-automation.png>
[r146]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/11-playlist-settings.png>
[r147]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/11-playlist-settings.png>
[r148]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/22-subscription-settings.png>
[r149]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/22-subscription-settings.png>
[r150]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r151]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryCommands.swift>
[r152]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[r153]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaybackCommands.swift>
[r154]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MenuCommandActions.swift>
[r155]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r156]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r157]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r158]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/27-settings-general-top.png>
[r159]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/27-settings-general-top.png>
[r160]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r161]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r162]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r163]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[r164]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryCommands.swift>
[r165]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r166]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r167]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift:76>
[r168]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift>
[r169]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaybackCommands.swift>
[r170]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift:76>
[r171]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaybackCommands.swift>
[r172]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r173]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryCommands.swift>
[r174]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/03-episode-inspector.png>
[r175]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/03-episode-inspector.png>
[r176]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/11-playlist-settings.png>
[r177]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/11-playlist-settings.png>
[r178]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/24-add-podcasts.png>
[r179]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/24-add-podcasts.png>
[r180]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r181]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r182]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/07-entry-inspector.png>
[r183]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/07-entry-inspector.png>
[r184]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/18-podcast-market-hours.png>
[r185]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/18-podcast-market-hours.png>
[r186]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r187]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/01-subscriptions.png>
[r188]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/01-subscriptions.png>
[r189]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r190]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r191]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r192]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/27-settings-general-top.png>
[r193]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/27-settings-general-top.png>
[r194]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/30-settings-automation.png>
[r195]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/30-settings-automation.png>
[r196]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift>
[r197]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift>
[r198]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodListSheet.swift>
[r199]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift>
[r200]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r201]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/24-add-podcasts.png>
[r202]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/24-add-podcasts.png>
[r203]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/26-now-playing.png>
[r204]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/26-now-playing.png>
[r205]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/11-playlist-settings.png>
[r206]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/11-playlist-settings.png>
[r207]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/25-download-rules.png>
[r208]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/25-download-rules.png>
[r209]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/30-settings-automation.png>
[r210]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/30-settings-automation.png>
[r211]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistContentView.swift>
[r212]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:365>
[r213]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeTransfer.swift>
[r214]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistContentView.swift>
[r215]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryDrops.swift>
[r216]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift>
[r217]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[r218]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistContentView.swift>
[r219]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/03-episode-inspector.png>
[r220]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/03-episode-inspector.png>
[r221]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/26-now-playing.png>
[r222]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/26-now-playing.png>
[r223]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacAppearance.swift>
[r224]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Resources/MacAssets.xcassets/AccentColor.colorset/Contents.json>
[r225]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/scripts/build-mac-app.sh:33>
[r226]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacGlass.swift>
[r227]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacTextSize.swift>
[r228]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacTextSize.swift>
[r229]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodListSheet.swift>
[r230]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/AppIntents.swift>
[r231]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/IntentDonations.swift>
[r232]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/scripts/build-mac-app.sh>
[r233]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ShareLinks.swift>
[r234]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeInspector.swift>
[r235]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibraryCommands.swift>
[r236]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/SystemPlayback.swift>
[r237]: </Users/sarvagnan/Documents/UI_Guidelines/examples/screenshots/things/02-project-headings.png>
[r238]: </Users/sarvagnan/Documents/podlist-grading/brief-mac-round-11.md>
[r239]: </Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md>
[r240]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/README.md>
[r241]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/xcodebuild.log:3821>
[r242]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/03-episode-inspector.txt>
[r243]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/UITour/PodListUITour.swift>
[r244]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/EpisodeTransfer.swift:87>
[r245]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PodcastScreens.swift:6>
[r246]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistContentView.swift:46>
[r247]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r248]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r249]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r250]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r251]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/26-now-playing.png>
[r252]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/26-now-playing.png>
[r253]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift:204>
[r254]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/30-settings-automation.png>
[r255]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift:61>
[r256]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Resources/MacAssets.xcassets/AccentColor.colorset/Contents.json>
[r257]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r258]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r259]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/scripts/build-mac-app.sh:20>
[r260]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r261]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift:76>
[r262]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/scripts/build-mac-app.sh:20>
[r263]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/33-multi-selection.png>
[r264]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/33-multi-selection.txt>
[r265]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/menus.txt>
[r266]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/UITour/PodListUITour.swift:345>
[r267]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift:36>
[r268]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/30-settings-automation.png>
[r269]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/30-settings-automation.png>
[r270]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ConnectionViews.swift:57>
[r271]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:110>
[r272]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacWindow.swift:616>
[r273]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/MacRowScroll.swift>
[r274]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/scripts/build-mac-app.sh:20>
[r275]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/ShareLinks.swift>
[r276]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListMac/PodListMac.swift>
[r277]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/scripts/build-mac-app.sh:20>
[r278]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/06-default-playlist.png>
[r279]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/06-default-playlist.png>
[r280]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/light/31-listening-stats.png>
[r281]: </Users/sarvagnan/Documents/podlist-grading/mac-round-11/dark/31-listening-stats.png>
[r282]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-e2d7ed02-e7f9dd25f5d6d40f/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:317>
