# PodList Android phone — UI grade, round 11

Graded 2026-11-10 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android › Phone, rubric.md). Build: `main` at 5441d0b. Evidence: the capture at `scratchpad/android-grade-11` (Pixel 10 Pro XL emulator profile, Android 16, compact window, density 480, so 3 px = 1 dp; light, dark and 200% font scale; screenshot plus accessibility snapshot per screen), and the code under `apps/android/app/src/main` read for behaviour. No device or emulator was driven. This grader read no earlier round's report or work list.

Capture gaps: `font200/` has no 04c (View rename), and `font200/30-listening-stats` shows Settings instead of stats. Neither is graded as an app defect.

## Frame

- **Task:** find Episodes through Views and listen to them through Playlists, with a server or as a Standalone Device.
- **Target:** Android phone, compact window (< 600 dp). Tablet and foldable are out of scope.
- **Posture:** sovereign on the phone (opened many times a day), with a persistent player across every screen.
- **Audience:** perpetual intermediate; first run serves newcomers.
- **Nearest exemplar:** Things. It is a calm personal list tool with plain words that carry a model ("When" and "Deadline" there; "Views" and "Playlists" here). It is used here as a reference for craft, not as a look.
- **Character:**
  1. PodList blue `#2b50c8` on Material 3 roles, with an independently toned dark theme (owner).
  2. Playback built around controls, not names: the mini player and Now Playing show no podcast or Episode names (owner).
  3. The domain vocabulary is capitalised in the UI copy (Episode, View, Playlist, Entry, Device, Played, Starred).
  4. Explanatory helper copy sits under settings and destructive actions ("It goes to Trash with its History…").
  5. Single-column lists of rows with the value trailing, opening small sheets.
- **Owner decisions (graded, not targeted):**
  - Material 3 with `#2b50c8` and a dark theme.
  - Bottom navigation with Views, Playlists and Library.
  - Add podcasts as one field.
  - The View editor as one list.
  - Rewind as a summary sheet.
  - OPML import and export in Settings, with tray icons.
  - The mini player shows the current Entry paused after relaunch.
  - Nothing names the podcast or Episode in Now Playing or the mini player.
  - Delete Playlist asks nothing first, then shows "Playlist <name> moved to Trash" with Undo.
  - The Podcast page has a compact header with a pull-down description, Subscribe in the top bar, and a green check once subscribed.
  - Unsubscribe takes two taps with no dialog, offers Undo, and keeps the person on the page.
  - Rename is an explicit step with Cancel and Save.
  - Names are unique, ignoring case.
  - Keyboard shortcuts are never listed on the phone.

## Flows

No flow run. Nothing drove the app, and the capture is a set of still states. So FLOW-01 and FLOW-02 are N/O, the stability sub-score is N/O, and Consistency & polish is marked "partial: no flow run".
- **FLOW-03:** judged from code.
- **FLOW-04 to FLOW-07:** judged from the screenshots.
- **RESP-01:** N/O, because there were no timed runs.

Failures: [FLOW-07] the "create a named thing" forms put their main action in different places.
- **New Playlist (19):** an inline Create Playlist button, trailing under the field.
- **New View (05):** Create View in a sticky bottom bar beside the count.
- **Other forms:** Add podcasts (26) and Connect (41) put it inline, while the View editor (04) uses the sticky bar.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views (01, 42) | — | Sync strip under the top bar ("Offline · Showing local data…") with Try again (code) | — | Top-bar Undo/Redo icons when there's history (code) | Getting started card above the starter Views | — | + in the top bar | Getting started card with Hide (42) |
| View (02) | — | Inline per row (code) | — | Snackbar "Undo", above the player | "No Episodes match" (code) | — | Row Play / Add (+) | Conditions summary under the count |
| View editor (04) | Snackbar "View renamed to X" (code) | Inline under the name field (code) | — | Snackbar, plus top-bar Undo (code) | — | — | **Done in the sticky bottom bar** | "Valid condition edits apply as made…" |
| New View (05) | Snackbar "View created" (code) | Inline under the field (code) | — | — | — | — | **Create View in the sticky bottom bar** | "Your conditions are kept until you create the View." |
| New Playlist (19) | Snackbar "Playlist created" (code) | Inline under the field (code) | — | — | — | — | **Create Playlist inline, trailing under the field** | none |
| Playlist settings (16c) | Snackbar "Playlist renamed to X" | Inline under the field | — | Snackbar Undo | — | — | Save inline, trailing | Paragraphs under each setting |
| Episode detail (03) | Snackbar "Episode marked Played" (code) | Inline under the action grid (code) | — | Snackbar | "Not in a Playlist" hint (code) | — | Filled Play Now | — |
| Search (21, 22) | — | — | — | — | "No matches" with a Clear search button (code) | — | none; "Save as a View" text button | Hint only on the Library row ("Episode titles, podcast names and show notes") |
| Playlist (11, 13, 14) | Snackbar "Entry removed", "Playlist rewound" | — | Rewind sheet with Cancel / Rewind (15) | Snackbar | "No History yet…" with Show Entries (13) | — | Row Play | Timeline instruction line (14) |
| Trash (18) | Snackbar "Playlist X restored as Y" | — | — | Snackbar | "No deleted Playlists" with Back to Playlists | — | — | Retention explained |
| Library (20, 43) | — | Sync strip (code) | — | — | "No Subscriptions yet" with Add podcasts; **the top-bar + is gone** (43) | — | + in the top bar (20) | Search row subtitle |
| Podcast page (23, 28, 63) | Snackbar "Subscribed" (63) / "Unsubscribed" | Inline with Try again (code) | Armed red Unsubscribe in the top bar (28) | Snackbar | — | — | Subscribe / green check in the top bar | — |
| Subscription settings (24) | — (changes go to Undo history without a snackbar) | Inline (code) | — | Top-bar Undo (code) | — | — | Value rows | Paragraphs under each section |
| Add podcasts (26, 59) | Inline result row turns to subscribed (code) | Inline under the field (code) | — | Snackbar (code) | Empty: a disabled button only | — | Find podcasts inline, trailing | Field label only |
| Settings (06) | — | OPML errors inline under the OPML rows (code) | Notification rationale dialog (code) | Top-bar Undo, scrolls to the row (code) | — | — | Value rows / sheets; **Appearance opens a full page** (06c) | Section subtitle "Subscription overrides apply to these defaults." |
| Listening stats (30, 33) | — | — | — | — | "No listening yet…" with Find something to play | — | — | "About your stats" |
| Connect (41) | — | 5 inline errors under the field (code) | — | — | — | — | Check and connect inline, trailing | Lines above and below the field |

**Mismatches**
1. **Commit placement:** New View (05) and New Playlist (19) are forms of the same kind, but the commit sits in a sticky bar on one and inline on the other (FLOW-07).
2. **Default-name behaviour:**
   - New View (05) pre-fills "New View" with the caret at the start, so typing makes "XNew View".
   - New Playlist (19) starts empty.
   - Rename (04c, 16b) selects the whole name.
3. **Snackbar wording** names its object on some screens and not others:
   - Names it: "Playlist Commute moved to Trash", "Playlist renamed to X".
   - Doesn't: "View deleted", "Entry removed", "Subscribed".
   - Same event, two strings: "Entry removed" vs "Entry removed from Playlist", and "Marked Played by hand" vs "Episode marked Played".
   - Capitalisation varies: "Episode starred" vs the domain term "Starred" / "Not Starred" (COPY-04).
4. **Settings titles:** Playlist settings is titled "Settings for Commute" (16c), but Subscription settings is titled "Subscription settings" (24) and doesn't name the podcast.
5. **Option pickers:** most Settings options open a bottom sheet (06b Speed), but Appearance opens a full screen with three radio buttons (06c).
6. **Persistent actions:** Library's top-bar + is present with Subscriptions (20) but disappears when the Library is empty (43). Views and Playlists always keep theirs.
7. **The Stream Download Rule has three names:** "Stream" as the value (24), "Play without downloading" as the Library group heading (20), and "No automatic downloads on this Device" as help (24) (COPY-01).

## Checklist

**Coverage: 89.2%** (pass 58 · fail 8 · N/O 8 · N/A 5; applicable 74). Mac-only checks: N/A → target, outside the count.

### Failures by severity

**Major**
- **[EDIT-02] Selection mode has no Select all** (Platform fit cap 6.9).
  - Where: the multi-select contextual bar (50, 09) and Select Subscriptions (27).
  - Evidence: `SelectionToolbar` shows only a close icon and the count (Selection.kt:40–44). The bottom action bar offers Add to a Playlist, Mark Played, Star and Download. Nothing selects every row, and Ctrl+A isn't handled (MainActivity.kt:59–64 handles only Ctrl+Z). Select Subscriptions (27) is a plain checkbox list with no Select all either. Android's own selection modes (Files, Gmail, Photos) and common podcast clients offer Select all, and the obvious bulk task here, marking a View's backlog Played or downloading it, needs it.
  - Fix: add a "Select all" action icon (Material `select_all`, label "Select all") to `SelectionToolbar` that selects every row of the current list and then becomes "Clear selection". Handle Ctrl+A while selection mode is active, and add the same to Select Subscriptions.
- **[EDIT-05] A podcast can't be shared or its link copied** (Platform fit cap 6.9).
  - Where: the Podcast page (23, 60, 63) and Episode detail.
  - Evidence: The only `createChooser` in the app is Share Episode in the Episode overflow (PodListScreens.kt:497–502). The Podcast page has no share or copy action, and its feed or website address is never shown (PodcastPageScreen.kt). Share Episode also falls back to the raw `audio_url` when the guid isn't a URL, so it often shares an MP3 address rather than a page.
  - Fix: add an overflow menu on the Podcast page with "Share podcast". It should send the podcast's website link (or the feed URL when there's no website) through `Intent.createChooser(ACTION_SEND)`, with `EXTRA_TITLE` set to the podcast name; the Sharesheet supplies Copy. For Episodes, prefer the episode `<link>` over the enclosure and share the audio address only as a last resort.

**Minor**
- **[FLOW-07] The main action moves between forms of the same kind.**
  - Where: New View (05) and New Playlist (19), plus the inventory above.
  - Evidence: Create View sits in a sticky bottom bar just above the system bar, about 830 dp down. Create Playlist sits inline directly under the Name field, about 205 dp down.
  - Fix: give New Playlist the same sticky commit bar as New View ("Create Playlist" trailing in the bar), or move New View's commit inline. Choose one placement for every create form.
- **[KEY-08] No shortcut reference** (owner decision: no in-app list on the phone; scored, not targeted).
  - Where: the app.
  - Evidence: The app supports Ctrl+Z and Ctrl+Shift+Z (MainActivity.kt:59), but `onProvideKeyboardShortcuts` isn't implemented, so the system Keyboard Shortcuts helper (Meta+/) shows nothing for PodList.
  - Fix: override `onProvideKeyboardShortcuts` to publish Undo, Redo and, once added, Select all. This lists them in the system helper without adding anything to the app's own screens.
- **[CTRL-05] The mini player's bar has no pressed state.**
  - Where: the mini player (every screen).
  - Evidence: the bar opens Now Playing through `pointerInput { detectTapGestures { expand() } }` (PlayerPresentation.kt:147), with no indication. Taps in the gaps between the skip and play buttons also expand the player without feedback.
  - Fix: replace it with `Modifier.clickable(onClickLabel = …, onClick = expand)` so the bar ripples. Keep the 48 dp buttons as separate targets.
- **[APPEAR-09] Glyphs are reused with new meanings and mixed styles.**
  - Where: Episode detail (03), multi-select bar (50), Getting started (42), Library (20).
  - Evidence:
    - The Subscribed status badge (a 24 dp check in a filled green circle, padded to 32 dp) is reused as the **Mark Played action** (Selection.kt:61–63). It stays green on an Unplayed Episode, and also when the label reads "Mark Unplayed". It sits in a row of 24 dp outlined glyphs and pushes its label 8 dp below the siblings: "Mark Played" baselines at 296 vs 284 px in the 1.5× crop.
    - The Library tab's archive-box glyph also marks "Select Subscriptions" (20).
  - Fix: give Mark Played the outlined check (`check_circle` outline, or `done_all` for bulk) at 24 dp, tinted like its siblings, and switch to a filled check only when the Episode *is* Played. Keep the green badge for Subscribed alone. Use a checklist glyph (`checklist`) for Select Subscriptions.
- **[COPY-01] Terminology drifts.**
  - Where: Library (20), Subscription settings (24), Playlist settings (16c).
  - Evidence:
    - CONTEXT.md names the Download Rule "Stream", and the value reads "Stream", but the Library groups it as "Play without downloading".
    - Playlist settings are titled "Settings for Commute", while Subscription settings don't name the podcast.
  - Fix:
    - Title the Library group "Stream" with the help "No automatic downloads on this Device" as its subtitle, or rename the rule everywhere.
    - Title the page "Settings for Deep Field" to match Playlists.
- **[COPY-04] Domain-term capitalisation varies by message.**
  - Where: snackbars (strings.xml:340–345 vs 58, 171, 224).
  - Evidence: "Episode starred", "Episode unstarred" and "Episodes starred" lower-case Starred. "Starred", "Not Starred" and "Marked Played by hand" capitalise it.
  - Fix: use "Episode Starred", "Episode no longer Starred" and so on, following the CONTEXT.md capitalisation as the rest of the app does. Settle on one string per event ("Entry removed from Playlist", "Episode marked Played").

### N/O
FLOW-01, FLOW-02, KEY-01, KEY-07, LIST-07, APPEAR-11, RESP-01, FOOT-02

### N/A
CTRL-02 (no checkbox hierarchies), START-07 (no account creation), TOOL-06, SIDE-03, SIDE-04 (nothing hideable, no panes on a compact phone)

### Passes worth naming (evidence)
- **FLOW-03 (C):**
  - The Add podcasts field is disabled while searching (AddPodcastsScreen.kt:78).
  - Search results fill only the list.
  - The server field is cleared only after its own successful connect.
- **FLOW-04 (S):** the "Subscribed · Undo" snackbar lands above the mini player, in view (63). The armed Unsubscribe sits in the same top-bar slot as the check (28).
- **DATA-01, DATA-06 (C):**
  - Back stacks, selected tab, scroll anchors, the Search text, the Podcast page's query and header state, and every text draft persist to SQLite on each change (BrowsingState.kt; FormDraftState.kt:17–22).
  - They survive process death, not only rotation.
  - 41b shows a typed server address kept after Back.
- **DATA-04, DATA-05 (C):**
  - Undo and Redo go several steps back, with Ctrl+Z and Ctrl+Shift+Z, and specific labels ("Undo: Playlist renamed to X").
  - Undo navigates to what it restored and scrolls to it. A restored Entry is highlighted and announced (EntryDragging.kt:54–63).
- **DLG-01 (C):** the only AlertDialog is the notification rationale, "Show download progress?" with Continue and Not now, shown at the first download (IncomingContent.kt:39–45). Everything else uses Undo.
- **APPEAR-04 (measured):**
  - Light: secondary text #46464f on #faf8ff is 8.86:1; primary #2b50c8 is 6.46:1; error #ba1a1a is 6.13:1; the outline #777680 is 4.25:1 (non-text, ≥ 3).
  - Dark: secondary text #c7c5d0 on #121318 is 10.9:1.
  - The subscribed green #176b39 is 6.23:1 in light, and #80db9a is 11.06:1 in dark.
  - Chart bars (primary at 72%): 3.58:1 in light and 6.13:1 in dark.
- **APPEAR-03 (C):** the app follows the system contrast level and strengthens primary, secondary text and outlines toward the main text colour (MainActivity.kt:142–156).
- **TYPE-05 (S):** at 200% (font200/) every screen reflows. Value rows stack their value under the label (04, 06, 24), row actions drop below the row (02, 21), the action grid goes to two columns (03, 50), and the Podcast page hides its gear while Unsubscribe is armed (28). Nothing clips except where noted in the scores.
- **TYPE-08 (C):** the strings use curly quotes and apostrophes and no "...". They read "Use “Play Next” or “Play Last”" and "can’t".
- **AX-01, AX-04 (S + C):**
  - Every icon button is named in the snapshots ("Back 15 seconds", "Default · 2 Entries after the current one", "Collapse Now Playing").
  - The mini player's artwork reads "Now Playing: Market Hours · The long life of a shipping container", so TalkBack gets the names the owner keeps off the screen.
  - Drag has Move up and Move down in the menu and as TalkBack actions.
  - The chart has day buttons and a table.
- **START-02, START-04 (C):** the Getting started card can be hidden, stays hidden, and reopens from Settings › Help. Notifications are asked for once, at the first download, after a rationale.

## Platform fit (Android › Phone)

Side-by-side with Google apps of the same kind (Settings, Files, the Gmail selection mode, Podcasts-style players):

**Foreign or missing:**
- No Select all in selection mode.
- No way to share a podcast.
- The top app bars never take the scrolled container colour, so content slides under a flat bar (04b, 25, 33–35 show half-cut lines under the bar). `TopAppBar` is used without a `scrollBehavior` anywhere.

Everything else is at home.

| # | Signal | Verdict | Evidence |
|---|---|---|---|
| L1 | Navigation | **Native** (S) | Bottom bar with three equal destinations (01, 10, 20). A top app bar with + and the gear on each root and no Up at a root. Up on every inner screen. The contextual bar replaces it in selection (50). |
| L2 | Visual language | **Native** (S) | Consistent Material 3: tonal buttons, outlined fields, radio sheets with handles, an inverse snackbar, a navigation indicator pill. One tell: the filled green badge used as an action (APPEAR-09). |
| L3 | Density, text, system frame | **Native** (S + C) | 48 dp targets (`ActionIcon`, rows, mini player). Text 12 sp minimum (MainActivity.kt:132–135). Drawn edge to edge with safe-drawing insets and `imePadding`; reflows at 200%. One clipped field label at 1× (View rename, 04c). |
| B1 | System navigation | **Native** (C) | `enableOnBackInvokedCallback="true"`; per-tab stacks in `NavigableListDetailPaneScaffold`. Back runs in order: sheet, player pages, player, stack. At a root other than Views, Back goes to Views; at Views it exits. Small oddity: with Unsubscribe armed, the first Back only disarms. |
| B2 | Preferences and access | **Native** (S + C) | TalkBack names and states, sp text through 200%, System default / Light / Dark (06c), the system contrast level honoured, strings in resources with plurals and locale dates. |
| B3 | System surfaces and lifecycle | **Adapted** (C) | The Sharesheet for Episodes, but not for podcasts. A named "Downloads" channel; a Media3 session with a media notification. Notifications asked for in context. Full restoration after process death. Static launcher shortcuts. Incoming shares and OPML handled. `allowBackup="false"`, so a Standalone Device's Library doesn't move to a new phone with Android backup; only OPML carries it. |

**Looks 8.5 · Behaves 8.6 → Platform fit 8.6 uncapped → 6.9 capped** (EDIT-02, EDIT-05 major).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.4** | **For:** a deliberate custom M3 scale, 12/14/16/17/20 sp (MainActivity.kt:123–136). Row titles are titleMedium 17 sp Medium, metadata is bodySmall 12 sp, and section labels are titleSmall in onSurfaceVariant. Type alone separates title, metadata and state in Episode rows (02). Titles wrap, never truncate (11, 21). Typographic punctuation throughout. 200% keeps the hierarchy (font200/02, 03).<br>**Held below Exemplary:** section headings ("Show notes", "In your Playlists", "Show Episodes where", "Then") are 14 sp grey, smaller and lighter than the 17 sp rows they head, so sections read as captions rather than structure. Episode detail and the Podcast page stack two titles of near-equal size: the generic "Episode"/"Podcast" in the top bar (20 sp) over the real name (20 sp) (03, 23). | `hierarchy`, `craft` |
| Hierarchy | **8.2** | **For:** one filled primary per screen (Play Now 03, Done 04, Create View 05, Subscribe 60). The mini player's filled play button leads the persistent chrome. Chrome is quiet, with a flat top bar and tonal nav. Empty states put the next step first (13, 18, 30, 43).<br>**Squint test misses on Episode detail (03):** the green filled Mark Played disc is the second-strongest shape after Play Now and outweighs the action it sits among. On the Podcast page the 32 dp green disc outweighs the title.<br>**Now Playing (08):** the 375 dp artwork shows the generic placeholder while the mini player shows the podcast's tile. Above 512 px, `ArtworkImage` fetches the publisher URL directly and bypasses the server proxy that drew the smaller tile (ArtworkImage.kt:52–55). The largest element on the screen then identifies nothing, which matters more because the owner removed the names. | `content-first`, `hierarchy` |
| Spacing & density | **8.0** | **For:** a 16 dp gutter everywhere. Rows of 56–80 dp with full-width hairlines. Value rows align their values trailing (04, 06, 24). Sheets keep a 16 dp inset with a trailing commit. Density suits a personal phone tool. At 200%, rows switch to stacked layouts instead of clipping.<br>**Misalignments:**<br>• View rename (04c): the field sits flush under the top bar, cutting the "Name" label in half; the Playlist rename keeps 16 dp above it (16b).<br>• Mark Played's label sits 8 dp below its siblings (03, 50).<br>• Now Playing's four secondary buttons (1.0×, Sleep, Episode, Entries · 2 next) are each centred on their own, so they form no columns (08).<br>• In Settings only the two OPML rows carry leading icons, so their text starts at 58 dp while every other row starts at 16 dp (06; owner-chosen icons). | `craft`, `hierarchy` |
| Color & contrast | **8.5** | **For:** a restrained palette: PodList blue for interactive emphasis, red only for destructive actions (Delete View/Playlist, Unsubscribe), green for Subscribed. Every measured pair passes (above). The dark theme is toned independently, not inverted (all dark/ captures). The contrast preference is honoured.<br>**Held below Exemplary:** green means "Subscribed" on the Podcast page and "done" in Getting started, but is also the colour of the *Mark Played action* on an unplayed Episode (03, 50). It stays green for "Mark Unplayed", so one colour carries both a state and a command. | `color-restraint`, `accessibility` |
| Iconography | **7.8** | **For:** one outlined Material-style set (tune, playlist_add, play, 15/30 skip, moon, gear), all labelled with tooltips (`ActionIcon`, EditorComponents.kt:166).<br>**Against (APPEAR-09):** the filled 32 dp green badge is mixed into a 24 dp outlined row and used as a command. The Library tab's archive box reads as "Archive" and is reused for Select Subscriptions (20). The OPML tray icons appear on only two Settings rows (owner). | `conventions`, `craft` |
| Consistency & polish | **7.6** (partial: no flow run; stability N/O) | **For:** designed states throughout: empty (13, 18, 30, 43), disabled commit buttons (19, 26, 41), inline errors, a busy field while searching, the "Now" Entry band (11), undo everywhere.<br>**Held back by the inventory mismatches:**<br>• commit placement (FLOW-07)<br>• default-name selection<br>• snackbar wording<br>• "Settings for X" vs "Subscription settings"<br>• Appearance as a page<br>• Library's + disappearing<br>**Also:** the mini player's bar has no pressed state (CTRL-05). Top bars never show the scrolled state, so half-cut lines peek under a flat bar (33–35, 04b, 25). The clipped rename label (04c). | `craft`, `conventions`, `stability` |
| Clarity | **8.0** | **For:** specific verbs ("Check and connect", "Find podcasts", "Play Next / Play Last", "Rewind"). The Rewind sheet lists exactly what goes back, comes back and is kept (15). Settings say what they inherit ("Default (1.0×)", 24). Errors are blame-free with a recovery step (strings.xml:19–22, 134–135).<br>**Against:**<br>• terminology drift (COPY-01)<br>• "Valid condition edits apply as made. Unfinished conditions are kept here." is engineering language (04)<br>• "Discard draft" labels an empty, untouched form (19, 26)<br>• Search shows "Save as a View" enabled on an empty query, and its results have no count (21, 22)<br>• a green check on an Unplayed Episode reads as "already played" (03)<br>• generic top-bar titles "Episode"/"Podcast" | `plain-language`, `feedback` |
| Platform fit | **6.9** (uncapped 8.6; capped by EDIT-02, EDIT-05) | Looks 8.5, Behaves 8.6 (table above). Native navigation, Back, insets, font scale, theme and TalkBack. Selection mode lacks Select all, and podcasts can't be shared. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **8.6** (partial: no flow run or timed runs) | **For:**<br>• Multi-step Undo and Redo with Ctrl+Z and specific labels; Undo brings the restored item into view.<br>• No confirmation dialogs for undoable actions; snackbars use the Long duration with Undo still in the top bar afterwards.<br>• Determinate OPML and download progress with Stop/Cancel; inline errors with Try again.<br>• Drag to reorder with edge autoscroll, haptics and a Move up/down equivalent.<br>• Predictive Back throughout; every draft survives process death.<br>**Held below Exemplary:**<br>• the mini player's silent tap target (CTRL-05)<br>• no system shortcut list (KEY-08, owner)<br>• each keystroke writes its draft to SQLite on the main thread (FormDraftState.kt:17–22), sharing a lock with sync, a typing-jank risk RESP-01 couldn't measure here<br>• multi-select can't select all (counted under Platform fit) | `forgiveness`, `feedback`, `keyboard-efficiency` |
| **Overall** | **7.9** | Cap: lowest (6.9) + 2.0 = 8.9, not binding. It serves its task well and is at home on Android in every behaviour that was checked: Back, insets, font scale, theme, TalkBack, undo and restoration. Two missing platform commands hold it down most: Select all and Share podcast. Behind them sit a layer of craft inconsistencies, mostly in the green check, form commit placement and copy. | — |

## What stands between this build and 9.0

1. **Clear the two majors (Platform fit 6.9 → about 8.6).**
   - Select all in the selection bar and in Select Subscriptions, with Ctrl+A.
   - Share podcast on the Podcast page, through the Sharesheet.
2. **Give the green check one meaning.** This lifts Hierarchy, Color, Iconography and Clarity at once.
   - Mark Played gets the outlined 24 dp glyph in the row's tint, filling only when the Episode is Played.
   - Green stays Subscribed (and finished Getting-started steps).
   - This also fixes the 8 dp label drop.
3. **Unify forms.**
   - One commit placement for New View, New Playlist and Add podcasts.
   - Select a pre-filled default name.
   - Give the View rename field the same 16 dp top inset as the Playlist one, so its label isn't clipped.
   - Say "Cancel" rather than "Discard draft" when nothing has been typed.
4. **Finish the frame.**
   - Add `TopAppBarDefaults.pinnedScrollBehavior()` so bars tint on scroll.
   - Make the mini-player bar `clickable` with a ripple.
   - Keep Library's + when it's empty.
   - Open Appearance as a sheet like every other option.
5. **Copy pass:**
   - Use one name for the Stream rule.
   - Title Subscription settings "Settings for <podcast>".
   - Name the object in every snackbar and use one string per event, with Starred and Played capitalised as CONTEXT.md does.
   - Rewrite the View-editor hint ("Changes save as you make them. Conditions you haven't finished stay here until you do.").
   - Show the result count on Search.
6. **Now Playing artwork:** fall back to the proxied or cached Artwork when the publisher fetch at full size fails, so the screen's only identity cue never becomes a placeholder.
7. **Run the flows.** A scripted flow run, measuring the core elements across the main tasks at 1× and 200% in light and dark, plus five timed runs of typing in Add podcasts, Search and Rename during a sync, would settle FLOW-01/02, RESP-01 and FOOT-02. Without it, Consistency and Interaction stay partial.

## Next step

- **Target:** EDIT-02 (major), in the lowest-scoring category (Platform fit), on the primary task's lists.
- **Anti-pattern:** a custom contextual bar that copies the bulk actions but drops the platform's selection commands.
- **Root cause:** selection mode was designed around the four bulk actions (Add, Mark Played, Star, Download) rather than around selection itself.
- **Change:**
  - Add a trailing "Select all" `ActionIcon` (24 dp `select_all`) to `SelectionToolbar`. It selects every row in the current list and then becomes "Clear selection".
  - Map Ctrl+A to it while selection is active.
  - Add the same to Select Subscriptions.
- **Principle:** `conventions`.
- **Expected effect:** EDIT-02 passes. Platform fit stays capped at 6.9 until EDIT-05 is fixed as well, and then rises to about 8.6. Nothing regresses: the bar keeps its count title and close icon, and the bottom action bar is unchanged.
