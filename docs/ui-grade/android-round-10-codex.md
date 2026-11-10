# PodList Android phone — independent UI audit, round 10 (Codex)

Commit graded: 3d26159cf834b62600aaf8324abde166a8ef0ea1. Review date: 10 November 2026. No earlier PodList grade or UI-GRADE.md work list was read. This is a report-only audit: no app, test or configuration edits, no device operation, no commit.

## Frame

- **Task:** Find Episodes through Views/Search/Library, collect them in Playlists, and listen with recoverable edits and a persistent player, with or without a server.
- **Target:** Android **phone**, compact portrait; tablet and foldable signals are excluded.
- **Posture:** Sovereign browsing/management interface with persistent background playback.
- **Audience:** Newcomer progressing to perpetual intermediate.
- **Nearest exemplar:** Things for calm hierarchy and forgiving edits; the supplied Android BuzzKill picker for consequence-first option copy and Niagara for list rhythm. Google Calendar’s supplied screenshot is a dated reference for Android control grammar only, not a tablet-layout requirement.
- **Character:** Owner-fixed Material 3 and blue #2b50c8 with independently toned dark surfaces; Views/Playlists/Library bottom navigation; separate discovery and listening; artwork/transport-led player; plain domain-specific state and recovery copy.

**Owner decisions:** All decisions in the brief are retained in the grading frame: native Material 3, accent/dark theme, three destinations, unified Add field, single-list View editor, summary-sheet Rewind, OPML in Settings, paused current Entry on relaunch, no visual podcast/Episode names in either player, named Trash deletion with Undo and no question, compact Podcast header/pull-down description, top-bar Subscribe/green check/two-tap Unsubscribe without dialog or navigation away, explicit Rename/Cancel/Save with controls below wrapping names, case-insensitive name uniqueness, and no phone shortcut listing. None is proposed for reversal.

**Baseline and evidence:** The supplied android-grade-10/README.md identifies this exact commit. Evidence root, abbreviated **E** below:

/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-10/

All 55 PNGs in each of light, dark and font200 were inspected (165 screenshots), with accessibility text trees consulted for labels/states. Captured device: Pixel 10 Pro XL emulator profile, Android 16, 1344 × 2992 px, density 480; **448 × approximately 997 dp**, font scales 1.0 and 2.0. Contact sheets used only for inspection are under the requested grade-android-10-codex scratch directory. The original full-resolution images remain authoritative.

Code evidence is relative to apps/android/app/src/main/kotlin/app/podlist unless qualified. CONTEXT.md, the two Android/product behavior documents, and ADRs 0011–0013 were read. The checklist, rubric, Android Phone signals, Android gallery/grades, principles, anti-patterns and relevant contrasts supplied the grading rules. Static inspection is not a substitute for a measured runtime claim.

## Flows

**No flow was run**, as instructed. The capture is a tour of separate states, not a flow measurement artifact.

| Task traced through capture/code | Evidence |
|---|---|
| Start on this phone or connect; leave/return to address draft | E/*/40, 41, 41b, 42, 43; WelcomeScreen, ServerScreen, AppModel |
| Open View, inspect Episode, select, Add to Playlist, Undo | E/*/01–05, 09, 50; PodListScreens, Selection, PlaylistAddSheet, HistoryActions |
| Edit conditions, rename View/Playlist, validate uniqueness | E/*/04, 04c, 05, 16b, 16c, 19; ViewEditor, RenameableName, domain Names |
| Playlist Entries/History/Timeline, Rewind, Trash | E/*/10–18; EntryDragging, TimelineScreen, PlaylistSettingsScreen |
| Search Library; find podcast; inspect/filter/expand/Subscribe/arm Unsubscribe | E/*/20–28, 59–63; SearchScreen, AddPodcastsScreen, PodcastPageScreen |
| Settings, subscription overrides, Download Rules, OPML | E/*/06, 06b, 06c, 07, 24, 25, 32; settings and transfer code |
| Player, Now Playing, chapters/seek/speed/sleep and nested pages | E/*/08, 08b; PlayerPresentation and PlaybackService |
| Empty/populated Listening stats | E/light/30–35; other themes’ 33–35; ListeningStatsScreen |

Widths/appearances: only the supplied 448 dp portrait window; light, dark and 200% text in light. No dark+200% capture. Timed runs/device measurements/script location/measurement file/screenshot strip: **none**.

Failures: **No scored FLOW finding is asserted without the required measurement row or screenshot pair.** FLOW-01, -02, -04 and -07 remain N/O; stability sub-score **N/O**. The code-only remote Episode-detail layout discrepancy below needs its own matched capture before FLOW-07 can be decided.

Evidence limitations: font200/30-listening-stats and 31-listening-stats-lower actually show Settings, so they do not establish the enlarged empty-stats layout. Rotation, process-death execution, live TalkBack/Switch Access, predictive Back animation, actual Sharesheet/notification interaction, Auto, Bluetooth/audio focus, launcher invocation, physical dragging and real publisher feeds were not exercised. Explicit implementation facts can still be assessed from code; their runtime success is not implied.

## Cross-screen inventory

Legend: **S** = inverse-surface snackbar above player/navigation, short outcome wording, Undo action in inverse-primary; a modal sheet hosts the same snackbar when open. **E** = red inline error near cause, polite announcement, practical retry/correction. **Q** = neutral Material sheet/dialog with a heading and explicit decision. **U** = S Undo plus persistent toolbar Undo/Redo; descriptions name the operation. **Empty** = neutral leading body text and a named next-step control. “None” means absent in this screen’s implementation, not an uncaptured success inferred from a screenshot. Code supplies states absent in the tour.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View results | S edit outcomes | Top sync strip, neutral local-data status + retry | None | U | Leading Empty + New View/Add/edit conditions | None | Root trailing +; row Add/Play | Getting started; filter summary |
| View editor / New View | S “View changed/created” | E by invalid field/range | Condition Q; explicit rename field | U | Zero-match footer count | None | Trailing pinned Done/Create View; rename Cancel/Save below field | Permanent draft note at list end |
| Search | S “View created” | E beside View-name field | Inline name, Cancel/Create View | U | Empty + clear Search/Add podcasts | None | Search field top; Save as a View below it | Scope in field label |
| Episode detail | S Star/Played/Add/download outcomes | Download failure inline neutral body, retry | Add Q | U | No-playlist message; absent notes/chapters omitted | None | Filled full-width Play Now; labeled action grid | Notes, Playlist Positions, Chapters |
| Playlist list / Entries | S edit/move outcomes | Top sync strip | Add Q | U | Empty + Find Episodes | None | +; Entry Play/menu/drag | Active/Now/progress state |
| Playlist settings / Rename | S named rename/Trash result | E by name | Explicit inline Rename, Cancel/Save | U | None | None | Rename below name; Delete on own line | Clear on Played and Trash consequence text |
| History | None | Top sync strip | None | U when history exists | Empty + Show Entries | None | Open Episode | Explains how History fills |
| Listening Timeline | S after Rewind | Top sync strip | Rewind Q | U | Empty + Show Entries | None | Eligible row → Rewind summary | Rewind symbol instruction |
| Rewind sheet | S after commit | None | Q consequence summary; Cancel/Rewind pinned | U after edit | “None” under empty consequence sections | Modal by task | Bottom trailing Rewind | What goes back, returns and stays |
| Trash | S restore or renamed-restore result | Top sync strip | None | U | Empty + Back to Playlists | None | Row Restore | Retention explanation |
| Library | S subscription/rule outcomes | E beside standalone refresh failure; top sync strip | Rule Q after selection | U | Empty + Add podcasts | None | Top + and bottom Add row; Search row first | Download groups and Search scope |
| Add podcasts | S “Subscribed” | E below field or named result | None | U | No-results recovery text | None | Trailing Find podcasts below field; result Subscribe | Field names both accepted inputs |
| Podcast page | S “Subscribed/Unsubscribed” | E in header area with retry | Same-control armed Unsubscribe | U | Empty + Refresh/clear Search | None | Top trailing Subscribe/check/Unsubscribe | Visible details disclosure; author/count |
| Subscription settings | Chosen row value changes inline | E for numeric limit | Value Q | Persistent history; sheet S on reversal | None | None | Value rows | Default and inherited values explained |
| Download Rules | Radio/value state changes inline | E field validation, but F2’s rule is incomplete | Q options + Done/Back | Persistent history | Unlimited via blank | None | Radio rows and numeric cap | Consequence beneath each rule |
| Settings / Appearance | Inline selected values; S export/import outcome | E at OPML controls; per-feed failures | Value Q; system file picker | Persistent history | None | File picker/optional permission Q | Named settings rows | Inheritance and OPML purpose subtitles |
| Listening stats | Updated totals/chart | None | None | None | Empty + Find something to play | None | Chart/day buttons/table toggle | Units; About your stats |
| First run / Connect | Connected destination becomes usable | E under address | Optional Standalone bring-over Q | None for connection setup | Meaningful initial screen | Welcome until one setup route chosen | Start on this phone; Connect; trailing check | Server purpose and local-library scope |
| Getting started | Completion check per step | None | None | None | Not applicable | None | Add podcasts; Hide | Three task-specific steps |
| Mini player | Play/pause/progress state | Error/retry control plus S | None | App history via screen | Omitted with no current Entry | None | Central Play/Pause | Accessible identity and Playlist/count |
| Now Playing | Transport/seek/speed/sleep state | Inline error + retry; buffering text | Speed/sleep Q | App history in header | Chapter links omitted if unavailable | None | Large central transport controls | Episode/Chapters/Entries routes |

**Inventory mismatch:** Episode download failures use ordinary onSurface body text (PlaybackActions.kt:115–124), while Add, Podcast, Server and OPML errors use the error role. Wording and Retry still make the failure understandable, so this is a craft inconsistency, not an additional AX-02 failure. Use the same inline error component and tone while retaining the text/announcement. Direct state changes in settings appropriately avoid unnecessary success snackbars; that difference is task-sensitive, not a mismatch.

## Checklist

**Coverage: 81.2%** (pass 53 · fail 3 · N/O 13 · N/A 10). Calculation: (53 + 3) ÷ (53 + 3 + 13) = 56/69.

Every one of the 79 core IDs has one verdict below. Mac-only and Web-only checklists: **N/A → Android phone target**, excluded wholesale from the counts. Android Phone signals are assessed separately after the table.

### Failures by severity

**F1 — CTRL-08 · major · Download progress notification**

- **Where:** A Manual Download or rule-triggered audio download, while viewed on Android’s notification surface.
- **Evidence (C):** AndroidDownloads.kt:194 calls setForeground(foreground()) once. foreground() at :251–258 always constructs an indeterminate progress notification. The worker knows the content length at :211 and publishes received/total to WorkManager at :223, but does not rebuild/update the notification with those values. PlaybackActions.kt:126–129 correctly uses them for the in-app progress bar. Thus progress is measurable yet the system-facing indicator remains indeterminate. Actual notification interaction is still unobserved.
- **Concrete fix:** At the existing throttled progress update, update ForegroundInfo/notification with a bounded received/total fraction when total > 0; keep indeterminate progress for unknown totals. Keep Cancel and the channel. Give the notification the same progress semantics as Episode detail.
- **Principle / cap:** feedback; Controls → Consistency & polish ≤ 6.9.

**F2 — CTRL-04 · major · Integer limit validation does not explain the invalid input**

- **Where:** Subscription settings → Download Rule → As Episodes are published → Keep at most.
- **Evidence (C):** SubscriptionSettingsScreen.kt:74 creates an integer NumberField with minimum 1. EditorComponents.kt:110–117 and domain NumberInput.valid reject a pasted fractional value such as 1.5 (in a decimal-point locale), and reject values above Int.MAX_VALUE. Every rejection nevertheless displays m4_number_error: “Enter a number of 1 or more.” The rejected 1.5 satisfies the rule that message states. The input is safely preserved, but its correction is not explained. No runtime reproduction is claimed.
- **Concrete fix:** Distinguish parse, minimum, whole-number and maximum problems; for the fraction use “Enter a whole number of 1 or more, or leave blank for unlimited.” Name the upper bound if it is retained. Preserve the raw draft and valid prior value as today.
- **Principle / cap:** feedback; Controls → Consistency & polish ≤ 6.9. Counted once here, not again under COPY-02.

**F3 — DLG-02 · minor · Permission rationale has no situation title**

- **Where:** First notification-permission explanation for downloads.
- **Evidence (C):** IncomingContent.kt:39–44 supplies AlertDialog text/confirm/dismiss slots but no title. The body’s explanation is useful and specific; the guide’s separate short alert-title requirement is unmet.
- **Concrete fix:** Add a brief title such as “Show download progress?” above the existing reason, retaining Continue and the deferral route. No new dialog or permission step is needed.
- **Principle / cap:** plain-language; minor, so no category cap.

No blocker established. The two major findings are code-settled edge states; neither is inferred from an uncaptured device failure.

### All verdicts

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | **N/O** | No measured transitions or screenshot strip. |
| FLOW-02 | **N/O** | No running focus/scroll observation. |
| FLOW-03 | **pass** | FormDraftState.clearIfUnchanged and submitted draft snapshots; Add locks its lookup field; numeric raw drafts own input. |
| FLOW-04 | **N/O** | 63 shows visible Undo and 15 visible decisions, but IME/error follow-ups across tasks were not measured. |
| FLOW-05 | **N/A** | No peer side-by-side panels in this phone target. |
| FLOW-06 | **pass** | 01–63: populated sections or explicit empty states; Library omits unused groups with their headings. |
| FLOW-07 | **N/O** | Captured single-field commits agree; the uncaptured remote Episode-detail branch needs a paired capture before an app-wide verdict. |
| KEY-01 | **N/O** | No complete hardware-keyboard traversal; Compose controls alone cannot establish the entire route. |
| KEY-04 | **pass** | FocusedInputModifier, RenameableName focus/return focus, native Material focus treatment; 04c/19/26/41 identify expected inputs. |
| KEY-06 | **N/A** | No custom layout-dependent character accelerators; standard Ctrl+Z/Shift+Ctrl+Z only. |
| KEY-07 | **N/O** | Page/Home/End/Space behavior unexercised. |
| KEY-08 | **N/A** | Phone target has no bare-key accelerators; shortcut reference deliberately omitted by owner. |
| DLG-01 | **pass** | Playlist/View deletion and Subscribe use Undo; modal rationale is a permission decision, not routine success feedback. |
| DLG-02 | **fail** | F3: download permission rationale AlertDialog has no title. |
| DLG-03 | **pass** | Rewind/Cancel, Save/Cancel and Continue/Not now name outcomes; Not now defers optional permission. |
| DLG-04 | **pass** | Rewind cancels without editing; rename Cancel discards only its explicit draft; native dismiss/Back exits sheets. |
| DLG-05 | **pass** | 16c Delete Playlist is red and directly chosen; reversible Trash deletion has no alarming confirmation. |
| DLG-07 | **pass** | Material sheets provide Done and system Back/dismiss; Rewind uses Cancel/Rewind; no three-way Cancel/Done/Back chrome. |
| DLG-09 | **pass** | 12 and 27a menus are anchored in the triggering Box; dismissed editor drafts persist. |
| CTRL-02 | **N/A** | No hierarchical checkbox parent. |
| CTRL-03 | **pass** | 04c/19/21/26/41 floating labels persist; no sensitive credentials requested. |
| CTRL-04 | **fail** | F2: integer-only download limit has the generic lower-bound-only validation message. |
| CTRL-05 | **pass** | Material pressed/disabled states; large transport controls are a deliberate adapted audio-control hierarchy. |
| CTRL-06 | **pass** | Root Add and Settings, Episode Play/Add, and Subscribe remain visible; overflow holds contextual secondary commands. |
| CTRL-07 | **pass** | Search the Library and Search Episodes state scope; Add field identifies podcast names/feed addresses; no search history. |
| CTRL-08 | **fail** | F1: foreground download notification remains indeterminate with known total; in-app progress is correctly determinate. |
| LIST-01 | **pass** | Content feeds use Android lists; daily-statistics table uses aligned Day/Time listened columns. |
| LIST-02 | **pass** | Named Views/Playlists/Library and short noun headings; stats table labels are nouns. |
| LIST-03 | **pass** | View Sort sheet exposes all four explicit orders; no column-header sorting surface to misbehave. |
| LIST-04 | **N/A** | No dense multi-column ledger or narrow pathname column. |
| LIST-05 | **pass** | Podcast detail disclosure toggles one section and persists expanded in BrowsingContext.podcasts. |
| LIST-06 | **pass** | Three bottom destinations, Playlist tabs, radio values and selected rows have persistent visible marks. |
| LIST-07 | **N/O** | Touch open/selection is established; attached-keyboard list focus and arrows are untested. |
| DATA-01 | **pass** | Raw form input is committed through FormDraftStore before UI acknowledgment; server draft is file-backed; clearing is deliberate/guarded. Process-death execution remains untested. |
| DATA-04 | **pass** | HistoryActions supports multi-step inverse/redo, typing boundaries and retry after failed reversal; visible Undo/Redo and Ctrl+Z routes. |
| DATA-05 | **pass** | revealChanges, EntryList reveal/scroll/highlight and SettingsFeedback expose restored content/values. |
| DATA-06 | **pass** | BrowsingContext persists destination, stacks, scroll anchors, Playlist tab, search and podcast disclosure; mini player restores paused Cursor. Actual relaunch/process recreation untested. |
| DRAG-01 | **pass** | EntryDragging implements reorder; EntryMenu Move up/down and accessibility custom actions provide non-drag equivalents. |
| DRAG-03 | **pass** | AppModel.moveEntry records its inverse in edit history. |
| DRAG-05 | **pass** | detectDragGestures threshold, moving-row translation/elevation, 3 dp insertion cue and cancel reset are explicit in code. Gesture feel untested. |
| DRAG-06 | **pass** | EntryList edge autoscroll and destination reveal/highlight/focus are implemented; local move needs no network placeholder. |
| PTR-03 | **N/A** | No pointer-specific phone interaction to audit; tablet input parity is outside this target. |
| PTR-04 | **pass** | ActionIcon/ActionTooltip supply named PlainTooltip surfaces for icon controls; text controls already show their actions. |
| APPEAR-03 | **pass** | Independent light/dark roles and UiModeManager contrast listener; borders are explicit; no custom transparent reading layer. Preference combinations not run. |
| APPEAR-04 | **pass** | Measured token pairs below pass text/non-text thresholds in both themes; no failing foreground established in captures. |
| APPEAR-05 | **N/O** | No reduced-motion run; framework animations plus custom predictive translation do not settle actual preference behavior. |
| APPEAR-09 | **pass** | One vector family, familiar transport/star/add/share symbols, consistent 24 dp action glyph treatment; 01–63. |
| APPEAR-10 | **pass** | Tonal player/selection surfaces, outlined fields and text/filled button hierarchy separate content from controls. |
| APPEAR-11 | **N/O** | Separate endpoint captures cannot prove coherent intermediate/loading frames; launch background code alone is insufficient. |
| TYPE-02 | **pass** | MainActivity uses system font, Normal/Medium weights and a restrained role scale. |
| TYPE-03 | **pass** | Body/caption roles are 12 sp or larger; captured UI text scales. Skip digits are treated as embedded icon artwork. |
| TYPE-05 | **pass** | 200% values stack, Episode actions wrap below rows, action grids become two columns, stats tiles stack; scrollable content retains access. |
| TYPE-06 | **pass** | Stats explanatory prose at default size has 66/66/66 characters in three full lines and 14/21 sp leading; phone reading measure is comfortable. |
| TYPE-07 | **pass** | Own text has no long all-caps passages or combined bold/italic emphasis; links alone are underlined. |
| TYPE-08 | **pass** | Resource copy uses curly punctuation, ellipsis and real range/minus marks; URLs/user content remain literal. |
| COPY-01 | **pass** | Play/Add/Rename/Rewind/Subscribe are specific; domain terms match CONTEXT; phone instructions say tap. |
| COPY-02 | **pass** | Network/feed/storage errors name recovery and stay by the cause; F2 is recorded once under CTRL-04 as field validation. |
| COPY-03 | **pass** | History, Trash, Views, empty Library and empty stats give a concrete next action; descriptive links name destinations. |
| COPY-04 | **pass** | Sentence-style labels retain defined domain capitalization; icon tooltip strings name actions. |
| AX-01 | **pass** | Capture trees and code supply control names, native roles/states, seek time, selected states and player identity. Live TalkBack traversal is not certified. |
| AX-02 | **pass** | Checkmark plus subscribed label, checkbox selection, Now text, progress/state text and written errors supplement color. |
| AX-04 | **pass** | Podcast details have a visible text button/custom action; reorder has menu/custom actions; chart has day buttons and table. Live Switch Access remains untested. |
| AX-05 | **pass** | Visual play/pause, buffering/error and retry equivalents exist; no automatic start on launch. Publisher transcripts are not app-owned UI audio. |
| START-01 | **N/O** | Useful local loading UI is implemented, but prompt launch/content timing and availability were not observed. |
| START-02 | **pass** | GettingStarted hide state persists; Settings reopens it; Standalone avoids server setup tax. |
| START-03 | **pass** | 42 contextual three-step card, per-rule help, Rewind consequences and inheritance explanations are dismissible/relevant. |
| START-04 | **pass** | Notification request originates from download use; no storage-wide permission; platform file picker handles OPML. |
| START-05 | **pass** | Permission rationale explicitly explains seeing progress and stopping a download; no sensitive permission without a reason. |
| START-06 | **pass** | 40–43 and DeviceLibrary: core use works on this phone without a server/account. |
| START-07 | **N/A** | No account creation offered by this client. |
| EDIT-02 | **pass** | Native Compose fields and SelectionContainer retain standard editing; app undo handles unconsumed keys rather than replacing field edits. |
| EDIT-05 | **pass** | Selectable notes retain text/URL links; Share Episode uses ACTION_SEND plus Intent.createChooser. Actual Sharesheet unexercised. |
| WIN-03 | **N/O** | Only 448 dp portrait compact window captured; smaller phones/landscape/IME layouts are not established. Tablet/foldable excluded. |
| TOOL-06 | **N/A** | No configurable hideable toolbar/panel; collapsed player retains a visible reopening surface. |
| SIDE-03 | **N/A** | No sidebar in this compact phone presentation. |
| SIDE-04 | **N/A** | No adjacent navigation pane/detail pair in this target. |
| SET-01 | **pass** | 06/07/32 central app Settings; Playlist and Subscription options remain with their objects; OPML in Settings is owner-fixed. |
| RESP-01 | **N/O** | No five-run timing sample or p75 measurements. |
| FOOT-02 | **N/O** | No scroll-frame/refresh-rate or action-hang measurements; LazyColumn is implementation evidence, not performance proof. |

N/O: FLOW-01, FLOW-02, FLOW-04, FLOW-07, KEY-01, KEY-07, LIST-07, APPEAR-05, APPEAR-11, START-01, WIN-03, RESP-01, FOOT-02.

N/A: FLOW-05 → No peer side-by-side panels in this phone target.; KEY-06 → No custom layout-dependent character accelerators; standard Ctrl+Z/Shift+Ctrl+Z only.; KEY-08 → Phone target has no bare-key accelerators; shortcut reference deliberately omitted by owner.; CTRL-02 → No hierarchical checkbox parent.; LIST-04 → No dense multi-column ledger or narrow pathname column.; PTR-03 → No pointer-specific phone interaction to audit; tablet input parity is outside this target.; START-07 → No account creation offered by this client.; TOOL-06 → No configurable hideable toolbar/panel; collapsed player retains a visible reopening surface.; SIDE-03 → No sidebar in this compact phone presentation.; SIDE-04 → No adjacent navigation pane/detail pair in this target.

### Android Phone platform-fit signals

Side-by-side calibration used the supplied Android examples: PodList’s bottom destinations, app bars, anchored menus, radio sheets and snackbars belong to Android; no imported iOS symbol/control grammar was established. Calendar’s tablet panes were not treated as a phone expectation. Native toolkit use earns no automatic score.

| Signal | Verdict | Evidence and limit |
|---|---|---|
| L1 Navigation | Native | Three equal named destinations; no root Up; inner app bars, titled hierarchy and contextual actions, 01/10/20. |
| L2 Visual language | Native | Coherent Material controls/vector family, 06b/09/12/27a; stable blue semantic roles and adapted large audio transport. |
| L3 Density, text, system frame | Adapted | 48 dp action targets, 12 sp minimum text roles, edge-to-edge/inset code; enlarged layouts stack/wrap. Only one portrait phone width; no IME screenshot or smallest-phone verification. |
| B1 System navigation | Adapted, code-supported | NavigableListDetailPaneScaffold, BackHandler and PredictiveBackHandler; Add sheet/nested player/player/stack priority; Back does not pause. Gesture animation/history execution unobserved. |
| B2 Preferences/access | Adapted, code + captures | System/Light/Dark choices, contrast listener, scalable text, named native controls and alternatives to pull/drag/chart tapping. No language override. Live TalkBack/assistive traversal untested. |
| B3 System surfaces/lifecycle | Adapted, code-supported | ACTION_SEND/createChooser, file picker, channels/Media3, contextual permission, durable drafts/context and launcher intents. F1 weakens download feedback. Process death, actual system surfaces and shortcut launch untested. |

**Looks 8.8; Behaves 8.5; Platform fit = (8.8 + 2 × 8.5) ÷ 3 = 8.6.** Behavioral evidence is partial in execution, with code-supported implementation facts as above; this is not a screenshots-only score.

## Scores

One score covers the supplied light, dark and enlarged-light evidence unless stated otherwise. Strong means deliberate and consistent but short of reference quality. A checklist cap is applied even when a defect is infrequent.

| Category | Score | Evidence / anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong, nearly Exemplary: explicit system-type roles; 12/18 sp metadata, 17/24 sp row titles, 14/21 sp reading text; enlarged actions/values reflow. Stats’ long single explanatory paragraph and overly verbose completed onboarding steps still weaken scanning. | hierarchy, craft, accessibility |
| Hierarchy | **8.5** | Strong: Views → Episodes → details is clear; primary Play/Subscribe stand apart; settings are sectioned. At 200%, all three onboarding explanations dominate the home screen even when a step is complete; stats explanation is harder to skim than its totals. | content-first, hierarchy |
| Spacing & density | **8.4** | Strong: common 16 dp gutters, roomy touch rows, two-column enlarged action grids and pinned editor footer. The tall enlarged onboarding card and stacked metadata/action rows spend substantial screen height. Only 448 dp portrait is verified. | craft, adaptability |
| Color & contrast | **9.0** | Exemplary in verified appearances: quiet blue interactive emphasis, meaningful green check/red deletion, independent dark tones. Light primary/surface 6.46:1; secondary text/surface 8.86:1; dark primary/surface 10.93:1 and secondary text 10.89:1. Subscribed white/green 6.57:1, dark green pair 7.82:1. Unselected chart bars composite to 3.58:1 light and 6.15:1 dark. No failed contrast measured. | color-restraint, accessibility |
| Iconography | **8.7** | Strong: consistent vector weight and meaningful labels/tooltips; familiar Add/Play/Star/Download/transport. Small default Episode-detail action captions and visually similar list/Playlist glyphs need more recognition effort than an exemplary reference. | conventions, craft |
| Consistency & polish | **6.9** (stability **N/O**; **partial: no flow run**) | **Capped at Competent by CTRL-04/08**, despite Strong captured main screens. Incomplete numeric error rule and permanently indeterminate download notification are unfinished edge states; download-error color differs across screens. No stability band limit is invented. | feedback, craft, stability |
| Clarity | **8.3** | Strong: scopes, inherited Default values, safe named Trash deletion and Rewind consequences are explicit. Domain terms still require onboarding; large-text help is wordy. The owner-fixed name-free player relies on artwork plus Episode/accessible identity routes; no proposal to reverse it. | plain-language, discoverable-commands |
| Platform fit | **8.6** (execution partial) | Strong: Looks 8.8, Behaves 8.5, weighted formula above. Native Back architecture, per-destination place, semantic controls and system intents support the score; lifecycle/real-system interaction remain unverified. DLG-02 is minor and adds no cap. | conventions |
| Interaction & feedback | **8.4** (execution partial) | Strong: durable raw drafts, multistep Undo/Redo/retry, undo reveal, reorder alternatives, contextual permission, offline-capable local data and paused current Entry restoration. Instant response, long-list smoothness, real Back/TalkBack/process recovery cannot be certified. | forgiveness, user-control, feedback |
| Overall | **8.3** | Strong and recognizably at home on Android; discovery and listening are well served. Unfinished transfer/validation feedback is the main obstacle to 9.0. Overall is holistic, not the mean; it respects the 6.9 + 2.0 = **8.9 maximum** imposed by the lowest category. | character, content-first |

Contrast figures were calculated from MainActivity color roles using sRGB relative luminance; unselected bars use domain ListeningPresentation.unselectedBarAlpha = 0.72. These establish the named pairs, not every publisher image or preference combination. Default stats reading-line counts were taken from E/light/35; enlarged reading measure is naturally shorter and is not penalized against desktop prose widths.

**What still separates this from 9.0, beyond the checklist failures:**

1. **Tune enlarged onboarding density.** E/font200/42 leaves only the first starter View beginning below the card. Completed-step help remains as extensive as pending-step help. Keep the three-step checklist and completion marks, but shorten/collapse completed explanations and let the next useful action lead. This improves hierarchy and task density without hiding capability.
2. **Give errors one visual treatment.** Use a shared inline error presentation for download failure as for other recoverable failures; retain practical text, Retry and polite announcements. The present neutral download paragraph looks more like ordinary metadata.
3. **Finish both Episode-detail presentations consistently.** Standard EpisodeDetail uses 112 dp artwork, a full-width Play Now and labeled action grid; PodcastPageScreen.kt:197–218’s remote inspector uses 224 dp artwork and EpisodeRow’s trailing icon actions. Code establishes the structural difference, but the remote detail is uncaptured: capture it before scoring FLOW-07 or alleging clipping. A shared detail/action composition would reduce rediscovery while preserving play-before-subscribe.
4. **Sharpen the artwork pipeline.** ArtworkImage.kt:52 chooses 512 pixels for every size over 100 dp. Now Playing can draw 400 dp, or 1200 physical pixels at capture density. Server-proxied 512 px art can therefore be enlarged approximately 2.34×; real high-detail publisher-image quality is N/O. Derive request/decode size from drawn size × density, with a bounded cache budget. This matters especially because the owner deliberately makes artwork the player’s visual identity.
5. **Make the stats explanation scan like the rest of the app.** E/light/35 and font200/35 use one long paragraph for cross-device accounting, week/day boundaries, manual Played and Rewind. Split it into short labeled facts; keep the same page and all information.

Verification needed before an Exemplary behavioral claim: smallest supported phone and landscape/IME geometry; measured late-result/focus/scroll flows and p75 response times; live TalkBack/Switch Access; process-death restoration; predictive Back; real notification/Share/drag integration. These are **evidence gaps, not assumed app defects**.

## Next step

**Target:** CTRL-08, in the lowest-scoring category, Consistency & polish; download progress is closer to the core listen-offline task than the other capped field edge case.

**Anti-pattern:** No named anti-pattern precisely fits; this is incomplete feedback rather than an imported platform convention.

**Root cause:** The transfer has a detailed WorkManager progress channel but constructs its system notification only once, so two views of the same operation communicate different amounts of information.

**Smallest proposed change:** Reuse the current 250 ms received/total sampling to update determinate notification progress for known lengths; keep indeterminate progress when length is unknown and preserve Cancel/channel behavior. Principle: feedback and conventions. Expected improvement: Consistency & polish and interaction confidence; avoid regressions in battery/notification noise by retaining throttling and alerting only once. Character touched: none; blue Material transport and artwork-led listening remain intact.

Next eligible fix is F2’s reason-specific number validation, followed by F3’s short title. Removing both major failures removes the 6.9 cap; it does not automatically earn a 9.0. The craft work and missing runtime evidence still need to justify that band.

Nearest contrast: CLAR-05, “The error supplies the next action,” for F2; the Android BuzzKill example models consequence-first option explanations. Things’ relevant lesson is clear, proportional feedback and recovery, not its appearance.

No candidate was applied: the assignment authorizes only this report. All signature elements remain **kept**. No iteration log or before/after acceptance is claimed.
