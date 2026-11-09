package app.podlist.data

import app.podlist.domain.ProtocolJson
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import org.junit.jupiter.api.DynamicTest.dynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.*

class FeedVectorsTest {
    private val vectors = ProtocolJson.parseToJsonElement(Files.readString(Path.of(System.getProperty("podlist.protocol"), "feeds.json"))).jsonObject
    @TestFactory fun `shared RSS vectors`() = vectors.getValue("feeds").jsonArray.map { value ->
        val vector = value.jsonObject
        dynamicTest(vector.getValue("name").jsonPrimitive.content) {
            val xml = vector.getValue("xml").jsonPrimitive.content
            if (vector["error"]?.jsonPrimitive?.boolean == true) assertFails { parseFeed(xml) }
            else assertEquals(ProtocolJson.decodeFromJsonElement<ParsedFeed>(vector.getValue("expected")), parseFeed(xml))
        }
    }
    @TestFactory fun `shared duration vectors`() = vectors.getValue("durations").jsonArray.map { value ->
        val vector = value.jsonObject
        dynamicTest("duration ${vector["input"]}") {
            assertEquals(vector.getValue("expected").jsonPrimitive.doubleOrNull, parseDuration(vector.getValue("input").jsonPrimitive.contentOrNull))
        }
    }
    @Test fun `size limit measures UTF8 bytes`() {
        assertFails { parseFeed("<rss>${"é".repeat(FeedSizeLimit / 2)}</rss>") }
        assertFails { Opml.parse("<!DOCTYPE opml SYSTEM 'https://test/evil'><opml><body/></opml>") }
    }
}
