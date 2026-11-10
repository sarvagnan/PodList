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
- **Top app bar actions on the three destinations:** + (new View, new Playlist, Add podcasts) and a gear for **Settings**. The gear means app Settings on these roots; the Podcast page also uses it for Subscription settings. Views offers Search in its top bar as well.
- A single View or Playlist has Back, its name, and a pencil to edit it (the View's conditions, or the Playlist's settings).

## Episode rows

Artwork, title (wrapping; never truncated to one line), podcast, Published, duration, and state with progress when in progress. Trailing **Add (+)** then **Play**.

- Tap the title or row: Episode detail.
- Play: Play Now in the Active Playlist.
- Add: a half-height modal bottom sheet. Choose a Playlist (Active preselected, New Playlist at the end of the list), then **Play Next** or **Play Last**.
- Long press starts selection. Selected rows replace Artwork with checkboxes and trailing buttons disappear. A contextual top bar shows the count, with Add to Playlist, Mark Played, Star and Download.
- After an action: a snackbar with Undo, above the player and navigation.
- Toggle icons show current state: outline Star, checked circle and download arrow until Starred, Played or downloaded; filled Star, checked circle or downloaded check once set. Labels name the action (Mark Played / Mark Unplayed, Download / Remove download).
- Episode metadata uses bodyMedium (14sp). Selected rows use secondaryContainer and a checkbox; the list itself never becomes a focusable accessibility node.
- On a Podcast page, failed Play/Add acquisition stays inline on the affected Episode with a named Try again action. If the row is offscreen when failure arrives, a snackbar also offers Try again, which retries and reveals that row. Page-load errors stay in the header.
- Podcast and Episode top bars show a generic label while the headline is visible; the item’s name appears after the headline scrolls away. Titles allow two lines; at enlarged text sizes the title and navigation sit above a separate trailing action row, so actions do not squeeze titles into broken words. Missing Artwork uses the same initials tile everywhere.

## Playlist

Entries, History and Listening Timeline tabs. The Cursor says Now playing only while playing in the Active Playlist; otherwise it says Current Entry. A leading indicator and subtle tint mark it. Just-moved Entries briefly highlight with the standard secondaryContainer role and fade; selected Entries use secondaryContainer with a checkbox. Each Entry has its own progress and visible Play from here. The drag handle is for dragging, with accessible Move up and Move down actions. A separate 48dp ⋮ button labelled Entry actions opens the secondary-action menu, including Remove from this Playlist and discrete moves.

## Library

Subscriptions grouped by their Download Rule on this Device. Each populated group is a section: a small “Download Rule” overline, the domain rule name (**Stream**, **When Episodes become an Entry**, **As Episodes are published**) as the heading, and one plain sentence explaining when Episodes are stored. Podcasts follow beneath. Empty rules combine into one quiet “No podcasts use: …” line only when there are Subscriptions; an empty Library shows just its empty state and Add podcasts action. Tapping one opens its Podcast page. **Add podcasts** and **Select Subscriptions** follow the groups.

## Mini player

Sits above the navigation bar on every screen whenever the Active Playlist has a current Entry, including straight after launch, when it shows that Entry paused at its Position (owner, 9 Nov 2026). Audio never starts by itself. 72dp high with a progress line along its bottom edge.

Left to right: **Artwork · back 15 · Play/Pause · forward 30 · Playlist**. Controls are 48dp.

- **No names are shown** (owner, 9 Nov 2026): the show or Chapter Artwork identifies what's playing, and the controls matter more. Screen readers still announce the podcast and Episode, and the system media notification shows them.
- Tapping the Artwork or the bar opens Now Playing.
- The Playlist button opens the Active Playlist, and its accessible label names that Playlist and the number of Entries after the current one.

## Now Playing

A persistent bottom sheet that expands from the mini player and leaves the navigation bar reachable. Playback errors use the snackbar only, with Try again also available on the transport control. Tapping a navigation destination collapses it. Playback continues.

Top to bottom: handle, "Now Playing · {Playlist}" and collapse; Artwork; previous Chapter, Chapter name and number, next Chapter; seek bar with Chapter ticks and elapsed/remaining; **back 15 · Play/Pause · forward 30**, the largest controls on the screen; a two-column grid of equal-width icon-over-label actions for speed, Sleep, **Episode**, **Chapters** and **Entries · N next**. Chapters uses its own chapter-list/bookmark glyph. End of Chapter is offered in Sleep only when the current Episode has Chapters; the last Chapter may stop at the Episode boundary.

The podcast and Episode names are left out here too. The Chapter name stays, because many podcasts have no Chapter Artwork. The Episode button leads to the full details.

## Back

Predictive back in this order: close any Add sheet, then nested player pages (Episode, Chapters, Entries), then collapse the player, then the normal back stack. Back never pauses or otherwise controls playback.

## Settings

A full screen reached from the gear. Sections: **Playback** (Speed, Skip intro, Skip outro, Volume boost), **Your listening** (Listening stats), **Your podcasts** (Import OPML, Export OPML), **Playlists** (Keep deleted Playlists), **This Device** (Server), **Help** (Getting started). Setting values sit below their labels at every text size. Help explains each section once; choice sheets carry longer explanations. Settings rows use text without leading icons, including OPML, so every label shares the content keyline. Appearance changes update Compose and the native window in place, keeping the same live list index and pixel offset. The application night override remains persisted for the next launch/splash. Keyboard shortcuts appear in Android’s system panel only.

## Agreed for milestone 4

Chosen by the owner on 9 Nov 2026. Prototype (throwaway, not production code): https://generatedpages.burmese-mountain.ts.net/podlist-android-phone-round-2/ Source: branch `prototype/android-phone-round-2`.

- **Add podcasts:** one field that takes a podcast name or a pasted feed address. OPML isn't here; import and export belong in Settings.
- **View editor:** one list with every condition as a row showing its value, each opening a small sheet. The View's name is renamed the same way as a Playlist's: name on its own, Rename below, then Cancel and Save. A live count and commit stay pinned in both New View and Edit View, replacing the bottom player and navigation chrome. Create View and Discard draft share the same footer as Done; single-field New Playlist keeps its inline commit. Undo remains reachable.
- **Rewind:** from the Listening Timeline, a bottom sheet lists what goes back, what becomes Unplayed, what returns and what's kept. The Playlist then shows the result with Undo.
- **Playlist settings:** name, Clear on Played and Delete on one page, opened with the pencil. Delete asks nothing first (owner, 9 Nov 2026): the Playlist goes to Trash and the snackbar says "Playlist Commute moved to Trash" with Undo (owner, 10 Nov 2026). Renaming is deliberate (owner, 10 Nov 2026): the name shows as text on its own, wrapping rather than cut off when long, with a Rename button on the line below; Rename turns it into a focused full-width field with Cancel and Save on the line below. Nothing changes until Save, which offers Undo. Save stays unavailable while the name is unchanged, empty or another Playlist's name, and the field says why. An open rename survives leaving the page or the app closing, until Save or Cancel.
- **Podcast page** (owner, 10 Nov 2026): compact header with who makes the podcast, a Search Episodes bar and the Episode count. Pulling down reveals artwork and description. Before subscribing the top bar has Subscribe; once subscribed its actions are gear · green check · overflow (last, disabled while Unsubscribe is armed), and tapping the check turns it into an Unsubscribe button that a second tap confirms, with no dialog (owner, 10 Nov 2026). The check reserves the full Unsubscribe label width so the gear stays fixed while arming, disarming or timing out, including at enlarged text. Keyboard shortcuts are never shown in the phone app; Undo (Ctrl+Z) and Redo (Ctrl+Shift+Z) are registered with Android's own Keyboard Shortcuts panel (Meta+/) (owner, 10 Nov 2026).
- **Subscription settings:** opened with the gear on the Podcast page. Unsubscribe isn't here. Unchanged values read Default and name what they inherit.
- **Listening stats:** one scrolling page reached from Settings, with all three periods visible at once, a 30-day chart that can be tapped and a table view.
- **First run** ([ADR 0012](../adr/0012-a-device-can-work-without-a-server.md)): a Welcome screen offers **Start on this phone** or **Connect to a server**. Either leads to the Getting started card above the starter Views on Views. Connecting a Standalone Device shows what will move before offering **Bring it over** or **Not now**, and the offer stays in Settings.
- **OPML:** a **Your podcasts** section in Settings, after Your listening, holds **Import OPML** and **Export OPML**, aligned with the other text-only Settings rows. Both use Android's file picker.

Success confirmations lead with the past-tense action and identify what changed: `Moved “The quiet edge…” in Default`, `Subscribed to Long listening`, `Created View “Night skies”`, and `Renamed Playlist to “Commute”`. Named Episode, View and Playlist titles are quoted where needed to distinguish them from the sentence. The owner-required “Playlist <name> moved to Trash” stays exact. Subscribe is filled on both the Podcast page and directory results. Rename, Delete, Mark all Played and Show table/chart use outlined Material buttons with standard padding, aligned to the content keyline; destructive actions use the error colour. Ordinary list dividers are inset and lightly toned with outlineVariant. Top bars keep one Undo slot at a fixed width before other actions, invisible and unfocusable while snackbar Undo is visible; overflow is always last and appears for Redo only when Redo is enabled. Opening a modal dismisses earlier snackbars; new global/background messages wait until all modals close. Feedback belongs to the sheet where its action began and reserves layout space above the commit row, including when actions wrap. It never overlays option rows, fields or Done.
