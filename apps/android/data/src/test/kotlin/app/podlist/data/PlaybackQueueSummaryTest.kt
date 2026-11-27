package app.podlist.data

import app.podlist.domain.Entry
import app.podlist.domain.State
import kotlin.test.assertEquals
import org.junit.jupiter.api.Test

class PlaybackQueueSummaryTest {
    @Test fun `loaded and active counts use their own cursor and fall back after removal`() {
        LocalDatabase(":memory:").use { db ->
            val state = State.initial()
            val default = state.playlists.single().copy(
                name = "Default",
                entries = listOf(Entry("first", 0.0, 0), Entry("next", 0.0, 0), Entry("last", 0.0, 0)),
                cursor = "next",
            )
            val active = default.copy(id = "other", name = "Other", isDefault = false, cursor = "first")
            db.saveState(state.copy(playlists = listOf(default, active), activePlaylistId = active.id))
            assertEquals(PlaybackQueueSummary("Default", 2, "Other", 2), db.playbackQueueSummary(default.id, "first"))
            assertEquals(PlaybackQueueSummary("Default", 2, "Other", 2), db.playbackQueueSummary(default.id, "removed"))
            assertEquals(PlaybackQueueSummary(activePlaylistName = "Other", activeNextCount = 2), db.playbackQueueSummary("removed", "first"))
        }
    }
}
