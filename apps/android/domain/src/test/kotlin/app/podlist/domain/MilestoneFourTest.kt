package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*
import java.time.Instant
import java.time.ZoneId

class MilestoneFourTest {
    @Test fun `Trash display expires even without another State edit`() {
        val s = State.initial().copy(trash = listOf(TrashedPlaylist(playlist().copy(id = "deleted"), 0)))
        assertEquals(1, PlaylistRules.availableTrash(s, 30L * 86_400_000).size)
        assertTrue(PlaylistRules.availableTrash(s, 30L * 86_400_000 + 1).isEmpty())
        assertTrue(PlaylistRules.availableTrash(s.copy(trashDays = 7), 8L * 86_400_000).isEmpty())
    }
    @Test fun `reversed View ranges stay invalid until corrected`() {
        assertEquals(ViewEdits.Problem.LengthRange, ViewEdits.problem(ViewFilter(minDuration = 120.0, maxDuration = 60.0)))
        assertEquals(ViewEdits.Problem.DateRange, ViewEdits.problem(ViewFilter(published = PublishedFilter.Between(200, 100))))
        assertNull(ViewEdits.problem(ViewFilter(minDuration = 60.0, maxDuration = 60.0, published = PublishedFilter.Between(null, 100))))
    }
    @Test fun `no selected podcasts means Any and valid selections deduplicate`() {
        assertNull(ViewEdits.podcasts(PodcastMode.Include, emptyList()))
        assertNull(ViewEdits.podcasts(null, listOf("a")))
        assertEquals(PodcastFilter(PodcastMode.Exclude, listOf("a", "b")), ViewEdits.podcasts(PodcastMode.Exclude, listOf("a", "a", "b")))
    }
    private fun playlist() = State.initial().playlists.first().copy(clearOnPlayed = true, entries = listOf(Entry("a", 5.0, 0), Entry("b", 0.0, 0), Entry("c", 0.0, 0)), cursor = "a")
    @Test fun `timeline coalesces stretches but splits a ten minute gap and interleaved Episodes`() {
        val p = playlist().copy(timeline = listOf(TimelinePoint(0, "a", 5.0), TimelinePoint(60_000, "a", 60.0), TimelinePoint(700_001, "a", 70.0), TimelinePoint(710_000, "b", 0.0)))
        val events = TimelinePresentation.events(p)
        assertEquals(3, events.size)
        assertEquals(60.0, events.last().to)
        assertEquals(0, events.last().at)
    }
    @Test fun `timeline deduplicates edits and reverses equal-time arrival order`() {
        val p = playlist().copy(timeline = listOf(TimelinePoint(100, "a", 5.0)), history = listOf(HistoryItem("a", 100)), edits = listOf(PlaylistEdit(100, "added", "a"), PlaylistEdit(100, "added", "a")))
        assertEquals(listOf("added", "finished", "listened"), TimelinePresentation.events(p).map { it.kind })
        assertEquals(99, TimelinePresentation.events(p)[1].moment)
    }
    @Test fun `Rewind preview lists only playback marks and restored Entries while keeping edits and Listening`() {
        var s = State.initial().copy(playlists = listOf(playlist()), listeningLog = mapOf("2026-11-09" to mapOf("sub" to 90.0)))
        s = StateRules.apply(s, Change.ReportPosition("default", "a", 5.0, 100), 100)
        s = StateRules.apply(s, Change.MarkPlayed("a", PlayedSource.Playback("default")), 200)
        s = StateRules.apply(s, Change.MarkPlayed("b", PlayedSource.User), 300)
        s = StateRules.apply(s, Change.AddEntry("default", "d", Placement.Last), 400)
        val preview = TimelinePresentation.preview(s, "default", 100, 500)!!
        assertEquals(listOf("a"), preview.unplayed)
        assertEquals(listOf("a"), preview.restored)
        assertEquals("a", preview.cursor)
        assertEquals(5.0, preview.position)
        val after = Rewind.apply(s, "default", 100, 500)
        assertEquals(s.listeningLog, after.listeningLog)
        assertEquals(PlayedSource.User, after.episodeStates["b"]?.played?.source)
        assertTrue(after.playlists.first().entries.any { it.episodeId == "d" })
    }
    @Test fun `Undo Rewind restores Cursor Positions marks and removes restored Entries without changing Listening`() {
        var before = State.initial().copy(playlists = listOf(playlist()))
        before = StateRules.apply(before, Change.ReportPosition("default", "a", 5.0, 100), 100)
        before = StateRules.apply(before, Change.MarkPlayed("a", PlayedSource.Playback("default")), 200)
        before = StateRules.apply(before, Change.SetCursor("default", "b"), 300)
        before = StateRules.apply(before, Change.ReportPosition("default", "b", 25.0, 400), 400)
        val after = Rewind.apply(before, "default", 100, 500)
        val undone = TimelinePresentation.undo(before, after, "default", 600).fold(after) { state, change -> StateRules.apply(state, change, 600) }
        assertEquals(before.playlists.first().entries.map { it.episodeId to it.position }, undone.playlists.first().entries.map { it.episodeId to it.position })
        assertEquals("b", undone.playlists.first().cursor)
        assertEquals(before.episodeStates["a"]?.played?.source, undone.episodeStates["a"]?.played?.source)
        assertEquals(before.listeningLog, undone.listeningLog)
    }
    @Test fun `no Rewind before the first recorded moment`() {
        assertNull(TimelinePresentation.preview(State.initial().copy(playlists = listOf(playlist())), "default", 0, 500))
    }
    private val now = Instant.parse("2026-11-09T12:00:00Z")
    private val zone = ZoneId.of("UTC")
    @Test fun `stats weeks start Monday and periods exclude future days except all time`() {
        val log = mapOf("2026-11-08" to mapOf("s" to 20.0), "2026-11-09" to mapOf("s" to 30.0), "2026-11-10" to mapOf("s" to 40.0))
        val stats = ListeningStats.calculate(log, emptyList(), now, zone)
        assertEquals(listOf(30.0, 50.0, 90.0), stats.totals.map { it.seconds })
        assertEquals(30, stats.days.size)
        assertEquals(2, stats.streak)
        assertEquals(listOf("s" to 90.0), stats.podcasts)
    }
    @Test fun `stats manual and future Played facts never count and local date uses Device zone`() {
        val facts = listOf(Played(now.toEpochMilli(), PlayedSource.User), Played(now.plusSeconds(1).toEpochMilli(), PlayedSource.Playback("p")), Played(Instant.parse("2026-11-08T23:00:00Z").toEpochMilli(), PlayedSource.Playback("p")))
        assertEquals(0, ListeningStats.calculate(emptyMap(), facts, now, zone).totals.first().finished)
        assertEquals(1, ListeningStats.calculate(emptyMap(), facts, now, ZoneId.of("Asia/Kolkata")).totals.first().finished)
    }
    @Test fun `yesterday keeps streak alive and zero days break it`() {
        val log = mapOf("2026-11-08" to mapOf("s" to 20.0), "2026-11-07" to mapOf("s" to 10.0), "2026-11-06" to mapOf("s" to 0.0))
        assertEquals(2, ListeningStats.calculate(log, emptyList(), now, zone).streak)
        assertEquals(0, ListeningStats.calculate(emptyMap(), emptyList(), now, zone).streak)
    }
    @Test fun `Playlist names trim and compare without case while excluding self`() {
        assertEquals(Names.Problem.Empty, PlaylistNames.validate("  ", listOf(playlist())))
        assertEquals(Names.Problem.Duplicate, PlaylistNames.validate(" DEFAULT ", listOf(playlist())))
        assertNull(PlaylistNames.validate("Default", listOf(playlist()), "default"))
    }
}
