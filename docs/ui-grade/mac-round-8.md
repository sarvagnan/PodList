# PodList Mac — UI grade, round 8

Grader: Claude Opus 5.5, independent; no earlier report was read. Build: `9b842c7` (`apps/apple`). Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, with `core-checklist.md`, `mac-checklist.md`, `platform-fit.md` and `rubric.md`.

Evidence: `~/Documents/podlist-grading/mac-round-8/` (35 states × Light/Dark, 2× window captures with XCUITest accessibility snapshots, `menus.txt`), plus the source in `apps/apple/Sources`. Capture references below are `L/NN` (Light) and `D/NN` (Dark). Points = pixels ÷ 2. Contrast was measured from the PNGs (sampled background mode vs. darkest/lightest glyph pixel, WCAG formula). The app was not launched and no screen-control tools were used.

## Frame

- **Task:** find Episodes (through Views, Subscriptions and Search) and queue and play them through ordered Playlists, with History and a Listening Timeline that can be rewound.
- **Target:** Mac app (SwiftUI, macOS 26+, captured on macOS 27.2).
- **Posture:** sovereign. A main window kept open through the day while listening.
- **Audience:** perpetual intermediate. It is a personal tool, but the domain model (Views, Entries, Cursor, Clear on Played, Rewind) rewards learning.
- **Nearest exemplar:** Things, for its calm personal posture, fixed vocabulary and forgiveness. BBEdit is the reference for the command surface.
- **Character:**
  1. Domain nouns capitalized as proper terms (Episode, Entry, Playlist, View, Device), with plain sentences explaining their consequences.
  2. Monogram artwork tiles (DF / MH / SB) on a pale brand tint.
  3. A full-width glass player bar at the bottom, with three centred lines (title, podcast, seek bar). Owner-fixed.
  4. Episode tables with a two-line title cell and inline accent Play and Add glyphs.
  5. Brand blue as the Multicolor AccentColor only. Owner-fixed.
- **Owner decisions (graded, not targeted):** AccentColor brand blue under Multicolor; transport in a bottom bar; Light/Dark/System Appearance setting; no customizable toolbar; two-click self-disarming Unsubscribe with Undo; Liquid Glass on player bar, Inspector actions, Now Playing and sheet footers; Spotlight deferred; MCP off by default, App Intents on.

## Flows

No flow run is in the evidence. The XCUITest tour captures separate states only, with no per-step measurements file, no timed runs and no screenshot strips. Every check marked F only (FLOW-01 to FLOW-04, RESP-01, RESP-02) is therefore N/O, and the **stability sub-score is N/O**. Consistency & polish is marked "(partial: no flow run)".

Risk noted from code, not scored as a FLOW failure: the main window's feedback rows are inserted above the list without reserved space (`MacWindow.swift:126` and `:138`, `reservesSpace: false`), and success notices expire after 5 s (`EditingNotice.swift:11`). A completion arriving later than 500 ms after the click would push the table down. A flow run should measure this first.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Subscriptions (L/01) | Feedback row under sync line, caption, primary, 5 s | Inline row, red `podListError`, Retry | none | Inline "Undo ‹name›" button in feedback row; Edit menu | "No Subscriptions" + Add Podcasts button | none | Rows open on double-click / chevron; bulk "Edit Download Rules…" top-trailing | "Grouped by Download Rule" caption |
| View table (L/02, L/03) | same row | same | none | same | "No Matching Episodes" + Edit View… / Clear Search | none | Toolbar Play / Add (trailing) + inline row glyphs | View description line (Subheadline, secondary) |
| Playlist Entries (L/06, L/07) | same row | same | none | same | (not captured) | none | Toolbar Play / Add; "Play This Playlist" leading inside the segmented capsule | "Current Entry" accent caption on the cursor row |
| History (L/08) | — | — | none | — | "No History" + 2-sentence explanation, centred | none | none | Explanation in the empty state |
| Listening Timeline (L/09, L/34) | — | — | Rewind preview sheet (Cancel focused, Rewind default) | Sheet says "Rewind can be undone" | (not captured) | none | "Rewind to Here" repeated on every row, trailing | Sheet summary: "Goes back to / Unplayed again / Back in the Playlist / Kept" |
| Trash (L/14) | "Restored Playlist “X”" | same row | Alert "Delete “X” Permanently?" | — | "Trash Is Empty" + one line | none | Restore per row | Description line *and* empty-state line say the same thing |
| Search (L/15) | — | — | none | — | "No Matching Episodes" + Clear Search | none | "Create View…" bordered, top-trailing | "1 result" count; sidebar badge says 15 |
| Podcast page (L/18–L/21) | — | Inline FailureFeedback + Retry | Two-click armed Unsubscribe (red, 4 s) | Undo row | "No Episodes Yet" + Refresh Episodes | none | Subscribed / Share / Copy Feed / gear, row of bordered buttons | "Show Description" underlined toggle |
| New / Edit View sheet (L/16, L/17) | closes sheet | Field-level red caption | none | — | — | none | Save / Create View trailing in glass footer; Delete View leading | "15 matching Episodes" live count |
| Playlist Settings sheet (L/11, L/12) | closes sheet | Field-level red caption | none | — | — | none | Save trailing; Delete Playlist leading; nested "Cancel Rename / Save Name" | 3 help paragraphs, one explaining Save and Cancel |
| Subscription Settings sheet (L/22) | closes sheet | caption | none | "Mark All Played … can be undone" | — | none | Save trailing | Help line explaining Save and Cancel |
| New Playlist / Add to Playlist / Download Rules sheets (L/13, L/23, L/25) | closes sheet | Field-level red caption | none | — | — | none | Create Playlist / Play Next / Apply trailing | One sentence (Download Rules) |
| Add Podcasts window (L/24) | — | inline | none | — | "Find Your Next Podcast", **off-centre** | none | "Search" beside the field; **"Close"** is the blue default in the footer | OPML instruction line, 120+ characters |
| Now Playing window (L/26) | — | — | none | — | — | none | Transport capsule; **"Done"** in the footer | none |
| Getting Started sheet (L/32) | — | — | none | — | — | none | **"Dismiss"** in the footer | Three numbered steps |
| Settings (L/27–L/30) | applies live | red text under the control | none | — | — | none | none (live apply) | Help in 13 pt body (Import) and 11 pt caption (Text Size, Automation) |
| Listening Stats (L/31) | — | — | none | — | "No Listening Yet" + "Play an Episode…" | none | none | none |

**Mismatches**
1. **Closing an auxiliary surface uses three verbs:** "Close" (Add Podcasts, `AddPodcastsWindow.swift:92`), "Done" (Now Playing, `PlayerViews.swift:196`) and "Dismiss" (Getting Started, `LibrarySettingsScreens.swift:262`). Screens: L/24, L/26, L/32.
2. **Success wording varies in word order and punctuation:** "View New this week deleted" (object first, no period, `LibraryEditingModel.swift:218`), "View edits cancelled." (period, `PlaylistEditingModel.swift:54`), "Restored Playlist “X”" (verb first, `PlaylistEditingModel.swift:213`).
3. **Help text has three sizes for the same role:** 13 pt body under Import OPML (L/27), 11 pt caption under Text Size (L/28), and 13 pt plus 11 pt lines together in Automation (L/30). Sheets add a third pattern, a 11 pt paragraph block (L/11, L/22).
4. **Field labels have two sizes and two cases:** "Download Rule on This Device" at caption size vs. "Played Threshold" at body size in the same sheet (L/22); "Podcast name or feed address" in sentence case (L/24) vs. title-case labels elsewhere.
5. **The view title moves:** at 245 pt from the window's leading edge on Views, Subscriptions, Trash and Search, but pushed to 688 pt behind the segmented control on every Playlist screen (L/02 vs L/06). This is also TOOL-01.
6. **Trash repeats itself:** the description line and the empty-state description say the same thing, and the description starts 4 pt left of every other screen's (Trash frame x = 607 vs. 611 on L/02).
7. **Search counts disagree:** the sidebar's Search badge reads 15 while the content says "1 result" for "rice" (L/15).

## Checklist

Coverage: **92.6%** (pass 122 · fail 16 · N/O 11 · N/A 18; 167 IDs, 149 applicable)

### Failures by severity

No blockers.

**Major**

- **[LIST-07] Type-select is missing in most interactive lists.** Interaction & feedback, capped at 6.9. Evidence: the code comment at `ViewListSelection.swift:16` ("SwiftUI hosts custom rows, so supply their names for incremental type selection") and the handler at `MacWindow.swift:301` add type-select to the All Views list only. The Episode tables (`MacWindow.swift:511`, custom `episodeTitle` cell content), Playlist Entries (`PlaylistContentView.swift`), Subscriptions (`MacWindow.swift:361`, custom HStack rows), the Podcast page table (`PodcastScreens.swift:198`) and Trash have no type-select source. These are the lists people use most (L/02, L/06, L/01, L/18). Inferred from code; confirm at runtime. **Fix:** generalize `ViewTypeSelection` into a row-title type-select modifier, apply it to every selectable Table and List (titles for Episodes and Entries, podcast names for Subscriptions, names for Trash), and reuse `scrollAnchor` to reveal the match.
- **[TOOL-01] The view switcher sits in the leading navigation zone and pushes the title right.** Platform fit, capped at 6.9. Evidence: `PlaylistContentView.swift:35` places the Entries / History / Listening Timeline picker with `.navigation`, so on every Playlist screen it leads and the title "Default" starts 688 pt from the window's leading edge instead of 245 pt (L/06–L/10, D/06). The Play This Playlist button shares that capsule. **Fix:** move the segmented picker to `.principal` (centre zone), keep the title leading, and move Play This Playlist into the trailing action group with the other Play button.
- **[WIN-05] Owner decision: transport lives in a bottom bar.** Platform fit, capped at 6.9. The 72 pt player bar (L/01, every library capture) holds play/pause, skip, seek, Speed, Sleep and queue, which is more than "limited status". All its commands are also in Controls with shortcuts, which softens the cost. Not a target.
- **[SYS-05] Owner decision: Spotlight indexing is deferred.** Platform fit, capped at 6.9. No `CSSearchableItem` anywhere in `Sources`. Not a target.

**Minor**

- **[VIEW-02] The sidebar toggle title is wrong.** `menus.txt` shows View › "Show Sidebar" while the library window was focused (the same menu shows "Hide Inspector" and lists the window "New this week (6 Episodes · 6 selected)", state 33) and the sidebar was visible. **Fix:** drive the title from `columns` (`MacWindow.swift:19`) with a custom Show/Hide Sidebar command that replaces `SidebarCommands()`, or make sure the split view's column visibility reaches the responder that `SidebarCommands` validates.
- **[TOOL-03] The Playlist toolbar has four groups, with an action inside a view switcher.** The Play This Playlist triangle is in the segmented capsule (L/07), and segmented + title + trailing actions + More + Search make four groups. **Fix:** the TOOL-01 move resolves it.
- **[PTR-04] One icon-only button has no tooltip.** The Subscription Settings gear on the Podcast page has `.labelStyle(.iconOnly)` and no `.help` (`PodcastScreens.swift:154`, L/18). **Fix:** `.help("Subscription Settings (…)")`.
- **[APPEAR-09] The eraser glyph is a stretch for Clear on Played.** The sidebar uses `eraser.fill` vs. `eraser` to mean on/off (`MacWindow.swift:87`, L/01). The metaphor is a stretch, and filled vs. outline is the only state cue at a glance (the AX label and tooltip do carry it). **Fix:** show the glyph only when Clear on Played is on, so its absence means off. Consider a more literal symbol, such as `checkmark.circle.badge.xmark` or `text.badge.minus`.
- **[APPEAR-11] Feedback rows appear and disappear without reserved space.** In the main window they shift the list (`MacWindow.swift:126`, `:138`; 5 s expiry in `EditingNotice.swift:11`). **Fix:** reserve a 32 pt status row under the sync line on list screens (sheets already pass `reservesSpace: true`).
- **[TYPE-06] Help lines exceed a comfortable measure.** The Add Podcasts instruction line is ≈ 122 characters (L/24), and Settings' import note is ≈ 95 (L/27). **Fix:** cap help paragraphs at about 70 characters (`frame(maxWidth: 520)` at 13 pt) and shorten the Add Podcasts line to its first sentence.
- **[TYPE-07] Underline marks a toggle, not a link.** "Show Description" / "Show Less" use `MacReadableLinkStyle`, which underlines (`PodcastScreens.swift:139`, `MacAppearance.swift`). It also shows when the description is a single line, so toggling changes nothing (L/18 vs L/19). **Fix:** use a borderless disclosure-style button ("More" / "Less") with no underline, shown only when the text is actually truncated.
- **[COPY-01] Closing an auxiliary surface uses three verbs.** Close / Done / Dismiss (mismatch 1). "Add 1 Episode to a Playlist" is completed with "Play Next" / "Play Last" (L/23). **Fix:** use "Done" for every modeless or auxiliary close. Retitle the sheet "Add to Playlist", or label its buttons "Add Next" / "Add Last".
- **[COPY-04] Capitalization varies by element type.** Field labels mix sentence and title case (mismatch 4). Tooltips are title-case command names ("Show or Hide Inspector (⌥⌘I)", "Open Active Playlist") rather than sentence-case fragments. **Fix:** title case for labels, sentence case for tooltips; domain nouns keep their capitals.
- **[SYS-02] No Service is vended.** For example, "Subscribe in PodList" for a selected feed URL, even though the window already accepts URL drops (`LibraryDrops.swift`). **Fix:** an `NSServices` entry that hands the selected text to Add Podcasts.
- **[SYS-03] No URL scheme or deep links to Views, Playlists or Episodes.** No `onOpenURL` / `handlesExternalEvents`. **Fix:** `podlist://view/<id>`, `podlist://playlist/<id>`, and Copy Link for Views and Playlists.
- **[SYS-06] No Share extension or Safari route to subscribe from a podcast's web page.** **Fix:** a Share extension that accepts a URL and opens Add Podcasts with it.

### N/O

FLOW-01, FLOW-02, FLOW-03, FLOW-04, DATA-05, RESP-01, RESP-02, FOOT-02, FOOT-01, WIN-10, SET-04

### N/A

DLG-09 (no popovers), CTRL-02 (no checkbox hierarchies), LIST-05 (no outlines), START-04, START-05 (no permission requests), START-07 (no accounts), MENU-06 (no custom alternates), FILE-02 (no documents), FILE-05 (nothing to print), FMT-01, FMT-02 (no formatted text), DATA-03, DATA-08 (not a document app), SYS-07 (no meaningful Dock state), EXTRA-01 to EXTRA-04 (no menu bar extra)

### Passes

- **Core:** FLOW-05, FLOW-06, FLOW-07; KEY-01, KEY-04, KEY-06, KEY-07, KEY-08; DLG-01, DLG-02, DLG-03, DLG-04, DLG-05, DLG-07; CTRL-03 to CTRL-08; LIST-01, LIST-02, LIST-03, LIST-04, LIST-06; DATA-01, DATA-04, DATA-06; DRAG-01, DRAG-03, DRAG-05, DRAG-06; PTR-03; APPEAR-03, APPEAR-04, APPEAR-05, APPEAR-10; TYPE-02, TYPE-03, TYPE-05, TYPE-08; COPY-02, COPY-03; AX-01, AX-02, AX-04, AX-05; START-01, START-02, START-03, START-06; EDIT-02, EDIT-05; WIN-03; TOOL-06; SIDE-03, SIDE-04; SET-01.
- **Mac:** MENU-01 to MENU-05; APP-01 to APP-04; FILE-01, FILE-03, FILE-04; EDIT-01, EDIT-03, EDIT-04; VIEW-01; WMENU-01 to WMENU-03; HELP-01, HELP-02; KEY-02, KEY-03, KEY-05; TEXT-01, TEXT-02; WIN-01, WIN-02, WIN-04, WIN-06 to WIN-09; TOOL-02, TOOL-04, TOOL-05; SIDE-01, SIDE-02, SIDE-05, SIDE-06; SET-02, SET-03, SET-05, SET-06; DLG-06, DLG-08; CTRL-01; DATA-02, DATA-07; DRAG-02, DRAG-04, DRAG-07; PTR-01, PTR-02, PTR-05; APPEAR-01, APPEAR-02, APPEAR-06, APPEAR-07, APPEAR-08; TYPE-01, TYPE-04; AX-03; SYS-01, SYS-04.

Evidence for passes that a reader might doubt:

- **APPEAR-04.** Custom secondary text (`#606060` / `#A0A0A0`, `MacAppearance.swift`) measures 6.29:1 on white and 5.38:1 on the Inspector's gray in Light, and 6.05:1 and 5.70:1 in Dark. Accent row glyphs measure 6.81:1. White-on-accent sidebar counts measure 6.81:1 (Light) and 6.41:1 (Dark). Increase Contrast variants exist for secondary, brand and error colors. Two system-drawn elements measure low and are recorded here, not charged to the app: AppKit's sidebar section headers ("Views", "Playlists", "Library") at 2.2:1 in both appearances, and the toolbar search placeholder at 4.0:1 (Light) and 3.7:1 (Dark). Both are AppKit's unmodified rendering (`MacWindow.swift:110`, `Text(section.name)`).
- **EDIT-03.** ⌘F goes to "Search Library", an object search, while Edit › Find keeps its standard names. The app has no long editable text where text Find would be expected.
- **KEY-02 and TEXT-01.** ⌘←/⌘→ (skip) and Space (play/pause) would collide with text editing. `PlaybackKeyboardGuard` (`PlaybackCommands.swift`) routes them to the field editor first, honoring the user's key bindings, and ⌘. cancels a sheet before it stops playback.
- **DRAG-02 and DRAG-04.** Same-Playlist drags move, cross-Playlist drags copy, and Option forces copy, evaluated at drop time (`EpisodeTransfer.swift:61`). The private type, URL and text representations are exported in fidelity order.
- **DLG-01.** The only alert is for irreversible "Delete Permanently" (`PlaylistSettingsViews.swift:259`). Rewind uses a preview sheet that states its consequences and that it can be undone (L/34), in the BBEdit preview-before-commit spirit.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.3** | SF at Mac sizes: body 13 pt, two-line title cell with a caption-size readable-secondary podcast name (L/02), and Title 2 bold sheet titles. Weight and secondary color, not size, carry most of the hierarchy. Held out of the upper Strong band by an uncontrolled helper-text scale (11 pt and 13 pt for the same role, mismatch 3); label sizes that differ within one sheet (L/22); Now Playing setting the Episode title in large Regular under a bold, smaller window heading, with the podcast name bolder than the title (L/26); 95–122-character help lines (TYPE-06); and an underlined toggle (TYPE-07). Strong anchor, lower half. | `hierarchy`, `craft` |
| Hierarchy | **6.8** | The list leads, chrome is light, and the Inspector is clearly secondary (L/03). But every Episode row carries two accent glyphs: 12 accent marks on 6 rows compete with the titles (L/02). The Timeline repeats five identical "Rewind to Here" buttons (L/09). The sidebar mixes three "+" action rows into navigation (L/01). On Playlists the view switcher outranks the title (L/06). Transport sits at the bottom edge (owner). Competent: a clear main area with competing secondary marks. | `content-first`, `hierarchy` |
| Spacing & density | **7.0** | One rhythm: 46 pt Episode rows, a 12–16 pt content inset, a grouped Settings form at Mac metrics (L/27), and Mac-sized controls throughout. Below 7.5 because of the Add Podcasts empty state centred 101 pt left of the window's centre (text centre 859 pt vs. window centre 960 pt, L/24 AX frames); the Trash description 4 pt off the shared left edge (x = 607 vs. 611); the Podcast page table rows inset 16 pt inside the header's leading edge (259 vs. 243 pt), which wraps titles in a narrow Episode column (L/18); and tall stacked-label sheets that scroll (L/16, L/22). | `craft`, `conventions` |
| Color & contrast | **7.6** | Follows the system accent (brand only under Multicolor), readable custom secondary color with Light, Dark and Increase Contrast variants, glass with an opaque fallback under Reduce Transparency and Increase Contrast (`MacGlass.swift`), and measured text at 5.4–6.8:1 everywhere the app owns the color. Color has meaning: accent for the current Entry and the Active Playlist, red only for errors and the armed Unsubscribe (L/20). Short of Exemplary because the inline accent glyphs on every row make accent partly decorative (L/02), and Light and Dark disagree on them (blue in Light, white in Dark, D/03). | `color-restraint`, `accessibility` |
| Iconography | **7.2** | One SF Symbols family at text weight, standard meanings (trash, share, gear, info, `sidebar.right`), tooltips and AX labels on almost every icon-only control. Held down by the eraser on/off metaphor (APPEAR-09), the gear with no tooltip (PTR-04), and `text.badge.plus` repeated on every row, where it reads as decoration more than recognition. | `conventions`, `plain-language` |
| Consistency & polish | **6.6** (stability N/O) *(partial: no flow run)* | States are designed: empty, loading, error with Retry, armed and disarmed Unsubscribe, focus rings, live counts, and clean Dark Mode (D/03, D/06). But the inventory has seven mismatches: three close verbs, success-wording drift, three helper sizes, title position, Trash duplication, search counts, and label sizes and cases. Rename is a nested Rename… → field → "Cancel Rename / Save Name" mode inside a sheet that has its own Cancel / Save (L/11, L/12), while New View edits the name directly (L/17). The Automation pane uses a plain layout where General uses a grouped form (L/30 vs L/27). Competent: the main path is polished, but the edges were finished one at a time. | `craft`, `stability` |
| Clarity | **6.9** | The vocabulary is precise and explained (Current Entry, Clear on Played, the Rewind summary's "Goes back to / Unplayed again / Kept", L/34). State is visible: Active Playlist, sync "Up to date", counts, "6 selected". Held at the top of Competent by: Search's sidebar badge 15 vs. "1 result" (L/15); a "Show Description" that reveals nothing (L/19); a "Podcast page" subtitle that adds nothing; sheets that explain their own buttons ("Save applies these settings. Cancel discards changes.", `PlaylistSettingsViews.swift:182`, L/11, L/22); "Add … to a Playlist" completed by "Play Next / Play Last" (L/23); "In the Last Days" plus "Last Days" (L/16); "MCP" without a gloss (L/30); and Settings › Library holding navigation buttons (Listening Stats, Getting Started) that are not settings (L/27). | `plain-language`, `discoverable-commands` |
| Platform fit | **6.9** (capped; uncapped (7.8 + 2 × 8.0) ÷ 3 = 7.9) | **Looks 7.8:** native frame and unified toolbar, source-list sidebar with accent symbols, Settings window with toolbar panes and live apply, native tables, sheets and menus. Adapted: stacked-label sheets, glass sheet footers, sidebar action rows. Foreign-leaning: a full transport bar on the bottom edge, and the view switcher in the navigation zone. **Behaves 8.0:** a menu bar with every command (Podcast, Views, Episode, Playlist and Controls menus; dynamic "Undo ‹name›"), standard shortcuts preserved and text-safe, a ⌥⇧⌘ reference in Help, context menus that target the clicked row, Option-copy drag and drop, multi-window with SceneStorage restoration, App Intents with App Shortcuts. Missing: type-select, Spotlight (owner), URL scheme, Services, Share extension, and a wrong Show/Hide Sidebar title. Capped at 6.9 by TOOL-01, WIN-05 and SYS-05. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **6.9** (capped; uncapped ≈ 8.0) *(no timed runs)* | Keyboard-fluent (⌘ shortcuts for every frequent Episode action, Space, ⌘←/→, ⌥⌘↑/↓ to reorder), forgiving (named multi-step Undo; Trash for 30 days; Rewind is undoable; Unsubscribe can be undone), direct (drag to Playlists, drops undoable, progress and retry for slow drops), modeless Inspector, and text size up to 200% with the table reflowing to a list (`MacWindow.swift:500`). Capped at 6.9 by LIST-07 (type-select only in All Views). Responsiveness is unmeasured (RESP N/O). | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **7.0** | It serves the primary task well and behaves like a Mac app in almost every reachable corner: the menu bar, Undo, drag and drop, restoration and appearance handling are better than most SwiftUI Mac apps. What holds it at the bottom of Strong is finish rather than function: the lowest category, Consistency & polish at 6.6 (cap 8.6, not binding), plus two capped behavioral categories and a hierarchy diluted by repeated row actions. The weakness holding Overall down most is cross-screen inconsistency in small things: verbs, help-text size, title placement and rename models. | `craft`, `conventions` |

## What stands between this build and 9.0

1. **Lift the caps.**
   - Platform fit: fix TOOL-01. WIN-05 and SYS-05 stay as owner decisions, so Platform fit stays capped at 6.9 until Spotlight ships and the transport question is revisited. With those two kept, 9.0 Overall is out of reach. The realistic ceiling is about 8.0–8.5.
   - Interaction & feedback: fix LIST-07.
2. **Close the inventory.**
   - One close verb.
   - One success grammar (verb first, no period, e.g. "Deleted View “X”").
   - One helper style (11 pt secondary, at most 70 characters per line).
   - One rename model: an editable Name field in every settings sheet, committed with the sheet's Save.
   - The title always leading.
3. **Quiet the rows.**
   - Show the inline Play and Add glyphs on hover, selection and keyboard focus only, as Things does. Toolbar, menu, context menu and Return already carry the actions.
   - Collapse the Timeline's repeated "Rewind to Here" into a single toolbar or context command for the selected event.
4. **Fix the small truths.**
   - The Search badge count.
   - "Show Description" appearing only when the text is truncated.
   - Add Podcasts' centred empty state.
   - Sheets that explain their own buttons (delete those sentences).
   - Sidebar toggle title.
5. **Run the flows.** Script FLOW-01 to FLOW-04 and RESP-01 with XCUITest at 760 × 500, half-screen and 1180 × 760, in Light and Dark. Give the main-window feedback row reserved space first.

## Next step

- **Target:** LIST-07, a major in Interaction & feedback (6.9, tied lowest among capped categories with a major), the one closest to the primary task. TOOL-01 is next. WIN-05 and SYS-05 are skipped as owner decisions.
- **Anti-pattern:** *Keyboard afterthought* (anti-patterns § 3).
- **Root cause:** SwiftUI's custom row content gives AppKit's table no string to match. The app patched this for one list (`ViewTypeSelection`) instead of for its row model, so every other selectable list falls back to arrow-only navigation.
- **Change:** extract `ViewTypeSelection` into a generic `RowTypeSelection<ID>` that takes `[(id, title)]`. Attach it with `.onKeyPress(characters:)` (Command and Control excluded, text fields untouched) to the Episode Table and its 200% List, the Playlist Entries table, the Subscriptions list, the Podcast page table and Trash. Each sets `window.selection` and `scrollAnchor` to the first title-prefix match, cycling on repeated letters as the Views list already does. Add a unit test per list, and an XCUITest step: type "jo" in New this week → "Joinery without screws" is selected.
- **Principle:** `keyboard-efficiency`.
- **Expected effect:** LIST-07 passes, lifting the Interaction & feedback cap. That category moves from 6.9 to about 7.8, and Overall gains about 0.2–0.3. No signature element is touched. No category should regress, because the handler ignores modified keys and text fields keep focus.
