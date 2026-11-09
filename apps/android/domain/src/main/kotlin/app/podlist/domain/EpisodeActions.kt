package app.podlist.domain

object EpisodeActions {
    /** Next always inserts after the Cursor, so reversed operations preserve displayed order. */
    fun addMany(ids: List<String>, playlistId: String, placement: Placement): List<Change> =
        (if (placement == Placement.Next) ids.distinct().asReversed() else ids.distinct()).map { Change.AddEntry(playlistId, it, placement) }

    fun undoAdd(before: Playlist, ids: List<String>): List<Change> = buildList {
        ids.filter { id -> before.entries.none { it.episodeId == id } }.forEach { add(Change.RemoveEntry(before.id, it)) }
        before.entries.forEachIndexed { index, entry -> if (entry.episodeId in ids) add(Change.MoveEntry(before.id, entry.episodeId, before.entries.getOrNull(index - 1)?.episodeId)) }
        add(Change.SetCursor(before.id, before.cursor))
    }

    /** Restore affected facts and Entries, without replacing later edits or the Listening log. */
    fun undoPlayed(before: State, ids: List<String>, at: Long): List<Change> = buildList {
        ids.forEach { id -> add(before.episodeStates[id]?.played?.let { Change.MarkPlayed(id, it.source) } ?: Change.MarkUnplayed(id)) }
        before.playlists.forEach { playlist ->
            playlist.entries.forEachIndexed { index, entry -> if (entry.episodeId in ids) {
                add(Change.AddEntry(playlist.id, entry.episodeId, Placement.Last))
                add(Change.MoveEntry(playlist.id, entry.episodeId, playlist.entries.getOrNull(index - 1)?.episodeId))
                add(Change.ReportPosition(playlist.id, entry.episodeId, entry.position, at))
            } }
            if (playlist.cursor in ids) add(Change.SetCursor(playlist.id, playlist.cursor))
        }
    }
}
