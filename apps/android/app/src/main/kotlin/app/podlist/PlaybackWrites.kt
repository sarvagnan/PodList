package app.podlist

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch

/** Keeps record order across service lifetimes, including a pending write at teardown. */
internal class PlaybackWrites(scope: CoroutineScope, private val reportFailure: (Exception) -> Unit) {
    private val pending = Channel<() -> Unit>(Channel.UNLIMITED)

    init {
        scope.launch(Dispatchers.IO) { for (write in pending) write() }
    }

    fun submit(write: () -> Unit): CompletableDeferred<Unit> {
        val completion = CompletableDeferred<Unit>()
        check(pending.trySend {
            try {
                write()
                completion.complete(Unit)
            } catch (error: Exception) {
                completion.completeExceptionally(error)
                reportFailure(error)
            }
        }.isSuccess)
        return completion
    }
}
