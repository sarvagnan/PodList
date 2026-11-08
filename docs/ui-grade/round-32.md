# UI grade, round 32

Graded commit `9578b80` against `~/Documents/UI_Guidelines` (CRITIQUE.md, full audit), as a **web app**. This is an independent read: earlier rounds and the UI-GRADE.md work lists weren't consulted.

## Frame

- **Task:** keep a personal listening queue going. Find Episodes through Views and Search, put them into Playlists (Play Now, Next, Last), and listen through the player and the Now Playing drawer.
- **Target:** a web app, an Android-first installable PWA (manifest `display: standalone`). The macOS app is the same build in an Electron window (packages/desktop/src/main.ts), so its menus and native context menu are judged as part of Platform fit. Mac IDs: N/A → target.
- **Posture:** sovereign on desktop, an all-day companion on the phone. Transient moments (Add sheet, drawer) sit over it.
- **Audience:** perpetual intermediate. The app is one person's own podcast client.
- **Nearest exemplar:** Things, a calm personal tool: one list at a time, actions shown on hover or focus, Undo instead of confirmation.
- **Character (owner-fixed items marked ★):** ★ light warm-grey canvas (#f6f5f2) with ★ blue primary #2b50c8; ★ Space Grotesk headings over Inter; ★ the dark player bar and dark Now Playing drawer; ★ Views and Playlists as equal halves, navigated as lists rather than capsules; coloured initial-tile artwork; domain words capitalised (Episode, Playlist, Play Next).
- **Owner decisions:** light only until a dark theme is designed; layout A; Inter and Space Grotesk; #2b50c8; a dark player bar; the chosen designs (View editor R, Playlist settings and Rewind C, Library C). These were graded but aren't proposed for change. Rewind's confirmation dialog is part of design C.

## Flows

- **Tasks run:** browse, listen, now playing, fresh device (the catalogue held back 2 s), second tab. From the provided run, `flows-r32`.
- **Widths:** phone 412×915, zoomed desktop 720×450, desktop 1440×900, in Light (the only appearance).
- **Timed runs:** desktop, 5 runs after a warm-up, no throttling, darwin arm64. p75 was 111 ms for opening a Playlist and 99 ms for Play from here.
- **Files:** script `packages/web/ui-flows/flows.mjs`. Measurements in `…/scratchpad/flows-r32/measurements.json` (72 rows). Strips in `…/scratchpad/flows-r32/strips/<flow>/<width>/`.
- **Failures:** none. Core elements held within 2 px on every unprompted step: `fresh device` step 2 and `listen` steps 3 and 8 show `moves` of 0 for the heading, navigation and player. Focus went to the new view's `h1` on each view change.
- **Supplementary probes (this round),** Playwright 1.65 Chromium, scripts and captures in `…/scratchpad/grade-r32/`:
  - keyboard and focus (`kbd.mjs`, `kb2.mjs`, `ctxkb.mjs`);
  - Playlists, Rewind and Trash (`pl.mjs`);
  - phone sheets, drawer, Back and scroll (`ph.mjs`);
  - 320 px, 200 % text, forced colors and reduced motion (`adapt.mjs`);
  - text spacing (`spacing.mjs`);
  - contrast, text size and targets on 12 routes at phone and desktop width, plus the drawer (`scan.mjs`);
  - first run (`fr.mjs`), offline (`offline.mjs`), drafts and reload (`draft.mjs`, `close.mjs`), load frames (`cls.mjs`, `frames.mjs`), Core Web Vitals (`perf.mjs`);
  - the Electron shell (`el.mjs`).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop and phone) | Toast above the player, dark: “Starred”, “Removed “X” from Default” | — | — | Toast action **Undo** (stays until replaced), ⌘Z/Ctrl+Z | Welcome checklist card on first run; “Nothing up next” card in the target panel | — | **Edit View** trailing in the header (phone: **Edit**) | First-run card; the meta line states the rules (“Last 7 days · Unplayed · Newest first”) |
| View editor | Live preview; “Matches 6 Episodes now” | — | — | ⌘Z; Delete View gives a toast with Undo | — | — | **Done**, trailing in the header | “Every row must match. Rows left at “Any” don’t narrow anything.” |
| Search | Result count line | — | — | — | “Search your Library” card | — | **Save as View**, trailing | Scope text under the field |
| Episode detail | Button state flips (Downloaded, Played) and a toast with Undo | — | — | Toast | — | — | **Play**, centred in the action row | — |
| Playlist (Entries, History, Timeline) | Toast with Undo; a live region announces moves | — | Rewind: modal, “Rewind Default to 09:54?” with Cancel / Rewind | Toast, ⌘Z | “Nothing here yet / In a View, use Play Next or Play Last…”; History: “Nothing finished yet” | — | **Play / Play this**, trailing in the header | Timeline intro paragraph |
| Playlist settings | “Saved as you type.” under Name | Inline under the field: “A Playlist needs a name.” (`aria-invalid`) | — | Delete gives a toast, “Moved “X” to the Trash”, with Undo | — | — | Delete Playlist at the foot | Help text per row |
| Trash | Restore | — | — | — | “The Trash is empty” card | — | **Restore** per row | “Deleted Playlists are kept for 30 days.” |
| Library and Subscription | Toast | — | Unsubscribe: modal, destructive red | — | “No Subscriptions yet” card | — | **Add podcasts**, trailing, primary | — |
| Add podcasts sheet | Preview, then **Subscribe** | Inline under the field: “This address didn’t give a podcast feed. Check it, or find…” | — | — | “No podcasts found. Try other words.” | — | Subscribe | Hint under each field |
| Player and drawer | — | Player subtitle “Not downloaded” plus a polite announcement; offline banner above the player | — | Toasts move inside the drawer | — | Offline banner: “Offline. 1 change will sync when you’re back online” | Play/Pause, centred | — |

**Mismatches (minor):**
1. One empty Playlist gets two headings and two instructions. The Playlist page says “Nothing here yet — In a View, use Play Next or Play Last to add Episodes here”. The desktop target panel and first run say “Nothing up next — Use Next or Last on an Episode to add it here”.
2. Empty-state headings follow three patterns: “Nothing … yet”, “No … yet”, and “The Trash is empty”.

Waiting questions are consistent: both are centred modals, Cancel takes initial focus, and the destructive one is red. Main actions are consistent: trailing in the header at every width (FLOW-07 passes).

## Checklist

**Coverage: 97.0 %** (pass 94 · fail 2 · N/O 3 · N/A 6; 99 applicable of 105 core and web IDs). Mac IDs: N/A → target.

### Failures by severity

**Blocker**

- **[DATA-01] An edit typed in the last 500 ms is lost to a reload, a closed tab or quitting, while the field says “Saved as you type.”**
  - **Where:** Playlist settings › Name (`routes/playlists/$playlistId_.settings.tsx:51,110`). The same hook drives View editor › Name and Mentions (`components/views/ViewForm.tsx:126,196,297`).
  - **Evidence:**
    - `close.mjs`: Commute's settings, typed “!”, tab closed after 0 / 250 / 450 / 700 ms, reopened. Results: “Commute” / “Commute” / “Commute” / “Commute!”.
    - `draft.mjs`: typed “ evenings” and reloaded 300 ms later; the name was back to “Workshop”. With 1500 ms it was kept.
    - The View editor's Name lost “Short ones” the same way at 300 ms.
    - Cause: `lib/useDebounced.ts` holds the value in a 500 ms timer and flushes only on blur and on React unmount. Nothing flushes on `pagehide` or `visibilitychange`, and nothing runs before the Electron window quits.
    - The same defect makes the status line untrue (WDATA-02). It's recorded once, here, because core-checklist routes “work lost to a reload, a closed tab” to DATA-01.
  - **Fix:**
    - In `useDebounced`, add `pagehide` and `visibilitychange` (when `document.visibilityState === "hidden"`) listeners that call `flush(pending.value)` synchronously.
    - If the local-DB write is async, put the pending change in a synchronous outbox (for example `localStorage`) that the sync engine drains on the next start.
    - Until the commit lands, show “Saving…” rather than “Saved as you type.”
    - Add a regression test that closes the page 100 ms after typing.

**Major:** none.

**Minor**

- **[APPEAR-11] Loading frames show empty section shells and a wrong count.**
  - **Where:** the desktop sidebar on every load; the Default Playlist row on a fresh Device.
  - **Evidence:**
    - `frames.mjs` at 4× CPU, warm reload. For about 115 ms the sidebar reads “VIEWS | PLAYLISTS | Library…”: both headings with nothing under them. Then the lists fill in.
    - Cold load (a fresh Device): “PLAYLISTS | Default | 0” for about 120 ms, then “Default 4”. That's a contradictory count.
    - `cls.mjs` lists layout-shift sources: the “Playlists” heading moves y 268 → 154 → 268 px, and the phone bottom stack grows from 74 to 138 px tall when the player mounts at 882 ms.
    - CLS stays within “good”: 0.037 on desktop, 0.084 on a throttled phone (`perf.mjs`).
  - **Fix:** render the sidebar's Views and Playlists from the same local snapshot the main area waits on, so both appear in one frame. Until then, hold three skeleton rows under each heading, as the main list does, and leave counts blank until they're known. On the phone, reserve the player's 64 px when a current Episode is known in local state.

### N/O
DRAG-05, DRAG-06, FOOT-02.
- DRAG-05: drag visuals weren't observed with a pointer drag.
- DRAG-06: the dnd-kit autoscroll default is assumed but wasn't exercised.
- FOOT-02: the demo lists are 2–6 rows long, so long-list scrolling couldn't be measured.

### N/A
- START-04, START-05: no permission prompts.
- START-06, START-07: no accounts.
- TOOL-06, SIDE-03: no hideable toolbar or sidebar.

### Passes worth recording (evidence)
- **Keyboard**
  - Tab order runs Skip to content → Search → sidebar → header actions → Playlist tabs → one stop into each list → player.
  - Lists follow the APG grid pattern: ↑↓ move by row, ←→ move between a row's actions, Home/End, PgUp/PgDn, type-ahead (“j” → Joinery), Enter opens. Space selects; ⌘A selects all; ⌘C on a row copies its URL and confirms “Link copied”.
  - The drawer traps focus (40 Tabs, all inside it). Esc returns focus to the “Open Now Playing” button.
  - Removing an Entry moves focus to the next row's Remove; Undo brings the row back and focuses its title.
  - Focus ring: 2 px #2b50c8 with a 2 px offset.
  - Single-key shortcuts can be turned off in Settings and never fire in fields: “/” typed into Search gave “a /b ”.
- **Browser**
  - Real links throughout. Playlist tabs, Library sort, Search refinements and the View editor are all in the URL (`?tab=timeline`, `?sort=unplayed-desc`, `?q=…`, `?edit=true`) and survive reload.
  - Back closes the drawer, the Add sheet and dialogs before it leaves the view, and it steps back through the drawer's pages.
  - Scroll is restored after Back (39 → 39).
  - The tab title names the view (“Default Listening Timeline · PodList”).
  - Right-click on links keeps the browser's menu; rows get a menu of task commands, also reachable from the row's buttons and the Episode page.
  - The phone uses the browser's long-press menu.
- **Adaptation**
  - No horizontal scroll at 320 px. At 200 % text the layout reflows; the player drops back 15 s and the queue button, which stay in the drawer.
  - WCAG text-spacing overrides cause no clipping.
  - Forced colors give every control a boundary and the selected row an outline.
  - Reduced motion turns the drawer's slide into a 150 ms fade.
  - No text contrast failures on 12 routes or in the dark drawer. No text under 12 px. No target under 24 px except checkboxes and in-row links, which pass under WCAG 2.5.8's spacing exception, and the Clear on Played checkbox, whose label is part of its target.
- **Data and feedback**
  - Undo toasts stay until replaced (`timeout: 0`). ⌘Z and ⇧⌘Z work, and the Mac Edit menu names the step (“Undo “…””).
  - Offline, a banner says how many changes wait to sync; playing an Episode that isn't downloaded says why.
  - Validation keeps the input and marks the field `aria-invalid`.
  - Deleting a Playlist goes to Trash with Undo; deleting a View gives Undo.
  - The Library's select-all checkbox shows a mixed state.
- **Performance (lab)**
  - Desktop, unthrottled: LCP 104–376 ms.
  - Phone at 4× CPU, 150 ms latency: LCP 404–1408 ms, CLS ≤ 0.084.
- **Mac shell**
  - Full menu bar: Settings… ⌘,, File (New Playlist ⌘N, New View ⇧⌘N, Add Podcasts… ⇧⌘A), Edit (Undo/Redo name the step, Find ⌘F), View (zoom, full screen), Controls (Space, ⌘←/→, ⌥⌘←/→, which don't take over keys in fields), Go (⌘1–3, ⌘K, ⌘[ ⌘]), Window, Help (Getting Started, Keyboard Shortcuts ⌘/).
  - Rows get a native context menu (5 rows carry `data-row-menu`). The window title is the view without the app name, and window bounds are restored.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | One small scale: Space Grotesk 30 / 20 / 18 headings, Inter 15 / 13 / 12; caps section labels at 12 px with 0.96 px (8 %) tracking; times like “16:34 left” and “−16:34” in tabular figures; curly quotes and the ellipsis character in app text. Below 9 because there are 16 size/weight pairs across six screens, with list titles at 15 px in three weights (400, 500, 600) depending on screen. At 320 px, Entry titles clamp to three lines of about 10 characters (“The quiet / edge of / the sola…”). | hierarchy, craft |
| Hierarchy | **8.5** | Title top-leading, the main action trailing in every header; secondary row actions appear on hover or focus, as in Things; the sidebar recedes. Holding it below 9: the dark player bar and a tinted Play circle on every row (five blue discs in a View, plus the header's Play) give the accent many competing focal points. The player is owner-fixed; the per-row tint isn't. | content-first, hierarchy |
| Spacing & density | **8.4** | Consistent 8-px rhythm; rows 68–76 px on the phone and about 66 px on desktop; the right panel and the list share a top edge (FLOW-05). Gaps: at 320 px the Entry row gives the title only about 70 px, after the handle, artwork, Play and More (w320_playlists_default.png). The desktop Episode page leaves about 540 px of the 1440 width empty, with the action row left-aligned. The phone Subscription page sets a grey pill (“Mark all Played”) beside a bare red text button (“Unsubscribe”). | craft, conventions |
| Color & contrast | **8.7** | Restrained: one blue for primary, selection (3 px inset bar plus tint), focus and the NOW label; artwork colours stay in content. No measured text failures in light or in the dark drawer; forced colors handled; `color-scheme: light` declared. APPEAR-11 is minor and caps nothing. Below 9: the selected segment of Entries / History / Listening Timeline is white on a #ECEBE6 track (about 1.2:1), with a 1 px ring at 40 % alpha, so it reads mainly by weight (500 → 600) and text colour. | color-restraint, accessibility |
| Iconography | **8.6** | One Lucide set at matching stroke weight, custom 15 / 30 seek glyphs that carry their numbers, every icon-only control named and tipped on hover and focus (`Tip`, 28 uses). Below 9: the same gear stands for app Settings (phone Library tab), Playlist settings and Subscription settings, so on the phone app Settings is an unlabeled gear on one tab. | conventions, plain-language |
| Consistency & polish | **8.5** (stability 8.6) | Hover, focus, pressed, disabled, empty, loading (skeletons), error, offline and overflow states are all designed. Flows hold the core still at three widths. Below 9: empty sidebar shells and “Default 0” during load (APPEAR-11), and the two inventory mismatches in empty-state wording. Stability 8.6: no flow failures, one message-wording mismatch, one load-time shell. | craft, stability |
| Clarity | **8.6** | Domain vocabulary is used exactly (Play Next / Play Last, Entry, Cursor shown as NOW / RESUME / HERE), labels are specific (“Rewind to here”, “Delete Playlist” with “It goes to the Trash with its History…”), and confirmations name objects (“Removed “Joinery without screws” from Default”). Below 9: “Saved as you type.” isn't quite true (the DATA-01 window). On desktop the toolbar says “Next and Last go to”, while the Next and Last buttons it refers to stay hidden until hover or focus. Phone Settings are found only through the Library tab's gear. | plain-language, discoverable-commands |
| Platform fit | **8.8** | Looks 9.0: the page fills the viewport, reflows to 320 px, uses native selects and fields (feed address `type=url`, `autocomplete=url`), and shows ⌘ only on Apple devices. Behaves 8.7: every view and filter has a URL, Back closes overlays before leaving, links are real, the browser's menus are kept on links and text, the Mac shell has a complete menu bar. The deduction is reload or tab close dropping a just-typed rename, which is a “reload surprises” tell. (9.0 + 2 × 8.7) ÷ 3 = 8.8. The Platform-fit groups (Lists, Alerts, Edit commands, Windows, Settings, Browser frame) have no failures. | conventions, stability |
| Interaction & feedback | **4.9** (capped; 8.8 before the cap) | Keyboard-fluent APG grids with type-ahead, reorder by keyboard with a live announcement, Undo on every edit (toast and ⌘Z / ⇧⌘Z), focus restored after removals, 99–111 ms p75 responses. **Capped at 4.9 by the DATA-01 blocker** (Documents & data safety maps to this category). | forgiveness, keyboard-efficiency, feedback |
| **Overall** | **6.9** (capped) | The design is close to its 9.0 target: before the cap it would sit near 8.6, held below Exemplary by the craft gaps below. The rubric limits Overall to 2.0 above the lowest category (4.9), so it is **6.9**. The single weakness holding it down is the unflushed 500 ms debounce on text edits, a small fix. | — |

## Next step

- **Target:** DATA-01 (blocker), in the lowest category, Interaction & feedback. It sits on the edit path of Playlist settings and the View editor.
- **Anti-pattern:** a save status that doesn't tell the truth: the app shows “Saved” before the save has happened.
- **Root cause:** `useDebounced` (lib/useDebounced.ts) keeps the pending value only in a timer. It flushes on blur and unmount, but not when the page is hidden or unloaded, so a reload, a closed tab, a PWA swiped from Recents or quitting the Mac app inside 500 ms drops the edit.
- **Change:**
  - On `pagehide` and on `visibilitychange` to hidden, synchronously flush every pending debounced commit, through a synchronous outbox if the database write is async.
  - Show “Saving…” while a commit is pending.
  - Add a test that closes the page 100 ms after typing.
- **Principle:** forgiveness (`DATA-01`); save status tells the truth (`WDATA-02`).
- **Expected effect:** the cap lifts. Interaction & feedback goes to about 8.8, and Overall to about 8.6, with no category worse and no signature element touched.

### What stands between this build and 9.0 (after DATA-01)
1. **Load frames (APPEAR-11):** draw the sidebar lists in the same frame as the main list, or give them skeleton rows, and never show a count before it's known.
2. **320 px Entry rows:** give the title more than 70 px. At the narrowest width, drop the More button (its commands are in long-press and on the Episode page) or shrink the artwork from 40 to 32 px, so titles keep about 20 characters per line.
3. **Selected segment:** give the active tab of Entries / History / Listening Timeline a boundary of at least 3:1 (for example a 1 px #8c877e ring, or a 2 px accent underline), so the state doesn't rest on weight alone.
4. **One empty-Playlist message:** use the same heading and instruction on the Playlist page, the desktop Up next panel and first run, and one heading pattern for all empty states.
5. **Accent load per View:** tint only the focused or hovered row's Play disc (the rest neutral, like the other row actions) so the header's Play stays the one blue focal point.
6. **Discoverability:**
   - On desktop, show Next and Last at low emphasis on every row, or reword the toolbar to “Play Next and Play Last go to” with a one-line hint.
   - On the phone, label app Settings (“Settings” text, or a row on the Library page) instead of a bare gear that also means Playlist and Subscription settings.
7. **Type:** settle list titles on one weight, 500, everywhere, and keep 600 for selection and headings.
8. **Mac window:** Settings… ⌘, could open its own small window rather than navigating the main one. This is a Mac-window refinement; the web target doesn't require it.
