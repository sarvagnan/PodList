package app.podlist.data

import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import kotlin.test.*

class PublisherHttpTest {
    @Test fun `publisher HTTP uses generic identity follows redirects and caps range probes`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val userAgents = mutableListOf<String>()
        server.createContext("/redirect") { exchange ->
            userAgents += exchange.requestHeaders.getFirst("User-Agent")
            exchange.responseHeaders.add("Location", "/rss")
            exchange.sendResponseHeaders(302, -1)
            exchange.close()
        }
        server.createContext("/rss") { exchange ->
            userAgents += exchange.requestHeaders.getFirst("User-Agent")
            val bytes = "<rss><channel><title>Podcast</title></channel></rss>".toByteArray()
            exchange.responseHeaders.add("ETag", "version-one")
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.createContext("/audio") { exchange ->
            assertEquals("bytes=0-${Id3ProbeBytes - 1}", exchange.requestHeaders.getFirst("Range"))
            val bytes = ByteArray(Id3ProbeBytes + 100)
            exchange.sendResponseHeaders(200, bytes.size.toLong()) // Publisher ignores Range.
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        try {
            val base = "http://127.0.0.1:${server.address.port}"
            val http = PublisherHttp()
            val response = http.get("$base/redirect", emptyMap())
            assertEquals("Podcast", parseFeed(response.body).title)
            assertEquals("version-one", response.etag)
            assertEquals(listOf("PodList Android", "PodList Android"), userAgents)
            val probe = http.get("$base/audio", mapOf("Range" to "bytes=0-${Id3ProbeBytes - 1}"))
            assertEquals(Id3ProbeBytes, probe.bytes!!.size)
            assertTrue(probe.body.isEmpty())
            assertFails { http.get("file:///etc/passwd", emptyMap()) }
            assertFails { http.get("http://personal:secret@127.0.0.1/rss", emptyMap()) }
        } finally { server.stop(0) }
    }
    @Test fun `full responses over the size limit fail before XML parsing`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            val bytes = ByteArray(FeedSizeLimit + 1)
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        try { assertFails { PublisherHttp().get("http://127.0.0.1:${server.address.port}/", emptyMap()) } }
        finally { server.stop(0) }
    }
}
