package app.podlist

import app.podlist.data.RefreshSummary
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

internal sealed interface FeedRefreshTarget {
    data object All : FeedRefreshTarget
    data class Podcast(val id: String) : FeedRefreshTarget
}

internal sealed interface FeedRefreshState {
    data object Idle : FeedRefreshState
    data class Refreshing(val target: FeedRefreshTarget) : FeedRefreshState
    data class Finished(
        val target: FeedRefreshTarget,
        val summary: RefreshSummary? = null,
        val refreshError: Exception? = null,
        val syncError: Exception? = null
    ) : FeedRefreshState {
        val succeeded: Boolean get() = refreshError == null && syncError == null && (summary?.failed ?: 0) == 0
    }
}

internal class FeedRefresh {
    private val _state = MutableStateFlow<FeedRefreshState>(FeedRefreshState.Idle)
    val state = _state.asStateFlow()

    suspend fun run(
        target: FeedRefreshTarget,
        refresh: suspend () -> RefreshSummary?,
        sync: suspend () -> Unit = {}
    ): FeedRefreshState.Finished? {
        val previous = _state.value
        if (previous is FeedRefreshState.Refreshing || !_state.compareAndSet(previous, FeedRefreshState.Refreshing(target))) {
            return null
        }
        try {
            val summary = try {
                refresh()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                return finish(FeedRefreshState.Finished(target, refreshError = error))
            }
            val syncError = try {
                sync()
                null
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                error
            }
            return finish(FeedRefreshState.Finished(target, summary, syncError = syncError))
        } catch (error: CancellationException) {
            _state.value = FeedRefreshState.Idle
            throw error
        }
    }

    private fun finish(result: FeedRefreshState.Finished): FeedRefreshState.Finished {
        _state.value = result
        return result
    }
}
