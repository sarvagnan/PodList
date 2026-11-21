# Mac minor findings triage

Baseline `9ab51ae`. Screen numbers refer to the Light and Dark captures in `podlist-grading/profiling-tools-tour` from the main checkout. The evidence also uses the Show Borders captures, `menus.txt`, and source under `apps/apple/Sources/PodListUI` unless specified. The findings come from the eight beads and their linked Opus and Codex reports. A repeat finding is counted once per bead. Where a report combines issues with different outcomes, each issue has its own row.

**STILL PRESENT** records a finding reproduced on the baseline and addressed in this change. **FIXED** records an earlier fix. Existing captures establish the baseline. The new presentation still needs the owner's VM tour.

| FIXED | STILL PRESENT, addressed here | OWNER DECISION | OBSOLETE | NEEDS OWNER | Total |
|---:|---:|---:|---:|---:|---:|
| 90 | 25 | 1 | 7 | 16 | 139 |

| Bead | Finding | Class | Evidence or fix |
|---|---|---|---|
| pod-apx.5.59 (R3) | FLOW-07 · Getting Started action at the top | FIXED | 32 shows Hide Getting Started in the trailing footer. |
| pod-apx.5.59 (R3) | FLOW-06 · Empty chart and Top Podcasts shell | FIXED | `5c5ffc6` and `LibrarySettingsScreens.swift` show the dedicated empty state captured in dark/31. |
| pod-apx.5.59 (R3) | DATA-05 · Undo fails to reveal restored Entries and nonempty Playlists | FIXED | `48336f5` added `RestoredEntries.between` and a window-local selection and scroll target. |
| pod-apx.5.59 (R3) | DATA-05 · Undo fails to reveal restored Views and empty Playlists | NEEDS OWNER | `RestoredEntries.between` emits only newly present Entry IDs. See Undo reveal below. |
| pod-apx.5.59 (R3) | DRAG-05 · Accepted Library drops fail silently | FIXED | `LibraryDrops.swift` collects unreadable items and stages their errors in Import Results (`a1c0f5d`). |
| pod-apx.5.59 (R3) | PTR-04 · Subscription Settings gear and row hover text | FIXED | `PodcastScreens.swift` supplies gear help. `MacWindow.swift` and `PodcastScreens.swift` use short row help and keep Episode titles in accessible names. |
| pod-apx.5.59 (R3) | PTR-04 · New View plus has no help | STILL PRESENT | Added “Create a View” help to the current New View sidebar button in `MacWindow.swift`. |
| pod-apx.5.59 (R3) | COPY-04 · Form and command capitalization | FIXED | 16 shows Minimum Length (Optional), 22 and 27 show Skip Intro, and General uses Server Address. The row hint “Play from here” uses sentence case and the menu command uses title case. See the local-device terminology row in R6. |
| pod-apx.5.59 (R3) | SET-04 · Last Settings pane resets | STILL PRESENT | `PodListSettings` used `@State`. It now stores the selected pane in `@AppStorage`. |
| pod-apx.5.59 (R3) | APP-01 · About copyright missing | FIXED | `48336f5` added `NSHumanReadableCopyright` to `scripts/build-mac-app.sh`. |
| pod-apx.5.59 (R3) | SYS-02 · No feed-address Service | FIXED | `bcae431` added the Add to PodList Service. `scripts/system-integration-keys.plist` supplies registration for integration-enabled bundles. |
| pod-apx.5.59 (R3) | SYS-03 · No stable app links | FIXED | `bcae431` added validated `podlist://` routes for Episodes, Views and Playlists. The menu capture includes Copy PodList Link. |
| pod-apx.5.59 (R3) | SYS-06 · No Share extension | FIXED | `de79501` merged the URL-receiving Share extension and its VM tour check. |
| pod-apx.5.67 (R4) | FLOW-06 · Empty Listening Stats shell | FIXED | `5c5ffc6` and dark/31 show the zero-listening empty state. |
| pod-apx.5.67 (R4) | FLOW-07 · Add to Playlist default in the middle | FIXED | `dc10717` made Add the trailing default. Screen 23 shows Play Now and Play Next as secondary choices. |
| pod-apx.5.67 (R4) | FLOW-07 · Add Podcasts sheet lacks a prominent close action | OBSOLETE | `bf44b53` and `7af5b94` made Add Podcasts a native utility window with standard closing. The main Search action is alongside the query in 24. |
| pod-apx.5.67 (R4) | APPEAR-09 · Eraser icon means Clear on Played | FIXED | 01 shows no eraser badge. 11 and the Playlist menu retain the named toggle. |
| pod-apx.5.67 (R4) | APPEAR-11 · Playlist header shifts by tab | FIXED | `408359f` stabilized the header. The tour compares the section and Play positions across 06–09. |
| pod-apx.5.67 (R4) | APPEAR-11 · Subscription disarming shifts the header | FIXED | `SubscriptionButtonLabel` reserves the widest label. The tour asserts matching frames in 18, 20 and 21. |
| pod-apx.5.67 (R4) | COPY-01 · Done creates a View | FIXED | 17 shows Create View, matching the Create Playlist pattern in 13. |
| pod-apx.5.67 (R4) | COPY-01 · Dismiss closes Getting Started | OBSOLETE | 32 now uses Hide Getting Started, which also controls future presentation. |
| pod-apx.5.67 (R4) | COPY-04 · Toolbar tooltip casing | STILL PRESENT | The Inspector already uses “Show or hide Inspector.” Refined Back to Library in `MacWindow.swift` to use a sentence-style help tag. |
| pod-apx.5.67 (R4) | VIEW-02 · View shows Show Sidebar while visible | FIXED | `408359f` added focused sidebar visibility and the standard Control–Command–S binding. Current `menus.txt` shows Hide Sidebar. |
| pod-apx.5.67 (R4) | PTR-02 · Episode context menu duplicates per-Playlist placement menus | FIXED | `EpisodeActionItems` reserves per-Playlist placement submenus for the Episode menu. Context menus keep direct placements and omit shortcuts. |
| pod-apx.5.67 (R4) | PTR-04 · Missing New View help | STILL PRESENT | Added help to the current New View sidebar button. The old toolbar New View button has gone. |
| pod-apx.5.67 (R4) | PTR-04 · Missing Subscription Settings gear help | FIXED | `PodcastScreens.swift` supplies “Subscription settings.” |
| pod-apx.5.67 (R4) | DATA-05 · Undo reveal for Entries and nonempty Playlists | FIXED | `48336f5` and `revealRestoredEntries` supply the originating window's target. |
| pod-apx.5.67 (R4) | DATA-05 · Undo reveal for empty Playlists | NEEDS OWNER | The reveal callback has no target for an empty Playlist. See Undo reveal below. |
| pod-apx.5.67 (R4) | DRAG-05 · Accepted Library drops fail silently | FIXED | `LibraryDropBatch` explains unreadable feed addresses and OPML files in Import Results. |
| pod-apx.5.67 (R4) | APP-01 · About copyright missing | FIXED | `48336f5` added bundle copyright metadata. |
| pod-apx.5.67 (R4) | SYS-02 · No feed-address Service | FIXED | `bcae431` added Add to PodList. |
| pod-apx.5.67 (R4) | SYS-03 · No app URL scheme | FIXED | `bcae431` added stable Episode, Playlist, and View URLs. |
| pod-apx.5.67 (R4) | SYS-06 · No receiving Share extension | FIXED | `de79501` merged Share intake from Safari and other apps. |
| pod-apx.5.79 (R6) | APPEAR-04 · Light Stats empty copy and General server address contrast | FIXED | Stats uses `PodListEmptyState` and its readable secondary color. General's Server Address value uses `.primary` in `LibrarySettingsScreens.swift`. |
| pod-apx.5.79 (R6) | APPEAR-09 · Clear on Played eraser badge | FIXED | 01 omits the eraser. 11 shows the checked control with explanatory text. |
| pod-apx.5.79 (R6) | TYPE-06 · Long help lines in Add Podcasts, Text Size and Playlist Settings | STILL PRESENT | Shortened the Add Podcasts note and capped the three help blocks at 420 pt. |
| pod-apx.5.79 (R6) | COPY-01 · Close, Done and Dismiss for auxiliary windows | OBSOLETE | 24 and 26 use standard window controls. 32 uses Hide Getting Started. |
| pod-apx.5.79 (R6) | COPY-01 · Device versus this Mac | STILL PRESENT | 03, 18, 22 and 25 used Device in download copy. Download controls, notices and the connection message now use this Mac. |
| pod-apx.5.79 (R6) | COPY-01 · Add to Playlist sheet's actions all say Play | FIXED | 23 has a trailing Add action with Play Now and Play Next as secondary choices. |
| pod-apx.5.79 (R6) | VIEW-02 · Sidebar menu title stale | FIXED | The current menu capture shows Hide Sidebar while the sidebar is visible. |
| pod-apx.5.79 (R6) | Status band consumes 45–60 pt above lists | FIXED | `9f818c7` consolidated the band. `EditingFeedback` reserves a single 32 pt row at default text size. |
| pod-apx.5.79 (R6) | Empty states use mismatched colors | FIXED | The Stats and Inspector empty states now both use the readable title and body styles in `PodListEmptyState`. |
| pod-apx.5.79 (R6) | APP-01 · About copyright missing | FIXED | `48336f5` supplies bundle metadata. |
| pod-apx.5.79 (R6) | DATA-05 · Offscreen restored Entries | FIXED | `48336f5` added window-local reveal after successful Undo and Redo. |
| pod-apx.5.79 (R6) | DATA-05 · Restored empty Playlist | NEEDS OWNER | The state comparison emits Entry IDs. See Undo reveal below. |
| pod-apx.5.79 (R6) | PTR-04 · Podcast settings gear tooltip absent | FIXED | `PodcastScreens.swift` supplies “Subscription settings.” |
| pod-apx.5.79 (R6) | SET-04 · Settings pane transient | STILL PRESENT | `PodListSettings` now persists the active pane. |
| pod-apx.5.79 (R6) | SYS-02 · No feed-address Service | FIXED | `bcae431` added Add to PodList. |
| pod-apx.5.79 (R6) | SYS-03 · No app links | FIXED | `bcae431` added validated content links. |
| pod-apx.5.79 (R6) | SYS-06 · No Share extension | FIXED | `de79501` merged Share intake. |
| pod-apx.5.84 (R7) | VIEW-02 · Sidebar menu title stale | FIXED | `menus.txt` shows Hide Sidebar. |
| pod-apx.5.84 (R7) | TOOL-03 · Window and selection actions share a shifting toolbar group | FIXED | `408359f` and `9a1faf9` stabilized the toolbar. 03 and 33 show the Inspector beside the compact selection group. The remaining Settings affordance is covered in R10 below. |
| pod-apx.5.84 (R7) | APPEAR-09 · Eraser means Clear on Played | FIXED | 01 has no eraser badge. |
| pod-apx.5.84 (R7) | DATA-05 · Undo does not select restored Entries and nonempty Playlists | FIXED | `48336f5` and `WindowModel.revealRestoredEntries` supply the target and row anchor. |
| pod-apx.5.84 (R7) | DATA-05 · Undo does not navigate to restored Views or empty Playlists | NEEDS OWNER | Reveal depends on restored Entries. See Undo reveal below. |
| pod-apx.5.84 (R7) | COPY-01 · Vague Edit › Retry | FIXED | `MenuCommandActions.swift` indexes Retry Failed Operation and the captured Edit menu names the active retry. |
| pod-apx.5.84 (R7) | COPY-01 · Listening log versus Listening Log | STILL PRESENT | Title-cased the domain term in Rewind and Delete Permanently copy. |
| pod-apx.5.84 (R7) | COPY-01 · Controls repeats Play/Pause as Resume and Pause | FIXED | `PlaybackCommands.swift` and the tour assert one state-dependent menu command. |
| pod-apx.5.84 (R7) | COPY-04 · Toolbar and player help uses title case | STILL PRESENT | Refined Back to Library, More Episode Actions and Open Active Playlist help while retaining command names. |
| pod-apx.5.84 (R7) | Four visible Play affordances when an Episode is selected | NEEDS OWNER | 03 shows Play on the row, toolbar, Inspector and player bar. The player controls current playback and the other three can address the selection. See playback affordances below. |
| pod-apx.5.84 (R7) | APP-01 · About copyright missing | FIXED | `48336f5` supplies bundle metadata. |
| pod-apx.5.84 (R7) | SET-04 · Last Settings pane transient | STILL PRESENT | `PodListSettings` now persists the active pane. |
| pod-apx.5.84 (R7) | HELP-02 · Getting Started lacks a separator | FIXED | The live menu export has a separator between PodList Help and Getting Started. `PodListMac.swift` supplies the divider. |
| pod-apx.5.84 (R7) | SYS-02 · No feed-address Service | FIXED | `bcae431` added Add to PodList. |
| pod-apx.5.84 (R7) | SYS-03 · No stable Library links | FIXED | `bcae431` added content links. Podcast context also has Copy PodList Link in `LibraryCommands.swift`. |
| pod-apx.5.84 (R7) | SYS-06 · No Share extension | FIXED | `de79501` merged Share intake. |
| pod-apx.5.88 (R8) | VIEW-02 · Sidebar menu title stale | FIXED | `menus.txt` shows Hide Sidebar. |
| pod-apx.5.88 (R8) | TOOL-03 · Four toolbar groups and Play inside the Playlist switcher | FIXED | 06 and 07 show separate section switcher and Play affordance. `9a1faf9` consolidated the rest. |
| pod-apx.5.88 (R8) | PTR-04 · Subscription Settings gear tooltip absent | FIXED | `PodcastScreens.swift` supplies “Subscription settings.” |
| pod-apx.5.88 (R8) | APPEAR-09 · Clear on Played eraser glyph | FIXED | 01 has no eraser badge. |
| pod-apx.5.88 (R8) | APPEAR-11 · Transient feedback shifts list as notices appear and expire | FIXED | `EditingFeedback` reserves the Library status row across those changes. `EditingFeedbackTests` covers the row height. |
| pod-apx.5.88 (R8) | TYPE-06 · Long Add Podcasts and Settings import instructions | STILL PRESENT | Shortened and bounded Add Podcasts copy. Settings and sheet import help are bounded at 420 pt. |
| pod-apx.5.88 (R8) | TYPE-07 · Underlined description disclosure | FIXED | `MacReadableAccentButtonStyle` draws the disclosure without underline. |
| pod-apx.5.88 (R8) | TYPE-07 · Description toggle available when there is no extra text | FIXED | `PodcastDescription` measures collapsed and full text and exposes both the button and menu command when truncated. The current fixture in 19 has additional text. |
| pod-apx.5.88 (R8) | COPY-01 · Three auxiliary closing verbs | OBSOLETE | 24 and 26 use system closing. 32 uses the explicit Hide Getting Started action. |
| pod-apx.5.88 (R8) | COPY-01 · Play labels on an Add sheet | FIXED | 23 now uses Add as the default. Play Now and Play Next are explicit alternate placements. |
| pod-apx.5.88 (R8) | COPY-04 · Field and tooltip casing | STILL PRESENT | Download Rule and Played Threshold are already the same size. Title-cased the discovery field and refined sidebar, toolbar and player tooltips. |
| pod-apx.5.88 (R8) | Success messages vary in word order and punctuation | STILL PRESENT | `LibraryEditingModel` and `PlaylistEditingModel` now use `Deleted View “Name”` and `Cancelled View edits`. |
| pod-apx.5.88 (R8) | Helper text varies in size | STILL PRESENT | Settings import, Text Size and Automation already use captions. Subscription inheritance and bulk Download Rules help now use the same text style. |
| pod-apx.5.88 (R8) | Trash duplicates its retention note and is inset differently | STILL PRESENT | 14 and `PlaylistTrashView` already show one note in either state. The populated view now uses the shared 14 pt horizontal inset. |
| pod-apx.5.88 (R8) | Search sidebar badge disagrees with filtered results | FIXED | `792a827` removed the sidebar count. 15 shows one result in content. |
| pod-apx.5.88 (R8) | Add Podcasts empty state sits left of center | FIXED | 24 centers the heading at x=1468 in the 650 pt window beginning at x=1143. |
| pod-apx.5.88 (R8) | DATA-05 · Undo fails to reveal restored Entries or nonempty Playlists | FIXED | `48336f5` added window-local reveal and scroll. |
| pod-apx.5.88 (R8) | DATA-05 · Undo fails to reveal restored empty Playlists | NEEDS OWNER | A Playlist with no restored Entries produces no reveal target. See Undo reveal below. |
| pod-apx.5.88 (R8) | SYS-02 · No feed-address Service | FIXED | `bcae431` added Add to PodList. |
| pod-apx.5.88 (R8) | SYS-03 · No app links | FIXED | `bcae431` added validated content links. |
| pod-apx.5.88 (R8) | SYS-06 · No Share extension | FIXED | `de79501` merged Share intake. |
| pod-apx.5.88 (R8) | APP-01 · About copyright missing | FIXED | `48336f5` supplies bundle metadata. |
| pod-apx.5.92 (R9) | APPEAR-09 · Eraser badge, duplicate Play glyphs, and slider glyph used by button and menu | FIXED | 01 omits the eraser. `EpisodeActionButtons` uses one contextual Play button and the sliders glyph consistently opens settings or editing. |
| pod-apx.5.92 (R9) | APPEAR-10 · Sidebar commands look like destinations | STILL PRESENT | 01 shows similar color and row style. Gave New View, New Playlist and Add Podcasts secondary styling and action help. |
| pod-apx.5.92 (R9) | TYPE-06 · Inspector notes wrap too narrowly | NEEDS OWNER | 03 opens the Inspector at 270 pt despite a 370 pt ideal in `PaneWidths`. See Inspector width below. |
| pod-apx.5.92 (R9) | TYPE-07 · Description toggle looks like a link and appears even if text fits | FIXED | Current disclosure style has no underline. `PodcastDescription` gates it on measured truncation. |
| pod-apx.5.92 (R9) | TYPE-07 · Show Less mismatches Hide Description menu command | STILL PRESENT | Both the button and menu now say Hide Description. The existing collapse and column-restoration checks use the new title. |
| pod-apx.5.92 (R9) | COPY-01 · Close, Done and Dismiss vary | OBSOLETE | Modeless windows now use native closing. Getting Started has an explicit Hide Getting Started action. |
| pod-apx.5.92 (R9) | COPY-01 · Add sheet defaults to Play Next | FIXED | `dc10717` and 23 show Add as the trailing default. |
| pod-apx.5.92 (R9) | COPY-01 · View and Views menu names are hard to distinguish | STILL PRESENT | `menus.txt` confirms the near-identical labels. Renamed the object menu Saved Views and updated its tour interactions. |
| pod-apx.5.92 (R9) | COPY-04 · Device, Listening Log, Inspector headings, filter statement, and tooltips | STILL PRESENT | Used this Mac and Listening Log consistently. Changed In Your Playlists to title case and the filter statement to sentence case. Refined the cited help tags. |
| pod-apx.5.92 (R9) | VIEW-02 · Sidebar title stale | FIXED | `menus.txt` shows Hide Sidebar. |
| pod-apx.5.92 (R9) | TOOL-03 · Five or six Playlist toolbar groups | FIXED | `9a1faf9` consolidated controls. 07 shows Play switching to the selection action in the same space. |
| pod-apx.5.92 (R9) | Create and edit use two rename patterns | FIXED | `91f4355` unified inline name fields. 11–13 and 16–17 show one primary Save/Create action. |
| pod-apx.5.92 (R9) | Add Podcasts empty state off-center | FIXED | 24 shows the message centered horizontally in its panel. |
| pod-apx.5.92 (R9) | Success notice inserts a row above list | FIXED | `MacWindow.swift` reserves the fixed-height Library status row. |
| pod-apx.5.92 (R9) | APP-01 · About copyright missing | FIXED | `48336f5` supplies bundle metadata. |
| pod-apx.5.92 (R9) | DATA-05 · Undo describes Entries without revealing them | FIXED | `48336f5` added selection and scroll reveal. |
| pod-apx.5.92 (R9) | DATA-05 · Undo describes restored Views or empty Playlists without revealing them | NEEDS OWNER | There is no reveal target when the edit restores no Entries. See Undo reveal below. |
| pod-apx.5.92 (R9) | SYS-02 · No feed-address Service | FIXED | `bcae431` added Add to PodList. |
| pod-apx.5.92 (R9) | SYS-03 · No deep links | FIXED | `bcae431` added validated content links. |
| pod-apx.5.92 (R9) | SYS-06 · No Share extension | FIXED | `de79501` merged Share intake. |
| pod-apx.5.98 (R10) | APPEAR-04 · Dark Settings selected-tab accent contrast | OWNER DECISION | `mac-dark-accent-settings-tab` retains the Dark AccentColor after checking the selection-fill trade-off. See dark/27 and 30. |
| pod-apx.5.98 (R10) | APPEAR-09 · Duplicate Play buttons and Clear on Played eraser | FIXED | 01 omits the eraser. 06–07 show one toolbar Play control for Playlist or selection. |
| pod-apx.5.98 (R10) | TYPE-07 · Underlined description toggle | FIXED | `PodcastDescription` uses the non-underlined accent button style. |
| pod-apx.5.98 (R10) | COPY-01 · Modeless Close, Done and Dismiss | OBSOLETE | Native close controls replaced the old footers. See 24 and 26. |
| pod-apx.5.98 (R10) | COPY-01 · Rewind button lacks the menu ellipsis | FIXED | 34a and the tour assert the preview button ends in an ellipsis. |
| pod-apx.5.98 (R10) | VIEW-02 · Sidebar title stale | FIXED | `menus.txt` shows Hide Sidebar. |
| pod-apx.5.98 (R10) | TOOL-03 · Settings and selection actions share one capsule | NEEDS OWNER | 07 and `EpisodeActionButtons` show the current compact group includes Playlist Settings. See playback affordances below. |
| pod-apx.5.98 (R10) | Two rename patterns | FIXED | `91f4355` replaced nested rename commits with persistent inline Name fields. |
| pod-apx.5.98 (R10) | Unsubscribe confirmation differs by route | NEEDS OWNER | `PodcastScreens.swift` arms the header control. `LibraryCommands.swift` and the Subscription context menu execute the reversible command immediately. See Unsubscribe below. |
| pod-apx.5.98 (R10) | Add Podcasts empty state off-center | FIXED | 24 centers the message horizontally. |
| pod-apx.5.98 (R10) | Footer corners fail to nest | OBSOLETE | `792a827` removed the floating footer from ordinary sheets. Only the scrolling View editor uses the glass footer, as approved in pod-apx.5.115. |
| pod-apx.5.98 (R10) | Stacked sheet labels | FIXED | `dc10717` added aligned label and control columns with a stacked fallback at large text sizes. The remaining centered pop-ups are covered in R18 below. |
| pod-apx.5.98 (R10) | Late Episode drop clears the active search | STILL PRESENT | `WindowModel.revealDrop` cleared `search` unconditionally. It now preserves the active query, selection and anchor. Updated the existing drop test. |
| pod-apx.5.98 (R10) | Late edit error pushes the list | FIXED | `MacWindow.swift` now reserves the Library feedback row. `EditingFeedbackTests` covers the row height across errors and notices. |
| pod-apx.5.98 (R10) | DATA-05 · Undo fails to reveal offscreen Entries | FIXED | `48336f5` added the scoped reveal. |
| pod-apx.5.98 (R10) | APP-01 · About copyright missing | FIXED | `48336f5` supplies bundle metadata. |
| pod-apx.5.98 (R10) | HELP-02 · Getting Started lacks separation | FIXED | `PodListMac.swift` adds a Divider after PodList Help, confirmed in `menus.txt`. |
| pod-apx.5.98 (R10) | SET-04 · Last Settings pane transient | STILL PRESENT | `PodListSettings` now persists the active pane. |
| pod-apx.5.98 (R10) | SYS-02 · No selection Service | FIXED | `bcae431` added Add to PodList. |
| pod-apx.5.98 (R10) | SYS-03 · No Library deep links | FIXED | `bcae431` added validated content links. |
| pod-apx.5.98 (R10) | SYS-06 · No route from Safari and other apps | FIXED | `de79501` merged Share intake. The Add to PodList Service also accepts selected addresses. |
| pod-apx.5.120 (R18) | Sheet pop-ups centered in the control column | STILL PRESENT | `light/16-edit-view.txt` shows Published about 119 pt to the right of Name. Leading-aligned affected View, Subscription and Download Rule pickers, including the inline Podcast rule. |
| pod-apx.5.120 (R18) | Empty Inspector consumes nearly half the available detail area | NEEDS OWNER | 35 leaves about 265 pt for the list next to the 270 pt Inspector. That capture has a selected Episode. Screen 38 confirms the empty placeholder uses the same 270 pt pane. See Inspector width below. |
| pod-apx.5.120 (R18) | Named Undo/Redo in status row refers to another screen's edit | NEEDS OWNER | 15 shows Redo Settings for Commute on Search. The control exposes the Library's shared edit history. See edit history below. |
| pod-apx.5.120 (R18) | MENU-04/COPY-04 · Sort by, Play … in, In your Playlists | STILL PRESENT | The menu export and 03 show the original strings. Applied title case to Sort By, Play Now/Next/Last In, and In Your Playlists. |
| pod-apx.5.120 (R18) | TYPE-06 · Inspector notes wrap at about 31 characters | NEEDS OWNER | 03 shows a 270 pt pane. The owner approved removing the separate notes window in pod-apx.5.127. See Inspector width below. |
| pod-apx.5.120 (R18) | Now Playing shows a scrollbar when its content fits | STILL PRESENT | 26 shows a full-height thumb. `ContentSizedPanel` now shows vertical scroll indicators only when measured content exceeds the available viewport. |
| pod-apx.5.120 (R18) | Immediate Mark All Played in a Save/Cancel sheet | NEEDS OWNER | 22 and `SubscriptionSettingsScreen` show the immediate action and its explanatory copy. See immediate sheet actions below. |
| pod-apx.5.120 (R18) | Immediate Delete Playlist in a Save/Cancel sheet | NEEDS OWNER | 11 and `PlaylistSettingsSheet` show that Delete executes immediately and closes the sheet. See immediate sheet actions below. |
| pod-apx.5.120 (R18) | Rewind to Here… repeated on eligible Timeline rows | NEEDS OWNER | 09 and 34a show the quiet row buttons. The hover/selection-only implementation approved in pod-apx.5.115 was reverted in `c46bce5` after VM verification failed. See Timeline below. |
| pod-apx.5.120 (R18) | Half-display Podcast page truncates Share and Copy Feed Address | STILL PRESENT | 38 shows ellipsized buttons. The header now switches to icons with the same accessible names and help tags when the labeled pair will not fit. |

The other recorded owner choices did not require code changes in this batch. The floating player meets the updated playback-bar clause with menu parity and error feedback outside the bar (`mac-bottom-player`, `c67b703`). Appearance stays (`mac-appearance-setting`). The app uses Liquid Glass (`mac-decisions-15nov`), has no customizable toolbar (`mac-toolbar-customization`), and keeps the measured responsiveness (`mac-speed-accepted`). The R18 Codex report lists these broader grading issues separately from the minor findings.

## Owner choices

The owner decided these items on 21 November 2026 in pod-apx.5.131.

- **0A. Saved Views menu.** Keep the Saved Views name.
- **1A. Undo reveal.** When Undo restores a View or an empty Playlist, keep the current destination and show the restoration notice.
- **2A. Play controls.** Keep the row, toolbar, and Inspector actions.
- **3A. Playlist toolbar.** Keep Settings and selection actions in the same compact group.
- **4A. Unsubscribe from menus.** Keep the immediate, undoable command in the Podcast menu and context menus. Keep the two-click control on the Podcast page.
- **5D. Narrow Library windows.** Below 950 pt, opening the Inspector hides the sidebar, and showing the sidebar closes the Inspector. Narrowing with both open also hides the sidebar. Only the person can show it again. At 950 pt and above, all three panes may be visible. The threshold reserves 225 pt for the default sidebar, 450 pt for the list, 270 pt for the Inspector, and 5 pt for dividers. Restored windows follow the same rule.
- **6A. Inspector width.** Keep the existing SwiftUI Inspector, which opened at 270 pt in the VM. The owner chose this behavior after the wider default required an AppKit split-item adjustment. The divider remains resizable and its width is remembered as before.
- **7B. Undo and Redo.** Offer the next named action in the Library status row only on its originating destination. Edit menu commands and keyboard shortcuts still operate on the app-wide history.
- **8B. Subscription Settings.** Remove Mark All Played and its explanatory text from the sheet. The command is available in the Podcast menu and Subscription context menus.
- **9D. Playlist Settings.** Delete moves the Playlist to Trash immediately and keeps the sheet open. Its fields are disabled, Restore Playlist replaces Delete, and Done replaces Save and Cancel. Restore and Edit → Undo Delete Playlist both re-enable the existing draft. Done, Escape, and Return close the deleted-state sheet and discard the draft.
- **10B. Timeline Rewind.** An eligible selected row shows its Rewind to Here… button. Click and arrow keys select rows. The accessibility action, row context menu, and Playlist menu preserve access to Rewind.

The round 17 Timeline snapshot exposes its rows as outline rows with a blank center and text on the left. The earlier tour clicked each row's default accessibility point. The row now has a full-width hit area, and the tour clicks inside that area and checks selection, the button, and the Rewind preview.
