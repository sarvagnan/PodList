package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import kotlin.test.*

class BrowsingStoreTest {
    @TempDir lateinit var directory: Path

    @Test fun `cold reopen restores context and scroll without sharing another Library state`() {
        val file = directory.resolve("library.sqlite").toString()
        val saved = BrowsingContext("Playlists", mapOf("Playlists" to listOf("playlist:default")), mapOf("entries" to ScrollAnchor("e", 12, 34)), mapOf("default" to 2), searchText = "walk", statsTable = true)
        LocalDatabase(file).use { db -> db.ensureState(); db.saveBrowsingContext(saved) }
        LocalDatabase(file).use { db ->
            assertEquals(saved, db.loadBrowsingContext())
            assertTrue(db.outbox().isEmpty())
        }
        LocalDatabase(directory.resolve("other.sqlite").toString()).use { db ->
            db.ensureState()
            assertEquals(BrowsingContext(), db.loadBrowsingContext())
        }
    }

    @Test fun `deleted Playlist is removed from saved routes and corrupt snapshots fall back`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("p", "Walk", false), 100)
            db.saveBrowsingContext(BrowsingContext("Playlists", mapOf("Playlists" to listOf("playlist:p", "playlist-settings:p"))))
            db.record(Change.DeletePlaylist("p"), 200)
            assertEquals(emptyList(), db.loadBrowsingContext().stacks["Playlists"])
            db.setMeta("browsingContext", "broken json")
            assertEquals(BrowsingContext(), db.loadBrowsingContext())
        }
    }
    @Test fun `Podcast filter description and guid anchor survive relaunch after rows reorder`() {
        val file = directory.resolve("podcast.sqlite").toString()
        val feed = "https://publisher.example/feed"
        val saved = BrowsingContext(
            destination = "Library", stacks = mapOf("Library" to listOf("podcast:encoded-feed")),
            podcasts = mapOf(feed to PodcastBrowsing("long walk", expanded = true)),
            scrolls = mapOf("Library/podcast:encoded-feed/podcast:$feed" to ScrollAnchor("guid-200", 201, 37))
        )
        LocalDatabase(file).use { db -> db.ensureState(); db.saveBrowsingContext(saved) }
        LocalDatabase(file).use { db ->
            val restored = db.loadBrowsingContext()
            assertEquals(saved, restored)
            assertEquals(PodcastBrowsing("long walk", true), restored.podcasts[feed])
            val anchor = restored.scrolls.values.single()
            assertEquals(3, restoredScrollIndex(anchor, listOf("about", "header", "new-guid", "guid-200")))
            assertEquals(37, anchor.offset)
        }
    }

    @Test fun `uncommitted New View keeps its creation identity on cold launch`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            FormDraftStore(db).put("view:stable-id/name", "My unfinished View")
            val saved = BrowsingContext(stacks = mapOf("Views" to listOf("new-view:stable-id")))
            db.saveBrowsingContext(saved)
            assertEquals(saved, db.loadBrowsingContext())
        }
    }

    @Test fun `cold launch restores the batch only to its screen and keeps the selected stats date`() {
        val file = directory.resolve("selection.sqlite").toString()
        var saved = BrowsingContext()
        LocalDatabase(file, standalone = true).use { db ->
            db.ensureState()
            val library = DeviceLibrary(db, PublisherTransport { _, _ -> PublisherResponse(200, """<rss><channel><title>Deep Field</title>
                <item><guid>one</guid><title>One</title><enclosure url="https://test/one"/></item>
                <item><guid>two</guid><title>Two</title><enclosure url="https://test/two"/></item>
                </channel></rss>""") })
            val subscription = library.subscribe("https://test/feed")
            val ids = db.query("SELECT id FROM episode").map { it["id"] as String }.toSet()
            saved = BrowsingContext(destination = "Library", stacks = mapOf("Library" to listOf("subscription:${subscription.id}", "settings", "listening-stats")),
                selections = mapOf("Library/subscription:${subscription.id}" to ids), statsDay = "2026-11-03")
            db.saveBrowsingContext(saved)
        }
        LocalDatabase(file, standalone = true).use { db ->
            val restored = db.loadBrowsingContext()
            assertEquals(saved, restored)
            assertEquals(2, restored.selections.values.single().size)
            assertNull(restored.selections["Views/search"])
            assertEquals("2026-11-03", restored.statsDay)
            val deleted = restored.selections.values.single().first()
            db.execute("DELETE FROM episode WHERE id = ?", listOf(deleted))
            assertEquals(restored.selections.values.single() - deleted, db.loadBrowsingContext().selections.values.single())
            // Explicit cancellation and successful batch completion persist this clear.
            db.saveBrowsingContext(db.loadBrowsingContext().copy(selections = emptyMap()))
        }
        LocalDatabase(file, standalone = true).use { db ->
            assertTrue(db.loadBrowsingContext().selections.isEmpty())
            assertEquals("2026-11-03", db.loadBrowsingContext().statsDay)
        }
        LocalDatabase(directory.resolve("another-library.sqlite").toString()).use { db ->
            db.ensureState()
            assertTrue(db.loadBrowsingContext().selections.isEmpty())
            assertNull(db.loadBrowsingContext().statsDay)
        }
    }

    @Test fun `old browsing snapshots remain readable without selection or date fields`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.setMeta("browsingContext", """{"destination":"Library","stacks":{"Library":["settings"]},"statsTable":true}""")
            val restored = db.loadBrowsingContext()
            assertEquals("Library", restored.destination)
            assertTrue(restored.statsTable)
            assertTrue(restored.selections.isEmpty())
            assertNull(restored.statsDay)
        }
    }
}
