package app.podlist.domain

import java.util.Locale
import org.junit.jupiter.api.Test
import kotlin.test.*

class UiEditRulesTest {
    @Test fun `decimal parsing consumes the whole locale-formatted input`() {
        assertEquals(1.5, NumberInput.parse(" 1,5 ", Locale.GERMANY))
        assertEquals(1.5, NumberInput.parse("1.5", Locale.US))
        assertEquals(1.5, NumberInput.parse("1,5", Locale.FRANCE))
        assertEquals(1.5, NumberInput.parse(NumberInput.format(1.5, Locale.GERMANY), Locale.GERMANY))
        for (input in listOf("1,5x", "1.5", "1.000,5", "NaN", "∞", "", "-∞")) assertNull(NumberInput.parse(input, Locale.GERMANY), input)
        assertNull(NumberInput.parse("1,500", Locale.US))
    }

    private fun apply(state: State, changes: List<Change>) = changes.fold(state) { s, change -> StateRules.apply(s, change, 200) }

    @Test fun `Remove Entry undo restores order Position and Cursor without erasing later additions`() {
        val playlist = State.initial().playlists.first().copy(entries = listOf(Entry("a", 5.0, 0), Entry("b", 70.0, 0), Entry("c", 10.0, 0)), cursor = "b")
        val before = State.initial().copy(playlists = listOf(playlist))
        val change = Change.RemoveEntry(playlist.id, "b")
        val removed = StateRules.apply(before, change, 100)
        assertEquals(listOf("a", "c"), removed.playlists.first().entries.map { it.episodeId })
        val later = StateRules.apply(removed, Change.AddEntry(playlist.id, "later", Placement.Last), 150)
        val restored = apply(later, EditUndo.inverse(before, change, 200)).playlists.first()
        assertEquals(listOf("a", "b", "c", "later"), restored.entries.map { it.episodeId })
        assertEquals(70.0, restored.entries[1].position)
        assertEquals("b", restored.cursor)
        assertTrue(EditUndo.removeEntry(playlist, "missing", 200).isEmpty())
    }

    @Test fun `settings name View and Star inverses keep unrelated edits`() {
        val view = View("v", "Original", ViewFilter(), ViewSort.PublishedDesc, null)
        val before = State.initial().copy(views = listOf(view))
        val edits = listOf(Change.SetPlaybackSettings(PlaybackSettings(1.5, 30.0, 60.0, true)), Change.SetTrashDays(7),
            Change.SetStar("a", true), Change.SaveView(view.copy(name = "Changed")), Change.SetDownloadRule(DownloadRule("s", "d", DownloadMode.AllNew, 4)))
        for (change in edits) {
            val after = StateRules.apply(StateRules.apply(before, change, 100), Change.SetStar("unrelated", true), 150)
            val restored = apply(after, EditUndo.inverse(before, change, 200))
            assertEquals(before.playbackSettings, restored.playbackSettings)
            assertEquals(before.trashDays ?: 30, restored.trashDays ?: 30)
            assertEquals(view, restored.views.single())
            assertTrue(restored.episodeStates["unrelated"]!!.starred)
            assertTrue(restored.episodeStates["a"]?.starred != true)
            assertTrue(restored.downloadRules.all { it.mode == DownloadMode.Never })
        }
        val playlist = before.playlists.first().copy(isDefault = false, id = "custom", name = "Old")
        val named = before.copy(playlists = before.playlists + playlist)
        val rename = Change.RenamePlaylist("custom", "New")
        assertEquals("Old", apply(StateRules.apply(named, rename, 100), EditUndo.inverse(named, rename, 200)).playlists.last().name)
    }

    @Test fun `Subscription overrides undo restores inherited values and threshold`() {
        val sub = Subscription("s", "https://podcast.test", "Podcast", null, null, null, 0, null, null, PlaybackSettingsOverride())
        val change = Change.SetSubscriptionOverrides("s", PlaybackSettingsOverride(speed = 2.0), 0.0)
        assertEquals(listOf(Change.SetSubscriptionOverrides("s", PlaybackSettingsOverride(), null)), EditUndo.inverse(State.initial(), change, 200, sub))
    }
}
