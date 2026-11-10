# PodList Android phone: UI grade, round 7

Graded 2026-11-10 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, guidelines/core-checklist.md, guidelines/platform-fit.md § Android › Phone, guidelines/rubric.md). Build: `ffd096c` (main). Evidence: the round-7 capture (Pixel 10 Pro XL profile, Android 16, 1344 × 2992 px at 3.0 px/dp, compact width; light, dark and 200% font scale, each screen with a screenshot and an accessibility snapshot) and the code under `apps/android/app/src/main`. No device or emulator was driven for this grade. Measurements are in dp (screenshot px ÷ 3). Tablet and foldable are out of scope.

## Frame

- **Task:** find Episodes through saved Views and listen through Playlists that each keep their own place.
- **Target:** Android phone (compact window, below 600 dp).
- **Posture:** sovereign for a listening session: opened often and briefly to queue and control audio, with the mini player always present.
- **Audience:** perpetual intermediate: podcast listeners who learn the app's vocabulary (View, Playlist, Entry, Download Rule) once.
- **Nearest exemplar:** Things (calm, list-first personal tool), used for finish and restraint, not look. Android comparison points: the gallery's Niagara (8.2) and Google Calendar (7.8) grades.
- **Character:** (1) Material 3 with the fixed #2b50c8 accent and tonal lavender containers, with a dark theme *(owner)*; (2) three-tab bottom navigation, Views · Playlists · Library *(owner)*; (3) a persistent mini player of artwork, −15, play, +30 and the Active Playlist, with no names shown *(owner)*; (4) capitalized domain vocabulary (Episode, Entry, Played, Download Rule) with plain explanatory help under controls; (5) undo instead of confirmation everywhere, including Delete Playlist and Unsubscribe *(owner)*.
- **Owner decisions** (graded, never targeted): everything listed in the brief, in particular the name-free mini player and Now Playing, the Rewind summary sheet, two-tap Unsubscribe with no dialog, the explicit Rename step with Cancel and Save, unique case-insensitive names, OPML in Settings, and no keyboard-shortcut list on the phone.

## Flows

No flow run and no timed runs: the capture is a set of still states, and this grade drove no device. FLOW-01, FLOW-02 and RESP-01 are N/O, and the **stability sub-score is N/O**, so Consistency & polish is marked *(partial: no flow run)*. FLOW-03 is graded from code. FLOW-04 to FLOW-07 are graded from the screenshots.

Failures: [FLOW-06] New View, typing a name that's taken: a help block is inserted above the conditions. The "Show Episodes where" heading moves from y ≈ 243 dp (`light/05-new-view.png`) to y ≈ 327 dp (`light/78-new-view-taken.png`). That's an 84 dp shift, and it reverses when the name is fixed. The person caused it, so it isn't FLOW-01.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / View | Snackbar above the mini player, "View created / changed / deleted", Long, neutral | — | — | Snackbar Undo **and** top-bar Undo icon | "No Views yet" / "No Episodes match this View" + tonal next step | "Loading local Library…" spinner | Top-bar + (New View); row ▶ / + | Getting started card, hideable |
| View editor / New View | Snackbar, Undo suppressed | Red supporting text under Name; red text under conditions | — | **Bottom bar** Undo (text) | — | — | Bottom bar trailing **text** "Done" / "Create" | Explanatory hint appears with an error (FLOW-06) |
| New Playlist | Navigates to the new Playlist | Red supporting text | — | — | — | — | Bottom bar trailing **text** "Create Playlist", beside text "Discard draft" | — |
| Playlist settings (Rename) | Snackbar "Playlist renamed to …" + Undo | Red supporting text, "There’s already a Playlist called “Workshop”." | — | Snackbar + top-bar icon | — | — | **Filled tonal** Save under the field, trailing | Help text under Clear on Played and Delete Playlist |
| Playlists / Trash | Snackbar "Playlist … moved to Trash" / "… restored as Commute 2" + Undo | — | — | Snackbar + top-bar icon | "No deleted Playlists" (text only) | — | Top-bar + / row Restore (text) | — |
| Playlist tabs | — | — | — | Snackbar + top-bar icon | History: text + tonal "Show Entries" | — | Row ▶, overflow menu | Timeline: one-line hint at the top |
| Rewind sheet | Snackbar after Rewind + Undo | — | Modal summary sheet, Cancel (text) + Rewind (filled), trailing | Snackbar | — | — | Filled Rewind | Kept / Unplayed again explained |
| Podcast page | Snackbar "Subscribed" / "Unsubscribed" + Undo | Red text + text "Try again" in the header | Armed red "Unsubscribe" text in the top bar, a11y-length timeout | Snackbar + top-bar icon | "No Episodes yet…" + tonal Refresh | Linear progress + "Subscribing…" under the bar | **Filled** Subscribe in the top bar | Pull-down or "Show podcast details" |
| Add podcasts | Row turns Subscribed | Inline red text | — | Snackbar + top-bar icon | — | Progress | **Filled** "Find podcasts", leading, under the field | Field label names both inputs |
| Settings (OPML) | Inline summary "added / already / failed" | Inline red + text "Try again" | — | — | — | Determinate progress + Stop / Resume | Rows | Subtitles under every row |
| Connect | Moves on | Inline red text | — | — | — | "Checking server…" | **Filled** "Check and connect", leading | Help paragraph above and below |
| Listening stats | — | — | — | — | Text only: "No listening yet. Play an Episode…" | — | — | "About your stats" paragraph |
| Notification permission | — | — | AlertDialog, Not now / Continue | — | — | — | Continue | Reason sentence |

**Mismatches**
1. **Undo has three forms and often shows twice.** The snackbar Undo and a persistent top-bar Undo icon appear together on Playlists, Podcast page and Playlist settings (`83`, `82`, `63`, `74`). The View editor swaps both for a bottom-bar Undo button.
2. **The commit weight varies by screen.** New View and New Playlist commit with a text button the same weight as "Undo" or "Discard draft". Rename uses filled tonal Save. Add podcasts and Connect use a filled pill. The Rewind sheet uses filled.
3. **Discard wording varies:** "Discard draft" (New Playlist), "Discard unfinished conditions" (View editor, shown even when nothing is unfinished), and "Cancel" (Rename).
4. **Two empty states have no next-step control** while their siblings have a tonal button: Listening stats and Trash. Trash is acceptable. Listening stats could offer to open the Active Playlist.

## Checklist

Coverage: **91.5%** (pass 64 · fail 1 · N/O 6 · N/A 8; 65 of 71 applicable items verified). mac-checklist.md and web-checklist.md: N/A → target, outside the count.

**Failures by severity**
- *Blocker:* none.
- *Major:* none.
- *Minor:* **[FLOW-06]** View editor and New View: the help block "Your unfinished conditions are kept here. Valid edits apply as made." appears when the name becomes empty or taken, and disappears when it's fixed. Each time, it moves the whole conditions list 84 dp (`light/05` → `light/78`; `ViewEditor.kt:120`, `if (problem != null || hasInvalidNumber || hasInvalidName) item { Hint(...) }`). For a New View, its second sentence is also false: `update()` saves nothing while `creating`. **Fix:** don't show this hint for name problems; the field's supporting error already explains them. Keep it only for invalid *conditions* on an existing View, and give it a fixed slot in the bottom bar beside "4 Episodes match" so the list never moves. On New View, use "Your conditions are kept until you create the View."

**N/O:** FLOW-01, FLOW-02, KEY-07, APPEAR-11, RESP-01, FOOT-02.

**N/A:** KEY-08 (no app accelerators beyond the standard Ctrl+Z and Ctrl+Shift+Z; owner decision), CTRL-02 (no checkbox hierarchy), LIST-04 (no dense multi-column rows), PTR-03 (phone target; pointer parity is a tablet signal), AX-05 (no autoplay; the audio is the content), START-07 (no account creation), SIDE-03 and SIDE-04 (no panes on a phone).

**Passes worth recording** (code and capture): system Back works from every screen. Back at the root of Playlists or Library goes to Views, and Back at Views leaves the app (`PodListScreens.kt:156`). Predictive Back runs through `NavigableListDetailPaneScaffold` and the player's `PredictiveBackHandler`, with `enableOnBackInvokedCallback="true"`. The destination, each tab's stack, scroll anchors, Playlist tabs and podcast-details expansion are saved to the database, so they survive process death (`BrowsingState.kt`, `ConnectedShell`). Form drafts are stored in `FormDraftStore` and own their field until finish, so late echoes can't overwrite typing (FLOW-03, `NumberField`). Every icon button is 48 dp with a tooltip and a label (`ActionIcon`). Undo and Redo keep a history, with Ctrl+Z and Ctrl+Shift+Z (`MainActivity.onKeyDown`). Reorder by drag has autoscroll and 8 dp lift, plus Move up/down in the menu and as TalkBack custom actions. The system contrast setting is honored at runtime through `UiModeManager.ContrastChangeListener`. Notifications are requested only at the first download, after an explanation dialog. Sharing goes through the Sharesheet (`Intent.createChooser`). The app's strings use curly quotes and the ellipsis character throughout. At 200% text, Episode rows move their actions to a line below and the Episode detail grid drops to two columns.

## Platform fit (Android phone signals)

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Adapted (S, C)** | Bottom bar with three equal destinations, top app bars with titles, Up only on inner screens. The expanded Now Playing sheet keeps the bottom bar visible beneath it (`08`, a deliberate `PlayerContainer` choice). Every top bar can also gain persistent Undo and Redo icons, which is a desktop-style idiom on Android, where Undo normally lives in the snackbar. |
| L2 Visual language | **Native (S)** | Consistent Material 3: tonal buttons, outlined fields, ModalBottomSheet, snackbars, M3 switches and radios, Material glyphs. |
| L3 Density, text, system frame | **Native (S, C)** | dp and sp throughout; 48 dp targets; body text 12 sp at minimum (`bodySmall`); drawn edge to edge with the gesture handle clear. Text holds at 200% (`font200/*`). |
| B1 System navigation | **Native (C)** | Back on every screen and sheet; root Back follows Android's start-destination rule; predictive Back is supported. |
| B2 Preferences and access | **Adapted (C, S)** | TalkBack names, roles and states on every control in the snapshots, font scale honored, and Increase Contrast honored, which is rare. The theme only follows the system: Android's dark-theme guidance recommends offering Light, Dark and System default. |
| B3 System surfaces and lifecycle | **Native (C)** | Sharesheet, in-context notification permission with a reason, Media3 session with Android Auto, launcher shortcuts, and navigation plus drafts restored after process death (not exercised at runtime). |

**Looks 8.5 · Behaves 8.8 · Platform fit 8.7**

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.2** | A small Roboto scale where weight and `onSurfaceVariant` carry hierarchy: titleMedium 17 sp medium for row titles, bodySmall 12 sp for metadata, headlineSmall for the Episode title. Real curly quotes, "…" and en dashes. 200% keeps hierarchy. **Below 9:** Settings uses three row-title styles in one list: "Listening stats", "Server" and "Getting started" are 17 sp medium (`NameRow`), "Speed" and "Skip intro" are 16 sp regular (`ValueRow`), and "Import OPML" is 16 sp regular with an icon (`06`, `32`). Timeline rows put a 12 sp medium date line tight between title and event (`14`), unlike the metadata style used everywhere else. | `hierarchy`, `craft` |
| Hierarchy | **7.8** | Every list screen leads with its content, and chrome is quiet. **Below 9:** Episode detail stacks a full-width Play now plus five 72 dp tonal tiles in a 3-column grid with an empty sixth cell (`03`). They push show notes below the fold and compete with Play now. New View and New Playlist commit with a text button the same weight as "Undo" or "Discard draft" (`05`, `19`), while Rename's Save is filled tonal. With Rename open, Edit View shows two commit rows at once, Cancel/Save and Undo/Done (`76`, `77`). Pulling down the Podcast page puts the artwork and description *above* the podcast's name (`62`). | `content-first`, `hierarchy` |
| Spacing & density | **8.0** | One 16 dp gutter, 48–56 dp rows and 48 dp targets. Text buttons are offset −12 dp so labels sit on the gutter. Density suits a quick-check listening app. **Below 9:** at 200%, Edit View's bar stacks Undo above Done, so the bar, mini player and navigation take the bottom 342 of 997 dp (34%; `font200/04`). Podcast page rows repeat the podcast's 40 dp artwork and its name on a single-podcast page (`23`, `60`). The Episode action grid leaves an orphan cell. The stats chart puts both x-axis dates together at the left (x ≈ 16 and 67 dp) while the only bar sits at the right end (`33`; `ListeningStatsScreen.kt:96`, a `FlowRow` with `spacedBy(16.dp)`). | `craft`, `hierarchy` |
| Color & contrast | **8.6** | One accent with one meaning (interactive), tonal lavender containers, red only for destructive or armed, green check only for Subscribed (#176B39, white glyph 6.6:1). Text passes everywhere measured from the tokens (`onSurfaceVariant` #46464F on #FAF8FF ≈ 9:1; primary #2B50C8 ≈ 6.3:1). A tuned dark scheme, and Increase Contrast shifts primary, outline and secondary text. **Below 9:** the current Entry's "Now" band is a flat gray that reads as disabled more than current (`11`). Lavender tonal fills are used for actions, cards and the mini player alike, so the fill doesn't say which is which. | `color-restraint`, `accessibility` |
| Iconography | **8.2** | One Material glyph family at 24 dp, standard meanings (share, download, star, settings), and every icon-only control has a tooltip and a label. **Below 9:** the multi-select bar uses a bare check for "Mark Played" (`50`), a glyph Android uses for confirm or done. Select Subscriptions uses a download arrow for "Change Download Rule". The persistent top-bar Undo icon appears on screens with no visible edit (`81`, `82`). | `conventions`, `plain-language` |
| Consistency & polish | **7.8** *(partial: no flow run; stability N/O)* | Empty, loading, error, armed, disabled and 200% states are designed almost everywhere. **Below 9:** the four inventory mismatches (Undo in three forms and shown twice; commit weight; discard wording; empty states), the FLOW-06 hint, the mis-set chart axis, the Settings row-style mix, and "Discard unfinished conditions" offered when nothing is unfinished (`ViewEditor.kt:133`). | `craft`, `stability` |
| Clarity | **7.6** | The vocabulary is used consistently and explained in place: the Rewind summary, Clear on Played help, the Delete Playlist consequence, "About your stats". **Below 9:** Library groups Subscriptions under bare Download Rule names ("Stream", "When Episodes become an Entry", "As Episodes are published"), with nothing saying they're Download Rules (`20`). Two empty rule sections fill a screen with "No Subscriptions use this Download Rule." The draft hint misstates New View's behavior (FLOW-06). The Timeline hint says to tap "a row with the Rewind symbol" when every row has one (`14`). The selection actions are icons only. The owner's name-free mini player and Now Playing leave the playing Episode recognizable by artwork alone (`01`, `08`). It's scored, but not targeted. | `plain-language`, `discoverable-commands` |
| Platform fit | **8.7** | Looks 8.5 · Behaves 8.8 (table above). | `conventions` |
| Interaction & feedback | **8.6** *(partial: no flow run, no timed runs)* | Undo replaces confirmation for Delete Playlist, Delete View, Unsubscribe, Mark Played and Rewind. History covers several steps, with Redo and Ctrl+Z. Snackbars use Long duration with an action. The Unsubscribe arm uses `getRecommendedTimeoutMillis`. OPML has determinate progress with Stop and Resume. Drag has command and TalkBack equivalents, and drafts survive process death. **Below 9:** two Undo affordances at once, Edit View's mixed commit models (live conditions, explicit Rename, Done that only closes), and no runtime timing evidence. | `forgiveness`, `feedback` |
| **Overall** | **8.1** | A careful, native-feeling Material 3 app that's forgiving and well labeled, with unusually thorough state restoration and accessibility. The cap is 9.6 (lowest category 7.6 + 2.0), so it doesn't bind. The weakness holding Overall down most is Clarity and Hierarchy on the Library and Episode detail, which are the primary path's second and third screens. | — |

### What stands between this build and 9.0

Each line is one concrete change that would remove a "Below 9" item above, without touching an owner decision.
1. **Library headings (Clarity):** name the effect under the rule, as section headings: "Stream · no downloads", "Download when added to a Playlist", "Download every new Episode". Hide a rule's section when it's empty, and say once at the bottom "Other Download Rules: none in use · Change". Move "Add podcasts" and "Select Subscriptions" out of the list, since + is already in the top bar: put Select Subscriptions in the top-bar overflow.
2. **Episode detail (Hierarchy, Spacing):** keep Play now, and turn the five tiles into one row of five 48 dp labeled icon buttons, or a 2 + 3 row of compact tonal buttons with no empty cell. Show notes should start above the fold at 100% text.
3. **One Undo (Consistency, Iconography, Interaction):** while a snackbar with Undo is showing, hide the top-bar Undo icon. Show the icon only after the snackbar times out, or move Undo and Redo into a top-bar overflow labeled "Undo Delete Playlist".
4. **Commit weight (Hierarchy, Consistency):** make the commit in every create and edit form a filled tonal button (Create, Create Playlist, Done, Save), and keep Undo, Discard and Cancel as text buttons.
5. **Edit View with Rename open:** hide the Undo/Done bar while Rename is open, so only Cancel and Save commit. Show "Discard unfinished conditions" only when a draft exists. At 200%, keep Undo and Done on one row with the count above them.
6. **Settings rows (Typography):** use one title style for every row: `NameRow` and `ValueRow` both at bodyLarge, with titleMedium reserved for list items that are content (Views, Playlists, Episodes).
7. **Chart (Spacing):** put the first date under the first bar slot and the last date right-aligned under the last, and draw a hairline baseline.
8. **Icons:** label "Mark Played" and "Change Download Rule" in the selection bars with text, or use an overflow with text items. Keep the bare check for confirm only.
9. **Podcast page:** omit per-row artwork and the podcast name on a podcast's own page. With the description pulled down, keep the title first, then artwork and description.
10. **Theme (Platform fit B2):** add Settings › Appearance with System default, Light and Dark, defaulting to System.

## Next step

- **Target:** Clarity, the lowest-scoring category, on the primary path. No blocker or major failure exists.
- **Anti-pattern:** unlabeled grouping. Section names assume the reader already knows they're Download Rules.
- **Root cause:** the Library list is grouped by an internal setting (`DownloadMode`) and labels each group with the setting's value instead of its effect.
- **Change:** headings that state the effect ("Stream · no downloads", "Download when added to a Playlist", "Download every new Episode"); empty rule sections collapsed into one "not in use" line; Select Subscriptions moved to the top-bar overflow.
- **Principle:** `plain-language`, `content-first`.
- **Expected effect:** Clarity +0.4 to +0.6 and Hierarchy +0.2. No owner decision is touched, and the capitalized-vocabulary character survives.
