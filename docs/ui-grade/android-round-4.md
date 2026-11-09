# PodList Android phone: UI grade, round 4

Graded at commit `91e5def` against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android, Phone). Evidence: the capture at `android-grade-4` (light, dark and 200% text, screenshots and accessibility snapshots) and the code under `apps/android/app/src/main`. No device or emulator was driven, so no flow run exists.

## Frame

- **Task:** find Episodes through Views and listen through Playlists, with Android-native player and Library management.
- **Target:** Android phone, compact window. Tablet and foldable are out of scope.
- **Posture:** sovereign, used in short sessions with long background playback.
- **Audience:** perpetual intermediate, with the domain vocabulary explained once.
- **Nearest exemplar:** Things for calm restraint and finished states. Google Podcasts-class apps and Pixel apps for Android grammar.
- **Character:** PodList blue `#2b50c8` on tonal Material 3 surfaces (owner); a dark theme toned independently (owner); a player built around controls and artwork, with no names (owner); plain-spoken copy using capitalised domain nouns (Episode, Entry, Playlist, Device); every edit reversible through Undo.
- **Owner decisions recorded:** bottom navigation of Views, Playlists and Library; Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; mini player showing the current Entry paused after relaunch; no podcast or Episode names on Now Playing or the mini player; Delete Playlist with no question and Undo; Unsubscribe with a question and Undo. These are scored and any cap stands, but none is the proposed target.

## Flows

Not run. The README rules out rotation, process death, TalkBack, drag, and notification surfaces, and this audit drives no device. FLOW-01, FLOW-02, FLOW-04, RESP-01 and FOOT-02 are N/O, and the stability sub-score is N/O.

Code-derived risks to verify on the next flow run (not scored as FLOW failures):

- **FLOW-01 risk, in-sheet snackbars.** `FeedbackSheet` composes `SnackbarHost` as the first child of the sheet column (`SheetFeedback.kt:33`), with no reserved space. Sheets that stay open after a change, such as Published, Podcasts, the Mentions field, Length and Download Rule, get a "View changed" snackbar arriving above their content, pushing the rows or field down mid-interaction. The Length number fields save on every valid keystroke, so this can arrive while typing. Recorded as APPEAR-11 below.
- **Top app bar under Offline or Sync error at large text.** The title column adds an unbounded status line inside the fixed 64 dp `TopAppBar` next to a "Retry sync" button (`PodListScreens.kt:240-251`). At 200% or with several actions this should clip. No capture shows the state.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Help |
|---|---|---|---|---|---|---|---|---|
| Views list | none | top bar status line | none | snackbar; top-bar icon after an edit | Getting started card; "No Views yet" + button | none | + in top bar | Getting started card, hideable |
| A View / Subscription | snackbar with Undo | top bar status line | none | snackbar; top-bar icon | "No Episodes match" + Edit this View | none | Add / Play per row | none |
| Episode detail | snackbar with Undo | inline for download state | none | snackbar | "Not in any Playlist" hint | none | Play now, full-width filled | none |
| Playlist | snackbar with Undo | none shown | none | snackbar; top-bar icon | "No Entries" + Find Episodes; History and Timeline + a button labelled "Entries" | none | Play from here per row | none |
| Library | snackbar | inline per Subscription | none | snackbar | "No Subscriptions yet", no button, then three "No Subscriptions use this Download Rule." lines | none | + in top bar | subtitles on rows |
| Add podcasts | "Subscribed" on the row, snackbar | inline red under the field or row | none | snackbar | none | none | Find podcasts, left under field | field label |
| View editor | snackbar and live count | inline red | none | bottom bar Undo, top-bar icon and snackbar at once | none | none | Done in pinned bottom bar | "Changed" tags |
| Settings | snackbar | inline red with Retry | none | snackbar | none | none | rows | subtitles |
| Unsubscribe | snackbar with Undo | inline red | modal alert | snackbar | none | alert | Unsubscribe in alert | none |
| Sheets (Speed, Rewind, Add) | closes on selection, snackbar | inline | Rewind: Cancel + Rewind | in-sheet snackbar | "None" per Rewind section | none | Done or Play next/last | none |
| Listening stats | none | none | none | none | "No listening yet", no action | none | Show table | permanent swipe-hint line |
| First run | none | inline red | none | none | none | none | Start on this phone, full-width | one line |

**Mismatches**

1. **Empty states:** Views, Playlists, a View, Search and the Playlist tabs offer a button; Library, the first thing a new person opens after adding nothing, gives only a sentence and three repeated lines.
2. **Undo surfaces:** one edit can show three Undo controls at once: snackbar, top-bar icon and View editor bottom bar.
3. **Done means different things:** Done closes editor sheets (`EditorComponents.kt`, applied on selection) but starts the timer in the Sleep sheet (`PlayerPresentation.kt:251`).
4. **Two multi-select models:** Episodes use a contextual top bar with count; Select Subscriptions uses an inline count, an inline button, and a checkbox page.
5. **Text button alignment:** Mark all Played, Unsubscribe and Delete Playlist are zero-padded onto the 16 dp margin; Save as a View, Show table, Entries, Switch Playlist and Find Episodes keep the default 12 dp inset (x = 22 vs 39 in the 620 px captures).
6. **Row dividers:** `NameRow` draws a divider, `ValueRow`, `SwitchRow` and the OPML `ListItem`s do not, so Settings and Library are unevenly ruled within one list (06, 32, 20).

## Checklist

Coverage: **85%** (pass 51 · fail 5 · N/O 10 · N/A 13; 56 of 66 applicable items have a verdict).

### Failures by severity

| ID | Severity | Where | Evidence | Fix |
|---|---|---|---|---|
| DATA-06 | major | Player and navigation shell | Activity recreation (rotation, dark-mode or font change; no `configChanges`, no orientation lock) replays one-shot effects. `PlayerPresentation.kt:54` `LaunchedEffect(collapseNavigation)` runs on re-entry: it clears `pages` and calls `partialExpand()`, so an open Now Playing, its Episode or Chapters page and its saved sheet state collapse. `PodListScreens.kt:88` replays `helpRequest` (kept for the process in the Application-scoped model) and `:92` replays the never-cleared `model.reveal`, sending the person to Views or to another tab after any Undo or a visit to Help. Tab, stack and scroll are otherwise restored well. | Make these one-shot events: consume them from a Channel, or key on a `rememberSaveable` last-seen token so restoration doesn't replay them; clear `model.reveal` after handling. Skip the `collapseNavigation` effect on first composition. |
| DLG-01 | major (owner decided) | Unsubscribe alert (28) | An alert guards an action the product docs say is fully reversible (product-behaviour.md § Unsubscribe: everything is retained and re-subscribing restores it), and Undo follows. DLG-01 reserves alerts for essential conditions or irreversible loss. Owner decided to keep it, so it stands as a recorded cap and isn't the proposed target. | Owner's call: if ever revisited, drop the alert and keep the Undo snackbar, as Delete Playlist does. |
| APPEAR-11 | minor | In-sheet snackbars | `SheetFeedback.kt:33` places the snackbar above sheet content with no reserved slot, so content jumps when feedback arrives in sheets that stay open. | Overlay the snackbar at the bottom of the sheet, or reserve its height. |
| COPY-01 | minor | Sleep sheet; Playlist empty tabs; Now Playing | Done starts a 30-minute timer in the Sleep sheet although every other sheet's Done just closes (`PlayerPresentation.kt:251`); opening the sheet and tapping Done sets a timer. The History and Timeline empty states have a button labelled "Entries", a noun that duplicates the tab beside it (13-history; `PlaybackActions.kt:41`, `TimelineScreen.kt:23`). | Sleep: a Close control, with the timer started only by Start timer. Remove the "Entries" button, or label it "Show Entries". |
| COPY-03 | minor | Empty Library (43) | "No Subscriptions yet" has no button; the next step is four rows lower, past three repeated empty-group lines, while Views and Playlists offer a button in the same state (`PodListScreens.kt:309`). | When the Library is empty, show one state with an Add podcasts button and hide the empty groups. |

N/O: FLOW-01, FLOW-02, FLOW-04, KEY-01, KEY-04, KEY-07, LIST-07, WIN-03, RESP-01, FOOT-02

N/A: FLOW-05 (one pane on a phone), KEY-06 and KEY-08 (only Ctrl+Z; no custom shortcuts on phone), CTRL-02 (no hierarchical checkboxes), LIST-01 (no columnar data), LIST-05 (no disclosures), PTR-03 (touch), START-05 (no runtime prompts), START-07 (no account), EDIT-02 (native fields only), TOOL-06, SIDE-03, SIDE-04 (no hidable toolbars or sidebars)

Notes on passes that were close:

- **AX-01** passes on code and snapshots; live TalkBack is unverified. Wording nits: "Speed, 1.0×, 1.0×" (08-now-playing.txt; contentDescription plus text, `PlayerPresentation.kt:179`), "Nov 3 · 0 minutes, Nov 3" on chart days, and "Drag to reorder Entry" read before every Entry title.
- **TYPE-05** passes on the 200% tour, with the Offline title risk above unverified.
- **FLOW-06** passes on the capture; one narrow case remains in code (the Rewind sheet's "Goes back to" heading when the preview has no cursor, `TimelineScreen.kt`).
- **DLG-07:** sheets show Done with no Cancel, relying on the drag handle, scrim and Back, which is Android-normal.
- **Permissions:** no `POST_NOTIFICATIONS`, so the download foreground notification reaches only the Task Manager. Not a checklist failure; listed as a craft gap.

Contrast (measured from theme tokens, WCAG): light onSurface/surface 16.3:1, meta 8.9:1, Played tertiary 6.1:1 (4.97:1 on the Now row), primary text 6.5:1, error 6.1:1, onPrimary/primary 6.8:1. Dark meta 10.9:1, Played 10.9:1, primary 10.9:1. Sheet handles (1.5–1.8:1) are decorative with labelled alternatives; the slider's remaining track is 1.17:1 against the sheet, but the thumb and active track carry the control. APPEAR-04 passes.

## Scores

Platform fit detail: Looks **8.6** (L1 Native, L2 Native, L3 Native: three equal destinations, Up on inner screens, 48 dp targets, edge to edge, no clipping at 200%). Behaves **7.9** (B1 Native; B2 Native with nits; B3 Adapted: Sharesheet, shortcuts, media session, Auto and themed icon are present, but rotation loses Now Playing and replays navigation, no incoming intents for feeds or OPML, and the download notification is silent). (8.6 + 2 × 7.9) ÷ 3 = **8.1** before cap.

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.2** | Tuned 12 sp floor, one family, weight doing most of the structure (Episode title Medium 17 sp over 12 sp meta, 02); 200% reflows with row actions stacking below text (font200/02). Below Exemplary: `NameRow` Regular 16 sp and `EpisodeRow` Medium 17 sp treat peer rows differently, Timeline's date line is heavier than the event it dates (14), and 12 sp `Hint` carries real explanation throughout. | `hierarchy`, `craft` |
| Hierarchy | **8.0** | One filled action per screen (Play now, Rewind, Create Playlist); Now Playing puts artwork, then controls, then secondary. Below Exemplary: five accent text buttons (Speed, Sleep, Episode, Chapters, Entries) compete under the player (08); Search, Add podcasts and Select Subscriptions are plain data-style rows in the Library list (20), and Search has no icon anywhere. | `content-first`, `hierarchy` |
| Spacing & density | **7.9** | Consistent 16 dp margin and row pitch, density right for browsing. Below Exemplary: Now Playing title at 8 dp vs 16 dp elsewhere (08); Download row icon at 32 dp vs 16 dp caption (03); ~115 dp dead band above the Now Playing artwork; chart hint touching its divider (33). | `craft`, `conventions` |
| Color & contrast | **8.6** | Restrained blue on tonal surfaces, independent dark theme, AA throughout, system contrast setting honoured (`MainActivity.kt:126-139`). Keeps out of Exemplary: mauve tertiary used only for "Played" reads as a stray hue with no system of status colours behind it. APPEAR-11 is minor and doesn't cap. | `color-restraint`, `accessibility` |
| Iconography | **8.2** | One Material-grammar set, labelled and tooltipped icon buttons, custom skip glyphs with numerals. Below Exemplary: Import and Export rows and Download carry icons while their sibling rows don't; a bare check means Mark Played; the rewind-clock glyph sits beside a separate History tab. | `conventions`, `craft` |
| Consistency & polish | **7.6** (stability N/O; partial: no flow run) | Designed loading, offline, error and empty states almost everywhere. Held back by inventory mismatches (dividers, text-button inset, Done, two multi-select models), the chart's selected-bar artefact (blue corners outside the border, sliver at the top, 33), and a Chapters button that leads to "No Chapters available" (08). | `craft`, `stability` |
| Clarity | **7.7** | Plain, blame-free copy with real recovery steps. Below Exemplary: "Played: Unplayed" and "Starred: Yes" in View subtitles (01), "Published in the last 7 days · Changed" (04) repeating the label and reading as an unsaved edit on a View nobody touched, and no name on the player (owner). | `plain-language`, `feedback` |
| Platform fit | **6.9** (8.1 before DLG-01 cap) | Native navigation and Back, Sharesheet, shortcuts, media session. Capped by the owner-decided Unsubscribe alert. | `conventions`, `stability` |
| Interaction & feedback | **6.9** (8.3 before DATA-06 cap; partial: no flow run) | Multi-step Undo with reveal, Ctrl+Z, drag with autoscroll and Move up/down, determinate progress with stop and resume. Capped by DATA-06. | `forgiveness`, `feedback`, `stability` |
| **Overall** | **7.8** | Serves the task and is at home on Android: a well-finished Material 3 app. The caps hold it down; underneath it scores about 8.1, comparable to the strongest Android phone examples in the gallery, without reaching reference quality. Lowest category 6.9, so the Overall cap (8.9) doesn't bind. | |

### What stands between this and 9.0

The Overall cap is lowest + 2.0, and Exemplary categories require no capping failure. DLG-01 is owner-decided and caps Platform fit at 6.9 for as long as the alert stays, so **a 9.0 Overall needs either that decision changed or the owner accepting 8.9 as the ceiling**. Otherwise, in order of payoff:

1. **Fix DATA-06** so rotation and recreation keep the player and the tab.
2. **Listening chart:** only 7 of 30 days show in a chart headed "Last 30 days", behind a permanent swipe-hint line. Fit all 30 with sparse date labels and fix the selected-bar artefact and hint/divider collision.
3. **Now Playing composition:** align the header to the 16 dp margin, close the dead band above the artwork, and lower the emphasis of the five blue text buttons; hide Chapters when an Episode has none.
4. **Episode detail action group:** make Download a peer of the icon row or give the four icons labels, and align the Download row.
5. **View language:** "Unplayed" instead of "Played: Unplayed", no "· Changed" on untouched Views, and don't repeat the label in the value.
6. **Library:** a real search affordance with an icon, one empty state when the Library is empty, and Add podcasts and Select Subscriptions treated as actions.
7. **Android system surfaces:** accept feed URLs and OPML via intents and Share, and request `POST_NOTIFICATIONS` in context so download notifications appear.

## Next step

- **Target:** DATA-06 (major, Interaction & feedback, the lowest category not owner-decided).
- **Anti-pattern:** stale one-shot effects replayed on recreation.
- **Root cause:** player collapse, Getting Started and Undo reveal are modelled as state read by `LaunchedEffect`, so a new composition after Activity recreation replays them.
- **Change:** route these through consumed events (Channel or token consumed via `rememberSaveable`), and clear `model.reveal` once handled.
- **Principle:** `stability`, `user-control`.
- **Expected effect:** Interaction & feedback and Platform fit (Behaves) improve; no other category regresses.
