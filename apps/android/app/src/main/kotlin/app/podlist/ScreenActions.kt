package app.podlist

import androidx.lifecycle.viewModelScope
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.withLock
import java.util.UUID

/** Capture inverses against the latest local State, in the same transaction as the edit. */
internal fun AppModel.changeWithUndo(changes: List<Change>, message: Int, playbackPlaylist: String? = null, inverse: (State) -> List<Change>) {
    val current = session.value ?: return
    val action: suspend () -> Unit = {
        editLock.withLock {
            if (session.value !== current) return@withLock
            val undo = withContext(Dispatchers.IO) { current.db.transaction {
                val before = loadState()
                val result = inverse(before)
                recordAll(changes, System.currentTimeMillis())
                result
            } }
            recordHistory(current, AppMessage(message), changesStep(current, undo, playbackPlaylist))
        }
    }
    if (playbackPlaylist != null) playbackEdit(playbackPlaylist, action)
    else viewModelScope.launch { action() }
}

internal fun AppModel.rewind(playlistId: String, to: Long) {
    val current = session.value ?: return
    playbackEdit(playlistId) {
        editLock.withLock {
            if (session.value !== current) return@withLock
            val inverse = withContext(Dispatchers.IO) { current.db.transaction {
                val before = loadState()
                val at = System.currentTimeMillis()
                record(Change.Rewind(playlistId, to), at)
                TimelinePresentation.undo(before, loadState(), playlistId, at + 1)
            } }
            recordHistory(current, AppMessage(R.string.rewound), changesStep(current, inverse, playlistId))
        }
    }
}

internal fun AppModel.createPlaylist(name: String, finished: (String?, PlaylistNames.Problem?) -> Unit) {
    val current = session.value ?: return
    viewModelScope.launch {
        editLock.withLock {
            if (session.value !== current) return@withLock
            val result = withContext(Dispatchers.IO) { current.db.transaction {
                val problem = PlaylistNames.validate(name, loadState().playlists)
                if (problem != null) null to problem else {
                    val id = UUID.randomUUID().toString()
                    record(Change.CreatePlaylist(id, name.trim(), false), System.currentTimeMillis())
                    id to null
                }
            } }
            result.first?.let { id -> recordHistory(current, AppMessage(R.string.playlist_created), changesStep(current, listOf(Change.DeletePlaylist(id)), id)) }
            finished(result.first, result.second)
        }
    }
}

internal fun AppModel.addSeveral(ids: List<String>, playlistId: String?, name: String?, placement: Placement, finished: (Boolean) -> Unit) {
    val current = session.value ?: return
    viewModelScope.launch {
        editLock.withLock {
            if (session.value !== current) return@withLock
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
                recordHistory(current, AppMessage(R.plurals.entries_added_to_playlist, formatArgs = listOf(count, playlistName), quantity = count), changesStep(current, undo))
            }
            finished(result != null)
        }
    }
}

internal fun AppModel.markSubscriptionPlayed(subscriptionId: String) {
    val current = session.value ?: return
    viewModelScope.launch {
        editLock.withLock {
            if (session.value !== current) return@withLock
            val inverse = withContext(Dispatchers.IO) { current.db.transaction {
                val before = loadState()
                val ids = query("SELECT id FROM episode WHERE subscription_id = ? ORDER BY published, id", listOf(subscriptionId)).map { it["id"] as String }.filter { before.episodeStates[it]?.played == null }
                val at = System.currentTimeMillis()
                val undo = EpisodeActions.undoPlayed(before, ids, at + 1)
                recordAll(ids.map { Change.MarkPlayed(it, PlayedSource.User) }, at)
                undo
            } }
            recordHistory(current, AppMessage(R.string.m4_marked_all), changesStep(current, inverse))
        }
    }
}

internal fun AppModel.revealChanges(changes: List<Change>) {
    val restoredEntry = changes.filterIsInstance<Change.AddEntry>().firstOrNull()
    val target = restoredEntry?.let { Reveal("playlist:${it.playlistId}", it.episodeId) } ?: changes.firstNotNullOfOrNull { change -> when (change) {
        is Change.SaveView -> Reveal("view:${change.view.id}")
        is Change.DeleteView -> Reveal("views-root")
        is Change.DeletePlaylist -> Reveal("playlists-root")
        is Change.RenamePlaylist -> Reveal("playlist-settings:${change.playlistId}")
        is Change.RestorePlaylist -> Reveal("playlist:${change.playlistId}")
        is Change.AddEntry -> Reveal("playlist:${change.playlistId}", change.episodeId)
        is Change.MoveEntry -> Reveal("playlist:${change.playlistId}", change.episodeId)
        is Change.MarkPlayed -> Reveal("episode:${change.episodeId}")
        is Change.MarkUnplayed -> Reveal("episode:${change.episodeId}")
        is Change.SetStar -> Reveal("episode:${change.episodeId}")
        else -> null
    } }
    if (target != null) reveal.value = target
}

internal fun AppModel.showGettingStarted() {
    val current = session.value ?: return
    viewModelScope.launch {
        withContext(Dispatchers.IO) { current.db.transaction { setMeta("gettingStartedHidden", "false"); setMeta("gettingStartedBegun", "true") }; current.db.notifyChanged() }
        gettingStartedRequest.value++
    }
}

internal data class Reveal(val route: String, val episode: String? = null, val token: Long = System.nanoTime())

internal fun editMessage(change: Change): Int = when (change) {
    is Change.SetStar -> if (change.starred) R.string.episode_starred else R.string.episode_unstarred
    is Change.MarkPlayed -> R.string.episode_played
    is Change.MarkUnplayed -> R.string.episode_unplayed
    is Change.RenamePlaylist -> R.string.playlist_renamed
    is Change.SaveView -> R.string.view_changed
    is Change.SetDownloadRule -> R.string.download_rule_changed
    else -> R.string.m4_setting_changed
}

internal fun AppModel.removeEntry(playlist: String, episode: String) {
    changeWithUndo(listOf(Change.RemoveEntry(playlist, episode)), R.string.entry_removed, playbackPlaylist = playlist) { before ->
        before.playlists.find { it.id == playlist }?.let { EditUndo.removeEntry(it, episode, System.currentTimeMillis() + 1) }.orEmpty()
    }
}
