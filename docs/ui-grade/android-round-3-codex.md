# PodList — independent Android phone UI audit, round 3 (Codex)

## Frame

- **Task:** Find Episodes in a personal Library using Views/Search, place them in Playlists, and listen while preserving each Playlist’s place.
- **Target:** Android phone, compact window only. Tablet and foldable are separate targets and excluded.
- **Posture:** Sovereign personal listening/library tool, with background playback and brief foreground tasks.
- **Audience:** Newcomer progressing to perpetual intermediate.
- **Nearest exemplar:** Things 3 for calm personal-tool hierarchy, understandable state and forgiveness, not Mac conventions. Android calibration: the supplied Niagara/BuzzKill phone gallery and platform-fit grades. Their Strong scores are comparisons of craft, not a requirement to copy their appearance.
- **Character:** Owner-fixed blue #2b50c8 with independently toned dark surfaces; owner-fixed native Material 3 controls; Views/Playlists/Library destinations; name-free, artwork-led transport; precise View/Entry/Position vocabulary. All preserved in this audit.

**Owner decisions:** Retain the native Material appearance/accent and dark theme; three bottom destinations; single-field Add podcasts; one-list View editor; Rewind summary sheet; OPML in Settings; paused current Entry after relaunch; no podcast/Episode names visually in either player; immediate Delete Playlist with Undo; plain Unsubscribe confirmation followed by Undo. These are scored, not redesign proposals. The last produces the owner-retained DLG-01 failure and its cap.

**Build and independence:** HEAD `ac062d3e4ed52b3ff0d5f86b4f4282641fe6f83a`, matching the capture README. No earlier PodList grades or UI-GRADE.md work lists were read. No device/emulator was driven, no app/test/config changed, and no commit was made.

**Evidence notation:** `CAP` is `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-3/`. Capture references below are relative to CAP, and each has both `.png` and `.txt` evidence. Code filenames refer to `apps/android/app/src/main/kotlin/app/podlist/` unless another path is specified. C = source inspection; S = settled screenshot/accessibility capture, not a running transition. Read the supplied README, CRITIQUE, core checklist, rubric, Android Phone signals, Android gallery/grades, vocabulary, both design documents and ADRs 0011/0012.

## Flows

**Tasks examined:** first run → Standalone Device/connect → Getting started; Library → Add podcasts → Subscribe; Views/Search → Episode → Add → Playlist → play; View editing → live count/Undo; Playlist → settings/Trash/History/Timeline → Rewind; Subscription → Download Rules/overrides/Unsubscribe; Settings → OPML/stats; mini player → Now Playing → Episode/Chapters/Entries.

**Evidence supplied:** Pixel 10 Pro XL emulator profile, Android 16, 1344 × 2992 px, compact window; demo server except standalone/first-run captures 40–43. All 44 screen captures and accessibility snapshots in each of `light/`, `dark/`, `font200/` were considered (132 of each artifact). 200% is light appearance at system font scale 2.0. Exact runtime density is not documented, so screenshot pixels are not converted to dp; code establishes dp/sp sizes. Only this compact phone width is graded.

**Tasks run:** none by this reviewer, as requested. **Timed runs/device:** none; capture device above only. **Script/measurements/transition strips:** not supplied. Static tour images are not a measured flow run. FLOW-01/02, complete follow-up visibility under the IME, RESP-01 and transition-frame quality remain N/O. No unmeasured layout-shift or latency finding is scored. **Stability sub-score: N/O in both themes.**

Code settles parts of Back, saved-state implementation, Undo, labeling, target sizing and system integration. Rotation, actual OS process recreation, predictive-Back animation quality, live TalkBack, actual Sharesheet targets, notification/lock-screen layout, Auto/Bluetooth/audio-focus behavior, physical drag feel, OPML-in-progress layout and real feed rendering remain unobserved to the extent source cannot establish them.

## Cross-screen inventory

Cells give region/form, wording pattern and semantic color; **none** means no separate surface. Snackbar conventions below are source-established, not captured after-action transitions. Shared snackbars sit above the mini player/navigation and use inverse-surface feedback with an action label; red inline text uses the error role.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View | Snackbar, “View changed” | Top app-bar sync status + Retry sync | none | Shared snackbar/menu | Inline “No Views” + New View; no matches + Edit conditions | none | Top trailing New/Edit; Episode row Add/Play | Getting started card at top |
| New View / View editor | Snackbar after committed edit | Name-field supporting error; range error in editor/sheet, error role | Condition sheet, title + Done | Pinned footer + global menu | Pinned matching count, including zero | none | Done, pinned bottom trailing | Condition labels/values, “Draft kept” |
| Search | Snackbar on saved View | Global sync region | Named Save as a View dialog, Cancel/Save | Shared snackbar/menu | Inline no matches + Clear Search; no Subscriptions + Add | none | Search field top; Save as a View below | Scope in heading/entry row |
| Episode detail | Shared edit/download snackbar | Inline download status; player errors via shared player | Add sheet | Shared snackbar/menu | Metadata-pending text; no memberships explained | none | Filled Play now, then secondary actions | Playlist Positions, show notes |
| Playlists / Entries | Shared add/move/remove snackbar | Global sync region | Add sheet | Snackbar/menu, revealed restored Entry | Inline no Entries + Find Episodes | none | Top New/Edit; row Play/menu | Active Playlist, count, Now marker |
| Playlist settings / Trash | “Setting changed”, “Playlist deleted/restored” snackbar | Name-field supporting error | No Delete confirmation (fixed) | Shared snackbar/menu | Inline “No deleted Playlists” | none | Setting rows; Delete text; row Restore | Clear on Played/retention help |
| New Playlist | “Playlist created” snackbar | Supporting error under Name | none | Shared menu after creation | Blank labeled Name field | none | Done bottom trailing | Name validation |
| History / Timeline / Rewind | “Rewound” snackbar | Global sync region | Rewind summary sheet; Cancel/Rewind pinned below scroll content | Shared snackbar/menu | Inline no records + Entries | none | Tabs; per-event Rewind to here | Consequence groups, including “None” |
| Library / Subscription | Shared action snackbar | Sync in app bar; standalone refresh error beside podcast + Retry | none | Shared snackbar/menu | No Subscriptions plus Add; rule groups explain emptiness; no Episodes + Refresh | none | Top Add/Edit; row Episode actions | Download Rule groups; explicit Library search scope |
| Add podcasts | Result button becomes Subscribed + snackbar | **One shared red error above results, including row Subscribe failures** | none | Shared snackbar/menu | No results explanation in shared region | Input disabled while lookup pending | Find podcasts below field; Subscribe per row | One persistent name/feed-address label |
| Subscription settings / selection | Settings/subscription snackbar | Number/name support where relevant; Unsubscribe error beside initiating control | Plain Unsubscribe dialog, Cancel/Unsubscribe | Shared snackbar/menu | Selection count | none | Value rows; bulk Download Rule; Unsubscribe | Default inherited values + explanations |
| Settings / OPML | Export snackbar; import inline count summary | Inline OPML region, failed feed lines + Retry | System file picker, invoked in context | Shared menu/snackbar for edits/import | none | OPML disables only its own controls while busy | Playback rows; import/export; global destinations | Section labels, inheritance, import/export explanation |
| Listening stats | none | Global sync region | none | Global menu | Inline “No listening yet. Play an Episode…” | none | Chart day taps / Show table | Streak, period totals, calculation explanation |
| Welcome / Connect / bring-over | Connected destination / completion screen | Address-specific red text; bring-over inline recovery | Optional bring-over summary with Not now | none | Standalone start available | Address input disabled during check; keep-using route for transfer | Start on this phone; Check and connect; Bring it over | Optional-server explanation and migration counts |
| Mini player / Now Playing | Visible playback state | Mini Retry glyph + snackbar; expanded inline error + Retry | Speed/Sleep sheets | Shared menu | No Chapters text; nested chapter list empty text | Buffering indicator in mini, text in expanded | Transport primary; Episode/Chapters/Entries secondary | Position, current Chapter, named accessibility metadata |

**Mismatches:** Add podcasts assigns a *per-Subscription failure* to the *search form’s* error region, unlike Subscription settings and individual download/refresh errors near their object (COPY-02). Field errors, operation summaries and sync status otherwise use deliberately different scopes, not arbitrary placements. The broad “Setting changed” versus named setting/View/Playlist confirmations is coherent mechanically but less informative than action-specific history labels. No numeric stability penalty is derived from this inventory without a flow run.

## Checklist

**Coverage: 75.4%** (pass 46 · fail 6 · N/O 17 · N/A 10). Verified 52 of 69 applicable IDs; `52 / (46 + 6 + 17) × 100`.

All **79 core IDs** receive exactly one verdict below. Android Phone L/B signals are reported separately and are not invented checklist IDs or added to this denominator. Mac-only and web-only checklists are N/A → Android phone and stay outside the count. Tablet/foldable signals are N/A → requested target.

### Failures by severity

**No blocker established.** Five major failures and one minor failure:

1. **DATA-06 — major — browsing context is not durable across a fresh relaunch.** **Where:** bottom destination, nested route and list position. **Evidence (C):** PodListScreens.kt:68, 83, 93–104, 224 and 321 keep destination/navigation/list state in Compose saved-instance mechanisms; AppModel.kt:117–150 reloads connection/standalone preference, not browsing context. A fresh task without saved instance state starts at Views. This finding is about cold relaunch, not a claim that Android’s saved-instance recreation was observed failing. Playback Cursor/Position is separately persisted and restored, as required by the owner. **Concrete fix:** store last destination, stable route IDs and per-list key/offset per Library source; restore them after local data is loaded and fall back safely if an object was deleted. Do not autoplay. **Principle:** `stability`.

2. **DATA-04 — major — sheet-level Undo/Redo intercepts text editing.** **Where:** fields inside EditorSheet and the Add-to-Playlist sheet, with a hardware keyboard. **Evidence (C):** HistoryActions.kt:105–109 consumes Ctrl+Z/Ctrl+Shift+Z in `onPreviewKeyEvent` unconditionally, before a child field can handle it. EditorComponents.kt:46 installs that handler around NumberField, Mentions and Sleep input; PlayerPresentation.kt:296 also installs it around the New Playlist name. An invalid/uncommitted field edit can therefore invoke unrelated app history, or consume Undo with no app history available. MainActivity’s unhandled-key approach correctly leaves fields first; sheets bypass that protection. **Concrete fix:** route these shortcuts on the bubbling/unhandled path after the focused text field, preserving field text undo/redo; invoke app history only when text editing has not handled the event. **Principles:** `conventions`, `forgiveness`.

3. **COPY-02 — major — Subscribe errors do not identify their failed result.** **Where:** Add podcasts result list. **Evidence (C):** AddPodcastsScreen.kt:75 renders one error above LazyColumn; line 91 sets that same error for any result’s failure. Multiple result requests can run concurrently, so “Couldn’t subscribe. Try again.” neither names the podcast nor stays beside its initiating button. This is an error-association finding, not an unmeasured FLOW-04 claim. **Concrete fix:** track errors keyed by feed address; put the recovery text and Retry under the corresponding result, preserving search/lookup errors under the search field. **Principle:** `plain-language`.

4. **CTRL-08 — major — unknown-length downloads lose their in-app progress affordance.** **Where:** Episode detail → Download. **Evidence (C):** PlaybackActions.kt:72–74 renders progress only when `Transferring && total > 0`; a transferring response with unknown total gets static “Downloading…” and Cancel, with no indeterminate progress indicator. AndroidDownloads.kt:210 obtains a total that can be unknown, and tracks bytes received. The separate foreground notification’s spinner does not complete the in-app state. **Concrete fix:** retain the determinate bar when total is positive; otherwise render a labeled indeterminate bar for Transferring, retaining Cancel. **Principle:** `feedback`.

5. **DLG-01 — major — owner-retained confirmation for reversible Unsubscribe.** **Where:** Subscription settings → Unsubscribe. **Evidence (S/C):** all themes’ `28-unsubscribe`; AddPodcastsScreen.kt:115–136 shows the confirmation before the operation and `offerResubscribe` afterwards. The guide reserves alerts for essential actionable conditions or uncommon irreversible loss; this routine action has an inverse. **Disposition:** fixed by the owner; retain the plain question, Cancel/Unsubscribe and subsequent Undo. There is no app change within the fixed decision that removes this rubric violation; no removal or explanatory-copy redesign is proposed. **Principle:** `user-control`. **Cap:** Platform fit ≤6.9.

6. **COPY-01 — minor — chart help describes the wrong gesture.** **Where:** Listening stats, Last 30 days. **Evidence (S/C):** `light/33-stats-populated` (also dark/font200) says “Swipe across the chart to choose a day”; ListeningStatsScreen.kt:73–76 uses horizontalScroll to move the viewport and only `clickable { chosen = index }` to choose. A swipe need not choose anything. **Concrete fix:** say “Swipe to see more days. Tap a day for its listening time, or show the table.” Keep the table alternative. **Principle:** `plain-language`.

### Complete verdict ledger

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No measured transition strip or element-box measurements. |
| FLOW-02 | N/O | No observed focus/scroll transitions. |
| FLOW-03 | pass | AddPodcastsScreen.kt:49–68 disables the submitted field and never clears it on completion; SearchScreen.kt:36–39 cancels obsolete searches; valid View edits retain the local draft. |
| FLOW-04 | N/O | 09, 15 and 28 show visible answer controls, including at 200%; the keyboard-open Add/New Playlist follow-ups and asynchronous errors were not captured. |
| FLOW-05 | N/A | No peer side-by-side panels in the compact-phone presentation. |
| FLOW-06 | pass | Visible section headings have rows, explanatory empty text or summary content; Episode chapters are conditional. The stats chart weakness is discussed separately, not counted as an empty section heading. |
| FLOW-07 | pass | New View and New Playlist put Done at bottom trailing; settings use the same value-row → choice-sheet pattern. Add podcasts is a search/subscription task rather than another creation form. |
| KEY-01 | N/O | Standard focusable controls are promising, but complete attached-keyboard traversal, including selection and dialogs, is not established. |
| KEY-04 | N/O | FocusedInputModifier requests the expected entry field; complete traversal order and visible focus under keyboard navigation remain unobserved. |
| KEY-06 | pass | Only standard Ctrl+Z / Ctrl+Shift+Z app accelerators; no punctuation-dependent custom shortcuts. This does not pass the modal routing problem in DATA-04. |
| KEY-07 | N/O | No attached-keyboard scrolling run. |
| KEY-08 | N/A | No app-specific accelerator vocabulary or bare-key navigation to document; Android design explicitly leaves the shortcut-reference feature to web. Standard Undo/Redo alone is not treated as a new shortcut system. |
| DLG-01 | fail | Major; owner-retained Unsubscribe confirmation precedes a reversible action. See failure detail below. |
| DLG-02 | pass | 28 names the Subscription in the short question; 15 names Playlist and target time. The requested plain confirmation is respected. |
| DLG-03 | pass | Cancel/Unsubscribe, Cancel/Rewind and Cancel/Save as a View use result-oriented labels. |
| DLG-04 | N/O | Safe Cancel/dismiss callbacks are present; Escape cancellation with a hardware keyboard is not established. |
| DLG-05 | pass | Visible initiating Unsubscribe/Delete controls are destructive-colored; the confirmation follows an explicitly requested destructive action, so the documented deliberate-action exception applies. |
| DLG-07 | pass | View editor has Back and Done; editor sheets have Done and system dismissal; no Cancel/Done/Back trio. |
| DLG-09 | pass | EntryMenu and EditHistoryMenu use anchored DropdownMenu inside the triggering Box; no editable work in those popups to lose. |
| CTRL-02 | N/A | No checkbox hierarchy or mixed parent/child selection. |
| CTRL-03 | pass | Name, Search the Library, Podcast name or feed address, Server address and numeric inputs have persistent OutlinedTextField labels. |
| CTRL-04 | pass | NumberInput uses locale-aware NumberFormat; NumberField and PlaylistNames validate locally; address errors are classified. See EditorComponents.kt and ServerScreen.kt. |
| CTRL-05 | pass | Material buttons/clickables provide pressed feedback; player transport sizing serves the Android audio task. No Mac control metrics imposed. |
| CTRL-06 | pass | Play, Add, edit, new-item and Settings remain visible; row overflow holds contextual move/remove commands, not the only playback route. |
| CTRL-07 | pass | 20–22 explicitly say Search the Library and describe Episode titles, podcast names and show notes; no search history feature. |
| CTRL-08 | fail | Major; unknown-length downloads have no indeterminate indicator in Episode detail. See failure detail. |
| LIST-01 | pass | Android content feeds appropriately stay lists; stats has a two-column Day / Time listened table in ListeningStatsScreen.kt:65–67. |
| LIST-02 | pass | Lists have app-bar/section headings; the stats table uses short noun headings without punctuation. |
| LIST-03 | pass | View Sort sheet offers newest/oldest and shortest/longest; Android list sorting need not use desktop column headers. |
| LIST-04 | N/A | No dense multi-column table of long filenames or comparable narrow names. |
| LIST-05 | N/A | No expandable outline/disclosure rows. |
| LIST-06 | pass | Bottom destinations, Playlist tabs, radio choices and checkbox selections carry explicit selected/checked states in captures and code. |
| LIST-07 | N/O | Touch opening/selection is represented; attached-keyboard focus and arrow movement through all selectable lists is unverified. |
| DATA-01 | N/O | Valid View/Playlist edits are recorded to the local database; drafts use rememberSaveable. Actual quit/failure recovery of unfinished drafts is not established. DATA-06 separately covers the code-proven cold-start browsing-context reset. |
| DATA-04 | fail | Major; modal preview key handler consumes field Undo/Redo. Multi-step app history otherwise exists. See failure detail. |
| DATA-05 | pass | HistoryActions → revealChanges selects a relevant route; restored/moved Entries are scrolled into view and marked by EntryList (EntryDragging.kt:54–63, 83–103). |
| DATA-06 | fail | Major; fresh launch restores connection/playback, not the arranged browsing context. See failure detail. |
| DRAG-01 | pass | EntryDragHandle implements reordering; EntryMenu provides Move up/down and accessibility custom actions provide equivalent moves. |
| DRAG-03 | pass | AppModel.moveEntry records an inverse move and app Undo/Redo history. |
| DRAG-05 | pass | Code supplies a raised translated source, insertion line and reset on end/cancel; moves are bounded to valid list positions. Runtime feel remains unverified. |
| DRAG-06 | pass | EntryDragging.kt:65–78 autoscrolls at edges; retained destination is selected, announced and focused after a move. No slow external-content drop operation here. |
| PTR-03 | N/O | No pointer-attached interaction evidence. |
| PTR-04 | N/O | ActionIcon/ActionTooltip supply icon hints, but complete pointer/focus tooltip behavior and truncated-input disclosure are unverified. |
| APPEAR-03 | N/O | Light/dark variants are implemented; Android high-contrast preference behavior was not captured or otherwise settled. |
| APPEAR-04 | pass | Measured semantic token pairs pass in both tested themes; contrast details below. Disabled controls and decorative separators exempt. Contrast-preference operation remains APPEAR-03 N/O. |
| APPEAR-05 | N/O | Framework animation plus custom predictive-Back translation exists; reduced-motion behavior was not exercised. |
| APPEAR-09 | pass | Coherent 24dp vectors, conventional transport/share/star/edit/import/export meanings, and optically centered skip numbers. |
| APPEAR-10 | pass | Tonal navigation/player surfaces, outlined inputs, button fills and dividers distinguish controls from content in both appearances. |
| APPEAR-11 | N/O | No sampled loading/transition frames; separate settled captures cannot prove absence of flashes or intermediate contradictory states. |
| TYPE-02 | pass | Material Typography uses one system family, regular/medium headings and labels; no weak thin weights or unrelated typefaces. |
| TYPE-03 | pass | BodySmall is 12sp and BodyMedium 14sp; default system font scales. Smaller chart-axis label captions are not body prose. |
| TYPE-05 | pass | 200% captures preserve essential text and hierarchy; Episode actions move below text and ValueRow stacks values. Long content scrolls; labels wrap rather than clip. |
| TYPE-06 | pass | Default reading prose uses Material body styles with at least 120% leading; e.g. stats explanation lines are roughly 60–80 characters. The very short fixture show notes are not three full lines of reading prose. |
| TYPE-07 | pass | No long all-caps app prose or combined bold/italic emphasis; underlined show-note links are links. Fixture artwork initials are content. |
| TYPE-08 | pass | App strings use curly apostrophes, ellipsis, true minus and en dash; feed text retains its own punctuation. |
| COPY-01 | fail | Minor; chart instruction describes swiping to choose, but code only chooses on tap. See failure detail. |
| COPY-02 | fail | Major; per-result Subscribe errors are displayed in a shared region above the list. See failure detail. |
| COPY-03 | pass | No-match states offer Edit conditions/Clear Search; no-Subscription states offer Add podcasts; empty Entries offer Find Episodes; empty History/Timeline points to Entries. Trash needs no manufactured destructive next action. |
| COPY-04 | pass | Sentence-case action patterns coexist consistently with defined domain nouns; tooltip labels are concise action fragments. |
| AX-01 | pass | Captured controls have meaningful names/states; ActionIcon labels, Slider Position/stateDescription, checkbox/radio/switch roles and mini-player podcast/Episode announcement are explicit in code. Bare child buttons in the condensed tree inherit named groups; they are not counted as nameless controls. Live TalkBack traversal is unverified. |
| AX-02 | pass | Active Playlist, Played/Unplayed/Starred text, selection checkboxes, tab indicators and radio states supplement color. |
| AX-04 | pass | Seek Slider semantics, clickable transport, visible move commands and custom accessibility move actions supply alternatives to dragging/swiping; per-Episode detail exposes selection actions individually. Assistive-device execution remains unverified. |
| AX-05 | pass | App playback/buffering/error states have visible labels and controls; playback is explicitly initiated. Publisher podcast transcripts are outside app-authored critical-audio feedback. |
| START-01 | pass | Local-database reads and sync run off the main thread; Loading is named; offline/error app-bar states retain local content and Retry sync. Startup timing itself is N/O under RESP-01. |
| START-02 | pass | 40 offers Standalone Device without server setup; GettingStarted.kt persists Hide and Settings can reopen it with completed steps. |
| START-03 | pass | 42 explains Views/Playlists/Add podcasts in context; Help remains dismissible and reachable from Settings. |
| START-04 | pass | Manifest requests no dangerous runtime permissions and there is no launch permission request; OPML uses system document contracts at feature invocation. |
| START-05 | N/A | No runtime permission-purpose prompt in this implementation. |
| START-06 | pass | Standalone Device can use core app without an account/server; connecting is elective. No account sign-in system. |
| START-07 | N/A | No account creation feature. |
| EDIT-02 | pass | Compose text fields and SelectionContainer use standard cut/copy/paste/select operations; no interception of those commands. Undo interception is recorded once as DATA-04. |
| EDIT-05 | pass | Show notes support text selection and link annotations; Episode sharing sends useful text/URL via ACTION_SEND/chooser, and the Server URL is editable/copyable in its field. |
| WIN-03 | N/O | Only one compact XL-phone window is captured; smaller phone widths, rotation and chosen-window resize continuity are not settled. Tablet/foldable adaptation is outside this audit. |
| TOOL-06 | N/A | No user-hideable toolbar; Now Playing is an explicitly collapsible presentation with a visible mini-player route back, not a lost command surface. |
| SIDE-03 | N/A | No hidden navigation pane in the compact-phone layout. |
| SIDE-04 | N/A | No adjacent detail-determining navigation pane in this target; bottom navigation selection is covered by LIST-06. |
| SET-01 | pass | Settings gathers global playback, OPML, retention, Device and help; Playlist and Subscription settings remain with their objects; player speed stays task-local. |
| RESP-01 | N/O | No five-run timing measurements or 75th-percentile results. |
| FOOT-02 | N/O | Lazy lists/off-main work are good implementation evidence, but smooth scrolling and absence of common-action hangs require observation. |

**N/O:** FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, KEY-07, DLG-04, LIST-07, DATA-01, PTR-03, PTR-04, APPEAR-03, APPEAR-05, APPEAR-11, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, KEY-08, CTRL-02, LIST-04, LIST-05, START-05, START-07, TOOL-06, SIDE-03, SIDE-04. Reasons are in the ledger; no failed-parent dependencies are hidden in this count.

**Contrast measurements:** computed from MainActivity.kt’s actual foreground/background RGB tokens using WCAG relative luminance. Light: onSurface/surface **16.27:1**, secondary text/surface **8.86:1**, primary/surface **6.46:1**, Played tertiary/surface **6.10:1**, white/on-primary blue **6.81:1**. Dark: corresponding pairs **14.35:1**, **10.89:1**, **10.93:1**, **10.88:1**, **7.70:1**. Secondary text on the light/dark low-container surface is **8.48:1 / 10.06:1**. These support observed text contrast; they are not measurements of OS contrast-preference behavior or all possible publisher artwork. Transport icons sit on app surfaces rather than arbitrary artwork. No measured contrast failure is claimed.

### Android Phone platform-fit signals

Side-by-side calibration used the supplied phone Niagara contextual menu and BuzzKill action sheet, plus Google Keep’s supplied published image for shared Android icon/surface grammar only. Keep’s foldable geometry is not used to assess PodList’s phone layout; the available Google image is dated comparison evidence, not proof of a current release’s behavior. No imported iOS navigation/share symbol, root Up arrow, action-as-destination tab, or desktop pane requirement is imposed.

| Signal | Verdict | Evidence and limit |
|---|---|---|
| L1 Navigation | Native (S/C) | Three equal labeled destinations, selected tonal pill, titles/actions and inner-screen Back; no Up at root. |
| L2 Visual language | Native (S/C) | Coherent Material 3 sheets, buttons, settings rows, radio choices and vectors; independent dark tones. No credit merely for choosing Compose. |
| L3 Density/text/frame | Native for captured compact phone; partial (S/C) | dp/sp sizing; 48dp ActionIcon, check/radio rows and drag targets; Material target enforcement; body ≥12sp; explicit edge-to-edge, safe insets, IME handling in editors; 200% layout adaptations. Smallest phone width and keyboard-open sheet geometry remain N/O. Skip numerals are fixed-scale parts of transport glyphs with full spoken labels, not hardcoded body text. |
| B1 System navigation | Native implementation; partial (C) | NavigableListDetailPaneScaffold handles stack Back; selection Back clears selection; predictive player handler pops nested pages then collapses; modal dismissal precedes player Back; manifest enables callback. Animation/gesture-priority execution not observed. |
| B2 Preferences/access | Adapted; partial (S/C) | System theme and locale are followed; names/roles/scaled layouts present. Explicit Light/Dark/System override choices are absent. No penalty for brand accent or absence of dynamic color. Actual TalkBack traversal/contrast preferences remain N/O. |
| B3 System surfaces/lifecycle | Mixed: Native integrations / Foreign cold-start context, partial (C) | ACTION_SEND chooser, document contracts, Media3 session/channel machinery and launcher shortcuts are real integrations; saved-instance state exists. DATA-06 establishes the fresh-task context reset. OS process recreation and actual system surface layouts remain N/O. |

**Looks 8.5 · Behaves 7.6 (partial: source, no live flow) → uncapped (8.5 + 2 × 7.6) / 3 = 7.9 → capped Platform fit 6.9 by DLG-01.** Android B1–B3 each have some code evidence (3/3 partial), not complete exercised coverage.

## Scores

Both appearances receive the same app-level scores; 200% layout is considered within them. These are evidence-based holistic placements, not an arithmetic average of checklist verdicts. N/O is not a failure or score deduction.

| Category | Score | Evidence / anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.3** | Strong: one deliberate Material scale, readable metadata, wrapping titles and successful 200% stacking. Below Exemplary: stats period tiles become narrow word columns at 200%, while long default summaries repeat “Published/Played” and dilute the crisp role hierarchy. | `hierarchy`, `accessibility` |
| Hierarchy | **8.0** | Strong: Episode titles lead lists; filled Play now and large player transport clearly lead their screens. Below Exemplary: the large empty stats plot appears more prominent than its available data, and the permanently present Undo/Redo overflow adds equal chrome even with no available history. | `content-first`, `hierarchy` |
| Spacing & density | **7.7** | Strong: aligned 16dp list edges, regular section spacing and preserved 48dp targets; good text/action reflow. Below Exemplary: stats’ unused 132dp plot plus fixed three-column tiles make density poorly matched to sparse data and large text; repeated summaries spend scarce phone height. | `craft`, `conventions` |
| Color & contrast | **8.8** | Strong, close to Exemplary: measured text pairs pass comfortably, restrained seed color and independently toned dark roles; status is also verbal. Primary blue simultaneously marks headings, changed values and actions, so the finest distinction between informational and actionable text still relies on location. No contrast failure/cap. | `color-restraint`, `accessibility` |
| Iconography | **8.2** | Strong: coherent vectors, familiar transport and labeled icon controls; import/export use Android tray arrows. Below Exemplary: Episode detail uses the same check glyph for both Mark Played and Mark Unplayed (PodListScreens.kt:396–397), unlike the explicit filled/outline Star state; Undo/Redo is recognizable only after opening/long-pressing generic overflow. | `conventions`, `craft` |
| Consistency & polish | **6.7 (stability N/O)** | Competent edge-state anchor, despite Strong main-path visuals: shared helpers and dark/large-type layouts are considered, but unknown-total download feedback is incomplete (CTRL-08 cap 6.9), result errors lose their object, and populated stats looks blank. **Partial: no flow run**; no stability band cap applied. | `craft`, `feedback`, `stability` |
| Clarity | **6.8** | Competent/near-Strong: search scope, Default inheritance and Rewind consequences are unusually explicit. COPY-02 caps at 6.9; the chart gesture instruction and blank initial plot impair reading state. Playlist past-end state also lacks an explicit “No current Entry” message despite an unused string for it. | `plain-language`, `feedback` |
| Platform fit | **6.9** | Uncapped 7.9 from Looks 8.5 / Behaves 7.6; native bottom navigation, Back implementation and platform sharing/file APIs. DLG-01 major cap applies despite owner authorization. **Partial behavior: no live flow.** | `conventions`, `user-control` |
| Interaction & feedback | **6.6** | Competent upper band: real multi-step Undo/Redo, restored-Entry reveal, non-drag moves and useful offline states. DATA-06 cold-start loss of place and DATA-04 sheet shortcut routing cap at 6.9. Timing, complete keyboard access and live assistive interaction are unverified. **Partial: source/captures.** | `stability`, `forgiveness`, `feedback` |
| Overall | **7.5** | Strong visual/structural foundation serving discovery and playback, with material edge-state gaps that keep it far from reference quality. Weakest category is Interaction 6.6, so the rubric ceiling is 8.6; 7.5 respects it. This is a holistic judgment, not the mean. | `content-first`, `craft`, `character` |

### Craft gaps between this build and Exemplary

- **Make the stats chart tell the truth at entry.** In all appearances’ 33–35 captures, a minute is recorded on Nov 9, but the plot is visually empty. The snapshot confirms its visible day targets are Oct 11–18 (all zero); code starts the horizontal scroll at zero while the default readout is the last day. Thirty 56dp columns plus 2dp gaps occupy about **1,738dp**; at 200%, thirty 96dp columns occupy about **2,938dp**. The static endpoints below the viewport still say Oct 11–Nov 9. Initially show the selected/current day and actual data, align visible dates with visible bars, and make selected zero days visibly identifiable. Retain ≥48dp targets by using a bounded recent window or an overview with accessible day selection and the table. This is a hierarchy/density/clarity craft finding, not an invented FLOW-01 failure.
- **Use meaningfully responsive stats tiles.** At 200%, “This week / 1 minute” wraps into four small-word lines in each third-width tile. Stack three period rows or change the tile arrangement at large font scale while keeping all periods available. Essential text currently survives, so TYPE-05 passes; the craft can still improve.
- **Finish quiet state communication.** Render “No current Entry” when a Playlist Cursor is absent, including nonempty past-end Playlists; offer an appropriate play-from-entry route. PlaybackActions.kt:32–38 only shows Active/count/Clear on Played, EntryDragging only marks an existing Cursor, and `no_cursor` is unused. This is a clarity gap even though existing empty-list next steps pass COPY-03.
- **Make secondary controls reveal their state.** Give Mark Played/Unplayed a visible state treatment, and make Undo/Redo history labels name the actual edit. Preserve the player’s deliberately name-free visual design and compact navigation; these improvements need no extra permanent podcast/Episode names.
- **Tighten explanatory repetition.** Summaries such as “Played: Unplayed · Newest Published first” are precise but slow to scan, especially at 200%; use concise condition phrases with the same domain meaning. Keep detailed explanations in the editors and help where they earn the space.

**9.0 target constraint:** Under the guide exactly as written, retaining the owner-mandated DLG-01 failure fixes Platform fit’s maximum at 6.9. Since Overall may be at most 2.0 above the lowest category, **9.0 Overall is mathematically unattainable while that cap remains: ceiling 8.9 even after every other issue is fixed.** This is a scoring constraint, not a request to overturn the owner’s design. The current lower Interaction score makes this build’s ceiling 8.6.

## Next step

**Target:** DATA-06, the major failure closest to the primary task in the lowest-scoring category (Interaction & feedback 6.6). DLG-01 is excluded from change targeting because it is fixed by the owner.

**Root cause:** navigation/list context is treated as Activity saved-instance state, while only connection and domain playback state are durable. **Anti-pattern:** no exact Android-specific entry in the supplied catalog; do not misapply its Mac “One-window tunnel” to a phone.

**Change:** persist one per-Library-source browsing snapshot containing destination, route identifiers, and list key/offset; restore it after local data loads, dropping invalid IDs safely. Keep playback paused after cold launch. This is the smallest candidate addressing the established root cause; no navigation redesign is needed.

**Principle / expected effect:** `stability`, `forgiveness`; improve Interaction & feedback and the B3 behavior half of Platform fit. Risk: stale/deleted object identifiers or restoring the wrong Library’s route; key by source and validate against local data. Appearance, three bottom destinations and the name-free player remain intact. Compare against INTER-05’s preserved-work technique, adapted to Android rather than copying BBEdit’s window UI.

**Verification needed by the implementing agent:** navigate deep into a scrolled Playlist/Subscription, switch tabs, finish/recreate the task and cold relaunch, including offline and after the target object was deleted; verify the right source/place returns and audio remains paused. Separately check sheet text Undo with app history available and empty. Obtain the guide’s measured, delayed-completion flow strips and five-run timing passes before claiming runtime stability or responsiveness.

## Log

Independent audit only; no implementation/iteration applied. Baseline is CAP’s supplied build. Character check: blue accent **kept**; native Material 3/light-dark **kept**; three destinations **kept**; artwork-led, name-free player **kept**; domain vocabulary **kept**. No drift introduced. Earlier grades were not consulted.
