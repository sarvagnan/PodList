package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class NamesTest {
    private val playlist = State.initial().playlists.single().copy(id = "p", name = " Commute ", isDefault = false)
    private val view = View("v", " Commute ", ViewFilter(), ViewSort.PublishedDesc, null)

    @Test fun `Playlist and View names ignore case and surrounding spaces and exclude only self`() {
        assertEquals(Names.Problem.Empty, PlaylistNames.validate("  ", listOf(playlist)))
        assertEquals(Names.Problem.Empty, ViewNames.validate("\t", listOf(view)))
        for (name in listOf("Commute", "COMMUTE", " commute ")) {
            assertEquals(Names.Problem.Duplicate, PlaylistNames.validate(name, listOf(playlist)))
            assertEquals(Names.Problem.Duplicate, ViewNames.validate(name, listOf(view)))
            assertNull(PlaylistNames.validate(name, listOf(playlist), "p"))
            assertNull(ViewNames.validate(name, listOf(view), "v"))
        }
        assertEquals(Names.Problem.Duplicate, ViewNames.validate("Commute", listOf(view, view.copy(id = "other")), "v"))
        assertEquals(Names.Problem.Duplicate, PlaylistNames.validate("Commute", listOf(playlist, playlist.copy(id = "other")), "p"))
    }

    @Test fun `Playlist names ignore Trash and are independent from View names`() {
        val state = State.initial().copy(trash = listOf(TrashedPlaylist(playlist, 1)), views = listOf(view))
        assertNull(PlaylistNames.validate("Commute", state.playlists))
        assertNull(ViewNames.validate("Default", state.views))
    }

    @Test fun `next free name uses first available suffix without parsing an existing suffix`() {
        assertEquals("Commute", Names.nextFreeName(" Commute ", emptyList()))
        assertEquals("Commute 2", Names.nextFreeName("Commute", listOf(" commute ", "Commute 3")))
        assertEquals("Commute 4", Names.nextFreeName("Commute", listOf("COMMUTE", " commute 2 ", "Commute 3")))
        assertEquals("Commute 2 2", Names.nextFreeName("Commute 2", listOf("commute 2")))
    }

    @Test fun `local restore plans a wire rename while replay preserves duplicates from another Device`() {
        val state = State.initial().copy(playlists = listOf(playlist.copy(id = "live", name = "Commute")),
            trash = listOf(TrashedPlaylist(playlist.copy(name = "Commute"), 1)))
        val change = Change.RestorePlaylist("p")
        val changes = PlaylistRestores.changes(state, change, 2)
        assertEquals(listOf(change, Change.RenamePlaylist("p", "Commute 2")), changes)
        val restored = changes.fold(state) { s, c -> StateRules.apply(s, c, 2) }
        assertEquals("Commute 2", restored.playlists.single { it.id == "p" }.name)
        assertEquals(listOf("Commute", "Commute"), StateRules.apply(state, change, 2).playlists.map { it.name })
        val undone = EditUndo.inverse(state, change, 3).fold(restored) { s, c -> StateRules.apply(s, c, 3) }
        assertEquals("Commute", undone.trash!!.single().playlist.name)
    }

    @Test fun `expired missing and already live restores do not rename another Playlist`() {
        val state = State.initial().copy(playlists = listOf(playlist), trash = listOf(TrashedPlaylist(playlist.copy(id = "old"), 0)))
        for (id in listOf("old", "missing", "p")) {
            val change = Change.RestorePlaylist(id)
            assertEquals(listOf(change), PlaylistRestores.changes(state, change, 31L * 86_400_000))
        }
    }

    @Test
    fun `a collision names the taken spelling`() {
        assertEquals("Starred", Names.match(" starred ", listOf("New this week", "Starred")))
        assertEquals(null, Names.match("Fresh", listOf("Starred")))
    }
}
