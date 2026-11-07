# UI grade, round 3

Graded 2026-11-07 against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), independently of earlier rounds. Evidence: the flow run at `scratchpad/flows-r3` (summary.md, measurements.json, strips), plus my own Playwright probes against the demo server (Chromium 1.65 headless, Playwright's bundled build; phone 412 × 915 @2×, zoomed desktop 720 × 450 @2×, desktop 1440 × 900 @1×, 320 × 640, 200 % root font size, forced colours, WCAG 1.4.12 spacing) and the Mac app launched through Playwright's `_electron`. Scripts and captures: `scratchpad/grade-r3/` (`p1`–`p7.mjs`, `mac.mjs`, `audit.js`).

## Frame

- **Task:** pick an Episode from a View and listen to it through a Playlist (Play / Play Next / Play Last, then control playback from the player bar and the Now Playing drawer).
- **Target:** web app, an Android-first installable PWA; the Mac app is the same build in an Electron window, so Platform fit also weighs the Mac shell's menus and context menu. Mac checklist IDs: N/A → target.
- **Posture:** sovereign on the desktop (a list–detail tool left open), transient on the phone (quick picks, then the player).
- **Audience:** perpetual intermediate; one owner who uses it daily.
- **Nearest exemplar:** Things (calm personal tool, a list that carries its hierarchy with one typeface and secondary colour).
- **Character:** (1) warm off-white page `#f6f5f2` with near-black `#17181c` type; (2) Space Grotesk titles over Inter text (owner-fixed); (3) one blue `#2b50c8` for action, focus and selection (owner-fixed); (4) a dark slate player bar and drawer `#1b2a33` (owner-fixed); (5) Views and Playlists as equal halves, navigated as lists, never capsules (owner-fixed, variant A); (6) the domain's capitalised nouns in the copy (Episode, Entry, Played).
- **Owner decisions:** light only; variant A; Inter + Space Grotesk; blue primary; dark player. Unbuilt screens (View editor, Search, Playlist settings and reordering, Rewind, Library management, Subscription settings, Settings, OPML, first run) are out of scope.

## Flows

- **Tasks run:** browse (Views → Commute → Default → Library), listen (play an Entry, pause, +30 s, switch Playlist), Now Playing (open drawer, Up next, play from it, Episode page, close), fresh Device (catalogue held 2 s), second tab (lock and "Use here").
- **Widths:** phone 412 × 915, zoomed 720 × 450, desktop 1440 × 900. **Appearance:** light only (owner decision).
- **Timed runs:** desktop, 5 runs after warm-up, no throttling, darwin arm64: open a Playlist p75 118 ms; Play from here p75 100 ms. Lab Web Vitals (my probe, 3 loads of a View, desktop, no throttling): LCP 84–200 ms, CLS ≤ 0.003.
- **Script:** `packages/web/ui-flows/flows.mjs`. **Measurements:** `flows-r3/measurements.json`. **Strips:** `flows-r3/strips/<flow>/<width>/`.
- **Failures:** none. Core elements held within 2 px at every step and width; the late catalogue filled skeleton rows in place (`fresh device` step 2); focus went to the new heading on each navigation.

Not covered by the flow script, found by probing: Back and reload reset a View's scroll position (BROWSER-01, DATA-06 below).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (episode list) | Dark toast above the player (phone: 10.5 rem up; desktop: bottom-left beside sidebar), "Playing next in Default", "Starred"; neutral | Download failed: red alert icon in the row, tooltip "Download failed. Try again" | none | Toast "Undo", 8 s; ⌘/Ctrl-Z, 30 steps | Dashed box: "No Episodes match this View" + one line | none | Row Play (trailing) | Shortcuts dialog (`?`, sidebar) |
| Playlist | Same toast, "Removed from Commute" | none seen | none | Same | Dashed box: "Nothing here yet" + how to add | none | Header Play / Pause / Play this, top trailing | none |
| Episode (page, panel, drawer page) | Same toast | Download as above | none | Same | "None." under Show notes | none | Centre Play in the action row | none |
| Player bar / drawer | none (state change is the confirmation) | Inline, `--player-danger`: "Couldn’t play this Episode." + Try again | none | none | none | none | Play/Pause centre | none |
| Missing View / Playlist | — | Dashed box: "This View no longer exists. It was deleted on another Device." / "This Playlist no longer exists … See your Playlists" | — | — | — | — | — | — |
| Second tab | — | — | — | — | — | Full page: "PodList is open in another tab" + Use here | Use here | — |
| Offline | Status line above the player (phone) / in the sidebar (desktop): "Offline. 1 change will sync when you’re back online" | — | — | — | — | — | — | — |

**Mismatches:**
1. The same Episode opens as a side panel from a View (≥ 1024 px) but as a full page from a Playlist's Entry title at the same width (View vs Playlist).
2. "This View no longer exists" offers no way on; "This Playlist no longer exists" links to the Playlists (missing View vs missing Playlist).
3. A single Download gives no confirmation; a bulk Download toasts "Downloading 3 Episodes" (View row vs bulk bar).
4. Play Now toasts "Playing in Default" with no Undo, while every other row action offers one (View).

## Checklist

**Coverage: 97.6 %** (pass 69 · fail 11 · N/O 2 · N/A 23; 82 applicable). Mac IDs: N/A → target.

### Failures by severity

**Major**

- **[WKEY-03] Modal dialogs don't keep Tab inside.** Add to a Playlist and Keyboard shortcuts, phone and desktop: Tab from the last control goes to Base UI's 1 × 1 focus guard, then `body`, then "Skip to content" and the sidebar behind the backdrop (`p3.mjs`: "Play Last → span 1x1 → body → a Skip to content → a New this week"). The drawer doesn't leak, because it runs `wrapTab` (`lib/focusTrap.ts`); the dialogs don't. **Fix:** put `onKeyDown={wrapTab}` on both `Dialog.Popup`s (`AddToPlaylist.tsx`, `Shortcuts.tsx`), or wrap a shared `Sheet` component around Base UI's `Dialog` so every modal gets it.
- **[BROWSER-01] Back doesn't restore the view it returns to.** Phone, "Under 30 minutes" scrolled to 169 px → open an Episode → Back: scroll is 0 (`p7.mjs`). On a long View this throws away the person's place on every drill-in, which is the phone's main browse loop. Cause: `useFocusOnNavigation` (`AppShell.tsx`) calls `window.scrollTo(0, 0)` on every path change, POP included, and the router's scroll restoration is off. **Fix:** create the router with `scrollRestoration: true` (keyed by location, and let the virtualizer measure before restoring); scroll to top only on PUSH/REPLACE; keep `focus({ preventScroll: true })` on the heading.
- **[DATA-06] Reload loses the content's scroll position.** Same View, 169 px → reload → 0 (`p7.mjs`). Last screen and the Next/Last target survive; scroll doesn't. **Fix:** the same scroll restoration, persisted per URL in `sessionStorage` (reload) — the router option covers this once enabled.
- **[WTYPE-02] At 200 % text on the phone, essential text is truncated or clipped.** Playlist Entries drop to two words — "The quiet…", "Joinery without…", "What the Voyage…" (`t200-phone_playlists_default.png`); the mini-player reads "The quiet …" / "Deep Field ·…"; the drawer's remaining time is cut at the right edge, "−45:1" (`t200-phone-drawer.png`). The Entry row keeps ~170 px of fixed chrome (56 px index column, 44 px artwork, two 44 px buttons, gaps) while the title is `line-clamp-2`. WCAG failure F69 names truncation. **Fix:** in the Entry row, let the title wrap freely (drop `line-clamp-2` or clamp in proportion to the font size), shrink the index column to its content (`min-w-0`, not `min-w-14`), and stack the time under the title; give the scrubber's time labels `min-w-[3.5em]` instead of `w-14`; let the mini-player title take two lines when text is large.
- **[WTYPE-05] At 320 px the Playlist loses its titles.** "The qui…", "The lon…", "Joiner wit…", with "45 / min" broken over two lines (`w320_playlists_default.png`); no horizontal scroll, but the content is gone (1.4.10 requires no loss of information). Same root cause as WTYPE-02, a different condition (width, not text size). **Fix:** as above; below ~360 px also hide the index column (the NOW/RESUME marker can sit on the artwork) and move Remove into the row's overflow.
- **[WKEY-02] `?` is a page-wide single-character shortcut that can't be turned off.** `Shortcuts.tsx` opens the reference on `?` anywhere outside a text field; WCAG 2.1.4 counts punctuation. **Fix:** bind it to Ctrl+/ (⌘/ on a Mac, which the Mac menu already uses) and keep `?` only while the Episode grid has focus, or add an off switch when Settings exists.
- **[WDATA-04] On the phone, Undo lives only in an 8-second toast.** Removing an Entry discards its Position; the Undo restores it (`undoFor` "Remove": "Back in its place, with its Position and Cursor"), and re-adding by hand can't. The phone has no ⌘/Ctrl-Z, so after 8 s the loss is permanent. **Fix:** keep the Undo toast until the next action or navigation (no timeout) on touch devices, or add a persistent "Recently removed" row at the foot of the Playlist for the session.
- **[DLG-07] Add to a Playlist has no Cancel or close.** Desktop dialog and phone sheet show only Play Next / Play Last (`d-add.png`); leaving needs Esc, the backdrop, or Back. **Fix:** a Close (×) at the trailing top, as the Shortcuts dialog has, or a quiet Cancel text button under the two actions on the phone sheet.

**Minor**

- **[WCOPY-01] The reference says "Esc: Close a sheet or panel", but Esc doesn't close the Episode panel from the list.** Open the panel with Enter or a click: focus stays on the row title (correctly), and Esc does nothing, because the handler sits on the `<aside>` only (`p2.mjs`: URL still `?episode=…` after Esc). **Fix:** handle Esc on the grid too: close the panel when one is open and nothing is ticked.
- **[PTR-04] Player bar and drawer buttons use `title`, so their tooltips never show on keyboard focus.** Row buttons use `Tip` (hover and focus); Back 15 / Forward 30 / Play / chapter buttons / "Close" don't. **Fix:** wrap them in `Tip` and drop `title`.
- **[TYPE-08] The Mac setup page's errors use straight apostrophes:** "That doesn't look like a web address.", "Couldn't reach …" (`desktop/src/main.ts` 277, 285). **Fix:** use ’.

### N/O

AX-04 (no Voice Access / Switch Access run), FOOT-02 (no long-list scroll measurement; the list is virtualised).

### N/A

FLOW-03 (no text entry in any task); DLG-02, DLG-03 (no alerts); CTRL-02, CTRL-03, CTRL-04, CTRL-07 (no checkbox hierarchy, text fields or search in the web build); LIST-03, LIST-05; DRAG-01 (reordering is out of scope), DRAG-03, DRAG-05, DRAG-06 → DRAG-01; START-02, START-03, START-05, START-06, START-07 (first run out of scope; no browser prompts on Chrome; no accounts); TOOL-06, SIDE-03 (nothing hides); SET-01 (Settings out of scope); WDATA-01, WDATA-03 (no drafts or forms).

### Passes worth naming

Grid keyboarding in a View (one Tab stop, arrows across rows and actions, Home/End, PageUp/PageDown, Space ticks, Shift-arrows, ⌘/Ctrl-A, type-ahead); the drawer's focus handling and Back popping one layer at a time; focus to the new heading on navigation; Episode panel in the URL and restored on reload; ⌘/Ctrl-Z through 30 steps; honest offline status; forced colours keep boundaries, progress and selection; no measured contrast failure; no FLOW failure at any width.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **6.9** (capped by WTYPE-02; uncapped ≈ 8.0) | A small scale with one role per step: Space Grotesk 28/30 px titles, Inter 15 px rows, 13 px secondary, 12 px metadata and tracked caps labels; tabular figures on times; real minus "−45:12"; "Couldn’t" and "…" typographic. Held down by the 200 % truncation, "26 / min" breaking number from unit when a star precedes the metadata, and two-line clamps that hide titles at any large size. | hierarchy, accessibility |
| Hierarchy | **7.8** | The list leads, the dark player anchors, chrome recedes; one tinted primary per screen (header Play). Short of Exemplary: desktop View rows run 1,170 px from title to Play with the right half empty (the design's upcoming-Entries panel isn't there); the desktop drawer at 1440 × 900 puts the Episode pill below its fold; at 720 × 450 the drawer's Play/Pause is below the fold with the mini-player hidden behind it. | content-first |
| Spacing & density | **6.9** (capped by WTYPE-05; uncapped ≈ 7.6) | 4 px rhythm, 76 px rows, shared left edge for artwork and headings. Gaps: Playlist rows stretch thin progress bars across 860 px on desktop; on the phone the only way into an Episode is its title text, 212 × 21 px for a one-line title (passes 2.5.8 by spacing, far under Android's 48 dp); 16 px checkboxes; fixed px chrome in the Entry row is what breaks at 320 px and 200 %. | craft, adaptability |
| Color & contrast | **8.2** | Restrained and meaningful: warm neutral page, one blue, dark player, tints for state; no text below 4.5:1 found on any screen or the drawer; focus ring 6.25:1, white on dark; forced colours handled. Below Exemplary: green means three things (Active Playlist, Played, Downloaded); position is blue `#2b50c8` in Playlists but `#3aa0e8` in the player; the sidebar's selected tint is 1.08:1 against the page, so selection there rests on bold weight; the scrubber thumb disappears in forced colours. | color-restraint |
| Iconography | **8.0** | One Lucide set at matching weight, custom 15/30 skip glyphs that fit it, labels on every icon-only control. Stretches: AudioLines in green for "Active Playlist"; ListPlus beside Plus for nearly the same action; filled transport glyphs next to outline row glyphs. | conventions, craft |
| Consistency & polish | **7.6** (stability 8.6) | Stability: every core element held through every flow at three widths; late data lands in skeletons; four inventory mismatches (above) keep it below 9. Category: hover, focus, pressed, loading, empty, error and offline states all designed. Unfinished details: a focus ring drawn round the View heading on every desktop and Mac launch (programmatic focus after the redirect, `d-view.png`, `mac-window.png`); "1 Entries · Keeps Entries" (Playlist subtitle doesn't use the plural helper the list uses); artwork turns into circles at 200 % (rem radius on px boxes); empty grey progress tracks on every unstarted Entry; "Up next · 0". | craft, stability |
| Clarity | **7.8** | Specific verbs (Play Next, Play Last, Use here), state in words (NOW / RESUME, Playing / Paused, "16:34 left" vs "45 min"), consistent domain nouns, tab title per view. Held down by the Esc mismatch, "1 Entries", the loaded Episode reading "Not started · Play" in its own detail, desktop row actions invisible until hover, and "Next" / "Last" as bare words. | plain-language, feedback |
| Platform fit | **6.9** (capped by BROWSER-01 and DLG-07; uncapped ≈ 7.4) | **Web:** Looks 8.3 (fills the viewport, own type, native select/checkbox/radio/range, reflows, Android-style bottom tabs, theme colour). Behaves 7.0 (real links, URL for the Episode panel, Back pops overlays, browser shortcuts and menus intact, Media Session set; but Back resets scroll, dialogs leak Tab, a page-wide `?`). (8.3 + 2 × 7.0) ÷ 3 = 7.4. **Mac shell:** Go ⌘[ ⌘], swipe and mouse buttons walk history, Copy Link maps in-app links to the server URL, Look Up, one instance, window bounds restored — but View opens with Reload (a named Foreign tell), there's no File menu so ⌘W doesn't close the window, no Controls menu for play/pause, skip and chapters, Undo is unlabelled, Help has only the shortcut list, and right-clicking a row gives Back/Forward/Reload rather than Episode commands. | conventions, stability |
| Interaction & feedback | **6.9** (capped by WKEY-03, WKEY-02, WDATA-04, DATA-06; uncapped ≈ 7.8) | Keyboard-fluent View grid, Space for play/pause outside controls, 30-step Undo, p75 100–118 ms, determinate cancellable downloads, everything works offline. Held down by the four majors, and a Playlist that tabs through three stops per Entry instead of using the View's grid. | keyboard-efficiency, forgiveness |
| **Overall** | **7.2** | It serves the task well and looks like itself: the browse → queue → listen loop is quick, calm and keyboard-able, and the flows never move under the person. What holds it down is a cluster of web-contract and accessibility edges (scroll lost on Back and reload, dialogs leaking focus, large text and narrow widths truncating Entry titles, Undo that times out on the phone) that cap four categories at 6.9. Cap: lowest category 6.9 + 2.0 = 8.9, not binding. | — |

### What stands between this and 9.0

Clearing the 8 majors lifts the caps (Typography ≈ 8.0, Spacing ≈ 7.6, Platform fit ≈ 7.4, Interaction ≈ 7.8), which puts Overall near 7.8. The rest is craft:

1. **Desktop View width:** build the designed right panel (target Playlist's upcoming Entries) or cap the list at a reading width so Play sits near the title; give rows a hover fill so the row reads as one object.
2. **Phone row target:** make the whole row (artwork + text) the Episode link, with Add and Play as separate targets, so the tap target is ~76 px tall, not 21.
3. **Mac shell grammar:** File (Close Window ⌘W), a Controls menu (Play/Pause Space, Back 15 ⌘←, Forward 30 ⌘→, Previous/Next Chapter, Play Next/Last), labelled Undo ("Undo Remove from Commute"), Reload moved out of View's first slot, a row context menu with the Episode commands.
4. **One meaning per colour:** a single progress colour; reserve green for one meaning (Played or Downloaded), and mark the Active Playlist with the accent or a neutral glyph.
5. **Launch polish:** no focus ring on the heading at load (focus `main` or skip the programmatic focus on the initial redirect); fix "1 Entries"; non-breaking space in "26 min"; `rounded-[10px]` in px for artwork; hide empty progress tracks until an Entry is started.
6. **Episode opens the same way everywhere:** Playlist Entry titles open the panel beside the Playlist on wide screens, like a View.
7. **One keyboard model for lists:** the Playlist and Up next use the same row grid as the View.

## Next step

- **Target:** BROWSER-01 / DATA-06 (major, Platform fit and Interaction & feedback, both 6.9, closest to the primary browse task on the phone).
- **Anti-pattern:** a single-page app that forgets where you were (the scroll is reset by a global navigation hook).
- **Root cause:** `useFocusOnNavigation` scrolls to (0, 0) on every path change, Back included, and the router has no scroll restoration.
- **Change:** enable the router's scroll restoration, scroll to top only on PUSH/REPLACE, keep heading focus with `preventScroll`.
- **Principle:** stability; user-control.
- **Expected effect:** Platform fit and Interaction lose one cap each (both still capped by other majors until those are fixed); no character element is touched.
