package app.podlist.data

import org.junit.jupiter.api.Test
import kotlin.test.*

class ConnectionTest {
    @Test fun `server address is an HTTPS origin except debug emulator HTTP`() {
        assertEquals("https://podlist.example:8443", ServerAddress.parse("  https://podlist.example:8443/ ", false).origin)
        assertEquals("http://10.0.2.2:3000", ServerAddress.parse("http://10.0.2.2:3000", true).origin)
        for (address in listOf("http://10.0.2.2", "http://example.test", "https://user:password@example.test", "https://example.test/api", "https://example.test?token=x", "https://example.test/#x", "file:///tmp/server", "example.test")) {
            assertFailsWith<IllegalArgumentException>(address) { ServerAddress.parse(address, false) }
        }
        assertFailsWith<IllegalArgumentException> { ServerAddress.parse("http://example.test", true) }
    }

    @Test fun `health validates PodList response without inventing version negotiation`() {
        var request: String? = null
        val health = checkHealth(SyncTransport { method, path, body ->
            assertNull(body)
            request = "$method $path"
            """{"status":"ok","protocolVersion":99,"release":"demo"}"""
        })
        assertEquals("GET /api/health", request)
        assertEquals(99, health.protocolVersion)
        assertFailsWith<SyncResponseFailure> {
            checkHealth(SyncTransport { _, _, _ -> """{"status":"failed","protocolVersion":4}""" })
        }
        assertFails { checkHealth(SyncTransport { _, _, _ -> "not JSON" }) }
    }
}
