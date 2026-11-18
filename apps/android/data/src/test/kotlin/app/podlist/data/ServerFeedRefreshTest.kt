package app.podlist.data

import kotlinx.serialization.SerializationException
import org.junit.jupiter.api.Test
import kotlin.test.*

class ServerFeedRefreshTest {
    private fun server(http: SyncTransport, check: (ServerLibrary) -> Unit) {
        LocalDatabase(":memory:").use { db ->
            check(ServerLibrary(db, ServerAddress.parse("https://podlist.test", false), http))
        }
    }

    @Test fun `all feeds posts an empty request and decodes the checked and failed counts`() = server(
        http = SyncTransport { method, path, body ->
            assertEquals("POST", method)
            assertEquals("/api/library/refresh", path)
            assertNull(body)
            """{"checked":5,"updated":2,"notModified":2,"failed":1}"""
        }
    ) { source ->
        assertEquals(RefreshSummary(5, 2, 2, 1), source.refreshAllFeeds())
    }

    @Test fun `one podcast encodes its id as a path segment and decodes both success tags`() {
        for (result in listOf("""{"_tag":"NotModified"}""", """{"_tag":"Updated","added":2,"changed":1}""")) {
            var calls = 0
            server(http = SyncTransport { method, path, body ->
                calls++
                assertEquals("POST", method)
                assertEquals("/api/subscriptions/feed%20%2F%2B%3F%23/refresh", path)
                assertNull(body)
                result
            }) { source -> source.refreshSubscription("feed /+?#") }
            assertEquals(1, calls)
        }
    }

    @Test fun `rejects incomplete wire responses`() {
        server(http = SyncTransport { _, _, _ -> """{"checked":2,"failed":1}""" }) { source ->
            assertFailsWith<SerializationException> { source.refreshAllFeeds() }
        }
        server(http = SyncTransport { _, _, _ -> """{"_tag":"Updated","added":2}""" }) { source ->
            assertFailsWith<SerializationException> { source.refreshSubscription("s") }
        }
    }

    @Test fun `maps single-feed endpoint errors and passes through other HTTP failures`() {
        val missing = HttpFailure(404)
        server(http = SyncTransport { _, _, _ -> throw missing }) { source ->
            assertSame(missing, assertFailsWith<SubscriptionNotFound> { source.refreshSubscription("s") }.cause)
            assertSame(missing, assertFailsWith<HttpFailure> { source.refreshAllFeeds() })
        }
        val publisher = HttpFailure(502)
        server(http = SyncTransport { _, _, _ -> throw publisher }) { source ->
            assertSame(publisher, assertFailsWith<PublisherRefreshFailed> { source.refreshSubscription("s") }.cause)
        }
        val serverError = HttpFailure(503)
        server(http = SyncTransport { _, _, _ -> throw serverError }) { source ->
            assertSame(serverError, assertFailsWith<HttpFailure> { source.refreshSubscription("s") })
            assertSame(serverError, assertFailsWith<HttpFailure> { source.refreshAllFeeds() })
        }
    }

    @Test fun `feed refresh extends only the timeout for the refresh posts`() {
        assertEquals(600_000, serverReadTimeoutMillis("POST", "/api/library/refresh", 2_000))
        assertEquals(30_000, serverReadTimeoutMillis("POST", "/api/subscriptions/s/refresh", 2_000))
        assertEquals(2_000, serverReadTimeoutMillis("GET", "/api/library/refresh", 2_000))
        assertEquals(2_000, serverReadTimeoutMillis("GET", "/api/library/changes?since=0", 2_000))
        assertEquals(3_000, serverReadTimeoutMillis("POST", "/api/subscriptions", 3_000))
    }
}
