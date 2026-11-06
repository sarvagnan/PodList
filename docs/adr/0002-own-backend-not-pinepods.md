# Own backend instead of PinePods or a gpodder server

We run our own server that owns Subscriptions, feed refresh, the Library, Playlists, Views and Devices, instead of syncing through the user's existing PinePods instance or any gpodder-protocol server. Both of those model a single Position per Episode and a single queue, so with Position held per Entry (ADR 0001) PinePods would have been reduced to a feed fetcher behind a second service of ours, while still coupling us to a fast-moving, GPL-licensed, single-maintainer API. A web client needs a server anyway to fetch RSS (most feeds aren't fetchable cross-origin from a browser). The cost we accept is owning feed-parsing edge cases (malformed feeds, unstable GUIDs) that PinePods has already absorbed. Nothing is migrated from PinePods: the user starts fresh by importing an OPML file, and no Played state, Positions or queue are carried over.

## Considered Options

- **PinePods as-is** — one queue, no per-Playlist state; rejected.
- **PinePods + companion service** — two services, and PinePods' per-Episode Position would be a lossy mirror of ours.
- **PinePods' gpodder settings key-value store as our database** — last-write-wins blobs with no conditional writes; reordering a Playlist on two Devices would silently lose edits.
