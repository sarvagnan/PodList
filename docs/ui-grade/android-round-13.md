# PodList Android phone — UI grade, round 13

Graded 2026-11-10 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit; core-checklist.md; platform-fit.md § Android › Phone; rubric.md). Build: main `372c52b`. Target: **Android phone** only (compact window). Tablet and foldable are separate targets and were not graded.

Evidence used:
- **Capture** `android-grade-13/` (Pixel 10 Pro XL profile, Android 16, 1344×2992 px, density 3.0, so 448 dp wide): every screen in `light/`, `dark/` and `font200/` as PNG plus accessibility snapshot.
- **Flow run** `flow-run/20261110-204453-069/` (`summary.md`, `measurements.csv`, `timings.csv`, `frames.csv`, screenshot strip).
- **Code** under `apps/android/app/src/main` (manifest, `MainActivity.kt`, `PodListScreens.kt`, `PodcastPageScreen.kt`, `PlayerPresentation.kt`, `HistoryActions.kt`, `EntryDragging.kt`, `PlaybackActions.kt`, `SheetFeedback.kt`, `EditorComponents.kt`, `ViewEditor.kt`, `GettingStarted.kt`, `IncomingContent.kt`, `ArtworkImage.kt`, `res/values/strings.xml`), and `docs/design/android.md`.
- **Contrast** was measured on the PNGs: the dominant background against the most distant foreground in a crop, WCAG formula. No device or emulator was driven.

## Frame

- **Task:** find Episodes through Views and listen through Playlists. This includes adding podcasts, queueing with Play Next and Play Last, and controlling playback from the mini player and Now Playing.
- **Target:** Android phone, compact width (448 dp).
- **Posture:** sovereign, used daily, with transient sessions such as queueing and quick playback control.
- **Audience:** perpetual intermediate, with newcomers on first run.
- **Nearest exemplar:** Things (a calm personal tool with a precise domain vocabulary), used for craft, not look. The Android comparison is Google's own Material apps.
- **Character:**
  1. PodList blue `#2b50c8` on Material 3 tonal surfaces, with a dark theme toned on its own (owner).
  2. Capitalized domain vocabulary used exactly: View, Playlist, Entry, Episode, Played, Listening Timeline, Rewind.
  3. Plain explanatory sub-lines under settings and destructive actions ("It goes to Trash with its History and Listening Timeline, and can be restored for 30 days.").
  4. A control-first player with no names, where Artwork identifies what's playing (owner).
  5. Undo instead of confirmation, everywhere.
- **Owner decisions** (graded but not proposed for change): Material 3 with accent `#2b50c8` and a dark theme; bottom navigation with Views, Playlists and Library; Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; the mini player restoring the paused Entry; no names in Now Playing or the mini player; Delete Playlist without a question, with "Playlist <name> moved to Trash" and Undo; the compact Podcast page with a pull-down description, Subscribe in the top bar and a green check; Unsubscribe in two taps with Undo and the person staying on the page; Rename as an explicit step with Cancel and Save; Playlist and View names unique, ignoring case; no shortcut list in the app, with Ctrl+Z and Ctrl+Shift+Z in the system Keyboard Shortcuts panel.

## Flows

- **Tasks run:** A, Views → Episode → Add to a Playlist → Undo; B, Playlist play → Now Playing → reorder → Undo; C, Add podcasts → Podcast page → Subscribe while typing → Undo; D, New Playlist → Rename → Undo; E, Search → Create View.
- **Widths and appearances:** one compact phone width (448 dp), in Light and Dark. Compact is the only width class in scope.
- **Passes:** one delayed pass (2,000 ms per HTTP completion) and five undelayed timed passes per appearance.
- **Device:** a Google `sdk_gphone64_arm64` emulator running Android 16 on a Mac, with a debuggable build and no throttling. This is not audience hardware, so RESP-01 and FOOT-02 are N/O.
- **Script:** `apps/android/app/src/androidTest` (documented in `apps/android/README.md`). Output is `measurements.csv`, `timings.csv`, `frames.csv` and the PNG strip in the flow-run folder.

**How I read the run's method.** It's careful:
- Settled captures are compared with settled captures.
- Pending results are compared with their completions without input in between.
- Every excluded candidate is listed with its reason.

It has one blind spot that matters here: it matches elements by accessibility label. When a control changes its label as it changes state (Subscribe → "Subscribing…" → "Subscribed to … Activate to show Unsubscribe." → Subscribe), the before and after don't pair up. Row 100 shows `delta_x_dp` blank for exactly these elements, so the harness's "FLOW-01 N/O, 0 findings" doesn't cover the Podcast page's main action. I paired those rows by hand, below.

**Failures**
- **[FLOW-01] (major).** Podcast page, top-bar Subscribe control, flow C.
  - **After Subscribe completes:**
    - The main action sits at x = 316 dp, w = 68 ("Subscribing…") in rows 94–99. It is replaced at the unprompted completion (input age 3,898 ms) by the check at x = 336 dp, w = 48, a leading-edge move of **+20 dp**.
    - A new Subscription settings gear lands at x = 288–336 dp, where the left part of the pending control had been.
    - Light: `measurements.csv` rows 99 → 100, `C-0099-typing-pending-light.png` → `C-0100-subscribe-completion-light.png`. Dark: rows 278 → 279, `C-0278…` → `C-0279…`.
  - **After Undo of the subscription completes:**
    - The check stays at x = 336 dp with no busy state in rows 107–108 (Undo tapped, 116–384 ms).
    - At the unprompted completion it becomes the 111 dp Subscribe button at x = 273 dp (input age 2,315 ms), a move of **−63 dp**.
    - Light rows 108 → 109 (`C-0108…` → `C-0109-undo-subscribe-done-light.png`). Dark rows 287 → 288.
- No other FLOW failure:
  - **FLOW-02:** pass, 30 candidates, all person-caused.
  - **FLOW-03:** pass. "Long E" survives the Subscribe completion (rows 99 → 100, Light and Dark).
  - **FLOW-04:** pass. The snackbar is in view above the keyboard and player.
  - **FLOW-06, FLOW-07:** pass from the strip and captures.

**Other flow observations (not failures).**
- The Appearance sheet's heading moves 48 dp when the snackbar inside the sheet is dismissed by the tap (`appearance-0186` → `0187`, heading:4, Δtop 48 dp). It happens within the input frame, so it is person-caused. It still shows that a sheet's snackbar takes layout space; see the inventory.
- The top bar's Undo and Redo icons disappear whenever a snackbar carries Undo (`EditHistoryMenu`, `SubscriptionRefreshStatus.kt:33`). The other top-bar actions then reflow unprompted. For example, Subscribe sits at x = 321 dp with no history (row 82) and at x = 273 dp with history (row 83).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views, View | Snackbar above mini player: "<Object> <past verb>" (`1 Entry added to Default`), inverse surface | Strip under the app bar: "Offline · Showing local data…", with Retry | none | Snackbar Undo; persistent Undo and Redo icons in the app bar | View: "No Episodes match this View" with Edit this View (tonal) | `Loading()` spinner and "Loading" | Row Play, and + to Add, trailing | Getting started card (dismissable with Hide; in Settings › Help) |
| Episode detail | Snackbar, same form | Inline under the row (`actionError`) | none | Snackbar and app-bar Undo | n/a | n/a | Play Now, a filled full-width pill | none |
| View editor (Edit, New) | Snackbar "View X deleted" | Inline field supporting text ("There’s already a View called…") | none | Snackbar and app-bar Undo | n/a | n/a | Pinned footer: count, then **Done** or **Create View** with Discard draft | Footnote: "Conditions change this View right away…" |
| Settings and its choice sheets | Snackbar *inside the sheet* (sheet height changes) | Inline numeric errors | none | Snackbar Undo | n/a | n/a | Sheet: Done, trailing at the bottom | Sub-lines under each row |
| Playlist (Entries, History, Timeline) | Snackbar | Inline | Rewind sheet: "Rewind Default to Nov 6 · 2:30 PM?" with Cancel and Rewind | Snackbar and app-bar Undo | History: "No History yet. Finish an Episode…" with Show Entries | n/a | Row Play from here | Timeline hint line |
| Playlist settings | "Playlist Commute moved to Trash" with Undo | Inline field supporting text | none | Snackbar Undo | n/a | n/a | No commit (live); Rename gives Cancel and Save under the field | Sub-lines |
| Trash | n/a | n/a | none | n/a | "No deleted Playlists", an explanation, then **Back to Playlists** | n/a | n/a | Explanation |
| Library | Snackbar | Refresh status inline under the Subscription | none | Snackbar Undo | "No Subscriptions yet" with Add podcasts; "No podcasts" under each empty rule group | Loading | + (Add podcasts) | none |
| Add podcasts | Snackbar "Podcast X subscribed" | Inline under the field ("Couldn’t find podcasts. Check your connection and try again.") | none | Snackbar Undo | n/a | n/a | Find podcasts, trailing under the field; Subscribe per result | Field label "Podcast name or feed address" |
| Podcast page | Snackbar "Podcast X subscribed" with Undo, plus the green check | Page-load error in the header; row errors inline with Retry | Unsubscribe armed (red button), no dialog | Snackbar and app-bar Undo | "No Episodes yet. New Episodes appear here when this podcast publishes them." | Busy pill in the top bar | Subscribe, trailing in the top bar | "Show podcast details" pull-down |
| Subscription settings | Snackbar | Inline | none | Snackbar Undo | n/a | n/a | No commit (live) | "Default (…)" values name what they inherit |
| Listening stats | n/a | n/a | none | n/a | "No listening yet…" with Find something to play | n/a | n/a | "About your stats" |
| Welcome, Connect | n/a | Inline under the address field | none | n/a | n/a | n/a | Start on this phone (filled) / Check and connect, trailing under the field | Explanatory lines |
| Now Playing, mini player | n/a | Snackbar with Retry, and Retry on the transport | none | n/a | n/a | Buffering spinner in the Play button | Play/Pause, center | none |
| Multi-select | Snackbar | n/a | none | Snackbar Undo | n/a | n/a | Bottom action bar: Add to a Playlist, Mark Played, Star, Download | none |

**Mismatches**

1. **Commit model.** The View editor pins a **Done** footer even though "Conditions change this View right away". Playlist settings and Subscription settings apply just as live but have no commit, only Back. These are screens of the same kind with different exits. Affected: View editor, Playlist settings, Subscription settings.
2. **Snackbar placement.**
   - On screens the snackbar overlays content above the player.
   - Inside a sheet it is part of the sheet's layout (`SheetFeedback.kt` `FeedbackSheet`), so the sheet grows and shrinks by about 48 dp as messages come and go: `appearance-0186` → `0187`.
   - Affected: Settings › Speed and Appearance sheets, the Add to a Playlist sheet, and every other `FeedbackSheet` against all full screens.
3. **Two Undo surfaces that trade places.** The app-bar Undo icon hides whenever the snackbar shows Undo, and comes back when it leaves. The same command keeps changing place, and the app-bar actions beside it shift. Affected: every screen with a top app bar (flow rows 91 → 92 and 99 → 100).
4. **Empty-state next step.** Trash offers "Back to Playlists", which is an exit rather than a next step. History, Listening stats, Library and View each offer a forward action. Affected: Trash against the other empty states.

## Checklist

Coverage: **93.0%** (pass 64 · fail 2 · N/O 5 · N/A 8). That is 66 of 71 applicable items with a pass or fail verdict.

**Failures by severity**

- **[FLOW-01] major.** Core elements hold still. *Where:* the Podcast page top bar (main action) in Light and Dark.
  - *Evidence:* the Subscribe control's leading edge moves +20 dp at the unprompted subscribe completion (rows 99 → 100 and 278 → 279) and −63 dp at the unprompted Undo completion (rows 108 → 109 and 287 → 288). A newly added gear takes the space the pending control had.
  - *Cause in code* (`PodcastPageScreen.kt` ~L285–309): the `Button` shrinks to its spinner while pending (111 → 68 dp). The subscribed layout (gear, then a 48 dp check) appears only when the server answers. Undo runs through `subscriptionStep` (`HistoryActions.kt`) without setting `changingSubscription`, so the check shows no busy state.
  - *Fix:*
    - On the Subscribe tap (person-caused, under 500 ms), switch at once to the subscribed geometry: gear (disabled) at 288 dp and a 48 dp check slot at 336 dp showing the 24 dp progress ring. When the reply arrives, swap the ring for the green check in place, so nothing moves at completion.
    - Make Undo of a subscription set the same pending state immediately: the Subscribe button at its final 111 dp width with a spinner inside.
    - If the subscription fails, revert with an inline error. That revert is caused by the failure, so keep it in place too: show the error in the header and leave Subscribe where it lands.
- **[APPEAR-09] minor.** Interface symbols use familiar meanings. *Where:* the Playlist Entries tab, on every Entry (`PlaybackActions.kt:63`, `ActionIcon(R.drawable.ic_drag, entry_actions)`). Documented in `docs/design/android.md` § Playlist.
  - *Evidence:* the two-bar drag-handle glyph is both the drag source and a tap target that opens the "Entry actions" menu (Add to a Playlist, Remove from this Playlist, Move up, Move down): `light/12-entry-actions.png`. Nothing signals that a drag handle opens a menu on Android, so the only way to Remove from this Playlist is hidden behind a glyph that means "drag".
  - *Fix:* keep the handle for dragging (and its accessibility actions). Put Entry actions on a trailing ⋮ (`ic_entry_actions`, 48 dp) or on a long press of the row with `onLongClickLabel`. If width is the concern, on Entries replace the Add icon (already in the menu) with the ⋮.

**N/O:** KEY-01, KEY-07, PTR-03, RESP-01, FOOT-02.
- **KEY-01, KEY-07:** no hardware-keyboard run. Compose controls are focusable, but traps and Page Up/Down in the LazyColumns are unverified.
- **PTR-03:** no mouse run, and no `pointerHoverIcon` on the drag handle.
- **RESP-01, FOOT-02:** debug build on an emulator. 53 of 100 step groups show a first response under 200 ms by frame-interval evidence and the rest are unresolved, so the run's own verdict, which I accept, is N/O.

**N/A:**
- FLOW-05: no side-by-side panels at compact width.
- CTRL-02: no checkbox hierarchy.
- LIST-04: no multi-column rows.
- LIST-05: no outline disclosures.
- START-07: no accounts.
- EDIT-02: only native text fields.
- SIDE-03, SIDE-04: no sidebar on phone.

**Notable passes and their evidence**

- **DATA-04, DATA-05:** multi-step Undo and Redo history (`HistoryActions.kt`).
  - Each step carries a specific description ("Undo: Appearance changed"); Ctrl+Z and Ctrl+Shift+Z work (`MainActivity.onKeyDown`); fields keep their own text undo.
  - Undo reveals the restored content (`revealChanges`).
- **DLG-01:** the app's only `AlertDialog` is the notification-permission explanation.
- **START-04, START-05:** the permission is requested at the first download: "Show download progress?" / "Allow notifications to see download progress and stop a download.", with Continue and Not now.
- **DATA-01, DATA-06:** form drafts persist (`FormDraftStore`, flushed in `onStop`; `41b-connect-kept.png`). Back stacks, tab, and list scroll persist in the database (`saveBrowsingContext`), so they survive process death.
- **DRAG-01/03/05/06:**
  - Drag reorder has an insertion line, haptics, edge autoscroll (`EntryDragging.kt` L54–78), a "moved" highlight, Undo, Move up and Move down menu items, and accessibility custom actions.
- **APPEAR-03:** the theme listens to `UiModeManager` contrast and pushes `primary`, `onSurfaceVariant` and the outlines toward on-surface. Light, Dark and System default are offered (`06c-appearance.png`).
- **APPEAR-04:** every text sample passes.

  | Element | Light | Dark |
  |---|---|---|
  | Secondary text `#46464f` on `#faf8ff` | 8.86:1 | 10.89:1 |
  | Accent text and section labels `#2b50c8` | 6.46:1 | 10.93:1 |
  | Destructive `#ba1a1a` | 6.13:1 | — |
  | Snackbar action | 7.71:1 | 5.27:1 |
  | Unfocused field outline (non-text) | 4.25:1 | 5.83:1 |

  The MH artwork tile (white on `#b57919`, 3.68:1) is publisher Artwork from the fixture feed, not app text, so it is exempt. The app's own initials placeholder measures 13.24:1 (`#171b2c` on `#dfe1f9`).
- **TYPE-05, WIN-03:** at 200% font scale:
  - Episode-row actions stack below the text (`fontScale >= 1.5f`).
  - Episode actions reflow into a 2×2 grid, and tabs wrap ("Listening / Timeline").
  - Nothing essential clips (`font200/`).
- **AX-01:**
  - Rows merge into one node ("Who sets the price of rice?, Market Hours · Nov 6 · 26 min, In progress · 22:00 / 25:34, Play Now, Add to a Playlist").
  - The mini player and Now Playing announce podcast and Episode, though they are not shown visually.
  - Section headings carry `heading()`, progress bars have state descriptions, and long press has `onLongClickLabel`.
- **B1 (system Back):**
  - `enableOnBackInvokedCallback="true"` and `NavigableListDetailPaneScaffold` give predictive back.
  - `PredictiveBackHandler` handles the player sheet and nested pages, and Back clears a selection or disarms Unsubscribe.
  - Back at a non-Views root returns to Views (`PodListScreens.kt:167`).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.3** | Roboto with a tuned Material 3 scale: list titles at titleMedium 17 sp, metadata at bodyMedium 14 sp in `onSurfaceVariant`, the detail headline at 22 sp, section labels at 14 sp SemiBold. Reflows cleanly at 200%. Curly quotes, "…", and domain capitals used consistently. **Below Exemplary because:** the title is duplicated in the app bar and the headline on Episode detail and the Podcast page ("Joinery without screws" twice, `03-episode.png`; "Deep Field" twice, `23-subscription.png`). The Listening Timeline's date line drops to bodySmall 12 sp while every other row's metadata is 14 sp (`14-timeline.png`). | `hierarchy`, `craft` |
| Hierarchy | **7.6** | Lists lead and chrome is quiet. Play Now is the only filled pill on Episode detail, and Play/Pause is the largest control in Now Playing. **Held back by:** (a) Undo and Redo icons persist in every app bar after any edit, crowding titles ("Long listeni…" in flow `C-0091`) and pushing the main action left; (b) Library is grouped by Download Rule, so with three podcasts the two empty groups ("Download when added to a Playlist / No podcasts", "Download when published / No podcasts") take as much height as the Subscriptions (`20-library.png`); (c) Now Playing's secondary controls are two rows of loose text links ("1.0×  Sleep" / "Episode  Entries · 2 next") with no grouping (`08-now-playing.png`); (d) the duplicated page titles. | `content-first`, `hierarchy` |
| Spacing & density | **8.0** | One 16 dp gutter, Material list rhythm, 48 dp targets (`ActionIcon` `size(48.dp)`, mini-player controls 48 dp in `measurements.csv`), consistent dividers, an edge-to-edge frame with controls clear of the gesture bar. **Short of Exemplary because:** the View editor footer stacks "3 Episodes match" top-left and Done bottom-right on different baselines instead of one centered row (`04-view-editor.png`); Settings for Default leaves a near-empty page under one switch; the Rewind sheet ends its "Kept" paragraph flush against the Cancel/Rewind row with no divider, so at 200% the last line is cut mid-glyph by the action row (`font200/15-rewind-sheet.png`). | `craft`, `hierarchy` |
| Color & contrast | **8.0** | A restrained palette with fixed meanings: blue for interaction, red only for destructive actions (Delete View, Delete Playlist, Unsubscribe), green only for Subscribed. Both themes measured above: every text sample ≥ 5.27:1. The contrast preference is honored and dark is toned on its own. **Below Exemplary because:** the primary color carries two meanings. Section labels (`Section`: titleSmall SemiBold `primary`) and text buttons (labelLarge Medium `primary`) are both 14 sp blue, so "Playback Settings" (a label) and "Mark all Played" (an action) look the same in `24-subscription-settings.png`, as do "Show notes" and "Show podcast details". APPEAR-09's failure is minor and caps nothing. | `color-restraint`, `conventions` |
| Iconography | **7.6** | One Material symbol family at consistent weight. Every icon button has a label and a tooltip (`ActionIcon` wraps `TooltipBox`). Custom OPML tray glyphs match the set, and the bottom actions are icon plus label. **Held back by:** the drag-handle glyph doubling as the Entry menu (APPEAR-09); the Now Playing control group mixing an icon (Sleep's moon) with icon-less items (1.0×, Episode, Entries), against "every item an icon or none"; a select-all glyph for "Select Subscriptions" that reads as a checkbox grid. | `conventions`, `craft` |
| Consistency & polish | **6.9** (stability **6.5**, Light and Dark) | Visual consistency is high: one row component, one sheet component, the "<Object> <past verb>" wording everywhere, designed empty, loading, error and offline states, and a polished drag. **Capped:** FLOW-01 (major) caps the stability sub-score at 6.9, and the category can't exceed the top of the sub-score's band. The sub-score sits at 6.5 because, besides FLOW-01, three inventory mismatches remain: the Done-versus-live commit model, the snackbar resizing sheets, and the app-bar Undo trading places with the snackbar Undo. Without the cap this category would score about 8.2. | `stability`, `craft` |
| Clarity | **8.2** | Domain words are exact and explained where they act ("Entries leave when their Episodes become Played. Entries already Played stay when you turn this on."). Values name what they inherit ("Default (1.0×)"), errors give a recovery, search states its scope ("Episode titles, podcast names and show notes"), and the Rewind sheet itemises its effect. **Below Exemplary because:** labels and actions share one style (see Color); Entry actions sit behind a drag glyph; the Getting started card on a Standalone Device with no podcasts ticks step 2, "Views find Episodes for you", before step 1 (`42-standalone-home.png`); and "Podcast Long listening subscribed" is stilted beside the plainer "Subscribed to Long listening" the check announces. | `plain-language`, `discoverable-commands` |
| Platform fit | **8.7** | **Looks 8.4.** L1 Adapted: a bottom bar with three equal destinations, top app bars, Up only on inner screens, but the persistent app-wide Undo and Redo icons are a desktop idiom that Google's apps don't put in every app bar. L2 Native: consistent Material 3. L3 Native: 48 dp targets, sp text, edge to edge, 200% reflow, `adjustResize`. **Behaves 8.8.** B1 Native (predictive back, list-detail scaffold, root Back to Views). B2 Native (TalkBack names, roles and custom actions; font scale; Light, Dark and System; contrast). B3 Native (Sharesheet via `createChooser`, a `downloads` notification channel, permission in context with a rationale, process-death restoration from the database, launcher shortcuts, media session, Android Auto). Unverified: rotation and the predictive-back animation. (8.4 + 2 × 8.8) ÷ 3 = 8.67. No cap applies. | `conventions`, `stability` |
| Interaction & feedback | **8.4** | Forgiving throughout: multi-step labeled Undo and Redo with Ctrl+Z, no confirmation dialogs, drafts that survive, drag with menu and accessibility alternatives, and a busy pill on Subscribe (busy p75 193 ms Light, 93 ms Dark, `timings.csv`). **Held back by:** Undo of a subscription shows no busy state for about 2 s (rows 107–108); the RESP and keyboard items are N/O; snackbars in sheets resize the sheet. No cap applies. | `forgiveness`, `feedback` |
| **Overall** | **7.9** | A well-made Material 3 podcast client that serves the task and behaves like an Android app. The FLOW-01 failure on the Podcast page's main action holds it down most, through the Consistency & polish cap (6.9). The ceiling is 6.9 + 2.0 = 8.9. Behind that sit the craft gaps in hierarchy and color meaning (app-bar Undo and Redo, duplicated titles, labels that look like buttons). | — |

## Next step

- **Target:** FLOW-01 (major) on the Podcast page, in Consistency & polish, the lowest-scoring category.
- **Anti-pattern:** a control that morphs in width as asynchronous results arrive, the same mechanism as "late confirmation shifts the layout".
- **Root cause:** the trailing top-bar slot has a different width in each state (Subscribe 111 dp → pending 68 dp → gear and check 96 dp → Subscribe 111 dp), and two of those changes wait for the server.
- **Change:** on the Subscribe tap, switch straight to the subscribed geometry (gear disabled, check slot showing a 24 dp ring). On completion, only the ring becomes the check. Route Undo through the same pending state so the change happens at the tap. This keeps the owner's Subscribe-then-check design.
- **Principle:** `stability`.
- **Expected effect:** FLOW-01 passes and the stability cap lifts. Consistency & polish could reach about 8.2 and Overall about 8.4. Nothing should regress.

**What else stands between this build and 9.0 overall** (craft gaps keeping categories below Exemplary, largest first):

1. **App-bar Undo and Redo.** Show them only in the snackbar, plus Ctrl+Z, and in an overflow item "Undo <description>", or show them only on the screen where the edit happened. This frees title space, stops actions shifting when a snackbar appears, and removes mismatch 3. Affects Hierarchy, Platform fit L1, and stability.
2. **Labels distinct from actions.** Draw section labels in `onSurfaceVariant` or as labelLarge `primary` with no other primary-colored text nearby. Alternatively, give inline actions (Rename, Show table, Mark all Played, Show podcast details) a tonal or outlined button or a leading icon, so blue text always means an action. Affects Color and Clarity.
3. **One title per page.** On Episode detail and the Podcast page, use a `MediumTopAppBar` that collapses on scroll, or show the app-bar title only after the headline scrolls away. Affects Typography and Hierarchy.
4. **Entry actions behind a ⋮,** with the handle kept for drag only (APPEAR-09). Affects Iconography and Clarity.
5. **Snackbar overlays the sheet** instead of joining its layout, or the sheet reserves its height (mismatch 2). One commit model for live editors: either drop Done from the View editor and keep only the count, or give Playlist and Subscription settings the same footer (mismatch 1).
6. **Library empty groups.** Show empty Download Rule groups as one quiet line under the populated group ("Nothing downloads automatically"), not a heading and a "No podcasts" line each.
7. **Now Playing secondary controls.** Group them in one row of tonal buttons or chips, all with icons or all without.
8. **Small fixes.**
   - Timeline metadata to bodyMedium 14 sp.
   - The View editor footer as one vertically centered row.
   - Getting started ticks steps only in order.
   - Trash's empty state offers New Playlist, or no button, instead of an exit.
