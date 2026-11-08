package app.podlist.domain

import kotlin.test.*
import org.junit.jupiter.api.Test

class DownloadPlannerTest {
    private fun episode(id: String, published: Long = 100, entry: Boolean = false, played: Boolean = false, starred: Boolean = false) = DownloadEpisode(id, "s", published, entry, played, starred)
    private fun rule(mode: DownloadMode, device: String = "phone", cap: Long? = null, since: Long? = 100) = DownloadRule("s", device, mode, cap, since)
    @Test fun `only this Device rules fetch and Entries stay outside All New cap`() {
        val episodes = listOf(episode("entry", 1, entry = true), episode("old", 99), episode("new", 100), episode("newest", 110), episode("played", 120, played = true))
        assertEquals(listOf("entry", "newest"), DownloadPlanner.plan("phone", listOf(rule(DownloadMode.AllNew, cap = 1)), episodes, emptyList(), emptyMap(), 200).fetch)
        assertEquals(emptyList(), DownloadPlanner.plan("phone", listOf(rule(DownloadMode.AllNew, "other")), episodes, emptyList(), emptyMap(), 200).fetch)
    }
    @Test fun `Starred and Manual Downloads survive rule cleanup and unsubscribe needs no special deletion`() {
        val stored = listOf(StoredDownload("star", false), StoredDownload("manual", true), StoredDownload("rule", false))
        assertEquals(listOf("rule"), DownloadPlanner.plan("phone", emptyList(), listOf(episode("star", starred = true)), stored, emptyMap(), 200).discard)
    }
    @Test fun `legacy activation is preserved then retired when leaving All New`() {
        val first = DownloadPlanner.plan("phone", listOf(rule(DownloadMode.AllNew, since = null)), listOf(episode("new", 150)), emptyList(), mapOf("s" to 100L), 200)
        assertEquals(listOf("new"), first.fetch)
        assertEquals(mapOf("s" to 100L), first.legacySince)
        assertEquals(emptyMap(), DownloadPlanner.plan("phone", listOf(rule(DownloadMode.Never)), emptyList(), emptyList(), first.legacySince, 300).legacySince)
        assertEquals(emptyList(), DownloadPlanner.plan("phone", listOf(rule(DownloadMode.AllNew, since = 250)), listOf(episode("new", 150)), emptyList(), first.legacySince, 300).fetch)
    }
    @Test fun `rule never requests Starred alone or Played Entries`() {
        val episodes = listOf(episode("star", starred = true), episode("played", entry = true, played = true), episode("entry", entry = true))
        assertEquals(listOf("entry"), DownloadPlanner.plan("phone", listOf(rule(DownloadMode.OnEntry)), episodes, emptyList(), emptyMap(), 200).fetch)
    }
}
