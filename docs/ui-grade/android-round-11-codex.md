# PodList Android phone — independent round 11 grade

## Frame

- **Task:** find Episodes through Views or the Library, put them in Playlists, and listen while retaining control of each Entry’s Position and subsequent edits.
- **Target:** **Android phone**, compact window. Graded commit **5441d0b**, matching the capture README. Tablet, foldable, and desktop layouts are excluded.
- **Posture:** a sovereign personal browsing interface around a background audio player, with transient editors and choosers.
- **Audience:** perpetual intermediates, with a first-run path for newcomers.
- **Nearest exemplar:** Things for a calm personal collection, contextual explanation, and forgiveness; the Android gallery’s BuzzKill picker for explaining a choice beside its label. These supply craft comparisons, not Mac conventions or a replacement visual identity.
- **Character:** owner-fixed Material 3 and PodList blue **#2b50c8**; independently toned dark surfaces; separate Views, Playlists, and Library destinations; named Views versus ordered Playlists; an artwork-and-controls player with visually name-free playback surfaces.

**Owner decisions retained and graded:** the three bottom destinations; one-field Add podcasts; the single-list View editor; Rewind as a summary sheet; OPML in Settings; paused current Entry after relaunch; no visible podcast/Episode names in either player; immediate Playlist deletion to Trash with the exact named confirmation and Undo; compact Podcast header and pull-down description; top-bar Subscribe and green subscribed check; two-tap Unsubscribe with no dialog, Undo, and no departure from the page; explicit wrapping-name Rename with Cancel and Save below; case-insensitive unique View/Playlist names; no phone shortcut reference. None is a proposed redesign target. KEY-08 below records the literal checklist conflict with the last decision.

**Evidence:** `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-11/` (abbreviated **E/** below), starting with its README. Inspected the 161 screenshots across `light/`, `dark/`, and `font200/`; extracted the interactive-node patterns from all 161 paired snapshots and checked representative full trees against the code. Read the named design/architecture documents, domain vocabulary, Android manifest, and UI/behavior implementation. No earlier grade or UI-GRADE.md work list was read. No app, device, emulator, or UI test was run, and no app/test/configuration file was changed.

The supplied Pixel 10 Pro XL/Android 16 capture is **1344 × 2992 px**, density 480: **448 dp wide**, about 997 dp tall. `font200/` changes system font scale, not display density. Android’s nonlinear font scaling makes multiplying every painted font by two inappropriate.

**Comparison:** opened the Android gallery and its phone grades, BuzzKill’s `01-pick-action-top.jpg`, and Google Calendar’s `02-week-with-month-pane.jpg`. PodList shares Android’s app bars, familiar action controls, tonal surfaces, and system frame; no imported iOS/desktop visual grammar is established. The available Google image is a dated **tablet** reference, useful only for control vocabulary; it is not a current Google-phone side-by-side or evidence for grading PodList’s tablet support.

## Flows

**Tasks represented by the tour and traced in code, not run by this reviewer:**

1. Welcome → Start on this phone / Connect → Getting started → Add podcasts → result → Podcast page → inspect/play/add an Episode → Subscribe → arm/confirm Unsubscribe → Undo.
2. Views → View → Episode detail; Library → Search → result → Save as a View; long-press selection → Add to a Playlist → Play Next / Play Last.
3. Create/edit a View → condition sheet → matching count → rename Cancel/Save → finish/delete → Undo.
4. Playlists → Entries → reorder/remove → History / Listening Timeline → Rewind review → Cancel/apply → Undo; Playlist settings → Rename/Delete → Trash/Restore.
5. Mini player → Now Playing → Episode/Chapters/Entries → speed/sleep → Back/collapse; relaunch with the current Entry paused.
6. Settings → OPML / appearance / stats / server; Subscription settings → Download Rule / inherited Playback Settings / Played threshold.

**Widths/appearances:** supplied 448 dp portrait stills, light and dark at normal text, light at 200% text. No smaller phone, landscape, keyboard-visible error tour, or high-contrast capture. **Timed runs/device:** none; emulator metadata describes the supplied capture, not a timing test. **Flow script, measurements file, screenshot strips:** none supplied or produced. Ordinary numbered tour screenshots are not measured flow strips.

**Failures:** no measured FLOW failure is asserted. FLOW-01/-02/-04/-06, RESP-01, and the stability sub-score remain N/O. FLOW-03 can be checked in code: request-owned draft snapshots, `clearIfUnchanged`, independent rename drafts, and submission guards prevent a completion from clearing newly changed input in the reviewed forms. FLOW-07 has static evidence from the shared commit layouts. This is not a claim that all transitions are stable.

**Capture limitations:** `font200/04c-view-rename` is absent as its README says. `font200/30-listening-stats` and `31-listening-stats-lower` actually show Settings, as their snapshots confirm. Dark/enlarged populated stats open scrolled down; the normal light capture shows the totals. Some stills catch horizontally displaced navigation chrome; without settled before/after frames they do not establish a persistent clipping or transition defect. Live TalkBack, predictive Back animation, rotation, process-death execution, Sharesheet delivery, media notifications/lock screen, Bluetooth/audio focus, Android Auto, launcher-shortcut activation, actual dragging, and real publisher feeds were not exercised. Code settles specified mechanisms where cited, not successful execution on hardware.

## Cross-screen inventory

**Notation:** **SB** = shared inverse-surface snackbar above the mini player/navigation, moved inside an open modal sheet by `FeedbackSheet`; action uses inverse-primary color. **IE** = error-colored, polite live-region text near its field/action. **C** means established by code rather than a captured result. “None” means no separate surface for that message kind. Main actions use primary blue/tonal Material emphasis; secondary information uses `onSurfaceVariant`.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | SB for edits (C) | Shared sync strip, top, with Try again (C) | None | SB; persistent top history actions afterward (C) | Body explanation + New View / Add podcasts / Edit this View (C) | None | Root + top-trailing; row Add/Play | View conditions below title; Getting started at root |
| View editor / New View | Live count in pinned footer; SB for committed edits (C) | IE at invalid field/range (C) | Condition sheets | SB/history actions (C) | Zero matching count, not a blank form | Done/Create disabled while invalid or renaming | Footer trailing Done/Create View | Permanent draft/apply explanation at list end |
| View / Playlist rename | SB “renamed to …” (C) | IE under Name, names the duplicate (C) | Focused Name; Cancel/Save below | SB/history (C) | Empty-name explanation (C) | Save disabled while invalid/unchanged | Filled Save below field, trailing | Separate Name label; full wrapping saved name |
| Search | SB on View creation (C) | Name-field IE when saving Search (C) | Name and Cancel/Create View inline (C) | SB/history (C) | Body no-match explanation + Clear Search (C) | None | Scoped field; Save as a View below | Scope taught in Library search row |
| Episode detail | SB for Played/Star/add/download edits (C) | Download IE + Try again, near action (C) | Add sheet | SB/history (C) | In your Playlists explicitly says none (C) | None | Full-width Play Now; labeled secondary grid | Position per Playlist; selectable linked notes |
| Playlists / Entries | SB for move/remove/create (C) | Shared sync strip (C) | Entry menu or Add sheet | SB/history (C) | Body no-Entries + Find Episodes (C) | None | Root +; per-Entry Play; pencil/tune for settings | Active/count/Clear on Played subtitle; Now marker |
| History | None | Shared sync strip (C) | None | History actions when available (C) | Body explanation + Show Entries | None | Entry opens Episode | Explains how History is created |
| Listening Timeline / Rewind | SB “Playlist rewound” after application (C) | Shared sync strip (C) | Fully expanded summary sheet; Cancel/Rewind below | SB/history (C) | Timeline explanation + Show Entries (C); summary uses None | None | Tap eligible moment; Rewind bottom-trailing | Goes back / Unplayed again / restored / Kept sections |
| Playlist settings | Switch changes in place; rename/delete SB (C) | Rename IE (C) | Explicit Rename | SB/history; Trash recovery (C) | Default Playlist limits stated | None | Rename under name; red Delete Playlist below settings | Both On and Off consequences; retention explained |
| Trash | SB restore, including changed name (C) | Shared sync strip (C) | None | SB/history (C) | Body explanation + Back to Playlists | None | Restore beside deleted Playlist (C) | Retention and kept records explained |
| Library | Subscription rows and group headings | Per-podcast refresh IE/Retry (C) | None | History actions (C) | No Subscriptions + Add podcasts | None | Top +; search and subscription rows | Groups describe Download Rule consequences |
| Add podcasts | Subscribed indicator in result; SB (C) | Field IE or named result IE (C) | None | SB/history (C) | No-result text gives another-name/address recovery (C) | Input/Find disabled during lookup (C) | Filled Find podcasts below single field | Persistent “Podcast name or feed address” label |
| Podcast page | Green check + SB “Subscribed”; SB “Unsubscribed” (C) | Header/action IE + Try again (C) | Same check becomes Unsubscribe; timeout respects accessibility settings (C) | SB; 63 shows its position | Episode/search explanation + Refresh/Clear (C) | Progress while bringing in/subscribing (C) | Subscribe top-trailing; per-row Add/Play | Show/Hide podcast details button and pull gesture |
| Subscription settings / Download Rule | Chosen value in row; history actions (C) | Number-field IE (C) | Single-purpose choice sheet | Shared history (C) | Inherited value explicitly says Default | None | Row → sheet; Done at bottom | Rule consequences; inherited source/value |
| Select Subscriptions | Selection count; rule updates in place (C) | Shared sync strip (C) | Rule chooser (C) | Shared history (C) | Explanation + Add podcasts (C) | Rule commit disabled until chosen (C) | Contextual bottom Change Download Rule (C) | “Change Download Rules together” |
| Global Settings / OPML | Applied values; import summary; export SB (C) | Field/OPML IE + Try again (C) | Native document picker (C) | Shared history/import Undo (C) | None | OPML rows disabled while busy; rest available (C) | Settings rows; Stop/resume beside progress (C) | Scope, inheritance, import/export consequences |
| Appearance | Radio state updates in place | None | None | Shared history (C) | None | None | System default / Light / Dark | None |
| Listening stats | Counts/selected date in content | None | None | None | Body explanation + Find something to play | None | Tap chart, day buttons, Show table | Units, dates, About your stats |
| Welcome / Connect | Enters Library on success (C) | IE under address (C) | Start on phone or Connect | None | Intentional introductory content | Connecting state disables submit (C) | Below explanatory text/field, filled | Server optional; address/network and Library scope |
| Mini player / Now Playing | Position, playback state; shared feedback | Error styling/IE + Try again (C) | Speed/Sleep sheets (C) | Shared history for edits (C) | Absent if no current Entry (C) | Buffering status (C) | Center Play/Pause; skip and seek | Elapsed/remaining; Episode/Entries routes; Chapter title when present (C) |

**Mismatches:** no same-kind confirmation/error-placement mismatch is established by the inspected states and code. Different positions for a field commit, a pinned editor footer, and a modal footer correspond to different task structures. Suppressing routine settings snackbars while changing the value in place is proportional feedback, not contradictory success wording. The inverse-action icon mismatch is recorded once under APPEAR-09, below. An enlarged or scrolled frame hiding content outside its viewport does not by itself prove content is inaccessible. Inventory consistency does not supply the missing flow measurements.

## Checklist

**Coverage: 81.1% — 58 pass · 2 fail · 14 N/O · 5 N/A**, all **79 core IDs** assigned exactly once. Calculation: `(58 + 2) / (58 + 2 + 14)`. Mac-only and Web-only checklists are **N/A → Android phone** and excluded from this core count. Android Phone signals are assessed separately below, not added to inflate the denominator.

### Failures by severity

There are **no verified blocker or major failures**. Two minor findings follow, with the changeable one first.

| ID | Severity | Where | Evidence | Concrete fix / disposition |
|---|---|---|---|---|
| **APPEAR-09** | **minor** | Episode detail’s reverse Played/download actions | [PodListScreens.kt:533](../../apps/android/app/src/main/kotlin/app/podlist/PodListScreens.kt#L533) keeps `ic_check` for both Mark Played and Mark Unplayed. [PlaybackActions.kt:106](../../apps/android/app/src/main/kotlin/app/podlist/PlaybackActions.kt#L106) keeps the downward download glyph for Stored/Remove download and Failed/Try again; lines 82–86 confirm the actions differ. [Selection.kt:61](../../apps/android/app/src/main/kotlin/app/podlist/Selection.kt#L61) gives the unchanged check its green disc. The default capture establishes the original action treatment; reversed states are established by code, not an invented screenshot. Correct text labels prevent a more severe finding, but glyphs cease to predict the named operation consistently. | Use the existing unplayed glyph for Mark Unplayed, a remove-download glyph for Stored, and `ic_retry` for Failed; retain the current labels, 48 dp targets, layout, and Undo. Make each state’s action mapping explicit. This is one symbol-meaning finding, not three failures. |
| **KEY-08** | **minor — owner-kept** | No in-app shortcut reference on the phone | Settings/Help and resource/route inventory have no reference; [MainActivity.kt:59](../../apps/android/app/src/main/kotlin/app/podlist/MainActivity.kt#L59) and `HistoryActions.kt` still implement hardware Ctrl+Z/Redo. The core check literally requires an accessible reference, with no Android exemption. | **Accepted owner exception: keep shortcut lists absent.** Literal compliance would require a reference, contradicting the explicit owner decision. No such UI change is recommended or authorized; this finding is excluded from next-target selection. It carries no numerical cap. |

### Complete verdict inventory

“Pass, C” means the reviewed implementation establishes the mechanism; it does not assert an unperformed live accessibility/device test. Each grouped verdict applies to every listed ID.

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01, FLOW-02 | N/O | No element-box/focus/scroll measurements or flow run. |
| FLOW-03 | pass | `FormDraftState.clearIfUnchanged`, submitted snapshots in Search/New Playlist/Add sheet, read-only submission guards, and independent rename draft keys. C. |
| FLOW-04 | N/O | Rewind/Subscribe follow-ups are visible in supplied stills, but keyboard-visible errors and all task follow-ups are unmeasured. |
| FLOW-05 | N/A | No peer panels in this compact phone target. |
| FLOW-06 | N/O | Static sections have content/empty messages in the tour; help visibility through completion is not recorded as a flow. |
| FLOW-07 | pass | Shared `CommitActions`/`CommitButton`: trailing commits beneath single-field forms, pinned editor/footer commits, bottom sheet commits. E/05, 16b, 19, 26, 41b; C. |
| KEY-01, KEY-04 | N/O | Focus request code exists, but full keyboard traversal, reverse traversal, rings, and traps are not settled by these snapshots. |
| KEY-06 | pass | Added app bindings use Android `KEYCODE_Z`/Compose `Key.Z` and Ctrl, with no punctuation-based custom accelerators. C. |
| KEY-07 | N/O | Native scrolling implementation alone does not prove every named hardware scroll key. |
| KEY-08 | fail | Minor, owner-kept; above. |
| DLG-01, DLG-02, DLG-03 | pass | No routine delete/unsubscribe alert; permission pre-alert is specific, actionable, and has Continue/Not now. `IncomingContent.kt`; E/15, 28; C. |
| DLG-04, DLG-05 | pass | Rewind/picker Cancel is non-destructive; explicit deletion is red and recoverable. E/15, 16c; `TimelineScreen`, `ViewEditor`, `PlaylistSettingsScreen`. C. |
| DLG-07 | pass | Material sheets have system Back/dismissal; choice sheets have Done, Rewind has Cancel/Rewind. No Cancel/Done/Back triple. Android Back is the native dismissal route, not a missing Mac-style Cancel button. C. |
| DLG-09 | pass | `EntryMenu`/`EpisodeOverflow` place a single `DropdownMenu` in the trigger’s Box and dismiss before navigating. No arrow requirement on Android. E/12; C. |
| CTRL-02 | pass | Flat checkbox controls remain checkboxes, including multiselection; switches represent binary settings. No fake parent hierarchy. E/27, 50; C. |
| CTRL-03, CTRL-04 | pass | Persistent Material field labels, full-width name/address fields, numeric keyboard/locale-aware `NumberInput`, field-specific duplicate/range feedback. `EditorComponents`, `NameEditor`, `ServerScreen`; C and E/16b, 41b, 61. |
| CTRL-05 | pass | Material buttons/clickable/selectable modifiers supply pressed states. Large transport controls serve the native media task; not a desktop-size failure. C. |
| CTRL-06, CTRL-07 | pass | Row Play/Add and Episode Play Now remain exposed; menus hold related Entry commands; Library and Podcast searches identify their scopes; no displayed search history. E/02, 03, 12, 21, 61. |
| CTRL-08 | pass | OPML processed/total progress plus Stop/resume; downloads determinate when bytes known, indeterminate otherwise, with cancel; lookup/subscription progress. `OpmlActions`, `SettingsScreen`, `PlaybackActions`; C. Timing is separately N/O. |
| LIST-01, LIST-02, LIST-03 | pass | Content feeds stay Android lists; stats table has Day/Time listened columns; screens are titled; View Sort uses a choice sheet, allowed by Android’s clause. C and tour. |
| LIST-04 | N/A | No dense multi-column object/name table. |
| LIST-05, LIST-06 | pass | Podcast disclosure/query persist in `PodcastBrowsing`; selected bottom destination, tabs, checkboxes, and radios have explicit selected/checked states. `BrowsingStore`; snapshots. |
| LIST-07 | N/O | Touch opening/selection is implemented; attached-keyboard focus/arrow behavior across all lists was not tested. |
| DATA-01 | pass | Raw drafts commit through `FormDraftStore` while typing; explicit rename stays until Save/Cancel; server draft stored separately; saved edits use local transactions. C; E/41→41b corroborates kept address. Process-death execution remains untested. |
| DATA-04, DATA-05 | pass | Multi-step reversible `EditHistory`, exposed Undo/Redo, native text undo, `Reveal` routes and scroll-to-restored Entry/setting. `HistoryActions`, `ScreenActions`, `EntryDragging`; C. |
| DATA-06 | pass | DB-backed `BrowsingContext` persists destination/stacks, stable scroll anchors, Playlist tab, search, and Podcast expansion/query; validated restoration; `restorePlayback` leaves audio paused. C; scrolled stats captures corroborate retained scroll only. |
| DRAG-01, DRAG-03 | pass | Entry handle plus Move up/down menu/custom actions; move inverse enters ordinary Undo history. `EntryDragging`, `AppModel.moveEntry`; C. |
| DRAG-05, DRAG-06 | pass | Standard drag threshold, pinned/translated source, insertion lines, cancel reset, edge autoscroll, retained destination mark/focus. `EntryDragging`; C, not a claim about live drag smoothness. |
| PTR-03 | N/O | Pointer shape/gesture operation not exercised. |
| PTR-04 | pass | Icon actions use `ActionIcon`/`ActionTooltip` with action-specific labels; full text fields remain editable/scrollable rather than ellipsized labels. C. Not a demand for redundant desktop hover UI on labeled phone buttons. |
| APPEAR-03 | pass | Light/dark semantic roles plus `UiModeManager.contrast` listener adjust foreground/outline roles. No custom translucent content treatment needing an additional transparency variant. `MainActivity`; C. High-contrast rendering itself untested. |
| APPEAR-04 | pass | Declared foreground/background pairs pass Android’s thresholds; numerical samples below. Both captured appearances remain legible. Disabled controls and decorative separators are not failed as functional boundaries. |
| APPEAR-05 | pass | Compose animations use the platform duration scale; drag/predictive-Back displacement follows the person’s direct gesture. No custom autonomous depth/blur effect. C; live reduced-animation execution untested. |
| APPEAR-09 | fail | Minor reverse-action symbol mismatch; above. |
| APPEAR-10 | pass | Primary/tonal controls, outlined fields, separate player chrome, and selected fills distinguish interaction from reading content. Tour. |
| APPEAR-11 | N/O | No transition/loading frame sequence; displaced stills alone cannot establish persistent breakage. |
| TYPE-02, TYPE-03, TYPE-05 | pass | Default system family, Regular/Medium, 12 sp minimum supporting styles, deliberate leading; 200% stacks metadata/actions/setting values. `PodListTypography`, `ValueRow`, `ActionGrid`, `EpisodeRow`; E/font200 tour. |
| TYPE-06 | pass | Reading body is 14/21 or 16/24 sp; paragraphs have whitespace. Normal-light About your stats has roughly 60–70 characters on typical full lines, within 45–90. Lists/labels are excluded from the prose measure rule. |
| TYPE-07, TYPE-08 | pass | No app-owned long all-caps passages; typographic apostrophes, quoted Play Next/Last, ellipses, and range/minus punctuation in resources. Fixture/publisher artwork is content. |
| COPY-01, COPY-02 | pass | Domain terms and specific action verbs; inline errors explain address, certificate, number, storage, and connection recovery. `strings.xml`, `InlineError`, relevant form code. |
| COPY-03, COPY-04 | pass | Empty History/Trash/Library/stats have specific next actions; domain nouns retain consistent capitals inside sentence-case copy. E/13, 18, 30, 43. |
| AX-01, AX-02 | pass | Named icon actions, range/time descriptions, merged radio/switch/checkbox labels and states; text plus symbols/fills identify status. Artwork identity remains available to the screen reader despite visual name omission. C and paired snapshots. Live TalkBack traversal is unverified. |
| AX-04, AX-05 | pass | Reorder commands/custom actions, Podcast details button, chart day buttons/table, native adjustable Slider, visible transport and textual errors provide alternatives; core UI does not depend on an audio-only cue. C. Switch Access/Voice Access operation was not run. |
| START-01 | N/O | Loading placeholders exist, but promptness/launch response and the intermediate restoration frames were not measured. |
| START-02, START-03 | pass | Skippable, persisted Getting started card, reopenable from Settings with completed-step help; contextual inheritance and Rewind explanations. C; E/42, 15. |
| START-04, START-05 | pass | Notification request originates at download use, has a complete purpose sentence, Continue to system prompt and Not now. Manifest has no unrelated runtime permission wall. C. |
| START-06 | pass | Start on this phone works without account/server setup; optional server is an address, not an account gate. E/40–43; C. |
| START-07 | N/A | No account creation/deletion feature. |
| EDIT-02, EDIT-05 | pass | Native text editing; selectable show notes/description with preserved URL annotations; native ACTION_SEND chooser for Episode link. `ShowNotes`, `EpisodeDetail`, `EpisodeOverflow`; C. Sharesheet delivery untested. |
| WIN-03 | N/O | One compact portrait width and text-scale variants do not settle smaller phone windows, rotation, or phone multi-window resizing. Source has scrolling/reflow fallbacks but no full resize tour. |
| TOOL-06 | pass | Contextual chrome returns on leaving/cancelling selection/editor; player collapse and Artwork reopen routes remain available. `ContextualChrome`, `SelectionProvider`, `PlayerContainer`; C. |
| SIDE-03, SIDE-04 | N/A | No simultaneously adjacent navigation/detail panes in the graded compact target. |
| SET-01 | pass | Global settings in Settings; Playlist and Subscription options stay with those objects; per-Episode speed stays in the player. OPML location respects owner decision. Tour and C. |
| RESP-01, FOOT-02 | N/O | No five-run p75 latency data or refresh-rate/scroll measurements. Lazy lists and IO dispatching alone are not performance measurements. |

**N/O:** FLOW-01, FLOW-02, FLOW-04, FLOW-06, KEY-01, KEY-04, KEY-07, LIST-07, PTR-03, APPEAR-11, START-01, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, LIST-04, START-07, SIDE-03, SIDE-04 — reasons in the table; no failed-parent dependents.

### Contrast evidence

WCAG sRGB relative-luminance calculation from the declared roles in `MainActivity.kt`; these are **code-token** measurements, not averaged antialiased screenshot strokes. Scratch calculation: `grade-android-11-codex/contrast.json` beside the capture folder. Unselected chart bars use `.72` alpha composited on the base surface. These checks do not certify arbitrary publisher artwork or an unshown Android system dialog.

| Role | Light foreground/background | Ratio | Dark foreground/background | Ratio |
|---|---|---:|---|---:|
| Primary reading text | #1b1b21 / #faf8ff | 16.27:1 | #e4e1e9 / #121318 | 14.35:1 |
| Recurring secondary text | #46464f / #faf8ff | 8.86:1 | #c7c5d0 / #121318 | 10.89:1 |
| Filled primary action | #ffffff / #2b50c8 | 6.81:1 | #002781 / #b8c4ff | 7.70:1 |
| Subscribed check | #ffffff / #176b39 | 6.57:1 | #00391a / #80db9a | 7.82:1 |
| Unselected chart bar | #657fd7 / #faf8ff | 3.58:1 | #8a92be / #121318 | 6.13:1 |

### Android Phone signals

| Signal | Verdict | Evidence / boundary |
|---|---|---|
| L1 Navigation | Native | Three equal labeled destinations, Up on inner screens, actions in app bars; separate saved stacks. |
| L2 Visual language | Native, with minor craft gap | Material 3/system typography and coherent vector family. APPEAR-09 is an action-symbol mismatch, not imported-platform styling. |
| L3 Density, text, frame | Native for inspected portrait; partial size coverage | dp/sp, 48 dp action controls, 12 sp supporting text, edge-to-edge/safeDrawing/IME handling, enlarged-text reflow. Smaller phone/rotation/IME error rendering N/O. |
| B1 System navigation | Native implementation | Adaptive scaffold’s predictive Back, player `PredictiveBackHandler`, modal Back/dismissal, selection and armed-Unsubscribe Back handlers. Gesture execution/animation remains N/O. |
| B2 Preferences and access | Native implementation | System/Light/Dark, scalable text, Android resource/locale formatting, names/roles/ranges/custom actions. No competing in-app language. Live assistive-input execution N/O. |
| B3 Surfaces and lifecycle | Native implementation | ACTION_SEND chooser, Media3 service/session, download channel and contextual permission, shortcut intents, DB-backed context/drafts. Runtime system-surface delivery, hardware media integration, and actual process-death restoration N/O. |

No Foreign signal is established. **Looks 9.0; Behaves 8.8 (code-supported, runtime-limited); Platform fit = `(9.0 + 2 × 8.8) / 3` = 8.9.** No checklist cap lowers it. Absence of untested evidence is not counted as a failure or an automatic numerical deduction.

## Scores

Scores combine the matching light/dark appearances; enlarged-text evidence informs adaptability. These are whole-app judgments, not an arithmetic mean of selected attractive screens. Behavioral judgments are partial in execution even where code supports a score. Minor failures impose no cap; no blocker/major category cap applies.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.7** | Upper Strong: a restrained system scale (17/24 sp row titles, 12/18 metadata, 14/21 reading text), wrapping titles, and actual enlarged-text alternatives. Repeated small metadata strings still do several semantic jobs at the same size/weight; the Playlist summary and state do not scan as effortlessly as an Exemplary role hierarchy. | hierarchy, accessibility, craft |
| Hierarchy | **8.6** | Strong: Views/Playlist rows lead, one filled Play Now anchors detail, selection has its own action context. In the observed no-artwork Now Playing frame, the very large generic fallback is the strongest shape although it adds no identity; the muted Now section label is less immediate than the current Entry deserves. These are refinements inside the selected player, not a request to show names. | content-first, hierarchy |
| Spacing & density | **8.6** | Strong: common 16 dp gutters, 48 dp controls, paired large-text action columns, stacked values, bounded sheets, pinned Rewind actions. Clear on Played’s always-visible On/Off explanation occupies much of the enlarged settings viewport; the Now marker adds a separate section’s vertical spacing to one row. Task-specific compression of these secondary explanations would move this toward Exemplary. | craft, conventions |
| Color & contrast | **9.1** | Exemplary lower band: restrained primary blue, semantic error and subscribed green, independent dark roles, high-contrast adaptation, and strong measured recurring text. Chart bars also pass; disabled labels and quiet separators are correctly subordinate. This is deliberate rather than merely stock coloring. | color-restraint, accessibility |
| Iconography | **8.3** | Strong, lowest category: coherent vectors, meaningful named transport controls and OPML trays, correct target sizes and labels. Reverse Played/download actions keep forward-action glyphs (APPEAR-09), preventing reference-quality predictability across states. | conventions, craft |
| Consistency & polish | **8.6 — stability N/O** | **Partial: no flow run.** Strong visual/system finishing: shared fields/commit groups, empty-state next steps, inline error primitive, sheet-aware snackbar, explicit rename state. Per-size artwork can fall back to the generic mark while smaller artwork is available elsewhere; reverse-state icons are unfinished. No stability band limit is inferred without a sub-score. | craft, stability, conventions |
| Clarity | **8.5** | Strong: distinct Views/Playlists, scoped search, inherited values, named Trash deletion and specific recovery copy. Both On/Off paragraphs plus an enabling exception require more reading than the current switch state needs; Playlist metadata packs Active/count/cleanup into one low-emphasis line. Artwork-only identity is an owner-kept tradeoff, most visible in fallback-artwork states. | plain-language, feedback, discoverable-commands |
| Platform fit | **8.9** | Upper Strong, **partial execution**: Looks 9.0 / Behaves 8.8, weighted 8.9 as above. Android conventions are preserved in code and visible phone layouts. Remaining symbol/state craft keeps the inspected implementation just short of an Exemplary reference; untested tablet/foldable support has no bearing on this phone score. | conventions, stability |
| Interaction & feedback | **8.7** | Upper Strong, **partial execution/timing**: durable raw drafts, multistep Undo/Redo, Trash, contextual permission, stop/resume import, retry, selectable linked notes, adjustable seek and gesture alternatives. The small reverse-action signifier gap and owner-kept KEY-08 remain; responsiveness and full assistive/hardware operation are unscored, not assumed instant. | forgiveness, feedback, user-control |
| **Overall** | **8.6** | **Strong; below the owner’s 9.0 target.** The primary task is coherent and recognizably Android. What remains is detail-level action/state predictability, artwork fallback continuity, and economical explanations, rather than a change in architecture or visual identity. Holistic 8.6 respects the cap: lowest category 8.3 + 2.0 = 10.3. Coverage is 81.1%; this is not a full runtime certification. | craft, character, content-first |

### Craft gaps between this build and 9.0

1. **Finish reverse-action states.** Map Mark Unplayed, Remove download, and Try again to appropriate symbols; keep labels and recovery. This is the verified, changeable checklist finding.
2. **Make artwork fallback continuous across sizes.** E/light/08 and its snapshot identify the same current Entry as the mini player elsewhere, but expanded playback shows a generic mark. `ArtworkImage` keys/cache-loads by endpoint and pixel size and resets to a generic fallback for an unavailable size. Reuse an already available smaller rendition while the larger one loads/fails, keeping artwork-only identity and adding no names. The fixture’s cause of image failure and behavior on real publisher feeds remain N/O; the observed fallback composition is enough to identify the craft opportunity.
3. **Shorten the Clear on Played explanation without losing its exception.** E/font200/16c devotes a large block to both On and Off. Put the current consequence first, keep “already Played Entries stay when enabling” explicit, and disclose the alternate-state explanation only where needed. Preserve the switch, Undo, and domain behavior.
4. **Tighten the current-Entry hierarchy.** E/11 shows Now as a muted section heading above a tinted Entry; `EntryDragging` uses the same `Section` rhythm as ordinary document headings. A compact, text-labeled Now marker aligned with the Entry’s content would reduce scanning and vertical overhead without relying on color or changing playback behavior.

## Next step

**Target:** the changeable **APPEAR-09** finding in **Iconography**, the lowest-scoring category; no blocker/major takes precedence. KEY-08 is skipped because the owner decided to keep it.

**Anti-pattern:** no catalog anti-pattern fits precisely. This is an incomplete action-state mapping, not icon confetti or a platform import. The closest useful comparison is the rubric’s familiar-symbol principle and the Android gallery’s coherent icon/label pairings. Things’ relevant lesson is that a symbol has a stable meaning, not that PodList should adopt Things’ symbols.

**Root cause:** displayed labels and click handlers switch to reverse/retry operations, while their glyph selection remains keyed only to the original action or to “busy versus everything else.”

**Candidate 1 — preferred:** explicitly map Played/unplayed and download phases to the corresponding action glyph, retaining 24 dp icon geometry inside the existing ≥48 dp control, the same label, color roles, placement, and Undo. **Principle:** conventions and craft. **Expected improvement:** Iconography, Clarity, Consistency; no density change. **Risk:** a poorly chosen remove glyph could imply deleting the Episode; keep “Remove download” and the existing reversible handler. All owner-fixed signature elements survive.

**Candidate 2:** after that mapping, use available smaller artwork as the expanded player’s loading/failure fallback, with unchanged artwork bounds. **Principle:** recognition and stability. **Expected improvement:** Hierarchy/Polish in the observed fallback state. **Risk:** stale artwork when the Entry changes; bind every rendition to the current artwork identity. Preserve the name-free player and existing large transport controls.

**Review-only stop:** no candidate was applied, no before/after improvement is claimed, and no flow regression suite was run. Baseline character remains unchanged in all five signature elements. A subsequent implementation review should verify these states in light/dark/200% text and then obtain the missing phone flow, keyboard/assistive-input, and lifecycle measurements before making broader runtime claims.
