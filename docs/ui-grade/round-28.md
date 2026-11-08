# UI grade, round 28

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md, full audit) at commit `528aab5`, with no earlier round or work list read. Browser: Playwright Chromium (headless), darwin arm64, no throttling. Widths: phone 412 × 915 (DPR 2, touch), zoomed desktop 720 × 450, desktop 1440 × 900, plus 320 × 640 for reflow. Mac shell: `packages/desktop` launched with Playwright `_electron` against the same demo server.

**Overall 8.4.** Interaction & feedback is capped at 6.9 by one major failure (WKEY-04).

## Frame

- **Task:** find Episodes through Views and Search, then listen to them through Playlists: queue them, play, resume, and reorder.
- **Target:** a web app. It is an Android-first installable PWA, and the same build runs in an Electron window on the Mac, whose menus and context menus were judged from `main.ts` and a live launch.
- **Posture:** sovereign on a desktop window, where it is open all day beside other work; short, frequent sessions on the phone.
- **Audience:** a perpetual intermediate who listens to podcasts every day.
- **Nearest exemplar:** Things, a calm personal tool with a plain domain vocabulary.
- **Character:**
  - Space Grotesk titles over Inter text *(owner)*;
  - one blue accent, #2b50c8, on a warm off-white page (#f6f5f2) *(owner)*;
  - a dark player bar and Now Playing drawer *(owner)*;
  - navigation by lists, with Views and Playlists as equal halves (variant A) *(owner)*;
  - capitalised domain nouns (View, Playlist, Entry, Played) in plain sentences;
  - round, tinted Play buttons.
- **Owner decisions:**
  - light appearance only (WCOLOR-01 passes as a single theme);
  - layout A;
  - the designs in `docs/design/ui-layout.md`: View editor R, Playlist settings and Rewind C, Library C;
  - the segmented Entries / History / Listening Timeline control.

## Flows

**Flow run supplied for this build** (`scratchpad/flows-r28`):
- Tasks: browse, listen, now playing, fresh device, second tab.
- Widths: phone, zoomed and desktop, in Light only (dark isn't designed). Late arrivals were held 2 s.
- Stability failures: **none**. Every FLOW-01/02 row in `measurements.json` is within 2 px or caused by the person.
- Timed runs (desktop, 5 runs): *open a Playlist* p75 127 ms; *Play from here* p75 97 ms. RESP-01 passes.

**My own probes** (scripts in `scratchpad/grade-r28/`, shots in `grade-r28/shots/`):

| Probe | What it covered |
|---|---|
| `tour.mjs` | Every route, at desktop and phone |
| `probe-audit.mjs` | Contrast of every visible text node, every target size, and horizontal overflow, on 12 screens plus the drawer |
| `probe-keys.mjs` | Tab order, grid arrows, the row menu by right-click and the ContextMenu key, ⌘C on a row, removing a row and the focus after it, Undo and ⌘Z, and the dialog focus trap |
| `probe-phone.mjs` | Back with the drawer, the Add sheet and a queue page open; the More menu and reordering; scroll restoration; the phone View editor |
| `probe-misc.mjs` | Forced colours and reduced motion; 200% text at three widths; 320 px; accessible names |
| `probe-flows.mjs` | First run on an empty server; Add podcasts with a bad, a 404 and a good feed address; the desktop View editor; Listening Timeline, the Rewind confirmation, Delete Playlist, and Trash › Restore; offline playback |
| `probe-toast*.mjs` | A persistent Undo toast while a sheet or dialog is open |
| `probe-typing.mjs`, `probe-aria.mjs` | Typing while saves and late results land (FLOW-03) |
| `probe-spacing.mjs` | The WCAG 1.4.12 text-spacing overrides |
| `probe-vitals.mjs` | Lab LCP and CLS |
| `probe-mac.mjs` | The Electron menu bar, window minimum size, and the Undo label |

**Flow failures:** none. FLOW-03 was probed by typing while saves landed:
- Playlist name typed at 180 ms per key: `"Commute drive home"` was kept.
- View editor Mentions, typed, then a Backspace, then typed again: `"shipping"` was kept.
- Search: `"price ri"` survived a reload through `?q=`.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop) | Dark toast, bottom-left of main: "Playing next in Default" | Not seen | None | Undo in the toast, and ⌘Z | Dashed card: "No Episodes match this View · Set a row back to "Any" to widen it." | None | Play on each row; Edit View top-right | Help line under the editor's rows |
| View (phone) | Toast above the player | Not seen | Add sheet (choose a Playlist, then Next or Last) | Undo in the toast | Same dashed card | None | Edit, top-right | Same |
| Playlist | Toast: "Removed "…" from Default" | Not seen | None | Undo in the toast; ⌘Z puts focus back on the row | Dashed card (History: "Nothing finished yet…") | None | Play / Pause / Play this, top-right | Intro paragraph on Listening Timeline |
| Listening Timeline › Rewind | Toast after the Rewind | Not seen | Modal: "Rewind Commute to 14:30?", with Cancel focused | Undo in the toast | Dashed card | Rewind dialog | Rewind to here, on each row | The dialog's "Kept: …" line |
| Playlist settings | "Saved as you type." help line | Not seen | None (Delete goes to the Trash with an Undo toast) | Undo in the toast | Not applicable | None | Delete Playlist (red text, bottom) | Help line under each row |
| Library | Toast | Not seen | Bulk bar in the header: "3 selected · Downloads [Entries] · Apply to 3" | Toast | Dashed card | None | Add podcasts, top-right | Subtitle: "downloads and settings for this Device" |
| Subscription | Toast: "Unsubscribed from X" (4 s, no Undo) | Inline under the dialog's buttons when offline | Unsubscribe dialog (destructive) | None, by design: confirmed in a dialog | "New Episodes appear when…" | None | Episode rows | Help line under each settings row |
| Add podcasts | The button becomes "Subscribed" | Inline red text under the field: "Enter the whole address, starting with https://" | None | Not applicable | "No podcasts found. Try other words." | None | Subscribe | Help line under the field |
| Player and drawer | Not applicable | Inline in the bar ("Not downloaded", in danger colour) with the full sentence in the drawer; Try again where retry applies | None | Not applicable | Not applicable | Offline strip above the player | Play/Pause in the centre | Not applicable |
| First run | Steps tick off | Not applicable | Not applicable | Not applicable | It is the empty state | None | Add podcasts | Three numbered steps; Skip for now becomes Done |

**Mismatches:**

1. **Toast layer against overlays.** In the Now Playing drawer, toasts move into a strip the drawer keeps free. Over every other modal (the phone Add sheet, the desktop Keyboard shortcuts dialog) they stay in the page's own layer at z-60, *on top of* the modal's content. Screens: View (phone) with the Add sheet; any screen with the Shortcuts dialog. One kind of message has two different places, and one of them collides; it is the WKEY-04 failure below.
2. **The Download Rule has three names.**
   - The Library table and Subscription select: "Stream · Entries · Every new Episode".
   - The Library row menu: "Stream · Download Entries · Download Every New Episode".
   - The phone summary: "Streams", and the group heading "STREAMS · 3".
   - Screens: Library, Subscription. Recorded as COPY-01.
3. **The way back differs on desktop.**
   - Subscription and Playlist settings put a breadcrumb in the title ("Library › Deep Field", "Commute › Playlist settings"), with the parent at title size in grey.
   - Episode uses a small "‹ Views" link above the title.
   - Craft only; each works with Back.

## Checklist

**Coverage: 93.9%.** Pass 91 · fail 2 · N/O 6 · N/A 6 (105 IDs: 79 core and 26 web). Mac IDs: N/A → target.

### Failures by severity

**Major**

- **[WKEY-04] A persistent Undo toast covers the focused choice in the phone's Add to a Playlist sheet.**
  - **Where:** a View on the phone (412 × 915), during the core finding task.
  - **Steps:** tap **+** on an Episode, then **Play Next**. The confirmation toast "Playing next in Default · Undo" has `timeout: 0` (`useConfirm.ts`), so it stays. Then tap **+** on the next Episode.
  - **Result:** the sheet opens with focus on the preselected *Default* radio, at (28, 751), 16 × 16 px, in a row at (20, 735, 372 × 48). `document.elementFromPoint` at the radio's centre returns the toast. The toast viewport (`Toasts.tsx`) is fixed at `z-[60]` above the sheet.
  - **Effect:** the focused element and the Active Playlist's row, the choice the sheet exists for, are fully hidden. The toast's own Undo sits outside the sheet's focus trap.
  - **Evidence:** `probe-toast2.mjs` output; `shots/phone-toast-over-dialog.png`.
  - **The same root cause on desktop:** an "Undone: …" toast lies over the Keyboard shortcuts dialog's rows (`shots/desktop-shortcuts.png`).
  - **Fix:** whenever a modal dialog or sheet is open, do what the drawer already does:
    - portal the toast viewport into the open dialog, in a strip the dialog keeps free above its footer; or
    - set `bottom` to the sheet's top edge, so the toast sits above the sheet; or
    - make the page's toasts inert and hidden behind the modal (`aria-hidden`, `inert`) and show them again when it closes.

    Keep ⌘Z working throughout. Then add a flow step: Add → Play Next → Add again, asserting that the focused element is not covered.

**Minor**

- **[COPY-01] The Download Rule is named three ways, and one name doesn't say what it does.**
  - **Where:**
    - `LibraryTable.tsx` `ruleOptions`: "Stream / **Entries** / Every new Episode";
    - `routes/library/index.tsx` row menu: "Stream / **Download Entries** / Download Every New Episode";
    - `routes/library/$subscriptionId.tsx` select: "Entries";
    - the phone row summary "Streams" and group heading "STREAMS".
  - **Problem:** "Entries" alone, in a column headed DOWNLOADS, reads as a count or a list, not as "download Episodes while they're in a Playlist". The meaning appears only in the Subscription page's help line ("Stored while they're in a Playlist").
  - **Fix:** use one label set everywhere, built on CONTEXT.md's own wording: "Stream", "While in a Playlist", "Every new Episode". Menus may prefix them with "Download …" but keep the same nouns. Make the phone group headings the same words.

### N/O
CTRL-02, CTRL-08, DRAG-05, DRAG-06, PTR-03, FOOT-02.
- The bulk "Select every podcast" mixed state wasn't exercised.
- No downloads were run.
- No pointer drag was performed.
- The demo lists are too short for a scroll-performance test.

### N/A
- LIST-05: there are no outlines.
- START-05: the app asks for no permission.
- START-06 and START-07: there are no accounts.
- TOOL-06: there is no hideable toolbar.
- SIDE-03: the sidebar can't be hidden.

### Passes worth noting, with evidence

- **BROWSER-01, BROWSER-02 (Back and URLs).**
  - On the phone, Back closes a drawer page, then the drawer, then the Add sheet, without leaving the screen.
  - The Episode panel (`?episode=`), Playlist tabs (`?tab=`), the View editor (`?edit=true`), the Search query (`?q=`) and the Library sort (`?sort=`) each survive a reload.
  - Arrow keys in the View list replace the history entry rather than pushing one.
- **BROWSER-06 (context menus).**
  - The custom menu appears only on rows. A title link keeps the browser's menu.
  - The ContextMenu key opens the row menu (`probe-keys.mjs`).
  - Every command is also a visible control: hover and focus reveal Next, Last, Add, Star, Played and Download; the phone has a More menu.
- **WKEY-01 (the Episode list as an APG grid).**
  - The list is one Tab stop.
  - ↑ and ↓ move between rows, → moves between a row's actions, and Home, End, PgUp and PgDn work.
  - Typing jumps to a title, and ⌘A ticks every row.
  - The Tab order runs: skip link → sidebar → header → list → Up next → player.
- **WKEY-03, FLOW-02, DATA-05 (focus).**
  - Removing a row moves focus to the next row's Remove.
  - Undo puts focus on the restored row.
  - Esc returns focus to the opener of each dialog and of the drawer.
  - A view change focuses the new heading.
- **RESP-01, BROWSER-10, APPEAR-11 (speed).** p75 127 ms and 97 ms. Lab LCP is 124–284 ms and CLS is ≤ 0.011 on six cold loads.
- **APPEAR-03, APPEAR-04, APPEAR-05, WCOLOR-02 (contrast, colour and motion).**
  - No text below 4.5:1 on any of the 13 screens audited, the dark drawer included.
  - Forced colours keep boundaries, selection and the progress line.
  - With reduced motion on, no element animates position.
  - The focus ring is #2b50c8 at 2 px.
- **WTYPE-02 to WTYPE-05 (text size and reflow).**
  - 200% text at desktop and phone width: no clipping and no horizontal scroll.
  - 320 px: no horizontal scroll.
  - The text-spacing overrides: no clipping.
  - All targets are ≥ 24 px, or 16 px checkboxes inside 40 px labels.
- **DATA-04 (undo).** ⌘Z and ⇧⌘Z work, with a depth of 30. The Mac Edit menu names the step: "Undo "Removed '…' from Default"".
- **AX-04 (moves without a drag).** Move to Top, Move Up, Move Down and Move to Bottom on every Entry, and drag announcements for screen readers.
- **COPY-02, WDATA-03 (errors).**
  - The feed address gets "Enter the whole address, starting with https://", then "This address didn't give a podcast feed. Check it, or find the podcast by name with Search."
  - Offline: "Not downloaded" in the bar, and a full sentence on how to recover.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | **Strengths.** Space Grotesk for titles at 28 px, Inter for rows (15 px), metadata (13 px) and letter-spaced 12 px caps labels. Weight and muted colour carry the hierarchy, and type alone tells the structure. Curly quotes and the ellipsis character throughout, and tabular figures in the player.<br>**Below 9.** The phone mini-player gives the title about 13 characters ("The long life o…", with "Market Hours ·…" under it) while four 44 px controls take the rest. At 200% text the glyphs stay at their px size: the 16 px search icon sits beside 32 px text. | `hierarchy`, `craft` |
| Hierarchy | **8.5** | **Strengths.** One tinted main action per screen, at top-right (Play / Play this / Add podcasts / Done). Secondary row actions appear on hover or focus, and chrome recedes.<br>**Below 9.** At 1440 px, desktop Playlist and Timeline rows stretch about 1,170 px, so Play and Remove sit about 900 px from the title, and "Rewind to here" repeats in grey on every Timeline row. On the phone the bottom stack (player and tabs) takes about 260 of 915 px. Breadcrumb titles set the parent ("Library", "Commute") at title size, so two titles compete. | `content-first`, `hierarchy` |
| Spacing & density | **8.4** | **Strengths.** A consistent 4 px grid. Rows of 56–68 px suit the touch-first posture and remain fine on desktop. Edges align from header to list to panel (FLOW-05 passes).<br>**Gaps.** Content width varies by screen:<br>• Settings and Playlist settings cap at 640 px;<br>• the Episode page uses about 640 px and leaves about 500 px empty;<br>• Playlist Entries, Timeline and Library run the full width.<br>Also, on 1440 px desktop the Playlist row's progress bar runs 800 px. | `craft`, `hierarchy` |
| Color & contrast | **8.8** | **Strengths.** Nearly monochrome: one blue for action, selection and progress, green for Played and amber for Star, each paired with a shape (check, star, NOW, a dot or waveform for Active). No contrast failures were measured, the dark drawer included, and forced colours are handled.<br>**Below 9.** Played rows dim the title to muted, so they read as disabled. Light-only is an owner decision and caps nothing. | `color-restraint`, `accessibility` |
| Iconography | **8.6** | **Strengths.** One Lucide family at matched stroke, with custom 15/30 skip glyphs. Every icon-only control has a tooltip, also on focus, and a name.<br>**Gaps.** The same ListMusic glyph means both "Playlists" (a tab) and "Up next" (the queue). The drawer's "Episode" button uses a book. A filter funnel stands for Views (fair, but abstract). | `conventions`, `craft` |
| Consistency & polish | **8.4** (stability 9.0) | **Strengths.** Empty, loading, error, offline, forced-colour and 320 px states are all designed. One toast style, and one dashed empty-state card.<br>**Gaps.**<br>• Toasts sit above modal sheets and dialogs (mismatch 1, and WKEY-04).<br>• Playlist settings' Clear on Played checkbox is the native 13 px while every other checkbox is 16 px (`accent-primary size-4`).<br>• The way back differs on desktop (mismatch 3).<br>• The Download Rule has three names (mismatch 2).<br>**Stability.** No flow failures at any width; the one inventory collision keeps the sub-score off the top. | `craft`, `stability` |
| Clarity | **8.6** | **Strengths.** Specific verbs throughout ("Play Next in Default", "Move to the Trash", "Rewind Commute to 14:30?"). State is always visible: NOW / HERE, "Active Playlist", "16:34 left", "Matches 5 Episodes now", "Saved as you type."<br>**Gaps.**<br>• COPY-01: "Entries" as a Download Rule.<br>• The View editor's "In a Playlist" row offers only "Any / Not in any Playlist", with no positive choice.<br>• "Playing next in Default" is said even when nothing is playing. | `plain-language`, `feedback` |
| Platform fit | **9.0** (Looks 8.9 · Behaves 9.1) | **Looks.** It fills the viewport, uses native selects and fields, shows ⌘ only on a Mac ("Ctrl+/" elsewhere), and the forced-colours result is solid. The phone's mini-player is crowded.<br>**Behaves.** Back and Forward are predictable with overlays open; state lives in URLs; links are real; ⌘K is taken only on a Mac and Ctrl+K is left to the browser; native text undo and the browser's menus are untouched. The installed PWA supplies its own back links.<br>**Mac shell.** A full menu bar (File, Edit with a named Undo, View, Controls, Go, Window, Help), Settings… on ⌘, and native row menus. Space, ⌘← and ⌘→ are shown but not taken from text fields, the minimum window is 720 × 450, and bounds are restored.<br>**Below 9.** Episode commands such as Star and Mark Played aren't in the Mac menu bar, only in row menus. The Undo menu label is a whole sentence.<br>(8.9 + 2 × 9.1) ÷ 3 = 9.0 | `conventions`, `stability` |
| Interaction & feedback | **6.9** (cap: WKEY-04, major; uncapped about 8.9) | **Strengths.** Keyboard-fluent: an APG grid, type-ahead, ⌘Z / ⇧⌘Z, single-key shortcuts that can be turned off, and a shortcut sheet. Forgiving: Undo on every edit, the Trash, an undoable Rewind. Feedback in under 200 ms.<br>**The cap.** The covered Add sheet hits the primary phone task: adding Episodes one after another.<br>**Also below 9.** The scrubber is a native range with `step={1}`, so ← and → move one second in a 45-minute Episode. | `forgiveness`, `keyboard-efficiency`, `feedback` |
| **Overall** | **8.4** | It serves the task very well and is at home in the browser and in its Mac window. What holds it below 9 is one major focus-obscured defect on the phone's most repeated action, plus a layer of craft gaps: content-width inconsistency, the cramped mini-player, and naming drift. Cap: 6.9 + 2.0 = 8.9; not binding. | — |

## Next step

- **Target:** WKEY-04, the major failure in the lowest category, on the primary phone task.
- **Anti-pattern:** none named exactly. The nearest is "a notice in a fixed layer that ignores modality".
- **Root cause:** toasts have one page-level fixed viewport at z-60, and only the drawer redirects them. Undo toasts persist (`timeout: 0`), so any modal opened after an action opens underneath one. On the phone, the bottom sheet shares the toast's strip exactly.
- **Change:** generalise the drawer rule in `Toasts.tsx`. When a modal (`[role=dialog][aria-modal=true]`) is open:
  - portal the viewport into it, in a reserved strip above its footer; or
  - if the modal has no room, keep the toast hidden and inert until it closes.

  Add a flow step: Add → Play Next → Add again, asserting that `elementFromPoint` at the focused control is that control.
- **Principle:** `accessibility`, `stability`.
- **Expected effect:** the WKEY-04 cap lifts; Interaction & feedback goes to about 8.9 and Consistency & polish to about 8.6. Nothing regresses, because the drawer already shows the pattern works.

### Then, for 9.0 overall

These are the craft gaps, in order of payoff:

1. **One desktop content width.** Cap Playlist Entries, the Timeline and the Library table at the same measure as Settings and Episode (about 880–960 px), or keep the actions next to the title: Play and Remove 900 px from the title are the largest hierarchy cost at 1440 px.
2. **The phone mini-player.** At 412 px, give the title two lines, or drop back 15 into the drawer, as is already done under 20 rem. About 13 visible characters isn't enough to recognise an Episode.
3. **One Download Rule vocabulary** (COPY-01), everywhere including the phone headings.
4. **Craft fixes:**
   - `size-4 accent-primary` on the Playlist settings checkbox;
   - a scrubber arrow step of 5–10 s, so ← and → mean something in a 45-minute Episode;
   - a distinct glyph for Up next versus the Playlists tab;
   - "Rewind to here" shown on row hover or focus only;
   - one desktop way back: either the breadcrumb or the back link on every drilled-in screen;
   - a short Mac Undo label ("Undo Remove Entry").
