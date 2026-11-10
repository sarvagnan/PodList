# PodList Android phone: UI grade, round 8

Graded 10 Nov 2026 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit; core-checklist.md; platform-fit.md § Android › Phone; rubric.md). This is an independent read: earlier rounds' reports and work lists weren't consulted.

**What was graded.** The capture `android-grade-8` (README: build `a5aa0b7`, branch `feature/android-ui-round-8`, Pixel 10 Pro XL emulator, Android 16, compact window; 37 screens × light, dark and 200% text, each with a screenshot and an accessibility snapshot). The worktree's HEAD (`ffd096c`) is an ancestor of `a5aa0b7` and lacks round 8's changes (Appearance setting, Library overflow menu, the Episode detail action row, etc.). So the code was read from `a5aa0b7` itself, extracted with `git archive` to a scratch folder, so code and capture describe the same build. No device or emulator was driven.

**Evidence caveats.**
- No flow run exists, so the F-only checks, RESP-01 and the stability sub-score are N/O.
- In the `font200/` set, dp-sized elements (icons, artwork tiles, top-bar glyphs) are drawn at about 0.7× their `light/` size. The capture seems to have changed display size as well as font scale. Text reflow can still be judged, but this isn't a pure 200% font-scale test.
- The "MH/DF/SB" tiles are the demo server's artwork bitmaps, not app UI. Their contrast isn't scored.

## Frame

- **Task:** find Episodes through Views (saved filters) and listen to them through Playlists, with a player that is always present.
- **Target:** Android phone, compact window (below 600 dp). Tablet and foldable are out of scope.
- **Posture:** sovereign personal tool (opened many times a day), with background playback.
- **Audience:** perpetual intermediate. First run and Getting started cater to newcomers.
- **Nearest exemplar:** Things, a calm personal list tool whose hierarchy comes from type and secondary colour. From the Android gallery, BuzzKill, for consequence text under each choice.
- **Character:**
  1. Material 3 tonal surfaces from the #2b50c8 accent, with an independently toned dark theme *(owner)*.
  2. Domain nouns capitalised as proper terms: Episode, Entry, Playlist, View, Listening Timeline.
  3. Plain consequence copy under settings and destructive actions ("An Entry leaves once its Episode is Played, wherever you heard it.").
  4. Ruled, full-width lists with two trailing row actions (+ and ▶).
  5. A mini player and Now Playing that show no podcast or Episode names *(owner)*.
- **Owner decisions** (scored, never targeted): the native M3 look, accent and dark theme; bottom navigation (Views, Playlists, Library); Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; the mini player showing the current Entry paused after relaunch; no names in Now Playing or the mini player; Delete Playlist without a question, with "Playlist <name> moved to Trash" and Undo; the Podcast page's compact header, details behind a pull-down, Subscribe in the top bar and a green check; two-tap Unsubscribe with no dialog and Undo afterwards; Rename as an explicit step (Cancel and Save, name on its own lines); unique names ignoring case; no keyboard-shortcut list on the phone.

## Flows

No flows were run. The brief rules out driving a device, and the capture has stills only. FLOW-01, FLOW-02, RESP-01 and the stability sub-score are N/O. Checks with an S or C channel (FLOW-03, FLOW-04, FLOW-06, FLOW-07) are judged from the stills and the code.

**Flow risks seen in code** (not scored; each needs a flow run to confirm or clear):
- **Offline or sync-error row.** `ScreenFrame` inserts it under the top app bar when sync status changes. It arrives unprompted, and every list below it moves down by its height (PodListScreens.kt, `ScreenFrame`). That would fail FLOW-01.
- **Podcast page busy row.** Subscribe, Unsubscribe and bringing an Episode in add a `LinearProgressIndicator` plus a status line under the top bar (PodcastPageScreen.kt). The insertion follows the tap, but its removal arrives with the network result and pulls the header, the Search Episodes field and the list back up.
- **Undo icon in the top app bar.** `EditHistoryMenu` adds an Undo icon to every top bar once the Undo snackbar has gone (SubscriptionRefreshStatus.kt). The title's available width changes about 10 s after an edit, unprompted.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views / a View | Snackbar above mini player ("View created") | — | — | Snackbar Undo; later a top-bar Undo icon | "No Episodes match this View" + tonal "Edit conditions" | Offline/sync row under top bar, with Retry | Row tap; + and ▶ per row | Getting started card (Hide; Settings › Help) |
| View editor / New View | Snackbar | Inline red under field or under the conditions | — | Snackbar | — | — | Sticky bottom bar, trailing: **Done** / **Create**, with live "N Episodes match" | Hint at list end ("Valid condition edits apply as made…") |
| New Playlist | Navigates to the new Playlist + snackbar | Inline red under field | — | Snackbar | — | — | Sticky bottom bar, trailing: **Create Playlist**, leading "Discard draft" | — |
| Save search as a View | Opens the new View | Inline red in dialog field | AlertDialog (Cancel / "Save as a View") | Snackbar | — | — | Dialog confirm | — |
| Rename (View, Playlist) | Snackbar "renamed to…" | Inline red under field ("…is already a Playlist") | — | Snackbar | — | — | Trailing under field: Cancel / **Save** | — |
| Add podcasts | Row button turns "Subscribed" + snackbar | Inline red under field; per-row red line | — | Snackbar Undo | — | — | **Find podcasts**, leading, under field | Field label only |
| Connect to a server | Moves on | Inline red under field | — | — | — | — | **Check and connect**, leading, under field; "Discard draft" below it | Intro paragraph + scope note |
| Podcast page | Snackbar "Subscribed" + Undo | Inline red in header + "Try again" | Two-tap Unsubscribe (owner) | Snackbar Undo | "No Episodes" + tonal Refresh / Clear search | Busy bar + text under top bar | Top bar: Subscribe (filled) or green check | — |
| Playlist / History / Timeline | Snackbar | — | Rewind sheet (Cancel / **Rewind**) | Snackbar | "No History yet. Finish an Episode…" + tonal "Show Entries" | — | ▶ per row; ⋮ menu | Hint "Tap a row with the Rewind symbol…" |
| Playlist settings | Snackbar per toggle | Rename inline | — | Snackbar | — | — | — (live toggles); Delete Playlist red text | Consequence text under the switch and under Delete |
| Settings and its sheets | Snackbar per change ("Setting changed") | OPML: inline red + Retry | — | Snackbar | — | OPML determinate progress + Stop/Resume | Choice applies on tap; sheet has **Done** | Section notes |
| Select Subscriptions → Download Rule sheet | Snackbar | — | — | Snackbar | "No Subscriptions yet" + tonal Add podcasts | — | Choice applies **only on Done** | Explanation under each rule |
| Trash | Snackbar "Playlist restored" | — | — | Snackbar | "No deleted Playlists" (no next step) | — | Restore per row | — |
| Listening stats | — | — | — | — | Text only: "No listening yet. Play an Episode…" (no button) | — | — | "About your stats" paragraph |

**Mismatches**
1. **Creating a named thing has four shapes and three labels.**
   - New View is a screen with a prefilled "New View" in a field labelled "Name", committed by **Create** in a sticky bar.
   - New Playlist is a screen with an empty "Playlist name" field, committed by **Create Playlist**.
   - Saving a search is an AlertDialog committed by **Save as a View**.
   - A new Playlist from the Add sheet is an inline field committed by **Play next / Play last**.
2. **Single-field forms put the main action in three places.**
   - Leading, directly under the field: Add podcasts, Connect.
   - Trailing, under the field: Rename.
   - Trailing, in a sticky bar: New Playlist, New View. → FLOW-07.
3. **Abandoning typed text has two words in three places.** "Cancel" (Rename, the Save-as-View dialog), "Discard draft" (New Playlist's sticky bar leading, Connect below the main button, New View at the end of the list).
4. **"Done" means two different things in identical sheets.**
   - Speed, Keep deleted Playlists and every View-condition sheet apply each choice on tap, and Done only closes.
   - The bulk Download Rule sheet applies nothing until Done, which stays disabled until a choice is made.
5. **Empty states.** Most pair the text with a tonal button. Listening stats gives a next step in words only, and Trash gives no next step.
6. **Domain-term case.** "Playback Settings changed" (snackbar) beside the "Playback settings" section in Subscription settings. → COPY-04.

## Checklist

Coverage: **83%** (pass 53 · fail 6 · N/O 12 · N/A 8; 59 of 71 applicable items verified)

### Failures by severity

**Major**

- **[CTRL-06] Primary actions are buried in menus.**
  - **Where:** multi-select contextual bar (50, 50b, 09); Episode detail (03).
  - **Evidence:** in selection mode, every batch action, including the reason to select (Add to a Playlist), plus Mark Played, Star and Download, sits behind a text button labelled "Actions" (Selection.kt `SelectionToolbar`). Episode detail moves Mark Played, Download and Share into "More actions", although docs/design/product-behaviour.md lists Played/Unplayed and Download as the detail screen's actions. Android's contextual bar convention, as in Gmail and Photos, keeps two to four primary batch actions as icons.
  - **Fix:** in `SelectionToolbar`, replace "Actions" with icon buttons: `playlist_add` (Add to a Playlist), `check` (Mark Played), `star` (Star), `download`. Keep an overflow only for anything beyond four. On Episode detail, put Mark Played/Unplayed and Download in the existing FlowRow beside Add to a Playlist and Star. Keep Share in More actions.

**Minor**

- **[FLOW-07] Single-field forms put the main action in different places.**
  - **Where:** Add podcasts (26, 59), Connect (41, 41b), New Playlist (19), Rename (04c, 16b).
  - **Evidence:** "Find podcasts" and "Check and connect" are leading, under the field. Rename's Save is trailing, under the field. "Create Playlist" and "Create" are trailing, in a sticky bar.
  - **Fix:** pick one rule for one-field forms, such as trailing under the field through `CommitActions`, as Rename does. Apply it to Add podcasts and Connect, or move all creates into the sticky bar. Either way, one placement.
- **[FLOW-06] The View editor's sticky bar vanishes during Rename.**
  - **Where:** View editor → Rename (04 vs 04c).
  - **Evidence:** the bar with "4 Episodes match / Done" is removed while Rename is open (`if (drafts.get(renamePrefix + "name") == null) Surface…` in ViewEditor.kt) and returns on Cancel/Save. The editor's main action and live count disappear mid-task.
  - **Fix:** keep the bar and disable Done while Rename is open, with a "Finish renaming first" supporting line. Or keep the count and hide only the button, so the block's height holds.
- **[COPY-01] Vague or inconsistent action labels.**
  - **Where:** selection bar; create flows; first run.
  - **Evidence:**
    - "Actions" names no action.
    - The same create step is labelled "Create", "Create Playlist" and "Save as a View".
    - Welcome's "Connect to a server" opens a screen titled "Connect to your server".
  - **Fix:** use icon actions (see CTRL-06). Label creates "Create View" and "Create Playlist" everywhere, including the Save-as-View dialog. Use one phrase for the server step.
- **[COPY-04] Inconsistent capitalisation of a domain term.**
  - **Where:** Subscription settings and its snackbar (24).
  - **Evidence:** the domain term **Playback Settings** (CONTEXT.md) appears as "Playback settings" in the section header (`m4_playback_overrides`) but as "Playback Settings changed" in the snackbar.
  - **Fix:** use the CONTEXT.md casing in both strings.
- **[KEY-08] No keyboard shortcut reference.** *(Owner decision: not a target.)*
  - **Where:** app-wide.
  - **Evidence:** Ctrl+Z and Ctrl+Shift+Z are handled (MainActivity `onKeyDown`, `historyShortcuts`), but nothing lists them. `onProvideKeyboardShortcuts` isn't overridden, so Android's system Keyboard Shortcuts Helper (Meta+/) shows nothing for PodList.
  - **Fix, if the owner reopens it:** supply a `KeyboardShortcutGroup` from `onProvideKeyboardShortcuts`. That is a system list, not an on-screen one.

### N/O
FLOW-01, FLOW-02, KEY-01, KEY-04, KEY-06, KEY-07, LIST-07, PTR-03, APPEAR-11, WIN-03, RESP-01, FOOT-02

### N/A
FLOW-05 (no side-by-side panels at compact width), LIST-01 (Android clause: no column data), LIST-04 (no dense multi-column rows), AX-05 (no autoplay or app audio cues), START-07 (no accounts), EDIT-02 (only native text fields), SIDE-03, SIDE-04 (no panes on a compact phone)

### Notable passes (evidence)
- **DATA-01, DATA-06:** form drafts are stored in the database (`FormDraftStore`, `rememberDraftText`). 41b shows a typed server address kept after Back. Destination, back stacks, scroll positions, search text, the stats table toggle and each Podcast page's query and expansion persist (`BrowsingState`, `saveBrowsingContext`).
- **DATA-04, DATA-05:** multi-step Undo and Redo with Ctrl+Z and Ctrl+Shift+Z, with specific labels ("Undo …"). Undo reveals its result (`revealChanges` navigates and scrolls to the restored Entry).
- **DRAG-01/03/05/06:**
  - Entries have a 48 dp drag handle, with Move up and Move down in the ⋮ menu and as TalkBack custom actions.
  - Dragging shows an insertion rule and autoscrolls.
  - The moved Entry stays highlighted for 1.8 s, and the move can be undone.
- **APPEAR-03, APPEAR-04:** the theme follows `UiModeManager.contrast` and interpolates primary, onSurfaceVariant and outline toward onSurface. Measured pairs:

  | Pair | Contrast |
  |---|---|
  | Primary #2b50c8 on #faf8ff | 6.4:1 |
  | onSurfaceVariant #46464f on #faf8ff | ≈9:1 |
  | White check on subscribed green #176b39 | 6.6:1 |
  | Light snackbar action #b8c4ff on #303038 | 7.8:1 |
  | Dark snackbar action #2b50c8 on #e4e1e9 | 5.3:1 |
  | Chart bars at 72% alpha | ≈3.6:1 |

- **START-02, START-04, START-05:** Getting started can be hidden and reopened from Settings › Help. The notification permission is asked at the first download, after a one-sentence reason ("Allow notifications to see download progress and stop a download.").
- **TYPE-05:** at large text, rows stack their actions below the text (`stacked`), `ValueRow` moves values under labels, stat tiles stack, and the Edit View bar wraps its count (font200 02, 04, 11, 33).
- **TYPE-08:** strings use ’ “ ” … – × throughout.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.2** | A small custom M3 scale with one role per style. Titles are titleMedium (17 sp, Medium). Metadata is bodySmall (12 sp) in onSurfaceVariant. Section labels are titleSmall in onSurfaceVariant. Episode detail's title is headlineSmall. Typographic punctuation is consistent, and 200% text reflows without clipping. Below Exemplary: the Listening Timeline sets the date in labelMedium (Medium weight) between the title and the event, so the least important line is heavier than the event (14). The stats "Top podcasts" minutes are centred against a name-plus-bar column and don't share the name's baseline (33). | `hierarchy`, `craft` |
| Hierarchy | **8.0** | The squint test passes on every list: content leads, and the mini player and bottom bar take about 18% of the height. One filled primary per screen: Play now, Create, Done, Subscribe, Rewind. Below Exemplary: <br>• Episode detail centres a 112 dp artwork over left-aligned text and a full-width button (03), so two alignment axes compete. <br>• In Library, "Download Rule: Stream only" is styled like a section heading but reads as a setting (20). <br>• Every Episode row carries two full-contrast black glyphs (+ ▶), so a list of 8 rows shows 16 equal-weight icons beside the titles (02, 22, 23). | `content-first`, `hierarchy` |
| Spacing & density | **7.8** | The app uses one 16 dp gutter, and ValueRow (≥56 dp), ChoiceRows (≥48 dp) and ActionIcon (48 dp) keep targets consistent. Below Exemplary: <br>• Welcome and Connect use a 24 dp gutter (`padding(24.dp)`), so first run is visibly inset differently from every other screen (40, 41 vs 26). <br>• Every list uses full-bleed `HorizontalDivider`s in addition to row padding, giving a ruled-ledger look heavier than the calm posture needs (01, 10, 20, 24). | `craft`, `hierarchy` |
| Color & contrast | **8.5** | A restrained, meaningful palette. Blue means interactive, red means destructive or error, and green means subscribed, each with a dark variant. Text pairs pass, and the contrast preference is honoured (rare). Dark (dark/*) is independently toned rather than inverted. Below Exemplary: actions use two treatments, black onSurface glyphs in rows and blue text buttons elsewhere, so colour doesn't consistently mark "interactive". Progress tracks (light lavender on #faf8ff) are close to invisible, which leaves the M3 stop dot as the only end marker. | `color-restraint`, `accessibility` |
| Iconography | **7.6** | A single Material Symbols family at 24 dp, with labels and long-press tooltips on every icon button (`ActionIcon`). Below Strong's top: <br>• "+" means *create* in top bars (New View, New Playlist, Add podcasts) and *add to a Playlist* in rows. Material has `playlist_add` for the latter. <br>• The Rewind marker is the history/restore clock (14), shown under a tab named "History" one tap away. <br>• The pencil on a Playlist opens "Playlist settings" rather than an editor. <br>• The Library destination glyph (inbox tray) doesn't suggest subscriptions. | `conventions`, `plain-language` |
| Consistency & polish | **6.9** (capped by CTRL-06; uncapped ≈7.9) · stability **N/O** (no flow run) | Standard M3 controls behave as standard. Most states are designed: loading ("Loading local Library…"), empty states with actions, inline errors, disabled Save and Find, and a determinate OPML progress bar with Stop and Resume. Capped at 6.9 by the CTRL-06 major failure (Controls group). Inventory mismatches 1–6 (four create shapes, three commit placements, "Done" with two meanings) and FLOW-06/07 would keep it out of Exemplary even uncapped. | `craft`, `conventions` |
| Clarity | **7.6** | Consequence copy is a strength. Clear on Played, Delete Playlist ("goes to Trash … restored for 30 days") and the Rewind sheet state exactly what will happen. Errors name a recovery. Below Exemplary: <br>• "Actions" names nothing (50). <br>• First run asks a newcomer to "Connect to your tailnet first" (41), which is jargon. <br>• "Playlist settings" doesn't say which Playlist, and for Default nothing on the screen does (16). <br>• The Views list reads "Starred / Starred" (01). <br>• The Timeline shows "Listened 12:34–12:34" for a zero-length stretch (14). <br>• The owner-decided nameless player leaves what's playing legible only from artwork. | `plain-language`, `feedback` |
| Platform fit | **8.7** (Looks 8.6 · Behaves 8.8, from code, not run) | **L1 Native:** a bottom bar with three equal destinations; top app bars with Up on inner screens and none at the roots. **L2 Native:** consistent M3. **L3 Native:** 48 dp targets, edge-to-edge with insets, and 200% reflow. **B1 Native:** `NavigableListDetailPaneScaffold` with PopLatest and predictive Back; `PredictiveBackHandler` collapses Now Playing; Back clears a selection and disarms Unsubscribe; root Back returns to Views, then exits; `enableOnBackInvokedCallback`. **B2 Native:** TalkBack labels, roles and headings; text scales; Light, Dark and System default; the system contrast setting. **B3 Native:** the Sharesheet (`createChooser`); permission in context; launcher shortcuts; a Media3 session and service; state restored from the database. Adapted, not foreign: a text "Actions" in the contextual bar, and persistent Undo/Redo top-bar icons (a desktop-leaning idiom). PF = (8.6 + 2×8.8)/3. | `conventions`, `stability` |
| Interaction & feedback | **8.3** (partial: no flow run; keyboard N/O) | Forgiving throughout: every edit is undoable from the snackbar and from multi-step history (Ctrl+Z), drafts survive process death, drag has menu and TalkBack equivalents, and long work shows determinate, stoppable progress. Below Exemplary: <br>• Every setting change raises a snackbar ("Setting changed / Undo"), including each tap on a choice sheet, which is noisy for live settings (`recordHistory` in `model.edit`). <br>• Multi-select is reachable only by long-press. <br>• The busy and offline rows inserted under the top bar risk moving the screen (Flow risks above). <br>• KEY-08 fails (owner-decided). | `forgiveness`, `feedback` |
| **Overall** | **7.9** | A well-built, forgiving, unmistakably Android podcast client. Behaviour is stronger than finish. The cap rule allows at most 8.9 (lowest category 6.9). Holding it down most: CTRL-06's buried primary actions, and the inconsistent create/commit grammar across forms and sheets. Below those sit iconography's double meanings and spacing's two gutters and ruled lists. | — |

**What stands between this build and 9.0 overall**
1. **Clear CTRL-06.** Icon actions in the contextual bar, and Mark Played and Download on Episode detail. This lifts the Consistency & polish cap to its uncapped ≈7.9.
2. **One commit grammar.** One placement and one label pattern for create and rename forms, one discard word, and one meaning for "Done" in sheets. That fixes FLOW-07 and COPY-01 and clears inventory mismatches 1–4. With (1), it is the route to Consistency & polish ≥ 8.5.
3. **Iconography to 8.5+.** `playlist_add` in rows, a distinct Rewind glyph (for example `fast_rewind` or `replay`), and a gear or `tune` for Playlist settings.
4. **Spacing to 8.5+.** First run on the 16 dp gutter. Drop or inset the dividers on Views, Playlists, Library and Settings (M3 lists separate rows by padding; keep dividers only between groups).
5. **Clarity to 8.5+.**
   - Name the Playlist in "Playlist settings" (for example, "Commute settings").
   - Replace "tailnet" with "your private network (for example, Tailscale)".
   - Hide a View's description when it only repeats the name.
   - Omit zero-length listened stretches.
6. **A scripted flow run.** Subscribe, Unsubscribe and Undo on the Podcast page; offline → online on a View; create a Playlist. This turns the stability sub-score from N/O into a number and settles the three flow risks. Without it, Consistency & polish stays "partial".

## Next step

- **Target:** CTRL-06 (major), the failure that caps the lowest category (Consistency & polish, 6.9), on the primary task: picking Episodes and adding them to a Playlist.
- **Anti-pattern:** primary actions hidden behind a menu.
- **Root cause:** the contextual bar spends its trailing space on one vague text button ("Actions"), and Episode detail collapses two core Episode actions into "More actions". The actions people select Episodes for are never visible.
- **Change:**
  - In `SelectionToolbar` (Selection.kt), show four `ActionIcon`s: `playlist_add` "Add to a Playlist", `check` "Mark Played", `star` "Star", `download` "Download". Use the same labels as tooltips and TalkBack names, and drop the "Actions" menu.
  - In `EpisodeDetail`, add Mark Played/Unplayed and Download as `TextButton`s in the existing FlowRow. Keep Share in More actions.
- **Principle:** `discoverable-commands`.
- **Expected effect:** CTRL-06 → pass. The cap on Consistency & polish lifts (≈7.9). Clarity improves ("Actions" goes away). Hierarchy holds: the contextual bar carries icons as Android's own apps do. No character element is touched.
