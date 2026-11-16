# PodList for Mac — independent Codex UI grade, round 15

## Frame

Task · Find Episodes through Subscriptions and saved Views, arrange them as Playlist Entries, and listen while retaining per-Playlist Position, History and Timeline.

Target · Native Mac app, SwiftUI/AppKit, macOS 26+; assessed source commit `db60021` against supplied macOS 27.2 VM captures.

Posture · Sovereign personal Library, with background playback and transient discovery/settings tasks.

Audience · Perpetual intermediate, with newcomer help and keyboard/automation routes for experienced listeners.

Nearest exemplar · Things for calm personal collection/list/detail hierarchy; BBEdit for menu completeness, recovery and semantic automation. These set craft decisions, not a visual template.

Character · Blue initials artwork and Multicolor accent; Views/Playlists/Entries vocabulary with explicit scope; compact source-list/table/Inspector workspace; persistent bottom transport **(owner fixed)**; restrained Liquid Glass control surfaces **(owner fixed)**.

Owner decisions · Keep the bottom player, System/Light/Dark Appearance, fixed toolbar, two-click auto-disarming Unsubscribe, and adopted glass surfaces. Grade the deep Dark Multicolor accent normally, including its accepted selected Settings-label consequence. Spotlight remains deliberately last; MCP is off by default and App Intents are on. Accepted choices still incur rubric failures/caps, but are not remediation targets.

Baseline · The supplied 70 PNGs (35 states × 2 appearances), accompanying XCUI text trees, and menu export. No prior grading reports or UI-GRADE.md were read. No app was launched, screen controlled, code changed, or new UI capture performed. Temporary contact sheets and color samples were derived only from the supplied PNGs. This is an audit/report, so the rubric’s implementation/iteration stages are not performed.

### Evidence key

`SNN` means the named state in both `light/` and `dark/`, unless an appearance is specified; `TXT` is its same-stem `.txt`. [Evidence README](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/README.md) enumerates all 35 states. Important anchors: [S02 list](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/02-new-this-week.png), [S03 Inspector](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/03-episode-inspector.png), [S06 Playlist](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/06-default-playlist.png), [S16 editor](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/16-edit-view.png), [S19 expanded description](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/19-description-expanded.png), [S23 chooser](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/23-add-to-playlist.png), [S24 discovery](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/24-add-podcasts.png), [S27 Settings](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/27-settings-general-top.png), [S30 Dark Automation](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/dark/30-settings-automation.png), [S33 multi-selection](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/33-multi-selection.png), [S34 Rewind](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/light/34-rewind-summary.png). `M` = [menus.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/menus.txt).

Code references (all in the assessed worktree):

| Key | Source |
|---|---|
| C1 | [MacWindow.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MacWindow.swift:61): navigation, tables, toolbar, Inspector and window context |
| C2 | [LibraryCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/LibraryCommands.swift:54): File/Podcast/Views and sidebar commands; [MenuCommandActions.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MenuCommandActions.swift:77): recovery registry |
| C3 | [EpisodeEditingViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift:307): domain menu commands; [PlaybackCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/PlaybackCommands.swift:32): transport and text/sheet routing |
| C4 | [PodListSheet.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/PodListSheet.swift:6), [ContentSizedPanel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/ContentSizedPanel.swift:7): shared content/label/footer layout |
| C5 | [ViewEditorScreen.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/ViewEditorScreen.swift:37), [PlaylistSettingsViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift:7), [AddPodcastsWindow.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift:146) |
| C6 | [PodListMac.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListMac/PodListMac.swift:39): scenes and lifecycle; [build-mac-app.sh](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/scripts/build-mac-app.sh:22): bundle declarations |
| C7 | [LibrarySettingsScreens.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:48), [ConnectionViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/ConnectionViews.swift:55), [GeneralSettingsEdits.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift:35) |
| C8 | [KeyboardShortcuts.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift:8), [ConnectionViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/ConnectionViews.swift:77): shortcuts and help |
| C9 | [PlaylistContentView.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/PlaylistContentView.swift:69), [MacRowScroll.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MacRowScroll.swift:96), [SelectionCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/SelectionCommands.swift:143) |
| C10 | [WindowRestoration.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/WindowRestoration.swift:46), [PlaylistEditingModel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:30), [LibraryEditingModel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/LibraryEditingModel.swift:135) |
| C11 | [EpisodeTransfer.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/EpisodeTransfer.swift:37), [LibraryDrops.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/LibraryDrops.swift:24) |
| C12 | [MacAppearance.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MacAppearance.swift:25), [MacGlass.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MacGlass.swift:20), [MacTextSize.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MacTextSize.swift:7), [MacIconLabel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MacIconLabel.swift:5) |
| C13 | [ApplicationModel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/ApplicationModel.swift:1), [FailureFeedback.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/FailureFeedback.swift:32), [FeedbackAnnouncements.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/FeedbackAnnouncements.swift:7) |
| C14 | [AppIntents.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListMac/AppIntents.swift:21), [NowPlayingSnippet.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListMac/NowPlayingSnippet.swift:15), [SystemPlayback.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/SystemPlayback.swift:34) |

## Flows

Tasks reviewed as supplied state sequences, not newly executed:

| Main task | Supplied states / source | What can be concluded |
|---|---|---|
| Browse → select → inspect → batch act | S01–S07, S15, S18–S19, S33; C1/C9 | Selection, table headings, scope and single/multiple Inspector states are visible. |
| Playlist → History → Timeline → Rewind preview | S06–S12, S34a→S34; C3/C9 | Section state and the consequences/Cancel route are explicit; actual rewind completion is not captured. |
| Create/rename/configure → cancel or commit → undo | S11–S17, S22–S25; C4/C5/C10 | Draft persistence, validation and undo paths are implemented; screenshots show settled forms. |
| Podcast page → arm Unsubscribe → auto-disarm | S18→S20→S21; C5/LibraryEditingModel | Text and destructive state change together, then return; code supplies the timing and undo. |
| Open discovery → type → search → subscribe | S24; C5 | Initial focus/empty state captured. Cancelled/stale query guards and repeated input live in the modeless panel’s code. |
| Preferences, playback and help | S26–S32; C6–C8/C14 | Paused player, both Settings panes and introduction visible; playing/buffering and Shortcuts UI are not captured. |

Widths · Main window is **1180×760 pt**, from TXT (`2360×1520` pixel PNG at 2×). Sidebar is 225 pt; Inspector is 270 pt in these captures. Auxiliary windows/sheets have their own content sizes. Code minimum is 760×500 pt; no capture establishes minimum or half-display-tiled layout. Desktop is 1920×1200 pt, VM macOS 27.2, Retina. Refresh rate and host/hardware performance configuration are unspecified.

Appearances · Light and Dark. Reduce Transparency/Increase Contrast have explicit code paths, not additional runtime captures.

Script · [PodListUITour.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/UITour/PodListUITour.swift:16); supplied README reports 141/141 required exported attachments. The tour checks some geometry and type-selection behavior, but is not the rubric’s delayed-completion/timing harness. It sets `ApplePersistenceIgnoreState=YES`, so this tour does not certify relaunch restoration.

Measurements file · **Not supplied.** No delayed completions while typing the next item, focus/scroll trace, five timed repetitions, keystroke latency or hitch metrics. Screenshot strips · the ordered supplied PNGs only; no continuous transition strip at all required widths. **FLOW-01, FLOW-02, FLOW-04 and timing checks remain N/O. Stability sub-score: N/O in both appearances.** Code can settle FLOW-03’s protection paths, but does not substitute for a measured flow run. No scored stability failure is asserted without a measurement row or transition pair.

## Cross-screen inventory

Each cell records location, form/wording and color. “None” means no corresponding state in that screen; code-only states are identified.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library/Views/Episode tables S01–S07/S15/S33 | Top status row, operation name, primary ink; code | Same top row, red text + Retry; code | None | Top trailing named Undo/Redo; Edit menu persists | Center icon/title + next-step text/action; C1 | None captured | Toolbar Play/Add/More; trailing Inspector/Search | View rule summary above rows |
| Playlist Entries/History/Timeline S06–S10/S34a | Same Library status row | Same Library status row | Rewind preview sheet | Same status row/menu | History centered clock + explanation; Entries Find Episodes | None captured | Toolbar sections and Play; row Rewind | Current Entry label; History explains automatic completion |
| Playlist/View create/edit S11–S13/S16–S17 | Shared status row above footer; code | Field-local red validation; operation failure in status + Retry; code | Labeled fields, neutral ink | Named history in Library/Edit; editor reconciles undo | Blank new fields with stable labels | Parent dimmed by sheet | Footer trailing Create/Save; Cancel immediately before; delete leading | Scope and live matching count; deletion/clear consequences |
| Podcast S18–S21 | Subscribed check + text, neutral; top Library status | Library row or publisher-local Retry; code | Same-button red Unsubscribe armed state | Library/Edit undo for actual unsubscribe | No Episodes state + refresh route; code | None captured | Inline Subscribe/Share/Copy/settings; toolbar Episode actions | Description disclosure; device Download Rule label |
| Subscription/bulk rule sheets S22/S25 | Shared status row; code | Field/task status with Retry; code | Same labeled pickers | Library/Edit history | None | Parent dimmed by sheet | Footer trailing Save/Apply, Cancel before | Per-device and override scope explained |
| Add to Playlist S23 | Shared status; code, closes on success | Shared status or local new-name validation; code | Playlist picker (Active labeled) | Library/Edit history | New-Playlist name when chosen; code | Parent dimmed by sheet | Footer trailing Play Next; Play Now/Last leading | Title gives Episode count and target task |
| Add Podcasts S24 | Subscribed check/text in result; LibraryFeedback at bottom; code | Inline under search + Retry; code | None | App Edit history; no sole timed recovery | Center search symbol/title + feed example | None; modeless utility panel | Search adjacent to top field; Subscribe in result | Persistent OPML instructions and feed example |
| Now Playing S26 | None | Primary-ink playback error + Retry on player surface; code | None | Library edits use app history | No current Episode action guidance; code | None | Central transport; details/active Playlist buttons below | Position/time, Speed and Sleep labels |
| Settings S27–S30 | Changes apply live; no success banner | Per-field red error + Retry; code | None | Library changes participate in Edit history | None | None | Per-field controls; MCP switch off | Text Size/Appearance scope, import lifetime and MCP access explained |
| Stats S31 | None | None captured | None | None | Dark: No Listening Time Yet + cause/explanation | None | Show Daily Table when data exists | Chart units and partial-listening explanation |
| Getting Started S32 | None | None | None | None | None | Parent sheet only when opened from Settings | Footer trailing Hide Getting Started | Three task steps with menu/shortcut route |
| Rewind S34 | Library status after commit; code | Shared status + Retry; code | Summary: goes back / unplayed / restored / kept | Named Rewind undo | Explicit None for empty result groups | Parent sheet | Footer trailing Rewind, preceding Cancel | Describes later edits retained and Positions reset |

Mismatches · No unexplained mismatch among the captured same-kind screens. Library errors, discovery errors, per-field validation and player errors differ in location because their causes and modality differ; each operation family shares its own surface/component. Playback errors use primary text on variable glass for legibility; errors on reading surfaces use the custom red. No success notice is the sole Undo/recovery path: timed five-second success notices are separate from persistent history/errors (EditingNotice.swift, EditingFeedback). Light/Dark Stats differ in actual fixture listening data, so their populated/empty differences are not theme defects. The persistent View rule help and discovery help do not disappear just because typing starts. This inventory does not establish transition stability.

## Checklist

Coverage: **82.1%** (pass 119 · fail 5 · N/O 27 · N/A 17). **168 IDs audited**, each assigned exactly one verdict. N/A items are excluded from the denominator. Code-based passes establish the inspected implementation, not an unperformed live assistive-technology or performance test.

### Failures by severity

**Blockers · None established.** In particular, the missing live VoiceOver/FKA evidence is not treated as either a pass or a blocker.

**Majors**

- **APPEAR-04 — Dark selected Settings-pane label fails reading contrast.** S27–S30 Dark, especially [dark/30-settings-automation.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-15/dark/30-settings-automation.png): active “Automation” is a normal-size control label. Sampling solid interior text pixels and nearby selected-tab surface after converting the PNG to sRGB gives approximately `#5478E4` on `#5C5A58`, **1.69:1**. Antialiased edges are excluded. The requirement is **4.5:1**; this is a control label, so severity is major even though localized to Settings. C7’s native TabView and C6’s packaged Dark AccentColor produce it. The underlying `#3652D0` accent gives white selected-row text **6.41:1**, so the rows themselves pass that pair. **Fix:** make the selected pane label use contrast-safe primary text, independently of the selection fill, if the platform permits it. **Owner accepts the deep Dark accent/tab-label consequence: recorded, not a target.** Caps Color & contrast at 6.9.
- **WIN-05 — Critical transport and playback information occupy the bottom edge.** S01–S23/S25/S33; [PlayerViews.swift:6](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/PlayerViews.swift:6) and [MacWindow.swift:203](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/MacWindow.swift:203) place play/pause, seek, title, speed and sleep in a bottom safe-area inset. The checklist permits only limited window/selection status there. **Fix under the literal check:** offer the primary transport in upper window chrome; menu/Now Playing equivalents already mitigate reachability. **Owner-fixed bottom player: do not implement or propose its relocation as this audit’s next target.** Caps Platform fit at 6.9.
- **SYS-05 — Episode/Podcast Library content is not indexed for Spotlight.** C6 bundle/source and C14 declare automation and media integration, but there is no Core Spotlight publishing/index lifecycle. S15 proves useful searchable content exists; in-app Search is not Spotlight. No Spotlight UI is captured, so this is the source-established missing parent capability, not an inferred failed live search. **Fix:** add stable Podcast/Episode searchable identifiers, meaningful title/description/artwork metadata, removal handling and a route back to the item; preview/thumbnail clauses for authored custom documents are not separately applicable. **Owner explicitly deferred indexing to last: keep deferred.** Caps Platform fit at 6.9.

**Minors**

- **SYS-02 — No selection-based feed subscription Service.** C6’s [bundle declarations](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/scripts/build-mac-app.sh:22) have no `NSServices` provider, and source has no corresponding selection service handler. S24’s “paste its RSS feed address” illustrates the relevant cross-app selection task. Consuming Cocoa Services (APP-03) is a separate, unobserved check. **Fix:** provide a single “Add Podcast to PodList” Service accepting selected URL/text, validating a feed address and opening the existing non-destructive discovery/preview route. Principle: `conventions` / `direct-manipulation`.
- **SYS-03 — Links cannot return to the addressed Library content in PodList.** [ShareLinks.swift:14](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-871da363-fff202120f064f53/apps/apple/Sources/PodListUI/ShareLinks.swift:14) returns publisher/enclosure/feed URLs; C6’s `onOpenURL` accepts only OPML file URLs, with no app URL type or universal-link continuation. Thus a useful public episode link exists, but a View, Playlist or Library Episode cannot be bookmarked and reopened in the app. S03/S06/S16 demonstrate addressable objects. **Fix:** add a stable, Library-scoped app link for these objects, expose Copy PodList Link beside public Share/Copy Link, and resolve missing objects with a useful recovery. Keep public publisher sharing intact. Principle: `user-control` / `conventions`.

### N/O

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, KEY-07, APP-03, TEXT-02, WIN-03, WIN-10, TOOL-02, SET-04, SET-06, DRAG-05, DRAG-06, DRAG-07, PTR-03, PTR-05, APPEAR-11, TYPE-06, AX-01, AX-04, SYS-07, RESP-01, RESP-02, FOOT-01, FOOT-02.

| ID | Evidence limit |
|---|---|
| FLOW-01 | No delayed-completion geometry measurements or minimum/tiled-width strips. |
| FLOW-02 | No recorded focus and scroll trace during asynchronous completions. |
| FLOW-04 | Follow-ups are visible at the supplied typical size; minimum and tiled widths are absent. |
| KEY-01 | Menu routes and native controls are present, but a complete Full Keyboard Access traversal is absent. |
| KEY-04 | Initial focus rings are visible; the complete forward/reverse focus order is not recorded. |
| KEY-07 | Native scrolling is retained and Space is scoped, but all scrolling keys across all scrollers are not established. |
| APP-03 | Services was excluded from the menu export; native text machinery alone does not establish installed service execution. |
| TEXT-02 | TextEditingCommands and native fields are present; actual user substitutions, disabled settings and Speech execution are not established. |
| WIN-03 | 760×500 minimum and adaptive code exist; no minimum, tiled, multi-display or enlarged-window captures establish all essential content. |
| WIN-10 | No live-resize recording or hitch measurements. |
| TOOL-02 | Native toolbar items support system overflow, but no narrowed-toolbar capture shows which items survive. |
| SET-04 | Pane titles match in captures; @State pane selection does not establish the full close/reopen lifetime. |
| SET-06 | Settings uses the native Settings scene; a relaunch with Settings formerly open is not captured. |
| DRAG-05 | Native drag and drop plus failure placeholders exist; onset threshold, source reset and insertion feedback are not captured. |
| DRAG-06 | Pending rows and destination selection are implemented; edge autoscroll is not established. |
| DRAG-07 | Native draggable rows exist; one-motion and inactive-window drag behavior is not established. |
| PTR-03 | No pointer-shape or gesture-state evidence beyond source use of native controls. |
| PTR-05 | Code targets context-clicked IDs; the transient outline and preservation of background selection are not captured. |
| APPEAR-11 | Separate settled screenshots cannot establish every loading or transition frame. |
| TYPE-06 | Expanded podcast prose is legible; three full reading lines at default measure in every reading surface, notably show notes, are not supplied. |
| AX-01 | Many icon controls have explicit names, but some field/picker labels are empty in XCUI. The export omits title/label relationships, so it cannot settle their actual VoiceOver names. No live VoiceOver evidence is supplied. |
| AX-04 | Menus provide non-gesture routes; actual Voice Control and Switch Control operation is not established. |
| SYS-07 | Now Playing integration is implemented; minimized live content and Dock behavior are not shown. |
| RESP-01 | No five-run 75th-percentile input-response timings. |
| RESP-02 | No keystroke/frame or gesture-hitch measurements and no display refresh-rate record. |
| FOOT-01 | No measured bundle/launch/idle workload with a task-comparable baseline. |
| FOOT-02 | No representative long-list scrolling trace or main-thread hang measurements. |

### N/A

| ID | Reason |
|---|---|
| DLG-09 | No app-owned popover workflow; menus and sheets are assessed under their own checks. |
| LIST-05 | No expandable descendant tree; sidebar sections are flat groups. |
| START-05 | No protected-resource permission prompt or purpose string required by this build’s features. |
| START-07 | No account creation offered. |
| FILE-01 | Library app, not an editable file/document app; New View/New Playlist and explicit OPML exchange commands are present. |
| FILE-02 | No opened-document history; OPML is an import, not a working document. |
| FILE-04 | No document Duplicate or Export As workflow; OPML export leaves the Library open. |
| FILE-05 | No printing feature or printable authored documents. |
| FMT-01 | No formatted-text editor. |
| FMT-02 | N/A → FMT-01. |
| DATA-02 | No unsaved file-document model; Library edits persist directly. |
| DATA-03 | No versioned document model. |
| DATA-08 | No editable-document model; OPML Finder import is assessed under SYS-06. |
| EXTRA-01 | No menu bar extra. |
| EXTRA-02 | N/A → EXTRA-01. |
| EXTRA-03 | N/A → EXTRA-01. |
| EXTRA-04 | Sovereign Library app, not a Dock/menu-bar-mode capture utility. |

### Passes

| ID | Evidence and judgment |
|---|---|
| FLOW-03 | C5: new-item fields disable during submit; discovery cancels and checks submitted query; C7: Settings draft IDs guard late completion. Static code verdict, not a measured flow pass. |
| FLOW-05 | S02/S03/S06/S07: list and Inspector occupy adjacent native panes with common content top and lower boundary; inner content differs deliberately. |
| FLOW-06 | S08/S14/S24/S31 and C1/C5/C7: dedicated empty states and conditional headings; no empty section shell established. Transition behavior remains FLOW-01/02 N/O. |
| FLOW-07 | S11–S13/S16–S17/S22–S25/S34; C4: common trailing footer action, preceding Cancel and leading secondary actions. |
| KEY-06 | C2/C3/C8: letter/arrow shortcuts and native +/− sizing notation, without additional modifiers on hard-to-type punctuation. |
| KEY-08 | C2, C3, C8: documented menu equivalents, standard glyphs, text/sheet routing and scoped Space. |
| DLG-01 | S11–S13, S16–S17, S22–S25, S34; C4, C5, C6: one parent sheet, explicit Cancel, safe commit routes. |
| DLG-02 | S34 and C5: Rewind summary names the operation and explains retained/reset data; permanent-delete title names the Playlist. |
| DLG-03 | S11–S13, S16–S17, S22–S25, S34; C4, C5, C6: one parent sheet, explicit Cancel, safe commit routes. |
| DLG-04 | S11–S13, S16–S17, S22–S25, S34; C4, C5, C6: one parent sheet, explicit Cancel, safe commit routes. |
| DLG-05 | C5: permanent deletion uses destructive confirmation and a Cancel route; routine deletion goes to Trash and is undoable. |
| DLG-07 | S11–S13, S16–S17, S22–S25, S34; C4, C5, C6: one parent sheet, explicit Cancel, safe commit routes. |
| CTRL-02 | S11/S12: Clear on Played remains a named native checkbox. There is no mixed-state checkbox hierarchy. |
| CTRL-03 | S11–S13/S16–S17/S24/S27: visible field labels persist independently of placeholders; optional View fields are explicitly marked. Spoken-name coverage is AX-01 N/O. |
| CTRL-04 | S11–S13, S16–S17, S22–S25, S27–S30; C4–C7: native controls, persistent labels, field validation and progress. |
| CTRL-05 | C4/C12: custom primitive styles delegate triggering and pressed interaction to native Button; prominence uses native borderedProminent/glass styles. |
| CTRL-06 | S11–S13, S16–S17, S22–S25, S27–S30; C4–C7: native controls, persistent labels, field validation and progress. |
| CTRL-07 | S15/S18 plus TXT; C1/C5: current-list/Library/Podcast scopes in title and prompt; no displayed search history. |
| CTRL-08 | C5/C7/C11 and DownloadViews.swift: cancellable/resumable import, byte-progress downloads and pending drop placeholders; timing is separately N/O. |
| LIST-01 | S01–S10, S18–S21, S33; C1, C9: native List/Table, explicit headings, sort state and selection. |
| LIST-02 | S01–S10, S18–S21, S33; C1, C9: native List/Table, explicit headings, sort state and selection. |
| LIST-03 | S01–S10, S18–S21, S33; C1, C9: native List/Table, explicit headings, sort state and selection. |
| LIST-04 | S01–S10, S18–S21, S33; C1, C9: native List/Table, explicit headings, sort state and selection. |
| LIST-06 | S01–S10, S18–S21, S33; C1, C9: native List/Table, explicit headings, sort state and selection. |
| LIST-07 | S01–S10, S18–S21, S33; C1, C9: native List/Table, explicit headings, sort state and selection. |
| DATA-01 | C5, C6, C10: persisted scoped drafts, reversible named database edits, restored browsing state. |
| DATA-04 | C5, C6, C10: persisted scoped drafts, reversible named database edits, restored browsing state. |
| DATA-05 | C1/C10: undo supplies restored Entry IDs and reveals them through the window model; restored Playlist names also appear in feedback. |
| DATA-06 | C1/C10: SceneStorage archives destination, selection, sort, tab, sidebar, row anchor and pane widths; native WindowGroup owns frame restoration. Code-based, not a relaunch test. |
| DRAG-01 | C9, C11: transferable ordered selection, copy across Playlists, move within, undoable batch insertion. |
| DRAG-03 | C9, C11: transferable ordered selection, copy across Playlists, move within, undoable batch insertion. |
| PTR-04 | C1, C9, C11: object-scoped context commands and tooltips; native menu construction. |
| APPEAR-03 | C12: all custom palettes have four variants; regular glass becomes opaque with a border for Reduce Transparency or Increase Contrast, individually or together. Runtime combinations not captured; code-based pass. |
| APPEAR-05 | C1/C4/C12: no app-owned positional/depth animation or withAnimation found; system controls own transitions. Not a claim of measured motion smoothness. |
| APPEAR-09 | S01–S34 in both appearances; C7, C12: semantic colors, system accent and regular glass with opaque fallbacks. |
| APPEAR-10 | S01–S34 in both appearances; C7, C12: semantic colors, system accent and regular glass with opaque fallbacks. |
| TYPE-02 | S02–S03, S19, S27–S30, S33; C4, C7, C12: semantic system fonts, tabular figures, adaptive content scale. |
| TYPE-03 | S02–S03, S19, S27–S30, S33; C4, C7, C12: semantic system fonts, tabular figures, adaptive content scale. |
| TYPE-05 | C4/C12: multiline wrapping, scrollable bounded sheets, 100–200% content text scale and reading-row fallback. Actual minimum-window/enlarged combination remains WIN-03 N/O. |
| TYPE-07 | S02–S03, S19, S27–S30, S33; C4, C7, C12: semantic system fonts, tabular figures, adaptive content scale. |
| TYPE-08 | S02–S03, S19, S27–S30, S33; C4, C7, C12: semantic system fonts, tabular figures, adaptive content scale. |
| COPY-01 | S08, S14, S19, S23–S25, S32, S34; C6, C7, C13: concrete verbs, consequences, inline recovery. |
| COPY-02 | S08, S14, S19, S23–S25, S32, S34; C6, C7, C13: concrete verbs, consequences, inline recovery. |
| COPY-03 | S08, S14, S19, S23–S25, S32, S34; C6, C7, C13: concrete verbs, consequences, inline recovery. |
| COPY-04 | S08, S14, S19, S23–S25, S32, S34; C6, C7, C13: concrete verbs, consequences, inline recovery. |
| AX-02 | S06/S20/S25/S30/S33 plus TXT: Current Entry text/symbol, Unsubscribe wording, checkbox/switch values and selection traits supplement color. |
| AX-05 | S01/S26, C6/C14: visible title/position/state and stop/pause controls for playback; podcast program audio is content, not a UI alert requiring a duplicate transcript. |
| START-01 | C1/C13: opening placeholder appears before awaited startup; cached Library remains available while sync works. This establishes architecture, not a launch-time measurement. |
| START-02 | C6, C7, C13: asynchronous Library startup, retained local data, skippable introduction and standalone mode. |
| START-03 | C6, C7, C13: asynchronous Library startup, retained local data, skippable introduction and standalone mode. |
| START-04 | C6/C7 and bundle script: no unsolicited protected-resource permission request; OPML uses user-selected native panels and MCP is explicitly off by default. |
| START-06 | C6, C7, C13: asynchronous Library startup, retained local data, skippable introduction and standalone mode. |
| EDIT-02 | M; C2, C3, C9: named undo/redo, responder-based text commands, copy with text and URL representations. |
| EDIT-05 | C9: Episode copy offers title text and public URL representations; show notes and feed/server URLs support text selection/copy. |
| TOOL-06 | C1–C3: Inspector and Sidebar have visible toggles and View menu shortcuts. Toolbar is fixed by owner decision; no customizable-toolbar modes are promised. |
| SIDE-03 | S01–S10/S33 plus TXT; C1, C12: leading native sidebar, shallow hierarchy, selectable rows and standard dividers. |
| SIDE-04 | S01–S10/S33 plus TXT; C1, C12: leading native sidebar, shallow hierarchy, selectable rows and standard dividers. |
| SET-01 | S27–S30; C7: app-wide native Settings, system appearance default, live settings and per-task sheets. |
| MENU-01 | M; C2, C3: ordered system and domain menus, disabled commands retained, action-state titles. |
| MENU-02 | M and C2/C3: play/add/mark/download/reorder/rewind, view and podcast editing, navigation, import recovery and playback recovery have menu routes. Dialog commit/cancel and configuration field values stay on their conventional surfaces. |
| MENU-03 | M; C2, C3: ordered system and domain menus, disabled commands retained, action-state titles. |
| MENU-04 | M; C2, C3: ordered system and domain menus, disabled commands retained, action-state titles. |
| MENU-05 | M: app-owned submenus are one layer deep and icon-free; deeper system TextEditing/Window hierarchies belong to macOS, not app-invented nesting. |
| MENU-06 | M: system Close All/Minimize All/Zoom All alternates retain standard native routes; no app-specific multi-modifier alternate. |
| APP-01 | M; C6 and bundle script: native App menu/Settings scene, About metadata and standard system commands. |
| APP-02 | M; C6 and bundle script: native App menu/Settings scene, About metadata and standard system commands. |
| APP-04 | M; C6 and bundle script: native App menu/Settings scene, About metadata and standard system commands. |
| FILE-03 | M: Close, Close All and native performClose:; C6: native scenes retain window closing. |
| EDIT-01 | M; C2, C3, C9: named undo/redo, responder-based text commands, copy with text and URL representations. |
| EDIT-03 | M and C2/C6: native Edit Find commands retained by TextEditingCommands; Search Library is an explicit object-search command. |
| EDIT-04 | M; C2, C3, C9: named undo/redo, responder-based text commands, copy with text and URL representations. |
| VIEW-01 | M; C1–C3: Show/Hide Inspector/Sidebar and native full-screen commands. |
| VIEW-02 | M; C1–C3: Show/Hide Inspector/Sidebar and native full-screen commands. |
| WMENU-01 | M; C6: native Minimize, Zoom, Bring All to Front and scene-provided window entries. |
| WMENU-02 | M; C6: native Minimize, Zoom, Bring All to Front and scene-provided window entries. |
| WMENU-03 | M; C6: native Minimize, Zoom, Bring All to Front and scene-provided window entries. |
| HELP-01 | M; C6, C7: product help, task guidance, shortcut reference and system Help search field. |
| HELP-02 | M; C6, C7: product help, task guidance, shortcut reference and system Help search field. |
| KEY-02 | C2/C3/C8: standard edit/window equivalents retained; Space and Return are guarded in text/sheets; Command-period cancels sheets before Stop. |
| KEY-03 | C2/C3/C8: Command-based frequent commands, related Shift/Option variants. Sidebar uses the familiar ⌃⌘S navigation binding; this is not a novel Control accelerator family. |
| KEY-05 | C2, C3, C8: documented menu equivalents, standard glyphs, text/sheet routing and scoped Space. |
| TEXT-01 | C3: field-editor route uses interpretKeyEvents and leaves Cocoa control/option bindings untouched; native TextField is retained. |
| WIN-01 | S01–S34; C1, C6, C10: native scene/window frame, contextual titles, multiple Library windows and native full screen. |
| WIN-02 | S02→S03 and S06→S07: sidebar highlight becomes gray when content selection takes key emphasis; S11/S22 dim their parent. Native activation/materials retained; other-app inactivity not directly captured. |
| WIN-04 | S01/S02/S06/S18/S26/S27/S30 plus TXT: titles identify view, Playlist, Podcast or Settings pane; longer real content names retained. |
| WIN-06 | S01–S34; C1, C6, C10: native scene/window frame, contextual titles, multiple Library windows and native full screen. |
| WIN-07 | C1/C6: Open in New Window for Views/Playlists; Add Podcasts, Now Playing and Stats have distinct task purposes. |
| WIN-08 | S01–S34; C1, C6, C10: native scene/window frame, contextual titles, multiple Library windows and native full screen. |
| WIN-09 | C6: unmodified native WindowGroup/Window title bars; no custom drag regions or traffic-light event replacement. |
| TOOL-01 | S02, S06–S10, S33; C1, C3: native toolbar zones, compact symbols and grouped actions. |
| TOOL-03 | S02, S06–S10, S33; C1, C3: native toolbar zones, compact symbols and grouped actions. |
| TOOL-04 | S02, S06–S10, S33; C1, C3: native toolbar zones, compact symbols and grouped actions. |
| TOOL-05 | S02, S06–S10, S33; C1, C3: native toolbar zones, compact symbols and grouped actions. |
| SIDE-01 | S01–S10/S33 plus TXT; C1, C12: leading native sidebar, shallow hierarchy, selectable rows and standard dividers. |
| SIDE-02 | S01–S10/S33 plus TXT; C1, C12: leading native sidebar, shallow hierarchy, selectable rows and standard dividers. |
| SIDE-05 | S01–S10/S33 plus TXT; C1, C12: leading native sidebar, shallow hierarchy, selectable rows and standard dividers. |
| SIDE-06 | C1/C12: native sidebar metrics and system Sidebar icon-size behavior retained; content Text Size explicitly leaves sidebar scale at 1. |
| SET-02 | C7/C12: System is the default Appearance value; app choice sets nil appearance for system following. No duplicate scrolling or accessibility switches. |
| SET-03 | S27–S30: selected pane toolbar persists, General scrolls within capped height and Automation shrinks to content; minimize/zoom are dim. |
| SET-05 | C7 and GeneralSettingsEdits.swift: ordinary app Settings apply immediately with per-field saved drafts/retry; Library-specific Playlist/Subscription sheets are separate scoped edits. |
| DLG-06 | S11–S13, S16–S17, S22–S25, S34; C4, C5, C6: one parent sheet, explicit Cancel, safe commit routes. |
| DLG-08 | S24 and C5/C6: repeated podcast search is a UtilityWindow/NSPanel, not a Library-blocking sheet; its key-focus request is deliberate for input. |
| CTRL-01 | S11–S13, S16–S17, S22–S25, S27–S30; C4–C7: native controls, persistent labels, field validation and progress. |
| DATA-07 | C5, C6, C10: persisted scoped drafts, reversible named database edits, restored browsing state. |
| DRAG-02 | C9, C11: transferable ordered selection, copy across Playlists, move within, undoable batch insertion. |
| DRAG-04 | C9, C11: transferable ordered selection, copy across Playlists, move within, undoable batch insertion. |
| PTR-01 | C1, C9, C11: object-scoped context commands and tooltips; native menu construction. |
| PTR-02 | C1, C9, C11: object-scoped context commands and tooltips; native menu construction. |
| APPEAR-01 | S01–S34 Light/Dark; C12: one app appearance controller defaults to System and observes preference changes. |
| APPEAR-02 | C12 and bundle script: NSAccentColorName/AccentColor asset is Multicolor-only; custom accent foregrounds evaluate contrast and fall back to primary. |
| APPEAR-06 | S01–S34 in both appearances; C7, C12: semantic colors, system accent and regular glass with opaque fallbacks. |
| APPEAR-07 | S01–S34 in both appearances; C7, C12: semantic colors, system accent and regular glass with opaque fallbacks. |
| APPEAR-08 | S01–S34 in both appearances; C7, C12: semantic colors, system accent and regular glass with opaque fallbacks. |
| TYPE-01 | S02/S03/S27 plus C4/C7/C12: 13 pt body, 17 pt Inspector/sheet headings, 10–12 pt metadata via macOS semantic styles; artwork monograms and status glyphs are separate roles. |
| TYPE-04 | TXT S03/S07 shows row icon targets 28×28 pt; C12 MacIconLabel fixes the 28 pt target. Native mini slider and small-control bezel dimensions are not treated as custom undersized targets. |
| AX-03 | C12: Settings Text Size and View Bigger/Smaller/Actual Size reach 200%; episode tables become wrapping reading lists and sheets scroll. |
| SYS-01 | C14 and bundle script: model-based Episode/Playlist entities, repeatable playback/add/mark/search intents, UndoableIntent and app-shortcut metadata extraction. Actual Siri/Shortcuts presentation not captured. |
| SYS-04 | S18 and C3/C9: native ShareLink for supported public Podcast/Episode URLs; invalid schemes rejected. |
| SYS-06 | C6/C11 and bundle script: native OPML Open/Save, Finder document-type registration and cold-open staging, feed URL/file drops. Safari/credential extensions are not relevant to the current unauthenticated Library workflow. |

## Scores

Scores below combine both appearances; an appearance-specific exception is stated. The rubric’s category anchors and caps apply even to owner decisions. “Partial” describes the missing runtime verification, not screenshot-only grading: the behavioral judgment also rests on source and exported menu/state evidence.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong, near Exemplary: S02/S03/S19/S27/S33 use a compact system-font hierarchy, distinguish Episode from Podcast metadata and align time with tabular figures. C12 has explicit content enlargement rather than scaling the whole window. Not Exemplary because full notes measure and large-text/minimum-width combinations are unobserved. | `hierarchy`, `accessibility`, `craft` |
| Hierarchy | **8.5** | Strong: source list → rows → Inspector reads clearly; S33 transforms details into a useful batch summary. S06 distinguishes Current Entry from selection and active Playlist. Repeated row actions and the dominant persistent player add competing action locations, keeping it below Exemplary; the player remains owner-fixed. | `content-first`, `hierarchy` |
| Spacing & density | **8.6** | Strong: 225 pt source sidebar, ~270 pt Inspector, 28 pt icon targets, repeated 8/12/16/24 pt relationships in code. Dense tables and spacious short forms fit their different tasks. Expanded description S19 leaves a smaller Episode viewport and requires two neighboring scrollers; minimum/tiled-window survival is not demonstrated. | `craft`, `conventions` |
| Color & contrast | **6.9** (Light **8.9**, Dark **6.9**) | High Competent after mandatory cap, despite otherwise Strong restraint: plain reading surfaces, meaningful red armed action, primary text on glass, semantic selection. Opaque secondary token `#606060` on white is 6.29:1; white on packaged Light/Dark accents is 6.81:1/6.41:1. **APPEAR-04** selected Dark Settings label is 1.69:1 and caps the combined category. Source has contrast/transparency fallbacks; not all combinations were run. | `color-restraint`, `accessibility` |
| Iconography | **8.9** | Top of Strong: SF family throughout, conventional Play/Add/Share/Trash/Inspector glyphs; artwork initials retain identity without substituting for command labels. S03/S07 actions and their source have names/tooltips, and M avoids icon confetti. The numerous compact glyphs require more recognition than an Exemplary first encounter, and some live spoken names remain AX-01 N/O. | `conventions`, `plain-language`, `craft` |
| Consistency & polish | **8.6 (stability N/O)**, partial: no flow run | Strong: shared sheet/form/footer/status components, both appearances designed, explicit empty and batch states, consistent trailing form commit. Native selected/unemphasized states show attention to focus. No band limit from unobserved stability; code architecture is not promoted to a 9-level timing/focus claim. Same stability verdict in Light and Dark. | `craft`, `stability` |
| Clarity | **8.7** | Strong: S23 names count, target and placement; S34 explains what Rewind restores and preserves; S08 explains why manual Played does not create History. Domain capitals and many filters ask some learning, but help/empty states explain them. Shorter language and more compact disclosure could reduce reading effort before Exemplary. | `plain-language`, `feedback` |
| Platform fit | **6.9** (uncapped **8.7**) | Mandatory major cap from **WIN-05/SYS-05**. Looks **8.8**, Behaves **8.7**; `(8.8 + 2×8.7)/3 = 8.7` rounded. Strong native frame, menus, field editors, multiwindow scenes, scoped sheets, system sharing and semantic intents. Source-established Services and app-link gaps remain. Apply cap after the formula. | `conventions`, `discoverable-commands`, `stability` |
| Interaction & feedback | **8.6**, partial: timing/assistive runtime N/O | Strong: persistent drafts, named multistep undo, safe Trash, staged irreversible purge, query-generation protection, keyboard menu routes, native drag payloads/placeholders and error Retry. More considered than the Competent system-default-only anchor. Not Exemplary: no five-run response/typing/hitch evidence, full FKA traversal or live assistive-technology validation. No verified keyboard/data-safety blocker. | `forgiveness`, `keyboard-efficiency`, `feedback`, `user-control` |
| **Overall** | **8.5 / 10** | Holistic Strong: serves the central find/arrange/listen task and is recognizably a Mac application across the captured states. Its weakest observed areas are the accepted Dark Settings-label contrast and the accepted platform deviations. Lowest category is 6.9, so Overall ceiling is **8.9**; 8.5 respects it. This is not an arithmetic category average or a claim that unobserved behavior passes. | `content-first`, `conventions`, `character` |

### Platform signals and comparison

The available Things reference [02-project-headings.png](/Users/sarvagnan/Documents/UI_Guidelines/examples/screenshots/things/02-project-headings.png) was inspected as the nearest personal-tool exemplar: PodList keeps more visible columns and metadata for Episode comparison, a purposeful domain difference. No current Apple Mail/Finder/Notes/System Settings reference capture was supplied. A literal Apple-app side-by-side comparison is therefore **N/O**; none was launched to obtain one. The following signals are grounded in PodList’s evidence and the supplied Mac signal definitions, not an invented Apple screenshot comparison.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 frame | Native | S01/S26–S30; C6 native scenes/traffic lights |
| L2 type | Native | Semantic Mac styles in C12; S02/S27 |
| L3 controls | Native | Standard pickers/checkboxes/fields and primitive Button-backed styles, C4/C12 |
| L4 menus/popovers | Native (code/menu export) | M and C2/C3; open context-menu appearance unobserved |
| L5 notation | Native | C8 system equivalents and glyph order |
| L6 sidebar/selection | Native | S02→S03, S06→S07; C1/C12 |
| L7 symbols | Native | SF Symbols in all captured task surfaces |
| L8 Settings | Native | S27–S30; own pane-sized window, live changes |
| L9 density | Adapted | Compact comparison tables plus larger artwork/transport for listening, S03/S06 |
| L10 materials | Native | Glass limited to control layers with fallback, C12 |
| L11 appearance | Native, with APPEAR-04 failure | System/Light/Dark controller; S01–S34 |
| B1 menu bar | Native | M; complete object/task command families C2/C3 |
| B2 Settings shortcut | Native | Native Settings scene C6 and App-menu Settings… in M |
| B3 shortcuts | Adapted | Command families plus carefully scoped Return/Space, C3/C8 |
| B4 text | Native implementation; Services/text-assistance runtime N/O | Native fields and TextEditingCommands; APP-03/TEXT-02 remain N/O |
| B5 keyboard/lists | Adapted; full FKA N/O | Native List/Table and incremental type-selection, C9 |
| B6 context menus | Native implementation; outline runtime N/O | Context IDs passed to the same actions, C1/C9 |
| B7 windows/state | Native implementation | Multiple Library windows and SceneStorage, C1/C6/C10; relaunch frame behavior not exercised |
| B8 drag and drop | Adapted | Ordered private payload plus URL/text fallbacks, copy/move rules and placeholders, C11 |
| B9 integration | Adapted, incomplete | Intents and Share present; Spotlight major, Services/link minors |
| B10 undo/help | Native | Named Edit history, scoped recovery, task help and Help search, M/C7/C10 |
| B11 footprint | N/O | No measured workload/baseline |

Foreign/deviating signals · No web-style frame, hamburger navigation, touch-picker grammar or framework developer menu is established. The literal bottom-edge rule remains a documented owner-approved deviation. Missing integration is scored as such rather than called a foreign visual idiom.

### What stands between this build and 9.0

Under the supplied rubric, **9.0 is unavailable with the accepted major failures**: the category caps leave a 6.9 floor and an 8.9 Overall ceiling. The Dark Settings label, bottom transport and Spotlight deferral continue to count; none becomes a hidden pass merely because accepted. Eliminating the minor Services/deep-link gaps alone cannot remove that ceiling.

Within the current decisions, finish the app-link entry point, then the selection-based feed route; keep Spotlight last as instructed. To substantiate broader claims, the next evidence set needs minimum/tiled/typical sizes, 200% content, contrast/transparency combinations, the prescribed delayed-completion and five-run timing measurements, restoration checks, live FKA and VoiceOver. These are verification gaps, not extra scored failures. Current source retains the app’s identity; no recommendation requires changing its vocabulary, palette identity, fixed player or glass adoption.

## Next step

Target · **SYS-03, stable app-content links**. The three verified majors are owner-decided and excluded as remediation targets. Of the remaining actionable gaps, Platform fit is the lowest category; links back to Episodes/Playlists are closest to the primary listening task.

Anti-pattern · No exact catalog fit; this is a missing cross-app entry point, not a web “dead-end URL” finding.

Root cause · ShareLinks models only publisher/enclosure URLs, and the application URL handler models only OPML files. There is no stable route from an external reference back to a Library object.

Change · Add one versioned Library-scoped app URL grammar for Episode, Playlist and View identifiers; add a clearly named **Copy PodList Link** alongside the current public Share/Copy Link; route it through the existing window navigation with unavailable-item recovery. Do not start playback merely by opening the link. This is a proposal only; no code was changed.

Principle · `user-control`, `conventions`, `discoverable-commands`; resolve simplicity versus power by keeping the public share action prominent and placing the internal reference in the menu/context menu.

Expected effect · Improves Platform fit and the repeat find/arrange/listen loop; may add one menu item, so retain sparse grouping. Blue initials, domain vocabulary, compact tables, bottom player and glass surfaces all survive. Nearest contrast: **PLAT-10, Custom content participates outside the app**, and **WHOLE-05, Reading fluency extends across the system**. Things would make a saved object addressable without asking the person to reconstruct its navigation path. Its look need not be copied.

No iteration log · Audit only. Character check: all five recorded signature elements **kept**; no implementation or borrowed visual redesign was performed.
