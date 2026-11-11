# Mac layout (v1)

The selected Mac presentation of the Apple app (phase 2 of the [platform plan](../plans/platform-clients.md)). Shared behaviour is authoritative in [product-behaviour.md](product-behaviour.md); [CONTEXT.md](../../CONTEXT.md) defines the domain language and [client duties](../protocol/client-duties.md) define what the client must do.

Chosen by the owner on 11 Nov 2026 from three mocked variants: **A — Three columns**, **B — Sidebar, list and player bar**, and **C — Views and Playlists side by side**. B was chosen, with one change: the player bar shows the Episode and podcast name above the seek bar, because a Mac window has the room.

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

Left to right: **Artwork · back 15 · Play/Pause · forward 30**, then the middle of the bar, then **Speed**, **Sleep** and the Active Playlist's queue (name and Entries after the current one).

The middle is three centred lines (owner, 11 Nov 2026): the **Episode name** on top (truncated with an ellipsis only if it doesn't fit the full middle width), the **podcast name** below it in secondary text, then the **seek bar** with elapsed and remaining time. Clicking the artwork opens Now Playing. Media keys and the system Now Playing widget control playback.

Milestone 3 decision (11 Nov 2026): **Now Playing is a sheet**, opened from the player Artwork
or Controls menu. It shows large resolved Artwork, Episode and podcast names, the current
Chapter, larger transport controls, a scrubbable seek bar with Chapter ticks, Speed and Sleep
menus, previous/next Chapter and a Chapter list. Done/Escape dismisses it without pausing.
Open Active Playlist dismisses the sheet and navigates the owning window. The player middle
keeps exactly the three centred lines above. Chapter Artwork overrides Episode, then podcast.

Downloads appear as a down-arrow in Episode lists and with progress/cancel/retry/remove actions
in the Inspector. A Subscription's Episode list has this Device's Download Rule and optional
All New cap above the table. Closing all windows keeps the app in the Dock and playing;
explicit Quit flushes local Position/listening before termination.

## Menus and shortcuts

Native menu bar with the standard App, File, Edit, View, Controls (playback), Window and Help menus; every command reachable from a menu, with the usual shortcuts shown there (⌘N new View/Playlist, ⌘Z / ⇧⌘Z Undo and Redo, Space play/pause, ⌘→ / ⌘← skip, ⌘, Settings, ⌘⌥I Inspector). Settings is the standard Settings window.

## Carried over from the other clients

Delete Playlist asks nothing and offers Undo; Unsubscribe takes two clicks on the subscribed control; renaming is an explicit Rename with Cancel and Save; Playlist and View names are unique; drafts survive quitting. Exact Mac presentation of each is settled while building milestone 2 and recorded here.

## Milestone 4a editing presentation

File > New Playlist uses ⌘⇧N. Episode actions are available in the Episode menu, row context
menus, the selection toolbar and Inspector; the Add sheet preselects the Active Playlist,
with New Playlist as its last choice. Playlist settings is a sheet with the full name on its
own lines and Rename/Cancel/Save beneath it; New Playlist, Add and open Rename drafts are
kept per server when a sheet closes or the app quits. Delete has no confirmation: the status
says “Playlist <name> moved to Trash” and offers the named Undo action.

Playlist Entries, History and Listening Timeline use a segmented control. Entries use native
table row dragging with insertion boundaries, with Move Up/Down (⌘⌥↑/↓) and Remove (⌘⌫) in
the Episode menu. Rewind opens a summary sheet before committing. Edit > Undo/Redo names the
latest domain edit; editable text retains native text Undo. A compact status line provides
feedback and Undo, and Trash includes Restore and its retention period.
