package app.podlist.data

import app.podlist.domain.*
import kotlinx.serialization.encodeToString
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import kotlin.test.*

class FormDraftStoreTest {
    @TempDir lateinit var directory: Path

    @Test fun `task removal keeps exact names and invalid View conditions in their Library`() {
        val file = directory.resolve("library.sqlite").toString()
        val invalid = View("draft-id", "Walk", ViewFilter(minDuration = 1800.0, maxDuration = 600.0), ViewSort.PublishedDesc, null)
        val values = mapOf(
            "new-playlist/name" to "  Morning’s walk  ",
            "view:draft-id/view" to ProtocolJson.encodeToString(invalid),
            "view:draft-id/name" to "",
            "view:draft-id/number/Length" to "3,",
            "search-view/name" to "Evening"
        )
        LocalDatabase(file).use { db ->
            db.ensureState()
            values.forEach { (key, value) -> FormDraftStore(db).put(key, value) }
        }
        LocalDatabase(file).use { db ->
            assertEquals(values, FormDraftStore(db).load())
            val restored = ProtocolJson.decodeFromString<View>(FormDraftStore(db).load().getValue("view:draft-id/view"))
            assertEquals(ViewEdits.Problem.LengthRange, ViewEdits.problem(restored.filter))
            assertTrue(db.loadState().views.isEmpty())
            assertTrue(db.outbox().isEmpty())
        }
        LocalDatabase(directory.resolve("other-library.sqlite").toString()).use { db ->
            db.ensureState()
            assertTrue(FormDraftStore(db).load().isEmpty())
        }
    }

    @Test fun `completion and explicit discard clear only the intended form after reopen`() {
        val file = directory.resolve("library.sqlite").toString()
        LocalDatabase(file).use { db ->
            db.ensureState()
            val drafts = FormDraftStore(db)
            drafts.put("new-playlist/name", "Walk")
            drafts.put("view:one/name", "Invalid")
            drafts.put("view:one/number/Length", "oops")
            drafts.put("view:other/name", "Keep")
            db.transaction {
                record(Change.CreatePlaylist("p", "Walk", false), 100)
                drafts.clear("new-playlist/")
            }
            drafts.clear("view:one/")
        }
        LocalDatabase(file).use { db ->
            assertEquals(mapOf("view:other/name" to "Keep"), FormDraftStore(db).load())
            assertTrue(db.loadState().playlists.any { it.id == "p" })
        }
    }

    @Test fun `a failed creation transaction retains its draft`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val drafts = FormDraftStore(db)
            drafts.put("new-playlist/name", "Walk")
            assertFailsWith<IllegalStateException> {
                db.transaction { drafts.clear("new-playlist/"); error("Interrupted creation") }
            }
            assertEquals("Walk", drafts.load()["new-playlist/name"])
        }
    }
}
