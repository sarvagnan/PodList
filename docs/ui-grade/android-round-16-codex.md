# PodList — Android phone — independent round 16 audit

Commit graded: `dbda082add1ff75fc5fe5b282e3ed1c08e068681`. Reviewed 11 November 2026. No earlier PodList grade or UI-GRADE.md work list was read. No app, test or configuration changes; no device/emulator operation and no new test run.

## Frame

- **Task:** find Episodes through Views/Search or a Podcast page, add them to a Playlist, listen, and adjust the Library and playback without losing context or work.
- **Target:** native **Android phone**, compact portrait window, 448 dp wide; tablet/foldable and their platform signals are out of scope.
- **Posture:** sovereign browsing/management surface with transient sheets and background playback.
- **Audience:** perpetual intermediate, with newcomer first-run guidance.
- **Nearest exemplar:** Things for calm personal-list hierarchy, state completeness and feedback placement; the Android gallery’s BuzzKill chooser for consequence-under-choice explanations. BuzzKill’s published action-picker image and grade were inspected; its oversized cards are not a model for this app’s density. These are craft references, not a request to import another platform’s appearance.
- **Character:** owner-fixed Material 3 and PodList blue `#2b50c8`; independently toned dark theme; peer Views/Playlists/Library destinations; control-led, artwork-identified playback; concise domain language separating finding from listening. The supplied captures are the unchanged baseline.

**Owner decisions retained and graded:** bottom navigation’s three destinations; one Add podcasts field; one-list View editor; Rewind summary sheet; OPML in Settings; paused current Entry after relaunch; no visual podcast/Episode names in either player; compact Podcast header and pull-down description; top-bar Subscribe → green check; two-tap Unsubscribe with no dialog, Undo and page retention; explicit Rename with separate name/controls and Cancel/Save; case-insensitive unique names; Android’s system shortcut panel instead of an in-app shortcut list; immediate Playlist deletion to Trash with the exact named message and Undo. These are not proposed for reversal. The name-free player necessarily makes visual identification depend on artwork; the Episode action and complete accessibility identity mitigate that accepted tradeoff.

**Evidence key:** `S` means a screenshot plus its supplied accessibility snapshot in `android-grade-16/{light,dark,font200}/`; numeric screen names follow its README. `F` means the flow run `flow-run/20261111-003715-999/`, with rows referring to the CSV’s **row field**, not physical line numbers. `C` means code under `apps/android/app/src/main/kotlin/app/podlist/`, unless a module is named. These evidence folders are under `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/`. All three visual tours were inspected, including enlarged-text and dark variants. Source review also used CONTEXT.md, both Android/product design documents and ADRs 0011–0013.

## Flows

**Tasks run by the supplied instrumented capture:** A: View → Episode → Add to Playlist → Undo; B: Playlist playback → Now Playing → reorder → Undo; C: Add podcasts → Podcast page → Subscribe while typing → Undo → next input; D: New Playlist → Rename → Undo; E: Search → Create View. This audit uses that run rather than driving a device.

**Width/appearances/device:** 1344 × 2992 physical px, density 3, **448 dp compact phone**; Android 16 emulator using the Pixel 10 Pro XL profile on a Mac; debuggable build. Light and Dark each have a delayed pass with 2 s per HTTP completion and five undelayed timed passes. No CPU/network throttling. The separate still tour also has 200% Android font scale; **the flow run does not**. Medium/expanded widths and foldable displays are not requirements for this phone grade.

**Script:** `apps/android/app/src/androidTest/kotlin/app/podlist/FlowRunSmokeTest.kt`, `FlowRunReport.kt`, and `apps/android/app/src/flowRun/kotlin/app/podlist/FlowRunClassification.kt`. Evidence: F `summary.md`, `measurements.csv` (7,635 records), `timings.csv` (520 samples), `frames.csv` (43 samples), and sequential task PNG strips.

**Independent method assessment:** this is useful measured evidence, not an automatic grade. It retains stable semantic handles, float px/dp geometry, focus, scroll, input, IME bounds and action serials; delayed typing has a genuine pending transport. Settled and pending→completion comparisons avoid treating navigation itself as drift. The raw-candidate audit is inspectable. However, semantics and screenshots are sequential, snapshots are sparse, and a snapshot 516 ms after input does not establish that a change started after 500 ms. Four subscription-slot comparisons therefore remain FLOW-01 N/O. The report’s “no confirmed failures” does not cover APPEAR-11: it deliberately excluded non-core Episode actions from FLOW-01, and their loading-state movement is visible in its own evidence.

The timer starts at semantic action dispatch, after Compose synchronization, and uses draw timestamps plus quarter-resolution PixelCopy, excluding system bars and the bottom 140 dp. Caret/unrelated changes, skipped/transient frames, excluded playback chrome and missing busy observations limit what it proves. Several intervals straddle 200 ms or have fewer than five resolved observations. Debug emulator measurements do not meet the guide’s audience-hardware condition. **RESP-01 and FOOT-02 are N/O**, not passes or inferred failures; the 43 late frame samples warrant follow-up on a physical release build without becoming a scored performance claim.

**Verified slices:** F rows 97→98 retain `Search Episodes=Long E`, focus and field geometry `(16,249,416,65) dp` across pending→complete; Dark rows 285→286 provide the corresponding probe. The completion snackbar is visible above the IME (Light row 98: `(16,453.33,416,48) dp`). A/B/D/E follow-ups and S font200/15/63 retain reachable commit/Undo controls. These establish the tested FLOW-02/03/04 paths, not untested device integrations.

**FLOW failures:** none confirmed. FLOW-01 remains N/O; FLOW-05 is N/A; FLOW-06/07 pass on the reviewed strips and screen inventory. **Additional transition failure:** APPEAR-11 A1 below, F Dark C rows 274→275.

## Cross-screen inventory

Notation specifies placement, form, wording and color: **G** = bottom global Material snackbar above mini player/navigation and IME, inverse surface/text with inverse-primary action; success starts with a past-tense verb and identifies the changed object, Undo/Redo are explicit. **L** = same snackbar treatment in the originating sheet, in reserved flow space **above** its commit row. **E** = inline text at the field/affected row/header, error role, practical correction or named Try again. **B** = local/section empty-state prose in onSurface/onSurfaceVariant with a tonal next-step button. “None” means absent, not an inferred state. Untested runtime states below are code-defined.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View | G: Updated/Deleted View “name” | Top sync text + Try again; neutral local-data notice | None | G; fixed top-bar slot afterward | B: create View, Add podcasts or Edit this View | None | Root top-trailing New/Search; row Play/Add | Getting started card at top; Hide |
| New/Edit View | G or L: Created/Updated View “name” | E: name/range/number | Inline name; Cancel/Save below when renaming | Fixed top slot or local feedback | Matching count, including zero | None | Count + trailing Create/Done in pinned footer | Permanent draft explanation below conditions |
| Search | G: Created View “name” | E: name; contextual no-match message | Name field, Cancel/Create below | G/top slot | B: clear Search or Add podcasts | None | Search field at top; name commit below field | Scope says Search the Library |
| Episode detail | G: named Marked/Starred/Added/Download result | E: acquisition/download; playback G + Try again | Add sheet | G/top slot | Explicit not-in-Playlist text; syncing metadata text | None | Filled full-width Play Now; labelled secondary grid | Show notes and per-Entry Position |
| Playlist / Entries | G: Moved “Episode” in Playlist | Top sync/local-data notice | Add sheet | G/top slot; moved Entry revealed | B: Find Episodes; no current Entry stated | None | Per-row Play; Entry actions popup | Current Entry text + line/tint |
| Playlist settings / Rename / New | G: Created/Renamed Playlist; exact “Playlist name moved to Trash” | E: name | Explicit Cancel/Save below name | G/top slot | None | Default limitations are inline explanatory text | Below-field Create/Save; outlined Rename/Delete | Clear on Played and Trash consequences inline |
| Trash | G: Restored Playlist, including renamed collision result | Top sync/local-data notice | None | G/top slot | B: Back to Playlists + retention explanation | None | Trailing Restore per Playlist | Retention/recovery explanation |
| History | None | Top sync/local-data notice | None | Top slot | B: finish an Episode; Show Entries | None | Open Episode / Show Entries | Empty-state explanation |
| Timeline / Rewind | G: Rewound Playlist | Top sync/local-data notice | Modal summary of target, Unplayed, restored and kept | G/top slot | B: play an Episode; Show Entries | Rewind summary, neutral surface, Cancel safe exit | Per-moment row; bottom-trailing Rewind | Persistent review hint; summary explains kept edits |
| Library / Select Subscriptions | G: Updated Download Rule for count | Top sync/local-data notice | Modal rule choice and commit | G or L/top slot | B: Add podcasts | None | Root top Add/Search; contextual bottom Change Rule | Each populated rule has label + consequence |
| Add podcasts / directory results | G: Subscribed to podcast | E: query/result-specific failure | None | G/top slot | E/no-results explanation by query | None | Find below field; filled result Subscribe | Persistent field label describes name/address |
| Podcast page | G: Subscribed/Unsubscribed from podcast | E: page failure in header, acquisition beside Episode + retry; offscreen retry also G | Same check changes to Unsubscribe; accessible timed arming | G/top slot | B: Refresh/clear Search | None | Fixed top Subscribe/check; per-row Play/Add | Show/hide details; author; scoped Search |
| Subscription settings / Download Rules | G/L: Updated setting or Download Rule | E: number errors | Bottom sheet with radio choices; local commit | L or top slot | None | None | Tappable labelled values; outlined Mark all Played | Inheritance, rule consequences, Played threshold |
| Settings | G/L: Updated setting; named export/import result | E below OPML section + retry/failed-feed detail | Modal setting chooser | L or top slot | None | None | Values as rows; OPML uses system document picker | Section inheritance/help; Getting started route |
| Listening stats | None | Top sync/local-data notice | None | Top slot | B: Find something to play | None | Chart day buttons; outlined table/chart toggle | About your stats below chart/list |
| Welcome / Connect | Transition to usable local content | E below Server address, typed draft retained | Start on phone or optional connection | None | Welcome describes task | None | Full-width Start; below-field Check and connect | Server is optional; scope explained |
| Mini player / Now Playing | Visible transport/position state | G: audio error + Try again; transport also retries | Sleep/speed sheet | G/top slot where applicable | Absent without a current Entry | None | Center Play/Pause; expand/collapse; Episode/Entries actions | Artwork; chapter text when present; accessible full identity |

**Mismatches:** no confirmed like-for-like confirmation/error/Undo placement mismatch. Global/background messages wait while a modal is open; sheet-originated feedback stays local and reserves space above commits. Inline field/row failures and whole-session sync notices have different scopes. Pinned multi-condition forms versus below-field single-input forms are intentional task families, not FLOW-07 failures. The loading-slot discontinuity A1 is a transition defect, not a second inventory mismatch.

## Checklist

**Coverage: 83.3%** — **pass 59 · fail 1 · N/O 12 · N/A 7**. Verified 60 of 72 applicable core items; 79 total. N/A is excluded from the denominator.

**Failures by severity:** **1 minor; no confirmed major or blocker.** N/O does not mean pass.

### A1 — APPEAR-11 · minor · existing Podcast Episodes jump when loading ends

- **Where:** Podcast page header and its first Episode rows, `PodcastPageScreen.kt:378–393`.
- **Evidence:** F `C-0274-reveal-podcast-header-working-dark.png` → `C-0275-reveal-podcast-header-done-dark.png`, measurements **rows 274→275**, `action:Add to a Playlist:0` and `action:Play Now:0`: top **401.33334→385.33334 dp**, **−16 dp**; same x. Heading stays `(16,137)`, Search Episodes `(16,249)`, subscription slot `(273,61)` dp. The screenshots show the same already-visible Episodes while the loading line disappears. The header’s `Column` has a 12 dp inter-child gap and conditionally removes its 4 dp progress indicator, exactly explaining the 16 dp contraction.
- **Ownership/severity:** APPEAR-11 owns shifts of non-core content. This is not a duplicate FLOW-01 failure: the main heading, input and subscription action stay fixed. The sample interval runs from input age 245 to 961 ms, so it cannot establish the precise onset relative to 500 ms; the claim is the observed **data/loading-state layout discontinuity**, not a fabricated timing violation. It affects an existing list during a primary browse flow, and is a concrete finishing gap even though nothing is lost.
- **Concrete fix:** keep a permanent **16 dp total status footprint** in that header (4 dp progress plus its 12 dp relationship), hiding only the indicator drawing/semantics when idle; alternatively draw progress over a reserved existing seam. Keep initial loading/error explanations and existing touch targets. Re-capture the same pending→completion pair and verify the first visible Episode/actions keep the same top within 2 dp in both themes and at 200% text. This report makes no implementation change.

N/O: `FLOW-01`, `KEY-01`, `KEY-04`, `KEY-07`, `DLG-04`, `LIST-07`, `DRAG-05`, `PTR-03`, `APPEAR-05`, `WIN-03`, `RESP-01`, `FOOT-02`.

N/A: `FLOW-05`, `CTRL-02`, `LIST-04`, `LIST-05`, `START-07`, `SIDE-03`, `SIDE-04`. Mac/web checklists and Android tablet/foldable signals are outside the target and do not enter coverage.

| ID | Verdict | Evidence and scope |
|---|---|---|
| FLOW-01 | N/O | N/O: four unresolved subscription-slot comparisons; onset is unobserved (F rows 89→92, 103→106, 291→294). The measured typing/completion slice is stable, not a whole-check pass. |
| FLOW-02 | pass | F rows 97→98 and 285→286: Search Episodes retains focus, text and scroll across the pending completion; intentional navigation/IME/scroll changes are excluded. |
| FLOW-03 | pass | F rows 97→98 and 285→286: “Long E” survives Subscribe completing while transport was pending. Draft snapshots/version guards also protect Add, Rename and Create. |
| FLOW-04 | pass | F follow_up_visible and inspected follow-ups in A/B/C/D/E: Undo clears the IME, player and navigation; S font200/15 and /63 keep the commit/Undo visible. |
| FLOW-05 | N/A | N/A: no peer panels in this compact-phone target. |
| FLOW-06 | pass | S 03–07, 13–15, 18, 20, 30, 33–35; F task strips: sections have content or explicit empty states; no observed help block vanishes during typing. Loading geometry is recorded once under APPEAR-11. |
| FLOW-07 | pass | S 04/05, 06b/06c/09/15, 19/26/41; F A/D/E: pinned multi-field commits, below-field single-input commits and trailing sheet commits form consistent task families. |
| KEY-01 | N/O | N/O: no attached-keyboard traversal of every view/control. Native focusable components and Ctrl+A/Z routes are useful code evidence, not proof of complete operation. |
| KEY-04 | N/O | N/O: FocusedInputModifier and RenameableName request field focus; full forward/reverse traversal and visible focus treatment were not exercised. |
| KEY-06 | pass | MainActivity registers Ctrl+Z/Ctrl+Shift+Z using Android key codes; no punctuation-dependent or bare-key accelerators. |
| KEY-07 | N/O | N/O: no Page/Home/End/Space scrolling run with a physical keyboard. |
| KEY-08 | pass | Adapted to Android: MainActivity.onProvideKeyboardShortcuts exposes Undo/Redo in the system Meta+/ panel. No bare-key accelerators. The owner explicitly excludes a separate phone shortcut list. |
| DLG-01 | pass | IncomingContent notification rationale is actionable and contextual; routine edits/deletion use feedback/Undo, not alerts (PlaylistSettingsScreen, HistoryActions). |
| DLG-02 | pass | The code-defined notification alert says “Show download progress?” and explains progress/stop; the date picker names its input task. |
| DLG-03 | pass | Notification alert uses Continue/Not now; date picker uses Done/Cancel. S 15 uses specific Rewind/Cancel. |
| DLG-04 | N/O | N/O: safe Cancel/Back paths exist, but Esc cancellation with an attached keyboard is untested. |
| DLG-05 | pass | S 04b/16c and code: Delete uses error styling, remains a deliberate secondary command, and is reversible. |
| DLG-07 | pass | S 06b/06c/09/15: no Cancel+Done+Back triplet; sheets dismiss through system Back/drag/scrim, with explicit Cancel for Rewind. |
| DLG-09 | pass | EntryMenu and overflow use DropdownMenu within the opener Box; S 12 is anchored to its Entry actions control. Editors use modal bottom sheets; drafts persist on dismissal. |
| CTRL-02 | N/A | N/A: flat checkbox lists; no hierarchical checkbox parent. |
| CTRL-03 | pass | S 04c/05/19/21/26/41/61 and code: floating Name, Search, feed and server labels persist after typing; no sensitive field. |
| CTRL-04 | pass | Name validation reports empty/duplicate names; NumberField uses NumberInput parsing and locale-aware speed formatting; ServerScreen classifies address errors. |
| CTRL-05 | pass | Material buttons/clickable rows retain native interaction indications; primary/secondary emphasis is filled/tonal/outlined. Larger transport is a purposeful media control. |
| CTRL-06 | pass | S 01/10/20/03/11 and code: Search/New/Settings, Play/Add and Rename/Delete remain visible; overflow holds secondary Redo/share/download commands. |
| CTRL-07 | pass | S 21/22 explicitly says Search the Library; S 23/61 says Search Episodes within the named podcast. No search history is displayed. |
| CTRL-08 | pass | SettingsScreen/OpmlActions and DownloadStatus: known totals yield determinate progress, unknown totals indeterminate; Stop/Resume or Cancel preserve completed work. Runtime OPML remains unexercised. |
| LIST-01 | pass | Phone content feeds are flat lists; optional ListeningStats table has aligned Day/Time columns. No hierarchical data is forced into flat columns. |
| LIST-02 | pass | Screen headings name the lists; stats table headings are Day/Time listened; S 02/11/20/33 show consistent noun labels. |
| LIST-03 | pass | Android list sorting is exposed in the View editor’s Sort sheet (four named orders); no misleading inert sortable column heading. |
| LIST-04 | N/A | N/A: no dense multi-column listing requiring row tracking or path truncation. |
| LIST-05 | N/A | N/A: no outline with expandable descendant rows. Podcast description disclosure is not an outline. |
| LIST-06 | pass | S 01/10/20, 06b/06c, 09, 11 and 50: destination pill, radio dot, tab underline and checkboxes identify their selection. |
| LIST-07 | N/O | N/O: touch opening and selection are shown; attached-keyboard focus/arrow movement has no run. |
| DATA-01 | pass | FormDraftState, DraftWriteBuffer, RenameableName and MainActivity.onStop persist raw drafts, retain rejected saves and flush on leaving; S 41b demonstrates a kept server draft. Abrupt process-death recovery is not runtime-verified. |
| DATA-04 | pass | HistoryActions records multi-step inverse edits, typing groups and retryable subscription inverses; F A/B/C/D exercises Undo; MainActivity/sheet key handlers provide Ctrl+Z and Redo. |
| DATA-05 | pass | revealChanges/EntryList and SettingsFeedback reveal restored content and describe restored values; F B reorder/Undo and D Rename/Undo show the result. |
| DATA-06 | pass | BrowsingState persists destination stacks, keyed list anchors, Playlist tabs, selections and stats day/table. Paused Entry restores separately in PlaybackService. Lifecycle execution remains a B3 limitation. |
| DRAG-01 | pass | EntryDragging implements handle-driven reordering; EntryMenu and custom accessibility actions supply Move up/down equivalents. |
| DRAG-03 | pass | Drag and discrete moves both call model.moveEntry and record the inverse; F B verifies discrete reorder and Undo. |
| DRAG-05 | N/O | N/O: code has translated/elevated source and insertion lines, but no drag screenshot/run establishes threshold, active/reset and failed-drop visuals. |
| DRAG-06 | pass | EntryList autoscrolls near the viewport edge, pins the source, reveals and focuses the moved Entry, then briefly highlights it. No asynchronous drop requiring a transfer placeholder. |
| PTR-03 | N/O | N/O: no mouse/pointer gesture and cursor session on the phone. |
| PTR-04 | pass | ActionIcon/ActionTooltip wrap icon controls in named Material tooltips; field values remain editable/selectable rather than permanently visually truncated. |
| APPEAR-03 | pass | Light/Dark/System default are implemented; MainActivity interpolates secondary text and outlines with UiModeManager contrast. Opaque role-based surfaces do not depend on transparency; high-contrast runtime rendering is untested. |
| APPEAR-04 | pass | Theme-token contrast calculations below exceed text/control thresholds in both themes; disabled controls and decorative dividers are exempt. S light/dark families remain readable. |
| APPEAR-05 | N/O | N/O: no reduced-motion run. Compose animations are used, but custom motion and nested Back behavior under system animation changes have not been verified end to end. |
| APPEAR-09 | pass | S action grids, selection, player, top bars and menus use one coherent symbol vocabulary; drag, play, check, star and download meanings have labels/tooltips. |
| APPEAR-10 | pass | S filled primary, outlined destructive/rename commands, surface-separated player and selected rows distinguish controls/content without decorative animation. |
| APPEAR-11 | fail · minor | FAIL, minor: F Dark C rows 274→275 show the existing Episode list rise 16 dp when the header loading line disappears; see failure A1. |
| TYPE-02 | pass | System-family Regular/Medium/Semibold text roles; no thin body weights or unrelated typefaces (PodListTypography). |
| TYPE-03 | pass | Authored body roles are 16/24, 14/21 and 12/18 sp; captions remain readable; text uses sp and the supplied 200% tour reflows. |
| TYPE-05 | pass | S font200: actions wrap into two columns or separate rows, period tiles stack, titles/metadata wrap, sheets scroll and commits remain available. Scroll-boundary clipping is not lost content. |
| TYPE-06 | pass | S 35 and 41 prose uses comfortable phone measures (roughly 60–80 characters in full default-size lines); 14/21 and 16/24 styles provide 150% leading and paragraph separation. |
| TYPE-07 | pass | No app-authored long all-caps passages or mixed bold/italic emphasis; show-notes links are underlined; initials tiles are short identity marks. |
| TYPE-08 | pass | strings.xml uses curly apostrophes/quotes, ellipsis, en-dash ranges and the minus sign; feed addresses and publisher content retain their literal form. |
| COPY-01 | pass | Consistent View/Playlist/Episode/Entry terminology, specific Play Now/Next/Last/Rename/Delete verbs and touch instructions; domain terms are defined in CONTEXT.md. |
| COPY-02 | pass | Server, lookup, numeric, name, acquisition and OPML failures identify their cause and practical retry/correction; EpisodeActionFailure stays with the affected Episode. |
| COPY-03 | pass | S 13/18/30/43 provide Show Entries, Back to Playlists, Find something to play or Add podcasts; code adds routes for no matches/no Entries. |
| COPY-04 | pass | Domain nouns retain their intentional capitalization; action/help text otherwise follows sentence case, including icon tooltips and errors. |
| AX-01 | pass | Supplied snapshots expose names and selected/checked states; code supplies roles, player identity, seek value/state, named loading indicators and custom move actions. Live TalkBack traversal is unverified. |
| AX-02 | pass | S 11/50/63: Current Entry text plus line/tint, selected checkbox plus fill, green check plus Subscribed semantics, and textual errors avoid color-only states. |
| AX-04 | pass | Code supplies Move up/down, Show podcast details, chart day buttons/table and standard long-click selection semantics as gesture alternatives. Actual Switch Access/Voice Access use is unverified. |
| AX-05 | pass | Playback always exposes Play/Pause, including the paused relaunch state; no essential interface signal exists only as sound. |
| START-01 | pass | Welcome/Loading and local-first reads supply meaningful initial state; background synchronization leaves local data usable. Real launch latency is not claimed. |
| START-02 | pass | GettingStarted has persistent Hide, tracks completion, and can be reopened from Settings; Start on this phone avoids optional server setup. |
| START-03 | pass | S 42, 14/15, 18 and 24: dismissible task-specific guidance explains Views, Rewind, Trash and inherited settings without a mandatory tutorial. |
| START-04 | pass | POST_NOTIFICATIONS is requested only after download use; file access uses the document picker, not a launch-time storage permission wall. |
| START-05 | pass | IncomingContent supplies “Allow notifications to see download progress and stop a download.” and Continue/Not now before the system request. |
| START-06 | pass | S 40–43: Standalone Device needs no account/server; server connection is optional. The app has no independent authentication/account creation UI. |
| START-07 | N/A | N/A: no account creation offered. |
| EDIT-02 | pass | Compose text fields and SelectionContainer provide platform selection/edit commands; custom history handlers leave text-control shortcuts first refusal. |
| EDIT-05 | pass | Podcast overflow copies a useful feed URL with ClipData; notes are selectable and linked; shareText supplies title plus Episode URL and the system chooser. |
| WIN-03 | N/O | N/O: 448 dp portrait and 200% text are captured; smaller phone widths/landscape/rotation are not. Weighted/scrolling layouts support adaptation but do not establish every window size. |
| TOOL-06 | pass | Expanded player can always collapse; mini player reopens it; contextual editor mode exits through Done/Back and restores chrome. No permanently hidden toolbar. |
| SIDE-03 | N/A | N/A: no sidebar/pane in the compact-phone target. |
| SIDE-04 | N/A | N/A: no adjacent source/detail pane in the compact-phone target; bottom navigation is covered by LIST-06. |
| SET-01 | pass | S 06/07/16/24: global Playback/Appearance/OPML/server options live in Settings, Playlist behavior with the Playlist and overrides/Download Rule with the Subscription. |
| RESP-01 | N/O | N/O: five runs per appearance exist, but debug emulator timings and unresolved response intervals do not establish audience-hardware p75 responsiveness. |
| FOOT-02 | N/O | N/O: 43 emulator/debug frame samples (all marked late) are diagnostic evidence, not representative release-build/device scrolling. |

**Contrast evidence:** computed from the declared sRGB foreground/background roles in MainActivity, using WCAG linearized luminance; these are token calculations, not antialiased-edge samples. Light body `#1b1b21/#faf8ff` **16.27:1**, secondary `#46464f/#faf8ff` **8.86:1**, blue text `#2b50c8/#faf8ff` **6.46:1**, white-on-blue **6.81:1**. Dark body `#e4e1e9/#121318` **14.35:1**, secondary `#c7c5d0/#121318` **10.89:1**, primary `#b8c4ff/#121318` **10.93:1**, dark-on-primary **7.70:1**. Subscribed glyph/background pairs are **6.57:1 Light / 7.82:1 Dark**. These pass Android’s text thresholds. Decorative inset dividers need not be 3:1; disabled Save/Find controls are exempt. No measured contrast failure is claimed. High-contrast rendering on a device remains untested despite code support.

**Android Phone platform signals** (no tablet/foldable substitution):

| Signal | Verdict | Evidence / limitation |
|---|---|---|
| L1 Navigation | Native | Three equal labelled bottom destinations; Up only within task stacks; root actions separate from destinations (S 01/10/20). |
| L2 Visual language | Native | Material 3 controls, tonal surfaces, consistent icons and system typography in Light and Dark. |
| L3 Density/text/frame | Native on captured phone | 48 dp actions; 12 sp minimum body/caption roles; edge-to-edge with safe/IME insets; enlarged text wraps/scrolls. Other phone widths/rotation N/O. |
| B1 System navigation | Native by code; animation N/O | Adaptive navigator, modal Back, player PredictiveBackHandler and selection/arming handlers preserve task order; manifest opts into predictive Back. No gesture/predictive animation session. |
| B2 Preferences/access | Native by code/captures; live assistive use N/O | Light/Dark/System default, sp text, roles/labels and custom move alternatives. Resources follow system locale; no competing in-app language. No TalkBack/Switch Access run. |
| B3 System/lifecycle | Native by code; end-to-end lifecycle/surfaces N/O | Android Sharesheet intent, media service, download channel, contextual notification permission, document picker, launcher shortcuts, SQLite browsing/drafts and paused-player restoration. No process-death/notification/Auto/Bluetooth/focus run. |

No confirmed Foreign signal is asserted in the captured phone scope. Native source APIs establish implementation choices, not a claim that every system integration has run successfully.

## Scores

Scores cover the whole reviewed phone scope, not an average of attractive stills. One number covers visually matching themes unless stated. **Strong = 7.0–8.9; Exemplary = 9.0–10.0.** Unobserved scenarios do not receive a failure deduction or serve as invented evidence for a score.

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong: systematic 16/24, 14/21, 12/18 roles, real punctuation, readable descriptions and designed 200% wrapping. Values, explanatory text and state strings still form long, similarly weighted runs in editor/Subscription settings; the hierarchy is considered but not as economical as the exemplary lists. | hierarchy, accessibility, craft |
| Hierarchy | **8.8** | Strong: one filled Play Now, quiet content-first lists, distinct selected/current states, compact Podcast identity and explicit form commits. Library’s Subscriptions→Download Rule→Stream→explanation sequence and the editor’s repeated label/value pairs ask for more reading than their simple tasks require. No owner-fixed screen model is penalized as foreign. | content-first, hierarchy |
| Spacing & density | **8.6** | Strong: 16 dp keylines, 48 dp hit areas, 8/12/16 dp relationships, stacked enlarged-text actions and measured-player scroll fallback. Simple ValueRows spend about 85 dp on a two-line label/value (24+21+8+32), making the nine-condition editor taller than its information warrants; see S 04/04b. | craft, adaptability |
| Color & contrast | **9.2** | Exemplary in reviewed appearances: role-based dark surfaces, deliberate blue, high-contrast secondary text, restrained state tint and distinct destructive treatment; all calculated text/control pairs above pass. Real high-contrast preference rendering is not claimed. A1 is a minor Appearance-group failure and creates no numeric cap. | accessibility, content-first |
| Iconography | **8.8** | Strong: coherent Play/Add/Star/Download/Chapters families with tooltips and labels, filled/outlined state changes. At phone scale the small list/add/Entries/Playlist glyphs require their labels more than an exemplary immediately recognizable set would; no inaccessible icon failure is established. | conventions, craft |
| Consistency & polish | **8.4** (**stability Light 8.7 / Dark 8.3; partial**) | Strong: repeated form, sheet, status and Undo grammar, including 200% text. Dark A1 proves a 16 dp secondary-content loading jump; this prevents an exemplary “every frame” finish. Light lacks that captured transition; code shares the same conditional slot, but a second measured failure is not invented. FLOW-01 has unresolved comparisons, so this is a score of observed stability only. The lowest sub-score is Strong, allowing at most 8.9 here. | stability, craft, conventions |
| Clarity | **8.7** | Strong: clear verbs, useful empty states, scoped search, named Undo and inheritance. Newcomers still have to parse Library/Download Rule hierarchy and Current Entry/Active Playlist/Position vocabulary. Name-free playback’s artwork dependence is an accepted owner tradeoff; the visible Episode route and full screen-reader identity are retained. | plain-language, discoverable-commands |
| Platform fit | **8.9** (partial behavioral scope) | **Looks 9.1; Behaves 8.8; (9.1 + 2×8.8)/3 = 8.9.** Material/dp/sp/insets, Android navigation, native system intents and contextual permissions are deliberate, not a web shell. Source-backed behavior is Strong, with small visual density/identification compromises; lifecycle/assistive/predictive execution remains unverified, not failed. | conventions, stability |
| Interaction & feedback | **8.8** (partial: hardware/assistive scenarios N/O) | Strong: multiple inverse edits, retained failed drafts, atomic name validation, discrete reorder, explicit Rename, local sheet feedback and successful delayed-input probes. Smaller source paths such as downloads/OPML have good progress/recovery design. Speed, complete keyboard paths and live assistive operation cannot be asserted from this evidence. | forgiveness, feedback, user-control |
| **Overall** | **8.7** | Strong and close to the owner’s 9.0 target: the primary finding→Playlist→listening task is coherent and Android-native. The measured loading discontinuity and overgenerous repeated editor rows keep this short of reference-level finish. Lowest category 8.4 → Overall cap 10.0; no blocker/major category cap applies. | content-first, craft, stability |

**What stands between this build and 9.0:** fix the measured loading contraction first. Then refine repeated editor rhythm and the Library’s stacked explanatory hierarchy while retaining 48 dp targets, all conditions, readable metadata and the chosen Android character. The behavior evidence also needs broader verification before claiming an unqualified whole-app exemplary grade: resolve FLOW-01 onset, test a smaller phone/landscape, and run release performance plus real assistive/lifecycle scenarios. These are coverage needs, not additional failures.

## Next step

**Target:** Consistency & polish, the lowest scored category. There is no blocker/major to prioritize. **Root cause:** loading visibility controls header layout participation; removing the indicator also removes the Column’s inter-child spacing, repositioning already-present content. **Anti-pattern:** no exact named anti-pattern is needed; the nearest contrast is **POLISH-06, “Loading frames tell one coherent story.”** An exemplary personal-list app would keep existing items under the person’s eyes while progress changes.

**Candidate 1 (preferred):** reserve the existing 16 dp status footprint and show/hide only its 4 dp indicator and loading semantics. This serves stability/craft, should improve polish without changing density relative to the current busy state, and preserves compact headers, Material styling, the chosen Subscribe control and every owner decision.

**Candidate 2:** put a 4 dp progress drawing in a fixed existing header seam, sharing the same reserved geometry for idle/loading. This can regain the extra 12 dp gap, but needs visual comparison to avoid making progress look like a divider or crowding the Episode count.

**Later craft candidate:** change only two-line ValueRow vertical padding from 16 to 12 dp (about 85→77 dp at default text), retaining the 8 dp label/value gap, flexible height and ≥48 dp target. This makes editing less scroll-heavy while keeping the owner’s one-list design. Compare Settings and Subscription settings at the same time; do not apply a global compression that harms their explanations or enlarged-text layout.

**Validation next:** repeat the exact A1 screenshot pair and measurements, then the five flows in Light/Dark and at 200% text. Separately resolve the four FLOW-01 timing ambiguities and the N/O device scenarios. No fix or iteration was applied in this grading-only task, so there is no before/after acceptance log. All five character elements are **kept**; no borrowed exemplar styling was introduced.
