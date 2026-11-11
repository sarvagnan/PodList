# Web and Electron layout (v1)

The selected web and Electron presentation. Shared behaviour is authoritative in [product-behaviour.md](product-behaviour.md); repeated behaviour below only supplies context for the unchanged layout decisions. These are not native layout requirements.

Chosen from three mocked variants: **A — Two halves** (Views and Playlists as equal halves), over **B — Player first** (Playlists as a card deck, Views summoned) and **C — Columns** (every View and Playlist side by side). A mirrors the domain: finding (Views) and listening (Playlists) are peers. Navigation between Views and between Playlists is always a **list**, never a row of capsules.

Prototype (throwaway, not production code): https://generatedpages.burmese-mountain.ts.net/podcast-ui-variants/ (`#A-phone`, `#A-desktop`).

## Phone

- Bottom tabs: **Views · Playlists · Library**. Each tab opens on a list; tapping drills in, with a back button.
- **Episode row** (in a View): tap the row → Episode detail. Trailing buttons: **Add (+)** then **Play**. Play = Play Now in the Active Playlist. Add opens a sheet: choose a Playlist (list, Active preselected), then **Play Next** or **Play Last**.
- **Episode detail**: Artwork, podcast, title, facts (Published, duration, Played, downloaded on this Device). One action row with Play centred: *Played · Download · **Play** · Add · Star*. Then **In your Playlists** (each Entry's own Position, with Resume), Chapters (with Chapter Artwork), Show notes.
- **Playlist detail**: Entries with the Cursor marked (NOW on the Active Playlist, even while paused; otherwise RESUME if it has a Position, or HERE), per-Entry progress, reorder handle, "Play this" when not Active; History and Listening Timeline below.

## Desktop

- **Sidebar**: lists of Views and Playlists (+ to create), Library, Settings.
- **Selecting a View** → main area is its episode table. Row: checkbox · title (click → Episode detail) · Play Next · Play Last · Add to another Playlist… · Star · Download · Played · **Play** (always last). Toolbar picker "Next / Last go to" chooses the target Playlist; ticking rows swaps it for a bulk bar (Play Next, Play Last, Mark Played, Star, Download).
- **Right panel** (while a View or a Playlist’s Entries are shown): the target Playlist's upcoming Entries, or the Episode detail. A Playlist’s Entries always have a 400 px panel from `lg` up: the Episode explicitly opened from a row (with Close), otherwise the Cursor’s Episode (without Close). Showing the Cursor does not mark its row as open. Empty Playlists and Playlists past their end keep a quiet “No current Entry” panel. Detail action row: the five of Episode detail, in one row (*Played · Download · **Play** · Add · Star*); the list's rows have Next and Last. The Episode's own page on a wide screen adds them: *Played · Download · Next · **Play** · Last · Add · Star*.
- **Reading width:** Library (table and list), Playlists and Views overviews, Trash, a Subscription, and a Playlist’s History and Listening Timeline stop at the shared 960 px page width, including padding. Header actions and empty states end at the same content edge. A View and a Playlist’s Entries use the full column with their side panel.
- **Selecting a Playlist** → it fills the main area: Entries / History / Listening Timeline tabs; Entry row ends with Play from here.

## Player bar (both)

Artwork · back 15 s · **Play/Pause** · forward 30 s · queue badge (number of Entries after the current one) + list icon · thin progress line along the bottom. Desktop adds previous/next Chapter, a **seekable** progress bar with Chapter ticks, elapsed/remaining, speed and sleep timer.

## Now Playing drawer (both)

- Tapping the player bar (outside its buttons) slides up the **Now Playing drawer** over the current screen; dismiss with the chevron, the dimmed strip above it, or (when built) a swipe down.
- Main page: large Artwork (Chapter, then Episode, then podcast — see `CONTEXT.md` › Artwork), Chapter title with previous/next, title, seekable scrubber with Chapter ticks, back 15 / Play / forward 30, speed, sleep, plus Chapters / Episode / Up next. Desktop shows the Chapter list and Up next beside the player.
- **Everything opened from the drawer stays in the drawer** as stacked pages with Back until it is dismissed: **Queue** (the Active Playlist's Entries, play-from-here, reorder, *Switch Playlist*), **Episode** (same detail as above; Add opens over the drawer), **Chapters** (phone). Starting playback from any of these returns to the drawer's main page. The queue badge opens the drawer directly on Queue.

## View editor and Search (design round 2, variant R)

Chosen on 7 Nov 2026 from https://generatedpages.burmese-mountain.ts.net/podlist-design-round-2/ (`#view-editor/R-desktop/view`); source on branch `prototype/design-round-2`.

- **Form (from C):** every condition is always a row, set to "Any" until changed: Published, Podcasts, Mentions (text), Played, Starred, In a Playlist, Length; then Sort and Show (limit). Nothing is added or removed, so the "all must match" rule is visible.
- **Desktop:** reading a View is unchanged: its Episodes, with the target Playlist (or the open Episode) beside them. **Edit View** swaps that panel for the form; the list becomes a live preview. Edits apply as they are made (no Save; Undo takes one back); **Done** puts the panel back. Delete View is at the bottom of the form.
- **Phone:** the View screen has **Edit**; the form is a full screen that drills into a picker per row, with a live "Matches N Episodes" line.

## Playlist settings and Rewind (design round 2, variant C)

- **Listening Timeline** is an event list under date and time headings: started, finished, and your own edits, each with **Rewind to here**, revealed on row hover or keyboard focus and always visible on touch. Its layout space and Tab stop stay in place. A confirmation lists exactly what will become unplayed again and what is kept; restored Entries go back where they were. A Rewind can be undone.

## Library and Subscriptions (design round 2, variant C)

- **Library** groups Subscriptions by their Download Rule on this Device; desktop is a table with bulk rule changes.
- **Add** is one sheet: Search (Podcast Index), Feed address (resolved directly, no index needed), OPML.
- **Unsubscribe:** asks for confirmation, then offers Undo in the toast and through Cmd/Ctrl+Z; Redo repeats it. Undo re-subscribes to the same feed. The server retains the Subscription and Episode ids, settings (Played threshold and Playback Settings overrides), all Devices’ Download Rules, Played and Starred states, Entries and Positions. Re-subscribing reveals these retained records again. A failed server call keeps the Undo or Redo step available and explains that it can be retried. Downloads stay on their Devices.

## Selection marker

Owner, 12 Nov 2026: a selected sidebar item, an open Episode row and an open Entry use the theme's accent tint plus a straight 3 px bar in the primary colour, inset 3 px from the leading edge. The bar is a short pill (18 px) on sidebar rows and runs nearly the full height (8 px from top and bottom) on Episode and Entry rows. It replaces an inset shadow that bent around rounded corners. The tint and bar take their colours from the theme, so a future theme changes them with no other edits.

## Not yet designed

Dark theme. Global Playback Settings (a Settings screen, pod-g1v.7).

## Reconciliation with the current product

The original paragraphs above are retained as the selected web presentation, including their behavioural context. The platform-neutral decisions (including those removed from this file) are in product-behaviour.md. No native layout is selected by this record.

The historical “Not yet designed” line is retained above so the split loses no decision. Global Playback Settings now exists in `packages/web/src/routes/settings.tsx`, including Speed, Skip intro, Skip outro and Volume boost; that part of the note is stale. Dark theme remains an open web design item; native dark mode is already required by the platform plan. The drawer’s “Queue” label is retained as historical web wording; its domain object is the Active Playlist’s Entries. Swipe-down dismissal is still qualified in the original decision; it must not be inferred to be an implemented native gesture.

Inter and Space Grotesk, a light appearance and the dark player remain web choices, as recorded in the platform plan.

## Getting started

Getting started appears only on the screen the app opens to, not on other Views. It is a skippable introduction with three numbered points: adding podcasts, what Views do and what Playlists hold. The wording stays visible, with no completed states, check marks or “(done)” labels. It hides once the loaded Library has a Subscription, after any open Add flow closes; subscribing never closes that flow or clears its input. Settings can reopen it until dismissed, even with Subscriptions. Loading preserves the last visibility decision and never counts as an empty Library. On wide screens, the card sits below the first View’s title; on narrow screens it sits on the opening Views overview. Other empty Views show **Add podcasts** when the Library is empty, or the existing empty-View wording otherwise. Electron shares this presentation.

## Electron automation

The owner settled these choices on 11 Nov 2026. The Mac app is the reference.
Electron Settings has an Automation section. Enable MCP server is off by default.
The setting stays in this computer's app config. It is not part of Library State or sync.
The warning says: “Any app running as this user on this computer can then read the Library and control playback”.
When enabled, the section shows the bridge command and a copyable MCP client config.
The config contains `command` and `args` only. Open PodList before starting a client.

Turning MCP on starts the listener immediately. Turning it off closes connections and
removes the endpoint. Closing the window while MCP is enabled hides it and keeps the
Library and player alive. Reopening PodList shows that window. Quit stops MCP and keeps
the preference for next time. A disabled launch removes stale sockets without taking
another instance's lock. No TCP port is opened.

macOS and Linux use `mcp.sock` in Electron's user-data directory. That directory has
mode 0700 and the socket has mode 0600. The listener and bridge check peer user ids.
A file lock prevents two listeners from replacing one another. Windows uses a local
named pipe with a protected DACL granting access only to the current token's user SID.
The pipe rejects remote clients. Its name is derived from the user-data directory.

Each package includes a native `podlist-mcp` executable, or `podlist-mcp.exe` on Windows,
in Electron's resources directory. It is both the transport helper and the stdio bridge.
It needs no separate Node installation. Settings supplies `--socket` and the endpoint.
The bridge reserves stdout for newline-delimited JSON-RPC and sends diagnostics to stderr.
It explains when the app is not running or MCP is off, and when PodList closes the connection.
The development bridge is built by `pnpm --filter @podlist/desktop build:mcp`.
Packaging builds it for the host OS and architecture with C++17. Windows uses MSVC
and a static C runtime. macOS and Linux use the platform C++ compiler. Cross-compilation
is not supported. `build:app` packages the host platform; `--install` is macOS only.

The 15 tool names, descriptions, input schemas and result shapes match the Mac.
Only stateless MCP 2026-07-28 is supported. Every request carries protocol version and
client capabilities in `_meta`. Discovery and the name-sorted catalog use a five-minute
private cache hint. Results have `resultType: "complete"`. `initialize` and other versions
receive error -32022 with the sole supported version. There is no ping handler.

Actions use the renderer's existing local DataLayer and Playback controller. They work
with the cached Library while the server is offline. Edits enter the same named Undo
history as UI edits, including Play Now. Agents cannot change connections, Empty Trash,
Delete Playlist or Unsubscribe. Lists use the UI's View and text matching rules, preserve
Playlist Entry order and Positions, and return up to 200 rows per page, 100 by default.
