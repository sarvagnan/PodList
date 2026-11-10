package app.podlist.domain

import org.junit.jupiter.api.Test
import kotlin.test.*

class DownloadProgressTest {
    @Test fun `known totals show bounded determinate progress including large files`() {
        val halfway = DownloadProgress(3_000_000_000, 6_000_000_000)
        assertFalse(halfway.indeterminate)
        assertEquals(.5f, halfway.fraction)
        assertEquals(5_000, halfway.progress)
        assertEquals(10_000, DownloadProgress(120, 100).progress)
        assertEquals(0, DownloadProgress(-1, 100).progress)
        assertEquals(0, DownloadProgress(0, 100).progress)
        assertEquals(10_000, DownloadProgress(Long.MAX_VALUE, Long.MAX_VALUE).progress)
    }

    @Test fun `unknown totals alone are indeterminate`() {
        listOf(-1L, 0L).forEach { total ->
            val progress = DownloadProgress(500, total)
            assertTrue(progress.indeterminate)
            assertEquals(0, progress.maximum)
            assertEquals(500, progress.boundedReceived)
        }
    }

    @Test fun `concurrent transfers keep independent totals and progress`() {
        val transfers = listOf(DownloadProgress(25, 100), DownloadProgress(90, 100), DownloadProgress(20, -1))
        assertEquals(listOf(2_500, 9_000, 0), transfers.map { it.progress })
        assertEquals(listOf(false, false, true), transfers.map { it.indeterminate })
    }
}
