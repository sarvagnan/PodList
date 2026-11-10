# PodList — Android phone UI audit, round 15 (Codex)

Independent audit of `f29a9d6b27c8a7f7dd90671e98cfd14be20f0f8c`, 11 November 2026. No earlier project grades or `UI-GRADE.md` work lists were read. No device was driven, no tests were run, and no implementation was changed.

Evidence shorthand:

- **S** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-15/`; references such as `S/font200/11-playlist` mean both its PNG and accessibility TXT. All three tours were visually inspected, including their lower/bottom captures.
- **F** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flow-run/20261110-232845-458/`.
- **C** = `apps/android/app/src/main/kotlin/app/podlist/`, unless another path is given. Code establishes implementation, not successful execution of every platform integration.
- **Guide** = `~/Documents/UI_Guidelines/`: README, CRITIQUE, core checklist, rubric, Android Phone signals, Android gallery/platform grades, exemplars and relevant contrasts. Mac/Web-only checks are N/A → Android phone and excluded from the counts below. Tablet and foldable additions are out of scope.

## Frame

**Task:** Find Episodes through Views, Search or podcast discovery; arrange them in Playlists and listen with reversible edits and preserved playback context.

**Target:** Android phone, compact window. The supplied Pixel 10 Pro XL profile runs Android 16 at 1344 × 2992 physical pixels, density 3.0: **448 dp wide**. This is one phone width, not evidence for every compact width.

**Posture:** Sovereign personal tool while browsing/arranging, with background playback.

**Audience:** Perpetual intermediate, with a newcomer path that requires neither an account nor a server.

**Nearest exemplar:** Things for calm personal organization, reversible actions and context preservation. Android comparisons: BuzzKill's consequence-first option descriptions and restrained Android controls; Google Calendar's app-bar/control grammar. Their supplied published images are dated comparison material, not proof of current Android behavior. No tablet layout is prescribed here.

**Character:** Native Material 3 and system type; PodList blue `#2b50c8` with independently toned dark surfaces; Views/Playlists/Library as peers; Artwork-led transport without visible podcast/Episode names; explicit domain terms and reversible changes. All are owner-fixed and retained.

**Owner decisions:** All listed constraints are accepted: one-field Add podcasts; one-list View editor; Rewind summary sheet; OPML in Settings; paused current Entry after relaunch; names omitted visually from both players; immediate Playlist deletion with the exact named Trash message and Undo; compact expandable Podcast header; top-bar Subscribe/green check; two-tap Unsubscribe without a dialog or forced navigation; explicit Rename/Cancel/Save beneath wrapping names; case-insensitive unique names; phone shortcut references only in Android's system panel. These choices were graded, not proposed for reversal. The literal KEY-08 variance is retained below.

## Flows

The supplied instrumented script is `apps/android/app/src/androidTest/kotlin/app/podlist/FlowRunSmokeTest.kt`, with capture/reporting in `FlowRunReport.kt`. Its five tasks are:

1. Views → Episode → Add to a Playlist → Undo.
2. Playlist playback → Now Playing → discrete reorder → Undo.
3. Add podcasts → Podcast page → Subscribe while typing a new Episode search → Undo.
4. New Playlist → explicit Rename → Undo.
5. Library Search → Create View.

**Widths/appearances:** 448 dp, Light and Dark, normal text. Each appearance has a pass with HTTP completions delayed by 2000 ms and five undelayed timing passes. The separate screenshot tour adds Light at 200% text. There is no 200%-text flow run, smaller-phone run, standalone flow run, error-path flow run, or lifecycle run.

**Device/timing:** Debuggable build on an Android emulator on a Mac; no CPU/network throttling. This does not establish audience-device responsiveness. The report records response intervals, not reliable single presentation timestamps. Quarter-resolution PixelCopy excludes system chrome and the bottom 140 dp; transient pressed states can be missed. Settle and busy observations are upper bounds, so a late observation cannot prove late acknowledgment. RESP-01 and FOOT-02 remain N/O, despite five repetitions. In particular, the Dark play-entry interval of 218.53–505.50 ms is an emulator observation, not a scored physical-phone failure.

**Files:** `F/measurements.csv`, `timings.csv`, `frames.csv`, `summary.md`; ordered PNGs in the same directory form the screenshot strips. In the summary, “row” means the CSV's **`row` capture identifier**, repeated for each element, not necessarily its physical file line.

**Method judgment:** Separating dispatched input, pending work and settled completion is useful. Measuring actual dp geometry, field values, focus, IME bounds and follow-up visibility is stronger than grading isolated screenshots. Excluding deliberate navigation, keyboard changes and each field's own successful submission is appropriate. However, a settled snapshot's age is not the onset of a layout change. The six unresolved Subscribe/Undo comparisons must stay N/O; the harness's “no confirmed failures” is not an all-checks pass. Sequential semantics and PNG capture also limit claims about intermediate frames.

**Verified evidence:**

- FLOW-02/03: `F/measurements.csv`, capture IDs **101 → 102** Light and **282 → 283** Dark, `input:Search Episodes`: focus remains `Search Episodes`, text remains `Long E`, and the field stays at **(16, 249) dp** through subscription completion. The Light records are at physical CSV lines 2163 and 2189; Dark at 5919 and 5945. The corresponding `C-0101`/`C-0102` and `C-0282`/`C-0283` PNG pairs were inspected. This supports the exercised late-completion probe, not every possible error/completion.
- FLOW-04: the same completion captures record `follow_up_visible=true`; the PNGs show Undo above the IME. The raw file contains 154 positive follow-up visibility records and no negative ones. Geometry alone cannot certify every uncaptured question or error.
- FLOW-01 remains **N/O**: capture IDs **93 → 96**, `slot:podcast-subscription`, move left edge **273 → 281.33334 dp**, and IDs **107 → 110** reverse that move. Dark repeats it at **274 → 277** and **288 → 291**. The onset is unobserved; neither a >500 ms failure nor a timely user-caused change is established. Do not score this as either pass or fail.
- FLOW-05 is N/A: no peer panels on this phone presentation. FLOW-06 and FLOW-07 are assessed from the screenshot tour and code, not claimed as harness measurements.

**Failures:** No confirmed FLOW failure. Stability is **8.4 in both Light and Dark, partial to the measured tasks/width**. Reserved status space, preserved input/focus and visible Undo support Strong. Exemplary stability is not established: the main-action onset comparisons remain unresolved, and secondary/error/200% transitions were not measured. N/O imposes no checklist cap.

## Cross-screen inventory

Shared conventions: **snackbar** means the inverse-surface message above the mini player/navigation or IME; sheet actions use the sheet's own host above its commit row. Success normally leads with a past-tense action and names the changed object. **Inline error** means error-colored text near the relevant field/row, with recovery. “None” means no surface of that kind is offered in the observed state or implementation; it does not imply missing behavior.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View | Global snackbar after edits | Global sync notice under app bar + Retry | None | Snackbar, then reserved app-bar slot | In body; Add podcasts/Edit conditions/Create View | None | Root +; row Add/Play | Getting started card; View condition summary |
| View editor / New View | Named global snackbar; values/count update | Inline at invalid condition/name | Condition sheets; explicit Rename | Fixed app-bar slot or sheet-local host | Matching count, including zero | Invalid drafts disable commit, remain editable | Trailing pinned Done/Create View | Permanent draft explanation at form end |
| Search / Save as View | “Created View …” snackbar | Inline name problem | Name field below search, Cancel/Create View beneath | Global snackbar/app bar | Body text + Clear search/Add podcasts | Read-only fields during own save | Save as a View below query; Create View below name | Scope in heading/label |
| Episode detail | Named action snackbar | Download/acquisition error beside action + named retry | Add sheet | Global snackbar/app bar | “Not in a Playlist” within its section | None | Full-width filled Play Now, secondary action grid | Show notes, per-Playlist Positions, Chapters |
| Playlists / Entries | Named create/move/remove snackbar | Global sync notice | Add sheet, when requested | Snackbar/app bar; restored/moved Entry revealed | Body text + Find Episodes | None | Root +; Entry Play/menu/drag | Active Playlist, Cursor and Clear on Played status |
| Playlist settings / Rename | Named Rename or exact “Playlist <name> moved to Trash” snackbar | Inline name validation | Rename field with Cancel/Save beneath | Global snackbar/app bar | None | Invalid name disables Save | Rename beneath name; Save beneath field; red outlined Delete | Consequence and retention beside Delete |
| Trash | Named Restore snackbar, including alternate restored name when needed | Global sync notice | None | Global snackbar/app bar | Body explanation + Back to Playlists | None | Restore beside deleted Playlist | Retention/consequences in empty state |
| History | None until a related edit | Global sync notice | None | Shared app-bar slot | Body text + Show Entries | None | Episode row | Explains how History is built |
| Listening Timeline / Rewind | “Rewound …” snackbar after commit | Global sync notice | Summary bottom sheet | Snackbar after Rewind | Body explanation + Show Entries | None | Timeline row; trailing Rewind in sheet | Changes, unchanged edits and log retention explained |
| Library | Subscribe/rule-change feedback or updated state | Global sync notice | Rule sheet in selection mode | Shared snackbar/app bar | “No Subscriptions yet” + Add podcasts | None | Root +; Add podcasts in empty state | Download Rule name/consequence; scoped Search |
| Add podcasts / directory results | “Subscribed to …” snackbar + green/text subscribed state | Field lookup error or result-specific subscription error | None | Global snackbar/app bar | Field-specific no-result explanation | Own lookup disables field and commit | Find podcasts beneath field; Subscribe on result | One field's persistent name/address label |
| Podcast page | Named Subscribe/Unsubscribe snackbar + top-bar state | Load error in header; Episode error on affected row; offscreen failure also snackbar | Armed Unsubscribe in same control | Global snackbar/app bar | No Episodes/no matches + Refresh/Clear search | Pending action disables affected commands, fixed progress slot | Top-bar Subscribe/check; Episode Add/Play | Show/Hide podcast details; author and Episode count |
| Subscription settings / Download Rule | Value changes in place; undoable history | Inline invalid numeric cap | Labeled choice sheet; Done | Shared app-bar/sheet history | None | Invalid draft retained | Setting row → sheet; outlined Mark all Played | Inherited Default value and each rule's consequence |
| Settings / OPML / Appearance | Value changes; Export snackbar; import count summary inline | OPML error/failed feed near OPML rows + retry | Choice sheets; native file picker | App bar or owning sheet | None | OPML busy disables conflicting import/export | Task row; Done in choice sheet | Section help, inheritance, Getting started |
| Listening stats | Selected date/value updates | Global sync notice | None | Shared app-bar slot | No listening + Find something to play | None | Day arrows; outlined Show table/chart | About your stats below chart/top podcasts |
| Welcome / Connect | Navigates to usable Library/Views | Error under address + practical recovery | Optional server setup | None | Welcome is the starting state | Checking disables address/commit | Filled Start on this phone; trailing Check and connect | Server is optional; address scope explained |
| Mini player / Now Playing | Transport/position state | Playback snackbar + Try again; mini transport retry state | Speed/Sleep sheets | Shared app-bar/sheet history where applicable | No current Entry → no mini player | Buffering indication | Strong central Play/Pause; secondary grid | Accessible identity; Episode route; elapsed/remaining time |

**Mismatches:** No confirmed mismatch among equivalent message types/peer screens. In-place setting changes are proportionate direct feedback, not a conflicting success-message system. OPML's multi-feed summary belongs beside the import controls; it is not the same message as a single Subscribe confirmation. Screen-specific inline errors belong beside different causes. Single-field New Playlist and multi-condition New View are different form types, so their inline versus pinned commits do not fail FLOW-07. The owner-required Trash wording is a deliberate exception to the usual past-tense-first success pattern. Cold-launch selection loss is recorded once under DATA-06, not invented as a flow/inventory failure.

## Checklist

**Coverage: 85.1%** — **pass 61 · fail 2 · N/O 11 · N/A 5**. Formula: `(61 + 2) / (61 + 2 + 11)`. All **79 core IDs** receive one verdict. The coverage number describes the stated evidence scope; it is not 85.1% coverage of all device configurations or every runtime path.

### Failures by severity

**DATA-06 — major — selected working context does not survive a fresh launch without saved instance state.**

- **Where:** batch selection in Views, Search, Playlists and Select Subscriptions; additionally the chosen Listening stats day.
- **Evidence:** `S/light/50-selection` and `S/font200/50-selection` establish the real selected working mode. [`Selection.kt:32`](../../apps/android/app/src/main/kotlin/app/podlist/Selection.kt#L32) creates it solely through `rememberSaveable` and an empty `EpisodeSelection()` fallback. [`BrowsingContext.kt:12`](../../apps/android/domain/src/main/kotlin/app/podlist/domain/BrowsingContext.kt#L12), serialized by `data/BrowsingStore.kt`, has routes, scrolls, tabs, search, table mode and Podcast expansion, but no selected IDs. [`ListeningStatsScreen.kt:61`](../../apps/android/app/src/main/kotlin/app/podlist/ListeningStatsScreen.kt#L61) similarly defaults the selected day to the latest day while only table mode is durably restored. Thus a launch with no restored Android instance bundle rebuilds an empty batch/latest-day selection even when the route and scroll return. This is a code-established **cold-launch boundary**, not a claim that rotation or OS restoration with a saved bundle fails. Committed Library data and text drafts are not lost.
- **Concrete fix:** persist selection by Library/session and route, plus the selected stats calendar date, alongside the existing browsing context. Restore after data is available, intersect selected IDs with extant rows, and clear the durable selection on explicit Cancel, Back-out-of-selection or completed batch action. Restore a date by date, not a changing array index. Keep `rememberSaveable` for Activity recreation.
- **Score consequence:** Documents & data safety major → **Interaction & feedback ≤6.9**. This alone prevents a 9.0 Overall: its maximum becomes 8.9 under the lowest-category +2.0 rule.

**KEY-08 — minor, owner-kept — no literal in-app shortcut reference.**

- **Where:** phone Help/Settings and command discovery with an external keyboard.
- **Evidence:** `C/MainActivity.kt:74–80` deliberately registers Undo and Redo in Android's Keyboard Shortcuts panel, while `S/light/07-settings-lower`, `S/font200/32-settings-bottom` and the Settings/Getting started code provide no in-app reference. KEY-08 literally asks for an “in-app shortcut reference”; the native system panel does not satisfy that exact location requirement. Ctrl+Z/Ctrl+Shift+Z registration itself is present and is not failed again.
- **Fix disposition:** **No app change proposed or authorized.** The literal remedy would be an in-app reference, which the owner expressly forbids. Preserve the implemented Android system panel. This accepted checklist variance is not the next target and carries no major/blocker cap. It is not an Android Foreign tell.

### Complete verdict ledger

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | Six onset-ambiguous comparisons; see Flows and F capture IDs 93/96, 107/110 and Dark equivalents. |
| FLOW-02 | pass | F pending/completion pairs preserve field focus and scroll in the tested tasks. |
| FLOW-03 | pass | F 101→102, 282→283 retain newer `Long E`; C keeps raw drafts and conditional submitted-draft cleanup. |
| FLOW-04 | pass | F visible follow-ups; inspected IME pairs; S/font200/15-rewind-sheet and sheet commit layout. |
| FLOW-05 | N/A | No peer side-by-side panels in this phone target. |
| FLOW-06 | pass | All tour states have content/empty states under sections; permanent draft/help text; no observed disappearing help block. |
| FLOW-07 | pass | Peer setting sheets share trailing commit; Rename forms share field-then-controls layout; root creation actions share top-trailing region. |
| KEY-01 | N/O | Native focusable controls and Ctrl+A/Z routes exist; complete keyboard-only task traversal unexercised. |
| KEY-04 | N/O | FocusRequester and native focus order exist; full Tab/Shift-Tab route and visible focus on all controls unexercised. |
| KEY-06 | pass | Standard modifier-letter shortcuts use Android key codes/Compose keys; no punctuation-dependent custom chord. |
| KEY-07 | N/O | Page/Home/End/Space behavior in every scrolling container was not exercised. |
| KEY-08 | fail | Minor, owner-kept; exact in-app-reference location unmet, system panel implemented. |
| DLG-01 | pass | C permission explanation and actionable Rewind; reversible Delete/Unsubscribe avoid dialogs. |
| DLG-02 | pass | C/IncomingContent.kt names download progress; Rewind names Playlist and target moment. |
| DLG-03 | pass | Cancel/Rewind, Continue/Not now, Cancel/Done are concise native controls. |
| DLG-04 | pass | Native modal dismiss paths; explicit Rewind Cancel/date-picker Cancel; no destructive default. Android Back is the phone cancellation route. |
| DLG-05 | pass | S Playlist/View Delete uses error styling; recovery is Undo/Trash. |
| DLG-07 | pass | Editor sheets pair Done/commit with system Back/dismissal; no Cancel+Done+onscreen Back trio. |
| DLG-09 | pass | C EntryMenu/EpisodeOverflow use anchored DropdownMenu; dismissal does not discard drafts. |
| CTRL-02 | N/A | Flat checkboxes, no parent/child checkbox hierarchy. |
| CTRL-03 | pass | S filled fields and C OutlinedTextField labels remain identifying after entry. |
| CTRL-04 | pass | C NumberInput uses locale NumberFormat and whole/range validation; Names validation is field-specific. |
| CTRL-05 | pass | Material pressed states and filled/outlined/text emphasis. Larger transport controls suit the touch playback task; ordinary form buttons share 48 dp minima. |
| CTRL-06 | pass | Play/Add, create, Settings and Subscribe visible; overflow groups secondary commands. |
| CTRL-07 | pass | “Search the Library”, “Search Episodes”, and name/feed discovery label separate the scopes; no displayed history. |
| CTRL-08 | pass | C transfer bytes/determinate progress when known; indeterminate otherwise; downloads cancel, OPML import stops/resumes. Runtime OPML execution remains untested. |
| LIST-01 | pass | Native content lists; code's stats table has aligned date/value columns. No desktop outline imposed. |
| LIST-02 | pass | Titled lists, Entries/History/Listening Timeline, Day/Time listened. |
| LIST-03 | pass | Android list sort is an explicit View condition sheet with newest/oldest and shortest/longest choices. |
| LIST-04 | pass | Stats date/value alignment and enlarged-text stacking in code; content titles use designed tail ellipsis, not clipped glyphs. |
| LIST-05 | pass | Podcast details disclosure persisted through PodcastBrowsing.expanded. |
| LIST-06 | pass | Tab/bottom-navigation indicators; radio/checkbox selection; Cursor has text and an edge marker. |
| LIST-07 | N/O | Touch row opening is shown; attached-keyboard arrow/focus movement across interactive lists unexercised. |
| DATA-01 | pass | C/FormDraftState.kt, NameEditor.kt, ServerScreen.kt; durable raw drafts and explicit Cancel/Save; S/41b confirms address retained on Back. |
| DATA-04 | pass | C/HistoryActions.kt multi-step inverses and typing boundaries; F Add/reorder/subscribe/rename Undo; Activity and sheet shortcuts preserve native field history. |
| DATA-05 | pass | C/revealChanges, EntryList reveal and Settings reveal; restored/moved Entries are brought into view. |
| DATA-06 | fail | Major: batch selections and chosen stats date lack durable restoration beyond instance state. |
| DRAG-01 | pass | C/EntryDragging.kt supplies direct reorder; EntryMenu supplies Move up/down. |
| DRAG-03 | pass | Drag commits through model.moveEntry, the same inverse/history route as discrete reorder. |
| DRAG-05 | pass | Code supplies slop-based start, translated/elevated source, insertion line and cancel reset; in-list destinations remain valid. Not a claim of a performed drag. |
| DRAG-06 | pass | Code edge autoscroll, retained moved-row highlight/focus, stable keyed entries. No slow external transfer feature. |
| PTR-03 | N/O | Optional pointer/gesture behavior not exercised; no foreign override established. |
| PTR-04 | pass | C/ActionIcon, ActionTooltip: action-specific native tooltips on icon-only controls. Visible text labels carry other phone commands. |
| APPEAR-03 | pass | C/MainActivity.kt observes UiModeManager contrast, strengthens semantic roles; surfaces are opaque; separate dark and subscribed colors. Code evidence for preference handling. |
| APPEAR-04 | pass | Theme-token measurements below; light/dark/selected text remain legible in tour. No measured required-foreground failure. |
| APPEAR-05 | N/O | Standard Compose animations are used, but disabled-animation behavior of all sheet/pane/custom transitions was not observed. |
| APPEAR-09 | pass | Coherent drawable set, recognizable transport/add/edit/share, visible labels on secondary transport actions. |
| APPEAR-10 | pass | Filled/outlined controls distinguish actions; selected rows, Cursor and sheets have meaningful tone changes. |
| APPEAR-11 | pass | Inspected sampled pending/completion frames are coherent; no scored flash/contradictory frame. No claim about unsampled transition frames. |
| TYPE-02 | pass | C/MainActivity.kt uses one system family, Regular/Medium/Semibold, no hairline text. |
| TYPE-03 | pass | 12 sp minimum small labels, 14 sp metadata, sp text; fixed skip numerals remain inside scalable, accessibly labeled transport glyphs. |
| TYPE-05 | pass | S/font200 entire tour: wrapping names, separate action rows, stacked periods, scrolling detail/sheets preserve essential content. |
| TYPE-06 | pass | Default long explanatory paragraphs fit the phone measure; bodyMedium 14/21 and bodyLarge 16/24 give 150% leading and paragraph separation. |
| TYPE-07 | pass | No problematic app-authored capitals/emphasis; initials tiles are short marks, no underlined non-links. |
| TYPE-08 | pass | App strings use curly punctuation, real ellipsis/range/minus treatment; entered addresses and publisher text remain literal. |
| COPY-01 | pass | Domain terms match CONTEXT; action-specific phone verbs and explicit names. |
| COPY-02 | pass | Field errors name recovery; Podcast errors stay with affected row; OPML has file/connection/size guidance and Retry. Specificity gap noted as craft, not denied recovery. |
| COPY-03 | pass | Empty Views/Library/Search/History/Trash/stats provide a useful next action. |
| COPY-04 | pass | Consistent sentence-style actions with domain noun capitalization; icon tooltips are action fragments. |
| AX-01 | pass | Code gives icons names, slider value/time, radio/checkbox/switch state, heading/error semantics; snapshots expose them. Live TalkBack traversal is unverified. |
| AX-02 | pass | Green subscribed check has shape/label; selection has checks; Cursor text/edge; errors have text. |
| AX-04 | N/O | Move commands, day arrows/table and details button provide alternatives; Voice Access/Switch Access execution is unverified. |
| AX-05 | pass | Audio starts on request with Play/Pause, visual buffering/errors; no audio-only essential UI message. Publisher transcripts are outside the app-feedback check. |
| START-01 | pass | Meaningful Loading state; cached local screens; unrelated browsing remains possible while syncing. No startup latency claim. |
| START-02 | pass | C/GettingStarted.kt and stored progress; Hide and Settings reopening; server setup optional. |
| START-03 | pass | Contextual getting-started checklist and setting consequences, dismissible without completing setup. |
| START-04 | pass | Download notification request triggered at download use; no storage permission wall; file picker grants scoped access. |
| START-05 | pass | “Allow notifications to see download progress and stop a download.” before system prompt. |
| START-06 | pass | Standalone first run and server connection without mandatory account creation. |
| START-07 | N/A | No account creation offered. |
| EDIT-02 | pass | Native Compose text editing; list Ctrl+A bubbles after fields; no clipboard alteration on item Delete. |
| EDIT-05 | pass | Show-notes SelectionContainer; Podcast Copy feed address; standard text copy and ACTION_SEND representation. |
| WIN-03 | N/O | 448 dp and its enlarged text work; other compact sizes and rotation not captured/exercised. Medium/expanded are separately out of scope. |
| TOOL-06 | pass | Contextual editor/selection chrome has Back/Done/Cancel exits; mini player reappears; Artwork reopens Now Playing. |
| SIDE-03 | N/A | No hidden navigation pane on this compact phone. |
| SIDE-04 | N/A | No adjacent-detail navigation pane on this compact phone; bottom/tab selection is LIST-06. |
| SET-01 | pass | Global options in Settings; Playlist/Subscription options at their own object; per-Episode speed in player. |
| RESP-01 | N/O | Debug emulator, incomplete presentation intervals; audience hardware and acknowledgment deadline unestablished. |
| FOOT-02 | N/O | F frame metrics exist but emulator/debug scrolling cannot establish audience-device quality. |

**N/O:** FLOW-01, KEY-01, KEY-04, KEY-07, LIST-07, PTR-03, APPEAR-05, AX-04, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, CTRL-02, START-07, SIDE-03, SIDE-04. No failed-parent cascade. Mac/Web-only groups and Android tablet/foldable additions are excluded by target, not added to these 79-item counts.

Additional unverified runtime surfaces: live TalkBack order, rotation, Android process-death restoration, predictive Back animation, Sharesheet execution, lock-screen/media-notification controls, Android Auto, Bluetooth/audio focus, launcher shortcuts, physical dragging, OPML in progress, and real publisher feeds. Their code paths may be inspected without claiming their runtime success.

## Scores

Scores cover both themes unless stated; 200% is a text adaptation, not a third appearance. “Strong” means deliberate craft above generic Competent, with a specific gap before Exemplary. Behavioral judgments use code and the supplied flow run, not screenshots alone; their runtime limits remain above.

| Category | Score | Evidence / anchor | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong: system scale with 14/21 metadata, 16/24 body and wrapping headlines; 200% reflow is considered. Section labels sometimes approach the metadata's visual strength, and 12 sp icon-grid labels are less fluent than the main reading hierarchy. Below the “type alone tells structure” Exemplary anchor. | hierarchy, accessibility, craft |
| Hierarchy | **8.6** | Strong: dominant Play Now/Play/Pause; quiet list metadata; explicit selected mode; Podcast title precedes searchable Episodes. At enlarged text, a separated and sometimes empty app-bar action tier puts chrome ahead of content; Library's overline/rule/help stack and Playlist summary/tab stack require more scanning than the strongest examples. | content-first, hierarchy |
| Spacing & density | **8.2** | Strong: 16 dp keylines, 48 dp actions, related settings values below labels; sheets and renamed names wrap. Fixed font-scale-triggered chrome reserves 48 dp even for only an invisible Undo slot. Entry drag/menu/Play regions narrow default titles; the large-text fallback lengthens rows substantially. Deliberate, but not yet density tuned in every state. | craft, adaptability |
| Color & contrast | **9.0** | Exemplary lower edge in verified appearances: blue marks action/current state, green plus check marks subscription, error tone marks destructive/recovery; both themes are independently resolved. Token contrast: body **16.27:1 Light / 14.35:1 Dark**; secondary **8.86 / 10.89**; selected-container text **13.24 / 7.20**; primary text **6.46 / 10.93**; subscribed mark **6.57 / 7.82**. Ratios computed from C/MainActivity.kt foreground/background roles, not guessed from antialiasing. Decorative dividers and disabled controls are exempt. | color-restraint, accessibility |
| Iconography | **8.7** | Strong: coherent small glyphs, action tooltips, recognizable edit/add/transport, labeled player grid. Similar list/Playlist/Entries glyphs rely on the accompanying labels more than instant shape recognition; large transport versus tiny secondary symbols could be optically better balanced. No mixed-family violation established. | conventions, craft |
| Consistency & polish | **8.5 (stability 8.4 Light / 8.4 Dark)** | Strong: shared Rename, setting rows, sheet-local feedback, Undo slot and status space; no confirmed inventory mismatch. Enlarged empty action tiers and uneven content-versus-chrome allocation keep it below Exemplary. Stability's Strong band allows at most 8.9; unresolved onset is N/O, not an invented major cap. | stability, craft, conventions |
| Clarity | **8.6** | Strong: useful empty states, scope labels, inherited defaults and Rewind consequences; names distinguish View/Playlist/Episode. OPML's combined “read or write” error is less diagnostic than the Podcast error family; bulk Played/Starred confirmations omit count/object scope. Recovery is still provided, so COPY-02 passes. Owner-fixed name-free players remain discoverable via Artwork and Episode. | plain-language, feedback |
| Platform fit | **8.5** | Strong: **Looks 8.8, Behaves 8.4; (8.8 + 2×8.4)/3 = 8.5** rounded. Native M3, three destinations, anchored menus, native picker/share APIs, contextual permission and Back handling. B3's incomplete cold-start context and unverified lifecycle/integrations keep this below Exemplary; system-only keyboard reference is native Android, despite literal KEY-08. | conventions, stability |
| Interaction & feedback | **6.9 (capped)** | Strong implementation would otherwise merit about 8.7: reversible named edits, drafts, discrete drag alternatives, visible Undo, retry paths and newer text protected during completion. **DATA-06 major cap applies** because durable routes return without selected working context. Runtime keyboard/assistive input and physical-device speed remain N/O, not additional failures. | forgiveness, user-control, feedback |
| Overall | **8.5** | Strong, useful and recognizably Android; all requested screen families have considered implementations. The selected-context restoration gap is the largest concrete weakness and makes 9.0 unavailable under the rubric. Overall 8.5 is below the **8.9** lowest-category-plus-2 ceiling; this is holistic, not the mean. | content-first, conventions, forgiveness |

### Android Phone signals and comparison

Compared with the guide's Google Calendar image, PodList's app bars, bounded rounded controls, selected tab treatment and system frame read as Android. Compared with BuzzKill, PodList achieves much greater list density while still giving rule/setting consequences. Neither its blue accent nor its intentionally name-free player imports another platform. No iOS glyph, root Up button, destination/action mixture or custom share substitute was established.

| Signal | Verdict | Evidence / limits |
|---|---|---|
| L1 Navigation | Native | Views/Playlists/Library are equal destinations; Up is on inner screens; actions stay in app bars. |
| L2 Visual language | Native | Consistent M3 control/shape/type vocabulary, independently resolved themes. |
| L3 Density, text, system frame | Native at 448 dp, partial beyond | dp/sp; explicit 48 dp icon/form controls; 12 sp small styles; safe insets/IME handling; full 200% tour. Smaller compact windows not demonstrated. |
| B1 System navigation | Native implementation, partial execution | NavigableListDetailPaneScaffold; explicit predictive player handler; modal/selection Back priority; playback is not paused on Back. Predictive animation and every gesture route remain untested. |
| B2 Preferences and access | Native implementation, partial execution | System/Light/Dark, contrast listener, scalable text, Android resource strings, meaningful semantics. Live TalkBack/assistive input/locale changes untested. |
| B3 System surfaces and lifecycle | Mixed: Native APIs, incomplete context restoration | ACTION_SEND chooser, file picker, notification channel, contextual notification permission and shortcuts in code. Cold-start batch/date selection absent (DATA-06). Other lifecycle and external integration execution N/O. |

### Craft gaps before 9.0

1. **Finish preservation of the person's place.** Keep the selected batch and selected stats date alongside the already durable routes, drafts and scroll anchors. This is the scored failure, not merely a visual preference.
2. **Make large-text chrome conditional on actual space needs.** `EditorComponents.kt:100–108` always splits app bars at fontScale ≥1.5; `UndoAction` supplies a 48 dp invisible slot even when no action is visible. `S/font200/19-new-playlist`, `24-subscription-settings` and `26-add-podcasts` show the resulting blank tier. Explore a measured single-row layout for short-title/low-action bars, retaining a stable Undo position and whole words. Do not simply let Undo's arrival insert a new row.
3. **Refine scanning within Entry rows and Library groups.** Preserve 48 dp targets and visible domain state, but test shared baselines and more compact grouping of metadata/actions. `S/light/11-playlist` wraps even ordinary titles while `S/font200/11-playlist` spends a separate action tier per Entry. The target is less eye travel, not fewer capabilities or a desktop density.
4. **Make the last feedback details as specific as the main paths.** Distinguish OPML read, invalid-file and write failures; include selected count and Subscription/Playlist scope in bulk confirmations. Preserve the exact owner-required Trash sentence. These would improve clarity without changing domain concepts.
5. **Resolve evidence gaps before claiming Exemplary behavior.** Timestamp the actual Subscribe control transition; run error/200%/smaller-phone flows, lifecycle restoration, real TalkBack and release-like physical-phone timing. These are unverified areas, not scored defects.

## Next step

**Target:** DATA-06, the major failure in the lowest-scoring category, Interaction & feedback. No blocker is established. KEY-08 is owner-kept and deliberately skipped as a target.

**Anti-pattern:** Incomplete state restoration; no exact Android-specific name in the guide. The nearest contrast is **POLISH-08, “Personalization stays put”**, and Things' persistent selection/context is the relevant decision exemplar. Desktop window restoration is not the proposed phone behavior.

**Root cause:** Persistent browsing state and instance-only interaction state are separate models. Routes, tabs, scroll and drafts have a database home; selected IDs and chosen stats date do not.

**Change:** Add per-session/per-route selected IDs and the chosen stats date to durable browsing state. Restore only valid IDs/dates after data loads. Persist explicit clears on Cancel/Back/completion. Preserve the existing instance-state fast path. A secondary candidate is to centralize this restoration contract so future list modes cannot silently omit selection; the smallest first step is the missing fields and explicit lifecycle rules.

**Principle:** stability and forgiveness; preserve user control by honoring explicit deselection. Balance persistence against stale data by validating IDs rather than indiscriminately restoring removed content.

**Expected effect:** Remove the Interaction major cap once verified at the cold-launch boundary; improve continuity within Android B3. Typography, color, navigation and all owner-fixed character elements stay the same. Risk: stale or unintended restored selections; validate IDs and clear on explicit exits. Validate with a selected batch and non-latest stats date across a fresh instance with no saved bundle, then separately test rotation and OS process recreation. No such change or rerun was performed in this report-only task.

No iteration log: this was an independent audit, not an implementation round. Baseline screenshots are the supplied build. Character remains as captured; no drift comparison against earlier rounds was made.
