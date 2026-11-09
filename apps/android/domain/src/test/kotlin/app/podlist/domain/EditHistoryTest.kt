package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*
import kotlin.coroutines.*

class EditHistoryTest {
    private fun runImmediate(block: suspend () -> Unit) {
        var result: Result<Unit>? = null
        block.startCoroutine(object : Continuation<Unit> {
            override val context = EmptyCoroutineContext
            override fun resumeWith(value: Result<Unit>) { result = value }
        })
        checkNotNull(result).getOrThrow()
    }
    private fun <T> EditHistory<T>.completeUndo(inverse: T) = runImmediate { reverse { inverse } }
    private fun <T> EditHistory<T>.completeRedo(inverse: T) = runImmediate { reverse(redo = true) { inverse } }

    @Test fun `Undo and Redo traverse edits in order`() {
        val history = EditHistory<String>()
        history.record("first"); history.record("second"); history.record("third")
        assertEquals("third", history.undo)
        history.completeUndo("redo third")
        assertEquals("second", history.undo)
        history.completeUndo("redo second")
        assertEquals("redo second", history.redo)
        history.completeRedo("second")
        assertEquals("second", history.undo)
        assertEquals("redo third", history.redo)
        history.completeRedo("third")
        assertNull(history.redo)
        history.completeUndo("redo third")
        history.record("new edit")
        assertNull(history.redo)
    }

    @Test fun `typing keeps the value before the whole burst and ends at a boundary`() {
        val history = EditHistory<String>()
        history.record("before name", "name")
        history.record("C", "name"); history.record("Co", "name"); history.record("Commut", "name")
        assertEquals("before name", history.undo)
        history.endTyping()
        history.record("Commute", "name")
        history.completeUndo("redo later burst")
        assertEquals("before name", history.undo)
        history.record("before Mentions", "mentions")
        history.record("text", "mentions")
        history.completeUndo("redo Mentions")
        assertEquals("before name", history.undo)
    }

    @Test fun `failure leaves the same Undo or Redo available to retry`() {
        val history = EditHistory<() -> Unit>()
        var failing = true
        val action = { check(!failing) }
        history.record(action)
        assertFails { runImmediate { history.reverse { it(); it } } }
        assertSame(action, history.undo)
        failing = false
        history.undo!!.invoke()
        val redo = { error("offline") }
        history.completeUndo(redo)
        assertFails { runImmediate { history.reverse(redo = true) { it(); it } } }
        assertSame(redo, history.redo)
        history.clear()
        assertNull(history.undo); assertNull(history.redo)
    }

    @Test fun `accepting an unchanged new View saves it once and backing out needs no edit`() {
        val view = View("new", "New View", ViewFilter(), ViewSort.PublishedDesc, null)
        val initial = State.initial()
        assertTrue(initial.views.none { it.id == view.id })
        val accepted = assertNotNull(ViewEdits.accepted(view, view, exists = false))
        val saved = StateRules.apply(initial, accepted, 1)
        assertEquals(view, saved.views.single { it.id == view.id })
        assertNull(ViewEdits.accepted(view, view, exists = true))
        assertTrue(initial.views.none { it.id == view.id })
        assertNull(ViewEdits.accepted(view.copy(name = ""), view, exists = false))
    }
}
