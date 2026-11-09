package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import kotlin.test.*

class MilestoneFourDataTest {
    @Test fun `Getting started remembers completed steps after Entries leave and Subscriptions are removed`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState(); db.initializeStandalone(); db.initializeGettingStarted()
            db.upsertLibrary(listOf(Subscription("s", "https://podcast.test/rss", "Podcast", null, null, null, 0, null, null, PlaybackSettingsOverride())), emptyList())
            db.record(Change.AddEntry("default", "e", Placement.Last), 100)
            db.updateGettingStartedProgress()
            assertEquals("7", db.getMeta("gettingStartedSteps"))
            db.record(Change.RemoveEntry("default", "e"), 200)
            db.execute("UPDATE subscription SET unsubscribed_at = 300")
            db.updateGettingStartedProgress()
            assertEquals("7", db.getMeta("gettingStartedSteps"))
        }
    }
    @Test fun `pending server overrides work without sync and Default clears the override`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.upsertLibrary(listOf(Subscription("s", "https://podcast.test/rss", "Podcast", null, null, null, 0, null, 30.0, PlaybackSettingsOverride(speed = 1.5))), listOf(Episode("e", "s", "g", "Episode", "", 0, 100.0, "https://podcast.test/audio", null, emptyList(), null)))
            db.record(Change.SetSubscriptionOverrides("s", PlaybackSettingsOverride(speed = 2.0, skipIntro = 10.0), 0.0), 100)
            assertEquals(2.0, db.playbackMetadata("e").override.speed)
            assertEquals(0.0, db.playbackMetadata("e").playedThreshold)
            assertEquals(30.0, (db.query("SELECT played_threshold FROM subscription").single()["played_threshold"] as Number).toDouble())
            db.record(Change.SetSubscriptionOverrides("s", PlaybackSettingsOverride(), null), 200)
            assertNull(db.playbackMetadata("e").override.speed)
            assertNull(db.playbackMetadata("e").playedThreshold)
        }
    }
    @Test fun `outer action rolls back nested Operations metadata and sequence together`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            assertFails {
                db.transaction {
                    record(Change.CreatePlaylist("p", "Walk", false), 100)
                    setMeta("action", "made")
                    error("Stop outer action")
                }
            }
            assertEquals(listOf("default"), db.loadState().playlists.map { it.id })
            assertTrue(db.outbox().isEmpty())
            assertNull(db.getMeta("sequence"))
            assertNull(db.getMeta("action"))
            db.record(Change.CreatePlaylist("q", "After", false), 200)
            assertEquals(0L, db.outbox().single().sequence)
        }
    }
    @Test fun `OPML server adapter uses the shared endpoints and JSON request with partial failures`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val requests = mutableListOf<Triple<String, String, String?>>()
            val xml = "<opml><body><outline xmlUrl=\"https://podcast.test/a?x=1&amp;y=2\"/></body></opml>"
            val source = ServerLibrary(db, ServerAddress.parse("https://podlist.test", false), SyncTransport { method, path, body ->
                requests += Triple(method, path, body)
                if (method == "GET") xml else """{"added":1,"alreadySubscribed":2,"failed":[{"feedUrl":"https://bad.test/rss","message":"Unavailable"}]}"""
            })
            val result = source.importOpml(xml)
            assertEquals(ImportSummary(1, 2, listOf(ImportFailure("https://bad.test/rss", "Unavailable"))), result)
            assertEquals("POST", requests.first().first)
            assertEquals("/api/subscriptions/import", requests.first().second)
            assertEquals(xml, ProtocolJson.decodeFromString<Map<String, String>>(requests.first().third!!)["opml"])
            assertEquals(xml, source.exportOpml())
            assertEquals(Triple("GET", "/api/subscriptions/export", null), requests.last())
        }
    }
    @Test fun `OPML server failures remain failures and do not pretend to Subscribe`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val source = ServerLibrary(db, ServerAddress.parse("https://podlist.test", false), SyncTransport { _, _, _ -> throw HttpFailure(503) })
            assertFailsWith<HttpFailure> { source.importOpml("<opml/>") }
            assertFailsWith<HttpFailure> { source.exportOpml() }
            assertTrue(db.query("SELECT * FROM subscription").isEmpty())
        }
    }
    @Test fun `loading and partially loaded Libraries never create starter Views or begin checklist`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.initializeGettingStarted()
            assertTrue(db.loadState().views.isEmpty())
            assertNull(db.getMeta("gettingStartedBegun"))
            db.setMeta("userCursor", "0")
            db.initializeGettingStarted()
            assertTrue(db.loadState().views.isEmpty())
            assertNull(db.getMeta("gettingStartedChecked"))
        }
    }
    @Test fun `fresh server Library seeds once and deleted starter Views stay deleted`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState(); db.setMeta("userCursor", "0"); db.setMeta("catalogueCursor", "0")
            db.initializeGettingStarted()
            assertEquals(3, db.loadState().views.size)
            assertEquals("true", db.getMeta("gettingStartedBegun"))
            assertEquals(3, db.outbox().size)
            db.record(Change.DeleteView("starter-starred"), 100)
            db.initializeGettingStarted()
            assertEquals(2, db.loadState().views.size)
        }
    }
    @Test fun `existing Library does not show Getting started automatically`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState(); db.setMeta("userCursor", "0"); db.setMeta("catalogueCursor", "0")
            db.upsertLibrary(listOf(Subscription("s", "https://podcast.test/rss", "Podcast", null, null, null, 0, null, null, PlaybackSettingsOverride())), emptyList())
            db.initializeGettingStarted()
            assertNull(db.getMeta("gettingStartedBegun"))
            assertTrue(db.loadState().views.isEmpty())
        }
    }
}
