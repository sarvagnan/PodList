# Mac parity check

Reviewed 11 November 2026 at `ed46a1dc4eb3993468a9859f6533e122e4b89118`.
Phase 2, milestone 5. Review task: `pod-apx.5.11`.

The Mac target is not at parity yet. One blocker allows an invalid Download Rule into the durable outbox. Several expected actions are absent. This is a source audit, not a live UI grade.

## Scope and reading rules

[Product behaviour](../design/product-behaviour.md) is authoritative. The checklist follows its sections, then every applicable [client duty](../protocol/client-duties.md), then [Mac decisions](../design/mac.md). [CONTEXT.md](../../CONTEXT.md) and the ADRs supply the domain meanings. ADR 0012 governs Standalone; ADR 0013 governs the Podcast page before subscribing. Android is comparison evidence, not the specification.

`done` means the implementation is present in the inspected code. It does not mean its layout, keyboard routing or accessibility was observed. `partial` means some of the requirement works, or a named live check remains. `missing` means the inspected surface has no implementation. Checked boxes mean done; unchecked boxes need work or verification.

Severity applies to the gap: **blocker** means wrong data or lost work; **major** means an expected feature is absent or broken; **minor** means a smaller omission or an unverified presentation detail. Done rows use `—`. Counts measure checklist rows, not distinct bugs. Repeated gap ids name the same finding. Android extras are excluded from counts.

Evidence paths below are relative to `apps/apple/`:

| Prefix | Directory |
| --- | --- |
| `UI/` | `Sources/PodListUI/` |
| `Data/` | `Sources/PodListData/` |
| `Domain/` | `Sources/PodListDomain/` |
| `Mac/` | `Sources/PodListMac/` |
| `Automation/` | `Sources/PodListAutomation/` |
| `Tests/` | `Tests/` |

Each source citation is `file:line`. For an absent action, the citation identifies the complete surface or dispatcher that lacks it. Test citations name the test as well as its location.

| Scope | Done | Partial | Missing | Blocker rows | Major rows | Minor rows |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Product behaviour | 75 | 16 | 4 | 1 | 10 | 9 |
| Client duties | 43 | 5 | 0 | 1 | 2 | 2 |
| Mac decisions and live checks | 6 | 8 | 0 | 0 | 1 | 7 |
| **Total: 157 checks** | **124** | **29** | **4** | **2** | **13** | **18** |

The two blocker rows refer to **one blocker, B01**. The 13 major rows refer to **11 distinct major findings, M01–M11**. The 124 done rows have no gap severity.

## Blocker and major findings

- **B01 — done.** Writes now validate against the bundled shared Operation schema. The UI offers positive caps only. On load, zero or invalid numeric caps become no cap; unrecoverable queued Operations are dropped. Regression tests cover rejection, schema drift, vector recordings and reopening. Original finding: Choose “0 newest” for All New on a server Library. `UI/DownloadViews.swift:54` offers zero; `UI/ApplicationModel.swift:306` records it; `Data/LocalDatabase.swift:122` persists it without validation. The generated wire schema requires `keepAtMost >= 1` (`packages/domain/protocol/operation.schema.json:162`; `packages/domain/src/Device.ts:21`). Push validates the entire Operation array (`packages/api/src/Sync.ts:6`). Every retry includes the invalid operation (`Data/SyncClient.swift:87`). A later correction cannot remove it before a successful push and pull. Other pending work cannot sync. This conclusion follows the source and schema; no live server rejection was exercised.
- **M01 — Bulk Download is absent.** Multi-selection actions contain Add, Star and Played, but Download handles one row only.
- **M02 — Episode sharing is absent.** The Inspector and Episode menus have no Share or Copy Link action.
- **M03 — Per-Entry Resume is absent in detail.** “In your Playlists” shows names and Positions as text.
- **M04 — Episode detail has no Chapters.** There is no Chapter list or Chapter Artwork there; the Now Playing Chapter rows are text only.
- **M05 — Now Playing cannot open Episode detail or preserve the specified round trip.** Its only browsing route is Open Active Playlist, which dismisses the sheet; playback started there does not reopen Now Playing.
- **M06 — Bulk Subscription Download Rules are absent.** Library rows open one Subscription; there is no selection or batch editor.
- **M07 — Standalone bring-over is absent.** Reference `pod-apx.5.6`; connecting opens a separate Library without a preview or bring-over offer.
- **M08 — Standalone Chapter fetching is incomplete.** The feed's Chapter URL is stored, but resolution uses only the server endpoint or an already downloaded ID3 file.
- **M09 — Podcast-page Add bypasses the Playlist chooser.** It appends to the Active Playlist immediately, including before subscribing; it offers neither Play Next nor another target.
- **M10 — Pending Subscription overrides do not affect playback.** On a server Library, the edit is queued, but the reducer does nothing locally and playback reads only the last pulled Subscription row; offline changes to threshold, speed and skipping wait for a server round trip.
- **M11 — Edit menu Undo omits View and Subscription edits.** Those edits register with a native UndoManager, but the replacement Edit commands route only to Playlist history when focus is outside editable text.

## Product behaviour checklist

### Two equal halves

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P01 | Find and open Views and Playlists as peers. | done | `UI/LibraryModel.swift:124`; `UI/MacWindow.swift:44` | — | — |
| [x] P02 | Create both, and reach Library and Settings. | done | `UI/MacWindow.swift:48`; `UI/MacWindow.swift:93`; `UI/LibraryCommands.swift:22`; `Mac/PodListMac.swift:34` | — | — |
| [x] P03 | Views are queries; Playlists are ordered Entries with their own playback state. | done | `Domain/ViewRules.swift:5`; `UI/LibraryModel.swift:155`; `Domain/PlaybackPolicy.swift:14` | — | — |

### Views and Search

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P04 | Show matches, count, conditions and saved ordering. | done | `UI/MacWindow.swift:238`; `UI/MacWindow.swift:355`; `UI/ViewDescription.swift:5`; `Domain/ViewRules.swift:38` | — | — |
| [x] P05 | Open detail; Play Now; choose a Playlist for Next or Last; Star and mark Played or Unplayed. | done | `UI/MacWindow.swift:117`; `UI/MacWindow.swift:258`; `UI/EpisodeEditingViews.swift:25`; `UI/EpisodeInspector.swift:44` | — | — |
| [x] P06 | Make or remove a Manual Download; cancel work; retry failure. | done | `UI/DownloadViews.swift:11`; `Data/DownloadStore.swift:65` | — | — |
| [x] P07 | Multi-select for Next, Last, Played and Star; name the target and allow another. | done | `UI/MacWindow.swift:249`; `UI/EpisodeEditingViews.swift:25`; `UI/PlaylistSettingsViews.swift:49` | — | — |
| [ ] P08 | Download multiple selected Episodes. | missing | `UI/EpisodeEditingViews.swift:24`; `UI/EpisodeInspector.swift:43`; `UI/DownloadViews.swift:7` | M01: Download accepts one id and is absent from the selection actions. | major |
| [x] P09 | Batch adds preserve displayed order. | done | `UI/MacWindow.swift:335`; `Domain/EditHistory.swift:64`; `Tests/PodListDomainTests/EditHistoryTests.swift:32` (`batchAddPreservesDisplayedOrderWithCursorEmptyPastEndAndExistingEntries`) | — | — |
| [x] P10 | Expose Published, Podcasts, Mentions, Played, Starred, In a Playlist and Length, then Sort and Show. | done | `UI/ViewEditorScreen.swift:52`; `UI/ViewEditorScreen.swift:89` | — | — |
| [x] P11 | Conditions stay present, Any is unrestricted, and all must match. | done | `UI/ViewEditorScreen.swift:52`; `Domain/ViewRules.swift:15` | — | — |
| [x] P12 | Played has Any, Unplayed, In progress and Played; progress comes from Entries. | done | `UI/ViewEditorScreen.swift:77`; `Domain/ViewRules.swift:7`; `Domain/ViewRules.swift:26` | — | — |
| [x] P13 | Support only Any or Not in any Playlist; do not invent a positive filter. | done | `UI/ViewEditorScreen.swift:83`; `Domain/ViewRules.swift:33` | — | — |
| [x] P14 | Apply condition edits immediately; show live count; offer Undo. | done | `UI/ViewEditorScreen.swift:30`; `UI/ViewEditorScreen.swift:105`; `UI/ViewEditorScreen.swift:140`; `UI/LibraryEditingModel.swift:125` | — | — |
| [x] P15 | Rename with Save and Cancel; delete; finish editing. | done | `UI/ViewEditorScreen.swift:41`; `UI/ViewEditorScreen.swift:104`; `UI/ViewEditorScreen.swift:162` | — | — |
| [x] P16 | Search uses Mentions over title, podcast and notes; saving asks for a name. | done | `UI/LibraryModel.swift:150`; `UI/LibraryModel.swift:163`; `UI/SearchViewCreation.swift:20`; `UI/SearchViewCreation.swift:36` | — | — |
| [ ] P17 | Distinguish loading, no Subscriptions and no matches; offer the relevant recovery. | partial | `UI/MacWindow.swift:247`; `UI/MacWindow.swift:204`; `UI/ApplicationModel.swift:175` | Empty View/Search results always say “No Episodes” and do not offer Add podcasts when there are no Subscriptions. | minor |
| [ ] P18 | With no Views, offer creation; a missing View provides a way back to Views. | partial | `UI/MacWindow.swift:48`; `UI/LibraryModel.swift:225` | Creation exists, but a missing View sends the window to Subscriptions instead of Views. | minor |

### Play Now, Play Next and Play Last

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P19 | Default to the Active Playlist; explicit targets override it. | done | `UI/PlaylistEditingModel.swift:76`; `UI/EpisodeEditingViews.swift:25` | — | — |
| [x] P20 | An Episode occurs once per Playlist; adding it again moves its Entry. | done | `Domain/PlaylistRules.swift:12`; `Tests/PodListDomainTests/ProtocolTests.swift:13` (`syncVector`) | — | — |
| [x] P21 | Now inserts before Cursor and starts; Next inserts after Cursor; Last appends. | done | `Domain/PlaylistRules.swift:19`; `UI/PlaylistEditingModel.swift:80`; `UI/PlaybackController.swift:128` | — | — |
| [ ] P22 | Add preselects Active, permits another target, then Next or Last. | partial | `UI/PlaylistSettingsViews.swift:49`; `UI/PlaylistSettingsViews.swift:69`; `UI/PodcastScreens.swift:163`; `UI/PodcastScreens.swift:189` | M09: Podcast-page Add skips this sheet, and reopening the regular sheet can restore a previous target instead of preselecting Active. | major |
| [x] P23 | Create a named Playlist and add the selection in one action; preserve invalid names for correction. | done | `UI/PlaylistSettingsViews.swift:56`; `UI/PlaylistEditingModel.swift:80`; `Data/LocalDatabase.swift:152` | — | — |

### Episode detail

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P24 | Show Artwork, podcast, full title, Published, duration, Played, Starred and this Device's download status. | done | `UI/EpisodeInspector.swift:34`; `UI/LibraryModel.swift:178`; `UI/DownloadViews.swift:11` | — | — |
| [x] P25 | Provide Played/Unplayed, Download, Play Now, Add and Star/Unstar; make Next and Last reachable. | done | `UI/EpisodeInspector.swift:43`; `UI/EpisodeEditingViews.swift:25`; `UI/PlaylistSettingsViews.swift:65` | — | — |
| [ ] P26 | Share an Episode link. | missing | `UI/EpisodeInspector.swift:30`; `UI/EpisodeEditingViews.swift:24` | M02: Neither surface provides an Episode link or sharing action. | major |
| [ ] P27 | Show each Playlist membership's Position and Resume action. | partial | `UI/EpisodeInspector.swift:57`; `UI/LibraryModel.swift:200` | M03: Each Position is shown, but no membership can be resumed from detail. | major |
| [ ] P28 | Show Chapters with Chapter Artwork and resolve Chapter, Episode, then podcast Artwork. | partial | `UI/EpisodeInspector.swift:34`; `UI/EpisodeInspector.swift:63`; `UI/PlayerViews.swift:147`; `Domain/PlaybackPolicy.swift:42` | M04: Playback resolves Artwork, but detail has no Chapters and its Artwork never considers the Chapter. | major |
| [x] P29 | Show notes and treat missing synchronized metadata as temporary. | done | `UI/EpisodeInspector.swift:64`; `UI/EpisodeInspector.swift:67`; `UI/LibraryModel.swift:185` | — | — |

### Playlists and Entries

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [ ] P30 | List counts, Active status and Clear on Played status; create and open. | partial | `UI/LibraryModel.swift:127`; `UI/MacWindow.swift:58`; `UI/PlaylistSettingsViews.swift:113` | The Playlist list omits Clear on Played status; it is visible only in settings. | minor |
| [x] P31 | Rename explicitly with Save/Cancel; protect the Default Playlist. | done | `UI/PlaylistSettingsViews.swift:99`; `Domain/StateRules.swift:49`; `Domain/StateRules.swift:51` | — | — |
| [x] P32 | Expose Entries, History and Listening Timeline; identify Cursor and Active; show Entry Positions. | done | `UI/PlaylistContentView.swift:18`; `UI/PlaylistContentView.swift:49`; `UI/PlaylistContentView.swift:72`; `UI/MacWindow.swift:359` | — | — |
| [x] P33 | Open an Entry's Episode and Play from here. | done | `UI/MacWindow.swift:117`; `UI/PlaylistContentView.swift:79` | — | — |
| [x] P34 | Reorder with direct manipulation and discrete actions; Undo reorder. | done | `UI/PlaylistContentView.swift:55`; `UI/PlaylistContentView.swift:88`; `UI/PlaylistEditingModel.swift:130`; `Tests/PodListUITests/PlaylistEditingTests.swift:97` | — | — |
| [x] P35 | Remove Entries, Star/Unstar and mark Played/Unplayed. | done | `UI/PlaylistContentView.swift:83`; `UI/EpisodeEditingViews.swift:41`; `UI/PlaylistEditingModel.swift:124` | — | — |
| [x] P36 | Play this switches Active and resumes Cursor or first Entry; empty can become Active silently. | done | `UI/PlaylistContentView.swift:21`; `UI/PlaylistEditingModel.swift:148`; `Tests/PodListUITests/PlaybackControllerTests.swift:218` | — | — |
| [x] P37 | Switching Playlists resumes independent playback state. | done | `UI/PlaybackController.swift:214`; `Tests/PodListUITests/LibraryModelTests.swift:107` | — | — |
| [x] P38 | Empty and past-end Playlists state there is no current Entry; empty offers finding Episodes. | done | `UI/PlaylistContentView.swift:42` | — | — |
| [x] P39 | Only playback creates History; manual Played creates none. | done | `Domain/PlayedRules.swift:12`; `Domain/StateRules.swift:64`; `UI/PlaylistContentView.swift:113` | — | — |
| [x] P40 | Names are unique ignoring case and outer spaces; reject duplicates with the taken name. | done | `Domain/EditHistory.swift:34`; `Data/LocalDatabase.swift:163`; `UI/LibraryEditingModel.swift:20`; `Tests/PodListUITests/LibraryEditingTests.swift:41` | — | — |
| [x] P41 | Restore chooses the next free name and says it; preserve remote duplicate names. | done | `Domain/EditHistory.swift:45`; `Domain/StateRules.swift:45`; `UI/PlaylistEditingModel.swift:114`; `Tests/PodListUITests/PlaylistEditingTests.swift:120` | — | — |
| [x] P42 | Playlist settings owns name, Clear on Played and Delete. | done | `UI/PlaylistSettingsViews.swift:84` | — | — |
| [x] P43 | Clear on Played reacts anywhere, defaults on for Default, is not retroactive, and ignores Star. | done | `Domain/State.swift:32`; `Domain/StateRules.swift:50`; `Domain/StateRules.swift:64`; `Domain/PlayedRules.swift:23`; `Tests/PodListUITests/PlaylistEditingTests.swift:192` | — | — |
| [x] P44 | Delete moves the whole Playlist to Trash; deleting Active activates Default. | done | `Domain/StateRules.swift:51`; `UI/PlaylistEditingModel.swift:110` | — | — |
| [x] P45 | Trash restores, defaults to 30 days, and uses Settings retention. | done | `Domain/PlaylistRules.swift:8`; `UI/PlaylistSettingsViews.swift:134`; `UI/LibrarySettingsScreens.swift:51` | — | — |
| [x] P46 | Delete and Restore offer Undo; deletion names the Playlist. | done | `UI/PlaylistEditingModel.swift:110`; `UI/EpisodeEditingViews.swift:72`; `Tests/PodListUITests/PlaylistEditingTests.swift:120` | — | — |

### Listening Timeline and Rewind

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [ ] P47 | Show dated and timed listening, finishes and deliberate edits for 30 days. | partial | `Domain/TimelineRules.swift:8`; `Domain/TimelinePresentation.swift:20`; `Domain/TimelinePresentation.swift:32`; `UI/PlaylistContentView.swift:129` | Sampling prunes relative to the newest sample, but presentation has no current-date cutoff and includes all retained History finishes. | minor |
| [x] P48 | Every eligible displayed moment offers Rewind. | done | `UI/PlaylistContentView.swift:143`; `Domain/TimelineRules.swift:17` | — | — |
| [x] P49 | Confirm Entry, Position, exact Unplayed/restored Episodes and what stays. | done | `UI/PlaylistContentView.swift:177`; `Domain/TimelinePresentation.swift:40` | — | — |
| [x] P50 | Rewind restores Cursor/Position and playback-finished Entries near old neighbours; clears later gained Positions. | done | `Domain/Rewind.swift:4`; `Tests/PodListDomainTests/ProtocolTests.swift:13` (`syncVector`) | — | — |
| [x] P51 | Keep later deliberate edits and manual Played marks; allow Undo of Rewind. | done | `Domain/Rewind.swift:11`; `Domain/EditHistory.swift:144`; `Tests/PodListUITests/PlaylistEditingTests.swift:170` | — | — |
| [x] P52 | Rewind/Unplayed do not subtract Listening log; distinguish it from History/Timeline. | done | `Domain/StateRules.swift:70`; `Domain/Rewind.swift:4`; `UI/PlaylistContentView.swift:187`; `UI/LibrarySettingsScreens.swift:174` | — | — |

### Player and Now Playing

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P53 | Artwork, transport, back 15, forward 30 and Position remain available during browsing. | done | `UI/MacWindow.swift:122`; `UI/PlayerViews.swift:27`; `UI/PlayerViews.swift:63` | — | — |
| [x] P54 | Show Entries after current and open the Active Playlist's upcoming Entries. | done | `UI/PlayerViews.swift:41`; `UI/LibraryModel.swift:190`; `UI/MacWindow.swift:125` | — | — |
| [x] P55 | Dismiss Now Playing without pausing. | done | `UI/PlayerViews.swift:130`; `UI/MacWindow.swift:151` | — | — |
| [x] P56 | Now Playing shows resolved Artwork, Chapter, Episode, previous/next Chapter, seek ticks and elapsed/remaining. | done | `UI/PlayerViews.swift:131`; `UI/PlayerViews.swift:63`; `UI/PlaybackController.swift:339` | — | — |
| [x] P57 | Speed is transient to this Episode; sleep supports duration, Chapter end, Episode end and cancellation. | done | `UI/PlayerViews.swift:91`; `UI/PlayerViews.swift:101`; `UI/PlaybackController.swift:95`; `UI/PlaybackController.swift:233` | — | — |
| [ ] P58 | From Now Playing open Chapters, Episode detail and Entries; reorder, switch and return to Now Playing after starting playback. | partial | `UI/PlayerViews.swift:122`; `UI/MacWindow.swift:151`; `UI/PlaylistContentView.swift:21` | M05: Chapters and the Playlist route exist, but Episode detail and the return-to-Now-Playing transition do not. | major |
| [ ] P59 | Add from Episode detail without losing the Now Playing context. | missing | `UI/PlayerViews.swift:122`; `UI/EpisodeInspector.swift:48` | M05: Now Playing has no Episode-detail route through which to perform this flow. | major |
| [x] P60 | Mark Played at Subscription threshold or 30 seconds; keep the tail and advance only at end/outro unless sleep stops it. | done | `Domain/PlayedRules.swift:7`; `Domain/ListeningSession.swift:76`; `UI/PlaybackController.swift:317`; `Tests/PodListUITests/PlaybackControllerTests.swift:47` | — | — |
| [x] P61 | Prefer local download; stream host with server down; keep Position/speed on fallback and offer Retry. | done | `Domain/PlaybackPolicy.swift:33`; `UI/PlaybackController.swift:245`; `UI/PlaybackController.swift:306`; `Tests/PodListUITests/PlaybackControllerTests.swift:83` | — | — |

### Library and Subscriptions

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P62 | Group Subscriptions by this Device's Download Rule; open Episodes and settings. | done | `UI/LibraryModel.swift:169`; `UI/MacWindow.swift:201`; `UI/PodcastScreens.swift:148` | — | — |
| [ ] P63 | Change multiple Subscriptions' Download Rules together. | missing | `UI/MacWindow.swift:201`; `UI/DownloadViews.swift:33` | M06: Subscription rows have no selection or bulk Download Rule action. | major |
| [x] P64 | Add through directory search or feed address, distinct from Library Search. | done | `Data/PodcastLibrary.swift:48`; `UI/PodcastScreens.swift:37`; `UI/LibraryCommands.swift:31`; server URL resolution: `packages/server/src/Directory.ts:168` | — | — |
| [ ] P65 | Explain invalid feed addresses/server failures and allow retry. | partial | `UI/PodcastScreens.swift:42`; `Data/PodcastLibrary.swift:51`; `UI/LibraryEditingModel.swift:10` | Connected discovery receives an empty result for a failed feed lookup, so the Mac says “No podcasts found” instead of explaining the feed failure. | minor |
| [x] P66 | Open results as Podcast pages and Subscribe directly from each result. | done | `UI/PodcastScreens.swift:46`; `UI/PodcastScreens.swift:55` | — | — |
| [x] P67 | Podcast page works before/after subscribing, searches Episodes, and shows the subscribed green check and settings gear. | done | `UI/PodcastScreens.swift:87`; `UI/PodcastScreens.swift:118`; `UI/PodcastScreens.swift:143` | — | — |
| [ ] P68 | Reveal podcast Artwork and description by pulling down. | partial | `UI/PodcastScreens.swift:123`; `UI/PodcastScreens.swift:129` | The header is always above the list with a description button; no pull-down reveal is implemented, and its Mac fit needs live check. | minor |
| [x] P69 | Play/add before subscribing imports one Orphaned Episode; subscribing reuses its identity. | done | `Data/PodcastLibrary.swift:96`; `Data/PodcastLibrary.swift:123`; `Tests/PodListDataTests/PodcastLibraryTests.swift:11` | — | — |
| [x] P70 | OPML lives in Settings; explain partial import and retry failures. | done | `UI/LibrarySettingsScreens.swift:55`; `UI/LibraryEditingModel.swift:211`; `Tests/PodListUITests/LibraryEditingTests.swift:135` | — | — |
| [x] P71 | Subscription supports Mark all Played and Unsubscribe. | done | `UI/PodcastScreens.swift:134`; `UI/PodcastScreens.swift:227`; `Data/LocalDatabase.swift:130` | — | — |
| [ ] P72 | Subscription supports this Device's rule, Played threshold and inherited Playback Settings overrides. | partial | `UI/PodcastScreens.swift:219`; `UI/PodcastScreens.swift:251`; `Domain/StateRules.swift:92`; `Data/LibrarySnapshot.swift:18`; `UI/PlaybackController.swift:233` | M10: Server-mode pending override edits have no local projection into playback or the reopened settings screen. | major |
| [x] P73 | New Subscriptions start Stream; overrides are per Subscription, never per Playlist. | done | `UI/DownloadViews.swift:42`; `Data/PodcastLibrary.swift:126`; `Domain/PlaybackPolicy.swift:37` | — | — |
| [x] P74 | Offer Stream, Entries and All New with a valid optional cap. | done | `Domain/ProtocolValidation.swift:9`; `Data/LocalDatabase.swift:25`; `UI/DownloadViews.swift` (`DownloadRuleEditor`); `Tests/PodListDataTests/ProtocolValidationTests.swift` (schema drift, vectors, invalid writes and reopen recovery) | — | — |
| [x] P75 | Manual Downloads are independent; Stars protect stored downloads but do not request them. | done | `Domain/DownloadPlanner.swift:37`; `Data/DownloadStore.swift:65`; `Tests/PodListDomainTests/DownloadPlannerTests.swift:15` | — | — |
| [ ] P76 | Distinguish no Subscriptions, no Episodes yet, loading, failed downloads and unavailable actions. | partial | `UI/MacWindow.swift:204`; `UI/PodcastScreens.swift:153`; `UI/PodcastScreens.swift:155`; `UI/DownloadViews.swift:20` | A zero-Episode Podcast page has only a zero count and empty List, with no “no Episodes yet” or no-match explanation. | minor |
| [x] P77 | Keep local data, pending edits and downloads usable offline; expose failed sync without claiming server success. | done | `UI/ApplicationModel.swift:175`; `UI/ApplicationModel.swift:242`; `UI/MacWindow.swift:303`; `Tests/PodListUITests/ApplicationModelTests.swift:124` | — | — |

### Unsubscribe

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P78 | Two clicks on the subscribed control; no confirmation dialog; expire after a few seconds. | done | `UI/LibraryEditingModel.swift:41`; `UI/PodcastScreens.swift:132`; `Tests/PodListUITests/LibraryEditingTests.swift:23` | — | — |
| [ ] P79 | Disarm on any other interaction, scroll, Back or leaving. | partial | `UI/PodcastScreens.swift:152`; `UI/PodcastScreens.swift:170`; `UI/PodcastScreens.swift:174` | Needs live check for mouse-wheel scrolling, keyboard focus moves and toolbar interactions; source resets cover taps, drag, text changes and departure only. | minor |
| [x] P80 | Stay on the Podcast page after success; offer Undo and Redo to the same feed. | done | `UI/PodcastScreens.swift:137`; `UI/LibraryEditingModel.swift:146`; `UI/PodcastScreens.swift:6` | — | — |
| [x] P81 | Hide unsubscribed Episodes except Entry/Starred Orphans; keep downloads. | done | `Domain/ViewRules.swift:14`; `Data/PodcastLibrary.swift:88`; `Tests/PodListUITests/LibraryEditingTests.swift:98` | — | — |
| [x] P82 | Retain ids, overrides, all Devices' rules, facts, Entries and Positions; reveal them on re-subscribe. | done | `Data/PodcastLibrary.swift:77`; `Data/PodcastLibrary.swift:88`; `Data/PodcastLibrary.swift:123`; `Tests/PodListUITests/LibraryEditingTests.swift:98` | — | — |
| [x] P83 | Failure preserves Undo/Redo for retry; never queue Subscribe/Unsubscribe as State edits. | done | `UI/LibraryEditingModel.swift:186`; `UI/LibraryEditingModel.swift:197`; `Data/PodcastLibrary.swift:72`; `Tests/PodListUITests/LibraryEditingTests.swift:176` | — | — |

### First run

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P84 | Open without a server; offer Standalone or server connection. | done | `UI/ConnectionViews.swift:14`; `UI/ConnectionViews.swift:33`; `UI/ApplicationModel.swift:127` | — | — |
| [ ] P85 | Connecting Standalone offers a bring-over preview; declining keeps Libraries separate. | partial | `UI/ApplicationModel.swift:145`; `UI/LibrarySettingsScreens.swift:78` | M07: `pod-apx.5.6` covers the missing preview, transfer and resumable retry; separation already works. | major |
| [x] P86 | Three-step skippable checklist lives on Views; Default Playlist is ready. | done | `UI/MacWindow.swift:79`; `UI/LibrarySettingsScreens.swift:139`; `Domain/State.swift:32` | — | — |
| [x] P87 | Seed New this week, Under 30 minutes and Starred once; do not mistake loading for fresh data. | done | `UI/LibraryEditingModel.swift:105`; `UI/ApplicationModel.swift:254`; `Tests/PodListUITests/LibraryEditingTests.swift:118` | — | — |
| [x] P88 | Track steps, retain until dismissed, and reopen with completed steps from Settings. | done | `UI/LibraryEditingModel.swift:64`; `UI/LibraryEditingModel.swift:100`; `UI/LibrarySettingsScreens.swift:64`; `UI/LibrarySettingsScreens.swift:144` | — | — |
| [x] P89 | First Subscribe keeps the Add flow open and preserves input. | done | `UI/PodcastScreens.swift:25`; `UI/PodcastScreens.swift:55`; `UI/PodcastScreens.swift:65` | — | — |
| [ ] P90 | Standalone fetches and refreshes publisher feeds in the background. | partial | `UI/ApplicationModel.swift:223`; `UI/ApplicationModel.swift:266`; `Data/PodcastLibrary.swift:109` | `pod-apx.5.7` covers conditional polling and persisted retry state; current polling runs while the app lives, and sleep/wake behaviour needs live check. | minor |

### Settings and Listening stats

| Check | Behaviour | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] P91 | Global speed, intro, outro and boost are inherited unless overridden. | done | `UI/LibrarySettingsScreens.swift:48`; `UI/LibrarySettingsScreens.swift:90`; `Domain/PlaybackPolicy.swift:37` | — | — |
| [x] P92 | Settings controls Trash retention, opens stats and reopens Getting started. | done | `UI/LibrarySettingsScreens.swift:50` | — | — |
| [x] P93 | Stats shows time, finished Episodes, top podcasts, daily listening and streak, with week/month/all-time totals. | done | `UI/LibrarySettingsScreens.swift:157`; `Domain/ListeningStats.swift:10` | — | — |
| [x] P94 | Use permanent partial listening; only current Playback Played facts count finishes; Rewind/Unplayed can reduce them. | done | `UI/LibrarySettingsScreens.swift:164`; `Domain/ListeningStats.swift:20`; `Domain/StateRules.swift:70` | — | — |
| [x] P95 | Empty stats explains how to begin. | done | `UI/LibrarySettingsScreens.swift:170` | — | — |

## Client duties checklist

The browser-only DOM, OPFS, service-worker, mixed-content and Electron-bridge adapters do not apply to native macOS. Their shared outcomes are checked below. The proxy implementation itself belongs to the server. ADR 0012 supersedes the older blanket statement that discovery and uncached Chapters always need a server for Standalone Devices.

### 1. Device and connection

| Check | Duty | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] D01 | Use the server origin and `/api` over the tailnet; no app login, cookies or credentials. | done | `Data/HttpTransport.swift:5`; `Data/HttpTransport.swift:28`; `Data/HttpTransport.swift:35` | — | — |
| [x] D02 | Read health/version/release without inventing a version handshake. | done | `Data/SyncClient.swift:8`; `Data/SyncClient.swift:60`; `UI/ApplicationModel.swift:155` | — | — |
| [x] D03 | Persist opaque Device identity and registration time; register before sync, persist success and retry failure. | done | `Data/LocalDatabase.swift:100`; `Data/SyncClient.swift:73`; `Tests/PodListDataTests/SyncTests.swift:53` | — | — |
| [x] D04 | Send nonempty name and a supported kind; do not add an unapproved Apple kind. | done | `Data/LocalDatabase.swift:106`; `Domain/Device.swift:59` | — | — |

### 2. Durable edits and sync

| Check | Duty | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] D05 | Stable unique Operation ids, Device id, persistent sequence from zero and Device clock. | done | `Data/LocalDatabase.swift:114`; `Tests/PodListDataTests/DatabaseTests.swift:98` | — | — |
| [x] D06 | Every recorded change is schema-valid. | done | `Domain/ProtocolValidation.swift:9`; `Data/LocalDatabase.swift:25`; `UI/DownloadViews.swift` (`DownloadRuleEditor`); `Tests/PodListDataTests/ProtocolValidationTests.swift` (schema drift, vectors, invalid writes and reopen recovery) | — | — |
| [x] D07 | Atomically append outbox, advance sequence, apply optimistic State and indexes; notify/sync after commit. | done | `Data/LocalDatabase.swift:117`; `Data/LocalDatabase.swift:146`; `UI/ApplicationModel.swift:301`; `UI/PlaylistEditingModel.swift:43` | — | — |
| [x] D08 | Keep confirmed and optimistic State separate; drop missing targets by domain rules. | done | `Data/LocalDatabase.swift:194`; `Data/LocalDatabase.swift:199`; `Domain/StateRules.swift:21` | — | — |
| [x] D09 | Snapshot outbox in order, push exact ids, tolerate accepted zero, and keep push/pull cursors distinct. | done | `Data/SyncClient.swift:86`; `Data/LocalDatabase.swift:191`; `Tests/PodListDataTests/SyncTests.swift:89` | — | — |
| [x] D10 | Pull from saved user cursor; adopt a snapshot or replay server order, including expanded intentions. | done | `Data/SyncClient.swift:91`; `Data/LocalDatabase.swift:201`; `Domain/StateRules.swift:11` | — | — |
| [x] D11 | Commit pull/ack only sent ids, rebuild with concurrent edits; failed requests retain the exact retry work. | done | `Data/LocalDatabase.swift:199`; `Tests/PodListDataTests/SyncTests.swift:89`; `Tests/PodListDataTests/SyncTests.swift:181` | — | — |
| [x] D12 | Library has its own cursor; atomically upsert Subscription before Episode; follow more using returned cursors. | done | `Data/SyncClient.swift:96`; `Data/LocalDatabase.swift:72`; `Tests/PodListDataTests/SyncTests.swift:136` | — | — |
| [ ] D13 | Notify readers after each committed Library page and re-evaluate Views; missing metadata remains temporary. | partial | `Data/SyncClient.swift:107`; `UI/ApplicationModel.swift:242`; `UI/EpisodeInspector.swift:67` | Pages commit durably, but readers reload only after the full sync finishes or fails, rather than after each page. | minor |
| [ ] D14 | Startup, edits, network recovery, foreground and periodic sync coalesce with the specified scheduling semantics. | partial | `UI/ApplicationModel.swift:124`; `UI/ApplicationModel.swift:257`; `UI/ApplicationModel.swift:266`; `UI/MacWindow.swift:39` | All triggers exist, but edit-triggered syncs do not restart the independent periodic timer's one-minute wait. | minor |
| [x] D15 | Failure retains local data, outbox, downloads and cursors; show error and retry; preserve independent successful State/Library work. | done | `Data/SyncClient.swift:79`; `UI/ApplicationModel.swift:244`; `UI/MacWindow.swift:308`; `Tests/PodListDataTests/SyncTests.swift:74` | — | — |
| [x] D16 | Server Subscribe/Unsubscribe/discovery/OPML are requests, not queued State edits; offline failures remain failures. | done | `Data/PodcastLibrary.swift:48`; `Data/PodcastLibrary.swift:72`; `Data/PodcastLibrary.swift:88`; `UI/LibraryEditingModel.swift:219` | — | — |

### 3. Position and Played

| Check | Duty | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] D17 | Load Cursor's Entry Position; switch Playlists independently; hold loaded audio during remote Active/Cursor changes. | done | `UI/PlaybackController.swift:214`; `Domain/PlaybackPolicy.swift:32`; `Tests/PodListUITests/PlaybackControllerTests.swift:179` | — | — |
| [ ] D18 | Apply global settings plus only the Subscription keys overridden, including local pending edits. | partial | `Domain/PlaybackPolicy.swift:37`; `UI/PlaybackController.swift:233`; `Data/LibrarySnapshot.swift:18`; `Domain/StateRules.swift:92` | M10: Effective server-mode settings ignore the pending SetSubscriptionOverrides operation until metadata is pulled. | major |
| [x] D19 | Player speed affects only the loaded Episode, never saved settings. | done | `UI/PlaybackController.swift:95`; `Tests/PodListUITests/PlaybackControllerTests.swift:68` | — | — |
| [x] D20 | Report after 15 seconds while playing; flush on pause, load change, both sides of seek, speed, finish/end and lifecycle departure. | done | `Domain/ListeningSession.swift:30`; `Domain/ListeningSession.swift:36`; `UI/PlaybackController.swift:159`; `UI/PlaybackController.swift:228`; `Mac/PodListMac.swift:48` | — | — |
| [x] D21 | Suppress subsecond movement unless listening is pending; clamp seek and exclude skipped time. | done | `Domain/ListeningSession.swift:53`; `Domain/ListeningSession.swift:67`; `UI/PlaybackController.swift:280`; `Tests/PodListDomainTests/ListeningReportingTests.swift:7` | — | — |
| [x] D22 | Device-clock listenedAt, newer Position wins, equal timestamps use arrival order; Timeline samples one minute apart. | done | `UI/PlaybackController.swift:183`; `Domain/StateRules.swift:83`; `Domain/TimelineRules.swift:8`; `Tests/PodListDomainTests/ProtocolTests.swift:13` | — | — |
| [x] D23 | Threshold defaults to 30, accepts zero, handles short/unknown durations and Ended; report before Playback MarkPlayed. | done | `Domain/PlayedRules.swift:7`; `Domain/ListeningSession.swift:49`; `Domain/ListeningSession.swift:61`; `Domain/ListeningSession.swift:76` | — | — |
| [x] D24 | Play tail after threshold; advance at end/outro unless sleep; intro/outro use saved settings. | done | `UI/PlaybackController.swift:256`; `UI/PlaybackController.swift:317`; `Tests/PodListUITests/PlaybackControllerTests.swift:98` | — | — |
| [x] D25 | After Played send RecordListening, never resurrect Position; manual Played is User and Unplayed does not restore Entries. | done | `Domain/ListeningSession.swift:67`; `UI/PlaylistEditingModel.swift:124`; `Domain/StateRules.swift:70`; `Tests/PodListDomainTests/ListeningReportingTests.swift:37` | — | — |

### 4. Listening log and stats

| Check | Duty | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] D26 | Count only playing forward progress, divided by speed and capped to wall time; reject bad speed, pauses, long gaps and jumps. | done | `Domain/Listening.swift:26`; `Domain/ListeningSession.swift:43`; `Tests/PodListDomainTests/ProtocolTests.swift:66` (`listeningSample`) | — | — |
| [x] D27 | Seed on Playing; reset on pause, failure, seek, discontinuity, rate change and load. | done | `Domain/ListeningSession.swift:39`; `UI/PlaybackController.swift:288`; `UI/PlayerAudio.swift:56`; `UI/PlayerAudio.swift:100` | — | — |
| [x] D28 | No amounts without Subscription metadata; use Device-local day and ending UTC offset; split midnight without replay reinterpretation. | done | `Domain/ListeningSession.swift:44`; `Domain/Listening.swift:33`; `UI/PlayerAudio.swift:23`; `Tests/PodListDomainTests/ProtocolTests.swift:66` | — | — |
| [x] D29 | Accumulate by day/Subscription; clear only after durable commit; keep amounts on stale/removed targets; deduplicate retries and concurrent Devices. | done | `UI/PlaybackController.swift:171`; `Domain/StateRules.swift:81`; `Domain/StateRules.swift:11`; `Tests/PodListDataTests/SyncTests.swift:163`; `Tests/PodListUITests/PlaybackControllerTests.swift:134` | — | — |
| [x] D30 | No History/Timeline backfill or subtraction from Rewind, Unplayed or Trash expiry. | done | `Domain/StateRules.swift:70`; `Domain/StateRules.swift:95`; `Domain/Rewind.swift:4`; `Tests/PodListUITests/PlaylistEditingTests.swift:170` | — | — |
| [x] D31 | Finished counts current Playback facts with retained Episode rows, even unsubscribed; manual marks excluded. | done | `UI/LibrarySettingsScreens.swift:164`; `Domain/ListeningStats.swift:23`; `Tests/PodListDomainTests/ListeningStatsTests.swift:5` | — | — |
| [x] D32 | Monday weeks, viewing Device's calendar, streak through today/yesterday; future dates excluded from week/month but retained in all-time listening/top podcasts. | done | `Domain/ListeningStats.swift:11`; `Domain/ListeningStats.swift:20`; `Domain/ListeningStats.swift:32`; `Domain/ListeningStats.swift:37` | — | — |

### 5. Sources, media and downloads

| Check | Duty | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] D33 | Prefer stored audio, else local audioUrl then Episode proxy; use proxy while metadata is pending. | done | `Domain/PlaybackPolicy.swift:33`; `UI/PlaybackController.swift:245`; `Data/DownloadStore.swift:143` | — | — |
| [x] D34 | Try each candidate once; keep Position/rate; use fresh item on fallback, media failure or ten-second load timeout. | done | `UI/PlaybackController.swift:306`; `UI/PlaybackController.swift:314`; `UI/PlayerAudio.swift:76`; `Tests/PodListUITests/PlaybackControllerTests.swift:83` | — | — |
| [x] D35 | Error after exhaustion; explicit Retry starts a fresh load at Entry Position. | done | `UI/PlaybackController.swift:262`; `UI/PlaybackController.swift:312`; `UI/PlayerViews.swift:21` | — | — |
| [x] D36 | Native boost does not require proxy-first routing. | done | `UI/PlayerAudio.swift:85`; `UI/VolumeBoost.swift:5`; `Domain/PlaybackPolicy.swift:33` | — | — |
| [x] D37 | Downloads try publisher then distinct proxy; expose only complete committed files. | done | `UI/ApplicationModel.swift:326`; `Data/DownloadStore.swift:115`; `Data/AudioFiles.swift:20`; `Tests/PodListDataTests/DownloadTests.swift:22` | — | — |
| [ ] D38 | Resolve uncached Chapters through the correct server or Standalone publisher path; keep offline cached Chapters usable. | partial | `Data/ChapterResolver.swift:7`; `Data/PodcastLibrary.swift:140`; `UI/PlaybackController.swift:329`; `Tests/PodListDataTests/ChapterTests.swift:32` | M08: Standalone never fetches chapters_url or probes streamed publisher audio, so only stored ID3 Chapters work. | major |

### 6. Download Rules

| Check | Duty | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] D39 | Execute only this Device's rules; absent rule means Stream; Unsubscribe alone leaves downloads. | done | `Domain/DownloadPlanner.swift:24`; `Data/PodcastLibrary.swift:88`; `Data/DownloadStore.swift:83` | — | — |
| [x] D40 | Entries mode selects Unplayed Entries outside Trash; All New adds eligible Unplayed Episodes since activation, newest first, with Entries outside cap. | done | `Data/DownloadStore.swift:84`; `Domain/DownloadPlanner.swift:28`; `Tests/PodListDomainTests/DownloadPlannerTests.swift:7` | — | — |
| [x] D41 | Derive synced since on mode transition; preserve on cap edits, clear on leaving; arrival order wins. | done | `Domain/StateRules.swift:74`; `Tests/PodListDomainTests/ProtocolTests.swift:13` (`syncVector`, including All New activation) | — | — |
| [x] D42 | Preserve legacy local activation until transition, then remove it; no secondary Published tie requirement. | done | `Domain/DownloadPlanner.swift:25`; `Domain/DownloadPlanner.swift:32`; `Data/DownloadStore.swift:93`; `Tests/PodListDomainTests/DownloadPlannerTests.swift:21` | — | — |
| [x] D43 | Clean unwanted rule downloads; protect Stars and Manual ownership; Star neither downloads nor blocks Clear on Played. | done | `Domain/DownloadPlanner.swift:37`; `Data/DownloadStore.swift:65`; `Domain/PlayedRules.swift:23`; `Tests/PodListDomainTests/DownloadPlannerTests.swift:15` | — | — |
| [x] D44 | React to Library, State and status changes; debounce one second; at most two transfers. | done | `UI/ApplicationModel.swift:199`; `UI/ApplicationModel.swift:250`; `UI/ApplicationModel.swift:309`; `Data/DownloadStore.swift:105`; `Tests/PodListDataTests/DownloadTests.swift:95` | — | — |
| [x] D45 | Failed downloads stay failed until explicit cancellation/retry; rule evaluation skips existing statuses. | done | `Data/DownloadStore.swift:95`; `Data/DownloadStore.swift:132`; `UI/DownloadViews.swift:20`; `Tests/PodListDataTests/DownloadTests.swift:46` | — | — |

### Settled semantics

| Check | Duty | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] D46 | Use pinned Unicode folding, update folded columns on text changes, and transactionally backfill shared migration 4 before queries. | done | `Domain/Mentions.swift:10`; `Data/LocalDatabase.swift:14`; `Data/LocalDatabase.swift:72`; `Tests/PodListDataTests/DatabaseTests.swift:68` | — | — |
| [x] D47 | LastDays includes future dates; whitespace Mentions matches all; preserve filter and tie semantics. | done | `Domain/ViewRules.swift:15`; `Domain/ViewRules.swift:22`; `Domain/ViewRules.swift:38`; `Tests/PodListDomainTests/ProtocolTests.swift:116` (`memoryView`, 68 cases) | — | — |
| [x] D48 | Preserve equal-time Position arrival order, first nearby Timeline sample, ending-offset attribution and small unannounced-seek jitter tolerance; remain protocol v4. | done | `Domain/StateRules.swift:88`; `Domain/TimelineRules.swift:8`; `Domain/Listening.swift:30`; `Tests/PodListDomainTests/ProtocolTests.swift:13`; `Tests/PodListDomainTests/ProtocolTests.swift:66` | — | — |

## Mac decisions and contradictions

These rows supplement the shared checklist. They also record checks that require a live Mac run.

| Check | Mac decision | Mac status | Evidence | Gap | Severity |
| --- | --- | --- | --- | --- | --- |
| [x] C01 | Native split view, Inspector, blue accent, system font and system light/dark default. | done | `UI/MacWindow.swift:5`; `UI/MacWindow.swift:18`; `UI/MacWindow.swift:44`; `UI/MacWindow.swift:117` | — | — |
| [ ] C02 | Sidebar section controls, counts and Active mark; + creates a Playlist in its section. | partial | `UI/MacWindow.swift:46`; `UI/MacWindow.swift:93` | New Playlist is in the toolbar and File menu, but the Playlists sidebar section has no + control. | minor |
| [ ] C03 | Episode lists have sortable columns and per-row Add/Play; Subscription rule/cap sits above its table. | partial | `UI/MacWindow.swift:185`; `UI/PodcastScreens.swift:152`; `UI/PodcastScreens.swift:156`; `UI/MacWindow.swift:245` | Subscription navigation now uses PodcastPageScreen's unsortable List, so the old table and above-table Download Rule editor are unreachable there. | minor |
| [ ] C04 | Mac selection, Return opens, Space plays the selected Episode; shortcuts do not steal text input. | partial | `UI/MacWindow.swift:249`; `UI/PlaylistContentView.swift:62`; `UI/PlaybackCommands.swift:12`; `UI/PlaybackCommands.swift:32` | Space toggles the current player rather than playing selection, Playlist primary action starts audio, and Return/focus/text routing needs live check. | minor |
| [x] C05 | Remember Inspector and expose its toolbar button and ⌘⌥I. | done | `UI/MacWindow.swift:20`; `UI/MacWindow.swift:108`; `UI/MacWindow.swift:397` | — | — |
| [x] C06 | Restore paused bar at Cursor Position, three middle lines, Now Playing sheet, Chapter Artwork precedence and dismiss without pausing. | done | `UI/PlaybackController.swift:234`; `UI/PlayerViews.swift:34`; `UI/MacWindow.swift:151`; `Domain/PlaybackPolicy.swift:42` | — | — |
| [ ] C07 | Correct bar centering, truncation, resizable layout, table stripes, light/dark contrast and focus order. | partial | `UI/PlayerViews.swift:14`; `UI/PlayerViews.swift:34`; `UI/MacWindow.swift:35`; `UI/MacWindow.swift:249` | Needs live check at narrow and wide windows in both appearances; empty stripes are already tracked by `pod-apx.5.10`. | minor |
| [x] C08 | App survives closing all windows; Quit flushes; system media keys/Now Playing are wired. | done | `Mac/PodListMac.swift:47`; `UI/PlaybackController.swift:160`; `UI/SystemPlayback.swift:38` | — | — |
| [ ] C09 | Native menus expose every command with unambiguous shortcuts. | partial | `UI/LibraryCommands.swift:23`; `UI/EpisodeEditingViews.swift:128`; `UI/EpisodeEditingViews.swift:139`; `UI/PlaybackCommands.swift:11` | New Window and New Playlist both use ⌘⇧N, while Download and View editing/deletion lack menu commands. | minor |
| [ ] C10 | Edit > Undo/Redo names and reverses the latest domain edit; text keeps native Undo. | partial | `UI/EpisodeEditingViews.swift:131`; `UI/LibraryEditingModel.swift:159`; `UI/LibraryEditingModel.swift:179` | M11: The Edit commands ignore LibraryEditingModel's View/Subscription history when text is not focused. | major |
| [x] C11 | Persist New Playlist, Add, Rename and View drafts per Library; immediate Delete and named Undo; segmented Playlist sections and Rewind summary. | done | `UI/PlaylistEditingModel.swift:161`; `UI/LibraryEditingModel.swift:88`; `UI/ViewEditorScreen.swift:22`; `UI/PlaylistContentView.swift:18`; `UI/PlaylistContentView.swift:166` | — | — |
| [ ] C12 | Podcast-page Add/Play edits use the same named Undo steps as other Episode edits. | partial | `UI/PodcastScreens.swift:189`; `UI/LibraryEditingModel.swift:152`; `UI/PlaylistEditingModel.swift:76` | Podcast-page actions call raw edit/playNow paths and bypass PlaylistEditingModel's named Undo history. | minor |
| [x] C13 | App Intents/MCP share actions; MCP is opt-in, per Mac, local socket only, and supports the chosen protocol. | done | `Mac/AppIntents.swift:1`; `UI/AutomationActions.swift:1`; `UI/AutomationSettings.swift:14`; `Automation/LocalSocket.swift:1`; `Automation/MCPHandler.swift:1`; `Tests/PodListUITests/AutomationTests.swift:118`; `Tests/PodListUITests/AutomationTests.swift:173` | — | — |
| [ ] C14 | Settings, panels, VoiceOver, Shortcuts registration, media keys and background playback behave correctly in the running app. | partial | `Mac/PodListMac.swift:34`; `Mac/PodListMac.swift:57`; `UI/LibrarySettingsScreens.swift:194`; `UI/SystemPlayback.swift:38` | Needs live check; model/socket tests do not establish system UI behaviour or extracted Shortcuts metadata in an installed bundle. | minor |

The Podcast page also has two Search Episodes fields: the toolbar's `.searchable` at `UI/MacWindow.swift:115` and the in-page field at `UI/PodcastScreens.swift:152`. Reference `pod-apx.5.10`; do not file it again.

`pod-apx.5.10` also asks Getting started to hide or collapse after all steps complete. The current code keeps it until Dismiss (`UI/LibraryEditingModel.swift:64`; `UI/LibrarySettingsScreens.swift:144`). That **matches the authoritative product behaviour**. Resolve the issue's requested change against that decision before changing it. It is not counted as a parity failure.

## Android features absent on Mac — not in spec

These are comparison notes, not extra shared requirements or Mac blockers. Paths here are relative to the repository root.

| Feature | Android evidence | Mac evidence and difference |
| --- | --- | --- |
| **not in spec:** Rich native show notes with headings, emphasis, numbered/nested lists and safe clickable links. | `apps/android/app/src/main/kotlin/app/podlist/ShowNotes.kt:29` | `UI/LibraryModel.swift:85`; `UI/EpisodeInspector.swift:65` flatten notes to plain Text and discard link destinations. |
| **not in spec:** Share a podcast and copy its feed address. | `apps/android/app/src/main/kotlin/app/podlist/PodcastPageScreen.kt:336` | `UI/PodcastScreens.swift:123` has no corresponding menu. Episode sharing is in spec and is M02 instead. |
| **not in spec:** Accept a feed URL or OPML through OS Open/Share. | `apps/android/app/src/main/kotlin/app/podlist/IncomingContent.kt:19`; `apps/android/app/src/main/kotlin/app/podlist/PodListScreens.kt:107` | `Mac/PodListMac.swift:18` has no incoming URL/document handler; OPML uses the explicit file panel. |
| **not in spec:** Persist browsing stacks, selection, Playlist tab and scroll anchors across recreation. | `apps/android/data/src/main/kotlin/app/podlist/data/BrowsingStore.kt:7`; `apps/android/app/src/main/kotlin/app/podlist/BrowsingState.kt:22` | `UI/LibraryModel.swift:207` keeps these in window memory; `UI/MacWindow.swift:172` resets the Playlist tab on destination changes. |
| **not in spec:** Per-feed refresh failure/last-success information and Retry refresh on its page. | `apps/android/app/src/main/kotlin/app/podlist/SubscriptionRefreshStatus.kt:13` | `Data/PodcastLibrary.swift:109` returns an aggregate error; `UI/PodcastScreens.swift:153` has no persisted refresh diagnostics. The polling work belongs to known issue `pod-apx.5.7`. |
| **not in spec:** An explicit server-address Discard draft action. | `apps/android/app/src/main/kotlin/app/podlist/ServerScreen.kt:48` | `UI/ConnectionViews.swift:37`; `UI/LibrarySettingsScreens.swift:83` retain the draft but provide no discard control. |
| **not in spec:** Android Auto browses Playlists and Entries through Media3. | `apps/android/app/src/main/kotlin/app/podlist/PlaybackService.kt:446` | `UI/SystemPlayback.swift:38` exposes playback commands only; car browsing is a platform feature and CarPlay is a later Apple target. |
| **not in spec:** System download-notification permission teaching. | `apps/android/app/src/main/kotlin/app/podlist/IncomingContent.kt:29` | `UI/DownloadViews.swift:11` supplies in-app status only; Android notification conventions are not a Mac requirement. |

Bring-over, direct Standalone Chapter resolution, per-Entry Resume, bulk Download and bulk rules are already shared requirements. They are not Android extras.

## Validation and handoff

Read the Swift implementation, shared duties, product and Mac decisions, relevant ADRs, and the Android implementations cited above. No app code or tests were changed. No live app, visual layout, focus order, VoiceOver, audio output or real server request was exercised.

Ran from `apps/apple` with the worktree-local compiler caches:

```sh
CLANG_MODULE_CACHE_PATH="$PWD/.build/module-cache" \
SWIFTPM_MODULECACHE_OVERRIDE="$PWD/.build/module-cache" \
swift test --scratch-path .build --disable-sandbox \
  --cache-path .build/cache --config-path .build/config --security-path .build/security
```

The first run passed Domain and Data tests but could not bind Unix sockets for three MCP tests. The rerun with socket permission passed all **114 test functions**: 55 UI, 27 Domain and 32 Data, including parameterized vectors. These are mostly model tests, despite the PodListUITests target name. Passing them does not prove the missing UI actions or B01's schema-invalid case.

Known follow-ups stay on `pod-apx.5.6`, `pod-apx.5.7` and `pod-apx.5.10`. New follow-ups are `pod-apx.5.12` for B01, `pod-apx.5.13` for the other major actions, and `pod-apx.5.14` for small omissions and live checks. This report does not close the implementation milestones or claim a live Mac regrade. Commit only this file on `mac-parity`; do not merge or push.
