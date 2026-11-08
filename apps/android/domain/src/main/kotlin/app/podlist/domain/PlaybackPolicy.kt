package app.podlist.domain

sealed interface SleepTimer {
    data class Until(val elapsedRealtimeMillis: Long) : SleepTimer
    data class ChapterEnd(val position: Double) : SleepTimer
    data object EpisodeEnd : SleepTimer
}
data class PlaybackTarget(val playlist: Playlist, val entry: Entry)

enum class PlaybackBoundary { Continue, Sleep, Advance }

/** Native playback decisions. Clocks, audio, files and durable Operations are adapter boundaries. */
object PlaybackPolicy {
    fun target(state: State): PlaybackTarget? {
        val playlist = state.playlists.find { it.id == state.activePlaylistId } ?: return null
        val entry = playlist.entries.find { it.episodeId == playlist.cursor } ?: return null
        return PlaybackTarget(playlist, entry)
    }
    fun startPosition(position: Double, duration: Double?, skipIntro: Double): Double =
        if (skipIntro > 0 && position < skipIntro && (duration == null || duration > skipIntro)) skipIntro else position

    fun boundary(position: Double, duration: Double?, skipOutro: Double, ended: Boolean, sleep: SleepTimer?, elapsedMillis: Long): PlaybackBoundary {
        val end = ended || (skipOutro > 0 && duration != null && position >= duration - skipOutro)
        if (sleep is SleepTimer.Until && elapsedMillis >= sleep.elapsedRealtimeMillis ||
            sleep is SleepTimer.ChapterEnd && position >= sleep.position || sleep == SleepTimer.EpisodeEnd && end) return PlaybackBoundary.Sleep
        return if (end) PlaybackBoundary.Advance else PlaybackBoundary.Continue
    }
    fun holdLoaded(playing: Boolean, finished: Boolean, ended: Boolean) = playing || (finished && !ended)
    fun sources(stored: String?, host: String?, proxy: String): List<String> = if (stored != null) listOf(stored) else listOfNotNull(host, proxy).distinct()
    fun settings(global: PlaybackSettings, override: PlaybackSettingsOverride) = PlaybackSettings(
        override.speed ?: global.speed, override.skipIntro ?: global.skipIntro, override.skipOutro ?: global.skipOutro, override.volumeBoost ?: global.volumeBoost
    )
    fun chapterIndex(chapters: List<Chapter>, position: Double) = chapters.indexOfLast { it.start <= position }
    fun artwork(chapters: List<Chapter>, position: Double, episode: String?, podcast: String?): String? =
        chapters.getOrNull(chapterIndex(chapters, position))?.artwork?.url ?: episode ?: podcast
    fun chapterSleep(chapters: List<Chapter>, position: Double): SleepTimer =
        chapters.firstOrNull { it.start > position }?.let { SleepTimer.ChapterEnd(it.start) } ?: SleepTimer.EpisodeEnd
}
