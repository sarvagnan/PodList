# UI grade, round 34

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) at commit `2cf1123`, as a **web app**: an Android-first installable PWA. The macOS app is the same build in an Electron window (`packages/desktop/src/main.ts`), and its menus, context menus and window are judged under Platform fit.

Evidence:
- the round-34 flow run (`scratchpad/flows-r34`);
- my own probes of the built app on the seeded demo server and on the empty first-run server (`ui-flows/demo.mjs`), with Playwright Chromium (macOS arm64, no throttling);
- the Mac shell launched with Playwright `_electron` (Electron 44.9.3, from source).

Probe scripts (`p*.mjs`) and screenshots are in `scratchpad/grade-r34/`, and the Electron captures in `scratchpad/grade-r34/electron/`.

## Frame

- **Task:** find Episodes through Views and Search, put them in Playlists, and listen.
- **Target:** web app, in Android Chrome (installed PWA), a desktop browser, and the Mac app's Electron window. Mac IDs: N/A → target.
- **Posture:** sovereign on the desktop (an all-day listening tool); quick, glanceable sessions on the phone.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, for its calm lists, quiet chrome and finished states. BBEdit is the model for keyboard depth.
- **Character:**
  1. Space Grotesk headings over Inter rows *(owner)*.
  2. Blue `#2b50c8` as the single interactive accent *(owner)*.
  3. A dark player bar and a dark Now Playing drawer *(owner)*.
  4. Views and Playlists as equal halves, navigated by lists, never capsules *(owner, variant A)*.
  5. Plain copy that uses the domain's exact words ("Entries", "Clear on Played", "Rewind to here", "Kept: …").
- **Owner decisions:** light appearance only for now; layout A; Inter and Space Grotesk; blue primary; dark player; the chosen designs (View editor R, Playlist settings and Rewind C, Library C). I grade these but don't propose changing them.

## Flows

**Tasks run.**
- The flow run covered browse, listen, now playing, fresh device (a late catalogue arrival held 2 s) and second tab.
- My probes added:
  - removing Entries, with Undo and Redo;
  - deleting a Playlist, Trash and Restore;
  - Rewind;
  - the View editor, New View and a reload while editing;
  - Search;
  - Add podcasts: name search, a bad address, a 404 and a good feed;
  - first run;
  - offline, with and without the service worker;
  - Back with a dialog, sheet, drawer, drawer page and menu open;
  - right-click and a keyboard-opened context menu;
  - copy;
  - grid keyboarding;
  - 200% text, 320 px, text-spacing overrides, forced colours and reduced motion.

**Widths:** phone 412×915, zoomed desktop 720×450, desktop 1440×900, plus 320×640 and the Mac minimum window (720×450).

**Appearance:** light (the only one), plus forced colours.

**Timed runs:** 5 runs after a warm-up, desktop, no throttling, darwin arm64. "Open a Playlist" p75 is 115 ms and "Play from here" p75 is 102 ms. My lab Core Web Vitals over 5 cold loads of `/playlists/default`: LCP 236–372 ms, CLS ≤ 0.007.

**Files:** the script is `packages/web/ui-flows/flows.mjs`, the measurements are `flows-r34/measurements.json`, and the strips are in `flows-r34/strips/`.

**Failures: none.** No core element moved unprompted at any width. Focus and scroll stayed put. The late catalogue on a fresh Device filled skeleton rows in place (`contact-fresh-device.png`, steps 1→2). Focus didn't get lost while I arrowed down a 15-row list behind the sticky player bar (p29: at 1440, 720 and 412 px, the focused row was never under the bar). Scroll position came back on Back (p28: `HTML:500` before and after).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop / phone) | Toast at the bottom leading edge, above the player: "Plays next in Default" | None seen | None | Undo in the toast; ⌘Z or Ctrl+Z | Dashed card in the side panel: "Nothing up next" + a way on | None | Edit View, top trailing (phone: Edit) | Facts line under the h1 |
| Search | None | None | None | Toast | n/a | None | Save as View, top trailing | Scope line under the field: "Every word must appear in …" |
| Episode detail | Toast | None | None | Toast; ⌘Z | n/a | None | Play, a blue circle at the centre of the action row | None |
| Playlist, Entries | Toast: "Removed “X” from Workshop · Undo" | None | None | Toast; ⌘Z and ⇧⌘Z ("Undone: …", "Redone: …") | Dashed card: "Nothing here yet" + a link to Views | None | Play / Play this, top trailing | None |
| Playlist, Timeline | Toast: "Rewound Default to 14:30 · Undo" | None | Centred alertdialog: "Rewind Default to 14:30?" with Cancel / Rewind (focus on Cancel) | Toast; ⌘Z | n/a | None | Rewind to here, per event | An intro paragraph under the tabs |
| Playlist settings / Trash | Toasts: "Moved “Workshop” to the Trash · Undo" and "Restored “Workshop” · Undo" | None | None | Toast | Dashed card: "The Trash is empty" + an explanation | None | Delete Playlist at the foot; Restore on each row | "Deleted Playlists are kept for 30 days." |
| Library / Subscription | Toast | None | Centred alertdialog: "Unsubscribe from Slow Build?" with a red Unsubscribe and focus on Cancel | Toast | n/a | None | Add podcasts, top trailing; Subscription: Mark all Played and Unsubscribe | A sub-line on each row ("All defaults") |
| Add podcasts sheet | A result row with Subscribe | Red text directly under the field, with the field marked invalid; offline: "PodList couldn’t reach your server. Check that you’re online." | None | n/a | Blank under the field | None | Subscribe on each result | Hint under the field |
| Settings | Live apply, no toast | None | None | n/a | n/a | None | None | Hint under each control |
| Now Playing drawer, Up next | Toast | None | None | Toast | n/a | None | Play | None |
| App-wide offline | n/a | n/a | n/a | n/a | n/a | Banner above the player: "**Offline.** Changes will sync when you’re back online" | n/a | n/a |
| First run | Ticks in the checklist | None | None | n/a | Checklist card at the top of the first View | None | Add podcasts (blue) + Skip for now | The checklist itself |

**Mismatches:**
1. **The current Entry is labelled two ways.** The Playlist rows, the View's side panel and the desktop drawer's Up next mark it **"NOW"**: uppercase, blue, 12 px, semibold. The drawer's Up next page marks it **"Now"**: sentence case, muted grey, in the meta line (`d-queue.png` vs `d-playlist.png`; `NowPlayingDrawer.tsx:340`).
2. **The Subscription page's own actions move between widths.** On the phone, Mark all Played and Unsubscribe sit at the top (`p-sub.png`). At 1440×900 they sit under a seven-field settings card, below the fold (`d-sub.png`; a cut-off button shows at y≈810). FLOW-07 allows a move between widths, so this isn't a checklist failure, but at the desktop width the screen's only commands are out of sight.

## Checklist

**Coverage: 94%** (pass 91 · fail 3 · N/O 6 · N/A 5, out of 105 core and web IDs).

### Failures by severity

None of these is a blocker. All three are major.

**[WKEY-03] major: removing the last Entry of a Playlist leaves focus on `<body>`.**
- **Where:** the Playlist screen at every width, from the row's × button on the desktop and from its "…" › Remove from … on the phone.
- **Evidence:** p10 removed both Entries of Workshop with the keyboard. The first removal moved focus to the next row's × button. The second left `document.activeElement === body`, still 1.5 s later. p9 showed the same on the phone.
- **Root cause:** `useRowGrid` (`lib/rowGrid.ts:108`) hands focus to the heading only when the hook unmounts. On the Playlist page the hook lives on the route (`routes/playlists/$playlistId.tsx:61`), while the grid element is swapped for `<EmptyState>` (`:232`), so the hook never unmounts and the fallback never runs.
- **Fix:** send focus to the `main h1` when `grid.count` drops to 0 while focus was in the grid. Do it in `rowGrid`'s per-render effect rather than its unmount cleanup, or pass the Entries list's removal through `focusAfterRemoval(…)` (`lib/focusAfterRemoval.ts`), which already falls back to the heading. Then check the drawer's Up next page, which is built the same way.

**[WDATA-01] major: after a reload, the View editor's Name field shows the old name while the heading and sidebar show the saved one.**
- **Where:** the View editor (`/views/:id?edit=true`) at every width.
- **Evidence:** p14 typed " keepers" after "Starred", waited 150 ms and reloaded.
  - 0.3 s and again at 3 s after the reload: h1 "Starred keepers", Name field "Starred".
  - Typing "!" at the end of the field then saved "Starred!", which silently threw away " keepers".
  - `d-name-mismatch.png`; p11 got the same result at 1.2 s (`d-editor-reload.png`).
  - Playlist settings, given the same probe, kept its field in step (p14b).
- **Root cause:** `ViewForm.tsx:114` sets up `const [name, setName] = useState(current.name)` once, when the form mounts. When the flushed draft or another Device's edit changes the stored View after mount, the field never picks it up. The draft itself survived; the field didn't.
- **Fix:** keep the field in step with `current.name` while it isn't focused or dirty, for example with a `useEffect` on `current.name` that runs when `nameCommit` has nothing pending. Better still, initialise from the same draft store the heading reads. The other text field in the editor, Mentions, needs the same treatment.

**[BROWSER-07] major (Mac app only): the shell's text-field context menu has no spelling suggestions.**
- **Where:** every text field in the Electron window.
- **Evidence:** right-clicking "recieve teh" in a field gave only Cut, Copy, Paste and Select All. There were no suggestions, no Learn Spelling, no Look Up and no Undo/Redo. `main.ts:265` builds that menu and never reads `params.dictionarySuggestions` or `params.misspelledWord`. In Chrome the same field gets the browser's full menu.
- **Fix:** when `params.misspelledWord` is set, put `params.dictionarySuggestions` at the top of the editable menu, each running `webContents.replaceMisspelling`, then "Add to Dictionary" (`session.addWordToSpellCheckerDictionary`). Add Look Up "…" for a selection, and Undo/Redo roles. While in `main.ts`, change the page-background menu (`main.ts:287-290`) to Back and Forward only: Reload is a web tell in a Mac window (this part isn't scored).

### N/O

KEY-06, DLG-09, CTRL-08, DRAG-03, DRAG-05, DRAG-06.

### N/A

- TOOL-06 and SIDE-03: nothing can be hidden.
- START-05: there are no permission prompts. `navigator.storage.persist()` runs on the first download, and Chrome doesn't prompt for it.
- START-06 and START-07: there are no accounts.
- Mac IDs: N/A → target.

### Passes worth recording

These are the evidence for the scores.

**Keyboard (KEY-01, KEY-04, KEY-07, KEY-08, LIST-07, WKEY-01, WKEY-02, EDIT-02, EDIT-05, PTR-04):**
- Each Episode list is one Tab stop (an APG grid). Arrows move between rows and between a row's controls, and Home, End, type-ahead, Space (tick), Shift+arrow, ⌘A and Enter all work (p5).
- ⌘C on a row copies its URL (p5: the clipboard held `…/episodes/ep_66196…`).
- The 2 px `#2b50c8` focus ring turns white on the dark player bar.
- Tooltips appear on focus as well as on hover ("Play Last in Default", `grid-right2.png`).
- The single-key shortcuts ("/" and Space) can be turned off in Settings.
- ⌘K and ⌘/ are bound only on a Mac; elsewhere they're Ctrl+/ and "/", so Chrome keeps Ctrl+K (`AppShell.tsx:731`, `Shortcuts.tsx:13`).

**Overlays (WKEY-03, apart from the failure above; DLG-04):**
- The drawer traps Tab on the phone and returns focus to the bar.
- Esc and Back close every layer one at a time: a drawer page goes back to the drawer, then the drawer closes (p7).
- After the shortcuts dialog, focus returns to its opener ("Playlist settings", p24).

**Context menus (BROWSER-06):**
- Right-clicking a row title, which is a link, gets the browser's menu.
- Right-clicking the row's background gets the row menu, and the same menu opens from a keyboard `contextmenu` event on any non-link cell (p6, p6b).
- Every command in it is also a visible control.

**History and URLs (BROWSER-01 to BROWSER-04, BROWSER-09):**
- Tabs (`?tab=history`, `?tab=timeline`), the editor (`?edit=true`), the open Episode (`?episode=`) and Search (`?q=`) each have their own URL.
- The page title names the view ("Default settings · PodList").
- Navigation is real `<a href>` links. The phone gives every drill-in its own "‹ Back" link.

**Data (DATA-04, DATA-05, WDATA-02 to WDATA-04, DATA-06):**
- Undo and Redo work as ⌘Z and ⇧⌘Z, and the toasts say "Undone: …".
- Undoing a removal brings the row back and focuses it.
- Undo toasts stay up (still visible after 8 s).
- The offline banner tells the truth, and with the service worker the app works offline: Library loads and reloads, and Add podcasts explains the failure (p21c).
- Validation keeps what was typed (the 404 address stayed in the field).

**Appearance (APPEAR-03 to APPEAR-05, WCOLOR-01, WCOLOR-02):**
- Every visible text run on 9 routes plus the dark drawer, at 1440 and at 412, meets 4.5:1. The lowest secondary text is `rgb(92,96,112)` at 5.34–5.73:1, and NOW in blue is 5.82:1 (p3).
- Forced colours keep every control boundary, the selection and the ticks (`fc-*.png`).
- With reduced motion, the drawer's 300 ms slide becomes a 150 ms fade (p16).
- The page declares `color-scheme: light`.

**Type and sizing (WTYPE-01 to WTYPE-05):**
- At 200% text (CDP font size 32), the root follows to 32 px and nothing clips or scrolls sideways. The phone player bar drops ±15 to fit.
- At 320 px there's no horizontal scroll.
- The WCAG 1.4.12 text-spacing overrides clip nothing (p28).
- Every target is at least 24 px, or a 16 px checkbox that meets the spacing exception (p20).

**Dialogs (DLG-01 to DLG-07):**
- Delete Playlist and Remove don't ask first; they show an Undo toast.
- Rewind and Unsubscribe ask in an alertdialog. Each states exactly what is kept, focuses Cancel, and Unsubscribe's button is red.

**Lists and controls (LIST-03, LIST-05, CTRL-02):**
- The Library table sorts by column and reverses on a second click (with `aria-sort`).
- The header checkbox goes into its mixed state.
- The phone's "Settings for this podcast" disclosure stays open across a reload (p30).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.5** | A small, deliberate scale: Space Grotesk h1 30 px / h2 20 px; Inter rows 15 px/500, meta 13 px/400 in muted `rgb(92,96,112)`, uppercase section labels 12 px/600 with 0.08em tracking. Curly quotes, "…" and "×" throughout ("Add to a Playlist…", “Workshop”). Hierarchy comes from weight and colour before size. **Below 9:** the 3-line title clamp truncates mid-word at 320 px and 200% ("The quiet edge of the sola…", "What the Voyager records wer…", `w320_playlists_default.png`, `font200_playlists_default.png`), because the drag handle, 48 px artwork and two 44 px buttons leave about 90 px for the title. In the Mac window, rows read at web scale: 15–16 px body, 60–68 px rows. | `hierarchy`, `craft` |
| Hierarchy | **8.2** | Each screen leads with its h1 and one blue pill at the top trailing edge (Play, Add podcasts, Done). Chrome is quiet: the sidebar is plain text, and row actions appear on hover or focus. **Below 9:** at 1440 the Playlist's Entry rows stretch to about 1160 px, so the title sits about 870 px from its Play button and a hairline progress bar crosses the whole screen (`d-playlist.png`). The desktop Up next page is a 680 px column in a 1440×740 dark sheet that is mostly empty (`d-queue.png`). At the Mac app's minimum window (720×418 px of page), the title, facts and tabs take about 150 px and the player 80, leaving about 1.5 Entries in view (`electron/min-720x450-default.png`). The Subscription page's commands are below the fold on the desktop (inventory mismatch 2). | `content-first`, `hierarchy` |
| Spacing & density | **7.9** | One rhythm: 76 px Episode rows, 68 px Entry rows, 16/24 px gutters, and aligned leading edges between the sidebar, h1 and list. The phone is comfortable for touch (Android bottom tabs, 44–48 px targets). **Below 8:** the desktop density doesn't adapt to the width. Playlist rows stretch, the Subscription page's settings column stops at x = 1292 and leaves about 120 px of dead margin, and the drawer's Up next page floats in empty space. In the Mac window, 44 px round buttons and pill tabs are touch-scale (Mac L9). | `craft`, `hierarchy` |
| Color & contrast | **8.8** | Restrained: neutral warm-grey canvas, one blue for selection, focus, the primary action and NOW, and red only for destruction (Unsubscribe) and errors. All text measured ≥ 4.5:1, including the dark drawer. Forced colours are handled throughout. Status is never colour alone (✓ Played, ★, "NOW", and the Active dot carries the label "Active Playlist"). **Below 9:** a single appearance (owner decision), and the two looks for "Now" (inventory mismatch 1). | `color-restraint`, `accessibility` |
| Iconography | **8.6** | One outline set at a weight that matches the text. Phone actions are labelled (Played · Download · Play · Add · Star). Icon-only desktop row actions have tooltips on focus and specific labels ("Add to a Playlist…", "Move Joinery without screws"). **Below 9:** the "15" and "30" numerals inside the skip glyphs are 11 px (p3). Next and Last are text buttons in a row of icons, so the row action set mixes two forms. | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability 8.7) | Every state is designed: skeleton rows, dashed empty cards that each give a way on, toasts with Undo, red errors under fields, the offline banner, the first-run checklist, forced colours and reduced motion. **Stability 8.7:** no FLOW failures and no core movement at any width, and late arrivals fill skeletons in place. Two inventory mismatches keep it below 9. **Category below 9:** those mismatches, plus the stale View-name field that contradicts its own heading after a reload. | `craft`, `stability` |
| Clarity | **8.7** | Domain words are used exactly and consistently (Entry, Clear on Played, Rewind, Download Rule). Confirmations spell out consequences ("Kept: Entries you added or moved since…", "Downloads stay on your Devices."). Errors give a recovery ("Check it, or type the podcast’s name."). **Below 9:** after a reload the View editor shows two names at once, and the Rewind dialog's title can't tell apart events that share a minute (every seeded event reads 14:30). | `plain-language`, `feedback` |
| Platform fit | **6.9** (capped by BROWSER-07; 8.5 uncapped) | **Web: Looks 8.8, Behaves 8.9.** Real links and URLs for tabs, the editor and the open Episode. Back closes layers one at a time. The browser keeps its menus, Ctrl+K and zoom. The PWA works offline with the service worker. Material-style bottom tabs fit Android. **Mac window: Looks 7.4, Behaves 7.6.** A good menu bar: File, Edit with Undo/Redo named after the step, Controls, Go with ⌘[ and ⌘], Window, Help. Native row context menus with Copy Link. The window and the last view are restored. But: text fields have no spelling suggestions (the failure); the background menu offers Reload; Settings opens inside the main window; Help has no "PodList Help" documentation; a two-finger swipe doesn't go Back (only the three-finger `swipe` event is handled); and type and targets are at web scale. (L + 2B)/3 over both targets ≈ 8.5, capped at 6.9. | `conventions`, `discoverable-commands` |
| Interaction & feedback | **6.9** (capped by WKEY-03 and WDATA-01; 8.7 uncapped) | Keyboard-fluent: the grid with type-ahead, Shift+arrow ranges, ⌘A, ⌘C links, ⌘K, ⌘/, and Space for play. Undo and Redo work as shortcuts and in toasts. Destructive steps go to the Trash with Undo. Feedback is fast (p75 ≤ 115 ms, LCP ≤ 372 ms). Reduced motion is honoured, and the screen reader gets named controls (the scrubber reads "12:34 of 29:08"). Two major failures cap it: focus falls to `<body>` when the last Entry goes, and the View name field doesn't restore after a reload. | `keyboard-efficiency`, `forgiveness` |
| **Overall** | **8.0** | It serves the primary task very well, and it's at home in Chrome on Android and on the desktop. The cap is 6.9 + 2.0 = 8.9; the score sits below it because three major failures land on the behaviour people feel (a lost focus, a stale field, and spelling in the Mac app), and the desktop layout doesn't use a wide window as well as the phone layout uses a narrow one. The weakness holding Overall down most is the **two Interaction failures**. | — |

## Next step

- **Target:** WKEY-03, a major failure in the lowest-scoring category (Interaction & feedback, tied with Platform fit), and the one on the primary task: managing a Playlist.
- **Anti-pattern:** focus lost after a removal ("focus dropped to the page").
- **Root cause:** the grid's "the list went away" fallback (`lib/rowGrid.ts:108`) runs on hook unmount. On the Playlist route the hook outlives the grid element, which is swapped for `EmptyState` (`routes/playlists/$playlistId.tsx:232`).
- **Change:** in `useRowGrid`'s per-render effect, when `grid.count === 0`, the previously focused control is disconnected and focus is on `body`, focus `main h1` (with `preventScroll`). Add a regression test that removes the only Entry from the keyboard and expects the h1 to be focused, and run it on the drawer's Up next page too.
- **Principle:** `stability` (WKEY-03).
- **Expected effect:** Interaction & feedback's cap then rests on WDATA-01 alone. Fixing WDATA-01 next (`ViewForm.tsx:114`) and BROWSER-07 (`main.ts:265`) lifts both capped categories to about 8.5–8.7, and Overall to about 8.6.

## What stands between this build and 9.0

1. **The three majors above.** Each is a small, local fix, but together they hold two categories at 6.9.
2. **Desktop width discipline.** Give Entry rows a max width, or a right detail panel as Views have, so Play stays near the title. Bring the Subscription commands above the settings card on the desktop. Remove the drawer's separate Up next page on the desktop, where Up next already sits beside the player. At 720×450, compact the Playlist header: put the facts line beside the h1 and tighten the tabs, so at least three Entries show.
3. **The Mac window.** Add spelling suggestions, drop Reload from the context menus, add a real Help page, handle a two-finger swipe for Back (`app.on('swipe')` is three-finger only; use `webContents` `input-event` scroll gestures or `wheel` with `phase`), and consider desktop-scale rows and targets when `podlistApp` is present.
4. **Titles at narrow widths.** At 320 px and 200% text, drop the drag handle into the row's "…" menu (Move up/down already exist) or shrink the artwork to 40 px, so 3-line titles stop truncating mid-word.
5. **Inventory.** Use one "NOW" treatment, including the drawer's Up next page.
