# Mac layout (v1)

The selected Mac presentation of the Apple app (phase 2 of the [platform plan](../plans/platform-clients.md)). Shared behaviour is authoritative in [product-behaviour.md](product-behaviour.md); [CONTEXT.md](../../CONTEXT.md) defines the domain language and [client duties](../protocol/client-duties.md) define what the client must do.

Chosen by the owner on 11 Nov 2026 from three mocked variants: **A — Three columns**, **B — Sidebar, list and player bar**, and **C — Views and Playlists side by side**. B was chosen, with one change: the player bar shows the podcast and Episode name above the seek bar, because a Mac window has the room.

Mock-ups (throwaway): https://generatedpages.burmese-mountain.ts.net/podlist-mac-layouts/#B

## Look

SwiftUI with AppKit conventions: system font, sidebar material, unified toolbar, PodList blue `#2b50c8` as the accent, light and dark following the system. Only macOS is built out in this phase; the codebase stays multiplatform so iPhone and iPad follow later.

## Window

`NavigationSplitView` with two columns plus an Inspector, and a player bar along the bottom of the window.

- **Sidebar:** sections **Views**, **Playlists** and **Library**, each listing its items with a count. The Active Playlist is marked. Library holds Subscriptions and Search; Trash sits under Playlists. + buttons create a View or Playlist, or open Add podcasts.
- **Content:** the selected View, Playlist or Library list. Episodes show as a list with sortable columns (title with podcast, Published, length, state), and per-row Add and Play buttons. Selection follows the Mac: click, ⇧-click and ⌘-click; Return opens; Space plays.
- **Inspector:** the selected Episode's detail (artwork, title, podcast, facts, Play Now as the one filled button, Add, Star, Download, show notes, the Playlists it's in). Shown or hidden with ⌘⌥I and the toolbar button, and remembered.
- **Toolbar:** the current list's title and summary, its edit action (Edit View / Playlist settings), Inspector toggle and Search.

## Player bar

Always present at the bottom of the window whenever the Active Playlist has a current Entry, including straight after launch (paused at its Position).

Left to right: **Artwork · back 15 · Play/Pause · forward 30**, then the **podcast and Episode name above the seek bar** (owner, 11 Nov 2026), elapsed and remaining time, **Speed**, **Sleep** and the Active Playlist's queue (name and Entries after the current one). Clicking the artwork opens Now Playing. Media keys and the system Now Playing widget control playback.

## Menus and shortcuts

Native menu bar with the standard App, File, Edit, View, Controls (playback), Window and Help menus; every command reachable from a menu, with the usual shortcuts shown there (⌘N new View/Playlist, ⌘Z / ⇧⌘Z Undo and Redo, Space play/pause, ⌘→ / ⌘← skip, ⌘, Settings, ⌘⌥I Inspector). Settings is the standard Settings window.

## Carried over from the other clients

Delete Playlist asks nothing and offers Undo; Unsubscribe takes two clicks on the subscribed control; renaming is an explicit Rename with Cancel and Save; Playlist and View names are unique; drafts survive quitting. Exact Mac presentation of each is settled while building milestone 2 and recorded here.
