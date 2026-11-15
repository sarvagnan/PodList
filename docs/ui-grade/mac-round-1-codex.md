# PodList — native Mac UI audit, round 1 (Codex)

Reviewed 13 November 2026 at **1d0e63c**, independently of prior PodList grades. Only the requested report was added in the worktree; its requested copy and review aids were written under the specified scratch paths. No application code, tests or configuration changed, no commit was made, and no app/UI was launched, driven or captured.

## Frame

- **Task:** Find Episodes in Views or Search, add them to Playlists, and listen while preserving each Playlist’s independent Position; manage Subscriptions and local downloads along the way.
- **Target:** **Native Mac app**, SwiftUI on macOS 26+. Audited against the guide’s core and Mac checklists, plus platform-fit § Mac; no web-toolkit exemptions.
- **Posture:** Sovereign personal listening/collection workspace with background playback; Add, Rename, Rewind and Now Playing are transient tasks.
- **Audience:** Newcomers and perpetual intermediates, including keyboard and assistive-input users.
- **Nearest exemplar:** Things for calm personal-list hierarchy and a small semantic type scale; BBEdit for command coverage and reliable working context. Mimestream’s three-plane list/detail composition is a useful secondary comparison, without copying its palette or density.
- **Character:** (1) owner-fixed layout B: Views/Playlists/Library sidebar, middle list, right Inspector and bottom player; (2) owner-fixed system type and PodList blue #2b50c8; (3) independent Playlist Positions and named Entries; (4) owner-fixed isolated large Inspector Play above five small action icons; (5) text-led, reversible operations with Trash and a reserved status row.

**Owner decisions preserved in grading:** Both light/dark appearances; the player’s Episode/podcast names above seeking; Now Playing as a sheet; immediate Playlist deletion with named Trash/Undo feedback; armed two-click Unsubscribe, automatic disarming and staying on the Podcast page; explicit Rename with Cancel/Save; case-insensitive unique names; Entries/History/Listening Timeline segments; Rewind preview; reserved status/Undo space; OPML in Settings and File; MCP opt-in in Settings › Automation with App Intents always available; Getting started until the first Subscription. These are assessed, not redesign invitations. The fixed accent and bottom player explicitly conflict with APPEAR-02/WIN-05; their caps remain, and neither is the next-step target. The segmented Playlist subsection and large styled Play are legitimate adaptations of the selected layout and hierarchy, not automatic touch-UI failures.

**Evidence key.** `Lnn`/`Dnn` mean the matching PNG **and** `.txt` AX tree in `light/`/`dark/` under `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/mac-grade-1/`. All supplied pairs 01–34, including 34a, were inspected. Captures are 2360×1520 pixels at 2×, nominally 1180×760 points; the separate Settings/stats windows have their own frames. `menus.txt` is the supplied menu dump. The README identifies capture build 33f92f4 and the graded 1d0e63c as nonvisual fixes. Capture evidence therefore establishes the presented build states; code at 1d0e63c supplies current behavior.

Code filenames without directories below are under `apps/apple/Sources/PodListUI/`, except `PodListMac.swift` and `AppIntents.swift` under `apps/apple/Sources/PodListMac/`, `EditHistory.swift` under `apps/apple/Sources/PodListDomain/`, and `build-mac-app.sh` under `apps/apple/scripts/`. CONTEXT.md, docs/design/mac.md, docs/design/product-behaviour.md and ADRs 0011/0012 informed task/architecture interpretation, not proof of implemented behavior.

**Calibration:** Opened the guide’s Things project/General Settings and Mimestream dark inbox images and read their gallery/grades. PodList matches their shallow source-list → content structure, restrained type family and thin dividers; it falls short on dark secondary/action legibility, content allocation and commands. The guide’s local gallery has no same-kind current Apple Mac capture for the requested Apple-app side-by-side; that comparison is not fabricated, and no Mac UI was driven to obtain one. The platform signal table below is grounded in supplied captures, menu facts and code instead.

## Flows

**Tasks run:** none. The brief prohibits running the app and supplies no Mac scripted flow. This is an evidence-limited full audit, not a claim of tested end-to-end behavior.

**Widths/appearances:** supplied typical Library size 1180×760 points, Light and Dark; no minimum 760×500, half-display, text-enlarged, Increase Contrast or Reduce Transparency set. **Timed runs/device:** none; source captures say macOS 26 on a Retina MacBook, but no five-run latency/scrolling measurements. **Script / measurements file / screenshot strips:** none supplied or generated. Contact sheets and pixel samples of existing images were prepared only under the requested `grade-mac-1-codex/` scratch directory; they are not flow strips or new app screenshots.

**Stability judgment:** The fixed 32-point EditingFeedback row, durable drafts, stale-search cancellation and locally persisted edits are good safeguards in code. Captures show a different vertical anchor in empty History versus Entries, duplicate status rows on the Podcast page and clipped General Settings guidance. These support a partial craft judgment and validation priorities, not a timed claim of stable focus/input/geometry. **Stability sub-score: N/O in both appearances**, as rubric §6 requires without a flow run; no stability band cap is invented. Consistency & polish is marked partial. FLOW-01–04/06–07 and RESP-01 remain N/O where the static evidence cannot establish the whole check. FLOW-05 is inapplicable.

**Flow failures:** none asserted from nonexistent measurements. Unverified does not mean pass. A future run should cover Search/create View while a save is pending, first Subscription introduction dismissal, delete/Undo, Unsubscribe/Undo/error, reorder/Undo, Rewind, import continuation, player/Now Playing/detail/Add/Playlist return, keyboard traversal and narrow widths. L33’s purported Select All capture still reports “1 selected”; it does not demonstrate successful multiselection or establish the cause of that discrepancy.

## Cross-screen inventory

`Reserved` means the same EditingFeedback implementation, 32 pt, secondary status text and named Undo/Redo; red errors. `None shown` means the capture has no such message, not proof that the state is impossible. Code-derived behavior is explicitly marked C.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / Starred / All Views (02–05) | Reserved, none shown | Reserved red (C) | None | Reserved named (C) | No matching Episodes / New View route (C) | Sync strip above reserved row | Rows/toolbar, top; All Views opens named row | Filter summary under status |
| Episode Inspector / selection toolbar (03/07/33) | Main window’s reserved row (C) | Main row; download text below actions (C) | Add opens sheet | Main named Undo (C) | Centered Select an Episode | Details-pending-sync text (C) | Isolated blue Play then five icons | Facts, Playlist Positions, show notes |
| Playlist Entries (06/07/10) | Reserved top (C) | Reserved top red (C) | None | Reserved named (C) | No Entries + Find Episodes; past-end explanation (C) | None shown | Segment row + Play this Playlist | Current Entry caption |
| History (08) | Reserved row, vertically centered with short content | Same reserved row (C) | None | Same named control (C) | Centered No History explaining playback-only facts | None shown | Play this Playlist beside segments, also shifted down | Empty-state explanation |
| Timeline (09/34a) | Reserved top (C) | Reserved red (C) | Rewind opens preview | Reserved named (C) | No Listening Timeline with begin-listening advice (C) | None shown | Per-row Rewind to Here, trailing | Dates, event descriptions |
| Rewind summary (34) | Returns to Entries after success (C) | Inline above footer, red (C) | Target/Position, Unplayed, restored Entries, Kept | Shared Rewind Undo after close (C) | None in shown preview | Moment unavailable branch (C) | Footer trailing Rewind / leading Cancel | Exact consequence text |
| Playlist Settings / Rename (11/12) | Own reserved row (C) | Own reserved red row (C) | Explicit Rename input | Own named row (C) | Playlist unavailable branch (C) | Default cannot be renamed/deleted text (C) | Save beside Cancel Rename; Done bottom-right | Clear on Played / Trash retention notes |
| New Playlist (13) | Close and navigate on create (C) | Own reserved row (C) | Name + validation below | Own named row (C) | Empty name prompt | Duplicate/empty validation (C) | Bottom-right Create Playlist | Enter a Playlist name |
| Add to Playlist (23) | Sheet closes; main reserved row (C) | Own reserved row (C) | Destination picker; optional new name | Own named row (C) | None | Invalid target/name (C) | Bottom-right Play Next; Now/Last adjacent | Active destination label |
| Trash (14) | Main reserved row (C) | Main reserved red (C) | None | Named Restore/Trash reversal (C) | Centered Trash is empty | None shown | Restore on each row (C) | Retention sentence above |
| Library Search (15) | Main reserved row (C) | Main row; Create View error below naming input (C) | Create View naming inline (C) | Main named row (C) | Episode empty state with Search change route (C) | None shown | Toolbar Search; Create View trailing above table | Result count |
| View editor / New View (16/17) | Done closes; live matching count (C) | Red footer above actions (C) | Rename Cancel/Save inline | Undo edit at footer (C) | None | Invalid field text, not field-local (C) | Footer trailing Done, Cancel beside | All conditions must match; count top-right |
| Podcast page / description / Unsubscribe (18–21) | Main top reserved AND page-bottom reserved (C) | Fetch error near header; edit error in both rows (C) | Armed green Unsubscribe replaces Subscribed for 4 seconds | Both reserved rows (C) | No Episodes yet / No matches with clear/refresh (C) | Reading Episodes (C) | Subscribe in header; Episodes below | Description; per-Device rule |
| Subscription Settings (22) | Own reserved row (C) | Own reserved red row (C) | None | Own named row (C) | None | None shown | Live changes; Done bottom-right | Inherit/default explanation |
| Add podcasts (24) | Reserved bottom (C) | Search error under input; subscription error bottom (C) | None | Reserved bottom (C) | No podcasts found after Search (C); blank before Search | Finding podcasts spinner (C) | Search beside top input; Done bottom-right | OPML help under input |
| Download Rules (25) | No sheet: action is correctly disabled at zero selected | None shown | None | Main reserved (C) | Existing Library still visible | Disabled count-labelled action | Bulk sheet Apply bottom-right when selected (C) | Grouped by Download Rule |
| Now Playing (26) | Playback state in place (C) | Near transport + Retry (C) | Episode detail/inner Add step (C) | Domain edits through main history (C) | No current Entry (C) | None shown | Transport under seek; Done top-right | Episode/Playlist routes and Chapters (C) |
| Settings General (27–29) | None local for global saves | No local edit failure row; connection errors elsewhere in Form (C) | OPML preview/import summary (C) | Edit menu history; no local row | Import instruction always rendered | Import count/results (C) | Live preference controls; Import/Export buttons | Import continuation note clipped to one line in captures |
| Settings Automation (30) | Toggle state | Inline MCP error + retry (C) | None | None | Disabled-by-default off state | Warning about same-user apps accessing Library | Enable MCP server | App Intents always available; config when on (C) |
| Listening stats (31) | None | None shown | None | None | Begin Listening log when no facts (C) | No Library branch (C) | Chart/table toggle | Explanatory log text; streak and totals |
| Getting started reopened (32) | None | None | Introductory statements, not tasks | None | Not a task checklist | None | Dismiss top-right; File Add Podcasts route | Three points with explicit next actions |

**Inventory mismatches and craft consequences:**

1. The Podcast page duplicates the global status/Undo row: L18/D18 trees put Edit status at `[517,303 645×32]` and `[535,934 609×32]`. This repeats feedback and spends space needed by Episode titles. Keep the single owner-required reserved row in one location.
2. Empty History’s **status and segment/action block sit much lower** than Entries. L08’s Up to date starts at y479 and segment control at y543; ordinary content starts just below the title bar in L06. This is a static alignment mismatch caused by content-dependent vertical sizing; it is not asserted as a FLOW-01 measurement. Top-anchor the Playlist content stack and let only the empty-state area fill the remaining space.
3. General Settings omits local edit feedback while Subscription Settings and sheets have it. That is the COPY-02 failure; adding the same reserved row would align the family.
4. Footer conventions mostly hold for input commits, but New Playlist/Add new-Playlist inputs lack the separate label found in View/Playlist Rename. This is CTRL-03 rather than a second count of the same defect.
5. Active color and appearance differ by scene: Dark stats stays Light; General Settings uses native accent controls while Library applies fixed blue. The former is APPEAR-01; the latter also weakens the sense of one finished app.

## Checklist

Coverage: **63.4%** (pass **60** · fail **30** · N/O **52** · N/A **25**). Denominator: pass + fail + N/O = 142; numerator: pass + fail = 90. All **167** current checklist IDs occur exactly once in the verdict tables.

Failures by severity: **2 blocker · 21 major · 7 minor**. A failure is counted by ID once; supporting examples within it are not extra failures. “Pass” is scoped to the implemented feature/clauses, never a live-performance certification.

### Core checklist

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No flow-run measurements of core edges. |
| FLOW-02 | N/O | No focus/scroll trace or running-app observation. |
| FLOW-03 | N/O | Search cancels stale requests and checks submitted query (PodcastScreens.swift:65); this does not settle all late save/sync races in editable Views/Search-created Views. |
| FLOW-04 | N/O | Feedback is visible at the supplied typical size, but no minimum/half-display or asynchronous follow-up run is available. |
| FLOW-05 | N/A | No paired comparison/form-preview panels; the source list, content list and Inspector have deliberately different roles. |
| FLOW-06 | N/O | Stills cover useful populated/empty states, but do not settle vanishing blocks during typing/import or every unshown empty section. |
| FLOW-07 | N/O | Main sheet commits are generally trailing-bottom; no width set or flow strip settles every sibling state. Playlist History’s different vertical anchoring is recorded in the inventory. |
| KEY-01 | N/O | Native Lists, Tables and Buttons plus command routes are present; Full Keyboard Access and absence of traps were not exercised. |
| KEY-04 | N/O | New Playlist/Add capture focused fields; reverse traversal and all newly opened/renamed inputs remain untested. |
| KEY-06 | N/O | No international-layout run; menu key equivalents alone do not prove every layout. |
| KEY-07 | N/O | Native scrolling is used, but Page/Home/End and Space interactions with the app-wide playback binding were not exercised. |
| KEY-08 | fail | **minor** — Help lacks a usable shortcut reference. See failure detail below. |
| DLG-01 | pass | Playlist deletion is immediate with Trash/Undo; Unsubscribe uses its armed control; no routine alert is emitted (PlaylistEditingModel.swift; PodcastScreens.swift). |
| DLG-02 | N/A | No app alert title; tasks use sheets and in-context error text. |
| DLG-03 | N/A | No app alert buttons. |
| DLG-04 | fail | **major** — Command-period does not cancel sheet input tasks. See failure detail below. |
| DLG-05 | N/A | No unexpected destructive alert or Empty Trash command; sheet Delete has destructive role and is not the default. |
| DLG-07 | pass | Captured input sheets use Cancel/commit; Now Playing uses Done/Back for detail. No Cancel/Done/Back triple is emitted. |
| DLG-09 | N/A | No app-authored rich popover work; native command menus are not draft-editing popovers. |
| CTRL-02 | N/A | No parent/child checkbox hierarchy. |
| CTRL-03 | fail | **major** — Several input fields have only disappearing placeholders. See failure detail below. |
| CTRL-04 | fail | **major** — Numeric entry ignores the person’s locale. See failure detail below. |
| CTRL-05 | N/O | The custom circular Play uses plain style; a still cannot establish its pressed-state rendering. |
| CTRL-06 | pass | Episode Actions groups playback and marks, with frequent actions also visible; Speed/Sleep are related choices (EpisodeEditingViews.swift; PlayerViews.swift). |
| CTRL-07 | pass | Toolbar prompts distinguish Search Library/Search this list/Search Episodes; Add names podcast/feed scope. No displayed search history (L15/L18/L24). |
| CTRL-08 | pass | Downloads expose fraction/cancel/retry; OPML counts completed/total and journals progress so leaving/relaunching preserves work; network searches use indeterminate progress (DownloadViews.swift; LibraryEditingModel.swift). |
| LIST-01 | pass | Episode/Entry columns use native Table; Subscription sections and navigation use native Lists. No false multi-column outline (L01/L03/L06). |
| LIST-02 | pass | Episode, Published, Length, State and Entry/Position are concise title-case noun headings; other lists have contextual titles. |
| LIST-03 | pass | View and Podcast tables bind native sortOrder/value comparators and declare resizable widths; Playlist order deliberately is not column sorting (MacWindow.swift:311; PodcastScreens.swift:171). |
| LIST-04 | pass | Thin row rules and aligned numeric columns track the modest-density tables; names are titles, not file paths. No filename middle-ellipsis obligation. |
| LIST-05 | N/O | No app hierarchy with descendants; persistence of system sidebar Section collapse was not observed. |
| LIST-06 | pass | Tagged navigation/content selections use native selection; segmented choices show current values. All Views exception is owned once by SIDE-04. |
| LIST-07 | N/O | Native Table primaryAction and Subscription List primaryAction exist; type-select, immediate keyboard focus and History interactions require running evidence. |
| DATA-01 | pass | PlaylistDrafts and LibraryEditingModel persist drafts in UserDefaults per Library; edits commit to local database, file export is atomic, View cancellation waits for pending writes. Explicit Cancel is allowed to discard its own draft. |
| DATA-04 | pass | EditHistory retains several steps; successful inverses alone advance stacks. Subscription external reversals retain failed steps; domain and text Undo/Redo get standard shortcuts (PlaylistEditingModel.swift; EditHistory.swift). |
| DATA-05 | fail | **minor** — Undo does not reveal restored content. See failure detail below. |
| DATA-06 | fail | **major** — Browsing context is not restored. See failure detail below. |
| DRAG-01 | fail | **major** — Direct manipulation stops at same-Playlist reordering. See failure detail below. |
| DRAG-03 | pass | Supported reorder uses editing.move and reversibleEdit, with a named undo step (PlaylistContentView.swift:102; PlaylistEditingModel.swift:162). |
| DRAG-05 | N/O | Native Table supplies drag presentation; insertion cues, threshold/reset and rejected-drop feedback have no captured run. |
| DRAG-06 | N/O | Autoscroll, slow-drop feedback and destination selection have no drag-run evidence. |
| PTR-03 | N/O | No pointer/gesture interaction run; ordinary SwiftUI controls alone do not prove the whole check. |
| PTR-04 | fail | **minor** — Repeated icon buttons omit action tooltips. See failure detail below. |
| APPEAR-03 | N/O | Increase Contrast/Reduce Transparency separately and together were not captured; semantic materials are used, while the custom tint has no explicit variants. |
| APPEAR-04 | fail | **major** — Repeated active actions and metadata fail contrast in Dark. See failure detail below. |
| APPEAR-05 | N/O | No Reduce Motion run. The code adds no bespoke positional animation, but native transition/material behavior is unverified. |
| APPEAR-09 | pass | A coherent SF Symbol family: play/pause, plus, star, checkmark, download and share; sizes/weights follow local roles (L03/L26). |
| APPEAR-10 | pass | Toolbar materials, native control surfaces and content separators distinguish controls from data; no decorative app animation in source. Contrast is assessed separately. |
| APPEAR-11 | N/O | No sampled transition/loading frames; isolated coherent stills cannot establish no flashes or intermediate contradictions. |
| TYPE-02 | pass | System regular/medium/semibold/bold roles throughout; no thin UI type or mixed font families. |
| TYPE-03 | pass | Body/captions use system semantic styles; only aligned numbers and configuration text use monospaced treatment. |
| TYPE-05 | N/O | Short captured prose is readable; resize and enlarged-text hierarchy are not evidenced. |
| TYPE-06 | N/O | Fixture descriptions are too short to count three typical full reading lines. Long show notes are absent from the visible capture. |
| TYPE-07 | pass | No prolonged uppercase app prose or underlined non-links; publisher initials in Artwork are short identifying content. |
| TYPE-08 | pass | Sampled app text uses …, typographic quotes and dashes (name conflicts, range/time text); literal URLs/configuration and publisher content are exempt. |
| COPY-01 | pass | Views find Episodes, Playlists hold Entries; labels name Play/Star/Download/Restore/Rewind. No touch-only instructions in the Mac UI. |
| COPY-02 | fail | **major** — Settings can fail without feedback beside the setting. See failure detail below. |
| COPY-03 | fail | **minor** — Filtering a nonempty Trash to no matches leaves a blank list. See failure detail below. |
| COPY-04 | pass | Most title/action and sentence-help roles are internally readable and consistent; the owner’s domain capitalization is preserved. |
| AX-01 | fail | **blocker** — Selection-toolbar controls have the wrong accessible names. See failure detail below. |
| AX-02 | pass | Current Entry has text and a location symbol; Active Playlist a named symbol; states include Played/Starred strings, not color alone. |
| AX-04 | N/O | Discrete moves and visible controls avoid gesture-only operations, but Voice Control/Switch Control and all assistive paths were not exercised. |
| AX-05 | pass | Playback has visible Play/Pause/Stop and time/state feedback; no essential status is conveyed solely by sound. Podcast programme audio is the content. |
| START-01 | N/O | Local loading/Opening Library placeholders and asynchronous startup exist; launch delay and availability during a real sync were not measured. |
| START-02 | pass | Getting started can be dismissed, stores dismissal, reopens from Settings and defers disappearance during Add. Ready-snapshot checks prevent loading-as-first-run (LibraryEditingModel.swift:69/117). |
| START-03 | pass | Three introductory points teach Add/Views/Playlists; sheets and Help have dismissal routes and contextual explanatory text. |
| START-04 | N/A | No privacy permission prompt declared; file access is requested by explicit system file selection. |
| START-05 | N/A | No app purpose-string privacy request → START-04. |
| START-06 | pass | No account gate; Welcome provides Start on this Mac, with optional server connection and later bring-over (ConnectionViews.swift; ApplicationModel.swift). |
| START-07 | N/A | No account creation/deletion feature → START-06. |
| EDIT-02 | N/O | Native field editing is retained; L33 labelled Select All evidence still shows one selected row, so list selection/copy/delete behavior is not certified. |
| EDIT-05 | N/O | Copy Link explicitly writes the public URL and notes enable text selection; useful whole-row copy representations are not established. |
| WIN-03 | N/O | Only 1180×760 supplied. Minimum 760×500, half-display and multi-display reflow have no capture. |
| TOOL-06 | N/O | Sidebar/Inspector recovery exists; AX lists toolbar removal actions, but actual customization and complete restoration behavior were not captured. |
| SIDE-03 | pass | Sidebar has native toolbar/Menu/shortcut recovery; Inspector has a toolbar button and View command at Command-Option-I. |
| SIDE-04 | fail | **major** — All Views has no persistent navigation selection. See failure detail below. |
| SET-01 | pass | Global settings and OPML are in Settings/File; Subscription and Playlist options stay near their objects; player speed is current playback only. |
| RESP-01 | N/O | No five-run step timings or 75th-percentile latency/busy-indicator measurements. |
| FOOT-02 | N/O | No representative long-list scrolling, refresh-rate or hang run. |

### Mac checklist

| ID | Verdict | Evidence / scope |
|---|---|---|
| MENU-01 | pass | menus.txt: App, File, Edit, View, Controls, Episode, Playlist, Window, Help; Format correctly absent. |
| MENU-02 | fail | **blocker** — The menu bar is an incomplete command index. See failure detail below. |
| MENU-03 | fail | **major** — Commands disappear when their context is unavailable. See failure detail below. |
| MENU-04 | fail | **minor** — New View omits the input ellipsis. See failure detail below. |
| MENU-05 | fail | **minor** — The custom Episode menu has two submenu levels. See failure detail below. |
| MENU-06 | pass | No app-defined modifier alternates; system Close/Minimize/Zoom alternates use Option in menus.txt. |
| APP-01 | N/O | Native About PodList item exists and bundle has version; copyright content of the unshown About panel is not established. |
| APP-02 | pass | Native Settings scene plus captured standalone movable Settings window; App menu shows Settings… at Command-comma. |
| APP-03 | N/O | System Services is present; consuming selection services from fields and their context menus was not exercised. |
| APP-04 | pass | Native App lifecycle/menu actions preserve Hide, Hide Others, Show All and Quit in standard order/keys; no app override in scene code. |
| FILE-01 | pass | File offers New View/New Playlist and OPML import/export; the file workflow is an importer, not a document editor needing Open/Save documents. |
| FILE-02 | N/A | No document-opening/recent-document model; OPML is imported into Library data. |
| FILE-03 | pass | Native Close/Close All target windows; no replacement action intercepts Command-W. |
| FILE-04 | pass | OPML export uses NSSavePanel and atomic output without closing Library; no Duplicate-document action. |
| FILE-05 | N/A | No printing feature or paginated document task. |
| EDIT-01 | fail | **major** — Text Undo and Redo lose their operation names. See failure detail below. |
| EDIT-03 | N/A | Search is over Library objects, not a text Find/Replace feature; no text Find commands are implemented. |
| EDIT-04 | fail | **major** — The Edit menu omits the Mac text command families. See failure detail below. |
| FMT-01 | pass | No formatted-text editing; Format is correctly omitted. |
| FMT-02 | N/A | No supported rich-text formatting commands → FMT-01. |
| VIEW-01 | pass | View includes pane controls and system full screen; no framework Reload/Developer Tools leftovers. |
| VIEW-02 | pass | Show Sidebar/Hide Inspector reflect state; window management is under Window. Data Edit/Delete View are domain-view actions, not window management. |
| WMENU-01 | pass | menus.txt contains Minimize, Zoom and Bring All to Front. |
| WMENU-02 | N/O | System Zoom command is present; its actual preferred-versus-user-size behavior was not exercised. |
| WMENU-03 | N/O | Window list is present; two identically named stats entries include a command and window. General alphabetical ordering/modal exclusion not fully established. |
| HELP-01 | N/O | Trailing Help opens app-specific PodListHelp code; actual Command-question-mark handling not evidenced in capture. |
| HELP-02 | N/O | No Help Book resources in bundle script; the native menu’s search field and menu-command lookup were not captured, so useful system search is not certified. |
| KEY-02 | N/O | Common Command keys are conventional and Space guard preserves typing; arrow/text key precedence and sheet cancellation need a run. Confirmed cancellation defect is DLG-04. |
| KEY-03 | fail | **major** — Frequent Episode actions have no discoverable shortcuts. See failure detail below. |
| KEY-05 | pass | Captured menu notation uses system glyphs and ordering; app-native keyboardShortcut declarations generate the labels. |
| TEXT-01 | N/O | Native fields and NSTextView text-entry guard are present; custom DefaultKeyBinding.dict and Cocoa binding behavior not exercised. |
| TEXT-02 | N/O | System replacements, spelling underlines and disabled settings not exercised; missing menu commands are EDIT-04. |
| WIN-01 | pass | Native WindowGroup with captured standard close/minimize/full-screen controls; no custom frame implementation. |
| WIN-02 | N/O | Native selected materials gray during sheets; multiple key/main/inactive window transitions are not sufficiently captured to certify every state. |
| WIN-04 | pass | Toolbar/AX titles identify New this week, Default, Commute, Market Hours and settings panes rather than merely PodList. |
| WIN-05 | fail | **major** — The bottom bar contains primary controls and identification [owner-fixed]. See failure detail below. |
| WIN-06 | N/O | Native full-screen menu/control is wired; entry/exit, essential action access and Dock reveal were not exercised. |
| WIN-07 | pass | Library windows support separate browsing; stats/help have clear auxiliary tasks and visible Window commands. |
| WIN-08 | pass | LibraryCommands.swift:25 offers New Window; PodListWindow owns independent WindowModel, Inspector and secondary task sheets preserve context. |
| WIN-09 | N/O | System frame/toolbar used; dragging, configured double-click action and traffic lights in full screen not exercised. |
| WIN-10 | N/O | No live resize evidence or timing. |
| TOOL-01 | pass | Navigation/title leading, action group central/trailing, Search and Inspector trailing; same native toolbar zones in captures. |
| TOOL-02 | N/O | Native toolbar handles overflow, but no narrow-size/priority capture establishes essentials remain reachable. |
| TOOL-03 | pass | Navigation, Episode actions and view/search controls form restrained functional groups; Edit View is separated from the action symbols. |
| TOOL-04 | pass | Common toolbar commands use SF Symbols and standard toolbar material; no multiple competing prominent fills. |
| TOOL-05 | pass | Window actions are toolbar items; data pickers, checkboxes and rename input stay in the body. |
| SIDE-01 | pass | Leading native source-list sidebar is visible by default (L01/D01; NavigationSplitView). |
| SIDE-02 | pass | Views/Playlists/Library sections with one level of destinations, below the two-level ceiling. |
| SIDE-05 | pass | Thin continuous pane separators distinguish sidebar, main list and Inspector in both appearances. |
| SIDE-06 | N/O | Native sidebar style uses no custom overall font override; actual system sidebar-size preference response was not observed. |
| SET-02 | fail | **major** — Settings duplicates the system appearance preference. See failure detail below. |
| SET-03 | fail | **major** — Settings does not size to the selected pane. See failure detail below. |
| SET-04 | N/O | Captured titles correctly identify General/Automation; last-pane restoration is not explicitly persisted in TabView and was not tested. |
| SET-05 | pass | Global/Subscription settings apply on change with no Save/Apply gate; explicit Playlist/View Rename is an owner-defined input task, not a global preference. |
| SET-06 | N/O | Native Settings window has dimmed minimize/zoom; whether Settings stays closed after app relaunch was not tested. |
| DLG-06 | fail | **major** — Now Playing can open a second sheet over its own sheet. See failure detail below. |
| DLG-08 | N/A | Inspector is an attached modeless pane, not a separate floating input palette; no independent repeated-input panel feature. Nested Now Playing sheet is DLG-06. |
| CTRL-01 | pass | Mac pop-ups, checkbox/toggle roles and the three-part Playlist subsection control suit their semantics; the owner’s segmented subsection is an adapted content control, not a replacement for window navigation. |
| DATA-02 | N/A | Database-backed app, no unsaved file documents. |
| DATA-03 | N/A | No autosaved document/version-browser model → DATA-02. |
| DATA-07 | N/O | Code uses NSOpenPanel/NSSavePanel with sensible type/name setup; system browsing/extension preferences not observed. |
| DATA-08 | N/A | No document-type editing model; imported OPML is Library input → DATA-02. |
| DRAG-02 | pass | Supported same-Playlist reorder moves; foreign Playlist payloads are refused safely. Duplicate-copy inside one Playlist is prohibited by the Episode uniqueness model; missing cross-container copying is DRAG-01. |
| DRAG-04 | pass | Supported internal reorder encodes every selected Episode ID in list order; its one supported internal representation preserves fidelity. External richer representations are absent under DRAG-01. |
| DRAG-07 | N/O | Native TableRow draggable is used; one-motion and inactive-window selection dragging not exercised. |
| PTR-01 | fail | **major** — Views and Playlists have no contextual commands in the sidebar. See failure detail below. |
| PTR-02 | pass | App Episode/Entry context menus use short text groups without displayed shortcuts; nested command depth is recorded once under MENU-05. |
| PTR-05 | N/O | Selection-aware native table context menus receive target IDs; outline highlight and selection preservation need an actual secondary-click run. |
| APPEAR-01 | fail | **major** — Dark appearance does not reach the Listening stats window. See failure detail below. |
| APPEAR-02 | fail | **major** — The fixed blue accent overrides the Mac’s accent preference [owner-fixed]. See failure detail below. |
| APPEAR-06 | pass | System glass/material is confined to toolbar/navigation/player controls; Table and reading surfaces are content, not custom glass cards. |
| APPEAR-07 | N/A | No custom regular/clear glass construction or glass stacking. |
| APPEAR-08 | N/O | Native current-system bars/sidebar are present; scroll-edge legibility at varied scroll positions is not captured. |
| TYPE-01 | pass | System .body/headline/subheadline/caption/caption2/title styles at Mac metrics; the minimum explicit icon font is not UI reading text. |
| TYPE-04 | N/O | Inspector custom actions have explicit 28/44-point targets; tiny native glyph AX bounds do not prove small hit regions elsewhere. No interaction hit test. |
| AX-03 | fail | **major** — There is no way to enlarge app content. See failure detail below. |
| SYS-01 | pass | AppIntents.swift supplies named semantic play/pause/add/search/mark/list actions, entities and three App Shortcuts; build script extracts and checks actions/entities/autoShortcuts metadata. Runtime system invocation remains unverified; no AppleScript interface is claimed. |
| SYS-02 | N/A | No purpose-specific text/image processing Service workflow in the selected product scope; consuming Services is APP-03. |
| SYS-03 | fail | **minor** — App content cannot be opened through stable app links. See failure detail below. |
| SYS-04 | pass | ShareLink uses the system interface with supported public podcast/Episode URLs, and Copy Link uses the same source; no broad app permission grant is required. |
| SYS-05 | fail | **major** — Searchable Library content is not indexed for Spotlight. See failure detail below. |
| SYS-06 | N/A | No custom Finder/document, credential, Safari-extension or receiving-Share workflow is built in scope; this is not a requirement for every extension technology. |
| SYS-07 | N/A | No app-specific Dock task/progress display is claimed; audio transport belongs to the system Now Playing surface, not a decorative badge requirement. |
| EXTRA-01 | N/A | No menu bar extra (the app menu bar is a different surface). |
| EXTRA-02 | N/A | No menu bar extra → EXTRA-01. |
| EXTRA-03 | N/A | No menu bar extra → EXTRA-01. |
| EXTRA-04 | N/A | This is a Library/listening workspace, not a dual-mode quick-access utility → EXTRA-01. |
| FOOT-01 | N/O | No task-comparable bundle/launch/idle-resource measurements; no arbitrary footprint ceiling inferred. |

N/O: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-06, FLOW-07, KEY-01, KEY-04, KEY-06, KEY-07, CTRL-05, LIST-05, LIST-07, DRAG-05, DRAG-06, PTR-03, APPEAR-03, APPEAR-05, APPEAR-11, TYPE-05, TYPE-06, AX-04, START-01, EDIT-02, EDIT-05, WIN-03, TOOL-06, RESP-01, FOOT-02, APP-01, APP-03, WMENU-02, WMENU-03, HELP-01, HELP-02, KEY-02, TEXT-01, TEXT-02, WIN-02, WIN-06, WIN-09, WIN-10, TOOL-02, SIDE-06, SET-04, SET-06, DATA-07, DRAG-07, PTR-05, APPEAR-08, TYPE-04, FOOT-01.

N/A: FLOW-05, DLG-02, DLG-03, DLG-05, DLG-09, CTRL-02, START-04, START-05, START-07, FILE-02, FILE-05, EDIT-03, FMT-02, DLG-08, DATA-02, DATA-03, DATA-08, APPEAR-07, SYS-02, SYS-06, SYS-07, EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04. Dependencies and task-relevance reasons are specified in their rows.

### Failures by severity, with concrete fixes

**AX-01 — blocker — Selection-toolbar controls have the wrong accessible names.**

- **Where/evidence:** L03/D03 and L33/D33 AXToolbar: five AXButtons are all labelled “Play Now”; the last three have IDs arrow.down.circle, star and checkmark. Their help strings identify Download, Star and Mark Played, confirming the name/action mismatch. EpisodeEditingViews.swift:55 places the actions inside one toolbar HStack.
- **Concrete fix:** Emit individually labelled ToolbarItems rather than relying on a shared HStack label; give each button its own action name and state. Verify the resulting tree reports Play Now, Add to a Playlist, Download, Star/Unstar and Mark Played/Unplayed separately.
- **Principle:** `accessibility`.

**MENU-02 — blocker — The menu bar is an incomplete command index.**

- **Where/evidence:** menus.txt plus LibraryCommands.swift:23, EpisodeEditingViews.swift:159 and PlaybackCommands.swift:21 lack Subscription settings, Subscribe/Unsubscribe, bulk Download Rules, Restore from Trash, Playlist section switching and Rewind to Here. These commands exist in PodcastScreens.swift, MacWindow.swift:246, PlaylistSettingsViews.swift:133 and PlaylistContentView.swift:126. Opening generic Settings or Trash is not a menu equivalent for each command.
- **Concrete fix:** Add context-aware Library and Playlist commands for these actions, including a selectable Timeline target for Rewind; use the same action implementation as the controls and keep unavailable items dimmed.
- **Principle:** `discoverable-commands`.

**MENU-03 — major — Commands disappear when their context is unavailable.**

- **Where/evidence:** EpisodeEditingViews.swift:163/178 conditionally emits Play from Here, Move Up/Down, Remove, Playlist Settings and Delete Playlist; menus.txt on Subscriptions shows only Trash in Playlist. PlaybackCommands.swift:30 conditionally removes the playback menus when no controller exists.
- **Concrete fix:** Always emit the canonical items; derive enabled state and action titles from the focused window and playback state.
- **Principle:** `discoverable-commands`.

**EDIT-01 — major — Text Undo and Redo lose their operation names.**

- **Where/evidence:** EpisodeEditingViews.swift:152/155 deliberately uses literal Undo and Redo whenever an editable NSTextView has focus, rather than its undo/redo action names. Domain edits correctly get named titles.
- **Concrete fix:** Use the focused text undo manager’s undoMenuItemTitle/redoMenuItemTitle or native text undo command handling while preserving the named domain history.
- **Principle:** `forgiveness`.

**EDIT-04 — major — The Edit menu omits the Mac text command families.**

- **Where/evidence:** menus.txt has Cut/Copy/Paste and system Dictation/Emoji but no Spelling and Grammar, Substitutions, Transformations or Speech. PodListMac.swift:24 adds SidebarCommands and custom commands, without TextEditingCommands. Names and Search are ordinary editable text.
- **Concrete fix:** Install the appropriate native text-editing command groups and validate them against the focused editor.
- **Principle:** `conventions`.

**KEY-03 — major — Frequent Episode actions have no discoverable shortcuts.**

- **Where/evidence:** EpisodeActionItems in EpisodeEditingViews.swift:19 and menus.txt expose Star, Mark Played, Download and Add to a Playlist without key equivalents; only transport, creation and discrete reordering get custom shortcuts.
- **Concrete fix:** Assign a small, coherent set of Command-based equivalents for Star, Played and Add, display them in Episode, and document them in Help.
- **Principle:** `keyboard-efficiency`.

**CTRL-03 — major — Several input fields have only disappearing placeholders.**

- **Where/evidence:** L13 New Playlist shows only the placeholder Playlist name; PlaylistSettingsViews.swift:15/57 provides no separate visible Name label. L24 and PodcastScreens.swift:30 similarly have no persistent label for the combined directory/feed-address input. The top-level task title does not identify the input’s two accepted kinds.
- **Concrete fix:** Use a visible Name label for Playlist creation and a persistent Podcast name or feed address label above the Add input; keep examples as placeholders.
- **Principle:** `accessibility`.

**CTRL-04 — major — Numeric entry ignores the person’s locale.**

- **Where/evidence:** LibrarySettingsScreens.swift:169/175 parses Double(raw) and formats String(number); ViewEditorScreen.swift:137/140 does the same for minute values. A decimal-comma value such as 1,5 is rejected rather than treated as one and a half. View validation errors also share a footer rather than identifying the invalid field in place.
- **Concrete fix:** Use locale-aware numeric format/parse strategies while retaining raw invalid drafts; put each validation message beside its field.
- **Principle:** `feedback`.

**DATA-06 — major — Browsing context is not restored.**

- **Where/evidence:** LibraryModel.swift:218 initializes destination to Subscriptions, selection empty and sortOrder empty. MacWindow.swift:12/22 recreates WindowModel and column visibility in State; only Inspector visibility is AppStorage. There is no persisted navigation, selected Episode, content scroll position or pane-width restoration model. Framework window-frame restoration alone cannot restore these values.
- **Concrete fix:** Persist per-window destination, selected IDs, sort, pane state and scroll anchor using scene restoration; reconcile missing IDs after Library load.
- **Principle:** `stability`.

**DRAG-01 — major — Direct manipulation stops at same-Playlist reordering.**

- **Where/evidence:** The only content transfer implementation is PlaylistContentView.swift:57/102: a String JSON payload whose first ID must equal the current Playlist. View/Search Episodes cannot drag into a Playlist, Playlist-to-Playlist drops are rejected, and OPMLImportContent.swift/LibraryFileActions supply a chooser but no file-drop destination. There is no useful URL export for dragging Episodes to other apps.
- **Concrete fix:** Add Episode transfer representations (stable identity plus public URL), copy-to-another-Playlist and View-to-Playlist destinations, and an OPML file-drop target that selects and previews without importing. Retain the existing menu equivalents and Undo.
- **Principle:** `direct-manipulation`.

**PTR-01 — major — Views and Playlists have no contextual commands in the sidebar.**

- **Where/evidence:** MacWindow.swift:49–83 emits the sidebar’s tagged rows with no contextMenu; All Views is a plain button list with none. Episode tables and Subscription rows do have context menus, so the gap is object-specific.
- **Concrete fix:** Add native sidebar menus for applicable Open, Rename/Edit, Playlist Settings and Delete, preserving Default restrictions and menu-bar equivalents.
- **Principle:** `conventions`.

**APPEAR-01 — major — Dark appearance does not reach the Listening stats window.**

- **Where/evidence:** D31 is still a white/light stats window while D27–D30 are dark. The capture README says the system remained Light and PodList’s override was Dark. PodListMac.swift:35 creates ListeningStatsScreen without the override; preferredColorScheme is applied only in MacWindow.swift:40 and the General settings child at LibrarySettingsScreens.swift:99.
- **Concrete fix:** Apply the selected appearance at every scene root, including stats, Help and both Settings panes, or consistently follow System throughout.
- **Principle:** `conventions`.

**APPEAR-02 — major — The fixed blue accent overrides the Mac’s accent preference [owner-fixed].**

- **Where/evidence:** MacWindow.swift:6/39 unconditionally tints the window with RGB 43/80/200; InspectorActions, current-Entry marks and Artwork placeholders also use that fixed color. It is not restricted to the system’s Multicolor accent choice.
- **Concrete fix:** Full checklist conformance would require using the system accent outside Multicolor. That would change an owner-fixed decision and is not proposed for this task. Retain the choice and its cap; improve its dark contrast independently.
- **Principle:** `conventions`.

**APPEAR-04 — major — Repeated active actions and metadata fail contrast in Dark.**

- **Where/evidence:** D03 measured full-color pixels: row Play #344fc1 on #212427 = 2.25:1; Inspector Star #344fc1 on #212931 = 2.13:1; New View text #344fc1 on #222b38 = 2.06:1. Inspector secondary text is approximately #6e767e on #212931 (about 3.2:1). These are enabled action labels/glyphs and recurring information, not disabled decoration. The stricter Mac Dark Mode 4.5:1 text target applies; even 3:1 is missed by the blue.
- **Concrete fix:** Keep the owner’s base blue, but derive a lighter dark/high-contrast foreground variant and readable secondary text. Aim for at least 4.5:1 for active text (7:1 preferred for small custom dark text); verify enabled symbols as well.
- **Principle:** `accessibility`.

**AX-03 — major — There is no way to enlarge app content.**

- **Where/evidence:** LibrarySettingsScreens.swift and the menu commands expose no text-size control or Larger/Smaller commands; the source uses fixed semantic Mac text styles with no app scaling mechanism. macOS has no Dynamic Type setting to supply this for the app.
- **Concrete fix:** Add a Mac text-size setting or Larger/Smaller commands with semantic scaling toward 200%, and let lists, Inspector and sheets reflow with it.
- **Principle:** `adaptability`.

**COPY-02 — major — Settings can fail without feedback beside the setting.**

- **Where/evidence:** PlaybackSettingsFields invokes ApplicationModel.record (ApplicationModel.swift:400), which routes failures to app.editing.error. The General Settings Form renders neither EditingFeedback nor LibraryFeedback. Subscription Settings does render feedback; General errors instead appear in the separate Library window, which may be closed or behind Settings.
- **Concrete fix:** Render the shared reserved feedback row in General Settings, identify the failed setting, preserve its draft, and provide Retry or a clear recovery instruction.
- **Principle:** `feedback`.

**SIDE-04 — major — All Views has no persistent navigation selection.**

- **Where/evidence:** L05/D05 show the Views content with no corresponding sidebar selection. MacWindow.swift:50 implements All Views as a Button without a .views tag, unlike the selectable navigation rows. Its blue button appearance is identical whether selected or not.
- **Concrete fix:** Make All Views a tagged navigation row in the same List selection model; keep New View as a distinct action.
- **Principle:** `feedback`.

**SET-02 — major — Settings duplicates the system appearance preference.**

- **Where/evidence:** L27/D27 and LibrarySettingsScreens.swift:74 offer a System/Light/Dark override for a detectable OS preference. System default is available, but this checklist specifically asks Settings to follow the preference directly.
- **Concrete fix:** Follow the system appearance directly and keep both light/dark implementations. If the override is deliberately retained, record this checklist deviation rather than treating System as full SET-02 compliance.
- **Principle:** `conventions`.

**SET-03 — major — Settings does not size to the selected pane.**

- **Where/evidence:** L30/D30 retain the same tall window as General, with the MCP-off form occupying only its top. Both panes hard-code frame(width: 600, height: 690), LibrarySettingsScreens.swift:33/93. Native tabs and dimmed window controls are correct.
- **Concrete fix:** Give each pane a content-appropriate preferred height, with bounded scrolling for longer content and enabled MCP details; retain the fixed pane toolbar.
- **Principle:** `craft`.

**DLG-04 — major — Command-period does not cancel sheet input tasks.**

- **Where/evidence:** NewPlaylistSheet, AddPlaylistSheet, RewindSheet and ViewEditorScreen bind Cancel to cancelAction (Escape), while PlaybackCommands.swift:27 globally binds Command-period to Stop. No sheet-local Command-period cancellation is declared. This is a concrete command-routing conflict, not a claim that Escape fails.
- **Concrete fix:** Bind Command-period to the same safe Cancel action while a cancellable sheet owns focus, overriding Stop there; verify Escape and Command-period with pending work.
- **Principle:** `forgiveness`.

**DLG-06 — major — Now Playing can open a second sheet over its own sheet.**

- **Where/evidence:** MacWindow.swift:173 presents NowPlayingView as a sheet; PlayerViews.swift:179 attaches PlaylistSheetHost inside it. Episode detail’s Add action then opens AddPlaylistSheet above the active Now Playing sheet. The source explicitly implements two modal layers. No stacked-sheet screenshot is supplied, so the failure is the presentation structure, not a measured transition defect.
- **Concrete fix:** Keep the owner-fixed Now Playing sheet and present the Add destination as an inline step inside it, with Cancel/Back restoring Episode detail.
- **Principle:** `user-control`.

**SYS-05 — major — Searchable Library content is not indexed for Spotlight.**

- **Where/evidence:** AppIntents.swift defines ordinary EpisodeEntity/PlaylistEntity and runtime EntityStringQuery, but no IndexedEntity, searchable-item donation or Core Spotlight indexing. The source and build-mac-app.sh contain no content indexing path. Listing App Shortcuts is not indexing the Episodes and Playlists themselves.
- **Concrete fix:** Index eligible Episodes and Playlists with titles, podcast metadata and stable IDs; update/remove records with Library changes and open the matching app content from a result.
- **Principle:** `conventions`.

**WIN-05 — major — The bottom bar contains primary controls and identification [owner-fixed].**

- **Where/evidence:** L03/D03 and PlayerViews.swift:5 put transport, seek, current Episode/podcast, Speed and Sleep at the bottom edge. WIN-05 permits only limited status there. Menus and the Inspector mitigate access, but do not make the bar a status-only bar.
- **Concrete fix:** Conforming placement would require moving transport/identification above the bottom edge, which conflicts with layout B and is not proposed. Keep the owner’s placement and the recorded deviation; preserve the existing upper menu routes.
- **Principle:** `content-first`.

**MENU-04 — minor — New View omits the input ellipsis.**

- **Where/evidence:** menus.txt and LibraryCommands.swift:26 label the command New View even though it opens a naming/filter sheet. New Playlist… and Add Podcasts… correctly advertise further input.
- **Concrete fix:** Use New View… consistently for the sheet-opening command.
- **Principle:** `plain-language`.

**MENU-05 — minor — The custom Episode menu has two submenu levels.**

- **Where/evidence:** EpisodeEditingViews.swift:29 nests Play in Another Playlist → Playlist name → Play Now/Next/Last, beyond the checklist’s single submenu level. System-supplied Window submenus are not being counted as an app defect.
- **Concrete fix:** Use one Add/Play in Playlist sheet or flatten the playlist/placement choice so there is at most one submenu below Episode.
- **Principle:** `hierarchy`.

**KEY-08 — minor — Help lacks a usable shortcut reference.**

- **Where/evidence:** PodListHelp in ConnectionViews.swift:59 has a few prose paragraphs and mentions Inspector/Settings keys, but no shortcut reference or explanation of bare Space’s selected-Episode versus current-playback meaning. The Space text-entry guard is present and receives credit.
- **Concrete fix:** Add a compact keyboard reference to Help for navigation, selection, Space, playback and common Episode actions, including the text-entry exception.
- **Principle:** `keyboard-efficiency`.

**DATA-05 — minor — Undo does not reveal restored content.**

- **Where/evidence:** PlaylistEditingModel.swift:75 restores data and status, then invokes the general changed callback; it sends no restored-ID/scroll/navigation request to WindowModel. Undoing deletion after reconcile moved the window away therefore leaves the restored Playlist offscreen.
- **Concrete fix:** Publish the affected/restored IDs with the successful Undo result and reveal/select the restored Playlist or Entry in the originating window without stealing input in another window.
- **Principle:** `forgiveness`.

**PTR-04 — minor — Repeated icon buttons omit action tooltips.**

- **Where/evidence:** L03/D03 trees show no help on per-row Add/Play buttons; L26/D26 transport buttons have accessible labels but no help. MacWindow.swift:349 and PlayerViews.swift:58 confirm the missing .help modifiers. The Inspector’s second row is correctly labelled and tooled.
- **Concrete fix:** Add concise action-specific help to row actions, transport, Subscription settings and the Active Playlist button; include complete truncated titles where useful.
- **Principle:** `discoverable-commands`.

**SYS-03 — minor — App content cannot be opened through stable app links.**

- **Where/evidence:** ShareLinks.swift creates publisher/enclosure HTTP URLs. build-mac-app.sh registers no URL scheme and the scene code has no onOpenURL or equivalent route to an Episode, Playlist or View. Publisher sharing works, but does not restore a PodList destination.
- **Concrete fix:** Add stable PodList links for Episodes, Playlists and Views and resolve them into the correct Library/window context; retain publisher sharing separately.
- **Principle:** `conventions`.

**COPY-03 — minor — Filtering a nonempty Trash to no matches leaves a blank list.**

- **Where/evidence:** PlaylistSettingsViews.swift:140 checks library.trash.isEmpty before filtering, then builds List(library.trash.filter...). There is no no-matches branch or Clear Search action for the filtered-empty case. The captured truly empty Trash is designed correctly.
- **Concrete fix:** Compute the filtered result first; show No matching Playlists with Clear Search when the Library’s Trash is nonempty but the result is empty.
- **Principle:** `plain-language`.

## Scores

These are app-level scores across the supplied Light/Dark set and code. The same score covers appearances unless distinguished. Behavioral scores include source/menu evidence but remain limited by the N/O items; they are not runtime certifications.

| Category | Score | Evidence, anchor and exact placement | Principle |
|---|---:|---|---|
| Typography | **8.2** | Strong: a small SF scale separates titles, Episode names, podcasts and tabular facts; no gratuitous display font. Below Exemplary because Podcast-page Episode titles routinely collapse to two very short lines while the 180-point Inspector artwork and secondary metadata use space generously; body/secondary legibility and meaningful enlargement are not uniformly finished. Contrast failure is capped in Color, enlargement in Interaction, not counted again here. | hierarchy, craft |
| Hierarchy | **7.5** | Strong: source → list → Inspector reads naturally and isolated Play leads its own action group. Bottom transport remains distinct. Below reference craft because toolbar bulk actions repeat row/Inspector tools, the large blank Inspector dominates no-selection screens, and Subscription cards are visually heavier than the Episode work. The owner’s layout is preserved; improve emphasis inside it. | content-first, hierarchy |
| Spacing & density | **7.1** | Strong threshold: 32-point sidebar rows, approximately 50-point two-line Episode rows and thin dividers are purposeful Mac density. The Podcast page gives the Episode-title column only a narrow strip, though other columns remain wide; settings and empty History distribute vertical space poorly. Existing fixed status space is useful, but duplicate rows and permanent empty import scaffolding waste it. Hit regions and smaller sizes are N/O, not presumed failures. | craft, adaptability |
| Color & contrast | **5.8** | Competent after major caps: clear primary text, restrained palette and readable filled blue/white Play lift it above the band floor. Repeated Dark actions at 2.06–2.25:1 and secondary metadata around 3.2:1 are a substantial perceptual problem; scene appearance is inconsistent. APPEAR-01/-02/-04 cap at 6.9. Owner-fixed base blue remains character, but no exemption from contrast or Mac-accent grading. | accessibility, color-restraint |
| Iconography | **8.0** | Strong: familiar SF transport/star/download/share, coherent weights and useful text menu equivalents. Below Exemplary because repeated blue plus/play pairs add visual texture to every row and several tiny action glyphs lack help. Correct visual glyphs do not cure AX-01’s incorrect spoken names. | conventions, craft |
| Consistency & polish | **6.3** *(partial: no flow run; stability N/O)* | Competent: repeatable tables, reserved feedback and durable drafts show care. CTRL-03/-04 cap the category at 6.9; duplicated Podcast feedback, History’s vertical anchor, oversized empty Automation pane and clipped Settings import help keep it below the top. Static/coded safeguards support this craft judgment; no measured stability score is claimed. | craft, stability |
| Clarity | **6.8** | Competent after COPY-02 cap: task-specific Play/Star/Restore/Rewind labels and the Rewind consequence summary are strong. Hidden Settings failures keep it below Strong. Further craft gaps: Views subtitle says “0 Episodes” over three saved Views (L05); stats says “1 days” and plots tiny fractional minutes beside 0:00 totals with no clear visible chart-axis unit. Both make valid underlying state needlessly hard to interpret. | plain-language, feedback |
| Platform fit | **4.9** *(checklist-capped; Looks 8.0 / Behaves 6.0 → 6.7 before caps)* | Native-looking frame, source list, table controls, Settings window and App Intents are substantial strengths. The incomplete command index is a MENU-02 blocker, forcing 4.9 despite a predominantly native presentation; dynamic menu omissions, missing text command families, deep submenus and Settings sizing also fall short. The score is the mandatory cap, not a claim that most widgets are web/foreign. | conventions, discoverable-commands |
| Interaction & feedback | **4.9** *(checklist-capped; code/AX evidence, runtime partial)* | Native shortcuts, safe Trash deletion, named domain Undo, retained failed reversals, download retry/cancel and persistent drafts earn credit. AX-01’s incorrect core toolbar names impose the blocker cap. Missing restored context, enlargement and broader transfer routes, plus untested focus/latency, prevent a keyboard-fluent/forgiving reference judgment. | accessibility, forgiveness, keyboard-efficiency |
| **Overall** | **6.7 / 10** | The product’s main listening model and Mac composition are coherent, with a visibly stronger light appearance. The incorrect accessible action names and incomplete menu index hold it furthest from 9.0. Lowest category 4.9 sets Overall’s maximum at 6.9; 6.7 reflects useful native foundations plus repeated dark/secondary-state defects. This is holistic, not an average. | content-first, conventions, accessibility |

### Platform-fit signals

The side-by-side comparison with the supplied Mac gallery exposes no imported web widget family or iOS wheel controls. The foreign signals are fixed accent behavior, an incomplete/dynamic command model and missing Mac working-context/integration behavior. `C` below explicitly means source evidence (not a live run); S is the supplied screenshot, B the supplied AX/menu facts.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Window frame | Native | S/B: standard traffic lights, unified frame/toolbar. Dragging itself N/O. |
| L2 Type | Native | S/C: system semantic Mac sizes. |
| L3 Controls | Native / Adapted | S/C: native fields/pop-ups/checkboxes; deliberately larger styled Inspector Play and Playlist subsection segments. |
| L4 Menus/popovers | Native | B/C: actual macOS command surfaces; depth defect MENU-05 is behavioral structure. |
| L5 Shortcut notation | Native | B: system modifier glyphs/order. |
| L6 Sidebar/selection | Foreign in accent/All Views; otherwise Native | C/S: hard-coded tint, untagged All Views; native tagged source rows elsewhere. |
| L7 Symbols | Native | S/C: coherent SF Symbols. |
| L8 Settings | Native, unfinished sizing | S/C: separate Settings window and live changes, but fixed pane height. |
| L9 Density | Adapted | S/C: task-appropriate Mac rows/actions; some poor width allocation, no blanket touch scale. |
| L10 Materials/era | Native | S: current-system toolbar/sidebar, quiet content. Scroll-edge and accessibility preference behavior N/O. |
| L11 Appearance | Foreign across scenes | D31 stays Light under Dark override; other supplied main screens adapt. |
| B1 Menu bar | Foreign | B/C: MENU-02/-03, missing command families. |
| B2 Settings route | Native | B/C: Settings scene at Command-comma. |
| B3 Shortcuts | Adapted, incomplete | C/B: creation/reorder/transport keys and Space text guard; frequent Episode keys absent. |
| B4 Text | N/O overall | Native fields in C; runtime bindings/services untested; Edit-family omission is evidenced. |
| B5 Keyboard/lists | N/O overall | Selection and primary actions in C; Full Keyboard Access/type-select/scroll keys untested. AX toolbar defect separately established. |
| B6 Context menus | Foreign coverage; Adapted tables | C: good Episode/Subscription menus, none on sidebar View/Playlist objects. Target outlines untested. |
| B7 Windows/state | Foreign restoration; Native window model | C/B: multiwindow and standard window commands; WindowModel resets navigation/selection. Full screen not exercised. |
| B8 Drag/drop | Foreign coverage; Adapted reorder | C: reversible multiselection reorder, no external/other-Playlist transfer. |
| B9 System integration | Adapted, incomplete | C: metadata-backed App Intents and ShareLink; no content Spotlight indexing or app destination links. System invocation N/O. |
| B10 Undo/help | Adapted | C: named domain Undo and real app Help; typing names/reference incomplete; runtime Help-search behavior N/O. |
| B11 Footprint | N/O | No launch/idle/long-list measurements. |

**Looks 8.0, Behaves 6.0** are anchored judgments over observed signals, not percentages of Native rows. (8.0 + 2×6.0) / 3 = **6.7**. MENU-02 then caps the final category to **4.9**. N/O signals do not earn points or become inferred failures.

### What still separates this from 9.0

1. **Finish names, command access and state first:** correctly expose each toolbar action, complete the menu index, keep its unavailable commands visible, restore per-window working context, and add enlargement. Native-looking controls alone are not reference-quality Mac behavior.
2. **Make Dark as readable as Light:** the base blue need not be abandoned to use readable foreground variants. Bring recurring metadata above the applicable contrast threshold and make all windows honor the same selected appearance. Keep semantic text colors readable rather than merely faint.
3. **Tune allocation inside layout B:** preserve the three planes, but make the Podcast Episode title column flexible enough to read recognizable titles; reduce duplicate row actions/feedback, anchor empty History like Entries and give Automation a fitting pane height. Avoid changing owner-approved topology to solve local geometry.
4. **Finish informational states:** wrap the import-continuation paragraph rather than ellipsizing its instructions, suppress the always-empty results scaffold until a file exists, label the All Views count as Views, format “1 day,” and display readable units/precision for sub-minute listening stats. These are visible craft gaps even after caps are removed.
5. **Earn the missing evidence:** instrument primary flows at minimum, half-display and typical widths in both appearances; test input races, keyboard/assistive paths, imports, media keys and the actual Shortcuts/Spotlight entry points. A 9.0 claim cannot be based on assumed smoothness or focus handling.

The owner’s immutable fixed accent and bottom-only primary bar retain guideline deviations even after all feasible fixes. With those major caps alone, Color and Platform can reach at most 6.9, so the Overall cap would be **8.9** under this exact rubric. An honest 9.0 target therefore requires an explicit rubric exception for the fixed decisions; this report neither silently grants one nor asks to redesign them. The rest of the gaps are actionable within the selected design.

## Next step

**Target:** AX-01, selection-toolbar action names. It ties MENU-02 at blocker severity and sits directly on the primary Episode task; Interaction & feedback and Platform fit tie at 4.9. Accessible playback/marking is the nearer immediate task barrier.

**Anti-pattern:** Mystery-meat navigation/action exposure in the assistive representation; visually familiar symbols are announced with the wrong shared name. The adjacent menu-index problem is Default-menu drift. Nearest contrast: INTER-01 (stable action targets) and PLAT-01 (complete command index). Things’ small action vocabulary and BBEdit’s centralized command model suggest a one-to-one action/name/state model, not a visual reskin.

**Root cause:** Several distinct actions are composed as one nested toolbar view and the captured SwiftUI accessibility output propagates the first action’s name. Correct labels in source are insufficient when the actual generated tree aliases them.

**Candidate 1 (preferred):** Expand the selection actions into separate ToolbarItems with explicit per-control accessibility names/values, retaining the same SF Symbols, geometry, owner-fixed blue and Inspector hierarchy. Principle: accessibility/conventions. Expected gain: Interaction & feedback; cleaner action semantics may improve Consistency. Risk: toolbar grouping/overflow may change, so preserve visual grouping deliberately.

**Candidate 2:** If a shared view is necessary, explicitly contain its accessibility children and isolate each button’s label/traits, then inspect the output tree. Preserve the present layout. Same expected category gain; risk: the container may add an unwanted navigation stop or still fail to isolate labels. Prefer candidate 1 if actual output remains ambiguous.

**Acceptance:** In both appearances, with one and several Episodes selected, the actual AX tree must name Play Now, Add to a Playlist, Download, Star/Unstar and Mark Played/Unplayed independently and correctly; Full Keyboard Access/VoiceOver must reach and activate the intended action without a trap. Capture the relevant flow/toolbar overflow at supported widths. Do not infer success solely from adding accessibilityLabel in code.

**Apply/compare:** Not performed: this is a review-only task. No implementation change or iteration log is claimed. All signature elements remain as supplied.
