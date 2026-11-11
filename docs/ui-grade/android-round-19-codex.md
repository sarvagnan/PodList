# PodList · Android phone · Round 19 · independent Codex review

Reviewed 11 November 2026, commit `5cee7d00ac0c0948b818624f0ee5ea64477856ab`. No earlier PodList grades or UI-GRADE.md work lists were read. No app, test, or configuration changes were made; no device was driven, tests run, or commit created.

## Frame

- **Task:** find Episodes through Views, Search, and Podcast pages, add them to Playlists, and listen while retaining independent Playlist Positions and recoverable edits.
- **Target:** **Android phone**, compact window. Tablet and foldable signals are excluded. Evidence is a Pixel 10 Pro XL profile, Android 16, 1344 × 2992 physical pixels at density 3: **448 × 997.3 dp**. Light and Dark use font scale 1.0; the additional 200% font captures are Light only. This does not establish every compact width or landscape layout.
- **Posture:** sovereign browsing/organizing UI with background playback and short, transient editors.
- **Audience:** perpetual intermediates, with first-run teaching for newcomers.
- **Nearest exemplar:** Things for calm personal lists and forgiving edits, without importing Mac conventions. Android calibration: the guide's BuzzKill action picker for explanations beside choices and Niagara's plum home list for restrained hierarchy; their images and Android grades were inspected. The supplied Google Calendar image was also compared for Android control language only: it is a dated tablet capture, not evidence for current Google phone behavior or an applicable tablet requirement.
- **Character:** owner-fixed blue `#2b50c8` with separately toned dark roles; three equal Views/Playlists/Library destinations; text-led lists with small Artwork; controls-led playback; contextual bottom sheets and Undo.

**Owner decisions:** retained and graded: native Material 3 and dark appearance; three bottom destinations; one Add podcasts field; one View-condition list; Rewind as a summary sheet; OPML in Settings; paused current Entry on relaunch; no visual podcast/Episode names in either player; immediate Playlist deletion with the exact named Trash message and Undo; compact Podcast header, disclosed description, top-bar Subscribe and green subscribed check; two-tap, dialog-free Unsubscribe with Undo while staying on the page; explicit Rename with separate name lines and Cancel/Save below; case-insensitive unique names; no shortcut listing in phone content, with Ctrl+Z/Ctrl+Shift+Z registered in Android's own panel. No proposed change reverses these decisions. The missing visual player names impose a recognition cost, considered under Clarity; the direct Episode route and accessible identity preserve access to the information.

**Evidence notation:** `E` is `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-19`; `F` is the sibling `flow-run/20261111-124416-299`. Screenshot numbers refer to the PNG and matching TXT in the named E appearance. Source paths below are relative to this worktree; `app/` abbreviates `apps/android/app/src/main/kotlin/app/podlist/`. All 54 supplied screens/scroll positions in each appearance were visually inspected. Representative accessibility snapshots and the implementation of all in-scope screen families were read. Baseline is the supplied capture; there is no edited after-state.

## Flows

**Tasks run by the supplied instrumentation, not rerun by this reviewer:**

| Flow | Task |
|---|---|
| A | Views → View → Episode → Add to a Playlist → Undo |
| B | Playlist → Play → Now Playing → collapse/pause → discrete Entry move → Undo |
| C | Add podcasts → Podcast page → Subscribe → type into Episode search while HTTP is pending → completion → Undo → next item; long-list fling |
| D | New Playlist → create → settings → Rename → Save → Undo |
| E | Library Search → Save as a View → name → Create View |

**Conditions:** 448 dp phone window, Light and Dark; one stability pass per appearance with 2000 ms added per HTTP completion, then five undelayed timed passes per appearance. Debug build on `sdk_gphone64_arm64` Android 16 emulator on a Mac; no CPU/network throttling. Script: `apps/android/app/src/androidTest/kotlin/app/podlist/FlowRunSmokeTest.kt`, `FlowRunReport.kt`, and the classification implementation. Evidence: `F/summary.md`, `F/measurements.csv`, `F/timings.csv`, `F/frames.csv`, and ordered A–E PNG strips. The `row` references below mean the CSV **row field/capture sequence**, not physical CSV line numbers: each capture has multiple element records.

**Method assessment:** useful, reproducible settled-state evidence, with explicit element geometry, dp conversion, focus, scroll, input values, IME geometry, pending transport probes, and a candidate-exclusion audit. Separating own-submit cleanup and requested keyboard/scroll changes is appropriate. Semantics and screenshots are sequential, and captures after idle cannot establish when an action effect first appeared. The report correctly leaves four subscription-control comparisons unresolved rather than treating capture age as change onset. Its pixel response intervals have zero or uncertain lower bounds, exclude bottom chrome, and sometimes straddle 200 ms. Late observation of a busy indicator is not proof that it appeared late. Neither those timings nor the 21 late fling frames in each appearance establish physical-device performance. RESP-01 and FOOT-02 remain **N/O**.

**Confirmed flow failures: none in the supplied measured paths.** This is not a claim that every transition is stable.

| Check | Assessment and independently inspected evidence |
|---|---|
| FLOW-01 | **N/O overall.** C's pending/completion pairs hold the search field at x=16, y=249 dp and subscription slot at x=348, y=61 dp. However, capture sequences 104→107, 274→277, and 289→292 include 75 dp subscription-slot left-edge changes whose onset is unresolved. Code makes the pending state synchronous, but this F-only check needs measured onset; no failure or cap is inferred. |
| FLOW-02 | **pass, measured scope.** C 98→99 retains focus `Search Episodes` and scroll `2168:0.0`; corresponding Dark pending/completion evidence is in C 282→283. Requested IME dismissal and fling are properly excluded. |
| FLOW-03 | **pass, measured scope plus code.** C 98→99 retains `Search Episodes=Long E` with a request pending at 98 and completed at 99; completion was observed 2517 ms after typing. Dark preserves the same text after 2735 ms. `rememberDraftText`, query ownership, and `clearIfUnchanged` protect the other inspected form paths. |
| FLOW-04 | **pass, measured scope.** No `follow_up_visible=false` records. In C 99 the success snackbar is at x=16, y=453.33 dp, above the visible IME; in 104 it is at y=765.33 after deliberate keyboard dismissal. A/D/E strips show visible recovery controls. This does not cover OPML failure, all sheets, or large-text-with-IME combinations. |
| FLOW-05 | **N/A.** No peer panels in the phone presentation. |
| FLOW-06 | **pass, inspected scope.** Populated/empty list states have content or a recovery message; Podcast busy seams persist. No measured vanishing help block or orphaned heading was established. |
| FLOW-07 | **pass.** Root creation actions are trailing in the app bar; single-field commits follow their fields; multi-field View commits and sheet commits are trailing at the bottom. The latter are distinct form kinds, not an action-placement mismatch. |

**Stability: 8.6, Light and Dark, partial to these flows.** The measured typing probe and visible follow-ups are substantially above the Competent anchor; no demonstrated major/blocker stability failure caps the score. The incomplete core-motion comparisons, one phone width, and unexercised secondary asynchronous paths prevent an Exemplary claim. Unknowns are coverage limits, not invented failures.

## Cross-screen inventory

“None” means no such surface in the inspected state; code-only states are identified. Status colors refer to Material roles in both appearances.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | Bottom inverse snackbar for named edits; none on ordinary navigation | Shared sync notice below app bar, Retry; code | None | Fixed app-bar slot or snackbar action | Body message + tonal Add podcasts/Edit conditions; code | None with local data | Root trailing New View; row Play/Add | Getting started card on fresh Views; View summary above list |
| View editor / New View | Named edit snackbar; live matching count in footer | Error-role text at invalid field/range; code | Number/condition sheets | App-bar slot; snackbar; history | Any values and live count rather than empty shells | Invalid commits disabled | Bottom trailing Done/Create View | Live-apply helper below “Show Episodes where”; deletion consequence below Delete |
| Search / save Search | Named View creation snackbar, navigates to View | Field-specific naming errors; code | Name field with Cancel/Create View | Shared history/snackbar | Message + Clear search/Add podcasts | Read-only fields while saving | Search field top; save naming directly beneath | Scope in title and persistent field label |
| Episode detail | Past-tense named action, bottom inverse snackbar | Download status/retry near action; code | Add sheet | Snackbar + app-bar slot | “In your Playlists” has explicit none state; code | None in captured detail | Wide Play Now; four secondary actions below | Show notes; per-Entry Position/Play or Resume |
| Playlists / Playlist | Named move/create/remove snackbar | Shared sync notice; code | Add sheet; settings | Shared snackbar; restored Entry revealed | History/Entries message + Show Entries/Find Episodes | None | Root trailing New Playlist; Entry Play and menu | Active/Clear on Played summary, Current Entry label |
| Playlist settings / Rename | Renamed Playlist snackbar; changed switch visible | Name field reason; code | Explicit Name, Cancel, Save | Shared history/snackbar | Default Playlist limitation explained | Save disabled for invalid/unchanged name | Rename controls below name; red outlined Delete below settings | Clear on Played consequence and Trash retention beside controls |
| Trash | Restored Playlist snackbar, collision-adjusted name; code | Shared sync notice; code | None | Shared history/snackbar | Body explanation + Back to Playlists | None | Restore trailing per row; code | Named retention and scope of restoration |
| Listening Timeline / Rewind | Rewound Playlist snackbar; code | Shared sync notice; code | Bottom sheet: Goes back to / Unplayed again / Back in Playlist / Kept | Snackbar after Rewind; code | Timeline message + Show Entries; none entries in summary explicitly say None | None | Row Rewind → bottom trailing Rewind with Cancel | Consequences and permanent Listening log distinction in sheet |
| Library / Select Subscriptions | Changed Download Rule visible; code | Feed-specific refresh error and Retry; code | Radio-choice Download Rule sheet | Shared history; code | No Subscriptions + Add podcasts | None | Root trailing Add podcasts; selection commands in bottom bar | Grouped by Download Rule; explanatory rule text in sheet |
| Add podcasts | Green check in reserved result slot + named inverse snackbar | Under field or affected result, error-role text; code | None | Shared snackbar/history | No results near input; code | Find disabled while working; Clear input remains | Field trailing Find; result trailing Subscribe | Example name/feed address beneath persistent label |
| Podcast page / subscription settings | Green check + “Subscribed to <name>” inverse snackbar | Near failed subscription action or Episode, Retry; code | Armed red Unsubscribe replaces check; expires with accessibility timeout | Shared snackbar; same-page subscription reversal | No Episodes/no matches + Refresh/Clear search; code | Action busy disables affected work; fixed busy seam | Top-bar Subscribe/check; Episode Add/Play; setting choices in sheets | Visible Show/Hide podcast details alternative to pull-down; inherited settings explained |
| Settings / option sheets | Changed choice/switch visible; import summary inline; export snackbar; code | OPML error beneath its section, practical Retry/Retry failed; code | Native file picker, bounded choice sheets | App-bar history after closing sheet; local snackbar if an action emits feedback | No empty categories in captures | OPML busy only disables related file actions; code | Text rows; sheet bottom trailing Done | Explanations under setting names, near relevant task |
| Listening stats | Selected date and definition disclosure update in place | Shared sync notice; code | None | None needed for inspection | No listening + Find something to play | None | Chart/day controls; Show table/chart below chart | 48 dp definition buttons beside each heading |
| Welcome / server connection | Connect enters usable app; discard snackbar above commit row before first connection; code | Persistent field supporting error + recovery; code | Start on this phone / Connect to a server | First-run discard uses local snackbar; connected form uses shared history; code | Not applicable | Field disabled during address check | Primary Start; connection commit beneath field | Server optional; address example and per-address Library scope |
| Mini player / Now Playing | Playback state and Position visible | Retry icon and playback-error snackbar; code | Speed/Sleep sheets | App edit history when relevant | No player without current Entry | Buffering feedback; code | Central Play/Pause, skip buttons, Episode/Entries | Tooltips, accessible identity, chapter/time information |

**Mismatches:** no confirmed measured cross-screen message mismatch in A–E. Feedback inside sheets belongs above their commit row; screen feedback belongs above the player/navigation, preserving modal ownership. One **code-only consistency gap** remains: first-run server draft discard is inline above its commit while New Playlist/New View use the screen snackbar. It is an understandable shell difference but worth harmonizing. It is not scored as a stability defect without a measured pair. Live setting selection deliberately uses the changed control itself instead of a success toast.

## Checklist

**Coverage: 84.9% — pass 61 · fail 1 · N/O 11 · N/A 6.** Calculation: `(61 + 1) / (61 + 1 + 11) = 62/73`. Every one of the 79 core IDs has exactly one verdict below. Mac-only and Web-only checks are **N/A → Android phone** and outside this denominator. Android Phone's six platform signals are assessed separately under Scores.

### Failures by severity

**AX-01 · blocker — Mini-player skip buttons have no individual accessible names in the supplied Android tree.**

- **Where:** the persistent mini player on Views and other ordinary screens, across Light, Dark, and 200% text.
- **Evidence:** `E/light/01-views.txt`, parent `@e41`, combines “Forward 30 seconds, Back 15 seconds, Now Playing: Market Hours · The long life of a shipping container”, while its distinct button nodes **`@e46` and `@e51` are unnamed**. `E/dark/01-views.txt` repeats that structure; `E/font200/01-views.txt` repeats it at parent `@e40`, unnamed buttons `@e45` and `@e50`. `E/light/63-podcast-subscribed.txt` independently repeats it at parent `@e75`, buttons `@e80` and `@e85`. The neighboring Play and Playlist buttons have their own names. In `E/light/08-now-playing.txt`, the expanded player's separate buttons correctly read “Back 15 seconds” and “Forward 30 seconds”. This is a failure in the supplied **exposed node structure**, not a claim that live TalkBack speech was tested.
- **Code qualification:** `app/PlayerPresentation.kt:150` puts the controls inside a clickable enclosing Column; lines 153–162 add a traversal group around tooltip-wrapped skip buttons. `SkipButton` at lines 270–284 does declare a content description. `UiStabilityTest.kt:110–157` checks names and distinct targets in Compose's merged and unmerged semantics trees. Those declarations/tests do not establish that the Android accessibility bridge exposes the same independent names; they do not negate the repeated supplied Android snapshots. The nesting/tooltip/bridge interaction is the suspected cause, not a proven diagnosis.
- **Concrete fix:** make the artwork/open-player target and each playback command independent accessible click targets; prevent the enclosing clickable/tooltip semantics from acquiring the skip controls' names. If necessary replace the enclosing clickable container with separately bounded expansion targets, keeping the owner's controls-led visual design. Verify the actual Android AccessibilityNodeInfo tree and TalkBack focus: each skip button must expose its own name, button role, action, and ≥48 dp bounds, independently of the player-opening target, at both text scales and appearances. Add that bridge-level verification alongside the existing Compose checks.
- **Severity/cap:** the checklist defines AX-01 as blocker even though the expanded player provides a workaround. **Interaction & feedback ≤4.9; Overall ≤6.9.** Count this once, not again as an icon, touch-target, or FLOW failure.

### Complete verdict ledger

Grouped IDs share the stated verdict; evidence qualifications constrain the claim.

| ID(s) | Verdict | Evidence |
|---|---|---|
| FLOW-01 | N/O | Four unresolved subscription-slot comparisons; see Flows. |
| FLOW-02, FLOW-03, FLOW-04 | pass | Delayed typing probe, stable focus/scroll/text, visible Undo; measured pairs above. |
| FLOW-05 | N/A | No side-by-side peer panels in this phone UI. |
| FLOW-06, FLOW-07 | pass | Screens/strips and permanent busy seams; matching action regions by form kind. |
| KEY-01, KEY-04, KEY-07 | N/O | No complete attached-keyboard traversal, focus-ring/order, or scrolling-key run. Component focus code is not a whole-app keyboard test. |
| KEY-06 | pass | Custom app bindings use Ctrl+Z and Shift+Ctrl+Z without punctuation/layout-specific combinations (`MainActivity`, `HistoryActions`). |
| KEY-08 | pass | Android-adapted reference: `onProvideKeyboardShortcuts` registers Undo/Redo in the system panel. No bare-key accelerators. The owner-fixed absence of a duplicate phone-content list does not break Android's command surface. |
| DLG-01, DLG-02, DLG-03 | pass | No routine deletion confirmation. The notification rationale is an actionable permission decision with specific title, reason, Continue and Not now (`IncomingContent.kt`). |
| DLG-04, DLG-05, DLG-07 | pass | Material dismissal/Back and explicit Cancel where needed; red Delete/Unsubscribe; Rewind has Cancel/Rewind, option sheets Done plus system Back. No Cancel/Done/Back trio. |
| DLG-09 | pass | Entry/Podcast menus are anchored to their source; draft text is durable on sheet dismissal. No multi-level popup command stack. |
| CTRL-02 | N/A | Flat checkbox lists; no mixed parent/child hierarchy. |
| CTRL-03, CTRL-04 | pass | Persistent field labels, locale-aware number parsing/formatting, field-specific invalid/duplicate-name reasons (`EditorComponents`, `NameEditor`, `ServerScreen`). |
| CTRL-05, CTRL-06 | pass | Material pressed feedback/ripple; filled versus outlined/text emphasis. Primary Play/Add/Subscribe remain outside menus. Player target sizing serves its touch task. |
| CTRL-07 | pass | “Search the Library”, “Search Episodes”, and Add podcasts' name/address field distinguish scopes. No search-history surface to clear. |
| CTRL-08 | pass | Code: byte progress when known, indeterminate otherwise, download Cancel; OPML processed/total with Stop/Resume and partial results; lookup cancellation on new input. Runtime OPML presentation remains unexercised. |
| LIST-01, LIST-02, LIST-03 | pass | Content feeds properly remain lists under the Android clause; stats offer a two-column Day/Time listened table; headings name scope; Sort lives in a View choice sheet. |
| LIST-04 | N/A | No dense multi-column name table needing middle-ellipsis/row-striping treatment. |
| LIST-05, LIST-06 | pass | Podcast description expansion stored in `PodcastBrowsing`; active bottom destination/tab, selected radio/check rows visibly marked. |
| LIST-07 | N/O | Touch opening/selection observed and code-defined, but attached-keyboard focus/arrows not established. |
| DATA-01 | pass | Code-level finding: persistent raw drafts/caret, durable View edits, explicit rename Save/Cancel, flush on stop/disposal, snapshot-guarded cleanup (`FormDraftState`, `MainActivity`, `ViewEditor`). Process-death execution not tested. |
| DATA-04, DATA-05 | pass | Multi-step inverse/redo history and Ctrl bindings; measured Undo flows; restored Entry/setting is explicitly revealed (`HistoryActions`, `ScreenActions`, `SettingsFeedback`). |
| DATA-06 | pass | Durable per-destination stacks, scroll anchors, Playlist tabs, queries, selection and stats context (`BrowsingState`, `PodListScreens`, data browsing store). Captures also show stats returning to a retained scroll position. Runtime recreation not claimed. |
| DRAG-01, DRAG-03 | pass | Code: Entry handle drag plus discrete Move up/down and reversible MoveEntry; discrete move/Undo exercised in B. |
| DRAG-05, DRAG-06 | pass | Code: touch-slop gesture detection, translated/elevated source, insertion boundary, cancel reset, edge autoscroll and retained destination highlight (`EntryDragging`). Actual drag feel remains unobserved. |
| PTR-03 | N/O | Pointer attachment, cursor/gesture behavior not exercised. |
| PTR-04 | pass | Action-specific Material TooltipBox labels; long input remains editable/scrollable. Phone reading does not require redundant tooltips over fully labeled text commands. |
| APPEAR-03 | pass | Independent themes and UiModeManager contrast listener; semantic foreground/outline strengthening; opaque surfaces rather than transparency-only boundaries (`MainActivity`). |
| APPEAR-04 | pass | Source-token contrast measurements below; active text/essential glyphs clear thresholds in inspected captures. Disabled controls and quiet decorative separators are excluded. |
| APPEAR-05 | N/O | No reduced-motion capture/run. Stock Compose animation use alone does not verify every custom scroll/transition. |
| APPEAR-09, APPEAR-10 | pass | Coherent vector symbol family, recognizable transport/actions; controls separated by treatment and placement; motion serves navigation/state. |
| APPEAR-11 | pass | Inspected sampled pending/done/input strip frames remain coherent; no confirmed flash, contradictory state or non-core loading jump. Sampling does not prove every intervening frame. |
| TYPE-02, TYPE-03, TYPE-05 | pass | System font; deliberate 12/18, 14/21, 16/24 etc. sp scale; 200% wrapping, action-grid reflow, stacked stats, scrollable sheets/tabs keep essential content. Viewport-edge partial rows are normal scrolling, not clipped inaccessible text. |
| TYPE-06 | pass | Default-size server/help paragraphs use approximately 50–65 characters per full line and 150% body leading; show notes preserve paragraph separation. Lists and enlarged-text line length are not judged against the default reading measure. |
| TYPE-07, TYPE-08 | pass | No app-authored long all-caps emphasis; typographic quotes, ellipses and dashes in strings. Artwork initials are decorative, publisher text remains literal. |
| COPY-01, COPY-04 | pass | Specific verbs and consistent domain terminology/capitalization; Android tap vocabulary and concise action tooltips. |
| COPY-02 | pass | Code: address/TLS/network/feed/duplicate/storage errors explain recovery beside cause; Retry/Retry failed preserve usable context. |
| COPY-03 | pass | Library, History, Trash, stats and no-match states explain what to do and supply a specific recovery action. |
| AX-01 | **fail · blocker** | Exposed mini-player skip buttons are unnamed; evidence and fix above. |
| AX-02 | pass | Selection has checkboxes/fill; current Entry has text/edge mark; subscribed state has a check and accessible label; errors have wording, not color alone. |
| AX-04 | N/O | Pull-down has Show details; drag has discrete menu/custom actions; chart has day buttons/table. These are good code paths, but full assistive-input operation is untested. |
| AX-05 | pass | No critical app information depends on a sound alone; playback has visible controls/time/error state. A podcast's publisher audio is content, not an app-only critical alert. |
| START-01, START-02, START-03 | pass | Local usable content/loading states; standalone first run; dismissible and reopenable Getting started; contextual rule/stat/rename explanations. Launch timing itself is N/O under RESP-01. |
| START-04, START-05 | pass | Notification permission requested from download use, with a complete specific rationale and optional Not now (`IncomingContent`, `AppModel`, `AndroidDownloads`); no startup permission wall. |
| START-06 | pass | Start on this phone is primary, server optional; no account tollgate or custom authentication. |
| START-07 | N/A | No account-creation offering. |
| EDIT-02, EDIT-05 | pass | Native fields retain editing operations; show notes selectable with safe annotated links; native share intent and explicit Copy feed address supply useful URLs. Platform Sharesheet execution not observed. |
| WIN-03 | N/O | The 448 dp portrait window and font scaling are established; narrower compact windows and landscape are not. Tablet/foldable widths are explicitly out of scope. |
| TOOL-06 | pass | Collapsed player returns via artwork/body; contextual mode has Cancel; permanent navigation returns after selection/editor completion. |
| SIDE-03, SIDE-04 | N/A | No concurrently displayed navigation/detail panes at this compact target. |
| SET-01 | pass | Global options/OPML in Settings, Playlist options with Playlist, per-Subscription overrides/Download Rule beside Podcast, temporary Episode speed in player. |
| RESP-01, FOOT-02 | N/O | Timed debug-emulator observations and frame samples cannot establish audience-device latency or smooth scrolling. |

**N/O:** FLOW-01, KEY-01, KEY-04, KEY-07, LIST-07, PTR-03, APPEAR-05, AX-04, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, CTRL-02, LIST-04, START-07, SIDE-03, SIDE-04; Mac-only/Web-only checks → Android phone (not counted).

**Other unverified behavior:** live TalkBack speech/gesture traversal; rotation/process-death execution; predictive Back animation; live Sharesheet, lock-screen controls, notification controls, Android Auto, Bluetooth/audio focus, launcher shortcuts, drag execution, OPML-in-progress rendering, and real publisher-feed variation. Source supplies structural evidence for several of these; it is not a runtime claim or extra coverage credit.

## Scores

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.7** | Strong, approaching Exemplary: system type roles, 14/21 metadata and 16/24 prose, comfortable paragraph leading, wrapping at 200%. Long dot-separated podcast/date/duration/state strings still flatten different metadata roles into one block, most evident in 200% Playlist rows. | hierarchy, craft, accessibility |
| Hierarchy | **8.6** | Strong: Episode title → metadata → dominant Play → subordinate actions; compact Podcast header lets Episodes lead. Entry metadata and inline actions compete for a narrow text column at 200%; secondary actions could recede more cleanly. | content-first, hierarchy |
| Spacing & density | **8.3** | Strong: recurring 16 dp gutters, ≥48 dp command targets, compact View-condition rhythm and reserved loading seams. At 200%, Entry rows retain a 48 dp drag handle and 96 dp trailing action group, leaving about **256 dp** for title/metadata at this 448 dp width, while ordinary Episode rows move actions below. Several tall rows greatly reduce scanning density without losing content. | craft, adaptability |
| Color & contrast | **9.1** | Exemplary in inspected appearances: restrained blue, independently toned dark surfaces, distinct green subscription state, purposeful red destruction, high-contrast adaptation in code. Token ratios: secondary text **8.86:1 Light / 10.89:1 Dark**; blue links **6.46:1 / 10.93:1**; subscribed check **6.57:1 / 7.82:1**. No measured contrast failure. Full custom content variation and live contrast settings remain unexercised. | color-restraint, accessibility |
| Iconography | **8.4** | Strong coherent vectors, outlined/filled bottom-destination pairs, readable 15/30 transport glyphs. Playlist/add/Entries glyphs are visually similar small line constructions; repeated row Add/Play pairs and player shortcuts require more recognition than the best text-led exemplars. The separate AX-01 cap is not counted again here. | conventions, craft |
| Consistency & polish | **8.5 (stability 8.6 Light / 8.6 Dark)** | Strong: common field/commit/empty/error components; durable unfinished states; measured typing and feedback stability. Large-text Entry actions use a less effective arrangement than sibling Episode rows; server draft-feedback placement differs in code. FLOW-01/secondary-flow limits prevent an end-to-end Exemplary claim. No stability cap is triggered. | stability, craft, conventions |
| Clarity | **8.4** | Strong: scopes, current Entry, inherited values, named confirmations, Trash consequences and Rewind effects are explicit. Several metadata/helper passages are dense with capitalized domain nouns. Owner-fixed artwork-only playback identification adds a deliberate recognition/extra-navigation cost; preserve that decision. | plain-language, feedback |
| Platform fit | **7.8** | Strong, code + capture rather than screenshot-only: **Looks 8.8; Behaves 7.3; (8.8 + 2×7.3)/3 = 7.8**. Android navigation, Material controls, insets, font reflow, native share intents/channels and durable context are appropriate. Exposed mini-player naming is a Foreign accessibility signal; live lifecycle/system integration remains partly unobserved. | conventions, adaptability |
| Interaction & feedback | **4.9** | **Weak by blocker cap**, not a claim that the whole touch flow is weak. Multi-step Undo/Redo, safe drafts, two-tap Unsubscribe, visible progress/retry and discrete drag alternatives are substantial strengths. AX-01 fails on persistent core playback controls. Physical-device responsiveness and complete keyboard/assistive traversal remain N/O. | accessibility, forgiveness, feedback |
| **Overall** | **6.9** | **Capped by 4.9 + 2.0.** The visible touch UI is generally Strong and deliberate, but the supplied native accessibility tree does not meet a core expectation. A 9.0 grade cannot coexist with this blocker. Removing it would require a fresh behavioral grade; it would not automatically turn the remaining Strong craft scores into Exemplary. | accessibility, craft, content-first |

Contrast values are WCAG sRGB relative-luminance calculations on foreground/background tokens from `MainActivity.kt`, not averages of antialiased screenshot edges. Foreground/background pairs: `#46464f/#faf8ff`, `#c7c5d0/#121318`, `#2b50c8/#faf8ff`, `#b8c4ff/#121318`, `#ffffff/#176b39`, `#00391a/#80db9a`. Normal outline `#777680/#faf8ff` is 4.25:1 and Dark outline 5.83:1, above the 3:1 essential non-text threshold. Decorative inset separators and disabled controls are not misclassified as actionable text.

### Android Phone signals

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native (S, C) | Three equal labeled destinations, selected state, no root Up; inner Up and trailing actions. |
| L2 Visual language | Native (S, C) | Coherent Material 3, deliberate blue/dark tokens, one vector language. No imported iOS frame/control grammar found. |
| L3 Density/text/system frame | Adapted (S, C) | dp/sp, 48 dp controls, body minimum 12 sp, edge-to-edge/safe/IME handling and useful 200% reflow. One observed phone width; other compact configurations unverified. |
| B1 System navigation | Adapted (C, supplied flow) | Navigation scaffold Back, armed-Unsubscribe Back handling, selection/modal dismissal, PredictiveBackHandler for player. Actual predictive animation and every Back path were not exercised. |
| B2 Preferences/access | **Foreign in part** (S, C) | Light/Dark/System, scalable text, resource strings and native roles are good. Independent mini-player skip names fail in the exposed Android snapshot; see AX-01. No broad claim of broken TalkBack everywhere. |
| B3 System surfaces/lifecycle | Adapted (C; runtime partial) | ACTION_SEND chooser, channels/services, contextual permission prompt, durable drafts/browsing/playback records and launcher shortcuts. Execution after process death, Sharesheet targets and background controls remain unobserved. |

## Next step

**Target:** AX-01, following the guide's blocker-first priority. **Anti-pattern:** no named catalog anti-pattern exactly fits; this is a nested-control accessibility grouping/bridge defect, not “mystery-meat navigation” in the visual layout. **Root cause to investigate:** independently named Compose controls are not becoming independently named Android accessibility buttons within the clickable mini-player hierarchy.

1. **Preferred smallest candidate:** isolate mini-player expansion and each transport command as separate accessible click targets; keep the same visual layout, 48 dp bounds, blue accent, and artwork-only identity. Confirm independent names/roles/actions in Android's exposed tree, then TalkBack, rather than relying only on Compose-tree assertions. Serves `accessibility` and `user-control`; expected to remove the Interaction cap and improve Behaves. Risk: changing semantics nesting can alter focus order or the available background expansion target; preserve explicit traversal and test both.
2. If the enclosing clickable is needed for the desired tap area, partition only the non-control areas into expansion targets and leave transport buttons outside that semantics subtree. Same expected benefit; slightly more hit-region/layout complexity. Preserve the owner-fixed player content and playback behavior.

After that blocker is verified fixed, the clearest craft improvement is **200% Playlist Entry layout**: move Play/menu to a secondary action row as ordinary Episode rows already do, retaining the 48 dp drag handle. Increase the text column from roughly 256 dp toward the available body width, then compare title wrapping, row height and visible Entry count; extra action-row height can offset the gain, so keep only a measured improvement. Also separate podcast/date/duration from playback-state metadata to make scanning easier, and align first-run draft-discard feedback with the shared form pattern. These are craft candidates, not additional checklist failures.

The closest relevant contrast is **TYPO-07, “Text enlargement reaches the content”**, and the Android gallery's warning against tall option cards that slow finding a known item. Borrow Niagara's dependable text edge and BuzzKill's consequence-beside-choice relationship, not either app's palette or card style.

## Log

Single independent audit; no hill-climb changes applied, as requested. Character check: blue Material roles **kept**; dark appearance **kept**; three bottom destinations **kept**; controls-led/artwork-only players **kept**; contextual sheets and Undo **kept**. No drift toward exemplar styling. Reports only; no commit.
