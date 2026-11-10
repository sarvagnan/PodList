# PodList Android phone, round 12

Graded 2026-11-10 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android › Phone, rubric.md). Build: `main` at 7481dda. Evidence: the capture in `android-grade-12/` (Pixel 10 Pro XL emulator, Android 16, 448 dp compact window, density 480; every screen in light, dark and 200% font scale, each with an accessibility snapshot) plus the source under `apps/android/app/src/main`. No device was driven. Earlier reports and work lists were not read.

Measurements: the captures are 3 px per dp. Contrast was sampled from the PNGs with ImageMagick (script in the grader's scratch folder); ratios are WCAG relative luminance.

## Frame

- **Task:** find Episodes through Views and Search, then listen through Playlists, with the player always reachable.
- **Target:** Android phone (compact window). Tablet and foldable not graded.
- **Posture:** sovereign personal media app, used in short, frequent visits and while listening.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, for its calm, forgiving, undo-first personal-tool craft. It's a reference for decisions, not a look.
- **Character:** (1) PodList blue `#2b50c8` on native Material 3, with independently toned dark roles *(owner)*; (2) a player built around its controls, with no podcast or Episode names on screen *(owner)*; (3) initials artwork tiles in saturated podcast colours; (4) plain-spoken copy that capitalises the domain's nouns (Episode, Entry, Playlist, Played); (5) undo instead of confirmation, everywhere *(owner, for Delete Playlist and Unsubscribe)*.
- **Owner decisions** (graded but not proposed for change): the M3 look, accent and dark theme; bottom navigation with Views · Playlists · Library; Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; the mini player restored paused; no names in the player; Delete Playlist without a question and with Undo; the compact Podcast page with a pull-down description, Subscribe in the top bar, a green check, two-tap Unsubscribe and a gear for Subscription settings; explicit Rename with Cancel and Save; names unique ignoring case; no in-app shortcut list, with Undo and Redo registered with Android's Keyboard Shortcuts panel.

## Flows

No flow run. The capture is a set of still states and the brief rules out driving a device, so FLOW-01 and FLOW-02 (F only), RESP-01 (timed runs) and the **stability sub-score are N/O**. Consistency & polish is marked "(partial: no flow run)". FLOW-03, -04, -06 and -07 are judged from code and screenshots.

Failures: none measured (none could be).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views (01, 42) | Snackbar above the mini player, "View X created" | Sync strip under the top bar: "Offline · Showing local data." + Try again | none | Snackbar Undo; afterwards an Undo icon in the top bar (`EditHistoryMenu`) | "No Views yet" + tonal New View | Spinner + "Loading local Library…" | + in the top bar | Getting started card (42) |
| A View (02) | Snackbar | Sync strip | none | as above | "No Episodes match this View" + tonal "Edit this View" | as above | Row Play / Add; pencil edits | none |
| View editor (04, 04c) | Snackbar "View X changed" | Inline red text under the field or the conditions | none | Snackbar + top-bar Undo | n/a | none | **Done, pinned footer, trailing** | Hint at the end of the list |
| New View (05) | "View X created" | Inline under the field | none | as above | n/a | none | **Create View, inline at the end of the list, trailing** | Hint at the end of the list |
| Episode detail (03) | "Episode X marked Played" | Inline under the action grid (downloads) | none | Snackbar + top-bar Undo | "Episode details are still syncing" | none | Play Now, full-width filled | none |
| Playlist (11–14) | "Entry moved" | Sync strip | none | Snackbar + top-bar Undo | Tonal "Find Episodes" / "Show Entries" | none | Row Play from here | Timeline hint at the top (14) |
| Rewind sheet (15) | "Playlist X rewound" | n/a | Sheet "Rewind Default to …?" with Cancel + Rewind, trailing | Snackbar Undo | "None" under each heading | none | Rewind, trailing in the sheet | "Kept" paragraph |
| Playlist settings (16, 16b) | "Playlist X renamed", "Playlist X moved to Trash" | Inline under the Name field | none | Snackbar Undo | n/a | none | Save, trailing under the field | Help under Clear on Played and Delete |
| Trash (18) | "Playlist X restored" | n/a | none | Snackbar Undo | "No deleted Playlists" + help + tonal "Back to Playlists" | none | Restore | Retention help |
| Library (20, 43) | "Download Rule changed" | Per-Subscription refresh status | none | Snackbar Undo | "No Subscriptions yet" + tonal Add podcasts | Spinner | + in the top bar | none |
| Search (21–22) | "View X created" (Save as a View) | n/a | none | n/a | "No Episodes match this Search. Try another word or clear Search." | none | Row Play / Add | none |
| Add podcasts (26, 59) | Snackbar "X subscribed" | Inline under the field + Try again | none | Snackbar Undo | "No podcasts found. Try another name." | none | Find podcasts, filled, trailing under the field; **Subscribe as a text button** in each result | Field label |
| Podcast page (23, 28, 60–63) | Snackbar **"Long listening subscribed"** | Inline in the header + Try again | Armed **Unsubscribe** text in the top bar (28) | Snackbar Undo | "No Episodes yet…" + Refresh podcast | Linear progress + "Subscribing…" | **Subscribe, filled, in the top bar** | none |
| Subscription settings (24) | "Subscription settings changed" | n/a | none | Snackbar Undo | n/a | none | Value rows | Help under each row |
| Settings (06–07, 32) | "Playback Settings changed", "OPML exported" | Inline OPML error + Try again | none | Snackbar Undo | n/a | Determinate OPML progress + Stop | Rows; values **trailing** (Speed, Keep deleted Playlists) or **as a subtitle** (Appearance, Server) | Section hints |
| Connect (41, 41b) | n/a | Inline under the field | none | n/a | n/a | "Checking server…" | Check and connect, filled, trailing under the field; Discard draft | Two help paragraphs |
| Now Playing (08) | n/a | **Inline error + Try again, and the same error as a snackbar with Try again** | none | n/a | "No Chapters available" | "Loading audio…" | Play/Pause, 112 × 88 dp | none |
| Listening stats (30, 33) | n/a | n/a | none | n/a | "No listening yet…" + tonal "Find something to play" | none | none | "About your stats" |
| Download permission (code) | n/a | n/a | AlertDialog "Show download progress?" Continue / Not now | n/a | n/a | n/a | Continue | Reason sentence |

**Mismatches**

1. **Main action of the View editor moves** between Edit View (pinned footer, trailing, beside the count) and New View (end of the scrolling list, above the pinned count, which has room for it). At 200% Create View is entirely below the fold (05 font200). This is FLOW-07.
2. **Subscribe has two emphases for one action:** a filled button on the Podcast page top bar (60) and a text button in Add podcasts results (59).
3. **Success wording has three patterns:** "Playlist Commute moved to Trash" / "View X deleted" / "Episode X marked Played" (type, name, past participle); "Long listening subscribed" (name with no type, which reads as if the podcast did the subscribing); "Setting changed", "Entry moved" and "Download Rule changed" (no object named).
4. **Setting values sit in two places in one Settings list:** trailing for Speed, Skip intro and Keep deleted Playlists (`ValueRow`); as a subtitle for Appearance and Server (`SettingsRow`). Both open the same kind of choice sheet (07).
5. **Overflow position:** trailing on Episode detail (03); before the gear and check on the Podcast page (23).
6. **Playback error shown twice at once:** inline in Now Playing and as a snackbar with the same Try again (`PlayerPresentation.kt` lines 84–86 and 198).
7. **Placeholder artwork:** initials tiles everywhere except Add podcasts and the Podcast page, which use a generic podcast glyph on lavender (59, 62).

## Checklist

**Coverage: 88.9%** (pass 62 · fail 2 · N/O 8 · N/A 7). 64 of 72 applicable items have a verdict.

**Failures by severity**

*Minor*

- **[FLOW-07] The main action has one place.** *Where:* View editor, New View (05) vs Edit View (04). *Evidence:* Edit View pins Done trailing in the tonal footer beside "3 Episodes match". New View puts Create View in the scrolling list after the hint (`ViewEditor.kt`, the `if (creating) item { CommitActions … }` block), while the same footer shows only "15 Episodes match". At 200% the button is out of view (05 font200). The code's own rule ("multi-field forms may pin this region", `EditorComponents.kt`) is applied to one mode and not the other. *Fix:* render the commit in the footer for both modes. Use `CommitButton(Create View)` when `creating` and Done otherwise, keep "Discard" as a text button beside it, and delete the in-list `CommitActions` item.
- **[APPEAR-09] Familiar meanings, consistent symbols.** *Where:* Episode detail action grid (03) and the selection bar (50); top-bar object settings; Podcast page top bar (23). *Evidence:* (a) The toggles in one row follow opposite rules. Star shows the current state (outline star = not Starred; `ic_star_outline` with the label Star). Played shows the result (`ic_played`, a filled accent check-circle, on an Unplayed Episode with the label Mark Played), so the filled check reads as "already played" beside the outline star. (b) "Settings for this object" uses three glyphs: pencil for a View (02), tune/sliders for a Playlist (11), gear for a Subscription (23). The gear also means app Settings on the three roots, and docs/design/android.md says "The gear means app Settings and nothing else" and gives the Playlist a pencil. (c) The ⋮ overflow sits before the gear and check on the Podcast page; Android puts it last. *Fix:* (a) make Played follow Star: an outline check-circle (`ic_unplayed` ring with a check) while Unplayed and the filled `ic_played` once Played, labels unchanged. (b) Use the pencil for Playlist settings (`ScreenFrame` `edit` icon) as the design doc specifies, and leave the gear to app Settings and the owner-decided Subscription gear. (c) Order the Podcast page actions gear · check · ⋮. Keep the ⋮ rendered (disabled) while Unsubscribe is armed, so the two-tap control's trailing edge still doesn't move.

*Blocker, major:* none.

**N/O:** FLOW-01, FLOW-02, KEY-07, PTR-03, APPEAR-05, APPEAR-11, RESP-01, FOOT-02

**N/A:** FLOW-05 (no side-by-side panels on a phone), CTRL-02 (no checkbox hierarchy), LIST-01 and LIST-04 (no data arranged in columns; Android clause), START-07 (no account creation), SIDE-03 and SIDE-04 (no sidebar on a phone)

**Passes worth recording** (evidence a later round should keep):

- **FLOW-03:** drafts own their fields ("Raw drafts own the field until finish/discard/Undo", `EditorComponents.kt`), and `clearIfUnchanged` keeps text typed during a late Add.
- **FLOW-04:** snackbars stay above the mini player (63) and render inside open sheets (`FeedbackSheet`).
- **DATA-01, DATA-06:** form drafts flush on `onStop`; tab, stack, scroll, podcast query and stats view persist in the DB (`saveBrowsingContext`).
- **DATA-04, DATA-05:** a multi-step `EditHistory`, Ctrl+Z / Ctrl+Shift+Z in `onKeyDown` and in sheets, a persistent top-bar Undo after the snackbar, and reveal on undo.
- **DLG-01:** the only alert is the notification rationale.
- **START-04, START-05:** POST_NOTIFICATIONS is asked at first download, after "Allow notifications to see download progress and stop a download."
- **APPEAR-03:** `UiModeManager` contrast listener lerps primary, onSurfaceVariant and outline.
- **APPEAR-04:** onSurfaceVariant 8.9:1 light, 10.9:1 dark; the field outline `#777680` is 4.4:1.
- **TYPE-08:** curly quotes, …, an en dash and a true minus "−16:34".
- **AX-04:** drag has Move up/down in the Entry menu and as TalkBack actions; pull-down has Show podcast details; the chart has day buttons; the sheet has Collapse.
- **KEY-08:** the system Keyboard Shortcuts panel via `onProvideKeyboardShortcuts`.

## Platform fit (Android › Phone)

Side-by-side with Gmail and YouTube Music: a three-item bottom bar, small top app bars with Up only on inner screens, M3 sheets, snackbars and tonal buttons. Foreign or off-grammar list: the ⋮ overflow before other actions on the Podcast page; generic top-bar titles ("Podcast", "Episode") where Google apps show the object.

| # | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Native** | Three equal destinations (01). Actions (+, gear) live in the top bar, not the bar. No Up at the roots (01, 10, 20); Up on every inner screen. |
| L2 Visual language | **Native** | Consistent M3 roles from the `#2b50c8` seed and Material symbol vectors. Small off-grammar tell: overflow order on the Podcast page (23). |
| L3 Density, text, frame | **Native** | `ActionIcon` 48 dp; `LabelledAction`, `ChoiceRows`, `CheckRow` ≥ 48 dp; text in sp with a 12 sp floor. At 200%, rows stack their actions (`fontScale >= 1.5f`), tiles stack, and value rows move their values under the labels. Edge to edge (`enableEdgeToEdge`); footers clear the gesture inset (04, 50). |
| B1 System navigation | **Native** | `enableOnBackInvokedCallback`; `NavigableListDetailPaneScaffold` with predictive back. Back order: add sheet → player pages → collapse player (`PredictiveBackHandler`) → selection → armed Unsubscribe → stack. Back from the Playlists or Library root goes to Views. Back never pauses. |
| B2 Preferences, access | **Native** | TalkBack names on every icon control; seek has `stateDescription` "12:34 of 29:08"; headings marked; the armed Unsubscribe is a polite live region with a recommended timeout. System default / Light / Dark (06c); contrast preference; text scales. No in-app language. |
| B3 System surfaces, lifecycle | **Native** | `Intent.createChooser` Sharesheet; a "downloads" notification channel; the permission in context; MediaLibraryService with Auto metadata; launcher shortcuts; state restored from the DB and `rememberSaveable` after process death. |

Looks **8.7** · Behaves **9.0** (from code and capture; no device run) · Platform fit = (8.7 + 2 × 9.0) ÷ 3 = **8.9**.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.3** | Strong. Roboto with a small scale mapped to roles: row title 17 sp `titleMedium`, metadata 12 sp in onSurfaceVariant, section labels 14 sp semibold primary, the Episode detail title 22 sp. Real punctuation (TYPE-08) and graceful 200% reflow (02, 03, 24 font200). Below Exemplary: every row carries two stacked 12 sp metadata lines, so the smallest size does a lot of work. The View's "3 Episodes" count and the section labels share one style that differs only in colour. Subscription settings rows hold three text levels in competing columns at 1× (24: label, 3-line help, trailing "Default (30 seconds)"). Top-bar titles truncate at 200% ("Select Subscri…", 27). | `hierarchy`, `craft` |
| Hierarchy | **8.2** | Strong. One filled Play Now on Episode detail (03); Now Playing led by artwork and a 112 × 88 dp Play (08) with secondary controls as quiet text buttons; chrome recedes everywhere. Below Exemplary: Search, half of "finding", is only a row inside Library (20); Views has no route to it. The Podcast page header (title, author, details link, search field, count) pushes the first Episode to ~366 dp of a ~996 dp screen (23). Top bars say "Podcast" and "Episode" while the object's name sits lower in the content. | `content-first`, `hierarchy` |
| Spacing & density | **7.9** | Strong. A steady 16 dp gutter, 56–72 dp rows, 20/8 dp section rhythm, 48 dp targets. Below 8: the Library list breaks its own text line, with icon rows (48 dp box) starting 7–8 dp right of artwork rows (40 dp tile) and icon centres 4 dp off the tile centres (20). Settings values alternate between a trailing column and a subtitle (07). Now Playing's two centred control rows use 24 dp and 8 dp gaps (08). The Download Rule value floats mid-row beside a two-line description (24). | `craft`, `hierarchy` |
| Color & contrast | **8.6** | Strong. Restrained M3 tonal roles; red only for destructive (Delete View, Delete Playlist, armed Unsubscribe); green only for Subscribed and finished steps. Measured text 8.9:1 light / 10.9:1 dark; the outline is 4.4:1. Contrast preference honoured; dark roles toned on their own. Below Exemplary: the cursor row (`secondaryContainer #DFE1F9`, 11) and a just-moved row (`primaryContainer #DDE1FF`) are indistinguishable tints with different meanings, while selected rows in multi-select get no tint at all (50). Inactive seek and progress tracks are ~1.2:1 on their surfaces (08), so the time remaining barely reads as a track in light. | `color-restraint`, `accessibility` |
| Iconography | **7.4** | Strong but lowest. One Material-derived set at 24 dp with tooltips and labels on every icon button. Below 8: APPEAR-09 (Played vs Star state rule, three settings glyphs, overflow order); Now Playing gives Sleep an icon and Speed none in the same row (08); two placeholder-artwork styles (59 vs 02); the ⏪ glyph repeats on every Listening Timeline row as the only cue that rows are tappable (14). | `conventions`, `craft` |
| Consistency & polish | **7.5** (stability N/O; partial: no flow run) | Strong. Empty, loading, error, 200% and dark states are all designed; snackbars render inside sheets; Undo persists in the top bar. Below 8: FLOW-07 and the inventory mismatches (Subscribe emphasis, three success-message patterns, two Settings value placements, overflow position, a duplicated playback error, two placeholder styles). | `craft`, `conventions`, `stability` |
| Clarity | **8.1** | Strong. Plain, specific verbs ("Check and connect", "Bring it over", "Discard draft"); domain terms used exactly; state always shown ("In progress · 22:00 / 25:34", "Active Playlist · 4 Entries · Clear on Played"). Below Exemplary: "Show completed steps" shows a completed step's help text, not the step, which is already listed with a check (42; `GettingStarted.kt`). The cursor is labelled "Now playing" while playback is paused (11 vs the mini player's Play). Library hides Download Rule groups that are empty, so the other two rules are invisible until used (20). The filled check reads as Played on an Unplayed Episode (03). "Long listening subscribed" is ambiguous. | `plain-language`, `feedback` |
| Platform fit | **8.9** | See the table: Looks 8.7, Behaves 9.0. Kept below 9 by the overflow order and generic titles. | `conventions` |
| Interaction & feedback | **8.6** (partial: no flow or timed runs) | Strong. Undo instead of confirmation throughout (Delete, Rewind, Unsubscribe, moves), multi-step Ctrl+Z / Ctrl+Shift+Z registered with the system panel, drafts that survive the app closing, two-tap Unsubscribe whose timeout follows the accessibility "time to act" setting, determinate OPML progress with Stop, and drag with autoscroll, an insertion line and a retained highlight. Below Exemplary: multi-select starts only by long press, with no visible way in for touch users (TalkBack gets "Select Episode" as an action); RESP-01, FOOT-02 and Page Up/Down are unverified. | `forgiveness`, `feedback`, `user-control` |
| **Overall** | **8.2** | A well-made native podcast client: forgiving, accessible and at home on Android, with strong data safety. What stands between it and 9.0 is finish, not function. Icon semantics and message patterns were decided screen by screen rather than from shared rules, and several small alignment and placement differences keep three categories (Iconography, Consistency, Spacing) below 8. No cap applies (lowest 7.4 + 2.0 = 9.4). | |

## What stands between this build and 9.0

To lift Overall to 9.0, Iconography, Consistency & polish and Spacing each need to reach the high 8s, and the rest need to cross 9. In order of payoff:

1. **One icon rule** (APPEAR-09). The glyph shows the current state and the label names the action; the pencil edits a View or Playlist; the gear means Settings; ⋮ goes last. → Iconography +1.0, Clarity +0.2.
2. **One place per message kind** (inventory 1–6). Pin Create View in the footer. Make Subscribe filled everywhere or tonal everywhere. Write every confirmation as type + name + verb ("Subscribed to Long listening", "Entry moved in Commute", "Speed set to 1.2×"). Use one Settings value layout (trailing value; subtitle only for long values like the server URL). Show a playback error inline only while Now Playing is expanded. → Consistency +0.8.
3. **Shared alignment lines.** Give Library's search and select rows the same 40 dp leading slot as artwork rows. Equalise Now Playing's control-row spacing. → Spacing +0.5.
4. **Clarity details.** Rename "Show completed steps" to "Show step details" (or collapse completed steps to a single line and keep the label). Label the paused cursor "Current Entry" (the string already exists) and "Now playing" only while playing. List all three Download Rule groups with "None yet" under empty ones, as android.md specifies. Name the object in top-bar titles once the header scrolls away, and ideally from the start.
5. **Distinct state tints.** Keep `secondaryContainer` for the cursor. Give a moved row a transient outline or `tertiaryContainer` instead of `primaryContainer`. Tint selected rows in multi-select.
6. **Run the flows.** A scripted flow run (Add podcast → Subscribe → Undo; edit View → rename → Done; Rewind → Undo) would make the stability sub-score and RESP-01 observable. Until then Consistency & polish and Interaction & feedback stay partial.

## Next step

- **Target:** the lowest-scoring category, Iconography (7.4). There are no blocker or major failures.
- **Anti-pattern:** *Icon confetti*, in its (R) form (anti-patterns.md § 6): one meaning drawn with different glyphs in different places (settings: pencil, tune, gear), and one glyph naming two things (the gear for app Settings and Subscription settings).
- **Root cause:** icons are chosen per screen, with no shared rule for state toggles, object settings or overflow order.
- **Change:** in the Episode detail action grid and the selection bar, show `ic_unplayed` (ring) plus a check stroke for Mark Played while Unplayed, and the filled `ic_played` for Mark Unplayed. Switch Playlist settings to `ic_edit`. Order the Podcast page actions gear · check · ⋮.
- **Principle:** `conventions`, `craft`.
- **Expected effect:** Iconography 7.4 → ~8.4, Clarity +0.2, Platform fit Looks +0.2. No signature element is touched: the owner's gear and green check stay.
