# Mac round 3 MENU-02 implementation and command audit

Reviewed the MENU-02 finding from `git show 0efdbca:docs/ui-grade/mac-round-3-codex.md`. Both named omissions are implemented. The inventory below also covers the remaining window, toolbar, context-menu, empty-state, error, Settings and sheet actions in `apps/apple/Sources/PodListUI`, and the Mac scene commands.

## Integration onto current main

Branch `t3/mac-round-3-menu-parity-2` starts at main `318cc1c` and reapplies `b3be353` without a merge commit. The six conflict resolutions preserve both the focused command routes and main's presentation/recovery behavior:

| File | Resolution |
|---|---|
| `DownloadViews.swift` | Apply keeps `macDefaultAction()`, readable secondary text and `EditingFeedback(retry: apply)`. The button, Retry and focused Apply command share one guarded `apply()` implementation; the duplicate introduced by the conflict is removed. |
| `MacWindow.swift` | OPML content keeps `inSheet: true`, Return targets Import when ready and Done otherwise, and Escape dismisses the sheet. Current Dialog → Done is published alongside those shortcuts. System sidebar sizing, selected-row contrast and every window command remain. |
| `PlaylistContentView.swift` | Rewind keeps `macDefaultAction()` and the plain failure message while the button and menu share `rewind()`. Escape cancellation and preview/busy enablement remain. |
| `PlaylistSettingsViews.swift` | Rename/Delete/Cancel Rename use shared menu handlers. Save retains Return; Done receives Return only outside rename; Escape retains its idle guard. Readable secondary styles and rename-aware Retry remain. Trash confirmation, fresh purge capability checks and focused target enablement remain. |
| `PodcastScreens.swift` | Subscription Settings keeps its contrasted default Done and Escape dismissal alongside focused Done and Mark All Played. Discovery retains Return-to-Search, readable metadata and `FailureFeedback`; page read recovery keeps the same handler. |
| `ViewEditorScreen.swift` | Save retains Return during rename; Done retains its conditional Return and `MacDefaultButtonStyle`. Cancel/Delete use shared handlers, and local Undo/Redo reconciliation and all failure feedback remain. |

Main's `MacReadableSecondaryStyle`, `MacDefaultButtonStyle`, `podListOnAccent`, `FailureMessages.swift` / `FailureOperation`, and retry/announcement implementations are retained. No UI tour source, accessibility identifier or existing control/menu label is changed.

## Blocker commands

| Menu item | Enabled target | Shared execution and safety |
|---|---|---|
| Playlist → Delete Permanently… | The focused Library window is in Trash with one selected, visible, unexpired Playlist; editing is idle and no deletion confirmation is already open. Otherwise present and dimmed. | The row and menu call the same `confirmDeletion`, then the same `deleteConfirmed` handler from the existing confirmation. Cancel clears the pending target. `PlaylistEditingModel.deletePermanently` and its fresh server `supportedOperations` check remain unchanged: unsupported servers produce the existing error without removing Trash data or queuing a purge. No cached capability is treated as authorization. |
| Podcast → Mark All Played | One visible, active Subscription selected in the focused Subscriptions list, an active Subscription on the focused Podcast page, or its focused Subscription Settings sheet; library importing/editing and State editing must be idle. Otherwise present and dimmed. | Every surface uses `SubscriptionPlayedAction.action`, which calls the existing `LibraryEditingModel.edit(.markSubscriptionPlayed(...))`. The existing concrete Episode edits and named Undo Mark Played are retained. It does not target another window, hidden Subscription, or all Subscriptions. |

The grader names exactly these two omissions under MENU-02. Its requested Podcast menu placement is retained, along with every existing menu/control title used by the UI tour.

## Complete command audit

“Existing” means an equivalent already existed; “Added” includes a newly exposed target for an existing menu item. Parameter fields, slider positions and editor choices are distinguished from discrete action commands below. Native window, text-editing, file-panel and share-panel controls retain their native menu routes.

| Surface and commands audited | Menu-bar equivalent after this change | Result / enablement |
|---|---|---|
| Sidebar, toolbar, empty states: New View, New Playlist, Add Podcasts | File → New View…, New Playlist…, Add Podcasts… | Existing; focused Library context. |
| Sidebar and All Views list: open a View | Views → Open View → named View; All Views | Added named destinations; dim without a focused Library or available Views. |
| Sidebar: open a Playlist | Playlist → Open Playlist → named Playlist | Added; focused Library and available Playlists. |
| Sidebar: Subscriptions, Search, Trash | Podcast → Subscriptions; Edit → Search Library; Playlist → Trash | Subscriptions added; others existing. Focused Library required. |
| Sidebar contexts: Open in New Window | File → Open in New Window | Existing; selected destination. |
| Toolbar, sidebar contexts and View editor: Edit, Rename, Delete View | Views → Edit View…, Rename View…, Delete View | Existing index; added sheet-local Rename/Delete handlers so the editor's draft, target and completion behavior are preserved. Default availability and busy guards remain. |
| Search: Create View…, Create View, Cancel | Views → Create View from Search…; File → Current Dialog → Create View / Cancel | Added; nonempty query, active naming flow and its saving guard. Same naming/save/cancel handlers. |
| View editor: Save rename, Cancel rename, Done, Cancel | File → Current Dialog → Save / Cancel Rename / Done / Cancel | Added; same local validation, renaming and saving conditions. |
| Toolbar, sidebar contexts and Playlist Settings: Play, Playlist Settings, Rename, Delete Playlist | Playlist → Play This Playlist, Playlist Settings…, Rename Playlist…, Delete Playlist | Existing index; sheet-local Rename/Delete now use the same handlers as sheet buttons. Default Playlist and busy guards retained. |
| Playlist header: Entries, History, Listening Timeline | Playlist → Section choices | Existing; focused Playlist context. |
| Playlist Settings and sidebar context: Clear on Played | Playlist → Clear on Played | Existing; focused Playlist, idle editor. |
| New Playlist sheet: Create Playlist, Cancel | File → Current Dialog → Create Playlist / Cancel | Added; identical name validation and busy conditions. |
| Playlist Settings: Save, Cancel Rename, Done | File → Current Dialog → Save / Cancel Rename / Done | Added; same draft and local handlers. |
| Trash row/context: Restore | Playlist → Restore | Existing; now shares the selected-visible-unexpired target resolver with permanent deletion. |
| Trash context and confirmation: Delete Permanently…, Delete Permanently, Cancel | Playlist → Delete Permanently…; File → Current Dialog → Delete Permanently / Cancel while confirmation is open | Added; same confirmation, target and unchanged capability-checked deletion implementation. |
| Timeline rows and context: Rewind to Here | Playlist → Rewind to Here… | Existing; selected eligible moment. |
| Rewind sheet: Rewind, Cancel | File → Current Dialog → Rewind / Cancel | Added; valid preview and idle editing for Rewind; same submit and dismissal handlers. |
| Episode/Entry rows, toolbar, contexts and Inspector: Play Now, queue Next/Last, destination Playlist, Add to a Playlist | Episode → corresponding Play/queue/Add commands and destination submenus | Existing index; added publisher-only Episode preparation handlers and Now Playing's own Episode target. Unsupported bulk actions remain dim for publisher-only selections. |
| Add to a Playlist sheet: Play Now, Play Next, Play Last, Cancel | File → Current Dialog → corresponding placement / Cancel | Added; same target/name validation, draft handling, busy guards and submit implementation. |
| Episode contexts and Inspector: Resume in Playlist, Play Chapter | Episode → Resume in Playlist / Play Chapter → named item | Existing; eligible membership/chapter for one selected Episode. Now Playing also supplies its own target. |
| Episode/Entry lists: Show Details; Now Playing: Episode Details | Episode → Show Episode Details | Existing; focused Episode or Now Playing's Episode. |
| Episode contexts and Inspector: Download, Cancel Download, Retry Download, Remove Download | Episode → corresponding download command | Existing; per-Episode phase eligibility. Now Playing actions now have an Episode menu target. |
| Episode contexts and Inspector: Star/Unstar, Mark Played/Unplayed | Episode → corresponding command | Existing; same editing actions and selected targets, including Now Playing. |
| Episode contexts and Inspector: Share Episode, Copy Link | Episode → Share Episode… / Copy Link | Existing; a valid URL for one selected Episode, including Now Playing. |
| Entry contexts and keyboard: Play from Here, Move Up, Move Down, Remove from Playlist | Episode → corresponding command | Existing; selected Entries in the Entries section of the focused Playlist. |
| Empty Playlist: Find Episodes; empty lists/pages: Clear Search | Edit → Search Library; View → Clear Search | Search existing; Clear Search added, dim when the focused Library's query is empty. |
| Episode tables and enlarged reading controls: sort column, direction, default order | View → Sort by → Default order / Title / Published / Length / State; Descending | Added; bindings to the focused sortable Episode table, dim elsewhere. |
| Subscription row/context: Open, Unsubscribe, Subscription Settings, Edit Download Rules | Podcast → Open Subscription, Subscribe/Unsubscribe, Subscription Settings…, Edit Download Rules… | Existing; focused selection, preserving single/multiple-selection and busy constraints. |
| Podcast page: Subscribe/Unsubscribe, Settings, Download Rules, Share, Copy Feed Address, Show/Hide Description | Podcast → corresponding commands | Existing; the same page context and handlers. |
| Subscription Settings: Mark All Played | Podcast → Mark All Played | Added; shared handler and named Undo, as above. |
| Podcast page: Refresh Episodes, Retry | Podcast → Refresh Episodes; View → Retry | Added; refresh dim while reading; Retry uses the visible failed read's handler. |
| Discovery sheet: Search, Retry, Open result, Subscribe result, Done | Podcast → Search Podcasts / Open Subscription / Subscribe; View → Retry; File → Current Dialog → Done | Added focused result selection and action publication. No result means Open/Subscribe are dim; loading/empty query disables Search; subscribed/in-flight results cannot Subscribe again. |
| Podcast page opened from discovery: Back to Library | View → Back to Library | Added; the same navigation/search-reset handler, dim elsewhere. |
| Download Rules sheet: Apply, Cancel | File → Current Dialog → Apply / Cancel | Added; same save action, dim while saving. |
| Subscription Settings sheet: Done | File → Current Dialog → Done | Added; same dismissal. |
| Main window import progress: Show Import Results, Retry Failed Imports | File → Show Import Results / Retry Failed Imports | Added; current import/result state and idle guard. |
| Settings and import sheet: Import OPML, Export OPML, Choose a File / Different File, Import selected file, Cancel selection, Retry Failed Imports, Done | File → Import OPML… / Export OPML…; OPML Import → Choose a File… / Import / Cancel Import; Retry Failed Imports; Current Dialog → Done | Import/Export existing; remaining commands added, sharing the import object's selection, progress and validation. |
| General Settings: Refresh Now | File → Refresh Library | Added; same force-refresh operation, dim while syncing. |
| Welcome and General Settings: Check and Connect; Welcome: Start on This Mac; Settings: Disconnect | File → Connection → corresponding commands | Added; focused Welcome/Settings state, input/connectivity and connecting guards. |
| General Settings: Bring Library from this Mac…, Retry interrupted bring-over | File → Connection → Bring Library from this Mac… / Retry Bring Over | Added; same offer/sync handlers, dim when unavailable or syncing. |
| Bring-over preview: Bring Over, Not Now | File → Current Dialog → Bring Over / Not Now | Added; same accept/decline handlers and preview target. |
| Automation Settings: Copy Configuration, Retry | View → Copy Configuration / Retry MCP Server | Added; focused Automation pane; MCP must be enabled, and retry requires an error. |
| Per-setting failure strips and other `FailureFeedback` error strips: Retry | View → Retry when the strip has focus; Discovery and Podcast page also publish scene-level Retry | Existing parity route retained; clears the announcement and invokes the exact supplied retry handler. Main's new download, playback and MCP start/stop recovery controls are covered by the same component. Transient recovery controls do not require independent menu commands; see the re-audit below. |
| Edit feedback: Retry failed edit / Undo / Redo | Transient recovery control; Edit → named Undo / Redo remains | Main's new Retry button and operation-specific retry dispatch are retained. Sheet retries still finish creation, rename, placement or rule application through their local completion handlers. No persistent action is introduced. |
| Getting Started: open, trailing-footer Dismiss, Add Podcasts | Help → Getting Started; View → Dismiss Getting Started; File → Add Podcasts… | Open/Dismiss added; Add existing. Dismiss invokes the same `showGettingStarted = false` handler. Settings' sheet retains Return-to-Dismiss and Escape dismissal. A native Getting Started window permits opening it from the menu even when the introduction is not visible in Library. |
| Settings: Listening Stats; Stats: Show Daily Table | Window → Listening Stats; View → Show Daily Table | Added; open requires a Library; table toggle belongs only to the focused Stats window. |
| Player bar and Now Playing: Play/Pause, back 15s, forward 30s | Controls → existing contextual Play/Pause and skip items; explicit Resume Playback / Pause Playback | Explicit transport commands added so an Episode selection does not hide the currently playing Episode's Pause action. Display/playback availability applies. |
| Player seek slider: arbitrary position | Controls → Go to Time…; File → Current Dialog → Go / Cancel | Added exact-position route through `PlaybackController.seek`; positive duration required, input must be within duration, and switching Episodes invalidates the dialog target. |
| Player bar: artwork/Now Playing, Active Playlist | Controls → Now Playing / Open Active Playlist | Existing; focused window routes and playback availability. |
| Now Playing: Previous/Next Chapter, click a specific Chapter | Controls → Previous Chapter / Next Chapter / Go to Chapter → named Chapter | Previous/Next existing; direct chapter seek added through the same `seek` implementation. |
| Now Playing: Back to Now Playing, playback Retry, Done | Controls → Back to Now Playing / Retry Playback; File → Current Dialog → Done (also native File → Close) | Added; same detail-reset, play and window-dismiss handlers; state-based dimming. |
| Edit feedback in windows and sheets: named Undo / Redo | Edit → named Undo / Redo | Existing index; added focused local overrides for editor draft reconciliation. Editable text continues to use its native Undo manager first. |
| Inspector and sidebar toolbar toggles; text size controls | View → Show/Hide Inspector, Show/Hide Sidebar, Bigger/Smaller/Actual Size | Existing; native/focused bindings. |
| General/Automation Settings values; Subscription overrides/threshold; Download Rule mode/cap; View filter/date/number/sort inputs; Playlist name/target | App → Settings…, Podcast → Subscription Settings… / Edit Download Rules…, Views → Edit View…, Playlist → Playlist Settings…, File/Episode creation and Add commands | Parameter inputs reached through their indexed editor/Settings commands. Their explicit commits, cancellations, retries and destructive actions are indexed separately above. No duplicate top-level command per field value. |
| Text selection, Copy/Paste/Select All, drag/drop; file panels; native share services; system window/app commands; Help | Native Edit, File Import/Add, Episode queue/reorder commands, Share, Window, App and Help menus | Existing native equivalents; domain drag operations have queue/Add/reorder counterparts. No custom replacement of text, file or system panel commands. |

**Remaining persistent discrete action commands without a menu-bar equivalent: none found in this source audit.** The generic registry in `MenuCommandActions.swift` keeps supplemental commands present and dimmed rather than removing unavailable items. Focused scene keys are separated by surface so an import/editor sheet can publish its local operations without replacing another window's selection. No live menu export or visual grade is claimed.

### Re-audit after integration

Re-enumerated `Button`, `ShareLink` and `Link` call sites across the merged `PodListUI` sources and checked the Mac scenes/command declarations against the inventory above. Compared main's changes since `b3be353`'s parent to identify new controls and changed handlers, including `FailureFeedback`, `EditingFeedback`, Download status, Automation Settings, per-setting errors, Getting Started, and every conflicted sheet.

Retry is a transient recovery affordance: it appears only for a failed operation, repeats that operation against its retained target/draft, and disappears after recovery. It adds no independently invocable Library action. Therefore a separate menu item for each failure strip or failed edit/Undo/Redo is unnecessary. The existing generic focused View → Retry and explicit download/playback/import/MCP retry commands remain available where published; the audit does not claim every transient edit retry has a menu equivalent. Main's MCP stop-failure Retry also remains usable when MCP is disabled; Retry MCP Server continues to index enabled-server startup recovery.

Getting Started Dismiss is a persistent surface action, so its menu equivalent is retained even after main moved the button to the trailing footer. The new Go to Time sheet keeps Return-to-Go, Escape-to-Cancel, validation and focused dialog actions. No additional persistent command gaps were found, and no tour labels were renamed.

## Validation

- Required Swift command, run from `apps/apple`:
  `export CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache" SWIFTPM_MODULECACHE_OVERRIDE="$PWD/.build/module-cache"; swift test --scratch-path .build --disable-sandbox --cache-path .build/cache --config-path .build/config --security-path .build/security`.
  Passed on the first run: 263 tests (176 UI, 29 domain, 58 data). `defaultActionsRenderReadableLabelsOnTheBrandFill` passed on its first invocation: **0 failures in 1 run; no rerun needed**. The test process used sandbox expansion for the existing MCP Unix-socket tests and macOS type services.
- `scripts/build-mac-app.sh`: passed; app bundle, embedded MCP executable, App Intents extraction and signing succeed (13 intents, 2 entities, 4 shortcuts).
- `xcodebuild build-for-testing -project PodListUITour.xcodeproj -scheme PodListUITour -derivedDataPath .build/ui-tour-derived -destination 'platform=macOS'`: passed (`TEST BUILD SUCCEEDED`).
- `git diff --check`: passed.
- Main's contrast/style and keyboard modifier occurrence counts are retained in every changed source file; manual hunk review confirms the shared handlers preserve their semantics. The UI tour and Xcode project have no diff from `318cc1c`.
- New regression coverage checks selected/visible/unexpired Trash eligibility, independent window selections, busy/unsubscribed/nil Subscription rejection, one-Subscription bulk Played changes, and named Undo preserving other Subscriptions.
- Existing connected-deletion regression verifies a fresh capability check rejects an old server without changing Trash/outbox/history, then succeeds after `supportedOperations` advertises `PurgePlaylist`. Existing standalone purge and domain/data safety tests remain passing.
- This sandbox has no screen. No application launch, UI tour execution, multiwindow UI inspection, Help search interaction or new screenshots were attempted. These results establish compilation, model behavior and source routing; live focused-menu behavior remains for the screen-enabled grading run.

Branch: `t3/mac-round-3-menu-parity-2`, based on `318cc1c`. The implementation commit contains this report and has the requested co-author trailer. No merge or push is performed.
