# PodList Mac — UI grade, round 10 (Opus)

Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` (full audit), with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`.
Build: commit `3901092`, `apps/apple`.
Evidence: `~/Documents/podlist-grading/mac-round-10/`. It has 35 states in Light and Dark at 2×, with XCUITest accessibility snapshots, `menus.txt`, and the code.
Main window captures are 2360×1520 px, which is 1180×760 pt. The VM's system text renders at about 15 pt; the title bar text is that size too, so the scaling is system-wide and not the app's.
This is an independent grade. No earlier report was opened.

Evidence references:
- `L/NN` and `D/NN` mean `light/NN-*.png` and `dark/NN-*.png`.
- Code paths are relative to `apps/apple/Sources/PodListUI/` unless stated otherwise.

## Frame

- **Task.** Find Episodes across Subscriptions and saved Views, then line them up in ordered Playlists and listen. Each Playlist keeps its own History, Listening Timeline and position.
- **Target.** Mac app (SwiftUI, macOS 26+), so `core-checklist.md` and `mac-checklist.md` both apply.
- **Posture.** Sovereign. It is open all day beside other work, and the player bar is always present.
- **Audience.** The perpetual intermediate. The domain is unusually precise (Views vs Playlists, Entries, Active Playlist, Clear on Played, Rewind), so newcomers need the inline help the app provides.
- **Nearest exemplar.** Things, for a calm personal tool. BBEdit is the reference for the forgiveness and preview patterns: Rewind's summary sheet works like BBEdit's preview-before-commit.
- **Character.** These are signature elements to keep:
  1. Brand-blue monogram artwork tiles (initials on pale blue).
  2. A capitalised domain glossary (Episode, Playlist, Entry, View, Position) with plain, consequence-first copy.
  3. Source list → episode Table → Inspector, with a floating glass player bar.
  4. An inline edit-status row with named Undo/Redo instead of alerts.
  5. The Listening Timeline with "Rewind to Here".
- **Owner decisions.** These are graded but are not targets:
  - The brand blue is the AccentColor asset (`#2B50C8`/`#3652D0`, IC `#193A9B`/`#2B43BA`). The deliberately deep Dark accent also colours the selected Settings tab label.
  - Transport controls live in a bottom player bar.
  - Appearance offers Light, Dark and follow macOS.
  - There is no customizable toolbar.
  - Unsubscribe takes two clicks on the same control, disarms itself after a few seconds, and can be undone.
  - Liquid Glass is used on the player bar, Inspector actions, Now Playing and the View editor footer.
  - Spotlight is deferred.
  - The MCP server is off by default; App Intents are on.

## Flows

**Flows were not run.** The evidence is screenshots of separate states plus accessibility snapshots, with no step measurements and no timed runs.
- FLOW-01 to FLOW-04, RESP-01, RESP-02 and FOOT-02 are N/O.
- The stability sub-score is N/O, and Consistency & polish is marked "(partial: no flow run)".
- FLOW-05 to FLOW-07 are judged from the stills.

**Code-level risks worth putting in the next flow script:**
- **Late drop clears search.** `LibraryModel.revealDrop` (LibraryModel.swift:263-266) sets `search = ""` and replaces the selection when an Episode drop onto the playlist being viewed finishes. Drops are async (`EpisodeTransfer.swift:95-110`, `PlaylistContentView.swift:160`), so a query typed while a drop resolves would be lost (FLOW-03). For Episodes already in the Library the resolve is near-instant, so this is left N/O, not failed.
- **Feedback row pushes the list.** The main-window `EditingFeedback` uses `reservesSpace: false` (MacWindow.swift:137). An async failure that arrives later inserts a row above the table and pushes it down (FLOW-01).
- **Sheets are safe.** Every sheet reserves the row (`reservesSpace` defaults to true), so this risk is main-window only.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Episode lists: View, Search, podcast page (L/02, L/15, L/18) | Inline status row above the table, caption, primary colour; text clears after 5 s, Undo/Redo buttons stay (EpisodeEditingViews.swift:148-217) | Same row, red `#B91C1C`/`#FF9FA1` text + Retry; sync errors in the "Up to date" strip | none | Status-row button + Edit › Undo "Undo ‹name›" | Inspector: centred icon + "Select an Episode" | none | Toolbar ▶ "Play Now" (appears on selection) | Filter summary line ("Published in the last 7 days · Unplayed · …") |
| Playlist Entries / History / Timeline (L/06, L/08, L/09) | Same status row | Same | Rewind: summary sheet with Cancel / **Rewind** (L/34) | Same | History: centred icon, "No History" + explanation | none | Toolbar ▶ "Play This Playlist" | Rewind summary spells out consequences |
| Subscriptions / podcast page (L/01, L/18, L/20) | Same | Same | Unsubscribe arms in place: red "Unsubscribe", 4 s (L/20). From the menu or context menu it is one click | Same | — | none | Row chevron / Subscribed button | — |
| Trash (L/14) | — | — | Delete Permanently: confirmationDialog, destructive role (PlaylistSettingsViews.swift:260) | Restore | Centred "Trash Is Empty" + top explanatory line | none | — | "Deleted Playlists are kept for 30 days…" |
| Sheets: Playlist Settings, New Playlist, Edit/New View, Subscription Settings, Add to a Playlist, Download Rules (L/11–13, 16, 17, 22, 23, 25) | Status row inside the sheet | Inline red + Retry | none | Status row | — | none | Trailing blue default in a boxed glass footer (Save / Create Playlist / Create View / Play Next / Apply) | Paragraphs under controls, including "Save applies these settings. Cancel discards changes." |
| Add Podcasts window (L/24) | — | Inline red + Retry | none | — | Icon + "Find Your Next Podcast", **off-centre** | "Finding Podcasts…" spinner | "Search" beside the field; **blue "Close"** in the footer | Routing paragraph about OPML |
| Now Playing (L/26) | — | Inline red + Retry | none | — | — | none | **"Done"** in a glass footer | — |
| Getting Started (L/32) | — | — | none | — | — | — | **"Dismiss"** in a glass footer | Numbered steps |
| Settings (L/27–30) | Live apply, no message | Inline red + Retry (LibrarySettingsScreens.swift:219) | none | — | — | none | — | Captions under controls |
| Listening Stats (L/31) | — | — | — | — | Centred "No Listening Yet" + next step | — | — | — |

**Mismatches:**
1. **One role, three labels.** Closing a modeless surface is labelled "Close" in Add Podcasts, "Done" in Now Playing and "Dismiss" in Getting Started. All three are blue default buttons in the same glass footer (AddPodcastsWindow.swift:95, PlayerViews.swift:196, LibrarySettingsScreens.swift:262).
2. **Renaming works two ways.** New View and New Playlist edit the Name directly (L/13, L/17). Edit View and Playlist Settings show the name as text with a "Rename…" button, which opens an inline field with its own "Cancel Rename / Save Name" pair inside a sheet that already has Cancel / Save (L/11, L/12, L/16). That is two commits, and two blue buttons in L/12.
3. **One command, two confirmations.** Unsubscribe is a two-click arm on the podcast page (L/20) but one click from the Podcast menu and the Subscriptions context menu. All routes are undoable.
4. **Ellipsis differs by route.** The Timeline button reads "Rewind to Here" (L/09), the Playlist menu reads "Rewind to Here…", and both open the same summary sheet.
5. **Empty-state alignment.** The Add Podcasts empty state is centred on a 360 pt block at x = 679–1039, about 100 pt left of the window centre (L/24 snapshot). Every other empty state is centred in its pane.
6. **Listening state contradicts.** Listening Stats says "No Listening Yet" (L/31) while the Default Timeline shows "Listened at 12:34" (L/09).
7. **Row glyphs change colour by appearance.** The Add-to-Playlist and ▶ glyphs on each row are accent blue in Light (L/02) and primary white in Dark (D/03). That is a deliberate contrast fallback, but the glyphs' meaning shifts between appearances.

## Checklist

**Coverage: 87.0%** (127 of 146 applicable verified). That is pass 116 · fail 11 · N/O 19 · N/A 22, from 168 IDs (80 core, 88 Mac).

### Failures by severity

#### Blocker

**[KEY-01] Bare Space is a menu key equivalent, and it pre-empts Full Keyboard Access activation of every focused non-text control.**
- **Evidence.**
  - Controls › Play/Pause is `.keyboardShortcut(.space, modifiers: [])` (PlaybackCommands.swift:37-39).
  - Menu key equivalents are dispatched before the first responder's keyDown. `PlaybackKeyboardGuard` exists for exactly that reason: it hands Space back to the focused control *only when it is an editable `NSTextView`* (PlaybackCommands.swift:79-90).
  - With FKA on, a focused button, checkbox, pop-up, switch or segmented control gets Space taken from it. Pressing Space plays or pauses audio instead.
  - This happens in the main window, in every sheet (only Return and ⌘. are re-routed there) and in Settings, whenever Play is enabled (any loaded Episode or a non-empty Active Playlist).
  - Help states the intent: "Space always plays or pauses the current Episode, regardless of selection" (ConnectionViews.swift:88).
- **Mitigation.** Every command also lives in the menu bar with shortcuts, so the *core task* stays keyboard-reachable. Focused controls do not, and several sheet controls have no menu route at all: Clear on Played in the sheet, the Rename… button, the Edit View pickers, and the Settings controls. Severity stays at the check's blocker.
- **Verdict.** From code; one minute with FKA on would confirm it.
- **Fix.** In `PlaybackKeyboardGuard.route`, return `.text` (let the event reach the responder) whenever the first responder is any `NSControl` or a non-table view that accepts Space, and whenever `sheetIsKey` or the key window is Settings. Keep Space-to-play only when focus is in the episode/entry Table, the sidebar, or nowhere. Alternatively, drop the menu key equivalent and handle Space with `onKeyPress(.space)` on the lists and the window background. Show "Space" in the menu as a documented accelerator only.

#### Major

**[WIN-05] The bottom player bar holds transport, scrubbing, Speed, Sleep and Open Active Playlist** (L/01; MacWindow.swift:204-211), not "limited status". *Owner decision.*
- **Mitigation.** Every control has a Controls-menu item, most with shortcuts, and media keys work (SystemPlayback.swift).
- **Fix, if ever wanted.** Keep the bar to now-playing status plus play/pause, and leave Speed and Sleep to the menu and Now Playing.

**[SYS-05] No Spotlight indexing** (no CoreSpotlight). *Owner decision: deferred.*
- **Fix.** Index Episodes and Podcasts with `CSSearchableItem`, keyed by the same IDs as App Intents entities.

#### Minor

**[APPEAR-04] Dark Settings: the selected tab label "General" is `#435FDD` on `#484747`, about 1.7:1** (D/27, sampled). The label is isolated, and the window title repeats the pane name. *Owner accepts this.*
- **Fix.** Keep the deep accent for selection fills, and lighten the Dark accent's *text* use, for example an `NSColor` dynamic variant used only for foreground.

**[APPEAR-09] Two symbols carry the wrong meaning.**
- Two identical ▶ glyphs sit side by side in the Playlist toolbar with different meanings: "Play This Playlist" and "Play Now" (L/07, toolbar labels in `07-entry-inspector.txt`).
- The eraser glyph marks "Clear on Played" on sidebar rows (L/01), which is a stretch.
- **Fix.** Give Play Now a distinct symbol (`play.circle`) or fold it into "More". Show Clear on Played as text in the Playlist header, not a sidebar badge.

**[TYPE-07] "Show Description" / "Show Less" is an underlined link-style button that toggles text in place** (L/18, L/19; PodcastScreens.swift:137). Underline should mark only links.
- **Fix.** Use a disclosure button (chevron + "Description") or a plain borderless button.

**[COPY-01] The same action has inconsistent terminology:** Close / Done / Dismiss for one role, and "Rewind to Here" vs "Rewind to Here…" (inventory 1, 4).
- **Fix.** Use one word, "Done", for closing modeless panels. Better, drop the footer button where the window has a close button. Add "…" to the Timeline button.

**[VIEW-02] View shows "Show Sidebar" while the sidebar is visible.**
- `menus.txt` was captured with real frames, in the state its Window menu names ("New this week (6 Episodes · 6 selected)", L/33, sidebar visible).
- The toolbar button in the same window is labelled "Hide Sidebar".
- **Fix.** Bind the split view's `columnVisibility` to the command title, or provide a custom Show/Hide Sidebar item in place of `SidebarCommands`.

**[TOOL-03] With a selection, the Playlist toolbar runs past the guidance:** segmented control + a capsule of six symbol buttons + More + search (L/07). Playlist-level actions (Play This Playlist, New Playlist…, Playlist Settings…, Inspector) and selection-level ones (Play Now, Add to a Playlist…) share one capsule.
- **Fix.** Split them into a playlist group and a selection group, or move the selection actions into the Inspector, which already has them.

**[SYS-03] No URL scheme or universal links for Episodes, Playlists or Views** (no `CFBundleURLTypes` in scripts/build-mac-app.sh:20-39; no `onOpenURL`).
- **Fix.** Register `podlist://` with episode, playlist and view paths, and also `podcast://`/`pcast://` for subscribe.

**[SYS-06] No route for a feed seen in Safari or another app:** no Share extension, no podcast URL scheme, no Service. Subscribing from the browser means copy and paste into Add Podcasts.
- **Fix.** Handle `podcast:`/`feed:` URLs, or vend a "Subscribe in PodList" Service for selected URL text.

### N/O
FLOW-01, FLOW-02, FLOW-03, FLOW-04, RESP-01, RESP-02, FOOT-02, FOOT-01, DATA-05, DRAG-05, DRAG-07, APPEAR-11, START-02, WIN-03, WIN-10, TOOL-02, SET-04 (title passes; last-pane restore unverified, since `@State pane` in ConnectionViews.swift:57 may reset), SET-06, PTR-02.

### N/A
- DLG-09 (no popovers)
- DLG-08 (no panels)
- CTRL-02
- LIST-05 (no disclosure outlines)
- START-04, START-05 (no permission prompts)
- START-07 (no account creation)
- MENU-06 (no custom Option alternates)
- FILE-01, FILE-02, FILE-04, FILE-05 (no document model; OPML is import/export)
- FMT-02
- DATA-02, DATA-03, DATA-08
- SYS-02 (selection Services not essential; the subscribe case is charged under SYS-06)
- SYS-07 (no meaningful Dock state)
- EXTRA-01 to EXTRA-04

### Passes, with the evidence that settles them
- **Menu bar** (MENU-01, -02, -03, -04, -05; APP-01 to -04; FILE-03; EDIT-01, -02, -03, -04, -05; FMT-01; VIEW-01; WMENU-01 to -03; HELP-01, -02):
  - The order is App · File · Edit · View · Podcast · Views · Episode · Playlist · Controls · Window · Help (`menus.txt`).
  - Every toolbar, context-menu and Inspector action has a menu item.
  - Unavailable items are dimmed in place, and toggles are state-titled (Star/Unstar, Play/Pause, Hide Inspector).
  - Undo is named "Undo ‹edit›" (PlaylistEditingModel.swift:71-72).
  - Copy puts title, URL and `public.url` on the pasteboard (SelectionCommands.swift:152-172), and Delete removes Entries (PlaylistContentView.swift:115).
  - Help opens a real in-app guide with a shortcut grid (ConnectionViews.swift:76-117).
- **Keyboard** (KEY-02, -03, -04, -05, -06, -07, -08; TEXT-01, -02):
  - Frequent commands have ⌘ shortcuts with no ⌃.
  - ⌘←/⌘→ and ⌘L follow Music's precedent, and ⌘. is re-routed to Cancel inside sheets.
  - Shortcuts are documented in Help.
  - Text fields keep Cocoa bindings through `interpretKeyEvents`.
  - New sheets focus their Name field (L/13, L/17).
- **Windows** (WIN-01, -02, -04, -06, -07, -08, -09):
  - Native title bar and traffic lights.
  - Inactive-sidebar gray selection (L/03, L/07) and a dimmed parent under sheets (L/34).
  - New Window (⌥⇧⌘N), Open in New Window, and Enter Full Screen.
- **Toolbar and sidebar** (TOOL-01, -04, -05, -06; SIDE-01 to -06):
  - Leading sidebar toggle and title, trailing actions and search, and no tinted toolbar buttons.
  - Segmented playlist sections.
  - The sidebar is one level deep and follows the system sidebar size (MacWindow.swift:113).
- **Settings and dialogs** (SET-01, -02, -03, -05; DLG-01 to -07; CTRL-01, -03 to -08):
  - A real Settings window at ⌘, with General and Automation panes, the pane title, dimmed zoom and minimize, and live apply (L/27–30).
  - Appearance defaults to System (MacAppearance.swift:191).
  - The only confirmation is Delete Permanently, which uses the destructive role.
  - Search shows its scope ("Search this list" / "Search Library" / "Search Episodes", MacWindow.swift:193).
- **Lists** (LIST-01 to -04, -06, -07):
  - Tables with sortable, resizable noun headings (MacWindow.swift:508-517).
  - Custom type-select (MacRowScroll.swift:97-120).
  - Double-click opens the Inspector.
- **Data and drag** (DATA-01, -04, -06, -07; DRAG-01, -02, -03, -04, -06; PTR-01, -03, -04, -05):
  - Undo history spans deletes, unsubscribes, moves and rewinds.
  - `SceneStorage` restores destination, selection, sort, scroll anchor and pane widths (WindowRestoration.swift:51-69).
  - Drops are named and undoable, Option-drag copies, and dropped rows are selected.
  - Context menus use the clicked set without changing selection.
- **Appearance and accessibility** (APPEAR-01, -02, -03, -05, -06, -07, -08, -10; AX-01 to -05; TYPE-01 to -06, -08):
  - Glass falls back to an opaque fill with a stroke under Reduce Transparency and Increase Contrast (MacGlass.swift:8-33).
  - Custom colours have IC variants, and the accent falls back to primary where it fails contrast ("Current Entry" is white in D/06).
  - Measured contrast:
    - `#606060` on `#EEEDEC`: 5.4:1
    - `#606060` on white: 6.3:1
    - `#A0A0A0` on `#242222`: 6.0:1
    - Dark sidebar symbols: 3.2:1
  - Text size runs to 200% (MacTextSize.swift:8).
  - VoiceOver announcements are posted for errors and status (FeedbackAnnouncements.swift:10-32).
- **Integration and launch** (SYS-01, SYS-04; START-01, -03, -06): App Intents and AppShortcuts, ShareLink for Episodes and Podcasts, an "Opening Library…" placeholder, and a "Start on This Mac" option with no account required.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.3** | System semantic styles only: body, headline, caption, title2 (`macContentFont`). Bold headline titles over caption secondary in every row (L/02). Bold Inspector title (L/03). The type scale does the hierarchy work, which puts it above Competent. Out of Exemplary because one sheet mixes four or five label styles: caption-size "Download Rule on This Device" over body-size "Played Threshold", plus two caption paragraphs and a body note (L/22). Timeline dates are larger than their secondary role (L/09). There is the underlined toggle (TYPE-07). | `hierarchy`, `craft` |
| Hierarchy | **6.6** | Content leads: source list → Table → Inspector, quiet chrome, one blue default per sheet. Top of Competent because secondary chrome competes: <ul><li>Every row carries two accent glyphs, 12 blue marks in a 6-row list (L/02).</li><li>One selected Episode offers four Play affordances: row ▶, toolbar ▶, the 54 pt Inspector ▶, and Return (L/03).</li><li>Sheets add a bordered glass card around the footer and paragraphs explaining the buttons (L/11, L/13).</li><li>A permanent "Up to date" strip sits on every list.</li></ul> | `content-first`, `hierarchy` |
| Spacing & density | **6.6** | One 14 pt gutter, aligned headers and table columns, and Mac-sized controls. Kept in Competent by: <ul><li>Uneven density between peers: All Views rows ~20 pt (L/05), Subscriptions rows 62 pt (L/01).</li><li>The Trash explanation starts at x≈401 vs 408 elsewhere (L/14).</li><li>The Add Podcasts empty state sits ~100 pt off-centre (L/24).</li><li>Short sheets leave 60–80 pt of empty space above a tall footer (L/13, L/23, L/25).</li><li>The editor sheets stack labels over controls, an iOS-form rhythm, instead of a Mac label column (L/16, L/17, L/22).</li></ul> | `craft`, `conventions` |
| Color & contrast | **7.4** | Restrained and meaningful: the accent marks selection and actionable glyphs, red marks errors and the armed Unsubscribe (with text, not colour alone), and greys are measured passes. Dark and IC variants exist, and the dark accent falls back to primary text where it fails. Out of Exemplary because of the 1.7:1 selected Settings tab in Dark (owner-accepted) and row glyphs that change colour by appearance (mismatch 7). | `color-restraint`, `accessibility` |
| Iconography | **6.4** | One SF Symbols family at matching weight, with tooltips and labels on every icon button. Competent: two identical ▶ in one toolbar with different meanings (L/07). "+" means New View/New Playlist in a list whose newcomer reading is "add to this list" (L/02, L/06). The eraser badge means Clear on Played (L/01). Every View uses the same filter glyph as All Views (L/01). | `conventions`, `plain-language` |
| Consistency & polish | **6.4** (stability N/O; partial: no flow run) | Many states are designed: empty, error + Retry, disabled, armed, inactive, multi-selection summary (L/33), IC/RT fallbacks. Competent because of seven inventory mismatches (Close/Done/Dismiss, two rename models, two Unsubscribe confirmations, ellipsis, off-centre empty state, contradictory listening state, glyph colour). Also non-concentric footers: radius 16 inset 12 inside the sheet's ~18 pt corner (PodListSheet.swift:151, MacGlass.swift:45; L/13), and the stale "Show Sidebar" title. | `craft`, `stability` |
| Clarity | **6.7** | State is very legible: Active Playlist speaker, "Current Entry", sync status, filter summary, a Rewind summary that names consequences. Top of Competent, held there by a few things: <ul><li>Over-explanation: "Save applies these settings. Cancel discards changes." (L/11) and the routing paragraph in Add Podcasts (L/24).</li><li>Odd mid-sentence capitals ("Not downloaded on this Device", L/03).</li><li>The sidebar's "Search 15" count beside "1 result" (L/15).</li><li>The developer-ish subtitle "Podcast page" (L/18).</li><li>The ambiguous "+".</li></ul> | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped; uncapped 7.3) | Looks 7.2: native frame, source list, unified toolbar with search, real Settings window, SF and Mac controls. The Adapted/Foreign tells are iOS-style stacked sheet forms and Done/Close/Dismiss footers on windows that have a close button. Behaves 7.4: a deliberate full menu bar, broad shortcuts, named Undo, context menus, drag in and out with undo, restoration, App Intents and Share. Missing: URL scheme, Spotlight, receive-from-browser. (7.2 + 2 × 7.4) ÷ 3 = 7.3, capped at 6.9 by the WIN-05 and SYS-05 majors, both owner-decided. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **4.9** (capped; uncapped ≈ 7.6) | Strong underneath: undo instead of confirmation, multi-step named history, undoable drops, type-select, inline errors with Retry, VoiceOver announcements, 200% text, Return = Play Now. Capped by the KEY-01 blocker: bare Space steals Full Keyboard Access activation in every window. | `keyboard-efficiency`, `forgiveness` |
| **Overall** | **6.3** | The primary task is well served and the app behaves like a considered Mac citizen. Only Typography and Color & contrast reach Strong. The keyboard blocker and the accumulated cross-screen inconsistencies hold it in Competent. Cap: lowest 4.9 + 2.0 = 6.9; holistically 6.3. | `conventions`, `keyboard-efficiency`, `craft` |

## What stands between this build and 9.0

1. **KEY-01 (blocker).** Space must activate the focused control under Full Keyboard Access. This one change lifts the Interaction cap (to ≈ 7.6) and Overall's ceiling.
2. **Platform fit majors.** Spotlight (owner-deferred) and the bottom player bar (owner decision) keep Platform fit at 6.9 while they stand. URL scheme and receive-from-browser (SYS-03, SYS-06) are the cheapest remaining Behaves gains.
3. **One model per message kind.** One word for closing panels. One rename model: a direct Name field in Edit View and Playlist Settings, as in New View. One Unsubscribe confirmation across routes. Matching ellipses. This is most of the Consistency & polish gap.
4. **Quieter chrome.** One Play affordance per scope. Row glyphs that are neutral until hover or selection. Toolbar groups split by scope. Sheet footers without the inset bordered card, or with concentric radii (radius = sheet radius − 12). Remove the button-explaining paragraphs.
5. **Mac form rhythm in editors.** A trailing-aligned label column (`Form` with `.formStyle(.columns)`) for Edit/New View, Subscription Settings and Playlist Settings, with one label style per form.
6. **Run the flows.** Without a flow run, Consistency & polish cannot pass its stability band, and the `revealDrop` search-clearing path (FLOW-03) and the main-window feedback insertion (FLOW-01) stay unverified.

## Next step

- **Target.** KEY-01, a blocker in Interaction & feedback (4.9), the lowest category.
- **Anti-pattern.** *Keyboard afterthought*: the shortcut handler depends on what kind of view has focus, not on the intended command target.
- **Root cause.** Play/Pause is a modifier-less menu key equivalent. `PlaybackKeyboardGuard` exempts only editable text views, so every other focused control loses Space to the menu.
- **Change.** Extend `PlaybackKeyboardGuard.route` (PlaybackCommands.swift:79-90) to return `.text` when the first responder is an `NSControl` other than the episode/entry `NSTableView`/`NSOutlineView`, or when a sheet or the Settings window is key. Keep Space-to-play when focus is in a list, the sidebar or the window background.
- **Principle.** `keyboard-efficiency`, `conventions`.
- **Expected effect.**
  - Interaction & feedback rises from 4.9 to ≈ 7.5 (uncapped).
  - Overall's cap rises to about 8.4, and the holistic score to ≈ 6.8.
  - No visual category changes, and no signature element is touched.
- **Verify.** With FKA on, Tab to Cancel in L/11's sheet and press Space: the sheet should close and playback should not toggle. Repeat for the Volume Boost switch in Settings, and confirm Space in the episode Table still plays or pauses.
