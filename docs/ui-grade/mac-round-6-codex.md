# PodList Mac UI grade — round 6 (Codex)

## Frame

**Task:** Find podcast Episodes, add them to ordered Playlists, listen, and recover or adjust the listening plan without losing the Library or its context.

**Target:** Native Mac app, macOS 26+; audited build **2d7c741**, against the supplied macOS 27.2 VM evidence. This is an independent evidence-and-source grade, not a live-app certification.

**Posture:** Sovereign personal Library, with background playback and transient editing tasks.

**Audience:** Perpetual intermediate; newcomers must learn Views versus Playlists, while regular listeners need fast selection and queue commands.

**Nearest exemplar:** Things for calm collection/selection work; BBEdit for complete, searchable commands and preservation. I inspected the standard’s Things project and BBEdit menu-settings images, using their craft relationships, not their appearance, as references. A current Apple-app side-by-side was not supplied or launched; that comparison remains unavailable under the brief’s no-launch constraint.

**Character:** (1) shallow Views/Playlists/Library source list; (2) dense two-line Episode tables with explicit Position/Played state; (3) initials/artwork anchors; (4) persistent bottom transport **[owner-fixed]**; (5) restrained blue identity with regular Liquid Glass control islands **[owner-fixed]**. The 70 supplied starting captures are the baseline. No UI was changed, so all five signatures remain kept.

**Owner decisions:** Grade, but do not target, bottom transport, System/Light/Dark Appearance, no customizable toolbar, timed two-click Unsubscribe plus Undo, the adopted glass surfaces, and deferred Spotlight. The brand is the bundled Multicolor AccentColor, not an override of the person’s accent. MCP stays off by default; App Intents stay on. No owner decision waives a checklist severity or score cap.

Evidence notation: **L/Dnn** means both matching Light/Dark PNGs and their `.txt` snapshots in the [round-6 evidence folder][E], with names mapped in its [README][README]. All 35 state pairs were visually inspected; snapshots and source resolve specific behavior/geometry. Bracketed source abbreviations below link to this worktree. No earlier PodList grade was opened. No app, UI automation, screen-control tool, or simulator was launched.

## Flows

**Tasks reconstructed from supplied evidence, not newly run:**

| Task | Supplied state sequence | What this establishes / limit |
|---|---|---|
| Browse and select | Subscriptions 01 → View 02 → Inspector 03 → Starred 04 → All Views 05; selection 33 | Native hierarchy, table selection and multi-selection summary; no complete FKA or type-select recording. |
| Arrange and inspect Playlist | Default 06 → Inspector 07 → History 08 → Timeline 09/34a → Rewind preview 34 → Commute 10 | Designed empty History, visible rewind summary, persistent header assertions. Rewind is previewed/cancelled, not committed. |
| Edit and create | Playlist settings 11 → Rename 12 → Cancel → New Playlist 13 → Cancel; Edit View 16 → New View 17 → Cancel | Focused rename and initial validation states, consistent sheets; no complete save/failure/undo flow. |
| Find and subscribe | Search “rice” 15; podcast 18 → expanded description 19 → armed 20 → auto-disarmed 21 → subscription settings 22; discovery 24 | Scope, arm/disarm geometry and modeless discovery/draft reopening. Unsubscribe is never executed. |
| Queue/download settings | Add to Playlist 23; bulk Download Rules 25; Now Playing 26 | Placement choices and separate player; playback remains paused, with no download/drag in progress. |
| Preferences and learning | General 27–29 → Automation 30 → Stats 31 → Getting Started 32 | Separate pane sizing, disabled window controls, MCP default off, dismissible introduction. |

**Widths/appearances:** Library 1180×760 pt (2360×1520 px, 2×), both Light and Dark, on the supplied 1920×1200 pt desktop. Minimum 760×500 pt and half-display layouts were not captured. Auxiliary windows have their own sizes; General is 640×768 pt including chrome and Automation is 640×224 pt. Neither increased text nor accessibility appearance combinations were captured.

**Timed runs/device:** supplied macOS 27.2 Retina VM; hardware/refresh rate not identified. The supplied [test log][TESTLOG] reports two tour tests passed, zero failures. That is not five timed repetitions and gives no p75 input/typing/hitch evidence.

**Script:** [PodListUITour.swift][TOUR], read only. **Measurements file:** none satisfying CRITIQUE’s per-step box/focus/scroll/input and timing contract. **Screenshot strips:** 35 separate state captures per appearance, not full delayed-completion strips. The script’s limited header/arm assertions are useful corroboration, not a complete flow measurement set. The tour holds Unsubscribe armed for 15 seconds; production uses four seconds ([LE]).

**FLOW failures:** none established by a qualifying transition measurement. FLOW-01, FLOW-02 and minimum-width FLOW-04 are N/O; this does not assert that those transitions pass. FLOW-03 is settled from cancellation/versioning/draft guards in source. **Stability sub-score: N/O in both appearances.**

**Static geometry finding, not a stability finding:** in both L/D18–21 the Library window is `(370,190,1180,760)`, ending at y=950 pt. Its Play control is `(496,965,28,28)` and seek slider begins y=995: entirely below the window. The split group starts y=159.5, above the window’s top, and the Views header overlaps title-bar space. The same geometry already exists in 18, so expansion did not newly cause it. This is WIN-03 (F2), not FLOW-01. [Light 19 PNG][L19], [snapshot][L19TXT], [Dark 19 PNG][D19], [snapshot][D19TXT].

## Cross-screen inventory

“None” means no instance shown or implemented on that surface; code-only states are named. Status colors: ordinary success/Undo use primary text, authored errors use adaptive red, quiet descriptions use readable secondary text; controls over glass use primary text.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library lists/Views (01–07, 15, 33) | Code: named edit, under sync/header, primary | Code: same strip, red + Retry | None | Same top strip, named Undo/Redo | Center/body, explanatory label + route | Code: sync incompatibility near status | Toolbar and row Play/Add | View rule summary above table |
| Playlist History/Timeline (08–10, 34a) | Library strip | Library strip | Rewind opens preview sheet | Library strip | Centered History explanation | None | Stable section selector; row Rewind | History/Timeline meaning in body |
| Trash (14) | Library strip: “Restored Playlist…” | Library strip | Code: permanent-delete confirmation | Library strip | Center: “Trash Is Empty” | Code: irreversible purge message | Row Restore/context purge | Retention statement top-leading |
| Playlist settings/rename (11–12) | Code: edit strip above footer after apply | Near name / above footer | None | Code: strip above footer | None | None | Save bottom-trailing; Save Name beside rename | Clear on Played/Save/Trash consequences in body |
| New Playlist (13) | Closes into named Library result | Code: Name-local red; operation strip | None | Library after commit | Empty labeled field, no premature error | None | Create Playlist bottom-trailing | Name label |
| View editor/create (16–17) | Code: edit strip above footer/live count near top | Code: field-local red plus operation strip | None | Strip above footer | Any/All placeholders labeled optional | None | Save/Create View bottom-trailing | Matching Episode count and condition labels |
| Podcast page (18–21) | Code: Library strip “Subscribed to…” | Code: beneath header, red + Retry | Same-control Unsubscribe arm, red + text | Library strip | Code: body No Episodes/No Matches + route | None | Subscribe/Share/settings in header | Description disclosure; Download Rule label |
| Subscription settings (22) | Code: Library result | Code: field-local red/status | None | Code: operation strip | Default/inherited choices | None | Save bottom-trailing | Override/default explanations |
| Add to Playlist (23) | Closes into Library named edit | Code: Name-local red / status strip | Destination picker | Library/operation strip | Optional new-name task | None | Play Next bottom-trailing; Now/Last leading | Active Playlist identified in picker |
| Add Podcasts (24) | Code: LibraryFeedback above closing footer | Code: search-local red + Retry; shared feedback at bottom | None | Code: bottom feedback strip | Center: Find Your Next Podcast | None | Search beside query; Close bottom-trailing | Feed URL example and OPML path |
| Download Rules (25) | Closes into Library feedback | Code: operation strip above footer | Rule picker | Operation strip | None | None | Apply bottom-trailing | Scope sentence above picker |
| Now Playing (26) | None | Code: near transport + Retry, primary on glass | None | Through Library/menu history | Code: No Current Entry | None | Center transport; Done bottom-trailing | Episode Details / Open Active Playlist |
| Settings (27–30) | Live changed control value | Code: immediately below failed setting | None | App edit history where applicable | None | None | Change native control, no Save | Library, text-size and MCP consequence prose |
| Stats / Getting Started (31–32) | None | None | None | None | Center: No Listening Yet | None | Play Episode / Dismiss bottom-trailing | Three numbered learning steps |

**Mismatch I1:** the same global edit/error/Undo component sits below the Library header, above Add Podcasts’ closing footer, and above task-sheet footers ([MW], [AD], [SH], [EV]). These are distinct places for the same app-wide edit history, beyond field-local errors that appropriately stay with their fields. Keep the local field messages, and standardize the global result/Undo placement across task surfaces. This reduces visual consistency; with no qualifying flow run, it does not manufacture a numeric stability sub-score or FLOW failure.

No color/verb mismatch was established: native field errors, persistent operation recovery and quiet success serve different roles. Sheet primary actions consistently align bottom-trailing. The podcast-page clipping is a geometry defect, not a second inventory failure.

## Checklist

**Coverage: 82.4%** (pass 108 · fail 14 · N/O 26 · N/A 20). **168 IDs**, core 80 + Mac 88. Coverage = (pass + fail) / (pass + fail + N/O); N/A excluded. Pass means the stated implementation/snapshot evidence meets the check, not that unrecorded OS interactions were exercised.

### Failures by severity

**Blocker**

- **F1 · MENU-02 — Incomplete menu command index.** A failed remote Episode drop offers persistent `FailureFeedback` Retry in [PodcastScreens.swift:16][PS16]; it calls the retained failed-drop closure from [EpisodeTransfer.swift:111][ET111]. [FailureFeedback.swift:17][FF17] publishes a recovery action, but no Commands consumer reads `podListRecoveryActions`; [MenuCommandActions.swift:31][MC31] explicitly excludes `.retry` from every menu. [menus.txt][MENUS] has Retry Failed Imports/Retry Playback/Retry MCP Server, but no retry for failed Episode drops (nor a general focused recovery route). Error states were not captured, so this is **code-only** evidence, not a claim of a witnessed failed drop. **Fix:** add a stable, specifically titled menu command such as “Retry Failed Episode Drop”, validated against the retained failure and invoking the identical closure; keep it visible and disabled when inapplicable. Apply the same command inventory check to setting/Undo recovery. Principle: `discoverable-commands`. This checklist assigns blocker severity even though ordinary browsing/transport menus are extensive.

**Majors**

- **F2 · WIN-03 — Podcast-page content exceeds the actual window.** [L19][L19] / [D19][D19] and their snapshots give the out-of-bounds Play/seek frames recorded above; the defect is also present in 18, 20 and 21. [PS] lays the header plus table in an unconstrained vertical composition, while [MW] adds the player as a bottom inset; unlike [PL], this page does not explicitly bound the table’s allocated region. The exact underlying SwiftUI negotiation still needs a reproduction. **Fix:** constrain podcast content to the offered content rectangle, keep long descriptions in a bounded scrolling region, and let only the remaining table area flex; assert every transport/toolbar frame stays inside the window at 1180×760, 760×500, half-display and 200% text. Preserve the bottom player. Principle: `adaptability`.
- **F3 · WIN-05 — The bottom bar holds essential transport, rather than limited status.** L/D01–18, 23, 26 and [PV] show Play/Pause/seek/speed/sleep at the window bottom, roughly a 92 pt player plus surrounding padding. Menu routes mitigate access loss but do not satisfy the check’s placement rule. **Owner-fixed; not a target.** A conforming alternative would put a redundant essential transport near the top while retaining the player, but no relocation is requested here. Principle: `content-first`.
- **F4 · CTRL-04 — Go to Time gives no reason for invalid input.** [PlayerViews.swift:261][PV261] rejects negative, nonnumeric and beyond-duration input by returning nil, and the sheet only disables Go. There is no field-local error or range explanation. The sheet is **not captured**; this is a source-established missing state. **Fix:** after editing/submission, show “Enter a time from 0 to [duration] seconds” beside Position; separately explain when the current Episode changes. Preserve the typed value and locale-aware parsing. Principle: `feedback`.
- **F5 · DATA-06 — Arranged sidebar width is not restored.** [MacWindow.swift:114][MW114] explicitly states the sidebar width is not restored and uses fixed ideal 225; [WR] archives pane widths but only Inspector width is measured/applied by [MW]. Selection/query/row anchor restoration is otherwise substantial. Relaunch was not captured; this fails the source-visible missing width path only. **Fix:** persist and reapply actual sidebar width using a split-view sizing path that does not feed measurements back during the current session. Principle: `stability`.
- **F6 · DRAG-06 — Slow Episode drops have progress but no destination placeholder.** [EpisodeTransfer.swift:83][ET83] records counts and awaits remote Episode preparation before a single final add; [PodcastScreens.swift:12][PS12] renders global progress. [PL] renders only committed Entry rows and supplies no pending destination row/insertion reservation. Selection on completion is implemented, but the check also requires placeholders for slow drops. **Code-only**; no drag capture supplied. **Fix:** reserve pending rows at the requested insertion region before preparation, replace successful placeholders in place, and retain actionable failed placeholders; keep the committed batch one undo step. Autoscroll still needs live verification. Principle: `feedback`.
- **F7 · SYS-05 — Library content is not indexed in Spotlight.** [AI] has AppEntity queries, but no CoreSpotlight/CSSearchableItem indexing exists in the Mac/UI/data sources; [BUILD] declares no Spotlight importer. Entity search in Shortcuts is not Spotlight Library indexing. **Owner explicitly deferred; not a target.** When scheduled last, index Episodes/Podcasts/Playlists with stable identifiers and route results into the appropriate content. No custom file preview is required for this non-document Library. Principle: `discoverable-commands`.

**Minors**

- **F8 · APP-01 — Copyright missing from About metadata.** [MENUS] exposes the native About item; [BUILD] supplies name/version but no `NSHumanReadableCopyright` or custom About options. **Code-only. Fix:** add the correct copyright holder/year metadata so the standard panel presents it. Principle: `conventions`.
- **F9 · DATA-05 — Undo does not reveal offscreen restored content.** [PlaylistEditingModel.swift:110][PE110] reverses data and posts named status, including restored Playlist names, but does not publish a reveal/selection request. [LM]/[MW] preserve or reconcile the current selection and scroll; they do not navigate to an undo-restored offscreen item. **Code-only. Fix:** emit a scoped reveal target from successful Undo and bring that restored item into view in its originating Library window without stealing another window’s focus. Principle: `feedback`.
- **F10 · SET-04 — Last Settings pane is transient.** L/D27 and 30 show correct General/Automation titles, but [ConnectionViews.swift:57][CS57] uses only `@State private var pane = "general"`; no persistent last-pane route exists. Close/reopen may reuse a live scene, but a new process cannot recover the chosen pane from that state. **Fix:** store the selected pane persistently and restore it only when Settings is opened; keep Settings closed on launch. Principle: `stability`.
- **F11 · PTR-04 — Unlabeled-on-hover podcast settings gear.** L/D18–21 show an icon-only gear; [PS] assigns its action/title and `labelStyle(.iconOnly)` without `.help`. The accessibility name does not supply an action tooltip. **Fix:** add “Open Subscription Settings” help, retaining its accessible name. Principle: `discoverable-commands`.
- **F12 · SYS-02 — No selection-based subscription Service.** Feed addresses selected in a browser/editor are useful input, but [BUILD] has no `NSServices` registration/provider and [APP] registers none. **Code-only. Fix:** vend “Subscribe in PodList” for selected HTTP(S) feed URLs using the same staged import/subscription behavior. Principle: `conventions`.
- **F13 · SYS-03 — Saved app objects cannot be linked back into PodList.** [SL] shares publisher web links; [BUILD] has no URL-scheme registration and [APP] no incoming deep-link handler. App Intents entity IDs do not provide usable links to a saved View/Playlist. **Code-only. Fix:** stable `podlist:` URLs for addressable app objects, Library-scoped resolution, safe stale-link recovery, and a Copy Link route. Principle: `user-control`.
- **F14 · SYS-06 — No system Share destination for feed input.** Receiving podcast/feed URLs from a browser is directly relevant, but the build defines only the app and MCP bridge and no Share extension. Drag/OPML already offer useful alternatives ([LD]); Password AutoFill, bespoke Safari extensions and Finder Quick Actions are not required for the current product. **Code-only. Fix:** add a narrowly typed URL/text Share extension that stages a podcast/feed preview in the existing Library flow. Principle: `conventions`.

### N/O

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-06, LIST-07, DRAG-05, PTR-03, APPEAR-11, TYPE-06, AX-04, START-01, RESP-01, RESP-02, FOOT-02, MENU-05, APP-03, WMENU-03, HELP-02, TEXT-02, WIN-10, TOOL-02, SET-06, DRAG-07, PTR-05, FOOT-01.

### N/A

FLOW-05, DLG-09, CTRL-02, LIST-05, START-04, START-05, START-07, FILE-01, FILE-02, FILE-05, FMT-01, FMT-02, DATA-02, DATA-03, DATA-08, SYS-07, EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04. START-05 → START-04; other reasons are in the ledger.

### Complete verdict ledger (including passes)

| ID | Verdict | Evidence / applicability |
|---|---|---|
| FLOW-01 | N/O | No complete transition measurements, focus/scroll log, or delayed-completion flow. |
| FLOW-02 | N/O | No complete transition measurements, focus/scroll log, or delayed-completion flow. |
| FLOW-03 | pass | [AD] search checks cancellation and submitted query; [LE] versions import selection; [VC] serializes writes and guards reconciliation against active drafts. Code verdict, not timing evidence. |
| FLOW-04 | N/O | No minimum-width flow establishes visibility of every follow-up. |
| FLOW-05 | N/A | Navigation/list/Inspector columns have distinct roles; no peer comparison panels. |
| FLOW-06 | pass | L/D08, 14, 17, 24, 31 and [EI], [PL]: explicit empty states/no-show-notes text; no orphan heading or help removal while initial input is typed. |
| FLOW-07 | pass | L/D11–13, 16–17, 22–23, 25, 34: sheet primary actions consistently bottom-trailing via [SH]. |
| KEY-01 | N/O | Full Keyboard Access traversal and absence of traps were not captured; native controls alone do not certify the full path. |
| KEY-04 | pass | L/D12–13, 17 show expected input focus; [AD], [PT], [SH] focus fields and use native form order and focus rings. Full FKA traversal remains KEY-01 N/O. |
| KEY-06 | N/O | International-layout execution is absent; SwiftUI declarations alone do not establish physical-key behavior. |
| KEY-07 | pass | [PC] intercepts only documented transport/text keys; native List/Table/ScrollView keep paging/home/end routes. Space is documented playback, not a scrolling promise. |
| KEY-08 | pass | [CS] Help includes an accessible shortcut grid and bare Space/Return behavior; [PC] protects text input. |
| DLG-01 | pass | [PT] confirms irreversible purge; routine edits use Undo/Trash. Rewind is a deliberate preview, not a repetitive warning. |
| DLG-02 | pass | [PT] purge title names the Playlist and consequences; [PL] Rewind preview names what is kept. L/D34. |
| DLG-03 | pass | [PT] Delete Permanently/Cancel; [SH] concise action verbs. No Yes/No decisions. |
| DLG-04 | pass | [SH] trailing default plus cancel shortcut; [PC] routes Command-period to sheet Escape; destructive purge has safe Cancel. |
| DLG-05 | pass | [PT] destructive role for purge; ordinary Save/Create default actions are non-destructive. L/D11–13. |
| DLG-07 | pass | L/D11–13, 16–17, 22–23, 25, 34: no Cancel/Done/Back triple; [SH] shares the footer. |
| DLG-09 | N/A | No app-owned task popovers; system Share presentation supplies its own behavior. |
| CTRL-02 | N/A | No hierarchical checkbox group. |
| CTRL-03 | pass | L/D13, 17, 22, 24 and [SH], [VC], [LS]: persistent Name, query and numeric labels; optional View fields say Optional. |
| CTRL-04 | fail — major | Go to Time has no field-specific invalid-input feedback; F4. |
| CTRL-05 | pass | [MA], [MG], [SH]: custom wrappers delegate pressing to native Button styles; prominence uses borderedProminent. |
| CTRL-06 | pass | [EV], [PV]: related action menus; Play/Add are also visible. L/D03, 07, 26, 33. |
| CTRL-07 | pass | L/D15, 18; [MW]: Search Library/current list/Search Episodes scope; no search-history feature. |
| CTRL-08 | pass | [OP] count progress/cancel; [DV] determinate fraction when known and cancellation; [AD] indeterminate search with cancellation on query change. |
| LIST-01 | pass | L/D02, 06, 18 use flat native Tables; sidebar is a native grouped List. [MW], [PL], [PS]. |
| LIST-02 | pass | Episode/Published/Length/State and Entry/Position headings are short nouns, with contextual titles. L/D02, 06. |
| LIST-03 | pass | [MW], [PS] bind Table sortOrder and width ranges; ordered Playlist entries intentionally have no sort feature. |
| LIST-04 | pass | L/D02, 06: hairline row separators and aligned dates/monospaced durations make these short tables trackable; no file/path-name columns. |
| LIST-05 | N/A | No app-owned expandable outline/disclosure tree; sidebar uses flat grouped destinations. |
| LIST-06 | pass | L/D03, 07, 33: persistent native row and sidebar selection; [PV] Picker/Toggle menu choices reflect values. |
| LIST-07 | N/O | Native selection and primary actions exist, but type-select, immediate keyboard focus, and all opening routes are not established. |
| DATA-01 | pass | [LE] scopes drafts to Library in UserDefaults; [PE], [SD] persist Playlist/settings drafts; [VC] retains failed saves and supports explicit cancellation. No save-or-lose implementation found. |
| DATA-04 | pass | [PE] multi-step inverse history; [LE] subscribes/views join that history; [EV] names Undo/Redo and preserves text editor Undo. |
| DATA-05 | fail — minor | Undo reports its result without revealing restored offscreen content; F9. |
| DATA-06 | fail — major | Sidebar width is explicitly not restored; F5. |
| DRAG-01 | pass | [ET], [LD], [PL]: multi-Episode drag, reordering, feed/OPML receiving; Add/Move/Import/Copy commands are alternatives. |
| DRAG-03 | pass | [ET] adds resolved IDs through one reversible edit; [PL] reorder uses edit history; [LD] only stages import preview. |
| DRAG-05 | N/O | No drag-in-progress or inactive-window drag evidence; source uses native transfers, but cannot establish all tracking/cue clauses. |
| DRAG-06 | fail — major | Slow remote drops have progress but no destination placeholders; F6. |
| PTR-03 | N/O | No pointer-shape or open-context-target evidence; native APIs do not settle the actual outline/selection result. |
| PTR-04 | fail — minor | Podcast settings gear lacks an action tooltip; F11. |
| APPEAR-03 | pass | [MA] four appearance palettes; [MG] opaque, bordered fallback for Reduce Transparency OR Increase Contrast, including together. Code-backed, not a live preference matrix. |
| APPEAR-04 | pass | L/D02, 03, 20: measured/source-resolved primary reading pairs clear 4.5:1; [MA] protects custom secondary/error/accent foregrounds. See measurement limits below. |
| APPEAR-05 | pass | No app-authored positional/depth animation or withAnimation in graded UI source; native controls own system motion behavior. |
| APPEAR-09 | pass | L/D01–34a: coherent SF Symbols; artwork initials are content placeholders; no emoji navigation. [MW], [EI], [PV]. |
| APPEAR-10 | pass | L/D03, 07, 26: distinct control surfaces with ordinary reading backgrounds; [MG] provides boundaries in opaque modes. |
| APPEAR-11 | N/O | No sampled transition frames; a static clipping defect is counted under WIN-03. |
| TYPE-02 | pass | L/D02, 03, 17: system body/captions, regular/medium/semibold/bold, no thin reading font. [MT], [EI]. |
| TYPE-03 | pass | L/D02, 03, 17: system body/captions, regular/medium/semibold/bold, no thin reading font. [MT], [EI]. |
| TYPE-05 | pass | [MT] 100–200% content scale; [MW]/[PS]/[PL] switch tables to wrapping reading rows; [SH]/[CP] scroll sheet content with pinned actions. Podcast-page layout defect counted once under WIN-03. |
| TYPE-06 | N/O | Long show notes and Help are not captured at a reading position with three typical full prose lines; width declarations alone do not establish actual measure. |
| TYPE-07 | pass | L/D captures: sentence/title-style UI and brief initials; emphasis uses weight, not bold-italic/underlined prose. [EI], [CS]. |
| TYPE-08 | pass | Authored visible prose uses curly punctuation, real ellipses and dashes; literal URLs/configuration are exempt. [CS], [LS], [PT]. |
| COPY-01 | pass | L/D23, 25, 34 and [CS]: Play Now/Next/Last, Apply, Rewind, Remove from Playlist; Mac click/window vocabulary. |
| COPY-02 | pass | [FM], [FF], [VC], [LS]: practical blame-free recovery and local validation; infrastructure diagnostics stay in OSLog. Missing seek validation counted under CTRL-04. |
| COPY-03 | pass | L/D08, 14, 24, 31: clear empty states explain how History/listening starts or how to find podcasts. |
| COPY-04 | pass | Consistent domain capitalization (Episode/View/Playlist/Position), concise action help; [KS]/[CS] share shortcut vocabulary. L/D11, 23, 32. |
| AX-01 | pass | L/D03, 07, 26, 33 .txt expose named buttons, slider value, selected rows and multi-selection; [EI]/[DV] label custom states; [FA] posts announcements. This verifies exposed semantics, not a live VoiceOver reading session. |
| AX-02 | pass | L/D06, 20, 33: Current Entry label plus symbol; Subscribed/Unsubscribe text plus state glyph; selected count and textual Played status. |
| AX-04 | N/O | Voice Control/Switch Control operation is not captured; command alternatives exist in source. |
| AX-05 | pass | [PV]/[PC]: visible Play/Pause/Stop/time; playback does not conceal critical app state in audio cues. Publisher-authored podcast transcripts are not an app-alert requirement. |
| START-01 | N/O | Opening placeholder exists in source; launch-to-usable-content latency is not measured. |
| START-02 | pass | [LE] persists tutorial dismissal; [LS]/[APP] provide Settings/Help re-entry; standalone use needs no optional server setup. L/D32. |
| START-03 | pass | L/D32: three brief task steps and Dismiss; [CS] Help explains domain/keyboard; [LE] targets empty-Library introduction. |
| START-04 | N/A | No permission-gated camera, microphone, contacts, or similar feature; file access uses user-selected panels. |
| START-05 | N/A | → START-04: no app-authored permission prompt. |
| START-06 | pass | [CS] Start on This Mac supports core Library without account/sign-in; server connection is optional. |
| START-07 | N/A | No account creation; standalone Library is available. |
| EDIT-02 | pass | [EV] retains native text editor dispatch, selection-specific Copy and Playlist Delete; [SC] creates useful pasteboard providers. L/D33. |
| EDIT-05 | pass | [SC] copies Episode title plus URL; [SL] copies displayed feed/episode URLs; selectable show notes remain native text. |
| WIN-03 | fail — major | Podcast-page layout places transport outside the window; F2. |
| TOOL-06 | pass | [MW]/[CS]/[APP]: View command and shortcut restore Inspector/sidebar; no owner-customizable toolbar feature is promised. |
| SIDE-03 | pass | [APP] SidebarCommands plus native toggle; [MW] visible Inspector toggle and View shortcut. L/D02. |
| SIDE-04 | pass | L/D03, 06, 10, 18: selection remains visible; Podcast page maps to Subscriptions intentionally. [LM]. |
| SET-01 | pass | L/D11, 22, 27–30: app-wide General/Automation separated from per-Playlist/per-Subscription sheets. [LS], [PT]. |
| RESP-01 | N/O | No five-run input timings, refresh-rate/hitch measurements, or hang trace. |
| RESP-02 | N/O | No five-run input timings, refresh-rate/hitch measurements, or hang trace. |
| FOOT-02 | N/O | No five-run input timings, refresh-rate/hitch measurements, or hang trace. |
| MENU-01 | pass | [MENUS]: App/File/Edit/View/Podcast/Views/Episode/Playlist/Controls/Window/Help; hierarchy and standard anchors retained. |
| MENU-02 | fail — blocker | Persistent failed-Episode-drop Retry has no menu route. See failure F1. |
| MENU-03 | pass | [MENUS], [LC], [EV], [PC], [MC]: unavailable commands retained/dimmed; stateful Play/Pause and Show/Hide titles. |
| MENU-04 | pass | [MENUS]: concise verbs, New View…/Add Podcasts…/Go to Time… and other input-dependent commands use ellipses. |
| MENU-05 | N/O | Menu text hierarchy is available, but menu images/checkmark alignment are not exposed by these snapshots or captured as images. |
| MENU-06 | pass | [MENUS] preserves standard Option alternates (Close All, Minimize All); no custom multi-modifier hidden alternate tasks. |
| APP-01 | fail — minor | Standard About panel has version metadata but no copyright metadata; F8. |
| APP-02 | pass | [APP] Settings scene; [MENUS] Settings…; tour invokes Command-comma and captures L/D27–30. |
| APP-03 | N/O | Services excluded from menu capture; contextual service execution is not established. |
| APP-04 | pass | [MENUS] native Hide/Hide Others/Show All/Quit actions and order; [APP] keeps standard groups. |
| FILE-01 | N/A | Library app, not a file-document editor; OPML is interchange. No document New/Open/Recent/Print feature. |
| FILE-02 | N/A | Library app, not a file-document editor; OPML is interchange. No document New/Open/Recent/Print feature. |
| FILE-03 | pass | [MENUS] performClose; supplied [TOUR] closes Add/Stats/Settings with Command-W. |
| FILE-04 | pass | [LS] export uses a save panel and atomic write; current Library remains open. Duplicate is not offered. |
| FILE-05 | N/A | Library app, not a file-document editor; OPML is interchange. No document New/Open/Recent/Print feature. |
| EDIT-01 | pass | [EV] replaces undo group first with operation-specific Undo/Redo; [MENUS] shows disabled initial Undo/Redo. |
| EDIT-03 | pass | [MENUS] native Edit > Find submenu retained; [LC] Search Library separately uses Command-F for object search. |
| EDIT-04 | pass | [APP] TextEditingCommands; [MENUS] spelling/substitution/transformation/speech and system text commands retained. |
| FMT-01 | N/A | No formatted-text editing. |
| FMT-02 | N/A | No formatted-text editing. |
| VIEW-01 | pass | [MENUS]: View includes native Full Screen and dynamic Hide Sidebar/Inspector; content display controls live in View. [MW], [MC]. |
| VIEW-02 | pass | [MENUS]: View includes native Full Screen and dynamic Hide Sidebar/Inspector; content display controls live in View. [MW], [MC]. |
| WMENU-01 | pass | [MENUS] separate native performMiniaturize/performZoom and Bring All to Front; [APP] does not replace native Zoom with full screen. |
| WMENU-02 | pass | [MENUS] separate native performMiniaturize/performZoom and Bring All to Front; [APP] does not replace native Zoom with full screen. |
| WMENU-03 | N/O | Only one open Library window is listed; multi-window alphabetical order and auxiliary-window exclusion are not established. |
| HELP-01 | pass | [MENUS] trailing Help with PodList Help; [CS] app-specific task/shortcut documentation; system Help menu retains standard keyboard invocation. |
| HELP-02 | N/O | Help search field exists; command search results and Help Book search behavior were not exercised. |
| KEY-02 | pass | [KS], [LC], [PC], [EV]: standard Settings/Undo/text routes retained; Command families for frequent queue/edit commands; no custom Control chord. |
| KEY-03 | pass | [KS], [LC], [PC], [EV]: standard Settings/Undo/text routes retained; Command families for frequent queue/edit commands; no custom Control chord. |
| KEY-05 | pass | [KS] notation orders Option/Shift/Command; [MT] uses + directly; actual menus are system-localized equivalents, not drawn shortcut labels. |
| TEXT-01 | pass | [PC] forwards protected text keys to NSTextView.interpretKeyEvents; native TextField/Text editing commands, with no custom Cocoa key-binding replacement. |
| TEXT-02 | N/O | Native fields and text-editing menus exist; actual replacements/spelling behavior with system preferences is unrecorded. |
| WIN-01 | pass | L/D01 and [APP]: genuine WindowGroup traffic lights; [MENUS] close/minimize/zoom/full screen; no custom frame. |
| WIN-02 | pass | L/D03 versus L/D11–13: native emphasis dims behind sheets; [MA] inherits foreground for selection instead of forcing brand fill. |
| WIN-04 | pass | L/D02, 06, 18, 27, 30 identify view/podcast/pane rather than only app name. [MW]/[CS]. |
| WIN-05 | fail — major | Bottom player contains primary transport, not limited status; owner decision, F3. |
| WIN-06 | pass | [APP]/[MENUS] use native full-screen actions and WindowGroup, with no kiosk/custom screen mode. |
| WIN-07 | pass | [APP]/[LC]/[MW] New Window and Open in New Window for Views/Playlists; separate modeless Add/Now Playing tasks retain Library. L/D24, 26. |
| WIN-08 | pass | [APP]/[LC]/[MW] New Window and Open in New Window for Views/Playlists; separate modeless Add/Now Playing tasks retain Library. L/D24, 26. |
| WIN-09 | pass | [APP]/[MW] native title bar/ToolbarItems; no custom drag region or traffic-light interception. Window sizing defect belongs to WIN-03. |
| WIN-10 | N/O | Live resize/corner grabs and frame timing are not captured. |
| TOOL-01 | pass | L/D02–03, 06, 18: leading navigation/title, grouped standard symbol actions, toolbar search; settings checkboxes/sliders stay in body. [MW], [EV]. |
| TOOL-02 | N/O | Native toolbar items are used; narrow-window overflow and retention of essentials were not captured. |
| TOOL-03 | pass | L/D02–03, 06, 18: leading navigation/title, grouped standard symbol actions, toolbar search; settings checkboxes/sliders stay in body. [MW], [EV]. |
| TOOL-04 | pass | L/D02–03, 06, 18: leading navigation/title, grouped standard symbol actions, toolbar search; settings checkboxes/sliders stay in body. [MW], [EV]. |
| TOOL-05 | pass | L/D02–03, 06, 18: leading navigation/title, grouped standard symbol actions, toolbar search; settings checkboxes/sliders stay in body. [MW], [EV]. |
| SIDE-01 | pass | L/D01–10: default leading source list, flat destinations grouped once, hairline split. [MW]. |
| SIDE-02 | pass | L/D01–10: default leading source list, flat destinations grouped once, hairline split. [MW]. |
| SIDE-05 | pass | L/D01–10: default leading source list, flat destinations grouped once, hairline split. [MW]. |
| SIDE-06 | pass | [MW] native sidebar List; app scale explicitly reset to 1 there so macOS Sidebar icon size remains responsible. Actions placed among top sections. |
| SET-02 | pass | [LS]/[MA]: Appearance defaults to System; Light/Dark optional; accessibility preferences read directly in [MG]. |
| SET-03 | pass | L/D27–30: fixed General/Automation toolbar, selected pane, dimmed minimize/zoom; [CP]/[CS] size pane content. |
| SET-04 | fail — minor | Pane title is correct, but last pane has only transient State; F10. |
| SET-05 | pass | [LS] live settings bindings with field-local retry; task-specific Playlist/Subscription Save is a scoped transaction, not ordinary app Settings. |
| SET-06 | N/O | Settings relaunch exclusion was not recorded; no explicit app lifecycle handling establishes it. |
| DLG-06 | pass | L/D11–13, 16–17, 22–23, 25, 34: one parent sheet; [SH]/[CP] bound size and pin actions; [APP] independent windows. |
| DLG-08 | pass | [APP]/[AD]/[EI]: repeated discovery is modeless and Inspector is inline; no floating palette needing nonactivating NSPanel behavior. L/D24, 26. |
| CTRL-01 | pass | L/D06, 11, 17, 22, 27, 30: compact Mac checkbox/popup/segmented/tab semantics; two Settings panes and three Playlist sections. |
| DATA-02 | N/A | No file-document editing model; Library persistence audited under DATA-01. |
| DATA-03 | N/A | No file-document editing model; Library persistence audited under DATA-01. |
| DATA-07 | pass | [LS] native NSOpenPanel/NSSavePanel with XML/data import and chosen export location; no custom file browser. |
| DATA-08 | N/A | No file-document editing model; Library persistence audited under DATA-01. |
| DRAG-02 | pass | [ET]/[PL]: same-Playlist reorder move, cross-Playlist reference copy, Option checked during drag/drop; existing unique Entry copy safely selects without duplicating. |
| DRAG-04 | pass | [ET] ordered multi-selection payload/private representation before public URL/text; [LD] richest incoming file/URL representation first. |
| DRAG-07 | N/O | No drag-in-progress or inactive-window drag evidence; source uses native transfers, but cannot establish all tracking/cue clauses. |
| PTR-01 | pass | [MW]/[EV]/[PL]: relevant row contexts, unavailable context-only items omitted, roughly three groups, no displayed shortcut bindings in context variant. |
| PTR-02 | pass | [MW]/[EV]/[PL]: relevant row contexts, unavailable context-only items omitted, roughly three groups, no displayed shortcut bindings in context variant. |
| PTR-05 | N/O | No pointer-shape or open-context-target evidence; native APIs do not settle the actual outline/selection result. |
| APPEAR-01 | pass | All 35 L/D pairs coherent; [MA] app-wide appearance override/default System; [APP] one controller serves every window. |
| APPEAR-02 | pass | [BUILD] NSAccentColorName and compiled AccentColor variants; [MA] custom foreground fallback; [MW] system semantic selection. Owner brand is Multicolor accent, not forced tint. |
| APPEAR-06 | pass | L/D03, 07, 17, 26: regular glass only in controls/footer/player; reading content opaque; native toolbar/sidebar materials. [MG], [EI], [PV]. |
| APPEAR-07 | pass | L/D03, 07, 17, 26: regular glass only in controls/footer/player; reading content opaque; native toolbar/sidebar materials. [MG], [EI], [PV]. |
| APPEAR-08 | pass | L/D03, 07, 17, 26: regular glass only in controls/footer/player; reading content opaque; native toolbar/sidebar materials. [MG], [EI], [PV]. |
| TYPE-01 | pass | [MT]/[MW]/[EI]: native semantic fonts, 13 pt body, 10 pt captions; artwork initials are content, not undersized reading UI. |
| TYPE-04 | pass | [MW]/[EI]/[PV] native Mac controls with custom icon targets 28 pt and transport 28 pt in snapshots; larger Play emphasis is localized. No touch-scale layout imposed throughout. |
| AX-03 | pass | [MT] View Bigger/Smaller/Actual Size and 100–200% preference applied to all scenes; [MW]/[PL]/[PS] reading layout retains metadata at enlargement. |
| SYS-01 | pass | [AI] semantic Episodes/Playlists plus transport/add/mark/search intents; [BUILDLOG] confirms 13 intents, 2 entities, 4 shortcuts extracted. Shortcuts/Siri live execution remains untested. |
| SYS-02 | fail — minor | No selection-based Subscribe Service; F12. |
| SYS-03 | fail — minor | Publisher URLs are shareable; app Views/Playlists have no stable app links; F13. |
| SYS-04 | pass | [SL]/[EI]/[LC]/[PS]: native ShareLink for supported public podcast/Episode URLs; no invented custom sharing service. |
| SYS-05 | fail — major | No Spotlight indexing; owner-deferred, F7. |
| SYS-06 | fail — minor | No receiving Share extension for feed URLs; F14. |
| SYS-07 | N/A | No task-relevant document preview/badge workflow established; decorative playback badges are not required. |
| EXTRA-01 | N/A | No menu bar extra or dual-mode quick-access utility. |
| EXTRA-02 | N/A | No menu bar extra or dual-mode quick-access utility. |
| EXTRA-03 | N/A | No menu bar extra or dual-mode quick-access utility. |
| EXTRA-04 | N/A | No menu bar extra or dual-mode quick-access utility. |
| FOOT-01 | N/O | No comparable bundle/launch/idle-resource workload or other-app slowdown measurements. |

## Scores

The same scores cover both appearances: the structure and identified defects match. These are anchored judgments, not a checklist percentage or arithmetic average. Code supplements the screenshots for the behavioral categories; unverified timing/accessibility operation remains partial.

**Measured color evidence:** L02 has white table background; D02 sampled background is sRGB `(36,34,34)`. [MA] supplies secondary text `#606060` in Light and `#A0A0A0` in Dark: approximately **6.29:1** and **6.05:1**, respectively (rounded). White against bundled Light/Dark accent fills is approximately **6.81:1 / 6.41:1**; [MA] additionally chooses contrasting labels and falls back from pale custom accent foregrounds. The criterion is 4.5:1 for small text, including custom dark pairs; 7:1 is the aspiration. These samples support reading-text legibility, not an exhaustive pixel certification of glass over every wallpaper. Disabled controls/decorative empty-state symbols are exempt. High-contrast/opaque behavior is code-backed, not captured.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.4** | Strong: semantic SF, 13 pt body/10 pt captions, two-line title/podcast distinction, aligned dates and time; 200% reading mode is deliberate. Not Exemplary: prose measure and large-text end states remain unverified. [MT], L/D02–03, 17. | `hierarchy`, `accessibility`, `craft` |
| Hierarchy | **7.5** | Strong: source → Episodes → Inspector, quiet content surfaces and clear selected state. Repeated inline Play/Add alongside toolbar and Inspector actions add visual competition; the podcast page loses essential transport to clipping. L/D03, 07, 18–21, 33. | `content-first`, `hierarchy` |
| Spacing & density | **7.4** | Strong at captured sizes: native table rhythm, 225 pt sidebar and roughly 270 pt Inspector, consistent sheet insets. The out-of-bounds podcast composition prevents a higher score; minimum/tiled layouts are not established. [MW], [SH], L/D02, 11–17. | `craft`, `conventions` |
| Color & contrast | **8.5** | Strong: restrained accent, readable secondary pairs, adaptive red, opaque accessibility fallback, semantic selection. No verified contrast failure; wallpaper/high-contrast runtime matrix and pale system accents remain unobserved, keeping it below Exemplary. [MA], [MG], L/D02–03, 20, 30. | `color-restraint`, `accessibility` |
| Iconography | **8.2** | Strong: coherent SF transport/add/share, state labels accompany glyphs. Clear-on-Played eraser requires learning, repeated row tools compete, and the podcast settings gear lacks hover help. L/D01, 03, 06, 18; [EI]. | `conventions`, `craft`, `plain-language` |
| Consistency & polish | **6.7 (stability N/O)** — partial: no full flow run | Competent upper band: shared sheet/footer and designed empty/multi-selection states exceed generic main-path polish. CTRL-04’s unexplained disabled Go state caps this at 6.9; global feedback changes region (I1), and podcast geometry is unfinished. Both appearances have stability N/O, so no stability band is invented. | `craft`, `conventions`, `stability` |
| Clarity | **8.0** | Strong: specific placement verbs, Active Playlist/Current Entry, concrete History explanation, rewind consequences and MCP warning. Views/Entries/Position capitalization and multiple playback routes require some learning; invalid seek gives no explanation. L/D08, 23, 30, 32–34. | `plain-language`, `feedback` |
| Platform fit | **4.9** — partial: untested runtime signals | Raw Looks **8.1**, Behaves **7.2** → `(8.1 + 2×7.2)/3 = 7.5`. Genuine frame, native menus/settings and semantic intents are Strong. **MENU-02 blocker cap reduces the reported score to 4.9**; WIN-03, owner-fixed WIN-05 and SYS-05 would independently cap at 6.9. Unindexed content and incomplete app links/Services limit integration. | `conventions`, `discoverable-commands`, `stability` |
| Interaction & feedback | **6.6** — partial: no timed/live assistive runs | Competent upper band: substantial named Undo, persisted drafts, keyboard guards, nonmodal discovery/player and safe drops. DATA-06 and DRAG-06 cap it at 6.9; unrecovered sidebar width and missing pending drop rows keep it below that ceiling. No claim of instant input/scrolling or complete assistive operation. | `forgiveness`, `feedback`, `keyboard-efficiency`, `direct-manipulation` |
| **Overall** | **6.8 / 10** | Useful, visually Strong personal podcast client with serious completion gaps in the command contract and a captured page layout. Weakest category is Platform fit 4.9, so Overall ceiling is **6.9**; 6.8 respects it. This is a holistic grade, not the mean of the rows. | `content-first`, `conventions`, `character` |

**Mac platform signals:** visual comparison uses the supplied app captures against the standard’s static Things/BBEdit references; no fresh Apple-app comparison was possible. N/O signals are not silently treated as Native.

| Signals | Verdict | Basis |
|---|---|---|
| L1 frame; L2 type; L3 controls; L4 menu implementation; L5 notation | Native | Genuine WindowGroup, semantic fonts, native controls/menu APIs, system equivalents. Menu image/alignment detail remains MENU-05 N/O. |
| L6 sidebar/selection; L7 symbols; L8 Settings; L11 appearance | Native | Native source list, system selection/accent, SF family, Settings scene and System/Light/Dark. |
| L9 density; L10 materials | Adapted | Dense media rows and localized regular-glass player/Inspector/footer preserve Mac grammar. Bottom-only primary transport is an owner-kept Foreign placement signal under WIN-05. |
| B1 command index | Foreign in recovery states | Persistent failed-drop recovery stays outside the menu index (F1); ordinary domain command coverage is substantial. |
| B2 Settings; B3 shortcuts | Native | Command-comma Settings and Command-based command families. International layout operation remains N/O. |
| B4 text | Native implementation / N/O live assistance | Native fields/text commands and key forwarding; Services/substitution execution unverified. |
| B5 full keyboard/lists | N/O | Some selection/focus assertions exist; full type-select/FKA coverage absent. |
| B6 context | Adapted implementation / N/O target outline | Object-specific contexts; actual right-click outline/preserved selection not recorded. |
| B7 windows/state | Adapted, incomplete | Multiple content/task windows, native full screen and SceneStorage; sidebar-width reset is F5. |
| B8 drag | Adapted, incomplete | Multi-item representations, Option semantics and Undo; no pending rows for slow preparation (F6). |
| B9 integration | Adapted, incomplete | Packaged semantic intents, native sharing and OPML; Spotlight, stable app links, selection Service and receiving Share extension absent. |
| B10 Undo/help | Adapted | Named multi-step history plus useful task/shortcut Help; offscreen Undo reveal missing. |
| B11 footprint | N/O | No proportional resource/latency workload. |

**Caps applied:** MENU-02 → Platform fit ≤4.9. WIN-03/WIN-05/SYS-05 → Platform fit ≤6.9 (subsumed by blocker). DATA-06/DRAG-06 → Interaction & feedback ≤6.9. CTRL-04 → Consistency & polish ≤6.9. No Appearance or Typography major/blocker cap. N/O stability supplies no band cap. Overall ≤ lowest scored category +2.0 =6.9. Owner decisions keep their caps.

**Between this build and 9.0:** complete the menu recovery routes; fix the already-visible podcast-page layout; explain invalid seek input; preserve arranged sidebar width; show pending slow-drop content and reveal undone results; finish Settings/tooltip/About details; add the relevant system entry/return routes. Spotlight remains last per the owner. Then obtain minimum/tiled/200% text and contrast/transparency captures plus delayed-completion flows, full keyboard/assistive checks and five timed runs. The owner-kept bottom transport rule still caps Platform fit at 6.9 and therefore Overall at 8.9 under this standard: 9.0 is mathematically unavailable while WIN-05 remains an accepted failure. Removing other defects does not waive that cap.

## Next step

**Target:** MENU-02, the verified blocker, before major layout or integration work. Spotlight and the bottom transport remain outside the target per the owner.

**Anti-pattern:** closest is *Default-menu drift*: the command registry deliberately stops short of the recovery controls rendered by the UI. This is a narrow command-coverage defect, not a claim that the extensive menu tree is generic scaffolding. The closest standard pair is **PLAT-01, “Menus are the complete command index”**. Things would keep one semantic command with several routes; BBEdit would derive the discoverable command entry from the same action used by the control.

**Root cause:** recovery callbacks can be published by FailureFeedback without any menu consumer; persistent failed-drop recovery is not represented as a domain command in the registry. The missing route is structural, not a need for another prominent button.

**Candidate 1 (preferred):** add a stable “Retry Failed Episode Drop” menu item in the appropriate domain menu, enabled only while that retained failure exists and no conflicting edit/import/drop is running; route it to `failure.retry()` exactly as the visible control does. Keep selection and error state unchanged until retry completes. Principle: `discoverable-commands` and `user-control`. Expected: Platform fit improves and the blocker cap can be removed after verifying all analogous recoveries. Risk: wrong-window targeting; use app-retained operation state for the persistent task. No signature element changes.

**Candidate 2:** for field-local failures, consume the focused recovery action with a stable, contextual title such as “Retry Speed Change”; keep specific persistent recovery commands app-scoped. Principle: `feedback` and `keyboard-efficiency`. Expected: command completeness and keyboard recovery improve; risk is ambiguous focus routing, so scope it to the current surface and retain disabled landmarks. The blue identity, density, bottom player and glass all survive.

**Acceptance evidence:** inspect menu states with the failure absent/present/busy; invoke Retry from both menu and inline control on the same prepared failure; verify one retry, the same result/Undo step, and Help command discoverability. After that, target WIN-03’s bounded podcast layout. No implementation step was applied: the brief authorizes only this report. There is consequently no fabricated before/after hill-climb log or claim of reaching the full-audit stopping condition.

Validation of this report: all 168 checklist IDs have exactly one ledger verdict, counts and caps checked, no app code changed. Beads tracking could not be created: its shared database failed to open `LOCK` with “operation not permitted”, following an out-of-sandbox gate-lock failure. No commit/push/sync authority was inferred from Beads; the grading brief explicitly authorizes committing this report, and prohibits merging/pushing.

[MW]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MacWindow.swift
[PS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PodcastScreens.swift
[EV]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift
[VC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/ViewEditorScreen.swift
[PC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PlaybackCommands.swift
[LC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/LibraryCommands.swift
[MC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MenuCommandActions.swift
[PL]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PlaylistContentView.swift
[PV]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PlayerViews.swift
[PT]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift
[LS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift
[CS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/ConnectionViews.swift
[SH]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PodListSheet.swift
[CP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/ContentSizedPanel.swift
[MA]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MacAppearance.swift
[MG]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MacGlass.swift
[MT]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MacTextSize.swift
[WR]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/WindowRestoration.swift
[RS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MacRowScroll.swift
[LM]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/LibraryModel.swift
[LE]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/LibraryEditingModel.swift
[PE]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift
[ET]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/EpisodeTransfer.swift
[LD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/LibraryDrops.swift
[AD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift
[EI]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/EpisodeInspector.swift
[DV]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/DownloadViews.swift
[SC]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/SelectionCommands.swift
[KS]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift
[FF]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/FailureFeedback.swift
[FM]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/FailureMessages.swift
[FA]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/FeedbackAnnouncements.swift
[SD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/SheetSettingsDrafts.swift
[OP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/OPMLImportContent.swift
[SL]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/ShareLinks.swift
[APP]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListMac/PodListMac.swift
[AI]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListMac/AppIntents.swift
[BUILD]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/scripts/build-mac-app.sh
[TOUR]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/UITour/PodListUITour.swift
[E]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6
[README]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/README.md
[MENUS]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/menus.txt
[BUILDLOG]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/build.log
[TESTLOG]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/xcodebuild.log
[L19]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/light/19-description-expanded.png
[D19]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/dark/19-description-expanded.png
[L19TXT]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/light/19-description-expanded.txt
[D19TXT]: /Users/sarvagnan/Documents/podlist-grading/mac-round-6/dark/19-description-expanded.txt
[PS16]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PodcastScreens.swift:16
[ET111]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/EpisodeTransfer.swift:111
[FF17]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/FailureFeedback.swift:17
[MC31]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MenuCommandActions.swift:31
[PV261]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PlayerViews.swift:261
[MW114]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/MacWindow.swift:114
[ET83]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/EpisodeTransfer.swift:83
[PS12]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PodcastScreens.swift:12
[PE110]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:110
[CS57]: /Users/sarvagnan/.t3/worktrees/PodcastClient/t3-b888da56-368506ce14e4dda3/apps/apple/Sources/PodListUI/ConnectionViews.swift:57
