# PodList — Android phone — round 6, independent Codex audit

## Frame

- **Task:** Find Episodes through Views and Search, inspect podcasts before subscribing, and listen through Playlists with recoverable edits and independent Entry Positions.
- **Target:** Android **phone**, compact window only. Tablet, foldable, medium and expanded window design are excluded by the brief.
- **Posture:** Sovereign browsing and library management, with background playback and transient action sheets.
- **Audience:** Perpetual intermediate; first-run guidance must also teach newcomers Views, Playlists and the optional server.
- **Nearest exemplar:** Things for calm hierarchy and recoverable actions; the Android gallery's BuzzKill for explanations beside consequential choices. Google Calendar supplies Android frame/navigation calibration, without importing its tablet layout into this phone audit.
- **Character:** Owner-fixed native Material 3, PodList blue seed `#2b50c8`, independent dark tonal palette; three bottom destinations with separate stacks; text-rich Episode rows; artwork-led, visually nameless playback; plain domain-specific language.

**Owner decisions:** Retain Views / Playlists / Library navigation, one-field Add podcasts, the single-list View editor, Rewind summary sheet, OPML in Settings, paused current Entry after relaunch, no visible podcast/Episode names in either player, immediate Delete Playlist with Undo, compact Podcast header with description behind pull-down, top-bar Subscribe and the subscribed green check, plain confirmation before Unsubscribe followed by Undo while staying on the page, and no phone shortcut reference. These are scored, including caps, but are not redesign targets. The pull-down also has a visible “Show podcast details” alternative, which preserves the owner's arrangement.

**Baseline and independence:** Worktree `pwd` was `/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-492ac97e-50e20c4e3f2a1f16`; HEAD is `17bc122`, matching the supplied capture README. No prior `docs/ui-grade/*.md` report or `UI-GRADE.md` work list was read. No app, test or configuration was changed; no device was driven and no commit was made.

**Evidence notation:** `C/` below means `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-6/`. Each screen reference includes its PNG and matching accessibility TXT unless stated otherwise. All 49 capture positions were examined in `light`, `dark` and `font200`: 147 screenshot/snapshot pairs. The capture identifies a Pixel 10 Pro XL emulator, Android 16, 1344 × 2992 physical pixels, compact window, font scales 1.0 and 2.0. Density is not stated; pixel dimensions have **not** been converted to dp. Component dimensions below come from code.

Source review covered the Android manifest, theme, navigation, player, selection, editors, error/progress/Undo handling, browsing/draft stores, download and playback adapters, plus `CONTEXT.md`, the Android/product design documents and ADRs 0011–0013. Source paths below are relative to this worktree; `K/` abbreviates `apps/android/app/src/main/kotlin/app/podlist/`.

Calibration used `~/Documents/UI_Guidelines` README, CRITIQUE, core checklist, rubric, Android Phone signals, Android gallery and Android comparison grades. BuzzKill's phone action sheet and Calendar's published week screen were opened as visual references. Their published stills supply craft comparisons, not proof of their behavior or current Android metrics.

## Flows

**Tasks represented by separate captured states:** Views → Episode → add to Playlist; edit/create a View; Library Search → results; Playlist → Entries/actions/History/Listening Timeline → Rewind summary; Library → Subscription settings/selection; Add podcasts → unsubscribed Podcast → Episode filtering → expanded description → Subscribe; subscribed green check → Unsubscribe question; Settings → playback/OPML/stats; Welcome → connect or Standalone Device → starter Views and empty Library; mini player → Now Playing.

**Tasks run by this reviewer:** None, as instructed. **Widths:** one supplied compact phone configuration. **Appearances:** light, dark, light at 200% text. **Timed runs/device:** no timed runs; capture device as above. **Script location, flow measurements file and screenshot strips:** none supplied. These files are a state tour, not an instrumented transition strip.

**Flow failures:** None established. FLOW-01–04 are N/O; FLOW-03's code can expose possible asynchronous draft-clearing races, but no delayed-completion run or measured before/after strip was supplied, so no stability finding or cap is asserted. Stability sub-score is **N/O**. FLOW-06/07 have limited static verdicts below. Do not interpret them as a transition-stability pass.

Live TalkBack, attached-keyboard navigation, rotation, system process-death restoration, predictive Back animation, actual Sharesheet/notification/lock-screen behavior, Auto, Bluetooth, audio focus, launch shortcuts, drag operation, running OPML import and real publisher feeds remain unverified. Code establishes some implementations, not their measured end-to-end operation. Full task removal/cold relaunch in DATA-01 is distinguished from Android recreating an Activity with its saved-state Bundle.

Some captures have left-clipped app-bar text (for example `C/font200/05-new-view.png` and `27-select-subscriptions.png`). Other states show intact bars; a still does not settle whether the capture landed during navigation animation. These are recorded as an evidence limitation under APPEAR-11, not asserted as settled-layout failures. Snapshot `[preview: …] [truncated]` is the capture tool's text abbreviation, not proof that the app truncates that paragraph.

## Cross-screen inventory

“None” means no such element on the inspected surface or implementation; unexercised code states are explicitly marked. **Shared feedback** means the snackbar above player/navigation, transferred into the active modal sheet by `SheetFeedback.kt`; light uses inverse dark fill, dark uses inverse light fill, with accent-colored action.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | Shared feedback after edits, code | App-bar sync text + Retry, code | None | Shared feedback and history action | Inline no Views / no matches, create/edit/add route | None | Root + top-trailing; row Add/Play trailing | Starter View descriptions; dismissible Getting started card |
| View editor / New View | Changes apply live; pinned match count; shared feedback, code | Named field or condition error, error color; draft-kept hint | Condition choice sheet | Pinned bottom Undo; history available in sheet | “Any” / all matches values | None | Pinned bottom-trailing Done | “Show Episodes where”; changed-value labels |
| Search | Shared feedback for saved View, code | Sync feedback; naming field error, code | Centered naming dialog | Shared history | Inline no matches + Clear Search; no Subscriptions + Add | Naming dialog while open | Save as a View directly below query; search via IME | Explicit Library scope in persistent field label |
| Episode detail | Shared feedback for state edits, code | Download status beside retry; playback failure via shared feedback, code | Add sheet | Shared feedback/history | “Not in a Playlist”; pending metadata text | None | Full-width Play now; secondary icon row | Device download status, per-Playlist Positions, show notes |
| Playlists / Entries | Shared feedback for moves/removal, code | Shared sync/retry | Add sheet | Shared feedback/history; Trash recovery | Inline no Entries + Find Episodes; no current Entry text | None | Root +; per-Entry Play and anchored menu | Active Playlist, Clear on Played and Cursor text |
| Playlist settings / New Playlist | Live rename/toggle; created Playlist opens, code | Inline name validation | None | Shared feedback/history | None | None | Create under name; Delete in settings | Clear on Played consequence; Trash retention explanation |
| Trash / History | Shared feedback for Restore, code | Shared sync/retry | None | Restore is reversible; history action | “No deleted Playlists”; History explains completion + Show Entries | None | Restore trailing row, code | Deletion date, code |
| Listening Timeline / Rewind | Returns to Entries + shared “Rewound”, code | Shared sync/retry | Full-height Rewind summary sheet | Shared feedback/history | Inline no Timeline + Show Entries; “None” under empty preview groups | Rewind confirmation sheet | Trailing timeline affordance; Rewind bottom-trailing | What goes back, becomes Unplayed, returns, and stays |
| Library / selection | Shared feedback for rule edits, code | Sync notice; feed refresh failure/retry, code | Download Rule choice sheet | Shared feedback/history | Inline no Subscriptions + Add; explicit empty rule groups | None | Root +; Add row; selection toolbar | Library Search scope; Download Rule grouping |
| Add podcasts | Row becomes Subscribed + shared feedback, code | Inline lookup error; named row subscription error, code | None | Shared feedback/history | Inline lookup result explanation, code | None | Find podcasts below field; Subscribe trailing result | Persistent name-or-feed-address label |
| Podcast page | Green check + “Subscribed” shared feedback (`63`) | Inline loading/action failure + Try again, code | Centered Unsubscribe question (`28`) | Shared feedback/history; stay on page | Inline no Episodes / no search matches + refresh/clear, code | Owner-required Unsubscribe dialog | Subscribe top-trailing; Episode Add/Play trailing | Author, details toggle, full title in content, filtered count |
| Subscription settings / Download Rules | Live values + shared feedback, code | Numeric error beside field in choice sheet, code | Native choice sheets | Shared feedback/history | Default / Stream values explain inheritance | None | Value rows; Mark all Played below | Scope “on this Device”, inherited defaults and rule consequences |
| Settings / OPML | Export shared confirmation; import summary inline, code | Error beneath OPML rows with retry; failed feeds named, code | System document picker, code | Import history action, code | None | None | Grouped value/navigation rows | Section labels, explanations; Getting started can reopen |
| Listening stats | Content updates; none required | None on captured stats page | None | None | Inline no listening yet; tells person to Play an Episode | None | Chart day buttons / Show table | Scale, dates, numbers and About your stats |
| Welcome / Server | Navigation into Library after connection, code | Field-specific connection error + retry action, code | Server optional | None | Standalone choice is ready | Optional notification explanation only after download request, code | Start on this phone; Check and connect below address | Purpose, optional server and saved-address scope |
| Mini player / Now Playing | Play/Pause, Position and timer state; code/captures | Retry/error state; buffering indication, code | Speed / Sleep sheets | Global edit history; no playback Undo claimed | Absent without a current Entry | None | Central Play/Pause; skip controls flank it | Screen-reader identity; Episode and Entries routes |

**Inventory findings:** Success and undoable edit feedback consistently use the shared inverse snackbar. Inline validation, field labels and recovery actions are broadly coherent. An OPML summary persists inline because it contains per-feed results; that is a task-specific summary, not a misplaced simple success toast. Pinned View-editor Undo and global history provide a continuing recovery route after the snackbar expires. Different creation actions reflect different tasks (live View editing versus explicit Playlist creation), so they are not counted as FLOW-07 mismatches.

There is a substantive cross-screen **draft-lifetime mismatch**: New Playlist and View editing use durable raw drafts, whereas Playlist rename uses only saveable UI state and persists valid names. That is recorded once as DATA-01 below. No numeric stability score is derived from this inventory without a flow run.

## Checklist

**Coverage: 76.4%** — **pass 51 · fail 4 · N/O 17 · N/A 7**, 79 core items total. Calculation: `(51 + 4) / (51 + 4 + 17) = 55 / 72`. Phone signals are separately assessed under Scores and are not added to the core-ID denominator. Mac-only and web-only checklists: **N/A → Android phone target**, outside this denominator. Tablet/foldable additions are out of scope.

### Failures by severity

1. **[DATA-01] blocker — An unfinished Playlist rename is not preserved across full task removal and cold relaunch.** **Where:** non-default Playlist settings. **Evidence:** `K/PlaylistSettingsScreen.kt:24` initializes raw `name` from `playlist.name` with `rememberSaveable`; line 35 records only names passing `PlaylistNames.validate`. A duplicate or blank intermediate value is held only in UI saved state. `apps/android/domain/src/main/kotlin/app/podlist/domain/BrowsingContext.kt:12` persists routes/scrolls/tabs/search, not this rename, and `apps/android/data/src/main/kotlin/app/podlist/data/BrowsingStore.kt:7` reloads that context, not raw field content. By contrast, New Playlist uses `rememberDraftText` at `PlaylistSettingsScreen.kt:55`. Once a full relaunch has no saved-state Bundle, the settings route can return but the unfinished raw rename cannot; it initializes from the last accepted name. This is a code-established cold-relaunch gap, not a claim that ordinary Android system process death loses `rememberSaveable` state. The supplied settings capture is the Default Playlist, so it cannot visually exercise this path. **Concrete fix:** use a per-Playlist durable raw-name draft through the existing `FormDraftState`, keep validation separate from that raw draft, and provide explicit discard/reconciliation when finishing or deleting. Preserve valid live renames and their Undo grouping. **Cap:** Interaction & feedback ≤ 4.9. No loss of the saved Playlist or its Entries is alleged.

2. **[APPEAR-04] major — Light-theme unselected listening bars are below 3:1.** **Where:** Listening stats → 30-day interactive chart. **Evidence:** `K/ListeningStatsScreen.kt:77` draws every nonselected nonzero day using `primary.copy(alpha = .55f)`; lines 86–92 draw those bars against the page surface. `K/MainActivity.kt:68` onwards defines light primary `#2b50c8` and surface `#faf8ff`. Straight-alpha compositing gives approximately **#889ce1**, with **2.53:1** contrast against that surface, below the Android 3:1 non-text threshold. These are recurring data marks used to inspect days, not disabled controls or decoration. The supplied populated capture has only the selected day nonzero, so this failure is established by the rendering code, not claimed as a sampled pale bar in `33`. Dark unselected bars compute approximately **#6d7497 / #121318 = 4.06:1** and pass. **Concrete fix:** use an opaque semantic chart color, or increase the light unselected opacity to a measured value that clears 3:1; retain selection through a marker/outline and the existing selected-date text. Validate both themes and high contrast. **Cap:** Color & contrast ≤ 6.9.

3. **[DLG-01] major — Routine, undoable Unsubscribe requires confirmation. Owner-fixed exception.** **Where:** subscribed Podcast page's green check. **Evidence:** `C/{light,dark,font200}/28-unsubscribe`; `K/PodcastPageScreen.kt:249` opens the confirmation, and `changeSubscription` at line 112 onward offers subscription history afterwards. This is an intentionally undoable action preceded by a modal question, which fails the literal DLG-01 rule. The dialog is otherwise specific, concise and safely cancellable. **Concrete fix/disposition:** none authorized; retain the owner's confirmation, stay-on-page behavior and subsequent Undo. Record this as an accepted product tradeoff, not implementation work. **Cap:** Platform fit ≤ 6.9, even if other phone signals improve.

4. **[KEY-08] minor — No in-app shortcut reference. Owner-fixed exception.** **Where:** phone Settings/help. **Evidence:** `K/SettingsScreen.kt` offers Getting started but no shortcut reference; `K/MainActivity.kt:50` handles standard Ctrl+Z / Ctrl+Shift+Z. The owner's explicit instruction is never to list keyboard shortcuts on the phone. This fails the shared checklist's literal reference requirement; it is not an imported expectation for a Mac menu bar, nor a claim that phone users need keyboard hints in the normal UI. **Concrete fix/disposition:** none authorized; retain the omission and record the exception. **Cap:** none for minor severity. This exception does not make the Android navigation Foreign.

**Contrast method:** WCAG sRGB linearization and `(Llighter + .05) / (Ldarker + .05)`, with alpha blended against the actual code-defined background before computing luminance. Other representative solid-role checks: light primary on surface **6.46:1**; light onSurfaceVariant **8.86:1**; dark onSurfaceVariant **10.89:1**; white check on green `#176b39` **6.57:1**. These support the otherwise strong palette but do not claim exhaustive runtime contrast coverage. Reproducible values are in the permitted scratch folder's `contrast-calculation.json`.

### Every core ID

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No measured transition run. |
| FLOW-02 | N/O | No live focus/scroll observations. |
| FLOW-03 | N/O | No delayed-completion strip; do not turn a potential code race into a scored stability finding. |
| FLOW-04 | N/O | Captured Rewind/Undo are visible, but keyboard and late-result follow-ups were not exercised. |
| FLOW-05 | N/A | No peer panels in this compact phone target. |
| FLOW-06 | pass | Library empty groups state their emptiness; Rewind groups say None; Episode detail omits empty Chapters. Static scope only. |
| FLOW-07 | pass | New/edit View share pinned Done; Settings value editors share EditorSheet; Episode rows share trailing Add/Play. Static scope only. |
| KEY-01 | N/O | Standard Compose controls are not a full attached-keyboard task run. |
| KEY-04 | N/O | FocusRequester supplies entry focus, but complete order/visible focus/back traversal untested. |
| KEY-06 | N/A | No custom character accelerators beyond standard undo/redo. |
| KEY-07 | N/O | No attached-keyboard scrolling run. |
| KEY-08 | fail — minor | Owner-fixed omission; finding 4. |
| DLG-01 | fail — major | Owner-fixed undoable Unsubscribe confirmation; finding 3. |
| DLG-02 | pass | `28`: “Unsubscribe from Deep Field?”; Rewind names Playlist and moment. |
| DLG-03 | pass | Cancel / Unsubscribe; Cancel / Rewind; named save/create actions, not generic Yes/OK. |
| DLG-04 | pass | Dialog dismiss handlers cancel without changes; Material dismissal defaults retained. Code verdict; physical Esc not run. |
| DLG-05 | pass | Destruction is explicitly invoked; Delete View/Playlist styled error; no unexpected destructive default found. |
| DLG-07 | pass | EditorSheet has Done and system Back/dismiss; Rewind has Cancel/Rewind; no three-way Cancel/Done/Back command set. |
| DLG-09 | pass | EntryMenu is anchored in the triggering Box; dropdowns remain contextual; editors use separate task sheets. |
| CTRL-02 | N/A | Flat selections; no checkbox parent/child hierarchy. |
| CTRL-03 | pass | OutlinedTextField labels persist for Search, name, feed/address and numeric input. No sensitive credential field. |
| CTRL-04 | pass | PlaylistNames, ViewEdits and NumberInput validation; numeric keyboard; locale-aware speed/number formatting; named field errors. |
| CTRL-05 | pass | Material buttons/clickables retain pressed feedback; tonal/filled roles supply emphasis. Large transport controls serve the playback task. |
| CTRL-06 | pass | Add/Play remain directly exposed; Entry menu groups move/remove/add; primary Podcast Subscribe is in the app bar. |
| CTRL-07 | pass | “Search the Library” versus podcast “Search Episodes”; counts name the filtered result; no search history shown. |
| CTRL-08 | pass | Download byte progress/cancel; OPML processed/total plus stop/resume; indeterminate lookups. Implementation verdict, not timing proof. |
| LIST-01 | pass | Content uses native lists; optional stats table uses paired date/time rows. No hierarchical data forced into flat columns. |
| LIST-02 | pass | Views/Playlist names contextualize lists; stats table headings Day / Time listened. |
| LIST-03 | pass | View editor exposes named sort orders through a native choice sheet. |
| LIST-04 | N/A | No dense multi-column filename/data list requiring row striping or middle ellipses. |
| LIST-05 | pass | Podcast details toggle changes one item; expanded state is saved in PodcastBrowsing. |
| LIST-06 | pass | Bottom destinations/tabs show selection; ChoiceRows and multi-select expose checked state in snapshots. |
| LIST-07 | N/O | Tap/open is present; required attached-keyboard list focus and arrows untested. |
| DATA-01 | fail — blocker | Unfinished rename has no durable raw draft for cold relaunch; finding 1. |
| DATA-04 | pass | HistoryActions maintains inverse steps, grouped typing and redo; visible history command and standard Ctrl+Z paths. |
| DATA-05 | pass | revealChanges opens restored View/Playlist/Episode; EntryList scrolls to restored Entry and marks it. Code verdict. |
| DATA-06 | N/O | Routes, keyed scroll anchors, tabs and podcast query/details serialize; complete restoration including selection not demonstrated. |
| DRAG-01 | pass | EntryDragHandle plus Move up/down commands; same model.moveEntry operation. |
| DRAG-03 | pass | MoveEntry records an inverse and offers history Undo. |
| DRAG-05 | N/O | Source lift/insertion/reset code exists; no captured drag or failed-drop behavior. |
| DRAG-06 | pass | EntryDragging implements edge autoscroll and retains/marks destination; local move has no slow transfer. Code verdict. |
| PTR-03 | N/O | No pointer session; do not infer cursor behavior from phone captures. |
| PTR-04 | pass | ActionIcon/ActionTooltip use Material TooltipBox with specific actions; editable single-line fields retain native text movement. |
| APPEAR-03 | pass | Separate light/dark roles; UiModeManager contrast listener strengthens label/outline roles; no custom blur/transparency dependence. Code verdict. |
| APPEAR-04 | fail — major | Light chart's recurring unselected bars compute 2.53:1; finding 2. |
| APPEAR-05 | pass | Standard Compose animation mechanisms; no custom autonomous parallax/blur/depth animation bypassing system duration scale found. Runtime preference test remains unrun. |
| APPEAR-09 | pass | One 24dp vector family: Android share, arrows, play/pause, star, settings and overflow keep familiar meanings. |
| APPEAR-10 | pass | Filled/tonal controls, outlined fields and tonal player surfaces distinguish actions from content. |
| APPEAR-11 | N/O | No transition/loading frame sequence; partly clipped app bars cannot be classified confidently from isolated captures. |
| TYPE-02 | pass | System typeface, Regular/Medium, restrained semantic scale in MainActivity. |
| TYPE-03 | pass | Body/caption styles at 12–16sp; font-scale adaptation visible. Skip numerals are part of the fixed control glyph, with full semantic labels. |
| TYPE-05 | pass | 200% rows stack actions/values; tabs wrap; Rewind and editors scroll; full Episode detail title retained. No confirmed essential-text clipping. |
| TYPE-06 | pass | Body 16/24, 14/21 and 12/18sp pairs; About stats wraps at phone measure with separate paragraphs/sections. Long publisher-rich notes not verified. |
| TYPE-07 | pass | No long uppercase UI copy or non-link underlining; selected tabs use the native indicator. |
| TYPE-08 | pass | Curly punctuation, real ellipsis/dashes in app strings; feed addresses preserved literally. |
| COPY-01 | pass | View, Playlist, Entry, Played and Position distinguish the domain; action-specific verbs and phone-appropriate instructions. |
| COPY-02 | pass | Lookup/connection/feed errors give connection/address/retry routes; OPML failures are beside the section with retry. Some messages remain generic craft gaps. |
| COPY-03 | pass | No matches offers edit/clear; no Subscriptions offers Add; History/stats explain how to populate; empty Trash is clearly named with Back available. |
| COPY-04 | pass | Sentence-style actions with consistent domain noun capitalization; concise action tooltips. |
| AX-01 | N/O | Many meaningful names/states appear and are explicit in code; collapsed snapshots aggregate some nested player/row labels. Individual live TalkBack control traversal/values cannot be certified. |
| AX-02 | pass | Checked/selected semantics; green subscribed check has shape and spoken status; Cursor/state/downloads use words as well as tone. |
| AX-04 | pass | Details has visible toggle and custom accessibility action; reorder has menu/custom actions; chart has previous/next day and table alternatives. Assistive-input execution unrun. |
| AX-05 | pass | No essential UI cue exists only as sound; playback controls and error/Position text remain visible. Publisher speech transcription is not claimed. |
| START-01 | N/O | Loading UI is implemented; launch latency/content availability not measured. |
| START-02 | pass | Persistent hide flag; Settings reopens Getting started; server optional. |
| START-03 | pass | Targeted three-step card, named starter Views, dismissible help and settings inheritance explanations. |
| START-04 | pass | Notification request triggered from first download; no startup permission wall; denial does not gate download. |
| START-05 | pass | “Allow notifications to see download progress and stop a download.” then Continue / system permission API. |
| START-06 | pass | Welcome offers Start on this phone; no account required for core use. |
| START-07 | N/A | No account creation feature. |
| EDIT-02 | pass | Native Compose fields and selectable notes preserve standard text-edit operations; no overriding cut/copy/paste bindings found. |
| EDIT-05 | pass | Selectable show notes/descriptions; Episode shares a URL using ACTION_SEND through the system chooser. Actual chooser UI not run. |
| WIN-03 | N/O | 200% compact portrait reflow shown, but narrow/landscape window resizing not supplied. No tablet penalty. |
| TOOL-06 | pass | Expanded player can collapse and reopen through mini player/artwork; no permanently hidden toolbar. |
| SIDE-03 | N/A | No hideable side pane in the phone target. |
| SIDE-04 | N/A | No simultaneously visible navigation/detail pane in the phone target. |
| SET-01 | pass | Global settings, Playlist settings and Subscription settings are scoped separately; OPML is in global Settings as required. |
| RESP-01 | N/O | No five-run latency measurements. |
| FOOT-02 | N/O | Lazy lists and background I/O exist; no measured long-list frame-rate/hang evidence. |

**N/O:** FLOW-01, FLOW-02, FLOW-03, FLOW-04, KEY-01, KEY-04, KEY-07, LIST-07, DATA-06, DRAG-05, PTR-03, APPEAR-11, AX-01, START-01, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05 → no peer panels; KEY-06 → no custom accelerators; CTRL-02 → no checkbox hierarchy; LIST-04 → no dense multi-column list; START-07 → no account creation; SIDE-03, SIDE-04 → no phone side panes. No missing-parent feature is counted repeatedly.

## Scores

These are app-level judgments, not arithmetic averages. The same scores cover light and dark unless an appearance-specific defect is named. Code supports behavioral scores; measured speed and live accessibility remain outside the evidence. A blocker is not waived because it is on an edge path, and an owner exception is not waived for scoring.

| Category | Score | Evidence | Principle |
|---|---:|---|---|
| Typography | **8.6** | **Strong:** semantic 12–30sp scale, readable metadata and fully wrapping detail title. 200% rows/values adapt deliberately. Chart axis labels become vertically choppy at 200%, and some long app-bar titles ellipsize; full Podcast title remains in content. This keeps it below reference-quality typography. | hierarchy, craft, accessibility |
| Hierarchy | **8.4** | **Strong:** the three equal destinations, quiet source lists, trailing row commands and grouped settings make task order clear. Episode detail has one strong Play action. Full-width Now Playing artwork outweighs transport controls spatially; duplicate Podcast title/header and uniformly ruled settings still spend attention. | content-first, hierarchy |
| Spacing & density | **8.2** | **Strong:** common 16dp edges and 48dp action targets; 200% actions move to their own row rather than squeezing text. Rewind and Unsubscribe action labels are visually close at 200%; stats' fixed-height axis and broad player artwork feel less tuned than the lists. These are craft observations, not additional target-size failures. | craft, conventions |
| Color & contrast | **6.9** | **Competent under major cap:** restrained blue accent, readable semantic foregrounds, independently toned dark mode and recognizable subscribed green. APPEAR-04's 2.53:1 recurring unselected light-chart marks prevent Strong. Dark palette judged alone is visually Strong (about 8.8); app-level score takes the failing appearance. | accessibility, color-restraint |
| Iconography | **8.5** | **Strong:** one family, familiar Android share/transport/star/gear, coherent dimensions and labels/tooltips in code. Secondary Episode actions remain an unlabeled visual strip; reading the played check's purpose takes more interpretation than the explicit Play button. Owner-fixed subscribed check is retained. | conventions, plain-language, craft |
| Consistency & polish | **8.3 (stability N/O)** | **Strong; partial: no flow run.** Reused rows, sheets, feedback placement and dark counterparts are coherent; empty groups are designed. Draft durability differs between sibling editors; large-text axis/button-group finishing needs attention. No claim about smoothness, late arrivals or measured layout stability. | craft, conventions, stability |
| Clarity | **8.4** | **Strong:** explicit Library versus Podcast search, device download scope, count feedback, active/current Playlist distinctions and recovery-oriented empty states. The shared model has substantial vocabulary; icon-only state actions and generic OPML/download failure explanations need more task-specific help to be Exemplary. No demand to restore visual player names. | plain-language, feedback, discoverable-commands |
| Platform fit | **6.9** | Looks **8.7**, Behaves **7.9** on code/stills → uncapped `(8.7 + 2×7.9)/3 = 8.2`; **DLG-01 caps at 6.9**. Native navigation/controls, dp/sp, Back integration, system chooser, contextual permission and lifecycle stores support Strong implementation. System surface execution and full restoration remain unverified. Owner-required modal confirmation keeps the scored category Competent. | conventions, stability, user-control |
| Interaction & feedback | **4.9** | **Weak under blocker cap:** DATA-01 loses an unfinished raw rename on a full cold relaunch. Otherwise extensive local Undo/Redo, recovery, drag alternatives, scopes and progress support Strong behavior. KEY-08 is the minor owner exception. No latency or live TalkBack score is inferred. | forgiveness, feedback, user-control |
| Overall | **6.9** | Visually **Strong**, but cold-relaunch preservation is incomplete and light-chart contrast fails. The lowest category is 4.9, so Overall is capped at **6.9**. The useful browsing/listening architecture lifts it to that ceiling; it is not yet a 9.0 app under this rubric. | forgiveness, craft, conventions |

### Android Phone signals and side-by-side result

The Google Calendar comparison supports ordinary Android app-bar actions and contextual task surfaces; BuzzKill shows how a consequence can be explained beside its choice. Material 3 styling, fixed brand blue and the bottom player are not Foreign merely because the examples differ. No imported iOS navigation/share vocabulary was found. The table assesses phone signals only, with explicit unverified portions.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Native** | Three labeled equal destinations; inner-screen Up; no root Up. NavigationSuiteScaffold and separate destination histories. |
| L2 Visual language | **Native** | Coherent Material controls, tonal sheets and one vector family in both themes. Owner blue is legitimate Android character. |
| L3 Density, text and frame | **Adapted** | dp/sp, 48dp ActionIcon and minimum selection rows; safeDrawing/IME insets and edge-to-edge setup. 200% layouts stack values/actions. Full smaller-window/IME geometry is N/O, not an assumed pass. |
| B1 System navigation | **Adapted (code); live animation N/O** | Manifest enables predictive Back; NavigableListDetailPaneScaffold handles inner stack; player PredictiveBackHandler unwinds nested player pages/collapses; selection and modal handlers precede navigation. Back does not pause. No gesture recording supplied. |
| B2 Preferences and access | **Adapted, partial** | System light/dark, high-contrast role adjustment, scalable text, named controls and non-gesture alternatives. No competing in-app language selector; system resource/locale APIs retained. Complete live TalkBack traversal N/O. |
| B3 System surfaces and lifecycle | **Adapted, with a Foreign lifecycle gap** | ACTION_SEND chooser, Media3 session, download channel, first-download permission rationale, shortcut manifest and local stores. **DATA-01:** cold-relaunch draft gap. Actual Sharesheet, notifications, audio focus, shortcuts and full process-death restoration N/O. No optional-widget penalty. |

**What stands between this build and 9.0:** Fix the draft-lifetime blocker and the light chart contrast first, then finish the visual details and obtain the missing flow/accessibility/lifecycle evidence. Even after those fixes, the **owner-fixed DLG-01 exception holds Platform fit at 6.9**, so the rubric's “lowest category + 2.0” rule limits Overall to **8.9**. A 9.0 target therefore also requires the owner to accept that scoring tradeoff or explicitly change the grading policy; this audit does not recommend changing the mandated UI.

**Top craft gaps below Exemplary (not additional checklist failures):**

- **Transport hierarchy:** `C/*/08-now-playing` gives artwork almost the full content width and much more vertical area than the transport. Cap artwork based on visible control needs, especially with Chapters/large text, so Play/Pause and seeking remain the first usable focus. Keep artwork, no visual names, and all existing actions.
- **Large-text composition:** `C/font200/15-rewind-sheet` and `28-unsubscribe` have tightly adjacent affirmative/cancel text; the stats chart's repeated minute labels wrap unevenly inside its 144dp plot. Give action groups a real 8dp gap or stacked alignment when needed, and use compact axis labels with the full unit in the existing scale caption. Keep the summary sheet and plain confirmation.
- **Secondary-action clarity:** Episode detail's Add / Played / Star / Share strip is materially quieter than Play, but the check's meaning is less self-evident visually. Consider short visible labels or an explicit selected-state treatment for the state actions while retaining the 48dp target rhythm. Do not add names to either player.
- **Failure specificity:** Code provides retry routes, but OPML combines read/write/connection failures in one paragraph and downloads expose a single generic failure line. Describe the operation that failed and a practical next action using the same inline error pattern; preserve already completed imports and retry state.

## Next step

**Target:** DATA-01, the highest-severity verified failure. **Anti-pattern:** inconsistent state lifetime between sibling editors; no named visual anti-pattern is needed. **Root cause:** raw Playlist rename input and committed Playlist name have different validity requirements, but only the valid model value has durable storage. `rememberSaveable` is being asked to cover a cold-relaunch lifetime it does not guarantee.

**Change:** Adopt the already-established per-form durable draft store for `playlist:<id>/name`, writing every raw edit before acknowledgment. Continue applying valid renames live; retain invalid intermediate text with its field error. Clear/reconcile drafts only after an explicit finish/discard/delete or a deliberate Undo boundary. Match the existing View/New Playlist preservation technique rather than changing Material styling or the information architecture. Verify duplicate and blank names, navigation away/back, and task removal/cold relaunch; separately run ordinary system process-death restoration.

**Principle:** forgiveness and user-control. **Expected effect:** removes the Interaction & feedback blocker cap, improves editor consistency and restores trust in live editing. **Possible regression:** a stale raw draft can override a deliberate rename/Undo if reconciliation is omitted; resolve this explicitly. **Character:** all owner signatures survive. The fixed Unsubscribe confirmation and shortcut-reference omission are excluded as next-step targets.

## Log (when iterating)

Audit only; no UI iteration, before/after change, or accepted-step claim. Baseline remains the supplied `17bc122` capture. Character check: Material 3, blue/dark palette, three stacks, artwork-led nameless player, compact Podcast header and single-list editor are all **kept**. No stylistic convergence toward the reference apps was attempted.
