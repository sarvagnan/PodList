# PodList Android phone: UI grade, round 2

Build: main at cccd2e5. Graded from the capture (light, dark, 200% text; screenshots and accessibility snapshots on a Pixel 10 Pro XL emulator, Android 16, compact window, about 448 dp wide) and from the code under `apps/android/app/src/main`. No device was driven. This read is independent of earlier grades. Screen numbers below are the capture's.

## Frame

- **Task:** build the queue you want to listen to (find Episodes through Views, Search or the Library, put them in a Playlist) and play it.
- **Target:** Android phone, compact window. Tablet and foldable are out of scope.
- **Posture:** sovereign when managing Views and Playlists; background and transient while listening (mini player).
- **Audience:** perpetual intermediate; a podcast listener who wants more control than a stock player gives.
- **Nearest exemplar:** Things, for the calm named lists and the plain words carrying a model. The Android gallery's closest comparison is BuzzKill's consequence-under-the-name rows.
- **Character:** accent #2b50c8 on tonal surfaces (owner); domain nouns capitalized as vocabulary (Episode, Entry, Playlist, Played); control-first playback with Artwork and no names (owner); one sentence of consequence under a setting; Undo instead of asking.
- **Owner decisions, graded but not proposed for change:** native Material 3 with a dark theme; bottom navigation with Views, Playlists and Library; Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; the mini player paused after relaunch; no podcast or Episode names on Now Playing or the mini player; Delete Playlist with no question and Undo.

## Flows

No flow run: the capture holds separate states, and no device was driven. FLOW-01, FLOW-02 and RESP-01 are N/O, the stability sub-score is N/O, and Consistency & polish is marked partial. No timed runs, script, measurements file or strips exist.

The capture never shows the on-screen keyboard, even with a field focused (05, 19, 21, 26, 41), so everything about the keyboard below comes from the code.

Flow-stability failures found from screenshots and code, not from a flow, are listed under Checklist.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Episode list (View, Subscription, Search) | Snackbar above player: "Added 1 Entry to X" | Snackbar on add failure paths only | none | Snackbar | Plain text; Edit this View or Add podcasts button | none | Row Play, trailing | Conditions line above the list |
| Episode detail | Snackbar | "Download failed" inline, 12 sp, above the action | none | Snackbar | "Not in any Playlist" hint | none | Full-width filled Play now | none |
| Add sheet | Snackbar after dismiss | Field error, New Playlist only | none | Snackbar | none | none | Play next, Play last, bottom of sheet, **below the fold at open** | none |
| View editor | Snackbar "View changed", plus pinned count | Inline red text under the conditions and in the sheet | none | Pinned bar and snackbar (both) | none | none | Done, pinned bottom-right | Value on each row |
| New Playlist | Snackbar, then opens it | Field supporting text | none | Snackbar | none | none | Filled button directly under the field, left | none |
| Playlist page | Snackbar | none | none | Snackbar | Plain text; Find Episodes for Entries, nothing for History or Timeline | none | Row Play | Status line above tabs |
| Rewind sheet | Snackbar "Playlist rewound" | none | The sheet itself | Snackbar | "None" per group | none | Filled Rewind, bottom-right of sheet | "Kept" explanation |
| Playlist settings | Snackbar | Field supporting text | none (owner) | Snackbar | none | none | Delete, red text button in list | Sentence under Delete |
| Subscription settings | Snackbar | Red text under the button | Dialog "Unsubscribe from X?" | Snackbar (as well as the dialog) | none | none | none | Sentence under each row |
| Settings | Snackbar | Inline red text with Retry | none | Snackbar | none | none | Rows | Sentence under OPML rows |
| Add podcasts | Snackbar "Subscribed" | Inline red text under the button | none | Snackbar | none | none | Find podcasts under the field, left | Label names both inputs |
| Now Playing | none | Inline red text with Retry playback, **expanded only** | none | none | "No Chapters available" | none | 112 × 88 dp Play | none |
| Mini player | none | **none** | none | none | hidden when no Entry | none | 48 dp Play | none |
| Listening stats | none | none | none | none | One sentence | none | none | About your stats |
| Welcome, Connect | none | Inline red text under the field | none | none | none | none | Full-width filled button; left-aligned filled button | One line each |

Mismatches:

1. **Failure visibility:** a playback failure is shown only on the expanded Now Playing; every other error is inline where it happened. (Mini player, Now Playing, row Play.)
2. **Creation forms:** New View has a pinned bottom-right Done; New Playlist has a button under the field. Different place, same kind of screen.
3. **Confirmation model:** Delete Playlist and Delete View use Undo alone; Unsubscribe has a dialog and Undo. The dialog is defensible, but the app has two answers to "was that destructive?".
4. **Date formats:** rows use "Nov 5"; Timeline, History and Rewind use "11/6/26, 2:30 PM"; the stats chart uses a fixed "11 Oct" order.
5. **Download Rule order:** Library groups list When Episodes become an Entry, Stream, As published; Subscription settings and Select Subscriptions list Stream first.
6. **Sheet surfaces:** `ListItem` keeps the page surface inside a sheet (a lighter band on Rewind's "Goes back to" row), while `ChoiceRows` takes the sheet colour.

## Checklist

**Coverage: 85%** (pass 43 · fail 13 · N/O 10 · N/A 13; 56 of 66 applicable items verified.) Android has no target checklist of its own; the Mac and web checks don't apply.

### Failures by severity

**Major**

- **[FLOW-04] Follow-ups are in view.**
  - *Add sheet, 09 (light, dark, 200%).* The only commit actions, Play next and Play last, are below the bottom edge when the sheet opens: about 4 dp of each pill shows behind the gesture bar. The light snapshot has two unnamed `[button]` nodes at that position. Cause: the content is forced to half the window height (`PlayerPresentation.kt:283-286`) and the drag handle sits on top of it, while the sheet's partial state is also half the window. Rewind solved this with `skipPartiallyExpanded = true` (`TimelineScreen.kt:41`). **Fix:** subtract the drag handle's height from the content, or make the action row a sibling pinned under a `weight(1f)` list and size the sheet so it always shows.
  - *View editor, 04 and 05 (from code).* The pinned count, Undo and Done sit behind the keyboard: the root `Column` has no `imePadding` (`ViewEditor.kt:57`), `ScreenFrame` excludes the IME from its insets (`PodListScreens.kt:214`), and the Activity is edge to edge. On New View the keyboard opens at once because Name is autofocused. Snackbars also anchor to the sheet with no IME offset, so "Undo" lands under the keyboard during edits. **Fix:** `imePadding()` on the editor column so the bar rides above the keyboard; offset the `SnackbarHost` by the IME inset.
- **[COPY-02] Errors appear near their cause.** A playback failure appears only inside expanded Now Playing (`PlayerPresentation.kt:159`). `MiniPlayer` (`:114-128`) reads neither `error` nor `buffering`, and `PlaybackService` sets the flag and pauses without a message (`:157`, `:271`). Tap Play on a row with the player collapsed and it silently stops. **Fix:** on `now.error`, show a snackbar with Retry and swap the mini player's Play for an error state; show buffering on the mini player's button.
- **[DATA-04] Undo reverses to a logical boundary.** Name and Mentions fields save on every keystroke: `ViewEditor.kt:59`, `:103` and `PlaylistSettingsScreen.kt:31` call `model.edit`, which offers one Undo per change (`AppModel.kt:82-98`). Renaming a View to "Commute" records seven edits, shows seven snackbars, and Undo restores only the last letter. No Redo exists (`m4_redo` is unused). **Fix:** coalesce text edits per focus session, commit on blur, Done or after a short pause, and make Undo restore the value from before the session.
- **[KEY-04] A newly opened input task focuses the expected field.** The Mentions sheet (one field) and the Length sheet open unfocused (`ViewEditor.kt:103`, `:108-109`), while Sleep, New Playlist, Search, Add podcasts and Connect all use `FocusedInputModifier`. **Fix:** focus the first field in those two sheets. Also remove autofocus from the Sleep sheet, where the keyboard covers End of Chapter and End of Episode, the likelier choices (`PlayerPresentation.kt:238`).
- **[TYPE-05] Enlargement keeps essential content.** Timeline at 200% (14, font200): the trailing "Rewind to here" holds about 40% of the row beside empty space, the title is squeezed to three narrow lines and ends "What the Voyager records were …", and the date breaks as "11/6/26," / "2:30 PM". Two rows fill the screen. `EpisodeRow` already stacks its actions at this scale (`PodListScreens.kt:328`); `TimelineScreen.kt:25-34` doesn't. Subscription settings has the same squeeze: help text runs seven lines in a narrow column (24, font200). **Fix:** at font scale 1.5 or more, move the trailing button below the supporting text and let `ValueRow` put its value under the label.

**Minor**

- **[FLOW-05] Paired panels line up.** Stats tiles at 200% (33, font200): "This week" and "This month" wrap and "All time" doesn't, so the third tile is visibly shorter. **Fix:** `height(IntrinsicSize.Min)` on the row and `fillMaxHeight()` on each tile (`ListeningStatsScreen.kt:41-43`).
- **[FLOW-06] No empty shells.** "Show notes" renders unconditionally, so an Episode with no description shows a heading over nothing (`PodListScreens.kt:406-409`). **Fix:** omit the heading, or show "No show notes".
- **[FLOW-07] The main action has one place.** See mismatch 2. **Fix:** give New Playlist the same pinned bottom bar as the View editor, or give both a top-bar confirm.
- **[DRAG-05] Drag feedback.** The dragged row doesn't follow the finger: only a tint and an insertion line show (`EntryDragging.kt:75-81`). The handle also needs a long press before it moves (`:98`), which makes a handle feel dead. **Fix:** translate the row with the pointer, and start the drag on touch-slop from the handle.
- **[APPEAR-09] Familiar symbol meanings.** The Star action always shows a filled star, so an unstarred Episode reads as already starred (`PodListScreens.kt:385`, 03, 50). **Fix:** outlined when off, filled when on.
- **[APPEAR-11] Coherent loading frames.** The View editor starts at `count = 0`, so "0 Episodes match" shows before the first result (`ViewEditor.kt:46`). The Getting started card begins hidden and pops in after a database read, pushing the Views list down (`GettingStarted.kt:24-34`). **Fix:** make the count nullable and render "Counting…"; seed the card's visibility before first composition.
- **[COPY-01] Terminology.** New View is titled "Edit View" (05, `PodListScreens.kt:165`). Search's empty result says "No Episodes match this View" (`SearchScreen.kt:50`) although Search isn't a View. **Fix:** title it New View; add a Search-specific empty string.
- **[COPY-04] Capitalization.** Getting started says "Use Play Next or Play Last" (`strings.xml:297`, 42); the buttons say "Play next" and "Play last". **Fix:** match the buttons.

### Considered and passed

- **AX-01** (blocker) is a pass, on a narrow reading. Every control in the snapshots has a name, role and state. What's left is weak rather than missing: the speed button's name is only "1.0×" (08); the seek slider exposes a percentage, not a time; the row and mini-player progress bars are unnamed nodes (02, 50); the drag handle is labelled but has no accessibility action (Move up and Move down cover it). A live TalkBack pass could change this verdict, and a blocker would cap Interaction & feedback at 4.9.
- **DLG-01:** the Unsubscribe dialog is kept as a pass because the change is uncommon and its consequences are spelled out.
- **APPEAR-04:** measured light primary on surface 6.46:1, onSurfaceVariant 8.86:1, Played (tertiary) 6.10:1, primary on the navigation surface 5.92:1, field outline 4.25:1; dark primary 10.93:1, onSurfaceVariant 10.89:1.
- **DATA-06** is a pass from the code (`rememberSaveable` for the tab, stacks, list state, drafts). Process death wasn't exercised. A cold launch returns to Views, which is the platform norm.

**N/O:** FLOW-01, FLOW-02, KEY-01, KEY-07, LIST-07, APPEAR-03, APPEAR-05, WIN-03, RESP-01, FOOT-02

**N/A:** KEY-06 and KEY-08 (no shortcuts; web only by design), CTRL-02, LIST-01, LIST-04, LIST-05, START-04 and START-05 (no runtime permission prompts), START-07 (no accounts), EDIT-02 (native fields only), TOOL-06, SIDE-03, SIDE-04

### Platform fit signals (Android, Phone)

Side-by-side with Google apps: nothing imported from another platform. What differs is finish.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native | Three-item bottom bar; top app bar with Up on inner screens only; actions kept out of the destinations |
| L2 Visual language | Native, with a gap | Material 3 throughout, but container roles are left at Material's baseline purple (see craft gap 1) |
| L3 Density, text, frame | Adapted | 48 dp icon buttons, 12 sp minimum body, edge to edge, text scales. Against it: the View editor bar under the keyboard, and 30 chart bars about 10 dp wide (a table is the stated equivalent) |
| B1 System navigation | Native | Back order matches the design; `PredictiveBackHandler` on the player; list-detail navigator; `enableOnBackInvokedCallback`; root Back returns to Views |
| B2 Preferences and access | Native (partial) | Names and roles in the tree; sp text; follows the system theme with no in-app choice. English only, and no live TalkBack run |
| B3 System surfaces and lifecycle | Native (partial) | Sharesheet, media session, launcher shortcuts, saved state, no permission wall. `POST_NOTIFICATIONS` isn't declared, so the download progress notification is suppressed; no widget |

Looks 7.8, Behaves 7.4 (partial: no live run).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped, TYPE-05; 7.4 uncapped) | Roboto through Material's scale, used consistently: `titleMedium` for Episode titles, `bodySmall` for metadata, primary `titleSmall` for sections. Competent-to-strong, but the scale is the default, not tuned. Episode detail's title is row-sized under a generic "Episode" bar | `hierarchy`, `adaptability` |
| Hierarchy | **7.2** | Named lists are calm, and Now Playing's Play is unmistakably the focus. Held down by Episode detail (five equal action rows between Play now and the content) and Entry rows, whose action row outweighs the title. Five identical blue "Rewind to here" links on Timeline | `content-first`, `hierarchy` |
| Spacing & density | **6.8** | A clear 16 dp rhythm on most screens. Against it: Select Subscriptions' checkboxes start at 0 dp from the screen edge (27); radios and checkboxes touch their labels (06b, 09); Entry rows are 141 dp against 92 dp for Episode rows, about four to a screen (11); the Episode row's divider sits about 6 dp above Play now (03); action rows start at 32 dp under a 16 dp title; Playlist settings' row starts at 32 dp (16) | `craft` |
| Color & contrast | **7.6** | One accent with a meaning; changed values turn primary, a quiet and useful touch; dark surfaces toned independently; all measured text passes. Held down by the baseline-purple container roles and by unselected tabs being as blue as the selected one | `color-restraint`, `accessibility` |
| Iconography | **7.6** | One Material family at 24 dp, every icon-only button with a label and long-press tooltip, the skip glyphs with numerals scaled deliberately. Against it: always-filled Star; no filled selected state in the bottom bar; the drag handle sits among actions | `conventions`, `craft` |
| Consistency & polish | **6.7** (stability N/O; partial: no flow run) | Main path is polished and the dark theme holds. Sheets, edges and secondary states show it wasn't finished: see inventory mismatches and the spacing evidence. Empty states are one plain line of text | `craft`, `stability` |
| Clarity | **6.9** (capped, COPY-02; 7.4 uncapped) | Consequence sentences are the app's best trait (Clear on Played, Unsubscribe, the Rewind summary, Default (30 seconds)). Against it: "Edit View" on creation, silent playback failure, "1.0×" unlabelled, View rows that show the sort instead of what they find | `plain-language`, `feedback` |
| Platform fit | **7.5** (partial: no live run) | (7.8 + 2 × 7.4) ÷ 3. Native navigation, Back and system surfaces; no foreign signals. The keyboard handling is the one real behaviour miss | `conventions` |
| Interaction & feedback | **6.9** (capped, KEY-04 and DATA-04; 7.3 uncapped) | Undo nearly everywhere, restored content revealed, no confirm walls, determinate and stoppable import. Held down by the per-keystroke Undo and the Add sheet hiding its commit | `forgiveness`, `feedback` |
| **Overall** | **7.0** | Serves the task and feels at home on Android, with a disciplined model and good plain language. The weakness holding it down most is unfinished last-mile behaviour on main tasks: the Add sheet's hidden buttons, the keyboard, silent playback failure. Within the cap (lowest 6.7 + 2.0) | |

### What stands between this and 9.0

The five major failures come first: clearing them lifts the three capped categories. Exemplary then needs the craft work below, none of which a checklist will catch.

1. **Finish the colour scheme.** `MainActivity.kt:47-71` sets no `surfaceContainer*`, `surfaceBright`, `surfaceDim`, `outlineVariant` or error roles, so Material's baseline purple shows through. Measured navigation bar: #F3EDF7 light, #211F26 dark, beside PodList's blue-tinted #FAF8FF and #121318. Generate the full role set from the #2b50c8 seed. This one change touches every screen.
2. **Fix the sheet surfaces.** `ListItem` keeps `surface` inside sheets (the band in 15; also Chapters and Entries inside Now Playing). Pass transparent colours inside sheets.
3. **Inset and gap the selection rows.** `CheckRow` and `ChoiceRows` need 16 dp row padding where they're not in a sheet, and 12 dp between control and label (`EditorComponents.kt:49-54`, `:80-84`).
4. **Rethink the Entry row.** Four trailing controls on their own line cost half of every row. Put the drag handle at the row's edge, move Add into the ⋮ menu, and aim for the 92 dp Episode row plus one line at most.
5. **Give Episode detail a real header.** Show the Episode title in the headline style, collapse the five actions into an icon-and-label row or a menu, and remove the row divider above Play now.
6. **Colour unselected tabs.** Set `unselectedContentColor` to `onSurfaceVariant` on the Playlist tabs (`PlaybackActions.kt:36` in `PlaylistPage`).
7. **Design the empty states.** Today every one is a single `bodyLarge` line. History and Timeline say nothing about what fills them or how.
8. **Make Done mean something on New View.** With no edits it creates nothing and says nothing (`ViewEditor.kt:49-54`, `:78`). Save the View on Done when `creating`.
9. **Name what TalkBack hears.** "Speed, 1.0×"; a time `stateDescription` on the seek slider; merge stats tiles ("This week, 1 minute") and spell out "1m"; Move custom actions on the handle.
10. **Make dates one voice.** One short relative or absolute style on Timeline, History and the chart, locale-ordered.
11. **Search like Android.** A search icon in the top bar, a clear button in the field, and an entry point from Views as well as Library.

## Next step

- **Target:** FLOW-04, a major failure in the lowest-scoring category, on the primary task.
- **Anti-pattern:** none named fits exactly; closest to a follow-up out of view.
- **Root cause:** the Add sheet sizes its content to the same half-window height as the sheet's partial state, so the drag handle pushes the fixed action row off the bottom.
- **Change:** in `PlaylistAddSheet`, make the content height the half-window height minus the drag-handle height, or open with `skipPartiallyExpanded = true`, as Rewind does. Keep the action row outside the scrolling list.
- **Principle:** `feedback`.
- **Expected effect:** Play next and Play last visible on open in every appearance and text size. Consistency & polish and Interaction & feedback improve; nothing regresses, and the half-height layout the owner chose survives.
