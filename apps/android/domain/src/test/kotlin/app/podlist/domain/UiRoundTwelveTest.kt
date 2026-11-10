package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class UiRoundTwelveTest {
    @Test fun `select all handles partial stale empty and duplicate ids then clears all`() {
        val rows = listOf("a", "b", "b")
        assertFalse(ListSelection.allSelected(emptyList(), emptySet()))
        assertFalse(ListSelection.allSelected(rows, setOf("a")))
        assertEquals(setOf("a", "b"), ListSelection.toggleAll(rows, setOf("a", "stale")))
        assertTrue(ListSelection.allSelected(rows, setOf("a", "b")))
        assertEquals(emptySet(), ListSelection.toggleAll(rows, setOf("a", "b")))
        assertEquals(emptySet(), ListSelection.toggleAll(emptyList(), setOf("stale")))
    }

    @Test fun `publisher pages take precedence over feed addresses and audio and never guess from guids`() {
        val page = "https://podcast.test/episode"
        val podcast = "https://podcast.test"
        val feed = "https://podcast.test/rss"
        val audio = "https://cdn.test/audio.mp3"
        assertEquals(page, ShareLinks.episode(page, podcast, feed, audio))
        assertEquals(podcast, ShareLinks.episode(null, podcast, feed, audio))
        assertEquals(feed, ShareLinks.episode(null, null, feed, audio))
        assertEquals(audio, ShareLinks.episode(null, null, null, audio))
        assertEquals(podcast, ShareLinks.podcast(" $podcast ", feed))
        assertEquals(feed, ShareLinks.podcast("javascript:alert(1)", feed))
        assertEquals(audio, ShareLinks.episode(" ", "https://", "file:///etc", audio))
        assertNull(ShareLinks.episode(null, null, null, null))
    }
}
