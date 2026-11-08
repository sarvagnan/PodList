# UI grade, round 30

Graded independently against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit), at commit `a3ff975`. Earlier rounds and the UI-GRADE.md work lists weren't read. Evidence: the round-30 flow run (`flows-r30`: summary.md, measurements.json, strips), plus my own Playwright probes against the seeded demo and the empty demo (Chromium 1.65 headless, darwin arm64, no throttling, service workers blocked), and the Mac shell launched with Playwright's `_electron`. Probe scripts and screenshots are in the session scratchpad under `grade-r30/`.

## Frame

- **Task:** find Episodes through Views, queue them into Playlists, and listen through the player and the Now Playing drawer.
- **Target:** web app, an Android-first installable PWA (`display: standalone`). Platform fit is judged for Android Chrome and for a Mac desktop browser window. The Mac app is the same build in Electron. Its shell (menus, native row menus, window) is noted as supplementary evidence, and Mac IDs stay N/A → target.
- **Posture:** sovereign on desktop (a sidebar, a list and a detail panel, a persistent player). On the phone it's a pocket tool used in short bursts.
- **Audience:** perpetual intermediates, who use it daily and come to rely on the keyboard and Undo.
- **Nearest exemplar:** Things, for a calm personal list tool with lists that breathe, one accent, and inline actions on hover or selection.
- **Character:**
  1. A blue primary (#2b50c8) on a warm off-white page (#f6f5f2). *Owner-fixed.*
  2. Space Grotesk titles over Inter text. *Owner-fixed.*
  3. A dark slate player bar and Now Playing drawer. *Owner-fixed.*
  4. Lists everywhere, never capsules, with Views and Playlists as equal halves (variant A). *Owner-fixed.*
  5. Plain-spoken copy that capitalizes the domain's nouns (Playlist, Entry, Episode, Device).
- **Owner decisions:** light appearance only; variant A; the chosen designs (View editor R, Playlist settings and Rewind C, Library C); one tab at a time per Device (TabGate).

## Flows

**Tasks run:** browse, listen, now playing, fresh device (catalogue held 2 s), and second tab.
**Widths:** phone 412×915, zoomed 720×450, desktop 1440×900. Light appearance only.
**Timed runs:** desktop, 5 runs after a warm-up on darwin arm64, unthrottled. "Open a Playlist" p75 116 ms; "Play from here" p75 101 ms.
**Script:** `packages/web/ui-flows/flows.mjs`, which wrote `measurements.json` and `strips/<flow>/<width>/`.
**Failures:** none recorded. Core elements hold at every step and width, and the late catalogue fills skeleton rows in place (fresh device 1→2).

**Supplementary probes:** Rename a Playlist (settings), edit a View, Delete View with Undo, Search then Save as View, remove an Entry then ⌘Z, reorder from the keyboard, Rewind, Delete Playlist → Trash → Restore, Add podcasts (bad address, 404 feed), Unsubscribe, first run (empty server), offline Play, Back with each overlay open, scroll restoration after Back and reload, forced colours, reduced motion, 200 % text, 320 px, the WCAG 1.4.12 text-spacing overrides, a contrast scan of every screen including the drawer, and a target-size scan.

**Lab Core Web Vitals:** cold desktop load, 5 runs each:

| Page | LCP | CLS |
|---|---|---|
| /views | 208–308 ms | ≤ 0.008 |
| /playlists/default | 208–220 ms | ≤ 0.036 |
| /library | 264–356 ms | 0.002 |

**Outside the flows' reach:** the Playlist Name field resets itself when it's cleared. A Rename task isn't in the flow set, and the reset happens on the same frame as the keystroke, so the 2-s held-arrival method can't see it. It's recorded under WDATA-03 below.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (list + panel) | Dark toast above the player, desktop bottom-left of main: "Added “X” to Default" | none | none | In the toast, plus ⌘Z | Card in the list ("Nothing up next" dashed card in the panel) | none | Edit View, top-trailing; Play per row | Meta line under the title |
| View editor | Toast "Edited “X”" + Undo | Inline red under Name: "A View needs a name." | none | Toast, plus ⌘Z | n/a | none | Done, top-trailing of the panel or screen | Muted hint under Mentions; "Every row must match…" footnote |
| Search | none | none | none | n/a | Dashed card "Search your Library"; "Nothing matches / Try fewer or different words." | none | Save as View, top-trailing | Hint under the field |
| Episode detail | Toast | Offline: red "Not downloaded" in the player plus a sentence | none | Toast | n/a | none | Play, centred in the action row | none |
| Playlist (Entries, History, Timeline) | Toast "Moved “X”" + Undo | none | Rewind: modal "Rewind Commute to 08:46?", Cancel / Rewind | Toast, plus ⌘Z | Centred title + sentence ("Nothing finished yet…") | none | Play this, top-trailing | Timeline intro paragraph |
| Playlist settings | Toast on Delete ("Moved “X” to the Trash" + Undo) | Inline red under Name, **shown while the field still holds the old name** (see WDATA-03) | none | Toast | n/a | none | none (live apply); Delete as a red text button at the foot | "Saved as you type." |
| Trash | Toast "Restored “X”" + Undo | none | none | Toast | Sentence | none | Restore per row | "Deleted Playlists are kept for 30 days." |
| Library / Subscription | Toast | Inline red under the field (Add podcasts sheet) | Unsubscribe: modal, red Unsubscribe, focus on Cancel | Toast | Centred title + sentence ("No Subscriptions yet…") | none | Add podcasts, top-trailing | Hint under the field |
| Settings | Live apply | none | none | n/a | n/a | none | n/a | Hint under each row |
| Any (second tab) | n/a | n/a | n/a | n/a | n/a | Full-screen "PodList is open in another tab" + Use here | Use here, centred | One sentence |

**Mismatches:**
1. **Heading pattern for a child page on desktop** (Episode detail vs. Subscription and Playlist settings). Episode detail puts a "‹ Views" back link above the title. Subscription and Playlist settings use a breadcrumb title instead: "Library › Deep Field", "Workshop › Playlist settings". These are two patterns for the same relationship.
2. **Hero layout** (Episode detail vs. Subscription on the phone). Episode detail sets the artwork beside the title. Subscription sets the title first, then the artwork, with the description beside the artwork. The same "item header" is built two ways.
3. **Error state on the Playlist Name field.** It is the only field in the app whose error text contradicts the field's value. The View Name and New Playlist fields keep what was typed.

## Checklist

**Coverage: 93.9 %** (pass 92 · fail 1 · N/O 6 · N/A 6). Mac IDs: N/A → target, outside the count.

### Failures

**[WDATA-03] major — Validation doesn't keep what people typed (Playlist settings › Name, both widths).**
- **Where:** `packages/web/src/routes/playlists/$playlistId_.settings.tsx:52-54`, which runs `useEffect(() => { if (name === "" && !error) setName(playlist.name) })`.
- **Evidence (`grade-r30/pl3.mjs`):** I selected all of "Commute" and pressed Backspace.
  - The field read `""` at 0 ms and `"Commute"` at 200 ms, with focus still in it.
  - Typing "Bus" then gives `"CommuteBus"`, which the debounced rename saves.
  - When the debounce fires on the empty value, "A Playlist needs a name." appears under a field that shows "Commute" (`desktop-name-empty-focused.png`).
  - The same happens at 412 px. The View editor's Name field keeps `""` and shows its error correctly (`name2.mjs`).
- **Why it counts here:** clearing a name to retype it is the ordinary way to rename. The person's edit is overwritten and a name they didn't type is saved. It could also be read as FLOW-03, since a state sync replaces input in progress. It's recorded once, here, because no asynchronous completion is involved.
- **Fix:** delete the refill effect. Initialise `name` from the Playlist once, keyed on `playlistId`. Let an empty field stay empty, with the inline error and `aria-invalid`. Skip the rename while the field is invalid, and restore the saved name only on blur when the person leaves it empty, for example with "Kept the name “Commute”." This is the View editor's behaviour; reuse its code.

### N/O

KEY-06, CTRL-08, DRAG-05, DRAG-06, PTR-03, FOOT-02.

### N/A

AX-05 (no app-made audio information), START-05 (no permission prompts), START-06 and START-07 (no accounts), TOOL-06 (no hideable toolbar), SIDE-03 (sidebar can't be hidden).

### Passes worth recording

| ID | Evidence |
|---|---|
| BROWSER-01, -02 | Every state has a URL (`?edit=true`, `?episode=`, `?tab=timeline`, `?q=`, `?sort=title-desc`). Back closes the drawer and sheets before leaving the page, and returns focus to the row. |
| BROWSER-06 | Right-click on a row opens a task menu. Right-click on a link stays with the browser (`ctx.mjs`: no menu, event not prevented). Every command is also on the hovered or focused row. |
| WKEY-01 | View lists and Entries are APG grids: arrows, Home/End, ⌘End, PgUp/PgDn, type-ahead, and Space to select. |
| WKEY-03 | After a removal, focus goes to the next row. Delete View and Delete Playlist land on the new page's h1. Esc returns focus to the opener. Tab is trapped in the drawer and sheets. |
| APPEAR-03 | Forced colours keep boundaries, progress, selection and the drawer (`fc-*.png`). |
| APPEAR-04 | No text below 4.5:1 on any screen, including the drawer (`contrast.mjs`). |
| APPEAR-05 | Under reduced motion there are no transform transitions, and the drawer takes 0.15 s instead of 0.3 s. |
| WTYPE-02, -03, -05 | At 200 % text and at 320 px nothing scrolls sideways (scrollWidth equals the viewport) and nothing clips. |
| WTYPE-04 | Every target under 24 px meets the spacing exception. |
| WCOPY-01 | With an Android platform the shortcut sheet shows Ctrl+, and the ⌘K hint is hidden. |
| WDATA-04 | Undo toasts have no timeout. |
| RESP-01 | p75 ≤ 116 ms. |
| LIST-03, -05 | Sort reverses on a second click and survives a reload. The disclosure state survives a reload. |

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.7** | A small scale with one role per style: 12 px tracked caps for section labels, 13 px meta, 15 px rows, 28–30 px Space Grotesk titles. Curly quotes, "…", and a true minus in "−16:34". Held below 9 by the 13 px semibold player title on the phone against 15 px rows everywhere else, and by a sixth size (16 px medium) used only for empty-state titles. | hierarchy, craft |
| Hierarchy | **8.6** | Title, then one trailing main action, then the list, on every screen. Row actions appear on hover or focus, as in Things. Held back by the dark player bar, the heaviest shape on every screen (owner decision), and by the Timeline repeating "Rewind to here" on all five rows as permanent chrome. | content-first |
| Spacing & density | **8.5** | A consistent 4 px rhythm, 76 px Episode rows, and top-aligned paired panels (FLOW-05 passes). Edges disagree on desktop: the Subscription settings column ends at x 1292 while every other right panel ends at 1404–1408, and Episode detail stops at x≈895, leaving 545 px blank at 1440. | craft |
| Color & contrast | **9.0** | One blue for interaction, selection and NOW/Active; green for Played; amber for Star; red for destructive actions. Every text pair passes, the drawer included. Forced colours are handled. The ring is 6.25:1. The single theme is the owner's decision (WCOLOR-01 passes). | color-restraint, accessibility |
| Iconography | **8.8** | One Lucide family at matched weight, custom 15/30 skip glyphs with numerals, and labelled buttons on Episode detail. Icon-only row actions have tooltips and names. The funnel stands in for "Views", which is apt but takes learning. | conventions |
| Consistency & polish | **8.3** (stability 8.6) | Every state is designed: hover, pressed, focus ring (white on dark), selected row with a blue bar, skeletons, empty and offline states, forced colours. Lowered by the three inventory mismatches above, and most by the Playlist Name field showing an error that contradicts its own value. | craft, stability |
| Clarity | **8.7** | Specific verbs ("Play Next in Default", "Rewind Commute to 08:46?"). State is always visible (NOW, RESUME, Paused, the Active dot, "1 change will sync when you’re back online"). Nits: the View summary says "Under 30 min" for a condition of "At most 30 min"; on non-Mac the shortcut sheet reads "with Ctrl+ the first or last Episode"; the Search and Timeline explanations run to three lines. | plain-language |
| Platform fit | **8.7** (Looks 9.0, Behaves 8.6) | Real links, URLs for every state, Back unwinds overlays, the browser menu on links, APG grids, native selects and fields, the PWA supplies its own Back, and the browser's Ctrl+K is left alone. Behaves loses for the one-tab lock: Open Link in New Tab, a core browser capability, lands on a takeover screen, which is foreign even though it's an owner decision. In the Mac shell, the Controls menu lacks Speed and Sleep Timer, and Star and Mark Played exist only in row menus. | conventions, stability |
| Interaction & feedback | **6.9** (capped by WDATA-03, major; about 8.8 uncapped) | Keyboard-fluent grids, Undo instead of confirmation (⌘Z, with Undo in every toast), live-apply editors, and instant responses (p75 ≤ 116 ms). The one form bug caps the category. | forgiveness, feedback |
| **Overall** | **8.3** | Serves the task and is at home in the browser. The 8.9 cap (6.9 + 2) doesn't bind. Holding it down: the Rename defect, followed by the desktop edge alignment, and the heading and hero patterns that differ between child pages. | — |

## Next step

- **Target:** WDATA-03, the only major failure. It sits in the lowest category.
- **Anti-pattern:** "the form fights you": controlled state re-synced from the store while the person types.
- **Root cause:** a `useEffect` that treats an empty field as "not loaded yet" and refills it.
- **Change:** initialise once, keyed on `playlistId`. Keep an empty field empty, with the error. Restore the saved name only on blur, and say so. Add a test that clears the field and types a new name, and add a Rename step to the flow runs.
- **Principle:** forgiveness.
- **Expected effect:** Interaction & feedback 6.9 → about 8.8, Consistency & polish +0.2, Overall about 8.6.

### Further craft gaps between this build and 9.0

1. **Right edges on desktop.** Give every page's right column the same trailing line (x 1408 at 1440). The Subscription settings column should use the panel width the View and Search pages use. Episode detail should either centre its content column or put In your Playlists and Chapters in a second column at wide widths.
2. **One child-page header.** Use either a breadcrumb title or a back link on desktop for Episode detail, Subscription and Playlist settings, not both. Build the Subscription hero like Episode detail's, with the artwork beside the title.
3. **Timeline chrome.** Show "Rewind to here" on row hover or focus and on the latest event only, as the View rows do with their actions.
4. **Entries grid ARIA.** Each row's position or NOW `<span>` sits directly in `role=row`, outside a gridcell (`rows.mjs`). Wrap it in a gridcell, or put it inside the title cell and mark the Cursor row with `aria-current="true"`.
5. **Phone player title.** Set it at 15 px (`text-row`) like every other title, or 14 px with the meta at 13 px.
6. **Copy nits.** Write "Under 30 min" as "Up to 30 min". On non-Mac, write "with Ctrl, the first or last Episode".
7. **Mac shell.** Add Speed and Sleep Timer to Controls, and Star and Mark Played for the selected Episode, so the menu bar holds every command.
