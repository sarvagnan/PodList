package app.podlist

import app.podlist.data.*
import app.podlist.domain.*

internal data class ScreenData(val state: State, val subscriptions: List<Row>, val episodes: List<Row>, val hasState: Boolean, val hasLibrary: Boolean, val gettingStarted: Boolean = false, val gettingStartedSteps: Int = 0)

/** One consistent local read. Saved Views always execute the shared compiler, never a cached id list. */
internal fun readScreen(db: LocalDatabase, route: String?): ScreenData = db.transaction {
    initializeGettingStarted()
    updateGettingStartedProgress()
    val state = loadState()
    val subscriptionRows = query("SELECT s.*, f.failures AS refresh_failures, f.checked_at AS refresh_checked_at, (SELECT count(*) FROM episode e WHERE e.subscription_id = s.id) AS episode_count FROM subscription s LEFT JOIN feed_state f ON f.subscription_id = s.id ORDER BY s.title COLLATE NOCASE, s.id")
    val overrides = pendingSubscriptionOverrides()
    val subscriptions = subscriptionRows.map { original ->
        val row = original + ("refreshed_at" to getMeta("feedRefreshed:${original["id"]}")?.toLongOrNull())
        overrides.lastOrNull { it.subscriptionId == row["id"] }?.let {
        row + mapOf("playback_settings" to ProtocolJson.encodeToString(PlaybackSettingsOverride.serializer(), it.playbackSettings), "played_threshold" to it.playedThreshold)
    } ?: row }
    val id = route?.substringAfter(':', "")
    val episodes = when {
        route?.startsWith("view:") == true -> state.views.find { it.id == id }?.let { evaluate(it, System.currentTimeMillis()) }.orEmpty()
        route?.startsWith("subscription:") == true -> podcastEpisodes(id!!)
        (route?.startsWith("playlist:") == true || route?.startsWith("playlist-settings:") == true) -> {
            val playlist = state.playlists.find { it.id == id }
            val ids = (playlist?.entries.orEmpty().map { it.episodeId } + playlist?.history.orEmpty().map { it.episodeId } + playlist?.timeline.orEmpty().map { it.episodeId } + playlist?.edits.orEmpty().map { it.episodeId }).distinct()
            ids.chunked(500).flatMap { chunk -> episodeRows(chunk) }
        }
        route == "listening-stats" -> query("SELECT id FROM episode")
        route?.startsWith("episode:") == true -> episodeRows(listOf(id!!))
        else -> emptyList()
    }
    ScreenData(state, subscriptions, episodes, getMeta("starterViewsMade") != null || getMeta("userCursor") != null, getMeta("starterViewsMade") != null || getMeta("catalogueCursor") != null, getMeta("gettingStartedBegun") == "true" && getMeta("gettingStartedHidden") != "true", getMeta("gettingStartedSteps")?.toIntOrNull() ?: 0)
}

private fun LocalDatabase.episodeRows(ids: List<String>): List<Row> = query("""
    SELECT e.*, s.title AS podcast, s.artwork_url AS podcast_artwork_url,
      st.played_at, COALESCE(st.starred, 0) AS starred
    FROM episode e JOIN subscription s ON s.id = e.subscription_id
    LEFT JOIN episode_state st ON st.episode_id = e.id
    WHERE e.id IN (${ids.joinToString(",") { "?" }})
""".trimIndent(), ids)
