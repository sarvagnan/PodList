# UI grade, round 27

Graded at `d68aaff` against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), as a **web app**: an Android-first installable PWA, also run as the same web build in the Electron window (`packages/desktop/src/main.ts`). Independent read: no earlier round reports or UI-GRADE.md work lists were consulted.

Evidence: the round-27 flow run (`scratchpad/flows-r27`: summary.md, measurements.json, strips, contact sheets) plus my own Playwright probes of a fresh build against the demo server (Chromium from `packages/web/node_modules/playwright`, device scale 2, service workers blocked), and an Electron launch through `_electron`. Scripts and screenshots are in `scratchpad/grade-r27/` (`shots/*.png`). The probes left an "Evening" Playlist and a "New View" in that demo database; the demo is throwaway.

## Frame

- **Task:** find Episodes through Views, line them up in Playlists, and listen; manage the Library of podcasts that feeds them.
- **Target:** web app (Android Chrome PWA first; the Mac app is the same build in an Electron window with a native menu bar).
- **Posture:** sovereign on desktop (a sidebar, a list, a detail panel, a player bar, open all day); transient-to-sovereign on a phone (quick actions while commuting).
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things 3, for calm lists, inline detail, plain words for a precise model, and undo instead of confirmation. It's a reference for craft, not a look to copy.
- **Character:** (1) warm off-white page `#f6f5f2` with a single blue `#2b50c8` for interaction *(owner)*; (2) Space Grotesk titles over Inter text *(owner)*; (3) a dark slate player bar and Now Playing drawer *(owner)*; (4) Views and Playlists as equal halves, navigated by lists, never capsules *(owner, layout A)*; (5) plain domain words with capitals (Views, Playlists, Entries, Played, Device), and colored initial artwork tiles.
- **Owner decisions:** light only until a dark theme is designed; layout A; Inter and Space Grotesk; blue primary; dark player; View editor R, Playlist settings and Rewind C (including Rewind's confirmation), Library C. These are graded but not proposed for change.

## Flows

- **Tasks run:** browse (open, Commute Playlist, Default Playlist, Library), listen (open Default, play the third Entry, playing arrives, pause, forward 30, open Commute, Play this, playing arrives), now playing, fresh device (2 s late catalogue), second tab.
- **Widths:** phone 412 × 915, zoomed desktop 720 × 450, desktop 1440 × 900. **Appearance:** light (the only one).
- **Timed runs:** desktop, 5 runs after a warm-up, no throttling, darwin arm64. p75: open a Playlist 113 ms, Play from here 101 ms.
- **Script:** `packages/web/ui-flows/flows.mjs`; **measurements:** `flows-r27/measurements.json`; **strips:** `flows-r27/strips/<flow>/<width>/`.
- **Failures:** none. No FLOW check failed at any width.

My own probes added the transitions the flows don't cover. Removing an Entry by keyboard moves focus to the next row's Remove button. Undo returns focus to the restored row's title. Back closes the Now Playing drawer and the Add sheet without leaving the page. Back from an Episode restores `scrollY` 400 → 400 on Search at the phone and zoomed widths, and so does a reload. CLS on load is 0.000 (lab).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | toast, bottom-left of main column, dark, "Added … to Default" pattern | none seen | none | Undo in the toast; Cmd/Ctrl-Z | dashed card, title + one sentence | none | header trailing: "Next and Last go to" picker, Edit View | Edit panel's footnote "Every row must match…" |
| View editor (phone / desktop) | toast "Edited “New View”" + Undo | none | none | toast Undo; Cmd/Ctrl-Z | "Matches N Episodes now" | none | Done, header trailing (phone) / panel top-right (desktop) | inline hints under Mentions and Length |
| Playlist | toast "Removed “…” from Workshop" / "Moved “…”" + Undo | none | none | toast Undo; Cmd/Ctrl-Z; Mac Edit › Undo | dashed card "Nothing here yet" + next step | none | header trailing blue pill: Play / Play this / Pause | none |
| Listening Timeline | toast after Rewind + Undo | none | **dialog** "Rewind Default to 14:30?" (Cancel focused) | toast Undo | dashed card | Rewind dialog | Rewind to here, per row, trailing | intro paragraph under the tabs |
| Playlist settings | none (saves as you type, stated under Name) | none | none | toast after Delete ("Moved “Evening” to the Trash" + Undo) | n/a | none | n/a (Delete Playlist, red text, below the card) | sentence under Delete |
| Trash | toast after Restore | none | none | toast Undo | dashed card "The Trash is empty" | none | Restore, row trailing | "Deleted Playlists are kept for 30 days." |
| Library / Subscription | toast "Unsubscribed from …" (4 s) | inline red under the field ("Enter the whole address, starting with https://") | **dialog** "Unsubscribe from …?" | none for Unsubscribe (confirmed instead) | dashed card "No Subscriptions yet" | Unsubscribe dialog | header trailing blue "Add podcasts" | hint under each Add field |
| Search | none | none | Save as View asks for a name | n/a | dashed card "Search your Library" | none | header trailing "Save as View" | hint under the field |
| Player bar / drawer | state change in place | **red text in the bar/drawer: "Couldn’t play this Episode." + Try again** | none | n/a | n/a | none | Play/Pause, centre | none |
| Offline (any screen) | n/a | n/a | n/a | n/a | n/a | status: sidebar foot (desktop) / bar above the player (phone): "Offline. 1 change will sync when you’re back online" | n/a | n/a |

**Mismatches:**
1. **Destructive actions take three forms.** Delete Playlist and Delete View are red text buttons with a trash icon and an Undo toast. Unsubscribe is red text with no icon and a confirmation dialog. The different recovery is defensible, since Unsubscribe can't be undone, but the styling of the trigger differs. (Playlist settings, View editor, Subscription.)
2. **Drilled-in pages on desktop use two header patterns.** Subscription, Trash and Playlist settings put the parent in the heading as a breadcrumb ("Library › Deep Field"). The Episode page keeps the phone's "‹ Views" link above the title. (Episode vs Subscription, Trash, Playlist settings.)
3. **Disclosures differ on reload.** "Settings for this podcast" stays open after a reload (`aria-expanded=true`), but Search's "Refine" closes again (`aria-expanded=false`). (Subscription vs Search, phone.)
4. **Sidebar selection has two styles.** A selected item gets the accent fill plus a 3 px leading bar. The "PLAYLISTS" section heading, when /playlists is open, gets a fill pill with no bar. (desktop sidebar, `desktop-playlists.png` vs `desktop-library.png`.)

Success, Undo, empty-state and error placement is otherwise one pattern across screens: the toast at the main column's bottom-leading corner with Undo, the dashed empty card, and errors inline under their field.

## Checklist

Mac IDs: N/A → target. The Electron shell's menus and context menu are judged under Platform fit below.

**Coverage: 96.9%** (pass 93 · fail 2 · N/O 3 · N/A 7) of 105 IDs (79 core, 26 web).

**Failures by severity**

- **[COPY-02] major. A playback error doesn't give its cause or a working recovery.**
  - *Where:* the player bar and the Now Playing drawer (`AppShell.tsx:161,190`, `NowPlayingDrawer.tsx:165`).
  - *Evidence:* offline, I played an Entry that isn't downloaded ("What the Voyager records were for", phone 412). The bar says "Couldn’t play this Episode." with a **Try again** button, which can't work offline. At phone width the bar truncates the message to "Couldn’t…" and wraps the title to two lines (`shots/phone-offline-play.png`). The drawer shows the full sentence but still gives no cause (`phone-offline-drawer.png`; desktop `desktop-offline.png`). The offline status bar directly above says only that changes will sync. Losing signal is the most common failure an Android podcast client sees, and the app knows the cause (offline, and no local download). Other errors already name it: "Couldn’t check the address. Check that you’re online."
  - *Fix:* when `navigator.onLine` is false or the fetch fails while the Device is offline, and the Episode has no download, say "You’re offline and this Episode isn’t downloaded." Offer **Play a downloaded Episode** (or open the Queue filtered to downloaded) instead of Try again, and keep Try again only for errors that could pass. On the phone bar, show a short form that fits ("Offline – not downloaded") rather than truncating.
- **[TYPE-08] minor. Nested quotation marks in the Mac Edit menu.**
  - *Where:* `main.ts:439`.
  - *Evidence:* after removing an Entry, the Edit menu reads `Undo “Removed “The workshop as a notebook” from Workshop”`, with double quotes inside double quotes (Electron probe).
  - *Fix:* label the menu item with the verb phrase alone, the Mac convention, e.g. "Undo Remove from Workshop". Or use single quotes inside: `Undo “Removed ‘The workshop as a notebook’ from Workshop”`.

**N/O:** KEY-06 (not tried on non-US layouts; the code matches `event.key` with Cmd/Ctrl, which should hold), DRAG-06 (lists in the demo are too short to need autoscroll during a drag), FOOT-02 (no representative long list to scroll; common actions don't hang).

**N/A:** AX-05 (no critical audio-only information beyond the content itself), START-04 and START-05 (no permission requests), START-06 and START-07 (no accounts), TOOL-06 and SIDE-03 (no hideable toolbar or sidebar).

**Passes worth recording** (selected):

| Check | Evidence |
|---|---|
| WKEY-01, LIST-07 | Episode lists are APG grids: ↑↓ rows, ←→ actions, Enter opens, typed letters jump. |
| BROWSER-06 | Rows have their own menu from right-click or the ContextMenu key, links keep the browser's menu, and phones get ⋯. |
| BROWSER-02 | `?tab=`, `?episode=`, `?edit=` and `?q=` make every state addressable. |
| BROWSER-03 | Tab titles are per section ("Default Listening Timeline · PodList"). |
| WKEY-03 | The drawer traps Tab (40 presses stayed inside) and Esc returns focus to the bar. |
| DATA-04 | Undo works across rows, reorder, deletes and View edits, through the toast, Cmd/Ctrl-Z and the Mac menu. |
| APPEAR-03 | Forced colors keep selection, progress and control edges. |
| WTYPE-02 | At 200% text the phone layout keeps everything; the player bar drops ±15 and the queue to the drawer. |
| WTYPE-05 | No horizontal overflow at 320 px on 14 routes. |
| WTYPE-03 | The text-spacing overrides clip nothing. |
| APPEAR-04 | Automated contrast sweep of 14 routes, the drawer and the queue: no text under 4.5:1, and no text under 12 px. |
| WTYPE-04 | Every target ≥ 24 px or has spacing; checkboxes sit in 40 × 40 labels. |
| BROWSER-10 | Lab LCP 2.07 s and CLS 0 on loopback. |

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | The scale is small and deliberate. Titles are 28 px Space Grotesk, rows 15 px Inter, metadata 13 px muted (5.9:1), section labels 12 px tracked caps. Type alone tells Now/Here, title and metadata apart. Punctuation is typographic throughout the web build. Below Exemplary: the drawer's Chapter title, the second thing you read on Now Playing, is a 13 px muted caption between the chapter buttons (`phone-chap-drawer.png`); the Mac Undo label nests double quotes (TYPE-08); Timeline rows set four text styles side by side (time, icon, sentence, link). | `hierarchy`, `craft` |
| Hierarchy | **8.5** | The squint test passes. One blue pill per screen (Play, Add podcasts, Done), a dark player that anchors without competing, and quiet chrome. View rows show their actions on hover or selection, Things-style (`desktop-view-hover.png`). Held back by two things. On a 1440 desktop, Playlist and Subscription rows stretch to 1168 px, so the title and its Play button sit about 1,000 px apart. On the Listening Timeline, every row repeats "Rewind to here" (5 identical links on `desktop-timeline.png`), which outweighs the events themselves. | `content-first`, `hierarchy` |
| Spacing & density | **8.3** | A 4 px rhythm, 40 px row actions, and one spacing system from phone to desktop. Reflow is clean at 320 px and at 200%. Density suits a calm personal tool. Below Exemplary: list screens use a 1160 px measure and form screens 640 px (`widths.mjs`: View, Playlist, Library, Subscription, Search 1160; Settings, Playlist settings, Episode 623–648). The desktop Episode page leaves about 60% of the main area empty. The zoomed drawer overflows by 19 px, so its Episode button sits half below the fold until scrolled (scrollHeight 397 / 378). | `craft`, `hierarchy` |
| Color & contrast | **8.8** | Restrained, with fixed meanings: blue for interaction, Now and progress; green ✓ for Played; amber ★ for Star; red only for destructive actions and errors. The dark drawer keeps 5.8:1 progress and 8.9:1 errors, and forced colors are designed (outlines on the current Entry, segmented tabs and the selected nav). Light only is the owner's decision and doesn't cap anything. Short of 9: offline, the artwork falls back to a pale tile with dark-blue initials (`phone-offline-drawer.png`), a different visual language from the solid colored tiles shown online. | `color-restraint`, `accessibility` |
| Iconography | **8.7** | One Lucide family at matched weight. Custom 15/30 skip glyphs with numerals, a funnel for Views and list-music for Playlists. Icon-only controls have labels and tooltips, including on keyboard focus ("Remove from Workshop"). Short of 9: in the desktop sidebar only Trash has an icon, so it looks like an outlier among plain-text items. | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability **8.8**) | All states are designed: empty, loading, offline, error, disabled Name for Default, drag, focus. The flows show no FLOW failures at any width. Messages have one place and one wording. Held below 9 by the four inventory mismatches (destructive trigger styles, two header patterns, disclosure memory, two sidebar selection styles). Also a stale "Drag to reorder" tooltip stays on the old handle after a drop (`desktop-after-drag.png`), and the phone bar truncates its own error to "Couldn’t…". | `craft`, `stability` |
| Clarity | **6.9** (capped by COPY-02; 8.6 before the cap) | The words are excellent: "Next and Last go to Default (Active)", "Matches 5 Episodes now", "Clear on Played: An Entry leaves once its Episode is Played, wherever you heard it", "Saved as you type". Tab titles name each section. The offline playback error names neither cause nor working recovery and truncates on the phone (major). Minor points: Search on an empty Library still invites "Search your Library"; search results don't highlight the matched words. | `plain-language`, `feedback` |
| Platform fit | **9.0** (Looks 8.8, Behaves 9.1) | **Web:** real links everywhere (⌘-click and Copy Link work); every section, selection and edit mode has a URL; Back closes overlays first; scroll and sort survive reload and Back; the browser keeps its menu on links and text; Ctrl+K is left to Chrome off the Mac; native selects and inputs; an installable PWA with in-app back links. **Mac shell:** full menu bar in standard order, Settings… ⌘, in the app menu, labelled Undo, Go ⌘1–3 and ⌘[ ⌘], native row context menus, window title without the app name, bounds restored. Looks 8.8: no dark appearance for dark-mode users (owner decision). New Playlists and Views get UUID addresses (`/playlists/c5422e15-…`) while the seeded ones get slugs. | `conventions`, `stability` |
| Interaction & feedback | **8.8** | Keyboard-fluent: grid rows, a ContextMenu-key row menu, keyboard reorder on the handle and through Move Up/Down, Cmd/Ctrl-Z with redo, and a shortcut reference. Forgiving: Undo toasts that don't time out, Trash with Restore, live-saving forms, offline edits queued and counted. Fast: p75 101–113 ms. Below 9: the shortcut reference documents only the View list, not Playlist Entries or the row menu key; there's no keyboard shortcut to move a focused Entry without opening its menu or handle; and offline playback offers a retry that can't succeed. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **8.4** | It serves the primary task very well and is at home in a browser and in a Mac window. Cap: lowest category 6.9 + 2.0 = 8.9 (not binding). The weakness holding it down most is Clarity's capped error copy at the moment a phone user is most likely to hit it (no signal). After that come the desktop list measure and the repeated Timeline links, which keep Hierarchy and Spacing in Strong. | — |

### What stands between this and 9.0

1. **COPY-02 (the only major).** Fixing the offline playback error lifts Clarity from 6.9 to about 8.6, which on its own moves Overall to about 8.7.
2. **Desktop list measure.** Cap list content at about 760–840 px, or pull row actions next to the text column, on Playlist, View, Subscription and Search. That brings rows within a glance and matches the 640 px forms more closely (Spacing, Hierarchy).
3. **Listening Timeline.** Show "Rewind to here" on hover, focus or selection of a row (keep it always visible on touch), or make the time itself the control (Hierarchy).
4. **One drilled-page header.** Use the breadcrumb heading on the desktop Episode page too, with the parent being where it was opened from, and keep "‹ Views" for the phone (Consistency).
5. **Small finishing.** The sidebar section-heading selection should match the item style. Refine should remember its open state like the other disclosures. Close tooltips on drag end. Give the drawer's Chapter title row weight. Fit the zoomed drawer's main page in 450 px. Fix the Mac Undo label. Give truncated player-bar titles a tooltip on desktop. Use readable slugs for new Playlists and Views.

## Next step

- **Target:** COPY-02 (major) in Clarity, the lowest-scoring category.
- **Anti-pattern:** a generic error ("Something went wrong" family): the message reports failure without the cause the app already knows.
- **Root cause:** the player has one error string for every playback failure. It doesn't distinguish "offline and not downloaded" from a server or decode failure, so it can only offer a retry.
- **Change:** branch the player error on connectivity and download state. Offline and not downloaded: "You’re offline and this Episode isn’t downloaded", with **Play a downloaded Episode** (or open Up next). Other failures keep "Couldn’t play this Episode" and Try again. On the phone bar, use a short form that isn't truncated.
- **Principle:** `plain-language`, `feedback`.
- **Expected effect:** Clarity rises from 6.9 (capped) to about 8.6, and Overall to about 8.7. No signature element is touched: the red-on-slate error style (8.9:1) stays.
