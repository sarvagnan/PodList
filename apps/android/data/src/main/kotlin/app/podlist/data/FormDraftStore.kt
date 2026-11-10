package app.podlist.data

import app.podlist.domain.Change

class FormDraftStore(private val db: LocalDatabase) {
    fun load(): Map<String, String> = db.query("SELECT key, value FROM sync_meta WHERE key LIKE 'formDraft:%'")
        .associate { (it["key"] as String).removePrefix("formDraft:") to (it["value"] as String) }

    fun put(key: String, text: String) { db.setMeta("formDraft:$key", text) }

    // Live editors follow deliberate reversals even off screen. Explicit rename drafts stay open.
    fun reconcile(changes: List<Change>) {
        changes.forEach { change ->
            when (change) {
                is Change.DeletePlaylist -> clear("playlist:${change.playlistId}/")
                is Change.SaveView -> clear("view:${change.view.id}/")
                is Change.DeleteView -> clear("view:${change.viewId}/")
                is Change.SetDownloadRule -> clear("subscription:${change.rule.subscriptionId}/")
                else -> Unit
            }
        }
    }

    fun clear(prefix: String) = db.transaction {
        load().keys.filter { it.startsWith(prefix) }.forEach { key ->
            execute("DELETE FROM sync_meta WHERE key = ?", listOf("formDraft:$key"))
        }
    }
}
