# A podcast can be explored before subscribing

Until now a Subscription was the only way an Episode could enter the Library, so a podcast found in search was only a row with a Subscribe button: there was no way to look at it first. People need to see what a show is before following it, so opening a search result now shows its Podcast page, with its Episodes, and they can play or add a single Episode without subscribing (owner, 10 Nov 2026).

An Episode played or added this way comes in on its own and is Orphaned, the same state as an Episode kept after unsubscribing: an Entry or Starred Episode with no Subscription behind it. Nothing else from that podcast enters the Library, and subscribing later reveals the same Episode rather than a copy.

The rejected alternatives were a view-only page, which keeps the old rule but leaves the page mostly for reading, and a temporary player outside the Library, which would need its own Position and playback rules separate from Playlists.

## Consequences

- The server and Standalone Devices need to read a feed without subscribing, and to bring in one Episode from it. Polling still only covers active Subscriptions.
- A Subscription row can exist for a podcast the person has never subscribed to, marked unsubscribed, so its one Episode has somewhere to belong.
- Unsubscribing leaves the person on the Podcast page, which now has to work for a podcast they no longer follow.
