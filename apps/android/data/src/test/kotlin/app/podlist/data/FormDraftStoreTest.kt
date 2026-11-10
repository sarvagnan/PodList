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

    @Test fun `open rename persists unchanged empty and valid text without recording edits`() {
        val file = directory.resolve("rename.sqlite").toString()
        val key = "playlist:walk/rename"
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("walk", "Walk", false), 100)
        }
        for (text in listOf("Walk", "", "  Morning’s walk  ")) {
            LocalDatabase(file).use { db ->
                val pending = db.outbox()
                FormDraftStore(db).put(key, text)
                assertEquals(pending, db.outbox())
                assertEquals("Walk", db.loadState().playlists.single { it.id == "walk" }.name)
            }
            LocalDatabase(file).use { db -> assertEquals(text, FormDraftStore(db).load()[key]) }
        }
    }

    @Test fun `rename from another Device keeps typing and validates against the new saved names`() {
        val file = directory.resolve("rename-elsewhere.sqlite").toString()
        val key = "playlist:walk/rename"
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("walk", "Walk", false), 100)
            db.record(Change.CreatePlaylist("other", "Other", false), 101)
            val drafts = FormDraftStore(db)
            drafts.put(key, "  Morning  ")
            val changes = listOf(Change.RenamePlaylist("walk", "Evening"), Change.RenamePlaylist("other", "Morning"))
            db.recordAll(changes, 102)
            drafts.reconcile(changes)
        }
        LocalDatabase(file).use { db ->
            val text = FormDraftStore(db).load().getValue(key)
            assertEquals("  Morning  ", text)
            assertEquals("Evening", db.loadState().playlists.single { it.id == "walk" }.name)
            assertEquals(PlaylistNames.Problem.Duplicate, PlaylistNames.validate(text, db.loadState().playlists, "walk"))
        }
    }

    @Test fun `saving clears the rename and records one reversible edit while Delete clears open renames`() {
        val file = directory.resolve("rename-save.sqlite").toString()
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("walk", "Walk", false), 100)
            val drafts = FormDraftStore(db)
            drafts.put("playlist:walk/rename", "  Morning  ")
            drafts.put("playlist:other/rename", "Keep")
            val count = db.outbox().size
            val inverse = db.transaction {
                val undo = reversibleEdit(listOf(Change.RenamePlaylist("walk", drafts.load().getValue("playlist:walk/rename").trim())), 101)
                drafts.clear("playlist:walk/")
                undo
            }
            assertEquals(count + 1, db.outbox().size)
            assertEquals("Morning", db.loadState().playlists.single { it.id == "walk" }.name)
            assertNull(drafts.load()["playlist:walk/rename"])
            db.reversibleEdit(inverse, 102)
            drafts.reconcile(inverse)
            assertEquals("Walk", db.loadState().playlists.single { it.id == "walk" }.name)
            drafts.put("playlist:walk/rename", "Still typing")
            val deletion = listOf(Change.DeletePlaylist("walk"))
            db.reversibleEdit(deletion, 103)
            drafts.reconcile(deletion)
        }
        LocalDatabase(file).use { db ->
            assertEquals(mapOf("playlist:other/rename" to "Keep"), FormDraftStore(db).load())
            assertTrue(db.loadState().playlists.none { it.id == "walk" })
        }
    }
}
