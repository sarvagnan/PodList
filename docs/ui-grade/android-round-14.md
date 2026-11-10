# PodList Android phone: UI grade, round 14

Graded build: `main` at 23af8c2 (debug build). Target: **Android phone**, compact window. The grade follows `~/Documents/UI_Guidelines/CRITIQUE.md` § Full audit, with `guidelines/core-checklist.md`, `guidelines/rubric.md` and `guidelines/platform-fit.md` § Android › Phone. Tablet and foldable are out of scope.

Evidence:
- **Capture** `scratchpad/android-grade-14/`: 54 screens, each in light, dark and 200% font scale, with a screenshot (1344 × 2992 px, density 3.0, so dp = px ÷ 3) and an accessibility snapshot.
- **Flow run** `scratchpad/flow-run/20261110-220118-056/`: `summary.md`, `measurements.csv`, `timings.csv`, `frames.csv`, and a 336-frame strip.
- **Code** under `apps/android/app/src/main`, including the manifest, `MainActivity.kt`, `PodListScreens.kt`, `PlayerPresentation.kt`, `PodcastPageScreen.kt`, `SubscriptionRefreshStatus.kt`, `SheetFeedback.kt`, `EditorComponents.kt`, `EntryDragging.kt`, `BrowsingState.kt`, `FormDraftState.kt`, `HistoryActions.kt`, `IncomingContent.kt` and `res/values/strings.xml`.
- No device or emulator was driven for this grade.

## Frame

- **Task:** find Episodes through Views, then listen through Playlists. Add podcasts and manage Playlists along the way.
- **Target:** Android phone, compact width (448 dp on the capture device).
- **Posture:** a sovereign personal media app used in many short sessions a day. The player stays present across tabs.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, as a calm personal list tool, for the craft bar. Google's own Material 3 apps (Gmail, Keep, Settings) are the platform side-by-side. In the gallery, the Android phone reference is Niagara (8.2).
- **Character:**
  1. Material 3 with the #2b50c8 blue accent, and an independently toned dark theme (owner).
  2. Glossary vocabulary capitalised in the UI: Episode, Playlist, Entry, Played, Device.
  3. Initials tiles in place of missing Artwork.
  4. A persistent mini player with 15 s back and 30 s forward, over bottom navigation (owner).
  5. A green check for subscribed (owner).
  6. Plain-spoken supporting text that explains each setting's consequence.
- **Owner decisions** (graded, but not targeted):
  - Navigation and structure: bottom navigation with Views, Playlists and Library; Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings.
  - Player: the mini player shows the paused Entry after relaunch; Now Playing and the mini player show no podcast or Episode names.
  - Deleting and renaming: Delete Playlist asks nothing first and offers Undo with "Playlist <name> moved to Trash"; renaming is an explicit Rename step; names are unique, ignoring case.
  - Podcast page: compact header with a pull-down description; Subscribe in the top bar; two-tap Unsubscribe.
  - Keyboard: no shortcut list in the app; Ctrl+Z and Ctrl+Shift+Z are registered with Android's Keyboard Shortcuts panel.
  - Confirmations use the pattern "<Object> <name> <past-tense verb>" (docs/design/android.md).

## Flows

**Tasks run.** Five tasks were run by the app's instrumented harness (`apps/android/app/src/androidTest/.../FlowRunSmokeTest.kt`):
- A: Views → Episode → Add to a Playlist → Undo
- B: Playlist play → Now Playing → reorder → Undo
- C: Add podcasts → Podcast page → Subscribe while typing → Undo
- D: New Playlist → Rename → Undo
- E: Search → Save as a View

**Conditions.** Every task ran in light and dark at the phone's compact width. There was one delayed pass, with 2,000 ms added per HTTP completion, and five undelayed timed passes per appearance. The device was an Android 16 emulator on a Mac running a debug build, with no throttling. Medium and expanded widths belong to the tablet and foldable targets, so they are out of scope.

**My reading of the method.** The harness compares settled captures, and it lists every excluded candidate with its reason, which makes it auditable. It marks a change "unresolved" whenever the snapshot's input age can't prove when the change began. I resolved its six FLOW-01 candidates from `measurements.csv`:
- The `slot:podcast-subscription` change (Δx +63 dp, width 111 → 48 dp) is already present in the input capture taken 92 ms after the tap (Light row 92) and 99 ms after it (Dark row 266).
- The reverse change is present 159 ms after the Undo tap (row 107) and 133 ms after it (row 281).
- All four are within 500 ms, so the person caused them: **pass**.
- In the delayed pass the slot then holds at x 336 dp, width 48 dp, through the 2 s completion (rows 92 → 100 and 266 → 274).

The single FLOW-02 candidate is on the Appearance path, which isn't a main task; I record it under APPEAR-11 below.

Timing comes from a debug build on an emulator, so RESP-01 and FOOT-02 are N/O, as the summary says too. One risk stands out: for Light B/play-entry, the lower bound of the first visible response is 439 ms and 561 ms in two of five runs (`timings.csv`, B play-entry Light runs 2 and 4), so the 75th percentile of the lower bound exceeds 200 ms. This needs re-timing on a release build on a physical phone.

**Failures:** none among the FLOW checks.

**Secondary-flow findings that count against the stability sub-score** (each has a strip pair):
1. **A snackbar inside a sheet lands on the sheet's commit row.** Strip `appearance-0186` → `appearance-0188`: "View … created · Undo" overlays the Appearance sheet's Done button. The cause is `FeedbackSheet` in `SheetFeedback.kt`, which aligns the host to `BottomCenter` over the `CommitActions` row. The same happens in every `EditorSheet` and in the Add to a Playlist sheet.
2. **Choosing Dark scrolls Settings under the sheet.** In rows 188 → 189 (Light), the first visible item changes from "Listening stats" to "Volume boost", and the heading "Your podcasts" moves from y 198.7 to 275.7 dp. This is also APPEAR-11.
3. **Not scored, because there's no flow row.** Code (`PodcastPageScreen.kt` 296–330) and capture pair 23/28: when the armed Unsubscribe times out after 5 s, the button shrinks back without any input. The gear then moves about 55 dp right, and at 200% the title changes from "Podc…" back to "Podcast". The flow should time this revert.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views list / View | Snackbar above the player: "View <name> created" | Sync row under the top bar: "Sync error · Showing local data." + Retry | none | Snackbar Undo; top-bar Undo slot; Ctrl+Z | View: "No matches" + Edit conditions | none | Rows; + in the top bar | Getting started card, dismissible, findable again in Settings › Help |
| Episode detail | Snackbar | Inline under the actions (DownloadStatus) | none | Snackbar; top-bar Undo | "metadata pending" | none | Full-width filled Play Now | none |
| View editor / New View | Snackbar after Create | Inline field error ("A View needs a name.") | none | Snackbar; top-bar Undo | n/a | none | Pinned footer: count + Done or Create View | Footnote: "Conditions change this View right away…" |
| Playlists / Playlist | "Entry <title> moved in Default" | Inline | none | Snackbar; top-bar Undo | Tonal button: "No Entries in this Playlist" + Find Episodes; History: one sentence + Show Entries | none | Row ▶; pencil → settings | Timeline hint line |
| Playlist settings / Rename | "Playlist <name> renamed"; "…moved to Trash" | Inline under the field | none | Snackbar; top-bar Undo | n/a | none | Save trailing under the field | Explanations under each switch |
| Trash | none seen | none seen | none | n/a | Title + paragraph + "Back to Playlists" | none | none | Paragraph |
| Library | "Podcast <name> subscribed" | Inline per podcast (refresh status) | none | Snackbar | "No Subscriptions yet" + Add podcasts, **plus a "No podcasts use: …" line** | none | + in the top bar | Search row with hint |
| Add podcasts | Snackbar | Inline under the field | none | Snackbar | n/a | none | **Inline**, trailing under the field (Find podcasts) | none |
| Podcast page | Snackbar | Inline in the header + Try again | none | Snackbar; top-bar Undo | "No Episodes" + Refresh | none | Subscribe / check in the top bar | Pull-down details |
| Settings | "Appearance changed" | Inline (OPML) | none | Snackbar; top-bar Undo | n/a | none | Rows → sheets with Done | Supporting text per row |
| Sheets (Speed, Appearance, Add to a Playlist) | — | Inline in the sheet | Rewind sheet: Cancel / Rewind | **Snackbar overlays the commit row** | n/a | none | Bottom trailing Done or Play Next / Play Last | none |
| Listening stats | — | — | none | — | One sentence + "Find something to play" | none | none | "About your stats" |
| First run / Connect | — | Inline under the field | none | — | n/a | none | Full-width filled (Welcome); inline trailing (Connect) | Explanatory lines |

**Mismatches:**
1. **Overflow position.** "More actions" (⋮) is the trailing item on the Podcast page and on Episode detail. On the three roots it comes first, before Search, + and the gear. On a View and a Playlist it comes before the pencil. On the roots it also sits after an invisible 48 dp Undo slot. This affects Views, Playlists, Library, View and Playlist against Podcast page and Episode, and it breaks Material's overflow-last rule.
2. **Undo in a sheet.** Undo covers the commit row in sheets, but sits above the player everywhere else. This affects every `FeedbackSheet` against the main screens.
3. **Empty states.** Library's empty state adds a rule residue, "No podcasts use: Play without downloading, Download when added to a Playlist, Download when published" (43). Every other empty state is a message plus one tonal action.
4. **Feedback colour.** The moved-Entry flash uses `tertiaryContainer` pink (strip `B-0067`). That hue appears nowhere else.

## Checklist

**Coverage: 90.3%.** Of 79 items: pass 61, fail 4, N/O 7, N/A 7. Coverage counts the 65 pass and fail verdicts against the 72 applicable items.

**Failures by severity.** No blockers and no majors.

1. **[APPEAR-04] minor.** Text contrast on the placeholder Artwork.
   - **Where:** the initials tile for Market Hours, in lists, the mini player and the Rewind sheet (01, 02, 08, 15).
   - **Evidence:** white "MH" on #B57919 measures 3.67:1. Its tiles are 40–48 dp with about 12–13 sp bold text, below 4.5:1. The other tiles pass: #1C6B45 and #2B50C8.
   - **Why minor:** it's isolated and non-essential, and the podcast name is always adjacent.
   - **Fix:** derive each tile's text colour from its background, choosing between onSurface and white, or darken the ochre to about #8A5A10 (≥ 4.5:1 with white).
2. **[APPEAR-10] minor.** Controls that read as content.
   - **Where:** "Delete Playlist" (16c, 16b), "Delete View" (04b), "Rename" (04, 16c), "Mark all Played" (25) and "Show table" (33).
   - **Evidence:** these are text buttons with zero horizontal padding (`ContentTextButton`), set flush on the 16 dp content edge. "Delete Playlist" is followed by a paragraph, so it reads as a red section heading rather than a button.
   - **Fix:** give the destructive actions an `OutlinedButton` with error colours, or a full-width list row with a trash icon, leading text and a 48 dp row. Keep the explanation as supporting text inside that row. For Rename, use a trailing "Rename" text button on the Name row, with M3's default 12 dp padding.
3. **[APPEAR-11] minor.** A layout jump during the Appearance change.
   - **Where:** Settings › Appearance.
   - **Evidence:** choosing Dark scrolls the Settings list underneath the sheet. In `measurements.csv` Light rows 188 → 189, "Your podcasts" moves from y 198.7 to 275.7 dp and the first visible item changes from "Listening stats" to "Volume boost". Strip `appearance-0188` → `appearance-0189`.
   - **Fix:** keep the Settings `LazyListState` anchor (item key + offset) across the theme recomposition. Don't let the restore in `rememberBrowsingListState` re-run when the colour scheme changes, or key the restore on route only.
4. **[COPY-04] minor.** Inconsistent capitalisation.
   - **Where:** `strings.xml:325` `bring_over_failed_feed`.
   - **Evidence:** "Couldn’t Subscribe to this feed on the server" capitalises the verb. `subscribe_failed_named` at `:398` writes "Couldn’t subscribe to %1$s". The glossary capitalises nouns such as Subscription, not the verb.
   - **Fix:** change it to "Couldn’t subscribe to this feed on the server."

**N/O:** KEY-01, KEY-04, KEY-07, LIST-07, PTR-03, RESP-01, FOOT-02.

**N/A:**
- FLOW-05: no peer panels at compact width.
- LIST-01 and LIST-04: no columnar data.
- AX-05: no critical audio information and no autoplay.
- START-07: no account creation.
- SIDE-03 and SIDE-04: no split panes on the phone target.

**Passes worth noting**, because they carry the score:
- **DATA-01:** every form draft is persisted to the database and flushed in `onStop`. A typed server address survives Back (41b).
- **DATA-04:** multi-step Undo and Redo with Ctrl+Z and Ctrl+Shift+Z, registered in `onProvideKeyboardShortcuts`.
- **DATA-06:** the tab, each tab's stack, scroll anchors, the Playlist tab and the Podcast-details expansion are restored from the database.
- **DRAG-01, DRAG-05, DRAG-06:** dragging gets a lifted shadow, an insertion line and autoscroll. Move up, Move down and TalkBack custom actions do the same without a drag.
- **B1 (system Back):** `NavigableListDetailPaneScaffold`, `PredictiveBackHandler` for the player and `enableOnBackInvokedCallback`. Back disarms Unsubscribe before it leaves the page.
- **START-04 and START-05:** the notification permission is asked at the first download, after a "Show download progress?" rationale.
- **APPEAR-03:** `UiModeManager.contrast` raises primary, outline and onSurfaceVariant.
- **CTRL-03:** every field keeps a floating label.
- **AX-01:** all controls in the snapshots are named. For example, the check reads "Subscribed to Deep Field. Activate to show Unsubscribe."

## Platform fit (Android › Phone)

Side-by-side against Gmail and Keep: everything is in Material's grammar except the overflow placement and the tri-state top bar on the roots.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Adapted | Bottom bar with three equal destinations; Up on inner screens (S). The ⋮ is not last on roots, View and Playlist, which breaks Material's overflow-last order. |
| L2 Visual language | Native | Consistent M3 tonal palette and component set; one icon family (S) |
| L3 Density, text, frame | Native | `ActionIcon` and every row is ≥ 48 dp; 12 sp minimum; drawn edge to edge with insets; content reflows at 200% (S, C). Top-bar titles ellipsise at 200% ("Podc…", "Select S…", "Settings for Defa…"). |
| B1 System navigation | Native | Predictive Back throughout; root Back → Views → exit (C) |
| B2 Preferences and access | Native | TalkBack names and roles, live regions; text scales; System default, Light and Dark; contrast preference honoured (C, snapshots) |
| B3 System surfaces and lifecycle | Native (process death N/O) | `Intent.createChooser` Sharesheet; in-context notification request; launcher shortcuts; MediaSession, MediaButton and Auto; SEND and VIEW intents for feeds and OPML; database-backed state restore (C) |

Looks 8.2 · Behaves 8.8 → **(8.2 + 2 × 8.8) ÷ 3 = 8.6**.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.2** | Roboto with a tuned M3 scale. Row titles use titleMedium 17 sp, metadata bodyMedium 14 sp in onSurfaceVariant (8.86:1), section headers titleSmall SemiBold, and the Episode headline headlineSmall 22 sp. Reading text is 14/21 (150%). Curly quotes and the × sign are used. Content reflows cleanly at 200% (02, 03, 11, 15). Short of Exemplary because single-line top-bar titles ellipsise at 200% ("Podc…", "Select S…"). The Rewind title puts a "·" inside a sentence ("Rewind Default to Nov 6 · 2:30 PM?"). The Name/value/Rename stack uses three styles for one field. | hierarchy, accessibility |
| Hierarchy | **7.8** | Lists lead and chrome is quiet. Episode detail has one full-width primary. The Podcast page puts its primary in the top bar. Below Exemplary for three reasons. The mini player's filled Play is the strongest shape on every list screen. Root top bars are an irregular cluster: a blank slot, then ⋮, Search, + and the gear. Library leads its list with a heading that reads like an action ("Play without downloading") and ends with a rule residue line (20, 43). Now Playing's secondary controls are four tonal pills of unequal width in two centred rows (08). | content-first |
| Spacing & density | **7.9** | One 16 dp gutter, 14 dp row padding and consistent dividers. At 200%, row actions move to their own line instead of squeezing (02). Below Exemplary for four reasons. In Settings only Import and Export OPML have leading icons, so their text starts at 62 dp while every other row starts at 22 dp (06, 07). Flush zero-padding text buttons (Rename, Delete) break the row rhythm. The Now Playing pill rows are uneven. The Create View footer wraps to the leading edge at 200% while Create Playlist stays trailing (05 vs 19). | craft |
| Color & contrast | **8.2** | Restrained colour with fixed meanings: blue accent for interaction, green for subscribed, red for destructive. A properly toned dark scheme, and contrast-preference tuning. Every text pair measured passes (primary 6.46:1, error 6.13:1, outline 4.25:1; dark onSurfaceVariant 10.9:1). Three minor Appearance failures: APPEAR-04 placeholder 3.67:1, APPEAR-10 and APPEAR-11. A one-off pink `tertiaryContainer` move flash (strip `B-0067`). | color-restraint |
| Iconography | **7.6** | One consistent custom Material-symbol family, every icon button with a tooltip and a label, and a 15/30 numeral skip glyph. Below Strong-high for several reasons. Now Playing's **Chapters** button reuses the **Library** glyph (`PlayerPresentation.kt`, `ic_library`; strip `B-0049`). The gear means app Settings on the roots and Subscription settings on the Podcast page. In Settings, two rows have icons and the rest don't. The Select Subscriptions glyph (dotted square) is a stretch. The drag handle "=" and the ⋮ "Entry actions" sit side by side on every Entry row. | conventions |
| Consistency & polish | **7.8 (stability 7.8)** | Edge states are designed: empty, loading, inline error with retry, disabled Save, 200%, dark, an armed Unsubscribe and an in-slot subscribe spinner. Controls-group checks all pass. Held below 8.5 by four mismatches: overflow placement, the sheet snackbar over the commit row, the Library empty-state residue, and the one-off pink flash. Stability: every main task holds the core still (FLOW-01 resolved above), FLOW-03 kept "Long E" through completion (rows 99 → 100), and follow-ups are in view. Secondary flows still shift (Appearance scroll, snackbar over Done). Strong band, one appearance-independent number. | stability, craft |
| Clarity | **7.4** | Labels are specific verbs, and consequences are spelled out ("It goes to Trash with its History and Listening Timeline, and can be restored for 30 days"). Getting started teaches the model. Clarity is the lowest category, for four reasons. Library groups subscriptions under Download Rule names with no label saying they are Download Rules, and shows "No podcasts use: …" (20, 43). "More actions" on most screens opens a menu whose only item is Redo, usually disabled. Confirmations read mechanically: "Entry The quiet edge of the solar system moved in Default", "Podcast Long listening subscribed" (strip `B-0067`, 63). The owner-fixed no-names mini player and Now Playing leave "what's loaded" readable only from the Artwork initials. | plain-language |
| Platform fit | **8.6** | See the table above: Looks 8.2, Behaves 8.8. No Platform-fit group failures. | conventions |
| Interaction & feedback | **8.4** (partial: responsiveness N/O) | Undo instead of confirmation everywhere: snackbar, top-bar slot, Ctrl+Z, multi-step Redo. Drafts survive leaving and closing. Two-tap Unsubscribe uses the accessibility-recommended timeout. Subscribe acknowledges in its slot within 99 ms. Drag has command and TalkBack equivalents. Long press has an `onLongClickLabel`. Below Exemplary because keyboard paths are N/O, RESP-01 is unmeasured on audience hardware (play-entry first-response lower bound 439–561 ms on the emulator), and the 5 s armed Unsubscribe silently reverts. | forgiveness, feedback |
| **Overall** | **8.0** | A careful, forgiving Material 3 app with exemplary data safety and Back behaviour. What holds it under 9 is mostly craft and wording, not broken conventions: Clarity in the Library and in confirmations, top-bar grammar, iconography reuse, and sheet snackbars. The cap is 7.4 + 2.0 = 9.4, so it doesn't bind. | — |

## Next step

- **Target:** Clarity (7.4), the lowest category. There are no blocker or major failures.
- **Anti-pattern:** implementation-model leakage. The Library's structure exposes the Download Rule grouping as if it were the content's own organisation.
- **Root cause:** `Directory()` (`PodListScreens.kt`, Library branch) uses each `DownloadMode` label as a section heading. It then lists the unused modes as "No podcasts use: …", so the screen narrates the grouping logic instead of naming it.
- **Change:**
  1. Head the groups with a single "Download Rules" overline, or prefix each section, e.g. "Download Rule · Play without downloading".
  2. Drop the `unused_download_rules` line entirely. Unused rules remain discoverable in Subscription settings and Select Subscriptions.
  3. In the empty Library, show only "No Subscriptions yet" + Add podcasts.
- **Principle:** plain-language, content-first.
- **Expected effect:**
  - Clarity +0.3 to +0.4.
  - Hierarchy +0.1 to +0.2, since the Library list loses a competing text block.
  - Consistency gains, because one inventory mismatch goes.
  - No category regresses, and the signature glossary capitalisation is kept.

**What else stands between this build and 9.0, in order of leverage:**
1. **Top-bar grammar.** Put ⋮ last everywhere, as on the Podcast page. Once Redo is the only item, consider replacing the overflow on roots with a Redo icon that appears after an Undo, so "More actions" never opens a one-item, disabled menu. This affects Platform fit L1, Hierarchy, Consistency and Clarity.
2. **Sheet snackbars.** Raise the snackbar above `CommitActions` by measuring its height and padding the host by it, or show sheet confirmations after the sheet closes. A snackbar must never cover Done.
3. **Confirmation wording.** Keep the owner's "Playlist <name> moved to Trash", but make the template idiomatic where it reads poorly:
   - "Moved “The quiet edge…” in Default"
   - "Subscribed to Long listening"
   - Quote the inserted names.
4. **Iconography.** Give Chapters its own glyph (a list-with-bookmark or segmented-timeline icon). Either give every Settings row a leading icon or give none, so the text column aligns at 16 dp. Consider a distinct "tune" glyph for Subscription settings.
5. **Now Playing secondary controls.** Use one row of four equal-width tonal buttons, or a 2 × 2 grid of equal widths, instead of two centred rows of unequal pills.
6. **Destructive and secondary text actions.** Give them visible button bounds (APPEAR-10).
7. **200% titles.** Use `MediumTopAppBar` with two-line titles on inner screens, or let the title wrap, so "Select Subscriptions" and "Podcast" don't ellipsise when the large Unsubscribe or Select all action is present.
8. **Evidence gaps that keep Interaction & feedback partial.**
   - Time the five flows on a release (R8) build on a physical phone. Play-entry is the risk.
   - Add the 5 s Unsubscribe revert and the Appearance change to the flow script.
   - Run one keyboard-only pass (KEY-01, KEY-04, LIST-07).
9. **Placeholder contrast.** Derive each tile's initials colour from its background (APPEAR-04).
