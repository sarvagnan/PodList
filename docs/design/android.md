# Android phone layout (v1)

The selected Android phone presentation. Shared behaviour is authoritative in [product-behaviour.md](product-behaviour.md); [CONTEXT.md](../../CONTEXT.md) defines the domain language and [client duties](../protocol/client-duties.md) define what the client must do.

Chosen by the owner on 9 Nov 2026 from four mocked variants: **A — Separate stacks**, **B — Shared directory**, **C — Last open**, and **D — Recommended mix**, which takes A's navigation and row actions and C's Now Playing sheet. D was then revised in review so that playback is built around its controls and not around names.

Prototype (throwaway, not production code): https://generatedpages.burmese-mountain.ts.net/podlist-android-phone-round-1/ (variant D). Source: branch `prototype/android-phone-round-1`.

## Look

Material 3 components, Roboto through the system font, PodList blue `#2b50c8` as the seed colour, light and dark following the system. Material roles throughout, with dark surfaces toned independently and not inverted from light. Interactive targets are at least 48 × 48dp. Edge to edge.

Build on `NavigationSuiteScaffold` and `ListDetailPaneScaffold` from the first screen. Only compact phone windows are designed here; other sizes are later work (see the [platform plan](../plans/platform-clients.md)).

## Navigation

- Bottom navigation bar: **Views · Playlists · Library**, three equal destinations. Each keeps its own back stack and place.
- Views and Playlists each open on a list of names. Opening one drills in; Back returns to that list. Playlists also lists Trash.
- **Top app bar actions on the three destinations:** + (new View, new Playlist, Add podcasts) and a gear for **Settings**. The gear means app Settings and nothing else.
- A single View or Playlist has Back, its name, and a pencil to edit it (the View's conditions, or the Playlist's settings).

## Episode rows

Artwork, title (wrapping; never truncated to one line), podcast, Published, duration, and state with progress when in progress. Trailing **Add (+)** then **Play**.

- Tap the title or row: Episode detail.
- Play: Play Now in the Active Playlist.
- Add: a half-height modal bottom sheet. Choose a Playlist (Active preselected, New Playlist at the end of the list), then **Play Next** or **Play Last**.
- Long press starts selection. Selected rows replace Artwork with checkboxes and trailing buttons disappear. A contextual top bar shows the count, with Add to Playlist, Mark Played, Star and Download.
- After an action: a snackbar with Undo, above the player and navigation.

## Playlist

Entries, History and Listening Timeline tabs. The Cursor is marked NOW on the Active Playlist, even while paused. Each Entry has its own progress, Play from here, and a drag handle whose menu also offers Move up and Move down.

## Library

Subscriptions grouped by their Download Rule on this Device, with empty groups stated. Tapping one opens its Podcast page. **Add podcasts** and **Select Subscriptions** follow the groups.

## Mini player

Sits above the navigation bar on every screen whenever the Active Playlist has a current Entry, including straight after launch, when it shows that Entry paused at its Position (owner, 9 Nov 2026). Audio never starts by itself. 72dp high with a progress line along its bottom edge.

Left to right: **Artwork · back 15 · Play/Pause · forward 30 · Playlist**. Controls are 48dp.

- **No names are shown** (owner, 9 Nov 2026): the show or Chapter Artwork identifies what's playing, and the controls matter more. Screen readers still announce the podcast and Episode, and the system media notification shows them.
- Tapping the Artwork or the bar opens Now Playing.
- The Playlist button opens the Active Playlist, and its accessible label names that Playlist and the number of Entries after the current one.

## Now Playing

A persistent bottom sheet that expands from the mini player and leaves the navigation bar reachable. Tapping a navigation destination collapses it. Playback continues.

Top to bottom: handle, "Now Playing · {Playlist}" and collapse; Artwork; previous Chapter, Chapter name and number, next Chapter; seek bar with Chapter ticks and elapsed/remaining; **back 15 · Play/Pause · forward 30**, the largest controls on the screen; speed and Sleep; then **Episode**, **Chapters** and **Entries · N next**.

The podcast and Episode names are left out here too. The Chapter name stays, because many podcasts have no Chapter Artwork. The Episode button leads to the full details.

## Back

Predictive back in this order: close any Add sheet, then nested player pages (Episode, Chapters, Entries), then collapse the player, then the normal back stack. Back never pauses or otherwise controls playback.

## Settings

A full screen reached from the gear. Sections: **Playback** (Speed, Skip intro, Skip outro, Volume boost), **Your listening** (Listening stats), **Your podcasts** (Import OPML, Export OPML), **Playlists** (Keep deleted Playlists), **This Device** (Server), **Help** (Getting started). Keyboard shortcuts stay web only.

## Agreed for milestone 4

Chosen by the owner on 9 Nov 2026. Prototype (throwaway, not production code): https://generatedpages.burmese-mountain.ts.net/podlist-android-phone-round-2/ Source: branch `prototype/android-phone-round-2`.

- **Add podcasts:** one field that takes a podcast name or a pasted feed address. OPML isn't here; import and export belong in Settings.
- **View editor:** one list with every condition as a row showing its value, each opening a small sheet. A live count and Undo stay pinned above the player.
- **Rewind:** from the Listening Timeline, a bottom sheet lists what goes back, what becomes Unplayed, what returns and what's kept. The Playlist then shows the result with Undo.
- **Playlist settings:** name, Clear on Played and Delete on one page, opened with the pencil. Delete asks nothing first (owner, 9 Nov 2026): the Playlist goes to Trash and the snackbar says "Playlist Commute moved to Trash" with Undo (owner, 10 Nov 2026). The name field's "Use saved name (Commute)" appears beside the error only while the field holds a name that can't be saved (owner, 10 Nov 2026).
- **Podcast page** (owner, 10 Nov 2026): compact header with who makes the podcast, a Search Episodes bar and the Episode count. Pulling down reveals artwork and description. Before subscribing the top bar has Subscribe; once subscribed it has a settings gear and a green check, and tapping the check turns it into an Unsubscribe button that a second tap confirms, with no dialog (owner, 10 Nov 2026). Keyboard shortcuts are never shown on the phone.
- **Subscription settings:** opened with the gear on the Podcast page. Unsubscribe isn't here. Unchanged values read Default and name what they inherit.
- **Listening stats:** one scrolling page reached from Settings, with all three periods visible at once, a 30-day chart that can be tapped and a table view.
- **First run** ([ADR 0012](../adr/0012-a-device-can-work-without-a-server.md)): a Welcome screen offers **Start on this phone** or **Connect to a server**. Either leads to the Getting started card above the starter Views on Views. Connecting a Standalone Device shows what will move before offering **Bring it over** or **Not now**, and the offer stays in Settings.
- **OPML:** a **Your podcasts** section in Settings, after Your listening, holds **Import OPML** (arrow into a tray) and **Export OPML** (arrow out of a tray). Both use Android's file picker.
