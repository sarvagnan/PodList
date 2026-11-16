# PodList Mac UI grade — round 10 (Codex)

## Frame

- **Primary task:** Find podcast Episodes, arrange them as Playlist Entries, and listen with understandable, recoverable playback state.
- **Target:** Native Mac app, macOS 26+; assessed build `3901092`, captured on macOS 27.2.
- **Posture:** Sovereign personal Library with background playback and transient discovery/editing tasks.
- **Audience:** Perpetual intermediate; onboarding must also orient newcomers to Views, Entries, Position and History.
- **Nearest exemplar:** Things for calm personal collection work and reversible actions; BBEdit for complete command access and preserving work. These are decision references, not visual templates.
- **Character:** Blue initials artwork and a restrained blue Multicolor accent; shallow Views/Playlists/Library navigation; dense two-line Episode/Entry tables with separate Position; an Inspector beside the list; a persistent bottom transport (owner-fixed).

**Owner decisions:** Keep bottom transport, System/Light/Dark Appearance, the fixed toolbar and timed two-click unsubscribe with Undo; retain the deep Dark Multicolor accent including its selected Settings label; use Liquid Glass in the listed control surfaces; App Intents are on and MCP is optional/off by default. Spotlight is approved but must be last. These are graded normally; accepted defects are not immediate targets. APPEAR-02 passes: the brand is the Multicolor AccentColor, not a forced accent override. SET-02 explicitly allows the offered default-System Appearance choice.

**Method and scope:** Read the supplied brief first, the complete CRITIQUE procedure, core/Mac checklists, rubric, Mac platform signals, principles, exemplars and relevant contrasts. Inspected all 70 PNGs, the 70 public XCUI snapshots, the menu inventory and current source. No earlier PodList grading files or UI-GRADE.md were opened. Repository-required `bd prime` emitted ambient project memories; they were excluded as grading evidence. No app launch, computer-use, screen control or UI automation was performed. No app code was changed. Findings marked C are source-established behavior, not claims of a live reproduction.

The screenshot baseline is the supplied build, not an earlier round. Looked at the Things project-list reference from the guideline gallery to compare craft relationships. No current Apple Mail/Finder capture was supplied or found in the available screenshot gallery; the requested same-era Apple-app side-by-side remains unavailable, rather than launching an owner app to manufacture one. Platform signals below therefore rest on actual PodList captures, menu facts and code.

## Flows

**Tasks reviewed as state sequences:**

| Task | Evidence sequence | What it establishes |
|---|---|---|
| Find/select/add an Episode | 01 → 02 → 03 → 23; 15 and 33 | List, Inspector, chooser and multi-selection surfaces; code routes the selected IDs. |
| Navigate/play a Playlist | 06 → 07 → 08 → 09 → 34a → 34; 10 | Current Entry vs selected Episode, History/Timeline distinction and bounded Rewind preview. Playback stayed paused in the evidence run. |
| Edit Playlist/View | 10 → 11 → 12 → 13; 05 → 16 → 17 | Names, draft fields, validation affordances, pinned Save/Create/Cancel controls. |
| Manage a Podcast | 18 → 19 → 20 → 21 → 22; 24 → 25 | Description, armed/disarmed unsubscribe, scoped settings, discovery and bulk-rule surfaces. |
| Control playback/configure app | 26 → 27 → 28 → 29 → 30; 31 → 32 | Dedicated Now Playing, global options, automation notice and help/empty states. |

**Tasks run by this grader:** none, as prohibited by the brief. The producer ran the standard XCUITest tour on a Retina macOS 27.2 VM, 1920×1200 pt desktop. Library captures are 2360×1520 px = **1180×760 pt**, not a 1920-pt-wide app window. Captures show one typical window size in both Light and Dark; minimum 760×500 pt and half-display tiling were not captured. Settings/auxiliary windows have their own captured sizes.

**Script location:** the repository’s standard UITour source; **measurement file:** none supplied with per-step core boxes, focus, scroll, typed text and causality; **screenshot strips:** the supplied numbered stills are state evidence, not a measured delayed-completion strip. No five-run p75 timings, input-to-frame recording, display-refresh/hitch measurements, or audience-hardware timing baseline were supplied. Therefore FLOW-01/02/04 and RESP-01/02 remain N/O. FLOW-03 is settled by the reviewed input-protection code; screenshot-verifiable FLOW-06/07 are assessed separately. No unmeasured layout shift or responsiveness failure is invented. **Stability sub-score: N/O in both appearances.**

## Cross-screen inventory

“None” means none in that captured state, not proof that the app lacks the state. Pinned footers contain neutral Cancel and one accent commit action; errors/Undo implemented outside the captures are inventoried immediately below. L/D links show the exact Light/Dark baseline for each state; its same-basename `.txt` file is the corresponding public XCUI snapshot.

| Screen and captures | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples/help |
| 01-subscriptions [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/01-subscriptions.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/01-subscriptions.png>) | None | None | None | None | None | None | Top-trailing Edit Download Rules (disabled without selection) | Top-leading grouping label |
| 02-new-this-week [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/02-new-this-week.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/02-new-this-week.png>) | None | None | None | None | Inspector center: “Select an Episode”; gray icon, readable neutral prose | None | Trailing toolbar New/Edit; row Play/Add | View conditions below title |
| 03-episode-inspector [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/03-episode-inspector.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/03-episode-inspector.png>) | None | None | None | None | None | None | Inspector upper-middle Play; glass secondary action row | Inspector metadata and membership text |
| 04-starred [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/04-starred.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/04-starred.png>) | None | None | None | None | Inspector: Select an Episode | None | Trailing toolbar and row Play/Add | View-condition summary |
| 05-all-views [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/05-all-views.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/05-all-views.png>) | None | None | None | None | None | None | Toolbar +; rows open Views | None |
| 06-default-playlist [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/06-default-playlist.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/06-default-playlist.png>) | None | None | None | None | Inspector: Select an Episode | None | Toolbar Play This Playlist; row Play | Current Entry label above current title |
| 07-entry-inspector [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/07-entry-inspector.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/07-entry-inspector.png>) | None | None | None | None | None | None | Inspector Play, secondary glass actions | Position and memberships in Inspector |
| 08-history [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/08-history.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/08-history.png>) | None | None | None | None | Content center: “No History”, gray clock, neutral explanation | None | Toolbar section selector and Play | Centered text explains playback-only History |
| 09-listening-timeline [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/09-listening-timeline.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/09-listening-timeline.png>) | None | None | None | None | Inspector: Select an Episode | None | Trailing Rewind to Here on each event | Date/event meaning in each row |
| 10-commute [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/10-commute.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/10-commute.png>) | None | None | None | None | Inspector: Select an Episode | None | Toolbar Play/Settings; row Play | Current Entry and saved Position |
| 11-playlist-settings [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/11-playlist-settings.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/11-playlist-settings.png>) | None | None | None | None | None | None | Pinned trailing Save; neutral Cancel; leading Delete Playlist | Neutral caption explains Clear on Played, Save/Cancel and Trash |
| 12-playlist-rename [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/12-playlist-rename.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/12-playlist-rename.png>) | None | None | None | None | None | None | Inline Save Name/Cancel Rename; outer Save disabled | Same settings captions |
| 13-new-playlist [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/13-new-playlist.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/13-new-playlist.png>) | None | None | None | None | None | None | Pinned trailing Create Playlist disabled until valid; Cancel | Separate Name label |
| 14-trash [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/14-trash.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/14-trash.png>) | None | None | None | None | Center: “Trash Is Empty”; gray trash icon and restoration explanation | None | Restore when content exists (code) | Top-leading 30-day retention prose |
| 15-search-rice [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/15-search-rice.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/15-search-rice.png>) | None | None | None | None | Inspector: Select an Episode | None | Create View at content top-trailing; row Play/Add | Result count above table |
| 16-edit-view [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/16-edit-view.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/16-edit-view.png>) | None | None | None | None | None | None | Pinned trailing Save; Cancel; leading Delete View | Matching count above conditions; optional Mentions label |
| 17-new-view [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/17-new-view.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/17-new-view.png>) | None | None | None | None | None | None | Pinned trailing Create View disabled until valid; Cancel | Matching count; labelled filter fields |
| 18-podcast-market-hours [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/18-podcast-market-hours.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/18-podcast-market-hours.png>) | None | None | None | None | Inspector: Select an Episode | None | Header Subscribed/Share/Copy/Settings; row Play/Add | Show Description link; rule scope above table |
| 19-description-expanded [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/19-description-expanded.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/19-description-expanded.png>) | None | None | None | None | Inspector: Select an Episode | None | Header and row actions retain their region | Show Less link under description |
| 20-unsubscribe-armed [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/20-unsubscribe-armed.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/20-unsubscribe-armed.png>) | None | None | Header red minus + “Unsubscribe”; same reserved control width | None | Inspector: Select an Episode | None | Second click Unsubscribe on same control | Description remains above actions |
| 21-unsubscribe-disarmed [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/21-unsubscribe-disarmed.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/21-unsubscribe-disarmed.png>) | None | None | None | None | Inspector: Select an Episode | None | Header returns to neutral “Subscribed” | Description remains expanded |
| 22-subscription-settings [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/22-subscription-settings.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/22-subscription-settings.png>) | None | None | None | None | None | None | Pinned trailing Save; Cancel; Mark All Played inside relevant section | Default inheritance and immediate-action explanation |
| 23-add-to-playlist [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/23-add-to-playlist.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/23-add-to-playlist.png>) | None | None | None | None | None | None | Pinned trailing Play Next; Cancel; leading Play Now/Play Last | Title names 1 Episode; native Playlist choice |
| 24-add-podcasts [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/24-add-podcasts.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/24-add-podcasts.png>) | None | None | None | None | Center: “Find Your Next Podcast”; gray search icon and feed example | None | Search beside top input; Close in pinned footer | OPML routing help below input |
| 25-download-rules [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/25-download-rules.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/25-download-rules.png>) | None | None | None | None | None | None | Pinned trailing Apply; Cancel | Top explanation names all selected Subscriptions and Device scope |
| 26-now-playing [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/26-now-playing.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/26-now-playing.png>) | None | None | None | None | None | None | Transport beneath title/seek; Episode Details/Open Active Playlist; footer Done | Speed/Sleep labels beneath transport |
| 27-settings-general-top [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/27-settings-general-top.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/27-settings-general-top.png>) | None | None | None | None | None | None | Live controls in grouped rows | OPML progress/continuation explanation in Library group |
| 28-settings-general-middle [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/28-settings-general-middle.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/28-settings-general-middle.png>) | None | None | None | None | None | None | Live Text Size/Appearance; Disconnect near server | Text-size behavior explanation below picker |
| 29-settings-general-bottom [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/29-settings-general-bottom.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/29-settings-general-bottom.png>) | None | None | None | None | None | None | Same live preference controls and Disconnect | Same text-size/import explanations |
| 30-settings-automation [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/30-settings-automation.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/30-settings-automation.png>) | None | None | None | None | None | None | Enable MCP Server checkbox below MCP heading | Neutral local-access disclosure and App Intents availability |
| 31-listening-stats [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/31-listening-stats.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/31-listening-stats.png>) | None | None | None | None | Center: “No Listening Yet”; gray chart and neutral next step | None | Play an Episode via app transport/menu | Listening Log next-step explanation |
| 32-getting-started [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/32-getting-started.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/32-getting-started.png>) | None | None | None | None | None | None | Pinned trailing Dismiss | Numbered Add/Views/Playlist guidance |
| 33-multi-selection [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/33-multi-selection.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/33-multi-selection.png>) | None | None | None | None | None | None | Inspector leading Add/Star/Mark Played; selected rows and toolbar | Total Length in selection Inspector; sync row says Syncing |
| 34-rewind-summary [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/34-rewind-summary.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/34-rewind-summary.png>) | None | None | Modal preview asks whether to Rewind; neutral consequences | None | None | None | Pinned trailing Rewind; preceding Cancel | Goes back to/Unplayed again/Back in Playlist/Kept; says undoable |
| 34a-timeline-rewind-button [L](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/34a-timeline-rewind-button.png>) / [D](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/34a-timeline-rewind-button.png>) | None | None | None | None | Inspector: Select an Episode | None | Trailing per-row Rewind to Here | Event timestamps and Listened at Position |

**Implemented message patterns outside the captured success/error cases (C):**

| Screens sharing a component | Success | Error | Waiting/Undo/empty/blocking behavior |
|---|---|---|---|
| Library, View/Playlist edits, discovery (C2/C8/C17/C37) | Neutral verb/object notice in local edit-status row; nonessential notice may expire after 5 s | Readable error text and Retry by the affected operation, persistent until resolution | Named Undo/Redo survives the notice timer; ordinary content has explicit empty states; no global modal for routine success |
| General Settings (C13/C14) | Saved choice remains in its row; no congratulatory dialog | Field-specific “Could not save [setting]… Your draft is kept. Retry to save it” directly below the row | Retry/draft exist in the current view; the persistence exception is DATA-01 |
| Playback/Now Playing (C27/C33) | Transport/position state itself is feedback | Persistent message plus Retry at the player, neutral primary foreground on glass | Stop/pause and Controls recovery remain available; no timed-only actionable error |
| Discovery/import/drop (C17/C21/C28) | Result rows, Subscribed state and import summary | Local error plus Retry, per-item failed-drop summary | Finding/Importing/Adding Episodes progress; import cancellation and resume are explicit; selected dropped IDs are retained by code |
| New/edit sheets (C10/C11/C35) | Commit closes the bounded task, returning to the parent | Field-specific validation near the control; operation error above pinned footer | Safe Cancel and one commit region; busy inputs disabled; sheet content scrolls independently |

**Mismatches:** No captured same-kind success/error/Undo message changes wording, status color or placement without a task reason. The General Settings lifetime mismatch is material: its “kept” draft has a shorter lifetime than journaled Playlist/Subscription/View drafts (DATA-01). That is scored once as data safety, not as an unmeasured FLOW violation. Discovery’s missing result context menu is PTR-01. Neutral errors on glass versus red on solid reading surfaces are a deliberate legibility adaptation, not different error semantics. Rewind has a consequence preview because it resets a timeline range; it shares the sheet footer grammar. The two-click unsubscribe automatically disarms, but the subscription action can be rearmed and Undo is not a timer-only recovery route.

## Checklist

**Coverage: 82.4%** (pass 111 · fail 11 · N/O 26 · N/A 20). All **168** current core/Mac IDs receive exactly one verdict. Coverage denominator is 148; N/A is excluded. Evidence labels C1–C37 are source links below; capture numbers refer to the inventory. Captures alone never prove an unrecorded interaction.

### Failures by severity

#### Blocker

**DATA-01 — fail (blocker): Failed General Settings choices do not survive quitting.**

- Evidence: C13 stores attempted PlaybackSettings/trashDays and failure messages only in memory. C14:165–168 creates that object as view @State from the saved Library. C16:82 returns false when another edit is busy; the General Settings controls remain enabled, so changing Speed during such an edit reaches the “Your draft is kept” retry path. C29:72–78 waits only for playback shutdown, with no settings-draft journal or save decision. Quit after this failed choice and reopen Settings: the new object loads the old saved values and has no failed choice to retry. Captures 27–29 locate the affected controls; this failure branch is established from code, not claimed as a captured relaunch. C32:149–150 likewise keeps unapplied bulk Download Rules only in @State, another instance of the same persistence gap.
- Concrete fix: Journal each pending/failed settings value, original value and recovery state per Library before applying it; restore that journal when Settings reopens and clear it only after durable success or explicit discard. Reuse the existing C18/C16 durable draft machinery for bulk rules. Add a failure→quit/recreate→Retry test; do not introduce a Save button to routine global Settings.
- Principle: `forgiveness`.


#### Major

**APPEAR-04 — fail (major): Dark Settings selected-tab text falls below the contrast target.**

- Evidence: D27–D30 show a blue enabled selected pane label on dark gray. In D30, original-image text crop x632 y122 w128 h25 has modal blue sRGB (67,95,221); nearby fill around x645 y146 is approximately (76,73,71): about 1.67:1, below the required 4.5:1 for this 12 pt control label. Glass gradients make this approximate, but the gap is decisive. C31’s nominal dark accent #3652D0 supports white selected-row text at 6.41:1; that does not make blue-on-gray tab text pass. Disabled labels and decoration were excluded.
- Concrete fix: Ordinarily use a contrast-safe selected-tab foreground while preserving accent selection fill; the brief explicitly accepts the deep accent and its native Settings label, so record the cap and take no change to this owner decision.
- Principle: `accessibility`.

**WIN-05 — fail (major): Essential transport lives at the bottom edge.**

- Evidence: 01–34a and C1:222/C27 show Play/Pause, seek, elapsed/remaining time and active Playlist in the bottom safe-area player, beyond limited window/selection status.
- Concrete fix: The literal standard would place an equivalent persistent critical transport/information surface above the bottom edge. The bottom player is an accepted owner decision; retain it and its scoring cap, with no relocation proposal.
- Principle: `content-first`.

**PTR-01 — fail (major): Discovery result objects have no context menu.**

- Evidence: C28:71–90 builds selectable podcast-result rows with Open Podcast page and Subscribe buttons, plus type selection, but installs no contextMenu on the rows or List. C28:106–111 supplies the equivalent selected-object commands to the menu bar, confirming there are relevant object actions. Capture 24 is the empty discovery state; no open result context menu was captured, so the absence is established from code.
- Concrete fix: Add a native selection-aware result context menu using the same Open and eligible Subscribe handlers; omit Subscribe once subscribed and omit irrelevant commands. Preserve the current selection when targeting an unselected result.
- Principle: `discoverable-commands`.

**SYS-05 — fail (major): Searchable Library content is absent from Spotlight.**

- Evidence: C29/C30/C31 provide App Intents metadata but no Core Spotlight indexing or searchable-item lifecycle; a source search found no CSSearchableIndex/CSSearchableItem integration. The brief confirms deliberate deferral. Captures 01/02/06 show the Subscriptions/Episodes/Playlists that would be discoverable.
- Concrete fix: When the owner’s required final integration stage is reached, index appropriate public metadata with stable IDs, removal/update handling and usable open targets; keep development builds from polluting the owner’s index. Deferred last by the owner, not the immediate target.
- Principle: `discoverable-commands`.


#### Minor

**DATA-05 — fail (minor): Undo does not reveal restored offscreen Entries.**

- Evidence: C16:110–138 applies inverse changes and emits status; it does not emit the restored Entry IDs or change the focused window’s anchor. C1:614 reconciles existing selection/scroll state on reload, rather than revealing the item restored by Undo Remove from Playlist. The code’s special restored-Playlist handling adds a status string only. 06/07 locate the Entry list; the offscreen Undo state was not captured.
- Concrete fix: Publish a scoped undo-reveal request carrying restored destination and Entry IDs; select/reveal the restored Entry in the originating Library window, retaining the named Undo status.
- Principle: `feedback`.

**APP-01 — fail (minor): The standard About panel has no copyright source.**

- Evidence: menus.txt uses orderFrontStandardAboutPanel:. C31:21–41 supplies version/name metadata but no NSHumanReadableCopyright; C29 provides no custom About options. Thus version is supplied, copyright is not. No About capture was supplied; this is a bundle/source finding.
- Concrete fix: Add the owner-approved NSHumanReadableCopyright to the app bundle and verify version/copyright in the standard About panel.
- Principle: `conventions`.

**HELP-02 — fail (minor): Supplementary Getting Started is not separated from primary Help.**

- Evidence: menus.txt places PodList Help and Getting Started adjacent without a separator. C29:44–46 emits two Buttons and no Divider. The native search field is present; live search-result behavior was not exercised.
- Concrete fix: Insert one native Divider between PodList Help and Getting Started, preserving the system search field.
- Principle: `hierarchy`.

**SET-04 — fail (minor): The last Settings pane is not retained across a relaunch.**

- Evidence: C15:57 initializes pane to “general” in @State and has no persistent pane restoration. After choosing Automation (30), quitting, relaunching and reopening Settings, that state initializes to General. Pane-specific titles are correct in 27–30; this failure concerns the later reopen, established from code.
- Concrete fix: Store only the selected pane identifier in AppStorage and restore it when Settings is opened; keep the Settings window closed on launch.
- Principle: `stability`.

**SYS-02 — fail (minor): No selection-based feed subscription Service is offered.**

- Evidence: C31 declares no NSServices and C29 registers no Services provider; C28 already supports the useful cross-app operation of taking a selected RSS/feed address to discovery. 24 shows the corresponding manual input task. Services consumption is separately N/O under APP-03.
- Concrete fix: Vend a narrowly scoped “Add Podcast to PodList…” text/URL Service that stages the selected feed in the existing discovery flow for user review.
- Principle: `conventions`.

**SYS-03 — fail (minor): Local Views/Playlists/Episodes have no stable app-opening links.**

- Evidence: C31 declares no URL scheme or universal-link entitlement, and C29 has no incoming-link routing. C5/C26 copy/share publisher web URLs, which cannot reopen a local View, Playlist or playback Position. 02/06/18/26 show addressable content, but not a deep-link invocation.
- Concrete fix: Define stable app links for Library scope plus object ID, register/rout them into the existing window destinations, and offer Copy PodList Link separately from publisher Share/Copy Link.
- Principle: `user-control`.

### N/O

FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, LIST-07, DRAG-05, DRAG-06, PTR-04, APPEAR-11, TYPE-05, TYPE-06, AX-04, WIN-03, RESP-01, RESP-02, FOOT-02, APP-03, TEXT-02, WIN-10, TOOL-02, SET-06, DRAG-07, PTR-05, SYS-07, FOOT-01.

The missing evidence concerns transition geometry/focus and minimum widths, full keyboard and assistive-input traversal, live text Services/substitutions, type-selection/opening across all lists, drag-session cues/autoscroll/one-motion behavior, actual tooltip behavior, very narrow/large-text prose and window overflow, Settings relaunch visibility, context-target outlining, Dock previews, input timing/hitches and resource stewardship. Code provides portions of these contracts, but cannot settle each complete runtime requirement. Resource and responsiveness checks need workload/device measurements; framework choice is not a substitute.

### N/A

| ID | Reason |
|---|---|
| FLOW-05 | No side-by-side peer comparison/form-preview panels; source/list/detail are deliberately hierarchical. |
| DLG-09 | No app-authored popover workflow; menus and attached task sheets own these interactions. |
| CTRL-02 | No parent/child checkbox hierarchy; the independent native checkboxes are judged by CTRL-01. |
| LIST-05 | No expandable outline/disclosure tree; description expansion is an object content command, not a descendant outline. |
| START-05 | No app-authored permission request/purpose-string workflow is invoked by the supported features. |
| START-07 | No in-app account-creation product; optional server address and standalone Library are not an account signup. |
| MENU-06 | No custom modifier-alternate menu commands. |
| FILE-02 | No recent editable documents; this is one database Library with interchange import/export. |
| FILE-05 | No printable-document workflow. |
| FMT-01 | No formatted-text editing. |
| FMT-02 | → FMT-01; no formatted-text editing. |
| DLG-08 | No floating inspector/palette or repeated edit-and-observe panel; discovery is its own content window, Inspector is an inline pane. |
| DATA-02 | No editable file documents or dirty-dot model; database edits and recoverable drafts are DATA-01/DATA-04. |
| DATA-03 | No autosaved file-document/version-browser model. |
| DATA-08 | No editable registered document type; OPML is interchange, not a document workspace. |
| SYS-06 | No credential-filling or bespoke Finder/Safari document workflow; selected feed URLs use paste/drop and OPML uses native panels. No separate extension is necessary for the offered workflow; Services provision is evaluated separately under SYS-02. |
| EXTRA-01 | No menu bar extra by design. |
| EXTRA-02 | → EXTRA-01. |
| EXTRA-03 | → EXTRA-01. |
| EXTRA-04 | Sovereign Library/player, not a dual-mode global-summon utility. |

### Passes

These are evidence-bounded passes; delegation to an ordinary native implementation is identified explicitly, and is not represented as a live test.

| ID | Evidence |
|---|---|
| FLOW-03 | C28 search captures the submitted query and checks cancellation/query equality before accepting results; C10 serializes live writes and protects unapplied drafts; busy sheet inputs are disabled (C9/C32). This passes the late-input overwrite rule in code; the quit-loss path is DATA-01. |
| FLOW-06 | 01–34a show populated sections or explicit empty states; C26 supplies “No Playlists”/“No show notes” under their headings. The discovery empty state is replaced by intentionally submitted search results, rather than removing typing guidance on keystrokes (C28). |
| FLOW-07 | 11–13, 16–17, 22–23, 25, 34: commit is trailing in the pinned footer; Cancel precedes it. Shared C11 enforces the same region and has a narrow stacked fallback. |
| KEY-06 | C6 uses letters, arrows and directly typeable comma; conventional navigation uses native key equivalents. No custom Control/Option-plus-hard-to-type symbol chord. |
| KEY-07 | Native List/Table/ScrollView scrolling; C20 forwards non-type-selection events and C4 confines playback/text exceptions. Space playback is explicitly documented as a task key (C15). |
| KEY-08 | C15 contains an in-app Keyboard Shortcuts reference; C6 is shared by menus, help and tooltips; C4 protects bare Space/Return while typing. |
| DLG-01 | C9 uses confirmation only for permanent Trash deletion. Ordinary Playlist/View changes use named Undo (C16/C17); Rewind is an explanatory task sheet (34), not a routine warning alert. |
| DLG-02 | C9 permanent-deletion title names the Playlist; message explains which history is removed, irreversibility, and retained Episodes. No generic error-title boilerplate. |
| DLG-03 | C9 permanent-deletion dialog has two buttons: Delete Permanently and Cancel. |
| DLG-04 | C11 has a trailing native default action and cancelAction; C4 routes ⌘. to Escape inside a sheet instead of Stop. C9 permanent deletion has an explicit cancel role. |
| DLG-05 | C9 marks permanent deletion destructive, never gives it an explicit default shortcut, and supplies safe Cancel. Routine deletion is reversible. |
| DLG-07 | 11–13, 16–17, 22–23, 25, 34 use Save/Create/Apply/Rewind plus Cancel. No Cancel–Done–Back trio. |
| CTRL-03 | 13/17 name labels remain above filled fields; 16 marks Mentions optional. C11/C14/C15 keep labels separate; 24 names the discovery input outside its placeholder. |
| CTRL-04 | C35 parses complete locale-aware numbers, rejects invalid/negative/range-conflicting values; C10/C14 place validation by the field. Short numeric fields have bounded width. |
| CTRL-05 | C23/C24/C11 retain native button implementations and pressed/disabled treatment through PrimitiveButtonStyle; primary emphasis is stylistic. The larger Inspector Play control has a deliberate transport role. |
| CTRL-06 | 06/18/23/26 expose main actions directly. Episode overflow groups related commands (C2), with playback, add and navigation outside it; longer menus are related speed/sleep choices. |
| CTRL-07 | 01–18 identify the current list/view and show Search this list, Search Episodes or Search Library; C1 binds the search to that destination. No search-history surface exists. |
| CTRL-08 | C28 has Finding Podcasts progress; C17 counts imported feeds and supports cancellation/resumption; C32/C21 show determinate prepared-item/download progress where known and native indeterminate progress otherwise. |
| LIST-01 | 02/06/18 use native Tables for Episode/Entry columns; 01/05 use flat Lists. No fake tabular stacks or misplaced outline hierarchy. |
| LIST-02 | Episode/Entry, Published/Position, Length, State are short title-case noun headings; 01/05 have clear contextual titles. |
| LIST-03 | C1/C8 bind native Table sortOrder and comparators; bounded column widths remain resizable; C25 supplies sort controls for enlarged reading layouts. Ordered Playlist Entries deliberately have no sort. |
| LIST-04 | 02/06/18 use separators and stable column alignment; titles can wrap to two lines, metadata stays aligned, and time columns use tabular digits (C1/C7). No filename/path column requires middle truncation. |
| LIST-06 | 02/04/06/10/18 retain source selection; 03/07/33 retain item selection. C7/C27 use native single-selection segments and checked menu choices. |
| DATA-04 | C16 maintains NamedEdit inverse history and redo; C17 wraps View/Subscription edits in reversible external actions; C2 dispatches ⌘Z/⇧⌘Z to the focused text editor or app edit history. |
| DATA-06 | C19 serializes destination, selection, query, sorts, Playlist section, pane visibility/widths and row anchor; C1 stores it per scene and reconciles IDs. C20 restores the content anchor; C29 leaves normal scene/window-frame restoration to macOS. This is an implementation pass, not a relaunch observation. |
| DRAG-01 | C21 supports rich Episode drags and public URL/text export, C22 accepts OPML/feed drops into Library, and C7 reorders Entries. Add/Move/Import/Copy commands provide non-drag routes. The app has no document type whose Dock opening is part of its supported document model. |
| DRAG-03 | C7 routes reorders through reversible C16 edits; C21 adds as one reversible Play Last edit. C22 stages OPML for explicit import and C17 groups subscription inverses. |
| PTR-03 | C1/C7/C20/C36 preserve native List/Table/split-view pointer behavior; observers return events and do not replace hit testing with a gesture-only canvas. |
| APPEAR-03 | C23 supplies opaque secondary/error/brand contrast variants; C24 watches Reduce Transparency and increased contrast, replaces glass with an opaque semantic surface and a stroke, including combined preferences. The separate observed text contrast defect is APPEAR-04. |
| APPEAR-05 | No app-authored positional/depth animations were found in UI sources. Native control/material transitions remain system-managed; there is no custom animation bypassing Reduce Motion. |
| APPEAR-09 | 01–34a use a coherent SF Symbols family with conventional Play, Share, Download, Trash, Search and Inspector meanings (C1/C26/C27). |
| APPEAR-10 | Tables/notes remain ordinary reading surfaces; toolbar groups, Inspector actions and footers have a distinct control tone. C24 does not paint glass onto Episode content. |
| TYPE-02 | System fonts with regular/medium/semibold/bold roles; 02/03/11/27 contain no thin-weight reading text or competing font families. |
| TYPE-03 | C25 scales semantic system fonts; C1/C26 use system body/caption styles. No custom body font lacking Mac size adaptation. |
| TYPE-07 | No long all-cap UI text, combined bold-italic emphasis, or non-link underlining in the captures. C23 underlines actual description links. |
| TYPE-08 | App-owned UI uses real ellipses, curly quotations and range dashes (C9/C15/C7). The snapshot’s straight apostrophe in a publisher Chapter title is user content and exempt. |
| COPY-01 | Play Now, Add to a Playlist, Mark Played, Restore and Rewind name actions consistently. C15 instructions say click and distinguish Views/Episodes from Playlists/Entries. |
| COPY-02 | C33/C35 give local, blame-free recovery; C14 identifies the setting that failed and supplies Retry. Persistence of that draft is separately failed once under DATA-01. |
| COPY-03 | 08 explains how History is created, 14 explains restoration, 24 offers a concrete feed-address example, 31 says to play an Episode. C1 adds Edit View/Clear Search recovery for no matches. |
| COPY-04 | Captures consistently distinguish concise title-case action/control labels from sentence-style explanations; C6/C26/C27 provide action-specific help fragments. |
| AX-01 | 03/07/23/30/33/34a AX snapshots name custom transport, row actions, section, checkbox, selection and position; C26/C27 add explicit roles/values/states through native controls and labelled containers. Live VoiceOver pronunciation/navigation remains untested. |
| AX-02 | Current Entry has a symbol and text; Active Playlist has a speaker and subtitle; Played/Starred have words/symbols; unsubscribe uses a new label and glyph as well as red (06/18/20/33). |
| AX-05 | All app-owned transport, playback position, sleep and error state has visible controls/text (26 and C27); no critical app information is delivered only through sound. Publisher transcript availability is outside this app-state check. |
| START-01 | C1 immediately provides Opening Library progress while startup is pending, then usable content/Welcome; C29/C1 do not gate all windows behind a blank app-owned loading view. Latency is unmeasured separately. |
| START-02 | 32 has Dismiss; C17 persists getting-started state and C15/C29 keep it reachable in Help/Window/Settings. Standalone use postpones server setup. |
| START-03 | 08/24/32 explain the current task; C15 has domain definitions and keyboard help; sheets have clear exits. |
| START-04 | C15 offers optional server connection; C28 begins network discovery on submission; C29 requests no unrelated launch-time OS permissions. File access uses user-initiated native panels (C14). |
| START-06 | C15 offers Start on This Mac; account/sign-in is not required for local podcast playback. The optional server is an explicit user choice. |
| EDIT-02 | Native text responder commands remain; C1/C7 supply selection Copy, C7 supplies Delete without touching the clipboard, and the menu snapshot retains Cut/Copy/Paste/Delete/Select All with validation. |
| EDIT-05 | C5 gives selected Episodes useful titles plus public URLs; C3/C8 expose Copy Feed Address/Copy Link; publisher and show-note text can be selected. This plain-content app has no rich-text destination requiring Paste and Match Style. |
| TOOL-06 | C1/C29 preserve visible sidebar controls plus SidebarCommands; C1/C29 expose Inspector toggle via toolbar and View. No hideable custom toolbar is introduced; customizable-toolbar-only clauses are inapplicable to the fixed toolbar decision. |
| SIDE-03 | 01–34a have the native sidebar toggle; menus.txt exposes Show Sidebar and C29 installs SidebarCommands. Inspector has a visible toggle, menu command and ⌥⌘I (C1). |
| SIDE-04 | 03/07 retain gray source selection while the adjacent item list has blue selection; 04/06/18 show the source driving content. The Podcast page retains its Subscriptions parent. |
| SET-01 | 27–30 hold global playback/appearance/connection/automation; 11 and 22 keep Playlist/Subscription settings with their objects. Import/Export are also in File (C3). |
| MENU-01 | menus.txt: PodList, File, Edit, View, Podcast, Views, Episode, Playlist, Controls, Window, Help; omitted Format is appropriate to plain-text content. |
| MENU-02 | C2–C4 and the C1/C8/C9 contextual actions index transport, add/download/mark/share, Playlist/View edits, recovery, panes, import/export, stats and help. Dialog commit buttons and property values stay within their task. No independent app command was found confined to a toolbar or context menu. |
| MENU-03 | menus.txt retains disabled Download variants, Playlist commands, chapter actions and recovery commands. C2/C4 use selection/busy validation and state-dependent Play/Pause/Star titles. |
| MENU-04 | menus.txt/C2–C4 use concise verbs and ellipses for new items, editors, sharing and time input; non-input transport commands omit them. |
| MENU-05 | menus.txt has one submenu level, restrained text-led groups and native separators/check semantics. C2 omits shortcut labels from contextual reuse. |
| APP-02 | menus.txt has Settings… in PodList; C29 uses a native Settings scene, preserving ⌘,; 27–30 show a separate Settings window. |
| APP-04 | menus.txt supplies native Hide PodList/Hide Others/Show All/Quit order and selectors; C29 leaves standard app command bindings intact. |
| FILE-01 | C3 provides New View/New Playlist/New Window and OPML import/export in File; relevant new-item shortcuts are present. This is a Library with interchange files, not an editable-file document app requiring Open/Save/Revert. |
| FILE-03 | menus.txt retains native Close/Close All; C29 uses real windows/scenes, preserving ⌘W responder behavior. |
| FILE-04 | C14 exports through NSSavePanel without replacing or closing the working Library. There is no Duplicate document operation. |
| EDIT-01 | menus.txt starts Edit with Undo and Redo; C2 uses text-editor/app-specific operation names and native standard undo shortcuts. |
| EDIT-03 | TextEditingCommands preserves native Find actions and names; C3 separately exposes object-oriented Search Library at ⌘F. No text Find action is renamed as a podcast operation. |
| EDIT-04 | menus.txt includes spelling, substitutions, transformations, speech, Dictation and Emoji & Symbols; C29 installs TextEditingCommands. |
| VIEW-01 | menus.txt includes Enter Full Screen and applicable pane, tab, sort and size controls. |
| VIEW-02 | menus.txt/C1/C29 use Show/Hide Sidebar/Inspector/Description according to state; view presentation stays in View and independent windows in Window. |
| WMENU-01 | menus.txt contains separate Minimize, Zoom, Bring All to Front and the actual open Library window. |
| WMENU-02 | Native performZoom command and normal NSWindow/WindowGroup sizing (C29), with no custom full-screen substitution. |
| WMENU-03 | menus.txt separates scene-opening commands from the actual open-window list; native WindowGroup owns the window list and panels/sheets are not inserted as documents. |
| HELP-01 | Help is trailing, retains its native search field and opens C15 task-specific help; C29 preserves the native Help menu route. Its missing supplementary separator is HELP-02. |
| KEY-02 | C2/C4/C6 retain text ⌘Z/⇧⌘Z, ⌘C, ⌘A and navigation; C4 protects text Space/Return/⌘arrows and sheet ⌘. Native Settings/close/hide/full-screen bindings remain. |
| KEY-03 | C6/C3 provide Command-based New/Add/Search, Shift-related mark/queue actions and Option chapter/Playlist/editor variants; no custom Control chords. Unassigned Download remains discoverable in Episode. |
| KEY-05 | C6 generates ⌥⇧⌘ order, upper-case letters and native arrow/Return glyphs; menu equivalents are system-rendered, with Bigger using the upper-character + form. |
| TEXT-01 | Ordinary fields remain native SwiftUI/AppKit text fields; C4 deliberately calls NSTextView.interpretKeyEvents for intercepted text navigation, preserving the Cocoa binding route instead of editing strings itself. |
| WIN-01 | 01/24/26 show native traffic lights; AX snapshots expose close/minimize/full-screen controls. C29 uses real WindowGroup/Window scenes with ordinary window behavior. |
| WIN-02 | 03/07 show unemphasized gray source selection and emphasized content selection; 11/22/34 dim the parent behind a sheet. C1/C23 use native selection/material prominence rather than fixed always-key fills. |
| WIN-04 | Titles name Subscriptions, New this week, Default, Commute or Market Hours with count/state subtitles; 27–30 title Settings by pane. Names are not replaced by an app-brand heading. |
| WIN-06 | Native window/full-screen menu and normal content windows in C29; no custom full-screen mode or Dock-hiding override. |
| WIN-07 | C1/C3 expose Open in New Window for Views/Playlists; C29 opens bounded task windows for discovery, playback, statistics and help. |
| WIN-08 | C29 WindowGroup supports multiple Library windows; C3 has New Window and C1 opens distinct destination values. Inspector/sheets preserve the main list context. |
| WIN-09 | C29 leaves titlebar/toolbar dragging, double-click and full-screen traffic lights to native windows; C36 background observers explicitly do not take hit testing. |
| TOOL-01 | 01–10/18 place title/back navigation leading, Playlist section centrally, and view/selection actions plus search trailing; C1/C7 use native toolbar placements. |
| TOOL-03 | 06/07 have the section switcher and related action clusters; C2 collapses lesser Episode actions into overflow rather than expanding a line of extra buttons. No repeated dominant tinted toolbar controls. |
| TOOL-04 | C1/C2 use native borderless symbols for Back, Play, Add and Inspector; primary sheet buttons use one trailing accent. Common toolbar actions do not become oversized labelled cards. |
| TOOL-05 | C1/C7 use ToolbarItem/ToolbarItemGroup, including a genuine AppKit segmented toolbar item; checkboxes, labels and rule choices stay in the body. |
| SIDE-01 | 01–34a: leading source List is visible by default (C1 starts columns at all). |
| SIDE-02 | C1/01–34a: section → item, no third nested navigation level. |
| SIDE-05 | 03/07/18 have thin visible native pane dividers; C1/C36 use native split-view widths, without a custom invisible drag handle. |
| SIDE-06 | C1 uses List(.sidebar), native Label metrics and no fixed sidebar font/control size; app text scaling is excluded so the system sidebar preference remains authoritative. New/Add controls are near the top of their groups. |
| SET-02 | C15 defaults Appearance to System and offers Light/Dark; C23/C24 consume contrast/transparency settings directly. No app replacement for scrolling or accessibility preferences. |
| SET-03 | 27–30 show visible two-pane native Settings toolbar, selected pane, pane-dependent height and disabled minimize/zoom controls. C12/C15 size the current pane. |
| SET-05 | C14/C13 apply global choices through bindings without a Save/Apply/OK step; object-specific task sheets explicitly state Save/Cancel semantics. Failed global choices have local Retry; durable recovery fails DATA-01. |
| DLG-06 | C11/C12 size and scroll a single parent-attached sheet; 11–13/16–17/22–23/25/34 show one sheet at a time. C29 leaves other windows independent. |
| CTRL-01 | Native checkboxes, pop-up choices, two Settings tabs and three fitted single-selection Playlist segments (C7/C11/C14/C15). No wheel picker or phone-scale toggle hierarchy. |
| DATA-07 | C14 uses NSOpenPanel/NSSavePanel, native browsing, explicit interchange format and suggested PodList.opml export name. Document Untitled rules do not apply to a Library export. |
| DRAG-02 | C21/C7 choose move inside a Playlist and copy across Playlists/apps; Option is sampled during the active drop session. Existing unique Episodes safely remain selected instead of creating duplicate Entries. |
| DRAG-04 | C21 carries the ordered multi-selection, private Episode representation then public URL/text; C22 reads each provider in supported fidelity order and continues after individual failures. |
| PTR-02 | C2/C7/C9 keep context actions grouped at about three groups; shortcut assignment is explicitly disabled for contextual EpisodeActionItems. |
| APPEAR-01 | Both complete appearance sets remain coherent. C23 sets app appearance to nil for System, observes preference changes and lets macOS own live automatic appearance. |
| APPEAR-02 | C31 packages NSAccentColorName and four AccentColor variants; C1/C23 use native selection/accent styles with legibility fallbacks. Brand artwork has a separate identity color. No forced brand tint overrides the person’s accent. |
| APPEAR-06 | C24/C26/C27 place glass on controls/navigation/footer surfaces; Episode tables, descriptions and notes remain normal content. |
| APPEAR-07 | C24 uses regular glass for text-bearing control groups and a semantic opaque fallback; 03/11/26 show separate surfaces rather than glass content stacked inside glass. |
| APPEAR-08 | C1 leaves native toolbar/sidebar scroll edges intact; C27 uses safeAreaInset for the player, so content is allocated space above it. |
| TYPE-01 | C1/C11/C25/C26 use Mac semantic body 13, callout 12, subheadline 11, captions 10 and role-based headings. The 8 pt xmark in C32 is a symbol inside a 28 pt target, not undersized reading text. |
| TYPE-04 | Custom row/transport icons have 28 pt or larger frames (C26/C27); 03 AX row buttons are 28×28 pt and 23 footer buttons are 24 pt high. Native small/mini bezels are not treated as hit-region failures; observed layouts retain Mac-scale padding. |
| AX-03 | C25 offers 100–200% content size, View Bigger/Smaller/Actual Size, and switches dense tables to wrapping reading Lists with metadata retained. Native sidebar size stays with macOS. Physical enlarged-window execution is not claimed. |
| SYS-01 | C30 supplies semantic Episode/Playlist entities, query/list/play/pause/add/mark intents and AppShortcutsProvider; C31 extracts and validates actions/entities/shortcuts metadata. This passes the implemented system automation route; live Siri/Shortcuts execution was not supplied. AppleScript is not an offered interface. |
| SYS-04 | C2/C3/C26 use native ShareLink for supported publisher Episode/Podcast URLs; 18/03 show convenient Share controls. Private local server data is not blindly shared. |


## Scores

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.8** | Strong, near Exemplary: 13 pt system body, 10–12 pt metadata, hierarchy through weights, wrap-aware enlarged layouts and tabular time columns (02/03/06/11/27; C25/C26). Prose measure/large-text execution is not fully observable, and repeated small metadata has less reading ease than the strongest exemplar. | `hierarchy`, `accessibility`, `craft` |
| Hierarchy | **8.5** | Strong: source → item → detail is immediately visible; neutral chrome and content-led titles (02/03/07/18). The large Inspector artwork/Play plus the persistent transport divide the focal hierarchy, and the bottom transport carries essential actions (accepted WIN-05). | `content-first`, `hierarchy` |
| Spacing & density | **8.7** | Strong: 1180×760 pt window, approximately 54.5 pt two-line Episode row pitch in 03, 28 pt row action targets, consistent 16/24 pt form relationships and fitted Playlist segments (C7/C11). Density fits a personal collection tool. Minimum/tiled resizing and maximum text size were not exercised, keeping it below Exemplary. | `craft`, `adaptability` |
| Color & contrast | **6.9** | Competent **by the major cap**, despite generally Strong palette discipline: custom #606060 on white ≈6.29:1, #A0A0A0 on a representative dark #242322 ≈6.0:1; readable white-on-deep-accent selection. D30 selected Settings text ≈1.67:1 fails APPEAR-04. System accent and opaque accessibility fallbacks are implemented (C23/C24/C31). | `accessibility`, `color-restraint` |
| Iconography | **8.8** | Strong, near Exemplary: consistent SF Symbols and genuine text/state labels for transport/download/share (03/06/18/26); no mixed icon set. The repeated filter glyphs and compact eraser state require a little learning, so recognition is not completely self-evident. | `conventions`, `craft` |
| Consistency & polish | **8.7 (partial: no flow run; stability N/O, Light and Dark)** | Strong: shared reading/footer/control surfaces across 11–17/22–26/34, designed empty and multi-selection states (08/14/31/33), consistent native selection tones. Transition, resize, hover and late-arrival behavior is unmeasured. No stability-band limit applies when the sub-score is N/O. | `craft`, `stability` |
| Clarity | **8.6** | Strong: specific verbs, result counts, Current Entry, 30-day Trash explanation, distinction between History and Timeline, and explicit Rewind consequences (06/08/14/23/34). Views/Entries/Position still need onboarding, and repeated settings explanations add reading cost. The misleading lifetime of the retained-draft promise is owned by DATA-01. | `plain-language`, `feedback` |
| Platform fit | **6.9** | Competent **by the major cap** from WIN-05/SYS-05. Looks **8.8**, Behaves **8.2**; (8.8 + 2×8.2)/3 = **8.4** before caps. Standard frame/menus/Settings, multi-window destinations, native text routes and semantic intents establish much more than a screenshot-only score. Missing Services/deep links, About copyright and Help separation prevent Exemplary behavior; the two major caps remain. Runtime gaps are listed rather than silently passed. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **4.9** | Weak **by the DATA-01 blocker cap**; top of that band because regular Library editing is keyboard-oriented, undoable and stateful (C2/C16–C22), with progress and persistent Retry. The code-established failed-settings draft loss survives only until process exit, and discovery lacks a context menu (PTR-01, major). The failure’s limited surface does not authorize downgrading the checklist’s blocker severity. Speed/FKA/assistive operation remains unmeasured. | `forgiveness`, `user-control`, `feedback` |
| **Overall** | **6.9** | The ordinary find/arrange/listen task has Strong visible craft and a substantial Mac command surface. The settings recovery hole prevents trusting the whole task lifecycle. Lowest category = 4.9, so Overall ≤ **4.9 + 2.0 = 6.9**; this is a holistic assessment at that ceiling, not a category average. | `forgiveness`, `conventions` |

**Caps applied:** DATA-01 → Interaction & feedback ≤4.9; PTR-01 would separately cap it at 6.9. APPEAR-04 → Color & contrast ≤6.9. WIN-05 and SYS-05 → Platform fit ≤6.9. Minor failures introduce no numeric cap. N/O/N/A introduce none. Stability N/O supplies no Consistency band limit. Overall uses the lowest scored category’s +2.0 rule.

**Mac signal inventory:** The available comparison reveals no web/phone visual imports; the app is visually Native or Adapted throughout. Its incomplete integrations are behavioral departures from the standard. No missing same-era Apple comparison is disguised as a measured side-by-side.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Window frame | Native | 01/24/26, C29 |
| L2 Type | Native | Semantic Mac fonts; C25/C26 |
| L3 Controls | Adapted | Native pickers/checkboxes; custom shared sheet layout retains their grammar (11/17/22) |
| L4 Menus/popovers | Native | menus.txt, C2–C4; custom popover absent |
| L5 Shortcut notation | Native | C6 and native menu key equivalents |
| L6 Sidebar/selection | Native | Shallow source list, primary/secondary selection, C1/C23; unreadable selected Settings label is recorded separately |
| L7 Symbols | Native | SF Symbols across all supplied screens |
| L8 Settings | Native | Separate native Settings scene and live bindings (27–30) |
| L9 Density | Adapted | Personal Library two-line tables and compact controls |
| L10 Materials/era | Adapted | Regular glass restricted to controls, semantic content surfaces; C24 |
| L11 Appearance | Native | System default and live appearance controller; C23 |
| B1 Menu bar | Adapted | Broad domain command inventory, standard order and disabled commands; C2–C4, menus.txt |
| B2 Settings | Native | Settings scene and native App menu route, C29 |
| B3 Shortcuts | Adapted | Shared Command families and scoped playback exceptions; C4/C6 |
| B4 Text | Adapted (partial) | Cocoa event interpretation and native text editing; live Services/substitutions unverified |
| B5 Keyboard/lists | Adapted (partial) | Native selection/type-select and focused command context; Full Keyboard Access/all-list opening need a run |
| B6 Context menus | Foreign | Relevant discovery result commands have no row context menu (PTR-01); other main object menus are present |
| B7 Windows/state | Foreign | Multiple destinations and stored scene context; bottom critical transport violates WIN-05; Settings pane restoration misses SET-04 |
| B8 Drag/drop | Adapted (partial) | Native transfer representations, reorder/copy and Undo; live cues/autoscroll/one-motion behavior unobserved |
| B9 System integration | Foreign | Semantic packaged App Intents and native Share; no Services provider, app links or Spotlight (SYS-02/03/05) |
| B10 Undo/help | Adapted | Named reversible edits, real help/reference; offscreen undo reveal and Help grouping unfinished (DATA-05/HELP-02) |
| B11 Footprint | N/O | No comparative bundle/launch/idle/hitch workload measurements |

### What stands between this build and 9.0

1. **Preserve pending/failed Settings work across process exit (DATA-01).** This is the immediate trust blocker and currently limits Overall to 6.9. Reproduce with a blocked/failing setting write, retain the attempted value and Retry across a new model/process, then validate success/discard boundaries.
2. **Finish the reachable behavior:** discovery object context menus (PTR-01), reveal restored offscreen Entries (DATA-05), persist last Settings pane (SET-04), bundle copyright (APP-01), and separate supplementary Help (HELP-02). Services and stable app links are also missing (SYS-02/03). These should retain the current vocabulary and visual character.
3. **Complete deferred Spotlight last (SYS-05)** under the owner’s release/development isolation decision, after usable stable open targets exist.
4. **Supply the missing behavioral evidence:** delayed-completion flow measurements at minimum/tiled/typical sizes in both appearances; five-run p75 action and typing timing; drag/resize/scroll hitches; FKA, VoiceOver/assistive input, Services/substitution, inactive/resize and relaunch checks. Current coverage cannot certify Exemplary operation in those states.

Even after actionable defects are fixed, the accepted WIN-05 and APPEAR-04 majors leave categories at 6.9, giving an **8.9 mathematical Overall ceiling** under this standard. A literal 9.0 is therefore unavailable with those accepted decisions intact. They remain recorded constraints, not proposed redesign targets or requests to revise the standard.

## Next step

**Target:** DATA-01, before any visual refinement or deferred integration.

**Anti-pattern:** Save-or-lose, with a retained-draft promise whose lifetime ends at process exit. **Root cause:** General Settings uses a view-owned in-memory edit/retry model rather than the durable, Library-scoped draft journal already used for other forms. The bulk-rule sheet is another memory-only staging surface.

**Top candidate change:** Extend the existing journal to store attempted global-setting values and originals before starting writes. Restore pending/failed values and Retry state on reopening; clear only after durable success or explicit discard. Journal bulk Download Rule mode/cap and selection scope similarly. Keep live-apply global settings and the current sheet/footer grammar. Principle: `forgiveness`; expected improvements: Interaction & feedback and Overall. Risk to `clarity`/`stability`: a stale journal could overwrite newer sync values, so track changed fields and Library scope, and apply only explicit intended changes.

**Alternative if a journal cannot be committed synchronously:** Own queued edits at app scope, preserve failures durably, and delay normal quit only long enough to finish the durable handoff. App-scope ownership alone is insufficient because it does not survive a new process. This is a recovery implementation choice; it adds no new prominent UI.

**Validation for the implementing agent:** force editor-busy and write-failure paths for Speed/Keep in Trash, change each setting, quit/recreate app state, and verify attempted values plus a valid Retry survive. Retry must persist exactly once; explicit discard must remove the journal; Library changes must not replay another Library’s draft. Include the bulk-rule Apply failure and relaunch case. Then run the authorized VM flow tour and the missing timed/keyboard checks. This grader did not execute those app actions.

**Character/drift check:** No implementation was made in this audit. Blue identity, shallow navigation, Episode/Entry table density, separate Inspector and owner-fixed bottom player are all **kept**. The proposed persistence fix touches no signature visual element. No before/after improvement or accepted hill-climb step is claimed.

## Evidence references

Source links resolve to the audited worktree at `3901092`. Line anchors are entry points; the finding text identifies the exact method/range. No earlier PodList report is used.

| Key | Source |
|---|---|
| C1 | [MacWindow.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/MacWindow.swift:59>) |
| C2 | [EpisodeEditingViews.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/EpisodeEditingViews.swift:20>) |
| C3 | [LibraryCommands.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/LibraryCommands.swift:29>) |
| C4 | [PlaybackCommands.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/PlaybackCommands.swift:35>) |
| C5 | [SelectionCommands.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/SelectionCommands.swift:147>) |
| C6 | [KeyboardShortcuts.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/KeyboardShortcuts.swift:7>) |
| C7 | [PlaylistContentView.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/PlaylistContentView.swift:56>) |
| C8 | [PodcastScreens.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/PodcastScreens.swift:130>) |
| C9 | [PlaylistSettingsViews.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/PlaylistSettingsViews.swift:110>) |
| C10 | [ViewEditorScreen.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/ViewEditorScreen.swift:27>) |
| C11 | [PodListSheet.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/PodListSheet.swift:38>) |
| C12 | [ContentSizedPanel.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/ContentSizedPanel.swift:7>) |
| C13 | [GeneralSettingsEdits.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/GeneralSettingsEdits.swift:7>) |
| C14 | [LibrarySettingsScreens.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/LibrarySettingsScreens.swift:161>) |
| C15 | [ConnectionViews.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/ConnectionViews.swift:55>) |
| C16 | [PlaylistEditingModel.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/PlaylistEditingModel.swift:78>) |
| C17 | [LibraryEditingModel.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/LibraryEditingModel.swift:135>) |
| C18 | [SheetSettingsDrafts.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/SheetSettingsDrafts.swift:55>) |
| C19 | [WindowRestoration.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/WindowRestoration.swift:55>) |
| C20 | [MacRowScroll.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/MacRowScroll.swift:65>) |
| C21 | [EpisodeTransfer.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/EpisodeTransfer.swift:29>) |
| C22 | [LibraryDrops.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/LibraryDrops.swift:26>) |
| C23 | [MacAppearance.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/MacAppearance.swift:31>) |
| C24 | [MacGlass.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/MacGlass.swift:19>) |
| C25 | [MacTextSize.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/MacTextSize.swift:6>) |
| C26 | [EpisodeInspector.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/EpisodeInspector.swift:67>) |
| C27 | [PlayerViews.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/PlayerViews.swift:5>) |
| C28 | [AddPodcastsWindow.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/AddPodcastsWindow.swift:42>) |
| C29 | [PodListMac.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListMac/PodListMac.swift:25>) |
| C30 | [AppIntents.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListMac/AppIntents.swift:190>) |
| C31 | [build-mac-app.sh](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/scripts/build-mac-app.sh:21>) |
| C32 | [DownloadViews.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/DownloadViews.swift:146>) |
| C33 | [FailureFeedback.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/FailureFeedback.swift:34>) |
| C34 | [FeedbackAnnouncements.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/FeedbackAnnouncements.swift:10>) |
| C35 | [FormNumbers.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/FormNumbers.swift:6>) |
| C36 | [MacSidebarWidth.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/MacSidebarWidth.swift:11>) |
| C37 | [EditingNotice.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/Sources/PodListUI/EditingNotice.swift:3>) |

Capture metadata and menus: [README](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/README.md>); [menus.txt](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/menus.txt>). Key AX evidence: [L03 snapshot](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/03-episode-inspector.txt>), [D03 snapshot](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/03-episode-inspector.txt>), [L23 snapshot](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/23-add-to-playlist.txt>), [D30 snapshot](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/dark/30-settings-automation.txt>), [L34a snapshot](</Users/sarvagnan/Documents/podlist-grading/mac-round-10/light/34a-timeline-rewind-button.txt>).

Standard: [CRITIQUE.md](</Users/sarvagnan/Documents/UI_Guidelines/CRITIQUE.md>), [core checklist](</Users/sarvagnan/Documents/UI_Guidelines/guidelines/core-checklist.md>), [Mac checklist](</Users/sarvagnan/Documents/UI_Guidelines/guidelines/mac-checklist.md>), [rubric](</Users/sarvagnan/Documents/UI_Guidelines/guidelines/rubric.md>), [platform signals](</Users/sarvagnan/Documents/UI_Guidelines/guidelines/platform-fit.md>), [principles](</Users/sarvagnan/Documents/UI_Guidelines/guidelines/principles.md>), [exemplars](</Users/sarvagnan/Documents/UI_Guidelines/guidelines/exemplars.md>), [anti-patterns](</Users/sarvagnan/Documents/UI_Guidelines/guidelines/anti-patterns.md>). Nearest recovery contrast: [INTER-05](</Users/sarvagnan/Documents/UI_Guidelines/examples/contrasts.md:533>). Craft reference: [Things project-list baseline](</Users/sarvagnan/Documents/UI_Guidelines/examples/screenshots/things/02-project-headings.png>). Tour source (read only): [PodListUITour.swift](</Users/sarvagnan/.t3/worktrees/PodcastClient/t3-42682808-a203a7350b18e51c/apps/apple/UITour/PodListUITour.swift>).

**Audit validation:** checked all 168 IDs against the two current checklist files, one verdict per ID; verified coverage arithmetic, category/group caps and Overall ceiling. No executable tests, builds or app launches were needed or run for this report-only review.
