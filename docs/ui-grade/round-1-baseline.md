# PodList web app: full audit (run 1)

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md § Full audit; core-checklist.md, web-checklist.md, rubric.md, platform-fit.md § Web). Build: `packages/web/dist` as served by `ui-flows/demo.mjs`. Browser: Playwright Chromium (headless), macOS arm64, no CPU or network throttling. Light appearance only. Grader's own probes and captures are in `/tmp/podlist-grade/` (`probeA`–`probeC`, `probeErr`, `probeTab`, `probeFont`, `probeOrder`, `probePos`, `probeTime` `.mjs` with `.json` output, plus PNGs). Probes changed the demo server's state while they ran (the Active Playlist moved to Workshop), so some of the grader's captures show different Active and Cursor states from the flow run. Phone and zoomed captures are 2× (CSS px = pixels ÷ 2); desktop is 1× (CSS px = pixels); all at 100% browser zoom unless stated.

## Frame

- **Task:** Pick up listening where you left off: open a Playlist, play from its Cursor or from any Entry, and control playback (pause, skip). The planned second half is finding Episodes through Views.
- **Target:** Web app. It's an Android-first installable PWA (`display: standalone`), and the Mac app is the same build in an Electron window. Per the owner, it's judged as a web app, including Platform fit.
- **Posture:** On the phone it's transient: open, start or adjust playback, put the phone away, and playback continues in the background (Media Session handlers are wired). On the desktop it's a light sovereign window kept open beside other work.
- **Audience:** Perpetual intermediate. The domain is opinionated (Views, Playlists, Cursor, Entries), and the app expects people to learn it once.
- **Nearest exemplar:** Things. It's a calm personal tool built on opinionated reduction: two fixed halves (finding and listening) instead of feeds and queues. Things is a reference for decisions, not a look to copy.
- **Character** (signature elements; **owner-fixed** marked):
  1. Space Grotesk headings over Inter body text (**owner-fixed**).
  2. One blue primary, #2b50c8, on a warm off-white, #f6f5f2 (**owner-fixed**).
  3. A dark slate player: a rounded mini-player on the phone and a full-width bar on the desktop (**owner-fixed**).
  4. Navigation between Views and between Playlists is always a list, never capsules, with Views and Playlists as equal halves (**owner-fixed**, layout A).
  5. Colored square podcast artwork tiles, and a Cursor column (`NOW` / `HERE` / ordinal) with a thin per-Entry progress line.
- **Owner decisions (scored, not targeted):** Light only; dark isn't designed yet. Layout A with phone tabs and a mini-player, and a desktop sidebar and player bar. The brand fonts and the blue primary.
- **Baseline:** `/tmp/podlist-ui/run1/strips/*/*/01-*.png`.

## Flows

- **Tasks run:** browse (Views → Commute → Default → Library), listen (open Default → play third Entry → playing → pause → forward 30 → open Commute → Play this → Commute playing), fresh device (open Default with the catalogue held 2 s → catalogue arrives), second tab (open in a second tab → Use here → first tab after takeover).
- **Widths:** phone 412×915 @2×, zoomed desktop 720×450 @2×, desktop 1440×900 @1×. **Appearance:** Light. Dark isn't offered, so dark-dependent checks are N/A.
- **Timed runs:** desktop, 5 runs after a warm-up, no throttling, darwin arm64. From `summary.md`: open a Playlist p75 **132 ms**, Play from here p75 **107 ms**. Grader's extra timing (`/tmp/podlist-grade/probeTime.mjs`, 5 runs): player toggle, forward 30, and back 15 all show their first visible change at p75 **≤ 1 frame** (1 ms to the next animation frame).
- **Script:** `packages/web/ui-flows/flows.mjs`, with demo data from `ui-flows/demo.mjs`. **Measurements:** `/tmp/podlist-ui/run1/measurements.json` (51 rows). **Strips:** `/tmp/podlist-ui/run1/strips/<flow>/<width>/NN-step.png` and `contact-<flow>.png`.

**Results**
- **FLOW-01 holds.** Every unprompted step (listen 3 "playing", listen 8 "Commute playing", fresh device 2 "catalogue arrives", at all three widths) has 0 px moves for heading, navigation, player, and main action. Every move in the file is caused by the person.
- **FLOW-02 fails (major).** listen step 7, "play this", at phone, zoomed, and desktop: before the step, focus is on `button "Play this"`. After it, `focus: null` (body). The button is replaced by the "Playing" pill, so focus is dropped. Reproduced from the keyboard on desktop: `probeB.json` → `focusAfterPlayThis: {tag: "body"}`.
- **Caused, but uneven (not a failure):** "Play this" (44 px tall) and the "Playing" pill (about 32 px) have different heights, so the same kind of header sits at different heights. Phone and zoomed listen step 7: heading dy −5 px. Desktop: −3 px. The heading also differs by 5 px between Default and Commute on the phone in browse steps 2 and 3. This counts against the stability sub-score.
- **Second-tab flash:** the strip `strips/second tab/*/02-use-here.png` shows "No Views yet" and an empty PLAYLISTS sidebar heading. The grader's re-run (`probeTab.json`) shows the real data within 200 ms. This is a transient false empty state, recorded under START-01.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| Views list | none | none | none | none | Dashed card centred under the heading: "No Views yet" + explanatory sentence, muted, no action | none | none (rows are links with chevrons) | Inline example in the empty state ("such as new episodes this week") |
| View detail | none | none | none | none | Dashed card: "Episodes appear here / This View's episode list arrives with the Views screen." Developer note, shown for every View | none | none | none |
| Playlists list | Active Playlist: green caps badge **"PLAYING"** (10 px, rounded-md) beside the name, plus a "**Now:** title" line | none | none | none | none (the Default Playlist always exists) | none | none | none |
| Playlist detail | "Play this" turns into a green pill **"Playing"** (13 px, rounded-full) at the trailing end of the header; the Cursor column shows **NOW** / **HERE**; the row's ▶ turns into ❚❚ | none inline. Playback errors go to the player. An unknown or deleted Playlist id renders a **blank main area** | none | none | Dashed card: "Nothing here yet / Add episodes from a View with Play Next or Play Last." (refers to unbuilt features) | none | "Play this", a blue filled pill at the trailing end of the header, at every width | none |
| Library | none | none | none | none | Dashed card: "No Subscriptions yet / Podcasts you follow appear here." (no next step) | none | none | none |
| Player (mini and bar) | ▶ / ❚❚ glyph swap, progress line | Subtitle line becomes salmon 11 px "**Can't play: MEDIA_ELEMENT_ERROR: Format error**" (raw), `role=alert`, no action | none | none | Hidden when nothing is loaded | none | Play/Pause, centred white disc | none |
| Second-tab takeover | n/a | n/a | "Use here", a centred full page | none | n/a | Full page: H1 "PodList is open in another tab" + sentence + blue "Use here" | "Use here" | none |
| Unknown route | n/a | Unstyled TanStack default "**Not Found**" at the top-left of the main area, with no way on | none | none | n/a | none | none | none |

**Mismatches**
1. **The Active state has three forms and two wordings:** "PLAYING" (caps, 10 px, rounded-md badge) on the Playlists list; "Playing" (sentence case, 13 px, rounded-full pill) on Playlist detail; a green dot on the desktop sidebar; nothing on the phone tab bar. Screens: Playlists list, Playlist detail, Sidebar.
2. **The Cursor has two vocabularies:** "Now:" / "Paused on:" (Playlists list) and "NOW" / "HERE" (Playlist detail). Screens: Playlists list, Playlist detail.
3. **Errors appear in three places and forms:** the player subtitle (raw media text), a blank main area (missing Playlist), and unstyled "Not Found" (unknown route). None uses the app's own type or voice. Screens: Player, Playlist detail, unknown route.
4. **Empty states use four voices:** explanatory (Views), developer note (View detail), pointing at unbuilt actions (Playlist detail), no next step (Library). Screens: Views, View detail, Playlist detail, Library.
5. **Library has two names:** "Library & Subscriptions" (desktop sidebar) versus "Library" (phone tab and page heading). Screens: Sidebar, Library.

## Checklist

**Coverage: 95.4%** (62 of 65 applicable items verified: **pass 43 · fail 19 · N/O 3 · N/A 40**; 105 core and web IDs in total). Mac IDs: N/A → target (one line, excluded from coverage). No blockers.

### Failures by severity

**Major (10)**
- **[FLOW-02]** Focus is dropped to `<body>` when "Play this" is replaced by the "Playing" pill. Evidence: `measurements.json` listen step 7 at all widths (`focus: null`), and `probeB.json` `focusAfterPlayThis`.
- **[WKEY-03]** After an in-app view change, focus doesn't move to the new view. Desktop: Enter on sidebar "Commute" leaves focus on the sidebar link (`probeB.json` `focusAfterSidebarEnter`; also `measurements.json` browse desktop step 2, focus `a "Commute3"`). Phone: Enter on a Playlists row leaves focus on `<body>` (`phoneFocusAfterRow`). Nothing focuses the H1 or `main`.
- **[WKEY-04]** At the zoomed-desktop width (720×450), Tab reaches the fourth Entry's Play button at y = 339–383, fully under the fixed mini-player and tabs (top 312). The focused control is invisible. The third button is partly hidden. Evidence: `probeB.json` `obscured zoomed`; `/tmp/podlist-grade/obscured-zoomed-4.png`. Cause: `main` has `pb-40`, but there's no `scroll-padding-bottom`, so focus scrolling stops at the viewport edge, under the fixed bar.
- **[WCOLOR-02]** The focus ring is the accent at 50% alpha (`outline-ring/50` in `index.css`), drawn as #91a2dd on #f6f5f2, which is **2.29:1**, below 3:1. Evidence: pixels sampled from `/tmp/podlist-grade/focus-desktop-sidebar.png`. On the dark player the ring is 8.85:1 (passes).
- **[APPEAR-03]** Under `forced-colors: active`, several things disappear. "Play this" loses its only boundary (its fill) and reads as plain text. Every per-Entry progress bar and the player progress line vanish. The current-row tint and the sidebar Active dot vanish. The phone tabs become three identical links. The play/pause disc vanishes. Evidence: `/tmp/podlist-grade/forced-colors-phone-default.png`, `forced-colors-desktop-commute.png`.
- **[TYPE-05]** With a larger browser font-size setting, the hierarchy inverts and content is lost. Text set in fixed `px` (H1 28 px, Entry times 11 px, badges) doesn't grow, while rem-sized controls and row titles do. At 150% (Chrome "Very large", 24 px) titles shrink to about 12 characters ("The quiet e…"), with row titles larger than the H1. At 200% every Entry title collapses to one letter ("T…"). Evidence: `/tmp/podlist-grade/fontsize150-phone_playlists_default.png`, `fontsize200-phone-default.png`. Browser zoom to 200% is fine (WTYPE-02 passes).
- **[COPY-02]** The playback error reads "Can't play: MEDIA_ELEMENT_ERROR: Format error" (phone) or "Can't play: The element has no supported sources." (desktop). It's raw, truncated, 11 px, shown in the player rather than at the row the person pressed, and offers no recovery. Meanwhile the header still says "Playing" and the row says NOW. A missing or deleted Playlist (`/playlists/nope`) renders an empty main area, and an unknown route shows an unstyled "Not Found". Evidence: `/tmp/podlist-grade/error-phone.png`, `probeErr` output, `unknown_playlists_nope.png`, `unknown_nowhere.png`.
- **[AX-02]** Two states are shown by hue alone. The selected phone tab differs only in color (#2b50c8 against #5c6070, **1.09:1** between them, same weight and icon). The desktop sidebar's Active Playlist is a green dot against grey dots of the same shape, and the dot is `aria-hidden`, so a screen reader gets nothing. Evidence: `AppShell.tsx` (`BottomTabs`, `Sidebar`); `strips/browse/phone/*`.
- **[START-01]** First load shows false empty states before data arrives. "No Views yet" (Views) and "No Subscriptions yet" (Library) appear at 100 ms, and the real lists at 250 ms. Evidence: `probeA.json` `firstLoad`; `/tmp/podlist-grade/first-load_views-100.png`, `first-load_library-100.png`; also the second-tab strip `02-use-here.png`, where the sidebar shows an empty PLAYLISTS heading. On a fresh device, every Entry reads "**Episode unavailable**", with blank artwork, until the catalogue arrives. Evidence: `strips/fresh device/*/01-open-default.png`. The Episodes are loading, not unavailable.
- **[WTYPE-01]** Text people need is below 12 px: the time on every Entry row (11 px), the phone mini-player subtitle (11 px), the playback error (11 px), the "PLAYING" badge (10 px), and the desktop sidebar section labels (11 px caps). Evidence: `probeC.json` `small …`.

**Minor (9)**
- **[CTRL-05]** No custom button shows a pressed state. "Play this", the player toggle, and the skip buttons have no `:active` style, and "Play this" has no hover either. Evidence: classes in `AppShell.tsx` and `$playlistId.tsx`.
- **[PTR-04]** The icon-only buttons (row ▶/❚❚, back 15, play/pause, forward 30) have no tooltip, either on hover or on keyboard focus. Evidence: no `title` and no tooltip component in the code.
- **[APPEAR-09]** Skip back and skip forward use `RotateCcw` and `RotateCw` with no "15" or "30". `RotateCw` is the browser's reload glyph. On the phone it's the only secondary control, so it reads as "refresh". Evidence: `strips/listen/phone/*`, `AppShell.tsx`.
- **[APPEAR-11]** The status labels contradict each other. "Playing" (pill) and "PLAYING" (badge) are shown for the Active Playlist while playback is paused. The mini-player shows ▶ in the same frame (`strips/browse/phone/03-default-playlist.png`, `strips/listen/*/04-pause.png`). CONTEXT.md separates *Active Playlist* from playing. There's also a blank main-area frame at 100 ms on `/playlists/default` (`first-load_playlists_default-100.png`).
- **[TYPE-07]** The all-caps "NOW" and "HERE" Cursor labels have no added letterspacing (`letter-spacing: normal`; the rule wants about 5–12%). Evidence: `probeC.json` (`12px 600 … ls=normal "HERE"`).
- **[TYPE-08]** Straight apostrophes appear in the app's own text: "Can't play", "This View's episode list". Evidence: `AppShell.tsx`, `views/$viewId.tsx`.
- **[COPY-01]** Terminology is inconsistent: Library versus "Library & Subscriptions"; "Now:" / "Paused on:" versus "NOW" / "HERE"; "PLAYING" versus "Playing". See inventory mismatches 1, 2, and 5.
- **[COPY-03]** Every View row (a chevron link, on the "finding" half of the app) leads to a placeholder: "Episodes appear here / This View's episode list arrives with the Views screen." It's a developer note with no next step. "No Subscriptions yet" gives no next step either, and "Nothing here yet" points at Play Next and Play Last, which don't exist yet. Evidence: `/tmp/podlist-grade/view-detail-desktop.png`, `probeA.json` `viewDetail`.
- **[BROWSER-03]** The `<title>` is always "PodList" on `/views`, `/views/starred`, `/playlists`, `/playlists/commute`, `/library`, and on the takeover screen. Evidence: `probeA.json` `titles`.

### N/O (3)
CTRL-08 (no operation ran past the 2 s hold); FOOT-02 (the lists hold 3–4 rows, too few to judge scrolling); WDATA-02 (denied or full storage wasn't reproduced).

### N/A (40)
- FLOW-03 (no text inputs exist).
- KEY-06, KEY-08, WKEY-02, WCOPY-01 (the app has no custom shortcuts).
- DLG-01, DLG-02, DLG-03, DLG-04, DLG-05, DLG-07, DLG-09 (no dialogs or popovers; the takeover is a full page).
- CTRL-02, CTRL-03, CTRL-04, CTRL-06 (no checkboxes, fields, or menus); CTRL-07 (Search not built).
- LIST-03 (no sorting); LIST-05 (no disclosure); LIST-07 (lists of links and buttons with no selection model).
- DATA-04 (no undoable edits built; Rewind planned); DATA-05 → DATA-04.
- DRAG-01, DRAG-03, DRAG-05, DRAG-06 (no drag; reorder and OPML not built).
- TYPE-06 (no reading text).
- AX-05 (no autoplay; the audio is the content).
- START-02, START-03 (first run not built); START-04, START-05 (no permission prompts); START-07 (no accounts).
- EDIT-02 (no custom editors).
- TOOL-06, SIDE-03 (nothing can be hidden).
- SET-01 (Settings not built).
- WKEY-01 (no composite widgets).
- WDATA-01, WDATA-03 (no forms).

<details>
<summary>Pass ledger (43)</summary>

| IDs | Evidence |
|---|---|
| FLOW-01 | All 51 rows: every unprompted step has 0 px core moves at all widths |
| FLOW-04 | The playback error appears in the sticky player, in view at every width (`error-phone.png`) |
| FLOW-05 | Desktop sidebar and main area share top 0 |
| FLOW-06 | No persistent heading shells: Views has an empty state, and the Default Playlist always exists. The transient load frames are START-01's |
| FLOW-07 | "Play this" sits at the trailing end of the header at every width, and the "Playing" pill takes the same slot |
| KEY-01 | Every built task works by keyboard alone (sidebar, rows, Play this, player); no trap (`probeB` tab order) |
| KEY-04 | Logical order (sidebar → rows → player), Shift-Tab works, `:focus-visible` only. The ring's contrast is WCOLOR-02's |
| KEY-07 | Native document scrolling; no custom scroll containers in the content |
| LIST-01, LIST-02 | Flat lists; every list screen has an H1 |
| LIST-04 | The progress track visually ties each title to its time on wide desktop rows |
| LIST-06, SIDE-04 | The sidebar and tabs highlight the current destination (desktop by fill and weight) |
| DATA-01 | Position survives reload. Reloading while playing loses up to the 15 s report interval (`probePos`: 22:08 → 22:02). Noted, not failed |
| DATA-06 | The last view is restored from the URL on reload (`probeA` `reloadCommute`) |
| PTR-03 | Links get the pointer cursor; buttons follow the web default |
| APPEAR-04 | All text measured ≥ 4.5:1: muted 5.73:1 on background and 5.34:1 on accent; NOW/HERE 5.82:1; Playing 5.53:1; player muted 7.10:1; error 8.66:1 |
| APPEAR-05 | No animations or transitions exist (`probeC` `animations: 0`) |
| APPEAR-10 | Controls are distinct: the dark player, blue ▶ glyphs, the filled primary |
| TYPE-02, TYPE-03 | Two deliberate families at weights 400–700; legible at 13–16 px. The size-adaptation failure is counted once, under TYPE-05 |
| COPY-04 | Sentence case throughout; no tooltips to judge |
| AX-01 | Icon buttons have names ("Play The quiet edge … from here", "Back 15 seconds"); landmarks: navigation "Sections" and "Library and lists", region "Now playing", main. The wrong `aria-current` on the back link is noted below |
| AX-04 | No gesture-only paths |
| START-06 | No account needed |
| EDIT-05 | Rows are real links, so Copy Link gives a URL |
| WIN-03, WTYPE-05 | 320 px reflow: `scrollWidth` 320 on all four screens; no overlap at 1440 |
| RESP-01 | p75 132 / 107 ms (summary), ≤ 1 frame for toggle and skips |
| BROWSER-01 | Back and Forward walk Library → Commute → Views → Commute and restore each view (`probeA` `history`) |
| BROWSER-02 | Every view has a URL that survives reload |
| BROWSER-04 | All navigation is `<a href>` (`probeA` `anchors`) |
| BROWSER-05, BROWSER-06, BROWSER-08 | No key capture, no custom context menu, no `user-select: none` |
| BROWSER-07 | Native `<button>` elements throughout |
| BROWSER-09 | Standalone PWA: phone drill-downs have an in-app back link, and the desktop sidebar reaches every destination |
| BROWSER-10 | Lab, desktop, 3 cold loads: LCP 304–344 ms, CLS 0.0036 |
| WDATA-04 | The playback error persists (still present at 9 s) and is `role=alert` without moving focus |
| WCOLOR-01 | Single theme, `color-scheme: light` declared in both the meta tag and the CSS |
| WTYPE-02 | Browser zoom to 200% (the 720×450 flow) loses nothing; `user-scalable` isn't disabled |
| WTYPE-03 | WCAG 1.4.12 overrides: no clipping (`textspacing-phone-playlists.png`) |
| WTYPE-04 | No pointer target under 24×24 on any screen; row and player buttons are 44×44 |

</details>

## Scores

Light appearance only. Behavioral categories come from the running app and the code, not just screenshots.

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **5.8** | The roles are clear. Space Grotesk 28/30 px H1, Inter 14–16 px titles, and 12–13 px muted metadata give a readable phone hierarchy, so it's above the bottom of Competent. It's held down by 11 px Entry times, error, and subtitle and a 10 px badge (WTYPE-01 major), by fixed `px` sizes that ignore the browser font-size setting (TYPE-05 major: titles collapse to "T…" at 200%), by caps with no tracking (TYPE-07), and by straight apostrophes (TYPE-08). Capped at 6.9. | `hierarchy`, `accessibility` |
| Hierarchy | **6.4** | On the phone the eye goes heading → list → player. The single filled primary ("Play this") is the only tinted control, and the dark player recedes into a fixed band. On the desktop, Entry rows run about 1,150 px wide, with the title at x = 360 and its ▶ at x = 1,386. Content fills the top quarter of the main area, so the dark player bar wins the squint test. The desktop `/views` page repeats the sidebar's list. Competent, upper half. | `content-first`, `hierarchy` |
| Spacing & density | **5.9** | Phone rhythm is consistent: 64 px rows, 44 px targets, 20 px gutters. On zoomed desktop, fixed chrome takes 138 of 450 px (31%), leaving about 250 px of content. The desktop stretches three-row lists edge to edge, so density doesn't change with the task. The header height changes 3–5 px between "Play this" and "Playing". The time label isn't tabular, so progress-track ends wobble from row to row (1,313 and 1,318 px). No cap. | `craft`, `hierarchy` |
| Color & contrast | **6.2** | Restrained and meaningful: one blue for interaction, green for Active, and slate for the player. Every text pair measured passes (5.3–16.3:1). The focus ring is 2.29:1 (WCOLOR-02 major). Under forced colors, the primary button boundary, all progress, and the selection disappear (APPEAR-03 major). The Active state reads as "Playing" while paused (APPEAR-11). Capped at 6.9. | `color-restraint`, `accessibility` |
| Iconography | **5.4** | One Lucide set at one stroke weight that matches the text. But the skip buttons use the reload glyphs with no 15 or 30, and on the phone the lone `RotateCw` reads as "refresh" (APPEAR-09). Every View row repeats the same funnel tile and every Playlist row the same list tile, so they're decorative. Icon-only buttons have no tooltips (PTR-04). Competent, low. | `conventions`, `plain-language` |
| Consistency & polish | **5.3** (stability **6.0**) | The main path is clean, but the edge states weren't designed: an unstyled "Not Found", a blank page for a missing Playlist, false empty states while loading, and "Episode unavailable" as a loading label. No button has a pressed state (CTRL-05). The inventory has 5 mismatches (Playing/PLAYING, Now/HERE, error placement, empty-state voice, Library naming). The Playlist order isn't stable between devices: Default, Commute, Workshop in the flow run, then Commute, Workshop, Default and Workshop, Default, Commute on later fresh devices (`probeOrder`, `probeTab`). Capped at 6.9 by the sub-score band. | `craft`, `stability` |
| Clarity | **4.9** | The domain words are consistent with CONTEXT.md, and "Play this" and "Play … from here" are specific. But half the model (Views) leads to a developer placeholder (COPY-03). "Playing" is shown while paused. The Entry time sometimes means elapsed and sometimes duration, in the same slot ("22:00" is the Position; "22:02" is a duration). The error is raw media-element text (COPY-02 major). The skip glyphs read as reload, and the tab title never names the view. Top of Weak. | `plain-language`, `feedback` |
| Platform fit | **6.8** (Looks 7.2, Behaves 6.6) | **Looks:** L1 Native (fills the viewport, own sidebar); L2 Adapted (brand fonts, but 11 px text); L3 Adapted (native buttons, but no pressed states, and the boundary is lost in forced colors); L4 Native; L5 N/A; L6 Adapted (focus and selection differ, but the ring is weak); L7 Native; L8 Native (reflows 320 → 1440). **Behaves:** B1 Native; B2 Adapted (URLs and reload restore, but the title is constant and a missing Playlist is blank); B3 Native (real links); B4 Native; B5 N/A; B6 Foreign-leaning (focus isn't managed on view changes, focus is obscured at zoom); B7 Native; B8 Native (LCP 0.3 s, CLS 0.004); B9 Adapted (phone back links; Media Session for lock-screen controls). (7.2 + 2 × 6.6) ÷ 3 = 6.8. This matches the Competent web anchor ("focus isn't managed on view changes"). BROWSER-03 is minor, so no cap. | `conventions`, `stability` |
| Interaction & feedback | **5.6** | Instant feedback: open a Playlist p75 132 ms, Play from here 107 ms, toggle and skips ≤ 1 frame. The whole task works from the keyboard, Position survives reload, and errors persist without stealing focus. Against that: focus isn't moved on view changes (WKEY-03), focus is dropped after "Play this" (FLOW-02), the focused row is hidden at zoom (WKEY-04), state is shown by color only (AX-02), first-load placeholders mislead (START-01), and there are no media-app shortcuts at all (Space doesn't play or pause). Capped at 6.9. | `keyboard-efficiency`, `feedback`, `accessibility` |
| **Overall** | **5.4** | The listening half is fast, stable (no unprompted movement in 51 measured rows), and recognisably itself. The finding half dead-ends in a placeholder, errors and loading states speak in raw or false terms, and keyboard and low-vision users meet dropped, hidden, and faint focus. The lowest category is Clarity at 4.9, so the cap is 6.9. Clarity holds Overall down most. | `content-first`, `plain-language` |

**Caps applied:**
- Typography ≤ 6.9 (WTYPE-01, TYPE-05).
- Color & contrast ≤ 6.9 (WCOLOR-02, APPEAR-03).
- Clarity ≤ 6.9 (COPY-02).
- Interaction & feedback ≤ 6.9 (WKEY-03, WKEY-04, AX-02, START-01).
- Stability sub-score ≤ 6.9 (FLOW-02), so Consistency & polish ≤ 6.9 by band.
- Overall ≤ lowest (4.9) + 2.0 = 6.9.
- None of the caps binds below the scores given.

**Stability sub-score: 6.0 (Competent).**
- Core elements hold within tolerance through every main task at every width, and nothing typed can be lost, which lifts it above Weak.
- Holding it down: the FLOW-02 focus drop; the 3–5 px header shift between same-kind headers; five inventory mismatches; transient false empty states; and Playlist order drifting between devices.

## Next step

- **Target:** **COPY-02** (major), the major failure in the lowest-scoring category, Clarity (4.9). It's on the primary task: pressing Play is where it surfaces.
- **Anti-pattern:** none named exactly. It's the inverse of contrasts.md **CLAR-05 · The error supplies the next action** ("a save failure exposes only 'error code -43'").
- **Root cause:** the app has no error vocabulary of its own. `Playback` passes `MediaError.message` straight into `current.error`, the player prints it in the 11 px subtitle slot, and route-level misses fall through to an empty `return null` or the router's default "Not Found". Each layer surfaces what it got, not what the person can do next.
- **Change (smallest):**
  1. In `NowPlaying`, map playback failures to one plain sentence plus a Retry: "Couldn't load this Episode. Check your connection, then try again." Show it at 13 px with a **Try again** button that re-issues `playEntry`. Keep the raw message in `title` for debugging.
  2. Give `/playlists/$playlistId` a "This Playlist no longer exists" empty state with a link back to Playlists.
  3. Add a styled `notFoundComponent` in the same voice.
- **Principle:** `plain-language`, `forgiveness`.
- **Expected effect:**
  - Clarity better: the COPY-02 cap lifts, and states become truthful.
  - Typography slightly better: one 11 px string goes.
  - Consistency & polish better: inventory mismatch 3 closes.
  - Nothing should regress.
- **Signature elements:** touches only the dark player, which keeps its slate band and white type; the error sits in the same slot, at a readable size.
- **Next targets after this (by the step-4 order):** WKEY-03 and FLOW-02 (focus management) in Interaction, then WTYPE-01 and TYPE-05 (replace `text-[11px]` / `text-[28px]` with rem steps of at least 12 px) in Typography.

---

## Findings

Every failure: check ID · severity · screen/width · evidence · smallest fix.

1. **FLOW-02 · major · Playlist detail, all widths.** Focus drops to body after "Play this". Evidence: `measurements.json` listen step 7 (phone, zoomed, desktop), `focus: null`; `/tmp/podlist-grade/probeB.json` `focusAfterPlayThis`. Fix: after the swap, move focus to the Cursor row's ❚❚ button, or keep one element in the header slot (a `<button aria-pressed>` that becomes "Playing" and stays focusable). Matching heights would also remove the 3–5 px header shift.
2. **WKEY-03 · major · every view change, phone and desktop.** Focus stays on the sidebar link (desktop) or falls to body (phone), never reaching the new view. Evidence: `probeB.json` `focusAfterSidebarEnter`, `phoneFocusAfterRow`; `measurements.json` browse desktop step 2. Fix: on route change (router `onResolved`), focus the page `<h1 tabIndex={-1}>` in `PageHeader`.
3. **WKEY-04 · major · Playlist detail, zoomed 720×450.** The fourth row's focused ▶ is fully under the fixed mini-player and tabs (y 339 against bar top 312). Evidence: `probeB.json` `obscured zoomed`; `/tmp/podlist-grade/obscured-zoomed-4.png`. Fix: `html { scroll-padding-bottom: <height of fixed bottom stack> }`, 160 px on phone layouts and 96 px with the desktop bar, matching `main`'s `pb-40` / `md:pb-24`.
4. **WCOLOR-02 · major · all screens, light surfaces.** The focus ring measures 2.29:1 against #f6f5f2. Evidence: pixels from `/tmp/podlist-grade/focus-desktop-sidebar.png` (#91a2dd). Fix: in `index.css`, drop `/50` from `outline-ring/50` and set `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`. #2b50c8 is 6.25:1 on the background.
5. **APPEAR-03 · major · Playlist detail, player, tabs (forced colors).** The primary button boundary, progress bars, the Active dot, the selected tab, and the toggle disc all vanish. Evidence: `/tmp/podlist-grade/forced-colors-phone-default.png`, `forced-colors-desktop-commute.png`. Fix: add `border: 1px solid transparent` to filled buttons; draw progress fills with `forced-color-adjust: none` scoped to the bar, or use `<progress>` / `<meter>`; mark the active tab with a non-color cue (see AX-02).
6. **TYPE-05 · major · all screens, phone and desktop, with a larger browser font size.** Fixed-px text doesn't scale while rem controls do; titles collapse to "T…" at 200%. Evidence: `/tmp/podlist-grade/fontsize150-phone_playlists_default.png`, `fontsize200-phone-default.png`. Fix: replace arbitrary `text-[Npx]` values (H1 28/30, 11, 13, 15, 10) with rem steps (`text-3xl`, `text-xs`, …), so text and controls scale together. Let row titles wrap to two lines instead of truncating.
7. **COPY-02 · major · player (all widths), missing Playlist, unknown route.** The errors are a raw "MEDIA_ELEMENT_ERROR: Format error" with no recovery, a blank page, and an unstyled "Not Found". Evidence: `/tmp/podlist-grade/error-phone.png`, `unknown_playlists_nope.png`, `unknown_nowhere.png`. Fix: see Next step: a plain sentence plus **Try again**, a "Playlist no longer exists" state, and a styled `notFoundComponent`.
8. **AX-02 · major · phone tab bar; desktop sidebar.** The selected tab is distinguished only by hue (1.09:1 against inactive), and Active is a green dot that's `aria-hidden`. Evidence: `AppShell.tsx`; `strips/browse/phone/*`, `strips/browse/desktop/*`. Fix: give the active tab a shape cue (a filled icon variant or an indicator pill behind the icon, the Material 3 pattern) and a heavier label. Replace the dot with the same "Playing" text marker used elsewhere, or add `aria-label="Active"` plus a shape (filled versus ring).
9. **START-01 · major · Views, Library, Playlist detail (first load, fresh device, second-tab takeover).** False "No Views yet" / "No Subscriptions yet" frames and "Episode unavailable" rows appear while data loads. Evidence: `/tmp/podlist-grade/first-load_views-100.png`, `first-load_library-100.png`, `strips/fresh device/*/01-open-default.png`, `strips/second tab/*/02-use-here.png`. Fix: tell "loading" apart from "empty". Render nothing or skeleton rows while `stateAtom` / `subscriptionsAtom` is `Initial`, and while the catalogue is pending show a neutral skeleton title instead of "Episode unavailable". Keep that label for Episodes that are truly gone.
10. **WTYPE-01 · major · Playlist detail rows, player, Playlists list, sidebar.** Times, subtitle, and error are 11 px; the badge is 10 px. Evidence: `/tmp/podlist-grade/probeC.json` `small …`. Fix: raise `text-[11px]` and `text-[10px]` to `text-xs` (12 px), or 13 px for the player subtitle and error.
11. **CTRL-05 · minor · Playlist detail header, player.** No pressed state (and no hover on "Play this"). Evidence: class lists in `$playlistId.tsx`, `AppShell.tsx`. Fix: `active:brightness-90` (or a darker primary) on filled buttons, and `active:bg-…` on the icon buttons.
12. **PTR-04 · minor · row ▶, player buttons.** No tooltips on icon-only buttons. Evidence: code. Fix: add `title` matching the existing `aria-label`, or a tooltip that also opens on `:focus-visible`.
13. **APPEAR-09 · minor · player, all widths.** The skip glyphs are the reload arrows, with no "15" or "30". Evidence: `strips/listen/phone/*`, `AppShell.tsx` (`RotateCcw` / `RotateCw`). Fix: use skip icons with the numeral inside, or overlay "15" and "30" in 9 px tabular figures inside the arrow.
14. **APPEAR-11 · minor · Playlist detail, Playlists list (paused).** "Playing" and "PLAYING" are shown while playback is paused; there's also a blank first frame. Evidence: `strips/listen/*/04-pause.png`, `strips/browse/phone/03-default-playlist.png`, `/tmp/podlist-grade/first-load_playlists_default-100.png`. Fix: label the Active Playlist "Active" (or "In the player"), and show "Playing" only while `nowPlaying.playing`.
15. **TYPE-07 · minor · Playlist detail Cursor column.** "NOW" and "HERE" are caps with `letter-spacing: normal`. Evidence: `probeC.json`. Fix: add `tracking-wider` (0.05em) to the Cursor label.
16. **TYPE-08 · minor · player error, View detail.** Straight apostrophes in "Can't play" and "View's". Evidence: `AppShell.tsx`, `views/$viewId.tsx`. Fix: use ’ in the app's own strings.
17. **COPY-01 · minor · sidebar versus tab and heading; Playlists list versus detail.** "Library & Subscriptions" versus "Library"; "Now:" / "Paused on:" versus "NOW" / "HERE"; "PLAYING" versus "Playing". Evidence: inventory mismatches 1, 2, 5. Fix: one name, "Library", everywhere. Pick one Cursor vocabulary for both screens (for example "Now playing" / "Paused at" with NOW / HERE as the compact form, defined once). One Active marker component.
18. **COPY-03 · minor · View detail (every View row on both widths), Library, empty Playlist.** The path from every View leads to the developer placeholder "This View's episode list arrives with the Views screen."; "No Subscriptions yet" has no next step; "Nothing here yet" points at unbuilt Play Next and Play Last. Evidence: `/tmp/podlist-grade/view-detail-desktop.png`, `probeA.json` `viewDetail`. Fix: until View detail ships, either don't link the rows (drop the chevron and show the View's filter summary) or write user-facing copy ("Episode lists for Views are coming soon"). Empty Playlist: "Add Episodes from a View" only once that exists. Library: say how to subscribe, or that it's coming.
19. **BROWSER-03 · minor · all routes.** `<title>` is always "PodList". Evidence: `probeA.json` `titles`. Fix: set `document.title = \`${title} · PodList\`` in `PageHeader` (or through route `head`), including "Open in another tab · PodList" on the takeover.

**Observations that aren't checklist failures (they feed the scores):**
- **Playlist order drifts between devices.** The sidebar and Playlists list order follows SQL row order: `rowsToState` in `packages/domain/src/Sql.ts` keeps no ordinal, and rows are replaced per key, so a recently written Playlist moves to the end. Evidence: the flow run shows Default, Commute, Workshop; later fresh devices show Commute, Workshop, Default (`probeOrder`) and Workshop, Default, Commute (`probeTab`). Fix: persist an explicit Playlist order, with Default first.
- **The back link announces "current page".** On the phone, the "‹ Playlists" back link gets `aria-current="page"` and class `active` on `/playlists/commute` (TanStack fuzzy matching). Fix: `activeOptions={{ exact: true }}` on the back link.
- **The Entry time slot is ambiguous.** It shows the Position when > 0 and the duration otherwise ("22:00" versus "22:02" in adjacent rows). Fix: show remaining time ("−3:34") or "22:00 / 25:34" consistently, with tabular figures.
- **The phone mini-player has no back 15.** `docs/design/ui-layout.md` puts back 15 · Play/Pause · forward 30 on the player bar on both phone and desktop; the phone omits back 15.
- **No skip link.** On desktop, seven sidebar links come before the content on every page.
- **Position is only reported every 15 s** while playing (`reportEveryMillis`), with no `pagehide` flush, so a reload or OS kill loses up to 15 s.
- **No play/pause shortcut.** Space with nothing focused does nothing (`probeB` `spaceShortcut`). A media app is expected to offer one, scoped per WKEY-02.

## Not built (planned; not failed)

- Now Playing drawer and its stacked pages (Queue, Episode, Chapters); tapping the player bar.
- A seekable progress bar with Chapter ticks; previous and next Chapter; elapsed and remaining; speed; sleep timer (desktop player bar).
- Queue badge (count of Entries after the current one) and its list icon.
- View detail episode list or table, with row actions (Add, Play, Play Next / Play Last, Star, Download, Played), bulk bar, and the "Next / Last go to" picker; the desktop right panel.
- View editor; Search and Search results; "+" to create Views and Playlists.
- Episode detail (facts, In your Playlists, Chapters, Show notes).
- Playlist settings (Clear on Played), History, Listening Timeline and Rewind; Entry reorder handles.
- Library and Subscription management, Download Rules, Manual Download.
- OPML import; first run; Settings; dark theme; Electron-specific chrome.
