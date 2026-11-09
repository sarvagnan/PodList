# PodList Android phone — independent UI grade, round 1 (Codex)

## Frame

- **Task:** Find Episodes through Views/Search or Subscriptions, add them to Playlists, and listen while preserving each Entry’s place.
- **Target:** Android **phone**, compact window only. Tablet/foldable additions and desktop/macOS/web checklists are out of scope.
- **Posture:** A focused sovereign phone app with background listening; quick repeated browsing and transport interactions.
- **Audience:** Newcomers becoming perpetual intermediates, including people starting without a server.
- **Nearest exemplar:** Things for calm collection/detail hierarchy and forgiveness; Android gallery Niagara for aligned, readable lists and BuzzKill for consequence-oriented explanations. Their published grades are calibration, not evidence that PodList behaves like them.
- **Character:** (owner-fixed) native Material 3 and blue `#2b50c8` with a dark theme; (owner-fixed) Views/Playlists/Library bottom destinations; (owner-fixed) one-field Add podcasts and one-list View editor; (owner-fixed) Rewind summary sheet and paused-current-Entry mini player on relaunch; domain-specific Views, Entries and independent Playlist Positions.

**Owner decisions retained:** The above, plus OPML import/export in Settings. The Android design’s artwork-led, name-free player and separate tab stacks are graded on their implementation, not proposed for replacement. All requested screens are in scope, including Download Rules and code-only populated stats/secondary player states. No earlier PodList grades or UI-GRADE.md work lists were read.

**Baseline and evidence:** Commit `456f1925a70f4eb6de1f0bb8cfcc3014cde04ff3`; working directory verified with `pwd`. The supplied capture README identifies a Pixel 10 Pro XL profile, Android 16, 1344×2992 raster, compact window, demo-server fixtures; captures 40–43 cover first run/Standalone. The README does not establish density, so no screenshot pixels were converted to dp. Default code values are cited in dp/sp directly.

Capture root: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade/`. Screenshot/snapshot names below are relative to that root. `light`, `dark`, and light `font200` tours were inspected; accessibility snapshots supplement the images, and code resolves implementation questions. Snapshot `[truncated]` preview markers alone are **not** treated as visible clipping. Some “-bottom” images repeat the starting viewport; they do not prove that all content was reached. All app Kotlin filenames below are relative to `apps/android/app/src/main/kotlin/app/podlist/`, unless another path is given. Contrast ratios use sRGB relative luminance from source colors, not guessed screenshot antialias pixels.

Guide: local `~/Documents/UI_Guidelines/README.md`, `CRITIQUE.md`, core checklist, Android Phone signals, rubric, principles, anti-patterns, gallery and published Android grades. Compared visually with Niagara home, BuzzKill picker and Google Calendar’s published Material controls. Calendar’s tablet pane arrangement was **not** imported as a phone requirement; the available Google reference predates its redesign and cannot establish current phone behavior.

## Flows

**Tasks inspected:** first run → Standalone/connect → Getting started; View → edit condition → count/Undo; Library → Search → Save as View; Episode → Add sheet → Playlist → Entries/History/Timeline → Rewind; Library → Subscription → settings/Download Rule → multi-selection; mini player → Now Playing → Episode/Chapters/Entries; Settings → OPML/stats/server.

**Tasks run:** none, as instructed. No device/emulator was driven. Supplied images show settled states at one compact portrait width, in light, dark and light at 200% text. They are not a scripted transition strip. **Timed runs/device:** none; the capture device is identified above, but no latency or frame-rate samples accompany it. **Script location / measurements file / flow screenshot strips:** none supplied or created. Contact sheets used only for inspection live in the requested `scratchpad/grade-android-1-codex/` directory.

**Flow failures:** none asserted from unmeasured transitions. FLOW-01/02/04/06 remain N/O; FLOW-03 has permitted code evidence, FLOW-07 has cross-screen placement evidence, FLOW-05 is N/A. **Stability sub-score: N/O** for every appearance. Predicted movement from a conditional banner is not scored as a measured flow failure.

## Cross-screen inventory

Notation: **none** means no separate surface implemented/observed; **N/O** means the evidence does not settle it. “Global” is the shared sync banner under the app bar: neutral Syncing/offline text with Retry, error-container Sync error with Retry. “Snackbar” is the shared inverse-surface host above the mini player/navigation, dark/inverse surface with text and optional tinted Undo. Forms use local error-colored text. C-only states are explicitly marked.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | No separate save success; live list/count | Global | none | Snackbar after delete (C) | Body “No Views yet” / “No Episodes match this View”; neutral, no next-step action | Global; local data retained | Root + top trailing; row Add/Play trailing | Top hint; View conditions/count above rows |
| View editor / Create View | Pinned “N Episodes match”, neutral | Range/name text at field/list/sheet; error color (C) | Condition sheet, title+Done at top | Persistent pinned Undo; backward only | Any values explicit | none | Autosave; bottom pinned Done | Conditions grouped with “Show Episodes where” / “Then” |
| Search / Save as View | Navigation to created View (C) | Name field error in naming dialog (C); global | Name dialog Cancel/Save as a View (C) | No created-View inverse | “No Episodes match this View”; no clear/edit action | Global | Save as a View below labeled query | Search scope stated on Library entry |
| Episode detail | Played/Star/download state changes in place (C) | Download state+Retry inline; global; transport failure in expanded player (C) | Add sheet; Download cancellation inline | Direct Played/Star changes have none; Add snackbar | In-playlist and Chapters sections have neutral explanatory text | Global | Play Now/Add row beneath metadata; secondary state actions below | Section names; no show-note link/open/copy support |
| Playlists / Entries | Add/move/delete snackbar (C; add screenshot 51) | Global | Add sheet; delete AlertDialog (C) | Snackbar only | “No Entries…”/no Cursor in body; no Find Episodes route | Global | Root + top trailing; row Add/Play/Entry actions | Playlist hint and active/count/Clear on Played summary |
| History / Listening Timeline | Rewind snackbar and return to Entries (C) | Global | Rewind summary sheet with Cancel/Rewind footer | Snackbar after Rewind (C) | Neutral “No Episodes finished…” / “No listening…” | Global | Timeline row Rewind to here, trailing | Event type, wall-clock time and listened Position range |
| Rewind sheet | Dismissal, then Entries (C) | none | Summary sections and bottom Cancel/Rewind | Says Rewind can be undone; inverse is later snackbar | Explicit “None” for empty restored/unplayed sections | Modal scrim | Rewind filled button bottom trailing | Kept section explains retained edits/listening time |
| Playlist settings / Trash / New Playlist | Clear setting/delete/restore snackbar; create opens Playlist (C) | New/renamed Playlist inline name error (C) | Redundant Delete AlertDialog | Clear/delete/restore snackbar; rename has none | “No deleted Playlists”, neutral | Global | Toggle inline; delete text below settings; create button below field; Trash row Restore | Clear on Played and Trash retention explanations |
| Library / Subscription | Subscription list/state refresh; no separate success (C) | Global | none | none on browsing screens | No Subscriptions; each empty Download Rule group says none | Global | Root +; Add podcasts after groups; Subscription pencil | Download Rule grouping and Search/Add scope hints |
| Add podcasts | Per-result Subscribed state (C) | Single error-colored block below Find, including per-result subscribe failures (C) | none | No Subscribe inverse here | “No podcasts found. Try another name.” in error region (C) | Lookup disables its own field; other navigation remains | Find podcasts below field; Subscribe trailing per result | One persistent name/address label |
| Subscription settings / Download Rules / Select Subscriptions | Rule/override values update; bulk setting and Mark all Played snackbar (C) | Unsubscribe error inline; global (C) | Shared value sheets; Unsubscribe AlertDialog | Bulk/Mark all snackbar; direct override/rule edits none | Selection count states 0; no special empty selection-library message | Global | Pencil opens settings; named value rows; bulk rule button above options | Default names inherited value; local retention/threshold explanations |
| Settings / OPML | Export snackbar; import persistent counts and failures below OPML rows (C) | OPML persistent error+Retry near rows; global (C) | Android document picker (C) | Direct global settings none | none | Busy flag/progress near OPML rows (C) | Standard preference rows; Import/Export rows in Your podcasts | Inheritance and purpose subtitles |
| Listening stats | none | Global | none | none | Body “No listening yet. Play an Episode…”; neutral | Global | Populated chart/table toggle and day selection (C only) | About your stats (C only) |
| Welcome / Connect / Getting started | Welcome leaves to Views; persistent step completion | Address error under field (C) | Standalone/connect choice; connect action | none | Fresh starter Views and explicit empty Library | Connect owns busy state; no account wall | Standalone primary/Connect secondary; connect below address; Getting started Add button | Server optional; skippable numbered checklist, Settings reopens |
| Mini player / Now Playing / player subpages | Transport state updates, no success notice | Playback error+Retry within expanded content; global host fallback message (C) | Speed/sleep dialogs (C); Add sheet | Add/move snackbar (C); no transport undo expected | No Chapters text, empty Entries explanation (C) | Buffering label in expanded player (C); no mini-player buffering label | Fixed transport row; Episode/Chapters/Entries links below | Accessible mini-player metadata; chapter title/count and elapsed/remaining |

**Inventory mismatches / unfinished edges:**

1. **Recovery policy differs among edits:** View filters have pinned Undo; bulk settings/Clear on Played have snackbar Undo; direct global/Subscription values, rename, Star and Played lack equivalent recovery. This is DATA-04, not an invented flow movement failure.
2. **New View creation differs from New Playlist creation:** + immediately records “New View” before editing (`PodListScreens.kt:123–127`); New Playlist asks for a name first. Domain-specific autosave is retained, but the newly created View’s status is unexplained and backing out leaves a generic named View. This is a craft/clarity gap; no measured FLOW-07 failure is claimed.
3. **Errors in Add podcasts lose result locality:** a subscription failure uses the same top error block as directory lookup, while OPML and Downloads retain object-specific state. With a scrolled result list, recovery association is weak; visibility with the keyboard is N/O, and no FLOW-04 failure is invented. COPY-02 owns the proven wrong lookup diagnosis.
4. **Successful import/export feedback differs deliberately:** persistent partial import detail is warranted; brief export success may use a snackbar. This is **not** a mismatch by itself. The incomplete measurable-progress policy is CTRL-08.
5. **Empty-state completeness differs:** no-Subscriptions and stats explain how to begin; empty Views/results/Entries do not. COPY-03 owns the gap.

## Checklist

**Coverage: 71.6%** (pass 30 · fail 18 · N/O 19 · N/A 12). Computation: (30 + 18) ÷ (30 + 18 + 19) = 48/67. All 79 core IDs receive exactly one verdict below. Android Phone signals are evaluated separately, not added to the denominator. Mac-only and web-only checklists: N/A → Android phone target, excluded from counts.

**Failures by severity:** 2 blocker · 11 major · 5 minor. Each defect is counted under its owning check; repeated appearances are instances, not extra failures.

### AX-01 — blocker — Settings, Playlist settings, Select Subscriptions, Add sheet and Episode selection

**Evidence:** `light/27-select-subscriptions.txt` exports @e26/@e29/@e32 as unnamed unchecked checkboxes, separately from podcast text. `light/09-add-sheet.txt` similarly exports unnamed radio buttons; `light/50-selection.txt` has unnamed Episode checkboxes. `Selection.kt:91`, `PlaybackActions.kt:109`, `PlaylistSettingsScreen.kt:26` and `EditorComponents.kt:42` put clickable toggles/radios beside sibling labels without naming or combining the actionable semantics. The capture omits switch state/name at the settings row. This is a code-supported naming defect; live TalkBack traversal is not claimed.

**Concrete fix:** Make the entire labeled row the sole `toggleable`/`selectable` node, provide its role and checked/selected state, and set the nested Switch/Checkbox/RadioButton `onClick` to null; alternatively explicitly name each independently actionable control. Name Episode checkboxes with Episode and podcast. Verify one named announcement per option.

### DATA-01 — blocker — View editor: unfinished or invalid condition edits

**Evidence:** `ViewEditor.kt:22–35` retains the draft only with `remember(view.id)` and records only valid filters. For example, with At most = 30 minutes, entering At least = 60 minutes leaves a local invalid draft. Done disables at line 59, but the ordinary top Back route in `PodListScreens.kt:106` remains unrestricted; returning reconstructs the last saved View. There is no draft saver or safe leave decision. This follows the code; no process-death experiment was performed.

**Concrete fix:** Keep a separately saved draft keyed by View ID, including invalid date/length combinations, and restore it on return/recreation. Leave valid edits autosaving as now; when intentionally discarding a draft, make that a clear decision rather than the side effect of Back.

### DLG-01 — major — Deleting an ordinary Playlist

**Evidence:** `PlaylistSettingsScreen.kt:30–40` opens an AlertDialog before `DeletePlaylist`, although the same page promises recoverable Trash and the action already calls `changeWithUndo`. The confirmation is routine reversible deletion, not Empty Trash or irreversible loss. Unsubscribe confirmation is a distinct specified behavior and is not the target here.

**Concrete fix:** Move the Playlist directly to Trash and show its named Undo confirmation; retain the Trash recovery route.

### CTRL-04 — major — Numeric condition/download-cap editors

**Evidence:** `EditorComponents.kt:51–58` initializes with `Double.toString()` and validates exclusively with `toDoubleOrNull()`, despite a locale decimal keyboard. A locale decimal input such as `1,5` cannot be accepted. `speedSetting()` in the same file already uses NumberFormat, making the numeric policy inconsistent.

**Concrete fix:** Use locale-aware parsing that consumes the whole string, and NumberFormat for initial values; retain raw in-progress text and field-specific range/integer validation.

### CTRL-06 — major — Playlist Entry actions

**Evidence:** `PlaybackActions.kt:60–76` offers only Move up and Move down. `PodListScreens.kt:305–344` supplies Add, Play and Entry actions, and Episode detail supplies no Remove Entry command either. The specified action to remove an Entry from one Playlist has no reachable control; `Change.RemoveEntry` is used only as an inverse in AppModel/EpisodeActions, not as a user command.

**Concrete fix:** Expose “Remove from this Playlist” in Entry actions, with a named Undo. Keep the compact visible Add and Play controls and the existing move commands.

### CTRL-08 — major — OPML import in Settings, especially Standalone Device

**Evidence:** `SettingsScreen.kt:35` and `OpmlActions.kt:39–68` expose one indeterminate busy flag and final summary, without progress counts or a cancel/pause route. `apps/android/data/src/main/kotlin/app/podlist/data/LibrarySource.kt:85–91` already knows the parsed URL count and processes feeds sequentially. Feed completion progress is measurable even though each network request has unknown duration. No response-time failure is inferred.

**Concrete fix:** Report processed/total feeds and partial successes as the import proceeds. Provide Stop after current feed (or pause) that retains completed subscriptions and the remaining retry list; use indeterminate progress only for genuinely unmeasurable phases.

### DATA-04 — major — Undo/Redo across app edits

**Evidence:** `PlayerPresentation.kt:49–55` makes most inverses available only through a Long snackbar. `AppModel.kt:77–97` and `ScreenActions.kt:10–30` do not maintain an app undo/redo history; ordinary `model.edit` calls for rename/settings/Played/Star have no inverse. `ViewEditor.kt:25,58` has a local backward-only list, without Redo. The subscribe/unsubscribe pair does offer Redo, so this is not an assertion that Redo is absent everywhere.

**Concrete fix:** Keep a bounded, named undo/redo history for reversible app edits, expose a persistent reachable command, and make Ctrl+Z/Ctrl+Shift+Z work with an attached keyboard. Keep snackbar Undo as the immediate shortcut.

### DATA-06 — major — Episode multi-selection working context

**Evidence:** `Selection.kt:19–28` stores selected IDs in a plain remembered EpisodeSelection object, with no Saver or saved-state owner. This selection cannot be restored after Activity recreation/process recreation, unlike Subscription selection at line 83. Navigation and scroll use saveable scaffolding elsewhere, and playback restoration is implemented; those positives do not preserve these selected IDs.

**Concrete fix:** Save selected Episode IDs keyed by source and route, pruning only IDs no longer present. Restore selection and its contextual toolbar when the same task is recreated.

### DRAG-06 — major — Reordering Entries beyond the visible Playlist

**Evidence:** `PlaybackActions.kt:63–73` consumes the drag and accumulates a vertical float; it has no access to the LazyListState, no edge autoscroll, and no retained destination selection. Dropping computes row moves using a fixed 72 dp divisor even though Episode rows have variable height and expand with text scale. This is implementation evidence, not an observed drag run.

**Concrete fix:** Use actual item offsets and list state for reordering; autoscroll near list edges and retain/reveal the moved Entry. Preserve Move up/Move down as alternatives.

### EDIT-05 — major — Episode show notes and copying content URLs

**Evidence:** `PodListScreens.kt:390–391` converts Html.fromHtml to String and renders a plain nonselectable Text. Anchor destinations are discarded, and there is no SelectionContainer, Copy URL or share action anywhere in this presentation. The code settles that content links cannot be copied through this route; real publisher rendering is otherwise untested.

**Concrete fix:** Retain annotated link destinations with native open/copy actions, make appropriate reading text selectable, and offer the Android Sharesheet for an Episode link when available.

### TYPE-05 — major — Player skip controls at 200% text

**Evidence:** `font200/01-views.png` visibly shows the enlarged “15” and “30” colliding with their circular-arrow strokes; the defect repeats across the mini player, and `font200/08-now-playing.png` shows the same crowded large treatment. `PlayerPresentation.kt:199–205` puts scalable Text over a fixed 30/60 dp icon inside a fixed Box. Titles and most lists otherwise wrap rather than truncate.

**Concrete fix:** Use coherent skip-15/skip-30 symbols with numerals designed into the symbol artwork, keeping the accessible labels and 48 dp minimum targets; alternatively allocate an adaptive text region that cannot collide with the arrow. Do not disable user text scaling across the app.

### COPY-02 — major — Add podcasts feed lookup and malformed Standalone OPML

**Evidence:** `AddPodcastsScreen.kt:59` maps every feed-address exception, including connection or server failure, to “That address isn't a podcast feed. Check it…”. That is an incorrect diagnosis for a valid address when offline. Separately, `LibrarySource.kt:86` turns an OPML parse failure into an empty URL list and a 0/0/0 result instead of the Settings error/retry state.

**Concrete fix:** Distinguish malformed address/feed/XML from network, TLS and server errors. Keep the address/document and give an appropriate Retry; propagate OPML parse failure rather than reporting an empty successful import.

### APPEAR-04 — major — Populated Listening stats after selecting a day

**Evidence:** `ListeningStatsScreen.kt:73` renders every nonselected positive bar with `primary.copy(alpha = .34f)`. With the code-defined screen background, sRGB compositing yields light #b4bfec on #faf8ff = **1.72:1**, and dark #4a4f67 on #121318 = **2.30:1**. Both fall below the Android 3:1 requirement for the chart shapes carrying daily listening quantities. This is a calculated code-state failure, not a claim that the empty-stats screenshots show a chart. Ordinary text/primary controls pass the sampled ratios listed under Scores.

**Concrete fix:** Use an opaque semantic color or a tested alpha that leaves all meaningful bars at least 3:1 in both themes. Indicate the chosen day with a shape/outline and selected semantics, retaining the date/value label and table alternative.

### DATA-05 — minor — Undo after View/Playlist deletion and filtered-list edits

**Evidence:** `ScreenActions.kt:29–30` and AppModel undo helpers replay database changes only; they do not request a destination or scroll position. View deletion explicitly returns to the directory, but its snackbar inverse only restores the View (`ViewEditor.kt:53`). A restored item beyond the current viewport is not revealed.

**Concrete fix:** Have undo results identify the restored object and reveal/scroll to it in the appropriate list without losing unrelated input.

### DRAG-05 — minor — Entry drag feedback

**Evidence:** `PlaybackActions.kt:65–73` changes only the accumulated drag distance during the gesture. That value drives no rendering: there is no lifted row/drag image, active source treatment or insertion cue before release.

**Concrete fix:** Render the dragged Entry and a valid insertion marker during movement, clear both on cancel/drop, and visually acknowledge the resulting location.

### PTR-04 — minor — Icon-only actions throughout the phone app when a pointer is used

**Evidence:** No TooltipBox/tooltip implementation exists in the app presentation files; app-bar Create/Edit/Settings, row Add/Play and Entry actions are bare IconButtons. They have icon content descriptions, but those are not tooltips. This is a minor shared-check defect, not a request to add desktop chrome to the phone.

**Concrete fix:** Add concise Android tooltip behavior to icon-only commands, reusing their action-specific labels; keep the existing visible navigation labels.

### TYPE-08 — minor — App-authored errors and connection/transfer help

**Evidence:** `res/values/strings.xml` uses straight escaped apostrophes in `bad_feed_address`, `directory_failed`, `subscribe_failed`, `unsubscribe_failed`, `bring_over_available` and other transfer help, while nearby strings use typographic apostrophes. These are authored copy, not literal addresses or publisher text.

**Concrete fix:** Normalize authored prose to typographic apostrophes; leave literal user/server strings untouched.

### COPY-03 — minor — Empty Views/results/Playlists

**Evidence:** `PodListScreens.kt:222,276,300` and `PlaybackActions.kt:37` render “No Views yet”, “No Episodes match this View”, or “No Entries in this Playlist” without a contextual next step. Root + and the View pencil still exist, so these states are not task blockers. The product behavior explicitly asks for create/edit/find routes. `light/13-history.png` and `light/18-trash.png` are understandable neutral empties; no extra call to action is demanded for an already empty Trash.

**Concrete fix:** Add Create View, Edit conditions/Clear search, or Find Episodes beside the corresponding empty state, using the existing routes. Keep neutral History/Trash states concise.

### Complete verdict ledger

| ID | Verdict | Evidence / limit |
|---|---|---|
| FLOW-01 | N/O | No flow measurements or transition strips; separate states cannot establish ≤2 dp movement. |
| FLOW-02 | N/O | No recorded focus/scroll sequence. |
| FLOW-03 | pass | C: SearchScreen LaunchedEffect cancels obsolete searches; AddPodcastsScreen disables the submitted lookup field and subscription completion changes result state, not the input. View writes do not replace the name from a late result. This passes the late-completion input rule, not draft preservation (DATA-01). |
| FLOW-04 | N/O | Captured Rewind and snackbar controls are visible, but no keyboard-present Add/new-name/error follow-up sequence settles the whole check. |
| FLOW-05 | N/A | No paired panels in compact phone presentation. |
| FLOW-06 | N/O | Visible empty groups have messages, but the tour does not settle section shells/help visibility throughout typing and asynchronous transitions. |
| FLOW-07 | pass | S+C: New Playlist and Add podcasts put the submit action directly beneath their field; value-edit sheets use the same title/Done header. The View autosave editor has a deliberately distinct pinned count/Undo/Done footer, as specified. No same-kind primary-action placement mismatch established. |
| KEY-01 | N/O | Native controls help, but an end-to-end attached-keyboard traversal/trap audit is absent. |
| KEY-04 | N/O | No focus-order, Shift-Tab or visible keyboard-focus run. |
| KEY-06 | N/A | No custom character shortcuts to internationalize. |
| KEY-07 | N/O | No Page/Home/End/Space scroll run; stock LazyColumn alone does not settle the whole check. |
| KEY-08 | N/A | No app-specific/bare-key accelerators offered; phone design explicitly keeps its app shortcut reference web-only. |
| DLG-01 | fail | major; see finding above. |
| DLG-02 | pass | C: Named Delete/Unsubscribe titles and specific sleep/name/condition headings; consequences add useful information. |
| DLG-03 | pass | C: Cancel/Delete, Cancel/Unsubscribe, Play Next/Play Last, Done and Close use result/dismiss verbs, no Yes/No ambiguity. |
| DLG-04 | pass | C: AlertDialog/ModalBottomSheet dismiss requests are safe; Cancel changes no data. Stock dialog cancellation retained; live Escape untested. |
| DLG-05 | pass | C: Unexpected destructive defaults not present. Delete/Unsubscribe are explicitly requested and cancelable, with Trash/resubscription recovery. DLG-01 separately owns the redundant confirmation. |
| DLG-07 | pass | S+C: Sheets use Done plus native Back/dismissal, or Rewind plus Cancel; no Cancel+Done+Back triple. |
| DLG-09 | pass | C: EntryMenu DropdownMenu is anchored inside the source Box; closing it changes visibility, not work. Warnings use dialogs/inline text. |
| CTRL-02 | N/A | Flat selection controls; no checkbox hierarchy or checkbox-to-switch substitution. |
| CTRL-03 | pass | S+C: Search, names, server address, podcast name/address and NumberField use persistent OutlinedTextField labels; no secret field present. |
| CTRL-04 | fail | major; see finding above. |
| CTRL-05 | pass | C: Material buttons, clickables and switches retain stock interaction/pressed behavior. Large Now Playing transport controls fit this touch task. |
| CTRL-06 | fail | major; see finding above. |
| CTRL-07 | pass | S+C: Search the Library and its hint explicitly name Episode-title/podcast/show-note scope; directory lookup is separately Add podcasts. No displayed search history. |
| CTRL-08 | fail | major; see finding above. |
| LIST-01 | N/A | → Android clause: content feeds/lists, not columnar hierarchical/tabular data. Stats table has headings and two aligned values. |
| LIST-02 | pass | S: Views, Playlists, Library and each inner content list have contextual headings; stats code uses Day and Time listened column labels. |
| LIST-03 | pass | C: View Sort exposes newest/oldest/shortest/longest choices, satisfying the Android list-without-column-headings clause. |
| LIST-04 | N/A | No dense multi-column row presentation in the phone evidence. |
| LIST-05 | N/A | No disclosure outline in this target. |
| LIST-06 | pass | S+C: Bottom destinations and Playlist tabs have selected semantics/indicators; radio choices have visible selected marks. Naming of those controls fails AX-01 separately. |
| LIST-07 | N/O | Touch routes exist; attached-keyboard focus/arrow behavior was not exercised. |
| DATA-01 | fail | blocker; see finding above. |
| DATA-04 | fail | major; see finding above. |
| DATA-05 | fail | minor; see finding above. |
| DATA-06 | fail | major; see finding above. |
| DRAG-01 | pass | C: EntryMenu supports long-press drag and Move up/Move down equivalents; no desktop file-drop requirement imposed on phone OPML picker. |
| DRAG-03 | pass | C: Reordering calls model.moveEntry, which captures an inverse and offers Undo. Availability/history breadth fails DATA-04 separately. |
| DRAG-05 | fail | minor; see finding above. |
| DRAG-06 | fail | major; see finding above. |
| PTR-03 | N/O | No attached-pointer gesture/cursor audit. |
| PTR-04 | fail | minor; see finding above. |
| APPEAR-03 | N/O | Light/dark roles exist, but Android contrast/transparency preference combinations were not captured/tested. |
| APPEAR-04 | fail | major; see finding above. |
| APPEAR-05 | N/O | Predictive translations and Material animation exist; reduced-animation behavior was not exercised or otherwise fully established. |
| APPEAR-09 | pass | S+C: One coherent 24-unit vector family; standard Back, Settings, pencil, star, download and transport meanings. Views hamburger-like symbol is weaker craft but its visible label makes no demonstrated meaning violation. |
| APPEAR-10 | pass | S: Tonal mini-player/navigation and modal scrims separate controls from the content; no action laid on arbitrary publisher imagery. |
| APPEAR-11 | N/O | No sampled loading/transition frames. |
| TYPE-02 | pass | S+C: Material Typography/system font, regular/medium weights and restrained title/body/label roles. |
| TYPE-03 | pass | S+C: System font and sp text styles scale; recurring Episode metadata uses bodySmall (12 sp). The overlaid skip numerals are the distinct TYPE-05 failure. |
| TYPE-05 | fail | major; see finding above. |
| TYPE-06 | N/O | No representative long show-note passage at its final reading position; captured brief help is not a three-line reading measure sample. |
| TYPE-07 | pass | S+C: Only short NOW/current markers use capitals; no bold+italic or non-link underlining in authored prose. |
| TYPE-08 | fail | minor; see finding above. |
| COPY-01 | pass | S+C: Domain terms match CONTEXT; Play Now/Next/Last, Rewind, Played, Default and Download Rule maintain their intended distinction. Android input language does not import Mac “click”. |
| COPY-02 | fail | major; see finding above. |
| COPY-03 | fail | minor; see finding above. |
| COPY-04 | pass | S: Sentence-case helper/action language and deliberate capitalization of the product domain nouns are consistent by role. |
| AX-01 | fail | blocker; see finding above. |
| AX-02 | pass | S+C: Played/Unplayed/In progress/Starred text, check/radio marks, selected tab underline and error wording supplement color. |
| AX-04 | N/O | Discrete move commands and Compose long-click semantics exist, but complete Switch Access/Voice Access operation is not settled. |
| AX-05 | N/O | Playback has visual controls/status; equivalent critical information in real publisher audio is outside this fixture tour. |
| START-01 | N/O | Startup placeholders and local reads exist, but prompt startup/unrelated-work availability require a launch flow. |
| START-02 | pass | S+C: Welcome permits Standalone use; GettingStarted Hide persists in DB metadata and Settings reopens it with completed steps retained. |
| START-03 | pass | S+C: Getting started teaches Views, adding podcasts and Playlists in context and can be hidden; default/inherited settings include useful local explanations. |
| START-04 | pass | C: Manifest asks for network/foreground-service/wake permissions; no launch-time dangerous-permission wall. OPML uses activity-result document pickers, not broad storage access. |
| START-05 | N/A | No runtime permission request/purpose prompt in this build; normal/foreground-service permissions and SAF document pickers only. |
| START-06 | pass | S+C: Start on this phone works without server/account; connection is optional and deferred. No proprietary auth form asserted. |
| START-07 | N/A | No account creation offered. |
| EDIT-02 | pass | C: Material OutlinedTextField uses native Compose text editing; no key interception or clipboard replacement implementation. |
| EDIT-05 | fail | major; see finding above. |
| WIN-03 | N/O | Only one compact portrait width. Smaller/landscape phone windows and IME layouts not exercised; no tablet/foldable requirements imported. |
| TOOL-06 | N/A | No hideable app toolbar/panel. |
| SIDE-03 | N/A | No compact-phone sidebar or hidden peer pane. |
| SIDE-04 | N/A | No adjacent navigation/detail panes in the compact phone target. |
| SET-01 | pass | S+C: App settings collect global playback, stats, OPML, Trash retention, server and help; Playlist/Subscription settings remain on their objects, player speed remains Episode-local. |
| RESP-01 | N/O | No five-run timed samples or p75 response measurements. |
| FOOT-02 | N/O | No frame timing or representative long-list scrolling run. |

**N/O:** FLOW-01, FLOW-02, FLOW-04, FLOW-06, KEY-01, KEY-04, KEY-07, LIST-07, PTR-03, APPEAR-03, APPEAR-05, APPEAR-11, TYPE-06, AX-04, AX-05, START-01, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, KEY-06, KEY-08, CTRL-02, LIST-01, LIST-04, LIST-05, START-05, START-07, TOOL-06, SIDE-03, SIDE-04. These are feature/target exclusions explained in the ledger; none conceal a failed parent.

### Android Phone platform signals

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native | Three labeled bottom destinations, selected state, root titles and trailing Create/Settings, Up on inner screens. Actions are not mixed into destination tabs. |
| L2 Visual language | Native | Compose Material 3 tonal surfaces, buttons, tabs, radio/checkbox controls, snackbars and contextual sheets are coherent. Accent and artwork-led player preserve the owner’s character. |
| L3 Density, text and system frame | Foreign in text-scaling detail; otherwise native evidence | dp/sp implementation, explicit 48 dp row/player commands, 12 sp bodySmall, enableEdgeToEdge, safeDrawing/IME handling in many forms. TYPE-05 breaks the 200% transport treatment. Populated stats code allocates 30 adjacent day hit areas across one compact row (`ListeningStatsScreen.kt:70–77`), so individual chart targets cannot each reach 48 dp; its table alternative is useful. IME edge cases and other phone widths remain N/O. No penalty for lacking tablet rails or fold handling. |
| B1 System navigation | Native implementation; runtime N/O | NavigableListDetailPaneScaffold with PopLatest, per-tab saveable state holders, enabled predictive-Back manifest callback, player PredictiveBackHandler and modal dismissal code. Welcome/selection Back handlers exist. Cancellation animation and complete event ordering were not run, so “predictive Back works perfectly” is not claimed. |
| B2 Preferences and access | Foreign at accessibility detail; otherwise native evidence | System dark/light selection and scalable Material Typography work in the supplied appearances. AX-01 naming failures and TYPE-05 remain. No in-app language conflicts; resources and RTL support exist. There is no explicit Light/Dark/System override selector, so the full preference signal is not met; the owner-fixed system-following palette is retained. Live TalkBack and alternate languages remain unverified. |
| B3 System surfaces and lifecycle | Foreign in confirmed work-preservation/copy paths; partial native integration | SAF OpenDocument/CreateDocument, download NotificationChannel, MediaLibraryService, WorkManager and static launcher shortcuts are implemented. Episode show notes lose copyable links and no Episode Sharesheet action is implemented (EDIT-05); invalid View drafts and Episode selection are not restored (DATA-01/06). Other process-restoration paths, media notification/lock-screen controls and actual file/shortcut/Auto/Bluetooth behavior remain N/O. Optional widgets are not treated as mandatory. |

**Looks 7.6 · Behaves 5.8 (code + captures; runtime gaps above).** Uncapped Platform fit = (7.6 + 2 × 5.8) ÷ 3 = **6.4**. DLG-01 and EDIT-05 impose a 6.9 cap, so the result remains **6.4**. This is not a looks-only score: observable behavior is grounded in code, and untested subclaims stay N/O. No imported iOS/desktop visual idiom was established; the Foreign verdicts are specific broken Android expectations.

## Scores

One set of scores covers light and dark: both preserve the same hierarchy and geometry, and ordinary text passes in both sampled palettes. The code-only populated chart has a contrast failure in both themes. Font200 weaknesses are included in the app-level score. **Strong** means 7.0–8.9, **Competent** 5.0–6.9, **Weak** 3.0–4.9. A score above a capped category’s limit is not awarded on the strength of its prettier screens.

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **6.6** | Competent, near Strong: system scale separates Episode title, metadata and state, and titles wrap. Fixed arrow/scalable-number overlay fails at 200%; TYPE-05 caps at 6.9. Small default metadata and highly compressed trailing settings values keep the work from exemplary craft. | hierarchy, craft, adaptability |
| Hierarchy | **7.6** | Strong: clear collection → content → detail, standard app bars, labeled bottom destinations, blue transport emphasis. Episode detail’s Play Now/Add share the same weak text-button treatment as secondary actions; its large Artwork repeats a small Artwork immediately below. In Timeline, repeated Rewind buttons consume priority and narrow the event text at 200%. | content-first, hierarchy |
| Spacing & density | **7.0** | Just Strong: shared 16 dp content edges and 48 dp commands, calm names lists and stable player region. Three trailing 48 dp Entry commands plus Artwork/padding reduce title width, causing tall, sparse rows at 200%. Timeline’s trailing button has the same cost. Default settings values are detached at the far edge; populated stats’ 30 narrow targets need a more deliberate touch design. | craft, hierarchy, conventions |
| Color & contrast | **6.8** | Competent, near Strong: deliberate blue role mapping, subdued chrome and independently toned dark surfaces; ordinary text/primary contrast is strong (light primary 6.46:1, secondary text 8.86:1, Played text 6.10:1; dark 10.93/10.89/10.88:1; white on blue 6.81:1). However, code-defined nonselected stats bars measure 1.72:1 light and 2.30:1 dark: APPEAR-04 caps at 6.9. Contrast-preference variants are N/O. No penalty for owner-fixed blue or absence of dynamic wallpaper color. | color-restraint, accessibility |
| Iconography | **7.1** | Just Strong: coherent vectors with familiar Back/Edit/Settings/Star/Download and labeled tabs. Hamburger-like Views and dense Entry-actions glyphs are less immediate than the neighboring symbols; skip-number overlays lose optical integrity at 200%. Tooltip omission also weakens discoverability, without inventing missing labels on every icon button. | conventions, craft |
| Consistency & polish | **6.3** (stability **N/O**; partial: no flow run) | Competent: shared rows, app bars, editors, player and themes form a consistent baseline. Recovery/empty-state inventory is uneven; numeric fields are not locale-correct and import progress is generic. CTRL-04/06/08 cap at 6.9. No flow-derived band limit is applied without measurements. | conventions, craft, stability |
| Clarity | **6.6** | Competent, near Strong: strong domain vocabulary and local inherited-setting explanations; explicit Rewind summary makes consequences legible. Wrong feed-address error classification and malformed OPML feedback fail COPY-02 (cap 6.9). Generic new-View creation state, actionless empties and undisplayed sleep-timer details require exploration. | plain-language, feedback |
| Platform fit | **6.4** | Competent: Looks 7.6, Behaves 5.8, weighted result 6.4. Native phone navigation, Material components and platform integration carry the main path; draft/selection/accessibility/share gaps remain. Code-informed behavior, with explicit N/O runtime limits. DLG-01/EDIT-05 cap at 6.9. | conventions, discoverable-commands, stability |
| Interaction & feedback | **4.4** | Weak: useful snackbar inverses, discrete reorder commands, local-first persistence, paused restoration and skippable setup exceed Broken. AX-01 and DATA-01 cap at 4.9; missing persistent multistep Undo/Redo, selection restoration and drag feedback/autoscroll keep it below the top of Weak. Response times and live assistive operation are N/O, not assumed failures. | accessibility, forgiveness, direct-manipulation, feedback |
| **Overall** | **6.4** | Competent: a recognizable, usable native listening app in the evidenced main path, with good light/dark foundations. Accessibility naming and draft safety hold it down most. This is a holistic judgment, **not an arithmetic category average**; 6.4 exactly respects lowest category 4.4 + 2.0. Coverage is 71.6%, so no claim of complete behavioral validation accompanies the number. | content-first, conventions, forgiveness, craft |

**What stands between this build and 9.0:** first remove the scored caps, especially the two blockers. Merely addressing screenshots cannot reach 9.0 while core input/recovery failures remain. Then make Episode rows preserve usable text width beside their actions, establish one purposeful primary-action treatment in Episode detail, refine the skip symbols at every text scale, and make state/error/recovery affordances equally complete on every screen. Populated stats need direct capture at 100% and 200%, legible/adaptive period tiles, chart bars with at least 3:1 contrast, usable day selection and table parity. Show notes need real structured reading/link treatment. The active sleep timer should expose its duration/end condition and remaining state rather than only “Sleep timer set”. These are concrete craft improvements inside the existing design, not requests to replace its character. Timed flows, keyboard/assistive runs and phone lifecycle/size coverage are evidence needed before an exemplary whole-app claim, not presumed defects.

## Next step

**Target:** AX-01, the blocker affecting settings/selection operation. Among the blocker tie, it is closest to repeatedly choosing what to listen to and how to store it; DATA-01 follows immediately.

**Anti-pattern:** No catalog label exactly covers the split Compose toggle semantics. Do not relabel this as a Mac-specific “web-ism”. Nearest contrasts: ICON-03 (readable action names), INTER-04 (reversible actions) and INTER-05 (recovery without a perfect answer).

**Root cause:** The implementation places interactive Checkbox/RadioButton/Switch children beside text but treats visual proximity as an accessible relationship. Unnamed stateful controls and separately announced labels are the predictable result.

**Change:** Give each option/setting one semantic, named row with its native role and value; make the decorative child non-actionable. Keep a minimum 48 dp target and allow the entire label region to select/toggle. Apply the same pattern to Subscription selection, Episode selection, Add targets, generic ChoiceRows, global Volume boost and Clear on Played. Confirm names/values in an exported tree and live TalkBack before claiming the whole flow passes.

**Principle:** accessibility, recognition over recall, consistency. **Expected effect:** lift Interaction & feedback after the remaining blocker is fixed and improve Android B2. The Material controls, accent, compact player and owner-selected navigation survive. No expected visual regression; reducing duplicate focus stops should improve assistive traversal. Things/BBEdit’s relevant lesson is that each command has one clear identity and a recoverable result, not that a phone should acquire Mac menus.

**Review-only disposition:** No app code/tests/config were changed, no tests or device runs were performed, and no commit/push was made. The only repository artifact is this report; its identical copy is at the requested scratchpad root. Beads initialization was read-only; `bd prime` reported its database LOCK unavailable in this worktree. No tracking mutation or prior task/report lookup was used, consistent with the report-only scope.
