# PodList Mac — UI grade, round 9 (Opus)

Build: `apps/apple` at `7ec2bf5`. Standard: `~/Documents/UI_Guidelines/CRITIQUE.md` full audit, Mac target, with `core-checklist.md`, `mac-checklist.md`, `rubric.md` and `platform-fit.md`.
Evidence: `~/Documents/podlist-grading/mac-round-9/` (35 states × Light/Dark PNG + XCUITest AX text, `menus.txt`), plus the source. Captures are cited as `L03` (light/03-…) or `D20` (dark/20-…). Points = pixels ÷ 2; the main window is 1180 × 760 pt.
Not used: earlier grade reports, computer-use tools, or a live launch of the app.

## Frame

- **Task:** keep up with podcasts. Find Episodes through saved Views, queue them into ordered Playlists, and play the Active Playlist with position kept per Playlist.
- **Target:** Mac app (SwiftUI, macOS 26+), captured on macOS 27.2.
- **Posture:** sovereign personal tool, used daily, with a calm list–detail layout.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things (calm personal tool, opinionated reduction). For the side-by-side test: Apple Music and Podcasts on the Mac.
- **Character** (owner-fixed items are marked *fixed*):
  1. initials artwork tiles ("MH", "DF", "SB") in a brand-tinted square;
  2. domain nouns capitalised as a deliberate vocabulary ("Episodes", "Entries", "Playlists", "Views", "Active Playlist");
  3. plain copy that states consequences (the Rewind summary in L34; "Deleted Playlists can be restored from Trash for 30 days");
  4. a glass bottom player bar with transport, Speed, Sleep and the Active Playlist (*fixed*);
  5. a three-section sidebar (Views / Playlists / Library), with counts and Playlist status glyphs.
- **Owner decisions** (graded, but not targets):
  - brand blue is the AccentColor, so it shows only under Multicolor;
  - bottom player bar;
  - Appearance choice of System, Light or Dark;
  - no customisable toolbar;
  - two-click Unsubscribe;
  - glass on the player, the Inspector actions, Now Playing and the View editor footer;
  - Spotlight deferred;
  - MCP off by default, App Intents on.

## Flows

- **Tasks run:** none. This round has screenshots of separate states and the code, with no scripted flow, no timed passes and no measurements file.
- **Widths:** one width only (1180 × 760 pt). Light and Dark appearances.
- **Result:** every F-only check is N/O. FLOW-01–04, RESP-01, RESP-02 and FOOT-02 are N/O, and the stability sub-score is N/O. Consistency & polish is therefore "(partial: no flow run)".
- **Flagged for the next flow run** (a code risk, not scored). The main window's feedback row is created with `reservesSpace: false` (`MacWindow.swift:129-139`, `EpisodeEditingViews.swift:174`). The first success notice after an async edit inserts a row above the list and moves the list down. That is an unprompted move of a core element whenever the edit takes longer than 500 ms. Measure it.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View / Search list (L02, L15) | Feedback row under the sync line, caption, primary ink, 5 s (code) | Same row, red `podListError` + Retry (code) | none | "Undo ‹name›" button in the feedback row; Edit › Undo ‹name› | Centred icon + title + one line + button ("No Matching Episodes", code) | none | Toolbar + / Play Now; Return = Play Now | View description line under the sync line |
| Playlist Entries / History / Timeline (L06, L08, L09) | Feedback row, as above | As above | Rewind summary sheet (L34) | Feedback row; Rewind is undoable | "No History" centred, explanatory, no action (L08) | none | Toolbar Play This Playlist; per-row Rewind to Here (L09) | none |
| Trash (L14) | Feedback row | As above | Delete Permanently confirmation (code, `PlaylistSettingsViews.swift:260`) | Restore | "Trash Is Empty" centred (L14) | none | Context / Playlist menu Restore | Retention sentence at top-left, x = 201 pt (other lists start at 204.5) |
| Podcast page (L18–L21) | Library feedback row | As above | Unsubscribe armed in place, red, self-disarms (L20/L21) | Unsubscribe is undoable | n/a | none | Subscribed / Unsubscribe button | none |
| Task sheets (L11, L13, L16, L17, L22, L23, L25, L34) | Sheet closes | Status above the footer (code) | — | Edit › Undo after closing | n/a | n/a | Trailing prominent button in a glass footer card | Paragraphs that explain the buttons ("Save applies these settings. Cancel discards changes.", L11; "Mark All Played takes effect immediately…", L22) |
| Add Podcasts window (L24) | — | Inline (code) | none | — | Icon + title + line, **about 100 pt left of centre** (AX: text centre x = 859, window centre x = 960) | none | **Search** inline beside the field, while the prominent footer button is **Close** | Import hint paragraph under the field |
| Now Playing (L26) | — | Player error inside the bar (code) | none | — | — | none | Transport capsule; footer **Done** | none |
| Getting Started (L32) | — | — | — | — | — | Sheet over Settings | Footer **Dismiss** | Numbered steps |
| Listening Stats (L31) | — | — | — | — | "No Listening Yet" centred | none | — | none |
| Settings (L27–L30) | Live apply | — | — | — | — | — | — | Captions under controls, including a 93-character import note (L27) |

**Mismatches** (they join the step 4 ranking):

1. **Close verb:** "Done" (L26), "Close" (L24) and "Dismiss" (L32) all close an auxiliary surface.
2. **Rename pattern:**
   - New View (L17) and New Playlist (L13) put the name in a text field directly.
   - Edit View (L16) and Playlist Settings (L11/L12) show the name as static text plus a **Rename…** button. That button opens an inline field with its own **Cancel Rename / Save Name**, nested inside a sheet that already has Cancel / Save, and Save is disabled while renaming (L12).
3. **Empty-state placement:** content-centred in L08, L14 and L31; off-centre in L24.
4. **Immediate actions inside Save/Cancel sheets:** Delete Playlist (L11) and Mark All Played (L22) act at once, beside a deferred Save. The sheets need explanatory paragraphs to say which is which.
5. **Capitalisation of "this Device":** "on This Device" (L18, L22, L25 label) against "on this Device" (L03, L25 body).
6. **Listening Log:**
   - It is "Listening Log" in L31 and "Listening log" in L34.
   - L31 says "No Listening Yet" while the Timeline (L09) shows "Listened at 12:34" for the same library.
7. **Main action in auxiliary windows:**
   - Add Podcasts gives prominence to Close, not to Search (L24).
   - Every task sheet puts its main action trailing in the footer, consistently (FLOW-07 passes for sheets).
8. **Row action colour changes with appearance.** Row Add and Play glyphs are accent-blue in Light (L02) and primary-white in Dark (D03), because of the contrast fallback in `MacAccentForegroundStyle`. The sidebar glyphs stay blue in both. The intent is sound, but the same control reads differently in each appearance.

## Checklist

**Coverage: 86.4%** (pass 112 · fail 15 · N/O 20 · N/A 21; 168 IDs).

### Failures by severity

**Blocker**

- **[AX-01] The Playlist toolbar's pull-down has no accessible name.**
  - **Evidence:** in all 20 Playlist-screen snapshots (for example L06/L07/L09 `.txt`) the control is `menuButton label="" title="chevron.pulldown" identifier="playlist.actions"`. VoiceOver gets the SF Symbol name of the chevron. The sibling Episode menu has an explicit label (`label="More"`).
  - **Source:** `MacWindow.swift:168` — `Menu("Playlist Actions", systemImage: "slider.horizontal.3")`, with `.help` but no `.accessibilityLabel`. Compare `EpisodeEditingViews.swift:140-143`.
  - **Fix:** add `.accessibilityLabel("Playlist Actions")`, or better, replace the menu (see CTRL-06).

**Major**

- **[CTRL-06] A two-item pull-down.**
  - **Evidence:** "Playlist Actions" holds only New Playlist… and Playlist Settings… (`MacWindow.swift:168-171`). The Mac reference table recommends at least 3 items, rather than a menu for one or two.
  - The menu also reuses the `slider.horizontal.3` glyph that means the **Edit View…** button on View screens (L02).
  - **Fix:** a plain **Playlist Settings…** toolbar button (⌥⌘,), labelled and with a tooltip. New Playlist… already lives in the sidebar, File (⇧⌘N) and the sidebar context menu.
- **[WIN-05] Critical transport and Now Playing information sit in a bottom bar** (L01–L34; `MacWindow.swift:204-211`, `PlayerViews.swift:5-40`). Bottom bars should hold only limited status.
  - **Mitigation:** every transport command is also in Controls with shortcuts, and in the Now Playing window.
  - **Owner decision:** scored, not targeted. **Fix if reopened:** move transport and title into the toolbar, as Music does, and keep the bar for position only.
- **[SYS-05] No Spotlight indexing** of Episodes, Podcasts or Playlists (no CoreSpotlight in `Sources/`).
  - **Owner decision** (deferred): scored, not targeted. **Fix:** index Episodes and Playlists with `CSSearchableItem` and route activation to the existing `LibraryWindowTarget`.

**Minor**

- **[APPEAR-09] Some symbols carry unfamiliar or overloaded meanings.**
  - An `eraser` / `eraser.fill` glyph in the sidebar means "Clear on Played off/on" (L01, `MacWindow.swift:86`).
  - Two identical `play.fill` toolbar buttons mean different things: Play This Playlist vs Play Now (L07 toolbar).
  - `slider.horizontal.3` is both a button (Edit View…) and a menu (Playlist Actions).
  - **Fix:**
    - show Clear on Played as a text/state item in the context menu only, or use one quiet badge;
    - drop the toolbar Play This Playlist button when an Entry is selected, or give it a distinct glyph (`play.square.stack`);
    - use a single meaning per glyph.
- **[APPEAR-10] Command rows read as destinations.**
  - **Evidence:** "New View…", "New Playlist…" and "Add Podcasts…" sit in the sidebar with the same row metrics, label style and accent icon as navigation items (L01). They are buttons, not destinations.
  - **Fix:** move them to section-header "+" accessories, or give them secondary styling, as Music's "New Playlist" footer does.
- **[TYPE-06] Show notes measure too short.**
  - **Evidence:** reading text in the Inspector runs at about 35 characters per line at the default 270 pt Inspector width (`EpisodeInspector.swift:165`; L07 AX `staticText` width 208 pt).
  - **Fix:** raise the Inspector ideal width to about 320 pt, or let the notes span a wider reading pane.
- **[TYPE-07] An underline on something that is not a link.**
  - **Evidence:** "Show Description / Show Less" is an underlined disclosure button (L18/L19, D20; `PodcastScreens.swift:137`, `MacReadableLinkStyle`). It is not a link, and the menu calls the same command "Hide Description".
  - The expansion also reveals no extra text for this fixture (L18 vs L19).
  - **Fix:** use a disclosure ("More…" in link colour without underline, or a disclosure triangle). Hide it when the description fits.
- **[COPY-01] Inconsistent verbs.**
  - Done / Close / Dismiss for one meaning (mismatch 1).
  - "Add 1 Episode to a Playlist" whose buttons say Play Now / Play Last / Play Next (L23).
  - **View** and **Views** as adjacent top-level menus (`menus.txt`).
  - **Fix:**
    - use "Done" for auxiliary windows;
    - name the sheet "Play in a Playlist", or label the buttons "Add as Next / Add at End";
    - rename the Views menu to "Library" or fold it into Podcast/Playlist.
- **[COPY-04] Capitalisation drift.** "this Device" vs "This Device", "Listening log" vs "Listening Log", "Show notes" vs "In your Playlists", and a sentence set in title case ("All Conditions Must Match", L16/L17). **Fix:** one rule per element type, with domain nouns capitalised everywhere.
- **[VIEW-02] The sidebar menu title is stale.** `menus.txt` was captured on the 33-multi-selection window, whose sidebar is visible (L33), yet View shows **Show Sidebar** (`toggleSidebar:`). **Fix:** let `SidebarCommands` validate against the focused `NavigationSplitView`'s column visibility, or publish your own Show/Hide Sidebar item from `columns`.
- **[TOOL-03] Too many toolbar groups.** With an Entry selected (L07) the toolbar holds 5–6 functional groups: section control, Play, Playlist Actions, Inspector + Play Now + Add, More, Search. The guidance is at most 3. **Fix:** see CTRL-06 and APPEAR-09; fold the per-selection buttons into one group.
- **[SYS-02] No Services provider.** A selected feed URL in another app can't be sent to PodList (for example "Subscribe in PodList"). **Fix:** vend an `NSServices` entry that opens Add Podcasts with the text.
- **[SYS-03] No app URL scheme or universal link** for Views, Playlists or Episodes. Share links are publisher web URLs only (`ShareLinks.swift`). **Fix:** add a `podlist://` route onto `Destination` / `LibraryWindowTarget`.
- **[SYS-06] No Share extension** to receive a podcast or feed URL from Safari or other apps. **Fix:** add a Share extension that hands the URL to Add Podcasts.

### N/O

FLOW-01, FLOW-02, FLOW-03, FLOW-04, RESP-01, RESP-02, FOOT-01, FOOT-02, DATA-05, DRAG-02, DRAG-05, DRAG-06, DRAG-07, PTR-03, PTR-05, APPEAR-11, WIN-03, WIN-10, TOOL-02, SET-04

### N/A

- **No documents:** FILE-01, FILE-02, FILE-04, FILE-05, DATA-02, DATA-03, DATA-08.
- **No formatted text:** FMT-01, FMT-02.
- **No popovers:** DLG-09.
- **No checkbox hierarchy:** CTRL-02.
- **No outlines:** LIST-05.
- **No permissions or accounts:** START-04, START-05, START-07.
- **Audio is the content:** AX-05.
- **No meaningful Dock state:** SYS-07.
- **No menu bar extra:** EXTRA-01, EXTRA-02, EXTRA-03, EXTRA-04.

### Passes, with the evidence that decided them

- **Menus**
  - MENU-01: App, File, Edit, View, Podcast, Views, Episode, Playlist, Controls, Window, Help.
  - MENU-02: every toolbar, context and inspector action has a menu item (Resume in Playlist, Play Chapter, Section, Rewind to Here…, Restore, Show Description, Go to Time…).
  - MENU-03: Play/Pause title toggles; Sort and Speed show checkmarks.
  - MENU-04, MENU-05, MENU-06.
  - APP-01–04: Connection and Automation sit in the Settings group.
- **File, Edit and Help**
  - FILE-03; EDIT-01: `undoTitle` / `redoTitle`, `EpisodeEditingViews.swift:270-279`.
  - EDIT-02/05: `onCopyCommand` puts text and a URL on the pasteboard; `onDeleteCommand` removes Entries.
  - EDIT-03: ⌘F is Search Library, an object search; Edit › Find keeps its standard names.
  - EDIT-04.
  - HELP-01/02: PodList Help window with a shortcut reference, plus Getting Started.
- **View and Window menus:** VIEW-01, WMENU-01–03.
- **Keyboard**
  - KEY-01/04/06/07.
  - KEY-02: ⌘. Stop follows Music; inside sheets it routes to Cancel.
  - KEY-03: every frequent command has a ⌘ shortcut. ⌥⌘ is used for about 9 commands, which is heavy but still within the rule.
  - KEY-05: notation is ⌥⇧⌘.
  - KEY-08: the shortcut reference lives in Help, and bare Return and Space are guarded during text entry (`PlaybackCommands.swift:76-123`).
  - TEXT-01/02: `interpretKeyEvents` honours key bindings.
- **Windows:** WIN-01/02 (inactive gray selection in L11–L13), WIN-04, WIN-06–09.
- **Toolbar:** TOOL-01/04/05/06.
- **Sidebar:** SIDE-01–06.
- **Settings**
  - SET-01.
  - SET-02: System is the default (`MacAppearance.swift:191`).
  - SET-03: General and Automation toolbar panes; minimise and zoom dimmed.
  - SET-05: no Save button.
  - SET-06.
- **Dialogs**
  - DLG-01: confirmation is reserved for Delete Permanently. The Rewind sheet is a preview of a multi-effect action.
  - DLG-02–08: Esc and ⌘. cancel; the default button is trailing.
- **Controls:** CTRL-01, 03, 04, 05, 07, 08.
- **Lists:** LIST-01–04, 06, 07 (type-select, primary action and context menus on every list).
- **Data:** DATA-01 (drafts survive sheet closes), DATA-04, DATA-06 (`@SceneStorage` window context: pane widths, columns, selection, scroll anchor), DATA-07.
- **Drag:** DRAG-01/03/04. `EpisodeTransfer` exports a private type, then a URL, then a title; drops are undoable edits.
- **Pointer:** PTR-01/02/04.
- **Appearance**
  - APPEAR-01/02.
  - APPEAR-03: high-contrast palette variants; glass becomes opaque with a border under Reduce Transparency or Increase Contrast (`MacGlass.swift:27-35`).
  - APPEAR-04: measured in L03/D03 — secondary 6.29:1 Light and 6.05:1 Dark on content; sidebar header 5.38:1 Light and 5.70:1 Dark; sidebar glyph 5.82:1 Light and 3.20:1 Dark (non-text); selected row text 9.17:1 and 9.96:1.
  - APPEAR-05: no custom animation.
  - APPEAR-06–08.
- **Type:** TYPE-01–05, 08.
- **Accessibility:** AX-02/03/04 (Text Size 100–200% plus View › Bigger/Smaller, with a reading layout at larger sizes).
- **Copy:** COPY-02/03.
- **Start:** START-01/02/03/06.
- **System:** SYS-01 (App Intents and App Shortcuts), SYS-04.
- **Flow:** FLOW-05/06/07 (S).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.2** | **Lifts it:** system font at Mac sizes (13 pt body; row titles about 6.2 pt per character in the L07 AX widths). Hierarchy comes from weight plus readable secondary ink (`#606060` / `#A0A0A0`). Times use tabular digits; the time-remaining figure uses a real minus. **Holds it below Exemplary:** the Show Description underline (TYPE-07); Inspector show notes at about 35 characters per line (TYPE-06); bold run-in headings stacked in the Rewind sheet (L34). Strong band, low. | hierarchy, craft |
| Hierarchy | **6.6** | **Lifts it:** list screens put content first, with the title and subtitle in the toolbar and the Inspector receding (L02/L03). **Competes with it:** every row carries two accent glyphs (L02, L18); 5 identical "Rewind to Here" buttons in the Timeline (L09); a 5–6-group toolbar with a selection (L07); sheets topped by explanatory paragraphs (L11, L22). Competent, near the top. | content-first, simplicity-not-minimalism |
| Spacing & density | **6.8** | **Lifts it:** a 16 pt content gutter; 32 pt sidebar rows; 46 pt two-line rows suit a calm list; sheets keep a 24 pt padding rhythm. **Breaks it:** Add Podcasts empty state about 100 pt off-centre (L24); Trash retention line 3.5 pt left of the content edge (L14); podcast-page titles wrap in a narrow column next to the row glyphs (L18); about 45 pt of dead space above the New Playlist and Add to Playlist footers (L13, L23). | craft, hierarchy |
| Color & contrast | **7.4** | **Lifts it:** system accent for selection; brand only under Multicolor; a contrast fallback for pale accents; red reserved for the armed Unsubscribe and for errors; Increase Contrast variants. Every measured ratio passes (APPEAR-04 above). **Holds it back:** row glyphs change colour between appearances (mismatch 8); a lot of accent ink on repeated row controls. | color-restraint, accessibility |
| Iconography | **6.3** | **Lifts it:** SF Symbols throughout, every icon button has a tooltip, and the Inspector icons carry their state in the label. **Pulls it down:** the eraser state glyph; two identical toolbar play glyphs; `slider.horizontal.3` used both as a button and as a menu (APPEAR-09); the unnamed chevron menu (AX-01). Competent. | conventions, plain-language |
| Consistency & polish | **6.2** (stability N/O; partial: no flow run) | **Cap:** ≤ 6.9 from CTRL-06. **Lifts it:** every sheet shares one scaffold (title2 heading, glass footer, trailing prominent default). **Pulls it down:** the rename pattern differs between create and edit sheets; Done/Close/Dismiss; capitalisation drift; double separators in File and Playlist (`menus.txt`); a stale "Show Sidebar"; the off-centre empty state; "Show Less" in the UI vs "Hide Description" in the menu. | craft, conventions, stability |
| Clarity | **6.5** | **Lifts it:** state is visible (Active Playlist glyph and subtitle, "Current Entry", "Up to date", a selection count in the subtitle) and the copy states consequences (L11, L34). **Pulls it down:** View vs Views menus; Add-titled sheet with Play buttons (L23); sheets that explain their own buttons; "No Listening Yet" (L31) against "Listened at 12:34" (L09); the sidebar's "Search 15" next to "1 result" (L15). | plain-language, feedback |
| Platform fit | **6.9** (Looks 7.3 · Behaves 7.6 → 7.5, capped) | **Cap:** ≤ 6.9 from WIN-05 and SYS-05, both owner decisions. **Looks:** native sidebar, Table, toolbar and Settings panes; inactive-window gray selection. Foreign tells: an underlined link-button, command rows in the source list, and a glass card under every sheet's buttons. **Behaves:** complete menu bar with shortcuts; named Undo; context menus everywhere; drag in and out with URL and text; restoration; App Intents. Missing: Spotlight, a URL scheme, Services, a Share extension. | conventions, discoverable-commands |
| Interaction & feedback | **4.9** | **Cap:** ≤ 4.9 from the AX-01 blocker; uncapped it would be about 7.6. **Lifts it:** keyboard-complete; labelled multi-step Undo, with Undo in the feedback row; Trash with 30-day restore; undoable Unsubscribe and Rewind; drafts preserved; Space, Return and ⌘. guarded around text and sheets. RESP is N/O. | accessibility, keyboard-efficiency, forgiveness |
| **Overall** | **6.8** | **Cap:** ≤ 6.9 (lowest category 4.9 + 2.0). It serves the primary task well and behaves like a Mac app almost everywhere. The heaviest single weight is one unlabelled toolbar menu (AX-01); the owner-held WIN-05 and SYS-05 cap Platform fit. | — |

## What stands between this build and 9.0

1. **AX-01 (blocker).** One unlabelled toolbar menu caps Interaction & feedback at 4.9, and through it caps Overall at 6.9. It is a one-line fix.
2. **CTRL-06 (major).** The two-item pull-down caps Consistency & polish at 6.9. Fixing it together with AX-01 also removes a toolbar group (TOOL-03) and an overloaded glyph (APPEAR-09).
3. **Owner-held majors WIN-05 and SYS-05.** They hold Platform fit at 6.9, so Overall can't exceed 8.9 while either stands. 9.0 is unreachable until Spotlight lands and the transport moves out of the bottom bar, or the owner accepts that ceiling.
4. **Sheet excise.**
   - Nested Rename… → Save Name → Save.
   - Immediate actions beside a deferred Save.
   - Paragraphs that explain Cancel and Save.
   This is the largest remaining gap in Hierarchy and Clarity: move to edit-in-place fields and live-apply settings, or put immediate actions outside the sheet.
5. **Copy and icon drift:** COPY-01, COPY-04, APPEAR-09, APPEAR-10, TYPE-07 and the eight inventory mismatches.
6. **A flow run.** Without one, stability, responsiveness and the feedback-row insertion risk stay unscored.

## Next step

- **Target:** AX-01, the blocker. Diagnose order rule 1.
- **Anti-pattern:** *Mystery-meat navigation*, in its screen-reader form. The control's only name is the chevron symbol.
- **Root cause:**
  - The Playlist screen's secondary commands live in a toolbar `Menu` that relies on SwiftUI's title-derived label. In a toolbar menuButton that label surfaces as `AXTitle "chevron.pulldown"` with an empty description.
  - The menu exists only to hold two commands that already have better homes.
- **Change:** in `MacWindow.swift:168-171`, replace `Menu("Playlist Actions", systemImage: "slider.horizontal.3") { New Playlist…; Playlist Settings… }` with:

  ```swift
  Button("Playlist Settings…", systemImage: "gearshape") { playlistPresentation.sheet = .settings(id) }
      .help("Playlist Settings (⌥⌘,)")
      .accessibilityLabel("Playlist Settings")
  ```

  `gearshape` matches the podcast page's settings button in L18. New Playlist… stays in the sidebar, File (⇧⌘N) and the context menu.
- **Smallest alternative:** add `.accessibilityLabel("Playlist Actions")` to the existing menu.
- **Principles:** accessibility, then simplicity-not-minimalism. No capability is removed; every command keeps a menu route.
- **Expected effect:**
  - AX-01 and CTRL-06 pass, and TOOL-03 moves toward its guidance.
  - Interaction & feedback loses its 4.9 cap (about 7.6 on present evidence); Consistency & polish loses its 6.9 cap.
  - Overall's ceiling rises to Platform fit's 6.9 + 2.0. Holistic Overall should land around 7.3–7.5.
  - Character untouched: no signature element is involved.
  - Re-check: the AX snapshot for L06/L07 should show `label="Playlist Settings"`, and the Playlist toolbar should drop to four groups.
