# UI layout (v1)

Chosen from three mocked variants: **A — Two halves** (Views and Playlists as equal halves), over **B — Player first** (Playlists as a card deck, Views summoned) and **C — Columns** (every View and Playlist side by side). A mirrors the domain: finding (Views) and listening (Playlists) are peers. Navigation between Views and between Playlists is always a **list**, never a row of capsules.

Prototype (throwaway, not production code): https://generatedpages.burmese-mountain.ts.net/podcast-ui-variants/ (`#A-phone`, `#A-desktop`).

## Phone

- Bottom tabs: **Views · Playlists · Library**. Each tab opens on a list; tapping drills in, with a back button.
- **Episode row** (in a View): tap the row → Episode detail. Trailing buttons: **Add (+)** then **Play**. Play = Play Now in the Active Playlist. Add opens a sheet: choose a Playlist (list, Active preselected), then **Play Next** or **Play Last**.
- **Episode detail**: Artwork, podcast, title, facts (Published, duration, Played, downloaded on this Device). One action row with Play centred: *Played · Download · **Play** · Add · Star*. Then **In your Playlists** (each Entry's own Position, with Resume), Chapters (with Chapter Artwork), Show notes.
- **Playlist detail**: Entries with the Cursor marked (NOW when Active, HERE when paused), per-Entry progress, reorder handle, "Play this" when not Active; History and Listening Timeline below.

## Desktop

- **Sidebar**: lists of Views and Playlists (+ to create), Library, Settings.
- **Selecting a View** → main area is its episode table. Row: checkbox · title (click → Episode detail) · Play Next · Play Last · Add to another Playlist… · Star · Download · Played · **Play** (always last). Toolbar picker "Next / Last go to" chooses the target Playlist; ticking rows swaps it for a bulk bar (Play Next, Play Last, Mark Played, Star, Download).
- **Right panel** (only while a View is shown, or an episode is selected): the target Playlist's upcoming Entries, or the Episode detail. Detail action row: *Played · Download · Next · **Play** · Last · Add to · Star*.
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
- **Played choices:** Any, Unplayed (includes in progress), In progress, Played.
- **Search:** the same form with Mentions filled in, as an unsaved View. Saving it asks for a name.

## Playlist settings and Rewind (design round 2, variant C)

- **Settings** are their own page: name, Clear on Played, Delete (to Trash, with its History and Listening Timeline).
- **Listening Timeline** is an event list grouped by Listening Session: started, finished, and your own edits, each with **Rewind to here**. A confirmation lists exactly what will become unplayed again and what is kept. A Rewind can be undone.

## Library and Subscriptions (design round 2, variant C)

- **Library** groups Subscriptions by their Download Rule on this Device; desktop is a table with bulk rule changes.
- **Add** is one sheet: Search (Podcast Index), Feed address (resolved directly, no index needed), OPML.
- **Subscription settings:** Download Rule for this Device (new Subscriptions start at Stream), Played threshold in seconds, Playback Settings overrides.
- **First run** is a skippable checklist, and creates starter Views.

## Not yet designed

Dark theme. Global Playback Settings (a Settings screen, pod-g1v.7).
