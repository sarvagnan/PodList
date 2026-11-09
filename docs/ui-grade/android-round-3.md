# PodList Android phone: UI grade, round 3

Graded 9 Nov 2026 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android, Phone signals). Build: main at `ac062d3`, Pixel 10 Pro XL emulator capture (compact window, 448 dp wide, Android 16), debug build. Independent read: no earlier grading report or work list was opened.

## Frame

- **Task:** find Episodes through saved Views and listen through Playlists that keep their own place.
- **Target:** Android phone (compact window). Tablet and foldable are out of scope.
- **Posture:** sovereign-but-calm personal list app, with a background listening session always one tap away through the mini player.
- **Audience:** perpetual intermediate, a regular podcast listener who has learned the app's vocabulary.
- **Nearest exemplar:** Things (calm personal lists, plain words carrying a model).
- **Character:** PodList blue tonal Material 3 (owner); Views · Playlists · Library bottom bar (owner); a controls-first mini player and Now Playing with no podcast or Episode names (owner); capitalised domain nouns (Episode, Entry, Playlist, Played); plain-spoken helper lines under settings.
- **Owner decisions (scored, not proposed for change):** Material 3 with accent `#2b50c8` and dark theme; bottom navigation; Add podcasts as one field; View editor as one list; Rewind as a summary sheet; OPML in Settings; mini player shows the current Entry paused after relaunch; no names on Now Playing or the mini player; Delete Playlist has no confirmation and offers Undo; Unsubscribe asks first and offers Undo after.

**Evidence:** 44 screens × light, dark and 200% text, each with an accessibility snapshot, plus the Kotlin source and manifest. Not exercised: live TalkBack, rotation, process death, predictive Back animation, Sharesheet, notifications, drag, OPML in progress, keyboard.

## Flows

Not run. The brief rules out driving a device, so the flow-only checks are N/O, the stability sub-score is N/O, and Consistency & polish is marked partial. Nothing below claims a transition was measured. Tasks read through in code: Add to a Playlist, View editing, Rewind, playback, first run, Unsubscribe.

## Cross-screen inventory

| Screen | Success | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Help |
|---|---|---|---|---|---|---|---|---|
| View (list) | Snackbar above player, past tense, "Episode marked Played" | Snackbar | None | Snackbar and ⋮ | Text plus "Edit this View" | None | Row Play and Add | Conditions line |
| View editor | Snackbar plus live count | Inline red under field and in sheet | None | Pinned bar Undo, snackbar, ⋮ | n/a | None | Done, pinned bottom bar, trailing | Hint line |
| Add to a Playlist | Snackbar "Added 1 Entry to Default" | Under the field | None | Snackbar | n/a | None | Play next / Play last, sheet bottom, spread | None |
| New Playlist | Snackbar "Playlist created" | Under the field | None | Snackbar | n/a | None | **Text "Done", bottom trailing** | None |
| Add podcasts | Snackbar, row "Subscribed" | Red text above results | None | Snackbar | n/a | None | **Filled "Find podcasts", under field, leading** | None |
| Connect | Moves on | Red text under field | None | n/a | n/a | None | **Filled "Check and connect", under field, leading** | Line below |
| Select Subscriptions | Snackbar | None | None | Snackbar | n/a | None | **Filled button above the list, leading** | None |
| Playlist | Snackbar | Snackbar | None | Snackbar, ⋮ | Text plus "Find Episodes" | None | Row Play | Summary line |
| Settings (OPML) | Snackbar "OPML exported" | Red text inline; **raw message per feed** | None | Snackbar | n/a | None | Rows | Row help |
| Unsubscribe | Snackbar "Unsubscribed" | Red text under button | Dialog, title only | Snackbar | n/a | None | Dialog, Unsubscribe | None |
| Rewind | Snackbar "Playlist rewound" | None | Sheet summary | Snackbar | n/a | None | Filled Rewind, sheet bottom trailing | "Kept" line |
| Library, first run | n/a | Under the feed row | None | n/a | **"No Subscriptions yet" plus three "No Subscriptions use this Download Rule."** | None | + in bar, row at end | Getting started |

**Mismatches**
1. Main action of single-field forms has three placements and two prominences: New Playlist (text, bottom trailing) against Add podcasts and Connect (filled, under field). Select Subscriptions also differs (filled, above list). FLOW-07.
2. Undo lives in three places at once in the View editor (snackbar, pinned bar, ⋮ menu). Elsewhere two. Not wrong, but it is the source of the always-on ⋮.
3. Same outcome, different error treatment: OPML failures show raw exception text, every other error is authored copy. COPY-02.

## Checklist

**Coverage: 84.7% (pass 57 · fail 4 · N/O 11 · N/A 7).** 79 core items; platform fit scored separately below.

### Failures, by severity

**[KEY-04] major: Entry rows hold an invisible keyboard focus stop.**
- *Where:* every Entry on a Playlist, and the Entries page in Now Playing. `apps/android/app/src/main/kotlin/app/podlist/EntryDragging.kt:95`.
- *Evidence (C):* the row wrapper has `.focusRequester(focus).focusable()` and no indication; its only background is for `moving || marked`. With a keyboard or D-pad attached, Tab lands on an unmarked stop before each row. All other focus targets are Material components with focus states.
- *Fix:* remove `.focusable()` from the wrapper and apply the `focusRequester` to the row's `combinedClickable`, or give the wrapper a focused border through an `interactionSource`.

**[COPY-02] major: OPML import shows raw exception text.**
- *Where:* Settings, Import OPML results. `SettingsScreen.kt:54`, from `apps/android/data/src/main/kotlin/app/podlist/data/LookupErrors.kt:33`.
- *Evidence (C):* each failed feed renders `feedUrl: failure.message`, and the message is `error.message`, an IOException, HTTP or parser string. It is unlocalised and carries no recovery. The fallback "Could not read feed" is hard-coded English. Every other error in the app is authored.
- *Fix:* store the `classifyLookup(error)` result on `ImportFailure` and render it through the existing `lookupErrorResource()` strings, with the feed's title or URL as the row's name.

**[COPY-01] minor: some action labels don't say what they do.**
- *Sleep sheet, Done discards.* `PlayerPresentation.kt:247–256` and `EditorComponents.kt:50`: typed minutes are applied by "Start timer" or the keyboard's Done, but the sheet's own "Done" closes without starting the timer. Two controls named Done with opposite results. *Fix:* use the sheet with no Done (Back and scrim dismiss), or rename to Cancel.
- *New Playlist "Done".* `PlaylistSettingsScreen.kt:60`: the action creates a Playlist, and `m4_create_playlist` ("Create Playlist") already exists unused. *Fix:* use it.
- *Select Subscriptions.* `Selection.kt:72` (capture 27): button reads "Download Rule on this Device", a noun phrase. *Fix:* "Change Download Rule".
- *"Resume" at Position 0:00.* `PodListScreens.kt:413` (capture 03): nothing to resume. *Fix:* "Play" when Position is 0.

**[FLOW-07] minor: the main action of a single-field form moves between screens.**
- *Where:* captures 19, 26, 41 (and 27). New Playlist puts a plain text "Done" at the bottom trailing corner, above a screen of empty space; Add podcasts and Connect put a filled button directly below the field, leading.
- *Fix:* give New Playlist a filled "Create Playlist" button below the field, as Add podcasts and Connect have.

### N/O
FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-07, LIST-07, PTR-03, APPEAR-11, WIN-03, RESP-01, FOOT-02.

Code hazards inside the N/O items, for a device check (not scored):
- FLOW-04: `EditorSheet`s that stay open after a choice (Published, Podcasts, Mentions, Length, Download Rule) fire a snackbar in the window below the sheet's scrim, so its Undo can't be tapped until the sheet closes (the ⋮ and editor bar still offer Undo).
- APPEAR-11: `styles.xml` parents `Theme.Material.Light` with `windowBackground` transparent and no `values-night`, so a dark-mode launch may start light. First opening of each route shows `Loading()` ("Loading local Library…") until `cache[route]` fills (`PodListScreens.kt:187`).
- FLOW-02/TalkBack: inline errors have no `liveRegion` (`AddPodcastsScreen.kt:75`, `ServerScreen.kt:30`); only the moved Entry announces. The mini player's outer `clickable` has no `onClickLabel` (`PlayerPresentation.kt:122`), and every Entry row sets `selected = marked`, so each is exposed as not selected (snapshot 11 `[unchecked]`).

### N/A
KEY-08 (no shortcuts beyond standard Undo/Redo), LIST-04, LIST-05, START-05 (no permission prompts in-app), START-07, SIDE-03, SIDE-04 (compact phone window has no side-by-side panes).

### Passing items with a note
- **DLG-01:** the single confirmation in the app is Unsubscribe, an infrequent, deliberate action with a title-only dialog and Undo after (owner). Passes, as not routine; it costs the Interaction score a little.
- **DLG-07:** sheets show Done alone (edits apply as made) or Cancel with an action; never all three.
- **APPEAR-03:** Light and Dark each have a full custom scheme and stay usable. The guide gives Android no contrast-preference clause. The app doesn't read Android's Contrast setting (`UiModeManager.getContrast`, API 34+, this app's minSdk); see craft gaps.
- **APPEAR-04 (measured from the theme):** light primary on surface 6.46:1, secondary text 8.86:1, Played 6.10:1, error 6.13:1, white on primary 6.81:1; dark primary 10.93:1, secondary 10.89:1. Field outlines 4.25:1 light, 5.83:1 dark. Passes throughout.
- **DATA-06:** read through Android's contract: `rememberSaveable` on destination, navigator, tab scroll and selection covers rotation and process death. Saved state doesn't resurrect a deliberately dismissed task; not exercised on a device.
- **TYPE-05:** 200% capture shows no clipped essential text; rows stack their actions and values below the title.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **7.8** | Episode title (16 Medium) over 12 sp metadata carries the list; titles wrap to three lines with ellipsis; 200% holds. Below Exemplary: stock `Typography()` throughout; Timeline stacks three or four same-style lines per row; two consecutive 12 sp lines of equal weight on every Episode row. | `hierarchy`, `craft` |
| Hierarchy | **7.4** | Filled Play now and the 112×88 dp Play control lead; chrome is light. Held down by the always-present ⋮, a repeated blue "Rewind to here" on every Timeline row, section headings equal in weight to actions, and a Cursor marked only by a small blue "Now". | `content-first`, `hierarchy` |
| Spacing & density | **7.5** | 16 dp rhythm; 48 dp targets (`ActionIcon`, `ChoiceRows`, `heightIn`); density suits touch. Off-grid: Clear on Played sits at 32 dp against 16 elsewhere (`PlaylistSettingsScreen.kt:31` padding plus `ListItem`, capture 16); "Save as a View" at 12 dp inset (capture 21); Now Playing's lower third empty (capture 08); New Playlist's Done alone at the bottom of an empty screen. | `craft`, `conventions` |
| Color & contrast | **8.2** | One accent, tonal roles, a dark theme toned independently, red only on destructive actions, every measured pair at or above 4.5:1. Below Exemplary: primary means section heading, tappable text, and changed value at once; `tertiary` appears only on "Played". | `color-restraint`, `accessibility` |
| Iconography | **7.6** | One consistent set; skip glyphs with numerals read at once; every icon-only control has a label and long-press tooltip. Held down by Episode detail's icon-only row (+, ✓, ☆, share) with a Mark Played glyph that never changes state; ⋮ meaning Undo and Redo; back arrow labelled Cancel in the selection bar. | `conventions`, `craft` |
| Consistency & polish | **7.2** (stability N/O; partial: no flow run) | Empty, error, disabled, loading and selected states are designed, and snackbar copy follows one past-tense pattern. Held down by FLOW-07, the stats chart that opens with no bars, and left edges of Delete View, Delete Playlist, Mark all Played and Unsubscribe that vary. | `craft`, `stability` |
| Clarity | **6.9** (cap; uncapped 7.6) | Plain helper lines ("Stored while they're in a Playlist"), Default (30 seconds) naming what's inherited, Rewind's what-changes summary. Capped by COPY-02. Also the COPY-01 labels and the Now Playing line that reads "No Chapters available" as the screen's only text for chapterless Episodes. | `plain-language`, `feedback` |
| Platform fit | **8.5** (Looks 8.6, Behaves 8.4; Behaves from code) | Native Back order, predictive handlers, Sharesheet, adaptive scaffolds; see below. No major failure in the groups that cap this category. | `conventions`, `stability` |
| Interaction & feedback | **6.9** (cap; uncapped 8.0; partial: no flow run or live TalkBack) | Undo on nearly every action with reveal of the result, live autosaved editors, determinate progress where measurable, Move up/down beside drag, full Back order. Capped by KEY-04. Also a confirmation where Undo already exists, and no haptics on drag or long-press. | `forgiveness`, `feedback`, `keyboard-efficiency` |
| **Overall** | **7.6** | It serves the task and is at home on Android. Two major checklist failures hold Clarity and Interaction at the Competent cap, and a stock Material type and motion layer keeps the visual categories in Strong. Lowest category 6.9, ceiling 8.9, not binding. | |

### Platform fit signals

| # | Signal | Verdict | Evidence |
|---|---|---|---|
| L1 | Navigation | Native | Three-destination bottom bar; Up only on inner screens; title, Up, actions distinct (captures 01–02). |
| L2 | Visual language | Native | Consistent Material 3; one icon family. |
| L3 | Density, text, frame | Native | 48 dp targets by code; body text 12 sp minimum; drawn edge to edge, controls clear of bars; no clipping at 200%. Skip numerals are pinned to font scale 1, inside a 30 dp glyph (`PlayerPresentation.kt:223`); 11 sp only on two chart axis labels. |
| B1 | System navigation | Native (code) | `PredictiveBackHandler` and `NavigableListDetailPaneScaffold`; order is sheet, player pages, collapse, stack; selection clears before leaving; non-Views roots return to Views. Animation not exercised. |
| B2 | Preferences and access | Adapted | TalkBack names in snapshots, sp text, system light/dark. No in-app Light/Dark/System choice; System default is the recommended default. Live TalkBack not exercised. |
| B3 | System surfaces, lifecycle | Adapted | Sharesheet via chooser (`PodListScreens.kt:402`), launcher shortcuts, no permission wall, saved state in code. No widget; no `POST_NOTIFICATIONS`, so download progress notifications won't show on Android 13+. |

**Side-by-side test (beside Google apps):** nothing breaks Android behaviour and nothing is hidden that Android would show. The one foreign-feeling element is the permanent overflow menu that contains only Undo and Redo.

## Next step

- **Target:** KEY-04, the major failure in the joint-lowest category, tied with COPY-02 (6.9) and closest to the primary task.
- **Anti-pattern:** invisible focus stop. **Root cause:** a focus target added for post-move announcement and focus return is left in the Tab order with no focus treatment.
- **Change:** move the `focusRequester` to the Entry row's existing `combinedClickable` and remove `.focusable()` from the wrapper.
- **Principle:** `keyboard-efficiency`. **Expected effect:** lifts the Interaction cap. Do COPY-02 next; it lifts the Clarity cap with existing strings. Neither touches a signature element.

## What stands between this build and 9.0

The two major failures must go first; with them gone the cap on Interaction and Clarity lifts to the uncapped scores above, about 8.0 overall. The rest is craft, in order of effect:

1. **The Listening stats chart opens empty.** Each day is 56 dp wide (96 at large text) in a horizontal scroller that starts at the oldest day, so only about 7 of 30 days fit; the capture shows blank space while the line below reads "Nov 9 · 1 minute", and the axis labels claim the full 30 days (`ListeningStatsScreen.kt:72–73`, captures 33–35). Fit all 30 days to the width and keep a tall hit column per day, or at least open scrolled to today.
2. **Always-present ⋮ for Undo and Redo.** On every top bar and the Now Playing header, in all 44 captures, usually with both items disabled, using the same glyph as Entry actions (`SubscriptionRefreshStatus.kt:33`). Hide it when nothing is undoable, or rely on the snackbar plus Ctrl+Z.
3. **Blue does three jobs.** Section headings are the same colour and weight as tappable text buttons and changed values. Reserve primary for actions; set headings in `onSurfaceVariant`.
4. **The current Entry is barely marked.** A small blue "Now" over an unmodified row is the only signal of the most important row in a Playlist. Tint the row or put the Cursor mark in the row itself.
5. **Now Playing is top-heavy.** 216 dp Artwork on a 448 dp width and an empty lower third leave the largest controls away from the thumb, and chapterless Episodes get "No Chapters available" as the only label. Size Artwork to the space, anchor the transport row low, and drop the row when there are no Chapters.
6. **Timeline rows spend height.** Date, time and event on separate 14 sp lines, with a link on every row. One line ("Nov 6 · 2:30 PM · Entry added") and a Rewind action moved to the row's own surface would let a screen hold more of the day.
7. **Finish the edges.** Align Playlist settings to 16 dp and the "Save as a View" button to the field; fold the three repeated "No Subscriptions use this Download Rule." lines on first run; add haptics to drag start and long-press selection; answer Android's Contrast setting with medium and high schemes selected from `UiModeManager.getContrast`.
8. **Character beyond stock.** The structure is thought through, but `Typography()`, default motion and shapes are unmodified. Exemplary needs a small deliberate layer (a type adjustment for Episode titles, a considered player motion) inside the fixed Material 3 and accent decisions.
