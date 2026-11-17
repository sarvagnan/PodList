# PodList Mac — independent Codex UI grade, round 16

Build: `03531ff`. Reviewed 17 November 2026. Scope: supplied evidence and source only. No app launch, desktop/screen-control tool, code modification, or earlier grading report was used. No implementation iteration was authorized; CRITIQUE steps 6–8 are therefore a proposed follow-up, not work performed by this grader.

## Frame

- **Task:** Find podcast Episodes, organize them into saved Views and ordered Playlists, and control listening without losing Library context.
- **Target:** Native Mac app, macOS 26+; supplied execution on macOS 27.2.
- **Posture:** Sovereign personal library and listening tool, with background playback and transient discovery/Settings tasks.
- **Audience:** Perpetual intermediate; a newcomer must also understand Views versus Playlists.
- **Nearest exemplar:** Things for calm collection/list/detail hierarchy and recoverable changes; BBEdit for a complete command surface. Reference decisions and craft, not visual imitation.
- **Character:** Restrained blue accent under Multicolor; initials/artwork anchors; explicit Episode/Entry/Position vocabulary; compact source-list → table → Inspector structure; bottom transport with a small amount of regular Liquid Glass. Baseline is the unchanged `light/01–03` and `dark/01–03` captures.

**Owner decisions:** Bottom transport, System/Light/Dark override, no customizable toolbar, two-click timed Unsubscribe plus Undo, regular glass control surfaces, deep Dark Multicolor accent, optional MCP off by default and App Intents on. Spotlight explicitly remains last. These decisions are graded normally, including caps; accepted defects are excluded from the next target.

**Evidence notation:** `E` = `/Users/sarvagnan/Documents/podlist-grading/mac-round-16/`. Bare capture numbers refer to both `E/light/NN-name.png` and `E/dark/NN-name.png` plus corresponding `.txt`; an appearance prefix narrows that reference. Filenames ending `.swift` are in `apps/apple/Sources/PodListUI/` unless a different directory is given. Standards: full `CRITIQUE.md`, `guidelines/core-checklist.md`, `mac-checklist.md`, `rubric.md`, Mac L/B signals in `platform-fit.md`, exemplar/principle/contrast guidance, all under `/Users/sarvagnan/Documents/UI_Guidelines/`.

## Flows

**Tasks represented by the supplied tour:**

| Task | Supplied states / source inspection | What this establishes |
|---|---|---|
| Browse and inspect | 01 → 02 → 03 → 04 → 05; 33 | Library hierarchy, selection, multi-selection and Inspector; source/tour assertion for incremental type-select |
| Organize listening | 06 → 07 → 08 → 09/34a → 34 → 10 | Entries versus History/Timeline; rewind preview is cancelled; no completed rewind claimed |
| Create/edit/recover Playlist | 11 → 12 → 13 → 14 | Focus, sheet forms, rename draft and Trash empty state; saved rename/Undo/Redo inspected in source |
| Search and save filter | 15 → 16 → 17 | Scoped query, match count, filter editor and create state; late completion and cancellation logic read in source |
| Manage podcast | 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25 | Expand description, arm/disarm Unsubscribe, object settings, add chooser, discovery and bulk rules |
| Play and configure | 26 → 27 → 28 → 29 → 30 → 31 → 32 | Paused player, separate Settings panes, stats and optional help |

**Tasks run by this reviewer:** none, as explicitly prohibited. The existing script is [PodListUITour.swift](../../apps/apple/UITour/PodListUITour.swift); the supplied run exported 141/141 required attachments, including 70 window images, 70 text snapshots and menus. Light and Dark each use a disposable fixture identity. VM desktop: Retina 1920×1200 pt; Library window: 1180×760 pt (2360×1520 px); Settings General: 640×768 pt, Automation: 640×269 pt. Other utility windows use task-specific sizes.

**Widths/appearances:** typical size in both appearances. No minimum-window/half-display transition sequence supplied. **Timed runs/device:** no five-pass latency distribution, display refresh/hitch trace, or resource workload supplied; host hardware unspecified beyond the VM description. **Measurements file:** none meeting CRITIQUE’s per-step schema. **Screenshot strips:** separate settled state captures, not measured asynchronous flow strips. Some tour assertions cover header positions and focus; they do not replace the required delayed-completion/focus/scroll/input trace.

**Failures:** No scored FLOW transition failure: none can be substantiated with a required measurement row or transition pair. FLOW-01/02/04 and responsiveness remain N/O. Stability sub-score is **N/O in both appearances**, not a guessed high score. Light/31 has 0.5 seconds of listening while Dark/31 is empty, and the latest Timeline event differs; those are fixture-state differences, not evidence that Dark Mode changes data.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library / Views / search, 01–05/15/33 | Top content status row; neutral operation wording; settled captures show Up to date | Same top status row, red authored text plus Retry (code) | none | Top trailing named Undo/Redo; 13–21/33 show Redo after fixture edits | Centered symbol/title/prose; Inspector asks Select an Episode | none | Top native toolbar Play/Add, selection-dependent but retained | Filter summary above table; 15 Create View… beside result count |
| Playlist Entries/History, 06–08/10 | Same Library status row | Same row and persistent failed-drop placeholders (code) | none | Same named status/menu route | 08 centered No History plus explanation; no misleading manual-mark History | none | Toolbar and centered Entries/History/Listening Timeline switch | Current Entry text; Inspector memberships and per-Playlist Position |
| Timeline / rewind, 09/34a/34 | Same Library row | Rewind sheet status above footer (code) | Centered parent sheet, Rewind Playlist; neutral summary | Standard named history after commit (code); preview capture cancelled | Source supplies No Listening Timeline state | Preview blocks its parent only | Per-event trailing Rewind to Here…; sheet Rewind bottom trailing | Goes back to / Unplayed again / Back in the Playlist / Kept explains effects |
| Playlist settings/create, 11–13 | Commit closes sheet and uses Library status (code) | Field-local validation; save failure above pinned footer, red + Retry | Parent sheet; neutral title | Library named history; drafts retained for retry | New Playlist has empty Name and disabled Create | Parent sheet only | Save/Create bottom trailing; Cancel adjacent | Clear on Played and deletion/recovery prose in reading area |
| View edit/create, 16–17 | Live match count near title; final commit closes to Library status | Field-local red validation; failure above footer | Parent sheet | Named menu Undo/Redo; Cancel waits for and reverses this edit session | New View has disabled Create until a valid name | Parent sheet only | Save/Create View bottom trailing | All Conditions Must Match; optional units and fields |
| Podcast page, 18–21 | Subscription control says Subscribed with checkmark | Library status row or local recovery (code) | Same control arms red Unsubscribe and automatically disarms | Named Library Undo/history | Source provides empty Episode states | none | Subscribe/Unsubscribe in header; row Play/Add and toolbar | Description expands within bounded scroll region; Download Rule remains labelled |
| Subscription/bulk rules/add chooser, 22–23/25 | Commit returns to Library status | Field/local footer feedback (code) | Parent task sheet | Library named history | none | Parent sheet only | Save/Add/Apply bottom trailing | Mark All Played is explicitly immediate; Add means append |
| Add Podcasts, 24 | Subscribed check/text in result row; neutral editor feedback (code) | Inline near discovery/results, red + Retry | none | Library named history route (code) | Search symbol, Find Your Next Podcast and feed URL example | none; modeless utility | Search beside labelled field; per-result Subscribe | Import instructions remain above results |
| Now Playing, 26 | State visible in Play/Pause and position | At player surface, neutral high-contrast message + Retry (code) | none | Library edits routed back to context | Source supplies No Current Entry | none | Central transport and seek; Episode Details/Open Active Playlist below | Menus and action tooltips |
| Settings General/Automation, 27–30 | Value changes live; no generic Saved toast | Beneath affected setting, red + Retry (code) | none | Library settings changes use history; no separate transient toast | MCP details omitted while off | none | Native labelled settings controls; explicit MCP enable | Persistent import instructions, text-size scope and local MCP access explanation |
| Stats / Getting Started, 31–32 | Data itself | none captured | none | none | Dark/31 centered No Listening Time Yet with explanation | 32 is a dismissible sheet only when invoked from Settings | Show Daily Table / Hide Getting Started | Clear distinction between actual listening and moving Position; three short onboarding steps |

**Column mismatches:** No confirmed gratuitous message-place/wording/color mismatch among the supplied states. Library errors are window-wide, form errors field-local, and player errors stay on their owning control surface; these reflect distinct causes. The player uses primary text on glass while reading-surface errors use red, with explicit failure text in both; that contrast accommodation is deliberate. Save/Add/Apply express distinct effects rather than inconsistent synonyms. The parent status bar’s Redo history survives navigation, while transient success prose is suppressed on a new surface (`EditingFeedbackLifetime`); the captured idle history button is not a stale success message. No transition stability score is inferred from this inventory.

## Checklist

Coverage: **85.3%** (pass **120** · fail **8** [4 major, 4 minor] · N/O **22** · N/A **18**). Applicable denominator: 150; all **168** current core/Mac IDs accounted for exactly once. N/O and N/A impose no checklist caps.

### Failures by severity

**Blockers: none verified.** AX-01 remains unverified for the reasons below; missing XCUI labels are not automatically treated as proof of a broken VoiceOver name.

**Majors**

- **F1 — APPEAR-04, Color & contrast:** The selected Dark Settings pane’s text is materially below the required 4.5:1. In `E/dark/30-settings-automation.png` (1280×538 px), the interior Automation glyph/text ink around `(624,120,145,40)` is predominantly `#435FDD`; the surrounding selected control is about `#4A4947`. Linear-sRGB contrast is **1.68:1**. The selected General label in dark/27–29 has the same issue. This is a control label, not disabled/decorative text, so major severity applies. Source: `ConnectionViews.swift:61–69`, `Resources/MacAssets.xcassets/AccentColor.colorset/Contents.json`; actual rendered ink, rather than the raw asset, was measured. **Principle:** accessibility. **Concrete fix if the owner revisits this:** preserve the deep selection-fill accent, but render the selected Settings pane label/icon with a separately contrast-safe semantic foreground (≥4.5:1). **Owner accepted; not a target.** APPEAR-02 still passes because macOS owns the accent choice.
- **F2 — KEY-03, Interaction & feedback:** `LibraryCommands.swift:58` assigns the custom sidebar toggle **⌃⌘S**, despite this checklist explicitly requiring Control to be avoided in custom bindings. It is a frequent navigation command and appears as Hide Sidebar in `E/menus.txt`; the tour cannot expose its shortcut, so source is the evidence. The rest of the command families are substantially better organized. **Principle:** keyboard-efficiency. **Concrete fix:** use **⌥⌘S**, after retaining the command’s existing visible/menu routes and checking for a conflicting standard/app equivalent; update its help/reference entry. This is a strict rule failure, not a claim that the current shortcut fails to execute.
- **F3 — WIN-05, Platform fit:** The essential transport and seek controls occupy the bottom-most 92+ pt control layer in every Library capture, e.g. 01/06/18. `MacWindow.swift:194–201` inserts `PlayerBar` at the bottom; `PlayerViews.swift:15–44` holds transport/title/seek there. The checklist restricts a bottom bar to limited status, so this fails even though Controls menus and Now Playing provide other routes. **Principle:** content-first. **Concrete compliance fix, only if the owner reverses this decision:** put persistent transport/seek above the bottom edge, retaining the bottom for status. **Owner fixed bottom player; not a target.**
- **F4 — SYS-05, Platform fit:** Searchable Episodes/Playlists are not indexed in Spotlight. No Core Spotlight/indexing implementation is present in `apps/apple/Sources`; `PodListMac/PodListMac.swift` registers App Shortcuts but no Library search index. Capture 30 establishes App Intents availability; it does not establish Spotlight Library indexing. **Principle:** discoverable-commands. **Concrete fix:** implement incremental searchable Library metadata and deletion handling, with activation resolving stable Library destinations. **Explicitly deferred to last; not the next target.**

**Minors**

- **F5 — HELP-02:** `E/menus.txt` retains the native Help search field and useful documentation, but `PodListMac/PodListMac.swift:59–64` opens `PodListHelp` in an app window; `scripts/build-mac-app.sh:17–61` supplies no Help Book registration/resources. The Help Book clause is unmet, while Help command search itself earns credit. **Principle:** discoverable-commands. **Fix:** package/register a searchable Help Book or supported Help Viewer documentation, retaining native command search and the existing task content.
- **F6 — SET-04:** Pane selection is only `@State private var pane = "general"` (`ConnectionViews.swift:57`). It is not stored across process/view recreation, so reopening Settings after a relaunch cannot restore Automation as the last viewed pane. 27–30 show correct pane titles and sizing, but not persistence. **Principle:** stability. **Fix:** store pane selection with an app-scoped persisted preference, validating it against General/Automation; restore it only when Settings is opened, keeping the window transient.
- **F7 — SYS-02:** Selected RSS/feed URLs are useful input from browsers/text apps, but no purpose-specific Services provider is declared or implemented (`scripts/build-mac-app.sh` and `apps/apple/Sources`). Add Podcasts currently requires opening its panel/pasting or dragging. 24 shows that task. **Principle:** conventions. **Fix:** provide a Subscribe/Preview Podcast Feed Service accepting URL/plain text, opening the existing discovery/preview route without silently subscribing.
- **F8 — SYS-03:** `ShareLinks.swift` shares publisher/feed/enclosure web addresses; `PodListMac/PodListMac.swift:46–50` handles file URLs for OPML only, and the bundle declares no app URL scheme or associated-domain routing. A saved View or Playlist has no stable external address that reopens it. **Principle:** user-control. **Fix:** introduce validated stable links for Playlist/View/Episode IDs and route them to the appropriate Library without changing playback implicitly.

### Not observed

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-07, DATA-06, DRAG-05, DRAG-06, PTR-03, APPEAR-11, AX-01, AX-04, WIN-03, RESP-01, RESP-02, FOOT-02, APP-03, WIN-10, TOOL-02, DRAG-07, PTR-05, FOOT-01.

The snapshots omit live VoiceOver, Services and context-menu interactions. In particular `light/27-settings-general-top.txt:8,16,20,31,34` and `24-add-podcasts.txt:5` have unnamed XCUI controls despite nearby visible labels/native Picker/Toggle/TextField declarations. XCUITest does not expose all AX label/placeholder relationships; check these controls with VoiceOver/AX associations before claiming full accessibility. Inspector/toolbar labels are explicitly implemented and captured. This is a concrete evidence gap, not an invented blocker.

### Not applicable

DLG-09: No app-authored editable popover; menu buttons are native menus, sheets are audited separately.; CTRL-02: No parent/child checkbox hierarchy.; LIST-05: No app-owned hierarchical disclosure tree requiring descendant expansion/restoration; sidebar grouping is shallow.; START-05: No app-triggered protected-resource permission prompt/purpose string in the reviewed workflows.; START-07: No account-creation feature.; FILE-01: Library client imports/exports OPML rather than opening editable documents; no document New/Open Recent workflow.; FILE-02: Library client imports/exports OPML rather than opening editable documents; no document New/Open Recent workflow.; FILE-05: No printing feature.; FMT-01: No formatted-text editor; show notes are selectable reading text.; FMT-02: No formatted-text editor; show notes are selectable reading text.; DATA-02: Not an editable document application; persistent Library records/drafts use DATA-01/04/06.; DATA-03: Not an editable document application; persistent Library records/drafts use DATA-01/04/06.; DATA-08: Not an editable document application; persistent Library records/drafts use DATA-01/04/06.; SYS-07: No separate Dock-tile workflow or badge requirement established; minimized content is system-owned and no app-specific preview is supplied.; EXTRA-01: No menu bar extra or dual-mode quick-entry utility.; EXTRA-02: No menu bar extra or dual-mode quick-entry utility.; EXTRA-03: No menu bar extra or dual-mode quick-entry utility.; EXTRA-04: No menu bar extra or dual-mode quick-entry utility..

No dependent failure was multiplied into extra failures; the web-only checklist is outside the Mac target.

### Complete verdict register

Every row has exactly one verdict. Pass means the cited channel establishes the requirement at the inspected scope; a source-level pass is not a claim that a live assistive or performance test ran.

| ID | Verdict | Evidence / disposition |
|---|---|---|
| FLOW-01 | N/O | No measured transition strip, focus/scroll trace, or minimum-width run; settled captures cannot establish these checks. |
| FLOW-02 | N/O | No measured transition strip, focus/scroll trace, or minimum-width run; settled captures cannot establish these checks. |
| FLOW-03 | pass | AddPodcastsWindow.swift:143–155 guards cancelled/outdated searches; ViewEditorScreen.swift:156–157 guards reconciliation while applying or holding drafts; queued saves take immutable values. |
| FLOW-04 | N/O | No measured transition strip, focus/scroll trace, or minimum-width run; settled captures cannot establish these checks. |
| FLOW-05 | pass | 02, 03, 06, 07, 18: native split panes share the content region; inspector has a deliberately separate reading layout. |
| FLOW-06 | pass | 08, 14, 24, dark/31 have explicit empty states; EpisodeInspector.swift:115–153 supplies No Playlists/No show notes and omits empty Chapters. |
| FLOW-07 | pass | 11–13, 16–17, 22–23, 25, 34: primary sheet action consistently bottom trailing; PodListSheetFooter owns placement. |
| KEY-01 | N/O | Source provides native controls and scoped key handlers, but end-to-end Full Keyboard Access and all scroll-key behavior are not established. |
| KEY-04 | pass | 11–13, 16–17, 22–25 show native focus rings and expected initial input; AddPodcastsWindow.swift:108–125 and PlaylistSettingsViews.swift:29 explicitly establish focus. |
| KEY-06 | pass | KeyboardShortcuts.swift uses letters, Return and arrows; MacTextSize.swift uses upper-character + notation; no physical US-only key-code command mapping. |
| KEY-07 | N/O | Source provides native controls and scoped key handlers, but end-to-end Full Keyboard Access and all scroll-key behavior are not established. |
| KEY-08 | pass | ConnectionViews.swift:91–126 provides a selectable in-app shortcut reference and documents scoped Space/Return and text-entry exceptions. |
| DLG-01 | pass | 11–13, 16–17, 22–23, 25, 34: bounded tasks, specific titles, verb actions, safe Cancel; PodListSheet.swift and PlaybackKeyboardGuard handle Esc/⌘.; recoverable edits use Undo/Trash. |
| DLG-02 | pass | 11–13, 16–17, 22–23, 25, 34: bounded tasks, specific titles, verb actions, safe Cancel; PodListSheet.swift and PlaybackKeyboardGuard handle Esc/⌘.; recoverable edits use Undo/Trash. |
| DLG-03 | pass | 11–13, 16–17, 22–23, 25, 34: bounded tasks, specific titles, verb actions, safe Cancel; PodListSheet.swift and PlaybackKeyboardGuard handle Esc/⌘.; recoverable edits use Undo/Trash. |
| DLG-04 | pass | 11–13, 16–17, 22–23, 25, 34: bounded tasks, specific titles, verb actions, safe Cancel; PodListSheet.swift and PlaybackKeyboardGuard handle Esc/⌘.; recoverable edits use Undo/Trash. |
| DLG-05 | pass | 11–13, 16–17, 22–23, 25, 34: bounded tasks, specific titles, verb actions, safe Cancel; PodListSheet.swift and PlaybackKeyboardGuard handle Esc/⌘.; recoverable edits use Undo/Trash. |
| DLG-07 | pass | 11–13, 16–17, 22–23, 25, 34: bounded tasks, specific titles, verb actions, safe Cancel; PodListSheet.swift and PlaybackKeyboardGuard handle Esc/⌘.; recoverable edits use Undo/Trash. |
| DLG-09 | N/A | No app-authored editable popover; menu buttons are native menus, sheets are audited separately. |
| CTRL-02 | N/A | No parent/child checkbox hierarchy. |
| CTRL-03 | pass | 11–13, 16–17, 22–25: persistent visible labels, optional filter fields marked; PodListSheetField associates custom labels. Screen-reader naming is separately unverified under AX-01. |
| CTRL-04 | pass | FormNumbers.swift, ViewEditorScreen.swift:183–215 and LibrarySettingsScreens.swift:226–255 provide locale-aware parsing and field-local validation; compact numeric widths suit seconds/counts. |
| CTRL-05 | pass | MacIconLabel.swift gives 28 pt label targets; custom styles delegate interaction to native Button styles, and sheet primary emphasis is style-based. |
| CTRL-06 | pass | EpisodeEditingViews.swift:123–171 keeps Play/Add and contextual actions visible; PlayerViews.swift Speed/Sleep menus contain related choices. |
| CTRL-07 | pass | 15 shows Search plus result count; 18 shows Search Episodes; MacWindow.swift:178 scopes the prompt. No displayed search history. |
| CTRL-08 | pass | OPMLImportContent.swift uses counts/progress and Cancel; downloads offer pause-equivalent cancellation; EpisodeTransfer.swift reserves pending rows and reports completed/total. Timing remains N/O. |
| LIST-01 | pass | 02–07, 10, 15, 18, 33: named native tables, noun headings, visible selection, crisp row separators; MacWindow.swift and PodcastScreens.swift use Table sortOrder and resizable columns; ordered Entries intentionally retain sequence. |
| LIST-02 | pass | 02–07, 10, 15, 18, 33: named native tables, noun headings, visible selection, crisp row separators; MacWindow.swift and PodcastScreens.swift use Table sortOrder and resizable columns; ordered Entries intentionally retain sequence. |
| LIST-03 | pass | 02–07, 10, 15, 18, 33: named native tables, noun headings, visible selection, crisp row separators; MacWindow.swift and PodcastScreens.swift use Table sortOrder and resizable columns; ordered Entries intentionally retain sequence. |
| LIST-04 | pass | 02–07, 10, 15, 18, 33: named native tables, noun headings, visible selection, crisp row separators; MacWindow.swift and PodcastScreens.swift use Table sortOrder and resizable columns; ordered Entries intentionally retain sequence. |
| LIST-05 | N/A | No app-owned hierarchical disclosure tree requiring descendant expansion/restoration; sidebar grouping is shallow. |
| LIST-06 | pass | 02–07, 10, 15, 18, 33: named native tables, noun headings, visible selection, crisp row separators; MacWindow.swift and PodcastScreens.swift use Table sortOrder and resizable columns; ordered Entries intentionally retain sequence. |
| LIST-07 | pass | MacRowScroll.swift implements scoped incremental type selection and reveal; native selectable List/Table plus contextMenu primaryAction opens details. UITour/PodListUITour.swift:84–90 asserts type-selection after clicking an Episode. |
| DATA-01 | pass | LibraryEditingModel.swift:136–140 and SheetSettingsDrafts.swift persist drafts; ViewEditorScreen.swift:229–274 serializes saves/cancellation; PlaylistEditingModel.swift implements named multi-step history; LibraryModel.swift:281 reveals restored Entries. 14 preserves Trash recovery. |
| DATA-04 | pass | LibraryEditingModel.swift:136–140 and SheetSettingsDrafts.swift persist drafts; ViewEditorScreen.swift:229–274 serializes saves/cancellation; PlaylistEditingModel.swift implements named multi-step history; LibraryModel.swift:281 reveals restored Entries. 14 preserves Trash recovery. |
| DATA-05 | pass | LibraryEditingModel.swift:136–140 and SheetSettingsDrafts.swift persist drafts; ViewEditorScreen.swift:229–274 serializes saves/cancellation; PlaylistEditingModel.swift implements named multi-step history; LibraryModel.swift:281 reveals restored Entries. 14 preserves Trash recovery. |
| DATA-06 | N/O | WindowRestoration.swift and MacRowScroll.swift implement per-scene selection, panes, sorts and row anchors; the supplied run disables OS state restoration, so complete window geometry/relaunch behavior is not settled. |
| DRAG-01 | pass | EpisodeTransfer.swift, PlaylistContentView.swift:61–145, LibraryDrops.swift implement Episode/URL/text/OPML transfers; menu Move/Add/Import equivalents exist; committed batches use undo history, incoming library files stage a preview. |
| DRAG-03 | pass | EpisodeTransfer.swift, PlaylistContentView.swift:61–145, LibraryDrops.swift implement Episode/URL/text/OPML transfers; menu Move/Add/Import equivalents exist; committed batches use undo history, incoming library files stage a preview. |
| DRAG-05 | N/O | Native List/Table supply drag interaction and code provides placeholders, progress and selection, but drag-image threshold, destination cues and autoscroll are not captured. |
| DRAG-06 | N/O | Native List/Table supply drag interaction and code provides placeholders, progress and selection, but drag-image threshold, destination cues and autoscroll are not captured. |
| PTR-03 | N/O | No gesture overrides found; runtime pointer shapes and all system gestures are absent from the evidence. |
| PTR-04 | pass | MacIconLabel call sites, InspectorActions, toolbar actions and row controls carry action help; full Episode titles/errors use Presentation.tooltip; row actions remain present, with hover changing emphasis only. |
| APPEAR-03 | pass | MacGlass.swift:31–44 supplies opaque window-background surfaces plus strokes for Reduce Transparency OR Increase Contrast; MacAppearance.swift and AccentColor asset define all four variants. Implementation verified; preference combinations not photographed. |
| APPEAR-04 | fail major | F1: dark selected Settings tab label measures about 1.68:1; owner-accepted consequence. See failure record. |
| APPEAR-05 | pass | No app-authored positional/depth/blur animation found in UI source; native system transitions retain OS Reduce Motion handling. |
| APPEAR-09 | pass | 01–34a: one SF Symbols family, familiar Play/Share/Trash/sidebar glyphs; control surfaces visibly separate from white/charcoal reading surfaces. |
| APPEAR-10 | pass | 01–34a: one SF Symbols family, familiar Play/Share/Trash/sidebar glyphs; control surfaces visibly separate from white/charcoal reading surfaces. |
| APPEAR-11 | N/O | Only settled states supplied; coherent intermediate/loading frames cannot be established from code alone. |
| TYPE-02 | pass | System semantic fonts throughout reading content; regular/medium/bold roles and 10 pt minimum captions; no competing custom type families. |
| TYPE-03 | pass | System semantic fonts throughout reading content; regular/medium/bold roles and 10 pt minimum captions; no competing custom type families. |
| TYPE-05 | pass | ContentSizedPanel.swift, MacTextSize.swift and PodListSheet.swift wrap prose/labels and pin footers; enlarged content changes tables to MacReadingRow. Source supports retention; live resize performance remains N/O. |
| TYPE-06 | pass | 19: description has separated paragraphs and a moderate reading measure, roughly 75–85 characters on full lines; system body leading is approximately 16/13 = 123%. Help has a bounded 540 pt inner width. Short fixture notes are not treated as full-length lines. |
| TYPE-07 | pass | 01–34a: no long all-caps passages or combined bold-italic emphasis; native ellipses and typographic quotes/dashes in app instructions; literal feed URLs and publisher/user titles exempt. |
| TYPE-08 | pass | 01–34a: no long all-caps passages or combined bold-italic emphasis; native ellipses and typographic quotes/dashes in app instructions; literal feed URLs and publisher/user titles exempt. |
| COPY-01 | pass | Specific Create/Add/Save/Rewind verbs; 08, 14, 24, dark/31 explain empty states; FailureMessages.swift separates recovery copy from diagnostics; FailureFeedback.swift places Retry at the failure. Consistent task nouns and concise help fragments. |
| COPY-02 | pass | Specific Create/Add/Save/Rewind verbs; 08, 14, 24, dark/31 explain empty states; FailureMessages.swift separates recovery copy from diagnostics; FailureFeedback.swift places Retry at the failure. Consistent task nouns and concise help fragments. |
| COPY-03 | pass | Specific Create/Add/Save/Rewind verbs; 08, 14, 24, dark/31 explain empty states; FailureMessages.swift separates recovery copy from diagnostics; FailureFeedback.swift places Retry at the failure. Consistent task nouns and concise help fragments. |
| COPY-04 | pass | Specific Create/Add/Save/Rewind verbs; 08, 14, 24, dark/31 explain empty states; FailureMessages.swift separates recovery copy from diagnostics; FailureFeedback.swift places Retry at the failure. Consistent task nouns and concise help fragments. |
| AX-01 | N/O | Inspector/toolbar names and states are explicit in code and snapshots; General grouped pop-ups, Volume Boost and addPodcasts.query have empty XCUI label/title. AX label associations/placeholder and live VoiceOver output are not exported, so neither a complete pass nor a blocker is established. |
| AX-02 | pass | Current Entry text/icon, Active Playlist description, Star/Played shapes, armed Unsubscribe text and persistent error prose all supplement color; 06, 20, 33 and Inspector snapshots. |
| AX-04 | N/O | Menu routes replace drag/gesture requirements, but actual Voice Control/Switch Control operation is not established by source or these snapshots. |
| AX-05 | pass | PlayerViews.swift and SystemPlayback.swift expose Play/Pause and visual playback/position/error state; no critical audio-only alerts. Publisher transcripts are not promised by this client. |
| START-01 | pass | MacWindow.swift:35–44 provides Opening Library progress before async start, then usable Library/Welcome; background import/download state does not block unrelated browsing. Actual latency is unverified. |
| START-02 | pass | 32 and LibrarySettingsScreens.swift:257–305: optional Getting Started can be hidden, preference retained by LibraryEditingModel, and reopened from Help/Window/Settings. |
| START-03 | pass | 32 and LibrarySettingsScreens.swift:257–305: optional Getting Started can be hidden, preference retained by LibraryEditingModel, and reopened from Help/Window/Settings. |
| START-04 | pass | No launch-time protected-resource request found; native file selection is invoked at Import/Export; MCP is off by default and enabled only explicitly (30). |
| START-05 | N/A | No app-triggered protected-resource permission prompt/purpose string in the reviewed workflows. |
| START-06 | pass | Standalone Library available without account creation; Welcome supports an optional server connection rather than mandatory sign-in. |
| START-07 | N/A | No account-creation feature. |
| EDIT-02 | pass | Native text responder and TextEditingCommands; EpisodeCopyContent in SelectionCommands.swift offers title/plain text and URL; PlaylistContentView.swift uses onCopyCommand/onDeleteCommand without writing clipboard on Delete. |
| EDIT-05 | pass | Native text responder and TextEditingCommands; EpisodeCopyContent in SelectionCommands.swift offers title/plain text and URL; PlaylistContentView.swift uses onCopyCommand/onDeleteCommand without writing clipboard on Delete. |
| WIN-03 | N/O | Typical 1180×760 pt is clean; min 760×500 and half-screen layouts are not supplied. Adaptive source is credible but cannot establish all display/size combinations. |
| TOOL-06 | pass | LibrarySidebarCommands and PodListCommands expose menu shortcuts plus visible sidebar/Inspector controls; 02 and menus.txt. No customizable toolbar by owner decision. |
| SIDE-03 | pass | LibrarySidebarCommands and PodListCommands expose menu shortcuts plus visible sidebar/Inspector controls; 02 and menus.txt. No customizable toolbar by owner decision. |
| SIDE-04 | pass | 03/07/33 retain gray sidebar selection while the detail table is focused; 18 retains Subscriptions for the Podcast page. |
| SET-01 | pass | 27–30: application preferences in separate Settings; 11/22/25 keep task/object settings with Playlist/Subscription selection. |
| RESP-01 | N/O | No five-pass timings, frame-rate keystroke measurements, hitch trace, or hang workload. A successful XCUITest tour is not responsiveness evidence. |
| RESP-02 | N/O | No five-pass timings, frame-rate keystroke measurements, hitch trace, or hang workload. A successful XCUITest tour is not responsiveness evidence. |
| FOOT-02 | N/O | No five-pass timings, frame-rate keystroke measurements, hitch trace, or hang workload. A successful XCUITest tour is not responsiveness evidence. |
| MENU-01 | pass | menus.txt plus LibraryCommands, EpisodeEditingViews, PlaybackCommands and MenuCommandActions: standard order, persistent disabled commands, stateful titles, domain command index, one submenu level. Sheet submission/cancel and choice fields remain local controls; no separate missing persistent operation found. Native modifier alternates retained. |
| MENU-02 | pass | menus.txt plus LibraryCommands, EpisodeEditingViews, PlaybackCommands and MenuCommandActions: standard order, persistent disabled commands, stateful titles, domain command index, one submenu level. Sheet submission/cancel and choice fields remain local controls; no separate missing persistent operation found. Native modifier alternates retained. |
| MENU-03 | pass | menus.txt plus LibraryCommands, EpisodeEditingViews, PlaybackCommands and MenuCommandActions: standard order, persistent disabled commands, stateful titles, domain command index, one submenu level. Sheet submission/cancel and choice fields remain local controls; no separate missing persistent operation found. Native modifier alternates retained. |
| MENU-04 | pass | menus.txt plus LibraryCommands, EpisodeEditingViews, PlaybackCommands and MenuCommandActions: standard order, persistent disabled commands, stateful titles, domain command index, one submenu level. Sheet submission/cancel and choice fields remain local controls; no separate missing persistent operation found. Native modifier alternates retained. |
| MENU-05 | pass | menus.txt plus LibraryCommands, EpisodeEditingViews, PlaybackCommands and MenuCommandActions: standard order, persistent disabled commands, stateful titles, domain command index, one submenu level. Sheet submission/cancel and choice fields remain local controls; no separate missing persistent operation found. Native modifier alternates retained. |
| MENU-06 | pass | menus.txt plus LibraryCommands, EpisodeEditingViews, PlaybackCommands and MenuCommandActions: standard order, persistent disabled commands, stateful titles, domain command index, one submenu level. Sheet submission/cancel and choice fields remain local controls; no separate missing persistent operation found. Native modifier alternates retained. |
| APP-01 | pass | menus.txt: About, Settings…, Hide/Hide Others/Show All/Quit; PodListMac.swift Settings scene supplies ⌘,; bundle includes version/copyright. 27–30 verify separate titled Settings. |
| APP-02 | pass | menus.txt: About, Settings…, Hide/Hide Others/Show All/Quit; PodListMac.swift Settings scene supplies ⌘,; bundle includes version/copyright. 27–30 verify separate titled Settings. |
| APP-03 | N/O | Services excluded from capture. Native text fields supply a plausible consumer route, but applicable Services and contextual execution are not established. |
| APP-04 | pass | menus.txt: About, Settings…, Hide/Hide Others/Show All/Quit; PodListMac.swift Settings scene supplies ⌘,; bundle includes version/copyright. 27–30 verify separate titled Settings. |
| FILE-01 | N/A | Library client imports/exports OPML rather than opening editable documents; no document New/Open Recent workflow. |
| FILE-02 | N/A | Library client imports/exports OPML rather than opening editable documents; no document New/Open Recent workflow. |
| FILE-03 | pass | menus.txt has native Close/Close All; WindowGroup/Window/UtilityWindow retain system close behavior. |
| FILE-04 | pass | LibraryFileActions.exportOPML writes a separate OPML file without replacing or closing Library; no Duplicate-document feature. |
| FILE-05 | N/A | No printing feature. |
| EDIT-01 | pass | menus.txt has named Undo/Redo, complete native Find, spelling/substitution/transformation/speech and system Dictation/Emoji; EpisodeEditingViews.swift:329–342 routes Undo to focused text before Library history. |
| EDIT-03 | pass | menus.txt has named Undo/Redo, complete native Find, spelling/substitution/transformation/speech and system Dictation/Emoji; EpisodeEditingViews.swift:329–342 routes Undo to focused text before Library history. |
| EDIT-04 | pass | menus.txt has named Undo/Redo, complete native Find, spelling/substitution/transformation/speech and system Dictation/Emoji; EpisodeEditingViews.swift:329–342 routes Undo to focused text before Library history. |
| FMT-01 | N/A | No formatted-text editor; show notes are selectable reading text. |
| FMT-02 | N/A | No formatted-text editor; show notes are selectable reading text. |
| VIEW-01 | pass | menus.txt retains Full Screen, sidebar/Inspector state titles, separate Minimize/Zoom, native window list and Bring All to Front; app view commands are separated from window navigation. Runtime Zoom animation not claimed. |
| VIEW-02 | pass | menus.txt retains Full Screen, sidebar/Inspector state titles, separate Minimize/Zoom, native window list and Bring All to Front; app view commands are separated from window navigation. Runtime Zoom animation not claimed. |
| WMENU-01 | pass | menus.txt retains Full Screen, sidebar/Inspector state titles, separate Minimize/Zoom, native window list and Bring All to Front; app view commands are separated from window navigation. Runtime Zoom animation not claimed. |
| WMENU-02 | pass | menus.txt retains Full Screen, sidebar/Inspector state titles, separate Minimize/Zoom, native window list and Bring All to Front; app view commands are separated from window navigation. Runtime Zoom animation not claimed. |
| WMENU-03 | pass | menus.txt retains Full Screen, sidebar/Inspector state titles, separate Minimize/Zoom, native window list and Bring All to Front; app view commands are separated from window navigation. Runtime Zoom animation not claimed. |
| HELP-01 | pass | Trailing Help retains native search and app-specific PodList Help; ConnectionViews.swift:77–127 supplies task documentation and shortcuts through a separate window. |
| HELP-02 | fail minor | F5: native command search exists, but no Help Book bundle/registration; documentation is a custom window. |
| KEY-02 | pass | Native standard edits preserved; PlaybackKeyboardGuard routes text/sheet equivalents before playback; KeyboardShortcuts.swift uses ordered Mac modifier glyphs and + upper-character notation. |
| KEY-03 | fail major | F2: custom Show/Hide Sidebar uses ⌃⌘S. Frequent commands otherwise have ⌘ families; explicit rubric clause avoids Control for custom commands. |
| KEY-05 | pass | Native standard edits preserved; PlaybackKeyboardGuard routes text/sheet equivalents before playback; KeyboardShortcuts.swift uses ordered Mac modifier glyphs and + upper-character notation. |
| TEXT-01 | pass | Native TextField/NSTextView interpretation retained, no custom editor; TextEditingCommands plus PlaybackKeyboardGuard.swift in PlaybackCommands.swift:183–232 preserve Cocoa editing and binding interpretation. No live dictation/service claim. |
| TEXT-02 | pass | Native TextField/NSTextView interpretation retained, no custom editor; TextEditingCommands plus PlaybackKeyboardGuard.swift in PlaybackCommands.swift:183–232 preserve Cocoa editing and binding interpretation. No live dictation/service claim. |
| WIN-01 | pass | 01–34a show system frame controls, view-specific titles, native emphasized/unemphasized selections; native windows and semantic foregrounds retain activation behavior. Long Playlist names are retained rather than truncated to a title-length heuristic. |
| WIN-02 | pass | 01–34a show system frame controls, view-specific titles, native emphasized/unemphasized selections; native windows and semantic foregrounds retain activation behavior. Long Playlist names are retained rather than truncated to a title-length heuristic. |
| WIN-04 | pass | 01–34a show system frame controls, view-specific titles, native emphasized/unemphasized selections; native windows and semantic foregrounds retain activation behavior. Long Playlist names are retained rather than truncated to a title-length heuristic. |
| WIN-05 | fail major | F3: essential playback/seek lives in bottom bar; accepted owner decision. |
| WIN-06 | pass | PodListMac.swift WindowGroup plus New Window/Open in New Window and separate task windows; native full-screen/traffic lights/title-bar frame retained. menus.txt confirms window routes. |
| WIN-07 | pass | PodListMac.swift WindowGroup plus New Window/Open in New Window and separate task windows; native full-screen/traffic lights/title-bar frame retained. menus.txt confirms window routes. |
| WIN-08 | pass | PodListMac.swift WindowGroup plus New Window/Open in New Window and separate task windows; native full-screen/traffic lights/title-bar frame retained. menus.txt confirms window routes. |
| WIN-09 | pass | PodListMac.swift WindowGroup plus New Window/Open in New Window and separate task windows; native full-screen/traffic lights/title-bar frame retained. menus.txt confirms window routes. |
| WIN-10 | N/O | No live resize/overflow capture or instrumentation; native toolbar overflow and layout source alone do not show the full resizing result. |
| TOOL-01 | pass | 02/06/10: leading title/navigation, centered Playlist section, compact action groups and trailing search/Inspector; native ToolbarItem and SF symbols; text creation actions stay in sidebar/menu. 11–25 keep field widgets in body. |
| TOOL-02 | N/O | No live resize/overflow capture or instrumentation; native toolbar overflow and layout source alone do not show the full resizing result. |
| TOOL-03 | pass | 02/06/10: leading title/navigation, centered Playlist section, compact action groups and trailing search/Inspector; native ToolbarItem and SF symbols; text creation actions stay in sidebar/menu. 11–25 keep field widgets in body. |
| TOOL-04 | pass | 02/06/10: leading title/navigation, centered Playlist section, compact action groups and trailing search/Inspector; native ToolbarItem and SF symbols; text creation actions stay in sidebar/menu. 11–25 keep field widgets in body. |
| TOOL-05 | pass | 02/06/10: leading title/navigation, centered Playlist section, compact action groups and trailing search/Inspector; native ToolbarItem and SF symbols; text creation actions stay in sidebar/menu. 11–25 keep field widgets in body. |
| SIDE-01 | pass | Leading native sidebar, two-level section/item hierarchy and visible thin dividers; MacWindow.swift:109–115 deliberately retains native sidebar metrics rather than applying app text scale. |
| SIDE-02 | pass | Leading native sidebar, two-level section/item hierarchy and visible thin dividers; MacWindow.swift:109–115 deliberately retains native sidebar metrics rather than applying app text scale. |
| SIDE-05 | pass | Leading native sidebar, two-level section/item hierarchy and visible thin dividers; MacWindow.swift:109–115 deliberately retains native sidebar metrics rather than applying app text scale. |
| SIDE-06 | pass | Leading native sidebar, two-level section/item hierarchy and visible thin dividers; MacWindow.swift:109–115 deliberately retains native sidebar metrics rather than applying app text scale. |
| SET-02 | pass | System/Light/Dark defaults System; native Settings/TabView, selected pane toolbar, dimmed minimize/zoom and content-sized pane heights; GeneralSettingsEdits applies live. Native Settings scene remains transient rather than an ordinary restored Library window. |
| SET-03 | pass | System/Light/Dark defaults System; native Settings/TabView, selected pane toolbar, dimmed minimize/zoom and content-sized pane heights; GeneralSettingsEdits applies live. Native Settings scene remains transient rather than an ordinary restored Library window. |
| SET-04 | fail minor | F6: pane uses unpersisted @State initialized to general; last pane is not saved across recreation/relaunch. |
| SET-05 | pass | System/Light/Dark defaults System; native Settings/TabView, selected pane toolbar, dimmed minimize/zoom and content-sized pane heights; GeneralSettingsEdits applies live. Native Settings scene remains transient rather than an ordinary restored Library window. |
| SET-06 | pass | System/Light/Dark defaults System; native Settings/TabView, selected pane toolbar, dimmed minimize/zoom and content-sized pane heights; GeneralSettingsEdits applies live. Native Settings scene remains transient rather than an ordinary restored Library window. |
| DLG-06 | pass | 11–25/34 attach task sheets to their parent; PodListSheetHost and native sheet presentation preserve other windows. No app-modal presentation call found. |
| DLG-08 | pass | 24 plus PodListMac.swift:67 and AddPodcastsWindow.swift:156–176 use a noun-titled UtilityWindow/NSPanel for repeated discovery, with native utility behavior and explicit initial input focus. |
| CTRL-01 | pass | Native checkboxes, pop-up choices, three-segment Playlist toolbar and two-pane Settings; 11, 16, 22, 27, 30. Choice semantics fit independent vs exclusive options. |
| DATA-02 | N/A | Not an editable document application; persistent Library records/drafts use DATA-01/04/06. |
| DATA-03 | N/A | Not an editable document application; persistent Library records/drafts use DATA-01/04/06. |
| DATA-07 | pass | LibrarySettingsScreens.swift:369–394 invokes actual NSOpenPanel/NSSavePanel with file-format context and security-scoped access; no custom file browser. Untitled-document clauses are inapplicable to named OPML export. |
| DATA-08 | N/A | Not an editable document application; persistent Library records/drafts use DATA-01/04/06. |
| DRAG-02 | pass | PlaylistContentView.swift:214–234 and EpisodeTransfer.swift:65–70 implement same-playlist move, cross-playlist copy and Option-copy; duplicate Entry invariant safely keeps/selects the existing Entry. |
| DRAG-04 | pass | EpisodeTransfer.swift:47–62 orders private rich data, URL, then text, carrying ordered multi-selection; LibraryDropBatch.load reads every provider, preferring supported representations. Cross-app multi-row execution remains untested. |
| DRAG-07 | N/O | Inactive-window one-motion drag and background selection preservation need runtime observation. |
| PTR-01 | pass | MacWindow.swift sidebar/object contexts and selection-aware Table contexts; EpisodeActionItems omits inapplicable chapter/membership commands and keeps per-playlist placement submenus in menu bar; no shortcut labels in contexts, about three groups. |
| PTR-02 | pass | MacWindow.swift sidebar/object contexts and selection-aware Table contexts; EpisodeActionItems omits inapplicable chapter/membership commands and keeps per-playlist placement submenus in menu bar; no shortcut labels in contexts, about three groups. |
| PTR-05 | N/O | Selection-aware context command targets are wired correctly; transient context-row outline and preserved prior selection are not captured. |
| APPEAR-01 | pass | All 35 states viewed in Light/Dark; MacAppearanceController maps System to nil; controls and sidebar foregrounds use accentColor, with NSAccentColorName plus four-variant AccentColor asset. No fixed blue override of a user-selected accent. |
| APPEAR-02 | pass | All 35 states viewed in Light/Dark; MacAppearanceController maps System to nil; controls and sidebar foregrounds use accentColor, with NSAccentColorName plus four-variant AccentColor asset. No fixed blue override of a user-selected accent. |
| APPEAR-06 | pass | MacGlass.swift and 03/16/26: regular glass only on control/navigation layer; ordinary content surfaces remain opaque/semantic; native toolbar/sidebar retain their system material. No clear text-heavy glass or stacked glass surface found. |
| APPEAR-07 | pass | MacGlass.swift and 03/16/26: regular glass only on control/navigation layer; ordinary content surfaces remain opaque/semantic; native toolbar/sidebar retain their system material. No clear text-heavy glass or stacked glass surface found. |
| APPEAR-08 | pass | MacGlass.swift and 03/16/26: regular glass only on control/navigation layer; ordinary content surfaces remain opaque/semantic; native toolbar/sidebar retain their system material. No clear text-heavy glass or stacked glass surface found. |
| TYPE-01 | pass | Semantic Mac type: body 13 pt, captions ≥10 pt; Inspector actions 28×28 pt and play 40×40 pt in 03.txt; MacIconLabel.swift. Native small toolbar bezels are not incorrectly treated as custom undersized targets. |
| TYPE-04 | pass | Semantic Mac type: body 13 pt, captions ≥10 pt; Inspector actions 28×28 pt and play 40×40 pt in 03.txt; MacIconLabel.swift. Native small toolbar bezels are not incorrectly treated as custom undersized targets. |
| AX-03 | pass | MacTextSize.swift supports persisted 100–200%, menu Bigger/Smaller and Settings; semantic fonts scale, tables reflow into wrapping reading rows, custom sheet layout stacks constrained fields. Test source documents 200% rendering checks; no tests run here. |
| SYS-01 | pass | PodListMac/AppIntents.swift exposes semantic Episode/Playlist entities and play/pause/search/add/mark/list intents with four App Shortcuts; build-mac-app.sh packages and validates extracted metadata. Actual Shortcuts/Siri UI unobserved. |
| SYS-02 | fail minor | F7: no purpose-specific Services provider for selected feed URLs. |
| SYS-03 | fail minor | F8: no app URL/universal-link route for stable Library destinations; publisher share URLs do not reopen PodList context. |
| SYS-04 | pass | 18/03 and LibraryCommands.swift:97 use ShareLink for supported web URLs; invalid/missing URLs disable/omit Share rather than exposing unsupported data. |
| SYS-05 | fail major | F4: no Spotlight indexing implementation; explicitly deferred by owner. |
| SYS-06 | pass | Relevant Finder OPML opening is registered by build-mac-app.sh:35–55 and staged by PodListMac.swift:29–44; feed/OPML drag receiving shares preview flow. Credential/Safari extensions are inapplicable. |
| SYS-07 | N/A | No separate Dock-tile workflow or badge requirement established; minimized content is system-owned and no app-specific preview is supplied. |
| EXTRA-01 | N/A | No menu bar extra or dual-mode quick-entry utility. |
| EXTRA-02 | N/A | No menu bar extra or dual-mode quick-entry utility. |
| EXTRA-03 | N/A | No menu bar extra or dual-mode quick-entry utility. |
| EXTRA-04 | N/A | No menu bar extra or dual-mode quick-entry utility. |
| FOOT-01 | N/O | No workload-comparable bundle/launch/idle baseline or resource measurements supplied; framework choice is not used as a proxy. |

## Scores

Scores cover both appearances unless a difference is named. These are anchor-based judgments, not a numerical average of passes. Behavioral judgments use code plus captures; speed, full assistive-input behavior and transition stability remain partial.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.5** | Strong: semantic 13 pt body, role-based weights, readable metadata and wrapping titles across 02/03/16/19/27. The 200% reading layout is deliberate in code. Narrow 270 pt Inspector reading space and dense secondary instruction text keep it below a reference-quality reading tool. | hierarchy, craft, accessibility |
| Hierarchy | **8.4** | Strong: clear source → Episodes → Inspector order; current Entry and selection are explicit; actions stay subordinate to titles. Settings long General pane and the permanent empty Inspector spend space even in sparse fixture states. Bottom transport is the accepted WIN-05 issue. | content-first, hierarchy |
| Spacing & density | **8.3** | Strong: consistent sheet padding/footer alignment, 28 pt custom icon targets, compact two-line rows (roughly 54.5 pt in 03.txt), roomy reading Inspector and contextual utility sizes. No minimum/half-width result supports an exemplary adaptability claim. | craft, conventions |
| Color & contrast | **6.5** | Competent capped at 6.9 by APPEAR-04: restrained semantic surfaces and readable primary/secondary text in both themes, but selected Dark Settings text measures 1.68:1. Light alone would be about 8.4; the weak Dark pane state sets this app-level result. Four-variant colors and opaque glass fallbacks earn credit. | accessibility, color-restraint |
| Iconography | **8.6** | Strong: consistent familiar SF Symbols, useful initials/artwork identity, ordinary transport and sharing meanings, accessible inspector action names. Several small neutral action symbols still require help to distinguish at first use; deep-blue unselected Dark navigation icons are visually subdued. | conventions, craft |
| Consistency & polish | **8.2 (stability N/O)** | Strong visual result, **partial: no flow run** in either appearance. Common sheet frame, pinned default action, selection treatment, empty states and status vocabulary hold across 35 states; settings pane persistence and unmeasured overflow/transitions prevent exemplary finishing. No stability band limit applies because the sub-score is N/O. | craft, stability |
| Clarity | **8.6** | Strong: “Add” is explicitly append, rewind explains what resets/what remains, History distinguishes real playback, and active versus browsed Playlist is visible. Views/Entries/Position are learned concepts with concise help; dense filter and override terminology still asks a newcomer to read. Errors provide authored recovery in code. | plain-language, feedback |
| Platform fit | **6.9** | Raw **Looks 8.8**, **Behaves 8.0** → (8.8 + 2×8.0)/3 = **8.3**, then **capped at 6.9** by WIN-05 and SYS-05. Native frame, menus, utility discovery panel, Settings and text system are strong. Deferred indexing, missing deep-link/Service/Help Book integration and pane persistence separate it from Exemplary. Behavioral result is partial for runtime checks marked N/O. | conventions, discoverable-commands |
| Interaction & feedback | **6.9** | Raw Strong around 8.2 from command families, incremental type-select, persisted drafts, undo/reveal, safe import preview and guarded cancellation; **capped at 6.9 by KEY-03**. No latency or hitch credit is inferred; end-to-end keyboard/VoiceOver remains unverified. | keyboard-efficiency, forgiveness, feedback |
| **Overall** | **7.8** | Strong, with meaningful qualifications: the find → inspect → organize → listen path is clear and recognizably Mac. Dark selected Settings contrast holds it down most numerically; important integration and keyboard-convention gaps also remain. The lowest score is 6.5, so the Overall ceiling is 8.5; 7.8 respects it. | content-first, conventions, accessibility |

**Platform signal audit.** A fresh side-by-side capture of a current Apple app was not available and no owner-machine app was opened; no actual side-by-side is claimed. Comparison is to the supplied Mac signal definitions and exemplar guidance. The surfaces look most like a Mail-style source/list/Inspector app with task-specific audio controls. The following states break or qualify Mac grammar rather than importing an unrelated visual theme:

| Signal | Verdict | Evidence |
|---|---|---|
| L1 frame | Native | Standard traffic lights/unified titlebar; 01/06 |
| L2 type | Native | Semantic Mac font sizes; 02/03 |
| L3 controls | Native | Native pop-ups, checkboxes, tabs, Mac-sized actions |
| L4 menus/popovers | Native | Standard menus and sheets; menus.txt |
| L5 notation | Native | KeyboardShortcuts.swift and Help reference |
| L6 sidebar/selection | Native | Leading native source list; emphasized table and gray sidebar selection; actual system accent asset |
| L7 symbols | Native | SF Symbols family |
| L8 Settings | Native | Separate live two-pane Settings; last-pane persistence defect recorded separately |
| L9 density | Adapted | Calm library content with compact Inspector; audio transport is domain-specific |
| L10 materials | Adapted | Regular glass on control surfaces, semantic content surfaces and opaque accessibility fallback |
| L11 appearance | Native | System default with app Light/Dark options; measured Dark label defect remains scored |
| B1 menu bar | Native | Complete persistent command registry/menu structure in inspected source; form submissions remain local |
| B2 Settings | Native | Settings scene at standard ⌘, |
| B3 shortcuts | Foreign (one binding) | ⌃⌘S custom sidebar command conflicts with this checklist’s modifier grammar; rest largely native |
| B4 text | Native (source); Services N/O | Cocoa fields, TextEditingCommands and interpretKeyEvents; no live Services evidence |
| B5 keyboard/lists | Adapted (source); full FKA N/O | Native selection plus scoped incremental type-select |
| B6 contexts | Native (source); target outline N/O | Selection-aware context menu APIs and shared domain commands |
| B7 windows/state | Adapted; relaunch N/O | WindowGroup and source restoration; Settings pane value is unpersisted |
| B8 drag | Adapted (source); runtime feedback N/O | Rich transfer, undo, safe import previews, modifier-aware semantics |
| B9 system integration | Adapted, incomplete | Strong semantic App Intents/Share and Finder OPML; missing Spotlight, app destinations and Service provider |
| B10 undo/help | Adapted | Named history plus useful app help; missing Help Book integration |
| B11 footprint | N/O | No comparable resource measurements |

**What stands between this build and 9.0:** Resolve actionable keyboard/integration/persistence defects; verify the accessibility naming candidates; and supply minimum/half/typical-width delayed flows with focus/input/scroll measurements, plus five timed runs and resource workload evidence. An exhaustive 9.0 claim is not supported by settled screenshots alone. Even after the next actionable fix, owner-kept APPEAR-04 leaves Color ≤6.9, and owner-kept WIN-05/deferred SYS-05 leave Platform fit ≤6.9. The rubric therefore prevents 9.0 Overall while those failures remain (lowest-category +2 cap is at most 8.9). This is a grading consequence, not a repeated proposal to undo accepted decisions.

## Next step

**Target:** KEY-03, the remaining actionable major in Interaction & feedback, tied with the capped Platform fit category. The lower Color category is held by an owner-accepted decision; Platform fit’s majors are the fixed bottom player and explicitly deferred Spotlight. Those are skipped under CRITIQUE’s diagnosis rule.

**Anti-pattern:** No exact catalog pattern is demonstrated. “Keyboard afterthought” describes misrouted focus/selection, which was not established here; do not attach that label to a modifier-choice defect. Nearest useful contrast is **PLAT-03, Standard shortcuts remain reflexes**. BBEdit would keep custom commands discoverable in menus, using the platform’s modifier grammar and allowing refinement without changing the command’s semantics.

**Root cause:** Sidebar shortcut assignment is separate from the centralized command/reference vocabulary and introduces Control for an ordinary custom navigation command.

**Candidate 1, preferred:** Change only Show/Hide Sidebar from ⌃⌘S to **⌥⌘S**, after a collision audit; include the shortcut in the in-app reference and its toggle tooltip. Keep the native visible control and dynamic Show/Hide menu title. Principle: keyboard-efficiency/conventions; expected improvement: Interaction & feedback, with no visual category change. The blue accent, library density, domain nouns, glass and bottom player all survive.

**Candidate 2:** Consolidate the Sidebar binding and its notation into the same command/reference source used for other custom bindings, then apply Candidate 1. This reduces future drift, but is a larger implementation than the single finding requires. Expected improvement: consistency and keyboard discoverability; risk: accidental shortcut collisions if broader bindings are changed unnecessarily.

**Verification for the implementer:** Check the new binding in Library table/sidebar/text focus, sheets and Settings; confirm no standard command is stolen and visible/menu routes agree. Re-run affected keyboard checks. A separate authorized VM session should then collect the missing transition, resize, assistive-input and timing evidence; no such session was launched by this reviewer.

No code was changed, no before/after improvement is claimed, and no candidate was applied or accepted. Character drift check: baseline equals graded build; all five signature elements are **kept**.

**Workflow note:** `bd prime` could not load the Beads store: `failed to open database: embeddeddolt: init schema: embeddeddolt: open db: failed to load database "pod": openat LOCK: operation not permitted`. No issue state was changed. This report is the only intended worktree change; no merge or push is authorized.
