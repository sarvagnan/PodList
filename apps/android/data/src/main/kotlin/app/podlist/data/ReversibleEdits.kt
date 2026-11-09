package app.podlist.data

import app.podlist.domain.*

/** Capture each inverse from current State and commit the whole edit atomically. */
fun LocalDatabase.reversibleEdit(changes: List<Change>, at: Long): List<Change> = transaction {
    var inverse = emptyList<Change>()
    for (change in changes) {
        val before = loadState()
        val subscription = (change as? Change.SetSubscriptionOverrides)?.let { c ->
            val row = query("SELECT * FROM subscription WHERE id = ?", listOf(c.subscriptionId)).single()
            val pending = pendingSubscriptionOverrides().lastOrNull { it.subscriptionId == c.subscriptionId }
            Subscription(c.subscriptionId, row["feed_url"] as String, row["title"] as String, null, null, null, 0, null,
                if (pending != null) pending.playedThreshold else (row["played_threshold"] as? Number)?.toDouble(),
                pending?.playbackSettings ?: ProtocolJson.decodeFromString(row["playback_settings"] as String))
        }
        inverse = EditUndo.inverse(before, change, at + 1, subscription) + inverse
        record(if (change is Change.ReportPosition) change.copy(listenedAt = at) else change, at)
    }
    inverse
}
