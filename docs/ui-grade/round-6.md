# UI grade, round 6

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) at commit `9aa0f2b`. Independent read: earlier rounds and the UI-GRADE.md work lists were not consulted.

Evidence folders (scratch, not in the repo):
- Flow run: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/flows-r6/` (`summary.md`, `measurements.json`, `strips/`, contact sheets).
- This audit's probes and captures: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r6/` (scripts `*.mjs`; captures in `shots/`, cited below as `shots/<name>.png`).

Browser: Playwright Chromium 158.0.8127.18, service workers blocked, light scheme. Widths: phone 412×915 (DPR 2, touch), zoomed desktop 720×450 (DPR 2), desktop 1440×900 (DPR 1), plus 320×640 for reflow. Mac app: Electron 44 launched with Playwright `_electron` against the same demo server.

## Frame

- **Task:** find Episodes through Views and Search, put them in Playlists with Play Next / Last / Now, and listen, picking up where each Playlist left off.
- **Target:** web app, an Android-first installable PWA. The Mac app is the same build in an Electron window, so platform fit is judged for Android Chrome and for a Mac desktop window (menus and context menus from `packages/desktop/src/main.ts` and a live launch).
- **Posture:** sovereign on the desktop (an all-day listening and library tool), transient on the phone (quick pick, play, pocket).
- **Audience:** perpetual intermediate; a podcast enthusiast who curates.
- **Nearest exemplar:** Things (calm personal tool, one list at a time, quiet chrome), not BBEdit.
- **Character:** (1) the two halves, Views (finding) and Playlists (listening), as equal lists, never capsules [owner]; (2) Space Grotesk headings over Inter body [owner]; (3) one blue, #2b50c8, for interaction and the Cursor [owner]; (4) the dark player bar and Now Playing drawer [owner]; (5) plain domain words with capitals (Entry, Played, Clear on Played) and monogram Artwork.
- **Owner decisions:** light appearance only; layout variant A; Inter and Space Grotesk; blue primary; dark player bar; View editor R, Playlist settings and Rewind C, Library C. Scored, not proposed for change.

## Flows

- **Tasks run** (flow run `flows-r6`): browse (open → Commute → Default → Library), listen (open Default → play the third Entry → playing → pause → forward 30 → open Commute → Play this → playing), Now Playing (play → open drawer → Up next → play from Up next → Episode page → close), fresh device (catalogue held 2 s), second tab (takeover).
- **Widths:** phone 412×915, zoomed 720×450, desktop 1440×900. **Appearance:** light only (dark not designed).
- **Timed runs:** desktop, 5 runs after a warm-up, no throttling, darwin arm64. p75: open a Playlist 129 ms; Play from here 107 ms.
- **Script:** `packages/web/ui-flows/flows.mjs`. **Measurements:** `flows-r6/measurements.json`. **Strips:** `flows-r6/strips/<flow>/<width>/`.
- **Failures:** none. Every core-element move in the measurements is caused (`caused: true`), for example heading dy 48 on phone browse step 2 (a new screen with a back link) and dy −5 on zoomed listen step 2 (scroll-into-view of the pressed row). The fresh-device catalogue arrives unprompted with zero movement of heading, navigation and player (rows `fresh device`/step 2 at all widths).
- **Additional probes this round** (not part of the flow script, so they inform checks but not the stability sub-score's band): Remove → Undo, delete → Trash → Restore, Rewind confirm, Edit View, Add podcasts with a bad and a missing feed, offline, reorder → ⌘Z, 200% text, text spacing, 320 px, forced colors, reduced motion, Back focus and scroll on four lists, Windows/Android shortcut notation, Electron menus.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (episode list) | Dark toast above the player (`useConfirm`, message + Undo), 20 s | none seen | none | Undo in the toast; ⌘/Ctrl-Z after | Dashed card, title + one line | none | Edit View / Edit, top trailing | Subtitle summarises the conditions |
| View editor | none (list updates live) | none | none | ⌘/Ctrl-Z only (no toast) | n/a | none | Done, top trailing | "Every row must match…" under the form |
| Search | none | none | none | n/a | Dashed card "Nothing matches / Try fewer or different words." | none | Save as View, top trailing | Scope line under the field |
| Playlist (Entries) | Toast "Removed from Commute", 20 s | none | none | Undo in toast; ⌘Z; **reorder not undoable** | Dashed card "Nothing here yet" | none | Play / Play this, top trailing | none |
| Listening Timeline | Toast via `useConfirm` (code) | none | **Dialog** "Rewind Default to 14:30?" with lists | Undo of the Rewind | Dashed card | none | Rewind to here, per row | Intro paragraph |
| Playlist settings | none (live apply) | Inline under Name ("A Playlist needs a name.") | none | Delete → toast with Undo | n/a | none | none | Help line under each field |
| Trash | **none on Restore** | none | none | n/a | Dashed card "The Trash is empty" | none | Restore, per row | Subtitle "kept for 30 days" |
| Library / Add podcasts | Toast "Subscribed to …", 4 s | **Toast** "That address didn't give a podcast feed.", 4 s, away from the field; bad URL text gets nothing | none | none | First-run card | none | Add podcasts, top trailing | Help line under the field |
| Subscription | Toast "Marked … Played", 4 s | Toast "Couldn't unsubscribe…", 5 s | **Dialogs** for Mark all Played and Unsubscribe | none | n/a | none | none (settings panel) | Help lines per setting |
| Now Playing drawer | Inline state change | none | none | Toast (above the drawer) | not seen | none | Play/Pause, centre | none |
| Offline (any) | n/a | n/a | n/a | n/a | n/a | Quiet strip above the player (phone) / sidebar foot (desktop), with pending count | n/a | n/a |

**Mismatches**
1. **Errors** live inline next to the field on Playlist settings and New Playlist, but in a 4–5 s toast at the bottom-leading corner on Add podcasts and Subscription (Library, Subscription vs Playlist settings, New Playlist).
2. **Undo confirmation:** pressing ⌘Z shows "Undone: Removed from Workshop"; pressing the toast's Undo button leaves the original "Removed from Workshop · Undo" toast on screen after the undo has happened (Playlist; `shots/phone-after-undo.png`, `shots/desktop-after-undo.png`).
3. **Success confirmation:** Delete Playlist confirms with a toast; Restore from Trash confirms nothing and the row just vanishes (Playlist settings vs Trash).
4. **Undo coverage:** remove, delete, Played, Star and View edits are undoable; reordering an Entry is not (⌘Z answers "Nothing to undo") (Playlist).
5. **Toast placement vs the Offline strip:** on the phone the toast's fixed offset overlaps the Offline strip (`shots/phone-offline-remove.png`).
6. **Context menu:** View rows have one (web and Mac), Playlist Entries, Up next rows and Library rows don't (web: browser menu; Mac: Back/Forward/Reload).

## Checklist

Coverage: **94.7%** (pass 76 · fail 14 · N/O 5 · N/A 10). Applicable 95 = 79 core + 26 web − 10 N/A.

Mac IDs (mac-checklist.md): **N/A → target**, out of coverage. The Electron shell's menus are judged under Platform fit instead.

### Failures by severity

**Blocker**

- **[DATA-01] Typed renames are lost when you leave within half a second.** *Where:* Playlist settings → Name; View editor → Name and Mentions. *Evidence:* phone, typed "Commute three" in Name, pressed Back 350 ms later: the heading still reads "Commute" after Back and after a reload (`backdraft2.mjs`). Same for the View name ("Short three" lost). Cause: the 500 ms debounce is cancelled on unmount (`routes/playlists/$playlistId_.settings.tsx:33` `useEffect(() => () => clearTimeout(timer.current), [])`, same in `components/views/ViewForm.tsx:64`). Blur commits, but Back and the Android back gesture unmount without a blur. *Fix:* on unmount and on `pagehide`, flush the pending value instead of discarding it: keep the latest value in a ref and call `rename(latest)` / `latest.current(value)` in the cleanup when a timer is pending.

**Major**

- **[DATA-04] Reordering an Entry can't be undone.** *Where:* Playlist Entries (drag or keyboard Move). *Evidence:* keyboard move "Who sets the price of rice?" to position 2, then ⌘Z: order unchanged, toast "Nothing to undo" (`reorder.mjs`). `MoveEntry` is recorded directly (`routes/playlists/$playlistId.tsx:200-208`), not through `useConfirm` / `useUndoable`. *Fix:* put `MoveEntry` on the undo stack with its inverse (the previous `after`) via `useUndoable`, and announce "Moved … · Undo" like Remove.
- **[KEY-04] Dialogs that ask for input open with focus on the close button.** *Where:* New Playlist, Add podcasts, Save as View (also Add to a Playlist). *Evidence:* New Playlist opens with focus on the X, named "Cancel" (`kb.mjs`: `dialog focus button "Cancel"`; ring on the X in `shots/new-playlist-dialog.png`); Add podcasts opens on "Close" (`tasks.mjs`). No `initialFocus` anywhere in `src`. *Fix:* pass `initialFocus` to each `Dialog.Popup`: the Name field (New Playlist, Save as View), the active tab's field (Add podcasts), the preselected Playlist option (Add to a Playlist).
- **[WKEY-03] Focus is dropped to `<body>` after three view changes.** *Where/evidence:* (a) Edit View: the Edit button is replaced by the form and focus lands on body (`tasks2.mjs`: `editor url …?edit=true focus body`, desktop and phone); (b) Trash → Restore: the row disappears and focus lands on body (`tasks.mjs`); (c) Back from an Episode to a Subscription page leaves focus on body, while Views, Playlists and Search return it to the opened row (`tasks.mjs` "back focus"). *Fix:* focus the "Edit View" heading (or the Name field) when the editor opens; after Restore, focus the next row's Restore button or the heading/empty state; reuse the `[data-episode-title]` restore from `routes/views/$viewId.tsx:54` on `routes/library/$subscriptionId.tsx`.
- **[WDATA-03] An invalid feed address gets no feedback at all.** *Where:* Add podcasts → Feed address. *Evidence:* typed "not a url", pressed Enter: nothing appears, no message, no Subscribe (`shots/desktop-add-bad-url.png`). *Fix:* on Enter or blur with text that isn't a URL, show inline under the field: "That isn't a web address. Feed addresses start with https://".
- **[COPY-02] Feed and unsubscribe errors appear far from their cause, with no recovery step.** *Where:* Add podcasts (Subscribe to a feed that isn't a podcast), Subscription (Unsubscribe while offline). *Evidence:* "That address didn't give a podcast feed." appears in a toast at the bottom-leading corner while the sheet stays open in the centre (`shots/desktop-add-404-subscribe.png`). *Fix:* render the result inline in the result card (in `--destructive`), under the field, with the next step: "That address didn't give a podcast feed. Check it in a browser, or search by name."
- **[WDATA-04] Errors people need to act on vanish on a timer.** *Where:* the same toasts: feed error 4 s (`AddPodcastSheet.tsx:51`), "Couldn't unsubscribe…" 5 s (`$subscriptionId.tsx:375`); Undo offers 20 s with no other undo path on a phone. *Evidence:* the feed error was gone 1.6 s after it was read (`tasks2.mjs`, 4 s total). *Fix:* errors go inline and persist until the input changes (see COPY-02); give error toasts `timeout: 0` with a Dismiss; keep the last undoable step reachable on the phone (for example an Undo in the Playlist header's overflow, or keep the toast until the next action).
- **[BROWSER-05] Ctrl+K is taken from the browser on Windows, Linux, ChromeOS and Android keyboards.** *Where:* everywhere (`AppShell.tsx:490`). *Evidence:* with a Windows UA the sidebar shows "Ctrl+K" and the handler `preventDefault`s Ctrl+K globally. In Chrome that key focuses the address bar for a search; in Firefox, ⌘K/Ctrl+K does too. *Fix:* keep ⌘K in the Mac app (Go › Search already owns it) and on Safari/Chrome for Mac, where Chrome doesn't bind it; elsewhere use `/` when focus isn't in a field (WKEY-02-safe) and show that hint, or leave Ctrl+K to the browser.
- **[APPEAR-03] Forced colors erase the selected tab.** *Where:* Playlist Entries / History / Listening Timeline; Add podcasts Search / Feed address / OPML file. *Evidence:* `shots/forced-desktop_playlists_default.png`: all three segments are identical outlined pills; selection is carried only by a white background and shadow. *Fix:* under `@media (forced-colors: active)` give the selected segment `background: Highlight; color: HighlightText` (or a 2 px `CanvasText` border), keyed on `aria-current` / `aria-pressed`.
- **[WTYPE-02] At 200% text on the phone, controls are clipped and pages scroll sideways.** *Where:* Library, Playlists, Playlist, Search, Now Playing drawer at 412 px with the root font at 200% (Android Chrome's text scaling). *Evidence:* document width 509/412 on Library ("Add podcasts" runs off the right edge), 445/412 on Search and Playlist, 421/412 on Playlists; in the drawer the close chevron sits at 389–433 px and "−16:34" is cut off (`reflow.mjs`; `shots/text200-phone_library.png`, `shots/text200-phone-drawer.png`). Desktop at 200% is clean. *Fix:* let page-header actions wrap below the title under a container query, or collapse "Add podcasts" / "New Playlist" to icon buttons with labels when space runs out; in the drawer, give the top bar `min-width: 0` with the chevron in a fixed 44 px column, and let the scrubber's time labels wrap under the track.

**Minor**

- **[APPEAR-11] A stale Undo toast contradicts the restored list.** *Where:* every Undo toast. *Evidence:* after pressing Undo, the row is back but "Removed from Commute · Undo" stays for the rest of its 20 s (`shots/phone-after-undo.png`); a second press does nothing. *Fix:* in `useConfirm`, close the toast in the action's `onClick` (`toasts.close(id)`) and add "Undone: …" as ⌘Z does.
- **[CTRL-05] Dialog footer buttons have no hover or pressed state.** *Where:* Create / Cancel in New Playlist, Add to a Playlist, Save as View (`NewPlaylistDialog.tsx:89-96` and siblings: no `hover:` or `active:` classes). *Fix:* the same `hover:bg-primary/90 active:bg-primary/80` and `hover:bg-input` the other buttons use.
- **[TYPE-06] The Listening Timeline intro runs about 150 characters a line.** *Where:* `PlaylistHistory.tsx:136` (`max-w-[960px]` at 13 px). *Fix:* `max-w-prose` (about 65ch), as show notes already use.
- **[TYPE-08] Straight apostrophes in the shortcut reference.** *Where:* `Shortcuts.tsx:33` "In a View's Episode list", `:36` "an Episode's actions". *Fix:* use ’.

### N/O

DRAG-05, DRAG-06, PTR-03, FOOT-02 (no long-list fixture), BROWSER-10 (no CLS/LCP measurement).

### N/A

CTRL-02 (no checkbox hierarchies), LIST-03 (no sortable columns), LIST-05 (no outlines), AX-05 (no autoplay; audio is the content), START-04, START-05 (no permission prompts), START-06, START-07 (no accounts), TOOL-06, SIDE-03 (nothing can be hidden).

### Passes worth naming (evidence for the scores)

- Back closes the drawer, sheets and drawer pages one layer at a time without leaving the URL (`kb.mjs`, `phone.mjs`); `/` reopens the last view, including `?tab=history` (`restore.mjs`); scroll is restored on Back (476 → 476).
- Text contrast: no failure on any screen, including the dark drawer and toasts (`contrast.mjs`).
- 320 px: no horizontal scroll on any screen (`reflow.mjs`); text spacing overrides: clean.
- Keyboard: skip link, one Tab stop per Episode grid with arrows, Home/End, type-ahead, Space to tick; the drawer traps focus, Esc returns it to "Open Now Playing"; Remove moves focus to the next row's Remove.
- Shortcut notation follows the OS: "Ctrl+K", "Ctrl+/" on Windows and Android; ⌘ on the Mac (`misc.mjs`).
- Reduced motion turns sheet slides into a 150 ms fade (`index.css:159`).
- Offline is a quiet, truthful strip with a pending count (`offline.mjs`).
- The Mac shell has real menus in Mac order: Settings… ⌘,, Edit › Undo "<step>", Controls, Go (⌘1–3, ⌘[ ]), Window, Help › Keyboard Shortcuts. It has a native Episode context menu, native link and text menus with Look Up, window bounds restored, and the window title tracks the view.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (cap: WTYPE-02) | Small, deliberate scale: 13 / 15 / 28 px with Space Grotesk headings; hierarchy from weight and the muted #5c6070. Uncapped about 8.3. It stays below Exemplary because the zoomed View header breaks "Play Next and Play Last go to" one word a line (`shots/zoomed_views_new-this-week.png`) and, at 200% text, "Deep F…" truncates while "4 unplayed" keeps its full width. | hierarchy, accessibility |
| Hierarchy | **8.2** | One blue primary per screen (Play, Add podcasts, Done), quiet sidebar, content first; the dark player is heavy but owner-fixed. It stays below 9 because the desktop Episode detail centres its action row under a left-aligned header (`shots/desktop-episode.png`), and the zoomed View header spends 300 of 450 px on chrome. | content-first |
| Spacing & density | **7.4** | 4 px rhythm, 76 px rows, consistent gutters at phone width. Desktop edges don't line up: lists stop at 1160 px while header actions sit at 1408 px (Playlist, Library); the Trash empty card spans 1408; the Edit View panel runs to 1424 (`shots/desktop-view-editor.png`); a RESUME label pushes the Commute artwork column about 10 px right of the numbered rows (`shots/electron-commute.png`). At 320 px "Listening Timeline" overflows its segment track and the Entry progress bar shrinks to a dot (`shots/320_playlists_default.png`). | craft |
| Color & contrast | **6.9** (cap: APPEAR-03) | Restrained: one blue with one meaning; star amber, positive green; every text measurement passes, including the drawer. Forced colors lose the selected segment. Uncapped about 8.6. | color-restraint, accessibility |
| Iconography | **8.0** | One Lucide family at matching weight, labelled, with tooltips (`Tip`). The "settings" idea uses three glyphs: sliders for Playlist settings, sliders-horizontal for Edit View (a filter), a gear for app Settings on the phone Library. The "H" monogram for a not-yet-fetched feed URL reads as noise. | conventions |
| Consistency & polish | **7.6** (stability 8.0) | Designed empty, loading (skeleton), offline and first-run states; forced colors mostly handled. Against: the stale Undo toast, silent Restore, errors toast vs inline, a context menu on View rows only, the toast over the Offline strip, CTRL-05, and the Add podcasts sheet jumping 36 px as you type (input y 484 → 448, centre-anchored). Stability 8.0: no FLOW failures at three widths and core still through late arrivals; held below 9 by the inventory mismatches above. | craft, stability |
| Clarity | **6.9** (cap: COPY-02) | Precise domain copy ("Every row must match. Rows left at 'Any' don't narrow anything.", "Matches 6 Episodes now", "16:34 left" vs "45 min"), state always visible (NOW / RESUME, pending sync). Feed errors are far from the field and silent for bad input. Uncapped about 8.4. | plain-language, feedback |
| Platform fit | **6.9** (cap: BROWSER-05) | Web: Looks 8.6 (native controls, real links, OS-correct notation, reflows at 320); Behaves 7.6 (URLs for tabs, editor and search; layered Back; browser menus kept off non-row content; but Ctrl+K taken and focus dropped in three places). (8.6 + 2×7.6)/3 = 7.9, capped. Mac: a thorough native menu bar and context menus, but File holds only Close Window (no New Playlist / New View / Add Podcasts ⌘N), Help has no help, and Entry rows get Back/Forward/Reload. | conventions, discoverable-commands |
| Interaction & feedback | **4.9** (cap: DATA-01) | Fast (p75 107–129 ms), forgiving (Trash, 30-step ⌘Z with named Edit-menu steps, Rewind is undoable), keyboard-fluent grids, Back-aware overlays. Capped by the lost rename; also DATA-04, KEY-04, WKEY-03, WDATA-03, WDATA-04. Uncapped about 7.0. | forgiveness, keyboard-efficiency, feedback |
| **Overall** | **6.9** (cap: lowest + 2.0) | A well-made, distinctive client that serves its task: two halves, a calm list hierarchy, and an excellent player and drawer. One narrow data-loss bug sets the ceiling; five major behaviour gaps and four category caps hold it below Strong. With DATA-01 fixed the cap lifts to 8.9, and the next floor is the 6.9 caps. | — |

**What stands between this build and 9.0:** first, the blocker (DATA-01); then the four category caps (WTYPE-02, APPEAR-03, COPY-02 with WDATA-03/04, and BROWSER-05); then Interaction's majors (DATA-04, KEY-04, WKEY-03). Only after those do the craft gaps decide the score. Those gaps are edge alignment on wide desktops, the 720 px View header, the Episode detail action row, context-menu parity, the Mac File and Help menus, and message consistency. Each of them keeps a category in Strong rather than Exemplary.

## Next step

- **Target:** DATA-01 (blocker; Interaction & feedback, closest to the primary task's editing).
- **Anti-pattern:** a debounced autosave whose timer is cancelled on teardown ("save on idle, drop on exit").
- **Root cause:** `clearTimeout` in the unmount cleanup discards the pending edit instead of committing it. Back, the Android back gesture and route changes unmount the field without a blur.
- **Change:** in `$playlistId_.settings.tsx` and `ViewForm.tsx`, track `pending` in a ref. On unmount, and on `pagehide`, call the commit with the latest value when a timer is pending, then clear. Add a regression test: type, then `history.back()` within 100 ms, then expect the new name.
- **Principle:** `forgiveness`.
- **Expected effect:** lifts the I&F cap to 6.9 (the remaining majors), and the Overall cap to 8.9. No visual change; character untouched.

## Log

Single audit; no iteration this round. Character: all five signature elements kept.
