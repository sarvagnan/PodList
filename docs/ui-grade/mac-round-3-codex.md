# PodList Mac UI grade — round 3, Codex

## Frame

Task · Find podcast Episodes through Subscriptions, Search and saved Views, arrange Entries in Playlists, listen, and recover earlier listening or editing decisions.

Target · Native **Mac app**, SwiftUI/AppKit, macOS 26+; reviewed source at **02ea2d21934bfbd8a5fb7e594cdd628b7925edfa**. Evidence is the supplied macOS 27.2 VM tour, not a run on the owner's Mac.

Posture · Sovereign personal library with background playback and a transient Now Playing window.

Audience · Perpetual intermediate, with newcomers supported by starter Views and Getting Started.

Nearest exemplar · **Things** for a calm personal library, persistent selection and reversible actions; **BBEdit** for complete menus and semantic automation. These are craft references, not replacement designs.

Character · Blue brand accent **[owner-fixed]**; three domain groups, Views / Playlists / Library; compact Episode tables with explicit Position and playback state; initials artwork when publisher artwork is absent; bottom transport with restrained glass **[owner-fixed]**. All remain intact in this review; no code was changed.

Owner decisions · Retain the supplied Light/Dark/Increase Contrast accent palette, bottom player, System/Light/Dark override, noncustomizable toolbar, timed two-click unsubscribe with Undo, and glass on the named control surfaces. Spotlight is approved but deferred; MCP starts off and App Intents remain available. These choices are graded where a checklist requires it, but are excluded from the next-change target.

Standard · The full audit in [CRITIQUE.md](/Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md), [core checklist](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/core-checklist.md), [Mac checklist](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/mac-checklist.md), [rubric](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/rubric.md), and Mac signals in [platform fit](/Users/sarvagnan/Documents/UI_Guidelines/guidelines/platform-fit.md). Severity and caps follow those files, including the 2026-11-15 responsiveness checks.

Evidence notation · **Lnn / Dnn** means the named Light / Dark capture and its adjacent `.txt` snapshot under [mac-round-3](/Users/sarvagnan/Documents/podlist-grading/mac-round-3). All 70 PNGs were visually inspected, and all 70 text snapshots were parsed (10,318 Light and 10,316 Dark elements). [README](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/README.md) maps all 35 states. [Menus](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/menus.txt) supplies menu structure and enabled state, not shortcut glyphs. No earlier grading report was opened.

Source handles used below (line numbers refer to this commit):

| Handle | Source |
|---|---|
| App | [PodListMac.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListMac/PodListMac.swift) |
| MW | [MacWindow.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/MacWindow.swift) |
| PC | [PlaylistContentView.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/PlaylistContentView.swift) |
| PS | [PlaylistSettingsViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift) |
| Podcasts | [PodcastScreens.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/PodcastScreens.swift) |
| Settings | [LibrarySettingsScreens.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift) |
| Connection | [ConnectionViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/ConnectionViews.swift) |
| Editor | [ViewEditorScreen.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/ViewEditorScreen.swift) |
| Commands | [LibraryCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/LibraryCommands.swift), [EpisodeEditingViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift), [PlaybackCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/PlaybackCommands.swift), [SelectionCommands.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/SelectionCommands.swift), [KeyboardShortcuts.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift) |
| Appearance | [MacAppearance.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/MacAppearance.swift), [MacGlass.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/MacGlass.swift) |
| Inspector / Player | [EpisodeInspector.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/EpisodeInspector.swift), [PlayerViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/PlayerViews.swift), [NowPlayingWindow.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/NowPlayingWindow.swift) |
| Persistence | [WindowRestoration.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/WindowRestoration.swift), [MacRowScroll.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/MacRowScroll.swift), [LibraryEditingModel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/LibraryEditingModel.swift), [PlaylistEditingModel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift) |
| Transfers | [EpisodeTransfer.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/EpisodeTransfer.swift), [LibraryDrops.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/LibraryDrops.swift) |
| Other support | [DownloadViews.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/DownloadViews.swift), [MacTextSize.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/MacTextSize.swift), [ContentSizedPanel.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/ContentSizedPanel.swift), [GeneralSettingsEdits.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift), [FeedbackAnnouncements.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/FeedbackAnnouncements.swift) |
| Integration | [AppIntents.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListMac/AppIntents.swift), [build-mac-app.sh](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/scripts/build-mac-app.sh), [ShareLinks.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/Sources/PodListUI/ShareLinks.swift) |

## Flows

The supplied tour demonstrates navigation and selected keyboard actions. It is **not the rubric's complete measured flow run**. No app was launched, no desktop automation was used, and no new flow or timing run was performed for this review.

| Main task and steps | Supplied evidence | What can be concluded |
|---|---|---|
| Browse → choose View → select Episode → inspect → choose next destination | 01–07, 15, 18–19, 33, both appearances | Selection, metadata, table layout and menu targeting are inspectable; response times and transient frames are not. |
| Find podcasts → type query → submit → await results → subscribe → next query | 24 plus Podcasts:18–91 | Empty discovery state, persistent query and stale-result guards are present. No submitted discovery-result strip or delayed-typing probe. |
| New Playlist → type name → create → add Entries → reorder → undo | 11–13, 23, 25 plus PS / Transfers / Persistence | Forms, initial focus and command routes are inspectable. Captures cancel rather than commit these edits; creation/reorder/Undo transitions are not recorded. |
| Playlist → Entries → History → Timeline → Rewind preview → Cancel | 06–10, 34a, 34 | Preview explains what changes and what stays. Tour asserts header x/y within 1 pt on selected transitions. This is useful limited evidence, not certification of every FLOW check. |
| Podcast → expand description → arm unsubscribe → wait for disarm | 18–22 | Same-control arming, red label/symbol and disarming shown; subscription is not removed. Tour overrides the arm period to 15 s; production is 4 s. |
| Now Playing → Settings General / Automation → Stats → Getting Started | 26–32 | Dedicated windows, pane selection, MCP off and visible tutorial dismissal shown. Playback stays paused throughout. |

Widths · Main-window captures are **1180 × 760 pt**, images **2360 × 1520 px (2×)**; VM desktop is 1920 × 1200 pt. Smaller auxiliary windows have their own content sizes. Minimum **760 × 500 pt** and half-desktop **960 pt** library layouts were not captured.

Appearances · Light and Dark throughout; System, Increase Contrast and Reduce Transparency are inspected in implementation, not captured in this evidence set.

Script · [PodListUITour.swift](/Users/sarvagnan/.t3/worktrees/PodcastClient/t3-71a7ea53-eb361387105c5b7a/apps/apple/UITour/PodListUITour.swift), especially the header assertions at line 297. Snapshot frames are in the adjacent capture text files. There is **no supplied per-step measurements JSON/CSV**, no controlled 2 s late-arrival run, no focus/scroll/value history, and no five-run p75 input or hitch measurements. Hardware beyond the VM description and display refresh rate are unreported. The captures are a state tour, not screenshot strips for all submitted flows.

Failures · No measured between-state FLOW-01/02 failure is asserted. FLOW-06 has a static empty-section failure below. **Stability sub-score: N/O in both appearances.** FLOW-03 is assessed from its permitted code channel; screenshot-verifiable checks are assessed where possible. Missing measurements do not themselves fail performance checks.

## Cross-screen inventory

Cells give region, form, wording pattern and color. “None” means no such element in the captured state; code-only behaviors are identified. Grouped states share the stated treatment.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| 01 Subscriptions; 05 Views | None; top sync row “Up to date”, neutral | None; shared top edit-status row in code, red | None | Top edit-status row, named buttons in code | Code: central named empty state with Add/New action, neutral | None | Toolbar/sidebar Add/New; bulk rules above list | Grouped by Download Rule, above list |
| 02–04, 15, 33 Episodes / Search | None; same sync row | None; shared status row in code, red | None | Same top row in code | Inspector: centered “Select an Episode”, gray heading + primary explanation | None | Row Play/Add and trailing toolbar; Search adds “Create View…” above results | View conditions above table; inspector metadata at right |
| 06–10 Entries / History / Timeline; 34a | None; same sync row | None; shared top row in code | None until Rewind sheet | Same top row in code | History: centered “No History” and explanation; empty Entries/Timeline have text + next step in code | None | Section picker + Play above content; Rewind on each eligible Timeline row | Current Entry label; History semantics; position labels |
| 11–12 Playlist Settings | None; live Clear on Played in code | Inline name problem; shared edit row, red in code | None | Named buttons in edit row in code | None | None | Done bottom-trailing; Rename/Save local under Name | Clear on Played and Trash lifetime, inline primary text |
| 13 New Playlist | None | Inline field validation, red in code | Name field in sheet | Named buttons in edit row in code | None | None | Create Playlist bottom-trailing, disabled while name empty | Persistent Name label |
| 14 Trash | None | Shared Library status in code | Permanent deletion confirmation in code | Shared Library row; Restore on item | Center “Trash Is Empty”, neutral explanation | None | Restore row button in code; permanent delete in context menu | Retention explanation above content |
| 16–17 View editor | Matching Episode count top-trailing, neutral; save confirmation in status row in code | Field-specific red validation; footer status error in code | None | Named buttons above footer in code | None | None | Done bottom-trailing, Cancel adjacent; Delete leading | “All Conditions Must Match”; optional labels and units |
| 18–21 Podcast | Subscribed text + checkmark, neutral | Code: inline red error + Retry | Armed Unsubscribe at source, red text + minus symbol | Shared Library top edit-status row in code | Code: named “No Episodes Yet” / “No Matching Episodes” + recovery | None | Subscribe at podcast header; row Add/Play | Expandable description; Download Rule beside content |
| 22 Subscription Settings | Live setting values, no separate success shown | Code: shared LibraryFeedback inside sheet, red | None | Shared edit row in code | None | None | Done bottom-trailing; Mark All Played in Played section | Default inheritance explanation |
| 23 Add to Playlist; 25 Download Rules | None | Shared edit row in code, red | Target Playlist / download policy fields in sheet | Named buttons in edit row in code | None | None | Bottom-trailing action group (Play Now/Next/Last) / Apply | Active Playlist suffix / apply-to-selected explanation |
| 24 Add Podcasts | Code: per-result “Subscribed” + checkmark | Under search area, red with Retry; shared edit row in code | None | Shared edit row in code | Central “Find Your Next Podcast” and RSS example | None | Search beside field; per-result Subscribe in code; Done bottom-trailing | Import continuation note below field |
| 26 Now Playing | Current metadata and position | Code: inline error + Retry in scroll content | None | None on transport | Code: “No Current Entry” + choose-Episode next step | None | Central transport; Done fixed at bottom | Episode Details and Open Active Playlist below transport |
| 27–30 Settings | Current values; no commit button | Code: field-local save failure + Retry; Automation inline error | None | Edit menu; no local success/Undo row | None | None | Live fields; action-specific Library buttons; MCP checkbox | Appearance text-size help; MCP access consequence |
| 31 Stats | Totals, neutral | None | None | None | “Play an Episode…” at top, but an empty plot and “Top Podcasts” shell remain | None | Show Daily Table checkbox | Counting explanation; chart axis and table alternative |
| 32 Getting Started | None | None | None | None | None | None | Dismiss top-trailing | Three numbered task steps |
| 34 Rewind summary | None; preview values in body | Code: inline red problem above action row | Explicit consequences in parent-window sheet | “Rewind can be undone” | “None” is an actual preview value, not an empty shell | None | Rewind bottom-trailing; Cancel leading | Kept / reset / restored consequences |

Mismatches · Stats (31) leaves an empty chart and an unpopulated Top Podcasts heading where History (08), Trash (14) and discovery (24) provide named, explanatory empty states: FLOW-06. Source-defined errors appear in shared top feedback, field-local feedback and operation-local Retry regions; these placements follow their different causes and are not counted as an arbitrary mismatch. Main actions in comparable commit sheets consistently occupy the footer; local Rename controls and a dismiss-only tutorial are different task types. No between-state mismatch is invented from these stills.

## Checklist

Coverage: **87.8%** (pass **114** · fail **15** · N/O **18** · N/A **21**). Denominator: **147 applicable** of **168 total** checks.

Every ID in the two current checklists appears exactly once in the verdict ledger below. Failures are explained here, by the checklist's severity. “Pass” can rest on inspectable native-control implementation plus snapshots; it does not assert that live assistive technology or timing was exercised.

### Blocker

- **MENU-02 — The menu bar is not a complete command index.** PS:184 exposes **Delete Permanently…** only in a Trash row's context menu; the Playlist menu in Commands:239–269 exposes Restore and Delete Playlist but no permanent-delete command. Podcasts:395 exposes **Mark All Played** in Subscription Settings, but LibraryCommands' Podcast menu has no corresponding command. Menus confirms both omissions; [L22](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/light/22-subscription-settings.png) shows Mark All Played. [L14](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/light/14-trash.png) is empty, so the permanent-delete route is **code evidence**, not a claim that an open Trash context menu was captured. **Fix:** expose target-aware, dimmable Playlist › Delete Permanently… and Podcast › Mark All Played, routing through the same handlers and confirmation/Undo behavior. Audit the remaining on-canvas commands against that index. `discoverable-commands`.

### Majors

- **APPEAR-04 — Enabled default-button labels fail in Dark.** [D25 Apply](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/dark/25-download-rules.png), [D22 Done](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/dark/22-subscription-settings.png), [D23 Play Next](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/dark/23-add-to-playlist.png), and [D34 Rewind](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/dark/34-rewind-summary.png) contain opaque **#FFFFFF text on #9DB1FF**: **2.07:1**, below **4.5:1** for these small enabled control labels. Pixel histograms confirm the two solid colors in each button; this is not antialiasing or a disabled-state judgment. D25's snapshot places Apply at desktop `(1137,640,59,24)` pt; subtract window origin `(370,190)` and multiply by 2 to inspect image crop `(1534,900,118,48)` px. Light's same pair, white on #2B50C8, is **6.81:1**. Source: DownloadViews:146–154; PS:88; Podcasts:408; PC:314. **Fix:** retain the owner palette and give accent-filled controls an appropriate contrasting foreground, or use native semantic default-button tint for those controls. The existing dark on-accent #111827 would yield **8.59:1** on #9DB1FF; verify actual native default-button rendering, enabled/pressed and Increase Contrast states rather than only testing color tokens. `accessibility`.
- **WIN-03 — The Playlist header has no narrow layout.** PC:257–275 makes the section label, segmented picker and Play button horizontally fixed, with no wrapping, alternate layout or horizontal scrolling. [L07 snapshot](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/light/07-entry-inspector.txt) measures label **91 pt**, picker **404 pt**, button **144.5 pt**, two **7 pt** gaps, plus **24 pt** padding: at least **677.5 pt**. The app permits a **760 pt** main window (MW:35); its visible sidebar alone consumes at least **180 pt**, leaving under **580 pt** before any inspector. The header therefore cannot fit that supported configuration; the open inspector makes the deficit larger. This is a code/constraint failure, not an observed resize animation. **Fix:** provide a compact/wrapping header or move Play to a second row when available content width falls below its intrinsic width; validate 760 pt, 960 pt, and enlarged text. `adaptability`.
- **DATA-06 — Sidebar width is not restored.** MW:114–117 explicitly leaves the sidebar unmeasured and always supplies ideal **225 pt**. Persistence archives pane widths and restores the inspector width, but the sidebar never consumes a saved width. The baseline width is visible in L/D01–10 and the snapshots; relaunch itself is not captured. **Fix:** persist the native split item's sidebar width without feeding measurements back into live layout, and restore that value once per scene. Retain the existing selection, sort and row-anchor restoration. `stability`.
- **WIN-05 — Critical transport lives at the bottom edge [owner-retained].** Player transport, seek and current metadata occupy the bottom inset, L/D01–25 and 33–34; MW:184–191 and Player:5–46. This violates the checklist's limited-status-only bottom-bar clause despite alternative menu routes. **Disposition:** keep the requested bottom player; retain top/menu/Now Playing access to essential controls. No relocation is proposed. `content-first`.
- **SET-02 — App appearance duplicates the system preference [owner-retained].** Settings:69–72 provides System/Light/Dark; L/D27–29 show the override. The System option makes APPEAR-01 pass, but does not remove SET-02's separate duplication rule. **Disposition:** keep the requested override and working System default; no removal is proposed. `respect`.
- **APPEAR-02 — App tint overrides the person's accent [owner-retained].** MW:36 and App's scene tints use the fixed Appearance palette for controls and symbols; L/D02–07 show accent actions. Native selection and segmented-control colors are allowed to remain system supplied, but other chrome is fixed. **Disposition:** keep the requested brand palette; do fix the separate foreground contrast defect without changing that character. `conventions`.
- **SYS-05 — Searchable library content is absent from Spotlight [owner-deferred].** No Core Spotlight index, searchable-item metadata, or corresponding indexing lifecycle exists in the app sources or packaging. L/D15 demonstrates useful app-local search, which does not provide system search. **Fix when its approved turn arrives:** index Episodes and other addressable library content with suitable metadata, update/delete entries with library changes, and open results at their target. No custom document-type Quick Look requirement is added to this library app. `discoverable-commands`.

### Minors

- **FLOW-06 — Empty Stats leaves a section shell.** Settings:279–283 always draws “Top Podcasts” and then an empty ForEach when there is no listening. [L31](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/light/31-listening-stats.png) / [D31](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/dark/31-listening-stats.png) show the heading at the viewport bottom, following a zero-data plot; code settles that there is nothing below it. **Fix:** hide that heading and plot until there is data, or put a named empty state beneath the heading. `craft`.
- **DATA-05 — Undo announces recovery without revealing its object.** PlaylistEditingModel:98–126 reloads state and names a restored Playlist in status, but emits no navigation/selection/scroll target. MW:559–568 only reconciles existing selection; it does not reveal restored offscreen Episodes or Playlists. L/D14 and 33 show the relevant Trash and selection surfaces; **Undo is not captured**. **Fix:** return affected IDs from the reverse operation and reveal the recovered object in the originating window, preserving an intentional current editing focus. `feedback`.
- **DRAG-05 — A broadly accepted Library drop can fail silently.** LibraryDrops:31–47 advertises copy for any file URL or public URL/text representation; its asynchronous decode returns silently for a non-OPML file or invalid URL text. This leaves an accepted drop without a result or error. Drag-in-progress is **not captured**. **Fix:** narrow validation where metadata permits, and show a local explanation when an accepted provider cannot decode to supported content. `feedback`.
- **PTR-04 — The podcast settings gear has no tooltip.** Podcasts:201 gives its icon-only Button a label but no `.help`, unlike the row and transport controls. [L18](/Users/sarvagnan/Documents/podlist-grading/mac-round-3/light/18-podcast-market-hours.png) / D18 show the gear; a tooltip-open state is not supplied, and code confirms the omission. **Fix:** add “Subscription settings” help. `discoverable-commands`.
- **APP-01 — About has version metadata but no copyright metadata.** Menus has the correctly grouped About PodList; build-mac-app:20–39 supplies version strings but no `NSHumanReadableCopyright`, and App installs no custom About information. The About panel itself is **not captured**. **Fix:** supply the appropriate copyright in the bundle About metadata. `conventions`.
- **SYS-02 — No purpose-specific Service for selected feed addresses.** Opening/adding a selected RSS address is a relevant cross-app operation (the app already accepts pasted and dropped addresses), but packaging declares no NSServices provider and source implements none. Services consumption is assessed separately under APP-03. **Fix:** add a narrowly scoped “Add Podcast to PodList” Service accepting selected URL/text and staging the existing discovery flow. `conventions`.
- **SYS-03 — Publisher links do not address the person's library context.** ShareLinks supplies publisher/enclosure URLs, but the bundle has no app URL scheme/universal-link handling and no app-content open route for a saved View or Playlist. L/D05–10 and 15 contain useful destinations that cannot be reopened by such a link. **Fix:** introduce stable, validated links to library destinations, with a safe missing-library/item state; keep publisher sharing alongside them. `user-control`.

### Unobserved

**N/O:** FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, LIST-07, DRAG-06, APPEAR-11, TYPE-06, AX-04, START-01, RESP-01, RESP-02, FOOT-02, WIN-10, SET-04, DRAG-07, FOOT-01.

These limitations are item-specific in the ledger. Native source settles the implementation paths it exposes, but does not prove runtime focus traversal, assistive input, transition coherence, resizing performance or latency. The tour supplies no open context menus, active drag, full keyboard/VoiceOver session, full size matrix or resource measurements.

### Not applicable

- **DLG-09** — No app-owned editable popover workflow; native menus are assessed separately.
- **CTRL-02** — No hierarchical parent/child checkbox feature; independent choices only.
- **LIST-05** — No recursive outline-disclosure feature; sidebar sections are category labels.
- **START-05** — No app-requested protected-resource permission prompt or purpose string needed in these features.
- **START-07** — No account creation feature.
- **MENU-06** — No app-defined modifier-alternate commands; standard system alternates remain native.
- **FILE-02** — No recent-document model; OPML is library interchange.
- **FILE-04** — No duplicate/open-document export lifecycle; OPML export is a library snapshot.
- **FILE-05** — No printing feature in this media library.
- **FMT-01** — No formatted-text editing.
- **FMT-02** — No formatted-text editing.
- **DLG-08** — No floating inspector/palette or repeated document input-and-observe panel workflow; batch discovery remains in one task surface.
- **DATA-02** — No editable document-file model; persistent library and drafts assessed under DATA-01/04/06.
- **DATA-03** — No editable document-file model; persistent library and drafts assessed under DATA-01/04/06.
- **DATA-08** — No editable document-file model; persistent library and drafts assessed under DATA-01/04/06.
- **SYS-06** — No credential filling, browser-specific manipulation or custom Finder-file workflow requiring these extensions; general URL/file intake uses paste/drop/panels.
- **SYS-07** — No meaningful Dock count/document preview requirement; playback uses media integration rather than a decorative badge.
- **EXTRA-01** — No menu bar extra; sovereign library, not a dual-mode quick-access utility.
- **EXTRA-02** — No menu bar extra; sovereign library, not a dual-mode quick-access utility.
- **EXTRA-03** — No menu bar extra; sovereign library, not a dual-mode quick-access utility.
- **EXTRA-04** — No menu bar extra; sovereign library, not a dual-mode quick-access utility.

No dependent check was failed repeatedly for a missing parent feature: Settings, Help, menus and Undo all exist. Document-only and menu-extra-only checks are inapplicable by feature, not unobserved.

### Complete verdict ledger (including passes)

#### Core

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No full per-step position/focus/scroll measurements; limited header assertions only. |
| FLOW-02 | N/O | No full per-step position/focus/scroll measurements; limited header assertions only. |
| FLOW-03 | pass | Podcasts:78–91 cancels/guards stale query completion; Editor guards local drafts and serializes queued writes; Settings uses focused raw numeric drafts. |
| FLOW-04 | N/O | Typical sheets fit, but no narrowest-width follow-up/error measurements. |
| FLOW-05 | pass | L/D03/07 show aligned list/inspector regions; tables and form columns share native alignment. Different pane headers are deliberate roles. |
| FLOW-06 | fail | Minor: empty Top Podcasts heading, Settings:279–283, L/D31. |
| FLOW-07 | pass | L/D13/16/17/23/25/34 keep comparable commit actions in trailing footers; local search and dismiss-only help are different task types. |
| KEY-01 | N/O | No complete Full Keyboard Access traversal; native controls and routes alone do not settle every path. |
| KEY-04 | N/O | Focus ring and some initial focus shown (12/13/17/24), but full forward/reverse order not established. |
| KEY-06 | pass | Commands use symbolic KeyEquivalent and modifier flags, not physical scan codes or US punctuation-specific multi-modifier chord families. |
| KEY-07 | pass | Native List/Table/ScrollView scrolling is preserved; only documented Space playback and text-preserving guard intercept relevant keys. |
| KEY-08 | pass | Connection:70–109 provides the in-app shortcut reference and bare-Space/text-entry explanation. |
| DLG-01 | pass | PS permanent deletion is the rare irreversible alert; ordinary playlist edits use Undo; PC Rewind is a consequence preview. |
| DLG-02 | pass | PS confirmation names the Playlist and consequence; concise title, specific informative message. |
| DLG-03 | pass | PS irreversible confirmation has Delete Permanently and Cancel, with meaningful verbs. |
| DLG-04 | pass | PS cancel role, native sheet cancel shortcuts in commit forms, trailing defaults; PlaybackKeyboardGuard routes command-period to Escape and respects sheets. |
| DLG-05 | pass | Permanent deletion is explicitly requested, styled destructive, and has no custom default-action binding; reversible deletion does not nag. |
| DLG-07 | pass | Editor has Cancel/Done, no Back; other task sheets use Cancel/action or a single live-settings Done; no Cancel/Done/Back triplet. |
| DLG-09 | N/A | No app-owned editable popover workflow; native menus are assessed separately. |
| CTRL-02 | N/A | No hierarchical parent/child checkbox feature; independent choices only. |
| CTRL-03 | pass | Persistent labels in native column forms and Add Podcasts; Welcome also keeps the identifying instruction “Enter your PodList server address” immediately above its field after the placeholder disappears. |
| CTRL-04 | pass | FormNumbers and Editor/PS validate names, durations/ranges and limits beside fields; persistent numbers use locale and unit labels. |
| CTRL-05 | pass | Native Button and MacGlassButtonStyle preserve system pressed feedback; transport hierarchy uses style and symbols. |
| CTRL-06 | pass | Related commands stay grouped in native menus, with visible Play/Add/Subscribe paths outside them; Inspector sharing groups its two related alternatives. |
| CTRL-07 | pass | MW searchable prompts and view/podcast titles identify scope; Search Library has a dedicated destination; no search-history feature. |
| CTRL-08 | pass | DownloadIcon binds measured transfer progress and cancellation; import shows completed/total counts, persisted resumable work and retry, without discarding library work. |
| LIST-01 | pass | MW/PC/Podcasts use Table for columnar Episodes/Entries and native Lists for navigation/history; L/D02/06/18. |
| LIST-02 | pass | Episode/Entry, Published, Position, Length, State headings are concise nouns in title case; L/D02/06/18. |
| LIST-03 | pass | MW/Podcasts bind sortable Table columns and widths; ordered Playlists intentionally have no sorting feature. |
| LIST-04 | pass | L/D02/06/18 use separators, stable numeric columns and two-line title/podcast groups; document filename/path middle-truncation clause inapplicable. |
| LIST-05 | N/A | No recursive outline-disclosure feature; sidebar sections are category labels. |
| LIST-06 | pass | Native list/table selection and pickers retain clear highlights/checkmarks; L/D03/07/11–12/23/33. |
| LIST-07 | N/O | Native row selection exists; type-select and full focus/Return behavior not exercised for every list. |
| DATA-01 | pass | Persistence commits library operations locally, stores name/filter/search/numeric drafts, and retains failed editor work; App termination flushes playback. |
| DATA-04 | pass | Named multi-step edit history includes moves, marks, deletion, Rewind and external View edits; Commands routes system Undo/Redo while preserving text undo. |
| DATA-05 | fail | Minor: reverse reloads/announces but does not reveal restored object; Persistence. |
| DATA-06 | fail | Major: sidebar width never captured/restored; MW:114–117. |
| DRAG-01 | pass | Transfers export Episode/private, URL and text representations and accept feed/OPML; Commands supplies Add, Move, Play and Import equivalents. |
| DRAG-03 | pass | Episode drops route through reversible add/move edits; OPML drops stage a preview before import; feed drops stage discovery. |
| DRAG-05 | fail | Minor: accepted generic drop can decode to nothing silently; LibraryDrops:31–47. |
| DRAG-06 | N/O | Destination selection implemented; native autoscroll/progress behavior not established by code alone. |
| PTR-03 | pass | Native pointer, buttons, table and split-view interactions; no global gesture or cursor remapping; drag operation proposals explicitly choose move/copy/forbidden. |
| PTR-04 | fail | Minor: Subscription Settings gear lacks help; Podcasts:201, L/D18. |
| APPEAR-03 | pass | Appearance defines four accent/error variants; MacGlass uses opaque semantic fill plus border for contrast/transparency settings, independently and together. Contrast defect counted once under APPEAR-04. |
| APPEAR-04 | fail | Major: enabled Dark default labels, white/#9DB1FF, 2.07:1; D22/23/25/34. |
| APPEAR-05 | pass | No custom positional/depth animations in app UI; native transitions/effects keep system motion handling; TimelineView updates state without custom motion. |
| APPEAR-09 | pass | Consistent SF play/skip/add/share/trash/info symbols, matched row scale and text; L/D01–34. |
| APPEAR-10 | pass | Content remains on ordinary surfaces; glass is restricted to player/actions/footer control layers, L/D03/16/26. |
| APPEAR-11 | N/O | No transition-frame samples; source cannot establish absence of flashes/partial frames. |
| TYPE-02 | pass | SF Regular through Bold, no thin reading weights or competing font families; L/D02/03/26/27. |
| TYPE-03 | pass | Body/captions use semantic system fonts; MacTextSize scales reading content, including metadata. |
| TYPE-05 | pass | Paragraphs and reading rows wrap with semantic leading and scroll vertically; expanded reading rows remove title line caps. Narrow header defect is recorded once under WIN-03. |
| TYPE-06 | N/O | No three full rendered lines of long notes/help at default widths from which to establish measure throughout. |
| TYPE-07 | pass | No long all-caps app prose or bold-italic combination; link underlining remains a system text/link treatment. |
| TYPE-08 | pass | App prose uses curly quotations/apostrophes, ellipsis and range dashes; URLs/configuration text keep literal syntax. |
| COPY-01 | pass | Specific Create/Add/Apply/Rename/Restore/Rewind verbs; documented domain names consistently distinguish Episodes, Entries and Playlists. |
| COPY-02 | pass | LibraryMessages provides practical network/response recovery, field errors identify their cause, and FailureFeedback exposes Retry; Editor/Settings/Podcasts. |
| COPY-03 | pass | L/D08/14/24/31 explain empty content or its next step; code adds Add/Clear/Edit/Find routes for empty library/query states. |
| COPY-04 | pass | Labels follow component roles; tooltip actions use concise fragments with named domain objects. Missing gear tooltip counted under PTR-04. |
| AX-01 | pass | Snapshots expose native roles, selected/value state and actionable names; code labels custom row actions, seek, download phases and inspector groups. Live speech output is not claimed. |
| AX-02 | pass | Current Entry, Played, Active, Subscribed and error text/symbols accompany color; L/D03/06/20/23/33. |
| AX-04 | N/O | Non-gesture routes exist; Voice Control/Switch Control traversal unobserved. |
| AX-05 | pass | Visual transport, position, status and download feedback accompany media; start/pause controls available; no audio-only app warning path found. |
| START-01 | N/O | Opening indicator and available library code exist; prompt launch behavior unmeasured. |
| START-02 | pass | Getting Started is optional, dismissible and stored per library, and can be reopened in Settings; L/D32, LibraryEditingModel. |
| START-03 | pass | Task Help and three-step Getting Started teach Views/Entries and command routes; dismiss controls stay visible, L/D32. |
| START-04 | pass | No unsolicited protected-resource requests; file panels follow Import/Export actions; optional local MCP access is explicitly enabled by the person, L/D30. |
| START-05 | N/A | No app-requested protected-resource permission prompt or purpose string needed in these features. |
| START-06 | pass | Connection offers Start on This Mac with no account; server connection is optional and separate from local library use. |
| START-07 | N/A | No account creation feature. |
| EDIT-02 | pass | Native responder editing commands; selection copy providers, Playlist onDelete and system select-all routes preserve text-field targeting/clipboard behavior. |
| EDIT-05 | pass | SelectionCommands exports descriptive title plus URL as separate useful representations; show notes permit selection; feed/share URLs have Copy commands. |
| WIN-03 | fail | Major: fixed 677.5 pt Playlist header exceeds supported narrow content; PC:257–275, L07 tree. |
| TOOL-06 | pass | Inspector/sidebar recovery is available via visible native controls and View commands; toolbar customization is intentionally absent, not a partially implemented customizable toolbar. |
| SIDE-03 | pass | MW native split-view sidebar controls + SidebarCommands; Inspector has toolbar toggle and option-command-I menu route. |
| SIDE-04 | pass | Sidebar source and table selection remain highlighted; podcast detail keeps its Subscriptions parent highlighted, L/D03/07/18/33. |
| SET-01 | pass | App-wide settings in Settings; per-subscription overrides and per-Playlist policy stay with their objects, L/D11/22/27–30. |
| RESP-01 | N/O | No five-run p75 input/keystroke/hitch or representative scrolling/hang measurements. |
| RESP-02 | N/O | No five-run p75 input/keystroke/hitch or representative scrolling/hang measurements. |
| FOOT-02 | N/O | No five-run p75 input/keystroke/hitch or representative scrolling/hang measurements. |

#### Mac

| ID | Verdict | Evidence / scope |
|---|---|---|
| MENU-01 | pass | Menus: App, File, Edit, View, Controls, Podcast, Views, Episode, Playlist, Window, Help; no irrelevant Format menu. |
| MENU-02 | fail | Blocker: context-only permanent deletion and sheet-only Mark All Played; see finding. |
| MENU-03 | pass | Menus keeps unavailable actions present/dimmed; Play/Pause and visibility titles depend on current context; empty domain submenus are not removed. |
| MENU-04 | pass | Concise verb titles and input ellipses, e.g. New View, Add Podcasts, Rewind to Here and Rename; native menu labels. |
| MENU-05 | pass | Domain menu actions are text-led, native separators/checkmarks and at most one app-defined submenu level; no icon confetti. |
| MENU-06 | N/A | No app-defined modifier-alternate commands; standard system alternates remain native. |
| APP-01 | fail | Minor: version supplied, copyright metadata absent; Integration build script, Menus. |
| APP-02 | pass | App Settings scene; standard Settings menu and command-comma exercised by tour, L/D27–30. |
| APP-03 | pass | Native text responders and selectable text retain system Services consumption; no replacement context-menu text system. Services contents are excluded from supplied menu export. |
| APP-04 | pass | Menus standard Hide, Hide Others, Show All, Quit selectors and ordering; App keeps standard application lifecycle. |
| FILE-01 | pass | Library-object New commands and OPML Import/Export occupy File; file interchange uses native panels. No editable file-document lifecycle is implied. |
| FILE-02 | N/A | No recent-document model; OPML is library interchange. |
| FILE-03 | pass | Native File Close/Close All selectors; tour closes auxiliary windows with command-W. |
| FILE-04 | N/A | No duplicate/open-document export lifecycle; OPML export is a library snapshot. |
| FILE-05 | N/A | No printing feature in this media library. |
| EDIT-01 | pass | Commands replaces undoRedo with operation-specific titles at head of Edit; text field UndoManager takes priority when editing. |
| EDIT-03 | pass | TextEditingCommands retains native Edit Find actions; separate Search Library route searches library objects. |
| EDIT-04 | pass | TextEditingCommands installs native spelling, substitutions, transformations and speech; system AutoFill/Dictation/Emoji remain in Menus. |
| FMT-01 | N/A | No formatted-text editing. |
| FMT-02 | N/A | No formatted-text editing. |
| VIEW-01 | pass | Menus has View, native sidebar/tab controls and Enter Full Screen. |
| VIEW-02 | pass | MW Inspector and native sidebar use stateful Show/Hide titles; window destinations remain under Window. |
| WMENU-01 | pass | Menus includes separate Minimize/Zoom and Bring All to Front, including standard system alternates. |
| WMENU-02 | pass | Window commands invoke native performZoom rather than substituting full screen; no custom zoom override. |
| WMENU-03 | pass | Native Window menu management; open library title is listed, no custom floating panel list injection. |
| HELP-01 | pass | Trailing Help with system search and PodList Help opens app-specific task/shortcut documentation, Connection:70–109. |
| HELP-02 | pass | Menus retains native Help search field and a single primary PodList Help item; custom Help window does not replace the menu's system search UI. |
| KEY-02 | pass | Native standard bindings plus PlaybackKeyboardGuard preserve text Space/command-arrows; command-period cancels sheets before transport Stop. |
| KEY-03 | pass | Frequent domain commands use Command families, Shift variants, contextual targets and shared notation; Commands/KeyboardShortcuts. |
| KEY-05 | pass | Native menu keyboardShortcut rendering; shared Help notation uses option-shift-command order and command-plus/question upper-character conventions. |
| TEXT-01 | pass | Native SwiftUI fields use Cocoa text; PlaybackKeyboardGuard forwards intercepted text events to interpretKeyEvents rather than replacing bindings. |
| TEXT-02 | pass | Native fields/text system and TextEditingCommands preserve system spelling/replacement controls; no blanket disabling/custom editor layer. |
| WIN-01 | pass | Standard WindowGroup/Window scenes and active close/minimize/full-screen controls in snapshots; no custom primary frame. |
| WIN-02 | pass | L/D03/07 show secondary sidebar selection while table owns primary highlight; sheet parents dim, native frame/material activation retained. |
| WIN-04 | pass | Titles identify Subscriptions, Views, named Playlist, Search and podcast; native count subtitle, L/D01–34. |
| WIN-05 | fail | Major, owner-retained: bottom transport, L/D01–25, Player/MW. |
| WIN-06 | pass | Native full-screen menu/traffic-light route, standard scenes; essential transport also reachable through menus. |
| WIN-07 | pass | File Open in New Window and sidebar context action open a selected View/Playlist; dedicated Now Playing/Stats windows have clear tasks. |
| WIN-08 | pass | App WindowGroup + New Window command; per-window WindowModel and SceneStorage context; secondary sheets preserve parent library view. |
| WIN-09 | pass | Native unified title/toolbar and standard traffic lights; no custom hit-test overlay or titlebar gesture substitution. |
| WIN-10 | N/O | Native resize implementation, but no resize recording or timing/hit-region exercise. |
| TOOL-01 | pass | Native sidebar/title leading; contextual content actions and search trailing; L/D02/03/07/15. |
| TOOL-02 | pass | SwiftUI ToolbarItemGroup/searchable use native overflow; explicit minimum window size; no app-drawn overflowing toolbar strip. |
| TOOL-03 | pass | Native common/contextual actions are text/symbol grouped with search; three functional regions, no competing prominent toolbar buttons. |
| TOOL-04 | pass | Borderless SF symbols for common toolbar actions; no custom large colored toolbar button, L/D03/07. |
| TOOL-05 | pass | Window-frame actions are ToolbarItems; policy toggles, pickers and input fields stay in content/sheets, L/D11–25. |
| SIDE-01 | pass | Leading source sidebar visible by default, MW columns all; L/D01–34. |
| SIDE-02 | pass | Section then source item; no navigation tree deeper than two levels. |
| SIDE-05 | pass | Native NavigationSplitView/Inspector divider remains thin and visible, L/D02/03/07. |
| SIDE-06 | pass | Native sidebar List with semantic body/symbol labels, no fixed sidebar row height/font size; system list sizing retained, critical actions near group starts. |
| SET-02 | fail | Major, owner-retained: appearance override, Settings:69–72, L/D27–29. |
| SET-03 | pass | L/D27–30: selected General/Automation pane toolbar, content-sized pane height, dimmed minimize/zoom, ContentSizedPanel. |
| SET-04 | N/O | Correct pane titles captured; close/reopen retention is not asserted. Pane uses State, with no explicit persistence. |
| SET-05 | pass | GeneralSettingsEdits serializes live changes with field Retry; Appearance/MCP apply live; no ordinary Settings Save button. |
| SET-06 | pass | Native transient Settings scene, with dimmed fixed-size zoom in 27–30; not part of custom library SceneStorage restoration. |
| DLG-06 | pass | Native parent-scoped sheets and item-based PlaylistSheetHost; supplied sheets fit usable typical size and do not use application-modal runModal. |
| DLG-08 | N/A | No floating inspector/palette or repeated document input-and-observe panel workflow; batch discovery remains in one task surface. |
| CTRL-01 | pass | Mac checkboxes, flat pop-up choices and three-segment Playlist section selection; no touch pickers, L/D06/11/16/22/23/27. |
| DATA-02 | N/A | No editable document-file model; persistent library and drafts assessed under DATA-01/04/06. |
| DATA-03 | N/A | No editable document-file model; persistent library and drafts assessed under DATA-01/04/06. |
| DATA-07 | pass | Settings LibraryFileActions uses NSOpenPanel/NSSavePanel, security-scoped file access and appropriate OPML export name; no custom file browser. |
| DATA-08 | N/A | No editable document-file model; persistent library and drafts assessed under DATA-01/04/06. |
| DRAG-02 | pass | Transfers evaluates Option at drop-session updates and proposes same-Playlist reorder move versus cross-container copy; unique-Entry Option-copy safely selects existing reference. |
| DRAG-04 | pass | EpisodeTransfer contains ordered multi-selection, private type then URL then text; receiving EpisodeDrop validates/deduplicates and uses richest private representation. |
| DRAG-07 | N/O | Inactive-window and unselected-source drag selection behavior not captured or fully implemented explicitly. |
| PTR-01 | pass | Selection-aware native contexts for Episodes/Entries/Subscriptions and object-aware sidebar/Trash actions; source target IDs, not global selection alone. |
| PTR-02 | pass | Text-led context menus, related groups and no assigned context shortcut glyphs; EpisodeActionItems keyboardShortcuts defaults false. |
| PTR-05 | pass | Native selection context handlers and row-specific target resolution preserve command target; sidebar object handlers close over clicked destination. |
| APPEAR-01 | pass | System default plus app-wide observable override; nil application appearance follows macOS, L/D01–34 and Appearance. |
| APPEAR-02 | fail | Major, owner-retained: fixed action/symbol tint, Appearance/MW/App. |
| APPEAR-06 | pass | Glass only on control/navigation layers; Episode tables and show notes remain ordinary content, MacGlass/Player/Inspector/Editor. |
| APPEAR-07 | pass | MacGlass uses regular glass, not clear media glass; separate control surfaces/GlassEffectContainer avoid text-content glass stacking. |
| APPEAR-08 | pass | Native toolbar/sidebar material and standard scroll regions; safeAreaInset reserves player area, L/D02/03/26. |
| TYPE-01 | pass | Semantic Mac styles, 13 pt default/10 pt caption metrics; artwork initials are content, and tiny download xmark is a symbol, not reading text. |
| TYPE-04 | pass | Row MacIconLabel and custom Inspector action frames provide 28 pt targets; standard controls use native hit regions. Small XCUI glyph frames are not mistaken for full targets. |
| AX-03 | pass | MacTextSize provides 100–200% steps through Settings and View commands; expanded reading Lists wrap title/metadata, Inspector/auxiliary content scrolls; compact header issue owned by WIN-03. |
| SYS-01 | pass | Typed Episode/Playlist entities, search/add/mark/play and other App Intents; metadata extraction/verification in build script; semantic actions do not depend on MCP toggle. |
| SYS-02 | fail | Minor: relevant selected-feed Service absent; Integration/Transfers. |
| SYS-03 | fail | Minor: no stable app-content link handling; Integration, L/D05–10/15. |
| SYS-04 | pass | Native ShareLink for publisher Episode/Podcast URLs; supported types only, share control/context/menu routes; optional MCP access consequence explicitly explained separately. |
| SYS-05 | fail | Major, owner-deferred: no Spotlight index in source/packaging. |
| SYS-06 | N/A | No credential filling, browser-specific manipulation or custom Finder-file workflow requiring these extensions; general URL/file intake uses paste/drop/panels. |
| SYS-07 | N/A | No meaningful Dock count/document preview requirement; playback uses media integration rather than a decorative badge. |
| EXTRA-01 | N/A | No menu bar extra; sovereign library, not a dual-mode quick-access utility. |
| EXTRA-02 | N/A | No menu bar extra; sovereign library, not a dual-mode quick-access utility. |
| EXTRA-03 | N/A | No menu bar extra; sovereign library, not a dual-mode quick-access utility. |
| EXTRA-04 | N/A | No menu bar extra; sovereign library, not a dual-mode quick-access utility. |
| FOOT-01 | N/O | No task-comparable bundle/launch/idle resource baseline supplied. |


## Scores

Scores cover both appearances unless distinguished. Behavioral judgments use source and snapshots; runtime-only portions remain limited by the N/O ledger. A blank or unmeasured performance path earns no speed credit.

| Category | Score | Evidence and anchor placement | Principle |
|---|---:|---|---|
| Typography | **8.1** | Strong: system body 13 pt, captions 10 pt, deliberate title/metadata weights and monospaced durations in 02–07; semantic scaled reading rows. Better than generic equal-weight type; below Exemplary because long notes and enlarged layouts lack complete rendered verification and metadata has little tonal hierarchy. | hierarchy, accessibility |
| Hierarchy | **7.7** | Strong: source → table → inspector is immediately legible, Current Entry is explicit, and the content remains central in 03/07/33. Repeated row Play/Add controls, persistent empty inspector and roughly 108 pt player region add competing chrome. | content-first, hierarchy |
| Spacing & density | **7.4** | Strong at the captured size: approximately 54.5 pt Episode rows contain title, podcast and 28 pt targets; 225 pt sidebar and shared column edges are deliberate. Reserved edit-feedback space and the large empty inspector reduce useful density; the fixed Playlist header lacks compact adaptation. WIN-03 caps Platform fit, not this category. | craft, adaptability |
| Color & contrast | **6.4** | Competent after caps: restrained backgrounds, primary metadata, clear armed red state and coherent Light/Dark treatments; code includes opaque glass fallbacks and four accent variants. Dark default labels at 2.07:1 are a recurring actionable failure; retained APPEAR-02 independently prevents the Strong band. Light alone would be 6.9 under the retained accent cap; Dark determines the combined score. | accessibility, color-restraint, conventions |
| Iconography | **8.3** | Strong: coherent SF Symbols, appropriate play/skip/share/trash meanings, textual current/played/star states and clear row action names. One missing settings tooltip and the same filter glyph for every View keep it below a reference-quality set. | conventions, craft |
| Consistency & polish | **7.7** (**stability N/O**, Light and Dark; **partial: no full flow run**) | Forms and tables share control grammar, feedback reserves a row, content-sized sheets fit the typical window, and glass is kept to controls. The Stats shell and uneven finishing of recovery/drop states keep this in Strong rather than Exemplary. No numerical stability band limit is invented without measured flows. | craft, stability |
| Clarity | **8.0** | Strong: count subtitles, “Current Entry”, Active suffix, optional labels, and Rewind's specific kept/reset consequences are unusually explicit. Heavy capitalization of domain nouns and the initially indirect “Subscribed” unsubscribe control require learning; useful tutorial and Help offset that cost. The latter is owner-fixed. | plain-language, feedback |
| Platform fit | **4.9** | **Weak by blocker cap**, despite a substantially stronger native base. Looks **8.0**, Behaves **6.5** → raw `(8.0 + 2 × 6.5) / 3 = 7.0`; MENU-02 caps final at 4.9. Real menus/windows/Settings/text/Share/Intents are present; the command index, width restoration, compact header and Spotlight are incomplete. | discoverable-commands, conventions |
| Interaction & feedback | **6.9** | Competent by DATA-06's major cap, near the Strong boundary: persistent drafts, multistep named Undo, previewed Rewind, reversible queue edits, stale-query guards, keyboard accelerators and explicit download states. Recovery does not reveal the restored object; a rejected drop can be silent. FKA, assistive input, latency and smoothness remain unverified. | forgiveness, feedback, keyboard-efficiency |
| **Overall** | **6.8 / 10** | A capable, coherent personal podcast library whose static craft is mostly Strong, held back most by the incomplete menu contract. Holistic, not an average. Lowest category **4.9** permits at most **6.9** Overall; **6.8** respects that cap. | content-first, conventions, character |

### Mac platform signals

Side-by-side reference · Mail/Finder's source-list/table/inspector and system Settings-pane grammar are the relevant native comparisons. No new Apple-app screenshot was taken or supplied, so this is a structural comparison to that grammar, not a claim of a live side-by-side run. Foreign signals visible or established in source are fixed-color chrome (L6), incomplete context/menu parity (B1/B6), and incomplete restoration/system entry points (B7/B9); the bottom transport is an owner-retained convention deviation, not evidence of a web toolkit. There is no hamburger navigation, imitation title bar or touch-scale form system.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Frame | Native | 01–34 standard traffic lights/unified toolbar; App WindowGroup. |
| L2 Type | Native | Semantic SF text at Mac sizes, scaled reading support. |
| L3 Controls | Native | Mac pickers, checkboxes, tables and buttons, 11–25. |
| L4 Menus/popovers | Native | Menus snapshot and native SwiftUI menus; context-menu appearance itself not captured. |
| L5 Shortcut notation | Native | Commands and the shared in-app shortcut reference. |
| L6 Sidebar/selection | Foreign in part | Native sidebar and selection; owner-fixed symbol/action tint ignores user's accent. |
| L7 Symbols | Native | SF Symbols throughout. |
| L8 Settings | Native | Dedicated pane window, live changes, 27–30. |
| L9 Density | Adapted | Media table rows make room for metadata and 28 pt targets. |
| L10 Materials | Native / Adapted | Native bar glass and regular custom control glass; opaque accessibility fallback. |
| L11 Appearance | Native | System default, app-wide Light/Dark options. |
| B1 Menus | Foreign in part | Correct anatomy and many commands, but MENU-02 holes. |
| B2 Settings | Native | Settings scene and ⌘, in menu/tour. |
| B3 Shortcuts | Native / Adapted | Standard text meanings guarded; domain command families documented. |
| B4 Text | Native, code-supported | TextEditingCommands, native fields, text-event forwarding; live Services not exercised. |
| B5 Keyboard/lists | N/O for full behavior | Native selection and command code; no comprehensive FKA/type-select run. |
| B6 Context menus | Adapted, incomplete parity | Selection-aware native context handlers; permanent-delete menu equivalent absent. |
| B7 Windows/state | Adapted, incomplete | Multiple windows and scene context; sidebar width missing. |
| B8 Transfers | Adapted | Rich Episode payload, move/copy/Undo; invalid generic drop silent; live drag behavior unverified. |
| B9 Integration | Adapted, incomplete | App Intents and Share; no app links, purpose Service or Spotlight. |
| B10 Undo/help | Adapted | Named multistep history and real task Help; no recovered-object reveal. |
| B11 Footprint | N/O | No representative resource/hitch measurements supplied. |

### What stands between this build and 9.0

First complete the command index (the blocker), then fix Dark default-button foregrounds, compact header layout and sidebar width restoration. Finish the minor recovery/drop/empty-state/integration gaps. Run measured main-task flows at 760 pt, 960 pt and typical size in Light/Dark, including late arrivals; verify full keyboard/VoiceOver input, 200% reading text, appearance preferences, resource use and responsiveness on stated hardware.

Even after those repairs, the **literal rubric cannot award 9.0 Overall while the owner-retained major deviations remain**: APPEAR-02 caps Color & contrast at 6.9 and WIN-05 / SET-02 cap Platform fit at 6.9, which sets an Overall ceiling of **8.9**. Deferred Spotlight is another current Platform fit major. These are recorded grading constraints, not repeated proposals to reverse approved product decisions. The next iteration can improve the app substantially within its current character and still report that ceiling honestly.

## Next step

Target · **MENU-02**, the sole verified blocker; owner-retained/deferred choices are excluded from target selection.

Anti-pattern · **Default-menu drift**: domain handlers exist in local UI without a complete, target-aware menu index. The closest contrast is the complete-command-surface principle in **WHOLE-02**, with **INTER-04** for retaining Undo and safe permanent deletion. BBEdit would make the menu tree the common command source; Things would preserve current-object targeting while exposing the same action in its item menu.

Root cause · Commands and contexts are implemented independently: the Trash view owns its permanent-deletion state, while the menu context publishes only Restore; subscription settings owns Mark All Played without publishing it to the Podcast menu.

Change · Publish the selected Trash item's delete-confirmation action and selected Subscription's mark-all action through the existing focused-context model. Add **Playlist › Delete Permanently…** (always present, dim when unavailable) and **Podcast › Mark All Played** (dim without an eligible Subscription); invoke the existing confirmation and reversible edit handlers. Then inventory the remaining actions once against the menu tree.

Principle · `discoverable-commands`, resolving presence versus prominence: add discoverability without more on-canvas chrome.

Expected effect · Remove the 4.9 Platform fit blocker cap and improve keyboard discovery; no expected visual-category regression. Blue accent, glass, bottom player, tables and domain vocabulary survive. Verify enabled/disabled targets across two Library windows and text editing, Help command search, confirmation cancellation, and named Undo. This is a proposal only: the brief prohibits application-code changes, so no apply/compare iteration or revised score is claimed.
