package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.util.UUID

@Serializable data class BringOverCounts(
    val subscriptions: Int, val playlists: Int, val entries: Int, val played: Int, val starred: Int,
    val listeningSeconds: Double, val worthMoving: Boolean
)
@Serializable data class BringOverEpisode(
    val id: String, val subscriptionId: String, val guid: String, val title: String,
    val metadata: Episode? = null
)
@Serializable data class BringOverDownload(val episodeId: String, val manual: Boolean, val bytes: Long, val savedAt: Long)
@Serializable data class BringOverIssue(val kind: String, val feedUrl: String, val title: String, val episodeId: String? = null)
@Serializable data class BringOverSnapshot(
    val device: Device, val subscriptions: List<Subscription>, val episodes: List<BringOverEpisode>,
    val operations: List<Operation>, val views: List<View>, val implicitViews: List<View>, val downloads: List<BringOverDownload>, val counts: BringOverCounts
)
@Serializable data class BringOverJob(
    val snapshot: BringOverSnapshot, val phase: String = "feeds", val subscribed: Set<String> = emptySet(),
    val issues: List<BringOverIssue> = emptyList(), val ids: BringOverIds? = null,
    val queued: Boolean = false, val copied: Set<String> = emptySet()
) {
    val complete get() = phase == "done"
}

// The immutable operation/metadata snapshot is written once. Frequent checkpoints must not
// rewrite years of listening operations for every Subscription or copied audio file.
@Serializable private data class BringOverCheckpoint(
    val phase: String, val subscribed: Set<String>, val issues: List<BringOverIssue>,
    val ids: BringOverIds?, val queued: Boolean, val copied: Set<String>
)

private fun LocalDatabase.saveBringOver(job: BringOverJob) = transaction {
    setMeta("bringOver", ProtocolJson.encodeToString(BringOverCheckpoint(job.phase, job.subscribed, job.issues, job.ids, job.queued, job.copied)))
    setMeta("bringOverPending", (!job.complete).toString())
}

private fun LocalDatabase.bringOverEpisodes(): List<Episode> = query("SELECT * FROM episode").map { e ->
    Episode(e["id"] as String, e["subscription_id"] as String, e["guid"] as String, e["title"] as String,
        e["description"] as String, (e["published"] as Number).toLong(), (e["duration"] as? Number)?.toDouble(),
        e["audio_url"] as String, (e["artwork_url"] as? String)?.let(::Artwork),
        ProtocolJson.decodeFromString(e["chapters"] as String), (e["audio_updated_at"] as? Number)?.toLong())
}

/** Explicit mappings for every reference in the protocol. Missing references are never dropped. */
@Serializable data class BringOverIds(
    val subscriptions: Map<String, String>, val episodes: Map<String, String>,
    val playlists: Map<String, String> = emptyMap(), val views: Map<String, String> = emptyMap()
) {
    private fun episode(id: String) = episodes[id] ?: error("Unmatched Episode: $id")
    private fun subscription(id: String) = subscriptions[id] ?: error("Unmatched Subscription: $id")
    private fun playlist(id: String) = playlists[id] ?: id
    fun view(view: View) = view.copy(id = views[view.id] ?: view.id, filter = view.filter.copy(
        podcasts = view.filter.podcasts?.let { it.copy(subscriptionIds = it.subscriptionIds.map(::subscription)) }
    ))
    private fun amounts(values: List<ListeningAmount>) = values.map { it.copy(subscriptionId = subscription(it.subscriptionId)) }

    fun rewrite(operation: Operation): Operation = operation.copy(change = when (val c = operation.change) {
        is Change.AddEntry -> c.copy(playlistId = playlist(c.playlistId), episodeId = episode(c.episodeId))
        is Change.MoveEntry -> c.copy(playlistId = playlist(c.playlistId), episodeId = episode(c.episodeId), after = c.after?.let(::episode))
        is Change.RemoveEntry -> c.copy(playlistId = playlist(c.playlistId), episodeId = episode(c.episodeId))
        is Change.SetCursor -> c.copy(playlistId = playlist(c.playlistId), episodeId = c.episodeId?.let(::episode))
        is Change.ReportPosition -> c.copy(playlistId = playlist(c.playlistId), episodeId = episode(c.episodeId), listening = c.listening?.let(::amounts))
        is Change.RecordListening -> c.copy(amounts = amounts(c.amounts))
        is Change.MarkPlayed -> c.copy(episodeId = episode(c.episodeId), source = when (val source = c.source) {
            PlayedSource.User -> source
            is PlayedSource.Playback -> source.copy(playlistId = playlist(source.playlistId))
        })
        is Change.MarkUnplayed -> c.copy(episodeId = episode(c.episodeId))
        is Change.MarkSubscriptionPlayed -> error("Replay the Standalone Device's concrete MarkPlayed operations instead")
        is Change.SetStar -> c.copy(episodeId = episode(c.episodeId))
        is Change.CreatePlaylist -> c.copy(playlistId = playlist(c.playlistId))
        is Change.RenamePlaylist -> c.copy(playlistId = playlist(c.playlistId))
        is Change.SetClearOnPlayed -> c.copy(playlistId = playlist(c.playlistId))
        is Change.DeletePlaylist -> c.copy(playlistId = playlist(c.playlistId))
        is Change.RestorePlaylist -> c.copy(playlistId = playlist(c.playlistId))
        is Change.SetActivePlaylist -> c.copy(playlistId = playlist(c.playlistId))
        is Change.Rewind -> c.copy(playlistId = playlist(c.playlistId))
        is Change.SaveView -> c.copy(view = view(c.view))
        is Change.DeleteView -> c.copy(viewId = views[c.viewId] ?: c.viewId)
        is Change.SetDownloadRule -> c.copy(rule = c.rule.copy(subscriptionId = subscription(c.rule.subscriptionId)))
        is Change.SetSubscriptionOverrides -> c.copy(subscriptionId = subscription(c.subscriptionId))
        is Change.SetPlaybackSettings, is Change.SetTrashDays -> c
    })
}

/** Snapshot is taken under the source database lock; source rows, operations and files are retained. */
fun LocalDatabase.bringOverSnapshot(): BringOverSnapshot = transaction {
    val state = loadState()
    val operations = query("SELECT operation FROM local_operation ORDER BY seq").map { Operation.decode(it["operation"] as String) }
    val subscriptions = DeviceLibrary(this).subscriptions()
    val downloads = query("SELECT * FROM download ORDER BY episode_id").map {
        BringOverDownload(it["episode_id"] as String, (it["manual"] as Number).toInt() != 0, (it["bytes"] as Number).toLong(), (it["saved_at"] as Number).toLong())
    }
    val playlists = state.playlists + state.trash.orEmpty().map { it.playlist }
    val touchedViews = operations.mapNotNull { when (val c = it.change) {
        is Change.SaveView -> c.view.id
        is Change.DeleteView -> c.viewId
        else -> null
    } }.toSet()
    BringOverSnapshot(installation(), subscriptions, bringOverEpisodes().map {
        BringOverEpisode(it.id, it.subscriptionId, it.guid, it.title, it)
    }, operations, state.views, state.views.filter { it.id !in touchedViews }, downloads, BringOverCounts(
        subscriptions.count { it.unsubscribedAt == null }, playlists.size, playlists.sumOf { it.entries.size },
        state.episodeStates.values.count { it.played != null }, state.episodeStates.values.count { it.starred },
        state.listeningLog.orEmpty().values.sumOf { it.values.sum() },
        subscriptions.any { it.unsubscribedAt == null } || operations.isNotEmpty() || downloads.isNotEmpty()
    ))
}

fun LocalDatabase.bringOverJob(): BringOverJob? = transaction {
    val checkpoint = getMeta("bringOver")?.let { ProtocolJson.decodeFromString<BringOverCheckpoint>(it) } ?: return@transaction null
    BringOverJob(ProtocolJson.decodeFromString(requireNotNull(getMeta("bringOverSnapshot"))), checkpoint.phase, checkpoint.subscribed,
        checkpoint.issues, checkpoint.ids, checkpoint.queued, checkpoint.copied)
}
fun LocalDatabase.bringOverPending() = getMeta("bringOverPending") == "true"

/** No network in transactions. Each durable boundary can be retried after a lost response or death.
 * State waits for a complete mapping: replaying later edits before unresolved earlier ones would
 * change Rewind, History, Cursor and Clear on Played semantics. Successful Subscribe calls persist
 * independently, so retry only contacts the feeds which failed (and refreshes unmatched feeds).
 */
class BringOver(
    private val source: LocalDatabase, private val destination: LocalDatabase, private val transport: SyncTransport,
    private val sourceFiles: AudioFiles, private val destinationFiles: AudioFiles,
    private val progress: (BringOverJob) -> Unit = {}
) {
    private fun save(job: BringOverJob): BringOverJob {
        destination.saveBringOver(job)
        progress(job)
        return job
    }

    @Synchronized fun begin(): BringOverJob {
        destination.bringOverJob()?.let { return it }
        val snapshot = source.bringOverSnapshot()
        val job = destination.transaction {
            bringOverJob() ?: BringOverJob(snapshot).also {
                setMeta("bringOverSnapshot", ProtocolJson.encodeToString(snapshot))
                saveBringOver(it)
            }
        }
        progress(job)
        return job
    }

    @Synchronized fun resume(): BringOverJob {
        var job = checkNotNull(destination.bringOverJob()) { "Bring-over must be accepted before resuming" }
        if (job.complete) return job
        val snapshot = job.snapshot
        if (!job.queued) {
            val retryEpisodeFeeds = job.issues.filter { issue -> issue.kind == "episode" ||
                (issue.kind == "feed" && snapshot.subscriptions.any { it.feedUrl == issue.feedUrl && it.id in job.subscribed })
            }.map { it.feedUrl }.filter { it.isNotEmpty() }.distinct()
            val failures = mutableListOf<BringOverIssue>()
            for (sub in snapshot.subscriptions.filter { it.unsubscribedAt == null && it.id !in job.subscribed }) {
                try {
                    val result = ProtocolJson.decodeFromString<Subscription>(transport.request("POST", "/api/subscriptions", ProtocolJson.encodeToString(mapOf("feedUrl" to sub.feedUrl))))
                    require(result.feedUrl == sub.feedUrl) { "Subscribe returned a different feed" }
                    destination.upsertLibrary(listOf(result), emptyList())
                    job = save(job.copy(subscribed = job.subscribed + sub.id))
                } catch (_: Exception) { failures += BringOverIssue("feed", sub.feedUrl, sub.title) }
            }
            for (feed in retryEpisodeFeeds) {
                val id = destination.query("SELECT id FROM subscription WHERE feed_url = ?", listOf(feed)).firstOrNull()?.get("id") as? String ?: continue
                try { transport.request("POST", "/api/subscriptions/${java.net.URLEncoder.encode(id, "UTF-8")}/refresh", null) }
                catch (_: Exception) { failures += BringOverIssue("feed", feed, snapshot.subscriptions.find { it.feedUrl == feed }?.title ?: feed) }
            }
            job = save(job.copy(phase = "mapping", issues = failures))
            // Includes the server's existing State, all Library pages, and any pre-existing outbox.
            SyncClient(destination, transport).sync()
            // Subscribe intentionally doesn't refresh an already-known feed. Retry only the feeds
            // with missing Episodes, using the existing per-Subscription refresh endpoint.
            var mapped = map(snapshot, destination.loadState())
            var issues = failures + mapped.second.filterNot { issue -> failures.any { it.feedUrl == issue.feedUrl } }
            if (issues.isNotEmpty()) {
                // Exact identities only. Import never fetches feeds or changes existing server rows.
                // Persist the same partial explanation on old servers or an interrupted request.
                // An empty import also lets a new server accept a complete map after a failed
                // refresh (for example when an earlier metadata response was lost).
                job = save(job.copy(issues = issues))
                val imported = try {
                    transport.request("POST", "/api/subscriptions/bring-over", metadata(snapshot, mapped.second))
                    true
                } catch (error: HttpFailure) {
                    if (error.status != 404) throw error
                    false
                }
                if (imported) {
                    SyncClient(destination, transport).sync()
                    mapped = map(snapshot, destination.loadState())
                    issues = mapped.second
                }
            }
            job = save(job.copy(issues = issues))
            if (issues.isNotEmpty()) return job
            val ids = mapped.first
            val state = destination.loadState()
            val seeds = snapshot.implicitViews.mapNotNull { view ->
                val mappedView = ids.view(view)
                if (state.views.any { it.id == mappedView.id }) null else Operation(
                    "bring-over:${snapshot.device.id}:view:${view.id}", snapshot.device.id, 0, snapshot.device.registeredAt, Change.SaveView(mappedView)
                )
            }
            // The bulk intention was already expanded on this Device, including which Episodes
            // were unplayed then. Sending it again would also mark server-only Episodes Played.
            val operations = seeds + snapshot.operations.filterNot { it.change is Change.MarkSubscriptionPlayed }.map(ids::rewrite)
            destination.transaction {
                // Each origin has its own sequence. Reserve destination numbers atomically with
                // the exact push payload; ids, Device, clocks and source replay order stay stable.
                val sequence = getMeta("sequence")?.toLong() ?: 0
                val queued = operations.mapIndexed { index, o -> o.copy(sequence = sequence + index) }
                for (operation in queued) execute("INSERT INTO outbox (id, operation) VALUES (?, ?)", listOf(operation.id, operation.encode()))
                setMeta("sequence", (sequence + queued.size).toString())
                saveState(StateRules.replay(loadState(), queued).state)
                job = job.copy(phase = "operations", ids = ids, queued = true, issues = emptyList())
                saveBringOver(job)
            }
            progress(job)
        }
        SyncClient(destination, transport).sync()
        job = save(job.copy(phase = "downloads"))
        val ids = requireNotNull(job.ids)
        for (download in snapshot.downloads.filter { it.episodeId !in job.copied }) {
            val id = ids.episodes.getValue(download.episodeId)
            destinationFiles.withCommitLock(id) {
                val existing = destination.query("SELECT * FROM download WHERE episode_id = ?", listOf(id)).firstOrNull()
                val stored = destinationFiles.stored(id)
                val keepExisting = existing != null && stored != null && stored.length() == (existing["bytes"] as Number).toLong()
                val bytes = if (keepExisting) stored.length() else {
                    sourceFiles.copyTo(download.episodeId, destinationFiles, id, download.bytes)
                    download.bytes
                }
                destination.transaction {
                    execute("INSERT OR REPLACE INTO download (episode_id, manual, bytes, saved_at) VALUES (?, ?, ?, ?)", listOf(
                        // Bringing stored audio over is an explicit keep action. A server may already
                        // mark it Played or have different Entries; don't immediately discard it under
                        // those merged rules. Preserve the original ownership in the source Library.
                        id, 1, bytes,
                        if (keepExisting) existing["saved_at"] else download.savedAt
                    ))
                    job = job.copy(copied = job.copied + download.episodeId)
                    saveBringOver(job)
                }
            }
            progress(job)
        }
        job = save(job.copy(phase = "done"))
        destination.notifyChanged()
        return job
    }

    private fun metadata(snapshot: BringOverSnapshot, issues: List<BringOverIssue>): String {
        val missingEpisodes = issues.mapNotNull { it.episodeId }.toSet()
        val episodes = snapshot.episodes.filter { it.id in missingEpisodes }
        val feeds = issues.map { it.feedUrl }.toSet()
        // Checkpoints made by an older app contain only identity/title. Recover full metadata
        // from the retained source, matching the snapshotted identity before using it.
        val legacy = if (episodes.any { it.metadata == null }) source.bringOverEpisodes() else emptyList()
        return buildJsonObject {
            put("subscriptions", JsonArray(snapshot.subscriptions.filter { it.feedUrl in feeds }.map { sub ->
                JsonObject(ProtocolJson.encodeToJsonElement(sub).jsonObject - "id")
            }))
            put("episodes", JsonArray(episodes.map { episode ->
                val sub = snapshot.subscriptions.single { it.id == episode.subscriptionId }
                val full = episode.metadata ?: legacy.single {
                    it.id == episode.id && it.subscriptionId == episode.subscriptionId && it.guid == episode.guid
                }
                JsonObject((ProtocolJson.encodeToJsonElement(full).jsonObject - "id" - "subscriptionId") +
                    ("feedUrl" to JsonPrimitive(sub.feedUrl)))
            }))
        }.toString()
    }

    private fun map(snapshot: BringOverSnapshot, state: State): Pair<BringOverIds, List<BringOverIssue>> {
        val subscriptions = destination.query("SELECT id, feed_url FROM subscription").associate { it["feed_url"] as String to it["id"] as String }
        val subIds = snapshot.subscriptions.mapNotNull { s -> subscriptions[s.feedUrl]?.let { s.id to it } }.toMap()
        val episodes = destination.query("SELECT id, subscription_id, guid FROM episode").associate { (it["subscription_id"] as String to it["guid"] as String) to it["id"] as String }
        val episodeIds = snapshot.episodes.mapNotNull { e -> episodes[subIds[e.subscriptionId] to e.guid]?.let { e.id to it } }.toMap()
        // Collect every reference alongside the exhaustive protocol rewriter above.
        // This includes old neighbours, removed Entries, View conditions and permanent listening.
        val neededEpisodes = mutableSetOf<String>()
        val neededSubscriptions = mutableSetOf<String>()
        for (o in snapshot.operations) {
            val c = o.change
            when (c) {
                is Change.AddEntry -> neededEpisodes += c.episodeId
                is Change.MoveEntry -> { neededEpisodes += c.episodeId; c.after?.let { neededEpisodes += it } }
                is Change.RemoveEntry -> neededEpisodes += c.episodeId
                is Change.SetCursor -> c.episodeId?.let { neededEpisodes += it }
                is Change.ReportPosition -> { neededEpisodes += c.episodeId; neededSubscriptions += c.listening.orEmpty().map { it.subscriptionId } }
                is Change.RecordListening -> neededSubscriptions += c.amounts.map { it.subscriptionId }
                is Change.MarkPlayed -> neededEpisodes += c.episodeId
                is Change.MarkUnplayed -> neededEpisodes += c.episodeId
                is Change.SetStar -> neededEpisodes += c.episodeId
                is Change.SaveView -> neededSubscriptions += c.view.filter.podcasts?.subscriptionIds.orEmpty()
                is Change.SetDownloadRule -> neededSubscriptions += c.rule.subscriptionId
                is Change.SetSubscriptionOverrides -> neededSubscriptions += c.subscriptionId
                is Change.MarkSubscriptionPlayed, is Change.CreatePlaylist, is Change.RenamePlaylist, is Change.SetClearOnPlayed,
                is Change.DeletePlaylist, is Change.RestorePlaylist, is Change.SetTrashDays, is Change.SetActivePlaylist,
                is Change.Rewind, is Change.DeleteView, is Change.SetPlaybackSettings -> Unit
            }
        }
        // The Library also includes untouched Back Catalogue. Report an active Subscription's
        // missing Episodes even when no operation or download happens to reference them yet.
        val activeSubscriptions = snapshot.subscriptions.filter { it.unsubscribedAt == null }.map { it.id }.toSet()
        neededEpisodes += snapshot.episodes.filter { it.subscriptionId in activeSubscriptions }.map { it.id }
        neededEpisodes += snapshot.downloads.map { it.episodeId }
        neededSubscriptions += activeSubscriptions
        neededSubscriptions += snapshot.implicitViews.flatMap { it.filter.podcasts?.subscriptionIds.orEmpty() }
        neededSubscriptions += snapshot.episodes.filter { it.id in neededEpisodes }.map { it.subscriptionId }
        val issues = mutableListOf<BringOverIssue>()
        for (id in neededSubscriptions - subIds.keys) {
            val sub = snapshot.subscriptions.find { it.id == id }
            issues += BringOverIssue("subscription", sub?.feedUrl.orEmpty(), sub?.title ?: id)
        }
        for (id in neededEpisodes - episodeIds.keys) {
            val e = snapshot.episodes.find { it.id == id }
            val sub = snapshot.subscriptions.find { it.id == e?.subscriptionId }
            issues += BringOverIssue("episode", sub?.feedUrl.orEmpty(), e?.title ?: id, id)
        }
        fun distinctId(kind: String, id: String) = "bring-over-" + UUID.nameUUIDFromBytes("${snapshot.device.id}/$kind/$id".toByteArray())
        val playlistIds = snapshot.operations.mapNotNull { (it.change as? Change.CreatePlaylist)?.playlistId }.associateWith { id ->
            if (state.playlists.any { it.id == id } || state.trash.orEmpty().any { it.playlist.id == id }) distinctId("playlist", id) else id
        } + (DefaultPlaylistId to DefaultPlaylistId)
        val touchedViews = snapshot.operations.mapNotNull { when (val c = it.change) { is Change.SaveView -> c.view.id; is Change.DeleteView -> c.viewId; else -> null } }.toSet()
        val viewIds = (touchedViews + snapshot.implicitViews.map { it.id }).associateWith { id ->
            val finalView = snapshot.views.find { it.id == id }?.takeIf { v -> v.filter.podcasts?.subscriptionIds.orEmpty().all { it in subIds } }
                ?.let { BringOverIds(subIds, episodeIds).view(it) }
            val equivalent = finalView?.let { v -> state.views.find { it.copy(id = v.id) == v } }
            equivalent?.id ?: if (state.views.any { it.id == id }) distinctId("view", id) else id
        }
        return BringOverIds(subIds, episodeIds, playlistIds, viewIds) to issues
    }
}
