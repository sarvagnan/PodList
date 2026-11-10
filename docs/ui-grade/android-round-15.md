# PodList Android phone: UI grade, round 15

Build `f29a9d6` (main). Graded 2026-11-11 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android › Phone, rubric.md). Tablet and foldable are out of scope.

Evidence:
- **Capture** of this build: `scratchpad/android-grade-15/` (Pixel 10 Pro XL emulator profile, Android 16, 1344 × 2992 px, density 3.0, so 1 dp = 3 px; compact width 448 dp). Every screen in Light, Dark and 200 % font scale, each with an accessibility snapshot. Screen numbers below (`01`, `23`, …) refer to it.
- **Flow run** of the same build: `scratchpad/flow-run/20261110-232845-458/` (`summary.md`, `measurements.csv`, `timings.csv`, `frames.csv`, strip). The method is judged below.
- **Code**: `apps/android/app/src/main` (Kotlin/Compose), read for Back handling, state saving, semantics, target sizes, sheets, errors and the manifest.

No device was driven by the grader.

## Frame

- **Task:** find Episodes through Views and listen to them through Playlists, with the Library and subscriptions behind them.
- **Target:** Android phone, compact window (platform-fit.md § Android › Phone).
- **Posture:** sovereign for browsing and the Playlist, transient for the player (mini player, then Now Playing).
- **Audience:** perpetual intermediate. Getting started covers newcomers.
- **Nearest exemplar:** Things. It's a calm personal tool built from one list at a time. The comparison is about decisions and craft, not looks.
- **Character:** (1) the owner's blue accent `#2b50c8` on a Material 3 tonal palette, with a tuned dark theme (owner-fixed); (2) the capitalised domain vocabulary: Views, Playlists, Entries, Played, Download Rule, Device; (3) quiet inset-divided lists on a 16 dp gutter, with two trailing icon actions per row; (4) icon-over-label action grids (Episode, Now Playing, selection bar); (5) a forgiving voice: "Playlist Commute moved to Trash · Undo", "Couldn’t … Check … then try again."; (6) letter-tile artwork placeholders.
- **Owner decisions** (scored, never the target): native M3 look with accent `#2b50c8` and a dark theme; bottom navigation with Views, Playlists and Library; Add podcasts is one field; the View editor is one list; Rewind is a summary sheet; OPML lives in Settings; the mini player shows the paused current Entry after relaunch; Now Playing and the mini player show no podcast or Episode names; Delete Playlist has no confirmation and offers Undo; the Podcast page has a compact header, a details pull-down, Subscribe in the top bar and a green check once subscribed; Unsubscribe takes two taps with no dialog and offers Undo; Rename is an explicit step with Cancel and Save; names are unique ignoring case; shortcuts appear only in Android's Keyboard Shortcuts panel.

## Flows

**Tasks run** (by the app's instrumented harness in `apps/android/app/src/androidTest`):
- A: Views → View → Episode → Add to a Playlist → Undo
- B: Playlist → play → Now Playing → collapse → pause → reorder through the Entry menu → Undo
- C: Add podcasts → Podcast page → Subscribe while typing in Search Episodes → Undo
- D: New Playlist → Rename → Undo
- E: Search → Save as a View

**Conditions:** one compact width (448 dp), Light and Dark. One pass delayed every HTTP completion by 2 s. Five undelayed timed passes ran per appearance on an emulator with a debug build and no throttling.

**Method, as judged here.** The harness is sound for FLOW-01 to FLOW-04:
- It compares settled captures on the same screen.
- It classifies each move as caused by the person (within 500 ms) or not.
- It types into the Search Episodes field while a 2 s Subscribe is still pending.
- It lists every candidate it excluded, with a reason.

It left six FLOW-01 comparisons unresolved, all on the `podcast-subscription` slot: Δleft ±8.3 dp at subscribe-done and undo-subscribe-done (rows 93→96, 107→110, 274→277, 288→291). They're resolved here:
- In strip C-0094 → C-0095, the spinner and gear replace Subscribe on the tap itself, before the 2 s reply.
- In `PodcastPageScreen.kt:209`, the transition is set synchronously in the click handler. Undo does the same in `HistoryActions.kt:76`.

So the 8.3 dp change is caused by the person, and FLOW-01 passes. RESP-01 and FOOT-02 stay N/O: a debug build on an emulator is not audience hardware, and several p75 intervals straddle 200 ms. Medium and expanded widths (phone landscape) weren't run.

**Failures:** none.

**Stability observation (not a failure).** Undo makes the top bar rearrange itself.
- After Undo, a "More actions" overflow (Redo) appears, and **Playlist settings moves 48 dp left** (`measurements.csv` row 68, x 396 → 348 dp, 116 ms after the tap). The tap caused it, so it isn't FLOW-01, but it moves a control the person may be about to use.
- The cause is `HistoryOverflow()` in `SubscriptionRefreshStatus.kt:50`, which renders only while a Redo exists. The Undo slot next to it is deliberately reserved (`UndoAction`, line 37).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View (01, 02, 42) | Snackbar, bottom, above mini player: "Created View …" | Top-bar strip "Offline / Sync error · Showing local data" + Retry | none | Snackbar action + top-bar Undo icon (specific: "Undo: …") | Text + tonal button ("Edit conditions", "Add podcasts") | none | Top-bar icons: Search, New View | Getting started card, Hide |
| Episode detail (03) | Snackbar | Inline under actions (download failed + Retry) | none | Snackbar + top bar | "Not in a Playlist" hint | none | Full-width filled Play Now | none |
| View editor / New View (04, 05) | Snackbar on Done or Create | Inline field error | none | Snackbar + top bar | n/a | none | Pinned bottom bar, trailing (Done / Create View; Discard draft text) | Paragraph *above* Delete View |
| Playlist, settings, Trash (11–19) | Snackbar: "Playlist X moved to Trash · Undo" | Inline field error | Rewind sheet (title as a question, Cancel + Rewind) | Snackbar + top bar | Text + tonal button ("Show Entries", "Back to Playlists") | none | New Playlist: inline under the field, trailing | Paragraph *below* Delete Playlist |
| Library / Add podcasts (20, 26, 59) | Snackbar "Subscribed to X" | Inline field error, or per-row inline | none | Snackbar + top bar | "No Subscriptions yet" + tonal Add podcasts | none | Inline under the field, trailing (Find podcasts); per-row Subscribe with in-button spinner and label | none on Add podcasts; Library footnote "No podcasts use: …" |
| Podcast page (23, 28, 60–63) | Snackbar "Subscribed to X · Undo" | Inline under the top bar + Retry | Two-tap Unsubscribe (armed state, auto-disarms) | Snackbar + top bar | "No Episodes" + Refresh | 4 dp progress slot | Top bar: Subscribe (filled) → green check icon only | "Show podcast details" |
| Settings, stats (06, 30–35) | Snackbar ("Updated Playback Settings") | Inline (OPML) | none | Snackbar + top bar | Stats: text + tonal "Find something to play" | none | Rows open sheets; sheets end in Done | Hints under section headers |
| First run (40, 41) | n/a | Inline field error | none | n/a | n/a | none | Full-width filled "Start on this phone" / inline trailing "Check and connect" | Line under the buttons |

**Mismatches:**
1. **Subscribed state** has two forms. Add podcasts shows "✓ Subscribed" (`SubscribedIndicator(showText = true)`); the Podcast page shows a check only. While a subscribe is pending, Add podcasts shows a spinner and "Subscribing…" inside a button whose width changes, while the Podcast page shows a spinner in a fixed-width slot. (Add podcasts, Podcast page.)
2. **Help for a destructive action** sits above Delete View but below Delete Playlist. (View editor, Playlist settings.)
3. **Undo confirmation wording** is usually specific ("Playlist Commute moved to Trash") but falls back to "Undid edit" (strip C-0093). (Podcast page, others.)
4. **Search the Library** is a top-bar icon on Views but a list row on Library, with no icon in Library's top bar. (Views, Library.)
5. **Top-bar action positions** change when Redo appears (row 68 above). (Every screen without a permanent overflow: Playlist, Views, Library, Settings.)

## Checklist

**Coverage: 91.9 %** (pass 68 · fail 0 · N/O 6 · N/A 5; 79 core items, 74 applicable).

**Failures by severity:** none among verified items.

Passes worth recording because they were close or rest on code:
- **FLOW-01:** see Flows. Resolved as caused by the person.
- **FLOW-07:** passes on the app's own rule: a single-field form commits under its field; a multi-field form or sheet pins its commit to the bottom. That rule holds on every screen.
- **KEY-08:** Undo and Redo are registered with Android's Keyboard Shortcuts panel (`MainActivity.kt:75`), which is the platform's own reference. This is an owner decision.
- **APPEAR-04:** measured from theme tokens, all pass:

  | Pair | Ratio |
  |---|---|
  | Secondary text, light | 8.86 : 1 |
  | Secondary text, dark | 10.89 : 1 |
  | Accent text, light | 6.46 : 1 |
  | Accent on mini player surface | 5.57 : 1 |
  | Dark selected-row secondary text | 5.46 : 1 |
  | Light error text | 6.13 : 1 |
  | Subscribed check against the page | 6.23 : 1 |
  | Outline (non-text) | 4.25 : 1 |
  | Snackbar action, dark theme | 5.26 : 1 |

- **APPEAR-03:** `UiModeManager` contrast is followed live (`MainActivity.kt:160`).
- **APPEAR-05:** rests on Compose honouring the system animator scale. No custom motion ignores it.
- **AX-01:** passes on the evidence below. The snapshots show grouped list items, but don't settle TalkBack's reading order between the top bar and the list.
  - Every icon button is named.
  - Rows merge into one spoken item.
  - The drag handle has Move up and Move down custom actions.
  - The two-tap Unsubscribe announces its armed state.
  - The details pull-down has a custom action.
  - The progress bars have state descriptions.
- **START-04 and START-05:** the notification permission is requested at the first download, after a pre-prompt with Continue and Not now (`IncomingContent.kt:39`).
- **DATA-01 and DATA-06:** drafts, renames and new Views persist in `FormDraftStore` and are flushed in `onStop`. The tab stacks, scroll positions and the Podcast page's details and query persist in `BrowsingState`.

**N/O:**
- KEY-07: Page Up/Down and Home/End in lazy lists aren't shown by the capture or the code.
- LIST-07: arrow-key movement with a keyboard attached is unverified.
- APPEAR-11: loading frames weren't sampled.
- WIN-03: phone landscape (medium or expanded width) wasn't captured or run.
- RESP-01: debug emulator build.
- FOOT-02: debug emulator build.

**N/A:**
- FLOW-05: the phone has no side-by-side panels.
- CTRL-02: there are no checkbox hierarchies.
- START-07: the app has no account creation.
- SIDE-03: the phone has no hideable pane.
- SIDE-04: the phone has no split view.

**Mac and web checklists:** N/A (target is Android).

## Platform fit (Android phone signals)

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Native (S, C)** | Bottom bar with three equal destinations (`NavigationSuiteScaffold`). Top app bar with title, Up only on inner screens, actions trailing. No Up at the roots (01, 10, 20). |
| L2 Visual language | **Native (S)** | Consistent M3 components: tonal containers, filled, tonal and outlined buttons, the M3 tab row, Material Symbols. Media surfaces leave out the title and artist that Android media players show (owner decision), which reads as Adapted on Now Playing. |
| L3 Density, text, frame | **Native (S, C)** | `ActionIcon` is 48 dp. Buttons are at least 48 dp (`CommitButton`, `ContentTextButton`). Body text is 14 sp and the smallest label 12 sp. `enableEdgeToEdge`, `safeDrawing` insets and `imePadding` are used. At 200 % nothing clips: top-bar actions and row actions wrap to their own rows (`PodListTopAppBar`, `EpisodeRow` `stacked`). |
| B1 System navigation | **Native (C)** | `enableOnBackInvokedCallback="true"`. `NavigableListDetailPaneScaffold` gives predictive Back through each tab's history. `PredictiveBackHandler` collapses Now Playing. `BackHandler`s clear the selection, disarm Unsubscribe, close the inline Episode and return Playlists or Library to Views. No custom edge swipes. |
| B2 Preferences and access | **Native (S, C)** | TalkBack semantics as under AX-01. Font scale fully honoured (the 200 % set). System default, Light and Dark themes. Contrast preference followed. Strings in resources, with no in-app language. |
| B3 System surfaces and lifecycle | **Native (C)**; process death N/O live | Sharesheet through `Intent.createChooser`. Permission requested in context. Launcher shortcuts (`shortcuts.xml`). Media3 session, media-button receiver and Android Auto descriptor. `rememberSaveable` plus database-backed browsing and draft state. |

**Looks 8.6 · Behaves 8.9 · Platform fit (8.6 + 2 × 8.9) ÷ 3 = 8.8.** Behaves is held under 9 because B1 to B3 are graded from code only: the medium and expanded widths, rotation and process death weren't observed live.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.5** | See note 1. | `hierarchy`, `craft` |
| Hierarchy | **8.3** | See note 2. | `content-first`, `hierarchy` |
| Spacing & density | **8.1** | See note 3. | `craft`, `hierarchy` |
| Color & contrast | **8.8** | See note 4. | `color-restraint`, `accessibility` |
| Iconography | **8.4** | See note 5. | `conventions`, `craft` |
| Consistency & polish | **8.3 (stability 8.4, Light and Dark alike)** | See note 6. | `craft`, `stability` |
| Clarity | **7.8** | See note 7. | `plain-language`, `feedback` |
| Platform fit | **8.8** | See the signal table above: Native on every phone signal. Media surfaces Adapted; medium and expanded widths unobserved. | `conventions` |
| Interaction & feedback | **8.7 (partial: responsiveness N/O)** | See note 8. | `forgiveness`, `feedback`, `user-control` |
| **Overall** | **8.4** | See note 9. | |

1. **Typography (8.5):**
   - Roboto, with a small custom M3 scale: titleMedium 17 sp for row titles, bodyMedium 14 sp in onSurfaceVariant for metadata, titleLarge 20 sp for sheet titles.
   - Typographic punctuation throughout: curly quotes, ’, ×, −, ·.
   - Hierarchy survives 200 % (03, 11 at 200 %).
   - Held below 9 because four near-identical 12–14 sp label treatments each carry a different job, so type alone doesn't tell the structure:
     - Section, 14 sp SemiBold, onSurfaceVariant ("Show Episodes where")
     - labelLarge 14 sp Medium, onSurfaceVariant ("Name")
     - labelMedium 12 sp ("Download Rule", 20)
     - titleSmall 14 sp Medium, onSurface ("3 Episodes")
   - The podcast title is titleLarge (20 sp) on the Podcast page but the Episode title is headlineSmall (22 sp) on Episode detail.
2. **Hierarchy (8.3):**
   - Lists lead and chrome is quiet. Episode detail runs one filled Play Now, then four labelled actions, then notes.
   - The Rewind sheet reads as a question, then the summary, then Cancel and Rewind.
   - Library (20) has the weakest hierarchy: the Search row, a "Download Rule / Stream" block styled like a heading, three podcasts with no "Subscriptions" heading, then a footnote and Select Subscriptions all sit at similar weight.
   - Now Playing (08) gives about 60 % of its height to letter-tile artwork with no title (owner decision).
3. **Spacing & density (8.1):**
   - One 16 dp gutter and inset dividers, with density suited to a calm personal tool.
   - The gaps that keep it from Strong-high:
     - At 200 %, every screen without top-bar actions keeps an empty 48 dp actions row: the reserved Undo spacer (`SubscriptionRefreshStatus.kt:37`) in the wrapped bar (`EditorComponents.kt:101`). It's visible as a blank band in 04, 06, 19 and 26 at 200 %.
     - Text-button labels sit 12 dp inside the content line: "Show podcast details" and "Save as a View" start at 28 dp against titles at 16 dp (22, 23, 60).
     - Two row rhythms sit on one Settings page: `ValueRow` puts 8 dp between label and value, while `ListItem` rows put about 4 dp (06: "Speed → 1.0×" is 25 dp apart, "Listening stats → description" 20 dp).
     - The Rewind sheet (15) gives a full section to each "None".
4. **Color & contrast (8.8):**
   - Restrained palette with fixed meanings: blue for interactive emphasis, green only for Subscribed, red only for destructive actions.
   - Every measured pair passes (see Checklist). The dark theme is tuned per role, and the contrast preference is followed live.
   - Below 9 because blue carries a great many text labels: every LabelledAction caption, the text buttons, "Select all" and the Current Entry label. The primary action doesn't stand out by colour alone on Episode detail and in the selection bar.
5. **Iconography (8.4):**
   - One Material Symbols family at a consistent weight. Every icon button has a tooltip and a label. Captioned grids are used where icons alone would be ambiguous.
   - Gaps:
     - Four list glyphs are close relatives with different meanings: Views tab, Playlists tab (reused for the mini player's "Default · 2 Entries"), Add to a Playlist and Entries.
     - The Select Subscriptions glyph (dashed `select_all`) is obscure.
     - A check circle means "Mark Played" in the action grid and "Subscribed" in the top bar.
6. **Consistency & polish (8.3, stability 8.4):**
   - Every state is designed: empty, loading, offline, inline error with Retry, disabled, 200 %, dark.
   - The flows held every core element (FLOW-01 to FLOW-04 pass). Typed text survived a late Subscribe ('Long E', 2.6 s).
   - The stability sub-score is held below 9 by the five inventory mismatches and the Redo overflow that shifts Playlist settings by 48 dp (row 68).
7. **Clarity (7.8):**
   - Labels are specific ("Find podcasts", "Check and connect", "Rewind Default to Nov 6 · 2:30 PM?"). Errors explain recovery, and the domain words are explained where they appear.
   - Gaps:
     - Neither the mini player nor Now Playing shows *what* is playing; a sighted person sees only "MH" (owner decision; TalkBack does get the names).
     - Library's footnote "No podcasts use: When Episodes become an Entry, As Episodes are published" is cryptic.
     - "Speed, 1.0×" reads like screen-reader text.
     - Top-bar titles are the generic "Podcast" and "Episode" until the person scrolls.
     - Capitalised domain words mid-sentence ("Entries already Played stay") read as stray capitals to a newcomer.
8. **Interaction & feedback (8.7, partial):**
   - Undo is everywhere: a snackbar for 10 s, a persistent top-bar Undo with a specific label, Ctrl+Z and Ctrl+Shift+Z, and Redo. It reveals the restored item.
   - No confirmation dialogs for undoable actions. Drafts survive leaving the screen.
   - Optimistic Subscribe. Sheets keep their own snackbar host. Focus goes to the expected field.
   - Gaps:
     - Redo hides in an overflow that appears and disappears.
     - The Add podcasts field is disabled while a search runs (`AddPodcastsScreen.kt:79`), so typing can't continue.
     - The selection bar can Mark Played and Star but has no Unplayed or Unstar.
     - RESP-01 is N/O.
9. **Overall (8.4):**
   - It serves the primary task well and is at home on Android.
   - The weakness holding it down most is Clarity on the listening surfaces (the owner decision), and then Library hierarchy plus spacing craft.
   - No cap applies: the lowest category is 7.8, so the cap would be 9.8.

### What stands between this build and 9.0

The owner's no-names decision on the mini player and Now Playing alone holds Clarity near 8. The other gaps, worst first:
1. **Clarity, without touching that decision:**
   - Rewrite or remove the Library footnote ("No podcasts use: …").
   - Label the speed action "1.0×" with the word Speed above it, or as "Speed 1.0×" with no comma.
   - Show the Podcast or Episode name in the top bar once the headline scrolls away. It already does this on scroll; consider starting with the name.
2. **Spacing:**
   - Drop the reserved Undo spacer when the actions row wraps at ≥ 1.5× font scale, or don't render an actions row with no visible actions.
   - Align `ContentTextButton` labels to the 16 dp line, using `contentPadding` start = 0 or a negative offset for leading text buttons.
   - Give `ValueRow` the `ListItem` rhythm: 4 dp between label and value.
3. **Stability and consistency:**
   - Reserve the overflow slot permanently, as the Undo slot already is, so Redo never moves Playlist settings, Settings or New.
   - Put destructive-action help on the same side for Views and Playlists: below the button, as on Playlist settings.
   - Use one Subscribed form and one pending form across Add podcasts and the Podcast page.
   - Replace "Undid edit" with the specific description already stored in `step.description`.
4. **Hierarchy (Library):**
   - Add a "Subscriptions" section heading.
   - Turn the Download Rule block into a quiet group label (labelMedium, onSurfaceVariant) under it, instead of a second heading.
5. **Typography:** collapse the four small label styles into two: a section heading, and a field label or value pair.

## Next step

- **Target:** Clarity, the lowest category. Its largest contributor is owner-decided, so skip it; the next-largest gap on a primary screen is Library (20).
- **Anti-pattern:** "jargon over plain words": internal rule names shown raw.
- **Root cause:** Download Rules are presented as an unexplained grouping (a bold rule name styled as a heading) plus a footnote that lists the *unused* rule names. The list of Subscriptions itself has no heading.
- **Change:** in `PodListScreens.kt` `Directory`, Library branch:
  - Add `Section("Subscriptions")` before the groups.
  - Render each rule group as a labelMedium onSurfaceVariant line ("Download Rule: Stream · Episodes play without automatic downloads").
  - Replace the `unused-rules` footnote with nothing, or with "Change Download Rules in Select Subscriptions", attached to that row's supporting text.
- **Principle:** `plain-language`, `hierarchy`.
- **Expected effect:** Clarity +0.2 to +0.3 and Hierarchy +0.2. No category is expected to regress. The signature capitalised vocabulary is kept.
