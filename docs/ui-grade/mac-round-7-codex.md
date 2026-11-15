# PodList Mac UI grade — round 7 (Codex)

## Frame

**Task:** Find podcasts and Episodes, organize ordered Playlist Entries, and listen with understandable, reversible control over playback and library state.

**Target:** Native Mac app, macOS 26+; reviewed source at `e910633` in this worktree. Supplied evidence runs on macOS 27.2. This is a UI audit, not a code-change proposal or a report about another build.

**Posture:** Sovereign personal Library with background playback and transient auxiliary tasks.

**Audience:** Perpetual intermediate, with contextual help for newcomers.

**Nearest exemplar:** Things for calm personal organization, persistent selection and forgiveness; BBEdit for the complete menu command index and recovery discipline. These are decision references, not templates.

**Character:** (1) Views → Episodes and Playlists → Entries/History/Listening Timeline; (2) a restrained blue Multicolor accent with initials-based artwork placeholders; (3) source list, compact metadata table and optional Inspector; (4) a persistent bottom transport bar **[owner fixed]**; (5) plain action/consequence language with restrained glass on functional controls **[glass adoption owner fixed]**. Baseline: all 35 supplied states in each appearance, especially [light/01-subscriptions.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/01-subscriptions.png), [light/03-episode-inspector.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/03-episode-inspector.png), [light/06-default-playlist.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/06-default-playlist.png) and their Dark partners. No baseline or code was altered.

**Owner decisions:** Grade the brand as a normal system-accent asset, not a forbidden override. Preserve bottom transport, app-level System/Light/Dark, no toolbar customization, two-click timed unsubscribe, and the approved glass surfaces. Spotlight is approved but deliberately last. MCP is off by default; App Intents are on. A kept owner decision can still fail and cap a score; WIN-05 and SYS-05 do, and neither is the next target.

Scope and standard: [CRITIQUE.md](/Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md) plus [core checklist](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/core-checklist.md), [Mac checklist](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/mac-checklist.md), [rubric](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/rubric.md), [Mac platform signals](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/platform-fit.md), [principles](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/principles.md), [exemplars](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/exemplars.md), [anti-patterns](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/anti-patterns.md) and [contrast pairs](/Users/sarvagnan/Documents/UI_Guidelines/examples/contrasts.md). Earlier PodList grading reports and UI-GRADE.md were not opened. No app launch, computer-use, screen-control, foreground automation, build or UI test was performed. Image processing only reads the supplied PNG files. Only this report is a repository change.

## Flows

**Tasks inspected as captured state sequences (not newly executed flows):**

| Task | Supplied states | What can be established |
|---|---|---|
| Discover and subscribe | 01 → 18 → 19 → 20 → 21 → 22; 24 discovery | Podcast page, expansion, armed/disarmed wording, settings and discovery affordances. No actual unsubscribe success/Undo strip. |
| Find and organize Episodes | 02 → 03; 04; 15 → 23; 33 | Search scope, persistent row selection, multi-selection and placement chooser. No timed add/undo completion. |
| Manage Playlists | 06 → 07 → 08 → 09 → 34a → 34; 10 → 11 → 12 → 13 → 14 | Entries/History/Timeline, consequence preview, settings/rename/create and Trash state. Rewind is previewed and cancelled. |
| Create/edit a View | 05 → 16 → 17 | Match count, conditions, validation/draft architecture and fixed footer. No delayed-save input probe. |
| Listen and configure | 26; 27 → 28 → 29 → 30; 31 → 32 | Player, Settings panes, text/appearance options, stats empty state and optional help. Audio stays paused. |

**Widths:** Library 1180×760 pt (`2360×1520` PNG, 2×); desktop 1920×1200 pt, Retina VM. Auxiliary windows use their own captured sizes (Add Podcasts 650×600 pt; Automation Settings 640×224 pt). The source minimum Library is 760×500 pt. Minimum and half-display/tiled widths are **not** supplied. Apparent visual sizes in image thumbnails were not used as measurements.

**Appearances:** all 35 Light and 35 Dark PNGs reviewed, with all 70 `.txt` snapshots parsed. [README.md](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/README.md) reports 141/141 required attachments exported. [menus.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/menus.txt) is the menu source; shortcuts are read from source, never inferred from its `unavailable` fields.

**Script:** [PodListUITour.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/UITour/PodListUITour.swift) is the supplied tour's source. It has useful header/rename-focus assertions, but is not the standard's full instrumented flow runner. It explicitly disables launch-state restoration for the fixture. No new run was made.

**Timed runs/device:** no qualifying five-pass latency/hitch runs; VM hardware/refresh-rate equivalence to the audience is unestablished. **Measurements file:** none supplied for the full audit contract. **Screenshot strips:** the supplied per-state Light/Dark folders; these are settled state captures, not timestamped late-arrival strips. Therefore stability sub-score **N/O in both appearances**. No transition displacement or performance failure is invented from separate stills. FLOW-03 can be evaluated in code; FLOW-05/06/07 have static evidence. FLOW-01/02/04 and responsiveness remain unverified.

**Failures:** no measured FLOW or RESP failure established. This does not mean they pass.

## Cross-screen inventory

S = captured; C = source-only path. “None” means absent on that screen; unexercised success/error paths are explicitly C, not claimed captured. Neutral means primary/secondary semantic text; failures use readable red on reading surfaces, primary text on glass.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Library tables / Views / multi-selection (02–07,10,15,33) | C: top content edit-status strip; named operation, neutral | C: same strip, red text + Retry | None | C: persistent named Undo/Redo in status + Edit menu | C/S: centered icon, heading, explanation and task route; neutral | None | Top toolbar/row Play/Add; current source selected | View condition summary above table; Inspector hint |
| History / Timeline (08–09,34a) | C: shared top status | C: shared top status, red + Retry | Rewind opens consequence sheet | C: shared named Undo | S: centered No History, explains what creates it | None | Section control above content; Rewind to Here beside each event | S: History explains manual marks |
| Playlist settings / new / rename (11–13) | C: edit status above footer; then closes/navigates | C: local status or field message, red | Save/Cancel; explicit delete-immediately explanation | C: named history through shared status/Edit | None | Parent-window sheet only | Footer trailing Save/Create; inline Save Name during rename | Consequences and 30-day Trash explanation in body |
| View editor (16–17) | C: named edit status above footer | C: red field validation and pinned status | Save/Create/Cancel; live matching count | C: named Undo/Redo in footer status | None | Parent-window sheet only | Footer trailing Save/Create | Persistent labels, Optional markers, match count |
| Trash (14) | C: shared top status, named restore/delete | C: shared status | C: irreversible permanent-delete confirmation, Cancel | C: named Undo where reversible | S: centered Trash Is Empty, restoration explanation | C: permanent-delete dialog only | Restore beside object; destructive action in menu | S: retention and preserved History/Timeline above list |
| Podcast page / subscription settings (18–22) | C: shared Library edit strip | C: page/setting-local Retry, red | S: same-control red Unsubscribe arm, no modal; C: auto-disarms | C: shared history for subscription edits | C: centered No Episodes Yet/No Matching Episodes with recovery | Subscription settings blocks its parent only | Subscribe/Share/Settings near title; Save trailing in sheet | Show Description; Download Rule on This Device |
| Add to Playlist (23) | C: shared edit status then dismissal | C: status above footer, red | S: Playlist choice plus Play Now/Last/Next | C: underlying named history | None | Parent-window sheet | Footer trailing Play Next; alternatives leading | Active Playlist explicitly marked |
| Add Podcasts (24) | C: Subscribed mark in result + edit strip | C: under query, red + Retry | None | C: named edit strip | S: Find Your Next Podcast with feed example | None; independent modeless window | Search beside query; Subscribe beside result; Close trailing footer | S: persistent query label, RSS example and OPML route |
| Download rules (25) | C: named shared history after Apply | C: status above footer, red | S: one rule for selected subscriptions, Apply/Cancel | C: named history | None | Parent-window sheet | Footer trailing Apply | Scope and device explicitly stated |
| Player / Now Playing (26) | Position/state changes, neutral | C: beside transport; primary on glass + Retry | None | C: Library history for queue edits; no promise that transport pause is an edit | C: No Current Entry | None | Persistent bottom transport / central Now Playing controls | Time, speed, sleep and Active Playlist; menu shortcut reference |
| General / Automation Settings (27–30) | C: live values, no generic Saved modal | C: at setting/connection, red + Retry | C: Bring Over preview when requested | C: reversible Library setting edits; native text undo | None | C: requested bring-over sheet only | Local setting controls; no app-wide Save | Appearance/Text Size guidance; MCP permission summary |
| Listening Stats / Getting Started (31–32) | None | None shown | None | None | S: No Listening Yet with playback next step | Getting Started is a sheet only when explicitly opened from Settings | Dismiss trailing; chart/table choice when populated | Three plain steps; Help remains findable |
| Rewind preview (34) | C: shared status after completion | C: local status + Retry | S: names cursor/position, restored/unplayed/kept consequences | S/C: explains reversibility; shared named history afterward | None; explicit None values under empty consequence groups | Parent-window sheet | Footer trailing Rewind, Cancel | Permanent Listening Log preservation explained |

**Mismatches:** shared Library edit results live at the top of the workspace, while task-sheet edit results live just above the bottom footer; field errors are more local still. These are scoped consistently through shared components, but the same Library-edit failure can be encountered in different regions (Library vs View/Playlist sheet). The wording/recovery verb is consistently Retry, and statuses have the same semantic color roles. This is a residual visual-consistency cost, not evidence of measured movement. There is no timer-only Undo/error recovery. Ordinary short success notices may expire while named Undo remains. The owner’s timed unsubscribe arm is a safety affordance, not the sole recovery path.

## Checklist

Coverage: **86.0%** (**pass 116 · fail 13 · N/O 21 · N/A 18**; 168 IDs, 150 applicable). Formula: (pass + fail) / (pass + fail + N/O). Every core and Mac ID receives exactly one verdict below. N/O is not a pass and imposes no cap.

### Failures by severity

**Blockers: none verified.** In particular, AX-01 and KEY-01 remain N/O; the static artifacts do not justify either certifying them or inventing a blocker.

**Major (6):**

- **MENU-01 — App-menu configuration items precede Settings….** Evidence: menus.txt shows About → Connection → Automation → Settings…. [MenuCommandActions.swift:152](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/MenuCommandActions.swift:152) inserts these through the Settings command group. The anatomy table places Settings before optional configuration items. **Fix:** Place Settings… first in that group, followed by Connection and Automation; inspect the resulting native menu order. Principle: `conventions`.

- **CTRL-01 — Playlist main-content sections use a segmented picker.** Evidence: light/dark 06, 08, 09 and 10 show Entries / History / Listening Timeline switching the main content. [PlaylistContentView.swift:285](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PlaylistContentView.swift:285)–296 uses .pickerStyle(.segmented). The reference table reserves this main-window switching role for tabs. **Fix:** Use native tabs for the three Playlist content sections, retaining their labels, selection binding and Play This Playlist command. Principle: `conventions`.

- **DATA-06 — Adjusted sidebar width is not restored.** Evidence: [MacWindow.swift:115](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/MacWindow.swift:115)–118 explicitly declines width restoration and fixes ideal width at 225. [WindowRestoration.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/WindowRestoration.swift) stores paneWidths.sidebar, but no sidebar measurement updates it and the sidebar does not consume it. Captures 01–34a show the default, not a restoration test. **Fix:** Capture the user’s actual sidebar width and apply its bounded saved value on scene creation, without feeding live geometry back into the split view’s width negotiation. Principle: `stability`.

- **APPEAR-04 — Enabled text falls below contrast thresholds in both appearances.** Evidence: Light 18/19/21 Show Description/Show Less renders #007FE1 on #FFFFFF ≈4.10:1, below 4.5:1 for its regular 13 pt label. Dark 30 selected Automation label has #5478E4 ink over a representative #5D5A58 glass highlight ≈1.69:1. Source: [PodcastScreens.swift:135](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PodcastScreens.swift:135); [ConnectionViews.swift:60](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/ConnectionViews.swift:60)–66; bundled AccentColor via [build-mac-app.sh:32](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/scripts/build-mac-app.sh:32) and 43–49. The failure includes an enabled control label, so it is major, not an isolated decorative-icon exception. **Fix:** Give the description control a contrast-safe semantic foreground, and ensure selected Settings-pane text reaches 4.5:1 over its actual highlight (for example a primary-text selected label). Keep the person’s accent selection and the Multicolor brand asset. Verify all four contrast/transparency combinations in both themes. Principle: `accessibility`.

- **WIN-05 — Essential transport controls occupy the bottom bar — owner decision.** Evidence: Every Library capture, including light/dark 01, 06 and 33, places play/pause, seek and timing at the bottom. [MacWindow.swift:200](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/MacWindow.swift:200)–208 and [PlayerViews.swift:6](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PlayerViews.swift:6)–54 implement a substantive transport surface, beyond the checklist’s limited-status bottom-bar allowance. Menu equivalents mitigate access but do not change the placement verdict. **Fix:** If this decision is ever reopened, add an always-visible transport route above the lower edge or use the modeless Now Playing window as the primary transport surface. Preserve the approved bottom player now; do not make this the next target. Principle: `content-first`.

- **SYS-05 — Library content has no Spotlight indexing — owner-deferred.** Evidence: [PodListMac.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListMac/PodListMac.swift)/AppIntents.swift expose intents; [build-mac-app.sh](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/scripts/build-mac-app.sh) declares only the private Episode transfer type. The Apple source tree contains no Core Spotlight index or searchable-item updates. Captures 30 and menus.txt cover automation, not Spotlight results. **Fix:** At the owner’s scheduled final integration stage, index Episodes and appropriate Library objects with stable IDs, titles, podcast metadata and a working open destination; remove stale index entries. No Quick Look penalty for absent editable document types. Principle: `discoverable-commands`.

**Minor (7):**

- **APP-01 — The shipped About metadata lacks copyright.** Evidence: menus.txt has About PodList and [build-mac-app.sh:24](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/scripts/build-mac-app.sh:24)–39 supplies version metadata, but no NSHumanReadableCopyright or custom About-panel copyright is supplied. About itself is not captured. **Fix:** Add the copyright metadata to the generated bundle and verify the standard About panel includes version and copyright. Principle: `conventions`.

- **DATA-05 — Undo reports restored content without revealing it.** Evidence: [PlaylistEditingModel.swift:106](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:106)–143 reverses changes, reloads, and adds restored Playlist names to status; it never requests a destination/selection/scroll reveal. [MacWindow.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/MacWindow.swift) reconciliation only intersects the current selection. Captures 14 and 33 show the relevant Trash/selection contexts, not a successful Undo. **Fix:** Publish the restored object IDs with an Undo result, navigate/reveal the relevant restored object and row, and keep the named status announcement. Principle: `feedback`.

- **SET-04 — Last Settings pane is not durably remembered.** Evidence: [ConnectionViews.swift:57](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/ConnectionViews.swift:57) initializes pane with @State = general; no AppStorage/SceneStorage or other persistent pane value is used. Titles in captures 27–30 correctly follow General/Automation, but a fresh Settings view starts in General. **Fix:** Persist only the last-selected pane, restoring it when Settings is explicitly reopened; keep Settings closed on launch. Principle: `stability`.

- **HELP-02 — Supplementary Help item lacks separation.** Evidence: menus.txt shows PodList Help immediately followed by Getting Started; [PodListMac.swift:42](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListMac/PodListMac.swift:42)–45 adds both without a Divider. The native search field is present; there is no Help Book metadata in the bundle. **Fix:** Separate Getting Started from the primary PodList Help item. Retain the system Help search; add a Help Book if searchable help content beyond menu search is intended. Principle: `hierarchy`.

- **SYS-02 — No purpose-specific Service for selected feed addresses.** Evidence: [build-mac-app.sh:24](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/scripts/build-mac-app.sh:24)–39 has no NSServices provider declaration, and no provider handler appears in the Mac/UI source. [AddPodcastsWindow.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift) already accepts a feed address, making selected-URL subscription a relevant cross-app task. Capture 24 establishes that task. **Fix:** Offer a Subscribe in PodList Service for selected feed URLs, routing to a preview through the existing discovery/import workflow. Principle: `conventions`.

- **SYS-03 — Views and Playlists cannot be reopened through stable content links.** Evidence: [LibraryWindowTarget.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/LibraryWindowTarget.swift) is an internal scene value; [ShareLinks.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/ShareLinks.swift) only emits publisher/enclosure web URLs. There is no URL-scheme/universal-link registration in [build-mac-app.sh](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/scripts/build-mac-app.sh) and no onOpenURL route in [PodListMac.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListMac/PodListMac.swift)/MacWindow.swift. Captures 05/06 show saved, addressable objects. **Fix:** Add stable, Library-scoped links for Views, Playlists and local Episodes, with safe missing-object handling and copy/open commands. Keep publisher links for public sharing. Principle: `user-control`.

- **COPY-04 — Some tooltips retain title-style action capitalization.** Evidence: [EpisodeEditingViews.swift:143](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift:143) uses help("More Episode Actions"), a title-case phrase instead of a sentence-case action fragment. The corresponding toolbar menu appears in light/dark 03; hover wording is established by code. **Fix:** Use a concise sentence-case fragment such as Show more episode actions; preserve title case in the menu/control title. Principle: `plain-language`.

**Contrast method:** samples are from original 2× PNGs converted to sRGB, using fully covered glyph colors and adjacent surface colors, not antialiased edge pixels. Coordinates are window-local pixels from the upper left. Light 18 description sample: x710–923, y423–459; the matching XCUI element is (725,401.5,106.5,18.5) pt on the desktop and the window origin is (370,190). Dark 30 Automation text sample is x624–767, y130–175; the highlight varies spatially, so 1.69:1 is a representative local pair, not a claim of a uniform surface. The failure is far below 4.5:1 across the selected gray region. As controls, these labels are not decorative/disabled exceptions. For context, the custom secondary palette is much better: #606060 on white ≈6.29:1 and #A0A0A0 on the sampled dark reading surface #302D2D ≈5.22:1. Dark description text #4FAEFF on #302D2D is ≈5.74:1; Light Automation #2B5ECA on #FDFDFD is ≈5.80:1. This is a targeted contrast finding, not a claim that either entire theme is unreadable.

**Direct failure references:**

- [MenuCommandActions.swift:152](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/MenuCommandActions.swift:152)
- [PlaylistContentView.swift:285](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PlaylistContentView.swift:285)
- [MacWindow.swift:115](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/MacWindow.swift:115)
- [PodcastScreens.swift:135](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PodcastScreens.swift:135)
- [ConnectionViews.swift:57](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/ConnectionViews.swift:57)
- [PlayerViews.swift:6](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PlayerViews.swift:6)
- [PlaylistEditingModel.swift:106](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:106)
- [EpisodeEditingViews.swift:143](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift:143)
- [PodListMac.swift:42](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListMac/PodListMac.swift:42)
- [ShareLinks.swift:1](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/ShareLinks.swift:1)
- [build-mac-app.sh:24](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/scripts/build-mac-app.sh:24)
- [menus.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/menus.txt).
- [light/18-podcast-market-hours.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/18-podcast-market-hours.png) and [light/18-podcast-market-hours.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/18-podcast-market-hours.txt).
- [dark/30-settings-automation.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/dark/30-settings-automation.png) and [dark/30-settings-automation.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/dark/30-settings-automation.txt).
- [light/06-default-playlist.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/06-default-playlist.png) and [light/06-default-playlist.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/06-default-playlist.txt).
- [light/13-new-playlist.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/13-new-playlist.png) and [light/13-new-playlist.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/13-new-playlist.txt).
- [light/17-new-view.png](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/17-new-view.png) and [light/17-new-view.txt](/Users/sarvagnan/Documents/podlist-grading/mac-round-7/light/17-new-view.txt).

### N/O

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, KEY-07, APPEAR-11, TYPE-06, AX-01, AX-04, WIN-03, WIN-10, TOOL-02, WMENU-02, DRAG-05, DRAG-07, PTR-05, FOOT-01, FOOT-02, RESP-01, RESP-02.

**Evidence limits for those IDs:**

- FLOW-01: No instrumented transitions, late-arrival probes or minimum/tiled-width strip.
- FLOW-02: No step-by-step first-responder and scroll trace.
- FLOW-04: Pinned footers fit the supplied size; minimum-size follow-up visibility is unmeasured.
- KEY-01: Native controls and menu routes are present; a complete Full Keyboard Access traversal is absent.
- KEY-04: New Playlist and rename focus are evidenced by tour code; full forward/backward focus traversal and Go to Time initial focus are not settled.
- KEY-07: Native scrolling is used, but Space has a documented playback meaning; all other scroll-key routes are not established.
- APPEAR-11: Settled captures and source cannot establish intermediate-frame coherence.
- TYPE-06: No three full representative show-note reading lines are captured; Help has a bounded column, but that cannot establish every reading surface’s actual measure.
- AX-01: Icon controls have explicit names, but XCUI exposes blank names for several native fields/pop-ups. The export omits AX title/label relationships and subroles; source labels alone cannot settle what VoiceOver speaks.
- AX-04: Non-drag commands exist; actual Voice Control/Switch Control operation, particularly those field labels, is not established.
- WIN-03: Only the typical-size Library is captured; minimum/tiled layout, display changes and enlarged-content fit are not fully settled by constraints.
- WIN-10: No live-resize recording, timing or edge-grab observations.
- TOOL-02: System toolbar owns overflow; minimum-width priority/visibility behavior is not captured or otherwise established.
- WMENU-02: Native Zoom is present; its content-appropriate size and toggle result are not observed.
- DRAG-05: Native drag APIs and progress/retry exist; source highlight, onset distance and insertion-cue rendering are not captured.
- DRAG-07: Native row drag sources exist; one-motion and inactive-window selection behavior is not established.
- PTR-05: Code dispatches against the context target; preservation plus the visible unselected-row outline needs an open context-menu observation.
- FOOT-01: No comparable bundle-size, launch, idle CPU/memory or other-app/WindowServer measurements.
- FOOT-02: No representative long-list hitch or common-action hang measurements.
- RESP-01: No five-pass input-to-response p75 measurements on audience-like hardware.
- RESP-02: No five-pass keystroke/frame and continuous-gesture hitch measurements.

AX caution: `_XCUI:CloseWindow` and similar identifiers identify native system controls even when their exported label is blank. The concern here is the unrecorded label relationships for content fields/pop-ups, not a claim that native traffic lights lack VoiceOver names. Source-only accessibility successes do not erase this uncertainty.

### N/A

| ID | Reason |
|---|---|
| LIST-05 | No expandable content-row hierarchy or app-owned disclosure tree; sidebar groups are fixed sections. |
| DLG-09 | No authored stateful popover workflow; menus and the irreversible-loss confirmation use native presentations. |
| FILE-01 | No file-document creation/opening model; Library objects use New View/New Playlist and OPML is an import/export interchange. |
| FILE-02 | No opened file documents or document recents (→ FILE-01 scope). |
| FILE-05 | No printing feature or printable document workflow. |
| FMT-01 | No formatted-text editor. |
| FMT-02 | No formatted-text editor (→ FMT-01). |
| DATA-02 | No editable file-document dirty state; Library edits are transactional. |
| DATA-03 | No autosaved file-document/version-browser model (→ DATA-02 scope). |
| DATA-08 | No registered editable document model (→ FILE-01 scope). |
| START-05 | No custom access permission request requiring a purpose string; system file pickers are used. |
| START-07 | No app account creation; local/server Library identities are not user accounts. |
| SYS-06 | No browser extension, credential filling, or Finder editing task is necessary to the specified core workflow; feed/OPML receiving uses drop and import. |
| SYS-07 | No document-preview or task-count Dock contract; playback already has system Now Playing integration. No speculative requirement for a decorative badge. |
| EXTRA-01 | No menu bar extra by design. |
| EXTRA-02 | No menu bar extra (→ EXTRA-01). |
| EXTRA-03 | No menu bar extra (→ EXTRA-01). |
| EXTRA-04 | Sovereign Library app, not a dual-mode quick-access utility. |

### Passes

C evidence below is a source-based verdict on the implemented contract, not a claim that a live assistive-tech, drag or responsiveness test ran. Source names resolve under `apps/apple/Sources/PodListUI` unless PodListMac, PodListDomain or the build script is explicitly named. Capture numbers resolve to the README state names, in both Light and Dark unless qualified.

| ID | Evidence |
|---|---|
| FLOW-03 | C: AddPodcastsWindow.search rejects cancelled/stale queries; ViewEditorScreen serializes saves and blocks final submit/rename while saving; raw numeric drafts stay separate from model updates. No late writer found that replaces newer input. |
| FLOW-05 | S: 02/03/06/07/33 content and Inspector have deliberate common upper pane boundaries; shorter inner content is visibly scoped, not a misaligned peer panel. |
| FLOW-06 | S/C: 08/14/24/31 give content-bearing empty states; Inspector memberships render No Playlists and Chapters is conditional. No orphan heading found. |
| FLOW-07 | S/C: 11/13/16/17/22/23/25/34 keep commit/cancel bottom-trailing via PodListSheetFooter. Only captured width established. |
| KEY-06 | C: [KeyboardShortcuts.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift) uses layout-aware KeyEquivalent values; custom letter/arrow families avoid modifier-bound punctuation characters. Bigger/Smaller use native +/− convention. |
| KEY-08 | C: ConnectionViews.PodListHelp contains an in-app shortcut grid and explains Space/Return and text-entry exceptions; PlaybackKeyboardGuard protects text. |
| DLG-01 | C: PlaylistSettingsViews reserves permanent-delete confirmation for irreversible loss; normal removal/deletion/star edits use undo/status. |
| DLG-02 | C: permanent-delete confirmation names the Playlist and explains exactly what stays and what is lost; no generic error-code alert titles. |
| DLG-03 | C/S: permanent-delete has Delete Permanently/Cancel; captured sheets use Save/Create/Apply/Play/Rewind verbs. |
| DLG-04 | C/S: shared footer has native cancel/default equivalents; PlaybackKeyboardGuard routes ⌘. to sheet cancellation; 11/13/23/34 have trailing primary actions. |
| DLG-05 | C: permanent-delete uses destructive role with Cancel; reversible Delete Playlist is intentionally immediate and recoverable through Undo/Trash. |
| DLG-07 | S: 11–13,16–17,22–23,25,34 do not combine Cancel, Done and Back; modeless close-only tasks use Close/Done appropriately. |
| CTRL-02 | C/S: PodListSheetCheckboxStyle retains native checkbox semantics and labels; Clear on Played is an independent binary setting (11). No mixed hierarchy required. |
| CTRL-03 | S/C: visible persistent Name, Mentions (Optional), numeric-unit and query labels survive text entry (12/13/17/24/27); required Name and optional limit fields are distinguished. AX naming is separately unverified under AX-01. |
| CTRL-04 | C: FormNumbers plus PersistentNumberField use locale parsing/formatting and nearby validation; short numeric inputs are bounded to 88 pt. |
| CTRL-05 | C: custom glass/default styles wrap native Button configurations, keeping pressed tracking; prominence uses styles, not oversized general form buttons. |
| CTRL-06 | C/S: Episode menus group related actions; Play and Add have on-canvas routes, and Podcast/Playlist task actions remain visible or labeled in menus. |
| CTRL-07 | S/C: current view/title and Search this list / Search Episodes / Search Library convey scope (02/15/18); no search-history UI. |
| CTRL-08 | C: OPMLImportContent and LibraryEditingModel show per-feed progress and cancellation; DownloadViews offers progress and cancel/retry. Jobs and drafts outlive closed windows. |
| LIST-01 | C/S: MacWindow/PlaylistContentView/PodcastScreens use SwiftUI Table for flat columnar Episodes/Entries and List for navigation; XCUI exports SwiftUI tables as outlines, not evidence of app-owned row hierarchy. |
| LIST-02 | S: Episode, Published, Length, State, Entry and Position are consistent noun headings without punctuation (02/06/18). |
| LIST-03 | C: native Table sortable comparators and min/ideal/max column widths; manually ordered Entries intentionally are not sortable. Reading layout supplies Sort by/Descending. |
| LIST-04 | S: row separators and shared alignment track the small metadata columns in 02/06/18/33. No file/path names require middle ellipses. |
| LIST-06 | S: sidebar/table selection and Playlist section remain visibly selected (03/07/10/33); menu Pickers/Toggle supply chosen states in code. |
| LIST-07 | C: native selection-bound Table/List, typed selection in ViewTypeSelection for custom View rows, native primaryAction handlers for openable items; keyboard Play Now is documented separately. |
| DATA-01 | C: LibraryEditingModel drafts, PlaylistDrafts, SheetSettingsDrafts and per-Library storage retain pending edits; ViewEditorScreen waits for queued writes on Finish/Cancel and keeps failures retryable. |
| DATA-04 | C: PlaylistEditingModel/EditHistory register named inverse changes and repeated undo/redo; EpisodeEditingViews routes ⌘Z/⇧⌘Z to native text undo while editing, app history otherwise. |
| DRAG-01 | C: EpisodeTransfer offers private payload/URL/title drag-out; LibraryDrops accepts feed URLs and OPML; rows/Playlists accept transfers. Add, Move Up/Down and File Import supply non-drag equivalents. No claim of a separate Dock-import interface. |
| DRAG-03 | C: EpisodeDrop uses reversible add/move edits; library drops stage an import preview and group imported subscriptions for reversal. |
| DRAG-06 | C: native List/Table destinations own autoscroll; EpisodeDrop exposes completed/total preparation and retry, then calls selected/didDrop to select and reveal results. |
| PTR-03 | C: standard buttons, native Table/List and split view preserve pointer tracking; no app cursor override or custom pointer gesture replacement. |
| PTR-04 | C: row and player icon actions have action-specific help; long titles are exposed through help/text selection and actions remain visible without hover. |
| APPEAR-03 | C: MacGlassSurface branches for Reduce Transparency or Increase Contrast, with opaque backgrounds/borders; brand/error/secondary colors have all four appearance variants. Native chrome uses system materials. Rendered combinations remain a validation limit, not an observed failure. |
| APPEAR-05 | C: no app-authored animation/transition/withAnimation path found in PodListUI; standard controls own motion and OS preference behavior. |
| APPEAR-09 | S/C: consistent SF Symbols for Play, Share, Trash, sidebar lists and download; stable weights/optical alignment (03/06/26). |
| APPEAR-10 | S: plain content tables contrast with toolbar/glass controls, borders and separation in both themes; no decorative movement. |
| TYPE-02 | C/S: system Regular/Medium/Semibold/Bold; no thin reading text or competing typefaces. Monospaced digits are confined to timing/counts. |
| TYPE-03 | C/S: system body/caption text with semantic styles; explicit reading-text enlargement uses MacTextSize. |
| TYPE-05 | C: MacReadingRow reflows metadata at enlargement; shared sheets scroll content with pinned actions and wrap prose. Native leading is retained; no tight-leading override. |
| TYPE-07 | S/C: no multi-line all-caps prose or authored bold+italic emphasis; link-style underline stays on links. |
| TYPE-08 | C/S: authored strings use …, curly apostrophes/quotes and real dashes; literal addresses/code remain literal. |
| COPY-01 | S/C: Play Now/Next/Last, Mark Played, Rename and Rewind name actions consistently; Mac help uses click and window. |
| COPY-02 | C: FailureMessages/FailureFeedback and field validation give practical Retry or corrected-input guidance next to the operation, without blaming the person. |
| COPY-03 | S: No History explains playback vs manual marks (08); Trash explains restoration (14); discovery invites name/feed input (24); stats invites playback (31). |
| AX-02 | S/C: Current Entry text plus play mark; Active Playlist is named; Star/Unstar changes glyph/name; Unsubscribe uses wording and minus glyph in addition to red (20/33). |
| AX-05 | C/S: transport position/chapter state is visual/textual, playback can always be paused/stopped; no essential app-only audible signal found. Publisher-supplied podcast transcription is outside this app-interface check. |
| START-01 | C: PodListWindow presents Opening Library progress or usable Welcome; async model startup and independent windows avoid an authored blocking launch dialog. Actual latency is RESP-01 N/O. |
| START-02 | C/S: Getting Started has Dismiss, persisted Library preference and Help/Settings re-entry; standalone startup avoids server setup (32 and ConnectionViews). |
| START-03 | S/C: task-specific empty guidance, match count in View editor, and recoverable Getting Started; close/dismiss routes are explicit. |
| START-04 | C: no nonessential permission solicitation at launch; access to imports/exports comes from system user-chosen panels. |
| START-06 | C: Start on This Mac makes the core task available without an account; optional server connection is not a mandatory login gate. |
| EDIT-02 | C: native text editing commands plus Table Copy/Delete selection handlers; Delete removes Entries without modifying the pasteboard. |
| EDIT-05 | C: EpisodeCopyContent offers title text and URL; ShareLinks can copy feed/public links. No styled-text editor needing Paste and Match Style is authored. |
| TOOL-06 | C: native SidebarCommands and PodListCommands restore hidden panes; no customizable toolbar is offered by owner decision, so customization modes are not claimed. |
| SIDE-03 | C/S: system SidebarCommands plus visible sidebar toggle; Inspector uses toolbar button and View item at ⌥⌘I (02/03). |
| SIDE-04 | S/C: persistent source selection controls the adjacent content; Podcast detail deliberately keeps its Subscriptions parent selected (03/18). |
| SET-01 | C/S: General/Automation hold app-wide options; Playlist/Subscription settings live with their objects (11/22/27–30). |
| MENU-02 | C/S: LibraryCommands, PlaylistEditingCommands, PlaybackCommands and AdditionalMenuCommands index navigation, row actions, sharing, sort, recovery and panels; contexts dispatch shared handlers. Local dialog submission/cancellation belongs to its presenting task; app-level entry/action equivalents are indexed. |
| MENU-03 | S/C: menus.txt retains unavailable commands and disabled submenus; Toggle/Picker and Play/Pause reflect state. No frequency-driven menu reordering. |
| MENU-04 | S: explicit command verbs and ellipses on New View…, Add Podcasts…, Subscription Settings…, Go to Time…; window navigation needs no further completion input. |
| MENU-05 | C/S: app-authored action submenus stay one level deep; context-only menus omit deep per-Playlist placement menus. System Move & Resize/Find submenus are OS-owned. |
| MENU-06 | C: app has no hidden modifier-alternate-only tasks; native Option alternatives retain system routes. |
| APP-02 | C/S: SwiftUI Settings scene and native Settings… command at ⌘,; separate movable General/Automation window (27–30). |
| APP-03 | C: native text fields/selectable text retain system text/Services machinery; Apple/Services are excluded from the supplied menu export, so third-party service execution itself is not claimed. |
| APP-04 | S/C: native Hide/Hide Others/Show All/Quit order in menus.txt; SwiftUI/AppKit standard action routing retained. |
| FILE-03 | C/S: native Close/Close All; independent Window/WindowGroup scenes rather than embedded imitations. No multi-view file Close File case. |
| FILE-04 | C: Export OPML uses NSSavePanel then writes separately; current Library/window stays open. No Duplicate document feature. |
| EDIT-01 | C/S: Edit begins Undo/Redo and code uses undoTitle/redoTitle/native field-editor operation titles. |
| EDIT-03 | C/S: native Find submenu preserved by TextEditingCommands; separate Search Library focuses object search at ⌘F; no renamed text Find Next/Previous commands. |
| EDIT-04 | C/S: TextEditingCommands and native fields retain Spelling, Substitutions, Transformations, Speech, Dictation and Emoji entries (menus.txt). |
| VIEW-01 | S: View includes sidebar/Inspector/text size/sort and Enter Full Screen. |
| VIEW-02 | C/S: Show/Hide Inspector/Sidebar change with visibility; View owns appearance/layout, Window owns independent windows. |
| WMENU-01 | S/C: native Window has distinct Minimize, Zoom, Bring All to Front plus scene routes. |
| WMENU-03 | S/C: one current Library window is listed after the management section; auxiliary Window commands above it are open-window entry points, not duplicated document-list records. |
| HELP-01 | C/S: trailing Help includes real PodList Help/Getting Started; native searchable Help menu retains its standard invocation. |
| KEY-02 | C: standard app/text shortcuts retained; PlaybackKeyboardGuard protects Space/Return/⌘arrows while editing and ⌘. in sheets. Search Library is an app-object search, not a destructive repurposing. |
| KEY-03 | C: frequent queue/star/played/Inspector commands have documented Command families; custom Control bindings are avoided. Download’s missing shortcut is explicitly documented, not hidden. |
| KEY-05 | C: native menu equivalents localize; shortcut grid uses correct glyph order and ⌘+ notation. |
| TEXT-01 | C: SwiftUI native TextFields use Cocoa field editing; PlaybackKeyboardGuard calls interpretKeyEvents for intercepted text navigation and leaves other bindings alone. |
| TEXT-02 | C: native text controls, TextEditingCommands and no substitution/spelling-disabling override; no custom editor replacing the Cocoa text system. |
| WIN-01 | S/C: native WindowGroup and standard close/minimize/zoom controls, visible in 01/24/26/31. |
| WIN-02 | S/C: sidebar loses emphasis when table receives selection (03/07/33), and sheet parents gray controls (11/13/34); native list/window rendering owns inactive appearance. |
| WIN-04 | S: titles identify Subscriptions, New this week, Default, Commute and Market Hours; subtitles supply object counts instead of a redundant app name. |
| WIN-06 | C/S: native full screen via system window controls/View menu; no custom full-screen or Dock suppression. |
| WIN-07 | C: Add Podcasts/Now Playing/Stats/Help have explicit independent tasks; Views/Playlists offer Open in New Window. |
| WIN-08 | C: WindowGroup plus New Window/Open in New Window support simultaneous Libraries/Views/Playlists; Inspector/sheets preserve surrounding working context. |
| WIN-09 | C/S: no app-owned title-bar drag tracking or custom traffic-light implementation; native unified toolbar retains standard double-click/full-screen routes. |
| TOOL-01 | S/C: leading navigation/title, system sidebar control and trailing task controls/search follow native toolbar placement. |
| TOOL-03 | S: limited symbolic task group, More menu and separate search; no pile of separately tinted text buttons (03/33). |
| TOOL-04 | S/C: common frame actions are native symbolic toolbar buttons; no large custom Back/Close or competing prominent toolbar fills. |
| TOOL-05 | C: window-frame controls use ToolbarItem/ToolbarItemGroup; checkboxes, fields and choice controls stay in content. |
| SIDE-01 | S/C: leading sidebar visible by default (NavigationSplitView all). |
| SIDE-02 | S: sections plus flat destinations, within two hierarchy levels. |
| SIDE-05 | S/C: native split/Inspector dividers remain legible in both themes; widths have explicit pane limits. |
| SIDE-06 | C: native sidebar List with no app font override; macTextScale deliberately stays 1 so OS Sidebar icon size owns its metrics. No bottom-only sidebar action. |
| SET-02 | C/S: Appearance defaults System and offers Light/Dark; accessibility/scrolling preferences are not duplicated (28/29). |
| SET-03 | S/C: selected General/Automation toolbar stays visible; native Settings dims minimize/zoom; pane-specific height preferences size the window (27–30). |
| SET-05 | C/S: General setting bindings write live, errors stay by the field; app-wide Settings has no Save/Apply commit. Object sheets explicitly distinguish Save and immediate actions. |
| SET-06 | C: native Settings scene is not opened by launch code; fixed content constrains size and captured zoom is inactive. Pane-memory omission is SET-04. |
| DLG-06 | C/S: native per-window sheet hosts, pinned footer and available-height-limited content; one captured sheet at a time, independent windows remain supported. |
| DLG-08 | C/S: repeated discovery uses a modeless Add Podcasts Window; Inspector is embedded, not a floating palette. No floating NSPanel contract is offered or simulated. |
| DATA-07 | C: LibraryFileActions uses NSOpenPanel/NSSavePanel for OPML with name/location browsing; no replacement file browser or extension-visibility override. |
| DRAG-02 | C: PlaylistDragSession chooses same-Playlist move versus cross-Playlist copy; modifier state is evaluated from native events. Duplicate Episode copy safely selects the existing Entry. |
| DRAG-04 | C: EpisodeTransfer orders private rich data, public URL and text; ordered selection is encoded; LibraryDropBatch accepts all providers in order and prefers supported URL/file representations. |
| PTR-01 | C: sidebar/object/Table/Trash context menus dispatch relevant row/selection actions; unavailable menu-bar actions remain indexed separately. |
| PTR-02 | C: Episode context actions omit nested per-Playlist placement menus and keyboard equivalents; Entry-specific extra actions add one group, keeping about three groups. |
| APPEAR-01 | C/S: MacAppearanceController observes stored System/Light/Dark choice app-wide; System clears NSApp appearance. Both supplied themes are coherent. |
| APPEAR-02 | C: NSAccentColorName and compiled AccentColor variants make brand blue the Multicolor accent; controls use native accent, with contrast fallback for custom foregrounds. No app-wide fixed brand tint override. |
| APPEAR-06 | C/S: MacGlassSurface appears on player/Inspector actions/Now Playing/footer controls; content and show notes retain plain/system backgrounds. |
| APPEAR-07 | C/S: regular glass, not clear, for text controls; no nested glass panel around glass buttons; semantic primary foreground is applied on the custom control surface. |
| APPEAR-08 | S/C: native toolbar/sidebar/Inspector plus safe-area inset keep content boundaries/scroll edges distinct at captured size. No custom opaque frame masking native sidebar material. |
| TYPE-01 | C/S: semantic Mac Body 13, Subheadline 11, Caption 10; headings deliberately larger, timings monospaced digits. Artwork initials are content, not a tiny UI label. |
| TYPE-04 | C/S: MacIconLabel expands row symbols to 28×28 targets; other form controls are native Mac controls, not judged by small bezel size alone. No visible custom target below 20 pt established. |
| AX-03 | C: MacTextSizePreference exposes 100–200% in 10% steps through Settings and View commands; every scene inherits it; reading rows reflow. Full-size runtime fit is reserved under WIN-03. |
| SYS-01 | C: [AppIntents.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListMac/AppIntents.swift) supplies Episode/Playlist entities, search/add/play/pause/mark actions and shortcuts; [build-mac-app.sh](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/scripts/build-mac-app.sh) packages compiler App Intents metadata; donations/UndoableIntent preserve operation semantics. No AppleScript support is claimed, so its conditional dictionary requirement does not apply. |
| SYS-04 | C/S: ShareLink for Podcast/Episode emits supported publisher/enclosure URLs; 18 exposes Share Podcast conveniently, Inspector offers Episode Share; MCP permission summary is clear in 30. |

## Scores

Light and Dark share these category scores; appearance-specific defects are named below. Bands are chosen from the rubric’s anchors, not computed from checklist pass rate. Numerical precision supports subsequent comparisons; it does not imply a laboratory measurement of quality.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.3** | Strong: consistent Mac 13/11/10 pt semantic roles, clear title/metadata weight, monospaced timings, and a real content-size mechanism. 03/07/17/27 and [MacTextSize.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-f9ae89ff-4b0502fbb5d193b8/apps/apple/Sources/PodListUI/MacTextSize.swift) lift this above generic competence. Reading measure at the bottom of show notes remains unverified; no evidence supports Exemplary at all sizes. | hierarchy, accessibility, craft |
| Hierarchy | **7.9** | Strong: source → Episodes → Inspector is immediately legible; single and multi-selection have deliberate detail presentations (03/33). Large artwork plus duplicated transport/action surfaces and substantial fixed status space make content less dominant than the Exemplary anchor. Bottom transport is the owner’s chosen character, scored without proposing its removal. | content-first, hierarchy |
| Spacing & density | **8.0** | Strong: 225 pt default sidebar, bounded Inspector, aligned metadata columns, shared 24 pt sheet content insets and explicit 28 pt custom row hit targets. Fits a calm sovereign listener. Sparse Views and large blank feedback bands are less economical than the strongest examples; minimum/tiled fit remains unverified. | craft, conventions |
| Color & contrast | **6.6** | Competent capped at 6.9 by APPEAR-04. Most reading text has deliberate contrast-safe palettes and both themes retain hierarchy, putting it above the band floor. Enabled Light description link ≈4.10:1 and Dark selected Settings text ≈1.69:1 prevent Strong. System accent integration itself passes. | accessibility, color-restraint |
| Iconography | **8.4** | Strong: coherent SF Symbols, explicit row/Inspector action labels and expanded hit regions; playback/current-entry/Trash meanings are familiar (03/06/26/33). Dense sidebar eraser/activity marks and repeated small row actions need more learned interpretation than Exemplary icon economy. | conventions, craft |
| Consistency & polish | **6.9 (stability N/O: Light and Dark)** | Partial: no full flow run. Shared sheets, error/retry primitives, selection summaries and two themed empty states are considered, near the top of Competent. CTRL-01’s main-content segmented-picker mismatch caps this category at 6.9; message-region variation and untested edge states also keep it below Exemplary. No stability band cap is invented when the sub-score is N/O. | craft, stability |
| Clarity | **8.2** | Strong: named Play Now/Next/Last, active Playlist, match counts, device-scoped downloads, and a concrete Rewind consequence preview (17/23/25/34). Distinguishing Episode/Entry/History/Listening Log still takes explanatory copy; tooltip case drift prevents the last level of consistency. | plain-language, feedback |
| Platform fit | **6.8** | Code/menu-backed: Looks 8.0, Behaves 6.2 → (8.0 + 2×6.2)/3 = **6.8**. Native frame, Settings, menus and multiwindow behavior are substantial strengths. Main-content segments, App-menu order, bottom transport and absent Spotlight incur major failures; category ceiling 6.9. These gaps keep the behavior in Competent despite a Strong visual shell. | conventions, discoverable-commands |
| Interaction & feedback | **6.8** | Code-backed; timing/assistive-input limits remain N/O. Named multi-step undo, persisted drafts, safe late-query handling, placement commands and native drag APIs are more deliberate than generic defaults. Sidebar-width restoration fails DATA-06 (ceiling 6.9); Undo does not reveal restored content. No claim of instant response or complete keyboard/VoiceOver operation is supported. | forgiveness, keyboard-efficiency, feedback |
| **Overall** | **7.6** | Strong at the captured size: serves the podcast task with deliberate, coherent Mac UI and unusually developed command/recovery surfaces. The lowest scored category is Color & contrast 6.6, so Overall ≤8.6; 7.6 satisfies that cap. Verified contrast defects are the greatest immediate obstacle to a comfortably finished daily-use interface. Coverage is 86.0%, with stability and timing explicitly unverified. | content-first, accessibility, character |

**Caps applied:** no verified blocker cap. APPEAR-04 → Color & contrast ≤6.9. CTRL-01 → Consistency & polish ≤6.9. MENU-01, WIN-05 and SYS-05 → Platform fit ≤6.9. DATA-06 → Interaction & feedback ≤6.9. Minor failures do not set a numeric cap. No N/O/N/A item sets a cap. Owner decisions retain their caps. Stability N/O supplies no band ceiling. Overall is holistic, not an average, and is ≤ lowest scored category +2.0.

### Mac platform signals

Comparison reference is the Mac grammar in platform-fit.md and the Things/BBEdit decision exemplars. A newly captured current Apple Mail/Finder/Settings side-by-side is unavailable under this brief’s no-launch/no-screen-control restriction; this audit does not pretend to have performed one. The visible foreign-grammar list is specific: main-content segmented sections (CTRL-01), App-menu configuration order (MENU-01), and critical bottom-edge transport (WIN-05, owner-kept). Missing integration is a behavioral gap, not a foreign visual style. There is no hamburger navigation, fake title bar, web form-control kit, or fixed brand-accent override.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Frame | Native | System Window/WindowGroup, traffic lights, unified toolbar. |
| L2 Type | Native | Mac semantic styles, not iOS body sizing. |
| L3 Controls | Foreign | Main Playlist sections use content-area segments rather than tabs; ordinary fields/checkboxes/pop-ups are native. |
| L4 Menus/popovers | Native | System menu tree and native contextual menus in code. |
| L5 Shortcut notation | Native | Native equivalents and shared glyph notation. |
| L6 Sidebar/selection | Adapted | Native source list and table selection; app combines counts/activity/clear-on-played marks. Accent follows the system. |
| L7 Symbols | Native | SF Symbols and system optical treatment. |
| L8 Settings | Native | Separate pane-toolbar Settings with live bindings. |
| L9 Density | Adapted | Calm, compact metadata rows and deliberate larger artwork. |
| L10 Materials | Adapted | Glass on functional surfaces, standard reading surfaces. |
| L11 Appearance | Native | System default with optional Light/Dark; all captured screens coherent. |
| B1 Menus | Adapted | Comprehensive domain index; configuration-order error remains. |
| B2 Settings | Native | Native ⌘, Settings scene. |
| B3 Shortcuts | Adapted | Domain Command families and native text-key guard; Download unassigned/documented. |
| B4 Text | Native | Cocoa-backed editing and standard text command surfaces; third-party Service invocation not executed. |
| B5 Keyboard/lists | N/O | Selection and type-selection code exists; complete FKA/focus behavior unverified. |
| B6 Context | Adapted | Context-target handlers and menu equivalents; outline/preserved-selection rendering unverified. |
| B7 Windows/state | Adapted | Multiple content windows, scene context and row anchors; sidebar-width restoration missing. |
| B8 Drag/drop | Adapted | Ordered transfers, copy/move policies, progress, reversible edits; gesture details unverified. |
| B9 System | Adapted | Real entities/intents/donations and ShareLink; no Spotlight, stable app links or purpose Service. |
| B10 Undo/help | Adapted | Named history and useful in-app Help; reveal and Help separation gaps. |
| B11 Footprint | N/O | No measured task-comparable resource baseline. |

### What stands between this build and 9.0

The verified major failures must be resolved, or the owner must consciously retain the resulting ceilings. Fix contrast, restore the arranged sidebar width, use Mac tabs for the Playlist’s main sections, and correct App-menu order. Finish the smaller reveal/metadata/help/persistence/link/Service gaps. The owner-kept bottom player still fails this standard’s WIN-05, and deliberately deferred Spotlight still fails SYS-05; merely polishing unrelated screens cannot remove their caps. A 9.0 Overall is mathematically impossible while any category remains capped at 6.9 (its +2.0 limit makes Overall at most 8.9).

Evidence also has to catch up: minimum/tiled/typical widths in both appearances, late-result/input probes, actual focus and scroll traces, five-pass response/typing/hitch measurements, Full Keyboard Access and VoiceOver field naming, drag/context-target checks, relaunch with a changed workspace, and contrast/transparency combinations. Those are unverified requirements, not presumed defects. No amount of native-looking screenshots proves them.

## Next step

**Target:** APPEAR-04, the major in the lowest-scoring category, Color & contrast. No verified blocker supersedes it, and it is not an owner-fixed exception.

**Anti-pattern:** Ghost-text elegance is the nearest named pattern: necessary control labels lose contrast against their rendered surfaces. This is a legibility failure, without evidence that the designer intended faint text. **Root cause:** foreground colors are not constrained against the surfaces actually rendered by two native control styles. The existing custom readable-secondary/error palette work does not cover those paths.

**Smallest candidate:** give the description button a measured contrast-safe foreground in Light; ensure selected Settings-pane text uses a semantic foreground reaching ≥4.5:1 over its highlight. Do not replace the person’s accent or change the approved glass/material placement. Use contrast pair COLOR-04 (small reading text keeps contrast), and Things’ decision rule that secondary text still has to read.

**Alternative candidate:** retain accent emphasis on a separate icon/selection marker, while using primary text for the selected Settings label. This avoids changing the Multicolor accent’s selection-fill role to repair one foreground role.

**Principle / expected effect:** accessibility and color-restraint; improve Color & contrast and local legibility, with no intended change to geometry, typography, commands or character. The risk is reduced accent emphasis, so verify selected-state distinction through outline/background and text as well as hue. Both candidates preserve all five signature elements.

**Next validation:** inspect original-size before/after captures of 18/19/21 and 27/30 in Light/Dark and with Increase Contrast/Reduce Transparency separately and together; measure glyph/background pairs and run the affected keyboard routes. Then evaluate per-category better/same/worse before accepting. This grading brief authorizes report-only work, so no candidate was implemented and no after-grade is claimed.

**Handoff:** review-only report; no app code changed, no app launched, no UI tests run. Beads context was requested with `bd prime`, but its store reported `openat LOCK: operation not permitted`; no issue mutation or sync is claimed. The explicit brief authorizes committing this report only, without merge or push.
