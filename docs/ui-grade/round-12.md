# UI grade, round 12

Full audit against `~/Documents/UI_Guidelines` (CRITIQUE.md § Full audit), graded independently: earlier rounds and the UI-GRADE.md work lists were not read. Build: commit `e26d615`. Graded on 2026-11-07.

## Frame

- **Task:** find Episodes through Views, queue them into Playlists with Play Next and Play Last, then listen with the player and the Now Playing drawer.
- **Target:** web app. It is an Android-first installable PWA, and the Mac app is the same build in an Electron window, so Platform fit is judged for Android Chrome and a Mac desktop window. Mac checklist IDs: N/A → target.
- **Posture:** sovereign, a daily personal media tool. It is calm and roomy rather than dense.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things. It shares the calm density, and its type and few accents carry the hierarchy.
- **Character:**
  - blue primary `#2b50c8` for actions, selection and NOW (owner);
  - Space Grotesk headings over Inter text (owner);
  - a dark player bar and Now Playing drawer (owner);
  - a warm off-white page `#f6f5f2` with initials artwork tiles;
  - plain domain words: Entries, Clear on Played, Rewind to here, "Play Next and Play Last go to".
- **Owner decisions:** light appearance only; layout variant A, where navigation is lists and never capsules; the designs in docs/design/ui-layout.md (View editor R, Playlist settings and Rewind C, Library C). I graded these choices but don't propose undoing them.

## Flows

- **Tasks run:** browse, listen, now playing, fresh device and second tab, from the flow run at `scratchpad/flows-r12` (`packages/web/ui-flows/flows.mjs`).
- **Widths:** phone 412×915, zoomed desktop 720×450, desktop 1440×900. Light appearance only. Late arrivals were held for 2 s.
- **Timed runs:** desktop, 5 runs after a warm-up, darwin arm64, no throttling. "Open a Playlist" p75 was 127 ms and "Play from here" p75 was 117 ms.
- **Measurements:** `flows-r12/measurements.json`, 72 rows. Strips are in `flows-r12/strips/*`.
- **My own probes:** Playwright Chromium 1.65 against the demo server, with scripts and captures in `scratchpad/grade-r12/`. I probed:
  - keyboard paths and the Tab order;
  - focus after removing rows;
  - Back with overlays open, and scroll and focus restoration;
  - right-click menus;
  - forced colors and reduced motion;
  - text at 200%, 320 px, and the WCAG 1.4.12 spacing overrides;
  - contrast of every text node, on 10 pages and in the drawer;
  - target sizes;
  - lab LCP and CLS;
  - first run (`startDemo({ empty: true })`);
  - the Electron shell, through `_electron`.

**Failures (FLOW):** none. Every core element (heading, navigation, player, main action) has a move of 0 px on unprompted steps: "playing", "Commute playing", "catalogue arrives" and "first tab after takeover". The moves that do appear are on steps the person caused, between screens of different kinds (phone heading dy ±48 between the list and drill-in screens).

Related, not FLOW: on the fresh-device step the placeholder rows are about 40 px tall and the real rows about 57 px. When the catalogue arrives, the rows below the first move down: phone row 4 goes from about y 341 to y 394 (`strips/fresh device/phone/01 → 02`). This is recorded under APPEAR-11.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (episode list) | Toast at the bottom-leading edge of the main area, above the player (same component as Playlist; Play Next toast wording not captured) | none seen | none | Toast "Undo" button and ⌘Z | Dashed box: heading and one line with a link ("Add podcasts to fill your Views") | none | Header, trailing: "Edit View" and the target picker | Rule line under the title ("Last 7 days · Unplayed · Newest first") |
| Playlist | Toast: "Removed from Workshop · Undo" | none seen | none | Toast and ⌘Z (verified) | Dashed box: "Nothing finished yet" (History) | none | Header, trailing: blue "Play" / "Play this" | Timeline intro paragraph |
| Playlist settings | Static hint "Saved as you type." | none seen | none | Toast after Delete: "Moved “Workshop” to the Trash · Undo" | n/a | none | n/a (live save) | Help under each control |
| View editor | Live preview, "Matches N Episodes now" (phone) | none seen | none | ⌘Z / toast after Delete: "Deleted “Starred” · Undo" | n/a | none | "Done", panel header trailing | "Every row must match…" |
| Settings / Subscription settings | none (applies live; no "saved" hint) | none seen | none | none | n/a | none | n/a | Help line under the label |
| Add podcasts | Row turns to "Subscribed" | Inline, red, under the field, sentence with a fix | none | none | none | none | Subscribe on each result | Help line under the field |
| Rewind | Toast with Undo (per design; Rewind itself not run) | none seen | Modal: "Rewind Default to 14:30?" Cancel / Rewind | Toast | n/a | none | Modal footer, trailing | Consequences in the body |
| Second tab | n/a | n/a | n/a | n/a | n/a | Full notice with "Use here" | "Use here" | n/a |
| Now Playing drawer | n/a | `--player-danger` text (from code) | none | × on Up next rows (toast not exercised) | "Nothing up next…" | none | Centre Play | n/a |

**Mismatches:**
1. **Toast wording.** Names are quoted on some toasts and not others: "Removed from Workshop" against "Deleted “Starred”" and "Moved “Workshop” to the Trash" (View, Playlist, Playlist settings).
2. **Save status.** Playlist settings says "Saved as you type." Settings, Subscription settings and the View editor apply live and say nothing.
3. **Settings rows.** The same Playback controls (Speed, Skip intro, Skip outro, Volume boost) sit label-left with the select right in Settings, but label-over-select in Subscription settings, at the same 1440 px width.
4. **Back link.** It names its destination everywhere ("‹ Library", "‹ Commute", "‹ Playlists") except on Episode detail, where it says "‹ Back".
5. **Episode row commands.** At 1440 px the same row reveals Next · Last · + · ★ · ✓ · ↓ on hover in a View. On a Subscription page, and in a View at the Mac app's default 1280 px window, it shows a "…" menu instead.

## Checklist

**Coverage: 94.9%** (pass 89 · fail 4 · N/O 5 · N/A 7). That is 93 of 98 applicable items with a verdict.

### Failures by severity

**Major**

- **[LIST-07] Clicking a row doesn't give the list keyboard focus. The arrow keys then do nothing.**
  - **Where:** View episode list on desktop. This is the primary task.
  - **Evidence:**
    - Clicking the metadata line of row 2 ("Deep Field · 5 Nov") selects it: the URL becomes `?episode=ep_45c3…` and the detail panel opens. But `document.activeElement` is `<main>`, the `tabindex=-1` skip target.
    - ArrowDown then changes neither focus nor selection, and Enter does nothing (`grade-r12/p12.mjs`).
    - Clicking the title link does focus it, and ArrowDown moves focus to the next title. The selection and the detail panel stay on the earlier Episode until Enter.
  - **Fix:**
    - On a pointer click in a row outside its controls, call `rowGrid`'s `focusCell(row, titleCell)` so the click puts roving focus in that row, with `preventScroll`.
    - While an Episode is selected, have ArrowUp and ArrowDown move the selection with `navigate({ search: { episode }, replace: true })`, so the detail follows focus the way Mail's does. Enter still opens the full page.

- **[CTRL-04] The Feed address check flags a valid address while it's still being typed.**
  - **Where:** Add podcasts › Feed address (phone and desktop).
  - **Evidence:** typing `h-t-t-p` turns the field red (`aria-invalid=true`) and shows "Enter the whole address, starting with https://". The error stays through "https", "https:", "https:/" and "https://" (`grade-r12/p14.mjs`). The rule is `text.trim().length > 3 && !looksLikeFeed(text)` in `AddPodcastSheet.tsx:227`.
  - **Fix:** don't flag text that is still a prefix of `http://` or `https://`, or that has no dot yet. Show the error only on blur or Enter, then clear it live once the text becomes valid (GOV.UK's "validate on submit, re-validate on input").

**Minor**

- **[APPEAR-04] Placeholder text measures about 3.4:1.**
  - **Where:** the Search field ("Titles, show notes, podcasts") and the View editor's Mentions ("Any words").
  - **Evidence:** the placeholder is `foreground / 0.5`, about `#8b8b8d` on white. In the View editor, "Any words" is the only statement of that row's value, while every sibling row shows "Any" at full contrast.
  - **Fix:** use `placeholder:text-muted-foreground` (`#5c6070`, 6.6:1 on white) everywhere.

- **[APPEAR-11] Placeholder rows are shorter than the real rows, so the list jumps when data arrives.**
  - **Where:** the Playlist on a fresh Device.
  - **Evidence:** the placeholders are one bar, about 40 px. The real rows are title plus meta, about 57 px on phone and 49 px on desktop. Rows 2–4 shift by about 17 px per row on "catalogue arrives" (fresh-device strips 01 → 02). Core elements hold still, so this isn't FLOW-01.
  - **Fix:** give placeholder rows the real row's structure and minimum height: a two-line title bar and a meta bar, with `min-h` equal to the rendered row.

### N/O

KEY-06, CTRL-08, DRAG-03, DRAG-05, DRAG-06.

### N/A

LIST-05 (no outlines); START-04, START-05, START-06, START-07 (no permissions or accounts); TOOL-06 and SIDE-03 (nothing can be hidden). Mac IDs: N/A → target.

### Passes worth noting

- **Browser frame:**
  - Back closes overlays: the Add sheet, and the drawer's Up next page and then the drawer, each without leaving the page.
  - Selection, tabs, the View editor and search terms all have URLs (`?episode=`, `?tab=`, `?edit=true`, `?q=`).
  - The title follows the view.
  - Links keep the browser's menu, and rows get a custom menu that adds Open in New Tab and Copy Link.
  - ⌘K is bound only on a Mac, and Ctrl+K is left to the browser.
  - Lab LCP is 112–304 ms and CLS ≤ 0.010.
- **Keyboard:**
  - The View list is one Tab stop: an APG grid with arrows, Home/End, ⌘End and type-to-select.
  - Tooltips appear on focus.
  - Focus moves to the next row's control after a removal.
  - Focus returns to the opener after Esc, and to the row link after Back.
- **Data safety:** every removal and deletion has an Undo toast, which stayed up for ≥7 s, and ⌘Z restored the Entry.
- **Appearance:**
  - Forced colors keep every boundary, the selection and progress.
  - Reduced motion leaves no running animations.
  - At 320 px nothing scrolls sideways.
  - At 200% text nothing is clipped. The Library table scrolls inside its own region, which is the 2-D exception.
  - All pointer targets are ≥24 px or meet the spacing exception: the row checkboxes have 40×40 labels.
- **Mac shell:** a full menu bar in standard order (Settings… ⌘,; File, Edit, View, Controls, Go, Window, Help). Undo is labelled with the action. Rows get native context menus. Swipe and mouse buttons walk history. The window's bounds are restored. The window title follows the view.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.4** | Small deliberate scale: Space Grotesk 28 px titles, Inter 15 px rows and 13 px meta, letterspaced all-caps section labels. The minus sign in "−16:34" is real. Type alone carries the row hierarchy. Below Exemplary: on phone and at 320 px the meta lines wrap with the separator leading the next line ("Deep Field · 5 Nov / · 45 min"; "Newest / first"). The shortcut sheet renders "Page Up Page Down" as four keycaps (Page · Up · Page · Down) and writes "⌘⇧Z" in non-Apple modifier order beside "⇧⌘N". | hierarchy, craft |
| Hierarchy | **8.2** | One tinted action per header (Play, Add podcasts, Done). The dark player recedes as chrome, and the list leads. Below Exemplary: the View shows its target twice ("Play Next and Play Last go to [Default]" in the header, and "NEXT AND LAST GO TO / Default" heading the panel). The desktop Episode panel wraps its 7 actions 4 + 3, so Play ends row 1 instead of sitting centred as the design specifies, and Last lands under Played. The desktop drawer leaves a wide empty field between the player and Up next. | content-first, hierarchy |
| Spacing & density | **8.0** | One 4 px rhythm, consistent row heights, calm density that suits the posture; reflows to 320 px. Below Exemplary: the Add podcasts dialog keeps ~150 px of dead space under its one field. The first-run empty-state box is ~330 px tall with its text top-anchored. Playlist settings uses three left edges (card text, page, inset Delete help). At 320 px, the handle, the cursor label and the artwork take ~45% of a Playlist row, so titles clamp to "The quiet edge of the solar…". | craft, conventions |
| Color & contrast | **8.5** | A restrained, meaningful palette: blue for action, selection and NOW, green for Played, amber for Star, red for destruction. All measured text passes, including the dark drawer (`#a9b6be` on `#1b2a33`, about 7.5:1). Forced colors are handled. Below Exemplary: placeholders are at about 3.4:1 (APPEAR-04). The blue animated waveform next to "Default" in the sidebar reads as "playing" while the Playlists list says "Paused". | color-restraint, accessibility |
| Iconography | **8.3** | One Lucide family at matched stroke, custom 15/30 skip glyphs, and every icon button has a name and a tooltip. Below Exemplary: the hover toolbar mixes text buttons (Next, Last) with icon buttons (+ ★ ✓ ↓) in one group. Next and Last on the Episode page are near-identical list glyphs. Icons stay 16 px while text scales to 200%, so a 16 px search glass sits beside 32 px "Search". | conventions, craft |
| Consistency & polish | **6.9** (stability 8.3) | Capped by CTRL-04 (major); uncapped it would be about 8.3. Every state is designed: empty, loading, offline, forced colors, Trash and first run. Stability holds every core element still at all three widths. Against it: inventory mismatches 1–5, the placeholder rows that jump (APPEAR-11), a keyboard-opened drawer that draws its 2 px white focus ring round the whole sheet, and the shortcut keycaps. | craft, stability |
| Clarity | **8.6** | Specific labels and domain words ("Clear on Played", "Rewind to here", "Keeps Entries"). State is always legible (NOW, HERE, Paused, "16:34 left", "✓ Played"). Consequences are explained before acting (Delete Playlist, Rewind). Below Exemplary: Trash sits inside the PLAYLISTS list with a count and reads as a Playlist. The Library's "Keep at most —" leaves the dash to be decoded. The first-run status circles look like unticked radio buttons. The Search page before typing is one hint line over a blank screen. | plain-language, feedback |
| Platform fit | **6.9** | Capped by LIST-07 (major). Uncapped: Looks 8.8 and Behaves 8.6, which gives (8.8 + 2 × 8.6) ÷ 3 = 8.7. The browser contract is kept almost everywhere (see the passes). The Mac shell is unusually complete. Gaps besides LIST-07: arrow focus and selection come apart in the list–detail; the Electron View menu says "Toggle Full Screen" (Electron's default wording); there's no ⌘F in the Mac app. | conventions, stability |
| Interaction & feedback | **8.4** | Undo instead of confirmation everywhere but Rewind, whose modal is the designed preview. ⌘Z, a keyboard-fluent grid, a shortcut reference, single-key shortcuts that can be turned off, p75 117–127 ms, and reduced motion is respected. Below Exemplary: the CTRL-04 premature error; Up next in the drawer can't be reordered and has no per-Entry play control, although the design gives the Queue reorder; detail doesn't follow arrow focus. | forgiveness, feedback, keyboard-efficiency |
| **Overall** | **7.9** | It serves the task well and is at home in the browser and in a Mac window. Two small, specific major failures cap two categories at 6.9. The ceiling is 6.9 + 2.0 = 8.9. The weakness holding it down most is the desktop list–detail keyboard model (LIST-07), which sits on the primary task. | |

## What stands between this build and 9.0

1. **Clear both caps.** These are LIST-07 and CTRL-04, each a change of a few lines. Clearing them lifts Platform fit to about 8.7 and Consistency & polish to about 8.3. Overall would then sit near 8.5 on this evidence.
2. **Reach Exemplary in Consistency & polish.** One toast wording pattern ("Removed “X” from Y", always quoted). One Settings row layout for the shared Playback controls. Named Back links everywhere. Placeholder rows at the real height. No focus ring on the drawer container: send initial focus to the close chevron or Play.
3. **Hierarchy craft.**
   - Keep the desktop Episode action row on one line with Play centred. Below ~460 px of panel width, drop the text labels to tooltips rather than wrapping to 4 + 3.
   - Remove the duplicate "NEXT AND LAST GO TO" heading. The header picker already says it; the panel can be titled with just the Playlist name.
4. **Typography craft.**
   - Render each `·`-separated fact as an inline-block, or hide a leading separator, so wrapped meta never starts with "·".
   - Make Shortcuts.tsx treat "Page Up" and "Page Down" as single keys.
   - Use ⇧⌘Z (Apple's modifier order).
5. **Design fidelity on designed screens.**
   - Give the drawer's Up next reorder and play-from-here, as Queue specifies.
   - Search should be the R form with Mentions filled, offering the other rows to refine. Today it's a single field.
6. **Small clarity items.**
   - Move Trash below the Playlist list as a footer link without a count, or style it as a utility row.
   - Show "Keep all" instead of "—".
   - Make the first-run checklist marks read as status: a filled tick, or a muted dot when not done, not empty radio rings.

## Next step

- **Target:** LIST-07, a major failure in the lowest-scoring category. It is tied with CTRL-04 at 6.9 and is the closer of the two to the primary task.
- **Anti-pattern:** web-ism, a list that looks selectable but leaves keyboard focus on the page.
- **Root cause:**
  - A pointer click on a row's non-control area is handled as selection only.
  - Focus falls to the nearest focusable ancestor, `<main tabindex=-1>`, so the grid's roving tabindex never sees the click.
  - Separately, the arrow keys move only focus, not the `?episode=` selection.
- **Change:** in `lib/rowGrid.ts`, handle `pointerdown` on a row outside `a, button, input, select, label`: call `focusCell(index, titleCell)` and mark the row active. While a selection exists, ArrowUp and ArrowDown also replace `?episode=` with the newly focused row's Episode.
- **Principle:** keyboard-efficiency and conventions (Mail and Finder list–detail).
- **Expected effect:**
  - LIST-07 passes, which lifts the Platform fit cap; Platform fit goes to about 8.7.
  - Interaction & feedback gains about 0.2.
  - Nothing should regress if Home, End and type-to-select keep working and the first click doesn't scroll.
