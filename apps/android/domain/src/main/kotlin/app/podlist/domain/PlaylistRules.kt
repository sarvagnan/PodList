package app.podlist.domain

object PlaylistRules {
    fun hasNoCurrentEntry(playlist: Playlist): Boolean = playlist.entries.none { it.episodeId == playlist.cursor }

    fun availableTrash(state: State, at: Long): List<TrashedPlaylist> = state.trash.orEmpty().filter {
        it.deletedAt >= at - (state.trashDays ?: 30L) * 86_400_000.0
    }

    fun addEntry(playlist: Playlist, episodeId: String, placement: Placement, at: Long): Playlist {
        val oldIndex = playlist.entries.indexOfFirst { it.episodeId == episodeId }
        if (placement == Placement.Now && playlist.cursor == episodeId) return playlist
        val entry = playlist.entries.getOrNull(oldIndex) ?: Entry(episodeId, 0.0, at)
        val cursor = if (playlist.cursor == episodeId) playlist.entries.getOrNull(oldIndex + 1)?.episodeId else playlist.cursor
        val rest = playlist.entries.filterNot { it.episodeId == episodeId }.toMutableList()
        val cursorIndex = rest.indexOfFirst { it.episodeId == cursor }
        if (cursorIndex == -1) return playlist.copy(entries = rest + entry, cursor = episodeId)
        rest.add(when (placement) {
            Placement.Now -> cursorIndex
            Placement.Next -> cursorIndex + 1
            Placement.Last -> rest.size
        }, entry)
        return playlist.copy(entries = rest, cursor = if (placement == Placement.Now) episodeId else cursor)
    }

    fun moveEntry(playlist: Playlist, episodeId: String, after: String?): Playlist {
        val entry = playlist.entries.find { it.episodeId == episodeId } ?: return playlist
        if (after == episodeId) return playlist
        val rest = playlist.entries.filterNot { it.episodeId == episodeId }.toMutableList()
        val index = if (after == null) 0 else {
            val anchor = rest.indexOfFirst { it.episodeId == after }
            if (anchor == -1) return playlist
            anchor + 1
        }
        rest.add(index, entry)
        return playlist.copy(entries = rest)
    }

    fun removeEntry(playlist: Playlist, episodeId: String): Playlist {
        val index = playlist.entries.indexOfFirst { it.episodeId == episodeId }
        if (index == -1) return playlist
        return playlist.copy(
            entries = playlist.entries.filterNot { it.episodeId == episodeId },
            cursor = if (playlist.cursor == episodeId) playlist.entries.getOrNull(index + 1)?.episodeId else playlist.cursor
        )
    }

    fun setCursor(playlist: Playlist, episodeId: String?): Playlist =
        if (episodeId != null && playlist.entries.none { it.episodeId == episodeId }) playlist
        else playlist.copy(cursor = episodeId)
}
