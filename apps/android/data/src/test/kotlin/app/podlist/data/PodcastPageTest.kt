package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import org.junit.jupiter.api.Test
import kotlin.test.*

class PodcastPageTest {
    private val url = "https://podcast.test/feed"
    private val xml = """<rss><channel><title>Deep Field</title><itunes:author>Deep Field Audio</itunes:author><description>Space</description>
        <item><guid>one</guid><title>Counting galaxies</title><description>Night skies</description><enclosure url="https://podcast.test/one"/></item>
        <item><guid>two</guid><title>Stars</title><description>Galaxies by hand</description><enclosure url="https://podcast.test/two"/></item></channel></rss>"""
    private val view = View("all", "All", ViewFilter(), ViewSort.PublishedDesc, null)

    @Test fun `read is transient and search matches title and available notes without case or locale dependence`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            val source = DeviceLibrary(db, PublisherTransport { _, _ -> PublisherResponse(200, xml) })
            val feed = source.readPodcast(url)
            assertEquals("Deep Field Audio", feed.author)
            assertTrue(db.query("SELECT * FROM subscription").isEmpty())
            val rows = podcastEpisodeRows(feed)
            assertEquals(2, filterPodcastEpisodes(rows, "  GALAXIES  ").size)
            assertEquals(listOf("one"), filterPodcastEpisodes(rows, "NIGHT").map { it["guid"] })
            assertEquals(PodcastEpisodeCount(1, 2, true), podcastEpisodeCount(rows, "night"))
            assertEquals(PodcastEpisodeCount(2, 2, false), podcastEpisodeCount(rows, " "))
            assertEquals(PodcastEpisodeCount(0, 2, true), podcastEpisodeCount(rows, "missing"))
            assertEquals(PodcastEpisodeCount(0, 0, false), podcastEpisodeCount(emptyList(), ""))
            assertEquals(1, filterPodcastEpisodes(listOf(mapOf("title" to "TITLE")), "title").size)
        }
    }
    @Test fun `single Episode is idempotent Orphaned polling skips it and Subscribe reveals the same Episode`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            var requests = 0
            val source = DeviceLibrary(db, PublisherTransport { _, _ -> requests++; PublisherResponse(200, xml) }) { 100 }
            val id = source.bringEpisode(url, "one")
            assertEquals(id, source.bringEpisode(url, "one"))
            assertEquals(1, db.query("SELECT * FROM episode").size)
            val sub = db.query("SELECT * FROM subscription").single()
            assertFalse(podcastIsSubscribed(sub))
            assertTrue(db.evaluate(view, 0).isEmpty())
            val undo = db.reversibleEdit(listOf(Change.AddEntry("default", id, Placement.Last)), 100)
            assertEquals(listOf(id), db.evaluate(view, 0).map { it["id"] })
            val beforePoll = requests
            source.refresh()
            assertEquals(beforePoll, requests)
            db.reversibleEdit(undo, 101)
            assertTrue(db.evaluate(view, 0).isEmpty())
            assertEquals(1, db.podcastEpisodes(sub["id"] as String).size)
            val subscribed = source.subscribe(url)
            assertEquals(sub["id"], subscribed.id)
            assertNull(subscribed.unsubscribedAt)
            assertEquals(2, db.evaluate(view, 0).size)
            assertEquals(id, db.query("SELECT id FROM episode WHERE guid = 'one'").single()["id"])
            assertEquals(id, source.bringEpisode(url, "one"))
            assertTrue(podcastIsSubscribed(db.query("SELECT * FROM subscription").single()))
            source.unsubscribe(subscribed.id)
            assertEquals(2, db.podcastEpisodes(subscribed.id).size)
            assertFalse(podcastIsSubscribed(db.query("SELECT * FROM subscription").single()))
            assertFalse(podcastIsSubscribed(null))
        }
    }
    @Test fun `failed imports leave no partial local rows`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            val source = DeviceLibrary(db, PublisherTransport { _, _ -> PublisherResponse(200, xml) })
            assertFails { source.bringEpisode(url, "absent") }
            assertTrue(db.query("SELECT * FROM subscription").isEmpty())
            assertTrue(db.query("SELECT * FROM episode").isEmpty())
        }
    }
    @Test fun `different guids sharing audio remain separate and failed insertion rolls back the Subscription`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            val source = DeviceLibrary(db, PublisherTransport { _, _ -> PublisherResponse(200, xml.replace("https://podcast.test/two", "https://podcast.test/one")) })
            val first = source.bringEpisode(url, "one")
            val second = source.bringEpisode(url, "two")
            assertNotEquals(first, second)
            assertEquals(2, db.query("SELECT * FROM episode").size)
            db.execute("CREATE TRIGGER reject_episode BEFORE INSERT ON episode BEGIN SELECT RAISE(ABORT, 'test failure'); END")
            assertFails { source.bringEpisode("https://podcast.test/another-feed", "one") }
            assertEquals(1, db.query("SELECT * FROM subscription").size)
            assertEquals(2, db.query("SELECT * FROM episode").size)
        }
    }
    @Test fun `Unsubscribe page and search result routes survive local context restoration`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            val source = DeviceLibrary(db, PublisherTransport { _, _ -> PublisherResponse(200, xml) })
            source.bringEpisode(url, "one")
            val id = db.query("SELECT * FROM subscription").single()["id"] as String
            val context = BrowsingContext("Library", mapOf("Library" to listOf("add-podcasts", "podcast:encoded-result", "subscription:$id")))
            db.saveBrowsingContext(context)
            assertEquals(context, db.loadBrowsingContext())
        }
    }
    @Test fun `older server endpoints fail as plain classified errors without creating local records`() {
        LocalDatabase(":memory:").use { db ->
            val source = ServerLibrary(db, ServerAddress.parse("https://server.test", false), SyncTransport { _, _, _ -> throw HttpFailure(404) })
            assertEquals(LookupError.Server, classifyLookup(assertFailsWith<HttpFailure> { source.readPodcast(url) }))
            assertEquals(LookupError.Server, classifyLookup(assertFailsWith<HttpFailure> { source.bringEpisode(url, "one") }))
            assertTrue(db.query("SELECT * FROM subscription").isEmpty())
            assertTrue(db.query("SELECT * FROM episode").isEmpty())
        }
    }
    @Test fun `server lookup and import use new endpoints and ordinary sync before returning an Episode id`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val subscription = Subscription("s", url, "Deep Field", null, null, null, 0, 1, null, PlaybackSettingsOverride())
            val episode = Episode("e", "s", "one", "Counting galaxies", "Notes", 0, null, "https://podcast.test/one", null, emptyList(), null)
            val requests = mutableListOf<String>()
            val source = ServerLibrary(db, ServerAddress.parse("https://server.test", false), SyncTransport { method, path, body ->
                requests += "$method $path"
                when {
                    path == "/api/podcasts/read" -> { assertEquals(mapOf("feedUrl" to url), ProtocolJson.decodeFromString<Map<String, String>>(body!!)); ProtocolJson.encodeToString(parseFeed(xml)) }
                    path == "/api/podcasts/episodes" -> { assertEquals(mapOf("feedUrl" to url, "guid" to "one"), ProtocolJson.decodeFromString<Map<String, String>>(body!!)); ProtocolJson.encodeToString(BroughtEpisode("s", "e")) }
                    path == "/api/devices" -> body!!
                    path.startsWith("/api/sync/pull") -> ProtocolJson.encodeToString(PullPage(0, State.initial(), emptyList()))
                    path.startsWith("/api/library/changes") -> ProtocolJson.encodeToString(LibraryPage(1, listOf(subscription), listOf(episode), false))
                    else -> error("Unexpected $path")
                }
            })
            assertEquals(2, source.readPodcast(url).episodes.size)
            assertEquals("e", source.bringEpisode(url, "one"))
            assertEquals("e", db.podcastEpisodes("s").single()["id"])
            assertTrue(requests.contains("GET /api/library/changes?since=0"))
            assertFalse(podcastIsSubscribed(db.query("SELECT * FROM subscription").single()))
        }
    }
}
