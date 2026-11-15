# PodList Mac UI grade — round 2 — Codex

## Frame

- **Task:** Find podcast Episodes through Subscriptions and saved Views, arrange Entries in Playlists, and control listening while retaining per-Playlist Position and recovery history.
- **Target:** Native **Mac app**, SwiftUI/AppKit, macOS 26+; reviewed source commit **548ae31**. Supplied run: macOS 27.2 VM, Retina, 1920×1200 pt desktop, demo Library with Deep Field, Market Hours and Slow Build.
- **Posture:** Sovereign personal Library tool with persistent background playback and brief editing tasks.
- **Audience:** Perpetual intermediate; a newcomer must be able to discover Views versus Playlist Entries without learning private shortcuts first.
- **Nearest exemplar:** Things for a calm personal collection/selection workflow; BBEdit for the complete menu and recovery contract. Neither is a visual replacement target.
- **Character:** Blue accent with appearance-specific variants **(owner-fixed)**; shallow Views/Playlists/Library source list; compact Episode metadata tables; explicit Current Entry / Active Playlist / Position vocabulary; restrained glass around playback/actions **(owner-fixed)**. Starting baseline is the supplied 35 Light and 35 Dark images, retained unchanged.

**Owner decisions:** Fixed brand blue (#2B50C8 Light, #9DB1FF Dark, #193A9B / #B2C1FF Increase Contrast); bottom transport; System/Light/Dark picker; noncustomizable toolbar; two-click, four-second disarming unsubscribe with undo; glass on player, Inspector actions, Now Playing and View editor footer; Spotlight deliberately last; MCP off by default and App Intents on. These remain graded, including caps, but are excluded from the next-target selection. No code or product behavior was changed. No earlier grading report was opened.

**Method:** Applied [CRITIQUE.md](/Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md), the complete core/Mac checklists, rubric and Mac platform signals. Inspected all 70 supplied images via contact sheets and relevant originals, accessibility trees and menu export, then reviewed the app code for uncaptured behavior. Source-derived verdicts are identified as C, not represented as fresh interactive tests. The supplied tour is evidence of reachable states, not the rubric’s measured flow run. No production Library was launched or altered. Beads context was read, but `bd ready --json` could not open the shared Dolt database (`openat LOCK: operation not permitted`); no issue status was changed.

Evidence notation: **L/D NN** means both appearances for the exact state in the capture index below; matching `.txt` snapshots share the basename. **C** means code inspection. Short source keys resolve to the files in the source index, with line numbers in the findings/pass table. Existing tests were read where useful; they were not rerun and are not treated as new runtime evidence.

## Flows

**Tasks run:** The supplied [XCUITest tour](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/UITour/PodListUITour.swift) navigated the following paths in each appearance. This review inspected its exported results; it did not execute another app session.

| Main task | Observed path / captures | What is established / missing |
|---|---|---|
| Choose an Episode | Subscriptions → New this week → select → Inspector → Starred → All Views (01–05); Search Library → type rice → result (15) | Selection, table/Inspector, filtering and reachable states. No focus/scroll trace, delayed result while typing or p75 timing. |
| Manage a Playlist | Default Entries → select → Inspector → History → Listening Timeline → Rewind preview → Cancel (06–09,34a,34); Commute → Settings → Rename → Cancel → New Playlist → Cancel → Trash (10–14) | Reachable sections and safe preview/cancel UI. The run did not commit Rewind, create/delete/restore a Playlist, drag, or exercise multistep undo. |
| Make a View | Edit View → cancel → New View → cancel (16–17) | Full editor and validation surfaces. No submitted successful edit or delayed failure/input-preservation measurement. |
| Manage a Podcast | Market Hours → expand description → arm Unsubscribe → wait for disarm → Subscription Settings (18–22) | Arm/disarm label/symbol and reachable settings. No unsubscribe commit or undo was exercised. |
| Add and download | Add to a Playlist → cancel; Add Podcasts → dismiss; Download Rules → cancel (23–25) | Input tasks/empty state/commit placement. No download transfer progress/cancel or network error capture. |
| Listen and configure | Now Playing → Done; Settings General → Automation; Stats; Getting Started; six-row selection (26–33) | Player stayed paused. Pane resizing, documentation, Stats empty state and multiselection were captured; audio playback/chapter transitions and Siri execution were not. |

**Widths:** Main window is 1180×760 pt in the supplied images (2360×1520 pixels at 2×); Settings and sheets are content-sized. The required **760×500 pt minimum**, half-display tiling and text size at 200% were not captured. W 43 defines that minimum; code alone does not prove every native overflow/resize result.

**Appearances:** Light and Dark, explicitly selected in the app. Increase Contrast / Reduce Transparency logic was reviewed in A/G, but there is no complete live tour with either preference enabled.

**Timed runs/device:** One standard capture tour per appearance in the stated VM; physical host CPU/RAM and representative five-run response measurements are absent. The script uses existence waits and capture steps, not an input-to-frame timing harness. No p75 latency, scroll frame rate or resource-use result is invented.

**Script:** `apps/apple/UITour/PodListUITour.swift`. **Measurements file:** none satisfying CRITIQUE’s row-by-step geometry/focus/scroll/input requirements. **Screenshot strips:** the capture index below is a tour of separate states, not a delayed-completion flow strip.

**FLOW verdicts:** FLOW-01, FLOW-02 and FLOW-04 are N/O; FLOW-03 is supported by guarded/serialized code paths; FLOW-05 and FLOW-07 have static/source evidence. FLOW-06 fails for the empty Stats section. No transition displacement is asserted without a measured pair. **Stability sub-score: N/O**, both appearances. Consistency & polish is marked partial; no stability-band cap is invented.

## Cross-screen inventory

“None” means not present in the supplied state; “C” explicitly identifies an uncaptured implementation. Colors below are semantic status colors unless specified. A row groups states that share one screen/task, not unrelated implementations.

| Screen / state | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Subscriptions (01) | Top sync strip, icon + “Up to date”, secondary; C edit strip names operation | C red Library strip / Retry | None | C named buttons in edit strip below sync | C center “No Subscriptions”, Add Podcasts | None | Row Open chevron trailing; Edit Download Rules above list | Above list “Grouped by Download Rule”, secondary |
| View/Starred/selection (02–04,33) | Same top sync/edit strips | C same Library strip | None | C same named edit-strip buttons | Inspector center “Select an Episode”; C no-match action | None | Row Play/Add trailing; toolbar actions top-trailing | Filter summary above table; Inspector metadata/notes |
| All Views (05) | Same top strips | C Library strip | None | C same edit strip | C center No Views / New View | None | Toolbar New View; row opens View | Counts trailing each View |
| Playlist Entries (06–07,10) | Same top strips | C Library strip | None | C same edit strip | C “no Entries” / Find Episodes | None | Play This Playlist top-trailing; row Play | Current Entry text+symbol; Position/State columns |
| History (08) | Same top strips | C Library strip | None | C same edit strip | Center “No History”, neutral explanation | None | Play This Playlist top-trailing | Explains playback-finished versus manual Played |
| Timeline / rewind button (09,34a) | Same top strips | C Library strip | None | C same edit strip | C center No Listening Timeline | None | Rewind to Here trailing each row | Timestamp and event text, secondary |
| Playlist Settings / rename (11–12) | C shared edit strip near bottom | C red shared strip; name validation by field | Name input in same sheet when renaming | C named strip buttons | None | Parent dimmed | Done bottom-trailing; Save beside Cancel Rename | Clear on Played and Trash consequence text, secondary |
| New Playlist (13) | C dismisses/navigates after create | Red name feedback under field immediately | Name field | C global edit-strip buttons | None | Parent dimmed | Create Playlist bottom-trailing; Cancel leading | “Enter a Playlist name.” |
| Trash (14) | C named Restore status in Library strip | C Library strip | None | C Library strip | Center “Trash Is Empty”; retained for 30 days above | None | C per-row Restore trailing | Explains retention and restoration |
| Search (15) | Result count above table; top sync | C Library strip | None | C same strip | C no matches / change Search | None | Create View above results, trailing | Search destination and query in toolbar |
| View editor/new (16–17) | C live changes use shared edit status; stale “View edits cancelled.” displayed | Red under fields; C red footer status | Fields plus live matching count | C named shared strip in footer | None | Parent dimmed | Done bottom-trailing; Cancel beside it | All Conditions Must Match; Any / No limit / All placeholders |
| Podcast description/subscribe (18–21) | Green Subscribed + checkmark; sync strip | C inline feed error+Retry; Library strip | Red Unsubscribe replaces same control for 4 seconds | C shared Library strip | C No Episodes Yet / Refresh | None | Subscribed/Unsubscribe inline under title | Description, author, download-rule label |
| Subscription Settings (22) | C edits apply live; old cancellation message remains | C shared strip beneath form | None | C shared strip | None | Parent dimmed | Done bottom-trailing | Default inherits global Playback Settings |
| Add to a Playlist (23) | C sheet dismisses after success | C edit strip under picker; name error for new | Playlist chooser | C edit-strip buttons | None | Parent dimmed | Play Now / Play Next (default) / Play Last bottom-trailing; Cancel leading | Active Playlist named in choice; stale cancellation text |
| Add Podcasts (24) | C per-result Subscribed + green checkmark | C inline FailureFeedback beneath search; shared strip near bottom | Search input; C progress/results | C shared strip near bottom | Center Find Your Next Podcast | Parent dimmed | Search beside input; C Subscribe at result trailing; Done bottom-trailing | Example feed URL and OPML explanation; stale cancellation text |
| Download Rules (25) | C dismisses after Apply | C shared strip below rule | Device rule choice | C shared strip | None | Parent dimmed | Apply bottom-trailing; Cancel leading | Applies to selected Subscriptions; stale cancellation text |
| Now Playing (26) / persistent player | C transport/position update in place | C inline playback error+Retry | None | None | C No Current Entry | Now Playing dims parent | Transport centered; Done bottom-trailing; bottom bar transport persistent | Title, Podcast, Position, speed and sleep |
| General Settings (27–29) | C live setting value changes | C specific failure+Retry directly below setting | None | None in pane; app menu retains Undo | None | None | Live controls; import/export/connection actions inline | Text Size/OPML explanation in secondary; duplicate inner numeric labels |
| Automation Settings (30) | Checkbox itself reflects enabled state; C configuration when on | C red error in MCP section + Retry | None | None | Off state is intentional | None | Enable MCP checkbox | Plain access warning and always-on App Intents explanation |
| Stats (31) | Totals and streak, neutral | None shown | None | None | “Play an Episode…” but empty chart and orphan Top Podcasts remain | None | Show Daily Table inline | Explains partial time/finished totals |
| Getting Started (32) | None | None | None | None | None | Attached help sheet dims Settings | Dismiss top-trailing | Three task-oriented numbered explanations |
| Rewind summary (34) | C dismisses to Entries after success | C inline red problem above footer | Summary with kept/reset consequences | Explains “Rewind can be undone”; C Library strip later | Explicit “None” for empty affected sets | Parent dimmed | Rewind bottom-trailing; Cancel leading | Kept/Unplayed again/Back in Playlist sections |

**Mismatches:** (1) The shared “View edits cancelled.” notice appears in unrelated new/edit/add tasks (17,22–25) without scope or time; APPEAR-11 records this once. (2) Ordinary fields have readable single labels, while the nested numeric fields in 16–17/27–29 repeat labels and consume the editor’s width; CTRL-04 records this once. (3) Empty Inspector/Trash/Add Podcasts/History states explain what belongs there, but Stats leaves Top Podcasts empty; FLOW-06 records this once. Inline field validation, Library-wide edit feedback and playback-local errors otherwise have different owning scopes, so their different positions are appropriate rather than automatic consistency failures. Getting Started’s top-trailing Dismiss is a reading/help action, not a form-commit relocation.

## Checklist

**Coverage: 83.4%** (pass **97** · fail **24** · N/O **24** · N/A **22**). Denominator: 145 applicable IDs; 121 verified. All **167 unique core + Mac checklist IDs** receive exactly one verdict below. The Web checklist is outside this Mac target and adds no applicable IDs. One defect is recorded under its owning check rather than duplicated across groups.

### Failures by severity

**Blocker failures**

- **MENU-02 — fail (blocker): The menu bar is not the complete command index.** [DownloadViews.swift:25](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/DownloadViews.swift:25) provides Cancel Download, Retry and Remove Download, but the Episode command list at EC 181–201 provides only Download; the complete [menus.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/menus.txt) confirms the omissions. [MacWindow.swift:349](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacWindow.swift:349) also exposes Rename… in context menus without corresponding Rename commands in LC/EC. L/D 03 and 07 show the Inspector that contains DownloadIcon. This is established from reachable code, rather than an imagined open context menu.

  **Concrete fix:** Add selection-aware Cancel Download / Retry Download / Remove Download items to Episode, and Rename View… / Rename Playlist… to their object menus. Retain and dim unavailable items; use the same actions as the Inspector and context menus. Principle: `discoverable-commands`.

**Major failures**

- **CTRL-03 — fail (major): Optional View fields are not identified in persistent labels.** [ViewEditorScreen.swift:86](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ViewEditorScreen.swift:86) and lines 97–109/152–165 make Mentions, Minimum length, Maximum length and Show optional, but their labels never say “optional”. “Any”, “No limit” and “All” are placeholders and disappear after input. L/D 16–17.

  **Concrete fix:** Label these fields “Mentions (optional)”, “Minimum length (optional)”, “Maximum length (optional)” and “Maximum Episodes (optional)”, or provide a persistent, explicit all-fields-optional convention for the conditions section. Principle: `accessibility`.

- **CTRL-04 — fail (major): Nested column forms collapse numeric fields to slivers.** [light/27-settings-general-top.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/27-settings-general-top.txt) reports Skip intro at (840.5,481.5,8.5,29) pt and Skip outro at (843,520,4,29) pt, although both values are “0”; neither digit is readable in L 27. [light/17-new-view.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/17-new-view.txt) reports the length fields at 23×29 and 20×29 pt; L/D 16–17 visibly repeat the inner label and clip “No limit”. SET 212–224 nests a labeled TextField inside LabeledContent and a 72 pt HStack; [ViewEditorScreen.swift:152](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ViewEditorScreen.swift:152) repeats the pattern with 88 pt. The fixed frame includes another rendered label instead of reserving that width for the editor.

  **Concrete fix:** Hide the inner TextField label while retaining its accessible name, and reserve at least the intended 72 pt / 88 pt for the editable control itself. Keep one outer label and the unit beside it. Verify 0, 30, 120 and a locale decimal at 100% and 200% text size in both appearances. Principle: `feedback`.

- **DATA-06 — fail (major): Restoration omits reading position and pane widths.** [WindowRestoration.swift:39](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/WindowRestoration.swift:39) archives destination, search, selection, sort, tab and column visibility, but no scroll anchor or split widths. W 19/239–240/571–584 restores that archive; the content Lists/Tables and Inspector ScrollView have no persisted scroll binding. L/D 03, 07, 09 and 33 illustrate distinct reading contexts, but are not relaunch tests.

  **Concrete fix:** Persist a stable visible row / notes anchor per destination and the user-adjusted pane widths. Restore after data reconciliation without starting playback; verify a long list, long notes and each Playlist section across quit/relaunch. Principle: `stability`.

- **DRAG-06 — fail (major): Cross-Playlist drops do not select the new Entries at the destination.** [EpisodeTransfer.swift:67](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/EpisodeTransfer.swift:67) resolves IDs and edits the target Playlist, but neither it nor PlaylistEpisodeDropTarget has a destination WindowModel/selection callback. PL 131–138 similarly completes its edit without revealing a destination row. Same-list reorder can keep its old selection; a different target window cannot select the newly added IDs. L/D 06, 10; drag state itself was not captured.

  **Concrete fix:** Return the inserted/resolved IDs and notify the destination view to select and reveal them after a successful edit. Keep the source selection for copying, and test cross-window drops plus autoscroll separately. Principle: `feedback`.

- **APPEAR-04 — fail (major): Required validation and recurring secondary text fall below 4.5:1 in Light.** In [light/17-new-view.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/17-new-view.png), the fully covered “Enter a View name.” glyph pixels are #FF383C over #FFFFFF: 3.57:1. This is 10 pt regular caption text, not large/bold or disabled. In [light/27-settings-general-top.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/27-settings-general-top.png), the Text Size explanatory caption has #808080 glyph pixels on #FFFFFF: 3.95:1. Measurements use source PNG pixels, sRGB relative luminance and un-antialiased interior colors; crops are (900,300,210,26) and (300,1260,400,20) source pixels, respectively. [ViewEditorScreen.swift:167](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ViewEditorScreen.swift:167) uses .red for field feedback; TS 60–61 uses secondary caption for the repeated help pattern. Dark does not excuse the Light failures.

  **Concrete fix:** Use an appearance-aware darker error foreground and a stronger secondary foreground for required/help text. Verify at least 4.5:1 for these small regular labels on their actual rendered surfaces in all four appearance/contrast variants; keep the approved blue. Principle: `accessibility`.

- **KEY-03 — fail (major): Frequent app shortcuts systematically use Control.** [KeyboardShortcuts.swift:41](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift:41) assigns ⌃⌘ to Star, Played, Play Next, Play Last, Add to a Playlist, Now Playing, Playlist Settings, Edit View and chapter navigation; Download is ⌃⇧⌘D. These are app commands, not the standard system Control bindings. KS 5–50, EC 27–50/220–223, PC 34–38; L/D 03, 23, 26.

  **Concrete fix:** Choose a small Command / Shift-Command family for the most frequent actions, check it against standard equivalents and text focus, and regenerate the Help reference from that map. Keep the existing protection for text navigation. Principle: `keyboard-efficiency`.

- **WIN-05 — fail (major), owner-fixed exception: The primary transport lives at the bottom edge.** [MacWindow.swift:174](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacWindow.swift:174) installs the player in a bottom safeAreaInset; PV 15–20/31–54 places transport, seek and speed there. L/D 01–10, 18–21 and 33 show that lower-edge dependence. Menu and keyboard equivalents mitigate it but do not satisfy this check’s bottom-bar clause.

  **Concrete fix:** Owner decision: retain the bottom player. Preserve its Controls-menu and keyboard alternatives and verify them when the window’s bottom is off-screen. A full pass would require changing the approved placement; that is not a proposed target. Principle: `content-first`.

- **SET-02 — fail (major), owner-fixed exception: Settings duplicates the system appearance preference.** [LibrarySettingsScreens.swift:70](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:70) offers System/Light/Dark and A 69–73 sets NSApplication.appearance. L/D 27–29 show the picker. Match System satisfies APPEAR-01, but this separate Settings check forbids duplicating a detectable preference.

  **Concrete fix:** Owner decision: retain the picker with System as its default. No redesign requested; clearing the override for System is already implemented. A full SET-02 pass would require changing the approved choice. Principle: `respect`.

- **DLG-08 — fail (major): Now Playing blocks the Library during repeated playback control.** [MacWindow.swift:217](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacWindow.swift:217) presents NowPlayingView with .sheet. PV 143–211 contains repeated seek, transport, speed, sleep and chapter controls. L/D 26 visibly dims the entire Library while that task is open.

  **Concrete fix:** Present Now Playing as a modeless auxiliary panel with a draggable noun title, appropriate activation/floating behavior and a Window/Controls route back. Keep its control-layer glass and the bottom player. Principle: `user-control`.

- **DRAG-02 — fail (major): Drop decisions never read Option at drop time.** [PlaylistContentView.swift:131](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaylistContentView.swift:131) always reorders a same-Playlist transfer; TR 67–85 always performs Play Last for sidebar destinations. Neither route reads the event modifiers. TR 23–26 carries the source Playlist identity, so the distinction is available. L/D 06 and 10 show the destination surfaces; no drag was captured.

  **Concrete fix:** Resolve move/copy using source, destination and Option at the final drop. Since Entries are unique, explicitly define the safe Option-copy/no-op result for an already-present Episode instead of silently moving it, and expose the same result through a command. Principle: `conventions`.

- **PTR-01 — fail (major): Deleted Playlist objects have no context menu.** [PlaylistSettingsViews.swift:149](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift:149) builds each Trash row with a Restore button, but no contextMenu. The only focused menu route is Playlist › Restore. L/D 14 has empty Trash; populated behavior is established by PS 157–184, not by claiming a populated capture exists.

  **Concrete fix:** Add a row-targeted Restore context command to populated Trash rows, sharing the existing restore action and preserving the separate selection. Principle: `discoverable-commands`.

- **APPEAR-02 — fail (major), owner-fixed exception: Selection/control emphasis uses a fixed brand accent.** [MacAppearance.swift:6](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacAppearance.swift:6) defines the four fixed variants and W 44 applies podListAccent throughout the window; rows use MacRowAccentStyle. L/D 02–07 and 27–30 show that brand/system-emphasis mix. This is a policy deviation, not a claim that the blue itself is unreadable.

  **Concrete fix:** Owner decision: retain #2B50C8 / #9DB1FF and the specified Increase Contrast variants. Maintain their contrast and semantic use. Following the user’s accent would clear the check but is outside the accepted design target. Principle: `conventions`.

- **SYS-05 — fail (major), owner-fixed exception: The searchable Library has no Spotlight indexing.** No CoreSpotlight/CSSearchableIndex integration exists in apps/apple/Sources or the build metadata. AppIntents.swift provides queries and App Entities, which are not a searchable-item index. L/D 15 shows searchable Episode content; Spotlight itself was not captured.

  **Concrete fix:** Owner decision: keep indexing last in the implementation sequence. The eventual fix is a stable searchable Episode/Podcast index with suitable metadata and removal/update handling; there are no custom document types requiring Quick Look here. Principle: `discoverable-commands`.

**Minor failures**

- **FLOW-06 — fail (minor): An empty Stats section still has its heading.** [LibrarySettingsScreens.swift:278](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:278) unconditionally emits “Top Podcasts”, then iterates stats.podcasts without an empty state. L/D 31 has zero listening and shows that heading at the lower edge. The code settles that the section has no children; this is not a measured layout-shift claim.

  **Concrete fix:** Hide Top Podcasts when its collection is empty, or place “Listen to an Episode to see your top podcasts” beneath it. Keep the section and its message together. Principle: `craft`.

- **DATA-05 — fail (minor): Undo names the result but does not reveal offscreen restored content.** [PlaylistEditingModel.swift:85](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:85) restores state and a status string, but publishes no reveal/select target; W 224–240 reconciles rather than scrolls to it. L/D 03/07/33 show scrollable content. A restored View/Entry outside the visible range has no scroll-to path.

  **Concrete fix:** Publish the restored IDs/destination with the Undo result and reveal the relevant item after reconciliation, preserving unrelated window context. Principle: `feedback`.

- **PTR-04 — fail (minor): The Podcast page’s icon-only settings button has no action-specific tooltip.** [PodcastScreens.swift:199](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PodcastScreens.swift:199) constructs the gear Button with .labelStyle(.iconOnly) and no .help modifier; compare the explicit help on Inspector actions at I 145–170. L/D 18–21 show the small gear beside Copy Feed Address. Its Button title provides a name, but no app-supplied hover help.

  **Concrete fix:** Add .help("Open Subscription Settings") to the gear and audit the other icon-only body controls for the same omission. Principle: `discoverable-commands`.

- **APPEAR-11 — fail (minor): A previous cancellation status follows the person into unrelated tasks.** L/D 17 shows “View edits cancelled.” inside a fresh New View; L/D 22–25 repeats it in Subscription Settings, Add to a Playlist, Add Podcasts and Download Rules. [PlaylistEditingModel.swift:39](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:39) leaves that global status set, while EC 107–119 and PO 6–10 render it in each task without scoping/clearing it. This is a contradictory/stale visible label, not an inferred flash or FLOW-01 shift.

  **Concrete fix:** Scope completion text to the operation/presentation that produced it, or clear that notice when a new input task opens. Keep outstanding errors and actionable Undo accessible in the owning Library feedback region. Principle: `craft`.

- **APP-01 — fail (minor): The standard About panel has no supplied copyright information.** menus.txt contains About PodList with the system About action. [build-mac-app.sh:26](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/scripts/build-mac-app.sh:26) supplies version 0.1.0 / build 1 but no NSHumanReadableCopyright, and the app has no custom About options/credits supplying it. There is no About capture; this finding is limited to the missing bundle information.

  **Concrete fix:** Add the correct copyright string to the app bundle metadata and verify it in the standard About panel. Principle: `conventions`.

- **HELP-02 — fail (minor): Help is a custom window without Help Book integration.** menus.txt preserves Help’s search field, and [PodListMac.swift:42](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListMac/PodListMac.swift:42) opens a SwiftUI Help window. CON 69–108 contains useful documentation, but the bundle declares no Help Book or associated index. L/D 32 is Getting Started, not evidence of Help Book integration.

  **Concrete fix:** Package and register a Help Book/index while retaining the task documentation and shortcut reference. Verify both command search and help-topic search. Principle: `hierarchy`.

- **SET-04 — fail (minor): The last Settings pane is not persisted across app launches.** [ConnectionViews.swift:48](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ConnectionViews.swift:48) initializes pane with @State “general”; it is neither AppStorage nor restored scene context. L/D 27–30 prove the titles match General/Automation, but reopening Settings after a new process starts resets the selection to General. Same-process window caching is not claimed to fail.

  **Concrete fix:** Persist the last selected Settings pane and restore it only when Settings is explicitly reopened. Principle: `stability`.

- **SYS-02 — fail (minor): No purpose-specific Service accepts a selected feed address.** The app has no NSServices declaration or Service provider. [LibraryDrops.swift:10](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/LibraryDrops.swift:10) already recognizes a safe web feed URL, and LC 30–31 opens Add Podcasts; those are useful foundations for a selection-based Subscribe/Add Podcasts Service. L/D 24 shows the corresponding task.

  **Concrete fix:** Provide an Add Podcasts in PodList Service for a selected URL/text feed address that stages the existing Add Podcasts workflow without silently subscribing. Principle: `conventions`.

- **SYS-03 — fail (minor): There are no stable links back to PodList Library objects.** The bundle has no registered URL scheme/universal-link handler and the app has no onOpenURL route. [ShareLinks.swift:1](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ShareLinks.swift:1) only returns publisher/enclosure web URLs. L/D 03, 06 and 15 contain addressable Episode/View/Playlist context, but the external publisher link cannot restore that PodList context.

  **Concrete fix:** Define stable Library-scoped Episode/View/Playlist links, validate their IDs and route them into a window without starting playback. Keep publisher links as a separate sharing choice. Principle: `user-control`.

- **SYS-06 — fail (minor): The browser-to-library workflow has no system Share receiving route.** The product accepts feed addresses through Add Podcasts and DROP, but declares no Share extension/incoming share handler in apps/apple or its bundle. L/D 24 shows that workflow. This finding is only for receiving a selected feed URL: Safari extension, Password AutoFill and Finder Quick Actions are not independently required for this app.

  **Concrete fix:** Add a Share receiving route for a feed/web URL that stages the same validation and Add Podcasts task; retain paste and drag as alternatives. Principle: `conventions`.

### Not observable

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-07, LIST-07, DRAG-05, TYPE-05, TYPE-06, AX-01, AX-04, WIN-03, RESP-01, FOOT-02, APP-03, WMENU-02, WIN-10, TOOL-02, SIDE-06, DRAG-04, DRAG-07, PTR-05, AX-03, FOOT-01.

The limits behind these IDs are: no instrumented transitions/timing; no live Full Keyboard Access, list type-selection, VoiceOver or assistive-input session; no native Services execution; no minimum/tiled/enlarged/full resize run, system sidebar-size change or Zoom toggle; no drag-in-progress feedback/selection gesture, external multi-item provider-count observation or secondary-click outline capture; no representative resource/scroll-performance measurement. Code establishes the presence of native components and the 100–200% text mechanism, but not all clauses of those experiential checks. In particular, blank XCUI field labels are not used to assert a VoiceOver failure: XCUI is not the complete AX relationship/subrole tree.

### Not applicable

| ID | Verdict and reason |
|---|---|
| DLG-01 | N/A — No app-authored alert feature; routine edits use inline feedback and undo. |
| DLG-02 | N/A — No app-authored alerts → absent alert feature. |
| DLG-03 | N/A — No app-authored alerts → absent alert feature. |
| DLG-05 | N/A — No destructive alerts → absent alert feature; sheet deletion routes are separately reversible. |
| DLG-09 | N/A — No app-authored popover task; native menus/sharing are not substitutes for an audited custom popover. |
| LIST-05 | N/A — No expandable outline/disclosure tree in the Library. |
| START-04 | N/A — No protected-resource permission request in this build. |
| START-05 | N/A — No protected-resource permission request → absent permission feature. |
| START-07 | N/A — No in-app account creation; local/server Library identity is not a hosted account signup. |
| FILE-01 | N/A — No editable file-document New/Open model. File has Library creation and OPML import/export; those routes remain audited elsewhere. |
| FILE-02 | N/A — No opened-document history. |
| FILE-05 | N/A — No printing feature or printable document model. |
| FMT-01 | N/A — No formatted-text editing. |
| FMT-02 | N/A — No formatted-text editing → absent Format feature. |
| DATA-02 | N/A — No dirty file documents; Library writes and explicit staged tasks instead. |
| DATA-03 | N/A — No autosaved file-document/version-browser model. |
| DATA-08 | N/A — No Finder document-editing model; OPML is an interchange format. |
| SYS-07 | N/A — No task need for an app-owned Dock badge/tile beyond the system media surfaces; a decorative listening count is not required. |
| EXTRA-01 | N/A — No menu bar extra. |
| EXTRA-02 | N/A — No menu bar extra → absent extra. |
| EXTRA-03 | N/A — No menu bar extra → absent extra. |
| EXTRA-04 | N/A — Library podcast app, not a dual-mode quick-capture utility. |

### Passes

Each row is a pass on the available capture/code evidence; it does not convert an explicitly unverified live test into a measured result.

| ID | Verdict and evidence |
|---|---|
| FLOW-03 | pass — PO 76–90 cancels/suppresses stale search results by submitted query; GS 23–43 guards pending/failing drafts; ViewEditorScreen 180–245 serializes live writes and blocks concurrent draft reconciliation. C establishes input preservation paths, not measured timing. |
| FLOW-05 | pass — L/D 02–07, 10, 15, 18: list and Inspector share their top content edge; sidebar is intentionally a separate navigation plane. |
| FLOW-07 | pass — L/D 13, 16–17, 23, 25, 34: commit actions are bottom-trailing in comparable input sheets; reading/live-settings tasks use Done in that region. |
| KEY-04 | pass — L/D 13,17,24 show initial field focus and visible rings; PS 10–28 and PO 26/73 set first-field focus; native form declaration order supplies forward/back traversal. Full Keyboard Access completeness is KEY-01 N/O. |
| KEY-06 | pass — KS uses ordinary letters and arrows, and TS uses the directly represented + / − keys; no punctuation shortcut requires an additional layout-dependent modifier. International physical execution remains untested. |
| KEY-08 | pass — CON 80–106 provides an in-app shortcut reference and explicitly scopes Space / Command-arrow away from text entry; PC 59–84 implements that guard. |
| DLG-04 | pass — PS 23–26, ViewEditorScreen 120–127, PL 243–256 provide safe cancellation; PC 59–83 routes ⌘. to the sheet’s Escape action instead of Stop. Live settings have no unapplied destructive choice to cancel. |
| DLG-07 | pass — L/D 13,16–17,23,25,34 and sheet code: Cancel with commit/Done; no Cancel–Done–Back triple. |
| CTRL-02 | pass — PS 130–134 and SET 162 use native checkbox-style Toggle; no partial child hierarchy is misrepresented. |
| CTRL-05 | pass — G 47–60 keeps the native Button primitive in glass and bordered fallback; ordinary body controls use native styles. Inspector’s circular transport is a task signifier rather than the sole prominence technique. |
| CTRL-06 | pass — EC 85–94 keeps Play Now/Add visible beside More; PO 184–200 exposes subscription and sharing; menu actions are related by Episode/Playback purpose. |
| CTRL-07 | pass — W 167 distinguishes Search Library / Search this list / Search Episodes; L/D 15 has Search destination and result count. No displayed search history to clear. |
| CTRL-08 | pass — DL 29–36 shows measured download fraction and Cancel; PO 45 shows indeterminate search; W 123–128 and LE import state retain resumable work and failed-import retry. |
| LIST-01 | pass — W 456–469, PL 70–81 and PO 230–243 use native Table for columnar Episode/Entry metadata; navigation remains a shallow source list. |
| LIST-02 | pass — L/D 02,06,18: Episode/Entry, Published, Position, Length and State are consistent noun headings with no punctuation. |
| LIST-03 | pass — W 456–463 and PO 230–239 bind native sortable headings to persisted comparators and expose resizable columns; ordered Playlist Entries deliberately do not offer a conflicting sort. |
| LIST-04 | pass — L/D 02,06,10,18,33: consistent row boundaries, title/podcast pairing and aligned numeric columns keep rows trackable without stripes; no file-name column requiring middle ellipsis. |
| LIST-06 | pass — L/D 02–07,10,14–15,18,33 keep the navigation/row selection visible; native pickers encode current choices. |
| DATA-01 | pass — LE 120–124 persists field drafts; PS binds creation/rename drafts to PlaylistDrafts; ViewEditorScreen 180–245 stages invalid input and awaits writes/cancel restoration; ED uses reversible database operations. No destructive save default is found in these code paths. |
| DATA-04 | pass — ED 59–118 keeps multistep inverse history and only completes reversal on success; LE 163–220 covers Views/subscriptions; EC 173–179 preserves native text Undo separately. C verdict, not a fresh runtime undo test. |
| DRAG-01 | pass — W 181–189 and DROP accept OPML/feed URL in the window; W/PL/PO offer Episode drags with public URL/text fallback, TR adds to a Playlist; menu equivalents expose Import/Add/Move. Missing receiving system surfaces are separately SYS-02/06. |
| DRAG-03 | pass — PL 131–138 and TR 67–85 route drops through ED’s named reversible move/add operations; OPML file drops only stage a preview (DROP 48–65). |
| PTR-03 | pass — Native Lists/Tables/ScrollViews, toolbar and window frame retain standard pointer semantics; custom gestures in PO reset arming and do not replace scrolling/window manipulation. |
| APPEAR-03 | pass — A 6–29 defines Light/Dark and Increase Contrast colors; G 12–39 uses an opaque semantic background plus boundary for Reduce Transparency, Increase Contrast, or both. Native controls retain semantic appearances; separate contrast failure is APPEAR-04. |
| APPEAR-05 | pass — No app-authored positional/blur animation is added in PodListUI; native glass/control transitions retain system Reduce Motion behavior. No unsupported animation exemption is inferred. |
| APPEAR-09 | pass — L/D tour and MacIconLabel: one SF Symbol family; plus/play/gear/trash/share carry familiar meanings and align with text. The narrow gear’s missing help is PTR-04. |
| APPEAR-10 | pass — L/D 03,07,16,26 and G: material/border layers distinguish tools from content; opaque accessibility fallback includes a boundary. |
| TYPE-02 | pass — L/D tour uses Regular/Medium/Semibold/Bold SF text; no thin weight or competing display family. |
| TYPE-03 | pass — TS 38–42 scales semantic system fonts; captions and body use the Mac system font, including tables and Inspector metadata. |
| TYPE-07 | pass — Own UI has no long all-caps passage or combined bold-italic emphasis; artwork initials and feed titles are content/illustration. Links remain recognizable. |
| TYPE-08 | pass — Observed own copy uses typographic ellipses/apostrophes and real range dashes (menu titles, Playlist descriptions, PL 207). Literal URLs, shortcut symbols and publisher text are exempt. |
| COPY-01 | pass — View/Episode/Playlist/Entry/Position vocabulary is consistent across W/PO/PL/CON; New, Add, Restore and Rewind describe the action. No touch-only instruction in the Mac help. |
| COPY-02 | pass — ViewEditorScreen 167–178 and SET 172–196/222 show field-specific error/retry; LE 7–13 translates connection/feed failures; FailureFeedback adds a practical Retry near its owning task. |
| COPY-03 | pass — L/D 02,08,14,24,31 and W 426–440 explain the empty context and give a useful next step; the Stats empty-shell defect is FLOW-06. |
| COPY-04 | pass — L/D tour uses consistent task-specific nouns and verbs; explicit row/transport tooltips use concise action fragments. No observed fixture title exceeds the reference length. |
| AX-02 | pass — L/D 06/10 combine Current Entry text and play symbol; 20 adds “Unsubscribe” and minus symbol to red; errors have text; navigation and selected values retain shapes/checkmarks. |
| AX-05 | pass — PV 57–98 exposes visible transport and seek state, I/DL show download/playback state in text, and SET 267–276 supplies an exact-value Stats table alternative. Publisher audio content/transcript availability is not an app-created alert dependency. |
| START-01 | pass — W 33–40 opens into Library/Welcome or a named Opening Library progress state; ApplicationModel.start is asynchronous and does not substitute an unexplained blank window. Latency itself is RESP-01 N/O. |
| START-02 | pass — LE 83–97/125–145 persists Getting Started dismissal and scopes it to the introductory View; SET 60/100–104 reopens it. L/D 32 has a clear Dismiss. |
| START-03 | pass — CON 69–108 explains Views/Entries/keyboard; L/D 32 and SET 230–245 teach concrete tasks with a visible exit. |
| START-06 | pass — CON 33–35 offers Start on This Mac without a server/account; server connection is optional and preserves a local Library. No unnecessary sign-in wall. |
| EDIT-02 | pass — menus.txt retains system Cut/Copy/Paste/Delete/Select All; W 479–481 and PL 90–96 provide selection-aware Copy/Delete without touching the clipboard on removal; text remains native. |
| EDIT-05 | pass — SC 49–71 provides descriptive title + URL text and URL pasteboard representations per selected Episode; W/PL onCopyCommand returns one provider per selected item; notes enable text selection. |
| TOOL-06 | pass — Inspector can return through W toolbar and View › Show Inspector (⌥⌘I); sidebar uses native SidebarCommands. Toolbar is deliberately noncustomizable, so customization modes do not apply. |
| SIDE-03 | pass — Native SidebarCommands plus toolbar sidebar control restore navigation; Inspector has the visible control, View item and ⌥⌘I route (W 155–160/682–687). |
| SIDE-04 | pass — L/D 02–07,10,14–15 preserve the current destination and row context; Podcast pages intentionally keep Subscriptions selected as their parent. |
| SET-01 | pass — SET/CON place infrequent global behavior in Settings; PS and PO keep Playlist/Subscription options near those objects; DL keeps device rules at the Podcast task. |
| MENU-01 | pass — menus.txt: PodList, File, Edit, View, Podcast, Views, Controls, Episode, Playlist, Window, Help. Format is inapplicable; app-domain menus sit before Window. |
| MENU-03 | pass — menus.txt retains dimmed Subscription Settings, Playlist actions and chapter commands; EC/LC/PC use disabled bindings and dynamic Play/Pause, Star/Unstar, Show/Hide titles. |
| MENU-04 | pass — menus.txt and LC/EC use concise verb phrases and ellipses for input tasks (New View…, Subscription Settings…, Rewind to Here…). |
| MENU-05 | pass — App-defined command trees use no nested app submenu beyond the Playlist/speed/sleep choices; mostly text and sparse standard Share symbols. OS Move & Resize nesting is system-owned. |
| MENU-06 | pass — menus.txt includes standard Option alternates such as Close All/Minimize All/Zoom All; no app-defined multi-modifier hidden alternate. |
| APP-02 | pass — menus.txt contains Settings…; native SwiftUI Settings scene in PodListMac opens the independent pane window (L/D 27–30), preserving the standard ⌘, binding. |
| APP-04 | pass — menus.txt supplies standard Hide, Hide Others, Show All and Quit selectors in order; the app does not replace their system key equivalents. |
| FILE-03 | pass — menus.txt retains native performClose: and closeAll:; WindowGroup supplies ordinary independent Library windows. |
| FILE-04 | pass — SET 301–311 uses NSSavePanel to write OPML without closing/changing the current Library; document Duplicate is inapplicable. |
| EDIT-01 | pass — menus.txt starts Edit with Undo/Redo; EC 173–179 reads the appropriate logical or text undo name and availability; ED 56–57 constructs named operations. |
| EDIT-03 | pass — menus.txt retains Edit › Find and standard native text-find actions; LC 54–55 separately provides named Search Library for objects. |
| EDIT-04 | pass — PodListMac installs TextEditingCommands; menus.txt lists spelling, substitutions, transformations and speech plus system text commands. |
| VIEW-01 | pass — menus.txt contains sidebar, text size, Inspector and Enter Full Screen controls in View. |
| VIEW-02 | pass — menus.txt uses Hide Inspector / Hide Sidebar based on visibility; W 682–687 toggles it. Window holds Stats/Help window navigation. |
| WMENU-01 | pass — menus.txt has Window with distinct Minimize, Zoom and Bring All to Front plus window entries. |
| WMENU-03 | pass — Only the main Library window is open in the menu capture; the normal WindowGroup / Window scenes use system window-list integration. Sheets do not add document-list entries. |
| HELP-01 | pass — Help is trailing, retains system search, and PodListMac opens CON’s useful app-specific Help rather than a framework help URL. No app override of the standard Help-menu accelerator. |
| KEY-02 | pass — EC preserves ⌘Z/⇧⌘Z, PS/W preserve creation commands; PC explicitly protects Space and ⌘←/⌘→ in editable text and ⌘. in sheets. No conflicting standard action is identified. |
| KEY-05 | pass — KS notation is ⌃⇧⌘ where relevant; CON uses Mac glyphs and upper-character ⌘+; native menu keyboardShortcut renders localized modifier/key labels. |
| TEXT-01 | pass — Native SwiftUI TextField controls remain AppKit text editors; PC 68–72 routes protected navigation to interpretKeyEvents instead of implementing text editing itself; no replacement text engine. |
| TEXT-02 | pass — PodListMac adds native TextEditingCommands and ordinary TextFields, without disabling substitution/spelling or replacing their editing behavior. menus.txt supplies native selectors for the applicable commands. |
| WIN-01 | pass — L/D main windows have standard traffic lights; PodListMac uses WindowGroup and W only sets content minimums, retaining standard close/minimize/zoom. |
| WIN-02 | pass — L/D 03/07/33 show secondary sidebar selection when focus is in the table; 11–13/26 dim the parent during a sheet. Native List/Table/window materials, not forced active fills, own activation state. |
| WIN-04 | pass — L/D title bar names New this week, Default, Commute, Subscriptions and Market Hours and adds a useful selection/count subtitle; long content names remain identifiable. |
| WIN-06 | pass — System WindowGroup and menus.txt Enter Full Screen use native full screen; Controls/menus keep essential playback commands reachable. No custom full-screen frame. |
| WIN-07 | pass — LC 28–29 and W 629–637 expose New Window / Open in New Window for Views and Playlists, with task-specific windows for Help and Stats. |
| WIN-08 | pass — PodListMac’s WindowGroup supports simultaneous Library comparisons; LibraryWindowTarget supplies independent identities and W keeps separate per-scene browsing state. |
| WIN-09 | pass — Native SwiftUI window frame/toolbar is retained; no custom title-bar hit testing, fake traffic lights or drag interception. Non-document Library titles need no file proxy icon. |
| TOOL-01 | pass — L/D 02/03/06: leading sidebar/title, grouped common actions, trailing Inspector/actions/search use the native toolbar; body-only player is separately WIN-05. |
| TOOL-03 | pass — L/D 03/33 groups the app’s primary actions and separate More menu alongside search; no more than three functional app toolbar groups; no competing filled primary buttons. |
| TOOL-04 | pass — W 140–160 and EC 85–94 use borderless standard plus/sliders/sidebar/play/add symbols; no large web-style toolbar button. |
| TOOL-05 | pass — W uses ToolbarItemGroup for frame actions; section switcher, toggles, checkboxes and settings fields are in content rather than hand-built frame controls. |
| SIDE-01 | pass — W 59–115 and L/D 01–10 put a default-visible source sidebar at the leading edge. |
| SIDE-02 | pass — W 64–110 groups one item level beneath Views/Playlists/Library; no deep nested navigation. |
| SIDE-05 | pass — L/D 02–07/18 show thin visible native pane dividers; no custom thick splitter substitutes for them. |
| SET-03 | pass — L/D 27–30 show a selected two-pane toolbar, correct pane title, dimmed minimize/zoom and content-fitting height; CON 53–64/CP drive pane sizing. |
| SET-05 | pass — SET 147–179/GS apply ordinary settings live with per-setting failures/retry; no Settings Save/Apply/OK. Explicit Download Rules Apply is an object bulk-edit sheet, not global Settings. |
| SET-06 | pass — The app creates a native Settings scene but never explicitly opens it at launch; L/D 27–30 show inactive zoom/minimize. Restoring a last pane on explicit reopening is separately SET-04. |
| DLG-06 | pass — L/D 11–13,16–17,22–26,34 show one usable attached sheet at a time; W/PS/PL use per-window .sheet presentations, not app-modal alerts. |
| CTRL-01 | pass — L/D 06/10 use three Playlist sections; 11 uses a native checkbox; 22/27/30 use native pop-up choices and two Settings toolbar panes. No touch wheel or web control grammar. |
| DATA-07 | pass — SET 290–311 uses standard NSOpenPanel/NSSavePanel with proper file-only import and named OPML export; no custom file browser overrides system locations or user extension visibility. |
| PTR-02 | pass — EC 26–50 and PL 117–124 use two/three related groups, with keyboardShortcuts false in context uses; sidebar context groups are concise. No displayed context shortcut annotations in code. |
| APPEAR-01 | pass — A 44–76 applies one live app-wide appearance and clears the override for System; all 35 L/D pairs remain coherent. SET-02 is the separately scored owner exception. |
| APPEAR-06 | pass — G and L/D 03,07,26: glass is on player/Inspector transport/footer control layers; Episodes and notes keep ordinary content surfaces. |
| APPEAR-07 | pass — G 35 uses regular glass with semantic primary foreground; no clear-glass text panel or explicit glass-on-glass surface stack. PV/I GlassEffectContainer groups controls. |
| APPEAR-08 | pass — L/D 02–07,16,26: native toolbar/sidebar surfaces and scrollable content remain separated; W uses safe-area inset and native Inspector rather than painting over toolbar/scroll edges. |
| TYPE-01 | pass — W/SET/PO use semantic .body (13 pt), headline, title2 and caption roles; TS supplies explicit reading scale. Artwork initials are illustrative, not undersized body text. |
| TYPE-04 | pass — L/D 17 AX gives repeated row action targets 28×28 pt; I 145–170 provides 44 pt transport and 28 pt small tools; native small/mini bezels alone are not treated as failures. Numeric editor width is counted once under CTRL-04. |
| SYS-01 | pass — AppIntents.swift defines semantic Episode/Playlist entities, transport/search/list/add/mark intents and UndoableIntent edits; build-mac-app.sh extracts and validates actions/entities/shortcuts metadata. Off-by-default MCP does not gate those system intents. |
| SYS-04 | pass — LC, EC, PO and I use ShareLink for supported publisher/enclosure URLs rather than a custom share-target list. L/D 18 shows convenient Share Podcast. |

## Scores

Both appearances support the same category bands. Light has the measured text-contrast failure; Dark does not erase that failure in an app-wide grade. Visual scores assess the supplied typical-size states, not untested resizing. All ten rows use the rubric anchors; **Overall is holistic, not their average**.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **7.8** | Strong: L/D 02–07 use a deliberate SF title/metadata hierarchy and tabular time; 03/07/26 distinguish episode, podcast and details. Above generic equal-weight type; below Exemplary because long notes, enlargement and smallest-window wrapping remain unverified. Numeric field collapse is owned by Controls, not counted as another typography failure. | `hierarchy`, `craft`, `accessibility` |
| Hierarchy | **7.3** | Strong: shallow source list, clear table and optional Inspector lead naturally; 03/07/33 make selection obvious. Reserved blank Inspector space, repeated Play/Add surfaces and the visually persistent bottom transport keep chrome from receding as completely as the Exemplary anchor. | `content-first`, `hierarchy` |
| Spacing & density | **6.5** | Competent: 02/06/10 maintain a useful desktop row pitch and aligned metadata with compact 28 pt row controls. The 4–23 pt numeric fields and duplicated labels in 16–17/27–29 materially interrupt that rhythm despite ample pane width; they prevent Strong. Their single checklist failure remains CTRL-04. | `craft`, `conventions` |
| Color & contrast | **6.4** | Competent: coherent Light/Dark surfaces, restrained blue and sensible glass fallbacks lift this above Weak. 3.57:1 validation and 3.95:1 help text prevent Strong; APPEAR-04 caps at 6.9. The owner-fixed user-accent deviation APPEAR-02 also caps at 6.9. | `accessibility`, `color-restraint`, `conventions` |
| Iconography | **8.0** | Strong: SF play/add/sidebar/trash/share symbols remain one family; Current Entry and unsubscribe pair symbols with words. Better than generic decorative icons, below Exemplary because repeated small row tools, the eraser state metaphor and missing gear tooltip add learning/inspection cost. | `craft`, `plain-language` |
| Consistency & polish | **6.6** **(stability N/O; partial: no flow run)** | Competent: ordinary lists, forms, sheet footers and both themes share a considered vocabulary, but the numeric editor/optional-label failures cap the category at 6.9, stale global cancellation notices leak into tasks, and Stats has an unfinished empty section. No stability sub-score or band limit is fabricated. | `craft`, `stability`, `conventions` |
| Clarity | **7.8** | Strong: Active Playlist, Current Entry, History explanation and Rewind’s “Kept” summary explain consequential domain differences; Add Podcasts teaches a concrete next step. Above the exploration-dependent Competent anchor, below Exemplary because “Show”, repeated technical capitalized nouns, stale cancellation notices and the multi-selection Inspector’s single-item detail require interpretation. | `plain-language`, `feedback` |
| Platform fit | **4.9** | Raw **7.2** from Looks 7.8 / Behaves 6.9, reduced to **4.9 by blocker MENU-02**. Native windows, tables, real Settings, sharing and semantic App Intents are substantial strengths. Missing commands are a core Mac-contract failure even in a native-looking build; DLG-08, WIN-05, SET-02 and SYS-05 also impose 6.9 major caps before the stricter blocker cap. | `discoverable-commands`, `conventions` |
| Interaction & feedback | **6.5** | Competent: named reversible Library edits, persisted drafts, guarded text input and a preview before Rewind lift it above Weak. Control-heavy shortcuts, incomplete context/drag behavior, unverified external multiselection transfer, lost reading context and no undo reveal prevent Strong. KEY-03, DATA-06, DRAG-02/06 and PTR-01 cap at 6.9; timings/accessibility completeness remain unverified. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **6.8** | Serves the choose → arrange → listen task with a clear native visual structure and credible recovery code, but the incomplete menu contract is the largest constraint. This is near the top of Competent, not Exemplary with exceptions hidden. Lowest category is 4.9, so Overall’s maximum is **6.9**; 6.8 respects that cap. | `content-first`, `discoverable-commands`, `character` |

**Platform signal audit:** C below is code evidence permitted by the grader brief, in addition to screenshot/menu evidence. A current Apple Mail/Finder comparison capture was not supplied; no live side-by-side with a current Apple app is claimed. I compared the baseline with the guideline’s Mac signal definitions and opened its Things project reference. The visible foreign-signal inventory is fixed accent selection/emphasis and the dysfunctional nested numeric-form composition; behavior adds incomplete menus, Control-first app bindings and a modal playback panel. A read-only Finder comparison was attempted but Computer Use returned “Computer Use was not approved to use Finder”; no live Apple-app comparison was possible. There is no evidence of a web frame, touch wheel, hamburger, fake traffic light or web shortcut notation.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Window frame | Native | L/D 01–10; native WindowGroup/toolbar. |
| L2 Type | Native | Semantic SF Mac roles; TYPE-01/03. |
| L3 Controls | Adapted | Native widgets; nested numeric composition is defective (CTRL-04), not an imported widget toolkit. |
| L4 Menus/popovers | Native | menus.txt; native Menu/contextMenu/ShareLink. |
| L5 Shortcut notation | Adapted | KS/CON glyph notation is correct; binding choice is B3. |
| L6 Sidebar/selection | Foreign | Shallow native source list but fixed brand emphasis rather than the user’s accent; owner-approved APPEAR-02. |
| L7 Symbols | Native | Consistent SF Symbols in all supplied states. |
| L8 Settings | Native | Independent General/Automation toolbar-pane window, live settings. |
| L9 Density | Adapted | Desktop row/action sizes; form widths need repair. |
| L10 Materials/era | Native | Regular control-layer glass, semantic content, opaque accessibility fallback. |
| L11 Appearance | Adapted | Default System plus a working owner-approved Light/Dark override. |
| B1 Menu bar | Foreign | Proper order and validation, incomplete action inventory (MENU-02). |
| B2 Settings | Native | Native Settings scene and standard App-menu entry. |
| B3 Shortcuts | Foreign | Standard edits protected, but frequent custom commands systematically use Control. |
| B4 Text | Native (C) | Native fields, TextEditingCommands and interpretKeyEvents; Services execution is N/O. |
| B5 Keyboard/lists | N/O | No live FKA or clicked-list/type-selection test. |
| B6 Context menus | Adapted | Episode/Entry/subscription menus target objects; Trash objects omit theirs. Outline/focus preservation is N/O. |
| B7 Windows/state | Adapted | Independent windows and reconciled scene context, missing scroll/pane restoration. |
| B8 Drag and drop | Adapted | Real rich/private plus URL/text transfers and reversible edits; Option/destination selection gaps; public multiselection behavior is N/O. |
| B9 System integration | Adapted | Semantic Intents/Share present; Services/deep links/incoming Share missing and Spotlight deferred. |
| B10 Undo/help | Adapted | Named multistep undo and useful docs; reveal and Help Book integration incomplete. |
| B11 Footprint | N/O | No task-comparable bundle/launch/idle/scroll measurements. |

**Formula:** (7.8 + 2 × 6.9) ÷ 3 = **7.2**, then MENU-02’s 4.9 cap → **4.9**. Native/Adapted labels are not a numeric item average; the two halves use the rubric’s anchors.

**Caps applied:** Platform fit ≤4.9 (MENU-02); Interaction & feedback ≤6.9 (Keyboard / Data / Drag / Pointer majors); Color & contrast ≤6.9 (Appearance majors); Consistency & polish ≤6.9 (Controls majors). No verified Typography or TYPE-04 major cap. No stability-band cap because stability is N/O. Overall ≤4.9+2.0 = **6.9**. Owner-fixed failures remain in these calculations.

**What stands between this build and 9.0:** Complete the menu contract first, repair the field widths and text contrast, then finish restoration/undo reveal, public multiselection drag verification and destination feedback, keyboard shortcut ergonomics and modeless Now Playing. Resolve the smaller empty-state/status/help/integration gaps. Supply the required delayed-completion flows at minimum, tiled and typical widths in both appearances, five timed runs on representative hardware, and focused keyboard/assistive-input checks. A credible 9.0 needs that evidence as well as polished still frames. Even after all changeable defects are fixed, the owner-approved Appearance/Settings/bottom-bar exceptions and deferred Spotlight keep their specified category caps; 9.0 under this rubric remains incompatible with retaining those failures. They are recorded for scoring, not repeatedly proposed for reversal.

## Next step

**Target:** MENU-02, the sole verified blocker. **Root cause:** the app’s command model is only partially shared: EpisodeActionItems is reused, but DownloadIcon stateful actions and object Rename routes remain separately implemented in the Inspector/body/context menus. **Anti-pattern:** closest to *Default-menu drift* (incomplete command coverage, not a stock empty menu). The nearest contrast is **PLAT-01 — Menus are the complete command index**; BBEdit would make the menu tree authoritative, and Things would keep commands contextual to the persistent selection.

1. **Preferred candidate:** Add Cancel Download, Retry Download and Remove Download to Episode, sharing DownloadIcon’s state/action computation. Keep each item visible and dim when unavailable; preserve one download target model for Inspector and focused selection. This changes command availability, not the blue palette, pane layout or glass. Expected improvement: Platform fit’s blocker cap can lift after complete coverage verification; Interaction/Clarity improve through discoverability. Risk: an incorrectly scoped target could act on another window’s selection, so validate focus and multi-selection first.
2. **Finish the same target:** Add Rename View… and Rename Playlist… using the existing draft/open actions, and inventory the remaining body/context commands against the menu tree, including selected Subscription Open and episode/chapter-specific actions. Do not add menu items for every passive form value; cover app commands and contextual operations. This preserves the app’s compact row tools while making their command index complete.
3. **Verification before accepting:** Exercise those commands for empty/single/multiple selection, queued/transferring/stored/failed downloads and a second Library window; confirm unavailable items remain visible. Revisit MENU-02 only after every reachable app command has an equivalent. Then move to CTRL-04 and APPEAR-04; fixing menu coverage alone does not yield 9.0.

Principle: `discoverable-commands`, with `forgiveness` and `character` preserved. This is a grading deliverable: candidates were **not applied**, and no before/after improvement or iteration acceptance is claimed. All five signature elements remain unchanged.

### Capture index

The matching accessibility `.txt` export is beside each image; the exact export pair is identified by the same basename. The run’s README and menu export are the authority for what was captured. The 34a state is additional to 01–34, for **35** states / **70** PNGs.

| State | Light | Dark |
|---|---|---|
| 01-subscriptions | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/01-subscriptions.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/01-subscriptions.png) |
| 02-new-this-week | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/02-new-this-week.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/02-new-this-week.png) |
| 03-episode-inspector | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/03-episode-inspector.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/03-episode-inspector.png) |
| 04-starred | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/04-starred.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/04-starred.png) |
| 05-all-views | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/05-all-views.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/05-all-views.png) |
| 06-default-playlist | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/06-default-playlist.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/06-default-playlist.png) |
| 07-entry-inspector | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/07-entry-inspector.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/07-entry-inspector.png) |
| 08-history | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/08-history.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/08-history.png) |
| 09-listening-timeline | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/09-listening-timeline.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/09-listening-timeline.png) |
| 10-commute | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/10-commute.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/10-commute.png) |
| 11-playlist-settings | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/11-playlist-settings.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/11-playlist-settings.png) |
| 12-playlist-rename | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/12-playlist-rename.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/12-playlist-rename.png) |
| 13-new-playlist | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/13-new-playlist.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/13-new-playlist.png) |
| 14-trash | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/14-trash.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/14-trash.png) |
| 15-search-rice | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/15-search-rice.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/15-search-rice.png) |
| 16-edit-view | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/16-edit-view.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/16-edit-view.png) |
| 17-new-view | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/17-new-view.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/17-new-view.png) |
| 18-podcast-market-hours | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/18-podcast-market-hours.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/18-podcast-market-hours.png) |
| 19-description-expanded | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/19-description-expanded.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/19-description-expanded.png) |
| 20-unsubscribe-armed | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/20-unsubscribe-armed.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/20-unsubscribe-armed.png) |
| 21-unsubscribe-disarmed | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/21-unsubscribe-disarmed.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/21-unsubscribe-disarmed.png) |
| 22-subscription-settings | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/22-subscription-settings.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/22-subscription-settings.png) |
| 23-add-to-playlist | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/23-add-to-playlist.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/23-add-to-playlist.png) |
| 24-add-podcasts | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/24-add-podcasts.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/24-add-podcasts.png) |
| 25-download-rules | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/25-download-rules.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/25-download-rules.png) |
| 26-now-playing | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/26-now-playing.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/26-now-playing.png) |
| 27-settings-general-top | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/27-settings-general-top.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/27-settings-general-top.png) |
| 28-settings-general-middle | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/28-settings-general-middle.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/28-settings-general-middle.png) |
| 29-settings-general-bottom | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/29-settings-general-bottom.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/29-settings-general-bottom.png) |
| 30-settings-automation | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/30-settings-automation.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/30-settings-automation.png) |
| 31-listening-stats | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/31-listening-stats.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/31-listening-stats.png) |
| 32-getting-started | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/32-getting-started.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/32-getting-started.png) |
| 33-multi-selection | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/33-multi-selection.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/33-multi-selection.png) |
| 34-rewind-summary | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/34-rewind-summary.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/34-rewind-summary.png) |
| 34a-timeline-rewind-button | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/light/34a-timeline-rewind-button.png) | [PNG](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/dark/34a-timeline-rewind-button.png) |

### Source index

| Key | File |
|---|---|
| W | [MacWindow.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacWindow.swift) |
| EC | [EpisodeEditingViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift) |
| LC | [LibraryCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/LibraryCommands.swift) |
| PC | [PlaybackCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaybackCommands.swift) |
| KS | [KeyboardShortcuts.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift) |
| PS | [PlaylistSettingsViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift) |
| PL | [PlaylistContentView.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaylistContentView.swift) |
| PO | [PodcastScreens.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PodcastScreens.swift) |
| I | [EpisodeInspector.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/EpisodeInspector.swift) |
| DL | [DownloadViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/DownloadViews.swift) |
| SET | [LibrarySettingsScreens.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift) |
| CON | [ConnectionViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ConnectionViews.swift) |
| R | [WindowRestoration.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/WindowRestoration.swift) |
| TR | [EpisodeTransfer.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/EpisodeTransfer.swift) |
| DROP | [LibraryDrops.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/LibraryDrops.swift) |
| ED | [PlaylistEditingModel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift) |
| LE | [LibraryEditingModel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/LibraryEditingModel.swift) |
| GS | [GeneralSettingsEdits.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift) |
| A | [MacAppearance.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacAppearance.swift) |
| G | [MacGlass.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacGlass.swift) |
| TS | [MacTextSize.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/MacTextSize.swift) |
| CP | [ContentSizedPanel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ContentSizedPanel.swift) |
| PV | [PlayerViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/PlayerViews.swift) |
| SC | [SelectionCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/SelectionCommands.swift) |
| SH | [ShareLinks.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListUI/ShareLinks.swift) |

Additional sources: [PodListMac.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListMac/PodListMac.swift), [AppIntents.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/Sources/PodListMac/AppIntents.swift), [build-mac-app.sh](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-a43145c6-c6fdc0d1a36992ac/apps/apple/scripts/build-mac-app.sh), [tour README](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/README.md), [menu export](/Users/sarvagnan/Documents/podlist-grading/mac-round-2/menus.txt), [Things reference image](/Users/sarvagnan/Documents/UI_Guidelines/examples/screenshots/things/02-project-headings.png).
