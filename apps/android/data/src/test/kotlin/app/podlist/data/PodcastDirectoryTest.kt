package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import kotlinx.serialization.encodeToString
import kotlin.test.*

class PodcastDirectoryTest {
    @Test fun `iTunes search encodes the name and maps only results with feed addresses`() {
        var requested = ""
        val directory = PodcastDirectory { url, _ ->
            requested = url
            PublisherResponse(200, """{"results":[{"collectionName":"Show","artistName":"Author","feedUrl":"https://test/rss","artworkUrl600":"https://test/600","artworkUrl100":"https://test/100"},{"feedUrl":"https://test/fallback","artistName":"","artworkUrl100":"https://test/small"},{"collectionName":"No feed"}]}""")
        }
        val results = directory.search("fish & chips")
        assertEquals("https://itunes.apple.com/search?media=podcast&entity=podcast&limit=30&term=fish+%26+chips", requested)
        assertEquals(2, results.size)
        assertEquals(DirectoryResult("Show", "Author", "https://test/rss", "https://test/600", "itunes"), results.first())
        assertEquals("https://test/fallback", results.last().title)
        assertNull(results.last().author)
        assertEquals("https://test/small", results.last().artworkUrl)
    }
    @Test fun `pasted address resolves directly without searching a directory`() {
        var requested = ""
        val result = PodcastDirectory { url, _ ->
            requested = url
            PublisherResponse(200, "<rss><channel><title>Preview</title></channel></rss>")
        }.search("  https://test/rss  ").single()
        assertEquals("https://test/rss", requested)
        assertEquals("feed", result.source)
        assertEquals("Preview", result.title)
    }
    @Test fun `invalid pasted feed fails and network errors can be retried`() {
        assertFails { PodcastDirectory { _, _ -> PublisherResponse(200, "<html/>") }.search("https://test/bad") }
        assertFails { PodcastDirectory { _, _ -> PublisherResponse(503, "") }.search("name") }
    }
    @Test fun `OPML escapes and omits removed Subscriptions`() {
        val sub = Subscription("s", "https://test/rss?x=1&y=2", "A < B & \"C\" 'D'", null, null, null, 0, null, null, PlaybackSettingsOverride())
        val opml = Opml.generate(listOf(sub, sub.copy(id = "removed", feedUrl = "https://test/removed", unsubscribedAt = 1)))
        assertContains(opml, "&lt;")
        assertContains(opml, "&quot;")
        assertContains(opml, "&apos;")
        assertEquals(listOf(sub.feedUrl), Opml.parse(opml))
        assertFails { Opml.parse("<opml><body></opml>") }
    }
    @Test fun `server source uses existing directory Subscription and Chapter endpoints`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val requests = mutableListOf<Triple<String, String, String?>>()
            val sub = Subscription("s", "https://test/rss", "Show", "Author", null, null, 0, null, null, PlaybackSettingsOverride())
            val http = SyncTransport { method, path, body ->
                requests += Triple(method, path, body)
                when {
                    path.startsWith("/api/directory/search") -> ProtocolJson.encodeToString(listOf(DirectoryResult(sub.title, sub.author, sub.feedUrl, null, "itunes")))
                    path == "/api/subscriptions" -> ProtocolJson.encodeToString(sub)
                    path == "/api/subscriptions/s" -> ProtocolJson.encodeToString(sub.copy(unsubscribedAt = 10))
                    path == "/api/episodes/e/chapters" -> "[]"
                    else -> error("Unexpected endpoint $path")
                }
            }
            val library = ServerLibrary(db, ServerAddress.parse("https://podlist.test", false), http)
            assertEquals("Show", library.search("fish & chips").single().title)
            assertEquals("/api/directory/search?q=fish+%26+chips", requests.last().second)
            assertEquals(sub, library.subscribe(sub.feedUrl))
            assertEquals("POST", requests.last().first)
            assertEquals("{\"feedUrl\":\"https://test/rss\"}", requests.last().third)
            library.unsubscribe(sub.id)
            assertEquals("DELETE", requests.last().first)
            assertEquals(10L, db.query("SELECT unsubscribed_at FROM subscription").single()["unsubscribed_at"])
            assertTrue(library.chapters("e").isEmpty())
            assertEquals("https://podlist.test/api/episodes/e/audio", library.audioFallback("e"))
            assertContains(library.artwork("https://publisher/art", 128), "/api/artwork?")
        }
    }
}
