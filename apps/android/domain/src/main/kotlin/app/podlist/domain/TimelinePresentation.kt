package app.podlist.domain

/** Readable stretches, finishes and deliberate edits. Equal-time events keep reverse arrival order. */
data class TimelineEvent(val kind: String, val episodeId: String, val at: Long, val end: Long = at, val from: Double = 0.0, val to: Double = from) {
    val moment: Long get() = if (kind == "finished") at - 1 else at
}

data class RewindPreview(val cursor: String?, val position: Double, val unplayed: List<String>, val restored: List<String>)

object TimelinePresentation {
    /** Compare the displayed Positions too: subsecond stretches must not read 12:34–12:34. */
    fun positionLabel(from: String, to: String): String = if (from == to) from else "$from–$to"

    fun events(playlist: Playlist): List<TimelineEvent> {
        val events = mutableListOf<TimelineEvent>()
        var run: TimelineEvent? = null
        for (point in playlist.timeline) {
            val current = run
            if (current != null && current.episodeId == point.episodeId && point.at - current.end <= 600_000) {
                run = current.copy(end = point.at, to = point.position)
            } else {
                current?.let(events::add)
                run = TimelineEvent("listened", point.episodeId, point.at, from = point.position)
            }
        }
        run?.let(events::add)
        events += playlist.history.map { TimelineEvent("finished", it.episodeId, it.finishedAt) }
        events += playlist.edits.orEmpty().distinctBy { Triple(it.kind, it.episodeId, it.at) }.map { TimelineEvent(it.kind, it.episodeId, it.at) }
        return events.withIndex().sortedWith(compareByDescending<IndexedValue<TimelineEvent>> { it.value.at }.thenByDescending { it.index }).map { it.value }
    }

    fun preview(before: State, playlistId: String, to: Long, at: Long): RewindPreview? {
        val was = before.playlists.find { it.id == playlistId } ?: return null
        if (TimelineRules.pointAt(was, to) == null) return null
        val after = Rewind.apply(before, playlistId, to, at)
        val now = after.playlists.first { it.id == playlistId }
        return RewindPreview(now.cursor, now.entries.find { it.episodeId == now.cursor }?.position ?: 0.0,
            before.episodeStates.keys.filter { before.episodeStates[it]?.played != null && after.episodeStates[it]?.played == null },
            now.entries.map { it.episodeId }.filter { id -> was.entries.none { it.episodeId == id } })
    }

    /** Same protocol operations as the web client; never replaces a snapshot or subtracts Listening. */
    fun undo(before: State, after: State, playlistId: String, at: Long): List<Change> {
        val was = before.playlists.find { it.id == playlistId } ?: return emptyList()
        val now = after.playlists.find { it.id == playlistId } ?: return emptyList()
        return buildList {
            for (entry in was.entries) if (now.entries.any { it.episodeId == entry.episodeId && it.position != entry.position })
                add(Change.ReportPosition(playlistId, entry.episodeId, entry.position, at))
            add(Change.SetCursor(playlistId, was.cursor))
            for ((id, fact) in before.episodeStates) if (fact.played != null && after.episodeStates[id]?.played == null)
                add(Change.MarkPlayed(id, fact.played.source))
            for (entry in now.entries) if (was.entries.none { it.episodeId == entry.episodeId }) add(Change.RemoveEntry(playlistId, entry.episodeId))
        }
    }
}
