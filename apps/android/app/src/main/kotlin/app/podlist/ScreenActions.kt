package app.podlist

import androidx.lifecycle.viewModelScope
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

/** Capture inverses against the latest local State, in the same transaction as the edit. */
internal fun AppModel.changeWithUndo(changes: List<Change>, message: Int, playbackPlaylist: String? = null, inverse: (State) -> List<Change>) {
    val current = session.value ?: return
    val action: suspend () -> Unit = {
        val undo = withContext(Dispatchers.IO) { current.db.transaction {
            val before = loadState()
            val result = inverse(before)
            recordAll(changes, System.currentTimeMillis())
            result
        } }
        messages.send(AppMessage(message) {
            if (playbackPlaylist != null) playbackEdit { withContext(Dispatchers.IO) { recordUndo(current, undo) } }
            else restoreChanges(current, undo)
        })
    }
    if (playbackPlaylist != null) playbackEdit(playbackPlaylist, action)
    else viewModelScope.launch { action() }
}

internal fun AppModel.restoreChanges(current: Session, changes: List<Change>) {
    viewModelScope.launch { withContext(Dispatchers.IO) { recordUndo(current, changes) } }
}

internal fun AppModel.rewind(playlistId: String, to: Long) {
    val current = session.value ?: return
    playbackEdit(playlistId) {
        val inverse = withContext(Dispatchers.IO) { current.db.transaction {
            val before = loadState()
            val at = System.currentTimeMillis()
            record(Change.Rewind(playlistId, to), at)
            TimelinePresentation.undo(before, loadState(), playlistId, at + 1)
        } }
        messages.send(AppMessage(R.string.rewound) { playbackEdit(playlistId) { withContext(Dispatchers.IO) { recordUndo(current, inverse) } } })
    }
}

internal fun AppModel.createPlaylist(name: String, finished: (String?, PlaylistNames.Problem?) -> Unit) {
    val current = session.value ?: return
    viewModelScope.launch {
        val result = withContext(Dispatchers.IO) { current.db.transaction {
            val problem = PlaylistNames.validate(name, loadState().playlists)
            if (problem != null) null to problem else {
                val id = UUID.randomUUID().toString()
                record(Change.CreatePlaylist(id, name.trim(), false), System.currentTimeMillis())
                id to null
            }
        } }
        finished(result.first, result.second)
    }
}

internal fun AppModel.addSeveral(ids: List<String>, playlistId: String?, name: String?, placement: Placement, finished: (Boolean) -> Unit) {
    val current = session.value ?: return
    viewModelScope.launch {
        val result = withContext(Dispatchers.IO) { current.db.transaction {
            val before = loadState()
            if (playlistId == null && PlaylistNames.validate(name.orEmpty(), before.playlists) != null) return@transaction null
            val id = playlistId ?: UUID.randomUUID().toString()
            val playlist = before.playlists.find { it.id == id }
            if (playlistId != null && playlist == null) return@transaction null
            val changes = buildList {
                if (playlistId == null) add(Change.CreatePlaylist(id, name!!.trim(), false))
                addAll(EpisodeActions.addMany(ids, id, placement, playlist))
            }
            recordAll(changes, System.currentTimeMillis())
            val undo = if (playlist == null) listOf<Change>(Change.DeletePlaylist(id)) else EpisodeActions.undoAdd(playlist, ids)
            (playlist?.name ?: name!!.trim()) to undo
        } }
        if (result != null) {
            val (playlistName, undo) = result
            val count = ids.distinct().size
            messages.send(AppMessage(R.plurals.entries_added_to_playlist, formatArgs = listOf(count, playlistName), quantity = count) { restoreChanges(current, undo) })
        }
        finished(result != null)
    }
}

internal fun AppModel.markSubscriptionPlayed(subscriptionId: String) {
    val current = session.value ?: return
    viewModelScope.launch {
        val inverse = withContext(Dispatchers.IO) { current.db.transaction {
            val before = loadState()
            val ids = query("SELECT id FROM episode WHERE subscription_id = ? ORDER BY published, id", listOf(subscriptionId)).map { it["id"] as String }.filter { before.episodeStates[it]?.played == null }
            val at = System.currentTimeMillis()
            val undo = EpisodeActions.undoPlayed(before, ids, at + 1)
            recordAll(ids.map { Change.MarkPlayed(it, PlayedSource.User) }, at)
            undo
        } }
        messages.send(AppMessage(R.string.m4_marked_all) { restoreChanges(current, inverse) })
    }
}

private fun recordUndo(current: Session, changes: List<Change>) {
    val at = System.currentTimeMillis()
    current.db.recordAll(changes.map { if (it is Change.ReportPosition) it.copy(listenedAt = at) else it }, at)
}

internal fun AppModel.showGettingStarted() {
    val current = session.value ?: return
    viewModelScope.launch {
        withContext(Dispatchers.IO) { current.db.transaction { setMeta("gettingStartedHidden", "false"); setMeta("gettingStartedBegun", "true") }; current.db.notifyChanged() }
        gettingStartedRequest.value++
    }
}
