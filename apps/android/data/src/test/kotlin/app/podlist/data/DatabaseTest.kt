package app.podlist.data

import app.podlist.domain.*
import java.nio.file.Files
import java.nio.file.Path
import kotlinx.serialization.json.*
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory
import kotlin.test.*

private val protocol = Path.of(System.getProperty("podlist.protocol"))
private fun document(path: Path) = ProtocolJson.parseToJsonElement(Files.readString(path))
private inline fun <reified T> JsonElement.decode(): T = ProtocolJson.decodeFromJsonElement(this)

class DatabaseTest {
    @TestFactory
    fun `Views on real bundled SQLite`() = document(protocol.resolve("views.json")).jsonObject.let { fixture ->
        fixture.getValue("cases").jsonArray.map { caseElement ->
            val case = caseElement.jsonObject
            DynamicTest.dynamicTest("view: ${case.getValue("name").jsonPrimitive.content}") {
                LocalDatabase(":memory:").use { db ->
                    val subscriptions = fixture.getValue("subscriptions").decode<List<Subscription>>()
                    val episodes = (case["episodes"] ?: fixture.getValue("episodes")).decode<List<Episode>>()
                    db.upsertLibrary(subscriptions, episodes)
                    db.saveState(fixture.getValue("state").decode())
                    val query = case.getValue("view").jsonObject
                    val compiled = ViewQuery.compile(query.getValue("filter").decode(), query.getValue("sort").decode(),
                        query.getValue("limit").jsonPrimitive.longOrNull, (case["now"] ?: fixture.getValue("now")).jsonPrimitive.long)
                    val actual = db.query(compiled.sql, compiled.params).map { it.getValue("id") as String }
                    assertEquals(case.getValue("expected").decode<List<String>>(), actual)
                }
            }
        }
    }

    @TestFactory
    fun `every sync State survives SQLite document and index mapping`() = Files.walk(protocol.resolve("vectors")).use { paths ->
        paths.filter { Files.isRegularFile(it) && it.toString().endsWith(".json") }.sorted().toList()
    }.map { path -> DynamicTest.dynamicTest("SQLite State: ${path.fileName}") {
        val vector = document(path).jsonObject
        val states = listOf(vector.getValue("initial"), vector.getValue("expected")) + vector["checkpoints"]?.jsonArray.orEmpty()
        LocalDatabase(":memory:").use { db ->
            for (element in states) {
                val state = element.decode<State>()
                db.saveState(state)
                assertEquals(state, db.loadState())
                assertEquals(StateIndex.stateToRows(state)["entry_index"]?.size?.toLong(), db.query("SELECT count(*) AS n FROM entry_index").single()["n"])
                val expected = state.playlists.flatMap { p -> p.entries.mapIndexed { i, e -> listOf(p.id, e.episodeId, i.toLong(), e.position) } }.toSet()
                val actual = db.query("SELECT * FROM entry_index").map { listOf(it["playlist_id"], it["episode_id"], it["ordinal"], (it["position"] as Number).toDouble()) }.toSet()
                assertEquals(expected, actual)
                assertEquals(state, StateIndex.rowsToState(StateIndex.stateToRows(state)))
            }
        }
    } }

    @Test
    fun `migrations exactly match shared and web SQL sources`() {
        val repo = Path.of(System.getProperty("podlist.repo"))
        val source = Files.readString(repo.resolve("packages/domain/src/Sql.ts"))
            .substringAfter("export const migrations:").substringBefore("/** Runs the shared")
        val bodies = Regex("statements: \\[([\\s\\S]*?)\\n    ]").findAll(source).map { it.groupValues[1] }.toList()
        fun normalize(sql: String) = sql.trim().replace(Regex("\\s+"), " ")
        val statements = bodies.flatMap { body ->
            val withoutComments = body.replace(Regex("//[^\\n]*"), "")
            Regex("`([^`]+)`|\"([^\"\\n]+)\"").findAll(withoutComments).map { match ->
                match.groupValues[1].ifEmpty { match.groupValues[2] }
            }.toList()
        }
        assertEquals(statements.map(::normalize), SharedSchema.migrations.flatMap { it.statements }.map(::normalize))
        val identities = Regex("id: (\\d+),\\s+name: \"([^\"]+)\"").findAll(source).map { it.groupValues[1].toInt() to it.groupValues[2] }.toList()
        assertEquals(identities, SharedSchema.migrations.map { it.id to it.name })
        val web = Files.readString(repo.resolve("packages/web/src/platform/LocalDb.ts"))
        val clientSql = Regex("sql`(CREATE TABLE[\\s\\S]*?)`").findAll(web).map { normalize(it.groupValues[1]) }.toList()
        assertEquals(clientSql, SharedSchema.clientMigrations.flatMap { it.statements }.map(::normalize))
    }

    @Test
    fun `edits outbox sequence confirmed State and cursors persist independently`() {
        val path = Files.createTempFile("podlist-native-", ".sqlite")
        try {
            val deviceId: String
            val first: Operation
            LocalDatabase(path.toString()).use { db ->
                val initial = db.ensureState()
                db.saveConfirmed(initial, 7)
                db.upsertLibrary(emptyList(), emptyList(), 17)
                first = db.record(Change.AddEntry(DefaultPlaylistId, "a", Placement.Last), 100, "stable-id")
                assertEquals(0L, first.sequence)
                deviceId = first.deviceId
                assertEquals(listOf(first), db.outbox())
                assertEquals(initial, db.confirmedState())
                val state = db.loadState()
                assertFails { db.record(Change.SetStar("b", true), 200, "stable-id") }
                assertEquals(state, db.loadState())
                assertEquals("1", db.getMeta("sequence"))
                assertEquals(listOf(first), db.outbox())
                assertFailsWith<IllegalStateException> {
                    db.transaction {
                        setMeta("userCursor", "999")
                        execute("DELETE FROM entry_index")
                        error("rollback")
                    }
                }
                assertEquals("7", db.getMeta("userCursor"))
                assertEquals(1L, db.query("SELECT count(*) AS n FROM entry_index").single()["n"])
            }
            LocalDatabase(path.toString()).use { db ->
                assertEquals(deviceId, db.getMeta("deviceId"))
                assertEquals(listOf(first), db.outbox())
                assertEquals("7", db.getMeta("userCursor"))
                assertEquals("17", db.getMeta("catalogueCursor"))
                val second = db.record(Change.SetStar("a", true), 200, "second-id")
                assertEquals(1L, second.sequence)
                assertEquals(deviceId, second.deviceId)
                assertEquals(listOf(first, second), db.outbox())
                assertTrue(db.loadState().episodeStates.getValue("a").starred)
                assertTrue(db.confirmedState()!!.episodeStates.isEmpty())
                assertEquals(5L, db.query("SELECT count(*) AS n FROM android_migration").single()["n"])
                assertTrue(db.query("PRAGMA table_info(episode)").any { it["name"] == "chapters_url" })
                assertTrue(db.query("PRAGMA table_info(episode)").any { it["name"] == "chapters_fetched_at" })
            }
        } finally { Files.deleteIfExists(path) }
    }

    @Test
    fun `Library pages roll back on invalid Episode and preserve State`() {
        LocalDatabase(":memory:").use { db ->
            val state = db.ensureState()
            db.upsertLibrary(emptyList(), emptyList(), 10)
            val invalid = Episode("missing", "absent", "g", "t", "", 0, null, "https://example.test/audio", null, emptyList(), null)
            assertFails { db.upsertLibrary(emptyList(), listOf(invalid), 11) }
            assertEquals("10", db.getMeta("catalogueCursor"))
            assertTrue(db.query("SELECT * FROM episode").isEmpty())
            assertEquals(state, db.loadState())
        }
    }
}
