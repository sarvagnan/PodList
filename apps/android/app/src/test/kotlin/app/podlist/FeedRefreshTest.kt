package app.podlist

import app.podlist.data.RefreshSummary
import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class FeedRefreshTest {
    @Test fun `waits for the feed request and sync and rejects another refresh until both finish`() = runBlocking {
        val refresh = FeedRefresh()
        val reply = CompletableDeferred<RefreshSummary>()
        val syncing = CompletableDeferred<Unit>()
        val synced = CompletableDeferred<Unit>()
        val target = FeedRefreshTarget.All
        val attempt = async(start = CoroutineStart.UNDISPATCHED) {
            refresh.run(target, refresh = { reply.await() }, sync = {
                syncing.complete(Unit)
                synced.await()
            })
        }
        assertEquals(FeedRefreshState.Refreshing(target), refresh.state.value)
        assertNull(refresh.run(FeedRefreshTarget.Podcast("s"), refresh = { error("Unexpected refresh") }))
        val summary = RefreshSummary(3, 2, 1, 0)
        reply.complete(summary)
        syncing.await()
        assertEquals(FeedRefreshState.Refreshing(target), refresh.state.value)
        assertNull(refresh.run(target, refresh = { error("Unexpected refresh") }))
        synced.complete(Unit)
        val result = checkNotNull(attempt.await())
        assertTrue(result.succeeded)
        assertEquals(summary, result.summary)
        assertEquals(result, refresh.state.value)
    }

    @Test fun `syncs successful feeds even when some publishers fail`() = runBlocking {
        val refresh = FeedRefresh()
        val partial = RefreshSummary(3, 1, 1, 1)
        var synced = false
        val result = checkNotNull(refresh.run(FeedRefreshTarget.All, refresh = { partial }, sync = { synced = true }))
        assertTrue(synced)
        assertFalse(result.succeeded)
        assertEquals(partial, result.summary)
        assertNull(result.refreshError)
        assertNull(result.syncError)
    }

    @Test fun `reports the refresh error and accepts a retry`() = runBlocking {
        val refresh = FeedRefresh()
        val target = FeedRefreshTarget.Podcast("s")
        val error = IOException("Publisher unavailable")
        val result = checkNotNull(refresh.run(target, refresh = { throw error }, sync = { throw AssertionError("Unexpected sync") }))
        assertFalse(result.succeeded)
        assertSame(error, result.refreshError)
        assertEquals(result, refresh.state.value)
        assertTrue(checkNotNull(refresh.run(target, refresh = { null })).succeeded)
    }

    @Test fun `retains publisher counts when sync also fails`() = runBlocking {
        val refresh = FeedRefresh()
        val partial = RefreshSummary(2, 1, 0, 1)
        val error = IOException("Sync unavailable")
        val result = checkNotNull(refresh.run(FeedRefreshTarget.All, refresh = { partial }, sync = { throw error }))
        assertFalse(result.succeeded)
        assertEquals(partial, result.summary)
        assertSame(error, result.syncError)
    }
}
