package app.podlist

import androidx.lifecycle.viewModelScope
import app.podlist.data.reversibleNamedView
import app.podlist.data.reversibleNamedPlaylist
import app.podlist.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.withLock
import java.util.UUID

/** Capture inverses against the latest local State, in the same transaction as the edit. */
internal fun AppModel.changeWithUndo(changes: List<Change>, message: Int, playbackPlaylist: String? = null, formatArgs: List<Any> = emptyList(), notify: Boolean = true, inverse: (State) -> List<Change>) {
    val current = session.value ?: return
    val sheet = feedbackSheet
    val action: suspend () -> Unit = {
        editLock.withLock {
            if (session.value !== current) return@withLock
            val result = withContext(Dispatchers.IO) { current.db.transaction {
                val before = loadState()
                val result = inverse(before)
                recordAll(changes, System.currentTimeMillis())
                result to restoredMessage(before, loadState(), changes)
            } }
            recordHistory(current, (result.second ?: AppMessage(message, formatArgs = formatArgs)).copy(feedbackSheet = sheet), changesStep(current, result.first, playbackPlaylist), notify = notify)
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
            recordHistory(current, AppMessage(R.string.rewound, formatArgs = listOf(current.db.loadState().playlists.find { it.id == playlistId }?.name.orEmpty())), changesStep(current, inverse, playlistId))
        }
    }
}

internal fun AppModel.renamePlaylist(id: String, name: String, finished: (Names.Problem?, Boolean) -> Unit) {
    val current = session.value ?: return
    viewModelScope.launch { editLock.withLock {
        if (session.value !== current) return@withLock
        try {
            val result = withContext(Dispatchers.IO) { current.db.reversibleNamedPlaylist(id, name, System.currentTimeMillis()) }
            if (result.problem == null) recordHistory(current, AppMessage(R.string.playlist_renamed_to, formatArgs = listOf(name)), changesStep(current, result.inverse))
            finished(result.problem, result.problem == null)
        } catch (error: kotlinx.coroutines.CancellationException) { throw error }
        catch (_: Exception) { messages.trySend(AppMessage(R.string.name_save_failed)); finished(null, false) }
    } }
}

internal fun AppModel.createPlaylist(name: String, finished: (String?, Names.Problem?) -> Unit) {
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
            result.first?.let { id -> recordHistory(current, AppMessage(R.string.playlist_created, formatArgs = listOf(name.trim())), changesStep(current, listOf(Change.DeletePlaylist(id)), id)) }
            finished(result.first, result.second)
        }
    }
}

internal fun AppModel.addSeveral(ids: List<String>, playlistId: String?, name: String?, placement: Placement, finished: (Boolean, Names.Problem?) -> Unit) {
    val current = session.value ?: return
    viewModelScope.launch {
        editLock.withLock {
            if (session.value !== current) return@withLock
            var nameProblem: Names.Problem? = null
            val result = withContext(Dispatchers.IO) { current.db.transaction {
                val before = loadState()
                if (playlistId == null) {
                    nameProblem = PlaylistNames.validate(name.orEmpty(), before.playlists)
                    if (nameProblem != null) return@transaction null
                }
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
            finished(result != null, nameProblem)
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
    if (target != null) requestReveal(target)
}

internal fun AppModel.showGettingStarted() {
    val current = session.value ?: return
    viewModelScope.launch {
        withContext(Dispatchers.IO) { current.db.transaction { setMeta("gettingStartedHidden", "false"); setMeta("gettingStartedBegun", "true") }; current.db.notifyChanged() }
        gettingStartedRequest.value = OneShotEvent(Unit)
    }
}

internal data class Reveal(val route: String, val episode: String? = null, val token: Long = System.nanoTime())

internal fun editMessage(change: Change): Int = when (change) {
    is Change.SetStar -> if (change.starred) R.string.episode_starred else R.string.episode_unstarred
    is Change.MarkPlayed -> R.string.episode_played
    is Change.MarkUnplayed -> R.string.episode_unplayed
    is Change.SaveView -> R.string.view_changed
    is Change.SetDownloadRule -> R.string.download_rule_changed
    is Change.SetPlaybackSettings -> R.string.playback_settings_changed
    is Change.SetSubscriptionOverrides -> R.string.subscription_settings_changed
    is Change.SetTrashDays -> R.string.trash_retention_changed
    is Change.SetClearOnPlayed -> R.string.clear_on_played_changed
    else -> R.string.m4_setting_changed
}

internal fun AppModel.removeEntry(playlist: String, episode: String) {
    changeWithUndo(listOf(Change.RemoveEntry(playlist, episode)), R.string.entry_removed, playbackPlaylist = playlist, formatArgs = listOf(currentPlaylistName(playlist))) { before ->
        before.playlists.find { it.id == playlist }?.let { EditUndo.removeEntry(it, episode, System.currentTimeMillis() + 1) }.orEmpty()
    }
}

/** Use committed State so feedback reflects a suffix selected inside the transaction. */
internal fun restoredMessage(before: State, after: State, changes: List<Change>): AppMessage? {
    val id = changes.filterIsInstance<Change.RestorePlaylist>().firstOrNull()?.playlistId ?: return null
    val original = before.trash?.find { it.playlist.id == id }?.playlist ?: return null
    val restored = after.playlists.find { it.id == id } ?: return null
    return if (original.name != restored.name) AppMessage(R.string.playlist_restored_as, formatArgs = listOf(original.name, restored.name))
        else AppMessage(R.string.m4_playlist_restored, formatArgs = listOf(restored.name))
}

internal fun AppModel.saveNamedView(view: View, message: Int = R.string.view_changed, formatArgs: List<Any> = emptyList(), failed: () -> Unit = {}, finished: (Names.Problem?) -> Unit) {
    val current = session.value ?: return
    viewModelScope.launch { editLock.withLock {
        if (session.value !== current) return@withLock
        try {
            val result = withContext(Dispatchers.IO) { current.db.reversibleNamedView(view, System.currentTimeMillis()) }
            if (result.problem == null) recordHistory(current, AppMessage(message, formatArgs = formatArgs.ifEmpty { listOf(view.name) }), changesStep(current, result.inverse))
            finished(result.problem)
        } catch (error: kotlinx.coroutines.CancellationException) { throw error }
        catch (_: Exception) { messages.trySend(AppMessage(R.string.name_save_failed)); failed() }
    } }
}

private fun AppModel.currentPlaylistName(id: String): String = session.value?.db?.loadState()?.playlists?.find { it.id == id }?.name.orEmpty()
