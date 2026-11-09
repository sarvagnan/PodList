package app.podlist.data

import java.io.IOException
import java.net.SocketTimeoutException
import javax.net.ssl.SSLHandshakeException
import org.junit.jupiter.api.Test
import kotlin.test.*

class UiImportRulesTest {
    @Test fun `feed lookup classifies transport TLS HTTP and invalid feed separately`() {
        assertEquals(LookupError.Offline, classifyLookup(IOException("offline")))
        assertEquals(LookupError.Offline, classifyLookup(SocketTimeoutException()))
        assertEquals(LookupError.Tls, classifyLookup(SSLHandshakeException("certificate")))
        assertEquals(LookupError.Server, classifyLookup(HttpFailure(503)))
        val malformed = assertFailsWith<InvalidFeed> { readPodcastFeed("<html/>") }
        assertEquals(LookupError.Feed, classifyLookup(malformed))
        assertEquals(LookupError.Response, classifyLookup(IllegalStateException("bad response")))
    }

    @Test fun `malformed Standalone OPML fails before subscribing`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            val library = DeviceLibrary(db, PublisherTransport { _, _ -> error("No request expected") })
            assertFails { library.importOpml("<broken>") }
            assertFails { library.importOpml("<rss><channel/></rss>") }
            assertTrue(db.query("SELECT * FROM subscription").isEmpty())
        }
    }

    @Test fun `import reports measurable progress and Stop retains completed work and retry list`() {
        val xml = """<opml><body><outline xmlUrl="known"/><outline xmlUrl="one"/><outline xmlUrl="two"/><outline xmlUrl="one"/></body></opml>"""
        val added = mutableListOf<String>()
        val progress = mutableListOf<ImportProgress>()
        var stop = false
        val result = importSubscriptions(xml, setOf("known"), { added += it; stop = true }, { stop }, progress::add)
        assertEquals(listOf("one"), added)
        assertEquals(listOf(0, 1, 2), progress.map { it.processed })
        assertTrue(progress.all { it.total == 3 })
        assertEquals(ImportSummary(1, 1, emptyList()), result.summary)
        assertEquals(listOf("two"), result.remaining)
    }

    @Test fun `failed feed does not discard earlier subscriptions or hide later progress`() {
        val result = importSubscriptions("""<opml><body><outline xmlUrl="one"/><outline xmlUrl="bad"/><outline xmlUrl="two"/></body></opml>""", emptySet(), { if (it == "bad") throw IOException("offline") })
        assertEquals(3, result.processed)
        assertEquals(2, result.summary.added)
        assertEquals(listOf("bad"), result.summary.failed.map { it.feedUrl })
        assertTrue(result.remaining.isEmpty())
    }
}
