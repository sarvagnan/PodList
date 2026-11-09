package app.podlist.data

import java.nio.file.Files
import java.io.IOException
import kotlin.test.*
import org.junit.jupiter.api.Test

class AudioFilesTest {
    @Test fun `cancellation never starts a fallback transfer`() {
        val directory = Files.createTempDirectory("podlist-audio").toFile()
        try {
            val files = AudioFiles(directory)
            val attempts = mutableListOf<String>()
            assertFailsWith<AudioTransferCancelled> {
                files.save("e", listOf("host", "proxy")) { url, _ -> attempts += url; throw AudioTransferCancelled() }
            }
            assertEquals(listOf("host"), attempts)
            assertNull(files.stored("e"))
        } finally { directory.deleteRecursively() }
    }

    @Test fun `partial transfer is never stored and fallback commits complete bytes only`() {
        val directory = Files.createTempDirectory("podlist-audio").toFile()
        try {
            val files = AudioFiles(directory)
            val attempts = mutableListOf<String>()
            val bytes = files.save("e", listOf("host", "proxy"), transfer = { url, output ->
                attempts += url
                if (url == "host") { output.write(byteArrayOf(9)); throw IOException("interrupted") }
                output.write(byteArrayOf(1, 2, 3)); 3L
            })
            assertEquals(listOf("host", "proxy"), attempts)
            assertEquals(3L, bytes)
            assertContentEquals(byteArrayOf(1, 2, 3), files.stored("e")!!.readBytes())
            assertTrue(directory.listFiles()!!.none { it.name.endsWith(".part") })
        } finally { directory.deleteRecursively() }
    }
    @Test fun `all failures leave neither a stored file nor partial transfer`() {
        val directory = Files.createTempDirectory("podlist-audio").toFile()
        try {
            val files = AudioFiles(directory)
            assertFailsWith<IOException> { files.save("../e", listOf("host")) { _, out -> out.write(1); throw IOException() } }
            assertNull(files.stored("../e"))
            assertTrue(directory.listFiles()!!.isEmpty())
        } finally { directory.deleteRecursively() }
    }
}
