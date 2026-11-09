# PodList Android phone: UI grade, round 6

Graded at commit 17bc122 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, platform-fit.md § Android, Phone signals). Evidence: the capture of this build (light, dark, 200% text; every screen as a screenshot and an accessibility snapshot) and the code under `apps/android/app/src/main`. No device was driven. Screenshot references are capture numbers, such as `15-rewind-sheet`, and apply to all three appearances unless one is named.

## Frame

- **Task:** Find podcast Episodes through Views, and listen through Playlists with a player that's always there.
- **Target:** Android phone, compact window. Tablet and foldable are out of scope.
- **Posture:** Sovereign-transient mix: dipped into many times a day, with playback in the background.
- **Audience:** Perpetual intermediate; a newcomer on first run.
- **Nearest exemplar:** Things, for a calm personal list; Google Calendar for Android frame behaviour.
- **Character (keep):** PodList blue `#2b50c8` on Material tonal surfaces (owner); the mini player of Artwork and controls with no names (owner); Episode rows with wrapping titles and trailing Add then Play; capitalised domain nouns (Episode, Entry, Playlist, Subscription); the View editor as one list of value rows (owner).
- **Owner decisions, scored but not proposed for change:** native Material 3 with accent and dark theme; bottom navigation; Add podcasts as one field; View editor as one list; Rewind as a summary sheet; OPML in Settings; mini player paused after relaunch; no podcast or Episode names on Now Playing or the mini player; Delete Playlist with Undo and no question; Podcast page with compact header, pull-down description, Subscribe in the top bar and a green check; the check asks a plain "are you sure" and then offers Undo, staying on the page; keyboard shortcuts never listed on the phone.

## Flows

No flow was run: no device, no measurements file, no strip. Every F-only check is N/O, RESP-01 and FOOT-02 are N/O, and the stability sub-score is **N/O**, so no band limit applies to Consistency & polish, which is marked partial. Under CRITIQUE.md § Flow run, a stability finding without a measurements row or a before/after pair isn't scored, so hazards read from the code are listed below as unscored.

**Unscored hazard to confirm in a flow run (FLOW-03):** `NumberField` overwrites its text when `value` changes (`EditorComponents.kt:82`). In the View editor `value` is synchronous, so it's safe. In Subscription settings "Keep at most", `value` comes back through `model.edit`, the database and `readScreen` (`SubscriptionSettingsScreen.kt:48`), so a digit typed while the previous one is still echoing can be replaced by the older value. Fix: while the field has focus, ignore `value` changes, as `PlaylistSettingsScreen` already does by resetting only on Undo.

## Platform fit

Side-by-side with Google apps of the same kind: nothing breaks Android's behaviour. Material 3 is used faithfully, so the look is native but plain.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | Native (S, C) | Bottom bar with three equal destinations (`01`, `10`, `20`), top app bar with title and Up only on inner screens (`02`, `03`), no Up at root. Actions never mix with destinations. |
| L2 Visual language | Native (S, C) | Consistent M3 tonal scheme, list items, tabs, sheets, switches and snackbars; one line icon set. |
| L3 Density, text, frame | Native (S, C) | `ActionIcon` is 48 dp; M3's minimum interactive size gives text buttons 48 dp touch targets; choice and check rows have `heightIn(min = 48.dp)`; 12 sp floor in the type scale; edge to edge with controls clear of the gesture bar. No clipped text at 200% (`font200`), and rows reflow: actions drop below the title, values go under labels, tiles stack. Gaps: Search and Podcast page lists have no IME padding (`SearchScreen.kt:46`), so the last results sit under the keyboard until it's hidden. |
| B1 System navigation | Native (C; animation N/O) | `enableOnBackInvokedCallback`, `NavigableListDetailPaneScaffold` with `PopLatest`, `PredictiveBackHandler` on the player in the agreed order, `BackHandler` for selection, inspection, Welcome and Bring over, root Back to Views then exit. Back never touches playback. |
| B2 Preferences and access | Native (S, C; TalkBack N/O) | Labels, roles and states in the snapshots; sp-based type; follows system dark; honours `UiModeManager.contrast` (`MainActivity.kt:128`). |
| B3 System surfaces, lifecycle | Native (C; several N/O) | Sharesheet by `createChooser` (`PodListScreens.kt:501`), incoming feeds and OPML, a `downloads` channel, notification permission asked at first download with an explanation, app shortcuts, media session. Drafts and browsing context live in the database, so they survive process death. |

**Looks 8.3 · Behaves 8.4 · Platform fit uncapped 8.4** ((8.3 + 2 × 8.4) ÷ 3). Capped to 6.9 by DLG-01.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View, multi-select (`02`, `50`) | Snackbar above player, "Episodes marked Played" | Snackbar | none | Snackbar and top-bar icon | "No Episodes match this View" + text button | none | Add, Play trailing per row | none |
| Episode detail (`03`) | Snackbar | Inline status above Download | none | Snackbar and top-bar icon | Hint, "Not in any Playlist" | none | Filled "Play now", full width | none |
| View editor, New View (`04`, `05`) | Live count; snackbar has no Undo | Inline under field; in sheet; retained-draft hint | none | Pinned bar, bottom-right | none | none | "Done" in pinned bottom bar, trailing | Hint when draft is unfinished |
| New Playlist (`19`) | Snackbar after creation | Inline under field | none | Snackbar | none | none | Filled button under field, leading, with "Discard draft" below | none |
| Add podcasts (`26`, `59`) | Row label "Subscribed", snackbar | Inline under the button, or under the row | none | Snackbar | none | Progress bar | Filled button under field, leading | Field label |
| Podcast page (`23`, `60`–`63`) | Snackbar, check appears | Load failure inline; action failure **both inline in the header and as a snackbar** | Alert for Unsubscribe | Snackbar and top-bar icon | Text + "Refresh podcast" | Linear progress under bar | Top bar trailing | Pull-down, button |
| Search (`21`, `22`) | none | none | Name dialog for Save as a View | none | "No Episodes match" + **text button at the screen edge** | Spinner | Text button "Save as a View" | Field label |
| Playlist, Timeline (`11`–`15`) | Snackbar | Snackbar | Rewind summary sheet | Snackbar and top-bar icon | Text + "Show Entries" | none | Play per row | none |
| Settings, sheets (`06`, `06b`, `07`) | Snackbar in sheet | Inline OPML error + retry | none | Snackbar | none | Determinate OPML progress | "Done" top-right of each sheet | One hint line |
| First run (`40`–`43`) | none | Inline on Connect | none | none | Library: tonal button with + | none | Filled button, full width | Getting started card |

**Mismatches:**
1. **Sheet action placement varies.** EditorSheet: Done top-right (`06b`). Rewind: Cancel and Rewind bottom-right (`15`). Add to a Playlist: Play next and Play last bottom-centred (`09`). Counted in FLOW-07.
2. **Create forms differ.** New View: Done in a pinned bar, trailing (`05`). New Playlist: filled button under the field, leading, then Discard draft (`19`). Counted in FLOW-07.
3. **Empty-state recovery has two styles.** Tonal button with + on an empty Library (`43`), a plain text button on empty Views, Playlists, History and Search (`13`). A View with no Subscriptions gets a tonal button with no icon.
4. **Failures are reported twice on one screen only.** On the Podcast page, a failed Subscribe or Bring-in writes inline and sends a snackbar (`PodcastPageScreen.kt:109`, `:128`, `:230`). Add podcasts writes inline only.
5. **Search fields differ.** Search the Library has a clear button (`22`); Search Episodes does not (`61`); Add podcasts does not (`59`).
6. **Artwork placement on detail pages differs.** Centred 112 dp on Episode detail (`03`), left-aligned 120 dp on the Podcast page (`62`), left-aligned 224 dp on an unsubscribed Episode (`PodcastPageScreen.kt:142`).

## Checklist

**Coverage: 85% (pass 59 · fail 3 · N/O 11 · N/A 6, of 79 items).**

### Failures, by severity

**[DLG-01] major (owner decision), Platform fit cap 6.9.** Where: Unsubscribe from the green check (`28-unsubscribe`, `PodcastPageScreen.kt:249`). Evidence: an AlertDialog guards an action that the snackbar then offers to undo; `product-behaviour.md` § Unsubscribe confirms the data is kept and restored. DLG-01 reserves alerts for essential conditions or uncommon irreversible loss, and principles tension 5 says to make the action reversible and drop the dialog. Delete Playlist, with more to lose, asks nothing. The owner has decided this, so under CRITIQUE step 4 it isn't a target and the cap stands. Fix, for the record only and not proposed: remove the AlertDialog and rely on the Undo the snackbar already offers.

**[APPEAR-04] minor (isolated).** Where: Listening stats chart, unselected bars in light (`ListeningStatsScreen.kt:77`). Evidence: primary at 55% alpha on `#faf8ff` computes to 2.54:1, under 3:1; dark is 4.08:1. The capture has one bar, the selected one, so this is computed from code, not measured on a screenshot. The Show table view and the day buttons are equivalents, which keeps it minor. Fix: use `primary` at about 70% alpha (3.8:1 in light), or `onSurfaceVariant` for unselected bars with `primary` for the selected one.

**[FLOW-07] minor.** Where: `05` against `19`; `06b` against `09` and `15`. Evidence: mismatches 1 and 2 above. Fix: put every modal sheet's commit in one place (for instance Done or the verb at the sheet's top-right, or all at bottom-right), and give New Playlist the same pinned bar as New View, or give both a button under the name.

### N/O

FLOW-01, FLOW-02, FLOW-03, KEY-01, KEY-04, KEY-07, LIST-07, APPEAR-11, WIN-03, RESP-01, FOOT-02.

### N/A

KEY-08 (no shortcut reference by design on the phone; only standard Ctrl+Z and Ctrl+Shift+Z exist), LIST-01 (no columns, Android clause), TOOL-06, SIDE-03, SIDE-04 (no hideable toolbars or panes on a phone), START-07 (no accounts).

### Notable passes

- **DATA-01, DATA-06:** View, Playlist, Add-to-Playlist and Search-name drafts go to the database as typed; navigation, scroll and tabs restore through `BrowsingContext`.
- **DATA-04, DATA-05:** Undo and Redo across screens, Ctrl+Z, and `revealChanges` brings restored items into view.
- **DRAG-01, -03, -05, -06:** drag handle with autoscroll, shadow, insertion line and a retained highlight; Move up and Move down in the menu and as TalkBack actions; undoable.
- **AX-01, AX-04:** names, roles and states in every snapshot; Show podcast details as the alternative to pull-down; chart has day buttons and a table.
- **START-02, -04, -05:** Getting started is hideable and stays in Settings; notification permission asked in context with a reason.
- **TYPE-05:** nothing clipped at 200%. The chart axis is a craft gap, below.
- **COPY-02, COPY-03:** field-level errors with recovery; every empty state states a next step.
- **TYPE-08:** curly quotes, real ellipses, en dashes and a true minus in `strings.xml`.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.0** | Small system-font scale: 20 sp Medium screen titles, 17 sp Medium Episode titles, 14 sp section labels, 12 sp metadata, titles wrap to 3 lines. Below Exemplary: row titles carry two styles for one role (16 sp Regular on Views, Playlists and Library against 17 sp Medium on Episodes and the Timeline); 12 sp also carries real reading text (Rewind's "Kept" paragraph, `15`; About your stats, `34`; Getting started steps, `42`). | `hierarchy`, `craft` |
| Hierarchy | **7.9** | One filled action per screen, content leading, quiet chrome. Below Exemplary: Episode detail splits actions into a filled button, four bare icons and a captioned text button (`03`); the Podcast page sets its name twice within 64 dp (`23`, `60`). | `content-first`, `hierarchy` |
| Spacing & density | **7.6** | 16 dp gutter and steady row rhythm; density suits a list app; 200% reflow is deliberate. Held back by the 54 text buttons with `contentPadding = PaddingValues.Zero`, which leave short labels about 12 dp inside the margin while long ones reach it, and put Cancel 6 dp from Rewind (about 2 dp at 200%, `font200/15`); mini-player Artwork at 12 dp against the 16 dp gutter; stats axis packing. | `craft`, `hierarchy` |
| Color & contrast | **8.3** | Restrained tonal roles, dark surfaces toned independently, a single green reserved for Subscribed, red only for destructive and error text. Text measures well (primary on background 6.46:1, on the Cursor row 5.26:1). Honours Android's contrast setting. One minor chart failure; the accent serves every text button, so colour rarely tells you anything beyond "tappable". | `color-restraint` |
| Iconography | **7.6** | One line family, standard meanings, tooltips on every icon button, custom 15 and 30 skip glyphs that read well. Held back by near-twin Views and Playlists destination glyphs (`01`); four icons with no words on Episode detail (`03`); one ✓ for Mark Played, Subscribed and step complete; the Rewind glyph repeated on every Timeline row without a label (`14`). | `conventions`, `craft` |
| Consistency & polish | **7.6** (stability N/O; partial: no flow run) | Empty, loading, offline, error, disabled, draft and 200% states are all designed; dark is complete. Six inventory mismatches, plus a Clear Search button with no 16 dp inset (`SearchScreen.kt:51`) keep it Strong. | `craft`, `conventions` |
| Clarity | **7.5** | Plain sentences and a consistent domain vocabulary; "· Changed" and "Default (30 seconds)" are exact. Held back by icon-only actions; a Timeline row that starts a Rewind with only a glyph to say so (`14`); bare "1.0×" beside a labelled Sleep (`08`); "Starred / Starred" (`01`); the mini player identifying the Episode by Artwork alone (owner). | `plain-language`, `discoverable-commands` |
| Platform fit | **6.9** (uncapped 8.4) | Native signals throughout. Capped by DLG-01 alone. | `conventions` |
| Interaction & feedback | **8.3** (partial: no timed runs) | Undo everywhere with a persistent top-bar route, so nothing depends on a snackbar's timer; drafts; determinate progress with cancel; non-gesture alternatives. Below Exemplary: the top-bar Undo doesn't say what it will undo and appears on screens unrelated to the edit (`63`, `SubscriptionRefreshStatus.kt:27`); selection only starts by long press; live gesture and speed are unmeasured. | `forgiveness`, `feedback` |
| **Overall** | **7.8** | Serves the task, feels at home on Android, and is unusually careful about state and recovery. Weakness holding it down most: a plain finish, where icon-only controls and small spacing inconsistencies remain. The cap allows at most 8.9 (6.9 + 2.0). | |

### What stands between this and 9.0

**The arithmetic first.** While DLG-01 stands, Platform fit stays at 6.9 and Overall cannot exceed 8.9. That's the owner's call and isn't proposed for change, but 9.0 isn't reachable under the guide's rules without it, whatever else is done.

**Craft gaps, in order of effect:**

1. **Remove the zero-padding override from text buttons.** 54 buttons set `PaddingValues.Zero`, presumably to align text to the margin. It only works for long labels: "Done", "Play" and "Hide" sit about 12 dp short of the edge (`06b`, `03`, `42`), and Cancel nearly touches Rewind (`15`). Use M3's default padding, and align by offsetting the button by -12 dp at the row's edge; add `Arrangement.spacedBy(8.dp)` to button rows.
2. **Say what the Episode detail actions are.** Replace the four bare icons with four equal icon-over-label buttons (Add, Played, Star, Share), and fold Download into the same row with its state as the label.
3. **Make Rewind discoverable on the Timeline.** Replace the trailing glyph with a text button "Rewind", or add a one-line hint above the list. Today only TalkBack hears "Rewind to here".
4. **Fix the 200% chart axis.** At 200% the three tick labels wrap to five lines and fill the 144 dp column, so "0 minutes" no longer marks the baseline (`font200/33`). A larger maximum such as "2 hours 30 minutes" would run past it into the date row. Use short ticks ("2 m") or drop the middle tick when `fontScale >= 1.5`, and remove the "Daily listening · 0 to 2 minutes" line, which repeats the top tick right above it.
5. **One row-title style.** Set Views, Playlists and Library names in the same role as Episode titles, or state a difference on purpose.
6. **Settle sheets and create forms** on one commit location (FLOW-07).
7. **Stop repeating the podcast name.** Show the name in the top bar only after the header scrolls away, so the first screenful carries it once (`23`, `60`), while keeping the owner's compact header.
8. **Give reading text a size up.** Rewind's "Kept" paragraph, About your stats and the Getting started steps should use 14 sp (`bodyMedium`), keeping 12 sp for metadata.
9. **Make the top-bar Undo specific.** Label it with the step ("Undo Star") in its tooltip and accessible name.
10. **Small finishes.** Add a clear button to Search Episodes; inset Clear Search by 16 dp; mini-player Artwork at 16 dp; fix the empty-state button style; change the 2.54:1 chart bars; give the first-run screen a mark and vertical balance rather than a top-aligned title (`40`).

## Next step

- **Target:** Skipping the owner's DLG-01, the lowest-scoring category is Clarity (7.5), on the primary task's Episode detail.
- **Anti-pattern:** Mystery-meat navigation, mild form: familiar glyphs but no words at the point of decision.
- **Root cause:** Actions on Episode detail and the Timeline rely on glyph recognition; words exist only in tooltips and TalkBack.
- **Change:** On Episode detail, replace the four 48 dp icons with four equal-width icon-over-label buttons (Add, Played, Star, Share; 12 sp labels). Character is kept: same icons, same Material treatment.
- **Principle:** `plain-language`, `discoverable-commands`.
- **Expected effect:** Clarity and Iconography up, Hierarchy up as Episode detail gets one action row; Spacing unchanged. Regression risk: a taller header at 200%, so allow the row to wrap.
