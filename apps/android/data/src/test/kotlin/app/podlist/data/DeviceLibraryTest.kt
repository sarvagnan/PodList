package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import java.nio.file.Files
import kotlin.test.*

private const val feedUrl = "https://podcast.test/rss"
private fun xml(guid: String = "g1", duration: String = "100", audio: String = "https://podcast.test/a", extra: String = "") = """<rss xmlns:itunes="urn:itunes" xmlns:podcast="urn:podcast"><channel><title>Café podcast</title><itunes:author>Author</itunes:author><item><guid>$guid</guid><title>Episode</title><description>Résumé</description><pubDate>2026-11-09T00:00:00Z</pubDate><enclosure url="$audio"/><itunes:duration>$duration</itunes:duration><podcast:chapters url="https://podcast.test/chapters"/></item>$extra</channel></rss>"""
private class FeedNetwork : PublisherTransport {
    var body = xml()
    var status = 200
    val requests = mutableListOf<Pair<String, Map<String, String>>>()
    override fun get(url: String, headers: Map<String, String>): PublisherResponse {
        requests += url to headers
        return PublisherResponse(status, body, "etag-v1", "yesterday")
    }
}
class DeviceLibraryTest {
    private fun device(block: (LocalDatabase, DeviceLibrary, FeedNetwork) -> Unit) {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            val network = FeedNetwork()
            block(db, DeviceLibrary(db, network) { 1_800_000_000_000 }, network)
        }
    }
    @Test fun `Subscribe persists feed identity Back Catalogue and folded metadata`() = device { db, library, _ ->
        val subscription = library.subscribe(feedUrl)
        assertEquals(feedUrl, subscription.feedUrl)
        assertEquals("Café podcast", subscription.title)
        val episode = db.query("SELECT * FROM episode").single()
        assertEquals("g1", episode["guid"])
        assertEquals("https://podcast.test/chapters", episode["chapters_url"])
        assertEquals("resume", episode["description_folded"])
        assertEquals(1, db.evaluate(View("v", "", ViewFilter(text = "cafe resume"), ViewSort.PublishedDesc, null), 0).size)
        assertTrue(db.outbox().isEmpty())
    }
    @Test fun `failed Subscribe leaves no partial Subscription`() = device { db, library, network ->
        network.body = "<html/>"
        assertFails { library.subscribe(feedUrl) }
        assertTrue(db.query("SELECT * FROM subscription").isEmpty())
        assertTrue(db.query("SELECT * FROM episode").isEmpty())
        assertTrue(db.query("SELECT * FROM feed_state").isEmpty())
    }
    @Test fun `Unsubscribe keeps ids settings Entries stars Positions rules and downloads`() = device { db, library, network ->
        val sub = library.subscribe(feedUrl)
        val first = db.query("SELECT id FROM episode").single()["id"] as String
        network.body = xml(extra = "<item><guid>g2</guid><enclosure url='https://podcast.test/b'/></item><item><guid>g3</guid><enclosure url='https://podcast.test/c'/></item>")
        library.refreshOne(sub.id)
        val starred = db.query("SELECT id FROM episode WHERE guid = 'g2'").single()["id"] as String
        db.recordAll(listOf(Change.AddEntry("default", first, Placement.Last), Change.ReportPosition("default", first, 12.0, 100),
            Change.SetStar(starred, true), Change.SetSubscriptionOverrides(sub.id, PlaybackSettingsOverride(speed = 1.5), 0.0),
            Change.SetDownloadRule(DownloadRule(sub.id, "device", DownloadMode.OnEntry, null))), 100)
        db.execute("INSERT INTO download VALUES (?, 1, 50, 100)", listOf(first))
        val state = db.loadState()
        library.unsubscribe(sub.id)
        val visible = db.evaluate(View("v", "", ViewFilter(), ViewSort.PublishedDesc, null), 0)
        assertEquals(setOf(first, starred), visible.map { it["id"] }.toSet())
        assertEquals(3, db.query("SELECT * FROM episode").size)
        assertEquals(state, db.loadState())
        assertEquals(1, db.query("SELECT * FROM download").size)
        val requests = network.requests.size
        val restored = library.subscribe(feedUrl)
        assertEquals(sub.id, restored.id)
        assertEquals(1.5, restored.playbackSettings.speed)
        assertEquals(0.0, restored.playedThreshold)
        assertEquals(requests, network.requests.size)
        assertEquals(3, db.evaluate(View("v", "", ViewFilter(), ViewSort.PublishedDesc, null), 0).size)
        assertTrue(db.outbox().isEmpty())
    }
    @Test fun `refresh retains disappeared Episodes and merges unambiguous changed guids`() = device { db, library, network ->
        val sub = library.subscribe(feedUrl)
        val id = db.query("SELECT id FROM episode").single()["id"]
        network.body = xml(guid = "renamed", duration = "120", audio = "https://podcast.test/redirected")
        library.refreshOne(sub.id)
        assertEquals(id, db.query("SELECT * FROM episode").single()["id"])
        assertEquals("renamed", db.query("SELECT * FROM episode").single()["guid"])
        assertNull(db.query("SELECT * FROM episode").single()["audio_updated_at"])
        network.body = "<rss><channel><title>Empty today</title></channel></rss>"
        library.refreshOne(sub.id)
        assertEquals(1, db.query("SELECT * FROM episode").size)
    }
    @Test fun `ambiguous guid changes remain separate`() = device { db, library, network ->
        network.body = xml(extra = "<item><guid>g2</guid><title>Episode</title><pubDate>2026-11-09T00:00:00Z</pubDate><enclosure url='https://podcast.test/a'/></item>")
        val sub = library.subscribe(feedUrl)
        network.body = xml(guid = "new")
        library.refreshOne(sub.id)
        assertEquals(3, db.query("SELECT * FROM episode").size)
    }
    @Test fun `audio replacement resets Chapter cache without losing identity`() = device { db, library, network ->
        val sub = library.subscribe(feedUrl)
        val id = db.query("SELECT id FROM episode").single()["id"]
        db.execute("UPDATE episode SET chapters_fetched_at = 50")
        network.body = xml(duration = "131")
        library.refreshOne(sub.id)
        val row = db.query("SELECT * FROM episode").single()
        assertEquals(id, row["id"])
        assertNotNull(row["audio_updated_at"])
        assertNull(row["chapters_fetched_at"])
    }
    @Test fun `refresh sends validators and accepts 304 without replacing metadata`() = device { db, library, network ->
        val sub = library.subscribe(feedUrl)
        val before = db.query("SELECT * FROM episode")
        network.status = 304
        library.refreshOne(sub.id)
        assertEquals("etag-v1", network.requests.last().second["If-None-Match"])
        assertEquals("yesterday", network.requests.last().second["If-Modified-Since"])
        assertEquals(before, db.query("SELECT * FROM episode"))
        assertEquals(0L, db.query("SELECT * FROM feed_state").single()["failures"])
    }
    @Test fun `failed feeds back off while other Subscriptions refresh`() = device { db, library, network ->
        val sub = library.subscribe(feedUrl)
        network.status = 503
        assertFails { library.refreshOne(sub.id) }
        val requests = network.requests.size
        library.refresh()
        assertEquals(requests, network.requests.size)
        assertEquals(1L, db.query("SELECT * FROM feed_state").single()["failures"])
        assertEquals(DeviceLibrary.PollMillis, DeviceLibrary.backoffMillis(1))
        assertEquals(2 * DeviceLibrary.PollMillis, DeviceLibrary.backoffMillis(2))
        assertEquals(86_400_000L, DeviceLibrary.backoffMillis(50))
    }
    @Test fun `new Episodes trigger readers and existing All New planning`() = device { db, library, network ->
        val sub = library.subscribe(feedUrl)
        val device = db.installation().id
        db.record(Change.SetDownloadRule(DownloadRule(sub.id, device, DownloadMode.AllNew, null)), 0)
        var invalidations = 0
        db.onChanged = { invalidations++ }
        network.body = xml(extra = "<item><guid>new</guid><pubDate>2026-11-10T00:00:00Z</pubDate><enclosure url='https://podcast.test/new'/></item>")
        library.refreshOne(sub.id)
        assertEquals(1, invalidations)
        assertEquals(2, db.downloadPlan(device, 1_800_000_000_000).fetch.size)
    }
    @Test fun `a failed Chapters lookup is retried instead of remembered as none`() = device { db, library, network ->
        library.subscribe(feedUrl)
        val id = db.query("SELECT id FROM episode").single()["id"] as String
        network.status = 503
        assertTrue(library.chapters(id).isEmpty())
        assertNull(db.query("SELECT chapters_fetched_at FROM episode").single()["chapters_fetched_at"])
        network.status = 200
        network.body = """{"chapters":[{"startTime":0,"title":"First"}]}"""
        assertEquals(listOf("First"), library.chapters(id).map { it.title })
    }
    @Test fun `Chapters come directly from podcast JSON and are cached`() = device { db, library, network ->
        library.subscribe(feedUrl)
        val id = db.query("SELECT id FROM episode").single()["id"] as String
        network.body = """{"chapters":[{"startTime":20,"title":"Second","img":"https://test/art"},{"startTime":5,"toc":false},{"startTime":-1,"url":"https://test/link"}]}"""
        val chapters = library.chapters(id)
        assertEquals(listOf(0.0, 20.0), chapters.map { it.start })
        assertEquals(Artwork("https://test/art"), chapters.last().artwork)
        assertEquals("https://podcast.test/chapters", network.requests.last().first)
        val requests = network.requests.size
        assertEquals(chapters, library.chapters(id))
        assertEquals(requests, network.requests.size)
        assertNull(library.audioFallback(id))
        assertEquals("https://publisher/art", library.artwork("https://publisher/art", 128))
    }
    @Test fun `OPML imports deduplicate nested outlines and report partial results`() = device { _, library, network ->
        library.subscribe(feedUrl)
        network.status = 500
        val summary = library.importOpml("""<opml><body><outline text="Group"><outline xmlUrl="$feedUrl"/><outline xmlUrl="https://test/fail"/><outline xmlUrl="$feedUrl"/></outline></body></opml>""")
        assertEquals(0, summary.added)
        assertEquals(1, summary.alreadySubscribed)
        assertEquals("https://test/fail", summary.failed.single().feedUrl)
        assertEquals(listOf(feedUrl), Opml.parse(library.exportOpml()))
        assertFails { library.importOpml("<broken>") }
    }
    @Test fun `local edits listening and concrete intentions survive restart with no outbox`() {
        val path = Files.createTempFile("device-library", ".sqlite")
        try {
            lateinit var expected: State
            LocalDatabase(path.toString(), standalone = true).use { db ->
                db.ensureState()
                val library = DeviceLibrary(db, FeedNetwork())
                val sub = library.subscribe(feedUrl)
                val episode = db.query("SELECT id FROM episode").single()["id"] as String
                db.recordAll(listOf(Change.AddEntry("default", episode, Placement.Last),
                    Change.ReportPosition("default", episode, 25.0, 100, listOf(ListeningAmount("2026-11-09", sub.id, 15.0))),
                    Change.MarkPlayed(episode, PlayedSource.Playback("default")), Change.MarkSubscriptionPlayed(sub.id)), 100)
                expected = db.loadState()
                assertEquals(1, expected.playlists.single().history.size)
                assertEquals(1, expected.playlists.single().timeline.size)
                assertEquals(15.0, expected.listeningLog!!["2026-11-09"]!![sub.id])
                assertTrue(db.outbox().isEmpty())
                assertEquals(4, db.query("SELECT * FROM local_operation").size)
            }
            LocalDatabase(path.toString(), standalone = true).use { db ->
                assertEquals(expected, db.loadState())
                assertTrue(db.outbox().isEmpty())
            }
        } finally { Files.deleteIfExists(path) }
    }
}
