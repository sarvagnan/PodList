# PodList Android phone: UI grade, round 1

Build graded: `main` at 456f192. Guide: `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android, Phone). Evidence: the capture (Pixel 10 Pro XL emulator profile, Android 16, light, dark, 200% text, screenshots and accessibility snapshots) and the source under `apps/android/app/src/main`. No device was driven.

**Capture limit.** Every `-bottom` capture (03b, 04b, 07, 08b, 17, 25) is identical to its top capture, so the scroll did not land. Show notes, Delete View and the lower Settings rows are graded from code only.

## Frame

| | |
|---|---|
| **Task** | Find Episodes through Views and listen through Playlists, each keeping its own place. |
| **Target** | Android phone, compact window. |
| **Posture** | Sovereign for browsing and editing; transient for the player. |
| **Audience** | Perpetual intermediate podcast listener; the domain vocabulary is learned once. |
| **Nearest exemplar** | Things, for calm lists and a small fixed vocabulary. Gallery comparison: Google Calendar, Niagara, BuzzKill (explaining a choice under its name). |
| **Character** | Plain Material 3 with one blue accent (#2b50c8) and a dark theme (owner); control-led player with no names (owner); capitalised domain nouns (Episode, Entry, Playlist); value rows that show the current state. |
| **Owner decisions** | Material 3 look and accent; bottom navigation with Views, Playlists, Library; Add podcasts as one field; View editor as one list; Rewind as a summary sheet; OPML in Settings; mini player shows the current Entry paused after relaunch; no podcast or Episode name in the mini player or Now Playing (`docs/design/android.md`, 9 Nov 2026). These are scored, and no fix below proposes undoing them. |

## Flows

No flow run: no device was driven. Every check marked F alone is N/O, and the stability sub-score is N/O. FLOW-01, FLOW-02 and RESP-01 are N/O. Two things the code shows that a flow run should measure first:

- `ScreenFrame` (`PodListScreens.kt:191`) inserts the sync banner above the content whenever status isn't Ready. `AppModel.kt:297` sets Loading at the start of every pass, every 60 s and after every edit on a server-connected phone. It would push the Search field, the Add podcasts field and the View editor's name field down, then pull them back.
- `SearchScreen.kt:29` sets `rows = null` on every revision, which swaps the result list for a spinner and discards its scroll position. A background sync would send a person reading results back to the top.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | Snackbar above the mini player, "Added to {Playlist}" | none | none | Snackbar | Bare body text at 24 dp; a button only when no Subscriptions exist | none | ▶ and + on each row | Permanent hint line |
| View editor | Live count bar, autosave | Inline red under the field or rows | none | Pinned Undo button, many steps | n/a | none | Done, bottom bar | Section labels |
| Episode detail | State relabels; no message | None for downloads except "Download failed" text | none | None (toggles) | "No Chapters available" hint | none | Play Now as a TextButton, same weight as Star | none |
| Playlist | Snackbar "Entry moved" | none | none | Snackbar | Bare text | none | ▶ on each row | Permanent status hint |
| Playlist settings | Snackbar "Setting changed" for the switch only; rename is silent | Inline under field | AlertDialog, Delete Playlist | Snackbar and Trash | n/a | none | Autosave | Help under the row |
| Timeline / Rewind | Snackbar "Playlist rewound" | none | Bottom sheet, trailing Cancel and Rewind | Snackbar | Bare text | none | Rewind, bottom trailing | Rewind's "Kept" text |
| Multi-select | Snackbar "Selection updated" for Mark Played, Star and Download Rule; "Added 2 Entries to Commute" for add | none | none | Snackbar | n/a | none | Top bar icons | none |
| Add podcasts | Row button becomes "Subscribed"; no snackbar | Inline red between the button and the list | none | None at the point of subscribing | No results: text | none | Find podcasts, below field, leading | Label only |
| Subscription settings | Silent, or snackbar for Mark all Played | Inline under Unsubscribe | AlertDialog, Unsubscribe | Snackbar, Redo | n/a | none | Autosave | Help under rows |
| Settings | Silent; OPML export snackbar; import summary inline | Inline red in the list | none | None | n/a | none | Rows | Hint line |
| Add sheet, one Episode | Snackbar | Inline under field | n/a | Snackbar | n/a | none | Play Next, Play Last, pinned bottom, centred, tonal | none |
| Add sheet, several | Snackbar | Inline under field | n/a | Snackbar | n/a | none | Play Next, Play Last, inline, filled, plus a Done in the header | none |
| Sync, app-wide | Banner clears | Banner with "Retry sync" | none | n/a | "No synced data" | none | Retry sync | none |
| First run | Moves to Views | Inline red under field | none | n/a | n/a | none | Full-width filled button | Text below |

**Mismatches**

1. Two implementations of Add to a Playlist: one Episode (`PlayerPresentation.kt:250`) and several (`Selection.kt:63`) differ in layout, button style, button position and height, and the second has a Done that adds nothing.
2. "Selection updated" reports Mark Played, Star and Download Rule alike. The add snackbar names the Playlist and count.
3. Clear on Played reports "Setting changed" with Undo; every other setting applies silently with no Undo.
4. Speed is an AlertDialog of text buttons in the player and a bottom sheet of radio rows in Settings, with different values: 0.75, 1.25, 1.75 in the player (`PlayerPresentation.kt:172`); 0.8, 1.2, 1.3 in Settings (`PlaybackActions.kt:114`).
5. Deletion: Delete View has no question and Undo; Delete Playlist has an alert, Undo and Trash; Unsubscribe has an alert and Undo. Delete View and Delete Playlist are red, Unsubscribe is ordinary blue.
6. Back: every inner screen has a top app bar with an Up arrow; the first-run server screen has a loose "Back" text button (40-41).
7. Empty states: some have a button (no Subscriptions), most don't. All are 24 dp inset against the 16 dp used by rows and hints.
8. Number formatting: the player's speed is a raw float (`speed_value` with `now.speed`); Settings uses a locale-aware `speedSetting`.

## Checklist

**Coverage: 85.9%** (pass 32 · fail 23 · N/O 9 · N/A 15, of 79 core checks).

### Failures by severity

**Blocker**

- **[AX-01] Controls reach the screen reader without a name or without their state.** Where: Select Subscriptions, all ChoiceRows sheets, multi-select rows, Add sheet, two switches. Evidence: `27-select-subscriptions.txt` shows `[checkbox] [unchecked]` beside a separate `[text] "Deep Field"`, with no name on the checkbox (`Selection.kt:91`). `09-add-sheet.txt` shows a `[group] "Default, Active Playlist"` holding a nameless `[radiobutton] [checked]`: the row is `clickable` and the radio has its own `onClick`, so the row carries the name without the state and the radio carries the state without the name (`EditorComponents.kt:43`, `PlayerPresentation.kt:269`). Volume boost (`PlaybackActions.kt:109`) and Clear on Played (`PlaylistSettingsScreen.kt:28`) are `Switch` controls with no label. There are no `heading()` semantics on any section title. Fix: make the row the single control with `Modifier.selectable(selected, role = Role.RadioButton)` or `toggleable(role = Role.Checkbox or Role.Switch)` and pass `onClick = null` to the inner control. Add `semantics { heading() }` to `Section` and sheet titles. Add `onLongClickLabel` to rows ("Select").

**Major**

- **[TYPE-05] At 200% text the skip numbers collide with their arrows.** Where: mini player on every screen, Now Playing. Evidence: `font200/01-views.png` and `08-now-playing.png`: "15" and "30" sp-scaled over a fixed 30 dp and 60 dp glyph, unreadable in the mini player. `SkipButton`, `PlayerPresentation.kt:199`. Fix: draw the number at a fixed size inside the icon (no sp scaling, use `LocalDensity` with `fontScale = 1f` around that Text, or bake the numerals into the vector), since the button's accessible name already carries it.
- **[KEY-04] A newly opened input task doesn't focus its field.** Where: New Playlist, Add podcasts, Search the Library, Connect to a server. Evidence: no `FocusRequester` anywhere in the app. No `ImeAction` or `keyboardActions` either, so the keyboard's action key doesn't submit Add podcasts or Search. Fix: request focus on entry for those screens, set `ImeAction.Search` or `ImeAction.Done`, and bind it to the screen's main action.
- **[LIST-06] The option list doesn't mark the chosen value.** Where: Now Playing, Speed dialog. Evidence: `PlayerPresentation.kt:172` is eight `TextButton`s with no selected state. Sleep shows only "Sleep timer set" with no value or time left. Fix: reuse `ChoiceRows`, and show the time left on the Sleep control ("Sleep · 12 min").
- **[DLG-01] An alert guards a recoverable action.** Where: Delete Playlist. Evidence: `PlaylistSettingsScreen.kt:35`; the alert's own body says it goes to Trash and can be restored, and it's followed by an Undo snackbar. Delete View, equally recoverable, has no alert. Fix: delete straight to Trash with the existing Undo snackbar.
- **[CTRL-04] Invalid data gets no feedback, and one value isn't locale-formatted.** Where: Sleep dialog. Evidence: `PlayerPresentation.kt:212-213` disables Start timer for values outside 1–1440 with no error text; the speed label prints a raw float. Fix: `isError` and supporting text on the field, using the existing `m4_number_error`; format through `speedSetting`.
- **[DATA-06] Selection and part of the working context don't survive a rotation or process death.** Where: multi-select, Add podcasts results, View editor Undo steps. Evidence: `Selection.kt:28` (`remember(key)`), `AddPodcastsScreen.kt:38` (`results` in `remember`), `ViewEditor.kt:25` (`previous` in `remember`), Speed and Sleep dialog flags in `remember`. The manifest doesn't lock orientation. Tabs, stacks and scroll are saved correctly. Fix: a `Saver` for the selected ids and `rememberSaveable` for the rest. Re-run the search on restore.
- **[DRAG-06] Dragging an Entry doesn't autoscroll.** Where: Playlist Entries. Evidence: `PlaybackActions.kt:67` accumulates a delta only; nothing scrolls the list. Fix: use a reorderable lazy list with edge autoscroll (see DRAG-05).
- **[EDIT-05] Show notes can't be selected, copied or followed.** Where: Episode detail. Evidence: `PodListScreens.kt:391` flattens the HTML with `.toString()`, dropping links, and there's no `SelectionContainer` in the app. Fix: render with an `AnnotatedString` keeping links (`AnnotatedString.fromHtml`) inside a `SelectionContainer`.

**Minor**

- **[FLOW-07] Same sheet, two action placements.** Add to a Playlist, mismatch 1 above. Fix: one sheet, with Play Next and Play Last pinned at the bottom.
- **[DRAG-05] A drag shows nothing.** `PlaybackActions.kt:67`: the row doesn't lift or move and there's no insertion cue; the move simply happens on release. Fix: as DRAG-06.
- **[PTR-04] Icon buttons have no tooltip.** No `TooltipBox` in the app; long-pressing +, the gear or the pencil shows nothing. Fix: wrap icon-only top bar and row actions in `TooltipBox`.
- **[APPEAR-04] Unchosen chart bars are too faint (minor, isolated).** `ListeningStatsScreen.kt:73`: primary at 34% alpha measures 1.7:1 on `#faf8ff`, below 3:1 for marks people tap. Text passes throughout: primary 6.5:1, secondary 8.9:1, Played 6.1:1. Fix: raise the alpha to about 0.6 or use `primaryContainer` with an outline.
- **[APPEAR-09] One glyph, two meanings; a familiar glyph misused.** Three bars is both the Views tab (`ic_views`) and Entry actions (`ic_entry_actions`), and reads as a hamburger. The latter is also a drag handle that opens a menu. Fix: a distinct Views icon (filter or stack), and a kebab or `drag_handle` for Entries, with the two jobs separated.
- **[APPEAR-11] Frames during loading are incoherent.** `PodListScreens.kt:92` resets `data` on every route change, so "Loading local Library…" can flash on each push and Back. `SearchScreen.kt:29` flashes it on each keystroke. The sync banner shifts list content (see Flows). Fix: keep the last data until the next read arrives, and overlay the banner or reserve its space.
- **[TYPE-03] Setting values are 11 sp.** `ValueRow` trailing text inherits ListItem's `labelSmall`, and "Active Playlist" uses it directly (`04-view-editor.png`, `06-settings.png`). The value is what the row is for, and it's below the 12 sp floor in platform-fit L3. Fix: `bodyMedium` for the value.
- **[TYPE-06] Show notes lose their paragraphs.** `FROM_HTML_MODE_COMPACT` then `.toString()` leaves single line breaks. Fix: `FROM_HTML_MODE_LEGACY` or paragraph spacing, as part of the EDIT-05 fix.
- **[TYPE-07] All-caps markers have no added tracking.** NOW, RESUME, HERE use `titleSmall` with about 0.7% letterspacing (`11-playlist.png`). Fix: 5–12% tracking, or sentence case.
- **[TYPE-08] Straight apostrophes in the app's own text.** `strings.xml`: `bad_feed_address`, `directory_failed`, `subscribe_failed`, `unsubscribe_failed`, `bring_over_available`, `bring_over_download_error`, `bring_over_unmatched_episode`. Others use ’. Fix: replace with ’.
- **[COPY-01] Generic or misleading labels.** The + is announced as "Create" on all three roots, though on Library it's Add podcasts. "Selection updated" names no action. "Done" in the several-Episodes Add sheet closes without adding. "Entry actions" holds only Move up and Move down. Fix: "New View", "New Playlist", "Add podcasts"; state what changed in the snackbar; Close on that sheet; "Reorder Entry".
- **[COPY-03] Most empty states stop at a statement.** "No Playlists yet", "No Views yet", "No Entries in this Playlist", "No Episodes match this View" (`PodListScreens.kt:404`). Fix: one sentence and a button to the next step ("Edit this View").
- **[COPY-04] Capitalisation drifts within an element type.** "Playback Settings" against "Playlist settings" and "Subscription settings"; "Play Now" against "Play from here". Fix: settle the rule for non-domain words and apply it.
- **[START-03] Permanent hint lines can't be dismissed.** "Saved conditions over your Library", "Each Playlist keeps its own place" and "Download Rules on this Device" sit above each root for good. The Library one describes only part of that screen. Fix: move this teaching into Getting started, or show it until the first use.

### N/O

FLOW-01, FLOW-02, KEY-01, DATA-05, APPEAR-03, APPEAR-05, WIN-03, RESP-01, FOOT-02

### N/A

FLOW-05 (no side-by-side panels at compact width); KEY-06, KEY-07, KEY-08 (no custom shortcuts; phone target); CTRL-02 (no checkbox hierarchies); LIST-01, LIST-04 (content feeds, no column data); LIST-05 (no disclosure); PTR-03 (phone); START-05 (no runtime permission prompts); START-07 (no accounts); EDIT-02 (native fields only); TOOL-06, SIDE-03, SIDE-04 (none at compact width)

### Platform fit signals

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native | Three equal destinations, top app bar with Up on inner screens, none at roots (S). Exception: first-run server screen's text "Back". |
| L2 Visual language | Native | Consistent Material 3 (S). No launcher icon: the manifest has no `android:icon` and there's no `mipmap` resource. |
| L3 Density, text, system frame | Adapted | dp and sp, 48 dp targets, edge to edge (S, code). 11 sp values and the skip numbers at 200% are the tells. |
| B1 System navigation | Adapted | Predictive Back, ordered as designed (code). Three gaps: Back from another tab's root leaves the app rather than returning to Views; Back after Create Playlist returns to the empty form (`PodListScreens.kt:164`); reselecting a tab doesn't return to its root. |
| B2 Preferences and access | Foreign tell | Text scales and themes follow the system, but TalkBack can't name several controls (AX-01). |
| B3 System surfaces and lifecycle | Adapted | Media notification, downloads channel, launcher shortcuts, no permission wall (code). No Sharesheet anywhere; selection lost on rotation. |

Looks 7.6 · Behaves 6.4 · **(7.6 + 2 × 6.4) ÷ 3 = 6.8.**

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.6** | Material's system type scale used consistently, and Episode rows carry title, meta and state well. Capped at 6.9 by TYPE-05. 11 sp values and flattened show notes hold it below Strong. | `hierarchy`, `accessibility` |
| Hierarchy | **7.1** | Episode rows and the Now Playing transport read at once, and chrome recedes. Episode detail is the weak screen: four equal text buttons with Play Now no heavier than Star, and the artwork shown twice, 192 dp and 40 dp. | `content-first`, `hierarchy` |
| Spacing & density | **7.2** | A clear 16 dp rhythm and an even row pitch. Off the line: empty states at 24 dp, Mark all Played and Unsubscribe with text at 28 dp, staggered action rows on Episode detail, the View editor bar's text and buttons on different baselines (no `verticalAlignment`), and about 200 dp idle below Now Playing's controls. | `craft` |
| Color & contrast | **7.9** | One accent, used for interaction and changed values; Played in tertiary; dark theme carefully toned (dark captures). Text contrast passes. Not Exemplary: section labels, value tints and all text buttons share the same blue, so blue doesn't single out the primary action. | `color-restraint` |
| Iconography | **7.3** | One coherent 24 dp filled set with labels on every icon button; the skip glyphs carry their numbers well at 100%. APPEAR-09 and missing tooltips keep it from higher. | `conventions` |
| Consistency & polish | **6.4** (stability N/O; partial: no flow run) | Capped at 6.9 by CTRL-04. Eight inventory mismatches, chiefly the two Add sheets and the two Speed pickers. Empty and error states exist but are bare. | `craft`, `conventions` |
| Clarity | **6.8** | Value rows show state at a glance, and Rewind's summary explains itself well. Domain vocabulary is consistent but heavy for a newcomer ("Saved conditions over your Library"; "When Episodes become an Entry"). Sleep state and the owner's no-names player leave what's playing to the artwork alone. | `plain-language`, `feedback` |
| Platform fit | **6.8** | Above. Capped at 6.9 by DLG-01, LIST-06, EDIT-05. | `conventions` |
| Interaction & feedback | **4.9** (capped; about 6.5 uncapped; partial: code and capture) | AX-01 is a blocker and sets the cap. Undo is well covered, and autosave is sound. Reordering has no visible drag, and no Entry can be removed (below). | `forgiveness`, `accessibility` |
| **Overall** | **6.5** | Cap is 6.9 (lowest 4.9 + 2.0). A coherent, calm Material app that serves the main task, held down by accessibility semantics first. | |

## What stands between this and 9.0

Checklist failures come first: every major and the blocker cap categories below Exemplary, so all nine must go. Then these gaps, which keep the categories below 9.0 even with a clean checklist.

1. **No way to remove an Entry.** `product-behaviour.md` requires it, but `Change.RemoveEntry` appears in the UI only as an Undo inverse (`AppModel.kt:112`). The Entry menu has Move up and Move down, and the multi-select bar has no Remove.
2. **Episode detail has no primary action.** Make Play Now a filled button, put the others in one aligned row of icon-and-label actions, drop the duplicate thumbnail, and put show notes above Chapters when there are none.
3. **The sync banner moves the screen.** Reserve its place or move it out of the content flow, and don't show it for routine passes on a phone with working data.
4. **Abandoning a new View leaves junk.** + saves a "New View" before the editor opens, and Back keeps it: `font200/01-views.png` shows the leftover row. Create it on the first edit, or discard it if it's unchanged.
5. **Back and tabs.** Return to Views before leaving the app, replace New Playlist in the stack after creating, and make reselecting a tab return to its root.
6. **Sleep and Speed are repurposed alert dialogs.** Move them to the sheet the rest of the app uses, showing the current value and time left.
7. **Long titles aren't designed.** `maxLines` appears nowhere. Real feeds will produce very tall rows, and at 200% the three row actions take 144 dp and squeeze titles to four or five lines. Clamp to about three lines and move the actions below the text at large scales.
8. **Finish the first impression.** The launcher icon is missing, the Welcome screen is marked "deliberately small until owner review" in the code, and the Connect screen's Back is off-pattern.
9. **Add Sharesheet for Episodes**, the Android habit the app doesn't yet honour.
10. **Empty states and copy.** One voice, one next step on each, fewer permanent explanations.

## Next step

- **Target:** AX-01, the only blocker.
- **Anti-pattern:** controls TalkBack can't name (platform-fit B2 Foreign tell).
- **Root cause:** rows and their inner controls are separate touch targets, so name and state land on different nodes.
- **Change:** make each row one `selectable` or `toggleable` control with the right `Role`, and set the inner control's `onClick` to `null` (ChoiceRows, Add sheet, multi-select rows, Select Subscriptions, Volume boost, Clear on Played). Add `heading()` to Section and sheet titles.
- **Principle:** `accessibility`.
- **Expected effect:** lifts the 4.9 cap on Interaction & feedback to 6.9, raises Overall's ceiling, and turns B2 from Foreign to Native. No signature element is touched.
