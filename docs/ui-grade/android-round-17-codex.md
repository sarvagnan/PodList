# PodList Android phone — independent UI audit, round 17 (Codex)

Commit: `6c39153`. Reviewed 11 November 2026. Working directory confirmed with `pwd`: `/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-d68dd5a6-deb3df0d6eb7c3ea`.

This is an independent grade. No earlier `docs/ui-grade/*.md` report or work list in `UI-GRADE.md` was read. No device was driven and no app code, tests or configuration were modified. The supplied screenshots, accessibility snapshots, flow evidence and current source were reviewed; no new app tests were run.

## Frame

- **Task:** Find Episodes with Views/Search, inspect podcasts before subscribing, add Episodes to Playlists and listen with recoverable edits.
- **Target:** Android **phone**, compact window; Kotlin/Compose/Material 3. Tablet and foldable are separate targets and excluded.
- **Posture:** Sovereign while browsing/managing listening, with a persistent background playback service.
- **Audience:** Perpetual intermediate, with an explicit newcomer path and optional server setup.
- **Nearest exemplar:** Things for quiet list hierarchy and recoverability; the Android gallery’s BuzzKill for explaining option consequences. They calibrate craft, not appearance. Google Calendar’s supplied Android image was inspected only for shared Android control/chrome grammar, not tablet-layout requirements. That 2024 gallery image is dated, so it is not presented as a current Google-phone comparison.
- **Character:** Owner-fixed blue `#2b50c8` and native Material 3 Light/Dark; owner-fixed Views/Playlists/Library destinations; filters separate from ordered listening; artwork-and-transport player with no visible show/Episode names; explicit, reversible editing and plain domain nouns.

**Owner decisions retained and graded:** one-field Add podcasts; one-list View editor; Rewind summary sheet; OPML in Settings; current Entry shown paused after relaunch; no visual Podcast/Episode names in either player; Delete Playlist immediately moves to Trash, exact named message and Undo; compact Podcast header with pull-down description, top-bar Subscribe, green subscribed check, two-tap Unsubscribe without dialog, Undo and stay-on-page; explicit Rename with wrapping name above Cancel/Save; case-insensitive unique Playlist/View names; shortcut reference only in Android’s own panel. These are not redesign targets. KEY-08’s literal in-app-reference requirement conflicts with the last decision and is recorded as a retained minor failure.

**Evidence shorthand:**

- **C17** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-17/`. README first; all **54 screenshots and 54 snapshots in each** of `light/`, `dark/`, `font200/` were inspected as screen/contact-sheet sets and semantic evidence. Numeric references such as `03` mean the matching numbered file in that directory; `34–35` means both named captures.
- **F17** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flow-run/20261111-014555-601/`. Its `summary.md`, `measurements.csv`, timing/frame methodology and selected screenshot pairs were checked. Row references below mean the CSV’s **`row` column**, not physical line numbers; each step has multiple element records.
- **K** = `apps/android/app/src/main/kotlin/app/podlist/`. Kotlin filenames below are under K unless a fuller path is given. Sources also include `AndroidManifest.xml`, `res/values/strings.xml`, domain/data persistence and numeric helpers, CONTEXT, both design documents and ADRs 0011–0013.

## Flows

The supplied run, not a newly executed run:

| Task | Recorded steps and representative evidence |
|---|---|
| A — Browse and collect | Views → View → Episode → Add to a Playlist → Play Last → Undo → next item. F17 A/29 and A/32 show submitted add and Undo. |
| B — Listen and reorder | Playlist → Play from here → Now Playing → collapse/pause → Entry menu Move down → Undo. F17 B/62 and B/69. The discrete move command was used; finger dragging was **not** tested. |
| C — Discover and subscribe | Library → Add podcasts → find fixed 500-Episode feed → Podcast page → Subscribe while typing in Search Episodes → completion → Undo → next query; long-list fling. F17 C/97→98 Light and C/276→277 Dark. |
| D — Name a Playlist | New Playlist → create → settings → explicit Rename → Save → Undo → next item. F17 D/142 and D/146. |
| E — Make a View | Library Search → type “rice” → settled results → Save as a View → name → Create View. F17 E/159 and E/167. |

**Conditions:** Pixel 10 Pro XL emulator profile / `sdk_gphone64_arm64`, Android 16 SDK 36, **1344 × 2992 px**, density **3.0**, **448 dp** portrait width. Light and Dark. Each appearance has one delayed stability pass (2000 ms per HTTP completion, plus held Subscribe completion during typing) and five undelayed timing passes. No CPU/network throttling. Font200 screenshots are a separate tour, **not a measured font200 flow run**. No smaller phone width or landscape run was supplied; medium/expanded tablet and foldable widths are excluded by the owner’s phone scope.

**Script:** `apps/android/app/src/androidTest/kotlin/app/podlist/FlowRunSmokeTest.kt`, `FlowRunReport.kt` and the classifier helpers. **Measurements/strips:** F17 `measurements.csv` (7138 element records across 338 captured steps), `timings.csv`, `frames.csv`, and numbered per-step PNGs. The report retains raw candidates and exclusions rather than counting every post-action difference as an unprompted shift.

**Failures:** No confirmed FLOW failure. This does **not** mean all FLOW checks pass.

- **FLOW-01 N/O:** six comparisons leave change onset unresolved. For example, the subscription slot’s left edge changes **273.00 → 281.33 dp** and width **111.00 → 102.67 dp** at C/89→92 Light; analogous C/268→271 Dark. In these rows the operation is pending and code changes presentation optimistically at dispatch, but screenshots do not prove whether the geometry changed within 500 ms. Do not call it a delayed-result failure or a verified pass. Undo comparisons C/104→107 and C/282→285 are likewise unresolved.
- **FLOW-02/03 pass for the tested paths:** C/97→98 and C/276→277 keep the input at **(16,249), 416 × 65 dp**, focus at **Search Episodes**, value **“Long E”**, and scroll at the person’s position as the held response completes. The completion is observed 2833 ms after typing in Light and 2584 ms in Dark. The before/after PNG pairs were visually checked.
- **FLOW-04 pass for recorded follow-ups:** in C/98 and C/277 the snackbar is **(16,453.33), 416 × 48 dp**, `follow_up_visible=true`, visibly above the IME. Screenshot inspection agrees with the recorded geometry. The harness assumes snackbars draw above chrome; that assumption is corroborated for the inspected pairs, not universal proof for every overlay/error combination.
- The harness leaves FLOW-05/06/07 unmeasured. The phone has no paired panels (05 N/A); screen/code inventory supplies 06/07 evidence. Neither is silently inherited from JUnit success.
- **RESP-01 and FOOT-02 N/O:** timed evidence is debug/emulator, not audience hardware. PixelCopy/OnDraw intervals, excluded bottom chrome, non-atomic semantics/PNG capture and unresolved frames prevent reliable 200 ms attribution for every step. A late busy *observation* does not prove a late indicator. The 21/21 late frame samples per appearance are diagnostic, not a valid release-device performance verdict.

**Stability sub-score: 8.8 Light / 8.8 Dark, for the observed portion.** The measured pending-input path, reserved progress seams, stable navigation and consistent feedback are Strong near the Exemplary anchor. No confirmed failure imposes a cap. FLOW-01 and untested widths/error paths remain explicitly N/O; this number does not certify their stability. The observed feedback can cover Episode rows while the keyboard is present, a tradeoff visible in C/97–98; it stays clear of the field and preserves input. A complete every-step stability claim is not supported.

## Cross-screen inventory

Forms/positions below come from screenshots, flow strips and code. **G** = shared inverse-surface snackbar, above player/navigation or IME, past-tense action naming its object, light text in Light / dark text in Dark, Undo using inversePrimary. **E** = inline field/row error in semantic error color, practical correction/retry. **U** = G Undo plus reserved top-bar Undo when the snackbar is absent; Ctrl+Z, with Redo in resulting snackbar/Ctrl+Shift+Z. **None** means this screen has no such surface, not missing evidence.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | G after edits elsewhere; no notification for opening | Sync status under app bar, neutral text + Try again | None | U | Leading message + tonal Create View/Edit this View/Add podcasts | None | Root top-trailing +; View row Add then Play | Conditions/count above list; first-run card on root |
| New / Edit View | Live values/count; G “Updated/Created View…” | E at number/name or range condition | Condition modal, Done bottom-trailing | U; sheet-local snackbar above commit | Zero matching count and explanatory result state | None | Trailing pinned Done/Create View footer | Live-application helper below condition heading |
| Rename View / Playlist | G “Renamed … to …” | E under full-width Name field | Explicit Name, Cancel/Save below | U | Empty Name validation, not an empty page | None | Save below field, trailing | Name label and validation explain refusal |
| Library | G subscription/rule feedback | Sync strip below app bar | None | U | Leading no-Subscriptions text + Add podcasts | None | Top-trailing +; Subscription rows open page | Rule overline, name and one consequence sentence |
| Add podcasts | G “Subscribed to …”; result becomes check | E below query or affected result | None | U | Inline no-result recovery under field | None | Find podcasts below field, trailing; Subscribe at result trailing/below at 200% | Single persistent field label |
| Podcast page | G “Subscribed to/Unsubscribed from …”; check/state in top bar | E header for page/Subscription failure; E affected Episode for acquisition; offscreen retry in G | Armed Unsubscribe in same top-bar slot; timeout respects accessibility recommendation | U | Leading no-Episodes/no-matches + Refresh/Clear | None | Subscribe/subscribed control top-trailing; Episode Add then Play | Visible Show podcast details as alternative to pull-down |
| Episode detail | G “Marked [title] …”; download state inline | E download/acquisition; retry | Add sheet when requested | U | Explicit not-in-a-Playlist text; omit absent notes/Chapters headings | None | Filled Play Now, then labeled action grid | Show notes and per-Playlist Position |
| Playlists / Entries | G “Moved … in …”, “Removed Entry…” | Sync strip below bar | Add target sheet when requested | U | Leading no-Entries + Find Episodes; no current Entry label | None | Root top-trailing +; row Play from here | Active/Clear on Played summary, Current Entry marker |
| Playlist settings | Live Clear on Played; G Rename/Delete message | E Name | None for Delete (owner decision) | U | Default limitation text | None | Rename then explicit Save; error-outlined Delete | Clear-on-Played consequence, Trash retention explanation |
| Trash | G “Restored Playlist…” including changed name | Sync strip | None | U | Leading no-deleted-Playlists + Back to Playlists | None | Restore on each row | Restoration period and provenance stated |
| History | None | Sync strip | None | U | No History + Show Entries | None | Open recorded Episode | Explanation distinguishes listening from manual Played |
| Timeline / Rewind | G “Rewound Playlist…” after applying | Sync strip | Summary sheet names target, Position, affected/kept sets | U after Rewind | No listening + Show Entries | None | Row Rewind; sheet bottom-trailing Rewind + Cancel | Timeline hint; summary explains kept edits/time |
| Add to a Playlist | G after sheet closes | E New Playlist name | Target radio rows; New Playlist field | Sheet-local U while open; G when closed | Existing Default always available | None | Play Next / Play Last bottom-trailing | Active target explicitly labeled |
| Subscription settings / Download Rule | Live selected values and Changed annotation | E numeric maximum | Choice sheet, Done below | U; sheet-local feedback | None | None | Value rows; bottom Done in sheet | Explicit inherited Default value and rule consequences |
| Settings / OPML | Live values; import result inline at operation, export completion G | E by OPML operation + retry | Native document picker / settings choice sheet | U; local sheet feedback | No special empty page | Notification rationale only when downloading | Settings rows; sheet Done bottom-trailing | Group/inheritance helpers; partial-import counts/failures |
| Listening stats | None | Sync strip | None | U for prior edit | Leading no-listening + Find something to play | None | Show table/chart at content-leading; day buttons adjacent to readout | About your stats below data |
| Mini player / Now Playing | Transport, seek, speed/sleep state directly reflects action | G playback error; transport becomes Retry | Speed/Sleep sheets | U for edits; transport not treated as an edit | Absent without current Entry | None | Center Play/Pause; Episode/Chapters/Entries grid below | Accessible identity; time labels; skip numerals |
| Welcome / Connect / Getting started | Transition to local Library; checklist completion state | E under server address | Optional server connection; Start on this phone | None for setup navigation | Ready starter Views/local Library | Contextual notification rationale later | Welcome stacked full-width choices; Connect trailing below field | Optional-server explanation; skippable checklist |

**Inventory mismatches:** No confirmed arbitrary mismatch among equivalent states. Live settings choices use immediate value feedback, while completed edits use G; an OPML partial-import summary stays with its detailed failures and retry, rather than being treated as a single disposable success toast. Sheet-local feedback deliberately follows the originating modal and global messages wait for it to close (`SheetFeedback.kt`). Single-field commits below fields and pinned multi-condition View commits are different task layouts, not FLOW-07 violations. These distinctions should be preserved when improving craft.

## Checklist

Coverage: **82.2%** (pass **59** · fail **1** · N/O **13** · N/A **6**). Formula: (59+1) / (59+1+13). All **79** current core IDs have exactly one verdict. Android Phone signals below are a separate platform-fit inventory, not extra checklist denominator entries. Mac-only/web-only checklists and Android tablet/foldable signals are N/A → target and excluded from these counts.

**Failures by severity**

1. **[KEY-08] minor — owner-retained rubric conflict.** **Where:** Settings/Help and app-wide shortcut discovery. **Evidence:** `K/MainActivity.kt:75–81` registers Undo and Redo in Android’s own Keyboard Shortcuts panel; SettingsScreen and GettingStarted contain no in-app shortcut reference, as explicitly required by the owner. **Literal checklist remedy:** add an accessible in-app shortcut reference. **Disposition:** that remedy is prohibited by the owner’s fixed decision, so do not implement it or select it as the next step. Keep the native Meta+/ panel registration and retain this minor failure in the grade. Minor severity imposes no rubric cap.

No other confirmed checklist failure. This is a statement about verified items, not the unobserved behavior.

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | **N/O** | Six unresolved action-onset comparisons in F17 summary; ±8.33 dp subscription-slot changes cannot be classified from snapshot age. No confirmed failure. |
| FLOW-02 | **pass** | F17 settled comparisons; C/97→98 and C/276→277 retain Search Episodes focus and scroll through delayed Subscribe. |
| FLOW-03 | **pass** | F17 C/97→98 and C/276→277 retain “Long E” typed while Subscribe is pending; FormDraftState.clearIfUnchanged and search-version cancellation protect later edits. |
| FLOW-04 | **pass** | F17 follow_up_visible rows and inspected C/97→98, C/276→277 PNG pairs: Undo above IME, fully in view; C17/font200/15 and 63 show reachable sheet commits and Undo. Verdict covers recorded follow-ups, not unseen error flows. |
| FLOW-05 | **N/A** | No peer side-by-side panels in the phone target. |
| FLOW-06 | **pass** | C17/20, 30, 42, 43 and Directory/EmptyState: omit empty Download Rule groups; explicit no-listening/no-subscriptions messages. No vanishing help block in the measured typing path. |
| FLOW-07 | **pass** | Root creation consistently top-trailing; New/Edit View commits share the trailing pinned footer; single-field create/rename commits consistently follow the field. Different task types are not falsely equated. C17/01,10,20; 04,05; 04c,16b,19,41b. |
| KEY-01 | **N/O** | Standard focusable Compose controls and Ctrl+A selection are implemented, but no complete keyboard-only traversal demonstrates every task, popup and selection path. |
| KEY-04 | **N/O** | FocusedInputModifier/RenameableName explicitly focus fields and return focus; full Tab/Shift-Tab order and visible keyboard focus are not captured. |
| KEY-06 | **pass** | MainActivity uses Android KEYCODE_Z with Ctrl/Shift, and sheet handlers use Key.Z; no punctuation-based or bare-letter custom accelerators. |
| KEY-07 | **N/O** | No Page Up/Down, Home/End, Space/Shift-Space run; native LazyColumn use alone does not settle the whole key contract. |
| KEY-08 | **fail** | Minor; owner-retained: no in-app reference. MainActivity:75 registers Undo/Redo only in Android’s Keyboard Shortcuts panel; Settings/Getting started have no shortcut list. See failure below. |
| DLG-01 | **pass** | Routine deletes, subscription changes and settings use Undo/in-context feedback; alert reserved for contextual notification permission. Date picker is a task dialog. |
| DLG-02 | **pass** | IncomingContent:39 permission alert “Show download progress?” gives a specific reason; no generic error alert titles. |
| DLG-03 | **pass** | Permission Continue/Not now, DatePicker Done/Cancel, Rewind/Cancel use concise outcomes; Not now appropriately defers optional Android permission. |
| DLG-04 | **N/O** | Safe Cancel/Not now and onDismissRequest paths are coded; Esc behavior with a hardware keyboard has not been observed. |
| DLG-05 | **pass** | Delete Playlist/View have error-colored outlined controls and recovery; no destructive default dialog action. C17/04b,16c; PlaylistSettingsScreen/ViewEditor. |
| DLG-07 | **pass** | Editor sheets have Done plus Android Back/dismiss; Rewind has Cancel/Rewind. No sheet combines Cancel, Done and an onscreen Back. C17/06b,06c,09,15. |
| DLG-09 | **pass** | EntryMenu, EpisodeOverflow and Podcast overflow use DropdownMenu inside the triggering Box. Draft-backed sheet fields survive dismissal; no nested contextual popup stack. |
| CTRL-02 | **N/A** | No parent/child checkbox hierarchy; flat batch selection and independent switches retain their respective semantics. |
| CTRL-03 | **pass** | OutlinedTextField label slots identify Name, server address, podcast query, Episode search and number fields after typing. C17/04c,16b,21,26,41b,61; EditorComponents. |
| CTRL-04 | **pass** | Names validates empty/duplicate names; NumberInput uses locale NumberFormat with complete parsing and range checks. InlineError explains field-specific corrections; fields fill appropriate phone content width. |
| CTRL-05 | **pass** | Material buttons/clickable ripple provide pressed states; commit emphasis is filled vs tonal/outlined/text. Large transport dimensions have a listening-specific role, rather than enlarging every primary button. |
| CTRL-06 | **pass** | Play, Add, Subscribe, creation and editing remain outside overflow; menus collect secondary Download/Share and Entry operations. C17/02,03,12,59,60. |
| CTRL-07 | **pass** | Search the Library, Add podcasts’ Podcast name or feed address, and Podcast Search Episodes state their scope; there is no displayed search-history feature. |
| CTRL-08 | **pass** | AndroidDownloads and OpmlActions provide byte/feed determinate progress when totals exist, indeterminate otherwise, cancellation/stop/resume/retry. Add search is superseded/canceled by a new query. OPML runtime remains unobserved. |
| LIST-01 | **pass** | Episode feeds appropriately remain lists under Android clause; ListeningStatsScreen supplies aligned Day/Time listened columns in table mode, stacking at large text. |
| LIST-02 | **pass** | Views, Playlists, Subscriptions and contextual detail headings name single-column content; stats table headers are short noun phrases. |
| LIST-03 | **pass** | View editor Sort sheet provides newest/oldest and shortest/longest directions; Android lists need no column headers. ViewEditor:7 choice branch. |
| LIST-04 | **N/A** | No dense multicolumn object list with narrowing name columns; the simple stats date/time table is not that feature. |
| LIST-05 | **pass** | Podcast detail disclosure toggles one description; PodcastBrowsing.expanded persists in BrowsingContext/SQLite. No hierarchical outline requiring descendant expansion. |
| LIST-06 | **pass** | Bottom destinations, Playlist tabs, radio choices and checkboxes expose selection/check state. C17/06b,09,11,20,27,50 and corresponding snapshots. |
| LIST-07 | **N/O** | Touch opening/selection exists and default Compose controls are focusable; keyboard focus acquisition and arrow movement across rows were not exercised. |
| DATA-01 | **pass** | FormDraftState + DraftWriteBuffer persist raw drafts, flush on disposal/onStop, and clear only an unchanged submitted snapshot. Rename drafts stay open until Save/Cancel; C17/41b demonstrates Back retention. This is code-backed preservation, not a process-death test result. |
| DATA-04 | **pass** | HistoryActions/EditHistory record inverse changes and multiple steps, group typing, preserve failed reversal for retry; Ctrl+Z/Ctrl+Shift+Z dispatch. F17 A/29→32, B/62→69, D/142→146 verify several representative Undo paths. |
| DATA-05 | **pass** | revealChanges restores appropriate route and Entry; EntryList scrolls to and highlights it; SettingsFeedback scrolls to restored setting. F17 B/69 and D/146; ScreenActions/EntryDragging. |
| DATA-06 | **pass** | BrowsingStore serializes validated stacks, per-route selection, scroll anchors, Playlist tabs, Podcast search/disclosure and stats state; Playback restore keeps Cursor/Position paused. C17 settings/stats return positions corroborate part. Rotation/process recreation remains unexercised. |
| DRAG-01 | **pass** | EntryDragHandle implements direct reorder; EntryMenu Move up/down and custom accessibility actions provide equivalents. C17/12; EntryDragging. |
| DRAG-03 | **pass** | Drag end calls moveEntry, which records Change.MoveEntry and inverse history. F17 verifies the same move primitive through its command equivalent; actual finger drag is unobserved. |
| DRAG-05 | **pass** | EntryDragging visibly translates/elevates source, draws insertion lines, clears drag on cancel/end and retains destination highlight. These states are established in code; their live animation quality is not claimed. |
| DRAG-06 | **pass** | EntryDragging autoscrolls within 64 dp of edges, pins the source and retains/reveals the moved Entry. Reorder is local; no slow network drop requiring a placeholder. |
| PTR-03 | **N/O** | No mouse/stylus session; no custom system pointer interception found, but pointer shape and gesture behavior remain unverified. |
| PTR-04 | **pass** | ActionIcon/ActionTooltip supply action-specific Material tooltips for icon buttons including mini-player transport and subscribed control. Full text fields remain editable/scrollable. |
| APPEAR-03 | **pass** | Light/Dark/System roles are explicit; UiModeManager contrast listener strengthens primary, outline and secondary text. No translucent-only functional boundary. Code-backed contrast preference support; no captured high-contrast session. |
| APPEAR-04 | **pass** | Measured role contrast: white/blue 6.81:1; secondary text 8.86:1 Light, 10.89:1 Dark; selected secondary text ≥5.46:1; subscribed glyph 6.57:1 Light, 7.82:1 Dark. Functional field outlines ≥4.25:1. See measurement note. |
| APPEAR-05 | **N/O** | Compose animations and gesture-driven predictive Back are used, but no reduced-animation setting run establishes all relevant transitions. |
| APPEAR-09 | **pass** | Consistent vector family for Play, Skip, Add, Search, Settings, Star, Chapters, Entries and Back; skip numerals clarify direction/duration. C17/02,03,08,50; drawable resources. |
| APPEAR-10 | **pass** | Filled primary commits, outlined secondary/destructive actions, subdued list separators, selected-row container and stable player surface distinguish controls without card/border overload. |
| APPEAR-11 | **N/O** | Inspected flow PNGs are coherent and launch window colors match theme; sequential settled screenshots cannot establish all intermediate frames or absence of flashes. Core changes stay with FLOW-01. |
| TYPE-02 | **pass** | MainActivity:144 gives one system family with Regular/Medium/SemiBold roles; no thin body weights or competing brand fonts. |
| TYPE-03 | **pass** | 14/21 sp metadata, 16/24 body and 12/18 annotations scale with Android font preference. Fixed-scale initials/skip numerals function as decorative artwork/icon lettering, with full accessible equivalents. |
| TYPE-05 | **pass** | All 54 font200 states reviewed: two-column action grids, separate app-bar actions, wrapping metadata, scrollable tabs/sheets, stacked stats tiles and pinned commits retain essential content. |
| TYPE-06 | **pass** | Default About your stats text is approximately 50–70 characters on typical full lines; bodyMedium 14/21 = 150% leading, bodyLarge 16/24 = 150%; paragraphs use blank-line spacing without first-line indent. C17/light/34–35 and MainActivity/ListeningStatsScreen. |
| TYPE-07 | **pass** | No paragraph-length all-caps or bold-plus-italic UI emphasis; OPML is an acronym, initials are artwork; underline is reserved for show-note links. |
| TYPE-08 | **pass** | App-owned strings use curly apostrophes/quotes, proper ellipsis, range en dash and minus sign. Literal URLs and publisher content are exempt. res/values/strings.xml. |
| COPY-01 | **pass** | Specific verbs and consistent domain nouns: Create View, Rename, Play Next/Last, Mark Played, Download Rule. No Mac click/window vocabulary in phone instructions. |
| COPY-02 | **pass** | Server, lookup, duplicate/range, subscription, download and OPML errors explain recovery beside the field/row/operation; offscreen Episode failure also offers a named retry/reveal snackbar. Source strings and respective screens. |
| COPY-03 | **pass** | Empty Library, stats, Playlist, History and Trash explain the state and offer relevant next steps. C17/13,18,30,43; EmptyState call sites. |
| COPY-04 | **pass** | Sentence-case actions and explanatory text consistently retain capitalized domain names. Tooltips use action fragments; Search/Episode/View capitalization follows CONTEXT.md. |
| AX-01 | **pass** | Static semantics: labeled icon controls, checked/selected roles, seek value/state, Current Entry, named mini-player artwork, and polite error/subscription announcements. C17 snapshots 06b,08,11,27,28,50,63 plus code. Live TalkBack traversal is not claimed. |
| AX-02 | **pass** | Selection adds checkboxes and counts; subscription uses check symbol/announced state; errors use text; Playback has Current Entry label and leading bar; chart date/value and table supplement bar color. |
| AX-04 | **N/O** | Move menu/custom actions, details button, chart day buttons and table provide simple alternatives. End-to-end Voice Access/Switch Access and complete assistive-input use are not settled by static semantics. |
| AX-05 | **pass** | Play/Pause, buffering, failures, seek/time and sleep state have visible/textual equivalents; app audio playback has transport controls. Publisher transcript availability is outside this UI-feedback check. |
| START-01 | **pass** | AppModel initializes local session independently of server sync; Loading provides named progress; offline status retains local content and retry. Welcome and Standalone captures 40–43 are usable. Launch latency remains N/O under RESP-01. |
| START-02 | **pass** | GettingStarted hides persistently, records completed steps and can be reopened from Settings; server setup is optional via Start on this phone. C17/40,42; GettingStarted/AppModel. |
| START-03 | **pass** | Getting started teaches the three core tasks; condition editing explains live application; Download Rules explain consequences; Hide and sheet dismissal remain available. |
| START-04 | **pass** | Notification rationale is requested from AndroidDownloads.download, not Welcome/launch; decline preserves downloading. No launch permission wall. IncomingContent/AppModel. |
| START-05 | **pass** | “Allow notifications to see download progress and stop a download.” explains the feature; Continue invokes Android permission, Not now safely declines. IncomingContent:39 and strings. |
| START-06 | **pass** | Standalone Device needs no account/server; optional connection is deferred and scoped to a server address. C17/40–43; AppModel. |
| START-07 | **N/A** | No account-creation feature. |
| EDIT-02 | **pass** | Native Compose text fields retain selection/editing; list Ctrl+A acts only after fields have handled it; field history handlers prevent app Undo leakage. No Delete code writes clipboard. |
| EDIT-05 | **pass** | Podcast overflow explicitly copies feed address; ShareLinks gives useful Episode/Podcast URLs; show notes are in SelectionContainer and preserve URL link annotations. Sharing uses Android ACTION_SEND chooser. |
| WIN-03 | **N/O** | 448 dp portrait at 100%/200% is covered; smaller supported phone widths and landscape/window resizing are unobserved. Tablet/foldable additions are outside this audit, not failures. |
| TOOL-06 | **pass** | Collapsed Now Playing reopens from mini-player; contextual chrome returns on clearing selection/leaving editor. C17/01,08,50; PlayerContainer/ContextualChrome. |
| SIDE-03 | **N/A** | No hidden sidebar or supporting pane in this phone target. |
| SIDE-04 | **N/A** | No adjacent navigation-pane/detail pairing in this phone target. |
| SET-01 | **pass** | Global Playback/Appearance/OPML/Device options live in Settings; Playlist behavior and Subscription overrides stay with those objects; temporary Episode speed stays in player. C17/06–07,16,24–25. |
| RESP-01 | **N/O** | F17 has five undelayed passes per appearance, but debug/emulator is not audience hardware and 39/100 step groups have unresolved frame intervals; busy observation upper bounds cannot prove deadline misses. |
| FOOT-02 | **N/O** | F17 reports 21/21 late rendered frames per appearance, zero listener samples dropped, on debug/emulator. This does not settle representative physical-device scrolling; do not turn it into a release-performance failure. |

**N/O:** FLOW-01, KEY-01, KEY-04, KEY-07, DLG-04, LIST-07, PTR-03, APPEAR-05, APPEAR-11, AX-04, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, CTRL-02, LIST-04, START-07, SIDE-03, SIDE-04. No failed-parent dependents.

**Android Phone platform-fit signals**

| Signal | Verdict | Evidence and limits |
|---|---|---|
| L1 Navigation | Native | Three equal bottom destinations; no Up at root; contextual inner titles/Up and separate actions. C17/01,10,20,02,11,60. |
| L2 Visual language | Native | Deliberate Material 3 roles, coherent Android vectors and system font; fixed blue is a legitimate brand choice. No imported iOS control/symbol idiom established. |
| L3 Density, text, system frame | Native for observed window | dp/sp, 48 dp icon/choice targets, ≥12 sp type; edge-to-edge with safe/IME insets; 200% layouts wrap/reflow. The 48 dp target is the control/hit region, not the visible glyph. Other phone widths N/O. |
| B1 System navigation | Native implementation; runtime partial | NavigableListDetailPaneScaffold handles stack/predictive Back; PlayerContainer PredictiveBackHandler unwinds player pages/collapses; modal Back dismisses first; Back does not pause. Actual predictive animation and canceled gesture unexercised. |
| B2 Preferences/access | Native implementation; runtime partial | Light/Dark/System choices, Android contrast listener, resource strings/system locale formatting, semantic control states and enlarged text. TalkBack/Voice Access/Switch Access sessions unobserved. English-only resources do not constitute an app language overriding the system. |
| B3 System surfaces/lifecycle | Native implementation; runtime partial | ACTION_SEND chooser, file contracts, media service/channels, contextual notification request, persisted drafts/browsing and static launcher shortcuts. Sharesheet result, notification/lock-screen/Auto/Bluetooth/audio-focus behavior and process-death recovery unexercised. |

**Side-by-side result:** No confirmed Foreign phone signal. The supplied Google Calendar comparison supports shared Material/Android vocabulary only; its tablet sizing and dated appearance carry no phone requirements. Looks **8.7**, Behaves **8.9**, combined **(8.7 + 2×8.9)/3 = 8.8**. Code supports a behavioral score beyond a screenshot-only grade, with the runtime limits above. No checklist cap applies to Platform fit.

**Measurement note:** Ratios are calculated from actual `MainActivity.kt:100–140` color values using sRGB relative luminance, not guessed from scaled contact sheets. Primary Light `#2b50c8` against white is **6.81:1**. Secondary text Light `#46464f` / surface `#faf8ff` **8.86:1**; Dark `#c7c5d0` / `#121318` **10.89:1**; the same secondary text on selected containers **7.24:1 Light / 5.46:1 Dark**. Subscribed glyph **6.57:1 / 7.82:1**. Error text **6.13:1 / 10.93:1**. Field outline `#777680` / Light surface **4.25:1**, Dark `#918f9a` / surface **5.83:1**. High-contrast interpolation strengthens these relevant foreground roles. Faint ordinary separators and chart baseline are redundant decoration rather than the sole boundary of an actionable control; disabled controls are exempt. This is sampled role coverage, not a claim to have measured every publisher-artwork pixel.

## Scores

Scores cover Light and Dark together unless stated; neither showed a material quality difference. 200% text informs the typography/spacing scores. N/O items cause no automatic numerical deduction or cap. Scores name the observed craft that is still short of Exemplary, rather than manufacturing failures from absent evidence.

| Category | Score | Evidence / anchor | Principle |
|---|---:|---|---|
| Typography | **8.7** | Strong near Exemplary: one deliberate system scale, 17/24 row titles, 14/21 metadata and 16/24 body; enlarged text remains legible. However `ShowNotes.kt:11` converts publisher HTML to plain text plus URL annotations, dropping heading/list/emphasis spans. Long-note hierarchy has not received the same typographic care as the app’s controls. The short fixture notes do not show the full consequence. | hierarchy, craft, accessibility |
| Hierarchy | **8.4** | Strong: quiet root lists, one filled Play Now/Subscribe and clear selected Entry. Now Playing’s artwork can occupy a **400 × 400 dp** square (`PlayerPresentation.kt:230`), versus **112 × 88 dp** center transport; C17/08 in both themes makes artwork the strongest shape. This is less convincingly control-led than the intended listening posture. Library’s rule overline/title/helper also form three policy tiers before the podcasts. | content-first, hierarchy |
| Spacing & density | **8.5** | Strong: shared 16 dp content gutter, 4/8/12/16 rhythm, 48 dp targets, compact Entry padding and useful 200% reflow. Library’s policy preamble is relatively tall at font200, while Now Playing gives up to 160,000 dp² to imagery. These allocations are safe and consistent, but less precisely tuned to repeated finding/listening than an Exemplary layout. Sparse fixture lists themselves are not penalized. | hierarchy, craft, conventions |
| Color & contrast | **9.1** | Exemplary for verified roles: restrained blue emphasis, independently toned Dark, clear destructive/error color, meaningful subscribed green plus a check, selected rows plus checkboxes. Measured text/control roles exceed thresholds and Android contrast is wired in. Faint separators avoid unnecessary boxing. No confirmed color failure. | color-restraint, accessibility |
| Iconography | **8.8** | Strong near Exemplary: coherent vector weight, conventional Play/Pause/Star/Search/Settings and useful skip numerals; labels/tooltips/semantics are present. Small list-plus motifs for Add and Playlist access are close relatives visually; the labeled Episode grid reads more immediately than these small row/mini-player symbols. Keep the family, improve optical differentiation where needed. | conventions, craft, plain-language |
| Consistency & polish | **8.8 (stability 8.8 Light / 8.8 Dark)** | Strong near Exemplary: shared error/empty/commit components, reserved loading seams, deliberate modal-local feedback and no confirmed inventory mismatch. Captured details are finished in both themes and at 200%; state retention supports continuity. Artwork/transport balance and publisher-note formatting remain less resolved than the editor/settings system. No stability band cap; unverified transitions remain N/O. | stability, craft, conventions |
| Clarity | **8.7** | Strong: clear newcomer choices, explicit Rename, named Undo, inherited setting values and specific recovery copy. Library spends three text levels explaining Download Rules before showing the shows; stats needs a long About section to explain several related listening counts. Those distinctions are accurate but take more reading than an Exemplary scan-first presentation. Fixed domain vocabulary and the owner’s nameless player remain intact. | plain-language, discoverable-commands, feedback |
| Platform fit | **8.8** | Strong: Looks 8.7, Behaves 8.9 → **8.8** by the required weighted formula. Native phone navigation, insets, text scaling, state persistence and system integrations are implemented; no Foreign signal established. The control-first content hierarchy is the remaining visual craft issue, not Material conformity. Runtime-unobserved signal clauses are listed above. | conventions, stability |
| Interaction & feedback | **8.8** | Strong near Exemplary on verified paths: multi-step Undo/Redo, protected drafts, explicit save/validation, discreet reorder equivalents, retained offline data, contextual permission, useful retry and stable pending input. KEY-08’s retained minor conflict is real but uncapped; hardware keyboard/assistive traversal and real-device latency remain N/O, not failed. Rich show-note reading/link structure is less considered than mutation/recovery. | forgiveness, feedback, user-control, keyboard-efficiency |
| **Overall** | **8.7** | **Strong, below the owner’s 9.0 target.** Finding and listening are clearly served by an Android-native, forgiving UI. The largest observed weakness is how the listening screen allocates visual priority to artwork relative to transport, followed by flattened publisher notes and policy-heavy supporting copy. Lowest category 8.4 gives an Overall ceiling of 10.0 after the +2 rule, so **8.7 respects the cap**. This is a holistic judgment, not a category average or an extrapolation over N/O behavior. | content-first, craft, character |

## Next step

**Target:** Hierarchy in Now Playing, the lowest-scoring category and directly on the primary listening task. There is no confirmed blocker/major to address first; skip owner-retained KEY-08.

**Anti-pattern:** No exact named cross-platform anti-pattern fits. The root cause is a large maximum artwork allocation inside a screen intended to put playback controls first, not the lack of visible Episode/Podcast names.

**Nearest contrast and exemplar judgment:** `examples/contrasts.md` **HIER-02, “The common edit gets the visible space”**, is the closest transferable pair: Things gives the frequent task the strongest spatial priority while keeping supporting information accessible. Applied to PodList’s explicitly control-led player, that means preserving artwork identity while giving transport the tighter, clearer focal group. This borrows a hierarchy relationship, not Things’ appearance or Mac control metrics. Principle tension 15 keeps the artwork-led identity, blue accent and nameless-player decision intact.

**Root cause:** `PlayerLayout` allows a 400 dp square before balancing the image against a fixed 112 × 88 dp transport, so C17/08 reads as an artwork poster with controls below. The artwork treatment identifies the item as requested, but currently wins the squint test over the listening action.

**Candidate changes — proposals only, no app changes made:**

1. **Smallest candidate:** reduce maximum artwork from **400 to 320 dp**, keep its aspect ratio, and position the transport cluster **16–24 dp below** the image rather than distributing spare vertical space between them. Keep the primary Play/Pause 112 × 88 dp, all 48 dp targets and the scroll fallback. At the same 448 dp phone width, maximum image area falls **36%**. Principle: content-first/hierarchy. Expected Hierarchy/Spacing improvement; risk is weaker artwork identification, so compare the same real artwork and keep accessible identity unchanged. The blue/native Material, nameless player and navigation survive.
2. **Alternative within the same target:** keep up to 400 dp artwork only when there are no Chapter or playback-status blocks competing for space; otherwise cap at 320 dp and keep seek/transport/action-grid gaps on the same 16 dp rhythm. Principle: task-tuned density. Risk: layout variation during Chapter/status changes; any unprompted movement would require flow measurement and could invalidate this candidate. Candidate 1 is preferable for predictable geometry.

**Top remaining craft gaps:**

- **Publisher-note hierarchy (Typography 8.7):** preserve heading, emphasis, bullet/numbered-list and paragraph structure while continuing to use the app’s type scale, 150% reading leading and semantic link styles. `ShowNotes.kt` currently copies only URL spans. Add a representative long-note fixture for visual comparison; the existing short note cannot validate this improvement.
- **Policy-heavy Library introduction (Hierarchy/Spacing/Clarity):** preserve Download Rule grouping and its exact domain names, but test a tighter relationship between the quiet overline/title and supporting sentence, or reveal longer policy explanation from the group. Keep the 16 dp leading edge and 48 dp targets; do not remove the explanation merely to look cleaner. C17/font200/20 is the useful stress state.
- **Dense stats explanation (Clarity):** move the explanations of Time listened versus Episodes finished closer to those headings, retaining the permanent-log/Rewind distinction and detailed About text for reference. This is information hierarchy work, not a request to alter accounting semantics.
- **Small Add/Playlist glyph differentiation (Iconography):** compare the row Add and mini-player Playlist symbols at actual size, retaining one family and their full labels/tooltips. Change only if a clearer standard variant improves first-glance recognition without a new icon idiom.

**Evidence work before claiming complete 9.0-level behavior:** resolve subscription-slot onset in FLOW-01; capture a smaller supported phone/landscape window; exercise hardware keyboard and live TalkBack/Switch Access; verify rotation/process restoration; time release playback/browsing on representative physical hardware. Exercise error and OPML flows, media/system surfaces and real publisher feeds. These are coverage gaps, not newly asserted UI failures. The supplied run is appropriately candid about them and should not be promoted to full stability/performance certification.

**Review-only disposition:** No implementation iteration or before/after acceptance occurred, so no iteration Log is applicable. Baseline is the supplied C17 build. All owner-fixed signature elements are **kept**; no character change is proposed. Only this report and its required scratch copy were written in the repository/report destinations. Beads context was read; its local database was unavailable (`openat LOCK: operation not permitted`), and no issue state, commits or remote sync were changed.
