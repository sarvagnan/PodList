package app.podlist

import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.selects.select

/** Sample requests are replaceable. Explicit commands are handled in submission order. */
internal class PlaybackEventQueue {
    private val commands = Channel<suspend () -> Unit>(Channel.UNLIMITED)
    private val transitions = Channel<suspend () -> Unit>(Channel.CONFLATED)
    private val refreshes = Channel<Unit>(Channel.CONFLATED)
    private val ticks = Channel<Unit>(Channel.CONFLATED)

    fun command(action: suspend () -> Unit) { commands.trySend(action) }
    fun transition(action: suspend () -> Unit) { transitions.trySend(action) }
    fun refresh() { refreshes.trySend(Unit) }
    fun tick() { ticks.trySend(Unit) }

    suspend fun next(refresh: suspend () -> Unit, tick: () -> Unit): suspend () -> Unit = select {
        commands.onReceive { it }
        transitions.onReceive { it }
        refreshes.onReceive { refresh }
        ticks.onReceive { { tick() } }
    }
}
