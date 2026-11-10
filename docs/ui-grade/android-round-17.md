# PodList Android phone: UI grade, round 17

Build: `main` at 6c39153 (the capture's build). Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android › Phone). Target: **Android phone** only. Tablet and foldable are separate targets and out of scope.

Evidence:
- Capture `android-grade-17/` (Pixel 10 Pro XL emulator profile, Android 16, 1344 × 2992 px, density 3.0, compact window): 54 screens × light, dark and 200% font scale, each with a screenshot and an accessibility snapshot.
- Flow run `flow-run/20261111-014555-601/`: summary, `measurements.csv` (7,138 rows), `timings.csv`, `frames.csv`, and a 338-image strip.
- The app code under `apps/android/app/src/main` (manifest, theme, shell, every screen).
- I measured contrast from the full-resolution PNGs by sampling the dominant background and the most extreme glyph colour in each text box. dp values are px ÷ 3.

Not driven: no emulator or device was used. Anything that neither the capture nor the code settles is N/O.

## Frame

- **Task:** find Episodes through Views and Search, queue them in Playlists, and listen. A Library of Subscriptions supports this, with or without a server.
- **Target:** Android phone, compact window.
- **Posture:** sovereign for browsing and queueing; transient for playback control (mini player, Now Playing, notification).
- **Audience:** perpetual intermediate. Someone who listens to podcasts daily and has opinions about their queue.
- **Nearest exemplar:** Things, for the calm list-and-detail personal tool. Its lesson here is one quiet list per screen, state only where it differs, and every detail finished. On Android, the side-by-side apps were Google's Keep, Gmail and Settings.
- **Character:**
  - stock Material 3 frame with the #2b50c8 blue accent and a toned dark theme (owner);
  - coloured initials tiles as Artwork placeholders;
  - capitalised domain nouns used as plain language (Views, Entries, Played, Download Rule);
  - explanatory sentences under consequential controls;
  - a mini player and Now Playing that carry no titles (owner).
- **Owner decisions (graded, not targeted):**
  - native M3 look with accent #2b50c8 and a dark theme;
  - bottom navigation with Views, Playlists and Library;
  - Add podcasts as one field;
  - the View editor as one list;
  - Rewind as a summary sheet;
  - OPML import and export in Settings;
  - after relaunch, the mini player shows the current Entry, paused;
  - no podcast or Episode names on Now Playing or the mini player;
  - Delete Playlist asks nothing first, then offers Undo;
  - a compact Podcast page header, with the description behind a pull-down, Subscribe in the top bar and a green check once subscribed;
  - Unsubscribe takes two taps with no dialog, then offers Undo;
  - an explicit Rename step with Cancel and Save;
  - Playlist and View names are unique, ignoring case;
  - shortcuts appear only in Android's Keyboard Shortcuts panel (Ctrl+Z and Ctrl+Shift+Z are registered).

## Flows

**Tasks run:** five main tasks, from the capture README and the flow summary:
- A: Views → Episode → Add to a Playlist → Undo.
- B: play from a Playlist → Now Playing → reorder → Undo.
- C: Add podcasts → Podcast page → Subscribe while typing → Undo.
- D: New Playlist → Rename → Undo.
- E: Search → Create View.

**Conditions:**
- Width: compact only (448 dp).
- Appearances: Light and Dark.
- One delayed pass (every HTTP completion held 2 s), with characters typed during pending completions.
- Five undelayed timed passes per appearance, on a debug build in an Android 16 emulator on a Mac host, with no throttling.
- Script: `apps/android/app/src/androidTest`.
- Evidence: `measurements.csv`, `timings.csv`, `frames.csv` and the strip in `flow-run/20261111-014555-601/`.

**My read of the method.** It's sound for the stability checks.
- It records each core element's box at every step, whether the person caused the change (input age), focus, scroll, typed values and follow-up visibility.
- I read the candidate audit's exclusions and agree with them. Navigation captures taken mid-transition are caused by the person. Snackbar "Undo"/"Redo" moves are follow-ups, not core elements. Scrolls were requested.
- The harness left 6 FLOW-01 comparisons unresolved. In all 6 the subscription slot moves 8.3 dp when the person taps Subscribe, or taps Undo after subscribing (rows 89→92, 104→107, 268→271, 282→285). The code settles them. `PodcastPageScreen.changeSubscription` writes `subscriptionTransitions` synchronously inside the tap handler, so the subscribed control (spinner, then the check) replaces Subscribe in the same frame as the tap. The later server reply only swaps the spinner for the check inside a fixed-width box. The move is caused by the person, so FLOW-01 passes.
- Gaps in the method:
  - It ran only the compact portrait width. Phone landscape (an expanded window on this device) and 200% text weren't run as flows.
  - The timing passes ran a debug build on an emulator, so RESP-01 and FOOT-02 stay N/O, as the summary says.
  - It doesn't audit FLOW-05, FLOW-06 or FLOW-07. I judged those from the screenshots.

**Failures:** none.
- FLOW-02 passes (20 candidates, all requested or mid-transition).
- FLOW-03 passes. Typing "Long E" into Search Episodes while Subscribe was pending survived the completion (rows 97→98; strip C-0097 → C-0098).
- FLOW-04 passes (`follow_up_visible` = true on all 148 follow-up rows).

**Timing note (N/O, not scored):** some steps settled after 1 s with no busy indicator observed in a debug build:
- C/clear-query: 1.04–1.52 s in 3 of 5 runs (timings rows 80, 132, 184);
- C/next-item: up to 1.38 s (rows 84, 136);
- C/dismiss-keyboard: up to 1.16 s.

These are the ones to re-time on a release build on real hardware.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views root | Snackbar above mini player ("View created") | Offline/sync row under top bar, bodySmall + "Try again" | none | Snackbar action; top-bar Undo icon after | Inline sentence + tonal button, top-leading ("No Views yet…" / New View) | Spinner + "Loading local Library…" | "+" in top bar | Getting started card, Hide |
| View | Snackbar | none | none | Snackbar + top-bar Undo | Inline + tonal ("No Episodes match this View…" / Edit conditions) | — | Row Play / Add icons; pencil in top bar | none |
| Episode detail | Snackbar | Inline error under action grid + "Retry …" text button | none | Snackbar + top-bar Undo | "Episode details are still syncing" | — | Full-width filled "Play Now" | none |
| View editor / New View | — | Inline red supporting text under number fields | none | Snackbar + top-bar Undo | — | — | Pinned bottom bar, trailing filled "Done" / "Create View" + "Discard draft" | Hint under "Show Episodes where" |
| Playlists, Playlist | Snackbar ("Moved “…” in Default") | — | none | Snackbar + top-bar Undo | Inline + tonal | — | "+" in top bar; row Play | Current Entry label + accent bar |
| History / Timeline | — | — | Rewind sheet: summary, Cancel + filled "Rewind" | Snackbar after Rewind | Inline + tonal ("No History yet…" / Show Entries) | — | Row tap opens Rewind sheet | Hint at top of Timeline |
| Playlist settings / Rename | Snackbar ("Playlist … moved to Trash") | Inline red under Name field | none | Snackbar Undo | — | — | Rename: Cancel + filled Save under the field, trailing | Sentence under Delete Playlist |
| Trash | — | — | none | — | Inline + tonal (Back to Playlists) | — | — | Empty text explains restore |
| New Playlist | Opens the Playlist | Inline red under field | none | Snackbar | — | — | Filled "Create Playlist" under field, trailing | none |
| Library | — | Standalone: inline refresh failure + Retry | none | Snackbar | Inline + tonal (Add podcasts) | Spinner | "+" in top bar | "Download Rule" eyebrow + help |
| Search | Opens created View | Inline red under name field | none | Snackbar | Inline + tonal (Clear search) | Spinner | "Save as a View" text button → Cancel + filled "Create View" | none |
| Add podcasts | Green check in row + snackbar "Subscribed to …" | Inline red under field / under row | none | Snackbar | — | 4 dp line under button | **Tonal** "Find podcasts" under field, trailing | Field label states both inputs |
| Podcast page | Green check in top bar + snackbar | Inline red under top bar + "Try again" | Two-tap Unsubscribe (red text in the check's slot, auto-disarms) | Snackbar | Inline + tonal (Refresh / Clear search) | 4 dp slot under top bar | Filled "Subscribe" in top bar | Show/Hide podcast details |
| Settings / Subscription settings | Silent (live apply); top-bar Undo icon | Inline red + Retry (OPML) | none | Top-bar Undo icon only | — | Determinate OPML progress + Stop | Value rows → sheets with "Done" | Hint under each section |
| Listening stats | — | — | none | — | Inline + tonal (Find something to play) | — | — | "About your stats" |
| Welcome / Connect | Opens app | Inline red replaces "For example…" under field | none | — | — | "Checking server…" on button + linear progress | Filled "Check and connect" under field, trailing | Example under field |
| Now Playing / mini player | — | Snackbar "Retry" + play button turns error-tinted retry | none | top-bar Undo | — | Spinner in play button | Filled play | none |

**Mismatches:**
1. **Emphasis of a single-field form's main action.** "Find podcasts" is tonal (Add podcasts). "Create Playlist", "Check and connect" and Rename's "Save" are filled. Screens: 26/59 vs 19, 41, 16b.
2. **Label/value hierarchy in the same kind of row.** The Rename block puts a 14 sp Medium grey label over a 16 sp value: "Name / New this week" in 04 and 16c. Every other value row puts a 16 sp label over a 14 sp grey value: "Published / Last 7 days" in 04, and Settings 06. Library adds a third form: a 12 sp eyebrow "Download Rule", a 16 sp SemiBold "Stream", then help (20). Subscription settings shows the same fact as an ordinary value row (24).
3. **Gap from the list heading to the first row.** Measured centre to centre: View "Last 7 days · Unplayed" → first title ≈ 48 dp (02); Search "15 Episodes" → ≈ 42 dp (21); Podcast page "5 Episodes" → ≈ 65 dp (23, 60). The Podcast page carries a 16 dp spacer, a permanent 4 dp loading seam and 12 dp of column spacing under its heading.
4. **Edit confirmations.** Episode, Playlist and Subscription edits confirm with a snackbar. Settings and Subscription-override changes are silent (`notify = false`), leaving only the top-bar Undo icon. This is defensible for live settings, but it's a second pattern.

## Checklist

**Coverage: 94.6%** (pass 68 · fail 2 · N/O 4 · N/A 5, out of 79 core IDs).

Platform-fit signals (§ Android › Phone):

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native | Bottom bar with 3 equal destinations; top app bar with title; Up only on inner screens, none at roots (01, 10, 20); actions are never mixed into the bar's destinations. (S, C) |
| L2 Visual language | Native | Consistent M3: ListItem rows, outlined fields, tonal/filled/outlined buttons, M3 sheets and snackbars. One icon-set slip, APPEAR-09 below. (S) |
| L3 Density, text, frame | Native | Every control ≥ 48 dp in code (`ActionIcon`, `CommitButton`, `ContentTextButton`, `LabelledAction` and ChoiceRows rows all use `heightIn(min = 48.dp)`). Type in sp, 12 sp minimum. Edge to edge with `safeDrawing` insets. 200% text reflows: bar actions drop to their own row, row actions stack below, tiles stack (font200/*). (S, C) |
| B1 System navigation | Native | Manifest sets `enableOnBackInvokedCallback="true"`. `NavigableListDetailPaneScaffold` gives predictive back. `PredictiveBackHandler` collapses Now Playing. Back clears selection, disarms Unsubscribe, and returns a non-Views root to Views. (C) Predictive animation itself is N/O. |
| B2 Preferences and access | Native | TalkBack names on every control in the snapshots. sp text. System default / Light / Dark. The theme follows `UiModeManager.contrast` (MainActivity). All strings are in resources. (S, C) |
| B3 System surfaces and lifecycle | Native | `Intent.createChooser` Sharesheet. A "downloads" notification channel. Notification permission asked at first download, behind a reason. MediaLibraryService, media button and Android Auto. Launcher shortcuts. Browsing context, drafts, selections and scroll persisted to the DB, so they survive process death. (C) |

**Failures by severity:**

*Blocker:* none. *Major:* none.

*Minor:*
- **[APPEAR-09] The bottom bar's icons don't form one set** (minor, craft).
  - **Where:** the navigation bar on every top-level screen (01, 10, 20).
  - **Evidence:** Views is a solid, filled funnel. Playlists is line strokes and Library an outlined box, so one glyph carries roughly twice the visual weight of its neighbours. Selecting a destination doesn't switch its icon to a filled variant: compare Library unselected in 10 with Library selected in 20. The only state cues are the pill and the label colour.
  - **Fix:** use one style per state for all three. Outlined for unselected (`filter_alt` outlined, `playlist_play`, `inventory_2` outlined) and the filled variants when selected, chosen in `ConnectedNavigation`'s `item(icon = …)` from `destination == target`.
- **[COPY-01] Getting started names commands the person can't see where it sends them** (minor, plain-language).
  - **Where:** the Getting started card, step 3 (42; string `m4_step_playlists_help`).
  - **Evidence:** it says 'Use “Play Next” or “Play Last” on an Episode', but no Episode row or Episode page shows those words. The visible command is "Add" (icon `ic_playlist_add`, labelled "Add to a Playlist" for TalkBack). Play Next and Play Last appear only inside the sheet that Add opens.
  - **Fix:** "Choose Add on an Episode, then Play Next or Play Last. The Default Playlist is ready."

**N/O:** KEY-07, PTR-03, RESP-01, FOOT-02.

**N/A:**
- CTRL-02: no checkbox hierarchies.
- LIST-04: no dense multi-column rows.
- START-07: no accounts.
- SIDE-03, SIDE-04: no side panes at phone width.

**Pass, with the evidence for checks that rest mainly on code:**
- **FLOW-01:** flow run plus code (see Flows).
- **FLOW-05:** the stats tiles share top and height via `IntrinsicSize.Min` (33).
- **FLOW-06:** no empty section headings. "Save as a View" appears below the field and never moves it.
- **FLOW-07:** single-field forms commit under the field, trailing; multi-field forms in a pinned bottom bar (the `CommitActions` rule).
- **KEY-01:** all controls are Material components or `clickable`/`toggleable`/`selectable`. The chart has previous/next-day buttons and a table.
- **KEY-04:** `FocusedInputModifier` focuses new input tasks. Rename returns focus to the Rename button.
- **KEY-06:** Ctrl+Z and Ctrl+Shift+Z.
- **KEY-08:** `onProvideKeyboardShortcuts` registers them with Android's own panel; no bare-key accelerators.
- **DLG-01 to DLG-05, DLG-07, DLG-09:**
  - the only alert is the notification rationale: "Show download progress?", with Continue / Not now;
  - destructive buttons are red outlined and never the default;
  - Rewind has Cancel;
  - menus open from their anchors.
- **CTRL-03 to CTRL-08:**
  - every field keeps an M3 floating label;
  - numbers are parsed and formatted by locale, with field-specific errors;
  - Search states its scope ("Search the Library", "Search Episodes");
  - OPML import shows determinate progress with Stop and Resume.
- **LIST-05:** "Show podcast details" expansion is persisted per podcast.
- **LIST-06:** radios mark the chosen option; the Current Entry has a label, an accent bar and a tint.
- **LIST-07:** rows are focusable, tap opens, long-press selects, and Ctrl+A selects all.
- **DATA-01:** drafts are written to `FormDraftStore` and flushed in `onStop`.
- **DATA-04, DATA-05:** an `EditHistory` with Ctrl+Z and Ctrl+Shift+Z, a snackbar Undo and a persistent top-bar Undo. Undo reveals and focuses the moved Entry.
- **DATA-06:** `BrowsingState` (tab, back stacks, scroll, selection, search text, stats day) is saved to the DB.
- **DRAG-01 to DRAG-06:**
  - a drag handle with Move up/down in the menu and as TalkBack custom actions;
  - edge autoscroll and a 3 dp insertion line;
  - a lifted row with an 8 dp shadow;
  - the moved row stays highlighted for 1.8 s;
  - the move is undoable.
- **PTR-04:** a `TooltipBox` on every icon button.
- **APPEAR-03:** both themes, plus the system contrast level.
- **APPEAR-04:** every sample measured 5.46:1 or better:
  - light secondary text #46464f on #faf8ff: 8.86:1;
  - dark #c7c5d0 on #121318: 10.89:1;
  - light Current Entry label #2b50c8 on #efeffc: 5.97:1;
  - dark selected row #c7c5d0 on #434659: 5.46:1;
  - subscribed check #176b39 on #faf8ff: 6.23:1;
  - dark check #80db9a on #121318: 11.06:1;
  - light navigation labels: 5.59:1 selected, 8.06:1 unselected.
- **APPEAR-05:** Compose animations follow the system animator duration scale.
- **APPEAR-11:** the flow found no unprompted shifts; loading draws in permanent 4 dp seams.
- **TYPE-02 to TYPE-08:**
  - system font, weights from Regular to SemiBold, 12 sp minimum;
  - 200% text keeps hierarchy and content;
  - "About your stats" runs about 60 characters a line at 150% leading;
  - no all caps;
  - curly quotes and "…" throughout `strings.xml`.
- **COPY-02 to COPY-04:**
  - errors sit under their cause with a recovery;
  - every empty state names its next step;
  - capitalisation follows the CONTEXT.md glossary consistently.
- **AX-01, AX-02, AX-04, AX-05:**
  - labels and roles in the snapshots;
  - the check, the Current Entry and selection are never colour alone;
  - drag, pull-down and swipe each have a button alternative;
  - the two-tap timeout uses `getRecommendedTimeoutMillis`.
- **START-01 to START-06:**
  - local data loads first;
  - Getting started can be hidden and reopened from Settings › Help;
  - the notification permission is asked in context, behind a reason;
  - no account is required.
- **EDIT-02, EDIT-05:** native fields; selectable show notes; Copy feed address and Share.
- **WIN-03:** `NavigationSuiteScaffold` and the list-detail scaffold adapt; no orientation lock; the player layout falls back to scrolling.
- **TOOL-06:** hidden navigation and player chrome return when the contextual mode ends.
- **SET-01:** one Settings place; Subscription and Playlist settings stay with their objects.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.2** | A small M3-derived scale: titleMedium 17 sp Medium for row titles, bodyMedium 14 sp grey for metadata, titleSmall 16 sp SemiBold grey for section labels, headlineSmall for the Episode headline. System font, typographic punctuation, clean 200% reflow. Two things keep it below 9. First, two text roles invert between neighbouring rows: Rename's 14 sp label over a 16 sp name, against value rows' 16 sp label over a 14 sp value (04). Second, four nearly equal sizes (14/16/16/17 sp) do four jobs, so weight and grey carry most of the structure. | `hierarchy`, `craft` |
| Hierarchy | **8.3** | One filled primary per screen: Play Now (03), Subscribe (60), Create View (05). Quiet top bars and inset hairline rows. Below 9 for three reasons: (1) Episode detail shows two filled blue play controls at once, Play Now and the mini player's play (03). (2) Library opens with three header layers ("Subscriptions" › "Download Rule" › "Stream" + help) before any podcast (20), so the list reads like a settings page. (3) Every row spends a third line on the default state "Unplayed" (02, 21, 23), which gives the exception and the norm equal weight. | `content-first`, `hierarchy` |
| Spacing & density | **8.1** | A 16 dp gutter and keyline everywhere; 48 dp targets; calm density that suits the posture. Below 9 for three reasons: the heading-to-first-row gap varies from 42 to 48 to 65 dp (21 / 02 / 23); the Podcast page's top-bar actions sit about 75 and 87 dp apart against 48 dp on every other bar (23, 63), because the check is centred in an invisible "Unsubscribe"-wide slot; and the default "Unplayed" line adds about 20 dp to most rows. | `craft`, `hierarchy` |
| Color & contrast | **8.7** | Restrained, with fixed meanings: blue means interactive or current, green only for Subscribed, red only for destructive. A properly toned dark scheme. Every sample passes, with the lowest at 5.46:1, and the theme follows the system contrast level. Below 9: the selected navigation label (#5a5d72) is lighter than the unselected ones (#46464f), so selection reads weaker than its neighbours (stock M3 Expressive token, 01, 10). | `color-restraint`, `accessibility` |
| Iconography | **8.1** | One Material Symbols family with familiar meanings (funnel = filter, gear, star, download, moon = sleep) and TalkBack labels and tooltips everywhere. Pulled down by APPEAR-09: a mixed-weight bottom bar and no filled selected state. Also, the 15/30 skip numbers are text drawn over the arrow glyphs and don't sit optically centred in the mini player, and Timeline repeats a decorative rewind glyph on every row (14). | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability 8.6) | Every state is designed: empty, loading seam, error with retry, disabled, selection, armed, 200%. Inventory mismatches 1–4 above keep it from 9. So does a 200% polish defect on Episode detail (font200/03b): the split top bar paints its action row in the surface colour under a grey scrolled band, so the scrolled headline is sliced under a white strip while the bar title is still blank. The sub-score holds core elements still through all five tasks; follow-ups are always in view; typed text survives completions. | `craft`, `stability` |
| Clarity | **8.1** | Specific verbs, consequences stated under controls ("It goes to Trash with its History…", "Episodes stay in your Library."), empty states with a next step. Held down by four things: (1) the owner-decided absence of titles in the mini player and Now Playing, so what's playing is visible only as initials; (2) the COPY-01 Getting started mismatch; (3) glossary capitalisation that reads as mixed case to a newcomer ("Select Subscriptions" beside "Add podcasts", "Playback Settings" beside "Your listening"); (4) "Then / Sort / Show" in the View editor, which is terse. | `plain-language`, `feedback` |
| Platform fit | **8.9** (Looks 8.8 · Behaves 9.0) | Every signal is Native (table above). Looks loses a little: Search is a plain outlined field on a page rather than an M3 search bar, the nav icon set is inconsistent, and the 200% split bar has a defect. Behaves loses a little because predictive-back animation, process-death restore and TalkBack order were not observed live. (8.8 + 2 × 9.0) ÷ 3 = 8.93. | `conventions`, `stability` |
| Interaction & feedback | **8.9** (partial: RESP-01 N/O) | Undo and Redo on every edit, with Ctrl+Z and Ctrl+Shift+Z and a persistent top-bar Undo. Drafts survive leaving and process death. Drag has menu and TalkBack alternatives. The two-tap Unsubscribe timeout follows the accessibility timeout. In-context permission. Short of 9 because responsiveness is unproven: three debug-build steps settled after 1 s with no busy indicator observed. | `forgiveness`, `feedback` |
| **Overall** | **8.5** | Serves the task well and is at home on Android: behaviour and data safety are at exemplar level. Held down most by visual finishing, in Spacing, Iconography and Clarity at 8.1. Cap: lowest 8.1 + 2.0 = 10.1, so it doesn't bind. | — |

## Next step

**Target:** Spacing & density, tied lowest with Iconography and Clarity and the closest of the three to the primary task. The Episode list is where people browse, and its rows are on every main screen.

**Anti-pattern:** "everything at equal weight". Default state is printed as loudly as the exceptions.

**Root cause:** `EpisodeRow` always renders a third line for play state, so the default "Unplayed" costs every row about 20 dp. The list headings then sit on screen-specific spacers (the Podcast page adds a 16 dp spacer and a permanent 4 dp seam inside a 12 dp-spaced column), so the heading-to-row rhythm differs on each screen.

**Change:**
1. In `EpisodeRow`, render the state line only when it carries information: In progress (with its bar), Played, or Starred. Omit "Unplayed". This takes typical rows from about 90 dp to about 70 dp.
2. Give `EpisodeList`'s summary, Search's count and the Podcast page's count one shared bottom spacing: 8 dp, then row padding. Move the Podcast page's loading seam into the 8 dp gap so it doesn't add height.

**Principle:** `content-first`, `hierarchy` (state shown where it differs).

**Expected effect:**
- Spacing & density up about 0.4, Hierarchy up about 0.2, and the inventory's mismatch 3 removed.
- Risk to Clarity: the "Unplayed" filter in Views must stay understandable without a per-row label. Check this in "New this week".

**Gap to 9.0, in order of payoff** (each is a craft fix; none is blocked by an owner decision):
1. The Next step above.
2. APPEAR-09: outlined glyphs for unselected destinations and filled for selected; and set `selectedTextColor` to `onSurface` so the selected label is the strongest.
3. One value-row form. Use `ValueRow`'s label-over-value for the Rename block, and a `Section` header for Library's Download Rule group, which also lightens the Library's header stack.
4. Podcast page top bar: keep the reserved width but align the check to the slot's end, so the gear, check and ⋮ keep a 48 dp pitch.
5. At font scale ≥ 1.5, paint `PodListTopAppBar`'s action row with the bar's scrolled container colour, and let `CollapsingTitle` treat the action row as covering the headline, so the title shows in the bar once the headline is clipped.
6. COPY-01: rewrite Getting started step 3.
7. Make "Find podcasts" filled, like the other single-field commits, unless the owner wants Subscribe as the page's only filled button. In that case, document the exception.
8. Re-time C/clear-query, C/next-item and dismiss-keyboard on a release build on mid-range hardware. If any still settles after 1 s, show the existing 4 dp loading seam from about 300 ms.
