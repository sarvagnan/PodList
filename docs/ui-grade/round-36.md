# PodList UI grade, round 36

Graded against `~/Documents/UI_Guidelines` (`CRITIQUE.md`, full audit), at commit 48b698d. Independent read: earlier reports and the `UI-GRADE.md` work lists were not read.

## Frame

- **Task:** find Episodes through Views and Search, and listen to them through Playlists with their own playback state.
- **Target:** web app, an Android-first installable PWA. The Mac app is the same build in an Electron window; its shell was judged from `packages/desktop/src/main.ts` and by launching it.
- **Posture:** sovereign on the desktop, repeated short visits on the phone.
- **Audience:** perpetual intermediate (a personal tool used daily).
- **Nearest exemplar:** Things, for calm lists and domain words that carry a model.
- **Character:** Space Grotesk titles over Inter text; blue primary (#2b50c8) on warm off-white; dark player bar and drawer; Views and Playlists as equal halves, navigated by lists; plain domain vocabulary (Entry, Played, Rewind).
- **Owner decisions:** light appearance only; layout A; Inter and Space Grotesk; #2b50c8; dark player bar; designs in `docs/design/ui-layout.md`. ADR 0005 also records one tab at a time per Device (OPFS single owner). Scored; any cap stands; not proposed as the target.

## Flows

Tasks run: browse, listen, now playing, fresh device, second tab. Widths: phone 412×915, zoomed 720×450, desktop 1440×900. Light only. Script: `packages/web/ui-flows/flows.mjs`. Evidence: `flows-r36/measurements.json` (72 rows), `summary.md`, contact sheets and strips. Timed runs: 5 per step, desktop, no throttling, darwin arm64.

Failures: none. Open a Playlist p75 127 ms, Play from here p75 111 ms.

Added by hand, because the flow script has no typing step: a remote rename of a View while the name field was being typed in left the typed text intact (FLOW-03); removal, Undo and reorder kept focus and scroll.

Probe scripts and screenshots: `/private/tmp/claude-501/-Users-sarvagnan-Documents-PodcastClient/757d5d81-ed2f-4fea-8653-e2edc70bacb4/scratchpad/grade-r36/`. Browser: Playwright Chromium; Mac shell launched through `_electron`.

Not tested on a real Android device. Chrome's on-screen keyboard is the main gap: the code has no `interactive-widget` or `visualViewport` handling, and the sheets are anchored to the bottom of the layout viewport, so a sheet's lower buttons may sit under the keyboard. Worth one emulator check.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View | Toast above player: "Added…", dark | Inline in player for playback | none | In toast; ⌘Z | Dashed card, title + one line | none | Play in each row, trailing | Facts line under title |
| View editor | Live preview; no toast | Inline under the field, red text | none | ⌘Z | Matches 0 | none | Done, trailing top | "Every row must match…" |
| Search | none | Inline | none | n/a | Dashed card, "Search your Library" / "Nothing matches" | none | Save as View, above field | Rule line under field |
| Playlist | Toast: "Removed…", "Moved…" | Inline in player | Rewind dialog (Cancel focused) | In toast; ⌘Z | Dashed card, "Nothing here yet" | none | Play this, trailing top | Timeline explainer |
| Trash / Settings | Toast: "Moved … to the Trash" | n/a | none | Toast | Dashed card, "The Trash is empty" | none | Restore in row | Retention line |
| Library / Add | Result row, then toast | Inline under the field, red text | none | Unsubscribe toast | Dashed card, "No Subscriptions yet" | none | Add podcasts, trailing top | Helper text per tab |
| Second tab | n/a | n/a | "Use here" | n/a | n/a | Centred screen | Use here | One sentence |

Mismatches: empty-state titles take three patterns ("No … yet", "Nothing here yet", "The Trash is empty"), minor. Sidebar "Views" redirects to the first View on desktop while "Playlists" opens its overview, so the two equal halves differ.

## Checklist

Coverage: **99%** (pass 91 · fail 5 · N/O 1 · N/A 8). Mac IDs: N/A → target.

Failures by severity:

**Major**

- [BROWSER-04] ⌘-click or "Open in new tab" lands on a wall, not the page. Tab B at `/episodes/…` shows "PodList is open in another tab" with focus on `body`; "Use here" opens the page but turns tab A into the same wall and ends its playback without warning. Probe `p11.mjs`; `shots/tab-b.png`. The cause is ADR 0005 (one OPFS owner), so the cap stands and this isn't the target. Fix without changing the decision: say before the takeover that playback stops in the other tab ("Use here: playback in the other tab stops"), and hand the Position over so listening continues.
- [EDIT-02] Copy acts on the focused row, not the selection. With 3 rows ticked in a View, ⌘C put one URL on the clipboard (`p15.mjs`: `clip ticked 3`, the focused row only; `lib/rowGrid.ts:229`). Delete and Backspace on a focused Playlist Entry do nothing (`p8.mjs`: 3 → 3), though Remove is the row's own action. Fix: when rows are ticked, `onCopy` writes one line per ticked row (title and link); Delete on a focused Entry runs the row's Remove, with its Undo toast.
- [DATA-06] Collapsed sections don't survive a reload. On the phone, Search's Refine, opened with nothing narrowed, is closed after reload (`shots/ph-search-refine.png` vs `ph-search-refine-reload.png`); Listening stats' "Daily listening table" and "About your stats" are uncontrolled `<details>`. The defect is narrow: Refine reopens when a filter is in the URL, and sort order and last screen do persist. It's listed at the check's severity. Fix: keep each section's open state through `lib/remembered.ts`, as the first-run flag is.

**Minor**

- [KEY-08] The shortcut reference covers "Anywhere" and "In a View's Episode list" only. Playlist and Up next rows also take arrows, Home/End and type-to-jump, and handles take Space + arrows (`p9.mjs`). Fix: add a Playlist group.
- [WCOPY-01] The reference says Space plays or pauses "Anywhere", but inside the Now Playing drawer it does nothing (`p8.mjs`, Play stayed Play; `usePlayPauseKey` excludes `[role=dialog]`). Fix: let Space through in the drawer (not in form sheets), or change the row's scope.

N/O: DRAG-06.

N/A: LIST-01 (no outlines), LIST-05 → DATA-06, AX-05 (no autoplay; audio is the content), START-05 (no prompted permission), START-06 and START-07 (no accounts, ADR 0004), TOOL-06, SIDE-03 (nothing hides).

Recorded, not failed:
- axe reports `aria-required-children` on the Playlist grid (a `role=status` live region inside it) and `list`/`listitem` on the drawer's virtualized `ol`. `ariaSnapshot` shows the rows, list and items exposed correctly, so AX-01 passes; move the live region out and render `li` directly.
- `label-content-name-mismatch` on "Open Now Playing: …": the title is in the name, the podcast subline isn't.
- First Esc on a focused control with a tooltip only dismisses the tooltip; the drawer closes on the second. This is the layering APG describes, so WKEY-03 passes.
- Text-spacing and 200% probes found no clipping.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | Small scale (13 / 15 / 28 px, 12 px letterspaced section labels), each style with one role; 0 text under 12 px, typographic punctuation throughout. Below Exemplary: three identical "Less than 1 min" hero figures on Stats, and 13 px carries a lot on the phone. | `hierarchy`, `craft` |
| Hierarchy | **8.4** | Title, list, then player reads cleanly; row actions stay quiet until hover. Held back by the tinted Play circle repeated on every row, and Search's blank 64 px band above the field while idle (reserved for Save as View). | `content-first` |
| Spacing & density | **8.4** | Shared gutters, 76 px rows, reflow clean at 320 px and 200%. Measured nits: Library checkbox 3 px above row centre (177 vs 180), Playlist settings checkbox squashed to 13×16 (`flexShrink 1`), about 170 px of dead foot on the phone drawer. | `craft` |
| Color & contrast | **8.8** | One blue with one meaning, contrast scan 0 failures including the dark drawer, forced colors designed. A shade off Exemplary: Play-tint repetition; NOW tint and selection tint nearly the same. | `color-restraint` |
| Iconography | **8.5** | One lucide family at matching weight, custom 15/30 skips, tips on hover and focus. Funnel for Views is a stretch; the music-list glyph means both Playlists and Up next. | `conventions` |
| Consistency & polish | **8.5** (stability **8.9**) | Flow run clean at all widths; every state designed; one toast place, one Undo. Mismatches above; Stats bar carries a dark outline nothing else has. | `craft`, `stability` |
| Clarity | **8.6** | Domain words are plain and explained; "Unplayed again" previews. Off-note: "1 change is kept. They'll sync…" (`SyncIndicator.tsx`, singular/plural); "Next and Last go to" takes a moment. | `plain-language` |
| Platform fit | **6.9** (capped; uncapped 8.4: Looks 8.9, Behaves 8.2) | Real links and URLs, Back closes layers one at a time, tab title per section, native selects; Mac shell has full menus, native row menu, window state. Capped by BROWSER-04 and EDIT-02. | `conventions` |
| Interaction & feedback | **6.9** (capped; uncapped 8.6) | APG grid with type-ahead, multi-level Undo with focus restored, drafts, offline told truthfully, p75 under 130 ms, 60 fps over 500 Entries. Capped by DATA-06. Uncapped gaps: no seek keys on the web, Space dead in the drawer. | `keyboard-efficiency`, `forgiveness` |
| **Overall** | **8.4** | Excellent primary task, and calm. Cap is 8.9 (lowest + 2.0). Two narrow major failures hold two categories at 6.9; without them the app sits near 8.5–8.7. Weakness holding it down most: the one-tab wall, then row selection semantics. | |

## Next step

- **Target:** DATA-06 (a major in the joint-lowest category, closest to the primary task; BROWSER-04 is an owner decision).
- **Anti-pattern:** none named.
- **Root cause:** Refine's open state is derived only from narrowed URL params, and Stats' disclosures are uncontrolled.
- **Change:** one remembered open flag per section in `lib/remembered.ts`.
- **Principle:** `stability`. **Expected effect:** lifts the Interaction cap; EDIT-02 next, for Platform fit (still capped by BROWSER-04).

Craft gaps between here and Exemplary, after the failures:
1. Stats: reduce the three identical figures to one line when they match; label the chart's scale; drop the bar's dark outline.
2. Search: put Save as View on the title row so the idle band goes.
3. Fix the two checkbox nits and the "They'll sync" copy; give the phone drawer's lower third a job or shorten it.
4. Add seek keys on the web (←/→ outside fields, on the same single-key switch), matching the Mac app's ⌘←/⌘→.
5. Note that the browser's Find sees only rendered rows of a virtualized 500-Entry list (13 in the DOM); a filter on the Playlist would cover it.
6. Sidebar "Views": give desktop the same overview "Playlists" has, or make both go to the first item.
