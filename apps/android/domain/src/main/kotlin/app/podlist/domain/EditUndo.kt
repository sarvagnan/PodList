package app.podlist.domain

object EditUndo {
    fun removeEntry(before: Playlist, episode: String, at: Long): List<Change> {
        val index = before.entries.indexOfFirst { it.episodeId == episode }
        if (index < 0) return emptyList()
        val entry = before.entries[index]
        return listOf(Change.AddEntry(before.id, episode, Placement.Last),
            Change.MoveEntry(before.id, episode, before.entries.getOrNull(index - 1)?.episodeId),
            Change.ReportPosition(before.id, episode, entry.position, at), Change.SetCursor(before.id, before.cursor))
    }
    fun inverse(before: State, change: Change, at: Long, subscription: Subscription? = null): List<Change> = when (change) {
        is Change.SetStar -> listOf(Change.SetStar(change.episodeId, before.episodeStates[change.episodeId]?.starred == true))
        is Change.MarkPlayed -> EpisodeActions.undoPlayed(before, listOf(change.episodeId), at)
        is Change.MarkUnplayed -> EpisodeActions.undoPlayed(before, listOf(change.episodeId), at)
        is Change.RenamePlaylist -> before.playlists.find { it.id == change.playlistId }?.let { listOf(Change.RenamePlaylist(it.id, it.name)) }.orEmpty()
        is Change.SetPlaybackSettings -> listOf(Change.SetPlaybackSettings(before.playbackSettings))
        is Change.SetTrashDays -> listOf(Change.SetTrashDays(before.trashDays ?: 30))
        is Change.SetDownloadRule -> listOf(Change.SetDownloadRule(before.downloadRules.find { it.subscriptionId == change.rule.subscriptionId && it.deviceId == change.rule.deviceId } ?: change.rule.copy(mode = DownloadMode.Never, keepAtMost = null)))
        is Change.SetSubscriptionOverrides -> subscription?.let { listOf(Change.SetSubscriptionOverrides(it.id, it.playbackSettings, it.playedThreshold)) }.orEmpty()
        is Change.SaveView -> listOf(before.views.find { it.id == change.view.id }?.let { Change.SaveView(it) } ?: Change.DeleteView(change.view.id))
        is Change.RemoveEntry -> before.playlists.find { it.id == change.playlistId }?.let { removeEntry(it, change.episodeId, at) }.orEmpty()
        else -> emptyList()
    }
}
