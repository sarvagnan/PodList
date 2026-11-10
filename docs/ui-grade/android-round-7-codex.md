## Frame

- **Task:** Find Episodes through Views, Search and podcast discovery; arrange and listen through Playlists while keeping playback context.
- **Target:** Android **phone**, compact windows. Tablet, expanded-window and foldable design are excluded. Short/landscape phone windows remain phone scope.
- **Posture:** Sovereign personal browsing and organisation tool with background playback.
- **Audience:** Perpetual intermediate, with a newcomer path that works without a server.
- **Nearest exemplar:** Things for calm personal lists, explicit consequences and forgiveness, expressed through Android conventions. The Android gallery's Niagara and BuzzKill provide phone comparisons for alignment and explanatory copy; neither is a podcast interaction benchmark.
- **Character:** Owner-fixed native Material 3; blue seed **#2b50c8**, independently toned dark appearance; **Views · Playlists · Library**; artwork-led playback without visually displayed podcast/Episode names; condition-based Views and Playlists with their own place.

**Owner decisions:** All supplied decisions were retained in the assessment: single-field Add podcasts; one-list View editor; Rewind summary sheet; OPML in Settings; paused current Entry after relaunch; name-free mini player and Now Playing; immediate Playlist deletion with named Trash feedback and Undo; compact Podcast header and pull-down description; top-bar Subscribe/green check and two-tap, dialog-free Unsubscribe that stays on the page; explicit Rename/Cancel/Save with full-width names and controls below; case-insensitive unique Playlist/View names; no phone shortcut reference. A fixed choice is not a recommendation to redesign it. KEY-08 below records a literal checklist exception to the last decision.

**Build and independence:** `pwd` returned `/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-5621704c-e3feb5975746d1f6`; HEAD is `ffd096cdaa6500393026329c2a6220be5fc1cc04`, matching the capture README. No earlier `docs/ui-grade/*.md` report or `UI-GRADE.md` work list was read. No app, test or configuration file was changed, and no device was driven.

**Evidence key:** `capture/` means `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-7/`. Image references have a sibling accessibility `.txt` snapshot. `ui/` means `apps/android/app/src/main/kotlin/app/podlist/`; `domain/` and `data/` mean the corresponding Android modules' `src/main/kotlin/app/podlist/domain/` and `…/data/`. Source references identify the implementation at the graded commit, not intended behaviour in the design documents. All supplied images were inspected through contact sheets; primary controls, validation and selection were also checked against the snapshots and code. Scratch contact sheets are in the requested `grade-android-7-codex/` directory.

## Flows

**Tasks inspected, not run:** Welcome → Standalone Device or server connection; Views → Episode → Play/Add → Playlist; Search → Save as a View; create/edit/rename View; Playlist → settings/rename/delete → Trash/restore; History → Listening Timeline → Rewind; Library → Add podcasts → Podcast page → search/description/Subscribe/Unsubscribe; Subscription settings → Download Rules; Settings → playback/OPML/stats; mini player → Now Playing → Episode/Chapters/Entries.

**Width/appearance evidence:** Capture README specifies a Pixel 10 Pro XL profile, Android 16, 1344 × 2992 px, compact portrait window, demo server except Standalone/first-run shots. Light and dark at system font scale 1.0; light at 2.0. Rename and final recovery states have narrower appearance coverage, as enumerated in the README. Density and a dp viewport measurement are not supplied, so no px-to-dp conversion is assumed. No small-phone or landscape capture, dark 200% capture, or IME-visible tour is supplied.

**Timed runs/device:** None by this reviewer. No latency percentile, refresh-rate or animation claim is made. **Script / measurements / screenshot strips:** none supplied. The tour consists of separate states, not a measured flow strip. Consequently **stability sub-score N/O** in every appearance. FLOW-01–04 and FLOW-06 remain N/O; no transition failure is inferred from unrelated stills. The DATA-01 and WIN-03 findings below are source-supported lifecycle/layout findings, not measured flow findings.

Live TalkBack, assistive input, hardware-keyboard traversal, rotation/process restoration, predictive Back animation, system Sharesheet presentation, media notifications/lock screen, Android Auto, Bluetooth/audio focus, drag execution, import execution and real feeds remain unverified where code cannot settle them. Their absence is not a failure.

## Cross-screen inventory

`Snackbar` below means the common inverse-surface message with inverse-primary action, above the mini player/navigation; `field error` means nearby error-coloured text with a polite announcement. Code-only states are marked **C**. “None” means no corresponding surface in the inspected screen/path, not that a hidden state was exercised.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | State changes in rows; common snackbar **C** | Shared offline/sync strip below app bar, neutral text + Try again **C** | None | App-bar history; common snackbar **C** | Inline no matches + Edit conditions, or no Subscriptions + Add podcasts **C** | Local-loading placeholder **C** | Root + at top trailing; row opens View; Add/Play at row end | View condition summary below name |
| View editor / New View | Live match count in pinned lower surface; changes use snackbar **C** | Field-specific name errors below field; range errors in list/sheet **C** | Condition sheets, titled with selected radio/value | Pinned Undo; snackbar action suppressed while editor owns Undo | “Any” values; zero-match count **C** | None | Done/Create at bottom trailing; Rename → Cancel/Save below field | Section headings; unfinished-conditions explanation |
| Search / Save as a View | Opens created View **C** | Duplicate/empty-name error inside naming dialog | Naming dialog centred over Search | History/snackbar for saved View **C** | Inline no matches + Clear search **C** | None | Query near top; Save as a View immediately below; dialog confirm trailing | Scope says Library; root help names titles, podcasts and notes |
| Episode detail | Common snackbar for edits **C** | Download status below its action; Try again; playback error in player **C** | Add-to-Playlist sheet | Common snackbar; history | “Not in any Playlist” **C** | None | Full-width Play now above tonal secondary actions | Show notes; Playlist membership/Position |
| Playlists / Playlist | Common snackbar | Shared sync strip **C** | None | Snackbar plus history | No Entries + Find Episodes **C** | None | Root +; Entry Play and overflow; Entries/History/Timeline tabs | Active/Entry count/Clear on Played summary |
| Playlist settings / New Playlist | Named rename snackbar; deletion returns to Playlists with “Playlist … moved to Trash” | Name error directly below field | Rename field with Cancel/Save below | Snackbar/history | Blank new-name field | None | Rename below name; Delete separate lower row; Create at bottom trailing | Clear on Played consequences; Trash retention |
| Trash | “Playlist … restored as …” snackbar when renamed on restore | Shared sync strip **C** | None | Snackbar/history | Inline “No deleted Playlists” | None | Restore at row trailing **C** | Deletion date at row secondary position **C** |
| History / Listening Timeline | Rewind result shown in Entries + snackbar **C** | Shared sync strip **C** | Rewind summary sheet | Rewind snackbar/history **C** | Inline explanation + Show Entries | None | Tab at top; eligible timeline row opens Rewind | Inline Rewind hint |
| Rewind | Closes to Playlist result **C** | None in capture | Full-height summary; Cancel/Rewind at bottom trailing | After commit, common snackbar **C** | Explicit “None” under empty effects | Modal scrim, appropriate to committing a reversal | Rewind after consequence summary | Kept edits and Listening log explanation |
| Library / selection | Download Rule feedback uses common snackbar **C** | Shared sync strip **C** | Rule sheet from contextual bar **C** | Common history/snackbar **C** | Per-rule “No Subscriptions …”; fresh Library + Add podcasts | None | Top +; lower Add podcasts; contextual Download Rule action | Search scope; batch-selection explanation |
| Add podcasts | Subscribed state in result; common snackbar **C** | Query error below Find; subscribe error below result **C** | None | Subscribe snackbar/history **C** | “No podcasts found. Try another name.” **C** | Query disabled while lookup runs, indeterminate bar **C** | Find below single field; Subscribe at result trailing | Persistent “Podcast name or feed address” label |
| Podcast page | Check + “Subscribed”; Subscribe + “Unsubscribed”; common snackbar | Error/Retry in header or inspected Episode **C** | Armed Unsubscribe at same trailing control | Common snackbar/history, page retained | No Episodes + Refresh, or no matches + Clear search **C** | Busy progress/status, relevant actions disabled **C** | Subscribe/check at top trailing; row Add/Play | Show/Hide podcast details; author; filtered count |
| Subscription settings / Download Rule | Selected value; common snackbar **C** | Numeric error by maximum field **C** | Titled rule/override sheets **C** | Common history/snackbar **C** | Default explicitly names inherited value | None | Value rows open sheets; Mark all Played near end | Scope “on this Device”; rule consequences |
| Settings / OPML | Export snackbar; inline import counts and per-feed results **C** | OPML error and Try again alongside import controls **C** | System document picker **C** | Edit history; import subscription Undo **C** | None | Import progress + Stop; unrelated settings remain usable **C** | Task-specific rows in one Settings screen | Section headings and concise row descriptions |
| Listening stats | Values/selected-day summary | None specific | None | None | Inline “No listening yet. Play an Episode …” | None | Day arrows; Show table / Show chart | About your stats paragraph |
| Welcome / Server | Successful connection exits task **C** | Error immediately below address **C** | None | None | Standalone-first invitation | Server-check bar + disabled field **C** | Start on this phone; Connect to a server; Check and connect | Optional-server explanation; address scope |
| Mini player / Now Playing | Transport/Position state | Loading/error text and Try again **C** | Speed/Sleep sheets **C** | Edit history for app edits; transport is direct | Hidden only when no current Entry **C** | Buffering indicator, no global block **C** | Artwork expands; prominent Play/Pause; seek; Episode/Entries | Current Playlist; Chapter label when available **C** |

**Mismatches and limits:** No scored transition mismatch can be established without a flow strip. The pinned View-editor Undo and shared snackbar Undo are explicitly coordinated in `ViewEditor.kt`, `SheetFeedback.kt` and `PlayerPresentation.kt`, rather than accidental duplicated commands. Field errors, network errors and batch-import results appropriately have different local contexts. However, new-Playlist validation in the Add sheet uses the generic “Enter a name that is not already used,” while dedicated create/rename screens identify empty or taken names separately (`PlayerPresentation.kt:332–356`, `PlaylistSettingsScreen.kt:61–94`); this is a craft inconsistency, not evidence that the field lacks a label or recovery. The chart's endpoint-date positioning and large-text action stacking are static craft gaps discussed below, not invented stability failures.

## Checklist

**Coverage: 71.2% (pass 49 · fail 3 · N/O 21 · N/A 6).** Verified applicable items: 52 / 73. All 79 core IDs receive exactly one verdict below. Platform Phone signals are assessed separately, not silently added to the core denominator. Mac- and web-only checklists: **N/A → Android phone target**, outside this denominator.

**Failures by severity**

1. **[DATA-01] blocker — A server-address draft is discarded by ordinary first-run Back.**
   - **Where:** Welcome → Connect to a server → type an address → Back → Connect to a server again.
   - **Evidence:** `ui/ServerScreen.kt:18–19` owns `input` only in its conditional composition's `rememberSaveable(current)`. `ui/AddPodcastsScreen.kt:28–32` handles Back by changing `server` to false and removing that composition. There is no enclosing saveable-state holder for that branch and no draft/model store for the address. On re-entering it creates `ServerScreen(model, null)` again, whose initial input is empty. This is a source-established normal navigation path, not an assumed process-death failure. `capture/light/41-connect.png` identifies the affected form. Settings' Server route also sits outside the route-specific `pages.SaveableStateProvider` (`ui/PodListScreens.kt:252–258`). In contrast, Add podcasts and renames explicitly persist raw drafts.
   - **Concrete fix:** Lift the address draft above the conditional Welcome branch, retain it while moving Back/forward, and persist it across quitting; use the same durable draft approach for the Settings route. Clear only after successful connection or an explicit discard. First run needs a store available before a Library session exists, rather than blindly calling `LocalFormDrafts` there. No extra confirmation is required.
   - **Score consequence:** Interaction & feedback **≤4.9**; Overall **≤6.9** because its lowest category is 4.9. The checklist assigns blocker severity even though this is secondary setup rather than lost Playlist content.

2. **[WIN-03] major — Welcome has no overflow route in a short phone window.**
   - **Where:** First-run Welcome in a short/landscape compact phone window, particularly with enlarged text.
   - **Evidence:** `ui/AddPodcastsScreen.kt:34–39` lays all five children in a fixed `fillMaxSize()` Column, with 24 dp outer padding and four 24 dp gaps, but no scrolling or adaptive placement. Even its default one-line typography and two 48 dp buttons require about **323 dp before system insets** (48 padding + 96 gaps + 38 title line + 24 body line + 96 buttons + 21 help line); wrapping/enlargement increases that requirement. A short phone viewport cannot reach the lower content through scrolling because no scroll container exists. The manifest does not restrict orientation. `capture/font200/40-welcome.png` proves the tall portrait state fits; it does **not** prove this short-window case. Actual landscape pixel bounds are N/O; the finite non-scrollable content budget is established by source. This is not a tablet-layout complaint and is not double-counted under TYPE-05.
   - **Concrete fix:** Put the existing Welcome content in an inset-aware `LazyColumn` or `verticalScroll` container, retaining its present 24 dp rhythm and both choices. Ensure both choices remain reachable when height is constrained. Validate in a short compact phone window at default and 200% text.
   - **Score consequence:** Platform fit **≤6.9**.

3. **[KEY-08] minor — No in-app shortcut reference; accepted owner exception.**
   - **Where/evidence:** The owner explicitly prohibits listing shortcuts on the phone; `docs/design/android.md` repeats this. Settings has no reference (`ui/SettingsScreen.kt`), although app Undo/Redo has Ctrl+Z/Ctrl+Shift+Z handlers (`ui/MainActivity.kt:46–52`, `ui/HistoryActions.kt`). The shared core checklist literally requests an in-app reference. This is not treated as an Android Foreign tell: a phone normally needs no desktop-style shortcut list.
   - **Disposition instead of a conflicting fix:** Retain the owner's decision. There is no permitted app change that both lists shortcuts and preserves “never listed on the phone.” Record this as an accepted minor exception and exclude it from the improvement target; do not add a shortcut screen. It imposes no numeric cap.

**Complete verdict ledger**

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No measured step-to-step boxes or flow strip. |
| FLOW-02 | N/O | No runtime focus/scroll trace. |
| FLOW-03 | N/O | Raw-draft ownership and disabled submissions protect inspected paths, but no full late-completion probe. |
| FLOW-04 | N/O | Captured Undo/validation is visible; smallest-width, keyboard and delayed follow-ups not established. |
| FLOW-05 | N/A | No paired peer panels in the compact phone target. |
| FLOW-06 | N/O | Captured headings have content/empty states; no evidence for blocks through transitions. |
| FLOW-07 | pass | Root add top trailing; sheet/create actions lower trailing; rename controls below names: 01/10/20, 05/09/15/19, 70–79. |
| KEY-01 | N/O | No complete attached-keyboard task traversal; Compose focusability alone is insufficient. |
| KEY-04 | N/O | Explicit initial/return focus in EditorComponents/NameEditor; actual order/rings/traps untested. |
| KEY-06 | N/O | No international-layout execution evidence for app undo handlers. |
| KEY-07 | N/O | Scroll-key behaviour not exercised. |
| KEY-08 | fail | Accepted owner exception above. |
| DLG-01 | pass | Reversible edits use snackbars/history; naming is an explicit input task; notification rationale is contextual. No delete/unsubscribe confirmation. |
| DLG-02 | pass | Named input task “Save as a View”; Rewind names Playlist/moment; permission rationale is specific (SearchScreen, TimelineScreen, IncomingContent). |
| DLG-03 | pass | Cancel/Save as a View, Cancel/Rewind, Continue/Not now; no vague Yes/OK confirmation (79, 15; IncomingContent). |
| DLG-04 | pass | Cancel/dismiss callbacks do not commit destructive actions; sheets retain Android Back dismissal (TimelineScreen, EditorComponents). External Esc untested. |
| DLG-05 | pass | Delete/armed Unsubscribe use error roles; destructive steps are explicit; Trash/Undo recovery (70, 28, 82, 83). |
| DLG-07 | pass | Done sheets dismiss with Android Back; Rewind has Cancel/Rewind; no Cancel+Done+Back trio (06b, 15; EditorComponents). |
| DLG-09 | pass | Entry DropdownMenu is anchored in the triggering Box; commands close before Add sheet (12; PlaybackActions.EntryMenu). |
| CTRL-02 | pass | Flat selection rows preserve Checkbox semantics; settings switches use Switch semantics; no mixed-parent hierarchy (27, 50; Selection/EditorComponents). |
| CTRL-03 | pass | Persistent labels for name, query, server, numeric and sleep inputs (71–79, 61; EditorComponents/PlayerPresentation/ServerScreen). |
| CTRL-04 | pass | Wide labelled fields, locale-aware NumberInput/speed formatting, field-specific invalid numeric/name states; 74/76–79 and NumberField. |
| CTRL-05 | pass | Compose Material buttons supply pressed/disabled treatment; large transport controls suit the phone listening task (08; PlayerPresentation). |
| CTRL-06 | pass | Add, Play, Edit, Subscribe and root creation remain outside contextual menus; Entry menu commands are related (01/02/11/12/60). |
| CTRL-07 | pass | Library and per-podcast search have explicit scope and clear controls; directory input identifies name/address; no displayed history (20–22, 59–61). |
| CTRL-08 | pass | Download determinate bytes/indeterminate fallback and cancel; OPML processed/total and Stop/resume; lookup indeterminate and Back cancels screen coroutine (PlaybackActions, OpmlActions, SettingsScreen, AddPodcastsScreen). Runtime timing N/O. |
| LIST-01 | pass | Podcast/Episode feeds are legitimate lists; stats table is explicit Day/Time listened pairs (PodListScreens, ListeningStatsScreen). |
| LIST-02 | pass | Screen/section headings identify lists; stats table headings are nouns (01/10/20, ListeningStatsScreen). |
| LIST-03 | pass | View sorting uses named choices in a sheet; no tappable sortable column header is falsely promised (ViewEditor sheet 7). |
| LIST-04 | N/A | No dense, narrow multi-column name table. |
| LIST-05 | pass | Podcast description toggles one section and persists expansion in PodcastBrowsing/BrowsingContext (62; PodcastPageScreen). |
| LIST-06 | pass | Selected bottom destination, Playlist tab, radio choice and checked rows have visible states and semantics (11/06b/27/50). |
| LIST-07 | N/O | Touch opening/selection is supported; attached-keyboard list focus/arrow movement not exercised. |
| DATA-01 | fail | Server draft is unmounted on ordinary Back; detailed finding above. |
| DATA-04 | pass | Multi-step history records inverses and reverses only after successful application; snackbar, app-bar and keyboard routes (HistoryActions, ScreenActions; 73/80/82/83). |
| DATA-05 | pass | `revealChanges` routes restored Entries to Playlist; EntryList scrolls/highlights target; restoration feedback names a collision suffix (ScreenActions, EntryDragging; 80–81). |
| DATA-06 | N/O | Durable stacks, list anchors, Podcast expansion and tabs exist; full working-context restoration after actual relaunch/process death was not exercised. |
| DRAG-01 | pass | EntryDragHandle supports drag and named Move up/down alternatives/custom accessibility actions (EntryDragging; menu 12). |
| DRAG-03 | pass | Drag calls `model.moveEntry`, which records inverse order in history (EntryDragging, AppModel). |
| DRAG-05 | N/O | Source elevation/insertion cues/cancel reset are coded; threshold and successful/failed runtime presentation not captured. |
| DRAG-06 | N/O | Edge autoscroll and retained destination are coded; actual scrolling/drop retention untested. |
| PTR-03 | N/O | Pointer attachment/shape/system gestures not exercised on phone. |
| PTR-04 | pass | ActionIcon, ActionTooltip and Now Playing controls use named Material tooltips; renaming wraps names instead of relying on hidden truncated values (EditorComponents, NameEditor, PlayerPresentation). |
| APPEAR-03 | pass | Independent dark tokens, system appearance/contrast listener, tonal boundaries; no essential transparent overlay (MainActivity; light/dark tour). Device contrast-settings execution unverified. |
| APPEAR-04 | pass | Measured token pairs below pass text/non-text thresholds; subscribed icon has separate light/dark foreground/background. No confirmed failing functional pair in captures. |
| APPEAR-05 | N/O | Standard Compose animation and gesture-driven predictive translation; no reduced-motion run or proof for every motion path. |
| APPEAR-09 | pass | Consistent outlined Material-like vector family, familiar playback/add/gear/share/tray meanings; skip numbers integrated into icons (02/03/08/20/32). |
| APPEAR-10 | pass | Tonal action tiles, outlined fields and bounded sheets distinguish controls/content in both themes (03/06b/09/15/71). |
| APPEAR-11 | N/O | Separate settled captures cannot demonstrate sampled transition frames. |
| TYPE-02 | pass | One system family, Normal/Medium weights, semantic type scale (MainActivity). |
| TYPE-03 | pass | Minimum declared styles 12 sp; sp text and captured enlarged type remain readable (MainActivity; font200 tour). Skip-icon numerals are icon composition, not reading text. |
| TYPE-05 | pass | 14/21 body and 12/18 metadata leading; values/actions reflow at large text; names wrap (font200/02–05, 24–25, 70–76). Welcome viewport fault counted once at WIN-03. |
| TYPE-06 | pass | About-stats first three full lines are 66/66/66 characters, mean 66; 14 sp/21 sp leading, 150%; paragraphs use spacing rather than indent (light/35; MainActivity). |
| TYPE-07 | pass | No long all-caps app passage or double emphasis; show-note links are underlined, not ordinary body copy (ShowNotes, strings.xml). Publisher artwork is exempt. |
| TYPE-08 | pass | App strings use curly punctuation, ellipsis and real range/minus characters (strings.xml; 14/35/42/74–79). |
| COPY-01 | pass | Actions name outcomes; Playlists/Entries/Positions/Played align with CONTEXT; Android instructions use tap; owner-fixed vocabulary retained. |
| COPY-02 | pass | Name errors explain taken/empty state; server/feed errors provide connection/address recovery and retry, near controls; playback says place kept (74/76–79; ServerScreen/AddPodcastsScreen/strings). |
| COPY-03 | pass | Main-task empty states point to Add, edit conditions, Clear search, Find Episodes, Show Entries or playback; empty Trash appropriately states no deleted content (13/18/30/43; PodListScreens/PlaybackActions). |
| COPY-04 | pass | Sentence-style action labels with consistent capitalized domain nouns; action tooltips use concise labels (strings, EditorComponents). |
| AX-01 | pass | Code supplies icon names, toggle/radio roles and states, seek value/state description, progress labels and artwork identity for player; snapshots 06b/08/09/27/50/74 confirm named/control states. This is semantics coverage, not a live TalkBack usability claim. |
| AX-02 | pass | Check glyph, selected tab indicator, checked rows, explicit Played/changed/default/error text supplement colour (11/23/50/74; EditorComponents). |
| AX-04 | N/O | Non-gesture description/reorder/chart routes and custom actions exist; live Switch Access/Voice Access operation is untested. |
| AX-05 | pass | App playback/error/buffering/sleep state is visually represented; explicit Play/Pause; restore path does not request automatic play (PlayerPresentation, PlaybackService). No audio-only app-critical warning found. |
| START-01 | N/O | Loading/local data architecture exists; usable-first-frame promptness and unrelated-work availability during startup not timed. |
| START-02 | pass | Start without server, dismissible persisted checklist and Settings reopening (40–43; GettingStarted, ScreenActions, SettingsScreen). |
| START-03 | pass | Checklist teaches Views/Playlists/addition; sheets explain local consequences; Hide is visible (42, 15, 24–25). |
| START-04 | pass | POST_NOTIFICATIONS request is download-triggered, not unconditional launch permission; no broad storage permission for picker (AndroidDownloads, AppModel, IncomingContent, manifest). |
| START-05 | pass | Specific rationale: “Allow notifications to see download progress and stop a download.” Continue/Not now before system request (IncomingContent, strings). |
| START-06 | pass | Standalone use has no account/server requirement; server is optional and postponed (40–43; AppModel). |
| START-07 | N/A | No account-creation feature. |
| EDIT-02 | pass | Native Compose text fields/selection retain editing operations; app Ctrl+Z fallback is after field handling, explicit rename fields consume unhandled text undo (MainActivity, NameEditor, HistoryActions). |
| EDIT-05 | N/O | SelectionContainer and annotated URL links exist; actual useful clipboard representations and URL copy not exercised. |
| WIN-03 | fail | Non-scrollable Welcome cannot adapt to short phone content height; detailed source-budget evidence above. |
| TOOL-06 | N/A | No user-hideable toolbar needing restoration. Player has visible expansion and is assessed as playback content. |
| SIDE-03 | N/A | No hidden compact-phone sidebar/split pane. |
| SIDE-04 | N/A | No simultaneously visible navigation pane/detail in phone scope; bottom destination selection assessed at LIST-06/L1. |
| SET-01 | pass | Global playback/OPML/server/stats together; Subscription/Playlist choices beside their subjects; temporary Episode speed stays in player (06/24/32/70/08). |
| RESP-01 | N/O | No five-run 75th-percentile input-to-frame timings. |
| FOOT-02 | N/O | Lazy lists exist, including 500 Episodes, but no refresh-rate/latency measurements. |

**N/O:** FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-06, KEY-01, KEY-04, KEY-06, KEY-07, LIST-07, DATA-06, DRAG-05, DRAG-06, PTR-03, APPEAR-05, APPEAR-11, AX-04, START-01, EDIT-05, RESP-01, FOOT-02.

**N/A:** FLOW-05 → no compact peer panels; LIST-04 → no dense multi-column name table; START-07 → no account creation; TOOL-06 → no hideable toolbar; SIDE-03, SIDE-04 → no compact sidebar/split pane. Mac/web-only checklists → target.

**Contrast measurements:** Calculated from declared sRGB tokens in `MainActivity.kt`, with standard relative luminance and alpha compositing; these are source-role ratios, not guessed samples from antialiased glyph edges. Light secondary `#46464f` / `#faf8ff`: **8.86:1**; dark secondary `#c7c5d0` / `#121318`: **10.89:1**. Light/dark primary on surface: **6.46:1 / 10.93:1**. Tonal-button labels: **13.24:1 / 7.20:1**. Light/dark field outlines on surface: **4.25:1 / 5.83:1**. Unselected chart bars at alpha .72: **3.58:1 / 6.15:1**. Disabled controls and decorative separators are excluded. These support the inspected appearances; unseen real publisher imagery is not blanket-certified.

**Android Phone signals**

| Signal | Verdict | Evidence and limit |
|---|---|---|
| L1 Navigation | Native | Exactly three equal root destinations, labelled bottom bar; titles/Up on inner screens; root Add and Settings are app-bar actions (01/10/20; PodListScreens). |
| L2 Visual language | Native | Material 3 components, semantic colours, coherent vectors, tonal sheets; no imported iOS chrome (MainActivity/EditorComponents; both themes). |
| L3 Density, text, frame | Foreign in one reachability case; otherwise adapted | 48 dp icon/choice targets, 12 sp minimum type, edge-to-edge and safe/IME insets are coded; font200 portrait reflows. Welcome's short-window overflow breaks window adaptability (WIN-03). Smallest supported phone and full keyboard-inset behaviour remain unobserved. |
| B1 System navigation | Adapted, source-supported | NavigableListDetailPaneScaffold normal stacks; player PredictiveBackHandler, modal dismissal, selection Back and armed-unsubscribe Back; manifest opts into Back callback. Predictive animation/order on device remains N/O. |
| B2 Preferences and access | Adapted, source-supported | System dark mode and contrast, sp styles, labels/roles/states, resource strings and locale-sensitive number/date formatting. No invented requirement for a separate theme picker. Live TalkBack/system-language runs N/O. |
| B3 System surfaces/lifecycle | Adapted with an established draft exception | Native ACTION_SEND chooser, OpenDocument/CreateDocument, download channel/WorkManager and media service/shortcuts; durable browsing/form data for most tasks. Server draft exception is DATA-01. Actual process-death/media/system-surface execution N/O. |

**Side-by-side/calibration:** Phone gallery images opened: Niagara `02-home-plum.jpg` and BuzzKill `01-pick-action-top.jpg`. PodList shares the former's clear leading alignment and the latter's consequence-under-name technique without copying either skin. The supplied Google Calendar Android gallery/grade is a dated large-screen reference, not evidence for current phone metrics or runtime behaviour; no phone requirement is imported from it. No iOS chrome or desktop command surface was found. The established Foreign signal is window-content reachability, not the owner's blue palette, sheets or bottom navigation. **Looks 8.4 · Behaves 7.5 (partial: code and snapshots, no runtime) → uncapped 7.8; WIN-03 → capped 6.9.** Evidence exists for portions of all 3 B signals; complete live behavioural coverage is not claimed.

## Scores

One score covers light/dark where their quality matches; 200% text is included. These are category judgements, not an arithmetic average. “Strong” does not imply the untested behaviours pass.

| Category | Score | Evidence / anchor | Principle |
|---|---:|---|---|
| Typography | **8.7** | Strong, close to Exemplary: 17/24 titles, 14/21 body, 12/18 metadata; readable name/error wrapping and persistent labels at 200%. Repeated small metadata strings and a dense stats explanation still do less semantic grouping than an Exemplary reference (02/24/35/74). | hierarchy, accessibility, craft |
| Hierarchy | **8.4** | Strong: one main Play/Subscribe action, quiet chrome, compact Podcast header, clear selected Playlist tabs. Episode's five equally tinted secondary tiles and stacked enlarged-text footer commands spend attention on secondary choices (03, font200/04/71). | content-first, hierarchy |
| Spacing & density | **8.1** | Strong: shared gutters, row dividers and deliberate stacked values. `CommitActions` forces one item per row whenever fontScale ≥1.5, even for short Undo/Done or Cancel/Save labels that could share space; this reduces visible conditions/content. Episode grid's 3+2 balance and sparse single-setting page are competent rather than exceptional tailoring (03/16, font200/04/71). | craft, conventions |
| Color & contrast | **8.8** | Strong: measured secondary/primary text passes comfortably; dark roles are independent; green check has shape and name; error styles clear. Tonal secondary action grid is heavier than necessary. Higher-contrast execution and arbitrary real artwork remain unverified, not failures. | color-restraint, accessibility |
| Iconography | **8.6** | Strong: coherent vectors, familiar playback, trays, check and pencil; accessible names/tooltips. Views/Playlists glyphs are visually close and playback/Entry actions rely on learned meanings at small scale; labels and accessible names mitigate this (01/08/11/32). | conventions, craft, discoverable-commands |
| Consistency & polish | **8.3 (stability N/O)** | **Partial: no flow run.** Strong static finishing: light/dark, errors, empty states, named Trash/restore feedback, shared sheet feedback. Generic Add-sheet name error differs from dedicated forms; automatic large-text stacking and chart endpoint positioning remain unrefined. No stability band limit applied. | craft, conventions, stability |
| Clarity | **8.1** | Strong: domain-specific actions, explicit default inheritance, practical errors and Rewind consequences. Chart endpoint dates both sit near the leading edge instead of the corresponding ends (`ListeningStatsScreen.kt:92–95`, light/35); lengthy About text and artwork-only identity (owner-fixed) require more recognition/reading than Exemplary clarity. | plain-language, feedback |
| Platform fit | **6.9** | Capped Competent maximum by WIN-03, despite Strong native/adapted surfaces and code-supported Android integration. Uncapped **7.8**, from Looks 8.4 and Behaves 7.5. No tablet/foldable penalty. | conventions, adaptability, stability |
| Interaction & feedback | **4.9** | **Partial: no runtime/timed runs.** Weak maximum imposed by DATA-01; otherwise forgiving app history, Trash, explicit renames, reordering alternatives and targeted permission flow are substantially stronger. Accepted KEY-08 is minor, adds no cap. Speed, live assistive use and actual restoration remain N/O. | forgiveness, feedback, user-control |
| Overall | **6.9** | Primary listening/browsing task is well served and visually Strong. An avoidable first-run draft-loss path holds the grade down most: minimum category 4.9 + 2.0 = **6.9 ceiling**. The owner's **9.0 target is not reached**; clearing the caps would still leave the specific craft gaps above. | forgiveness, conventions, craft |

## Next step

**Target:** DATA-01, the first-run server draft. **Anti-pattern:** closest to the guide's “Save-or-lose”; here the loss occurs before connection, when Back disposes the form. **Root cause:** temporary composition state is being used as ownership of an unfinished setup task. `rememberSaveable` supports saved-state restoration while its owner exists; it does not retain a removed conditional branch by itself.

**Change:** Keep one address draft outside the Welcome `if (server)` branch, persist it in pre-session storage, and share the durable policy with Settings' Server form. Preserve the draft until successful connection or explicit discard. **Principle:** forgiveness; compare the guide's PLAT-08 saving-model contrast and Things/BBEdit's rule that leaving a task does not throw away work. **Expected effect:** remove the Interaction cap after verification and raise reliability without changing any owner signature. No other category should regress; keep the current labelled field and Check and connect action. This is the smallest candidate; no confirmation dialog is needed.

After that, the smallest separate improvement is to make Welcome scroll on short phone windows, removing WIN-03. Then refine the chart's endpoint labels with start/end anchoring, allow CommitActions to wrap from measured space instead of forcing one item per row at a font-scale threshold, and use the same empty/taken-name validation in the Add sheet as dedicated Playlist forms. Preserve the owner's controls-below-name layout, single Add field, artwork-only player, blue accent and Material look throughout. Divide About your stats into short definitions without dropping its counting rules.

**Verification needed for a defensible 9.0:** Return to a partly typed address through both Back routes and relaunch; inspect the smallest/short landscape phone at 200% text; then obtain the guide's measured, delayed-completion flow strips, five timed passes, TalkBack/assistive-input and process-restoration evidence. These are verification requirements, not additional failures presumed from missing evidence.

**Log:** Review only; no iterative implementation step was applied. Baseline remains the supplied capture. Character check: all five signature elements kept; no redesign or owner decision reversal proposed. Only this report and its requested scratch copy are deliverables; no commit.
