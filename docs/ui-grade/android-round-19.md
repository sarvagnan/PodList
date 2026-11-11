# PodList Android phone — UI grade, round 19

Graded 2026-11-11 at `5cee7d0` (main), against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android › Phone, rubric.md). Independent read: no earlier report or work list was consulted.

Evidence:
- **Capture** `android-grade-19/` (scratchpad): 54 screens × light, dark and 200% font, each with a screenshot and an accessibility snapshot. Pixel 10 Pro XL profile, Android 16, 1344 × 2992 px at density 3.0, so 1 dp = 3 px and the screen is 448 dp wide (compact).
- **Flow run** `flow-run/20261111-124416-299/`: `summary.md`, `measurements.csv`, `timings.csv`, `frames.csv` and a 340-frame strip.
- **Code** `apps/android/app/src/main` (manifest, `MainActivity.kt`, `PodListScreens.kt`, `PlayerPresentation.kt`, `HistoryActions.kt`, `EditorComponents.kt`, `EntryDragging.kt`, `IncomingContent.kt`, `strings.xml`) and `androidTest/…/UiStabilityTest.kt`.
- No device was driven.

Measurements below are in dp, taken from the 3× captures (px ÷ 3) or from the colour tokens in `MainActivity.kt`.

## Frame

- **Task.** Find Episodes through Views and Search, queue them in Playlists, listen through the player, and manage Subscriptions.
- **Target.** Android phone, compact window (448 dp). Tablet and foldable are out of scope.
- **Posture.** Sovereign for short sessions. People return many times a day, with a persistent player.
- **Audience.** Perpetual intermediate.
- **Nearest exemplar.** Things, for the calm list, quiet chrome and finished states. On Android, the Google Podcasts / Pocket Casts class of app, using Material 3.
- **Character.**
  - Material 3 in PodList blue `#2b50c8`, with independently toned dark roles (owner).
  - Three-tab bottom bar: Views · Playlists · Library (owner).
  - A name-free 72 dp mini player and a name-free Now Playing sheet built around the transport (owner).
  - Capitalized domain vocabulary: Episode, Entry, Active Playlist, Played.
  - Green check for Subscribed (owner).
  - Initials tiles for missing Artwork.
- **Owner decisions (graded, not targeted).**
  - Accent and dark theme.
  - Bottom navigation.
  - Add podcasts as one field.
  - The View editor as one list.
  - Rewind as a summary sheet.
  - OPML in Settings.
  - The mini player shows the current Entry paused after relaunch.
  - No podcast or Episode names in the player.
  - Delete Playlist asks nothing and offers Undo.
  - The compact Podcast page: Subscribe in the top bar, a green check, two-tap Unsubscribe with Undo.
  - An explicit Rename with Cancel and Save.
  - Unique names, ignoring case.
  - Shortcuts only in Android's Keyboard Shortcuts panel.

## Flows

**Tasks run.** The app's instrumented harness ran five tasks:
- **A.** Views → View → Episode → Add → Play Last in Default → Undo.
- **B.** Playlist → play an Entry → Now Playing → collapse → pause → Entry menu → Move down → Undo.
- **C.** Add podcasts → find → Podcast page → reveal header → Subscribe, typing "Long E" in Search Episodes while the subscription is pending → Undo → next item → fling the 500-Episode list.
- **D.** New Playlist → Create → Playlist settings → Rename → Save → Undo.
- **E.** Search the Library → "rice" → Save as a View → Create View.

Each task ran at the compact phone width (448 dp) in Light and Dark. One pass added a 2 s delay to every HTTP completion. Five timed passes per appearance ran with no added delay, on a debug build in the emulator, with no throttling.

**Script.** `apps/android/app/src/androidTest` (documented in `apps/android/README.md`).

**Method, judged.** The harness compares settled captures and keeps input frames out of the FLOW-01 comparisons. It records focus, typed values, IME height and follow-up visibility. It refuses to call a RESP-01 or FOOT-02 failure from emulator or debug evidence. All of that is sound. Its limits:
- It doesn't measure FLOW-05 to FLOW-07. I judged those from the capture.
- It leaves four FLOW-01 candidates "unresolved". I resolved them from its own rows. The Podcast page's subscription slot moves from Subscribe (x = 273, w = 111) to the pending spinner (x = 348, w = 48) in input row 91, which is 52 ms after the tap. That makes the move person-caused. It then holds x = 348 through the late completion (rows 98 → 99 Light, 282 → 283 Dark). The return to x = 273 at rows 104 → 107 follows the Undo tap. So all four are caused by the person.

**Verdicts.**
- **FLOW-01** pass, with the four candidates resolved as above.
- **FLOW-02** pass. Focus stayed in Search Episodes through the late Subscribe (rows 98 → 99).
- **FLOW-03** pass. "Long E" survived a completion that landed 2.5–2.7 s after typing.
- **FLOW-04** pass. Snackbars sit above the mini player and the IME (C-0099).
- **RESP-01** and **FOOT-02** are N/O:
  - The timing came from a debug emulator, not audience hardware.
  - p75 upper bounds are under 200 ms for most steps. A few straddle 200 ms (B/open-now-playing 300.8, C/dismiss-keyboard 534, Dark C/next-item 712), and those have zero lower bounds.
  - Steps that settle in 1.0–1.7 s (D/rename, C/clear-query, E/search) recorded no busy indicator. That's an observation upper bound, not proof one is missing.
  - The long-list fling had 21 of 21 frames over deadline on the debug emulator. That's a risk to re-check on a release build on a real phone.

**Failures.** None.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View | Snackbar above the mini player, past tense ("Added 1 Entry to “Default”") | Snackbar with Try again (playback) | — | Snackbar Undo, plus the top-bar Undo slot | Getting started card (standalone) | Loading placeholder | + (New View) in the top bar; Play per row | Getting started card with Hide |
| Episode detail | Same snackbar | Same | — | Same | — | — | Filled Play Now, full width | — |
| Playlist (Entries, History, Timeline) | "Moved “X” in “Default”" | Snackbar | Rewind sheet (Cancel · Rewind) | Snackbar, then "Undone: …" with Redo | Text plus tonal "Show Entries" | — | Play from here per Entry | Timeline instruction line |
| Playlist settings | "Renamed Playlist to “X”" | Inline under the Name field | — | Snackbar | — | — | Rename (outlined) → Cancel · Save, trailing under the field | Helper under Delete Playlist |
| Trash | "Playlist X moved to Trash" (owner) | — | — | Snackbar | Text plus tonal "Back to Playlists" | — | — | Explanatory empty text |
| New Playlist | "Created Playlist “X”" | Inline under the field | — | Snackbar | — | — | Filled commit trailing under the field | — |
| View editor / New View | "Created View “X”", "Draft discarded" | Inline per condition | — | Snackbar | — | — | Pinned footer: count · Discard draft · Create View/Done | "Show Episodes where" helper |
| Search the Library | — | — | — | — | Count line | — | Save as a View (text) | — |
| Library | "Subscribed to X" | Snackbar | — | Snackbar | Text plus tonal "Add podcasts" | — | + (Add podcasts) in the top bar | "Grouped by Download Rule" |
| Podcast page | "Subscribed to X" | Inline on the Episode row with Try again; page errors in the header | Armed Unsubscribe in the top bar (owner) | Snackbar | — | 4 dp header progress seam | Subscribe in the top bar → green check | Show podcast details |
| Add podcasts | "Subscribed to X" | Inline under the field | — | Snackbar | Helper text | — | Find icon inside the field; Subscribe per result | Helper with examples |
| Settings and sheets | Snackbars for changes | — | Notification rationale dialog (Not now · Continue) | Snackbar | — | OPML progress bar | Done in sheets, bottom trailing | Help → Getting started |
| Listening stats | — | — | — | — | Text plus tonal "Find something to play" | — | — | 48 dp info buttons |
| Connect to a server | — | Inline under the field | — | "Draft discarded" with Undo | — | Progress bar | Check and connect, trailing under the field | Example and helper |

Placement and wording are consistent. Every success is a past-tense snackbar above the player, errors sit at their cause with "Couldn’t … Check …, then try again", empty states are one sentence plus a tonal action, and Undo is always on the snackbar.

**Mismatches.**
1. **Playlist names are quoted inconsistently within one list.** The Add to a Playlist sheet lists “Default” · Active Playlist beside an unquoted Commute and Workshop (light/09). Playlists (10) is unquoted, while Now Playing (08) and the settings titles (16) are quoted.
2. **A snackbar outlives its screen.** The Playlist reorder's "Undone: Moved … in “Default”" snackbar, with Redo, was still showing on the Library tab's Podcast page in task C (C-0091). The top bar there also offers "Undo: Updated Appearance", an action taken in Settings. Feedback and Undo arrive away from where the action happened.
3. **Empty-state actions do different kinds of work.** Trash's "Back to Playlists" only navigates. The other empty states ("Add podcasts", "Find something to play", "Show Entries") advance the task.

## Checklist

**Coverage: 90%** (pass 63 · fail 0 · N/O 7 · N/A 9). Applicable is 70 of 79 core IDs.

**Failures by severity:** none among verified items.

**Pass, with the evidence that settles it:**
- **FLOW-01 to FLOW-04.** See § Flows.
- **FLOW-06.** The Add podcasts helper stays after results arrive (59). Save as a View and Discard draft are added, never removed.
- **FLOW-07.**
  - Single-field forms commit trailing under the field: New Playlist, Connect, Rename.
  - Multi-row editors use a pinned footer: New View and Edit View.
  - Sheets commit at the bottom trailing edge.
- **KEY-06.** Ctrl+Z and Ctrl+Shift+Z use `KEYCODE_Z`, which follows the layout (`MainActivity.kt:68`).
- **KEY-08.** `onProvideKeyboardShortcuts` registers Undo and Redo with the system panel (owner).
- **DLG-01 to DLG-09.** The only dialogs are the notification rationale and the DatePicker. Rewind is a sheet with Cancel. Destructive actions use error colour (Delete Playlist, Delete View, armed Unsubscribe). Menus open from ⋮ (12).
- **CTRL-03.** Outlined fields keep floating labels.
- **CTRL-04.** Field-specific errors: number ranges, duplicate names. `NumberFormat` is locale-aware.
- **CTRL-05.** M3 ripple and pressed states.
- **CTRL-06.** The Entry menu holds secondary actions. Play stays inline.
- **CTRL-07.** Search states its scope ("Search the Library", "Search Episodes") and keeps no history.
- **CTRL-08.** Determinate download and OPML progress. Downloads can be cancelled from their notification.
- **LIST-01.** The stats table.
- **LIST-02.** Count headings ("3 Episodes", "500 of 500 Episodes").
- **LIST-03.** Sort is a View condition.
- **LIST-06.** Radio marks in sheets. The nav bar highlights the current destination.
- **DATA-01.** Drafts persist in `FormDraftStore` and are flushed in `onStop`. An open Rename survives.
- **DATA-04.** Multi-step history with Redo, typing groups, Ctrl+Z and Ctrl+Shift+Z (`HistoryActions.kt`).
- **DATA-05.** `revealChanges` brings back what Undo restored.
- **DATA-06.** Per-tab stacks and scroll position persist in the browsing context.
- **DRAG-01, 03, 05, 06.** Drag handle with Move up and Move down actions. Moves can be undone. The lifted row gets an 8 dp shadow and a haptic. The list autoscrolls during a drag (`EntryDragging.kt`).
- **PTR-04.** Every `ActionIcon` has a `PlainTooltip`.
- **APPEAR-03.** Light, Dark and System. Android 14 contrast is followed through `ContrastChangeListener`.
- **APPEAR-04.** Measured:
  - secondary text #46464f on #faf8ff: 8.86:1
  - primary #2b50c8: 6.46:1
  - dark secondary: 10.9:1
  - light snackbar action: 7.71:1
  - dark snackbar action: 5.27:1
  - green check: 6.23:1 (light), 11.06:1 (dark)
  - switch outline: 4.25:1
- **APPEAR-05.** Compose animations follow the system animator scale, and nothing bypasses it.
- **APPEAR-09.** One Material Symbols family, with outlined and filled navigation pairs.
- **APPEAR-10.** Controls are visually distinct from content.
- **APPEAR-11.** No flashes or half-rendered frames in the strip.
- **TYPE-02, 03, 05 to 08.**
  - Roboto, 12 sp minimum.
  - At 200%, hierarchy holds: actions reflow to their own row, Playlist tabs scroll and sheets scroll.
  - Show notes measure about 55–60 characters per line.
  - Curly quotes, ×, − and … throughout.
- **COPY-01 to COPY-04.** Specific verbs. "Tap" on Android. Every error names a recovery. Empty states give a next step. Capitalization is consistent: sentence case, with domain terms capitalized per CONTEXT.md.
- **AX-01.** Labelled controls and stateDescription on rows. See the note below.
- **AX-02.** Played and Starred are words. Subscribed is a check shape. Selection uses checkboxes.
- **AX-04.** A long-press label ("Select Episode"), Move up and Move down actions, a custom action for podcast details, and a "Show podcast details" button.
- **AX-05.** Audio never autoplays.
- **START-01 to 06.**
  - The Loading placeholder.
  - Getting started's Hide persists to `gettingStartedHidden` and stays findable in Settings › Help.
  - Notifications are requested at the first download, after the rationale "Allow notifications to see download progress and stop a download."
  - No account is needed (Standalone Device).
- **EDIT-05.** The Sharesheet through `Intent.createChooser`. Copy feed address. Show notes and descriptions are selectable.
- **WIN-03.** The compact window holds at 200%. Nothing is clipped.
- **SET-01.** App-wide options in Settings. Per-Subscription and per-Playlist options sit with their objects.

**AX-01 note.** The capture's accessibility snapshot shows the mini player's ±15/30 buttons with no name, and their labels concatenated onto the parent group ("Forward 30 seconds, Back 15 seconds, Now Playing: …"), on every screen (for example `light/01-views.txt` @e46 and @e51). That would be an unlabelled control.

But the code sets `contentDescription` on each `IconButton` (`PlayerPresentation.kt:273`). `UiStabilityTest` also asserts that each mini player control is its own 48 dp button with exactly its label, in both the merged and the unmerged tree. The artwork's own label is likewise moved into that group in the snapshot, so the snapshot tool rearranged that subtree.

Graded as pass. Confirm with live TalkBack.

**N/O:** KEY-01, KEY-04, KEY-07, LIST-07, PTR-03, RESP-01, FOOT-02.

**N/A:**
- FLOW-05: no side-by-side panels on a phone.
- CTRL-02: no checkbox hierarchy.
- LIST-04: no dense multi-column rows.
- LIST-05: no outline.
- START-07: no account creation.
- EDIT-02: native fields only.
- TOOL-06: no hideable toolbar.
- SIDE-03 and SIDE-04: no panes at compact width.

### Platform fit signals (Android › Phone)

| # | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Adapted** | A bottom bar with three equal destinations. Top app bars carry Up on inner screens, and roots never show Up. Actions sit in the top bar (Search, +, Settings) apart from destinations. A contextual selection bar. One unusual element: an Undo icon in the top bar on every screen, a desktop global-undo idiom. Google apps put Undo on the snackbar only. |
| L2 Visual language | **Native** | Consistent Material 3: tonal and filled buttons, outlined fields, radio sheets, a filled transport button, M3 progress with a stop dot. |
| L3 Density, text, frame | **Native** | 48 dp targets (`ActionIcon`, `SkipButton`, `ChoiceRows heightIn(48)`, plus the test). sp type with a 12 sp floor. `enableEdgeToEdge`. `adjustResize` with `imePadding`. No clipping at 200%. |
| B1 System navigation | **Native** | `enableOnBackInvokedCallback`. `NavigableListDetailPaneScaffold` per tab. `PredictiveBackHandler` for the player, in the documented order. Back from Playlists or Library goes to Views (`PodListScreens.kt:173`). |
| B2 Preferences and access | **Native** | TalkBack labels, roles, stateDescription and custom actions. System, Light and Dark. System contrast. System language isn't exercised: strings are English only, number formatting is locale-aware. |
| B3 Surfaces and lifecycle | **Native** | The Sharesheet. Permission asked in context. Media session and notification. Android Auto. Launcher shortcuts. Back stacks, drafts and scroll restored from the database after process death (code; not exercised). |

**Looks 8.6 · Behaves 8.9.** Platform fit = (8.6 + 2 × 8.9) ÷ 3 = **8.8**.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.1** | **Earns:** Roboto on a small custom scale (20/17/16/14/12 sp). Curly quotes, ×, − and … throughout. 200% keeps every label whole, with actions moving to their own row. **Holds it below 9:** titleSmall (16 sp SemiBold) is heavier than titleMedium (17 sp Medium), so in Library the group label "Stream" outweighs its section "Subscriptions" (20). Section labels switch between onSurface (Library, Stats) and onSurfaceVariant (Settings, Episode detail "Show notes"). Metadata breaks at its separators: "· 22:00 / 25:34" starts a line in a View row (02), and "45 / min" splits at 200% (11). labelSmall is aliased to 14 sp, so the Now Playing grid labels can't sit below body text. | hierarchy, craft |
| Hierarchy | **8.5** | **Earns:** The squint test passes everywhere. Episode detail's one filled Play Now, the Now Playing transport (112 × 88 dp Play beside 80 dp skips), and the Podcast page's Subscribe each lead. Chrome is quiet. Settings rows carry no icons. **Holds it below 9:** In the Now Playing action grid, 20 dp icons over 14 sp labels feel thin under the transport. The speed tile shows a value in onSurfaceVariant among primary-coloured siblings, so one item reads as a different kind of thing (08). The Podcast page spends about 240 dp, a quarter of the screen, on title, author, link, search and count before the first Episode (23). | content-first, hierarchy |
| Spacing & density | **8.3** | **Earns:** One 16 dp keyline on every screen. Rows of 57–77 dp. An 8 dp heading-to-row gap. Divider insets. Calm list density that suits the posture. **Holds it below 9:** At 200%, Episode rows put the two 48 dp actions on their own row, about 30 dp under short metadata (23, 60). On Connect at 200%, typing makes Discard draft stack above Check and connect and pushes it down about 65 dp (41 → 41b). Edit View at 200% spends about 100 dp of a short viewport on a two-line footer (04). | craft, hierarchy |
| Color & contrast | **8.7** | **Earns:** Restrained and meaningful. Blue for action, link and selection. Green only for Subscribed. Error red only for destructive actions. Dark roles are toned independently. System contrast is followed. All measured text is 4.25 to 11:1. **Holds it below 9:** The one onSurfaceVariant tile in the Now Playing grid breaks the "primary = actionable" rule within the same control set. | color-restraint, accessibility |
| Iconography | **8.4** | **Earns:** One Material Symbols family. Outlined and filled navigation pairs. Skip glyphs carry their numerals. Mark Played (double check) is kept distinct from Subscribed (green check circle). Every icon button has a label and a tooltip. **Holds it below 9:** Timeline rows end in a ⏪ glyph that looks like a button but is decoration; the whole row is the target (14, `TimelineScreen.kt:37`). The grid icons are 20 dp against 24 dp elsewhere. The funnel for Views is a stretch for "saved lists". | conventions, craft |
| Consistency & polish | **8.4 (stability 8.6)** | **Earns:** Every state is designed: empty, error, loading seam, pending spinner, armed, disabled Save, 200%, dark. The flows hold the core still, keep focus and keep typed text. Message placement and wording are uniform. **Holds it below 9:** inventory mismatches 1–3 (quoting, a snackbar and top-bar Undo carried to another tab, Trash's navigation-only action). During an open Rename, Edit View shows Back, Cancel, Save and Done together (04c), which blurs which exit keeps what. Mixed section-label styling across screens. | craft, stability |
| Clarity | **8.2** | **Earns:** Specific verbs: Play Next, Play Last, Check and connect, Save as a View. Errors name a recovery. Search states its scope. Rewind lists exactly what changes. **Holds it below 9:** The mini player and Now Playing show no names (owner), so what's playing is known only by an initials tile. The top-bar Undo is an unlabelled curved arrow that can reverse an action from another screen ("Undo: Updated Appearance" on a Podcast page). Nothing signals that the green check is also the way to unsubscribe (owner). Domain capitalization is dense for a newcomer ("Marked “X” Not Starred", "Counts as Played"). | plain-language, feedback |
| Platform fit | **8.8** | Looks 8.6 · Behaves 8.9 (signals table). **Holds it below 9:** the top-bar global Undo, and live TalkBack and keyboard paths not yet verified. | conventions |
| Interaction & feedback | **8.6** (partial: RESP-01, KEY-01/04/07 and LIST-07 N/O) | **Earns:** Multi-step Undo and Redo on every edit, with Ctrl+Z and Ctrl+Shift+Z. Snackbar Undo backed by a persistent top-bar Undo, so nothing vanishes on a timer. Drafts and an open Rename survive leaving the app. Predictive Back. Accessible drag alternatives. Haptics. Most responses well under 200 ms (emulator upper bounds). **Holds it below 9:** responsiveness unproven on audience hardware, the fling frame overruns, and the keyboard path unexercised. | forgiveness, feedback |
| **Overall** | **8.4** | It serves the primary task well and feels at home on Android. No checklist failure. Every category is Strong. The lowest is Typography at 8.1, so the cap of lowest + 2.0 doesn't bind. What holds Overall below 9.0 is a set of craft gaps, not a defect: type roles that invert, the clarity cost of the name-free player plus a context-free global Undo, and unverified responsiveness and keyboard behaviour. | — |

### What stands between this build and 9.0

1. **Typography roles.**
   - Make titleSmall lighter than or equal to titleMedium, or move Library's "Subscriptions" up to titleMedium SemiBold and its group labels down to labelLarge in onSurfaceVariant.
   - Use one section-label role and colour on every screen.
   - Bind each separator to the token after it with U+00A0, and keep "45 min" together with U+00A0 (`PodListScreens.kt` metadata builder).
2. **Global Undo in context.**
   - Show the top-bar Undo only while its action belongs to the visible screen or tab, or label it with what it reverses.
   - Dismiss snackbars on tab change, so Redo for a Playlist move doesn't ride onto the Library.
3. **One treatment for Playlist names.** Quote either everywhere or nowhere in lists. The Add sheet shouldn't mix “Default” with Commute.
4. **The Now Playing grid.**
   - Label the speed tile like its siblings: "Speed" with the value as the state, or the value in primary.
   - Raise grid icons to 24 dp.
5. **Timeline rows.** Remove the decorative ⏪, or make it the labelled Rewind button.
6. **Large-text layout.**
   - Put Discard draft beside the commit on Connect at 200%, as New View does, so the main action doesn't drop.
   - Let Episode-row actions share the metadata line's baseline when they fit.
7. **Verification.**
   - Run the timed flows on a release build on a mid-range phone, to settle RESP-01 and FOOT-02 and the fling overruns.
   - Run one keyboard pass (Tab and arrows through the tabs, a list, a sheet and the player).
   - Run one TalkBack pass over the mini player.

## Next step

- **Target.** Typography: the lowest-scoring category, with no failures to fix first.
- **Anti-pattern.** None named. Nearest is Box-and-border hierarchy's cousin: hierarchy carried by weight in the wrong direction.
- **Root cause.** The custom scale gives titleSmall (16 sp SemiBold) more visual weight than titleMedium (17 sp Medium), and section labels choose their colour per screen. So type doesn't carry section > group > row consistently.
- **Change.**
  - Set section headings (Library "Subscriptions", Settings sections, Stats sections, Episode detail "Show notes") to one role: titleSmall at 16 sp SemiBold in onSurface.
  - Demote Download Rule group names to labelLarge (14 sp Medium) in onSurfaceVariant.
  - Add non-breaking joins in metadata lines.
- **Principle.** hierarchy, craft.
- **Expected effect.** Typography +0.4 to +0.6, Consistency +0.1. No regression expected. Recheck 200% Library (20) and Settings (06/07).
