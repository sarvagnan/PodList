package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import org.junit.jupiter.api.Test
import kotlin.test.*

class SyncTest {
    @Test fun `offline is exposed before independently attempting Library sync`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.setMeta("registered", "true")
            var reported = false
            val sync = SyncClient(db, SyncTransport { _, path, _ ->
                if (path.startsWith("/api/sync")) throw java.io.IOException("offline")
                assertTrue(reported, "Library must not delay the offline indication")
                """{"cursor":1,"subscriptions":[],"episodes":[],"more":false}"""
            }, onFailure = { reported = true })
            assertFailsWith<java.io.IOException> { sync.sync() }
            assertTrue(reported)
        }
    }

    @Test
    fun `registration retries with the same durable Device before any sync requests`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val requests = mutableListOf<String>()
            val registrations = mutableListOf<String>()
            var offline = true
            val transport = SyncTransport { method, path, body ->
                requests += "$method $path"
                when (path) {
                    "/api/devices" -> { registrations += body!!; if (offline) error("offline"); body }
                    "/api/sync/pull?since=0" -> ProtocolJson.encodeToString(PullPage(2, State.initial(), emptyList()))
                    else -> """{"cursor":9,"subscriptions":[],"episodes":[],"more":false}"""
                }
            }
            val sync = SyncClient(db, transport)
            assertFails { sync.sync() }
            assertNull(db.getMeta("registered"))
            assertFalse(requests.any { it.contains("sync/") })
            offline = false
            sync.sync()
            assertEquals(registrations[0], registrations[1])
            assertEquals(DeviceKind.Android, ProtocolJson.decodeFromString<Device>(registrations[1]).kind)
            assertEquals("2", db.getMeta("userCursor"))
            assertEquals("9", db.getMeta("catalogueCursor"))
        }
    }

    @Test
    fun `Library sync proceeds independently when State pull fails`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val sync = SyncClient(db, SyncTransport { _, path, body -> when {
                path == "/api/devices" -> body!!
                path.startsWith("/api/sync/pull") -> error("State unavailable")
                else -> """{"cursor":18,"subscriptions":[],"episodes":[],"more":false}"""
            } })
            assertFails { sync.sync() }
            assertEquals("18", db.getMeta("catalogueCursor"))
            assertNull(db.getMeta("userCursor"))
        }
    }

    @Test
    fun `lost push response retries exact operations and keeps edits recorded during pull`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val first = db.record(Change.SetStar("a", true), 1, "first")
            val pushes = mutableListOf<String>()
            var loseResponse = true
            var second: Operation? = null
            val sync = SyncClient(db, SyncTransport { _, path, body -> when {
                path == "/api/devices" -> body!!
                path == "/api/sync/push" -> {
                    pushes += body!!
                    if (loseResponse) error("response lost after acceptance")
                    """{"cursor":999,"accepted":0}"""
                }
                path == "/api/sync/pull?since=0" -> {
                    second = db.record(Change.SetStar("b", true), 2, "second")
                    ProtocolJson.encodeToString(PullPage(8, StateRules.apply(State.initial(), first.change, 1), emptyList()))
                }
                else -> """{"cursor":0,"subscriptions":[],"episodes":[],"more":false}"""
            } })
            assertFails { sync.sync() }
            assertEquals(listOf(first), db.outbox())
            assertNull(db.getMeta("userCursor"))
            loseResponse = false
            sync.sync()
            assertEquals(pushes[0], pushes[1])
            assertEquals(listOf(second), db.outbox())
            assertEquals("8", db.getMeta("userCursor"))
            assertTrue(db.loadState().episodeStates.getValue("b").starred)
            assertFalse(db.confirmedState()!!.episodeStates.containsKey("b"))
        }
    }

    @Test
    fun `Episodes that arrive a page before their Subscription wait for it`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val subscription = Subscription("s", "https://example.test/feed", "Podcast", null, null, null, 0, 5, null, PlaybackSettingsOverride())
            val episode = Episode("e", "s", "guid", "Episode", "", 1, 60.0, "https://example.test/audio", null, emptyList(), null)
            var failLastPage = true
            val requests = mutableListOf<String>()
            val transport = SyncTransport { _, route, body ->
                requests += route
                when (route) {
                    "/api/devices" -> body!!
                    "/api/sync/pull?since=0" -> ProtocolJson.encodeToString(PullPage(5, State.initial(), emptyList()))
                    "/api/sync/pull?since=5" -> ProtocolJson.encodeToString(PullPage(5, null, emptyList()))
                    "/api/library/changes?since=0" -> ProtocolJson.encodeToString(LibraryPage(17, emptyList(), listOf(episode), true))
                    "/api/library/changes?since=17" -> {
                        if (failLastPage) throw java.io.IOException("offline")
                        ProtocolJson.encodeToString(LibraryPage(18, listOf(subscription), emptyList(), false))
                    }
                    else -> error(route)
                }
            }

            runCatching { SyncClient(db, transport).sync() }
            assertEquals(null, db.getMeta("catalogueCursor"))
            assertEquals(0, db.query("SELECT id FROM episode").size)

            failLastPage = false
            SyncClient(db, transport).sync()
            assertEquals("18", db.getMeta("catalogueCursor"))
            assertEquals(1, db.query("SELECT id FROM episode").size)
            assertEquals(2, requests.count { it == "/api/library/changes?since=0" })
        }
    }

    @Test
    fun `restart after partial Library pages resumes the returned cursor and retains State commit`() {
        val path = java.nio.file.Files.createTempFile("sync-restart", ".sqlite")
        val subscription = Subscription("s", "https://example.test/feed", "Podcast", null, null, null, 0, null, null, PlaybackSettingsOverride())
        val episode = Episode("e", "s", "guid", "Episode", "", 1, 60.0, "https://example.test/audio", null, emptyList(), null)
        var failPage = true
        val requests = mutableListOf<String>()
        val transport = SyncTransport { _, route, body ->
            requests += route
            when (route) {
                "/api/devices" -> body!!
                "/api/sync/pull?since=0" -> ProtocolJson.encodeToString(PullPage(5, State.initial(), emptyList()))
                "/api/sync/pull?since=5" -> ProtocolJson.encodeToString(PullPage(5, null, emptyList()))
                "/api/library/changes?since=0" -> ProtocolJson.encodeToString(LibraryPage(17, listOf(subscription), emptyList(), true))
                "/api/library/changes?since=17" -> {
                    if (failPage) error("offline on second page")
                    ProtocolJson.encodeToString(LibraryPage(44, emptyList(), listOf(episode), false))
                }
                else -> error(route)
            }
        }
        try {
            val id: String
            LocalDatabase(path.toString()).use { db ->
                db.ensureState()
                assertFails { SyncClient(db, transport).sync() }
                id = db.installation().id
                assertEquals("5", db.getMeta("userCursor"))
                assertEquals("17", db.getMeta("catalogueCursor"))
            }
            failPage = false
            requests.clear()
            LocalDatabase(path.toString()).use { db ->
                SyncClient(db, transport).sync()
                assertEquals(id, db.installation().id)
                assertEquals(listOf("/api/sync/pull?since=5", "/api/library/changes?since=17"), requests)
                assertEquals("44", db.getMeta("catalogueCursor"))
                assertEquals(listOf("e"), db.evaluate(View("v", "All", ViewFilter(), ViewSort.PublishedDesc, null), 10).map { it["id"] })
            }
        } finally { java.nio.file.Files.deleteIfExists(path) }
    }

    @Test
    fun `duplicate operation delivery is deduplicated across restarts without losing Listening amounts`() {
        val path = java.nio.file.Files.createTempFile("sync-dedup", ".sqlite")
        val operation = Operation("listen", "other", 0, 1, Change.RecordListening(listOf(ListeningAmount("2026-11-09", "s", 12.0))))
        try {
            repeat(2) { run ->
                LocalDatabase(path.toString()).use { db ->
                    db.ensureState()
                    db.setMeta("registered", "true")
                    SyncClient(db, SyncTransport { _, route, _ -> when {
                        route.startsWith("/api/sync/pull") -> ProtocolJson.encodeToString(PullPage((run + 1).toLong(), null, listOf(operation, operation)))
                        else -> """{"cursor":0,"subscriptions":[],"episodes":[],"more":false}"""
                    } }).sync()
                    assertEquals(12.0, db.loadState().listeningLog!!.getValue("2026-11-09").getValue("s"))
                }
            }
        } finally { java.nio.file.Files.deleteIfExists(path) }
    }

    @Test
    fun `failed pull never acknowledges an accepted outbox snapshot`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val edit = db.record(Change.SetStar("e", true), 1, "edit")
            SyncClient(db, SyncTransport { _, route, body -> when {
                route == "/api/devices" -> body!!
                route == "/api/sync/push" -> """{"cursor":9,"accepted":1}"""
                route.startsWith("/api/sync/pull") -> error("pull failed")
                else -> """{"cursor":0,"subscriptions":[],"episodes":[],"more":false}"""
            } }).let { assertFails { it.sync() } }
            assertEquals(listOf(edit), db.outbox())
            assertNull(db.getMeta("userCursor"))
            assertTrue(db.loadState().episodeStates.getValue("e").starred)
        }
    }
}
