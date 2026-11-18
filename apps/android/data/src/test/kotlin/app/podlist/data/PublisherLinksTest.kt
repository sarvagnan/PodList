package app.podlist.data

import app.podlist.domain.*
import java.nio.file.Files
import org.junit.jupiter.api.Test
import kotlin.test.*

class PublisherLinksTest {
    private val xml = """<rss><channel><title>Deep Field</title><link>https://podcast.test</link>
        <atom:link href="https://podcast.test/rss"/><item><title>Galaxies</title><guid>opaque-id</guid>
        <link>https://podcast.test/galaxies</link><enclosure url="https://cdn.test/galaxies.mp3"/>
        </item></channel></rss>"""
    @Test fun `channel and item links survive parsing preview storage reopen and catalogue refresh`() {
        val parsed = parseFeed(xml)
        assertEquals("https://podcast.test", parsed.link)
        assertEquals("https://podcast.test/galaxies", parsed.episodes.single().link)
        val preview = podcastEpisodeRows(parsed).single()
        assertEquals(parsed.link, preview["podcast_website_url"])
        assertEquals(parsed.episodes.single().link, preview["website_url"])
        val file = Files.createTempFile("publisher-links", ".sqlite")
        try {
            LocalDatabase(file.toString(), standalone = true).use { db ->
                val source = DeviceLibrary(db, PublisherTransport { _, _ -> PublisherResponse(200, xml) })
                source.subscribe("https://podcast.test/rss")
            }
            LocalDatabase(file.toString()).use { db ->
                val sub = db.query("SELECT * FROM subscription").single()
                val episode = db.podcastEpisodes(sub["id"] as String).single()
                assertEquals(parsed.link, sub["website_url"])
                assertEquals(parsed.link, episode["podcast_website_url"])
                assertEquals(parsed.episodes.single().link, episode["website_url"])
                assertEquals("https://podcast.test/rss", episode["feed_url"])
                // The old server catalogue omits links. Upsert must retain Android's known links.
                db.upsertLibrary(emptyList(), listOf(Episode(episode["id"] as String, sub["id"] as String, "opaque-id", "Galaxies", "", 0, null, "https://cdn.test/galaxies.mp3", null, emptyList(), null)))
                assertEquals(parsed.episodes.single().link, db.podcastEpisodes(sub["id"] as String).single()["website_url"])
            }
        } finally { Files.deleteIfExists(file) }
    }
    @Test fun `old server read responses decode with absent optional link fields`() {
        val old = """{"title":"Old feed","author":null,"description":null,"artworkUrl":null,"episodes":[]}"""
        assertNull(ProtocolJson.decodeFromString<ParsedFeed>(old).link)
    }

    @Test fun `server catalogue replay fills share links and distinguishes omission from removal`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.setMeta("catalogueCursor", "8")
            val sub = Subscription("s", "https://podcast.test/rss", "Deep Field", null, null, null, 0, null, null, PlaybackSettingsOverride())
            val ep = Episode("e", sub.id, "opaque-id", "Galaxies", "", 0, null, "https://cdn.test/galaxies.mp3", null, emptyList(), null)
            db.upsertLibrary(listOf(sub), listOf(ep))
            val podcast = "https://podcast.test"
            val page = "https://podcast.test/galaxies"
            val known = LibraryPage(8, listOf(sub.copy(websiteUrl = WebsiteUrl.Published(podcast))), listOf(ep.copy(websiteUrl = WebsiteUrl.Published(page))), false)
            val omitted = LibraryPage(9, listOf(sub), listOf(ep), false)
            val cleared = LibraryPage(10, listOf(sub.copy(websiteUrl = WebsiteUrl.Published(null))), listOf(ep.copy(websiteUrl = WebsiteUrl.Published(null))), false)
            val sync = SyncClient(db, SyncTransport { _, path, body -> when (path) {
                "/api/devices" -> body!!
                "/api/sync/pull?since=0" -> ProtocolJson.encodeToString(PullPage(1, State.initial(), emptyList()))
                "/api/sync/pull?since=1" -> ProtocolJson.encodeToString(PullPage(1, null, emptyList()))
                "/api/library/changes?since=0" -> ProtocolJson.encodeToString(known)
                "/api/library/changes?since=8" -> ProtocolJson.encodeToString(omitted)
                "/api/library/changes?since=9" -> ProtocolJson.encodeToString(cleared)
                else -> error("Unexpected request $path")
            } })
            fun shareLinks(): Pair<String?, String?> {
                val row = db.podcastEpisodes(sub.id).single()
                val website = row["podcast_website_url"] as? String
                return ShareLinks.podcast(website, sub.feedUrl) to ShareLinks.episode(
                    row["website_url"] as? String, website, sub.feedUrl, ep.audioUrl
                )
            }
            sync.sync()
            assertEquals(podcast to page, shareLinks())
            sync.sync()
            assertEquals(podcast to page, shareLinks())
            sync.sync()
            assertEquals(sub.feedUrl to sub.feedUrl, shareLinks())
            assertEquals("10", db.getMeta("catalogueCursor"))
        }
    }
}
