# A Device can work without a server

Until now PodList needed a server before it could show anything: only the server fetches feeds, searches for podcasts and supplies Episodes, and the Android app could not open without an address. That shuts out anyone just checking the app out, and asks everyone to run a server first. So the apps with a local database (Android, then the Apple apps and Electron) work fully as a **Standalone Device** (decided 9 Nov 2026): the Device fetches and refreshes feeds itself, in the background too, and holds its own Library, Playlists, Positions, downloads and Listening log. Search uses Apple's public directory, which the server already falls back to and which needs no key, because a Podcast Index secret can't ship inside an app. The online-only web client (ADR 0011) still needs a server.

A server becomes optional, and when there is one it is still the hub (ADR 0002, ADR 0004). Connecting a Standalone Device offers to bring everything over, showing what will move first: Subscriptions, Playlists, Positions, Played and Starred marks, and the Listening log. Declining keeps the phone's Library separate, as each server address's Library already is.

The rejected alternatives were a built-in sample Library, which is a demo and not use, and manual refresh only, because a podcast app that doesn't update itself feels broken.

## Consequences

- Each local client reimplements what the server does with feeds (fetching, parsing, polling, Chapters, Subscribe and Unsubscribe), so feed parsing joins the language-neutral conformance vectors (ADR 0007).
- Ids don't match across a move: the server makes its own Subscription and Episode ids, so bringing a Library over matches Subscriptions by feed address and Episodes by feed guid.
- Audio and Artwork on a Standalone Device always come straight from the publisher (ADR 0009), with no server to fall back on.
