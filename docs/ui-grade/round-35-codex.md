# PodList — independent UI audit, round 35 (Codex)

## Frame

- **Task:** Find Episodes in the Library, arrange them in Playlists, and listen while retaining each Playlist’s place and a safe way to reverse edits.
- **Target:** **Web app**, as explicitly requested: Android-first installable Chrome PWA, also assessed in a Mac desktop window. Mac-only checklist IDs are N/A → target; the Electron shell receives a separate qualitative code assessment below.
- **Posture:** Sovereign personal collection and listening tool, with playback continuing in the background.
- **Audience:** Perpetual intermediate, with newcomers learning the distinction between Views and Playlists.
- **Nearest exemplar:** Things 3 for calm list hierarchy, contextual teaching, and forgiveness. Consulted `UI_Guidelines/examples/gallery/main-window-sidebar-list.md` and opened `examples/screenshots/things/02-project-headings.png`. Borrow its alignment and recovery standards, not its Mac conventions or appearance.
- **Character:** Peer Views/Playlists lists; warm light canvas; Inter body and Space Grotesk headings; blue `#2b50c8` emphasis; dark persistent player and Now Playing drawer. All five are owner-fixed and retained in the recommendations.
- **Owner decisions:** Light only; variant A and list navigation; View editor R; Playlist settings/Rewind C; Library C; all designed screens in scope. These choices incur no failure by themselves. No request to replace them or design a dark theme.

Commit assessed: `4d7197ca471356cc02af5551fdcbad9fe4cef2b9`. Working directory verified first. Dependencies installed with `pnpm install --frozen-lockfile`; `pnpm --filter @podlist/web build` passed. No earlier grading reports or `UI-GRADE.md` work lists were read. App code, tests, and configuration were not changed; no commit was made.

## Flows

**Supplied run:** `packages/web/ui-flows/flows.mjs`, with fixture creation in `demo.mjs`. Reviewed the supplied summary, measurements, browse and Now Playing contact sheets, and corresponding source. Evidence root:

`/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flows-r35/`

- Tasks: browse Views/Playlists/Library; play, pause, skip and switch Playlist; Now Playing, Up next and Episode pages; late catalogue arrival on a fresh Device; second-tab takeover.
- 72 recorded states, covering phone **412×915**, short desktop **720×450**, and desktop **1440×900**, in light appearance, including the intentionally dark player. Device scale factors are **2, 2, 1** respectively. The middle case is a reduced CSS viewport at device scale 2; the script does not itself set browser zoom to 200%.
- `measurements.json` records core rectangles, movement, focus and scroll. `strips/` holds each step; `contact-*.png` groups them.
- Catalogue arrivals delayed **2,000 ms**. In `fresh device`, compare steps 1 and 2 at each width: arrival does not move the measured core. In `listen`, the asynchronous `playing` states likewise retain the measured heading/navigation positions. No supplied FLOW failure is substantiated.
- Timings: five measured desktop runs after one warm-up; darwin arm64, no throttling. Open a Playlist p75 **134 ms**; Play from here p75 **124 ms**. These are end-to-end automation timings to observed state, not a full measurement of presentation latency or Core Web Vitals. They support these two actions; **RESP-01 remains N/O** for the requirement covering every main-task action and representative phone hardware.

**Supplementary live probes:** Built the requested demo and used the shared browser, Chrome **152.0.7977.169** in Electron **44.10.1** on macOS. Probed 1280×800, 1440×900, 720×450 and 320×740 CSS viewports, at normal 16 px root text and with a 32 px root for 200% text enlargement. DOM rectangles, rather than scaled preview image dimensions, supply measurements. These were interactive probes, not a new exhaustive flow run. Their record and captures are in:

`/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r35-codex/`

`probes.json` records closed-tab drafts, impossible ranges, toast Undo/Redo, text enlargement, 320 px reflow, focus return, and drawer Back. Captures: `draft-before-close.png`, `impossible-range.png`, `redo-after-toast-undo.png`, `text-200-short-desktop.png`.

Observed positives: Add podcasts focuses its field, keeps Tab inside, and returns focus to its opener on Escape. Rewind initially focuses Cancel. Shift-Tab stays in Now Playing; browser Back closes it without leaving the underlying route and restores the player opener. Library, Subscription settings, Add podcasts, Timeline and Listening stats reflowed at 320 px without horizontal page overflow. Episode detail survived the WCAG text-spacing overrides at 720×450. The demo and preview tabs were stopped/closed after inspection.

**FLOW failures:** None established in the supplied measured flows. The failures below are separate running-app/code findings; they are not relabeled as unmeasured FLOW failures. Add/search/edit/import/reorder/restore flows, on-screen keyboard occlusion, and representative-device timings are coverage limits.

## Cross-screen inventory

“Toast” below means the common dark notice above the player, with persistent Undo for reversible actions and a dismiss control. In the drawer it occupies the drawer’s reserved notice region. Neutral means foreground/muted text; errors use destructive red. “None” means no separate message of that kind, not an unimplemented screen.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View results | Common toast after actions | Common action feedback | None | Toast | Bordered central “No Episodes match…” plus widening advice | Shared connection/version surface | Header trailing Edit/New; row Play | Filter summary below title |
| View editor | Toast “Edited ‘…’” while preview updates | Name error below Name; **range error absent** | None | Toast, batched changes | Live preview’s empty state | Shared surface | Done at editor’s top trailing | “Every row must match…” below conditions |
| Search / Refine | Result count below search; toast for Episode actions | Field/context feedback | Save as View name dialog | Episode-action toast | Central no-match advice | Shared surface | Header trailing Save as View | Scope below field; Refine disclosure |
| Episode detail, light | Changed action state; common toast | Not-found explanation with Views link; Download retry state | Add sheet | Toast | Explicit no-notes text | Shared surface | Play centered in action group | Playlist positions and Chapter times |
| Playlists / Entries | Changed order/row state; common toast | Common action feedback | New Playlist dialog | Toast | Common bordered empty state | Shared surface | Header trailing Play/Play this; row Play | Cursor/Position labels |
| Playlist settings | Saved Name and checkbox state; no separate success toast | Below Name | None | No visible edit Undo | Missing-Playlist recovery state | Shared surface | Inline settings; Delete below card | Saved-as-you-type and Trash consequence text |
| Trash | Restore updates list; common toast | Missing-object handling | Irreversible deletion confirmation where offered | Common recovery controls | “The Trash is empty” | Shared surface | Restore alongside deleted Playlist | Retention explanation below heading |
| History | Rows are the record | None specific | None | None | “Nothing finished yet” with explanation | Shared surface | Episode links | Explains finished Entries |
| Listening Timeline / Rewind | Common toast after Rewind | None specific | Named Rewind confirmation with effects and Cancel | Toast | “Nothing played yet” with explanation | Shared surface | Rewind beside each moment | Intro explains kept deliberate edits |
| Library / Download Rules | Changed rule value; no separate toast for each rule edit | Import/subscription errors stay in Add sheet | Add podcasts | Bulk actions use common feedback; rule values apply live | Common empty state with Add route | Shared surface | Header trailing Add podcasts; native rule selects | Group heading names Device rule |
| Add podcasts | Subscribed replaces its button; OPML summary below drop area | Under field/result/drop area, practical recovery | None beyond choosing method | Existing Subscription management is recovery route | No-results advice | Server-needed error near request | Subscribe beside result; file picker/drop area | Separate Search, Feed address, OPML instructions |
| Subscription | Updated values; bulk Played toast | Unsubscribe failure near task | Unsubscribe confirmation | Bulk Played toast | Episode-list empty state | Shared surface | Settings disclosure and nearby management actions | Per-setting hints; “Default” overrides |
| Settings | Current value is confirmation | Persistence failure not exercised | None | None separate | Not applicable | Shared surface | Native setting controls | Playback/Trash/shortcut hints; Getting started link |
| Listening stats | Figures/chart/table update | No special error tested | None | None | “Your stats start here…” and listening advice | Shared surface | Read-only information; daily-table disclosure | Definitions below metrics; period explanation |
| First run | Checklist steps acquire ticks | Add sheet owns errors | None | None | Checklist is the designed initial state | Shared surface | Add podcasts plus Skip for now/Done | Three concrete steps, reopenable from Help/Settings |
| Player / Now Playing | Play state, current Chapter and Position | Player error text and retry; drawer expands explanation | Speed/sleep menus; Add sheet | Drawer notice strip for edits | No loaded Episode means no player | Playback errors remain contextual | Play/Pause at center; drawer Back/Close | Named controls, Chapter and queue context |
| Second tab | Ownership screen changes after takeover | Ownership gate, not an error dialog | “Use here” choice | None | Not applicable | Full-page ownership gate | Use here | Explains one active tab |

**Mismatch:** View edits advertise persistent Undo, whereas Playlist Name/Clear on Played and rule-setting edits simply apply. The current-value confirmation is understandable, but recovery is less uniform. This is a code/inventory craft gap; it is not an independently measured FLOW-07 failure. More seriously, the toast’s Undo and keyboard Undo take different recovery paths: only keyboard Undo populates Redo (**DATA-04**).

**Consistent patterns:** Primary create/add actions occupy header trailing regions; field errors stay near their cause; destructive actions are separated from routine controls; common reversible Episode/Playlist actions share one toast system. First-run help stays after the first subscription instead of disappearing under the person.

## Checklist

**Coverage: 90.0%** = (85 pass + 5 fail) / (85 pass + 5 fail + 10 N/O). **N/A: 5**, excluded. Total core/web IDs: **105**. Five failing IDs describe **four defects**; DATA-01 and WDATA-01 share one draft-persistence finding and are not treated as two independent losses or additive score penalties. Evidence codes: **F** supplied measured flows; **R** live probes; **C** source; **S** captures. A source-backed pass is not a claim that every real-device combination was exercised.

### Failures by severity

1. **DATA-01 — blocker; WDATA-01 — major. New-item dialog work is lost when its tab closes.**
   - **Where:** New Playlist; shared draft mechanism also covers Save as View, Add podcasts and Add to Playlist’s creation state.
   - **Evidence:** R: entered **“Night walks draft”**, confirmed `{kind:"playlist", name:"Night walks draft", clearOnPlayed:false}` in `podlist:dialog-draft`, closed the tab without choosing Cancel, opened the same origin in a fresh tab, then opened New Playlist. Name was empty and the new draft contained `name:""`. `probes.json`, `closed_tab_draft`; `draft-before-close.png`. C: `packages/web/src/lib/dialogDraft.ts:60` and `:69` read/write **sessionStorage**, which does not survive closing that tab. This is confirmed loss of unsaved dialog work, not loss of committed Playlists.
   - **Concrete fix:** Persist recoverable drafts in IndexedDB or localStorage, scoped by server/profile and draft identity. Restore them after a tab closes; clear them after successful completion or explicit discard. Preserve tab ownership without relying on tab-lifetime storage. Add a closed-tab recovery check to the fixture workflow.
   - **Principle / effect:** `forgiveness`; DATA-01 caps Interaction & feedback at **4.9**, and hence Overall at **6.9**. WDATA-01 records the web-specific persistence violation of that same root cause.

2. **WTYPE-02 — major. Enlarged text outgrows the short desktop sidebar and player controls.**
   - **Where:** Shared shell, most visible at the supported 720×450 desktop size with root text enlarged from 16 to **32 px**.
   - **Evidence:** R: “New this week” and “Under 30 minutes” each have a **36 px** row box but **62 px scrollHeight**, with successive row tops only **38 px** apart. Their wrapped labels overlap. The rem-sized skip symbols also grow beyond fixed 44 px button boxes beside Play. `probes.json`, `text_resize`; `text-200-short-desktop.png`. The overlap was observed both while editing a View and on Episode detail. Normal 16 px text at this viewport did not show this defect. This is a text-enlargement stress case, not a claim that the supplied “zoomed” flow alone failed.
   - **Concrete fix:** Prevent sidebar rows and its footer items from flex-shrinking below their text’s natural block height; allow the navigation’s content to scroll. Size player glyphs to their available button box, or let the button/transport group grow with the glyphs. Retain a useful content viewport in short windows. Verify 200% text at 720×450 and 1440×900.
   - **Principle / effect:** `adaptability`; Typography capped at **6.9**. Do not count the same enlargement defect again under WIN-03, TYPE-05 or WTYPE-05.

3. **DATA-04 — major. Redo cannot reapply an edit undone through the visible toast.**
   - **Where:** Shared confirmation toast, demonstrated with Episode Star.
   - **Evidence:** R: unstarred a Starred Episode, used its toast’s **Undo**, then pressed **⌘⇧Z**. The Episode remained Starred and the notice said **“Nothing to redo.”** `probes.json`, `toast_redo`; `redo-after-toast-undo.png`. C: `components/feedback/useConfirm.ts:81` removes the step and calls `undo`, without putting it on the Redo stack; `UndoShortcut.tsx` does populate that stack for keyboard Undo.
   - **Concrete fix:** Route the toast button and shortcut through the same undo transition, retaining the step’s `again` operation on the Redo stack. Redo should restore the unstarred state here, with feedback and correct focus. Verify both input paths against the same action sequence.
   - **Principle / effect:** `forgiveness`, `conventions`; Interaction & feedback has a major failure in addition to the existing blocker cap.

4. **CTRL-04 — major. Contradictory View length bounds are accepted without field-specific feedback.**
   - **Where:** View editor and the shared Search refinement form.
   - **Evidence:** R: selected **At least 60 min** and **At most 10 min**. The saved View summary became **“60 min–10 min”** and the preview showed zero Episodes with generic widening advice. Neither select was marked invalid and no error explained the reversed bounds. `probes.json`, `range_validation`; `impossible-range.png`. C: `components/views/ViewForm.tsx:389` and `:414` update independent bounds without cross-field validation. Search uses the same form.
   - **Concrete fix:** Retain both values and show a message beside Length: “At most must be 60 minutes or more.” Associate it with the two controls and announce it politely. Clearly distinguish an impossible range from a valid range with no matches; apply the same ordered-bound rule to From/To dates. Do not silently swap the person’s values.
   - **Principle / effect:** `feedback`, `forgiveness`; the Controls group caps Consistency & polish at **6.9**.

### Every-ID verdict ledger

| ID | Verdict | Evidence |
|---|---|---|
| FLOW-01 | pass | F: 72 supplied states; delayed catalogue/playing comparisons retain measured core positions. |
| FLOW-02 | pass | F focus/scroll records; R dialog input typing and transitions; C late-result handling does not deliberately steal input focus. |
| FLOW-03 | pass | C: ViewForm typing guards; AddPodcastSheet cancelled Search effects and URL-matched previews; no late completion clears a newer field value in inspected paths. The supplied flows themselves do not exercise typing races. |
| FLOW-04 | pass | F/S player/drawer follow-ups and takeover action; R Rewind confirmation fits at 320×740. Physical phone keyboard remains untested. |
| FLOW-05 | pass | S: result/detail/editor peers begin in their shared content region; unequal content height is deliberate. |
| FLOW-06 | pass | F fresh-device placeholders; C FirstRun keeps its card and sheet mounted as subscriptions arrive; explicit empty states. |
| FLOW-07 | pass | S/C header trailing create/add actions and shared settings-row alignment; no measured same-kind action-position failure. |
| KEY-01 | pass | C rowGrid, native controls, Base UI menus/dialogs; R Tab/Shift-Tab/Escape paths in sampled dialogs and drawer. |
| KEY-04 | pass | R Add field initial focus and focus return; C focus-visible rules and navigation heading focus. Enlargement defect belongs to WTYPE-02. |
| KEY-06 | N/O | International keyboard layouts were not exercised. |
| KEY-07 | pass | C rowGrid PageUp/PageDown/Home/End; native page scrolling and typing guards preserve field keys. |
| KEY-08 | pass | C Shortcuts component, sidebar entry, OS-aware hints and Settings single-key option. |
| DLG-01 | pass | C confirmations reserved for Unsubscribe/Rewind/loss; routine Episode actions use toasts. Creation forms are input tasks. |
| DLG-02 | pass | R “Rewind Commute to 14:30?” names the situation and its consequences. |
| DLG-03 | pass | R/C Cancel, Rewind, Create, Subscribe use result-oriented labels. |
| DLG-04 | pass | R Escape dismisses Add/Rewind; Rewind initially focuses Cancel. |
| DLG-05 | pass | C destructive styling and safe cancellation in ConfirmDialog/Unsubscribe; Delete separated in settings. |
| DLG-07 | pass | R/C no Cancel/Done/Back three-way combination in examined sheets. |
| DLG-09 | pass | C Base UI contextual player menus; input tasks use dialogs, not nested transient popovers. |
| CTRL-02 | pass | C LibraryTable sets mixed header checkbox state; existing checkbox settings remain checkboxes. |
| CTRL-03 | pass | R/C associated persistent labels in ViewForm, New Playlist, Add podcasts and SettingsRow. |
| CTRL-04 | **fail — major** | Contradictory 60–10 minute bounds; finding 4. |
| CTRL-05 | pass | C shared controls have active/pressed styling; Play emphasis uses blue without reducing peer hit areas. |
| CTRL-06 | pass | C contextual Episode/player menus; visible Play, Add and header task controls. Desktop hover-disclosure remains a craft limitation. |
| CTRL-07 | pass | R “Search the Library”; Add sheet explicitly searches the directory; no visible history without a clearing route. |
| CTRL-08 | N/O | Long-running import/download progress and cancellation not exercised under delay. |
| LIST-01 | pass | C LibraryTable uses a table; interactive Episode collections use grid semantics; navigation remains lists/links. |
| LIST-02 | pass | C short noun headings in Library; View/Playlist headings supply single-list context. |
| LIST-03 | pass | C LibraryTable heading controls reverse ascending/descending and expose aria-sort. |
| LIST-04 | pass | S separated rows, aligned facts, restrained selection; no path/filename columns needing middle truncation. |
| LIST-05 | pass | C subscriptionSettingsOpen persists disclosure state on this Device; one podcast disclosure at a time. |
| LIST-06 | pass | R/S persistent sidebar/bottom navigation and Timeline selection; native selects and checked action states. |
| LIST-07 | pass | C rowGrid supplies one Tab stop, arrow cells/rows, type-ahead and Enter; plain navigation links retain link behavior. |
| DATA-01 | **fail — blocker** | Closed-tab New Playlist draft loss; finding 1. |
| DATA-04 | **fail — major** | Toast Undo cannot be redone; finding 3. |
| DATA-05 | pass | C useConfirm refocus and grid/Playlist restoration focus helpers; R Star Undo visibly restores pressed state. |
| DATA-06 | pass | C scrollMemory restores history-entry scroll after asynchronous list readiness; remembered.ts persists last screen, Library sort and subscription disclosure. |
| DRAG-01 | pass | C SortableList plus row move commands; OPML drop area plus native file picker. |
| DRAG-03 | pass | C reordered Entries use undoable Playlist actions; OPML-added Subscriptions can be removed through management controls. |
| DRAG-05 | N/O | Pointer drag threshold, insertion/failed-drop visual feedback not observed in this audit. |
| DRAG-06 | N/O | Long-distance drag autoscroll and destination selection not observed. |
| PTR-03 | pass | C native pointer/scroll behavior; draggable handles and pointer links are separated from row actions. |
| PTR-04 | pass | C Tip uses Base UI Tooltip.Trigger for hover and focus; player and shell icon actions use it. |
| APPEAR-03 | N/O | Forced-colors and increased-contrast combinations were not emulated. Source has explicit fallback rules, but that is not a complete runtime result. |
| APPEAR-04 | pass | C/R/S inspected normal light/dark-surface palette: muted/page 5.73:1; muted/white 6.25:1; white/primary 6.81:1; player muted/dark 7.10:1. |
| APPEAR-05 | pass | C index.css changes sheet motion to opacity under reduced-motion; local positional transition rules opt out where declared. Runtime animation quality remains untested. |
| APPEAR-09 | pass | S consistent Lucide weights and recognizable play, skip, list, settings and status symbols. |
| APPEAR-10 | pass | S/C neutral controls, field edges and distinct player; field edge/white 3.57:1; controls do not depend only on shadows. |
| APPEAR-11 | pass | F sampled async states remain coherent; C loading rows and catalogue-ready gating. Not a high-frame-rate transition recording. |
| TYPE-02 | pass | R/S Inter and Space Grotesk use restrained regular/medium/semibold weights. |
| TYPE-03 | pass | C rem type tokens follow root font; isolated short-window failure is owned by WTYPE-02. |
| TYPE-05 | pass | C Episode notes have relaxed leading; reading paragraphs reflow. Enlargement overlap recorded once under WTYPE-02. |
| TYPE-06 | pass | C bounded Episode notes/Timeline prose and relaxed leading; narrow-phone line lengths are constrained by the viewport. |
| TYPE-07 | pass | S short tracked uppercase section labels; no app-owned underlined non-links or bold-italic reading blocks observed. |
| TYPE-08 | pass | C/S typographic quotation marks, ellipses and range dashes in inspected app-owned copy. Feed-authored text is exempt. |
| COPY-01 | pass | R/C domain terms distinguish View, Playlist, Episode, Played and Download Rule; task buttons use verbs. |
| COPY-02 | pass | C AddPodcastSheet and playback-problem copy give nearby practical recovery. The missing range validation is owned by CTRL-04. |
| COPY-03 | pass | R Trash, Search and stats empty states explain the next step; C Episode not-found links to Views. |
| COPY-04 | pass | S/C consistent sentence-style UI within the owner’s capitalized domain vocabulary; tooltips are action fragments. |
| AX-01 | pass | C/R accessibility tree gives names, grid cells, selected/pressed state, native slider valuetext, and named dialog controls. Actual screen-reader speech was not exercised. |
| AX-02 | pass | R/S Played text/checkmark, Star icon state, NOW/RESUME labels and selected navigation combine words/shapes with color. |
| AX-04 | N/O | Voice Control/Switch Control not exercised; non-drag controls exist in source. |
| AX-05 | pass | R visible play/pause, Position, Chapter and error information; no uncontrolled autoplay observed. |
| START-01 | pass | F fresh-device placeholder-to-catalogue flow; C LoadingRows leaves the shell available. |
| START-02 | pass | C FirstRun skip persistence and Settings/Help reopen route; no mandatory tutorial gate. |
| START-03 | pass | C contextual first-run steps, View matching hint, Add method guidance and setting explanations. |
| START-04 | N/A | No user-facing permission prompt in the assessed Android Chrome paths; persistence is requested after useful data exists. |
| START-05 | N/A | → START-04: no such prompt to explain. |
| START-06 | N/A | No user account/sign-in feature in the assessed app. |
| START-07 | N/A | No account-creation feature. |
| EDIT-02 | pass | C native editing fields preserve browser commands; custom grid handles applicable Select All/Copy without changing Delete’s clipboard behavior. |
| EDIT-05 | pass | C rowGrid Copy uses Episode URL; RowMenu and sharing expose useful links. |
| WIN-03 | pass | F three widths; R 320 px samples reflow. The separate text-enlargement failure is counted once at WTYPE-02. |
| TOOL-06 | N/A | No user-hideable custom toolbar feature. |
| SIDE-03 | pass | C/R responsive navigation stays reachable through visible bottom links; desktop retains sidebar and keyboard routes. |
| SIDE-04 | pass | R/S active sidebar/bottom links, selected Episode state and Playlist subnavigation identify adjacent content. |
| SET-01 | pass | R/C Settings centralizes global playback/Trash/keyboard help; Playlist and Subscription options stay with their objects. |
| RESP-01 | N/O | Only two desktop actions timed; no complete per-action/phone timing coverage. |
| FOOT-02 | N/O | No representative long-list scrolling/frame timing performed. |
| BROWSER-01 | pass | R Back closes drawer and restores opener without changing underlying route; C overlay layers and scroll-memory restoration. |
| BROWSER-02 | pass | R/C Search words/refinements, selected Episode, edit mode, Playlist History/Timeline and stats have meaningful URLs. |
| BROWSER-03 | pass | R titles identify Search, Playlist settings, Timeline, Library, Subscription and Listening stats. |
| BROWSER-04 | pass | R/C navigation/detail routes are real href links; actions use buttons. |
| BROWSER-05 | pass | C shortcut guards preserve browser bindings; non-Mac Ctrl+K remains browser-owned; Mac-shell accelerators assessed separately below. |
| BROWSER-06 | pass | C RowMenu keeps link/field/selected-text browser menus, scopes custom menus to objects and offers alternate More controls. |
| BROWSER-07 | pass | R/C native input/select/file/range controls and Base UI APG components; no paste suppression. |
| BROWSER-08 | pass | C copyable text/links and native scrolling remain; selection is not globally disabled. |
| BROWSER-09 | pass | R/C phone drill-down Back and bottom navigation; drawer Back/Close; Mac shell also has Back/Forward commands. |
| BROWSER-10 | N/O | Supplied timings are not LCP/INP/CLS measurements or field p75 data. |
| WKEY-01 | pass | C rowGrid and Base UI composite menus; Playlist section navigation uses links rather than false ARIA tabs. |
| WKEY-02 | pass | C remembered single-key setting plus text-field guards. |
| WKEY-03 | pass | R input initial focus, dialog trap, Escape return, drawer Back return; C removed-row focus helpers. |
| WKEY-04 | pass | C scroll padding/toast reservation and focus helpers; R sampled modal/drawer controls stayed visible. Phone keyboard not tested. |
| WDATA-01 | **fail — major** | Session-only draft storage; shared root with DATA-01, finding 1. |
| WDATA-02 | N/O | Quota-denied/full-storage behavior not exercised; no blanket durability claim made. |
| WDATA-03 | pass | C named-field validation retains text and associates error messages; the absent range validator is CTRL-04’s single finding. |
| WDATA-04 | pass | C reversible-action toasts use timeout 0, errors persist in context, status surfaces are live; transient success has visible state elsewhere. |
| WCOLOR-01 | pass | C explicit color-scheme: light; owner’s single-theme decision satisfies the rule. |
| WCOLOR-02 | pass | C/R blue consistently means interaction/selection/focus; white/blue 6.81:1, meaningful blue focus on light exceeds 3:1. |
| WTYPE-01 | pass | C/R 15 px list body, 13 px metadata and 12 px short labels/skip numerals at normal root; no required sub-12 px text established. |
| WTYPE-02 | **fail — major** | 200% text causes short-desktop sidebar overlap and oversized player symbols; finding 2. |
| WTYPE-03 | pass | R Episode detail at 720×450 survived 1.5 line-height, 2em paragraph margin, .12em letter and .16em word spacing. Other screens are C-backed flexible layouts. |
| WTYPE-04 | pass | R/C primary controls generally 40–48 px; scrubber 24 px high; small checkboxes use labels or adequate target-spacing exceptions. |
| WTYPE-05 | pass | F responsive layouts; R sampled 320 px screens have scrollWidth=innerWidth=320. Enlargement defect is separately WTYPE-02. |
| WCOPY-01 | pass | C OS-aware modifier display in Shortcuts/AppShell; R Mac notation matches observed bindings. |

**N/O:** KEY-06, CTRL-08, DRAG-05, DRAG-06, APPEAR-03, AX-04, WDATA-02, BROWSER-10, RESP-01, FOOT-02.

**N/A:** START-04, START-05 → START-04, START-06, START-07, TOOL-06. **All Mac-only IDs: N/A → explicitly requested web target**, outside the 105-ID denominator.

## Scores

Scores use the guide’s bands and caps, not an arithmetic average. Light appearance includes the dark player surfaces. An N/O checklist item does not trigger a cap or count as a pass.

| Category | Score | Evidence / anchor | Principle |
|---|---:|---|---|
| Typography | **6.9** | Otherwise Strong: deliberate Inter/Space Grotesk scale, 15/13 px row/fact relationship and readable notes. WTYPE-02’s overlapping enlarged navigation prevents Strong under the mandatory major cap. | accessibility, adaptability |
| Hierarchy | **8.7** | Strong: destination heading, Episodes and blue Play lead; editor replaces a secondary panel without changing the finding/listening model. Default desktop row commands recede so far that a newcomer initially sees mostly Play; the task hierarchy needs a clearer Add/Next/Last affordance before Exemplary. | hierarchy, discoverable-commands |
| Spacing & density | **8.6** | Strong: aligned 32 px desktop content edge, generous selectable rows and 40–48 px primary targets. At 320 px, artwork and two trailing controls leave narrow title columns with three-line titles and wrapped facts; the layout works, but scanning rhythm could be better tuned. | craft, content-first |
| Color & contrast | **9.0** | Exemplary in inspected normal light/dark-player appearances: restrained blue, separate destructive red, readable muted text (5.73:1 on page; 7.10:1 on player), field edges 3.57:1 on white. Forced-colors combinations remain N/O; this is not certification of those modes. | color-restraint, accessibility |
| Iconography | **8.8** | Strong: consistent Lucide family, recognizable skip numerals and labeled Episode actions. Next/Last queue symbols rely on contextual learning, and enlarged skip glyph containment is less finished than the default state. | craft, conventions |
| Consistency & polish | **6.9** (**stability 8.8**) | Most states are deliberately designed and supplied flows show no substantiated stability failure. CTRL-04’s impossible range silently saved as an ordinary empty result imposes the major cap. Recovery differences between live-edit surfaces also keep the app below an all-corners Exemplary finish. Stability is Strong for the measured tasks; editing/import/restore flow evidence is incomplete. | stability, craft, feedback |
| Clarity | **8.6** | Strong: View versus Playlist is explained in context, Rewind says what it keeps, and Subscription settings distinguish this Device/default overrides. Stats leads with several model/upgrade explanations before the personal answer; the empty stats page could convey the same definitions with less initial reading. | plain-language, recognition-over-recall |
| Platform fit | **8.3** | Strong, from Looks **9.0**, Behaves **7.9**: (9.0 + 2×7.9)/3 = 8.3. Real URLs/links, native fields, scoped object menus and installed-mode Back fit the web. Closed-tab draft loss is a concrete Foreign behavior. Mac shell assessment below is code-based, not a separate native-app grade. | conventions, stability |
| Interaction & feedback | **4.9** | Weak by mandatory DATA-01 blocker cap: confirmed new-item draft loss on closing a tab. DATA-04 additionally breaks Redo after visible Undo. Native controls, persistent Undo notices, explicit cancellation and drawer focus handling earn the top of the capped band, not exemption from it. | forgiveness, user-control |
| **Overall** | **6.9** | Serves discovery and listening with a visually Strong shell, but recoverable work and reversible edits are part of the primary task. At the ceiling allowed by the lowest category: 4.9 + 2.0. This is the rubric-capped result, not a claim that the visual design is uniformly 6.9. | forgiveness, craft |

**Platform-fit signals:** Web L1 Adapted (full viewport frame); L2 Adapted (brand type); L3 Adapted (native/Base UI controls); L4 Native (href navigation); L5 Native (OS-aware hints); L6 Adapted (brand selection and distinct ring); L7 Native (declared light scheme); L8 Adapted (responsive panels). Web B1 Native (history plus overlay handling), B2 Native (routes/titles), B3 Native (links), B4 Adapted (scoped custom object commands), B5 Native (HTML fields), B6 Adapted (grid/menu/focus helpers), **B7 Foreign** (closed-tab draft loss), B8 N/O (complete Web Vitals), B9 Adapted (installed navigation). Verdicts describe platform grammar; they are not a tally-to-score formula.

**Mac desktop shell:** `packages/desktop/src/main.ts` supplies a real BrowserWindow, minimum **720×450**, remembered bounds, view-specific window titles, and App/File/Edit/View/Controls/Go/Window/Help menus. Settings has ⌘,; Undo/Redo labels are contextual; transport shortcuts preserve text-editing contexts; native object menus include Open in Browser/Copy Link, with editing/spelling/lookup commands on text. These are useful adaptations of the web app to a Mac window. This audit did not launch `_electron`, exercise native menu focus, or assess Services/window restoration firsthand. Settings remains a routed web page, and many contextual actions remain in the content rather than exhaustive menu-bar commands; those are native Mac craft limits, not scored Mac-only failures under the owner’s stated web target. The shared short-window text defect is particularly relevant because 720×450 is the shell’s actual supported minimum.

**Top craft gaps to reach 9.0 after the caps are removed:**

- Make recovery uniform: the visible Undo route and keyboard route must share Redo, and live object edits should offer a clear equivalent recovery route. Persistent draft recovery is the first requirement, not an appearance change.
- Finish text-size behavior inside the existing shell. Sidebar row layout and transport glyph sizing should adapt as carefully as the Episode action group already does.
- Tune the 320 px list rhythm: slightly reduce decorative artwork/gaps before compressing the title column; retain 44 px Play/Add hit areas and the owner’s row actions. This is about readable title/fact grouping, not denser navigation or a different layout variant.
- Improve desktop action signifiers without exposing a wall of icons: keep Add or a labeled More affordance evident before hover, and make the Next/Last destination relationship obvious on first inspection.
- Edit the Listening stats introduction into a short personal summary, with durable definitions beside the affected metric or in a disclosure. Keep the chart and complete table alternative. This preserves capability while reducing the current paragraph-first hierarchy.

## Next step

**Target:** DATA-01, closed-tab dialog draft recovery — the only confirmed blocker.

**Anti-pattern:** Partial state restoration: persisted committed data, but tab-lifetime draft recovery. No visual anti-pattern name is needed to describe this data-safety root cause.

**Root cause:** All four draft kinds share a storage abstraction whose lifetime ends with the tab. Reload recovery looks convincing, but the lifetime does not meet the task’s closed-tab expectation.

**Candidate 1 — preferred:** Move recoverable draft payloads to server/profile-scoped durable browser storage, restore pending drafts on a new tab, and delete on completion or deliberate discard. Preserve multiple drafts by identity rather than overwriting one global draft. Principle: forgiveness. Expected improvement: Interaction & feedback and Platform fit; no visual character change. Risk to manage: restoring stale drafts or a draft from another server.

**Candidate 2:** Persist minimal creation form values in the app’s local database, with the same explicit lifecycle. This also closes the lifetime gap but costs more schema/integration work. Same character preservation and expected categories.

After recovery is concrete, fix the toast Redo transition, impossible-range feedback and text containment. Clearing these caps is necessary for 9.0; it does not itself establish Exemplary craft. Rerun editing, creation, close/reopen, Undo/Redo and text-enlargement flows, then resolve the remaining N/O checks with representative devices.

## Log (when iterating)

Assessment only. No implementation iteration, acceptance/revert cycle, or claim of improved scores. All five fixed signature elements remain unchanged. Both report copies are identical; app code/tests/configuration remain unmodified.
