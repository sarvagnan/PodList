package app.podlist.data

import java.nio.file.Files
import java.io.IOException
import kotlin.test.*
import org.junit.jupiter.api.Test

class AudioFilesTest {
    @Test fun `download and bring-over owners serialize file and row commits across instances`() {
        val directory = Files.createTempDirectory("podlist-audio-lock").toFile()
        val acquired = java.util.concurrent.CountDownLatch(1)
        val release = java.util.concurrent.CountDownLatch(1)
        val secondEntered = java.util.concurrent.CountDownLatch(1)
        val failure = java.util.concurrent.atomic.AtomicReference<Throwable?>()
        val order = java.util.Collections.synchronizedList(mutableListOf<String>())
        val first = Thread {
            try { AudioFiles(directory).withCommitLock("episode") {
                order += "file"; acquired.countDown()
                check(release.await(5, java.util.concurrent.TimeUnit.SECONDS))
                order += "row"
            } } catch (error: Throwable) { failure.set(error) }
        }
        val second = Thread {
            try { AudioFiles(directory).withCommitLock("episode") { order += "other-owner"; secondEntered.countDown() } }
            catch (error: Throwable) { failure.set(error) }
        }
        try {
            first.start()
            assertTrue(acquired.await(5, java.util.concurrent.TimeUnit.SECONDS))
            second.start()
            assertFalse(secondEntered.await(100, java.util.concurrent.TimeUnit.MILLISECONDS))
            release.countDown()
            first.join(5000); second.join(5000)
            assertFalse(first.isAlive); assertFalse(second.isAlive)
            failure.get()?.let { throw it }
            assertEquals(listOf("file", "row", "other-owner"), order)
        } finally { release.countDown(); first.join(5000); second.join(5000); directory.deleteRecursively() }
    }

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
