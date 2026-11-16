# PodList Mac — independent UI grade, round 14 (Codex)

## Frame

Task · Find podcast Episodes through Subscriptions or saved Views, arrange Playlist Entries, and control and recover listening progress.

Target · Native Mac app, SwiftUI/AppKit, macOS 26+; graded build at commit `6bd275a`.

Posture · Sovereign personal library/listening tool, with transient object editors and modeless discovery/playback windows.

Audience · Perpetual intermediate; onboarding must also explain the Episode/Entry distinction to newcomers.

Nearest exemplar · Things for calm personal collection work and reversible actions; BBEdit for complete commands and preservation of work. These are craft references, not templates.

Character · Shallow Views/Playlists/Library source list; compact Episode/Entry tables with separate Positions; blue initials artwork and Multicolor accent (owner fixed); contextual Inspector; persistent bottom transport with a restrained glass control layer (owner fixed).

Owner decisions · Retain the bottom player, optional System/Light/Dark appearance, no customizable toolbar, same-control two-click unsubscribe with timeout plus Undo, designated glass surfaces, App Intents on/MCP off by default, and Spotlight indexing deferred to last. The deep Dark accent and its selected Settings label are explicitly accepted. Decisions are scored normally, including caps, but are not improvement targets.

Evidence boundary · Read the [round-14 brief][Brief], all 35 Light/Dark capture pairs and their snapshot files from [Evidence], [Menus], and current source. No earlier grade or UI-GRADE.md was read. No app was launched, no screen/desktop automation was used, and no code was changed. Baseline remains the supplied captures, particularly [L03]/[D03] and [L11]/[D11]. Scores assess this build alone.

Standard · [CRITIQUE], [Core], [MacChecklist], [Rubric], [Platform], [Principles], [Exemplars] and the cited [Contrasts] supply the rules. No live Apple-app side-by-side was available within the evidence-only restriction. The supplied native-system reference grammar and the existing [Things Settings image][ThingsSettings] were used; the missing current Apple comparison is a limitation, not a claim of a fresh comparison.

## Flows

Tasks reviewed · Browse Subscriptions → saved View → select/inspect Episode → add to Playlist; Playlist Entries → History → Listening Timeline → Rewind preview → Cancel; rename/create Playlist → Undo/Redo; search → create/edit View; podcast description → arm/disarm Unsubscribe → Subscription Settings; discover podcasts; change General/Automation settings; open Now Playing and Getting Started.

Provided run · [Tour] drives the real disposable app against the demo fixtures in both Light and Dark. [RunLog] records **2 tests, 0 failures**, approximately 799.6 seconds total. That is completion evidence, not an interaction-time result. I did not rerun it.

Widths · Main Library **1180×760 pt**, Add Podcasts **650×600 pt**, Now Playing **560×800 pt**, Settings **640×768 pt**, Stats **900×632 pt**. Desktop: macOS 27.2 VM, Retina, 1920×1200 pt, from the brief. Screenshot pixels ÷ 2 = points; snapshot frames are already points. No minimum Library (760×500 pt) or half-screen flow is supplied.

Script · [Tour]. Measurements file · **none supplied** for core-element deltas, focus, scroll, input preservation under delayed completion, keystroke latency or hitch time. Screenshot strips · the numbered Light/Dark states in [Evidence], not a complete measured flow strip. Timed runs/device · no five-run timings, host hardware specification or display refresh-rate trace.

Failures · **No scored transition failure.** FLOW-01/-02/-04 and runtime response checks are N/O. Source supports FLOW-03's stale-result protection; snapshots support the static FLOW-05/-06/-07 portions. Stability sub-score is **N/O in both appearances**. There is no inferred focus jump, timing failure or layout-shift measurement.

## Cross-screen inventory

“C:” identifies source-only behavior; “none” means absent on that surface, not unimplemented elsewhere. Neutral means system primary/secondary ink; error means the appearance-aware red/error treatment. All commit controls retain the system accent.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views/Search/selection ([L02], [L04], [L15], [L33]) | C: upper content status row, neutral action result | C: same status region, red + Retry | none | Upper trailing, named Undo/Redo | C: centered no-results text, Clear Search | none | Trailing toolbar Play/Add; Search also Create View above table | Filter summary above rows; selection count/title |
| Subscriptions ([L01]) | C: upper content status row, neutral | C: status row, red + Retry | none | C: upper trailing | C: centered add-podcast guidance | none | Sidebar/File Add Podcasts; selected Download Rules above list | “Grouped by Download Rule” and Stream heading |
| Podcast ([L18]–[L21]) | Subscribed/checkmark on the same control | C: in-context failure/Retry | Armed red Unsubscribe on the same control | C: shared upper status | C: no Episodes explanation | none | Subscribe/Unsubscribe under description; row Play/Add | Expandable description; labeled device Download Rule |
| Playlist Entries ([L06], [L07], [L10]) | C: shared upper status row | C: upper status and per-drop failed row | none | C: upper trailing, named | C: centered “no Entries” + Find Episodes | none | Toolbar Play, row Play, section control centered | Current Entry text, Position/Length/State columns |
| History ([L08]) | C: shared status row | C: shared status/Retry | none | C: shared upper trailing | Centered “No History,” neutral | none | Section control; selection commands when applicable | Explains playback versus manual Played marks |
| Timeline/Rewind ([L09], [L34a], [L34]) | C: shared status row after Rewind | C: sheet status region, red | Parent sheet: consequence summary | C: named Rewind Undo | C: scoped timeline empty state | Rewind preview blocks parent only | Row trailing Rewind to Here; sheet trailing Rewind | What changes, what is kept, and “can be undone” |
| Trash ([L14]) | C: shared upper status row | C: shared status/Retry | C: permanent-delete alert | Upper trailing named Redo | Centered “Trash Is Empty,” neutral | C: permanent-deletion confirmation | Restore/Delete on selected content | Retention and preserved History/Timeline explained |
| Playlist sheets ([L11]–[L13]) | C: neutral status above footer | C: field-specific text or status Retry | none | Named history above footer | none | Parent sheet | Trailing Save/Create Playlist; Cancel adjacent; Delete leading | Clear on Played and deletion consequences beside fields |
| View sheets ([L16], [L17]) | C: neutral status above footer | C: next to bad field or sheet status | none | Named history above footer | none | Parent sheet | Trailing Save/Create View; Delete leading | Live match count; Optional labels; Any defaults |
| Subscription/Rules sheets ([L22], [L25]) | C: neutral status above footer | C: local validation/status Retry | none | C: shared sheet status | none | Parent sheet | Trailing Save/Apply with Cancel | Global inheritance and per-device scope |
| Add Podcasts ([L24]) | C: result row changes to Subscribed; shared lower status | C: below input + Retry, red | none | Lower status above Close footer | Centered Find Your Next Podcast, neutral | none: utility panel | Search immediately trailing input; Close trailing footer | Example feed URL and OPML route |
| Now Playing ([L26]) | none | C: near playback controls + Retry | none | none | C: No Current Entry | none: independent window | Centered transport/seek; Close footer | Episode Details/Open Active Playlist |
| Settings ([L27]–[L30]) | Current value stays visible; no global success toast | C: beneath failed setting + Retry | C: bring-over preview if requested | Global Edit menu; no ordinary commit footer | none | none in captured panes | Live native fields and switches | OPML lifecycle, text size, connection, MCP scope |
| Listening Stats ([L31]) | none | none | none | none | Centered No Listening Time Yet, neutral | none | C: daily table switch for populated stats | Actual playback counts; seeking alone does not |
| Getting Started ([L32]) | none | none | none | none | none | Parent-scoped tutorial sheet when requested | Trailing Hide Getting Started | Three numbered, task-specific steps |

Mismatch · Named app-wide Undo/Redo migrates from upper trailing Library status ([L14], [L15]) to the strip above a modal footer ([L13], [L16]) and the bottom of Add Podcasts ([L24]). The shared [EditingFeedback] preserves wording/color and keeps recovery available, but an unrelated “Redo Edit View” in discovery adds noise and requires finding a different region. This is a cross-screen polish deduction, **not** evidence of FLOW-01 motion. A future refinement could give global edit history one predictable per-window status region while keeping field errors local. No second status-color or primary sheet-action placement mismatch was found in the captured states.

## Checklist

Coverage: **86.6%** (pass **123** · fail **6** · N/O **20** · N/A **19**). Verified applicable checks = 129/149.

Every one of the **168 current IDs** has exactly one verdict below. Pass means supported by the cited evidence channel; it does not claim a live test where only source exists. Native defaults are credited where the code preserves a standard implementation. Runtime-only clauses remain unobserved where native declarations cannot establish the result.

### Failures by severity

**Blockers: none established.**

**Major — SET-03: Settings does not size to its selected pane.** [L27]/[D27] and [L30]/[D30] have the same 640×768 pt window. In [L30 AX]/[D30 AX], Automation has a 680 pt scroll viewport; its content ends around y=556.5 pt in a window ending y=1074 pt, leaving roughly 500 pt unused. [Settings:37] and [Settings:113] force both forms to `min(680, availableHeight)` and report that fixed value to [Connection:69]. This fails the sizing clause; visible panes, selection and dimmed minimize/zoom pass. Principle: `stability`, `craft`. **Fix:** measure the selected pane's actual content height and cap it to usable screen height; the MCP-off form should need roughly 185–220 pt of content height at 100%, expanding when configuration/error content appears. Keep width, grouped controls and pane toolbar. **Actionable next target.**

**Major — APPEAR-04: the selected Dark Settings label fails contrast.** [D30] (and General in [D27]) renders an enabled selected label, not disabled text. Sampling the original 2× sRGB capture around Automation gives solid label ink approximately **#435FDD over #484747, ≈1.73:1**; the accent symbol includes **#3652D0, ≈1.44:1** on that background. The small regular label requires **4.5:1**, not the debated small-bold exception. By comparison, white on the configured Dark accent is ≈6.41:1 and normal custom secondary text is comfortably readable on the content background. [Accent] and [Connection] identify the native selected-tab/brand-accent interaction. Principle: `accessibility`. **Fix if ever revisited:** retain the brand AccentColor and give selected Settings text a semantic high-contrast foreground or another supported selected treatment reaching 4.5:1. **Owner expressly accepts this label; score it, do not target a palette reversal.** APPEAR-02 passes because the app respects the user's non-Multicolor accent.

**Major — WIN-05: essential transport and current position sit at the bottom edge.** [L03]/[D03], [L06] and [PlayerViews] put current Play/Pause, seek, speed/sleep and queue context in the bottom player. The top selected-Episode Play action is a different operation. A partly offscreen window can hide the current transport/position. Principle: `content-first`. **Fix if revisited:** add an upper-window equivalent for current transport/position while preserving the full bottom player and existing Controls menu. **Owner-fixed placement; not an improvement target.**

**Major — SYS-05: searchable Library content has no Spotlight index.** [Application] and [Build] register OPML and App Intents, but the current sources have no Core Spotlight searchable-item/indexing path. The app's own [L15] Search does not establish system search. Principle: `discoverable-commands`. **Fix:** index stable Episode/Podcast/Playlist metadata with deletion updates and links to app destinations; no Quick Look document requirement is inferred for the private Episode transfer type. **Known omission, owner explicitly defers it to last; not the next target.**

**Minor — SYS-02: no selected-feed Services provider.** A selected feed URL in another Mac app is a useful subscription input, but [Build] defines no NSServices provider and [Application] registers no service handler; [LibraryDrops] accepts that same information through drag/file routes only. No capture includes Services, so this is a source finding. Principle: `conventions`. **Fix:** add an “Add Podcast to PodList” service accepting a selected HTTP(S) feed address and opening the existing staged discovery/preview flow, without subscribing silently.

**Minor — SYS-03: app destinations cannot be linked.** [ShareLinks] produces publisher/enclosure HTTP(S) URLs; [Application:42] handles OPML file URLs only and [Build] declares no app URL scheme. Those share URLs do not address a saved View, a Playlist, or an Episode's app context. No deep-link UI was captured; source settles absence. Principle: `user-control`. **Fix:** support stable Library-scoped URLs for these destinations, with a Copy Link command and safe missing/offline-target handling; opening a link should navigate without starting playback.

### N/O

FLOW-01, FLOW-02, FLOW-04, KEY-01, DRAG-05, APPEAR-11, AX-04, START-01, WIN-03, RESP-01, RESP-02, FOOT-02, WIN-10, TOOL-02, SET-04, SET-06, DRAG-07, PTR-05, SYS-07, FOOT-01.

The principal gaps are full keyboard/assistive-input traversal; unprompted flow/focus measurements and minimum-size follow-ups; live resize/drag state; Settings lifecycle; Dock/minimized state; launch/resource/latency metrics. Detailed reasons appear in the ledger. No unavailable AX subrole or keyboard-equivalent attribute is treated as a defect: shortcut assignments are read from source.

### N/A

DLG-09, LIST-05, START-04, START-05, START-07, FILE-01, FILE-02, FILE-04, FILE-05, FMT-01, FMT-02, DATA-02, DATA-03, DATA-08, SYS-06, EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04.

Document-dependent IDs are N/A → library app with OPML interchange, not editable documents. Other N/A scope: no custom popover, nested disclosure tree, permission-prompt/account-creation feature, extension-dependent workflow, or menu bar extra. There is no missing-parent failure whose dependent checks are being counted a second time.

### Verdict ledger

Core checklist:

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | **N/O** | No measured late-completion flow, focus/scroll trace, or minimum-width follow-up run. Still captures cannot settle these checks. |
| FLOW-02 | **N/O** | No measured late-completion flow, focus/scroll trace, or minimum-width follow-up run. Still captures cannot settle these checks. |
| FLOW-03 | **pass** | [AddPodcasts] guards cancelled/stale searches with the submitted query; [ViewEditor] serializes live writes and keeps the current draft separate; [SettingsDrafts] versions pending writes. Source verdict, not a measured transition pass. |
| FLOW-04 | **N/O** | No measured late-completion flow, focus/scroll trace, or minimum-width follow-up run. Still captures cannot settle these checks. |
| FLOW-05 | **pass** | [L02], [D03], [L06]: sidebar, content and Inspector share the native top edge; the reading/detail planes deliberately have different internal content heights. |
| FLOW-06 | **pass** | [L08], [L14], [L24], [L31]; [Inspector] supplies “No Playlists”/“No show notes”; [PlaylistContent] supplies empty Entries/History. Static empty-state coverage; no observed vanishing ancillary help. |
| FLOW-07 | **pass** | [L11], [L13], [L16], [L22], [L25], [L34]: the shared [Sheet] keeps commit trailing in the pinned footer, with Cancel immediately before it. |
| KEY-01 | **N/O** | Commands and native controls provide keyboard routes, but the tour does not traverse every control with Full Keyboard Access. No evidence establishes absence of a trap everywhere. |
| KEY-04 | **pass** | [L11], [L13], [L17], [L24] show the expected initial field ring. [PlaylistSettings] and [AddPodcasts] explicitly focus inputs; native fields retain forward/backward traversal. |
| KEY-06 | **pass** | [Shortcuts], [PlaybackCommands], [LibraryCommands]: native key equivalents, mostly letters and arrows; no extra-modifier punctuation accelerator invented for an app-specific action. |
| KEY-07 | **pass** | [RowScroll] intercepts printable type-selection only; native list/scroll responders retain navigation keys. [PlaybackCommands] scopes documented Space playback to Library responders, preserving text/control Space. |
| KEY-08 | **pass** | [Connection] contains the in-app keyboard reference, including Space scope, Return, queue commands, text editing, and sheet cancellation; [Shortcuts] shares command notation. |
| DLG-01 | **pass** | [PlaylistSettings] reserves an alert for permanent deletion; reversible edits use [EditingFeedback]. [L34] is a consequence preview with a reversible Rewind, not a routine success alert. |
| DLG-02 | **pass** | [PlaylistSettings] permanent-delete alert names the Playlist, explains permanent removal, and uses Cancel/Delete Permanently with destructive styling; no vague Yes/No choice. |
| DLG-03 | **pass** | [PlaylistSettings] permanent-delete alert names the Playlist, explains permanent removal, and uses Cancel/Delete Permanently with destructive styling; no vague Yes/No choice. |
| DLG-04 | **pass** | [Sheet] assigns native cancel/default equivalents and trailing action placement; [PlaybackCommands] routes ⌘. to Escape in sheets, retaining disabled-state validation. |
| DLG-05 | **pass** | [PlaylistSettings] permanent-delete alert names the Playlist, explains permanent removal, and uses Cancel/Delete Permanently with destructive styling; no vague Yes/No choice. |
| DLG-07 | **pass** | [L11], [L16], [L22], [L34]: one commit and Cancel, with no Cancel/Done/Back trio. Read-only surfaces use Close. |
| DLG-09 | **N/A** | No custom popover editor in this build; native menus and task sheets are graded under their own checks. |
| CTRL-02 | **pass** | [L11 AX] exposes a native Clear on Played checkbox; [Sheet] preserves checkbox semantics. No parent/child checkbox hierarchy needs a mixed state. |
| CTRL-03 | **pass** | [L11], [L13], [L16], [L17], [L24]: separate persistent field labels; optional filter text/count/length fields are named optional in [ViewEditor]. General settings uses native labeled fields. |
| CTRL-04 | **pass** | [FormNumbers] parses locale-aware numbers; [ViewEditor] and [PlaylistSettings] validate names/ranges near their fields and disable invalid commit actions; [L13], [L17]. |
| CTRL-05 | **pass** | [Appearance] and [Glass] wrap native Button primitives, preserving pressed/default behavior; [L11], [D11] use style to distinguish Save from Cancel. |
| CTRL-06 | **pass** | [L03], [L33], [L26]: Play and Add are directly visible; [EpisodeEditing] menus group related Episode/queue operations, and speed/sleep menus have several related choices. |
| CTRL-07 | **pass** | [L15] names Search; [L18] says Search Episodes; [MacWindow] sets Search Library versus Search this list by destination. No displayed search history. |
| CTRL-08 | **pass** | [OPML] shows measurable import progress and Cancel; [EpisodeTransfer] reserves per-item placeholders; [AddPodcasts] has cancellable stale lookups and an indeterminate busy state. Timing remains unmeasured. |
| LIST-01 | **pass** | [L02], [L06], [L18]: native tables for Episode/Entry columns, short noun headings; [MacWindow] uses a native sidebar outline and single-column Views/Subscriptions lists. |
| LIST-02 | **pass** | [L02], [L06], [L18]: native tables for Episode/Entry columns, short noun headings; [MacWindow] uses a native sidebar outline and single-column Views/Subscriptions lists. |
| LIST-03 | **pass** | [MacWindow] and [PodcastScreens] use native Table sortOrder and value columns; [L18] shows the Published sort indicator. Ordered Playlist Entries intentionally do not offer column sorting. |
| LIST-04 | **pass** | [L03], [D03], [L06]: row separators, aligned date/time/state columns, wrapped or tail-truncated Episode titles, and tabular time digits. No narrow filenames require middle truncation. |
| LIST-05 | **N/A** | No expandable nested outline/disclosure tree; sidebar sections are shallow headings. Description expansion is not an outline descendant tree. |
| LIST-06 | **pass** | [L03], [L06], [D33]: navigation and content selection remain visibly distinct; native Picker selections and [PlaylistContent] selectedSegment represent choices. |
| LIST-07 | **pass** | [RowScroll] provides scoped incremental title matching; native List/Table selection and context-menu primaryAction provide open/details behavior in [MacWindow] and [PlaylistContent]. The completed [Tour] explicitly checks type-select and visibility. |
| DATA-01 | **pass** | [LibraryEditing] journals raw drafts in scoped defaults; [SettingsDrafts] journals originals/pending choices; [ViewEditor] keeps failed saves open and waits for queued writes on Cancel. [Application] flushes playback before quit. |
| DATA-04 | **pass** | [PlaylistEditing] records reversible named edits and multi-step reverse history; [EpisodeEditing] routes ⌘Z/⇧⌘Z to text undo or app history. [L13], [L14], [L16] visibly expose named Redo. |
| DATA-05 | **pass** | [MacWindow] uses revealRestoredEntries and selects the destination; [WindowRestoration] retains row anchors; [PlaylistEditing] reports restored Entries to reveal callbacks. |
| DATA-06 | **pass** | [MacWindow] saves per-scene browsing context; [WindowRestoration] archives destination, panes, selection, sort, tab and row anchor. [RowScroll] restores native scroll rows. Native WindowGroup owns frame restoration; this is a source-level verdict, not a relaunch test. |
| DRAG-01 | **pass** | [EpisodeTransfer] exports private Episode data plus public URL/text; [LibraryDrops] receives feed URLs/OPML files; [PlaylistContent] supports row transfers/reordering. Menu Add/Move and File Import provide alternatives. |
| DRAG-03 | **pass** | [EpisodeTransfer] commits dropped batches as one reversible edit; [PlaylistContent] reorders through [PlaylistEditing]. Incoming OPML/feed batches stage a preview before subscription changes. |
| DRAG-05 | **N/O** | Native drag APIs and error placeholders exist, but neither the captures nor app code establishes the actual onset image/threshold, inactive-window pickup, or one-motion background-selection behavior. |
| DRAG-06 | **pass** | [PlaylistContent] uses native List/Table row destinations and insertion positions; [EpisodeTransfer] reserves slow-drop placeholders/progress and calls selection/reveal callbacks. Autoscroll is delegated to the native row destination. |
| PTR-03 | **pass** | Native controls, title bars and split views; [RowScroll] and [Appearance] probes return nil from hitTest and do not intercept pointer targeting. No custom gesture remapping. |
| PTR-04 | **pass** | [IconLabel], [Inspector], [PlayerViews] and [MacWindow] give icon actions explicit names and help; title tooltips expose truncated text. Row action visibility is persistent; hover only changes emphasis. |
| APPEAR-03 | **pass** | [Appearance] defines opaque light/dark/high-contrast secondary/error/brand variants; [Glass] switches to opaque backgrounds and explicit strokes for Reduce Transparency or Increase Contrast, including both together. The separate selected-label contrast defect is APPEAR-04. |
| APPEAR-04 | **fail** | Major — selected Settings pane label in Dark is approximately 1.73:1; see detailed finding below. Owner accepted, not a target. |
| APPEAR-05 | **pass** | No custom positional/blur animations in the UI source; standard system transitions retain OS accessibility behavior. No app-owned animation overrides Reduce Motion. |
| APPEAR-09 | **pass** | [L03], [D03], [L26]: coherent SF Symbols for Play, Star, Share, Inspector and navigation, with matched text weights; [IconLabel] standardizes icon targets. |
| APPEAR-10 | **pass** | [L11], [D11], [D03]: distinct reading surfaces, native controls, hairline separators and a clearly separate glass control layer; no decorative motion. |
| APPEAR-11 | **N/O** | Settled stills do not show intermediate loading/transition frames or flashes. The tour supplies no frame-by-frame trace. |
| TYPE-02 | **pass** | [L03], [L11], [D27] use system body/caption type and deliberate Regular/Semibold/Bold weights; [TextSize] scales semantic content fonts. |
| TYPE-03 | **pass** | [L03], [L11], [D27] use system body/caption type and deliberate Regular/Semibold/Bold weights; [TextSize] scales semantic content fonts. |
| TYPE-05 | **pass** | [Sheet] allows multiline labels, scrolls reading content above a pinned footer; [TextSize] switches tables to wrapped reading rows when enlarged. [L19] has readable multiline description leading. |
| TYPE-06 | **pass** | [L19] full description has roughly 75–90 characters on typical full lines with normal system body leading; [L11] separates explanatory paragraphs with space. [Connection] constrains Help to a 540 pt reading column; no cramped prose style. |
| TYPE-07 | **pass** | [L11], [L19], [L32] and authored strings in [Connection]/[PlaylistSettings] use restrained emphasis, typographic apostrophes/ellipsis/dashes, and no long all-caps prose; publisher/user text is exempt. |
| TYPE-08 | **pass** | [L11], [L19], [L32] and authored strings in [Connection]/[PlaylistSettings] use restrained emphasis, typographic apostrophes/ellipsis/dashes, and no long all-caps prose; publisher/user text is exempt. |
| COPY-01 | **pass** | [L11], [L23], [L34]: Save, Play Next, Apply and Rewind name outcomes. [Connection] explains Views versus ordered Playlist Entries and uses Mac click/window language. |
| COPY-02 | **pass** | [Failures] maps internal diagnostics to practical recovery; [FailureFeedback] supplies persistent Retry; [ViewEditor] shows field-specific validation. Error evidence here is source, not a captured failure run. |
| COPY-03 | **pass** | [L08], [L14], [L24], [L31]: empties explain playback-created History, retention, search/feed entry, and listening-generated statistics. Empty Entries has Find Episodes in [PlaylistContent]. |
| COPY-04 | **pass** | [L11], [L22], [L25] share action capitalization; [Connection] uses consistent domain nouns. [PlayerViews]/[Inspector] help strings are short action fragments, with proper names retained. |
| AX-01 | **pass** | [L03 AX], [L06 AX], [L24 AX], [L30 AX] plus [IconLabel], [Inspector], [PlayerViews], [PlaylistContent] expose names, values, state and containment. Native text-field label declarations remain in source even where XCUI reports an empty label; live spoken output is unverified, not evidence of an unlabeled-control failure. |
| AX-02 | **pass** | [L06] labels Current Entry and the Active Playlist symbol; [L03] states In progress; [D33] adds selection count; errors have text/Retry. State does not depend on hue alone. |
| AX-04 | **N/O** | Menu/button alternatives are implemented, but no Voice Control or Switch Control run establishes assistive-input operation across the main task. |
| AX-05 | **pass** | [PlayerViews] exposes textual elapsed/remaining position, playback state and Play/Pause; [L26], [D26]. No critical interface cue is conveyed only by a sound. This does not assert publisher audio has transcripts. |
| START-01 | **N/O** | [MacWindow] has an Opening Library placeholder, but settled captures and tour duration do not establish prompt startup or unrelated-work availability during load. |
| START-02 | **pass** | [L32] is dismissible, specific onboarding; [LibraryEditing] persists its hidden state; [Connection] and the Help menu reopen useful task/shortcut help. No forced tutorial or account setup. |
| START-03 | **pass** | [L32] is dismissible, specific onboarding; [LibraryEditing] persists its hidden state; [Connection] and the Help menu reopen useful task/shortcut help. No forced tutorial or account setup. |
| START-04 | **N/A** | No permission-prompt feature in scope; audio playback needs no microphone access, and file access is user-selected through native panels. No purpose-string prompt to grade. |
| START-05 | **N/A** | No permission-prompt feature in scope; audio playback needs no microphone access, and file access is user-selected through native panels. No purpose-string prompt to grade. |
| START-06 | **pass** | [Connection] offers Start on This Mac without a server/account. [L27] does not gate local reading/playback behind sign-in. |
| START-07 | **N/A** | No account creation or hosted account lifecycle in this client. |
| EDIT-02 | **pass** | [EpisodeEditing] preserves native text undo/edit commands and supports selected Episode copy/Entry delete; [PlaylistContent] removal leaves the clipboard unchanged. [Menus] has standard Cut/Copy/Paste/Delete/Select All. |
| EDIT-05 | **pass** | [SelectionCommands] supplies descriptive title text and a URL representation, with URL copying in [ShareLinks]. Native text fields retain ordinary pasteboard behavior. |
| WIN-03 | **N/O** | Only typical window size is captured. Minimums, ViewThatFits and native overflow exist, but code alone does not settle every interacting toolbar/table/Inspector layout at 760 pt or half-screen. |
| TOOL-06 | **pass** | [LibraryCommands]/[MacWindow] provide sidebar and Inspector menu/shortcut routes; native sidebar toolbar toggle remains visible. Toolbar customization is absent by owner design; its conditional customization clause is inapplicable. |
| SIDE-03 | **pass** | [L03] has the sidebar toggle and Inspector button; [LibraryCommands] supplies Show/Hide Sidebar and [MacWindow] Show/Hide Inspector with keyboard equivalents. |
| SIDE-04 | **pass** | [L03], [L06], [L18], [D33]: source selection persists while table selection or podcast detail owns focus; source and detail correspond. |
| SET-01 | **pass** | [L27] contains global playback/retention/appearance; [L11], [L22], [L25] keep Playlist, Subscription and device Download Rules scoped to their objects. |
| RESP-01 | **N/O** | No five-run input/keystroke timings, refresh-rate trace, animation/hitch metrics or main-thread hang evidence. Successful XCUITest completion is not a latency benchmark. |
| RESP-02 | **N/O** | No five-run input/keystroke timings, refresh-rate trace, animation/hitch metrics or main-thread hang evidence. Successful XCUITest completion is not a latency benchmark. |
| FOOT-02 | **N/O** | No five-run input/keystroke timings, refresh-rate trace, animation/hitch metrics or main-thread hang evidence. Successful XCUITest completion is not a latency benchmark. |

Mac checklist:

| ID | Verdict | Evidence / scope |
|---|---|---|
| MENU-01 | **pass** | [Menus]: PodList, File, Edit, View, app-specific Podcast/Views/Episode/Playlist/Controls, Window, Help. Format is correctly absent without formatted editing. |
| MENU-02 | **pass** | [Menus], [LibraryCommands], [EpisodeEditing], [PlaybackCommands], [MenuActions] index the reachable object, transport, sort, visibility, import and recovery actions. Standard sheet commit/cancel remain on the modal surface; there is no separate hidden app command inventory. |
| MENU-03 | **pass** | [Menus] keeps unavailable actions dimmed and submenus openable; [PlaybackCommands]/[EpisodeEditing] use dynamic Play/Pause/Star/Unstar titles and native selected choices. |
| MENU-04 | **pass** | [Menus] has concise action labels, input ellipses, sparse icons and at most one app submenu layer; Picker inline headings are not nested submenus. |
| MENU-05 | **pass** | [Menus] has concise action labels, input ellipses, sparse icons and at most one app submenu layer; Picker inline headings are not nested submenus. |
| MENU-06 | **pass** | [Menus] exposes standard single-Option alternates Close All/Minimize All/Zoom All/Arrange in Front; their underlying tasks retain ordinary routes. |
| APP-01 | **pass** | [Menus] has About PodList in its own group; [Build] supplies version 0.1.0 and copyright to the native About panel. |
| APP-02 | **pass** | [Application] declares a native Settings scene; [Menus] lists Settings… and [L27]/[L30] show an independent settings window. The scene uses the standard ⌘, route. |
| APP-03 | **pass** | Native SwiftUI/AppKit fields and [Application] TextEditingCommands preserve system Services consumption; no Services suppression or custom field editor replaces them. Services entries were excluded from the supplied menu snapshot. |
| APP-04 | **pass** | [Menus] retains native hide/hide others/show all/quit selector items and standard order; [Application] leaves their standard shortcuts/actions intact. |
| FILE-01 | **N/A** | Library client, not an editable document app: OPML is an import/export interchange, not an opened working document. No Open Recent, Duplicate-document, printing or Page Setup feature. File New View/New Playlist and Import/Export remain available. |
| FILE-02 | **N/A** | Library client, not an editable document app: OPML is an import/export interchange, not an opened working document. No Open Recent, Duplicate-document, printing or Page Setup feature. File New View/New Playlist and Import/Export remain available. |
| FILE-03 | **pass** | [Menus] has native performClose:/closeAll: and standard tab/window management; [Application] uses actual WindowGroup/Window/UtilityWindow scenes, not simulated windows. |
| FILE-04 | **N/A** | Library client, not an editable document app: OPML is an import/export interchange, not an opened working document. No Open Recent, Duplicate-document, printing or Page Setup feature. File New View/New Playlist and Import/Export remain available. |
| FILE-05 | **N/A** | Library client, not an editable document app: OPML is an import/export interchange, not an opened working document. No Open Recent, Duplicate-document, printing or Page Setup feature. File New View/New Playlist and Import/Export remain available. |
| EDIT-01 | **pass** | [Menus] starts Edit with Undo and Redo Edit View; [EpisodeEditing] builds the operation name from app history or the focused text editor undo manager. |
| EDIT-03 | **pass** | [Menus] retains Edit Find and the standard text selectors; [Application] installs TextEditingCommands, and [LibraryCommands] exposes Search Library at ⌘F for the object-search task. |
| EDIT-04 | **pass** | [Menus] includes Spelling and Grammar, Substitutions, Transformations, Speech, Start Dictation and Emoji & Symbols; [Application] preserves native text commands. |
| FMT-01 | **N/A** | No formatted-text editor; no Format menu or formatting state required. |
| FMT-02 | **N/A** | No formatted-text editor; no Format menu or formatting state required. |
| VIEW-01 | **pass** | [Menus] exposes Enter Full Screen, Hide Sidebar/Inspector, sort and text-size appearance controls; window navigation stays in Window. |
| VIEW-02 | **pass** | [Menus] exposes Enter Full Screen, Hide Sidebar/Inspector, sort and text-size appearance controls; window navigation stays in Window. |
| WMENU-01 | **pass** | [Menus] contains native Minimize, Zoom, fullscreen/tiling and Bring All to Front with distinct native selectors; [Application] does not replace Zoom with custom full screen. |
| WMENU-02 | **pass** | [Menus] contains native Minimize, Zoom, fullscreen/tiling and Bring All to Front with distinct native selectors; [Application] does not replace Zoom with custom full screen. |
| WMENU-03 | **pass** | [Menus] separates scene-opening commands from the actual open Library window list; Add Podcasts utility panel and attached sheets are absent from the document list. Multi-window alphabetical ordering relies on the native menu. |
| HELP-01 | **pass** | [Menus] ends in Help with the system search field and PodList Help plus one separated Getting Started item; [Connection] supplies app-specific task/shortcut documentation. System Help-menu shortcut is retained. |
| HELP-02 | **pass** | [Menus] ends in Help with the system search field and PodList Help plus one separated Getting Started item; [Connection] supplies app-specific task/shortcut documentation. System Help-menu shortcut is retained. |
| KEY-02 | **pass** | [Shortcuts], [PlaybackCommands], [LibraryCommands], [EpisodeEditing]: standard text commands retained; frequent queue/star/played/create commands have menu-discoverable equivalents. Sidebar uses the familiar ⌃⌘S navigation binding; Control is not used for domain accelerators. |
| KEY-03 | **pass** | [Shortcuts], [PlaybackCommands], [LibraryCommands], [EpisodeEditing]: standard text commands retained; frequent queue/star/played/create commands have menu-discoverable equivalents. Sidebar uses the familiar ⌃⌘S navigation binding; Control is not used for domain accelerators. |
| KEY-05 | **pass** | Native menu key equivalents format modifiers; [Shortcuts] prints ⌥⇧⌘ in order and [Connection] uses ⌘+/⌘− notation. No foreign Ctrl/Cmd strings. |
| TEXT-01 | **pass** | Native TextField/SecureField-style text handling remains intact; [PlaybackCommands] explicitly routes editable Space/Return/⌘-arrows through interpretKeyEvents. [Application] TextEditingCommands retains substitutions/spelling/speech; no custom text engine bypasses Cocoa. |
| TEXT-02 | **pass** | Native TextField/SecureField-style text handling remains intact; [PlaybackCommands] explicitly routes editable Space/Return/⌘-arrows through interpretKeyEvents. [Application] TextEditingCommands retains substitutions/spelling/speech; no custom text engine bypasses Cocoa. |
| WIN-01 | **pass** | [L01], [L03], [D03 AX] show standard native traffic-light controls; [Application] declares resizable WindowGroup scenes and [Menus] contains their native actions. |
| WIN-02 | **pass** | [L03]/[D03] show gray unfocused sidebar selection beside emphasized table selection; [L11]/[D11] show a dimmed sheet parent. [Appearance] custom text preserves native backgroundProminence rather than forcing active highlights. |
| WIN-04 | **pass** | [L03 AX], [L06 AX], [L26], [L27], [L30] identify current view/pane. Long legitimate titles are retained rather than shortened merely to hit the approximate 15-character guidance. |
| WIN-05 | **fail** | Major — current transport/position live at the lower window edge. Owner-fixed bottom player; see detailed finding. |
| WIN-06 | **pass** | [Application] uses system window chrome/full screen; [Menus] retains native full-screen, zoom and window commands. No custom drag/fullscreen implementation replaces title-bar or traffic-light behavior. |
| WIN-07 | **pass** | [LibraryCommands] provides New Window and Open in New Window; [MacWindow] sidebar context menus expose the same route. [L24] and [L26] separate discovery/Now Playing for independent tasks. |
| WIN-08 | **pass** | [LibraryCommands] provides New Window and Open in New Window; [MacWindow] sidebar context menus expose the same route. [L24] and [L26] separate discovery/Now Playing for independent tasks. |
| WIN-09 | **pass** | [Application] uses system window chrome/full screen; [Menus] retains native full-screen, zoom and window commands. No custom drag/fullscreen implementation replaces title-bar or traffic-light behavior. |
| WIN-10 | **N/O** | No live resize capture, hitch trace, or edge/corner pointer testing. A layout implementation cannot establish frame timing. |
| TOOL-01 | **pass** | [L03], [L06], [L18]: leading title/Back, central Playlist section, trailing Episode actions/Inspector/Search; standard grouped symbol toolbar items in [MacWindow]/[EpisodeEditing]. Controls such as fields and checkboxes stay in the body. |
| TOOL-02 | **N/O** | Only typical window size is captured. Minimums, ViewThatFits and native overflow exist, but code alone does not settle every interacting toolbar/table/Inspector layout at 760 pt or half-screen. |
| TOOL-03 | **pass** | [L03], [L06], [L18]: leading title/Back, central Playlist section, trailing Episode actions/Inspector/Search; standard grouped symbol toolbar items in [MacWindow]/[EpisodeEditing]. Controls such as fields and checkboxes stay in the body. |
| TOOL-04 | **pass** | [L03], [L06], [L18]: leading title/Back, central Playlist section, trailing Episode actions/Inspector/Search; standard grouped symbol toolbar items in [MacWindow]/[EpisodeEditing]. Controls such as fields and checkboxes stay in the body. |
| TOOL-05 | **pass** | [L03], [L06], [L18]: leading title/Back, central Playlist section, trailing Episode actions/Inspector/Search; standard grouped symbol toolbar items in [MacWindow]/[EpisodeEditing]. Controls such as fields and checkboxes stay in the body. |
| SIDE-01 | **pass** | [L01 AX], [L03 AX]: 225 pt leading native sidebar, shallow sections, 0.5 pt system divider. [MacWindow] keeps sidebar font metrics under system control, records native width and uses a 180–320 pt range. Default-size critical navigation is visible above the player. |
| SIDE-02 | **pass** | [L01 AX], [L03 AX]: 225 pt leading native sidebar, shallow sections, 0.5 pt system divider. [MacWindow] keeps sidebar font metrics under system control, records native width and uses a 180–320 pt range. Default-size critical navigation is visible above the player. |
| SIDE-05 | **pass** | [L01 AX], [L03 AX]: 225 pt leading native sidebar, shallow sections, 0.5 pt system divider. [MacWindow] keeps sidebar font metrics under system control, records native width and uses a 180–320 pt range. Default-size critical navigation is visible above the player. |
| SIDE-06 | **pass** | [L01 AX], [L03 AX]: 225 pt leading native sidebar, shallow sections, 0.5 pt system divider. [MacWindow] keeps sidebar font metrics under system control, records native width and uses a 180–320 pt range. Default-size critical navigation is visible above the player. |
| SET-02 | **pass** | [L28], [D28], [Settings], [Appearance]: System is the default with optional Light/Dark, while sidebar metrics and transparency/contrast preferences remain system-owned. |
| SET-03 | **fail** | Major — General and Automation both force a 680 pt form viewport instead of sizing to pane content. See detailed finding; other clauses pass. |
| SET-04 | **N/O** | [Connection] uses a local selected-pane state and native Settings scene; captures establish pane titles/dimmed window controls, but neither source lifecycle nor the tour (which disables persistence) settles close/reopen and relaunch behavior. |
| SET-05 | **pass** | [Settings] General bindings save changes live; [GeneralEdits] journals pending writes/recovery. Appearance and text size apply directly. Object-specific sheets are separately scoped tasks with Save. |
| SET-06 | **N/O** | [Connection] uses a local selected-pane state and native Settings scene; captures establish pane titles/dimmed window controls, but neither source lifecycle nor the tour (which disables persistence) settles close/reopen and relaunch behavior. |
| DLG-06 | **pass** | [L11], [L16], [L22], [L34] and [Sheet] use parent-scoped sheets with capped scrolling reading regions and a pinned footer. [Application] supports independent Library windows; no app-modal editor replaces them. |
| DLG-08 | **pass** | [Application] declares Add Podcasts as UtilityWindow; [AddPodcasts] confirms an NSPanel and gives its input key focus only for the explicitly opened task. [L24] is modeless with a noun title; the Inspector is embedded, not an unowned floating palette. |
| CTRL-01 | **pass** | [L11], [L22], [L27], [L30] use native checkboxes, popups and grouped switches for their semantics; [PlaylistContent] uses a native select-one toolbar section control, and Settings has two visible tabs. |
| DATA-02 | **N/A** | No editable document/dirty-dot/Versions model → library app. Draft preservation, reversible edits and working context are graded under DATA-01/-04/-06 instead. |
| DATA-03 | **N/A** | No editable document/dirty-dot/Versions model → library app. Draft preservation, reversible edits and working context are graded under DATA-01/-04/-06 instead. |
| DATA-07 | **pass** | [Settings] creates NSOpenPanel/NSSavePanel with system browsing and appropriate OPML naming; [Build] registers OPML as an interchange Viewer. No custom file chooser or hidden-extension override. |
| DATA-08 | **N/A** | No editable document/dirty-dot/Versions model → library app. Draft preservation, reversible edits and working context are graded under DATA-01/-04/-06 instead. |
| DRAG-02 | **pass** | [EpisodeTransfer]/[PlaylistContent] distinguish within-Playlist move and cross-Playlist reference copy, evaluating Option during the native drop session. Copying an already-present unique Entry safely selects it without duplicating/removing it. |
| DRAG-04 | **pass** | [EpisodeTransfer] includes the ordered multi-selection in rich data before URL and text fallback; [LibraryDrops] loads all providers and prefers URL/file types before plain text. |
| DRAG-07 | **N/O** | Native drag APIs and error placeholders exist, but neither the captures nor app code establishes the actual onset image/threshold, inactive-window pickup, or one-motion background-selection behavior. |
| PTR-01 | **pass** | [MacWindow], [PlaylistContent], [EpisodeEditing] scope native context menus to clicked content and omit irrelevant commands, using at most three groups and no displayed keyboard equivalents in context menus. |
| PTR-02 | **pass** | [MacWindow], [PlaylistContent], [EpisodeEditing] scope native context menus to clicked content and omit irrelevant commands, using at most three groups and no displayed keyboard equivalents in context menus. |
| PTR-05 | **N/O** | Native row context menus are declared, but no open-context capture or custom source implementation establishes the visual target outline and preservation of a different existing selection on every list. |
| APPEAR-01 | **pass** | [L03], [D03], [Accent], [Build], [Appearance]: branded Multicolor AccentColor asset with named system accent behavior; no global fixed accent override. System/Light/Dark are handled centrally and semantic foregrounds protect pale accents. |
| APPEAR-02 | **pass** | [L03], [D03], [Accent], [Build], [Appearance]: branded Multicolor AccentColor asset with named system accent behavior; no global fixed accent override. System/Light/Dark are handled centrally and semantic foregrounds protect pale accents. |
| APPEAR-06 | **pass** | [L03], [D03], [L11], [L26] and [Glass] place regular glass on functional surfaces; opaque reading content, native toolbar/sidebar and no nested glass layer or clear glass behind small text. |
| APPEAR-07 | **pass** | [L03], [D03], [L11], [L26] and [Glass] place regular glass on functional surfaces; opaque reading content, native toolbar/sidebar and no nested glass layer or clear glass behind small text. |
| APPEAR-08 | **pass** | [L03], [D03], [L11], [L26] and [Glass] place regular glass on functional surfaces; opaque reading content, native toolbar/sidebar and no nested glass layer or clear glass behind small text. |
| TYPE-01 | **pass** | [L03], [L11], [L27] use 13 pt body, semantic 17 pt sheet/Inspector title and 10–12 pt metadata roles; [TextSize] scales content. Artwork initials are imagery, not minimum-sized UI text. |
| TYPE-04 | **pass** | [L06 AX] transport targets are 28×28 pt; [IconLabel] fixes app icon targets at that size. Native mini slider/small checkbox bezels are not treated as custom hit-region failures. [Sheet] keeps a consistent spacing rhythm. |
| AX-03 | **pass** | [TextSize] persists a 100–200% setting plus Bigger/Smaller/Actual Size; large-text Episode/Entry layouts wrap metadata below the title. [Sheet] allows scrolling/enlargement without removing the footer. Full-window enlarged captures were not supplied. |
| SYS-01 | **pass** | [Intents] exposes playback, search, Playlist entities, multi-Episode add and undoable marks; [Build] extracts intent metadata and [Application] wires live actions unconditionally. Shortcuts/Siri discovery/execution UI was not captured; this passes the source evidence channel, not a live integration test. |
| SYS-02 | **fail** | Minor — useful selected feed URL subscription has no purpose-specific Services provider; see detailed finding. |
| SYS-03 | **fail** | Minor — stable links to app Views/Playlists/Episodes are absent; publisher share URLs do not reopen an app destination; see detailed finding. |
| SYS-04 | **pass** | [Inspector]/[LibraryCommands]/[EpisodeEditing] use native ShareLink with supported HTTP(S) publisher URLs; [L18] shows a convenient Share Podcast control. No custom sharing dialog. |
| SYS-05 | **fail** | Major — no Spotlight content indexing. Known owner-deferred omission, not the next target. |
| SYS-06 | **N/A** | No extension-dependent browser, credential-filling or document Quick Action workflow is offered. Incoming URL/OPML handoff already uses native drop/file-open routes, graded under DRAG-01; absence of every possible extension is not itself a defect. |
| SYS-07 | **N/O** | Dock/minimized live content is absent from the evidence. Source has no custom Dock state, but the meaningful workload/live minimized behavior cannot be established from these paused-window captures. |
| EXTRA-01 | **N/A** | No menu bar extra or dual-presence quick-access utility; ordinary Dock/Library app by design. |
| EXTRA-02 | **N/A** | No menu bar extra or dual-presence quick-access utility; ordinary Dock/Library app by design. |
| EXTRA-03 | **N/A** | No menu bar extra or dual-presence quick-access utility; ordinary Dock/Library app by design. |
| EXTRA-04 | **N/A** | No menu bar extra or dual-presence quick-access utility; ordinary Dock/Library app by design. |
| FOOT-01 | **N/O** | No task-comparable bundle/launch/idle CPU/memory/WindowServer benchmark. Toolkit or tour wall time is not such a measurement. |

## Scores

One score covers both appearances except where noted. Behavioral categories use source plus the captured tour; runtime limits remain explicit. The visual scores are deliberate **Strong** placements, not an arithmetic average of checklist passes.

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.5** | Strong, near Exemplary: 13 pt system body, compact metadata and bold 17 pt object titles create consistent roles in [L03], [L11], [D03]. Multiline titles/description remain readable. Inspector artwork consumes room that could serve reading; enlarged full-window states are unverified. | hierarchy, craft, accessibility |
| Hierarchy | **8.2** | Strong: source → Episode → Inspector is immediate; one blue selection, quiet row actions, separate current-entry state ([L03], [L06], [D33]). The persistent broad player and duplicated history feedback add competing regions; owner bottom placement remains scored. | content-first, hierarchy |
| Spacing & density | **8.0** | Strong: native 225 pt source list, thin dividers, aligned date/time columns, 28 pt icon targets and regular sheet margins ([L03 AX], [L06 AX], [L11]). Density suits a personal library. The roughly 500 pt blank area in Automation and unverified small-window reflow keep it below Exemplary. | craft, conventions |
| Color & contrast | **6.8** (Light **8.5**, Dark **6.8**) | Light is restrained and readable; selected rows retain white labels in both appearances ([L03], [D03]). Dark selected Settings text is ≈1.73:1 in [D30], an enabled control label: APPEAR-04 imposes **6.9** maximum. Deep accent/label accepted by owner; semantic colors and opaque glass fallbacks lift the rest above generic treatment. | accessibility, color-restraint |
| Iconography | **8.6** | Strong, near Exemplary: SF Symbols consistently identify queue, Play, Star, Share and Inspector, with explicit labels/help and consistent targets ([D03], [L26], [IconLabel]). Some toolbar actions still need tooltip learning, and initials are fixture placeholders rather than evidence of publisher artwork craft. | conventions, plain-language, craft |
| Consistency & polish | **8.2** (stability **N/O**, Light/Dark; **partial: no measured flow run**) | Strong visible-state finish: common sheet shell/footer, proper empty states, multiple selection, dimmed parents and coherent glass ([L11], [D11], [L14], [D33]). Undo/Redo placement differs across surfaces. No stability band limit can be applied without measured transitions. | craft, stability |
| Clarity | **8.3** | Strong: explicit Clear on Played consequences, permanent-listening versus rewind distinction, scope labels and explanatory empties ([L08], [L11], [L25], [L34]). The Episode/Entry/Position model still needs onboarding, and global Redo copy on unrelated surfaces adds context work. | plain-language, feedback |
| Platform fit | **6.9** (source + captures; runtime portions unverified) | Raw Looks **8.6**, Behaves **8.0** → (8.6 + 2×8.0)/3 = **8.2**. Native frames/menus/fields, multiple windows, modeless discovery, undo, drag representations and Intents support Strong. **SET-03, WIN-05 and SYS-05 cap the final at 6.9**; Services and app deep links are smaller omissions. | conventions, discoverable-commands, stability |
| Interaction & feedback | **8.2** (source-supported; live assistive input and speed unverified) | Strong: named multi-step undo, draft journaling, scoped Space/text bindings, type-select, cancellable import and failure recovery ([L13], [L16], [PlaylistEditing], [SettingsDrafts], [PlaybackCommands]). Full Keyboard Access/Voice Control/Switch Control and response/hitch thresholds remain unproved, so no “instant” or fully accessible runtime claim. | forgiveness, keyboard-efficiency, feedback |
| **Overall** | **7.9 / 10** | **Strong as a listening/library tool, with a capped Mac-convention finish.** The primary task is clear and the frame belongs on a Mac. Fixed Settings pane sizing is the leading actionable weakness; selected Dark Settings contrast is the lowest scored category. Lowest score 6.8 → Overall ceiling **8.8**; 7.9 respects that limit. | content-first, conventions, character |

Platform signal inventory · L1 Native (frame), L2 Native (type), L3 Native (controls), L4 Native (menus), L5 Native (notation), L6 Native (sidebar/selection), L7 Native (symbols), L8 Adapted with sizing defect (Settings), L9 Adapted (personal-tool density), L10 Adapted (glass control layer), L11 Native (appearance). B1 Native (command index), B2 Native (Settings route), B3 Adapted (contextual shortcuts), B4 Native by source (text/Services consumption), B5 Adapted with FKA unverified (lists/type-select), B6 Native declarations with target outline unverified, B7 Adapted/source-supported (windows/restoration), B8 Adapted with pickup feedback unverified (drag), B9 Adapted but incomplete (Intents/share; missing Spotlight, Services provider and app links), B10 Adapted (named undo and Help), B11 N/O (resource/runtime footprint). No imported web/phone visual idiom is demonstrated. Fixed pane sizing and bottom essential transport break specific Mac checklist clauses; their familiar native drawing does not erase those failures.

What stands between this build and 9.0 · Fix SET-03 first; resolve the cross-screen history-placement polish and smaller integration gaps; then obtain measured minimum/half/typical-size flows, five-run latency/hitch data and live keyboard/assistive-input/lifecycle evidence. Spotlight stays last as directed. **A 9.0 cannot be justified under the current rubric while the owner-accepted APPEAR-04/WIN-05 and deferred SYS-05 major caps remain.** Owner acceptance excludes them from the next target, not from the score. Unobserved evidence is uncertainty, not an automatic score penalty or a fabricated failure.

## Next step

Target · **SET-03**, the major in Platform fit that is actionable after skipping the owner's accepted/deferred choices. There are no verified blockers. Color's low score comes from an accepted decision and is not chosen as the target.

Anti-pattern · No exact named catalog match. This is fixed-canvas Settings sizing, not “Settings-as-a-form” (changes already apply live). Closest comparisons: [PLAT-02 and SPACE-04 in Contrasts][Contrasts]; [Settings gallery][SettingsGallery]. Things' [General pane][ThingsSettings] spends its window on the visible settings rather than forcing an unrelated tall canvas. Copy the relationship between pane content and window height, not Things' layout or palette.

Root cause · Both pane views send a fixed 680 pt viewport height through a preference mechanism intended to carry measured content height. The shell responds to that number faithfully, so the sparse MCP-off pane cannot shrink.

Top candidate · Measure selected-pane intrinsic reading/form height; size the viewport to `min(measuredHeight, usableHeight)`, retaining the 640 pt width and native grouped rows. At the captured 100% text/MCP-off state, target roughly **185–220 pt of content height**, with margins included by the measured form. Grow for enabled MCP configuration/error content and 200% text; scroll only beyond available height. Preserve pane toolbar, selected state, live settings, and all signature elements. Principle: `craft`, `stability`, `adaptability`. Expected improvement: Platform fit and Spacing & density; possible regression: pane-switch window jumps or clipped enlarged text if measurement is stale. Keep the top window edge stable and recheck both panes/appearances.

Alternative · If grouped Form cannot expose a reliable intrinsic measurement, give the Automation reading content the existing [ContentSizedPanel] measurement architecture, retaining native controls and grouping. This is larger than the top candidate and should follow only if needed.

Validation for the implementer · Re-capture General and Automation with MCP off/on and error/recovery, at 100% and 200%, then the minimum/half/typical Library sizes. Confirm toolbar selection and titles, accessible fields and keyboard order, visible final controls, and the absence of repeated resize oscillation. Measure the ensuing flow rather than equating settled screenshots with stability.

Applied/compared · **Not applied:** this brief authorizes an audit and forbids code changes. No hill-climb step, accepted change or drift history is invented. All five character elements are **kept**, because the app was untouched; the proposed sizing fix preserves them.

Handoff · Only this report is authored. No UI test or build was run on the owner's machine. Beads context was read, but its database could not open (`openat LOCK: operation not permitted`); no task state was changed. The report's checklist inventory/counts and score caps were checked mechanically. Commit status is reported in the handoff reply; no merge or push is authorized.

[Brief]: </Users/sarvagnan/Documents/podlist-grading/brief-mac-round-14.md>
[Evidence]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14>
[Menus]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/menus.txt>
[RunLog]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/xcodebuild.log>
[CRITIQUE]: </Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md>
[Core]: </Users/sarvagnan/Documents/UI_Guidelines/guidelines/core-checklist.md>
[MacChecklist]: </Users/sarvagnan/Documents/UI_Guidelines/guidelines/mac-checklist.md>
[Rubric]: </Users/sarvagnan/Documents/UI_Guidelines/guidelines/rubric.md>
[Platform]: </Users/sarvagnan/Documents/UI_Guidelines/guidelines/platform-fit.md>
[Principles]: </Users/sarvagnan/Documents/UI_Guidelines/guidelines/principles.md>
[Exemplars]: </Users/sarvagnan/Documents/UI_Guidelines/guidelines/exemplars.md>
[Contrasts]: </Users/sarvagnan/Documents/UI_Guidelines/examples/contrasts.md>
[SettingsGallery]: </Users/sarvagnan/Documents/UI_Guidelines/examples/gallery/settings.md>
[ThingsSettings]: </Users/sarvagnan/Documents/UI_Guidelines/examples/screenshots/things/20-settings-general.png>
[Application]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListMac/PodListMac.swift>
[Intents]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListMac/AppIntents.swift>
[Build]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/scripts/build-mac-app.sh>
[Accent]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Resources/MacAssets.xcassets/AccentColor.colorset/Contents.json>
[MacWindow]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/MacWindow.swift>
[LibraryCommands]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/LibraryCommands.swift>
[SelectionCommands]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/SelectionCommands.swift>
[Shortcuts]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift>
[PlaybackCommands]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/PlaybackCommands.swift>
[Appearance]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/MacAppearance.swift>
[Glass]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/MacGlass.swift>
[TextSize]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/MacTextSize.swift>
[Sheet]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/PodListSheet.swift>
[EditingFeedback]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[EpisodeEditing]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift>
[Inspector]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/EpisodeInspector.swift>
[PlayerViews]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/PlayerViews.swift>
[PlaylistContent]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/PlaylistContentView.swift>
[PlaylistSettings]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift>
[Settings]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift>
[Connection]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/ConnectionViews.swift>
[SettingsDrafts]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/SheetSettingsDrafts.swift>
[GeneralEdits]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift>
[ViewEditor]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/ViewEditorScreen.swift>
[LibraryEditing]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/LibraryEditingModel.swift>
[PlaylistEditing]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift>
[WindowRestoration]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/WindowRestoration.swift>
[RowScroll]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/MacRowScroll.swift>
[AddPodcasts]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift>
[EpisodeTransfer]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/EpisodeTransfer.swift>
[LibraryDrops]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/LibraryDrops.swift>
[ShareLinks]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/ShareLinks.swift>
[FormNumbers]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/FormNumbers.swift>
[FailureFeedback]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/FailureFeedback.swift>
[Failures]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/FailureMessages.swift>
[OPML]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/OPMLImportContent.swift>
[IconLabel]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/MacIconLabel.swift>
[ContentSizedPanel]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/ContentSizedPanel.swift>
[PodcastScreens]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/PodcastScreens.swift>
[Tour]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/UITour/PodListUITour.swift>
[L01]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/01-subscriptions.png>
[L01 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/01-subscriptions.txt>
[L02]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/02-new-this-week.png>
[L03]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/03-episode-inspector.png>
[L03 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/03-episode-inspector.txt>
[L04]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/04-starred.png>
[L06]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/06-default-playlist.png>
[L06 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/06-default-playlist.txt>
[L07]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/07-entry-inspector.png>
[L08]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/08-history.png>
[L09]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/09-listening-timeline.png>
[L10]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/10-commute.png>
[L11]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/11-playlist-settings.png>
[L11 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/11-playlist-settings.txt>
[L13]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/13-new-playlist.png>
[L14]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/14-trash.png>
[L15]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/15-search-rice.png>
[L16]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/16-edit-view.png>
[L17]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/17-new-view.png>
[L18]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/18-podcast-market-hours.png>
[L19]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/19-description-expanded.png>
[L21]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/21-unsubscribe-disarmed.png>
[L22]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/22-subscription-settings.png>
[L23]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/23-add-to-playlist.png>
[L24]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/24-add-podcasts.png>
[L24 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/24-add-podcasts.txt>
[L25]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/25-download-rules.png>
[L26]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/26-now-playing.png>
[L27]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/27-settings-general-top.png>
[L28]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/28-settings-general-middle.png>
[L30]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/30-settings-automation.png>
[L30 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/30-settings-automation.txt>
[L31]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/31-listening-stats.png>
[L32]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/32-getting-started.png>
[L33]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/33-multi-selection.png>
[L34]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/34-rewind-summary.png>
[L34a]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/light/34a-timeline-rewind-button.png>
[D03]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/03-episode-inspector.png>
[D03 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/03-episode-inspector.txt>
[D11]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/11-playlist-settings.png>
[D26]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/26-now-playing.png>
[D27]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/27-settings-general-top.png>
[D28]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/28-settings-general-middle.png>
[D30]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/30-settings-automation.png>
[D30 AX]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/30-settings-automation.txt>
[D33]: </Users/sarvagnan/Documents/podlist-grading/mac-round-14/dark/33-multi-selection.png>
[Settings:37]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:37>
[Settings:113]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:113>
[Connection:69]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListUI/ConnectionViews.swift:69>
[Application:42]: </Users/sarvagnan/.t3/worktrees/PodcastClient/t3-29cb08ae-ab601e910815f966/apps/apple/Sources/PodListMac/PodListMac.swift:42>
