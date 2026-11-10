# PodList — Android phone — independent round 9 (Codex)

## Frame

- **Task:** Find Episodes, add them to an appropriate Playlist, listen at the intended Position, and recover from changes without losing the listening context.
- **Target:** **Android phone**, compact portrait window. Tablet, foldable and expanded-window design are excluded.
- **Posture:** Sovereign browsing/organization with persistent background playback and short contextual editing tasks.
- **Audience:** Perpetual intermediate, with a genuinely usable newcomer path.
- **Nearest exemplar:** Things for deliberate hierarchy and recoverable personal-task workflows; BuzzKill’s Android phone action explanations for local native craft. Google Calendar’s supplied Android gallery image is the Google-side comparison for action/navigation separation and coherent system controls. That Calendar capture is dated May 2024 and is a tablet image: it is a visual-language reference, not evidence about current phone metrics or a reason to demand tablet features here.
- **Character:** Owner-fixed native Material 3, PodList blue `#2b50c8` and independently toned dark surfaces; three separate Views/Playlists/Library navigation stacks; compact Episode rows with Add then Play; artwork-led, visually nameless playback controls; compact Podcast identity with disclosed description and a green subscribed check.

**Owner decisions:** All supplied decisions remain constraints, not redesign candidates: three bottom destinations; one Add field; one View condition list; Rewind summary sheet; OPML in Settings; current Entry restored paused; no visible podcast/Episode names in either player; immediate Playlist deletion with the specified named Trash/Undo feedback; compact Podcast header, top-bar Subscribe/green check and two-tap Unsubscribe without a dialog or leaving the page; explicit wrapping Rename with Cancel/Save below; case-insensitive unique names; no listed keyboard shortcuts on the phone. They are graded where applicable. The shortcut-reference conflict is recorded once as a retained minor failure. The missing player names are intentional: the visible controls stay understandable, while identity is available to the screen reader and through Episode. Adding names is not proposed.

**Evidence and method:** Worktree `0e766658defbdf7f8a5f8a257df386af227c7f04`, matching the capture README. Evidence root, abbreviated **C/** below: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/android-grade-9/`. Its README was read first. All **165 PNGs** were surveyed in theme contact sheets, with targeted full-resolution inspection; all **165 accessibility snapshots** were scanned for labels/states and representative full trees inspected. App Kotlin, manifest, theme/resources, draft/browsing stores, naming rules, the named design documents/ADRs and CONTEXT.md supplied code/behavior evidence. Kotlin file references below are relative to `apps/android/app/src/main/kotlin/app/podlist/` unless a full relative path is given. No earlier PodList grade or UI-GRADE.md work list was opened. No app, emulator or device was driven. No implementation or tests were changed.

## Flows

**Tasks represented by captured states:** Welcome → start on phone or connect → starter Views; View → Episode → add to Playlist → listen; rename/edit View; create/rename/delete Playlist → Trash/Undo; Entries → History/Listening Timeline → Rewind; Library → Search; Add podcasts → inspect a Podcast → filter Episodes → Subscribe/two-tap Unsubscribe; Subscription settings/Download Rules; Settings/OPML/stats; mini player → Now Playing.

**Tasks run by this grader:** None, as requested. The supplied tour is evidence of separate states, not an automated flow run. **Widths:** 1344 px / density 3 = **448 dp**, compact portrait; image height 2992 px. **Appearances:** light 100%, dark 100%, light 200% system font scale, with unchanged density. **Device:** supplied Pixel 10 Pro XL emulator profile, Android 16. **Timed runs:** none. **Script location / measurements file / screenshot strips:** not supplied. Review contact sheets are scratch aids, not substitutes for flow measurements.

**Scored transition failures:** None established. FLOW-01–04, RESP-01 and the stability sub-score are **N/O**; this is not a pass for transitions or speed. FLOW-06/07 have still/code evidence, as their checklist channels allow.

**Unscored code concern — FLOW-03:** `NewPlaylistScreen` leaves its name field editable while `busy` (PlaylistSettingsScreen.kt:65–71); `createPlaylist` clears `new-playlist/` on successful asynchronous completion (ScreenActions.kt:48–63), and the callback clears it again. `PlaylistAddSheet` similarly leaves its field and target choices editable while submitting, then clears the draft and closes on completion (PlayerPresentation.kt:335–361). `SearchScreen` leaves the naming field editable while `saving`, then clears and closes on success (SearchScreen.kt:39–59). A later keystroke can therefore be exposed to an earlier completion’s clearing path. This needs a delayed-save/IME flow to establish the actual interleaving. CRITIQUE requires a measurement row or flow-strip pair for a scored stability finding, so it is **not silently promoted into a measured blocker or a numerical stability cap**. The smallest preventative change is to disable the submitted field/target controls for the whole commit, or clear only the submitted draft revision and retain subsequent input; keep input on failure. This is a concrete validation priority before claiming 9.0 behavior.

**Evidence limits:** No live TalkBack/Switch Access, rotation, complete process-death cycle, predictive-Back animation, system share/notification/lock-screen/Auto/Bluetooth/audio-focus behavior, launcher activation, actual reorder, in-progress OPML or real publisher feed was exercised. Code supports several of these implementations but does not prove their runtime quality. `font200/30` and `/31` show Settings despite the stats filenames; they do not establish empty-stats layout at 200%. The absent painted middle navigation destination in some `43` captures conflicts with the three-node snapshot/code; without a transition strip it is an observation to recapture, not a proven missing destination or scored APPEAR-11 failure.

## Cross-screen inventory

Legend: **S** = `PlayerContainer` inverse-surface snackbar above the mini player/navigation, short result wording, with Undo; history remains available through the top-bar Undo/Redo after it expires. **E** = error-colored text near the responsible field/operation, usually with Try again; `.errorAnnouncement()` is a polite live region. **Sheet S** = the same snackbar host relocated inside the active modal via `FeedbackSheet`, so it stays actionable. “None” means absent, not unimplemented.

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Welcome / connect | Leaves Welcome after success | E below server field, with recovery | Server address field; Check and connect below | None for connection | None | Checking server disables connection input | Start on this phone / Connect, full-width; connect commit trailing below field | Why server is optional, private network, per-server Library scope |
| Getting started | Number becomes check; completed text stays | None | None | None | Starter Views still usable | None | Add podcasts within card | Three domain-specific steps; Hide at card top |
| Views / a View | S for related edits | Offline/sync retry at top | None | S and history | No Views → New View; no matches → Edit this View | Local-data loading with named progress | Root Add top-trailing; row Add then Play | Conditions/count above Episodes |
| View editor / New View | S; live matching count at footer | E by invalid field/range; duplicate name local | Condition sheet; Rename field with Cancel/Save below | S / Sheet S / history | Any and All matches are stated values | Invalid draft blocks Done/Create | Trailing pinned Done/Create; Rename below name | Permanent draft explanation below conditions |
| Search / Save as a View | S View created; opens saved View | Name error beside naming field | Naming dialog, Cancel / Save as a View | S and history | No matches explains another word/Clear; no Subscription → Add | Initial loading only | Search field top; Save as a View below; dialog commit trailing | Library scope is explicit |
| Episode detail | S for Star/Played/download request | Download E locally; playback failure via player | Add sheet | S and history | No Playlist membership stated | Download working indicator, not whole-screen block | Full-width Play now; four secondary actions below | Show notes, membership and Chapters |
| Playlists root | S, including named moved-to-Trash message | Top sync notice | None | S / history | Default Playlist normally exists | Local loading | Add top-trailing; Playlist rows | Active/count/Clear on Played summary |
| Playlist Entries | S for move/remove/add | Top sync notice | Entry menu or Add sheet | S / history; restored Entry revealed | No Entries + Find Episodes | None | Row Play and contextual actions | Current Entry marked Now; no-current text when relevant |
| Playlist settings / Rename | S Playlist renamed to name; delete returns to directory | Name error local | Explicit Rename with Cancel/Save | S / history | Default omits non-applicable rename/delete | Rename field disabled while saving | Rename below name; red Delete below settings | Clear on Played and Trash consequence prose |
| New Playlist | S Playlist created | Error below name | Name + Discard draft / Create Playlist | S / history | Blank field labeled | Submit controls disabled while saving | Trailing below field | None |
| Trash | S Playlist restored / restored as name | Top sync notice | None | S / history | **No deleted Playlists only** | None | Restore beside each deleted Playlist | **No empty-state retention/purpose/next step** |
| History | None | Top sync notice | None | Global history only | Explains finishing an Episode; Show Entries | None | Open finished Episode | Finish through playback, not manual Played |
| Listening Timeline | S after Rewind | Top sync notice | Rewind summary sheet | S / history | Explains how to begin; Show Entries | None | Rewind-capable row has rewind glyph | Tap-row explanation above events |
| Rewind sheet | Closes to Entries; S Playlist rewound | None specific | Named Playlist/time and consequences | S / history after commit | None under empty consequence groups | None | Cancel / Rewind, trailing bottom | Goes back, Unplayed again, returns, kept |
| Library / Select Subscriptions | S for batch Download Rule change | Local feed-refresh E; sync notice | Checkboxes then Download Rule sheet | S / Sheet S / history | No Subscriptions + Add podcasts; selection explains next step | Refresh affects its operation | Add top-trailing and list-end; selection actions bottom | Group names describe Download Rules |
| Add podcasts | S Subscribed; row also says Subscribed | E below field or failed podcast row | One name/address field; inspect result or Subscribe | S / history | No results suggests another name/address | Field disabled during lookup; row busy during Subscribe | Find podcasts below field; Subscribe beside result | Name-or-feed-address field label |
| Podcast page | Green check; S Subscribed/Unsubscribed; stays on page | E in header with Try again; busy operation named | Check becomes explicit Unsubscribe on first activation | S / history; Unsubscribe history uses reveal=false | No matches → Clear; no Episodes → Refresh | Subscribe/bring-in work labeled | Subscribe/check at top-trailing; Episode Add then Play | Visible Show/Hide podcast details, author and count |
| Subscription settings / Download Rules | Changed value/state in place; history available | Field-specific numeric E | Choices in sheet | Sheet S / history | Default names inherited value | Invalid number stays local | Tap value row; Done sheet bottom | Device scope, thresholds, three rule explanations |
| Settings / OPML | Persistent import counts/failures; S export success | E near OPML task with retry | System document picker | S / history for import/settings | None | Busy only disables import/export operations | Task rows; Stop after current / resume beside progress | Consequences under rows; Getting started accessible |
| Listening stats | Updated totals, chosen day and table/chart | Top sync notice | None | Global edit history | Explains Play an Episode and count-from-now | None | Day controls and Show table/chart below chart | About your stats explains time/finished semantics |
| Mini player / Now Playing | Playback state reflected directly | Persistent player E + retry; named busy state | Speed/Sleep sheet | Global history where relevant | Absent if no current Entry, as designed | Buffering indicator, place kept on failure | Back 15 / Play-Pause / Forward 30; Playlist/Episode access | Spoken identity; chapter/seek state; no visual names by owner |
| Add-to-Playlist sheet | Closes; S named target and Entry count | E under new name | Target radio group, Play next / Play last | Sheet S / history | New Playlist remains an option | Commit buttons disabled during submit | Trailing bottom pair | Active Playlist stated in chosen row |
| Speed / Sleep / Appearance sheets or page | Selected radio / timer status; history where persisted | Duration E beside field | Current choices and Done/Start timer | Sheet S / history for persisted edits | None | Invalid duration blocks Start | Trailing bottom commit; appearance chooses in place | Episode speed scope, timer end choices, System default |

**Mismatches:** (1) Undoing content edits reveals the object/Entry, but undoing settings from another page returns only generic Edit undone without revealing or naming its value (**DATA-05**, U). (2) Other actionable empty lists teach an action; Trash stops at a bare status (**COPY-03**, E). The import result’s persistent counts and a playback error’s persistent local retry differ appropriately from transient success notifications; that is not a mismatch. Light/dark status meanings and host placements otherwise match in the observed states. This inventory cannot supply an unobserved stability score.

## Checklist

**Coverage: 76.8%** (pass 50 · fail 3 · N/O 16 · N/A 10; 53/(50+3+16) = 53/69). All **79 core IDs** have exactly one verdict. Android phone signals are reported separately, not added as invented checklist IDs. Mac/web-only checklists are **N/A → Android target** as a group and do not enter the denominator.

| ID | Verdict | Evidence / scope |
|---|---|---|
| FLOW-01 | N/O | No flow measurements; separate settled states cannot establish 2 dp stability. |
| FLOW-02 | N/O | No measured focus/scroll transitions or live assistive-input run. |
| FLOW-03 | N/O | No measured late-completion/input sequence. A specific code concern is recorded in Flows, without a scored stability finding. |
| FLOW-04 | N/O | Captured Rewind/Undo fit, but IME-open follow-ups and delayed errors are not captured as flows. |
| FLOW-05 | N/A | No peer side-by-side panels in the phone presentation. |
| FLOW-06 | pass | Visible sections contain content, an explicit None, or are omitted: EpisodeDetail, TimelineScreen and SettingsScreen; captures 03, 15, 24, 33–35. |
| FLOW-07 | pass | Creation/rename commits are trailing below the field or in the form footer; EditorSheet and Rewind commit trailing at the bottom. Different form lengths explain pinned versus inline regions; no same-kind placement shuffle established. |
| KEY-01 | N/O | Compose controls provide keyboard primitives, but a complete external-keyboard route, including custom drag surfaces, is not established. |
| KEY-04 | N/O | FocusedInputModifier and RenameableName request focus; actual traversal order, focus visibility and return paths have not been exercised. |
| KEY-06 | N/A | No layout-sensitive custom character accelerators; only Ctrl+Z / Ctrl+Shift+Z. |
| KEY-07 | N/O | No external-keyboard scrolling run. |
| KEY-08 | fail | Minor; owner-retained absence of an in-app shortcut reference. See failure K below. |
| DLG-01 | pass | Code uses contextual feedback for edits/deletion/subscription and modal surfaces for a choice, name, date, or permission decision; no routine success alert. |
| DLG-02 | pass | Save as a View and Rewind name the task/object; the notification explanation states its specific purpose. SearchScreen, TimelineScreen, IncomingContent. |
| DLG-03 | pass | Cancel, Save as a View, Rewind, Continue and Not now describe their results; no Yes/No/OK decision labels. |
| DLG-04 | pass | Standard Material cancellation/dismiss handlers do not execute destructive changes; Rewind has explicit Cancel. |
| DLG-05 | pass | Delete Playlist/View use error-colored text; deletion is deliberately invoked and recoverable. No unexpected destructive default found. |
| DLG-07 | pass | EditorSheet offers Done plus system dismissal/Back; Rewind offers Cancel and Rewind. No Cancel/Done/Back triple. |
| DLG-09 | pass | DropdownMenu is anchored in a Box with its triggering action: EntryMenu, EpisodeDetail and the Library overflow; captures 12 and 27a. Android does not require a pointer arrow. |
| CTRL-02 | N/A | No parent/child checkbox hierarchy. Episode and Subscription selections are flat. |
| CTRL-03 | pass | OutlinedTextField labels persist for name, query, server, numeric and sleep fields; snapshot fields retain Name, Playlist name, Search Episodes, Search the Library, Podcast name or feed address and Server address. |
| CTRL-04 | pass | Names.validate rejects blank/case-insensitive duplicates; NumberInput uses locale-aware parsing/formatting and rejects nonfinite/out-of-range values; fields show local errors. ServerAddress is classified near its field. |
| CTRL-05 | pass | Material Button/IconButton/TextButton/selectable/toggleable supply pressed indication. The large transport Play button serves a different primary playback role, rather than arbitrarily enlarging a routine form action. |
| CTRL-06 | pass | Find, Add, Play and Subscribe remain outside overflow. Menus contain related Entry, sharing/download, or batch-selection commands. |
| CTRL-07 | pass | Search the Library is distinct from Add podcasts; Podcast page says Search Episodes and shows filtered/total counts. No displayed search history. |
| CTRL-08 | pass | OPML exposes processed/total, stop-after-current and resume; downloads expose known-byte progress/cancel; unknown feed/connection operations use indeterminate progress. Code evidence, not a timed performance claim. |
| LIST-01 | N/A | No columnar hierarchy/table data requiring an outline. Episode/Subscription feeds may be lists under the Android clause. |
| LIST-02 | pass | Views, Playlist tabs, Episode counts and section headings identify single-column lists; stats table uses Day / Time listened. |
| LIST-03 | pass | View sorting is an explicit menu/sheet choice with newest/oldest and shortest/longest options; no tappable column headings are claimed. |
| LIST-04 | N/A | No dense multi-column rows in this phone target. |
| LIST-05 | pass | Podcast description expands one object; query and expanded state are persisted in BrowsingContext.podcasts. PodcastPageScreen and BrowsingStore. |
| LIST-06 | pass | Bottom destination, Playlist tab, radio choices and checkboxes identify the current selection; captures 06c, 09, 11–14, 27, 50. |
| LIST-07 | N/O | Touch opens/selects as expected in code; attached-keyboard focus and arrow navigation are untested. No penalty for optional Android type-select/double-click. |
| DATA-01 | pass | Raw form drafts are durably stored, including invalid values and explicit rename drafts; server draft uses atomic DeviceSettingsStore replacement. Normal editing/away/restoration paths are supported by code. Late completion clearing is reserved for FLOW-03; this is not an assertion that every race was tested. |
| DATA-04 | pass | EditHistory, transaction-captured inverses, redo, typed-edit grouping, subscription retries, Rewind and Trash provide recovery; MainActivity/historyShortcuts handle Ctrl+Z and Ctrl+Shift+Z while fields retain text undo. |
| DATA-05 | fail | Minor; reversing settings after leaving their screen neither reveals the affected control nor states its restored value. See failure U. |
| DATA-06 | pass | BrowsingStore persists destination, per-destination stacks, stable scroll anchors, Playlist tab, Search text, Podcast expansion/query and stats table preference. PlaybackService.restore follows the stored Cursor without starting audio. Code-established normal context restoration; full lifecycle execution remains unverified. |
| DRAG-01 | pass | EntryDragHandle supports direct reordering, with Move up / Move down menu commands and accessibility actions. |
| DRAG-03 | pass | Every committed reorder calls model.moveEntry, captures the previous neighbour transactionally, and records Undo/Redo. |
| DRAG-05 | N/O | Source elevation/translation, insertion line, threshold handling and cancellation reset exist in EntryDragging; actual drag image/cues/failed-drop feedback were not captured. |
| DRAG-06 | N/O | Autoscroll, retained destination and focus logic exist in EntryDragging, but their coordination while dragging is not settled by stills. |
| PTR-03 | N/A | No pointer-specific custom interaction in the Android phone scope; no tablet input-parity grade. |
| PTR-04 | pass | ActionIcon and ActionTooltip supply action-specific Material tooltips; visible labels identify text controls. No truncated editable input lacks native selection/scrolling access. |
| APPEAR-03 | pass | Both theme palettes have semantic roles; PodListTheme observes UiModeManager contrast and strengthens primary/secondary foreground and outlines. Surfaces are opaque, so no blur/transparency dependency needs a fallback. Code evidence; no claim of an executed high-contrast tour. |
| APPEAR-04 | pass | Sampled meaningful text/action/state colors clear Android thresholds in light/dark; see measurements below. Disabled labels are exempt. The pale remainder track is supplemental to contrasting thumb, endpoint and time labels, not a scored boundary failure. |
| APPEAR-05 | N/O | Framework animations and direct predictive-Back translation are present; complete reduced-animation behavior is not demonstrated. |
| APPEAR-09 | pass | One consistent vector vocabulary for Add, Play, Settings, Star, download, movement and navigation. Captures 02, 03, 08, 20, 50. |
| APPEAR-10 | pass | Filled transport/commit actions, text secondary actions, outlined fields and tonal selection separate controls from content; the green check is a deliberate subscribed state, not decorative chrome. |
| APPEAR-11 | N/O | No sampled transition sequence. Some capture anomalies cannot establish whether the app or capture timing caused an incomplete frame; see evidence limits. |
| TYPE-02 | pass | System font, Regular/Medium weights and a restrained semantic scale in MainActivity; no thin essential labels. |
| TYPE-03 | pass | Body/caption styles are at least 12 sp and use system text scaling. Skip numerals are redundant icon annotations with a spoken duration, rather than essential body text whose scale is locked. |
| TYPE-05 | pass | 200% text stacks settings values, grows rows/rename controls, wraps tabs and provides scrollable content/player controls. The Download word break is a real craft gap, but all letters and its icon remain available; it is not falsely counted as clipping or lost essential content. |
| TYPE-06 | pass | Reading passages use 14/21 or 16/24 sp (150% leading); About your stats at default size has a comfortable phone measure. Long real publisher notes remain untested, rather than assumed from the one-line fixture. |
| TYPE-07 | pass | App-authored headings use mixed case; underline is reserved for show-note links. Uppercase fixture artwork is publisher/demo content. |
| TYPE-08 | pass | App strings use curly apostrophes/quotes, ellipsis and real minus/range punctuation. Addresses and publisher strings retain literal content. |
| COPY-01 | pass | Play now/next/last, Mark Played, Rename, Save, Rewind and Subscribe use the domain consistently; phone help says Tap. |
| COPY-02 | pass | Connection, lookup, invalid-name/number, OPML, refresh and download errors explain recovery near the field/task; playback failure keeps Position and offers retry. Verified in code; real error presentation/announcement timing is untested. |
| COPY-03 | fail | Minor; the empty Trash offers only No deleted Playlists, without purpose, retention or a next step. See failure E. |
| COPY-04 | pass | Consistent sentence-style actions with capitalized domain terms (View, Playlist, Episode, Search); no desktop shortcut lists are inserted into phone copy. |
| AX-01 | pass | Snapshot/code evidence establishes named controls, selection/checkbox/radio states, headings, seek time, chapter/Entry actions and spoken player identity. Stripped helper button nodes are not treated as proof of missing labels. Live TalkBack usability is still N/O. |
| AX-02 | pass | Selected navigation has a pill, tabs an underline, selected rows checkboxes; Played/Starred/Changed use words and subscribed uses a check shape plus accessible state. Errors have text, not red alone. |
| AX-04 | pass | Podcast details has a visible text button/custom action; reorder has Move up/down; stats has day buttons/table; Episode selection exposes a named long-click accessibility action. Real Switch Access/Voice Access execution is not claimed. |
| AX-05 | N/O | Playback has explicit start/stop, but publisher transcripts/equivalents for critical audio information are not established by silent fixture audio. |
| START-01 | pass | Startup has a meaningful Loading local Library state, local-data reads and offline data; first use can start on the phone. Actual launch latency is under RESP-01, not inferred from code. |
| START-02 | pass | Getting started can be hidden, records hidden/completed state, can be reopened in Settings and does not require server setup or dismiss Add on the first Subscription. |
| START-03 | pass | Contextual Download Rule/inheritance/Rewind explanations and a dismissible starter checklist teach the task. Captures 15, 24 and 42. |
| START-04 | pass | Only the first requested download triggers notification permission explanation/request. No launch-time storage/account permission wall; IncomingContent and AndroidDownloads. |
| START-05 | pass | Explanation: Allow notifications to see download progress and stop a download; Continue proceeds to the system request and Not now dismisses. |
| START-06 | pass | Welcome offers Start on this phone; no account/server required for the core task. Server connection is optional. |
| START-07 | N/A | No account creation/deletion feature. |
| EDIT-02 | pass | Standard Compose text fields/SelectionContainer preserve native text selection/editing; the Activity handles only otherwise-unhandled Ctrl+Z and does not reinterpret Delete as clipboard editing. |
| EDIT-05 | pass | Show notes are selectable and URLSpan values become real LinkAnnotation.Url links; editable feed/server addresses retain native copying and Episode sharing sends a URL as text/plain. |
| WIN-03 | N/O | Only one 448 dp compact portrait window is captured. 200% text is not a phone rotation/narrow-window test. No deduction for out-of-scope tablets/foldables. |
| TOOL-06 | N/A | No user-hideable toolbar/panel; the collapsing player has a visible mini-player route back while it has a current Entry. |
| SIDE-03 | N/A | No phone sidebar/split pane. |
| SIDE-04 | N/A | No adjacent detail pane controlled by a persistent navigation list; bottom selection is assessed under LIST-06. |
| SET-01 | pass | App settings are together; Playlist and Subscription options stay with their objects; OPML import/export is in Settings as fixed by the owner. |
| RESP-01 | N/O | No five-run response-time measurements or 75th-percentile input-to-frame results. |
| FOOT-02 | N/O | A 500-Episode feed was captured, but no scrolling frame-time/hang measurements were supplied. |

**N/O:** FLOW-01, FLOW-02, FLOW-03, FLOW-04, KEY-01, KEY-04, KEY-07, LIST-07, DRAG-05, DRAG-06, APPEAR-05, APPEAR-11, AX-05, WIN-03, RESP-01, FOOT-02.

**N/A:** FLOW-05, KEY-06, CTRL-02, LIST-01, LIST-04, PTR-03, START-07, TOOL-06, SIDE-03, SIDE-04. All are feature/target exclusions explained above; none hides a failed parent.

### Failures by severity

No **scored blocker or major** failure is established by this evidence set. This statement is restricted to verified checks; it does not certify the unobserved flows or dismiss the code concern above.

1. **[DATA-05] minor — U: Undo does not make restored settings visible after navigation.** **Where:** change global Speed (or Subscription overrides, Download Rule, Trash retention or Clear on Played), leave its settings page, then use top-bar Undo. **Evidence:** `ScreenActions.kt:116–131` has reveal cases for content and names, but its `else -> null` covers these settings Changes; `HistoryActions.kt:78–84` supplies generic Edit undone, with no restored value. Appearance’s separate reversal likewise has no explicit result value. The data is reversed, but the changed setting is neither brought into view nor reported. **Concrete fix:** map these inverse Changes to their settings destination and stable row anchor, or make Undo feedback explicitly state the affected scope and restored value (for example, Playback speed restored to 1.0×), with an action that reveals it. Keep the current cross-screen content reveal behavior.
2. **[COPY-03] minor — E: Empty Trash does not teach its purpose or a next step.** **Where:** `C/light/18-trash.png` and `.txt`, with the same bare state in dark/200%; `PlaylistSettingsScreen.kt:81–85` renders only No deleted Playlists. **Evidence:** no retention explanation, recovery model or contextual action accompanies it, unlike History/Entries/Library empties. **Concrete fix:** add one sentence explaining that deleted Playlists can be restored for the configured number of days, followed by a Show Playlists action. Do not suggest deleting something merely to populate the screen.
3. **[KEY-08] minor — K: No accessible in-app shortcut reference (owner-retained).** **Where/evidence:** `SettingsScreen.kt` exposes Help/Getting started but no shortcut reference; `MainActivity.kt:58–63` and `HistoryActions.kt:115–131` implement Ctrl+Z/Redo routes. The shared checklist’s first sentence requires an in-app reference without exempting phones. **Disposition:** the owner explicitly forbids listing keyboard shortcuts on the phone. A literal checklist-compliant reference would conflict with that decision, so this remains a recorded exception, with **no app change proposed** and no numerical cap. An owner-approved change to the grading scope, rather than an unauthorized UI addition, is the available resolution.

### Contrast measurements and excluded false positives

Measurements use opaque sRGB foreground/background pairs sampled from the full-size PNGs and confirmed against MainActivity’s theme roles, with standard relative-luminance ratios. Coordinates below are original capture pixels, not the scaled contact sheets.

| Element / colors | Light | Dark | Result |
|---|---:|---:|---|
| Recurring secondary text, onSurfaceVariant / surface | `#46464f / #faf8ff` **8.86:1** | `#c7c5d0 / #121318` **10.89:1** | Pass; above 4.5:1 |
| Primary action foreground / light surface or dark player surface | `#2b50c8 / #faf8ff` **6.46:1** | `#b8c4ff / #1a1b23` **10.10:1** | Pass |
| White Play/commit label / primary | `#ffffff / #2b50c8` **6.81:1** | Dark uses onPrimary on pale primary | Pass |
| Subscribed check / green backing | `#ffffff / #176b39` **6.57:1** | `#00391a / #80db9a` **7.82:1** | Pass; shape/semantics also identify state |
| Error text / surface | `#ba1a1a / #faf8ff` **6.13:1** | `#ffb4ab / #121318` **10.93:1** | Pass |
| Seek remainder track / player surface, `08-now-playing.png` | `#dfe1f9 / #f4f3fc` **1.17:1** | `#434659 / #1a1b23` **1.84:1** | Recorded, **not failed**: thumb, endpoint and readable times identify the actionable control/range |

For the last row, sample `(1000,1830)` for remainder track and `(100,1750)` for background in both `08` images; `(300,1830)` samples the active track. The unplayed portion is pale, but not every fill is a required boundary: the contrasting thumb and endpoint remain visible. This distinction follows [W3C’s explanation of non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast), used only to interpret required versus supplemental visual information, not to import web navigation rules into Android. Disabled controls are not counted as failing text. No score was reduced merely because a Material tonal container is below 3:1.


## Scores

Scores use 0.1 steps and the guide’s anchors. Strong means deliberate and consistent but short of a reference-quality finish; this review does not award Exemplary simply for using stock Material components. Scores cover both themes unless noted. Behavioral categories use code and snapshots and remain **partial in runtime coverage**. N/O checks impose no invented caps.

| Category | Score | Evidence and anchor | Principle |
|---|---:|---|---|
| Typography | **8.0** | Strong: system 12/14/16/17/20/22 sp roles distinguish title, metadata and help; normal rows are readable and notes have 150% leading. Below Exemplary: at 200%, the fixed four-way secondary-action slots split **Download into Downloa / d** in `font200/03`, `/03b`, `/03c` and `/50`; the longer Download-state labels in PlaybackActions use the same slot. Type is retained, but the word shape and scan rhythm are poorly finished. | hierarchy, craft, adaptability |
| Hierarchy | **8.6** | Strong: Episode title → metadata → full-width Play → quieter utilities; Now Playing gives transport deliberate primacy; Podcast count/search/Subscribe are easy to locate. Below Exemplary: Episode detail and selection give all four secondary actions equal visual weight and text treatment even when their labels need very different space; metadata joins several distinct facts into one small line. | content-first, hierarchy |
| Spacing & density | **8.1** | Strong: recurring 16 dp gutters, 48 dp action targets, 56 dp minimum value rows and deliberate stacked layouts above fontScale 1.5. Below Exemplary: four fixed utility columns become cramped at 200%; repeated 14 dp vertical padding plus a separate trailing action row makes high-text Episode lists expensive to scan. Refine the action layout without shrinking targets or text. | craft, adaptability, conventions |
| Color & contrast | **9.0** | Exemplary on observed themes: coherent seed-blue roles, quiet surfaces, independently toned dark scheme, high-contrast secondary text and meaningful green/error states with non-color cues. High-contrast preference support is explicit in code. Faint supplemental track fills are recorded without manufacturing a failure; untested system rendering remains outside this score’s claim. | color-restraint, accessibility |
| Iconography | **8.8** | High Strong: consistent vectors with familiar meanings; text labels back up less universal actions; 15/30 skip numerals and OPML directions are useful. Below Exemplary: generic plus/Add and the compact Playlist glyph still require tooltip/label learning; the fixed-size glyphs look undersized beside 200% labels, although hit areas stay accessible. | conventions, craft, plain-language |
| Consistency & polish | **8.2** (**stability N/O**, light/dark/200%) | Strong for observed states: shared ValueRow, RenameableName, commit controls, error announcements, sheet feedback and state colors finish most edges. The large-text action-strip finish, bare Trash and Undo-result mismatch prevent Exemplary. **Partial: no flow run; no stability band limit applies.** The unmeasured FLOW-03 concern is not turned into a numerical stability result. | craft, conventions, stability |
| Clarity | **8.4** | Strong: Library vs external discovery scope, inherited defaults, rule consequences, Rewind’s kept/restored distinctions and two-tap unsubscribe are explained plainly. Below Exemplary: empty Trash teaches nothing; generic Edit undone omits the resulting value. The owner’s nameless player trades immediate visual identity for control focus; spoken identity/Episode access keep it usable, and names are not a proposed fix. | plain-language, feedback, discoverable-commands |
| Platform fit | **8.7** (**partial: code + capture**) | Strong: **Looks 8.7; Behaves 8.7; (8.7 + 2×8.7)/3 = 8.7.** Native Android phone navigation, Material controls/sheets, system Back handlers, insets, preferences and system integrations are implemented. The score is supported by all six phone signals below, without claiming tested lifecycle/assistive-input fluency. No major/blocker mapped failure caps it. | conventions, stability |
| Interaction & feedback | **8.3** (**partial: code + capture**) | Strong: durable drafts, reversible local edits, multi-step history, preserved playback Position, Trash, named subscribing/buffering/error states and gesture alternatives serve the core task. Below Exemplary: DATA-05 and the retained KEY-08 exception remain; measured flow speed, long-list smoothness and live assistive behavior are N/O. No speed or motion quality is inferred from Compose alone. | forgiveness, feedback, user-control |
| **Overall** | **8.4 / 10 — Strong** | The primary find → organize → listen workflow is coherent and recognizably Android. The main proven obstacle to 9.0 is the unfinished 200% action layout and inconsistent result/empty-state craft, rather than a need to change the owner’s design. Lowest scored category is 8.0; Overall respects the +2.0 cap. No scored major/blocker cap is triggered. This is an evidence-limited grade, not an assurance about unrun transitions. | character, craft, accessibility |

### Android phone platform-fit signals

Side-by-side with the supplied Google Calendar/BuzzKill images, there is no established imported iOS-only symbol, 44 pt minimum, root Up, action masquerading as a navigation destination, or custom sharing overlay. Stock Material appearance earns no automatic bonus; retained Android behavior does. Tablet/foldable additions L4/L5 and B4–B8 are **N/A → target**, excluded from coverage.

| Signal | Verdict | Evidence / limits |
|---|---|---|
| L1 Navigation | **Native** | Three equal destinations; title/Up on inner pages; actions distinct from navigation. Per-tab SaveableStateProvider and persisted stacks in PodListScreens. Captures 01, 10, 20 and inner screens. |
| L2 Visual language | **Native** | Material 3 controls, consistent vector family, semantic light/dark palettes and stable accent. No requirement to copy Expressive, dynamic wallpaper color or another app’s palette. |
| L3 Density, text, frame | **Adapted; partial** | Known 3× density; dp/sp code; 48 dp control targets; system fonts ≥12 sp; edge-to-edge plus safeDrawing/IME support. Captured enlarged content is accessible but utility labels need refinement. Other compact widths/rotation and real IME overlap are N/O. |
| B1 System navigation | **Native in code; runtime N/O** | Manifest enables predictive Back; NavigableListDetailPaneScaffold handles stack history; PlayerContainer registers PredictiveBackHandler for nested player/collapse; modal sheets handle dismissal; selection and armed Unsubscribe disarm before leaving. No playback-on-Back behavior. Actual predictive gesture/animation was not run. |
| B2 Preferences and access | **Native/Adapted; partial** | System default/Light/Dark choices persist; contrast preference is observed; text scales; labels and alternate actions exist; no in-app language overrides system choice. Live TalkBack/Switch Access and alternate-language rendering remain N/O. |
| B3 System surfaces and lifecycle | **Native in code; partial** | ACTION_SEND Sharesheet, OpenDocument/CreateDocument, download channel and cancel action, MediaLibraryService, contextual notification permission and launcher XML; durable drafts, browsing state and stored Cursor. Real share/notification/lock-screen/shortcut use and a complete process-death restoration run are N/O. |

### What keeps this below 9.0

1. **Finish enlarged text as a designed layout.** At 200%, use two rows/two columns or full-width labeled actions instead of four equal narrow slots. Keep all actions and 48 dp targets; do not shrink text, remove labels or add an overflow dependency merely to make a screenshot fit. Preserve the compact normal-size layout if it still works.
2. **Make recovery state as explicit as the original edit.** Content Undo reveals the restored object; settings Undo should reveal the row or name the resulting value/scope. Generic Edit undone is a noticeably lower level of finish than the precise original controls.
3. **Teach the last empty edge.** Trash should explain recovery and configured retention as clearly as History/Entries/Library teach their next action.
4. **Validate the code concern before treating the app as an interaction reference.** Delay creation/naming commits, type again while pending, and verify the draft revision and task stay with that input. Also establish real Back/lifecycle, assistive-input and timing evidence. These are validation gaps, not invented failures or score deductions for N/O items.

## Next step

**Target:** Typography, the lowest scored category (8.0), specifically the enlarged Episode-detail and batch-selection utility strip. There is no scored blocker/major to outrank it; the owner-retained KEY-08 conflict is excluded from change candidates.

**Anti-pattern:** No exact named Android anti-pattern in the catalog. The concrete defect is a fixed four-column utility layout whose labels outgrow their slots; calling it a Mac-only touch-scale tell would be inappropriate. **Root cause:** `LabelledAction` assigns every action `weight(1f)` in an ordinary Row even at 200%; the flexible label is forced to break inside a word instead of changing the row structure (Selection.kt:47–57; EpisodeDetail’s row at PodListScreens.kt:520–535).

**Change:** At fontScale ≥1.5, lay the four utilities out as a two-by-two group with full labels, at least 48 dp targets and a 12–16 dp gap; let the group grow vertically. Retain current glyphs, wording, blue emphasis and all four capabilities. Test Download / Remove download / Cancel download / Try again as well as Mark Unplayed, not just the shortest fixture labels. Keep the current normal-size layout if it remains well balanced.

**Principle:** adaptability and craft, following the same label/value accommodation the app already uses in ValueRow. BuzzKill’s useful technique is consequence/label legibility inside each choice, not its tall-card look; Things’ craft bar is that the smallest state receives the same finish as the main one.

**Expected effect:** Typography and Spacing & density improve; Hierarchy and Consistency should improve as labels become whole words. Risk: an extra action row reduces list viewport height. Compare 100% and 200% Episode detail and multi-select before accepting it, keeping names omitted in the player and every owner-fixed signature intact. This is a review-only proposal; no before/after iteration or implementation is claimed.
