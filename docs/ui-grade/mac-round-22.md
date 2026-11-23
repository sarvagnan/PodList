# PodList Mac — UI grade, round 22 (Opus)

Build: `apps/apple` at `2e8917f`. Evidence: `podlist-grading/mac-round-22/` (XCUITest tour, Light and Dark, Show Borders pass, `timings.txt`, `menus.txt`, guest diagnostics) plus the code. The app was not launched and no screen-control tools were used. Capture references below are `L/NN` (Light), `D/NN` (Dark) and `BL/NN` (borders-light). All sizes are points: 2× pixels ÷ 2.

## Frame

- **Task:** Find Episodes across Subscriptions and saved Views, line them up in Playlists, and play them from a persistent player.
- **Target:** Mac app (SwiftUI, macOS 26+).
- **Era:** captured on macOS 27.2 (26B123) in a VM. Built with the macOS 26.0 SDK (minos 26.0) and no `UIDesignRequiresCompatibility` key, so it is a **current build**. Light and Dark were set with the app's own Appearance setting. Reduce Transparency and Increase Contrast were off; how the code handles them is graded below. Show Borders was on only for the `borders-*` pass.
- **Posture:** sovereign. It's an all-day library and player, often left open.
- **Audience:** perpetual intermediate, with keyboard depth for experts.
- **Nearest exemplar:** Things, for a calm personal tool with a disciplined object model. BBEdit is the reference for menu completeness.
- **Character** (owner-fixed items marked †):
  1. A source-list sidebar split into Views / Playlists / Library, with in-list command rows ("New View…", "New Playlist…", "Add Podcasts…").
  2. A floating Liquid Glass player bar across the window's bottom† (transport, scrubber, Speed and Sleep, active Playlist).
  3. Two-line Episode rows (title over podcast) with row Play and Add buttons, plus an Inspector that has a big monogram artwork tile and a glass action cluster.
  4. A status row at the top of every list. It says "Up to date" at rest, then turns into the named edit with Undo/Redo/Show Restored Entries.
  5. A plain-spoken, consequence-first voice ("Your edits below come back when you do."), with title-case domain nouns (Episode, Entry, Playlist, Position).
- **Owner decisions recorded** (graded, not targeted):
  - The brand AccentColor applies only under Multicolor.
  - In-app Appearance offers Light, Dark and System.
  - Glass is used on the player bar, Inspector actions, Now Playing and scrolling-sheet footers.
  - The bottom player bar; a non-customizable toolbar; one Playlist toolbar group.
  - Two panes below about 950 pt, and the Inspector follows selection in wide windows.
  - Saved Views naming; two-click Unsubscribe on the Podcast page.
  - Undo of a deleted View or empty Playlist doesn't navigate to it.
  - Undo/Redo in the status row is scoped to the current screen.
  - Mark All Played is not in Subscription Settings.
  - Deleted-Playlist Settings stays open (11a).
  - "Rewind to Here…" appears only on the selected row.
  - Sidebar navigation and New Playlist latency are an accepted RESP-01 miss.
  - Dark Settings selected-tab label in the deep accent.
  - MCP is off by default.

## Flows

- **Tasks run** (by the tour, `UITour/PodListUITour.swift`):
  - browse a View → select an Episode → Inspector;
  - Playlist Entries / History / Listening Timeline → Rewind;
  - New and Rename Playlist, Delete Playlist → Trash → Restore;
  - Search ("rice");
  - New and Edit View;
  - Podcast page → arm, then disarm Unsubscribe → Subscription Settings;
  - Add to a Playlist; Add Podcasts; Now Playing; Settings; Listening Stats; Getting Started; multi-selection;
  - a **delayed Undo of an Entry removal while typing in toolbar Search (44)**.
- **Widths:**
  - default (1180×760);
  - minimum (760×552; 35, 36, 43);
  - half display (960×1080; 37–39);
  - plus a 30-View / 30-Playlist sidebar (40–42).
- **Appearances:** Light and Dark, plus Show Borders Light and Dark.
- **Timed runs:** 5 samples per step in each appearance. The VM was a VirtualMac2,1 (4 CPU, 8 GB) on a loaded host. Timing runs from the input event to the first presented frame (`light/timings.txt`, `dark/timings.txt`).
- **Measurements:** there is no per-step element-box measurements file. Stability is judged from:
  - the tour's own assertions: pane layout, retained search value, Inspector width (`assertLibraryPanes`, `assertSearchValue`);
  - before/after capture pairs.

  So the stability sub-score is partial.

**Failures**

[RESP-01] p75 against the 200 ms limit:

| Step | Light | Dark |
|---|---|---|
| Select Episode → Inspector, pane opens | **917 ms** | **879 ms** |
| Select Episode → Inspector, pane already open | **869 ms** | **527 ms** |
| ⌘, → Settings | **929 ms** | **424 ms** |
| Final keystroke of "rice" → filtered list | **227 ms** | 159 ms |
| Sidebar → View *(owner-accepted)* | 1208 ms | 887 ms |
| ⇧⌘N → New Playlist *(owner-accepted)* | 1348 ms | 996 ms |

- In the Inspector step, "input → selection handled" alone is 145–242 ms at p75, so even the row highlight is unlikely to land inside 200 ms.
- The timings-only A/B runs (`ab-137`) put the Inspector at 408–615 ms and Settings at 374 ms. Both are still over the limit, so the miss isn't just VM load.

**No FLOW failures found.**

- **44 vs 10/39:** the delayed Undo completed while "Inflation" was in the Search field. The typed value was kept (`library.search` value="Inflation"), the selection was kept, and the follow-up offered **Show Restored Entries** instead of navigating.
- **Status row:** "Undone: Remove from Playlist" and its buttons sat in the existing 32 pt status row. The column header stays at y=165 px in both 06 and 44 (`reservesSpace: true`, `EpisodeEditingViews.swift:258`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View Episode list (02/03) | Status row, top-leading caption: "Undone: …", "Playlist X moved to Trash"; secondary gray | Status row: inline red text + "Retry" (`FailureFeedback`); `exclamationmark.icloud` for sync | none | Status row, trailing bordered button "Undo/Redo <edit>"; Edit menu names the edit | Centered `ContentUnavailableView` "No Matching Episodes" + "Edit View…" | none | Toolbar Play (trailing group) / row Play | View summary line under the status row ("Published in the last 7 days · Unplayed · …") |
| Playlist Entries (06/10/44) | Same status row | Same; drop placeholders with Retry/Remove | Rewind confirmation sheet (34) | Same, plus "Show Restored Entries" (44) | "No Entries" + "Find Episodes" | none | Toolbar Play This Playlist | none |
| Listening Timeline (09/34a) | Same | Same | Rewind sheet | Same | "No Listening Timeline" + 30-day explanation, no button | none | "Rewind to Here…" on the selected row (34a) | none |
| Podcast page (18–21) | Same | Same; feed errors inline | Unsubscribe arm: the button turns red, "Unsubscribe" (20) | Same | "No Episodes Yet" / "No Matching Episodes" + Clear Search | none | Subscribe/Subscribed button | Description with "Show Description" |
| Search (15/36) | Same | Same | none | Same | "No Matching Episodes" | none | "Create View…" trailing in the header | "15 results" |
| Sheets: New Playlist, Edit/New View, Subscription Settings, Add to a Playlist (13, 16, 17, 22, 23) | Sheet closes, then status row | Red caption under the field (validation, no Retry) | none | Status row after close | n/a | Deleted-Playlist note in Playlist Settings (11a) | Default button trailing bottom (Save / Create / Add) | Caption under the controls (22, 23) |
| Settings (27–30) | Live apply, no message | Inline red with Retry | none | Edit › Undo "Speed", "Skip Intro" … | n/a | none | n/a | Captions under the controls |
| Add Podcasts (24) | Subscribe in results | Inline under the field | none | Status row in the Library | "Find Your Next Podcast" with an example URL | none | Search (trailing the field) | OPML hint under the field |
| Now Playing / Stats (26/31) | n/a | Inline red + Retry (player) | none | n/a | "No Current Entry" + Open Active Playlist; "No Listening Time Yet" + Open Active Playlist | none | Transport | none |

**Mismatches** (all minor):

1. **Label capitalization.** Form labels mix case for the same element type.
   - "Skip intro", "Skip outro", "Played threshold", "Server address", "Last days", "Downloads on this Mac" are sentence case.
   - "Volume Boost", "Text Size", "Keep in Trash", "Clear on Played", "In a Playlist" are title case.
   - The mix shows in Settings (L/27, D/28) and Subscription Settings (L/22); the heading over the first of these reads "On This Mac". This is COPY-04.
2. **Playlist section picker.** In wide windows it's a glass pill in the toolbar (L/06). At half width it becomes an accent-filled segmented control at the top of the content (L/39). The move across widths is allowed; the restyle (accent fill vs neutral pill) is a mismatch for one control.
3. **Accessible names for the same command differ by screen.** Lists use "Play Now: <title>", the Podcast page "Play <title> now", and the Inspector "Play Now: <title>, not playing" (`L/03.txt`, `L/18.txt`).
4. **Validation errors** are red captions without Retry, while every other error carries Retry. That's defensible (fix the field), but it's two error forms.

Undo, success and error otherwise share one place: the status row. That's the app's strongest consistency trait.

## Checklist

**Coverage: 96.7%** (pass 141 · fail 4 · N/O 5 · N/A 19 of 169 IDs)

### Failures by severity

**Blocker:** none.

**Major**

- **[RESP-01] Every action answers in time** (caps Interaction & feedback at 6.9).
  - **Measured:** see the table in Flows. Selecting an Episode with the Inspector opening takes 917/879 ms (L/D), and 869/527 ms with the Inspector already open. ⌘, → Settings takes 929/424 ms. The last Search keystroke → filtered list takes 227 ms in Light.
  - **Where the time goes:**
    - The phase split shows 681–761 ms between "Inspector shell body evaluated" and the first frame when the pane opens. That's split-view column insertion and layout.
    - "Input → selection handled" takes 145–242 ms.
    - No busy indicator shows inside 1 s, apart from the deferred "Preparing Show Notes" spinner.
    - Sidebar navigation and New Playlist are recorded but owner-accepted.
  - **Fix:**
    - Make the row selection and the Inspector title the first frame. Render a fixed-size Inspector header from the row model the list already holds. Defer artwork, memberships and notes, which `deferDetails` already partly does, but only after that frame is presented.
    - Keep the Inspector column mounted when hidden (zero-width / collapsed) instead of inserting it, so opening it doesn't re-lay the whole `NavigationSplitView`.
    - For Settings, build the General pane's heavy rows lazily: Library actions, Server Connection, Bring Over.
- **[KEY-04] A newly opened input task focuses the expected field.**
  - **What happens:** Edit › Search Library (⌘F) only navigates to the Search destination: `openLibrarySearch()` → `navigate(to: .search)` (`LibraryModel.swift:561-563`). Nothing moves focus into the toolbar search field. Its `@FocusState` is set only after Clear (`MacWindow.swift:1083-1086`).
  - **Tour evidence:** the tour asserts the field's label after ⌘F but then *clicks* the field before typing (`PodListUITour.swift:1446-1457`, `focusListSearch`). There is also no route to scoped "This list" search except clicking or tabbing to it.
  - **Fix:** in `openLibrarySearch()` (and for ⌘F on any destination), set the toolbar field's focus after navigation, and select its existing text. Let ⌘F on a list that already has scoped search focus that field rather than leaving for Library Search; keep Library Search on ⌥⌘F or a second ⌘F.
- **[APPEAR-04] Contrast: system-drawn accent text below the floor** (caps Color & contrast at 6.9).
  - **Measured:** in Dark Settings (D/27–D/30), the selected pane label "General" is drawn by macOS in the deep accent `#3652D0`. Rendered, it measures about **#435FDD on #484747 = 1.73:1**, below the 2.5:1 Dark floor in the reference table, so the severity is major.
  - **Light passes:** #2146BE on #FDFDFD = 7.69:1.
  - **Status:** this is an owner decision (the deep Dark accent keeps white-on-selection readable). It's recorded and it caps, but it isn't the next target.
  - **Fix, if the owner revisits:** split the roles. Keep `#3652D0` only as the selection fill, and give the Dark AccentColor a lighter value for text-on-surface uses. `python3 -I tools/contrast.py --roles 2B50C8 --dark 1E1E1E` derives both. Or accept that the system uses one accent for both, and record the limit.

**Minor**

- **[COPY-04] Capitalization by element type.** Form labels mix sentence and title case on the same screens: "Skip intro"/"Skip outro"/"Played threshold" next to "Volume Boost"/"Speed" (L/22, L/27); "Server address" next to "Text Size" (D/28). **Fix:** pick title case for form labels, to match the menus and the existing "Volume Boost"/"Keep in Trash". The changes are "Skip Intro", "Skip Outro", "Played Threshold", "Server Address", "Last Days", "Downloads on This Mac", and "Minimum Length"/"Maximum Length (optional)". The Undo names already say "Skip Intro".

### N/O

RESP-02, FOOT-01, FOOT-02, WIN-10, APPEAR-11.

**FOOT-02 note.** Guest diagnostics record two main-thread stalls of 5.0 s and 5.5 s:
- Opening the Window menu (Dark, `xcodebuild.log` t=1594→1600 and 1619→1625). The stack is in AppKit's `_NSWindowMenuAddDefaultSidecarItems` / window-tab menu code.
- The first ⌘O Open panel (Light, t=21.5→32.8).

Both sit in system code on a cold, loaded VM, so I don't attribute them to the app, but they deserve a re-check on hardware. No scroll-hitch measurement exists.

### N/A

- FILE-02 (no recent documents)
- FILE-05 (no printing)
- FMT-01, FMT-02 (no formatted text)
- DATA-02, DATA-03, DATA-08 (not a document app)
- MENU-06 (no custom alternates)
- DLG-09 (no popovers)
- CTRL-02 (no checkbox hierarchy)
- COPY-05 (no generated content)
- START-04, START-05 (no permission requests)
- START-07 (no accounts)
- EXTRA-01–04 (no menu bar extra)
- SYS-07 (no meaningful Dock state)

### Passes, with the evidence that settles them

**Flow stability** (partial: tour assertions plus capture pairs)

- **FLOW-01:** the status row reserves its height. Column headers sit at the same y in 06/10/44 and 13/39.
- **FLOW-02:** a late Undo announced via `NSAccessibility.post(.announcementRequested)` without taking focus (`FeedbackAnnouncements.swift:10-16`); Search keeps its caret (44).
- **FLOW-03:** 44.
- **FLOW-04:** Undo/Show Restored Entries sit at the top of the content at every width, above the list and clear of the player bar (36, 39, 44).
- **FLOW-05:** the list and the Inspector share their top edge (03, 37).
- **FLOW-06:** "In Your Playlists" shows "No Playlists" when it's empty (`EpisodeInspector.swift:225-227`).
- **FLOW-07:** every sheet has its default button trailing at the bottom (13, 16, 17, 22, 23, 11a).

**Keyboard**

- **KEY-01 (C):** every control is a native or labelled Button; type-select, Return and ⌘A go through `MacRowScroll.swift:141-174`.
- **KEY-06:** SwiftUI `.automatic` shortcut localization.
- **KEY-07:** native `NSTableView` paging. Space as Play/Pause is a documented task key, gated to tables and the window (`PlaybackCommands.swift:72-76`).
- **KEY-08:** Help window shortcut grid (`ConnectionViews.swift:91-134`).
- **KEY-02:**
  - ⌘N New View… and ⌘O Import OPML… are reasonable mappings.
  - ⌘. Stop is the cancel family.
  - ⌘L Now Playing and ⌘←/→ skip mirror Music.
- **KEY-03:** Control is used only in ⌃⌘S.
- **KEY-05:** the menus are native.

**Menus**

- **MENU-01:** App · File · Edit · View · Podcast · Saved Views · Episode · Playlist · Controls · Window · Help (`menus.txt`).
- **MENU-02:** every context-menu, toolbar, Inspector and player command has a menu-bar item. Retry Sync is covered by Edit › Retry Failed Operation through `FocusedRetry`; Show Cancelled Import Results by File › Show Import Results.
- **MENU-03:** dimmed items stay visible; Play/Pause and Star/Unstar are action titles; Hide Sidebar and Hide Inspector are state titles.
- **MENU-04, MENU-05:** title-case verbs with ellipses; one submenu level.
- **APP-01–04, FILE-01, FILE-03, FILE-04:** pass.
- **EDIT-01:** "Undo Restore Playlist" / "Redo Edit View" in `menus.txt`.
- **EDIT-02–05:** pass. Copy writes text + `public.url` (`SelectionCommands.swift:187-217`). Spelling, Substitutions, Transformations, Speech, Dictation and Emoji are present. Search Library ⌘F precedes the standard Find ⌘F; I note the duplicate, it isn't a failure.
- **VIEW-01, VIEW-02:** pass.
- **WMENU-01–03:** pass.
- **HELP-01, HELP-02:** the real "PodList Help" window and Getting Started; the system Help search field is present.

**Text**

- **TEXT-01, TEXT-02:** native fields.

**Windows**

- **WIN-01:** pass.
- **WIN-02:** sheet-parent captures show gray traffic lights and an unemphasized selection (11a, 13, 23); the Dark sidebar selection is gray while the list has focus (D/34a).
- **WIN-03:** pass at 760×552 and 960×1080.
- **WIN-04:** pass.
- **WIN-05 (playback-bar clause):**
  - The bar holds only playback controls and now-playing information.
  - Every control is in Controls or Episode.
  - Playback errors also appear in Now Playing, are announced, and offer Controls › Retry Playback.
  - The last row scrolls clear through `contentMargins(.bottom)` (`PlayerViews.swift:17-19`, `MacWindow.swift:320`; D/41).
- **WIN-06–09:** pass.

**Toolbars**

- **TOOL-01–06:** pass. The toolbar can't be hidden, and every toolbar action has a menu item and shortcut.

**Sidebars**

- **SIDE-01–06:** pass.
  - SIDE-03: ⌃⌘S, a toolbar button and the View menu.
  - SIDE-04: the selection is highlighted for every sidebar destination. All Views (05) and the deleted Playlist behind its sheet (11a) have no sidebar row to highlight. That's the Finder precedent for off-sidebar destinations, and 11a is an owner decision.
  - SIDE-06: the sidebar keeps the macOS sidebar metrics (`MacWindow.swift:317-318`).

**Settings**

- **SET-01–06:** pass.
  - It's a real Settings scene with General and Automation panes.
  - Appearance defaults to System.
  - The window sizes to each pane (L/30 is short).
  - Minimize and zoom are dimmed.
  - Changes apply live, and the last pane is restored through AppStorage.

**Dialogs**

- **DLG-01–08:** pass.
  - The only alerts are an invalid link and Delete Permanently, which is destructive with Cancel.
  - Sheets map Esc and ⌘. to Cancel (`PlaybackCommands.swift:122,154-160`).
  - Add Podcasts is a `UtilityWindow` panel.

**Controls**

- **CTRL-01, CTRL-03–08:** pass.
  - Fields have labels, with "(optional)" marked.
  - Search shows its scope ("This list" / "Library" / "Episodes").
  - Downloads are determinate and cancellable.
  - OPML import is determinate and cancellable.

**Lists**

- **LIST-01–07:** pass.
  - Columns can be sorted and resized.
  - Sidebar section collapse persists in SceneStorage.
  - Type-select and Return go through `MacRowScroll.swift`.

**Data**

- **DATA-01, DATA-04–07:** pass.
  - The session-wide named history covers star, played, moves, removal, Playlist delete and restore, View edit and delete, Subscribe/Unsubscribe and settings.
  - Restored entries are selected and scrolled to, or offered (44).
  - `WindowContext` in SceneStorage restores destination, selection, scroll anchor, panes, widths and collapsed sections.
  - Export uses `NSSavePanel` named "PodList.opml".

**Drag and drop**

- **DRAG-01–07:** pass.
  - Transferable order is private JSON → URL → text.
  - A same-Playlist drop moves and anything else copies.
  - Drops are one undo step, with placeholder rows and Retry/Remove.

**Pointer**

- **PTR-01–05:** pass.
  - Context menus exist on every object and carry no shortcuts.
  - `contextMenu(forSelectionType:)` targets the clicked row.
  - Tooltips are sentence-case fragments ("Play now", "Clear search").

**Appearance**

- **APPEAR-01–03:** pass.
  - Reduce Transparency and Increase Contrast give opaque glass with a 1 pt border, plus high-contrast palettes (`MacGlass.swift:27-33`, `MacAppearance.swift:154-173`).
  - Show Borders draws edges on custom buttons (BL/03).
  - Speed and Sleep menus show no edge.
- **APPEAR-05:** there is no custom motion to reduce.
- **APPEAR-06–08:** pass.
  - Glass is `.regular` only and never stacked.
  - Glass sits on controls only.
  - The toolbar is native and the sidebar runs edge to edge on 27.
  - Text in the player bar holds over scrolled rows: black on #FBFBFB and white on #454443 (L/36, D/36).
- **APPEAR-09, APPEAR-10:** pass.

**Typography**

- **TYPE-01–08:** pass.
  - SF at 13 pt body.
  - Text Size runs 100–200% (`MacTextSize.swift`).
  - Show Notes use 13 pt condensed with +3 pt leading, about 42–48 characters per line at the default Inspector width, which is borderline for TYPE-06.
  - Punctuation is curly, with "…", "−" and "—".

**Copy**

- **COPY-01–03:** pass. Every error message names a recovery (`FailureMessages.swift`).

**Accessibility**

- **AX-01:** every control in the snapshots of all 46 states has a name. Popups, fields, the slider ("Position"), toolbar and row buttons, and the Settings controls are all named. One stepper label is duplicated: "Last days, Last days" (L/16).
- **AX-02:** the played and in-progress glyphs carry labels and values.
- **AX-03:** pass.
- **AX-04:** "Rewind to Here…" is an accessibility action, and drags have menu equivalents.
- **AX-05:** playback is never auto-started without controls.

**Launch**

- **START-01–03, START-06:** pass.
  - The Welcome screen starts locally or against a server, with no account.
  - Getting Started can be skipped, stays dismissed, and is reachable from Help and Settings.

**System integration**

- **SYS-01–06:** pass.
  - App Intents with phrases and undoable intents.
  - Spotlight for Episodes, Subscriptions and Playlists.
  - `podlist://` links.
  - The Add to PodList Service.
  - ShareLink and a share extension.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.6** | **Strong.** The style set is small and role-mapped. Toolbar title Headline over a secondary count ("New this week / 6 Episodes · 1 selected"); 13 pt row titles over secondary podcast names in 47.5 pt two-line rows; Inspector title in Title 2 bold, then headline sections ("In Your Playlists", "Show Notes"); tabular figures in Length and Position. Out of Exemplary because Library-window Show Notes switch to a condensed width (`EpisodeInspector.swift:48,264`) that the Podcast preview doesn't use; Timeline rows set the date at body size, as loud as the bold title (D/34a); "Maximum length (optional)" wraps to two lines in the View editor (L/16, L/17). | hierarchy, craft |
| Hierarchy | **7.3** | List-first and left-to-right: source list → items → Inspector. One un-tinted Play leads the toolbar group. Pulled down because the ~180 pt brand-tinted monogram tile is the strongest shape in the Inspector, stronger than the Episode title (L/03, D/43); the "Up to date" status row permanently occupies the top of every list; the 92 pt player bar spans the full width, under the sidebar too; the Search header block ("15 results" + Create View…) puts about 95 pt between the status row and the column header at minimum size (L/36). | content-first, hierarchy |
| Spacing & density | **7.2** | One rhythm: two-line Episode rows at 47.5 pt (AX frames), one shared leading edge across the status row, View summary, column header and rows, right-aligned form labels in sheets. Mac-sized controls (TYPE-04 pass). But single-line rows in All Views are 60 pt apart (L/05) and Subscriptions rows 62 pt with 44 pt tiles (L/40), against 32 pt sidebar rows: iPad-ish air in the secondary lists. The minimum window leaves about 93 pt between the status row and the table header, mostly empty (L/36). | craft, conventions |
| Color & contrast | **6.9** (capped by APPEAR-04 major; merit ≈ 7.8) | Mostly system semantic colors. The accent is used for selection, sidebar symbols and "Current Entry". Brand color stays in content (monogram placeholders). Red is reserved for errors and the armed Unsubscribe. Measured: secondary #606060 on white is 6.29:1; Dark #A0A0A0 on #262626 is 5.79:1; white on the Dark selection #1C35A6 is 9.96:1; Light "Current Entry" #2B50C8 on white is 6.81:1. The cap comes from the Dark Settings selected tab at 1.73:1 (owner-accepted). | color-restraint, accessibility |
| Iconography | **7.4** | Consistent SF Symbols at text weight. Every icon-only control has a tooltip and an AX name. Standard glyphs: share, download, star, checkmark, gear, refresh. Detractors: accent-colored iOS disclosure chevrons on Subscriptions rows (L/40) are a navigation-link idiom, not a Mac list idiom; each row repeats both an Add glyph and a Play glyph (L/02), which adds noise down a long list; the same `slider.horizontal.3` stands for both Edit View… and Playlist Settings…. | conventions, craft |
| Consistency & polish | **7.4** (stability **7.8**, partial: tour assertions and capture pairs, no measurements file; Light = Dark) | States are designed throughout: empty with a next step, error with Retry, a deleted Playlist under its own sheet (11a), restored-while-searching (44), a disarmed Unsubscribe (21), the min and half widths (35–39), and a 30-item sidebar (40–42). Held back by the minor inventory mismatches (label case, picker restyle, AX name wording); Now Playing showing a scroller and a smeared glass edge at its bottom (L/26); Speed and Sleep getting no Show Borders edge beside bordered neighbours (BL/03). Stability: core elements held in every pair checked, and typed text and selection survived a late completion. It isn't Exemplary because the evidence lacks per-step measurements and the four mismatches remain. | craft, stability |
| Clarity | **7.6** | Specific verbs ("Add 1 Episode to a Playlist", "Restore Playlist", "Show Restored Entries"). Visible state: the speaker glyph marks the active Playlist, "Current Entry", the subtitle "In the Trash · 3 Entries", the search scope caption. Captions explain the domain model at the point of use (Clear on Played, Add places the Episodes at the end). Held back by COPY-04 and by vocabulary that needs those captions: View, Entry, Listening Timeline, Rewind, Clear on Played. | plain-language, feedback |
| Platform fit | **7.9** = (Looks 7.6 + 2 × Behaves 8.0) ÷ 3 | **Looks:** native unified toolbar, edge-to-edge sidebar, sheets, a Settings window with panes; glass player bar (Adapted, like Music on 27). Foreign tells: iOS chevrons in Subscriptions; command rows living inside the source list ("New View…", "Add Podcasts…"); airy secondary lists. **Behaves:** a complete menu bar (every command, 11 menus, dynamic Undo names); context menus on every object targeting the clicked row; restoration; multiple windows and Open in New Window; drag in, out and between; App Intents, Spotlight, URL scheme, Services, share extension. Held back by no AppleScript dictionary, no Dock menu for transport, and a non-customizable toolbar (owner decision). No Platform-fit-group failures. | conventions, discoverable-commands |
| Interaction & feedback | **6.6** (capped by RESP-01 and KEY-04 majors) | Forgiving: named, session-wide Undo for nearly every edit; Trash for Playlists; two-click Unsubscribe; drops as one Undo step. Keyboard-rich: per-command shortcuts, type-select, Return to play, Space play/pause, ⌘. to cancel in sheets. But selecting an Episode takes about 0.9 s to a visible Inspector and Settings about 0.4–0.9 s, with nothing visible earlier, against 200 ms. ⌘F lands on the Search page without putting the caret in the field. | feedback, keyboard-efficiency |
| **Overall** | **7.3** | It serves the primary task well: find, queue and play, with an unusually complete command surface and an Undo model that survives late completions. It looks at home on macOS 27. Two things hold it down: latency on the main task, where every Episode selection is about 4× the instant limit, and ⌘F not landing in the field. The Dark Settings tab contrast caps Color. Cap: lowest 6.6 + 2.0 = 8.6, not binding. | |

## What stands between this build and 9.0

1. **RESP-01 on the main task.** Episode → Inspector at 0.5–0.9 s and Settings at 0.4–0.9 s. While it fails, Interaction stays capped at 6.9 and Overall can't climb past about 8.9. It's also the defect people feel most often.
2. **KEY-04.** ⌘F must put the caret in the search field. This is cheap, and it's a second major on the same capped category.
3. **APPEAR-04 (owner decision).** The Dark selected-Settings-tab label at 1.73:1 caps Color at 6.9. Lifting the cap needs a split accent role: a lighter text-on-surface accent with the deep fill kept for selection. The owner has to choose to revisit it.
4. **Polish needed for Exemplary in the visual categories:**
   - Tame the Inspector monogram so the Episode title leads.
   - Tighten single-line secondary lists (All Views at 60 pt, Subscriptions at 62 pt) toward the 32 pt sidebar rhythm.
   - Drop the iOS chevrons.
   - Unify form-label case.
   - Use one picker style across widths.
   - Fix the Now Playing bottom edge.
   - Give Speed/Sleep a Show Borders edge.

## Next step

- **Target:** RESP-01, "Select Episode → Episode Inspector". It's a major in the lowest-scoring category (Interaction & feedback, 6.6) and sits on the primary task. KEY-04 is the same category's other major and should ride along, since it's a one-line focus change.
- **Anti-pattern:** none named exactly. Closest is "Keyboard afterthought" for KEY-04. The latency is a structural layout cost, not a named visual anti-pattern.
- **Root cause:** opening or refreshing the Inspector rebuilds the split view's trailing column and lays out the full Inspector before the first frame. Phase timings: shell body evaluated in about 30 ms, then 680–760 ms to first frame when the pane opens and 260–340 ms when it's already open. Nothing cheap, such as the selected row or the title, is presented first.
- **Change:**
  - (a) Present the row selection and a fixed-height Inspector header (artwork placeholder, title, podcast, Play) from the row model the list already holds, in the first frame after input.
  - (b) Keep the Inspector column mounted while hidden instead of inserting it.
  - (c) Move memberships, chapters and show notes behind the existing `deferDetails` gate, so they arrive after that frame in space reserved for them. That way FLOW-01 still holds.
  - (d) In `openLibrarySearch()`, focus the toolbar field after navigation.
  - Target: p75 ≤ 200 ms on the five-sample timing pass in both appearances, with the timings-only mode as the A/B.
- **Principle:** `feedback` (respond at once), `keyboard-efficiency`.
- **Expected effect:**
  - Interaction & feedback lifts toward 7.5–8.0 once both majors clear.
  - Overall moves toward about 7.8.
  - No visual category should regress if (c) reserves the deferred sections' space.
  - The character survives: the Inspector layout and the glass action cluster are unchanged; only the order of arrival changes.
