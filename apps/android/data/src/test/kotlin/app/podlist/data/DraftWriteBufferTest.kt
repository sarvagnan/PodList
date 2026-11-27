package app.podlist.data

import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine
import kotlin.test.*
import org.junit.jupiter.api.Test

class DraftWriteBufferTest {
    @Test fun `stop expedites typing without waiting for the database and suspend flush awaits durability`() {
        LocalDatabase(":memory:").use { db ->
            val store = FormDraftStore(db)
            val caller = Thread.currentThread()
            val started = CountDownLatch(1)
            val release = CountDownLatch(1)
            var writerThread: Thread? = null
            var writes = 0
            DraftWriteBuffer(60_000) { batch, _ ->
                writerThread = Thread.currentThread()
                writes++
                started.countDown()
                check(release.await(5, TimeUnit.SECONDS))
                store.putAll(batch)
            }.use { buffer ->
                buffer.put("new-playlist/name", "C")
                buffer.put("new-playlist/name", "  Commute  ")
                buffer.put("view:id/mentions", "night")
                assertTrue(store.load().isEmpty())
                buffer.requestFlush()
                assertTrue(started.await(2, TimeUnit.SECONDS))
                val flushed = start { buffer.flush() }
                try {
                    assertFalse(flushed.isDone)
                    assertNotEquals(caller, writerThread)
                } finally { release.countDown() }
                flushed.get(2, TimeUnit.SECONDS)
                assertEquals(1, writes)
                assertEquals("  Commute  ", store.load()["new-playlist/name"])
                assertEquals("night", store.load()["view:id/mentions"])
            }
        }
    }

    @Test fun `ordered edits do not consume text entered after the edit was queued`() {
        val values = mutableMapOf<String, String>()
        DraftWriteBuffer(60_000, write = { batch, _ -> values.putAll(batch) }).use { buffer ->
            buffer.put("name", "Before")
            buffer.enqueue { values.clear() }
            buffer.put("name", "After")
            start { buffer.flush() }.get(2, TimeUnit.SECONDS)
            assertEquals("After", values["name"])
        }
    }

    @Test fun `idle debounce persists and close expedites the last batch`() {
        val written = CountDownLatch(1)
        val closed = CountDownLatch(1)
        val batches = java.util.concurrent.CopyOnWriteArrayList<Map<String, String>>()
        val buffer = DraftWriteBuffer(30) { batch, _ ->
            batches += batch
            if (batch["name"] == "First") written.countDown() else closed.countDown()
        }
        buffer.put("name", "First")
        assertTrue(written.await(2, TimeUnit.SECONDS))
        buffer.put("name", "Second")
        buffer.close()
        buffer.requestFlush()
        assertTrue(closed.await(2, TimeUnit.SECONDS))
        assertEquals("Second", batches.last()["name"])
    }

    @Test fun `failed writes remain recoverable and newer raw input wins on retry`() {
        var fail = true
        var saved = emptyMap<String, String>()
        DraftWriteBuffer(60_000) { batch, _ -> if (fail) error("disk unavailable") else saved = batch }.use { buffer ->
            buffer.put("name", "First")
            val failure = start { runCatching { buffer.flush() }.exceptionOrNull() }.get(2, TimeUnit.SECONDS)
            assertIs<IllegalStateException>(failure)
            buffer.put("name", "Second")
            fail = false
            start { buffer.flush() }.get(2, TimeUnit.SECONDS)
            assertEquals("Second", saved["name"])
        }
    }

    @Test fun `task checkpoint recovers an uncommitted edit but cannot overwrite a later disk commit`() {
        LocalDatabase(":memory:").use { db ->
            val store = FormDraftStore(db)
            DraftWriteBuffer(60_000, write = store::putCheckpoint).use { buffer ->
                buffer.put("name", "First")
                val recovery = assertNotNull(buffer.checkpoint())
                store.restoreCheckpoint(recovery)
                assertEquals("First", store.load()["name"])
                buffer.put("name", "Latest")
                start { buffer.flush() }.get(2, TimeUnit.SECONDS)
                store.restoreCheckpoint(recovery)
                assertEquals("Latest", store.load()["name"])
            }
        }
    }

    private fun <T> start(block: suspend () -> T): CompletableFuture<T> {
        val future = CompletableFuture<T>()
        block.startCoroutine(object : Continuation<T> {
            override val context = EmptyCoroutineContext
            override fun resumeWith(result: Result<T>) {
                result.fold(future::complete, future::completeExceptionally)
            }
        })
        return future
    }
}
