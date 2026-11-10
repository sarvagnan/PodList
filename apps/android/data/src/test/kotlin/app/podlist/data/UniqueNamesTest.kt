package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import kotlin.test.*

class UniqueNamesTest {
    @Test fun `create and rename refuse taken View names without operations and preserve received duplicates`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val view = View("v", "Commute", ViewFilter(), ViewSort.PublishedDesc, null)
            assertNull(db.reversibleNamedView(view, 1).problem)
            db.record(Change.SaveView(view.copy(id = "other", name = "Other")), 2)
            val operations = db.outbox()
            for (id in listOf("new", "other")) {
                assertEquals(Names.Problem.Duplicate, db.reversibleNamedView(view.copy(id = id, name = " commute "), 3).problem)
                assertEquals(Names.Problem.Empty, db.reversibleNamedView(view.copy(id = id, name = " "), 3).problem)
            }
            assertEquals(operations, db.outbox())
            assertNull(db.reversibleNamedView(view.copy(name = " COMMUTE "), 4).problem)
            assertEquals("COMMUTE", db.loadState().views.first().name)
            // Raw protocol edits remain permissive, including updates to existing duplicate Views.
            db.record(Change.SaveView(view.copy(id = "remote")), 5)
            val duplicate = db.loadState().views.single { it.id == "remote" }
            db.reversibleEdit(listOf(Change.SaveView(duplicate.copy(filter = ViewFilter(starred = true)))), 6)
            assertEquals(2, db.loadState().views.count { it.name.equals("Commute", ignoreCase = true) })
        }
    }

    @Test fun `Trash restore and Delete Undo record a free name and undo returns the original name to Trash`() {
        for (standalone in listOf(false, true)) LocalDatabase(":memory:", standalone = standalone).use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("old", "Commute", false), 1)
            val deleteUndo = db.reversibleEdit(listOf(Change.DeletePlaylist("old")), 2)
            db.record(Change.CreatePlaylist("new", " commute ", false), 3)
            // Trash Restore uses the same durable recording path as Delete Undo.
            val restoreUndo = db.reversibleEdit(deleteUndo, 4)
            assertEquals("Commute 2", db.loadState().playlists.single { it.id == "old" }.name)
            val redo = db.reversibleEdit(restoreUndo, 5)
            assertEquals("Commute", db.loadState().trash!!.single().playlist.name)
            db.record(Change.CreatePlaylist("suffix", "Commute 2", false), 6)
            val undoAgain = db.reversibleEdit(redo, 7)
            assertEquals("Commute 3", db.loadState().playlists.single { it.id == "old" }.name)
            db.reversibleEdit(undoAgain, 8)
            assertEquals("Commute", db.loadState().trash!!.single().playlist.name)
        }
    }

    @Test fun `direct record expands restores with ordered wire operations and unique increasing sequences`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            db.record(Change.CreatePlaylist("old", "Commute", false), 1)
            db.record(Change.DeletePlaylist("old"), 2)
            db.record(Change.CreatePlaylist("new", "Commute", false), 3)
            val operation = db.record(Change.RestorePlaylist("old"), 4, "restore")
            assertEquals("restore", operation.id)
            val operations = db.outbox()
            assertEquals(listOf(Change.RestorePlaylist("old"), Change.RenamePlaylist("old", "Commute 2")), operations.takeLast(2).map { it.change })
            assertEquals(operations.indices.map(Int::toLong), operations.map { it.sequence })
            val next = db.record(Change.SetStar("e", true), 5)
            assertEquals(operations.last().sequence + 1, next.sequence)
            assertEquals(operations.size, operations.map { it.id }.toSet().size)
        }
    }
}
