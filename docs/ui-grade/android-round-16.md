# PodList Android phone: UI grade, round 16

Graded 2026-11-11 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit; core-checklist.md; platform-fit.md § Android › Phone; rubric.md). Build: `main` at dbda082. This grade was made without reading earlier rounds.

Evidence:
- **Capture:** `scratchpad/android-grade-16/`, which holds 54 screens in each of `light/`, `dark/` and `font200/`, each as a PNG and an accessibility snapshot. It ran on an emulator with the Pixel 10 Pro XL profile, Android 16, a 1344×2992 px screen, density 3.0 and a 448 dp compact window.
- **Flow run:** `scratchpad/flow-run/20261111-003715-999/`, with `summary.md`, `measurements.csv`, `timings.csv`, `frames.csv` and a strip of 355 frames.
- **Code:** `apps/android/app/src/main`, plus `docs/design/android.md`, `CONTEXT.md` and ADRs 0011–0013.

Units are dp. On the capture, dp = px ÷ 3. On the 900 px-tall review copies, dp ≈ px × 1.11.

## Frame

- **Task:** find Episodes through Views or Search and queue them into Playlists. Then listen through the mini player and Now Playing, and manage Subscriptions in the Library.
- **Target:** Android phone, compact window. Tablet and foldable are out of scope.
- **Posture:** sovereign for browsing and queueing, and transient while playing, because the mini player and Now Playing sit over every screen.
- **Audience:** a perpetual intermediate who listens to podcasts every day.
- **Nearest exemplar:** Things, for calm lists, plain domain words and finished states. On Android, the reference set is Google's Material 3 apps, such as Gmail, Keep and Calendar.
- **Character:**
  1. Native Material 3 with the blue `#2b50c8` seed and a dark theme toned independently *(owner)*.
  2. Plain text-only rows on the Views and Playlists roots.
  3. Capitalized domain vocabulary: View, Playlist, Entry, Played, Subscription, Download Rule.
  4. A control-first mini player and Now Playing that show no podcast or Episode names *(owner)*.
  5. Undo after every change instead of confirmation dialogs *(owner, for Delete Playlist and Unsubscribe)*.
- **Owner decisions:** these are graded but are not targets.
  - Bottom navigation with Views, Playlists and Library.
  - Add podcasts as one field.
  - The View editor as one list.
  - Rewind as a summary sheet.
  - OPML in Settings.
  - The paused mini player after relaunch.
  - No names in the players.
  - Delete Playlist with no question first, a "moved to Trash" message and Undo.
  - The compact Podcast page, with the description behind a pull-down, Subscribe in the top bar and a green check.
  - Two-tap Unsubscribe with Undo.
  - An explicit Rename step with Cancel and Save.
  - Unique names, ignoring case.
  - No in-app shortcut list. Undo and Redo are registered with Android's Keyboard Shortcuts panel.

## Flows

- **Tasks run:** five, from `summary.md`:
  - A: Views → View → Episode → Add to a Playlist → Undo.
  - B: Playlist → Play → Now Playing → collapse → pause → Entry menu → Move down → Undo.
  - C: Library → Add podcasts → Podcast page → filter → Subscribe while typing in Search Episodes → Undo → next item.
  - D: New Playlist → Create → Settings → Rename → Save → Undo.
  - E: Library Search → Save as a View → Create View.
- **Width:** 448 dp compact. This is the only width that applies to the phone target.
- **Appearances:** Light and Dark, each set through Settings → Appearance.
- **Delayed pass:** 2000 ms added to each HTTP completion. Timed passes: 5 per appearance with no added delay, on a debug build in an emulator on a Mac host. That isn't audience hardware.
- **Script:** `apps/android/app/src/androidTest`, documented in `apps/android/README.md`.
- **Files:** `measurements.csv`, `timings.csv` and `frames.csv`, plus a screenshot strip in the same folder.

**Method:** sound and conservative. It compares settled captures, excludes frames captured mid-transition, protects edits made while a request is pending (FLOW-03), and audits every excluded candidate. Its one limit is that it leaves "onset unobserved" candidates as N/O. I resolved those from the rows:

- **FLOW-01, 4 unresolved candidates → pass.** The subscription control's left edge moves 8.3 dp, but the move happens on the person's tap, not at the late completion:
  - Before the tap (row 89), the control sits at x 273.0, 111.0 wide.
  - In the input capture 108 ms after the tap (row 90), it already sits at x 281.33, 102.67 wide. That is inside the 500 ms window, so the person caused it.
  - At the completion that arrives 3149 ms after input (row 98), it still sits at x 281.33. Nothing moves.
  - Undo is the mirror image: 84 ms after input (row 104) the control is back at x 273.0, and it holds at completion (row 106). Dark rows 292 → 294 match.
- **FLOW-02 pass.** Focus stays in Search Episodes through Subscribe completion (rows 97 → 98).
- **FLOW-03 pass.** "Long E", typed while Subscribe was pending, survives completion 2567 ms (Light) and 2616 ms (Dark) after typing.
- **FLOW-04 pass.** `follow_up_visible` is true for every snackbar. The snackbar follows the keyboard: y 453 → 765 dp at rows 289 → 290.
- **FLOW-05:** N/A. A compact window has no side-by-side panels.
- **FLOW-06 and FLOW-07 pass,** judged from the strip and the capture. See the checklist.
- **RESP-01 and FOOT-02:** N/O.
  - These are debug-emulator timings. Some steps settle after more than 1 s without a busy indicator being observed: D/rename runs 4–5 at 1233–1267 ms (timings rows 197 and 249), C/dismiss-keyboard at 1062–1472 ms, and E/search run 2 at 1056 ms.
  - In the long-list fling, `frames.csv` records all 22 Light frames and all 21 Dark frames past the frame deadline.
  - Neither can count as a failure on a debug emulator. Both need a release build on a physical mid-range phone before they can be called a pass.

**Flow failures:** none.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views root | Snackbar above mini player: "Created View “…”" | Strip under the top bar: "Sync error · Showing local data." + Retry | none | Snackbar Undo; afterwards an Undo icon in the top bar | "No Views yet" + tonal New View | none | + in top bar | Getting started card (Hide), also in Settings › Help |
| View | Snackbar, same place | same strip | none | same | "No Episodes match this View" + tonal Edit this View | none | Row Play / Add | Summary line under the count |
| Episode detail | Snackbar: "Added 1 Entry to Default" | Inline on the row with Try again (Podcast-page Episodes) | none | same | "Episode details are still syncing" | none | Full-width filled Play Now | none |
| View editor / New View | Snackbar on commit | Inline under the field (`InlineError`) | Condition sheets with Done | Undo still reachable | n/a | none | Pinned footer: count + filled Done / Create View, text Discard draft | Footer note: "Conditions change this View right away…" |
| Playlist (Entries / History / Timeline) | Snackbar: "Moved … in Default" | Snackbar (playback) + Retry on the transport | Rewind sheet: Cancel / Rewind | Snackbar + top-bar Undo | "No History yet. Finish an Episode…" + tonal Show Entries | none | Row Play from here | Timeline hint line |
| Playlist settings | "Renamed Playlist to “…”", "Playlist Commute moved to Trash" | Inline under the name field | none | Snackbar | n/a | none | Outlined Rename → inline Cancel / filled Save | Note under Delete Playlist |
| Trash | "Restored Playlist “…”" snackbar | — | none | Snackbar | "No deleted Playlists" + hint + tonal Back to Playlists | none | Text Restore per row | Hint |
| Library | Snackbar | Per-subscription inline "Couldn't refresh…" + Retry | none | Snackbar | "No Subscriptions yet" + tonal Add podcasts (no explanation) | none | + in top bar | Download Rule help under each group |
| Add podcasts | Row Subscribe → snackbar "Subscribed to …" | Inline under the field | none | Snackbar | n/a | none | Filled Find podcasts, trailing under the field | none |
| Podcast page | Snackbar "Subscribed to Long listening" + Undo | Inline in the header | Armed Unsubscribe (red text) | Snackbar | n/a | none | Filled Subscribe / green check in the top bar | Pull-down details |
| Connect to a server | Navigates on success | Inline under the field | none | — | n/a | none | Filled Check and connect, trailing under the field | Explanatory lines above and below |
| Settings | Snackbar for setting changes | Inline in the list (OPML) + Retry | Sheets with Done | Snackbar | n/a | none | Rows | Section hints |
| Listening stats | — | — | none | — | "No listening yet…" + tonal Find something to play | none | n/a | "About your stats" |

**Mismatches:**
1. **Empty states take three forms.**
   - A one-line title plus a button, with no explanation: Views, Playlists, Library and View with no matches.
   - A title plus a hint plus a button: Trash.
   - One explanatory sentence plus a button: History, Timeline and Listening stats.

   The Library's "No Subscriptions yet" is the only first-run empty state that doesn't say what a Subscription gives you.
2. **Two outlined-button styles.**
   - Welcome and Bring over use the stock `OutlinedButton`, with an onSurfaceVariant label and an outlineVariant border at 1.62:1.
   - Every other outlined button uses `ContentActionButton`: Rename, Delete, Mark all Played and Show table, with a primary label and an outline border at 4.25:1.
3. **Row anatomy differs between Episode lists and Entry lists.**
   - Episode rows have artwork, a title, and metadata and state on two lines, with the actions inline.
   - Entry rows have a handle, a title held at two lines, and metadata and state merged into one line, with the actions stacked vertically.

   An Entry's metadata sits about 45 dp below a one-line title, against about 21 dp in a View (11-playlist and 02-view).

Success wording ("past-tense verb + object"), snackbar position (above the mini player, Undo trailing), inline error position and red error color are consistent everywhere.

## Checklist

Coverage: **90.1%** (pass 64 · fail 0 · N/O 7 · N/A 8).

**Failures by severity:** none. No item has a verdict of fail.

**Pass, with the key evidence:**
- **FLOW-01, 02, 03, 04:** the flow run and the rows above.
- **FLOW-06:** no section heading appears empty. The Rewind sheet's "Unplayed again" says "None". No block disappears while typing; Getting started leaves only when Hide is tapped.
- **FLOW-07:** single-field forms commit trailing, under the field: New Playlist, Add podcasts, Connect and Rename. The View editor's pinned footer is a different kind of screen, agreed by the owner.
- **KEY-01, 04, 06, 08:**
  - Every command is a Material control or a clickable, toggleable or selectable element, none made unfocusable.
  - `FocusedInputModifier` focuses new input tasks.
  - Ctrl+Z, Ctrl+Shift+Z and Ctrl+A are used without awkward modifiers.
  - `onProvideKeyboardShortcuts` registers Undo and Redo (MainActivity.kt).
- **DLG-01 to 05, 07 and 09:**
  - The only alert is the notification pre-prompt: "Show download progress?" with Continue and Not now.
  - Rewind uses a sheet with Cancel and Rewind.
  - Delete is red.
  - Menus open from their anchor.
- **CTRL-03 to 08:**
  - Fields have floating labels.
  - Number fields show inline, field-specific errors.
  - Search scope is in the label ("Search the Library", "Search Episodes").
  - OPML import shows determinate progress with Stop. Subscribe shows a spinner in place.
- **LIST-01, 02, 03, 05, 06, 07:**
  - The stats table has Day and Time listened columns.
  - Sort lives in the View editor, as the Android clause allows.
  - The Podcast details disclosure is restored through the browsing state.
  - Radios mark choices.
  - Tap opens and long-press selects.
- **DATA-01, 04, 05, 06:**
  - Form drafts go to the database and are flushed `onStop`.
  - Undo and Redo are multi-step through `history.record`, with `revealChanges`.
  - Destination, back stacks, scroll, selections and the stats day persist in `BrowsingContext`.
- **DRAG-01, 03:** drag to reorder has Move up and Move down in the Entry menu and as accessibility custom actions, and a move offers Undo.
- **PTR-04:** every `ActionIcon` has a `PlainTooltip` on long press.
- **APPEAR-03, 04, 05, 09, 10, 11:**
  - Light, Dark and System default all work, and `UiModeManager.contrast` raises primary, onSurfaceVariant and the outlines.
  - Measured contrast: onSurfaceVariant 8.86:1, primary 6.46:1, primary on secondaryContainer 5.28:1, error 6.13:1, snackbar Undo 7.71:1 (Light) and 5.27:1 (Dark), white on the subscribed green 6.57:1, and dark primary 10.93:1.
  - Compose honors the system's animation-scale setting.
  - The window background follows the chosen appearance, so frames don't flash.
- **TYPE-02, 03, 05, 06, 07, 08:**
  - Roboto, with sizes in sp.
  - At 200%, everything wraps and nothing clips. Page actions move to a second bar row, grids drop to two columns, and stat tiles stack.
  - "About your stats" runs about 50 characters per line at 150% leading.
  - The app uses curly quotes, “…”, and a true minus in "−16:34".
- **COPY-01 to 04:** verbs are specific, the glossary capitalization holds, errors say how to recover ("Couldn’t reach the server. Check its address…"), and empty states each offer an action.
- **AX-01, 02, 04, 05:**
  - Every icon button is named in the snapshots.
  - "Current Entry" is shown as text, not only as color.
  - The chart has day buttons and a table.
  - Audio never starts by itself.
- **START-01 to 06:**
  - Getting started is hideable, stays hidden, and can be found again in Settings › Help.
  - The notification permission is asked at the first download, with a reason.
  - No account is needed: a Standalone Device works without a server.
- **EDIT-05:** Copy feed address and Share Episode go through the system Sharesheet (`Intent.createChooser`).
- **SET-01:** app-wide options are in Settings, Playlist options are with the Playlist, and Subscription options are on the Podcast page.

**N/O:**
- KEY-07: Page Up, Page Down, Home and End were not exercised.
- DRAG-05 and DRAG-06: the drag wasn't run, though the code has a 64 dp edge autoscroll.
- PTR-03.
- WIN-03: no rotation or landscape capture.
- RESP-01 and FOOT-02: emulator and debug build.

**N/A:**
- FLOW-05: compact window.
- CTRL-02: no checkbox hierarchy.
- LIST-04: no dense multi-column rows.
- START-07: no accounts.
- EDIT-02: no editor beyond the native fields.
- TOOL-06: no toolbar people can hide; the app hides the navigation in context and brings it back.
- SIDE-03 and SIDE-04: no sidebar on a phone.

### Platform fit signals (Android › Phone)

Side-by-side with Gmail, Keep and Settings: there is nothing Foreign. Two idioms are unfamiliar:
- A standing **Undo icon** in browse top bars, and a "More actions" overflow on every screen whose only item is **Redo**. Google apps keep Undo in the snackbar.
- **Top-bar actions moved to a second row** at a font scale of 1.5× or more. Android normally keeps actions in the bar and sends the extras to the overflow. This one is Adapted, not Foreign: it keeps every action reachable and the title readable.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native | Bottom bar with three equal destinations (01). Top app bar with title, Up on inner screens and actions (02, 06). No Up at the roots. Settings, + and Search in root bars, as designed. |
| L2 Visual language | Native | Consistent M3: filled, tonal, outlined and text buttons, snackbars, modal sheets, switches, tabs, radios. One Material symbol set. Initials tiles for missing artwork. |
| L3 Density, text, frame | Native | `ActionIcon` is 48 dp, and buttons and rows have `heightIn(min = 48.dp)`. Smallest text is 12 sp (bodySmall). Edge to edge, with `safeDrawing` insets. The 200% captures show no clipping. |
| B1 System navigation | Native (C) | `NavigableListDetailPaneScaffold` (predictive Back) and `enableOnBackInvokedCallback`. Back runs in order: close the sheet, the selection or an armed Unsubscribe; then player pages; then collapse the player (`PredictiveBackHandler`); then the stack. Root Back returns to Views. The live animation wasn't observed. |
| B2 Preferences and access | Native | TalkBack names in every snapshot. Text scales to 200%. System default, Light and Dark. The system contrast level is honored. No in-app language override. |
| B3 System surfaces and lifecycle | Native | Sharesheet, a "downloads" notification channel, the permission asked in context, state kept in the database across process death, launcher shortcuts, and a MediaLibraryService that works with Android Auto. Process death itself wasn't run. |

**Looks 8.6 · Behaves 9.0 → Platform fit 8.9.** Platform fit = (Looks + 2 × Behaves) ÷ 3.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.4** | A deliberate, commented scale: titleMedium 17 sp for row titles, bodyMedium 14 sp for metadata, bodySmall 12 sp for annotations, and one Roboto family. The scale survives 200%. Below Exemplary because type doesn't always carry the structure. (1) The Library group header is a 12 sp "Download Rule" overline over a 14 sp grey "Stream" label, so the group name reads weaker than its caption and far weaker than the 17 sp rows it introduces (20-library). (2) The "Listening Timeline" tab wraps to two lines in a fixed three-tab row (11, 13, 14). (3) On Episode detail, "Add to a Playlist" wraps while Mark Played, Star and Download don't, so the labels lose a common baseline (03). | `hierarchy`, `craft` |
| Hierarchy | **8.3** | One filled primary per screen almost everywhere: Play Now, Create View, Check and connect. Chrome is quiet, and the root lists are plain text. Below Exemplary because: (1) Add podcasts with a result shows two filled buttons, Find podcasts and Subscribe, in the first 100 dp (59). (2) Every top bar carries a "More actions" button even where its only item is a disabled Redo: Views, Playlists, Library, Settings, Trash, New Playlist, Stats and Search. That puts a fourth or fifth icon in root bars that already hold Search, + and Settings. (3) The Welcome screen stacks everything into the top 35% and leaves the rest blank, with no mark of the product (40). | `content-first`, `simplicity-not-minimalism` |
| Spacing & density | **8.3** | A 16 dp keyline throughout, 48 dp targets, and calm list rhythm on the roots. Below Exemplary because: (1) Entry rows force `minLines = 2` on the title, leaving a blank line, so a one-line Entry is about 111 dp tall with its metadata about 45 dp below the title, against about 100 dp and 21 dp in a View (11 vs 02). (2) The helper text under Delete Playlist and Delete View sits about 2 dp under the button, while every other value or help line is 8 dp below its label (16c, 04b). | `craft`, `hierarchy` |
| Color & contrast | **8.7** | Every measured text pair passes in both themes (see APPEAR-04), and the system contrast setting is honored. Color carries fixed meanings: blue for interactive, green check for Subscribed, red for destructive or Unsubscribe, tinted rows for selection or the Cursor. Below Exemplary because: (1) The Server address placeholder (#46464f) is only 1.84:1 apart from typed text (#1b1b21), so "https://podlist.example" reads as an entered value (41 vs 41b). (2) The Welcome and Bring over outlined buttons use a 1.62:1 border and a grey label, off the app's own outlined style. | `color-restraint`, `accessibility` |
| Iconography | **8.6** | One Material symbol family. Standard glyphs for standard actions: search, add, settings, edit, play, queue-add, skip 15 and 30, check. Every icon-only control has a tooltip and a label. Below Exemplary because: (1) "Select Subscriptions" is a list row with a leading select-all glyph, styled like the podcast rows above it (20). (2) The Timeline's trailing ◀◀ uses the media rewind glyph for "rewind this Playlist to here", which a listener can read as "seek back" (14). (3) The Unsubscribe control's merged label reads "…Activate to show Unsubscribe., Subscribed": the icon's description repeats, with stray punctuation (23-subscription.txt @e105). | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability 8.7) | Every state is designed: loading, empty, error, disabled, busy-in-place, selected, armed, Cursor. Snackbars, inline errors and success wording are identical across screens. The 200% layouts are adapted by hand. Stability is Strong: core elements hold through every flow step in both appearances, typed text survives late completions, and every follow-up is visible. Its only deduction is the message-form mismatches in the inventory. The category stays below 9 because of the three inventory mismatches (empty-state forms, two outlined-button styles, Entry and Episode row anatomy), and because after returning to Connect the caret sits at the start of the restored address rather than the end (41b). | `craft`, `stability` |
| Clarity | **8.2** | Domain words are consistent and defined in CONTEXT.md. State is always visible: Current Entry, progress, Played and Unplayed, the subscribed check, the live count in the View editor. Below Exemplary because several controls say more or less than they do. (1) "More actions" usually opens a menu with one disabled item, Redo. (2) Add podcasts shows a ✕ clear in the field and "Discard draft" beside Find podcasts, two controls for the same reset, and calls a search query a "draft" (59). (3) In Edit View, "Conditions change this View right away. Unfinished edits stay here until you finish them." sits directly under Delete View, so it reads as Delete's explanation (04b). (4) The Library's group header reads like a setting ("Download Rule: Stream") rather than a group title. (5) The placeholder looks like a value (41). | `plain-language`, `feedback` |
| Platform fit | **8.9** | Looks 8.6 · Behaves 9.0 (see the signals). Native on all six signals. Held back by the persistent top-bar Undo and Redo idiom, and by the second-row action bar at large text. | `conventions` |
| Interaction & feedback | **8.8** (partial: response times and frame pacing N/O) | Forgiving throughout: multi-step Undo and Redo with Ctrl+Z, Undo instead of confirmations, drafts that survive process death, optimistic Subscribe that keeps its slot, a two-tap Unsubscribe that stretches its timeout to the accessibility setting, Move up and Move down for drag, and an in-place spinner rather than a blocking dialog. Below Exemplary: Undo shows in two places in sequence (snackbar, then a top-bar icon that pops in once it times out). Response times and frame pacing aren't verified on real hardware: several steps settle after more than 1 s, and every fling frame missed its deadline in the debug emulator. | `forgiveness`, `feedback`, `keyboard-efficiency` |
| **Overall** | **8.5** | A carefully built, forgiving, native Android app with no checklist failures at 90% coverage. Its remaining distance from Exemplary is craft: chrome that promises more than it holds, a few labels and help lines in the wrong place, and three cross-screen inconsistencies. Clarity (8.2) holds Overall down most. The cap would be lowest + 2.0 = 10.2, so it doesn't bind. | — |

## What stands between this build and 9.0

There are no checklist failures, so no cap applies. Reaching 9.0 means moving Clarity, Hierarchy, Spacing and Typography from the middle of Strong into Exemplary. In order of payoff:

1. **Remove the Redo-only overflow** (Clarity, Hierarchy, Platform fit).
   - **Where:** `HistoryOverflow` in SubscriptionRefreshStatus.kt, used by `ScreenFrame` on every screen.
   - **Fix:** show "More actions" only where the menu has a real command (Episode: Download, Share; Podcast page: Share, Copy feed address). Offer Redo as a snackbar action right after an Undo ("Undone: … · Redo"), and keep Ctrl+Shift+Z.
   - **Effect:** root bars drop to Search, + and Settings.
2. **One reset control on Add podcasts** (Clarity, Hierarchy).
   - **Where:** AddPodcastsScreen.
   - **Fix:** keep the field's ✕ and drop "Discard draft" there. Show the results' Subscribe as tonal, or as outlined like the directory row, so Find podcasts stays the only filled button.
3. **Move the Edit View footnote** (Clarity, Spacing).
   - **Where:** ViewEditor.
   - **Fix:** put "Conditions change this View right away…" under the "Show Episodes where" heading. Give the Delete View and Delete Playlist helper text 8 dp above it, matching the other help lines.
4. **Entry rows** (Spacing, Consistency).
   - **Where:** `EpisodeRow` with `entryPlaylist`.
   - **Fix:** drop `minLines = 2`. Instead, centre the 48 dp Play-and-menu column against the row. Split metadata and state onto two lines, as Episode rows do.
   - **Effect:** a one-line Entry falls from about 111 dp to about 96 dp, and the two lists share one anatomy.
5. **Library group header** (Typography, Clarity).
   - **Fix:** render the rule name as the group title, in titleSmall 16 sp semibold in onSurface ("Stream"). Make the help line the supporting text, and drop the "Download Rule" overline, or fold it into the help ("Download Rule: …").
6. **Tab and action labels that wrap** (Typography).
   - **Fix:** make the Playlist tabs a scrollable `PrimaryScrollableTabRow`, or shorten the label to "Timeline" in the tab only, keeping the full term in its heading. Give the Episode detail action grid `minLines = 2` on every label, or use the shorter "Add" as the grid label, so the four labels share a baseline.
7. **One outlined-button style** (Color, Consistency).
   - **Fix:** use `ContentActionButton` for "Connect to a server" and the Bring over buttons.
8. **Placeholder and caret** (Color, Clarity, Polish).
   - **Fix:** make the Server address example supporting text ("For example, https://podlist.example") or put the placeholder at 60% alpha. Place the caret at the end of a restored draft.
9. **Empty states** (Consistency).
   - **Fix:** use one form everywhere: a title, one sentence on what fills this place, and the action. For example, Library: "No Subscriptions yet · Subscribe to podcasts to fill Views with their Episodes · Add podcasts".
10. **Welcome** (Hierarchy).
    - **Fix:** centre the content block vertically, or anchor the two buttons to the bottom thumb zone, and add the app icon above "PodList".
11. **Verify responsiveness** (Interaction).
    - **Fix:** rerun the timed passes and the fling on a release build on a physical mid-range phone.
    - **Effect:** RESP-01 and FOOT-02 move from N/O to verdicts. Steps that settle after 1 s need a busy indicator.

## Next step

- **Target:** Clarity, the lowest-scoring category. No blockers or majors are open.
- **Anti-pattern:** chrome that promises more than it holds (a "More actions" overflow with no actions).
- **Root cause:** the history commands (Undo and Redo) are given a permanent home in every top bar instead of living with the feedback that creates them.
- **Change:** drop `HistoryOverflow` from bars with no other menu items, and offer Redo in a snackbar after Undo. Keep Ctrl+Z and Ctrl+Shift+Z.
- **Principles:** `simplicity-not-minimalism`, `discoverable-commands`.
- **Expected effect:** Clarity +0.3, Hierarchy +0.2 and Platform fit Looks +0.2, with no regressions. Redo stays reachable from the keyboard and appears right after Undo, which is when it's useful.
