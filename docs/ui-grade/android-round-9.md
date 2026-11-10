# PodList Android phone: UI grade, round 9

Graded 2026-11-10 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android › Phone, rubric.md). Build: `main` at `0e76665`. Earlier grades and UI-GRADE.md work lists were not read; this is an independent pass.

**Evidence used**
- **(S)** The capture at `scratchpad/android-grade-9`: 55 screens × light, dark and 200% font scale, each with an accessibility snapshot. Android Emulator, Pixel 10 Pro XL profile, Android 16, 1344 × 2992 px at density 480 (3 px = 1 dp), compact window, demo server plus first-run and no-server screens.
- **(C)** The code under `apps/android/app/src/main` (Compose UI, manifest, resources).
- No device or emulator was driven. Measurements below are in dp, read from the stills at 3 px/dp, or are contrast ratios computed from the theme tokens in `MainActivity.kt`.

## Frame

- **Task:** Find Episodes through Views, Search and the Library, and listen through Playlists, with the player at hand on every screen.
- **Target:** Android phone, compact window (below 600 dp). Tablet and foldable are out of scope.
- **Posture:** A personal listening app used in many short visits, with a persistent, transient player (mini player → Now Playing sheet).
- **Audience:** Perpetual intermediate podcast listeners, with a newcomer path through first run.
- **Nearest exemplar:** Things, for a calm personal tool with a few clear roles and plain-spoken copy. Android grammar is judged against Google's own apps (Settings, Gmail, Keep), not against Things' Mac behaviour.
- **Character:** (1) PodList blue `#2b50c8` on Material 3 tonal surfaces, with dark roles toned separately *(owner)*; (2) a name-free player built around large controls *(owner)*; (3) capitalised domain vocabulary (Views, Playlists, Entries, Played, Listening Timeline); (4) explanatory, plain-spoken copy under settings and in summaries (the Rewind sheet, Clear on Played, About your stats); (5) bottom navigation Views · Playlists · Library *(owner)*.
- **Owner decisions (graded, not targeted):** native M3 with accent `#2b50c8` and a dark theme; bottom navigation with three destinations; Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; mini player shows the current Entry paused after relaunch; no podcast or Episode names in Now Playing or the mini player; Delete Playlist without confirmation, "Playlist <name> moved to Trash" with Undo; compact Podcast page header with pull-down details, Subscribe in the top bar and a green check once subscribed; two-tap Unsubscribe with Undo, staying on the page; explicit Rename with Cancel and Save, name on its own lines; unique names ignoring case; no keyboard shortcuts listed on the phone.

## Flows

**No flow run.** The capture is a set of separate states, and no script measured element positions between steps or timed responses. The F-only checks (FLOW-01, FLOW-02, RESP-01) are N/O, the stability sub-score is N/O, and Consistency & polish is marked "(partial: no flow run)". Checks that also accept S or C evidence (FLOW-03 to FLOW-07) are judged from the stills and code.

Failures: none verifiable.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views, a View, Search | Snackbar above the mini player, e.g. "Added 1 Entry to Default" | Sync strip under the top bar: "Offline · Showing local data. Sync will try again." + Try again | none | Snackbar Undo (Long), then Undo/Redo icons in the top bar | "No Episodes match this View" + **Edit this View**; "No Views yet" + **New View**; Search: "No Episodes match this Search…" + **Clear Search** | "Loading local Library…" with spinner | Row trailing + and ▶; top bar + (New View) | Getting started card on Views (Hide; reopen from Settings) |
| Episode detail | Snackbar "Episode starred" / "Episode marked Played" + Undo | Download failure inline under the action row, with Try again | none | Snackbar + top-bar Undo | "Not in any Playlist" hint under *In your Playlists* | none | Full-width filled **Play now** | none |
| View editor / New View | Snackbar "View changed", "View renamed to X" + Undo | Inline red under the field or under the conditions ("At most must be at least as long as At least.") | none | Snackbar + top-bar Undo | n/a | none | Pinned bottom bar, trailing **Done** / **Create View**, with live count | Permanent hint at the end of the list |
| New Playlist | Opens the new Playlist; "Playlist created" | Inline red under field: "A Playlist needs a name." / "There's already a Playlist called "X"." | none | top-bar Undo | n/a | none | Trailing **Create Playlist** under the field, **enabled when empty**; "Discard draft" | none |
| Add to a Playlist sheet | Snackbar (inside the sheet while open) | Inline red under the name field: **"Enter a name that is not already used."** for both empty and duplicate | The sheet itself | Snackbar | n/a | none | Two tonal buttons trailing at the bottom: Play next / Play last | none |
| Playlist (Entries, History, Timeline) | Snackbar "Entry moved", "Entry removed from Playlist", "Playlist rewound" + Undo | none shown | Rewind sheet: summary, Cancel + **Rewind** trailing | Snackbar + top-bar Undo | "No Entries…" + **Find Episodes**; "No History yet…" + **Show Entries**; Timeline + **Show Entries** | none | Row ▶ and ⋮; pencil to settings | Timeline hint "Tap a row with the Rewind symbol…" |
| Playlist settings, Trash | "Playlist Commute moved to Trash", "Playlist restored", "Playlist renamed to X" + Undo | Rename: inline red under the field, Save disabled | none | Snackbar + top-bar Undo | Trash: "No deleted Playlists" (text only) | none | Rename → Cancel / **Save** trailing below the field | Clear on Played and Delete explained beneath |
| Library, Select Subscriptions | Snackbar "Download Rule changed" + Undo | Standalone refresh failure inline red under the row + Try again | Download Rule sheet with **Change Download Rule** | Snackbar + top-bar Undo | "No Subscriptions yet" + **Add podcasts** | none | Top bar +; bottom action bar when selecting | none |
| Add podcasts | Result's Subscribe becomes a **disabled "Subscribed" text button**; snackbar with Undo | Inline red under the Find button; per-result red line "Couldn't subscribe to "X". …" | none | Snackbar | none until a search | Linear progress | Trailing **Find podcasts**, **disabled when empty** | Field label "Podcast name or feed address" |
| Podcast page | Snackbar "Subscribed" / "Unsubscribed" + Undo | Inline red in the header + Try again | Armed **Unsubscribe** in place of the check (times out) | Snackbar + top-bar Undo | "No Episodes yet…" + Refresh; "No Episodes match…" + Clear Search | Progress strip under the top bar: "Subscribing…" | Top bar **Subscribe** (filled) / **green check** | Show/Hide podcast details |
| Settings, Listening stats | "OPML exported"; import summary inline | OPML error inline red + Try again | none | top-bar Undo for setting changes | Stats: "No listening yet. Play an Episode…" (text only) | OPML progress with Stop | Rows open sheets/screens | Explanations under rows; About your stats |
| Connect to a server | Connects and proceeds | Inline red under the field | none | n/a | n/a | Linear progress, "Checking server…" | Trailing **Check and connect**, **disabled when empty**; "Discard draft" | Explanation above and scope note below |
| Now Playing, mini player | n/a | Inline red "Couldn't play the audio. Your place is kept." + Try again; snackbar with Try again; mini player button turns error-coloured retry | none | top-bar Undo in the sheet header | "No Chapters available" | "Loading audio…" | Largest control: Play/Pause (112 × 88 dp) | none |

**Mismatches**
1. **Empty-name handling differs.** Create Playlist (New Playlist) and Play next/last (Add to a Playlist sheet) are enabled with an empty name and explain afterwards; Find podcasts, Check and connect and Rename's Save are disabled until there is text. (New Playlist, Add sheet vs Add podcasts, Connect, Rename.)
2. **The same name error is worded two ways.** New Playlist and Rename say "A Playlist needs a name." or "There's already a Playlist called "X"."; the Add to a Playlist sheet says "Enter a name that is not already used." for both an empty and a taken name (`PlayerPresentation.kt` `PlaylistAddSheet`; `ScreenActions.kt` `addSeveral` returns only `false`). For an empty name the message is wrong, and it never names the taken Playlist.
3. **Subscribed state has two forms.** A green check on the Podcast page; a disabled "Subscribed" text button on Add podcasts results.
4. **Empty states with and without a next step.** Most empty states carry a tonal button; Listening stats has only text.
5. **Three words for leaving a form.** "Discard draft" (New Playlist, Connect), "Discard unfinished conditions" (View editor), "Cancel" (Rename, Rewind, Save as a View). The draft wording is deliberate, but the three variants read as three behaviours.
6. **Naming a new thing in two forms.** Inline fields for New Playlist, New View and the Add sheet; an AlertDialog for Save as a View (`SearchScreen.kt`).
7. **One command, two glyphs.** Add to a Playlist is a bare **+** on Episode rows and the playlist-add glyph on Episode detail and the selection bar.

## Checklist

Mac-only and web-only checks: N/A → target (Android phone), excluded from coverage.

**Coverage: 89.2%** (pass 61 · fail 5 · N/O 8 · N/A 5; 66 of 74 applicable items verified)

### Failures by severity

**Major**
- **[TYPE-05] Text enlargement breaks control labels mid-word.** *Where:* Episode detail action row and the multi-select action bar, at 200% font scale. *Evidence:* font200/03-episode and font200/50-selection show "Downloa" / "d" and "Add to a" / "Playlist" (crop: `scratchpad/grade-android-9/f200-episode-actions.png`). `Selection.kt` `LabelledAction` gives each of four actions `Modifier.weight(1f)`, about 100 dp after padding on a 448 dp window; "Download" in labelMedium at 2.0 × 12 sp needs about 104 dp, so Compose breaks inside the word. The component's own comment promises "labels wrap at large text sizes, never clip or ellipsize". *Fix:* lay these actions out as a two-column grid when `fontScale >= 1.5f` (the threshold `EpisodeRow` and `ValueRow` already use), for example `FlowRow(maxItemsInEachRow = if (large) 2 else 4)` with each slot `weight(1f)`, or switch to full-width `DetailAction` rows (icon and label on one line) at that scale. Then check that no single word in any `LabelledAction` label is wider than its slot at 2.0.

**Minor**
- **[APPEAR-11] Launch flashes the system theme, not the chosen one.** *Where:* cold start with Appearance set to Light or Dark against the opposite system setting. *Evidence:* `res/values/styles.xml` and `res/values-night/styles.xml` set `windowBackground` and `windowSplashScreenBackground` from the system night mode, while `MainActivity` applies `model.appearance` only once Compose runs. Choosing Dark on a light system gives a `#faf8ff` splash and window, then `#121318` content. *Fix:* in `setAppearance` (and once at startup) call `UiModeManager.setApplicationNightMode(MODE_NIGHT_YES / MODE_NIGHT_NO / MODE_NIGHT_AUTO)` (API 31+, and minSdk is 34) so the splash, window background and system bars follow the in-app choice.
- **[COPY-01] The pencil's label doesn't name its destination.** *Where:* the Playlist top bar. *Evidence:* the accessibility snapshot reads "Edit" (light/11-playlist, `@e95`), and the screen it opens is titled "Settings for Default"; the docs call it Playlist settings. *Fix:* label the pencil "Playlist settings" on a Playlist and "Edit View" on a View (it already opens a screen titled Edit View), using one string per destination in `ScreenFrame`'s `edit` action.
- **[COPY-04] Domain terms are capitalised everywhere except Play Now / Next / Last.** *Where:* Episode detail ("Play now"), the Add to a Playlist sheet ("Play next", "Play last"), and the Getting started copy ("Play next" or "Play last"). *Evidence:* CONTEXT.md defines **Play Now / Play Next / Play Last** as domain terms, and the UI capitalises every other one ("Mark Played", "Add to a Playlist", "Show Entries", "Keep deleted Playlists"). *Fix:* use "Play Now", "Play Next" and "Play Last" in `strings.xml` (`play_now`, `play_next`, `play_last`, `m4_step_playlists_help`).
- **[KEY-08] No shortcut reference for Ctrl+Z / Ctrl+Shift+Z.** *(Owner decision: shortcuts are never listed on the phone. Graded, not targeted.)* *Evidence:* `MainActivity.onKeyDown` and `historyShortcuts` handle Undo and Redo with a keyboard attached; nothing documents them. *Fix compatible with the decision:* override `Activity.onProvideKeyboardShortcuts` to return an Undo and a Redo `KeyboardShortcutInfo`. Android shows these only in its own Meta+/ keyboard-shortcuts helper, never in the app's UI.

No blocker failures.

### Passes (evidence, grouped)

- **Flow (S/C):** FLOW-03: field drafts own their text (`NumberField`, `RenameableName`, `rememberDraftText`), so late model echoes can't replace typing. FLOW-04: snackbars sit above the mini player and inside open sheets (`FeedbackSheet`); light/63 shows "Subscribed · Undo" clear of the player. FLOW-05: the stat tiles share top and height (`IntrinsicSize.Min`). FLOW-06: section headings appear only with content, or with a stated "None" or hint. FLOW-07: single-field forms commit trailing under the field, multi-field forms and sheets in a pinned trailing area (`CommitActions`, used everywhere).
- **Keyboard (C):** KEY-01: standard Compose clickables throughout, with menu or button alternatives for drag, long-press and pull-down. KEY-04: new input tasks focus their field (`FocusedInputModifier`), and closing Rename returns focus to Rename. KEY-06: Ctrl+Z and Ctrl+Shift+Z need no extra modifiers.
- **Dialogs and sheets:** DLG-01: the only alert is the notification rationale; deletes use Undo. DLG-02/03: specific copy with Continue and Not now. DLG-04: Cancel on Rewind and Rename; Back dismisses sheets. DLG-05: Delete Playlist and Unsubscribe in error red, never default. DLG-07: sheets use Done or Cancel + verb, never three. DLG-09: menus open from their ⋮ anchors (light/12, 27a).
- **Controls:** CTRL-03: every field has a floating label. CTRL-04: number fields validate inline, and speed uses a locale `NumberFormat`. CTRL-05: M3 pressed states. CTRL-06: menus hold related secondary commands, and primary actions stay visible. CTRL-07: "Search the Library · Episode titles, podcast names and show notes"; the Podcast page shows "1 of 500 Episodes". CTRL-08: OPML import shows determinate progress with Stop and Resume; downloads can be cancelled.
- **Lists:** LIST-01/02: list content, plus a two-column Day / Time listened table with noun headings. LIST-03: Sort lives in a sheet. LIST-04: titles wrap to three lines with a tail ellipsis. LIST-05: the Podcast page's details disclosure persists (`PodcastBrowsing.expanded`). LIST-06: the selected tab is underlined, the Cursor row says "Now", and options use radios.
- **Data safety:** DATA-01: drafts and browsing context persist in the database (`FormDraftStore`, `saveBrowsingContext`). DATA-04: a multi-step `EditHistory` with Undo and Redo through the snackbar, top-bar icons and Ctrl+Z. DATA-05: `reveal` brings restored content into view. DATA-06: destination, stacks, scroll positions, search text, Podcast page state and the stats table persist across relaunch (also stated in the capture README).
- **Drag:** DRAG-01: Entries drag, with Move up and Move down in the ⋮ menu and as TalkBack custom actions. DRAG-03: `moveEntry` records Undo. DRAG-05: lifted row with shadow, a 3 dp insertion line and haptics. DRAG-06: edge autoscroll, and the moved row stays highlighted and focused.
- **Pointer:** PTR-04: every `ActionIcon` has a `PlainTooltip`.
- **Appearance:** APPEAR-03: Light, Dark and System, and `UiModeManager` contrast raises primary and outline. APPEAR-04: computed ratios below. APPEAR-05: only framework animations, which follow the system animation scale. APPEAR-09: one outlined icon family. APPEAR-10: controls are set apart by tone, outline or accent.
- **Typography:** TYPE-02/03: Roboto, Regular and Medium, 12 sp minimum. TYPE-06: About your stats runs about 66 characters a line at 150% leading. TYPE-07: no all-caps. TYPE-08: curly quotes, …, – in date ranges, and − in remaining time.
- **Copy:** COPY-02: errors sit near their cause with a recovery ("Couldn't reach the server. Check its address…"). COPY-03: empty states mostly offer a next step.
- **Accessibility:** AX-01: labels on every icon button, headings, state descriptions, and live regions for errors and counts. AX-02: the subscribed check has a shape and a label; the Cursor is "Now" plus a tint. AX-04: custom actions for Move up/down and Show podcast details, a long-press label "Select Episode", and an Unsubscribe timeout from `getRecommendedTimeoutMillis`. AX-05: audio never autoplays; the Chapter title is shown.
- **Launch:** START-01 to START-06: a loading placeholder; Getting started can be hidden and reopened from Settings; the notification permission is asked at first download with a one-sentence reason; no account is required.
- **Other:** EDIT-05: show notes and descriptions in `SelectionContainer`, and Share Episode through the Sharesheet. TOOL-06: Now Playing always collapses to the mini player. SET-01: app-wide settings, Playlist settings and Subscription settings each sit with their scope.

**N/O:** FLOW-01, FLOW-02, KEY-07, LIST-07, PTR-03, WIN-03, RESP-01, FOOT-02

**N/A:** CTRL-02 (no checkbox hierarchy), START-07 (no accounts), EDIT-02 (native fields only), SIDE-03 and SIDE-04 (no split panes on a compact phone)

### Contrast (theme tokens, WCAG formula)

| Role | Ratio |
|---|---|
| Light onSurfaceVariant `#46464f` / surface `#faf8ff` | 8.86 |
| Light primary `#2b50c8` / surface | 6.46 |
| Light primary / surfaceContainer (nav, mini player) | 5.88 |
| Light primary / secondaryContainer (selection bar) | 5.28 |
| Light error `#ba1a1a` / surface | 6.13 |
| Light outline `#777680` / surface (field borders) | 4.25 |
| Light subscribed white / `#176b39` | 6.57 |
| Snackbar action `#b8c4ff` / `#303038` | 7.71 |
| Dark onSurfaceVariant / surface `#121318` | 10.89 |
| Dark primary `#b8c4ff` / surface | 10.93 |
| Dark subscribed `#00391a` / `#80db9a` | 7.82 |

All text and functional boundaries pass. Dividers (`outlineVariant`, 1.62) are decorative. Episode Artwork initials are publisher content.

## Platform fit (Android phone)

Side-by-side with Google's Settings, Gmail and Keep: nothing is imported from another platform. Two things sit off Android's usual grammar: Episode detail's ⋮ lives in the content beside the Artwork, not in the top app bar, and at 200% two action bars break words.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Native** (S) | `NavigationSuiteScaffold` with three equal destinations; Up on inner screens only; root actions + and gear. Contextual selection bar with ✕ and a count. Minor: the Episode overflow sits in content. |
| L2 Visual language | **Native** (S, C) | Consistent M3 roles derived from the seed, dark roles toned separately, M3 Expressive play button and slider. |
| L3 Density, text, system frame | **Adapted** (S, C) | 48 dp targets (`ActionIcon`, `SkipButton`, `CheckRow`, `heightIn(min = 48.dp)`); 12 sp minimum; edge to edge with `safeDrawing` insets and `imePadding`. At 200%, rows move their actions below the text (`stacked`). Two four-up action bars break words (TYPE-05). |
| B1 System navigation | **Native** (C) | `NavigableListDetailPaneScaffold` for predictive Back; `PredictiveBackHandler` collapses the player with progress; `enableOnBackInvokedCallback`; Back from the Playlists or Library root goes to Views; Back clears a selection and disarms Unsubscribe. |
| B2 Preferences and access | **Native** (C) | TalkBack labels and roles, headings, custom actions; text scales with layouts adapted at 1.5×; Light, Dark and System default; contrast preference honoured; all copy in resources. |
| B3 System surfaces and lifecycle | **Native** (C) | Sharesheet through `createChooser`; media session, Android Auto and a media-button receiver; notification permission in context; launcher shortcuts; drafts and browsing state persist past process death. |

**Looks 8.5 · Behaves 9.0 → Platform fit (8.5 + 2 × 9.0) ÷ 3 = 8.8.** No Platform-fit checklist group has a failure, so there is no cap. Behaves rests on code, not on a running app.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by TYPE-05; about 8.5 uncapped) | A small, role-mapped scale: top bar 20 sp Medium; Episode titles titleMedium 17 sp; metadata bodySmall 12 sp in onSurfaceVariant; section labels titleSmall 14 sp onSurfaceVariant; Episode detail title headlineSmall 22 sp. Typographic punctuation and 150% leading in reading text. The 200% word breaks hold it at the cap. | `hierarchy`, `accessibility` |
| Hierarchy | **8.4** | One primary per screen: Play now on Episode detail, Play/Pause at 112 × 88 dp in Now Playing, Create or Done in a pinned bar. Chrome stays tonal and quiet. Below Exemplary: the Episode ⋮ beside the Artwork splits actions between content and chrome; the Podcast page top bar reads a generic "Podcast" while the header is visible; the Library list mixes action rows and content rows. | `content-first`, `hierarchy` |
| Spacing & density | **8.2** | A 16 dp gutter everywhere, 56 dp value rows, 72–84 dp Episode rows, and sections at 20/8 dp. At 200%, row actions stack instead of crushing titles. Gaps: the Library list starts its text at three insets (Search 56 dp, Subscriptions 72 dp, Add podcasts 16 dp, light/20); Entry titles wrap early beside a 96 dp trailing cluster; the Welcome screen stacks everything in the top third and leaves the rest empty (light/40). | `craft`, `hierarchy` |
| Color & contrast | **8.7** | A restrained palette with fixed meanings: blue for actions and progress, green only for subscribed, red only for destructive actions and errors. All ratios pass (5.3–10.9). Dark is toned, not inverted, and the contrast preference is honoured. Kept below Exemplary by the theme flash at launch (APPEAR-11) and a mini player tone (surfaceContainerLow) barely separate from the nav bar (surfaceContainer). | `color-restraint`, `accessibility` |
| Iconography | **8.2** | One outlined family; skip glyphs carry 15 and 30; every icon button has a tooltip and a label. Gaps: Add to a Playlist is a bare **+** in rows and playlist-add elsewhere; the gear means app Settings on the roots but Subscription settings on the Podcast page *(owner)*; ◀◀ for "Rewind to here" needs a hint to read; Speed has no icon beside Sleep's moon; the Search row has a leading icon and Add podcasts below it has none. | `conventions`, `craft` |
| Consistency & polish | **7.8** (partial: no flow run; stability N/O) | Shared components (`CommitActions`, `ValueRow`, `RenameableName`, `FeedbackSheet`) make forms, sheets and messages largely uniform, and empty, loading, error and progress states are designed. Seven inventory mismatches (above), the TYPE-05 breaks and the launch flash keep it mid-Strong. | `craft`, `stability` |
| Clarity | **8.5** | Specific verbs and plain explanations: "An Entry leaves once its Episode is Played…", "Default (30 seconds)", and Rewind's Goes back to, Unplayed again and Kept. State is visible: the Cursor reads "Now", "In progress · 22:00 / 25:34", "1 of 500 Episodes". Gaps: the Default Playlist's settings drop Name and Delete without saying why (light/17); the pencil reads "Edit" but opens "Settings for…"; the subscribed check's meaning is visual-only *(owner)*; the Timeline needs a hint to explain its symbol. | `plain-language`, `feedback` |
| Platform fit | **8.8** | Looks 8.5, Behaves 9.0 (table above). | `conventions`, `stability` |
| Interaction & feedback | **8.7** (partial: code and stills, no timed runs) | Undo over confirmation everywhere, multi-step Undo and Redo (snackbar, top-bar icons, Ctrl+Z), drafts that survive closing the app, a two-tap Unsubscribe with an accessible timeout, inline errors with Try again, determinate and stoppable OPML import, and drag with keyboard and TalkBack alternatives. Unverified: response times, scroll smoothness and keyboard list navigation. KEY-08 is minor *(owner)*. | `forgiveness`, `feedback`, `user-control` |
| **Overall** | **8.2** | A forgiving, Android-native listening app: the primary tasks are direct, and state and recovery are always visible. Overall is held down most by the 200% label breaks (Typography cap), then by a set of small cross-screen inconsistencies. The cap is lowest 6.9 + 2.0 = 8.9, which is respected. | |

### What stands between this build and 9.0

1. **TYPE-05 (major)** caps Typography at 6.9 and Overall with it. Fixing the two `LabelledAction` bars should lift Typography to about 8.5 and Platform fit's L3 to Native.
2. **Consistency mismatches.** One rule for empty names: disable commit until there is text, or always explain afterwards, and use the same message ("A Playlist needs a name." / "There's already a Playlist called "X".") in the Add sheet. One subscribed treatment in Add podcasts results. One glyph for Add to a Playlist. A next-step button on the empty Listening stats ("Find Episodes"). One naming form for Save as a View.
3. **Small clarity and copy fixes.** Pencil labels that name their destination (COPY-01); Play Now / Next / Last capitalised (COPY-04); a line on the Default Playlist's settings ("The Default Playlist can't be renamed or deleted.").
4. **Craft gaps that keep categories out of Exemplary.** Move Episode detail's ⋮ into the top app bar. Give the Library's Add podcasts row a leading + so the list keeps two text insets, not three. Follow the in-app Appearance at launch (APPEAR-11). Separate the mini player tonally from the nav bar (surfaceContainerHigh, or a hairline).
5. **Evidence.** A scripted flow run (core positions per step, five timed passes) is needed before Consistency & polish and Interaction & feedback can be scored as Exemplary rather than partial.

## Next step

- **Target:** TYPE-05 (major failure, in the lowest category, on the primary task's Episode actions).
- **Anti-pattern:** none named in anti-patterns.md fits. Closest is L3's "text clipped at 200% font scale" Foreign tell.
- **Root cause:** `LabelledAction` divides the width into four fixed `weight(1f)` slots and lets the label wrap inside the slot, so a single word wider than the slot breaks between characters. The adaptive switch the app uses elsewhere (`fontScale >= 1.5f`) is missing here.
- **Change:** in `EpisodeDetail`'s action row and in `SelectionActionBar`, use a `FlowRow` with `maxItemsInEachRow = if (LocalDensity.current.fontScale >= 1.5f) 2 else 4`, keeping each slot `weight(1f)` and `heightIn(min = 48.dp)`. At 1.0 the layout is unchanged. Re-capture font200/03 and font200/50.
- **Principle:** `accessibility`, `adaptability`.
- **Expected effect:** the TYPE-05 cap is removed (Typography about 8.5), L3 becomes Native, Consistency & polish improves slightly, and Overall moves to about 8.6. No signature element is touched.
