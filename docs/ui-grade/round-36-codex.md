# PodList UI audit — round 36, Codex

## Frame

- **Task:** Find Episodes in the Library, add them to independently resumable Playlists, and listen or manage listening state across Devices.
- **Target:** **Web app**, Android-first installable PWA, also assessed in a Mac desktop window using the same web build. Per the explicit review brief, Mac-only checklist IDs are N/A → target; the shell is assessed for shared navigation, menus, text behavior and viewport fit, without imposing a different visual identity.
- **Posture:** Sovereign personal tool with background playback.
- **Audience:** Newcomers becoming perpetual intermediates; repeated browsing/listening should remain quick and forgiving.
- **Nearest exemplar:** Things for calm collection management, role-based typography and recovery; the guide’s Job search dashboard for web list/detail conventions. Opened its `01-to-apply.png` beside PodList’s captured main view. Borrow relationships, not appearance.
- **Character:** Warm light canvas; Inter body and Space Grotesk headings; blue #2b50c8 actions/selection; dark player/drawer; peer Views/Playlists navigated as lists. **All are owner-fixed and retained.** Variant A, View editor R, Playlist/Rewind C and Library C are constraints, not redesign proposals. Light-only is valid under WCOLOR-01 and is not penalized.

Reviewed commit `48b698d660f33b438f968deda0717f58b2a526f3`, 8 November 2026. `pwd` confirmed this worktree before inspection. No earlier `round-*.md` or UI-GRADE work lists were read. No app code, tests or configuration were edited, and nothing was committed.

## Flows

**Provided run:** `packages/web/ui-flows/flows.mjs`, documented by `packages/web/ui-flows/README.md`. Evidence root **F** is `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flows-r36/`: `summary.md`, 72 rows in `measurements.json`, contact sheets and per-step strips. Browse; listen (play/pause/skip/switch Playlist); Now Playing (queue/Episode/nested navigation); fresh-device delayed catalogue; second-tab takeover. Light appearance at **412×915**, **720×450**, **1440×900** CSS px. Catalogue arrival delayed 2000 ms. Five timed desktop runs after warm-up, darwin arm64, no throttling: open Playlist p75 **127 ms**, Play from here **111 ms**. These are lab action timings, not Core Web Vitals or complete timing coverage.

**Independent live checks:** locked install and production web build succeeded. Chromium **158.0.8127.18**, headless on this Mac, 100% browser zoom/device scale 1; phone sizes are CSS viewport emulation, not a physical Android Chrome session. Scratch/evidence root **E** is `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r36-codex/`. Shared preview snapshots timed out twice, so local Playwright was used. `driver.cjs` is the browser-session bootstrap; `reproduce.cjs` is the repeatable failure reproduction; `repro-results.json` is its output. `contrast.cjs` and `contrast-{light,dark}.json` record sampled computed text contrast. Native Electron was not launched: its binary was absent after install, so shell conclusions below are explicitly source evidence, permitted by the brief.

Exercised View/editor, Search/Refine, Episode detail, Library/Add/Subscription, Playlist settings/delete/Trash/restore, Timeline/Rewind preview, empty and populated stats, first run/Skip, drawer Episode/chapters/reorder, menu/native-select keyboard paths and keyboard-grid navigation. Added **320×740** reflow, **200% text** (root font 16→32 px at 1440×900), WCAG text-spacing overrides, forced colors and reduced motion. Main screenshots are named by screen and size in E. Download Rules, History and OPML receive additional code inspection; no claim of a full slow import, physical touch drag or native screen-reader run.

**Stability:** No scored FLOW failure in supplied measurements. Unprompted rows 15/20/23/28/31/36 and 59/61/63 retain core x/y at **0 px delta**; the fresh-device rows are the delayed catalogue completion. F’s `contact-now-playing.png` and `contact-fresh-device.png` provide sibling-state evidence. FLOW-03 remains **N/O**, since no measured later typing is recorded. Supplied measurements do not justify blanket “all asynchronous input is safe.”

**Additional recovery checks:** E/`long-list-scroll-corrected.json`: 500 Entries, visible “Long Episode 035” opened from scrollY **2400**, Back **2400**, reload **2400**. An earlier scratch probe clicked an overscan row that Playwright scrolled into view; that probe is discarded and is not a finding. E/`back-layers.json`: Back closes Speed menu while retaining drawer and URL, then closes drawer while retaining URL. Queue reordering by arrows produces “Moved …” and persistent Undo; it is not gesture-only.

**Limits:** No complete timed sequence for every action, field-vital dataset, long-list frame-pacing series, international keyboard run, physical Android software-keyboard/assistive-input run, or long-form real-feed notes. Those limits lower coverage, not invented failures.

## Cross-screen inventory

Cells give region/form · wording · status tone. “None” means absent on that screen, not unimplemented app-wide.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View editor | Lower feedback strip, dark · “Edited ‘…’” | Under Name/bounds, red practical rule | None | Same strip, persistent text action | List body, dashed neutral next step | Connection note in shared chrome | Header trailing Edit/Done; row Play trailing | Form hint under Mentions and conditions |
| Search / Refine | Same strip for Episode actions; named View after save | Inline naming/condition errors, red | Naming sheet, Name + Cancel/Save | Shared feedback strip | Body · “Search your Library” / no matches | Shared connection note | Search field first; Refine and save actions in header | Persistent Library scope/word matching |
| Episode detail | Shared strip for add/star/Played | Inline playback/download text, red or light red on dark | Add sheet, Playlist list + Next/Last | Shared strip; inside drawer when applicable | Missing Episode explanation and link | Player failure stays with player | Centered Play among five/seven labeled actions | Facts, per-Playlist Positions, show notes |
| Playlist Entries / settings | Shared strip · “Moved …”, deletion to Trash | Name field, red duplicate/empty rule | None for ordinary deletion | Shared persistent Undo | Dashed body · add Episodes next | Shared connection note | Header Play/Play this; row Play at end | Clear on Played explanation beside setting |
| History | None | None | None | None | Body · “Nothing finished yet” + explanation | Shared connection note | Entries/History/Timeline navigation | What counts as finished |
| Timeline / Rewind | Shared strip · “Rewound …” | None observed | Centered Rewind preview, explicit kept/restored consequences | Shared persistent Undo | Body · “Nothing played yet” | Rewind preview intentionally modal | Rewind to here trails each event | Explanatory paragraph above dated events |
| Trash | Shared strip · “Restored …” | None observed | None | Shared persistent Undo | Body · “The Trash is empty” | None | Restore at row end | Retention days below heading and per row |
| Library / Subscription / Rules | Current inline rule + shared action strip | Inline operation recovery / confirmation failure | Destructive Unsubscribe confirmation | Shared strip for reversible Episode/Playlist actions | Body next step: Add podcasts | Shared connection note | Library Add trails header; rules live beside podcast | Device scope, thresholds, override explanations |
| Add podcasts (Search/address/OPML) | Result button becomes checked “Subscribed”; import result in sheet | Under field/result, red practical recovery | Preview before Subscribe; file picker/drop for import | None in sheet | “No podcasts found. Try other words.” | Server-required error inline | Trailing Subscribe / Import in sheet | Stable hint under labeled input; file-drop instructions |
| New Playlist / Save View | New destination/updated navigation | Under Name, red validation; **storage refusal has no message** | Bottom phone / centered desktop name sheet | Creation not presented as an undo toast | None | **None for failed draft storage** | Paired Cancel + Create/Save at foot | Clear on Played description where relevant |
| Settings | Current option value | None observed | None | None for preference choices | None | Shared connection note | Live controls beside/under label | Playback precedence, keyboard toggle, Getting started |
| Listening stats | Current totals/chart/table | None observed | None | None | “No listening yet” + play next step | None | Disclosure to daily table | About your stats; streak explanation |
| First run | Completed steps become checked text | Add errors remain in Add sheet | Skippable checklist | None | Starter Views with counts | None | Add podcasts + Skip/Done below steps | Three concrete domain/task steps |
| Player / Now Playing | Visible playback state; in-drawer action strip | Failure next to transport, light red + Try again | Speed/Sleep menus and nested drawer pages | Reserved bottom drawer strip | “Nothing after this” + Play Next/Last | Second-tab takeover is actionable | Play centered; queue/chapters adjacent | Labels/tooltips, timer state, Position values |

**Inventory assessment:** Same Episode/Playlist mutation uses one dark confirmation strip, message pattern and persistent Undo across normal screens and drawer; drawer relocation preserves focus containment and is a deliberate contextual adaptation, not a mismatch. Subscription/import completion stays at its own result to support repeated adding. No scored FLOW-07 mismatch. Two quality differences remain: storage failure lacks the feedback other failures receive (WDATA-02), and Stats disclosures do not preserve state as the Subscription disclosure does (LIST-05). They are counted under those owning checks, not again as stability failures.

## Checklist

**Coverage: 90.9%** — pass **86** · fail **4** · N/O **9** · N/A **6**, across **105 core/web IDs**. Applicable denominator: 99; verified numerator: 90. Mac-only IDs: **N/A → target**, collectively excluded from these counts. Pass verdicts are scoped to the stated sampled code/runtime evidence; coverage is not a claim of exhaustive testing.

### Failures by severity

1. **[DATA-01] Blocker — a rejected draft write silently loses work on reload.** In New Playlist at 720×450, first confirm that “Normally recovered draft” survives reload. Reopen, make only `podlist:dialog-draft` writes throw the browser-standard `QuotaExceededError`, then enter “Storage failure draft.” Reload without cancelling: Name is **empty**. E/`repro-results.json` records before/after values; `repro-storage-before.png` / `repro-storage-after.png` show the same dialog. This is a deterministic failure-injection test of the storage-full path, not an assertion that this Mac’s disk was full. `packages/web/src/lib/dialogDraft.ts:66–72` swallows the rejection and `:88–92` updates only in-memory React state anyway. **Fix:** durably retain the draft in the existing local persistence layer, track whether the latest value was actually persisted, and keep a safe leave decision/export route while it is not. Do not clear the only copy or promise recovery until a write succeeds. **Cap:** Interaction & feedback ≤4.9.
2. **[WDATA-02] Major — failed draft persistence offers neither status nor retry.** Same reproduction, before reload: field contains the new name, persisted JSON still has `name:""`, and alert/status messages are **[]**. The person cannot tell recovery is unsafe. This is the *notification/recovery* requirement, distinct from DATA-01’s observed loss; it shares one root cause and is one diagnosis target. **Fix:** show a persistent inline “This draft couldn’t be saved on this Device” with **Try again** and a way to copy the entered text. Update the status only after durable success; use `beforeunload` only while a value is genuinely unsafe. **Cap:** Interaction & feedback ≤6.9, superseded by DATA-01’s 4.9 cap.
3. **[BROWSER-06] Major — Mac shell row menus suppress selected-text commands.** **Code evidence, not a native Electron runtime claim:** `packages/desktop/src/main.ts:398–407` always chooses `rowMenu(win,row)` whenever the hit element has a `[data-row-menu]` ancestor. It does not first test `params.selectionText`, `params.isEditable` or `params.linkURL`. The useful Copy/Look Up/spelling/edit branches in `contextMenu` at `:285–349` therefore cannot run for those targets inside a row; `rowMenu` offers object commands and Copy Link instead of selected-text Copy. The browser build’s `keepBrowserMenus` guard in `components/lists/RowMenu.tsx` does make this distinction, so this is specifically the Mac wrapper. **Fix:** give editable content, selected text and links their native context path before considering object row commands; keep row commands on unselected row background. Validate selected text, title links and native fields inside each row type. **Cap:** Platform fit ≤6.9.
4. **[LIST-05] Major — Stats disclosure state is discarded on reload.** Open both **Daily listening table** and **About your stats**. E/`repro-results.json` records `open:true` for both; reload records `open:false` for both. E/`stats-expanded-before-reload.png` / `stats-collapsed-after-reload.png` show the change. Both `<details>` in `routes/listening-stats.tsx:141` and `:197` are uncontrolled, with no persistence, unlike the Subscription settings disclosure. **Fix:** persist each disclosure’s open state per Device and restore it before the screen is presented. **Cap:** Platform fit ≤6.9 (already capped by BROWSER-06).

No additional minor checklist failures are established. The craft gaps below are quality judgments, not invented pass/fail violations. None of these failures requires reversing an owner decision.

### Every-ID verdicts

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | pass | F: all 9 measured unprompted arrivals have 0 px heading/navigation/player displacement; measurements rows 15, 20, 23, 28, 31, 36, 59, 61, 63 (one-based). |
| FLOW-02 | pass | F: fresh-device and playing-arrival rows retain focus/scroll; C: typing guards and inline live status. Removal/navigation focus is assessed under WKEY-03. |
| FLOW-03 | N/O | N/O: supplied measurements have no typed-value field or delayed completion during subsequent typing; cancellation guards in Search are encouraging but are not a measured typing flow. |
| FLOW-04 | pass | S/F: second-tab takeover prompt, persistent Undo, Add and Rewind sheets are visible in sampled captures. Actual Android software-keyboard occlusion remains outside this desktop-emulated check. |
| FLOW-05 | pass | S/F: View list and right panel share top y=170 at 1440; unequal content heights serve different purposes. |
| FLOW-06 | pass | S/C: empty Views, History, Trash, stats and queue have explicit content; first-run checklist stays until dismissed. |
| FLOW-07 | pass | S/C: list-header actions trail the title; equivalent settings rows share label/control alignment; Episode actions retain their order. |
| KEY-01 | pass | R/C: primary routes and dialogs keyboard-operable; grid arrows/type-ahead, native selects, Base UI menus, queue reordering and Escape checked. |
| KEY-04 | pass | R/C: Search/Add fields receive focus after settling; grid has one entry stop and a visible ring; safe confirmation starts on Cancel. |
| KEY-06 | N/O | N/O: international keyboard layouts were not exercised. |
| KEY-07 | pass | C: native page scrolling and grid PageUp/PageDown/Home/End; Space playback is a documented task-specific binding. |
| KEY-08 | pass | S/C: accessible Keyboard shortcuts reference, with platform-specific notation and single-key toggle in Settings. |
| DLG-01 | pass | S/C: routine edits/deletion use Undo; Unsubscribe asks before loss. Rewind is an uncommon consequential operation with an explicit preview. |
| DLG-02 | pass | S/R: “Rewind Commute to 14:30?” identifies the situation and previews the result. |
| DLG-03 | pass | S/R: Cancel/Create, Cancel/Rewind and action-specific destructive verbs; no generic Yes/OK acceptance. |
| DLG-04 | pass | R/C: Escape safely exits Add/New Playlist; Rewind opens on Cancel; draft cancellation is explicit. |
| DLG-05 | pass | S/C: Unsubscribe/destruction use destructive styling; safe Cancel initially focused. |
| DLG-07 | pass | S/C: form dialogs do not present Cancel, Done and Back together. |
| DLG-09 | N/A | N/A: no separate contextual popover workflow; menus, tooltips, dialogs and the specified drawer are assessed under their own checks. |
| CTRL-02 | N/A | N/A: no hierarchical parent/child checkbox control. |
| CTRL-03 | pass | S/C: persistent Name, Mentions, Podcast name and settings labels associated with native fields. |
| CTRL-04 | pass | C: duplicate/empty names and reversed date/length bounds receive field-specific validation; invalid pending values remain in the form. |
| CTRL-05 | pass | S/C: primary/secondary buttons share hover and active states; icon buttons have explicit active feedback. |
| CTRL-06 | pass | S/C: row menus contain Episode/Entry commands; Play/Add and header actions remain available outside menus. |
| CTRL-07 | pass | S/C: “Search the Library” and scope explanation persist; Add search explicitly names the podcast directory; no displayed history. |
| CTRL-08 | N/O | N/O: search busy state was seen, but slow measurable imports/downloads, cancellation and >10 s behavior were not fully exercised. |
| LIST-01 | pass | S/C: Library uses a semantic table; virtualized multi-action Episode/Entry collections use grids. |
| LIST-02 | pass | S/C: Podcast, Unplayed, Downloads, Keep at most, Speed; contextual headings identify single-column lists. |
| LIST-03 | pass | C: Library sort keys cycle ascending/descending and write the sort into URL/device memory. |
| LIST-04 | pass | S: shared row baselines and separators track data; titles wrap/clamp rather than cut glyphs. File/path-specific middle truncation is not applicable. |
| LIST-05 | fail | FAIL major: both Listening stats disclosures revert from open to closed on reload; repro-results.json and before/after captures. |
| LIST-06 | pass | S/C: sidebar/tab selection and native chosen options remain visible; current Entry gets text plus tint. |
| LIST-07 | pass | R/C: ArrowDown moved from rice to solar-system Episode; “j” selected Joinery; single grid Tab stop and native link destinations. |
| DATA-01 | fail | FAIL blocker: denied draft-storage write followed by reload changes “Storage failure draft” to an empty Name; repro-results.json. |
| DATA-04 | pass | R/C: multi-step undo/redo stack and persistent Undo; keyboard queue move offered Undo; deletion/restoration reversible. |
| DATA-05 | pass | R/C: refocus callbacks reveal restored content; restoring Workshop focused its sidebar link, not the removed Restore button. |
| DATA-06 | pass | R/C: corrected 500-Entry test retained scrollY=2400 on Back and reload; target/sort/last screen and Subscription disclosure use stored state. Stats disclosure exception belongs to LIST-05. |
| DRAG-01 | pass | C: sortable Entries have command/keyboard equivalents; OPML has file picker and file-drop handlers; stray files cannot replace the page. |
| DRAG-03 | pass | C/R: moves record the former neighbor and offer Undo; desktop queue keyboard move confirmed the reversal route. |
| DRAG-05 | N/O | N/O: pointer/touch drag activation, invalid-drop cues and end-state reset were not fully exercised. |
| DRAG-06 | N/O | N/O: autoscrolling drops at the edge of long virtualized lists were not measured. |
| PTR-03 | pass | C: handles use grab/grabbing and native links preserve modified click; no page-wide pointer gesture takeover. |
| PTR-04 | pass | C/R: shared Tip wraps icon actions and provides focus/hover help; native selects expose complete option values. |
| APPEAR-03 | pass | S/R/C: forced-colors Episode drawer retains borders, actions and selected states; selects regain native arrows; no blanket forced-color-adjust:none. |
| APPEAR-04 | pass | R: sampled light text minimum 5.23:1; dark selected-row metadata 5.43:1, dark main metadata 7.10:1; see contrast JSON. Disabled/decorative elements excluded. |
| APPEAR-05 | pass | R/C: reduced-motion drawer computed transition-property:opacity, duration:0.15s; positional sheet movement removed. |
| APPEAR-09 | pass | S/C: coherent Lucide family, conventional actions and numbered skip symbols; no mixed emoji/icon vocabulary. |
| APPEAR-10 | pass | S/R: fields have 3:1+ edge tokens; dark player and light content separate clearly; forced-color boundaries remain. |
| APPEAR-11 | pass | F/S/C: loading skeletons and stable player title reserve space; flow strips show no contradictory settled playback states. |
| TYPE-02 | pass | S/C: Inter/Space Grotesk and regular-to-semibold weights consistently assigned to semantic roles. |
| TYPE-03 | pass | R/C: captions 12–13 CSS px and rem-based type adapt; required brand fonts are valid web choices. |
| TYPE-05 | pass | S/R: enlarged editor/settings reflow; notes use relaxed leading and controls grow to text rather than clip it. |
| TYPE-06 | N/O | N/O: fixture show notes are too short to measure three representative full reading lines; max-w-prose alone is only an approximation. |
| TYPE-07 | pass | S/C: short uppercase section captions use 0.08em tracking; no non-link prose underlining or combined bold/italic. |
| TYPE-08 | pass | C/S: app strings use curly punctuation, ×, … and real dashes; ASCII apostrophes in fixture podcast content are user content. |
| COPY-01 | pass | S/C: domain terms and direct verbs are consistent; Next/Last target is named; input language is device-neutral. |
| COPY-02 | pass | S/C: directory errors recover beside their field; connection/playback problems explain practical recovery. Missing storage feedback is owned by WDATA-02. |
| COPY-03 | pass | S/R: empty Library, History, queue, View and stats explain the next action or what will appear. |
| COPY-04 | pass | S/C: sentence case with deliberate capitalized domain nouns; concise action tooltips. |
| AX-01 | pass | C/R: native field roles, named icon actions/sliders, grid row count/selection, named dialog headings and ARIA pressed/current states inspected. No full screen-reader session claimed. |
| AX-02 | pass | S/R/C: NOW/RESUME/Played words, checkmarks, outlines and icons supplement colors; forced-color capture remains understandable. |
| AX-04 | pass | R/C: queue handles accept arrows; row More menus and file picker avoid gesture-only actions; native buttons/fields expose assistive-input targets. |
| AX-05 | pass | C/R: explicit Play/Pause controls and textual player failure/status; podcast program audio is content, not otherwise hidden critical UI feedback. |
| START-01 | pass | S/F: meaningful skeletons before local catalogue arrives, then usable lists; fresh-device arrival is measured. |
| START-02 | pass | R/C: fresh empty-demo checklist creates starter Views; Skip survives reload; Getting started can be reopened in Settings. |
| START-03 | pass | S/C: contextual row/filter hints and revisitable first-run help; tips/dialogs dismiss with ordinary controls. |
| START-04 | pass | C: storage persistence requested after a download, not at launch; no unrelated launch permission request observed. |
| START-05 | N/A | N/A: no explicit permission-prompt workflow in the audited Chrome target; storage.persist is silent there. |
| START-06 | N/A | N/A: no account/sign-in requirement in this client. |
| START-07 | N/A | N/A: no account creation. |
| EDIT-02 | pass | C/R: native fields keep editing semantics; row grid Select All selects rows and Copy yields the Episode URL. |
| EDIT-05 | pass | C: share/copy helpers create usable server URLs, including app:// conversion in the Mac shell. Selected-text context suppression is owned by BROWSER-06. |
| WIN-03 | pass | S/R: layouts at 320, 412, 720 and 1440 CSS px; settings, drawer, editor and list controls reflow. |
| TOOL-06 | pass | S/C: dismissed Now Playing is reopenable from the player button; help and editor have visible return routes. |
| SIDE-03 | N/A | N/A: no user-hideable sidebar; narrow layout replaces it with section links rather than offering a hidden pane toggle. |
| SIDE-04 | pass | S/C: current section/list and open Episode retain distinct persistent selection, including the originating section. |
| SET-01 | pass | S/C: global defaults live in Settings; per-Subscription overrides and Playlist-specific settings live with their objects. |
| RESP-01 | N/O | N/O for the whole item: provided five-run p75 data covers two actions (127/111 ms), not every caused step of every primary flow. |
| FOOT-02 | N/O | N/O: 500-Entry restoration was checked, but scrolling frame pacing was not measured against this display’s refresh rate. |
| BROWSER-01 | pass | R/C/F: route history and panel URLs work; settled Back closes Speed menu, then drawer, retaining the underlying URL; long-list return restores position. |
| BROWSER-02 | pass | C/R: Views, Episode detail, settings, History/Timeline and Search refinements have recoverable URLs. |
| BROWSER-03 | pass | R/C: current screen titles change; Playlist History/Timeline, Episode and missing destinations set appropriate titles. |
| BROWSER-04 | pass | C/R: navigation uses real router links; only unmodified clicks open panels; buttons perform actions. |
| BROWSER-05 | pass | C: browser Find/location/reload/zoom/tab shortcuts preserved; Ctrl+K is not intercepted; Mac-only player arrows avoid text fields. |
| BROWSER-06 | fail | FAIL major, Mac shell C: a row ancestor wins over selected text/editable/link params before contextMenu can provide native text commands (main.ts:398–407). Browser-tab preservation is implemented separately. |
| BROWSER-07 | pass | C/R: native text/select/range controls and Base UI APG widgets; no paste blocking; Mac text spelling/edit commands implemented outside the row-priority defect. |
| BROWSER-08 | pass | C/R: selectable content and native zoom/scroll retained; touch-action:none is limited to drag handles. |
| BROWSER-09 | pass | S/C: installed-mode navigation has section links and drill-down Back/breadcrumbs; Mac shell additionally offers Go Back/Forward and swipe handling. |
| BROWSER-10 | N/O | N/O: no field data or page-wide LCP/INP/CLS lab series; two action timers do not establish Core Web Vitals. |
| WKEY-01 | pass | R/C: grid roving focus/arrows/type-ahead and Base UI radio/menu patterns; primary navigation remains links. |
| WKEY-02 | pass | C/R: Settings can disable single-key / and Space; input/select/dialog contexts are protected. |
| WKEY-03 | pass | R/C: Add initial focus settles on native Search input; Escape returns to opener; queue reordering keeps handle focus; Trash Restore focuses the restored list; modal wrapTab and removal helpers reviewed. |
| WKEY-04 | pass | C/S: focus scroll padding includes player/toast space; drawer has its own reserved feedback strip; no fully hidden focused control seen in sampled checks. |
| WDATA-01 | pass | R/C: normal draft restored exactly on reload; storage-failure loss is recorded under DATA-01 and missing failure status under WDATA-02, rather than counting draft persistence a third time. |
| WDATA-02 | fail | FAIL major: QuotaExceededError is swallowed; zero alert/status messages and no Retry while Name is only in memory; repro-results.json. |
| WDATA-03 | pass | C/R: field-specific errors preserve current input; duplicate/empty Playlist names and invalid View bounds identify recovery in text. |
| WDATA-04 | pass | C/S: actionable Undo has timeout:0; errors stay inline; statuses are live without taking focus; brief redundant success may expire. |
| WCOLOR-01 | pass | C: :root declares color-scheme:light. Single light theme is expressly permitted; dark player is a surface, not an offered dark theme. |
| WCOLOR-02 | pass | C/R: blue marks interactive emphasis; warnings use a separate destructive token; accent/white and focus edges exceed required contrast. |
| WTYPE-01 | pass | S/R/C: 15 px Episode/settings text, 13 px metadata, 12 px section captions; no sampled essential text below 12 px. |
| WTYPE-02 | pass | S/R/C: root-font 16→32 px checked on five routes at 1440; existing 720×450 zoomed flow and enlarged screenshots preserve controls; viewport does not disable zoom. |
| WTYPE-03 | pass | S/R: exact WCAG line/word/letter/paragraph spacing overrides preserve View content without overlap; spacing-override-desktop.png. |
| WTYPE-04 | pass | S/C: primary icon targets 44 px, sheet close 40 px, creation buttons 32 px; native checkboxes use label areas or isolated-target spacing exceptions. |
| WTYPE-05 | pass | R/S: 320 px Settings/Search/editor/Playlist/Subscription/stats reflow; no horizontal page overflow observed. Five enlarged desktop routes also remain at scrollWidth=1440. |
| WCOPY-01 | pass | C/S: shortcuts branch on platform; Mac glyphs are not shown indiscriminately to Android/Windows. |

**N/O:** FLOW-03, KEY-06, CTRL-08, DRAG-05, DRAG-06, TYPE-06, RESP-01, FOOT-02, BROWSER-10.

**N/A:** DLG-09, CTRL-02, START-05, START-06, START-07, SIDE-03. Reasons appear in the table; Mac-only IDs are N/A → target.

## Scores

Scores follow the guide’s anchors, not similarity to a Mac app or an arithmetic average. All scores are for the offered light appearance, including its dark player/drawer. Behavioral conclusions use running Chromium and code; the Mac wrapper portion is source-only.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong, close to Exemplary: deliberate 28/30 px headings, 15 px rows and 13/12 px metadata; 200% text and spacing overrides retain structure. Ordinary long titles in the 412 px mini-player still become very short fragments, so the smallest presentation is less fluent than the main list. | hierarchy, craft, accessibility |
| Hierarchy | **8.8** | Episode titles lead, metadata recedes, Next/Last target is explicit, and the dark bar cleanly establishes playback. Drawer separates transport from Chapters/Up next. Editor’s Done scrolls away with its form header, weakening the completion path during lower-row edits. | content-first, hierarchy |
| Spacing & density | **8.6** | Strong 76 px Episode rhythm, aligned labels and responsive stacked settings; 320 px layouts remain usable. The 400 px editor’s many rows demand substantial independent scrolling, and the narrow mini-player gives little width to identifying text. Refinement should tune those relationships without removing conditions or transport controls. | craft, hierarchy, conventions |
| Color & contrast | **9.1** | Exemplary in verified samples: blue has one interactive role; neutral content and dark transport are distinct; light secondary text ≥5.23:1 and dark selected metadata 5.43:1. Forced colors retains meaningful outlines. Light-only is permitted, not a deduction. | color-restraint, accessibility |
| Iconography | **9.0** | Exemplary coherent Lucide family, conventional Play/Add/Download/Star/Trash, readable numbered skips and consistent optical sizing. Text labels carry less familiar Episode actions. | conventions, craft |
| Consistency & polish | **8.7 (stability 8.8)** | Strong, not yet universal finishing: stable measured arrivals, common settings rows, persistent Undo and good focus/overflow states. Editor completion chrome, mini-player truncation and unremembered Stats disclosure states leave rougher edges than primary lists. No scored FLOW failure; unmeasured late typing is explicitly N/O. Stability is Strong, so its band limits this category to 8.9. | stability, craft, conventions |
| Clarity | **8.6** | Explicit domain words, per-Playlist Positions, Rewind consequences and useful empty states lift it well above Competent. Thirty-day chart bars expose only range endpoints visually; exact dates/values require expanding the table. Mini-player fragments and the silent storage path also reduce confidence about identity/state. | plain-language, feedback, discoverable-commands |
| Platform fit | **6.9** | Capped Competent despite a generally Strong web implementation. **Looks 8.9**, **Behaves 8.2** before caps: (8.9 + 2×8.2)/3 = **8.4**, then BROWSER-06/LIST-05 cap at **6.9**. Real links/history/native fields/APG controls and responsive Android-style navigation fit the target; row-context precedence in the Mac shell and reload disclosure amnesia break the contract. | conventions, stability, user-control |
| Interaction & feedback | **4.9** | Weak by mandatory blocker cap, although normal operation is keyboard-fluent and forgiving. Precisely reproduced draft loss under storage rejection prevents a Strong or Exemplary grade; absent warning/retry is an additional major. Normal draft recovery, queue keyboard moves, Trash focus and persistent Undo are substantial strengths. | forgiveness, feedback, keyboard-efficiency |
| **Overall** | **6.9** | Primary browsing/listening is visually Strong and often close to Exemplary. However, observed work loss holds the lowest category at 4.9, so Overall cannot exceed **4.9 + 2.0 = 6.9**. This is a holistic judgment constrained by the guide’s cap, not the visual-category mean. | forgiveness, craft, conventions |

**Platform plain-HTML test:** links retain href/new-tab/copy semantics in the web build; actions map to native buttons, fields/selects/range inputs keep browser editing and keyboard behavior, and Base UI supplies dialog/menu patterns. Web L1–L8 are Adapted/Native, with the noted readability refinements. Web B1–B7 and B9 are mostly Native/Adapted, but B4 is **Foreign in the Mac shell** for the row-text context path and B7 is **Foreign under refused draft storage**. B8’s Core Web Vitals evidence is N/O. The shell adds intentional app/File/Edit/View/Controls/Go/Window/Help menus, labeled Undo/Redo, native row menus, spelling suggestions, Back/Forward and remembered window bounds; these are real source-backed strengths. No Mac system-font/accent/Settings-window penalty is imposed on the explicitly requested web-app grade.

**Top craft gaps below Exemplary (after functional fixes):**

- Keep **Edit View / Done** visible while the 400 px form scrolls through Length, Sort, Show and Delete. E/`editor-desktop.png` plus the non-sticky header in `routes/views/$viewId.tsx:240–260` identifies the element; a sticky, opaque local form header can improve completion without changing variant R or hiding conditions.
- Improve title recognition in the **412 px mini-player**: allow two title lines earlier, or rebalance the existing text block and gaps. Keep the dark bar, artwork and transport/queue commands. Test the resulting footer height against focused rows and 720×450; more text must not become an occlusion regression.
- Give the **Listening stats chart** direct date/minute inspection and intermediate date cues while keeping its complete table alternative. The current endpoints plus unlabeled bars are readable as a rough trend but not a precise listening record; E/`stats-populated-desktop.png` and `stats-table-desktop.png` make the extra disclosure step visible.

## Next step

**Target:** DATA-01, the blocker, before any visual adjustment. **Anti-pattern:** “Reload amnesia,” specifically its refused-storage edge, not the normal draft path. **Root cause:** draft writing returns no success/failure result, errors are swallowed, and callers publish the new value without any durable-recovery state.

**Candidate 1 (preferred):** Change the shared draft-persistence interface to return a durable result, retain the newest draft in the app’s local storage layer, and show a persistent inline unsaved/retry state whenever persistence fails. Guard only unsafe departures with a real save decision and a copy/export route. Principle: forgiveness and truthful feedback. Expected improvement: Interaction & feedback and Clarity; every owner-fixed visual element survives. Risk: an always-on warning or unconditional leave prompt would regress flow and user control, so test normal success, denied storage, retry, reload and closed-tab recovery separately.

**Candidate 2:** Before the persistence change lands, add a narrow safe fallback: retain memory, display the exact entered draft plus Copy and Try again, and prevent silent departure while it has no durable copy. This addresses hidden failure and provides a safe decision; it is not by itself proof of durable recovery. Principle: constructive recovery. Expected improvement: feedback with minimal layout change, provided a reserved message region prevents field movement.

Acceptance requires re-running E/`reproduce.cjs` with the storage exception, successful retry, ordinary reload, and closed-tab recovery; the lost value must be restored or the person must have been given a genuine safe save decision. Re-run applicable flow measurements if new feedback affects layout. Then fix Mac context priority and Stats disclosure persistence before claiming 9.0. Do not seek the target by changing light-only appearance, fonts, blue, the dark player, peer list navigation or chosen screen designs.

Report-only audit: no implementation iteration or Log is applicable. Baseline/character check: all five signature elements remain as provided; no redesign was applied.
