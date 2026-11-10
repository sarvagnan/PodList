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

    @Test fun `open View rename survives live condition edits Undo leaving and cold reopen`() {
        val file = directory.resolve("view-rename.sqlite").toString()
        val view = View("walk", "Walk", ViewFilter(), ViewSort.PublishedDesc, null)
        val key = "view-rename:walk/name"
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.SaveView(view), 100)
        }
        for (text in listOf("Walk", "", "  Morning’s walk  ")) {
            LocalDatabase(file).use { db ->
                val drafts = FormDraftStore(db)
                val pending = db.outbox()
                drafts.put(key, text)
                assertEquals(pending, db.outbox())
                val condition = listOf(Change.SaveView(view.copy(filter = ViewFilter(text = "space"))))
                val inverse = db.reversibleEdit(condition, 101)
                drafts.reconcile(condition)
                assertEquals(text, drafts.load()[key])
                assertEquals("Walk", db.loadState().views.single().name)
                assertEquals("space", db.loadState().views.single().filter.text)
                db.reversibleEdit(inverse, 102)
                drafts.reconcile(inverse)
                // Done and Discard condition draft clear this prefix when leaving the editor.
                drafts.clear("view:walk/")
            }
            LocalDatabase(file).use { db ->
                assertEquals(text, FormDraftStore(db).load()[key])
                assertEquals(view, db.loadState().views.single())
            }
        }
    }

    @Test fun `Cancel clears only the open View rename without changing the View`() {
        val file = directory.resolve("view-cancel.sqlite").toString()
        val view = View("walk", "Walk", ViewFilter(), ViewSort.PublishedDesc, null)
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.SaveView(view), 100)
            val drafts = FormDraftStore(db)
            drafts.put("view-rename:walk/name", "")
            drafts.put("view-rename:other/name", "Keep typing")
            drafts.put("view:walk/number/Length", "oops")
            val pending = db.outbox()
            drafts.clear("view-rename:walk/name")
            assertEquals(pending, db.outbox())
        }
        LocalDatabase(file).use { db ->
            assertEquals(mapOf("view-rename:other/name" to "Keep typing", "view:walk/number/Length" to "oops"), FormDraftStore(db).load())
            assertEquals(view, db.loadState().views.single())
        }
    }

    @Test fun `Save records one View rename and Delete clears its open rename without affecting other Views`() {
        val file = directory.resolve("view-save.sqlite").toString()
        val view = View("walk", "Walk", ViewFilter(text = "space"), ViewSort.PublishedDesc, 20)
        LocalDatabase(file).use { db ->
            db.ensureState()
            db.record(Change.SaveView(view), 100)
            val drafts = FormDraftStore(db)
            drafts.put("view-rename:walk/name", "  Morning  ")
            drafts.put("view-rename:other/name", "Keep typing")
            // An invalid condition draft must not be applied by a rename or discarded on Save.
            val invalid = view.copy(filter = ViewFilter(minDuration = 1800.0, maxDuration = 600.0))
            drafts.put("view:walk/view", ProtocolJson.encodeToString(invalid))
            val count = db.outbox().size
            val inverse = db.reversibleEdit(listOf(Change.SaveView(view.copy(name = drafts.load().getValue("view-rename:walk/name").trim()))), 101)
            drafts.clear("view-rename:walk/name")
            assertEquals(count + 1, db.outbox().size)
            assertEquals(view.copy(name = "Morning"), db.loadState().views.single())
            assertEquals(ProtocolJson.encodeToString(invalid), drafts.load()["view:walk/view"])
            assertNull(drafts.load()["view-rename:walk/name"])
            db.reversibleEdit(inverse, 102)
            drafts.reconcile(inverse)
            assertEquals(view, db.loadState().views.single())
            drafts.put("view-rename:walk/name", "Still typing")
            val deletion = listOf(Change.DeleteView("walk"))
            db.reversibleEdit(deletion, 103)
            drafts.reconcile(deletion)
        }
        LocalDatabase(file).use { db ->
            assertEquals(mapOf("view-rename:other/name" to "Keep typing"), FormDraftStore(db).load())
            assertTrue(db.loadState().views.isEmpty())
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
            assertEquals(Names.Problem.Duplicate, PlaylistNames.validate(text, db.loadState().playlists, "walk"))
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
