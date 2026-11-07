# UI grade, round 23

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit) as a **web app**, at commit `a35c0c1`. The grader read no earlier round or UI-GRADE.md work list. Evidence came from the round-23 flow run (`flows-r23`: summary.md, measurements.json, contact sheets), plus my own Playwright probes against the demo server: Chromium headless at phone 412×915 @2×, zoomed desktop 720×450 @2× and desktop 1440×900 @1×, light appearance, service workers blocked. I also launched the Mac shell (`packages/desktop`) with Playwright `_electron` and read its menu from `Menu.getApplicationMenu()`. Probe scripts and screenshots are in the session scratchpad (`grade-r23/`).

## Frame

- **Task:** find Episodes through Views and Search, put them in Playlists, and listen through the player and the Now Playing drawer.
- **Target:** a web app (an Android-first installable PWA). The Mac app is the same build in an Electron window. Its menus and context menus are judged inside Platform fit, and the Mac checklist IDs are N/A → target.
- **Posture:** sovereign on desktop; on the phone, transient visits plus long listening.
- **Audience:** perpetual intermediate.
- **Nearest exemplar:** Things, for calm lists, restrained color and finished states.
- **Character:**
  - two equal halves, Views and Playlists, with navigation as lists (owner);
  - Inter with Space Grotesk headings (owner);
  - blue primary #2b50c8 on a warm off-white (owner);
  - a dark player bar and Now Playing drawer (owner);
  - plain-spoken copy in the domain vocabulary (Entry, Played, Rewind, Clear on Played).
- **Owner decisions:**
  - light appearance only;
  - layout A;
  - the fonts and colors above;
  - View editor R, Playlist settings and Rewind C, Library C.

## Flows

- **Tasks run** (flow run r23): browse, listen, now playing, fresh device, second tab. Each ran at phone 412×915, zoomed 720×450 and desktop 1440×900, in the light appearance. Late arrivals were held 2 s.
- **Timed runs:** desktop, darwin arm64, no throttling, 5 runs after a warm-up.
  - Open a Playlist: p75 132 ms.
  - Play from here: p75 116 ms.
- **Script:** `packages/web/ui-flows/flows.mjs`. Measurements are in `flows-r23/measurements.json`, and the strips are in `flows-r23/strips/`.
- **Supplementary probes:** focus after a row is removed, Undo, Back with overlays open, scroll restoration, the context menu, 320 px, 200% text, the text-spacing overrides, forced colors with reduced motion, target sizes, contrast, lab LCP and CLS (desktop LCP 192–212 ms, CLS ≤ 0.010; phone LCP 188–268 ms, CLS 0), and the keyboard paths through the grid, the drawer, dialogs and the reorder handle.

**Failures:** none.
- Every core-element move in the measurements is caused by the person. For example, the browse phone step-2 heading dy 48 is a navigation from the tab list to a drill-in screen with a Back link.
- Opening the bulk bar moves the View heading 2 px (53 → 55 px top, desktop), which is at the tolerance.
- Late catalogue arrival on a fresh Device moved nothing (fresh-device rows, dy 0 at every width).

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (list) | Dark toast above the player, e.g. “Moved “X””, “Downloading 2 Episodes” | — | — | Toast Undo (stays until replaced), ⌘Z stack of 30 | Dashed card, centered | — | Edit View, trailing in the header; row Play, trailing | Meta line states the conditions |
| View editor / Search | Live list (no toast, by design) | Inline under the field, red, “A View needs a name.” | Save as a View dialog | ⌘Z (edits put on the stack silently) | “Search your Library” dashed card | — | Done or Save as View, trailing in the header or panel | “Every row must match…” note |
| Playlist (Entries) | Toast “Removed from Workshop” | — | — | Toast Undo; focus returns to the restored row | Dashed card | — | Play / Play this, primary, trailing in the header | — |
| Listening Timeline | Toast after Rewind | — | Rewind confirmation (modal, compact trailing buttons, no ×) | Rewind can be undone | — | — | Rewind to here, per row | Paragraph explaining Rewind |
| Playlist settings / Trash | Toast on delete, with Undo | — | — (delete has no confirmation; it goes to the Trash) | Toast Undo + Restore in Trash | “The Trash is empty” dashed card | — | Delete Playlist, inline red | Explanatory caption |
| Library / Subscription | Toast “Unsubscribed from X” (no Undo) | Feed field: inline red under the field | Unsubscribe confirmation (modal, red primary, compact trailing) | none for Unsubscribe | — | — | Add podcasts, primary, trailing in the header | Field help text |
| New Playlist / Save as View | Navigates to the new item | Inline under the field | — | — | — | — | Full-width two-button footer, plus a × close | Help under the checkbox |
| Second tab | — | — | — | — | — | Centered “PodList is open in another tab” + Use here | Use here | One-sentence reason |

**Mismatches** (none is a checklist failure):
1. Undo safety differs. Delete Playlist has no confirmation and offers Undo plus the Trash. Unsubscribe gets a modal confirmation and no Undo (Library vs Playlist settings).
2. Toast wording differs. Moves name the Episode (“Moved “Joinery without screws””), removals name only the Playlist (“Removed from Workshop”) (Playlist vs drawer Up next).
3. There are two dialog footers. Form dialogs (New Playlist, Save as View) use a full-width 50/50 footer with a × close. Confirmations (Rewind, Unsubscribe) use compact trailing buttons and no ×. The primary action is trailing in both, so this passes FLOW-07, but the dialogs don't read as one family.

## Checklist

**Coverage: 94.9%** (pass 93 · fail 0 · N/O 5 · N/A 7 of 105 core and web IDs). The Mac IDs are N/A → target.

**Failures by severity:** none found among the verified items. In particular:
- KEY-01, WKEY-01 and WKEY-03 pass. The grid follows APG: arrows, Home/End, PgUp/PgDn, type-ahead (“th” → “The quiet edge…”), Space selects, Enter opens, and ← → reach the row's actions. Every dialog traps focus, Esc closes it, and focus returns to the opener.
- BROWSER-01 and -02 pass. Back closes the drawer, a drawer sub-page, the Add sheet and dialogs without leaving the page. `?episode=`, `?edit=true`, `?q=`, `?tab=` and `?sort=` all reopen on reload.
- FLOW-04 and WKEY-04 pass. The phone toast sits at 701–753 px, above the player at 761 px.
- DATA-05 passes. After Undo, focus lands on the restored row.
- APPEAR-03 passes. Under forced colors, boundaries, progress, the selected segment and the NOW Entry all remain.
- APPEAR-04 passes. Measured pairs:
  - muted text on the page: 5.9:1;
  - muted text on the accent tint: 5.34:1;
  - player muted text on #1b2a33: 7.1:1, and on #2c3d47: 5.43:1;
  - toast Undo (#9db4ff): 7.3:1, or 5.58:1 in the drawer;
  - Played green: 5.94:1;
  - field edge: 3.27:1.
- WTYPE-02, -03 and -05 pass. At 320 px the scrollWidth is 320 on six screens. At 200% text nothing is lost. The phone player drops Back 15 and the queue badge, but both are in the drawer.

**N/O:** KEY-06, DRAG-05, DRAG-06, FOOT-02, WDATA-02.

**N/A:** LIST-05 (no outlines); START-04, START-05 (no permission prompts); START-06, START-07 (no accounts); TOOL-06, SIDE-03 (nothing can be hidden).

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.6** | One deliberate scale: 13 / 15 / 28 px, plus letterspaced caps labels, with Space Grotesk only for headings. Type alone carries row hierarchy (title 15 px regular, meta 13 px muted). Curly quotes and the true ellipsis are used throughout. Held below 9: at the zoomed width the player title breaks mid-word into two lines (“The long life / of a shippin…”). Icons are fixed-px and don't follow 200% text, so a 12 px search glyph sits beside 32 px text and the sidebar `+` buttons shrink relative to their labels. | hierarchy, craft |
| Hierarchy | **8.5** | The list leads and chrome recedes on every screen: one tinted primary per header (Play, Add podcasts), with Play always last in a row. Held below 9: at 1440 px the Playlist, Library and Timeline pages stop at about 1150 px and leave a 290 px dead band beside the content. The desktop drawer clusters the player in its left 860 px, so the Up next column floats away from the controls. | content-first |
| Spacing & density | **8.4** | Shared 4 px rhythm, 76 px Episode rows, and left edges aligned across the header, rows and side panel. Targets are ≥ 24 px everywhere, and 44 px on the phone. Held back by: the dead band above; the phone drawer's three pills wrapping 2 + 1 (“Chapters · Episode / Up next · 3”); the Subscription header's 72 px artwork beside a one-line description, a lopsided block; and a sidebar that fills to the player at 900 px tall with 11 lists, whose footer crowds under text-spacing overrides (“Keyboard shortcuts” wraps and indents). | craft |
| Color & contrast | **8.8** | Nearly monochrome: one blue for interaction and selection, red only for destructive actions, green only for Played, amber only for Star. Every measured pair passes, including on the dark drawer and toasts, and forced colors is handled deliberately. The NOW / HERE label reuses the interactive blue for a status, a slight overload that keeps it under 9. | color-restraint |
| Iconography | **8.6** | One Lucide set at matched stroke, with standard glyphs (download, star, check, trash, share). Every icon-only button has a name and a tooltip, shown on focus too. The 15 / 30 numerals inside the skip icons are 11 px. Icons don't scale with text. The check means both “Played” (detail) and “Mark Played” (row), which is consistent but a little terse without its label on desktop rows. | conventions |
| Consistency & polish | **8.4** (stability 9.2) | Every state is designed: skeletons, empty cards, inline errors, forced colors, reduced motion and the takeover screen. Stability is clean across 5 flows × 3 widths. Held back by the three inventory mismatches; by “New View” persisting a View on every click, under the same name (three identical “New View” rows in the sidebar after three clicks, with no toast); and by the Listening Timeline showing only Listened and Finished events, while the chosen design C also lists “your own edits”. | craft, stability |
| Clarity | **8.4** | Domain words carry the model (Clear on Played, Keeps Entries, Rewind to here), and empty states say what to do. Held back by duplicate “New View” names; by the Timeline line “14:30 … Listened to X at 12:34”, where two clock-like times mean different things (time of day vs Position); and by the Timeline missing the edits the design promises, so a person can't see why their reorder is kept after a Rewind. | plain-language |
| Platform fit | **8.7** (Looks 8.9 · Behaves 8.6) | Real links, URLs for every state, Back that pops overlays, native selects and fields, and the browser's menu kept on links, text and fields. A row menu on rows only, whose commands are also visible. The Mac shell is solid: a full menu bar (File, Edit with “Undo “X””, View, Controls, Go, Window, Help), a native row context menu built from `data-row-menu`, and the window titled by the view. Held back by: a ⌘-click or middle-click on any link opening a tab that can only offer to take over (the one-tab Library), so the web's “open in background tab” habit fails softly; and, in the Mac app, Settings opening in the main window and selection in a fixed brand blue (Mac L6 and L8 foreign signals, minor for a web-first build). | conventions, stability |
| Interaction & feedback | **8.7** | Keyboard-fluent: an APG grid, ⌘Z / ⇧⌘Z with 30 steps, keyboard reorder with a live announcement (“Moved “Joinery…”” + Undo), focus kept after removals (it goes to the next row's Remove), and scroll restored on Back (119 → 119 px). Responses are within 200 ms. Held back by: the drawer's stacked pages (Chapters, Up next, Episode) focusing the whole dialog, so a screen reader reads “BackChapters0:00Cold open11:18…” rather than the page heading; after Restore in the Trash, focus going to the h1 instead of the next row or the restored Playlist; and New View creating a record before the person has decided to keep it. | keyboard-efficiency, forgiveness |
| **Overall** | **8.5** | It serves its task, and it is at home in the browser and, mostly, in a Mac window. The weakest areas are cross-screen consistency and clarity details, not structure. The lowest category is 8.4, so no cap applies. | — |

## What stands between this and 9.0

The checklist is clean, so the gap is craft. In order of payoff:

1. **New View naming and lifecycle** (Consistency, Clarity, Interaction):
   - give a new View a unique name (“New View 2”) and focus its Name field with the text selected;
   - if it's left with the default name and all conditions at Any, discard it on Done or navigation, with a “Discarded empty View” toast and Undo.
2. **Listening Timeline as designed** (Clarity, Consistency):
   - add the person's own edits (added, moved, marked Played) as non-rewindable rows under the same date headings;
   - reword the Position as “at 12:34 in” or “stopped at 12:34”, so it doesn't read as a second clock time.
3. **One safety model and one message form** (Consistency):
   - Unsubscribe without a confirmation, with an Undo toast for 4 s plus ⌘Z, like Delete Playlist;
   - removal toasts name the Episode (“Removed “X” from Workshop”);
   - one dialog footer: compact trailing buttons everywhere, or the full-width pair everywhere, with the same close affordance.
4. **Wide-desktop use of space** (Hierarchy, Spacing):
   - at ≥ 1280 px, let the Playlist Entries, Library table and Timeline use the full content width, or give the Playlist page the same right panel a View has (the open Episode or Up next);
   - in the desktop drawer, center the two columns as one 1080 px block.
5. **Drawer sub-page focus** (Interaction): on opening Chapters, Up next or Episode inside the drawer, focus the page's heading (tabindex −1), as main-area navigation already does.
6. **Small finishing items:**
   - phone drawer pills in one row (icon-only Chapters and Episode, or a three-segment row);
   - zoomed player title on one line with a tail ellipsis;
   - icon sizes in rem so they track 200% text;
   - after Restore, focus the restored Playlist's link in the sidebar.

## Next step

- **Target:** Consistency & polish and Clarity (tied lowest at 8.4). The one closest to the primary task is New View in the finding half.
- **Anti-pattern:** a silent side effect. A record is created by opening an editor.
- **Root cause:** New View persists immediately under a fixed default name, so abandoned or repeated attempts pile up as identically named Views.
- **Change:** unique default names, plus discarding an untouched new View when it is left (with an Undo toast).
- **Principle:** forgiveness, plain-language.
- **Expected effect:** Consistency and Clarity each about +0.2, Interaction +0.1, and no regressions.
