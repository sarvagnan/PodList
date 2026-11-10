package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class ListeningPresentationTest {
    @Test fun `duration wording retains units at minute and hour boundaries`() {
        assertEquals(ListeningPresentation.Time(0, 0, false), ListeningPresentation.time(0.0))
        assertEquals(ListeningPresentation.Time(0, 0, true), ListeningPresentation.time(59.9))
        assertEquals(ListeningPresentation.Time(0, 1, false), ListeningPresentation.time(60.0))
        assertEquals(ListeningPresentation.Time(1, 1, false), ListeningPresentation.time(3661.0))
        assertEquals(ListeningPresentation.Time(0, 0, false), ListeningPresentation.time(-1.0))
    }

    @Test fun `chart uses a labelled minute scale without inventing zero day activity`() {
        assertEquals(60.0, ListeningPresentation.chartMaximum(0.0))
        assertEquals(1200.0, ListeningPresentation.chartMaximum(799.0))
        assertEquals(0f, ListeningPresentation.barFraction(0.0, 1200.0))
        assertEquals(.5f, ListeningPresentation.barFraction(600.0, 1200.0))
        assertEquals(1f, ListeningPresentation.barFraction(1800.0, 1200.0))
    }
    @Test fun `stats selection follows the date as the thirty day window advances`() {
        val day = java.time.LocalDate.of(2026, 11, 3)
        assertEquals(1, ListeningPresentation.selectedDayIndex(day.toString(), listOf(day.minusDays(1), day, day.plusDays(1))))
        assertEquals(0, ListeningPresentation.selectedDayIndex(day.toString(), listOf(day, day.plusDays(1), day.plusDays(2))))
        assertEquals(1, ListeningPresentation.selectedDayIndex(day.minusDays(40).toString(), listOf(day, day.plusDays(1))))
        assertEquals(1, ListeningPresentation.selectedDayIndex("invalid", listOf(day, day.plusDays(1))))
    }
}
