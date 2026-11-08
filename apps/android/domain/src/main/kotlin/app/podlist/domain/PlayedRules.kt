package app.podlist.domain

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

object PlayedRules {
    const val DefaultPlayedThreshold = 30.0
    const val HistoryLimit = 500

    fun isFinished(position: Double, duration: Double?, threshold: Double?): Boolean =
        duration != null && position >= maxOf(0.0, duration - (threshold ?: DefaultPlayedThreshold))

    fun onPlayed(playlist: Playlist, episodeId: String, finishedHere: Boolean, at: Long): Playlist {
        val index = playlist.entries.indexOfFirst { it.episodeId == episodeId }
        if (index == -1) return playlist
        var next = playlist
        if (finishedHere) {
            val following = playlist.entries.getOrNull(index + 1)?.episodeId
            next = next.copy(history = (listOf(HistoryItem(episodeId, at,
                following?.let(::JsonPrimitive) ?: JsonNull)) + playlist.history).take(HistoryLimit))
            if (!playlist.clearOnPlayed) {
                next = next.copy(
                    entries = next.entries.map { if (it.episodeId == episodeId) it.copy(position = 0.0, positionAt = at) else it },
                    cursor = if (next.cursor == episodeId) following else next.cursor
                )
            }
        }
        return if (playlist.clearOnPlayed) PlaylistRules.removeEntry(next, episodeId) else next
    }
}
