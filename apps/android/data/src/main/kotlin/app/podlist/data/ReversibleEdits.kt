package app.podlist.data

import app.podlist.domain.*

data class NamedViewEdit(val problem: Names.Problem?, val inverse: List<Change>)

/** Naming is checked against current local State, atomically with the accepted edit. */
fun LocalDatabase.reversibleNamedView(view: View, at: Long): NamedViewEdit = transaction {
    val problem = ViewNames.validate(view.name, loadState().views, view.id)
    NamedViewEdit(problem, if (problem == null) reversibleEdit(listOf(Change.SaveView(view.copy(name = view.name.trim()))), at) else emptyList())
}

/** Capture each inverse from current State and commit the whole edit atomically. */
fun LocalDatabase.reversibleEdit(changes: List<Change>, at: Long): List<Change> = transaction {
    var inverse = emptyList<Change>()
    for ((index, change) in changes.withIndex()) {
        val before = loadState()
        val subscription = (change as? Change.SetSubscriptionOverrides)?.let { c ->
            val row = query("SELECT * FROM subscription WHERE id = ?", listOf(c.subscriptionId)).single()
            val pending = pendingSubscriptionOverrides().lastOrNull { it.subscriptionId == c.subscriptionId }
            Subscription(c.subscriptionId, row["feed_url"] as String, row["title"] as String, null, null, null, 0, null,
                if (pending != null) pending.playedThreshold else (row["played_threshold"] as? Number)?.toDouble(),
                pending?.playbackSettings ?: ProtocolJson.decodeFromString(row["playback_settings"] as String))
        }
        // A rename immediately preceding deletion belongs to the trashed snapshot. Re-restoring
        // that snapshot must choose a free name again rather than replay an old suffix over a new owner.
        val deletedLater = change is Change.RenamePlaylist && changes.drop(index + 1).any { it is Change.DeletePlaylist && it.playlistId == change.playlistId }
        if (!deletedLater) inverse = EditUndo.inverse(before, change, at + 1, subscription) + inverse
        record(if (change is Change.ReportPosition) change.copy(listenedAt = at) else change, at)
    }
    inverse
}
