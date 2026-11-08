package app.podlist.domain

object Rewind {
    fun apply(state: State, playlistId: String, to: Long, at: Long): State {
        val playlist = state.playlists.find { it.id == playlistId } ?: return state
        val point = TimelineRules.pointAt(playlist, to) ?: return state
        val finished = playlist.history.filter { it.finishedAt > to }.reversed()
        var episodeStates = state.episodeStates
        for (history in finished) {
            val fact = episodeStates[history.episodeId]
            val played = fact?.played
            if (played != null && (played.source as? PlayedSource.Playback)?.playlistId == playlistId && played.at > to) {
                episodeStates = StateRules.episodeFacts(state.copy(episodeStates = episodeStates), history.episodeId, null, fact?.starred ?: false)
            }
        }
        val entries = playlist.entries.toMutableList()
        fun restore(episodeId: String, followedBy: String?) {
            if (entries.any { it.episodeId == episodeId }) return
            val following = entries.indexOfFirst { it.episodeId == followedBy }
            val cursor = entries.indexOfFirst { it.episodeId == playlist.cursor }
            val anchor = if (following >= 0) following else if (cursor >= 0) cursor else entries.size
            entries.add(anchor, Entry(episodeId, 0.0, at))
        }
        for (history in finished.reversed()) restore(history.episodeId, history.followingId())
        restore(point.episodeId, null)
        val movedSince = playlist.timeline.filter { it.at > to }.map { it.episodeId }.toSet()
        val restored = entries.map { entry ->
            when {
                entry.episodeId == point.episodeId -> entry.copy(position = point.position, positionAt = at)
                entry.episodeId in movedSince -> entry.copy(position = playlist.timeline.lastOrNull {
                    it.episodeId == entry.episodeId && it.at <= to
                }?.position ?: 0.0, positionAt = at)
                else -> entry
            }
        }
        return state.copy(episodeStates = episodeStates, playlists = state.playlists.map {
            if (it.id == playlistId) playlist.copy(entries = restored, cursor = point.episodeId,
                history = playlist.history.filter { history -> history.finishedAt <= to }) else it
        })
    }
}
