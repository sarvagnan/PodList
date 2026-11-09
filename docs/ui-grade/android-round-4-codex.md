## Frame

- **Task:** find Episodes in Views or Search, put them into independent Playlists, and listen while keeping each Playlist’s place; manage the Library on a server-connected or Standalone Device.
- **Target:** **Android phone**, compact portrait window. Tablet and foldable requirements are excluded. This is an independent audit of commit **91e5def3e65f1c4a0ad9f9dab944d464a26a0686** on 9 November 2026; no earlier PodList grades or UI-GRADE.md work lists were read.
- **Posture:** a focused personal listening tool, used transiently for finding/queueing and in the background for playback; not a desktop information-dense workstation.
- **Audience:** perpetual intermediates, with a newcomer path that must work without a server.
- **Nearest exemplar:** Things for calm content hierarchy, forgiving edits and explanations in place; BuzzKill’s Android phone action picker for putting a consequence beside a setting. These are craft references, not visual templates. The Android gallery/grades were consulted; BuzzKill’s first picker image and the supplied Google Calendar image were opened. The Calendar reference is dated May 2024 and tablet-sized, so it supports Android vocabulary only, not current phone layout or metrics. No current Google phone screenshot was supplied; that exact side-by-side comparison is N/O.
- **Character:** owner-fixed Material 3 with blue seed **#2b50c8** and independently toned dark surfaces; three equal bottom destinations; text-first Episode lists with compact artwork; artwork-led, nameless playback surfaces; condition rows opening sheets.

**Owner decisions retained and graded:** Views / Playlists / Library navigation; Add podcasts as one field; View editor as one list; Rewind as a summary sheet; OPML import/export in Settings; a paused current Entry in the mini player after relaunch; no visible podcast or Episode names in either player; Delete Playlist without prior confirmation, with Undo; plain Unsubscribe confirmation before the action, with Undo afterward. The fixed Unsubscribe decision incurs DLG-01’s cap. It is not the next-change target. Native phone controls, bottom navigation, sheets, 48 dp targets, and the brand accent are not treated as foreign desktop defects.

**Evidence notation:** `E/` means `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-4/`. Its README was read first. `01`, `04`, etc. refer to the numbered PNG and TXT pair in the relevant light/dark/font200 folder. All **44 screenshots and 44 accessibility snapshots per appearance** were inspected, with contact sheets for visual coverage and individual originals for detailed inspection. The baseline is the supplied, unchanged capture. Code file references without a directory prefix are relative to `apps/android/app/src/main/kotlin/app/podlist/`; `data/` refers to `apps/android/data/src/main/kotlin/app/podlist/data/`. CONTEXT.md, both supplied design documents and ADRs 0011/0012 were read. No app, test or config file was changed; no device was driven, tests run, or commit made.

## Flows

**Tasks inspected, not run:**

| Task | States inspected | Code supplements |
|---|---|---|
| Find and queue | Views → View → Episode → multi-select → Add to a Playlist | query evaluation, ordered batch adds, target selection, validation, Undo |
| Create/edit a View | New View / existing conditions / pinned count / Speed as a representative editor sheet | every condition sheet, date/range validation, live application and typing groups |
| Listen and recover | mini player → Now Playing; Playlist → Entries / History / Timeline → Rewind | nested player pages, seek, Chapters, sleep, speed, reorder and Undo |
| Manage Library | Library → Search/results, Add podcasts, Subscription/settings, Select Subscriptions, Unsubscribe | Download Rules, network errors, progress, subscriptions, downloads |
| Configure/import | Settings → stats, OPML, server | file pickers, import progress/stop/resume/retry, export, server errors |
| Begin without server | Welcome → Start on this phone / Connect → starter Views and empty Library | persistent onboarding, optional server and durable Bring over workflow |

**Widths / appearances:** one Pixel 10 Pro XL emulator profile, Android 16, compact portrait, **1344 × 2992 image pixels**; Light 100%, Dark 100%, Light 200% system font scale. Display density/actual dp viewport is not recorded, so image pixels are not converted to dp. The 48 dp and sp claims below come from code. No narrow-phone, landscape or tablet coverage is implied.

**Timed runs/device:** none performed by this reviewer. **Script location / measurements file / transition screenshot strips:** not supplied. The capture is a tour of separate states, not an instrumented flow run. FLOW-01–04, RESP-01 and transition/scroll performance remain N/O where the artifact cannot settle them. **Stability sub-score: N/O in every appearance.** No movement or timing failure is scored from unrelated stills. Font200 offscreen content and the remembered stats scroll offset are not counted as lost or clipped content.

## Cross-screen inventory

`S` = screenshot/snapshot; `C` = code. `G` = shared bottom SnackbarHost inside the player scaffold, above collapsed player/navigation, or hosted inside an open modal sheet; neutral/inverse surface, concise past-tense result, optional Undo. `G` is implemented in PlayerPresentation.kt and SheetFeedback.kt; it is not a captured success-flow measurement. `I` = inline text at the operation/field; errors use the error role and a polite live region. “None” means no such surface for that task, not N/O. Runtime placement under the keyboard remains unverified.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View (01/02) | G, edits/marks (C) | app-bar local-data notice + Retry sync (C) | none | G + toolbar history icons (C) | inline explanation + New View / Edit this View / Add podcasts (C) | none | root + top-trailing; row Add/Play trailing (S) | condition summary under title (S) |
| View editor / New View (04/05) | saved model + pinned matching count (S/C); G for edits (C) | I beside invalid name/range (C) | condition modal sheet with title/Done (C) | pinned Undo + history (S/C) | Any values and live count (S) | none | pinned bottom-trailing Done (S) | condition values; draft-kept explanation (C) |
| Search (21/22) | G on Save as a View (C) | field-name validation in naming dialog (C) | centered naming dialog, Cancel/Save (C) | history (C) | inline no-matches + Clear Search, or Add podcasts (C) | none | field top; Save as a View below it; row Add/Play (S) | scope is Library; contents named at Library entry (S) |
| Episode detail (03) | G for marks/add/download actions (C) | download status beside Retry (C) | Add sheet (C) | G/history (C) | metadata-pending / no Playlist membership inline (C) | none | full-width Play now after Episode identity (S) | per-Playlist Position, Chapters, selectable notes (S/C) |
| Playlists / Entries (10/11/12) | G for moves/removal (C) | sync notice in app bar (C) | none for deletion (C) | G/history; Trash recovery (C) | inline No current Entry / Find Episodes (C) | none | + at root; row Play; contextual Entry menu (S) | Active / Clear on Played / Now (S) |
| Playlist settings / Trash (16–19) | G for change/delete/restore (C) | I name validation (C) | none on Delete Playlist (C) | G/history + Restore in Trash (C) | “No deleted Playlists”, neutral inline text (S) | none | Create below name; Delete below settings; Restore trailing (S/C) | Clear on Played and retention explanation (S/C) |
| History / Timeline / Rewind (13–15) | G “Playlist rewound” (C) | sync notice (C) | fully opened summary sheet; Cancel/Rewind fixed footer (S/C) | G/history after Rewind (C) | neutral explanation + Entries (S/C) | none | Timeline row → Rewind, bottom-trailing (S) | Goes back / Unplayed / Returns / Kept (S) |
| Library / Subscription (20/23/43) | G on subscription changes (C) | I refresh failure below relevant Subscription, Retry refresh (C) | none | G/history (C) | “No Subscriptions yet”; empty Download Rule groups; Add podcasts (S) | none | + top-trailing; Search first, Add podcasts row (S) | per-device groups and Episode counts (S) |
| Add podcasts (26) | Subscribe becomes Subscribed + G (C) | I under field or named result, error role (C) | none | G/history (C) | empty-result explanation suggests another name (C) | none | Find below one field; Subscribe trailing result (S/C) | identifying field label (S) |
| Subscription settings / Unsubscribe (24/25/28) | G “Unsubscribed” (C) | I beside Unsubscribe (C) | centered plain confirmation, Cancel/Unsubscribe (S) | G/history (C) | none | none | value rows; Unsubscribe after settings (S) | inheritance + rule consequences (S/C) |
| Select Subscriptions / rules (27) | G “Download Rule changed” (C) | none | choice sheet (C) | G/history (C) | **zero selected + disabled button only if Library empty** (C, F5) | none | Change Download Rule below count (S) | purpose in Library entry; no empty-screen recovery (S/C) |
| Settings / OPML (06/07/32) | I import summary; export G (C) | I summary/error below OPML rows with Retry (C) | Android document picker (C; not captured) | G/history for edits/imports (C) | none | none | grouped rows; OPML beside its help (S) | defaults, import/export consequence, Getting started (S) |
| Listening stats (30–35) | live totals/content, no success notice (S) | none | none | none | inline “Play an Episode…” (S) | none | chart day selection / Show table beneath chart (S/C) | period labels + stats accounting explanation (S) |
| Welcome / Connect / Bring over (40–43) | opens local/server Library; durable transfer summary (C) | I below server field or transfer status, Retry (C) | Standalone/server choice; Bring it over/Not now (S/C) | none | starter Views / empty Library with Add (S) | connection task only, optional (S/C) | Welcome full-width primary; Connect below field; transfer footer (S/C) | optional-server explanation and migration inventory (S/C) |
| mini player / Now Playing (08/08b) | playback state in button/position (S/C) | mini Retry styling + G; expanded inline text/Retry (C) | speed/sleep modal sheet (C) | global history where relevant (C) | no current Entry hides mini player (C) | none | central Play/Pause; collapse top-trailing (S) | Episode route; **expanded accessible identity missing** (F1) |

**Mismatches / findings:**

- **Unsubscribe waits silently**, whereas Subscribe, Find podcasts, Connect, downloads and OPML explicitly render their working state (C). This is F3 / CTRL-08, not an invented response-time measurement.
- **Empty selection is unfinished:** Search/View/Playlist/Library explain a next step; empty Select Subscriptions supplies no explanation or route to add podcasts (C). This is F5 / COPY-03.
- **Player identity semantics differ:** the mini player names the podcast/Episode, the expanded player does not (S/C). This is F1 / AX-01; no visual names are requested.
- Inline field/operation errors, global action snackbars and durable import summaries have different purposes, so their different regions are not gratuitous inconsistencies. No FLOW-07 or stability penalty is added for these differences without flow evidence.

## Checklist

**Coverage: 77.5% — pass 50 · fail 5 · N/O 16 · N/A 8.** Calculation: `(50 + 5) / (50 + 5 + 16) = 55/71`. All **79 core IDs** have one verdict. Android’s six Phone signals are assessed separately below; tablet/foldable signals and Mac/Web-only checklists are **N/A → target**, excluded from this denominator. These are failures among verified items, not a claim that unverified behavior passes.

**Failures by severity:**

### F1 — AX-01 · blocker · Expanded player has no accessible current Episode identity

**Where:** Now Playing, all three appearances, including the no-Chapters state in 08/08b.

**Evidence:** `E/light/08-now-playing.txt` lists “Now Playing · Default”, Position, transport, Speed, Sleep, Episode, Chapters and Entries; it never contains “Market Hours” or “The long life of a shipping container”. The dark/font200 trees show the same omission. PlayerPresentation.kt:121 supplies those names to the mini player; **PlayerPresentation.kt:150** supplies only `ArtworkImage` in the expanded player. **ArtworkImage.kt:90–91** assigns null descriptions to both the loaded image and fallback. Nothing else in NowPlaying supplies the omitted identity. The artwork is the visual identity on this owner-fixed nameless surface; treating it as decorative removes that content for a screen reader. This is a code-and-snapshot finding, not an inferred failure from missing TalkBack testing.

**Concrete fix:** on the expanded artwork or its local wrapper, expose a single semantic image/description containing the podcast and Episode names, using the same metadata/fallback as the mini player. Keep the visible UI nameless; do not merge/clear all the transport controls into that node. Check that advancing the current Entry updates the identity without stealing focus. **Cap:** Interaction & feedback ≤ **4.9**. Severity is the checklist’s prescribed severity for AX-01.

### F2 — DLG-01 · major · Undoable Unsubscribe requires a routine confirmation (owner-fixed)

**Where:** Subscription settings → Unsubscribe.

**Evidence:** `E/{light,dark,font200}/28-unsubscribe.png` and `.txt`; AddPodcastsScreen.kt:119–140 always opens AlertDialog before calling unsubscribe, then offers resubscription through AppModel.offerResubscribe / HistoryActions.subscriptionStep. This is a routine reversible mutation, which DLG-01 says should use in-context feedback. The short, specific question and action verbs themselves pass DLG-02/-03. Do not multiply this one owner decision into several failures.

**Disposition / permitted fix:** retain the owner-required confirmation and subsequent Undo. **There is no permitted UI change that removes this failure within this brief.** Record it as an accepted exception and retain its cap; a strict 9.0 goal needs an explicit rubric exception or a revised numerical target. It is excluded from the next-step selection, not from scoring. **Cap:** Platform fit ≤ **6.9**.

### F3 — CTRL-08 · major · Unsubscribe has no working indication

**Where:** Subscription settings after confirming Unsubscribe, especially in server-connected mode.

**Evidence:** **AddPodcastsScreen.kt:117–138** sets `busy` and disables the unchanged Unsubscribe button, then awaits `session.source.unsubscribe(id)`; no spinner, progress/status text or state description is rendered for `busy`. ServerLibrary makes a DELETE request (`data/LibrarySource.kt:31`), with 2,000 ms connect and read timeouts (`data/HttpTransport.kt:33–38`); the network path can visibly wait. Success and error surfaces exist, but the intervening state has no explanation. In contrast Add podcasts renders Subscribing with a progress indicator. No actual latency or p75 is claimed; RESP-01 remains N/O.

**Concrete fix:** render “Unsubscribing…” plus a named indeterminate indicator adjacent to the action while busy, expose the busy status to accessibility, and retain the existing failure text, retry path and Undo-after-success behavior. Reserve space so this does not move core content; validate that with a delayed-network flow. **Cap:** Consistency & polish ≤ **6.9**.

### F4 — KEY-08 · minor · Implemented keyboard accelerators have no in-app reference

**Where:** app-wide undo/redo and editor sheets with a hardware keyboard.

**Evidence:** MainActivity.kt:47–51 and HistoryActions.kt:104–110 handle Ctrl+Z/Ctrl+Shift+Z. SettingsScreen.kt and GettingStarted.kt provide no shortcut reference, and EditHistoryMenu in SubscriptionRefreshStatus.kt:27–32 labels its buttons only Undo/Redo. This finding concerns actual shipped bindings, not a demand for desktop-style keyboard chrome on a phone.

**Concrete fix:** add a concise, accessible Help/Getting started reference listing these two bindings, optionally also in their tooltips. Retain native text-field undo behavior. No category cap from this minor finding.

### F5 — COPY-03 · minor · Empty Select Subscriptions offers no next step

**Where:** a fresh Standalone Library → Select Subscriptions, or a Library after all Subscriptions are removed.

**Evidence:** Library always offers the Select Subscriptions route (PodListScreens.kt Directory; 43 shows the empty-Library entry at default text size). **Selection.kt:66–79** renders a count, disabled Change Download Rule and an `items` loop filtered to active Subscriptions; with zero active rows it renders no empty message or Add podcasts route. Snapshot 27 is the populated case and is not misrepresented as the empty case; code settles the missing branch.

**Concrete fix:** show “Add podcasts before changing Download Rules” and an Add podcasts action in that empty branch, or suppress the entry while empty and keep Add podcasts prominent. Do not leave a blank disabled selection task. No category cap from this minor finding.

**N/O:** FLOW-01, FLOW-02, FLOW-03, FLOW-04, KEY-01, KEY-04, KEY-07, DLG-04, LIST-07, DATA-01, PTR-03, APPEAR-05, APPEAR-11, WIN-03, RESP-01, FOOT-02

**N/A:** FLOW-05 → phone has no peer panels; CTRL-02 → no checkbox hierarchy; LIST-04 → no dense column table; LIST-05 → no disclosure outline; START-05 → no runtime permission prompt; START-07 → no account creation; SIDE-03 → phone target; SIDE-04 → phone target

**Complete verdict ledger:** code references below use the relative-path aliases defined in Frame. A pass based on code is an implementation finding, not a claim of live device testing. Specific capture, fixture and phone-width limits remain in force.

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No measured asynchronous flow or before/after transition strip. |
| FLOW-02 | N/O | No observation of focus/scroll during delayed completion. |
| FLOW-03 | N/O | No late-completion/input probe; no loss inferred from separate stills. |
| FLOW-04 | N/O | Rewind/Add follow-ups fit the captured states, including 200%; IME and late-error visibility across tasks unverified. |
| FLOW-05 | N/A | No paired peer panels in the phone target. |
| FLOW-06 | pass | Library groups state their emptiness (20/43); Episode sections hide or have content/empty explanations (03; PodListScreens.kt:465 onward). |
| FLOW-07 | pass | Same-kind list actions stay top-trailing (01/10/20); View/New View completion stays bottom-trailing (04/05); shared EditorSheet header. |
| KEY-01 | N/O | No complete keyboard-only traversal; native focusability alone does not prove it. |
| KEY-04 | N/O | FocusedInputModifier supplies initial field focus; traversal and visible focus across every composite unverified. |
| KEY-06 | pass | Only custom accelerators use Ctrl+Z/Ctrl+Shift+Z, with key codes rather than layout-dependent punctuation (MainActivity.kt:47; HistoryActions.kt:104). |
| KEY-07 | N/O | Page/Home/End/Space behavior in Compose scrolling not exercised. |
| KEY-08 | fail | Global undo/redo bindings exist, but Settings/Getting started contain no shortcut reference (F4). |
| DLG-01 | fail | Routine reversible Unsubscribe always opens an alert (F2; owner-fixed). |
| DLG-02 | pass | “Unsubscribe from Deep Field?” names the situation; no redundant explanatory body (28). Naming dialogs identify their task. |
| DLG-03 | pass | Cancel/Unsubscribe, Cancel/Save as a View, Cancel/Done use concise action labels (28; SearchScreen.kt; ViewEditor.kt date picker). |
| DLG-04 | N/O | Cancel and Back dismissal are wired; Esc behavior with an attached keyboard unverified. |
| DLG-05 | pass | Destruction is deliberately invoked through named Delete/Unsubscribe controls; no unexpected destructive default (PlaylistSettingsScreen.kt:42; AddPodcastsScreen.kt:119). |
| DLG-07 | pass | EditorSheet has Done and platform Back/sheet dismissal; Rewind has Cancel/Rewind; no Cancel+Done+Back triple (06b/15; EditorComponents.kt:43). |
| DLG-09 | pass | Entry DropdownMenu is anchored in the trigger Box; edits in editor sheets apply to the model (12; PlaybackActions.kt:49; ViewEditor.kt:56). |
| CTRL-02 | N/A | No hierarchical checkbox parent/child structure; independent checkboxes remain checkboxes. |
| CTRL-03 | pass | OutlinedTextField labels persist for Search, Add podcasts, server, names and numeric fields (04/19/21/26/41; EditorComponents.kt:78). |
| CTRL-04 | pass | Blank/duplicate Playlist names, ranges and invalid numbers have field-specific feedback; NumberInput and speedSetting use locale-aware conversion (PlaylistSettingsScreen.kt; ViewEditor.kt; EditorComponents.kt). |
| CTRL-05 | pass | Material clickable/button pressed states; emphasis primarily filled versus text styles. Larger transport controls are appropriate to the phone listening task. |
| CTRL-06 | pass | Add/Play, root creation, edit and settings are outside menus; Entry menu commands concern that Entry (02/10/12/20). |
| CTRL-07 | pass | “Search the Library” explicitly scopes the field; no displayed search-history feature (21/22; SearchScreen.kt). |
| CTRL-08 | fail | Network Unsubscribe renders no busy status/progress while awaiting its server call (F3). |
| LIST-01 | pass | Content feeds are lists, as the Android clause permits; the optional stats table aligns Day and Time listened columns (ListeningStatsScreen.kt:70). |
| LIST-02 | pass | Views/Playlist/Subscription headings identify single-column lists; stats table headings are short noun phrases. |
| LIST-03 | pass | View editor Sort offers newest/oldest and shortest/longest as a labeled choice panel (ViewEditor.kt:126). |
| LIST-04 | N/A | No dense multi-column outline or filename table in this target. |
| LIST-05 | N/A | No disclosure outline with persistent expansion. |
| LIST-06 | pass | Bottom destination and Playlist tab selection are persistent visible marks; choice rows have radio state (01/06b/09/11; EditorComponents.kt:58). |
| LIST-07 | N/O | Touch opening/selection is implemented; keyboard focus/arrow behavior with an attached keyboard unverified. |
| DATA-01 | N/O | Valid edits are transactional and drafts use rememberSaveable, but cold restart/failed-save preservation of every unfinished form is not established. No lifecycle loss asserted. |
| DATA-04 | pass | EditHistory supplies multiple undo/redo steps, grouped typing and inverses; persistent toolbar actions survive snackbar timeout; Ctrl bindings exist (HistoryActions.kt; SubscriptionRefreshStatus.kt:27). |
| DATA-05 | pass | Undo reveals the relevant destination; restored/moved Entries scroll into view and receive a retained marker (ScreenActions.kt:113; EntryDragging.kt:45). |
| DATA-06 | pass | BrowsingContext persists destination, route stacks, scroll anchors, Playlist tabs, Search text and chart/table choice; saveable selection supports activity recreation (BrowsingState.kt; data/BrowsingStore.kt; Selection.kt:31). Actual kill/relaunch timing remains untested. |
| DRAG-01 | pass | Entry drag handle plus Move up/Move down and custom accessibility actions move the same content (EntryDragging.kt; PlaybackActions.kt:59). |
| DRAG-03 | pass | moveEntry records the inverse previous-neighbour position through EditHistory (AppModel.kt:101). |
| DRAG-05 | pass | Code draws moving-row elevation/translation and insertion lines, retains source and resets on end/cancel (EntryDragging.kt:76–143); live drag feel N/O. |
| DRAG-06 | pass | Edge proximity drives scrollBy; retained destination marking and focus are explicit (EntryDragging.kt:57–89). No slow external-drop path is offered. |
| PTR-03 | N/O | Mouse/trackpad pointer and system gestures not exercised on this phone evidence set. |
| PTR-04 | pass | Icon buttons use named TooltipBox/ActionTooltip; ordinary text buttons state their action (EditorComponents.kt:109; PlayerPresentation.kt:129). |
| APPEAR-03 | pass | Independent light/dark roles plus UiModeManager contrast listener strengthen primary, secondary text and outlines (MainActivity.kt:65–146); no custom translucent content dependency. |
| APPEAR-04 | pass | Principal text/control token pairs pass measured Android ratios in both themes; no failing enabled pair established. See measurements below. |
| APPEAR-05 | N/O | No reduced-motion session; do not assume every pane, item and sheet animation honors the setting merely from native components. |
| APPEAR-09 | pass | Coherent familiar back, add, edit, star, transport, download and share glyphs; deliberate transport numbers (02/03/08/12). |
| APPEAR-10 | pass | Filled primary actions, outlined fields and tonal navigation separate controls from text; onboarding numbers are not misleading checkboxes (26/40/42). |
| APPEAR-11 | N/O | No sampled loading/transition frames. Stills cannot establish flash-free or coherent intermediate frames. |
| TYPE-02 | pass | One system family, Regular/Medium weights and semantic styles (MainActivity.kt:107–121). |
| TYPE-03 | pass | Body/caption styles are 16/14/12 sp; content participates in platform text scaling (MainActivity.kt:114–120; font200 set). |
| TYPE-05 | pass | Captured 200% states wrap/reflow: actions move below Episode text, ValueRow values stack and stats tiles stack; long content remains scrollable. A partially visible scrolled row is not clipped typography. |
| TYPE-06 | pass | About-your-stats prose has roughly 60–80 characters on full default-size lines; bodySmall is 12/18 sp and bodyMedium 14/21 sp (34/35; MainActivity.kt:115–116). Real publisher typography remains untested. |
| TYPE-07 | pass | No app-authored long all-caps or non-link underlining; show-note links are underlined (ShowNotes.kt). |
| TYPE-08 | pass | Curly apostrophes/quotes, real ellipses, en-dash ranges and multiplication sign in app resources (strings.xml); user/publisher literals excluded. |
| COPY-01 | pass | Play now/next/last, Remove from this Playlist, Restore and Unsubscribe name consequences consistently with CONTEXT.md. |
| COPY-02 | pass | Connection/feed/OPML errors include recovery near their controls; playback error says the place is kept and offers Retry (ServerScreen.kt; SettingsScreen.kt; PlayerPresentation.kt:174; strings.xml). |
| COPY-03 | fail | Empty Select Subscriptions shows only zero selected and a disabled action, without a next step (F5). |
| COPY-04 | pass | Sentence-style actions/headings are consistent, with intentional capitalization of domain nouns and proper names (strings.xml; 01–50). |
| AX-01 | fail | Expanded Now Playing omits the current podcast/Episode from its accessibility content (F1). |
| AX-02 | pass | Played/Unplayed/Starred are words; selected tabs/radio/checkboxes and current Entry use shape/text as well as color (02/06b/11/50). |
| AX-04 | pass | Visible move commands and custom accessibility move actions supplement drag; seek is a semantic Slider; non-gesture player collapse and sheet actions exist (EntryDragging.kt:137; PlayerPresentation.kt:206). Live assistive-input usability N/O. |
| AX-05 | pass | App playback status has text/visual controls, buffering/error labels and a Pause path; no critical app-authored audio-only cue (PlayerPresentation.kt:128/174; PlaybackService.kt). Publisher transcripts are not claimed. |
| START-01 | pass | Launch has a named local-Library loading state; cached screen data remains available during sync; unrelated settings/navigation are not disabled by routine refresh (PodListScreens.kt:56/131/193; AppModel.kt:289). Timing is RESP-01 N/O. |
| START-02 | pass | Getting started can Hide, persists its hidden flag and is reopened from Settings; server setup is optional (40/42; GettingStarted.kt:25; ScreenActions.kt:131). |
| START-03 | pass | Onboarding explains actual Views/Playlists/Add tasks; per-setting override and Clear on Played explanations sit beside the setting (16/24/42). |
| START-04 | pass | Manifest requests network and foreground-service capabilities, with no launch wall of dangerous runtime requests; OPML uses document pickers, not broad file access. |
| START-05 | N/A | No runtime permission prompt/purpose string in the in-scope implementation. |
| START-06 | pass | Start on this phone supplies a serverless route; no account/sign-in requirement (40–43; AppModel.kt:170). |
| START-07 | N/A | No account creation feature. |
| EDIT-02 | pass | Native Compose text fields and SelectionContainer retain standard editing/selection, with global undo handled after unconsumed field keys (MainActivity.kt:45; ShowNotes.kt; PodListScreens.kt:484). |
| EDIT-05 | pass | Show notes can be selected/copied; Episode share supplies a link as text; server address can be opened in a native editable field (PodListScreens.kt:449/484; ServerScreen.kt:24). |
| WIN-03 | N/O | One compact portrait profile plus font-scale variants; smaller phones, landscape and live resizing not observed. Tablet/foldable are out of scope. |
| TOOL-06 | pass | Collapsed player reopens through the mini player/artwork; no other user-hideable toolbar (PlayerPresentation.kt:123). |
| SIDE-03 | N/A | No simultaneous navigation pane in this phone target. |
| SIDE-04 | N/A | No adjacent-detail navigation pane in this phone target; destination/tab feedback covered by LIST-06. |
| SET-01 | pass | One app Settings location; Playlist and Subscription settings remain with their objects; OPML is in Settings as decided (06/16/24/32). |
| RESP-01 | N/O | No five timed passes, input-to-frame measurements or p75 timings. |
| FOOT-02 | N/O | No measured scrolling or hang observation on representative long lists. |

## Scores

Scores cover the supplied Light/Dark/200% evidence and inspected implementation. One score serves all appearances where no material category difference was established. Behavioral scores are partial in their unexercised runtime aspects; N/O itself incurs no cap or numerical penalty.

| Category | Score | Evidence / anchor | Principle |
|---|---:|---|---|
| Typography | **8.4** | Strong: one deliberate system scale, 17/24 title versus 12/18 metadata, full detail titles, and meaningful 200% reflow (02/03/04/33; MainActivity). Below Exemplary because long generated condition summaries repeatedly give nearly every clause the same 12 sp voice; “Published in the last 7 days · Played: Unplayed · Newest Published first” scans as prose rather than a crisp summary (01/02). | hierarchy, craft, accessibility |
| Hierarchy | **8.2** | Strong: content titles lead Episode rows, one blue Play now leads detail, and Now marks the current Entry (02/03/11). Plain roots and settings group related tasks. Full condition descriptions compete with View names, and the editor footer + player + navigation create three persistent bottom layers (04/font200). More deliberate prioritization would reach Exemplary. | content-first, hierarchy |
| Spacing & density | **8.1** | Strong: shared 16 dp leading edge, regular 8/12/16 dp relationships, 48 dp targets and reflow rather than shrinking type. At 200% the pinned editor bands leave only the upper condition rows visible; some of that footprint is inert count-strip padding (ViewEditor.kt). Now Playing’s bottom-arranged content leaves an oversized empty interval below the header in the no-Chapters state (08). These are craft opportunities, not failures of phone touch sizing. | craft, adaptability |
| Color & contrast | **8.8** | Near Exemplary: independent dark roles, restrained blue actions, textual status redundancy, system contrast interpolation. Measured token ratios below exceed the required text thresholds. Current-Entry, editor-footer and player tonal surfaces are rather close and do less grouping work than the type/spacing; the result is coherent but not quite a reference-quality hierarchy of surface roles (04/11/dark08). No measured contrast failure established. | color-restraint, accessibility |
| Iconography | **8.2** | Strong: one coherent familiar set; proper share/download/star/transport meanings and 48 dp labeled/tooltip-equipped buttons. Skip amounts are legible. Some domain commands still depend on long-press explanations (Entry actions, Played/Unplayed glyphs); the expanded player’s missing content identity is separately scored as AX-01, not mistaken for a visual-name requirement. | conventions, craft, discoverable-commands |
| Consistency & polish | **6.9** **(stability N/O; partial: no flow run)** | Competent ceiling despite a Strong visual main path: shared rows/sheets, selected states and scaled layouts are considered. F3 leaves a real asynchronous edge state undesigned; F5 leaves an empty-state gap. CTRL-08 caps this category at 6.9. No stability-band cap is invented without measured flows. | feedback, craft, stability |
| Clarity | **8.0** | Strong: Search names its scope, inheritance is explicit, Clear on Played explains consequences, and Rewind makes its scope inspectable (16/21/24/15). Long capitalized domain-heavy summaries need repeated reading; empty Select Subscriptions does not explain how to proceed (F5). The owner’s visual-name omission is preserved, with the Episode route credited. | plain-language, discoverable-commands |
| Platform fit | **6.9** **(partial: code + capture)** | Uncapped **7.8** from Looks 8.3 and Behaves 7.5, per formula below. Three proper destinations, Up only inside, Material sheets/menus, edge-to-edge APIs, system appearance and file/Share intents belong on Android. The fixed DLG-01 major caps the final score at 6.9. Predictive animation and full lifecycle/system integration are unverified. | conventions, user-control |
| Interaction & feedback | **4.9** **(partial: code + capture)** | Weak ceiling from **AX-01 blocker**: a screen-reader user cannot identify the current Episode in expanded Now Playing. Stronger evidence elsewhere includes multistep Undo/Redo, Trash, reorder alternatives, import stop/resume, recovery copy and no server/account gate. Those strengths do not erase the primary accessibility failure. KEY-08 is a minor discoverability gap. Response speed remains N/O. | accessibility, forgiveness, feedback |
| Overall | **6.8** **(partial: no measured flows)** | A visually Strong, recognizably Android phone client with substantial usable domain depth, but its primary listening surface drops nonvisual identity and a network mutation waits silently. Those keep it below Strong overall. Lowest category 4.9 means **Overall ≤ 6.9**; 6.8 respects that cap. This is a holistic result, not an average of visual scores. | content-first, accessibility, forgiveness |

**Contrast measurements:** calculated from explicit sRGB role values in MainActivity.kt, using WCAG relative luminance; values are foreground/background. Light: `#1b1b21/#faf8ff` **16.27:1**, secondary `#46464f/#faf8ff` **8.86:1**, primary text `#2b50c8/#faf8ff` **6.46:1**, white on primary **6.81:1**, Played tertiary `#76546f/#faf8ff` **6.10:1**. Dark: `#e4e1e9/#121318` **14.35:1**, secondary `#c7c5d0/#121318` **10.89:1**, primary `#b8c4ff/#121318` **10.93:1**, onPrimary `#002781/#b8c4ff` **7.70:1**, Played tertiary **10.88:1**. These are code-token measurements, not claims about arbitrary publisher artwork or every antialiased edge. Disabled controls are exempt. Decorative dividers/empty tracks are not incorrectly treated as required 3:1 actionable glyphs.

**Android Phone signals:**

| Signal | Verdict / evidence | Remaining limit |
|---|---|---|
| L1 Navigation | **Native (S/C)**: three equal destinations; titled inner screens with Up; creation/settings are actions, not destinations (01/10/20; PodListScreens). | No root Up or mixed action tab found. |
| L2 Visual language | **Native (S/C)**: consistent Material 3 surfaces, radio choices, menus, snackbars and transport vocabulary. No imported iOS metrics/symbols established. | Native toolkit alone earns no credit beyond the produced UI. |
| L3 Density/text/frame | **Adapted, partial (S/C)**: dp/sp APIs, 48 dp actions, 12 sp minimum text, explicit safe/IME insets and 200% reflow. | One phone profile; exact dp capture width, smaller widths and active IME geometry N/O. |
| B1 System navigation | **Adapted, partial (C)**: manifest enables predictive Back; destination navigator uses PopLatest; selection clears; expanded player uses PredictiveBackHandler; modal sheets dismiss first. | Gesture/button execution and predictive animation N/O; no claim that the mere visible Back glyph proves them. |
| B2 Preferences/access | **Foreign in one established respect (S/C)**: expanded Now Playing withholds its current content identity from accessibility (AX-01); most other labels/roles/selection are present. System appearance/contrast and font scaling are implemented, with no competing app language choice. | Live TalkBack order/announcements untested. Visual names remain intentionally absent. |
| B3 System surfaces/lifecycle | **Adapted, partial (C)**: Android chooser intent, document contracts, Media3 metadata/service, launcher shortcuts, saveable screen state and database browsing context. | Sharesheet/notification/lock-screen/Auto/Bluetooth/audio-focus behavior and actual process-death restoration N/O; no credit for a runtime session that was not run. |

**Platform formula:** `(8.3 + 2 × 7.5) / 3 = 7.766… → 7.8`, then DLG-01 cap → **6.9**. Behavior is assessed from implementation where available, with unknown runtime aspects expressly unverified. No missing tablet/foldable extras enter this score.

**What stands between this build and 9.0:** first restore expanded-player accessible identity, then complete the Unsubscribe busy state and empty selection path. The visual categories also need tighter condition-summary writing, less inert pinned-footer space at 200%, and content-aware artwork/spacing when Chapters are absent. In Download Rule sheets, ChoiceRows currently concatenates name + explanation into one Text treatment (SubscriptionSettingsScreen.kt:47); a separate supporting line would match the clearer consequence hierarchy demonstrated by BuzzKill while retaining PodList’s system. Full flow instrumentation would establish stability/speed rather than raise scores by assumption. **Even after all changeable failures are fixed, the retained DLG-01 cap of 6.9 limits a strict rubric Overall to 8.9.** The owner’s 9.0 goal and this accepted exception cannot both be satisfied numerically under the unchanged guide.

## Next step

**Target:** **AX-01 / expanded Now Playing**, the verified blocker closest to the core listening task. **Root cause:** ArtworkImage assumes every image is decorative; the expanded player removes textual identity but adds no equivalent semantics. The mini player already solves the same problem locally. No exact named anti-pattern fits better than this concrete root cause; it is not permission to add the owner-rejected visible titles.

**Change:** expose the current podcast and Episode as one semantic description on the expanded artwork/identity region, reusing the mini player’s localization and metadata fallback. Keep each transport button, Position, Speed, Sleep and navigation as separate accessible controls. Preserve the existing visible header and nameless artwork-led composition.

**Principle:** accessibility and recognition rather than recall. The nearest contrast is CLAR-06’s identity-in-context relationship; borrow the idea that the current object must be identifiable, not its Mac window-title presentation. Things would carry the object’s identity through a change of presentation instead of requiring a detour to recover it.

**Expected effect:** fix the blocker and remove Interaction & feedback’s 4.9 ceiling, improving the primary task and Overall without changing visual Typography/Hierarchy/Color. The risk is duplicated announcements or an over-merged semantics node; verify expansion, collapse, Entry advancement and all transport controls with TalkBack, including no-Chapters and missing-artwork states. This review made no app change.

**Subsequent craft candidates, after the blocker:** reserve an inline Unsubscribing status; shorten View summaries to task-scannable phrases while retaining complete editor/accessibility details; reduce the matching-count text’s 16 dp vertical padding toward 8 dp while preserving at least 48 dp action targets; replace the no-Chapters player’s fixed 340 dp artwork subtraction/bottom packing with content-aware spacing. Compare the same light/dark/font200 states and accept no loss of capability or owner-fixed character.

No iteration log applies: this is a grading-only pass. Baseline and final app are identical; all owner-fixed signatures are **kept**. Required unobserved validation is documented above rather than asserted complete.
