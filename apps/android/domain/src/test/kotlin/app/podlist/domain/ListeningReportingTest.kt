package app.podlist.domain

import kotlin.test.*
import org.junit.jupiter.api.Test

class ListeningReportingTest {
    @Test fun `Played arriving from another action keeps only listening amounts for the tail`() {
        val s = session()
        s.accept(ListeningSession.Event.Play, 0, 0)
        s.accept(ListeningSession.Event.Position(5.0, 1000.0), 5000, 0)
        val marked = s.accept(ListeningSession.Event.ExternalPlayed, 5000, 0).single() as Change.RecordListening
        assertEquals(5.0, marked.amounts.sumOf { it.seconds })
        s.accept(ListeningSession.Event.Position(10.0, 1000.0), 10_000, 0)
        assertIs<Change.RecordListening>(s.accept(ListeningSession.Event.Pause, 10_000, 0).single())
        assertTrue(s.finished)
    }

    @Test fun `late Episode metadata starts attribution without inventing earlier listening`() {
        val s = ListeningSession("p", "e", null, 0.0, 1.0, 1000.0)
        s.accept(ListeningSession.Event.Play, 0, 0)
        s.accept(ListeningSession.Event.Position(5.0, 1000.0), 5000, 0)
        s.accept(ListeningSession.Event.Metadata("subscription", 0.0), 5000, 0)
        s.accept(ListeningSession.Event.Position(10.0, 1000.0), 10_000, 0)
        val report = s.accept(ListeningSession.Event.Position(15.0, 1000.0), 15_000, 0).single() as Change.ReportPosition
        assertEquals(listOf(ListeningAmount("1970-01-01", "subscription", 5.0)), report.listening)
        val changes = s.accept(ListeningSession.Event.Pause, 15_000, 0)
        // The periodic report at 15 seconds owns the five measured seconds.
        assertEquals(emptyList(), changes)
        assertFalse(s.finished)
    }

    @Test fun `paused State adoption creates no listening or fresh Position Operation`() {
        val s = session()
        assertEquals(emptyList(), s.accept(ListeningSession.Event.RemotePosition(100.0, 5000), 6000, 0))
        assertEquals(emptyList(), s.accept(ListeningSession.Event.Flush, 6000, 0))
        s.accept(ListeningSession.Event.Play, 7000, 0)
        s.accept(ListeningSession.Event.Position(105.0, 1000.0), 12_000, 0)
        val report = s.accept(ListeningSession.Event.Pause, 12_000, 0).single() as Change.ReportPosition
        assertEquals(105.0, report.position)
        assertEquals(5.0, report.listening!!.sumOf { it.seconds })
    }

    private fun session(duration: Double? = 1000.0) = ListeningSession("p", "e", "s", 0.0, 1.0, duration)
    @Test fun `reports every fifteen seconds and flushes less than one second with pending listening`() {
        val s = session()
        s.accept(ListeningSession.Event.Play, 0, 0)
        assertEquals(emptyList(), s.accept(ListeningSession.Event.Position(14.5, 1000.0), 14_500, 0))
        val report = s.accept(ListeningSession.Event.Position(15.0, 1000.0), 15_000, 0).single() as Change.ReportPosition
        assertEquals(15.0, report.listening!!.sumOf { it.seconds })
        s.accept(ListeningSession.Event.Position(15.5, 1000.0), 15_500, 0)
        assertEquals(0.5, (s.accept(ListeningSession.Event.Pause, 15_500, 0).single() as Change.ReportPosition).listening!!.sumOf { it.seconds })
    }
    @Test fun `failure preserves last Position and listening without counting recovery gap`() {
        val s = session()
        s.accept(ListeningSession.Event.Play, 0, 0)
        s.accept(ListeningSession.Event.Position(5.0, 1000.0), 5000, 0)
        val failure = s.accept(ListeningSession.Event.Failure, 5000, 0)
        assertEquals(5.0, (failure.single() as Change.ReportPosition).position)
        s.accept(ListeningSession.Event.Discontinuity, 6000, 0)
        assertEquals(emptyList(), s.accept(ListeningSession.Event.Position(100.0, 1000.0), 7000, 0))
    }
    @Test fun `Played tail emits only RecordListening and never resurrects Entry Position`() {
        val s = session(100.0)
        s.accept(ListeningSession.Event.Play, 0, 0)
        val finish = s.accept(ListeningSession.Event.Position(70.0, 100.0), 1000, 0)
        assertIs<Change.ReportPosition>(finish[0])
        assertIs<Change.MarkPlayed>(finish[1])
        assertTrue(s.finished)
        s.accept(ListeningSession.Event.Position(75.0, 100.0), 6000, 0)
        val tail = s.accept(ListeningSession.Event.Pause, 6000, 0)
        assertIs<Change.RecordListening>(tail.single())
        assertEquals(5.0, (tail.single() as Change.RecordListening).amounts.sumOf { it.seconds })
    }
}
