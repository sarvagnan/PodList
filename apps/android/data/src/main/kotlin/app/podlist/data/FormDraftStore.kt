package app.podlist.data

import app.podlist.domain.Change
import java.util.UUID

class FormDraftStore(private val db: LocalDatabase) {
    private fun raw(): Map<String, String> = db.query("SELECT key, value FROM sync_meta WHERE key LIKE 'formDraft:%'")
        .associate { (it["key"] as String).removePrefix("formDraft:") to (it["value"] as String) }

    fun load(): Map<String, String> = db.transaction {
        val values = raw()
        val submittedDrafts = values.filterKeys { it.endsWith("/submitted") }
        if (submittedDrafts.isEmpty()) return@transaction values
        val state = loadState()
        submittedDrafts.forEach { (marker, submitted) ->
            val key = marker.removeSuffix("/submitted")
            val committed = when {
                key.startsWith("playlist:") -> state.playlists.find { it.id == key.removePrefix("playlist:").substringBefore('/') }?.name
                key.startsWith("view-rename:") -> state.views.find { it.id == key.removePrefix("view-rename:").substringBefore('/') }?.name
                else -> null
            }
            if (committed == submitted.trim()) finishRename(key, submitted)
        }
        raw()
    }

    fun finishRename(key: String, submitted: String) = db.transaction {
        val values = raw()
        if (values[key] == values["$key/submitted"] && values["$key/submitted"]?.trim() == submitted.trim()) {
            db.execute("DELETE FROM sync_meta WHERE key IN (?, ?)", listOf("formDraft:$key", "formDraft:$key/submitted"))
        }
    }

    /** One recoverable New View per Library; Back never clears this identity. */
    fun pendingNewViewId(): String = db.transaction {
        load()["new-view/id"] ?: UUID.randomUUID().toString().also { put("new-view/id", it) }
    }

    fun finishNewView(id: String) = db.transaction {
        clear("view:$id/")
        if (load()["new-view/id"] == id) clear("new-view/")
    }

    fun putAll(values: Map<String, String>) = db.transaction { values.forEach { (key, text) -> put(key, text) } }

    fun put(key: String, text: String) { db.setMeta("formDraft:$key", text) }

    fun snapshot(prefix: String): Map<String, String> = load().filterKeys { it.startsWith(prefix) }

    /** A completed request owns only the exact draft it submitted, including raw whitespace. */
    fun clearIfUnchanged(prefix: String, submitted: Map<String, String>): Boolean = db.transaction {
        if (snapshot(prefix) != submitted) false else { clear(prefix); true }
    }

    // Live editors follow deliberate reversals even off screen. Explicit rename drafts stay open.
    fun reconcile(changes: List<Change>) {
        changes.forEach { change ->
            when (change) {
                is Change.DeletePlaylist -> clear("playlist:${change.playlistId}/")
                is Change.SaveView -> clear("view:${change.view.id}/")
                is Change.DeleteView -> {
                    clear("view:${change.viewId}/")
                    clear("view-rename:${change.viewId}/")
                }
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
