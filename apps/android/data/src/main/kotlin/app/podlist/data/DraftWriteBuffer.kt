package app.podlist.data

import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

/** Coalesces typing; all persistence runs on one worker, including the final durability barrier. */
class DraftWriteBuffer(private val delayMillis: Long = 250, private val write: (Map<String, String>) -> Unit) : AutoCloseable {
    private val worker = Executors.newSingleThreadScheduledExecutor { task -> Thread(task, "PodList drafts").apply { isDaemon = true } }
    private val pending = linkedMapOf<String, String>()
    private var scheduled: ScheduledFuture<*>? = null
    private var failure: Throwable? = null
    private var closed = false

    @Synchronized fun put(key: String, text: String) {
        pending[key] = text
        scheduled?.cancel(false)
        scheduled = worker.schedule({ drain() }, delayMillis, TimeUnit.MILLISECONDS)
    }

    private fun drain() {
        val batch = synchronized(this) { pending.toMap().also { pending.clear() } }
        if (batch.isEmpty()) return
        try { write(batch); synchronized(this) { failure = null } }
        catch (error: Throwable) { synchronized(this) {
            batch.forEach { (key, value) -> pending.putIfAbsent(key, value) }
            failure = error
        } }
    }

    /** Call on Stop, disposal and before clearing/reconciling. Never writes on the caller's thread. */
    fun flush() {
        synchronized(this) { if (closed) return; scheduled?.cancel(false); scheduled = null }
        worker.submit { drain() }.get()
        synchronized(this) { failure?.let { throw IllegalStateException("Could not save drafts", it) } }
    }

    override fun close() { flush(); synchronized(this) { closed = true }; worker.shutdown() }
}
