package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import org.junit.jupiter.api.Test
import java.io.IOException
import java.nio.file.Files
import kotlin.test.*

class BringOverTest {
    private fun sub(id: String = "local-sub", url: String = "https://test/feed", removed: Boolean = false) =
        Subscription(id, url, "Podcast", null, null, null, 10, if (removed) 20 else null, null, PlaybackSettingsOverride())
    private fun episode(id: String = "local-ep", subscription: String = "local-sub", guid: String = "guid") =
        Episode(id, subscription, guid, "Episode $guid", "", 10, 300.0, "https://test/audio/$guid", null, emptyList(), null)

    /** Models Subscribe uniqueness, Library pages, stable-id push dedup and optional metadata import. */
    private class Server(var state: State = State.initial()) : SyncTransport {
        val subscriptions = mutableListOf<Subscription>()
        val episodes = mutableListOf<Episode>()
        val operations = mutableListOf<Operation>()
        val calls = mutableListOf<String>()
        val failedFeeds = mutableSetOf<String>()
        val failedRefreshes = mutableSetOf<String>()
        var losePush = false
        var loseSubscribe = false
        var failPull = false
        var failLibraryPage = false
        var libraryCursor = 10L
        var pagedLibrary = false
        var offerEpisode = true
        var metadataEndpoint = false
        var loseMetadata = false
        var metadataFailure: Int? = null
        val metadataRequests = mutableListOf<JsonObject>()
        override fun request(method: String, path: String, body: String?): String {
            calls += "$method $path"
            return when {
                path == "/api/devices" -> body!!
                path == "/api/subscriptions/bring-over" -> {
                    if (!metadataEndpoint) throw HttpFailure(404)
                    metadataFailure?.let { throw HttpFailure(it) }
                    val metadata = ProtocolJson.parseToJsonElement(body!!).jsonObject
                    metadataRequests += metadata
                    for (item in metadata.getValue("subscriptions").jsonArray) {
                        val fields = item.jsonObject
                        val feed = fields.getValue("feedUrl").jsonPrimitive.content
                        if (subscriptions.none { it.feedUrl == feed }) subscriptions += ProtocolJson.decodeFromJsonElement<Subscription>(
                            JsonObject(fields + ("id" to JsonPrimitive("import-sub-${subscriptions.size}")))
                        )
                    }
                    for (item in metadata.getValue("episodes").jsonArray) {
                        val fields = item.jsonObject
                        val sub = subscriptions.single { it.feedUrl == fields.getValue("feedUrl").jsonPrimitive.content }
                        val guid = fields.getValue("guid").jsonPrimitive.content
                        if (episodes.none { it.subscriptionId == sub.id && it.guid == guid }) episodes += ProtocolJson.decodeFromJsonElement<Episode>(
                            JsonObject((fields - "feedUrl") + mapOf("id" to JsonPrimitive("import-ep-${episodes.size}"), "subscriptionId" to JsonPrimitive(sub.id)))
                        )
                    }
                    libraryCursor++
                    if (loseMetadata) { loseMetadata = false; throw IOException("lost metadata response") }
                    ""
                }
                path == "/api/subscriptions" -> {
                    val feed = ProtocolJson.parseToJsonElement(body!!).jsonObject.getValue("feedUrl").jsonPrimitive.content
                    if (feed in failedFeeds) throw IOException("unreachable feed")
                    val s = subscriptions.find { it.feedUrl == feed }?.copy(unsubscribedAt = null) ?: Subscription(
                        "server-sub-${subscriptions.size}", feed, "Podcast", null, null, null, 100, null, null, PlaybackSettingsOverride()
                    )
                    subscriptions.removeAll { it.id == s.id }; subscriptions += s
                    if (offerEpisode && episodes.none { it.subscriptionId == s.id }) episodes += Episode(
                        "server-ep-${episodes.size}", s.id, "guid", "Episode guid", "", 10, 300.0, "https://test/audio/guid", null, emptyList(), null
                    )
                    if (loseSubscribe) { loseSubscribe = false; throw IOException("lost Subscribe response") }
                    ProtocolJson.encodeToString(s)
                }
                path.endsWith("/refresh") && path.startsWith("/api/subscriptions/") -> {
                    if (path.removePrefix("/api/subscriptions/").removeSuffix("/refresh") in failedRefreshes) throw IOException("feed refresh failed")
                    """{"_tag":"NotModified"}"""
                }
                path == "/api/sync/push" -> {
                    val sent = ProtocolJson.decodeFromJsonElement<List<Operation>>(ProtocolJson.parseToJsonElement(body!!).jsonObject.getValue("operations"))
                    var accepted = 0
                    for (o in sent) if (operations.none { it.id == o.id }) {
                        check(o.change !is Change.MarkSubscriptionPlayed) { "Bulk mark must not be expanded again" }
                        if (o.change is Change.SetSubscriptionOverrides) {
                            val c = o.change as Change.SetSubscriptionOverrides
                            val s = subscriptions.find { it.id == c.subscriptionId }!!
                            subscriptions[subscriptions.indexOf(s)] = s.copy(playbackSettings = c.playbackSettings, playedThreshold = c.playedThreshold)
                        }
                        state = StateRules.apply(state, o.change, o.recordedAt)
                        operations += o; accepted++
                    }
                    if (losePush) { losePush = false; throw IOException("accepted; response lost") }
                    """{"cursor":${operations.size},"accepted":$accepted}"""
                }
                path.startsWith("/api/sync/pull?") -> {
                    if (failPull) throw IOException("pull unavailable")
                    val since = path.substringAfter("since=").toInt()
                    ProtocolJson.encodeToString(PullPage(operations.size.toLong(), if (since == 0) state else null, if (since == 0) emptyList() else operations.drop(since)))
                }
                path.startsWith("/api/library/changes?") -> {
                    val since = path.substringAfter("since=").toLong()
                    if (pagedLibrary && since == 0L) ProtocolJson.encodeToString(LibraryPage(5, subscriptions, emptyList(), true))
                    else {
                        if (failLibraryPage) throw IOException("Library unavailable")
                        ProtocolJson.encodeToString(LibraryPage(libraryCursor, subscriptions, episodes, false))
                    }
                }
                else -> error("Unexpected request: $method $path")
            }
        }
    }

    private class Fixture : AutoCloseable {
        val directory = Files.createTempDirectory("bring-over").toFile()
        val sourcePath = directory.resolve("source.sqlite").path
        val targetPath = directory.resolve("target.sqlite").path
        var source = LocalDatabase(sourcePath, standalone = true)
        var target = LocalDatabase(targetPath)
        val sourceFiles = AudioFiles(directory.resolve("source-audio"))
        val targetFiles = AudioFiles(directory.resolve("target-audio"))
        init {
            source.ensureState(); source.initializeStandalone(); source.setMeta("deviceId", "phone"); source.setMeta("registeredAt", "1")
            target.ensureState(); target.setMeta("deviceId", "phone")
        }
        fun engine(server: Server) = BringOver(source, target, server, sourceFiles, targetFiles)
        fun reopen() { source.close(); target.close(); source = LocalDatabase(sourcePath, standalone = true); target = LocalDatabase(targetPath) }
        override fun close() { source.close(); target.close(); directory.deleteRecursively() }
    }

    @Test fun `empty Standalone Library has nothing to move but edits and stored downloads do`(): Unit = Fixture().use { f ->
        assertFalse(f.source.bringOverSnapshot().counts.worthMoving)
        f.source.record(Change.SetPlaybackSettings(PlaybackSettings(1.5, 0.0, 0.0, false)), 10)
        assertTrue(f.source.bringOverSnapshot().counts.worthMoving)
    }

    @Test fun `offer counts active Subscriptions Playlists Entries marks and actual Listening log seconds`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub(), sub("removed", "https://test/old", true)), listOf(episode()))
        f.source.recordAll(listOf(Change.CreatePlaylist("p", "Trip", false), Change.AddEntry("p", "local-ep", Placement.Last),
            Change.MarkPlayed("local-ep", PlayedSource.User), Change.SetStar("local-ep", true),
            Change.RecordListening(listOf(ListeningAmount("2026-11-09", "local-sub", 7201.5)))), 100)
        val counts = f.source.bringOverSnapshot().counts
        assertEquals(1, counts.subscriptions); assertEquals(2, counts.playlists); assertEquals(1, counts.entries)
        assertEquals(1, counts.played); assertEquals(1, counts.starred); assertEquals(7201.5, counts.listeningSeconds)
    }

    @Test fun `every protocol reference is mapped without changing ids sequences clocks or listening day`() {
        val ids = BringOverIds(mapOf("s" to "new-s"), mapOf("e" to "new-e", "neighbour" to "new-neighbour"), mapOf("p" to "new-p"), mapOf("v" to "new-v"))
        val amount = ListeningAmount("2026-11-09", "s", 12.5)
        val changes = listOf(
            Change.AddEntry("p", "e", Placement.Last), Change.MoveEntry("p", "e", "neighbour"), Change.RemoveEntry("p", "e"), Change.SetCursor("p", "e"),
            Change.ReportPosition("p", "e", 42.0, 123, listOf(amount)), Change.RecordListening(listOf(amount)), Change.MarkPlayed("e", PlayedSource.Playback("p")),
            Change.MarkUnplayed("e"), Change.SetStar("e", true), Change.CreatePlaylist("p", "Name", false), Change.RenamePlaylist("p", "Name"),
            Change.SetClearOnPlayed("p", true), Change.DeletePlaylist("p"), Change.RestorePlaylist("p"), Change.SetActivePlaylist("p"), Change.Rewind("p", 42),
            Change.SaveView(View("v", "Name", ViewFilter(podcasts = PodcastFilter(PodcastMode.Exclude, listOf("s"))), ViewSort.PublishedDesc, null)),
            Change.DeleteView("v"), Change.SetDownloadRule(DownloadRule("s", "phone", DownloadMode.AllNew, 5)),
            Change.SetSubscriptionOverrides("s", PlaybackSettingsOverride(speed = 2.0), 30.0), Change.SetTrashDays(60), Change.SetPlaybackSettings(State.initial().playbackSettings)
        )
        changes.forEachIndexed { i, c ->
            val o = Operation("stable-$i", "phone", i.toLong(), 456, c)
            val rewritten = ids.rewrite(o)
            assertEquals(o.copy(change = rewritten.change), rewritten)
            val json = rewritten.encode()
            listOf("e", "s", "p", "v", "neighbour").forEach { assertFalse(json.contains("\"$it\""), json) }
        }
        val report = ids.rewrite(Operation("id", "phone", 0, 456, changes[4])).change as Change.ReportPosition
        assertEquals(listOf(amount.copy(subscriptionId = "new-s")), report.listening)
        assertEquals(123, report.listenedAt)
    }

    @Test fun `mapping is by feed and guid scoped to its Subscription never title audio or guid alone`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub(), sub("s2", "https://test/two")), listOf(episode(), episode("e2", "s2")))
        f.source.recordAll(listOf(Change.SetStar("local-ep", true), Change.SetStar("e2", true)), 100)
        val server = Server()
        val engine = f.engine(server); engine.begin(); val job = engine.resume()
        assertTrue(job.complete)
        assertEquals("server-ep-0", job.ids!!.episodes["local-ep"])
        assertEquals("server-ep-1", job.ids.episodes["e2"])
        assertEquals(setOf("server-ep-0", "server-ep-1"), server.state.episodeStates.keys)
    }

    @Test fun `ordered replay preserves History Positions Timeline log Views settings and original timestamps`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.source.record(Change.CreatePlaylist("p", "Trip", false), 100)
        f.source.record(Change.AddEntry("p", "local-ep", Placement.Now), 101)
        f.source.record(Change.ReportPosition("p", "local-ep", 42.0, 102, listOf(ListeningAmount("2026-11-09", "local-sub", 42.0))), 102)
        f.source.record(Change.MarkPlayed("local-ep", PlayedSource.Playback("p")), 103)
        f.source.record(Change.SetStar("local-ep", true), 104)
        f.source.record(Change.SetSubscriptionOverrides("local-sub", PlaybackSettingsOverride(speed = 1.5), 12.0), 105)
        f.source.record(Change.SetDownloadRule(DownloadRule("local-sub", "phone", DownloadMode.AllNew, 2)), 106)
        f.source.record(Change.SetTrashDays(60), 107)
        val old = f.source.loadState()
        val server = Server(); val engine = f.engine(server); engine.begin(); val job = engine.resume()
        assertTrue(job.complete)
        val p = server.state.playlists.single { it.id == "p" }
        assertEquals(old.playlists.single { it.id == "p" }.copy(
            entries = listOf(Entry("server-ep-0", 0.0, 103)),
            history = listOf(HistoryItem("server-ep-0", 103, JsonNull)),
            timeline = old.playlists.single { it.id == "p" }.timeline.map { it.copy(episodeId = "server-ep-0") },
            edits = old.playlists.single { it.id == "p" }.edits?.map { it.copy(episodeId = "server-ep-0") }
        ), p)
        assertEquals(42.0, server.state.listeningLog!!["2026-11-09"]!!["server-sub-0"])
        assertEquals(12.0, server.subscriptions.single().playedThreshold)
        assertEquals(1.5, server.subscriptions.single().playbackSettings.speed)
        assertEquals(106L, server.state.downloadRules.single().since)
        assertEquals(60L, server.state.trashDays)
        assertEquals(old, f.source.loadState())
        assertTrue(f.source.outbox().isEmpty())
        val sourceOps = job.snapshot.operations
        assertEquals(sourceOps.map { it.id }, server.operations.takeLast(sourceOps.size).map { it.id })
        assertEquals(sourceOps.map { it.recordedAt }, server.operations.takeLast(sourceOps.size).map { it.recordedAt })
    }

    @Test fun `server data and Default Playlist are merged while unchanged starter Views are not duplicated`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.source.record(Change.AddEntry(DefaultPlaylistId, "local-ep", Placement.Last), 100)
        val existing = f.source.loadState().views.mapIndexed { i, v -> v.copy(id = "server-view-$i") }
        val server = Server(State.initial().copy(views = existing))
        server.state = StateRules.apply(server.state, Change.AddEntry(DefaultPlaylistId, "server-only", Placement.Last), 50)
        server.state = StateRules.apply(server.state, Change.RecordListening(listOf(ListeningAmount("2026-11-09", "other", 20.0))), 50)
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals(1, server.state.playlists.count { it.isDefault })
        assertEquals(listOf("server-only", "server-ep-0"), server.state.playlists.single().entries.map { it.episodeId })
        assertEquals(existing, server.state.views)
        assertEquals(20.0, server.state.listeningLog!!["2026-11-09"]!!["other"])
    }

    @Test fun `colliding user Playlist and edited starter View ids preserve the server objects`(): Unit = Fixture().use { f ->
        f.source.record(Change.CreatePlaylist("p", "Phone", false), 100)
        val view = f.source.loadState().views.first()
        f.source.record(Change.SaveView(view.copy(name = "Phone View")), 101)
        val server = Server(f.source.loadState().copy(playlists = State.initial().playlists, views = listOf(view)))
        server.state = StateRules.apply(server.state, Change.CreatePlaylist("p", "Server", true), 50)
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals("Server", server.state.playlists.single { it.id == "p" }.name)
        assertEquals("Phone", server.state.playlists.single { it.id != "p" && !it.isDefault }.name)
        assertEquals(view, server.state.views.single { it.id == view.id })
        assertEquals(1, server.state.views.count { it.name == "Phone View" })
    }

    @Test fun `unmatched Episodes are reported and no dependent operations or downloads are discarded`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode(guid = "retired").copy(title = "Episode guid", audioUrl = "https://test/audio/guid")))
        f.source.record(Change.AddEntry(DefaultPlaylistId, "local-ep", Placement.Last), 100)
        val server = Server(); val engine = f.engine(server); engine.begin(); val job = engine.resume()
        assertFalse(job.complete); assertFalse(job.queued)
        assertEquals("local-ep", job.issues.single().episodeId)
        assertEquals("https://test/feed", job.issues.single().feedUrl)
        assertEquals("episode", job.issues.single().kind)
        assertEquals(1, server.calls.count { it == "POST /api/subscriptions/bring-over" })
        assertTrue(server.operations.isEmpty()); assertTrue(f.target.outbox().isEmpty())
        server.episodes += episode("matched", "server-sub-0", "retired")
        assertTrue(engine.resume().complete)
        assertEquals(1, server.calls.count { it == "POST /api/subscriptions" })
        assertEquals(1, server.calls.count { it == "POST /api/subscriptions/server-sub-0/refresh" })
        assertEquals("matched", server.state.playlists.single().entries.single().episodeId)
    }

    @Test fun `partial feeds survive restart and retry only failed Subscriptions`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub(), sub("two", "https://test/two")), listOf(episode()))
        val server = Server(); server.failedFeeds += "https://test/two"
        f.engine(server).let { it.begin(); val job = it.resume(); assertFalse(job.complete); assertEquals(1, job.subscribed.size); assertEquals("feed", job.issues.single().kind) }
        f.reopen(); server.failedFeeds.clear()
        assertTrue(f.engine(server).resume().complete)
        assertEquals(3, server.calls.count { it == "POST /api/subscriptions" })
        assertEquals(2, server.subscriptions.size)
    }

    @Test fun `lost Subscribe response is safely retried by feed address`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        val server = Server(); server.loseSubscribe = true
        val engine = f.engine(server); engine.begin(); assertFalse(engine.resume().complete)
        assertTrue(engine.resume().complete)
        assertEquals(1, server.subscriptions.size)
    }

    @Test fun `accepted push with lost response resumes exact outbox after process death without double listening`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.source.record(Change.RecordListening(listOf(ListeningAmount("2026-11-09", "local-sub", 3600.0))), 100, "listening-id")
        val server = Server(); server.losePush = true
        val engine = f.engine(server); engine.begin(); assertFailsWith<IOException> { engine.resume() }
        val pending = f.target.outbox()
        assertTrue(pending.isNotEmpty()); assertTrue(f.target.bringOverJob()!!.queued)
        f.reopen()
        assertEquals(pending, f.target.outbox())
        assertTrue(f.engine(server).resume().complete)
        assertEquals(3600.0, server.state.listeningLog!!["2026-11-09"]!!["server-sub-0"])
        assertEquals(1, server.operations.count { it.id == "listening-id" })
        assertTrue(f.target.outbox().isEmpty())
    }

    @Test fun `interrupted Library paging resumes the persisted Library cursor`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        val server = Server(); server.pagedLibrary = true; server.failLibraryPage = true
        val engine = f.engine(server); engine.begin(); assertFailsWith<IOException> { engine.resume() }
        assertEquals("5", f.target.getMeta("catalogueCursor"))
        f.reopen(); server.calls.clear(); server.failLibraryPage = false
        assertTrue(f.engine(server).resume().complete)
        assertFalse(server.calls.any { it == "GET /api/library/changes?since=0" })
        assertFalse(server.calls.any { it == "POST /api/subscriptions" })
    }

    @Test fun `repeated runs and new engine instances preserve listening exactly once and do no further work`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), emptyList())
        f.source.record(Change.RecordListening(listOf(ListeningAmount("2026-11-09", "local-sub", 60.0))), 100)
        val server = Server()
        f.engine(server).let { it.begin(); it.resume() }
        val count = server.calls.size
        repeat(3) { f.engine(server).let { it.begin(); assertTrue(it.resume().complete) } }
        assertEquals(count, server.calls.size)
        assertEquals(60.0, server.state.listeningLog!!["2026-11-09"]!!["server-sub-0"])
    }

    @Test fun `bulk Played uses only local expansion and leaves server-only Episodes Unplayed`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.source.record(Change.MarkSubscriptionPlayed("local-sub"), 100, "bulk")
        val server = Server()
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals(listOf("bulk:local-ep"), server.operations.filter { it.change is Change.MarkPlayed }.map { it.id })
        assertFalse(server.operations.any { it.change is Change.MarkSubscriptionPlayed })
        assertEquals(setOf("server-ep-0"), server.state.episodeStates.keys)
    }

    @Test fun `removed Subscriptions are never re-subscribed and missing metadata is reported`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub(removed = true)), listOf(episode()))
        f.source.record(Change.RecordListening(listOf(ListeningAmount("2026-11-09", "local-sub", 60.0))), 100)
        val server = Server()
        f.engine(server).let { it.begin(); val job = it.resume(); assertEquals("subscription", job.issues.single().kind); assertFalse(job.complete) }
        assertTrue(server.subscriptions.isEmpty())
        assertFalse(server.calls.any { it == "POST /api/subscriptions" })
        server.subscriptions += sub("already-removed", removed = true)
        assertTrue(f.engine(server).resume().complete)
        assertEquals(60.0, server.state.listeningLog!!["2026-11-09"]!!["already-removed"])
        assertNotNull(server.subscriptions.single().unsubscribedAt)
    }

    @Test fun `downloads copy to destination ids with rows ownership bytes and timestamps and keep originals`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.sourceFiles.save("local-ep", listOf("fake")) { _, output -> output.write(byteArrayOf(1, 2, 3)); 3 }
        f.source.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("local-ep", 1, 3, 123))
        val server = Server()
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertContentEquals(byteArrayOf(1, 2, 3), f.targetFiles.stored("server-ep-0")!!.readBytes())
        assertContentEquals(byteArrayOf(1, 2, 3), f.sourceFiles.stored("local-ep")!!.readBytes())
        assertEquals(mapOf("episode_id" to "server-ep-0", "manual" to 1L, "bytes" to 3L, "saved_at" to 123L), f.target.query("SELECT * FROM download").single())
        assertEquals("local-ep", f.source.query("SELECT episode_id FROM download").single()["episode_id"])
    }

    @Test fun `missing stored file cannot report success and copy resumes after file restoration`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.source.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("local-ep", 1, 3, 123))
        val server = Server()
        val engine = f.engine(server); engine.begin(); assertFailsWith<IOException> { engine.resume() }
        assertEquals("downloads", f.target.bringOverJob()!!.phase)
        assertTrue(f.target.query("SELECT * FROM download").isEmpty())
        f.sourceFiles.save("local-ep", listOf("fake")) { _, output -> output.write(byteArrayOf(1, 2, 3)); 3 }
        f.reopen()
        assertTrue(f.engine(server).resume().complete)
        assertNotNull(f.targetFiles.stored("server-ep-0"))
    }

    @Test fun `source deleting a starter View never deletes the server starter View`(): Unit = Fixture().use { f ->
        val starters = f.source.loadState().views
        f.source.record(Change.DeleteView(starters.first().id), 100)
        val server = Server(State.initial().copy(views = starters))
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals(starters, server.state.views)
        assertEquals(starters.drop(1), f.source.loadState().views)
    }

    @Test fun `starter View edited back to its original conditions still appears once`(): Unit = Fixture().use { f ->
        val starters = f.source.loadState().views
        val first = starters.first()
        f.source.record(Change.SaveView(first.copy(name = "Different")), 100)
        f.source.record(Change.SaveView(first), 101)
        val server = Server(State.initial().copy(views = starters.map { it.copy(id = "server-${it.id}") }))
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals(starters.map { it.copy(id = "server-${it.id}") }, server.state.views)
    }

    @Test fun `outbox reserves increasing destination sequences and preserves source operation ids and clocks`(): Unit = Fixture().use { f ->
        f.target.record(Change.SetTrashDays(90), 200, "destination-edit")
        f.source.record(Change.SetPlaybackSettings(PlaybackSettings(1.5, 0.0, 0.0, false)), 100, "phone-edit")
        val server = Server()
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals((0L until server.operations.size.toLong()).toList(), server.operations.map { it.sequence })
        val moved = server.operations.single { it.id == "phone-edit" }
        assertEquals(100L, moved.recordedAt); assertEquals("phone", moved.deviceId)
        assertEquals(server.operations.size.toLong(), f.target.record(Change.SetTrashDays(60), 300).sequence)
        assertEquals(0L, Operation.decode(f.source.query("SELECT operation FROM local_operation").single()["operation"] as String).sequence)
    }

    @Test fun `download checkpoint resumes after one file commits without recopying it or replaying listening`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode("a", guid = "a"), episode("b", guid = "b")))
        f.sourceFiles.save("a", listOf("fake")) { _, out -> out.write(1); 1 }
        f.source.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("a", 1, 1, 100))
        f.source.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("b", 1, 1, 100))
        f.source.record(Change.RecordListening(listOf(ListeningAmount("2026-11-09", "local-sub", 60.0))), 100)
        val server = Server(); server.offerEpisode = false
        server.subscriptions += sub("server-sub")
        server.episodes += listOf(episode("new-a", "server-sub", "a"), episode("new-b", "server-sub", "b"))
        f.engine(server).let { it.begin(); assertFailsWith<IOException> { it.resume() } }
        assertEquals(setOf("a"), f.target.bringOverJob()!!.copied)
        f.sourceFiles.save("a", listOf("changed-after-copy")) { _, out -> out.write(9); 1 }
        f.sourceFiles.save("b", listOf("fake")) { _, out -> out.write(2); 1 }
        f.reopen()
        assertTrue(f.engine(server).resume().complete)
        assertContentEquals(byteArrayOf(1), f.targetFiles.stored("new-a")!!.readBytes())
        assertContentEquals(byteArrayOf(2), f.targetFiles.stored("new-b")!!.readBytes())
        assertEquals(2, f.target.query("SELECT * FROM download").size)
        assertEquals(60.0, server.state.listeningLog!!["2026-11-09"]!!["server-sub"])
    }

    @Test fun `imported rule downloads remain playable when the server already marks the Episode Played`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.sourceFiles.save("local-ep", listOf("fake")) { _, out -> out.write(1); 1 }
        f.source.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("local-ep", 0, 1, 100))
        val server = Server(StateRules.apply(State.initial(), Change.MarkPlayed("server-ep-0", PlayedSource.User), 200))
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals(0L, f.source.query("SELECT manual FROM download").single()["manual"])
        assertEquals(1L, f.target.query("SELECT manual FROM download").single()["manual"])
        assertTrue(f.target.downloadPlan("phone", 300).discard.isEmpty())
        assertNotNull(f.targetFiles.stored("server-ep-0"))
    }

    @Test fun `already stored server download is kept with its bytes and timestamp`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        f.sourceFiles.save("local-ep", listOf("source")) { _, out -> out.write(1); 1 }
        f.source.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("local-ep", 0, 1, 100))
        f.targetFiles.save("server-ep-0", listOf("target")) { _, out -> out.write(byteArrayOf(2, 3)); 2 }
        f.target.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("server-ep-0", 1, 2, 200))
        val server = Server()
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertContentEquals(byteArrayOf(2, 3), f.targetFiles.stored("server-ep-0")!!.readBytes())
        assertEquals(200L, f.target.query("SELECT saved_at FROM download").single()["saved_at"])
        assertEquals(2L, f.target.query("SELECT bytes FROM download").single()["bytes"])
    }

    @Test fun `failed retry of an unmatched feed refresh is retried again without subscribing successful feeds`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode(guid = "old")))
        f.source.record(Change.SetStar("local-ep", true), 100)
        val server = Server()
        val engine = f.engine(server); engine.begin(); assertFalse(engine.resume().complete)
        server.failedRefreshes += "server-sub-0"
        assertEquals("feed", engine.resume().issues.single().kind)
        f.reopen(); server.failedRefreshes.clear()
        server.episodes += episode("new-old", "server-sub-0", "old")
        assertTrue(f.engine(server).resume().complete)
        assertEquals(1, server.calls.count { it == "POST /api/subscriptions" })
        assertEquals(2, server.calls.count { it == "POST /api/subscriptions/server-sub-0/refresh" })
    }

    @Test fun `untouched Back Catalogue missing from the publisher is reported too`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode(guid = "no-longer-published")))
        val server = Server()
        f.engine(server).let { it.begin(); val job = it.resume(); assertFalse(job.complete); assertEquals("local-ep", job.issues.single().episodeId) }
        assertTrue(server.operations.isEmpty())
    }

    @Test fun `resume cannot start a transfer before Bring it over was accepted`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode()))
        val server = Server()
        assertFailsWith<IllegalStateException> { f.engine(server).resume() }
        assertTrue(server.calls.isEmpty())
        assertNull(f.target.bringOverJob())
        assertFalse(f.target.bringOverPending())
    }

    @Test fun `metadata imports a retired Episode and resumes ordered State replay and download copying`(): Unit = Fixture().use { f ->
        val retired = episode(guid = "retired").copy(description = "Retained notes", artwork = Artwork("https://test/art"),
            chapters = listOf(Chapter(0.0, "Start", null, null)), audioUpdatedAt = 50)
        f.source.upsertLibrary(listOf(sub()), listOf(retired))
        f.source.record(Change.AddEntry(DefaultPlaylistId, retired.id, Placement.Last), 100)
        f.source.record(Change.ReportPosition(DefaultPlaylistId, retired.id, 42.0, 101,
            listOf(ListeningAmount("2026-11-09", "local-sub", 60.0))), 101)
        f.source.record(Change.SetStar(retired.id, true), 102)
        f.sourceFiles.save(retired.id, listOf("fake")) { _, output -> output.write(1); 1 }
        f.source.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf(retired.id, 1, 1, 100))
        val server = Server().also { it.metadataEndpoint = true }
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        val imported = server.episodes.single { it.guid == "retired" }
        assertEquals(retired.copy(id = imported.id, subscriptionId = "server-sub-0"), imported)
        assertEquals(42.0, server.state.playlists.single().entries.single().position)
        assertEquals(60.0, server.state.listeningLog!!["2026-11-09"]!!["server-sub-0"])
        assertContentEquals(byteArrayOf(1), f.targetFiles.stored(imported.id)!!.readBytes())
        assertContentEquals(byteArrayOf(1), f.sourceFiles.stored(retired.id)!!.readBytes())
        val request = server.metadataRequests.single()
        assertEquals(1, request.getValue("episodes").jsonArray.size)
        assertFalse(request.getValue("episodes").jsonArray.single().jsonObject.containsKey("id"))
        assertTrue(server.calls.indexOf("POST /api/subscriptions/bring-over") < server.calls.indexOf("POST /api/sync/push"))
    }

    @Test fun `removed Subscription metadata preserves Listening log without Subscribe or active visibility`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub(removed = true)), listOf(episode()))
        f.source.record(Change.RecordListening(listOf(ListeningAmount("2026-11-09", "local-sub", 60.0))), 100)
        val server = Server().also { it.metadataEndpoint = true }
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        val imported = server.subscriptions.single()
        assertEquals(20L, imported.unsubscribedAt)
        assertFalse(server.calls.any { it == "POST /api/subscriptions" })
        assertTrue(server.episodes.isEmpty())
        assertEquals(60.0, server.state.listeningLog!!["2026-11-09"]!![imported.id])
        assertTrue(f.target.evaluate(View("v", "", ViewFilter(), ViewSort.PublishedDesc, null), 200).isEmpty())
    }

    @Test fun `missing removed Subscription and Episodes import together and retain only Orphaned visibility`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub(removed = true)), listOf(
            episode("entry", guid = "entry"), episode("star", guid = "star"), episode("played", guid = "played")))
        f.source.record(Change.AddEntry(DefaultPlaylistId, "entry", Placement.Last), 100)
        f.source.record(Change.SetStar("star", true), 101)
        f.source.record(Change.MarkPlayed("played", PlayedSource.User), 102)
        val server = Server().also { it.metadataEndpoint = true }
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals(20L, server.subscriptions.single().unsubscribedAt)
        assertFalse(server.calls.any { it == "POST /api/subscriptions" })
        assertEquals(3, server.metadataRequests.single().getValue("episodes").jsonArray.size)
        val visible = f.target.evaluate(View("v", "", ViewFilter(), ViewSort.PublishedDesc, null), 200)
        val expected = server.episodes.filter { it.guid != "played" }.map { it.id }.toSet()
        assertEquals(expected, visible.map { it["id"] }.toSet())
    }

    @Test fun `untouched retired Back Catalogue and unavailable active feeds can be imported`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode(guid = "retired")))
        val server = Server().also { it.metadataEndpoint = true; it.failedFeeds += "https://test/feed" }
        f.engine(server).let { it.begin(); assertTrue(it.resume().complete) }
        assertEquals("retired", server.episodes.single().guid)
        assertNull(server.subscriptions.single().unsubscribedAt)
        assertEquals(1, f.target.evaluate(View("v", "", ViewFilter(), ViewSort.PublishedDesc, null), 200).size)
    }

    @Test fun `metadata response lost after acceptance resumes after process death without duplicate listening`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode(guid = "retired")))
        f.source.record(Change.RecordListening(listOf(ListeningAmount("2026-11-09", "local-sub", 60.0))), 100)
        val server = Server().also { it.metadataEndpoint = true; it.loseMetadata = true }
        f.engine(server).let { it.begin(); assertFailsWith<IOException> { it.resume() } }
        assertFalse(f.target.bringOverJob()!!.queued)
        assertTrue(f.target.outbox().isEmpty())
        assertTrue(server.operations.isEmpty())
        f.reopen()
        server.failedRefreshes += "server-sub-0"
        f.engine(server).let { assertTrue(it.resume().complete); assertTrue(it.resume().complete) }
        assertEquals(2, server.metadataRequests.size)
        assertTrue(server.metadataRequests.last().values.all { it.jsonArray.isEmpty() })
        assertEquals(1, server.episodes.count { it.guid == "retired" })
        assertEquals(60.0, server.state.listeningLog!!["2026-11-09"]!!["server-sub-0"])
    }

    @Test fun `metadata errors other than unsupported 404 do not queue State and can be retried`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode(guid = "retired")))
        f.source.record(Change.AddEntry(DefaultPlaylistId, "local-ep", Placement.Last), 100)
        val server = Server().also { it.metadataEndpoint = true; it.metadataFailure = 503 }
        val engine = f.engine(server); engine.begin()
        assertEquals(503, assertFailsWith<HttpFailure> { engine.resume() }.status)
        assertFalse(f.target.bringOverJob()!!.queued)
        assertEquals("episode", f.target.bringOverJob()!!.issues.single().kind)
        assertTrue(server.operations.isEmpty())
        server.metadataFailure = null
        assertTrue(engine.resume().complete)
    }

    @Test fun `snapshot retains complete Episode metadata and older pending snapshots recover retained source metadata`(): Unit = Fixture().use { f ->
        f.source.upsertLibrary(listOf(sub()), listOf(episode(guid = "retired")))
        val server = Server().also { it.metadataEndpoint = true }
        val engine = f.engine(server); val snapshot = engine.begin().snapshot
        assertEquals(episode(guid = "retired"), snapshot.episodes.single().metadata)
        // Simulate the immutable snapshot written by an older Android build.
        f.target.setMeta("bringOverSnapshot", ProtocolJson.encodeToString(snapshot.copy(episodes = snapshot.episodes.map { it.copy(metadata = null) })))
        f.reopen()
        assertTrue(f.engine(server).resume().complete)
        assertEquals("https://test/audio/retired", server.episodes.single { it.guid == "retired" }.audioUrl)
    }
}
