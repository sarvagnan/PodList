package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class BrowsingContextTest {
    private fun validate(context: BrowsingContext) = context.validated(setOf("v"), setOf("p"), setOf("s"), setOf("e"))

    @Test fun `restore keeps each destination stack and drops deleted objects and descendants`() {
        val context = BrowsingContext("Library", mapOf(
            "Views" to listOf("view:v", "episode:e"),
            "Playlists" to listOf("playlist:deleted", "episode:e"),
            "Library" to listOf("subscription:s", "subscription-settings:s")
        ))
        val restored = validate(context)
        assertEquals("Library", restored.destination)
        assertEquals(context.stacks["Views"], restored.stacks["Views"])
        assertEquals(context.stacks["Library"], restored.stacks["Library"])
        assertEquals(emptyList(), restored.stacks["Playlists"])
        assertEquals(emptyList(), validate(context.copy(stacks = mapOf("Library" to listOf("subscription:deleted")))).stacks["Library"])
        assertEquals(emptyList(), validate(context.copy(stacks = mapOf("Views" to listOf("episode:deleted")))).stacks["Views"])
    }

    @Test fun `unknown destinations and routes fall back safely without recreating drafts`() {
        val restored = validate(BrowsingContext("unknown", mapOf("Views" to listOf("settings", "new-view:draft", "episode:e"), "unknown" to listOf("settings"))))
        assertEquals("Views", restored.destination)
        assertEquals(mapOf("Views" to listOf("settings")), restored.stacks)
    }

    @Test fun `back trims history while switching destinations keeps other stacks`() {
        val context = BrowsingContext(stacks = mapOf("Views" to listOf("view:v", "episode:e"), "Library" to listOf("subscription:s")))
        val back = context.visiting("Views", "view:v")
        assertEquals(listOf("view:v"), back.stacks["Views"])
        assertEquals(context.stacks["Library"], back.stacks["Library"])
        assertEquals(emptyList(), back.visiting("Views", null).stacks["Views"])
    }

    @Test fun `scroll follows stable key after reordering and clamps missing anchors`() {
        assertEquals(2, restoredScrollIndex(ScrollAnchor("e", 0, 18), listOf("a", "b", "e")))
        assertEquals(1, restoredScrollIndex(ScrollAnchor("gone", 50, 18), listOf("a", "b")))
        assertEquals(0, restoredScrollIndex(ScrollAnchor("gone", 50, 18), emptyList()))
        val restored = validate(BrowsingContext(scrolls = mapOf("list" to ScrollAnchor(null, -5, -9)), playlistTabs = mapOf("deleted" to 1, "p" to 7)))
        assertEquals(ScrollAnchor(), restored.scrolls["list"])
        assertEquals(mapOf("p" to 2), restored.playlistTabs)
    }

    @Test fun `empty and past end Playlists have no current Entry even when rows remain`() {
        val empty = Playlist("p", "Walk", false, false, emptyList(), null, emptyList(), emptyList())
        assertTrue(PlaylistRules.hasNoCurrentEntry(empty))
        val pastEnd = empty.copy(entries = listOf(Entry("e", 60.0, 100)))
        assertTrue(PlaylistRules.hasNoCurrentEntry(pastEnd))
        assertTrue(PlaylistRules.hasNoCurrentEntry(pastEnd.copy(cursor = "missing")))
        assertFalse(PlaylistRules.hasNoCurrentEntry(pastEnd.copy(cursor = "e")))
    }
    @Test fun `selections keep only existing ids on retained screens and dates must parse`() {
        val saved = BrowsingContext(stacks = mapOf("Views" to listOf("view:v"), "Library" to listOf("select-subscriptions")),
            selections = mapOf("Views/view:v" to setOf("e", "deleted"), "Views/view:deleted" to setOf("e"),
                "Library/select-subscriptions" to setOf("s", "deleted"), "Playlists/playlist:deleted" to setOf("e")), statsDay = "not-a-date")
        val restored = validate(saved)
        assertEquals(mapOf("Views/view:v" to setOf("e"), "Library/select-subscriptions" to setOf("s")), restored.selections)
        assertNull(restored.statsDay)
        assertEquals("2026-11-03", validate(saved.copy(statsDay = "2026-11-03")).statsDay)
    }
}
