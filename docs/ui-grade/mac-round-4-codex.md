# PodList Mac UI grade — round 4, Codex

Independent audit of **c4e05eb**, 15 November 2026. **Overall: 8.0/10.** No verified blocker; the major failures below cap Color & contrast, Consistency & polish, Platform fit, and Interaction & feedback at 6.9. This report uses only this build, the specified round-4 evidence, its source, and the supplied UI standard. No earlier grading report or UI-GRADE.md was opened. No app was launched, no owner desktop was controlled, and no application code was changed.

## Frame

- **Task:** Find podcast Episodes, organize them into ordered Playlists, listen with a persistent player, and recover/edit the resulting Library and listening context.
- **Target:** Native **Mac app**, SwiftUI/AppKit, macOS 26+; evidence captured on macOS 27.2 in a VM.
- **Posture:** Sovereign personal Library/organizing tool with background audio; short lookup/edit tasks are transient within it.
- **Audience:** Perpetual intermediate, with newcomers learning the View/Episode/Entry distinction and experts using keyboard commands/automation.
- **Nearest exemplar:** Things for calm personal-list hierarchy, coherent selection and forgiving edits; BBEdit for complete commands, native text behavior and durable workspace state. These are behavior/craft references, not visual templates.
- **Character:** Blue accent and initials-based artwork fallback (**fixed**); source-list → Episodes/Entries → Inspector composition; explicit Playlist Position, History and Listening Timeline vocabulary; persistent bottom transport (**fixed**); restrained regular Liquid Glass on control surfaces (**fixed**). All five remain intact in this report’s proposed changes.

**Owner decisions:** Keep #2B50C8 / #9DB1FF accent, with #193A9B / #B2C1FF Increase Contrast variants; bottom transport; Light/Dark/System preference; a small, noncustomizable toolbar; two-click same-control Unsubscribe with automatic disarming and Undo; glass on the player, Inspector actions, Now Playing and View footer; Spotlight approved but implemented last; MCP off by default and App Intents on. All are graded, but none is a fix target. A timer that only disarms Unsubscribe is not an expired Undo: recovery remains available in edit history.

**Baseline and evidence notation:** `LNN` / `DNN` mean the named `.png` and adjacent `.txt` in `/Users/sarvagnan/Documents/podlist-grading/mac-round-4/light/` or `/dark/`. For example L03 = `light/03-episode-inspector.png` + `.txt`; L34a = `light/34a-timeline-rewind-button.png` + `.txt`. The evidence README maps all 35 names. All 70 supplied screenshots were visually inspected; the matching AX snapshots and menu dump were consulted for roles, values, enabled/selected state and geometry. Screenshots are 2×: pixels ÷ 2 = points. Coordinates quoted from AX are already points. Code filenames without a prefix mean `apps/apple/Sources/PodListUI/`; `PodListMac.swift` means `apps/apple/Sources/PodListMac/PodListMac.swift`; other `PodListMac/…` and build-script paths are explicit. Source line numbers refer to c4e05eb.

## Flows

**Evidence review, not a fresh flow run.** The supplied XCUITest tour (`apps/apple/UITour/PodListUITour.swift`) records real app states with fixed demo data and paused playback. It does not supply the full CRITIQUE delayed-completion/timing measurements. Its limited Playlist-header assertions do not establish every task’s stability.

| Task/state sequence reviewed | Supplied evidence | What it establishes |
|---|---|---|
| Subscriptions → saved View → selected Episode → add to Playlist → player | 01 → 02 → 03 → 23; 06, 26 | Navigation, selection, semantic controls, destination choice and visible transport; source establishes the shared actions. Actual mutation/playback latency is unobserved. |
| Playlist → Entry → History → Timeline → Rewind preview | 06 → 07 → 08 → 09 → 34a → 34 | Section structure, current Entry, truthful empty History, visible rewind route and explicit consequence preview. Completion/Undo movement is not captured. |
| Playlist settings → rename; create/delete/restore | 10 → 11 → 12; 13, 14 | Native sheet sizing, focused rename, safe creation, Trash retention explanation; persistence/Undo checked in source. The empty Trash capture is not evidence of a completed delete/restore. |
| Library search → save/edit View | 15 → 16/17 | Search query, result count, labeled optional filters, match count and consistent footer. No late-result typing probe exists. |
| Podcast → expand description → arm/disarm unsubscribe → subscription/download settings | 18 → 19 → 20 → 21 → 22; 25 | Same-control reversible unsubscribe presentation, native fields and per-device rule scope. The supplied states do not measure the four-second production timeout. |
| Add Podcasts → repeated search/subscribe | 24 plus `PodcastScreens.swift:14` | Empty lookup and implemented repeatable loop; source identifies modal presentation, canceled stale search and subscribed state. Results/working states are not pictured. |
| Now Playing, Settings, automation, stats, help, multiselection | 26 → 27–30; 31, 32, 33 | Task windows, global settings, opt-in MCP disclosure, stats empty state, tutorial dismissal and batch summary. |

**Widths/appearances:** Main Library is 1180×760 pt; minimum 760×500 pt is declared in source but not captured. Half-display/tiled layouts are not captured. Both Light and Dark are supplied for every state. Settings General is 600×795 pt; Automation is 600×224 pt in the snapshots. Device information is limited to the brief’s Retina macOS 27.2 VM, 1920×1200 pt desktop; CPU/RAM/refresh rate and throttling are not stated.

**Timed runs, script measurements and strips:** No six-run latency sample, keystroke frame timing, hitch trace, controlled two-second late arrivals, or per-step focus/scroll/input JSON/CSV accompanies the tour. This audit adds none because launching/driving the app is prohibited. The captures are state evidence, not an instrumented screenshot strip. FLOW-01/02/04 and RESP-01/02 remain N/O. FLOW-03 can be source-audited; FLOW-05/07 can be judged statically. **Stability sub-score: N/O in both appearances**, with no band cap inferred. FLOW-06 is a static empty-section defect; no unmeasured movement is alleged.

The limits are: no measured transitions/narrowest follow-ups; no live Full Keyboard Access, complete focus-order/type-select/page-key check, drag onset/inactive-window drag, live resize, long-list hitch/latency/footprint measurement, actual Zoom toggle, Help search execution, complete 200% window layout, assistive-input session, or Settings close/reopen recall. Native implementation receives credit where its contract is visible in source; the remaining experiential clauses cannot be settled by framework choice alone.

## Cross-screen inventory

“None” means absent in the pictured state; source-only variants are explicitly marked C. Ordinary primary text/neutral surfaces are **neutral**; failures use readable **red** off glass and primary text on glass. Every row covers Light and Dark unless named otherwise.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library, View, Search, subscriptions (01–05, 15, 33) | C: reserved 32 pt edit row below sync; action-specific neutral sentence | C: same edit row, red + Retry; sync row has recovery | None | C: named Undo/Redo in same row + Edit menu; persistent history | Inspector centered “Select an Episode”; C: no matches/no subscriptions with next step | None | Trailing toolbar and inline add/play; Search has Create View above results | View conditions above table; tooltips |
| Playlist Entries/History (06–08, 10) | C: same Library edit row | C: same row, red + Retry | None | C: same row/menu | Centered No History explains playback versus manual Played; C: empty Entries has Find Episodes | None | Section picker and Play This Playlist above list; row Play from Here | Current Entry label, Position and Length columns |
| Timeline/Rewind (09, 34a, 34) | C: edit row after completion | C: Rewind sheet edit feedback | Rewind sheet names target and what is reset/kept, neutral | C: named Rewind Undo in shared history | C: No Listening Timeline + play instruction | Parent sheet dimming | Rewind to Here per event; trailing Rewind in preview | Permanent Listening log and later additions explained |
| New Playlist/Add to Playlist/bulk rules (13, 23, 25) | C: edit row; successful task closes | C: shared EditingFeedback, red + retry | Named destination/placement/rule sheet | C: history persists in Library/menu | None | Parent sheet dimming | Trailing Create Playlist / Play Next / Apply; Cancel leading | Active destination and per-device scope |
| Playlist settings/rename (11–12) | C: shared edit row | C: near name/shared edit row | Done-only outer sheet; inner rename has Cancel Rename/Save | C: named history in edit row/menu | None | Parent sheet dimming | Trailing Done; local Rename/Save by name | Clear on Played timing and Trash retention explained |
| View editor (16–17) | C: shared EditingFeedback above footer | C: field-specific red message or footer edit error | Cancel/Done footer | C: same feedback component, footer position | None | Parent sheet dimming | Trailing Done; Delete leading for existing View | Optional labels, match count, All Conditions Must Match |
| Podcast (18–21) | Subscribed checkmark + neutral text; C: Library status sentence | C: red + Retry near load; named Library feedback | Armed Unsubscribe is red label + minus symbol on same button | C: persistent Library history; timer only disarms | C: No Episodes/No Matches + refresh/clear | None | Same header subscribe/share/settings; inline add/play | Show Description/Show Less; per-device rule label |
| Subscription settings (22) | Live values; no saved banner | C: shared edit feedback | Done-only sheet | C: same named edit history | None | Parent sheet dimming | Live pickers; trailing Done | Default inherits global Playback Settings |
| Add Podcasts (24) | C: inline Subscribed check + shared feedback | C: near lookup, red + Retry | Repeatable lookup in blocking sheet | C: same history row | Find Your Next Podcast with feed example | Parent sheet dimming | Search beside labeled input; trailing Done | Feed-address example; import continuity text |
| Player / Now Playing (26 and all Library states) | Current metadata/position, neutral | C: Retry at bottom player/on-glass primary; inline in Now Playing | None | No playback-seek Undo; Library edit history stays separate | C: No Current Entry | None | Persistent bottom transport; matching controls in Now Playing | Speed/sleep, tooltip actions, Chapters when supplied |
| General/Automation Settings (27–30) | Live values; no generic Saved banner | C: near changed global setting, red + Retry; MCP inline | None | Library settings use shared underlying edit history; no pictured Undo | None | None; separate native window | Live fields and task-specific import/connect controls | Import continuity, text-size note (clipped), MCP access disclosure |
| Listening Stats (31) | None | None pictured | None | None | “Play an Episode…”; **Top Podcasts has no empty row** | None | Show Daily Table | Metric definitions above chart |
| Getting Started (32) | None | None | Dismissible tutorial sheet | None | None | Parent Settings sheet dimming | Trailing Dismiss | Three short tasks plus Add Podcasts shortcut |
| Trash (14) | C: restored Playlist status in edit row | C: shared edit row | C: irreversible purge confirmation names retained data | C: named history for restore/delete; purge intentionally not undoable | Centered Trash Is Empty, explains restore | Only C: purge confirmation | C: row Restore; context/menu Delete Permanently | Retention text above list |

**Mismatches and limits:** The shared EditingFeedback component deliberately moves from the Library’s reserved status strip to the View editor footer or a task sheet’s content area; that is scoped feedback for different task surfaces, not evidence of an unprompted shift. Failure recovery consistently says Retry and uses the same off-glass red; on-glass primary text is a deliberate readability adaptation. New/Edit View commits occupy the same footer region. The actual mismatch is Stats’ bare Top Podcasts heading versus the explicit zero states in History/Trash/lookup (FLOW-06). No transient success, error-arrival or Undo screenshot exists, so cross-screen timing, dismissal/focus changes and the stability sub-score are not certified from this table.

## Checklist

**Coverage: 87.3%** (pass 112 · fail 19 · N/O 19 · N/A 18). There are 168 current core + Mac IDs. Coverage = (pass + fail) ÷ (pass + fail + N/O) = 131/150; N/A items are excluded. Each ID has exactly one disposition below. Severity is the checklist’s severity, not a newly invented severity based on screenshots. No missing parent feature is failed again through its dependents.

### Failures by severity

**Blockers: none verified.** N/O keyboard/assistive cases are not assumed to pass.

#### Major

**CTRL-03 — fail (major): Persistent labels disappear in Welcome and Go to Time.**

Evidence: `ConnectionViews.swift:15` creates the Welcome address field outside a Form, with no separate visible label; `PlayerViews.swift:256` does the same for Position in seconds and prepopulates it at line 264. The visible field title becomes a placeholder and is absent when the field contains a value. This is distinct from the correctly labeled Add Podcasts field in L/D24 and New Playlist in L/D13. Neither problematic state was captured; this finding is from code.

Concrete fix: Wrap each field in `LabeledContent` or put a persistent text label above it; keep the numeric seek value and seconds unit visible. Principle: `accessibility`.

**CTRL-08 — fail (major): A known-size OPML import remains indeterminate and cannot be stopped once running.**

Evidence: `OPMLImportContent.swift:18` uses the indeterminate `ProgressView("Importing … of …")` despite having completed and total counts; `MacWindow.swift:128` repeats it. The Cancel action at `OPMLImportContent.swift:32` is available only during preview (`importReady`), not while busy. L/D27–29 show the entry point; an active import is not captured. Download progress, separately, is determinate and cancellable (`DownloadViews.swift:84`).

Concrete fix: Use completed/total determinate progress and a Cancel Import command during execution that retains completed imports and the resumable remainder. Principle: `feedback`.

**DATA-06 — fail (major): The chosen sidebar width does not survive restoration.**

Evidence: `MacWindow.swift:116` explicitly says the sidebar width is not restored; line 118 always proposes 225 pt. `WindowRestoration.swift:173` contains a sidebar-width field, but only the Inspector width is measured and written (`MacWindow.swift:185`). L/D01–10 establish the normal split workspace, not a relaunch test. Other context restoration is substantial and receives credit.

Concrete fix: Capture the actual native sidebar divider width and restore it per scene with the existing WindowContext archive; retain the existing selection, scroll and Inspector-width restoration. Principle: `stability`.

**DRAG-04 — fail (major): A Library drop silently ignores every transferred item after the first.**

Evidence: `LibraryDrops.swift:35` obtains all providers but line 36 selects only `providers.first`; the callback stages only that one feed or OPML file. Two accepted feed URL items or two OPML files therefore do not form a multi-item import. This is separate from the correctly supported multi-Episode payload in `EpisodeTransfer.swift:47`. L/D01 and L/D24 show the destination and existing preview; no drag was captured.

Concrete fix: Decode all supported providers into one ordered, deduplicated preview/queue and account for each item, including rejected items, before importing. Principle: `direct-manipulation`.

**DRAG-06 — fail (major): Slow publisher-Episode drops have no pending row or progress.**

Evidence: `EpisodeTransfer.swift:80` awaits `prepareEpisode` for publisher references before adding any Entries or calling the selection callback; `LibraryEditingModel.swift:229` awaits `source.bringEpisode`. No pending-drop state, destination placeholder or progress is published during that interval. The ordinary list drop wrapper at `EpisodeTransfer.swift:114` simply starts a Task. L/D18 is the publisher source and L/D06 the destination; a slow drop is not captured. Native autoscrolling itself remains unverified.

Concrete fix: Publish pending-drop IDs immediately, render destination placeholders/progress while preparing each Episode, then replace and select them on success; preserve an actionable failure for unsuccessful items. Principle: `feedback`.

**WIN-03 — fail (major): General Settings clips explanatory content at its own default width.**

Evidence: L/D27–29 visibly cut the Text Size explanation at the right window edge. The L27 AX window is x=660, width=600 pt; the explanation is x=808.75, width=464.5 pt, ending at 1273.25: **13.25 pt outside** the window ending at 1260. `ConnectionViews.swift:66` fixes the Settings width at 600; the column Form and paragraph are in `LibrarySettingsScreens.swift:76` and `MacTextSize.swift:65`. The same layout occurs in both appearances, so this is not a thumbnail artifact.

Concrete fix: Constrain the Form and its explanatory rows to the available content width, with wrapping inside the trailing inset; verify the full sentence at 100% and 200% text and on a smaller display. Principle: `adaptability`.

**WIN-05 — fail (major): Essential transport controls are at the bottom window edge — owner decision.**

Evidence: L/D01–25 and 33 show Play/Pause, skip, seek, speed and sleep in the bottom player. `MacWindow.swift:192` installs it with a bottom safe-area inset; `PlayerViews.swift:16` defines the transport. The Controls menu, Space and Now Playing provide alternate routes, but the bottom bar still contains critical controls rather than limited status.

Concrete fix: Strict checklist remedy would be a persistent upper transport surface. **Do not implement or target it:** the owner explicitly retains the bottom player; preserve the menu and keyboard alternatives. Principle: `content-first`.

**SET-02 — fail (major): Settings duplicates macOS appearance choice — owner decision.**

Evidence: L/D27–29 show Appearance; `LibrarySettingsScreens.swift:78` offers System, Light and Dark. The System option and application-wide controller correctly satisfy APPEAR-01, but the duplicate preference still fails this stricter Settings check.

Concrete fix: Strict remedy would be to follow macOS without an override. **Do not implement or target it:** retain the owner-approved three choices. Principle: `respect`.

**DLG-07 — fail (major): Live settings are placed in Done-only sheets.**

Evidence: L/D11 and L/D22 show only Done at the sheet level, with no paired Cancel or Back. `PlaylistSettingsViews.swift:147` immediately writes Clear on Played and line 157 supplies only Done; `PodcastScreens.swift:406` onward similarly presents live Subscription settings. L/D12 adds Cancel Rename for the inner rename task, not a sheet-level exit pair.

Concrete fix: Present these live settings modelessly with Close/Done, or give a transactional sheet an explicit Cancel that actually restores its changes. Do not add a misleading Cancel to a live-writing sheet. Principle: `user-control`.

**DLG-08 — fail (major): Repeated podcast lookup and subscription work blocks its Library window.**

Evidence: L/D24 shows Add Podcasts as a sheet. `MacWindow.swift:219` presents it modally; `PodcastScreens.swift:33` through 65 supports repeated searches and independent Subscribe buttons. This is an input-and-observe loop, not just a one-shot confirmation. It prevents checking the parent Library while leaving that lookup open. The inline Episode Inspector is appropriately modeless and is not the finding.

Concrete fix: Use a real modeless Add Podcasts panel/window with the existing draft and search state; for a panel, supply the documented activation, floating and Mission Control behavior. Principle: `user-control`.

**APPEAR-02 — fail (major): App-controlled accent ignores the person’s system accent — owner decision.**

Evidence: `MacWindow.swift:44`, `PodListMac.swift:49` and `MacAppearance.swift:82` apply the brand palette. L/D03, 18 and 25 show branded action labels and controls. Some native selection/segment colors remain system-defined, which does not make the app-wide override follow the user’s choice.

Concrete fix: Strict remedy would be the system accent in controls/navigation. **Do not implement or target it:** retain the specified blue and its Dark/Increase Contrast variants. Principle: `conventions`.

**SYS-05 — fail (major): Library content is not indexed in Spotlight — owner-approved deferral.**

Evidence: No CoreSpotlight/CSSearchableIndex/IndexedEntity indexing or searchable-item handling exists in `apps/apple/Sources`; the bundle script registers only the Episode transfer UTI, not a searchable document integration. App Entities in `PodListMac/AppIntents.swift:20` are queryable by intents and do not themselves implement Spotlight indexing. Spotlight is not captured.

Concrete fix: Implement the approved Spotlight metadata and content routing **last**, in the owner’s chosen order; do not register this development build in the owner’s index during this audit. Quick Look/importer clauses for custom document types are N/A. Principle: `discoverable-commands`.

#### Minor

**FLOW-06 — fail (minor): Listening Stats shows an empty Top Podcasts section.**

Evidence: L/D31 shows the zero-listening state and a Top Podcasts heading at the lower edge. `LibrarySettingsScreens.swift:332` unconditionally emits that heading and then only `ForEach(stats.podcasts)`; with the shown zero-data fixture there is no explanatory empty row. This is a static empty-shell finding, not a measured transition or stability sub-score.

Concrete fix: Hide the heading while the ranking is empty, or show “Play an Episode to see your top podcasts here.” Principle: `craft`.

**APP-01 — fail (minor): The standard About panel has no supplied copyright information.**

Evidence: `menus.txt` has About PodList in its own group and the bundle script supplies version 0.1.0/build 1. `apps/apple/scripts/build-mac-app.sh:23` through 39 supplies neither NSHumanReadableCopyright nor an About override/credits resource; `PodListMac.swift` does not supply one. About itself was not captured.

Concrete fix: Add the owner’s approved copyright string to the bundle metadata or standard About options. Principle: `conventions`.

**DATA-05 — fail (minor): Undo reports an edit but does not reveal restored offscreen content.**

Evidence: `PlaylistEditingModel.swift:105` reverses the edit, reloads, and sets a status including restored Playlist names, but does not publish a destination/row reveal. Existing scroll restoration preserves the old anchor (`MacRowScroll.swift:64`). Restoring a removed offscreen Entry or deleted Playlist therefore does not bring that content into view. L/D14 shows the recovery area; an Undo result is not captured.

Concrete fix: Publish a reveal destination/row with successful Undo and have the initiating window select and scroll to the restored item, without taking text focus. Principle: `feedback`.

**DRAG-05 — fail (minor): Accepted Library drops can fail without visible feedback.**

Evidence: `LibraryDrops.swift:29` accepts broad file-URL/text types, reports a copy proposal, then line 39 silently returns if loading or classification fails, while performDrop already returned true. A non-OPML file, invalid URL text, or unreadable provider can appear accepted and do nothing. L/D01 is the destination; no drag is captured.

Concrete fix: Show a persistent, contextual rejection explaining accepted feed-address/OPML formats and recovery; keep the native forbidden/copy cursor and destination cue consistent with the decoded payload. Principle: `feedback`.

**PTR-04 — fail (minor): Tooltip coverage is incomplete.**

Evidence: `MacWindow.swift:161` has a New View toolbar symbol with no help modifier; `PodcastScreens.swift:218` has the icon-only Subscription Settings control without a tooltip. L/D18–21 show that gear. Many other icons have excellent action-specific help, but these omissions keep the whole check from passing.

Concrete fix: Add short action-specific help to these controls and audit all remaining icon buttons; keep the existing accessibility names. Principle: `discoverable-commands`.

**SYS-02 — fail (minor): No purpose-specific service receives selected feed addresses.**

Evidence: The Add Podcasts task accepts an address (L/D24), so “Subscribe in PodList” is a relevant selection-based cross-app action. Neither `build-mac-app.sh`’s Info.plist nor `PodListMac.swift` registers NSServices or a provider. Native text Services consumption is a separate APP-03 capability.

Concrete fix: Vend a service accepting selected URL/plain text, validate it, and stage the existing Add Podcasts preview rather than subscribing without review. Principle: `conventions`.

**SYS-03 — fail (minor): Views, Playlists and local Episode context have no stable app links.**

Evidence: `ShareLinks.swift:6` only accepts HTTP(S) publisher/enclosure URLs; there is no registered CFBundleURLTypes, onOpenURL, or universal-link routing in the bundle/scene code. Publisher sharing from L/D18 is useful but cannot reopen a saved View or Playlist such as L/D06.

Concrete fix: Add stable app URLs for Library-scoped destinations and an Open/Copy Link route; resolve missing content safely without starting playback. Principle: `user-control`.

### N/O

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, KEY-07, LIST-07, APPEAR-11, TYPE-05, AX-04, RESP-01, RESP-02, FOOT-02, WMENU-02, HELP-02, WIN-10, SET-04, DRAG-07, FOOT-01.

### N/A

| ID | Reason |
|---|---|
| DLG-09 | → no app-defined editing popover; native menus/sharing panels are not an editing popover |
| LIST-05 | → no app-defined expandable object hierarchy; captured sections group flat rows |
| START-05 | → no app-authored protected-resource permission request/purpose string in this build |
| START-07 | → no account creation feature |
| FILE-01 | → non-document Library; OPML is an import/export operation, not opening an editable document |
| FILE-02 | → no document/Open Recent model |
| FILE-05 | → no printing feature |
| FMT-01 | → no formatted-text editing |
| FMT-02 | → FMT-01 |
| DATA-02 | → non-document Library, no manual document save/dirty-dot model |
| DATA-03 | → non-document Library, no document Versions model |
| DATA-08 | → non-document Library; multiple Library windows are covered under WIN-08 |
| SYS-06 | → no required Safari, credential-filling or Finder Quick Action workflow; feed intake uses native drop/paste, assessed under DRAG-01 and SYS-02 |
| SYS-07 | → no task-specific Dock badge/preview requirement for this continuous audio player; system Now Playing is supplied |
| EXTRA-01 | → no menu bar extra |
| EXTRA-02 | → EXTRA-01 |
| EXTRA-03 | → EXTRA-01 |
| EXTRA-04 | → sovereign Library app, not a summonable quick-access utility |

### Passes

C = source; S = screenshots; AX = supplied XCUITest semantics/geometry; B = supplied menu/bundle facts. Passes are based on the available implementation contract and pictured states; they are not claims of tests executed in this audit.

| ID | Verdict and evidence |
|---|---|
| FLOW-03 | **pass** — C: query cancellation/submitted-value guards (`PodcastScreens.swift:93`); serialized View writes and disabled save fields (`ViewEditorScreen.swift:116`, `:202`); numeric drafts are not reconciled while focused (`LibrarySettingsScreens.swift:247`). No delayed completion writes into an active search field. Transition timings are not inferred. |
| FLOW-05 | **pass** — S: L/D03, 07, 33; split content and Inspector share the content top edge. Different content lengths are appropriate, not two halves of one comparison. |
| FLOW-07 | **pass** — S: L/D13, 16, 17, 23, 25, 34; committing sheet actions remain trailing in the footer, with cancellation preceding them. This is a regional placement verdict, not a transition measurement. |
| KEY-06 | **pass** — C: `KeyboardShortcuts.swift`, `PlaybackCommands.swift`; custom families use letters/arrows, native key equivalents, and no physical-key-code shortcut map. The Back bracket binding is a standard navigation equivalent. |
| KEY-08 | **pass** — C: `ConnectionViews.swift:85` supplies a detailed in-app shortcut reference, including Space/Return scope; `PlaybackCommands.swift:99` routes editable-field keys through Cocoa interpretation. |
| DLG-01 | **pass** — C/S: `PlaylistSettingsViews.swift:226` reserves confirmation for irreversible purge, explicitly names the Playlist, explains what remains, provides Cancel and a destructive verb; ordinary deletion is undoable. Native cancel equivalents plus `PlaybackKeyboardGuard` map ⌘. to Escape in sheets. L/D13, 23, 25, 34 show safe cancellation and trailing default actions. No destructive default is set. |
| DLG-02 | **pass** — C/S: `PlaylistSettingsViews.swift:226` reserves confirmation for irreversible purge, explicitly names the Playlist, explains what remains, provides Cancel and a destructive verb; ordinary deletion is undoable. Native cancel equivalents plus `PlaybackKeyboardGuard` map ⌘. to Escape in sheets. L/D13, 23, 25, 34 show safe cancellation and trailing default actions. No destructive default is set. |
| DLG-03 | **pass** — C/S: `PlaylistSettingsViews.swift:226` reserves confirmation for irreversible purge, explicitly names the Playlist, explains what remains, provides Cancel and a destructive verb; ordinary deletion is undoable. Native cancel equivalents plus `PlaybackKeyboardGuard` map ⌘. to Escape in sheets. L/D13, 23, 25, 34 show safe cancellation and trailing default actions. No destructive default is set. |
| DLG-04 | **pass** — C/S: `PlaylistSettingsViews.swift:226` reserves confirmation for irreversible purge, explicitly names the Playlist, explains what remains, provides Cancel and a destructive verb; ordinary deletion is undoable. Native cancel equivalents plus `PlaybackKeyboardGuard` map ⌘. to Escape in sheets. L/D13, 23, 25, 34 show safe cancellation and trailing default actions. No destructive default is set. |
| DLG-05 | **pass** — C/S: `PlaylistSettingsViews.swift:226` reserves confirmation for irreversible purge, explicitly names the Playlist, explains what remains, provides Cancel and a destructive verb; ordinary deletion is undoable. Native cancel equivalents plus `PlaybackKeyboardGuard` map ⌘. to Escape in sheets. L/D13, 23, 25, 34 show safe cancellation and trailing default actions. No destructive default is set. |
| CTRL-02 | **pass** — S/C: L/D11–17, 22, 25, 27, 30; native checkboxes, segmented three-way Playlist section and flat pop-up choices use recognizable Mac semantics. No mixed parent hierarchy is offered. |
| CTRL-04 | **pass** — C/S: `FormNumbers.swift`, `FormValidationVisibility.swift`, `ViewEditorScreen.swift:173`, `LibrarySettingsScreens.swift:221`; narrow numeric fields, locale-aware decimal parsing and field-specific validation; L/D16–17 and 27 show the sizing. No locale timing is claimed. |
| CTRL-05 | **pass** — C: `MacDefaultButtonStyle` wraps a native bordered prominent Button; `MacGlassButtonStyle` preserves native button behavior. No custom gesture-only button styling removes pressed feedback. |
| CTRL-06 | **pass** — S/C: L/D03, 18, 33; primary play/add actions remain visible; Episode overflow contains related commands (`EpisodeEditingViews.swift:19`). The small Share/Copy menu is related, although direct Share would save a step. |
| CTRL-07 | **pass** — S/C: L/D15 versus 18; toolbar prompts distinguish Library, current-list and Podcast Episode scope (`MacWindow.swift:181`); no displayed search-history feature. |
| LIST-01 | **pass** — S/C: L/D02–07, 18; native resizable Table columns, noun headings, bound sortOrder for sortable Episode data. Entry order is deliberate Playlist order, not an omitted sort affordance. Thin separators and two-line titles track these short rows without striping. |
| LIST-02 | **pass** — S/C: L/D02–07, 18; native resizable Table columns, noun headings, bound sortOrder for sortable Episode data. Entry order is deliberate Playlist order, not an omitted sort affordance. Thin separators and two-line titles track these short rows without striping. |
| LIST-03 | **pass** — S/C: L/D02–07, 18; native resizable Table columns, noun headings, bound sortOrder for sortable Episode data. Entry order is deliberate Playlist order, not an omitted sort affordance. Thin separators and two-line titles track these short rows without striping. |
| LIST-04 | **pass** — S/C: L/D02–07, 18; native resizable Table columns, noun headings, bound sortOrder for sortable Episode data. Entry order is deliberate Playlist order, not an omitted sort affordance. Thin separators and two-line titles track these short rows without striping. |
| LIST-06 | **pass** — S/C: L/D01–10, 15, 18, 33; destination selection remains highlighted, with a gray secondary selection when the adjacent list owns focus. Podcast detail maps to its Subscriptions parent (`LibraryModel.swift:268`). |
| DATA-01 | **pass** — C: SQLite-backed Library edits and persisted drafts (`LibraryEditingModel.swift:127`, `PlaylistEditingModel.swift:73`, `ViewEditorScreen.swift:202`, `PlaylistSettingsViews.swift:12`); reversible named multi-step history and failure retry. Confirmed permanent purge explicitly says it cannot be undone. This is the implemented persistence/recovery contract, not a claimed crash test. |
| DATA-04 | **pass** — C: SQLite-backed Library edits and persisted drafts (`LibraryEditingModel.swift:127`, `PlaylistEditingModel.swift:73`, `ViewEditorScreen.swift:202`, `PlaylistSettingsViews.swift:12`); reversible named multi-step history and failure retry. Confirmed permanent purge explicitly says it cannot be undone. This is the implemented persistence/recovery contract, not a claimed crash test. |
| DRAG-01 | **pass** — C: `EpisodeTransfer.swift` exports rich Episode data, URL and title; `LibraryDrops.swift` receives feed URLs/OPML; Playlist tables support reorder and menu equivalents. Same-Playlist drag moves, cross-Playlist copies; Option-copy preserves an existing unique Entry. Writes use named reversible edits, and OPML drops stage a preview. |
| DRAG-03 | **pass** — C: `EpisodeTransfer.swift` exports rich Episode data, URL and title; `LibraryDrops.swift` receives feed URLs/OPML; Playlist tables support reorder and menu equivalents. Same-Playlist drag moves, cross-Playlist copies; Option-copy preserves an existing unique Entry. Writes use named reversible edits, and OPML drops stage a preview. |
| PTR-03 | **pass** — C/S: native Table/List, Buttons, Slider, Link/ShareLink and .draggable/dropConfiguration preserve ordinary selection, secondary click and move/copy pointer semantics; L/D03, 06, 18. Native cursor/drag configuration is used; an actual drag was not filmed. |
| APPEAR-03 | **pass** — C: `MacAppearance.swift` supplies four accent/secondary/error variants; `MacGlass.swift:26` replaces glass with opaque semantic fill and a 1 pt border under Reduce Transparency, Increase Contrast or both. Normal appearances are pictured; accessibility modes are source-audited, not live-tested. |
| APPEAR-04 | **pass** — S/C: sampled opaque capture backgrounds plus `MacAppearance.swift` foreground tokens meet 4.5:1; measured ratios are listed below. Selected rows inherit native selection foregrounds and Dark prominent buttons use a dark on-accent label. Disabled controls are exempt; the aspirational 7:1 custom-Dark target is not substituted for the 4.5:1 minimum. |
| APPEAR-05 | **pass** — C: no app-defined spatial animation/withAnimation/transition in the UI sources; control and sheet motion remains native. No custom motion overrides Reduce Motion. |
| APPEAR-09 | **pass** — S/C: L/D01–10, 18, 26, 33; one SF Symbols family, recognizable play/add/share/download/inspector actions, aligned with native label metrics. The sidebar eraser is explained by its tooltip/AX state. |
| APPEAR-10 | **pass** — S/C: L/D03, 16, 26; regular glass is confined to transport/actions/footer controls; lists, forms and reading surfaces use ordinary backgrounds. No clear material or nested glass-on-glass stack is introduced; `MacGlass.swift` provides readable opaque fallbacks and boundaries. |
| TYPE-02 | **pass** — S/C: 2× captures and `MacTextSize.swift` use Mac system body/headline/caption styles, regular-to-bold weights, tabular timing digits. No body-font substitution or below-10-pt UI reading text found; the 8 pt xmark in DownloadIcon is a symbol overlay, not reading text. |
| TYPE-03 | **pass** — S/C: 2× captures and `MacTextSize.swift` use Mac system body/headline/caption styles, regular-to-bold weights, tabular timing digits. No body-font substitution or below-10-pt UI reading text found; the 8 pt xmark in DownloadIcon is a symbol overlay, not reading text. |
| TYPE-06 | **pass** — S/C: L/D32 and 34 wrap the instructional/recovery prose into readable lines, with paragraph spacing; Rewind’s first two full lines each have 73 characters, and the first full Clear on Played explanation line in L11 has 79: a 75-character average across three typical full lines. The first two Rewind glyph-row bands start at pixel y=961 and 999 in L34, a 38 px / 2 = 19 pt line pitch for 13 pt body text (146%). Default Inspector notes use an ordinary paragraph column. The Settings clipping is counted under WIN-03 only. |
| TYPE-07 | **pass** — S/C: L/D11–25, 32, 34 and UI copy; ordinary case, single-weight emphasis, curly quotes and the ellipsis character. Literal feed URLs and user titles retain their characters; no app-authored all-caps prose or underline emphasis was found. |
| TYPE-08 | **pass** — S/C: L/D11–25, 32, 34 and UI copy; ordinary case, single-weight emphasis, curly quotes and the ellipsis character. Literal feed URLs and user titles retain their characters; no app-authored all-caps prose or underline emphasis was found. |
| COPY-01 | **pass** — S/C: L/D01–34; consistent View/Episode/Entry/Playlist terms and specific verbs such as Play Next, Restore, Apply and Rewind; Mac click/window wording and concise action tooltips. Tooltip omissions are counted once under PTR-04. |
| COPY-02 | **pass** — C: `FailureMessages.swift` provides operation-specific recovery without raw diagnostics; `FailureFeedback.swift` offers Retry; numeric errors stay beside fields. Settings save failures explicitly retain the on-screen draft and offer Retry (`GeneralSettingsEdits.swift:37`). Error cases are source-audited rather than pictured. |
| COPY-03 | **pass** — S/C: L/D08, 14, 24, 31; empty states explain how History is created, where deleted Playlists return, how to find a podcast, and how to start listening. Empty Trash needs no forced create action. Empty Top Podcasts is separately FLOW-06. |
| COPY-04 | **pass** — S/C: L/D01–34; consistent View/Episode/Entry/Playlist terms and specific verbs such as Play Next, Restore, Apply and Rewind; Mac click/window wording and concise action tooltips. Tooltip omissions are counted once under PTR-04. |
| AX-01 | **pass** — AX/C/S: L/D03, 06, 20, 26, 33 have named row actions, Position slider, Current Entry/Active Playlist, and multi-selection summaries. `EpisodeInspector.swift:47` contains children without relabeling every control. Filled symbols plus text communicate status; subscribed/unsubscribe changes label and shape, not only color. This audits semantic information, not a live VoiceOver session. |
| AX-02 | **pass** — AX/C/S: L/D03, 06, 20, 26, 33 have named row actions, Position slider, Current Entry/Active Playlist, and multi-selection summaries. `EpisodeInspector.swift:47` contains children without relabeling every control. Filled symbols plus text communicate status; subscribed/unsubscribe changes label and shape, not only color. This audits semantic information, not a live VoiceOver session. |
| AX-05 | **pass** — S/C: player offers persistent visible play/pause/seek and shows current Episode/position; native system media controls in `SystemPlayback.swift`. No app instruction or critical error is audio-only. Publisher-supplied podcast transcripts are not an authored critical-alert channel. |
| START-01 | **pass** — C: `MacWindow.swift:35` presents Opening Library progress, then local content; `ApplicationModel.swift:146` loads the local Library before awaiting sync. This establishes launch-state design, not measured launch latency. |
| START-02 | **pass** — S/C: L/D32 and `LibraryEditingModel.swift:89`; Getting Started is dismissible, remembers dismissal and can be reopened from Settings/Window. Contextual empty-state help teaches next steps; no forced setup tour. |
| START-03 | **pass** — S/C: L/D32 and `LibraryEditingModel.swift:89`; Getting Started is dismissible, remembers dismissal and can be reopened from Settings/Window. Contextual empty-state help teaches next steps; no forced setup tour. |
| START-04 | **pass** — C/S: `ConnectionViews.swift:34` offers Start on This Mac without an account; server connection is optional. Native file panels are summoned explicitly at import/export; MCP stays opt-in with a plain-language access explanation in L/D30. No gratuitous launch-time protected-resource prompt is authored. |
| START-06 | **pass** — C/S: `ConnectionViews.swift:34` offers Start on This Mac without an account; server connection is optional. Native file panels are summoned explicitly at import/export; MCP stays opt-in with a plain-language access explanation in L/D30. No gratuitous launch-time protected-resource prompt is authored. |
| EDIT-02 | **pass** — C: native text editing retained; Episode copying supplies useful text and URL representations (`SelectionCommands.swift:152`), native field-editor dispatch is retained, and Entry delete leaves the pasteboard alone (`PlaylistContentView.swift:109`). Selection is scoped to the focused window. |
| EDIT-05 | **pass** — C: native text editing retained; Episode copying supplies useful text and URL representations (`SelectionCommands.swift:152`), native field-editor dispatch is retained, and Entry delete leaves the pasteboard alone (`PlaylistContentView.swift:109`). Selection is scoped to the focused window. |
| TOOL-06 | **pass** — S/C: native SidebarCommands plus visible toolbar toggle and native split visibility; Inspector has visible control, Show/Hide menu command and ⌥⌘I (`MacWindow.swift:169`, `:723`). No toolbar-customization feature is promised or removed. |
| SIDE-03 | **pass** — S/C: native SidebarCommands plus visible toolbar toggle and native split visibility; Inspector has visible control, Show/Hide menu command and ⌥⌘I (`MacWindow.swift:169`, `:723`). No toolbar-customization feature is promised or removed. |
| SIDE-04 | **pass** — S/C: L/D01–10, 15, 18, 33; destination selection remains highlighted, with a gray secondary selection when the adjacent list owns focus. Podcast detail maps to its Subscriptions parent (`LibraryModel.swift:268`). |
| SET-01 | **pass** — S/C: L/D11, 22, 27, 30; global playback/appearance/automation options live in Settings, subscription and Playlist options stay contextual. Ordinary global changes apply live (`GeneralSettingsEdits.swift`); Apply in bulk task sheets is not a Settings-wide save step. |
| MENU-01 | **pass** — B/C: `menus.txt` has App, File, Edit, View, Podcast, Views, Controls, Episode, Playlist, Window, Help in order; unavailable items remain visible/dimmed. `LibraryCommands.swift`, `EpisodeEditingViews.swift:220`, `MenuCommandActions.swift` and `PlaybackCommands.swift` expose toolbar/context/dialog routes. Contextual properties remain controls; no verified command-only-in-UI blocker was found. |
| MENU-02 | **pass** — B/C: `menus.txt` has App, File, Edit, View, Podcast, Views, Controls, Episode, Playlist, Window, Help in order; unavailable items remain visible/dimmed. `LibraryCommands.swift`, `EpisodeEditingViews.swift:220`, `MenuCommandActions.swift` and `PlaybackCommands.swift` expose toolbar/context/dialog routes. Contextual properties remain controls; no verified command-only-in-UI blocker was found. |
| MENU-03 | **pass** — B/C: `menus.txt` has App, File, Edit, View, Podcast, Views, Controls, Episode, Playlist, Window, Help in order; unavailable items remain visible/dimmed. `LibraryCommands.swift`, `EpisodeEditingViews.swift:220`, `MenuCommandActions.swift` and `PlaybackCommands.swift` expose toolbar/context/dialog routes. Contextual properties remain controls; no verified command-only-in-UI blocker was found. |
| MENU-04 | **pass** — B/C: `menus.txt`; concise action titles, ellipses on input tasks, one application-defined submenu level, sparse native icons. Native Close All/Minimize All/Zoom All alternates preserve ordinary task routes; no custom multi-modifier alternate scheme. |
| MENU-05 | **pass** — B/C: `menus.txt`; concise action titles, ellipses on input tasks, one application-defined submenu level, sparse native icons. Native Close All/Minimize All/Zoom All alternates preserve ordinary task routes; no custom multi-modifier alternate scheme. |
| MENU-06 | **pass** — B/C: `menus.txt`; concise action titles, ellipses on input tasks, one application-defined submenu level, sparse native icons. Native Close All/Minimize All/Zoom All alternates preserve ordinary task routes; no custom multi-modifier alternate scheme. |
| APP-02 | **pass** — B/S/C: `PodListMac.swift:49` supplies a native Settings scene; menus preserve Settings…, Hide, Hide Others, Show All and Quit. L/D27 and 30 show independent Settings windows with disabled minimize/zoom. Native standard command equivalents apply. |
| APP-03 | **pass** — C/B: standard SwiftUI TextField/Cocoa field editors, TextEditingCommands, native spelling/substitutions/transformations/speech menus and system Dictation/Emoji items. `PlaybackCommands.swift:99` sends text-specific keys to interpretKeyEvents rather than overriding Cocoa bindings; no custom editor or Services suppression is installed. User-specific service execution is not claimed. |
| APP-04 | **pass** — B/S/C: `PodListMac.swift:49` supplies a native Settings scene; menus preserve Settings…, Hide, Hide Others, Show All and Quit. L/D27 and 30 show independent Settings windows with disabled minimize/zoom. Native standard command equivalents apply. |
| FILE-03 | **pass** — B/C: native Close/Close All in `menus.txt`; no interception of window close. OPML export uses NSSavePanel and atomic text output (`LibrarySettingsScreens.swift:356`) without replacing the current Library; no duplicate-document feature is offered. |
| FILE-04 | **pass** — B/C: native Close/Close All in `menus.txt`; no interception of window close. OPML export uses NSSavePanel and atomic text output (`LibrarySettingsScreens.swift:356`) without replacing the current Library; no duplicate-document feature is offered. |
| EDIT-01 | **pass** — C/B: `EpisodeEditingViews.swift:238` uses labeled Undo/Redo at the Edit menu head and defers to the text editor’s UndoManager when editing text. `PlaylistEditingModel.swift:69` adds operation names; disabled plain Undo in the capture is an empty-history state. |
| EDIT-03 | **pass** — B/C: menus retain standard Find hierarchy; Search Library at ⌘F is an object/library search, not a replacement for text Find. Standard clipboard/undo/window/settings meanings remain; Space and ⌘arrows are guarded in text fields, and ⌘. cancels sheets before stopping playback. |
| EDIT-04 | **pass** — C/B: standard SwiftUI TextField/Cocoa field editors, TextEditingCommands, native spelling/substitutions/transformations/speech menus and system Dictation/Emoji items. `PlaybackCommands.swift:99` sends text-specific keys to interpretKeyEvents rather than overriding Cocoa bindings; no custom editor or Services suppression is installed. User-specific service execution is not claimed. |
| VIEW-01 | **pass** — B/C: `menus.txt`; View contains visibility/appearance and full screen, with current Show/Hide titles. Window contains native Minimize/Zoom/Bring All to Front and open-window navigation. Scene opener commands are separate from the actual open-window list; modal sheets are not listed as documents. |
| VIEW-02 | **pass** — B/C: `menus.txt`; View contains visibility/appearance and full screen, with current Show/Hide titles. Window contains native Minimize/Zoom/Bring All to Front and open-window navigation. Scene opener commands are separate from the actual open-window list; modal sheets are not listed as documents. |
| WMENU-01 | **pass** — B/C: `menus.txt`; View contains visibility/appearance and full screen, with current Show/Hide titles. Window contains native Minimize/Zoom/Bring All to Front and open-window navigation. Scene opener commands are separate from the actual open-window list; modal sheets are not listed as documents. |
| WMENU-03 | **pass** — B/C: `menus.txt`; View contains visibility/appearance and full screen, with current Show/Hide titles. Window contains native Minimize/Zoom/Bring All to Front and open-window navigation. Scene opener commands are separate from the actual open-window list; modal sheets are not listed as documents. |
| HELP-01 | **pass** — B/C: trailing Help menu opens task-specific PodList Help (`PodListMac.swift:43`, `ConnectionViews.swift:75`) and native Help access remains. Documentation covers the model, playback, shortcuts, downloads and connection recovery, not a framework default link. |
| KEY-02 | **pass** — B/C: menus retain standard Find hierarchy; Search Library at ⌘F is an object/library search, not a replacement for text Find. Standard clipboard/undo/window/settings meanings remain; Space and ⌘arrows are guarded in text fields, and ⌘. cancels sheets before stopping playback. |
| KEY-03 | **pass** — C: `KeyboardShortcuts.swift`, `LibraryCommands.swift`, `PlaybackCommands.swift` and `EpisodeEditingViews.swift`; related Command/Shift/Option families, native shortcut glyph rendering and an in-app reference. No custom Control shortcut family or web-style modifier notation. The help reference has notation generated from the shared definitions. |
| KEY-05 | **pass** — C: `KeyboardShortcuts.swift`, `LibraryCommands.swift`, `PlaybackCommands.swift` and `EpisodeEditingViews.swift`; related Command/Shift/Option families, native shortcut glyph rendering and an in-app reference. No custom Control shortcut family or web-style modifier notation. The help reference has notation generated from the shared definitions. |
| TEXT-01 | **pass** — C/B: standard SwiftUI TextField/Cocoa field editors, TextEditingCommands, native spelling/substitutions/transformations/speech menus and system Dictation/Emoji items. `PlaybackCommands.swift:99` sends text-specific keys to interpretKeyEvents rather than overriding Cocoa bindings; no custom editor or Services suppression is installed. User-specific service execution is not claimed. |
| TEXT-02 | **pass** — C/B: standard SwiftUI TextField/Cocoa field editors, TextEditingCommands, native spelling/substitutions/transformations/speech menus and system Dictation/Emoji items. `PlaybackCommands.swift:99` sends text-specific keys to interpretKeyEvents rather than overriding Cocoa bindings; no custom editor or Services suppression is installed. User-specific service execution is not claimed. |
| WIN-01 | **pass** — S/B/C: L/D01–10, native WindowGroup, standard traffic lights and system Window/View commands; no custom frame or full-screen implementation. Empty native title/toolbar regions retain AppKit drag/double-click behavior. No document proxy icon is applicable. |
| WIN-02 | **pass** — S/C: L/D03, 07, 11–17, 22–25, 32 show secondary gray source selection when detail owns selection, and native parent-window dimming under a sheet; no hard-coded active selection fill. General inactive-window material behavior is delegated to native scenes, not custom-painted. |
| WIN-04 | **pass** — S/C: L/D01–34 show view/podcast/Settings-pane/task names, not just an app-name title. Full titles remain available; source titles need not be arbitrarily truncated to meet the concise-title guidance. |
| WIN-06 | **pass** — S/B/C: L/D01–10, native WindowGroup, standard traffic lights and system Window/View commands; no custom frame or full-screen implementation. Empty native title/toolbar regions retain AppKit drag/double-click behavior. No document proxy icon is applicable. |
| WIN-07 | **pass** — C/B: `PodListMac.swift:29` uses WindowGroup; File offers New Window and Open in New Window, and View/Playlist context menus preserve concurrent contexts (`MacWindow.swift:373`). Now Playing and Listening Stats are distinct task windows. |
| WIN-08 | **pass** — C/B: `PodListMac.swift:29` uses WindowGroup; File offers New Window and Open in New Window, and View/Playlist context menus preserve concurrent contexts (`MacWindow.swift:373`). Now Playing and Listening Stats are distinct task windows. |
| WIN-09 | **pass** — S/B/C: L/D01–10, native WindowGroup, standard traffic lights and system Window/View commands; no custom frame or full-screen implementation. Empty native title/toolbar regions retain AppKit drag/double-click behavior. No document proxy icon is applicable. |
| TOOL-01 | **pass** — S/C: L/D02, 03, 06, 18, 33; native ToolbarItem groups, leading title/navigation, trailing symbol actions and searchable field. Groups remain small and no custom painted overflow/toolbar widgets replace native handling. There is no blanket tinting of large toolbar buttons. Actual live-resize smoothness is WIN-10 N/O. |
| TOOL-02 | **pass** — S/C: L/D02, 03, 06, 18, 33; native ToolbarItem groups, leading title/navigation, trailing symbol actions and searchable field. Groups remain small and no custom painted overflow/toolbar widgets replace native handling. There is no blanket tinting of large toolbar buttons. Actual live-resize smoothness is WIN-10 N/O. |
| TOOL-03 | **pass** — S/C: L/D02, 03, 06, 18, 33; native ToolbarItem groups, leading title/navigation, trailing symbol actions and searchable field. Groups remain small and no custom painted overflow/toolbar widgets replace native handling. There is no blanket tinting of large toolbar buttons. Actual live-resize smoothness is WIN-10 N/O. |
| TOOL-04 | **pass** — S/C: L/D02, 03, 06, 18, 33; native ToolbarItem groups, leading title/navigation, trailing symbol actions and searchable field. Groups remain small and no custom painted overflow/toolbar widgets replace native handling. There is no blanket tinting of large toolbar buttons. Actual live-resize smoothness is WIN-10 N/O. |
| TOOL-05 | **pass** — S/C: L/D02, 03, 06, 18, 33; native ToolbarItem groups, leading title/navigation, trailing symbol actions and searchable field. Groups remain small and no custom painted overflow/toolbar widgets replace native handling. There is no blanket tinting of large toolbar buttons. Actual live-resize smoothness is WIN-10 N/O. |
| SIDE-01 | **pass** — S/C: L/D01–10; leading native sidebar, flat section hierarchy and native thin split divider. `.listStyle(.sidebar)` leaves row metrics to macOS (`MacWindow.swift:113`); app text enlargement deliberately does not override system sidebar sizing. Sidebar-width restoration is separately DATA-06. |
| SIDE-02 | **pass** — S/C: L/D01–10; leading native sidebar, flat section hierarchy and native thin split divider. `.listStyle(.sidebar)` leaves row metrics to macOS (`MacWindow.swift:113`); app text enlargement deliberately does not override system sidebar sizing. Sidebar-width restoration is separately DATA-06. |
| SIDE-05 | **pass** — S/C: L/D01–10; leading native sidebar, flat section hierarchy and native thin split divider. `.listStyle(.sidebar)` leaves row metrics to macOS (`MacWindow.swift:113`); app text enlargement deliberately does not override system sidebar sizing. Sidebar-width restoration is separately DATA-06. |
| SIDE-06 | **pass** — S/C: L/D01–10; leading native sidebar, flat section hierarchy and native thin split divider. `.listStyle(.sidebar)` leaves row metrics to macOS (`MacWindow.swift:113`); app text enlargement deliberately does not override system sidebar sizing. Sidebar-width restoration is separately DATA-06. |
| SET-03 | **pass** — S/C: L/D27–30 show a persistent noncustomizable pane toolbar, pane-specific size/title and disabled minimize/zoom. Native Settings scene is not opened by app launch code; there is no Settings restoration hook. Last-pane recall is separately SET-04 N/O. |
| SET-05 | **pass** — S/C: L/D11, 22, 27, 30; global playback/appearance/automation options live in Settings, subscription and Playlist options stay contextual. Ordinary global changes apply live (`GeneralSettingsEdits.swift`); Apply in bulk task sheets is not a Settings-wide save step. |
| SET-06 | **pass** — S/C: L/D27–30 show a persistent noncustomizable pane toolbar, pane-specific size/title and disabled minimize/zoom. Native Settings scene is not opened by app launch code; there is no Settings restoration hook. Last-pane recall is separately SET-04 N/O. |
| DLG-06 | **pass** — S/C: L/D11–17, 22–25, 32, 34; sheets have usable content-dependent sizes and native parent-window attachment. `PlaylistPresentation.Sheet` selects one Playlist sheet at a time; no app-modal custom overlay blocks all Library windows. |
| CTRL-01 | **pass** — S/C: L/D11–17, 22, 25, 27, 30; native checkboxes, segmented three-way Playlist section and flat pop-up choices use recognizable Mac semantics. No mixed parent hierarchy is offered. |
| DATA-07 | **pass** — C: `LibrarySettingsScreens.swift:345` uses NSOpenPanel/NSSavePanel for OPML, native browsing and standard extension policy, with a sensible PodList.opml export name. No new editable document/Untitled flow is applicable. |
| DRAG-02 | **pass** — C: `EpisodeTransfer.swift` exports rich Episode data, URL and title; `LibraryDrops.swift` receives feed URLs/OPML; Playlist tables support reorder and menu equivalents. Same-Playlist drag moves, cross-Playlist copies; Option-copy preserves an existing unique Entry. Writes use named reversible edits, and OPML drops stage a preview. |
| PTR-01 | **pass** — C: selection-aware native contextMenu APIs in `MacWindow.swift:354`, `:494` and `PlaylistContentView.swift:104`, with context IDs rather than mutating persistent selection. Actions are relevant, use native targeting, at most about three groups, and suppress menu-bar shortcuts by default (`EpisodeEditingViews.swift:25`). The Episode menu is dense but domain-coherent. |
| PTR-02 | **pass** — C: selection-aware native contextMenu APIs in `MacWindow.swift:354`, `:494` and `PlaylistContentView.swift:104`, with context IDs rather than mutating persistent selection. Actions are relevant, use native targeting, at most about three groups, and suppress menu-bar shortcuts by default (`EpisodeEditingViews.swift:25`). The Episode menu is dense but domain-coherent. |
| PTR-05 | **pass** — C: selection-aware native contextMenu APIs in `MacWindow.swift:354`, `:494` and `PlaylistContentView.swift:104`, with context IDs rather than mutating persistent selection. Actions are relevant, use native targeting, at most about three groups, and suppress menu-bar shortcuts by default (`EpisodeEditingViews.swift:25`). The Episode menu is dense but domain-coherent. |
| APPEAR-01 | **pass** — S/C: all 35 L/D pairs; `MacAppearanceController` observes the preference and uses nil for System so native appearance remains in control. Owner-approved overrides include System. |
| APPEAR-06 | **pass** — S/C: L/D03, 16, 26; regular glass is confined to transport/actions/footer controls; lists, forms and reading surfaces use ordinary backgrounds. No clear material or nested glass-on-glass stack is introduced; `MacGlass.swift` provides readable opaque fallbacks and boundaries. |
| APPEAR-07 | **pass** — S/C: L/D03, 16, 26; regular glass is confined to transport/actions/footer controls; lists, forms and reading surfaces use ordinary backgrounds. No clear material or nested glass-on-glass stack is introduced; `MacGlass.swift` provides readable opaque fallbacks and boundaries. |
| APPEAR-08 | **pass** — S/C: L/D03, 16, 26; regular glass is confined to transport/actions/footer controls; lists, forms and reading surfaces use ordinary backgrounds. No clear material or nested glass-on-glass stack is introduced; `MacGlass.swift` provides readable opaque fallbacks and boundaries. |
| TYPE-01 | **pass** — S/C: 2× captures and `MacTextSize.swift` use Mac system body/headline/caption styles, regular-to-bold weights, tabular timing digits. No body-font substitution or below-10-pt UI reading text found; the 8 pt xmark in DownloadIcon is a symbol overlay, not reading text. |
| TYPE-04 | **pass** — C/AX: `MacIconLabel.swift:13` and Inspector/download icons expose 28×28 pt targets. L03 AX reports row add/play buttons as 28×28 pt; native small bezels are not mistaken for their complete hit regions. Large primary Inspector play is intentional emphasis, not a touch-scale form. |
| AX-03 | **pass** — C: `MacTextSize.swift:10` provides 100–200% in 10% steps, shared across scenes with View commands and Settings. Episode/Entry tables switch to wrapping reading rows above 100%; scrollable panels keep content available. Whole-window enlarged-layout verification remains TYPE-05 N/O. |
| SYS-01 | **pass** — C: `PodListMac/AppIntents.swift` defines meaningful Episode/Playlist entities, play/pause/queue/mark/search/list intents and four AppShortcuts; `build-mac-app.sh:55` packages and validates extracted actions/entities/shortcuts. UndoableIntent, donations and Now Playing snippet extend the same model. Optional MCP is not substituted for system automation. No AppleScript dictionary is advertised. |
| SYS-04 | **pass** — S/C: L/D03 and 18 expose Share controls backed by native ShareLink with validated supported web URLs (`ShareLinks.swift`); missing share URLs disable the operation. No unnecessary sharing permissions or invented recipient flow. |

### Measurements and platform signals

Contrast was calculated with the sRGB relative-luminance formula, using opaque foreground tokens in `MacAppearance.swift` and representative solid backgrounds sampled from the original captures, not antialiased edge pixels or the contact-sheet JPEGs. Ratios are **normal-size text**, 4.5:1 minimum; custom Dark pairs ideally approach 7:1. These samples do not establish every wallpaper-dependent native glass pixel; glass uses semantic primary foreground and has an opaque accessibility fallback.

| Foreground / background | Ratio | Evidence/use |
|---|---:|---|
| #606060 / #FFFFFF | 6.29:1 | Light secondary reading text / table |
| #606060 / #EEEDEC | 5.38:1 | Light secondary / Inspector-type neutral fill |
| #A0A0A0 / #242222 | 6.05:1 | Dark secondary / sampled table fill; passes minimum, below aspirational 7:1 |
| #2B50C8 / #FFFFFF | 6.81:1 | Light branded action text |
| #9DB1FF / #242222 | 7.66:1 | Dark branded action text |
| #B91C1C / #FFFFFF | 6.47:1 | Light error text |
| #FF9FA1 / #242222 | 8.08:1 | Dark error text |
| #111827 / #9DB1FF | 8.59:1 | Dark prominent-button label / brand fill |
| #FFFFFF / #2B50C8 | 6.81:1 | Light prominent-button label / brand fill |

Other measured craft: L03 AX row add/play buttons are 28×28 pt; the regular selected Episode row is 54.5 pt with two lines and explicit actions, and the sidebar row is 32 pt at the VM’s current sidebar preference. The primary frame is 1180×760 pt. Neither native small-bezel height nor XCUI’s enabled=false on structural groups is treated as an inaccessible target by itself. Captured text sizes and source semantic styles establish Mac sizing; no body text is inferred from downscaled montage pixels.

**Mac side-by-side test:** The supplied package contains no current Mail/Finder reference screenshot, and this audit did not open another app. The comparison is therefore structural against the supplied Mac signals and exemplar descriptions, not a claimed visual capture of Mail. PodList’s standard frame, leading source list, table headings, Inspector, native menus and independent Settings window follow the same Mac grammar. The foreign signals are the owner-kept fixed control accent (L6), modal repeated lookup/live-settings presentation (B-side modality), incomplete workspace restoration (B7), and missing applicable linking/indexing/services (B9). A podcast’s bottom transport is also an owner-kept Mac-window deviation. A different podcast visual identity is not itself foreign.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 frame | Native | Standard WindowGroup/traffic lights, L/D01–10 |
| L2 type | Native | Mac system semantic sizes and tabular metadata |
| L3 controls | Native | Standard pop-ups/checkboxes/segmented controls, L/D11–30 |
| L4 menus/popovers | Native | System menu dump and native context menus |
| L5 notation | Native | Native shortcut rendering plus shared glyph reference |
| L6 sidebar/selection | Foreign in accent; otherwise Native | Leading source list and gray secondary selection; fixed accent in action/navigation chrome |
| L7 symbols | Native | Consistent SF Symbols |
| L8 Settings | Native structure | Independent native pane window, live apply; clipping recorded separately |
| L9 density | Adapted | Two-line podcast rows with 28 pt actions; larger artwork only in details/player |
| L10 materials/era | Native/Adapted | Regular glass on controls, ordinary content and opaque fallbacks |
| L11 appearance | Adapted | System plus owner-approved Light/Dark override |
| B1 commands | Native | Broad, context-scoped menu index including dialogs; disabled entries stay present |
| B2 Settings access | Native | Settings scene/App menu ⌘, |
| B3 shortcuts | Adapted | Domain families, safe text/sheet interception, help reference |
| B4 text | Native implementation | Cocoa field editors, TextEditingCommands and interpretKeyEvents |
| B5 keyboard/lists | N/O in full | Standard selection is implemented; complete FKA/type-select requires the missing live check |
| B6 context menus | Native implementation | Native target-aware table menus and matching menu-bar routes |
| B7 windows/state | Adapted with Foreign gap | New/comparison windows and context archive exist; sidebar width is not restored |
| B8 drag/drop | Adapted with Foreign gaps | Reversible rich Episode transfer; first-only Library intake and no remote pending-row feedback |
| B9 integration | Adapted with Foreign gaps | Real intents/donations/snippet and Share; no Library deep links, provider service or Spotlight |
| B10 Undo/help | Adapted | Named history and actual task help; restored offscreen result is not revealed |
| B11 footprint | N/O | No stated measured workload/baseline/launch/idle resource sample |

## Scores

Scores cover both appearances; no category needs a separate Light/Dark number. Behavioral evidence includes code and menus, so it is stronger than “screenshot only,” but live portions and timings remain unverified. Uncapped merits are shown where useful to distinguish an owner decision’s cap from the visual craft.

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.5** | Strong: system body/headline/caption roles clearly separate Episode, podcast and metadata (03/07); monospaced timing digits and readable Rewind/tutorial prose. Above generic styling; below Exemplary because narrow-column wrapping/notes measure and the whole enlarged workspace are not fully demonstrated. No typography major cap. | `hierarchy`, `accessibility`, `craft` |
| Hierarchy | **8.3** | Strong: source → row → Inspector and one clear detail-play control; table content leads in 02/06/18, batch summary changes appropriately in 33. The large artwork and persistent transport take appreciable emphasis, and repeated per-row controls make the list busier than the calmest exemplar. Owner’s bottom placement retained. | `content-first`, `hierarchy` |
| Spacing & density | **8.0** | Strong: aligned native columns, 28 pt row actions, consistent two-line rows, useful rather than touch-sized forms. The 600 pt General Settings Form fails to keep its explanatory text within the window; details sometimes spend much more area on artwork than on information. WIN-03 caps Platform fit, not this category. | `craft`, `conventions` |
| Color & contrast | **6.9** | Capped by major APPEAR-02. Uncapped craft is about 8.6: restrained palette, readable ordinary/Dark text and contrasting Dark button labels, semantic status plus text, opaque accessibility fallbacks. The retained fixed accent prevents this category from entering Strong under this rubric. | `color-restraint`, `accessibility`, `conventions` |
| Iconography | **8.7** | Strong, near Exemplary: coherent SF Symbols, proper play/share/add/download meanings and explicit status marks. Tooltip omissions (PTR-04) and the less immediately obvious Clear on Played eraser keep it below 9.0. | `craft`, `plain-language` |
| Consistency & polish | **6.9 (stability N/O)** | Capped by CTRL-03 and CTRL-08; otherwise about 8.2 for coherent state styling, reserved edit-feedback row, common recovery verb, paired appearances and correctly adapted glass. Done-only/live-modal tasks, a clipped explanation and bare Top Podcasts heading prevent “every corner finished.” **Partial: no flow run; stability N/O in Light and Dark**, so no stability-band limit is invented. | `craft`, `stability`, `conventions` |
| Clarity | **8.6** | Strong: literal model terms, counts/current Entry/Active state, explicit optional filters, informative History and Rewind copy, and a plain MCP access disclosure. The Entry/History/Timeline distinction still requires some learning, and the unlabelled populated seek field/undisclosed failed drop interrupt self-evidence. No Writing & copy major cap. | `plain-language`, `feedback` |
| Platform fit | **6.9** | Looks **8.5**, Behaves **7.8** → (8.5 + 2×7.8)/3 = **8.0** before caps. Native frame, substantial menus, text system, windows, settings, sharing and actual system intents earn Strong underlying merit. WIN-03/05, SET-02, DLG-07/08 and SYS-05 impose the 6.9 ceiling. No blocker was verified. | `conventions`, `discoverable-commands`, `stability` |
| Interaction & feedback | **6.9** | Capped by DATA-06, DRAG-04 and DRAG-06; underlying merit about 8.1 for named multi-step Undo/Redo, durable task drafts, context-scoped commands, native text safety and non-gesture equivalents. First-only drops and invisible remote preparation are real gaps; latency/hitches/FKA are N/O, not silently treated as passes. | `forgiveness`, `keyboard-efficiency`, `direct-manipulation`, `feedback` |
| **Overall** | **8.0** | A capable and visually deliberate Mac podcast Library, especially in ordinary browse/queue/inspect work. Edge-task modality, restoration and drop feedback are less finished than the main list presentation. The most constraining fixed weakness is the accent/owner-decision cap; actionable defects are named above. This is a holistic judgment, not an arithmetic mean. **8.0 ≤ 6.9 + 2.0 = 8.9.** | `content-first`, `conventions`, `craft` |

**Caps applied:** There is no 4.9 blocker cap. Appearance → Color & contrast ≤6.9 (APPEAR-02); Controls → Consistency & polish ≤6.9 (CTRL-03/08); Windows/Settings/dialogs/system integration → Platform fit ≤6.9 (WIN-03/05, SET-02, DLG-07/08, SYS-05); data/drag → Interaction & feedback ≤6.9 (DATA-06, DRAG-04/06). FLOW-06 is minor and supplies no numeric cap. There is no stability sub-score or stability-band ceiling without measured flows. Other minor failures do not create caps. Overall’s lowest-category-plus-two ceiling is **8.9**.

### What stands between this build and 9.0

A strict **9.0 is mathematically unavailable while the retained major owner decisions remain**: APPEAR-02 alone leaves a 6.9 lowest category and an 8.9 Overall ceiling. WIN-05 and SET-02 similarly retain the Platform fit ceiling; SYS-05 is a known deferral until the approved last integration step. This is a property of this standard, not an instruction to reverse the owner’s choices or redesign the brand/player.

Within that constraint, the actionable work is concrete: give seek/Welcome persistent labels; make import progress determinate and stoppable; restore sidebar width; handle every dropped item with visible pending/rejection state; constrain Settings text to its window; use modeless surfaces for repeated lookup and live settings, or honest cancelable transactions where a sheet is appropriate. Finish the minor About, Undo reveal, tooltip, empty-state, Services and deep-link gaps. Finally, the prohibited-on-this-machine checks need a separate authorized VM run: minimum/tiled/typical sizes in both appearances, delayed completions, five-plus timed repetitions, FKA/VoiceOver/assistive input, resize and long-list traces. Missing evidence is an uncertainty to resolve, not an assumed failure or a promise that fixes pass those tests.

## Next step

**Target:** DLG-08, the major modality failure in the capped Platform fit category, tied to the primary find-and-add task. The retained owner-decision failures are skipped when choosing the target. Among equally capped categories this is closer to repeated Library acquisition than a batch-transfer edge case.

**Anti-pattern:** **Find-and-dismiss**: the Add Podcasts sheet must be dismissed before the person can inspect its effect in the parent Library. No sheet-on-sheet stack is alleged. The relevant contrast is **INTER-11, Repeated input uses a panel** in `UI_Guidelines/examples/contrasts.md`. BBEdit would leave lookup open while its document remains available; Things would keep observation near the working list.

**Root cause:** Add Podcasts’ repeatable lookup/subscription loop is owned by a parent-blocking `.sheet`, so choosing what to add and verifying its result cannot coexist in that Library window.

**Smallest candidate:** Present the same Add Podcasts content in one genuine modeless “Add Podcasts” panel; retain its query draft, stale-search cancellation, selected result and named Subscribe Undo. Set an appropriate roughly 650 pt initial width with content-limited scrolling; preserve native field/control sizes and opaque appearance fallback. For an NSPanel, set floating/activation/Mission Control behavior explicitly and do not steal document key focus just because a result arrives. No color, vocabulary, artwork or player placement changes.

**Alternative:** A regular independent Add Podcasts window would also preserve modeless work and ordinary Window-menu behavior, with more workspace weight. A compact inline acquisition view is a larger change and is not the first candidate.

**Principle and expected effect:** `user-control`, `feedback`, `character`; removes the lookup’s parent-window block and improves underlying Platform fit/interaction merit. Risks are focus handoff and too many independent windows, addressed by reusing a single task surface and testing activation/return. Existing owner caps still stand, so no promise of a 9.0 or uncapped score is made.

**Validation for that later implementation:** In an authorized VM, keep lookup open while selecting an existing Playlist in its Library, subscribe twice with different queries, type during a delayed response, dismiss/reopen without losing the draft, Undo from the initiating context, and repeat in Light/Dark at minimum/tiled/typical widths. Check native panel behavior, FKA and VoiceOver. Do not run that desktop automation on the owner’s Mac.

**Audit handoff:** Report only; no implementation/hill-climb step was applied, so no invented before/after score or iteration log. All five character elements are **kept**. The source and starting captures remain the baseline. Beads task: `pod-3ag`.
