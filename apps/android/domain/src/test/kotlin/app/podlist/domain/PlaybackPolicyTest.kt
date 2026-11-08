package app.podlist.domain

import kotlin.test.*
import org.junit.jupiter.api.Test

class PlaybackPolicyTest {
    @Test fun `advance reads the reduced Active Playlist rather than a stale successor index`() {
        val initial = State.initial()
        val p = initial.playlists.single().copy(entries = listOf(Entry("a", 0.0, 0), Entry("b", 20.0, 0)), cursor = "a")
        val state = initial.copy(playlists = listOf(p))
        val played = StateRules.apply(state, Change.MarkPlayed("a", PlayedSource.Playback(p.id)), 1000)
        assertEquals("b", PlaybackPolicy.target(played)?.entry?.episodeId)
        assertEquals(20.0, PlaybackPolicy.target(played)?.entry?.position)
        val finished = StateRules.apply(played, Change.MarkPlayed("b", PlayedSource.Playback(p.id)), 2000)
        assertNull(PlaybackPolicy.target(finished))
        assertEquals(10.0, PlaybackPolicy.startPosition(0.0, 100.0, 10.0))
        assertEquals(0.0, PlaybackPolicy.startPosition(0.0, 5.0, 10.0))
    }

    @Test fun `threshold does not advance but actual end does`() {
        assertEquals(PlaybackBoundary.Continue, PlaybackPolicy.boundary(975.0, 1000.0, 0.0, false, null, 0))
        assertEquals(PlaybackBoundary.Continue, PlaybackPolicy.boundary(1000.0, 1000.0, 0.0, false, null, 0))
        assertEquals(PlaybackBoundary.Advance, PlaybackPolicy.boundary(1000.0, 1000.0, 0.0, true, null, 0))
        assertEquals(PlaybackBoundary.Advance, PlaybackPolicy.boundary(990.0, 1000.0, 10.0, false, null, 0))
        assertEquals(PlaybackBoundary.Advance, PlaybackPolicy.boundary(5.0, null, 0.0, true, null, 0))
    }
    @Test fun `sleep stops at Chapter and Episode boundaries before advancing`() {
        assertEquals(PlaybackBoundary.Sleep, PlaybackPolicy.boundary(60.0, 100.0, 0.0, false, SleepTimer.ChapterEnd(60.0), 0))
        assertEquals(PlaybackBoundary.Sleep, PlaybackPolicy.boundary(90.0, 100.0, 10.0, false, SleepTimer.EpisodeEnd, 0))
        assertEquals(PlaybackBoundary.Sleep, PlaybackPolicy.boundary(1.0, null, 0.0, false, SleepTimer.Until(5000), 5000))
        assertEquals(PlaybackBoundary.Continue, PlaybackPolicy.boundary(1.0, null, 0.0, false, null, 5000))
    }
    @Test fun `playing or finishing Device holds its Entry while paused Device follows State`() {
        assertTrue(PlaybackPolicy.holdLoaded(true, false, false))
        assertTrue(PlaybackPolicy.holdLoaded(false, true, false))
        assertFalse(PlaybackPolicy.holdLoaded(false, true, true))
        assertFalse(PlaybackPolicy.holdLoaded(false, false, false))
    }
    @Test fun `sources prefer stored file and otherwise reach host without server`() {
        assertEquals(listOf("file:///episode"), PlaybackPolicy.sources("file:///episode", "https://host/audio", "https://server/proxy"))
        assertEquals(listOf("https://host/audio", "https://server/proxy"), PlaybackPolicy.sources(null, "https://host/audio", "https://server/proxy"))
        assertEquals(listOf("https://server/proxy"), PlaybackPolicy.sources(null, null, "https://server/proxy"))
        assertEquals(listOf("same"), PlaybackPolicy.sources(null, "same", "same"))
    }
    @Test fun `Subscription only overrides keys supplied and Episode speed stays transient`() {
        val saved = PlaybackSettings(1.5, 10.0, 5.0, true)
        assertEquals(PlaybackSettings(2.0, 10.0, 0.0, true), PlaybackPolicy.settings(saved, PlaybackSettingsOverride(speed = 2.0, skipOutro = 0.0)))
        assertEquals(1.5, saved.speed)
    }
    @Test fun `Chapter Artwork is most specific and absent chapters sleep at Episode end`() {
        val chapters = listOf(Chapter(0.0, "One", null, null), Chapter(60.0, "Two", Artwork("chapter"), null))
        assertEquals("chapter", PlaybackPolicy.artwork(chapters, 70.0, "episode", "podcast"))
        assertEquals("episode", PlaybackPolicy.artwork(chapters, 5.0, "episode", "podcast"))
        assertEquals(SleepTimer.ChapterEnd(60.0), PlaybackPolicy.chapterSleep(chapters, 5.0))
        assertEquals(SleepTimer.EpisodeEnd, PlaybackPolicy.chapterSleep(chapters, 70.0))
    }
}
