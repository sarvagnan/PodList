package app.podlist

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaybackEventQueueTest {
    @Test fun transportOvertakesPendingTicksAndTicksConflate() = runBlocking {
        val events = PlaybackEventQueue()
        val handled = mutableListOf<String>()
        val refresh: suspend () -> Unit = { handled += "refresh" }
        val tick: () -> Unit = { handled += "tick" }

        repeat(100) { events.tick() }
        events.refresh()
        events.transition { handled += "boundary" }
        events.command { handled += "pause" }
        events.command { handled += "seek" }

        withTimeout(2_000) {
            repeat(5) { events.next(refresh, tick)() }
            assertNull(withTimeoutOrNull(50) { events.next(refresh, tick) })
            events.command { handled += "play" }
            events.next(refresh, tick)()
        }
        assertEquals(listOf("pause", "seek", "boundary", "refresh", "tick", "play"), handled)
    }

    @Test fun tickPersistenceDoesNotBlockTransportAndSurvivesItsCaller() = runBlocking {
        val caller = Thread.currentThread()
        val application = CoroutineScope(SupervisorJob())
        val service = CoroutineScope(SupervisorJob())
        val started = CountDownLatch(1)
        val release = CountDownLatch(1)
        val errors = mutableListOf<Exception>()
        val writes = PlaybackWrites(application) { errors.add(it) }
        val events = PlaybackEventQueue()
        var writeThread: Thread? = null
        try {
            var paused = false
            events.tick()
            val tick: () -> Unit = {
                writes.submit {
                    writeThread = Thread.currentThread()
                    started.countDown()
                    check(release.await(5, TimeUnit.SECONDS))
                }
            }
            val refresh: suspend () -> Unit = {}
            withTimeout(2_000) { events.next(refresh, tick)() }
            assertTrue(started.await(2, TimeUnit.SECONDS))
            val teardown = writes.submit {}
            val waiter = service.launch(start = CoroutineStart.UNDISPATCHED) { teardown.await() }
            service.cancel()
            waiter.join()
            assertTrue(waiter.isCancelled)
            events.command { paused = true }
            withTimeout(2_000) { events.next(refresh, tick)() }
            assertTrue(paused)
            assertFalse(teardown.isCompleted)
            assertNotEquals(caller, writeThread)
            release.countDown()
            withTimeout(2_000) { teardown.await() }
            assertTrue(errors.isEmpty())
        } finally {
            release.countDown()
            service.cancel()
            application.cancel()
        }
    }
}
