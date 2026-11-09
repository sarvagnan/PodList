package app.podlist

import app.podlist.data.*
import app.podlist.domain.*

internal data class ScreenData(val state: State, val subscriptions: List<Row>, val episodes: List<Row>, val hasState: Boolean, val hasLibrary: Boolean)

/** One consistent local read. Saved Views always execute the shared compiler, never a cached id list. */
internal fun readScreen(db: LocalDatabase, route: String?): ScreenData = db.transaction {
    val state = loadState()
    val subscriptions = query("SELECT s.*, (SELECT count(*) FROM episode e WHERE e.subscription_id = s.id) AS episode_count FROM subscription s ORDER BY s.title COLLATE NOCASE, s.id")
    val id = route?.substringAfter(':', "")
    val episodes = when {
        route?.startsWith("view:") == true -> state.views.find { it.id == id }?.let { evaluate(it, System.currentTimeMillis()) }.orEmpty()
        route?.startsWith("subscription:") == true -> evaluate(View("subscription", "", ViewFilter(podcasts = PodcastFilter(PodcastMode.Include, listOf(id!!))), ViewSort.PublishedDesc, null), System.currentTimeMillis())
        route?.startsWith("playlist:") == true -> {
            val playlist = state.playlists.find { it.id == id }
            val ids = (playlist?.entries.orEmpty().map { it.episodeId } + playlist?.history.orEmpty().map { it.episodeId } + playlist?.timeline.orEmpty().map { it.episodeId }).distinct()
            ids.chunked(500).flatMap { chunk -> episodeRows(chunk) }
        }
        route?.startsWith("episode:") == true -> episodeRows(listOf(id!!))
        else -> emptyList()
    }
    ScreenData(state, subscriptions, episodes, getMeta("starterViewsMade") != null || getMeta("userCursor") != null, getMeta("starterViewsMade") != null || getMeta("catalogueCursor") != null)
}

private fun LocalDatabase.episodeRows(ids: List<String>): List<Row> = query("""
    SELECT e.*, s.title AS podcast, s.artwork_url AS podcast_artwork_url,
      st.played_at, COALESCE(st.starred, 0) AS starred
    FROM episode e JOIN subscription s ON s.id = e.subscription_id
    LEFT JOIN episode_state st ON st.episode_id = e.id
    WHERE e.id IN (${ids.joinToString(",") { "?" }})
""".trimIndent(), ids)
