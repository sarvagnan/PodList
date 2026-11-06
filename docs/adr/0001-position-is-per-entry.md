# Position is held per Entry, not per Episode

Playback Position belongs to an Entry (an Episode within a specific Playlist), so the same Episode can sit at different Positions in different Playlists. This is deliberate: a "replay" Playlist must start an Episode fresh even though the Default Playlist has already played it through. Most podcast apps and sync protocols (PinePods, gpodder) keep one Position per Episode, so anything synced to them is a lossy projection of our model, not the source of truth.
