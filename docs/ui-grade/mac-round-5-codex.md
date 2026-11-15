# PodList Mac — round 5 independent Codex grade

Build reviewed: `6ffd0dafb0781dc5fd0dfa05c303e9c998d541a7`. Evidence-only review on 2026-11-16. Earlier grading reports were not opened. No application was launched, no desktop automation was used, and no product code was changed.

## Frame

- **Task:** Find podcast Episodes, arrange them as ordered Playlist Entries, and listen while keeping each Playlist’s Position and recovery history.
- **Target:** Native Mac app, SwiftUI/AppKit, macOS 26+; supplied captures run on macOS 27.2 in a Retina VM.
- **Posture:** Sovereign personal library and listening workspace, with background playback and transient editing tasks.
- **Audience:** Perpetual intermediates, with a newcomer path and optional automation for experts.
- **Nearest exemplar:** Things for calm, selection-based personal work and reversible organization; BBEdit for complete commands and preservation through interruption. These are behavioral references, not replacement visual identities.
- **Character:** Grouped Views/Playlists/Library source list; explicit Episode versus Entry vocabulary and per-Playlist Position; restrained blue initials artwork; persistent bottom transport (**owner-fixed location**); small islands of regular Liquid Glass around actions (**owner-fixed adoption**). The original Light/Dark captures are the baseline.

**Owner decisions:** Brand blue is the Multicolor AccentColor, not a forced override. Other accent choices must remain respected. Appearance offers System/Light/Dark. The toolbar is not customizable. Unsubscribe deliberately arms on its first click, disarms on a timer, and remains undoable. Spotlight is deliberately deferred until last. MCP is off by default; App Intents remain available. These decisions are graded, but are excluded when choosing the next target. In particular, SET-02 permits the Appearance choice; APPEAR-02 is assessed normally.

**Evidence notation:** `L` and `D` mean the supplied `light` and `dark` directories. State numbers refer to the exact stems in the [capture manifest][manifest]; each reference covers its PNG and companion TXT unless specified otherwise. Both appearances of all 35 states were inspected. Source keys in the checklist link to the reviewed files. The [audit procedure][critique], [core checklist][core], [Mac checklist][mac], [rubric][rubric], and [Mac platform signals][platform] govern this report.

## Flows

**Tasks traced through the supplied tour and code:**

| Task | State sequence / source route | What the evidence establishes |
|---|---|---|
| Browse and inspect | 01 → 02 → 03 → 04 → 05 | Leading navigation, persistent selection, table columns, single-selection Inspector and explicit empty Inspector. |
| Arrange and recover a Playlist | 06 → 07 → 08 → 09 → 34a → 34; then 10 → 11 → 12 → 13 → 14 | Entries/History/Timeline sections, rewind preview, staged settings, focused rename, new-name task, Trash. Rewind is cancelled in the tour; completion and Undo are source-reviewed. |
| Find and save a View | 15 → 16 → 17 | Scoped search, matching count, named conditions, optional fields, default disabled Create. Successful save and delayed writes are source-reviewed only. |
| Inspect and manage a podcast | 18 → 19 → 20 → 21 → 22 | Description disclosure, armed/disarmed Unsubscribe, adjacent action stability, scoped settings. The tour never unsubscribes. |
| Add content and listen | 23 → 24 → 25 → 26 | Playlist placement, modeless discovery, bulk rules, independent Now Playing. Playback is paused throughout; no audio-start latency evidence. |
| Configure, learn, bulk-select | 27 → 28 → 29 → 30 → 31 → 32 → 33 | Two native Settings panes, MCP consent explanation, empty stats, dismissible help and a multi-selection Inspector. |

**Widths:** Library is 1180 × 760 pt, at desktop frame `(370,190,1180,760)`, from 2360 × 1520 pixel captures. Other windows and sheets have their captured content sizes. The 1920 × 1200 pt desktop is not the Library’s window size. Minimum Library size in source is 760 × 500 pt; minimum, half-display and enlarged-text capture sets are absent.

**Appearances:** Light and Dark, app-selected. Increase Contrast, Reduce Transparency and Reduce Motion were assessed in code; no additional runtime capture set establishes their final rendering.

**Script:** [PodListUITour][tour]. **Timed runs/device:** supplied macOS 27.2 VM; no five-run latency distributions, keystroke timing, refresh-rate measurement, or hitch recording. **Measurements file:** no CRITIQUE-format flow CSV/JSON supplied. **Screenshot strips:** ordered state captures, not continuous or complete asynchronous flow strips.

There is useful, limited geometric evidence in the TXT files: in both appearances, 06/07/08/09 keep Entries at `(607,315,134,24)` and Play This Playlist at `(1017,316.5,35.5,21)`; their origin deltas are **0 pt**. In 19/20/21, the subscription control stays at `(725,427,123.5,24)` and Share Podcast at `(856.5,426,134.5,25.5)`; again **0 pt**, including automatic disarming. The tour contains corresponding assertions. This supports those transitions at this size, not every main-task transition at every required width. The arm lasts 15 seconds in this disposable tour identity and 4 seconds in production ([LE], UnsubscribeControl).

**Flow failures:** none claimed from an unmeasured transition. FLOW-01/02/03/04/06 and the stability sub-score remain N/O at whole-app scope. Source inspection identifies preservation and command defects under their owning non-flow checks below; it is not a substitute for the missing timing and transition measurements.

## Cross-screen inventory

`none` means none displayed in that captured state, not proof that the app lacks the state. Neutral means semantic primary/secondary text; accent means the current accent. Shared bottom transport is present on Library states, including dimmed parents behind sheets. Each row applies to L and D.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| 01 Subscriptions | none | none | none | none | none | none | Open chevron, row-trailing/accent; Add Podcasts in sidebar | Grouped by Download Rule, top/neutral |
| 02 New this week | none | none | none | none | Inspector center, “Select an Episode”/neutral | none | Row Play/Add, trailing/accent | View summary above table/neutral |
| 03 Episode Inspector | none | none | none | none | none | none | Play centered in Inspector; secondary glass action strip | Memberships/show notes below metadata |
| 04 Starred | none | none | none | none | Same empty Inspector as 02 | none | Same row actions as 02 | Starred filter summary/neutral |
| 05 All Views | none | none | none | none | none | none | View rows; New View toolbar plus | View names and counts/neutral |
| 06 Default | none | none | none | none | Empty Inspector | none | Play beside section picker, top | Current Entry label and ordinal |
| 07 Entry Inspector | none | none | none | none | none | none | Same Inspector Play and action strip as 03 | Position, memberships, notes |
| 08 History | none | none | none | none | Center, “No History”; explains playback versus manual marks/neutral | none | Same top Playlist Play | Empty-state paragraph |
| 09 Timeline | none | none | none | none | Empty Inspector | none | Rewind to Here, row-trailing/neutral | Event date and action |
| 10 Commute | none | none | none | none | Empty Inspector | none | Same top Playlist Play | Current Entry and per-Playlist Position |
| 11 Playlist Settings | none | none | none | none | none | none | Save, footer-trailing/accent; Cancel adjacent | Inline consequence copy under Clear on Played; trailing text clips |
| 12 Playlist rename | none | none | none | none | none | none | Save Name below field/accent; outer Save disabled | Same consequence copy as 11 |
| 13 New Playlist | none | none | none | none | none | none | Create Playlist, footer-trailing/disabled; Cancel | Persistent Name label |
| 14 Trash | none | none | none | none | Center, “Trash Is Empty”, restoration description/neutral | none | Navigation and search | Retention explanation above content |
| 15 Search rice | none | none | none | none | Empty Inspector | none | Create View above list/trailing; row Play/Add | Result count above list |
| 16 Edit View | none | none | none | none | none | none | Save, footer-trailing/accent; Cancel | Live matching count and named conditions |
| 17 New View | none | none | none | none | none | none | Create View, footer-trailing/disabled; Cancel | Matching count; explicitly optional filter fields |
| 18 Podcast | none | none | none | none | Empty Inspector | none | Subscribed/Share/Copy beside artwork; row Play/Add | Show Description; device Download Rule |
| 19 Expanded description | none | none | none | none | Empty Inspector | none | Same as 18 | Show Less; expanded text |
| 20 Unsubscribe armed | none | none | Inline “Unsubscribe”, red text/minus symbol | none | Empty Inspector | none | Same-position armed control | Accessible two-click hint in source |
| 21 Unsubscribe disarmed | none | none | none | none | Empty Inspector | none | Same-position Subscribed control/neutral | Same expanded description |
| 22 Subscription Settings | none | none | none | none | none | none | Save, footer-trailing/accent; Cancel | Inline Save/Cancel scope, inheritance explanation |
| 23 Add to Playlist | none | none | none | none | none | none | Play Next, footer-trailing/accent; Play Now/Last leading | Playlist picker identifies Active |
| 24 Add Podcasts | none | none | none | none | Center, “Find Your Next Podcast”; feed example/neutral | none | Search beside input; Close footer-trailing | Label above input, example RSS URL and import instructions |
| 25 Download Rules | none | none | none | none | none | none | Apply, footer-trailing/accent; Cancel | “Apply one rule…” above picker/neutral |
| 26 Now Playing | none | none | none | none | none | none | Transport centered; Done footer-trailing | Episode Details/Open Active Playlist below transport |
| 27 General top | none | none | none | none | none | none | Live inline settings | Import persistence explanation beside import controls |
| 28 General middle | none | none | none | none | none | none | Live inline settings | Text-size scope beside picker |
| 29 General bottom | none | none | none | none | none | none | Disconnect in connection section | Server address/neutral |
| 30 Automation | none | none | none | none | none | none | Enable MCP checkbox/top | Plain access consequences and device scope/neutral |
| 31 Listening Stats | none | none | none | none | Center, “No Listening Yet”; play an Episode/neutral | none | Standard window controls | Empty-state next step |
| 32 Getting Started | none | none | none | none | none | none | Dismiss, footer-trailing/accent | Three numbered task steps/neutral |
| 33 Multi-selection | none | none | none | none | none | none | Add/Star/Mark Played, Inspector-leading | Selection count and aggregate Length |
| 34 Rewind summary | none | none | Preview names target, resets and kept data/neutral | Explanation says reversible; no completed Undo shown | “None” for empty affected groups | none | Rewind, footer-trailing/accent; Cancel focused | Consequences above footer |
| 34a Timeline rewind button | none | none | none | none | Empty Inspector | none | Same row Rewind action as 09 | Same event descriptions |

**Source-only message inventory:** [EF] reserves a 32 pt Edit status lane at default text size, places persistent red errors and Retry beside the message, and keeps named Undo/Redo independent of the five-second success notice ([Notice]). [PF] adds drop progress/failure below that lane; [PV] puts playback recovery at the player and [GS] puts setting failures beside their fields. These are context-specific errors, not evidence that identical messages randomly relocate. No error/success completion captures demonstrate every placement.

**Mismatches:** the same visual “Save” family has different persistence boundaries across editors: 16’s existing View edits are written as they change, whereas 11’s options and 12’s Save Name remain volatile until the outer Save. The explicit Cancel/Save explanations justify a staged settings sheet, but not losing that stage on interruption (DATA-01). The two settings sheets also differ in their treatment of long explanatory copy: 22 fits its prose; 11/12 clip it (TYPE-05). Main task-sheet commit actions otherwise consistently occupy the trailing footer; 23’s placement actions and 32’s dismissal are deliberate different tasks. No additional unmeasured stability penalty is assigned for these observations.

## Checklist

**Coverage: 85.9%** (pass **110** · fail **18** · N/O **21** · N/A **19**). Verified applicable checks: 128 / 149. Failure totals: **2 blocker, 9 major, 7 minor**.

All 168 unique, currently defined IDs in the supplied core and Mac checklists receive exactly one verdict below. Reference-table rows and historical trait-map mentions are not extra checklist IDs. Severity is the checklist’s severity. Each defect is counted once under its owning check.

### Failures — blocker

| ID | Finding, evidence and concrete fix |
|---|---|
| DATA-01 | **Staged object settings can be lost on quit.** In [Playlist Settings source][PS:116], `draft` and `stagedName` are only `@State`. Save Name copies the name into those volatile values and deletes its durable rename keys ([PS:201]); persistence happens only in the outer apply. Subscription overrides are likewise only a sheet-local draft ([PF:300]). The termination delegate flushes playback, with no draft save or safe-save decision ([App:73]). Code-established reproduction: 11 → Rename as in 12 → type a different name → Save Name → quit before outer Save → relaunch/reopen; neither original durable rename input nor staged name survives. Captures show the entry points, not this quit sequence. **Fix:** journal the complete scoped Playlist/Subscription settings draft continuously, restore it when reopening, and clear it only after successful outer Save or explicit Cancel. `forgiveness`. |
| MENU-02 | **Some real commands are excluded from the searchable menu bar.** [Registry][MC:21] explicitly maps Cancel Import and Retry Failed Imports to `nil`, although [Import UI][OPML:35] and [OPML:47] expose them during long-running/recoverable work. The same exclusion affects several recovery/configuration helpers. [Menus][menus] confirms these commands have no menu entries. This is not a complaint that the empty-state tour never had an active import: the registry prevents entries in any state. **Fix:** give these substantive task/recovery commands menu locations and bind their existing validation; leave them visible and dimmed while unavailable. Ordinary dialog buttons need not clutter top-level menus to fix the demonstrated omissions. `discoverable-commands`. |

### Failures — major

| ID | Finding, evidence and concrete fix |
|---|---|
| APPEAR-04 | **Dark selections fail text contrast repeatedly.** Original [D02][D02] pixels contain white `#FFFFFF` text on sidebar selection `#9DB1FF`: **2.07:1**. [D03][D03] selected Episode text is white on `#798AD1`: **3.30:1**. These are active labels and primary content, not disabled controls. The sidebar remains below even the 3:1 bold exception; regular table text needs 4.5:1. Light L03’s counterpart is white on `#193CAD`: **9.17:1**. The source’s [on-accent correction][Appearance:56] handles default buttons, but selected row foregrounds inherit primary/white ([W:98], [W:526]). **Fix:** retain system accent selection fills and choose a readable selected foreground, including all child labels/symbols, using the resolved fill and active/inactive appearance; verify 4.5:1 in normal and high-contrast modes and across user accents. APPEAR-02 still passes. `accessibility`. |
| TYPE-05 | **Playlist Settings clips consequential prose at its supplied size.** [L11][L11], [D11][D11], [L12][L12]/[D12][D12] cut the sentence ending “next becomes Played” at the sheet edge. In D11 TXT the sheet ends at x=1210 pt while that text frame ends at **1222.5 pt**, a **12.5 pt** overrun; the corresponding Light frame is the same. [PS:179] puts the paragraph inside a columns Form at fixed width 500, with no constrained wrapping; [GS:53] already notes that columns Forms can exceed proposed widths. **Fix:** put explanatory paragraphs in a width-constrained wrapping stack outside the columns Form (or use grouped form layout), and verify default/enlarged text at all required sizes. This clipping is counted here, not again as WIN-03. `adaptability`. |
| DATA-06 | **Arranged sidebar width is not restored.** [W:114] explicitly omits width observation/restoration after a layout problem; `.navigationSplitViewColumnWidth` always offers ideal 225. [Restoration] stores a sidebar field, but this sidebar never reads a restored ideal or updates that field. Destination, selection, sort, Inspector width and row anchors have real restoration support; the gap is specifically the user’s sidebar width. [L01][L01] shows the pane but not a relaunch. **Fix:** restore the persisted initial width once and observe settled user width independently of live sizing feedback. `stability`. |
| DRAG-01 | **OPML import cannot enter through Finder/Dock file opening.** [Drops] accepts `.opml` file URLs dropped on Library and [GS:364] supports the menu chooser, but the [bundle builder][Build:26] registers no OPML document type, and [App] has no file-open handler. Consequently the file workflow has window-drop and chooser routes without the relevant Finder/Dock import route. Capture 24 displays discovery, not proof of Dock behavior; this finding is from the complete registration/entry-point code. **Fix:** register OPML as an importable type and route file-open events into the existing non-destructive import preview; a document editor is unnecessary. `direct-manipulation`. |
| DRAG-06 | **Slow Episode drops have progress but no destination placeholders.** [Transfer:92] prepares remote references into a private array, adding Playlist Entries only after preparation; [PF:12] draws count progress above the content. [PC:49] builds rows solely from committed Entries, so the waiting destination has no per-item placeholders. Selection/reveal is implemented after successful insertion and is credited. No drag-in-progress capture exists. **Fix:** reserve temporary pending rows at the destination while the batch resolves, expose their status accessibly, and replace/remove them on success/cancellation/failure without changing source order. `feedback`. |
| PTR-01 | **Object context menus retain irrelevant disabled commands.** [EF:19] reuses EpisodeActionItems in row contexts; empty membership/chapter menus are disabled rather than omitted, and [Downloads:49] always creates all four download actions, disabling the three inapplicable states. [W:508] and [PC:104] install this menu on the objects. The top-level menu’s dimmed entries are correct; row contexts should be narrower. **Fix:** let the shared action inventory filter inapplicable context actions while retaining dimmed menu-bar commands. `discoverable-commands`. |
| CTRL-06 | **Inspector Share is a two-command pull-down.** [Inspector:187] contains only Share Episode and Copy Link; [L03][L03]/[D03][D03] show its Share glyph among Inspector actions. The Mac reference table recommends at least three pull-down items, which the checklist applies as its Mac count criterion. **Fix:** make the glyph a direct native ShareLink; retain Copy Link in the Episode/context menus, or expose it directly if needed. Do not add a filler third command. `discoverable-commands`. |
| WIN-05 | **Essential transport is at the window’s bottom edge.** [L01][L01], [L06][L06] and [PV:6] put Play/Pause, seek, skip and active-Playlist navigation in the bottom bar, beyond limited status. They can leave the display when a window is moved partly below it. **Owner-fixed; not a target.** A criterion-compliant alternative would be a reachable upper transport or equivalent persistent upper controls; this report does not propose relocating the chosen player. `content-first`. |
| SYS-05 | **Episodes and Playlists are not indexed for Spotlight.** Neither [App], [Intents] nor the reviewed source contains a searchable-item index; AppEntity queries and App Intents metadata are separate capabilities. No Spotlight capture was supplied. **Owner-deferred; not a target.** When that scheduled work is reached, index meaningful titles, podcast/Playlist metadata and stable identifiers, and delete stale entries. There are no custom user documents requiring a separate Quick Look importer here. `discoverable-commands`. |

### Failures — minor

| ID | Finding, evidence and concrete fix |
|---|---|
| APP-01 | **About has no authored copyright information.** [Menus][menus] supplies About PodList in its own group, and [Build:26] supplies version 0.1.0/1, but neither the plist nor [App] supplies copyright/About overrides. **Fix:** add the actual copyright metadata so the standard About panel can show it. No owner string is invented here. `conventions`. |
| DATA-05 | **Undo reports restoration without revealing it.** [PE:110] reverses data and names restored Playlists in status text; it does not issue a selection/scroll/navigation reveal request. [Scroll] restores the existing anchor, rather than the restored object. Undoing removal of an offscreen Entry can therefore leave the recovered Entry offscreen. **Fix:** return affected object IDs from Undo and reveal/select the restored content in the relevant existing window, preserving the person’s context when no reveal is necessary. `feedback`. |
| HELP-02 | **Supplementary Help lacks separation.** [Menus][menus] shows the system search field, PodList Help, then Getting Started without a separator; [App:44] emits those two buttons consecutively. Product help and native command search are credited. **Fix:** insert a separator between primary Help and the supplementary tutorial. `hierarchy`. |
| PTR-04 | **Some icon-only actions lack explicit action tooltips.** The Podcast page’s gear is an icon-only Subscription Settings button without `.help` ([PF:121]); compare the explicit helpful tooltips on the Inspector and transport. [L18][L18]/[D18][D18] establish the unlabeled visual glyph. Its accessible button name is present, so this is not AX-01. **Fix:** supply a concise action tooltip for this gear and audit other body icon-only controls in the same way. `discoverable-commands`. |
| SET-04 | **Last Settings pane is not persisted across app sessions.** [Settings:57] initializes `pane` as `@State = "general"`, with no durable last-pane storage. The captured General/Automation titles are correct, and reopening a retained window within one process may keep the pane; a new app session resets it. **Fix:** persist the selected pane, restoring it only when Settings is explicitly reopened. `stability`. |
| SYS-02 | **No selection-based feed Service is registered.** Searching/subscribing from selected feed-address text is relevant to the app, but [Build:26]/[App] provide no NSServices declaration or service handler. This is provision of a Service, separate from consuming native Services in text fields. **Fix:** offer a narrowly scoped “Add Podcast to PodList” text/URL Service that opens the existing preview/discovery route. `conventions`. |
| SYS-03 | **Internal objects have no app deep links.** Publisher URLs can be shared, but [Build:26] registers no app URL scheme/universal-link association and [App] has no open-URL routing for saved Views or Playlists. **Fix:** add stable routes for addressable objects, resolve missing IDs safely, and expose Copy Link for those routes. `user-control`. |

### N/O

FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-06, KEY-01, KEY-06, LIST-07, DRAG-05, DRAG-07, APPEAR-11, WIN-03, WIN-10, TYPE-04, AX-03, RESP-01, RESP-02, FOOT-02, FOOT-01, SYS-07, PTR-05.

The flow IDs lack complete delayed transitions at all required widths; existing static pairs do not prove input/focus preservation or every asynchronous completion. Full Keyboard Access, international layout operation, native type-select, inactive-window drag initiation and native secondary-click target outlines are not settled by the supplied tree/code. Native API use establishes a route, not every resulting session behavior. Drag-image onset/destination cues, actual resize frames, complete enlarged-text/hit geometry, transient render coherence, Dock/minimized live content and timing/resource thresholds need their respective running observations. No inference of failure is made from the absence of those observations.

### N/A

| ID | Reason |
|---|---|
| DLG-09 | No custom popover workflow; the shown pickers and Share controls use menus/system sharing. |
| CTRL-02 | No parent/child checkbox hierarchy; independent choices retain native checkbox or switch semantics. |
| LIST-05 | No expandable outline-row hierarchy; the Podcast description button is prose disclosure, not descendant rows. |
| START-04 | No protected camera/microphone/photo/contact/location feature requiring a system permission request. |
| START-05 | No such permission request or purpose string → START-04. |
| START-07 | No in-app account creation/deletion product; optional server address is not account enrollment. |
| FILE-01 | Library app rather than a creator/opener of independent editable documents; import/export has task-specific commands. |
| FILE-02 | No document-opening model or recent-document list; OPML is imported into the Library. |
| FILE-05 | No printing task offered. |
| FMT-01 | No formatted-text editor. |
| FMT-02 | No supported formatted-text commands. |
| DATA-02 | No user document dirty-state model; Library edits are transactions and object sheets are reviewed under DATA-01. |
| DATA-03 | No autosaved user documents or document versions; Library Undo/Trash/Timeline are the recovery model. |
| DATA-08 | No independent editable file documents, document tabs or Save As model. |
| SYS-06 | Assessing each technology: no credential filling, Safari-specific operation or Finder Quick Action task; feed intake is URL/file drop and clipboard. A separate extension is not inherently required by these workflows. Missing useful Services and internal linking are assessed under SYS-02/03. |
| EXTRA-01 | No menu bar extra by design. |
| EXTRA-02 | No menu bar extra → EXTRA-01. |
| EXTRA-03 | No menu bar extra → EXTRA-01. |
| EXTRA-04 | Sovereign library, not a utility offering interchangeable Dock/extra modes. |

### Passes

These are evidence-backed passes, including explicit source-based verdicts where the brief permits code to settle the check. They do not claim the grader executed the described native behaviors.

| ID | Evidence |
|---|---|
| FLOW-05 | Full-height sidebar/detail/Inspector boundaries align; different internal heading/artwork offsets serve distinct roles (02, 03, 06). No comparison-panel unit requires equal internal content heights. |
| FLOW-07 | Task sheets 13/16/17/22/25/34 use the trailing pinned commit footer; [Sheet] provides that common placement. 06/08/09 keep the Playlist action beside the section picker. |
| KEY-04 | Native field order and focus rings; rename receives focus in 12, and [Tour] verifies typing into it without a click. [PS] uses FocusState; discovery and Welcome focus their main fields. |
| KEY-07 | [Help] documents Space as transport and Return as Play Now; [Playback] protects editing and sheet defaults. Native List/ScrollView retain other scrolling keys; no app interception of Page/Home/End. |
| KEY-08 | [Help] contains an accessible selectable shortcut reference, including bare Space/Return behavior and exceptions; [Shortcuts] centralizes notation. |
| DLG-01 | [PS] deletes to recoverable Trash without confirmation; only permanent deletion confirms. Rewind 34 is a consequential multi-part preview, not a routine delete nag. |
| DLG-02 | [PS] permanent-delete title names the Playlist; explanatory text identifies lost History/Timeline and kept Episodes/log. Short, specific situation. |
| DLG-03 | [PS] confirmation has Delete Permanently and Cancel; no Yes/No ambiguity or excessive buttons. |
| DLG-04 | [Sheet] puts commit trailing and provides native cancelAction. [Playback] routes Command-period into the key sheet instead of stopping audio; 22 Escape/Return paths are in [Tour]. |
| DLG-05 | [PS] permanent deletion is explicitly destructive and has safe Cancel; normal deletion is recoverable. Rewind 34 is explained and undoable, not an unexpected destructive default. |
| DLG-07 | The shared [Sheet] uses Cancel plus a task verb, or a sole dismissal in 32; no Cancel/Done/Back triad. |
| CTRL-03 | Persistent Name labels in 12/13/17; named numeric fields and visibly optional filters in 16/17. 24 retains its label above the field. Welcome uses LabeledContent; no sensitive credentials are collected. |
| CTRL-04 | [Numbers] uses locale-bound number format styles; View duration errors attach to their fields ([ViewEditor]); [GS] validates nonnegative seconds, while native pickers constrain enumerated values. |
| CTRL-05 | Custom styles wrap native Button rather than consuming gestures ([Glass], [Appearance]); ordinary buttons keep pressed/disabled semantics. Prominence is a style, not a giant rectangle. |
| CTRL-07 | Search Library versus Search this list versus Search Episodes is established by destination/title and [W] prompts. 15 shows scoped results. No search-history list needs clearing. |
| CTRL-08 | [OPML] reports completed/total with cancellable import and explicit resume behavior; [Downloads] uses measurable progress fractions and Cancel. Unknown feed reads use ProgressView. Timing is separately N/O. |
| LIST-01 | Episode and Entry data use native multi-column Table; sidebar uses List/outline. Source [W], [PC], [PF]; captured 02/06/18 show the resulting structure. |
| LIST-02 | Episode, Entry, Published, Position, Length and State are consistent noun headings; single lists have window/section context (01–10). |
| LIST-03 | [W]/[PF] bind native sortable Table columns to persistent sortOrder; the second header click reverses through native comparator semantics. Entry order intentionally is not a competing column sort. |
| LIST-04 | Hairline row separators, aligned date/time/state columns and two-line titles keep 02/06/18 trackable without mandatory striping. No narrow filenames are presented as content columns. |
| LIST-06 | Sidebar persists the current destination; 33 exposes table multi-selection; native pickers/segments expose chosen values. 08/09 show section state clearly. |
| DATA-04 | [PE] and domain [History] record named reversible changes and reversals; [EF] routes Command-Z/Shift-Command-Z to app history or the active text editor. Subscription/View operations use that shared history ([LE]). |
| DRAG-03 | [Transfer] routes successful drops through named reversible edits; [PE] reorders via reversible Changes. [Drops] only stages an import preview before its explicit import; committed subscriptions have undo/reversal. |
| PTR-03 | Native sliders, tables and buttons keep their standard pointer gestures; [PF] uses simultaneous gestures to disarm Unsubscribe without replacing native row handling. No custom cursor or wheel hijack exists. |
| APPEAR-03 | [Glass] jointly handles Reduce Transparency or increased contrast with an opaque system surface and border; [Appearance] supplies separate Light/Dark/high-contrast palettes. This is a code verdict for preference handling, not a measured high-contrast pixel certification; actual selection contrast is failed once under APPEAR-04. |
| APPEAR-05 | No custom withAnimation/animated positional effect is introduced; native presentation/control animation remains system-owned. [Glass] changes material for accessibility instead of creating custom depth motion. |
| APPEAR-09 | SF Symbols form a consistent family for play, skip, Share, Trash, disclosure and navigation (01, 03, 18, 26); [Icon] supplies named, sized symbols. |
| APPEAR-10 | White/dark reading surfaces separate content from the narrow functional glass layer (03/26); [Glass] supplies an opaque bordered fallback. No decorative moving background competes with listening. |
| TYPE-02 | System Regular/Semibold/Bold roles, without thin-weight body text or mixed font families. Visible headings and metadata in 01–34 support the hierarchy. |
| TYPE-03 | [TextSize] uses system semantic fonts for body/caption and scales them; monospaced type is limited to times/configuration. Artwork initials are identity, not body text. |
| TYPE-06 | Three sampled full lines contain 73 characters each: 34’s “Later adds…” through “…since”, 34’s “this moment…” through “…can be”, and 32’s “Views find…” through “…the match”. The short final lines are excluded. These fit the 45–90-character measure; semantic body/caption leading meets 120%, and paragraphs use spacing without indents. The clipped paragraph is owned by TYPE-05. |
| TYPE-07 | App-owned headings use ordinary case; no long all-caps passage, combined bold-italic emphasis or non-link underline is introduced. DF/MH/SB are short identity initials rather than prose. |
| TYPE-08 | Authored UI strings use the ellipsis character, curly possessives and real range/minus punctuation ([Help], [PC], [PS]); URLs, identifiers and supplied podcast content remain literal. |
| COPY-01 | Specific Create, Save, Rewind, Restore, Play Next/Last and Copy Feed Address verbs; the Episode/Entry/Playlist distinction is explained by [Help] and shown in the state labels. Inner Save Name is a persistence-boundary concern already recorded under DATA-01. |
| COPY-02 | [Failures] converts transport/parser/database diagnostics into authored, blame-free recovery text; [Feedback] offers Retry beside the error. [ViewEditor]/[GS] attach form errors to the relevant field. |
| COPY-03 | 08 explains how History is created, 14 explains restoration, 24 teaches name/feed input, 31 says play an Episode, and 02 explains the Inspector selection. Links and action names identify destinations. |
| COPY-04 | Menu/button title styles and short explanatory sentences are internally consistent with the app’s domain nouns; tooltips are action fragments. Missing tooltip presence is PTR-04, not a second copy defect. |
| AX-01 | Native controls expose names/roles/values in the supplied TXT; [Inspector] gives distinct Play/Star/Played/download labels, [PV] names the seek slider and [Feedback] posts announcements. No confirmed missing core control name/state is present. Live VoiceOver reading order is not claimed. |
| AX-02 | Active/current state has text and speaker/play symbols; Clear on Played uses filled/outline erasers plus accessible text; armed Unsubscribe uses its word/minus icon as well as red. Errors are text with recovery, not color alone. |
| AX-04 | Row movement has menu Move Up/Down, seek has Go to Time and a native slider, and all core gesture actions have labeled Button/menu alternatives. Source preserves native accessibility actions; exact Voice Control/Switch Control session behavior is not claimed. |
| AX-05 | Playback state, title, position, chapters and error information are visual/textual, with Play/Pause/Stop. No essential app warning is audio-only and no decorative autoplay motion exists. Publisher-provided speech content is not mistaken for app UI warning audio. |
| START-01 | [W] displays Opening Library while starting; [AppModel] loads local content before continuing synchronization. Source includes loading/empty/failure alternatives rather than a permanently blank launch. |
| START-02 | [LE] stores tutorial dismissal; [Help]/[GS] reopen Getting Started. Starting locally is available and setup is not a mandatory tutorial sequence. |
| START-03 | 32’s three steps teach Library/View/Playlist tasks and dismiss directly; 08/14/24 teach the immediate empty-state task. [Help] provides persistent relevant help. |
| START-06 | [Welcome] offers Start on This Mac alongside optional server connection. No account signup, password form or unrelated registration gate is imposed. |
| EDIT-02 | Native text editing retains system Cut/Copy/Paste; [W]/[PC] provide selection copy and Entry deletion, leaving the clipboard unchanged on Delete. [EF] directs edit history to the text insertion context when present. |
| EDIT-05 | [Selection] provides descriptive plain text and URL pasteboard representations; [Share] copies public URLs. Show notes and feed addresses are selectable/copyable; there is no styled-text destination requiring Paste and Match Style. |
| TOOL-06 | Native SidebarCommands and [Commands] expose Inspector show/hide at Option-Command-I; visible toolbar buttons bring both panes back. No hideable custom toolbar is offered. Noncustomizability is an owner decision, not a missing recovery route. |
| SIDE-03 | Default SidebarCommands supplies View > Show/Hide Sidebar and its keyboard equivalent; native split view supplies the visible toggle. Inspector has a toolbar button plus its menu shortcut ([Commands]). |
| SIDE-04 | 01–10 show navigation selection matching content; opening a Podcast intentionally retains its parent Subscriptions highlight ([W], [Model]). It is a parent destination, not a contradictory unrelated selection. |
| SET-01 | 27–30 house global Playback/Appearance/connection/automation; 11 and 22 keep object-specific rules close to the Playlist/Subscription. File retains import/export entry points. |
| MENU-01 | [Menus] preserves App, File, Edit, View, domain menus, Window, Help; no Format is needed. Domain ordering separates Podcast, Views, Episode, Playlist and Controls. |
| MENU-03 | [Menus] shows disabled actions remaining visible; [Commands]/[EF]/[Playback] supply dynamic titles and validation. Speed/Sleep/section toggles use native checked values. Recovery command absence is MENU-02. |
| MENU-04 | Concise verb labels and ellipses on Add, Import/Export, settings, rename, Go to Time and rewind-preview tasks; immediate Play/Star/Move/Open commands need no further input ([Menus]). |
| MENU-05 | App-authored menus are native, mostly text-only and at most one submenu deep; [EF] placement lists do not nest inside another app submenu. OS-generated Window arrangements are not app-authored extra nesting. |
| MENU-06 | Native Close All/Minimize All/Zoom All/Arrange in Front alternates appear in [Menus] and retain the system single-Option convention. No app-defined multi-modifier alternate hides a command. |
| APP-02 | Native Settings scene in [App]; [Menus] contains Settings… and 27–30 show the movable, separate Settings window. The system command supplies Command-comma. |
| APP-03 | [App] keeps native TextEditingCommands and standard App Services; [Welcome]/[ViewEditor]/[GS] use native TextField rather than an isolated custom editor, and [Help] text is selectable. Services was excluded from capture by the brief, so this is code-based inheritance, not a claimed Services execution. |
| APP-04 | [Menus] has Hide PodList, Hide Others, Show All, Quit PodList in native order; [App] retains the standard app command group and termination path. |
| FILE-03 | [Menus] uses native Close/Close All; [Tour] closes and reopens Add Podcasts with Command-W. No replacement close implementation changes document/window meaning. |
| FILE-04 | The supported export clause passes: [GS] uses NSSavePanel and writes OPML while leaving Library open. No editable-document Duplicate action applies. |
| EDIT-01 | [Menus] puts Undo/Redo first; [EF] names app operations from [PE] and forwards native text undo titles while editing. |
| EDIT-03 | [Menus] preserves the native Edit > Find submenu; [Commands] adds the separate object-oriented Search Library route without renaming text Find commands. |
| EDIT-04 | [App] installs TextEditingCommands; [Menus] includes spelling, substitutions, transformations, Speech, Dictation and Emoji & Symbols. |
| VIEW-01 | [Menus] contains standard full screen, sidebar/Inspector, text size and sort/view controls; [App] retains native window behavior. |
| VIEW-02 | [Commands] dynamically names Show/Hide Inspector; SidebarCommands owns sidebar state; Window navigation remains in Window, while appearance/view commands live in View. |
| WMENU-01 | [Menus] has separate Minimize, Zoom and Bring All to Front, plus native window management. |
| WMENU-02 | [Menus] connects Zoom to performZoom: and Full Screen separately; [App] uses standard resizable WindowGroup without replacing the zoom algorithm. |
| WMENU-03 | [Menus] lists the active Library under standard open windows; [App] supplies named singleton auxiliary scenes rather than synthetic duplicate document entries. Sheets are absent from the open-window list. |
| HELP-01 | Trailing Help exposes product-specific [Help], Getting Started and the native system help-search surface. The app does not replace the system Help-menu keyboard equivalent with another action. |
| KEY-02 | [Shortcuts]/[Playback] preserve editing, window and app defaults; Command-arrows/Space/Return are routed back to text while editing. Command-L has no address-bar destination in this Library app, so Now Playing is an appropriate app binding. |
| KEY-03 | [Commands]/[Shortcuts]/[EF] expose New View/Playlist, search, queue placement, Star/Played, Inspector and settings accelerators in menus. Download explicitly has no accelerator; absence for one action does not erase the extensive frequent-command set. |
| KEY-05 | Native menu equivalents display using system notation; [Shortcuts] authors Option/Shift/Command in standard order and Help uses Command-plus/Question-style upper-character notation rather than Ctrl+ strings. |
| TEXT-01 | Native TextField/NSTextView field editor is retained; [Playback] forwards protected text events through interpretKeyEvents rather than implementing its own editing commands. No blanket key listener consumes Control-A/E/K/Y/T or user bindings. |
| TEXT-02 | Native editable fields retain Cocoa substitutions/spelling behavior and settings; [App] adds the working native TextEditingCommands action surface. No custom replacement/spelling implementation overrides the field editor. |
| WIN-01 | Standard WindowGroup frame/traffic lights shown in 01; [App] does not remove close/minimize/zoom or fake its own frame. Settings appropriately dims its auxiliary controls. |
| WIN-02 | When table selection owns focus, the sidebar selection is secondary gray (03/07/33); sheets dim parents (11/22), and inactive treatment remains system-owned rather than a forced active tint. |
| WIN-04 | New this week, Default, Commute, Search, Market Hours, Now Playing and pane titles identify content; subtitles carry counts instead of crowding the short view title. |
| WIN-06 | Native WindowGroup and Enter Full Screen command, without custom immersive frame or hidden essential command inventory ([App], [Menus]). No claim of measuring full-screen transitions or Dock reveal timing. |
| WIN-07 | [Commands] supplies Open in New Window for saved Views/Playlists; [App] gives discovery/playback/stats distinct, meaningful window tasks. |
| WIN-08 | New Window and Open in New Window are discoverable; [WindowTarget] carries destination identity, and editing sheets keep their parent working context. The app is not a single-window navigation tunnel. |
| WIN-09 | [App]/[W] use the native title bar/ToolbarItem system without custom drag regions or double-click interception; standard full-screen traffic lights are not overlaid by app content. |
| TOOL-01 | Native navigation Back leads, the view title stays leading, and actions/search occupy the toolbar’s standard trailing area (02/03/18). No separate phone navigation bar exists. |
| TOOL-02 | [W]/[EF] use ToolbarItem/ToolbarItemGroup and searchable toolbar placement, delegating overflow to the system. At the captured default width the actions fit; no custom fixed overflow popup substitutes for native behavior. |
| TOOL-03 | 02/03 organize source navigation, object actions and search into compact groups; text search is visibly separated from symbol actions. No repeated prominent text buttons occupy the toolbar. |
| TOOL-04 | Standard plus/sliders/Inspector/Play/Back symbols, without several colored primary toolbar actions; full labels are available accessibly and through menus. |
| TOOL-05 | [W]/[EF] supply window-frame actions as toolbar items. Settings toggles, rule pickers, task fields and body Help remain in content. |
| SIDE-01 | The leading source list is initially visible in [W] and 01; column visibility is restored from scene context. |
| SIDE-02 | Section → destination stays within two levels; Episodes and details occupy adjacent content, not deeper nested sidebar branches (01–10). |
| SIDE-05 | Native split/Inspector boundaries remain thin and distinct in 02/03/06; the TXT records the sidebar divider at 0.5 pt rather than a thick decorative gutter. |
| SIDE-06 | [W] uses native sidebar List and intentionally keeps app reading text scale separate from macOS sidebar metrics; no fixed custom sidebar font replaces the system preference. All critical object actions also have upper/menu routes. |
| SET-02 | System is the default appearance preference ([Appearance], [GS]); native system accessibility settings are read, not duplicated. App Text Size is appropriate on Mac, which lacks Dynamic Type. |
| SET-03 | 27–30 show a selected noncustomizable pane toolbar and disabled minimize/zoom; [Settings]/[Panel] measure pane heights. Automation contracts to its content while General scrolls inside a bounded pane. |
| SET-05 | [GeneralEdits] serializes live changes; Appearance, text size and MCP apply immediately. Save in the scoped Playlist/Subscription sheets is not an app-wide Settings Apply button. |
| SET-06 | Native Settings scene, not a restorable ordinary content WindowGroup; captured zoom is disabled. The last pane should be restored only on reopening (SET-04 records its persistence gap). |
| DLG-06 | Shown task sheets are scoped to Library; [Sheet]/[Panel] bound content height and pin actions. [Tour] verifies Now Playing/Discovery remain separate windows; no app-modal replacement or nested sheet is introduced. |
| DLG-08 | Repeated discovery is modeless in [Discovery]/[App], verified by [Tour] using Library while it stays open. The Inspector is attached; there is no floating palette claiming NSPanel subrole. Panel-only hide/float/Mission Control clauses therefore do not apply to these ordinary task windows. |
| CTRL-01 | Native Picker/Toggle/Stepper with bounded choices and semantics: 06 has three sections, 22 uses option pickers, 27 a compact switch, 30 a checkbox. No wheel or web dropdown replaces Mac grammar. |
| DATA-07 | [GS] uses NSOpenPanel/NSSavePanel with normal browsing and file-name choice. Export chooses a useful OPML name; it is not a new editable document requiring Untitled. Extension handling stays with the system. |
| DRAG-02 | [Transfer]/[PC] distinguish same-Playlist reorder from different-Playlist copy and read Option during drop session/configuration. Same-Playlist Option-copy safely leaves the unique existing Episode Entry in place instead of duplicating it. |
| DRAG-04 | [Transfer] exports private ordered Episode references, public URL then text; [Drops] reads every provider in transfer order and prefers rich URL/file forms. Multi-item selections and per-item import failures are handled. |
| PTR-02 | [EF]/[PC] use roughly two to three native context groups and omit keyboard equivalents by default (keyboardShortcuts is false outside the menu bar). Overinclusive disabled content is owned by PTR-01. |
| APPEAR-01 | [Appearance] applies System/Light/Dark app-wide and observes preference changes; all supplied L/D surfaces are coherent. The specific failing selected text pair is recorded under APPEAR-04 rather than duplicated here. |
| APPEAR-02 | [Accent]/[Build] make brand blue the Multicolor AccentColor; [Appearance]/[W] use system accent/primary styles for controls, selection and sidebar symbols. Brand initials remain content identity rather than a forced control tint. |
| APPEAR-06 | [Glass] and 03/16/26 restrict glass to functional player/action/footer surfaces; tables and prose remain standard reading surfaces. |
| APPEAR-07 | [Glass] uses regular glass rather than clear text-heavy panels, neutral tint and separate surfaces; 03/26 do not stack one glass sheet over another. |
| APPEAR-08 | Native toolbar/sidebar plus safeAreaInset preserve the system material layer; content boundaries/scrolling are native. No branded background blocks or clear-glass whiteout is introduced. |
| TYPE-01 | [TextSize] uses macOS semantic body/title/caption roles, with 13 pt body and 10 pt captions; 01–34 match those roles. The small xmark over download progress is an icon, not sub-minimum text. |
| SYS-01 | [Intents] defines semantic Episode/Playlist entities and undoable Play/Add/Mark actions; [Build] extracts and validates actions/entities/App Shortcuts metadata, and [App] updates shortcut parameters. MCP opt-in does not gate these actions. Code supports the check; Shortcuts/Siri launch behavior was not run by this grader. |
| SYS-04 | [Share]/[Inspector]/[PF]/[Commands] use native ShareLink with supported public episode/podcast URLs and convenient controls. The separate two-command detour is CTRL-06, not absence of system sharing. |

## Scores

Scores combine both appearances; the lowest observed appearance governs. They are a judgment of this build, not a comparison with prior rounds. Uncapped figures explain the craft judgment where a checklist cap determines the reported score.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **6.9** | Uncapped 8.1: semantic system sizes distinguish headings, titles and metadata; tabular times hold their width (02, 03, 06, 26). Clearer than generic Competent typography, but clipped Playlist consequence text in 11/12 forces the TYPE-05 major cap. | hierarchy, accessibility, craft |
| Hierarchy | **8.0** | Source → Episodes/Entries → Inspector reads naturally; 33 replaces single-item detail with a useful selection summary. Quiet content surfaces and a single task-sheet commit action are deliberate. Persistent empty Inspector space, the deep Inspector’s large artwork and the owner-fixed bottom transport keep it below Exemplary. | content-first, hierarchy |
| Spacing & density | **7.8** | Compact 28 pt row actions, restrained table columns, 12/16/20/24 pt grouping, and a stable 225 pt sidebar suit a personal library (01–10, 23). Sheets have a common footer rhythm. The clipped columns Form and spacious Now Playing/empty side pane weaken space use; minimum-size and enlarged hit geometry remain unverified. | craft, conventions |
| Color & contrast | **6.9** | Uncapped 7.5: mostly quiet neutrals, accent navigation, readable authored secondary/error palettes, and regular glass with opaque accessibility fallbacks. The pale Dark selection versus white text is a repeated primary-content failure (2.07:1/3.30:1), forcing APPEAR-04’s major cap. Light selection passes. | accessibility, color-restraint |
| Iconography | **8.5** | Consistent SF Symbols, directional Open/Back, familiar Share/Trash, text-plus-symbol state and strong accessible labels (03, 18, 26, 33). Clear on Played’s filled/outline eraser needs learning, and the Podcast gear lacks a tooltip; these keep a strong family short of reference quality. | conventions, plain-language, craft |
| Consistency & polish | **6.9 (partial: no full flow run; stability N/O in Light and Dark)** | Uncapped 7.8: shared sheets, pinned trailing commit controls, explicit empty states, inactive list treatment and zero-delta captured Playlist/Unsubscribe controls. Inconsistent persistence boundaries and clipped explanation are visible rough edges. CTRL-06’s major cap is 6.9; no invented stability band is applied. | craft, conventions, stability |
| Clarity | **8.0** | “Views find Episodes”, explicit per-Playlist Position, Active/Current Entry, result counts, import persistence copy and rewind consequences explain the model (06, 15–17, 24, 30, 34). Dense domain capitalization, two-stage Save Name/Save and some less-obvious symbols require learning. No error-copy cap: authored recovery messages say what to try. | plain-language, feedback |
| Platform fit | **4.9** | Uncapped **8.1 = (Looks 8.7 + 2 × Behaves 7.8) / 3**. Real windows, native source list/table controls, scoped menus, live Settings, modeless discovery, multiwindow commands, text system, App Intents and Share belong on Mac. MENU-02’s blocker caps at 4.9; WIN-05 and SYS-05 would independently cap at 6.9. This cap is not a claim that most visual signals are foreign. | conventions, discoverable-commands |
| Interaction & feedback | **4.9** | Uncapped 7.8: named multi-step Undo/Redo, Trash, rewind preview, native selection, command accelerators, durable new-item drafts and cancellable/journaled import are substantial. Volatile staged object settings force DATA-01’s blocker cap. DATA-06, DRAG-01, DRAG-06 and PTR-01 would cap at 6.9. Latency, FKA and some drag/assistive behavior are N/O, not presumed instant or broken. | forgiveness, keyboard-efficiency, feedback |
| **Overall** | **6.8** | A coherent, useful and recognizably Mac podcast workspace with strong visual craft. Interrupted settings work and holes in the menu command index prevent an Exemplary whole. Lowest category 4.9 sets an Overall ceiling of **6.9**; 6.8 respects that ceiling and is a holistic judgment, not an arithmetic mean. | content-first, forgiveness, conventions |

**Mac platform signals:** L1 Native (standard frame); L2 Native (semantic SF); L3 Native (choice widgets); L4 Native (system menu presentation); L5 Adapted (native shortcuts plus authored glyph reference); L6 Native (leading source list and inactive gray selection, with APPEAR-04’s separate contrast defect); L7 Native (SF Symbols); L8 Native (separate live Settings); L9 Native (pointer density); L10 Adapted (selective regular glass); L11 Native (System/Light/Dark). B1 Foreign in part (omitted import/recovery commands, not framework debris); B2 Native; B3 Adapted; B4 Native by code; B5 N/O for complete FKA/type-select behavior; B6 Adapted but overinclusive contexts; B7 Adapted with sidebar-width loss; B8 Adapted with file-entry/placeholder gaps; B9 Adapted with missing Spotlight, Services and internal routes; B10 Adapted; B11 N/O. “Native” describes grammar, not a waiver of a failing check.

**Side-by-side limit:** no current Apple Mail/Music/Finder comparison capture is included, and the owner forbids launching apps here. The visual comparison is therefore against the supplied Mac signal definitions, not a claimed live side-by-side. Foreign grammar found is command discoverability; there is no hamburger navigation, web-style form system, fake frame or phone-scale control set to replace.

### What stands between this build and 9.0

First clear the two blockers: recover staged settings after interruption and complete the menu index. Then fix Dark selection contrast and the clipped explanation, restore sidebar width, narrow contextual actions, add the missing import entry path and drop placeholders, and remove the two-item Share detour. Finish the minor integration/help/tooltip issues. The owner-fixed bottom transport and deferred Spotlight still cap Platform fit at 6.9 under this rubric even if every other finding is fixed; that leaves a mathematical Overall ceiling of **8.9**, so 9.0 is unavailable while those major failures remain. They are recorded constraints, not the next target.

A future 9.0 claim also needs the unobserved evidence: complete asynchronous flows at minimum, half-display and typical widths in Light/Dark, timed passes, keyboard/assistive checks, enlarged-text geometry, accessibility appearance combinations and drag sessions. Those missing observations do not currently add failure caps, but cannot earn exemplary claims about behavior they never showed.

## Next step

**Target:** DATA-01, ahead of cosmetic changes. Both blocker-capped categories are 4.9; preserving the Playlist work closest to the primary task breaks the tie.

**Anti-pattern:** [Save-or-lose][anti]. **Root cause:** the object settings transaction is split between a durable rename text field and volatile sheet-local accepted values; Save Name clears the durable field before the transaction is persisted.

1. **Preferred candidate:** journal one complete, scoped settings draft keyed by Library and object ID after each field change, including the staged name, Clear on Played and Subscription overrides. Restore that draft when the sheet is reopened; clear it on explicit Cancel or successful outer Save. Keep the outer Save/Cancel contract and existing reversible operation. This improves forgiveness and Interaction & feedback; it changes no signature visual element. The tradeoff is stale draft reconciliation, so retain only the user-edited fields and safely rebase against refreshed object state.
2. **Smaller UI candidate, insufficient alone:** rename the inner Save Name action to “Done Renaming” and explain that outer Save commits it. This clarifies the boundary without solving quit loss; it must accompany durable draft preservation rather than substitute for it.

**Reviewable acceptance:** use a disposable identity to change a Playlist name and Clear on Played, finish renaming, quit before outer Save, relaunch and reopen. Both values must return. Repeat for Subscription overrides. Explicit Cancel must discard; successful Save must make one named reversible edit; a failed Save must keep the draft. Then run the prescribed delayed flows and their measurements. No application changes or hill-climb iterations were authorized in this grading task, so these are proposals only; no before/after result is claimed. All five signature elements remain **kept**.

**Validation and handoff:** report-only change. Checklist ID coverage and local links were mechanically checked. The supplied tour is reviewed evidence, not a test run performed by this grader. Beads could not load its Dolt database (`openat LOCK: operation not permitted`), so no issue record was created or closed. No merge or push is part of this task.

[Accent]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Resources/MacAssets.xcassets/AccentColor.colorset/Contents.json
[App]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListMac/PodListMac.swift
[App:44]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListMac/PodListMac.swift:44
[App:73]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListMac/PodListMac.swift:73
[AppModel]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ApplicationModel.swift
[Appearance]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacAppearance.swift
[Appearance:56]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacAppearance.swift:56
[Build]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/scripts/build-mac-app.sh
[Build:26]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/scripts/build-mac-app.sh:26
[Commands]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibraryCommands.swift
[D02]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/dark/02-new-this-week.png
[D03]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/dark/03-episode-inspector.png
[D11]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/dark/11-playlist-settings.png
[D18]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/dark/18-podcast-market-hours.png
[Discovery]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift
[Downloads]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/DownloadViews.swift
[Downloads:49]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/DownloadViews.swift:49
[Drops]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibraryDrops.swift
[EF]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift
[EF:19]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift:19
[Failures]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/FailureMessages.swift
[Feedback]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/FailureFeedback.swift
[GS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift
[GS:364]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:364
[GS:53]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:53
[GeneralEdits]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift
[Glass]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacGlass.swift
[Help]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ConnectionViews.swift
[History]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListDomain/EditHistory.swift
[Icon]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacIconLabel.swift
[Inspector]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/EpisodeInspector.swift
[Inspector:187]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/EpisodeInspector.swift:187
[Intents]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListMac/AppIntents.swift
[L01]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/light/01-subscriptions.png
[L03]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/light/03-episode-inspector.png
[L06]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/light/06-default-playlist.png
[L11]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/light/11-playlist-settings.png
[L18]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/light/18-podcast-market-hours.png
[LE]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibraryEditingModel.swift
[MC:21]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MenuCommandActions.swift:21
[Model]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibraryModel.swift
[Notice]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/EditingNotice.swift
[Numbers]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/FormNumbers.swift
[OPML]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/OPMLImportContent.swift
[OPML:35]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/OPMLImportContent.swift:35
[OPML:47]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/OPMLImportContent.swift:47
[PC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistContentView.swift
[PC:104]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistContentView.swift:104
[PC:49]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistContentView.swift:49
[PE]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift
[PE:110]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:110
[PF]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PodcastScreens.swift
[PF:12]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PodcastScreens.swift:12
[PF:121]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PodcastScreens.swift:121
[PF:300]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PodcastScreens.swift:300
[PS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift
[PS:116]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift:116
[PS:179]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift:179
[PS:201]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift:201
[PV]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlayerViews.swift
[PV:6]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlayerViews.swift:6
[Panel]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ContentSizedPanel.swift
[Playback]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PlaybackCommands.swift
[Restoration]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/WindowRestoration.swift
[Scroll]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacRowScroll.swift
[Selection]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/SelectionCommands.swift
[Settings]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ConnectionViews.swift
[Settings:57]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ConnectionViews.swift:57
[Share]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ShareLinks.swift
[Sheet]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/PodListSheet.swift
[Shortcuts]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift
[TextSize]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacTextSize.swift
[Tour]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/UITour/PodListUITour.swift
[Transfer]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/EpisodeTransfer.swift
[Transfer:92]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/EpisodeTransfer.swift:92
[ViewEditor]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ViewEditorScreen.swift
[W]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacWindow.swift
[W:114]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacWindow.swift:114
[W:508]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacWindow.swift:508
[W:526]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacWindow.swift:526
[W:98]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/MacWindow.swift:98
[Welcome]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/ConnectionViews.swift
[WindowTarget]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/Sources/PodListUI/LibraryWindowTarget.swift
[anti]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/anti-patterns.md
[core]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/core-checklist.md
[critique]: /Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md
[mac]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/mac-checklist.md
[manifest]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/README.md
[menus]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/menus.txt
[platform]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/platform-fit.md
[rubric]: /Users/sarvagnan/Documents/UI_Guidelines/guidelines/rubric.md
[tour]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-2ebd9796-d9cf7577e3c7f161/apps/apple/UITour/PodListUITour.swift


[L12]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/light/12-playlist-rename.png
[D12]: /Users/sarvagnan/Documents/podlist-grading/mac-round-5/dark/12-playlist-rename.png
