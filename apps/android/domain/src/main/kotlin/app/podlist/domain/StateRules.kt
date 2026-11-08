package app.podlist.domain

/** Arrival order is authoritative; the seen set persists across incremental replays. */
data class Replayed(val state: State, val applied: Set<String>)

object StateRules {
    fun replay(state: State, operations: Iterable<Operation>, applied: Set<String> = emptySet()): Replayed {
        val seen = applied.toMutableSet()
        var current = state
        for (operation in operations) {
            if (!seen.add(operation.id)) continue
            current = apply(current, operation.change, operation.recordedAt)
        }
        return Replayed(current, seen)
    }

    fun apply(state: State, change: Change, at: Long): State {
        val next = applyChange(state, change, at)
        val trash = next.trash ?: return next
        val kept = trash.filter { it.deletedAt >= at - (next.trashDays ?: 30L) * 86_400_000.0 }
        return if (kept.size == trash.size) next else next.copy(trash = kept)
    }

    private fun withPlaylist(state: State, id: String, transform: (Playlist) -> Playlist): State {
        val before = state.playlists.find { it.id == id } ?: return state
        val after = transform(before)
        return if (after === before) state else state.copy(playlists = state.playlists.map { if (it.id == id) after else it })
    }

    private fun edited(before: Playlist, after: Playlist, kind: String, episodeId: String, at: Long): Playlist =
        if (before === after) before else TimelineRules.recordEdit(after, kind, episodeId, at)

    internal fun episodeFacts(state: State, episodeId: String, played: Played?, starred: Boolean): Map<String, EpisodeState> {
        val rest = state.episodeStates - episodeId
        return if (played == null && !starred) rest else rest + (episodeId to EpisodeState(episodeId, played, starred))
    }

    private fun applyChange(state: State, change: Change, at: Long): State = when (change) {
        is Change.AddEntry -> withPlaylist(state, change.playlistId) {
            edited(it, PlaylistRules.addEntry(it, change.episodeId, change.placement, at), "added", change.episodeId, at)
        }
        is Change.MoveEntry -> withPlaylist(state, change.playlistId) {
            edited(it, PlaylistRules.moveEntry(it, change.episodeId, change.after), "moved", change.episodeId, at)
        }
        is Change.RemoveEntry -> withPlaylist(state, change.playlistId) {
            edited(it, PlaylistRules.removeEntry(it, change.episodeId), "removed", change.episodeId, at)
        }
        is Change.SetCursor -> withPlaylist(state, change.playlistId) { PlaylistRules.setCursor(it, change.episodeId) }
        is Change.CreatePlaylist -> if (state.playlists.any { it.id == change.playlistId }) state else state.copy(
            playlists = state.playlists + Playlist(change.playlistId, change.name, false, change.clearOnPlayed,
                emptyList(), null, emptyList(), emptyList())
        )
        is Change.RenamePlaylist -> withPlaylist(state, change.playlistId) { if (it.isDefault) it else it.copy(name = change.name) }
        is Change.SetClearOnPlayed -> withPlaylist(state, change.playlistId) { it.copy(clearOnPlayed = change.clearOnPlayed) }
        is Change.DeletePlaylist -> {
            val playlist = state.playlists.find { it.id == change.playlistId }
            if (playlist == null || playlist.isDefault) state else state.copy(
                playlists = state.playlists.filterNot { it.id == change.playlistId },
                activePlaylistId = if (state.activePlaylistId == change.playlistId) DefaultPlaylistId else state.activePlaylistId,
                trash = (state.trash ?: emptyList()).filterNot { it.playlist.id == change.playlistId } + TrashedPlaylist(playlist, at)
            )
        }
        is Change.RestorePlaylist -> {
            val trashed = state.trash?.find { it.playlist.id == change.playlistId }
            if (trashed == null || trashed.deletedAt < at - (state.trashDays ?: 30L) * 86_400_000.0 ||
                state.playlists.any { it.id == change.playlistId }) state
            else state.copy(playlists = state.playlists + trashed.playlist, trash = state.trash?.filterNot { it === trashed })
        }
        is Change.SetTrashDays -> state.copy(trashDays = change.days)
        is Change.SetActivePlaylist -> if (state.playlists.none { it.id == change.playlistId }) state else state.copy(activePlaylistId = change.playlistId)
        is Change.SetStar -> state.copy(episodeStates = episodeFacts(state, change.episodeId, state.episodeStates[change.episodeId]?.played, change.starred))
        is Change.MarkPlayed -> state.copy(
            episodeStates = episodeFacts(state, change.episodeId, Played(at, change.source), state.episodeStates[change.episodeId]?.starred ?: false),
            playlists = state.playlists.map { playlist ->
                val next = PlayedRules.onPlayed(playlist, change.episodeId,
                    (change.source as? PlayedSource.Playback)?.playlistId == playlist.id, at)
                if (change.source == PlayedSource.User && playlist.entries.any { it.episodeId == change.episodeId })
                    TimelineRules.recordEdit(next, "markedPlayed", change.episodeId, at) else next
            }
        )
        is Change.MarkUnplayed -> state.copy(episodeStates = episodeFacts(state, change.episodeId, null, state.episodeStates[change.episodeId]?.starred ?: false))
        is Change.SaveView -> state.copy(views = if (state.views.any { it.id == change.view.id })
            state.views.map { if (it.id == change.view.id) change.view else it } else state.views + change.view)
        is Change.DeleteView -> state.copy(views = state.views.filterNot { it.id == change.viewId })
        is Change.SetDownloadRule -> {
            val previous = state.downloadRules.find { it.subscriptionId == change.rule.subscriptionId && it.deviceId == change.rule.deviceId }
            val since = if (change.rule.mode == DownloadMode.AllNew) {
                if (previous?.mode == DownloadMode.AllNew) previous.since else at
            } else null
            state.copy(downloadRules = state.downloadRules.filterNot {
                it.subscriptionId == change.rule.subscriptionId && it.deviceId == change.rule.deviceId
            } + change.rule.copy(since = since))
        }
        is Change.SetPlaybackSettings -> state.copy(playbackSettings = change.settings)
        is Change.RecordListening -> if (change.amounts.isEmpty()) state else state.copy(listeningLog = Listening.add(state.listeningLog ?: emptyMap(), change.amounts))
        is Change.ReportPosition -> {
            val withListening = if (change.listening.isNullOrEmpty()) state else
                state.copy(listeningLog = Listening.add(state.listeningLog ?: emptyMap(), change.listening))
            withPlaylist(withListening, change.playlistId) { playlist ->
                val entry = playlist.entries.find { it.episodeId == change.episodeId }
                if (entry == null) playlist else {
                    val recorded = TimelineRules.record(playlist, change.episodeId, change.position, change.listenedAt)
                    if (change.listenedAt < entry.positionAt) recorded else recorded.copy(entries = recorded.entries.map {
                        if (it === entry) it.copy(position = change.position, positionAt = change.listenedAt) else it
                    })
                }
            }
        }
        is Change.Rewind -> Rewind.apply(state, change.playlistId, change.to, at)
        // These intentions need the Library. Only the server expands them.
        is Change.MarkSubscriptionPlayed, is Change.SetSubscriptionOverrides -> state
    }
}
