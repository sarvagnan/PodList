# PodList UI grade, round 7

Graded against `~/Documents/UI_Guidelines` (CRITIQUE.md full audit, rubric.md, core-checklist.md, web-checklist.md, platform-fit.md § Web) at commit `c44b5e5`. This is an independent read: earlier round reports and the UI-GRADE.md work lists were not consulted.

Evidence:
- The supplied flow run: `scratchpad/flows-r7` (summary.md, measurements.json, strips, contact sheets).
- My own probes on the built app (`pnpm --filter @podlist/web build`, `ui-flows/demo.mjs` seeded and empty servers). I drove it with Playwright Chromium 158.0.8127.18 and Electron through `_electron`, on darwin arm64, with no throttling. Scripts and screenshots are in `scratchpad/grade-r7/`. Measurements are in CSS px at 100% zoom unless a width says otherwise. Phone is 412×915 at DPR 2, zoomed desktop 720×450, desktop 1440×900, narrow 320×640.
- Code under `packages/web/src` and `packages/desktop/src/main.ts`.

My probes changed the seeded demo's state: one Episode was marked Played and one Rewind was applied. Some later screenshots therefore show 4 rows in *New this week* rather than 5.

## Frame

- **Task:** find Episodes through Views and queue and play them in Playlists, with the player always to hand.
- **Target:** web app. It is an Android-first installable PWA (manifest `display: standalone`), and the Mac app is the same build in an Electron window. Platform fit is judged against the web for the page, with the Mac shell's menus and context menus judged as the window that hosts it (platform-fit.md, *one product, several targets*).
- **Posture:** sovereign on desktop, all-day; the phone use is short and repeated.
- **Audience:** a perpetual intermediate (one owner), who wants the keyboard on the Mac.
- **Nearest exemplar:** Things, for its calm list hierarchy and actions that appear on hover or selection. It is a reference for craft, not a look.
- **Character:** warm off-white page (#f6f5f2) with a single blue primary (#2b50c8)\*; Space Grotesk headings over Inter\*; a dark player bar and dark Now Playing drawer\*; Views and Playlists as equal halves, navigated by lists, never capsules\*; square initial-tile artwork; plain domain nouns capitalized as terms (Episode, Playlist, View, Entry). \* = fixed by the owner.
- **Owner decisions:** light appearance only (dark theme not designed); layout variant A; Inter and Space Grotesk; blue primary; dark player bar; View editor R, Playlist settings and Rewind C, Library C. All of these were scored as built. None is proposed for change.

## Flows

- **Tasks run:**
  - in the supplied run: browse, listen, now playing, fresh device and second tab;
  - in my probes: remove an Entry and Undo; Delete Playlist and Undo; Rewind; Mark Played in a View; subscribe by feed address; first run and Skip; Back with each overlay open; scroll restoration; right-click; tick rows for bulk.
- **Widths:** phone 412×915, zoomed 720×450, desktop 1440×900, plus 320×640 for reflow and 200% root font size on the phone.
- **Appearances:** light (the only one designed). I also checked `forced-colors: active` and `prefers-reduced-motion: reduce`.
- **Timed runs:** desktop, 5 runs each, from the supplied summary. *Open a Playlist* p75 is 118 ms; *Play from here* p75 is 96 ms. Lab Core Web Vitals from my probe: LCP 124–336 ms and CLS 0.000–0.009 on /views/…, /playlists/default and /library.
- **Files:** script `packages/web/ui-flows/flows.mjs`; measurements `flows-r7/measurements.json`; strips `flows-r7/strips/*`.

Failures:
- No FLOW-01 or FLOW-02 failures in measurements.json. Every core-element move is a step the person caused. The zoomed *listen* step 2 heading move (dy −5, scroll 5) followed the person's click on a row control, so it's allowed.
- **FLOW-06 (minor):** on Search, the help line "Every word must appear in the title, the show notes or the podcast’s name." is replaced by the result count as soon as typing starts (`routes/search.tsx` lines 90–94). The scope explanation vanishes exactly when results arrive.

## Cross-screen inventory

| Screen | Success confirmation | Error | Waiting question | Undo | Empty state | Blocking notice | Main action | Examples or help |
|---|---|---|---|---|---|---|---|---|
| View (desktop and phone) | Dark toast above the player: "Marked Played" | none seen | none | Undo in the toast, stays until dismissed; ⌘/Ctrl-Z | "No Episodes match this View" + next step | none | Edit View, top trailing | Panel heading "Next and last go to" |
| Playlist | Toast "Moved “X”…", "Removed…" | none seen | none | Undo in the toast; ⌘Z | (not seen) | none | Play / Play this, top trailing | none |
| Listening Timeline | Toast "Rewound Default to 14:30" | none | Modal: "Rewind Default to 14:30?" (Cancel focused) | Undo in the toast | — | — | Rewind to here (per row) | Intro paragraph above the list |
| Playlist settings | Toast "Moved “Workshop” to the Trash" | — | none (Trash replaces a confirm) | Undo in the toast | — | — | Delete Playlist, bottom | "Saved as you type." |
| Library / Add sheet | Toast "Subscribed to **http://…/deep-field.xml**" | Inline under the field: "Enter the whole address, starting with https://" | none | none | Dashed card "No Subscriptions yet" + how | — | Add podcasts, top trailing | Hint under each field |
| Subscription | Toast "Unsubscribed from X"; "Marked X Played" | **Toast, 5 s, then gone:** "Couldn’t unsubscribe. Check that you’re online." | Modals: Unsubscribe?, Mark all Played? | none (confirmed instead) | — | — | (none; settings card + row actions) | Row hints in the settings card |
| Player bar / drawer | — | Inline in the bar, pink on dark: "Couldn’t play this Episode." + Try again | — | — | — | — | Play/Pause, centre | — |
| Episode (copy link) | Toast "Link copied", 3 s | Toast "Couldn’t copy the link", 3 s | — | — | — | — | Play, centred in the action row | — |
| Search | count line | — | — | — | "Nothing matches" + "Try fewer or different words." | — | Save as View, top trailing | Help line that vanishes on typing (FLOW-06) |
| Trash | Toast "Restored “X”" | — | — | — | "The Trash is empty / Deleted Playlists wait here for a while." | — | Restore (per row) | Intro "kept for 30 days" |
| Second tab / new version | — | — | — | — | — | Full-screen "Use here" takeover; VersionNotice | — | — |

**Mismatches:**
1. **Errors have three homes and two lifetimes.** They appear inline in the Add sheet and the player bar, which persist, and in a vanishing toast on Subscription (unsubscribe) and Episode (copy link). Screens involved: Subscription, Episode vs. Library/Add and Player.
2. **The subject of a success toast varies.** "Moved “Workshop”" and "Unsubscribed from Deep Field" name the thing; "Subscribed to http://127.0.0.1:65039/feeds/deep-field.xml" names a URL. Screens: Library/Add vs. Playlist settings and Subscription.
3. **Settings rows have two layouts.** Settings uses label leading and control trailing (desktop-settings.png). The Subscription "Settings for this podcast" card uses label above control at 1440 (desktop-subscription.png) but label leading at 720 (zoomed-subscription.png). The same Playback rows (Speed, Skip intro, Skip outro, Volume boost) look different on the two screens.
4. **Lists use three containers.** Entries are borderless rows with a tinted current row. The Listening Timeline is a bordered white card. Library and View rows are divided by hairlines. The Timeline is the odd one out.
5. **Trash empty-state copy is vaguer than its intro.** "wait here for a while" sits directly under "kept for 30 days".

## Checklist

Coverage: **92.7%** (pass 83 · fail 6 · N/O 7 · N/A 9; 89 of 96 applicable items verified).

Mac IDs: N/A → target. They aren't counted. The Mac shell was still read and launched; see Platform fit.

### Failures by severity

**Blocker:** none.

**Major**

- **[BROWSER-06]** Right-clicking a real link gets an app menu instead of the browser's.
  - **Where:** Episode rows on desktop web (≥704 px), in Views, Search and Subscription.
  - **Evidence:** right-clicking the title `<a href="/episodes/…">` fires `contextmenu` with `defaultPrevented: true` and opens the app's Base UI ContextMenu. Screenshot: grade-r7/desktop-ctx-title.png. The trigger wraps the whole row, title link included (`EpisodeRow.tsx` lines 425–437). The menu does offer *Open in New Tab* and *Copy Link*. The browser's own link items are gone, as is its menu for selected title text: open in a new window or incognito, Save Link As, Send to devices, Search for "…".
  - **Fix:** in the trigger's `onContextMenu`, bail out when `event.target.closest("a, input, textarea")` or when `getSelection()` isn't collapsed, so links, fields and selected text keep the browser's menu. Keep the row menu for the row's empty space, artwork and metadata. The Mac shell already does the equivalent natively.
- **[WKEY-03]** Focus is dropped to `<body>` when a toast or sheet that held it disappears.
  - **Where:** after Undo in a toast (Remove Entry, Delete Playlist); after Subscribe closes the Add podcasts sheet.
  - **Evidence:** in the Playlist, Remove → toast Undo leaves the active element as `body` (probe1). Delete Playlist → Undo also leaves it on `body` (probe6). Subscribe → the sheet closes and the active element is `body` (probe5). A keyboard user starts again from Skip to content.
  - **Fix:**
    - In `useConfirm`, pass the step a `restoreFocus` target: after Undo, focus the restored row's title link, or else the control that triggered the step.
    - In `AddPodcastSheet`, close through Base UI's normal path (or set `finalFocus` to the Add podcasts trigger) so focus returns to the opener.
- **[WDATA-04]** An error people need in order to act vanishes on a timer.
  - **Where:** Subscription › Unsubscribe; Episode › Copy link.
  - **Evidence:** "Couldn’t unsubscribe. Check that you’re online." is added with `timeout: 5000` (`routes/library/$subscriptionId.tsx` line 375). "Couldn’t copy the link" uses `timeout: 3000` (`useCopyLink.ts`). Undo toasts correctly use `timeout: 0`, so the two failure toasts are the inconsistent ones.
  - **Fix:** errors get `timeout: 0` and a **Try again** action, in the same toast style as Undo. Better still, show the unsubscribe error inline in the dialog, which stays open on failure (COPY-02's "near its cause").
- **[START-02]** Once skipped, the welcome checklist can't be found again.
  - **Where:** first run (FirstRun.tsx).
  - **Evidence:** *Skip for now* sets `firstRunDone`. After a reload the card is gone (probe4), and neither Settings nor Keyboard shortcuts nor Help reopens it. Its two concept lines, "Views find Episodes for you" and "Playlists hold what you’ll listen to", appear nowhere else.
  - **Fix:** add a *Show getting started* row to Settings (and Help › Getting Started in the Mac menu) that clears `firstRunDone`.

**Minor**

- **[FLOW-06]** On Search, the help line that states the scope ("Every word must appear in the title, the show notes or the podcast’s name.") is removed when typing starts (`routes/search.tsx` lines 90–94).
  - **Fix:** keep a persistent scope line, such as "Searching your Library: titles, show notes and podcast names". Put the count beside it ("· 1 Episode") instead of in its place.
- **[APPEAR-10]** Control boundaries are faint.
  - **Evidence:** text inputs and selects are white with a 1 px `--input` #d6d3cc border, which measures 1.49:1 against the white card. In the Edit View form, the Add sheet field, Settings and the Subscription card, white fields sit on white cards, so that border is the only edge. An empty field such as Mentions or the Add sheet query reads as a faint outline.
  - **Fix:** raise `--input` to about #8f8a80 (≥3:1 on white), or give fields a `--secondary` fill. Keep the blue ring for focus.

### N/O

DLG-09, CTRL-08, DRAG-05, DRAG-06, EDIT-02, FOOT-02, WTYPE-03

### N/A

- CTRL-02 (no checkbox hierarchy)
- LIST-03 (no sortable column headings)
- LIST-05 (no outlines)
- AX-05 (no autoplay; the audio is the content)
- START-05 (no permission prompt in Chrome or Electron)
- START-06 and START-07 (no accounts)
- TOOL-06 and SIDE-03 (nothing can be hidden)

### Notable passes, with evidence

- **BROWSER-01 and -02:** every state has a URL (`?tab=history|timeline`, `?edit=true`, `?episode=`, `?q=`). Back closes the drawer, the Add sheet and the Add-to-Playlist sheet before leaving the page, and pops drawer pages one at a time (probe2). Scroll is restored on Back and on reload: 564 → 564 (probe2).
- **BROWSER-03:** titles are "New this week · PodList" and so on.
- **BROWSER-05:** ⌘K applies only on a Mac; Ctrl+K is left to the browser.
- **BROWSER-09:** in-app Back links appear on every drilled screen.
- **BROWSER-10:** see the lab Core Web Vitals above.
- **KEY-01 and WKEY-01:** the Episode list is an APG grid ("New this week Episodes"): ↓ moves between rows, → between a row's actions, Tab leaves the grid. The drawer traps Tab and Esc returns focus to the player (probe1).
- **KEY-08:** the shortcuts sheet opens with ⌘/ or Ctrl+/ and lists OS-correct keys (WCOPY-01).
- **DATA-04:** Undo toasts persist (`timeout: 0`); ⌘Z and ⌘⇧Z/Ctrl-Y redo; the Mac Edit menu names the step.
- **DATA-06:** scroll and the last view survive a relaunch, including offline in Electron (`app.spec.ts`).
- **APPEAR-03:** forced colours keep boundaries, progress and selection (forced-playlist.png, forced-drawer.png).
- **APPEAR-04:** a computed-contrast scan of 11 screens plus the dark drawer, at both widths, found no text below 4.5:1. The only hits were opacity-0 hover actions.
- **APPEAR-05:** reduced motion fades sheets instead of sliding them.
- **WTYPE-05:** 320 px reflows with no horizontal scroll on 11 screens.
- **WTYPE-02:** at 720×450 every screen keeps its content.
- **RESP-01:** p75 ≤ 118 ms.

## Scores

| Category | Score | Evidence | Principle |
|---|---|---|---|
| Typography | **8.2** | Strong: a small deliberate scale.<br>• Space Grotesk 28 px titles; Inter 15/22 rows; 13 px metadata in `--muted-foreground` (5.9:1); 12 px tracked caps section labels.<br>• Weight and colour do the hierarchy work; typographic quotes and ellipses throughout.<br>Below Exemplary:<br>• The desktop player title is clamped to 2 lines inside a 139 px container while its column is 372 px. `@container` on a shrink-wrapped span takes the subtitle's width, so "What the Voyager recor…" truncates at 1440 px (probe8; flows-r7 contact-now-playing, desktop 1 and 7).<br>• At 200% root text on the phone, row metadata truncates to "Yesterday ·…" and the duration is lost (font200_views_new-this-week.png). | `hierarchy`, `craft` |
| Hierarchy | **7.8** | Strong.<br>• Each screen has one leading title and one tinted primary (Play / Add podcasts), and the chrome is quiet. Row actions on desktop appear on hover or focus, as in Things.<br>Held down by:<br>• The Subscription screen puts the artwork, description and a six-row settings card **above** the Episodes on the phone (phone-subscription.png) and at 720 px (zoomed-subscription.png). The podcast's content starts below the fold.<br>• On desktop Episode detail, the *Resume* button sits about 1,000 px from its Playlist name, because "In your Playlists" spans the full width under a 570 px header (desktop-episode.png).<br>• The desktop drawer leaves a wide dead gap between the player column and Up next (desktop-drawer.png). | `content-first`, `hierarchy` |
| Spacing & density | **7.6** | Strong: a 4 px rhythm, shared left edges, 68–76 px rows suited to a calm personal tool.<br>Gaps:<br>• On the phone, the Episode action row wraps 4 + 1, with **Star** orphaned on its own line and Play off-centre (phone-episode.png). The design calls for one row with Play centred.<br>• At 720×450 the fixed player is 176 px, 39% of the height, and the sidebar 223 px, leaving about 2 Episode rows visible (zoomed-view.png).<br>• Playlist rows stop at about 912 px while View rows fill the main column at 1440. | `craft`, `hierarchy` |
| Color & contrast | **8.3** | Strong.<br>• Restrained: one blue for interaction, green for Played, amber for Star. Every text pairing passes, including the dark drawer and player (`--player-muted` on `--player`).<br>• The focus ring is 6.25:1, and white on dark surfaces. Forced colours are designed.<br>Below Exemplary:<br>• Field boundaries are 1.49:1 (APPEAR-10).<br>• Every row carries a light-blue filled Play disc, so 5–8 tinted circles per screen dilute "tint = the primary action". | `color-restraint`, `accessibility` |
| Iconography | **8.4** | Strong.<br>• One Lucide set at matching weight.<br>• Custom 15 and 30 skip glyphs; tooltips on hover **and** focus (probe7); labelled icon buttons.<br>• The Active Playlist is marked by shape and name, not colour alone.<br>Small stretches:<br>• Initial-tile placeholders read as noise where there's no name: "H" for a feed URL in the Add sheet result (phone-subscribing-150ms.png), "D" for the Default Playlist. | `conventions`, `craft` |
| Consistency & polish | **7.6** (stability **8.4**) | The stability sub-score is Strong: no FLOW-01 or FLOW-02 failures at any width; late catalogue arrival is held by skeletons; FLOW-06 is one minor fail.<br>The category is held below Exemplary by:<br>• the four inventory mismatches (error homes, toast subject, two settings-row layouts, three list containers);<br>• the player-title clamp bug;<br>• the orphaned Star;<br>• focus dropped after Undo;<br>• "Subscribed to http://…".<br>Every state family exists (empty, loading, error, pressed, disabled, focus). | `craft`, `stability` |
| Clarity | **7.9** | Strong.<br>• Plain domain words (Clear on Played, Rewind to here, NOW/HERE, "Matches 5 Episodes now"). Specific dialog titles and verbs. State is always visible (Active Playlist, Cursor, progress, Played tick).<br>Gaps:<br>• Below 1280 px the "Play Next and Play Last go to" label becomes `sr-only`, leaving an unlabelled select reading "Default (Active)" (zoomed-view.png).<br>• Search never says *what* it searches once you type.<br>• *Switch Playlist* is plain white text with no button affordance.<br>• Trash: "for a while" vs. "30 days". | `plain-language`, `feedback` |
| Platform fit | **6.9** (cap: BROWSER-06 major; uncapped 8.5) | Looks 8.6:<br>• the page fills the viewport;<br>• native selects and inputs;<br>• real links;<br>• OS-correct ⌘ or Ctrl hints;<br>• `color-scheme: light`;<br>• it reflows to 320 px.<br>Behaves 8.4:<br>• full URL coverage;<br>• Back is overlay-aware;<br>• scroll is restored;<br>• browser shortcuts are intact;<br>• the grid follows the APG;<br>• lab Core Web Vitals are good;<br>• the installed mode supplies its own Back.<br>The Mac shell is good. Menus run in standard order: PodList, File, Edit, View, Controls, Go, Window, Help. Settings… is ⌘, and Edit › Undo is labelled "Undo “…”". Episode rows get a native context menu, with a native Copy Link/Look Up menu on links and text. Swipes and the mouse back button walk history, and the window restores its size.<br>Foreign: the custom menu over web links (BROWSER-06).<br>Mac nits: no Edit › Find (⌘F) for Search; no Delete in Edit; the undo label quotes a sentence rather than naming the action ("Undo Remove"). | `conventions`, `stability` |
| Interaction & feedback | **6.9** (cap: WKEY-03, WDATA-04, START-02 major; uncapped about 8.6) | Keyboard-fluent and forgiving:<br>• grid arrows, type-ahead, ⇧-range ticks, ⌘A, Space play/pause, ⌘K, ⌘/;<br>• Undo or Trash for every routine step, with a Rewind preview and its own Undo;<br>• responses p75 ≤ 118 ms;<br>• live-applied View editor;<br>• keyboard reorder via the dnd-kit keyboard sensor, with an Undo toast.<br>Capped by:<br>• focus lost after Undo and after Subscribe;<br>• error toasts that vanish;<br>• a welcome checklist that can't be reopened.<br>Also: Enter in the Feed address field doesn't subscribe (a second click is needed), and the Add-to-Playlist sheet opens with focus on Cancel rather than the Playlist list. | `keyboard-efficiency`, `forgiveness`, `feedback` |
| **Overall** | **7.6** | The app serves its task very well and is at home in the browser and in its Mac window. Two mechanical caps (Platform fit and Interaction at 6.9) sit on otherwise Strong-to-high-Strong behaviour, and the visual categories sit at 7.6–8.4, held below Exemplary by a handful of specific craft gaps. The rule "lowest + 2.0" allows 8.9; the holistic read is 7.6. The single weakness holding Overall down most is the four small major failures in the behavioural categories. Each is a few lines to fix. | — |

## Next step

- **Target:** WKEY-03 (major) in Interaction & feedback. That category ties for lowest with Platform fit, and WKEY-03 is closest to the primary task: Remove → Undo in a Playlist, and Mark Played → Undo in a View.
- **Anti-pattern:** *Toast-and-vanish*, the focus variant: the control that held focus is unmounted with nowhere to go.
- **Root cause:** a confirmation toast or sheet owns the last focused control. When it closes after doing its job, nothing names where focus should land, so it falls to `<body>`.
- **Change:**
  1. `useConfirm` takes an optional focus target. On Undo it focuses the restored row's title link, falling back to the control that triggered the step.
  2. `AddPodcastSheet` closes through Base UI's normal path (or `finalFocus` = the Add podcasts trigger) after Subscribe.
- **Principle:** `stability`, `user-control`.
- **Expected effect:** WKEY-03 passes. With WDATA-04 (errors persist with Try again) and START-02 (Settings › Show getting started), Interaction & feedback leaves its cap and lands at about 8.6. Fixing BROWSER-06 (links keep the browser's menu) lifts Platform fit to about 8.5. Overall then lands near 8.3.

## What stands between this build and 9.0

The four major failures are the first gate; each fix is a few lines. After them, these craft gaps keep categories below Exemplary:

1. **Desktop player title** (Typography, Polish): the `@container` sits on a shrink-wrapped span, so the title is clamped to the subtitle's width (139 of 372 px). Give the text column `flex-1` or a definite width so the title uses the column and wraps only when it really runs out of room.
2. **Subscription layout** (Hierarchy): the Episodes should lead. Put the settings card after the list, or behind a "Settings for this podcast" disclosure or a sub-page on the phone and at 720 px; keep it beside the list only at ≥1280 px.
3. **Episode action row on the phone** (Spacing): fit the five actions on one row at 412 px by narrowing the gap and label width, or move Star into the header with Share, so Play stays centred as designed.
4. **Settings-row consistency** (Polish): use one row component (label and hint leading, control trailing, stacking only below a set width) for Settings and the Subscription card.
5. **Field boundaries ≥3:1** (Color): see APPEAR-10.
6. **Small copy fixes** (Clarity):
   - name the podcast in "Subscribed to …" once it resolves;
   - keep a short visible label on the Next/Last target select at every width ("Next/Last to");
   - add a persistent scope line on Search;
   - make "Switch Playlist" look like a button;
   - make the Trash empty state say "for 30 days".
7. **Zoomed desktop density** (Spacing): at ≤480 px tall, drop the player bar to one row with the scrubber inline, or let the sidebar collapse, so a 720×450 window shows more than two Episodes.
8. **Desktop Episode detail** (Hierarchy): cap "In your Playlists" and Show notes at the header's width (`max-w-prose` or 36rem) so Resume sits by its Playlist.
9. **Library on desktop:** the chosen design (Library C) is a table with bulk Download Rule changes, but the build is a list without bulk changes. This is a spec gap more than a checklist failure, but it is the one designed screen that isn't built as designed.

## Log

Single audit; no iteration steps were applied.
