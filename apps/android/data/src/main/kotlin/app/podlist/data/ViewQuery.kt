package app.podlist.data

import app.podlist.domain.*

/** Parameters carry every user value; folded columns provide Mentions and SQLite provides binary ties. */
data class CompiledQuery(val sql: String, val params: List<Any?>)

object ViewQuery {
    private const val InEntry = "EXISTS (SELECT 1 FROM entry_index x WHERE x.episode_id = e.id)"
    private val whitespace = Regex("[\\s\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]+")
    private fun escapeLike(text: String) = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    fun compile(view: View, now: Long): CompiledQuery = compile(view.filter, view.sort, view.limit, now)

    fun compile(filter: ViewFilter, sort: ViewSort, limit: Long?, now: Long): CompiledQuery {
        val where = mutableListOf("(s.unsubscribed_at IS NULL OR COALESCE(st.starred, 0) = 1 OR $InEntry)")
        val params = mutableListOf<Any?>()
        when (val published = filter.published) {
            is PublishedFilter.LastDays -> { where += "e.published >= ?"; params += now - published.days * 86_400_000.0 }
            is PublishedFilter.Between -> {
                published.from?.let { where += "e.published >= ?"; params += it }
                published.to?.let { where += "e.published <= ?"; params += it }
            }
            null -> Unit
        }
        filter.podcasts?.let {
            val mode = if (it.mode == PodcastMode.Include) "IN" else "NOT IN"
            where += "e.subscription_id $mode (${it.subscriptionIds.joinToString(", ") { "?" }})"
            params.addAll(it.subscriptionIds)
        }
        filter.text?.let { text ->
            // ECMAScript whitespace, including BOM/NBSP. An empty word yields LIKE '%%'.
            val trimmed = text.replace(Regex("^${whitespace.pattern}|${whitespace.pattern}$"), "")
            for (word in trimmed.split(whitespace)) {
                where += "(e.title_folded LIKE ? ESCAPE '\\' OR e.description_folded LIKE ? ESCAPE '\\' OR s.title_folded LIKE ? ESCAPE '\\')"
                val pattern = "%${escapeLike(Mentions.fold(word))}%"
                params.addAll(listOf(pattern, pattern, pattern))
            }
        }
        when (filter.played) {
            PlayedFilter.Unplayed -> where += "st.played_at IS NULL"
            PlayedFilter.Played -> where += "st.played_at IS NOT NULL"
            PlayedFilter.InProgress -> where += "st.played_at IS NULL AND EXISTS (SELECT 1 FROM entry_index x WHERE x.episode_id = e.id AND x.position > 0)"
            null -> Unit
        }
        filter.starred?.let { where += "COALESCE(st.starred, 0) = ${if (it) 1 else 0}" }
        if (filter.notInAnyPlaylist == true) where += "NOT $InEntry"
        filter.minDuration?.let { where += "e.duration >= ?"; params += it }
        filter.maxDuration?.let { where += "e.duration <= ?"; params += it }
        val order = when (sort) {
            ViewSort.PublishedAsc -> "e.published ASC, e.id"
            ViewSort.PublishedDesc -> "e.published DESC, e.id"
            ViewSort.DurationAsc -> "e.duration ASC NULLS LAST, e.id"
            ViewSort.DurationDesc -> "e.duration DESC NULLS LAST, e.id"
        }
        var sql = """SELECT e.id, e.subscription_id, e.title, e.published, e.duration, e.artwork_url,
            s.title AS podcast, s.artwork_url AS podcast_artwork_url, s.website_url AS podcast_website_url, s.feed_url AS feed_url,
            st.played_at, COALESCE(st.starred, 0) AS starred
            FROM episode e JOIN subscription s ON s.id = e.subscription_id
            LEFT JOIN episode_state st ON st.episode_id = e.id
            WHERE ${where.joinToString("\nAND ")}
            ORDER BY $order""".trimIndent()
        if (limit != null) { sql += "\nLIMIT ?"; params += limit }
        return CompiledQuery(sql, params)
    }
}
