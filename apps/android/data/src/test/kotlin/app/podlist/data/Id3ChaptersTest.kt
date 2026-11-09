package app.podlist.data

import app.podlist.domain.Chapter
import org.junit.jupiter.api.Test
import kotlin.test.*

private fun id3(version: Int): ByteArray {
    fun size(n: Int): ByteArray = if (version == 4) byteArrayOf((n shr 21 and 127).toByte(), (n shr 14 and 127).toByte(), (n shr 7 and 127).toByte(), (n and 127).toByte())
        else byteArrayOf((n ushr 24).toByte(), (n ushr 16).toByte(), (n ushr 8).toByte(), n.toByte())
    fun frame(id: String, body: ByteArray) = id.toByteArray() + size(body.size) + byteArrayOf(0, 0) + body
    val title = frame("TIT2", byteArrayOf(3) + "Chapter café".toByteArray())
    val chap = frame("CHAP", "ch1".toByteArray() + byteArrayOf(0, 0, 0, 3, -24) + ByteArray(12) + title)
    // Both fixture tags are small enough for syncsafe and big-endian sizes to agree.
    return "ID3".toByteArray() + byteArrayOf(version.toByte(), 0, 0) + size(chap.size) + chap
}
class Id3ChaptersTest {
    @Test fun `reads ID3v23 and v24 CHAP frames with UTF8 titles`() {
        for (version in listOf(3, 4)) assertEquals(listOf(Chapter(1.0, "Chapter café", null, null)), id3Chapters(id3(version)))
    }
    @Test fun `truncated and unrelated audio never become Chapters`() {
        assertTrue(id3Chapters(byteArrayOf(1, 2, 3)).isEmpty())
        assertTrue(id3Chapters(id3(4).copyOf(20)).isEmpty())
        assertTrue(id3Chapters(id3(4).also { it[14] = 127; it[15] = 127; it[16] = 127; it[17] = 127 }).isEmpty())
    }
    @Test fun `missing JSON falls back to bounded publisher audio and caches the result`() {
        LocalDatabase(":memory:", standalone = true).use { db ->
            db.ensureState()
            val requests = mutableListOf<Pair<String, Map<String, String>>>()
            val library = DeviceLibrary(db, PublisherTransport { url, headers ->
                requests += url to headers
                if (url.endsWith("rss")) PublisherResponse(200, "<rss><channel><title>S</title><item><enclosure url='https://test/audio'/></item></channel></rss>")
                else PublisherResponse(206, "", bytes = id3(4))
            })
            library.subscribe("https://test/rss")
            val episode = db.query("SELECT id FROM episode").single()["id"] as String
            assertEquals("Chapter café", library.chapters(episode).single().title)
            assertEquals("bytes=0-${Id3ProbeBytes - 1}", requests.last().second["Range"])
            library.chapters(episode)
            assertEquals(2, requests.size)
        }
    }
}
