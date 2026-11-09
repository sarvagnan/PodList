package app.podlist

import androidx.compose.ui.Modifier
import androidx.compose.ui.input.key.*
import androidx.lifecycle.viewModelScope
import app.podlist.domain.*
import app.podlist.data.reversibleEdit
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.withLock

internal class ReversibleEdit(val viewId: String? = null, val playbackPlaylist: String? = null, val reloadActive: Boolean = false, val apply: suspend () -> ReversibleEdit)

internal fun AppModel.changesStep(current: Session, changes: List<Change>, playbackPlaylist: String? = null): ReversibleEdit =
    ReversibleEdit(changes.filterIsInstance<Change.SaveView>().firstOrNull()?.view?.id, playbackPlaylist, changes.any { it is Change.SetActivePlaylist }) {
        val inverse = withContext(Dispatchers.IO) { current.db.reversibleEdit(changes, System.currentTimeMillis()) }
        revealChanges(changes)
        changesStep(current, inverse, playbackPlaylist)
    }

internal fun AppModel.recordHistory(current: Session, message: AppMessage, step: ReversibleEdit, typingGroup: String? = null) {
    if (session.value !== current) return
    if (typingGroup == null || typingGroup != activeTypingGroup) finishTyping()
    activeTypingGroup = typingGroup
    history.record(step, typingGroup)
    updateHistoryActions()
    val notification = message.copy(undo = ::undoEdit)
    if (typingGroup == null) messages.trySend(notification)
    else {
        typingMessage = notification
        typingJob?.cancel()
        typingJob = viewModelScope.launch { delay(800); editLock.withLock { finishTyping() } }
    }
}

internal fun AppModel.finishTyping() {
    typingJob?.cancel(); typingJob = null
    history.endTyping()
    activeTypingGroup = null
    typingMessage?.let { messages.trySend(it) }
    typingMessage = null
}

internal fun AppModel.updateHistoryActions() {
    latestUndo.value = if (history.undo == null) null else ::undoEdit
    latestRedo.value = if (history.redo == null) null else ::redoEdit
    undoViewId.value = history.undo?.viewId
}

internal fun AppModel.undoEdit() = traverseHistory(false)
internal fun AppModel.redoEdit() = traverseHistory(true)

private fun AppModel.traverseHistory(redo: Boolean) {
    val current = session.value ?: return
    val expected = (if (redo) history.redo else history.undo) ?: return
    val action: suspend () -> Unit = {
        editLock.withLock {
            if (session.value !== current) return@withLock
            finishTyping()
            val step = (if (redo) history.redo else history.undo) ?: return@withLock
            if (step !== expected) {
                traverseHistory(redo)
                return@withLock
            }
            try {
                history.reverse(redo) { it.apply() }
                undoRevision.value++
                updateHistoryActions()
                messages.trySend(AppMessage(if (redo) R.string.edit_redone else R.string.edit_undone,
                    if (redo) R.string.undo else R.string.m4_redo, undo = if (redo) ::undoEdit else ::redoEdit))
            } catch (error: CancellationException) { throw error }
            catch (_: Exception) {
                messages.trySend(AppMessage(R.string.edit_reverse_failed, R.string.retry_action, undo = if (redo) ::redoEdit else ::undoEdit))
            }
        }
    }
    if (expected.playbackPlaylist == null) viewModelScope.launch { action() }
    else playbackEdit(if (expected.reloadActive) null else expected.playbackPlaylist, action)
}

internal fun AppModel.subscriptionStep(current: Session, feeds: List<String>, subscribe: Boolean, reveal: Boolean = true): ReversibleEdit {
    val remaining = feeds.toMutableList()
    return ReversibleEdit {
        withContext(Dispatchers.IO) {
            while (remaining.isNotEmpty()) {
                val feed = remaining.first()
                if (subscribe) {
                    val id = current.source.subscribe(feed).id
                    if (reveal) requestReveal(Reveal("subscription:$id"))
                } else {
                    val id = current.db.query("SELECT id FROM subscription WHERE feed_url = ?", listOf(feed)).single()["id"] as String
                    current.source.unsubscribe(id)
                }
                remaining.removeAt(0)
            }
        }
        requestSync()
        subscriptionStep(current, feeds, !subscribe, reveal)
    }
}

internal fun AppModel.offerSubscriptionHistory(current: Session, feeds: List<String>, subscribe: Boolean, message: AppMessage, reveal: Boolean = true) {
    viewModelScope.launch { editLock.withLock { recordHistory(current, message, subscriptionStep(current, feeds, subscribe, reveal)) } }
}

internal fun historyShortcuts(model: AppModel): Modifier = Modifier.onKeyEvent { event ->
    if (event.type == KeyEventType.KeyDown && event.isCtrlPressed && event.key == Key.Z) {
        if (event.isShiftPressed) model.redoEdit() else model.undoEdit()
        true
    } else false
}
