# PodList Android phone: UI grade, round 18

Graded 2026-11-11 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, core-checklist.md, rubric.md, platform-fit.md § Android → Phone). Build: `main` at `e5a86cf`. This is an independent read: it uses no earlier grading round.

Evidence:
- **Capture**: `scratchpad/android-grade-18/` holds every screen as a screenshot and an accessibility snapshot in `light/`, `dark/` and `font200/`. It was taken on an emulator with the Pixel 10 Pro XL profile running Android 16, at 1344 × 2992 px and density 3.0, so the window is about 448 dp wide (compact).
- **Flow run**: `scratchpad/flow-run/20261111-105345-896/`, with `summary.md`, `measurements.csv`, `timings.csv`, `frames.csv` and a 342-image strip.
- **Code**: `apps/android/app/src/main`, covering the manifest, `MainActivity`, the shell, every screen file and `strings.xml`.

No device or emulator was driven for this grade. Measurements are in dp: px ÷ 3.0.

## Frame

- **Task:** find Episodes through Views or Search, and listen through Playlists: Play Now, Play Next or Play Last, then control playback from the mini player and Now Playing.
- **Target:** Android phone, compact window. Tablet and foldable are out of scope.
- **Posture:** sovereign personal tool used in short, frequent sessions, often one-handed.
- **Audience:** perpetual intermediate. A podcast listener who adopts PodList's own vocabulary (View, Playlist, Entry).
- **Nearest exemplar:** Things, for calm lists, plain domain words and Undo instead of confirmation. The Android gallery's nearest peers are Niagara (8.2) and BuzzKill (7.2).
- **Character** (all owner-fixed):
  1. Material 3 with PodList blue `#2b50c8`, and a dark theme toned on its own.
  2. Three-destination bottom bar: Views · Playlists · Library.
  3. A control-first mini player and Now Playing that show no names.
  4. A green-check Subscribed control that unsubscribes in two taps.
  5. Capitalised domain nouns (Episode, Entry, Playlist, View) used as product language.
- **Owner decisions:** all of those in the brief are graded as given and never made the target. They are: one Add podcasts field; the View editor as one list; Rewind as a summary sheet; OPML in Settings; a paused mini player after relaunch; no names in the players; Delete Playlist without a question, with the message “Playlist <name> moved to Trash” and Undo; the compact Podcast page with Subscribe in the bar, the green check and two-tap Unsubscribe; explicit Rename with Cancel and Save; unique names; and shortcuts listed only in the system panel.

## Flows

The flows came from the app's instrumented flow run:
- **Tasks**: five. A: Views → Episode → Add to a Playlist → Undo. B: Playlist play → Now Playing → reorder → Undo. C: Add podcasts → Podcast page → Subscribe while typing → Undo. D: New Playlist → Rename → Undo. E: Search → Create View.
- **Width**: compact phone only, which is the whole of this target.
- **Appearances**: Light and Dark.
- **Passes**: one delayed pass, with 2,000 ms added to every HTTP completion, and five undelayed timed passes per appearance.
- **Device**: debug build on an emulator on a Mac host, without throttling. The script is in `apps/android/app/src/androidTest`.

**How far I trusted the run's method:**
- I trusted FLOW-02 to FLOW-04. The run keeps every raw candidate, gives each exclusion a reason, and its FLOW-03 probe is real: “Long E” was typed while Subscribe was pending and was still there 2.6–2.9 s later (rows 99 → 100, Light and Dark).
- It reports FLOW-01 as N/O with 4 unresolved candidates. Its rows settle them:
  - In each case, the Subscribe button became the 48 dp check, or the check became the Subscribe button.
  - The new geometry is already present in the first capture after the tap. That is row 92 (input age 104 ms) and row 106 (100 ms) in Light, and rows 273 (99 ms) and 287 (86 ms) in Dark, each marked `person_caused=true`.
  - The code agrees. `changeSubscription` writes the pending transition synchronously, before any network call (`PodcastPageScreen.kt:209`).
  - So these are moves the person caused, and **FLOW-01 passes**.
- RESP-01 and FOOT-02 stay N/O, as the run says, because these timings come from a debug build on an emulator.
  - One risk needs a release-build check: during the 500-row fling, frames took a median of 102 ms (Light) and 61 ms (Dark), and every frame missed its deadline (`frames.csv`).

**Failures:** none.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views, a View | Snackbar above the mini player, past-tense verb with quoted names (“Created View “Night skies””) | Sync row under the top bar: “Sync error · Showing local data.” with Retry | none | Snackbar Undo; a 48 dp Undo slot in the top bar | Body text and a tonal button (“Edit conditions”, “Add podcasts”) | none | Row tap; Play and Add on the row | Getting started card on Views; “Hide” |
| Episode detail | Same snackbar | Inline under the actions for a failed acquisition, with a named Try again | none | Same | “metadata pending” text | none | Full-width filled Play Now | none |
| View editor and New View | Snackbar after Done or Create | Inline under the field, in red bodySmall | none | Same; Ctrl+Z | n/a | none | Pinned footer, trailing filled Done or Create View, with a live count | Helper under “Show Episodes where” |
| Playlist (Entries, History, Timeline) | Snackbar (`Moved “…” in Default`) | Snackbar for playback | Rewind sheet with Cancel and Rewind, trailing | Same; reorder can be undone | Text and a tonal button (“Show Entries”) | none | Play from here, inline | Timeline hint line |
| Playlist settings, Trash | “Playlist Commute moved to Trash” (owner) and `Renamed Playlist to “Commute”` | Inline under the Name field | none | Same | Trash: text and “Back to Playlists” | none | Rename, Save trailing under the field | Helper under Delete |
| New Playlist | Navigates into the new Playlist, with a snackbar | Inline under the field | none | Same | n/a | none | Trailing filled Create Playlist under the field | none |
| Library, Select Subscriptions | Snackbar | Per-podcast refresh error inline with Retry | none | Same | Text and “Add podcasts” | none | Row tap | “Grouped by Download Rule” |
| Add podcasts, Podcast page | “Subscribed to Long listening” and Undo | Header error and Try again; inline per Episode | Armed Unsubscribe button, with no dialog (owner) | Same; the Undo slot hides while armed | “No Episodes” text | none | Subscribe, filled, in the bar or trailing in the row | none, so the field stands alone |
| Settings and its sheets | Choice sheets apply live; Undo in the top bar | OPML inline with Retry or Retry failed | Notification rationale dialog: Continue / Not now | Same | n/a | none | Done trailing in the sheet | Subtitles under each row |
| Listening stats | n/a | n/a | none | n/a | Text and “Find something to play” | none | n/a | 48 dp info buttons beside each stat |
| Mini player, Now Playing | n/a | Snackbar; Retry on the transport button (errorContainer) | none | Undo slot in the sheet header | n/a | none | Play/Pause | none |
| Welcome, Connect | Moves on to Views and Getting started | Inline under Server address | none | **none: Discard draft cannot be undone** | n/a | none | Trailing filled Check and connect | Example address as supporting text |

**Mismatches:**
1. **Playlist names are quoted in some messages and not others.**
   - “Playlist Commute moved to Trash” is unquoted.
   - `Renamed Playlist to “Commute”` and `Created Playlist “…”` are quoted.
   - The first wording is owner-mandated, so this is recorded and not targeted.
2. **The Undo column has a hole.**
   - Every other removal offers Undo: Delete View, Delete Playlist, Unsubscribe, Remove from this Playlist, Mark all Played and Rewind.
   - **Discard draft** on New View (`ViewEditor.kt:141–144`) and on Connect to a server (`ServerScreen.kt:38–40`) clears the draft permanently, with neither a question nor Undo. On New View it sits 12 dp from Create View. This is filed as DATA-04 below.
3. **A disabled commit doesn't always say why.**
   - Rename Save and Create Playlist explain empty or duplicate names in the field.
   - Edit View's **Done** is disabled while Rename is open, and nothing says why (`ViewEditor.kt:145`; capture `04c-view-rename`).
4. **One status line breaks the error wording pattern.**
   - The other errors follow “Couldn’t … Check …, then try again.”
   - The sync status reads “Sync error · Showing local data.” It uses a middle dot as sentence punctuation and gives no cause (`strings.xml:25`).
5. **The Redo snackbar uses a different form.**
   - Confirmations start with a past-tense verb.
   - The Redo snackbar reads “Undid: Moved “The quiet edge of the solar system” in Default”, which has a label-colon prefix (flow strip `C-0092`).

## Checklist

Coverage: **87.5%** (pass 61 · fail 2 · N/O 9 · N/A 7). Coverage is (61 + 2) ÷ 72 applicable items. No item failed at blocker severity.

Coverage counts the 79 core-checklist IDs. The Android Phone platform-fit signals are scored under Platform fit below.

### Failures by severity

**Major**

- **[DATA-04] Undo and Redo reverse the app's own edits. Discard draft is the exception.**
  - **Where:** the New View footer (`ViewEditor.kt:141–144`, capture `05-new-view`), and Connect to a server (`ServerScreen.kt:38–40`, capture `41b-connect-kept`).
  - **Evidence:**
    - The New View path calls `drafts.finishNewView(view.id)`, which runs `FormDraftStore.finishNewView` → `clear("view:$id/")` and `clear("new-view/")`, then navigates back.
    - Nothing is written to `EditHistory`, no snackbar appears, and there is no question first. Every condition the person chose is gone after one tap.
    - That tap is on a text button 12 dp left of the filled Create View, in the same footer.
    - Every comparable removal in the app gets Undo through `recordHistory` or `changeWithUndo`: Delete View, Delete Playlist, Unsubscribe, Remove Entry, Mark all Played and Rewind.
    - The rubric's own test is “anything undo can't cover has another recovery path”, and this action has neither Undo nor a recovery path.
  - **Fix:**
    1. Snapshot the draft keys (`drafts.snapshot("view:$id/")` plus `new-view/`) before clearing.
    2. Record a `ReversibleEdit` that restores them and reveals `new-view:$id`.
    3. Show a snackbar, “Discarded New View draft”, with Undo, using the same `recordHistory` call as other edits so that Ctrl+Z also reaches it.
    4. Do the same for the server-address draft.
    - A simpler alternative is to drop Discard draft from New View. Back already keeps the draft, so the person could clear conditions from inside the editor, with Undo.

**Minor**

- **[APPEAR-09] Symbols have consistent weight and scale and sit in optical alignment. The mini player's skip numerals collide with their arrows.**
  - **Where:** the mini player on every screen (`PlayerPresentation.kt:268–279`).
  - **Evidence:**
    - The ring is a 30 dp `ic_skip_back`/`ic_skip_forward` icon, with a labelSmall numeral (14 sp, Medium, density font scale pinned at 1) drawn over it 4 dp below centre.
    - In `light/01-views.png` (crop at y 2440–2700), the “15” and “30” overprint the bottom-left of the arc's stroke.
    - At 80 dp in Now Playing, the same construction reads cleanly. Only the 30 dp size fails.
  - **Fix:**
    - In the mini player, set the numeral at about 10 sp, or 9 dp with the density pinned, and centre it in the ring's counter with no top offset.
    - Better still, draw the numerals into dedicated 24 dp `replay_15` and `forward_30` vectors, so the arc and figures are drawn together, as Material Symbols does.

### N/O

KEY-01, KEY-04, KEY-07, LIST-07, PTR-03, APPEAR-11, WIN-03, RESP-01, FOOT-02.

- **Keyboard and pointer items:** no keyboard or mouse session was run. The code shows autofocus on New Playlist, Rename, Add podcasts and Connect, but a visible focus ring was never observed.
- **APPEAR-11:** no frame sampling at launch. `ConnectedShell` returns empty while the browsing context loads.
- **WIN-03:** no landscape or split-screen capture.
- **RESP-01 and FOOT-02:** debug build on an emulator. FOOT-02 also carries the fling risk noted under Flows.

### N/A

- FLOW-05: no peer panels on a compact window.
- LIST-04: no dense multi-column rows.
- LIST-05: no outlines.
- START-07: no accounts.
- TOOL-06: nothing can be hidden.
- SIDE-03 and SIDE-04: no sidebar or split view on the phone.

### Passes worth naming

These are evidence for the scores below.

- **FLOW-03:** “Long E” survived a late Subscribe completion.
- **DATA-01 and DATA-06:**
  - Drafts persist to the database and are flushed in `onStop`. An open Rename survives leaving the page.
  - Destination, back stacks and list scroll positions are restored from `BrowsingState`. The capture notes that stats reopen part-way down.
- **DATA-05:** `revealChanges` brings back the restored View, Playlist or Entry.
- **DRAG-01/03/05/06:**
  - Dragging gives haptics, an 8 dp lifted shadow, a 3 dp primary insertion line, autoscroll, and a highlight on the retained row.
  - Move up and Move down are available as a menu and as accessibility actions.
  - Every reorder can be undone.
- **DLG-05:** Delete View and Delete Playlist are outlined buttons in the error colour.
- **DLG-07:** no Done/Cancel/Back triplets anywhere.
- **APPEAR-03:** `UiModeManager.contrast` blends primary, onSurfaceVariant and outline toward onSurface (`MainActivity.kt:158–171`).
- **APPEAR-04**, as measured:
  - Light: onSurfaceVariant on surface 8.86:1; primary 6.46:1; error 6.13:1; white check on the green Subscribed fill 6.57:1; field outline 4.25:1.
  - Dark: onSurfaceVariant 10.89:1; primary 10.93:1; the dark check 7.82:1.
- **START-04 and START-05:** the notification permission is asked only at the first download, after a rationale: “Allow notifications to see download progress and stop a download.”
- **KEY-08:** Undo and Redo are registered through `onProvideKeyboardShortcuts`.
- **TYPE-08:** the strings use curly quotes and apostrophes, the ellipsis character, and U+2212 in “−16:34”.
- **TYPE-05:** at 200%, top-bar actions move to their own row, and row actions stack below the text. Nothing clipped on any captured screen.

## Platform fit (Android → Phone)

Side-by-side test against Google apps (Gmail, Keep, Settings): nothing imported from another platform. Two signals are unusual for Android, but both keep its grammar, so each counts as Adapted, not Foreign:
- **A persistent 48 dp Undo slot in every top bar.** It can offer an Undo for something done on another screen (“Undo: Updated Appearance” on a Podcast page, flow row 83). The tooltip names the action, and Undo then reveals it.
- **An action row inside a content list:** Select Subscriptions in Library.

| Signal | Verdict | Evidence |
|---|---|---|
| L1 Navigation | **Native** | Bottom bar with 3 equal destinations, outlined and filled icon pairs, and labels. Top app bar with Up on inner screens and none at the roots. Root actions are search, + and the gear. The Undo slot is Adapted. |
| L2 Visual language | **Native** | Material 3 throughout: tonal, filled and outlined buttons, M3 sheets, snackbars, tabs, a linear progress indicator with a stop dot, and a Roboto type scale. The skip glyph collision is recorded under APPEAR-09. |
| L3 Density, text, system frame | **Native** | `IconButton` is 48 dp (`ActionIcon`). Rows, buttons and the `ChoiceRows` sheet options have a 48 dp minimum. Sizes are in sp, with bodySmall 12 sp the smallest. The app draws edge to edge with `safeDrawing` insets and `imePadding`. 200% text works, with stacked bars and rows, in every font200 capture. |
| B1 System navigation | **Native** | `enableOnBackInvokedCallback="true"`. Back unwinds in this order: the Add sheet, then the player's nested pages, then the player collapse (`PredictiveBackHandler`), then the tab stack (`NavigableListDetailPaneScaffold`), then the root, which returns to Views (`PodListScreens.kt:173`). Back also clears selection and disarms Unsubscribe. It never controls playback. The predictive-Back animation itself is N/O. |
| B2 Preferences and access | **Native** | Labels on icon-only controls. stateDescription carries Unplayed, Played and In progress. The drag handle has custom actions, and long press has an `onLongClickLabel`. Text scales. Appearance offers System default, Light and Dark. There is no in-app language. Live TalkBack traversal is N/O. |
| B3 System surfaces and lifecycle | **Native** | Sharing goes through `Intent.createChooser`. Downloads have a notification channel. Permission is asked in context. Drafts and browsing state are persisted to the database, but restoring them after process death is N/O. Launcher shortcuts exist for the three destinations. There is a Media3 session with Android Auto metadata. |

**Looks 8.8 · Behaves 8.6 → Platform fit (8.8 + 2 × 8.6) ÷ 3 = 8.7.** No checklist cap applies. Behaves is scored mostly from code: rotation, process death, predictive animation and live TalkBack are unobserved.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.2** | **What earns it:** a small, deliberate scale of headlineSmall 22, titleMedium 17, titleSmall 16 SemiBold, bodyLarge 16 and bodyMedium 14 (21 sp leading), with metadata in onSurfaceVariant at 8.9:1. Dates use non-breaking spaces, the punctuation is typographic, and 200% keeps the hierarchy. **What keeps it out of Exemplary:** (1) Library's heading levels are inverted. The parent “Subscriptions” is titleSmall SemiBold in onSurfaceVariant, while its child “Stream” is titleSmall in onSurface, so the child reads stronger (`PodListScreens.kt:381, 392`). (2) “In progress” breaks across lines as “In / progress” in Entry rows (`11-playlist`) and at 200% (`font200` 02, 21). The NBSP used in dates isn't applied to state labels. (3) Show notes, the one passage of reading text, are set at 14 sp, smaller than the 17 sp row titles around them. (4) At 200%, “Rewind Default to Nov 6 · / 2:30 PM?” wraps at the dot. | hierarchy, craft |
| Hierarchy | **8.2** | **What earns it:** one filled primary per screen (Play Now, Subscribe, Create View/Done, Check and connect), quiet top bars, and a transport the largest control on Now Playing. Content leads everywhere. **What holds it back:** (1) The subscribed Podcast page bar carries five controls (Back, Undo slot, gear, check, overflow). (2) Library stacks three heading tiers before the first podcast: Subscriptions, Grouped by Download Rule, then Stream. (3) Read-only Name rows put the word “Name” (bodyLarge, onSurface) above the actual name (bodyMedium, onSurfaceVariant). The value people came to see is the weaker of the two. This is shared with the other value rows by design, but it is still the inverse of what matters. | content-first, hierarchy |
| Spacing & density | **8.0** | **What earns it:** one 16 dp gutter, inset 0.55-alpha dividers, row padding of 14 dp for Episodes and 8 dp for Entries, 48 dp targets, and the permanent 4 dp loading seams. **What keeps it below 8.5:** (1) The “Current Entry” eyebrow sits on the 16 dp gutter, about 54 dp left of the title column it labels (`11-playlist`, crop). (2) At 200%, the separate action row under every Episode and Entry, plus a two-tier bar, leaves about 1.5 Entries visible on a Playlist (`font200` g). Each row's left half is empty beside its trailing actions. (3) Episode detail leaves about 40% of the screen empty under short notes, with “In your Playlists” given the same weight as Show notes. | craft, hierarchy |
| Color & contrast | **8.6** | **What earns it:** one blue accent, error red for destruction and green only for Subscribed. Dark is toned on its own, not inverted. Every text pair measured passes, from 6.1 to 14:1. The contrast preference is honoured, and status is never colour alone. **What keeps it out of Exemplary:** primary blue does double duty as both action and status. It marks text buttons, labelled actions and links, but also the informational “Current Entry” eyebrow, the selected tab and the “1.0×” value. So blue doesn't reliably mean “tap me”. | color-restraint, accessibility |
| Iconography | **7.8** | **What earns it:** one Material-Symbols-style family, outlined and filled pairs on the navigation, and state-true toggles (outline or filled star, download or downloaded, double check or replay). **What holds it back:** (1) APPEAR-09: the mini-player skip numerals collide with their arcs. (2) A pencil opens a screen titled “Settings for Commute”, while the gear means Settings everywhere else, including Subscription settings. (3) The filled gear sits beside outlined search and add icons in the same bar. (4) Select Subscriptions uses an obscure dotted select-all square. | conventions, craft |
| Consistency & polish | **8.3** (stability 8.5) | **What earns it:** every state is designed: loading seams, empty states with a tonal action, inline errors, disabled, armed, and selected (checkbox plus secondaryContainer). Light, Dark and 200% all hold. **What holds it back:** inventory mismatches 2–5: a draft discard with no Undo, a disabled Done that gives no reason, a terse sync error, and the “Undid:” wording. **Stability 8.5:** no FLOW failures in either appearance, the core holds within 2 dp, typed text survives, and follow-ups stay visible. It is held below 9 by the message mismatches. Flows ran only on the main tasks, at the one target width. | craft, stability |
| Clarity | **8.2** | **What earns it:** plain domain words, empty states that name the next step, info buttons that define each stat, a Rewind preview that lists exactly what changes, and helper text under choices. **What holds it back:** (1) A disabled Done in Edit View while Rename is open, with no reason given. (2) “Sync error · Showing local data.” names neither cause nor scope. (3) A global top-bar Undo can act on something done on another screen, which is visible only through its tooltip. (4) Add podcasts opens on a bare field: no example query, and no pointer to OPML in Settings. (5) The tab reads “Timeline” while the domain term elsewhere is “Listening Timeline”. | plain-language, feedback |
| Platform fit | **8.7** | Looks 8.8 and Behaves 8.6, as in the section above. The two unusual signals are Adapted, not Foreign. Rotation, process death and the predictive animation are unobserved. | conventions, stability |
| Interaction & feedback | **6.9** (capped by DATA-04; 8.5 uncapped) (partial: RESP-01 and FOOT-02 N/O) | **Uncapped strengths:** Undo in snackbars, in the top bar and on Ctrl+Z, several steps deep and revealing what it restores. Undo is used instead of confirmation, as with Delete Playlist and two-tap Unsubscribe. Persisted drafts, accessible alternatives to dragging, and synchronous pending states. **Cap:** DATA-04, because Discard draft destroys a New View's conditions with neither Undo nor a question. **Unverified:** responsiveness and smooth scrolling on audience hardware, given the debug-build fling median of 61–102 ms per frame. | forgiveness, feedback |
| **Overall** | **8.2** | Cap: the lowest category is 6.9, so Overall can't exceed 8.9. **What earns it:** PodList serves its primary task cleanly, and it looks and behaves like a well-made Material 3 app. **What holds it back most:** the one forgiveness hole, an irreversible Discard draft beside the main commit, which fixing alone would lift Interaction to about 8.5. After that, a set of small craft gaps keeps the visual categories in Strong rather than Exemplary: inverted heading tiers, a misaligned eyebrow, the colliding skip glyphs, and blue meaning both action and status. | — |

## What stands between this build and 9.0

1. **DATA-04 (major).** Make Discard draft undoable, or remove it. This lifts the 6.9 cap, and Interaction & feedback returns to about 8.5.
2. **Iconography 7.8 → 9.**
   - Redraw the 24–30 dp skip glyphs (APPEAR-09).
   - Give the Playlist settings entry point the gear, or retitle its screen “Edit Commute”.
   - Make the top-bar icons all outlined, or all filled.
3. **Spacing and Typography.**
   - Align “Current Entry” with the title column, at 64 dp start.
   - Put a non-breaking space inside “In progress”.
   - Invert Library's heading tiers. “Subscriptions” should be the strong heading, and the rule names quieter subheads with no separate “Grouped by” line.
   - Set show notes in bodyLarge (16/24).
4. **Clarity.**
   - Give the disabled Done a reason: “Save or cancel the rename first”.
   - Rewrite the sync status as a sentence with a cause, such as “Couldn’t sync. Showing what’s on this phone.”
   - Give Add podcasts a one-line example under the field.
5. **Color.** Keep primary blue for things you can act on. Set the “Current Entry” eyebrow and the speed value in onSurface with weight, and keep the left primary bar as the marker.
6. **Evidence still needed for an Exemplary Behaves half and Interaction score.**
   - A release build on hardware, for RESP-01 and FOOT-02 (the fling).
   - A keyboard session, for KEY-01/04/07 and LIST-07.
   - A live TalkBack pass. The snapshot dump shows Episode-row and mini-player buttons with their labels folded into the row group, which needs confirming in TalkBack.
   - Rotation and process-death restore.

## Next step

- **Target:** DATA-04, the only major failure. It sits in the lowest-scoring category, Interaction & feedback.
- **Anti-pattern:** a destructive action outside the Undo model, a “silent reset” placed next to the primary commit.
- **Root cause:** draft discard is implemented as form-store housekeeping (`FormDraftStore.finishNewView` / `clear`) instead of as an edit. So it bypasses the `EditHistory` that every other removal uses.
- **Change:** before clearing, capture `drafts.snapshot("view:$id/")` and the `new-view/` keys. Call `recordHistory(current, AppMessage(R.string.view_draft_discarded), ReversibleEdit { restore the snapshot; requestReveal(Reveal("new-view:$id")) })`, and keep the existing back navigation. Apply the same pattern to the server-address draft.
- **Principle:** forgiveness, meaning Undo instead of confirmation, with a recovery path for everything.
- **Expected effect:**
  - Interaction & feedback is uncapped and rises to about 8.5.
  - Consistency & polish loses inventory mismatch 2.
  - The Overall cap lifts, so Overall rises to about 8.5.
  - No visual change, and every signature element is untouched.
