package app.podlist.domain

import kotlin.math.abs

object TimelineRules {
    const val RetentionMillis = 30L * 86_400_000
    const val SpacingMillis = 60_000L
    const val EditLimit = 300

    fun record(playlist: Playlist, episodeId: String, position: Double, at: Long): Playlist {
        val newest = maxOf(at, playlist.timeline.maxOfOrNull { it.at } ?: at)
        if (at < newest - RetentionMillis) return playlist
        if (playlist.timeline.any { it.episodeId == episodeId && abs(it.at - at) < SpacingMillis }) return playlist
        return playlist.copy(timeline = (playlist.timeline.filter { it.at >= newest - RetentionMillis } +
            TimelinePoint(at, episodeId, position)).sortedBy { it.at })
    }

    fun pointAt(playlist: Playlist, to: Long): TimelinePoint? = playlist.timeline.lastOrNull { it.at <= to }

    fun recordEdit(playlist: Playlist, kind: String, episodeId: String, at: Long): Playlist = playlist.copy(
        edits = ((playlist.edits ?: emptyList()) + PlaylistEdit(at, kind, episodeId))
            .filter { it.at >= at - RetentionMillis }.sortedBy { it.at }.takeLast(EditLimit)
    )
}
