# Electron parity with the native Mac app

Baseline: `t3/electron-device-kind` (63dd7f1), 25 November 2026. The native reference is the Apple README, its UI tour and the SwiftUI screens in `apps/apple/Sources/PodListUI`. Electron evidence comes from the shell in `packages/desktop`, the desktop build of `packages/web`, and their tests. Status reflects a source audit. Live desktop and assistive-technology verification remain part of acceptance.

| Mac capability | Electron status | Evidence and gap |
| --- | --- | --- |
| Welcome and Start on This Mac | **Missing** | Electron's setup page requires a server. It has First Run guidance inside a Library. |
| Standalone Device identity, Library, Views, Playlists, Positions and Listening log through relaunch | **Missing** | The SQLite worker, OPFS and outbox are already durable and scoped to a connected server origin. There is no server-free Library or local-only write path. |
| Connect, validate and reconnect to a server | **Partial** | Setup checks HTTP success from health. Mac validates the origin and health payload, shows progress, and distinguishes errors and protocol incompatibility. |
| Disconnect, then connect to a different server | **Partial** | The app menu can change servers and reuse a previous origin's profile. Settings has no equivalent, and there is no disconnect-to-Welcome flow. |
| Bring Over preview, accept, Not Now, reopen and retry | **Missing** | No counted preview, feed-address/GUID mapping, durable checkpoint or resume. Mac retains the source and moves state and downloads to the target Library. |
| Use a cached server Library and retry sync | **Has it** | Local SQLite and durable outbox work offline, with a status indicator and retry. |
| Fetch and parse publisher RSS | **Missing** | Server parses all feeds. The shared feed vectors exist in `packages/domain/protocol/feeds.json`. |
| Manual feed refresh, progress, cancel and retry | **Missing** | Sync fetches existing server updates. Mac explicitly requests publisher refresh, reporting progress and per-feed failures. |
| Background feed refresh, conditional requests, backoff and catch-up | **Missing** | Electron's periodic work syncs server data. Mac persists validators and checks at startup, foreground and network recovery as well as on an interval. |
| Podcast directory and direct feed-address search | **Partial** | Both work through the server. Standalone search needs Apple's public directory and direct feed reads. Mac uses one field and preserves it when subscribing. |
| Podcast page before Subscribe | **Missing** | Search results have Subscribe and feed metadata. Mac opens a Podcast page with episode search, publisher links and per-Episode actions. |
| Play or add a single Orphaned Episode and later subscribe without a duplicate | **Missing** | The server exposes the versioned Podcast read and single-Episode import. The desktop screen has no integration. |
| Subscribe and Unsubscribe, staying on the Podcast page | **Partial** | Server-backed subscription buttons and a Library route exist. Local editing, Mac's two-step button, immediate menu Unsubscribe and Undo need parity. |
| Subscription list, grouping, unread counts and Episode sorting | **Has it** | Library groups by Download Rule and can open and sort Episodes. |
| Subscription Playback Settings and Played threshold | **Has it** | The existing Subscription route writes overrides through the sync engine. |
| Publisher audio and Artwork, with server fallback on connected Devices | **Partial** | Playback tries publisher audio and configured fallback. Artwork uses the server thumbnail path in some cases. Standalone media needs publisher-only handling. |
| Playback controls, Now Playing, Speed, skip, volume boost and Sleep Timer | **Has it** | Shared Playback, player bar and drawer provide these. The native menu and separate Now Playing window have gaps below. |
| Chapters, offline Chapters and publisher website links | **Partial** | Stored and server-resolved Chapters exist. Mac also resolves downloaded ID3 Chapters. Electron needs standalone chapter-source handling and full publisher-link coverage. |
| Media keys, system Now Playing and playback with window closed | **Partial** | Chromium Media Session is implemented. Window closure currently hides the page only with MCP enabled. System behavior needs platform verification. |
| Listening log, Listening Timeline, History, Rewind and Listening stats | **Has it** | Separate Playlist tabs, Rewind preview, permanent log, and stats screen with periods, streak, chart and table. |
| Restore an Entry after Undo or Rewind, including Show Restored Entries | **Partial** | Domain Undo and Rewind restore Entries. Electron has no explicit reveal action; Mac stays in context and offers to reveal or selects restored Entries in the appropriate open Playlist. |
| Manual Downloads, progress, Cancel, Retry and Remove | **Has it** | Renderer-managed OPFS files with a native audio fetch bridge for CORS-restricted hosts. |
| Download Rules, newest cap and keeping manual or Starred downloads | **Has it** | Existing per-Device rules and planner. Standalone still requires a publisher-only download source and stable identity. |
| Transfer persistence and local playback on quit and relaunch | **Partial** | Stored audio survives relaunch. Match the Mac's queued and failed download recovery, background behavior and quit-time listening flush. |
| Views, starter Views, editing, sorting, counts and drafts | **Has it** | Electron has saved Views, edits, starter guidance and draft recovery. Check multi-window draft behavior when window parity is designed. |
| Search Library, filter This list, and Create View | **Partial** | Library Search, promotion and the pending typed-query fix exist. Mac provides contextual toolbar scope and a recoverable Open Created View action. |
| Playlists and Entries, selection, reordering, per-Entry Positions, Active Playlist and Clear on Played | **Has it** | Shared Playlist screens, DnD and keyboard reorder cover the core behavior. Mac's cross-list drag and more menu actions remain below. |
| Trash, retention, Restore, permanent delete, and undoable moves | **Has it** | Trash screen, domain journal and retention settings implement these. |
| Undo and Redo with action names, text field Undo and retry | **Partial** | Electron mirrors named actions to Edit and preserves native text Undo. Subscription and reveal actions, keyboard parity outside macOS and focus recovery need work. |
| Settings General, Automation, Playback, Trash, Appearance and onboarding | **Partial** | One Settings page includes Playback, Trash, OPML and Automation. General/Automation panes, native connection and feed controls, and Mac's persisted Appearance choice need parity. |
| OPML import/export, progress, failed-only retry and open document | **Partial** | Import/export and retry are available inside Electron. Mac has native File commands and stages Finder documents. |
| Menus, keyboard shortcuts and contextual commands | **Partial** | File, Edit, View, Controls, Go and row menus exist. Mac also has Saved Views, Podcast, Playlist and Episode actions, disabled states, Stop, Sleep Timer, Playback Speed, Now Playing and File OPML. New View and New Playlist accelerators are reversed. |
| Sidebar, content column and Inspector | **Has it** | Pane transition, persistence, selection behavior, Inspector on narrow windows and menu toggles are covered by the pending baseline's desktop tests. |
| More Library windows and per-window navigation | **Missing** | Electron owns one Library window. SwiftUI shares a Library session across windows and restores window-local navigation. |
| App links and publisher Share or Copy Link | **Partial** | Electron copies server and publisher links in some contexts. Mac also creates and handles `podlist://` Episode, Playlist, View and Podcast links without starting playback. |
| Share extension, Add to PodList Service and local search indexing | **Missing** | The generic Electron Services menu registers no PodList action. Mac stages a shared feed, accepts a selected address through Services, and indexes Library items in Spotlight. |
| Drag and drop | **Partial** | Internal Entry reorder and drop navigation protection exist. Mac drags Episode selections between Playlists, accepts supported document/feed drops, and reports outcomes. |
| Status, accessible announcements, errors and Retry | **Partial** | Live regions, status indicator, undo feedback and offline pending notices exist. Publisher refresh, durable errors and connection/transfer feedback have gaps. |
| MCP | **Has it** | Local bridge with opt-in Settings, native listener and tested app actions. Audit action-by-action parity as new actions land. |
| App Intents, Shortcuts, Siri, system Undo, donations and Now Playing snippet | **Missing** | Native Apple integrations. Electron provides analogous app automation through MCP. |
| Accessibility and typography | **Partial** | Semantic DOM, keyboard selection, focus return, announcements and zoom exist. Verify VoiceOver, NVDA and Orca behavior, high contrast, reduced motion, focus and Mac action states. |

## Implementation order

Ranked by user value, with effort relative to the existing Electron implementation.

| Rank | Scope | Value | Effort |
| --- | --- | --- | --- |
| 1 | Standalone write/read model, RSS conformance, Apple's directory, publisher media, Subscribe and polling | Critical | Large |
| 2 | Podcast page and single-Episode play/add, using the existing connected-server endpoints and the standalone catalogue | Critical | Large |
| 3 | Bring Over preview and resumable transfer by feed address and GUID, with version gating | Critical | Large |
| 4 | Validate, disconnect, connect and switch with isolated Library sessions | High | Medium |
| 5 | Restore and reveal Entries, contextual Search, menu parity, Appearance and Settings | High | Medium |
| 6 | Background playback, downloads and listening-flush lifetime, cross-list drag and OPML handoff | High | Large |
| 7 | App links, share targets, local indexing, additional windows, automation and accessibility verification | Medium to high | Large |

Keep the browser client online-only. Leave the existing server protocol unchanged where possible. Use the declared protocol version for the connected Podcast page and avoid writes to endpoints absent from older versions. Verify the desktop workflows in the VM and retain browser E2E tests for the established online flows.

## Owner decisions

- **Publisher network process.** Recommend the main process for a narrowly scoped, bounded HTTP(S) transport with redirects checked and no session credentials. Keep feed parsing and catalogue updates separate so the transport can move to a Node worker if the owner wants isolation from main-process workloads.
- **Storage layout.** Recommend one persistent Chromium partition for Standalone and the existing versioned SQLite worker/OPFS schema, keeping the existing hashed partitions for servers. Store only the active Library selection in shell configuration. Keep Bring Over progress durable and target-scoped.
- **Platform integrations.** Recommend `podlist://` and OPML associations across Electron platforms, an Add Podcasts paste/drop flow everywhere, OS share targets where supported, MCP for automation, and a later decision on Windows Search or desktop-environment indexing. Keep Apple-specific Services, Spotlight and App Intents in the native app.
- **Background lifetime and extra windows.** Recommend preserving playback and transfers when closing the Library window and limiting publisher polling to the running application. Decide whether Windows/Linux should offer a tray and whether additional windows should share one renderer-owned Library session before building those features.

## Desktop integration checkpoint

The baseline table above records the original audit. This checkpoint adds:

- App links for Episodes, Playlists, Views and Subscriptions in the active Library. A missing target leaves the current screen in place.
- Native OPML opening, File › Import OPML and Library file drops feed the existing import preview. Windows offers PodList in Open With. Linux registers a per-user desktop entry and OPML MIME association. Packaged Windows and Linux apps register on first launch.
- The Add Podcasts field accepts pasted feed addresses. Dropping a feed address on the Library also opens Add Podcasts for review.
- Episode Details and playback can use ID3 Chapters from completed downloads. When a feed declares publisher JSON Chapters, the resolver still prefers those.
- Native keyboard context menus use the focused row and expose the same enabled states as the corresponding web controls. Opening OPML from the OS moves keyboard focus to the import region.

## Shared rules and desktop workflow checkpoint

- The server and Electron use the same TypeScript rules for feed polling, Episode identity and Apple directory results. Bring Over mapping lives in the domain package. The server retains its scheduled sweep cadence and directory responses. Cross-client fixtures are tracked in pod-9w8.
- Drag an Entry title or checked Episode rows onto a Playlist in the sidebar to copy them in order. The drop preserves existing destination Entries and offers one Undo. An Entry’s native menu also offers Add to a Playlist.
- Find focuses the current list’s search field. Global Search remains available from the sidebar and Go menu. Scoped results preserve list order and View limits.
- Standalone can discover Chapters before a download by reading a bounded prefix of the publisher audio. Episode and Subscription details can show their publisher website links.
- Stop releases the audio stream and saves the Position. Downloads queued when the app quits start again when the Library reopens. Failed downloads keep their Retry state.

Packaged associations, Media Session controls and assistive technology still need live verification on each platform. OS share targets, desktop search indexing, the tray and extra windows remain deferred. Dragging pre-subscription search results and dragging between windows remain outside the current Playlist drop workflow.
