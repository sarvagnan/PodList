# PodList Android phone — independent UI grade, round 14

Reviewed 10 November 2026 at commit `23af8c220cccd7fb4d220ff3ab856e4ddd9bfec9`. No earlier PodList grades or UI-GRADE.md work lists were read. This is an audit, not an implementation iteration. No app, test or configuration changes, device operation, test execution or commit were performed.

## Frame

- **Task:** Find Episodes through Views, Search and Podcast pages, arrange them in Playlists, and listen while retaining independent Playlist Positions and a reliable recovery path.
- **Target:** Android **phone**, compact window; tablet and foldable targets are excluded. The supplied phone is 448 dp wide, not evidence for every smaller phone or landscape configuration.
- **Posture:** Sovereign browsing and queue management, with background playback and transient editing sheets.
- **Audience:** Perpetual intermediate, with first-run support for newcomers and optional attached-keyboard use.
- **Nearest exemplar:** Things for calm personal lists, precise language and reversible edits, adapted to Android conventions. Android comparison references are the guide’s Niagara home list and BuzzKill action chooser and their Sol grades. Niagara supplies leading-edge alignment and restrained emphasis; BuzzKill supplies explanations immediately beneath choices. Neither supplies evidence about PodList’s behavior. Google Calendar’s gallery image was also inspected for Material grouping and separation of content from chrome; its tablet layout is not a phone requirement. A current Google phone Settings image could not be retrieved, so that specific side-by-side comparison remains unavailable.
- **Character:** Owner-fixed native Material 3, PodList blue `#2b50c8` and independently toned dark surfaces; owner-fixed Views / Playlists / Library bottom navigation; Episode-finding separated from Playlist listening; artwork-led, control-first player; plain domain-specific labels and Undo feedback.

**Owner decisions retained and graded:** the single Add podcasts field; one-list View editor; Rewind summary sheet; OPML in Settings; paused current Entry after relaunch; no visual podcast/Episode names in either player presentation; deletion directly to Trash with the exact named message and Undo; compact Podcast header with pull-down description, top-bar Subscribe and green subscribed check; two-tap Unsubscribe without a dialog, Undo and staying on the page; explicit Rename with name/field above Cancel and Save; case-insensitive unique names; and shortcut registration in Android’s own panel with no shortcut list inside the phone UI. None is proposed for reversal. The lack of visual player names has a recognition cost when artwork is shared between Episodes; it is an accepted clarity tradeoff, not a request to add names.

**Evidence key:**

- **T** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-14/`. Its README was read first. All supplied light, dark and font200 screenshots were visually surveyed, together with accessibility snapshots; selected originals were inspected at larger size. References such as `T/font200/05-new-view.png` identify the supplied files, not new captures.
- **F** = `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flow-run/20261110-220118-056/`. Its summary, raw CSV rows, selected strip images and harness source were inspected independently.
- **C** = `apps/android/app/src/main/kotlin/app/podlist/`, with Android manifest/resources, relevant `data` and `domain` sources, CONTEXT.md, both specified design documents and ADRs 0011–0013. Code references below are relative to the repository root.

## Flows

| Task supplied by the run | Steps covered |
|---|---|
| A · Find and queue | Views → View → Episode → Add to a Playlist → choose placement → result → Undo |
| B · Listen and arrange | Playlist → Play from here → Now Playing → collapse/pause → Entry actions → move → Undo |
| C · Explore a podcast | Add podcasts → directory result → Podcast page → Subscribe → type into Search Episodes while pending → completion → Undo → next query; separate long-list flings |
| D · Name a Playlist | New Playlist → create → settings → Rename → Save → Undo |
| E · Promote Search | Search → results → Save as a View → name → Create View |

**Conditions:** Pixel 10 Pro XL emulator profile, Android 16 / SDK 36, 1344 × 2992 physical pixels, density 3, **448 dp** compact width. Light and Dark. Each task had one delayed pass, with 2,000 ms added per HTTP completion, then five undelayed passes per appearance. Debug build on an emulator on a Mac; no CPU/network throttling. No 200% text flow run, narrower-phone run or audience-hardware timing run was supplied. The separate tour includes 200% text at the same width.

**Script:** `apps/android/app/src/androidTest/kotlin/app/podlist/FlowRunSmokeTest.kt` and `FlowRunReport.kt`; main measurements `F/measurements.csv`, timing intervals `F/timings.csv`, frame data `F/frames.csv`; ordered PNGs in F form the screenshot strip. The CSV has 7,323 element records over 332 captured step identifiers. Its `row` column is a capture identifier shared by multiple elements, not a physical CSV line number.

**Method assessment:** This is useful, reproducible UI evidence: it uses real UI semantics, stable field/action handles, fixed fixture data, explicit pending states, focus/scroll/input records, IME geometry and screenshot output. The Subscribe probe actually holds transport completion while entering `Long E`; this is stronger than merely sleeping and hoping the response remains pending. However, most actions use semantics activation and SetText, not physical touch/IME entry. `waitForIdle` captures settled states; onset inside the intervening interval is often unknown. Semantics and PNG capture are sequential. A changed settled box is neither automatically an unprompted move nor proof of a smooth transition. PixelCopy timing excludes system bars and the bottom 140 dp, can include unrelated changes, and often gives an interval straddling 200 ms. Emulator/debug measurements cannot establish the audience-hardware timing requirement. The harness correctly reports unresolved cases rather than converting them into passes.

**F-check judgments:**

- **FLOW-01 N/O:** the subscription control shifts 63 dp between captures 91 → 94 and −63 dp between 106 → 109; Dark equivalents are 265 → 268 and 280 → 283. The action-effect onset is unknown, so these do not establish a >500 ms unprompted shift. No failure is inferred from snapshot age.
- **FLOW-02 N/O:** the pending Subscribe probe retains focus, but the appearance transition 188 → 190 changes the recorded scroll value without resolving onset; another comparison lacks screen identity. The whole check cannot pass from the successful probe alone.
- **FLOW-03 pass, observed main tasks:** records 99 → 100 (Light) and 273 → 274 (Dark) retain `Search Episodes=Long E` and focus `Search Episodes` through pending → complete. In both pairs its origin remains `(16, 249) dp`. Newer input survives completion approximately 2,999 ms / 3,751 ms after typing. Own-submit field cleanup elsewhere is not input loss. Draft snapshot guards in FormDraftState and submission read-only/disabled states support the other recorded paths.
- **FLOW-04 pass, sampled follow-ups:** all 156 nonempty `follow_up_visible` records are true. In capture 100 and 274 the Undo snackbar starts at approximately `(16, 453.33) dp`, clears the keyboard, and is visible in both PNGs. This does not certify uncaptured server-error or OPML follow-ups.
- **FLOW-05 pass:** the three peer period tiles in `T/light/33-stats-populated.png` share their row top and height; `PeriodTiles` uses intrinsic row height and fillMaxHeight. At enlarged text they stack. No tablet panels are in scope.
- **FLOW-06 pass for the inspected states/tasks:** captured section headings contain content or explicit empty explanations; no disappearing input-help block is established in the strip. Getting started hides on deliberate Hide; its completed-step presentation is not evidence of input loss.
- **FLOW-07 pass for observed comparable task forms:** ordinary single-field create/find commits are beneath their input; multi-condition New/Edit View commits share a footer. The wrapped 200% New View footer deserves visual refinement, but its unrun transitions are not treated as a measured stability failure.

**Confirmed FLOW failures:** none. **RESP-01 and FOOT-02: N/O.** The run reports 100 action groups and 55 unresolved response intervals. For example, Light B/open-now-playing has a p75 response interval of 0–334.64 ms, not a measured 334.64 ms response. All 21 recorded fling frames per appearance exceed their deadlines, but the debug emulator cannot establish representative release scrolling. These results justify a release-device check, not a scored performance failure or pass.

**Stability sub-score: 8.3 Light / 8.3 Dark, partial to observed transitions.** Reserved status space, preserved pending input and visible follow-ups place the observed behavior in Strong. This is not an Exemplary claim: FLOW-01/02 remain unresolved, and secondary errors, font200 flows and narrower phone layouts are unmeasured. No numeric deduction is assigned to an invented shift. Consistency & polish remains in the same Strong band, below its 8.9 band ceiling.

## Cross-screen inventory

“None” means no such surface in the inspected state or implementation. Success/Undo uses the shared inverse-surface snackbar above the player/navigation or IME, with inverse-primary action text; when a modal sheet is open the shared host overlays that sheet. Error text is generally inline semantic error color. Context-dependent content is not itself a mismatch.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | Shared snackbar after changes | Shared sync notice below app bar, Retry | None | Snackbar; fixed toolbar slot afterward | Inline message + create/edit/add route | None | Root +; row Add/Play | Conditions and count above Episodes |
| New / Edit View | Object + past-tense snackbar | Field-specific or inline range error, red | Condition sheets; Rename field | Shared host; toolbar slot | Live zero-match count | None | Footer Create View / Done | Permanent draft/apply explanation at end |
| Search | View-created snackbar | Name-field error | Name field above results | Shared host | Inline no matches + Clear search | None | Save as a View; commit under name | Search the Library label |
| Episode detail | Shared object/action snackbar | Download error beside status + Retry; player error snackbar + transport retry | Add-to-Playlist sheet | Shared host | Metadata pending; not-in-Playlist explanation | None | Filled Play Now, labeled secondary grid | Show notes, Chapters, Entry Positions |
| Playlists / Entries | Shared named change snackbar | Sync notice | None | Shared host | No Entries / no current Entry + find route | None | Root +; Play from here; row menu | Active/current markers, Entry counts |
| Playlist settings / Rename | Named rename or moved-to-Trash snackbar | Name-field validation/retry, red | Explicit Rename with Cancel/Save | Shared host | Default Playlist limitation text | None | Rename below name; Save below field | Clear on Played and Trash consequences |
| History | None | Sync notice | None | Shared host if another edit exists | Inline no History + Show Entries | None | Open an Episode | Finish an Episode to build History |
| Listening Timeline / Rewind | Named rewound snackbar | Sync notice | Summary sheet | Shared host | Inline no timeline + Show Entries | None | Select moment; footer Rewind | Target, Unplayed/restored/kept summaries |
| Trash | Named restored snackbar | Sync notice | None | Shared host | Inline no deleted Playlists + Back to Playlists | None | Restore beside Playlist | Retention and restore explanation |
| Library | Shared subscription/rule snackbar | Sync notice | None | Shared host | No Subscriptions + Add podcasts | None | Root +; select/open Subscription | Download Rule group headings |
| Add podcasts | Subscribe snackbar | Field lookup error; named row Subscribe failure, red | None | Shared host | Lookup/no-results feedback at field | None | Find below field; Subscribe on result | Persistent name-or-feed-address label |
| Podcast page | Named subscribed/unsubscribed snackbar | Header load/subscription error or affected Episode error, red + named retry | Same subscribed control arms Unsubscribe | Shared host | No Episodes/no matches + refresh/clear | None | Top-bar Subscribe/check | Show/Hide podcast details; Episode count |
| Subscription settings / Download Rules | Shared setting-change feedback | Numeric field error, red | Choice sheet | Shared host; toolbar | None | None | Row opens local choice; Done in sheet | Inherited value and rule consequence |
| App Settings / OPML | Shared settings/export/import snackbar; inline import summary | Inline OPML error/failed-feed list, red + retry | Platform document picker | Shared host | None | None | Row action; sheet Done | Section hints, progress and Stop/Resume |
| Listening stats | None | Sync notice | None | Shared host if another edit exists | No listening + Find something to play | None | Chart day controls; Show table/chart | About your stats beneath data |
| Welcome / Server | Successful connection navigates | Server-address/reachability feedback beside field, red | Optional server choice | None before session | Standalone is usable | None | Start on this phone; Check and connect below field | Optional-server and address-scope explanation |
| Getting started | Completed step checkmarks | None | None | Not needed for Hide; Settings reopens | Starter Views beneath card | None | Add podcasts; Hide | Three numbered task explanations |
| Mini player / Now Playing / Sleep | Playback state; speed/timer value | Snackbar plus transport retry | Sleep duration/Chapter/Episode choices | Shared host for app edits | No current Entry hides player | None | Prominent transport; supporting tonal controls | Accessible identity, Episode route, labeled times |

**Mismatches:** no confirmed cross-screen disagreement in the common success/Undo region, status palette or ordinary create/find commit convention. Subscription progress labels agree once the optimistic target state is followed through the code; no contradictory-label failure is recorded. Global offline notices and local field errors have different regions because they have different scopes. The prescribed pinned View-editor footer and inline single-field commits are intentional form distinctions.

## Checklist

**Coverage: 81.1% — pass 58 · fail 2 · N/O 14 · N/A 5.** All **79 core IDs** appear once in the verdict table. Calculation: `(58 + 2) / (58 + 2 + 14)`. Phone L/B signals are separately evaluated below and are not silently added to this core denominator. All Mac-only and Web-only checks are **N/A → Android phone**, outside the denominator. Medium/expanded windows and foldable signals are **out of target scope**, not phone failures.

### Failures by severity

There are **no verified blocker or major failures**. Two minor checklist failures follow; one is repairable within the owner’s decisions.

1. **COPY-01 · minor — a Chapter sleep action is offered when no Chapter exists.** **Where:** Now Playing → Sleep on an Episode without Chapters, such as the chapterless Episode represented in `T/light/08-now-playing.png`. **Evidence:** `PlayerPresentation.kt:307` always offers the enabled “End of Chapter” action. `apps/android/domain/src/main/kotlin/app/podlist/domain/PlaybackPolicy.kt:36` falls back to `SleepTimer.EpisodeEnd` when no later Chapter exists, including an empty Chapter list. The neighboring “End of Episode” then does the same thing, without explaining the fallback. This is code evidence; the Sleep sheet itself was not captured. **Concrete fix:** omit or disable End of Chapter with “No Chapters in this Episode” when the Chapter list is empty. Keep duration and End of Episode available; retain the sensible Episode-end boundary for an actual final Chapter.

2. **KEY-08 · minor — owner-retained literal rubric exception.** **Where:** shortcut discovery. **Evidence:** the checklist explicitly requires an “accessible in-app shortcut reference”. `MainActivity.kt:69`–`:75` instead registers Undo and Redo with Android’s own Keyboard Shortcuts panel; the owner explicitly prohibits listing shortcuts in the phone app. This is native Android integration, not a Foreign platform signal or a missing shortcut implementation. **Remedy under the current constraints:** retain the system-panel implementation and record the accepted exception. A literal implementation fix would require a separate in-app reference and would violate the owner’s decision, so it is not proposed. This minor failure is retained in coverage/scoring rather than silently waived; it is excluded from next-step selection.

### Every core verdict

Grouped rows give the stated verdict to every listed ID. A pass from code establishes the implemented behavior, not an unperformed hardware/accessibility run.

| IDs | Verdict | Evidence / limits |
|---|---|---|
| FLOW-01, FLOW-02 | N/O | Unresolved onset and identity comparisons described in Flows; not converted into successes or failures. |
| FLOW-03, FLOW-04 | pass | Pending-input and visible-Undo measurements/PNG pairs, records 99→100 and 273→274; scoped to exercised tasks. |
| FLOW-05 | pass | Stats peer tiles, T/light/33; `ListeningStatsScreen.kt` PeriodTiles equal-height row. |
| FLOW-06, FLOW-07 | pass | Tour, inspected task strips and inventory: populated/explicit-empty sections; consistent observed form regions. No claim about unrun secondary transitions. |
| KEY-01, KEY-04, KEY-07 | N/O | Native focusable controls and explicit field requests exist, but no complete attached-keyboard, reverse traversal or scrolling-key run. |
| KEY-06 | pass | Custom accelerators use Ctrl+letter Z/A, with Shift only for Redo; no punctuation-key dependency; MainActivity, Selection and HistoryActions. Actual layout hardware untested. |
| KEY-08 | fail · minor | Owner-retained system-panel-only reference; detailed above. |
| DLG-01, DLG-02, DLG-03 | pass | IncomingContent’s contextual notification rationale uses a specific title/reason and Continue / Not now; routine delete/rename use Undo, not alerts. |
| DLG-04 | N/O | Back/dismiss preserve safe exits in code; Esc cancellation was neither supplied nor established for every modal. |
| DLG-05 | pass | Deliberate Playlist/View deletion is error-colored and recoverable; no unexpected destructive default identified. |
| DLG-07 | pass | EditorSheet uses one commit and system Back/dismiss; Rewind uses Cancel/Rewind; no Cancel+Done+Back trio. Android system Back is the local counterpart. |
| DLG-09 | pass | Entry/Episode/Podcast menus open from a Box around their source; drafts live beyond popup dismissal; no nesting of warning popups. |
| CTRL-02 | N/A | No mixed parent/child checkbox hierarchy; batch lists are flat. |
| CTRL-03, CTRL-04 | pass | Persistent OutlinedTextField labels; NumberInput validation/locale parsing; specific range and unique-name feedback; NameEditor/EditorComponents/ViewEditor. |
| CTRL-05 | pass | Material ripple/buttons and clickable rows; action style distinguishes primary from secondary. Larger transport is proportional to its listening task, not a desktop-metric violation. |
| CTRL-06, CTRL-07 | pass | Play/Add remain on rows/details; menus hold secondary actions; Library and podcast searches name their scope; no displayed search-history feature. |
| CTRL-08 | pass | AndroidDownloads supports determinate bytes or indeterminate transfer, cancellation/retry; OPML has processed/total and Stop/Resume; Bring over has resumable progress. Runtime import behavior remains unexercised. |
| LIST-01, LIST-02, LIST-03 | pass | Android content-feed lists; contextual headings; View sort choices in a panel; stats’ optional two-column day/time representation. No desktop column interaction imposed. |
| LIST-04 | N/A | No dense multi-column name table requiring middle-truncated identity. |
| LIST-05 | pass | Podcast details toggle reveals one header block; expanded state is stored in PodcastBrowsing and BrowsingStore. No recursive outline. |
| LIST-06 | pass | Selected bottom destination/tab, checkbox selection and radio choices are explicit in T and semantics; no adjacent-detail pane needing a persistent phone row selection. |
| LIST-07 | N/O | Tap/long-press and Ctrl+A code exist; full attached-keyboard arrow traversal not supplied. |
| DATA-01 | pass | Durable FormDraftStore/DraftWriteBuffer; onStop/disposal flushes; NameEditor and form drafts survive switching; explicit Save preserves draft on rejection. Abrupt process-death end-to-end test remains unperformed. |
| DATA-04, DATA-05 | pass | HistoryActions’ reversible history; multi-step inverse construction, Ctrl+Z/Shift+Ctrl+Z and visible Undo/Redo; revealChanges and EntryList reveal restored content; task strips cover several reversals. |
| DATA-06 | N/O | DB-backed stacks, tabs, query and scroll anchors are implemented, but complete relaunch context including transient selection/player pages was not exercised. |
| DRAG-01, DRAG-03 | pass | EntryDragging + moveEntry support reordering with discrete menu/custom-accessibility alternatives and reversible history. Code evidence; drag not performed. |
| DRAG-05, DRAG-06 | pass | Drag source elevation/translation, insertion cues, reset, edge autoscroll and retained destination highlight/focus are implemented in EntryDragging. Actual drag feel remains unverified. |
| PTR-03 | N/O | No pointer-attached interaction/cursor evidence. |
| PTR-04 | pass | ActionIcon/ActionTooltip use Material TooltipBox with specific labels; full values remain editable/readable. Actual hover timing untested. |
| APPEAR-03 | pass | Both appearances inspected; custom semantic roles, UiModeManager contrast listener and foreground/outline interpolation; opaque surfaces avoid transparency-dependent boundaries. No Android equivalent of a macOS transparency preference is invented. |
| APPEAR-04 | pass | Theme-role contrast calculations below; readable foregrounds and selected/status treatments in both tours. Pure artwork/decorative dividers and disabled controls are not treated as text/control-label failures. |
| APPEAR-05 | N/O | Compose-managed animation and gesture-driven transitions are present; removal of problematic motion under system animation settings was not exercised or fully established. |
| APPEAR-09, APPEAR-10 | pass | Coherent vector icon family, common optical sizes, separated player/control surfaces and conventional Material pressed/selected treatments. |
| APPEAR-11 | N/O | Sampled pending/settled screens are coherent, but transient flashes and partial frames between them are unestablished. Podcast pending labels agree with the optimistic target state; no contradiction is inferred from branch names. |
| TYPE-02, TYPE-03, TYPE-05 | pass | System family, Regular/Medium styles, sp sizing, 200% reflow of grids/settings/rows; T/font200/02–28 and 50–63 retain actions and essential content. Scrolled viewport-edge crops are not glyph clipping. |
| TYPE-06 | pass | BodyMedium 14/21 sp (150% leading); ordinary phone paragraph measure in stats/help, separated paragraphs; enlarged text legitimately shortens lines. The one-sentence fixture show notes do not test long publisher HTML. |
| TYPE-07, TYPE-08 | pass | No problematic app-authored all-cap paragraphs or doubled emphasis; resource text uses typographic punctuation. Initials artwork and publisher/user text are exempt. |
| COPY-01 | fail · minor | Misleading End of Chapter option with empty Chapters, detailed above. Otherwise domain vocabulary/action verbs are coherent. |
| COPY-02, COPY-03, COPY-04 | pass | Local cause/recovery errors; explicit empty-state routes; consistent domain capitalization. Global sync notice is scoped app-wide, not a displaced field error. |
| AX-01 | pass | Supplied trees plus code name buttons/seek/progress, selection, subscribed state, artwork identity and move actions. Structural semantics pass; live TalkBack traversal/announcement quality remains N/O. |
| AX-02, AX-04, AX-05 | pass | Selection checks/text, current Entry label/stripe, subscribed check, named errors; visible alternatives to drag/pull/chart gestures; Play/Pause and buffering/error indicators. Switch Access/voice-input execution and publisher transcripts are not inferred. |
| START-01, START-02, START-03 | pass | Meaningful loading; usable standalone option; persistent skippable/reopenable Getting started; contextual choice help and field labels. Startup timing itself is not established. |
| START-04, START-05, START-06 | pass | Downloads trigger a contextual notification rationale and platform permission request; optional server; no mandatory app account or launch permission wall; IncomingContent/AppModel. |
| START-07 | N/A | No app account creation. |
| EDIT-02, EDIT-05 | pass | Native Compose text editing/selection; text-field shortcut handling avoids app Undo interception; useful text/URL sharing and Copy feed address; ShowNotes/Sharing/PodcastPageScreen. Full external-app paste round trip not performed. |
| WIN-03 | N/O | Captured portrait phone and font scale work; smaller/landscape configurations are not supplied. Tablet/foldable exclusions are not scored here. |
| TOOL-06 | pass | Expanded player collapses to reachable mini player; contextual editor/selection modes exit to normal chrome. No user-hideable toolbar with no restoration route found. |
| SIDE-03, SIDE-04 | N/A | No adjacent phone navigation/detail panes in the graded compact layout. |
| SET-01 | pass | Global Settings, local Playlist/Subscription settings, temporary per-Episode player speed and Device Download Rules maintain their intended scopes. |
| RESP-01, FOOT-02 | N/O | Emulator/debug timing limitations described in Flows; neither representative timing nor scrolling smoothness is established. |

**N/O:** FLOW-01, FLOW-02, KEY-01, KEY-04, KEY-07, DLG-04, LIST-07, DATA-06, PTR-03, APPEAR-05, APPEAR-11, WIN-03, RESP-01, FOOT-02.

**N/A:** CTRL-02, LIST-04, START-07, SIDE-03, SIDE-04. No failed-parent dependents were double-counted.

### Android Phone platform signals

| Signal | Verdict | Evidence |
|---|---|---|
| L1 · Navigation | Native | Three equal bottom destinations; roots omit Up; inner screens have Up/title/actions. Overflow before primary actions on several standard bars is an ordering craft gap, not an imported navigation model. |
| L2 · Visual language | Native | Consistent Material 3 tonal roles, typography, fields, sheets and icons. Owner’s blue and deliberate non-dynamic palette are valid Android choices. |
| L3 · Density, text, system frame | Adapted, observed phone | dp/sp, explicit 48 dp action targets and 12+ sp supporting text; edge-to-edge/inset handling; 200% text reflows. Smaller/landscape phone completeness remains N/O under WIN-03. |
| B1 · System navigation | Adapted, code-supported | NavigableListDetailPaneScaffold and Back handlers; player PredictiveBackHandler; sheet → nested player page → collapse → normal stack implementation. Actual predictive animation/system gesture feel remains unobserved. |
| B2 · Preferences/access | Native, code/capture-supported | System/Light/Dark, font scale, resource-based UI, contrast adaptation, named semantics and non-gesture alternatives. Live TalkBack and international keyboard execution remain unobserved. |
| B3 · System surfaces/lifecycle | N/O as a complete signal | Native Sharesheet intent, notification channels, contextual permission request, manifest shortcuts/media service and draft/browsing persistence are implemented. Process-death restoration, external surfaces and physical media integrations were not exercised together. |

No definite imported-platform visual signal was found. **Looks 8.7; Behaves 8.5 on observable portions; `(8.7 + 2 × 8.5) / 3 = 8.6`.** Platform fit is **8.6**, qualified by B3 and the listed runtime limits, not a certification of them. The owner-retained KEY-08 literal exception does not turn Android’s system shortcut panel into a Foreign signal.

## Scores

Scores use the guide’s anchors, not a deduction-per-bug formula. Strong means deliberately composed, short of reference quality. Minor failures impose no hard category cap. There are no verified major/blocker caps. Unknown checks receive no invented penalty or credit. Behavioral scores use code and supplied flows, with the unverified portions explicitly bounded above.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.7** | Strong, near Exemplary: 17/24 sp row titles, 14/21 metadata and restrained heading styles carry clear roles; font200 retains full essential content through reflow. App-bar identity becomes heavily ellipsized at 200% (`Settings for Com…`, `Podc…`), though the full content name remains below. Long real show-note material is not demonstrated. | `hierarchy`, `accessibility`, `craft` |
| Hierarchy | **8.5** | Strong: row titles lead, count/conditions recede; Play Now and transport are clear primary actions; contextual selection replaces unrelated chrome. Settings has clear sections. Repeated row rules and several top-bar actions add visual weight, and the same Episode is visibly identified only after opening detail from the owner-fixed artwork-only player. | `content-first`, `hierarchy` |
| Spacing & density | **8.4** | Strong: shared 16 dp gutters, 48 dp actions, compact rows at default and deliberate stacking at font200. The New View footer wraps its primary commit to the leading edge at 200%, while single-field commits remain trailing; no overlap, but the action group looks less resolved. Dense row dividers and unevenly tall wrapped metadata make browsing less calm than a reference personal list. | `craft`, `hierarchy` |
| Color & contrast | **9.0** | Entry Exemplary: independently toned dark surfaces, one interactive blue, restrained status green and error red, visible non-color state. Computed token ratios: secondary text **8.86:1 light / 10.89:1 dark**; filled-primary text **6.81 / 7.70**; subscribed check **6.57 / 7.82**. Ratios use WCAG sRGB luminance and MainActivity’s explicit foreground/background pairs, not antialiased-edge averages. These roles have deliberate, stable meanings across both themes; no measured contrast failure is asserted. Unobserved transient rendering under APPEAR-11 earns no credit here. | `color-restraint`, `accessibility`, `craft` |
| Iconography | **8.4** | Strong: consistent familiar play/seek/star/download/settings family; tooltips and accessible labels support icon-only actions. Small Add/Play row glyphs and repeated overflow/pencil clusters still require learned recognition; their grouping is less immediate than the labeled secondary actions. The player’s 15/30 numerals remain readable icon annotations at enlarged text. | `conventions`, `plain-language`, `craft` |
| Consistency & polish | **8.5 (stability 8.3 Light / 8.3 Dark)** | Strong: common field/choice/sheet components, coherent Undo placement, explicit name validation and preserved pending input. Font200 commit wrapping and standard-bar overflow ordering are less resolved; the unavailable Chapter choice is an unfinished edge state. The observed stability score is partial; no unverified timing/shift is treated as a pass. Strong stability permits at most 8.9 here. | `stability`, `craft`, `conventions` |
| Clarity | **8.1** | Strong: distinct Library/Search/Podcast scopes, concrete deletion/rename feedback, inherited settings and explicit Rewind consequences. The Chapter sleep fallback misstates an action, and the owner-fixed name-free player asks artwork to identify Episodes it may not distinguish. This is the lowest category, above generic Competent but short of self-evident Exemplary. | `plain-language`, `feedback`, `discoverable-commands` |
| Platform fit | **8.6** | Strong, partial to verified behavior: Looks 8.7, Behaves 8.5, weighted result 8.6. Native navigation, Material semantics, system intents and Back implementation belong on Android. Physical lifecycle/system-surface behavior remains bounded by N/O; no tablet convention is imposed. | `conventions`, `stability` |
| Interaction & feedback | **8.5** | Strong: reversible edits, Trash recovery, reveal-after-Undo, explicit Rename, non-gesture move/details/chart alternatives and contextual permission flow. The literal in-app-reference requirement is an accepted minor exception. Complete keyboard traversal, live assistive-input use and audience-hardware responsiveness are not established, so this is not an “instant everywhere” claim. | `forgiveness`, `feedback`, `user-control` |
| **Overall** | **8.5** | Holistic Strong: the finding/listening split works and the phone app has a coherent native presentation across both themes and enlarged text. Remaining clarity/finish defects and the artwork-only identity tradeoff keep it below the owner’s 9.0 reference-quality target. The lowest category is 8.1, so the overall cap is 10.0 after applying the rubric’s maximum scale; 8.5 respects the lowest+2 rule. | `character`, `content-first`, `craft` |

**What stands between this and 9.0:** one concrete repairable minor defect and one owner-retained rubric exception; typography/action-group refinement at 200%; quieter list separation and a more consistent trailing overflow convention; and clearer handling of choices that are unavailable for the current Episode. Preserve the owner-fixed player identity model rather than proposing visual names. The unresolved lifecycle, input and performance evidence is a validation gap, not an additional diagnosed UI failure; closing it is necessary before claiming those behaviors are Exemplary.

## Next step

**Target:** Clarity, the lowest-scoring category; specifically COPY-01 in Sleep. The owner-retained KEY-08 exception and artwork-only player are excluded from change selection.

**Anti-pattern:** No exact Android pattern in the guide’s catalog fits. This is an availability/signifier mismatch; the catalog’s Mac “Picker roulette” or “Tap-only list” labels would be misleading here. The nearest useful contrast is **POLISH-05 · Availability doesn’t move the command**, adapted to the transient Sleep choices, and **CLAR-03 · Decision buttons say what happens**. Things-level craft would present only truthful choices for the current object.

**Root cause:** Sleep exposes a Chapter command independently of whether the current Episode has Chapters, while domain policy silently translates the command into another boundary.

**Change:** Keep End of Chapter in its existing position but disable it when `chapters.isEmpty()`, with the concise explanation “No Chapters in this Episode”; keep duration and End of Episode enabled. Alternatively omit the unavailable row within this newly opened contextual sheet. A real final Chapter can still end at the Episode boundary.

**Principle:** `plain-language`, `feedback`, `discoverable-commands`.

**Expected effect:** A small Clarity and polish improvement without changing the control-first player, Material look, navigation, or owner decisions. Verify the empty-Chapters and final-Chapter cases at default/200% text and with accessibility semantics. This proposal was not applied.

Before awarding 9.0 on behavior, resolve the existing onset comparisons and run the same tasks on a release build on a representative phone, plus attached-keyboard, TalkBack, recreation and narrower-phone checks. No new failure is inferred in advance of those checks.

**Handoff:** Only this report was added to the worktree, with an identical copy at the requested scratchpad root. No commit. Beads context was read with `bd prime`; its database reported `openat LOCK: operation not permitted`. No issue records were changed, consistent with the report-only instruction.
