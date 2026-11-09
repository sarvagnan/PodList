package app.podlist.domain

object EpisodeActions {
    /** The first insert into an empty/past-end Playlist establishes its Cursor. */
    fun addMany(ids: List<String>, playlistId: String, placement: Placement, before: Playlist? = null): List<Change> {
        val unique = ids.distinct()
        val hasCursor = before?.entries?.any { it.episodeId == before.cursor } == true
        val order = if (placement != Placement.Next) unique else if (hasCursor) unique.asReversed() else unique.take(1) + unique.drop(1).asReversed()
        val operations = order.map { Change.AddEntry(playlistId, it, placement) }.toMutableList<Change>()
        var result = before ?: Playlist(playlistId, "", false, false, emptyList(), null, emptyList(), emptyList())
        order.forEach { result = PlaylistRules.addEntry(result, it, placement, 0) }
        // Moving the Cursor itself can change the insertion anchor. Keep the selected group in
        // displayed order without changing the per-Entry Positions or the resulting Cursor.
        if (result.entries.filter { it.episodeId in unique }.map { it.episodeId } != unique) {
            val first = result.entries.indexOfFirst { it.episodeId in unique }
            var anchor = result.entries.getOrNull(first - 1)?.episodeId
            unique.forEach { id -> operations += Change.MoveEntry(playlistId, id, anchor); anchor = id }
        }
        return operations
    }

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
