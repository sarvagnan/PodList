package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class EpisodeActionsTest {
    private val p = State.initial().playlists.first().copy(entries = listOf(Entry("a", 10.0, 0), Entry("b", 20.0, 0), Entry("c", 30.0, 0)), cursor = "a")
    @Test fun `several Next into an empty or past-end Playlist keeps displayed order`() {
        for (playlist in listOf(p.copy(entries = emptyList(), cursor = null), p.copy(cursor = null))) {
            val before = State.initial().copy(playlists = listOf(playlist))
            val after = EpisodeActions.addMany(listOf("x", "y", "z"), "default", Placement.Next, playlist).fold(before) { s, op -> StateRules.apply(s, op, 100) }
            assertEquals(listOf("x", "y", "z"), after.playlists.first().entries.takeLast(3).map { it.episodeId })
            assertEquals("x", after.playlists.first().cursor)
        }
    }
    @Test fun `selection containing the Cursor still preserves displayed order`() {
        val before = State.initial().copy(playlists = listOf(p))
        val after = EpisodeActions.addMany(listOf("a", "b", "d"), "default", Placement.Next, p).fold(before) { s, op -> StateRules.apply(s, op, 100) }
        assertEquals(listOf("a", "b", "d"), after.playlists.first().entries.filter { it.episodeId != "c" }.map { it.episodeId })
        assertEquals(1, after.playlists.first().entries.count { it.episodeId == "a" })
    }
    @Test fun `several Next preserves displayed order including existing Entries without duplicates`() {
        val before = State.initial().copy(playlists = listOf(p))
        val after = EpisodeActions.addMany(listOf("c", "d", "b"), "default", Placement.Next, p).fold(before) { s, op -> StateRules.apply(s, op, 100) }
        assertEquals(listOf("a", "c", "d", "b"), after.playlists.first().entries.map { it.episodeId })
        assertEquals(30.0, after.playlists.first().entries[1].position)
        val undo = EpisodeActions.undoAdd(p, listOf("c", "d", "b")).fold(after) { s, op -> StateRules.apply(s, op, 200) }
        assertEquals(p.entries, undo.playlists.first().entries)
        assertEquals(p.cursor, undo.playlists.first().cursor)
    }
    @Test fun `several Last preserves displayed order and Undo preserves later unrelated additions`() {
        val before = State.initial().copy(playlists = listOf(p))
        val after = EpisodeActions.addMany(listOf("b", "d"), "default", Placement.Last, p).fold(before) { s, op -> StateRules.apply(s, op, 100) }
        assertEquals(listOf("a", "c", "b", "d"), after.playlists.first().entries.map { it.episodeId })
        val edited = StateRules.apply(after, Change.AddEntry("default", "later", Placement.Last), 150)
        val undo = EpisodeActions.undoAdd(p, listOf("b", "d")).fold(edited) { s, op -> StateRules.apply(s, op, 200) }
        assertEquals(listOf("a", "b", "c", "later"), undo.playlists.first().entries.map { it.episodeId })
    }
    @Test fun `Undo manual Played restores cleared Entries across Playlists with independent Positions`() {
        val other = p.copy(id = "other", entries = listOf(Entry("a", 50.0, 0)), clearOnPlayed = true)
        val before = State.initial().copy(playlists = listOf(p, other), listeningLog = mapOf("2026-11-09" to mapOf("s" to 25.0)))
        val after = StateRules.apply(before, Change.MarkPlayed("a", PlayedSource.User), 100)
        assertTrue(after.playlists.all { it.entries.none { it.episodeId == "a" } })
        val undo = EpisodeActions.undoPlayed(before, listOf("a"), 200).fold(after) { s, op -> StateRules.apply(s, op, 200) }
        assertNull(undo.episodeStates["a"]?.played)
        assertEquals(listOf(10.0, 50.0), undo.playlists.map { it.entries.first().position })
        assertEquals(before.listeningLog, undo.listeningLog)
        assertEquals(listOf("a", "a"), undo.playlists.map { it.cursor })
        assertTrue(undo.playlists.all { it.history.isEmpty() })
    }
}
