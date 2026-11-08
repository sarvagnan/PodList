# UI grade, round 25

Graded independently against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit). Earlier rounds and the UI-GRADE.md work lists were not read.

Build: worktree at `93dc44f`, `pnpm --filter @podlist/web build`, served by `ui-flows/demo.mjs` (seeded and empty). Browser: Playwright Chromium (Playwright 1.65), service workers blocked, light appearance. Mac shell: `packages/desktop` launched with Playwright `_electron` (Electron 44.9.3, unpackaged). Probe scripts and captures: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r25/`.

## Frame

- **Task:** find Episodes through Views and Search, line them up in Playlists, and listen, picking up where you left off on any Device.
- **Target:** web app, an Android-first installable PWA. The Mac app is the same build in an Electron window, so platform fit is judged for Android Chrome and a Mac desktop window. Mac checklist IDs: N/A → target.
- **Posture:** sovereign on the phone (the listening app people live in); on the desktop, a calm management tool used in shorter sessions.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things: calm lists, one accent, type doing the hierarchy work.
- **Character:** (1) blue primary #2b50c8 as the only accent *(owner)*; (2) Space Grotesk headings over Inter text *(owner)*; (3) the dark player bar and dark Now Playing drawer *(owner)*; (4) Views and Playlists as equal halves, navigated by lists rather than capsules *(owner, layout A)*; (5) plain, exact copy that uses the domain's capitalised nouns (Entry, Playlist, View, Device).
- **Owner decisions:** light theme only; layout A; Inter and Space Grotesk; #2b50c8; dark player; View editor R, Playlist settings and Rewind C, Library C. These are graded, but not proposed for change.

## Flows

Tasks run: browse, listen, now playing, fresh device (late catalogue held 2 s), second tab. Widths: phone 412×915, zoomed desktop 720×450, desktop 1440×900. Appearance: light only. Script: `packages/web/ui-flows/flows.mjs`. Evidence: `flows-r25/measurements.json` (72 rows), `flows-r25/strips/*`, `flows-r25/summary.md`.

Timed runs (desktop, 5 runs after a warm-up, no throttling, darwin arm64): open a Playlist p75 **118 ms**; Play from here p75 **106 ms**.

Failures: **none**. Core elements hold within 2 px at every step. The fresh-device catalogue arrives into skeleton rows of the same geometry, and focus never moves on its own.

Extra probes I ran (scripts p2–p19 in the grade-r25 folder):
- **Keyboard:** the whole desktop Tab order. The View list and the Playlist Entries are each one Tab stop (`role=grid`), with arrows, Home/End, PgDn and type-ahead. Keyboard reorder works (Space, ↓, Space), says "moved to position 2 of 3", and ⌘Z undoes it.
- **Focus traps:** the Now Playing drawer traps focus at both widths, and Esc and Back close it and return focus to the player bar. The Add sheet hands focus back to its + button after Back or Esc.
- **Focus after removing rows:** focus moves to the next row's Remove button. Deleting a View or Playlist puts focus on the new view's h1.
- **Back and scroll:** Back from an Episode restores the View's scroll (262 px) and focuses the row it came from.
- **Right-click:** a title link gets the browser's own menu, a row body gets the row menu, and on a Playlist row that menu includes Copy Link.
- **Narrow, zoomed and spaced text:** at 320 px and at 200% root text, nothing scrolls sideways (the only "clips" are sr-only spans). The WCAG 1.4.12 spacing overrides clip nothing.
- **Forced colours:** boundaries, selection and progress all survive (`fc-*.png`).
- **Contrast and size:** a contrast scan of 12 screens plus the drawer at two widths finds no text below 4.5:1. The only text under 12 px is the "15" and "30" inside the skip icons.
- **Second tab:** "Use here" takes over in about 1.1 s.
- **Mac shell:** the menus are complete. Undo is labelled when there is something to undo, Space and ⌘←/→ are shown but not registered (so text fields keep them), the window minimum is 720×450, and row menus are native.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop and phone) | Toast, bottom-leading of the content, above the player | none seen | none | Undo in toast; ⌘Z | Dashed card, centred | none | Play per row; Edit View top-trailing | none |
| View editor | Live preview; no toast | none | none | ⌘Z; "Discarded empty View" toast + Undo | n/a | none | Done (primary), top of panel | Footnote under conditions |
| Playlist (Entries, History, Timeline) | Toast "Moved …" | none | Rewind: centred dialog, **no ×**, Cancel + Rewind | Toast + Undo, no timeout; ⌘Z | Dashed card | none | Play this / Play, top-trailing, blue | Timeline intro paragraph |
| Playlist settings | "Saved as you type." inline | none | none (Delete goes to Trash with Undo toast) | Toast + Undo | n/a | none | n/a | Inline descriptions |
| Trash | Restore → toast | none | none | Toast | Dashed card | none | Restore per row | Subtitle "kept for 30 days" |
| Library and Add sheet | **Inline "✓ Subscribed" in the result row and a toast "Subscribed to …"** | Inline under field, red text + `role=alert` | none | none | First-run card | none | Add podcasts, top-trailing, blue | Help line under field |
| Subscription | Toast after Unsubscribe | Inside confirm dialog | Unsubscribe: centred dialog, destructive | none (confirm instead) | "It may have been unsubscribed" | none | Play per row | Settings descriptions |
| Search | n/a | none | Save as View: centred dialog **with × and Cancel** | none | Dashed card "Search your Library" | none | Save as View, top-trailing, secondary | Help line under field |
| Second tab | n/a | none | none | none | n/a | Full page, centred, "Use here" | Use here | none |

**Mismatches:**
1. Waiting-question dialogs close differently. Save as View has × plus Cancel, while the Rewind and Unsubscribe confirmations have Cancel only (Search vs Playlist and Subscription).
2. Subscribing confirms twice, inline and in a toast. Every other success confirms once, in the toast (Add sheet vs everything else).
3. Not an inventory column, but a related split: on desktop, Episode detail goes back with a small "‹ Views" link above the title. Subscription, Playlist settings and Trash use a breadcrumb title ("Library › Deep Field") and no back link, and so their h1 sits 45 px higher (35 vs 80).

## Checklist

Coverage: **90%** (pass 88 · fail 2 · N/O 10 · N/A 5; 105 IDs: 79 core + 26 web)

**Failures by severity**

- **[AX-04] major. Reordering a Playlist has no simple non-drag route on the phone, the primary target.**
  - **Where:** Playlist Entries and the drawer's Up next, below 1024 px.
  - **Evidence:**
    - `RowMenu` mounts the row's context menu only when `useMinWidth("64rem")` holds (RowMenu.tsx: `if (!wide) return cloneElement(render, {}, children)`).
    - Move to Top, Move to Bottom, Star and Mark Played for an Entry are therefore unreachable from a phone's Playlist. The rows offer drag handle · title · Play · ✕ (`p-move-tap.png`; tapping the handle does nothing).
    - Reordering by touch needs press-and-hold drag (dnd-kit TouchSensor). The keyboard sensor doesn't help TalkBack or Switch Access, whose double-tap sends a click.
    - The only non-drag path is indirect: open the Episode → Add → choose this Playlist (Active is preselected, not this one) → Play Next or Play Last. That is five steps away from the list, and it can't move an Entry up one place (`p19.mjs`: "Already last in Commute").
  - **Fix:** below 1024 px, give each Entry row (and each Up next row) a ⋯ More button. EpisodeRow already has this pattern for narrow widths. It should open the same `RowMenuItems`: Move to Top, Move Up, Move Down, Move to Bottom, Star, Mark Played, Remove. Alternatively, make a tap on the handle open Move Up, Move Down, Top and Bottom. Keep drag as the fast path.

- **[CTRL-05] minor. "Use here" (second-tab takeover) has no hover, pressed or busy state.**
  - **Where:** `app/TabGate.tsx`.
  - **Evidence:**
    - The button's classes have no `hover:` or `active:` variant, unlike every other primary button (`hover:bg-primary/90 active:bg-primary/80`).
    - The handoff takes about 1.1 s: 1,096 ms measured from click to the app's h1 (`p13.mjs`). For that whole time the page shows nothing changing.
    - The flow strip shows it too: `strips/second tab/desktop/02-use-here.png` is still the notice after the click.
  - **Fix:** add the shared primary button states. While `claim(true)` is pending, set `aria-disabled` and change the label to "Opening…" with a spinner.

**N/O:** KEY-06, CTRL-02, CTRL-08, DRAG-05, DRAG-06, PTR-03, START-05, EDIT-02, FOOT-02, BROWSER-10

**N/A:** START-06, START-07 (no accounts); TOOL-06, SIDE-03 (nothing can be hidden); AX-05 (no critical audio cues; playback is always started by the person). Mac IDs: N/A → target.

**Passes worth noting** (evidence in the probe logs):
- **Back, Esc and focus:** BROWSER-01, WKEY-03 and DLG-04. Back closes the drawer and sheets one layer at a time, and focus goes back to whatever opened them.
- **URLs:** BROWSER-02. `?tab=`, `?edit=true`, `?q=` and `?episode=` all survive a reload.
- **Browser shortcuts:** BROWSER-05. ⌘K is taken only on a Mac, and the shortcut hints follow the OS.
- **Composite widgets:** WKEY-01 and LIST-07. The View list and Playlist Entries follow the APG grid pattern.
- **Undo:** DATA-04 and WDATA-04. Undo is available for removing an Entry, reordering, editing or deleting a View, and deleting a Playlist, and Undo toasts have `timeout: 0`.
- **Sorting and restored state:** LIST-03 and DATA-06. Sort toggles on a second click, persists across a reload, and scroll is restored.
- **Zoom and reflow:** WTYPE-02 and WTYPE-05.
- **Contrast and preferences:** APPEAR-03/04/05.
- **Typography:** TYPE-07 and TYPE-08. Every all-caps label has `tracking-[0.08em]`, and the copy uses curly quotes.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | **Strong.** Three steps (13/15/28–30 px) with one role each, Space Grotesk only on headings, curly quotes, letterspaced caps labels, and rem steps that hold at 200%. Below Exemplary because: (a) the phone mini-player title truncates to about 15 characters ("The long life o…", about 100 CSS px wide) while the controls take the rest; (b) at 320 px, Entry titles are clamped mid-word ("The quiet edge of the sola…"). | hierarchy, craft |
| Hierarchy | **8.6** | **Strong.** One blue primary per screen (Play this, Add podcasts, Done). Row actions appear on hover or focus. The NOW/RESUME/HERE words lead the Cursor row. Holding it back: (a) on the 1440 px Playlists index, each row's chevron sits about 1,090 px from its title (308 → 1,400); (b) on the phone, the player's title loses to five controls; (c) on desktop, a View's Episode actions are invisible until hover, so the list reads as Play-only at a glance. | content-first, hierarchy |
| Spacing & density | **8.1** | **Strong.** A 4 px grid, 44 px phone targets, rows aligned on shared edges, and density that suits each posture. Desktop content widths aren't one system, measured right edges at 1440 px: list screens end at 1,408; Settings, Playlist settings and the Episode page at 896; Trash's empty card at 1,152; the Subscription page's settings panel at 1,292. On Search, the field ends at 832 px while the results under it end at 1,016. On the phone, the Now Playing drawer leaves about 160 CSS px empty below its last row (`p-drawer.png`). | craft, hierarchy |
| Color & contrast | **8.8** | **Strong.** One blue with one meaning (selection, focus, primary). Green means Played and amber means Star, each with a glyph and a word. Every text pair passes, including the dark drawer (player-muted #a9b6be on #1b2a33). Forced colours are handled explicitly. Light only *(owner)*. Below 9: the browser's own search clear × (Chrome's default glyph and colour) sits in the branded Search and Add fields, and the Add sheet shows a tinted-initials fallback where the Library shows the podcast's artwork. | color-restraint, accessibility |
| Iconography | **8.8** | **Strong.** A single Lucide set at one stroke weight. Words replace ambiguous glyphs (Next and Last instead of two list icons). The skip icons carry their seconds. Every icon button has a label and a tooltip on hover and focus. The only nit is the 11 px numerals inside the skip glyphs. They are part of the icon and the button is labelled, but they are the one place type drops below 12 px. | conventions, craft |
| Consistency & polish | **8.3** (stability 8.6) | **Strong.** Every state is designed: skeletons, empty, error, hover, focus and forced colours. Below 8.5 because of the CTRL-05 failure (Use here has no states), inventory mismatches 1–2 (dialog × and double success), the desktop back-pattern split (link vs breadcrumb title), and the content-width drift above. **Stability 8.6:** no FLOW failure at any width, and the late catalogue lands in matching skeletons. It loses points only for the two message mismatches. | craft, stability |
| Clarity | **8.9** | **Strong, at the top.** Labels name the target ("Play Next in Default", "Remove … from Workshop", "Already last in Commute"). The Rewind dialog says what is kept and that it can be undone. Errors say how to recover ("Enter the whole address, starting with https://"). The tab title names every view. Below 9: the AddPodcastSheet still falls back to raw `Error.message` or "Something went wrong." (AddPodcastSheet.tsx:22), and on desktop the Timeline's Rewind buttons appear only on hover. | plain-language, feedback |
| Platform fit | **8.7** | Looks 8.8, Behaves 8.7 → (8.8 + 2 × 8.7) ÷ 3. At home in the browser: real links, URLs for tabs, edit state and search, Back that peels layers, native selects and inputs with the right `type`, the browser's menu on links and text, and no foreign OS idioms. The Mac shell has a full standard menu bar, dynamic Undo labels, Settings… at ⌘, and native row menus. Gaps: browsers narrower than 1024 px (the zoomed desktop, a half-screen window) get no row menu at all, so row-only commands disappear there; and BROWSER-10 wasn't measured. | conventions, stability |
| Interaction & feedback | **6.9** (capped by AX-04; uncapped about 8.8) | Keyboard-fluent on desktop: grids, type-ahead, keyboard reorder with an announcement, ⌘Z everywhere, Undo toasts that don't expire, 106–118 ms p75 responses, and live-applied editing. The cap comes from the phone, the primary target, where reordering a Playlist is drag-only and Entry commands are unreachable from the list. | forgiveness, accessibility, direct-manipulation |
| **Overall** | **8.4** | It serves the primary task very well: listening, queueing and finding are fast, forgiving and stable at every width. It looks and behaves like a well-made web app, and it is coherent in the Mac window. The rule caps Overall at 8.9 (lowest category 6.9 + 2.0). What holds it down most is the phone's drag-only Playlist reordering (AX-04); after that, desktop layout widths that aren't yet one system. | |

## What stands between this build and 9.0

1. **AX-04 (major) lifts the Interaction cap.** Fixing it alone moves Interaction to about 8.8 and Overall to about 8.7.
2. **Make desktop widths one system.** Use two widths and say which content takes which: about 640 px for forms and reading (Settings, Playlist settings, Episode detail, Trash's empty card), and the full 1,160 px for lists and tables. Then end the Subscription page's panel at the same 1,408 px as the View's Up next panel, and make the Search field the width of its results (to 1,016 px).
3. **Use one back pattern on desktop.** Either the breadcrumb title everywhere (Views › Episode title) or the "‹ Parent" link everywhere. Then every desktop h1 sits at the same top (35 px).
4. **One dialog grammar.** Use × on every dialog or on none (Save as View vs Rewind and Unsubscribe), and confirm a Subscribe once: keep the inline ✓, or the toast, not both.
5. **Phone player bar.** Give the title the space: let it wrap to two lines at 13 px, or drop the episode subtitle on the bar and keep it in the drawer, so about 30 characters show instead of about 15.
6. **Smaller finish.**
   - Styled search-clear × (or `appearance: none` plus a Lucide X) in the Search and Add fields.
   - Real artwork in Add-sheet results.
   - Close the drawer's empty space at the bottom on tall phones (centre the stack vertically, or let the artwork grow).
   - Bring the Playlists-index chevrons in to the content (max-width the rows, or drop the chevron on wide screens where the whole row is the link).
   - "Use here" states (CTRL-05).

## Next step

- **Target:** AX-04 (a major failure in the lowest category, Interaction & feedback, on the primary task).
- **Anti-pattern:** a gesture-only command, where a capability exists only behind drag or right-click.
- **Root cause:** row commands are delivered only through a context menu, which is mounted only at ≥1024 px (RowMenu.tsx). Phones and narrow desktop windows get the browser's menu instead, so the Playlist row has no route to its own commands.
- **Change:** below 1024 px, render a ⋯ More menu button in each Entry row (and each drawer Up next row) that opens `RowMenuItems` with Move to Top / Move Up / Move Down / Move to Bottom, Star, Mark Played and Remove. Reuse EpisodeRow's narrow-width More pattern so all row kinds behave the same way.
- **Principle:** accessibility, discoverable-commands.
- **Expected effect:** Interaction 6.9 → about 8.8; Platform fit +0.1 (narrow desktop windows regain row commands); Overall about 8.7. It touches no signature element: the row keeps its handle, title, Play and ✕, and gains one quiet icon.
