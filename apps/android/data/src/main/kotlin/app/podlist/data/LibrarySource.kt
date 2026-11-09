package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import java.net.URLEncoder
import java.security.MessageDigest
import java.util.UUID

/** One boundary for everything a server ordinarily supplies. State edits always use the local DB. */
interface LibrarySource {
    val key: String
    val server: ServerAddress?
    fun refresh()
    fun search(query: String): List<DirectoryResult>
    fun readPodcast(feedUrl: String): ParsedFeed
    fun bringEpisode(feedUrl: String, guid: String): String
    fun subscribe(feedUrl: String): Subscription
    fun unsubscribe(id: String)
    fun chapters(episodeId: String): List<Chapter>
    fun artwork(url: String, size: Int): String
    fun importOpml(xml: String): ImportSummary
    fun exportOpml(): String
    fun audioFallback(episodeId: String): String?
}
class ServerLibrary(private val db: LocalDatabase, override val server: ServerAddress, private val http: SyncTransport = HttpTransport(server), onFailure: (Exception) -> Unit = {}) : LibrarySource {
    private val sync = SyncClient(db, http, onFailure)
    override val key = server.origin
    override fun refresh() = sync.sync()
    override fun search(query: String): List<DirectoryResult> = ProtocolJson.decodeFromString(http.request("GET", "/api/directory/search?q=${URLEncoder.encode(query, "UTF-8")}", null))
    override fun readPodcast(feedUrl: String): ParsedFeed = ProtocolJson.decodeFromString(http.request("POST", "/api/podcasts/read", ProtocolJson.encodeToString(mapOf("feedUrl" to feedUrl))))
    override fun bringEpisode(feedUrl: String, guid: String): String {
        val result = ProtocolJson.decodeFromString<BroughtEpisode>(http.request("POST", "/api/podcasts/episodes", ProtocolJson.encodeToString(mapOf("feedUrl" to feedUrl, "guid" to guid))))
        // Use the ordinary catalogue path before any Entry operation can refer to this id.
        sync.sync()
        check(db.query("SELECT id FROM episode WHERE id = ?", listOf(result.episodeId)).isNotEmpty())
        return result.episodeId
    }
    override fun subscribe(feedUrl: String): Subscription = ProtocolJson.decodeFromString<Subscription>(http.request("POST", "/api/subscriptions", ProtocolJson.encodeToString(mapOf("feedUrl" to feedUrl)))).also {
        db.upsertLibrary(listOf(it), emptyList()); db.notifyChanged()
    }
    override fun unsubscribe(id: String) {
        val subscription = ProtocolJson.decodeFromString<Subscription>(http.request("DELETE", "/api/subscriptions/${URLEncoder.encode(id, "UTF-8")}", null))
        db.upsertLibrary(listOf(subscription), emptyList()); db.notifyChanged()
    }
    override fun importOpml(xml: String): ImportSummary = ProtocolJson.decodeFromString(http.request("POST", "/api/subscriptions/import", ProtocolJson.encodeToString(mapOf("opml" to xml))))
    override fun exportOpml(): String = http.request("GET", "/api/subscriptions/export", null)
    override fun chapters(episodeId: String): List<Chapter> {
        val chapters = ProtocolJson.decodeFromString<List<Chapter>>(http.request("GET", episodePath(episodeId) + "/chapters", null))
        db.execute("UPDATE episode SET chapters = ?, chapters_fetched_at = ? WHERE id = ?", listOf(ProtocolJson.encodeToString(chapters), System.currentTimeMillis(), episodeId))
        db.notifyChanged()
        return chapters
    }
    override fun artwork(url: String, size: Int) = server.artwork(url, size)
    override fun audioFallback(episodeId: String) = server.audio(episodeId)
}

class DeviceLibrary(private val db: LocalDatabase, private val http: PublisherTransport = PublisherHttp(), private val now: () -> Long = System::currentTimeMillis) : LibrarySource {
    override val key = "standalone"
    override val server: ServerAddress? = null
    private val lock = Any()
    override fun artwork(url: String, size: Int) = url
    override fun audioFallback(episodeId: String): String? = null
    override fun search(query: String) = PodcastDirectory(http).search(query)
    private fun subscription(id: String): Subscription {
        val s = db.query("SELECT * FROM subscription WHERE id = ?", listOf(id)).single()
        return Subscription(id, s["feed_url"] as String, s["title"] as String, s["author"] as? String, s["description"] as? String,
            (s["artwork_url"] as? String)?.let(::Artwork), (s["subscribed_at"] as Number).toLong(), (s["unsubscribed_at"] as? Number)?.toLong(),
            (s["played_threshold"] as? Number)?.toDouble(), ProtocolJson.decodeFromString(s["playback_settings"] as String))
    }
    override fun readPodcast(feedUrl: String): ParsedFeed {
        val response = http.get(feedUrl, mapOf("Accept" to "application/rss+xml, application/xml, text/xml"))
        if (response.status !in 200..299) throw HttpFailure(response.status)
        return readPodcastFeed(response.body)
    }
    override fun bringEpisode(feedUrl: String, guid: String): String = synchronized(lock) {
        db.query("SELECT e.id FROM episode e JOIN subscription s ON s.id = e.subscription_id WHERE s.feed_url = ? AND e.guid = ?", listOf(feedUrl, guid)).firstOrNull()?.let { return@synchronized it["id"] as String }
        val feed = readPodcast(feedUrl)
        val episode = feed.episodes.find { it.guid == guid } ?: throw IllegalArgumentException("Episode is no longer in this feed")
        val id = db.transaction {
            execute("""INSERT INTO subscription (id, feed_url, title, title_folded, author, description, artwork_url, subscribed_at, unsubscribed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(feed_url) DO NOTHING""",
                listOf("sub_${UUID.randomUUID()}", feedUrl, feed.title, Mentions.fold(feed.title), feed.author, feed.description, feed.artworkUrl, now(), now()))
            val subscriptionId = query("SELECT id FROM subscription WHERE feed_url = ?", listOf(feedUrl)).single()["id"] as String
            // Match only the feed/guid identity. A one-Episode subset cannot decide that a guid changed.
            execute("""INSERT INTO episode (id, subscription_id, guid, title, title_folded, description, description_folded, published, duration, audio_url, artwork_url, chapters_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(subscription_id, guid) DO NOTHING""",
                listOf("ep_${UUID.randomUUID()}", subscriptionId, episode.guid, episode.title, Mentions.fold(episode.title), episode.description,
                    Mentions.fold(episode.description), episode.published, episode.duration, episode.audioUrl, episode.artworkUrl, episode.chaptersUrl))
            query("SELECT id FROM episode WHERE subscription_id = ? AND guid = ?", listOf(subscriptionId, guid)).single()["id"] as String
        }
        db.notifyChanged()
        id
    }
    override fun subscribe(feedUrl: String): Subscription = synchronized(lock) {
        db.query("SELECT id, unsubscribed_at FROM subscription WHERE feed_url = ?", listOf(feedUrl)).firstOrNull()?.let {
            val id = it["id"] as String
            if (it["unsubscribed_at"] != null && db.query("SELECT subscription_id FROM feed_state WHERE subscription_id = ?", listOf(id)).isEmpty()) {
                val feed = readPodcast(feedUrl)
                db.transaction { store(id, feed); remember(id, PublisherResponse(200, "")) }
            }
            db.execute("UPDATE subscription SET unsubscribed_at = NULL WHERE id = ?", listOf(id))
            db.notifyChanged()
            return@synchronized subscription(id)
        }
        val response = http.get(feedUrl, mapOf("Accept" to "application/rss+xml, application/xml, text/xml"))
        if (response.status !in 200..299) throw HttpFailure(response.status)
        val feed = readPodcastFeed(response.body)
        val id = "sub_${UUID.randomUUID()}"
        db.transaction {
            execute("INSERT INTO subscription (id, feed_url, title, title_folded, subscribed_at) VALUES (?, ?, ?, ?, ?)", listOf(id, feedUrl, feed.title, Mentions.fold(feed.title), now()))
            store(id, feed)
            remember(id, response)
        }
        db.notifyChanged()
        subscription(id)
    }
    override fun unsubscribe(id: String) = synchronized(lock) {
        subscription(id) // Missing ids fail before changing anything.
        db.execute("UPDATE subscription SET unsubscribed_at = coalesce(unsubscribed_at, ?) WHERE id = ?", listOf(now(), id))
        db.notifyChanged()
    }
    fun subscriptions() = db.query("SELECT id FROM subscription ORDER BY title").map { subscription(it["id"] as String) }
    override fun importOpml(xml: String): ImportSummary {
        val urls = Opml.parse(xml)
        val known = subscriptions().filter { it.unsubscribedAt == null }.map { it.feedUrl }.toSet()
        val failures = urls.filterNot { it in known }.mapNotNull { url ->
            try { subscribe(url); null } catch (e: Exception) { ImportFailure(url, error = classifyLookup(e)) }
        }
        return ImportSummary(urls.count { it !in known } - failures.size, urls.count { it in known }, failures)
    }
    override fun exportOpml() = Opml.generate(subscriptions())
    override fun refresh() {
        val rows = db.query("SELECT s.id, f.checked_at, f.failures FROM subscription s LEFT JOIN feed_state f ON f.subscription_id = s.id WHERE s.unsubscribed_at IS NULL")
        for (row in rows) {
            val failures = (row["failures"] as? Number)?.toInt() ?: 0
            val checked = (row["checked_at"] as? Number)?.toLong()
            if (checked != null && now() < checked + backoffMillis(failures)) continue
            runCatching { refreshOne(row["id"] as String) }
        }
    }
    fun refreshOne(id: String) = synchronized(lock) {
        val sub = subscription(id)
        try {
            val state = db.query("SELECT * FROM feed_state WHERE subscription_id = ?", listOf(id)).firstOrNull()
            val headers = mutableMapOf("Accept" to "application/rss+xml, application/xml, text/xml")
            (state?.get("etag") as? String)?.let { headers["If-None-Match"] = it }
            (state?.get("last_modified") as? String)?.let { headers["If-Modified-Since"] = it }
            val response = http.get(sub.feedUrl, headers)
            if (response.status == 304) remember(id, PublisherResponse(304, "", state?.get("etag") as? String, state?.get("last_modified") as? String))
            else {
                if (response.status !in 200..299) throw HttpFailure(response.status)
                val feed = readPodcastFeed(response.body)
                db.transaction { store(id, feed); remember(id, response) }
                db.notifyChanged()
            }
        } catch (e: Exception) {
            db.execute("""INSERT INTO feed_state (subscription_id, checked_at, failures, last_error) VALUES (?, ?, 1, ?)
                ON CONFLICT(subscription_id) DO UPDATE SET checked_at = excluded.checked_at, failures = feed_state.failures + 1, last_error = excluded.last_error""", listOf(id, now(), e.message))
            throw e
        }
    }
    private fun remember(id: String, response: PublisherResponse) {
        db.setMeta("feedRefreshed:$id", now().toString())
        db.execute("""INSERT INTO feed_state (subscription_id, etag, last_modified, checked_at, failures) VALUES (?, ?, ?, ?, 0)
        ON CONFLICT(subscription_id) DO UPDATE SET etag = excluded.etag, last_modified = excluded.last_modified, checked_at = excluded.checked_at, failures = 0, last_error = NULL""", listOf(id, response.etag, response.lastModified, now()))
    }
    private fun store(id: String, feed: ParsedFeed) {
        db.execute("UPDATE subscription SET title = ?, title_folded = ?, author = ?, description = ?, artwork_url = ? WHERE id = ?", listOf(feed.title, Mentions.fold(feed.title), feed.author, feed.description, feed.artworkUrl, id))
        val guids = feed.episodes.map { it.guid }.toSet()
        for (e in feed.episodes) {
            val existing = db.query("SELECT * FROM episode WHERE subscription_id = ? AND guid = ?", listOf(id, e.guid)).firstOrNull()
                ?: db.query("SELECT * FROM episode WHERE subscription_id = ? AND (audio_url = ? OR (title = ? AND published = ?))", listOf(id, e.audioUrl, e.title, e.published)).filter { it["guid"] !in guids }.singleOrNull()
            val episodeId = existing?.get("id") as? String ?: "ep_" + MessageDigest.getInstance("SHA-256").digest("$id\n${e.guid}".toByteArray()).joinToString("") { "%02x".format(it) }.take(24)
            val replaced = (existing?.get("duration") as? Number)?.toDouble()?.let { old -> e.duration?.let { kotlin.math.abs(old - it) > 30 } } == true
            val resetChapters = replaced || existing?.get("chapters_url") != e.chaptersUrl
            db.execute("""INSERT INTO episode (id, subscription_id, guid, title, title_folded, description, description_folded, published, duration, audio_url, artwork_url, chapters_url, audio_updated_at, chapters_fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET guid = excluded.guid, title = excluded.title, title_folded = excluded.title_folded,
                description = excluded.description, description_folded = excluded.description_folded, published = excluded.published, duration = excluded.duration, audio_url = excluded.audio_url,
                artwork_url = excluded.artwork_url, chapters_url = excluded.chapters_url, audio_updated_at = excluded.audio_updated_at, chapters_fetched_at = excluded.chapters_fetched_at""",
                listOf(episodeId, id, e.guid, e.title, Mentions.fold(e.title), e.description, Mentions.fold(e.description), e.published, e.duration, e.audioUrl, e.artworkUrl, e.chaptersUrl,
                    if (replaced) now() else existing?.get("audio_updated_at"), if (resetChapters) null else existing?.get("chapters_fetched_at")))
        }
    }
    override fun chapters(episodeId: String): List<Chapter> = synchronized(lock) {
        val row = db.query("SELECT chapters, chapters_url, chapters_fetched_at, audio_url FROM episode WHERE id = ?", listOf(episodeId)).single()
        if (row["chapters_fetched_at"] != null) return@synchronized ProtocolJson.decodeFromString(row["chapters"] as String)
        val url = row["chapters_url"] as? String
        // A phone is often offline at first play, so only a completed lookup is remembered.
        var failed = false
        val fromJson = if (url == null) emptyList() else runCatching {
            val response = http.get(url, mapOf("Accept" to "application/json"))
            require(response.status in 200..299)
            jsonChapters(response.body)
        }.getOrElse { failed = true; emptyList() }
        val chapters = fromJson.ifEmpty {
            runCatching {
                val response = http.get(row["audio_url"] as String, mapOf("Range" to "bytes=0-${Id3ProbeBytes - 1}"))
                require(response.status in 200..299)
                id3Chapters(response.bytes ?: byteArrayOf())
            }.getOrElse { failed = true; emptyList() }
        }
        if (failed) return@synchronized chapters
        db.execute("UPDATE episode SET chapters = ?, chapters_fetched_at = ? WHERE id = ?", listOf(ProtocolJson.encodeToString(chapters), now(), episodeId))
        db.notifyChanged()
        chapters
    }
    companion object {
        const val PollMillis = 30 * 60 * 1000L
        fun backoffMillis(failures: Int): Long = if (failures <= 0) 0 else (PollMillis * (1L shl (failures - 1).coerceAtMost(6))).coerceAtMost(24 * 60 * 60 * 1000L)
    }
}
