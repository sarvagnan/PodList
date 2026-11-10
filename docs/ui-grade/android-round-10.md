# PodList Android phone: UI grade, round 10

Graded build: `main` at 3d26159 (the capture in `android-grade-10/`, light, dark and 200% text, plus the code under `apps/android/app/src/main`). Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android › Phone, rubric.md). Tablet and foldable are out of scope. This grade was made without reading earlier rounds.

Units: the capture is 1344 × 2992 px at density 480 (3 px per dp), a compact 448 dp window. Measurements below are in dp.

## Frame

- **Task:** find Episodes through Views (and Search), and listen to them through Playlists, on a phone with or without a server.
- **Target:** Android phone, compact window (Pixel 10 Pro XL profile, Android 16).
- **Posture:** sovereign for a personal media habit: opened many times a day, used in short sessions, with a persistent player.
- **Audience:** perpetual intermediate; a newcomer on first run.
- **Nearest exemplar:** Things (a calm personal list tool where plain words carry the model). A reference for decisions and craft, not a look.
- **Character:** (1) native Material 3 with accent #2b50c8 and a dark theme (owner); (2) capitalized domain vocabulary (Views, Playlists, Entries, Episodes, Subscriptions) inside plain sentences; (3) square letter-tile artwork; (4) a compact player that shows no podcast or Episode names (owner); (5) Undo instead of confirmation for deletes and Unsubscribe (owner).
- **Owner decisions (graded, not targeted):** bottom navigation with Views, Playlists, Library; Add podcasts as one field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; paused mini player after relaunch; no names in Now Playing or the mini player; Delete Playlist without a question, with "Playlist <name> moved to Trash" and Undo; compact Podcast page header with description behind a pull-down, Subscribe in the top bar, green check once subscribed; two-tap Unsubscribe with Undo, staying on the page; explicit Rename with Cancel and Save; unique names ignoring case; no shortcut listing on the phone.

## Flows

Tasks run: none. The brief rules out driving a device, so there is no flow script, measurements file, screenshot strip or timed run. Every check whose only channel is F is N/O, and the stability sub-score is N/O. Where a check also allows S or C, it was judged from the capture and the code.

Failures: none recorded (no flow evidence).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views root (01, 42) | Snackbar above mini player | Top-bar strip "Offline · Showing local data…" + Retry (code) | none | Snackbar Undo; Undo/Redo icons in top bar after the snackbar | "No Views yet" + tonal New View (code) | Loading spinner + "Loading" | Top-bar + | Getting started card, Hide |
| View (02) | Snackbar | Sync strip | none | Snackbar + top-bar Undo | "No Episodes match this View" + tonal Edit conditions | none | Row play / add icons | Summary line under count |
| View editor / New View (04, 05) | Snackbar "View changed/created" | Range errors inline under the conditions, red; name error as field supporting text | none | Snackbar + top-bar Undo | n/a | none | Sticky bottom bar, trailing filled Done / Create View | Permanent hint "draft is kept" at list end |
| Episode detail (03) | Snackbar ("Episode starred" etc.) | n/a | none | Snackbar | "Not in a Playlist" hint (code) | none | Full-width filled Play Now | none |
| Playlist (11–14) | Snackbar | n/a | none | Snackbar | History: sentence + tonal Show Entries | none | Row play | Timeline: one-line hint above rows |
| Rewind sheet (15) | Snackbar "Playlist rewound" | n/a | Sheet: summary, Cancel + filled Rewind, trailing | Snackbar Undo | "None" under each heading | none | Trailing filled Rewind | "Kept" paragraph |
| Playlist settings (16, 16b, 16c) | Snackbar "Playlist <name> moved to Trash" | Rename: field supporting text | none (owner) | Snackbar | n/a | none | Rename text button; Save trailing filled under field | Switch help text |
| New Playlist (19) | Opens the new Playlist | **"A Playlist needs a name." in red before any typing** | none | Top-bar Undo (delete created Playlist) | n/a | none | Trailing filled Create Playlist under field | none |
| Trash (18) | Snackbar on Restore | n/a | none | Snackbar | Sentence + hint + tonal Back to Playlists | none | Row Restore text button | Retention hint |
| Library (20, 43) | Snackbar | Per-row "Couldn't refresh…" + Retry (code) | none | Snackbar | "No Subscriptions yet" + tonal Add podcasts | none | Top-bar + **and** a list row "Add podcasts" | Row subtitles |
| Search (21, 22) | Opens the saved View | Name error as supporting text | none | Snackbar | Sentence + tonal Clear search | none | "Save as a View" text button | none |
| Add podcasts (26, 59) | Row shows check + "Subscribed"; snackbar with Undo | **Lookup error below the commit row** | none | Snackbar Undo | Bare field + disabled button | Linear progress under the row | Trailing filled Find podcasts under field | Field label only |
| Podcast page (23, 28, 60–63) | Snackbar "Subscribed · Undo" | Header: red text + Try again | Two-tap Unsubscribe in the top bar | Snackbar | Sentence + tonal Refresh / Clear search | Linear progress + live text | Top-bar Subscribe / check | none |
| Subscription settings (24) | Snackbar "… changed" | n/a | none | Snackbar | n/a | none | Rows open sheets; Mark all Played text button | Row help, section hint |
| Settings (06, 07, 32) | Snackbar "… changed" | OPML error inline + Retry | none | Snackbar | n/a | OPML determinate progress + Stop | Rows | Section hint |
| Listening stats (30, 33) | n/a | n/a | none | n/a | Sentence + tonal Find something to play | none | Show table text button | About your stats paragraph |
| Connect to a server (41) | Moves on | **Server error between field and buttons, separate text** | none | n/a | n/a | Linear progress | Trailing filled Check and connect under field | Paragraph above, scope note below |
| Now Playing (08) | Snackbar | Inline red + Retry (code) | none | Snackbar | n/a | "Buffering" text | Centre filled Play | none |

**Mismatches**
1. *Error before input.* New Playlist (19) and the "New Playlist" choice in Add to a Playlist (code, `PlaylistAddSheet`) show "A Playlist needs a name." in error red on an untouched empty field. New View (05) prefills "New View" and shows nothing; Save as a View prefills the query.
2. *Where "this input can't be used" appears.* Name problems are the field's supporting text (16b, 19); Add podcasts puts lookup errors below the commit row (`AddPodcastsScreen.kt`); Connect to a server puts its error as a separate paragraph between field and buttons (`ServerScreen.kt`).
3. *Episode action order.* Episode detail: Add to a Playlist · Star · Mark Played · Download (03). Selection bar: Add to a Playlist · Mark Played · Star · Download (50).
4. *Name field label.* "Playlist name" (19, Add sheet) vs "Name" (04c, 05, 16b).
5. *Names inside messages.* "Playlist %1$s moved to Trash" leaves the name bare; "There's already a Playlist called “%1$s”" quotes it (strings.xml).
6. *"Done" check colour.* Subscribed is a green check (23); a finished Getting started step is a blue check (42); Mark Played is a check glyph in primary (03).
7. *Secondary player buttons.* In one block on Now Playing, "1.0×" and "Sleep" are onSurfaceVariant while "Episode" and "Entries · 2 next" are primary (08).

## Checklist

Coverage: **86.7%** (pass 65 · fail 0 · N/O 10 · N/A 4; 75 applicable of 79)

Failures by severity: **none** among verified items.

Pass, with the evidence that settled it:
- **FLOW-03** (C): drafts own every field until Save, Cancel or Undo (`NameEditor.kt`, `NumberField`, `FormDraftStore`); Add podcasts locks the field while a lookup runs. **FLOW-04** (S): the Undo snackbar sits above the mini player and clear of the nav bar (63); sheets host their own snackbar (`FeedbackSheet`). **FLOW-05** (S): stats tiles share tops and heights (33, `IntrinsicSize.Min`). **FLOW-06** (S, C): Library group headings appear only with rows; Rewind headings carry "None". **FLOW-07** (S, C): single-field forms commit trailing under the field (19, 26, 41, 16b); the multi-field View editor pins its commit (04), by a rule stated in `EditorComponents.kt`.
- **KEY-04** (S, C): new input tasks focus the field (05, 19, 21, 41); closing Rename returns focus to Rename. **KEY-06** (C): only Ctrl+Z and Ctrl+Shift+Z.
- **DLG-01–05, 07, 09:** the only dialog is the notification pre-prompt at first download, with Continue and Not now; deletes and Unsubscribe use Undo; destructive text is error red (16c, 28); sheets close with Back or a drag; menus open from their control (12, 27a).
- **CTRL-02–08:** labelled outlined fields throughout; locale number and date formats; field-specific errors with live regions; scoped search labels ("Search the Library", "Search Episodes"); OPML import with determinate progress, Stop and Resume.
- **LIST-01–06:** lists, not tables; sort in the editor; podcast details' expanded state persisted (`PodcastBrowsing`); selected tab and nav item marked; radios mark chosen values.
- **DATA-01, 04, 05, 06** (C): persisted drafts; a multi-step undo history with Undo/Redo icons and Ctrl+Z; undo reveals and highlights restored content (`revealChanges`); destination, stacks and scroll positions restored from the database (`BrowsingState`).
- **DRAG-01, 03, 05, 06** (C): Entry drag with Move up/Move down in the menu and as accessibility actions; moves are undoable; insertion line, lifted shadow, edge autoscroll, and the dropped row highlighted for 1.8 s.
- **PTR-04** (C): every icon button has a tooltip (`ActionIcon`).
- **APPEAR-03, 04, 09, 10** (C, S): light, dark and the system contrast level (`UiModeManager.contrast` lerps primary, outline and secondary text). Measured: secondary text 8.86:1 light and 10.89:1 dark; primary 6.46:1 and 10.93:1; error 6.13:1; field outline 4.25:1; subscribed check 6.57:1 and 7.82:1; snackbar Undo 7.71:1 and 5.27:1.
- **TYPE-02, 03, 05, 06, 07, 08** (S, C): Regular and Medium weights only, 12 sp minimum; at 200% the rows reflow, values drop under labels, the action grid becomes two columns and tiles stack (font200 04, 03b, 33); curly quotes, real minus and no "...".
- **COPY-01–04:** specific verbs; errors with a recovery next to their cause; every empty state has a next step; capitalization follows one rule (glossary terms capitalized), see the craft notes.
- **AX-01, 02, 04, 05** (S, C): named controls in the snapshots; status carried by text and shape as well as colour; non-gesture routes for drag, long-press select, pull-down and the chart; Unsubscribe's timeout extended by `getRecommendedTimeoutMillis`; nothing autoplays.
- **START-01–06:** local-first launch; Getting started can be hidden, stays hidden and is back under Settings › Help; the notification permission is asked at first download with a reason; no account.
- **EDIT-02, 05:** native fields; selectable show notes and description; Share Episode through the Sharesheet.
- **WIN-03** (C, S): adaptive scaffold, 200% text without clipping, Now Playing falls back to scrolling. **TOOL-06:** the hidden Getting started card returns from Settings. **SET-01:** global, per-Subscription and per-Playlist settings each sit with their scope.

N/O: FLOW-01, FLOW-02, KEY-01, KEY-07, LIST-07, PTR-03, APPEAR-05, APPEAR-11, RESP-01, FOOT-02

N/A: KEY-08 (no custom or bare-key shortcuts beyond the platform's Ctrl+Z, and the owner lists none on the phone), START-07 (no accounts), SIDE-03 and SIDE-04 (no side-by-side panes on a phone)

## Platform fit (Android › Phone)

Side-by-side with Gmail, Keep and Settings: nothing reads as imported from iOS or the web. Two things a Google app would do differently: an expanded Now Playing still shows the navigation bar below it (a stated choice in `PlayerPresentation.kt`), and contextual bars stack on the persistent mini player and navigation bar instead of replacing them.

| # | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Native (S)** | Bottom bar with three equal destinations; top app bars with title, Up on inner screens only, actions trailing (01, 02, 20). |
| L2 Visual language | **Native (S)** | Consistent M3: tonal and filled buttons, tabs, sheets with drag handles, menus from their source, snackbars (09, 11, 12, 63). |
| L3 Density, text, frame | **Native (S, C)** | 48 dp targets enforced in code; sp text; edge-to-edge with inset handling (`enableEdgeToEdge`, `safeDrawing`); 200% text reflows without clipping. |
| B1 System navigation | **Native (C)** | `enableOnBackInvokedCallback`; `NavigableListDetailPaneScaffold` and `PredictiveBackHandler`; Back clears selection, closes sheets, disarms Unsubscribe, then pops; a non-Views root goes to Views. The animation itself is N/O. |
| B2 Preferences and access | **Native (S, C)** | System default, Light and Dark; the system contrast level; TalkBack names and live regions; text scales. |
| B3 System surfaces and lifecycle | **Native (C)** | Sharesheet via `createChooser`; a "downloads" notification channel; permission asked in context; drafts and browsing restored after process death; launcher shortcuts; media session and Android Auto. No widget, which is optional. |

**Looks 8.6 · Behaves 8.9 · Platform fit 8.8.** Behaves rests on code; process death, rotation and predictive Back weren't observed running.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.4** | A small M3 scale used by role: titleMedium 17 sp for row titles, bodySmall 12 sp for metadata, titleSmall onSurfaceVariant for section headings, curly punctuation throughout. Kept below Exemplary by screens with too many styles: Listening stats uses seven (tile labelMedium, tile titleLarge, headings titleSmall, streak bodyLarge, chart title labelMedium in onSurface, ticks labelSmall, about bodyMedium; 33). Timeline rows mix a bodySmall date with a bodyMedium event line, so their rhythm differs from Episode rows (14 vs 02). "3 Episodes" (titleSmall, onSurface) and "Show notes" (titleSmall, onSurfaceVariant) are the same role in two colours (02, 03). | hierarchy, craft |
| Hierarchy | **8.2** | A clear primary on each screen: full-width Play Now (03), the 112 × 88 dp Play (08), Subscribe in the top bar (60), quiet list roots (01, 10). Held down by bottom chrome: on the View editor and in selection, a contextual bar, the 72 dp mini player and the 80 dp nav bar take about 232 dp of 997 dp (23%; 04, 50), and at 200% only about five condition rows remain (font200 04). Library repeats Add podcasts as a top-bar + and a list row, beside a one-item overflow menu (20, 27a). | content-first, simplicity-not-minimalism |
| Spacing & density | **7.9** | A steady 16 dp gutter and 56 dp rows; text buttons offset 12 dp so their labels sit on the gutter (`ContentTextButton`). Rhythm slips in places: on the Podcast page the count sits 12 dp under the search field while the field is about 37 dp under "Show podcast details" (23); the Subscribe pill ends 12 dp from the edge against a 16 dp gutter (60); trailing values are top-aligned on three-line rows but centred on two-line rows (24, "Counts as Played" vs "Download Rule"); the chart title sits on the "2" tick, and "1 minute" floats mid-row beside a top-aligned name (33). Plus the stacked bottom chrome above. | craft, hierarchy |
| Color & contrast | **8.8** | Tokenized M3 palette in both themes, with the system contrast level honoured. Every measured text pair passes with room (8.86–10.93:1). The accent is reserved for interaction, red for destructive and errors, green for subscribed. Short of Exemplary: the check means "done" in three colours (green subscribed, blue Getting started step, primary Mark Played), and two colours of text button share the player's secondary block (08). | color-restraint, accessibility |
| Iconography | **8.5** | One drawable family at one weight; standard glyphs (download, share, undo, settings, close); every icon button has a label and a tooltip; labelled action grids on Episode and selection (03, 50). Gaps: the no-artwork placeholder glyph is hard to read as "podcast" (59, 62); the playlist glyph means both the Playlists destination and "open the active Playlist" in the mini player (01). | conventions, craft |
| Consistency & polish | **8.1** (stability N/O) *(partial: no flow run)* | Empty, loading, error, busy, disabled and armed states are all designed, and drafts survive everything. The seven inventory mismatches above (an error before input, three error placements, action order, field label, name quoting, check colours, player button colours) and the Unsubscribe armed state, which drops the "Podcast" title and the gear (28), keep it out of Exemplary. | craft, stability |
| Clarity | **8.3** | Plain, specific copy ("It goes to Trash with its History and Listening Timeline, and can be restored for 30 days"), a Rewind sheet that says exactly what changes (15), scoped search labels. Gaps: the Library section heading "Streamed only" is a Download Rule term shown to newcomers above every Subscription (20); "Turning it on keeps Entries that are already Played" needs a second read (16); "Listened 12:34 · until Nov 6 · 2:30 PM" (14); the Timeline hint tells you to look for the Rewind symbol when every row has one (14). | plain-language, feedback |
| Platform fit | **8.8** | Looks 8.6, Behaves 8.9 (above). | conventions, stability |
| Interaction & feedback | **8.7** *(partial: no flow run)* | Forgiving throughout: Undo on every edit (snackbar, top-bar Undo/Redo, Ctrl+Z), reveal-on-undo, persisted drafts, two-tap Unsubscribe with an accessible timeout, determinate and cancellable OPML import, live-region errors. Response times, keyboard-only use and motion settings are unverified (RESP-01, KEY-01, APPEAR-05 N/O), so it can't be scored Exemplary on this evidence. | forgiveness, feedback |
| **Overall** | **8.4** | It serves the task and is at home on Android, with no checklist failure among verified items. Spacing & density (7.9) holds it down the most, through stacked bottom chrome and local rhythm slips; then Consistency's inventory mismatches; then the missing flow evidence, which leaves the stability sub-score and response checks unproven. Cap: lowest category + 2.0 = 9.9, not binding. | |

### What stands between this build and 9.0

1. **Bottom chrome (Spacing, Hierarchy).** Contextual bars stack on the mini player and nav bar (04, 50, font200 04). Making each contextual mode replace that chrome is worth an estimated +0.3 Spacing and +0.2 Hierarchy.
2. **Inventory mismatches (Consistency).** Show the empty-name error only after a submit attempt or a cleared field; give all "input not usable" errors one place (the field's supporting text, or directly under the field); use one Episode action order; one "Name" label; quote names the same way in every message.
3. **Local rhythm (Spacing, Typography).** On the Podcast page header, use one gap between title block, link, field and count; align the Subscribe pill to the 16 dp gutter; vertically centre all trailing values in settings rows; give the chart title 8 dp above the ticks; align "1 minute" to the name's baseline; cut Listening stats to four text styles.
4. **Flow evidence (Consistency, Interaction).** Add a UI-test flow (Compose test or UI Automator) for Subscribe → Undo, Add to a Playlist → Undo and the View editor. It should record core-element boxes, focus and timings, so FLOW-01/02 and RESP-01 can be verified and the stability sub-score scored.
5. **Clarity copy.** Rename "Streamed only" to "Streamed (no downloads)", or drop the grouping heading when every Subscription shares one rule; rewrite the Clear on Played help as two sentences, say what happens on and off; make the Timeline line "Listened 0:00–12:34"; show the Timeline hint only for rows that can Rewind.
6. **Armed Unsubscribe keeps the title** (28). Keep "Podcast" visible and let the Unsubscribe button grow into the space the gear leaves.
7. **TalkBack check on the mini player.** Its snapshot node strings "Forward 30 seconds, Play, Back 15 seconds" in reverse order inside the open-player label (01). Verify live that each control is its own focus stop and that the row's label is only "Open Now Playing: …".

## Next step

- **Target:** Spacing & density (7.9), the lowest category; no blocker or major failure ranks above it.
- **Anti-pattern:** stacked chrome (persistent bars accumulating at the bottom edge).
- **Root cause:** contextual bars (the editor's match bar, the selection action bar) are added above the persistent mini player and navigation bar instead of replacing them, so a third of the work area goes to chrome exactly when the person is working.
- **Change:** while a selection or an editor commit bar is showing, hide the navigation bar and collapse the mini player (M3's contextual bottom-bar pattern), restoring both when the mode ends. Alternatively, move "3 Episodes match · Done" into the editor's top app bar as the title's subtitle and a trailing Done.
- **Principle:** content-first.
- **Expected effect:** about 150 dp more list on the View editor and in selection; at 200%, about three more condition rows. Spacing +0.3, Hierarchy +0.2. Platform fit unchanged or better; no signature element touched (the owner's bottom navigation stays everywhere outside a contextual mode).
