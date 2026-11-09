# PodList Android phone: UI grade, round 5

Graded at main 9c7713d against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, rubric.md, platform-fit.md § Android, Phone signals). Evidence: the capture in `android-grade-5` (light, dark, 200% text; Pixel 10 Pro XL profile, Android 16, compact window) and the code under `apps/android/app/src/main`. No device or emulator was driven.

## Frame

- **Task:** find Episodes through Views and the Library, and listen through Playlists with the player always in reach.
- **Target:** Android phone (compact window). Tablet and foldable are out of scope.
- **Posture:** sovereign personal media app, used in short and long sessions.
- **Audience:** perpetual intermediate; first run also has to serve newcomers.
- **Nearest exemplar:** Things, for a calm list hierarchy built on a few type styles and plain words.
- **Character:** accent `#2b50c8` on Material 3 tonal surfaces (owner); controls-first player with no names on screen (owner); compact Podcast page with a green check (owner); one-list View editor with live count (owner); plain domain nouns in capitals (Episode, Entry, Playlist, Rewind).
- **Owner decisions, graded but not proposed for change:** Material 3 look, accent and dark theme; bottom navigation with Views, Playlists and Library; Add podcasts as one field; View editor as one list; Rewind as a summary sheet; OPML in Settings; mini player paused after relaunch; no names in Now Playing and the mini player; Delete Playlist without a question, with Undo; Podcast page header, description behind a pull-down, Subscribe in the top bar and green check; "are you sure" on the green check, with Undo after and the person staying on the page; no keyboard shortcuts listed on the phone.

## Flows

No flow run: the capture is separate states, so there are no measurements or screenshot strips. FLOW-01, FLOW-02 and FLOW-04 are N/O, RESP-01 is N/O, and the stability sub-score is N/O. Code-read stability risks are listed under Craft gaps and are not scored.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views list | none | Banner under top bar, "Sync error · Showing local data." + Retry sync | none | Top-bar Undo icon after an edit | "No Views yet" + text button | none | + in top bar | Getting started card, Hide |
| A View | Snackbar | Same banner | none | Snackbar and top-bar icon | "No Episodes match this View" + Edit this View | none | Row Play and + | Conditions summary line |
| View editor | Live count in pinned bar | Inline red under the rows and in the sheet | none | Pinned bar Undo; snackbar Undo suppressed | none | none | Done in pinned bar, trailing | Hint when a draft is invalid |
| Search | none | none | Save as a View dialog | Snackbar | "No Episodes match this Search…" + Clear Search | none | Field; Save as a View below it | Row hint on Library |
| Episode detail | Snackbar | Download state line | none | Snackbar and top-bar icon | "Not in any Playlist" hint | none | Play now, full width | none |
| Playlist | Snackbar | none | none | Snackbar and top-bar icon | "No Entries in this Playlist" + Find Episodes | none | Row Play | Hint line |
| Rewind sheet | Snackbar after | none | The sheet, Cancel and Rewind, bottom-trailing | Snackbar after | "None" hints under headings | none | Rewind, filled | Kept paragraph |
| Trash | Snackbar | none | none | Snackbar | "No deleted Playlists", no next step | none | Row Restore | none |
| Library | none | Inline per Subscription, Standalone only | none | Top-bar icon | "No Subscriptions yet" + tonal Add podcasts | none | + in top bar | none |
| Add podcasts | Row reads "Subscribed", snackbar with Undo | Inline red under Find podcasts | none | Snackbar | "No podcasts found…" | none | Find podcasts, under the field | Field label |
| Podcast page | Snackbar with Undo | Red text in the list header, wherever the person has scrolled | Dialog, Unsubscribe | Snackbar only, no top-bar icon | "No Episodes yet…" | none | Subscribe, top bar trailing | Pull-down, no visible cue |
| Subscription settings | Snackbar | Sheet field error | none | Snackbar and top-bar icon | none | none | Row sheets | Help under rows |
| Settings | Snackbar on export | Inline red under OPML rows | none | Snackbar | none | none | Row sheets | Help under rows |
| Listening stats | none | none | none | none | "No listening yet…" | none | none | About your stats |
| First run | none | Inline red under the address field | none | none | none | none | Start on this phone, filled | One line under the buttons |
| Player | none | Mini player retry icon; red line in Now Playing; snackbar Retry | none | Snackbar; top-bar icon in Now Playing | No Chapters text | none | Play/Pause, largest control | none |

**Mismatches**
- **Retry wording:** Retry sync, Retry, Retry refresh, Retry download, Retry failed Subscriptions on Library, sync and Settings; "Try again" only on the Podcast page.
- **Error voice:** "Couldn't…" (Add podcasts, Podcast page), "Cannot reach the server" (first run), "Could not finish this time" (Bring over).
- **Error placement:** inline at the cause on Add podcasts, first run and Settings; in the list header on the Podcast page, off-screen when the person has scrolled.
- **Undo access:** the top-bar Undo and Redo icons sit on every ScreenFrame screen but not on the Podcast page, which has its own top bar.
- **Add podcasts action weight:** filled in the Getting started card, tonal with icon in the Library empty state, a text button on View and Search empty states, a list row at the foot of Library.
- **Sheet dismissal:** picking a radio closes Played, Starred, Sort and Show but not Published or Download Rule, all under the same Done header.
- **Sheet drag handle:** custom pale bar on the Add sheet, standard darker handle on Speed and Rewind.
- **Episode title style:** 17 sp Medium in Episode rows and Entries; 16 sp Regular in History, Listening Timeline and Rewind.

## Checklist

Coverage: **86.8%** (pass 51 · fail 8 · N/O 9 · N/A 11; 59 of 68 applicable items have a verdict).

### Failures, most severe first

| ID | Severity | Where | Evidence | Fix |
|---|---|---|---|---|
| **COPY-02** | major | Podcast page, row and top-bar actions | Row actions need a network step (`resolve`). The progress bar (`PodcastPageScreen.kt:199`) and the failure text (`:206`) live in the header item at the top of a list that can hold 500 Episodes. Scrolled to Episode 200, a tap on Play hides every row's buttons (`showActions = !busy`, `:212`) with no visible reason, and a failure shows off-screen. Nothing appears where the person is looking, and the same applies to a failed Subscribe. | Send row and Subscribe failures to the snackbar (already above the player, with Try again as the action) and show a progress indicator in the tapped row. Keep each row's buttons visible and disabled instead of removing them. |
| **TYPE-05** | major | 200% text: Podcast page, View editor, sheets | `font200/60`: title reads "Long listeni…" beside Subscribe (`PodcastPageScreen.kt:166`, one line), and the pull-down shows artwork and description but never the name, so the full title can't be read on that page. `font200/04`: the live count is a bare "4" with no noun on screen (`ViewEditor.kt:100–101`). `font200/06b`: 3.0× is below the fold of the Speed sheet, with about 160 dp of blank space directly under the list (`SheetFeedback.kt:37`, `80.dp * scale`); the snapshot confirms the row exists. `font200/15`: Rewind's Kept text is clipped to a small scroll area above the same blank band. | Let the Podcast page title wrap to 2–3 lines, or repeat it at the top of the content and in the pull-down. Keep the words on the count ("4 match"). Reserve snackbar space only while a snackbar is showing, or float the snackbar over the sheet's bottom edge. |
| **DATA-06** | major | Podcast page after a relaunch | The route is restored by `BrowsingContext`, but the list uses `rememberLazyListState()` (`PodcastPageScreen.kt:58`) rather than `rememberBrowsingListState`, the one main list that does. A 500-Episode page reopens at the top. | Use `rememberBrowsingListState` with the Episode guids as keys, and persist the page's search text as Search does. |
| **START-05** | major | First Download | `AndroidDownloads.kt:94` launches the `POST_NOTIFICATIONS` prompt straight from the Download tap (`IncomingContent.kt:24–33`) with no sentence from the app. Android's prompt carries no purpose string, so the reason is never stated. It is well timed (START-04 passes) but unexplained. | Before the prompt, show one sentence in a snackbar or small sheet: "Allow notifications to see download progress and stop a download." Downloads continue either way. |
| **COPY-01** | minor | Strings across the app | See the Retry and error-voice mismatches above (`strings.xml:19, 27, 347, 452`). | One retry verb (Retry) and one failure voice (Couldn't…) throughout. |
| **COPY-03** | minor | Podcast page, no Episodes | "No Episodes yet. Refresh this podcast to check for new Episodes." (`strings.xml:32`) names an action with no control: `refresh_podcast` is unused, the only Refresh is a retry after a failure in Standalone, and the pull gesture belongs to the description. | Reword to what happens ("New Episodes appear here when the podcast publishes them"), or add a Refresh command to the page. |
| **PTR-04** | minor | Podcast page top bar | The gear and green check (`PodcastPageScreen.kt:170, 173`) are plain `IconButton`s; every other icon button goes through `ActionIcon` with a tooltip. The check is the one icon whose meaning most needs a long-press hint. | Use `ActionIcon` or `ActionTooltip` with "Subscription settings" and "Subscribed. Unsubscribe". |
| **APPEAR-09** | minor | Listening stats; multi-select | Skip-to-track glyphs step between days (`ListeningStatsScreen.kt:90, 92`, visible in `33-stats-populated`). The Star action is a filled star in the selection bar (`Selection.kt:50`) and an outline in Episode detail, where filled means Unstar (`PodListScreens.kt:492`). | Chevrons for previous and next day; the outline star for the Star action. |

**Platform-fit signal failure with no checklist ID (B1), major in effect.** Back from an expanded Now Playing does not follow `docs/design/android.md § Back` once the person has switched tabs. `tabs.SaveableStateProvider(destination.name)` (`PodListScreens.kt:128`) recreates `DestinationStack` on every tab change, so its Back handlers register after the player's `PredictiveBackHandler` (`PlayerPresentation.kt:115`). navigationevent 1.0.0 dispatches to the most recently added handler first (`ArrayDeque.addFirst`, checked in the cached bytecode). Result: with Now Playing open, Back runs `rootBack` (`PodListScreens.kt:149`), or pops the route underneath, while the sheet stays open; only a later press collapses it. This is read from code and not run; the check is "switch to Library, expand Now Playing, press Back". **Fix:** register the player's handler as an overlay-priority handler, or disable the stack's handlers while `expanded` is true, and add an instrumented test for the documented Back order.

### Verdict notes on judgment calls

- **DLG-01 passes, with disclosure.** The Unsubscribe dialog sits on an undoable action, which a strict reading would fail. It's rare rather than routine, and the control doubles as a status mark, so a tap can be accidental. Delete Playlist, the routine case, correctly asks nothing.
- **EDIT-05 passes, with a gap.** Episode show notes are selectable and Share Episode gives the link. Podcast descriptions, inspected Episode notes and failed feed addresses in the OPML and Bring over lists aren't selectable; I treated those as diagnostics and secondary text rather than content URLs.
- **APPEAR-04 passes on token math:** light `onSurfaceVariant` 8.86:1, Played 6.10:1, links 6.46:1, green check 6.57:1, snackbar action 7.71:1; dark 5.27–10.93:1. The slider's inactive track is 1.22:1 in light, the Material default; the thumb and active track carry the position, so it isn't counted.
- **Accessibility snapshots** roll child labels up into the row group, which is the tool's collapsed output. Code gives each row action its own label, so AX-01 is judged from code.

**Passes, by group:** FLOW-03, -06, -07 · KEY-04, -06 · DLG-01–05, -07, -09 · CTRL-03–08 · LIST-02, -03, -06 · DATA-01, -04, -05 · DRAG-01, -03, -05, -06 · APPEAR-03, -04, -05, -10, -11 · TYPE-02, -03, -06, -07, -08 · COPY-04 · AX-01, -02, -04, -05 · START-01–04, -06 · EDIT-02, -05 · SET-01.

**N/O:** FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-07, LIST-07, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05 (no paired panels) · KEY-08 (owner: none listed on the phone) · CTRL-02 (no checkbox hierarchy) · LIST-01, LIST-04 (no column data) · LIST-05 (no outlines) · PTR-03 (no pointer target on a phone) · START-07 (no account creation) · TOOL-06 (nothing hideable) · SIDE-03, SIDE-04 (no split view at compact width).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by TYPE-05; about 8.2 uncapped) | A small role-based scale in `PodListTypography`: row titles 17 sp Medium, metadata 12 sp, screen titles 20 sp; typographic punctuation throughout. Text scales to 200% with rows restacking (`font200/02`). Held down by the truncated Podcast page title and the bare count; two styles for the same Episode title. | `hierarchy`, `accessibility` |
| Hierarchy | **8.1** | Episode row reads title, then metadata, then state. Now Playing's 112 × 88 dp Play button is the clear focus. Below Exemplary: on Episode detail, five stacked action rows after Play now push show notes below the fold (`03-episode`), and the Views list gives each row the same weight with no count, including "Starred / Starred". | `content-first`, `hierarchy` |
| Spacing & density | **7.7** | One 16 dp margin, 48 dp targets, even row rhythm, restacked actions at 200%. Gaps: text buttons sit 12 dp inside the content edge ("Show Entries", "Save as a View", "Mark all Played"); sheets reserve 80 dp, so Play next and Play last float mid-sheet (`09-add-sheet`); the snackbar is full-bleed and flush against the mini player (`63`); empty band under the Now Playing controls. | `craft`, `hierarchy` |
| Color & contrast | **8.4** | One accent for action, green reserved for Subscribed, tonal surfaces toned separately for dark, contrast preference honored in `PodListTheme`, all text passes. Below Exemplary: tertiary mauve appears only on the "Played" label, and the chart's selected bar turns near-black rather than using a marked accent. | `color-restraint`, `accessibility` |
| Iconography | **7.6** | One consistent outline set with labels on icon-only controls; skip icons carry numerals. Held down by the repurposed track-skip glyphs and star states; Import OPML and Download share a glyph; the 24 dp artwork placeholder sits unscaled in a 120 dp tile (`62`). | `conventions`, `craft` |
| Consistency & polish | **7.8** (stability N/O; partial: no flow run) | Standard Material controls, empty and error states designed nearly everywhere, snackbar Undo on nearly every edit. The inventory's mismatches keep it out of Exemplary: retry wording, sheet dismissal, drag handles, Add podcasts action weight. | `craft`, `stability` |
| Clarity | **6.9** (capped by COPY-02; about 8.0 uncapped) | Labels are specific and plain ("Goes back to", "Unplayed again", "Default (30 seconds)"), and the Rewind summary is exemplary. Capped by the off-screen Podcast page errors; also the empty state naming a missing Refresh, the pull-down with no visible cue, and "Length at most 30:00" (minutes or hours?). | `plain-language`, `feedback` |
| Platform fit | **8.0** (Looks 8.5, Behaves 7.7) | L1, L2, L3 Native: bottom bar, top app bar with Up, no Up at root, Material 3, 48 dp targets, edge to edge, keyboard insets. B2 Native: labels, scaling text, system themes, contrast. B3 Native: Sharesheet, app shortcuts, media session and Android Auto, notification channel, in-context permission, restored browsing state. B1 Adapted at best: predictive Back is enabled and nested correctly until a tab switch reorders handlers. No Platform-fit-group checklist failure. | `conventions`, `stability` |
| Interaction & feedback | **6.9** (capped by DATA-06, START-05; about 7.8 uncapped) | Strong forgiveness: Undo and Redo, a live-applying editor that preserves invalid drafts, Trash, Rewind summary. Discrete Move up and Move down beside drag. Capped by the unrestored Podcast page and the unexplained permission prompt; also no manual refresh and the Back defect. | `forgiveness`, `feedback` |
| **Overall** | **7.4** (cap: 8.9, 2.0 above lowest) | It serves find-and-listen well and belongs on Android. The app reads as Strong, but four narrow majors cap three categories at 6.9. Largest weakness: the Podcast page, which holds three of the four majors. | |

**To reach 9.0.** Fixing the four majors and the Back order removes every cap, which should put the app near 8.3. The rest is category craft:
1. Episode detail's show notes need to come before the action stack, or the actions need condensing.
2. Sheets need a designed bottom edge and one dismissal rule.
3. Text buttons need to align to the content edge.
4. The snackbar needs its Material margin.
5. The inventory mismatches need closing.
6. A flow run is required before Consistency & polish can be scored fully.

### Craft gaps (not checklist failures)

- **Returning to Search or Add podcasts refocuses the field.** `FocusedInputModifier` runs each time the screen re-enters composition, so Back from an Episode raises the keyboard over the results. Request focus only the first time.
- **Long descriptions can't be read in full.** Any upward scroll sets `expanded = false` (`PodcastPageScreen.kt:151`), so a description longer than the viewport collapses as the person tries to scroll it. Collapse only once the block has scrolled out of view.
- **Unscored stability risk on the Podcast page.** Artwork shows during `loading` and disappears when it ends (`:187`), moving the Search field up by about 150 dp (FLOW-01 candidate). Hiding row buttons while `busy` re-wraps titles and moves the list.
- **Listening chart.** No scale or value labels; zero days draw as a dashed baseline; the selected day is marked only by black.
- **Now Playing fill.** Empty band below the Episode and Entries buttons at default size; the artwork is width-limited, so the spare height is unused.
- **Selection bar.** A back arrow labelled Cancel; Material's contextual bar uses a close glyph.
- **Moved Entries stay tinted** with `primaryContainer` until another Entry moves or the list leaves composition (`EntryDragging.kt:95`).
- **Speed sheet** has a Done button although each radio applies and closes.

## Next step

- **Target:** COPY-02. It's tied with TYPE-05 and DATA-06/START-05 at 6.9, and is closest to the primary task because it blocks playing or adding from the Podcast page.
- **Anti-pattern:** feedback shown away from the action.
- **Root cause:** one header slot was built to hold all page status, on a page whose rows trigger their own network work.
- **Change:** route row and Subscribe failures to the existing snackbar with Try again; show per-row progress; keep buttons in place, disabled, while resolving.
- **Principle:** `feedback`.
- **Expected effect:** Clarity's cap lifts; Interaction improves; no signature element changes.
