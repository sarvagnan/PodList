package app.podlist

import androidx.compose.ui.Modifier
import androidx.compose.ui.input.key.*
import androidx.lifecycle.viewModelScope
import app.podlist.domain.*
import app.podlist.data.reversibleEdit
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.withLock

internal class ReversibleEdit(val viewId: String? = null, val playbackPlaylist: String? = null, val reloadActive: Boolean = false, val apply: suspend () -> ReversibleEdit) {
    var description: AppMessage? = null
    var feedback: AppMessage? = null
}

internal fun AppModel.changesStep(current: Session, changes: List<Change>, playbackPlaylist: String? = null): ReversibleEdit =
    ReversibleEdit(changes.filterIsInstance<Change.SaveView>().firstOrNull()?.view?.id, playbackPlaylist, changes.any { it is Change.SetActivePlaylist }) {
        var scopeNames = emptyMap<String, String>()
        val result = withContext(Dispatchers.IO) {
            current.db.transaction {
                val before = loadState()
                val inverse = reversibleEdit(changes, System.currentTimeMillis())
                app.podlist.data.FormDraftStore(this).reconcile(changes)
                if (changes.any { it is Change.SetSubscriptionOverrides || it is Change.SetDownloadRule }) {
                    scopeNames = query("SELECT id, title FROM subscription").associate { it["id"] as String to it["title"] as String }
                }
                Triple(inverse, before, loadState())
            }
        }
        revealChanges(changes)
        changesStep(current, result.first, playbackPlaylist).also { it.feedback = restoredSettingsMessage(result.second, result.third, changes, result.first, scopeNames) ?: restoredMessage(result.second, result.third, changes) }
    }

internal fun AppModel.recordHistory(current: Session, message: AppMessage, step: ReversibleEdit, typingGroup: String? = null, notify: Boolean = true) {
    if (session.value !== current) return
    if (typingGroup == null || typingGroup != activeTypingGroup) finishTyping()
    activeTypingGroup = typingGroup
    step.description = message.copy(undo = null)
    history.record(step, typingGroup)
    updateHistoryActions()
    if (!notify) return
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
    undoDescription.value = history.undo?.description
    redoDescription.value = history.redo?.description
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
                withContext(Dispatchers.IO) { flushFormDrafts?.invoke() }
                var feedback: AppMessage? = null
                history.reverse(redo) { step -> step.apply().also { it.description = step.description; feedback = it.feedback } }
                undoRevision.value++
                updateHistoryActions()
                messages.trySend((feedback ?: AppMessage(if (redo) R.string.edit_redone else R.string.edit_undone)).copy(
                    actionResource = if (redo) R.string.undo else R.string.m4_redo, undo = if (redo) ::undoEdit else ::redoEdit))
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

// Let the field handle text Undo first, then consume unhandled Ctrl+Z (including Redo).
// Otherwise a field with no text history can fall through to a sheet or MainActivity's app Undo.
internal fun textFieldHistoryShortcuts(): Modifier = Modifier.onKeyEvent { event ->
    event.isCtrlPressed && (event.key == Key.Z || event.key == Key.A)
}
