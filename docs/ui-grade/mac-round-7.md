# PodList Mac — UI grade, round 7 (Opus)

Full audit per `~/Documents/UI_Guidelines/CRITIQUE.md`, graded independently from the round-7 captures (`~/Documents/podlist-grading/mac-round-7/`, 35 states × Light/Dark, `.txt` accessibility snapshots, `menus.txt`) and the code at commit `e910633` (`apps/apple`). No earlier grade report was read. The app was not launched and no screen-control tools were used.

Capture references below are `L03` / `D03` for `light/03-…png` / `dark/03-…png`. Main-window captures are 1180 × 760 pt at 2×; points = pixels ÷ 2.

**Overall 6.9** · Typography 7.4 · Hierarchy 6.8 · Spacing & density 6.9 · Color & contrast 6.6 · Iconography 7.3 · Consistency & polish 7.0 (stability N/O) · Clarity 7.2 · Platform fit 6.9 · Interaction & feedback 6.9

No blockers. Five majors: APPEAR-04, KEY-04, DATA-06, WIN-05 (owner decision), SYS-05 (owner decision).

---

## Frame

- **Task:** Find podcast Episodes (through Views, Subscriptions and Search), queue them into ordered Playlists, and listen, without losing position or history.
- **Target:** Mac app (SwiftUI, macOS 26+), graded against `core-checklist.md` + `mac-checklist.md`.
- **Posture:** Sovereign personal tool. It stays open all day while audio plays, and people return to it many times a day.
- **Audience:** Perpetual intermediate. Domain vocabulary (View, Entry, Active Playlist, Clear on Played, Listening Timeline) rewards learning, and Getting Started covers newcomers.
- **Nearest exemplar:** Things, for calm personal work with a precise vocabulary. BBEdit is the secondary reference for menu completeness and "never lose work" (Rewind preview, named Undo, Trash).
- **Character (baseline = these captures):**
  1. Capitalized domain nouns in plain, consequence-stating copy ("Rewind can be undone", "Deleted Playlists can be restored from Trash for 30 days").
  2. A native three-pane layout: sidebar sections Views / Playlists / Library with counts and state glyphs, a sortable Episode table (Episode · Published · Length · State), and a right Inspector.
  3. A persistent glass player bar at the bottom showing the Active Playlist and "N after current". *(owner-fixed)*
  4. Brand-blue initials artwork on a pale tile as identity. The brand blue is the Multicolor AccentColor. *(owner-fixed)*
  5. Glass footers carrying the action row on sheets and utility windows. *(owner-fixed for the View editor footer, Inspector actions and Now Playing; the same component is reused on every sheet)*
- **Owner decisions recorded:** brand accent only under Multicolor; transport in a bottom bar; Light / Dark / follow-macOS appearance setting; no customizable toolbar; two-click, self-disarming, undoable Unsubscribe; Liquid Glass on the player bar, Inspector actions, Now Playing and View editor footer; Spotlight deferred; MCP off by default and App Intents on. Each is graded. Where one fails a check the failure and its cap stand, but it is not chosen as the next target.

## Flows

- **Tasks that would need running:** (1) open a View, then select, Play Now, Undo; (2) Add to a Playlist sheet, then Play Next; (3) Playlist reorder / Remove from Playlist, then Undo; (4) Add Podcasts search, then Subscribe while typing a second query; (5) Rewind to Here.
- **Widths / appearances / timed runs:** none. The evidence is a state tour (`apps/apple/UITour/PodListUITour.swift`, `testLight` / `testDark`) at a single 1180 × 760 pt size. It has no measurements file, no per-step element boxes, no delayed completions and no timed passes.
- **Result:** every check that needs F alone (FLOW-01, FLOW-02, RESP-01, RESP-02) is **N/O**, and the stability sub-score is **N/O**, so Consistency & polish is marked "(partial: no flow run)". FLOW-03 to FLOW-07 were judged from code and screenshots (see the checklist).
- **Code signals relevant to stability (not scored as flow evidence):** the edit-feedback row reserves a fixed 32 pt slot whether or not a notice is showing (`EpisodeEditingViews.swift:184-185`), so a late success, error or Undo arrives in space already kept for it. Discovery search drops stale results and never writes to the query (`AddPodcastsWindow.swift`, `search()`: `guard state.query == submitted`).

## Cross-screen inventory

Built from the captures, plus code where a state isn't captured (feedback rows, errors).

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View / Search table (L02, L03, L15) | Feedback row under the sync line: primary text, transient (5 s), e.g. "Undone: …" | Same row, `podListError` red, inline **Retry** | none | "Undo ‹name›" button trailing in the feedback row, plus Edit › Undo ‹name› | Centered `ContentUnavailableView`: "No Matching Episodes" with Edit View… / Clear Search | none | Toolbar Play Now / Add to a Playlist… (with selection); Search: "Create View…" trailing over the table | View description line ("Published in the last 7 days · Unplayed · …") |
| Playlist Entries / History / Timeline (L06–L09, L34a) | Feedback row (as above) | Feedback row, red + Retry | Rewind sheet (L34) | Feedback row + Edit menu | "No History" centered, with an explanation and no action (L08) | none | ▶ Play This Playlist beside the section control; Timeline: "Rewind to Here" on every row | Inline caption in the empty state |
| Subscriptions (L01) | Feedback row | Feedback row | none | Feedback row | "No Subscriptions": Add Podcasts / Clear Search | none | "Edit Download Rules…", top trailing (dim until selection) | "Grouped by Download Rule" caption |
| Podcast page (L18–L21) | Feedback row | Feedback row | Unsubscribe armed state: red label in place (L20) | Feedback row | — | none | Subscribed/Unsubscribe in the header button row | Show Description link |
| Trash (L14) | Feedback row | Feedback row | Delete Permanently alert (code: `PlaylistSettingsViews.swift:259`) | Feedback row | "Trash Is Empty", centered, plus a retention note top-leading | none | Restore / Delete Permanently (menu, context) | Retention sentence at top |
| Inspector (L03, L06) | — | — | — | — | "Select an Episode", centered on the gray inspector surface | none | Large circular ▶, then a glass row of 5 icon actions | — |
| Sheets: Playlist Settings, New Playlist, Edit/New View, Add to Playlist, Download Rules, Subscription Settings, Rewind (L11–L13, L16, L17, L22, L23, L25, L34) | Sheet closes; parent feedback row | `status` slot above the glass footer, red | — | Parent feedback row | — | The sheet itself | Footer, trailing, prominent default (Save / Create Playlist / Create View / Play Next / Apply / Rewind); destructive secondary leading | Caption paragraphs; two sheets also explain what Save and Cancel do |
| Add Podcasts window (L24) | Row shows "Subscribed" | Inline under the field, red + Retry | — | Window feedback row above the footer | "Find Your Next Podcast", **off-center** | none | **Search** (default) beside the field; footer **Close** | A navigation hint sentence under the field |
| Now Playing window (L26) | — | Controls › Retry Playback | — | — | — | none | Transport capsule; footer **Done** | — |
| Settings (L27–L30) | Live apply, no confirmation | Inline "Could not save X … Retry" (`GeneralSettingsEdits.swift`) | — | — | — | — | — (live) | Caption under Text Size and MCP |
| Listening Stats (L31) | — | — | — | — | "No Listening Yet", centered | none | — | — |
| Getting Started (L32) | — | — | — | — | — | Sheet on Settings | Footer **Dismiss** | Numbered steps |

**Mismatches**
1. **Three words for closing a non-modal surface:** Close (Add Podcasts, L24), Done (Now Playing, L26) and Dismiss (Getting Started, L32). Listening Stats and Help close only through the window controls.
2. **Empty-state text styling:** every empty-state description uses the app's readable-secondary token except Listening Stats (L31, `LibrarySettingsScreens.swift:314-315`). Every empty-state *title* is left on the system secondary style, which is the APPEAR-04 failure below.
3. **Button-explaining copy appears only in some sheets:** Playlist Settings (L11, `PlaylistSettingsViews.swift:182`) and Subscription Settings (L22, `PodcastScreens.swift:373`) say what Save and Cancel do. Edit View, New View, Download Rules and Add to Playlist don't.
4. **Two ways to name things in a sheet:** New Playlist and New View edit the name in a field (L13, L17). Playlist Settings and Edit View show the name as text with a nested Rename… mode that has its own "Cancel Rename / Save Name" commit inside a sheet that also has Cancel / Save (L11, L12, L16).
5. **Date format:** the Timeline shows "Nov 15, 2026 at 9:23 PM" (L09); the Rewind sheet for the same moment shows "Nov 15 at 9:23 PM" (L34).
6. **Domain term casing:** "Listening Log" (L31, Bring-Over preview) vs. "Listening log" (Rewind sheet L34, Delete Permanently alert).

## Checklist

**Coverage: 94.0%** (141 of 150 applicable items verified: **pass 127 · fail 14 · N/O 9 · N/A 18**; 168 IDs in total.)

### Failures by severity

**Blockers:** none.

**Major**

- **[APPEAR-04] Recurring empty-state titles and two labels miss the contrast targets.** Contrast was measured on the captures (darkest glyph pixel against the dominant background).
  - **Evidence:**
    - The Inspector's "Select an Episode" title, shown on most library screens: **2.51:1** in Light (#999898 on #F1F0EF; L06, L08, L09, L15, L18). That is below even the 3:1 allowance for bold text.
    - Empty-state titles on white ("No History", "Trash Is Empty", "No Listening Yet", "Find Your Next Podcast"): **3.10:1** (L08, L14, L31, L24).
    - The Listening Stats description, regular 13 pt: **3.10:1** (L31). The app's own readable token isn't applied here (`LibrarySettingsScreens.swift:314-315`).
    - The Settings › Server Connection "Server Address" value: **3.08:1** (#8E8E8E on #F8F8F8; L28, L29). It uses the system `LabeledContent` secondary style (`LibrarySettingsScreens.swift:85`).
  - **Calibration note:** the captures render the app's #606060 secondary text as about #737373, so absolute values may read slightly low. The Listening Stats description and Server Address still fall below 4.5:1 under any reasonable correction, and the inspector title stays below 4.5:1.
  - **In context:** Dark passes (inspector title 3.47:1 bold; other empty states 5.9:1 and up).
  - **Fix:** wrap `ContentUnavailableView` in one `PodListEmptyState` that applies `MacReadableSecondaryStyle()` to the title as well as the description. Use it for the Inspector, History, Trash, Listening Stats and Add Podcasts. Render the Server Address value in `.primary`, or the readable token, with text selection.
- **[KEY-04] Add Podcasts opens without focus in its only input.**
  - **Evidence:** L24 / D24. The keyboard focus ring is on the footer **Close** button, and the "Podcast name or feed address" field shows no insertion point. The `focused = true` in `.onAppear` (`AddPodcastsWindow.swift:104`) doesn't take, likely because it fires before the window becomes key. Every other input surface focuses correctly (New Playlist L13, New View L17, Rename L12).
  - **Fix:** use `.defaultFocus($focused, true)` on the field, or set focus on the window's `didBecomeKey`. Also make the field, not Close, the initial key view.
- **[DATA-06] The sidebar width isn't restored on relaunch.**
  - **Evidence:** `MacWindow.swift:116-118` ("Its width isn't restored"); `PaneWidths` persists only the Inspector width (`MacWindow.swift:193-196`).
  - **Context:** everything else people arrange is restored: destination, selection, sort, scroll anchor, column visibility, playlist section and podcast origin (`WindowRestoration.swift`).
  - **Fix:** record the sidebar column width in `PaneWidths`, measured on the split item rather than on the `List`, which the code notes caused the narrowing. Feed it to `navigationSplitViewColumnWidth(ideal:)` once, on restore, as the Inspector path already does.
- **[WIN-05] Transport, scrubber, speed, sleep and the Active Playlist live in a bar at the window's bottom edge** *(owner decision; graded, not targeted)*.
  - **Evidence:** every main-window capture (`MacWindow.swift:200-207`).
  - **Mitigation:** the Controls menu, Space, ⌘← / ⌘→ and the Now Playing window (⌘L) keep playback reachable when the bottom edge is offscreen. The cap stands.
  - **Fix if the owner revisits:** a toolbar-hosted now-playing strip, as in Music and Podcasts on macOS 26.
- **[SYS-05] No Spotlight indexing of Episodes or Podcasts** *(owner decision: deferred)*.
  - **Evidence:** no `CoreSpotlight` / `NSUserActivity` in `Sources`.
  - **Fix (when scheduled):** `CSSearchableItem` per Episode and Subscription, with deep links back into a window.

**Minor**

- **[VIEW-02] View › Sidebar title doesn't reflect visibility as captured.**
  - **Evidence:** `menus.txt` lists **"Show Sidebar"** (enabled, at y=95) while the sidebar is visible in the state the menus were read from (L33). In the same menu, "Hide Inspector" is correct.
  - **Fix:** confirm in a running build. If it reproduces, publish the column visibility and title the item yourself instead of relying on `SidebarCommands()`.
- **[TOOL-03] One toolbar capsule mixes scopes.** New View / New Playlist and Edit View (list scope), the Inspector toggle (window scope), and Play Now / Add to a Playlist (selection scope) share one glass group (L03, L07, L33), and the persistent "+" shifts about 115 pt left whenever a row is selected (L06 → L07).
  - **Fix:** put the selection actions in their own `ToolbarItemGroup` with a spacer, so the list-scope group keeps its place.
- **[APPEAR-09] The Clear on Played glyph is an unfamiliar metaphor and heavier than its neighbors.**
  - **Evidence:** a solid black `eraser.fill` vs. outline `eraser` sits beside thin accent glyphs in every sidebar row (`MacWindow.swift:87`; L01).
  - **Fix:** use a lighter symbol with a recognizable meaning, e.g. `checkmark.circle` / `checkmark.circle.badge.xmark`, in secondary color. Or show it only on hover or in the Inspector, and keep the tooltip.
- **[DATA-05] Undo announces what it reversed but doesn't bring it into view.**
  - **Evidence:** `PlaylistEditingModel.swift:110-137` sets a status string ("Undone: …") and never selects or scrolls to restored Entries, Views or Playlists.
  - **Fix:** return the affected IDs from `reverse` and route them through the existing `didDrop` / `revealDrop` reveal path (`LibraryModel.swift:258-262`).
- **[COPY-01] Vague labels and inconsistent terms.**
  - **Evidence:** Edit › **Retry** has no object (`MenuCommandActions.swift:30`; `menus.txt`). "Listening Log" vs. "Listening log" (mismatch 6). Controls offers a Play/Pause toggle *plus* Resume Playback *plus* Pause Playback (`PlaybackCommands.swift:37-41`).
  - **Fix:** use "Retry Sync" (or name the failed operation). Pick one casing for Listening Log. Drop the redundant Resume / Pause items, or keep only them and remove the toggle.
- **[COPY-04] Tooltip casing is mixed.** Sentence-case fragments ("Play selected Episodes now (↩)", "Back 15 seconds") sit beside title-case ones ("Back to Library (⌘[)", "Show or Hide Inspector (⌥⌘I)", "More Episode Actions", "Open Active Playlist") (`EpisodeEditingViews.swift:137-143`; `MacWindow.swift:156, 181`; `PlayerViews.swift:35-70`).
  - **Fix:** sentence-case every tooltip while keeping domain nouns capitalized ("Back to the library (⌘[)", "Show or hide the Inspector (⌥⌘I)").
- **[SYS-02] No Services provider**, e.g. "Subscribe in PodList" for a selected feed address in another app. **Fix:** vend one `NSServices` entry that takes a URL or text.
- **[SYS-03] No URL scheme or deep links into Views, Playlists, Episodes or Subscriptions.** The share links point at the web. **Fix:** register `podlist://` routes that map onto the existing `LibraryWindowTarget`.
- **[SYS-06] No receiving Share extension** for sending a feed or episode page from Safari to PodList. **Fix:** a Share extension that hands the URL to Add Podcasts.

### N/O

FLOW-01, FLOW-02, RESP-01, RESP-02, FOOT-02, FOOT-01, APPEAR-11, WIN-10, SET-04 (Settings pane selection is `@State`, `ConnectionViews.swift:57`; whether SwiftUI keeps the Settings scene alive between openings can't be settled without running it).

### N/A

DLG-09 (no popovers); CTRL-02 (no checkbox hierarchies); LIST-05 (sidebar sections aren't collapsible, no outlines); START-04, START-05 (no permission requests); START-07 (no account creation); FILE-02, FILE-04, FILE-05 (no documents; OPML is import/export only); FMT-02 (no formatted text); DATA-02, DATA-03, DATA-08 (not a document app); SYS-07 (no meaningful Dock state); EXTRA-01–04 (no menu bar extra).

<details>
<summary>Passes (127), with the evidence each rests on</summary>

| IDs | Evidence |
|---|---|
| FLOW-03 | Search results and drafts never write into a field being typed in (`AddPodcastsWindow.swift` `search()`; rename/new-View drafts in `SelectionCommands.swift`). |
| FLOW-04, FLOW-05, FLOW-06, FLOW-07 | Undo and errors sit in a fixed top slot in view (L-all); sidebar, detail and Inspector share a top edge; no heading shells; sheet primary actions always trailing in the footer (L11–L25). |
| KEY-01, KEY-06, KEY-07, KEY-08 | Standard SwiftUI/AppKit controls, focus rings visible under Full Keyboard Access (L11, L12, L22, L34); shortcuts on layout-portable keys; native table paging, with Space documented as Play/Pause; full shortcut reference in Help (`ConnectionViews.swift:87-110`); bare keys yield to text (`PlaybackKeyboardGuard`). |
| DLG-01–05, DLG-07 | Only irreversible Delete Permanently uses an alert, with a specific title, consequence text, a destructive button and Cancel (`PlaylistSettingsViews.swift:259-264`); routine deletes go to Trash; Rewind gets a preview sheet; Esc and ⌘. cancel sheets; Cancel/Save pairs. |
| CTRL-03–08 | Persistent labels (L13, L16, L17, L22, L24); locale and range validation (`FormNumbers.swift`); native pressed states; an Episode Actions menu with Play/Add visible outside it; search prompts state scope ("Search this list", "Search Library", "Search Episodes"); OPML import with determinate progress and Cancel, and episode-drop "x of y". |
| LIST-01–04, LIST-06, LIST-07 | Native `Table` with title-case noun headings, sortable/resizable columns (L18 sort indicator), two-line rows with separators, persistent selection, arrows / ⌘A / double-click (Inspector) / Return (Play Now, documented); custom type-select on All Views. |
| DATA-01, DATA-04 | All edits autosave; drafts survive closing sheets; multi-step named Undo/Redo (`EpisodeEditingViews.swift:255-266`, `PlaylistEditingModel.swift:71-72`), shared by playlist and library edits. |
| DRAG-01–07 | `EpisodeTransfer` offers private, URL and text representations; move within a playlist, copy across, ⌥ forces copy (`PlaylistDragSession.operation`); drops are one named undoable edit with progress, failure feedback, Retry and selection of the dropped items (`EpisodeTransfer.swift`); OPML/URL drops onto the window; menu equivalents (Add to a Playlist…, Move Up/Down). |
| PTR-01–05 | `contextMenu(forSelectionType:)` on every list and table targets the clicked row without changing the selection; context menus omit shortcuts; tooltips on all icon buttons. |
| APPEAR-01, -02, -03, -05, -06, -07, -08, -10 | Appearance defaults to System (`MacAppearance.swift`); controls use the system accent and brand blue appears only through the Multicolor AccentColor (`.tint(nil)` on the segmented control and default buttons); custom colors have Light/Dark/Increase-Contrast variants; glass falls back to opaque with a stroke under Reduce Transparency / Increase Contrast (`MacGlass.swift`); no custom animation; glass only on control surfaces. |
| TYPE-01–08 | SF at 13 pt body, 11 pt captions, Title 2 bold sheet titles; 100–200% content text size with a reflowing reading layout (`MacTextSize.swift`); typographic ellipses, curly quotes, true minus in "−16:34". |
| COPY-02, COPY-03 | Errors inline at their cause with Retry; empty states give a next step (No Views → New View, No Subscriptions → Add Podcasts). |
| AX-01–05 | Combined sidebar row labels with state; labeled icon buttons; Unsubscribe hint; state never color-only ("Current Entry" text, armed label change); text scaling; standard controls. |
| START-01–03, START-06 | "Opening Library…" progress; skippable Getting Started, reachable again from Help and Settings; standalone mode with no account. |
| EDIT-01–05 | Undo/Redo head Edit and name the operation; Copy writes the title plus URL (`EpisodeCopyContent`); full Spelling/Substitutions/Transformations/Speech/Dictation/Emoji; ⌘F reassigned to Search Library (an object search, allowed). |
| MENU-01–06, APP-01–04, FILE-01, FILE-03, FMT-01, VIEW-01, WMENU-01–03, HELP-01–02 | `menus.txt`: App · File · Edit · View · Podcast · Views · Episode · Playlist · Controls · Window · Help; every toolbar, context and Inspector command has a menu item; unavailable items dim; ellipses where input follows; one submenu level; About, Settings… ⌘,, Hide/Quit; Close/Close All; Enter Full Screen; Minimize/Zoom/Bring All to Front; Help menu with search, PodList Help and Getting Started. |
| KEY-02, KEY-03, KEY-05 | Standard keys keep their meaning (⌘. = Stop outside sheets, an iTunes-era precedent; sheet ⌘. → Cancel); frequent commands have ⌘ / ⇧⌘ keys (Star ⇧⌘L, Played ⇧⌘E, Play Next ⇧⌘J); notation in ⌥⇧⌘ order (`KeyboardShortcuts.swift`). Option is used for 9 bindings, which is heavier than ideal but they are secondary commands. |
| TEXT-01, TEXT-02 | Native text fields; the key monitor routes text keys through `interpretKeyEvents`, keeping user bindings. |
| WIN-01–04, WIN-06–09 | Standard window frame; gray inactive selection (sidebar in L03); window titles name the view, with counts in the subtitle; Open in New Window and New Window ⌥⇧⌘N; full screen; 760 × 500 minimum with `ViewThatFits` footers. |
| TOOL-01, -02, -04, -05, -06 | Sidebar toggle/back leading, title, trailing actions + search; borderless symbols; no prominent toolbar tint; nothing hideable without a way back. |
| SIDE-01–06 | Leading sidebar visible by default, two levels, toolbar + View menu + ⌃⌘S routes, persistent highlight, system sidebar size (`macTextScale` forced to 1 in the sidebar). |
| SET-01–03, SET-05, SET-06 | Settings… opens a General / Automation pane window sized per pane (L27 vs L30) with minimize/zoom dimmed; live apply through the edit pipeline with inline failure and Retry; Appearance offers System. |
| DLG-06, DLG-08, CTRL-01 | One sheet at a time; Inspector and Now Playing are modeless; pop-ups for flat choices, a checkbox for Clear on Played, a small switch in a grouped form; the segmented Entries/History/Timeline control acts as a tab equivalent. |
| DATA-07 | `NSOpenPanel` / `NSSavePanel` with a default "PodList.opml". |
| SYS-01, SYS-04 | App Intents (Play, Pause, Play Episode, Add, Mark, Search, List) with App Shortcuts phrases; `ShareLink` for Episodes and Podcasts. |
| AX-03, TYPE-04 | 200% text without losing content; Mac-sized controls, no touch-scale targets. |

</details>

## Scores

Behavioral categories rest on code and the menu dump, with no running app and no timed flows; they are marked partial where that limits them.

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.4** | A small role-based scale: 13 pt body, 11 pt captions, a headline for Subscription names, Title 2 bold for sheet and Inspector titles; content text size from 100% to 200% that reflows (L03, L11, L18). Two things hold it out of Exemplary. On the Listening Timeline the timestamp is set larger than the event it describes ("Nov 15, 2026 at 9:23 PM" in body text above "Added to Playlist" in a caption, L09), which inverts the importance. The Podcast page's Episode column wraps titles to two lines while space sits unused elsewhere (L18). Strong anchor. | `hierarchy`, `craft` |
| Hierarchy | **6.8** | Content leads with a clear source → items → detail order. Competing chrome keeps it Competent. With one Episode selected there are four Play affordances: the row ▶, the toolbar ▶, the Inspector's large black circular ▶, and the player bar ▶ (L03, L07). A blank band about 60 pt tall (the sync line plus the reserved 32 pt feedback slot) sits above every list (L01, L05, L06). Every sheet frames its buttons in a bordered glass slab (L11–L25). Settings mixes launchers (Listening Stats, Getting Started) in with settings (L27). Top of Competent. | `content-first`, `simplicity-not-minimalism` |
| Spacing & density | **6.9** | Mac-sized controls, consistent 32 pt sidebar and about 54 pt two-line table rows, aligned leading edges, and density that fits a calm personal tool. Below Strong: the reserved empty band repeats on every screen; the Add Podcasts empty state sits about 100 pt left of center in its window (L24, D24); the Trash note's left edge is 4 pt off the content's (L14); the New Playlist and Download Rules sheets leave large dead areas above their footers (L13, L25). | `craft`, `hierarchy` |
| Color & contrast | **6.6** | Restrained and meaningful: the system accent for selection and controls, brand blue only through the Multicolor accent and artwork tiles, red reserved for errors and the armed Unsubscribe, deliberate contrast fallbacks (`MacAccentForegroundStyle` switches row icons to primary in Dark, D03). The measured APPEAR-04 failures (2.5–3.1:1 on recurring empty-state titles and two labels) pull it down. **Capped at 6.9** by APPEAR-04. | `accessibility`, `color-restraint` |
| Iconography | **7.3** | One SF Symbols family at matched weights, with standard meanings (`line.3.horizontal.decrease` for Views, `music.note.list` for Playlists, `text.badge.plus`, `trash`, share), tooltips and accessibility labels on every icon-only control. Held below 8 by the heavy black `eraser.fill` used for "Clear on Played", an unfamiliar metaphor (APPEAR-09), and by the iOS-style accent chevron "Open" buttons on Subscriptions rows (L01). | `conventions`, `craft` |
| Consistency & polish | **7.0** (partial: no flow run; stability N/O) | Empty, loading, error, armed and disabled states are all designed; sheets share one scaffold and footer; Light and Dark are equally finished (D03, D06, D11, D18). Holding it at the bottom of Strong: the six inventory mismatches (Close / Done / Dismiss; styling of one empty state; Save/Cancel explained in only some sheets; two naming models; date formats; Log/log), the off-center Add Podcasts empty state, mixed tooltip casing, and the selection-dependent toolbar shift. | `craft`, `conventions` |
| Clarity | **7.2** | State is always legible: Active Playlist, "Current Entry", positions, "2 after current", "Up to date", window subtitles with counts and selection. Copy states consequences (Rewind summary L34; Delete Permanently). Below 8: copy that explains buttons ("Save applies these settings. Cancel discards changes.", L11, L22); the nested Rename… with Cancel Rename / Save Name inside a Save/Cancel sheet (L12, L16); Edit › "Retry" without an object; redundant Play / Resume Playback / Pause Playback. | `plain-language`, `feedback` |
| Platform fit | **6.9** | Looks 7.3, Behaves 7.8, so (7.3 + 2 × 7.8) ÷ 3 = 7.6 uncapped. Details below. **Capped at 6.9** by WIN-05 and SYS-05, both owner decisions. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **6.9** (partial: no timed runs) | Keyboard-fluent and forgiving: named multi-step Undo across playlist and library edits; drops are undoable with progress and Retry; Return / Space / ⌘J family / ⌥⌘↑↓ shortcuts with an in-app reference; Unsubscribe uses arm-then-undo instead of an alert; failures are indexed in the menus (Retry Failed Episode Drop, Retry Playback). Uncapped this would be about 7.8. **Capped at 6.9** by KEY-04 (Add Podcasts focus) and DATA-06 (sidebar width). RESP-01 and RESP-02 are unmeasured. | `forgiveness`, `keyboard-efficiency` |
| **Overall** | **6.9** | It serves the task well and behaves like a Mac app in almost every reachable corner. The menu bar is complete, drag and drop and Undo are first-rate, and state is restored. Three things keep it out of Strong: visible hierarchy noise (four Play affordances, dead bands, boxed footers), recurring low-contrast empty-state text, and two owner-chosen platform deviations (bottom transport bar, no Spotlight). The lowest category is 6.6, so the cap is 8.6 and doesn't bind. The weakness holding Overall down most is Hierarchy, with the competing Play affordances and reserved blank band on every screen. | `content-first`, `conventions` |

**Platform fit signals.**

Looks:

| Signal | Verdict | Why |
|---|---|---|
| L1 frame, L2 type, L5 notation, L6 sidebar/selection, L7 symbols, L8 Settings, L9 density, L11 appearance | Native | Standard frame and title bar, SF at Mac sizes, ⌃⌥⇧⌘ notation, source-list sidebar with gray inactive selection, one SF Symbols family, a real Settings window with panes, Mac-sized rows, System appearance by default |
| L3 controls | Adapted | Stacked labels above pop-ups in sheets, chosen deliberately to survive 200% text |
| L4 menus | Native | System menus |
| L10 materials | Adapted, edging Foreign | Bordered glass slabs around sheet button rows, and Close / Done buttons in modeless windows, read as an iOS idiom |
| Bottom transport bar | Foreign-leaning | Owner decision |
| Accent-colored chevron disclosure buttons on Subscriptions rows | Foreign-leaning | iOS-style disclosure |

Behaves:

| Signal | Verdict | Why |
|---|---|---|
| B1–B8, B10 | Native | Complete menu bar; ⌘, opens Settings; shortcuts shown in menus; text bindings; keyboard and list behavior; context menus targeting the clicked row; restoration (except sidebar width); drag and drop in and out; named Undo and a real Help window |
| B9 system integration | Partial | App Intents and Share are present; Spotlight, a URL scheme, a Services provider and a Share extension are missing |
| B11 footprint | N/O | Not measured |

**Stability sub-score:** N/O (no flow run). No band limit is applied to Consistency & polish.

## What stands between this build and 9.0

1. **Fix the three non-owner majors.** APPEAR-04 (empty-state titles, Listening Stats description, Server Address value), KEY-04 (Add Podcasts initial focus) and DATA-06 (persist the sidebar width). Together they lift the 6.9 caps on Color & contrast and Interaction & feedback.
2. **Quiet the hierarchy.**
   - Pick one Play affordance per context. The table row ▶ plus the player bar is enough; drop the toolbar ▶ when the Inspector is open, or make the Inspector's ▶ a regular-size button.
   - Collapse the empty feedback slot into the sync line, so the band only appears when there's something to say. This needs a flow run to show the core still holds still.
   - Remove the bordered glass slab from sheet footers that aren't the View editor.
3. **Resolve the inventory mismatches:** one closing verb for modeless windows (or none, using the window controls); one naming model in sheets (edit the name in place); drop the button-explaining sentences; one date format and one Listening Log casing.
4. **Run real flows.** Script the five tasks under Flows with element boxes, a 2 s delayed completion while typing, and five timed passes. Without that, the stability sub-score and RESP-01, RESP-02 and FOOT-02 stay unverified, and no Consistency score can reach Exemplary on evidence.
5. **Platform integration beyond the owner's deferrals:** a `podlist://` deep link, a "Subscribe in PodList" Service or Share extension, and Spotlight when it's scheduled. **Owner decisions that cap Platform fit:** the bottom transport bar (WIN-05) and the deferred Spotlight indexing (SYS-05). Platform fit can't exceed 6.9 while either stands, so 9.0 Overall needs the owner to revisit at least the bar.

## Next step

- **Target:** **APPEAR-04**, the major failure in the lowest-scoring category (Color & contrast, 6.6). There are no blockers. WIN-05 and SYS-05 are owner decisions and are skipped as targets.
- **Anti-pattern:** *Ghost-text elegance*: gray-on-gray secondary text chosen by default styling rather than by reading need.
- **Root cause:** the app has a contrast-checked secondary token (`MacReadableSecondaryStyle`, #606060 / #A0A0A0 / Increase Contrast variants), but its empty-state component and two system label styles bypass it. Each `ContentUnavailableView` title, the Listening Stats description and `LabeledContent` values fall back to the system secondary/tertiary styles.
- **Change:**
  - Add one `PodListEmptyState(title:systemImage:description:actions:)` wrapper that styles both the title and the description with `MacReadableSecondaryStyle()`, keeping the title bold. Replace the 13 direct `ContentUnavailableView` uses with it (Inspector, History, Trash, Listening Stats, Add Podcasts, Views, Subscriptions, Episodes, the window fallbacks).
  - Render the Settings Server Address value with `.foregroundStyle(.primary)` and `.textSelection(.enabled)`.
  - Expected contrast afterwards: about 5.9:1 on the inspector surface and 6.3:1 on white in Light.
- **Principle:** `accessibility`. The empty states stay the same shape and voice, so no signature element is touched.
- **Expected effect:** Color & contrast rises to about 7.3, with the cap lifted. Consistency & polish improves slightly (removes mismatch 2). No other category is affected and none should regress.
