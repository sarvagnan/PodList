# PodList — Android phone UI grade, round 5 (Codex)

Independent review of commit `9c7713d`, 10 November 2026. Earlier PodList grades and `UI-GRADE.md` were not read. No app, test or configuration changes; no device/emulator operation; no commit. Only this report is a repository change.

## Frame

- **Task:** Find Episodes in the Library through Views/Search or a Podcast page, add them to a Playlist, and listen while preserving each Playlist’s place.
- **Target:** Android phone, compact window only. Tablet, foldable and their additional signals are out of scope.
- **Posture:** Sovereign personal tool for browsing and organizing; playback continues in the background.
- **Audience:** Perpetual intermediate, with a newcomer path that does not require a server.
- **Nearest exemplar:** Things 3 for a calm personal collection, reversible edits and well-explained empty states; BBEdit for preservation of unfinished work. Android comparisons: the guide’s BuzzKill picker and Niagara plum home, plus Google Calendar’s published Android top-bar/material treatment. These are technique references, not a visual template.
- **Character:** Owner-fixed blue `#2b50c8` with separately toned dark surfaces; Views/Playlists/Library bottom navigation; name-free Artwork-and-controls player; one-list condition editor; compact podcast exploration with a pull-down description.

**Owner decisions retained:** native Material 3 and dark theme; the three bottom destinations; one Add podcasts field; one-list View editor; Rewind summary sheet; OPML in Settings; paused current Entry after relaunch; no visible podcast/Episode names in either player; Delete Playlist without confirmation and with Undo; compact Podcast header, description behind pull-down, top-bar Subscribe and green subscribed check; plain Unsubscribe confirmation, Undo afterward and remaining on the page; no shortcut reference on the phone. All are graded. DLG-01 and KEY-08 conflict with literal shared-checklist requirements and are retained failures, not redesign targets.

**Evidence key:** `Snn` means `android-grade-5/{light,dark,font200}/nn-*.png` and its matching `.txt` unless an appearance is specified. Capture root: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-5/`. Its README was read first. All 49 screenshot/snapshot pairs in each of three folders were inspected, with contact sheets for visual coverage and source inspection for behavior. Code references below are relative to the worktree; Kotlin filenames without a directory mean `apps/android/app/src/main/kotlin/app/podlist/`. Scratch derivatives and verdict data are under the requested `scratchpad/grade-android-5-codex/`.

## Flows

**Tasks reviewed as state sequences, not executed:**

| Task | Supplied states / code reviewed | Unsettled behavior |
|---|---|---|
| Start standalone, learn and add podcasts | S40 → S42/S43 → S26/S59; WelcomeScreen, GettingStarted, AddPodcastsScreen | Transition/focus timing, first network failure |
| Explore and subscribe | S59 → S60 → S61/S62 → S63 → S28; PodcastPageScreen and subscription history | Delayed completion, actual keyboard overlap, live announcement |
| Browse/Search, inspect and add an Episode | S01/S02 or S20/S21/S22 → S03 → S09/S50 | Async arrival, follow-up visibility with IME, focus continuity |
| Edit a View | S04/S05 and lower captures; ViewEditor/EditorComponents | Complete condition-sheet tour, delayed count/input concurrency |
| Organize and recover listening | S10–S19; PlaylistSettings, EntryDragging, Timeline, history code | Actual drag, delete/Undo run, full populated Trash/History |
| Listen and inspect stats | S08/S08b, S30–S35; PlayerPresentation, PlaybackActions | Playback recovery timing, chapter-rich real feeds, system media controls |
| Settings, Download Rules and OPML | S06/S07/S24/S25/S27/S32; Settings/SubscriptionSettings/OpmlActions | File-picker/import run and error recovery with IME |

**Capture conditions:** Pixel 10 Pro XL emulator profile, Android 16, 1344 × 2992 raster pixels, compact portrait window; light and dark at font scale 1.0, plus light at Android 200% text. The exact density/dp viewport was not supplied, so pixel measurements are not presented as dp. This is one phone size, not a minimum-width or rotation sweep. Fixture feeds/demo server except standalone states S40–S43.

**Tasks run:** none, as instructed. **Timed runs:** none. **Script, measurements file, transition screenshot strips:** none supplied or created. Separate before/after states are not flow measurements. FLOW-01/02/03/04, RESP-01 and the stability sub-score remain N/O. No FLOW failure is scored. Code establishes the draft/context storage omissions below; it does not prove animation quality or runtime restoration success.

Live TalkBack, physical assistive input, rotation, saved-instance-state process recreation, predictive-Back animation, actual Sharesheet/notification/lock-screen/Auto/Bluetooth/audio-focus operation, launcher shortcuts, OPML in flight and real publisher feeds remain unverified except for specific implementation facts explicitly cited. Those facts do not stand in for a successful end-to-end run.

## Cross-screen inventory

`Snackbar` means the shared bottom host above player/navigation, or hosted inside the active modal sheet; neutral inverse surface with a blue action. `Inline error` means error-colored text near its field/action, normally a polite live region. “None captured” is distinguished from a code path.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View / Search | Snackbar: View changed / Episode marked Played (C) | Global sync notice below app bar; retry (C) | Name field in Save as a View dialog (C) | Shared history icons/snackbar (C) | Inline no matches + Edit/Clear/Add (C) | None captured | Create top-trailing; row Add/Play trailing | View summary; Search the Library scope |
| View editor / New View | Shared snackbar; valid edits apply as made (C) | Field/range error inline (C) | Condition sheet, title + Done (C/S06b pattern) | Pinned footer Undo; history shortcut in sheet (C) | Matching count footer | None captured | Done bottom-trailing | All conditions listed; invalid-draft explanation |
| Episode detail | Snackbar after state/add changes (C) | Inline download status + Retry (C) | Add sheet | Shared snackbar/history | In your Playlists message when absent (C) | None captured | Filled Play now above action list | Metadata, Positions, show notes |
| Playlists / Playlist | Snackbar: Entry moved/removed (C) | Global sync notice (C) | Add sheet when requested | Shared snackbar/history | Inline no Entries + Find Episodes (C) | None captured | Create top-trailing; Entry Play trailing | Active Playlist and Clear on Played summary |
| History / Timeline | Shared snackbar after Rewind (C) | Global sync notice (C) | Rewind summary sheet | Shared snackbar/history (C) | Inline explanation + Show Entries | None captured | Event Rewind action; Show Entries in empty state | Timestamp and event kind |
| Rewind sheet | Returns to Playlist; snackbar (C) | None captured | Title + four consequence groups; Cancel/Rewind below | Offered after action (C) | Each empty consequence says None | Modal scrim | Rewind bottom-trailing | Kept changes and listening-log explanation |
| Playlist settings | Snackbar: Playlist renamed / Setting changed / Playlist deleted (C) | Name error inline (C) | None before Delete, as required | Shared snackbar; Trash recovery | Default Playlist omits rename/delete by domain rule | None captured | Live value controls; Delete in content for non-default | Clear on Played consequences; retention text (C) |
| New Playlist | Create then route to Playlist; snackbar (C) | Name error inline (C) | Explicit creation field | Undo after Create (C) | Empty named field | None | Create Playlist below field | Persistent field label |
| Trash | Snackbar: Playlist restored (C) | Global sync notice (C) | None | Shared history (C) | No deleted Playlists | None captured | Restore trailing on a trashed row (C) | Deletion date (C) |
| Library / selection | Snackbar after Download Rule edit (C) | Refresh failure beside affected podcast; global sync separately (C) | Download Rule sheet for selected Subscriptions (C) | Shared history/snackbar (C) | No Subscriptions + Add; unused rule groups say so | None captured | Add top-trailing/in empty state; batch change in contextual bar | Rule grouping and Select Subscriptions helper |
| Add podcasts | Subscribed row and shared snackbar (C) | Inline query error; named error below failed result (C) | None | Shared history/snackbar (C) | No results + alternate-name guidance (C) | None captured | Find podcasts below field; Subscribe on result | Name or feed address label |
| Podcast page | Green check plus Subscribed snackbar, S63 | Load/action errors under search; Retry for load (C) | Named Unsubscribe dialog, S28 | Shared snackbar/history after subscription change (C) | No Episodes / no matches inline (C) | Modal scrim for Unsubscribe | Subscribe/check top-trailing; row Add/Play | Author, count, pull-down description |
| Subscription settings / Download Rules | Snackbar: Setting changed / Download Rule changed (C) | Invalid cap field inline (C) | Value sheet with choices | Shared history/snackbar (C) | None | None captured | Live value choices; Mark all Played in content | Defaults/inheritance and rule consequences |
| Settings / OPML | Snackbar: OPML exported; import summary below OPML rows (C) | Inline OPML error, per-feed failure and retry (C) | Android file picker (C; not exercised) | Import history undo (C) | None | None captured | Named settings rows | Sections and brief descriptions |
| Listening stats | None needed | Global sync notice (C) | None | Not applicable to read-only stats | No listening + how to begin, S30 | None | Day controls / Show table | About your stats; labeled totals |
| Mini player / Now Playing | Visible playback state | Error-colored retry control/inline expanded error; snackbar too (C) | Speed/Sleep/Add sheets | App edit history where relevant | No mini player without current Entry (C) | None captured | Play/Pause in same central region | Spoken identity; Episode/Entries links |
| Welcome / Connect / Getting started | Usable standalone content / connection transition (C) | Server-specific inline error (C) | Optional server field | Not applicable | Starter Views and checklist, S42 | No account requirement | Start on this phone first; Connect below | Optional-server explanation; checklist + Hide |

**Inventory assessment:** shared edit confirmations and Undo placement are consistent; sheet-local hosting is an intentional adaptation that keeps feedback above a modal. OPML’s detailed persistent import summary differs appropriately from an ordinary one-action confirmation. No scored cross-screen message-placement mismatch is established without flow evidence. Default Playlist’s reduced settings are intentional domain behavior, not missing controls.

**Craft gaps visible in the inventory:** invalid/unfinished drafts have an in-editor promise but no general durable draft model; the editor’s full matching-count phrase becomes a bare number at 200%; the daily graph’s bars lack a visible magnitude scale and zero days become tiny bars. These are expanded below; they are not fabricated flow failures.

## Checklist

**Coverage: 77.9% — 48 pass · 5 fail · 15 N/O · 11 N/A.** All **79 core IDs** receive one verdict below. `(48 + 5) / (48 + 5 + 15) = 53/68`. This measures checklist coverage, not the percentage of every screen/state tested. The six Android Phone signals are assessed separately under Scores; they are not silently added to the 79-item denominator. Mac/Web-only checklists are **N/A → Android phone target**, outside that denominator.

### Failures by severity

| Finding / checklist ID | Severity | Where | Evidence and consequence | Concrete fix / owner disposition |
|---|---|---|---|---|
| **F1 · DATA-01** | **blocker** | New Playlist, also a general draft-model gap | `PlaylistSettingsScreen.kt:53–60` keeps the unsubmitted name only in `rememberSaveable`; `PodListScreens.kt:248` mounts this route outside the per-page state provider. `domain/BrowsingContext.kt:9–15` has navigation/scroll/search but no creation draft. On a genuinely fresh launch after the task is removed, the route can be restored while the typed name cannot: `PodListScreens.kt:71–77,139–145`. Android’s saved-instance-state restoration during ordinary process recreation is a different case and is **not** alleged broken. Code-backed failure; not an executed kill/relaunch trace. | Persist a draft keyed by Library/session and creation task as the name changes; restore it when the route returns, clear it only on successful creation or explicit discard. Use the same draft boundary for invalid/unfinished View edits, which otherwise live only in local saved state. Do not add a confirmation to Delete Playlist. |
| **F2 · DLG-01** | **major; owner-retained** | Podcast Unsubscribe | S28 in all three appearances and `PodcastPageScreen.kt:222–224` show a confirmation before a routine action; lines 101–111 then offer reversible subscription history. The shared rule explicitly prefers in-context feedback for routine undoable actions. | The rule-compliant alternative is direct Unsubscribe with Undo. **The owner expressly disallows that change: retain the existing plain dialog and its score cap.** No owner-approved code fix is available for this literal checklist conflict; it is excluded from the next-step target. |
| **F3 · DATA-06** | **major** | Podcast page’s search, description state and scroll position across a new launch | `PodcastPageScreen.kt:55–58` initializes query/reveal state locally and uses `rememberLazyListState()`. It never records podcast list anchors in `BrowsingState`, unlike the other main lists (`BrowsingState.kt:21–37`). A fresh Activity/task can restore the podcast route with an empty filter and the list at the top, including on the captured 500-Episode page (S60). This is a durable-context omission, not a claim that rotation fails. | Store per-feed search/reveal state and stable Episode/guid scroll anchors in browsing context; use the existing durable list-state helper with podcast-specific keys. Restore the original anchor after async rows arrive. |
| **F4 · START-05** | **major** | First download’s notification permission | `AndroidDownloads.download()` calls `requestDownloadNotifications`; `IncomingContent.kt:25–32` directly launches `POST_NOTIFICATIONS`. There is no preceding/app-inline sentence saying that notifications expose download progress and cancellation. The generic system prompt names notifications, not their benefit. | At the download entry point, explain “Allow notifications to see download progress and cancel downloads.” Keep it contextual and show the standard prompt from that action. No launch-time permission screen is needed. |
| **F5 · KEY-08** | **minor; owner-retained** | In-app shortcut discovery on the phone | `MainActivity.kt:50–54` and `HistoryActions.historyShortcuts` implement Ctrl+Z/Ctrl+Shift+Z, but the phone has no accessible in-app reference. This is a literal shared-checklist failure; it is not a claim that Android phones need desktop menu bars or tablet input chrome. | A reference would meet the literal item. **The owner requires shortcuts never to be listed on the phone: retain this deliberate omission and the minor verdict.** No score cap and no proposed phone shortcut UI. |

The blocker caps Interaction & feedback at **4.9**. DLG-01 caps Platform fit at **6.9** even though it is owner-retained. DATA-06 and START-05 also map to Interaction & feedback, already under the stronger blocker cap. KEY-08 adds no numerical cap. No other checklist failure is established.

### Every core verdict

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | **N/O** | No flow measurements of unprompted core-element movement. |
| FLOW-02 | **N/O** | No live focus/scroll trace; separate captures cannot establish transition behavior. |
| FLOW-03 | **N/O** | Input and asynchronous updates were inspected, but no delayed-completion flow establishes this across the main tasks. No stability failure is scored from a suspected race. |
| FLOW-04 | **N/O** | Shown Rewind, Add and Unsubscribe controls fit, including at 200%; keyboard-obscured follow-ups and the narrowest supported compact width were not exercised. |
| FLOW-05 | **N/A** | No peer side-by-side panels in the phone target. |
| FLOW-06 | **pass** | S20/S43 give empty Library groups content or omit them; S03 gives In your Playlists an explicit empty message; no settled empty section shell observed. Disappearing-help transitions remain outside this still-state pass. |
| FLOW-07 | **pass** | S01/S10/S20 keep create and Settings top-trailing; S04/S05 share the pinned editor footer; S06/S24 share value-row editors. New Playlist and Add podcasts are creation/search tasks, not inconsistent settings-save buttons. |
| KEY-01 | **N/O** | No attached-keyboard traversal of all controls or trap test. |
| KEY-04 | **N/O** | FocusedInputModifier requests initial input focus, but complete traversal, reverse traversal and visible focus were not observed. |
| KEY-06 | **N/A** | No nonstandard character accelerators; only conventional Ctrl+Z / Ctrl+Shift+Z. International operation itself is not claimed. |
| KEY-07 | **N/O** | No attached-keyboard scrolling run. |
| KEY-08 | **fail** | F5: Ctrl+Z/Redo exist in MainActivity.kt:50–54 and HistoryActions.kt; no in-app shortcut reference. Owner requires references to stay off the phone. Minor, retained. |
| DLG-01 | **fail** | F2: S28 and PodcastPageScreen.kt:222–224 confirm routine, undoable Unsubscribe. The owner requires this confirmation. Major, retained. |
| DLG-02 | **pass** | S28 names both Unsubscribe and the podcast; no redundant explanation. SearchScreen naming dialog identifies Save as a View. |
| DLG-03 | **pass** | Cancel / Unsubscribe and Cancel / Save as a View are concise result labels; no Yes/OK confirmation. |
| DLG-04 | **pass** | AlertDialog onDismissRequest and Cancel dismiss without mutation; Material supplies platform dismissal. Actual external-Esc and predictive animation remain unverified. |
| DLG-05 | **pass** | No unexpected destructive default established. Delete View/Playlist are deliberate error-colored commands; Unsubscribe is explicitly requested via the subscribed check and follows the owner confirmation exception in presentation. |
| DLG-07 | **pass** | EditorSheet has Done and native Back/dismissal, not simultaneous Back/Cancel/Done buttons; Rewind uses Cancel/Rewind. |
| DLG-09 | **pass** | S12 and PlaybackActions.EntryMenu put DropdownMenu inside the triggering control’s Box and close it before opening Add. Android requires source-relative opening, not an arrow. |
| CTRL-02 | **N/A** | Flat subscription/episode selection; no parent/child checkbox hierarchy. |
| CTRL-03 | **pass** | OutlinedTextField labels persist for Search, Add, server, names and numeric editors (S04/S19/S21/S26/S41; EditorComponents.NumberField). No sensitive-input field. |
| CTRL-04 | **pass** | NumberInput parses/formats using the locale; NumberField validates finite values, bounds and integer requirements inline. Names and server addresses have specific validation paths. Broad locale UI behavior is not inferred. |
| CTRL-05 | **pass** | Compose Button/IconButton/clickable/selectable provide standard interaction states. Large Now Playing playback controls are an adapted Android media affordance, not an ordinary form button arbitrarily enlarged. |
| CTRL-06 | **pass** | S02/S03/S23 expose Play/Add/Subscribe directly; S12 groups secondary Entry commands. Primary actions do not require guessing a menu. |
| CTRL-07 | **pass** | Search the Library and Search Episodes under a named podcast state the scopes; neither shows a search-history feature. |
| CTRL-08 | **pass** | SettingsScreen/OpmlActions use processed/total import progress, stop/resume/retry; DownloadAction uses byte progress where known and Cancel; lookup uses indeterminate progress. Timing is N/O under RESP-01. |
| LIST-01 | **N/A** | Phone content feeds are lists, not columnar/hierarchical records; the optional simple stats table is read-only. No outline/table-control expectation is imported from the Mac. |
| LIST-02 | **pass** | Lists have Views, Playlist, Library or podcast context; S33 sections identify statistical content. The stats table code labels Day and Time listened. |
| LIST-03 | **pass** | ViewEditor offers newest/oldest and shortest/longest choices in its Sort sheet, the Android list-without-column-headings equivalent. |
| LIST-04 | **N/A** | No dense multi-column interactive table or filename/path column. |
| LIST-05 | **N/A** | No hierarchical disclosure list. The podcast’s transient description reveal is not an outline; its relaunch state is assessed once under DATA-06. |
| LIST-06 | **pass** | S11/S13/S14 tabs, bottom destinations and S06b/S09 option choices show selected values; semantics include selected states. |
| LIST-07 | **N/O** | Touch opening/selection is present, but attached-keyboard focus and arrows were not exercised. |
| DATA-01 | **fail** | F1: NewPlaylistScreen’s unsubmitted name exists only in rememberSaveable; the durable context stores the route but no draft. A new Activity after task removal has no draft to restore. This is distinct from ordinary saved-instance-state process recreation. |
| DATA-04 | **pass** | AppModel.edit, HistoryActions, ScreenActions and reversibleEdit capture inverse edits; typing groups, Undo and Redo exist. Subscription reverse failures retain a retryable step. Actual Ctrl+Z operation is N/O under keyboard checks. |
| DATA-05 | **pass** | ScreenActions.revealChanges routes restored content into view; EntryList scrolls to the restored Entry and marks it. Subscription undo remains on the named Podcast page by owner decision. |
| DATA-06 | **fail** | F3: PodcastPageScreen.kt:55–58 uses local query/reveal state and plain rememberLazyListState rather than durable browsing anchors. Other main lists use BrowsingState.kt:21–37. |
| DRAG-01 | **pass** | EntryDragging.EntryDragHandle plus EntryMenu Move up/Move down supply drag and non-drag routes. No desktop cross-app drag contract is imposed on this phone target. |
| DRAG-03 | **pass** | AppModel.moveEntry records the inverse and exposes Undo through edit history. |
| DRAG-05 | **pass** | Code uses detectDragGestures, translates/highlights the source, draws insertion dividers and resets/release-pins on cancellation. This is a code-backed pass for the internal reorder model; gesture feel is unverified. |
| DRAG-06 | **pass** | EntryList edge loop scrolls the destination; retained Entry is highlighted and revealed after commit. No network/slow external drop is offered. |
| PTR-03 | **N/A** | Pointer affordances are outside this touch-phone audit; no custom pointer interaction is offered. Tablet input parity is out of scope. |
| PTR-04 | **pass** | ActionIcon/ActionTooltip supply action-specific PlainTooltips, including playback; text fields retain native horizontal editing/selection. Actual long-press/hover timing is unverified. |
| APPEAR-03 | **pass** | Independent LightColors/DarkColors and UiModeManager contrast listener adjust foreground/outline roles; no translucent custom controls require a transparency fallback. High-contrast pixels were not captured. |
| APPEAR-04 | **pass** | MainActivity role pairs measured: light primary text 16.27:1, secondary 8.86:1, white/accent 6.81:1; dark primary text 14.35:1, secondary 10.89:1, primary action label 7.70:1. Field outlines 4.25:1 light / 5.83:1 dark. No verified contrast failure. |
| APPEAR-05 | **N/O** | Framework animation is used, with custom predictive-back translation and list motion; reduced-motion operation was not exercised. No automatic-motion failure is invented. |
| APPEAR-09 | **pass** | S01–S63 use a coherent vector set: back, gear, pencil, plus, play, skips, Undo and OPML trays have familiar meanings. |
| APPEAR-10 | **pass** | Fields are outlined; primary playback/subscribe controls are filled; surfaces separate the player and navigation. Controls remain visually distinguishable in both themes. |
| APPEAR-11 | **N/O** | Some capture rasters contain partial chrome redraws (for example dark/S11 and font200/S50); snapshots still list the full navigation. No transition strip or measurement identifies duration/cause, so neither a coherent-frame pass nor a live rendering failure is claimed. |
| TYPE-02 | **pass** | MainActivity’s system-font scale uses Regular and Medium; no thin body text or competing font families. |
| TYPE-03 | **pass** | Body/labels are at least 12 sp with system fonts; 200% captures show scaling. Skip numerals are part of a composite icon, with full spoken labels, not fixed-scale reading text. |
| TYPE-05 | **pass** | At 200%, value rows stack, Episode actions move below text, stats tiles stack, and long Rewind content scrolls with actions outside it. Titles truncate deliberately; no essential text-scaling defect established at this captured size. |
| TYPE-06 | **pass** | About your stats uses bodySmall 12/18 sp (150% leading); three full lines in S34 are 74, 75 and 70 characters. Episode notes are short fixture text, so real publisher prose is unverified. |
| TYPE-07 | **N/A** | No app-owned all-caps passage or mixed bold-italic emphasis. Fixture artwork letters are publisher content, not UI labels. |
| TYPE-08 | **pass** | strings.xml uses curly apostrophes/quotes, …, en-dash ranges and the true minus sign in remaining time. Literal feed addresses and fixtures are exempt. |
| COPY-01 | **pass** | Play now/next/last, Entries, Played, Rewind and Download Rule retain CONTEXT vocabulary. State descriptions and actions are distinguished. Download-rule scope wording could be more precise (craft note). |
| COPY-02 | **pass** | Server/lookup/numeric/name/import failures have nearby text and recovery or Retry. No raw exception shown in inspected UI paths. |
| COPY-03 | **pass** | S13/S30/S43 and the empty View/Playlist code explain how to begin or offer a relevant action. Empty Trash has an adequate factual state without manufacturing something to restore. |
| COPY-04 | **pass** | Sentence-style commands with consistently capitalized domain nouns; button, heading and tooltip patterns agree across siblings. |
| AX-01 | **pass** | Snapshots name icon actions, radio/checkbox/switch controls, selected destinations and the seek bar. Code adds names, stateDescription, headings, merged toggle rows and error live regions. Now Playing Artwork exposes identity despite the owner’s visual omission. This is not a live TalkBack usability pass. |
| AX-02 | **pass** | Played/Unplayed/Starred text, check shapes, radio states, Now labels and selected destinations accompany color; the green subscribed control has a check and explicit accessible name. |
| AX-04 | **N/O** | Move commands, chart day buttons/table and podcast-detail accessibility action exist in code; whole-task Switch Access/voice operation was not exercised, so full compliance remains N/O. |
| AX-05 | **pass** | Play/Pause/seek and visible loading/error text accompany app playback states; no audio starts at first launch. Publisher transcript availability is outside the supplied evidence. |
| START-01 | **N/O** | Loading placeholders and local data paths exist, but prompt-launch timing and freedom to continue unrelated work were not run. |
| START-02 | **pass** | GettingStarted persists the hidden flag; Settings reopens it; first run offers Start on this phone with server setup postponed (S40/S42; GettingStarted/AppModel). |
| START-03 | **pass** | S42 teaches Views and Playlists with immediate Add; value-row help explains inheritance and Rewind explains retained changes; Hide is visible. |
| START-04 | **pass** | POST_NOTIFICATIONS request originates from first download use, guarded by a stored asked flag. Internet/network/service permissions do not cause a runtime prompt wall. |
| START-05 | **fail** | F4: IncomingContent.kt:25–32 launches the generic notification permission prompt without an app explanation of download-progress/cancel notifications. |
| START-06 | **pass** | S40 offers standalone use; no account/sign-in toll before listening. The optional server address is a connection, not account creation. |
| START-07 | **N/A** | No account-creation feature. |
| EDIT-02 | **pass** | Native Compose fields and SelectionContainer keep editing/clipboard behavior; Activity handles only otherwise-unhandled Ctrl+Z, leaving field undo to the field. |
| EDIT-05 | **pass** | EpisodeDetail uses Android ACTION_SEND/chooser with a useful Episode URL, notes are selectable, and address fields support native text copying. Actual Sharesheet invocation remains untested. |
| WIN-03 | **N/O** | Only one compact portrait profile. Smaller compact phones, landscape and rotation were not captured; medium/expanded/tablet/foldable windows are excluded by the requested target. |
| TOOL-06 | **pass** | Now Playing’s collapse control and mini-player Artwork/bar provide reciprocal visible paths in PlayerPresentation; tabs also collapse the player without stopping playback. |
| SIDE-03 | **N/A** | No phone sidebar/pane hiding feature. |
| SIDE-04 | **N/A** | No adjacent navigation/detail panes in this phone audit; bottom destination selection is covered by LIST-06. |
| SET-01 | **pass** | S06/S32 group global playback, OPML, retention, server and help in Settings; View/Playlist/Subscription settings stay with their objects. |
| RESP-01 | **N/O** | No five-run timed sample, input latency measurements or hardware-equivalent performance run. |
| FOOT-02 | **N/O** | The 500-Episode capture proves content presence, not frame-rate scrolling or freedom from hangs. |

**N/O:** FLOW-01, FLOW-02, FLOW-03, FLOW-04, KEY-01, KEY-04, KEY-07, LIST-07, APPEAR-05, APPEAR-11, AX-04, START-01, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05 (no paired panels), KEY-06 (no nonstandard character shortcuts), CTRL-02 (no hierarchical checkboxes), LIST-01 (content feeds), LIST-04 (no dense multi-column table), LIST-05 (no hierarchical disclosure list), PTR-03 (touch-phone scope), TYPE-07 (no applicable app-owned capitals/emphasis), START-07 (no account creation), SIDE-03/SIDE-04 (no phone sidebar/detail panes). No failed-parent dependents are counted as additional failures.

## Scores

One app-level set covers light and dark: no evidence supports different overall category numbers between them. The 200% set informs typography, density and adaptability; it is not averaged away. Scores use the rubric’s anchors and caps, not a mean of screenshots. Behavioral scores and Overall are **partial** because important running behaviors are N/O.

### Android Phone platform signals

**Side-by-side comparison before scoring:** the guide’s published Google Calendar Android frame has a clear title/action band, familiar icon grammar and an unobstructed system frame. PodList’s S01/S20/S24 retain that Material hierarchy; there is no imported iOS navigation, custom share overlay or 44-point touch metric in the inspected implementation. BuzzKill’s option descriptions provide a useful consequence-copy comparison; Niagara shows how one leading alignment and quiet secondary labels can make a personal collection fast to scan. Their colors, cards and launcher layout are not requirements for PodList. The local Google comparison is an older tablet capture used only for shared visual grammar; it does **not** verify a current Google phone app, tablet-fit compliance or contemporary behavior. That exact-current-phone side-by-side remains an evidence limitation.

| Phone signal | Verdict | Evidence / limit |
|---|---|---|
| L1 Navigation | **Native** | Three equal bottom destinations; Up only inside stacks; named app bars and object actions. S01/S10/S20 and DestinationStack. |
| L2 Visual language | **Native** | Consistent Material 3 roles/controls with deliberate blue seed and separately composed dark palette; coherent vectors. |
| L3 Density, text, system frame | **Adapted, partial** | Code uses dp/sp and 48-dp ActionIcons; 200% rows reflow. Insets/IME padding are present. Exact smallest-phone/landscape behavior and partial capture redraws remain unverified. |
| B1 System navigation | **Adapted, partial** | NavigableListDetailPaneScaffold, BackHandler for selection/first-run, PredictiveBackHandler for nested player/collapse, native modal dismissal; playback is not a Back action. Actual gesture animation/cancellation N/O. |
| B2 Preferences/access | **Native, partial** | System font and appearance, contrast listener, resources and RTL support; named/selected accessible controls. No forced UI-wide font scale. Live TalkBack and system-language switching N/O. |
| B3 System surfaces/lifecycle | **Foreign in a specific lifecycle corner; otherwise native implementation** | Native share chooser, document picker, channels, shortcuts and contextual first-download permission exist. New Playlist draft is not durable after task removal (F1); Podcast context is incomplete (F3). Actual system integrations N/O. |

**Looks 8.7; Behaves 7.0 (partial).** Raw Platform fit `(8.7 + 2 × 7.0) / 3 = 7.6`; **capped to 6.9 by DLG-01**. Behavior counts double. No tablet/foldable signal enters this calculation. A familiar Compose toolkit does not earn a lifecycle pass by itself.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.7** | **Strong, near Exemplary:** system Regular/Medium styles map title, option, metadata and helper roles; 12/18-sp reading text and stacked 200% settings work. The editor footer’s reduction from “4 Episodes match” to “4” loses useful visible semantics, and top-bar titles truncate at 200% (S60). A compact “4 matches” or two-line count would be more considered. | `hierarchy`, `accessibility`, `craft` |
| Hierarchy | **8.6** | **Strong:** primary Episode Play, contextual Add and restrained top actions are easy to rank; Now Playing centers controls as the owner intended. Library spends visible vertical attention on two empty Download Rule groups (S20), while stats gives a nearly empty unscaled chart substantial area. Both can explain their hierarchy more precisely without removing capability. | `content-first`, `hierarchy` |
| Spacing & density | **8.3** | **Strong:** repeated 16-dp edges, consistent dividers, 48-dp action targets and task-specific 200% reflow. The half-height Add sheet leaves a large unoccupied area between four options and bottom actions (S09); a content-sensitive height up to the agreed half-height maximum would keep the relationship tighter. Do not turn it into a desktop popup. | `craft`, `conventions`, `hierarchy` |
| Color & contrast | **9.0** | **Exemplary among verified appearances:** restrained blue, readable neutral metadata, independently toned dark surfaces, explicit green subscribed check and error roles. Measured foreground pairs exceed Android thresholds; semantic text/shapes avoid reliance on hue. No verified contrast defect. System increased-contrast behavior has code evidence, not a rendered sweep. | `color-restraint`, `accessibility` |
| Iconography | **8.8** | **Strong, near Exemplary:** one vector family, familiar action meanings, consistent optical rhythm and meaningful accessibility names/tooltips. The Views/Library/Playlist glyphs are close to abstract list/book marks and need their persistent labels; the player’s Playlist glyph is less immediately distinctive than its Play/skip controls. Refining that silhouette inside the same family would improve recognition. | `conventions`, `plain-language`, `craft` |
| Consistency & polish | **8.3 (stability N/O)** | **Strong, partial: no flow run.** Shared value rows, feedback host, field labels, selected states and designed empty/error paths are substantial finishing work. The bare large-text count, content-insensitive Add-sheet spacing, and statistically ambiguous zero-day marks remain craft gaps. Suspect partial raster redraws are unverified under APPEAR-11, not an extra penalty or hidden flow score. No stability-band cap is invented. | `craft`, `stability`, `conventions` |
| Clarity | **8.2** | **Strong:** useful domain language, explicit search scopes, inheritance labels and concrete recovery text. The stats chart has no magnitude ticks/unit/selection legend, and `coerceAtLeast(2.dp)` gives zero-listening days a visible bar; the numeric day readout/table rescue exact reading but the graph alone overstates activity. Stream help says “Never stored on this Device” even though manual downloads remain available; say “No automatic downloads.” | `plain-language`, `feedback`, `discoverable-commands` |
| Platform fit | **6.9 (partial)** | Raw 7.6 from the Phone signals above, then the **major DLG-01 cap**. Native navigation/controls/insets are strong; lifecycle gaps and unrun system behavior prevent an Exemplary claim. Owner-retained confirmation keeps this category capped regardless of visual refinement. | `conventions`, `stability`, `user-control` |
| Interaction & feedback | **4.9 (partial)** | **Weak by blocker cap**, despite a much stronger ordinary path: multi-step inverse history, Trash, drag equivalents, first-run skip, retry and local operation are implemented. **DATA-01 draft loss** is decisive; DATA-06/START-05 add major gaps. Keyboard efficiency, runtime accessibility and latency remain N/O. | `forgiveness`, `feedback`, `respect` |
| **Overall** | **6.9 (partial)** | A deliberate, visually strong Android phone app whose primary finding/listening path is legible and coherent. The unfinished-work guarantee is incomplete. **Lowest category 4.9 + 2.0 = 6.9**, the rubric’s hard ceiling; this is a holistic judgment at that ceiling, not a screenshot average. | `forgiveness`, `conventions`, `character` |

**What stands between this build and 9.0:** fix durable drafts, restore Podcast browsing context and explain the contextual permission first. Then refine the count, graph and sheet spacing and supply actual flow/timing/assistive-input/restoration evidence. Even after those repairable gaps close, **retained DLG-01 alone limits Platform fit to 6.9 and Overall to at most 8.9 under this exact rubric**. No amount of cosmetic polish can honestly yield a compliant 9.0 while that fixed decision and cap remain. This is a rubric/owner-decision constraint, not a request to reverse the decision. KEY-08 remains a deliberate minor deviation without a cap.

## Next step

**Target:** DATA-01, the blocker, before any visual refinement. **Anti-pattern:** **Save-or-lose**. **Root cause:** creation and invalid-edit drafts are scoped to a live Compose saved-state owner, while only navigation and committed domain edits enter durable storage. Returning to a route is not equivalent to recovering the person’s unfinished work.

Nearest contrast: **INTER-05, Recovery doesn’t depend on a perfect answer**. Things’ relevant lesson is reversible collection management; BBEdit’s is preserving unnamed work before Save. Copy the preservation behavior, not a Mac window, save alert or desktop shortcut surface.

| Candidate | Specific change | Principle / expected effect | Risk and character preservation |
|---|---|---|---|
| **1 — preferred** | Add a session-keyed New Playlist draft containing raw name and creation identity; persist on edits and restore before presenting the form. Clear only after successful Create or explicit discard. Extend to raw invalid View conditions so “kept here” has a durable boundary. | `forgiveness`; removes the DATA-01 cap once verified, improves Interaction & feedback and Overall. | Keep the one-field form, live View list and existing Undo; avoid auto-creating an empty Playlist. Handle stale drafts per Library and never show one server’s draft in another. |
| 2 — supporting lifecycle repair | Store per-feed Podcast filter/reveal state and guid-based scroll anchors through BrowsingContext; restore after rows load without clobbering subsequent user scrolling. | `stability`; removes DATA-06 and strengthens Phone B3. | Preserve compact header/pull-down and top-bar Subscribe; do not add a permanent description panel or new tab. |
| 3 — contextual permission copy | Place a one-sentence download-notification purpose by first download use and trigger the native permission prompt from that context. | `respect`, `plain-language`; removes START-05. | Keep standalone first run unblocked and unchanged; no tutorial or launch prompt wall. |

**Acceptance evidence still needed:** type a nonempty New Playlist name without creating, leave/remove the task, relaunch and recover the exact name; repeat for invalid View ranges. Scroll/filter a long Podcast page and recover both state and anchor after a fresh launch; separately test ordinary process recreation and rotation. Verify Undo/Redo still reverse committed edits rather than merely clearing drafts. Run the main flows in light/dark and at large text with the required delayed completions and timing samples, then TalkBack/assistive input. These are proposed checks, not tests performed in this audit.

## Log

Review only: no iteration or implementation was authorized. No code/test/config changes, acceptance claim, commit or push. The supplied capture remains the baseline. Character check: blue/dark Material treatment **kept**; three destinations **kept**; name-free player **kept**; one-field Add and one-list editor **kept**; Rewind and compact Podcast exploration **kept**; owner confirmation/shortcut decisions **kept and scored**. No comparison to earlier grading rounds was made.
