package app.podlist

import org.junit.jupiter.api.Test
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FlowRunClassificationTest {
    private val states = readFlowStates(File(requireNotNull(javaClass.getResource("/flow-run/measurements.csv")).toURI())).associateBy { it.row }
    private fun state(row: Int) = states.getValue(row)

    @Test fun `all seventeen original text candidates are deliberate edits or own submits`() {
        val pairs = listOf(Triple(6, 7, "Server address"), Triple(104, 105, "Search Episodes"),
            Triple(124, 125, "Name"), Triple(132, 133, "Name"), Triple(135, 136, "Name"),
            Triple(157, 158, "Name"), Triple(159, 160, "Search the Library"), Triple(159, 160, "Name"),
            Triple(244, 245, "Podcast name or feed address"), Triple(276, 277, "Search Episodes"),
            Triple(297, 298, "Name"), Triple(305, 306, "Name"), Triple(307, 308, "Name"),
            Triple(323, 324, "Search the Library"), Triple(332, 333, "Name"),
            Triple(334, 335, "Search the Library"), Triple(334, 335, "Name"))
        pairs.forEach { (before, after, field) ->
            val result = FlowRunClassification.classify("FLOW-03", state(before), state(after), field)
            assertEquals("excluded", result.verdict, result.line())
        }
        assertEquals(17, pairs.size)
    }

    @Test fun `delayed subscribe retains text but moves real same-screen core`() {
        for ((before, after) in listOf(95 to 96, 266 to 267)) {
            assertEquals(state(before).typed, state(after).typed)
            val audit = FlowRunClassification.Audit()
            audit.add(state(before)); audit.add(state(after))
            assertTrue(audit.findings().any { it.check == "FLOW-01" && it.element == "input:Search Episodes" })
            assertTrue(audit.findings().none { it.check == "FLOW-03" })
        }
    }

    @Test fun `mid-animation capture and navigation are not core movement`() {
        assertEquals("excluded", FlowRunClassification.classify("FLOW-01", state(1), state(2), "heading:0").verdict)
        assertEquals("excluded", FlowRunClassification.classify("FLOW-01", state(1), state(3), "heading:0").verdict)
    }

    @Test fun `late completion touching a newer unsubmitted edit fails even when submitting another field`() {
        val before = state(95)
        val after = state(96).copy(typed = mapOf("Search Episodes" to ""), submittedFields = setOf("Other field"))
        assertEquals("fail", FlowRunClassification.classify("FLOW-03", before, after, "Search Episodes").verdict)
        assertEquals("fail", FlowRunClassification.classify("FLOW-03", before, after.copy(screen = "Different screen"), "Search Episodes").verdict)
        assertEquals("fail", FlowRunClassification.classify("FLOW-02", before, after.copy(focus = ""), "focus").verdict)
        assertEquals("fail", FlowRunClassification.classify("FLOW-02", before, after.copy(scroll = "list:10"), "scroll").verdict)
    }

    @Test fun `input window and unresolved onset never manufacture a failure`() {
        val before = state(95)
        val after = state(96)
        assertEquals("excluded", FlowRunClassification.classify("FLOW-01", before, after.copy(ageMs = 500), "input:Search Episodes").verdict)
        assertEquals("N/O", FlowRunClassification.classify("FLOW-01", before.copy(ageMs = 400), after, "input:Search Episodes").verdict)
        assertEquals("N/O", FlowRunClassification.classify("FLOW-01", before, after.copy(input = before.input + 1), "input:Search Episodes").verdict)
    }

    @Test fun `response intervals need five observations and must resolve the deadline`() {
        assertEquals("pass", FlowRunClassification.responseVerdict(200.0, 180.0, 5))
        assertEquals("fail", FlowRunClassification.responseVerdict(230.0, 210.0, 5))
        assertTrue(FlowRunClassification.responseVerdict(800.0, 0.0, 5).startsWith("N/O"))
        assertTrue(FlowRunClassification.responseVerdict(null, null, 5).startsWith("N/O"))
        assertTrue(FlowRunClassification.responseVerdict(100.0, 90.0, 4).startsWith("N/O"))
    }

    @Test fun `debug emulator frame misses cannot grade audience hardware`() {
        assertEquals("N/O: debug build on emulator; not audience hardware", FlowRunClassification.footVerdict(true, true, 21, 21))
        assertTrue(FlowRunClassification.footVerdict(false, true, 21, 21).startsWith("N/O"))
        assertTrue(FlowRunClassification.footVerdict(true, false, 21, 21).startsWith("N/O"))
        assertEquals("fail", FlowRunClassification.footVerdict(false, false, 21, 21))
        assertEquals("pass", FlowRunClassification.footVerdict(false, false, 21, 0))
    }
}
