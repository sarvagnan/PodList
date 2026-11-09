package app.podlist.data

import kotlinx.serialization.Serializable
import java.util.Locale

@Serializable data class BroughtEpisode(val subscriptionId: String, val episodeId: String)

fun podcastIsSubscribed(subscription: Row?): Boolean = subscription != null && subscription["unsubscribed_at"] == null

/** Local rows include retained Episodes even after Unsubscribe, regardless of Library visibility. */
fun LocalDatabase.podcastEpisodes(subscriptionId: String): List<Row> = query("""
    SELECT e.*, s.title AS podcast, s.artwork_url AS podcast_artwork_url, st.played_at, COALESCE(st.starred, 0) AS starred
    FROM episode e JOIN subscription s ON s.id = e.subscription_id
    LEFT JOIN episode_state st ON st.episode_id = e.id
    WHERE s.id = ? ORDER BY e.published DESC, e.id
""".trimIndent(), listOf(subscriptionId))

fun podcastEpisodeRows(feed: ParsedFeed): List<Row> = feed.episodes.distinctBy { it.guid }.sortedByDescending { it.published }.map { e -> mapOf(
    "id" to "podcast:${e.guid}", "guid" to e.guid, "title" to e.title, "description" to e.description,
    "published" to e.published, "duration" to e.duration, "artwork_url" to e.artworkUrl,
    "podcast" to feed.title, "podcast_artwork_url" to feed.artworkUrl
) }

fun filterPodcastEpisodes(rows: List<Row>, query: String): List<Row> {
    val text = query.trim().lowercase(Locale.ROOT)
    return if (text.isEmpty()) rows else rows.filter {
        (it["title"] as? String).orEmpty().lowercase(Locale.ROOT).contains(text) ||
            (it["description"] as? String).orEmpty().lowercase(Locale.ROOT).contains(text)
    }
}

data class PodcastEpisodeCount(val shown: Int, val total: Int, val filtered: Boolean)
fun podcastEpisodeCount(rows: List<Row>, query: String) = PodcastEpisodeCount(filterPodcastEpisodes(rows, query).size, rows.size, query.isNotBlank())
