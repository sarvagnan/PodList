package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import kotlin.test.*

class PlaybackEditsTest {
    @Test fun `new Playlist and Add are one durable action with ordered Operations`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val operations = db.recordAll(listOf(Change.CreatePlaylist("p", "Walk", false), Change.AddEntry("p", "e", Placement.Next)), 100, listOf("create", "add"))
            assertEquals(listOf(0L, 1L), operations.map { it.sequence })
            assertEquals(listOf("create", "add"), db.outbox().map { it.id })
            assertEquals("e", db.loadState().playlists.last().entries.single().episodeId)
        }
    }
    @Test fun `a failed batch leaves neither partial Playlist nor consumed sequence`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            assertFails { db.recordAll(listOf(Change.CreatePlaylist("p", "Walk", false), Change.AddEntry("p", "e", Placement.Next)), 100, listOf("same", "same")) }
            assertEquals(listOf("default"), db.loadState().playlists.map { it.id })
            assertEquals(emptyList(), db.outbox())
            assertNull(db.getMeta("sequence"))
        }
    }
    @Test fun `All New sees Library changes without a State edit and State changes clean rule downloads`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val device = db.installation().id
            db.record(Change.SetDownloadRule(DownloadRule("s", device, DownloadMode.AllNew, 1)), 100)
            val subscription = Subscription("s", "https://podcast.test/rss", "Podcast", null, null, null, 0, null, null, PlaybackSettingsOverride())
            db.upsertLibrary(listOf(subscription), emptyList())
            assertEquals(emptyList(), db.downloadPlan(device, 200).fetch)
            val episode = Episode("e", "s", "guid", "Episode", "", 110, 100.0, "https://podcast.test/audio", null, emptyList(), null)
            db.upsertLibrary(emptyList(), listOf(episode))
            assertEquals(listOf("e"), db.downloadPlan(device, 200).fetch)
            db.execute("INSERT INTO download VALUES (?, ?, ?, ?)", listOf("e", 0, 30, 200))
            db.record(Change.MarkPlayed("e", PlayedSource.User), 300)
            assertEquals(listOf("e"), db.downloadPlan(device, 300).discard)
            db.record(Change.SetStar("e", true), 400)
            assertEquals(emptyList(), db.downloadPlan(device, 400).discard)
        }
    }
}
