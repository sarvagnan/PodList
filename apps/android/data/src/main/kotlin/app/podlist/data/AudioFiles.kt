package app.podlist.data

import java.io.File
import java.io.IOException
import java.io.OutputStream
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

class AudioTransferCancelled : java.io.InterruptedIOException("Transfer cancelled")

/** Files are atomically renamed only after a successful, complete transfer. IDs are never paths. */
class AudioFiles(private val directory: File) {
    companion object { private val commits = ConcurrentHashMap<String, ReentrantLock>() }
    init { check(directory.mkdirs() || directory.isDirectory) }
    private fun target(id: String) = File(directory, MessageDigest.getInstance("SHA-256").digest(id.toByteArray()).joinToString("") { "%02x".format(it) } + ".audio")
    /** A file and its database row have different owners. Serialize their combined commit with
     * any download worker or bring-over copy for this origin/Episode, across AudioFiles instances.
     */
    fun <T> withCommitLock(id: String, block: () -> T): T = commits.computeIfAbsent(target(id).absolutePath) { ReentrantLock() }.withLock(block)
    fun stored(id: String): File? = target(id).takeIf { it.isFile }
    /** Copy, never rename the original: both Libraries must remain usable after bring-over.
     * The destination's normal partial-file/atomic-commit path also makes an interrupted copy safe.
     */
    fun copyTo(id: String, destination: AudioFiles, destinationId: String, expectedBytes: Long) {
        val original = stored(id) ?: throw IOException("Stored download is missing: $id")
        if (original.length() != expectedBytes) throw IOException("Stored download is incomplete: $id")
        destination.save(destinationId, listOf("stored")) { _, output -> original.inputStream().use { it.copyTo(output) } }
    }
    fun remove(id: String) { val file = target(id); check(!file.exists() || file.delete()) }
    fun clearPartials() { directory.listFiles().orEmpty().filter { it.name.endsWith(".part") }.forEach { it.delete() } }
    fun save(id: String, candidates: List<String>, transfer: (String, OutputStream) -> Long): Long {
        var failure: IOException? = null
        for (url in candidates.distinct()) {
            val partial = File.createTempFile("audio-", ".part", directory)
            try {
                val bytes = partial.outputStream().use { transfer(url, it) }
                if (bytes <= 0 || partial.length() != bytes) throw IOException("Incomplete audio transfer")
                if (!partial.renameTo(target(id))) throw IOException("Cannot commit audio file")
                return bytes
            } catch (error: AudioTransferCancelled) { throw error }
            catch (error: IOException) { failure = error }
            finally { partial.delete() }
        }
        throw failure ?: IOException("No audio source")
    }
}
