# PodList Android phone — independent round 8 review (Codex)

Build: `a5aa0b795f0d8b53521ff06e1fbd5a60ae8e4925` · Reviewed 10 November 2026.

## Frame

- **Task:** Find podcast Episodes through Views/Search/Library, add them to Playlists and listen while keeping independent Playlist positions.
- **Target:** Android **phone**, compact window only. Tablet, foldable and expanded-window additions are out of scope.
- **Posture:** Sovereign personal browsing/organization UI with background audio playback.
- **Audience:** Newcomers becoming perpetual intermediates; domain terminology needs contextual teaching.
- **Nearest exemplar:** Things for calm personal organization and forgiveness; Android gallery's Niagara for list rhythm and BuzzKill for consequence-first option explanations. Their appearance is not a template. Google Calendar's supplied gallery image was also inspected for Android frame/control vocabulary, without importing tablet requirements.
- **Character:** (owner-fixed) native Material 3 and PodList `#2b50c8` seed, independently toned dark theme; (owner-fixed) Views/Playlists/Library peers; (owner-fixed) transport-first player with visual names omitted; compact text-first content rows; consequence summaries and reversible edits.
- **Owner decisions:** Retain the one-field Add podcasts flow, one-list View editor, Rewind summary sheet, OPML in Settings, paused current Entry on relaunch, no visual podcast/Episode names in either player, immediate named Playlist deletion with Undo, compact Podcast header/pull-down description/top-bar Subscribe/green check, two-tap Unsubscribe without a dialog and staying on the page, explicit wrapping Rename with Cancel/Save below, case-insensitive unique names, and no phone shortcut listings. These are evaluated in place. No recommendation reverses them.

**Evidence and limits.** The capture root is `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-8/` (README read first). `S(theme, filename)` below means both that PNG and its adjacent accessibility TXT. All 56 screenshot/snapshot pairs per appearance were inspected, using contact sheets for cross-screen comparison and source for behavior. Themes: `light`, `dark`, `font200` (light at 200%). Capture device: Pixel 10 Pro XL profile, Android 16, 1344 × 2992 px, compact window. Physical screenshot pixels are not treated as dp; target/text units come from code.

`C(File.kt:line)` refers to `apps/android/app/src/main/kotlin/app/podlist/` unless another path is given. Relevant code includes navigation, draft/browsing persistence, form/selection/sheet components, screen actions, playback, downloads, manifest and theme/resources. CONTEXT, Android/product design documents and ADRs 0011–0013 informed interpretation. Prior reports and UI-GRADE.md work lists were not read. No app was run, no device was driven, and no implementation/test/config files were changed.

Capture caveat: `font200/30-listening-stats` and `31-listening-stats-lower` actually show Settings in both image and tree. They do not verify the empty stats screen at 200%; light/dark empty stats plus code establish its content. Snapshot `[truncated]` preview markers are not taken as proof of visual clipping.

## Flows

**Tasks reviewed as static state sequences, not executed flows:**

| Task | Supplied states / code evidence | What remains unverified |
|---|---|---|
| First use → Standalone → add podcasts | 40–43, 26, 59–63; Welcome/GettingStarted/AddPodcasts/PodcastPage | First-result timing, background interruption and real feed behavior |
| View → select Episodes → choose Playlist → add → Undo | 01–05, 09, 50/50b; Selection/PlayerPresentation/HistoryActions | Delayed results, focus/scroll, IME obstruction, measured Undo transition |
| Rename View/Playlist → Cancel or Save → revisit | 04c, 16b/16c; RenameableName/FormDraftStore | Actual keyboard, process death and lifecycle traversal |
| New View → edit conditions → Back → New View | 05 plus the complete source route/draft path | Static source establishes F1; not a recorded reproduction |
| Playlist → play/reorder/remove → Timeline → Rewind | 10–19, 08; EntryDragging/PlaybackActions/Timeline/HistoryActions | Drag execution, playback timing, restoration and audio integration |
| Podcast → explore/filter → Subscribe → arm Unsubscribe → Undo | 23–28, 59–63; PodcastPage/HistoryActions | Live TalkBack focus, unsubscribe transition and real network errors |
| Settings → overrides/Download Rules/OPML/stats | 06–07, 24–25, 30–35; Settings/SubscriptionSettings/OpmlActions/ListeningStats | Pickers in action, partial import, failure recovery and table interaction |

Widths: one compact phone profile. Appearances: light/dark at 1.0; light at 2.0 text. Timed runs: **none**. Script location, measurements file and timed screenshot strips: **not supplied/not created**, per the no-device instruction. The supplied stills are not a substitute for delayed-completion or timing measurements.

**Flow failures:** none scored without the required flow evidence. FLOW-01/02/03/04 and RESP-01 are N/O. Static layout checks FLOW-06/07 are assessed below. **Stability sub-score: N/O** in every appearance. This does not mean stability passed.

## Cross-screen inventory

Legend: **snackbar** means the shared inverse-surface Material snackbar above the mini player/navigation, or inside the active modal sheet via SheetFeedback; Undo is an action in that surface with persistent toolbar Undo/Redo after it expires. **Inline error** normally means error-colored text with a polite live region. “None” means no separate surface for that kind of message, not an unimplemented screen.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View | Snackbar, specific View/edit acknowledgment | Shared sync row below app bar; local data + Try again | None | Snackbar + toolbar | Inline no Views/New View; no matches/Edit this View; no Library/Add podcasts | Initial Loading local Library | Root +; row Add/Play | Conditions/count under title; Getting started above root list |
| New View / View editor | Snackbar, View created/changed/renamed | Name/number inline; range error beside conditions | Rename field with Cancel/Save; condition bottom sheets | Snackbar + toolbar | Live zero-match count | None | Create/Done bottom trailing; Rename controls below name | End-of-list retained-draft explanation |
| Search / Episode detail | Snackbar for edits/add | Shared sync row; **download failure is plain inline text without local retry** | Save as a View naming dialog | Snackbar + toolbar | Inline no matches/Clear Search or no Library/Add podcasts | Local metadata/loading text | Search field; Episode full-width Play now | Search scope; show notes; Entry positions |
| Playlists / Playlist / settings | Snackbar: creation/name/settings; deletion names Playlist and Trash | Name field inline; sync row | Explicit Rename Cancel/Save | Snackbar + toolbar; Trash recovery | Inline no Entries + Find Episodes; History/Timeline explanation + Show Entries | None | Root +; transport per Entry; settings Rename/Delete | Active/Entry count/Clear on Played; delete retention explanation |
| Timeline / Rewind / Trash | Snackbar Playlist rewound/restored | Sync row | Rewind modal, Cancel/Rewind pinned after scrollable summary | Snackbar + toolbar; restored Entry reveal | No History/Timeline with next step; no deleted Playlists in Trash | None | Eligible timeline row → Rewind; Restore on Trash row | Goes back/Unplayed again/returned/kept summary |
| Library / selection | Snackbar Download Rule changed | Sync row; per-podcast refresh failure on page | Download Rule sheet for selected Subscriptions | Snackbar + toolbar | No Subscriptions + Add podcasts | None | Add podcasts outside menu; **selected objects only expose generic Actions menu** | Download Rule group names; batch instruction |
| Add podcasts / Podcast page | Snackbar Subscribed/Unsubscribed; persistent green-check/text control state | Under query/result or header: classified error + retry/original action | Two-tap in-place Unsubscribe, accessible timeout | Snackbar + toolbar | No Episodes/search matches inline | Local spinner/line for fetch/bring Episode | Find podcasts under field; top-bar Subscribe/check; row Add/Play | Query label; author; explicit Show/Hide podcast details |
| Subscription settings / Download Rules | Snackbar specific settings acknowledgment | Number supporting text; sync row | Rule/override sheet, native Back and Done | Snackbar + toolbar | None | None | Value rows or switch; Mark all Played | Device scope, consequences and inherited Default value |
| Settings / OPML | Export snackbar; import inline counts/failed-feed list | Inline Your podcasts error + Try again | Android document picker | Import snackbar + toolbar | None | Local measurable import progress + Stop/resume | Settings rows; trailing Done in sheets | Playback inheritance; import/export consequence subtitles |
| Listening stats | None | Shared sync row | None | None | Inline play-to-begin explanation | None | Chart/day buttons/table toggle | Unit/axis labels, all periods, About your stats |
| Welcome / Connect | Successful navigation | Inline address/network/TLS/server error, input retained | Optional server setup | Native text editing | Standalone welcome | Checking server label/progress | Start on this phone / Connect; Check and connect under address | Server optionality and per-address Library scope |
| Mini player / Now Playing | Transport state itself | Inline expanded playback error + Try again; snackbar also offers retry | Speed/Sleep sheets | App edit history where relevant | Mini player absent only without a current Entry | Loading audio state | Visible Play/Pause, skip, seek; artwork expands | Accessible podcast/Episode identity; Episode button; Chapter and next-Entry context |

**Mismatches:**

- Download failure is the exception to the otherwise local **error + explicit recovery** pattern (server form, Podcast page, OPML and feed refresh). This is F3/COPY-02, counted once.
- New View combines **Discard draft** and **Delete View**, unlike New Playlist's single discard route (F4/COPY-01). Draft IDs also have a recovery gap versus fixed-key New Playlist/Add/server drafts (F1/DATA-01).
- Single-Episode Add is directly exposed; selecting Episodes hides the same task under generic Actions (F2/CTRL-06).
- These static mismatches inform craft and the relevant checks. They do not manufacture a numerical stability sub-score without a flow run. Different controls for search submission, object creation and subscription are different tasks, not an automatic FLOW-07 failure.

## Checklist

Coverage: **76.8%** (pass **49** · fail **4** · N/O **16** · N/A **10**). Denominator: 69 applicable core items; numerator: 53 verified. Android Phone signals are reported separately and are not extra checklist IDs. Mac/Web-only checklists and Android tablet/foldable additions are N/A → target and excluded.


### Failures by severity

**F1 · DATA-01 · blocker — New View work has storage but no recovery after Back.**

- **Where:** Views → + → New View → enter a name/change conditions → system Back or app-bar Back → + again.
- **Evidence (C):** `PodListScreens.kt:194` pops the route; `:207` (and empty-state `:342`) allocates a new UUID on every creation entry. `ViewEditor.kt:32–35,66–70` stores/restores drafts only under the old View ID and does not record a new View before Create. `BrowsingContext.visiting` in `apps/android/domain/src/main/kotlin/app/podlist/domain/BrowsingContext.kt` drops the route when returning to root. `BrowsingStore` validates draft routes that remain in a stack, but neither it nor Views supplies a draft picker/resume route. A source search for all `new-view:` and FormDraftStore usages found no recovery path. `strings.xml:480` nevertheless promises “Your conditions are kept until you create the View.” The bytes are not erased; the person's usable work is effectively lost from the UI. This is a static code-path finding, not a claimed runtime reproduction.
- **Concrete fix:** Persist a pending New View ID per Library and reuse it when + is tapped; clear that ID only on Create or explicit Discard. If multiple drafts are intended, expose them in Views instead. Keep the existing draft store and one-list editor. Back must leave an accessible draft; Discard remains the deliberate destructive exit.
- **Cap:** Interaction & feedback ≤ 4.9; Overall ≤ 6.9. Do not additionally count the same unreachable draft as DATA-06 or a flow failure.

**F2 · CTRL-06 · major — Selection hides its primary task behind generic Actions.**

- **Where:** Multi-select in View/Search/Playlist/Podcast content; selected Subscription rules use the same generic entry pattern.
- **Evidence (S+C):** `S(light/dark/font200,50-selection)` shows only count, cancel and Actions. `50b-selection-actions` reveals Add to a Playlist, Mark Played, Star and Download. `Selection.kt:40–46` unconditionally places all commands in DropdownMenu; it does not expose the principal Add command even at 1.0 text. This is not merely an unusual icon: selecting Episodes removes the direct Add affordance from the exact organization task being performed.
- **Concrete fix:** Put a labeled/accessible 48 dp Add to a Playlist action directly in the selection app bar and retain overflow for secondary commands. For Subscription selection, expose Change Download Rule as the primary action. Allow the title/action layout to wrap or adapt at large text; do not require four wide text buttons.
- **Cap:** Consistency & polish ≤ 6.9. This is a Controls failure, not a second invented platform checklist ID.

**F3 · COPY-02 · major — Download failure does not explain or expose local recovery.**

- **Where:** Episode detail after an audio download fails.
- **Evidence (C):** `PlaybackActions.kt:95–111` renders only `download_failed` for Failed, whose entire text is “Couldn’t download this Episode.” (`res/values/strings.xml:150`). `PlaybackActions.kt:78–90` puts retry in DownloadMenuItem, reached through Episode detail's separate More actions menu (`PodListScreens.kt`, EpisodeDetail). There is no retry beside the failure, no direction to that menu, and no connection/storage recovery guidance. Compare PodcastPage's explicit local Try again and ServerScreen's cause-specific guidance. A visible failure screenshot was not supplied; the rendering/handler code settles this finding.
- **Concrete fix:** Render a persistent inline Try again control immediately after the failed status. Add a practical sentence such as “Check your connection, then try again”; distinguish storage failures if that reason is available, without inventing a cause. Keep the menu retry as an additional route.
- **Cap:** Clarity ≤ 6.9. The download itself and its failure cause are not graded as tested; this grades the implemented failure presentation.

**F4 · COPY-01 · minor — Delete View is offered before a View exists.**

- **Where:** Bottom of New View's scrolling form.
- **Evidence (C):** `ViewEditor.kt:126` offers Discard draft for `creating`; `:127` also always renders red Delete View. Its handler only records Change.DeleteView when `recorded` is true, which is false for a never-created View. In that state both controls just clear the draft and leave. The captures' initial viewports do not show this bottom section; the unconditional code does.
- **Concrete fix:** Show Delete View only for a recorded View. Use the existing Discard draft control for creation. This preserves the explicit owner-approved Rename and the one-list editor.
- **Cap:** None (minor). This is distinct from F1: even after drafts can be resumed, the redundant/misnamed destructive action remains.

### Every core checklist ID

| ID | Verdict | Evidence / reason |
|---|---|---|
| FLOW-01 | N/O | No measured transitions. |
| FLOW-02 | N/O | No focus/scroll flow run. |
| FLOW-03 | N/O | No delayed-completion/input probe; a durable draft alone does not prove this. |
| FLOW-04 | N/O | 63 shows a visible Undo and 15 shows visible commits, but errors, IME and other follow-ups were not exercised. |
| FLOW-05 | N/A | No paired peer panels in the compact phone target. |
| FLOW-06 | pass | 03, 13, 15, 24 and 33: visible sections have content or an explicit empty state; no demonstrated vanishing help block. |
| FLOW-07 | pass | 05/19: creation commits bottom trailing; 04c/16b: Rename Cancel/Save below the field; EditorSheet/CommitActions share the trailing commit region. |
| KEY-01 | N/O | No complete hardware-keyboard traversal; standard Compose controls alone do not establish every path. |
| KEY-04 | N/O | FocusedInputModifier and RenameableName request expected input focus; full forward/backward traversal and visible focus were not exercised. |
| KEY-06 | N/A | No custom character accelerators; only standard Ctrl+Z/Shift+Ctrl+Z edit commands. |
| KEY-07 | N/O | No attached-keyboard scrolling evidence. |
| KEY-08 | N/A | Android phone interpretation: no bare-key accelerator workflow; no desktop/tablet shortcut-reference requirement is imported. The owner explicitly keeps shortcut listings off the phone. |
| DLG-01 | pass | Playlist deletion is immediate with Undo; Unsubscribe is the agreed two-tap control; dialogs solicit a name/date or necessary notification consent, rather than confirm routine edits. |
| DLG-02 | pass | Save as a View names its input task; notification explanation states the reason. No generic failure-alert titles found. |
| DLG-03 | pass | Save as a View uses Cancel and Save as a View; permission explanation uses Not now/Continue; date picker Cancel/Done. |
| DLG-04 | pass | Dismiss/Cancel leave the underlying data unchanged in naming/date/consent tasks; native dialogs provide dismissal. No irreversible destructive dialog is required here. |
| DLG-05 | pass | 16c Delete Playlist and ViewEditor Delete View use error color; the agreed undoable Playlist deletion is not turned into an unexpected destructive dialog default. |
| DLG-07 | pass | EditorSheet has Done and native system Back/dismissal; Rewind has Cancel/Rewind. Android system Back is a legitimate exit; no triple Cancel/Done/Back presentation. |
| DLG-09 | pass | 12, 27a, 50b and their DropdownMenu code open from the originating Box/control; no pointing arrow is required on Android. |
| CTRL-02 | N/A | No hierarchical checkbox parent/child selection. |
| CTRL-03 | pass | OutlinedTextField labels remain for Server, Name, Library Search, podcast Search and Add podcasts; no sensitive credential field. |
| CTRL-04 | pass | Names validates trimmed case-insensitive names; NumberInput validates bounds/locale input; numeric and name errors are field-specific. Playlist creation validates on submit and retains input. |
| CTRL-05 | pass | Material buttons/clickable/selectable/toggleable provide interaction states; shared ActionIcon is 48 dp. Player prominence is deliberate transport-control styling. |
| CTRL-06 | fail | F2: all selection commands, including the primary Add to a Playlist action, are behind Actions at every font scale. |
| CTRL-07 | pass | 20–23 and 60–61 name Library versus Podcast Episode scope; clear buttons are provided; no displayed search history. |
| CTRL-08 | pass | AndroidDownloads exposes received/total progress and Cancel; Settings/OpmlActions exposes processed/total and Stop after current feed/resume; unknown-length operations use indeterminate indicators. Runtime delivery remains unverified. |
| LIST-01 | pass | Feeds are content lists under the Android clause; ListeningStatsScreen table mode supplies Day/Time rows. No inappropriate multi-column outline. |
| LIST-02 | pass | Views, named View, Playlist tabs, Library groups and stats sections supply contextual noun headings. |
| LIST-03 | pass | View Sort uses an EditorSheet with radio choices under the Android list-without-column-headings clause. |
| LIST-04 | N/A | No dense multi-column content table or path/name column requiring middle ellipsis. |
| LIST-05 | N/A | No expandable outline tree. Podcast description disclosure is page content, not hierarchical list expansion. |
| LIST-06 | pass | Navigation destinations and Playlist tabs remain marked; 06b/06c/09 show selected radio values; 50 uses checkboxes and a count. |
| LIST-07 | N/O | Touch rows open/select in code; full keyboard focus/arrow behavior was not run. |
| DATA-01 | fail | F1: New View drafts become unreachable after Back; storage survival does not supply a recovery route. |
| DATA-04 | pass | HistoryActions/EditHistory keep multiple inverse steps and Redo, preserve a failed reverse for retry, group typing, and expose persistent named Undo/Redo after snackbar expiry. MainActivity supplies Ctrl+Z. |
| DATA-05 | pass | revealChanges/EntryList navigate to restored objects, scroll to the Entry and mark the destination; subscription Undo can reveal its page. |
| DATA-06 | N/O | BrowsingStore/BrowsingState save stacks, tabs, query and scroll anchors; selection uses rememberSaveable. Full relaunch/process-death context restoration was not exercised. |
| DRAG-01 | pass | EntryDragging implements reorder; EntryMenu and accessibility custom actions supply Move up/down alternatives. |
| DRAG-03 | pass | moveEntry records the previous neighbor and a reversible history step. |
| DRAG-05 | N/O | Code supplies source elevation/insertion cues and cancel reset; actual drag threshold, continuity and failure feedback were not captured. |
| DRAG-06 | pass | EntryDragging autoscrolls near either edge, pins the source and retains/scrolls/focuses the moved destination. This is code evidence, not a measured drag run. |
| PTR-03 | N/A | Pointer shape/desktop pointer-gesture audit is outside this touch-phone target; tablet input parity is excluded. |
| PTR-04 | pass | ActionIcon/ActionTooltip provide action-specific long-press tooltips; native editable fields let people inspect/scroll their values. Desktop hover parity is not asserted. |
| APPEAR-03 | pass | MainActivity independently defines light/dark tonal roles and observes UiModeManager contrast; increased contrast strengthens foreground/outline roles. No translucent functional control boundary relies on a shadow. |
| APPEAR-04 | pass | Source-token calculations below pass text and necessary-detail thresholds in both themes; screenshots agree. No failure is inferred from decorative separators or disabled controls. |
| APPEAR-05 | N/O | Compose motion and custom predictive translation exist; system reduced-animation behavior was not exercised or fully established. |
| APPEAR-09 | pass | Coherent vector set for navigation, transport, pencil, check, import/export and menus; no imported iOS-only symbol meaning found. |
| APPEAR-10 | pass | Filled/tonal primary controls, outlined fields, distinct player/navigation surfaces and selected rows distinguish controls from content. |
| APPEAR-11 | N/O | Separate stills do not establish loading/transition frame coherence. No transient-frame failure is scored. |
| TYPE-02 | pass | System font, Regular/Medium weights and a bounded semantic scale in PodListTypography. |
| TYPE-03 | pass | 12 sp minimum body/caption/label styles; supplied 200% text remains legible. Skip numerals are part of transport symbols, not a substitute for accessible names. |
| TYPE-05 | pass | 200% captures stack values/actions, wrap names and tab labels, scroll sheets and keep commits reachable; expanded player measures controls before artwork. No established essential-text clipping in the shown states. |
| TYPE-06 | pass | Stats explanatory paragraph is approximately 65–80 characters on full default-size lines; bodyMedium uses 14/21 sp and bodyLarge 16/24 sp. Paragraph separation follows Html/Compose text rather than simultaneous indentation. |
| TYPE-07 | pass | No problematic all-caps interface prose or mixed bold/italic emphasis; publisher/fixture artwork is content, not app-label typography. |
| TYPE-08 | pass | Own strings use curly apostrophes/quotes, ellipsis and real dashes; literal addresses and publisher text are exempt. |
| COPY-01 | fail | F4: a never-created View exposes Delete View alongside Discard draft, although the Delete handler performs no persisted deletion. |
| COPY-02 | fail | F3: failed download text supplies neither recovery guidance nor an adjacent retry; Retry exists only inside More actions. |
| COPY-03 | pass | No Library, no matches, empty Playlist, History/Timeline and stats explain the next step or offer an action. Empty Trash is a completed absence state, not a task-blocking dead end. |
| COPY-04 | pass | Consistent sentence-style labels with the documented capitalized domain nouns; short action tooltip fragments. |
| AX-01 | pass | Code and snapshots supply labels, native roles/values/states for fields, radio/checkbox controls, seek, progress, subscribed state and transport; Now Playing exposes podcast/Episode identity nonvisually. Live TalkBack traversal is not thereby verified. |
| AX-02 | pass | Checkmarks, text states, radio/checkbox selection, active labels and position text supplement color; no required state is color-only in the evidence. |
| AX-04 | pass | Podcast pull-down has Show podcast details and an accessibility action; reorder has discrete commands; chart has day buttons/table; sheets have dismiss/commit controls. Actual Switch Access/Voice Access remains unobserved. |
| AX-05 | pass | Playback has visible Play/Pause, buffering/error/position text; relaunch is paused. No critical app information is audio-only; publisher transcripts are not invented as a requirement. |
| START-01 | N/O | Loading placeholders and local-data code exist, but prompt launch/response and independence during loading need runtime observation. |
| START-02 | pass | GettingStarted persists Hide, Settings reopens it, and Welcome offers Standalone use without server setup. |
| START-03 | pass | Getting started, View condition summaries, Download Rule consequences and Rewind kept/changed summary teach the local task; help can be hidden. |
| START-04 | pass | Manifest has feature-relevant permissions; requestDownloadNotifications is triggered by download use, not unconditional launch. File access uses Android document contracts. |
| START-05 | pass | IncomingContent notification explanation: “Allow notifications to see download progress and stop a download.” Continue invokes the system request. |
| START-06 | pass | 40–43 and WelcomeScreen support use without a server/account; optional server connection follows the chosen action. |
| START-07 | N/A | No app account creation/deletion service. |
| EDIT-02 | pass | Native Compose text fields retain standard selection/editing; MainActivity handles only unconsumed app Undo; explicit rename field shields app history from text editing. |
| EDIT-05 | pass | Show notes and Podcast description use SelectionContainer with annotated URL links; the Episode share action supplies its URL through Android. Clipboard interaction itself was not run. |
| WIN-03 | N/O | One compact device profile only; smaller supported phones, rotation and IME/size combinations were not exercised. Tablet/foldable layouts are excluded, not failures. |
| TOOL-06 | pass | Mini player artwork/bar expands Now Playing; collapse control and navigation return to content; persistent mini player offers a route back. |
| SIDE-03 | N/A | No hideable navigation pane in this compact target. |
| SIDE-04 | N/A | No simultaneously adjacent navigation/detail panes in this compact target. |
| SET-01 | pass | 06–07/24–25: global Playback/appearance/retention/OPML in Settings; Subscription overrides/Download Rules and Playlist settings remain with their objects. |
| RESP-01 | N/O | No five-pass timing/P75 measurements. |
| FOOT-02 | N/O | 500-row fixture proves content availability, not measured scroll smoothness or absence of hangs. |

**N/O:** FLOW-01, FLOW-02, FLOW-03, FLOW-04, KEY-01, KEY-04, KEY-07, LIST-07, DATA-06, DRAG-05, APPEAR-05, APPEAR-11, START-01, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, KEY-06, KEY-08, CTRL-02, LIST-04, LIST-05, PTR-03, START-07, SIDE-03, SIDE-04 (reasons in table; no dependent missing-feature double count).

## Scores

Scores are for the combined phone surface, with the same result in light and dark unless noted. A score below 9 states the remaining craft gap, not a demand to replace the app's character. Behavioral scores are **partial: code + captures, no live run**.

| Category | Score | Evidence / anchor | Principle |
|---|---:|---|---|
| Typography | **9.0** | Exemplary in the supplied states: one system family, 17/24 titles, 14/21 body, 12/18 metadata, 20/28 page titles; 200% wraps/stacks without established essential clipping. Role hierarchy is legible through type alone in list, form and stats views. This is not a claim about unseen publisher prose or every phone width. | hierarchy, accessibility, craft |
| Hierarchy | **8.5** | Strong: content titles, quiet metadata and one filled primary action read in order; settings have meaningful section breaks. Episode organization loses emphasis in selection (F2), while long Subscription explanations and several neighboring content actions require more scanning than an Exemplary primary/secondary order. | content-first, hierarchy |
| Spacing & density | **8.5** | Strong: 16 dp gutters, shared 48 dp actions and regular row rhythm; 200% deliberately stacks values/actions and preserves reachability. Entry rows spend a substantial leading/trailing width on drag/Play/menu, and default-size explanatory/settings pages use broadly the same list density. A more precise relationship between help, values and actions would improve scanning without shrinking targets. | craft, hierarchy, conventions |
| Color & contrast | **9.0** | Exemplary restraint in tested roles: one blue accent, semantic error and subscribed green, separately toned dark roles, high source-token ratios below, selected state also conveyed nonvisually/by shape. No decorative brand chrome or measured failing text found. | color-restraint, accessibility |
| Iconography | **8.8** | Strong, near Exemplary: consistent vector family and familiar Play, skip, check, pencil, overflow, tray arrows. Controls have names/tooltips. Dense Entry controls and the visually identical playlist glyph in navigation versus the player's contextual Playlist route still ask some context-reading; persistent labels already help. Do not add Episode names to fix this. | conventions, craft, plain-language |
| Consistency & polish | **6.9** *(stability N/O; partial: no flow run)* | Capped at Competent by CTRL-06/F2, despite Strong visual finishing: shared form rows, sheet feedback, large-text layouts and light/dark surfaces. Primary-action exposure and error/recovery patterns are not consistent across sibling tasks. No stability band limit is asserted without flows. | conventions, craft, stability |
| Clarity | **6.9** | Capped at Competent by COPY-02/F3; COPY-01/F4 adds avoidable ambiguity. Otherwise Strong: distinct View/Playlist roles, explicit scope, Default inheritance, Rewind consequences and good Standalone onboarding. Artwork-only player identity is the fixed owner decision: it saves visual space but requires recognizing artwork or opening Episode; it is retained. | plain-language, feedback, discoverable-commands |
| Platform fit | **8.0** *(partial: code + captures)* | Strong: Looks **8.8**, Behaves **7.6**, `(8.8 + 2×7.6)/3 = 8.0`. Native phone navigation, M3, insets, scalable text, Android share/document intents, permissions and Back code. The inaccessible draft is a B3 lifecycle/continuity gap; no separate Platform-fit cap is imported from DATA-01. Live Back/TalkBack/process death remain unverified. | conventions, stability, user-control |
| Interaction & feedback | **4.9** *(partial: code + captures)* | Capped at the top of Weak by DATA-01/F1. Multi-step Undo/Redo, Trash, gesture alternatives, field labels and explicit recovery elsewhere deserve Strong credit; unreachable New View work prevents a forgiving core workflow. This is not a judgment that all interaction is weak or that timing failed. | forgiveness, feedback, user-control |
| **Overall** | **6.9** *(partial behavioral coverage)* | Serves discovery and listening and looks at home on Android. Visual craft is predominantly Strong to Exemplary, but the rubric permits at most `4.9 + 2.0 = 6.9` above the lowest category. The draft-recovery blocker holds the grade down most; the two major failures also independently keep their categories below 9. | forgiveness, conventions, craft |

### Contrast measurements

WCAG sRGB relative-luminance ratios calculated from the actual MainActivity color tokens (alpha composite first for chart bars), rounded to two decimals. These verify specified pairs, not every possible publisher artwork/background or Android rendered state. Decorative dividers, disabled controls and fixture artwork are excluded from failure claims.

| Foreground / background role | Light | Dark |
|---|---:|---:|
| onSurface / surface | 16.27:1 | 14.35:1 |
| onSurfaceVariant / surface (recurring metadata) | 8.86:1 | 10.89:1 |
| primary / surface (action text) | 6.46:1 | 10.93:1 |
| onPrimary / primary (filled label) | 6.81:1 | 7.70:1 |
| subscribed foreground / background | 6.57:1 | 7.82:1 |
| Unselected chart bar, primary at .72 alpha / surface | 3.58:1 | 6.13:1 |

### Android Phone platform signals

Side-by-side reading against the supplied Android gallery finds no imported iOS/web frame, no root Up, and no actions masquerading as top-level destinations. Gallery dates are the available reference dates, not a claim to have run a current Google app. Custom PodList character is not a Foreign tell.

| Signal | Verdict | Evidence / limit |
|---|---|---|
| L1 Navigation | Native (S+C) | Three equal destinations; Up on inner screens; tab selection preserved; player independent above navigation. |
| L2 Visual language | Native (S+C) | Coherent M3 tonal roles, system type, vector symbols, bottom sheets and contextual menus. |
| L3 Density, text, system frame | Native in shown compact states (S+C) | dp/sp code, 48 dp shared hit targets, 12 sp type floor, edge-to-edge with safe/IME handling; 200% examples adapt. Smaller-phone and IME collision behavior remains N/O, not inferred from screenshot pixels. |
| B1 System navigation | Native implementation; execution N/O (C) | NavigableListDetailPaneScaffold, modal dismissal, selection BackHandler, nested-player PredictiveBackHandler; manifest enables Back callbacks. No playback operation is bound to Back. Gesture animation and edge interaction not run. |
| B2 Preferences/access | Native implementation; live assistive use N/O (S+C) | System/Light/Dark, contrast listener, string resources, scalable text, roles and values; names exposed to accessibility despite visual player-name omission. No claim of verified translation coverage or TalkBack traversal. |
| B3 System surfaces/lifecycle | **Foreign gap: draft continuity**, otherwise Native implementation (C) | Native ACTION_SEND chooser, document contracts, notification channels, in-context permission request, browsing/draft stores and paused playback restore; F1 leaves a departed New View draft inaccessible. Notification/lock screen/Auto/Bluetooth behavior, rotation and process death not run. Optional widgets are not treated as required. |

### What still separates this build from 9.0

1. **Recoverable work, not merely stored work:** fix F1 first. A promised retained draft needs a visible route back, with Back distinct from Discard.
2. **Direct primary action in selection:** fix F2 without packing four commands into the app bar; preserve large-text layouts and 48 dp targets.
3. **Complete local failure states:** fix F3, following the app's own stronger Podcast/server error pattern. Preserve the uniform placement and naming of recovery actions.
4. **Finish creation-specific copy:** remove the never-created View's Delete action (F4). More generally, subordinate long inherited-setting explanations so changed/default values scan faster, keeping all explanations available.
5. **Finish evidence for the behavioral bar:** measured main-task transitions, live TalkBack and lifecycle/Back validation are N/O, not presumed failures. A later 9.0 claim must name what was verified; resolving the scored findings alone does not prove responsiveness or restoration.

## Next step

**Target:** F1 / DATA-01, the highest-severity failure. **Anti-pattern:** no exact catalog name; the root cause is orphaned draft identity, not a cosmetic form problem. **Nearest contrast:** INTER-05, “Recovery doesn't depend on a perfect answer.” BBEdit's useful lesson is an accessible recovery route; Things' lesson is that retaining work should not require the person to guess an exit ritual.

**Change:** Reuse one persisted pending New View ID per Library from both + and the empty-state New View action. Back leaves it available; explicit Discard removes it; successful Create clears the pending ID atomically. A labeled Resume draft row is an alternative if multiple drafts must coexist. **Principle:** forgiveness and user-control. **Expected effect:** remove DATA-01's blocker and its 4.9/6.9 caps, without changing the one-list View editor, owner-approved Rename, Material appearance or bottom navigation. It does not automatically fix F2–F4 or award 9.0.

No apply/iterate log: this is a report-only audit. All owner-fixed signature elements remain kept. No commits were made. Beads context was consulted read-only; its database was unavailable (`openat LOCK: operation not permitted`), and no issue data was changed under the report-only restriction.
