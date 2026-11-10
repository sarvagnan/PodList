# PodList Android phone — independent audit, round 12 (Codex)

## Frame

Task · Find Episodes through Views, Search and podcast exploration, arrange them into Playlists, and listen while keeping each Playlist’s place.

Target · **Android phone**, compact window; native Kotlin/Compose/Material 3. Tablet and foldable signals are N/A → target and excluded from coverage.

Posture · Sovereign personal application with background playback and short, frequent foreground interactions.

Audience · Newcomers becoming perpetual intermediates; server administration is optional.

Nearest exemplar · Things 3 for calm personal organization, contextual teaching and reversible edits; Android gallery’s BuzzKill for explaining consequences beside choices, and Niagara for consistent leading edges and readable list hierarchy. Their appearance is a reference, not a destination. Reviewed the Android gallery and platform-fit comparison, and opened the BuzzKill action-picker and Niagara plum-home images. Their published-image behavior remains unverified.

Character · **Owner-fixed:** native Material 3 with blue seed `#2b50c8` and separately toned dark surfaces; equal Views/Playlists/Library destinations; artwork and transport controls lead the player; saved Views and independently resumable Playlists remain distinct; direct, reversible actions with contextual feedback.

Owner decisions · Retained in this assessment: one-field Add podcasts; one-list View editor; Rewind summary sheet; OPML in Settings; paused current Entry after relaunch; visually nameless mini player/Now Playing with an Episode route and accessible identity; named Playlist-to-Trash feedback with Undo and no preliminary question; compact Podcast header and pull-down description; top-bar Subscribe/green subscribed control and two-tap Unsubscribe, remaining on the page with Undo; explicit Rename/Cancel/Save below wrapping names; case-insensitive unique names; keyboard commands registered in Android’s own shortcut panel and absent from phone help. These choices are assessed in their Android context. No proposal below changes them. Artwork-only identification has a recall cost for unfamiliar audio; the Episode route and accessible identity mitigate it.

Evidence · Supplied capture README identifies build `7481dda`, Pixel 10 Pro XL profile, Android 16, 1344 × 2992 px, density 480: approximately **448 × 997 dp** full display. `light/` and `dark/` are font scale 1.0; `font200/` is light at 2.0. There are 159 screenshot/snapshot pairs (54/54/51). All screenshot sets were inspected, including lower/bottom states; accessibility names/states were inspected across the snapshot sets. Contact sheets are scratch inspection aids, not transition strips. No device was driven. No prior PodList grade or UI-GRADE.md work list was read.

Evidence notation · `Snn` means the numbered screenshot and adjacent `.txt` in `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-12/`, with appearance stated where relevant. The capture README maps all numbers. `K/File.kt` means `apps/android/app/src/main/kotlin/app/podlist/File.kt`; `D/` and `M/` mean `apps/android/data/src/main/kotlin/app/podlist/data/` and `apps/android/domain/src/main/kotlin/app/podlist/domain/`. These code references are evidence for implementation, not claims of executed behavior. Domain and screen interpretation follows CONTEXT.md, docs/design/android.md, docs/design/product-behaviour.md and ADRs 0011–0013.

## Flows

**Tasks run · None.** This is the requested capture-and-code audit. Separate tour states establish layout and semantics in those states, not transition stability or response times.

| Main task inspected | Supplied states and code | Runtime limit |
|---|---|---|
| First run → Standalone Device or server → starter Views → add podcasts | S40–43, S41b; WelcomeScreen, ServerScreen, GettingStarted, AppModel | Server draft retained in S41/S41b; this is not a measured process-death run. |
| View → Episode → Play/Add → Playlist selection → Undo | S01–03c, S09, S50; EpisodeRow, PlaylistAddSheet, ScreenActions, HistoryActions | No delayed-completion or focus/scroll measurements. |
| Edit View → condition sheet → live result count → Rename/Save or Cancel → return | S04–05; ViewEditor, EditorComponents, NameEditor | 200% View rename was missed by the capture; code supplies its layout/draft behavior. |
| Search Library → save as View | S21–22; SearchScreen, FormDraftState | Naming errors and concurrency inspected in code, not executed. |
| Podcast search → explore/filter/pull down → play an Episode or Subscribe → arm/confirm Unsubscribe → Undo | S23–28, S59–63; PodcastPageScreen, subscriptionStep | No failed long-page Episode-action capture; COPY-02 below is source-proven placement, not a measured FLOW failure. |
| Playlist → Entries/reorder/remove → History/Timeline → Rewind → Undo/Trash/Restore | S10–19, S16b/c; PlaybackActions, EntryDragging, TimelineScreen, PlaylistSettingsScreen | Drag and Rewind completion were not driven. |
| Mini player → Now Playing → seek/speed/sleep → nested Episode/Chapters/Entries → Back | S08/08b and mini player throughout; PlayerPresentation, PlaybackService | Predictive animation, audio focus, media surfaces and interruptions untested. |
| Settings → defaults/overrides/Download Rules/OPML → stats | S06–07, S24–25, S30–35; SettingsScreen, SubscriptionSettingsScreen, OpmlActions, ListeningStatsScreen | OPML progress, populated stats’ 200% top, and real download/network failures were not captured. |

Widths · One compact portrait phone width; light/dark at normal text and light at 200%. Smaller compact widths, landscape and resize are N/O. Medium/expanded/tablet/foldable layouts are outside this target.

Timed runs and device · N/O; the emulator profile describes the supplied evidence, not timed runs performed by this reviewer.

Script location · None supplied for the required measured flows. Measurements file · None. Screenshot strips · None; the capture folders are independent tour states.

Failures · **No scored FLOW finding.** FLOW-01/02/04/06 remain N/O at whole-task scope. Static S09/S15/S63 show accessible commit/Undo regions in those states, but cannot establish every follow-up. Stability sub-score **N/O in both appearances**. FLOW-03 can be assessed from code; see its verdict.

## Cross-screen inventory

`Snackbar` below means the shared inverse-surface message above the mini player/navigation; modal sheets move that host into their own bounds through SheetFeedback. Success and Undo use readable text, not a green-only cue. `Inline error` means error-role text and polite announcement. “None” means absent for that screen, not unimplemented elsewhere. Code-only states are marked C.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View (S01–02, S42) | Shared snackbar, named edit (C) | Global sync text and Try again below app bar (C) | None | Snackbar plus history menu (C) | Body “No Views”/“No matches”; Create/Edit/Add route (C) | None | Root +; row Play/Add | Persistent Getting started card, neutral tonal surface |
| View editor / new View (S04–05) | Named snackbar for edits/create (C) | Field supporting error; range error in condition context (C) | Rename field with Cancel/Save | History menu/snackbar (C) | “Any” and “All that match” values | None | Done pinned trailing for live editor; Create View trailing at form end | Permanent live-apply/draft explanation below conditions |
| Search (S21–22) | Named View-created snackbar (C) | Naming-field supporting error (C) | In-context name and Cancel/Create View | Snackbar/history (C) | Body no matches, Clear Search; Add podcasts for empty Library (C) | None | Search field/IME Search; Save as a View below field | Scope in persistent label and Library entry subtitle |
| Episode detail (S03–03c) | Named edit snackbar (C) | Download status/retry below action grid; remote action error below grid (C) | Add sheet | Snackbar/history (C) | In-your-Playlists explanation; absent notes/Chapters omitted (C) | None | Full-width Play Now, then labeled secondary grid | Positions and Resume/Play in Playlist section |
| Add to a Playlist (S09) | Shared snackbar after commit (C) | New-name field supporting error (C) | Radio choices; active target named; New Playlist field | Shared history/snackbar (C) | Default Playlist supplies a target | Modal task with native dismissal | Trailing footer Play Next / Play Last | “Active Playlist” beside target |
| Playlists / Entries (S10–12) | Named action snackbar (C) | Sync status/retry (C) | Entry menu, anchored to action | Snackbar/history (C) | Body no Entries + Find Episodes; no current Entry text (C) | None | Root +; per-Entry Play; inactive Playlist switch | Active/count/policy summary; current Entry label |
| History / Listening Timeline (S13–14) | Rewind named snackbar (C) | Sync status/retry (C) | Rewind sheet | Snackbar/history (C) | Body explanation + Show Entries | None | Timeline row offers Rewind; tabs stay above list | Plain instruction explaining review before applying |
| Rewind (S15) | Result in Playlist + snackbar (C) | None specific | Named moment, target Position, Unplayed/restored/kept summary | Result snackbar/history (C) | “None” in empty change groups | Modal summary | Trailing pinned Rewind; Cancel beside it | Permanent retained-edits/Listening-log explanation |
| Playlist settings / Rename (S16–17) | Named rename/delete snackbar (C); live switch shows state | Name-field error (C) | Name field, Cancel/Save below | Snackbar/history (C) | Default Playlist restrictions explained | None | Rename below name; switch; Delete lower down | Clear on Played consequence; Trash retention |
| Trash (S18) | Named restore snackbar, including changed name (C) | Sync status/retry (C) | None | Restore Undo/history (C) | Body explanation + Back to Playlists | None | Per-row Restore (C) | Retention explanation |
| New Playlist (S19) | Named creation snackbar (C) | Field-specific empty/duplicate explanation (C) | Name field | Snackbar/history (C) | Blank field; unavailable Create until valid | None | Trailing Create Playlist directly below field | Persistent field label |
| Library / selection (S20/S27/S43) | Rule edit reflected in value/group; history (C) | Sync status/retry (C) | Download Rule sheet with consequences (C) | History and reversal message (C) | Body no Subscriptions + Add podcasts | None | Root +; Search row; contextual Download Rule action | Group names explain downloading behavior |
| Add podcasts / results (S26/S59) | Named Subscribe snackbar (C) | Query supporting error; per-result subscribe failure below result (C) | None | Snackbar/history (C) | “No podcasts found. Try another name.” (C) | None | Trailing Find podcasts below single field; row Subscribe | Persistent name-or-feed label |
| Podcast page (S23/S28/S60–63) | Named Subscribe/Unsubscribe snackbar; green check | **All Episode-action errors/retry in scrolling header (C); COPY-02** | Same-control two-tap Unsubscribe | Shared snackbar, visible in S63 | No Episodes/filtered matches + Refresh/Clear (C) | None | Top-bar Subscribe; Episode Play/Add | Pull-down plus explicit Show/Hide podcast details |
| Subscription settings / Download Rules (S24–25) | Values change in place (C) | Number-field supporting error (C) | Rule/override sheets | Shared history and named restored value (C) | Inherited values explicitly “Default (…)” | None | Value rows; Mark all Played | Consequence under Download Rule/threshold; inheritance explanation |
| Settings / OPML (S06–07/S32) | In-place values; OPML export snackbar/import inline counts (C) | OPML inline failures + retry (C) | Native file pickers; appearance/retention sheets | History; reversal names value and scope (C) | None | Contextual notification explanation at first download (C) | Value rows; OPML rows | Section-specific subtitles; Getting started route |
| Listening stats (S30–35) | Content updates | Sync status/retry (C) | None | None | Body explanation + Find something to play | None | Chart day/previous/next; Show table | About your stats after chart/top podcasts |
| Mini player / Now Playing (S08 and throughout) | State/Position changes | Retry icon plus shared playback-error snackbar (C) | Speed/sleep sheets (C) | Shared edit history for app edits; playback is direct | Mini player absent with no current Entry (C) | None | Play/Pause visually strongest; Episode/Entries routes | Accessible podcast/Episode identity; speed and seek labels |
| Welcome / server (S40–41b) | Destination opens (C) | Server-field explanation with recovery (C) | Server address after explicit Connect choice | Native text undo | Two clear start choices | None | Start on this phone; trailing Check and connect | Server optionality and per-address Library explained |

Mismatch · Remote Episode resolution fails in two presentations: Episode detail renders recovery beside the actions, while the Podcast list puts the same recovery in its distant header. Add podcasts also places result-specific failures below their result. This is **COPY-02**, counted once. The shared success/Undo host is consistent. Live settings’ quiet state changes and operation-result snackbars have different purposes and are not treated as arbitrary confirmation mismatches. No numerical stability deduction is made without flow evidence.

## Checklist

**Coverage: 73.6% (pass 52 · fail 1 · N/O 19 · N/A 7).** Formula: `(52 + 1) / (52 + 1 + 19) = 53/72`. All **79 core IDs** receive exactly one verdict below. Android Phone signals are assessed separately below Scores; they do not invent additional checklist IDs. Mac and Web checklists are N/A → Android target and excluded from this count.

### Failures by severity

**COPY-02 — major — Episode-action errors are separated from their cause.**

- **Where:** Podcast page, after scrolling beyond its header, then choosing Play Now or Add to a Playlist on an Episode that has to be brought into the local Library.
- **Evidence:** `K/PodcastPageScreen.kt:160–177` catches `bringEpisode` failure into one page-wide `actionFailure` and retains a retry closure. `:326–351` renders that failure and Try again only inside LazyColumn’s `header` item. `:358–366` invokes this operation from every Episode row. Finally clears the row’s `resolvingGuid`; no catch/reveal scrolls to the error or attaches it to the affected row. S60–63 establish a 500-Episode page; the defect is established by these source paths, not by a captured failing request. The on-page error is recoverable, but its placement requires finding the header and does not identify the affected Episode in the displayed error.
- **Concrete fix:** Retain the failed Episode guid and action with its error, and render named error/retry below that row’s action region. Keep it until success or deliberate dismissal. If the row has left the viewport by completion, provide a persistent visible marker above the player that takes the person to it without automatically moving their scroll. Keep page-level Subscribe/Unsubscribe failures beside their top-bar control. Preserve query, scroll and the retry action.
- **Scoring:** Clarity capped at **6.9**. This is a code-verifiable error-locality failure; no additional FLOW-04 failure or stability cap is asserted.

Blockers · None established. Minor checklist failures · None established. N/O items are not passes.

### Complete verdict ledger

| ID | Verdict | Evidence / limit |
|---|---|---|
| FLOW-01 | N/O | No transition boxes or measured strips. |
| FLOW-02 | N/O | No live focus/scroll transitions. |
| FLOW-03 | pass | FormDraftState and D/FormDraftStore compare submitted snapshots before clearing; Search and Add-sheet commits use that guard; submitted fields are read-only/disabled; no background completion overwrites a newer raw draft in inspected forms. |
| FLOW-04 | N/O | S09/S15/S63 show visible follow-ups only in those states; no whole-flow/IME evidence. COPY-02 owns the proven source placement defect. |
| FLOW-05 | N/A | No peer side-by-side panels in compact phone target. |
| FLOW-06 | N/O | Static sections have content/empty explanations; vanishing content during task transitions is unmeasured. |
| FLOW-07 | pass | S19/S26/S41b and NameEditor use trailing commits below fields; S06b/S06c/S15 use trailing sheet footers. View editor is a different, live multi-condition task. |
| KEY-01 | N/O | Native controls and list key handling exist; exhaustive attached-keyboard reachability/traps untested. |
| KEY-04 | N/O | FocusedInputModifier/NameEditor request field focus; global forward/reverse traversal and visible focus not demonstrated. |
| KEY-06 | pass | MainActivity/historyShortcuts use standard Ctrl+Z/Ctrl+Shift+Z, without punctuation-based extra modifiers. |
| KEY-07 | N/O | Scrolling-key behavior on actual focused lists untested. |
| KEY-08 | pass | Android adaptation: MainActivity.onProvideKeyboardShortcuts registers the active app’s Undo/Redo with the system panel. No bare-key accelerators; owner-fixed phone help stays uncluttered. |
| DLG-01 | pass | Routine edits/delete/Unsubscribe use direct state and Undo. Contextual notification permission and explicit date input are actionable tasks. |
| DLG-02 | pass | IncomingContent notification title names its purpose; Rewind names Playlist and date/time (S15). |
| DLG-03 | pass | Continue/Not now for permission; Cancel/Rewind and Cancel/Save name results (S15/S16b). |
| DLG-04 | N/O | Safe Cancel/dismiss/Back paths exist in code; physical Esc behavior across all modal surfaces untested. |
| DLG-05 | pass | Red Delete and armed Unsubscribe; ordinary commit stays distinct, S16c/S28; no unsolicited destructive default. |
| DLG-07 | pass | EditorSheet gives Done with native Back/dismiss; Rewind gives Cancel/Rewind; rename gives Cancel/Save. No Cancel/Done/Back button trio. |
| DLG-09 | pass | EntryMenu/EpisodeOverflow/Podcast menu anchor DropdownMenu inside their trigger’s Box; edits are in persistent draft state. Android arrow not required. |
| CTRL-02 | pass | CheckRow/EpisodeRow preserve checkbox roles/states; selection snapshots show checked/unchecked; no hierarchical checkbox parent needs mixed state. |
| CTRL-03 | pass | OutlinedTextField label slots persist on search, naming, numeric, server and sleep fields. S22/S41b confirm filled examples. No secret-input form. |
| CTRL-04 | pass | NumberInput uses locale parsing/formatting and bounds; fields explain duplicates/empty/range issues without clearing input. ValueRow widths/reflow are explicit. |
| CTRL-05 | pass | Material Button/IconButton/TextButton and clickable ripple provide press feedback; phone transport sizing matches task and platform, S08. |
| CTRL-06 | pass | Play/Add remain visible; overflow contains related sharing/download/Entry commands; S02/S03/S12/S60. |
| CTRL-07 | pass | Search the Library vs Podcast name or feed address vs Search Episodes; no displayed history requiring a clear-history action. |
| CTRL-08 | pass | OpmlActions/SettingsScreen expose feed counts, stop-after-current and resume; DownloadStatus chooses determinate/indeterminate from byte total and supports Cancel; lookup waits show indicators. Timing remains RESP-01 N/O. |
| LIST-01 | pass | Content feeds stay native lists; ListeningStatsScreen has Day/Time listened table presentation, stacked at large text. |
| LIST-02 | pass | Contextual screen titles and Day/Time listened noun headings; S01/S10/S20; stats table code. |
| LIST-03 | pass | ViewEditor Sort offers labeled newest/oldest/shortest/longest choices; Android lists need no fake column headers. |
| LIST-04 | N/A | No dense multi-column name table in this phone UI. |
| LIST-05 | pass | Podcast query/expanded disclosure saved in BrowsingContext.podcasts through BrowsingStore; explicit Show/Hide controls and pull-down share the same state. |
| LIST-06 | pass | Navigation, Playlist tabs and choices show selected state/check/radio; S01/S09/S11/S13/S14/S06b. |
| LIST-07 | N/O | Touch selection/opening is shown; attached-keyboard arrow/focus behavior not exercised. |
| DATA-01 | pass | Durable form drafts, buffered flush on disposal/onStop, independent explicit rename drafts, recoverable pending new-View identity, and preserved invalid numbers; S41b supplies a retained-input state. Runtime process-kill stress remains unverified. |
| DATA-04 | pass | HistoryActions multi-step inverses/redo, typing boundaries, retry after reverse failure; MainActivity standard shortcuts and history menus. Playlist settings, Rewind, download/subscription actions have inverse/recovery routes. |
| DATA-05 | pass | ScreenActions.revealChanges, EntryList reveal/scroll/highlight, SettingsFeedback named restored values and settingReveal scrolling expose reversed edits. |
| DATA-06 | pass | BrowsingContext/BrowsingStore persist destination stacks, detail destination, list anchors, Playlist tab, Search, Podcast query/disclosure and stats mode; PlayerContainer restores paused playback. Android recreation retains transient selection through rememberSaveable. This verdict rests on code, not a rotation/relaunch test. |
| DRAG-01 | pass | EntryDragging implements reorder; EntryMenu has Move up/Move down and custom accessibility actions, S12. |
| DRAG-03 | pass | AppModel.moveEntry records inverse placement and shared history/Undo. |
| DRAG-05 | N/O | Source/target/cancel cues implemented; no drag-state capture or failed-drop observation. |
| DRAG-06 | N/O | Edge autoscroll and retained destination exist in EntryDragging; live drag continuity/selection untested. |
| PTR-03 | N/A | Touch-phone audit supplies no pointer surface to grade. |
| PTR-04 | pass | ActionIcon/ActionTooltip provide action-specific Material tooltips; full input remains accessible through native editing. |
| APPEAR-03 | pass | MainActivity defines independent tonal light/dark roles, listens to UiModeManager contrast changes and strengthens outlines/secondary text. Opaque surfaces avoid transparency-dependent boundaries. S01–63 light/dark. |
| APPEAR-04 | pass | Source-role contrast measurements below meet Android thresholds for inspected functional foregrounds, including selected and unselected chart bars. No measured failure. |
| APPEAR-05 | N/O | Built-in Compose animation APIs dominate; actual reduced/disabled-motion setting and predictive visual behavior untested. |
| APPEAR-09 | pass | Coherent vector action family with familiar search, gear, plus, Play, star, download, and skip glyphs; S02/S03/S08/S20. |
| APPEAR-10 | pass | Filled primary commits, text secondary actions, outlined fields, tonal current/selected states; content remains visually distinct. |
| APPEAR-11 | N/O | No sampled loading/transition frames. Settled captures cannot establish flashes or intermediate contradictions. |
| TYPE-02 | pass | MainActivity uses one system family, Regular/Medium/Semibold role emphasis. |
| TYPE-03 | pass | sp text roles: body 16/14/12; captions at least 12sp; 200% text grows while icon glyphs stay dp-sized. |
| TYPE-05 | pass | S02/S03/S06/S11/S15/S24 at 200% show wrapping/stacking and reachable scrolling; NameEditor wraps names and separates controls; PlayerLayout measures controls before artwork. Missed states and other widths are not inferred. |
| TYPE-06 | pass | Normal-text About your stats lines are roughly 55–70 characters; paragraphs separated by blank space, bodyMedium 14/21sp and bodyLarge 16/24sp (150% leading). Notes use the same readable body style. |
| TYPE-07 | N/A | No stylized app-owned all-caps passage/heading. OPML is an acronym; fixture artwork initials are content. |
| TYPE-08 | pass | strings.xml uses curly apostrophes/quotes, real ellipses, range en dashes and true minus for remaining time. User names/addresses stay literal. |
| COPY-01 | pass | Play Now/Next/Last, Add to a Playlist, Rename, Restore, Subscribe and scoped Search labels retain domain meanings; phone instructions say Tap. |
| COPY-02 | fail | Major: remote Episode-action recovery lives in the distant Podcast header; detailed finding above. |
| COPY-03 | pass | S13/S18/S30/S43 empty states explain next steps and provide Show Entries/Back/Find/Add controls; View/Search empty code offers Edit/Clear. |
| COPY-04 | pass | Domain terms capitalize consistently; action labels and tooltips use short sentence-style phrases. |
| AX-01 | N/O | Source labels, roles and values are extensive; seek semantics include time, and selection snapshots show states. Mini-player/row snapshots merge several descendant labels into groups, so independent TalkBack focus/announcement cannot be certified from these reduced trees. No unlabeled-control blocker inferred. |
| AX-02 | pass | Current Entry text, selected tab underline, radio/checkbox states, green check symbol and textual errors supplement color. |
| AX-04 | N/O | Discrete move actions, details toggle and stats day/table alternatives exist. Actual TalkBack/Switch Access/Voice Access operation untested. |
| AX-05 | pass | Audio playback has persistent Play/Pause, Position and visible loading/error/retry states; no app instruction relies solely on a sound. Podcast editorial transcripts are outside this control-feedback check. |
| START-01 | N/O | Loading placeholders/local-first startup exist in code; usable-content latency and unrelated-work responsiveness need a run. |
| START-02 | pass | GettingStarted Hidden/steps persist; Settings can reopen it; Welcome allows Standalone Device; S40/S42 and AppModel. |
| START-03 | pass | Getting-started card is dismissible; Timeline explains Rewind before action; Download Rule choices explain consequences; S14/S42 and choice-sheet code. |
| START-04 | pass | Notification request originates from downloading, with an asked flag; manifest contains network/media service access, no launch permission wall; K/IncomingContent and AppModel. |
| START-05 | pass | “Allow notifications to see download progress and stop a download.” is a specific complete reason before the system prompt. |
| START-06 | pass | S40–43 and DeviceLibrary path allow the core task on this phone without account/server setup. |
| START-07 | N/A | App offers no account creation. |
| EDIT-02 | pass | Native Compose text fields/selection keep standard editing; app undo bubbles only after fields. textFieldHistoryShortcuts prevents inappropriate app-history fallback. |
| EDIT-05 | pass | ShowNotes uses SelectionContainer and LinkAnnotation.Url; Podcast menu copies feed URL; shareText supplies useful title/link text to native sharing. |
| WIN-03 | N/O | 448dp portrait/200% works in supplied states; smallest phone, landscape, resize and IME combinations are not settled. Tablet/foldable excluded. |
| TOOL-06 | pass | Contextual chrome returns by Back/Cancel; expanded player has collapse and destination navigation; player remains reachable through its mini bar. |
| SIDE-03 | N/A | No hidden sidebar/pane in compact phone target. |
| SIDE-04 | N/A | No adjacent source/detail navigation pane in compact phone target. |
| SET-01 | pass | Global defaults/OPML/retention/appearance in Settings; Playlist settings and Subscription overrides alongside their objects; per-Episode speed in player. |
| RESP-01 | N/O | No five-pass timing dataset or P75 response measurements. |
| FOOT-02 | N/O | Lazy lists and asynchronous reads exist; actual refresh-rate scrolling/hangs are unmeasured. |

N/O · FLOW-01, FLOW-02, FLOW-04, FLOW-06, KEY-01, KEY-04, KEY-07, DLG-04, LIST-07, DRAG-05, DRAG-06, APPEAR-05, APPEAR-11, AX-01, AX-04, START-01, WIN-03, RESP-01, FOOT-02.

N/A · FLOW-05 (no paired panels), LIST-04 (no dense multicolumn table), PTR-03 (touch phone target), TYPE-07 (no affected typography), START-07 (no account creation), SIDE-03/SIDE-04 (no compact sidebar). No dependent N/A → failed parent is needed.

### Contrast evidence

Calculated from declared sRGB color roles in MainActivity; alpha composited in sRGB before relative-luminance contrast. Rounded to two decimals. These are code-derived foreground/background pairs; arbitrary publisher artwork and unrendered OS surfaces are not certified.

| Functional pair | Ratio |
|---|---:|
| Light white on blue primary `#2b50c8` | 6.81:1 |
| Light secondary text `#46464f` on `#faf8ff` | 8.86:1 |
| Light secondary text on selected/current container `#dfe1f9` | 7.24:1 |
| Dark body `#e4e1e9` on `#121318` | 14.35:1 |
| Dark secondary `#c7c5d0` on `#121318` | 10.89:1 |
| Dark secondary on current container `#434659` | 5.46:1 |
| Dark primary button text/background `#002781` / `#b8c4ff` | 7.70:1 |
| Light subscribed check white / `#176b39` | 6.57:1 |
| Dark subscribed check `#00391a` / `#80db9a` | 7.82:1 |
| Light active outline `#777680` on `#faf8ff` | 4.25:1 |
| Unselected chart bar, primary at .72 alpha on light surface | 3.58:1 |
| Unselected chart bar, primary at .72 alpha on dark surface | 6.15:1 |

High-contrast code strengthens primary/secondary text and outlines toward darker light-mode or lighter dark-mode endpoints. Disabled controls and decorative separators are exempt. The low-contrast chart baseline is decorative alongside labeled ticks and table/day alternatives; bar magnitude uses the passing primary colors.

## Scores

Scores apply across light/dark unless stated. The 200% layout is supporting accessibility evidence. “Strong” and “Exemplary” refer to the guide’s anchors, not framework choice or familiarity with earlier builds.

| Category | Score | Evidence | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong, close to Exemplary: deliberate 17sp Medium Episode titles, 14/21sp reading text, wrapping names and large-text stacking. In S02/S11 the recurring podcast/date/duration/state content is compressed into 12sp metadata, while several secondary lines have the same visual treatment. A clearer hierarchy within this frequent reading task would finish the scale. | hierarchy, accessibility, craft |
| Hierarchy | **8.7** | Strong: Episode title/content leads S02/S60; full-width Play Now leads S03; transport leads S08; rename and Rewind expose consequences before commitment. Playlist summaries give active status, count and retention policy nearly equal emphasis, and lower-level informational headings frequently share the action blue. These relationships remain less selective than the Exemplary anchor. | content-first, hierarchy |
| Spacing & density | **8.5** | Strong: repeatable 16dp gutters, 8/12/16dp gaps and 48dp controls; no observed crowding of commit controls at 200%. Entry rows spend a 48dp leading region on dragging plus trailing Play/menu regions, narrowing titles and making the Playlist noticeably more vertically fragmented than discovery lists (S02 vs S11). More deliberate tuning of that dense task would improve scan rhythm. | craft, hierarchy, conventions |
| Color & contrast | **9.0** | Exemplary within inspected states/roles: restrained blue for interactive emphasis, independently toned dark surfaces, appropriate current/selected fills and green subscribed variants; meaningful symbols/text supplement hue. Measured primary/secondary/functional chart contrast passes in both themes. System preference listeners are present. Runtime motion/high-contrast combinations remain N/O as recorded, without an invented cap. | color-restraint, accessibility |
| Iconography | **8.8** | Strong: coherent small vector family, paired 15/30 skip treatment, sensible search/star/download/share meanings, explicit labels/tooltips. Dense rows place several small glyphs beside much more prominent titles; miniature skip numerals and the playlist-add/playlist destination glyph distinction demand more inspection than the Exemplary anchor’s immediate recognition. | conventions, craft |
| Consistency & polish | **8.5 (stability N/O; partial: no flow run)** | Strong: shared commit/error/sheet/Undo primitives, robust normal/large-text sibling screens, deliberate empty states, named draft/restore feedback. The Podcast page’s remote-action error placement is the concrete cross-screen inconsistency. Settings also repeats “30 seconds” in both inherited value and explanatory copy (S24), consuming disproportionate space at 200%. No stability band cap is imposed without measurements. | craft, conventions, stability |
| Clarity | **6.9** | Competent ceiling imposed by **major COPY-02**: failure recovery is distant from the tapped Episode. Elsewhere specific action labels, scoped searches, no-server start, explicit inheritance and Rewind summaries are Strong. Those strengths place it at the top of the capped band. Artwork-only visual identity is retained as the owner’s tradeoff. | plain-language, feedback |
| Platform fit | **8.8 (partial: untested runtime behavior)** | Strong: Looks 8.8; Behaves 8.8 for the source-observable portion; `(8.8 + 2 × 8.8)/3 = 8.8`. Native compact navigation, controls, insets, sp/dp, Android sharing and persisted local context. Actual predictive animation, lifecycle stress and assistive navigation remain unverified, not Foreign findings. No mapped blocker/major Platform-fit cap established. | conventions, stability, discoverable-commands |
| Interaction & feedback | **8.6 (partial: no timed/live input run)** | Strong: multi-step Undo/Redo with recovery, durable drafts, source-level Back layering, drag equivalents, local-first operation, download/OPML stop/retry paths and context-sensitive permission request. The action error loses the row-level busy indication and leaves recovery elsewhere; this weakens the feedback loop, although the checklist cap belongs to Clarity. Latency, fluent keyboard/TalkBack behavior and motion remain N/O. | forgiveness, feedback, user-control |
| Overall | **8.5 (partial behavioral coverage)** | Strong personal Android client serving discovery and listening with a coherent native presentation. The distant remote-action recovery is the largest confirmed weakness. Clarity 6.9 sets an Overall maximum of **8.9**; 8.5 respects that cap and reflects the remaining row/copy craft work. Overall is holistic, not a mean. | content-first, craft, forgiveness |

### Android Phone signals

Side-by-side foreign-idiom inventory · Compared with the Android gallery’s action-picker/list vocabulary, no imported iOS/web idiom is established. Bottom navigation, tonal sheets, radio rows, contextual selection and snackbars are at home on Android. The guide’s Google-app comparison cannot certify runtime behavior here; no new external Google capture was introduced. Differences in palette or density are assessed as craft, not as platform violations.

| Signal | Verdict | Evidence and boundary |
|---|---|---|
| L1 Navigation | Native | Three equal destinations, root +/Settings actions, Up only inside a stack; S01/S10/S20 and PodListScreens. |
| L2 Visual language | Native | Coherent Material 3 roles, vector symbols, native sheets/menus/selection; light/dark gallery throughout. |
| L3 Density/text/system frame | Native in observed states; remaining configurations N/O | dp targets at least 48 through common actions; sp roles at least 12; 200% reflow; edge-to-edge and safeDrawing/IME insets in code. No smallest-width/landscape/keyboard-overlap certification. |
| B1 System navigation | Native in code; predictive animation N/O | NavigableListDetailPaneScaffold PopLatest, root Back, selection Back, player PredictiveBackHandler and native modal dismissal; manifest opts into Back callback. No device gesture/button run. |
| B2 Preferences/access | Adapted, partial | System/Light/Dark choices and contrast listener; sp scaling. Strings are resources and dates/numbers use locale APIs. English-only translation coverage is not an in-app language override. Complete TalkBack traversal remains AX-01 N/O. |
| B3 System surfaces/lifecycle | Native in code; lifecycle execution N/O | ACTION_SEND chooser, system file picker, downloads notification channel, MediaLibraryService, launcher shortcuts, contextual notification permission, saved drafts/browsing and playback state. Notification/lock-screen/Auto/Bluetooth/audio-focus execution and process-death stress are unverified. |

### What stands between this build and 9.0

1. **Fix COPY-02 first.** Put named remote-Episode recovery at the row and keep an in-view route when completion happens after the person scrolls. This removes the only established major cap.
2. **Refine recurring list typography and density.** S02/S11 spend much of the reading hierarchy on 12sp metadata while Entry control regions fragment titles. Try 14sp metadata with a clearer separation of podcast/date from Position/state, retaining 48dp action targets and direct reorder. Compare how many Entries remain readily scannable before accepting extra height. Empty space caused by a short fixture list is not itself a defect.
3. **Edit repeated explanations in settings.** In S24, “Default (30 seconds)” and its supporting paragraph repeat the same inherited duration. Let the value carry inheritance and use the supporting line only to explain the threshold’s consequence. This matters especially at 200%, where the repetition pushes the next setting much farther down.
4. **Finish evidence for the behavioral claim.** Run the main tasks with delayed results, IME open, smallest supported phone width, TalkBack, rotation/process recreation and timed passes. This is an evidence requirement for a complete grade, not an additional checklist failure or a numerical penalty for missing evidence.

## Next step

Target · **COPY-02**, the major failure in the lowest-scoring category, Clarity.

Anti-pattern · No exact named anti-pattern fits; this is misplaced recovery rather than a timed “Toast-and-vanish.” Nearest contrast: **CLAR-05, The error supplies the next action**, reinforced by the Android gallery’s consequence-near-choice technique.

Root cause · PodcastPageScreen shares page-level `actionFailure/retryAction` for both subscription changes and per-Episode acquisition, then renders the shared state only in the scrolling page header. The state has no retained failed-guid presentation after `resolvingGuid` clears.

Change · Split Episode-action error presentation by guid, put its named Retry directly below the affected Episode’s controls, and add a persistent visible reveal marker when that row is outside the viewport. Keep subscription errors beside the Subscribe control. Preserve the person’s scroll/query and keep retry available until resolved. Things’ relevant technique is recovery in the object’s context; express it with PodList’s existing inline-error and snackbar language.

Principle · `plain-language`, `feedback`, `user-control`.

Expected effect · Remove the Clarity cap; improve the consistency of result-specific recovery and the feedback loop. Added error text can change row height, so a later implementation must measure FLOW-01/02/04 around failure/retry at normal and 200% text. Artwork-first playback, one-field Add, compact Podcast header, two-tap Unsubscribe and the blue Material identity survive.

Implementation/iteration · None authorized for this review. No app, test or configuration was modified. No comparison Log is claimed; the supplied captures remain the baseline and all owner-fixed signature elements are kept.
