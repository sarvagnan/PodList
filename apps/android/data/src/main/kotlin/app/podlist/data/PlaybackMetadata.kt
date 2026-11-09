package app.podlist.data

import app.podlist.domain.*
import java.net.URLEncoder

data class PlaybackMetadata(
    val episodeId: String, val subscriptionId: String?, val title: String?, val podcast: String?,
    val audioUrl: String?, val duration: Double?, val episodeArtwork: String?, val podcastArtwork: String?,
    val chapters: List<Chapter>, val override: PlaybackSettingsOverride, val playedThreshold: Double?
)

fun LocalDatabase.playbackMetadata(episodeId: String): PlaybackMetadata = transaction {
    val row = query("""SELECT e.*, s.title AS podcast, s.artwork_url AS podcast_artwork,
        s.playback_settings, s.played_threshold FROM episode e JOIN subscription s ON s.id = e.subscription_id WHERE e.id = ?""", listOf(episodeId)).firstOrNull()
    val pending = pendingSubscriptionOverrides().lastOrNull { it.subscriptionId == row?.get("subscription_id") }
    PlaybackMetadata(episodeId, row?.get("subscription_id") as? String, row?.get("title") as? String, row?.get("podcast") as? String,
        row?.get("audio_url") as? String, (row?.get("duration") as? Number)?.toDouble(), row?.get("artwork_url") as? String, row?.get("podcast_artwork") as? String,
        (row?.get("chapters") as? String)?.let { ProtocolJson.decodeFromString<List<Chapter>>(it) }.orEmpty(),
        pending?.playbackSettings ?: (row?.get("playback_settings") as? String)?.let { ProtocolJson.decodeFromString<PlaybackSettingsOverride>(it) } ?: PlaybackSettingsOverride(),
        if (pending != null) pending.playedThreshold else (row?.get("played_threshold") as? Number)?.toDouble())
}

fun episodePath(episodeId: String) = "/api/episodes/${URLEncoder.encode(episodeId, "UTF-8").replace("+", "%20")}" 
fun ServerAddress.audio(episodeId: String) = origin + episodePath(episodeId) + "/audio"

fun LocalDatabase.downloadPlan(deviceId: String, now: Long): DownloadPlan = transaction {
    val state = loadState()
    val entries = state.playlists.flatMap { it.entries }.map { it.episodeId }.toSet()
    val episodes = query("SELECT id, subscription_id, published FROM episode").map {
        val id = it["id"] as String
        DownloadEpisode(id, it["subscription_id"] as String, (it["published"] as Number).toLong(), id in entries, state.episodeStates[id]?.played != null, state.episodeStates[id]?.starred == true)
    }.toMutableList()
    val stored = query("SELECT episode_id, manual FROM download").map { StoredDownload(it["episode_id"] as String, (it["manual"] as Number).toInt() == 1) }
    stored.filter { s -> episodes.none { it.id == s.episodeId } }.forEach {
        episodes += DownloadEpisode(it.episodeId, "", 0, it.episodeId in entries, state.episodeStates[it.episodeId]?.played != null, state.episodeStates[it.episodeId]?.starred == true)
    }
    val legacyRows = query("SELECT key, value FROM sync_meta WHERE key LIKE 'ruleSince:%'")
    val legacy = legacyRows.associate { (it["key"] as String).removePrefix("ruleSince:") to (it["value"] as String).toLong() }
    val plan = DownloadPlanner.plan(deviceId, state.downloadRules, episodes, stored, legacy, now)
    for (row in legacyRows) execute("DELETE FROM sync_meta WHERE key = ?", listOf(row["key"]))
    plan.legacySince.forEach { (subscription, since) -> setMeta("ruleSince:$subscription", since.toString()) }
    plan
}

/** Podcasting 2.0 Chapter JSON: hidden entries are omitted; starts clamp to zero and sort. */
fun jsonChapters(body: String): List<Chapter> {
    val root = ProtocolJson.parseToJsonElement(body) as kotlinx.serialization.json.JsonObject
    val rows = root["chapters"] as kotlinx.serialization.json.JsonArray
    return rows.mapNotNull { value ->
        val row = value as kotlinx.serialization.json.JsonObject
        fun text(key: String) = (row[key] as? kotlinx.serialization.json.JsonPrimitive)?.takeUnless { it is kotlinx.serialization.json.JsonNull }?.content
        if (text("toc") == "false") return@mapNotNull null
        val start = requireNotNull(text("startTime")?.toDoubleOrNull()).also { require(it.isFinite()) }
        Chapter(start.coerceAtLeast(0.0), text("title") ?: "", text("img")?.let(::Artwork), text("url"))
    }.sortedBy { it.start }
}

/** Server overrides are metadata intentions, projected locally until their outbox is acknowledged. */
fun LocalDatabase.pendingSubscriptionOverrides(): List<Change.SetSubscriptionOverrides> =
    query("SELECT operation FROM outbox WHERE operation LIKE ? ORDER BY seq", listOf("%SetSubscriptionOverrides%"))
        .mapNotNull { Operation.decode(it["operation"] as String).change as? Change.SetSubscriptionOverrides }
