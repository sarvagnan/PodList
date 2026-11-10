# PodList

A personal podcast client that splits listening into two halves: finding episodes (Views over the Library) and consuming them (Playlists with their own playback state).

## Language

### Library

**Subscription**:
A podcast the user follows. How a podcast's Episodes enter the Library; a single Episode can also come in from a Podcast page.
_Avoid_: Feed, follow, podcast (when you mean the user's relationship to it)

**Library**:
Every Episode of every Subscription, and every Orphaned Episode.
_Avoid_: Catalogue, inbox, feed

**Episode**:
A single published item of a podcast, independent of any Playlist.
_Avoid_: Item, track

**Published**:
The date the feed says an Episode was released. "New" and every date-based View mean Published, never when we first saw the Episode.
_Avoid_: Added, discovered, fetched

**Back Catalogue**:
The Episodes a Subscription already had when the user subscribed. Part of the Library like any other Episode, and unplayed like any other.
_Avoid_: Archive, old episodes

**Played**:
An Episode-level fact that the user has finished (or marked as finished) the Episode, regardless of which Playlist it was heard in. Listening to within 30 seconds of the end counts as finishing, unless the Subscription sets its own number of seconds.
_Avoid_: Completed, listened, done

**Unplayed**:
Not Played. An Episode with a Position somewhere (in progress) is still Unplayed.
_Avoid_: New, unheard

**Podcast page**:
The page for one podcast, whether or not the user subscribes to it: its Episodes, a search within them, and Subscribe. Once subscribed it is also where the Subscription's settings and Unsubscribe live.
_Avoid_: Preview, show page

**Orphaned**:
An Episode that is an Entry somewhere or Starred with no Subscription behind it, because the Subscription was removed or because it was played or added from a Podcast page. It stays until the user removes it, and Views and Search still find it; nothing else from that podcast remains in the Library. Removing a Subscription doesn't remove downloads on any Device.
_Avoid_: Unsubscribed episode, dangling

**Chapter**:
A titled, timestamped section of an Episode, as published by the podcast; it may carry its own Artwork.
_Avoid_: Marker, segment, bookmark

**Artwork**:
The image shown for what is playing. A podcast always has one; an Episode and each Chapter may override it, and the most specific one available wins (Chapter, then Episode, then podcast).
_Avoid_: Cover, thumbnail, image (when you mean this resolved choice)

**Star**:
An Episode-level mark meaning "keep this". A Starred Episode's downloads are never discarded, and Views can filter on it. It does not stop Clear on Played.
_Avoid_: Favourite, saved, bookmark, like

### Finding

**View**:
A saved, named filter over the Library that is re-evaluated every time it is opened; it never stores a list of Episodes. Its conditions all have to match; text matches titles, podcast names and show notes (when the feed has them). Edits to its conditions take effect as they are made, with no separate save; renaming it is an explicit step. No two Views share a name.
_Avoid_: Filter, smart playlist, feed, saved search

**Search**:
An unsaved, one-off View; it can be promoted to a View, which needs a name.
_Avoid_: Query, ad-hoc filter

### Listening

**Playlist**:
An ordered collection of Entries with its own playback state (Cursor, Entry Positions, History). No two Playlists outside Trash share a name.
_Avoid_: Queue, list

**Default Playlist**:
The one Playlist that always exists and cannot be deleted or renamed. Otherwise an ordinary Playlist.
_Avoid_: Main queue, Up Next

**Active Playlist**:
The single Playlist the player is currently drawing from. There is one Active Playlist across all Devices, not one per Device.
_Avoid_: Current queue, now playing

**Entry**:
An Episode's membership in one Playlist. An Episode appears at most once per Playlist but may be an Entry in many Playlists.
_Avoid_: Item, slot, track

**Play Now / Play Next / Play Last**:
The three ways of adding an Episode to a Playlist (the Active Playlist unless another is chosen): just before the Cursor and start it, just after the Cursor, or at the end. If the Episode is already an Entry there, it is moved instead.
_Avoid_: Enqueue, insert, append

**Position**:
How far into an Episode the user is, held per Entry — the same Episode can be at different Positions in different Playlists.
_Avoid_: Progress, offset, timestamp

**Cursor**:
Which Entry of a Playlist is current; switching Playlists resumes at that Playlist's Cursor.
_Avoid_: Now playing, current index

**History**:
The record of Entries finished from a particular Playlist.
_Avoid_: Log, played list

**Listening Timeline**:
A Playlist's continuous record of what it was playing and when (clock time, Entry, Position), kept for 30 days. Unlike History, it covers partial listening, not just finished Entries.
_Avoid_: Log, playback history, undo stack

**Listening log**:
The permanent record of time spent listening each calendar day, per Subscription, across all Devices. It includes partial listens and stays after an Episode or Playlist is removed.
_Avoid_: History, Listening Timeline, playback history

**Listening stats**:
A summary of the Listening log and Episodes finished through listening: time listened, Episodes finished, top podcasts, daily listening and the current streak.
_Avoid_: Analytics, dashboard

**Listening streak**:
Consecutive calendar days with listening, ending today or yesterday.
_Avoid_: Run, score

**Rewind**:
Returning a Playlist to a moment on its Listening Timeline: the Cursor and Position go back to that moment, and every Episode that became Played through that Playlist's playback since then becomes unplayed again, with its Entry restored where it was then (between its old neighbours, as near as later edits allow). Episodes started since then lose the Position they gained. Deliberate edits made since — adds, reorders, Episodes marked Played by hand — are kept. A Rewind can itself be undone.
_Avoid_: Undo, time travel, restore

**Clear on Played**:
A Playlist setting under which an Entry leaves the Playlist as soon as its Episode becomes Played — wherever that happened. On by default for the Default Playlist; Playlists without it keep their Entries. Turning it on doesn't remove Entries that are already Played.
_Avoid_: Auto-delete, remove when finished

**Trash**:
Where a deleted Playlist goes, together with its History and Listening Timeline, which belong to it. It can be restored for 30 days (a setting), then it is gone. The Default Playlist can't be deleted; deleting the Active Playlist makes the Default Playlist Active.
_Avoid_: Bin, recycle, archive

**Playback Settings**:
Speed, intro/outro skipping, volume boost and similar. Global defaults, optionally overridden per Subscription; never per Playlist. Changing speed in the player affects only the Episode playing now; the saved Playback Settings are changed only in settings.
_Avoid_: Player preferences, audio settings

### Devices

**Device**:
One installation of the client (a browser, the desktop app, a phone). Download decisions are made per Device.
_Avoid_: Client, machine

**Standalone Device**:
A Device with no server: it fetches feeds itself and holds its own Library, Playlists and Listening log. Connecting it to a server later offers to bring everything over.
_Avoid_: Local mode, guest, demo, offline (offline means the server can't be reached right now)

**Download Rule**:
The per-Subscription, per-Device choice of when Episodes are stored for offline listening: Stream (never stored), when they become an Entry, or as soon as they are published — optionally capped at a maximum number kept. A new Subscription starts at Stream. A download is discarded once its Episode is no longer an Entry anywhere.
_Avoid_: Auto-download setting, offline policy

**Manual Download**:
A one-off download of a single Episode on one Device, made regardless of the Download Rule.
_Avoid_: Pin, save offline
