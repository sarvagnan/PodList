package app.podlist.data

import app.podlist.domain.*
import org.junit.jupiter.api.Test
import kotlin.test.*
import kotlin.coroutines.*

class ReversibleEditsTest {
    private fun runImmediate(block: suspend () -> Unit) {
        var result: Result<Unit>? = null
        block.startCoroutine(object : Continuation<Unit> {
            override val context = EmptyCoroutineContext
            override fun resumeWith(value: Result<Unit>) { result = value }
        })
        checkNotNull(result).getOrThrow()
    }

    @Test fun `live name and Mentions bursts each undo and redo as one durable edit`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            var view = View("v", "Original", ViewFilter(), ViewSort.PublishedDesc, null)
            db.record(Change.SaveView(view), 1)
            val history = EditHistory<List<Change>>()
            var at = 2L
            for (name in listOf("C", "Co", "Commute")) {
                view = view.copy(name = name)
                history.record(db.reversibleEdit(listOf(Change.SaveView(view)), at++), "name")
            }
            history.endTyping()
            for (text in listOf("s", "spa", "space")) {
                view = view.copy(filter = view.filter.copy(text = text))
                history.record(db.reversibleEdit(listOf(Change.SaveView(view)), at++), "mentions")
            }
            runImmediate { history.reverse { db.reversibleEdit(it, at++) } }
            assertEquals("Commute", db.loadState().views.single().name)
            assertNull(db.loadState().views.single().filter.text)
            runImmediate { history.reverse { db.reversibleEdit(it, at++) } }
            assertEquals("Original", db.loadState().views.single().name)
            assertNull(history.undo)
            runImmediate { history.reverse(redo = true) { db.reversibleEdit(it, at++) } }
            runImmediate { history.reverse(redo = true) { db.reversibleEdit(it, at++) } }
            assertEquals(view, db.loadState().views.single())
        }
    }

    @Test fun `accepting untouched new View persists it once while an abandoned draft leaves no operations`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val draft = View("new", "New View", ViewFilter(), ViewSort.PublishedDesc, null)
            assertTrue(db.outbox().isEmpty())
            assertTrue(db.loadState().views.none { it.id == draft.id })
            val edit = assertNotNull(ViewEdits.accepted(draft, draft, exists = false))
            val undo = db.reversibleEdit(listOf(edit), 1)
            assertEquals(listOf(draft), db.loadState().views)
            assertNull(ViewEdits.accepted(draft, draft, exists = true))
            assertEquals(1, db.outbox().size)
            val redo = db.reversibleEdit(undo, 2)
            assertTrue(db.loadState().views.isEmpty())
            db.reversibleEdit(redo, 3)
            assertEquals(listOf(draft), db.loadState().views)
        }
    }

    @Test fun `reversal captures current State and preserves unrelated edits through repeated traversal`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val id = db.loadState().activePlaylistId
            db.recordAll(listOf(Change.AddEntry(id, "a", Placement.Last), Change.AddEntry(id, "b", Placement.Last)), 1)
            val undo = db.reversibleEdit(listOf(Change.RemoveEntry(id, "a"), Change.SetStar("b", true)), 2)
            db.record(Change.AddEntry(id, "later", Placement.Last), 3)
            val redo = db.reversibleEdit(undo, 4)
            assertEquals(listOf("a", "b", "later"), db.loadState().playlists.first().entries.map { it.episodeId })
            assertFalse(db.loadState().episodeStates["b"]?.starred == true)
            val undoAgain = db.reversibleEdit(redo, 5)
            assertEquals(listOf("b", "later"), db.loadState().playlists.first().entries.map { it.episodeId })
            assertTrue(db.loadState().episodeStates["b"]!!.starred)
            db.reversibleEdit(undoAgain, 6)
            assertEquals(listOf("a", "b", "later"), db.loadState().playlists.first().entries.map { it.episodeId })
        }
    }

    @Test fun `failed reversal transaction retains earlier State and operations`() {
        LocalDatabase(":memory:").use { db ->
            db.ensureState()
            val before = db.loadState()
            assertFails { db.reversibleEdit(listOf(Change.SetStar("e", true), Change.SetSubscriptionOverrides("missing", PlaybackSettingsOverride(), null)), 1) }
            assertEquals(before, db.loadState())
            assertTrue(db.outbox().isEmpty())
        }
    }
}
