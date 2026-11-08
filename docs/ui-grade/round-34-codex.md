## Frame

- **Task:** Find Episodes in the Library, build Playlists, listen and return to a prior listening context without losing work.
- **Target:** **Web app**, Android-first installable PWA, also assessed in a Mac desktop window. Per the owner’s explicit target, Mac-only checklist IDs are N/A; the Electron shell’s actual menus/context menu are supplemental platform-fit evidence.
- **Posture:** Sovereign personal listening tool, with background playback and brief management tasks.
- **Audience:** Newcomers becoming perpetual intermediates; keyboard users on desktop and touch users on Android.
- **Nearest exemplar:** Things 3 for calm personal collections, hierarchy and recovery; the guide’s web job-search dashboard for browser grammar. Compared the gallery’s main-window/sidebar-list examples and Things’ project capture for rhythm, not appearance. PodList’s 76 px two-line Episode rows and 36 px sidebar rows are deliberate web rhythms, not failed Mac metrics.
- **Character / owner decisions:** Fixed: equal conceptual halves for Views and Playlists; list navigation; Inter and Space Grotesk; #2b50c8 primary; dark player; light-only application appearance; editor R, Playlist/Rewind C and Library C. Retain all of these. The remaining signature is warm neutral surfaces with restrained outlined/grouped forms.

Independent audit of **2cf1123c9591ca48a24f16e25a843bf17cdb0fae**. No earlier round reports or UI-GRADE.md work lists were read. All designed surfaces are in scope, including global Settings and Download Rules. Only this report is changed in the repository; no implementation changes or commit.

## Flows

**Supplied run:** `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flows-r34/` — `summary.md`, 72 rows in `measurements.json`, five contact sheets and the screenshot strips. Script: `packages/web/ui-flows/flows.mjs`; fixed-data helper: `demo.mjs`.

Tasks: browse → Commute → Default → Library; play third Entry → async playing → pause → skip → switch Playlist → async playing; drawer → Up next → play → Episode → dismiss; fresh catalogue arrival after 2000 ms; second-tab takeover. Widths: **412×915, 720×450, 1440×900**. Light appearance, including the intentionally dark player/drawer. Supplied timing: darwin arm64, no throttling, warm-up plus five runs; p75 **115 ms** opening a Playlist and **102 ms** playing from an Entry. CPU model is not recorded.

**Independent probes:** `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r34-codex/` contains `audit.mjs`, `behavior.mjs`, `final-probes.mjs`, `finish.mjs`, `pressed.mjs`, `electron.mjs`, JSON records and named PNG captures. Main capture ledger: `audit.json` (**59 states**). Browser: Playwright Chromium **158.0.8127.18**, headless, device scale **1**, browser zoom **100%**, no CPU/network throttling except the explicitly held directory request. Additional Preview inspection used Chrome 152/Electron 44 with device scale 2. No real Android on-screen keyboard or assistive-input session was run.

Additional widths: **320×915**; text enlargement with a **32 px root (200%) at 1440×900**; WCAG text-spacing overrides; forced colors and reduced motion. Inspected Views/editor, Search/save dialog, Episode, Playlist Entries/settings/History/Timeline/Rewind, Trash, Library, Subscription/Download Rule controls, Add Search/address/OPML, Settings, first run, player and drawer. Download Rules and OPML behavior include code evidence; a full import/download stress run is not claimed.

`finish.json` records the phone Add → Play Last → Undo sequence. The heading remains **x20/y68.5** throughout; the sheet occupies **y589–915**, Undo **y717–769**, and the player starts at **y777**. Focus returns from the sheet to its Add control and after Undo to the Episode title; scroll stays 0. Phone navigation focuses Episode h1; Back restores its originating Playlist row. `final-probes.json` records **175 Tab moves over five screens at 720×450 with no obscured focus centers**. `behavior.json` records dialog entry/trapping/Back and focused-row removal.

**FLOW failures:** None established in the supplied measured transitions or the additional phone Add/Undo sequence. In particular, there is no measured core shift over 2 px to report. This does **not** establish exhaustive stability of every management flow. FLOW-03 is N/O: the supplied measurements have no input-value records or pending-save/new-typing sequence. RESP-01 is N/O as a whole: only two actions received the required repeated timing, rather than every step. BROWSER-10 is N/O: no LCP/INP/CLS series was supplied. Still screenshots are not treated as measurements of those behaviors.

The initial dependency install failed under restricted DNS; the authorized retry succeeded with the frozen lockfile. The web production build passed. The first Electron attempt encountered its missing-binary download/launch path; a subsequent explicit launch of the installed binary succeeded. `electron-menus.json`, `electron-row-context.json` and `electron.png` record the actual shell; it was closed afterward. Source-only Reload/Developer Tools entries are conditional on `!app.isPackaged` and are not a release defect.

## Cross-screen inventory

Legend: **U** = persistent Undo toast, above the player (phone x12, desktop starting x256), white text on charcoal, action “Undo”; inside the drawer it stays within its reserved foot. **E** = field-local red explanatory text, retained until corrected. **L** = neutral text/skeleton in the region that will fill. “None” means absent by design or not present on that surface, not an inferred failure.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View results | Changed content; U for episode edits | Persistent operation feedback in shared toast path | None | U for Next/Last/Played/Star | Inline dashed card; “Nothing matches”; adjust conditions | None | Play on trailing row edge; Edit in header | Filter summary under title |
| View editor | Live preview/count; U “Edited …” | E under Name | None | U | Result region says no matches | None | Done at trailing header | “Every row must match”; hints under condition fields |
| Search | Count below field; Save opens naming dialog | None in local query | Name required in modal when saving | U for result edits | “Search your Library” / “Nothing matches” inline | None | Save as View at trailing header | Persistent scope sentence; Refine fields |
| Save as View / New Playlist | Close then new destination | E below Name | Labeled Name and explicit Save/Create | None before creation | None | None | Trailing filled footer, Cancel leading | Save dialog describes the result; Playlist explains Clear on Played |
| Episode detail | Changed action state; U | Download recovery on its control; playback error in player | Add sheet chooses target Playlist | U | “None.” for absent show notes | None | Centered Play; Share by title | Facts, per-Playlist Position, Chapters |
| Playlist Entries | Current row/cursor changes; U for edits | Shared persistent operation feedback | Add/switch choices where invoked | U | Inline “Nothing here yet” with adding route | None | Header Play/Play this; trailing per-row Play | Count, Clear on Played summary |
| Playlist settings | Live name/checkbox values | E under Name | None | Shared undo path where provided | Missing Playlist links to overview | None | Live controls; Delete below form | Saved-as-you-type and Trash-retention explanation |
| History | Finished Episodes appear under dates | None | None | None | “Nothing finished yet”; explains how History fills | None | Episode links | Time and date headings |
| Listening Timeline / Rewind | U “Rewound …” | Confirmation retains recovery text on failure path | Centered consequence-preview dialog; Cancel initially focused | U | “Nothing played yet”; explains Timeline | None | Rewind to here trailing row; Rewind trailing footer | Intro and explicit kept/restored/unplayed preview |
| Trash | Row restored; U “Restored …” | Shared operation path | None | U | Inline empty Trash state | None | Restore trailing row | Retention period |
| Library | Changed rule/count; U for rule edits | Shared operation feedback | None | U for reversible rule edits | Inline Add podcasts invitation | None | Add podcasts trailing header; bulk Apply in header | Per-device rule grouping/table headings |
| Add podcasts — Search | Result button becomes “Subscribed” at the result | E under field / failed result | Podcast name field | None | “No podcasts found. Try other words.” | None | Subscribe trailing result | Field hint; **pending name lookup has no L state** |
| Add podcasts — Feed address / OPML | “Subscribed” beside result / import summary below file control | E under field / import failure below control | Address or file choice | None | None | None | Subscribe trailing result / file picker/drop target | “Checking the address…” / “Importing…” inline; direct-feed and export hints |
| Subscription / Download Rules | Current rule/override values; U for Mark all Played | E/recovery in unsubscribe confirmation | Unsubscribe consequence dialog | U for Mark all Played | “No Episodes yet” explains publication | None | Controls beside settings; Mark all Played/Unsubscribe below | Per-device download and Played-threshold explanations |
| Settings | Current select/checkbox value | Shared storage/error infrastructure, not fault-injected | None | None visible for each global setting | None | None | Live settings controls | Inline inheritance/help; Getting started link |
| First run | Completed steps gain a tick; Done | Add sheet owns its errors | Skippable checklist under title | None | Purposeful welcome with starter Views | None | Add podcasts and Skip/Done at card foot | Three task-oriented steps; can reopen in Settings |
| Player / Now Playing | Visible playback/position/chapter state; U for queue edits | Persistent player error and Try again | Speed/Sleep menus; stacked drawer pages | U inside drawer foot | Unavailable/empty queue text | Modal drawer scrim | Prominent centered Play/Pause | Labeled Chapters, Episode, Up next and tooltips |
| Second tab | Opens current tab after takeover | None sampled | “Use here” centered | None | None | Centered “PodList is open in another tab” | Use here below explanation | Explains one Library owner per Device |

**Mismatch:** Add podcasts’ name Search has no waiting message, while its sibling Feed address has “Checking the address…” and OPML has “Importing…”. This is the CTRL-08 failure below, not a second invented FLOW failure. No inconsistent success/error placement or main-action alignment was established among peer screens. The timing/placement inventory is only as broad as the states actually observed and the code inspected.

## Checklist

**Coverage: 89.9% (pass 84 · fail 5 · N/O 10 · N/A 6).** Calculation: **89 / 99** applicable items observed. There are **105 core + web IDs**; Mac-only IDs are **N/A → owner’s web target**, outside these counts. Five failed checklist items describe four underlying defects; DATA-01 and WDATA-01 concern the same draft loss and are not two independent incidents.

### Failures by severity

**F1 — [DATA-01] blocker; [WDATA-01] major — New Playlist draft disappears on reload.**

Where: `packages/web/src/components/playlists/NewPlaylistDialog.tsx:18` (name) and `:20` (Clear on Played); also inspect sibling draft dialogs before declaring recovery complete. Reproduction: Playlists → New Playlist → enter **“Weekend listening”** → reload → New Playlist. The Name value is **empty**, rather than the entered draft. Evidence: `behavior.json`, entry **“new Playlist draft after reload”**; `draft-before-reload.png` / `draft-after-reload.png`. State is only React `useState`; there is no persisted draft restoration. No existing Playlist or Library content was lost in this probe. The **blocker** classification is the guide’s fixed severity for DATA-01, not a claim that all data is corrupt.

Concrete fix: persist `{name, clearOnPlayed}` while editing, scoped to this server/Device, and restore it when New Playlist is reopened after reload, navigation or tab closure. Clear only on successful creation or an explicit discard. Keep the actual Playlist uncreated until Create. Include safe recovery for storage denial rather than silently dropping the draft. Apply the same recovery policy to the Save-as-View name and other meaningful unfinished form input, which currently also uses component-local state (code evidence; only the New Playlist loss was reproduced).

**F2 — [CTRL-08] major — Directory Search remains visually idle while a request is pending.**

Where: `packages/web/src/components/library/AddPodcastSheet.tsx:90`–`:155`, SearchTab. Reproduction: Add podcasts → Podcast name = **“Deep Field”**; hold `/api/directory/search` pending. At **1800 ms after filling**, the only output is the unchanged field hint and an empty results region. No “Searching…”, busy state or progress is shown. Evidence: `behavior.json`, **“slow directory search pending at 1800ms”**, and `search-pending-1800ms.png`; after releasing the request, `search-completed.png` shows results. The query remains intact, so this is not FLOW-03.

Concrete fix: keep a pending state for the current query; show a polite **“Searching…”** message in the already-reserved results area by the one-second limit, with `aria-busy` while pending. Replace it with results/error without moving the field. Ensure cancellation/new queries cannot show a stale result. Reuse the sibling feed-lookup waiting pattern. This caps **Consistency & polish at 6.9** through Controls.

**F3 — [WTYPE-01] major — Skip amounts are recurring control text below the guide’s minimum.**

Where: `packages/web/src/components/player/SkipIcon.tsx:19`. The compact variant renders **15 / 30 at 11 CSS px** in the phone and desktop player, below the guide’s 12 px floor for labels people need to interpret an action. These numbers distinguish skip duration; being visually embedded in an icon does not make them decoration. The drawer’s large variant is already 12 px. Evidence: `final-probes.json`, **“skip seconds font size”**; `view-412.png`, `view-desktop.png`; computed font size is 11px at 100% zoom, scale 1.

Concrete fix: use **at least 12 CSS px** for compact numerals and adjust their optical position/arrow opening inside the existing hit target; verify 15 and 30 remain distinguishable at 320/412/720/1440. Keep the skip-glyph character. This caps **Typography at 6.9**. This is the guide’s practical floor, not a claimed WCAG minimum-font-size requirement.

**F4 — [CTRL-05] minor — Rewind’s confirmation buttons have no distinct pressed state.**

Where: `packages/web/src/components/feedback/ConfirmDialog.tsx`, Cancel and confirming button. Hover the Rewind button and hold the pointer down: the background, foreground, border, shadow, transform, filter and opacity are identical to hover. Evidence: `pressed.json` records identical hover/down values; `rewind-pressed.png` captures the held state. The source defines hover styling but no active styling for these custom buttons. This is less finished than the explicit active states used on New Playlist and Add-to-Playlist buttons.

Concrete fix: add the same brief active tone used by peer primary/secondary buttons (for example the established primary /80 and neutral input /70 treatment), including destructive confirmation styling. Preserve focus rings and reduced-motion behavior. Do not add a positional bounce.

### Verdict ledger

Evidence references above use files under `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r34-codex/` unless explicitly identified as supplied flows. Pass means the inspected code/runs support the check within the stated scope, not that every conceivable input/device was tested.

| ID | Verdict | Evidence |
|---|---|---|
| FLOW-01 | pass | Supplied measurements, all 72 rows: unprompted catalogue/playback/takeover arrivals do not move the measured core; phone Add/Undo heading remains x20/y68.5. |
| FLOW-02 | pass | Supplied focus/scroll records plus finish.json: Add/Undo keeps scrollY 0 and returns focus to the Episode; delayed search leaves input untouched. |
| FLOW-04 | pass | finish.json phone-add-playlist/phone-add-undo: sheet y589–915 and Undo y717–769; player begins y777. |
| FLOW-05 | pass | Desktop View list and adjacent target/editor begin at the shared content boundary; audit captures show intentional independent content heights. |
| FLOW-06 | pass | LoadingRows, SidebarSkeleton, TargetPanel empty state and FirstRun begun state; populated/empty captures show content below headings. |
| FLOW-07 | pass | PageHeader actions trail the title; create/save/add/confirm modal footers put the filled primary action at trailing; no peer-screen mismatch observed. |
| KEY-01 | pass | Live Tab traversal, Add modal trap, grid arrows/row actions, native fields; useRowGrid and Base UI provide keyboard paths. |
| KEY-04 | pass | Add starts in Podcast name after settling; 15 Tabs remain in the dialog; return focus is the opener. Phone navigation focuses h1. |
| KEY-07 | pass | Native page scrolling plus rowGrid Home/End/PageUp/PageDown; task-specific Space is documented and guarded. |
| KEY-08 | pass | Shortcuts dialog and Settings toggle; accessible reference reached from sidebar/Help. |
| DLG-01 | pass | Unsubscribe and Rewind use an explicit consequence preview; routine reversible edits use nonmodal Undo feedback. |
| DLG-02 | pass | “Rewind Commute to 14:30?” and “Unsubscribe from …?” identify the situation; body explains consequences. |
| DLG-03 | pass | Cancel/Rewind, Cancel/Create, Play Last/Play Next use result-oriented labels. |
| DLG-04 | pass | Esc closes inspected sheets; Back closes Add; confirm dialog initially focuses Cancel in code. |
| DLG-05 | pass | Unsubscribe is destructive red and initial focus is Cancel; Playlist delete goes to recoverable Trash. |
| DLG-07 | pass | No inspected dialog presents Cancel, Done and Back together. |
| CTRL-02 | pass | LibraryTable select-every-podcast sets indeterminate for a partial selection; settings retain checkbox semantics. |
| CTRL-03 | pass | Labels associated by htmlFor/ID, or explicit accessible names; Search retains its scope sentence and page heading. |
| CTRL-04 | pass | Name validation is specific; Feed address rejects an incomplete address after blur/Enter without erasing it. |
| CTRL-05 | fail | **minor** — F4: Rewind confirmation has no pressed appearance |
| CTRL-06 | pass | Play remains visible; Add is visible on touch; wider rows reveal commands on hover/focus; More menus group row commands. |
| CTRL-07 | pass | Search states “Every word must appear in the title, the show notes or the podcast’s name”; no displayed search history. |
| CTRL-08 | fail | **major** — F2: pending directory search gives no busy indication |
| LIST-01 | pass | Library uses a native table on roomy desktop; action-rich Episode/Entry collections use ARIA grids; phone navigation uses links. |
| LIST-02 | pass | Podcast/Unplayed/Downloads headings are short nouns; each list has a contextual title. |
| LIST-03 | pass | LibraryTable header toggles sort direction and writes it into the URL; native aria-sort indicates direction. |
| LIST-04 | pass | Episode title/facts and Library columns share alignment; separators and selected-row treatment keep rows trackable. |
| LIST-05 | pass | Subscription settings disclosure writes subscriptionSettingsOpen and restores its open state. |
| LIST-06 | pass | Sidebar, bottom navigation, chosen Playlist radios and native selects retain visible selections. |
| LIST-07 | pass | rowGrid implements one Tab stop, arrows, Home/End, Page keys, type-ahead and title opening; click enters the row’s focus context. |
| DATA-01 | fail | **blocker** — F1: New Playlist name lost on reload |
| DATA-04 | pass | Live phone Add → Undo restored the prior membership; useConfirm and UndoShortcut implement multi-step undo/redo and leave native fields their own undo. |
| DATA-05 | pass | finish.json phone-after-undo focuses the restored Episode title; useConfirm refocus brings the result into view. |
| DATA-06 | pass | URLs preserve list/section/selection; remembered.ts and scrollMemory.ts preserve per-device choices and reload scroll context. Phone Back restores its originating row. |
| DRAG-01 | pass | SortableRow has pointer/touch/keyboard sensors and row move commands; OPML provides both file input and a drop area. |
| DRAG-03 | pass | Entry moves use undoable actions; an imported Subscription can be removed through Unsubscribe. |
| DRAG-05 | pass | SortableRow uses a 4 px pointer threshold, active styling, translated rows and reset on end; OPML highlights its target and reports import results. |
| PTR-03 | pass | Native text/links/scrolling remain; sortable handles expose drag affordance and gesture capture is limited to handles. |
| PTR-04 | pass | Tip wraps icon commands and uses Base UI tooltip triggers; labels identify Play, Add, download, row commands and settings. |
| APPEAR-03 | pass | drawer-forced-colors.png and CSS system-color rules retain selection, buttons, track and thumb; no blanket forced-color-adjust:none. |
| APPEAR-04 | pass | Measured token pairs: muted/page 5.73:1; muted/white 6.25:1; white/primary 6.81:1; player-muted/player 7.10:1; player-muted/track 5.43:1. |
| APPEAR-05 | pass | Reduced-motion emulation plus index.css: the shared data-sheet override replaces sheet/drawer positional travel with opacity. |
| APPEAR-09 | pass | One Lucide family; explicit words for Next/Last; skip arrows contain seconds; centered Play and labeled detail actions. |
| APPEAR-10 | pass | Field boundaries use #8c877e (3.57:1 on white); dark player is separated from the page; primary and neutral actions remain distinct. |
| APPEAR-11 | pass | Supplied late-arrival strips show coherent placeholders and final labels; no sampled white flash or contradictory loading label. |
| TYPE-02 | pass | Inter body and Space Grotesk headings use regular-to-semibold/bold weights consistently. |
| TYPE-03 | pass | Body/row text scales in rem; settled 32 px root captures retain labels and controls. The 11 px skip-label defect is owned once by WTYPE-01. |
| TYPE-05 | pass | Settled 200% text captures preserve hierarchy, wrap settings rows, and reflow Episode actions without losing their functions. |
| TYPE-07 | pass | Short uppercase headings use 0.08em tracking; emphasis is restrained; underlines identify links. |
| TYPE-08 | pass | App-authored confirmations, contractions and ellipses use typographic punctuation; feed/user content is exempt. |
| COPY-01 | pass | View, Playlist, Entry, Played, Rewind and Download Rule meanings are consistent; buttons state their actions. |
| COPY-02 | pass | Invalid Feed address is explained under the field; unsubscribe/playback errors include a retry or recovery instruction in code. |
| COPY-03 | pass | Empty View/History/Timeline/Trash and first-run states explain what causes content to appear or how to proceed. |
| COPY-04 | pass | Sentence-case controls and consistent short section headings; action-specific tooltip fragments. |
| AX-01 | pass | Native input/select/range semantics, dialog naming, grid roles, slider value text and icon-button names inspected in code/accessibility snapshots; no screen-reader speech session claimed. |
| AX-02 | pass | Active Playlist has a shape/name, selected navigation has an inset mark, Played has a check, and errors include text. |
| AX-05 | pass | Playback is user-initiated with visible Play/Pause, time, chapter and error information; no critical audio-only app instruction. |
| START-01 | pass | Cold catalogue loading reserves placeholder rows and player content; unrelated navigation remains available. |
| START-02 | pass | Empty-Library first run has Skip for now; finish.json confirms it remains skipped after reload. Settings can reopen it. |
| START-03 | pass | First-run checklist explains Views/Playlists and adding podcasts; forms offer local hints, with dismissible Getting started. |
| START-04 | pass | Chrome paths request no unrelated access at launch; storage persistence is tied to keeping data worth retaining. |
| EDIT-05 | pass | Episode Share/Copy Link and row Copy Link provide a URL; native text remains selectable; Mac row menu includes Copy Link. |
| WIN-03 | pass | 59-state capture set covers 320/412/720/1440 widths with no page-width overflow; 720×450 retains the desktop sidebar/player. |
| SIDE-03 | pass | Closed Episode detail can be reopened by a visible Episode link or the grid’s keyboard opening route; responsive sidebar is automatic. |
| SIDE-04 | pass | View/Playlist/Library selection persists beside content; selected Episode has its own inset mark. |
| SET-01 | pass | One global Settings route; Playlist settings and Subscription/Download Rule choices stay with their objects. |
| BROWSER-01 | pass | Phone Episode → Back restores the original row; Back dismisses Add before navigating away; supplied list navigation/URL states are coherent. |
| BROWSER-02 | pass | Meaningful View, Playlist, Episode and Subscription routes; Search refinements and Playlist tabs are in query parameters. |
| BROWSER-03 | pass | Live document titles name New this week, Search, Settings, Library, Playlist and Episode; PageHeader centralizes updates. |
| BROWSER-04 | pass | Real hrefs; plainClick guards preserve modifiers and middle-click; native Mac row menu also offers Open in Browser/Copy Link. |
| BROWSER-06 | pass | RowMenu limits custom menus to app objects and protects links/fields/selected text; Shift-F10 path and alternate visible commands exist in code. Native Mac row menu observed. |
| BROWSER-07 | pass | Native text/url/search/select/range/radio/checkbox controls; Base UI supplies dialog/menu behavior; paste is not intercepted. |
| BROWSER-08 | pass | Copyable text stays selectable; touch capture is confined to drag handles; viewport does not prohibit zoom. |
| BROWSER-09 | pass | Installed-mode navigation includes section links and contextual Back; Mac Go menu supplies Back/Forward. |
| WKEY-01 | pass | APG-style roving grid and Base UI menus/dialogs; section navigation is links, not role=menu. |
| WKEY-02 | pass | Settings can disable slash/Space shortcuts; handlers exclude text fields and relevant controls. |
| WKEY-03 | pass | Live dialog entry/trap/Back/Esc return, phone h1 navigation and restored row focus; row removal retains focus on the next row’s corresponding control. |
| WKEY-04 | pass | 175 Tab moves across five screens at 720×450 found no obscured focus centers; phone Undo/sheet measurements are above the player. |
| WDATA-01 | fail | **major** — F1: no durable recovery for that draft |
| WDATA-03 | pass | Feed validation preserves “bad address”, names the field error, and suggests a complete https:// address; name errors preserve entered text. |
| WDATA-04 | pass | Undo uses timeout:0, errors persist near their cause, and transient success notices repeat state already represented in content. |
| WCOLOR-01 | pass | Light-only is allowed; :root declares color-scheme:light. The dark player is a deliberate surface, not a second application theme. |
| WCOLOR-02 | pass | Blue consistently marks primary action, selection and focus; white/blue is 6.81:1. Warnings use a separate red. |
| WTYPE-01 | fail | **major** — F3: recurring skip-control numerals are 11 CSS px |
| WTYPE-02 | pass | Settled html font-size:32px captures and 720×450 viewport proxy preserve content/functions; viewport leaves zoom enabled. |
| WTYPE-03 | pass | WCAG spacing overrides captured on Search without lost text or essential controls; labels wrap rather than disappear. |
| WTYPE-04 | pass | Most actions are 40–48 px, sliders 24 px high; 16 px checkbox visuals have a larger label hit area or sufficient spacing between neighboring targets. |
| WTYPE-05 | pass | Normal-appearance capture set reports document width equal to viewport at 320, 412, 720 and 1440; table overflow is locally contained when applicable. |
| WCOPY-01 | pass | Mac captures show ⌘; non-Mac notation branches use Ctrl and reflect the implemented reference bindings. |

**N/O:** FLOW-03, KEY-06, DRAG-06, TYPE-06, AX-04, RESP-01, FOOT-02, BROWSER-05, BROWSER-10, WDATA-02.

**N/A:** DLG-09 → no contextual form popovers; menus and modal sheets are assessed separately; START-05 → no browser permission prompt in the Chrome flows; START-06 → no account/sign-in feature; START-07 → no account creation; EDIT-02 → no custom text editor or editable cell grid; native fields retain native editing; TOOL-06 → no manually hideable toolbar.

The unobserved areas include international layouts, long-list drag autoscroll/frame-rate behavior, long-form reading measure, actual assistive-input use, storage denial/full conditions, browser-chrome shortcut conflicts, complete repeated response timing, and Core Web Vitals. No failure or pass is inferred from their absence. The headless/desktop viewport probes also do not prove real Android keyboard occlusion or TalkBack behavior.

## Scores

Scores use the guide’s anchors, then its caps. They are not an average. A narrow but real blocker can therefore bind Overall despite the substantially stronger visual work.

| Category | Score | Evidence / anchor placement | Principle |
|---|---:|---|---|
| Typography | **6.9** | **Capped by WTYPE-01 major.** Otherwise Strong: coherent 28/30 px headings, 15 px rows, 13 px metadata, legible weight/leading and successful 200% text reflow. The repeated 11 px skip amounts prevent Exemplary. | accessibility, craft, adaptability |
| Hierarchy | **8.8** | Upper Strong: list titles and Episodes lead; sidebar is quieter; dark player anchors listening; detail Play is centered and peer actions recede. Phone mini-player gives recognition too little width, and its trailing controls dominate the identity line. | hierarchy, content-first |
| Spacing & density | **8.7** | Upper Strong: consistent page gutters, 76 px Episode rows and 36 px sidebar rows; controls fit 320 px and the 720×450 Mac minimum window. Narrow bar allocation and long vertically stacked editor groups still feel more mechanically fitted than exemplary. | craft, adaptability |
| Color & contrast | **9.0** | Entry Exemplary in tested surfaces: restrained blue, warm neutral page and dark player; sampled normal text contrasts 5.43–7.10:1; meaningful progress 5.60:1 on player; forced-colors fallbacks preserve controls/state. Light-only is an allowed owner choice. No measured failing text contrast found. | color-restraint, accessibility |
| Iconography | **8.8** | Upper Strong: coherent Lucide weight, familiar transport/settings symbols, plain Next/Last labels, labeled detail actions. Compact skip arrows and small queue badge are the least optically clear cluster; their numeric sizing is separately owned by Typography. | conventions, craft |
| Consistency & polish | **6.9 (stability 8.7)** | **Capped by CTRL-08 major.** Tested core transitions hold still, phone Undo reserves room, and peer actions align. Missing Search waiting feedback and the Rewind pressed-state mismatch leave edge states unfinished. Stability is Strong, not Exemplary: measured management/late-input coverage remains incomplete. | stability, craft, feedback |
| Clarity | **8.7** | Upper Strong: scope sentence, Played state, per-Playlist Positions, rule labels, specific destructive consequences and skippable onboarding teach the domain. Compact player identity truncation and loss of resource-link semantics in plain-text show notes keep it below reference-example quality. | plain-language, discoverable-commands |
| Platform fit | **8.2** | Strong; **Looks 8.8, Behaves 7.9 → (8.8 + 2×7.9)/3 = 8.2**. Real routes/links, native fields, responsive layout and installed Back fit the web. Draft recovery breaks the browser contract. Mac shell actually has app-specific menus and native row commands; no Mac-only aesthetic penalty is applied. | conventions, user-control |
| Interaction & feedback | **4.9** | **Capped by DATA-01 blocker** (WDATA-01 also fails). Browsing/playback/Undo/focus paths are otherwise Strong, but unfinished New Playlist work cannot survive a routine browser reload. Partial coverage of storage failures, assistive input and timing remains explicit. | forgiveness, feedback, keyboard-efficiency |
| Overall | **6.9** | Strong primary-task and visual design, bounded by **lowest 4.9 + 2.0 = 6.9**. Draft loss is the binding weakness. This does not meet the owner’s **9.0** target; the cap cannot be overcome by better spacing alone. | forgiveness, character, craft |

**Platform-fit signals:** Web L1/L2/L3/L6/L7/L8 are Adapted (own frame/type/controls/selection, correct single-theme/reflow behavior); L4 links and L5 OS notation are Native/Adapted. B1 history, B2 URLs/titles, B3 links, B5 native text and B9 installed navigation are Native/Adapted. B6 keyboard is Adapted within inspected APG/focus paths. **B7 work survival is Foreign** because the creation draft is page-lifetime state. B4 browser controls is partially observed (row menus/text/zoom code), with chrome shortcut conflicts N/O; B8 full vitals N/O. In the plain-HTML test, destinations map to anchors, actions to buttons, conditions to native selects/inputs, transport seek to range, and sheets to modal dialog semantics; the demonstrated lost behavior is draft survival across the browser lifecycle.

**Top craft gaps after the caps are removed:**

1. **Player identity on phones:** at 412 px the opener is 164 px wide, including 44 px artwork and its gap, leaving roughly 108 px for title/subtitle. Both lines truncate in the ordinary fixture state (`view-412.png`). At 320 px it is narrower still. Refine title line allocation and inner gaps within the chosen dark bar, retaining the designed transport/queue controls and a stable height. The full drawer supplies the complete title, so this is a recognition/craft limitation, not an additional content-loss failure.
2. **Show-note affordances:** `showNotesText()` deliberately reduces feed markup to paragraph text, and EpisodeDetail renders only paragraphs. Resource anchors lose their URL/clickable semantics; lists and headings lose their reading hierarchy. Keep safe HTTP(S) anchors and a small sanitized text structure. The supplied fixture has only short plain notes, so this is a code-supported craft limitation, not an invented failed linked-feed runtime test.
3. **Finish state parity:** Add Search needs the same deliberate waiting state as address lookup/import; confirmation buttons need the same pressed feedback as peer dialogs. These are F2/F4, counted once. Keep all owner-selected fonts, color and layouts while finishing these states.

## Next step

**Target:** DATA-01 / WDATA-01 draft recovery, selected before lower-severity issues by the guide’s diagnosis order.

**Anti-pattern:** **Reload amnesia** (`guidelines/anti-patterns.md`).

**Root cause:** creation form state lives only in mounted React components, whereas the existing-entity editing paths use journaling/persistence. Ordinary browser lifecycle events destroy the creation draft.

**Change:** add durable, server/Device-scoped New Playlist draft storage and recovery for both Name and Clear on Played. Persist while typing, restore on reopen, keep Create explicit, and clear only after success or explicit discard. Use the same policy for Save-as-View naming. Verify reload, navigation away/back, tab close/reopen, and storage failure before expanding the claim.

**Principle:** forgiveness and user control. Things/BBEdit’s transferable technique is continuous preservation and unambiguous recovery, not a new visual design.

**Expected effect:** removes the binding Interaction/Overall cap once demonstrated; improves platform-fit B7 without changing any signature element. Then fix Search waiting feedback, compact 12 px skip labels and pressed-state parity. Re-run the omitted delayed-typing/management/timing and real Android accessibility paths before awarding 9.0; the current coverage cannot substantiate an exhaustive Exemplary claim.

## Log (when iterating)

No implementation iteration: review-only request. No before/after change was made or accepted. Baseline captures remain in the supplied flow run and the independent scratch set; app character is unchanged.
