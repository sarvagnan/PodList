package app.podlist.data

import androidx.sqlite.SQLiteConnection
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import java.util.UUID

/** Native bundled SQLite on both Android and JVM. A connection is serialized by this owner.
 * HTTP runs outside transactions; readers and durable commits share this lock.
 */
class LocalDatabase(path: String, private val standalone: Boolean = false) : AutoCloseable {
    private var transactionDepth = 0
    private val connection: SQLiteConnection = BundledSQLiteDriver().open(path)

    init {
        try {
            execute("PRAGMA foreign_keys = ON")
            execute("CREATE TABLE IF NOT EXISTS android_migration (scope TEXT NOT NULL, id INTEGER NOT NULL, name TEXT NOT NULL, PRIMARY KEY (scope, id))")
            for ((scope, migrations) in listOf("shared" to SharedSchema.migrations, "client" to SharedSchema.clientMigrations, "device" to SharedSchema.deviceMigrations, "android" to SharedSchema.androidMigrations)) {
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
        val depth = transactionDepth
        val savepoint = "android_nested_$depth"
        execute(if (depth == 0) "BEGIN IMMEDIATE" else "SAVEPOINT $savepoint")
        transactionDepth++
        return try {
            val result = block()
            execute(if (depth == 0) "COMMIT" else "RELEASE SAVEPOINT $savepoint")
            result
        } catch (error: Throwable) {
            try {
                if (depth == 0) execute("ROLLBACK") else {
                    execute("ROLLBACK TO SAVEPOINT $savepoint")
                    execute("RELEASE SAVEPOINT $savepoint")
                }
            } catch (rollback: Throwable) { error.addSuppressed(rollback) }
            throw error
        } finally { transactionDepth-- }
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

    /** Initial Library setup and its once-only marker commit together, even across process death. */
    @Synchronized
    fun initializeStandalone() = transaction {
        val state = loadState()
        if (getMeta("starterViewsMade") == null) {
            if (state.views.isEmpty()) replaceState(state.copy(views = listOf(
                View("starter-new-this-week", "New this week", ViewFilter(published = PublishedFilter.LastDays(7), played = PlayedFilter.Unplayed), ViewSort.PublishedDesc, null),
                View("starter-under-30", "Under 30 minutes", ViewFilter(played = PlayedFilter.Unplayed, maxDuration = 1800.0), ViewSort.DurationAsc, null),
                View("starter-starred", "Starred", ViewFilter(starred = true), ViewSort.PublishedDesc, null)
            )))
            setMeta("starterViewsMade", "true")
        }
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
    fun record(change: Change, recordedAt: Long, id: String = UUID.randomUUID().toString()): Operation =
        recordAll(listOf(change), recordedAt, listOf(id)).first()

    /** Related changes (such as New Playlist + Add) either all commit or all roll back.
     * Local restores may also record a RenamePlaylist; remote replay never expands changes.
     */
    @Synchronized
    fun recordAll(changes: List<Change>, recordedAt: Long, ids: List<String> = changes.map { UUID.randomUUID().toString() }): List<Operation> {
        require(ids.size == changes.size)
        if (changes.isEmpty()) return emptyList()
        val result = transaction {
            val deviceId = getMeta("deviceId") ?: UUID.randomUUID().toString().also { setMeta("deviceId", it) }
            val sequence = getMeta("sequence")?.toLong() ?: 0L
            var state = loadState()
            var nextSequence = sequence
            val operations = changes.flatMapIndexed { index, requested ->
                val expanded = if (requested is Change.RestorePlaylist) PlaylistRestores.changes(state, requested, recordedAt) else listOf(requested)
                expanded.mapIndexed { part, change ->
                    val operation = Operation(if (part == 0) ids[index] else UUID.randomUUID().toString(), deviceId, nextSequence++, recordedAt, change)
                    val table = if (standalone) "local_operation" else "outbox"
                    execute("INSERT INTO $table (id, operation) VALUES (?, ?)", listOf(operation.id, operation.encode()))
                    if (standalone) when (change) {
                        is Change.SetSubscriptionOverrides -> execute("UPDATE subscription SET playback_settings = ?, played_threshold = ? WHERE id = ?", listOf(ProtocolJson.encodeToString(change.playbackSettings), change.playedThreshold, change.subscriptionId))
                        is Change.MarkSubscriptionPlayed -> {
                            val episodes = query("SELECT id FROM episode WHERE subscription_id = ? ORDER BY published ASC", listOf(change.subscriptionId))
                            for (row in episodes) {
                                val episode = row["id"] as String
                                if (state.episodeStates[episode]?.played == null) {
                                    val concrete = operation.copy(id = "${operation.id}:$episode", change = Change.MarkPlayed(episode, PlayedSource.User))
                                    execute("INSERT INTO local_operation (id, operation) VALUES (?, ?)", listOf(concrete.id, concrete.encode()))
                                    state = StateRules.apply(state, concrete.change, recordedAt)
                                }
                            }
                        }
                        else -> Unit
                    }
                    state = StateRules.apply(state, change, recordedAt)
                    operation
                }
            }
            setMeta("sequence", nextSequence.toString())
            replaceState(state)
            operations
        }
        notifyChanged()
        onEdit?.invoke()
        return result
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

    // A single repository observer wakes both UI readers and the lifecycle scheduler.
    @Volatile var onChanged: (() -> Unit)? = null
    @Volatile var onEdit: (() -> Unit)? = null
    fun notifyChanged() { onChanged?.invoke() }

    @Synchronized
    fun installation(): Device = transaction {
        val id = getMeta("deviceId") ?: UUID.randomUUID().toString().also { setMeta("deviceId", it) }
        val at = getMeta("registeredAt")?.toLong() ?: System.currentTimeMillis().also { setMeta("registeredAt", it.toString()) }
        Device(id, "PodList Android", DeviceKind.Android, at)
    }

    /** Acknowledgement, confirmed State, deduplication, cursor and optimistic rebuild commit together. */
    @Synchronized
    fun commitPull(page: PullPage, sent: List<Operation>) {
        transaction {
            val seen = if (page.snapshot != null) emptySet() else getMeta("seenOperations")?.let {
                ProtocolJson.decodeFromString<Set<String>>(it)
            }.orEmpty()
            val replayed = StateRules.replay(page.snapshot ?: confirmedState() ?: State.initial(), page.operations, seen)
            for (operation in sent) execute("DELETE FROM outbox WHERE id = ?", listOf(operation.id))
            setMeta("confirmedState", replayed.state.encode())
            setMeta("seenOperations", ProtocolJson.encodeToString(replayed.applied))
            setMeta("userCursor", page.cursor.toString())
            replaceState(StateRules.replay(replayed.state, outbox()).state)
        }
        notifyChanged()
    }

    @Synchronized
    override fun close() = connection.close()
}
