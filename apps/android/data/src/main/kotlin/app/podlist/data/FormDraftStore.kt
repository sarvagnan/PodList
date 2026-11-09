package app.podlist.data

class FormDraftStore(private val db: LocalDatabase) {
    fun load(): Map<String, String> = db.query("SELECT key, value FROM sync_meta WHERE key LIKE 'formDraft:%'")
        .associate { (it["key"] as String).removePrefix("formDraft:") to (it["value"] as String) }

    fun put(key: String, text: String) { db.setMeta("formDraft:$key", text) }

    fun clear(prefix: String) = db.transaction {
        load().keys.filter { it.startsWith(prefix) }.forEach { key ->
            execute("DELETE FROM sync_meta WHERE key = ?", listOf("formDraft:$key"))
        }
    }
}
