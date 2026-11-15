# PodList Mac app, UI grade (round 3, Opus)

This is an independent full audit of the PodList macOS app at commit `02ea2d2`, done with `~/Documents/UI_Guidelines/CRITIQUE.md`, `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`.

**Evidence:**
- **XCUITest tour:** `~/Documents/podlist-grading/mac-round-3/`. It has 35 states, each in Light and Dark, as 2× PNGs with accessibility trees. The main window is 1180 × 760 pt. It also includes `menus.txt`.
- **Code:** `apps/apple/Sources` (PodListUI, PodListMac, PodListDomain).

**Capture references:**
- `L/NN` means `light/NN-*.png` and `D/NN` means `dark/NN-*.png`.
- Point sizes come from the `.txt` frames.
- Contrast was sampled from the PNG pixels with WCAG relative luminance.

No earlier grading report was read.

## Frame

- **Task:** Find Episodes through Views, Search and Subscriptions, then queue and play them through ordered Playlists, where each Playlist keeps its own Position, History and Listening Timeline.
- **Target:** Mac app (SwiftUI, macOS 26+, captured on macOS 27.2), so the audit uses `core-checklist.md` plus `mac-checklist.md`.
- **Posture:** Sovereign personal tool. It stays open while listening, and people come back to it many times a day.
- **Audience:** Perpetual intermediate. The domain vocabulary (View, Entry, Clear on Played, Rewind) rewards learning.
- **Nearest exemplar:** Things, for the calm, opinionated personal posture. Apple Podcasts and Music are the same-kind comparison for the side-by-side test.
- **Character (signature elements):**
  1. A brand blue accent, `#2B50C8` in Light and `#9DB1FF` in Dark, with Increase Contrast variants. *Owner-fixed.*
  2. A bottom Liquid Glass player bar. It has artwork, transport controls, a centred title, the podcast name and the scrubber, with Speed, Sleep and Active Playlist trailing. *Owner-fixed.*
  3. Monogram artwork tiles (MH, DF, SB) on pale accent squares.
  4. Two-line Episode rows with inline Add and Play glyphs.
  5. Plain-spoken, consequence-explaining copy built on capitalised domain nouns: Episode, Entry, Playlist, View and Device. For example: "Deleted Playlists can be restored from Trash for 30 days."
- **Owner decisions:** brand accent instead of the system accent; transport in a bottom bar; Settings › Appearance offers Light, Dark and follow macOS; no customisable toolbar; two-click arming Unsubscribe; Liquid Glass on the player bar, Inspector actions, Now Playing and the View editor footer; Spotlight deferred; MCP off by default and App Intents on. These are graded and their caps stand, but none is proposed as a target.

## Flows

**Tasks covered:** the tour steps through Views, Search, Playlist sections, sheets, the Podcast page, Unsubscribe arm and disarm, Now Playing, Settings, Listening Stats and multi-selection.

**Conditions:** one size (1180 × 760 pt on a 1920 × 1200 pt Retina VM desktop), in Light and Dark. Each state is a separate capture.

**Flow run:** none.
- The tour captures states. It does not record per-step element boxes, focus, typed values or timings, and it adds no late completions.
- So FLOW-01 and FLOW-02 are **N/O**, RESP-01 and RESP-02 are **N/O**, and the **stability sub-score is N/O**.
- Consistency & polish is therefore marked "partial: no flow run".
- There was no timed run and no measurements file.

**What the code shows in place of a flow run:**
- **Reserved space for late feedback.** The editing status strip ("Edit status" group, 32 pt, `L/01.txt` y = 271) is reserved above the content, so a late confirmation or Undo arrives in kept space.
- **Late completions don't touch typed text:**
  - Synced View updates are accepted only when nothing is pending (`ViewEditorScreen.swift:141-143`).
  - Settings `reconcile` skips fields with pending saves (`GeneralSettingsEdits.swift:37-41`).
  - Stale Add Podcasts results are dropped (`PodcastScreens.swift:79-87`).

**Failures:** [FLOW-07] minor, from screenshots only (see the checklist).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View / Search table (L/02, L/15) | Status strip at the top of the detail, below the sync line: "Undone: X" or "Downloaded X on this Device.", expiring after 5 s (`EditingNotice.swift:11`) | Same strip, red text plus Retry (`FailureFeedback.swift`); download errors appear in the Inspector as raw red text (`DownloadViews.swift:72`) | none | Undo/Redo buttons in the strip, plus Edit › Undo "Undo Star" | Inspector shows icon + "Select an Episode" (title grey, body black) | none | Toolbar Play / Add; per-row Play glyph | Filter summary line "Published in the last 7 days · Unplayed · …" |
| Playlist Entries (L/06) | Status strip | Status strip | none | Strip + Edit menu | none | none | "Play This Playlist" tinted button, inline right of the section control | Section label "Playlist section" |
| History (L/08) | — | — | none | — | Centred icon + "No History" + explanation | none | Play This Playlist | Explanation only |
| Listening Timeline (L/09, L/34) | Strip | Strip | Rewind preview sheet with Cancel / Rewind (bottom, trailing default) | "Rewind can be undone." + Edit menu | — | none | Per-row "Rewind to Here" ×N | Rewind sheet explains Goes back to / Unplayed again / Kept |
| Trash (L/14) | Strip, plus "Restored Playlist “name”" | Strip | Delete Permanently: confirmation dialog (context menu only) | Restore button + Edit menu | Centred icon + "Trash Is Empty" + one line, with a header line repeating retention | none | Row "Restore" | Header line "kept for 30 days" |
| Subscriptions (L/01) | Strip | Strip | none | Strip | "No …" | none | "Edit Download Rules…" trailing, top | "Grouped by Download Rule" |
| Podcast page (L/18–L/21) | Strip | Strip | Unsubscribe arms inline: red "Unsubscribe", 4 s | Undo "Unsubscribe" | — | none | Subscribed/Unsubscribe toggle, leading in the action row | Show Description link |
| New / Edit View sheet (L/16, L/17) | live "6 matching Episodes" top-trailing | field-specific | none | Cancel reverts live edits | — | — | Done, bottom-trailing in a glass footer; Delete View bottom-leading | "(Optional)" labels |
| Playlist Settings (L/11, L/12) | live | — | none | Edit menu | — | — | Done, bottom-trailing, **plain**, Esc dismisses | Captions under Clear on Played and Delete |
| New Playlist (L/13) | — | — | none | — | — | — | Create Playlist, bottom-trailing default | none |
| Add to Playlist (L/23) | — | — | none | — | — | — | Play Next (default) between Play Now / Play Last, bottom-trailing | none |
| Add Podcasts (L/24) | — | inline | none | — | Centred icon + "Find Your Next Podcast" + example URL link | — | Search beside the field; Done bottom-trailing, plain | "OPML import is in Settings…" caption |
| Download Rules (L/25) | — | — | none | Edit menu | — | — | Apply, bottom-trailing default | one-line explanation |
| Subscription Settings (L/22) | live | — | none | Edit menu | — | — | Done, bottom-trailing, **prominent**, **Esc does nothing** | "Default inherits the global Playback Settings." |
| Settings (L/27, L/30) | live | per-field "Could not save X… Retry" | none | Edit menu | — | — | none (live) | captions under fields |
| Getting Started sheet (L/32) | — | — | none | — | — | — | **Dismiss, top-trailing**, no Esc | steps with menu path and ⇧⌘A |
| Now Playing (L/26) | — | player error text | none | — | — | — | Done, bottom-trailing, in a glass footer, inside a real window | — |
| Listening Stats (L/31) | — | — | none | — | **Plain sentence "Play an Episode…" above an empty, axis-only chart** | — | — | caption line |

**Mismatches:**
1. **Done buttons on settings-type sheets.** Playlist Settings and Add Podcasts use a plain Done that Esc triggers. Subscription Settings uses a prominent Done that Esc doesn't trigger, and Getting Started's Dismiss has no Esc either. Screens: L/11, L/22, L/24, L/32.
2. **Main-action position.** Every sheet puts its main action at the bottom, trailing, except Getting Started, which puts Dismiss at the top, trailing (L/32).
3. **Empty states.** History, Trash, Add Podcasts and the Inspector use an icon, a title and a description. Listening Stats uses a bare sentence and draws an empty chart frame with a truncated "No…" axis label (L/31).
4. **Error wording.** Plain copy such as "Could not reach the podcast or server. Check your connection and try again." sits alongside raw `String(describing: error)` text in the Inspector's download status and in Playlist edit errors (`ApplicationModel.swift:446,481,486`; `PlaylistEditingModel.swift:91`).
5. **Unsubscribe.** It arms on the Podcast page (L/20) but runs immediately from Podcast › Unsubscribe and the Subscriptions context menu (`MacWindow.swift:409-411`). The same command has two safety models. All routes are undoable.
6. **Rename.** Playlist Settings and Edit View use a two-step "Rename…" that opens a field with "Cancel Rename / Save" (L/11 → L/12, L/16). New Playlist and New View edit the name in place (L/13, L/17).
7. **Label capitalisation within one form.** "Skip intro / Skip outro / Server address" sit beside "Volume Boost / Keep Playlists in Trash / Text Size" (L/27). "Minimum length (Optional)" sits beside "In a Playlist" and "All Conditions Must Match" (L/16). "Download Rule on this Device" sits beside "On This Device" (L/22).

## Checklist

**Coverage:** 94.0% (140 of 149 applicable items verified). The 168 IDs are 80 core and 88 Mac.

| Verdict | Count |
|---|---|
| Pass | 122 |
| Fail | 18 |
| N/O | 9 |
| N/A | 19 |

### Failures by severity

**Blocker**

- **[MENU-02] Delete Permanently exists only in a context menu.**
  - **Evidence:** Trash › Delete Permanently… is only in the Trash row's context menu (`PlaylistSettingsViews.swift:182-185`). The Playlist menu offers Restore but no Delete Permanently (`menus.txt`, Playlist menu). It is the app's only irreversible command, and it can't be found or reached from the menu bar.
  - **Fix:** Add `Delete Permanently…` to the Playlist menu's Trash group, after Restore. Enable it when a Trash row is selected, and drive the same confirmation dialog from it. Optionally, also add a visible "Delete Permanently…" next to Restore on the row.

**Major**

- **[MENU-03] The Pause command vanishes whenever rows are selected.**
  - **Evidence:**
    - With any selection, Controls › Play/Pause becomes "Play Selected Episode" (`PlaybackCommands.swift:22-26`).
    - Space then runs `playSelection`, which does `add([id], placement: .now)` in Views, or `playFromHere` in Playlists (`MacWindow.swift:615-619`). It never pauses.
    - Selection is the normal state in a list app. So pressing Space to pause usually inserts the selected Episode into the Active Playlist and starts it.
    - Pause then has no menu item, and the transport toggle has no keyboard route. The step is undoable, but the familiar Play/Pause toggle is broken.
  - **Fix:**
    - Keep "Play"/"Pause" as one stable state toggle on Space.
    - Move "Play Selected Episode" to its own item, such as Return or ⌘Return, or to Episode › Play Now, which already exists.
    - When the selected Episode is the one playing, Space must pause.

- **[DLG-04] Esc doesn't dismiss two sheets.**
  - **Evidence:**
    - Subscription Settings has a Done `.defaultAction` and no `.cancelAction` (`PodcastScreens.swift:408`), so Esc does nothing.
    - The Getting Started sheet's only button, "Dismiss", has no shortcut (`LibrarySettingsScreens.swift:236`).
    - The sibling sheets Playlist Settings and Add Podcasts close on Esc (L/22, L/32 vs. L/11, L/24).
  - **Fix:** Give Subscription Settings a `.cancelAction` route that closes the sheet (changes are live, so it can simply dismiss). Make Getting Started's Dismiss `.cancelAction` and move it to the bottom, trailing.

- **[WIN-05] Transport controls sit in a bottom bar (owner decision).**
  - **Evidence:** The window's critical playback actions (Play/Pause, skip, scrub, Speed, Sleep) live in the bottom bar (L/01, y = 872–924 pt). If the window is dragged partly off-screen, they are the first things lost.
  - **Fix:** Kept by the owner, and not a target. The mitigation already exists: every transport command is in the Controls menu.

- **[SIDE-06] The sidebar ignores the system sidebar-size setting.**
  - **Evidence:** The sidebar sets `.macContentFont(.body)` explicitly on the `.listStyle(.sidebar)` list (`MacWindow.swift:113-114`). This fixes the font and row size instead of following System Settings › Appearance › Sidebar icon size. Rows measure 32 pt (L/01.txt).
  - **Fix:** At 100%, drop the explicit font on the sidebar List so the system sidebar metrics apply. Apply `macTextScale` only when the app's Text Size is above 100%.

- **[DATA-06] Sidebar width isn't restored.**
  - **Evidence:** The code comment says "Its width isn't restored" (`MacWindow.swift:115-116`). Everything else in the window context is restored: destination, selection, sort, scroll anchor, column visibility and Inspector width (`WindowRestoration.swift:40-57`).
  - **Fix:** Persist the sidebar column width in the existing `paneWidths` SceneStorage and feed it back as the `ideal` width.

- **[APPEAR-02] Fixed brand colour instead of the user's accent (owner decision).**
  - **Evidence:**
    - Buttons, sidebar symbols, pop-ups, links and the More Actions menu use the fixed brand accent through `.tint(.podListAccent)` (`MacWindow.swift:44`, `MacAppearance.swift:52-58`), not the user's accent colour.
    - List selection still draws in the system accent. The result is two different blues side by side: the sidebar selection fill next to the brand-blue sidebar glyphs (L/02, L/06).
  - **Fix:** Kept by the owner. To reduce the two-blue clash without dropping the brand, draw the sidebar glyphs in `.secondary` (or the brand colour only when selected), and keep brand blue for content-level emphasis.

- **[APPEAR-04] Light secondary text is below 4.5:1 where people read it.**
  - **Measured (Light):**
    - Empty-state descriptions in History, Trash and Add Podcasts: 3.95:1, #808080 on #FFFFFF, about 13–15 pt regular (L/08, L/14, L/24).
    - Subscriptions group header "Stream": 3.95:1, 11 pt (L/01).
    - Listening Stats chart axis labels and "Minutes": 3.95:1 (L/31).
  - **Measured (Dark):** the same elements pass at 5.7:1.
  - **Passes under HIG Bold 3:1:** the Inspector placeholder title "Select an Episode" measures 3.07:1 Light and 3.2:1 Dark. It is bold, so the HIG Bold rule passes it; the small-bold ambiguity is noted.
  - **Not charged:** sidebar section headers (Views, Playlists, Library) measure 2.2:1. They are system-drawn sidebar headers and are recorded only.
  - **Why it counts:** this is the system `secondaryLabelColor`, but these descriptions recur and tell people what to do next.
  - **Fix:** Use `.primary` for empty-state descriptions, matching the Inspector placeholder body, which is already primary. Alternatively, use a secondary token of at least 4.5:1 in Light, about #6B6B6B. Keep the chart axis at a value that passes 4.5:1.

- **[COPY-02] Some errors show raw error descriptions.**
  - **Evidence:** Download errors are `String(describing: error)` shown in red in the Inspector (`ApplicationModel.swift:446,481,486`, `DownloadViews.swift:72`). The same raw form appears in:
    - Playlist edit errors (`PlaylistEditingModel.swift:91`)
    - "Could not undo: \(error)" (`:125`)
    - "Playback could not continue: \(error)" (`PlaybackController.swift:98,176`)
    - "Could not open or sync the local Library: \(error)" (`ApplicationModel.swift:47`)
  - **Why it counts:** this breaks the app's own plain "Could not … Try again." pattern (`LibraryEditingModel.swift:7-14`).
  - **Fix:** Map each error to the existing `LibraryMessages` strings, or to a new short cause plus recovery ("Couldn't download — the server didn't respond. Retry."). Log the raw error, and never show it.

- **[SYS-05] No Spotlight indexing (owner decision).**
  - **Evidence:** CoreSpotlight is not used. The owner has approved it but deferred it to last.
  - **Fix:** Deferred by the owner; not a target. When it's built, index Episodes and Subscriptions with `CSSearchableItem` and open them through the window target.

**Minor**

- **[FLOW-07] Getting Started puts its action at the top.**
  - **Evidence:** Its only action, Dismiss, is at the top, trailing. Every other sheet ends with its main action at the bottom, trailing (L/32 vs. L/13, L/16, L/22, L/23, L/25, L/34).
  - **Fix:** Move Dismiss to the bottom trailing position and make it `.cancelAction`.

- **[DATA-05] Undo doesn't reveal what it restored.**
  - **Evidence:** Undo only sets status text ("Undone: X", or "· Restored Playlist “name”"). It doesn't navigate to or select the restored item (`PlaylistEditingModel.swift:96-127`). Drops do reveal and select (`LibraryModel.swift:233-240`), so the mechanism exists.
  - **Fix:** After an undo, call the same `revealDrop` and selection path for the affected IDs, and navigate to a restored Playlist or View.

- **[PTR-04] Some tooltips are missing or can be too long.**
  - **Evidence:**
    - Two icon-only buttons have no `.help`: the toolbar "New View…" plus (`MacWindow.swift:154`) and the Podcast page gear "Subscription Settings…" (`PodcastScreens.swift:201`).
    - Interpolated tooltips ("Add \(title) to a Playlist", "Play Now: \(title)") pass 75 characters for long Episode titles.
  - **Fix:** Add `.help("New View")` and `.help("Subscription Settings")`. Use fixed tooltips ("Add to a Playlist", "Play Now") and keep the title in the accessibility label.

- **[COPY-04] Capitalisation is inconsistent within forms.**
  - **Evidence:** See inventory mismatch 7. The row tooltip "Play from here" also differs from the menu item "Play from Here".
  - **Fix:** Use title case for every form label and section heading ("Skip Intro", "Server Address", "Minimum Length", "Download Rule on This Device"). Keep sentence case for captions.

- **[SET-04] Settings doesn't reopen to the last pane.**
  - **Evidence:** It always reopens on General (`@State private var pane = "general"`, `ConnectionViews.swift:50`).
  - **Fix:** Use `@AppStorage("PodList.settingsPane")`.

- **[SYS-02] No Services are offered.**
  - **Evidence:** No `NSServices` entry was found. "Subscribe in PodList" on a selected feed URL in another app is a natural cross-app operation.
  - **Fix:** Vend one Service that opens Add Podcasts pre-filled. The drop path already does this (`LibraryDrops.swift`).

- **[SYS-03] Content has no app links.**
  - **Evidence:** There is no URL scheme (`CFBundleURLTypes`) and no `onOpenURL`, so Episodes, Views and Playlists have no app links.
  - **Fix:** Add a `podlist://` scheme that resolves to `LibraryWindowTarget` destinations.

- **[SYS-06] PodList can't receive a feed shared from another app.**
  - **Evidence:** There is no Share extension, so a feed or episode link can't be sent to PodList from Safari.
  - **Fix:** Add a Share extension that accepts URLs and opens Add Podcasts.

### N/O

FLOW-01, FLOW-02, WIN-03, WIN-10, APPEAR-11, RESP-01, RESP-02, FOOT-01, FOOT-02.

### N/A

DLG-08, DLG-09, CTRL-02, LIST-05, START-04, START-05, START-07, FILE-01, FILE-02, FILE-05, FMT-02, DATA-02, DATA-03, DATA-08, SYS-07, EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04.

The reasons:
- **DLG-08:** no floating panels.
- **DLG-09:** no popovers. `.popover` is not found.
- **CTRL-02:** no checkbox hierarchy.
- **LIST-05:** no outline disclosure in the content.
- **START-04, START-05:** no permission requests.
- **START-07:** the app creates no accounts.
- **FILE-01, FILE-02:** there is no document model; OPML is Import/Export.
- **FILE-05:** nothing to print.
- **FMT-02:** no formatted text.
- **DATA-02, DATA-03, DATA-08:** not a document app.
- **SYS-07:** no meaningful Dock state beyond Now Playing, which the system covers.
- **EXTRA-01 to EXTRA-04:** no menu bar extra.

### Passes

| IDs | Evidence |
|---|---|
| FLOW-03 | Synced data never overwrites typed fields; see the code guards under Flows. |
| FLOW-04 | Undo and confirmations arrive in the reserved strip at the top of the detail. The Rewind and Delete questions are sheets or dialogs in view (L/34). |
| FLOW-05 | Sidebar, content and Inspector share the top edge under the toolbar (L/03). |
| FLOW-06 | Empty sidebar sections show "No …" (`MacWindow.swift:72-74`). Feedback space is reserved, not inserted. |
| KEY-01 | Every command has a menu item. Focus rings on sheet buttons and checkboxes show keyboard focus working (L/11, L/31, L/34). Native Table, List and Slider are used. |
| KEY-04 | First fields are focused on open: New Playlist (L/13), New View (L/17), Add Podcasts (L/24). Focus rings are visible. |
| KEY-06 | Letter and arrow shortcuts with ⌘, ⇧⌘ and ⌥⌘; there are no Control bindings. Note: Bigger is bound to `"+"` only, with no `"="` alias (`MacTextSize.swift:74`). Verify ⌘= on a US layout. |
| KEY-07 | Native scroll views. Space-for-play is documented in Help. |
| KEY-08 | Help window with a shortcut table (`ConnectionViews.swift:69-109`). Bare Space is routed to text views (`PlaybackCommands.swift:50-85`). |
| DLG-01 | The only alert is the irreversible Delete Permanently. |
| DLG-02 | "Delete “X” Permanently?" with a consequence message. |
| DLG-03 | Delete Permanently / Cancel. |
| DLG-05 | Delete Permanently has the destructive role and Cancel; Delete Playlist and Delete View are undoable moves. |
| DLG-07 | Cancel+Done or Done alone; never Cancel, Done and Back together. |
| DLG-06 | One sheet at a time, attached to its parent (Getting Started attaches to Settings, L/32). |
| CTRL-01 | Pop-ups for flat choices, a segmented "Playlist section" for three sibling sections (L/06), and checkboxes. Note: a segmented control switching main content is borderline; it's labelled and limited to three segments. |
| CTRL-03 | Persistent labels on every field (L/13, L/16, L/24, L/27). |
| CTRL-04 | Minutes and seconds fields sized to the input; locale dates; field-specific problems in the View editor. |
| CTRL-05 | System button styles and glass styles. |
| CTRL-06 | The toolbar's ··· More Actions menu holds related Episode commands; Play and Add stay outside it (L/03). |
| CTRL-07 | "Search this list" and "Search Episodes" placeholders name the scope (L/02, L/18). There is no history. |
| CTRL-08 | Determinate, cancellable download ring (`DownloadViews.swift:84-93`). The OPML import shows "Importing X of Y" text and resumes after relaunch, so no work is lost. |
| LIST-01 | Tables for Episodes (Views, Search, Podcast, Entries). Lists for single-column History, Timeline and Trash. |
| LIST-02 | Episode, Published, Length, State; Entry, Position. |
| LIST-03 | Sortable, resizable headers on View, Search and Podcast tables. Entries keep their order. |
| LIST-04 | Two-line rows with dividers stay trackable. |
| LIST-06 | Sidebar selection persists, and turns grey when the list isn't focused (L/03). The Speed menu marks the current value. |
| LIST-07 | Native Table with `primaryAction`: Return or double-click opens the Inspector (`MacWindow.swift:480`). |
| DATA-01 | Every draft persists in UserDefaults across close and quit (`PlaylistEditingModel.swift:261-280`). |
| DATA-04 | Unlimited, named Undo/Redo for Star, Played, Play Now/Next/Last, Move, Remove, Rename, Move to Trash, Restore, Clear on Played, Delete View, Subscribe/Unsubscribe and settings (`EditHistory.swift`, `EpisodeEditingViews.swift:209-216`). |
| DRAG-01 | Episodes drag to sidebar Playlists and reorder within Entries. OPML or URL drops on the window work. Drag-out gives a URL and text. Every drop has a menu equivalent. |
| DRAG-03 | Drops are named undo steps ("Undo Play Last", "Undo Move Entries"). An OPML drop stages a preview. |
| DRAG-05 | System drag image and insertion line. |
| DRAG-06 | System autoscroll; dropped rows are selected and revealed (`LibraryModel.swift:233-240`). |
| PTR-03 | No custom gestures or cursors. |
| APPEAR-03 | High-contrast colour variants (`MacAppearance.swift:9-17`). Glass falls back to opaque and bordered under Reduce Transparency or Increase Contrast (`MacGlass.swift:27-57`). |
| APPEAR-05 | No custom animations or transitions; system motion follows Reduce Motion. |
| APPEAR-09 | One SF Symbols family. Note: the eraser fill/outline used for Clear on Played on/off is a stretch, but it has tooltips and labels. |
| APPEAR-10 | Controls are bezelled, tinted or glass, and distinct from content. |
| TYPE-02 | System font only, Regular to Bold. |
| TYPE-03 | SF at 13 pt body and 11 pt secondary (`.txt` heights 18 and 15). |
| TYPE-05 | Normal leading. Text Size goes from 100 to 200% and swaps Tables for reading rows (`MacWindow.swift:446-455`). |
| TYPE-06 | Captions and explanations run about 60–90 characters per line (L/11, L/27, L/34). |
| TYPE-07 | No all caps; no bold italic. |
| TYPE-08 | Ellipsis character in "New View…" and elsewhere (`.txt`); curly ’ and “ ” ("Playlist’s"); the minus sign in "−16:34". |
| COPY-01 | Specific verbs (Play Next, Rewind, Restore, Copy Feed Address). "click" in hints. |
| COPY-03 | Empty states give a next step or say what will appear ("Play an Episode to start your Listening log."). |
| AX-01 | Labels on every icon-only control. Stateful labels ("Star, Not starred"). The scrubber is a native Slider. Unsubscribe has a hint. Note: Settings fields read "Skip intro, Skip intro", a duplicated name. |
| AX-02 | Current Entry has a label and a symbol. The Active Playlist has a speaker symbol. Armed Unsubscribe changes text and symbol (L/20). |
| AX-04 | Every action has a menu or keyboard route. |
| AX-05 | No autoplay; transport controls are always present. |
| START-01 | Local Library before sync; "Opening Library…". |
| START-02 | Getting Started can be dismissed, stays dismissed, and reopens from Settings (`LibraryEditingModel.swift:100-110`). |
| START-03 | Help window and Getting Started steps name the menu path. |
| START-06 | "Start on This Mac" needs no server or account. |
| EDIT-02 | Copy and Select All on tables. Delete on Entries only, undoable. Cut and Paste dimmed. |
| EDIT-05 | Copy writes "Title\nURL" text plus a `public.url` per Episode (`SelectionCommands.swift:83-103`). Copy Feed Address and Copy Link exist. |
| TOOL-06 | The toolbar can't be hidden. Sidebar and Inspector have toggles, menu items and shortcuts. |
| SIDE-03 | Sidebar button + View › Show Sidebar (⌃⌘S). Inspector button + ⌥⌘I. |
| SIDE-04 | Persistent highlight in the sidebar and the Table. |
| SET-01 | App-wide options in Settings; Playlist and Subscription options next to their objects. |
| MENU-01 | App, File, Edit, View, Podcast, Views, Controls, Episode, Playlist, Window, Help. |
| MENU-04 | Verb phrases with ellipses where input follows ("Add to a Playlist…", "Rewind to Here…"). |
| MENU-05 | One level of submenus. |
| MENU-06 | System alternates only. |
| APP-01 to APP-04 | Standard App menu, Settings… ⌘, as a window (L/27), Hide/Hide Others/Show All/Quit. |
| FILE-03 | Close closes the window. |
| FILE-04 | Export OPML… leaves the Library open. |
| EDIT-01 | "Undo X" / "Redo X" head Edit. |
| EDIT-03 | ⌘F is the app's Find, "Search Library"; the text Find commands remain. Note: two items carry ⌘F, and the system Find… is dimmed. |
| EDIT-04 | Spelling, Substitutions, Transformations, Speech, Dictation, Emoji & Symbols. |
| FMT-01 | Format menu omitted; there is no formatted text. |
| VIEW-01 | Full Screen, Sidebar, Inspector, text size. |
| VIEW-02 | The Inspector title flips with state. The capture's "Show Sidebar" title is likely a stale snapshot, because menus aren't validated without opening; the toolbar reads "Hide Sidebar". |
| WMENU-01 to WMENU-03 | Minimize, Zoom, Bring All to Front; open windows listed. |
| HELP-01, HELP-02 | Help › PodList Help opens app-specific documentation (thin, about 280 words plus shortcuts). System Help search is kept. |
| KEY-02 | No standard binding is reused against its meaning. ⌘N makes the app's primary new object (a View). ⌘. is Stop, and Esc in sheets. |
| KEY-03 | Frequent commands have ⌘ shortcuts. Note: eight shortcuts use ⌥⌘, and Download has none. |
| KEY-05 | System-drawn notation. The Help text uses ⇧⌘A in the right order. |
| TEXT-01, TEXT-02 | Plain SwiftUI TextFields (system field editor); spelling and correction are not disabled. |
| WIN-01, WIN-02 | Standard traffic lights. The inactive-window appearance is system-drawn (L/11, where the sheet makes the window inactive). |
| WIN-04 | The title names the view ("New this week") with a count subtitle. |
| WIN-06 to WIN-09 | Native full screen; New Window ⌥⇧⌘N; Open in New Window; system title bar. |
| TOOL-01 to TOOL-05 | Leading sidebar toggle and title; trailing actions and search; at most three groups; borderless symbols; search in the toolbar. Note: the secondary ··· menu is the only tinted toolbar item (L/03). |
| SIDE-01, SIDE-02, SIDE-05 | Leading sidebar, visible by default; section → item, two levels; 0.5 pt divider (`.txt` splitter). |
| SET-02 | The in-app appearance override includes follow-macOS (allowed by APPEAR-01). Text Size is the app's enlargement route, because macOS has no Dynamic Type. |
| SET-03 | Toolbar panes (General, Automation), selected and sized to the pane; minimize and zoom dimmed (L/27, L/30). |
| SET-05 | Every setting applies live; Retry appears on a failed save. |
| SET-06 | A fixed Settings window with zoom dimmed. The SwiftUI Settings scene is not restored. |
| DATA-07 | System file importer and exporter for OPML. |
| DRAG-02, DRAG-04, DRAG-07 | Reorder moves; dropping on another playlist adds a copy. Multi-item payloads in the private type, then URL, then text. Native select-and-drag. |
| PTR-01, PTR-02, PTR-05 | Context menus on sidebar rows, Episodes, Entries, History, Timeline, Trash and Subscriptions. Shortcuts are suppressed in context menus (`keyboardShortcuts = false`). `contextMenu(forSelectionType:)` targets the clicked row. |
| APPEAR-01 | Light, Dark and System applied live (`MacAppearance.swift:63-93`). Both appearances are coherent (D/03, D/06). |
| APPEAR-06 to APPEAR-08 | Glass only on control surfaces; `.regular` glass; no surface directly on glass; system toolbar and sidebar glass kept. Note: the Inspector's GlassEffectContainer sits inside Now Playing's container when Episode Details opens there. |
| TYPE-01 | 13 pt body, 11 pt secondary, Title sizes for headings. Note: the Subscription Settings "Download Rule on this Device" label is 11 pt among 13 pt labels (L/22). |
| TYPE-04 | 28 × 28 pt icon buttons, 24 pt pop-ups, 29 pt fields. |
| AX-03 | Text Size 100–200% from View › Bigger/Smaller and Settings, keeping content. |
| SYS-01 | 11 App Intents plus an `AppShortcutsProvider` (`AppIntents.swift:203-208`). |
| SYS-04 | System `ShareLink` for Episodes and Podcasts. |

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.6** | One system face at Mac sizes (13 pt titles, 11 pt metadata) with weight-led roles in tables and the Inspector (L/03). Several roles invert: the Inspector placeholder title is grey while its body is black (L/02); Timeline dates are as prominent as the Episode they belong to (L/09); Settings section headings ("Playback Settings", "Trash", "Library") are plain body text in the value column and can't be told from labels (L/27); Subscription Settings mixes 11 pt and 13 pt labels (L/22); Listening Stats mixes a bold "Listening Streak" with a large regular "Top Podcasts" (L/31). Upper Competent: correct, but type doesn't carry structure everywhere. | `hierarchy`, `craft` |
| Hierarchy | **6.3** | Content leads, and the Table plus Inspector reads left to right (L/03). Brand blue is spread across every sidebar glyph, every row's Add and Play glyphs, the selected segment, Play This Playlist and Current Entry, so the eye has no single primary (L/06). About 60 pt of reserved status space sits between "Up to date" and the content on every list (L/02). Five "Rewind to Here" buttons repeat down the Timeline (L/09). The tinted ··· More Actions is the most prominent toolbar item. Competent: a clear main area, but secondary chrome competes. | `content-first`, `hierarchy` |
| Spacing & density | **6.5** | A consistent rhythm: 28 pt controls, 54 pt two-line rows, aligned leading edges in tables and forms (L/16). Sheets carry dead space (Playlist Settings L/11, New Playlist L/13); the Add Podcasts empty state sits off-centre in its sheet (L/24); the reserved status band repeats on every list; Now Playing doesn't fit its own default size and scrolls under its glass footer (L/26). Upper Competent. | `craft` |
| Color & contrast | **5.6** | Dark is coherent, and Increase Contrast and Reduce Transparency variants exist (`MacAppearance.swift`, `MacGlass.swift`). Status colour always comes with text or a symbol. The two-blues clash (system selection fill vs. brand glyphs, L/02) and the brand tint on chrome (APPEAR-02, owner decision) work against the restraint anchor. Light secondary text is 3.95:1 on recurring descriptions (APPEAR-04). The player-bar scrubber is grey while Now Playing's is blue (L/01 vs. L/26). Capped at 6.9 by APPEAR-02 and APPEAR-04. Mid Competent. | `color-restraint`, `accessibility` |
| Iconography | **6.6** | One SF Symbols family with labels and stateful accessibility names. Every View has the same glyph (`line.3.horizontal.decrease`). The play triangle means Play Now in Views and Play from Here in Playlists. Clear on Played is shown as a filled or outline eraser. Two icon-only buttons lack tooltips (PTR-04). Competent: correct, with a few stretched meanings. | `conventions`, `plain-language` |
| Consistency & polish | **6.4** (stability N/O; partial: no flow run) | Empty, disabled, focus, inactive-selection and error states are designed (L/03, L/08, L/14, L/13). Same-kind sheets differ in Done style and Esc behaviour, Getting Started's action placement, the Rename pattern and the Unsubscribe safety model (inventory 1, 2, 5, 6). Toolbar items appear and vanish between Playlist sections (L/06 vs. L/09). Now Playing repeats its window title as a heading. The chart's axis label truncates to "No…" (L/31). Upper Competent. | `craft`, `stability` |
| Clarity | **6.2** | Labels are specific, and state is visible: Active, Current Entry, Up to date, counts, "6 matching Episodes". These hold it down: with 6 rows selected, the Inspector shows only the first Episode as if it were the selection (L/33); Space silently changes from Pause to "insert selection and play" (MENU-03); Add Podcasts says "OPML import is in Settings" although File › Import OPML… exists (L/24); Settings has both "Import OPML…" and "Choose a File…" (L/27); the Podcast page has no Back control; raw errors appear (COPY-02, cap 6.9). Competent. | `plain-language`, `feedback` |
| Platform fit | **4.9** (looks 7.4, behaves 7.0, formula 7.1, capped) | **Looks:** native window, toolbar, sidebar, Table, Settings with panes, and glass in the current era (L/02, L/27). Foreign tells: brand-tinted pop-ups and sidebar symbols, and a Done button in a real window (L/26). **Behaves:** a full, ordered menu bar with named Undo; most commands have shortcuts; context menus; drag and drop with undo; per-window restoration; App Intents. Gaps: an irreversible command missing from the menus (MENU-02), the Pause toggle broken by selection (MENU-03), Esc on two sheets, the sidebar-size preference, and no Services, URL scheme or Spotlight. The **MENU-02 blocker caps this at 4.9**. Without it, the score would sit low in Strong. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **6.9** (capped) | Strong on forgiveness: unlimited named Undo across Library edits, drafts that survive close and quit, a preview sheet before Rewind, drops that are undo steps, live Settings with Retry, determinate and cancellable downloads. Against it: Space mutates the Active Playlist when rows are selected; Undo doesn't reveal what it restored (DATA-05); sidebar width isn't restored (DATA-06, which caps this at 6.9); no timed runs (RESP N/O). It would be about 7.5 without the cap. | `forgiveness`, `keyboard-efficiency` |
| **Overall** | **6.2** | The app serves its primary task well, and most of it feels at home on a Mac. The menu bar, Undo and Settings window are better than typical SwiftUI apps. The single biggest weakness is behavioural: two commands escape the menu-bar contract (Delete Permanently; Pause under selection). Brand colour and secondary-text contrast keep the visual side Competent. The lowest category is 4.9, so the cap is 6.9. | `conventions`, `content-first` |

## What stands between this build and 9.0

1. **Remove the blocker.** Put Delete Permanently… in the Playlist menu (MENU-02). Platform fit is then capped at 6.9 by the remaining majors instead of 4.9.
2. **Fix the remaining Platform-fit majors:**
   - Make Space a stable Play/Pause and give "Play Selected Episode" its own item (MENU-03).
   - Add Esc to Subscription Settings and Getting Started (DLG-04).
   - Let the sidebar follow the system sidebar size (SIDE-06).
   - WIN-05 and SYS-05 are owner decisions. They keep Platform fit at or below 6.9 until Spotlight lands; to reach 9.0 here, the owner has to revisit those decisions.
3. **Lift the Interaction cap.** Restore sidebar width (DATA-06). Reveal and select undone content (DATA-05).
4. **Colour and contrast.** Fix the Light secondary text, at 4.5:1 or above (APPEAR-04). End the two-blues clash by drawing sidebar glyphs neutral. APPEAR-02 is an owner decision and caps this category at 6.9 while it stands.
5. **Clarity:**
   - Show a multi-selection summary in the Inspector ("6 Episodes selected", with bulk actions).
   - Replace raw errors with plain recovery copy (COPY-02).
   - Add a Back route on the Podcast page (⌘[ and a toolbar chevron).
   - Remove the misleading "OPML import is in Settings" caption.
6. **Consistency.** Use one sheet grammar: Done always bottom-trailing, Esc always closes, Rename always edits in place, and Unsubscribe has the same safety on every route. Use title case for every form label. Give Settings and Subscription Settings section headings real heading styling (bold or `.headline`, as the Inspector's "In your Playlists" already does).
7. **Hierarchy.** Quiet the per-row Add and Play glyphs (show them on hover or selection, or draw them in `.secondary`). Collapse the reserved status band when there's no status, using an overlay that doesn't move core elements, so the space-keeping property survives.
8. **Evidence.** Run a real flow run, with element boxes, focus and timed passes at minimum, half-screen and typical sizes. Without it the stability sub-score and RESP checks stay N/O, and Consistency & polish can't reach Exemplary on the record.

## Next step

| | |
|---|---|
| **Target** | [MENU-02] blocker. It's the only blocker, so it outranks every major. |
| **Anti-pattern** | *Context-menu roulette*: a command that exists only in a context menu. |
| **Root cause** | Trash row commands are built inline in the List's `.contextMenu` (`PlaylistSettingsViews.swift:182-185`), not through the focused-value command path that every other Playlist command uses. The Playlist menu therefore got Restore (`podListRestore`) but never Delete Permanently. |
| **Change** | Publish a `podListDeletePermanently` focused scene value from the Trash screen, set when one Trash row is selected, and add `Button("Delete Permanently…", role: .destructive)` to the Playlist menu's Trash group directly after Restore. It sets the same `deleting` state, so the existing confirmation dialog appears unchanged. Also add a visible "Delete Permanently…" button beside Restore on each Trash row. |
| **Principle** | `discoverable-commands` (MENU-02). The irreversible action keeps its confirmation, which serves `forgiveness`. |
| **Expected effect** | Platform fit's cap rises from 4.9 to 6.9, held there by MENU-03, DLG-04, SIDE-06, WIN-05 and SYS-05. Overall's cap rises to 8.2 (lowest category 6.2, plus 2.0). No signature element is touched. |
