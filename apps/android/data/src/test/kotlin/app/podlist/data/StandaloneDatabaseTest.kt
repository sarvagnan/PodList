package app.podlist.data

import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import app.podlist.domain.*
import org.junit.jupiter.api.Test
import java.nio.file.Files
import kotlin.test.*

class StandaloneDatabaseTest {
    @Test fun `starter Views match FirstRun and are made once even after deletion`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            db.initializeStandalone()
            val views = db.loadState().views
            assertEquals(listOf("New this week", "Under 30 minutes", "Starred"), views.map { it.name })
            assertEquals(ViewFilter(published = PublishedFilter.LastDays(7), played = PlayedFilter.Unplayed), views[0].filter)
            assertEquals(ViewFilter(played = PlayedFilter.Unplayed, maxDuration = 1800.0), views[1].filter)
            assertEquals(ViewSort.DurationAsc, views[1].sort)
            assertEquals(ViewFilter(starred = true), views[2].filter)
            views.forEach { db.record(Change.DeleteView(it.id), 100) }
            db.initializeStandalone()
            assertTrue(db.loadState().views.isEmpty())
            assertTrue(db.outbox().isEmpty())
        }
    }
    @Test fun `standalone initialization preserves existing Views`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            val view = View("custom", "My View", ViewFilter(), ViewSort.PublishedDesc, null)
            db.record(Change.SaveView(view), 10)
            db.initializeStandalone()
            assertEquals(listOf(view), db.loadState().views)
        }
    }
    @Test fun `pre-Standalone database migrates without losing Library State or pending sync`() {
        val path = Files.createTempFile("old-android", ".sqlite")
        try {
            BundledSQLiteDriver().open(path.toString()).use { connection ->
                fun execute(sql: String) = connection.prepare(sql).use { it.step(); Unit }
                execute("CREATE TABLE android_migration (scope TEXT NOT NULL, id INTEGER NOT NULL, name TEXT NOT NULL, PRIMARY KEY(scope,id))")
                for ((scope, migrations) in listOf("shared" to SharedSchema.migrations, "client" to SharedSchema.clientMigrations)) for (m in migrations) {
                    m.statements.forEach(::execute)
                    execute("INSERT INTO android_migration VALUES ('$scope', ${m.id}, '${m.name}')")
                }
                execute("INSERT INTO subscription (id, feed_url, title, subscribed_at) VALUES ('s', 'https://test/rss', 'Podcast', 10)")
                execute("INSERT INTO episode (id, subscription_id, guid, title, description, published, audio_url) VALUES ('e', 's', 'guid', 'Episode', '', 20, 'https://test/audio')")
                execute("INSERT INTO sync_meta VALUES ('catalogueCursor', '123')")
                execute("INSERT INTO sync_meta VALUES ('userCursor', '321')")
                execute("INSERT INTO outbox (id, operation) VALUES ('pending', 'opaque preserved bytes')")
            }
            LocalDatabase(path.toString()).use { db ->
                assertEquals("https://test/rss", db.query("SELECT feed_url FROM subscription").single()["feed_url"])
                assertEquals("guid", db.query("SELECT guid FROM episode").single()["guid"])
                assertEquals("123", db.getMeta("catalogueCursor"))
                assertEquals("321", db.getMeta("userCursor"))
                assertEquals("opaque preserved bytes", db.query("SELECT operation FROM outbox").single()["operation"])
                assertTrue(db.query("SELECT * FROM feed_state").isEmpty())
                assertTrue(db.query("SELECT * FROM local_operation").isEmpty())
                assertEquals(7L, db.query("SELECT count(*) AS n FROM android_migration").single()["n"])
            }
        } finally { Files.deleteIfExists(path) }
    }
    @Test fun `Mark all Played expands locally in Published order and observes prior marks`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            db.upsertLibrary(listOf(Subscription("s", "https://test/rss", "S", null, null, null, 0, null, null, PlaybackSettingsOverride())),
                listOf("a" to 20L, "b" to 10L).map { (id, published) -> Episode(id, "s", id, id, "", published, null, "https://test/$id", null, emptyList(), null) })
            db.recordAll(listOf(Change.MarkPlayed("a", PlayedSource.User), Change.MarkSubscriptionPlayed("s")), 100, listOf("manual", "all"))
            val operations = db.query("SELECT operation FROM local_operation ORDER BY seq").map { Operation.decode(it["operation"] as String) }
            assertEquals(listOf("manual", "all", "all:b"), operations.map { it.id })
            assertEquals(2, db.loadState().episodeStates.size)
            assertTrue(db.outbox().isEmpty())
        }
    }
    @Test fun `failed standalone batch rolls back metadata intentions and local log`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            db.upsertLibrary(listOf(Subscription("s", "https://test/rss", "S", null, null, null, 0, null, null, PlaybackSettingsOverride())), emptyList())
            assertFails { db.recordAll(listOf(Change.SetSubscriptionOverrides("s", PlaybackSettingsOverride(speed = 2.0), 5.0), Change.SetStar("e", true)), 100, listOf("duplicate", "duplicate")) }
            assertEquals("{}", db.query("SELECT playback_settings FROM subscription").single()["playback_settings"])
            assertTrue(db.query("SELECT * FROM local_operation").isEmpty())
            assertTrue(db.loadState().episodeStates.isEmpty())
        }
    }
}
