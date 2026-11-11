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
    @Test fun `OPML failures retain authored error categories rather than exception messages`() {
        val errors = listOf(
            IOException("sensitive transport details") to LookupError.Offline,
            SSLHandshakeException("certificate internals") to LookupError.Tls,
            HttpFailure(503) to LookupError.Server,
            InvalidFeed(IllegalArgumentException("parser details")) to LookupError.Feed,
            IllegalStateException("internal response") to LookupError.Response
        )
        errors.forEach { (error, expected) ->
            val result = importSubscriptions("""<opml><body><outline xmlUrl="bad"/></body></opml>""", emptySet(), { throw error })
            val failure = result.summary.failed.single()
            assertEquals("bad", failure.feedUrl)
            assertEquals(expected, failure.error)
            assertNull(failure.message)
        }
    }

    @Test fun `legacy server failure messages have a safe authored fallback category`() {
        val failure = app.podlist.domain.ProtocolJson.decodeFromString<ImportFailure>("""{"feedUrl":"bad","message":"raw internal error"}""")
        assertEquals(LookupError.Response, failure.error)
    }
    @Test fun `selection summarises and replacement or cancellation performs no subscribe`() {
        val xml = """<opml><body><outline xmlUrl="known"/><outline xmlUrl="one"/><outline xmlUrl="one"/></body></opml>"""
        val selected = ImportSelection.read("Podcasts.opml", xml, setOf("known"))
        assertEquals("Podcasts.opml", selected.name)
        assertEquals(listOf("known", "one"), selected.urls)
        assertEquals(1, selected.existing)
        val other = ImportSelection.read("Other.opml", "<opml><body/></opml>", emptySet())
        assertTrue(other.urls.isEmpty())
        assertFails { ImportSelection.read("Broken.opml", "<opml/>", emptySet()) }
        val calls = mutableListOf<String>()
        val imported = importSubscriptions(selected.xml, setOf("known"), { calls += it })
        assertEquals(listOf("one"), calls)
        assertEquals(2, imported.processed)
        assertEquals(listOf(ImportPodcastResult("known"), ImportPodcastResult("one", added = true)), imported.results)
    }
    @Test fun `failed imports retry only failures and reimport skips completed podcasts`() {
        val xml = """<opml><body><outline xmlUrl="one"/><outline xmlUrl="bad"/></body></opml>"""
        val first = importSubscriptions(xml, emptySet(), { if (it == "bad") throw IOException() })
        assertEquals(LookupError.Offline, first.results.last().error)
        val retryXml = Opml.generate(first.summary.failed.map { app.podlist.domain.Subscription(it.feedUrl, it.feedUrl, it.feedUrl, null, null, null, 0, null, null, app.podlist.domain.PlaybackSettingsOverride()) })
        val calls = mutableListOf<String>()
        val retry = importSubscriptions(retryXml, setOf("one"), { calls += it })
        assertEquals(listOf("bad"), calls)
        assertEquals(1, retry.summary.added)
        val reimport = importSubscriptions(xml, setOf("one", "bad"), { error("duplicate") })
        assertEquals(2, reimport.summary.alreadySubscribed)
    }
}
