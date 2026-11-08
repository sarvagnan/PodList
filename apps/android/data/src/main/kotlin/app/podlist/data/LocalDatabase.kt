package app.podlist.data

import androidx.sqlite.SQLiteConnection
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import java.util.UUID

/** Native bundled SQLite on both Android and JVM. A connection is serialized by this owner.
 * Network and platform lifecycle work belong to the next milestone.
 */
class LocalDatabase(path: String) : AutoCloseable {
    private val connection: SQLiteConnection = BundledSQLiteDriver().open(path)

    init {
        try {
            execute("PRAGMA foreign_keys = ON")
            execute("CREATE TABLE IF NOT EXISTS android_migration (scope TEXT NOT NULL, id INTEGER NOT NULL, name TEXT NOT NULL, PRIMARY KEY (scope, id))")
            for ((scope, migrations) in listOf("shared" to SharedSchema.migrations, "client" to SharedSchema.clientMigrations)) {
                for (migration in migrations) transaction {
                    if (query("SELECT id FROM android_migration WHERE scope = ? AND id = ?", listOf(scope, migration.id)).isEmpty()) {
                        for (statement in migration.statements) execute(statement)
                        if (scope == "shared" && migration.id == 4) backfillMentions()
                        execute("INSERT INTO android_migration (scope, id, name) VALUES (?, ?, ?)", listOf(scope, migration.id, migration.name))
                    }
                }
            }
        } catch (error: Throwable) { connection.close(); throw error }
    }

    private fun backfillMentions() {
        for (table in listOf("subscription", "episode")) {
            var after: String? = null
            while (true) {
                val rows = query("SELECT id, title${if (table == "episode") ", description" else ""} FROM $table ${if (after == null) "" else "WHERE id > ?"} ORDER BY id LIMIT 128", if (after == null) emptyList() else listOf(after))
                if (rows.isEmpty()) break
                for (row in rows) {
                    val title = Mentions.fold(row.getValue("title") as String)
                    if (table == "episode") execute("UPDATE episode SET title_folded = ?, description_folded = ? WHERE id = ?", listOf(title, Mentions.fold(row.getValue("description") as String), row["id"]))
                    else execute("UPDATE subscription SET title_folded = ? WHERE id = ?", listOf(title, row["id"]))
                    after = row.getValue("id") as String
                }
            }
        }
    }

    @Synchronized
    fun execute(sql: String, params: List<Any?> = emptyList()) {
        connection.prepare(sql).use { statement ->
            bind(statement, params)
            statement.step()
        }
    }

    @Synchronized
    fun query(sql: String, params: List<Any?> = emptyList()): List<Row> = connection.prepare(sql).use { statement ->
        bind(statement, params)
        buildList {
            while (statement.step()) {
                add((0 until statement.getColumnCount()).associate { index ->
                    statement.getColumnName(index) to when (statement.getColumnType(index)) {
                        1 -> statement.getLong(index) // SQLite INTEGER
                        2 -> statement.getDouble(index) // SQLite REAL
                        3 -> statement.getText(index) // SQLite TEXT
                        4 -> statement.getBlob(index) // SQLite BLOB
                        else -> null
                    }
                })
            }
        }
    }

    private fun bind(statement: androidx.sqlite.SQLiteStatement, params: List<Any?>) {
        params.forEachIndexed { i, value -> when (value) {
            null -> statement.bindNull(i + 1)
            is String -> statement.bindText(i + 1, value)
            is Double -> statement.bindDouble(i + 1, value)
            is Float -> statement.bindDouble(i + 1, value.toDouble())
            is Number -> statement.bindLong(i + 1, value.toLong())
            is ByteArray -> statement.bindBlob(i + 1, value)
            else -> error("Unsupported SQLite parameter type: ${value::class.simpleName}")
        } }
    }

    @Synchronized
    fun <T> transaction(block: LocalDatabase.() -> T): T {
        execute("BEGIN IMMEDIATE")
        return try {
            val result = block()
            execute("COMMIT")
            result
        } catch (error: Throwable) {
            try { execute("ROLLBACK") } catch (rollback: Throwable) { error.addSuppressed(rollback) }
            throw error
        }
    }

    private fun insert(table: String, row: Row) {
        // Table/column identifiers are internal constants; values are always bound.
        execute("INSERT INTO $table (${row.keys.joinToString(", ")}) VALUES (${row.keys.joinToString(", ") { "?" }})", row.values.toList())
    }

    private fun replaceState(state: State) {
        for ((table, rows) in StateIndex.stateToRows(state)) {
            execute("DELETE FROM $table")
            for (row in rows) insert(table, row)
        }
    }

    @Synchronized
    fun saveState(state: State) = transaction { replaceState(state) }

    @Synchronized
    fun loadState(): State = StateIndex.rowsToState(listOf("playlist", "view", "episode_state", "download_rule", "setting")
        .associateWith { query("SELECT * FROM $it ORDER BY rowid") })

    @Synchronized
    fun ensureState(defaults: PlaybackSettings = PlaybackSettings(1.0, 0.0, 0.0, false)): State = transaction {
        if (query("SELECT key FROM setting WHERE key = 'activePlaylistId'").isEmpty()) replaceState(State.initial(defaults))
        loadState()
    }

    @Synchronized
    fun evaluate(view: View, now: Long): List<Row> {
        val compiled = ViewQuery.compile(view, now)
        return query(compiled.sql, compiled.params)
    }

    @Synchronized
    fun upsertLibrary(subscriptions: List<Subscription>, episodes: List<Episode>, cursor: Long? = null) = transaction {
        for (s in subscriptions) upsert("subscription", linkedMapOf(
            "id" to s.id, "feed_url" to s.feedUrl, "title" to s.title, "title_folded" to Mentions.fold(s.title), "author" to s.author,
            "description" to s.description, "artwork_url" to s.artwork?.url, "subscribed_at" to s.subscribedAt,
            "unsubscribed_at" to s.unsubscribedAt, "played_threshold" to s.playedThreshold,
            "playback_settings" to ProtocolJson.encodeToString(s.playbackSettings)
        ))
        for (e in episodes) upsert("episode", linkedMapOf(
            "id" to e.id, "subscription_id" to e.subscriptionId, "guid" to e.guid, "title" to e.title,
            "title_folded" to Mentions.fold(e.title), "description_folded" to Mentions.fold(e.description),
            "description" to e.description, "published" to e.published, "duration" to e.duration,
            "audio_url" to e.audioUrl, "artwork_url" to e.artwork?.url,
            "chapters" to ProtocolJson.encodeToString(e.chapters), "audio_updated_at" to e.audioUpdatedAt
        ))
        cursor?.let { setMeta("catalogueCursor", it.toString()) }
    }

    private fun upsert(table: String, row: Row) {
        val columns = row.keys.joinToString(", ")
        val placeholders = row.keys.joinToString(", ") { "?" }
        val updates = row.keys.filterNot { it == "id" }.joinToString(", ") { "$it = excluded.$it" }
        execute("INSERT INTO $table ($columns) VALUES ($placeholders) ON CONFLICT (id) DO UPDATE SET $updates", row.values.toList())
    }

    @Synchronized
    fun getMeta(key: String): String? = query("SELECT value FROM sync_meta WHERE key = ?", listOf(key)).firstOrNull()?.get("value") as? String

    @Synchronized
    fun setMeta(key: String, value: String) = execute("INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", listOf(key, value))

    /** One durable edit: stable id, increasing sequence, outbox, optimistic State and indexes. */
    @Synchronized
    fun record(change: Change, recordedAt: Long, id: String = UUID.randomUUID().toString()): Operation = transaction {
        val deviceId = getMeta("deviceId") ?: UUID.randomUUID().toString().also { setMeta("deviceId", it) }
        val sequence = getMeta("sequence")?.toLong() ?: 0L
        val operation = Operation(id, deviceId, sequence, recordedAt, change)
        execute("INSERT INTO outbox (id, operation) VALUES (?, ?)", listOf(id, operation.encode()))
        setMeta("sequence", (sequence + 1).toString())
        replaceState(StateRules.apply(loadState(), change, recordedAt))
        operation
    }

    @Synchronized
    fun outbox(): List<Operation> = query("SELECT operation FROM outbox ORDER BY seq").map { Operation.decode(it.getValue("operation") as String) }

    @Synchronized
    fun confirmedState(): State? = getMeta("confirmedState")?.let(State::decode)

    // Confirmed State and userCursor are deliberately separate from optimistic State and catalogueCursor.
    @Synchronized
    fun saveConfirmed(state: State, cursor: Long) = transaction {
        setMeta("confirmedState", state.encode())
        setMeta("userCursor", cursor.toString())
    }

    @Synchronized
    override fun close() = connection.close()
}
