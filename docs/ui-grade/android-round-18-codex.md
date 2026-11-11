# PodList Android phone — independent UI audit, round 18

Commit graded: `e5a86cf713397586e83c8c5b4f69e459b78b4e78` · 11 November 2026.

## Frame

- **Task:** Find Episodes through Views, Search and the Library, arrange them in Playlists, and listen while retaining each Entry’s Position.
- **Target:** Android **phone**, compact window. Tablet and foldable signals, Mac-only and Web-only checklists are outside this audit.
- **Posture:** Sovereign personal tool, with brief foreground visits and background listening.
- **Audience:** Perpetual intermediate; first-run explanations must also serve newcomers.
- **Nearest exemplar:** Things’ calm personal-tool hierarchy and forgiveness, interpreted through Android conventions. The Android gallery’s BuzzKill is a useful comparison for explanatory choices; Google Calendar is a reference for Material language, not for this phone’s layout. I opened both published images and read the Android gallery and platform-fit grades. They supply comparisons, not inherited scores or behavior evidence.
- **Character:** Fixed blue `#2b50c8` with independently toned dark Material 3 roles; three peer bottom destinations; separate finding and listening lists; a controls-first player without visible podcast/Episode names; compact Podcast pages with disclosed details and a green subscribed check. These signatures are retained in every recommendation.

**Owner decisions:** Retain Material 3 and the accent/dark theme; Views/Playlists/Library bottom navigation; one Add podcasts field; one-list View editor; Rewind summary sheet; OPML in Settings; a paused current Entry after relaunch; visually unnamed player/mini player; immediate Playlist-to-Trash deletion with the exact named message and Undo; compact Podcast header with pull-down description, top-bar Subscribe/check, two-tap dialog-free Unsubscribe and staying on the page; explicit Rename with name on separate lines and Cancel/Save below; case-insensitive unique Playlist/View names; no shortcut reference in phone UI, with Undo/Redo registered in Android’s system panel. These are scored, not proposed for reversal.

**Evidence and independence:** `pwd` was run first and resolved to this worktree. No previous `docs/ui-grade/*.md` report or `UI-GRADE.md` work list was opened. No device was driven, no tests/build were run, and no app, test or configuration file was changed. This is a read-only audit followed by this report, not an improvement iteration.

Evidence abbreviations, used throughout:

- **C** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-18`. Its README was read first. All 54 screenshots in each of `light`, `dark`, and `font200` were visually inspected in contact sheets; the corresponding snapshot corpus and relevant individual snapshots were inspected. `C/light/02-view.png`, for example, identifies an original, unaltered capture. These are the baseline.
- **F** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flow-run/20261111-105345-896`. The summary, raw CSV records, selected screenshot pairs and harness code were reviewed independently.
- **K** = `apps/android/app/src/main/kotlin/app/podlist/`, relative to the worktree. Other source paths below are also worktree-relative.
- **Guide** = `~/Documents/UI_Guidelines/`: README, CRITIQUE, core checklist, rubric, Android Phone signals, exemplar/contrast material and relevant principles. Domain and intent were checked against `CONTEXT.md`, `docs/design/android.md`, `docs/design/product-behaviour.md`, and ADRs 0011–0013.

## Flows

**Tasks actually run by the supplied harness:**

| Flow | Steps and recovery covered |
|---|---|
| A | Views → View → Episode → Add to a Playlist → Play Last → confirmation → Undo → return for next item |
| B | Playlists → Default → Play from here → Now Playing → collapse/pause → Entry menu → Move down → verify order → Undo |
| C | Library → Add podcasts → find fixed 500-Episode feed → Podcast page → Subscribe → type `Long E` while completion is held → completion → Undo → next query; long-list fling separately |
| D | New Playlist → type → Create → settings → Rename → type → Save → Undo |
| E | Search the Library → type `rice` → Save as a View → name → Create View |

**Conditions:** Pixel 10 Pro XL emulator profile, Android 16 / SDK 36, 1344 × 2992 physical px, density 3: **448 dp width**. Light and Dark, one delayed pass plus five undelayed timed passes per appearance. Every HTTP completion in delayed passes receives 2 s delay; Subscribe is explicitly held until pending typing is observed. There are no 200%-text flow runs: `font200` is still-capture evidence. Smaller compact phones and landscape are unobserved. Medium/expanded tablet and foldable targets are excluded by the requested scope.

**Script:** `apps/android/app/src/androidTest/kotlin/app/podlist/FlowRunSmokeTest.kt`; recorder `FlowRunReport.kt`; classifier `apps/android/app/src/flowRun/kotlin/app/podlist/FlowRunClassification.kt` (with domain-module tests). **Measurements:** `F/measurements.csv`, `timings.csv`, `frames.csv`. **Strip:** ordered `A-*.png` through `E-*.png` in F, plus setup/appearance frames. A reported CSV “row” means the file’s **`row` column (snapshot number)**, which repeats for each element, not a physical spreadsheet line number.

**Independent method judgment:**

- This is real Compose UI automation over fixture-backed data, not a model-only simulation. Distinct input, working and completion captures, a held pending request and unchanged typed-value assertions make C a credible late-completion probe.
- FLOW-02/03 are supported in C: Light snapshot **99 → 100** and Dark **280 → 281** retain focus `Search Episodes`, value `Long E`, and field origin **(16, 249) dp**. No replacement or scroll jump is measured. These are bounded passes for the exercised flows, not proof about every network/error path.
- All **146 populated `follow_up_visible` observations are true**. Inspected C completion screenshots show the Undo snackbar above the IME; A’s Add sheet and D’s name form keep their commits visible. FLOW-04 passes at the tested width. Geometry and PNG capture are sequential, so a complete transient-overlay audit is still absent.
- **FLOW-01 is N/O overall.** Preserve the summary’s unresolved subscription-slot comparisons: Light **91 → 94**, **105 → 108**, Dark **286 → 289**, horizontal change **75 dp**. Snapshot age is not change onset. The code sets the pending target synchronously, but that does not supply the missing frame timestamp required by this F-only check.
- An additional classification problem matters: F’s summary excludes Now Playing’s **Pause** as “not a core element.” Pause is a main action. In Light **48 → 49**, its top moves **601.67 → 568.33 dp (−33.33 dp)** as Chapters arrive; the screenshot pair also shows artwork resizing and the action grid gaining Chapters. Captures are at **421 ms and 768 ms** after navigation. The onset interval crosses 500 ms, so this establishes neither an unprompted failure nor a pass. Include transport controls in the core set and sample the onset before assigning a verdict. Do not count the same change again under APPEAR-11.
- The recorder does not audit peer panels, empty shells or cross-screen action placement; those were judged separately from captures/code. No peer panels exist on this phone target.
- **RESP-01 and FOOT-02 remain N/O.** Five timed runs exist, but the build is debuggable on a Mac-hosted emulator. There are 100 step groups and 34 unresolved response intervals. For example, Light A/open-episode’s p75 interval is **0–60.60 ms**, while Dark B/play-entry’s **131.26–292.48 ms** straddles 200 ms. Neither supports a general audience-device pass. Raw fling frames exceed deadlines, but that is not a physical-device shipping-build failure. Missing busy observations and late settle upper bounds do not prove a missed 1 s deadline.

**Confirmed flow failures:** none. FLOW-01 and the timing checks above remain unverified. No stability deduction is taken for an exclusion whose onset cannot be resolved.

## Cross-screen inventory

The following patterns are expanded here to keep cells readable. **G:** bottom snackbar above mini player/navigation, moved above IME; inverse-surface neutral confirmation, past-tense action plus affected object, with Undo. **U:** Undo in that snackbar, then named top-bar Undo when it expires; Redo in the reversal snackbar. **E:** near-cause inline error-colored text with a specific explanation and a local recovery control; field validation uses the supporting slot. **B:** under-app-bar neutral offline/sync notice with local-data explanation and Try again. **M:** Material modal sheet with local feedback above commits; earlier global snackbars dismissed/deferred. These positions are backed by `PlayerPresentation.kt`, `SheetFeedback.kt`, `EditorComponents.kt` and `ScreenFrame`.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views list / View | G after edits, named View | B; local data retained | none | U | Top content, “No Views”/“No matches,” tonal Create/Edit/Add recovery | B, nonblocking | Top-trailing New/Edit; Episode Add/Play trailing | Conditions/count below title; Getting started on root |
| View editor / New View | G, “Updated/Created View…” | E in field or below affected conditions | Condition M; Rename Cancel/Save below field | U | “Any” values; never bare headings | none | Pinned count and trailing Done/Create; Discard beside it | Under “Show Episodes where,” quiet bodyMedium |
| Search | G, “Created View…” | E on saved-View name | Name form below search, Cancel/Create | U | Below field/count, no matches + Clear/Add | B | Search field above results; Save as a View below it | Search scope remains labeled Library |
| Episode detail | G, named Played/Star edits | E in download status; playback G with Try again | Add M | U | “Not in any Playlist”; absent sections omitted | B | Full-width filled Play Now, then action grid | Structured show notes; per-Playlist Positions |
| Playlists list / Entries | G, named add/move | B | Entry menu anchored to trigger | U | Top content, Find Episodes; no-current-Entry text | B | Top-trailing New/Edit; row Play/menu | Active/Clear on Played summary |
| Playlist settings / Rename | G, “Renamed Playlist…”; required “Playlist … moved to Trash” | E under name | Rename field, Cancel/Save below | U | Default limits explained | none | Rename below value; red outlined Delete | Clear on Played and retention consequences beside controls |
| Trash | G, “Restored Playlist…” including suffix if needed | B | none | U | Top content, restoration explanation + Back to Playlists | B | Restore trailing in each row | Retention explained in empty state |
| History | none | B | none | U | Top content, finish an Episode + Show Entries | B | Row opens Episode | Empty-state explanation distinguishes source |
| Listening Timeline | G after Rewind | B | Rewind M | U | Top content, Play from Entries + Show Entries | B | Tap moment, rewind glyph at trailing edge | Hint above moments explains preview/cancellation |
| Rewind summary | Returns to Playlist; G “Rewound Playlist…” | none shown | M: named moment, four summary sections | G/U after commit | Explicit “None” under empty effect sections | none | Cancel/Rewind at sheet bottom | Kept edits and permanent Listening log explained |
| Library | G for Subscription changes elsewhere | E under affected Standalone Subscription; B for server | none | U | Top content, Add podcasts tonal action | B | Add top-trailing; Select Subscriptions after groups | Quiet Download Rule grouping line |
| Add podcasts | G, “Subscribed to…” | E under query or failed result | none | U | Empty initial field; no-result recovery in supporting text | B | Find inside field; filled Subscribe on result | Persistent podcast name/feed-address label |
| Podcast page | G, “Subscribed/Unsubscribed…” | E in header or affected Episode; offscreen failure G/Try again | Check becomes named Unsubscribe in same top-bar region | U | Below count, Refresh/Clear Search action | none beyond local errors | Subscribe/check top-trailing; Episode Add/Play trailing | Visible Show/Hide podcast details; pull-down equivalent |
| Subscription settings / Download Rule | Changed value appears in place; no routine success toast | E below invalid maximum field | M with named radio options and Done | U | Inherited values explicitly Default | none | Full-width value rows open choices; Mark all Played outlined | Explanations under rules, inheritance and threshold |
| Select Subscriptions | G, named/count Download Rule change | none shown | M, choose rule then Change Download Rule | U after edit | Top content, Add podcasts | none | Select all top-trailing; contextual bottom action | “Change Download Rules together” above list |
| Settings / OPML | In-place setting values; OPML detailed inline summary and G on export | E by import/export result with retry | Playback/Appearance/retention M | U | none | none | Value rows, import/export text rows | Brief section help; long choice help in sheets |
| Listening stats | Values update in content | B | Inline info definitions, explicitly toggled | U for global history | Top content, Find something to play | B | Show table/chart below chart/table | Info buttons beside stat headings; chart date/detail |
| Welcome / Connect | Opens chosen local/server Library | E under Server address | Two welcome routes; server form | none | First-run state is the content | Connection working state disables submit | Filled Start; outlined Connect; server commit below field | Address example, optional server and private-network purpose |
| Getting started | Completed step gets check; card stays until Hide | none | none | none | Actual starter Views below card | none | Add podcasts within card | Three numbered concepts, Hide; reopen in Settings |
| Mini player / Now Playing | Transport state, seek position; speed/sleep values in place | G/Try again plus retry transport | Speed/Sleep M; nested Episode/Chapters/Entries | U in expanded player | No player without Cursor; paused restore with Cursor | none | Transport centered; mini art opens expanded sheet | Accessible identity; visual Episode route; chapter information |

**Mismatches:** No verified same-kind message placement/status-color mismatch in this inventory. OPML’s detailed per-feed result is a report, not the short edit confirmation used for a single action. Modal feedback is intentionally local to the modal; this is a coherent contextual adaptation rather than a second arbitrary global-toast position. Pending Subscribe/check share a fixed slot; deliberate two-tap arming expands left as required by the owner. Rename and creation are separate workflows, not contradictory save policies. Still-only/error-path cells supported solely by code are not claimed as exercised flows.

## Checklist

**Coverage: 79.5% (pass 57 · fail 1 · N/O 15 · N/A 6).** Calculation: `(57 + 1) / (57 + 1 + 15) = 58 / 73`. All **79 core IDs** receive exactly one verdict below. Android Phone’s six signals are reported separately with Platform fit; they are not invented extra checklist IDs or added to this denominator. Mac/Web checklists: N/A → Android phone target, excluded from the count. Tablet/foldable signals: N/A → requested phone target.

### Failures by severity

**KEY-08 — minor — accessible in-app shortcut reference absent (owner retained).**

- **Where:** Phone app command discovery, `K/MainActivity.kt:74–81`; Settings’ Help section in `K/SettingsScreen.kt`; `C/light/32-settings-bottom.png` and its Dark/200% equivalents.
- **Evidence:** The Activity registers Undo Ctrl+Z and Redo Ctrl+Shift+Z in Android’s system Keyboard Shortcuts panel. There is deliberately no reference inside the app. The shared checklist literally requires an **in-app** reference and contains no Android exception for this item. System registration is valuable platform integration, but is a different surface.
- **Concrete remediation / owner boundary:** The literal checklist remedy would be a Help → Keyboard shortcuts reference naming those two bindings. The owner expressly forbids that phone UI, so **do not implement that remedy**. Retain the system-panel registration. Record this as an accepted minor deviation, not the next implementation target. Minor severity creates no score cap.

**No verified blocker or major failure.** Craft gaps below are rubric judgments, not additional checklist failures disguised under new IDs.

### Complete verdict ledger

| ID | Verdict | Evidence / limit |
|---|---|---|
| FLOW-01 | N/O | Unresolved 75 dp slot transitions; Pause −33.33 dp interval crosses 500 ms. See Flows and F snapshot numbers. |
| FLOW-02 | pass | F 99→100 and 280→281 retain field focus and scroll through delayed Subscribe. |
| FLOW-03 | pass | Same pairs preserve newer `Long E`; draft guards in FormDraftState, Search/Add and creation paths. |
| FLOW-04 | pass | 146 true follow-up visibility observations; inspected IME/snackbar and sheet commits at 448 dp. |
| FLOW-05 | N/A | No peer side-by-side panels on this phone target. |
| FLOW-06 | pass | C 13/15/18/30/43: informative empties or explicit None; headers not left bare. Conditional sections checked in code. |
| FLOW-07 | pass | Single-field forms commit beneath field; View editors share pinned footer; sibling lists use trailing row commands. C 04/05/19/41. |
| KEY-01 | N/O | Compose controls and long-click semantics exist; no end-to-end attached-keyboard operation/trap run. |
| KEY-04 | N/O | Focused name/search/server fields shown; whole-screen focus order, reverse traversal and focus visibility untested. |
| KEY-06 | pass | MainActivity uses Z keycode plus Ctrl/Shift, with no punctuation-based or bare-letter global accelerator. |
| KEY-07 | N/O | No Page Up/Down, Home/End or Space/Shift-Space run over scrollable phone content. |
| KEY-08 | fail | Minor; owner-retained absence of an in-app reference; system panel registration verified above. |
| DLG-01 | pass | Undoable edits/deletion use snackbar/in-place feedback; permission explanation is an actionable first-use condition. |
| DLG-02 | pass | IncomingContent notification title states the specific choice; informative purpose text adds consequence. |
| DLG-03 | pass | Brief result-oriented Continue and a native permission-deferral Not now; Rename uses Save/Cancel; Rewind names its action. |
| DLG-04 | N/O | Safe touch cancellation/onDismiss paths exist, but Esc routing through all Compose dialogs is not established here. |
| DLG-05 | pass | Delete View/Playlist are red outlined explicit actions; no surprise destructive default. C 04b/16c; ViewEditor/PlaylistSettingsScreen. |
| DLG-07 | pass | Sheets have one Done or commit row; system Back/onDismiss provides cancellation/dismissal, Rewind has explicit Cancel. No Cancel/Done/Back trio. |
| DLG-09 | pass | Entry/Episode/Podcast DropdownMenus are enclosed with their triggering control, single-layer contextual commands. C 12. |
| CTRL-02 | N/A | No parent/child checkbox hierarchy; flat CheckRow selections retain checkbox semantics. |
| CTRL-03 | pass | OutlinedTextField labels remain independent of values in Search, Server, Add, Rename, numbers and Sleep; C 04c/21/41b/61. |
| CTRL-04 | pass | NumberInput formatting/validation, duplicate/empty name errors and secure server address validation; full-width phone fields. EditorComponents/NameEditor/ServerScreen. |
| CTRL-05 | pass | Native buttons/ripple states, semantic tonal/filled/outlined emphasis; large audio transport is task-specific. EditorComponents/PlayerPresentation. |
| CTRL-06 | pass | Menus group secondary commands; Play/Add/New/Subscribe remain visible outside them. C 02/03/11/59/60. |
| CTRL-07 | pass | Library search labeled as such; podcast field under podcast heading; Add has name/feed-address label. No displayed history to clear. |
| CTRL-08 | pass | AndroidDownloads and Settings/OpmlActions implement determinate known-length progress, indeterminate unknown lengths, Cancel/Stop and resume/retry. |
| LIST-01 | pass | Content lists are appropriate Android feeds; optional daily-stats table presents date/value columns. ListeningStatsScreen. |
| LIST-02 | pass | Screen/section headings supply list context; daily table uses Day and Time listened, no ending punctuation. |
| LIST-03 | pass | View editor Sort sheet exposes explicit newest/oldest/shortest/longest order; Android menu/panel adaptation. |
| LIST-04 | N/A | No dense multi-column name table requiring alternating rows or middle-ellipsis filenames. |
| LIST-05 | pass | Podcast details toggle expands its own header; query/expanded persist in PodcastBrowsing/BrowsingContext. |
| LIST-06 | pass | Selected bottom destination and Playlist tab marked; radio choices and batch checkboxes expose chosen values. C 06b/09/11/50. |
| LIST-07 | N/O | Touch opening/selection works in captures/code; keyboard focus and arrow movement across selectable lists not exercised. |
| DATA-01 | pass | FormDraftStore/DraftWriteBuffer, disposal/onStop flush, read-only submits, clearIfUnchanged and inline save failure preserve drafts. C 41→41b; FormDraftState/MainActivity/NameEditor. |
| DATA-04 | pass | EditHistory and inverse changes support multi-step Undo/Redo; Ctrl+Z/Shift+Ctrl+Z registered, native field undo protected. F A/B/D plus HistoryActions. |
| DATA-05 | pass | revealChanges and EntryList reveal restored/moved Entries; settingReveal scrolls settings to restored value and gives descriptive confirmation. |
| DATA-06 | pass | BrowsingContext persists destination/stacks, anchors, tabs, queries, selection and chosen stat day; missing IDs pruned. Playback restore is paused. Runtime recreation remains separately unobserved. |
| DRAG-01 | pass | EntryDragging implements handle-based reorder; visible Entry menu Move up/down and accessibility actions provide alternatives. |
| DRAG-03 | pass | Drag dispatches the same moveEntry as commands; captures inverse position and records Undo. AppModel/EntryDragging. |
| DRAG-05 | N/O | Code provides source lift/reset and insertion cue; no captured drag/failed-drop sequence to verify the complete visual contract. |
| DRAG-06 | pass | EntryDragging edge loop scrolls destination; retained/revealed Entry is highlighted and focused after move. No transferable slow external drop is offered. |
| PTR-03 | N/O | No attached-pointer gesture/cursor evidence. |
| PTR-04 | pass | Icon actions, transport and subscription control use ActionTooltip/TooltipBox; text controls identify themselves. EditorComponents/PlayerPresentation/PodcastPageScreen. |
| APPEAR-03 | pass | Independent Light/Dark semantic palettes, UiModeManager contrast listener and opaque surfaces; no shadow-only required boundary. MainActivity. |
| APPEAR-04 | pass | Measured token pairs below; text, selected rows, subscribed check, primary actions pass in both appearances. No confirmed essential foreground contrast failure. |
| APPEAR-05 | N/O | No system Remove animations capture/run; Compose animation APIs alone do not prove every custom transition honors the setting. |
| APPEAR-09 | pass | Consistent 24 dp Material-style vectors, coherent outlined/filled states; familiar play, skip, check, star and overflow meanings. C 01/03/08/50. |
| APPEAR-10 | pass | Buttons/surfaces separate tools from content; quiet separators and meaningful current/selected states; C 03/11/16c/50. |
| APPEAR-11 | N/O | Settled/input samples and launch-theme code do not prove flash-free transitions. Known transport relocation remains owned by FLOW-01. |
| TYPE-02 | pass | One system font; normal/medium/semibold roles, no thin UI weights. MainActivity typography. |
| TYPE-03 | pass | Body 16/24, metadata 14/21, annotations 12/18 sp; enlarged text shown across C/font200, no forced content scale. |
| TYPE-05 | pass | Captured 200% text wraps/reflows; grids become two columns, period tiles stack, tabs scroll, long forms/sheets scroll. No essential text clipping established. |
| TYPE-06 | N/O | Leading is specified at 150% for body text, but fixture show notes/descriptions lack three typical full reading lines to establish the full measure test. |
| TYPE-07 | pass | No long all-cap app prose; emphasis restrained; links underlined, no app prose styled as both bold and italic. Publisher text is exempt. |
| TYPE-08 | pass | strings.xml uses curly punctuation, ellipsis and proper dashes; addresses/code/user titles remain literal. |
| COPY-01 | pass | Specific action verbs and consistent domain terms, including Played, Position, Entry, View and Playlist; Android touch instructions use tap. |
| COPY-02 | pass | Name, network, feed, storage and OPML failures give practical recovery near cause; playback errors offer Try again. strings.xml and local error composables. |
| COPY-03 | pass | History/Trash/stats/Library/View empty states identify next action, commonly with tonal recovery button. C 13/18/30/43. |
| COPY-04 | pass | Sentence-style UI copy preserves intentional capitalized domain nouns; action labels and help use consistent patterns. |
| AX-01 | N/O | Condensed snapshots conflict with intended labels for nested buttons; see explicit accessibility uncertainty below. No blanket pass or inferred blocker. |
| AX-02 | pass | Current Entry text/edge indicator, checkbox selection, radio state, subscribed check, field error text and chart date details supplement color. |
| AX-04 | pass | Discrete move commands/custom actions, visible details disclosure and chart day buttons/table supplement drag/pull-down/chart gestures. Live assistive-input traversal unobserved. |
| AX-05 | pass | No essential UI information is supplied only by sound; media has visible Play/Pause/seek/error state. Publisher transcripts are not assumed to exist. |
| START-01 | pass | Local-first opening, meaningful Loading local Library placeholder, local-data use during sync and Standalone first run. C 40–43; AppModel/PodListShell. |
| START-02 | pass | Getting started can Hide, stores hidden state and reopens from Settings; server setup is optional. GettingStarted/AppModel. |
| START-03 | pass | Local choice/rule explanations, stat info, explicit details disclosure and skippable first-run checklist teach the current task. |
| START-04 | pass | Download notification request occurs on first download, not launch; SAF picker avoids broad storage permission. IncomingContent/AndroidDownloads/manifest. |
| START-05 | pass | Permission explanation is a full specific sentence: progress and stopping a download; Continue invokes native permission request. |
| START-06 | pass | No account/sign-in wall; Start on this phone is primary. C 40; ADR 0012 and AppModel. |
| START-07 | N/A | No account creation/deletion feature; server connection is not a new account. |
| EDIT-02 | pass | Native Compose text editing/selection; app history shortcuts bubble after native handling, no clipboard-changing Delete override. |
| EDIT-05 | pass | Selectable show notes/descriptions plus Copy feed address and native ACTION_SEND text/link representations. ShowNotes/Sharing/PodcastPageScreen. |
| WIN-03 | N/O | 448 dp portrait and enlarged text verified; no narrower compact or landscape evidence. Flexible modifiers do not prove all phone sizes. |
| TOOL-06 | pass | Collapsed player has artwork/bar reopening; contextual chrome returns on selection clear/Done/Back; explicit Collapse preserves playback. |
| SIDE-03 | N/A | No independently hideable phone sidebar or split pane. |
| SIDE-04 | N/A | No simultaneous phone navigation pane with adjacent detail; bottom navigation selection covered by LIST-06. |
| SET-01 | pass | Global playback/OPML/retention/server/appearance in Settings; per-Subscription inheritance and per-Playlist settings stay local. C 06/16/24/32. |
| RESP-01 | N/O | Debug emulator timing, unresolved frame intervals and no representative audience-device run; see Flows. |
| FOOT-02 | N/O | Raw emulator fling frames are supplied; no shipping-build physical-device refresh-rate result. |

**N/O:** FLOW-01, KEY-01, KEY-04, KEY-07, DLG-04, LIST-07, DRAG-05, PTR-03, APPEAR-05, APPEAR-11, TYPE-06, AX-01, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, CTRL-02, LIST-04, START-07, SIDE-03, SIDE-04. These are scope/absent-feature exclusions, not dependents of a failed parent.

**Accessibility uncertainty:** `C/light/02-view.txt` lists parent groups containing “Play Now, Add to a Playlist” with child buttons @e29/@e32 unnamed. `C/light/01-views.txt` similarly groups mini-player descriptions while @e49/@e52/@e55/@e58 are unnamed. At 200%, actions placed outside clickable rows expose their names individually. This is a concrete ambiguity, not proof that all names are missing: the snapshots expressly collapse Android helper nodes, `ActionIcon` and transport Icons supply labels, and the Compose flow can locate those named controls. A raw Android accessibility hierarchy and focused TalkBack traversal must settle whether descriptions are hoisted by snapshot normalization or lost in the exported nested-clickable tree. If actual focus lands on unnamed controls, **AX-01 becomes a blocker**, Interaction & feedback caps at 4.9 and Overall at 6.9. Do not award an accessibility-complete claim from this audit.

**Other unverified surfaces:** Live TalkBack, physical keyboard/pointer traversal, predictive Back animation, rotation/process-death execution, Sharesheet targets, media notification/lock screen, Android Auto/Bluetooth/audio-focus behavior, launcher shortcut execution, actual drag sequence, OPML-in-progress layout, contrast-preference runtime, reduced motion and real publisher feeds. Code can establish wiring and persistent stores; it cannot establish all runtime integration outcomes.

## Scores

Scores cover the inspected phone, not another device class. Behavioral scores use code and supplied flows, with unverified clauses explicitly above; they are not screenshot-only guesses. Same score in Light and Dark unless stated. The 200% observations inform the app-level score rather than forming a separate platform grade.

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong, close to Exemplary: deliberate 17/24 titles and 14/21 metadata, restrained system font and readable enlarged text. Read-only Rename makes generic “Name” 16 sp/onSurface while the actual name is smaller 14 sp/onSurfaceVariant (`NameEditor.kt:49–50`, C 04/16c), weakening semantic emphasis. Long publisher prose remains insufficiently sampled. | hierarchy, accessibility, craft |
| Hierarchy | **8.7** | Strong: one filled Episode Play Now, quiet metadata, distinct selected/current states, and clear three-way navigation. At 200%, automatically splitting all page-action bars leaves a spacious nearly titleless first tier on Podcast pages, while the actual headline begins below a second action tier (C/font200/60–63; EditorComponents.kt:101). Stored-name hierarchy also makes the label more prominent than the object. | content-first, hierarchy |
| Spacing & density | **8.6** | Strong: 16 dp keylines, 4/8/12/16 dp relationships, reliable targets, forms and sheets that reflow. At 200%, non-Playlist Episode rows keep 14 dp top/bottom content padding and add a separate 48 dp action row; Playlist rows already use 8 dp (`PodListScreens.kt:500,516`). C/font200/02/21/60 show the resulting repeated vertical tax. Room can be recovered without shrinking text or targets. | craft, conventions, adaptability |
| Color & contrast | **9.1** | Exemplary within the observed appearances: semantic restrained blue, independent dark roles, green only for subscribed status and red for errors/destruction. OnSurfaceVariant/surface: **8.86:1 Light, 10.89:1 Dark**; primary/selected container **5.28:1 / 5.48:1**; subscribed foreground/background **6.57:1 / 7.82:1**. Computed from MainActivity’s exact sRGB tokens. Preference variants exist in code, but were not runtime stress-tested. | color-restraint, accessibility |
| Iconography | **9.0** | Exemplary visible craft: coherent vector family, consistent 24 dp action symbols and 48 dp targets, outlined/filled state pairs, distinct Chapters/Entries/Played/Subscribed meanings, no decorative icon carpet in Settings. Larger skip symbols serve the transport’s task. Exported nested-button labeling is explicitly AX-01 N/O, not silently credited here. | conventions, craft |
| Consistency & polish | **8.8 (stability 8.8 Light / 8.8 Dark)** | Strong: shared buttons, dividers, empty-state recovery, modal-local feedback and stable pending-search seam; no verified inventory mismatch. C’s held completion preserves typed input/focus/scroll and the 48 dp subscription slot. FLOW-01 transport/slot onset is unverified, so this cannot substantiate “every step holds.” The observed stable subset approaches Exemplary; the whole transition/lifecycle finish is not demonstrated. | stability, craft, conventions |
| Clarity | **8.8** | Strong: consistent vocabulary, named Undo results, explicit inheritance, helpful empties and local stat definitions. The owner’s no-visible-names player is controls-first and understandable, but shared podcast artwork/initials does not visually distinguish different Entries from that podcast; identity then requires Episode. That accepted tradeoff is scored and retained. | plain-language, feedback, character |
| Platform fit | **8.9** | Strong: **Looks 8.8; Behaves 9.0; (8.8 + 2×9.0)/3 = 8.9**. Native bottom destinations, app bars, sheets, system Back wiring, share intents, SAF, contextual permission, persisted context and native system shortcut reference. Small-phone/landscape, predictive animation and exported accessibility behavior remain bounded by N/O. Signal ledger below. | conventions, user-control, stability |
| Interaction & feedback | **8.8** | Strong: several-step Undo/Redo with contextual reveal, durable drafts, meaningful errors/retries, reversible reorder, OPML stop/resume and paused player restore. F exercises key undo paths and a real pending-input probe. KEY-08 is an owner-retained minor deviation. Full assistive/keyboard operation, motion and physical-device latency are unverified, so “keyboard-fluent and instant everywhere” is not established. | forgiveness, feedback, keyboard-efficiency |
| **Overall** | **8.8 / 10 — Strong** | Finding, arranging and listening are coherent and at home on Android. The strongest visible work is palette/icon discipline; repeated enlarged-text spacing and the reversed saved-name emphasis keep the craft short of a reference example. The owner’s **9.0 target is not yet established**. This is a holistic score, not an arithmetic average. | content-first, character, craft |

**Caps:** No verified major/blocker cap applies. The minor KEY-08 deviation has no cap. Stability is in the Strong band, so Consistency & polish is limited to 8.9 and its 8.8 respects that. Overall is within 2.0 of the lowest category (Spacing & density 8.6). N/O is not a failure or an invented numeric penalty; the scores describe the verified portions and do not certify the unobserved ones.

### Android Phone platform signals

The required comparison with Google Calendar’s published Material surface found no imported iOS chrome, symbols or navigation model. Calendar’s foldable image was used only for visual vocabulary; no foldable layout requirement was applied. BuzzKill provides a same-phone comparison for explicit option consequences: PodList’s flatter choice rows avoid that example’s oversized-card tax.

| Signal | Verdict | Evidence and remaining boundary |
|---|---|---|
| L1 Navigation | Native | Three equal bottom destinations, selected states, Up only inside stacks, independent retained stacks. C 01/10/20/42; PodListScreens. |
| L2 Visual language | Native | Deliberate M3, semantic tonal roles, coherent Material vectors and system typography in both appearances. Custom blue is permitted and owner-fixed. |
| L3 Density/text/system frame | Adapted, observed compact phone | dp/sp, 48 dp controls, body ≥12 sp, edge-to-edge and safe/IME padding; 200% reflow captured. Extra vertical overhead is a craft weakness, not proof of a Foreign import. Other compact sizes/landscape N/O. |
| B1 System navigation | Adapted, code-supported | NavigableListDetailPaneScaffold handles history; player PredictiveBackHandler prioritizes nested pages/collapse; modal/selection/armed-Unsubscribe Back paths present, no edge swipe takeover. Predictive-animation execution N/O. |
| B2 Preferences/access | Native wiring; AX-01 unresolved | System/Light/Dark and contrast listener; scalable content and labels/states/custom actions. No forced in-app language. Condensed nested-button snapshots require raw-tree/TalkBack verification; no unconditional access-complete verdict. |
| B3 Surfaces/lifecycle | Native wiring, runtime partial | ACTION_SEND chooser, SAF OPML, notification channel/first-use permission, durable drafts/browsing, manifest shortcut declarations and system shortcut group. Actual external surfaces and process-death execution N/O. |

### What stands between this build and 9.0

1. **Tune enlarged-text density before changing the design.** C/font200/02, 21 and 60 retain repeated padding above a second action row. Start by matching the 8 dp Playlist content-row vertical padding at enlarged sizes, saving **12 dp per Episode row** while keeping every 48 dp command target, full metadata and wrapping title. Reassess the large-text top-bar blank tier separately; do not indiscriminately reduce accessible control space.
2. **Promote the saved name over the generic field label.** In `NameEditor.kt`, use a quiet 14 sp label and a 17 sp/onSurface name, with its own wrapping lines and Rename below. Preserve the owner’s explicit Save/Cancel workflow. This would close a specific Typography/Hierarchy gap rather than add decoration.
3. **Finish the transition evidence.** Include Now Playing’s transport in the core element set, timestamp Chapters/buffering changes, and resolve the 75 dp subscription-action onset intervals. Retain the existing pending-typing test. Raw accessibility/TalkBack and a physical-device shipping-build flow run are validation gaps, not presumed app defects. They are necessary before claiming the full Exemplary behavioral anchor.
4. **Retain the accepted identity tradeoff.** The unnamed visual player stays. Its accessible identity and direct Episode route are important; test the real exported accessibility path instead of proposing visible titles again. KEY-08 likewise stays owner-retained with Android’s native panel.

## Next step

**Target:** Spacing & density, the lowest scored category (8.6). The sole verified checklist failure is explicitly owner-retained and is skipped under CRITIQUE step 4.

**Anti-pattern:** No exact named anti-pattern fits. “Touch-scale desktop” would be the wrong diagnosis for a phone. This is repeated excess padding after a legitimate large-text reflow.

**Root cause:** A row that has already moved its commands below the text retains the default content-row 14 dp top/bottom padding, so two independent vertical allowances accumulate for every result.

**One candidate change:** In `K/PodListScreens.kt:500`, use **8 dp vertical content-row padding when `stacked` is true**, matching Playlist rows; retain the current 14 dp at default size, 16 dp horizontal gutter, 48 dp action targets, labels and wrap rules. Expected saving: 12 dp per enlarged Episode row.

**Principle:** `craft`, `adaptability`, `content-first`; nearest contrast is SPACE-04 “Density follows the work,” tempered by TYPO-07 “Text enlargement reaches the content.” Things would reclaim redundant space around readable content, without removing the commands. Resolve the tension in favor of legibility and capability: never gain density by shrinking type or touch regions.

**Expected effect:** Better Spacing & density and possibly Hierarchy; no intended Typography/Iconography/Clarity regression. Risk is insufficient separation between long metadata and trailing actions. Compare C/font200/02/21/60 against new captures and re-run the same flow before accepting. All five signature elements survive. **No change was applied in this audit.**
