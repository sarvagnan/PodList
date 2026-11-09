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
}
