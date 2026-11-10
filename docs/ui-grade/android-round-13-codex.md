# PodList Android phone — independent audit, round 13

Commit: `372c52b695bbd6a5e7636307bb95dbe2770b03af`. Review date: 2026-11-10.

## Frame

- **Task:** Find podcasts and Episodes, arrange Entries in independent Playlists, and listen while retaining one's place and control of the Library.
- **Target:** Android **phone**, compact window. Tablet, foldable, desktop, Mac and web conventions are out of scope.
- **Posture:** Sovereign browsing and organizing surface, with background playback.
- **Audience:** Newcomers becoming perpetual intermediates.
- **Nearest exemplar:** Things for readable lists, restrained hierarchy and forgiveness; the guide's BuzzKill phone gallery for explaining settings consequences beside their choices. Google's Calendar gallery supplies Android visual-grammar comparison only, not tablet layout requirements.
- **Character:** Owner-fixed Material 3 with blue `#2b50c8` and independently toned dark surfaces; Views / Playlists / Library navigation; explicit domain states and Playlist-specific Positions; control-led, visually nameless players; compact Podcast pages with optional description.

**Owner decisions:** All supplied decisions remain in the assessment: the three navigation destinations, one-field Add podcasts, one-list View editor, Rewind summary sheet, OPML in Settings, paused current Entry after relaunch, no visual podcast/Episode names in either player, immediate Playlist deletion to Trash with named Undo, compact Podcast header with pull-down description and top-bar Subscribe/check, two-tap Unsubscribe without a dialog followed by Undo while remaining on the page, explicit Rename with separate name and lower Cancel/Save controls, case-insensitive unique names, and shortcuts registered only in Android's system panel. None is proposed for reversal. Native platform alternatives, including system Back and the system shortcut panel, count as Android command surfaces.

This is an audit, not an implementation iteration. No earlier `docs/ui-grade/*.md` report or `UI-GRADE.md` work list was read. No app code, tests or configuration was changed, and no device was driven.

**Evidence notation:** `S` is the supplied `android-grade-13/` directory; `F` is the supplied `flow-run/20261110-204453-069/` directory; `K` is `apps/android/app/src/main/kotlin/app/podlist/`. Both capture roots are under `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/`. Screenshot names below resolve under the indicated appearance in S. Code evidence establishes implementation behavior, not an unperformed runtime test.

## Flows

The supplied run completed these tasks in Light and Dark:

| Flow | Task |
|---|---|
| A | Views → View → Episode → Add to a Playlist → Undo → next item |
| B | Playlist → play Entry → Now Playing → collapse → reorder by command → Undo |
| C | Add podcasts → feed result → Podcast page → Subscribe while typing in Search Episodes → completion → Undo |
| D | New Playlist → create → settings → Rename → Save → Undo |
| E | Library Search → results → Save as a View → name → create |

**Conditions:** Pixel 10 Pro XL emulator profile, Android 16 / SDK 36, 1344 × 2992 physical px, density 3, hence **448 dp** phone width. One delayed pass per appearance adds 2,000 ms per HTTP completion. Five undelayed timed passes per appearance use a debuggable build on a Mac-hosted emulator; no CPU/network throttling. The static tour supplies 54 Light, 54 Dark and 52 light-at-200%-text screenshot/snapshot pairs. Flow timing and delayed transitions were not repeated at 200% text. Smaller phone widths and rotation are unobserved; larger window classes are excluded by the requested phone scope.

**Script:** `apps/android/app/src/androidTest/kotlin/app/podlist/FlowRunSmokeTest.kt` and `FlowRunReport.kt`, with shared classification logic under the Android domain module. **Measurements:** F/`measurements.csv` (7,424 element records across 339 capture sequence numbers), F/`timings.csv`, F/`frames.csv`. **Strip:** F's ordered, flow-prefixed PNGs. F/`summary.md` explains the method and audits excluded candidates.

**Independent method judgment:** Separating settled, input and pending-completion captures is sound. A snapshot taken 833 ms after an input does not prove that the movement began after 500 ms; treating that uncertainty as N/O is correct. The 47 intermediate-frame exclusions and 46 non-core-action exclusions are reasonable categories, but they are not positive evidence that every transition passes. Semantics and PNGs are sequential, and action identities and heading indices can change. The busy-state slots, focus, keyboard geometry and submitted-field ownership in code corroborate the measured safe path. The script does not comprehensively exercise error arrivals, OPML progress, all settings choices, nested player pages, or cancellation states.

**Verdicts from the run and visual audit:**

- **FLOW-01 N/O.** Three comparisons remain unresolved: capture sequences **91 → 94** and **270 → 273** show Subscribe's normalized action left edge moving **43 dp** as it becomes busy; **186 → 188** shows a sheet heading moving **48 dp** after choosing Dark. Onset is not established. These are neither scored failures nor passes.
- **FLOW-02 pass, observed tasks.** Sequences **99 → 100** and **278 → 279** retain Search Episodes focus and scroll through Subscribe completion. The field remains at **(16, 249) dp**.
- **FLOW-03 pass, observed tasks.** The same pairs retain **`Long E`** with a pending transport before completion and no pending transport afterward. The probe reports completion observations 2,882 / 2,883 ms after typing. It genuinely tests newer unsubmitted text, not just own-submit cleanup.
- **FLOW-04 pass, observed follow-ups.** Sequence **100** and **279** place the snackbar at approximately **(16, 453.3) dp**, Undo at **(355.3, 457) dp**, with `follow_up_visible=true`; the strip confirms it clears the open keyboard. S/`font200/63-podcast-subscribed.png` also shows the larger two-line confirmation and Undo above the player.
- **FLOW-05 N/A:** no paired peer panels in this phone presentation.
- **FLOW-06 pass, sampled states:** empty Library groups explicitly say “No podcasts”; History, Trash and Rewind's empty result sections have text. No vanishing help block was found in the sampled strip. This does not certify every unexercised data combination.
- **FLOW-07 pass:** one-field forms commit below their input, related multi-field View editors use a pinned trailing commit, and choice sheets commit at the bottom trailing edge. These are different screen kinds, not a mismatch.
- **RESP-01 / FOOT-02 N/O:** the response intervals, 47 unresolved timing groups and debug/emulator frame samples cannot establish audience-phone responsiveness. In particular, a late observation of busy/settle does not prove that an acknowledgment missed its deadline. The 21 / 22 over-deadline long-list frame samples are diagnostic evidence, not a physical-device performance grade.

**Confirmed FLOW failures: none in the observed run.** The DATA-01 failure below is established by a separate code path; the successful D flow does not test interruption while Rename is queued.

## Cross-screen inventory

“Snackbar” below means an inverse-surface message above the player/navigation or keyboard, with the same host moved into the foremost modal sheet when needed. Text-only Undo/Redo remain available in the top-bar history controls after the snackbar times out. Errors marked C are implemented but not captured in a failing state.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View | Snackbar: “View [name] created/changed”, neutral inverse | C: sync strip under app bar, “Showing local data”, Try again | None | Snackbar + top-bar history | Body explanation + New View / Add podcasts / Edit conditions | Nonblocking sync strip | Root +; row Add / Play | Summary below name; skippable Getting started card |
| View editor / New View | Snackbar; applied condition value shown in list | C: red field supporting text or range error near conditions | Condition sheet; Rename field with lower Cancel / Save | History controls, including sheet keyboard route | “Any” / explicit matches count | None | Trailing pinned Done / Create View | Permanent end note explains immediate application and kept drafts |
| Search / Save as a View | Snackbar: named View created | C: red name-field supporting text | Inline Name + Cancel / Create View | Snackbar + history | No matches + Clear Search; no Subscriptions + Add podcasts | None | Search field; naming commit below it | Field label and Library scope |
| Episode detail | Snackbar for edits/additions; text state changes | C: failed download inline in red with Try again; playback snackbar | Add-to-Playlist sheet | Snackbar + history | Explicit not-in-Playlist text; absent notes/Chapters headings omitted | None | Filled full-width Play Now | Labeled secondary actions; Playlist Position |
| Playlist list / Entries | Snackbar: “[n] Entries added to [Playlist]”; moved Entry highlighted | C: sync strip | Add sheet; no delete confirmation | Snackbar + history; restored/moved Entry revealed | No current Entry / Find Episodes | None | Root +; row Play from here; inactive Playlist switch below summary | Current Entry text + indicator; state summary |
| Playlist settings / Rename | Snackbar: “Playlist renamed to [name]”; deletion: “Playlist [name] moved to Trash” | Local duplicate/empty-name supporting text; commit-error recovery missing (DATA-01) | Name field, Cancel / Save beneath | Snackbar + history | Default Playlist explains unavailable rename/delete | None | Rename, lower Save, separate red Delete Playlist | Clear on Played consequence; Trash duration |
| History / Timeline / Rewind | Rewind returns to Entries, snackbar | C: sync strip | Rewind modal summary + Cancel / Rewind | Snackbar + history | History/Timeline next step; “None” in empty summary groups | Rewind summary deliberately blocks pending decision | Timeline row → trailing sheet Rewind | Preview explains what returns and what is kept |
| Trash | C: restored-name snackbar, including suffix if needed | C: sync strip | None | Snackbar + history | No deleted Playlists + Back to Playlists | None | Restore at row trailing edge | Retention explanation below empty label |
| Library / selection / Download Rules | Changed rule appears in group/value; snackbar for bulk change | C: feed refresh error beside Subscription; Try again | Rule sheet | History; bulk action snackbar | Every empty group has No podcasts; Add podcasts for fresh Library | None | Root +; selection action bar; sheet commit | Rule names and consequence descriptions |
| Add podcasts | Green check + Subscribed text in result; named snackbar | C: red field error; result-specific subscribe error | None | Snackbar + history | Name/address lookup gives recovery guidance | None | Find podcasts under one field; filled Subscribe on result | Persistent identifying field label |
| Podcast page | Green top-bar check; “Podcast [name] subscribed” snackbar | C: header page/action errors; affected-Episode red error and named Retry | Same-control two-tap Unsubscribe; Back/interaction disarms | Snackbar; stay on page | No matches + Clear Search; no Episodes + Refresh | None | Filled top-bar Subscribe; row Add / Play | Show/Hide podcast details; author + count |
| Subscription settings | Updated/inherited value in place, no routine modal confirmation | C: numeric error under cap field | Choice sheets | History; restored setting revealed and described | Default ([inherited value]) | None | Value row → choice | Scope “on this Device”; inheritance and threshold explanations |
| Settings / OPML | In-place values; export snackbar; inline import summary | C: red OPML error beside import summary + Try again | Native file picker; choice sheets | History / import snackbar | None | Import disables its own import/export controls | Choice rows, lower Done; file actions in Your podcasts | Section help; stopped import Resume and failed-feed retry |
| Listening stats | Numeric totals/chart update | None specific | None | None specific | No listening + Find something to play | None | Previous/next day, Show table | Chart description; permanent About your stats paragraphs |
| Welcome / server connection | Opens local Library after acceptance | C: red address supporting text with practical recovery | Choice of local start or optional server | None | Welcome is a designed start state | Only in-progress connection disables its field | Filled Start on this phone; Check and connect below address | Server is optional; placeholder HTTPS example; Library separation explanation |
| Mini player / Now Playing | Transport/Position update | C: snackbar “Your place is kept” + Try again, retry transport state | Speed / sleep sheets | Global edit history; no false promise of transport undo | No mini player without current Entry | None | Largest central Play/Pause; fixed mini transport | Accessible identity, Episode route, timed skip glyphs, speed/sleep values |

**Mismatch:** The same retry operation is “Try again” in connection, download, OPML, playback and Podcast-page recovery, but “Retry” / “Retry [Episode]” in Podcast Episode-acquisition recovery (`K/PodcastPageScreen.kt`, strings 26, 103, 135, 377, 475–476). Record once as COPY-01. Error placement differences reflect page versus field versus row scope and are not inconsistencies. Likewise the inline import summary is a durable batch result, not an arbitrarily relocated transient confirmation. The rename commit lifecycle mismatch is DATA-01, not an additional FLOW finding without measurements.

## Checklist

**Coverage: 83.3% (pass 58 · fail 2 · N/O 12 · N/A 7).** Computation: `(58 + 2) / (58 + 2 + 12) = 60/72`; 79 core IDs audited. The six Android phone signals below are assessed separately and are not invented extra core-checklist IDs. Mac/web-specific checklists and Android tablet/foldable additions are N/A → target and excluded from this count.

### Failures by severity

1. **DATA-01 — blocker — Playlist Rename clears its recoverable draft before the edit commits.**
   - **Where:** [PlaylistSettingsScreen.kt](../../apps/android/app/src/main/kotlin/app/podlist/PlaylistSettingsScreen.kt#L59), `PlaylistName`, lines 63–67; [NameEditor.kt](../../apps/android/app/src/main/kotlin/app/podlist/NameEditor.kt#L41), lines 41–44 and 65–68; [ScreenActions.kt](../../apps/android/app/src/main/kotlin/app/podlist/ScreenActions.kt#L13), lines 13–28.
   - **Evidence:** `save` calls `changeWithUndo(...)`, which launches an asynchronous action waiting on `editLock`, then immediately calls `close(true)`. Acceptance clears the persisted rename draft independently of that transaction and hides the field. A queued action is only in memory. The wait can be substantial: `HistoryActions.kt:71–93` holds that same lock while reversing a subscription step that awaits network I/O (`:98–118`). If the process ends after draft deletion but before the queued rename executes, neither the new name nor its draft is durable. A commit exception also has no callback to preserve/reopen that draft. This ordering is established by code; no interruption, crash or disk-failure run is claimed. Captured flow D verifies normal completion only.
   - **Concrete fix:** Give Playlist Rename a completion/result callback. Validate against current State and commit the rename and submitted-draft removal in one database transaction. Keep the field and draft until successful completion; retain input and show an inline error with Retry on failure. Preserve the owner's explicit Rename / Cancel / Save layout and unique-name policy.
   - **Score consequence:** Documents & data safety maps to Interaction & feedback; the blocker caps it at **4.9**. Overall is then at most **6.9**, regardless of how strong the screenshots are.

2. **COPY-01 — minor — Retry terminology varies for the same recovery action.**
   - **Where:** `K/PodcastPageScreen.kt:155–169, 398–404`; `apps/android/app/src/main/res/values/strings.xml:26, 103, 135, 377, 475–476`.
   - **Evidence:** Episode-acquisition snackbar says “Retry” and its inline action says “Retry [Episode]”; the app's other recovery actions use “Try again”. The named Episode scope is useful; the competing verb vocabulary is unnecessary. This is code evidence, not an observed error-state flow failure.
   - **Concrete fix:** Choose one retry verb throughout, retaining the affected Episode's name where it disambiguates the action. For example, use “Retry” consistently for generic actions and “Retry [Episode]” for the row-specific action. No category cap for this minor defect.

### Every core item

Pass means the available evidence meets the check within this phone audit's scope; it does not certify the explicitly untested runtime surfaces listed afterward.

| ID | Verdict | Evidence / boundary |
|---|---|---|
| FLOW-01 | N/O | Three onset-unknown comparisons described in Flows |
| FLOW-02 | pass | F sequences 99→100, 278→279; retained field focus/scroll |
| FLOW-03 | pass | Same pairs retain newer `Long E` through pending completion; submitted draft guards in forms |
| FLOW-04 | pass | F 100/279 keyboard-visible Undo; S font200/63 |
| FLOW-05 | N/A | → phone: no paired panels |
| FLOW-06 | pass | S 13/15/18/20/43, explicit empty sections; sampled strip |
| FLOW-07 | pass | S 04/05/19/26/41 and sheets, consistent per screen kind |
| KEY-01 | N/O | Standard focusable Compose controls; no complete keyboard-only traversal |
| KEY-04 | N/O | FocusRequester paths exist; traversal order/visible indicators not comprehensively exercised |
| KEY-06 | pass | MainActivity uses standard Ctrl+Z / Ctrl+Shift+Z key codes; no layout-dependent punctuation accelerators |
| KEY-07 | N/O | No attached-keyboard scrolling run or framework-source proof of every named key |
| KEY-08 | pass | MainActivity:69–77 registers Android's own accessible shortcut panel; Android interpretation, no phone shortcut list required |
| DLG-01 | pass | Undoable delete has no dialog; essential permission explanation and Rewind decision are contextual |
| DLG-02 | pass | Rewind title names Playlist/moment; notification explanation names purpose |
| DLG-03 | pass | Specific Rewind, Save, Continue verbs; limited choices |
| DLG-04 | pass | Rewind Cancel; modal onDismiss; platform Back routes; no destructive default acceptance |
| DLG-05 | pass | Delete Playlist/View red and deliberately requested; Rewind requires explicit action |
| DLG-07 | pass | Modal Done uses Android system Back/dismissal; no Cancel/Done/Back triple |
| DLG-09 | pass | Anchored DropdownMenu in EntryMenu/EpisodeOverflow/Podcast page; persisted form drafts survive dismissal |
| CTRL-02 | N/A | → feature: no hierarchical checkbox parents |
| CTRL-03 | pass | Persistent OutlinedTextField labels in tour and code; no password input |
| CTRL-04 | pass | Name and locale-aware numeric checks, supporting errors, bounded number keyboards; creation revalidation in transaction |
| CTRL-05 | pass | Material buttons/ripples; deliberate transport prominence |
| CTRL-06 | pass | Play/Add remain outside related secondary-action menus |
| CTRL-07 | pass | Search the Library vs Search Episodes vs podcast directory input clearly scoped; no displayed history |
| CTRL-08 | pass | Download byte progress/cancel; OPML item progress/Stop/Resume and retry; unrelated work remains available |
| LIST-01 | pass | Android content feeds stay lists; stats table uses date/time columns |
| LIST-02 | pass | Screen titles and semantic section headings label lists; stats table has Day / Time listened |
| LIST-03 | pass | View Sort choice sheet supplies ascending/descending date/duration choices; Android list exception |
| LIST-04 | N/A | → feature: no dense multicolumn item table |
| LIST-05 | pass | Podcast description query/expanded state stored in BrowsingContext; one disclosure affects one page |
| LIST-06 | pass | Selected bottom destination/tabs; checked choices and checkboxes in captures |
| LIST-07 | N/O | Touch opening/selection shown; attached-keyboard list focus/arrows not exercised |
| DATA-01 | fail | Blocker: eager Playlist rename acceptance deletes draft before queued commit |
| DATA-04 | pass | HistoryActions multi-step inverse/redo and failed-reversal retry; system shortcuts; flows A–E |
| DATA-05 | pass | revealChanges, EntryList reveal and SettingsFeedback expose restored result; flow B/D Undo |
| DATA-06 | N/O | Durable routes, anchors, Podcast queries and saved state implemented; full selected/context restoration across process death/relaunch untested |
| DRAG-01 | pass | EntryDragging implements handle drag; EntryMenu Move up/down supplies alternative |
| DRAG-03 | pass | moveEntry captures inverse and records history |
| DRAG-05 | N/O | Source lift/insertion/reset code exists; actual threshold and failed-drop presentation unobserved |
| DRAG-06 | pass | EntryDragging edge-scroll loop, destination retention, reveal and focus code; runtime ergonomics untested |
| PTR-03 | N/A | → target: touch phone; no pointer-specific surface audited |
| PTR-04 | pass | ActionIcon / ActionTooltip supply action-specific icon help; visible text labels identify other actions |
| APPEAR-03 | pass | Independent Light/Dark tokens; UiModeManager contrast listener adjusts foreground/outline roles; no custom translucent reading surface |
| APPEAR-04 | pass | Measured token ratios below; custom check colors and selected metadata pass; publisher artwork is content |
| APPEAR-05 | N/O | Framework animations and gesture translation present; reduced-motion behavior not established by supplied evidence |
| APPEAR-09 | pass | Coherent vector symbols; familiar transport, Settings, Share, OPML and state glyphs |
| APPEAR-10 | pass | Tonal controls, filled primary actions, separate navigation/mini-player surface |
| APPEAR-11 | pass | Sampled strip/tour frames coherent; no confirmed non-core flash or contradictory status; not a frame-by-frame guarantee |
| TYPE-02 | pass | Single system family, Regular/Medium/Semibold; MainActivity typography tokens |
| TYPE-03 | pass | 12 sp minimum body/label tokens, larger content text; text enlarges in font200 |
| TYPE-05 | pass | 14/21 and 16/24 sp reading styles; wrapped action grids, tabs and names at 200%; full title in detail |
| TYPE-06 | pass | Default phone paragraph measure is comfortable; reading styles use 150% leading and paragraph spacing |
| TYPE-07 | pass | No long all-cap UI prose, combined bold/italic emphasis or non-link underlines found |
| TYPE-08 | pass | Curly punctuation and ellipsis characters in owned strings; literal addresses preserved |
| COPY-01 | fail | Minor: Retry versus Try again for equivalent recovery |
| COPY-02 | pass | Scoped connection/feed/numeric/storage errors explain recovery; inline red feedback, practical retry routes |
| COPY-03 | pass | History, Trash, stats, no matches, no Subscriptions provide next actions |
| COPY-04 | pass | Consistent element casing; fixed domain nouns account for Playlist/View/Episode capitals |
| AX-01 | pass | Snapshot labels, selected/checked states; labelled seek/progress; player accessible identity; custom move actions; live TalkBack usability untested |
| AX-02 | pass | Current Entry text/line, checkbox selection, explicit Starred/Played, check glyph and error text accompany color |
| AX-04 | N/O | Visible details toggle, move commands and accessibility actions exist; complete Voice/Switch input operation untested |
| AX-05 | pass | Playback buffering/error/Position have visual/text states; Play/Pause and skip controls exposed; no forced audio on launch |
| START-01 | pass | Starting/loading indicators, local data while offline; first-run and standalone capture states |
| START-02 | pass | Hide state persists in DB; Settings reopens Getting started; server optional |
| START-03 | pass | Dismissible contextual getting-started help, setting consequences and details toggle |
| START-04 | pass | Download-triggered notification request, IncomingContent/AppModel; no permission wall on Welcome |
| START-05 | pass | Specific sentence explains notification progress/stop benefit; Continue to system request |
| START-06 | pass | Standalone phone route requires no account/server |
| START-07 | N/A | → feature: no account creation offered |
| EDIT-02 | pass | Native Compose fields/selection; app history keys fall through only after text handling |
| EDIT-05 | pass | Selectable notes/descriptions retain links; copy feed address; Android share intent supplies useful URLs |
| WIN-03 | N/O | 448 dp portrait and 200% text shown; narrower/shorter windows and rotation untested |
| TOOL-06 | pass | Expanded player collapses; mini player/artwork reopens it; contextual chrome returns on exit |
| SIDE-03 | N/A | → target: phone has no hideable sidebar/pane |
| SIDE-04 | N/A | → target: phone has no adjacent navigation/detail pane |
| SET-01 | pass | Global Settings, Playlist settings, Subscription settings and episode-only playback speed have clear scopes |
| RESP-01 | N/O | Debug emulator, unresolved response intervals; audience hardware unverified |
| FOOT-02 | N/O | Same limitation for frame metrics and smooth scrolling |

**N/O:** FLOW-01, KEY-01, KEY-04, KEY-07, LIST-07, DATA-06, DRAG-05, APPEAR-05, AX-04, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, CTRL-02, LIST-04, PTR-03, START-07, SIDE-03, SIDE-04.

Other unverified surfaces: actual TalkBack traversal, rotation/process recreation, predictive-Back animation, native Sharesheet presentation, lock-screen/notification controls, Android Auto, Bluetooth/audio focus, launcher-shortcut operation, OPML import in progress and real publisher feeds. Code supports several of these integrations; no observed-runtime pass is implied. Font200/42 is a loading capture, not proof of permanently missing starter Views; dark/font200 stats open scrolled, not proof of missing period totals.

### Android phone platform signals

Side-by-side comparison finds no imported iOS navigation, fake desktop chrome or web-only controls. Like the guide's Google/BuzzKill examples, PodList uses app bars, coherent control grouping, contextual sheets and restrained tonal surfaces. The Calendar reference's tablet pane arrangement is not a phone requirement.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native | Three equal bottom destinations, selected state, root actions separate; inner-screen Up; S 01/10/20/03 |
| L2 Visual language | Native | Coherent Material 3 controls, one vector family, tonal surfaces; no requirement to copy Expressive or dynamic color |
| L3 Density, text, system frame | Native in observed phone window | dp/sp tokens, 48 dp icon targets, wrapping at 200%, edge-to-edge and safe/IME insets; smaller widths N/O |
| B1 System navigation | Adapted, code-supported | NavigableListDetailPaneScaffold, BackHandler, player PredictiveBackHandler and modal dismissal; no Back-to-pause coupling; gesture animation N/O |
| B2 Preferences and access | Native in verified portions | Light/Dark/System, semantic labels/states, font200 layouts, resource-based strings and locale-aware numbers/dates; live assistive traversal N/O |
| B3 System surfaces/lifecycle | Foreign on the verified Rename lifecycle path; otherwise native implementation | Android intents/file contracts, MediaLibraryService, channels and contextual permission requests; DATA-01 breaks durable explicit Rename. Full process-restoration/integration run N/O |

**Looks 8.9; Behaves 8.0; Platform fit `(8.9 + 2 × 8.0)/3 = 8.3`.** B1–B3 have code evidence, with the runtime qualifications above. Missing optional widgets or tablet additions are not deducted.

## Scores

The scores are holistic judgments against the guide's anchors, not an average of checklist ticks. Unobserved checks impose no failure caps. Both appearances earn the same category scores; color measurements differ as shown. Exact tenths should not be mistaken for measurement precision.

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.7** | Strong: a restrained system scale, 17 sp Episode titles over 14 sp metadata, 14/21 and 16/24 leading, graceful 200% wrapping. Below Exemplary: tiny repeated action captions at default size and closely related title/heading weights leave some structure dependent on blue rather than type alone. S 02/03/04/24/50; MainActivity typography. | hierarchy, accessibility, craft |
| Hierarchy | **8.6** | Strong: Episode Play Now and player transport lead, state metadata recedes, View editor footer is unmistakable. Repeated blue static section labels and blue text actions are too similar in emphasis; Podcast name is repeated in app bar and body, consuming scarce vertical space. Owner-fixed compact header is retained. | content-first, hierarchy |
| Spacing & density | **8.5** | Strong: 16 dp content gutters, 8/12/16 dp relationships, minimum 48 dp actions and deliberate large-text stacking. Below Exemplary: the second full-width action line in each enlarged Episode row is sparse, and Settings value rows spend similar generous spacing on very different information lengths. S font200/02/06/11/23. | craft, hierarchy, conventions |
| Color & contrast | **9.1** | Exemplary on verified palettes: blue has a clear action/selection role, green means subscribed/completed, red means destructive/error. Light text/background 16.27:1, secondary 8.86:1, blue 6.46:1; dark equivalents 14.35:1, 10.89:1, 10.93:1. Filled button text 6.81:1 Light / 7.70:1 Dark; check glyph 6.57:1 / 7.82:1; selected-row metadata 7.24:1 / 5.46:1. Ratios calculated from MainActivity role colors, not screenshot antialiasing. No claim about arbitrary publisher artwork contrast or untested OS combinations. | color-restraint, accessibility |
| Iconography | **8.6** | Strong: consistent vectors, readable timed skip controls and well-labeled OPML/share/state actions. Below Exemplary: a drag grip also opens Entry actions without a visible menu cue; Views and Playlists glyphs are close relatives, so labels do substantial recognition work. These remain understandable, not checklist failures. S 01/11/12/50. | conventions, plain-language, craft |
| Consistency & polish | **8.5** (stability **8.8**, Light and Dark; measured scope) | Strong: shared rename layout, form commits, empty states, responsive wrapping and foreground-sheet feedback host; no confirmed FLOW failure. F 99→100/278→279 preserves text/focus and displays Undo above IME. Stability is limited to observed transitions: FLOW-01 remains N/O, so this is not an all-transitions certification. Fine craft gaps include repeated header identity, generic value-row rhythm and the recovery-word mismatch. The Strong stability band allows up to 8.9; no extra cap applies. | stability, craft, conventions |
| Clarity | **8.5** | Strong: distinct Library versus podcast search, explicit current Entry and inherited values, useful empty-state next steps, concrete Rewind summary. “Retry” versus “Try again” is a small inconsistency; dense domain-capitalized help makes onboarding less immediate than the best plain-language examples. Visually nameless players are graded as owner-fixed: artwork, Chapter when available and the Episode route mitigate recall, but arbitrary artwork is weaker identification than explicit text. No proposal to add names. | plain-language, discoverable-commands, feedback |
| Platform fit | **8.3** | Strong: Looks 8.9 / Behaves 8.0 by the required formula. Native navigation, dp/sp sizing, resource/intent/media integration and system shortcut registration. The premature Rename acceptance is the verified lifecycle exception; keyboard/assistive/system-animation runtime coverage remains qualified rather than failed. | conventions, user-control, stability |
| Interaction & feedback | **4.9** | Weak by mandatory blocker cap, despite otherwise Strong behavior: retained newer search text, multi-step Undo/Redo, visible Undo, reversible Trash and reorder, gesture alternatives and local-first start. DATA-01 means explicit Save can abandon its durable draft before its queued operation commits. Timeliness and scroll smoothness N/O; no performance penalty inferred. | forgiveness, feedback, user-control |
| Overall | **6.9** | Competent overall under the mandatory `lowest category + 2.0` limit: `4.9 + 2.0 = 6.9`. The visible phone UI is Strong and the color system is Exemplary, but the explicit-save durability gap prevents a trustworthy 9.0 overall. This is a holistic judgment constrained by the cap, not the mean of visual scores. | forgiveness, character, craft |

### What still separates the craft from 9.0

Fixing DATA-01 removes the hard ceiling; it does not automatically make the remaining categories Exemplary.

- **Tune type hierarchy before adding decoration.** Static section headings and actionable text share blue emphasis. Try onSurfaceVariant/semibold for static section headings while retaining blue for actions and selected state; compare Episode, Settings and View editor together. Preserve the blue identity and full labels.
- **Give enlarged rows a more deliberate action relationship.** In font200/02 and /23, actions occupy a broad, mostly empty second line. Test grouping them closer to the text block or reducing redundant inter-row padding while retaining every command and at least 48 dp targets. Do not force 200% text back into the default-size row.
- **Refine the compact Podcast header inside its fixed structure.** The top bar and first body line repeat the same name; use the body header's typography/spacing to make author, search and count easier to scan without enlarging the header or exposing the description permanently.
- **Make the grip's secondary action discoverable.** Keep drag and Move up/down. Add a clear menu affordance or a touch-visible cue that the grip opens actions; tooltip and accessibility labels already help, but do not help every sighted touch user discover a tap.
- **Make recovery read as one system.** Standardize the retry verb and preserve the useful named-Episode scope. Verify error arrivals with the keyboard open and at 200% text; their absence from the run is an evidence gap, not a claimed failure.

Before claiming 9.0 across behavior, obtain a release-build physical-phone run for responsiveness, narrower/shorter compact-window and enlarged-text flows, assistive input, and actual lifecycle restoration. Those tests can establish presently N/O facts; missing evidence is not itself a defect or a checklist cap.

## Next step

**Target:** DATA-01, Playlist Rename durability. **Anti-pattern:** Save-or-lose, narrowly: the UI treats a queued edit as accepted and discards its recovery state. **Root cause:** the shared name editor's success callback is invoked by the Playlist caller before the asynchronous transaction completes; the View caller already waits for a result.

**Change:** Add a result-returning transactional Playlist-rename operation. Keep `saving` true and the submitted persisted draft intact until the database has accepted the edit. Validate case-insensitive uniqueness against the transaction's current State, clear only the submitted draft as part of successful commit, and return a recoverable inline failure otherwise. The explicit Rename, separate name lines, Cancel/Save controls and all owner decisions survive.

**Principle:** forgiveness and accurate feedback. The nearest contrast is the guide's save/data-safety contrasts: Things-like forgiveness means interrupted work remains recoverable, not merely that a successful edit later has Undo. **Expected effect:** remove the Interaction blocker and its Overall ceiling; no visual category should need to regress. Useful verification is a queued rename behind a delayed subscription Undo, interrupted before commit, plus failed/duplicate commit and ordinary Save/Undo. No implementation or new test was performed during this grading task.
