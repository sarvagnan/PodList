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
- **Inspector:** the selected Episode's detail (Artwork, title, podcast, facts, two rows of icon actions, Chapters, show notes and Playlist memberships). Shown or hidden with ⌘⌥I and the toolbar button, and remembered.
- **Toolbar:** the current list's title and summary, its edit action (Edit View / Playlist settings), Inspector toggle and Search.

## Inspector

Owner decision, 11 Nov 2026: Play Now sits alone in the first row, centred.
It is a 44-point filled accent circle with play.fill. It becomes Pause with pause.fill
while this Episode is playing. It is the only prominent action.
The second row centres five equal 28-point icon buttons with even spacing:
Add to a Playlist, Star, Mark Played, Download and Share.
Star and Played use filled symbols for their active states.
Download shows progress and offers Cancel, Retry or Remove for its current state.
Every action has a tooltip and an accessibility label. Status and Position stay as text.
Episode and context menus keep text labels. Bulk actions stay in the selection toolbar.

Each Playlist membership has its own Resume icon and Position.
Resume makes that Playlist Active and starts at that Entry's Position.
Chapters show their Artwork, falling back to Episode Artwork, then podcast Artwork.
Share uses the Episode page link, then its enclosure. Copy Link uses the same address.
The Podcast page also offers Share podcast and Copy feed address.

## Player bar

Always present at the bottom of the window whenever the Active Playlist has a current Entry, including straight after launch (paused at its Position).

Left to right: **Artwork · back 15 · Play/Pause · forward 30**, then the middle of the bar, then **Speed**, **Sleep** and the Active Playlist's queue (name and Entries after the current one).

The middle is three centred lines (owner, 11 Nov 2026): the **Episode name** on top (truncated with an ellipsis only if it doesn't fit the full middle width), the **podcast name** below it in secondary text, then the **seek bar** with elapsed and remaining time. Clicking the artwork opens Now Playing. Media keys and the system Now Playing widget control playback.

Milestone 3 decision (11 Nov 2026): **Now Playing is a sheet**, opened from the player Artwork
or Controls menu. It shows large resolved Artwork, Episode and podcast names, the current
Chapter, larger transport controls, a scrubbable seek bar with Chapter ticks, Speed and Sleep
menus, previous/next Chapter and a Chapter list. Done/Escape dismisses it without pausing.
Episode detail opens inside the same sheet, with Back to Now Playing.
Its Add sheet opens above it. Adding Next or Last keeps the detail context.
Starting playback from detail returns to Now Playing.
Open Active Playlist dismisses the sheet and navigates the owning window.
Starting playback from that route reopens Now Playing. Navigating elsewhere ends that return route.
This is the Mac presentation for the shared Episode detail and Entries round trip.
The player middle
keeps exactly the three centred lines above. Chapter Artwork overrides Episode, then podcast.

Downloads appear as a down-arrow in Episode lists and with progress/cancel/retry/remove actions
in the Inspector. A Subscription's Episode list has this Device's Download Rule and optional
All New cap above the table. A cap is positive, or All has no cap.
Older zero caps are repaired to no cap when the Library opens.
Subscriptions support native multi-selection and one batch Download Rule editor. Closing all windows keeps the app in the Dock and playing;
explicit Quit flushes local Position/listening before termination.

## Menus and shortcuts

Native menu bar with the standard App, File, Edit, View, Controls (playback), Window and Help menus; every command reachable from a menu, with the usual shortcuts shown there (⌘N new View/Playlist, ⌘Z / ⇧⌘Z Undo and Redo, Space play/pause, ⌘→ / ⌘← skip, ⌘, Settings, ⌘⌥I Inspector). Settings is the standard Settings window.

## Carried over from the other clients

Delete Playlist asks nothing and offers Undo; Unsubscribe takes two clicks on the subscribed control; renaming is an explicit Rename with Cancel and Save; Playlist and View names are unique; drafts survive quitting. Exact Mac presentation of each is settled while building milestone 2 and recorded here.

## Milestone 4a editing presentation

File > New Playlist uses ⌘⇧N. Episode actions are available in the Episode menu, row context
menus, the selection toolbar and Inspector; the Add sheet preselects the Active Playlist,
with New Playlist as its last choice. Podcast-page Add uses this same sheet before or after subscribing.
Each fresh Add sheet preselects the current Active Playlist.
An unfinished Add draft keeps an explicitly chosen target and any New Playlist name.
A successful Add clears that draft; an old target alone is not an open draft. Playlist settings is a sheet with the full name on its
own lines and Rename/Cancel/Save beneath it; New Playlist, Add and open Rename drafts are
kept per server when a sheet closes or the app quits. Delete has no confirmation: the status
says “Playlist <name> moved to Trash” and offers the named Undo action.

Playlist Entries, History and Listening Timeline use a segmented control. Entries use native
table row dragging with insertion boundaries, with Move Up/Down (⌘⌥↑/↓) and Remove (⌘⌫) in
the Episode menu. Rewind opens a summary sheet before committing. Edit > Undo/Redo names the
latest domain edit across Playlists, Views and Subscription changes.
These edits share one session history. Failed reversals stay available for retry.
Editable text retains native text Undo. A compact status line provides
feedback and Undo, and Trash includes Restore and its retention period.


## Agents and automation

Milestone 4c automation, with the owner’s decisions of 11 Nov 2026 recorded below.

App Intents and the Mac MCP tools share `AutomationActions` in PodListUI.
It resolves ids in the open Library. It uses the existing Episode and Playlist editing
model for every edit, including Play Now. These edits have the same named Edit > Undo
steps as the UI. Playback commands go through PlaybackController. Automation works on
a Standalone Device and on a server connection, including while the server is offline.

The actions are Play, Pause, Toggle, Back 15, Forward 30, Now Playing, Play Episode Now,
Add Episodes, Add Current Episode, list Views, list Playlists, list Episodes, Search,
Star/Unstar and Mark Played/Unplayed. Add uses the Active Playlist unless a Playlist is
chosen. Play Next and Play Last keep the supplied Episode order. Now Playing returns the
Episode, podcast, Position in seconds and Active Playlist. Lists return stable ids, counts
and pages of up to 200 results; the default page has 100. View results and Search use the
same Library rules as the UI. Playlist results keep Entry order and per-Entry Positions.
Agents cannot change connections, Empty Trash, Delete Playlist or Unsubscribe.

Episode and Playlist App Entities support lookup and text queries in Shortcuts.
App Shortcuts offer Play, Pause and Add Current Episode. Intents open the app so they use
the live session and its Undo history. Listing Episodes accepts a Playlist or a View id
from List Library. The development app bundle includes extracted App Intents metadata.
The bare SwiftPM executable alone does not register actions with Shortcuts.

By the owner’s decision of 11 Nov 2026, the MCP server is opt-in and off by default.
Settings > Automation has a plain toggle, with an explanation that any app running as
this user on this Mac can read the Library and control playback. The preference is stored
in this Mac’s UserDefaults, outside Library State, and is not synced. App Intents and
Shortcuts remain available by default, independently of MCP.

Enabling MCP starts one listener immediately. Disabling it stops the listener, closes
open connections and removes the socket; Quit does the same while retaining the preference.
When enabled, the Automation pane shows the bridge path and a copyable MCP client config.
Closing every window leaves the enabled listener running in the Dock. It uses a Unix socket
at `~/Library/Application Support/PodList/Automation/mcp.sock`. Its directory has mode 0700;
the socket has mode 0600. Both ends check the peer's user id. A lock prevents a second
app from taking the live socket. Startup removes a stale socket after a crash, including
when MCP is disabled, without disturbing another app’s live listener. There is no TCP listener.

An MCP client starts `podlist-mcp`, a transparent stdio bridge. The app must already be
running with MCP enabled. Without a listener the bridge reports that PodList is not
running or MCP is turned off in PodList Settings; the missing socket cannot distinguish
those cases reliably. The development bundle includes the bridge beside the app executable.

By the owner’s decision of 11 Nov 2026, only MCP **2026-07-28** is supported. The older
handshake protocol is heavier and is not wanted. There is no per-connection handshake
state: every request supplies its protocol version and client capabilities in `params._meta`,
with optional client identity. `initialize` is rejected with code -32022, the requested
revision and the sole supported revision, and a message explaining that PodList requires
MCP 2026-07-28. `notifications/initialized` and `ping` have no handlers. Other unsupported
revisions receive `UnsupportedProtocolVersionError` with the same single supported revision.

The server implements `server/discover`, `tools/list` and `tools/call` over newline-delimited
JSON-RPC 2.0 without external packages. Discovery advertises supported versions, capabilities
and identity. Every result includes `resultType: "complete"` and server identity in `_meta`.
Discovery and the deterministic, name-sorted tool catalog use a five-minute `ttlMs` freshness
hint and `cacheScope: "private"`. Tools advertise JSON Schema inputs and return concise
structured results. Failed actions return tool errors; malformed protocol parameters,
unknown tools and unknown methods return JSON-RPC errors. No application errors use the
spec-reserved -32020 through -32099 range. Messages are capped at 1 MiB, connections at eight,
and blocked writes time out after five minutes. Idle connections stay open.

Protocol references: [versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning),
[stdio](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio),
[discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover) and
[schema](https://modelcontextprotocol.io/specification/2026-07-28/schema).
