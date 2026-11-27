package app.podlist.data

import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

/** Coalesces typing and orders durability barriers and draft edits on one worker. */
class DraftWriteBuffer(
    private val delayMillis: Long = 250,
    private val onFailure: (Exception) -> Unit = {},
    baseline: String? = null,
    private val write: (Map<String, String>, String) -> Unit,
) : AutoCloseable {
    private val worker = Executors.newSingleThreadScheduledExecutor { task ->
        Thread(task, "PodList drafts").apply { isDaemon = true }
    }
    private data class Edit(val sequence: Long, val text: String)
    private val writerId = UUID.randomUUID().toString()
    private val pending = linkedMapOf<String, Edit>()
    private val uncommitted = linkedMapOf<String, Edit>()
    private val retry = linkedMapOf<String, Edit>() // Worker only.
    private var recoveryBaseline = baseline
    private var sequence = 0L
    private var scheduled: ScheduledFuture<*>? = null
    private var closed = false
    private var debounce = 0L

    fun put(key: String, text: String) = putAll(mapOf(key to text))

    @Synchronized fun putAll(values: Map<String, String>) {
        check(!closed)
        values.forEach { (key, text) ->
            val edit = Edit(++sequence, text)
            pending[key] = edit
            uncommitted[key] = edit
        }
        scheduled?.cancel(false)
        val generation = ++debounce
        scheduled = worker.schedule({
            val batch = synchronized(this) {
                if (generation != debounce) return@schedule
                takePending()
            }
            reportFailure { persist(batch) }
        }, delayMillis, TimeUnit.MILLISECONDS)
    }

    private fun takePending(): Map<String, Edit> = pending.toMap().also { pending.clear() }

    private fun persist(batch: Map<String, Edit>) {
        retry.putAll(batch)
        if (retry.isEmpty()) return
        try {
            val through = retry.values.maxOf { it.sequence }
            write(retry.mapValues { it.value.text }, revision(through))
            retry.clear()
            synchronized(this) { uncommitted.values.removeAll { it.sequence <= through } }
        } catch (error: Exception) {
            throw IllegalStateException("Could not save drafts", error)
        }
    }

    private fun reportFailure(block: () -> Unit) {
        try { block() } catch (error: Exception) { onFailure(error) }
    }

    @Synchronized private fun submit(task: (Map<String, Edit>) -> Unit): Boolean {
        if (closed) return false
        debounce++
        scheduled?.cancel(false)
        scheduled = null
        val batch = takePending()
        worker.execute { task(batch) }
        return true
    }

    private fun revision(through: Long) = "$writerId:$through"

    @Synchronized fun updateRecoveryBaseline(revision: String?) { recoveryBaseline = revision }

    /** Android can save edits whose disk commit has not finished when it saves the task. */
    @Synchronized fun checkpoint(): DraftCheckpoint? {
        if (uncommitted.isEmpty()) return null
        return DraftCheckpoint(recoveryBaseline, revision(sequence), uncommitted.mapValues { it.value.text })
    }

    /** Expedite persistence from lifecycle callbacks. The worker can outlive the caller. */
    @Synchronized fun requestFlush() {
        if (uncommitted.isNotEmpty()) submit { batch -> reportFailure { persist(batch) } }
    }

    /** Queue an ordered edit after all text submitted so far. */
    fun enqueue(action: () -> Unit) {
        check(submit { batch -> reportFailure { persist(batch); action() } })
    }

    /** Wait for an ordered edit without blocking the caller's thread. */
    suspend fun <T> afterFlush(action: () -> T): T = suspendCoroutine { continuation ->
        if (!submit { batch -> continuation.resumeWith(runCatching { persist(batch); action() }) }) {
            continuation.resumeWithException(IllegalStateException("Draft writer closed"))
        }
    }

    suspend fun flush() = afterFlush {}

    override fun close() = closeAfterFlush {}

    @Synchronized fun closeAfterFlush(onClosed: () -> Unit) {
        if (!submit { batch ->
            try { reportFailure { persist(batch) } } finally { onClosed() }
        }) return
        closed = true
        worker.shutdown()
    }
}

data class DraftCheckpoint(val baseline: String?, val revision: String, val values: Map<String, String>) {
    fun follows(durable: String?): Boolean {
        if (durable == revision) return false
        if (durable == baseline) return true
        if (durable == null || durable.substringBefore(':') != revision.substringBefore(':')) return false
        val previous = durable.substringAfter(':').toLongOrNull() ?: return false
        return previous < (revision.substringAfter(':').toLongOrNull() ?: return false)
    }
}
