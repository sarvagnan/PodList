package app.podlist.data

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.jupiter.api.Test
import kotlin.test.*

class DraftWriteBufferTest {
    @Test fun `typing coalesces off caller thread and stop flush makes latest raw text durable`() {
        LocalDatabase(":memory:").use { db ->
            val store = FormDraftStore(db)
            val caller = Thread.currentThread()
            var writerThread: Thread? = null
            var writes = 0
            DraftWriteBuffer(60_000) { batch -> writerThread = Thread.currentThread(); writes++; store.putAll(batch) }.use { buffer ->
                buffer.put("new-playlist/name", "C")
                buffer.put("new-playlist/name", "  Commute  ")
                buffer.put("view:id/mentions", "night")
                assertTrue(store.load().isEmpty())
                buffer.flush()
                assertNotEquals(caller, writerThread)
                assertEquals(1, writes)
                assertEquals("  Commute  ", store.load()["new-playlist/name"])
                assertEquals("night", store.load()["view:id/mentions"])
                // Clearing cannot race with a delayed write and resurrect the draft.
                store.clear("new-playlist/")
                buffer.flush()
                assertNull(store.load()["new-playlist/name"])
            }
        }
    }
    @Test fun `idle debounce persists and disposal flushes without waiting for timeout`() {
        val written = CountDownLatch(1)
        val batches = java.util.concurrent.CopyOnWriteArrayList<Map<String, String>>()
        val buffer = DraftWriteBuffer(30) { batches += it; written.countDown() }
        buffer.put("name", "First")
        assertTrue(written.await(2, TimeUnit.SECONDS))
        buffer.put("name", "Second")
        buffer.close()
        buffer.flush() // Child disposal can follow parent disposal.
        assertEquals("Second", batches.last()["name"])
    }
    @Test fun `failed writes remain recoverable and newer raw input wins on retry`() {
        var fail = true
        var saved = emptyMap<String, String>()
        DraftWriteBuffer(60_000) { if (fail) error("disk unavailable") else saved = it }.use { buffer ->
            buffer.put("name", "First")
            assertFailsWith<IllegalStateException> { buffer.flush() }
            buffer.put("name", "Second")
            fail = false
            buffer.flush()
            assertEquals("Second", saved["name"])
        }
    }
}
